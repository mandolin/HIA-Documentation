/**
 * @file
 * @lang zh-CN 草案派生证据的身份、闭包、覆盖、快照及未核状态回归。
 * @lang en Draft derivation-evidence regressions for identity, closure, coverage, snapshots and unverified states.
 */
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import {
  ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA,
  readArtifactDerivationEvidence
} from "./derivation-evidence.js";

/**
 * @lang zh-CN 建立手工resource级记录，规则细节尚未通过语义核验。
 * @lang en Creates a hand-authored resource-level record whose rule details remain semantically unverified.
 * @returns <lang><zh-CN>独立JSON夹具。</zh-CN><en>Independent JSON fixture.</en></lang>
 */
function fixture() {
  return {
    contract: "artifact-derivation-evidence", contractVersion: "0.1.0-draft", id: "schema-evidence",
    producer: { id: "jsdoc-schema", version: "1.0.0" }, evidenceOrigin: "producer-recorded", coverage: "resource",
    resources: [
      { id: "source", kind: "source", path: "src/schema.mjs", sha256: "a".repeat(64) },
      { id: "output", kind: "artifact", path: "schemas/config.json", sha256: "b".repeat(64) }
    ],
    activities: [{ id: "derive", type: "schema-generation", profile: { contract: "plain-data-initialization", contractVersion: "0.1.0-draft" }, inputs: ["source"], outputs: ["output"] }],
    derivations: [{ id: "link", activityId: "derive", inputs: ["source"], outputs: ["output"], mapRefIds: [] as string[] }],
    mapRefs: [] as Array<{ id: string; resourceId: string; contract: string; contractVersion: string }>,
    details: { derive: {} as Record<string, unknown> }
  };
}

