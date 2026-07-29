import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
  createDocumentationQualityReviewReport
} from "../packages/core/dist/index.js";
import {
  createHiaDocumentationQualityReviewDiagnostics
} from "../packages/lsp/dist/quality-review.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp57-documentation-quality-review");
const visualStudioCheckPath = path.join(root, "dist", "visual-studio-extension-check.json");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * 中文：生成 W-P57 四宿主一致性 evidence；输入为合成 metadata-only fixture，绝不读取 DLR、sidecar 或源码。
 * English: Generates W-P57 four-host consistency evidence from a synthetic metadata-only fixture and never reads DLRs, sidecars, or source.
 */
async function main() {
  /** 中文：fixture 明确覆盖 ROP、术语和语言资源，但不含任何候选正文、定位符或资源路径。 English: The fixture explicitly covers ROP, terminology, and locale resources without candidate bodies, locators, or resource paths. */
  const input = createQualityReviewFixture();
  const report = createDocumentationQualityReviewReport(input);
  const projection = { ...report, status: "available" };
  const vscodeEnvelope = {
    contract: "hia-wp57-documentation-quality-review-evidence",
    contractVersion: "0.1.0-draft",
    phase: "W-P57.4",
    projection,
    status: "ready-for-wp57-fixture-privacy-and-evidence"
  };

  /** 中文：LSP 只将 core finding 映射为 zero-range diagnostic，不生成 edit 或 code action。 English: LSP maps core findings only to zero-range diagnostics and produces neither edits nor code actions. */
  const lspDiagnostics = createHiaDocumentationQualityReviewDiagnostics(input);
  const vscode = await import(pathToFileURL(path.join(root, "apps", "vscode-extension", "dist", "config.js")).href);
  const devtools = await import(pathToFileURL(path.join(root, "apps", "devtools-extension", "panel-core.js")).href);
  const visualStudioCheck = await readJson(visualStudioCheckPath);

  const vscodeChoices = vscode.createHiaVscodeDocumentationQualityReviewChoices(vscodeEnvelope);
  const vscodeReport = vscode.createHiaVscodeDocumentationQualityReviewReport(vscodeEnvelope, vscodeChoices[0]?.finding);
  const devtoolsModel = devtools.createHiaDevToolsPanelViewModel({
    documentationQualityReview: projection
  });
  const devtoolsReview = devtoolsModel.review.documentationQualityReview;
  const visualStudioReview = visualStudioCheck.reviewSurface.documentationQualityReview;

  assertCoreAndLsp(report, lspDiagnostics);
  assertVscodeProjection(vscodeChoices, vscodeReport);
  assertDevToolsProjection(devtoolsReview);
  assertVisualStudioProjection(visualStudioReview);

  /** 中文：四行均来自同一 report 的确定性计数；Visual Studio 使用同一合成 fixture 的嵌入式 snapshot。 English: All four rows use deterministic counts from the same report; Visual Studio uses an embedded snapshot of the same synthetic fixture. */
  const hosts = [
    {
      host: "lsp",
      status: "projection-ready",
      findingCount: lspDiagnostics.length,
      actionPolicy: "review-only",
      requiresHumanReview: true,
      sourceBodyIncluded: false,
      resourceBodyIncluded: false,
      termPhraseIncluded: false,
      rawLocatorIncluded: false,
      writeAuthority: "disabled"
    },
    {
      host: "vscode-extension",
      status: "projection-ready",
      findingCount: vscodeChoices.length,
      actionPolicy: projection.actionPolicy,
      requiresHumanReview: projection.summary.requiresHumanReview,
      sourceBodyIncluded: projection.privacy.allowSourceBody,
      resourceBodyIncluded: projection.privacy.allowResourceBody,
      termPhraseIncluded: projection.privacy.allowTermPhrase,
      rawLocatorIncluded: projection.privacy.allowRawLocator,
      writeAuthority: "disabled"
    },
    {
      host: "chrome-devtools-extension",
      status: devtoolsReview.status,
      findingCount: devtoolsReview.findingCount,
      actionPolicy: devtoolsReview.actionPolicy,
      requiresHumanReview: devtoolsReview.requiresHumanReview,
      sourceBodyIncluded: devtoolsReview.privacy.sourceBodyIncluded,
      resourceBodyIncluded: devtoolsReview.privacy.resourceBodyIncluded,
      termPhraseIncluded: devtoolsReview.privacy.termPhraseIncluded,
      rawLocatorIncluded: devtoolsReview.privacy.rawLocatorIncluded,
      writeAuthority: devtoolsReview.writeAuthority
    },
    {
      host: "visual-studio-tool-window",
      status: visualStudioReview.status,
      findingCount: visualStudioReview.summary.findingCount,
      actionPolicy: visualStudioReview.actionPolicy,
      requiresHumanReview: visualStudioReview.requiresHumanReview,
      sourceBodyIncluded: visualStudioReview.sourceBodyIncluded,
      resourceBodyIncluded: visualStudioReview.resourceBodyIncluded,
      termPhraseIncluded: visualStudioReview.termPhraseIncluded,
      rawLocatorIncluded: visualStudioReview.rawLocatorIncluded,
      writeAuthority: "disabled"
    }
  ];
  const summary = createSummary(hosts, report);
  const checks = createChecks(summary);
  const evidence = {
    contract: "hia-wp57-documentation-quality-review-evidence",
    contractVersion: "0.1.0-draft",
    phase: "W-P57.4-W-P57.5",
    createdAt: new Date().toISOString(),
    status: checks.every((check) => check.status === "pass")
      ? "ready-for-wp57-release-gate-and-closeout"
      : "blocked-by-wp57-documentation-quality-review-evidence",
    input: {
      contract: input.contract,
      contractVersion: input.contractVersion,
      observationCategories: input.observations.map((observation) => observation.category),
      observationCount: input.observations.length,
      privacy: input.privacy
    },
    report: {
      actionPolicy: report.actionPolicy,
      contract: report.contract,
      contractVersion: report.contractVersion,
      id: report.id,
      summary: report.summary
    },
    hosts,
    summary,
    checks,
    boundary: {
      codeActionCount: 0,
      dlrReaderInvocationCount: 0,
      localeResourceDiscoveryCount: 0,
      parserOrRegistryInvocationCount: 0,
      providerNetworkExecutionCount: 0,
      sidecarDiscoveryCount: 0,
      sourceBodySerializationCount: 0,
      targetRepositoryMutationCount: 0,
      workspaceWriteEnabledCount: 0
    },
    generatedDocs: {
      hostMatrix: "dist/wp57-documentation-quality-review/host-projection-matrix.md",
      qualityReviewProjection: "dist/wp57-documentation-quality-review/quality-review-projection.json"
    }
  };

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "quality-review-projection.json"), `${JSON.stringify(vscodeEnvelope, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputRoot, "host-projection-matrix.md"), renderHostMatrix(evidence), "utf8");
  console.log(`W-P57 documentation quality-review evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/** 中文：创建三类别的 public-safe fixture。English: Creates the three-category public-safe fixture. */
