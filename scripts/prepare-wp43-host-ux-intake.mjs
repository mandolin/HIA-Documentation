import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-host-ux-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const intakeSummaryPath = path.join(outputRoot, "host-owned-apply-ux-intake.md");
const surfaceRequirementsPath = path.join(outputRoot, "host-surface-requirements.md");
const wp42CloseoutPath = path.join(rootDir, "dist", "wp42-closeout-wp43-inputs", "evidence.json");
const wp42ProjectionPath = path.join(rootDir, "dist", "wp42-multi-host-contract-projection", "evidence.json");
const wp41CloseoutPath = path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs", "evidence.json");
const wp40ProviderReviewPath = path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json");

await main();

/**
 * 准备 W-P43.1 host-owned apply UX intake evidence。
 * Prepare W-P43.1 host-owned apply UX intake evidence.
 *
 * This stage consumes W-P42 closeout inputs and turns them into host-visible
 * UX requirements for provider-reviewed checked apply. It prepares a surface
 * contract only; it does not enable checked-apply writes, call editor APIs,
 * execute providers, run target commands or mutate target repositories.
 *
 * 中文：本阶段消费 W-P42 closeout 输入，并将其转为 provider-reviewed checked apply
 * 的宿主可见 UX 需求。它只准备 surface contract，不启用 checked apply 写入、不调用
 * 编辑器 API、不执行 provider、不运行目标命令，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.1 intake evidence and surface requirements.
 */
