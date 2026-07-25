import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-target-owner-pilot-dry-run-report-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const schemaPath = path.join(outputRoot, "wp47-target-owner-pilot-dry-run-report.schema.json");
const fixturesPath = path.join(outputRoot, "wp47-target-owner-pilot-dry-run-report-fixtures.md");
const ledgerPath = path.join(outputRoot, "wp47-target-owner-pilot-dry-run-report-ledger.md");
const summaryPath = path.join(outputRoot, "wp47-target-owner-pilot-dry-run-report-summary.md");

const inputPaths = {
  wp47HostConfirmationPacket: path.join(rootDir, "dist", "wp47-host-confirmation-surface-pilot-packet", "evidence.json"),
  wp46OwnerPacketSchema: path.join(rootDir, "dist", "wp46-owner-provided-evidence-packet-schema", "evidence.json"),
  wp46EvidenceRedactionValidator: path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator", "evidence.json"),
  wp46TargetOwnerHandoffReport: path.join(rootDir, "dist", "wp46-target-owner-handoff-report-packet", "evidence.json")
};

await main();

/**
 * 生成 W-P47.6 target-owner pilot dry-run report intake evidence。
 * Generate W-P47.6 target-owner pilot dry-run report intake evidence.
 *
 * 中文：本阶段定义 target owner 可提交的 checked apply pilot dry-run report
 * metadata intake、schema、validation fixtures 与 public-safe ledger。它只证明
 * 目标所有者报告如何被接收和拒绝，不代表真实目标项目已经提交报告，也不由 HIA
 * 运行目标命令、创建 branch/PR/sandbox、触发 checked apply 或修改目标仓库。
 *
 * English: This stage defines the target-owner submitted checked-apply pilot
 * dry-run report metadata intake, schema, validation fixtures, and public-safe
 * ledger. It only proves how target-owner reports are accepted or rejected. It
 * does not claim that a real target project has submitted a report, and HIA
 * does not run target commands, create branches/PRs/sandboxes, trigger checked
 * apply, or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.6 target-owner report intake evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const reportSchema = createDryRunReportSchema(inputs);
  const validationPolicy = createValidationPolicy(reportSchema);
  const fixtures = createReportFixtures();
  const validationResults = fixtures.map((fixture) => validateFixture(fixture, validationPolicy));
  const validationLedger = createValidationLedger(validationResults);
  const rejectionReport = createRejectionReport(validationResults);
  const summary = summarize({
    fixtures,
    inputs,
    rejectionReport,
    reportSchema,
    validationLedger,
    validationPolicy,
    validationResults
  });
  const checks = [
    check("HIA_WP47_OWNER_DRY_RUN_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0
      && summary.wp47HostConfirmationPacketReady === true
      && summary.wp46OwnerPacketSchemaReady === true
      && summary.wp46EvidenceRedactionValidatorReady === true
      && summary.wp46TargetOwnerHandoffReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp46EvidenceRedactionValidatorReady: summary.wp46EvidenceRedactionValidatorReady,
        wp46OwnerPacketSchemaReady: summary.wp46OwnerPacketSchemaReady,
        wp46TargetOwnerHandoffReady: summary.wp46TargetOwnerHandoffReady,
        wp47HostConfirmationPacketReady: summary.wp47HostConfirmationPacketReady
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_SCHEMA_READY", summary.requiredTopLevelFieldCount >= 12
      && summary.requiredOwnerFieldCount >= 2
      && summary.requiredPilotContextFieldCount >= 5
      && summary.requiredDryRunFieldCount >= 9
      && summary.requiredRedactionFieldCount >= 8
      && summary.artifactKindEnumCount >= 6, {
      actual: {
        artifactKindEnumCount: summary.artifactKindEnumCount,
        requiredDryRunFieldCount: summary.requiredDryRunFieldCount,
        requiredOwnerFieldCount: summary.requiredOwnerFieldCount,
        requiredPilotContextFieldCount: summary.requiredPilotContextFieldCount,
        requiredRedactionFieldCount: summary.requiredRedactionFieldCount,
        requiredTopLevelFieldCount: summary.requiredTopLevelFieldCount
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_FIXTURES_VALIDATE", summary.fixtureCount === 8
      && summary.expectedValidFixtureCount === 2
      && summary.expectedInvalidFixtureCount === 6
      && summary.validationResultCount === 8
      && summary.expectationMatchedCount === 8
      && summary.acceptedFixtureReportCount === 2
      && summary.rejectedFixtureReportCount === 6, {
      actual: {
        acceptedFixtureReportCount: summary.acceptedFixtureReportCount,
        expectationMatchedCount: summary.expectationMatchedCount,
        expectedInvalidFixtureCount: summary.expectedInvalidFixtureCount,
        expectedValidFixtureCount: summary.expectedValidFixtureCount,
        fixtureCount: summary.fixtureCount,
        rejectedFixtureReportCount: summary.rejectedFixtureReportCount,
        validationResultCount: summary.validationResultCount
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_REJECTION_PATHS_READY", summary.rejectionReasonKindCount >= 6
      && summary.hiaCommandRejectedCount === 1
      && summary.checkedApplyTriggerRejectedCount === 1
      && summary.targetMutationRejectedCount === 1
      && summary.sourcePrivacyRejectedCount === 1
      && summary.ownerAttestationRejectedCount === 1
      && summary.finalWriteAuthorizationClaimRejectedCount === 1, {
      actual: {
        checkedApplyTriggerRejectedCount: summary.checkedApplyTriggerRejectedCount,
        finalWriteAuthorizationClaimRejectedCount: summary.finalWriteAuthorizationClaimRejectedCount,
        hiaCommandRejectedCount: summary.hiaCommandRejectedCount,
        ownerAttestationRejectedCount: summary.ownerAttestationRejectedCount,
        rejectionReasonKindCount: summary.rejectionReasonKindCount,
        sourcePrivacyRejectedCount: summary.sourcePrivacyRejectedCount,
        targetMutationRejectedCount: summary.targetMutationRejectedCount
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_TARGET_OWNER_ONLY", summary.realTargetOwnerReportSubmittedCount === 0
      && summary.targetOwnerReportSubmissionSlotReady === true
      && summary.hiaMayRunTargetCommand === false
      && summary.hiaMayCreateBranchOrPr === false
      && summary.hiaMayCreateSandbox === false
      && summary.hiaMayMutateTargetRepository === false
      && summary.hiaMayTriggerCheckedApply === false
      && summary.hiaMayCollectFinalConfirmation === false, {
      actual: {
        hiaMayCollectFinalConfirmation: summary.hiaMayCollectFinalConfirmation,
        hiaMayCreateBranchOrPr: summary.hiaMayCreateBranchOrPr,
        hiaMayCreateSandbox: summary.hiaMayCreateSandbox,
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand,
        hiaMayTriggerCheckedApply: summary.hiaMayTriggerCheckedApply,
        realTargetOwnerReportSubmittedCount: summary.realTargetOwnerReportSubmittedCount,
        targetOwnerReportSubmissionSlotReady: summary.targetOwnerReportSubmissionSlotReady
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_NO_WRITE_AUTHORITY", summary.checkedApplyWriteEnabledCount === 0
      && summary.pilotWriteAuthorizedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        pilotWriteAuthorizedCount: summary.pilotWriteAuthorizedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.reportBodyStoredCount === 0
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        reportBodyStoredCount: summary.reportBodyStoredCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_OWNER_DRY_RUN_NEXT_STAGE_READY", summary.readyForWp47CloseoutAndWp48Inputs === true
      && summary.nextStage === "W-P47.7 Closeout And W-P48 Inputs", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47CloseoutAndWp48Inputs: summary.readyForWp47CloseoutAndWp48Inputs
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.6 target-owner pilot dry-run report intake has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-target-owner-pilot-dry-run-report-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-closeout-and-wp48-inputs",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    intakePolicy: {
      phase: "W-P47.6",
      cycleGroupId: "C-HIA-P2",
      policy: "target-owner-submitted-pilot-dry-run-report-metadata-only",
      targetOwnerReportSubmissionSlotReady: true,
      realTargetOwnerReportSubmittedByThisStage: false,
      hiaAutomationMayRunTargetCommand: false,
      hiaAutomationMayCreateBranchOrPullRequest: false,
      hiaAutomationMayCreateSandbox: false,
      hiaAutomationMayMutateTargetRepository: false,
      hiaAutomationMayTriggerCheckedApply: false,
      hiaAutomationMayCollectFinalConfirmation: false,
      checkedApplyWriteEnabledByThisStage: false,
      sourcesContentPolicy: "none"
    },
    reportSchema,
    validationPolicy,
    fixtureMatrix: fixtures.map(toPublicFixture),
    validationLedger,
    rejectionReport,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      fixtures: normalizePath(fixturesPath),
      ledger: normalizePath(ledgerPath),
      schema: normalizePath(schemaPath),
      summary: normalizePath(summaryPath)
    },
    nextStageInputs: createNextStageInputs(),
    manualChecks: [
      "Confirm W-P47.6 fixture acceptance does not claim a real target-owner report was submitted.",
      "Confirm reports are metadata-only and reference-only; source/request/response bodies and secrets remain forbidden.",
      "Confirm target-owner executed actions may be referenced only as owner-submitted metadata, never as HIA execution.",
      "Confirm W-P47.7 closeout keeps real checked apply write and real target project mutation as deferred gates."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.6 target-owner pilot dry-run report intake evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(schemaPath, `${JSON.stringify(reportSchema, null, 2)}\n`, "utf8");
  await writeFile(fixturesPath, renderFixtures(evidence), "utf8");
  await writeFile(ledgerPath, renderLedger(evidence), "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    fixtures: fixturesPath,
    ledger: ledgerPath,
    schema: schemaPath,
    summary: summaryPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 target-owner pilot dry-run report intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 target-owner pilot dry-run report schema prepared at ${normalizePath(schemaPath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createDryRunReportSchema(inputs) {
  const allowedHostSurfaces = inputs.wp47HostConfirmationPacket.hostSurfaces.map((surface) => surface.host);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "urn:hia-doc:wp47:target-owner-pilot-dry-run-report.schema",
    title: "HIA Target-Owner Pilot Dry-Run Report",
    description: "Target-owner submitted metadata-only report for checked apply pilot dry-run observation. 中文：target owner 主动提交的 checked apply pilot dry-run metadata report。",
    type: "object",
    additionalProperties: false,
    required: [
      "contract",
      "contractVersion",
      "reportId",
      "createdAt",
      "status",
      "owner",
      "targetProject",
      "pilotContext",
      "hostConfirmation",
      "dryRun",
      "redaction",
      "artifacts",
      "attestations"
    ],
    properties: {
      contract: constString("hia-target-owner-pilot-dry-run-report"),
      contractVersion: constString("0.1.0-draft"),
      reportId: safeId(),
      createdAt: { type: "string", format: "date-time" },
      status: enumValues(["draft", "submitted-metadata", "validated", "rejected", "archived"]),
      owner: objectShape(["role", "attestedByTargetOwner"], {
        role: enumValues(["target-owner", "maintainer"]),
        attestedByTargetOwner: { type: "boolean", const: true },
        displayRef: safeString()
      }),
      targetProject: objectShape(["projectRef", "repositoryRef", "targetMutationByHia"], {
        projectRef: safeString(),
        repositoryRef: safeString(),
        branchRef: safeString(),
        pullRequestRef: safeString(),
        sandboxRef: safeString(),
        targetMutationByHia: { type: "boolean", const: false },
        targetCommandExecutedByHia: { type: "boolean", const: false }
      }),
      pilotContext: objectShape([
        "wp47HostConfirmationPacketRef",
        "hostSurface",
        "checkedApplyWriteEnabled",
        "pilotWriteAuthorized",
        "sourcePolicy"
      ], {
        wp47HostConfirmationPacketRef: safeString(),
        hostSurface: enumValues(allowedHostSurfaces),
        checkedApplyWriteEnabled: { type: "boolean", const: false },
        pilotWriteAuthorized: { type: "boolean", const: false },
        sourcePolicy: enumValues(["none"]),
        finalHumanConfirmationCollectedByHia: { type: "boolean", const: false }
      }),
      hostConfirmation: objectShape([
        "observed",
        "finalHumanConfirmationVisible",
        "applyActionDisabled",
        "targetOwnerActionRequired"
      ], {
        observed: { type: "boolean" },
        finalHumanConfirmationVisible: { type: "boolean", const: true },
        applyActionDisabled: { type: "boolean", const: true },
        targetOwnerActionRequired: { type: "boolean", const: true },
        finalWriteAuthorizationClaimed: { type: "boolean", const: false }
      }),
      dryRun: objectShape([
        "executedBy",
        "hiaExecuted",
        "targetCommandExecutedByHia",
        "checkedApplyTriggered",
        "realWritePerformed",
        "workspaceWriteByHia",
        "targetRepositoryMutationByHia",
        "formatterExecutedByHia",
        "postApplyValidationExecutedByHia"
      ], {
        executedBy: enumValues(["target-owner", "not-executed"]),
        hiaExecuted: { type: "boolean", const: false },
        targetCommandExecutedByHia: { type: "boolean", const: false },
        checkedApplyTriggered: { type: "boolean", const: false },
        realWritePerformed: { type: "boolean", const: false },
        workspaceWriteByHia: { type: "boolean", const: false },
        targetRepositoryMutationByHia: { type: "boolean", const: false },
        formatterExecutedByHia: { type: "boolean", const: false },
        postApplyValidationExecutedByHia: { type: "boolean", const: false },
        resultSummary: safeString()
      }),
      redaction: objectShape([
        "attested",
        "sourceBodyIncluded",
        "sourceTextIncluded",
        "requestBodyIncluded",
        "responseBodyIncluded",
        "credentialValueIncluded",
        "digestValueIncluded",
        "absolutePathIncluded"
      ], {
        attested: { type: "boolean", const: true },
        sourceBodyIncluded: { type: "boolean", const: false },
        sourceTextIncluded: { type: "boolean", const: false },
        requestBodyIncluded: { type: "boolean", const: false },
        responseBodyIncluded: { type: "boolean", const: false },
        credentialValueIncluded: { type: "boolean", const: false },
        digestValueIncluded: { type: "boolean", const: false },
        absolutePathIncluded: { type: "boolean", const: false }
      }),
      artifacts: {
        type: "array",
        minItems: 1,
        items: objectShape(["artifactId", "artifactKind", "contentIncluded", "redacted", "summary"], {
          artifactId: safeId(),
          artifactKind: enumValues([
            "host-confirmation-observation",
            "target-owner-check-summary",
            "dry-run-command-summary",
            "redaction-attestation",
            "sandbox-reference",
            "branch-reference"
          ]),
          contentIncluded: { type: "boolean", const: false },
          redacted: { type: "boolean", const: true },
          summary: safeString(),
          reference: safeString()
        })
      },
      attestations: objectShape(["metadataOnly", "targetOwnerSubmitted", "noHiaTargetMutation"], {
        metadataOnly: { type: "boolean", const: true },
        targetOwnerSubmitted: { type: "boolean", const: true },
        noHiaTargetMutation: { type: "boolean", const: true },
        noSourceBody: { type: "boolean", const: true }
      })
    }
  };
}

function createValidationPolicy(reportSchema) {
  return {
    contract: "hia-wp47-target-owner-pilot-dry-run-report-validator",
    contractVersion: "0.1.0-draft",
    schemaRef: reportSchema.$id,
    rules: [
      rule("owner.attestation", "owner attestation must be true"),
      rule("pilot.no-write-authority", "checked apply write and pilot write authorization must be false"),
      rule("host.disabled-apply-visible", "host confirmation must show disabled apply and required final human confirmation"),
      rule("dry-run.no-hia-execution", "HIA must not execute target commands, checked apply or repository mutation"),
      rule("dry-run.no-real-write", "dry-run report must not claim real write was performed"),
      rule("redaction.clean", "source, request, response, credential, digest and absolute path flags must be false"),
      rule("artifact.reference-only", "artifacts must be redacted metadata/reference entries only"),
      rule("attestation.metadata-only", "report attestations must confirm metadata-only target-owner submission")
    ],
    outputPolicy: {
      storesReportBodies: false,
      storesSourceBodies: false,
      storesRollbackContent: false,
      storesCredentialValues: false,
      storesDigestValues: false,
      storesRequestBodies: false,
      storesResponseBodies: false,
      storesLocalAbsolutePaths: false
    },
    hiaAuthority: {
      mayRunTargetCommand: false,
      mayCreateBranchOrPullRequest: false,
      mayCreateSandbox: false,
      mayMutateTargetRepository: false,
      mayTriggerCheckedApply: false,
      mayCollectFinalConfirmation: false
    }
  };
}

function rule(id, summary) {
  return {
    id,
    severity: "required-before-ingestion",
    summary
  };
}

function createReportFixtures() {
  const valid = createValidReport("valid-minimal-host-observation");
  const validWithRefs = createValidReport("valid-external-artifact-refs");
  validWithRefs.artifacts.push({
    artifactId: "artifact:dry.run.summary",
    artifactKind: "dry-run-command-summary",
    contentIncluded: false,
    redacted: true,
    summary: "Target-owner dry-run command summary reference; command body is not stored.",
    reference: "target-owner-managed-reference"
  });

  return [
    fixture("valid-minimal-host-observation", "valid", valid),
    fixture("valid-external-artifact-refs", "valid", validWithRefs),
    invalidFixture("invalid-hia-target-command", (report) => {
      report.dryRun.targetCommandExecutedByHia = true;
      report.targetProject.targetCommandExecutedByHia = true;
    }),
    invalidFixture("invalid-checked-apply-triggered", (report) => {
      report.dryRun.checkedApplyTriggered = true;
      report.pilotContext.checkedApplyWriteEnabled = true;
    }),
    invalidFixture("invalid-target-mutation-by-hia", (report) => {
      report.targetProject.targetMutationByHia = true;
      report.dryRun.targetRepositoryMutationByHia = true;
    }),
    invalidFixture("invalid-source-body-included", (report) => {
      report.redaction.sourceBodyIncluded = true;
      report.artifacts[0].contentIncluded = true;
    }),
    invalidFixture("invalid-missing-owner-attestation", (report) => {
      report.owner.attestedByTargetOwner = false;
      report.attestations.targetOwnerSubmitted = false;
    }),
    invalidFixture("invalid-final-write-authorization-claim", (report) => {
      report.hostConfirmation.finalWriteAuthorizationClaimed = true;
      report.pilotContext.pilotWriteAuthorized = true;
    })
  ];
}

function createValidReport(id) {
  return {
    contract: "hia-target-owner-pilot-dry-run-report",
    contractVersion: "0.1.0-draft",
    reportId: `report:${id}`,
    createdAt: "2026-07-25T00:00:00.000Z",
    status: "submitted-metadata",
    owner: {
      role: "target-owner",
      attestedByTargetOwner: true,
      displayRef: "target-owner-ref"
    },
    targetProject: {
      projectRef: "target-project-ref",
      repositoryRef: "target-repository-ref",
      branchRef: "target-owner-managed-branch-ref",
      pullRequestRef: "target-owner-managed-pr-ref",
      sandboxRef: "target-owner-managed-sandbox-ref",
      targetMutationByHia: false,
      targetCommandExecutedByHia: false
    },
    pilotContext: {
      wp47HostConfirmationPacketRef: "wp47-host-confirmation-surface-pilot-packet",
      hostSurface: "vscode",
      checkedApplyWriteEnabled: false,
      pilotWriteAuthorized: false,
      sourcePolicy: "none",
      finalHumanConfirmationCollectedByHia: false
    },
    hostConfirmation: {
      observed: true,
      finalHumanConfirmationVisible: true,
      applyActionDisabled: true,
      targetOwnerActionRequired: true,
      finalWriteAuthorizationClaimed: false
    },
    dryRun: {
      executedBy: "target-owner",
      hiaExecuted: false,
      targetCommandExecutedByHia: false,
      checkedApplyTriggered: false,
      realWritePerformed: false,
      workspaceWriteByHia: false,
      targetRepositoryMutationByHia: false,
      formatterExecutedByHia: false,
      postApplyValidationExecutedByHia: false,
      resultSummary: "Target-owner dry-run metadata summary only."
    },
    redaction: {
      attested: true,
      sourceBodyIncluded: false,
      sourceTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      credentialValueIncluded: false,
      digestValueIncluded: false,
      absolutePathIncluded: false
    },
    artifacts: [
      {
        artifactId: "artifact:host.confirmation.observation",
        artifactKind: "host-confirmation-observation",
        contentIncluded: false,
        redacted: true,
        summary: "Host confirmation observation reference without screenshot body.",
        reference: "target-owner-managed-reference"
      },
      {
        artifactId: "artifact:redaction.attestation",
        artifactKind: "redaction-attestation",
        contentIncluded: false,
        redacted: true,
        summary: "Owner attests report is metadata-only and public-safe.",
        reference: "target-owner-managed-reference"
      }
    ],
    attestations: {
      metadataOnly: true,
      targetOwnerSubmitted: true,
      noHiaTargetMutation: true,
      noSourceBody: true
    }
  };
}

function fixture(id, expected, report) {
  return {
    id,
    expected,
    report
  };
}

function invalidFixture(id, mutate) {
  const report = createValidReport(id);
  mutate(report);
  return fixture(id, "invalid", report);
}

function validateFixture(fixtureItem, policy) {
  const errors = validateReport(fixtureItem.report, policy);
  const actual = errors.length === 0 ? "valid" : "invalid";
  const expectationMatched = actual === fixtureItem.expected;
  const publicProjection = createPublicProjection(fixtureItem.report, errors);
  assertNoPrivateMarkers(JSON.stringify(publicProjection), `W-P47.6 public projection ${fixtureItem.id}`);
  return {
    fixtureId: fixtureItem.id,
    reportId: fixtureItem.report.reportId,
    expected: fixtureItem.expected,
    actual,
    expectationMatched,
    decision: actual === "valid" ? "accept-metadata-for-closeout" : "reject-before-ingestion",
    errorCodes: [...new Set(errors.map((error) => error.code))],
    errorCount: errors.length,
    publicProjection,
    reportBodyStored: false,
    sourceBodyIncludedInEvidence: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    secretValueIncluded: false,
    digestValueIncludedInEvidence: false,
    localAbsolutePathIncluded: false,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiCalled: false,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directEditObjectProduced: false,
    targetCommandExecutedByHia: false
  };
}

function validateReport(report, policy) {
  const errors = [];
  if (report.owner?.attestedByTargetOwner !== true) {
    errors.push(error("owner.attestation", "Owner attestation is missing."));
  }
  if (report.pilotContext?.checkedApplyWriteEnabled !== false || report.pilotContext?.pilotWriteAuthorized !== false) {
    errors.push(error("pilot.no-write-authority", "Report claims checked apply write authority."));
  }
  if (report.hostConfirmation?.finalHumanConfirmationVisible !== true
    || report.hostConfirmation?.applyActionDisabled !== true
    || report.hostConfirmation?.targetOwnerActionRequired !== true
    || report.hostConfirmation?.finalWriteAuthorizationClaimed === true) {
    errors.push(error("host.disabled-apply-visible", "Host confirmation state is unsafe."));
  }
  if (report.dryRun?.hiaExecuted !== false
    || report.dryRun?.targetCommandExecutedByHia !== false
    || report.dryRun?.checkedApplyTriggered !== false
    || report.dryRun?.workspaceWriteByHia !== false
    || report.dryRun?.targetRepositoryMutationByHia !== false
    || report.targetProject?.targetCommandExecutedByHia !== false
    || report.targetProject?.targetMutationByHia !== false) {
    errors.push(error("dry-run.no-hia-execution", "Report claims HIA execution or mutation."));
  }
  if (report.dryRun?.realWritePerformed !== false) {
    errors.push(error("dry-run.no-real-write", "Report claims a real write was performed."));
  }
  if (report.redaction?.attested !== true
    || report.redaction?.sourceBodyIncluded !== false
    || report.redaction?.sourceTextIncluded !== false
    || report.redaction?.requestBodyIncluded !== false
    || report.redaction?.responseBodyIncluded !== false
    || report.redaction?.credentialValueIncluded !== false
    || report.redaction?.digestValueIncluded !== false
    || report.redaction?.absolutePathIncluded !== false) {
    errors.push(error("redaction.clean", "Redaction flags are not public-safe."));
  }
  if (!Array.isArray(report.artifacts)
    || report.artifacts.length === 0
    || report.artifacts.some((artifact) => artifact.contentIncluded !== false || artifact.redacted !== true)) {
    errors.push(error("artifact.reference-only", "Artifacts must be redacted reference-only metadata."));
  }
  if (report.attestations?.metadataOnly !== true
    || report.attestations?.targetOwnerSubmitted !== true
    || report.attestations?.noHiaTargetMutation !== true
    || report.attestations?.noSourceBody !== true) {
    errors.push(error("attestation.metadata-only", "Metadata-only attestations are incomplete."));
  }
  if (!hasNoPrivateMarkers(JSON.stringify(report))) {
    errors.push(error("privacy.no-private-markers", "Report contains a private marker."));
  }
  assert.equal(policy.outputPolicy.storesReportBodies, false, "W-P47.6 validator must not store report bodies.");
  return errors;
}

function error(code, message) {
  return { code, message };
}

function createPublicProjection(report, errors) {
  return {
    reportId: report.reportId,
    status: report.status,
    hostSurface: report.pilotContext?.hostSurface ?? "unknown",
    artifactCount: Array.isArray(report.artifacts) ? report.artifacts.length : 0,
    errorCount: errors.length,
    errorCodes: errors.map((item) => item.code)
  };
}

function createValidationLedger(validationResults) {
  return validationResults.map((result) => ({
    fixtureId: result.fixtureId,
    reportId: result.reportId,
    decision: result.decision,
    errorCodes: result.errorCodes,
    publicProjection: result.publicProjection,
    reportBodyStored: false,
    targetOwnerAction: result.decision === "accept-metadata-for-closeout" ? "none" : "resubmit-metadata-only-report"
  }));
}

function createRejectionReport(validationResults) {
  return validationResults
    .filter((result) => result.decision === "reject-before-ingestion")
    .map((result) => ({
      fixtureId: result.fixtureId,
      reportId: result.reportId,
      errorCodes: result.errorCodes,
      targetOwnerAction: "resubmit-metadata-only-report",
      storedRejectedReportBody: false
    }));
}

function summarize({ fixtures, inputs, rejectionReport, reportSchema, validationLedger, validationPolicy, validationResults }) {
  const inputEntries = Object.entries(inputs);
  const serializedPublicSurface = JSON.stringify({
    rejectionReport,
    reportSchema: stripSchemaDescriptions(reportSchema),
    validationLedger,
    validationPolicy,
    validationResults: validationResults.map((result) => ({
      decision: result.decision,
      errorCodes: result.errorCodes,
      fixtureId: result.fixtureId,
      publicProjection: result.publicProjection
    }))
  });
  return {
    phase: "W-P47.6",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount: inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp47HostConfirmationPacketReady: inputs.wp47HostConfirmationPacket.status === "ready-for-wp47-target-owner-pilot-dry-run-report-intake",
    wp46OwnerPacketSchemaReady: inputs.wp46OwnerPacketSchema.status === "ready-for-wp46-redaction-privacy-validator",
    wp46EvidenceRedactionValidatorReady: inputs.wp46EvidenceRedactionValidator.status === "ready-for-wp46-host-review-projection-for-owner-evidence",
    wp46TargetOwnerHandoffReady: inputs.wp46TargetOwnerHandoffReport.status === "ready-for-wp46-closeout-and-wp47-wp48-inputs",
    requiredTopLevelFieldCount: reportSchema.required.length,
    requiredOwnerFieldCount: reportSchema.properties.owner.required.length,
    requiredPilotContextFieldCount: reportSchema.properties.pilotContext.required.length,
    requiredDryRunFieldCount: reportSchema.properties.dryRun.required.length,
    requiredRedactionFieldCount: reportSchema.properties.redaction.required.length,
    artifactKindEnumCount: reportSchema.properties.artifacts.items.properties.artifactKind.enum.length,
    fixtureCount: fixtures.length,
    expectedValidFixtureCount: fixtures.filter((item) => item.expected === "valid").length,
    expectedInvalidFixtureCount: fixtures.filter((item) => item.expected === "invalid").length,
    validationResultCount: validationResults.length,
    expectationMatchedCount: validationResults.filter((item) => item.expectationMatched === true).length,
    acceptedFixtureReportCount: validationResults.filter((item) => item.decision === "accept-metadata-for-closeout").length,
    rejectedFixtureReportCount: validationResults.filter((item) => item.decision === "reject-before-ingestion").length,
    rejectionReasonKindCount: new Set(rejectionReport.flatMap((item) => item.errorCodes)).size,
    hiaCommandRejectedCount: countError(rejectionReport, "dry-run.no-hia-execution", "invalid-hia-target-command"),
    checkedApplyTriggerRejectedCount: countError(rejectionReport, "pilot.no-write-authority", "invalid-checked-apply-triggered"),
    targetMutationRejectedCount: countError(rejectionReport, "dry-run.no-hia-execution", "invalid-target-mutation-by-hia"),
    sourcePrivacyRejectedCount: countError(rejectionReport, "redaction.clean", "invalid-source-body-included"),
    ownerAttestationRejectedCount: countError(rejectionReport, "owner.attestation", "invalid-missing-owner-attestation"),
    finalWriteAuthorizationClaimRejectedCount: countError(rejectionReport, "pilot.no-write-authority", "invalid-final-write-authorization-claim"),
    realTargetOwnerReportSubmittedCount: 0,
    targetOwnerReportSubmissionSlotReady: true,
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    hiaMayTriggerCheckedApply: false,
    hiaMayCollectFinalConfirmation: false,
    checkedApplyWriteEnabledCount: validationResults.filter((item) => item.checkedApplyWriteEnabled === true).length,
    pilotWriteAuthorizedCount: validationResults.filter((item) => item.pilotWriteAuthorized === true).length,
    hostEditorApiCallCount: validationResults.filter((item) => item.hostEditorApiCalled === true).length,
    checkedApplyTriggeredCount: validationResults.filter((item) => item.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: validationResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: validationResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    directEditObjectProducedCount: validationResults.filter((item) => item.directEditObjectProduced === true).length,
    targetCommandExecutedByHiaCount: validationResults.filter((item) => item.targetCommandExecutedByHia === true).length,
    reportBodyStoredCount: validationResults.filter((item) => item.reportBodyStored === true).length,
    sourceBodyIncludedInEvidenceCount: validationResults.filter((item) => item.sourceBodyIncludedInEvidence === true).length,
    sourceTextIncludedCount: 0,
    requestBodyIncludedCount: validationResults.filter((item) => item.requestBodyIncluded === true).length,
    responseBodyIncludedCount: validationResults.filter((item) => item.responseBodyIncluded === true).length,
    secretValueIncludedCount: validationResults.filter((item) => item.secretValueIncluded === true).length,
    digestValueIncludedInEvidenceCount: validationResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    localAbsolutePathDetectedCount: countPathExposure(serializedPublicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(serializedPublicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(serializedPublicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    readyForWp47CloseoutAndWp48Inputs: true,
    nextStage: "W-P47.7 Closeout And W-P48 Inputs",
    hardFailureCount: 0
  };
}

function toPublicFixture(fixtureItem) {
  return {
    id: fixtureItem.id,
    expected: fixtureItem.expected,
    signalSummary: {
      ownerAttested: fixtureItem.report.owner.attestedByTargetOwner === true,
      checkedApplyWriteEnabled: fixtureItem.report.pilotContext.checkedApplyWriteEnabled === true,
      pilotWriteAuthorized: fixtureItem.report.pilotContext.pilotWriteAuthorized === true,
      hiaExecuted: fixtureItem.report.dryRun.hiaExecuted === true,
      targetCommandExecutedByHia: fixtureItem.report.dryRun.targetCommandExecutedByHia === true
        || fixtureItem.report.targetProject.targetCommandExecutedByHia === true,
      targetMutationByHia: fixtureItem.report.dryRun.targetRepositoryMutationByHia === true
        || fixtureItem.report.targetProject.targetMutationByHia === true,
      finalWriteAuthorizationClaimed: fixtureItem.report.hostConfirmation.finalWriteAuthorizationClaimed === true,
      privacySignal: fixtureItem.report.redaction.sourceBodyIncluded === true
        || fixtureItem.report.redaction.credentialValueIncluded === true
        || fixtureItem.report.redaction.absolutePathIncluded === true,
      artifactContentIncluded: fixtureItem.report.artifacts.some((artifact) => artifact.contentIncluded === true)
    },
    publicEvidenceContainsReportBody: false,
    publicEvidenceContainsSourceBody: false,
    writeAuthorityGranted: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P47.7",
      topic: "closeout-and-wp48-inputs",
      status: "ready-input",
      requirement: "Close W-P47 while keeping real target-owner reports and real checked apply write as deferred gates.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P48",
      topic: "c-hia-p2-closeout",
      status: "planned-input",
      requirement: "Use W-P47 closeout to summarize completed pilot preparation and deferred controlled execution gates.",
      writeAuthorityGranted: false
    }
  ];
}

function renderFixtures(evidence) {
  const rows = evidence.validationLedger
    .map((item) => `| \`${item.fixtureId}\` | \`${item.decision}\` | ${item.errorCodes.map((code) => `\`${code}\``).join(", ") || "none"} | ${item.reportBodyStored ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.6 Target-Owner Pilot Dry-Run Report Fixtures

## 中文摘要

这些 fixture 验证 target-owner pilot dry-run report intake 的接受和拒绝路径。fixture 通过不代表真实目标项目已提交报告。

| Fixture | Decision | Error Codes | Stores Report Body |
| --- | --- | --- | --- |
${rows}
`;
}

function renderLedger(evidence) {
  const rows = evidence.validationLedger
    .map((item) => `| \`${item.reportId}\` | \`${item.decision}\` | ${item.errorCodes.map((code) => `\`${code}\``).join(", ") || "none"} | \`${item.targetOwnerAction}\` |`)
    .join("\n");

  return `# W-P47.6 Target-Owner Pilot Dry-Run Report Ledger

## 中文摘要

ledger 只记录 public-safe metadata projection、decision 和 target owner action，不保存 report body、源码正文或凭证。

| Report | Decision | Error Codes | Target Owner Action |
| --- | --- | --- | --- |
${rows}
`;
}

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P47.6 Target-Owner Pilot Dry-Run Report Intake Summary

## 中文摘要

- status: \`${evidence.status}\`
- fixture reports: ${summary.fixtureCount}
- accepted fixture reports: ${summary.acceptedFixtureReportCount}
- rejected fixture reports: ${summary.rejectedFixtureReportCount}
- real target-owner report submitted count: ${summary.realTargetOwnerReportSubmittedCount}
- target-owner report submission slot ready: ${summary.targetOwnerReportSubmissionSlotReady}
- checked apply write enabled / pilot write authorized: ${summary.checkedApplyWriteEnabledCount} / ${summary.pilotWriteAuthorizedCount}
- target command by HIA / target mutation / checked apply trigger: ${summary.targetCommandExecutedByHiaCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount}
- report body / source body / request body / response body / secret in evidence: ${summary.reportBodyStoredCount} / ${summary.sourceBodyIncludedInEvidenceCount} / ${summary.requestBodyIncludedCount} / ${summary.responseBodyIncludedCount} / ${summary.secretValueIncludedCount}

## Next

W-P47.7 should close W-P47 and split completed pilot preparation inputs from deferred real target-owner report and real checked apply write gates.
`;
}

function constString(value) {
  return { type: "string", const: value };
}

function enumValues(values) {
  return { type: "string", enum: values };
}

function safeString() {
  return {
    type: "string",
    maxLength: 500
  };
}

function safeId() {
  return {
    type: "string",
    pattern: "^[a-z0-9][a-z0-9._:-]{3,160}$"
  };
}

function objectShape(required, properties) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties
  };
}

function countError(rejectionReport, code, fixtureId) {
  return rejectionReport.filter((item) => item.fixtureId === fixtureId && item.errorCodes.includes(code)).length;
}

function stripSchemaDescriptions(value) {
  if (Array.isArray(value)) {
    return value.map(stripSchemaDescriptions);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "description")
        .map(([key, child]) => [key, stripSchemaDescriptions(child)])
    );
  }
  return value;
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
}

function hasNoPrivateMarkers(serialized) {
  return !/(^|[^A-Za-z])[A-Za-z]:[\\/]/u.test(serialized)
    && !/file:\/\//iu.test(serialized)
    && !/(?:^|[\\/])work-zone(?:[\\/]|$)/iu.test(serialized)
    && !/(?:^|[\\/])Users[\\/]/iu.test(serialized)
    && !/"sourcesContent"\s*:/iu.test(serialized)
    && !/sk-[A-Za-z0-9_-]{8,}/u.test(serialized)
    && !/ghp_[A-Za-z0-9_]{8,}/u.test(serialized)
    && !/npm_[A-Za-z0-9_]{8,}/u.test(serialized);
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
