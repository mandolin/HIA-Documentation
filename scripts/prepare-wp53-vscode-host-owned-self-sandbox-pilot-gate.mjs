import assert from "node:assert/strict";
import fs from "node:fs";
import { lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HIA_WP53_SELF_SANDBOX_INITIAL_TEXT,
  HIA_WP53_SELF_SANDBOX_RELATIVE_PATH,
  HIA_WP53_SELF_SANDBOX_SCOPE_ID,
  HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME
} from "../apps/vscode-extension/dist/checked-apply-self-sandbox.js";
import { HIA_RUN_WP53_SELF_SANDBOX_PILOT_COMMAND } from "../apps/vscode-extension/dist/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-vscode-host-owned-self-sandbox-pilot-gate");
const sandboxPath = path.join(root, ...HIA_WP53_SELF_SANDBOX_RELATIVE_PATH);

await main();

/**
 * 准备 W-P53.3 VS Code host-owned self-sandbox pilot gate evidence。
 *
 * 中文：本脚本只创建/重置主仓 `dist` 内的固定 synthetic fixture，并读取已构建的 VS Code
 * extension metadata 与 source marker。它不启动 VS Code、不点击最终确认、不调用 editor API，
 * 也不访问 target repository、network、provider 或 LSP runtime。
 * @lang en Prepares W-P53.3 VS Code host-owned self-sandbox pilot-gate evidence. This script
 * only creates/resets the fixed synthetic fixture inside the main-repo `dist` directory and reads
 * built VS Code extension metadata/source markers. It does not start VS Code, click final
 * confirmation, call an editor API, or access a target repository, network, provider, or LSP runtime.
 * @returns {Promise<void>} <lang><zh-CN>写入 public-safe evidence 与合成 fixture。</zh-CN><en>Writes public-safe evidence and the synthetic fixture.</en></lang>
 */
