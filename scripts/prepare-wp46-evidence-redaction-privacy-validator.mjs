import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputRoot = path.join(rootDir, "dist", "wp46-owner-provided-evidence-packet-schema");
const outputRoot = path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator");
const packetSchemaInputPath = path.join(inputRoot, "owner-provided-evidence-packet.schema.json");
const examplePacketInputPath = path.join(inputRoot, "owner-provided-evidence-packet.example.json");
const schemaEvidenceInputPath = path.join(inputRoot, "evidence.json");
const evidencePath = path.join(outputRoot, "evidence.json");
const validatorGuidePath = path.join(outputRoot, "owner-evidence-redaction-privacy-validator.md");
const validationLedgerPath = path.join(outputRoot, "owner-evidence-validation-ledger.md");
const rejectionReportPath = path.join(outputRoot, "owner-evidence-rejection-report.md");

await main();

/**
 * 生成 W-P46.3 owner evidence redaction/privacy validator evidence。
 * Generate W-P46.3 owner evidence redaction/privacy validator evidence.
 *
 * 中文：本阶段把 W-P46.2 的 packet schema、safe example 与 validation fixtures
 * 转成可执行验证器。验证器只输出 public-safe ledger，不保存 owner packet 正文、
 * target source body、request/response body、credential value、本地绝对路径或可执行编辑。
 *
 * English: This stage turns the W-P46.2 packet schema, safe example and
 * validation fixtures into an executable validator. The validator only writes
 * public-safe ledgers and never stores owner packet bodies, target source
 * bodies, request/response bodies, credential values, local absolute paths or
 * executable edits.
 *
 * @returns {Promise<void>} Writes public-safe validator evidence and reports.
 */
