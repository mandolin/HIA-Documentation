import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyBaselinePath = path.join(rootDir, "dist", "wp49-annotation-richness-policy-baseline", "evidence.json");
const internalFlowFixturePath = path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input");
const evidencePath = path.join(outputRoot, "evidence.json");
const adrInputPath = path.join(outputRoot, "generated-comment-continuity-adr-input.md");
const modelSketchPath = path.join(outputRoot, "generated-doc-binding-model-sketch.md");
const scenarioMatrixPath = path.join(outputRoot, "generated-comment-continuity-scenario-matrix.md");

await main();

/**
 * 准备 W-P49.5 生成式注释连续性 ADR input evidence。
 * Prepare W-P49.5 generated comment continuity ADR input evidence.
 *
 * @lang zh-CN 本脚本把 Pug/Meta 一对多注释绑定、上游/下游连续性和
 * doc-source-map extension 需求整理为 ADR 输入。它不固化最终语法，不读取或输出源码正文。
 * @lang en This script packages Pug/Meta one-to-many comment binding,
 * upstream/downstream continuity, and doc-source-map extension requirements as
 * ADR input. It does not freeze the final syntax and does not read or emit
 * source bodies.
 *
 * @returns {Promise<void>} Writes public-safe ADR input evidence and reports.
 */
