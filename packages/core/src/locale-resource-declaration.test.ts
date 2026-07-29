import { describe, expect, it } from "vitest";
import {
  createDocumentationLocaleResourceDiscoverySidecar,
  discoverDocumentationLocaleResources,
  validateDocumentationLocaleResourceDeclaration,
  validateDocumentationLocaleResourceDiscovery,
  validateDocumentationLocaleResourceDiscoverySidecar,
  type DocumentationLocaleResourceDeclaration
} from "./index.js";

/**
 * Build a controlled declaration fixture whose locator is deliberately confined to test-only input.
 *
 * 中文：构造受控 declaration fixture；其 locator 被刻意限制在 test-only input 中。
 */
function createDeclarationFixture(): DocumentationLocaleResourceDeclaration {
  return {
    catalog: [
      { resourceId: "docs.api.user", locator: "docs/user.dlr" },
      { resourceId: "docs.api.account", locator: "docs/account.dlr" }
    ],
    contract: "documentation-locale-resource-declaration",
    contractVersion: "0.1.0-draft",
    declarationId: "dlr-declaration:api-user",
    kind: "controlled-declaration",
    profile: "documentation-at-tag-locale-resource-profile",
    profileVersion: "0.1.0-draft",
    references: [
      { id: "document-default", src: "docs/user.dlr" },
      { id: "field:summary:0", resource: "docs.api.account" }
    ],
    resourceRootId: "docs.resources",
    sourceDocumentId: "doc.api.user",
    visibility: "controlled"
  };
}

describe("documentation locale-resource declaration", () => {
  it("matches controlled src/resource selections deterministically without reading a resource", () => {
    // <lang zh-CN>fixture 只提供 in-memory catalog；test 不创建、读取或解析任何 .dlr file。</lang>
    const declaration = createDeclarationFixture();
    const result = discoverDocumentationLocaleResources(declaration, {
      approvedProfiles: [{ profile: declaration.profile, profileVersion: declaration.profileVersion }],
      discoveryId: "dlr-discovery:api-user"
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.discovery).toMatchObject({
      bindings: [
        { referenceId: "document-default", resourceId: "docs.api.user", selectionKind: "catalog-src" },
        { referenceId: "field:summary:0", resourceId: "docs.api.account", selectionKind: "catalog-resource" }
      ],
      resourceIds: ["docs.api.account", "docs.api.user"],
      visibility: "public"
    });
    expect(JSON.stringify(result.discovery)).not.toContain("docs/user.dlr");
    expect(JSON.stringify(result.discovery)).not.toContain("docs/account.dlr");
  });

  it("fails closed for undeclared selections and duplicate catalog identities", () => {
    const declaration = createDeclarationFixture();
    declaration.references[0] = { id: "document-default", src: "docs/missing.dlr" };
    declaration.catalog.push({ resourceId: "docs.api.user", locator: "docs/duplicate.dlr" });

    const validation = validateDocumentationLocaleResourceDeclaration(declaration);
    expect(validation.map((diagnostic) => diagnostic.code)).toContain("DLR_DECLARATION_CATALOG_DUPLICATE");
    const result = discoverDocumentationLocaleResources(declaration, {
      approvedProfiles: [{ profile: declaration.profile, profileVersion: declaration.profileVersion }],
      discoveryId: "dlr-discovery:invalid"
    });
    expect(result.discovery).toBeUndefined();
    expect(JSON.stringify(result.diagnostics)).not.toContain("docs/missing.dlr");
  });

  it("requires an exact approved profile/version pair before discovery", () => {
    const declaration = createDeclarationFixture();
    const result = discoverDocumentationLocaleResources(declaration, {
      approvedProfiles: [{ profile: declaration.profile, profileVersion: "0.1.1-draft" }],
      discoveryId: "dlr-discovery:profile-mismatch"
    });

    expect(result.discovery).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_DECLARATION_PROFILE_UNSUPPORTED");
  });

  it("creates a public sidecar and rejects private locator, path, or text injection", () => {
    const declaration = createDeclarationFixture();
    const result = discoverDocumentationLocaleResources(declaration, {
      approvedProfiles: [{ profile: declaration.profile, profileVersion: declaration.profileVersion }],
      discoveryId: "dlr-discovery:sidecar"
    });
    expect(result.discovery).toBeDefined();
    const sidecar = createDocumentationLocaleResourceDiscoverySidecar("sidecar:dlr:api-user", result.discovery!);

    expect(validateDocumentationLocaleResourceDiscovery(sidecar)).toContainEqual(expect.objectContaining({ code: "DLR_DECLARATION_INVALID" }));
    expect(validateDocumentationLocaleResourceDiscoverySidecar(sidecar)).toEqual([]);
    const unsafe = { ...sidecar, locator: "private/docs/user.dlr", text: "private" };
    const diagnostics = validateDocumentationLocaleResourceDiscoverySidecar(unsafe);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_DISCOVERY_PRIVACY_VIOLATION");
    expect(JSON.stringify(diagnostics)).not.toContain("private/docs/user.dlr");
  });
});
