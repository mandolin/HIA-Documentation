import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
  validateDocumentationUiLocaleCompletenessReport
} from "@hia-doc/core";
import {
  DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH,
  DOCUMENTATION_PORTAL_UI_MESSAGE_IDS,
  renderProjectHtmlDocument,
  type RenderProjectHtmlInput
} from "./index.js";

/**
 * @lang zh-CN
 * 构造同时具有中英文正文的最小显式 IA Portal，用于隔离 UI locale owner adoption 行为。
 *
 * @lang en
 * Builds the smallest explicit-IA Portal with Chinese and English content, isolating UI-locale owner-adoption behavior.
 *
 * @returns <lang><zh-CN>不含私有路径或目标项目事实的 renderer 输入。</zh-CN><en>Renderer input containing no private path or target-project fact.</en></lang>
 */
function createUiLocalePortalFixture(): RenderProjectHtmlInput {
  return {
    project: {
      id: "project:ui-locale-fixture",
      name: "UI Locale Fixture",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"]
    },
    entries: [
      {
        id: "entry:cookie-set",
        name: "Cookies.set",
        kind: "function",
        view: "js",
        signature: "Cookies.set(name, value)",
        i18n: {
          enabled: true,
          model: "hia-text-i18n",
          modelVersion: "0.1.0",
          defaultLocale: "zh-CN",
          locales: ["zh-CN", "en"],
          fields: {
            summary: {
              fieldPath: "summary",
              kind: "summary",
              defaultLocale: "zh-CN",
              localizedText: {
                "zh-CN": "写入 Cookie。",
                en: "Writes a Cookie."
              }
            }
          }
        },
        semanticPath: [
          { kind: "repository", id: "fixture", label: "Fixture" },
          { kind: "operation", id: "cookie-set", label: "Cookies.set" }
        ],
        source: {
          path: "src/api.mjs",
          language: "javascript",
          preview: { content: "export function set() {}", range: { start: { line: 12 }, end: { line: 12 } } }
        }
      }
    ]
  };
}

describe("W-P125 Portal UI locale owner adoption", () => {
  it("requires caller-explicit UI locale before an explicit IA build emits files", () => {
    expect(() => renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      projectSite: { informationArchitecture: {} }
    })).toThrow(/HIA_PORTAL_UI_LOCALE_REQUIRED/u);
    expect(() => renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      projectSite: {
        informationArchitecture: {},
        uiLocale: "en",
        uiLocaleCompleteness: { profileId: "unknown.profile", surfaceId: "unknown.surface" }
      }
    })).toThrow(/HIA_PORTAL_UI_LOCALE_SURFACE_UNSUPPORTED/u);
  });

  it("emits an exact, translation-free W-P123 report and body-free manifest/index linkage", () => {
    const result = renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      locale: "zh-CN",
      projectSite: {
        uiLocale: "en",
        informationArchitecture: {},
        uiLocaleCompleteness: {
          profileId: "hia-jsdoc.portal-bridge",
          surfaceId: "hia-jsdoc.portal-bridge"
        }
      }
    });
    const reportFile = result.files.find(({ path }) => path === DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH);
    const report = JSON.parse(reportFile?.contents ?? "{}") as Record<string, unknown>;
    const index = JSON.parse(result.files.find(({ path }) => path === "project-index.json")?.contents ?? "{}") as {
      site?: { uiLocaleCompleteness?: Record<string, unknown> };
    };

    expect(report).toMatchObject({
      contract: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
      contractVersion: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
      profileId: "hia-jsdoc.portal-bridge",
      status: "complete",
      privacy: { messageTextIncluded: false, contentBodyIncluded: false, sourceBodyIncluded: false }
    });
    expect(validateDocumentationUiLocaleCompletenessReport(report)).toEqual([]);
    expect(reportFile?.contents).not.toContain("Search documentation");
    expect(reportFile?.contents).not.toContain("搜索文档");
    expect(result.manifest.project?.uiLocaleCompleteness).toMatchObject({
      path: DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH,
      profileId: "hia-jsdoc.portal-bridge",
      surfaceId: "hia-jsdoc.portal-bridge",
      status: "complete",
      uiLocaleCount: 2
    });
    expect(index.site?.uiLocaleCompleteness).toEqual(result.manifest.project?.uiLocaleCompleteness);
  });

  it("marks interactive visible, accessible, placeholder, and dynamic-state messages with stable identities", () => {
    const result = renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      locale: "zh-CN",
      projectSite: { uiLocale: "en", informationArchitecture: {} }
    });
    const shell = result.files.find(({ path }) => path === "index.html")?.contents ?? "";
    const topic = result.files.find(({ path }) => path.startsWith("entries/"))?.contents ?? "";

    expect(DOCUMENTATION_PORTAL_UI_MESSAGE_IDS.length).toBeGreaterThan(50);
    expect(shell).toContain('lang="en"');
    expect(shell).toContain('data-hia-ui-message="portal.search.label"');
    expect(shell).toContain('data-hia-ui-placeholder="portal.search.placeholder"');
    expect(`${shell}${topic}`).toContain('data-hia-ui-message="portal.source.status.loading"');
    expect(shell).not.toContain("Loading source / 正在加载源码");
    expect(topic).toContain('data-hia-ui-message="portal.section.metadata"');
    expect(topic).toContain('data-hia-ui-message="portal.metadata.kind"');
    const embeddedTopic = renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      locale: "zh-CN",
      projectSite: {
        uiLocale: "en",
        informationArchitecture: {},
        source: { presentation: "embed" }
      }
    }).files.find(({ path }) => path.startsWith("entries/"))?.contents ?? "";
    expect(embeddedTopic).toContain('data-hia-ui-message="portal.source.preview"');
  });

  it("emits direct zh-CN/en no-script paths with exact UI language metadata", () => {
    const result = renderProjectHtmlDocument(createUiLocalePortalFixture(), {
      locale: "zh-CN",
      projectSite: { uiLocale: "en", informationArchitecture: {} }
    });
    const indexZh = result.files.find(({ path }) => path === "pages/zh-CN/index.html")?.contents ?? "";
    const indexEn = result.files.find(({ path }) => path === "pages/en/index.html")?.contents ?? "";
    const topicZh = result.files.find(({ path }) => path.startsWith("pages/zh-CN/") && path !== "pages/zh-CN/index.html")?.contents ?? "";
    const topicEn = result.files.find(({ path }) => path.startsWith("pages/en/") && path !== "pages/en/index.html")?.contents ?? "";
    const projectIndex = JSON.parse(result.files.find(({ path }) => path === "project-index.json")?.contents ?? "{}") as {
      entries?: Array<{ noScriptLocalePages?: Array<{ uiLocale: string; path: string }> }>;
    };

    expect(indexZh).toContain('<html lang="zh-CN"');
    expect(indexZh).toContain("文档页面");
    expect(indexZh).not.toContain("Documentation pages");
    expect(indexEn).toContain('<html lang="en"');
    expect(indexEn).toContain("Documentation pages");
    expect(indexEn).not.toContain("文档页面");
    expect(topicZh).toContain("页面索引");
    expect(topicEn).toContain("Page index");
    expect(topicEn).toContain('data-hia-locale="zh-CN" lang="zh-CN"');
    expect(topicEn).toContain('data-hia-locale="en" lang="en"');
    expect(projectIndex.entries?.[0]?.noScriptLocalePages).toEqual([
      { uiLocale: "zh-CN", path: expect.stringMatching(/^pages\/zh-CN\//u) },
      { uiLocale: "en", path: expect.stringMatching(/^pages\/en\//u) }
    ]);
  });
});
