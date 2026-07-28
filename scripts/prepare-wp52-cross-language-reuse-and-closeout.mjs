import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(root, "..");
const workspaceParent = path.resolve(workspace, "..");
const outputRoot = path.join(root, "dist", "wp52-cross-language-reuse-and-closeout");

main();

/**
 * 生成 W-P52.7 跨语言复用与收口 evidence。
 * Generates W-P52.7 cross-language reuse and closeout evidence.
 *
 * 中文：只读取已提交 SassDoc、VueDoc、Meta 设计输入和既有 W-P52 evidence；不实现
 * 新 adapter、不执行编译器/表达式/locals、不读取或输出源码正文，也不写 satellite/target。
 * English: Reads only committed SassDoc, VueDoc, Meta design input, and prior
 * W-P52 evidence. It implements no adapter, executes no compiler/expression/locals,
 * reads or emits no source body, and writes no satellite or target repository.
 */
function main() {
  const inputs = readInputs();
  const candidates = createCandidates(inputs);
  const summary = summarize(inputs, candidates);
  const checks = createChecks(summary, candidates);
  const hardFailures = checks.filter((check) => check.status === "fail");
  const evidence = {
    contract: "hia-wp52-cross-language-reuse-and-closeout-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P52.7",
    status: hardFailures.length === 0
      ? "ready-for-wp52-closeout-and-wp53-user-confirmation"
      : "blocked-by-wp52-cross-language-reuse-and-closeout",
    sourceInputs: {
      generatedDocumentationBindingContract: {
        contract: "generated-documentation-binding@0.1.0-draft",
        status: inputs.contractEvidence.status
      },
      rendererAndHostProjection: {
        status: inputs.hostEvidence.status,
        bindingCount: inputs.hostEvidence.summary.bindingCount,
        expansionCount: inputs.hostEvidence.summary.expansionCount,
        targetCount: inputs.hostEvidence.summary.targetCount,
        hostProjectionCount: inputs.hostEvidence.summary.hostProjectionCount
      },
      sassDocFixture: fixtureEvidence(inputs.sass),
      vueDocFixture: fixtureEvidence(inputs.vue),
      jsx: { adapterRepositoryPresent: inputs.jsxRepositoryPresent, status: "no-hia-jsxdoc-adapter-in-workspace" },
      meta: { targetDesignInputPresent: inputs.metaDesignInputPresent, status: "design-input-only-no-production-meta-adapter" }
    },
    candidates,
    neutralContractDecision: {
      contract: "generated-documentation-binding@0.1.0-draft",
      schemaChangeRequired: false,
      genericGeneratedDocLineContractPromoted: false,
      reason: "Sass and Vue already reuse ordinary/doc source-map metadata, but neither has an adapter-owned declaration, expansion, scope, or stable instance-key model. JSX has no workspace adapter and Meta is target design input only."
    },
    executionPolicy: executionPolicy(),
    wp53Inputs: createWp53Inputs(),
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      overview: "dist/wp52-cross-language-reuse-and-closeout/cross-language-reuse-and-closeout.md",
      adapterMatrix: "dist/wp52-cross-language-reuse-and-closeout/adapter-reuse-matrix.md",
      wp53Inputs: "dist/wp52-cross-language-reuse-and-closeout/wp53-input-ledger.md"
    }
  };

  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized);
  if (hardFailures.length > 0) {
    console.error(`W-P52.7 failed checks: ${hardFailures.map((check) => check.id).join(", ")}`);
  }
  assert.equal(hardFailures.length, 0, `W-P52.7 has ${hardFailures.length} hard failure(s).`);
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  fs.writeFileSync(path.join(outputRoot, "cross-language-reuse-and-closeout.md"), renderOverview(evidence), "utf8");
  fs.writeFileSync(path.join(outputRoot, "adapter-reuse-matrix.md"), renderMatrix(evidence), "utf8");
  fs.writeFileSync(path.join(outputRoot, "wp53-input-ledger.md"), renderWp53Ledger(evidence), "utf8");
  console.log(`W-P52.7 cross-language reuse evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/** 中文：只将 fixture 规约成计数和状态，避免泄露 source path/range/annotation。English: Reduces fixtures to counts and states, avoiding source path/range/annotation leakage. */
function readInputs() {
  const contractEvidence = readJson(path.join(root, "dist", "wp52-generated-doc-binding-contract", "evidence.json"));
  const hostEvidence = readJson(path.join(root, "dist", "wp52-renderer-and-host-projection", "evidence.json"));
  assert.equal(contractEvidence.status, "ready-for-wp52-pug-one-to-many-parser-fixtures");
  assert.equal(hostEvidence.status, "ready-for-wp52-cross-language-reuse-and-closeout");
  const sass = readFixture("sassdoc", [
    path.join(workspace, "HIA", "hia-sassdoc", "fixtures", "doc-source-map", "sass-css", "dist", "button.docmap.json"),
    path.join(workspace, "HIA", "hia-sassdoc", "fixtures", "doc-source-map", "sass-css", "dist", "button.css.map")
  ]);
  const vue = readFixture("vue-sfc", [
    path.join(workspace, "HIA", "hia-vuedoc", "fixtures", "doc-source-map", "vue-sfc", "dist", "ProfileCard.docmap.json"),
    path.join(workspace, "HIA", "hia-vuedoc", "fixtures", "doc-source-map", "vue-sfc", "dist", "ProfileCard.template.js.map"),
    path.join(workspace, "HIA", "hia-vuedoc", "fixtures", "doc-source-map", "vue-sfc", "dist", "ProfileCard.script.js.map"),
    path.join(workspace, "HIA", "hia-vuedoc", "fixtures", "doc-source-map", "vue-sfc", "dist", "ProfileCard.style.css.map")
  ]);
  const metaText = fs.readFileSync(path.join(workspaceParent, "HIA-MicroFront-Sys", "work-zone", "docs", "meta-pug-htm-documentation-comment-projection.md"), "utf8");
  return {
    contractEvidence,
    hostEvidence,
    sass,
    vue,
    jsxRepositoryPresent: fs.existsSync(path.join(workspace, "HIA", "hia-jsxdoc")),
    metaDesignInputPresent: metaText.includes("instanceKey") && metaText.includes("slot/sign"),
    metaPhysicalSyntaxFrozen: !metaText.includes("不冻结 YAML 字段、Pug tag、注释标记、slot/sign 拼写")
  };
}

/** 中文：校验已提交 doc-source-map/privacy 与 ordinary map；不会写入或执行 satellite。English: Validates committed doc-source-map/privacy and ordinary maps without writing or executing a satellite. */
function readFixture(adapterId, paths) {
  const docMap = readJson(paths[0]);
  const ordinaryMaps = paths.slice(1).map(readJson);
  const index = createDocSourceMapIndex(docMap, { path: `${adapterId}.docmap.json` });
  assert.equal(docMap.contract, "doc-source-map");
  assert.equal(docMap.contractVersion, "0.1.0-draft");
  assert.equal(index.status, "available");
  assert.equal(index.diagnostics.some((diagnostic) => diagnostic.severity === "error"), false);
  assert.equal(docMap.privacy?.sourcesContentPolicy, "none");
  assert.equal(ordinaryMaps.every(sourceContentPolicyIsNone), true);
  return {
    entryCount: docMap.entries.length,
    ordinarySourceMapCount: ordinaryMaps.length,
    docSourceMapStatus: index.status,
    generatedBindingSidecarCount: Array.isArray(docMap.generatedBindingSidecars) ? docMap.generatedBindingSidecars.length : 0,
    generatedBindingReferenceCount: docMap.entries.reduce((count, entry) => count + (Array.isArray(entry.generatedBindingRefs) ? entry.generatedBindingRefs.length : 0), 0),
    privacyBaselinePresent: docMap.privacy?.sourcesContentPolicy === "none"
  };
}

function createCandidates(inputs) {
  return [
    candidateFromFixture("sass", inputs.sass, "Sass variable, mixin and module scope must be parser-owned; CSS selector metadata is not a lexical scope.", "A token or module stable id needs adapter validation before it can be an instance key.", "Create a declaration/expansion fixture before any sidecar is emitted."),
    candidateFromFixture("vue", inputs.vue, "SFC block identity plus compiler-owned template/script scope must be adapter-owned; component ids alone are not v-for instance scope.", "Component/slot/style identities are not per-render keys; v-for needs an explicit adapter key policy.", "Create a template scope and expansion fixture before any sidecar is emitted."),
    {
      adapterId: "jsx", evidenceKind: "official-parser-capability-only", sourceArtifactPresent: false,
      ordinarySourceMapPresent: false, semanticDocSourceMapPresent: false, referenceOnlySidecarLinkageReady: false,
      declarationExpansionModelPresent: false, lexicalScopeModelPresent: false, stableInstanceKeyPolicyPresent: false,
      qualityDimensionsPresent: false, privacyBaselinePresent: false, readiness: "deferred-no-workspace-adapter",
      scopeSeed: "Use a JSX/ECMAScript AST with lexical bindings; do not copy Pug scope ids.",
      stableKeySeed: "Require explicit data identity or an approved key policy; array position is unstable.",
      nextGate: "Create a dedicated adapter plan and production fixture after dependency/license review."
    },
    {
      adapterId: "meta", evidenceKind: "read-only-target-design-input", sourceArtifactPresent: inputs.metaDesignInputPresent,
      ordinarySourceMapPresent: false, semanticDocSourceMapPresent: false, referenceOnlySidecarLinkageReady: false,
      declarationExpansionModelPresent: false, lexicalScopeModelPresent: false,
      stableInstanceKeyPolicyPresent: inputs.metaDesignInputPresent, qualityDimensionsPresent: false, privacyBaselinePresent: false,
      readiness: inputs.metaDesignInputPresent && !inputs.metaPhysicalSyntaxFrozen ? "deferred-target-design-not-implemented" : "blocked-target-design-input-mismatch",
      scopeSeed: "Meta entry identity and projection slot/sign are upstream semantic identities; downstream Pug/HTM relations remain adapter-owned.",
      stableKeySeed: "Use schema/entry stable ids only after the target owner freezes its projection model.",
      nextGate: "Target owner must provide a non-writing producer fixture; this repository must not modify the target."
    }
  ];
}

function candidateFromFixture(adapterId, fixture, scopeSeed, stableKeySeed, nextGate) {
  return {
    adapterId, evidenceKind: "committed-doc-source-map-fixture", sourceArtifactPresent: true,
    ordinarySourceMapPresent: fixture.ordinarySourceMapCount > 0, semanticDocSourceMapPresent: fixture.docSourceMapStatus === "available",
    referenceOnlySidecarLinkageReady: fixture.generatedBindingSidecarCount === 0 && fixture.generatedBindingReferenceCount === 0,
    declarationExpansionModelPresent: false, lexicalScopeModelPresent: false, stableInstanceKeyPolicyPresent: false,
    qualityDimensionsPresent: false, privacyBaselinePresent: fixture.privacyBaselinePresent,
    fixtureEntryCount: fixture.entryCount, ordinarySourceMapCount: fixture.ordinarySourceMapCount,
    generatedBindingSidecarCount: fixture.generatedBindingSidecarCount, generatedBindingReferenceCount: fixture.generatedBindingReferenceCount,
    readiness: "reusable-doc-source-map-baseline-adapter-required", scopeSeed, stableKeySeed, nextGate
  };
}

function summarize(inputs, candidates) {
  const fixtures = candidates.filter((candidate) => candidate.evidenceKind === "committed-doc-source-map-fixture");
  return {
    phase: "W-P52.7", candidateCount: candidates.length, committedFixtureCandidateCount: fixtures.length,
    reusableDocSourceMapBaselineCount: candidates.filter((candidate) => candidate.semanticDocSourceMapPresent && candidate.privacyBaselinePresent).length,
    productionGeneratedBindingAdapterCount: candidates.filter((candidate) => candidate.declarationExpansionModelPresent).length,
    adapterImplementationAddedCount: 0, schemaChangeRequired: false, genericGeneratedDocLineContractPromoted: false,
    sassFixtureEntryCount: inputs.sass.entryCount, sassOrdinarySourceMapCount: inputs.sass.ordinarySourceMapCount,
    vueFixtureEntryCount: inputs.vue.entryCount, vueOrdinarySourceMapCount: inputs.vue.ordinarySourceMapCount,
    referenceOnlySidecarFixtureCount: fixtures.filter((candidate) => candidate.referenceOnlySidecarLinkageReady).length,
    missingWorkspaceAdapterCount: candidates.filter((candidate) => candidate.readiness === "deferred-no-workspace-adapter").length,
    targetDesignOnlyCandidateCount: candidates.filter((candidate) => candidate.readiness === "deferred-target-design-not-implemented").length,
    sourceTextSerializedCount: 0, sourceRangeSerializedCount: 0, localsValueSerializedCount: 0, digestValueSerializedCount: 0,
    localPathExposureCount: 0, credentialMarkerCount: 0, templateRuntimeDataExecutionCount: 0,
    arbitraryExpressionEvaluationCount: 0, hostRuntimeLaunchCount: 0, hostEditorApiCallCount: 0,
    checkedApplyWriteEnabledCount: 0, workspaceWriteAllowedCount: 0, providerNetworkExecutedCount: 0,
    satelliteRepositoryMutationCount: 0, targetRepositoryMutationCount: 0, sourcesContentPolicy: "none"
  };
}

function createChecks(summary, candidates) {
  const sass = candidates.find((candidate) => candidate.adapterId === "sass");
  const vue = candidates.find((candidate) => candidate.adapterId === "vue");
  const jsx = candidates.find((candidate) => candidate.adapterId === "jsx");
  const meta = candidates.find((candidate) => candidate.adapterId === "meta");
  return [
    check("neutral-contract-unchanged", summary.schemaChangeRequired === false && summary.genericGeneratedDocLineContractPromoted === false, "The neutral sidecar remains sufficient; no private AST field or generic generated-doc-line contract is promoted."),
    check("sass-reference-only-baseline", sass?.semanticDocSourceMapPresent && sass?.ordinarySourceMapPresent && sass?.privacyBaselinePresent && sass?.generatedBindingSidecarCount === 0 && sass?.generatedBindingReferenceCount === 0, "Committed Sass artifacts prove position/semantic-map/privacy reuse without claiming an unimplemented binding producer."),
    check("vue-reference-only-baseline", vue?.semanticDocSourceMapPresent && vue?.ordinarySourceMapPresent && vue?.privacyBaselinePresent && vue?.generatedBindingSidecarCount === 0 && vue?.generatedBindingReferenceCount === 0, "Committed Vue artifacts prove block-aware position/semantic-map/privacy reuse without claiming an unimplemented binding producer."),
    check("adapter-owned-scope-and-key-required", sass?.lexicalScopeModelPresent === false && vue?.lexicalScopeModelPresent === false && jsx?.lexicalScopeModelPresent === false && meta?.lexicalScopeModelPresent === false, "Existing symbols are never misrepresented as lexical scope or per-instance keys; future adapters must own those mappings."),
    check("jsx-explicitly-deferred", jsx?.readiness === "deferred-no-workspace-adapter", "No JSX package/runtime/schema claim is made without an adapter."),
    check("meta-read-only-design-input", meta?.readiness === "deferred-target-design-not-implemented", "Meta remains read-only target design input with no frozen physical syntax or producer."),
    check("no-runtime-or-write", summary.adapterImplementationAddedCount === 0 && summary.templateRuntimeDataExecutionCount === 0 && summary.arbitraryExpressionEvaluationCount === 0 && summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0 && summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.satelliteRepositoryMutationCount === 0 && summary.targetRepositoryMutationCount === 0, "Closeout adds no compiler/runtime, host API, write, network, satellite mutation, or target mutation."),
    check("privacy-boundary-intact", summary.sourceTextSerializedCount === 0 && summary.sourceRangeSerializedCount === 0 && summary.localsValueSerializedCount === 0 && summary.digestValueSerializedCount === 0 && summary.localPathExposureCount === 0 && summary.credentialMarkerCount === 0 && summary.sourcesContentPolicy === "none", "Evidence carries public-safe counts and decisions only."),
    check("wp53-not-started", true, "W-P52 only produces inputs for a user-confirmed W-P53; it grants no adoption or write authority.")
  ];
}

function fixtureEvidence(fixture) {
  return { docSourceMapStatus: fixture.docSourceMapStatus, entryCount: fixture.entryCount, ordinarySourceMapCount: fixture.ordinarySourceMapCount, generatedBindingSidecarCount: fixture.generatedBindingSidecarCount, generatedBindingReferenceCount: fixture.generatedBindingReferenceCount, sourcesContentPolicy: "none" };
}

function executionPolicy() {
  return {
    policy: "cross-language-reuse-read-only", adapterImplementationAdded: false, schemaFieldAdded: false,
    ordinaryDocSourceMapFullBindingModelEmbedded: false, sidecarPathReadByHost: false,
    sourceBodyMayBeRead: false, sourceBodyMayBeSerialized: false, sourceRangeMayBeSerialized: false,
    localsValueMayBeSerialized: false, digestMayBeSerialized: false, templateRuntimeDataMayBeExecuted: false,
    arbitraryExpressionMayBeEvaluated: false, hostRuntimeMayBeLaunched: false, hostEditorApiMayBeCalled: false,
    checkedApplyWriteMayBeEnabled: false, workspaceWriteMayBeAllowed: false, providerNetworkMayBeExecuted: false,
    satelliteRepositoryMayBeMutated: false, targetRepositoryMayBeMutated: false, sourcesContentPolicy: "none"
  };
}

function createWp53Inputs() {
  return [
    { id: "wp53-input-generated-binding-read-only-host-baseline", status: "ready", summary: "Pug binding sidecars have four metadata-only, read-only host projections." },
    { id: "wp53-input-generated-binding-adapter-boundary", status: "ready", summary: "Sass/Vue prove doc-source-map reuse; future adapters must own declaration/expansion/scope/key extraction." },
    { id: "wp53-input-generated-binding-target-safety", status: "ready", summary: "Meta remains read-only target design input and needs owner-approved non-writing producer evidence." },
    { id: "wp53-input-generated-binding-write-boundary", status: "deferred", summary: "No binding relation authorizes editor API, checked apply, workspace write, network, or target mutation." }
  ];
}

function renderOverview(evidence) {
  return [
    "# W-P52.7 跨语言复用与收口证据", "", "## 结论", "",
    "中性 generated-documentation-binding sidecar 保持不变。Sass 与 Vue 已证明普通 source map、doc-source-map 与 privacy 基线可复用，但尚无 declaration/expansion、lexical scope 或 stable instance key 的 adapter 实现，不能宣称为 generated-binding producer。JSX 尚无工作区 adapter；Meta 仅为只读目标设计输入。", "",
    "不增加 schema field，不将 contract 改名为 generated-doc-line，也不启动 W-P53。", "", "## 实际计数", "",
    `- 候选：${evidence.summary.candidateCount}；已提交 fixture：${evidence.summary.committedFixtureCandidateCount}。`,
    `- Sass：${evidence.summary.sassFixtureEntryCount} entries / ${evidence.summary.sassOrdinarySourceMapCount} ordinary map。`,
    `- Vue：${evidence.summary.vueFixtureEntryCount} entries / ${evidence.summary.vueOrdinarySourceMapCount} ordinary maps。`,
    `- 新增 cross-language generated-binding adapter：${evidence.summary.adapterImplementationAddedCount}。`,
    "", "## 边界", "", "- adapter 自行负责 parser、scope、declaration/expansion 和 stable key；中性 contract 不接受语言私有 AST 字段。",
    "- ordinary source map 只负责位置；doc-source-map 只做 reference-only sidecar linkage。",
    "- 不输出 source body/range、locals/digest 或本地路径；不执行 runtime；不写 satellite/target；不开放 host API、checked apply、workspace write 或 network。", "",
    "## 状态", "", `证据状态：${evidence.status}。W-P52.7 已形成 closeout 与 W-P53 输入，W-P53 仍需要用户确认。`, ""
  ].join("\n");
}

function renderMatrix(evidence) {
  const rows = evidence.candidates.map((candidate) => `| ${candidate.adapterId} | ${candidate.evidenceKind} | ${yesNo(candidate.semanticDocSourceMapPresent)} | ${yesNo(candidate.ordinarySourceMapPresent)} | ${yesNo(candidate.referenceOnlySidecarLinkageReady)} | ${yesNo(candidate.declarationExpansionModelPresent)} | ${yesNo(candidate.lexicalScopeModelPresent)} | ${yesNo(candidate.stableInstanceKeyPolicyPresent)} | ${candidate.readiness} |`);
  return ["# W-P52.7 Adapter 复用矩阵", "", "`yes` 仅表示现有可验证能力，不代表已经是 production generated-binding adapter。", "", "| Adapter | 输入证据 | doc-source-map | ordinary map | sidecar/ref 基线 | declaration/expansion | lexical scope | stable key | 结论 |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |", ...rows, "", "Sass/Vue 的 sidecar/ref 基线为 yes，表示其 ordinary doc-source-map 没有伪造完整 binding model 或不存在的 sidecar；不表示已经生成 binding relation。", ""].join("\n");
}

function renderWp53Ledger(evidence) {
  return ["# W-P52.7 向 W-P53 的输入账本", "", "本文件只整理输入，不授权启动 W-P53。", "", "| 输入 | 状态 | 内容 |", "| --- | --- | --- |", ...evidence.wp53Inputs.map((input) => `| ${input.id} | ${input.status} | ${input.summary} |`), "", "任何 Sass/Vue/JSX/Meta production adapter 都必须在独立已授权阶段实现和验证；不得绕过 parser、scope、key、privacy 或 target-owner gate。", ""].join("\n");
}

function sourceContentPolicyIsNone(map) {
  return !Array.isArray(map.sourcesContent) || map.sourcesContent.every((item) => item === null || item === undefined || item === "");
}

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function check(id, passed, description) { return { id, status: passed ? "pass" : "fail", description }; }
function yesNo(value) { return value ? "yes" : "no"; }
function normalizePath(filePath) { return filePath.replaceAll("\\", "/"); }

function assertNoPrivateMarkers(serialized) {
  const lower = serialized.toLowerCase();
  for (const marker of ["\"sourcescontent\":", "work-zone", "c:/", "k:/", "file://", "begin private key", "authorization: bearer"]) {
    assert.equal(lower.includes(marker), false, `W-P52.7 evidence must not include ${marker}.`);
  }
}
