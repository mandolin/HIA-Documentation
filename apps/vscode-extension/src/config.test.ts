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
  HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND,
  HIA_SHOW_HOST_APPLY_UX_INTAKE_COMMAND,
  HIA_SHOW_RESOURCE_ACTION_COMMAND,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaCheckedApplySandboxConfirmationChoices,
  createHiaCheckedApplySandboxConfirmationReport,
  createHiaHostApplyUxIntakeReport,
  createHiaHostApplyUxSurfaceChoices,
  createHiaDocumentationCheckedApplyConfirmationChoices,
  createHiaDocumentationCheckedApplyConfirmationPreview,
  createHiaDocumentationCheckedApplyConfirmationReport,
  createHiaDocumentationReviewItemChoices,
  createHiaDocumentationReviewItemReport,
  createHiaDocumentationReviewProviderReport,
  createHiaDocumentationReviewReport,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaPreviewReport,
  createHiaResourceActionReport,
  createHiaValidationReport,
  getHiaDocumentationReviewDraftText,
  getHiaDocumentationProviderAugmentation,
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
    expect(HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND).toBe("hia.showCheckedApplySandboxConfirmation");
    expect(HIA_SHOW_HOST_APPLY_UX_INTAKE_COMMAND).toBe("hia.showHostApplyUxIntake");
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
    const providerAugmentation = {
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
          id: "runner-draft-1",
          proposalId: "provider-proposal-1",
          providerOutputId: "draft-1",
          target: {
            reviewItemId: "review-1"
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
          providerReviewItemId: "review-1",
          sourceReviewItemId: "review:1"
        }
      ],
      reviewMetadata: [
        {
          proposalId: "provider-proposal-1",
          providerOutputId: "metadata-1",
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
    };
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
              applyPreflight: {
                conflictStatus: "not-checked",
                contract: "hia-documentation-edit-apply-preflight",
                contractVersion: "0.1.0-draft",
                id: "apply-preflight:1",
                limitations: [
                  "host-file-read-required",
                  "conflict-status-not-checked"
                ],
                proposalId: "proposal:1",
                requiresConflictCheck: true,
                requiresFileRead: true,
                rollback: {
                  recordRequired: true,
                  scope: "target-resource-file",
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
                    path: "i18n/profile.hia-i18n.json",
                    pointer: "/en/profile.description",
                    role: "external-resource"
                  }
                ],
                targetKind: "external-resource-locale-entry"
              },
              contract: "hia-documentation-edit-candidate",
              contractVersion: "0.1.0-draft",
              diffPreview: {
                contract: "hia-documentation-edit-diff-preview",
                contractVersion: "0.1.0-draft",
                id: "diff-preview:1",
                limitations: [
                  "not-a-workspace-edit",
                  "conflict-check-not-yet-run"
                ],
                operations: [
                  {
                    fieldPath: "description",
                    locale: "en",
                    op: "add-locale-entry",
                    path: "i18n/profile.hia-i18n.json",
                    pointer: "/en/profile.description",
                    symbolId: "symbol:profile",
                    textFormat: "plain-text",
                    valuePreview: "English draft."
                  }
                ],
                previewFormat: "semantic-patch-preview",
                proposalId: "proposal:1",
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
                targetKind: "external-resource-locale-entry"
              },
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
        providerAugmentation,
        summary: {
          draftCount: 1,
          itemCount: 1,
          qualityBlockedCount: 0,
          qualityWarningCount: 0
        }
      },
      providerAugmentation,
      status: "available"
    };

    const report = createHiaDocumentationReviewReport(reviewPayload);
    const provider = getHiaDocumentationProviderAugmentation(reviewPayload);
    const choices = createHiaDocumentationReviewItemChoices(reviewPayload.reviewPayload, provider);
    const reviewItem = reviewPayload.reviewPayload?.items?.[0] ?? {};
    const itemReport = createHiaDocumentationReviewItemReport(reviewItem, provider);
    const providerReport = createHiaDocumentationReviewProviderReport(provider);
    const checkedConfirmation = createHiaDocumentationCheckedApplyConfirmationPreview(reviewItem);
    const checkedConfirmationChoices = createHiaDocumentationCheckedApplyConfirmationChoices(checkedConfirmation ? [checkedConfirmation] : []);
    const checkedConfirmationReport = checkedConfirmation ? createHiaDocumentationCheckedApplyConfirmationReport(checkedConfirmation) : [];

    expect(report).toContain("Review items: 1");
    expect(report).toContain("Automatic writes: disabled");
    expect(report).toContain("Locale truth: HiaI18nModel.fields");
    expect(report).toContain("Provider: hia-deterministic-mock@0.1.0");
    expect(report).toContain("Provider drafts: 1");
    expect(report).toContain("Provider metadata: 1");
    expect(report).toContain("Provider direct apply: disabled");
    expect(report).toContain("Allowed actions: review, copy-draft");
    expect(report).toContain("Denied actions: apply-workspace-edit");
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      label: "Add English description",
      description: "missing-locale-stub | review-required | risk:low"
    });
    expect(choices[0]?.detail).toContain("docs/profile.hia.json Profile description locale:en");
    expect(choices[0]?.detail).toContain("provider:drafts=1, metadata=1, refusals=0");
    expect(choices[0]?.detail).toContain("edit preview");
    expect(choices[0]?.detail).toContain("diff preview");
    expect(choices[0]?.detail).toContain("host preflight");
    expect(choices[0]?.detail).toContain("checked confirmation");
    expect(choices[0]?.detail).toContain("action:copy draft");
    expect(itemReport).toContain("Proposal: proposal:1");
    expect(itemReport).toContain("Kind: missing-locale-stub");
    expect(itemReport).toContain("Edit candidate: preview-only (external-resource-locale-entry)");
    expect(itemReport).toContain("Diff preview: preview-only (external-resource-locale-entry)");
    expect(itemReport).toContain("Apply preflight: requires-host-check (conflict:not-checked)");
    expect(itemReport).toContain("Provider: hia-deterministic-mock@0.1.0");
    expect(itemReport).toContain("Provider quality signals: deterministic, review-only");
    expect(itemReport).toContain("Action hints: copyDraft=yes, editPreview=yes, openContext=yes, apply=no");
    expect(providerReport).toContain("Provider workspace write: disabled");
    expect(providerReport).toContain("Provider source body: not included");
    expect(checkedConfirmation).toMatchObject({
      applyAuthorityStillBlocked: true,
      confirmationState: "preflight-only",
      conflictStatus: "not-checked",
      directApplyAllowed: false,
      finalConflictRecheckRequired: true,
      finalHumanConfirmationRequired: true,
      postApplyValidationRequired: true,
      readyForHostConfirmation: false,
      targetKind: "external-resource-locale-entry",
      transactionId: "apply-preflight:1",
      workspaceWriteAllowed: false
    });
    expect(checkedConfirmationChoices).toHaveLength(1);
    expect(checkedConfirmationChoices[0]?.description).toBe("preflight-only; apply authority blocked");
    expect(checkedConfirmationReport).toContain("Ready for host confirmation: no");
    expect(checkedConfirmationReport).toContain("Final human confirmation: required");
    expect(checkedConfirmationReport).toContain("Final conflict recheck: required");
    expect(checkedConfirmationReport).toContain("Apply authority: blocked");
    expect(checkedConfirmationReport).toContain("Direct apply: disabled");
    expect(checkedConfirmationReport).toContain("Workspace write: disabled");
    expect(getHiaDocumentationReviewDraftText(reviewItem)).toBe("English draft.");
  });

  it("creates checked apply sandbox confirmation choices and reports", () => {
    const evidence = {
      contract: "hia-wp38-host-owned-writable-apply-sandbox-evidence",
      contractVersion: "0.1.0-draft",
      sandboxPolicy: {
        applyAuthority: "host-owned-sandbox-only",
        outputScope: "dist-sandbox",
        providerOwnedApplyAllowed: false,
        realWorkspaceApplyEditAllowed: false,
        sourcesContentPolicy: "none",
        targetRepositoryMutationAllowed: false
      },
      status: "ready-for-vscode-real-gui-confirmation-evidence",
      summary: {
        directApplyAllowedCount: 0,
        directEditObjectCount: 0,
        formatterExecutionCount: 1,
        lspServerOwnedApplyCount: 0,
        postApplyValidationSuccessCount: 1,
        providerOwnedApplyCount: 0,
        sandboxApplySuccessCount: 1,
        sandboxWriteOperationCount: 3,
        sourceBodyIncludedInEvidence: false,
        sourcesContentPolicy: "none",
        targetRepositoryMutationCount: 0,
        workspaceApplyEditCallCount: 0,
        workspaceWriteAllowedCount: 0
      },
      transactionResults: [
        {
          applyStatus: "applied-to-sandbox",
          auditRecord: "redacted",
          finalHumanConfirmation: "fixture-confirmed",
          formatterExecution: "executed-by-sandbox-host",
          id: "sandbox-locale-entry",
          label: "Sandbox locale resource entry",
          outputScope: "dist-sandbox",
          postApplyValidation: "passed",
          repeatConflictCheck: "clear",
          rollbackSnapshotPrepared: true,
          sandboxRelativePath: "dist/wp38-host-owned-writable-apply-sandbox/sandbox/locale/messages.zh-CN.json",
          targetKind: "external-resource-locale-entry",
          targetRepositoryMode: "not-a-target-repository"
        }
      ]
    };
    const choices = createHiaCheckedApplySandboxConfirmationChoices(evidence);
    const report = createHiaCheckedApplySandboxConfirmationReport(evidence, choices[0]?.transaction);

    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      label: "Sandbox locale resource entry",
      description: "applied-to-sandbox; dist-sandbox; not-a-target-repository"
    });
    expect(choices[0]?.detail).toContain("conflict:clear");
    expect(report).toContain("Evidence: hia-wp38-host-owned-writable-apply-sandbox-evidence@0.1.0-draft");
    expect(report).toContain("Final human confirmation: fixture-confirmed");
    expect(report).toContain("Final conflict recheck: clear");
    expect(report).toContain("Rollback private snapshot: yes");
    expect(report).toContain("Formatter execution: executed-by-sandbox-host");
    expect(report).toContain("Post-apply validation: passed");
    expect(report).toContain("Workspace applyEdit: disabled");
    expect(report).toContain("Workspace write: disabled");
    expect(report).toContain("Target repository mutation: disabled");
    expect(report).toContain("Provider-owned apply: disabled");
    expect(report).toContain("LSP server-owned apply: disabled");
    expect(report).toContain("Direct edit object: disabled");
    expect(report).toContain("Source bodies: not shown by the VS Code checked apply sandbox confirmation.");
  });

  it("creates host apply UX intake surface choices and reports", () => {
    const evidence = {
      contract: "hia-wp43-host-owned-apply-ux-intake-evidence",
      contractVersion: "0.1.0-draft",
      hostSurfaces: [
        {
          checkedApplyWriteEnabled: false,
          deferredGateVisible: true,
          hostEditorApiCalled: false,
          id: "vscode",
          label: "VS Code Extension",
          providerNetworkExecuted: false,
          providerReviewLinkageVisible: true,
          sourcesContentPolicy: "none",
          status: "surface-contract-ready",
          surface: "review-action-panel",
          targetCommandsExecutedByHia: false,
          targetOwnerEvidenceVisible: true,
          targetRepositoryMutationAllowed: false,
          uxRequirementRefs: ["host-owned-apply-ux", "provider-review-linkage"],
          workspaceWriteAllowed: false
        }
      ],
      providerReviewDisplayRules: [
        {
          id: "provider-state",
          status: "ready-display-rule"
        }
      ],
      status: "ready-for-wp43-host-surface-contract",
      summary: {
        actualRuntimeCaptureExecutedCount: 0,
        checkedApplyTriggeredCount: 0,
        checkedApplyWriteEnabled: false,
        directEditObjectCount: 0,
        hostEditorApiCallCount: 0,
        hostSurfaceCount: 1,
        providerNetworkExecutedCount: 0,
        providerOutputReviewOnly: true,
        providerReviewDisplayRuleCount: 1,
        readyHostSurfaceCount: 1,
        readyUxRequirementCount: 2,
        sourceBodyIncludedInEvidence: false,
        sourcesContentPolicy: "none",
        targetCommandExecutedByHiaCount: 0,
        targetOwnerActionRequired: true,
        targetOwnerDisplayRuleCount: 1,
        targetOwnerExecutionClaimed: false,
        targetRepositoryMutationCount: 0,
        uxRequirementCount: 2,
        workspaceWriteAllowedCount: 0
      },
      targetOwnerDisplayRules: [
        {
          id: "target-owner-action-required",
          status: "ready-display-rule"
        }
      ],
      uxRequirements: [
        {
          id: "host-owned-apply-ux",
          status: "ready-requirement"
        },
        {
          id: "provider-review-linkage",
          status: "ready-requirement"
        }
      ]
    };
    const choices = createHiaHostApplyUxSurfaceChoices(evidence);
    const report = createHiaHostApplyUxIntakeReport(evidence, choices[0]?.surface);

    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      label: "VS Code Extension",
      description: "surface-contract-ready; 写入禁用 / apply write disabled"
    });
    expect(choices[0]?.detail).toContain("requirements:2");
    expect(report).toContain("Evidence / 证据: hia-wp43-host-owned-apply-ux-intake-evidence@0.1.0-draft");
    expect(report).toContain("Surface / 宿主界面: VS Code Extension");
    expect(report).toContain("Provider review-only / Provider 仅审查: yes");
    expect(report).toContain("Target-owner action required / 需要 target-owner 操作: yes");
    expect(report).toContain("Checked apply write / checked apply 写入: disabled");
    expect(report).toContain("Workspace write / 工作区写入: disabled");
    expect(report).toContain("Provider network / Provider 网络访问: disabled");
    expect(report).toContain("Source bodies / 源码正文: 未显示在 VS Code host apply UX intake 中。");
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
