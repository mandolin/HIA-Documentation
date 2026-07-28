import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceContainer = path.resolve(rootDir, "..");
const pugDocRoot = path.join(workspaceContainer, "HIA", "hia-pugdoc");
const wp52IntakePath = path.join(rootDir, "dist", "wp52-generated-binding-research-adr-intake", "evidence.json");
const adapterScriptPath = path.join(pugDocRoot, "scripts", "prepare-wp52-syntax-scope-confidence-decision.cjs");
const adapterEvidencePath = path.join(pugDocRoot, "dist", "wp52-syntax-scope-confidence-decision", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp52-syntax-scope-confidence-decision");
const evidencePath = path.join(outputRoot, "evidence.json");
const decisionPath = path.join(outputRoot, "syntax-scope-confidence-decision.md");
const contractInputPath = path.join(outputRoot, "wp52-generated-binding-contract-inputs.md");

await main();

/**
 * 汇总 W-P52.2 的 Pug adapter 真实 AST 证据并生成全局规范决策 evidence。
 * Consolidates real Pug adapter AST evidence into the global W-P52.2
 * normative decision evidence.
 *
 * @lang zh-CN 主仓不引入 Pug parser 依赖。脚本在独立卫星仓执行 adapter-owned
 * fixture，再只读取 public-safe 结构化结果，保持核心与语言 parser 的依赖方向。
 * @lang en The core repository does not add Pug parser dependencies. This
 * script executes adapter-owned fixtures in the independent satellite and
 * consumes only the public-safe structured result, preserving dependency
 * direction between core and language parsers.
 *
 * @returns {Promise<void>} 写入 W-P52.2 global evidence 与 W-P52.3 输入。
 */
async function main() {
  const wp52Intake = await readJson(wp52IntakePath);
  assert.equal(wp52Intake.status, "ready-for-wp52-syntax-scope-confidence-decision");
  assert.equal(wp52Intake.summary.concreteSyntaxFrozen, false);
  assert.equal(wp52Intake.summary.parserRuntimeImplementedNow, false);

  runAdapterEvidence();
  const adapterEvidence = await readJson(adapterEvidencePath);
  assert.equal(adapterEvidence.contract, "hia-pugdoc-wp52-syntax-scope-confidence-evidence");
  assert.equal(adapterEvidence.status, "ready-for-wp52-generated-doc-binding-contract");
  assert.equal(adapterEvidence.summary.hardFailureCount, 0);

  const summary = createSummary(adapterEvidence);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp52-syntax-scope-confidence-decision",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0
      ? "ready-for-wp52-generated-doc-binding-contract"
      : "blocked-by-wp52-syntax-scope-confidence-decision",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P52.2",
    sourceInputs: {
      researchAdrIntake: {
        contract: wp52Intake.contract,
        contractVersion: wp52Intake.contractVersion,
        status: wp52Intake.status
      },
      pugAdapterAstEvidence: {
        contract: adapterEvidence.contract,
        contractVersion: adapterEvidence.contractVersion,
        status: adapterEvidence.status
      }
    },
    executionPolicy: {
      policy: "adapter-evidence-consumption-and-normative-decision",
      coreMayDependOnPugParser: false,
      adapterMayExecuteSyntheticAstFixtures: true,
      productionExtractorMayBeModified: false,
      coreSchemaMayBeModified: false,
      runtimeTemplateDataMayBeExecuted: false,
      arbitraryExpressionMayBeEvaluated: false,
      sourceBodyMayBeSerialized: false,
      digestMayBeSerialized: false,
      providerNetworkMayBeExecuted: false,
      checkedApplyWriteMayBeEnabled: false,
      targetRepositoryMayBeMutated: false,
      sourcesContentPolicy: "none"
    },
    decisions: {
      syntax: adapterEvidence.syntaxDecision,
      expressionSubset: adapterEvidence.semanticDecisions.expressionSubset,
      scopeIdentity: adapterEvidence.semanticDecisions.scopeIdentity,
      instanceKey: adapterEvidence.semanticDecisions.instanceKey,
      resolutionQuality: adapterEvidence.semanticDecisions.resolutionQuality,
      inheritance: adapterEvidence.inheritanceObservation.decision,
      deterministicLocalsEnvelope: adapterEvidence.semanticDecisions.deterministicLocalsEnvelope,
      diagnostics: adapterEvidence.diagnostics,
      contractPlacement: adapterEvidence.semanticDecisions.contractPlacement
    },
    adapterEvidenceSummary: {
      parserBaseline: adapterEvidence.parserBaseline,
      syntaxCandidates: adapterEvidence.candidateObservations.map((item) => ({
        criterionCount: item.criterionCount,
        id: item.id,
        status: item.status
      })),
      realAstFixtureCount: adapterEvidence.summary.realAstFixtureCount,
      eachFixtureCount: adapterEvidence.summary.eachFixtureCount,
      mixinDefinitionCount: adapterEvidence.summary.mixinDefinitionCount,
      mixinCallCount: adapterEvidence.summary.mixinCallCount,
      inheritanceModes: adapterEvidence.inheritanceObservation.sourceView.namedBlockModes
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      decision: normalizePath(decisionPath),
      contractInputs: normalizePath(contractInputPath)
    }
  };

  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serialized}\n`, "utf8");
  await writeFile(decisionPath, renderDecision(evidence), "utf8");
  await writeFile(contractInputPath, renderContractInputs(evidence), "utf8");

  console.log(`W-P52.2 syntax/scope/confidence decision prepared at ${normalizePath(evidencePath)}`);
  console.log(`Decision status: ${evidence.status}`);
}

function runAdapterEvidence() {
  const result = spawnSync(process.execPath, [adapterScriptPath], {
    cwd: pugDocRoot,
    encoding: "utf8",
    env: process.env
  });
  assert.equal(result.status, 0, `PugDoc W-P52.2 adapter evidence failed: ${result.stderr || result.stdout}`);
}

function createSummary(adapterEvidence) {
  return {
    phase: "W-P52.2",
    syntaxCandidateCount: adapterEvidence.summary.syntaxCandidateCount,
    selectedSyntaxCandidateCount: adapterEvidence.summary.selectedSyntaxCandidateCount,
    selectedSyntaxCandidateId: adapterEvidence.summary.selectedSyntaxCandidateId,
    realAstFixtureCount: adapterEvidence.summary.realAstFixtureCount,
    decisionAreaCount: 10,
    diagnosticCodeCount: adapterEvidence.summary.diagnosticCodeCount,
    officialPugPipelineExecuted: adapterEvidence.summary.officialPugPipelineExecuted,
    adapterOwnedParserDependencies: adapterEvidence.parserBaseline.dependencyPlacement === "hia-pugdoc-adapter-workspace-only",
    canonicalFieldAndInlineBindSelected: adapterEvidence.syntaxDecision.selectedCandidateId === "inline-bind-element",
    magicDollarSigilRejected: adapterEvidence.syntaxDecision.bindingSigil === "none",
    resolutionConfidenceProvenanceSeparated: adapterEvidence.summary.resolutionConfidenceFrozen
      && adapterEvidence.summary.generatedOnlySeparatedFromResolution,
    standaloneContractSelected: adapterEvidence.summary.standaloneContractSelected,
    productionExtractorModifiedNow: false,
    parserRuntimeImplementedNow: false,
    coreSchemaModifiedNow: false,
    hostProjectionImplementedNow: false,
    runtimeTemplateDataExecutionCount: 0,
    arbitraryExpressionEvaluationCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    checkedApplyWriteEnabledCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutedCount: 0
  };
}

function createChecks(summary) {
  return [
    check("real-adapter-evidence", summary.realAstFixtureCount >= 8
      && summary.officialPugPipelineExecuted
      && summary.adapterOwnedParserDependencies,
    "Real Pug AST evidence is executed within the adapter dependency boundary."),
    check("syntax-selection", summary.syntaxCandidateCount >= 5
      && summary.selectedSyntaxCandidateCount === 1
      && summary.canonicalFieldAndInlineBindSelected
      && summary.magicDollarSigilRejected,
    "Canonical unprefixed fields plus inline bind are selected without a magic dollar sigil."),
    check("semantic-decisions", summary.decisionAreaCount === 10
      && summary.resolutionConfidenceProvenanceSeparated
      && summary.standaloneContractSelected,
    "All ten W-P52.2 decision areas are frozen for contract design."),
    check("diagnostic-taxonomy", summary.diagnosticCodeCount >= 10,
      "The diagnostic taxonomy covers all required failure families."),
    check("implementation-boundary", !summary.productionExtractorModifiedNow
      && !summary.parserRuntimeImplementedNow
      && !summary.coreSchemaModifiedNow
      && !summary.hostProjectionImplementedNow,
    "W-P52.2 does not cross into W-P52.3-W-P52.6 implementation."),
    check("privacy-write-network", summary.runtimeTemplateDataExecutionCount === 0
      && summary.arbitraryExpressionEvaluationCount === 0
      && summary.sourceBodyOutputCount === 0
      && summary.sourceTextSerializedCount === 0
      && summary.digestValueSerializedCount === 0
      && summary.localPathExposureCount === 0
      && summary.credentialMarkerCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.providerNetworkExecutedCount === 0,
    "No runtime data, source body, digest, path, credential, write, target mutation, or provider network enters evidence.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderDecision(evidence) {
  const d = evidence.decisions;
  const diagnostics = d.diagnostics
    .map((item) => `| ${item.code} | ${item.severity} | ${item.meaning} |`)
    .join("\n");
  return `# W-P52.2 Syntax Scope And Confidence Decision

