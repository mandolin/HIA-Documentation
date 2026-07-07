import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_BUILD_DOCS_COMMAND,
  HIA_AUTHORING_LOCATIONS_REQUEST,
  HIA_IDE_CAPABILITIES_REQUEST,
  HIA_LANGUAGE_ID,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OPEN_RELATED_LOCATION_COMMAND,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaPreviewReport,
  createHiaValidationReport,
  getHiaPreviewStaleReason,
  normalizeHiaCommandSettings,
  resolveConfiguredManifestPath,
  resolveConfiguredPreviewPath,
  resolveDefaultPreviewPath,
  resolveHiaPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule
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
    expect(HIA_VALIDATE_WORKSPACE_COMMAND).toBe("hia.validateWorkspace");
    expect(HIA_OPEN_RELATED_LOCATION_COMMAND).toBe("hia.openRelatedLocation");
    expect(HIA_RESOURCE_INDEX_REQUEST).toBe("hia/documentResourceIndex");
    expect(HIA_IDE_CAPABILITIES_REQUEST).toBe("hia/ideCapabilities");
    expect(HIA_AUTHORING_LOCATIONS_REQUEST).toBe("hia/documentAuthoringLocations");
    expect(createHiaDocumentSelector()).toEqual([
      {
        scheme: "file",
        language: "hia"
      },
      {
        scheme: "file",
        pattern: "**/*.hia.json"
      }
    ]);
    expect(createHiaFileWatcherPattern()).toBe("**/*.hia.json");
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
        ]
      },
      authoringLocations: {
        locations: [
          { kind: "core-document" },
          { kind: "diagnostic-target", unavailableReason: "source-fragment-missing" }
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
      "Unavailable reasons: source-fragment-missing=2",
      "Diagnostic codes: HIA_LSP_I18N_LOCALE_MISSING=1, HIA_LSP_SOURCE_REFERENCE_INVALID=1"
    ]);
  });
});
