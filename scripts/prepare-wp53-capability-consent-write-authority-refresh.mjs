import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-capability-consent-write-authority-refresh");

main();

/**
 * 生成 W-P53.1 capability、consent 与 write-authority refresh evidence。
 *
 * @lang en Generates W-P53.1 capability, consent, and write-authority refresh evidence.
 *
 * 中文：本脚本只读取既有 public-safe evidence、宿主 manifest 和本仓 host source 的 API
 * 标记计数。它不调用 editor API、不构造 WorkspaceEdit、不运行 target command，也不读取或
 * 序列化 target/source/snapshot/rollback 正文。
 * @lang en This script reads only prior public-safe evidence, host manifests, and API-marker
 * counts in this repository's host source. It never calls an editor API, constructs a
 * WorkspaceEdit, runs a target command, or reads/serializes target, source, snapshot, or
 * rollback bodies.
 */
function main() {
  const inputs = readInputs();
  const hostCapabilities = readHostCapabilities();
  const summary = summarize(inputs, hostCapabilities);
  const checks = createChecks(inputs, hostCapabilities, summary);
  const hardFailures = checks.filter((check) => check.status === "fail");
  const evidence = {
    contract: "hia-wp53-capability-consent-write-authority-refresh-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.1",
    status: hardFailures.length === 0
      ? "ready-for-wp53-target-owner-evidence-currentness-and-trial-selection"
      : "blocked-by-wp53-capability-consent-write-authority-refresh",
    upstreamInputs: createUpstreamInputs(inputs),
    hostCapabilities,
    executionPolicy: executionPolicy(),
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      overview: "dist/wp53-capability-consent-write-authority-refresh/capability-consent-write-authority-refresh.md",
      gateLedger: "dist/wp53-capability-consent-write-authority-refresh/real-pilot-gate-ledger.md"
    }
  };

  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.1 evidence");
  if (hardFailures.length > 0) {
    console.error(`W-P53.1 failed checks: ${hardFailures.map((check) => check.id).join(", ")}`);
  }
  assert.equal(hardFailures.length, 0, `W-P53.1 has ${hardFailures.length} hard failure(s).`);

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  fs.writeFileSync(path.join(outputRoot, "capability-consent-write-authority-refresh.md"), renderOverview(evidence), "utf8");
  fs.writeFileSync(path.join(outputRoot, "real-pilot-gate-ledger.md"), renderGateLedger(evidence), "utf8");
  console.log(`W-P53.1 capability/consent refresh evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取已完成周期的 evidence，不重放其历史阶段。
 *
 * @lang en Reads evidence from completed cycles without replaying their historical stages.
 *
 * @returns {{wp46: Record<string, unknown>, wp47: Record<string, unknown>, wp51: Record<string, unknown>, wp52: Record<string, unknown>}}
 */
function readInputs() {
  const inputs = {
    wp46: readJson(path.join(root, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json")),
    wp47: readJson(path.join(root, "dist", "wp47-closeout-wp48-inputs", "evidence.json")),
    wp51: readJson(path.join(root, "dist", "wp51-closeout-wp52-inputs", "evidence.json")),
    wp52: readJson(path.join(root, "dist", "wp52-cross-language-reuse-and-closeout", "evidence.json"))
  };

  assert.equal(inputs.wp46.status, "ready-for-wp47-checked-apply-pilot-preparation-and-wp48-cycle-closeout");
  assert.equal(inputs.wp47.status, "ready-for-wp48-runtime-controlled-execution-closeout");
  assert.equal(inputs.wp51.status, "ready-for-wp52-planning-user-confirmation");
  assert.equal(inputs.wp52.status, "ready-for-wp52-closeout-and-wp53-user-confirmation");
  return inputs;
}

/**
 * 从本仓 host source 读取写入 API 的静态标记计数，并且只返回聚合值。
 *
 * @lang en Reads static write-API marker counts from this repository's host source and returns aggregates only.
 *
 * @returns {Record<string, unknown>}
 */
function readHostCapabilities() {
  const vscodeManifest = readJson(path.join(root, "apps", "vscode-extension", "package.json"));
  const vscodeSource = readSourceTree(path.join(root, "apps", "vscode-extension", "src"), ".ts");
  const visualStudioSource = readSourceTree(path.join(root, "apps", "visual-studio-extension"), ".cs");
  const trust = vscodeManifest.capabilities?.untrustedWorkspaces;

  return {
    vscode: {
      untrustedWorkspaceSupport: trust?.supported ?? null,
      untrustedWorkspaceDescriptionDeclared: typeof trust?.description === "string" && trust.description.length > 0,
      workspaceApplyEditCallCount: countMatches(vscodeSource, /\bworkspace\.applyEdit\s*\(/gu),
      workspaceEditConstructionCount: countMatches(vscodeSource, /\bnew\s+(?:vscode\.)?WorkspaceEdit\s*\(/gu),
      workspaceTrustApiUseCount: countMatches(vscodeSource, /\bworkspace\.isTrusted\b/gu),
      hostMutationEnabled: false
    },
    visualStudio: {
      editAsyncCallCount: countMatches(visualStudioSource, /\bEditAsync\s*\(/gu),
      editableSnapshotCallCount: countMatches(visualStudioSource, /\bAsEditable\s*\(/gu),
      hostMutationEnabled: false
    },
    lsp: {
      directWorkspaceEditProduced: false,
      applyOwner: "client-host-only"
    }
  };
}

/**
 * 汇总输入与宿主能力的公开安全计数。
 *
 * @lang en Summarizes public-safe input and host-capability counts.
 */
function summarize(inputs, hostCapabilities) {
  const wp46 = summaryOf(inputs.wp46);
  const wp47 = summaryOf(inputs.wp47);
  const wp51 = summaryOf(inputs.wp51);
  const wp52 = summaryOf(inputs.wp52);
  return {
    phase: "W-P53.1",
    inputEvidenceCount: 4,
    readyInputEvidenceCount: 4,
    upstreamHardFailureCount: sum([wp46.hardFailureCount, wp47.hardFailureCount, wp51.hardFailureCount, wp52.hardFailureCount]),
    ownerSubmittedReportCount: number(wp46.ownerSubmittedReportCount) + number(wp47.realTargetOwnerReportSubmittedCount),
    ownerSubmissionSlotReady: wp47.targetOwnerReportSubmissionSlotReady === true,
    deferredRealWriteGateCount: number(wp47.deferredRealWriteGateCount),
    checkedApplyWriteEnabledCount: sum([
      wp46.wp47CheckedApplyWriteEnabledCount,
      wp47.checkedApplyWriteEnabledCount,
      wp51.checkedApplyWriteEnabledCount,
      wp52.checkedApplyWriteEnabledCount
    ]),
    hostEditorApiCallCount: sum([wp47.hostEditorApiCallCount, wp51.hostEditorApiCallCount, wp52.hostEditorApiCallCount]),
    checkedApplyTriggeredCount: sum([wp46.checkedApplyTriggeredCount, wp47.checkedApplyTriggeredCount]),
    workspaceWriteAllowedCount: sum([wp46.workspaceWriteAllowedCount, wp47.workspaceWriteAllowedCount, wp52.workspaceWriteAllowedCount]),
    targetCommandExecutedByHiaCount: sum([wp46.actualTargetCommandExecutedCount, wp47.targetCommandExecutedByHiaCount]),
    targetRepositoryMutationCount: sum([wp46.targetRepositoryMutationCount, wp47.targetRepositoryMutationCount, wp51.targetRepositoryMutationCount, wp52.targetRepositoryMutationCount]),
    providerNetworkExecutedCount: sum([wp46.providerNetworkExecutedCount, wp47.providerNetworkExecutedCount, wp51.providerNetworkExecutedCount, wp52.providerNetworkExecutedCount]),
    vscodeWorkspaceApplyEditCallCount: number(hostCapabilities.vscode.workspaceApplyEditCallCount),
    vscodeWorkspaceEditConstructionCount: number(hostCapabilities.vscode.workspaceEditConstructionCount),
    visualStudioEditAsyncCallCount: number(hostCapabilities.visualStudio.editAsyncCallCount),
    visualStudioEditableSnapshotCallCount: number(hostCapabilities.visualStudio.editableSnapshotCallCount),
    vscodeUntrustedWorkspaceSupport: hostCapabilities.vscode.untrustedWorkspaceSupport,
    sourceBodyIncludedCount: sum([wp46.sourceTextIncludedCount, wp47.sourceBodyIncludedCount, wp51.sourceBodyOutputCount, wp52.sourceTextSerializedCount]),
    sourceRangeIncludedCount: number(wp52.sourceRangeSerializedCount),
    rollbackContentIncludedCount: number(wp47.rollbackContentIncludedCount),
    requestBodyIncludedCount: sum([wp46.requestBodyIncludedCount, wp47.requestBodyIncludedCount]),
    responseBodyIncludedCount: sum([wp46.responseBodyIncludedCount, wp47.responseBodyIncludedCount]),
    secretValueIncludedCount: sum([wp46.secretValueIncludedCount, wp47.secretValueIncludedCount]),
    digestValueIncludedCount: sum([wp47.digestValueIncludedCount, wp52.digestValueSerializedCount]),
    localAbsolutePathDetectedCount: sum([wp46.localAbsolutePathDetectedCount, wp47.localAbsolutePathDetectedCount, wp51.localPathExposureCount, wp52.localPathExposureCount]),
    credentialMaterialMarkerCount: sum([wp46.credentialMaterialMarkerCount, wp47.credentialMaterialMarkerCount, wp51.credentialMarkerCount, wp52.credentialMarkerCount]),
    sourcesContentPolicy: "none",
    actualWriteAuthorityGranted: false,
    nextStage: "W-P53.2 Target-Owner Evidence Currentness And Trial Selection"
  };
}

/**
 * 构造每个输入的最小、不可写入投影。
 *
 * @lang en Creates a minimal non-writing projection for each input.
 */
function createUpstreamInputs(inputs) {
  return [
    upstream("W-P46.7", "target-owner-evidence-ingestion-closeout", inputs.wp46),
    upstream("W-P47.7", "checked-apply-pilot-preparation-closeout", inputs.wp47),
    upstream("W-P51.7", "visual-studio-authoring-foundation-closeout", inputs.wp51),
    upstream("W-P52.7", "generated-binding-read-only-host-baseline", inputs.wp52)
  ];
}

/**
 * 声明 W-P53.1 不执行的高风险能力。
 *
 * @lang en Declares high-risk capabilities not executed by W-P53.1.
 */
function executionPolicy() {
  return {
    policy: "capability-consent-refresh-no-write",
    hostEditorApiMayBeCalled: false,
    workspaceApplyEditMayBeCalled: false,
    visualStudioMutationMayBeCalled: false,
    checkedApplyMayBeTriggered: false,
    workspaceWriteMayBeAllowed: false,
    targetCommandMayBeExecutedByHia: false,
    targetRepositoryMayBeMutated: false,
    providerNetworkMayBeExecuted: false,
    sourceBodyMayBeRead: false,
    sourceBodyMayBeSerialized: false,
    snapshotBodyMayBeSerialized: false,
    rollbackBodyMayBeSerialized: false,
    sourcesContentPolicy: "none"
  };
}

/**
 * 建立启动阶段 hard gate。
 *
 * @lang en Builds hard gates for the starting phase.
 */
function createChecks(inputs, hostCapabilities, summary) {
  return [
    check("upstream-evidence-ready", summary.readyInputEvidenceCount === 4 && summary.upstreamHardFailureCount === 0,
      "W-P46/W-P47/W-P51/W-P52 public-safe closeout evidence is present and has no hard failure."),
    check("owner-report-still-not-claimed", summary.ownerSubmittedReportCount === 0 && summary.ownerSubmissionSlotReady,
      "No real target-owner report is claimed; only a future submission slot is ready."),
    check("vscode-workspace-trust-disabled", hostCapabilities.vscode.untrustedWorkspaceSupport === false
      && hostCapabilities.vscode.untrustedWorkspaceDescriptionDeclared,
    "The VS Code extension is disabled in untrusted workspaces before any future host mutation path exists."),
    check("vscode-no-write-api", summary.vscodeWorkspaceApplyEditCallCount === 0
      && summary.vscodeWorkspaceEditConstructionCount === 0,
    "The current VS Code host source contains no WorkspaceEdit construction or apply call."),
    check("visual-studio-no-mutation-api", summary.visualStudioEditAsyncCallCount === 0
      && summary.visualStudioEditableSnapshotCallCount === 0,
    "The current Visual Studio host source contains no asynchronous text mutation call."),
    check("prior-write-boundary-intact", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.actualWriteAuthorityGranted === false,
    "No upstream result grants write authority or claims a host/target/provider execution."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.sourceRangeIncludedCount === 0
      && summary.rollbackContentIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentPolicy === "none",
    "The refresh keeps public evidence metadata-only and source/private-body free."),
    check("wp53-only-stage-started", inputs.wp52.status === "ready-for-wp52-closeout-and-wp53-user-confirmation"
      && summary.nextStage === "W-P53.2 Target-Owner Evidence Currentness And Trial Selection",
    "W-P53.1 consumes the historical W-P52 input without reopening W-P52 or authorizing a later pilot.")
  ];
}

function upstream(phase, topic, evidence) {
  return {
    phase,
    topic,
    contract: evidence.contract,
    status: evidence.status,
    hardFailureCount: number(summaryOf(evidence).hardFailureCount),
    grantsHostMutationAuthority: false,
    grantsTargetMutationAuthority: false,
    sourcesContentPolicy: "none"
  };
}

function check(id, passed, description) {
  return { id, status: passed ? "pass" : "fail", description };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * 读取指定扩展名的源码内容，但绝不把内容写入 evidence。
 *
 * @lang en Reads selected source text but never writes it to evidence.
 */
function readSourceTree(directory, extension) {
  return listFiles(directory, extension)
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}

function listFiles(directory, extension) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules" || entry.name === "obj" || entry.name === "bin") {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  return files;
}

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P53.1 Capability, Consent And Write-Authority Refresh

## 中文摘要

W-P53.1 已在不执行 editor API、checked apply、workspace write、target command 或 target
mutation 的条件下，重新核对 W-P46/W-P47/W-P51/W-P52 输入和当前宿主代码。VS Code
extension 已声明在未信任工作区禁用；当前 VS Code 与 Visual Studio source 均未出现实际
mutation API 调用。

本 evidence 不是真实 owner adoption、host mutation 或 checked apply 成功。真实 owner report
仍为 0，后续只能进入 owner evidence currentness/trial selection。

## Summary

- status：\`${evidence.status}\`
- upstream ready / hard failures：${summary.readyInputEvidenceCount} / ${summary.upstreamHardFailureCount}
- owner submitted report：${summary.ownerSubmittedReportCount}
- deferred real-write gates：${summary.deferredRealWriteGateCount}
- VS Code apply / WorkspaceEdit construction：${summary.vscodeWorkspaceApplyEditCallCount} / ${summary.vscodeWorkspaceEditConstructionCount}
- Visual Studio EditAsync / editable snapshot：${summary.visualStudioEditAsyncCallCount} / ${summary.visualStudioEditableSnapshotCallCount}
- checked apply / host editor API / workspace write / target mutation：${summary.checkedApplyWriteEnabledCount} / ${summary.hostEditorApiCallCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount}
- next stage：\`${summary.nextStage}\`
`;
}

function renderGateLedger(evidence) {
  const rows = evidence.checks
    .map((item) => `| \`${item.id}\` | \`${item.status}\` | ${item.description} |`)
    .join("\n");
  return `# W-P53.1 真实试点 Gate 台账

## 中文摘要

本台账记录 W-P53.1 的启动门禁。全部通过只表示可进入下一阶段的 owner evidence
currentness/trial selection，不表示任何真实写入已获准。

| Gate | Status | 说明 |
| --- | --- | --- |
${rows}
`;
}

function summaryOf(evidence) {
  return evidence.summary ?? {};
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
