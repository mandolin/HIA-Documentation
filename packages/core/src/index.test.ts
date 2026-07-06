import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  HIA_CORE_CONTRACT_VERSION,
  buildLocaleFallbackChain,
  createBasicFixtureDocument,
  createHiaDocument,
  getCoreRuntimeInfo,
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

  it("validates the shared basic fixture", () => {
    const document = createBasicFixtureDocument();
    const result = validateHiaDocumentDetailed(document);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(document.symbols[1]?.source?.definedIn?.relativePath).toBe("src/services/profile-service.js");
  });

  it("resolves field-level i18n text with fallback", () => {
    const document = createBasicFixtureDocument();
    const description = document.symbols[1]?.i18n?.fields.description;

    expect(resolveI18nFieldText(description, "en").text).toBe("Builds a user profile summary.");
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
});
