import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import {
  HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
  renderHtmlDocument,
  renderProjectHtmlDocument
} from "./index.js";

describe("@hia-doc/renderer-html", () => {
  it("renders a themed index.html file and static assets", () => {
    const document = createBasicFixtureDocument();
    const result = renderHtmlDocument(document);

    expect(result.diagnostics).toEqual([]);
    expect(result.files.map((file) => file.path)).toEqual([
      "index.html",
      "assets/hia-default.css",
      "assets/hia-default.js"
    ]);
    expect(result.manifest).toMatchObject({
      schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
      documentId: "fixture.basic",
      entrypoint: "index.html",
      initialLocale: "zh-CN"
    });
    expect(result.manifest.files).toEqual([
      { path: "index.html", role: "entry", contentType: "text/html; charset=utf-8" },
      { path: "assets/hia-default.css", role: "asset", contentType: "text/css; charset=utf-8" },
      { path: "assets/hia-default.js", role: "asset", contentType: "text/javascript; charset=utf-8" }
    ]);
    expect(result.files[0]?.contents).toContain("HIA Basic Fixture");
    expect(result.files[0]?.contents).toContain("生成用户资料摘要。");
    expect(result.files[0]?.contents).toContain("Builds a user profile summary.");
    expect(result.files[0]?.contents).toContain("data-hia-locale-control");
    expect(result.files[0]?.contents).toContain("Localized Fields");
    expect(result.files[0]?.contents).toContain("src/services/profile-service.js:48");
    expect(result.files[0]?.contents).toContain("Referenced Source Fragments");
    expect(result.files[0]?.contents).toContain("BUILD_PROFILE_SUMMARY");
  });

  it("can render a requested locale", () => {
    const document = createBasicFixtureDocument();
    const result = renderHtmlDocument(document, { locale: "en-US" });

    expect(result.files[0]?.contents).toContain("Builds a user profile summary.");
    expect(result.files[0]?.contents).toContain("<html lang=\"en-US\">");
    expect(result.files[0]?.contents).toContain("data-hia-fallback-from=\"en\"");
    expect(result.manifest.initialLocale).toBe("en-US");
  });

  it("renders a unified project page with JS CSS HTML and .NET views", () => {
    const result = renderProjectHtmlDocument({
      project: {
        id: "project:mixed",
        name: "Mixed Project",
        title: "Mixed Project Docs",
        defaultLocale: "en",
        locales: ["en", "zh-CN"]
      },
      profiles: [
        { profileId: "jsdoc", profileVersion: "0.1.0-draft" },
        { profileId: "cssdoc", profileVersion: "0.1.0-draft" },
        { profileId: "htmdoc", profileVersion: "0.1.0-draft" }
      ],
      docSourceMaps: [
        {
          path: "maps/button.docmap.json",
          artifactCount: 1,
          contractVersion: "0.1.0-draft",
          entryCount: 1,
          linkedEntryCount: 1,
          sourceCount: 1,
          sourceMaps: [
            {
              id: "sourcemap:button",
              kind: "ordinary-source-map",
              path: "maps/button.js.map"
            }
          ],
          sourceMapCount: 1,
          sourcesContentPolicy: "none",
          status: "available",
          unresolvedEntryCount: 0
        }
      ],
      entries: [
        {
          id: "js:build",
          name: "buildProfileSummary",
          kind: "function",
          view: "js",
          summary: "Builds a user profile summary.",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.1.0",
            defaultLocale: "en",
            locales: ["en", "zh-CN"],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                defaultLocale: "en",
                localizedText: {
                  en: "Builds a user profile summary.",
                  "zh-CN": "生成用户资料摘要。"
                }
              }
            }
          },
          profile: { profileId: "jsdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "jsdoc-integration", path: "jsdoc.json", contract: "jsdoc-integration" },
          source: {
            path: "src/profile.js",
            language: "javascript",
            linkUrl: "https://example.test/src/profile.js#L12",
            range: { start: { line: 12 } },
            preview: {
              content: "function buildProfileSummary(profile) {\n  return profile.displayName;\n}",
              language: "javascript",
              range: { start: { line: 12 }, end: { line: 14 } }
            }
          }
        },
        {
          id: "css:alert",
          name: "Alert",
          kind: "css-component-style",
          view: "css",
          summary: "Alert component styles.",
          profile: { profileId: "cssdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "cssdoc-extraction", path: "alert.cssdoc.json", contract: "hia-cssdoc-extraction" },
          source: { path: "src/alert.css", language: "css", range: { start: { line: 3 }, end: { line: 9 } } }
        },
        {
          id: "html:alert",
          name: "x-alert",
          kind: "html-component",
          view: "html",
          summary: "Alert markup.",
          symbolId: "html:component:alert",
          profile: { profileId: "htmdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "htmdoc-extraction", path: "alert.htmdoc.json", contract: "hia-htmdoc-extraction" },
          source: { path: "src/alert.html", language: "html", range: { start: { line: 1 }, end: { line: 8 } } },
          docSourceMap: {
            path: "maps/button.docmap.json",
            entryId: "entry:html:alert",
            sourcePath: "src/alert.html",
            sourceRange: { start: { line: 1 }, end: { line: 8 } },
            sourceRangeSource: "parser",
            sourceConfidence: "high",
            artifactPath: "dist/alert.html",
            artifactSelector: "[data-component=\"Alert\"]",
            artifactConfidence: "medium"
          }
        },
        {
          id: "dotnet:portal-menu",
          name: "PortalMenu",
          kind: "dotnet-type",
          view: "dotnet",
          summary: "Represents a portal navigation menu.",
          profile: { profileId: "dotnetdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "hia-document", path: "Portal.Components.hia.json", contract: "dotnetdoc-csharp-source-extraction" },
          source: { path: "src/PortalMenu.cs", language: "csharp", range: { start: { line: 8 }, end: { line: 29 } } }
        }
      ]
    });

    const html = result.files[0]?.contents ?? "";
    const navigationIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      contract?: string;
      contractVersion?: string;
      entries?: Array<{ id: string; source?: { preview?: unknown } }>;
    };
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest.project?.views).toEqual(["all", "js", "css", "html", "dotnet"]);
    expect(result.manifest.project?.entryCounts).toMatchObject({ all: 4, js: 1, css: 1, html: 1, dotnet: 1 });
    expect(result.manifest.initialLocale).toBe("en");
    expect(result.manifest.locales).toEqual(["en", "zh-CN"]);
    expect(result.manifest.project?.navigationIndex).toEqual({
      contract: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
      contractVersion: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
      entryCount: 4,
      path: "project-index.json"
    });
    expect(navigationIndex.contract).toBe(HIA_PROJECT_NAVIGATION_INDEX_CONTRACT);
    expect(navigationIndex.contractVersion).toBe(HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION);
    expect(navigationIndex.entries?.map((entry) => entry.id)).toEqual(["css:alert", "dotnet:portal-menu", "html:alert", "js:build"]);
    expect(navigationIndex.entries?.find((entry) => entry.id === "js:build")?.source?.preview).toBeUndefined();
    expect(html).toContain("Mixed Project Docs");
    expect(html).toContain("data-hia-project-view=\"js\"");
    expect(html).toContain("data-hia-project-search");
    expect(html).toContain("data-hia-project-search-text=");
    expect(html).toContain("data-hia-project-entry=\"css\"");
    expect(html).toContain("data-hia-project-view=\"dotnet\"");
    expect(html).toContain("data-hia-project-entry=\"dotnet\"");
    expect(html).toContain(".NET");
    expect(html).toContain("PortalMenu");
    expect(html).toContain("dotnet-type");
    expect(html).toContain("buildProfileSummary");
    expect(html).toContain("生成用户资料摘要。");
    expect(html).toContain("data-hia-locale-control");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("css-component-style");
    expect(html).toContain("html-component");
    expect(html).toContain("maps/button.docmap.json");
    expect(html).toContain("maps/button.js.map");
    expect(html).toContain("1/1 linked");
    expect(html).toContain("sourcesContentPolicy=none");
    expect(html).toContain("Source Preview src/profile.js:12-14");
    expect(html).toContain("function buildProfileSummary(profile)");
    expect(html).toContain("https://example.test/src/profile.js#L12");
    expect(html).toContain("Doc Source Map");
    expect(html).toContain("data-hia-open-request=\"source\"");
    expect(html).toContain("data-hia-open-request=\"generated\"");
    expect(html).toContain("entry:html:alert");
    expect(html).toContain("dist/alert.html");
    expect(html).toContain("Profile cssdoc@0.1.0-draft");
  });
});
