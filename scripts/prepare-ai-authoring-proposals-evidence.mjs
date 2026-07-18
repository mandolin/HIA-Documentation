import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHiaDocument } from "../packages/core/dist/index.js";
import {
  HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
  HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
  HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST
} from "../packages/lsp/dist/documentation-edit-proposals.js";
import { createHiaLspService } from "../packages/lsp/dist/service.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "ai-authoring-proposals-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");

await main();

/**
 * 准备 AI-assisted authoring proposal 的可重复 evidence。
 * Prepares reproducible evidence for AI-assisted authoring proposals.
 */
async function main() {
  const service = createHiaLspService();
  const uri = "file:///workspace/fixtures/ai-authoring-proposals.hia.json";
  const document = createProposalFixture();

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

  const result = service.getDocumentationEditProposals(uri);
  const serialized = JSON.stringify(result);

  assert.equal(HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST, "hia/documentationEditProposals");
  assert.equal(result.contract, HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT);
  assert.equal(result.contractVersion, HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION);
  assert.equal(result.status, "available");
  assert.equal(result.proposalCount, 1);
  assert.equal(result.privacy.contextPolicy, "public-safe");
  assert.equal(result.privacy.sourcesContentPolicy, "none");
  assert.equal(result.privacy.includesSourceContent, false);
  assert.equal(result.privacy.allowsAutomaticWrites, false);
  assert.equal(result.privacy.requiresHumanReview, true);
  assert.equal(result.host.capability, "hia.documentationEditProposal");
  assert.equal(result.host.source, "managed-document");
  assert.equal(result.proposals[0]?.status, "review-required");
  assert.equal(result.proposals[0]?.workspaceEditBoundary, "external-resource-only");
  assert(!serialized.includes("\"sourcesContent\":"), "AI authoring evidence must not embed sourcesContent.");
  assert(!serialized.includes("渲染用户资料"), "AI authoring evidence must not embed source/default text bodies.");

  const evidence = {
    contract: "hia-ai-authoring-proposals-runtime-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    request: {
      method: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
      contract: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
      contractVersion: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION
    },
    result,
    privacyChecks: {
      allowsAutomaticWrites: false,
      includesSourceContent: false,
      sourcesContentPolicy: "none",
      targetRepositoryMutation: false
    },
    manualChecks: [
      "Confirm an IDE host presents proposal review before any write.",
      "Confirm opening the target resource stays inside the active workspace.",
      "Confirm proposal copy text does not include private source bodies.",
      "Confirm cancelling a proposal leaves the workspace unchanged."
    ]
  };

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`AI authoring proposal evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

function createProposalFixture() {
  return createHiaDocument({
    id: "fixture.ai-authoring.proposals",
    title: "AI Authoring Proposals Fixture",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    symbols: [
      {
        id: "function:renderProfile",
        kind: "function",
        name: "renderProfile",
        i18n: {
          enabled: true,
          model: "hia-text-i18n",
          modelVersion: "0.2.0",
          defaultLocale: "zh-CN",
          locales: ["zh-CN", "en"],
          resources: [
            {
              kind: "external-resource",
              path: "i18n/profile.hia-i18n.json",
              locale: "en",
              format: "hia-i18n-json",
              fields: ["description"]
            }
          ],
          fields: {
            description: {
              fieldPath: "description",
              kind: "description",
              key: "profile.render.description",
              path: "profile.render",
              defaultLocale: "zh-CN",
              defaultText: "渲染用户资料。",
              localizedText: {
                "zh-CN": "渲染用户资料。"
              },
              missingLocales: ["en"]
            }
          }
        }
      }
    ]
  });
}
