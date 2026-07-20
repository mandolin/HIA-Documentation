import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeterministicMockProvider } from "../packages/provider-mock/dist/index.js";
import { runHiaLocalProvider } from "../packages/provider-runner/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(rootDir, "..");
const workspaceContainerDir = path.resolve(workspaceRoot, "..");
const outputRoot = path.join(rootDir, "dist", "wp35-target-self-doc-provider-dry-run-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  aiAuthoring: path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json"),
  hostReviewProvider: path.join(rootDir, "dist", "wp35-host-review-provider-evidence", "evidence.json"),
  providerRunner: path.join(rootDir, "dist", "wp35-provider-runner-evidence", "evidence.json")
};
const dryRunScenarios = [
  {
    id: "hia-main-repo",
    label: "HIA main-repo",
    kind: "self-doc",
    localPath: rootDir,
    documentationNeeds: ["jsdoc", "tsdoc", "cssdoc", "htmdoc"],
    dryRunFocus: "Core monorepo self-documentation provider review proposals"
  },
  {
    id: "hia-tsdoc",
    label: "hia-tsdoc",
    kind: "self-doc-satellite",
    localPath: path.join(workspaceRoot, "HIA", "hia-tsdoc"),
    documentationNeeds: ["tsdoc"],
    dryRunFocus: "TypeScript documentation satellite provider review proposals"
  },
  {
    id: "hia-dotnetdoc",
    label: "hia-dotnetdoc",
    kind: "self-doc-satellite",
    localPath: path.join(workspaceRoot, "HIA", "hia-dotnetdoc"),
    documentationNeeds: ["dotnetdoc"],
    dryRunFocus: ".NET documentation satellite provider review proposals"
  },
  {
    id: "unicode-art-js",
    label: "UnicodeArtJs",
    kind: "target-project",
    localPath: path.join(workspaceContainerDir, "UnicodeArtJs"),
    documentationNeeds: ["tsdoc", "jsdoc"],
    dryRunFocus: "TypeScript/JSDoc target-project provider review proposals"
  },
  {
    id: "hia-aspnetportal",
    label: "HIA-ASPNETPortal",
    kind: "target-project",
    localPath: path.join(workspaceContainerDir, "HIA-ASPNETPortal"),
    documentationNeeds: ["dotnetdoc", "aspnet-endpoint"],
    dryRunFocus: ".NET XML documentation and ASP.NET endpoint provider review proposals"
  }
];

await main();

