import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHiaDocument } from "../packages/core/dist/index.js";
import { createHiaLspService } from "../packages/lsp/dist/service.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-apply-boundary-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  aiAuthoring: path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json"),
  wp33HostReview: path.join(rootDir, "dist", "wp33-host-review-readiness-evidence", "evidence.json"),
  devtools: path.join(rootDir, "dist", "devtools-extension-check.json"),
  visualStudio: path.join(rootDir, "dist", "visual-studio-extension-check.json")
};

await main();

/**
 * 准备 W-P34.1 apply/edit 边界审计证据。
 * Prepare W-P34.1 apply/edit boundary audit evidence.
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = await readJson(inputPaths.aiAuthoring);
  const wp33HostReview = await readJson(inputPaths.wp33HostReview);
  const devtools = await readJson(inputPaths.devtools);
  const visualStudio = await readJson(inputPaths.visualStudio);
  const proposalResult = aiAuthoring.result;
  const reviewPayload = proposalResult?.reviewPayload;
  const resourcePreflightSample = createResourcePreflightSample();
  const auditSummary = summarizeApplyBoundary({
    proposalResult,
    reviewPayload,
    resourcePreflightSample,
    wp33HostReview
  });
  const checks = [
    check("HIA_WP34_AUDIT_REVIEW_PAYLOAD_CONTRACT", reviewPayload?.contract === "hia-documentation-review-payload", {
      actual: reviewPayload?.contract,
      expected: "hia-documentation-review-payload"
    }),
    check("HIA_WP34_AUDIT_REVIEW_PAYLOAD_INTEGRITY", reviewPayload?.integrity?.status === "pass", {
      actual: reviewPayload?.integrity?.status,
      expected: "pass"
    }),
    check("HIA_WP34_AUDIT_PRIVACY_NO_AUTOMATIC_WRITES", reviewPayload?.privacy?.allowsAutomaticWrites === false, {
      actual: reviewPayload?.privacy?.allowsAutomaticWrites,
      expected: false
    }),
    check("HIA_WP34_AUDIT_PRIVACY_NO_TARGET_MUTATION", reviewPayload?.privacy?.allowsTargetRepositoryMutation === false, {
      actual: reviewPayload?.privacy?.allowsTargetRepositoryMutation,
      expected: false
    }),
    check("HIA_WP34_AUDIT_PRIVACY_NO_SOURCE_CONTENT", reviewPayload?.privacy?.includesSourceContent === false && reviewPayload?.privacy?.sourcesContentPolicy === "none", {
      actual: {
        includesSourceContent: reviewPayload?.privacy?.includesSourceContent,
        sourcesContentPolicy: reviewPayload?.privacy?.sourcesContentPolicy
      },
      expected: {
        includesSourceContent: false,
        sourcesContentPolicy: "none"
      }
    }),
    check("HIA_WP34_AUDIT_ACTION_POLICY_DENIES_APPLY", deniesApplyActions(reviewPayload), {
      actual: reviewPayload?.actionPolicy?.deniedActions,
      expected: ["apply-workspace-edit", "auto-apply", "write-target-file-without-review"]
    }),
    check("HIA_WP34_AUDIT_ACTION_HINTS_APPLY_DISABLED", auditSummary.reviewItems.applyAvailableCount === 0 && auditSummary.reviewItems.itemCount > 0, {
      actual: auditSummary.reviewItems.applyAvailableCount,
      expected: 0
    }),
    check("HIA_WP34_AUDIT_EDIT_CANDIDATE_CONTRACT_PRESENT", auditSummary.editCandidates.contractCount === auditSummary.reviewItems.itemCount && auditSummary.editCandidates.contractCount > 0, {
      actual: auditSummary.editCandidates.contractCount,
      expected: auditSummary.reviewItems.itemCount
    }),
    check("HIA_WP34_AUDIT_EDIT_CANDIDATE_SAFETY", auditSummary.editCandidates.unsafeCount === 0, {
      actual: auditSummary.editCandidates.unsafeCount,
      expected: 0
    }),
    check("HIA_WP34_AUDIT_EDIT_CANDIDATE_PREVIEW_BOUNDARY", auditSummary.editCandidates.previewOnlyCount > 0 && auditSummary.editCandidates.directApplyCount === 0, {
      actual: {
        previewOnlyCount: auditSummary.editCandidates.previewOnlyCount,
        directApplyCount: auditSummary.editCandidates.directApplyCount
      },
      expected: {
        directApplyCount: 0,
        previewOnlyCount: "> 0"
      }
    }),
    check("HIA_WP34_AUDIT_DIFF_PREVIEW_NON_EXECUTABLE", auditSummary.editCandidates.diffPreviewCount === auditSummary.editCandidates.contractCount && auditSummary.editCandidates.diffPreviewUnsafeCount === 0, {
      actual: {
        diffPreviewCount: auditSummary.editCandidates.diffPreviewCount,
        diffPreviewUnsafeCount: auditSummary.editCandidates.diffPreviewUnsafeCount
      },
      expected: {
        diffPreviewCount: auditSummary.editCandidates.contractCount,
        diffPreviewUnsafeCount: 0
      }
    }),
    check("HIA_WP34_AUDIT_APPLY_PREFLIGHT_HOST_CHECK_ONLY", auditSummary.editCandidates.applyPreflightCount === auditSummary.editCandidates.contractCount && auditSummary.editCandidates.applyPreflightUnsafeCount === 0, {
      actual: {
        applyPreflightCount: auditSummary.editCandidates.applyPreflightCount,
        applyPreflightUnsafeCount: auditSummary.editCandidates.applyPreflightUnsafeCount,
        applyPreflightHostCheckCount: auditSummary.editCandidates.applyPreflightHostCheckCount
      },
      expected: {
        applyPreflightCount: auditSummary.editCandidates.contractCount,
        applyPreflightUnsafeCount: 0,
        applyPreflightHostCheckCount: auditSummary.editCandidates.previewOnlyCount
      }
    }),
    check("HIA_WP34_AUDIT_RESOURCE_PREFLIGHT_AVAILABLE", resourcePreflightSample.status === "preflight" && resourcePreflightSample.kind === "create-missing-locale-stub", {
      actual: {
        kind: resourcePreflightSample.kind,
        status: resourcePreflightSample.status
      },
      expected: {
        kind: "create-missing-locale-stub",
        status: "preflight"
      }
    }),
    check("HIA_WP34_AUDIT_RESOURCE_PREFLIGHT_REQUIRES_FILE_READ", resourcePreflightSample.preflight.requiresFileRead === true, {
      actual: resourcePreflightSample.preflight.requiresFileRead,
      expected: true
    }),
    check("HIA_WP34_AUDIT_RESOURCE_PREFLIGHT_CONFLICT_NOT_CHECKED", resourcePreflightSample.preflight.conflictStatus === "not-checked", {
      actual: resourcePreflightSample.preflight.conflictStatus,
      expected: "not-checked"
    }),
    check("HIA_WP34_AUDIT_RESOURCE_PREFLIGHT_ROLLBACK_HOST_UNDO", resourcePreflightSample.preflight.rollback === "host-undo", {
      actual: resourcePreflightSample.preflight.rollback,
      expected: "host-undo"
    }),
    check("HIA_WP34_AUDIT_HOSTS_VISIBLE_REVIEW_READY", auditSummary.hosts.readyHostCount === auditSummary.hosts.hostCount && auditSummary.hosts.hostCount === 3, {
      actual: {
        hostCount: auditSummary.hosts.hostCount,
        readyHostCount: auditSummary.hosts.readyHostCount
      },
      expected: {
        hostCount: 3,
        readyHostCount: 3
      }
    }),
    check("HIA_WP34_AUDIT_HOSTS_APPLY_DISABLED", auditSummary.hosts.applyCandidateCount === 0 && auditSummary.hosts.applyDisabledCheckFailures === 0, {
      actual: {
        applyCandidateCount: auditSummary.hosts.applyCandidateCount,
        applyDisabledCheckFailures: auditSummary.hosts.applyDisabledCheckFailures
      },
      expected: {
        applyCandidateCount: 0,
        applyDisabledCheckFailures: 0
      }
    }),
    check("HIA_WP34_AUDIT_NO_DIRECT_WORKSPACE_EDIT_OBJECT", auditSummary.directEditObjectCount === 0, {
      actual: auditSummary.directEditObjectCount,
      expected: 0
    }),
    check("HIA_WP34_AUDIT_LOCALE_BOUNDARY_CANONICAL", reviewPayload?.localeQuality?.canonicalJsOutput === "@lang/<lang>" && reviewPayload?.localeQuality?.sourceDocumentTruth === "HiaI18nModel.fields", {
      actual: {
        canonicalJsOutput: reviewPayload?.localeQuality?.canonicalJsOutput,
        sourceDocumentTruth: reviewPayload?.localeQuality?.sourceDocumentTruth
      },
      expected: {
        canonicalJsOutput: "@lang/<lang>",
        sourceDocumentTruth: "HiaI18nModel.fields"
      }
    }),
    check("HIA_WP34_AUDIT_DEVTOOLS_REVIEW_APPLY_DISABLED", devtools?.panel?.reviewSurface?.applyAvailableCount === 0, {
      actual: devtools?.panel?.reviewSurface?.applyAvailableCount,
      expected: 0
    }),
    check("HIA_WP34_AUDIT_VISUAL_STUDIO_REVIEW_APPLY_DISABLED", visualStudio?.reviewSurface?.disabledApply === true, {
      actual: visualStudio?.reviewSurface?.disabledApply,
      expected: true
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-apply-boundary-audit",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-edit-candidate-diff-contract" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPaths.aiAuthoring),
      devtools: normalizePath(inputPaths.devtools),
      visualStudio: normalizePath(inputPaths.visualStudio),
      wp33HostReview: normalizePath(inputPaths.wp33HostReview)
    },
    summary: {
      checkCount: checks.length,
      hardFailureCount: hardFailures.length,
      hostCount: auditSummary.hosts.hostCount,
      readyHostCount: auditSummary.hosts.readyHostCount,
      reviewItemCount: auditSummary.reviewItems.itemCount,
      draftCount: auditSummary.reviewItems.draftCount,
      editCandidateCount: auditSummary.editCandidates.contractCount,
      previewOnlyCandidateCount: auditSummary.editCandidates.previewOnlyCount,
      directApplyCandidateCount: auditSummary.editCandidates.directApplyCount,
      applyPreflightCount: auditSummary.editCandidates.applyPreflightCount,
      applyPreflightHostCheckCount: auditSummary.editCandidates.applyPreflightHostCheckCount,
      applyPreflightTargetFileCount: auditSummary.editCandidates.applyPreflightTargetFileCount,
      diffPreviewCount: auditSummary.editCandidates.diffPreviewCount,
      diffPreviewOperationCount: auditSummary.editCandidates.diffPreviewOperationCount,
      resourcePreflightCount: 1,
      directEditObjectCount: auditSummary.directEditObjectCount
    },
    audit: auditSummary,
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.2",
        topic: "edit-candidate-diff-contract",
        reason: "Review payload has preview-only candidates, but no diff or patch metadata."
      },
      {
        phase: "W-P34.3",
        topic: "conflict-version-rollback-metadata",
        reason: "Resource preflight still reports conflictStatus not-checked and requiresFileRead."
      },
      {
        phase: "W-P34.4",
        topic: "vscode-apply-preview-first-slice",
        reason: "VS Code is the first visible review host and should receive preview-only diff UX before any writable apply."
      }
    ],
    manualChecks: [
      "Confirm every future apply preview starts from a reviewed item rather than a raw AI draft.",
      "Confirm generated diff or patch metadata never includes private source bodies unless a later opt-in policy explicitly allows it.",
      "Confirm conflict and file-version checks run before any host can apply a workspace edit.",
      "Confirm rollback or host undo metadata is displayed before a human confirms apply.",
      "Confirm target repositories continue to consume central notify logs instead of being modified by this repository."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 apply boundary audit evidence");
  assert.equal(hardFailures.length, 0, `W-P34 apply boundary audit has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 apply boundary audit prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/**
 * 生成最小 resource preflight 样本，避免 W-P34.1 只审计 review payload 而忘记历史 resource action 边界。
 * Generates a minimal resource-preflight sample so W-P34.1 audits the historical resource-action boundary too.
 */
