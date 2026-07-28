/**
 * W-P53 VS Code 专用 self-sandbox 的固定范围标识。
 *
 * @lang en Fixed scope identifier for the W-P53 VS Code self-sandbox.
 */
export const HIA_WP53_SELF_SANDBOX_SCOPE_ID = "hia-main-repo-wp53-vscode-self-sandbox";

/**
 * 允许执行此试点的主仓 package 身份；它不是可配置的工作区参数。
 *
 * @lang en Main-repository package identity allowed to run this pilot; this is not a configurable workspace parameter.
 */
export const HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME = "hia-documentation-sys-main";

/**
 * W-P53 fixture 相对主仓根目录的固定位置。
 *
 * @lang en Fixed W-P53 fixture location relative to the main-repository root.
 */
export const HIA_WP53_SELF_SANDBOX_RELATIVE_PATH = [
  "dist",
  "wp53-vscode-host-owned-self-sandbox-pilot",
  "controlled-sandbox.md"
] as const;

/**
 * 合成 fixture 的唯一初始内容。
 *
 * 中文：此文本只在受控 `dist` fixture 与宿主内存中存在；public-safe evidence、输出通道和
 * audit report 均不得序列化它。
 * @lang en This text exists only in the controlled `dist` fixture and host memory; public-safe
 * evidence, output channels, and audit reports must never serialize it.
 */
export const HIA_WP53_SELF_SANDBOX_INITIAL_TEXT = "<!-- HIA W-P53 controlled self-sandbox fixture. -->\n";

const HIA_WP53_SELF_SANDBOX_APPLY_MARKER = "<!-- HIA W-P53 checked-apply marker. -->\n";

/**
 * 由 host 读取的私有 document snapshot。
 *
 * @lang en Private document snapshot read by the host.
 */
export interface HiaWp53SelfSandboxSnapshot {
  /** 对宿主不透明的文档句柄；不得向 provider、LSP 或 public evidence 泄露。 */
  readonly handle: unknown;
  /** 此 snapshot 所属的固定合成沙盒范围。 */
  readonly scopeId: string;
  /** 宿主文档版本，用于最终确认后的重复冲突检查。 */
  readonly version: number;
  /** 仅在宿主内存中使用的正文；不得出现在结果或日志中。 */
  readonly text: string;
}

/**
 * W-P53 checked-apply host adapter 所需的最小能力。
 *
 * 中文：adapter 只可读取指定 fixture、取得一次最终确认，并对该 snapshot 执行全量文本替换。
 * 它不接受自由路径、provider edit object、LSP edit object 或 target repository 指令。
 * @lang en Minimal capabilities required by the W-P53 checked-apply host adapter. The adapter
 * may only read the designated fixture, obtain one final confirmation, and replace the complete
 * text of that snapshot. It accepts no free-form path, provider/LSP edit object, or target-repo instruction.
 */
export interface HiaWp53SelfSandboxHost {
  readonly workspaceTrusted: boolean;
  getWorkspacePackageName(): Promise<string | undefined>;
  readSandboxSnapshot(): Promise<HiaWp53SelfSandboxSnapshot>;
  requestFinalConfirmation(): Promise<boolean>;
  replaceSandboxText(
    snapshot: HiaWp53SelfSandboxSnapshot,
    nextText: string,
    intent: "apply" | "rollback"
  ): Promise<boolean>;
}

/**
 * 只含 metadata 的 host-owned sandbox 交易结果。
 *
 * @lang en Metadata-only result of a host-owned sandbox transaction.
 */