/**
 * 准备 W-P35.6 target/self-doc provider dry-run evidence。
 * Prepare W-P35.6 target/self-doc provider dry-run evidence.
 *
 * The dry run proves that provider runner output can be routed toward HIA
 * self-documentation and known target-project scenarios without reading source
 * bodies, mutating repositories, requiring API keys or enabling checked apply.
 *
 * 本 evidence 证明 provider runner 输出可以面向 HIA 自文档化与目标项目场景做
 * 只读联调；过程中不读取源码正文、不修改仓库、不要求 API key，也不启用 checked
 * apply。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = await readJson(inputPaths.aiAuthoring);
  const providerRunner = await readJson(inputPaths.providerRunner);
  const hostReviewProvider = await readJson(inputPaths.hostReviewProvider);
  const reviewPayload = aiAuthoring.result.reviewPayload;
  const scenarioResults = await Promise.all(
    dryRunScenarios.map((scenario) => prepareProviderDryRunScenario(scenario, reviewPayload))
  );
  const targetPolicy = {
    notificationChannel: "central-notify",
    notificationLocationPolicy: "private-collaboration-space",
    providerMode: "deterministic-mock-only",
    sourceBodyReadAllowed: false,
    sourcesContentPolicy: "none",
    targetPathExposure: "redacted",
    targetRepositoryMode: "read-only-observed",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false
  };
  const serializedScenarios = JSON.stringify(scenarioResults);
  const summary = {
    aiAuthoringReady: aiAuthoring.result?.status === "available",
    centralNotifyPolicyReady: targetPolicy.notificationChannel === "central-notify",
    detectedReadOnlyScenarioCount: scenarioResults.filter((scenario) => scenario.availability === "detected-read-only").length,
    directApplyAllowed: false,
    directEditObjectCount: countDirectEditObjects(scenarioResults),
    externalProviderApiKeyRequired: false,
    externalProviderInvocationCount: 0,
    externalProviderNetworkAllowed: false,
    hostReviewProviderReady: hostReviewProvider.status === "ready-for-target-self-doc-provider-dry-run",
    pathExposureCount: countPathExposure(serializedScenarios),
    providerDraftOutputCount: scenarioResults.reduce((total, scenario) => total + scenario.provider.draftOutputCount, 0),
    providerRefusalOutputCount: scenarioResults.reduce((total, scenario) => total + scenario.provider.refusalOutputCount, 0),
    providerReviewMetadataCount: scenarioResults.reduce((total, scenario) => total + scenario.provider.reviewMetadataCount, 0),
    providerRunnerReady: providerRunner.status === "ready-for-host-review-integration-refresh",
    providerScenarioCount: scenarioResults.length,
    providerSuccessCount: scenarioResults.filter((scenario) => scenario.provider.status === "success").length,
    scenarioCount: scenarioResults.length,
    selfDocScenarioCount: scenarioResults.filter((scenario) => scenario.kind.startsWith("self-doc")).length,
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers(scenarioResults),
    sourcesContentPolicy: "none",
    targetProjectScenarioCount: scenarioResults.filter((scenario) => scenario.kind === "target-project").length,
    targetRepositoryMutationCount: scenarioResults.filter((scenario) => scenario.targetRepositoryMutationAllowed).length,
    targetRepositoryWriteAttemptedCount: scenarioResults.filter((scenario) => scenario.targetRepositoryWriteAttempted).length,
    toolExecutionAllowed: false,
    workspaceWriteAllowed: false
  };
  const checks = [
    check("HIA_WP35_TARGET_SELF_DOC_PROVIDER_INPUTS_READY", summary.aiAuthoringReady === true
      && summary.providerRunnerReady === true
      && summary.hostReviewProviderReady === true, {
      actual: {
        aiAuthoringReady: summary.aiAuthoringReady,
        hostReviewProviderReady: summary.hostReviewProviderReady,
        providerRunnerReady: summary.providerRunnerReady
      },
      expected: {
        aiAuthoringReady: true,
        hostReviewProviderReady: true,
        providerRunnerReady: true
      }
    }),
    check("HIA_WP35_TARGET_SELF_DOC_SCENARIOS_DECLARED", summary.scenarioCount === 5
      && summary.selfDocScenarioCount === 3
      && summary.targetProjectScenarioCount === 2
      && scenarioResults.some((scenario) => scenario.id === "unicode-art-js")
      && scenarioResults.some((scenario) => scenario.id === "hia-aspnetportal"), {
      actual: {
        scenarioIds: scenarioResults.map((scenario) => scenario.id),
        selfDocScenarioCount: summary.selfDocScenarioCount,
        targetProjectScenarioCount: summary.targetProjectScenarioCount
      },
      expected: {
        scenarioIds: ["hia-main-repo", "hia-tsdoc", "hia-dotnetdoc", "unicode-art-js", "hia-aspnetportal"],
        selfDocScenarioCount: 3,
        targetProjectScenarioCount: 2
      }
    }),
    check("HIA_WP35_TARGET_SELF_DOC_PROVIDER_RUNS_SUCCEED", summary.providerSuccessCount === summary.providerScenarioCount
      && summary.providerDraftOutputCount > 0
      && summary.providerReviewMetadataCount > 0
      && summary.providerRefusalOutputCount === 0, {
      actual: {
        providerDraftOutputCount: summary.providerDraftOutputCount,
        providerRefusalOutputCount: summary.providerRefusalOutputCount,
        providerReviewMetadataCount: summary.providerReviewMetadataCount,
        providerScenarioCount: summary.providerScenarioCount,
        providerSuccessCount: summary.providerSuccessCount
      }
    }),
    check("HIA_WP35_TARGET_SELF_DOC_REVIEW_ONLY_BOUNDARY", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.directApplyAllowed === false
      && summary.workspaceWriteAllowed === false
      && summary.toolExecutionAllowed === false
      && summary.externalProviderApiKeyRequired === false
      && summary.externalProviderNetworkAllowed === false
      && summary.sourcesContentPolicy === "none", {
      actual: {
        directApplyAllowed: summary.directApplyAllowed,
        directEditObjectCount: summary.directEditObjectCount,
        externalProviderApiKeyRequired: summary.externalProviderApiKeyRequired,
        externalProviderNetworkAllowed: summary.externalProviderNetworkAllowed,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      }
    }),
    check("HIA_WP35_TARGET_SELF_DOC_TARGET_REPOS_NOT_MUTATED", summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && targetPolicy.targetRepositoryMode === "read-only-observed", {
      actual: {
        targetRepositoryMode: targetPolicy.targetRepositoryMode,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount
      },
      expected: {
        targetRepositoryMode: "read-only-observed",
        targetRepositoryMutationCount: 0,
        targetRepositoryWriteAttemptedCount: 0
      }
    }),
    check("HIA_WP35_TARGET_SELF_DOC_PATHS_REDACTED", summary.pathExposureCount === 0, {
      actual: summary.pathExposureCount,
      expected: 0
    }),
    check("HIA_WP35_TARGET_SELF_DOC_CENTRAL_NOTIFY_POLICY", summary.centralNotifyPolicyReady === true
      && targetPolicy.notificationLocationPolicy === "private-collaboration-space", {
      actual: targetPolicy,
      expected: {
        notificationChannel: "central-notify",
        notificationLocationPolicy: "private-collaboration-space"
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-target-self-doc-provider-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp35-closeout-and-checked-apply-inputs" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPaths.aiAuthoring),
      hostReviewProvider: normalizePath(inputPaths.hostReviewProvider),
      providerRunner: normalizePath(inputPaths.providerRunner)
    },
    targetPolicy,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    providerDryRunScenarios: scenarioResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.7",
        topic: "closeout-and-checked-apply-inputs",
        reason: "Target/self-doc provider dry-runs now prove review-only provider output can be routed to known project scenarios without writes."
      },
      {
        phase: "W-P36",
        topic: "real-provider-secret-and-network-policy",
        reason: "Real provider APIs remain blocked until explicit secret storage, network mediation and audit policy are designed."
      }
    ],
    manualChecks: [
      "Confirm target projects read central notify before changing their own dependencies or configuration.",
      "Confirm self-documentation dry-runs keep provider output as review metadata and draft text only.",
      "Confirm checked apply remains deferred until host file-read, conflict, rollback and human-approval evidence is explicitly designed."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 target/self-doc provider dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P35 target/self-doc provider dry-run evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 target/self-doc provider dry-run evidence prepared at ${normalizePath(evidencePath)}`);
}

async function prepareProviderDryRunScenario(scenario, reviewPayload) {
  const detected = await directoryExists(scenario.localPath);
  const run = await runHiaLocalProvider({
    provider: createDeterministicMockProvider({
      displayName: `HIA Deterministic Mock Provider for ${scenario.label}`
    }),
    reviewPayload,
    requestId: `wp35-${scenario.id}-provider-dry-run`,
    profileIds: scenario.documentationNeeds,
    locales: ["zh-CN", "en"]
  });
  const augmentation = run.reviewPayloadAugmentation;
  return {
    id: scenario.id,
    label: scenario.label,
    kind: scenario.kind,
    availability: detected ? "detected-read-only" : "not-detected",
    documentationNeeds: [...scenario.documentationNeeds],
    dryRunFocus: scenario.dryRunFocus,
    expectedInputContracts: [
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-provider-runner-result@0.1.0-draft",
      "hia-provider-review-payload-augmentation@0.1.0-draft"
    ],
    provider: {
      augmentationContract: `${augmentation.contract}@${augmentation.contractVersion}`,
      draftOutputCount: augmentation.draftOutputs.length,
      providerId: augmentation.provider.id,
      providerRuntimeKind: augmentation.provider.runtimeKind,
      refusalOutputCount: augmentation.refusalOutputs.length,
      requestId: augmentation.requestId,
      reviewMetadataCount: augmentation.reviewMetadata.length,
      reviewOnly: augmentation.actionPolicy.requiresHumanReview === true
        && augmentation.actionPolicy.directApplyAllowed === false,
      status: augmentation.status
    },
    providerQualitySignalCount: augmentation.reviewMetadata.reduce(
      (total, item) => total + item.qualitySignals.length,
      0
    ),
    sourcePolicy: {
      pathExposure: "redacted",
      sourceBodiesIncluded: false,
      sourcesContentPolicy: augmentation.privacy.sourcesContentPolicy
    },
    targetRepositoryMode: "read-only-observed",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function directoryExists(directoryPath) {
  try {
    const stats = await stat(directoryPath);
    return stats.isDirectory();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
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
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "sourceExcerpt") ||
      Object.hasOwn(node, "sourceText")
    ) {
      count += 1;
    }
  });
  return count;
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
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