function createResourcePreflightSample() {
  const service = createHiaLspService();
  const uri = "file:///workspace/docs/wp34-resource-preflight.hia.json";
  const document = createHiaDocument({
    defaultLocale: "zh-CN",
    id: "fixture.wp34.apply-boundary",
    locales: ["zh-CN", "en"],
    symbols: [
      {
        id: "function:renderProfile",
        kind: "function",
        name: "renderProfile",
        i18n: {
          defaultLocale: "zh-CN",
          enabled: true,
          fields: {
            description: {
              defaultLocale: "zh-CN",
              defaultText: "渲染用户资料。",
              fieldPath: "description",
              key: "profile.render.description",
              kind: "description",
              localizedText: {
                "zh-CN": "渲染用户资料。"
              },
              missingLocales: ["en"],
              path: "profile.render"
            }
          },
          locales: ["zh-CN", "en"],
          model: "hia-text-i18n",
          modelVersion: "0.2.0",
          resources: [
            {
              fields: ["description"],
              format: "hia-i18n-json",
              kind: "external-resource",
              locale: "en",
              path: "i18n/profile.hia-i18n.json"
            }
          ]
        }
      }
    ],
    title: "W-P34 Apply Boundary Fixture"
  });

  service.initialize({
    capabilities: {},
    processId: null,
    rootUri: "file:///workspace",
    workspaceFolders: [
      {
        name: "workspace",
        uri: "file:///workspace"
      }
    ]
  });
  service.openDocument(uri, JSON.stringify(document), "hia", 1);

  const action = service.getResourceActions(uri).actions.find((item) => item.kind === "create-missing-locale-stub");
  assert.ok(action, "W-P34 apply boundary audit requires a missing-locale resource action.");
  assert.ok(action.preflight, "W-P34 apply boundary audit requires resource preflight data.");

  return {
    kind: action.kind,
    locale: action.locale,
    preflight: {
      conflictStatus: action.preflight.conflictStatus,
      editKind: action.preflight.editKind,
      requiresFileRead: action.preflight.requiresFileRead,
      resourcePath: action.preflight.resourcePath,
      resourcePointer: action.preflight.resourcePointer,
      rollback: action.preflight.rollback,
      stubHasTextOnly: typeof action.preflight.stub?.text === "string",
      targetUriPresent: typeof action.preflight.targetUri === "string",
      workspaceEditBoundary: action.preflight.workspaceEditBoundary
    },
    resourcePath: action.resourcePath,
    resourcePointer: action.resourcePointer,
    status: action.status
  };
}

