import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "./index.js";

/**
 * @lang zh-CN 生成不含私有内容的普通地图、文档地图和坐标证据正例，用于检查机器入口确实消费实际字节。
 * @lang en Creates public synthetic ordinary-map, documentation-map and coordinate-evidence inputs to check that the machine entry consumes actual bytes.
 */
async function writeSyntheticInputs(root: string): Promise<void> {
  const sourceText = "/* public fixture */\nexport const value = 1;\n";
  const sourceBytes = Buffer.from(sourceText, "utf8");
  const ordinaryMapBytes = Buffer.from(JSON.stringify({
    version: 3,
    file: "app.js",
    sources: ["src/a.ts"],
    names: [],
    mappings: "AAAA"
  }), "utf8");
  const documentationMapBytes = Buffer.from(JSON.stringify({
    contract: "doc-source-map",
    contractVersion: "1.1.0",
    id: "docmap:sample",
    producer: { name: "fixture", version: "1.0.0" },
    artifacts: [{ id: "artifact:app", kind: "generated-js", path: "app.js", language: "javascript" }],
    sources: [{ id: "source:sample", kind: "source", path: "src/a.ts", language: "typescript", sourcesContentPolicy: "none" }],
    sourceMaps: [{ id: "map:sample", kind: "ordinary-source-map", format: "source-map-v3", path: "app.js.map", mapsFrom: "artifact:app", mapsTo: ["source:sample"], sourcesContentPolicy: "none" }],
    chains: [],
    entries: [{
      id: "entry:sample",
      kind: "symbol",
      sourceRefs: [{
        sourceId: "source:sample",
        range: { start: { line: 1, column: 1 }, end: { line: 2, column: 1 } },
        rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" },
        rangeSource: "parser",
        confidence: "high"
      }],
      artifactRefs: [{ artifactId: "artifact:app", rangeSource: "source-map", confidence: "high" }],
      diagnostics: []
    }],
    privacy: { sourcesContentPolicy: "none", allowAbsolutePaths: false, allowUncPaths: false, allowPathTraversal: false },
    diagnostics: []
  }), "utf8");
  const digest = (bytes: Uint8Array): { algorithm: "sha256"; value: string } => ({
    algorithm: "sha256",
    value: createHash("sha256").update(bytes).digest("base64")
  });
  const profile = {
    contract: "ordinary-source-map-coordinate-profile",
    contractVersion: "0.1.0-draft",
    id: "profile:sample",
    ordinaryMap: { sourceMapId: "map:sample", artifactId: "artifact:app", digest: digest(ordinaryMapBytes) },
    documentationMap: { id: "docmap:sample", contractVersion: "1.1.0", digest: digest(documentationMapBytes) },
    sourceSlots: [{
      sectionIndex: null,
      sourceIndex: 0,
      sourceId: "source:sample",
      columnUnit: "utf16-code-unit",
      sourceRevision: "revision:sample",
      sourceByteDigest: digest(sourceBytes),
      sourceTextDigest: { representation: "decoded-utf16-code-units", ...digest(Buffer.from(sourceText, "utf16le")) },
      sourceTextEncoding: "utf-8",
      sourceTextTransform: "none"
    }],
    privacy: { sourcesContentPolicy: "none" }
  };

  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "a.ts"), sourceBytes);
  await writeFile(path.join(root, "app.js.map"), ordinaryMapBytes);
  await writeFile(path.join(root, "app.docmap.json"), documentationMapBytes);
  await writeFile(path.join(root, "profile.json"), JSON.stringify(profile), "utf8");
}

/**
 * @lang zh-CN 在相同的公开源码路径上构造两个本地 section，各自保留 raw slot 0、独立源码版本和列单位。
 * @lang en Builds two local sections for the same public source path, each with raw slot 0, an independent source version and column unit.
 * @param root <lang><zh-CN>受限测试根目录。</zh-CN><en>Contained test root.</en></lang>
 * @returns <lang><zh-CN>第二 section 的实际源码字节；首个版本已经写在源路径。</zh-CN><en>Actual source bytes for the second section; the first version remains at the source path.</en></lang>
 */