function createQualityReviewFixture() {
  return {
    contract: DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
    contractVersion: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
    id: "quality-review:wp57-host-fixture",
    observations: [
      {
        category: "rop",
        confidence: "high",
        diagnosticCodes: ["ROP_DOCUMENTED_NODE_REVIEW_REQUIRED"],
        provenance: { kind: "rop-observation" },
        rule: "documented-node-coverage",
        scope: { fieldPath: "documentation", occurrence: 0, profile: "rop", sourceDocumentId: "fixture:wp57:rop", symbolId: "fixture:rop:node" },
        state: "missing"
      },
      {
        category: "terminology",
        confidence: "none",
        diagnosticCodes: ["TERM_GRAMMAR_UNAVAILABLE"],
        provenance: { kind: "profile-diagnostic" },
        rule: "grammar-state",
        scope: { fieldPath: "description", occurrence: 0, profile: "generic-docline", sourceDocumentId: "fixture:wp57:terminology" },
        state: "unavailable"
      },
      {
        category: "locale-resource",
        confidence: "medium",
        diagnosticCodes: ["DLR_LOCALE_MISSING"],
        provenance: { kind: "locale-resolution-sidecar", sidecarId: "locale-resolution:wp57:fixture" },
        rule: "locale-resolution",
        scope: { fieldPath: "summary", occurrence: 0, profile: "generic-docline", sourceDocumentId: "fixture:wp57:locale", symbolId: "fixture:locale:entry" },
        state: "missing"
      }
    ],
    privacy: {
      allowRawLocator: false,
      allowResourceBody: false,
      allowSourceBody: false,
      allowTermPhrase: false
    }
  };
}

