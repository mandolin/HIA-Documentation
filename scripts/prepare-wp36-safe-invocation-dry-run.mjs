import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeterministicMockProvider } from "../packages/provider-mock/dist/index.js";
import {
  runHiaLocalProvider,
  validateHiaProviderRunnerResult
} from "../packages/provider-runner/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-safe-invocation-dry-run");
const evidencePath = path.join(outputRoot, "evidence.json");
const sourcePrivacyEvidencePath = path.join(rootDir, "dist", "wp36-source-excerpt-privacy-gate", "evidence.json");

await main();

/**
 * 准备 W-P36.6 safe invocation dry-run evidence。
 * Prepare W-P36.6 safe invocation dry-run evidence.
 *
 * The dry-run executes the deterministic local provider through the provider
 * runner and records only review payload augmentation. It also records the
 * remote/API path as blocked, proving that W-P36.6 does not use real secrets,
 * external network calls, source bodies or writable apply authority.
 *
 * 本 dry-run 通过 provider runner 执行 deterministic local provider，并只记录
 * review payload augmentation。同时将 remote/API 路径记录为 blocked，证明
 * W-P36.6 不使用真实 secret、不调用外部网络、不传源码正文、不开放写入能力。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const sourcePrivacy = await readJson(sourcePrivacyEvidencePath);
  const provider = createDeterministicMockProvider({
    generatedAt: "2026-07-21T00:00:00.000Z"
  });
  const reviewPayload = createReviewPayload();
  const runnerResult = await runHiaLocalProvider({
    provider,
    requestId: "wp36-safe-invocation-dry-run",
    reviewPayload,
    locales: ["zh-CN", "en"],
    profileIds: ["jsdoc", "dotnetdoc"]
  });
  const repeatedRunnerResult = await runHiaLocalProvider({
    provider,
    requestId: "wp36-safe-invocation-dry-run",
    reviewPayload,
    locales: ["zh-CN", "en"],
    profileIds: ["jsdoc", "dotnetdoc"]
  });
  const runnerDiagnostics = validateHiaProviderRunnerResult(runnerResult);
  const repeatedRunnerDiagnostics = validateHiaProviderRunnerResult(repeatedRunnerResult);
  const directEditObjectCount = countDirectEditObjects(runnerResult);
  const sourceBodyMarkerCount = countSourceBodyMarkers(runnerResult);
  const secretValueMarkerCount = countSecretValueMarkers(runnerResult);
  const deterministicOutputStable = stableOutputSignature(runnerResult) === stableOutputSignature(repeatedRunnerResult);
  const remoteInvocationDecision = createRemoteInvocationDecision(sourcePrivacy);
  const summary = {
    sourcePrivacyReady: sourcePrivacy.status === "ready-for-safe-invocation-dry-run",
    providerId: provider.descriptor.id,
    providerRuntimeKind: provider.descriptor.runtimeKind,
    providerNetworkAccess: provider.descriptor.capabilities.networkAccess,
    runnerStatus: runnerResult.status,
    runnerDiagnosticErrorCount: runnerDiagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    repeatedRunnerDiagnosticErrorCount: repeatedRunnerDiagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    draftOutputCount: runnerResult.reviewPayloadAugmentation.draftOutputs.length,
    reviewMetadataCount: runnerResult.reviewPayloadAugmentation.reviewMetadata.length,
    refusalOutputCount: runnerResult.reviewPayloadAugmentation.refusalOutputs.length,
    reviewItemBindingCount: runnerResult.reviewPayloadAugmentation.reviewItemBindings.length,
    directEditObjectCount,
    sourceBodyMarkerCount,
    secretValueMarkerCount,
    workspaceWriteAllowed: runnerResult.actionPolicy.workspaceWriteAllowed,
    targetRepositoryMutationAllowed: runnerResult.actionPolicy.targetRepositoryMutationAllowed,
    toolExecutionAllowed: runnerResult.actionPolicy.toolExecutionAllowed,
    directApplyAllowed: runnerResult.actionPolicy.directApplyAllowed,
    requiresHumanReview: runnerResult.actionPolicy.requiresHumanReview,
    sourceExcerptPolicy: runnerResult.privacy.sourceExcerptPolicy,
    sourcesContentPolicy: runnerResult.privacy.sourcesContentPolicy,
    includesSourceBody: runnerResult.privacy.includesSourceBody,
    includesSourcesContent: runnerResult.privacy.includesSourcesContent,
    deterministicOutputStable,
    externalNetworkCallExecuted: remoteInvocationDecision.externalNetworkCallExecuted,
    remoteProviderInvocationStatus: remoteInvocationDecision.status
  };
  const checks = [
    check("HIA_WP36_SAFE_INVOCATION_PRIVACY_READY", summary.sourcePrivacyReady === true
      && sourcePrivacy.summary?.hardFailureCount === 0, {
      actual: {
        hardFailureCount: sourcePrivacy.summary?.hardFailureCount,
        sourcePrivacyStatus: sourcePrivacy.status
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_RUNNER_SUCCESS", summary.runnerStatus === "success"
      && summary.runnerDiagnosticErrorCount === 0
      && summary.draftOutputCount >= 4
      && summary.reviewMetadataCount >= 4
      && summary.reviewItemBindingCount >= 2, {
      actual: {
        draftOutputCount: summary.draftOutputCount,
        reviewItemBindingCount: summary.reviewItemBindingCount,
        reviewMetadataCount: summary.reviewMetadataCount,
        runnerDiagnosticErrorCount: summary.runnerDiagnosticErrorCount,
        runnerStatus: summary.runnerStatus
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_DETERMINISTIC", summary.deterministicOutputStable === true
      && summary.repeatedRunnerDiagnosticErrorCount === 0, {
      actual: {
        deterministicOutputStable: summary.deterministicOutputStable,
        repeatedRunnerDiagnosticErrorCount: summary.repeatedRunnerDiagnosticErrorCount
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_NO_WRITE_AUTHORITY", summary.directApplyAllowed === false
      && summary.workspaceWriteAllowed === false
      && summary.targetRepositoryMutationAllowed === false
      && summary.toolExecutionAllowed === false
      && summary.requiresHumanReview === true, {
      actual: {
        directApplyAllowed: summary.directApplyAllowed,
        requiresHumanReview: summary.requiresHumanReview,
        targetRepositoryMutationAllowed: summary.targetRepositoryMutationAllowed,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_NO_PRIVATE_PAYLOAD", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && summary.sourceExcerptPolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && summary.includesSourceBody === false
      && summary.includesSourcesContent === false, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        includesSourceBody: summary.includesSourceBody,
        includesSourcesContent: summary.includesSourcesContent,
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        sourceExcerptPolicy: summary.sourceExcerptPolicy,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_REMOTE_STILL_BLOCKED", summary.externalNetworkCallExecuted === false
      && summary.remoteProviderInvocationStatus === "blocked-before-real-remote-call", {
      actual: {
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        remoteProviderInvocationStatus: summary.remoteProviderInvocationStatus
      }
    }),
    check("HIA_WP36_SAFE_INVOCATION_PROVIDER_OFFLINE", summary.providerRuntimeKind === "deterministic-mock"
      && summary.providerNetworkAccess === "disabled", {
      actual: {
        providerId: summary.providerId,
        providerNetworkAccess: summary.providerNetworkAccess,
        providerRuntimeKind: summary.providerRuntimeKind
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-safe-invocation-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp36-closeout-and-checked-apply-inputs" : "blocked",
    sourceEvidence: {
      sourceExcerptPrivacyGate: normalizePath(sourcePrivacyEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    safeInvocation: {
      provider: runnerResult.reviewPayloadAugmentation.provider,
      providerResultRef: runnerResult.reviewPayloadAugmentation.providerResultRef,
      reviewPayloadAugmentationContract: runnerResult.reviewPayloadAugmentation.contract,
      reviewPayloadAugmentationVersion: runnerResult.reviewPayloadAugmentation.contractVersion,
      sourceReviewPayloadRef: runnerResult.reviewPayloadAugmentation.sourceReviewPayloadRef,
      actionPolicy: runnerResult.actionPolicy,
      privacy: runnerResult.privacy
    },
    outputs: {
      draftOutputs: runnerResult.reviewPayloadAugmentation.draftOutputs,
      reviewMetadata: runnerResult.reviewPayloadAugmentation.reviewMetadata,
      refusalOutputs: runnerResult.reviewPayloadAugmentation.refusalOutputs,
      reviewItemBindings: runnerResult.reviewPayloadAugmentation.reviewItemBindings
    },
    remoteInvocationDecision,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.7",
        topic: "closeout-and-checked-apply-inputs",
        reason: "W-P36.6 proves a safe dry-run can produce review augmentation without secrets, network calls, source bodies or write authority."
      },
      {
        phase: "W-P37",
        topic: "checked-apply-continuation",
        reason: "Provider outputs remain review-only; checked apply still needs a separate host-owned contract."
      }
    ],
    manualChecks: [
      "Confirm future real provider dry-runs keep the same no-write and review-only output boundary.",
      "Confirm any remote-provider smoke uses host network mediation and redacted audit records before execution.",
      "Confirm checked apply remains separate from provider runner output."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 safe invocation dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P36 safe invocation dry-run has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 safe invocation dry-run evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createReviewPayload() {
  return {
    contract: "hia-documentation-review-payload",
    contractVersion: "0.1.0-draft",
    id: "wp36-safe-review-payload",
    payloadKind: "documentation-review",
    proposalCount: 2,
    draftCount: 2,
    aiContextPackageRef: {
      contract: "hia-ai-context-package",
      contractVersion: "0.1.0-draft",
      packageId: "wp36-safe-context-package",
      sourceExcerptPolicy: "none"
    },
    privacy: {
      includesSourceBody: false,
      sourcesContentPolicy: "none",
      sourceExcerptPolicy: "none"
    },
    actionPolicy: {
      requiresHumanReview: true,
      directApplyAllowed: false
    },
    items: [
      {
        id: "wp36-item-jsdoc-lang",
        kind: "missing-documentation",
        proposalId: "proposal-jsdoc-lang",
        title: "Canonical language marker review",
        status: "ready-for-review"
      },
      {
        id: "wp36-item-dotnet-summary",
        kind: "missing-translation",
        proposalId: "proposal-dotnet-summary",
        title: "DotNet summary locale review",
        status: "ready-for-review"
      }
    ]
  };
}

function createRemoteInvocationDecision(sourcePrivacy) {
  return {
    contract: "hia-provider-remote-invocation-decision",
    contractVersion: "0.1.0-draft",
    providerId: "remote-api-provider-template",
    status: "blocked-before-real-remote-call",
    externalNetworkCallExecuted: false,
    secretValueUsed: false,
    sourceBodyUsed: false,
    reasons: [
      "W-P36.6 uses deterministic mock provider for executable dry-run.",
      "Remote/API provider remains blocked until a separately approved mediated smoke exists.",
      `Source privacy gate status: ${sourcePrivacy.status}.`
    ]
  };
}

function stableOutputSignature(runnerResult) {
  return JSON.stringify({
    status: runnerResult.status,
    provider: runnerResult.reviewPayloadAugmentation.provider,
    draftOutputs: runnerResult.reviewPayloadAugmentation.draftOutputs,
    reviewMetadata: runnerResult.reviewPayloadAugmentation.reviewMetadata,
    refusalOutputs: runnerResult.reviewPayloadAugmentation.refusalOutputs,
    actionPolicy: runnerResult.actionPolicy,
    privacy: runnerResult.privacy
  });
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "workspaceEdit") ||
      Object.hasOwn(node, "documentChanges") ||
      Object.hasOwn(node, "changes") ||
      Object.hasOwn(node, "patch") ||
      Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countSourceBodyMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "sourceText") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceExcerpt") ||
      Object.hasOwn(node, "sourcesContent")
    ) {
      count += 1;
    }
  });
  return count;
}

function countSecretValueMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "secretValue") ||
      Object.hasOwn(node, "apiKeyValue") ||
      Object.hasOwn(node, "tokenValue") ||
      Object.hasOwn(node, "password") ||
      Object.hasOwn(node, "authorizationHeader")
    ) {
      count += 1;
    }
  });
  return count;
}

function walkJson(value, visitor, seen = new Set()) {
  visitor(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const item of value) {
      walkJson(item, visitor, seen);
    }
    seen.delete(value);
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const item of Object.values(value)) {
    walkJson(item, visitor, seen);
  }
  seen.delete(value);
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