async function main() {
  const wp53Selection = readJson(path.join(root, "dist", "wp53-target-owner-evidence-currentness-and-trial-selection", "evidence.json"));
  assert.equal(wp53Selection.status, "ready-for-wp53-vscode-host-owned-self-sandbox-pilot-gate");

  await prepareDedicatedSandboxFixture();

  const extensionManifest = readJson(path.join(root, "apps", "vscode-extension", "package.json"));
  const extensionSource = fs.readFileSync(path.join(root, "apps", "vscode-extension", "src", "extension.ts"), "utf8");
  const transactionSource = fs.readFileSync(path.join(root, "apps", "vscode-extension", "src", "checked-apply-self-sandbox.ts"), "utf8");
  const commandContribution = findCommandContribution(extensionManifest, HIA_RUN_WP53_SELF_SANDBOX_PILOT_COMMAND);
  const summary = summarize({
    commandContribution,
    extensionManifest,
    extensionSource,
    transactionSource,
    wp53Selection
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp53-vscode-host-owned-self-sandbox-pilot-gate-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.3",
    status: hardFailures.length === 0
      ? "ready-for-wp53-visual-studio-snapshot-mutation-readiness"
      : "blocked-by-wp53-vscode-host-owned-self-sandbox-pilot-gate",
    sourceInputs: [
      {
        phase: "W-P53.2",
        contract: wp53Selection.contract,
        status: wp53Selection.status,
        hardFailureCount: number(wp53Selection.summary?.hardFailureCount),
        selfSandboxCandidateCount: number(wp53Selection.summary?.selfSandboxCandidateCount),
        grantsTargetMutationAuthority: false,
        sourcesContentPolicy: "none"
      }
    ],
    sandboxPolicy: {
      scopeId: HIA_WP53_SELF_SANDBOX_SCOPE_ID,
      workspacePackageName: HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME,
      fixtureLocation: "main-repo-dist-dedicated-synthetic-sandbox",
      userConfigurablePath: false,
      fixtureCreationByExtensionCommand: false,
      symlinkPathSegmentsAllowed: false,
      workspaceTrustRequired: true,
      finalHumanConfirmationRequired: true,
      repeatVersionConflictCheckRequired: true,
      deterministicFormatter: "fixed-fixture-newline-normalization",
      immediateRollbackRequired: true,
      publicAuditRedaction: "metadata-only",
      targetRepositoryMutationAllowed: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false,
      sourcesContentPolicy: "none"
    },
    executionBoundary: {
      fixtureSeedWrittenByEvidenceScript: true,
      fixtureSeedScope: "main-repo-dist-dedicated-synthetic-sandbox",
      actualVscodeExtensionDevelopmentHostExecutionCount: 0,
      actualWorkspaceApplyEditExecutionCount: 0,
      finalHumanConfirmationCaptured: false,
      targetRepositoryAccessed: false,
      targetRepositoryMutationCount: 0,
      providerNetworkExecutedCount: 0,
      lspServerOwnedApplyCount: 0,
      sourceBodyIncludedInEvidence: false,
      rollbackBodyIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      absolutePathIncludedInEvidence: false,
      sourcesContentPolicy: "none"
    },
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      overview: "dist/wp53-vscode-host-owned-self-sandbox-pilot-gate/vscode-host-owned-self-sandbox-pilot-gate.md",
      manualBoundary: "dist/wp53-vscode-host-owned-self-sandbox-pilot-gate/live-host-execution-boundary.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.3 evidence");
  if (hardFailures.length > 0) {
    console.error(`W-P53.3 failed checks: ${hardFailures.map((item) => item.id).join(", ")}`);
  }
  assert.equal(hardFailures.length, 0, `W-P53.3 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  await writeFile(path.join(outputRoot, "vscode-host-owned-self-sandbox-pilot-gate.md"), renderOverview(evidence), "utf8");
  await writeFile(path.join(outputRoot, "live-host-execution-boundary.md"), renderLiveHostBoundary(evidence), "utf8");
  console.log(`W-P53.3 VS Code self-sandbox pilot-gate evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 将唯一 fixture 重置到固定 baseline，并拒绝 symlink sandbox path。
 *
 * @lang en Resets the sole fixture to its fixed baseline and rejects a symlinked sandbox path.
 * @returns {Promise<void>} <lang><zh-CN>仅在受控 `dist` 范围写入 fixture。</zh-CN><en>Writes the fixture only in the controlled `dist` scope.</en></lang>
 */
async function prepareDedicatedSandboxFixture() {
  let inspectedPath = root;
  for (const segment of HIA_WP53_SELF_SANDBOX_RELATIVE_PATH.slice(0, -1)) {
    inspectedPath = path.join(inspectedPath, segment);
    await ensureDirectoryIsNotSymlink(inspectedPath);
  }

  await mkdir(path.dirname(sandboxPath), { recursive: true });
  try {
    if ((await lstat(sandboxPath)).isSymbolicLink()) {
      throw new Error("W-P53 fixture file must not be a symbolic link.");
    }
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/u.test(error.message)) {
      throw error;
    }
  }
  await writeFile(sandboxPath, HIA_WP53_SELF_SANDBOX_INITIAL_TEXT, "utf8");
}

async function ensureDirectoryIsNotSymlink(directoryPath) {
  try {
    const details = await lstat(directoryPath);
    if (details.isSymbolicLink()) {
      throw new Error("W-P53 synthetic sandbox path must not contain a symbolic link.");
    }
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT/u.test(error.message)) {
      throw error;
    }
  }
}

/**
 * 汇总可公开检查的 command、scope 与 host-boundary marker。
 *
 * @lang en Summarizes publicly checkable command, scope, and host-boundary markers.
 */
function summarize({ commandContribution, extensionManifest, extensionSource, transactionSource, wp53Selection }) {
  return {
    phase: "W-P53.3",
    inputEvidenceCount: 1,
    readyInputEvidenceCount: wp53Selection.status === "ready-for-wp53-vscode-host-owned-self-sandbox-pilot-gate" ? 1 : 0,
    inputHardFailureCount: number(wp53Selection.summary?.hardFailureCount),
    selfSandboxCandidateCount: number(wp53Selection.summary?.selfSandboxCandidateCount),
    sandboxFixturePreparedCount: 1,
    sandboxFixtureTextIncludedInEvidenceCount: 0,
    vscodeCommandId: HIA_RUN_WP53_SELF_SANDBOX_PILOT_COMMAND,
    vscodeCommandContributed: Boolean(commandContribution),
    vscodeCommandActivationDeclared: Array.isArray(extensionManifest.activationEvents)
      && extensionManifest.activationEvents.includes(`onCommand:${HIA_RUN_WP53_SELF_SANDBOX_PILOT_COMMAND}`),
    vscodeCommandRegistered: extensionSource.includes("runWp53SelfSandboxPilotCommand")
      && extensionSource.includes("runHiaWp53SelfSandboxPilot"),
    workspaceTrustGuardDeclared: extensionSource.includes("if (!vscode.workspace.isTrusted)"),
    packageIdentityGuardDeclared: transactionSource.includes("HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME"),
    fixedScopeDeclared: transactionSource.includes("HIA_WP53_SELF_SANDBOX_RELATIVE_PATH"),
    symlinkGuardDeclared: extensionSource.includes("resolveHiaWp53SelfSandboxFixturePath")
      && extensionSource.includes("isSymbolicLink"),
    finalModalConfirmationDeclared: extensionSource.includes("Run the W-P53 host-owned self-sandbox apply and immediate rollback?")
      && extensionSource.includes("modal: true"),
    repeatVersionConflictCheckDeclared: transactionSource.includes("isUnchangedBaseline"),
    deterministicFormatterDeclared: transactionSource.includes("formatHiaWp53SelfSandboxText"),
    postApplyValidationDeclared: transactionSource.includes("isExpectedAppliedSnapshot"),
    rollbackDeclared: transactionSource.includes("restoreAfterPostApplyFailure")
      && transactionSource.includes("rollback"),
    redactedAuditDeclared: transactionSource.includes("createHiaWp53SelfSandboxReport"),
    workspaceApplyEditSourceCallCount: countMatches(extensionSource, /\bworkspace\.applyEdit\s*\(/gu),
    workspaceEditConstructionSourceCount: countMatches(extensionSource, /\bnew\s+vscode\.WorkspaceEdit\s*\(/gu),
    workspaceFsWriteFileSourceCount: countMatches(extensionSource, /\bworkspace\.fs\.writeFile\s*\(/gu),
    workspaceCreateFileSourceCount: countMatches(extensionSource, /\bcreateFile\s*\(/gu),
    fixedFixtureSeedByExtensionCommandCount: countMatches(extensionSource, /\bwriteFile\s*\(/gu),
    targetRepositoryMutationCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    providerNetworkExecutedCount: 0,
    actualVscodeExtensionDevelopmentHostExecutionCount: 0,
    actualWorkspaceApplyEditExecutionCount: 0,
    finalHumanConfirmationCapturedCount: 0,
    sourceBodyIncludedCount: 0,
    rollbackBodyIncludedCount: 0,
    digestValueIncludedCount: 0,
    absolutePathIncludedCount: 0,
    sourcesContentPolicy: "none",
    nextStage: "W-P53.4 Visual Studio Snapshot Mutation Readiness"
  };
}

function createChecks(summary) {
  return [
    check("wp53-self-candidate-input-ready", summary.readyInputEvidenceCount === 1
      && summary.inputHardFailureCount === 0
      && summary.selfSandboxCandidateCount === 1,
    "W-P53.2 contributes exactly one ready HIA self-sandbox candidate without target-owner authority."),
    check("dedicated-fixture-scope-ready", summary.sandboxFixturePreparedCount === 1
      && summary.fixedScopeDeclared
      && summary.symlinkGuardDeclared
      && summary.sandboxFixtureTextIncludedInEvidenceCount === 0,
    "The only fixture is pre-seeded under the dedicated main-repo dist sandbox, rejects symlink segments, and its body is absent from evidence."),
    check("host-command-and-trust-ready", summary.vscodeCommandContributed
      && summary.vscodeCommandActivationDeclared
      && summary.vscodeCommandRegistered
      && summary.workspaceTrustGuardDeclared
      && summary.packageIdentityGuardDeclared,
    "A dedicated command is registered only behind Workspace Trust and the fixed main-repo package identity."),
    check("confirmation-conflict-formatter-rollback-ready", summary.finalModalConfirmationDeclared
      && summary.repeatVersionConflictCheckDeclared
      && summary.deterministicFormatterDeclared
      && summary.postApplyValidationDeclared
      && summary.rollbackDeclared
      && summary.redactedAuditDeclared,
    "The host path requires a modal final confirmation, rechecks the fixture version, normalizes the fixed fixture, validates, rolls back, and reports metadata only."),
    check("workspace-apply-is-scoped", summary.workspaceApplyEditSourceCallCount === 1
      && summary.workspaceEditConstructionSourceCount === 1
      && summary.workspaceFsWriteFileSourceCount === 0
      && summary.workspaceCreateFileSourceCount === 0
      && summary.fixedFixtureSeedByExtensionCommandCount === 0,
    "The extension contains one explicit host WorkspaceEdit/apply call and does not create or seed files through workspace APIs."),
    check("no-target-provider-or-live-success-claim", summary.targetRepositoryMutationCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.actualVscodeExtensionDevelopmentHostExecutionCount === 0
      && summary.actualWorkspaceApplyEditExecutionCount === 0
      && summary.finalHumanConfirmationCapturedCount === 0,
    "No target/provider/LSP action is granted and no live VS Code execution or human confirmation is falsely claimed."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.rollbackBodyIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.absolutePathIncludedCount === 0
      && summary.sourcesContentPolicy === "none",
    "Public evidence remains metadata-only and excludes source, rollback, digest, and absolute-path data.")
  ];
}

function findCommandContribution(manifest, commandId) {
  const commands = manifest.contributes?.commands;
  return Array.isArray(commands) ? commands.find((item) => item?.command === commandId) : undefined;
}

function check(id, passed, description) {
  return { id, status: passed ? "pass" : "fail", description };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function number(value) {
  return Number(value ?? 0);
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/") || ".";
}

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P53.3 VS Code Host-Owned Self-Sandbox Pilot Gate

## 中文摘要

W-P53.3 已实现并自动验证一条仅限 HIA 主仓固定 synthetic fixture 的 VS Code
host-owned apply-and-rollback path。命令不接收可配置路径、文本、provider/LSP edit object 或
target repository 指令；它必须通过 Workspace Trust、package identity、固定 fixture baseline、
最终 modal confirmation 与版本重复检查后，才会调用一次 host-owned text WorkspaceEdit，随后
立即验证并以第二次 host-owned text WorkspaceEdit 回滚。

本 evidence 不声称已启动 Extension Development Host、调用实际 \`workspace.applyEdit\` 或
取得最终人工确认；自动测试只覆盖受控 adapter simulation。真实 host run 仍须保留命令内的
modal final confirmation，并在后续具体 live-evidence 决策中单独记录。

## Summary

- status：\`${evidence.status}\`
- ready self-sandbox input / prepared fixture：${summary.readyInputEvidenceCount} / ${summary.sandboxFixturePreparedCount}
- command contributed / registered：${summary.vscodeCommandContributed} / ${summary.vscodeCommandRegistered}
- WorkspaceEdit construction / apply source calls：${summary.workspaceEditConstructionSourceCount} / ${summary.workspaceApplyEditSourceCallCount}
- actual VS Code host execution / apply execution / final human confirmation：${summary.actualVscodeExtensionDevelopmentHostExecutionCount} / ${summary.actualWorkspaceApplyEditExecutionCount} / ${summary.finalHumanConfirmationCapturedCount}
- target mutation / provider-owned apply / LSP-owned apply / provider network：${summary.targetRepositoryMutationCount} / ${summary.providerOwnedApplyCount} / ${summary.lspServerOwnedApplyCount} / ${summary.providerNetworkExecutedCount}
- next stage：\`${summary.nextStage}\`
`;
}

function renderLiveHostBoundary(evidence) {
  return `# W-P53.3 Live Host Execution Boundary

## 中文摘要

自动化范围到此为止：fixture 已在主仓 \`dist\` 合成范围中复位，代码和 adapter simulation
已验证，但没有启动 VS Code Extension Development Host，也没有让自动化替代最终人工确认。

若后续进入具体 live capture，必须：

- 在受信任的 HIA 主仓工作区运行 \`HIA: Run W-P53 Self-Sandbox Pilot\`；
- 使用命令自己的 modal \`Apply and Roll Back\` 作为最后确认；
- 只验证固定 fixture 的 apply、post-validation 和 immediate rollback，不改变目标项目；
- 只记录 metadata-only audit，不记录 fixture/body/version/digest/absolute path；
- 任何失败、拒绝或 conflict 都应保留为 stopped/blocked result，不能升级为真实试点成功。

当前 status：\`${evidence.status}\`；actual VS Code host execution：\`${evidence.executionBoundary.actualVscodeExtensionDevelopmentHostExecutionCount}\`；final human confirmation captured：\`${evidence.executionBoundary.finalHumanConfirmationCaptured}\`。
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
  assert(!serialized.includes(HIA_WP53_SELF_SANDBOX_INITIAL_TEXT), `${label} must not include the synthetic fixture body.`);
}
