import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_BUILD_DOCS_COMMAND,
  HIA_AUTHORING_LOCATIONS_REQUEST,
  HIA_COPY_RESOURCE_KEY_COMMAND,
  HIA_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
  HIA_DOCUMENT_SOURCE_MAP_INDEX_REQUEST,
  HIA_IDE_CAPABILITIES_REQUEST,
  HIA_LANGUAGE_ID,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OPEN_PROJECT_RELATIONS_COMMAND,
  HIA_OPEN_RELATED_LOCATION_COMMAND,
  HIA_OPEN_SOURCE_LINKAGE_COMMAND,
  HIA_PROJECT_RELATION_GRAPH_REQUEST,
  HIA_RESOURCE_ACTIONS_REQUEST,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_REVIEW_DOCUMENTATION_PROPOSALS_COMMAND,
  HIA_SHOW_RESOURCE_ACTION_COMMAND,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaDocumentationReviewItemChoices,
  createHiaDocumentationReviewItemReport,
  createHiaDocumentationReviewReport,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaPreviewReport,
  createHiaResourceActionReport,
  createHiaValidationReport,
  getHiaDocumentationReviewDraftText,
  getHiaPreviewStaleReason,
  normalizeHiaCommandSettings,
  resolveConfiguredManifestPath,
  resolveConfiguredPreviewPath,
  resolveDefaultPreviewPath,
  resolveHiaPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule,
  type HiaDocumentationEditProposalsSummary
} from "./config.js";

