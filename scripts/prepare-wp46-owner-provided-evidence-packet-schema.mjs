import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-owner-provided-evidence-packet-schema");
const evidencePath = path.join(outputRoot, "evidence.json");
const schemaPath = path.join(outputRoot, "owner-provided-evidence-packet.schema.json");
const examplePath = path.join(outputRoot, "owner-provided-evidence-packet.example.json");
const guidePath = path.join(outputRoot, "owner-provided-evidence-packet-schema.md");
const validationFixturesPath = path.join(outputRoot, "owner-provided-evidence-packet-validation-fixtures.md");
const intakeEvidencePath = path.join(rootDir, "dist", "wp46-target-owner-evidence-ingestion-intake", "evidence.json");

await main();

/**
 * 生成 W-P46.2 owner-provided evidence packet schema evidence。
 * Generate W-P46.2 owner-provided evidence packet schema evidence.
 *
 * This stage turns the W-P46.1 intake boundary into a concrete packet schema
 * for evidence supplied by target owners. The packet stores metadata,
 * attestations and external/reference-only artifact descriptors; it never
 * stores source bodies, request bodies, response bodies, credentials, local
 * absolute paths, direct edit objects or repository-mutation authority.
 *
 * 中文：本阶段把 W-P46.1 的 intake boundary 固化为 target owner 可提交的
 * evidence packet schema。packet 只保存元数据、声明与 reference-only artifact
 * 描述；不得保存源码正文、request body、response body、凭证、本地绝对路径、
 * direct edit object 或目标仓库变更授权。
 *
 * @returns {Promise<void>} Writes public-safe schema and evidence artifacts.
 */