export interface HiaWp53SelfSandboxResult {
  readonly outcome:
    | "completed-and-rolled-back"
    | "blocked-untrusted-workspace"
    | "blocked-workspace-identity"
    | "blocked-fixture-preflight"
    | "cancelled-final-confirmation"
    | "blocked-version-conflict"
    | "apply-rejected-by-host"
    | "failed-post-apply-validation-rolled-back"
    | "failed-post-apply-validation-rollback-failed"
    | "rollback-rejected-by-host"
    | "rollback-validation-failed";
  readonly workspaceTrust: "trusted" | "untrusted";
  readonly workspaceIdentity: "verified" | "not-checked" | "rejected";
  readonly fixturePreflight: "verified" | "not-checked" | "rejected";
  readonly finalConfirmation: "accepted" | "cancelled" | "not-requested";
  readonly conflictRecheck: "clear" | "conflict" | "not-run";
  readonly applyStatus: "applied" | "rejected" | "not-run";
  readonly formatter: "deterministic-fixed-fixture-normalization" | "not-run";
  readonly postApplyValidation: "passed" | "failed" | "not-run";
  readonly rollbackStatus: "restored" | "rejected" | "validation-failed" | "not-run";
  readonly workspaceApplyAttemptCount: number;
  readonly targetRepositoryMutationCount: 0;
  readonly providerOwnedApplyCount: 0;
  readonly lspServerOwnedApplyCount: 0;
  readonly sourceBodyIncludedInResult: false;
  readonly digestValueIncludedInResult: false;
  readonly absolutePathIncludedInResult: false;
  readonly sourcesContentPolicy: "none";
}

/**
 * 执行一次仅限 W-P53 固定 fixture 的 host-owned apply + rollback 交易。
 *
 * 中文：先验证 Workspace Trust、主仓身份与严格 fixture baseline；再取得一次 modal final
 * confirmation，并在写入前重复读取版本/正文。成功 apply 后必须马上验证并回滚为原始 fixture。
 * 所有正文、版本细节和绝对路径只留在 host 内存，返回值仅保留安全的状态 metadata。
 * @lang en Executes one host-owned apply + rollback transaction limited to the fixed W-P53
 * fixture. It validates Workspace Trust, main-repo identity, and the strict fixture baseline;
 * obtains one modal final confirmation; then re-reads version/text before applying. A successful
 * apply must be validated and immediately rolled back. Text, version details, and absolute paths
 * remain in host memory; the result retains safe status metadata only.
 * @param host <lang><zh-CN>提供受限 VS Code host 操作的 adapter。</zh-CN><en>Adapter providing restricted VS Code host operations.</en></lang>
 * @returns <lang><zh-CN>不含正文或路径的交易状态。</zh-CN><en>Transaction status without text or paths.</en></lang>
 */
export async function runHiaWp53SelfSandboxTransaction(
  host: HiaWp53SelfSandboxHost
): Promise<HiaWp53SelfSandboxResult> {
  if (!host.workspaceTrusted) {
    return createResult({
      outcome: "blocked-untrusted-workspace",
      workspaceTrust: "untrusted"
    });
  }

  const workspacePackageName = await host.getWorkspacePackageName();
  if (workspacePackageName !== HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME) {
    return createResult({
      outcome: "blocked-workspace-identity",
      workspaceIdentity: "rejected"
    });
  }

  const baseline = await host.readSandboxSnapshot();
  if (!isExpectedBaseline(baseline)) {
    return createResult({
      outcome: "blocked-fixture-preflight",
      workspaceIdentity: "verified",
      fixturePreflight: "rejected"
    });
  }

  const confirmed = await host.requestFinalConfirmation();
  if (!confirmed) {
    return createResult({
      outcome: "cancelled-final-confirmation",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "cancelled"
    });
  }

  const rechecked = await host.readSandboxSnapshot();
  if (!isUnchangedBaseline(baseline, rechecked)) {
    return createResult({
      outcome: "blocked-version-conflict",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "conflict"
    });
  }

  const formattedAppliedText = formatHiaWp53SelfSandboxText(rechecked.text);
  const applied = await host.replaceSandboxText(rechecked, formattedAppliedText, "apply");
  if (!applied) {
    return createResult({
      outcome: "apply-rejected-by-host",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "clear",
      applyStatus: "rejected",
      workspaceApplyAttemptCount: 1
    });
  }

  const appliedSnapshot = await host.readSandboxSnapshot();
  if (!isExpectedAppliedSnapshot(rechecked, appliedSnapshot, formattedAppliedText)) {
    return restoreAfterPostApplyFailure(host, baseline.text, appliedSnapshot, 1);
  }

  const rolledBack = await host.replaceSandboxText(appliedSnapshot, baseline.text, "rollback");
  if (!rolledBack) {
    return createResult({
      outcome: "rollback-rejected-by-host",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "clear",
      applyStatus: "applied",
      formatter: "deterministic-fixed-fixture-normalization",
      postApplyValidation: "passed",
      rollbackStatus: "rejected",
      workspaceApplyAttemptCount: 2
    });
  }

  const restoredSnapshot = await host.readSandboxSnapshot();
  if (!isExpectedRestoredSnapshot(appliedSnapshot, restoredSnapshot, baseline.text)) {
    return createResult({
      outcome: "rollback-validation-failed",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "clear",
      applyStatus: "applied",
      formatter: "deterministic-fixed-fixture-normalization",
      postApplyValidation: "passed",
      rollbackStatus: "validation-failed",
      workspaceApplyAttemptCount: 2
    });
  }

  return createResult({
    outcome: "completed-and-rolled-back",
    workspaceIdentity: "verified",
    fixturePreflight: "verified",
    finalConfirmation: "accepted",
    conflictRecheck: "clear",
    applyStatus: "applied",
    formatter: "deterministic-fixed-fixture-normalization",
    postApplyValidation: "passed",
    rollbackStatus: "restored",
    workspaceApplyAttemptCount: 2
  });
}

