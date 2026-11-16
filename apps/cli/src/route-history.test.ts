/**
 * @file
 * @lang zh-CN 显式发布历史CLI输入、实际聚合与有界拒绝回归。
 * @lang en Regressions for explicit publication-history CLI input, actual aggregation and bounded rejection.
 */
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import { runCli } from "./index.js";

/** @lang zh-CN 自有临时项目与公开合成输入，业务仓不参与。
 * @lang en Owned temporary project and public synthetic input, independent of business repositories.
 */
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-route-history-"));
  const messages: string[] = [];
  const output = path.join(root, "output");
  const history = {
    contract: "documentation-project-route-history", contractVersion: "0.1.0-draft", projectId: "project:fixture",
    sources: [{ repository: "owner/public", commit: "a".repeat(40), locale: "en", indexSha256: "b".repeat(64) }],
    bindings: [{ view: "js", symbolId: "function:buildProfileSummary", entryId: "published:stable" }],
    entryAliases: [{ entryId: "published:old", canonicalEntryId: "published:stable" }],
    pathAliases: [{ path: "entries/legacy.html", kind: "fragment", entryId: "published:stable", anchors: [{ id: "published:old", targetId: "published:stable" }] }]
  };
  await writeFile(path.join(root, "doc.json"), JSON.stringify(createBasicFixtureDocument()));
  await writeFile(path.join(root, "project.json"), JSON.stringify({ schemaVersion: "1.1.0", project: { id: "project:fixture", name: "Fixture" }, inputs: [{ kind: "hia-document", path: "doc.json" }] }));
  await writeFile(path.join(root, "hia.config.json"), JSON.stringify({ schemaVersion: "0.1.0", docs: { renderer: { projectLayout: "split-site", uiLocale: "en", informationArchitecture: { contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate" } } } }));
  await writeFile(path.join(root, "history.json"), JSON.stringify(history));
  const args = ["docs", "build", "--project-manifest", "project.json", "--config", "hia.config.json", "--route-history", "history.json", "--out", output];
  return { root, output, messages, history, args, io: { cwd: root, stdout: (text: string) => messages.push(text), stderr: (text: string) => messages.push(text) } };
}

describe("docs build --route-history", () => {
  it("adopts the normal manifest and emits persistent entries and real legacy prose", async () => {
    const value = await fixture();
    try {
      expect(await runCli(value.args, value.io), value.messages.join("\n")).toBe(0);
      const index = JSON.parse(await readFile(path.join(value.output, "project-index.json"), "utf8"));
      expect(index.entries.find((entry: { symbolId?: string }) => entry.symbolId === "function:buildProfileSummary").id).toBe("published:stable");
      expect(await readFile(path.join(value.output, "entries/legacy.html"), "utf8")).toContain('id="published:old"');
      expect(JSON.parse(await readFile(path.join(value.output, "route-history.json"), "utf8")).contractVersion).toBe("0.1.0-draft");
    } finally { await rm(value.root, { recursive: true, force: true }); }
  });

  it.each(["malformed", "unknown-version", "invalid-utf8", "oversized", "missing-file", "single-document", "missing-native", "manifest-history", "manifest-history-case", "manifest-fragment", "manifest-script"])("rejects %s before rendering a page", async scenario => {
    const value = await fixture();
    try {
      const file = path.join(value.root, "history.json");
      if (scenario === "malformed") await writeFile(file, "{");
      if (scenario === "unknown-version") await writeFile(file, JSON.stringify({ ...value.history, contractVersion: "9.0.0" }));
      if (scenario === "invalid-utf8") await writeFile(file, Buffer.from([0xff, 0xfe]));
      if (scenario === "oversized") await writeFile(file, " ".repeat(16 * 1024 * 1024 + 1));
      if (scenario === "missing-file") await rm(file);
      if (scenario === "single-document") value.args.splice(2, 2, "--input", "doc.json");
      if (scenario === "missing-native") { value.history.bindings[0].symbolId = "absent"; await writeFile(file, JSON.stringify(value.history)); }
      if (scenario === "manifest-history") value.args.push("--manifest", "route-history.json");
      if (scenario === "manifest-history-case") value.args.push("--manifest", "Route-History.json");
      if (scenario === "manifest-fragment") value.args.push("--manifest", "entries/legacy.html");
      if (scenario === "manifest-script") {
        value.history.pathAliases.push({ path: "pages/legacy.html", kind: "page", entryId: "published:stable", anchors: [] });
        await writeFile(file, JSON.stringify(value.history));
        value.args.push("--manifest", "assets/hia-route-history.js");
      }
      expect(await runCli(value.args, value.io), value.messages.join("\n")).toBe(1);
      expect(value.messages.join("\n")).toContain("HIA_CLI_ROUTE_HISTORY_INPUT_INVALID");
      expect(value.messages.join("\n")).not.toContain(value.root);
      await expect(access(path.join(value.output, "index.html"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(value.root, { recursive: true, force: true }); }
  });

  it("rejects an existing redirected compatibility directory", async () => {
    const value = await fixture();
    try {
      const outside = path.join(value.root, "outside");
      await mkdir(outside);
      await mkdir(value.output);
      await symlink(outside, path.join(value.output, "entries"), process.platform === "win32" ? "junction" : "dir");
      expect(await runCli(value.args, value.io)).toBe(1);
      expect(value.messages.join("\n")).toContain("HIA_CLI_ROUTE_HISTORY_INPUT_INVALID");
      await expect(access(path.join(outside, "legacy.html"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(value.root, { recursive: true, force: true }); }
  });
});
