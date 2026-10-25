/** @file @lang zh-CN .NET文档出处隔离与真实声明范围回归。 @lang en Regression coverage for .NET documentation-origin isolation and actual declaration ranges. */
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { it, expect } from "vitest";
import { createHiaDocument, HIA_SOURCE_MODEL, HIA_SOURCE_MODEL_VERSION } from "@hia-doc/core";
import { runCli } from "./index.js";

it("isolates legacy .NET XML origins while preserving bounded C# and other-domain XML sources", async () => {
  // <lang><zh-CN>全新临时目录仅包含合成公开文本；不触碰业务仓。</zh-CN><en>A fresh temporary directory holds synthetic public text only without touching business repositories.</en></lang>
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-dotnet-source-"));
  const source = (relativePath: string, language: string, first = 1, last?: number) => ({ model: HIA_SOURCE_MODEL, modelVersion: HIA_SOURCE_MODEL_VERSION, mode: "link" as const, definedIn: { kind: "defined-in" as const, relativePath, language, position: { line: first }, ...(last ? { range: { start: { line: first }, end: { line: last } } } : {}) } });
  const document = createHiaDocument({ id: "synthetic:source", symbols: [
    { id: "legacy", name: "Legacy", kind: "dotnet-method", source: source("api-doc.xml", "xml"), metadata: { dotnetdoc: { memberName: "M:Demo.Legacy.Run" } } },
    { id: "real", name: "Real", kind: "dotnet-method", source: source("Real.cs", "csharp", 3, 5), metadata: { dotnetdoc: { memberName: "M:Demo.Real.Run" } } },
    { id: "xml", name: "Config", kind: "configuration", source: source("config.xml", "xml") }
  ] });
  await mkdir(path.join(root, "out"));
  await writeFile(path.join(root, "api-doc.xml"), "DO_NOT_PUBLISH_DOCUMENTATION_AS_CODE");
  await writeFile(path.join(root, "config.xml"), "LEGITIMATE_XML_SOURCE");
  await writeFile(path.join(root, "Real.cs"), "// before\n// before\npublic void Run()\n{\n}\n// AFTER_MEMBER_MUST_NOT_LEAK");
  await writeFile(path.join(root, "doc.json"), JSON.stringify(document));
  await writeFile(path.join(root, "project.json"), JSON.stringify({ schemaVersion: "1.0.0", project: { name: "Synthetic" }, inputs: [{ kind: "hia-document", path: "doc.json" }] }));
  await writeFile(path.join(root, "config.json"), JSON.stringify({ schemaVersion: "0.1.0", docs: { source: { presentation: "fetch", publicAssetPolicy: "explicit-public" } } }));
  const messages: string[] = [];
  const code = await runCli(["docs", "build", "--config", "config.json", "--project-manifest", "project.json", "--out", "out"], { cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text) });
  expect(code, messages.join("\n")).toBe(0);
  const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
  expect(index.entries.find((entry: { symbolId: string }) => entry.symbolId === "legacy").source).toBeUndefined();
  expect(index.entries.find((entry: { symbolId: string }) => entry.symbolId === "real").source.range.end.line).toBe(5);
  const manifest = JSON.parse(await readFile(path.join(root, "out/hia-manifest.json"), "utf8"));
  const assets = await Promise.all(manifest.files.filter((file: { path: string }) => /^sources\/.*\.txt$/u.test(file.path)).map((file: { path: string }) => readFile(path.join(root, "out", file.path), "utf8")));
  expect(assets.join("\n")).not.toContain("DO_NOT_PUBLISH_DOCUMENTATION_AS_CODE");
  expect(assets.join("\n")).not.toContain("AFTER_MEMBER_MUST_NOT_LEAK");
  expect(assets.join("\n")).toContain("LEGITIMATE_XML_SOURCE");
});