async function main() {
  const inputs = await readInputs();
  const uxRequirements = createUxRequirements(inputs.wp42Closeout);
  const providerReviewDisplayRules = createProviderReviewDisplayRules();
  const targetOwnerDisplayRules = createTargetOwnerDisplayRules();
  const hostSurfaces = createHostSurfaces(uxRequirements);
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    hostSurfaces,
    inputs,
    providerReviewDisplayRules,
    targetOwnerDisplayRules,
    uxRequirements
  });
  const checks = [
    check("HIA_WP43_HOST_UX_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0
      && summary.wp42CloseoutReady === true
      && summary.multiHostProjectionReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        multiHostProjectionReady: summary.multiHostProjectionReady,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp42CloseoutReady: summary.wp42CloseoutReady
      }
    }),
    check("HIA_WP43_HOST_UX_REQUIREMENTS_READY", summary.uxRequirementCount >= 8
      && summary.readyUxRequirementCount === summary.uxRequirementCount
      && summary.coveredWp43InputTopicCount === 6
      && summary.hostSurfaceCount === 3
      && summary.readyHostSurfaceCount === 3, {
      actual: {
        coveredWp43InputTopicCount: summary.coveredWp43InputTopicCount,
        hostSurfaceCount: summary.hostSurfaceCount,
        readyHostSurfaceCount: summary.readyHostSurfaceCount,
        readyUxRequirementCount: summary.readyUxRequirementCount,
        uxRequirementCount: summary.uxRequirementCount
      }
    }),
    check("HIA_WP43_PROVIDER_TARGET_LINKAGE_REVIEW_ONLY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerReviewDisplayRuleCount >= 5
      && summary.targetOwnerActionRequired === true
      && summary.targetOwnerDisplayRuleCount >= 4
      && summary.targetOwnerExecutionClaimed === false, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerReviewDisplayRuleCount: summary.providerReviewDisplayRuleCount,
        targetOwnerActionRequired: summary.targetOwnerActionRequired,
        targetOwnerDisplayRuleCount: summary.targetOwnerDisplayRuleCount,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed
      }
    }),
    check("HIA_WP43_HOST_UX_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabled === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.actualRuntimeCaptureExecutedCount === 0
      && summary.hostEditorApiCallCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_HOST_UX_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourceReferenceIncludedCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-host-owned-apply-ux-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-host-surface-contract" : "blocked",
    sourceEvidence: {
      wp42Closeout: normalizePath(wp42CloseoutPath),
      wp42Projection: normalizePath(wp42ProjectionPath),
      wp41Closeout: normalizePath(wp41CloseoutPath),
      wp40ProviderReview: normalizePath(wp40ProviderReviewPath)
    },
    intakeContract: {
      phase: "W-P43.1",
      topic: "host-owned-apply-ux-intake",
      surfacePolicy: "host-visible-review-only-before-write",
      checkedApplyWriteEnabledByThisStage: false,
      sourcesContentPolicy: "none"
    },
    uxRequirements,
    providerReviewDisplayRules,
    targetOwnerDisplayRules,
    hostSurfaces,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      intakeSummary: normalizePath(intakeSummaryPath),
      surfaceRequirements: normalizePath(surfaceRequirementsPath)
    },
    manualChecks: [
      "Confirm W-P43.2 implements these requirements as host-visible UX before any write-enabled path.",
      "Confirm provider result/refusal remains review-only and never becomes a direct edit object.",
      "Confirm target-owner actions remain target-owner executed and are not claimed by HIA automation.",
      "Confirm checked apply write remains deferred until an explicit later host-owned write stage."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 host UX intake evidence");
  assert.equal(hardFailures.length, 0, `W-P43 host UX intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(intakeSummaryPath, renderIntakeSummary(evidence), "utf8");
  await writeFile(surfaceRequirementsPath, renderSurfaceRequirements(evidence), "utf8");
  console.log(`W-P43 host UX intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 host UX intake summary prepared at ${normalizePath(intakeSummaryPath)}`);
  console.log(`W-P43 host surface requirements prepared at ${normalizePath(surfaceRequirementsPath)}`);
}

async function readInputs() {
  return {
    wp42Closeout: await readJson(wp42CloseoutPath),
    wp42Projection: await readJson(wp42ProjectionPath),
    wp41Closeout: await readJson(wp41CloseoutPath),
    wp40ProviderReview: await readJson(wp40ProviderReviewPath)
  };
}

function createUxRequirements(wp42Closeout) {
  const closeoutTopics = new Map(wp42Closeout.wp43Inputs.map((item) => [item.topic, item.description]));
  return [
    requirement("host-owned-apply-ux", closeoutTopics.get("host-owned-apply-ux"), "required-before-host-surface"),
    requirement("provider-review-linkage", closeoutTopics.get("provider-review-linkage"), "required-before-host-surface"),
    requirement("target-owner-evidence-view", closeoutTopics.get("target-owner-evidence-view"), "required-before-host-surface"),
    requirement("rollback-formatter-audit-panel", closeoutTopics.get("rollback-formatter-audit-panel"), "required-before-host-surface"),
    requirement("multi-host-read-only-projection", closeoutTopics.get("multi-host-read-only-projection"), "required-before-host-surface"),
    requirement("deferred-write-gate-banner", closeoutTopics.get("deferred-write-gate-banner"), "required-before-host-surface"),
    requirement("final-human-confirmation-state", "Show final confirmation as unavailable until all preflight gates pass.", "required-before-write-enabled-followup"),
    requirement("privacy-source-policy-state", "Show sourcesContent policy and source-body default-deny state without exposing private material.", "required-before-host-surface")
  ];
}

function requirement(id, description, readiness) {
  return {
    id,
    description,
    readiness,
    status: "ready-requirement",
    hostOwned: true,
    writeAuthorityGranted: false
  };
}

function createProviderReviewDisplayRules() {
  return [
    displayRule("provider-state", "Show blocked/refused/success/failure/rate-limit provider state as review context only."),
    displayRule("provider-origin", "Show provider origin and review item binding without credential values."),
    displayRule("provider-risk-quality", "Show risk and quality signals as review metadata only."),
    displayRule("provider-no-direct-edit", "Deny direct edit objects, WorkspaceEdit shapes and apply triggers from provider output."),
    displayRule("provider-no-network-claim", "Do not claim provider/network execution when evidence only contains blocked or prepared states.")
  ];
}

function createTargetOwnerDisplayRules() {
  return [
    displayRule("target-owner-action-required", "Show that local sandbox, branch, PR and commands are target-owner actions."),
    displayRule("target-owner-evidence-completeness", "Show packet completeness without claiming target execution."),
    displayRule("target-owner-command-transcript-slot", "Reserve transcript/result slots for target-owner submitted evidence."),
    displayRule("target-owner-no-mutation", "Deny any HIA-owned target mutation, push, branch or PR claim.")
  ];
}

function displayRule(id, description) {
  return {
    id,
    description,
    status: "ready-display-rule",
    writeAuthorityGranted: false
  };
}

function createHostSurfaces(uxRequirements) {
  return [
    hostSurface("vscode", "VS Code Extension", "review-action-panel", uxRequirements),
    hostSurface("devtools", "Chrome DevTools Extension", "browser-devtools-panel", uxRequirements),
    hostSurface("visual-studio", "Visual Studio Extension", "review-surface-contract", uxRequirements)
  ];
}

function hostSurface(id, label, surface, uxRequirements) {
  return {
    id,
    label,
    surface,
    status: "surface-contract-ready",
    uxRequirementRefs: uxRequirements.map((item) => item.id),
    providerReviewLinkageVisible: true,
    targetOwnerEvidenceVisible: true,
    deferredGateVisible: true,
    checkedApplyWriteEnabled: false,
    hostEditorApiCalled: false,
    actualRuntimeCaptureExecuted: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directEditObjectProduced: false,
    providerNetworkExecuted: false,
    targetCommandsExecutedByHia: false,
    sourcesContentPolicy: "none"
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P43.2",
      topic: "vscode-host-owned-apply-ux-surface",
      status: "ready-input",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P43.3",
      topic: "devtools-visual-studio-host-ux-surface",
      status: "ready-input",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P43.4",
      topic: "provider-review-linkage-panel",
      status: "ready-input",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ hostSurfaces, inputs, providerReviewDisplayRules, targetOwnerDisplayRules, uxRequirements }) {
  const summaries = [
    inputs.wp42Closeout.summary,
    inputs.wp42Projection.summary,
    inputs.wp41Closeout.summary,
    inputs.wp40ProviderReview.summary
  ];
  const expectedInputStatuses = [
    ["wp42Closeout", "ready-for-wp43-host-owned-apply-ux-inputs"],
    ["wp42Projection", "ready-for-wp42-closeout-and-wp43-inputs"],
    ["wp41Closeout", "ready-for-wp42-checked-apply-hardening-and-wp43-host-ux-inputs"],
    ["wp40ProviderReview", "ready-for-wp40-closeout-and-wp41-wp42-inputs"]
  ];
  return {
    inputEvidenceCount: expectedInputStatuses.length,
    readyInputEvidenceCount: expectedInputStatuses.filter(([key, status]) => inputs[key].status === status).length,
    inputHardFailureCount: summaries.reduce((total, summary) => total + number(summary?.hardFailureCount), 0),
    wp42CloseoutReady: inputs.wp42Closeout.status === "ready-for-wp43-host-owned-apply-ux-inputs",
    multiHostProjectionReady: inputs.wp42Projection.status === "ready-for-wp42-closeout-and-wp43-inputs",
    uxRequirementCount: uxRequirements.length,
    readyUxRequirementCount: uxRequirements.filter((item) => item.status === "ready-requirement").length,
    coveredWp43InputTopicCount: inputs.wp42Closeout.wp43Inputs.filter((item) => uxRequirements.some((requirementItem) => requirementItem.id === item.topic)).length,
    providerReviewDisplayRuleCount: providerReviewDisplayRules.length,
    targetOwnerDisplayRuleCount: targetOwnerDisplayRules.length,
    hostSurfaceCount: hostSurfaces.length,
    readyHostSurfaceCount: hostSurfaces.filter((item) => item.status === "surface-contract-ready").length,
    providerOutputReviewOnly: inputs.wp41Closeout.summary?.providerOutputReviewOnly === true
      || inputs.wp40ProviderReview.summary?.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: inputs.wp41Closeout.summary?.blockedProviderReviewShapeAccepted === true
      || inputs.wp40ProviderReview.summary?.blockedProviderReviewShapeAccepted === true,
    targetOwnerActionRequired: inputs.wp41Closeout.summary?.targetOwnerActionRequired === true,
    targetOwnerExecutionClaimed: inputs.wp41Closeout.summary?.targetOwnerExecutionClaimed === true,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowedCount: maxSummary(summaries, "workspaceWriteAllowedCount"),
    targetRepositoryMutationCount: maxSummary(summaries, "targetRepositoryMutationCount"),
    checkedApplyTriggeredCount: maxSummary(summaries, "checkedApplyTriggeredCount"),
    directApplyAllowedCount: maxSummary(summaries, "directApplyAllowedCount"),
    directEditObjectCount: maxSummary(summaries, "directEditObjectCount"),
    providerNetworkExecutedCount: maxSummary(summaries, "providerNetworkExecutedCount"),
    targetCommandExecutedByHiaCount: maxSummary(summaries, "targetCommandExecutedByHiaCount"),
    actualRuntimeCaptureExecutedCount: maxSummary(summaries, "actualRuntimeCaptureExecutedCount"),
    hostEditorApiCallCount: maxSummary(summaries, "hostEditorApiCallCount"),
    sourceBodyIncludedInEvidence: summaries.some((summary) => summary?.sourceBodyIncludedInEvidence === true),
    sourceReferenceIncludedCount: maxSummary(summaries, "sourceReferenceIncludedCount"),
    documentContentIncludedInEvidenceCount: maxSummary(summaries, "documentContentIncludedInEvidenceCount"),
    digestValueIncludedInEvidenceCount: maxSummary(summaries, "digestValueIncludedInEvidenceCount"),
    credentialValueIncludedCount: maxSummary(summaries, "credentialValueIncludedCount"),
    forbiddenDocumentTextMarkerCount: maxSummary(summaries, "forbiddenDocumentTextMarkerCount"),
    pathExposureCount: maxSummary(summaries, "pathExposureCount"),
    sourcesContentPolicy: summaries.every((summary) => summary?.sourcesContentPolicy === undefined || summary?.sourcesContentPolicy === "none") ? "none" : "mixed"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function maxSummary(summaries, fieldName) {
  return Math.max(...summaries.map((summary) => number(summary?.[fieldName])));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderIntakeSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.1 Host UX Intake

## Summary

- status: \`${evidence.status}\`
- input evidence: ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount} ready
- UX requirements: ${summary.readyUxRequirementCount} / ${summary.uxRequirementCount} ready
- host surfaces: ${summary.readyHostSurfaceCount} / ${summary.hostSurfaceCount} ready
- provider review-only: ${summary.providerOutputReviewOnly}
- target-owner action required: ${summary.targetOwnerActionRequired}
- checked apply write enabled: ${summary.checkedApplyWriteEnabled}
- workspace write / target mutation / checked apply trigger / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P43.2 can project these requirements into the VS Code host surface without enabling write authority.
`;
}

function renderSurfaceRequirements(evidence) {
  return `# W-P43 Host Surface Requirements

## UX Requirements

${evidence.uxRequirements.map((item) => `- ${item.id}: ${item.description}`).join("\n")}

## Provider Review Display Rules

${evidence.providerReviewDisplayRules.map((item) => `- ${item.id}: ${item.description}`).join("\n")}

## Target-Owner Display Rules

${evidence.targetOwnerDisplayRules.map((item) => `- ${item.id}: ${item.description}`).join("\n")}

## Host Surfaces

${evidence.hostSurfaces.map((item) => `- ${item.id}: ${item.surface}, ${item.status}`).join("\n")}
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])work-zone(?:[\\/]|$)/i,
    /(?:^|[\\/])Users[\\/]/i,
    /"sourcesContent"\s*:/i,
    /sk-[A-Za-z0-9_-]{8,}/,
    /ghp_[A-Za-z0-9_]{8,}/,
    /npm_[A-Za-z0-9_]{8,}/
  ];
  const hit = forbidden.find((pattern) => pattern.test(serialized));
  assert.equal(hit, undefined, `${label} contains a forbidden private marker: ${hit}`);
}