async function main() {
  const schemaEvidence = await readJson(schemaEvidenceInputPath);
  const packetSchema = await readJson(packetSchemaInputPath);
  const examplePacket = await readJson(examplePacketInputPath);
  const validationPolicy = createValidationPolicy(packetSchema);
  const fixturePackets = createFixturePackets(schemaEvidence, examplePacket);
  const validationResults = fixturePackets.map((fixture) => validateFixturePacket({
    fixture,
    packetSchema,
    validationPolicy
  }));
  const validationLedger = createValidationLedger(validationResults);
  const rejectionReport = createRejectionReport(validationResults);
  const summary = summarize({
    fixturePackets,
    packetSchema,
    rejectionReport,
    schemaEvidence,
    validationLedger,
    validationPolicy,
    validationResults
  });
  const checks = [
    check("HIA_WP46_REDACTION_VALIDATOR_INPUT_READY", summary.inputSchemaReady === true
      && summary.inputHardFailureCount === 0
      && summary.schemaStatus === "ready-for-wp46-redaction-privacy-validator", {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        inputSchemaReady: summary.inputSchemaReady,
        schemaStatus: summary.schemaStatus
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_FIXTURE_COVERAGE", summary.fixtureCount === 7
      && summary.expectedValidCount === 2
      && summary.expectedInvalidCount === 5, {
      actual: {
        expectedInvalidCount: summary.expectedInvalidCount,
        expectedValidCount: summary.expectedValidCount,
        fixtureCount: summary.fixtureCount
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_SCHEMA_AND_PRIVACY_RESULTS", summary.validationResultCount === 7
      && summary.passedValidationExpectationCount === 7
      && summary.privacyAcceptedCount === 2
      && summary.privacyRejectedCount === 5, {
      actual: {
        passedValidationExpectationCount: summary.passedValidationExpectationCount,
        privacyAcceptedCount: summary.privacyAcceptedCount,
        privacyRejectedCount: summary.privacyRejectedCount,
        validationResultCount: summary.validationResultCount
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_REJECTION_PATHS_READY", summary.rejectionReportReady === true
      && summary.rejectionEntryCount === 5
      && summary.rejectionReasonKindCount >= 5, {
      actual: {
        rejectionEntryCount: summary.rejectionEntryCount,
        rejectionReasonKindCount: summary.rejectionReasonKindCount,
        rejectionReportReady: summary.rejectionReportReady
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_PUBLIC_SAFE_LEDGER_READY", summary.publicSafeLedgerReady === true
      && summary.ledgerEntryCount === 7
      && summary.packetBodyStoredCount === 0, {
      actual: {
        ledgerEntryCount: summary.ledgerEntryCount,
        packetBodyStoredCount: summary.packetBodyStoredCount,
        publicSafeLedgerReady: summary.publicSafeLedgerReady
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_NO_HIA_TARGET_AUTHORITY", summary.hiaMayRunTargetCommand === false
      && summary.hiaMayCreateBranchOrPr === false
      && summary.hiaMayMutateTargetRepository === false
      && summary.hiaMayReadTargetSourceBody === false
      && summary.checkedApplyTriggeredCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directEditObjectCount: summary.directEditObjectCount,
        hiaMayCreateBranchOrPr: summary.hiaMayCreateBranchOrPr,
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayReadTargetSourceBody: summary.hiaMayReadTargetSourceBody,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand
      }
    }),
    check("HIA_WP46_REDACTION_VALIDATOR_PRIVACY_CLEAN", summary.sourceTextIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount
      }
    })
  ];

  assert.equal(checks.filter((item) => item.status === "fail").length, 0, "W-P46.3 validator evidence checks must pass.");

  const evidence = {
    contract: "hia-wp46-evidence-redaction-privacy-validator-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp46-host-review-projection-for-owner-evidence",
    sourceEvidence: {
      ownerProvidedEvidencePacketSchema: normalizePath(schemaEvidenceInputPath),
      ownerProvidedEvidencePacketExample: normalizePath(examplePacketInputPath),
      ownerProvidedEvidencePacketSchemaEvidence: normalizePath(schemaEvidenceInputPath)
    },
    validationPolicy,
    validationLedger,
    rejectionReport,
    summary,
    checks,
    generatedDocs: {
      ownerEvidenceRedactionPrivacyValidator: normalizePath(validatorGuidePath),
      ownerEvidenceValidationLedger: normalizePath(validationLedgerPath),
      ownerEvidenceRejectionReport: normalizePath(rejectionReportPath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.4",
        topic: "host-review-projection-for-owner-evidence",
        status: "ready-input",
        reason: "Validated owner evidence packets now have public-safe ledger and rejection report shapes."
      },
      {
        phase: "W-P46.5",
        topic: "adoption-trial-scenario-matrix",
        status: "validator-prepared",
        reason: "Adoption trials can reference the validator outcome without exposing target source bodies or owner packet contents."
      }
    ]
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46.3 redaction validator evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(validatorGuidePath, renderValidatorGuide({ summary, validationPolicy }), "utf8");
  await writeFile(validationLedgerPath, renderValidationLedger(validationLedger), "utf8");
  await writeFile(rejectionReportPath, renderRejectionReport(rejectionReport), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    rejectionReport: rejectionReportPath,
    validationLedger: validationLedgerPath,
    validatorGuide: validatorGuidePath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P46 evidence redaction privacy validator evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 owner evidence validator guide prepared at ${normalizePath(validatorGuidePath)}`);
  console.log(`W-P46 owner evidence validation ledger prepared at ${normalizePath(validationLedgerPath)}`);
  console.log(`W-P46 owner evidence rejection report prepared at ${normalizePath(rejectionReportPath)}`);
}

function createValidationPolicy(packetSchema) {
  return {
    contract: "hia-owner-evidence-redaction-privacy-validator",
    contractVersion: "0.1.0-draft",
    schemaRef: packetSchema.$id,
    rules: [
      rule("schema.required-fields", "required", "必须满足 owner-provided evidence packet schema 的 required 字段。"),
      rule("schema.additional-properties", "required", "对象不得携带 schema 未声明字段。"),
      rule("owner.attestation", "required", "owner.attestedByTargetOwner 必须为 true。"),
      rule("redaction.attestation", "required", "redaction.attested 必须为 true。"),
      rule("redaction.no-source-body", "required", "redaction.sourceBodyIncluded 必须为 false。"),
      rule("redaction.no-credential-value", "required", "redaction.credentialValueIncluded 必须为 false。"),
      rule("redaction.no-request-body", "required", "redaction.requestBodyIncluded 必须为 false。"),
      rule("redaction.no-response-body", "required", "redaction.responseBodyIncluded 必须为 false。"),
      rule("redaction.no-absolute-path", "required", "redaction.absolutePathIncluded 必须为 false。"),
      rule("artifact.no-content", "required", "artifact.contentIncluded 必须为 false，artifact 只能描述 metadata/reference。"),
      rule("artifact.redacted", "required", "artifact.redacted 缺省时按未确认处理；若存在必须为 true。"),
      rule("source.review-only", "required", "sourceResultRef.reviewOnly 必须为 true，providerResultProduced 必须为 false。"),
      rule("target.no-hia-command", "required", "targetProject.targetCommandExecutedByHia 必须为 false。"),
      rule("target.no-hia-mutation", "required", "targetProject.workspaceMutationByHia 必须为 false。"),
      rule("privacy.no-private-markers", "required", "所有 string metadata 不得含 token、sourcesContent、本地绝对路径或疑似源码/request/response 正文 marker。")
    ],
    outputPolicy: {
      storesPacketBodies: false,
      storesSourceBodies: false,
      storesCredentialValues: false,
      storesRequestBodies: false,
      storesResponseBodies: false,
      storesLocalAbsolutePaths: false,
      storesDirectEditObjects: false
    },
    hiaAuthority: {
      mayRunTargetCommand: false,
      mayCreateBranchOrPullRequest: false,
      mayMutateTargetRepository: false,
      mayReadTargetSourceBody: false,
      mayTriggerCheckedApply: false
    }
  };
}

function rule(id, severity, summary) {
  return { id, severity, summary };
}

function createFixturePackets(schemaEvidence, examplePacket) {
  const fixtures = schemaEvidence.validationFixtures?.fixtures;
  assert.ok(Array.isArray(fixtures), "W-P46.2 validation fixtures must exist.");
  return fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    expected: fixture.expected,
    expectedReason: fixture.reason,
    packet: createPacketForFixture(fixture, examplePacket)
  }));
}

function createPacketForFixture(fixture, examplePacket) {
  const packet = structuredClone(examplePacket);
  packet.packetId = `owner:evidence:fixture:${fixture.id.replaceAll("-", ".")}`;

  switch (fixture.id) {
    case "valid-owner-check-summary":
      packet.status = "submitted";
      packet.evidenceKind = "owner-check-summary";
      return packet;
    case "valid-host-review-observation":
      packet.status = "redaction-check-ready";
      packet.evidenceKind = "host-review-linkage-observation";
      packet.artifacts = [
        {
          artifactId: "artifact:host.review.observation",
          artifactKind: "host-review-observation",
          locationKind: "host-capture-reference",
          contentIncluded: false,
          summary: "Host review observation reference without source text.",
          reference: "host-managed-reference",
          redacted: true
        }
      ];
      return packet;
    case "invalid-missing-owner-attestation":
      packet.owner.attestedByTargetOwner = false;
      return packet;
    case "invalid-source-body-included":
      packet.redaction.sourceBodyIncluded = true;
      return packet;
    case "invalid-credential-value-included":
      packet.redaction.credentialValueIncluded = true;
      return packet;
    case "invalid-hia-target-command":
      packet.targetProject.targetCommandExecutedByHia = true;
      return packet;
    case "invalid-artifact-content-included":
      packet.artifacts[0].contentIncluded = true;
      return packet;
    default:
      throw new Error(`Unsupported W-P46.3 fixture id: ${fixture.id}`);
  }
}

function validateFixturePacket({ fixture, packetSchema, validationPolicy }) {
  const schemaErrors = validateWithSchema(packetSchema, fixture.packet, "$");
  const privacyErrors = validatePrivacyRules(fixture.packet, validationPolicy);
  const errors = [...schemaErrors, ...privacyErrors];
  const actual = errors.length === 0 ? "valid" : "invalid";
  const expectationMatched = actual === fixture.expected;

  return {
    fixtureId: fixture.fixtureId,
    packetId: fixture.packet.packetId,
    expected: fixture.expected,
    actual,
    expectationMatched,
    decision: actual === "valid" ? "accept-for-host-review-projection" : "reject-before-ingestion",
    publicSafe: hasNoPrivateMarkers(JSON.stringify(createPublicSafePacketProjection(fixture.packet))),
    errorCodes: [...new Set(errors.map((error) => error.code))],
    errorCount: errors.length,
    ownerAction: actual === "valid" ? "none" : "resubmit-redacted-metadata-only",
    expectedReason: fixture.expectedReason
  };
}

function createPublicSafePacketProjection(packet) {
  return {
    packetId: packet.packetId,
    status: packet.status,
    evidenceKind: packet.evidenceKind,
    artifactCount: Array.isArray(packet.artifacts) ? packet.artifacts.length : 0,
    checkCount: Array.isArray(packet.checks) ? packet.checks.length : 0
  };
}

function validateWithSchema(schema, value, pathPrefix) {
  const errors = [];

  if (schema.type) {
    const actualType = jsonType(value);
    if (actualType !== schema.type) {
      return [{
        code: "schema.type",
        path: pathPrefix,
        message: `Expected ${schema.type}, got ${actualType}.`
      }];
    }
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push({
      code: "schema.const",
      path: pathPrefix,
      message: "Value does not match required const."
    });
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      code: "schema.enum",
      path: pathPrefix,
      message: "Value is not in allowed enum."
    });
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push({ code: "schema.minLength", path: pathPrefix, message: "String is too short." });
    }
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      errors.push({ code: "schema.maxLength", path: pathPrefix, message: "String is too long." });
    }
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push({ code: "schema.pattern", path: pathPrefix, message: "String does not match pattern." });
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
      errors.push({ code: "schema.format.date-time", path: pathPrefix, message: "String is not a date-time." });
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push({ code: "schema.minItems", path: pathPrefix, message: "Array has too few items." });
    }
    if (schema.items) {
      for (const [index, item] of value.entries()) {
        errors.push(...validateWithSchema(schema.items, item, `${pathPrefix}[${index}]`));
      }
    }
  }

  if (isRecord(value)) {
    const properties = schema.properties ?? {};
    for (const requiredKey of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push({
          code: "schema.required",
          path: `${pathPrefix}.${requiredKey}`,
          message: "Required property is missing."
        });
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push({
            code: "schema.additionalProperties",
            path: `${pathPrefix}.${key}`,
            message: "Additional property is not allowed."
          });
        }
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateWithSchema(childSchema, value[key], `${pathPrefix}.${key}`));
      }
    }
  }

  return errors;
}

function validatePrivacyRules(packet) {
  const errors = [];
  addIf(errors, packet.owner?.attestedByTargetOwner !== true, "owner.attestation", "$.owner.attestedByTargetOwner");
  addIf(errors, packet.redaction?.attested !== true, "redaction.attestation", "$.redaction.attested");
  addIf(errors, packet.redaction?.sourceBodyIncluded !== false, "redaction.no-source-body", "$.redaction.sourceBodyIncluded");
  addIf(errors, packet.redaction?.credentialValueIncluded !== false, "redaction.no-credential-value", "$.redaction.credentialValueIncluded");
  addIf(errors, packet.redaction?.requestBodyIncluded !== false, "redaction.no-request-body", "$.redaction.requestBodyIncluded");
  addIf(errors, packet.redaction?.responseBodyIncluded !== false, "redaction.no-response-body", "$.redaction.responseBodyIncluded");
  addIf(errors, packet.redaction?.absolutePathIncluded !== false, "redaction.no-absolute-path", "$.redaction.absolutePathIncluded");
  addIf(errors, packet.targetProject?.workspaceMutationByHia !== false, "target.no-hia-mutation", "$.targetProject.workspaceMutationByHia");
  addIf(errors, packet.targetProject?.targetCommandExecutedByHia !== false, "target.no-hia-command", "$.targetProject.targetCommandExecutedByHia");
  addIf(errors, packet.sourceResultRef?.reviewOnly !== true, "source.review-only", "$.sourceResultRef.reviewOnly");
  addIf(errors, packet.sourceResultRef?.providerResultProduced === true, "source.no-provider-result", "$.sourceResultRef.providerResultProduced");

  for (const [index, artifact] of (packet.artifacts ?? []).entries()) {
    addIf(errors, artifact.contentIncluded !== false, "artifact.no-content", `$.artifacts[${index}].contentIncluded`);
    addIf(errors, Object.hasOwn(artifact, "redacted") && artifact.redacted !== true, "artifact.redacted", `$.artifacts[${index}].redacted`);
  }

  const stringMarkerErrors = collectStringMarkerErrors(packet);
  errors.push(...stringMarkerErrors);
  return errors;
}

function addIf(errors, condition, code, pathValue) {
  if (condition) {
    errors.push({
      code,
      path: pathValue,
      message: "Privacy or authority rule failed."
    });
  }
}

function collectStringMarkerErrors(value) {
  const errors = [];
  visitValues(value, (candidate, valuePath) => {
    const markerCode = classifyPrivateMarker(candidate);
    if (markerCode) {
      errors.push({
        code: markerCode,
        path: valuePath,
        message: "String metadata contains a forbidden private marker."
      });
    }
  });
  return errors;
}

function classifyPrivateMarker(value) {
  if (/(^|[^A-Za-z])[A-Za-z]:[\\/]/u.test(value) || /file:\/\//iu.test(value) || /\\\\[^\\/]+[\\/][^\\/]+/u.test(value)) {
    return "privacy.no-local-path";
  }
  if (/(?:^|[\\/])work-zone(?:[\\/]|$)/iu.test(value) || /(?:^|[\\/])Users[\\/]/iu.test(value)) {
    return "privacy.no-private-path";
  }
  if (/"sourcesContent"\s*:/iu.test(value)) {
    return "privacy.no-sources-content";
  }
  if (/sk-[A-Za-z0-9_-]{8,}/u.test(value) || /ghp_[A-Za-z0-9_]{8,}/u.test(value) || /npm_[A-Za-z0-9_]{8,}/u.test(value)) {
    return "privacy.no-token-marker";
  }
  return "";
}

function createValidationLedger(validationResults) {
  return {
    contract: "hia-wp46-owner-evidence-validation-ledger",
    contractVersion: "0.1.0-draft",
    publicSafe: true,
    storesPacketBodies: false,
    entries: validationResults.map((result) => ({
      fixtureId: result.fixtureId,
      packetId: result.packetId,
      expected: result.expected,
      actual: result.actual,
      expectationMatched: result.expectationMatched,
      decision: result.decision,
      errorCodes: result.errorCodes,
      errorCount: result.errorCount,
      ownerAction: result.ownerAction
    }))
  };
}

function createRejectionReport(validationResults) {
  const rejected = validationResults.filter((result) => result.actual === "invalid");
  return {
    contract: "hia-wp46-owner-evidence-rejection-report",
    contractVersion: "0.1.0-draft",
    publicSafe: true,
    storesPacketBodies: false,
    entries: rejected.map((result) => ({
      fixtureId: result.fixtureId,
      packetId: result.packetId,
      decision: result.decision,
      errorCodes: result.errorCodes,
      ownerAction: result.ownerAction,
      reason: result.expectedReason
    }))
  };
}

function summarize({
  fixturePackets,
  packetSchema,
  rejectionReport,
  schemaEvidence,
  validationLedger,
  validationPolicy,
  validationResults
}) {
  const serializedLedger = JSON.stringify(validationLedger);
  const serializedRejectionReport = JSON.stringify(rejectionReport);
  const serializedPolicy = JSON.stringify(validationPolicy);
  const allSerialized = `${serializedLedger}\n${serializedRejectionReport}\n${serializedPolicy}`;
  const expectationMatches = validationResults.filter((result) => result.expectationMatched);
  const accepted = validationResults.filter((result) => result.actual === "valid");
  const rejected = validationResults.filter((result) => result.actual === "invalid");
  const rejectionCodes = new Set(rejected.flatMap((result) => result.errorCodes));

  return {
    phase: "W-P46.3",
    inputSchemaReady: isRecord(packetSchema) && packetSchema.$id === "https://hia-doc.local/contracts/owner-provided-evidence-packet.schema.json",
    schemaStatus: schemaEvidence.status,
    inputHardFailureCount: schemaEvidence.summary?.hardFailureCount ?? 0,
    fixtureCount: fixturePackets.length,
    expectedValidCount: fixturePackets.filter((fixture) => fixture.expected === "valid").length,
    expectedInvalidCount: fixturePackets.filter((fixture) => fixture.expected === "invalid").length,
    validationResultCount: validationResults.length,
    passedValidationExpectationCount: expectationMatches.length,
    privacyAcceptedCount: accepted.length,
    privacyRejectedCount: rejected.length,
    schemaValidatedPacketCount: accepted.length,
    rejectionReportReady: rejectionReport.publicSafe === true && rejectionReport.storesPacketBodies === false,
    rejectionEntryCount: rejectionReport.entries.length,
    rejectionReasonKindCount: rejectionCodes.size,
    publicSafeLedgerReady: validationLedger.publicSafe === true && validationLedger.storesPacketBodies === false,
    ledgerEntryCount: validationLedger.entries.length,
    packetBodyStoredCount: validationLedger.storesPacketBodies ? 1 : 0,
    storesSourceBodies: validationPolicy.outputPolicy.storesSourceBodies,
    storesCredentialValues: validationPolicy.outputPolicy.storesCredentialValues,
    storesRequestBodies: validationPolicy.outputPolicy.storesRequestBodies,
    storesResponseBodies: validationPolicy.outputPolicy.storesResponseBodies,
    storesDirectEditObjects: validationPolicy.outputPolicy.storesDirectEditObjects,
    hiaMayRunTargetCommand: validationPolicy.hiaAuthority.mayRunTargetCommand,
    hiaMayCreateBranchOrPr: validationPolicy.hiaAuthority.mayCreateBranchOrPullRequest,
    hiaMayMutateTargetRepository: validationPolicy.hiaAuthority.mayMutateTargetRepository,
    hiaMayReadTargetSourceBody: validationPolicy.hiaAuthority.mayReadTargetSourceBody,
    checkedApplyTriggeredCount: validationPolicy.hiaAuthority.mayTriggerCheckedApply ? 1 : 0,
    directEditObjectCount: validationPolicy.outputPolicy.storesDirectEditObjects ? 1 : 0,
    sourceTextIncludedCount: validationPolicy.outputPolicy.storesSourceBodies ? 1 : 0,
    secretValueIncludedCount: validationPolicy.outputPolicy.storesCredentialValues ? 1 : 0,
    requestBodyIncludedCount: validationPolicy.outputPolicy.storesRequestBodies ? 1 : 0,
    responseBodyIncludedCount: validationPolicy.outputPolicy.storesResponseBodies ? 1 : 0,
    localAbsolutePathDetectedCount: countPathExposure(allSerialized),
    credentialMaterialMarkerCount: countCredentialMarkers(allSerialized),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(allSerialized) ? 1 : 0,
    nextStage: "W-P46.4 Host Review Projection For Owner Evidence",
    hardFailureCount: 0
  };
}

function renderValidatorGuide({ summary, validationPolicy }) {
  const rules = validationPolicy.rules
    .map((item) => `- \`${item.id}\`：${item.summary}`)
    .join("\n");
  return `# W-P46.3 Owner Evidence Redaction / Privacy Validator

## 中文摘要

本文件记录 W-P46.3 的 owner evidence redaction/privacy validator。validator 消费 W-P46.2 的 packet schema、safe example 与 validation fixtures，只输出 public-safe ledger 与 rejection report。

它不保存 owner packet 正文，不读取目标项目源码正文，不包含 request/response body、credential value、本地绝对路径、direct edit object 或 checked apply trigger。

## English Summary

This validator consumes the W-P46.2 owner-provided evidence packet schema, safe example and validation fixtures. It only writes public-safe ledger and rejection-report metadata.

## 状态

- status：\`ready-for-wp46-host-review-projection-for-owner-evidence\`
- fixture count：${summary.fixtureCount}
- accepted / rejected：${summary.privacyAcceptedCount} / ${summary.privacyRejectedCount}
- expectation matched：${summary.passedValidationExpectationCount} / ${summary.validationResultCount}
- packet body stored：${summary.packetBodyStoredCount}
- next stage：\`${summary.nextStage}\`

## 验证规则

${rules}
`;
}

function renderValidationLedger(validationLedger) {
  const rows = validationLedger.entries
    .map((entry) => `| \`${entry.fixtureId}\` | \`${entry.expected}\` | \`${entry.actual}\` | ${entry.expectationMatched ? "yes" : "no"} | \`${entry.decision}\` | ${entry.errorCodes.length} |`)
    .join("\n");
  return `# W-P46.3 Owner Evidence Validation Ledger

## 中文摘要

该 ledger 只保存 fixture id、packet id、expected/actual、decision 和 error code 数量，不保存 owner packet 正文。

| Fixture | Expected | Actual | Matched | Decision | Error Count |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderRejectionReport(rejectionReport) {
  const rows = rejectionReport.entries
    .map((entry) => `| \`${entry.fixtureId}\` | \`${entry.decision}\` | \`${entry.errorCodes.join(", ")}\` | \`${entry.ownerAction}\` | ${entry.reason} |`)
    .join("\n");
  return `# W-P46.3 Owner Evidence Rejection Report

## 中文摘要

该 report 只记录 public-safe 拒绝原因。target owner 需要重新提交脱敏后的 metadata-only evidence packet；HIA automation 不会代为执行目标项目命令、创建 branch/PR/sandbox 或修改目标仓库。

| Fixture | Decision | Error Codes | Owner Action | Reason |
| --- | --- | --- | --- | --- |
${rows}
`;
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

function jsonType(value) {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function visitValues(value, visitor, valuePath = "$") {
  if (typeof value === "string") {
    visitor(value, valuePath);
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      visitValues(item, visitor, `${valuePath}[${index}]`);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitValues(item, visitor, `${valuePath}.${key}`);
    }
  }
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
}

function hasNoPrivateMarkers(serialized) {
  return countPathExposure(serialized) === 0
    && countCredentialMarkers(serialized) === 0
    && !/"sourcesContent"\s*:/iu.test(serialized)
    && !/(?:^|[\\/])work-zone(?:[\\/]|$)/iu.test(serialized)
    && !/(?:^|[\\/])Users[\\/]/iu.test(serialized);
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
