import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_DOCUMENT_SCHEMA,
  HIA_DOCUMENT_SCHEMA_VERSION,
  HIA_DIAGNOSTIC_CODE_REGISTRY,
  HIA_I18N_TEXT_SOURCE_PRIORITY,
  HIA_PROTOCOL_ENVELOPE_VERSION,
  HIA_SOURCE_CONFIDENCE_LEVELS,
  HIA_SOURCE_MODEL_VERSION,
  HIA_SOURCE_RANGE_SOURCES,
  HIA_TEXT_I18N_MODEL_VERSION,
  buildLocaleFallbackChain,
  createBasicFixtureDocument,
  createHiaDiagnostic,
  createHiaDocument,
  createHiaProtocolEnvelope,
  getCoreRuntimeInfo,
  isKnownHiaDiagnosticCode,
  resolveI18nFieldText,
  validateHiaDocument,
  validateHiaDocumentDetailed
} from "./index.js";

describe("@hia-doc/core", () => {
  it("creates a minimal document with the current contract version", () => {
    const document = createHiaDocument({
      id: "sample.api",
      title: "Sample API",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"],
      symbols: [{ id: "sample.render", kind: "function", name: "render" }]
    });

    expect(document.schemaVersion).toBe(HIA_CORE_CONTRACT_VERSION);
    expect(document.nodes).toEqual([]);
    expect(document.symbols).toHaveLength(1);
    expect(validateHiaDocument(document)).toEqual([]);
  });

  it("publishes a schema draft aligned with the current contract version", () => {
    expect(HIA_DOCUMENT_SCHEMA_VERSION).toBe(HIA_CORE_CONTRACT_VERSION);
    expect(HIA_DOCUMENT_SCHEMA.properties.schemaVersion).toEqual({
      const: HIA_CORE_CONTRACT_VERSION
    });
    expect(HIA_DOCUMENT_SCHEMA.$defs.diagnostic.properties).toHaveProperty("data");
    expect(HIA_DOCUMENT_SCHEMA.$defs.symbol.required).toEqual(["id", "name", "kind"]);
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourceMetadata.required).toEqual(["model", "modelVersion", "mode"]);
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourceMetadata.properties.modelVersion).toEqual({
      const: HIA_SOURCE_MODEL_VERSION
    });
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourcePrimaryBlock.properties.rangeSource).toEqual({
      enum: [...HIA_SOURCE_RANGE_SOURCES]
    });
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourcePrimaryBlock.properties.confidence).toEqual({
      enum: [...HIA_SOURCE_CONFIDENCE_LEVELS]
    });
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourceFragment.required).toEqual([
      "kind",
      "id",
      "relativePath",
      "range",
      "content",
      "rangeSource",
      "confidence"
    ]);
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourcePreview.properties).toHaveProperty("range");
    expect(HIA_DOCUMENT_SCHEMA.$defs.i18nResource.properties).toHaveProperty("format");
    expect(HIA_DOCUMENT_SCHEMA.$defs.i18nField.properties).toHaveProperty("key");
    expect(HIA_DOCUMENT_SCHEMA.$defs.i18nField.properties).toHaveProperty("path");
    expect(HIA_DOCUMENT_SCHEMA.$defs.i18nModel.required).toEqual([
      "enabled",
      "model",
      "modelVersion",
      "defaultLocale",
      "locales",
      "fields"
    ]);
  });

  it("validates the shared basic fixture", () => {
    const document = createBasicFixtureDocument();
    const result = validateHiaDocumentDetailed(document);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(document.symbols[1]?.source?.definedIn?.relativePath).toBe("src/services/profile-service.js");
    expect(document.symbols[1]?.source?.modelVersion).toBe(HIA_SOURCE_MODEL_VERSION);
  });

  it("resolves field-level i18n text with fallback", () => {
    const document = createBasicFixtureDocument();
    const description = document.symbols[1]?.i18n?.fields.description;

    expect(HIA_I18N_TEXT_SOURCE_PRIORITY).toEqual([
      "inline-segment",
      "lang-block",
      "external-resource",
      "localized-text",
      "default-text"
    ]);
    expect(resolveI18nFieldText(description, "en")).toMatchObject({
      sourceKind: "localized-text",
      sourceLocale: "en",
      text: "Builds a user profile summary."
    });
    expect(resolveI18nFieldText(description, "en-US", { fallbackLocale: ["en", "zh-CN"] })).toMatchObject({
      resolvedLocale: "en",
      usedFallback: true,
      text: "Builds a user profile summary."
    });
    expect(buildLocaleFallbackChain("en-US", "zh-CN", ["en", "zh-CN"])).toEqual(["en-US", "en", "zh-CN"]);
  });

  it("reports model diagnostics", () => {
    const diagnostics = validateHiaDocument({
      schemaVersion: "0.2.0",
      id: "",
      title: "",
      defaultLocale: "zh-CN",
      locales: ["en"],
      nodes: [{}],
      symbols: [{ id: "bad", name: "Bad", kind: "function", source: { definedIn: { relativePath: "K:\\bad\\file.js", position: { line: 0 } } } }]
    });

    expect(diagnostics.map((item) => item.code)).toContain("HIA_FIELD_MISSING");
    expect(diagnostics.map((item) => item.code)).toContain("HIA_DEFAULT_LOCALE_MISSING");
    expect(diagnostics.map((item) => item.code)).toContain("HIA_SOURCE_ABSOLUTE_PATH");
    expect(diagnostics.map((item) => item.code)).toContain("HIA_SOURCE_POSITION_INVALID");
  });

  it("reports nested i18n, source and diagnostics boundaries", () => {
    const diagnostics = validateHiaDocument({
      schemaVersion: HIA_CORE_CONTRACT_VERSION,
      id: "fixture.boundary",
      title: "Boundary Fixture",
      defaultLocale: "en",
      locales: ["en"],
      nodes: [],
      symbols: [
        {
          id: "function:bad",
          name: "bad",
          kind: "function",
          i18n: {
            enabled: "yes",
            model: "legacy-i18n",
            modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
            defaultLocale: "en",
            locales: ["en"],
            resources: [
              {
                path: "../outside.json"
              }
            ],
            fields: {
              description: {
                fieldPath: "other",
                kind: "description",
                defaultLocale: "en",
                localizedText: {
                  en: "Bad fixture.",
                  "": 123
                },
                segments: [
                  {
                    kind: "lang-inline",
                    id: "",
                    fieldPath: "description",
                    raw: "<lang />",
                    localized: []
                  }
                ]
              }
            }
          },
          source: {
            model: "legacy-source",
            modelVersion: "0.1.0",
            mode: "all",
            primaryBlock: {
              kind: "primary-block",
              content: "bad",
              rangeSource: "unresolved",
              confidence: "high",
              relativePath: "../outside.js",
              range: {
                start: { line: 10, column: 1 },
                end: { line: 9, column: 1 }
              },
              preview: {
                enabled: "yes"
              }
            },
            references: [
              {
                kind: "source-reference",
                referenceKind: "coderef",
                targetId: "",
                resolved: "no"
              },
              {
                kind: "source-reference",
                referenceKind: "coderef",
                targetId: "MISSING_FRAGMENT",
                resolved: true
              }
            ]
          },
          diagnostics: [
            {
              code: "BAD",
              message: "Bad diagnostic.",
              severity: "fatal",
              data: []
            }
          ]
        }
      ]
    });
    const codes = diagnostics.map((item) => item.code);

    expect(codes).toContain("HIA_FIELD_INVALID");
    expect(codes).toContain("HIA_I18N_MODEL_UNSUPPORTED");
    expect(codes).toContain("HIA_I18N_RESOURCE_PATH_TRAVERSAL");
    expect(codes).toContain("HIA_I18N_FIELD_PATH_MISMATCH");
    expect(codes).toContain("HIA_I18N_LOCALIZED_TEXT_INVALID");
    expect(codes).toContain("HIA_SOURCE_MODEL_UNSUPPORTED");
    expect(codes).toContain("HIA_SOURCE_MODEL_VERSION_UNSUPPORTED");
    expect(codes).toContain("HIA_SOURCE_PATH_TRAVERSAL");
    expect(codes).toContain("HIA_SOURCE_RANGE_ORDER_INVALID");
    expect(codes).toContain("HIA_SOURCE_RANGE_CONFIDENCE_MISMATCH");
    expect(codes).toContain("HIA_SOURCE_REFERENCE_FRAGMENT_MISSING");
    expect(codes).toContain("HIA_DIAGNOSTIC_DATA_INVALID");
    expect(codes).toContain("HIA_DIAGNOSTIC_SEVERITY_INVALID");
  });

  it("exposes the diagnostic registry and protocol envelope helpers", () => {
    const diagnostic = createHiaDiagnostic(
      "HIA_CLI_LOCALE_NOT_DECLARED",
      "Locale is not declared.",
      "warning",
      {
        targetPath: "docs.locale",
        data: {
          locale: "en-US"
        }
      }
    );
    const envelope = createHiaProtocolEnvelope("diagnostics", [diagnostic], {
      diagnostics: [diagnostic],
      producer: "@hia-doc/core",
      requestId: "test-request"
    });

    expect(HIA_DIAGNOSTIC_CODE_REGISTRY.length).toBeGreaterThan(20);
    expect(isKnownHiaDiagnosticCode("HIA_CLI_LOCALE_NOT_DECLARED")).toBe(true);
    expect(isKnownHiaDiagnosticCode("HIA_UNKNOWN_CODE")).toBe(false);
    expect(diagnostic).toMatchObject({
      code: "HIA_CLI_LOCALE_NOT_DECLARED",
      targetPath: "docs.locale",
      path: "docs.locale",
      data: {
        locale: "en-US"
      }
    });
    expect(envelope).toMatchObject({
      schemaVersion: HIA_PROTOCOL_ENVELOPE_VERSION,
      kind: "diagnostics",
      producer: "@hia-doc/core",
      requestId: "test-request"
    });
  });

  it("exposes runtime package information", () => {
    expect(getCoreRuntimeInfo()).toEqual({
      packageName: "@hia-doc/core",
      contractVersion: HIA_CORE_CONTRACT_VERSION
    });
  });

  it("keeps the JSON fixture aligned with the validator", async () => {
    const fixturePath = new URL("../../../fixtures/basic.hia.json", import.meta.url);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;

    expect(validateHiaDocument(fixture)).toEqual([]);
  });

  it("keeps the minimal JSON fixture aligned with the validator", async () => {
    const fixturePath = new URL("../../../fixtures/core-minimal.hia.json", import.meta.url);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;

    expect(validateHiaDocument(fixture)).toEqual([]);
  });

  it("keeps the i18n resource fixture aligned with the validator", async () => {
    const fixturePath = new URL("../../../fixtures/i18n-resource.hia.json", import.meta.url);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;

    expect(validateHiaDocument(fixture)).toEqual([]);
  });

  it("keeps the source reference fixture aligned with the validator", async () => {
    const fixturePath = new URL("../../../fixtures/source-reference.hia.json", import.meta.url);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;

    expect(validateHiaDocument(fixture)).toEqual([]);
  });
});
