import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  const workspaceRoot = path.join(outputRoot, "workspace");
  await prepareWorkspaceRuntime(workspaceRoot);

  const service = createHiaLspService({
    profileDiagnostics: [
      {
        code: "HIA_PROFILE_RULE_UNKNOWN_TAG",
        message: "Profile tag rule requires review.",
        severity: "warning",
        targetPath: "profiles/cssdoc.json"
      }
    ]
  });
  const uri = pathToFileURL(path.join(workspaceRoot, "docs", "ai-authoring-proposals.hia.json")).href;
  const document = createProposalFixture();

  service.initialize({
    capabilities: {},
    processId: null,
    rootUri: pathToFileURL(workspaceRoot).href,
    workspaceFolders: [
      {
        name: "workspace",
        uri: pathToFileURL(workspaceRoot).href
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
  assert.equal(result.proposalCount, 4);
  assert.deepEqual(result.proposals.map((proposal) => proposal.kind).sort(), [
    "generic-docline-diagnostic",
    "missing-documentation",
    "missing-locale-stub",
    "profile-rule-suggestion"
  ]);
  assert.equal(result.privacy.contextPolicy, "public-safe");
  assert.equal(result.privacy.sourcesContentPolicy, "none");
  assert.equal(result.privacy.includesSourceContent, false);
  assert.equal(result.privacy.allowsAutomaticWrites, false);
  assert.equal(result.privacy.requiresHumanReview, true);
  assert.equal(result.host.capability, "hia.documentationEditProposal");
  assert.equal(result.host.source, "managed-document");
  assert.equal(result.proposals[0]?.status, "review-required");
  assert.equal(result.proposals[0]?.workspaceEditBoundary, "external-resource-only");
  assert.equal(result.context.docSourceMap.entryCount, 1);
  assert.equal(result.context.projectRelations.relationCount, 2);
  const missingDocumentationProposal = result.proposals.find((proposal) => proposal.kind === "missing-documentation");
  assert.ok(missingDocumentationProposal?.unifiedContext, "Missing-documentation proposal should carry unified context.");
  assert.deepEqual(missingDocumentationProposal.unifiedContext.matchedBy.sort(), [
    "doc-source-map-entry",
    "project-entry-symbolId",
    "project-relation",
    "project-entry-sourcePath",
    "sourcePath",
    "symbolId"
  ].sort());
  assert.equal(missingDocumentationProposal.unifiedContext.docSourceMapEntries?.[0]?.entryId, "entry:toy:helper");
  assert.equal(missingDocumentationProposal.unifiedContext.projectEntries?.[0]?.entryId, "generic-docline:toy-helper");
  assert.equal(missingDocumentationProposal.unifiedContext.relations?.length, 2);
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
      "Confirm unifiedContext points to project-index entry, doc-source-map entry and relation metadata only.",
      "Confirm cancelling a proposal leaves the workspace unchanged."
    ]
  };

  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`AI authoring proposal evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

async function prepareWorkspaceRuntime(workspaceRoot) {
  await rm(outputRoot, { force: true, recursive: true });
  await mkdir(path.join(workspaceRoot, "docs"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "dist", "docs"), { recursive: true });
  await writeFile(path.join(workspaceRoot, "hia.config.json"), JSON.stringify({
    schemaVersion: "0.1.0",
    docs: {
      output: "dist/docs",
      projectManifest: "project.hia-project.json"
    }
  }, null, 2), "utf8");
  await writeFile(path.join(workspaceRoot, "project.hia-project.json"), JSON.stringify({
    schemaVersion: "0.1.0-draft",
    project: {
      id: "project:ai-authoring-proposals",
      name: "AI Authoring Proposals"
    },
    inputs: [
      {
        kind: "doc-source-map",
        path: "docs/toy-helper.docmap.json"
      }
    ]
  }, null, 2), "utf8");
  await writeFile(path.join(workspaceRoot, "docs", "toy-helper.docmap.json"), JSON.stringify(createProposalDocSourceMapFixture(), null, 2), "utf8");
  await writeFile(path.join(workspaceRoot, "dist", "docs", "project-index.json"), JSON.stringify(createProposalProjectIndexFixture(), null, 2), "utf8");
}

function createProposalFixture() {
  return createHiaDocument({
    id: "fixture.ai-authoring.proposals",
    title: "AI Authoring Proposals Fixture",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    diagnostics: [
      {
        code: "HIA_GENERIC_DOCLINE_MISSING_DOC",
        message: "Generic doc-line scanner found a missing documentation anchor.",
        severity: "warning",
        targetPath: "src/sample.toy"
      }
    ],
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
      },
      {
        id: "toy:helper",
        kind: "generic-function",
        name: "helper",
        source: {
          mode: "link",
          model: "hia-source",
          modelVersion: "0.2.0",
          definedIn: {
            kind: "defined-in",
            language: "toy",
            relativePath: "src/sample.toy",
            range: {
              start: { line: 12, column: 1 },
              end: { line: 12, column: 14 }
            },
            position: { line: 12, column: 1 }
          },
          diagnostics: [],
          fragments: []
        }
      }
    ]
  });
}

function createProposalDocSourceMapFixture() {
  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:ai-authoring:toy-helper",
    artifacts: [
      {
        id: "artifact:toy:helper",
        kind: "generated-doc",
        path: "build/sample.toy.out",
        language: "toy"
      }
    ],
    sources: [
      {
        id: "source:toy:helper",
        kind: "source",
        path: "src/sample.toy",
        language: "toy",
        sourcesContentPolicy: "none"
      }
    ],
    sourceMaps: [],
    chains: [],
    entries: [
      {
        id: "entry:toy:helper",
        kind: "symbol",
        symbolKind: "generic-function",
        symbolId: "toy:helper",
        sourceRefs: [
          {
            sourceId: "source:toy:helper",
            range: {
              start: { line: 12, column: 1 },
              end: { line: 12, column: 14 }
            },
            rangeSource: "scanner",
            confidence: "medium"
          }
        ],
        artifactRefs: [
          {
            artifactId: "artifact:toy:helper",
            rangeSource: "adapter",
            confidence: "low"
          }
        ],
        diagnostics: []
      }
    ],
    privacy: {
      sourcesContentPolicy: "none",
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowPathTraversal: false
    },
    diagnostics: []
  };
}

function createProposalProjectIndexFixture() {
  return {
    contract: "hia-project-navigation-index",
    contractVersion: "0.1.0-draft",
    project: {
      defaultLocale: "en",
      entryCounts: {
        all: 1,
        other: 1
      },
      id: "project:ai-authoring-proposals",
      locales: ["en"],
      name: "AI Authoring Proposals",
      title: "AI Authoring Proposals",
      views: ["all", "other"]
    },
    entries: [
      {
        id: "generic-docline:toy-helper",
        name: "helper",
        kind: "generic-function",
        view: "other",
        symbolId: "toy:helper",
        source: {
          path: "src/sample.toy",
          language: "toy",
          range: {
            start: { line: 12, column: 1 },
            end: { line: 12, column: 14 }
          },
          rangeSource: "scanner",
          confidence: "medium"
        },
        docSourceMap: {
          path: "docs/toy-helper.docmap.json",
          entryId: "entry:toy:helper",
          sourcePath: "src/sample.toy",
          sourceRange: {
            start: { line: 12, column: 1 },
            end: { line: 12, column: 14 }
          },
          sourceRangeSource: "scanner",
          sourceConfidence: "medium",
          artifactPath: "build/sample.toy.out",
          artifactConfidence: "low"
        }
      }
    ],
    groups: [],
    profiles: [],
    docSourceMaps: [
      {
        path: "docs/toy-helper.docmap.json",
        contractVersion: "0.1.0-draft",
        entryArtifact: "build/sample.toy.out",
        artifactCount: 1,
        entryCount: 1,
        linkedEntryCount: 1,
        sourceCount: 1,
        sourceMapCount: 0,
        sourcesContentPolicy: "none",
        status: "available",
        unresolvedEntryCount: 0
      }
    ],
    relationGraph: {
      contract: "hia-project-relation-graph",
      contractVersion: "0.1.0-draft",
      nodeCount: 3,
      relationCount: 2,
      nodes: [
        {
          id: "artifact:build/sample.toy.out",
          kind: "artifact",
          label: "build/sample.toy.out",
          path: "build/sample.toy.out"
        },
        {
          id: "entry:generic-docline:toy-helper",
          kind: "entry",
          label: "helper",
          entryId: "generic-docline:toy-helper",
          view: "other"
        },
        {
          id: "source:src/sample.toy",
          kind: "source",
          label: "src/sample.toy",
          path: "src/sample.toy"
        }
      ],
      relations: [
        {
          id: "documents-source:entry:generic-docline:toy-helper->source:src/sample.toy",
          kind: "documents-source",
          from: "entry:generic-docline:toy-helper",
          to: "source:src/sample.toy",
          label: "Source: src/sample.toy",
          confidence: "medium",
          entryId: "generic-docline:toy-helper",
          metadata: {
            language: "toy",
            rangeStartLine: 12,
            rangeEndLine: 12,
            rangeSource: "scanner"
          }
        },
        {
          id: "documents-generated-artifact:entry:generic-docline:toy-helper->artifact:build/sample.toy.out",
          kind: "documents-generated-artifact",
          from: "entry:generic-docline:toy-helper",
          to: "artifact:build/sample.toy.out",
          label: "Generated: build/sample.toy.out",
          confidence: "low",
          entryId: "generic-docline:toy-helper",
          metadata: {
            manifest: "docs/toy-helper.docmap.json"
          }
        }
      ]
    }
  };
}