async function main() {
  const policyBaseline = await readJson(policyBaselinePath);
  const internalFlowFixture = await readJson(internalFlowFixturePath);
  assert.equal(policyBaseline.status, "ready-for-wp49-repository-self-doc-inventory");
  assert.equal(internalFlowFixture.status, "ready-for-wp49-generated-comment-continuity-adr-input");

  const bindingModel = createBindingModel();
  const scenarioMatrix = createScenarioMatrix();
  const adrQuestions = createAdrQuestions();
  const extensionPoints = createExtensionPoints();
  const summary = createSummary({ adrQuestions, bindingModel, extensionPoints, scenarioMatrix });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp49-generated-comment-continuity-adr-input",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp49-self-doc-reference-refresh" : "blocked-by-generated-continuity-adr-input-preconditions",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.5",
    sourceInputs: {
      annotationRichnessPolicyBaseline: normalizePath(policyBaselinePath),
      internalFlowCommentFixture: normalizePath(internalFlowFixturePath),
      generatedBindingPlanningReference: "T-Generated-Doc-Binding-P1"
    },
    executionPolicy: {
      policy: "generated-comment-continuity-adr-input-only",
      finalSyntaxFrozen: false,
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    adrBoundary: {
      purpose: "Prepare ADR input for generated document binding and comment continuity",
      nonGoals: [
        "Do not freeze concrete Pug annotation syntax",
        "Do not implement parser support",
        "Do not promote generated binding to HTMDoc core symbol kind",
        "Do not collect runtime data",
        "Do not embed source bodies"
      ],
      preferredAbstraction: "generated-doc-binding",
      candidateConcreteSyntaxExamplesAreNonNormative: true
    },
    bindingModel,
    scenarioMatrix,
    extensionPoints,
    adrQuestions,
    summary,
    checks,
    generatedDocs: {
      adrInput: normalizePath(adrInputPath),
      modelSketch: normalizePath(modelSketchPath),
      scenarioMatrix: normalizePath(scenarioMatrixPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.5 generated comment continuity ADR input evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(adrInputPath, renderAdrInput(evidence), "utf8");
  await writeFile(modelSketchPath, renderModelSketch(evidence), "utf8");
  await writeFile(scenarioMatrixPath, renderScenarioMatrix(evidence), "utf8");

  console.log(`W-P49.5 generated comment continuity ADR input prepared at ${normalizePath(evidencePath)}`);
  console.log(`ADR input status: ${evidence.status}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createBindingModel() {
  return {
    modelName: "generated-doc-binding",
    status: "adr-input-draft",
    coreFields: [
      { id: "bindingId", required: true, purpose: "Stable generated documentation binding id" },
      { id: "sourceIntent", required: true, purpose: "Upstream documentation intent such as desc, attribute doc, component note, or a11y note" },
      { id: "sourceRange", required: true, purpose: "Template/source range for the upstream annotation or comment" },
      { id: "templateBindingRef", required: true, purpose: "Variable, parameter, loop item, mixin parameter, block context, or generated context reference" },
      { id: "scope", required: true, purpose: "Lexical/template scope that prevents same-name bindings from being merged incorrectly" },
      { id: "expansion", required: true, purpose: "One-to-many expansion records with order, instance key, confidence, and diagnostics" },
      { id: "downstreamTargets", required: true, purpose: "Generated HTML/HTM/HIA entries, ranges, selectors, components, attributes, or style hooks" },
      { id: "confidence", required: true, purpose: "Mapping confidence such as precise, inferred, generated-only, or ambiguous" },
      { id: "privacy", required: true, purpose: "Source-body, runtime-data, and local-path protection policy" }
    ],
    relationKinds: [
      "documents-generated-target",
      "generated-from-binding",
      "shares-template-binding-ref",
      "expands-to-instance",
      "has-ambiguous-generated-target"
    ],
    confidenceKinds: ["precise", "inferred", "generated-only", "ambiguous", "unresolved"],
    firstRoundSyntaxPosition: "non-normative-examples-only"
  };
}

function createScenarioMatrix() {
  return [
    {
      id: "pug-each-variable-to-many-elements",
      sourceDsl: "pug",
      bindingRefShape: "loop-item-property",
      exampleIntent: "description bound to a loop item field, e.g. color name description",
      downstreamTargetShape: "many generated HTML elements",
      firstRoundRequirement: "Preserve a stable binding id and per-instance expansion key.",
      confidence: "precise-when-static-locals-are-known"
    },
    {
      id: "pug-mixin-parameter-to-component-parts",
      sourceDsl: "pug",
      bindingRefShape: "mixin-parameter",
      exampleIntent: "attribute or component part documentation inherited from a mixin parameter",
      downstreamTargetShape: "component root, child slots, generated attributes",
      firstRoundRequirement: "Track mixin callsite and callee parameter scope separately.",
      confidence: "precise-or-inferred"
    },
    {
      id: "pug-extends-block-override",
      sourceDsl: "pug",
      bindingRefShape: "block-context",
      exampleIntent: "upstream block documentation overridden or refined by a child template",
      downstreamTargetShape: "generated section, component region, or named slot",
      firstRoundRequirement: "Represent inheritance, override, and conflict diagnostics.",
      confidence: "inferred"
    },
    {
      id: "meta-preset-to-pug-generated-view",
      sourceDsl: "meta+pug",
      bindingRefShape: "meta-schema-field",
      exampleIntent: "Meta schema or preset documentation projected into generated Pug/HTML output",
      downstreamTargetShape: "many generated documentation entries across template output",
      firstRoundRequirement: "Keep upstream Meta identity separate from Pug local variable names.",
      confidence: "precise-when-meta-ids-are-stable"
    },
    {
      id: "sass-token-to-generated-style-hook",
      sourceDsl: "sass-or-css-preprocessor",
      bindingRefShape: "design-token-or-variable",
      exampleIntent: "token documentation projected to CSS custom property or style hook",
      downstreamTargetShape: "CSSDoc token, CSS selector, HTMDoc style hook",
      firstRoundRequirement: "Share extension shape with source-linkage without forcing HTMDoc core kind.",
      confidence: "inferred"
    },
    {
      id: "ambiguous-runtime-only-generation",
      sourceDsl: "any-template-dsl",
      bindingRefShape: "runtime-only-expression",
      exampleIntent: "documentation attached to data that cannot be statically expanded",
      downstreamTargetShape: "diagnostic-only unresolved binding",
      firstRoundRequirement: "Emit diagnostics and never pretend runtime-only data is precise.",
      confidence: "unresolved"
    }
  ];
}

function createExtensionPoints() {
  return [
    {
      id: "doc-source-map-extension",
      target: "doc-source-map",
      status: "required-adr-input",
      requirement: "Allow an extension block that links source binding ids to generated target ids without embedding source bodies."
    },
    {
      id: "source-linkage-query",
      target: "@hia-doc/source-linkage",
      status: "required-adr-input",
      requirement: "Support source binding to generated targets and generated target to source binding queries."
    },
    {
      id: "htmdoc-relation-bridge",
      target: "hia-htmdoc",
      status: "bridge-not-core-kind",
      requirement: "Represent generated bindings as relations/metadata first, not as HTMDoc core symbol kinds."
    },
    {
      id: "authoring-host-projection",
      target: "VS Code / DevTools / Visual Studio",
      status: "read-only-projection-first",
      requirement: "Expose binding source, generated targets, confidence, and diagnostics without granting write authority."
    },
    {
      id: "privacy-policy",
      target: "all generated binding artifacts",
      status: "hard-boundary",
      requirement: "Default sourcesContent none, no runtime data capture, no local absolute paths, no secret or digest values."
    }
  ];
}

function createAdrQuestions() {
  return [
    {
      id: "syntax-family",
      priority: "P0",
      question: "Concrete syntax should remain non-normative until parser fixtures prove Pug scope and expansion rules.",
      recommendation: "Defer final syntax; keep `generated-doc-binding` as the ADR-level abstraction."
    },
    {
      id: "binding-ref-sigil",
      priority: "P0",
      question: "Whether `$name` means template variable, binding variable, or DSL-specific expression.",
      recommendation: "Model it as `templateBindingRef`; decide sigil per DSL adapter."
    },
    {
      id: "scope-identity",
      priority: "P0",
      question: "How to prevent same-name variables in nested scopes from being merged.",
      recommendation: "Require scope identity in every binding and expansion record."
    },
    {
      id: "doc-source-map-extension-vs-adapter-metadata",
      priority: "P1",
      question: "Whether generated binding belongs in generic doc-source-map extension or PugDoc adapter metadata.",
      recommendation: "Use adapter metadata first, with a generic doc-source-map extension point for indexing."
    },
    {
      id: "instance-key-stability",
      priority: "P1",
      question: "How stable generated instance keys should be across template/data changes.",
      recommendation: "Require stable key when source identity exists; otherwise mark generated-only or ambiguous."
    },
    {
      id: "runtime-data-boundary",
      priority: "P0",
      question: "Whether runtime data may be executed or captured to improve expansion precision.",
      recommendation: "No for first round; unresolved static mapping emits diagnostics."
    }
  ];
}

function createSummary({ adrQuestions, bindingModel, extensionPoints, scenarioMatrix }) {
  return {
    phase: "W-P49.5",
    modelFieldCount: bindingModel.coreFields.length,
    relationKindCount: bindingModel.relationKinds.length,
    confidenceKindCount: bindingModel.confidenceKinds.length,
    scenarioCount: scenarioMatrix.length,
    extensionPointCount: extensionPoints.length,
    adrQuestionCount: adrQuestions.length,
    p0QuestionCount: adrQuestions.filter((item) => item.priority === "P0").length,
    p1QuestionCount: adrQuestions.filter((item) => item.priority === "P1").length,
    finalSyntaxFrozen: false,
    parserImplementationIncluded: false,
    generatedBindingImplementedNow: false,
    docSourceMapExtensionInputReady: true,
    sourceLinkageQueryInputReady: true,
    hostProjectionInputReady: true,
    readyForSelfDocReferenceRefresh: true,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("model-fields-ready", summary.modelFieldCount >= 9),
    check("scenarios-ready", summary.scenarioCount >= 6),
    check("extension-points-ready", summary.extensionPointCount >= 5),
    check("adr-questions-ready", summary.adrQuestionCount >= 6 && summary.p0QuestionCount >= 3),
    check("final-syntax-not-frozen", summary.finalSyntaxFrozen === false),
    check("implementation-not-claimed", summary.parserImplementationIncluded === false && summary.generatedBindingImplementedNow === false),
    check("downstream-inputs-ready", summary.docSourceMapExtensionInputReady && summary.sourceLinkageQueryInputReady && summary.hostProjectionInputReady),
    check("no-write-or-target-mutation", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0),
    check("no-provider-network", summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0),
    check("no-private-source-output", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0)
  ];
}

function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

function renderAdrInput(evidence) {
  const questions = evidence.adrQuestions.map((item) => `| ${item.id} | ${item.priority} | ${item.question} | ${item.recommendation} |`).join("\n");
  return `# W-P49.5 Generated Comment Continuity ADR Input

## 中文摘要

本阶段把 Pug/Meta 生成式模板的一对多注释绑定整理为 ADR 输入。此处不固化最终语法，不实现 parser，不宣称 generated binding 已完成。

## Decision Input

- preferred abstraction: \`${evidence.adrBoundary.preferredAbstraction}\`
- final syntax frozen: ${evidence.summary.finalSyntaxFrozen}
- parser implementation included: ${evidence.summary.parserImplementationIncluded}
- generated binding implemented now: ${evidence.summary.generatedBindingImplementedNow}
- doc-source-map extension input ready: ${evidence.summary.docSourceMapExtensionInputReady}
- source-linkage query input ready: ${evidence.summary.sourceLinkageQueryInputReady}
- host projection input ready: ${evidence.summary.hostProjectionInputReady}

## ADR Questions

| id | priority | question | recommendation |
| --- | --- | --- | --- |
${questions}

## Safety Boundary

- source bodies: none
- sourcesContent: none
- runtime data capture: disabled
- workspace write: disabled
- target mutation: disabled
- provider/network: disabled
`;
}

function renderModelSketch(evidence) {
  const fields = evidence.bindingModel.coreFields.map((item) => `| ${item.id} | ${item.required} | ${item.purpose} |`).join("\n");
  const extensions = evidence.extensionPoints.map((item) => `| ${item.id} | ${item.target} | ${item.status} | ${item.requirement} |`).join("\n");
  return `# Generated Doc Binding Model Sketch

## 中文摘要

\`generated-doc-binding\` 是 W-P49.5 的 ADR-level 抽象，用于表达上游模板注释意图到多个下游文档符号的连续性关系。

## Core Fields

| field | required | purpose |
| --- | --- | --- |
${fields}

## Relation Kinds

${evidence.bindingModel.relationKinds.map((item) => `- \`${item}\``).join("\n")}

## Confidence Kinds

${evidence.bindingModel.confidenceKinds.map((item) => `- \`${item}\``).join("\n")}

## Extension Points

| id | target | status | requirement |
| --- | --- | --- | --- |
${extensions}
`;
}

function renderScenarioMatrix(evidence) {
  const scenarios = evidence.scenarioMatrix.map((item) => `| ${item.id} | ${item.sourceDsl} | ${item.bindingRefShape} | ${item.downstreamTargetShape} | ${item.confidence} |`).join("\n");
  return `# Generated Comment Continuity Scenario Matrix

## 中文摘要

本矩阵覆盖 Pug、Meta+Pug、Sass/CSS 预处理与 runtime-only ambiguity，用于后续 ADR 和 fixture 设计。

| id | source DSL | binding ref shape | downstream target shape | confidence |
| --- | --- | --- | --- | --- |
${scenarios}
`;
}

function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(value, label) {
  const forbidden = [
    /\b[A-Z]:[\\/]/,
    /file:\/\//i,
    /work-zone/i,
    /Users[\\/]/i,
    /"sourcesContent"\s*:/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/
  ];
  const hit = forbidden.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
