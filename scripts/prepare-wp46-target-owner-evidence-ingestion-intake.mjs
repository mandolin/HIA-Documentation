import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-target-owner-evidence-ingestion-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const boundaryPath = path.join(outputRoot, "target-owner-ingestion-boundary.md");
const matrixPath = path.join(outputRoot, "owner-provided-evidence-intake-matrix.md");
const readinessPath = path.join(outputRoot, "adoption-trial-readiness.md");

const sourcePaths = {
  wp45Closeout: path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs", "evidence.json"),
  wp41TargetOwnerCloseout: path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs", "evidence.json"),
  wp43TargetOwnerEvidenceView: path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json")
};

await main();

/**
 * 生成 W-P46.1 target-owner evidence ingestion intake evidence。
 * Generate W-P46.1 target-owner evidence ingestion intake evidence.
 *
 * This stage starts the target-owner adoption trial by defining the evidence
 * boundary for materials produced by the target owner. It intentionally keeps
 * HIA automation out of target repositories: HIA may ingest redacted evidence
 * metadata, but it may not create branches, open pull requests, run target
 * commands, mutate repositories, trigger checked apply or contact providers.
 *
 * 中文：本阶段启动 target-owner adoption trial，定义目标项目所有者主动提供
 * evidence 的接收边界。HIA automation 只能接收脱敏后的证据元数据，不能创建分支、
 * 打开 PR、运行目标项目命令、修改仓库、触发 checked apply 或调用 provider。
 *
 * @returns {Promise<void>} Writes public-safe target-owner intake evidence.
 */
