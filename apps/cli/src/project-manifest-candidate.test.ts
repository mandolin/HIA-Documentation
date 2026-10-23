/**
 * @file
 * @lang zh-CN 通过真实CLI消费新旧清单根与可选profile路径，拒绝无效输入后不加载模块或artifact。
 * @lang en Consumes current/legacy manifest roots and optional profile paths through the actual CLI, refusing invalid inputs before module/artifact loading.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBasicFixtureDocument } from "@hia-doc/core";
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";

/** @lang zh-CN 只删除本测试明确创建、位于系统temp直接子目录且名称匹配的fixture。
 * @lang en Deletes only fixtures explicitly created by this test as matching direct children of the system temp directory.
 * @param root <lang><zh-CN>本测试mkdtemp返回的绝对目录。</zh-CN><en>Absolute directory returned by this test's mkdtemp.</en></lang>
 * @returns <lang><zh-CN>删除完成；边界不符抛错而不删除。</zh-CN><en>Deletion completion; throws without deletion on a boundary mismatch.</en></lang>
 */
async function cleanupFixture(root: string): Promise<void> {
  // <lang><zh-CN>解析后的父目录和固定前缀共同限制递归删除范围，不跟随用户提供的位置。</zh-CN><en>The resolved parent and fixed prefix jointly constrain recursive deletion, without accepting user-provided locations.</en></lang>
  const absolute = path.resolve(root);
  if (path.dirname(absolute) !== path.resolve(os.tmpdir()) || !path.basename(absolute).startsWith("hia-manifest-candidate-")) throw new Error("Unexpected fixture boundary.");
  await rm(absolute, { recursive: true, force: true });
}

describe("project manifest candidate CLI consumption", () => {
  it.each(["0.1.0-draft", "1.0.0"])("builds exact %s with metadata-only profile references", async (version) => {
    // <lang><zh-CN>每次新目录与独立消息数组防止上一次产物冒充当前运行。</zh-CN><en>A new directory and independent messages prevent prior artifacts from masquerading as this run.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-manifest-candidate-"));
    const messages: string[] = [];
    const out = path.join(root, "docs");
    const manifest = { schemaVersion: version, project: { name: "CLI manifest candidate" }, profiles: [{ profileId: "owner.fixture", profileVersion: "owner-version", layer: "extension" }], inputs: [{ kind: "hia-document", path: "public.json" }] };
    try {
      const document = createBasicFixtureDocument();
      if (version === "0.1.0-draft") document.schemaVersion = "0.2.0";
      await writeFile(path.join(root, "public.json"), JSON.stringify(document));
      await writeFile(path.join(root, "public.project.json"), JSON.stringify(manifest));
      const code = await runCli(["docs", "build", "--project-manifest", path.join(root, "public.project.json"), "--out", out], { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) });
      expect(code, messages.join("\n")).toBe(0);
      const result = JSON.parse(await readFile(path.join(out, "hia-manifest.json"), "utf8"));
      const index = JSON.parse(await readFile(path.join(out, "project-index.json"), "utf8"));
      expect(result.build.mode).toBe("project");
      expect(result.build.profiles).toContainEqual({ profileId: "owner.fixture", profileVersion: "owner-version", layer: "extension" });
      expect(index.entries.length).toBeGreaterThan(0);
      // <lang><zh-CN>清单原文件未被reader写回或隐式迁移。</zh-CN><en>The reader neither rewrites nor implicitly migrates the original manifest file.</en></lang>
      expect(JSON.parse(await readFile(path.join(root, "public.project.json"), "utf8"))).toEqual(manifest);
    } finally {
      await cleanupFixture(root);
    }
  });
  it("rejects an unknown static kind before reading its missing artifact", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-manifest-candidate-"));
    const messages: string[] = [];
    try {
      await writeFile(path.join(root, "invalid.json"), JSON.stringify({ schemaVersion: "1.0.0", project: { name: "Invalid fixture" }, inputs: [{ kind: "unknown-kind", path: "missing.json" }] }));
      const code = await runCli(["docs", "build", "--project-manifest", path.join(root, "invalid.json"), "--out", path.join(root, "docs")], { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) });
      expect(code).toBe(1);
      expect(messages.join("\n")).toContain("HIA_PROJECT_MANIFEST_FIELD_INVALID");
      expect(messages.join("\n")).not.toContain("HIA_CLI_PROJECT_INPUT_READ_FAILED");
    } finally {
      await cleanupFixture(root);
    }
  });
  it("rejects duplicate producer identities before attempting module execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-manifest-candidate-"));
    const messages: string[] = [];
    try {
      const producer = { id: "duplicate", module: "missing.mjs", inputs: [{ kind: "custom", path: "public.json" }] };
      await writeFile(path.join(root, "invalid.json"), JSON.stringify({ schemaVersion: "1.0.0", project: { name: "Invalid fixture" }, producers: [producer, producer] }));
      const code = await runCli(["docs", "build", "--project-manifest", path.join(root, "invalid.json"), "--out", path.join(root, "docs")], { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) });
      expect(code).toBe(1);
      expect(messages.join("\n")).toContain("HIA_PROJECT_MANIFEST_FIELD_INVALID");
      expect(messages.join("\n")).not.toContain("Unable to load producer");
    } finally {
      await cleanupFixture(root);
    }
  });
});