describe("@hia-doc/vscode-extension config", () => {
  it("resolves the workspace LSP server module", () => {
    const extensionPath = path.resolve("apps/vscode-extension");
    const serverModule = resolveHiaServerModule(extensionPath);
    const cliModule = resolveHiaCliModule(extensionPath);

    expect(serverModule.replace(/\\/g, "/")).toMatch(/packages\/lsp\/dist\/node\.js$/);
    expect(path.isAbsolute(serverModule)).toBe(true);
    expect(cliModule.replace(/\\/g, "/")).toMatch(/apps\/cli\/dist\/index\.js$/);
    expect(path.isAbsolute(cliModule)).toBe(true);
  });

  it("targets HIA documents and command activation", () => {
    expect(HIA_LANGUAGE_ID).toBe("hia");
    expect(HIA_SHOW_OUTPUT_COMMAND).toBe("hia.showOutput");
    expect(HIA_BUILD_DOCS_COMMAND).toBe("hia.buildDocs");
    expect(HIA_OPEN_PREVIEW_COMMAND).toBe("hia.openPreview");
    expect(HIA_OPEN_PROJECT_RELATIONS_COMMAND).toBe("hia.openProjectRelations");
    expect(HIA_OPEN_SOURCE_LINKAGE_COMMAND).toBe("hia.openSourceLinkage");
    expect(HIA_VALIDATE_WORKSPACE_COMMAND).toBe("hia.validateWorkspace");
    expect(HIA_OPEN_RELATED_LOCATION_COMMAND).toBe("hia.openRelatedLocation");
    expect(HIA_SHOW_RESOURCE_ACTION_COMMAND).toBe("hia.showResourceAction");
    expect(HIA_COPY_RESOURCE_KEY_COMMAND).toBe("hia.copyResourceKey");
    expect(HIA_REVIEW_DOCUMENTATION_PROPOSALS_COMMAND).toBe("hia.reviewDocumentationProposals");
    expect(HIA_RESOURCE_INDEX_REQUEST).toBe("hia/documentResourceIndex");
    expect(HIA_DOCUMENT_SOURCE_MAP_INDEX_REQUEST).toBe("hia/documentSourceMapIndex");
    expect(HIA_PROJECT_RELATION_GRAPH_REQUEST).toBe("hia/projectRelationGraph");
    expect(HIA_IDE_CAPABILITIES_REQUEST).toBe("hia/ideCapabilities");
    expect(HIA_AUTHORING_LOCATIONS_REQUEST).toBe("hia/documentAuthoringLocations");
    expect(HIA_RESOURCE_ACTIONS_REQUEST).toBe("hia/resourceActions");
    expect(HIA_DOCUMENTATION_EDIT_PROPOSALS_REQUEST).toBe("hia/documentationEditProposals");
    expect(createHiaDocumentSelector()).toEqual([
      {
        scheme: "file",
        language: "hia"
      },
      {
        scheme: "file",
        pattern: "**/*.hia.json"
      },
      {
        scheme: "file",
        pattern: "**/*.docmap.json"
      },
      {
        scheme: "file",
        pattern: "**/project-index.json"
      }
    ]);
    expect(createHiaFileWatcherPattern()).toBe("**/{*.hia.json,*.docmap.json,project-index.json}");
    expect(resolveDefaultPreviewPath(path.resolve("workspace")).replace(/\\/g, "/")).toMatch(/workspace\/dist\/docs\/index\.html$/);
  });

  it("normalizes command settings and CLI build arguments", () => {
    const settings = normalizeHiaCommandSettings({
      config: " hia.config.json ",
      input: " fixtures/basic.hia.json ",
      jsdocIntegration: " ",
      locale: " en ",
      manifest: " meta/hia-manifest.json ",
      out: " output/docs ",
      previewPath: " output/docs/index.html "
    });
    const projectSettings = normalizeHiaCommandSettings({
      out: " dist/project-docs ",
      projectManifest: " fixtures/project-mixed.hia-project.json "
    });

    expect(settings).toEqual({
      config: "hia.config.json",
      input: "fixtures/basic.hia.json",
      locale: "en",
      manifest: "meta/hia-manifest.json",
      out: "output/docs",
      previewPath: "output/docs/index.html"
    });
    expect(createHiaBuildArgs(settings)).toEqual([
      "docs",
      "build",
      "--config",
      "hia.config.json",
      "--input",
      "fixtures/basic.hia.json",
      "--out",
      "output/docs",
      "--locale",
      "en",
      "--manifest",
      "meta/hia-manifest.json"
    ]);
    expect(createHiaBuildArgs(projectSettings)).toEqual([
      "docs",
      "build",
      "--project-manifest",
      "fixtures/project-mixed.hia-project.json",
      "--out",
      "dist/project-docs",
      "--manifest",
      "hia-manifest.json"
    ]);
  });

  it("resolves configured preview and manifest paths", () => {
    const workspaceRoot = path.resolve("workspace");
    const settings = normalizeHiaCommandSettings({
      manifest: "meta/hia-manifest.json",
      out: "site"
    });

    expect(resolveConfiguredPreviewPath(workspaceRoot).replace(/\\/g, "/")).toMatch(/workspace\/dist\/docs\/index\.html$/);
    expect(resolveConfiguredPreviewPath(workspaceRoot, "out/index.html").replace(/\\/g, "/")).toMatch(/workspace\/out\/index\.html$/);
    expect(resolveConfiguredPreviewPath(workspaceRoot, path.resolve("external/index.html"))).toBe(path.resolve("external/index.html"));
    expect(resolveConfiguredManifestPath(workspaceRoot, settings).replace(/\\/g, "/")).toMatch(/workspace\/site\/meta\/hia-manifest\.json$/);
  });

  it("resolves preview entrypoints from output manifests", () => {
    const workspaceRoot = path.resolve("workspace");
    const settings = normalizeHiaCommandSettings({
      out: "site",
      previewPath: "fallback/index.html"
    });

    expect(resolveHiaPreviewPath(workspaceRoot, settings, {
      entrypoint: "index.html"
    })).toMatchObject({
      manifestEntrypoint: "index.html",
      previewPath: path.resolve(workspaceRoot, "site/index.html"),
      source: "manifest"
    });
    expect(resolveHiaPreviewPath(workspaceRoot, settings, {
      entrypoint: "../outside.html"
    })).toMatchObject({
      previewPath: path.resolve(workspaceRoot, "fallback/index.html"),
      source: "setting",
      unavailableReason: "manifest-entrypoint-unsafe"
    });
    expect(resolveHiaPreviewPath(workspaceRoot, settings, {})).toMatchObject({
      source: "setting",
      unavailableReason: "manifest-entrypoint-missing"
    });
  });

  it("creates preview reports and stale reasons", () => {
    const report = createHiaPreviewReport({
      manifest: {
        documentId: "fixture.basic",
        entrypoint: "index.html",
        initialLocale: "en",
        title: "Fixture"
      },
      manifestExists: true,
      manifestPath: "K:/workspace/dist/docs/hia-manifest.json",
      previewExists: true,
      previewPath: "K:/workspace/dist/docs/index.html",
      source: "manifest",
      staleReason: "active-document-newer-than-preview"
    });

    expect(report).toEqual([
      "Strategy: generated-html",
      "Status: stale",
      "Preview file: K:/workspace/dist/docs/index.html",
      "Preview source: manifest",
      "Manifest: K:/workspace/dist/docs/hia-manifest.json",
      "Manifest entrypoint: index.html",
      "Document: fixture.basic",
      "Title: Fixture",
      "Initial locale: en",
      "Stale reason: active-document-newer-than-preview"
    ]);
    expect(getHiaPreviewStaleReason({
      previewMtimeMs: 100,
      sourceMtimeMs: 200
    })).toBe("active-document-newer-than-preview");
    expect(getHiaPreviewStaleReason({
      manifestMtimeMs: 200,
      previewMtimeMs: 100
    })).toBe("manifest-newer-than-preview");
  });

  it("creates capability-driven validation reports", () => {
    const report = createHiaValidationReport({
      uri: "file:///workspace/fixtures/basic.hia.json",
      resourceIndex: {
        documentId: "fixture.basic",
        i18nKeys: [{}],
        i18nResources: [{}],
        missingLocales: [{}],
        sourceReferences: [{}, {}]
      },
      capabilities: {
        capabilities: [
          { id: "hia.resource.index", status: "available" },
          { id: "hia.codeAction.resource.open", status: "planned" }
        ],
        profiles: [
          {
            profileId: "cssdoc",
            profileVersion: "0.1.0-draft",
            tagCount: 14
          }
        ],
        profileDiagnostics: [
          {
            code: "HIA_PROFILE_FIELD_INVALID"
          }
        ]
      },
      authoringLocations: {
        locations: [
          { kind: "core-document" },
          { kind: "diagnostic-target", unavailableReason: "source-fragment-missing" }
        ]
      },
      resourceActions: {
        actions: [
          { id: "open", kind: "open-resource", status: "available" },
          { id: "stub", kind: "create-missing-locale-stub", status: "preflight" },
          {
            id: "blocked",
            kind: "create-missing-locale-stub",
            status: "blocked",
            unavailableReason: "resource-key-missing"
          }
        ]
      },
      diagnostics: [
        {
          code: "HIA_LSP_SOURCE_REFERENCE_INVALID",
          severity: 0,
          data: {
            unavailableReason: "source-fragment-missing"
          }
        },
        {
          code: "HIA_LSP_I18N_LOCALE_MISSING",
          severity: 1
        }
      ]
    });

    expect(report).toEqual([
      "Document: fixture.basic",
      "URI: file:///workspace/fixtures/basic.hia.json",
      "Diagnostics: 1 error(s), 1 warning(s), 0 info/hint",
      "Resources: 1 resource(s), 1 key(s), 1 missing locale(s), 2 source reference(s)",
      "Authoring locations: 2 total, 1 unavailable",
      "Capabilities: available=1, planned=1",
      "Resource actions: 3 total, 1 preflight, 1 blocked",
      "Profiles: cssdoc@0.1.0-draft; 14 tag(s), 1 diagnostic(s)",
      "Unavailable reasons: resource-key-missing=1, source-fragment-missing=2",
      "Diagnostic codes: HIA_LSP_I18N_LOCALE_MISSING=1, HIA_LSP_SOURCE_REFERENCE_INVALID=1"
    ]);
  });

  it("creates review-only documentation proposal reports", () => {
    const reviewPayload: HiaDocumentationEditProposalsSummary = {
      draftCount: 1,
      proposalCount: 1,
      privacy: {
        allowsAutomaticWrites: false,
        includesSourceContent: false,
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      },
      reviewPayload: {
        actionPolicy: {
          allowedActions: ["review", "copy-draft"],
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
              projectEntryCount: 0,
              relationCount: 1
            },
            draft: {
              draftKind: "translation-stub",
              localeDrafts: {
                en: "English draft."
              },
              targetLocale: "en",
              text: "English draft."
            },
            editCandidate: {
              applyMode: "host-preview-only",
              contract: "hia-documentation-edit-candidate",
              contractVersion: "0.1.0-draft",
              id: "candidate:1",
              kind: "external-resource-locale-entry",
              preview: {
                previewKind: "draft-text",
                text: "English draft.",
                textFormat: "plain-text"
              },
              safety: {
                allowsAutomaticWrites: false,
                directApply: false,
                hostWrite: false,
                includesSourceContent: false,
                requiresHumanReview: true,
                rollback: "host-undo",
                sourcesContentPolicy: "none"
              },
              status: "preview-only",
              target: {
                fieldPath: "description",
                locale: "en",
                relativePath: "docs/profile.hia.json"
              },
              workspaceEditBoundary: "review-only"
            },
            id: "review:1",
            kind: "missing-locale-stub",
            proposalId: "proposal:1",
            qualityChecks: [
              {
                code: "HIA_LANG_PRESENT",
                message: "ok",
                status: "pass"
              }
            ],
            risk: {
              level: "low",
              reasons: ["public-metadata-only"]
            },
            status: "review-required",
            target: {
              fieldPath: "description",
              locale: "en",
              relativePath: "docs/profile.hia.json",
              symbolName: "Profile"
            },
            title: "Add English description",
            workspaceEditBoundary: "review-only"
          }
        ],
        localeQuality: {
          canonicalJsOutput: "@lang/<lang>",
          checkSummary: {
            blocked: 0,
            pass: 1,
            warning: 0
          },
          policyLocales: ["en", "zh-CN"],
          sourceDocumentTruth: "HiaI18nModel.fields"
        },
        privacy: {
          allowsAutomaticWrites: false,
          includesSourceContent: false,
          requiresHumanReview: true,
          sourcesContentPolicy: "none"
        },
        proposalCount: 1,
        summary: {
          draftCount: 1,
          itemCount: 1,
          qualityBlockedCount: 0,
          qualityWarningCount: 0
        }
      },
      status: "available"
    };

    const report = createHiaDocumentationReviewReport(reviewPayload);
    const choices = createHiaDocumentationReviewItemChoices(reviewPayload.reviewPayload);
    const itemReport = createHiaDocumentationReviewItemReport(reviewPayload.reviewPayload?.items?.[0] ?? {});

    expect(report).toContain("Review items: 1");
    expect(report).toContain("Automatic writes: disabled");
    expect(report).toContain("Locale truth: HiaI18nModel.fields");
    expect(report).toContain("Allowed actions: review, copy-draft");
    expect(report).toContain("Denied actions: apply-workspace-edit");
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      label: "Add English description",
      description: "missing-locale-stub | review-required | risk:low"
    });
    expect(choices[0]?.detail).toContain("docs/profile.hia.json Profile description locale:en");
    expect(choices[0]?.detail).toContain("edit preview");
    expect(choices[0]?.detail).toContain("action:copy draft");
    expect(itemReport).toContain("Proposal: proposal:1");
    expect(itemReport).toContain("Kind: missing-locale-stub");
    expect(itemReport).toContain("Edit candidate: preview-only (external-resource-locale-entry)");
    expect(itemReport).toContain("Action hints: copyDraft=yes, editPreview=yes, openContext=yes, apply=no");
    expect(getHiaDocumentationReviewDraftText(reviewPayload.reviewPayload?.items?.[0] ?? {})).toBe("English draft.");
  });

  it("creates resource action preview reports", () => {
    expect(createHiaResourceActionReport({
      kind: "create-missing-locale-stub",
      locale: "en",
      preflight: {
        conflictStatus: "not-checked",
        editKind: "create-missing-locale-entry",
        requiresFileRead: true,
        resourcePath: "i18n/profile.hia-i18n.json",
        resourcePointer: "/en/profile.render.description",
        targetUri: "file:///workspace/i18n/profile.hia-i18n.json",
        workspaceEditBoundary: "external-resource-only"
      },
      status: "preflight",
      title: "HIA: Preview en resource stub"
    })).toEqual([
      "Action: HIA: Preview en resource stub",
      "Status: preflight",
      "Kind: create-missing-locale-stub",
      "Locale: en",
      "Preflight edit: create-missing-locale-entry",
      "Preflight target: file:///workspace/i18n/profile.hia-i18n.json",
      "Preflight resource: i18n/profile.hia-i18n.json",
      "Preflight pointer: /en/profile.render.description",
      "Conflict status: not-checked",
      "Workspace edit boundary: external-resource-only",
      "Requires file read: yes"
    ]);
  });
});