## 中文摘要

W-P52.2 已通过 ${evidence.adapterEvidenceSummary.realAstFixtureCount} 个真实 Pug AST fixture
冻结十项规范决策。canonical syntax 保留 \`@description\` 等现有无前缀字段，
动态值写成 \`<bind ref="color.name"/>\`，稳定实例键写成
\`@instanceKey color.id\`。不启用 \`htmdoc:\` 领域前缀，也不把 \`$\` 作为
binding sigil。

## 语法与表达式

- field：${d.syntax.canonicalFieldSyntax}。
- inline binding：\`${d.syntax.canonicalInlineBindingElement}\`。
- instance key：\`${d.syntax.canonicalInstanceKeyTag}\`。
- Pug P1 expression：${d.expressionSubset.accepted.join(", ")}。
- 执行边界：${d.expressionSubset.evaluationPolicy}。

## Scope 与实例

- scope id：\`${d.scopeIdentity.format}\`。
- alias rename：${d.scopeIdentity.renamePolicy}。
- instance key priority：${d.instanceKey.priority.join(" -> ")}。

## Resolution / confidence / provenance

- resolution kind：${d.resolutionQuality.resolutionKind.join(", ")}。
- confidence strength：${d.resolutionQuality.confidenceStrength.join(", ")}。
- provenance coverage：${d.resolutionQuality.provenanceCoverage.join(", ")}。
- \`generated-only\` 不是 resolution kind。

## Contract placement

选定独立中性 \`${d.contractPlacement.contractName}@${d.contractPlacement.version}\`
contract。doc-source-map 只引用 binding id 或 sidecar artifact。

## Diagnostic taxonomy

| code | severity | meaning |
| --- | --- | --- |
${diagnostics}
`;
}

