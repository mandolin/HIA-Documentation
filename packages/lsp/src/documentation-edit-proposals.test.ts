import { describe, expect, it } from "vitest";
import { createHiaDocument } from "@hia-doc/core";
import {
  HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
  HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
  HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST
} from "./documentation-edit-proposals.js";
import { createHiaLspService } from "./service.js";

describe("@hia-doc/lsp documentation edit proposals", () => {
  it("returns unavailable public-safe metadata for unopened documents", () => {
    const service = createInitializedService();
    const result = service.getDocumentationEditProposals("file:///workspace/missing.hia.json");

    expect(HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST).toBe("hia/documentationEditProposals");
    expect(result).toMatchObject({
      contract: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
      contractVersion: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
      host: {
        capability: "hia.documentationEditProposal",
        emptyState: "not-loaded",
        request: {
          method: "hia/documentationEditProposals",
          version: "0.1.0-draft"
        },
        source: "none"
      },
      privacy: {
        allowsAutomaticWrites: false,
        contextPolicy: "public-safe",
        includesSourceContent: false,
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      },
      proposalCount: 0,
      proposals: [],
      status: "unavailable",
      unavailableReason: "document-not-open"
    });
  });

  it("creates reviewable missing-locale proposals without source contents or direct workspace edits", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/resource-actions.hia.json";
    const document = createHiaDocument({
      id: "fixture.lsp.documentation-proposals",
      title: "Documentation Proposals Fixture",
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

    service.openDocument(uri, JSON.stringify(document), "hia", 1);

    const result = service.getDocumentationEditProposals(uri);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      contract: "hia-documentation-edit-proposals",
      contractVersion: "0.1.0-draft",
      context: {
        defaultLocale: "zh-CN",
        diagnosticCount: 1,
        documentId: "fixture.lsp.documentation-proposals",
        localeCount: 2,
        missingLocaleCount: 1,
        resourceCount: 1,
        sourceReferenceCount: 0
      },
      host: {
        capability: "hia.documentationEditProposal",
        contract: "hia-lsp-host-result",
        request: {
          method: "hia/documentationEditProposals",
          version: "0.1.0-draft"
        },
        source: "managed-document"
      },
      privacy: {
        allowsAutomaticWrites: false,
        contextPolicy: "public-safe",
        includesSourceContent: false,
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      },
      proposalCount: 1,
      proposals: [
        expect.objectContaining({
          kind: "missing-locale-stub",
          origin: expect.objectContaining({
            diagnosticCodes: ["HIA_LSP_I18N_LOCALE_MISSING"]
          }),
          status: "review-required",
          target: expect.objectContaining({
            locale: "en",
            resourcePath: "i18n/profile.hia-i18n.json",
            resourcePointer: "/en/profile.render.description",
            symbolId: "function:renderProfile",
            targetUri: "file:///workspace/i18n/profile.hia-i18n.json"
          }),
          workspaceEditBoundary: "external-resource-only"
        })
      ],
      status: "available",
      workflow: {
        allowedActions: expect.arrayContaining(["review", "open-target", "copy-proposal", "cancel"]),
        deniedActions: expect.arrayContaining(["auto-apply", "write-target-file-without-review", "embed-private-source"]),
        defaultAction: "review"
      }
    });
    expect(serialized).not.toContain("\"sourcesContent\":");
    expect(serialized).not.toContain("渲染用户资料");
    expect(serialized).not.toContain("WorkspaceEdit");
  });

  it("creates expanded documentation, profile and generic diagnostic proposals", () => {
    const service = createInitializedService({
      profileDiagnostics: [
        {
          code: "HIA_PROFILE_RULE_UNKNOWN_TAG",
          message: "Profile tag rule requires review.",
          severity: "warning",
          targetPath: "profiles/cssdoc.json"
        }
      ]
    });
    const uri = "file:///workspace/fixtures/expanded-proposals.hia.json";
    const document = createHiaDocument({
      id: "fixture.lsp.expanded-proposals",
      title: "Expanded Proposals Fixture",
      defaultLocale: "en",
      locales: ["en"],
      diagnostics: [
        {
          code: "HIA_GENERIC_DOCLINE_MISSING_DOC",
          message: "Symbol helper has no attached doc block.",
          severity: "warning",
          targetPath: "src/sample.toy"
        }
      ],
      symbols: [
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
            fragments: [],
            diagnostics: []
          }
        }
      ]
    });

    service.openDocument(uri, JSON.stringify(document), "hia", 1);

    const result = service.getDocumentationEditProposals(uri);
    const serialized = JSON.stringify(result);

    expect(result.proposalCount).toBe(3);
    expect(result.proposals.map((proposal) => proposal.kind).sort()).toEqual([
      "generic-docline-diagnostic",
      "missing-documentation",
      "profile-rule-suggestion"
    ]);
    expect(result.proposals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "missing-documentation",
        origin: expect.objectContaining({
          source: "document-symbol"
        }),
        suggestion: expect.objectContaining({
          category: "missing-documentation"
        }),
        target: expect.objectContaining({
          relativePath: "src/sample.toy",
          symbolId: "toy:helper",
          symbolName: "helper"
        }),
        workspaceEditBoundary: "proposal-only"
      }),
      expect.objectContaining({
        kind: "generic-docline-diagnostic",
        diagnostic: expect.objectContaining({
          code: "HIA_GENERIC_DOCLINE_MISSING_DOC"
        }),
        origin: expect.objectContaining({
          source: "document-diagnostic"
        }),
        target: expect.objectContaining({
          targetPath: "src/sample.toy"
        })
      }),
      expect.objectContaining({
        kind: "profile-rule-suggestion",
        diagnostic: expect.objectContaining({
          code: "HIA_PROFILE_RULE_UNKNOWN_TAG"
        }),
        origin: expect.objectContaining({
          source: "profile-diagnostic"
        }),
        target: expect.objectContaining({
          targetPath: "profiles/cssdoc.json"
        })
      })
    ]));
    expect(serialized).not.toContain("\"sourcesContent\":");
    expect(serialized).not.toContain("function helper");
    expect(serialized).not.toContain("WorkspaceEdit");
  });
});

function createInitializedService(options: Parameters<typeof createHiaLspService>[0] = {}) {
  const service = createHiaLspService(options);
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
  return service;
}
