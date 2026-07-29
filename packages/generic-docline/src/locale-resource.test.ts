import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
  DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
  extractAtTagLocaleResourceReferences,
  extractXmlLocaleResourceReferences,
  inspectLegacyHiaI18nJsonBridge,
  readDocumentationLocaleResource,
  resolveDocumentationLocaleResourceProfile
} from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  // <lang zh-CN>fixture 只在系统 temporary directory 存在，并在每个 test 后可恢复地删除。</lang>
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

/**
 * Create a root-bound `.dlr` fixture without changing any project resource.
 *
 * 中文：创建 root-bound `.dlr` fixture，不改变任何项目 resource。
 */
async function createDlrFixture(): Promise<{ locator: string; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-dlr-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "docs", "user.dlr"), JSON.stringify({
    kind: "documentation-locale-resource",
    contractVersion: "0.1.0-draft",
    format: "documentation-locale-resource-json",
    formatVersion: "0.1.0-draft",
    resourceId: "docs.api.user",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    entries: {
      "user.greet.description": {
        localizedText: {
          "zh-CN": "问候用户。",
          en: "Greets a user."
        }
      }
    }
  }), "utf8");
  return { locator: "docs/user.dlr", root };
}

describe("generic doc-line DLR profiles", () => {
  it("extracts frozen at-tag literals and does not treat path as a locator", () => {
    const extraction = extractAtTagLocaleResourceReferences([
      "@langSrc docs/user.dlr",
      "<lang key=\"user.greet.description\" field=\"description\" path=\"logical.description\" />"
    ].join("\n"));
    expect(extraction.profile).toBe(DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE);
    expect(extraction.documentDefault).toMatchObject({ src: "docs/user.dlr" });
    expect(extraction.fieldReferences).toMatchObject([{
      fieldPath: "description",
      reference: { entryKey: "user.greet.description" }
    }]);
    expect(extraction.diagnostics).toEqual([]);
  });

  it("extracts XML-safe document and field selectors while rejecting nonliteral expressions", () => {
    const extraction = extractXmlLocaleResourceReferences([
      "<langResource resource=\"docs.api.user\"/>",
      "<summary><lang key=\"user.greet.description\" resource=\"docs.api.user\" field=\"summary\" /></summary>"
    ].join("\n"));
    expect(extraction.profile).toBe(DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE);
    expect(extraction.documentDefault).toMatchObject({ resource: "docs.api.user" });
    expect(extraction.fieldReferences[0]).toMatchObject({
      fieldPath: "summary",
      reference: { entryKey: "user.greet.description", resource: "docs.api.user" }
    });

    const expression = extractAtTagLocaleResourceReferences("<lang key=\"user.greet.description\" src=\"#{unsafe}\"/>");
    expect(expression.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_REFERENCE_AMBIGUOUS");
  });

  it("reads a canonical resource only inside the explicit root and refuses traversal", async () => {
    const fixture = await createDlrFixture();
    const valid = await readDocumentationLocaleResource({ locator: fixture.locator, resourceRoot: fixture.root });
    expect(valid.resource).toMatchObject({ resourceId: "docs.api.user" });
    expect(valid.diagnostics).toEqual([]);

    const traversal = await readDocumentationLocaleResource({ locator: "../outside.dlr", resourceRoot: fixture.root });
    expect(traversal.resource).toBeUndefined();
    expect(traversal.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_LOCATOR_TRAVERSAL");
    expect(JSON.stringify(traversal.diagnostics)).not.toContain("../outside.dlr");
  });

  it("rejects a symlink that escapes the explicit resource root", async () => {
    const fixture = await createDlrFixture();
    const externalDirectory = await mkdtemp(path.join(os.tmpdir(), "hia-dlr-external-"));
    temporaryDirectories.push(externalDirectory);
    const externalFile = path.join(externalDirectory, "outside.dlr");
    await writeFile(externalFile, "{}", "utf8");
    await symlink(externalFile, path.join(fixture.root, "docs", "escape.dlr"), "file");

    const escaped = await readDocumentationLocaleResource({ locator: "docs/escape.dlr", resourceRoot: fixture.root });
    expect(escaped.resource).toBeUndefined();
    expect(escaped.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_LOCATOR_SYMLINK_ESCAPE");
    expect(JSON.stringify(escaped.diagnostics)).not.toContain(externalFile);
  });

  it("resolves at-tag and XML-safe profiles through the same root-bound reader", async () => {
    const fixture = await createDlrFixture();
    const atTag = await resolveDocumentationLocaleResourceProfile({
      profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
      requestedLocale: "en-US",
      resourceRoot: fixture.root,
      sourceText: [
        "@langSrc docs/user.dlr",
        "<lang key=\"user.greet.description\" field=\"description\"/>"
      ].join("\n")
    });
    expect(atTag.resolutions[0]?.resolution).toMatchObject({
      resolutionKind: "parent-fallback",
      provenance: { kind: "dlr-entry", resourceId: "docs.api.user" },
      text: "Greets a user."
    });

    const xml = await resolveDocumentationLocaleResourceProfile({
      catalog: { "docs.api.user": fixture.locator },
      profile: DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
      requestedLocale: "zh-CN",
      resourceRoot: fixture.root,
      sourceText: [
        "<langResource resource=\"docs.api.user\"/>",
        "<lang key=\"user.greet.description\" field=\"description\"/>"
      ].join("\n")
    });
    expect(xml.resolutions[0]?.resolution).toMatchObject({
      resolutionKind: "direct",
      provenance: { kind: "dlr-entry", resourceId: "docs.api.user" },
      text: "问候用户。"
    });

    const catalogDefault = await resolveDocumentationLocaleResourceProfile({
      catalog: { "docs.api.user": fixture.locator },
      catalogDefaultResource: "docs.api.user",
      profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
      requestedLocale: "en",
      resourceRoot: fixture.root,
      sourceText: "<lang key=\"user.greet.description\" field=\"description\"/>"
    });
    expect(catalogDefault.resolutions[0]?.resolution).toMatchObject({
      resolutionKind: "direct",
      provenance: { kind: "dlr-entry", resourceId: "docs.api.user" }
    });
  });

  it("does not downgrade an unreadable direct resource to document default or source text", async () => {
    const fixture = await createDlrFixture();
    const result = await resolveDocumentationLocaleResourceProfile({
      defaultTextByFieldPath: { description: "Source fallback must remain unused." },
      profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
      requestedLocale: "en",
      resourceRoot: fixture.root,
      sourceText: [
        "@langSrc docs/user.dlr",
        "<lang key=\"user.greet.description\" src=\"docs/missing.dlr\" field=\"description\"/>"
      ].join("\n")
    });
    expect(result.resolutions[0]?.resolution).toMatchObject({ resolutionKind: "missing", text: "" });
    expect(result.resolutions[0]?.resolution.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DLR_RESOURCE_READ_FAILED");
  });

  it("keeps the existing JSDoc hia-i18n-json descriptor as an explicit legacy bridge", async () => {
    const fixturePath = new URL("../../../fixtures/i18n-resource.hia.json", import.meta.url);
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
      symbols: Array<{ i18n?: { resources?: unknown[] } }>;
    };
    const resource = fixture.symbols[0]?.i18n?.resources?.[0];
    const bridge = inspectLegacyHiaI18nJsonBridge(resource);
    expect(bridge.provenance).toBe("legacy-adapter-bridge");
    expect(bridge.diagnostics).toMatchObject([{ code: "DLR_LEGACY_BRIDGE", severity: "warning" }]);
    expect(JSON.stringify(bridge.diagnostics)).not.toContain("i18n/profile.hia-i18n.json");
  });
});
