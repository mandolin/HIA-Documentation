/**
 * @file
 * @lang zh-CN 验证有界读取、授权/真实路径隔离、Unicode行和静态超限诊断；所有文件均为合成数据。
 * @lang en Verifies bounded reads, authority/real-path isolation, Unicode lines and fixed limit diagnostics using synthetic files only.
 */
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RenderProjectHtmlInput } from "@hia-doc/renderer-html";
import { prepareProjectSourcePresentation, reservePreparedPreview } from "./project-source.js";

// <lang><zh-CN>仅跟踪本文件创建的临时目录，清理前校验绝对根，避免删除其它工作区。</zh-CN><en>Track only temporary directories created by this file and verify absolute roots before cleanup to avoid deleting other workspaces.</en></lang>
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (!root.startsWith(path.join(os.tmpdir(), "hia-source-stream-"))) throw new Error("Unexpected test cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});

/** @lang zh-CN 创建独立临时根。 @lang en Creates an independent temporary root. */
async function temporary(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-source-stream-"));
  roots.push(root);
  return root;
}
/** @lang zh-CN 合成条目只提供源码locator，不授予读取。 @lang en Synthetic entries supply source locators without granting read authority. */
function input(file = "source.cs", count = 1): RenderProjectHtmlInput {
  return { project: { name: "Synthetic" }, entries: Array.from({ length: count }, (_, i) => ({ id: `entry:${i}`, name: `Method${i}`, kind: "dotnet-method", view: "dotnet", source: { path: file, range: { start: { line: 2 }, end: { line: 4 } } } })) };
}
describe("bounded project source preparation", () => {
  it("charges shared excerpts once and diagnoses the aggregate budget without allocating a GiB", () => {
    // <lang><zh-CN>建模临界预算状态测试算术/错误边界，不为单元测试分配1GiB真实正文。</zh-CN><en>Model a near-limit budget to test arithmetic/error boundaries without allocating a GiB of actual bodies.</en></lang>
    const state: Parameters<typeof reservePreparedPreview>[0] = { cache: new Map(), cacheBytes: 0, diagnostics: [], counted: new WeakSet(), preparedBytes: 1_073_741_822 };
    const preview = { content: "a" };
    expect(reservePreparedPreview(state, preview)).toBe(true);
    expect(reservePreparedPreview(state, preview)).toBe(true);
    expect(state.preparedBytes).toBe(1_073_741_824);
    expect(reservePreparedPreview(state, { content: "b" })).toBe(false);
    expect(reservePreparedPreview(state, { content: "c" })).toBe(false);
    expect(state.diagnostics).toHaveLength(1);
    expect(state.diagnostics[0]?.code).toBe("HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED");
  });
  it.each(["fetch", "embed", "link"] as const)("reads bounded excerpts for %s with explicit authority", async (presentation) => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), "未选择\r\nα中文\r\nβ😀\r\n末行\r\nnot selected");
    const original = input();
    const prepared = await prepareProjectSourcePresentation(original, { source: { presentation, publicAssetPolicy: "explicit-public", maxLines: 2 } }, root);
    expect(prepared.entries[0]?.source?.preview).toMatchObject({ content: "α中文\nβ😀", range: { start: { line: 2 }, end: { line: 3 } } });
    expect(original.entries[0]?.source?.preview).toBeUndefined();
    expect(prepared.diagnostics ?? []).toEqual([]);
  });

  it("interns repeated range content and strips external producer URLs", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), "unused\npublic source\nline3\nline4");
    const original = input("source.cs", 500);
    original.entries[0]!.source!.linkUrl = "https://example.test/private";
    const prepared = await prepareProjectSourcePresentation(original, { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries).toHaveLength(500);
    expect(prepared.entries.every((entry) => entry.source?.preview?.content === "public source\nline3\nline4")).toBe(true);
    expect(prepared.entries[0]?.source?.linkUrl).toBeUndefined();
  });

  it.each(["none", "disabled", "unauthorized"])("does not expose local bodies when %s", async (mode) => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), "first\nsynthetic-private-body");
    const prepared = await prepareProjectSourcePresentation(input(), { source: { presentation: mode === "none" ? "none" : "fetch", ...(mode === "disabled" ? { enabled: false } : {}), publicAssetPolicy: mode === "unauthorized" ? "none" : "explicit-public" } }, root);
    expect(JSON.stringify(prepared)).not.toContain("synthetic-private-body");
    expect(prepared.entries[0]?.source?.preview).toBeUndefined();
  });

  it.each(["../source.cs", "/source.cs", "C:/source.cs", "\\\\server\\source.cs"])("refuses unsafe locator %s", async (file) => {
    const root = await temporary();
    const prepared = await prepareProjectSourcePresentation(input(file), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview).toBeUndefined();
  });

  it("returns no inverted range when the requested line is past EOF", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), "only line");
    const prepared = await prepareProjectSourcePresentation(input(), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview).toBeUndefined();
  });

  it("rejects huge selected lines with an actionable body-free diagnostic", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), `unused\n${"synthetic-private-body".repeat(60_000)}`);
    const prepared = await prepareProjectSourcePresentation(input(), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.diagnostics).toContainEqual(expect.objectContaining({ code: "HIA_CLI_SOURCE_PREVIEW_LIMIT", severity: "error" }));
    expect(JSON.stringify(prepared)).not.toContain("synthetic-private-body");
    expect(prepared.diagnostics?.[0]?.message).toContain("docs.source.maxLines");
  });

  it("skips huge unselected lines without retaining them", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), `${"x".repeat(2_100_000)}\npublic selected\nline3\nline4`);
    const prepared = await prepareProjectSourcePresentation(input(), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview?.content).toBe("public selected\nline3\nline4");
    expect(prepared.diagnostics ?? []).toEqual([]);
  });

  it("refuses a source symlink outside the authorized root", async (context) => {
    const root = await temporary();
    const outside = await temporary();
    await writeFile(path.join(outside, "source.cs"), "first\nsynthetic-private-body");
    // <lang><zh-CN>Windows可能未授予文件symlink权限；仅此主机约束时明确跳过，不伪造通过。</zh-CN><en>Windows may deny file-symlink creation; explicitly skip only that host constraint rather than fabricating a pass.</en></lang>
    try { await symlink(path.join(outside, "source.cs"), path.join(root, "source.cs"), "file"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EPERM") { context.skip(); return; } throw error; }
    const prepared = await prepareProjectSourcePresentation(input(), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(JSON.stringify(prepared)).not.toContain("synthetic-private-body");
  });

  it.each([".cs", ".aspx", ".ascx", ".master", ".ashx"])("reads authorized %s files without executing them", async (extension) => {
    const root = await temporary();
    const file = `source${extension}`;
    await writeFile(path.join(root, file), "first\n<% synthetic & public %>\nline3\nline4");
    const prepared = await prepareProjectSourcePresentation(input(file), { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview?.content).toContain("<% synthetic & public %>");
  });

  it("defaults to 400 lines and keeps the actual clipped locator range", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), Array.from({ length: 800 }, (_, i) => `line ${i + 1}`).join("\n"));
    const original = input();
    original.entries[0]!.source!.range = { start: { line: 2 } };
    const prepared = await prepareProjectSourcePresentation(original, { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview?.content.split("\n")).toHaveLength(400);
    expect(prepared.entries[0]?.source?.range).toEqual({ start: { line: 2 }, end: { line: 401 } });
  });

  it("bounds explicitly provided producer excerpts with the same configured cap", async () => {
    const original = input();
    original.entries[0]!.source!.preview = { content: "line1\nline2\nline3\nline4", range: { start: { line: 21 }, end: { line: 24 } } };
    const prepared = await prepareProjectSourcePresentation(original, { source: { presentation: "fetch", maxLines: 2 } }, ".");
    expect(prepared.entries[0]?.source?.preview?.content).toBe("line1\nline2");
    expect(prepared.entries[0]?.source?.range).toEqual({ start: { line: 21 }, end: { line: 22 } });
    expect(original.entries[0]?.source?.preview.content).toContain("line4");
  });

  it("accepts an exact 1MiB selected line without counting its excluded trailing newline", async () => {
    const root = await temporary();
    await writeFile(path.join(root, "source.cs"), `first\n${"x".repeat(1_048_576)}\nnot selected`);
    const original = input();
    original.entries[0]!.source!.range = { start: { line: 2 }, end: { line: 2 } };
    const prepared = await prepareProjectSourcePresentation(original, { source: { publicAssetPolicy: "explicit-public" } }, root);
    expect(prepared.entries[0]?.source?.preview?.content.length).toBe(1_048_576);
    expect(prepared.diagnostics ?? []).toEqual([]);
  });
});
