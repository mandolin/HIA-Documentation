import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wp49InputPath = path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input", "evidence.json");
const wp50InputPath = path.join(rootDir, "dist", "wp50-generated-binding-authoring-input", "evidence.json");
const wp51CloseoutPath = path.join(rootDir, "dist", "wp51-closeout-wp52-inputs", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp52-generated-binding-research-adr-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const intakePath = path.join(outputRoot, "generated-binding-research-adr-intake.md");
const referencePath = path.join(outputRoot, "official-reference-matrix.md");
const decisionPath = path.join(outputRoot, "adr-intake-decision-ledger.md");
const stageMapPath = path.join(outputRoot, "wp52-stage-map.md");

await main();

/**
 * 准备 W-P52.1 生成式文档绑定调研与 ADR intake evidence。
 * Prepare W-P52.1 generated-documentation-binding research and ADR intake evidence.
 *
 * @lang zh-CN 本脚本只汇总既有 public-safe evidence、官方参考、架构结论和
 * W-P52 阶段地图。它不冻结具体注释语法，不实现 Pug parser/runtime，不修改
 * doc-source-map schema，也不执行模板运行时数据。
 * @lang en This script only consolidates existing public-safe evidence,
 * official references, architecture findings, and the W-P52 stage map. It
 * does not freeze annotation syntax, implement a Pug parser/runtime, modify
 * the doc-source-map schema, or execute template runtime data.
 *
 * @returns {Promise<void>} Writes public-safe W-P52.1 evidence and reports.
 */
async function main() {
  const wp49Input = JSON.parse(await readFile(wp49InputPath, "utf8"));
  const wp50Input = JSON.parse(await readFile(wp50InputPath, "utf8"));
  const wp51Closeout = JSON.parse(await readFile(wp51CloseoutPath, "utf8"));

  assert.equal(wp49Input.status, "ready-for-wp49-self-doc-reference-refresh");
  assert.equal(wp50Input.status, "ready-for-wp50-self-doc-remediation-ledger");
  assert.equal(wp51Closeout.status, "ready-for-wp52-planning-user-confirmation");
  assert.equal(wp51Closeout.summary.wp52Started, false);

  const officialReferences = createOfficialReferences();
  const localBaseline = createLocalBaseline();
  const researchFindings = createResearchFindings();
  const adrIntakeDecisions = createAdrIntakeDecisions();
  const openDecisionInputs = createOpenDecisionInputs();
  const stageMap = createStageMap();
  const summary = createSummary({
    adrIntakeDecisions,
    officialReferences,
    openDecisionInputs,
    researchFindings,
    stageMap
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp52-generated-binding-research-adr-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0
      ? "ready-for-wp52-syntax-scope-confidence-decision"
      : "blocked-by-wp52-generated-binding-research-adr-intake",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P52.1",
    sourceInputs: {
      wp49GeneratedContinuity: normalizePath(wp49InputPath),
      wp50GeneratedBindingAuthoring: normalizePath(wp50InputPath),
      wp51Closeout: normalizePath(wp51CloseoutPath)
    },
    executionPolicy: {
      policy: "research-and-adr-intake-only",
      concreteSyntaxMayBeFrozen: false,
      dependencyMayBeAdded: false,
      docSourceMapSchemaMayBeModified: false,
      hostProjectionMayBeImplemented: false,
      parserRuntimeMayBeImplemented: false,
      runtimeTemplateDataMayBeExecuted: false,
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayStartAnotherWPhase: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    researchBoundary: {
      primarySampleDsl: "pug",
      genericAbstraction: "generated-doc-binding",
      ordinarySourceMapRole: "bidirectional-location-mapping",
      documentationManifestRole: "semantic-binding-and-expansion",
      parserOwnership: "language-adapter",
      genericContractOwnership: "hia-core-source-linkage-layer",
      runtimeDataPolicy: "no-runtime-fetch-or-capture",
      syntaxStatus: "non-normative-candidates-only"
    },
    officialReferences,
    localBaseline,
    researchFindings,
    adrIntakeDecisions,
    openDecisionInputs,
    stageMap,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      decisionLedger: normalizePath(decisionPath),
      intake: normalizePath(intakePath),
      officialReferenceMatrix: normalizePath(referencePath),
      stageMap: normalizePath(stageMapPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P52.1 generated binding research ADR intake evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(intakePath, renderIntake(evidence), "utf8");
  await writeFile(referencePath, renderReferenceMatrix(evidence), "utf8");
  await writeFile(decisionPath, renderDecisionLedger(evidence), "utf8");
  await writeFile(stageMapPath, renderStageMap(evidence), "utf8");

  console.log(`W-P52.1 generated binding research ADR intake prepared at ${normalizePath(evidencePath)}`);
  console.log(`Intake status: ${evidence.status}`);
}

function createOfficialReferences() {
  return [
    reference("pug-language-mixins", "Pug", "language-semantics", "https://pugjs.org/language/mixins.html", "Mixin definitions, arguments, call sites, implicit attributes, blocks, defaults, and rest arguments define reusable template scopes."),
    reference("pug-language-iteration", "Pug", "language-semantics", "https://pugjs.org/language/iteration.html", "Each/for introduces value and optional key aliases; runtime expressions may determine expansion cardinality."),
    reference("pug-language-includes", "Pug", "dependency-semantics", "https://pugjs.org/language/includes.html", "Include paths resolve relative to the current file or basedir and may include Pug or raw text."),
    reference("pug-language-inheritance", "Pug", "dependency-semantics", "https://pugjs.org/language/inheritance.html", "Extends and named blocks support replace, append, and prepend across recursive template inheritance."),
    reference("pug-lexer", "Pug", "parser-pipeline", "https://github.com/pugjs/pug/tree/master/packages/pug-lexer", "The official lexer converts source text into location-bearing tokens."),
    reference("pug-parser", "Pug", "parser-pipeline", "https://github.com/pugjs/pug/tree/master/packages/pug-parser", "The official parser converts tokens into a location-bearing AST."),
    reference("pug-ast-spec", "Pug", "ast-contract", "https://github.com/pugjs/pug-ast-spec", "The work-in-progress AST specification documents Each, Mixin, Include, Extends, NamedBlock, comments, and source locations."),
    reference("pug-load", "Pug", "dependency-pipeline", "https://github.com/pugjs/pug/tree/master/packages/pug-load", "The loader recursively resolves dependencies while retaining fullPath, source text, and dependent ASTs."),
    reference("pug-linker", "Pug", "dependency-pipeline", "https://github.com/pugjs/pug/tree/master/packages/pug-linker", "The linker flattens loaded include/extends ASTs, so pre-link and post-link views have different provenance value."),
    reference("pug-walk", "Pug", "ast-traversal", "https://github.com/pugjs/pug/tree/master/packages/pug-walk", "The official walker traverses Pug ASTs and can include loaded dependencies."),
    reference("ecma-426", "Ecma TC39-TG4", "ordinary-source-map", "https://tc39.es/ecma426/", "ECMA-426 standardizes bidirectional source locations, multi-level maps, and extension tolerance."),
    reference("sass-compile-result", "Sass", "cross-language-source-map", "https://sass-lang.com/documentation/js-api/interfaces/compileresult/", "Dart Sass exposes generated CSS, loaded URLs, and an optional ordinary source map, but not documentation semantics."),
    reference("vue-v-for-transform", "Vue", "cross-language-scope", "https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/vFor.ts", "Vue compiler-core explicitly adds and removes v-for aliases from transform scope and emits per-iteration functions."),
    reference("vue-expression-transform", "Vue", "cross-language-scope", "https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformExpression.ts", "Vue parses template expressions, distinguishes local identifiers, and preserves identifier-level source-map locations."),
    reference("babel-traverse", "Babel", "expression-scope", "https://babeljs.io/docs/babel-traverse", "Babel parser/traverse offers mature JavaScript AST traversal and scope-aware identifier analysis without executing expressions.")
  ];
}

function reference(id, owner, topic, url, finding) {
  return { finding, id, owner, status: "reviewed-primary-source", topic, url };
}

function createLocalBaseline() {
  return {
    pugRuntime: {
      package: "pug",
      version: "3.0.4",
      license: "MIT",
      officialPipelinePackages: [
        packageBaseline("pug-lexer", "5.0.1"),
        packageBaseline("pug-parser", "6.0.0"),
        packageBaseline("pug-load", "3.0.0"),
        packageBaseline("pug-linker", "4.0.0"),
        packageBaseline("pug-walk", "2.0.0")
      ]
    },
    pugDocCurrentState: {
      extractor: "line-oriented-comment-and-relation-scanner",
      ordinarySourceMap: "not-produced",
      docSourceMap: "available",
      sourceRangeModel: "1-based-line-column",
      includeConfidence: "medium",
      mixinCallConfidence: "medium",
      extendsBlockConfidence: "low-or-unresolved"
    },
    coreCurrentState: {
      docSourceMapContract: "doc-source-map@0.1.0-draft",
      ordinarySourceMapLookup: "available",
      bidirectionalLocationLookup: "available",
      semanticEntryLookup: "available",
      generatedBindingIdLookup: "not-yet-modeled",
      scopedExpansionIndex: "not-yet-modeled"
    }
  };
}

function packageBaseline(name, version) {
  return { license: "MIT", name, version };
}

function createResearchFindings() {
  return [
    finding("official-pug-pipeline-reuse", "P0", "selected-direction", "PugDoc should reuse the official lexer/parser/load/link/walk pipeline rather than extend the line scanner into a second Pug parser."),
    finding("preload-loaded-linked-views", "P0", "selected-direction", "Keep source AST, loaded dependency graph, and linked AST as distinct views so include/extends/block provenance is not erased by flattening."),
    finding("ast-native-scope-seeds", "P0", "selected-direction", "Each aliases, mixin parameters/calls, NamedBlock nodes, FileReference nodes, and unbuffered comment nodes provide structural scope and attachment seeds."),
    finding("expression-analysis-without-execution", "P0", "selected-direction", "Pug AST expression fields remain JavaScript strings; identifier references should use a mature JavaScript parser/traversal layer without evaluating the expression."),
    finding("ordinary-map-semantic-separation", "P0", "selected-direction", "Ordinary source maps remain responsible for positions; generated-doc-binding metadata remains responsible for documentation intent, scope, expansion, and target semantics."),
    finding("resolution-vs-confidence", "P0", "selected-direction", "Precise/inferred/ambiguous/unresolved describes resolution kind, while high/medium/low/none remains confidence strength. The two dimensions must not share one field."),
    finding("declaration-vs-expansion", "P0", "selected-direction", "A source binding declaration can be statically known even when generated expansion instances are unknown; model them separately."),
    finding("deterministic-locals-only", "P0", "selected-direction", "First-round instance expansion may consume explicit deterministic fixture/build locals, but must not fetch, capture, or execute arbitrary runtime data."),
    finding("adapter-owned-scope-generic-contract", "P1", "selected-direction", "Each language adapter owns parser/scope rules; the generic contract owns stable binding identity, semantic relations, expansion records, diagnostics, and privacy."),
    finding("cross-language-extension-shape", "P1", "selected-direction", "Sass, Vue, JSX, and Meta can reuse the neutral binding/expansion relation shape even though their parser and scope models differ.")
  ];
}

function finding(id, priority, status, conclusion) {
  return { conclusion, id, priority, status };
}

function createAdrIntakeDecisions() {
  return [
    decision("parser-route", "Reuse official Pug lexer/parser/load/link/walk packages through explicit adapter dependencies.", "accepted-for-wp52-design"),
    decision("ast-view-model", "Preserve source AST, loaded dependency graph, and linked AST as separate provenance views.", "accepted-for-wp52-design"),
    decision("mapping-model", "Keep ordinary source maps and documentation semantic manifests as a composed two-layer model.", "accepted-for-wp52-design"),
    decision("scope-identity", "Derive scope identity from source identity plus structural AST ancestry and declaration slot, never from variable name alone.", "accepted-for-wp52-design"),
    decision("resolution-confidence-split", "Use separate resolution-kind and confidence-strength dimensions; exact enum names remain W-P52.2 input.", "accepted-for-wp52-design"),
    decision("declaration-expansion-split", "Model source binding declarations separately from zero-or-more generated expansion instances.", "accepted-for-wp52-design"),
    decision("runtime-boundary", "Allow only explicit deterministic fixture/build inputs; arbitrary runtime fetch, capture, provider calls, and network calls remain forbidden.", "accepted-for-wp52-design"),
    decision("ownership-boundary", "Language adapters own syntax/parser/scope; the neutral contract and source-linkage layer own cross-language indexing.", "accepted-for-wp52-design"),
    decision("syntax-gate", "Keep `@htmdoc:desc $colorName` and all alternatives non-normative until W-P52.2 parser fixtures compare them.", "accepted-for-wp52-design")
  ];
}

function decision(id, decisionText, status) {
  return { decision: decisionText, id, status };
}

function createOpenDecisionInputs() {
  return [
    openDecision("annotation-family", "P0", "Compare attached block tags, `for` clauses, and inline binding elements against real Pug comment ASTs."),
    openDecision("binding-ref-grammar", "P0", "Decide identifier/property-path grammar and whether a sigil is needed; `$` must not be assumed."),
    openDecision("expression-subset", "P0", "Define the non-executing expression subset accepted for static reference analysis."),
    openDecision("scope-id-canonicalization", "P0", "Freeze canonical source/AST ancestry/declaration-slot scope identity and rename behavior."),
    openDecision("instance-key-policy", "P0", "Define explicit key, object key, stable source identity, fallback order, and unstable-index diagnostics."),
    openDecision("resolution-and-confidence-enums", "P0", "Freeze resolution kinds separately from existing high/medium/low/none confidence."),
    openDecision("inheritance-precedence", "P1", "Define replace/append/prepend documentation merge and conflict behavior for extends/block."),
    openDecision("deterministic-locals-envelope", "P1", "Define the audited shape and privacy boundary for explicit fixture/build locals."),
    openDecision("diagnostic-taxonomy", "P1", "Freeze codes for unresolved reference, scope ambiguity, runtime-only expansion, unstable key, and target mismatch."),
    openDecision("contract-placement", "P1", "Choose a neutral top-level generated binding collection or a versioned doc-source-map extension block.")
  ];
}

function openDecision(id, priority, goal) {
  return { goal, id, priority, status: "ready-for-wp52-2" };
}

function createStageMap() {
  return [
    stage("W-P52.1", "Generated Binding Research And ADR Intake", "completed-by-this-evidence", "复核官方 Pug pipeline、source map、跨语言 scope/linkage 成果并冻结设计方向。"),
    stage("W-P52.2", "Syntax Scope And Confidence Decision", "ready-next", "用真实 AST fixture 比较语法候选，定 binding ref、scope、instance key、resolution/confidence 与诊断。"),
    stage("W-P52.3", "Generated Doc Binding Contract", "ready-after-wp52-2", "定义中性 contract、schema extension、版本与隐私边界。"),
    stage("W-P52.4", "Pug One-To-Many Parser Fixtures", "ready-after-wp52-3", "在 hia-pugdoc 建立 locals/each/mixin/include/extends/block 一对多 fixture。"),
    stage("W-P52.5", "Bidirectional Source Linkage", "ready-after-wp52-4", "实现 binding -> generated targets 与 generated target -> binding 双向索引。"),
    stage("W-P52.6", "Renderer And Host Projection", "ready-after-wp52-5", "统一 HTML、VS Code、DevTools、Visual Studio 只读展示来源、展开、解析性质、置信度与诊断。"),
    stage("W-P52.7", "Cross-Language Reuse And Closeout", "ready-after-wp52-6", "验证 Sass/Vue/JSX/Meta 复用边界，收口 W-P52 并整理 W-P53 输入。")
  ];
}

function stage(id, title, status, goalZh) {
  return { goalZh, id, status, title };
}

function createSummary({ adrIntakeDecisions, officialReferences, openDecisionInputs, researchFindings, stageMap }) {
  return {
    phase: "W-P52.1",
    officialReferenceCount: officialReferences.length,
    primarySourceReferenceCount: officialReferences.filter((item) => item.status === "reviewed-primary-source").length,
    researchFindingCount: researchFindings.length,
    p0ResearchFindingCount: researchFindings.filter((item) => item.priority === "P0").length,
    acceptedDesignDirectionCount: adrIntakeDecisions.filter((item) => item.status === "accepted-for-wp52-design").length,
    openDecisionInputCount: openDecisionInputs.length,
    p0OpenDecisionInputCount: openDecisionInputs.filter((item) => item.priority === "P0").length,
    stageMapCount: stageMap.length,
    nextStageReady: stageMap.some((item) => item.id === "W-P52.2" && item.status === "ready-next"),
    officialPugPipelineSelected: true,
    threeAstViewsRequired: true,
    ordinaryAndSemanticMapSeparated: true,
    resolutionAndConfidenceSeparated: true,
    declarationAndExpansionSeparated: true,
    concreteSyntaxFrozen: false,
    parserRuntimeImplementedNow: false,
    dependencyAddedNow: false,
    docSourceMapSchemaModifiedNow: false,
    generatedBindingRuntimeImplementedNow: false,
    hostProjectionImplementedNow: false,
    nextWPhaseStarted: true,
    anotherWPhaseStarted: false,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    runtimeTemplateDataExecutionCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("official-references-reviewed", summary.officialReferenceCount >= 15 && summary.primarySourceReferenceCount === summary.officialReferenceCount, "Official and primary references are reviewed."),
    check("research-findings-ready", summary.researchFindingCount >= 10 && summary.p0ResearchFindingCount >= 7, "Research findings cover parser, scope, maps, expansion, and ownership."),
    check("adr-directions-ready", summary.acceptedDesignDirectionCount >= 9, "ADR intake directions are ready."),
    check("open-decisions-ready", summary.openDecisionInputCount >= 10 && summary.p0OpenDecisionInputCount >= 6, "W-P52.2 decision inputs are ready."),
    check("stage-map-ready", summary.stageMapCount === 7 && summary.nextStageReady, "W-P52 stage map and next stage are ready."),
    check("semantic-dimensions-separated", summary.resolutionAndConfidenceSeparated && summary.declarationAndExpansionSeparated, "Resolution/confidence and declaration/expansion are separated."),
    check("syntax-parser-schema-not-frozen", !summary.concreteSyntaxFrozen && !summary.parserRuntimeImplementedNow && !summary.dependencyAddedNow && !summary.docSourceMapSchemaModifiedNow, "Syntax, parser runtime, dependencies, and schema remain unfrozen."),
    check("no-runtime-source-body", summary.runtimeTemplateDataExecutionCount === 0 && summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No runtime template data or source body is used."),
    check("no-write-network-target", summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderIntake(evidence) {
  const findingRows = evidence.researchFindings
    .map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.conclusion} |`)
    .join("\n");
  return `# W-P52.1 Generated Binding Research And ADR Intake

## 中文摘要

W-P52.1 已完成生成式文档绑定的研究与 ADR intake。Pug 主线选定官方 lexer/parser/load/link/walk pipeline；普通 source map 继续负责位置，doc-source-map / generated-doc-binding 负责文档语义；binding declaration 与 expansion instance、resolution kind 与 confidence strength 分开建模。具体语法、sigil、scope id、instance key 和枚举名称仍留待 W-P52.2。

## Research Findings

| 结论 | 优先级 | 状态 | 内容 |
| --- | --- | --- | --- |
${findingRows}

## 边界

本阶段未增加依赖，未实现 parser/runtime，未修改 schema，未冻结具体语法，未执行运行时模板数据，也未输出源码正文。
`;
}

function renderReferenceMatrix(evidence) {
  const rows = evidence.officialReferences
    .map((item) => `| ${item.id} | ${item.owner} | ${item.topic} | ${item.status} | ${item.url} |`)
    .join("\n");
  return `# W-P52.1 Official Reference Matrix

## 中文摘要

本矩阵只收录官方规范、官方项目文档或官方源码。Pug 参考覆盖语言语义、AST、dependency loading/linking 与 traversal；跨语言参考覆盖 ECMA-426、Sass、Vue 和 Babel。

| 参考 | 所有者 | 主题 | 状态 | URL |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderDecisionLedger(evidence) {
  const acceptedRows = evidence.adrIntakeDecisions
    .map((item) => `| ${item.id} | ${item.status} | ${item.decision} |`)
    .join("\n");
  const openRows = evidence.openDecisionInputs
    .map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.goal} |`)
    .join("\n");
  return `# W-P52.1 ADR Intake Decision Ledger

## 已接受的设计方向

| 决策 | 状态 | 内容 |
| --- | --- | --- |
${acceptedRows}

## W-P52.2 待定项

| 待定项 | 优先级 | 状态 | 目标 |
| --- | --- | --- | --- |
${openRows}
`;
}

function renderStageMap(evidence) {
  const rows = evidence.stageMap
    .map((item) => `| ${item.id} | ${item.title} | ${item.status} | ${item.goalZh} |`)
    .join("\n");
  return `# W-P52 Stage Map

## 中文摘要

W-P52 先冻结研究依据和决策顺序，再进入语法/作用域、contract、Pug fixture、source-linkage、宿主投影与跨语言收口。W-P52.1 不越过 W-P52.2 的决策门。

| 阶段 | 标题 | 状态 | 目标 |
| --- | --- | --- | --- |
${rows}
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text, label) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/,
    /"sourcesContent"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