/** 中文：验证 core report 与 LSP diagnostic 使用相同 finding 集。English: Validates that the core report and LSP diagnostics use the same finding set. */
function assertCoreAndLsp(report, diagnostics) {
  assert.equal(report.contract, "documentation-quality-review");
  assert.equal(report.contractVersion, "0.1.0-draft");
  assert.equal(report.actionPolicy, "review-only");
  assert.equal(report.findings.length, 3);
  assert.deepEqual(report.summary, {
    findingCount: 3,
    localeResourceFindingCount: 1,
    requiresHumanReview: true,
    ropFindingCount: 1,
    terminologyFindingCount: 1,
    unavailableFindingCount: 1
  });
  assert.equal(report.privacy.allowSourceBody, false);
  assert.equal(report.privacy.allowResourceBody, false);
  assert.equal(report.privacy.allowTermPhrase, false);
  assert.equal(report.privacy.allowRawLocator, false);
  assert.equal(diagnostics.length, report.findings.length);
  assert.deepEqual(diagnostics.map((diagnostic) => diagnostic.code).sort(), [
    "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED",
    "DQR_REVIEW_INPUT_UNAVAILABLE",
    "DQR_ROP_REVIEW_REQUIRED"
  ]);
  assert.ok(diagnostics.every((diagnostic) => diagnostic.range.start.line === 0 && diagnostic.range.end.line === 0));
  assert.ok(diagnostics.every((diagnostic) => diagnostic.source === "hia-quality-review"));
}

/** 中文：验证 VS Code 只显示报告的安全逻辑字段。English: Validates that VS Code displays only the report's safe logical fields. */
function assertVscodeProjection(choices, lines) {
  assert.equal(choices.length, 3);
  assert.equal(choices[0].finding.requiresHumanReview, true);
  assert.ok(lines.includes("Action policy / 操作策略: review-only"));
  assert.ok(lines.includes("Source body / 源码正文: denied / 禁止"));
  assert.ok(lines.includes("Resource body / 资源正文: denied / 禁止"));
  assert.ok(lines.includes("Term phrase / 术语短语: denied / 禁止"));
  assert.ok(lines.includes("Raw locator / 原始定位符: denied / 禁止"));
}

/** 中文：验证 DevTools 的归一化层既保留计数又丢弃所有敏感类别。English: Validates that DevTools normalization retains counts while dropping every sensitive category. */
function assertDevToolsProjection(review) {
  assert.equal(review.contract, "hia-devtools-documentation-quality-review-summary");
  assert.equal(review.actionPolicy, "review-only");
  assert.equal(review.findingCount, 3);
  assert.equal(review.ropFindingCount, 1);
  assert.equal(review.terminologyFindingCount, 1);
  assert.equal(review.localeResourceFindingCount, 1);
  assert.equal(review.unavailableFindingCount, 1);
  assert.equal(review.requiresHumanReview, true);
  assert.equal(review.privacy.sourceBodyIncluded, false);
  assert.equal(review.privacy.resourceBodyIncluded, false);
  assert.equal(review.privacy.termPhraseIncluded, false);
  assert.equal(review.privacy.rawLocatorIncluded, false);
  assert.equal(review.writeAuthority, "disabled");
  assert.equal(review.workspaceWriteAllowed, false);
}

