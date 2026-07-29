import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOURCE_FORMAT,
  DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION,
  DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA,
  buildDocumentationLocaleFallbackChain,
  canonicalizeDocumentationLocale,
  createDocumentationLocaleResolutionSidecar,
  parseDocumentationLocaleResource,
  resolveDocumentationLocaleResource,
  validateDocumentationLocaleResolutionSidecar,
  validateDocumentationLocaleResourceLocator,
  validateDocumentationLocaleResourceReference,
  type DocumentationLocaleResource
} from "./index.js";

/**
 * Build a canonical DLR fixture with deterministic locale coverage.
 *
 * 中文：构造具有确定性 locale coverage 的 canonical DLR fixture。
 */
function createFixtureResource(): DocumentationLocaleResource {
  return {
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
    defaultLocale: "zh-CN",
    entries: {
      "user.greet.description": {
        localizedText: {
          "zh-CN": "问候用户。",
          en: "Greets a user."
        }
      }
    },
    format: DOCUMENTATION_LOCALE_RESOURCE_FORMAT,
    formatVersion: DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION,
    kind: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
    locales: ["zh-CN", "en"],
    resourceId: "docs.api.user"
  };
}

describe("documentation-locale-resource contract", () => {
  it("exports independently versioned DLR and metadata-only sidecar schemas", () => {
    expect(DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA.properties.kind).toEqual({
      const: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT
    });
    expect(DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA.properties.format).toEqual({
      const: DOCUMENTATION_LOCALE_RESOURCE_FORMAT
    });
    expect(DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA.properties.privacy.properties.allowResolvedText).toEqual({
      const: false
    });
  });

  it("canonicalizes BCP 47 tags and keeps the legacy underscore bridge visible", () => {
    expect(canonicalizeDocumentationLocale("ZH-cn")).toEqual({ canonical: "zh-CN", usedLegacyUnderscore: false });
    expect(canonicalizeDocumentationLocale("zh_CN")).toEqual({ canonical: "zh-CN", usedLegacyUnderscore: true });
    expect(canonicalizeDocumentationLocale("not a locale")).toBeUndefined();
    expect(buildDocumentationLocaleFallbackChain("zh-Hans-CN", "en", ["zh-CN", "en"])).toEqual([
      "zh-Hans-CN",
      "zh-Hans",
      "zh",
      "zh-CN",
      "en"
    ]);
  });

  it("parses canonical JSON, normalizes legacy locale input, and detects repeated entry keys", () => {
    const valid = JSON.stringify({
      ...createFixtureResource(),
      defaultLocale: "zh_CN",
      locales: ["zh_CN", "en"],
      entries: {
        "user.greet.description": {
          localizedText: { "zh_CN": "问候用户。", en: "Greets a user." }
        }
      }
    });
    const parsed = parseDocumentationLocaleResource(valid);
    expect(parsed.resource?.defaultLocale).toBe("zh-CN");
    expect(parsed.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_LOCALE_INVALID");

    const duplicate = valid.replace("\"user.greet.description\":{", "\"user.greet.description\":{},\"user.greet.description\":{");
    expect(parseDocumentationLocaleResource(duplicate).diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_ENTRY_DUPLICATE");
  });

  it("rejects unsafe locator and ambiguous reference forms without returning the raw locator", () => {
    for (const locator of ["/etc/docs.dlr", "C:/docs.dlr", "//server/docs.dlr", "../docs.dlr", "https://example.test/docs.dlr", "docs\\en.dlr"]) {
      const diagnostics = validateDocumentationLocaleResourceLocator(locator);
      expect(diagnostics).not.toHaveLength(0);
      expect(JSON.stringify(diagnostics)).not.toContain(locator);
    }
    expect(validateDocumentationLocaleResourceReference({
      entryKey: "user.greet.description",
      resource: "docs.api.user",
      src: "docs/user.dlr"
    }).map((diagnostic) => diagnostic.code)).toContain("DLR_REFERENCE_AMBIGUOUS");
  });

  it("uses the frozen inline, direct-resource, and deterministic fallback priority", () => {
    const resource = createFixtureResource();
    const inline = resolveDocumentationLocaleResource(
      { entryKey: "user.greet.description" },
      {
        directResource: resource,
        inlineLocalizedText: { "en-US": "Inline greeting." },
        requestedLocale: "en-US"
      }
    );
    expect(inline).toMatchObject({
      resolutionKind: "direct",
      confidence: "high",
      provenance: { kind: "inline-locale" },
      text: "Inline greeting."
    });

    const parentFallback = resolveDocumentationLocaleResource(
      { entryKey: "user.greet.description" },
      { directResource: resource, requestedLocale: "en-US" }
    );
    expect(parentFallback).toMatchObject({
      resolutionKind: "parent-fallback",
      confidence: "high",
      provenance: { kind: "dlr-entry", resourceId: "docs.api.user", sourceLocale: "en" },
      text: "Greets a user."
    });
    expect(parentFallback.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_FALLBACK_USED");
  });

  it("does not silently downgrade a selected resource with a missing entry", () => {
    const missing = resolveDocumentationLocaleResource(
      { entryKey: "unknown.description" },
      {
        catalogDefaultResource: createFixtureResource(),
        directResource: createFixtureResource(),
        defaultText: "Do not silently use this.",
        requestedLocale: "en"
      }
    );
    expect(missing).toMatchObject({
      resolutionKind: "missing",
      confidence: "none",
      text: "",
      provenance: { kind: "unresolved", resourceId: "docs.api.user" }
    });
    expect(missing.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_ENTRY_MISSING");
  });

  it("creates a metadata-only sidecar and rejects raw locator or text leakage", () => {
    const resolution = resolveDocumentationLocaleResource(
      { entryKey: "user.greet.description" },
      { directResource: createFixtureResource(), requestedLocale: "en" }
    );
    const sidecar = createDocumentationLocaleResolutionSidecar("dlr-sidecar:fixture", [{
      documentId: "doc:fixture",
      entryKey: "user.greet.description",
      fieldPath: "description",
      resourceId: "docs.api.user",
      resolution
    }]);
    expect(validateDocumentationLocaleResolutionSidecar(sidecar)).toEqual([]);
    expect(JSON.stringify(sidecar)).not.toContain("Greets a user.");

    const leaked = structuredClone(sidecar) as Record<string, unknown>;
    leaked.src = "private/docs.dlr";
    expect(validateDocumentationLocaleResolutionSidecar(leaked).map((diagnostic) => diagnostic.code)).toContain("DLR_PRIVACY_VIOLATION");
  });
});
