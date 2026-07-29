import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDocumentationTerminologyCandidateFromProfileObservation,
  createDocumentationTerminologyQualityReviewInput,
  DOCUMENTATION_TERMINOLOGY_CONTRACT,
  DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
  validateDocumentationTerminologyCandidateSet,
  validateDocumentationTerminologyRegistry
} from "../packages/core/dist/index.js";
import { createDocumentationQualityReviewReport } from "../packages/core/dist/documentation-quality-review.js";

/**
 * @lang zh-CN 生成 W-P61 的 public-safe terminology reference evidence；它只使用合成结构 fixture，不读取真实 comment、registry 文件或 workspace。
 * @lang en Generates public-safe W-P61 terminology-reference evidence using synthetic structural fixtures only; it reads no real comments, registry files, or workspace.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @lang zh-CN 忽略的 evidence 输出目录。 @lang en Ignored evidence output directory. */
const outputRoot = path.join(rootDir, "dist", "wp61-terminology-reference");
/** @lang zh-CN machine-readable evidence 路径。 @lang en Machine-readable evidence path. */
const evidencePath = path.join(outputRoot, "evidence.json");
/** @lang zh-CN 中文优先人工 review packet 路径。 @lang en Chinese-first human-review packet path. */
const reviewPacketPath = path.join(outputRoot, "terminology-review-packet.md");

await main();

/**
 * @lang zh-CN 执行合成 reference fixture、schema privacy 检查与 public-safe artifact 写入。
 * @lang en Runs synthetic reference fixtures, schema privacy checks, and public-safe artifact writing.
 *
 * @returns 无返回值。 / No return value.
 */