/**
 * 生成可在 VS Code output channel 显示的 public-safe audit 摘要。
 *
 * @lang en Creates a public-safe audit summary suitable for the VS Code output channel.
 * @param result <lang><zh-CN>host-owned 交易结果。</zh-CN><en>Host-owned transaction result.</en></lang>
 * @returns <lang><zh-CN>不包含正文、摘要值或绝对路径的显示行。</zh-CN><en>Display lines without text, digests, or absolute paths.</en></lang>
 */
export function createHiaWp53SelfSandboxReport(result: HiaWp53SelfSandboxResult): readonly string[] {
  return [
    "W-P53 VS Code host-owned self-sandbox pilot:",
    "Scope: dedicated main-repo synthetic sandbox only",
    `Workspace Trust: ${result.workspaceTrust}`,
    `Workspace identity: ${result.workspaceIdentity}`,
    `Fixture preflight: ${result.fixturePreflight}`,
    `Final confirmation: ${result.finalConfirmation}`,
    `Version/conflict recheck: ${result.conflictRecheck}`,
    `Workspace apply attempt count: ${result.workspaceApplyAttemptCount}`,
    `Apply status: ${result.applyStatus}`,
    `Formatter: ${result.formatter}`,
    `Post-apply validation: ${result.postApplyValidation}`,
    `Rollback: ${result.rollbackStatus}`,
    `Outcome: ${result.outcome}`,
    "Target repository mutation: disabled",
    "Provider-owned apply: disabled",
    "LSP server-owned apply: disabled",
    "Source body, digest and absolute path: not included",
    "sourcesContent policy: none"
  ];
}

function isExpectedBaseline(snapshot: HiaWp53SelfSandboxSnapshot): boolean {
  return snapshot.scopeId === HIA_WP53_SELF_SANDBOX_SCOPE_ID
    && snapshot.version >= 1
    && snapshot.text === HIA_WP53_SELF_SANDBOX_INITIAL_TEXT;
}

function isUnchangedBaseline(
  baseline: HiaWp53SelfSandboxSnapshot,
  rechecked: HiaWp53SelfSandboxSnapshot
): boolean {
  return isExpectedBaseline(rechecked)
    && baseline.version === rechecked.version
    && baseline.text === rechecked.text;
}

