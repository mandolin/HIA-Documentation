import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(rootDir, "apps", "devtools-extension");
const evidencePath = path.join(rootDir, "dist", "devtools-extension-check.json");

const {
  HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE,
  HIA_DEVTOOLS_CHECKED_APPLY_CONFIRMATION_CONTRACT,
  HIA_DEVTOOLS_HOST_APPLY_UX_CONTRACT,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT_VERSION,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_STRATEGY,
  HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT,
  HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT_VERSION,
  HIA_DEVTOOLS_TARGET_COLLABORATION_CONTRACT,
  createHiaDevToolsInspectedWindowBridgeExpression,
  createHiaDevToolsOpenRequestBridgeEnvelope,
  createHiaDevToolsOpenRequestMessage,
  createHiaDevToolsPanelViewModel,
  getHiaDevToolsReviewDetail,
  getHiaDevToolsRelationDetail
} = await import(pathToFileURL(path.join(extensionRoot, "panel-core.js")).href);

await main();

/**
 * 校验 HIA DevTools unpacked extension shell 的静态 manifest 和 payload view model。
 * Validate the HIA DevTools unpacked extension shell manifest and payload view model.
 */
async function main() {
  const manifest = JSON.parse(await readFile(path.join(extensionRoot, "manifest.json"), "utf8"));
  const devtoolsHtml = await readFile(path.join(extensionRoot, "devtools.html"), "utf8");
  const panelHtml = await readFile(path.join(extensionRoot, "panel.html"), "utf8");
  const panel = createHiaDevToolsPanelViewModel(createFixturePayload());
  const detail = getHiaDevToolsRelationDetail(panel, "documents-source:entry:api->source:src/api.ts");
  const reviewDetail = getHiaDevToolsReviewDetail(panel, "review-item:proposal:api-doc");
  const message = createHiaDevToolsOpenRequestMessage(detail?.openRequests[0], {
    relationId: detail?.relation.id
  });
  const bridgeEnvelope = createHiaDevToolsOpenRequestBridgeEnvelope(message);
  const bridgeExpression = createHiaDevToolsInspectedWindowBridgeExpression(message);

  assert.equal(manifest.manifest_version, 3, "DevTools extension must use Manifest V3.");
  assert.equal(manifest.devtools_page, "devtools.html", "Manifest must declare a local devtools_page.");
  assert.deepEqual(manifest.permissions, [], "DevTools shell must not request permissions in the first slice.");
  assert.deepEqual(manifest.host_permissions, [], "DevTools shell must not request host permissions in the first slice.");
  assert.match(devtoolsHtml, /<script src="\.\/devtools\.js"><\/script>/u, "DevTools page must load a local script.");
  assert.match(panelHtml, /<script type="module" src="\.\/panel\.js"><\/script>/u, "Panel page must load a local module script.");
  assert.equal(panel.summary.entryCount, 1, "Fixture entry count must be preserved.");
  assert.equal(panel.summary.relationCount, 1, "Fixture relation count must be preserved.");
  assert.equal(panel.review.contract, HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT, "Review surface must expose a stable DevTools contract.");
  assert.equal(panel.review.contractVersion, HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT_VERSION, "Review surface must expose the contract version.");
  assert.equal(panel.review.payloadContract, "hia-documentation-review-payload", "Review surface must consume the review payload contract.");
  assert.equal(panel.review.summary.itemCount, 1, "Review surface must preserve review item count.");
  assert.equal(panel.review.draftCount, 1, "Review surface must preserve draft count.");
  assert.equal(panel.review.privacy.includesSourceContent, false, "Review surface must not include source content.");
  assert.equal(panel.review.applyPreview.status, "input-ready", "Review surface must expose apply-preview input readiness.");
  assert.equal(panel.review.applyPreview.applyAvailable, false, "Review surface must keep apply unavailable.");
  assert.equal(panel.review.applyPreview.checkedApply, false, "Review surface must not claim checked apply.");
  assert.equal(panel.review.applyPreview.hostFileRead, false, "Review surface must not claim host file reads.");
  assert.equal(panel.review.applyPreview.hostWrite, false, "Review surface must not claim host writes.");
  assert.equal(panel.review.applyPreview.targetRepositoryMutation, false, "Review surface must not mutate target repositories.");
  assert.equal(panel.review.applyPreview.hostCheckPreflightCount, 1, "Review surface must summarize host-check preflight inputs.");
  assert.equal(panel.review.applyPreview.targetFileCount, 1, "Review surface must summarize apply-preview target files.");
  assert.equal(panel.review.checkedApplyConfirmation.contract, HIA_DEVTOOLS_CHECKED_APPLY_CONFIRMATION_CONTRACT, "Review surface must expose checked apply confirmation summary.");
  assert.equal(panel.review.checkedApplyConfirmation.status, "input-ready", "Review surface must expose checked apply confirmation readiness.");
  assert.equal(panel.review.checkedApplyConfirmation.confirmationChoiceCount, 2, "Review surface must preserve confirmation choices.");
  assert.equal(panel.review.checkedApplyConfirmation.confirmationReportCount, 2, "Review surface must preserve confirmation reports.");
  assert.equal(panel.review.checkedApplyConfirmation.checkedApplyAvailable, false, "Review surface must keep checked apply unavailable.");
  assert.equal(panel.review.checkedApplyConfirmation.workspaceWriteAllowed, false, "Review surface must keep workspace writes disabled.");
  assert.equal(panel.review.checkedApplyConfirmation.targetRepositoryMutation, false, "Review surface must keep target mutation disabled.");
  assert.equal(panel.review.checkedApplyConfirmation.directApplyAllowed, false, "Review surface must keep direct apply disabled.");
  assert.equal(panel.review.checkedApplyConfirmation.directEditObjectCount, 0, "Review surface must not expose direct edit objects.");
  assert.equal(panel.review.targetCollaboration.contract, HIA_DEVTOOLS_TARGET_COLLABORATION_CONTRACT, "Review surface must expose target collaboration summary.");
  assert.equal(panel.review.targetCollaboration.status, "input-ready", "Review surface must expose target collaboration readiness.");
  assert.equal(panel.review.targetCollaboration.collaborationModeCount, 4, "Review surface must preserve collaboration mode count.");
  assert.equal(panel.review.targetCollaboration.flowStateCount, 8, "Review surface must preserve flow state count.");
  assert.equal(panel.review.targetCollaboration.hiaOwnedTargetRepositoryMutationAllowed, false, "Review surface must keep HIA-owned target mutation disabled.");
  assert.equal(panel.review.targetCollaboration.targetOwnerActionRequiredForWrite, true, "Review surface must require target owner action for writes.");
  assert.equal(panel.review.targetCollaboration.actualTargetBranchCreated, false, "Review surface must not claim target branch creation.");
  assert.equal(panel.review.targetCollaboration.actualPullRequestCreated, false, "Review surface must not claim pull request creation.");
  assert.equal(panel.review.targetCollaboration.targetRepositoryMutationCount, 0, "Review surface must keep target mutation count at zero.");
  assert.equal(panel.review.hostApplyUx.contract, HIA_DEVTOOLS_HOST_APPLY_UX_CONTRACT, "Review surface must expose host apply UX summary.");
  assert.equal(panel.review.hostApplyUx.status, "input-ready", "Review surface must expose host apply UX readiness.");
  assert.equal(panel.review.hostApplyUx.uxRequirementRefCount, 8, "Review surface must preserve host apply UX requirement refs.");
  assert.equal(panel.review.hostApplyUx.providerReviewLinkageVisible, true, "Review surface must show provider review linkage.");
  assert.equal(panel.review.hostApplyUx.targetOwnerEvidenceVisible, true, "Review surface must show target-owner evidence.");
  assert.equal(panel.review.hostApplyUx.deferredGateVisible, true, "Review surface must show deferred gate state.");
  assert.equal(panel.review.hostApplyUx.checkedApplyWriteEnabled, false, "Review surface must keep checked apply write disabled.");
  assert.equal(panel.review.hostApplyUx.workspaceWriteAllowed, false, "Review surface must keep workspace write disabled.");
  assert.equal(panel.review.hostApplyUx.targetRepositoryMutationAllowed, false, "Review surface must keep target mutation disabled.");
  assert.equal(panel.review.hostApplyUx.directEditObjectProduced, false, "Review surface must not expose direct edit objects.");
  assert.equal(panel.review.hostApplyUx.providerNetworkExecuted, false, "Review surface must not claim provider network execution.");
  assert.equal(panel.review.hostApplyUx.targetCommandsExecutedByHia, false, "Review surface must not claim target command execution.");
  assert.equal(panel.review.hostApplyUx.actualRuntimeCaptureExecuted, false, "Review surface must not claim runtime capture completion.");
  assert.equal(panel.review.hostApplyUx.hostEditorApiCalled, false, "Review surface must not claim host editor API calls.");
  assert.equal(panel.review.hostApplyUx.sourceBodyIncluded, false, "Review surface must not expose source bodies.");
  assert.equal(panel.review.hostApplyUx.sourcesContentPolicy, "none", "Review surface must preserve sourcesContent default none.");
  assert.equal(panel.review.provider.contract, "hia-provider-review-payload-augmentation", "Review surface must expose provider augmentation contract.");
  assert.equal(panel.review.provider.providerId, "hia-deterministic-mock", "Review surface must expose provider identity.");
  assert.equal(panel.review.provider.draftOutputCount, 1, "Review surface must summarize provider drafts.");
  assert.equal(panel.review.provider.reviewMetadataCount, 1, "Review surface must summarize provider review metadata.");
  assert.equal(panel.review.provider.refusalOutputCount, 0, "Review surface must summarize provider refusals.");
  assert.equal(panel.review.provider.directApplyAllowed, false, "Review surface provider metadata must keep direct apply disabled.");
  assert.equal(panel.review.provider.workspaceWriteAllowed, false, "Review surface provider metadata must keep workspace writes disabled.");
  assert.equal(reviewDetail?.actionHints.applyAvailable, false, "Review surface must keep apply unavailable.");
  assert.equal(reviewDetail?.provider.draftOutputCount, 1, "Review detail must expose provider drafts for the item.");
  assert.equal(reviewDetail?.provider.reviewMetadataCount, 1, "Review detail must expose provider metadata for the item.");
  assert.equal(reviewDetail?.editCandidate.status, "preview-only", "Review surface must expose candidate preview status.");
  assert.equal(reviewDetail?.editCandidate.kind, "source-docline-draft", "Review surface must expose candidate kind.");
  assert.equal(reviewDetail?.editCandidate.diffPreview.status, "preview-only", "Review surface must expose diff preview status.");
  assert.equal(reviewDetail?.editCandidate.diffPreview.executable, false, "Review surface diff preview must be non-executable.");
  assert.equal(reviewDetail?.editCandidate.diffPreview.operationCount, 1, "Review surface must expose semantic diff operations.");
  assert.equal(reviewDetail?.editCandidate.applyPreflight.status, "requires-host-check", "Review surface must expose apply preflight status.");
  assert.equal(reviewDetail?.editCandidate.applyPreflight.conflictStatus, "not-checked", "Review surface must expose conflict status.");
  assert.equal(reviewDetail?.editCandidate.applyPreflight.rollbackStrategy, "host-undo", "Review surface must expose rollback strategy.");
  assert.equal(detail?.fromLabel, "API", "Relation detail must resolve the from node label.");
  assert.equal(detail?.toLabel, "src/api.ts", "Relation detail must resolve the to node path.");
  assert.equal(message.type, HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE, "Open request message type must match the browser-panel contract.");
  assert.equal(message.metadata.relationId, "documents-source:entry:api->source:src/api.ts", "Open request message must retain relation metadata.");
  assert.equal(bridgeEnvelope.contract, HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT, "Bridge envelope must use the stable DevTools bridge contract.");
  assert.equal(bridgeEnvelope.contractVersion, HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT_VERSION, "Bridge envelope must expose the bridge contract version.");
  assert.equal(bridgeEnvelope.eventType, HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE, "Bridge envelope must expose the inspected-page event type.");
  assert.equal(bridgeEnvelope.strategy, HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_STRATEGY, "Bridge envelope must record the inspectedWindow strategy.");
  assert.deepEqual(bridgeEnvelope.capabilities, {
    contentScriptRequired: false,
    hostPermissionsRequired: false,
    inspectedWindowEval: true,
    returnsPageData: false
  }, "Bridge envelope must preserve the zero-permission first-slice boundary.");
  assert.match(bridgeExpression, /window\.dispatchEvent\(new CustomEvent/u, "Bridge expression must dispatch a DOM event in the inspected page.");
  assert.match(bridgeExpression, new RegExp(HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE, "u"), "Bridge expression must carry the HIA DevTools event type.");
  assert.doesNotMatch(JSON.stringify(bridgeEnvelope), /sourcesContent/u, "Bridge envelope must not carry embedded source content.");

  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify({
    contract: "hia-devtools-extension-check",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    extension: {
      devtoolsPage: manifest.devtools_page,
      manifestVersion: manifest.manifest_version,
      permissions: manifest.permissions,
      hostPermissions: manifest.host_permissions
    },
    panel: {
      bridge: {
        contract: bridgeEnvelope.contract,
        contractVersion: bridgeEnvelope.contractVersion,
        eventType: bridgeEnvelope.eventType,
        strategy: bridgeEnvelope.strategy,
        capabilities: bridgeEnvelope.capabilities
      },
      entryCount: panel.summary.entryCount,
      relationCount: panel.summary.relationCount,
      relationNodeCount: panel.summary.relationNodeCount,
      openRequestType: message.type,
      reviewSurface: {
        applyAvailableCount: panel.review.items.filter((item) => item.actionHints.applyAvailable === true).length,
        applyPreview: panel.review.applyPreview,
        contract: panel.review.contract,
        contractVersion: panel.review.contractVersion,
        draftCount: panel.review.draftCount,
        itemCount: panel.review.summary.itemCount,
        payloadContract: panel.review.payloadContract,
        applyPreflightHostCheckCount: panel.review.items.filter((item) => item.editCandidate.applyPreflight.status === "requires-host-check").length,
        applyPreflightTargetFileCount: panel.review.items.flatMap((item) => Array.from({ length: item.editCandidate.applyPreflight.targetFileCount })).length,
        checkedApplyConfirmation: panel.review.checkedApplyConfirmation,
        diffPreviewCount: panel.review.items.filter((item) => item.editCandidate.diffPreview.status === "preview-only").length,
        diffPreviewOperationCount: panel.review.items.flatMap((item) => item.editCandidate.diffPreview.operations).length,
        hostApplyUx: panel.review.hostApplyUx,
        previewCandidateCount: panel.review.items.filter((item) => item.editCandidate.status === "preview-only").length,
        provider: panel.review.provider,
        privacy: panel.review.privacy,
        targetCollaboration: panel.review.targetCollaboration
      }
    }
  }, null, 2)}\n`, "utf8");
  console.log(`DevTools extension check passed at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

function createFixturePayload() {
  return {
    summary: {
      entryCount: 1,
      linkedEntryCount: 1,
      relationCount: 1,
      relationNodeCount: 2
    },
    checkedApplyConfirmation: {
      checkedApplyAvailable: false,
      confirmationChoiceCount: 2,
      confirmationReportCount: 2,
      directApplyAllowed: false,
      directEditObjectCount: 0,
      realGuiManualEvidenceRequired: true,
      sandboxApplySuccessCount: 2,
      status: "input-ready",
      targetRepositoryMutation: false,
      workspaceWriteAllowed: false
    },
    entries: [
      {
        id: "entry:api",
        kind: "symbol",
        label: "API",
        openRequests: []
      }
    ],
    relationGraph: {
      nodes: [
        {
          id: "entry:api",
          kind: "entry",
          label: "API"
        },
        {
          id: "source:src/api.ts",
          kind: "source",
          label: "src/api.ts",
          path: "src/api.ts"
        }
      ],
      relations: [
        {
          from: "entry:api",
          id: "documents-source:entry:api->source:src/api.ts",
          kind: "documents-source",
          label: "Source: src/api.ts",
          openRequests: [
            {
              kind: "original-source",
              label: "Open source src/api.ts:1",
              target: {
                path: "src/api.ts",
                position: {
                  line: 1
                }
              },
              type: "hia.openSource"
            }
          ],
          to: "source:src/api.ts"
        }
      ]
    },
    hostApplyUx: {
      actualRuntimeCaptureExecuted: false,
      checkedApplyWriteEnabled: false,
      deferredGateVisible: true,
      directEditObjectProduced: false,
      hostEditorApiCalled: false,
      providerNetworkExecuted: false,
      providerReviewLinkageVisible: true,
      sourceBodyIncluded: false,
      sourcesContentPolicy: "none",
      status: "input-ready",
      surface: "browser-devtools-panel",
      targetCommandsExecutedByHia: false,
      targetOwnerEvidenceVisible: true,
      targetRepositoryMutationAllowed: false,
      uxRequirementRefs: [
        "host-owned-apply-ux",
        "provider-review-linkage",
        "target-owner-evidence-view",
        "rollback-formatter-audit-panel",
        "multi-host-read-only-projection",
        "deferred-write-gate-banner",
        "final-human-confirmation-state",
        "privacy-source-policy-state"
      ],
      workspaceWriteAllowed: false
    },
    providerAugmentation: {
      actionPolicy: {
        directApplyAllowed: false,
        directEditObjectAllowed: false,
        requiresHumanReview: true,
        targetRepositoryMutationAllowed: false,
        toolExecutionAllowed: false,
        workspaceWriteAllowed: false
      },
      contract: "hia-provider-review-payload-augmentation",
      contractVersion: "0.1.0-draft",
      draftOutputs: [
        {
          id: "runner-draft-output",
          proposalId: "provider-proposal-api-doc",
          providerOutputId: "draft-output",
          target: {
            reviewItemId: "review-item-proposal-api-doc"
          }
        }
      ],
      provider: {
        id: "hia-deterministic-mock",
        runtimeKind: "deterministic-mock",
        version: "0.1.0"
      },
      refusalOutputs: [],
      reviewItemBindings: [
        {
          providerReviewItemId: "review-item-proposal-api-doc",
          sourceReviewItemId: "review-item:proposal:api-doc"
        }
      ],
      reviewMetadata: [
        {
          proposalId: "provider-proposal-api-doc",
          providerOutputId: "review-output",
          qualitySignals: ["deterministic", "review-only"],
          riskLevel: "low"
        }
      ],
      status: "success",
      privacy: {
        includesSourceBody: false,
        includesSourcesContent: false,
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      }
    },
    reviewPayload: {
      actionPolicy: {
        allowedActions: ["review", "copy-draft", "preview-edit-candidate"],
        deniedActions: ["apply-workspace-edit"]
      },
      contract: "hia-documentation-review-payload",
      contractVersion: "0.1.0-draft",
      draftCount: 1,
      items: [
        {
          actionHints: {
            applyAvailable: false,
            copyDraftAvailable: true,
            editCandidatePreviewAvailable: true,
            openContextAvailable: true
          },
          contextLinks: {
            docSourceMapEntryCount: 1,
            projectEntryCount: 1,
            relationCount: 1
          },
          draft: {
            draftKind: "documentation-stub",
            text: "TODO: Review API documentation.",
            textFormat: "plain-text"
          },
          editCandidate: {
            applyMode: "host-preview-only",
            applyPreflight: {
              conflictStatus: "not-checked",
              contract: "hia-documentation-edit-apply-preflight",
              contractVersion: "0.1.0-draft",
              id: "apply-preflight:proposal:api-doc",
              limitations: [
                "host-file-read-required",
                "file-version-not-read",
                "conflict-status-not-checked",
                "rollback-record-required-before-apply"
              ],
              proposalId: "proposal:api-doc",
              requiresConflictCheck: true,
              requiresFileRead: true,
              rollback: {
                recordRequired: true,
                scope: "source-file",
                strategy: "host-undo"
              },
              status: "requires-host-check",
              targetFiles: [
                {
                  conflict: {
                    blocking: true,
                    expectedBaseVersion: "unknown",
                    requiresFileRead: true,
                    status: "not-checked"
                  },
                  fileVersion: {
                    contentHashStatus: "not-computed",
                    required: true,
                    source: "host-file-read",
                    status: "not-read"
                  },
                  formatting: {
                    formatter: "language-adapter-required",
                    indentation: "preserve",
                    lineEnding: "preserve"
                  },
                  path: "src/api.ts",
                  role: "source-docline",
                  rollback: {
                    recordRequired: true,
                    scope: "source-file",
                    strategy: "host-undo"
                  },
                  symbolId: "symbol:api"
                }
              ],
              targetKind: "source-docline-draft"
            },
            diffPreview: {
              contract: "hia-documentation-edit-diff-preview",
              contractVersion: "0.1.0-draft",
              id: "diff-preview:proposal:api-doc",
              limitations: [
                "not-a-workspace-edit",
                "conflict-check-not-yet-run",
                "source-formatter-not-selected"
              ],
              operations: [
                {
                  op: "insert-source-docline",
                  path: "src/api.ts",
                  symbolId: "symbol:api",
                  textFormat: "plain-text",
                  valuePreview: "TODO: Review API documentation."
                }
              ],
              previewFormat: "semantic-patch-preview",
              proposalId: "proposal:api-doc",
              safety: {
                directApply: false,
                executable: false,
                hostWrite: false,
                includesSourceContent: false,
                requiresConflictCheck: true,
                requiresFileRead: true,
                requiresHumanReview: true,
                sourcesContentPolicy: "none"
              },
              status: "preview-only",
              targetKind: "source-docline-draft"
            },
            kind: "source-docline-draft",
            preview: {
              previewKind: "draft-text",
              text: "TODO: Review API documentation.",
              textFormat: "plain-text"
            },
            safety: {
              allowsAutomaticWrites: false,
              directApply: false,
              hostWrite: false,
              includesSourceContent: false,
              requiresHumanReview: true,
              rollback: "not-applicable",
              sourcesContentPolicy: "none"
            },
            status: "preview-only",
            target: {
              relativePath: "src/api.ts",
              symbolName: "API"
            },
            workspaceEditBoundary: "proposal-only"
          },
          id: "review-item:proposal:api-doc",
          kind: "missing-documentation",
          proposalId: "proposal:api-doc",
          qualityChecks: [
            { code: "HIA_REVIEW_NO_AUTOMATIC_WRITE", status: "pass" },
            { code: "HIA_REVIEW_EDIT_CANDIDATE_PREVIEW_ONLY", status: "pass" }
          ],
          risk: {
            level: "low"
          },
          status: "review-required",
          target: {
            relativePath: "src/api.ts",
            symbolName: "API"
          },
          title: "Review API documentation"
        }
      ],
      privacy: {
        allowsAutomaticWrites: false,
        includesSourceContent: false,
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      },
      summary: {
        blockedCount: 0,
        draftCount: 1,
        itemCount: 1,
        reviewRequiredCount: 1
      }
    },
    targetCollaboration: {
      actualPullRequestCreated: false,
      actualTargetBranchCreated: false,
      collaborationModeCount: 4,
      flowStateCount: 8,
      hiaOwnedTargetRepositoryMutationAllowed: false,
      status: "input-ready",
      targetOwnerActionRequiredForWrite: true,
      targetRepositoryMutationCount: 0
    }
  };
}