async function main() {
  // <lang><zh-CN>输出目录只承载本次可复现 evidence；不存在 source/registry path、body 或 phrase artifact。</zh-CN><en>The output directory holds reproducible evidence only; it contains no source/registry paths, bodies, or phrase artifacts.</en></lang>
  await mkdir(outputRoot, { recursive: true });
  // <lang><zh-CN>registry fixture 的 form 文本只停留在进程内，用来证明 validator/visibility 行为。</zh-CN><en>Registry-fixture form text stays in-process only to prove validator and visibility behavior.</en></lang>
  const registry = createRegistryFixture();
  const detected = createDocumentationTerminologyCandidateFromProfileObservation(createObservation("term-candidate:wp61:public:0", "en", "first-unwrapped-natural-language-phrase"));
  const grammarUnknown = createDocumentationTerminologyCandidateFromProfileObservation(createObservation("term-candidate:wp61:unknown:0", "zh_CN", "profile-grammar-unknown"));
  assert.ok(detected.candidate, "Expected the structured public observation to create a candidate.");
  assert.ok(grammarUnknown.candidate, "Expected the structured grammar-unknown observation to retain a reviewable candidate.");
  assert.deepEqual(detected.diagnostics, []);
  assert.deepEqual(grammarUnknown.diagnostics.map((diagnostic) => diagnostic.code), ["TERM_LOCALE_INVALID", "TERM_CANDIDATE_GRAMMAR_UNKNOWN"]);

  // <lang><zh-CN>linked candidate 必须显式携带人工 review identity；该 identity 不含人员、路径或 source text。</zh-CN><en>A linked candidate must explicitly carry human-review identity; that identity contains no person, path, or source text.</en></lang>
  const publicLink = {
    ...detected.candidate,
    review: { decision: "linked", reviewId: "review:wp61:public" },
    status: "linked",
    termId: "term.documentation.reference-contract"
  };
  const workspaceLink = {
    ...detected.candidate,
    candidateId: "term-candidate:wp61:workspace:0",
    review: { decision: "linked", reviewId: "review:wp61:workspace" },
    status: "linked",
    termId: "term.documentation.workspace-concept"
  };
  const candidateSet = {
    candidates: [publicLink, workspaceLink, grammarUnknown.candidate],
    contract: DOCUMENTATION_TERMINOLOGY_CONTRACT,
    contractVersion: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
    id: "terminology-candidates:wp61-reference",
    kind: "documentation-terminology-candidate-set",
    privacy: {
      allowObservedText: false,
      allowRawLocator: false,
      allowSourceBody: false
    }
  };
  assert.deepEqual(validateDocumentationTerminologyRegistry(registry), []);
  assert.deepEqual(validateDocumentationTerminologyCandidateSet(candidateSet, registry), []);

  // <lang><zh-CN>quality input 的 public audience 不得泄漏 workspace form，只生成 visibility review signal。</zh-CN><en>The public audience of quality input must not leak a workspace form and emits only a visibility review signal.</en></lang>
  const qualityInput = createDocumentationTerminologyQualityReviewInput(candidateSet, registry, "quality-input:wp61-terminology");
  const qualityReport = createDocumentationQualityReviewReport(qualityInput);
  assert.equal(qualityReport.actionPolicy, "review-only");
  assert.equal(qualityReport.summary.terminologyFindingCount, 3);
  assert.equal(qualityInput.observations.some((observation) => observation.diagnosticCodes?.includes("TERM_VISIBILITY_DENIED")), true);
  assert.equal(qualityInput.observations.some((observation) => observation.diagnosticCodes?.includes("TERM_CANDIDATE_GRAMMAR_UNKNOWN")), true);

  // <lang><zh-CN>分发 schema 与 core contract identity 必须同源；evidence 只输出布尔结论，不序列化 schema 或 form。</zh-CN><en>The distributed schema and core contract identity must share one source; evidence outputs only boolean conclusions, never schemas or forms.</en></lang>
  const distributedSchema = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "schemas", "documentation-terminology.schema.json"), "utf8"));
  assert.equal(distributedSchema.$defs.candidateSet.properties.contract.const, DOCUMENTATION_TERMINOLOGY_CONTRACT);
  assert.equal(distributedSchema.$defs.privacy.properties.allowObservedText.const, false);
  assert.equal(distributedSchema.$defs.privacy.properties.allowSourceBody.const, false);
  assert.equal(distributedSchema.$defs.privacy.properties.allowRawLocator.const, false);

  const evidence = {
    contract: "wp61-terminology-reference-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp61-closeout",
    terminologyContract: `${DOCUMENTATION_TERMINOLOGY_CONTRACT}@${DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION}`,
    summary: {
      candidateCount: candidateSet.candidates.length,
      grammarUnknownCandidateCount: 1,
      humanLinkedCandidateCount: 2,
      registryTermCount: registry.terms.length,
      terminologyQualityFindingCount: qualityReport.summary.terminologyFindingCount,
      publicVisibilityReviewCount: 1,
      qualityActionPolicy: qualityReport.actionPolicy
    },
    checks: {
      candidateSetAndRegistryValidated: true,
      candidateIdentityUsesLogicalScopeOnly: true,
      structuredProfileObservationOnly: true,
      humanReviewRequiredForLink: true,
      approvedLifecycleRequiredForLink: true,
      canonicalLocaleBridgeCovered: true,
      formConflictCoveredByFocusedTests: true,
      distributedSchemaPrivacyDenyAll: true,
      qualityInputMetadataOnly: true,
      qualityRequiresHumanReview: qualityReport.summary.requiresHumanReview,
      automaticApprovalImplemented: false,
      sourceParserOrTokenizerImplemented: false,
      registryPersistenceOrMutationImplemented: false,
      hostProjectionOrWriteImplemented: false,
      dlrDiscoveryImplemented: false,
      satelliteMutationImplemented: false,
      targetRepositoryAction: false,
      nextWPhaseStarted: false
    },
    boundary: {
      sourceBodyReadCount: 0,
      sourceBodySerializationCount: 0,
      termPhraseSerializationCount: 0,
      registryFormSerializationCount: 0,
      rawLocatorExposureCount: 0,
      absolutePathExposureCount: 0,
      workspaceWriteEnabledCount: 0,
      providerNetworkExecutionCount: 0
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P61 evidence");
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reviewPacketPath, renderReviewPacket(evidence), "utf8");
  console.log(`W-P61 terminology reference evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P61 status: ${evidence.status}`);
}

/**
 * @lang zh-CN 创建受控 registry fixture；term forms 只用于进程内 semantic validation。
 * @lang en Creates a controlled registry fixture; term forms are used only for in-process semantic validation.
 *
 * @returns 受控 registry fixture。 / Controlled registry fixture.
 */
function createRegistryFixture() {
  return {
    contract: DOCUMENTATION_TERMINOLOGY_CONTRACT,
    contractVersion: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
    id: "terminology-registry:wp61-reference",
    kind: "documentation-terminology-registry",
    privacy: {
      allowObservedText: false,
      allowRawLocator: false,
      allowSourceBody: false
    },
    terms: [
      {
        forms: { en: { canonical: "Reference contract" }, "zh-CN": { canonical: "参考契约" } },
        lifecycle: "approved",
        provenance: { kind: "human-confirmed", recordId: "review:registry:wp61:public" },
        termId: "term.documentation.reference-contract",
        visibility: "public"
      },
      {
        forms: { en: { canonical: "Workspace concept" } },
        lifecycle: "approved",
        provenance: { kind: "human-confirmed", recordId: "review:registry:wp61:workspace" },
        termId: "term.documentation.workspace-concept",
        visibility: "workspace"
      }
    ]
  };
}

