import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateHiaDocumentDetailed } from "@hia-doc/core";
import {
  JSDOC_ADAPTER_CORE_BRIDGE_VERSION,
  JSDOC_ADAPTER_METADATA_SCHEMA_VERSION,
  JSDOC_ADAPTER_NAME,
  JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
  convertJSDocIntegrationToHiaDocument,
  convertJSDocIntegrationToHiaDocumentDetailed,
  fromJSDocIntegration
} from "./index.js";

async function readIntegrationFixture(name = "jsdoc-integration.basic.json") {
  const fixturePath = new URL(`../../../fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
}

function findDuplicateIds(ids: string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

describe("@hia-doc/parser-jsdoc", () => {
  it("converts JSDoc integration JSON into a valid HIA document", async () => {
    const integration = await readIntegrationFixture();
    const document = convertJSDocIntegrationToHiaDocument(integration, {
      documentId: "fixture.jsdoc",
      title: "JSDoc Bridge Fixture"
    });
    const result = validateHiaDocumentDetailed(document);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(document.defaultLocale).toBe("zh-CN");
    expect(document.locales).toEqual(["zh-CN", "en"]);
    expect(document.nodes[0]?.symbolIds).toEqual(["jsdoc:function:greet", "jsdoc:function:normalizeName"]);
    expect(document.symbols).toHaveLength(2);
    expect(document.symbols[0]).toMatchObject({
      id: "jsdoc:function:greet",
      name: "greet",
      kind: "function",
      summary: "问候一个用户。"
    });
    expect(document.symbols[0]?.i18n?.model).toBe("hia-text-i18n");
    expect(document.symbols[0]?.i18n?.fields.description?.key).toBe("greet.description");
    expect(document.symbols[0]?.i18n?.fields.description?.path).toBe("api.greet");
    expect(document.symbols[0]?.source?.model).toBe("hia-source");
    expect(document.symbols[0]?.source?.modelVersion).toBe("0.2.0");
    expect(document.symbols[0]?.source?.definedIn?.relativePath).toBe("examples/basic/src/greet.js");
    expect(document.symbols[0]?.source?.references?.[0]?.fragment).not.toHaveProperty("filePath");
    expect(document.symbols[0]?.source?.references?.[0]?.fragment).toMatchObject({
      confidence: "high",
      rangeSource: "manual"
    });
  });

  it("exposes a compact detailed result and alias", async () => {
    const integration = await readIntegrationFixture();
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration);
    const aliasDocument = fromJSDocIntegration(integration);

    expect(result.diagnostics).toEqual([]);
    expect(result.document.symbols[1]?.summary).toBe("标准化用户名称。");
    expect(aliasDocument.symbols[0]?.id).toBe("jsdoc:function:greet");
  });

  it("keeps JSDoc integration compatibility fixtures inside the core schema baseline", async () => {
    for (const fixtureName of ["jsdoc-integration.basic.json", "jsdoc-integration.compat.json", "jsdoc-integration.real-basic.json"]) {
      const integration = await readIntegrationFixture(fixtureName);
      const result = convertJSDocIntegrationToHiaDocumentDetailed(integration, {
        documentId: `fixture.${fixtureName}`,
        title: fixtureName
      });
      const validation = validateHiaDocumentDetailed(result.document);

      expect(validation.valid, fixtureName).toBe(true);
      expect(validation.diagnostics.filter((item) => item.severity === "error"), fixtureName).toEqual([]);
    }
  });

  it("converts real JPHS output into a valid, deduplicated HIA document", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.real-basic.json");
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration, {
      documentId: "fixture.jsdoc.real-basic",
      title: "Real JPHS Basic"
    });
    const validation = validateHiaDocumentDetailed(result.document);
    const symbolIds = result.document.symbols.map((symbol) => symbol.id);
    const serialized = JSON.stringify(result.document);

    expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    expect(validation.valid).toBe(true);
    expect(validation.diagnostics).toEqual([]);
    expect(symbolIds).toEqual(["jsdoc:function:greet", "jsdoc:function:normalizeName"]);
    expect(findDuplicateIds(symbolIds)).toEqual([]);
    expect(result.document.symbols.every((symbol) => symbol.summary && symbol.summary.length > 0)).toBe(true);
    expect(result.document.symbols[0]?.source?.definedIn?.link?.openMode).toBe("same-tab");
    expect(result.document.symbols[0]?.source?.primaryBlock?.link?.openMode).toBe("same-tab");
    expect(serialized).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("\\\\");
    expect(serialized).not.toContain("package:undefined");
  });

  it("preserves adapter metadata and sanitizes unsafe metadata paths", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.compat.json");
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration);
    const metadata = result.document.metadata as Record<string, unknown>;
    const integrationMetadata = metadata.integration as Record<string, unknown>;
    const parserBoundary = integrationMetadata.parserBoundary as Record<string, unknown>;
    const localizationResources = integrationMetadata.localizationResources as Record<string, unknown>[];
    const symbolMetadata = result.document.symbols[0]?.metadata as Record<string, unknown>;
    const jsdocMetadata = symbolMetadata.jsdoc as Record<string, unknown>;
    const jsdocMeta = jsdocMetadata.meta as Record<string, unknown>;
    const warning = result.document.symbols[0]?.diagnostics?.[0];

    expect(metadata).toMatchObject({
      adapter: JSDOC_ADAPTER_NAME,
      adapterBridgeVersion: JSDOC_ADAPTER_CORE_BRIDGE_VERSION,
      metadataSchemaVersion: JSDOC_ADAPTER_METADATA_SCHEMA_VERSION,
      source: "jsdoc"
    });
    expect(integrationMetadata.contractVersion).toBe(JSDOC_HIA_INTEGRATION_CONTRACT_VERSION);
    expect(parserBoundary.safeRelative).toBe("examples/compat");
    expect(parserBoundary).not.toHaveProperty("workspaceRoot");
    expect(parserBoundary).not.toHaveProperty("sourceFilePath");
    expect(localizationResources[0]).toMatchObject({
      path: "examples/compat/i18n/docs.hia-i18n.json",
      localeCount: 2
    });
    expect(localizationResources[0]).not.toHaveProperty("sourceFilePath");
    expect(symbolMetadata).toMatchObject({
      adapter: JSDOC_ADAPTER_NAME,
      metadataSchemaVersion: JSDOC_ADAPTER_METADATA_SCHEMA_VERSION
    });
    expect(jsdocMetadata.docletId).toBe("compatExample");
    expect(jsdocMetadata).not.toHaveProperty("filePath");
    expect(jsdocMeta.relativePath).toBe("examples/compat/src/compat.js");
    expect(jsdocMeta).not.toHaveProperty("workspaceRoot");
    expect(warning?.data).toMatchObject({
      docletId: "compatExample",
      safeRelativePath: "examples/compat/src/compat.js",
      nested: {
        note: "kept"
      }
    });
    expect(warning?.data).not.toHaveProperty("workspaceRoot");
    expect(warning?.data).not.toHaveProperty("filePath");
    expect(JSON.stringify(result.document)).not.toContain("/private/");
  });

  it("warns when a fixture uses an unsupported JSDoc integration contract version", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.compat.json") as Record<string, unknown>;
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      ...integration,
      contractVersion: "9.0.0"
    });

    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "HIA_JSDOC_CONTRACT_VERSION_UNSUPPORTED",
      data: {
        actualVersion: "9.0.0",
        expectedVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION
      },
      severity: "warning",
      targetPath: "contractVersion"
    }));
  });

  it("maps JPHS hint diagnostics to core info diagnostics and sanitizes diagnostic data", () => {
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: "hia-jsdoc-integration",
      contractVersion: "0.1.0",
      ir: {
        version: "0.1.0",
        source: "jsdoc",
        nodes: [
          {
            id: "jsdoc:function:hinted",
            kind: "function",
            name: "hinted",
            summary: "Has a hint diagnostic.",
            diagnostics: [
              {
                code: "HIA_JSDOC_HINT",
                message: "Adapter hint.",
                severity: "hint",
                data: {
                  filePath: "C:\\Users\\example\\project\\src\\hinted.js",
                  safeRelativePath: "src/hinted.js"
                }
              }
            ]
          }
        ]
      }
    });
    const diagnostic = result.document.symbols[0]?.diagnostics?.[0];

    expect(diagnostic).toMatchObject({
      code: "HIA_JSDOC_HINT",
      severity: "info",
      data: {
        safeRelativePath: "src/hinted.js"
      }
    });
    expect(diagnostic?.data).not.toHaveProperty("filePath");
  });

  it("does not leak local absolute paths into converted core IR", async () => {
    for (const fixtureName of ["jsdoc-integration.basic.json", "jsdoc-integration.real-basic.json"]) {
      const integration = await readIntegrationFixture(fixtureName);
      const document = convertJSDocIntegrationToHiaDocument(integration);

      expect(JSON.stringify(document), fixtureName).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
      expect(JSON.stringify(document), fixtureName).not.toContain("/Users/");
      expect(JSON.stringify(document), fixtureName).not.toContain("\\\\");
    }
  });
});
