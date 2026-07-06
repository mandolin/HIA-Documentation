import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateHiaDocumentDetailed } from "@hia-doc/core";
import { convertJSDocIntegrationToHiaDocument } from "@hia-doc/parser-jsdoc";
import { renderHtmlDocument } from "@hia-doc/renderer-html";

describe("JSDoc bridge e2e", () => {
  it("renders a JSDoc integration fixture through core and renderer", async () => {
    const fixturePath = new URL("../fixtures/jsdoc-integration.basic.json", import.meta.url);
    const integration = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
    const document = convertJSDocIntegrationToHiaDocument(integration, {
      documentId: "fixture.jsdoc",
      title: "JSDoc Bridge Fixture"
    });
    const validation = validateHiaDocumentDetailed(document);
    const rendered = renderHtmlDocument(document, {
      initialLocale: "zh-CN"
    });
    const html = rendered.files.find((file) => file.path === "index.html")?.contents ?? "";

    expect(validation.valid).toBe(true);
    expect(rendered.manifest.documentId).toBe("fixture.jsdoc");
    expect(html).toContain("问候一个用户。");
    expect(html).toContain("examples/basic/src/greet.js");
    expect(JSON.stringify(rendered)).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
  });
});
