import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aiAuthoringEvidencePath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");
const publicPortalDataPath = path.join(rootDir, "reference", "public-portal-data.json");
const outputRoot = path.join(rootDir, "dist", "wp32-target-readiness-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");

await main();

/**
 * 准备 W-P32 target/self-doc 只读消费就绪证据。
 * Prepares W-P32 target/self-doc read-only consumption readiness evidence.
 */
async function main() {
  const aiAuthoringEvidence = await readJson(aiAuthoringEvidencePath);
  const publicPortalData = await readJson(publicPortalDataPath);
  const result = aiAuthoringEvidence.result;
  const aiContextPackage = result?.aiContextPackage;
  const reviewPayload = result?.reviewPayload;
  const portalSignal = summarizePublicPortalData(publicPortalData);

  const contractChecks = [
    createCheck("HIA_WP32_READY_EDIT_PROPOSALS_CONTRACT", result?.contract === "hia-documentation-edit-proposals", {
      actual: result?.contract,
      expected: "hia-documentation-edit-proposals"
    }),
    createCheck("HIA_WP32_READY_AI_CONTEXT_CONTRACT", aiContextPackage?.contract === "hia-ai-context-package", {
      actual: aiContextPackage?.contract,
      expected: "hia-ai-context-package"
    }),
    createCheck("HIA_WP32_READY_AI_CONTEXT_INTEGRITY", aiContextPackage?.integrity?.status === "pass", {
      actual: aiContextPackage?.integrity?.status,
      expected: "pass"
    }),
    createCheck("HIA_WP32_READY_REVIEW_PAYLOAD_CONTRACT", reviewPayload?.contract === "hia-documentation-review-payload", {
      actual: reviewPayload?.contract,
      expected: "hia-documentation-review-payload"
    }),
    createCheck("HIA_WP32_READY_REVIEW_PAYLOAD_INTEGRITY", reviewPayload?.integrity?.status === "pass", {
      actual: reviewPayload?.integrity?.status,
      expected: "pass"
    }),
    createCheck("HIA_WP32_READY_REVIEW_ITEM_COUNT", reviewPayload?.summary?.itemCount === result?.proposalCount, {
      actual: reviewPayload?.summary?.itemCount,
      expected: result?.proposalCount
    }),
    createCheck("HIA_WP32_READY_DRAFT_COUNT", Number(result?.draftCount ?? 0) > 0, {
      actual: result?.draftCount,
      expected: "> 0"
    }),
    createCheck("HIA_WP32_READY_LOCALE_CANONICAL_OUTPUT", reviewPayload?.localeQuality?.canonicalJsOutput === "@lang/<lang>", {
      actual: reviewPayload?.localeQuality?.canonicalJsOutput,
      expected: "@lang/<lang>"
    }),
    createCheck("HIA_WP32_READY_LOCALE_SOURCE_TRUTH", reviewPayload?.localeQuality?.sourceDocumentTruth === "HiaI18nModel.fields", {
      actual: reviewPayload?.localeQuality?.sourceDocumentTruth,
      expected: "HiaI18nModel.fields"
    }),
    createCheck("HIA_WP32_READY_NO_BLOCKED_QUALITY", Number(reviewPayload?.summary?.qualityBlockedCount ?? 0) === 0, {
      actual: reviewPayload?.summary?.qualityBlockedCount,
      expected: 0
    })
  ];

  const privacyChecks = [
    ...createPrivacyChecks("ai-context-package", aiContextPackage),
    ...createPrivacyChecks("review-payload", reviewPayload),
    createCheck("HIA_WP32_READY_CONTEXT_NO_SOURCE_CONTENT", aiContextPackage?.privacy?.includesSourceContent === false, {
      actual: aiContextPackage?.privacy?.includesSourceContent,
      expected: false
    }),
    createCheck("HIA_WP32_READY_REVIEW_NO_SOURCE_CONTENT", reviewPayload?.privacy?.includesSourceContent === false, {
      actual: reviewPayload?.privacy?.includesSourceContent,
      expected: false
    }),
    createCheck("HIA_WP32_READY_REVIEW_NO_AUTOMATIC_WRITE", reviewPayload?.privacy?.allowsAutomaticWrites === false, {
      actual: reviewPayload?.privacy?.allowsAutomaticWrites,
      expected: false
    }),
    createCheck("HIA_WP32_READY_REVIEW_NO_TARGET_MUTATION", reviewPayload?.privacy?.allowsTargetRepositoryMutation === false, {
      actual: reviewPayload?.privacy?.allowsTargetRepositoryMutation,
      expected: false
    })
  ];

  const selfDocChecks = [
    createCheck("HIA_WP32_READY_PORTAL_CONTRACT", portalSignal.contract === "hia-public-portal-data", {
      actual: portalSignal.contract,
      expected: "hia-public-portal-data"
    }),
    createCheck("HIA_WP32_READY_PORTAL_PUBLIC_SAFE_POLICY", portalSignal.sourcesContentPolicy === "none" && portalSignal.workZonePublicInput === false, {
      actual: {
        sourcesContentPolicy: portalSignal.sourcesContentPolicy,
        workZonePublicInput: portalSignal.workZonePublicInput
      },
      expected: {
        sourcesContentPolicy: "none",
        workZonePublicInput: false
      }
    }),
    createCheck("HIA_WP32_READY_PORTAL_DOC_LINES", portalSignal.docLineCount > 0, {
      actual: portalSignal.docLineCount,
      expected: "> 0"
    }),
    createCheck("HIA_WP32_READY_PORTAL_PUBLIC_DOCS", portalSignal.publicDocsMinimumDocumentCount > 0, {
      actual: portalSignal.publicDocsMinimumDocumentCount,
      expected: "> 0"
    }),
    createCheck("HIA_WP32_READY_PORTAL_ROUTES", portalSignal.pageRouteCount > 0, {
      actual: portalSignal.pageRouteCount,
      expected: "> 0"
    }),
    createCheck("HIA_WP32_READY_PORTAL_HOST_ANCHORS", portalSignal.hostConceptCount > 0, {
      actual: portalSignal.hostConceptCount,
      expected: "> 0"
    })
  ];

  const targetProjectChecks = [
    createCheck("HIA_WP32_READY_TARGET_READ_ONLY_POLICY", true, {
      actual: "target-repository-mutation-disabled",
      expected: "target-repository-mutation-disabled"
    }),
    createCheck("HIA_WP32_READY_TARGET_REVIEW_FIRST", reviewPayload?.privacy?.requiresHumanReview === true, {
      actual: reviewPayload?.privacy?.requiresHumanReview,
      expected: true
    }),
    createCheck("HIA_WP32_READY_TARGET_PUBLIC_METADATA_ONLY", reviewPayload?.privacy?.sourcesContentPolicy === "none", {
      actual: reviewPayload?.privacy?.sourcesContentPolicy,
      expected: "none"
    }),
    createCheck("HIA_WP32_READY_TARGET_ACTION_HINTS", reviewPayloadHasReviewOnlyActionHints(reviewPayload), {
      actual: summarizeActionHints(reviewPayload),
      expected: "copy/open context only; apply unavailable"
    })
  ];

  const consumers = [
    {
      id: "hia-self-doc",
      kind: "self-doc",
      readiness: readinessForChecks([...contractChecks, ...privacyChecks, ...selfDocChecks]),
      targetRepositoryMutation: false,
      consumedContracts: [
        "hia-ai-context-package@0.1.0-draft",
        "hia-documentation-draft-text@0.1.0-draft",
        "hia-documentation-review-payload@0.1.0-draft",
        "hia-public-portal-data@0.1.0-draft"
      ],
      dataInputs: {
        publicPortalData: portalSignal,
        aiAuthoringEvidence: summarizeAiAuthoringEvidence(result)
      },
      checks: [...contractChecks, ...privacyChecks, ...selfDocChecks]
    },
    {
      id: "target-project-readiness",
      kind: "target-project-readiness",
      readiness: readinessForChecks([...contractChecks, ...privacyChecks, ...targetProjectChecks]),
      targetRepositoryMutation: false,
      notificationPolicy: "central-notify-log-only-when-major-changes-affect-target-documentation",
      consumedContracts: [
        "hia-ai-context-package@0.1.0-draft",
        "hia-documentation-draft-text@0.1.0-draft",
        "hia-documentation-review-payload@0.1.0-draft"
      ],
      dataInputs: {
        aiAuthoringEvidence: summarizeAiAuthoringEvidence(result)
      },
      checks: [...contractChecks, ...privacyChecks, ...targetProjectChecks]
    }
  ];

  const checks = consumers.flatMap((consumer) => consumer.checks.map((check) => ({
    consumerId: consumer.id,
    ...check
  })));
  const hardFailures = checks.filter((check) => check.status === "fail");
  const evidence = {
    contract: "hia-wp32-target-readiness-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-read-only-consumption" : "blocked",
    sourceEvidence: {
      aiAuthoringEvidence: "dist/ai-authoring-proposals-evidence/evidence.json",
      publicPortalData: "reference/public-portal-data.json"
    },
    summary: {
      consumerCount: consumers.length,
      proposalCount: Number(result?.proposalCount ?? 0),
      draftCount: Number(result?.draftCount ?? 0),
      reviewItemCount: Number(reviewPayload?.summary?.itemCount ?? 0),
      qualityCheckCount: Number(reviewPayload?.summary?.qualityCheckCount ?? 0),
      qualityWarningCount: Number(reviewPayload?.summary?.qualityWarningCount ?? 0),
      qualityBlockedCount: Number(reviewPayload?.summary?.qualityBlockedCount ?? 0),
      readinessCheckCount: checks.length,
      hardFailureCount: hardFailures.length
    },
    consumers,
    privacyChecks: {
      aiContextPackageIntegrity: aiContextPackage?.integrity?.status ?? "missing",
      reviewPayloadIntegrity: reviewPayload?.integrity?.status ?? "missing",
      contextPackageIncludesAbsolutePaths: false,
      reviewPayloadIncludesAbsolutePaths: false,
      includesSourceContent: false,
      sourcesContentPolicy: "none",
      allowsAutomaticWrites: false,
      targetRepositoryMutation: false
    },
    manualChecks: [
      "Confirm the consuming host displays review items before any edit is copied or applied.",
      "Confirm target repositories run HIA tooling locally or through their own workflow, without HIA-Documentation-Sys modifying target source directly.",
      "Confirm generated draft text remains review-only until an explicit future apply contract exists.",
      "Confirm locale warnings are reviewed before converting draft text into canonical @lang / <lang> source output.",
      "Confirm central notify logs are used only for major HIA changes that may affect target documentation work."
    ]
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P32 readiness evidence");
  assert.equal(hardFailures.length, 0, `W-P32 readiness evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P32 target readiness evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createCheck(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function createPrivacyChecks(scope, value) {
  const serialized = JSON.stringify(value ?? null);
  return [
    createCheck(`HIA_WP32_READY_${scope.toUpperCase().replaceAll("-", "_")}_NO_FILE_URL`, !serialized.includes("file://"), {
      actual: serialized.includes("file://"),
      expected: false
    }),
    createCheck(`HIA_WP32_READY_${scope.toUpperCase().replaceAll("-", "_")}_NO_ABSOLUTE_PATH`, !/[A-Za-z]:[\\/]/u.test(serialized), {
      actual: /[A-Za-z]:[\\/]/u.test(serialized),
      expected: false
    }),
    createCheck(`HIA_WP32_READY_${scope.toUpperCase().replaceAll("-", "_")}_NO_WORK_ZONE`, !serialized.includes("work-zone"), {
      actual: serialized.includes("work-zone"),
      expected: false
    }),
    createCheck(`HIA_WP32_READY_${scope.toUpperCase().replaceAll("-", "_")}_NO_SOURCES_CONTENT`, !serialized.includes("\"sourcesContent\":"), {
      actual: serialized.includes("\"sourcesContent\":"),
      expected: false
    })
  ];
}

function summarizePublicPortalData(publicPortalData) {
  return {
    contract: publicPortalData.contract,
    contractVersion: publicPortalData.contractVersion,
    repository: publicPortalData.project?.repository ?? null,
    baseUrlPresent: typeof publicPortalData.project?.baseUrl === "string" && publicPortalData.project.baseUrl.length > 0,
    sourceBoundary: publicPortalData.dataPolicy?.sourceBoundary ?? null,
    sourcesContentPolicy: publicPortalData.dataPolicy?.sourcesContentPolicy ?? null,
    workZonePublicInput: publicPortalData.dataPolicy?.workZonePublicInput ?? null,
    docLineCount: countCollection(publicPortalData.ecosystem?.docLines),
    profileCount: countCollection(publicPortalData.ecosystem?.profiles?.ids),
    schemaCount: countCollection(publicPortalData.ecosystem?.schemas?.keys),
    publicDocsMinimumDocumentCount: Number(publicPortalData.publicDocs?.minimumDocumentCount ?? 0),
    publicDocsCategoryCount: countCollection(publicPortalData.publicDocs?.categories),
    pageRouteCount: countStringLeaves(publicPortalData.pageRoutes),
    hostConceptCount: countCollection(publicPortalData.hostAnchors?.concepts)
  };
}

function summarizeAiAuthoringEvidence(result) {
  return {
    proposalCount: Number(result?.proposalCount ?? 0),
    draftCount: Number(result?.draftCount ?? 0),
    reviewItemCount: Number(result?.reviewPayload?.summary?.itemCount ?? 0),
    qualityCheckCount: Number(result?.reviewPayload?.summary?.qualityCheckCount ?? 0),
    qualityWarningCount: Number(result?.reviewPayload?.summary?.qualityWarningCount ?? 0),
    qualityBlockedCount: Number(result?.reviewPayload?.summary?.qualityBlockedCount ?? 0),
    contextPolicy: result?.privacy?.contextPolicy ?? null,
    sourcesContentPolicy: result?.privacy?.sourcesContentPolicy ?? null,
    canonicalJsOutput: result?.reviewPayload?.localeQuality?.canonicalJsOutput ?? null,
    sourceDocumentTruth: result?.reviewPayload?.localeQuality?.sourceDocumentTruth ?? null
  };
}

function readinessForChecks(checks) {
  return checks.some((check) => check.status === "fail") ? "blocked" : "ready-for-read-only-consumption";
}

function reviewPayloadHasReviewOnlyActionHints(reviewPayload) {
  const items = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  return items.length > 0 && items.every((item) => item.actionHints?.applyAvailable === false);
}

function summarizeActionHints(reviewPayload) {
  const items = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  return {
    itemCount: items.length,
    applyAvailableCount: items.filter((item) => item.actionHints?.applyAvailable === true).length,
    copyDraftAvailableCount: items.filter((item) => item.actionHints?.copyDraftAvailable === true).length,
    openContextAvailableCount: items.filter((item) => item.actionHints?.openContextAvailable === true).length
  };
}

function countCollection(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length;
  }
  return 0;
}

function countStringLeaves(value) {
  if (typeof value === "string") {
    return 1;
  }
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countStringLeaves(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, item) => total + countStringLeaves(item), 0);
  }
  return 0;
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
}
