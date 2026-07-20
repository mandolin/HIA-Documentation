import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-checked-apply-baseline-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const wp34CloseoutPath = path.join(rootDir, "dist", "wp34-closeout-provider-inputs", "evidence.json");
const wp36CloseoutPath = path.join(rootDir, "dist", "wp36-closeout-checked-apply-inputs", "evidence.json");

await main();

/**
 * 准备 W-P37.1 checked apply continuation baseline audit。
 * Prepare W-P37.1 checked apply continuation baseline audit.
 *
 * The audit converts W-P34 apply-preview and W-P36 provider-governance closeouts
 * into host-owned checked-apply requirements. It records the contract boundary
 * before any implementation can read, modify or write workspace files.
 *
 * 本审计将 W-P34 apply-preview 与 W-P36 provider-governance closeout 转成宿主
 * 拥有的 checked-apply 要求。在任何实现读取、修改或写入 workspace 文件之前，
 * 先固定 contract 边界。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const wp34Closeout = await readJson(wp34CloseoutPath);
  const wp36Closeout = await readJson(wp36CloseoutPath);
  const baseline = createCheckedApplyBaseline();
  const hostMatrix = createHostMatrix();
  const safetyGates = createSafetyGates();
  const nextStageInputs = createNextStageInputs();
  const summary = {
    wp34CloseoutReady: wp34Closeout.status === "ready-for-wp35-provider-integration-first-slice",
    wp34HardFailureCount: Number(wp34Closeout.summary?.hardFailureCount ?? -1),
    wp34HostApplyStillDisabled: wp34Closeout.summary?.hostApplyStillDisabled,
    wp34ProviderGateReady: wp34Closeout.summary?.providerGateReady,
    wp34DirectEditObjectCount: Number(wp34Closeout.summary?.directEditObjectCount ?? -1),
    wp34TargetRepositoryMutationCount: Number(wp34Closeout.summary?.targetRepositoryMutationCount ?? -1),
    wp36CloseoutReady: wp36Closeout.status === "ready-for-wp37-checked-apply-continuation",
    wp36HardFailureCount: Number(wp36Closeout.summary?.hardFailureCount ?? -1),
    wp36CheckedApplyInputCount: Number(wp36Closeout.summary?.checkedApplyContinuationInputCount ?? 0),
    wp36RealProviderContinuationInputCount: Number(wp36Closeout.summary?.realProviderContinuationInputCount ?? 0),
    wp36CheckedApplyEnabled: wp36Closeout.summary?.checkedApplyEnabledInWp36,
    wp36RemoteProviderInvocationEnabled: wp36Closeout.summary?.remoteProviderInvocationEnabledInWp36,
    wp36TargetRepositoryMutationCount: Number(wp36Closeout.summary?.targetRepositoryMutationCount ?? -1),
    hostOwnedApplyRequired: baseline.ownership.hostOwnedApplyRequired,
    providerOwnedApplyAllowed: baseline.ownership.providerOwnedApplyAllowed,
    lspServerOwnedApplyAllowed: baseline.ownership.lspServerOwnedApplyAllowed,
    directWorkspaceEditAllowedBeforeHostApproval: baseline.ownership.directWorkspaceEditAllowedBeforeHostApproval,
    humanApprovalRequired: baseline.preconditions.humanApprovalRecordRequired,
    hostFileReadRequired: baseline.preconditions.hostFileReadRequired,
    fileVersionRequired: baseline.preconditions.fileVersionRequired,
    conflictCheckRequired: baseline.preconditions.conflictCheckRequired,
    rollbackRecordRequired: baseline.preconditions.rollbackRecordRequired,
    formatterValidationRequired: baseline.preconditions.formatterValidationRequired,
    applyAuditRecordRequired: baseline.preconditions.applyAuditRecordRequired,
    providerOutputPolicy: baseline.providerSeparation.providerOutputPolicy,
    providerOutputMayBeWorkspaceEdit: baseline.providerSeparation.providerOutputMayBeWorkspaceEdit,
    sourceBodyAllowedInEvidence: baseline.privacy.sourceBodyAllowedInEvidence,
    sourcesContentAllowedInEvidence: baseline.privacy.sourcesContentAllowedInEvidence,
    secretValueAllowedInEvidence: baseline.privacy.secretValueAllowedInEvidence,
    targetRepositoryMutationAllowedBeforeConsent: baseline.targetBoundary.targetRepositoryMutationAllowedBeforeConsent,
    hostSurfaceCount: hostMatrix.length,
    hostSurfaceInputReadyCount: hostMatrix.filter((host) => host.inputReady).length,
    checkedApplyEnabledHostCount: hostMatrix.filter((host) => host.checkedApplyEnabled).length,
    writeEnabledHostCount: hostMatrix.filter((host) => host.workspaceWriteEnabled).length,
    safetyGateCount: safetyGates.length,
    blockingSafetyGateCount: safetyGates.filter((gate) => gate.status === "blocking-before-write").length,
    nextStageInputCount: nextStageInputs.length
  };
  const checks = [
    check("HIA_WP37_BASELINE_INPUTS_READY", summary.wp34CloseoutReady === true
      && summary.wp34HardFailureCount === 0
      && summary.wp36CloseoutReady === true
      && summary.wp36HardFailureCount === 0
      && summary.wp36CheckedApplyInputCount >= 12, {
      actual: {
        wp34CloseoutReady: summary.wp34CloseoutReady,
        wp34HardFailureCount: summary.wp34HardFailureCount,
        wp36CheckedApplyInputCount: summary.wp36CheckedApplyInputCount,
        wp36CloseoutReady: summary.wp36CloseoutReady,
        wp36HardFailureCount: summary.wp36HardFailureCount
      }
    }),
    check("HIA_WP37_BASELINE_HOST_OWNED_APPLY", summary.hostOwnedApplyRequired === true
      && summary.providerOwnedApplyAllowed === false
      && summary.lspServerOwnedApplyAllowed === false
      && summary.directWorkspaceEditAllowedBeforeHostApproval === false, {
      actual: {
        directWorkspaceEditAllowedBeforeHostApproval: summary.directWorkspaceEditAllowedBeforeHostApproval,
        hostOwnedApplyRequired: summary.hostOwnedApplyRequired,
        lspServerOwnedApplyAllowed: summary.lspServerOwnedApplyAllowed,
        providerOwnedApplyAllowed: summary.providerOwnedApplyAllowed
      }
    }),
    check("HIA_WP37_BASELINE_PRECONDITIONS_DECLARED", summary.humanApprovalRequired === true
      && summary.hostFileReadRequired === true
      && summary.fileVersionRequired === true
      && summary.conflictCheckRequired === true
      && summary.rollbackRecordRequired === true
      && summary.formatterValidationRequired === true
      && summary.applyAuditRecordRequired === true, {
      actual: {
        applyAuditRecordRequired: summary.applyAuditRecordRequired,
        conflictCheckRequired: summary.conflictCheckRequired,
        fileVersionRequired: summary.fileVersionRequired,
        formatterValidationRequired: summary.formatterValidationRequired,
        hostFileReadRequired: summary.hostFileReadRequired,
        humanApprovalRequired: summary.humanApprovalRequired,
        rollbackRecordRequired: summary.rollbackRecordRequired
      }
    }),
    check("HIA_WP37_BASELINE_PROVIDER_SEPARATION", summary.wp34ProviderGateReady === true
      && summary.wp34HostApplyStillDisabled === true
      && summary.wp34DirectEditObjectCount === 0
      && summary.wp36CheckedApplyEnabled === false
      && summary.wp36RemoteProviderInvocationEnabled === false
      && summary.providerOutputPolicy === "review-payload-augmentation-only"
      && summary.providerOutputMayBeWorkspaceEdit === false, {
      actual: {
        providerOutputMayBeWorkspaceEdit: summary.providerOutputMayBeWorkspaceEdit,
        providerOutputPolicy: summary.providerOutputPolicy,
        wp34DirectEditObjectCount: summary.wp34DirectEditObjectCount,
        wp34HostApplyStillDisabled: summary.wp34HostApplyStillDisabled,
        wp34ProviderGateReady: summary.wp34ProviderGateReady,
        wp36CheckedApplyEnabled: summary.wp36CheckedApplyEnabled,
        wp36RemoteProviderInvocationEnabled: summary.wp36RemoteProviderInvocationEnabled
      }
    }),
    check("HIA_WP37_BASELINE_PRIVACY_AND_TARGET_BOUNDARY", summary.sourceBodyAllowedInEvidence === false
      && summary.sourcesContentAllowedInEvidence === false
      && summary.secretValueAllowedInEvidence === false
      && summary.targetRepositoryMutationAllowedBeforeConsent === false
      && summary.wp34TargetRepositoryMutationCount === 0
      && summary.wp36TargetRepositoryMutationCount === 0, {
      actual: {
        secretValueAllowedInEvidence: summary.secretValueAllowedInEvidence,
        sourceBodyAllowedInEvidence: summary.sourceBodyAllowedInEvidence,
        sourcesContentAllowedInEvidence: summary.sourcesContentAllowedInEvidence,
        targetRepositoryMutationAllowedBeforeConsent: summary.targetRepositoryMutationAllowedBeforeConsent,
        wp34TargetRepositoryMutationCount: summary.wp34TargetRepositoryMutationCount,
        wp36TargetRepositoryMutationCount: summary.wp36TargetRepositoryMutationCount
      }
    }),
    check("HIA_WP37_BASELINE_HOSTS_STILL_PREVIEW_ONLY", summary.hostSurfaceCount === 3
      && summary.hostSurfaceInputReadyCount === 3
      && summary.checkedApplyEnabledHostCount === 0
      && summary.writeEnabledHostCount === 0, {
      actual: {
        checkedApplyEnabledHostCount: summary.checkedApplyEnabledHostCount,
        hostSurfaceCount: summary.hostSurfaceCount,
        hostSurfaceInputReadyCount: summary.hostSurfaceInputReadyCount,
        writeEnabledHostCount: summary.writeEnabledHostCount
      }
    }),
    check("HIA_WP37_BASELINE_NEXT_STAGE_INPUTS_READY", summary.safetyGateCount >= 8
      && summary.blockingSafetyGateCount >= 8
      && summary.nextStageInputCount >= 6
      && nextStageInputs.includes("host-edit-transaction-contract"), {
      actual: {
        blockingSafetyGateCount: summary.blockingSafetyGateCount,
        nextStageInputs,
        safetyGateCount: summary.safetyGateCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-checked-apply-baseline-audit",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-host-edit-transaction-contract" : "blocked",
    sourceEvidence: {
      wp34Closeout: normalizePath(wp34CloseoutPath),
      wp36Closeout: normalizePath(wp36CloseoutPath)
    },
    references: [
      {
        id: "vscode-workspace-apply-edit",
        source: "https://code.visualstudio.com/api/references/vscode-api",
        relevance: "VS Code exposes WorkspaceEdit and workspace.applyEdit as host-side edit APIs."
      },
      {
        id: "lsp-workspace-apply-edit",
        source: "https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/",
        relevance: "LSP models WorkspaceEdit and workspace/applyEdit as client-applied workspace changes."
      },
      {
        id: "vscode-workspace-trust",
        source: "https://code.visualstudio.com/api/extension-guides/workspace-trust",
        relevance: "Workspace trust is a required host-side safety input before risky workspace operations."
      },
      {
        id: "visual-studio-extensibility-editor",
        source: "https://learn.microsoft.com/en-us/dotnet/api/microsoft.visualstudio.extensibility.editor",
        relevance: "Visual Studio editor extensibility exposes immutable document snapshots and editor surfaces for host-side integration."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    baseline,
    hostMatrix,
    safetyGates,
    nextStageInputs,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.2",
        topic: "host-edit-transaction-contract",
        reason: "W-P37.1 proves inputs and boundaries are ready, but the transaction envelope itself is still missing."
      },
      {
        phase: "W-P37.3",
        topic: "file-read-version-conflict-result",
        reason: "Checked apply cannot proceed until host-owned file snapshots and conflict checks are explicit."
      },
      {
        phase: "W-P37.4",
        topic: "rollback-formatter-audit",
        reason: "Every accepted edit needs rollback, formatting and audit records before write authority can be tested."
      }
    ],
    manualChecks: [
      "Confirm no W-P37 stage lets provider output become a WorkspaceEdit directly.",
      "Confirm file reads, conflict checks and writes are always host-owned operations.",
      "Confirm target projects remain read-only unless they explicitly absorb central notify instructions in their own workflow.",
      "Confirm remote provider smoke remains separate from checked apply implementation."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 checked apply baseline audit evidence");
  assert.equal(hardFailures.length, 0, `W-P37 checked apply baseline audit has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 checked apply baseline audit evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createCheckedApplyBaseline() {
  return {
    contract: "hia-checked-apply-baseline",
    contractVersion: "0.1.0-draft",
    ownership: {
      hostOwnedApplyRequired: true,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false,
      directWorkspaceEditAllowedBeforeHostApproval: false,
      applyAuthority: "host-after-human-approval-and-preflight"
    },
    preconditions: {
      humanApprovalRecordRequired: true,
      hostFileReadRequired: true,
      fileVersionRequired: true,
      conflictCheckRequired: true,
      rollbackRecordRequired: true,
      formatterValidationRequired: true,
      workspaceTrustOrTargetConsentRequired: true,
      applyAuditRecordRequired: true
    },
    providerSeparation: {
      providerOutputPolicy: "review-payload-augmentation-only",
      providerOutputMayBeWorkspaceEdit: false,
      providerMayBypassHostPreflight: false,
      providerProvenanceMustRemainAttached: true
    },
    privacy: {
      sourceBodyAllowedInEvidence: false,
      sourcesContentAllowedInEvidence: false,
      secretValueAllowedInEvidence: false,
      sourceExcerptPolicyRecheckRequired: true
    },
    targetBoundary: {
      targetRepositoryMutationAllowedBeforeConsent: false,
      centralNotifyPolicy: "central-notify-pull",
      directTargetRepoWriteByHiaAutomation: false
    }
  };
}

function createHostMatrix() {
  return [
    createHost("vscode", true, false, false, "WorkspaceEdit only after W-P37 transaction/preflight/confirmation."),
    createHost("devtools", true, false, false, "DevTools remains preview/review only; inspected page handoff is not write authority."),
    createHost("visual-studio", true, false, false, "Visual Studio skeleton remains input-ready; real editor write path needs later VS-specific evidence.")
  ];
}

function createHost(id, inputReady, checkedApplyEnabled, workspaceWriteEnabled, note) {
  return {
    id,
    inputReady,
    checkedApplyEnabled,
    workspaceWriteEnabled,
    note
  };
}

function createSafetyGates() {
  return [
    createGate("human-approval-record"),
    createGate("host-owned-file-read"),
    createGate("file-version-result"),
    createGate("conflict-result"),
    createGate("semantic-edit-transaction"),
    createGate("rollback-record"),
    createGate("formatter-post-apply-validation"),
    createGate("apply-audit-record"),
    createGate("provider-provenance-retention"),
    createGate("source-excerpt-policy-recheck")
  ];
}

function createGate(id) {
  return {
    id,
    status: "blocking-before-write"
  };
}

function createNextStageInputs() {
  return [
    "host-edit-transaction-contract",
    "file-read-version-conflict-result",
    "rollback-record-contract",
    "formatter-post-apply-validation-contract",
    "apply-audit-record-contract",
    "vscode-checked-apply-confirmation-slice"
  ];
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/(?:^|[\s"'({\[])[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
  assert(!/(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u.test(serialized), `${label} must not include token-looking values.`);
}
