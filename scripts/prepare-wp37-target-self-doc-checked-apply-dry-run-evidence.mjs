import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(rootDir, "..");
const workspaceContainerDir = path.resolve(workspaceRoot, "..");
const outputRoot = path.join(rootDir, "dist", "wp37-target-self-doc-checked-apply-dry-run");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  targetSelfDocProvider: path.join(rootDir, "dist", "wp35-target-self-doc-provider-dry-run-evidence", "evidence.json"),
  vscodeConfirmation: path.join(rootDir, "dist", "wp37-vscode-checked-apply-confirmation", "evidence.json")
};
const dryRunScenarios = [
  {
    id: "hia-main-repo",
    label: "HIA main-repo",
    kind: "self-doc",
    localPath: rootDir,
    documentationNeeds: ["jsdoc", "tsdoc", "cssdoc", "htmdoc"],
    supportedTargetKinds: ["external-resource-locale-entry", "source-docline-draft"],
    dryRunFocus: "Core monorepo self-documentation checked apply confirmation preview"
  },
  {
    id: "hia-tsdoc",
    label: "hia-tsdoc",
    kind: "self-doc-satellite",
    localPath: path.join(workspaceRoot, "HIA", "hia-tsdoc"),
    documentationNeeds: ["tsdoc"],
    supportedTargetKinds: ["source-docline-draft"],
    dryRunFocus: "TypeScript documentation satellite source docline confirmation preview"
  },
  {
    id: "hia-dotnetdoc",
    label: "hia-dotnetdoc",
    kind: "self-doc-satellite",
    localPath: path.join(workspaceRoot, "HIA", "hia-dotnetdoc"),
    documentationNeeds: ["dotnetdoc"],
    supportedTargetKinds: ["source-docline-draft"],
    dryRunFocus: ".NET XML documentation confirmation preview"
  },
  {
    id: "unicode-art-js",
    label: "UnicodeArtJs",
    kind: "target-project",
    localPath: path.join(workspaceContainerDir, "UnicodeArtJs"),
    documentationNeeds: ["tsdoc", "jsdoc"],
    supportedTargetKinds: ["source-docline-draft"],
    dryRunFocus: "TypeScript/JSDoc target-project checked apply confirmation preview"
  },
  {
    id: "hia-aspnetportal",
    label: "HIA-ASPNETPortal",
    kind: "target-project",
    localPath: path.join(workspaceContainerDir, "HIA-ASPNETPortal"),
    documentationNeeds: ["dotnetdoc", "aspnet-endpoint"],
    supportedTargetKinds: ["source-docline-draft", "external-resource-locale-entry"],
    dryRunFocus: ".NET XML documentation and ASP.NET endpoint confirmation preview"
  }
];

await main();