function summarizeApplyBoundary({
  proposalResult,
  reviewPayload,
  resourcePreflightSample,
  wp33HostReview
}) {
  const reviewItems = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const editCandidates = reviewItems.map((item) => item.editCandidate).filter(isRecord);
  const diffPreviews = editCandidates.map((candidate) => candidate.diffPreview).filter(isRecord);
  const applyPreflights = editCandidates.map((candidate) => candidate.applyPreflight).filter(isRecord);
  const hosts = Array.isArray(wp33HostReview?.hosts) ? wp33HostReview.hosts : [];

  return {
    proposalLayer: {
      contract: proposalResult?.contract ?? null,
      contractVersion: proposalResult?.contractVersion ?? null,
      proposalCount: Number(proposalResult?.proposalCount ?? 0),
      status: proposalResult?.status ?? null,
      workspaceEditBoundaries: countBy((proposalResult?.proposals ?? []).map((proposal) => proposal.workspaceEditBoundary ?? "unknown"))
    },
    reviewItems: {
      applyAvailableCount: reviewItems.filter((item) => item.actionHints?.applyAvailable === true).length,
      draftCount: Number(reviewPayload?.draftCount ?? reviewPayload?.summary?.draftCount ?? 0),
      itemCount: reviewItems.length,
      workspaceEditBoundaries: countBy(reviewItems.map((item) => item.workspaceEditBoundary ?? item.editCandidate?.workspaceEditBoundary ?? "unknown"))
    },
    editCandidates: {
      applyPreflightCount: applyPreflights.filter((preflight) => preflight.contract === "hia-documentation-edit-apply-preflight").length,
      applyPreflightHostCheckCount: applyPreflights.filter((preflight) => preflight.status === "requires-host-check").length,
      applyPreflightStatusCounts: countBy(applyPreflights.map((preflight) => preflight.status ?? "unknown")),
      applyPreflightTargetFileCount: applyPreflights.flatMap((preflight) => Array.isArray(preflight.targetFiles) ? preflight.targetFiles : []).length,
      applyPreflightUnsafeCount: applyPreflights.filter(hasUnsafeApplyPreflight).length,
      contractCount: editCandidates.filter((candidate) => candidate.contract === "hia-documentation-edit-candidate").length,
      directApplyCount: editCandidates.filter((candidate) => candidate.safety?.directApply === true || candidate.safety?.hostWrite === true).length,
      diffPreviewCount: diffPreviews.filter((preview) => preview.contract === "hia-documentation-edit-diff-preview").length,
      diffPreviewOperationCount: diffPreviews.flatMap((preview) => Array.isArray(preview.operations) ? preview.operations : []).length,
      diffPreviewStatusCounts: countBy(diffPreviews.map((preview) => preview.status ?? "unknown")),
      diffPreviewUnsafeCount: diffPreviews.filter(hasUnsafeDiffPreviewSafety).length,
      kindCounts: countBy(editCandidates.map((candidate) => candidate.kind ?? "unknown")),
      previewOnlyCount: editCandidates.filter((candidate) => candidate.status === "preview-only").length,
      statusCounts: countBy(editCandidates.map((candidate) => candidate.status ?? "unknown")),
      unsafeCount: editCandidates.filter(hasUnsafeEditCandidateSafety).length
    },
    resourcePreflight: resourcePreflightSample,
    hosts: {
      applyCandidateCount: hosts.filter((host) => host.capabilities?.applyCandidate === true).length,
      applyDisabledCheckFailures: hosts.flatMap((host) => host.checks ?? []).filter((check) => /APPLY_DISABLED/u.test(check.code ?? "") && check.status !== "pass").length,
      hostCount: hosts.length,
      readyHostCount: hosts.filter((host) => host.readiness === "ready-for-first-visible-review-slice").length
    },
    directEditObjectCount: countDirectEditObjects({
      proposalResult,
      reviewPayload,
      wp33HostReview
    })
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function deniesApplyActions(reviewPayload) {
  const denied = new Set(Array.isArray(reviewPayload?.actionPolicy?.deniedActions) ? reviewPayload.actionPolicy.deniedActions : []);
  return denied.has("apply-workspace-edit")
    && denied.has("auto-apply")
    && denied.has("write-target-file-without-review");
}

function hasUnsafeEditCandidateSafety(candidate) {
  const safety = isRecord(candidate.safety) ? candidate.safety : {};
  return safety.allowsAutomaticWrites !== false
    || safety.directApply !== false
    || safety.hostWrite !== false
    || safety.includesSourceContent !== false
    || safety.requiresHumanReview !== true
    || safety.sourcesContentPolicy !== "none";
}

function hasUnsafeDiffPreviewSafety(preview) {
  const safety = isRecord(preview.safety) ? preview.safety : {};
  return safety.directApply !== false
    || safety.executable !== false
    || safety.hostWrite !== false
    || safety.includesSourceContent !== false
    || safety.requiresHumanReview !== true
    || safety.sourcesContentPolicy !== "none";
}

function hasUnsafeApplyPreflight(preflight) {
  const status = typeof preflight.status === "string" ? preflight.status : "unknown";
  const conflictStatus = typeof preflight.conflictStatus === "string" ? preflight.conflictStatus : "unknown";
  const rollback = isRecord(preflight.rollback) ? preflight.rollback : {};
  const targetFiles = Array.isArray(preflight.targetFiles) ? preflight.targetFiles : [];
  const statusSafe = status === "requires-host-check" || status === "not-applicable";
  const conflictSafe = conflictStatus === "not-checked" || conflictStatus === "not-applicable";
  const targetFilesSafe = targetFiles.every((targetFile) => {
    const conflict = isRecord(targetFile.conflict) ? targetFile.conflict : {};
    const fileVersion = isRecord(targetFile.fileVersion) ? targetFile.fileVersion : {};
    const fileRollback = isRecord(targetFile.rollback) ? targetFile.rollback : {};
    return conflict.status === "not-checked"
      && fileVersion.status === "not-read"
      && fileRollback.strategy === "host-undo";
  });

  return !statusSafe
    || !conflictSafe
    || (status === "requires-host-check" && preflight.requiresFileRead !== true)
    || (status === "requires-host-check" && preflight.requiresConflictCheck !== true)
    || (status === "requires-host-check" && rollback.strategy !== "host-undo")
    || (status === "requires-host-check" && targetFiles.length === 0)
    || !targetFilesSafe;
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (Object.hasOwn(node, "workspaceEdit") || Object.hasOwn(node, "documentChanges") || Object.hasOwn(node, "changes")) {
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

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = typeof value === "string" && value.length > 0 ? value : "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
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