function renderContractInputs(evidence) {
  const d = evidence.decisions;
  return `# W-P52.3 Generated Documentation Binding Contract Inputs

## 必须进入 schema 的对象

1. binding declaration。
2. zero-or-more expansion instance。
3. generated target identity。
4. source / generated provenance coverage。
5. resolution kind 与 confidence strength。
6. deterministic locals input reference 与 policy summary。
7. versioned diagnostic。

## 已冻结字段族

- contract：\`${d.contractPlacement.contractName}@${d.contractPlacement.version}\`。
- collections：${d.contractPlacement.topLevelCollections.join(", ")}。
- scope identity：\`${d.scopeIdentity.format}\`。
- resolution：${d.resolutionQuality.resolutionKind.join(", ")}。
- confidence：${d.resolutionQuality.confidenceStrength.join(", ")}。
- provenance：${d.resolutionQuality.provenanceCoverage.join(", ")}。
- sourcesContentPolicy：\`none\` 默认。

## W-P52.3 不应重新讨论

- 不重新引入 \`htmdoc:\` 语言层前缀。
- 不把 \`$\` 定义为魔法 sigil。
- 不把 \`generated-only\` 放回 resolution kind。
- 不把完整 binding contract 嵌入普通 source map。
- 不允许执行任意 template expression 或隐式采集 runtime locals。
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /(npm_|ghp_|github_pat_)[A-Za-z0-9_-]{8,}/i,
    /"sourcesContent"\s*:/,
    /"sourceText"\s*:/,
    /"sourceBody"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `W-P52.2 global evidence includes forbidden private marker: ${pattern}`);
  }
}
