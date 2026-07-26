import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp49-annotation-richness-policy-baseline");
const evidencePath = path.join(outputRoot, "evidence.json");
const policyPath = path.join(outputRoot, "annotation-richness-policy-baseline.md");
const nodeBlockRequirementsPath = path.join(outputRoot, "node-and-block-comment-requirements.md");
const continuityPath = path.join(outputRoot, "generated-upstream-downstream-comment-continuity.md");
const nextInputsPath = path.join(outputRoot, "wp49-next-stage-inputs.md");

await main();

/**
 * 生成 W-P49.1 注释丰富度策略基线 evidence。
 * Generate W-P49.1 annotation-richness policy baseline evidence.
 *
 * @lang zh-CN 本脚本只冻结策略和后续盘点输入：它不扫描私有目标仓库，不读取源码正文，
 * 不修改目标项目，也不宣称历史代码注释已经补齐。输出用于 W-P49.2 开始做仓库自文档化盘点。
 * @lang en This script freezes the policy and next inventory inputs only. It
 * does not scan private target repositories, read source bodies, mutate target
 * projects, or claim that historical code comments are already complete. The
 * output feeds the W-P49.2 repository self-documentation inventory.
 *
 * @returns {Promise<void>} Writes public-safe W-P49.1 evidence and reports.
 */
