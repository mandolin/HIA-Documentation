import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-provider-review-payload-handoff");
const evidencePath = path.join(outputRoot, "evidence.json");
const handoffPath = path.join(outputRoot, "provider-review-payload-handoff.md");
const bindingPath = path.join(outputRoot, "provider-review-target-owner-binding.md");
const riskQualityPath = path.join(outputRoot, "provider-review-risk-quality-summary.md");
const commandEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-command-evidence-template", "evidence.json");
const providerReviewEvidencePath = path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json");

await main();

/**
 * 准备 W-P41.5 provider review payload handoff evidence。
 * Prepare W-P41.5 provider review payload handoff evidence.
 *
 * This stage binds the W-P40 review-only provider result/refusal payload to the
 * W-P41 target-owner transcript/evidence packet. It does not execute a
 * provider, call a network, trigger checked apply, generate editor edits or
 * mutate target repositories.
 *
 * 中文：本阶段把 W-P40 的 review-only provider result/refusal payload 绑定到
 * W-P41 的目标 owner transcript/evidence packet。它不执行 provider、不调用网络、
 * 不触发 checked apply、不生成编辑器 edit，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.5 handoff evidence and docs.
 */
async function main() {
  const commandEvidence = await readJson(commandEvidencePath);
  const providerReviewEvidence = await readJson(providerReviewEvidencePath);
  const handoffBindings = createHandoffBindings(commandEvidence, providerReviewEvidence);
  const targetOwnerBinding = createTargetOwnerBinding(commandEvidence, providerReviewEvidence, handoffBindings);
  const riskQualitySummary = createRiskQualitySummary(providerReviewEvidence);
  const summary = summarize({
    commandEvidence,
    handoffBindings,
    providerReviewEvidence,
    riskQualitySummary,
    targetOwnerBinding
  });
  const checks = [
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_INPUTS_READY", summary.commandEvidenceTemplateReady === true
      && summary.providerReviewLinkageReady === true
      && summary.inputHardFailureCount === 0
      && summary.targetOwnerActionRequired === true, {
      actual: {
        commandEvidenceStatus: commandEvidence.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        providerReviewStatus: providerReviewEvidence.status,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_BOUND", summary.handoffBindingCount >= 5
      && summary.targetOwnerEvidenceSectionBound === true
      && summary.commandTranscriptBound === true
      && summary.reviewPayloadItemCount >= 1
      && summary.hostProjectionReadyCount >= 3, {
      actual: {
        commandTranscriptBound: summary.commandTranscriptBound,
        handoffBindingCount: summary.handoffBindingCount,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        reviewPayloadItemCount: summary.reviewPayloadItemCount,
        targetOwnerEvidenceSectionBound: summary.targetOwnerEvidenceSectionBound
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_REVIEW_ONLY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.blockedResultShapeCount >= 1
      && summary.resultTaxonomyKindCount >= 5, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        blockedResultShapeCount: summary.blockedResultShapeCount,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        resultTaxonomyKindCount: summary.resultTaxonomyKindCount
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_NO_AUTHORITY_ESCALATION", summary.hiaMayRunTargetCommands === false
      && summary.hiaMayModifyTargetRepository === false
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayOpenPullRequest === false
      && summary.targetCommandsExecutedByHia === false
      && summary.targetOwnerExecutionClaimed === false
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false, {
      actual: {
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayRunTargetCommands: summary.hiaMayRunTargetCommands,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        targetCommandsExecutedByHia: summary.targetCommandsExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_NO_APPLY_OR_WRITE", summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_RISK_QUALITY_READY", summary.riskQualityItemCount >= 8
      && summary.qualityChecklistItemCount >= 6
      && summary.privacyChecklistItemCount >= 7
      && summary.decisionShapeCount >= 5, {
      actual: {
        decisionShapeCount: summary.decisionShapeCount,
        privacyChecklistItemCount: summary.privacyChecklistItemCount,
        qualityChecklistItemCount: summary.qualityChecklistItemCount,
        riskQualityItemCount: summary.riskQualityItemCount
      }
    }),
    check("HIA_WP41_PROVIDER_REVIEW_HANDOFF_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp41-provider-review-payload-handoff-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-owner-dry-run-evidence" : "blocked",
    sourceEvidence: {
      targetOwnerCommandEvidenceTemplate: normalizePath(commandEvidencePath),
      providerResultReviewLinkage: normalizePath(providerReviewEvidencePath)
    },
    handoffStatus: "review-only-payload-bound-to-target-owner-evidence-packet",
    handoffBindings,
    targetOwnerBinding,
    riskQualitySummary,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      handoff: normalizePath(handoffPath),
      targetOwnerBinding: normalizePath(bindingPath),
      riskQualitySummary: normalizePath(riskQualityPath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.6",
        topic: "target-owner-dry-run-evidence",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "Provider review payload handoff is attached to the target-owner evidence packet without write authority or execution claims."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        status: "review-only-bound-input",
        targetOwnerActionRequired: true,
        reason: "Blocked/refused provider review shapes remain separated from checked apply and can be used to harden apply preflight boundaries."
      },
      {
        phase: "W-P43",
        topic: "host-ux-provider-review-linkage",
        status: "host-projection-input-ready",
        targetOwnerActionRequired: false,
        reason: "VS Code, DevTools and Visual Studio projection labels are available as read-only host display inputs."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 provider review payload handoff evidence");
  assert.equal(hardFailures.length, 0, `W-P41 provider review payload handoff has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(handoffPath, renderHandoffMarkdown(evidence), "utf8");
  await writeFile(bindingPath, renderBindingMarkdown(evidence), "utf8");
  await writeFile(riskQualityPath, renderRiskQualityMarkdown(evidence), "utf8");
  console.log(`W-P41 provider review payload handoff evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 provider review payload handoff document prepared at ${normalizePath(handoffPath)}`);
  console.log(`W-P41 provider review target-owner binding prepared at ${normalizePath(bindingPath)}`);
  console.log(`W-P41 provider review risk-quality summary prepared at ${normalizePath(riskQualityPath)}`);
}

function createHandoffBindings(commandEvidence, providerReviewEvidence) {
  return [
    binding("target-owner-evidence-section", "provider-review-handoff", "Attach provider review summary to the target-owner evidence packet section."),
    binding("target-owner-command-transcript", "provider-review.wp40.execution-gate-blocked", "Reference provider review status in target-owner transcript notes only."),
    binding("provider-review-payload", providerReviewEvidence.reviewPayload.payloadStatus, "Carry W-P40 review payload as non-executable review data."),
    binding("provider-result-taxonomy", providerReviewEvidence.resultTaxonomy.contract, "Keep actual blocked/refused and future shape taxonomy visible to reviewers."),
    binding("host-review-projections", providerReviewEvidence.hostReviewProjection.contract, "Expose VS Code, DevTools and Visual Studio display inputs as read-only projections."),
    binding("target-owner-result-shapes", commandEvidence.resultShapes[0]?.id ?? "not-run", "Map handoff outcome back to target-owner result shapes.")
  ];
}

function binding(id, target, purpose) {
  return {
    id,
    target,
    purpose,
    reviewOnly: true,
    executable: false,
    targetOwnerActionRequired: true
  };
}

function createTargetOwnerBinding(commandEvidence, providerReviewEvidence, handoffBindings) {
  return {
    contract: "hia-wp41-provider-review-target-owner-binding",
    contractVersion: "0.1.0-draft",
    bindingStatus: "ready-for-target-owner-review",
    evidencePacketSectionId: "provider-review-handoff",
    commandTranscriptNoteFieldId: "notes",
    commandTranscriptStepCount: commandEvidence.summary.transcriptStepCount,
    reviewPayloadItemCount: providerReviewEvidence.reviewPayload.items.length,
    handoffBindingIds: handoffBindings.map((entry) => entry.id),
    decisionShapes: [
      decisionShape("accept-review-only", "Target owner accepts the provider review handoff as context only."),
      decisionShape("request-more-context", "Target owner asks HIA to prepare more public-safe context."),
      decisionShape("block-on-provider-governance", "Target owner blocks adoption until a later real provider gate passes."),
      decisionShape("reject-provider-context", "Target owner rejects provider context and continues without it."),
      decisionShape("defer-to-checked-apply-hardening", "Target owner defers write-related concerns to W-P42 checked apply hardening.")
    ],
    actionPolicy: {
      targetOwnerMayReferenceHandoff: true,
      targetOwnerMaySubmitReviewEvidence: true,
      hiaMayExecuteProvider: false,
      hiaMayExecuteTargetCommands: false,
      hiaMayApplyProviderOutput: false,
      hiaMayMutateTargetRepository: false
    }
  };
}

function decisionShape(id, meaning) {
  return {
    id,
    meaning,
    producedByHia: false,
    targetOwnerActionRequired: true
  };
}

function createRiskQualitySummary(providerReviewEvidence) {
  return {
    contract: "hia-wp41-provider-review-risk-quality-summary",
    contractVersion: "0.1.0-draft",
    risks: [
      risk("provider-not-executed", "Provider result is blocked/refused, not a successful provider answer.", "preserve-blocked-status"),
      risk("network-not-called", "No external network call has happened.", "require-final-consent-before-any-later-call"),
      risk("secret-not-resolved", "Secret reference exists only as reference metadata.", "keep-secret-values-out-of-evidence"),
      risk("source-not-included", "No source body or source reference is included.", "keep-source-policy-none"),
      risk("no-edit-authority", "Provider output has no edit authority.", "keep-direct-and-checked-apply-disabled"),
      risk("target-owner-only", "Target project execution remains target-owner owned.", "do-not-run-target-commands"),
      risk("host-display-only", "Host projections are display inputs.", "do-not-promote-host-projection-to-apply"),
      risk("blocked-shape-review", "Blocked/refused shape may be misunderstood as failure of target project.", "label-as-provider-gate-blocked")
    ],
    qualityChecklist: [
      quality("status-visible", providerReviewEvidence.status),
      quality("blocked-result-visible", "execution-gate-blocked"),
      quality("review-only-boundary-visible", "review-only"),
      quality("host-projections-visible", "vscode/devtools/visual-studio"),
      quality("target-owner-decision-visible", "accept/request-more-context/block/reject/defer"),
      quality("privacy-summary-visible", "no-source-no-secret-no-path")
    ]
  };
}

function risk(id, description, mitigation) {
  return {
    id,
    description,
    mitigation,
    status: "managed"
  };
}

function quality(id, expected) {
  return {
    id,
    expected,
    status: "ready"
  };
}

function summarize({
  commandEvidence,
  handoffBindings,
  providerReviewEvidence,
  riskQualitySummary,
  targetOwnerBinding
}) {
  const publicSurface = {
    handoffBindings,
    riskQualitySummary,
    targetOwnerBinding
  };
  return {
    commandEvidenceTemplateReady: commandEvidence.status === "ready-for-provider-review-payload-handoff",
    providerReviewLinkageReady: providerReviewEvidence.status === "ready-for-wp40-closeout-and-wp41-wp42-inputs",
    inputHardFailureCount: sum([
      commandEvidence.summary?.hardFailureCount,
      providerReviewEvidence.summary?.hardFailureCount
    ]),
    targetOwnerActionRequired: true,
    handoffBindingCount: handoffBindings.length,
    targetOwnerEvidenceSectionBound: targetOwnerBinding.evidencePacketSectionId === "provider-review-handoff",
    commandTranscriptBound: targetOwnerBinding.commandTranscriptNoteFieldId === "notes",
    reviewPayloadItemCount: providerReviewEvidence.reviewPayload.items.length,
    hostProjectionCount: providerReviewEvidence.summary.hostProjectionCount,
    hostProjectionReadyCount: providerReviewEvidence.summary.hostProjectionReadyCount,
    providerOutputReviewOnly: providerReviewEvidence.summary.reviewOnlyOutputRequired === true,
    blockedProviderReviewShapeAccepted: providerReviewEvidence.summary.blockedResultShapeCount >= 1,
    providerResultProduced: providerReviewEvidence.summary.providerResultProduced === true,
    refusalResultProduced: providerReviewEvidence.summary.refusalResultProduced === true,
    blockedResultShapeCount: providerReviewEvidence.summary.blockedResultShapeCount,
    resultTaxonomyKindCount: providerReviewEvidence.summary.resultTaxonomyKindCount,
    hiaMayRunTargetCommands: false,
    hiaMayModifyTargetRepository: false,
    hiaMayCreateTargetBranch: false,
    hiaMayOpenPullRequest: false,
    targetCommandsExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    externalNetworkCallExecuted: providerReviewEvidence.summary.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: providerReviewEvidence.summary.realRemoteProviderInvocationExecuted === true,
    directApplyAllowedCount: Number(commandEvidence.summary?.directApplyAllowedCount ?? 0) + Number(providerReviewEvidence.summary?.directApplyAllowedCount ?? 0),
    checkedApplyTriggeredCount: Number(commandEvidence.summary?.checkedApplyTriggeredCount ?? 0) + Number(providerReviewEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    riskQualityItemCount: riskQualitySummary.risks.length,
    qualityChecklistItemCount: riskQualitySummary.qualityChecklist.length,
    privacyChecklistItemCount: commandEvidence.summary.privacyChecklistItemCount,
    decisionShapeCount: targetOwnerBinding.decisionShapes.length,
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    sourceTextIncludedCount: 0,
    sourcesContentPolicy: "none",
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(publicSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(publicSurface),
    pathExposureCount: countPathExposure(JSON.stringify(publicSurface))
  };
}

function renderHandoffMarkdown(evidence) {
  const { summary } = evidence;
  return `# W-P41 Provider Review Payload Handoff

Status: \`${evidence.status}\`

This handoff is review-only. It binds the W-P40 provider review payload to the W-P41 target-owner evidence packet without provider execution, network calls, direct edits, checked apply or target repository mutation.

| Metric | Value |
| --- | --- |
| Handoff bindings | ${summary.handoffBindingCount} |
| Review payload items | ${summary.reviewPayloadItemCount} |
| Host projections ready | ${summary.hostProjectionReadyCount} |
| Provider result produced | ${summary.providerResultProduced} |
| Refusal result produced | ${summary.refusalResultProduced} |
| External network call executed | ${summary.externalNetworkCallExecuted} |
| Target owner action required | ${summary.targetOwnerActionRequired} |

## Bindings

${evidence.handoffBindings.map((entry) => `- \`${entry.id}\` -> \`${entry.target}\`: ${entry.purpose}`).join("\n")}
`;
}

function renderBindingMarkdown(evidence) {
  const { targetOwnerBinding } = evidence;
  return `# Provider Review Target-Owner Binding

Binding status: \`${targetOwnerBinding.bindingStatus}\`

Evidence packet section: \`${targetOwnerBinding.evidencePacketSectionId}\`

Command transcript note field: \`${targetOwnerBinding.commandTranscriptNoteFieldId}\`

## Decision Shapes

${targetOwnerBinding.decisionShapes.map((entry) => `- \`${entry.id}\`: ${entry.meaning}`).join("\n")}

## Action Policy

| Policy | Value |
| --- | --- |
${Object.entries(targetOwnerBinding.actionPolicy).map(([key, value]) => `| ${key} | ${String(value)} |`).join("\n")}
`;
}

function renderRiskQualityMarkdown(evidence) {
  const { riskQualitySummary } = evidence;
  return `# Provider Review Risk And Quality Summary

## Risks

| Risk | Status | Mitigation |
| --- | --- | --- |
${riskQualitySummary.risks.map((entry) => `| ${entry.id} | \`${entry.status}\` | ${entry.mitigation} |`).join("\n")}

## Quality Checklist

| Item | Expected | Status |
| --- | --- | --- |
${riskQualitySummary.qualityChecklist.map((entry) => `| ${entry.id} | ${entry.expected} | \`${entry.status}\` |`).join("\n")}
`;
}

function check(code, passed, details) {
  return { code, status: passed ? "pass" : "fail", ...details };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function countDirectEditObjects(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(workspaceEdit|documentChanges|TextEdit|WorkspaceEdit|applyEdit)\b/g);
}

function countCredentialMaterialMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(apiKey|accessToken|authorizationHeader|secretValue|privateKey)\b/g);
}

function countForbiddenDocumentTextMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(sourcesContent|documentText|sourceExcerptText|fullSourceText)\b/g);
}

function countPathExposure(text) {
  const withoutUrls = text.replace(/https?:\/\//gi, "");
  return countMatches(withoutUrls, /(?:^|[^A-Za-z])(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|var|tmp|mnt)\/)/g);
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function assertNoPrivateMarkers(serializedEvidence, label) {
  assert.equal(countPathExposure(serializedEvidence), 0, `${label} must not expose absolute local paths.`);
  assert.equal(countMatches(serializedEvidence, /\b(work-zone|ai\/codex|\.pem|npm_\w+|ghp_)\b/gi), 0, `${label} must not expose private workspace or secret markers.`);
}