async function writeTwoSectionInputs(root: string): Promise<Buffer> {
  await writeSyntheticInputs(root);
  // <lang><zh-CN>两个本地 section 使用相同原始路径和槽位 0，但第二段的生成位置独立偏移。</zh-CN><en>Both local sections use the same original path and slot zero, while the second generated position has its own offset.</en></lang>
  const ordinaryMapBytes = Buffer.from(JSON.stringify({ version: 3, sections: [
    { offset: { line: 0, column: 0 }, map: { version: 3, sources: ["src/a.ts"], names: [], mappings: "AAAA" } },
    { offset: { line: 1, column: 4 }, map: { version: 3, sources: ["src/a.ts"], names: [], mappings: "AAAC" } }
  ] }), "utf8");
  // <lang><zh-CN>读取刚写入的公开合成文档地图，只为第二源码版本添加独立来源和条目。</zh-CN><en>Read the freshly written public synthetic documentation map and add a distinct source and entry for the second version.</en></lang>
  const documentation = JSON.parse(await readFile(path.join(root, "app.docmap.json"), "utf8"));
  documentation.sources.push({ id: "source:second", kind: "source", path: "src/a.ts", language: "typescript", sourcesContentPolicy: "none" });
  documentation.sourceMaps[0].mapsTo.push("source:second");
  documentation.entries.push({ id: "entry:second", kind: "symbol", sourceRefs: [{ sourceId: "source:second",
    range: { start: { line: 1, column: 2 }, end: { line: 1, column: 3 } },
    rangeConvention: { endBoundary: "exclusive", columnUnit: "unicode-code-point" }, rangeSource: "parser", confidence: "high" }],
    artifactRefs: [{ artifactId: "artifact:app", rangeSource: "source-map", confidence: "high" }], diagnostics: [] });
  const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
  // <lang><zh-CN>侧载中的两张地图摘要来自本次真正交给 CLI 的字节。</zh-CN><en>Both sidecar map digests come from the exact bytes supplied to the CLI.</en></lang>
  const profile = JSON.parse(await readFile(path.join(root, "profile.json"), "utf8"));
  const digest = (bytes: Uint8Array) => ({ algorithm: "sha256", value: createHash("sha256").update(bytes).digest("base64") });
  profile.ordinaryMap.digest = digest(ordinaryMapBytes);
  profile.documentationMap.digest = digest(documentationMapBytes);
  profile.sourceSlots[0].sectionIndex = 0;
  // <lang><zh-CN>第二份实际源码保留非 BMP 字符，让 code-point 列 2 与 UTF-16 列 3 明确不同。</zh-CN><en>The second actual source keeps a non-BMP character, making code-point column two distinct from UTF-16 column three.</en></lang>
  const secondText = "😀export const value = 2;\n";
  const secondBytes = Buffer.from(secondText, "utf8");
  profile.sourceSlots.push({ ...structuredClone(profile.sourceSlots[0]), sectionIndex: 1, sourceId: "source:second",
    sourceRevision: "revision:second", columnUnit: "unicode-code-point", sourceByteDigest: digest(secondBytes),
    sourceTextDigest: { representation: "decoded-utf16-code-units", ...digest(Buffer.from(secondText, "utf16le")) } });
  await writeFile(path.join(root, "app.js.map"), ordinaryMapBytes);
  await writeFile(path.join(root, "app.docmap.json"), documentationMapBytes);
  await writeFile(path.join(root, "profile.json"), JSON.stringify(profile), "utf8");
  return secondBytes;
}

/** @lang zh-CN 以独立 cwd 捕捉单条机器 JSON，不把宿主路径附加到结果。 @lang en Captures one machine JSON under an isolated cwd without appending host paths. */
async function invoke(root: string, overrides: string[] = [], omitSource = false): Promise<{
  code: number;
  report: { verification: { kind: string; generatedPosition?: { line: number; column: number } }; diagnostics: Array<{ code: string; message: string }> };
  stderr: string[];
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = { cwd: root, stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) };
  const args = [
    "docs", "coordinate-verify",
    "--coordinate-profile", "profile.json",
    "--ordinary-map", "app.js.map",
    "--doc-source-map", "app.docmap.json",
    "--source", "src/a.ts",
    "--source-id", "source:sample",
    "--source-index", "0",
    "--entry-id", "entry:sample",
    "--line", "1",
    "--column", "1",
    "--column-unit", "utf16-code-unit"
  ];
  // <lang><zh-CN>覆盖已知选项的值；未知选项保留，供闭集拒绝反例使用。</zh-CN><en>Replace known option values; retain unknown options for closed-parser rejection cases.</en></lang>
  for (let index = 0; index < overrides.length; index += 2) {
    const name = overrides[index]!;
    const value = overrides[index + 1]!;
    const existing = args.indexOf(name);
    if (existing >= 0) args[existing + 1] = value;
    else args.push(name, value);
  }
  if (omitSource) args.splice(args.indexOf("--source"), 2);
  const code = await runCli(args, io);
  expect(stdout).toHaveLength(1);
  return { code, report: JSON.parse(stdout[0]!) as { verification: { kind: string; generatedPosition?: { line: number; column: number } }; diagnostics: Array<{ code: string; message: string }> }, stderr };
}

