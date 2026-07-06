import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateHiaDocumentDetailed } from "@hia-doc/core";
import {
  convertJSDocIntegrationToHiaDocument,
  convertJSDocIntegrationToHiaDocumentDetailed,
  fromJSDocIntegration
} from "./index.js";

async function readIntegrationFixture() {
  const fixturePath = new URL("../../../fixtures/jsdoc-integration.basic.json", import.meta.url);
  return JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
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

  it("does not leak local absolute paths into converted core IR", async () => {
    const integration = await readIntegrationFixture();
    const document = convertJSDocIntegrationToHiaDocument(integration);

    expect(JSON.stringify(document)).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
    expect(JSON.stringify(document)).not.toContain("/Users/");
    expect(JSON.stringify(document)).not.toContain("\\\\");
  });
});