async function main() {
  const inputs = await readInputs(sourcePaths);
  const boundary = createBoundary(inputs);
  const intakeMatrix = createIntakeMatrix(inputs, boundary);
  const adoptionReadiness = createAdoptionReadiness(inputs, intakeMatrix);
  const summary = summarize({ adoptionReadiness, boundary, inputs, intakeMatrix });
  const checks = [
    check("HIA_WP46_INTAKE_INPUTS_READY", summary.inputEvidenceCount === 3
      && summary.readyInputCount === 3
      && summary.inputHardFailureCount === 0
      && summary.wp45CloseoutReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputCount: summary.readyInputCount,
        wp45CloseoutStatus: inputs.wp45Closeout.status
      }
    }),
    check("HIA_WP46_INTAKE_TARGET_OWNER_BOUNDARY_PRESERVED", summary.ingestionMode === "owner-provided-evidence-only"
      && summary.targetOwnerActionRequired === true
      && summary.hiaMayRunTargetCommand === false
      && summary.hiaMayCreateBranchOrPr === false
      && summary.hiaMayMutateTargetRepository === false
      && summary.hiaMayReadTargetSourceBody === false, {
      actual: {
        hiaMayCreateBranchOrPr: summary.hiaMayCreateBranchOrPr,
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayReadTargetSourceBody: summary.hiaMayReadTargetSourceBody,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand,
        ingestionMode: summary.ingestionMode,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP46_INTAKE_REVIEW_ONLY_PROVIDER_RESULT", summary.sourceProviderResultKind === "execution-gate-blocked"
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.providerDestinationContactedCount === 0
      && summary.externalProviderApiCallExecuted === false
      && summary.reviewOnlyOutputRequired === true, {
      actual: {
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        providerDestinationContactedCount: summary.providerDestinationContactedCount,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        sourceProviderResultKind: summary.sourceProviderResultKind
      }
    }),
    check("HIA_WP46_INTAKE_SCHEMA_DRAFT_READY", summary.acceptedEvidenceKindCount >= 8
      && summary.requiredIntakeSectionCount >= 8
      && summary.redactionRequired === true
      && summary.ownerAttestationRequired === true
      && summary.ingestionValidationPlanned === true, {
      actual: {
        acceptedEvidenceKindCount: summary.acceptedEvidenceKindCount,
        ingestionValidationPlanned: summary.ingestionValidationPlanned,
        ownerAttestationRequired: summary.ownerAttestationRequired,
        redactionRequired: summary.redactionRequired,
        requiredIntakeSectionCount: summary.requiredIntakeSectionCount
      }
    }),
    check("HIA_WP46_INTAKE_HOST_REVIEW_READY", summary.hostProjectionCount === 3
      && summary.hostProjectionReadyCount === 3
      && summary.targetOwnerEvidenceViewReady === true
      && summary.adoptionTrialReady === true, {
      actual: {
        adoptionTrialReady: summary.adoptionTrialReady,
        hostProjectionCount: summary.hostProjectionCount,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        targetOwnerEvidenceViewReady: summary.targetOwnerEvidenceViewReady
      }
    }),
    check("HIA_WP46_INTAKE_NO_WRITE_OR_TARGET_MUTATION", summary.directApplyAllowedCount === 0
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
    check("HIA_WP46_INTAKE_PRIVACY_CLEAN", summary.secretValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp46-target-owner-evidence-ingestion-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp46-owner-provided-evidence-packet-schema" : "blocked",
    sourceEvidence: Object.fromEntries(Object.entries(sourcePaths).map(([key, value]) => [key, normalizePath(value)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    boundary,
    intakeMatrix,
    adoptionReadiness,
    checks,
    generatedDocs: {
      targetOwnerIngestionBoundary: normalizePath(boundaryPath),
      ownerProvidedEvidenceIntakeMatrix: normalizePath(matrixPath),
      adoptionTrialReadiness: normalizePath(readinessPath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.2",
        topic: "owner-provided-evidence-packet-schema",
        status: "ready-input",
        reason: "The target-owner evidence boundary and accepted evidence kinds are defined without granting HIA target repository authority."
      },
      {
        phase: "W-P47",
        topic: "checked-apply-write-pilot-preparation",
        status: "blocked-until-owner-evidence-validation",
        reason: "Checked apply write pilot must wait for owner-provided evidence packet validation and redaction results."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46 target-owner evidence ingestion intake evidence");
  assert.equal(hardFailures.length, 0, `W-P46 target-owner intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(boundaryPath, renderBoundaryMarkdown(evidence), "utf8");
  await writeFile(matrixPath, renderMatrixMarkdown(evidence), "utf8");
  await writeFile(readinessPath, renderReadinessMarkdown(evidence), "utf8");
  console.log(`W-P46 target-owner evidence ingestion intake prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 target-owner ingestion boundary prepared at ${normalizePath(boundaryPath)}`);
  console.log(`W-P46 owner-provided evidence intake matrix prepared at ${normalizePath(matrixPath)}`);
  console.log(`W-P46 adoption trial readiness prepared at ${normalizePath(readinessPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createBoundary(inputs) {
  const wp45Summary = inputs.wp45Closeout.summary ?? {};
  return {
    contract: "hia-wp46-target-owner-evidence-ingestion-boundary",
    contractVersion: "0.1.0-draft",
    ingestionMode: "owner-provided-evidence-only",
    sourceProviderResultKind: wp45Summary.resultKind,
    targetOwnerActionRequired: true,
    hiaAuthority: {
      mayRunTargetCommand: false,
      mayCreateBranchOrPr: false,
      mayCreateSandbox: false,
      mayPushCommit: false,
      mayMutateTargetRepository: false,
      mayReadTargetSourceBody: false,
      mayTriggerCheckedApply: false,
      mayContactProvider: false
    },
    ownerEvidenceAuthority: {
      mayProvideRedactedTranscript: true,
      mayProvideBranchOrPrReference: true,
      mayProvideSandboxReference: true,
      mayProvideCheckSummary: true,
      mayProvideScreenshotOrReport: true,
      mustRedactSecretsAndPrivatePaths: true,
      mustAttestOwnership: true
    },
    privacyPolicy: {
      sourcesContentPolicy: "none",
      sourceBodyPolicy: "reference-only",
      credentialPolicy: "never-serialize",
      localPathPolicy: "redacted-or-relative",
      requestResponseBodyPolicy: "not-accepted-in-public-evidence"
    }
  };
}

function createIntakeMatrix(inputs, boundary) {
  return {
    contract: "hia-wp46-owner-provided-evidence-intake-matrix",
    contractVersion: "0.1.0-draft",
    acceptedEvidenceKinds: [
      evidenceKind("owner-command-transcript", "目标所有者运行命令后的脱敏 transcript。"),
      evidenceKind("owner-check-summary", "目标所有者提供的测试或构建摘要。"),
      evidenceKind("owner-branch-reference", "目标所有者自行创建的 branch 引用。"),
      evidenceKind("owner-pull-request-reference", "目标所有者自行创建的 PR 引用。"),
      evidenceKind("owner-local-sandbox-reference", "目标所有者自行创建的本地 sandbox 引用或说明。"),
      evidenceKind("owner-screenshot-report", "目标所有者采集的 public-safe screenshot/report。"),
      evidenceKind("owner-redaction-attestation", "目标所有者确认已脱敏的声明。"),
      evidenceKind("host-review-linkage-observation", "宿主 review surface 对 blocked result 的展示观察。")
    ],
    requiredIntakeSections: [
      "owner",
      "target-project",
      "evidence-kind",
      "source-result-ref",
      "command-or-host-context",
      "redaction-attestation",
      "privacy-check",
      "review-linkage"
    ],
    validationPlan: {
      schemaValidation: "planned-for-wp46.2",
      redactionValidation: "planned-for-wp46.3",
      hostProjectionValidation: "planned-for-wp46.4",
      adoptionTrialValidation: "planned-for-wp46.5"
    },
    boundaryRef: {
      ingestionMode: boundary.ingestionMode,
      hiaMayMutateTargetRepository: boundary.hiaAuthority.mayMutateTargetRepository
    },
    sourceRefs: {
      wp45ResultKind: inputs.wp45Closeout.summary?.resultKind,
      wp41CloseoutStatus: inputs.wp41TargetOwnerCloseout.status,
      wp43TargetOwnerEvidenceViewStatus: inputs.wp43TargetOwnerEvidenceView.status
    }
  };
}

function evidenceKind(id, description) {
  return {
    id,
    description,
    providedBy: "target-owner",
    acceptedAsPublicSafeMetadataOnly: true,
    mayContainRawSourceBody: false,
    mayContainCredentialValue: false,
    mayAuthorizeHiaMutation: false
  };
}

function createAdoptionReadiness(inputs, intakeMatrix) {
  return {
    contract: "hia-wp46-target-owner-adoption-trial-readiness",
    contractVersion: "0.1.0-draft",
    status: "ready-for-owner-provided-evidence-packet-schema",
    trialScope: "review-only-ingestion",
    targetOwnerEvidenceViewReady: inputs.wp43TargetOwnerEvidenceView.status === "ready-for-wp43-host-confirmation-manual-packet-refresh",
    hostReviewProjections: [
      projection("vscode", "review-panel"),
      projection("devtools", "browser-panel"),
      projection("visual-studio", "review-tool-window")
    ],
    nextSteps: [
      {
        phase: "W-P46.2",
        action: "define-owner-provided-evidence-packet-schema"
      },
      {
        phase: "W-P46.3",
        action: "validate-redaction-and-privacy-ledger"
      },
      {
        phase: "W-P46.4",
        action: "project-ingested-owner-evidence-to-host-review-surfaces"
      }
    ],
    acceptedEvidenceKindCount: intakeMatrix.acceptedEvidenceKinds.length
  };
}

function projection(hostId, surface) {
  return {
    hostId,
    surface,
    status: "ready-for-review-only-owner-evidence-display",
    mayRunTargetCommand: false,
    mayMutateTargetRepository: false,
    mayTriggerCheckedApply: false
  };
}

function summarize({ adoptionReadiness, boundary, inputs, intakeMatrix }) {
  const wp45Summary = inputs.wp45Closeout.summary ?? {};
  const combinedForPrivacy = {
    adoptionReadiness,
    boundary,
    intakeMatrix
  };
  const serialized = JSON.stringify(combinedForPrivacy);
  return {
    phase: "W-P46.1",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputCount: Object.values(inputs).filter((item) => item.status && item.status !== "blocked").length,
    inputHardFailureCount: Object.values(inputs).reduce((total, item) => total + (item.summary?.hardFailureCount ?? 0), 0),
    wp45CloseoutReady: inputs.wp45Closeout.status === "ready-for-wp46-target-owner-evidence-ingestion-and-wp47-checked-apply-pilot-inputs",
    sourceProviderResultKind: wp45Summary.resultKind,
    providerResultProduced: wp45Summary.providerResultProduced === true,
    refusalResultProduced: wp45Summary.refusalResultProduced === true,
    providerDestinationContactedCount: wp45Summary.providerDestinationContactedCount ?? 0,
    externalProviderApiCallExecuted: wp45Summary.externalProviderApiCallExecuted === true,
    reviewOnlyOutputRequired: wp45Summary.reviewOnlyOutputRequired === true,
    ingestionMode: boundary.ingestionMode,
    targetOwnerActionRequired: boundary.targetOwnerActionRequired,
    hiaMayRunTargetCommand: boundary.hiaAuthority.mayRunTargetCommand,
    hiaMayCreateBranchOrPr: boundary.hiaAuthority.mayCreateBranchOrPr,
    hiaMayMutateTargetRepository: boundary.hiaAuthority.mayMutateTargetRepository,
    hiaMayReadTargetSourceBody: boundary.hiaAuthority.mayReadTargetSourceBody,
    acceptedEvidenceKindCount: intakeMatrix.acceptedEvidenceKinds.length,
    requiredIntakeSectionCount: intakeMatrix.requiredIntakeSections.length,
    redactionRequired: boundary.ownerEvidenceAuthority.mustRedactSecretsAndPrivatePaths,
    ownerAttestationRequired: boundary.ownerEvidenceAuthority.mustAttestOwnership,
    ingestionValidationPlanned: intakeMatrix.validationPlan.schemaValidation === "planned-for-wp46.2",
    targetOwnerEvidenceViewReady: adoptionReadiness.targetOwnerEvidenceViewReady,
    hostProjectionCount: adoptionReadiness.hostReviewProjections.length,
    hostProjectionReadyCount: adoptionReadiness.hostReviewProjections.filter((item) => item.status === "ready-for-review-only-owner-evidence-display").length,
    adoptionTrialReady: adoptionReadiness.status === "ready-for-owner-provided-evidence-packet-schema",
    directApplyAllowedCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(combinedForPrivacy),
    secretValueIncludedCount: 0,
    sourceTextIncludedCount: 0,
    requestBodyIncludedCount: 0,
    responseBodyIncludedCount: 0,
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(combinedForPrivacy),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(combinedForPrivacy),
    pathExposureCount: countPathExposure(serialized),
    nextStage: "W-P46.2 Owner-Provided Evidence Packet Schema"
  };
}

function renderBoundaryMarkdown(evidence) {
  const lines = [
    "# W-P46.1 Target-Owner Evidence Ingestion Boundary",
    "",
    `Status / 状态：\`${evidence.status}\``,
    "",
    "中文：W-P46 只接收目标所有者主动提供的脱敏 evidence，不由 HIA automation 操作目标仓库。",
    "",
    "| Capability | HIA automation |",
    "| --- | --- |",
    `| Run target command | ${evidence.boundary.hiaAuthority.mayRunTargetCommand} |`,
    `| Create branch or PR | ${evidence.boundary.hiaAuthority.mayCreateBranchOrPr} |`,
    `| Mutate target repository | ${evidence.boundary.hiaAuthority.mayMutateTargetRepository} |`,
    `| Trigger checked apply | ${evidence.boundary.hiaAuthority.mayTriggerCheckedApply} |`,
    `| Contact provider | ${evidence.boundary.hiaAuthority.mayContactProvider} |`
  ];
  return `${lines.join("\n")}\n`;
}

function renderMatrixMarkdown(evidence) {
  const lines = [
    "# Owner-Provided Evidence Intake Matrix",
    "",
    "| Evidence kind | Provided by | Public-safe metadata only |",
    "| --- | --- | --- |"
  ];
  for (const item of evidence.intakeMatrix.acceptedEvidenceKinds) {
    lines.push(`| \`${item.id}\` | \`${item.providedBy}\` | ${item.acceptedAsPublicSafeMetadataOnly} |`);
  }
  return `${lines.join("\n")}\n`;
}

function renderReadinessMarkdown(evidence) {
  const lines = [
    "# W-P46.1 Adoption Trial Readiness",
    "",
    `Trial scope / 试点范围：\`${evidence.adoptionReadiness.trialScope}\``,
    "",
    "| Host | Surface | Status |",
    "| --- | --- | --- |"
  ];
  for (const item of evidence.adoptionReadiness.hostReviewProjections) {
    lines.push(`| \`${item.hostId}\` | \`${item.surface}\` | \`${item.status}\` |`);
  }
  return `${lines.join("\n")}\n`;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function countDirectEditObjects(value) {
  return countMatchingKeys(value, /^(workspaceEdit|documentChanges|changes|patch|edits)$/u)
    + countMatchingValues(value, /TextEdit\[/iu);
}

function countCredentialMaterialMarkers(value) {
  return countMatchingKeys(value, /^(secretValue|apiKeyValue|tokenValue|password|authorizationHeader)$/u)
    + countMatchingValues(value, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u);
}

function countForbiddenDocumentTextMarkers(value) {
  return countMatchingKeys(value, /^(sourceText|sourceBody|rawSource|sourceExcerpt|documentText|documentContent|sourcesContent)$/u);
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countMatchingKeys(value, pattern) {
  let count = 0;
  visitEntries(value, (key) => {
    if (pattern.test(key)) {
      count += 1;
    }
  });
  return count;
}

function countMatchingValues(value, pattern) {
  let count = 0;
  visitValues(value, (candidate) => {
    if (pattern.test(candidate)) {
      count += 1;
    }
  });
  return count;
}

function visitEntries(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitEntries(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitor(key, item);
      visitEntries(item, visitor);
    }
  }
}

function visitValues(value, visitor) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValues(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