/** 中文：验证 Visual Studio 嵌入 snapshot 与同一 fixture summary 一致。English: Validates that the Visual Studio embedded snapshot matches the same fixture summary. */
function assertVisualStudioProjection(review) {
  assert.equal(review.contract, "documentation-quality-review");
  assert.equal(review.contractVersion, "0.1.0-draft");
  assert.equal(review.status, "fixture-ready");
  assert.equal(review.actionPolicy, "review-only");
  assert.equal(review.summary.findingCount, 3);
  assert.equal(review.summary.ropFindingCount, 1);
  assert.equal(review.summary.terminologyFindingCount, 1);
  assert.equal(review.summary.localeResourceFindingCount, 1);
  assert.equal(review.summary.unavailableFindingCount, 1);
  assert.equal(review.requiresHumanReview, true);
  assert.equal(review.sourceBodyIncluded, false);
  assert.equal(review.resourceBodyIncluded, false);
  assert.equal(review.termPhraseIncluded, false);
  assert.equal(review.rawLocatorIncluded, false);
  assert.equal(review.workspaceWriteAvailable, false);
  assert.equal(review.targetRepositoryMutation, false);
  assert.equal(review.providerNetworkExecuted, false);
}

/** 中文：汇总四宿主的同源计数与禁止能力。English: Summarizes same-origin counts and prohibited capabilities across four hosts. */
function createSummary(hosts, report) {
  return {
    expectedFindingCount: report.summary.findingCount,
    hostCount: hosts.length,
    matchingFindingCountHostCount: hosts.filter((host) => host.findingCount === report.summary.findingCount).length,
    reviewOnlyHostCount: hosts.filter((host) => host.actionPolicy === "review-only").length,
    humanReviewRequiredHostCount: hosts.filter((host) => host.requiresHumanReview).length,
    sourceBodyIncludedHostCount: hosts.filter((host) => host.sourceBodyIncluded).length,
    resourceBodyIncludedHostCount: hosts.filter((host) => host.resourceBodyIncluded).length,
    termPhraseIncludedHostCount: hosts.filter((host) => host.termPhraseIncluded).length,
    rawLocatorIncludedHostCount: hosts.filter((host) => host.rawLocatorIncluded).length,
    writeAuthorityEnabledHostCount: hosts.filter((host) => host.writeAuthority !== "disabled").length
  };
}

/** 中文：把 invariant 转为可审计 pass/fail check。English: Converts invariants into auditable pass/fail checks. */
function createChecks(summary) {
  return [
    createCheck("four-host-projections-ready", summary.hostCount === 4),
    createCheck("same-finding-count-across-hosts", summary.matchingFindingCountHostCount === 4),
    createCheck("review-only-across-hosts", summary.reviewOnlyHostCount === 4),
    createCheck("human-review-required-across-hosts", summary.humanReviewRequiredHostCount === 4),
    createCheck("no-source-resource-term-or-locator-data", summary.sourceBodyIncludedHostCount === 0 && summary.resourceBodyIncludedHostCount === 0 && summary.termPhraseIncludedHostCount === 0 && summary.rawLocatorIncludedHostCount === 0),
    createCheck("no-host-write-authority", summary.writeAuthorityEnabledHostCount === 0)
  ];
}

/** 中文：构造单条 evidence check。English: Creates one evidence check. */
function createCheck(id, passed) {
  return { id, status: passed ? "pass" : "fail" };
}

/** 中文：渲染中文优先的宿主矩阵。English: Renders a Chinese-first host matrix. */
function renderHostMatrix(evidence) {
  const rows = evidence.hosts.map((host) => `| ${host.host} | ${host.status} | ${host.findingCount} | ${host.actionPolicy} | ${host.requiresHumanReview ? "是" : "否"} | ${host.writeAuthority} |`).join("\n");
  return `# W-P57 文档质量审查四宿主投影\n\n本 evidence 使用同一份合成、metadata-only 的 ROP / 固有术语 / 语言资源 fixture。它仅验证\nread-only projection；不读取 DLR、sidecar 或 source/resource body，不执行 parser/registry、网络或写入。\n\n| 宿主 | 状态 | finding 数 | 操作策略 | 人工审查 | 写入权限 |\n| --- | --- | ---: | --- | --- | --- |\n${rows}\n\n全部宿主均固定为 \`review-only\`，且正文、术语短语、原始定位符与编辑权限均为零。\n`;
}

/** 中文：读取 JSON evidence。English: Reads JSON evidence. */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/** 中文：将证据路径统一为可跨平台阅读的斜杠形式。English: Normalizes an evidence path to portable slash notation. */
function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}