/**
 * @lang zh-CN 创建不含 phrase/comment 的 profile observation fixture。
 * @lang en Creates a profile-observation fixture containing no phrase or comment.
 *
 * @param candidateId stable candidate identity。 / Stable candidate identity.
 * @param locale bridge locale input。 / Bridge locale input.
 * @param extractionKind grammar outcome。 / Grammar outcome.
 * @returns structured observation。 / Structured observation.
 */
function createObservation(candidateId, locale, extractionKind) {
  return {
    candidateId,
    extractionKind,
    locale,
    provenance: { kind: "profile-candidate", profile: "documentation-at-tag-terminology-profile@0.1.0-draft" },
    scope: {
      annotationKind: "jsdoc-param-description",
      fieldPath: "description",
      occurrence: 0,
      sourceDocumentId: `doc:${candidateId}`,
      symbolId: "function:wp61:fixture"
    }
  };
}

/**
 * @lang zh-CN 生成中文优先人工复核 packet；它只列 policy 和计数。
 * @lang en Generates a Chinese-first human-review packet listing policy and counts only.
 *
 * @param evidence public-safe evidence。 / Public-safe evidence.
 * @returns Markdown packet。 / Markdown packet.
 */
function renderReviewPacket(evidence) {
  return `# W-P61 固有术语人工审查 Packet

## 结论

本 packet 证明 structured profile observation、candidate lifecycle、受控 registry 与 W-P57
metadata-only quality input 可以在不读取 source comment、术语短语或 registry form 的情况下协作。
所有 finding 都是 review-only，不授予 source 或 registry 写入。

## 复核清单

- candidate 的 stable scope、profile provenance 与 occurrence 是否符合 owner profile 的已解析语法。
- linked candidate 是否有对应 human review record，且目标 term 为 approved lifecycle。
- registry 的 canonical form/synonym 冲突、locale 和 visibility 是否由 owner 人工治理。
- public quality projection 是否不含 private/workspace form、source body、term phrase、locator 或路径。
- grammar unknown 是否继续保留为人工 review，而非猜测 phrase 或自动批准。

## 统计与边界

- candidate：${evidence.summary.candidateCount}
- 人工 linked candidate：${evidence.summary.humanLinkedCandidateCount}
- grammar unknown candidate：${evidence.summary.grammarUnknownCandidateCount}
- quality policy：${evidence.summary.qualityActionPolicy}
- source body / term phrase / registry form serialization：0 / 0 / 0
- parser/tokenizer、automatic approval、registry mutation、host write、DLR discovery、satellite/target action、下一 W-P：均未实现或启动。

## English summary

This packet records a metadata-only terminology reference for human review. It does not parse source text,
approve or mutate registry entries, expose term forms, or authorize later-cycle implementation.
`;
}

/**
 * @lang zh-CN 把本机路径规范化为 main-repo 相对 artifact identity。
 * @lang en Normalizes a local path to a main-repo-relative artifact identity.
 *
 * @param value 本机路径。 / Local path.
 * @returns 相对 identity。 / Relative identity.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * @lang zh-CN 阻止 evidence 写入路径、正文、术语 form 或 credential marker。
 * @lang en Prevents evidence from writing paths, bodies, terminology forms, or credential markers.
 *
 * @param value 序列化 evidence。 / Serialized evidence.
 * @param label 断言上下文。 / Assertion context.
 * @returns 无返回值；命中时抛出。 / No return value; throws on a match.
 */
function assertNoPrivateMarkers(value, label) {
  // <lang><zh-CN>失败信息只输出 pattern，不回显命中数据。</zh-CN><en>Failure output reports the pattern only and never echoes matched data.</en></lang>
  const forbiddenPatterns = [
    /\b[A-Z]:[\\/]/u,
    /file:\/\//iu,
    /"(canonical|synonyms|definition)"\s*:/u,
    /"(observedText|sourceBody|rawLocator)"\s*:/u,
    /sk-[A-Za-z0-9_-]+/u,
    /ghp_[A-Za-z0-9_]+/u,
    /npm_[A-Za-z0-9_]+/u
  ];
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a forbidden public-safe marker: ${hit}`);
}
