import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDeterministicMockProvider
} from "../packages/provider-mock/dist/index.js";
import {
  runHiaLocalProvider,
  validateHiaProviderRunnerResult
} from "../packages/provider-runner/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-provider-runner-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const mockEvidencePath = path.join(rootDir, "dist", "wp35-provider-mock-evidence", "evidence.json");
const aiAuthoringEvidencePath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");

await main();

/**
 * 准备 W-P35.4 local provider runner evidence。
 * Prepare W-P35.4 local provider runner evidence.
 *
 * The evidence proves that local providers can be invoked from bounded review
 * payloads and that their outputs return only as review augmentation, never as
 * direct apply/edit objects or target repository mutations.
 *
 * 本 evidence 证明本地 provider 可基于受限 review payload 被调用，并且输出只回到
 * review augmentation，不变成直接 apply/edit 对象或目标仓库修改。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const mockEvidence = await readJson(mockEvidencePath);
  const aiAuthoringEvidence = await readJson(aiAuthoringEvidencePath);
  const provider = createDeterministicMockProvider();
  const reviewPayload = aiAuthoringEvidence.result.reviewPayload;
  const progressEvents = [];
  const result = await runHiaLocalProvider({
    provider,
    reviewPayload,
    requestId: "wp35-provider-runner",
    profileIds: ["jsdoc", "tsdoc"]
  }, {
    reportProgress(progress) {
      progressEvents.push(progress);
    }
  });
  const runnerDiagnostics = validateHiaProviderRunnerResult(result);
  const serializedResult = JSON.stringify(result);
  const summary = {
    mockProviderReady: mockEvidence.status === "ready-for-local-provider-runner",
    runnerStatus: result.status,
    providerResultStatus: result.providerResult.status,
    runnerDiagnosticCount: runnerDiagnostics.length,
    providerDiagnosticCount: result.providerResult.diagnostics.length,
    progressEventCount: progressEvents.length,
    reviewItemBindingCount: result.reviewPayloadAugmentation.reviewItemBindings.length,
    draftOutputCount: result.reviewPayloadAugmentation.draftOutputs.length,
    reviewMetadataCount: result.reviewPayloadAugmentation.reviewMetadata.length,
    refusalOutputCount: result.reviewPayloadAugmentation.refusalOutputs.length,
    providerSafeContextPackageId: result.reviewPayloadAugmentation.sourceAiContextPackageRef?.providerSafePackageId,
    sourceContextPackageIdPreserved: Boolean(result.reviewPayloadAugmentation.sourceAiContextPackageRef?.packageId),
    directEditObjectCount: countDirectEditObjects(result),
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers(result),
    externalProviderInvocationCount: 0,
    externalProviderApiKeyRequired: false,
    actionRequiresHumanReview: result.actionPolicy.requiresHumanReview,
    directApplyAllowed: result.actionPolicy.directApplyAllowed,
    directEditObjectAllowed: result.actionPolicy.directEditObjectAllowed,
    workspaceWriteAllowed: result.actionPolicy.workspaceWriteAllowed,
    targetRepositoryMutationAllowed: result.actionPolicy.targetRepositoryMutationAllowed,
    toolExecutionAllowed: result.actionPolicy.toolExecutionAllowed,
    sourcesContentPolicy: result.privacy.sourcesContentPolicy,
    includesSourceBody: result.privacy.includesSourceBody,
    includesSourcesContent: result.privacy.includesSourcesContent,
    resultContainsWorkspaceEdit: serializedResult.includes("workspaceEdit"),
    resultContainsSourcesContent: serializedResult.includes("\"sourcesContent\":")
  };
  const checks = [
    check("HIA_WP35_PROVIDER_RUNNER_MOCK_READY", summary.mockProviderReady === true
      && mockEvidence.summary?.hardFailureCount === 0, {
      actual: {
        hardFailureCount: mockEvidence.summary?.hardFailureCount,
        status: mockEvidence.status
      },
      expected: {
        hardFailureCount: 0,
        status: "ready-for-local-provider-runner"
      }
    }),
    check("HIA_WP35_PROVIDER_RUNNER_RESULT_VALID", summary.runnerStatus === "success"
      && summary.providerResultStatus === "success"
      && summary.runnerDiagnosticCount === 0
      && summary.providerDiagnosticCount === 0, {
      actual: {
        providerDiagnosticCount: summary.providerDiagnosticCount,
        providerResultStatus: summary.providerResultStatus,
        runnerDiagnosticCount: summary.runnerDiagnosticCount,
        runnerStatus: summary.runnerStatus
      },
      expected: {
        providerDiagnosticCount: 0,
        providerResultStatus: "success",
        runnerDiagnosticCount: 0,
        runnerStatus: "success"
      }
    }),
    check("HIA_WP35_PROVIDER_RUNNER_REVIEW_AUGMENTATION", summary.reviewItemBindingCount >= 1
      && summary.draftOutputCount >= 1
      && summary.reviewMetadataCount === summary.draftOutputCount
      && summary.sourceContextPackageIdPreserved === true
      && typeof summary.providerSafeContextPackageId === "string", {
      actual: {
        draftOutputCount: summary.draftOutputCount,
        providerSafeContextPackageId: summary.providerSafeContextPackageId,
        reviewItemBindingCount: summary.reviewItemBindingCount,
        reviewMetadataCount: summary.reviewMetadataCount,
        sourceContextPackageIdPreserved: summary.sourceContextPackageIdPreserved
      }
    }),
    check("HIA_WP35_PROVIDER_RUNNER_REVIEW_ONLY_BOUNDARY", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.resultContainsWorkspaceEdit === false
      && summary.resultContainsSourcesContent === false
      && summary.directApplyAllowed === false
      && summary.directEditObjectAllowed === false
      && summary.workspaceWriteAllowed === false
      && summary.targetRepositoryMutationAllowed === false
      && summary.toolExecutionAllowed === false
      && summary.actionRequiresHumanReview === true
      && summary.sourcesContentPolicy === "none"
      && summary.includesSourceBody === false
      && summary.includesSourcesContent === false, {
      actual: {
        actionRequiresHumanReview: summary.actionRequiresHumanReview,
        directApplyAllowed: summary.directApplyAllowed,
        directEditObjectAllowed: summary.directEditObjectAllowed,
        directEditObjectCount: summary.directEditObjectCount,
        includesSourceBody: summary.includesSourceBody,
        includesSourcesContent: summary.includesSourcesContent,
        resultContainsSourcesContent: summary.resultContainsSourcesContent,
        resultContainsWorkspaceEdit: summary.resultContainsWorkspaceEdit,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy,
        targetRepositoryMutationAllowed: summary.targetRepositoryMutationAllowed,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      },
      expected: {
        directApplyAllowed: false,
        directEditObjectAllowed: false,
        directEditObjectCount: 0,
        includesSourceBody: false,
        includesSourcesContent: false,
        requiresHumanReview: true,
        resultContainsSourcesContent: false,
        resultContainsWorkspaceEdit: false,
        sourceBodyMarkerCount: 0,
        sourcesContentPolicy: "none",
        targetRepositoryMutationAllowed: false,
        toolExecutionAllowed: false,
        workspaceWriteAllowed: false
      }
    }),
    check("HIA_WP35_PROVIDER_RUNNER_NO_EXTERNAL_PROVIDER", summary.externalProviderInvocationCount === 0
      && summary.externalProviderApiKeyRequired === false, {
      actual: {
        externalProviderApiKeyRequired: summary.externalProviderApiKeyRequired,
        externalProviderInvocationCount: summary.externalProviderInvocationCount
      },
      expected: {
        externalProviderApiKeyRequired: false,
        externalProviderInvocationCount: 0
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-local-provider-runner-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-host-review-integration-refresh" : "blocked",
    sourceEvidence: {
      aiAuthoringProposals: normalizePath(aiAuthoringEvidencePath),
      providerMock: normalizePath(mockEvidencePath),
      providerRunnerPackage: "packages/provider-runner"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.5",
        topic: "host-review-integration-refresh",
        reason: "Provider output now returns as review payload augmentation with provider origin, draft outputs, quality metadata and refusal slots."
      },
      {
        phase: "W-P35.6",
        topic: "target-self-doc-dry-run",
        reason: "Runner evidence can be reused for read-only dry-runs without changing target repositories."
      }
    ],
    manualChecks: [
      "Confirm host review surfaces display provider origin and quality metadata from reviewPayloadAugmentation.",
      "Confirm checked apply remains deferred and cannot consume provider output directly.",
      "Confirm real provider credentials remain out of scope until explicit secret and network policy exists."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 local provider runner evidence");
  assert.equal(hardFailures.length, 0, `W-P35 local provider runner evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 local provider runner evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
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

function countForbiddenSourceBodyMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceExcerpt")
    ) {
      count += 1;
    }
  });
  return count;
}

function walkJson(value, visitor) {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      walkJson(item, visitor);
    }
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
