import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import {
  HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
  renderHtmlDocument
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
});