async function main() {
  const intakeEvidence = await readJson(intakeEvidencePath);
  const packetSchema = createPacketSchema(intakeEvidence);
  const examplePacket = createExamplePacket(intakeEvidence);
  const stateModel = createStateModel();
  const validationFixtures = createValidationFixtures(packetSchema, examplePacket);
  const summary = summarize({
    examplePacket,
    intakeEvidence,
    packetSchema,
    stateModel,
    validationFixtures
  });
  const checks = [
    check("HIA_WP46_PACKET_SCHEMA_INPUT_READY", summary.intakeReady === true
      && summary.inputHardFailureCount === 0
      && summary.acceptedEvidenceKindCount === 8, {
      actual: {
        acceptedEvidenceKindCount: summary.acceptedEvidenceKindCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        intakeStatus: intakeEvidence.status
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_CORE_FIELDS_READY", summary.requiredTopLevelFieldCount >= 11
      && summary.requiredOwnerFieldCount >= 2
      && summary.requiredTargetProjectFieldCount >= 3
      && summary.requiredRedactionFieldCount >= 7
      && summary.requiredArtifactFieldCount >= 5, {
      actual: {
        requiredArtifactFieldCount: summary.requiredArtifactFieldCount,
        requiredOwnerFieldCount: summary.requiredOwnerFieldCount,
        requiredRedactionFieldCount: summary.requiredRedactionFieldCount,
        requiredTargetProjectFieldCount: summary.requiredTargetProjectFieldCount,
        requiredTopLevelFieldCount: summary.requiredTopLevelFieldCount
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_ENUMS_READY", summary.evidenceKindEnumCount === 8
      && summary.statusEnumCount >= 6
      && summary.artifactKindEnumCount >= 8
      && summary.redactionPolicyEnumCount >= 3, {
      actual: {
        artifactKindEnumCount: summary.artifactKindEnumCount,
        evidenceKindEnumCount: summary.evidenceKindEnumCount,
        redactionPolicyEnumCount: summary.redactionPolicyEnumCount,
        statusEnumCount: summary.statusEnumCount
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_STATE_MODEL_READY", summary.stateCount === 7
      && summary.acceptingStateCount >= 2
      && summary.rejectionStateCount >= 2
      && summary.transitionCount >= 8, {
      actual: {
        acceptingStateCount: summary.acceptingStateCount,
        rejectionStateCount: summary.rejectionStateCount,
        stateCount: summary.stateCount,
        transitionCount: summary.transitionCount
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_SAFE_EXAMPLE_READY", summary.examplePacketReady === true
      && summary.exampleArtifactCount >= 3
      && summary.exampleContentIncludedCount === 0
      && summary.exampleOwnerAttested === true
      && summary.exampleRedactionClean === true, {
      actual: {
        exampleArtifactCount: summary.exampleArtifactCount,
        exampleContentIncludedCount: summary.exampleContentIncludedCount,
        exampleOwnerAttested: summary.exampleOwnerAttested,
        examplePacketReady: summary.examplePacketReady,
        exampleRedactionClean: summary.exampleRedactionClean
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_VALIDATION_FIXTURES_READY", summary.validationFixtureCount >= 6
      && summary.validFixtureCount >= 2
      && summary.invalidFixtureCount >= 4
      && summary.invalidFixtureReasonCount >= 4, {
      actual: {
        invalidFixtureCount: summary.invalidFixtureCount,
        invalidFixtureReasonCount: summary.invalidFixtureReasonCount,
        validFixtureCount: summary.validFixtureCount,
        validationFixtureCount: summary.validationFixtureCount
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_NO_HIA_TARGET_AUTHORITY", summary.hiaMayRunTargetCommand === false
      && summary.hiaMayCreateBranchOrPr === false
      && summary.hiaMayMutateTargetRepository === false
      && summary.hiaMayReadTargetSourceBody === false
      && summary.checkedApplyTriggeredCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        hiaMayCreateBranchOrPr: summary.hiaMayCreateBranchOrPr,
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayReadTargetSourceBody: summary.hiaMayReadTargetSourceBody,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand
      }
    }),
    check("HIA_WP46_PACKET_SCHEMA_PRIVACY_CLEAN", summary.secretValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.directEditObjectCount === 0
      && summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        directEditObjectCount: summary.directEditObjectCount,
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
    contract: "hia-wp46-owner-provided-evidence-packet-schema-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp46-redaction-privacy-validator" : "blocked",
    sourceEvidence: {
      targetOwnerEvidenceIngestionIntake: normalizePath(intakeEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    packetSchema,
    examplePacket,
    stateModel,
    validationFixtures,
    checks,
    generatedDocs: {
      ownerProvidedEvidencePacketSchema: normalizePath(schemaPath),
      ownerProvidedEvidencePacketExample: normalizePath(examplePath),
      ownerProvidedEvidencePacketGuide: normalizePath(guidePath),
      ownerProvidedEvidencePacketValidationFixtures: normalizePath(validationFixturesPath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.3",
        topic: "evidence-redaction-and-privacy-validator",
        status: "ready-input",
        reason: "The owner-provided evidence packet schema now defines fields, forbidden content markers, redaction attestations and validation fixtures."
      },
      {
        phase: "W-P46.4",
        topic: "host-review-projection-for-owner-evidence",
        status: "schema-prepared",
        reason: "Host review projection can consume validated owner-provided evidence packets after W-P46.3 redaction validation is in place."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46 owner-provided evidence packet schema evidence");
  assert.equal(hardFailures.length, 0, `W-P46 owner-provided evidence packet schema has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(schemaPath, `${JSON.stringify(packetSchema, null, 2)}\n`, "utf8");
  await writeFile(examplePath, `${JSON.stringify(examplePacket, null, 2)}\n`, "utf8");
  await writeFile(guidePath, renderGuideMarkdown(evidence), "utf8");
  await writeFile(validationFixturesPath, renderValidationFixturesMarkdown(evidence), "utf8");
  console.log(`W-P46 owner-provided evidence packet schema evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 owner-provided evidence packet schema prepared at ${normalizePath(schemaPath)}`);
  console.log(`W-P46 owner-provided evidence packet example prepared at ${normalizePath(examplePath)}`);
  console.log(`W-P46 owner-provided evidence packet guide prepared at ${normalizePath(guidePath)}`);
  console.log(`W-P46 owner-provided evidence packet fixtures prepared at ${normalizePath(validationFixturesPath)}`);
}

function createPacketSchema(intakeEvidence) {
  const evidenceKindEnum = intakeEvidence.intakeMatrix.acceptedEvidenceKinds.map((item) => item.id);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://hia-doc.local/contracts/owner-provided-evidence-packet.schema.json",
    title: "HIA Owner-Provided Evidence Packet",
    description: "Public-safe metadata packet supplied by a target owner for HIA review ingestion. 中文：目标项目所有者主动提供的 public-safe evidence metadata packet。",
    type: "object",
    additionalProperties: false,
    required: [
      "contract",
      "contractVersion",
      "packetId",
      "createdAt",
      "status",
      "evidenceKind",
      "owner",
      "targetProject",
      "sourceResultRef",
      "redaction",
      "artifacts"
    ],
    properties: {
      contract: constString("hia-owner-provided-evidence-packet"),
      contractVersion: constString("0.1.0-draft"),
      packetId: stringPattern("^[a-z0-9][a-z0-9._:-]{3,120}$"),
      createdAt: { type: "string", format: "date-time" },
      status: enumValues([
        "draft",
        "submitted",
        "redaction-check-ready",
        "validated",
        "rejected",
        "archived"
      ]),
      evidenceKind: enumValues(evidenceKindEnum),
      owner: {
        type: "object",
        additionalProperties: false,
        required: ["ownerRole", "attestedByTargetOwner"],
        properties: {
          ownerRole: enumValues(["target-owner", "maintainer", "reviewer"]),
          attestedByTargetOwner: { type: "boolean", const: true },
          displayName: safeString(),
          contactRef: safeString()
        }
      },
      targetProject: {
        type: "object",
        additionalProperties: false,
        required: ["projectRef", "repositoryRef", "workspaceMutationByHia"],
        properties: {
          projectRef: safeString(),
          repositoryRef: safeString(),
          branchRef: safeString(),
          pullRequestRef: safeString(),
          sandboxRef: safeString(),
          workspaceMutationByHia: { type: "boolean", const: false },
          targetCommandExecutedByHia: { type: "boolean", const: false }
        }
      },
      sourceResultRef: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "resultKind", "reviewOnly"],
        properties: {
          phase: safeString(),
          resultKind: safeString(),
          providerId: safeString(),
          reviewOnly: { type: "boolean", const: true },
          providerResultProduced: { type: "boolean", const: false }
        }
      },
      redaction: {
        type: "object",
        additionalProperties: false,
        required: [
          "attested",
          "policy",
          "sourceBodyIncluded",
          "credentialValueIncluded",
          "requestBodyIncluded",
          "responseBodyIncluded",
          "absolutePathIncluded"
        ],
        properties: {
          attested: { type: "boolean", const: true },
          policy: enumValues(["public-safe-metadata-only", "redacted-summary", "external-private-reference"]),
          sourceBodyIncluded: { type: "boolean", const: false },
          credentialValueIncluded: { type: "boolean", const: false },
          requestBodyIncluded: { type: "boolean", const: false },
          responseBodyIncluded: { type: "boolean", const: false },
          absolutePathIncluded: { type: "boolean", const: false },
          redactionNotes: safeString()
        }
      },
      artifacts: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["artifactId", "artifactKind", "locationKind", "contentIncluded", "summary"],
          properties: {
            artifactId: stringPattern("^[a-z0-9][a-z0-9._:-]{3,120}$"),
            artifactKind: enumValues([
              "transcript-summary",
              "check-summary",
              "branch-reference",
              "pull-request-reference",
              "sandbox-reference",
              "screenshot-report-reference",
              "redaction-attestation",
              "host-review-observation"
            ]),
            locationKind: enumValues(["inline-metadata", "external-reference", "host-capture-reference"]),
            contentIncluded: { type: "boolean", const: false },
            summary: safeString(),
            reference: safeString(),
            redacted: { type: "boolean", const: true }
          }
        }
      },
      checks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["checkId", "status", "summary"],
          properties: {
            checkId: stringPattern("^[a-z0-9][a-z0-9._:-]{3,120}$"),
            status: enumValues(["pass", "fail", "skipped", "not-run"]),
            summary: safeString()
          }
        }
      },
      notes: safeString()
    }
  };
}

function constString(value) {
  return {
    type: "string",
    const: value
  };
}

function enumValues(values) {
  return {
    type: "string",
    enum: values
  };
}

function safeString() {
  return {
    type: "string",
    minLength: 1,
    maxLength: 400
  };
}

function stringPattern(pattern) {
  return {
    type: "string",
    pattern
  };
}

function createExamplePacket(intakeEvidence) {
  return {
    contract: "hia-owner-provided-evidence-packet",
    contractVersion: "0.1.0-draft",
    packetId: "owner-evidence:demo:webtest2:001",
    createdAt: "2026-07-24T00:00:00.000Z",
    status: "submitted",
    evidenceKind: "owner-check-summary",
    owner: {
      ownerRole: "target-owner",
      attestedByTargetOwner: true,
      displayName: "target owner",
      contactRef: "owner-managed-contact"
    },
    targetProject: {
      projectRef: "target-project-demo",
      repositoryRef: "owner-managed-repository",
      branchRef: "owner-managed-branch",
      pullRequestRef: "owner-managed-pull-request",
      sandboxRef: "owner-managed-sandbox",
      workspaceMutationByHia: false,
      targetCommandExecutedByHia: false
    },
    sourceResultRef: {
      phase: "W-P45.6",
      resultKind: intakeEvidence.summary?.sourceProviderResultKind ?? "execution-gate-blocked",
      providerId: "openai.responses-api",
      reviewOnly: true,
      providerResultProduced: false
    },
    redaction: {
      attested: true,
      policy: "public-safe-metadata-only",
      sourceBodyIncluded: false,
      credentialValueIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      absolutePathIncluded: false,
      redactionNotes: "Only command/check metadata and owner-managed references are included."
    },
    artifacts: [
      artifact("artifact:check-summary", "check-summary", "inline-metadata", "Owner-provided check summary without raw logs."),
      artifact("artifact:branch-reference", "branch-reference", "external-reference", "Owner-managed branch reference without HIA push authority."),
      artifact("artifact:redaction-attestation", "redaction-attestation", "inline-metadata", "Owner attests secrets, private paths and source bodies are not included.")
    ],
    checks: [
      {
        checkId: "schema-required-fields",
        status: "pass",
        summary: "Required owner, targetProject, sourceResultRef, redaction and artifacts fields are present."
      },
      {
        checkId: "privacy-public-safe",
        status: "pass",
        summary: "No source body, request body, response body, credential value or absolute path is included."
      }
    ],
    notes: "Example packet is synthetic and public-safe."
  };
}

function artifact(artifactId, artifactKind, locationKind, summary) {
  return {
    artifactId,
    artifactKind,
    locationKind,
    contentIncluded: false,
    summary,
    reference: "owner-managed-reference",
    redacted: true
  };
}

function createStateModel() {
  const states = [
    state("draft", "owner is preparing evidence"),
    state("submitted", "owner submitted metadata packet"),
    state("redaction-check-ready", "packet is ready for redaction validator"),
    state("validated", "packet passed schema and privacy checks"),
    state("rejected", "packet failed schema or privacy checks"),
    state("archived", "packet archived as review evidence"),
    state("superseded", "packet replaced by a newer owner submission")
  ];
  return {
    contract: "hia-wp46-owner-provided-evidence-packet-state-model",
    contractVersion: "0.1.0-draft",
    states,
    transitions: [
      transition("draft", "submitted"),
      transition("submitted", "redaction-check-ready"),
      transition("redaction-check-ready", "validated"),
      transition("redaction-check-ready", "rejected"),
      transition("validated", "archived"),
      transition("validated", "superseded"),
      transition("rejected", "draft"),
      transition("archived", "superseded")
    ]
  };
}

function state(id, description) {
  return {
    id,
    description,
    accepting: id === "validated" || id === "archived",
    rejection: id === "rejected" || id === "superseded"
  };
}

function transition(from, to) {
  return {
    from,
    to
  };
}

function createValidationFixtures(packetSchema, examplePacket) {
  return {
    contract: "hia-wp46-owner-provided-evidence-packet-validation-fixtures",
    contractVersion: "0.1.0-draft",
    fixtures: [
      fixture("valid-owner-check-summary", "valid", "Example packet passes required metadata and redaction flags."),
      fixture("valid-host-review-observation", "valid", "Host review observation packet can be metadata-only."),
      fixture("invalid-missing-owner-attestation", "invalid", "owner.attestedByTargetOwner must be true."),
      fixture("invalid-source-body-included", "invalid", "redaction.sourceBodyIncluded must be false."),
      fixture("invalid-credential-value-included", "invalid", "redaction.credentialValueIncluded must be false."),
      fixture("invalid-hia-target-command", "invalid", "targetProject.targetCommandExecutedByHia must be false."),
      fixture("invalid-artifact-content-included", "invalid", "artifact.contentIncluded must be false.")
    ],
    schemaRef: packetSchema.$id,
    examplePacketId: examplePacket.packetId
  };
}

function fixture(id, expected, reason) {
  return {
    id,
    expected,
    reason
  };
}

function summarize({ examplePacket, intakeEvidence, packetSchema, stateModel, validationFixtures }) {
  const combinedForPrivacy = {
    examplePacket,
    packetSchema,
    stateModel,
    validationFixtures
  };
  const serialized = JSON.stringify(combinedForPrivacy);
  const redactionRequired = packetSchema.properties.redaction.required;
  const artifactRequired = packetSchema.properties.artifacts.items.required;
  return {
    phase: "W-P46.2",
    intakeReady: intakeEvidence.status === "ready-for-wp46-owner-provided-evidence-packet-schema",
    inputHardFailureCount: intakeEvidence.summary?.hardFailureCount ?? 0,
    acceptedEvidenceKindCount: packetSchema.properties.evidenceKind.enum.length,
    requiredTopLevelFieldCount: packetSchema.required.length,
    requiredOwnerFieldCount: packetSchema.properties.owner.required.length,
    requiredTargetProjectFieldCount: packetSchema.properties.targetProject.required.length,
    requiredRedactionFieldCount: redactionRequired.length,
    requiredArtifactFieldCount: artifactRequired.length,
    evidenceKindEnumCount: packetSchema.properties.evidenceKind.enum.length,
    statusEnumCount: packetSchema.properties.status.enum.length,
    artifactKindEnumCount: packetSchema.properties.artifacts.items.properties.artifactKind.enum.length,
    redactionPolicyEnumCount: packetSchema.properties.redaction.properties.policy.enum.length,
    stateCount: stateModel.states.length,
    acceptingStateCount: stateModel.states.filter((item) => item.accepting).length,
    rejectionStateCount: stateModel.states.filter((item) => item.rejection).length,
    transitionCount: stateModel.transitions.length,
    examplePacketReady: examplePacket.contract === "hia-owner-provided-evidence-packet",
    exampleArtifactCount: examplePacket.artifacts.length,
    exampleContentIncludedCount: examplePacket.artifacts.filter((item) => item.contentIncluded).length,
    exampleOwnerAttested: examplePacket.owner.attestedByTargetOwner === true,
    exampleRedactionClean: examplePacket.redaction.sourceBodyIncluded === false
      && examplePacket.redaction.credentialValueIncluded === false
      && examplePacket.redaction.requestBodyIncluded === false
      && examplePacket.redaction.responseBodyIncluded === false
      && examplePacket.redaction.absolutePathIncluded === false,
    validationFixtureCount: validationFixtures.fixtures.length,
    validFixtureCount: validationFixtures.fixtures.filter((item) => item.expected === "valid").length,
    invalidFixtureCount: validationFixtures.fixtures.filter((item) => item.expected === "invalid").length,
    invalidFixtureReasonCount: new Set(validationFixtures.fixtures.filter((item) => item.expected === "invalid").map((item) => item.reason)).size,
    hiaMayRunTargetCommand: intakeEvidence.summary?.hiaMayRunTargetCommand === true,
    hiaMayCreateBranchOrPr: intakeEvidence.summary?.hiaMayCreateBranchOrPr === true,
    hiaMayMutateTargetRepository: intakeEvidence.summary?.hiaMayMutateTargetRepository === true,
    hiaMayReadTargetSourceBody: intakeEvidence.summary?.hiaMayReadTargetSourceBody === true,
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
    nextStage: "W-P46.3 Evidence Redaction And Privacy Validator"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function renderGuideMarkdown(evidence) {
  const lines = [
    "# W-P46.2 Owner-Provided Evidence Packet Schema",
    "",
    `Status / 状态：\`${evidence.status}\``,
    "",
    "中文：该 schema 只允许 target owner 提交 public-safe metadata packet。HIA 不获得目标仓库操作权。",
    "",
    "| Area | Count |",
    "| --- | --- |",
    `| Evidence kinds | ${evidence.summary.evidenceKindEnumCount} |`,
    `| Required top-level fields | ${evidence.summary.requiredTopLevelFieldCount} |`,
    `| Status states | ${evidence.summary.statusEnumCount} |`,
    `| Artifact kinds | ${evidence.summary.artifactKindEnumCount} |`,
    "",
    "Forbidden content / 禁止内容：source body、request body、response body、credential value、本地绝对路径、direct edit object、target mutation authority。"
  ];
  return `${lines.join("\n")}\n`;
}

function renderValidationFixturesMarkdown(evidence) {
  const lines = [
    "# W-P46.2 Validation Fixtures",
    "",
    "| Fixture | Expected | Reason |",
    "| --- | --- | --- |"
  ];
  for (const item of evidence.validationFixtures.fixtures) {
    lines.push(`| \`${item.id}\` | \`${item.expected}\` | ${item.reason} |`);
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
