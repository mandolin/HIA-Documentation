import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { convertJSDocIntegrationToHiaDocument } from "@hia-doc/parser-jsdoc";
import { analyzeHiaDocument, createHiaResourceIndex } from "@hia-doc/lsp";

describe("LSP diagnostics over adapter input", () => {
  it("diagnoses a JSDoc integration fixture after adapter conversion", async () => {
    const fixturePath = new URL("../fixtures/jsdoc-integration.basic.json", import.meta.url);
    const integration = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
    const document = convertJSDocIntegrationToHiaDocument(integration, {
      documentId: "fixture.jsdoc",
      title: "JSDoc Bridge Fixture"
    });

    expect(analyzeHiaDocument(document)).toEqual([]);
  });

  it("indexes real JPHS integration output after adapter conversion", async () => {
    const fixturePath = new URL("../fixtures/jsdoc-integration.real-basic.json", import.meta.url);
    const integration = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
    const document = convertJSDocIntegrationToHiaDocument(integration, {
      documentId: "fixture.jsdoc.real-basic",
      title: "Real JPHS Basic"
    });
    const diagnostics = analyzeHiaDocument(document);
    const index = createHiaResourceIndex(document);

    expect(diagnostics.map((item) => item.code)).not.toContain("HIA_FIELD_INVALID");
    expect(diagnostics.map((item) => item.code)).not.toContain("HIA_SYMBOL_INVALID");
    expect(diagnostics.filter((item) => item.code === "HIA_LSP_I18N_LOCALE_MISSING")).toHaveLength(5);
    expect(index.i18nKeys).toHaveLength(5);
    expect(index.missingLocales).toHaveLength(5);
    expect(index.sourceReferences).toHaveLength(1);
    expect(index.sourceFragments).toHaveLength(1);
    expect(index.sourceBlocks).toHaveLength(3);
  });
});
