import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
  DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
  createDocumentationLocaleResourceSourceDeclaration
} from "./index.js";

describe("generic doc-line DLR source declaration", () => {
  it("binds the frozen at-tag declaration grammar to an in-memory controlled catalog", () => {
    // <lang zh-CN>source text 仅是 synthetic input；该 helper 不接收 filesystem root，也不读取 resource。</lang>
    const result = createDocumentationLocaleResourceSourceDeclaration({
      catalog: [{ resourceId: "docs.api.user", locator: "docs/user.dlr" }],
      declarationId: "dlr-declaration:at-tag",
      discoveryId: "dlr-discovery:at-tag",
      profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
      resourceRootId: "docs.resources",
      sourceDocumentId: "doc.at-tag.user",
      sourceText: [
        "@langSrc docs/user.dlr",
        "<lang key=\"user.greet.description\" field=\"description\"/>"
      ].join("\n")
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.discovery).toMatchObject({
      resourceIds: ["docs.api.user"],
      bindings: [{ referenceId: "document-default", selectionKind: "catalog-src" }]
    });
    expect(JSON.stringify(result.discovery)).not.toContain("docs/user.dlr");
    expect(JSON.stringify(result.extraction.documentDefault)).toContain("docs/user.dlr");
  });

  it("binds XML resource identity declarations and refuses undeclared literal src values", () => {
    const xml = createDocumentationLocaleResourceSourceDeclaration({
      catalog: [{ resourceId: "docs.api.user", locator: "docs/user.dlr" }],
      declarationId: "dlr-declaration:xml",
      discoveryId: "dlr-discovery:xml",
      profile: DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
      resourceRootId: "docs.resources",
      sourceDocumentId: "doc.xml.user",
      sourceText: "<langResource resource=\"docs.api.user\"/>"
    });
    expect(xml.discovery?.bindings).toMatchObject([{ selectionKind: "catalog-resource", resourceId: "docs.api.user" }]);

    const unknown = createDocumentationLocaleResourceSourceDeclaration({
      catalog: [{ resourceId: "docs.api.user", locator: "docs/user.dlr" }],
      declarationId: "dlr-declaration:unknown",
      discoveryId: "dlr-discovery:unknown",
      profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
      resourceRootId: "docs.resources",
      sourceDocumentId: "doc.at-tag.unknown",
      sourceText: "@langSrc docs/missing.dlr"
    });
    expect(unknown.discovery).toBeDefined();
    expect(unknown.discovery?.bindings).toEqual([]);
    expect(unknown.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_DISCOVERY_LOCATOR_UNDECLARED");
    expect(JSON.stringify(unknown.diagnostics)).not.toContain("docs/missing.dlr");
  });
});
