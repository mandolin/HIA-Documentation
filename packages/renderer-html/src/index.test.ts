import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import {
  HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
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

  it("renders a unified project page with JS CSS and HTML views", () => {
    const result = renderProjectHtmlDocument({
      project: {
        id: "project:mixed",
        name: "Mixed Project",
        title: "Mixed Project Docs"
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
          sourceMapCount: 0,
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
          profile: { profileId: "jsdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "jsdoc-integration", path: "jsdoc.json", contract: "jsdoc-integration" },
          source: { path: "src/profile.js", language: "javascript", range: { start: { line: 12 } } }
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
        }
      ]
    });

    const html = result.files[0]?.contents ?? "";
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest.project?.views).toEqual(["all", "js", "css", "html"]);
    expect(result.manifest.project?.entryCounts).toMatchObject({ all: 3, js: 1, css: 1, html: 1 });
    expect(html).toContain("Mixed Project Docs");
    expect(html).toContain("data-hia-project-view=\"js\"");
    expect(html).toContain("data-hia-project-entry=\"css\"");
    expect(html).toContain("buildProfileSummary");
    expect(html).toContain("css-component-style");
    expect(html).toContain("html-component");
    expect(html).toContain("maps/button.docmap.json");
    expect(html).toContain("1/1 linked");
    expect(html).toContain("sourcesContentPolicy=none");
    expect(html).toContain("Doc Source Map");
    expect(html).toContain("entry:html:alert");
    expect(html).toContain("dist/alert.html");
    expect(html).toContain("Profile cssdoc@0.1.0-draft");
  });
});