describe("docs coordinate-verify", () => {
  it("requires the explicit local section and that section's authorized bytes despite identical source paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      const secondBytes = await writeTwoSectionInputs(root);
      const first = await invoke(root, ["--section-index", "0"]);
      expect(first.code).toBe(0);
      expect(first.report.verification).toMatchObject({ kind: "exact-anchor", generatedPosition: { line: 1, column: 1 } });
      const borrowed = await invoke(root, ["--section-index", "1", "--source-id", "source:second", "--entry-id", "entry:second",
        "--column", "2", "--column-unit", "unicode-code-point"]);
      expect(borrowed.code).toBe(2);
      expect(borrowed.report.verification.kind).toBe("unverified");

      // <lang><zh-CN>同一源码路径换成第二版本后，仅第二 section 可获已核锚点，缺失 section 参数不能借用它。</zh-CN><en>After the same source path receives the second version, only the second section may verify; an omitted section cannot borrow it.</en></lang>
      await writeFile(path.join(root, "src", "a.ts"), secondBytes);
      const secondOptions = ["--source-id", "source:second", "--entry-id", "entry:second", "--column", "2", "--column-unit", "unicode-code-point"];
      const second = await invoke(root, ["--section-index", "1", ...secondOptions]);
      expect(second.code).toBe(0);
      expect(second.report.verification).toMatchObject({ kind: "exact-anchor", generatedPosition: { line: 2, column: 5 } });
      const omittedSection = await invoke(root, secondOptions);
      expect(omittedSection.code).toBe(1);
      expect(omittedSection.report.verification.kind).toBe("invalid");
      expect(omittedSection.report.diagnostics[0]?.code).toBe("COORDINATE_PROFILE_SOURCE_INPUT_INVALID");
      expect((await invoke(root, ["--section-index", "0"])).report.verification.kind).toBe("unverified");
      const wrongSection = await invoke(root, ["--section-index", "0", ...secondOptions]);
      expect(wrongSection.code).toBe(2);
      expect(wrongSection.report.verification.kind).toBe("unverified");
      const malformed = await invoke(root, ["--section-index", "1e0", ...secondOptions]);
      expect(malformed.code).toBe(1);
      expect(malformed.report.diagnostics[0]?.code).toBe("HIA_CLI_COORDINATE_QUERY_INVALID");
      expect(JSON.stringify([first, borrowed, second, omittedSection, wrongSection, malformed])).not.toContain(root);
      expect(JSON.stringify([first, borrowed, second, omittedSection, wrongSection, malformed])).not.toContain("export const value");
      // <lang><zh-CN>诊断只保留固定代码与文案，不回显同一路径、版本标签或源码摘要。</zh-CN><en>Diagnostics retain fixed codes and messages without echoing the shared path, revision label or source digest.</en></lang>
      const diagnostics = JSON.stringify([first, borrowed, second, omittedSection, wrongSection, malformed].flatMap(({ report }) => report.diagnostics));
      const sidecar = JSON.parse(await readFile(path.join(root, "profile.json"), "utf8"));
      expect(diagnostics).not.toContain("src/a.ts");
      expect(diagnostics).not.toContain("revision:second");
      expect(diagnostics).not.toContain(sidecar.sourceSlots[1].sourceByteDigest.value);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("returns one exact machine anchor only after reading all four actual local inputs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      await writeSyntheticInputs(root);
      const { code, report, stderr } = await invoke(root);
      expect(code).toBe(0);
      expect(report.verification.kind).toBe("exact-anchor");
      expect(report.verification.generatedPosition).toEqual({ line: 1, column: 1 });
      expect(stderr).toEqual([]);
      expect(JSON.stringify(report)).not.toContain(root);
      expect(JSON.stringify(report)).not.toContain("public fixture");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("does not certify a changed source byte or a nearest ordinary segment", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      await writeSyntheticInputs(root);
      await writeFile(path.join(root, "src", "a.ts"), "/* changed fixture */\nexport const value = 1;\n", "utf8");
      const changed = await invoke(root);
      expect(changed.code).not.toBe(0);
      expect(changed.report.verification.kind).not.toBe("exact-anchor");

      await writeSyntheticInputs(root);
      const stdout: string[] = [];
      const io: CliIo = { cwd: root, stdout: (message) => stdout.push(message), stderr: () => undefined };
      const code = await runCli([
        "docs", "coordinate-verify",
        "--coordinate-profile", "profile.json", "--ordinary-map", "app.js.map",
        "--doc-source-map", "app.docmap.json", "--source", "src/a.ts",
        "--source-id", "source:sample", "--source-index", "0", "--entry-id", "entry:sample",
        "--line", "1", "--column", "2", "--column-unit", "utf16-code-unit"
      ], io);
      expect(code).toBe(2);
      expect(JSON.parse(stdout[0]!).verification.kind).not.toBe("exact-anchor");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("returns unverified without authorized source bytes and refuses duplicate raw profile members", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      await writeSyntheticInputs(root);
      const omitted = await invoke(root, [], true);
      expect(omitted.code).toBe(2);
      expect(omitted.report.verification.kind).toBe("unverified");

      // <lang><zh-CN>重复 JSON 成员在普通 JSON.parse 中会悄悄保留末项，严格 reader 必须用原始文本拒绝。</zh-CN><en>Ordinary JSON.parse silently retains a later duplicate member; the strict reader must reject the raw text.</en></lang>
      await writeFile(path.join(root, "profile.json"), '{"contract":"first","contract":"second"}', "utf8");
      const duplicate = await invoke(root);
      expect(duplicate.code).toBe(1);
      expect(duplicate.report.verification.kind).toBe("invalid");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects traversal, outside symlinks, unknown options and malformed coordinates without private echoes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-outside-"));
    try {
      await writeSyntheticInputs(root);
      const traversal = await invoke(root, ["--source", "../outside.ts"]);
      expect(traversal.code).toBe(1);
      expect(traversal.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_PATH_INVALID");
      const remote = await invoke(root, ["--source", "https://example.invalid/source.ts"]);
      expect(remote.code).toBe(1);
      expect(remote.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_PATH_INVALID");
      const missing = await invoke(root, ["--source", "src/missing.ts"]);
      expect(missing.code).toBe(1);
      expect(missing.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_INPUT_READ_FAILED");

      await writeFile(path.join(outside, "a.ts"), "private sentinel", "utf8");
      await symlink(path.join(outside, "a.ts"), path.join(root, "outside-link.ts"), "file");
      const stdout: string[] = [];
      const io: CliIo = { cwd: root, stdout: (message) => stdout.push(message), stderr: () => undefined };
      const base = ["docs", "coordinate-verify", "--coordinate-profile", "profile.json", "--ordinary-map", "app.js.map", "--doc-source-map", "app.docmap.json", "--source", "outside-link.ts", "--source-id", "source:sample", "--source-index", "0", "--entry-id", "entry:sample", "--line", "1", "--column", "1", "--column-unit", "utf16-code-unit"];
      const code = await runCli(base, io);
      expect(code).toBe(1);
      expect(JSON.parse(stdout[0]!).diagnostics[0].code).toBe("HIA_CLI_COORDINATE_INPUT_READ_FAILED");
      expect(stdout[0]).not.toContain("private sentinel");
      expect(stdout[0]).not.toContain(outside);

      const unknown = await invoke(root, ["--fetch", "https://example.invalid"]);
      expect(unknown.code).toBe(1);
      expect(unknown.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_OPTIONS_INVALID");
      const malformed = await invoke(root, ["--line", "1e2"]);
      expect(malformed.code).toBe(1);
      expect(malformed.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_QUERY_INVALID");
    } finally {
      await rm(root, { force: true, recursive: true });
      await rm(outside, { force: true, recursive: true });
    }
  });

  it("rejects an oversized profile before parsing or serializing its bytes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      await writeSyntheticInputs(root);
      await writeFile(path.join(root, "profile.json"), "x".repeat(2 * 1024 * 1024 + 1), "utf8");
      const result = await invoke(root);
      expect(result.code).toBe(1);
      expect(result.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_INPUT_READ_FAILED");
      expect(JSON.stringify(result.report)).not.toContain("xxxxx");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("refuses a map that grows beyond the byte cap after the profile was prepared", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-coordinate-cli-"));
    try {
      await writeSyntheticInputs(root);
      // <lang><zh-CN>先有合法证据，再把普通 map 改成超限文件；读取必须受实际句柄字节上限约束。</zh-CN><en>Prepare valid evidence first, then enlarge the ordinary map; the actual handle read must stay bounded.</en></lang>
      await writeFile(path.join(root, "app.js.map"), Buffer.alloc(16 * 1024 * 1024 + 1, 0x61));
      const result = await invoke(root);
      expect(result.code).toBe(1);
      expect(result.report.diagnostics[0].code).toBe("HIA_CLI_COORDINATE_INPUT_READ_FAILED");
      expect(JSON.stringify(result.report)).not.toContain(root);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