async function main() {
  const policy = createPolicy();
  const nextInputs = createNextInputs(policy);
  const summary = summarize(policy, nextInputs);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P49.1 policy baseline has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp49-annotation-richness-policy-baseline",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp49-repository-self-doc-inventory",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.1",
    sourceInputs: {
      wp48FinalCloseout: "wp48-final-closeout-next-cycle-inputs",
      userAnnotationRichnessPrinciples: "2026-07-26-maintainer-confirmed-node-block-bilingual-continuity-principles",
      generatedPugMappingReference: "HIA-MicroFront-Sys meta/Pug/HTM pipeline analysis, section concept: generated Pug one-to-many mapping"
    },
    executionPolicy: {
      policy: "policy-baseline-and-inventory-inputs-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimHistoricalCommentCoverageComplete: false,
      mayClaimGeneratedBindingImplemented: false,
      sourcesContentPolicy: "none"
    },
    policy,
    nextInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      continuity: normalizePath(continuityPath),
      nextInputs: normalizePath(nextInputsPath),
      nodeBlockRequirements: normalizePath(nodeBlockRequirementsPath),
      policy: normalizePath(policyPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.1 annotation-richness evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(policyPath, renderPolicy(evidence), "utf8");
  await writeFile(nodeBlockRequirementsPath, renderNodeBlockRequirements(evidence), "utf8");
  await writeFile(continuityPath, renderContinuity(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextInputs(evidence), "utf8");

  console.log(`W-P49.1 annotation richness evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Annotation richness policy baseline prepared at ${normalizePath(policyPath)}`);
  console.log(`W-P49 next-stage inputs prepared at ${normalizePath(nextInputsPath)}`);
}

/**
 * 创建本阶段冻结的注释丰富度策略。
 * Create the annotation-richness policy frozen by this stage.
 *
 * <lang><zh-CN>策略刻意区分“现在必须遵守的写作规则”和“后续要盘点/实现的机制”，
 * 避免把尚未完成的全仓 retrofit 或生成式绑定误登记为已实现。</zh-CN><en>The policy intentionally separates
 * writing rules that are effective now from mechanisms that still need inventory or implementation, so historical
 * retrofit and generated-source binding are not misclassified as complete.</en></lang>
 *
 * @returns {Record<string, unknown>} Annotation-richness policy model.
 */
function createPolicy() {
  return {
    id: "hia-annotation-richness-policy-baseline",
    version: "0.1.0-draft",
    status: "effective-for-new-and-touched-code",
    principles: [
      {
        id: "node-documentation-required",
        title: "节点必须有文档化注释",
        titleEn: "Every documentable node requires documentation comments",
        requirement: "函数、类、接口、组件、模板块、重要配置单元等可文档化节点必须具有对应生态可识别的文档化注释。",
        requirementEn: "Documentable nodes such as functions, classes, interfaces, components, template blocks, and important configuration units must have ecosystem-recognizable documentation comments.",
        appliesToNewCode: true,
        appliesToTouchedCode: true,
        historicalCoverageClaimed: false
      },
      {
        id: "internal-flow-block-comments-required",
        title: "节点内部流程块必须有足够解释",
        titleEn: "Internal flow blocks require sufficient explanatory comments",
        requirement: "节点内部存在明显分段、步骤、流程、关键分支或子流程时，每个块至少需要简短但足够解释意图的注释；关键点需要说明不变量、风险、边界或取舍。",
        requirementEn: "When a node contains clear phases, steps, flows, important branches, or subflows, each block needs at least a brief but sufficient explanatory comment; critical points need invariants, risks, boundaries, or trade-offs.",
        appliesToNewCode: true,
        appliesToTouchedCode: true,
        historicalCoverageClaimed: false
      },
      {
        id: "bilingual-lang-markers-required",
        title: "节点与内部块都必须可表达中英双语",
        titleEn: "Nodes and internal blocks must express bilingual zh/en text",
        requirement: "节点文档化注释按语言生态使用 canonical @lang / <lang> 或 XML/native marker；节点内部代码块注释使用 inline <lang> / <l> 风格的中英双语文本。",
        requirementEn: "Node documentation comments use canonical @lang / <lang> or XML/native markers according to the language ecosystem; internal code-block comments use inline <lang> / <l>-style bilingual text.",
        canonicalBlockTag: "@lang",
        canonicalInlineTag: "<lang>",
        canonicalShortInlineTag: "<l>",
        legacyCompatOnly: ["@hiaText", "@hiaBlock"],
        appliesToNewCode: true,
        appliesToTouchedCode: true,
        historicalCoverageClaimed: false
      },
      {
        id: "generated-upstream-downstream-continuity-required",
        title: "生成链必须保持上游到下游注释连续性",
        titleEn: "Generated pipelines must preserve upstream-to-downstream comment continuity",
        requirement: "生成式源必须维护上游注释到下游代码/产物注释的覆盖和映射；一对多生成时需要用 doc-source-map 或等价 artifact 说明上游语义如何投影到多个下游节点。",
        requirementEn: "Generated sources must preserve coverage and mappings from upstream comments to downstream code or artifact comments; one-to-many generation needs doc-source-map or equivalent artifacts to explain how upstream semantics project to multiple downstream nodes.",
        generatedSourceFamilies: ["Pug", "Sass", "TypeScript", "template", "Meta"],
        implementationClaimedNow: false,
        appliesToNewDesigns: true
      }
    ],
    policyNotes: {
      nodeDefinition: "可文档化节点按语言生态与 HIA profile 共同判定，不限于传统函数/类。",
      blockDefinition: "内部块以语义风险、流程分段和维护理解成本判定，不按行数机械要求。",
      firstEnforcementShape: "W-P49.2 先做盘点和 changed-scope gate，不一次性机械补齐历史注释。",
      generatedBindingShape: "生成式绑定进入 T-Generated-Doc-Binding-P1 / PugDoc 后续阶段，不在 W-P49.1 声称实现。"
    }
  };
}

function createNextInputs(policy) {
  return {
    status: "ready",
    items: [
      {
        id: "wp49-2-repository-self-doc-inventory",
        phase: "W-P49.2",
        priority: "P0",
        title: "仓库自文档化盘点",
        titleEn: "Repository self-documentation inventory",
        consumesPolicyPrinciples: policy.principles.map((item) => item.id),
        expectedOutput: "main-repo public/exported node inventory, touched-code rule matrix, historical gap ledger"
      },
      {
        id: "wp49-3-changed-scope-quality-gate",
        phase: "W-P49.3",
        priority: "P0",
        title: "变更范围注释质量门禁",
        titleEn: "Changed-scope annotation quality gate",
        consumesPolicyPrinciples: ["node-documentation-required", "internal-flow-block-comments-required", "bilingual-lang-markers-required"],
        expectedOutput: "report-only historical baseline plus hard gate for new/touched public surfaces"
      },
      {
        id: "wp49-4-generated-comment-continuity-adr-input",
        phase: "W-P49.4",
        priority: "P1",
        title: "生成链注释连续性 ADR 输入",
        titleEn: "Generated comment continuity ADR input",
        consumesPolicyPrinciples: ["generated-upstream-downstream-continuity-required"],
        expectedOutput: "Pug one-to-many mapping requirements and doc-source-map extension inputs"
      }
    ]
  };
}

function summarize(policy, nextInputs) {
  const principleIds = policy.principles.map((item) => item.id);
  return {
    phase: "W-P49.1",
    principleCount: policy.principles.length,
    nodeDocRequired: principleIds.includes("node-documentation-required"),
    internalBlockCommentRequired: principleIds.includes("internal-flow-block-comments-required"),
    nodeBilingualLangRequired: principleIds.includes("bilingual-lang-markers-required"),
    internalBlockBilingualLangRequired: principleIds.includes("bilingual-lang-markers-required"),
    upstreamDownstreamContinuityRequired: principleIds.includes("generated-upstream-downstream-continuity-required"),
    generatedPugOneToManyMappingReferenceReady: true,
    canonicalLangTag: "@lang",
    canonicalInlineLangTag: "<lang>",
    hiaTextLegacyCompatibilityOnly: true,
    nextInputCount: nextInputs.items.length,
    p0NextInputCount: nextInputs.items.filter((item) => item.priority === "P0").length,
    p1NextInputCount: nextInputs.items.filter((item) => item.priority === "P1").length,
    historicalCoverageClaimedComplete: false,
    generatedBindingImplementedNow: false,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    sourceBodyCount: 0,
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
    check("four-principles-frozen", summary.principleCount === 4),
    check("node-doc-required", summary.nodeDocRequired),
    check("internal-block-comment-required", summary.internalBlockCommentRequired),
    check("bilingual-markers-required", summary.nodeBilingualLangRequired && summary.internalBlockBilingualLangRequired),
    check("generated-continuity-required", summary.upstreamDownstreamContinuityRequired),
    check("no-historical-complete-claim", summary.historicalCoverageClaimedComplete === false),
    check("no-generated-binding-implementation-claim", summary.generatedBindingImplementedNow === false),
    check("no-write-or-target-mutation", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0),
    check("no-provider-network", summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0),
    check("no-private-source-material", summary.sourceBodyCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0),
    check("ready-for-next-inventory", summary.nextInputCount >= 3)
  ];
}

function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

function renderPolicy(evidence) {
  const rows = evidence.policy.principles.map((item) => `| \`${item.id}\` | ${item.title} | ${item.titleEn} | ${item.historicalCoverageClaimed === false || item.implementationClaimedNow === false ? "不声明历史完成" : "生效"} |`).join("\n");
  return `# W-P49.1 Annotation Richness Policy Baseline\n\n## 中文摘要\n\n本文件冻结 W-P49.1 的注释丰富度基线：节点必须有文档化注释，节点内部流程块必须有足够解释，节点与内部块都必须表达中英双语，生成式链路必须保持上游到下游的注释连续性。\n\n本阶段只建立规则和下一步盘点输入，不宣称历史代码已补齐，也不宣称生成式文档绑定已经实现。\n\n## English Summary\n\nThis file freezes the W-P49.1 annotation-richness baseline. Documentable nodes need documentation comments, internal flow blocks need sufficient explanatory comments, both node and block comments need bilingual zh/en expression, and generated pipelines need upstream-to-downstream comment continuity.\n\nThis stage only establishes the policy and next inventory inputs. It does not claim historical retrofit completion or generated-binding implementation.\n\n## Principles\n\n| ID | 中文 | English | 当前声明 |\n| --- | --- | --- | --- |\n${rows}\n\n## Canonical Markers\n\n- 节点文档化注释：\`${evidence.summary.canonicalLangTag}\` 与 \`${evidence.summary.canonicalInlineLangTag}\`，或对应语言生态的 XML/native marker。\n- 内部代码块注释：inline \`${evidence.summary.canonicalInlineLangTag}\` / \`<l>\` 风格的中英双语文本。\n- 早期 \`@hiaText/@hiaBlock\`：仅兼容输入，不用于新增代码、示例或 self-doc 建设。\n`;
}

function renderNodeBlockRequirements(evidence) {
  return `# Node And Block Comment Requirements\n\n## 中文摘要\n\nW-P49.1 将“注释充分度”从抽象口号拆成两个层级：\n\n1. 节点层：函数、类、接口、组件、模板块、重要配置单元等可文档化节点，都需要对应生态可识别的文档化注释。\n2. 内部块层：节点内部若存在清晰分段、步骤、流程、关键分支或子流程，每个块至少需要简短但足够解释意图的注释；关键点需要说明不变量、风险、边界或取舍。\n\n## English Summary\n\nW-P49.1 splits annotation sufficiency into two levels: documentable nodes and internal semantic blocks. The policy is based on semantic risk and maintenance cost, not line-count targets.\n\n## Checks\n\n- nodeDocRequired: ${evidence.summary.nodeDocRequired}\n- internalBlockCommentRequired: ${evidence.summary.internalBlockCommentRequired}\n- nodeBilingualLangRequired: ${evidence.summary.nodeBilingualLangRequired}\n- internalBlockBilingualLangRequired: ${evidence.summary.internalBlockBilingualLangRequired}\n`;
}

function renderContinuity(evidence) {
  return `# Generated Upstream Downstream Comment Continuity\n\n## 中文摘要\n\n生成式源需要把上游注释覆盖到下游代码或文档化产物。一对多生成时，单个上游变量、模板参数、mixin、block、Meta entry 或 annotation 可能投影成多个 HTM/CSS/JS 片段，因此必须通过 doc-source-map 或等价 artifact 保存“上游语义 -> 下游节点”的关系。\n\n本阶段只把该要求纳入 W-P49 后续输入，不冻结具体语法名称，也不声明实现完成。\n\n## English Summary\n\nGenerated sources need to preserve comment coverage from upstream sources to downstream code or documentation artifacts. In one-to-many generation, one upstream variable, template parameter, mixin, block, Meta entry, or annotation may project to multiple downstream HTM/CSS/JS fragments, so doc-source-map or an equivalent artifact must preserve the upstream-semantic-to-downstream-node relation.\n\n## Current Claim\n\n- generatedPugOneToManyMappingReferenceReady: ${evidence.summary.generatedPugOneToManyMappingReferenceReady}\n- generatedBindingImplementedNow: ${evidence.summary.generatedBindingImplementedNow}\n- sourcesContentPolicy: ${evidence.executionPolicy.sourcesContentPolicy}\n`;
}

function renderNextInputs(evidence) {
  const rows = evidence.nextInputs.items.map((item) => `| ${item.phase} | ${item.priority} | ${item.title} | ${item.expectedOutput} |`).join("\n");
  return `# W-P49 Next Stage Inputs\n\n## 中文摘要\n\nW-P49.1 完成后，下一步应进入仓库自文档化盘点，而不是立刻机械补全所有历史注释。\n\n| 阶段 | 优先级 | 标题 | 预期输出 |\n| --- | --- | --- | --- |\n${rows}\n\n## Safety Boundary\n\n- checked apply write: disabled\n- provider/network: disabled\n- target repository mutation: disabled\n- source bodies and sourcesContent: none\n`;
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
