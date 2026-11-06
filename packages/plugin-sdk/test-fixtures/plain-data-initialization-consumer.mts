/**
 * @file
 * @lang zh-CN 初始化规则与通用证据的真实正负类型消费者，不作为生产记录。
 * @lang en Actual positive/negative type consumer for initialization rules and generic evidence, not a production record.
 */
import { readPlainDataInitialization, type PlainDataInitialization, type PlainDataInitializationSource, type PlainDataInitializationStep } from "../src/plain-data-initialization.js";
import type { ArtifactDerivationEvidence } from "../src/derivation-evidence.js";

// <lang><zh-CN>来源只声明输入范围，实际文件字符由后续消费者核。</zh-CN><en>The source declares an input range only; later consumers check actual file characters.</en></lang>
const source: PlainDataInitializationSource = { resourceId: "src", range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } }, rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" } };
// <lang><zh-CN>受控常量轨迹作为类型夹具。</zh-CN><en>Controlled constant trace used as a type fixture.</en></lang>
const initialization: PlainDataInitialization = {
  contract: "plain-data-initialization", contractVersion: "0.1.0-draft", entryResourceId: "src",
  steps: [{ sequence: 0, source, kind: "literal", nodeId: "one", value: 1 }, { sequence: 1, source, kind: "bind", nodeId: "one", name: "DATA" }],
  result: { resourceId: "out", bindingName: "DATA" }
};
// <lang><zh-CN>强类型payload必须可直接进入通用证据，不需调用者放弃类型检查。</zh-CN><en>The typed payload must enter generic evidence directly without requiring consumers to bypass type checking.</en></lang>
const evidence: ArtifactDerivationEvidence = {
  contract: "artifact-derivation-evidence", contractVersion: "0.1.0-draft", id: "example",
  producer: { id: "example-recorder", version: "1.0.0" }, evidenceOrigin: "static-inferred", coverage: "resource",
  resources: [{ id: "src", kind: "source", path: "src.mjs", sha256: "a".repeat(64) }, { id: "out", kind: "artifact", path: "out.json", sha256: "b".repeat(64) }],
  activities: [{ id: "derive", type: "schema-generation", profile: { contract: "plain-data-initialization", contractVersion: "0.1.0-draft" }, inputs: ["src"], outputs: ["out"] }],
  derivations: [{ id: "link", activityId: "derive", inputs: ["src"], outputs: ["out"], mapRefIds: [] }],
  mapRefs: [], details: { derive: initialization }
};
// <lang><zh-CN>分支精确表达已核轨迹与未核源码符合性。</zh-CN><en>The branch precisely expresses verified trace semantics and unverified source conformance.</en></lang>
const result = readPlainDataInitialization(evidence, "derive");
if (result.status === "replayed") {
  const traceVerified: true = result.verification.traceSemantics;
  const sourceUnverified: false = result.verification.sourceConformance;
  void [traceVerified, sourceUnverified];
}
// @ts-expect-error The rule has an exact draft wire identity.
const unsupportedVersion: PlainDataInitialization["contractVersion"] = "1.0.0";
// @ts-expect-error Unknown executable operations are outside the closed data rule.
const unsupportedStep: PlainDataInitializationStep = { sequence: 0, source, kind: "eval", nodeId: "one" };
void [unsupportedVersion, unsupportedStep];
