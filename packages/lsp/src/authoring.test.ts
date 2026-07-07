import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createHiaDocument } from "@hia-doc/core";
import {
  HIA_LSP_AUTHORING_LOCATIONS_REQUEST,
  HIA_LSP_IDE_CAPABILITIES_REQUEST,
  HiaIdeCapabilityId
} from "./authoring.js";
import {
  HiaLspDiagnosticCode
} from "./diagnostics.js";
import { createHiaLspService } from "./service.js";

describe("@hia-doc/lsp authoring", () => {
  it("reports implemented and planned IDE capabilities", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/i18n-resource.hia.json";

    service.openDocument(uri, readFixture("i18n-resource.hia.json"), "hia", 1);

    const result = service.getIdeCapabilities(uri);
    const byId = new Map(result.capabilities.map((item) => [item.id, item]));

    expect(HIA_LSP_IDE_CAPABILITIES_REQUEST).toBe("hia/ideCapabilities");
    expect(byId.get(HiaIdeCapabilityId.ResourceIndex)?.status).toBe("available");
    expect(byId.get(HiaIdeCapabilityId.CompletionI18n)?.status).toBe("available");
    expect(byId.get(HiaIdeCapabilityId.CompletionSource)?.status).toBe("partial");
    expect(byId.get(HiaIdeCapabilityId.CodeActionResourceStub)?.status).toBe("planned");
  });

  it("creates i18n completion items from core resource data", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/i18n-resource.hia.json";

    service.openDocument(uri, readFixture("i18n-resource.hia.json"), "hia", 1);

    const labels = service.getCompletionItems(uri).map((item) => item.label);

    expect(labels).toContain("zh-CN");
    expect(labels).toContain("en");
    expect(labels).toContain("profile.render.description");
    expect(labels).toContain("profile.render.params.profile");
    expect(labels).toContain("i18n/profile.hia-i18n.json");
  });

  it("creates source completion and definition locations from source references", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/source-reference.hia.json";

    service.openDocument(uri, readFixture("source-reference.hia.json"), "hia", 1);

    const completions = service.getCompletionItems(uri);
    const definitions = service.getDefinitionLocations(uri);

    expect(completions.map((item) => item.label)).toContain("NORMALIZE_SERIES");
    expect(definitions).toContainEqual(expect.objectContaining({
      uri: "file:///workspace/src/chart/render-chart.js",
      range: expect.objectContaining({
        start: {
          line: 11,
          character: 0
        }
      })
    }));
  });

  it("creates document hover and JSON folding ranges", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/basic.hia.json";

    service.openDocument(uri, readFixture("basic.hia.json"), "hia", 1);

    const hover = service.getHover(uri);
    const foldingRanges = service.getFoldingRanges(uri);

    expect(hover?.contents).toMatchObject({
      kind: "markdown",
      value: expect.stringContaining("HIA Basic Fixture")
    });
    expect(foldingRanges.length).toBeGreaterThan(0);
    expect(foldingRanges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        startLine: 0
      })
    ]));
  });

  it("returns unsupported capabilities for unopened documents", () => {
    const service = createInitializedService();
    const result = service.getIdeCapabilities("file:///workspace/missing.hia.json");
    const resourceIndex = result.capabilities.find((item) => item.id === HiaIdeCapabilityId.ResourceIndex);

    expect(resourceIndex).toMatchObject({
      status: "unsupported",
      reason: "document-not-open"
    });
    expect(service.getCompletionItems("file:///workspace/missing.hia.json")).toEqual([]);
    expect(service.getHover("file:///workspace/missing.hia.json")).toBeNull();
  });

  it("creates stable authoring locations for i18n resources and source fragments", () => {
    const service = createInitializedService();
    const i18nUri = "file:///workspace/fixtures/i18n-resource.hia.json";
    const sourceUri = "file:///workspace/fixtures/source-reference.hia.json";

    service.openDocument(i18nUri, readFixture("i18n-resource.hia.json"), "hia", 1);
    service.openDocument(sourceUri, readFixture("source-reference.hia.json"), "hia", 1);

    const i18nLocations = service.getAuthoringLocations(i18nUri);
    const sourceLocations = service.getAuthoringLocations(sourceUri).locations;

    expect(HIA_LSP_AUTHORING_LOCATIONS_REQUEST).toBe("hia/documentAuthoringLocations");
    expect(i18nLocations).toMatchObject({
      uri: i18nUri,
      locations: expect.arrayContaining([
        expect.objectContaining({
          kind: "i18n-field",
          key: "profile.render.description",
          targetPath: "symbols[function:renderProfile].i18n.fields[description]"
        }),
        expect.objectContaining({
          kind: "i18n-resource",
          fieldPath: "description",
          resourcePath: "i18n/profile.hia-i18n.json",
          resourcePointer: "/en/profile.render.description",
          uri: "file:///workspace/i18n/profile.hia-i18n.json"
        })
      ])
    });
    expect(sourceLocations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "source-fragment",
        relativePath: "src/chart/render-chart.js",
        sourceTargetId: "NORMALIZE_SERIES",
        uri: "file:///workspace/src/chart/render-chart.js"
      }),
      expect.objectContaining({
        kind: "diagnostic-target",
        sourceTargetId: "MISSING_FRAGMENT",
        unavailableReason: "source-fragment-missing"
      })
    ]));
  });

  it("enhances resource diagnostics with related locations and unavailable reasons", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/bad-authoring.hia.json";
    const document = createHiaDocument({
      id: "fixture.lsp.bad-authoring",
      title: "Bad Authoring Fixture",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"],
      symbols: [
        {
          id: "function:badOne",
          kind: "function",
          name: "badOne",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.2.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                key: "duplicate.key",
                defaultLocale: "zh-CN",
                localizedText: {
                  "zh-CN": "坏例子。"
                },
                missingLocales: ["en"]
              }
            }
          },
          source: {
            model: "hia-source",
            modelVersion: "0.2.0",
            mode: "all",
            references: [
              {
                kind: "source-reference",
                referenceKind: "coderef",
                targetId: "MISSING",
                resolved: false
              }
            ]
          }
        },
        {
          id: "function:badTwo",
          kind: "function",
          name: "badTwo",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.2.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                key: "duplicate.key",
                defaultLocale: "zh-CN",
                localizedText: {
                  "zh-CN": "第二个坏例子。",
                  en: "Second bad sample."
                }
              }
            }
          }
        }
      ]
    });

    service.openDocument(uri, JSON.stringify(document), "hia", 1);

    const diagnostics = service.validateManagedDocument(uri);
    const missingLocale = diagnostics.find((item) => item.code === HiaLspDiagnosticCode.I18nLocaleMissing);
    const duplicateKey = diagnostics.find((item) => item.code === HiaLspDiagnosticCode.I18nKeyDuplicate);
    const sourceReference = diagnostics.find((item) => item.code === HiaLspDiagnosticCode.SourceReferenceInvalid);

    expect(missingLocale?.data).toMatchObject({
      capability: HiaIdeCapabilityId.DiagnosticsResource,
      unavailableReason: "resource-file-unknown",
      relatedLocations: [
        expect.objectContaining({
          kind: "i18n-field",
          targetPath: "symbols[function:badOne].i18n.fields[description]"
        })
      ]
    });
    expect(duplicateKey?.relatedInformation).toEqual(expect.arrayContaining([
      expect.objectContaining({
        message: "HIA i18n field description"
      })
    ]));
    expect(duplicateKey?.data).toMatchObject({
      duplicateOf: {
        symbolId: "function:badOne",
        fieldPath: "description"
      }
    });
    expect(sourceReference?.data).toMatchObject({
      unavailableReason: "source-fragment-missing",
      relatedLocations: [
        expect.objectContaining({
          kind: "diagnostic-target",
          sourceTargetId: "MISSING"
        })
      ]
    });
  });

  it("keeps unsafe resource paths diagnosable without producing file definitions", () => {
    const service = createInitializedService();
    const uri = "file:///workspace/fixtures/unsafe-resource.hia.json";
    const document = JSON.parse(readFixture("i18n-resource.hia.json")) as {
      symbols: Array<{
        i18n?: {
          resources?: Array<{
            path: string;
          }>;
        };
      }>;
    };

    document.symbols[0]?.i18n?.resources?.splice(0, 1, {
      path: "../outside/profile.hia-i18n.json"
    });
    service.openDocument(uri, JSON.stringify(document), "hia", 1);

    const locations = service.getAuthoringLocations(uri).locations;
    const definitions = service.getDefinitionLocations(uri);
    const diagnostics = service.validateManagedDocument(uri);

    expect(locations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "i18n-resource",
        resourcePath: "../outside/profile.hia-i18n.json",
        unavailableReason: "unsafe-relative-path"
      })
    ]));
    expect(definitions.some((location) => location.uri.includes("outside"))).toBe(false);
    expect(diagnostics.find((item) => item.code === "HIA_I18N_RESOURCE_PATH_TRAVERSAL")?.data).toMatchObject({
      capability: HiaIdeCapabilityId.DiagnosticsResource,
      unavailableReason: "unsafe-relative-path"
    });
  });
});

function createInitializedService() {
  const service = createHiaLspService();
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

function readFixture(name: string): string {
  return readFileSync(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8");
}
