import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  createDocumentationSourceCommentProjection
} from "@hia-doc/core";
import { renderProjectHtmlDocument, type RenderProjectHtmlInput } from "./index.js";

/**
 * @lang zh-CN
 * 构造 HIA-owned 单入口 fixture；正文包含 HTML-like text，用来验证 renderer escaping。
 *
 * @lang en
 * Builds a HIA-owned single-entry fixture whose HTML-like text verifies renderer escaping.
 */
function createFixture(): RenderProjectHtmlInput {
  return {
    project: { name: "Source Comment Fixture", defaultLocale: "en", locales: ["en", "zh-CN"] },
    entries: [{
      id: "entry.profile",
      kind: "function",
      name: "buildProfile",
      symbolId: "symbol.profile",
      view: "js",
      sourceCommentProjection: createDocumentationSourceCommentProjection({
        comments: [{
          commentId: "comment.summary",
          kind: "documentation",
          localizedText: {
            en: "Build a <profile> safely.",
            "zh-CN": "安全生成 <profile>。"
          },
          order: 0,
          range: { start: { line: 2, column: 0 }, end: { line: 5, column: 3 } }
        }],
        contentPolicy: "explicit-projected-text",
        contract: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
        contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
        defaultLocale: "en",
        projectionId: "projection.profile",
        requestedLocale: "zh-CN",
        source: {
          documentId: "doc.profile",
          sourceId: "source.profile.ts",
          symbolId: "symbol.profile"
        }
      })
    }]
  };
}

describe("renderer source-comment projection", () => {
  it("renders plain-text body only under producer and renderer double opt-in", () => {
    const result = renderProjectHtmlDocument(createFixture(), {
      projectSite: {
        informationArchitecture: {},
        sourceCommentProjection: { contentPolicy: "explicit-projected-text", locale: "zh-CN" }
      }
    });
    const entry = result.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    const projectIndex = result.files.find((file) => file.path === "project-index.json")?.contents ?? "";

    expect(entry).toContain("安全生成 &lt;profile&gt;。");
    expect(entry).not.toContain("安全生成 <profile>。");
    expect(entry).toContain("structured-source-comment");
    expect(projectIndex).toContain("documentation-source-comment-projection");
    expect(projectIndex).not.toContain("安全生成");
    expect(projectIndex).not.toContain("projectedText");
    expect(projectIndex).toContain('"projectedCommentTextIncluded": false');
  });

  it("keeps metadata visible and body absent when renderer content policy is none", () => {
    const result = renderProjectHtmlDocument(createFixture(), {
      projectSite: {
        informationArchitecture: {},
        sourceCommentProjection: { contentPolicy: "none", locale: "zh-CN" }
      }
    });
    const entry = result.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    expect(entry).toContain("Comment Contract");
    expect(entry).toContain("Comment Locale");
    expect(entry).not.toContain("安全生成");
  });

  it("requires explicit IA and an exact projection locale before file generation", () => {
    expect(() => renderProjectHtmlDocument(createFixture(), {
      projectSite: { sourceCommentProjection: { locale: "zh-CN" } }
    })).toThrow(/HIA_PORTAL_SOURCE_COMMENT_REQUIRES_IA/u);

    expect(() => renderProjectHtmlDocument(createFixture(), {
      projectSite: { informationArchitecture: {}, sourceCommentProjection: { locale: "en" } }
    })).toThrow(/HIA_PORTAL_SOURCE_COMMENT_PROJECTION_INVALID/u);
  });
});