/**
 * 准备 W-P37.6 target/self-doc checked apply dry-run evidence。
 * Prepare W-P37.6 target/self-doc checked apply dry-run evidence.
 *
 * The dry run routes VS Code checked apply confirmation reports toward HIA
 * self-documentation and target-project scenarios. It is still read-only: it
 * does not read target source bodies, write repositories, execute formatters or
 * grant final apply authority.
 *
 * 中文：本 dry-run 将 VS Code checked apply confirmation report 投射到 HIA
 * 自文档化与目标项目场景。它仍然只读：不读取目标源码正文、不写仓库、不执行
 * formatter，也不授予最终 apply 权限。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const targetSelfDocProvider = await readJson(inputPaths.targetSelfDocProvider);
  const vscodeConfirmation = await readJson(inputPaths.vscodeConfirmation);
  const confirmationSummaries = Array.isArray(vscodeConfirmation.confirmationSummaries) ? vscodeConfirmation.confirmationSummaries : [];
  const confirmationReports = Array.isArray(vscodeConfirmation.confirmationReports) ? vscodeConfirmation.confirmationReports : [];
  const scenarioResults = await Promise.all(
    dryRunScenarios.map((scenario) => prepareCheckedApplyDryRunScenario(scenario, confirmationSummaries, confirmationReports))
  );
  const targetPolicy = {
    notificationChannel: "central-notify",
    notificationLocationPolicy: "private-collaboration-space",
    checkedApplyMode: "host-confirmation-preview-only",
    sourceBodyReadAllowed: false,
    sourcesContentPolicy: "none",
    targetPathExposure: "redacted",
    targetRepositoryMode: "read-only-observed",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    workspaceApplyEditAllowed: false
  };
  const serializedScenarios = JSON.stringify(scenarioResults);
  const summary = {
    confirmationEvidenceReady: vscodeConfirmation.status === "ready-for-target-self-doc-checked-apply-dry-run",
    confirmationHardFailureCount: Number(vscodeConfirmation.summary?.hardFailureCount ?? -1),
    targetSelfDocProviderReady: targetSelfDocProvider.status === "ready-for-wp35-closeout-and-checked-apply-inputs",
    targetSelfDocProviderHardFailureCount: Number(targetSelfDocProvider.summary?.hardFailureCount ?? -1),
    confirmationInputCount: confirmationSummaries.length,
    confirmationReportInputCount: confirmationReports.length,
    scenarioCount: scenarioResults.length,
    selfDocScenarioCount: scenarioResults.filter((scenario) => scenario.kind.startsWith("self-doc")).length,
    targetProjectScenarioCount: scenarioResults.filter((scenario) => scenario.kind === "target-project").length,
    detectedReadOnlyScenarioCount: scenarioResults.filter((scenario) => scenario.availability === "detected-read-only").length,
    confirmationReadyScenarioCount: scenarioResults.filter((scenario) => scenario.checkedApply.readyForLocalHostConfirmationPreview === true).length,
    scenarioConfirmationReportCount: scenarioResults.reduce((total, scenario) => total + scenario.checkedApply.confirmationReportCount, 0),
    scenarioApplyAuthorityStillBlockedCount: scenarioResults.filter((scenario) => scenario.checkedApply.applyAuthorityStillBlocked === true).length,
    scenarioFinalHumanConfirmationRequiredCount: scenarioResults.filter((scenario) => scenario.checkedApply.finalHumanConfirmationRequired === true).length,
    scenarioFinalConflictRecheckRequiredCount: scenarioResults.filter((scenario) => scenario.checkedApply.finalConflictRecheckRequired === true).length,
    scenarioFormatterExecutionRequiredCount: scenarioResults.filter((scenario) => scenario.checkedApply.formatterExecutionRequiredAtApply === true).length,
    scenarioPostApplyValidationRequiredCount: scenarioResults.filter((scenario) => scenario.checkedApply.postApplyValidationRequired === true).length,
    workspaceApplyEditCallCount: Number(vscodeConfirmation.summary?.workspaceApplyEditCallCount ?? -1),
    workspaceWriteAllowedCount: scenarioResults.filter((scenario) => scenario.workspaceWriteAllowed).length,
    targetRepositoryMutationCount: scenarioResults.filter((scenario) => scenario.targetRepositoryMutationAllowed).length,
    targetRepositoryWriteAttemptedCount: scenarioResults.filter((scenario) => scenario.targetRepositoryWriteAttempted).length,
    directApplyAllowedCount: scenarioResults.filter((scenario) => scenario.directApplyAllowed).length,
    directEditObjectCount: countDirectEditObjects({
      scenarioResults,
      vscodeConfirmation
    }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({
      scenarioResults,
      vscodeConfirmation
    }),
    secretValueMarkerCount: countSecretValueMarkers({
      scenarioResults,
      vscodeConfirmation
    }),
    pathExposureCount: countPathExposure(serializedScenarios)
  };
  const checks = [
    check("HIA_WP37_TARGET_SELF_DOC_CONFIRMATION_INPUT_READY", summary.confirmationEvidenceReady === true
      && summary.confirmationHardFailureCount === 0
      && summary.confirmationInputCount === 2
      && summary.confirmationReportInputCount === 2, {
      actual: {
        confirmationEvidenceStatus: vscodeConfirmation.status,
        confirmationHardFailureCount: summary.confirmationHardFailureCount,
        confirmationInputCount: summary.confirmationInputCount,
        confirmationReportInputCount: summary.confirmationReportInputCount
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_PROVIDER_BASELINE_READY", summary.targetSelfDocProviderReady === true
      && summary.targetSelfDocProviderHardFailureCount === 0, {
      actual: {
        targetSelfDocProviderHardFailureCount: summary.targetSelfDocProviderHardFailureCount,
        targetSelfDocProviderStatus: targetSelfDocProvider.status
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_SCENARIOS_DECLARED", summary.scenarioCount === 5
      && summary.selfDocScenarioCount === 3
      && summary.targetProjectScenarioCount === 2
      && scenarioResults.some((scenario) => scenario.id === "unicode-art-js")
      && scenarioResults.some((scenario) => scenario.id === "hia-aspnetportal"), {
      actual: {
        scenarioIds: scenarioResults.map((scenario) => scenario.id),
        selfDocScenarioCount: summary.selfDocScenarioCount,
        targetProjectScenarioCount: summary.targetProjectScenarioCount
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_CONFIRMATION_ROUTED", summary.confirmationReadyScenarioCount === summary.scenarioCount
      && summary.scenarioConfirmationReportCount === summary.scenarioCount * summary.confirmationReportInputCount
      && summary.scenarioApplyAuthorityStillBlockedCount === summary.scenarioCount, {
      actual: {
        confirmationReadyScenarioCount: summary.confirmationReadyScenarioCount,
        scenarioApplyAuthorityStillBlockedCount: summary.scenarioApplyAuthorityStillBlockedCount,
        scenarioConfirmationReportCount: summary.scenarioConfirmationReportCount
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_FINAL_GATES_RETAINED", summary.scenarioFinalHumanConfirmationRequiredCount === summary.scenarioCount
      && summary.scenarioFinalConflictRecheckRequiredCount === summary.scenarioCount
      && summary.scenarioFormatterExecutionRequiredCount === summary.scenarioCount
      && summary.scenarioPostApplyValidationRequiredCount === summary.scenarioCount, {
      actual: {
        finalConflictRecheckRequiredCount: summary.scenarioFinalConflictRecheckRequiredCount,
        finalHumanConfirmationRequiredCount: summary.scenarioFinalHumanConfirmationRequiredCount,
        formatterExecutionRequiredCount: summary.scenarioFormatterExecutionRequiredCount,
        postApplyValidationRequiredCount: summary.scenarioPostApplyValidationRequiredCount
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_NO_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && targetPolicy.workspaceApplyEditAllowed === false, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditAllowed: targetPolicy.workspaceApplyEditAllowed,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && summary.pathExposureCount === 0
      && targetPolicy.sourcesContentPolicy === "none"
      && targetPolicy.sourceBodyReadAllowed === false, {
      actual: {
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyReadAllowed: targetPolicy.sourceBodyReadAllowed,
        sourcesContentPolicy: targetPolicy.sourcesContentPolicy
      }
    }),
    check("HIA_WP37_TARGET_SELF_DOC_CENTRAL_NOTIFY_POLICY", targetPolicy.notificationChannel === "central-notify"
      && targetPolicy.targetRepositoryMode === "read-only-observed"
      && targetPolicy.targetRepositoryMutationAllowed === false, {
      actual: targetPolicy
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-target-self-doc-checked-apply-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp37-closeout-and-provider-remote-inputs" : "blocked",
    sourceEvidence: {
      targetSelfDocProvider: normalizePath(inputPaths.targetSelfDocProvider),
      vscodeConfirmation: normalizePath(inputPaths.vscodeConfirmation)
    },
    targetPolicy,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checkedApplyDryRunScenarios: scenarioResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.7",
        topic: "checked-apply-closeout-and-forward-inputs",
        reason: "Target/self-doc checked apply confirmation dry-run now proves known scenarios can consume blocked host confirmation reports without repository writes."
      },
      {
        phase: "future",
        topic: "host-owned-writable-apply-sandbox",
        reason: "Writable apply still needs an explicit sandboxed host implementation with final confirmation, repeated conflict check, formatter execution, post-apply validation and audit completion."
      }
    ],
    manualChecks: [
      "Confirm target repositories continue reading central notify instead of receiving direct repository edits from HIA-Documentation-Sys.",
      "Confirm checked apply reports remain host confirmation previews and do not become executable edit objects.",
      "Confirm future writable apply work starts in a sandbox or fixture-owned workspace before any target repository branch/PR flow is attempted."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 target/self-doc checked apply dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P37 target/self-doc checked apply dry-run evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 target/self-doc checked apply dry-run evidence prepared at ${normalizePath(evidencePath)}`);
}

async function prepareCheckedApplyDryRunScenario(scenario, confirmationSummaries, confirmationReports) {
  const detected = await directoryExists(scenario.localPath);
  const matchedTargetKinds = confirmationSummaries
    .map((confirmation) => confirmation.targetKind)
    .filter((targetKind) => scenario.supportedTargetKinds.includes(targetKind));

  return {
    id: scenario.id,
    label: scenario.label,
    kind: scenario.kind,
    availability: detected ? "detected-read-only" : "not-detected",
    documentationNeeds: [...scenario.documentationNeeds],
    dryRunFocus: scenario.dryRunFocus,
    expectedInputContracts: [
      "hia-wp37-vscode-checked-apply-confirmation-evidence@0.1.0-draft",
      "hia-host-checked-apply-readiness-result@0.1.0-draft",
      "hia-host-rollback-record@0.1.0-draft",
      "hia-host-formatter-validation-record@0.1.0-draft",
      "hia-host-apply-audit-record@0.1.0-draft"
    ],
    checkedApply: {
      applyAuthorityStillBlocked: confirmationSummaries.every((confirmation) => confirmation.applyAuthorityStillBlocked === true),
      confirmationInputCount: confirmationSummaries.length,
      confirmationReportCount: confirmationReports.length,
      finalConflictRecheckRequired: confirmationSummaries.every((confirmation) => confirmation.finalConflictRecheckRequired === true),
      finalHumanConfirmationRequired: confirmationSummaries.every((confirmation) => confirmation.finalHumanConfirmationRequired === true),
      formatterExecutionRequiredAtApply: confirmationSummaries.every((confirmation) => confirmation.formatterExecutionRequiredAtApply === true),
      matchedTargetKinds: [...new Set(matchedTargetKinds)],
      postApplyValidationRequired: confirmationSummaries.every((confirmation) => confirmation.postApplyValidationRequired === true),
      readyForLocalHostConfirmationPreview: confirmationSummaries.length > 0
        && confirmationReports.length === confirmationSummaries.length,
      resultMode: "confirmation-preview-only"
    },
    sourcePolicy: {
      pathExposure: "redacted",
      sourceBodiesIncluded: false,
      sourcesContentPolicy: "none"
    },
    targetRepositoryMode: "read-only-observed",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    directApplyAllowed: false,
    workspaceWriteAllowed: false
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
      Object.hasOwn(node, "workspaceEdit")
      || Object.hasOwn(node, "documentChanges")
      || Object.hasOwn(node, "changes")
      || Object.hasOwn(node, "patch")
      || Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenDocumentTextMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText")
      || Object.hasOwn(node, "sourceBody")
      || Object.hasOwn(node, "rawSource")
      || Object.hasOwn(node, "sourceExcerpt")
      || Object.hasOwn(node, "documentText")
      || Object.hasOwn(node, "documentContent")
      || Object.hasOwn(node, "sourcesContent")
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
      Object.hasOwn(node, "secretValue")
      || Object.hasOwn(node, "apiKeyValue")
      || Object.hasOwn(node, "tokenValue")
      || Object.hasOwn(node, "password")
      || Object.hasOwn(node, "authorizationHeader")
    ) {
      count += 1;
    }
  });
  return count;
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
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
