import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(rootDir, "apps", "devtools-extension");
const evidencePath = path.join(rootDir, "dist", "devtools-extension-check.json");

const {
  HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT_VERSION,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE,
  HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_STRATEGY,
  HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT,
  HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT_VERSION,
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
  assert.equal(reviewDetail?.actionHints.applyAvailable, false, "Review surface must keep apply unavailable.");
  assert.equal(reviewDetail?.editCandidate.status, "preview-only", "Review surface must expose candidate preview status.");
  assert.equal(reviewDetail?.editCandidate.kind, "source-docline-draft", "Review surface must expose candidate kind.");
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
        contract: panel.review.contract,
        contractVersion: panel.review.contractVersion,
        draftCount: panel.review.draftCount,
        itemCount: panel.review.summary.itemCount,
        payloadContract: panel.review.payloadContract,
        previewCandidateCount: panel.review.items.filter((item) => item.editCandidate.status === "preview-only").length,
        privacy: panel.review.privacy
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
    }
  };
}