describe("draft artifact derivation evidence reader", () => {
  it("accepts exact structure while retaining all verification boundaries", () => {
    const result = readArtifactDerivationEvidence(fixture());
    expect(result.status).toBe("readable");
    if (result.status !== "readable") throw new Error("Fixture rejected");
    expect(result.verification).toEqual({ structure: true, artifactBytes: false, sourceLinks: false, profileSemantics: false, producerAuthenticity: false });
    expect(result.evidence.evidenceOrigin).toBe("producer-recorded");
    const inferred = fixture();
    inferred.evidenceOrigin = "static-inferred";
    const other = readArtifactDerivationEvidence(inferred);
    expect(other.status === "readable" && other.evidence.evidenceOrigin).toBe("static-inferred");
  });

  it("preserves unknown profile payloads without claiming semantic support", () => {
    const value = fixture();
    value.activities[0]!.profile = { contract: "future-generation", contractVersion: "7.0.0" };
    value.details.derive = { nested: [1, "opaque", null] };
    const result = readArtifactDerivationEvidence(value);
    expect(result.status).toBe("readable");
    expect(result.status === "readable" && result.verification.profileSemantics).toBe(false);
  });

  // <lang><zh-CN>结构错误与引用错误分别覆盖，诊断不能回显私有字段值。</zh-CN><en>Cover structural and reference failures separately; diagnostics must not echo private values.</en></lang>
  for (const [name, change] of [
    ["wrong identity", (x: ReturnType<typeof fixture>) => { x.contract = "private-secret"; }],
    ["unknown version", (x: ReturnType<typeof fixture>) => { x.contractVersion = "0.1.1-draft"; }],
    ["wrong origin", (x: ReturnType<typeof fixture>) => { x.evidenceOrigin = "verified"; }],
    ["unknown coverage", (x: ReturnType<typeof fixture>) => { x.coverage = "all"; }],
    ["bad hash", (x: ReturnType<typeof fixture>) => { x.resources[0]!.sha256 = "private-secret"; }],
    ["unsafe path", (x: ReturnType<typeof fixture>) => { x.resources[0]!.path = "../private-secret"; }],
    ["duplicate resource", (x: ReturnType<typeof fixture>) => { x.resources[1]!.id = "source"; }],
    ["missing input", (x: ReturnType<typeof fixture>) => { x.activities[0]!.inputs = ["private-secret"]; }],
    ["wrong output kind", (x: ReturnType<typeof fixture>) => { x.resources[1]!.kind = "source"; }],
    ["missing activity", (x: ReturnType<typeof fixture>) => { x.derivations[0]!.activityId = "private-secret"; }],
    ["activity mismatch", (x: ReturnType<typeof fixture>) => { x.derivations[0]!.inputs = ["output"]; }],
    ["missing map", (x: ReturnType<typeof fixture>) => { x.derivations[0]!.mapRefIds = ["private-secret"]; }],
    ["missing details", (x: ReturnType<typeof fixture>) => { x.details = {} as typeof x.details; }],
    ["unknown details", (x: ReturnType<typeof fixture>) => { x.details = { "private-secret": {} } as typeof x.details; }],
    ["unmapped value coverage", (x: ReturnType<typeof fixture>) => { x.coverage = "value-links"; }]
  ] as const) it(`rejects ${name}`, () => {
    const value = fixture();
    change(value);
    const result = readArtifactDerivationEvidence(value);
    expect(result.status).toBe("invalid");
    expect(JSON.stringify(result.diagnostics)).not.toContain("private-secret");
  });

  it("accepts declared map references without asserting actual map content", () => {
    const value = fixture();
    value.resources.push({ id: "map", kind: "artifact", path: "maps/schema.json", sha256: "c".repeat(64) });
    value.mapRefs.push({ id: "mapping", resourceId: "map", contract: "doc-source-map", contractVersion: "1.1.0" });
    value.derivations[0]!.mapRefIds.push("mapping");
    value.coverage = "value-links";
    const result = readArtifactDerivationEvidence(value);
    expect(result.status).toBe("readable");
    expect(result.status === "readable" && result.verification.sourceLinks).toBe(false);
  });

  it("owns a defensive snapshot and rejects unknown fields", () => {
    const value = fixture();
    value.details.derive = { nested: { value: 1 } };
    const result = readArtifactDerivationEvidence(value);
    value.resources[0]!.path = "changed.mjs";
    (value.details.derive.nested as { value: number }).value = 2;
    expect(result.status === "readable" && result.evidence.resources[0]!.path).toBe("src/schema.mjs");
    expect(result.status === "readable" && result.evidence.details.derive).toEqual({ nested: { value: 1 } });
    expect(readArtifactDerivationEvidence({ ...fixture(), privateField: true }).status).toBe("invalid");
  });

  it("rejects getters, hooks, cycles and non-wire objects without executing them", () => {
    let reads = 0;
    const getter = Object.defineProperty(fixture(), "id", { enumerable: true, get() { reads++; return "hidden"; } });
    expect(readArtifactDerivationEvidence(getter).status).toBe("invalid");
    const hook = { ...fixture(), toJSON() { reads++; return {}; } };
    expect(readArtifactDerivationEvidence(hook).status).toBe("invalid");
    const cycle = fixture();
    cycle.details.derive.self = cycle;
    expect(readArtifactDerivationEvidence(cycle).status).toBe("invalid");
    expect(readArtifactDerivationEvidence(new Date()).status).toBe("invalid");
    expect(readArtifactDerivationEvidence(undefined).status).toBe("invalid");
    expect(reads).toBe(0);
  });

  it("bounds deep data and preserves JSON special keys as data", () => {
    const value = fixture();
    value.details.derive = JSON.parse('{"__proto__":{"v":1}}') as Record<string, unknown>;
    expect(readArtifactDerivationEvidence(value).status).toBe("readable");
    let nested: Record<string, unknown> = {};
    for (let i = 0; i < 70; i++) nested = { nested };
    value.details.derive = nested;
    expect(readArtifactDerivationEvidence(value).status).toBe("invalid");
  });

  it("publishes a matching structural schema with runtime closure checks", () => {
    const validate = new Ajv2020({ strict: true }).compile(ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA);
    expect(validate(fixture())).toBe(true);
    const wrongVersion = { ...fixture(), contractVersion: "1.0.0" };
    expect(validate(wrongVersion)).toBe(false);
    const missing = fixture();
    missing.activities[0]!.inputs = ["missing"];
    expect(validate(missing)).toBe(true);
    expect(readArtifactDerivationEvidence(missing).status).toBe("invalid");
  });

  it("keeps schema and reader path boundaries aligned", () => {
    const validate = new Ajv2020({ strict: true }).compile(ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA);
    for (const [path, accepted] of [
      ["a", true], ["src/文档.json", true], ["src/a b.json", true],
      ["a/", false], ["/a", false], ["a//b", false], ["a/../b", false],
      ["./a", false], ["a\\b", false], ["K:/a", false], ["a%20b", false], ["a\u0000b", false]
    ] as const) {
      const value = fixture();
      value.resources[0]!.path = path;
      expect(Boolean(validate(value)), path).toBe(accepted);
      expect(readArtifactDerivationEvidence(value).status === "readable", path).toBe(accepted);
    }
  });

  it("does not inspect arbitrary reflection exceptions", () => {
    let reads = 0;
    const failure = Object.defineProperty({}, "evidenceFieldPath", { get() { reads++; return "private-secret"; } });
    const value = new Proxy({}, { getPrototypeOf() { throw failure; } });
    const result = readArtifactDerivationEvidence(value);
    expect(result.status).toBe("invalid");
    expect(reads).toBe(0);
    expect(JSON.stringify(result.diagnostics)).not.toContain("private-secret");
  });

  it("rejects trailing line terminators in identities and digests", () => {
    const validate = new Ajv2020({ strict: true }).compile(ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA);
    const name = fixture();
    name.id += "\n";
    const digest = fixture();
    digest.resources[0]!.sha256 += "\n";
    for (const value of [name, digest]) {
      expect(Boolean(validate(value))).toBe(false);
      expect(readArtifactDerivationEvidence(value).status).toBe("invalid");
    }
  });

  it("keeps the draft subpath explicit, typed and bilingual", () => {
    // <lang><zh-CN>独立程序读取真实公开声明，双语检查跟随符号而非临时产物。</zh-CN><en>An independent program reads actual public declarations, following symbols for bilingual checks rather than temporary output.</en></lang>
    const entry = fileURLToPath(new URL("./derivation-evidence.ts", import.meta.url));
    const program = ts.createProgram([entry], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, resolveJsonModule: true, strict: true, noEmit: true, types: ["node"] });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry)!;
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source)!);
    expect(exports.map(symbol => symbol.name).sort()).toEqual([
      "ARTIFACT_DERIVATION_EVIDENCE_CONTRACT", "ARTIFACT_DERIVATION_EVIDENCE_CONTRACT_VERSION", "ARTIFACT_DERIVATION_EVIDENCE_SCHEMA_ID", "ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA",
      "DerivationEvidenceResource", "DerivationEvidenceActivity", "DerivationEvidenceRelation", "DerivationEvidenceMapReference", "ArtifactDerivationEvidence", "ArtifactDerivationEvidenceReadResult", "readArtifactDerivationEvidence"
    ].sort());
    for (const symbol of exports) {
      const tags = symbol.getJsDocTags(checker).filter(tag => tag.name === "lang").map(tag => ts.displayPartsToString(tag.text));
      expect(tags.some(text => /^zh-CN\s+\S/.test(text)), symbol.name).toBe(true);
      expect(tags.some(text => /^en\s+\S/.test(text)), symbol.name).toBe(true);
    }
    expect(ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  });
});
