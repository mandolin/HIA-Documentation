import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { convertJSDocIntegrationToHiaDocument } from "@hia-doc/parser-jsdoc";
import { analyzeHiaDocument } from "@hia-doc/lsp";

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
});
