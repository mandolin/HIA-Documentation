import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-visual-studio-snapshot-mutation-readiness");

await main();

/**
 * 生成 W-P53.4 Visual Studio versioned snapshot mutation readiness evidence。
 *
 * 中文：本脚本读取 W-P53.3 的 public-safe evidence、Visual Studio static checker 输出和本仓
 * readiness contract。它不启动 Visual Studio、不调用 `EditAsync()` / `AsEditable()`、不读写
 * document snapshot、也不访问 target repository、provider、network 或 LSP runtime。
 * @lang en Generates W-P53.4 Visual Studio versioned-snapshot mutation-readiness evidence. It
 * reads W-P53.3 public-safe evidence, the Visual Studio static-check result, and this repository's
 * readiness contract. It does not launch Visual Studio, call `EditAsync()` / `AsEditable()`, read
 * or write a document snapshot, or access a target repository, provider, network, or LSP runtime.
 * @returns {Promise<void>} <lang><zh-CN>写入 public-safe readiness evidence。</zh-CN><en>Writes public-safe readiness evidence.</en></lang>
 */
async function main() {
  const inputs = readInputs();
  const readiness = readJson(path.join(root, "apps", "visual-studio-extension", "wp53-snapshot-mutation-readiness.json"));
  const summary = summarize(inputs, readiness);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp53-visual-studio-snapshot-mutation-readiness-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.4",
    status: hardFailures.length === 0
      ? "ready-for-wp53-target-owner-adoption-handoff-refresh"
      : "blocked-by-wp53-visual-studio-snapshot-mutation-readiness",
    sourceInputs: createSourceInputs(inputs),
    readinessPolicy: {
      hostOwner: summary.hostOwner,
      mutationMethod: summary.mutationMethod,
      snapshotModel: summary.snapshotModel,
      vscodeWorkspaceEditTransportAllowed: false,
      providerEditObjectAllowed: false,
      lspEditObjectAllowed: false,
      freeFormTargetPathAllowed: false,
      finalHumanConfirmationRequired: summary.finalHumanConfirmationRequired,
      currentSnapshotRequired: summary.currentSnapshotRequired,
      freshSnapshotAndConfirmationRequiredAfterRejection: summary.retryRequiresFreshFinalConfirmation,
      concurrentRequestSerializationRequired: summary.concurrentRequestSerializationRequired,
      rollbackRequiresSeparateFreshSnapshotRequest: summary.rollbackRequiresSeparateFreshSnapshotRequest,
      workspaceMutationImplemented: false,
      sourcesContentPolicy: "none"
    },
    executionBoundary: {
      visualStudioLaunchCount: 0,
      editorExtensibilityEditAsyncCallCount: summary.editAsyncSourceCallCount,
      editableSnapshotCallCount: summary.asEditableSourceCallCount,
      hostEditorApiCallCount: summary.hostEditorApiCallCount,
      workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
      actualVisualStudioMutationExecutionCount: summary.actualVisualStudioMutationExecutionCount,
      finalHumanConfirmationCapturedCount: summary.finalHumanConfirmationCapturedCount,
      targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
      providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
      sourceBodyIncludedInEvidence: false,
      snapshotBodyIncludedInEvidence: false,
      rollbackBodyIncludedInEvidence: false,
      versionValueIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      absolutePathIncludedInEvidence: false,
      sourcesContentPolicy: "none"
    },
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      overview: "dist/wp53-visual-studio-snapshot-mutation-readiness/visual-studio-snapshot-mutation-readiness.md",
      futureExecutionBoundary: "dist/wp53-visual-studio-snapshot-mutation-readiness/future-visual-studio-execution-boundary.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.4 evidence");
  assert.equal(hardFailures.length, 0, `W-P53.4 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  await writeFile(path.join(outputRoot, "visual-studio-snapshot-mutation-readiness.md"), renderOverview(evidence), "utf8");
  await writeFile(path.join(outputRoot, "future-visual-studio-execution-boundary.md"), renderFutureExecutionBoundary(evidence), "utf8");
  console.log(`W-P53.4 Visual Studio snapshot-mutation readiness evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取前一阶段和 Visual Studio checker 输出，不重放前一阶段或启动 host。
 *
 * @lang en Reads prior-stage and Visual Studio checker outputs without replaying a prior stage or launching a host.
 */
function readInputs() {
  const inputs = {
    wp53: readJson(path.join(root, "dist", "wp53-vscode-host-owned-self-sandbox-pilot-gate", "evidence.json")),
    visualStudio: readJson(path.join(root, "dist", "visual-studio-extension-check.json"))
  };
  assert.equal(inputs.wp53.status, "ready-for-wp53-visual-studio-snapshot-mutation-readiness");
  assert.equal(inputs.visualStudio.wp53SnapshotMutationReadiness?.contract, "hia-wp53-visual-studio-snapshot-mutation-readiness");
  return inputs;
}

/**
 * 汇总 immutable snapshot、asynchronous host mutation 和 no-execution boundary。
 *
 * @lang en Summarizes immutable snapshots, asynchronous host mutation, and the no-execution boundary.
 */
function summarize(inputs, readiness) {
  const checker = inputs.visualStudio.wp53SnapshotMutationReadiness ?? {};
  const execution = checker.currentExecution ?? {};
  return {
    phase: "W-P53.4",
    inputEvidenceCount: 2,
    readyInputEvidenceCount: inputs.wp53.summary?.hardFailureCount === 0 && checker.status === "readiness-only-no-host-mutation" ? 2 : 0,
    inputHardFailureCount: number(inputs.wp53.summary?.hardFailureCount),
    visualStudioSdkRoute: "VisualStudio.Extensibility-out-of-process",
    hostOwner: checker.hostOwner,
    mutationMethod: checker.mutationMethod,
    snapshotModel: checker.snapshotModel,
    finalHumanConfirmationRequired: checker.finalHumanConfirmationRequired === true,
    currentSnapshotRequired: checker.currentSnapshotRequired === true,
    retryRequiresFreshFinalConfirmation: checker.retryRequiresFreshFinalConfirmation === true,
    concurrentRequestSerializationRequired: checker.concurrentRequestSerializationRequired === true,
    rollbackRequiresSeparateFreshSnapshotRequest: checker.rollbackRequiresSeparateFreshSnapshotRequest === true,
    readinessContractMatchesChecker: readiness.contract === checker.contract
      && readiness.contractVersion === checker.contractVersion
      && readiness.status === checker.status,
    editAsyncSourceCallCount: number(checker.editAsyncSourceCallCount),
    asEditableSourceCallCount: number(checker.asEditableSourceCallCount),
    hostEditorApiCallCount: number(execution.hostEditorApiCallCount),
    workspaceWriteAllowedCount: number(execution.workspaceWriteAllowedCount),
    actualVisualStudioMutationExecutionCount: number(execution.actualVisualStudioMutationExecutionCount),
    finalHumanConfirmationCapturedCount: number(execution.finalHumanConfirmationCapturedCount),
    targetRepositoryMutationCount: number(execution.targetRepositoryMutationCount),
    providerNetworkExecutedCount: number(execution.providerNetworkExecutedCount),
    sourceBodyIncludedCount: 0,
    snapshotBodyIncludedCount: 0,
    rollbackBodyIncludedCount: 0,
    versionValueIncludedCount: 0,
    digestValueIncludedCount: 0,
    absolutePathIncludedCount: 0,
    sourcesContentPolicy: "none",
    nextStage: "W-P53.5 Target-Owner Adoption Handoff Refresh"
  };
}

function createChecks(summary) {
  return [
    check("wp53-vscode-input-ready", summary.readyInputEvidenceCount === 2 && summary.inputHardFailureCount === 0,
      "W-P53.3 self-sandbox evidence and the Visual Studio static readiness contract are present without hard failures."),
    check("independent-visual-studio-owner", summary.visualStudioSdkRoute === "VisualStudio.Extensibility-out-of-process"
      && summary.hostOwner === "VisualStudio.Extensibility EditorExtensibility"
      && summary.mutationMethod === "EditorExtensibility.EditAsync"
      && summary.snapshotModel === "immutable-versioned",
    "Visual Studio owns a distinct asynchronous mutation route based on immutable versioned snapshots; it does not transport VS Code WorkspaceEdit objects."),
    check("snapshot-confirmation-and-concurrency-gates", summary.finalHumanConfirmationRequired
      && summary.currentSnapshotRequired
      && summary.retryRequiresFreshFinalConfirmation
      && summary.concurrentRequestSerializationRequired
      && summary.rollbackRequiresSeparateFreshSnapshotRequest,
    "Any future mutation requires final confirmation, a current snapshot, fresh confirmation after rejection, serialized requests, and a separate fresh-snapshot rollback request."),
    check("readiness-contract-and-checker-agree", summary.readinessContractMatchesChecker,
      "The shipped Visual Studio readiness contract and shared static checker agree on the same no-mutation status."),
    check("no-editor-api-or-live-mutation", summary.editAsyncSourceCallCount === 0
      && summary.asEditableSourceCallCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.actualVisualStudioMutationExecutionCount === 0
      && summary.finalHumanConfirmationCapturedCount === 0,
    "W-P53.4 prepares the route only; it calls no Visual Studio editor API, writes no workspace, and claims no live mutation or confirmation."),
    check("no-target-provider-boundary-break", summary.targetRepositoryMutationCount === 0
      && summary.providerNetworkExecutedCount === 0,
    "No target repository mutation or provider-network execution is granted or claimed."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.snapshotBodyIncludedCount === 0
      && summary.rollbackBodyIncludedCount === 0
      && summary.versionValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.absolutePathIncludedCount === 0
      && summary.sourcesContentPolicy === "none",
    "Public evidence excludes source/snapshot/rollback bodies, versions, digests, absolute paths, and sourcesContent.")
  ];
}

function createSourceInputs(inputs) {
  return [
    sourceInput("W-P53.3", inputs.wp53),
    sourceInput("Visual Studio static checker", inputs.visualStudio)
  ];
}

function sourceInput(phase, evidence) {
  return {
    phase,
    contract: evidence.contract,
    status: evidence.status ?? evidence.wp53SnapshotMutationReadiness?.status,
    hardFailureCount: number(evidence.summary?.hardFailureCount),
    grantsWorkspaceMutationAuthority: false,
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

function number(value) {
  return Number(value ?? 0);
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/") || ".";
}

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P53.4 Visual Studio Snapshot Mutation Readiness

## 中文摘要

W-P53.4 将未来 Visual Studio mutation 明确绑定到 VisualStudio.Extensibility 的
EditorExtensibility.EditAsync 与 immutable, versioned ITextViewSnapshot /
ITextDocumentSnapshot。该模型与 VS Code 的 WorkspaceEdit 完全独立：不传递 edit object，
不接受自由路径，也不把 LSP/provider/renderer/CLI 变成 apply owner。

本阶段只交付 readiness contract 与静态检查；没有启动 Visual Studio、读取/写入 snapshot、调用
EditAsync 或 AsEditable，也没有捕获 final human confirmation。未来 rejection 必须先读取新的
snapshot 并再次取得最终确认；并发请求须串行化，rollback 也必须成为独立的 fresh-snapshot request。

## Summary

- status：\`${evidence.status}\`
- host owner / mutation method / snapshot model：\`${summary.hostOwner}\` / \`${summary.mutationMethod}\` / \`${summary.snapshotModel}\`
- EditAsync / AsEditable source calls：${summary.editAsyncSourceCallCount} / ${summary.asEditableSourceCallCount}
- host API / workspace write / actual VS mutation / final confirmation：${summary.hostEditorApiCallCount} / ${summary.workspaceWriteAllowedCount} / ${summary.actualVisualStudioMutationExecutionCount} / ${summary.finalHumanConfirmationCapturedCount}
- target mutation / provider network：${summary.targetRepositoryMutationCount} / ${summary.providerNetworkExecutedCount}
- next stage：\`${summary.nextStage}\`
`;
}

function renderFutureExecutionBoundary(evidence) {
  return `# W-P53.4 Future Visual Studio Execution Boundary

## 中文摘要

以后若单独获得具体 Visual Studio host mutation 授权，执行者仍必须：

- 仅在单独指定、受控的 synthetic sandbox 中操作，不接受任意 workspace 或 target path；
- 在最终人工确认后读取当前 ITextDocumentSnapshot，并把一个紧密范围的 edit 放入单个
  EditorExtensibility.EditAsync request；
- 将 mutation rejection 视为未应用，重新读取 snapshot 后再次取得最终确认；
- 由于 editor extension continuation 可能交错，按 document/transaction 串行化请求；
- post-validation 后，以新的 snapshot 和单独的 host request 执行 rollback；
- 仅记录 metadata-only/redacted audit，永不公开 snapshot/body/version/digest/absolute path；
- 不操作 target repository、不让 provider/LSP/renderer/CLI 直接写入，也不把 VS Code
  WorkspaceEdit 移交给 Visual Studio。

当前 EditAsync source call / actual Visual Studio mutation / final confirmation：\`${evidence.summary.editAsyncSourceCallCount}\` / \`${evidence.summary.actualVisualStudioMutationExecutionCount}\` / \`${evidence.summary.finalHumanConfirmationCapturedCount}\`。
`;
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