function isExpectedAppliedSnapshot(
  baseline: HiaWp53SelfSandboxSnapshot,
  applied: HiaWp53SelfSandboxSnapshot,
  expectedText: string
): boolean {
  return applied.scopeId === HIA_WP53_SELF_SANDBOX_SCOPE_ID
    && applied.version > baseline.version
    && applied.text === expectedText;
}

function isExpectedRestoredSnapshot(
  applied: HiaWp53SelfSandboxSnapshot,
  restored: HiaWp53SelfSandboxSnapshot,
  expectedText: string
): boolean {
  return restored.scopeId === HIA_WP53_SELF_SANDBOX_SCOPE_ID
    && restored.version > applied.version
    && restored.text === expectedText;
}

async function restoreAfterPostApplyFailure(
  host: HiaWp53SelfSandboxHost,
  initialText: string,
  appliedSnapshot: HiaWp53SelfSandboxSnapshot,
  previousApplyAttemptCount: number
): Promise<HiaWp53SelfSandboxResult> {
  if (appliedSnapshot.scopeId !== HIA_WP53_SELF_SANDBOX_SCOPE_ID) {
    return createResult({
      outcome: "failed-post-apply-validation-rollback-failed",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "clear",
      applyStatus: "applied",
      formatter: "deterministic-fixed-fixture-normalization",
      postApplyValidation: "failed",
      workspaceApplyAttemptCount: previousApplyAttemptCount
    });
  }

  const rolledBack = await host.replaceSandboxText(appliedSnapshot, initialText, "rollback");
  if (!rolledBack) {
    return createResult({
      outcome: "failed-post-apply-validation-rollback-failed",
      workspaceIdentity: "verified",
      fixturePreflight: "verified",
      finalConfirmation: "accepted",
      conflictRecheck: "clear",
      applyStatus: "applied",
      formatter: "deterministic-fixed-fixture-normalization",
      postApplyValidation: "failed",
      rollbackStatus: "rejected",
      workspaceApplyAttemptCount: previousApplyAttemptCount + 1
    });
  }

  const restored = await host.readSandboxSnapshot();
  const restoredCorrectly = isExpectedRestoredSnapshot(appliedSnapshot, restored, initialText);
  return createResult({
    outcome: restoredCorrectly
      ? "failed-post-apply-validation-rolled-back"
      : "failed-post-apply-validation-rollback-failed",
    workspaceIdentity: "verified",
    fixturePreflight: "verified",
    finalConfirmation: "accepted",
    conflictRecheck: "clear",
    applyStatus: "applied",
    formatter: "deterministic-fixed-fixture-normalization",
    postApplyValidation: "failed",
    rollbackStatus: restoredCorrectly ? "restored" : "validation-failed",
    workspaceApplyAttemptCount: previousApplyAttemptCount + 1
  });
}

function formatHiaWp53SelfSandboxText(text: string): string {
  return `${text.replaceAll("\r\n", "\n").replace(/\n*$/u, "\n")}${HIA_WP53_SELF_SANDBOX_APPLY_MARKER}`;
}

function createResult(
  overrides: Partial<Omit<HiaWp53SelfSandboxResult, "targetRepositoryMutationCount" | "providerOwnedApplyCount" | "lspServerOwnedApplyCount" | "sourceBodyIncludedInResult" | "digestValueIncludedInResult" | "absolutePathIncludedInResult" | "sourcesContentPolicy">>
): HiaWp53SelfSandboxResult {
  return {
    outcome: "blocked-fixture-preflight",
    workspaceTrust: "trusted",
    workspaceIdentity: "not-checked",
    fixturePreflight: "not-checked",
    finalConfirmation: "not-requested",
    conflictRecheck: "not-run",
    applyStatus: "not-run",
    formatter: "not-run",
    postApplyValidation: "not-run",
    rollbackStatus: "not-run",
    workspaceApplyAttemptCount: 0,
    targetRepositoryMutationCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    sourceBodyIncludedInResult: false,
    digestValueIncludedInResult: false,
    absolutePathIncludedInResult: false,
    sourcesContentPolicy: "none",
    ...overrides
  };
}
