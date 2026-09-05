import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  compareDocumentationPresentationIdentity,
  createBasicFixtureDocument,
  validateDocumentationPresentationProfile
} from "@hia-doc/core";
import {
  DOCUMENTATION_PORTAL_THEME_CONTRACT,
  DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION
} from "@hia-doc/theme-default";
import {
  DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
  DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
  DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA,
  DOCUMENTATION_PORTAL_TOPIC_SECTIONS,
  HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
  HIA_PROJECT_RELATION_GRAPH_CONTRACT,
  HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION,
  PORTAL_PRESENTATION_PROFILE_PATH,
  renderHtmlDocument,
  renderProjectHtmlDocument,
  type RenderProjectEntry,
  type RenderProjectHtmlInput,
  type RenderProjectNavigationEntry
} from "./index.js";

/**
 * W-P85 的固定 2 repository / 4 package / 4 layer / 16 entry TypeScript fixture。
 * Deterministic W-P85 TypeScript fixture with 2 repositories, 4 packages, 4 layers, and 16 entries.
 */
function createWp85TypeScriptPortalFixture(): RenderProjectHtmlInput {
  const entries: RenderProjectEntry[] = [];
  for (let repositoryIndex = 0; repositoryIndex < 2; repositoryIndex += 1) {
    for (let packageOffset = 0; packageOffset < 2; packageOffset += 1) {
      const packageIndex = repositoryIndex * 2 + packageOffset;
      const moduleSymbolId = `module:repo-${repositoryIndex}:package-${packageIndex}`;
      for (let entryIndex = 0; entryIndex < 4; entryIndex += 1) {
        const member = entryIndex > 0;
        entries.push({
          id: `ts:r${repositoryIndex}:p${packageIndex}:e${entryIndex}`,
          name: member ? `operation${entryIndex}` : `package${packageIndex}Api`,
          kind: member ? "function" : "module",
          view: "js",
          symbolId: member ? `${moduleSymbolId}:operation:${entryIndex}` : moduleSymbolId,
          signature: member ? `export function operation${entryIndex}(): void` : undefined,
          summary: member ? `Operation ${entryIndex}.` : `Package ${packageIndex} API.`,
          input: {
            kind: "hia-document",
            path: `artifacts/package-${packageIndex}.hia.json`,
            contract: "hia-core-document",
            contractVersion: "0.1.0"
          },
          hierarchy: member ? { parentSymbolId: moduleSymbolId } : undefined,
          semanticPath: [
            { kind: "repository", id: `repo-${repositoryIndex}`, label: `Repository ${repositoryIndex}` },
            { kind: "package", id: `package-${packageIndex}`, label: `@fixture/package-${packageIndex}` },
            { kind: "layer", id: `layer-${packageIndex}`, label: `Layer ${packageIndex}` },
            { kind: "contract", id: `contract-${packageIndex}`, label: `Contract ${packageIndex}` },
            ...(member
              ? [{ kind: "operation" as const, id: `operation-${entryIndex}`, label: `Operation ${entryIndex}` }]
              : [])
          ],
          source: {
            path: `src/package-${packageIndex}/entry-${entryIndex}.ts`,
            language: "typescript",
            linkUrl: `https://example.test/repository-${repositoryIndex}/package-${packageIndex}/entry-${entryIndex}.ts#L1`,
            range: { start: { line: 1 }, end: { line: 3 } }
          }
        });
      }
    }
  }
  return {
    project: {
      name: "W-P85 TypeScript Portal Fixture",
      defaultLocale: "en",
      locales: ["en", "zh-CN"],
      productVersion: "2026.8"
    },
    entries
  };
}

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
    expect(result.files[0]?.contents).toContain(`data-hia-theme-contract="${DOCUMENTATION_PORTAL_THEME_CONTRACT}"`);
    expect(result.files[0]?.contents).toContain(`data-hia-theme-contract-version="${DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION}"`);
    expect(result.files[0]?.contents).toContain("data-hia-theme-color-scheme-policy=\"system\"");
    expect(result.files[0]?.contents).toContain("data-hia-theme-disclosure=\"native-details-summary\"");
  });

  it("can render a requested locale", () => {
    const document = createBasicFixtureDocument();
    const result = renderHtmlDocument(document, { locale: "en-US" });

    expect(result.files[0]?.contents).toContain("Builds a user profile summary.");
    expect(result.files[0]?.contents).toContain("<html lang=\"en-US\"");
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
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.2.0",
            defaultLocale: "en",
            locales: ["en", "zh-CN"],
            fields: {
              summary: {
                fieldPath: "summary",
                kind: "summary",
                defaultLocale: "en",
                localizedText: {
                  en: "Represents a portal navigation menu.",
                  "zh-CN": "表示门户导航菜单。"
                }
              }
            }
          },
          symbolId: "T:Portal.Components.PortalMenu",
          hierarchy: {
            assembly: "Portal.Components",
            namespace: "Portal.Components",
            baseTypeIds: ["T:System.Object"],
            interfaceIds: ["T:Portal.Components.IMenu"]
          },
          profile: { profileId: "dotnetdoc", profileVersion: "0.1.0-draft" },
          input: { kind: "hia-document", path: "Portal.Components.hia.json", contract: "dotnetdoc-csharp-source-extraction" },
          source: { path: "src/PortalMenu.cs", language: "csharp", range: { start: { line: 8 }, end: { line: 29 } } }
        }
      ]
    }, {
      projectSite: {
        layout: "single-page",
        source: {
          presentation: "embed"
        }
      }
    });

    const html = result.files[0]?.contents ?? "";
    const navigationIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      contract?: string;
      contractVersion?: string;
      groups?: Array<{ kind: string; label: string; entryCount: number; views: string[] }>;
      navigationTree?: Array<{
        id: string;
        kind: string;
        label: string;
        entryCount: number;
        views: string[];
        entryId?: string;
        children?: Array<{
          id: string;
          kind: string;
          label: string;
          entryCount: number;
          views: string[];
          entryId?: string;
          children?: Array<{
            id: string;
            kind: string;
            label: string;
            entryCount: number;
            views: string[];
            entryId?: string;
          }>;
        }>;
      }>;
      entries?: Array<{ id: string; source?: { preview?: unknown } }>;
      relationGraph?: {
        contract?: string;
        contractVersion?: string;
        nodeCount?: number;
        relationCount?: number;
        relations?: Array<{ kind: string; from: string; to: string; label: string }>;
      };
      site?: {
        theme?: {
          contract?: string;
          contractVersion?: string;
          name?: string;
          colorSchemePolicy?: string;
          disclosure?: string;
        };
      };
    };
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "PRESENTATION_SOURCE_ASSET_INVALID",
        severity: "warning",
        targetPath: "source.assets"
      })
    ]);
    expect(result.manifest.project?.views).toEqual(["all", "dotnet", "js", "css", "html"]);
    expect(result.manifest.project?.entryCounts).toMatchObject({ all: 4, js: 1, css: 1, html: 1, dotnet: 1 });
    expect(result.manifest.project?.theme).toEqual({
      contract: DOCUMENTATION_PORTAL_THEME_CONTRACT,
      contractVersion: DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION,
      name: "default",
      colorSchemePolicy: "system",
      disclosure: "native-details-summary"
    });
    expect(result.manifest.initialLocale).toBe("en");
    expect(result.manifest.locales).toEqual(["en", "zh-CN"]);
    expect(result.manifest.project?.navigationIndex).toEqual({
      contract: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
      contractVersion: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
      entryCount: 4,
      path: "project-index.json"
    });
    expect(result.manifest.project?.relationGraph).toEqual({
      contract: HIA_PROJECT_RELATION_GRAPH_CONTRACT,
      contractVersion: HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION,
      nodeCount: 9,
      relationCount: 5,
      path: "project-index.json"
    });
    expect(navigationIndex.contract).toBe(HIA_PROJECT_NAVIGATION_INDEX_CONTRACT);
    expect(navigationIndex.contractVersion).toBe(HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION);
    expect(navigationIndex.relationGraph?.contract).toBe(HIA_PROJECT_RELATION_GRAPH_CONTRACT);
    expect(navigationIndex.relationGraph?.contractVersion).toBe(HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION);
    expect(navigationIndex.relationGraph?.nodeCount).toBe(9);
    expect(navigationIndex.relationGraph?.relationCount).toBe(5);
    expect(navigationIndex.site?.theme).toEqual(result.manifest.project?.theme);
    expect(navigationIndex.relationGraph?.relations).toContainEqual(expect.objectContaining({
      kind: "documents-generated-artifact",
      from: "entry:html:alert",
      to: "artifact:dist/alert.html"
    }));
    expect(navigationIndex.relationGraph?.relations).toContainEqual(expect.objectContaining({
      kind: "semantic-member",
      from: "entry:dotnet:portal-menu",
      to: "source:src/PortalMenu.cs"
    }));
    expect(navigationIndex.entries?.map((entry) => entry.id)).toEqual(["css:alert", "dotnet:portal-menu", "html:alert", "js:build"]);
    expect(navigationIndex.entries?.find((entry) => entry.id === "js:build")?.source?.preview).toBeUndefined();
    expect(navigationIndex.groups).toContainEqual({ id: "kind:dotnet-type", kind: "kind", label: "dotnet-type", entryCount: 1, views: ["dotnet"] });
    expect(navigationIndex.groups).toContainEqual({ id: "source-root:src", kind: "source-root", label: "src", entryCount: 4, views: ["dotnet", "js", "css", "html"] });
    expect(navigationIndex.navigationTree?.find((node) => node.id === "view:dotnet")).toMatchObject({
      kind: "view",
      label: ".NET",
      entryCount: 1,
      views: ["dotnet"],
      children: [
        expect.objectContaining({
          kind: "assembly",
          label: "Portal.Components",
          children: [
            expect.objectContaining({
              kind: "namespace",
              label: "Portal",
              children: [
                expect.objectContaining({
                  kind: "namespace",
                  label: "Components",
                  children: [
                    expect.objectContaining({
                      kind: "type",
                      label: "PortalMenu",
                      entryId: "dotnet:portal-menu"
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
    expect(navigationIndex.navigationTree?.find((node) => node.id === "view:js")).toMatchObject({
      kind: "view",
      label: "JS",
      children: [
        expect.objectContaining({
          kind: "source-root",
          label: "src",
          children: [
            expect.objectContaining({
              kind: "source-file",
              label: "src/profile.js"
            })
          ]
        })
      ]
    });
    expect(html).toContain("Mixed Project Docs");
    expect(html).toContain("Hierarchy");
    expect(html).toContain("hia-project-hierarchy");
    expect(html).toContain("Groups");
    expect(html).toContain("Source Roots");
    expect(html).toContain("data-hia-project-view=\"js\"");
    expect(html).toContain("data-hia-project-search");
    expect(html).toContain("data-hia-project-search-text=");
    expect(html).toContain("data-hia-project-entry=\"css\"");
    expect(html).toContain("data-hia-project-view=\"dotnet\"");
    expect(html).toContain("data-hia-project-entry=\"dotnet\"");
    expect(html).toContain(".NET");
    expect(html).toContain("PortalMenu");
    expect(html).toContain("表示门户导航菜单。");
    expect(html).toContain("dotnet-type");
    expect(html).toContain("buildProfileSummary");
    expect(html).toContain("生成用户资料摘要。");
    expect(html).toContain("data-hia-locale-control");
    expect(html).toContain("<html lang=\"en\"");
    expect(html).toContain("css-component-style");
    expect(html).toContain("html-component");
    expect(html).toContain("maps/button.docmap.json");
    expect(html).toContain("maps/button.js.map");
    expect(html).toContain("1/1 linked");
    expect(html).toContain("sourcesContentPolicy=none");
    expect(html).toContain("Source Preview src/profile.js:12-14");
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toContain("role=\"tree\"");
    expect(html).toContain("function buildProfileSummary(profile)");
    expect(html).not.toContain("data-hia-project-search-text=\"dotnet:portal-menu portalmenu dotnet-type portal menu");
    expect(html).not.toContain("https://example.test/src/profile.js#L12");
    expect(html).toContain("Doc Source Map");
    expect(html).toContain("Relations");
    expect(html).toContain("documents-source");
    expect(html).toContain("documents-generated-artifact");
    expect(html).toContain("semantic-member");
    expect(html).toContain("Source: src/alert.html");
    expect(html).toContain("Generated: dist/alert.html");
    expect(html).toContain("data-hia-open-request=\"source\"");
    expect(html).toContain("data-hia-open-request=\"generated\"");
    expect(html).toContain("entry:html:alert");
    expect(html).toContain("dist/alert.html");
    expect(html).toContain("Profile cssdoc@0.1.0-draft");
  });

  it("uses split-site output by default and keeps semantic navigation lazy", () => {
    const input = {
      project: {
        name: "Large Project",
        defaultLocale: "en",
        locales: ["en", "zh-CN"]
      },
      entries: [
        {
          id: "js:module",
          name: "profile",
          kind: "module",
          view: "js" as const,
          symbolId: "module:profile",
          source: {
            path: "src/profile.js",
            language: "javascript",
            linkUrl: "https://example.test/src/profile.js#L1",
            range: { start: { line: 1 }, end: { line: 2 } },
            preview: {
              content: "export const profile = {};\nexport default profile;",
              language: "javascript",
              range: { start: { line: 1 }, end: { line: 2 } }
            }
          }
        },
        {
          id: "js:build",
          name: "buildProfileSummary",
          kind: "function",
          view: "js" as const,
          symbolId: "function:buildProfileSummary",
          hierarchy: {
            parentSymbolId: "module:profile"
          },
          summary: "Builds a user profile summary.",
          source: {
            path: "src/profile.js",
            language: "javascript",
            linkUrl: "https://example.test/src/profile.js#L12",
            range: { start: { line: 12 }, end: { line: 14 } },
            preview: {
              content: "function buildProfileSummary(profile) {\n  return profile.displayName;\n}",
              language: "javascript",
              range: { start: { line: 12 }, end: { line: 14 } }
            }
          }
        }
      ]
    };

    const result = renderProjectHtmlDocument(input);
    const paths = result.files.map((file) => file.path);
    const indexHtml = result.files.find((file) => file.path === "index.html")?.contents ?? "";
    // <lang><zh-CN>所有 inline owner scripts 必须能被真实 JavaScript parser 接受，避免注释或拼接截断导航。</zh-CN><en>Every inline owner script must parse as JavaScript so comments or concatenation cannot truncate navigation.</en></lang>
    const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/gu)].map((match) => match[1] ?? "");
    const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      site?: { layout?: string; sourcePresentation?: string; presentationProfile?: { path?: string } };
      navigationTree?: Array<{ id: string; children?: unknown[] }>;
      entries?: Array<{ id: string; noScriptPagePath?: string }>;
    };
    const presentationProfile = JSON.parse(result.files.find((file) => file.path === PORTAL_PRESENTATION_PROFILE_PATH)?.contents ?? "{}") as {
      source?: { defaultMode?: string; mode?: string; assets?: unknown[] };
      theme?: { skins?: unknown[] };
    };
    const rootShard = JSON.parse(result.files.find((file) => file.path === "navigation/root.json")?.contents ?? "{}") as {
      children?: Array<{ id: string; children?: unknown[]; childrenPath?: string }>;
    };
    const entryFiles = result.files.filter((file) => file.path.startsWith("entries/"));
    const noScriptPagePath = projectIndex.entries?.find(({ id }) => id === "js:build")?.noScriptPagePath;
    const noScriptIndexHtml = result.files.find((file) => file.path === "pages/index.html")?.contents ?? "";
    const noScriptEntryHtml = result.files.find((file) => file.path === noScriptPagePath)?.contents ?? "";

    expect(paths).toContain("navigation/root.json");
    expect(inlineScripts.length).toBeGreaterThan(0);
    expect(() => inlineScripts.forEach((script) => new Script(script))).not.toThrow();
    expect(paths).toContain("search/index.json");
    expect(paths).toContain("relations/project.json");
    expect(paths).toContain("pages/index.html");
    expect(paths).toContain(PORTAL_PRESENTATION_PROFILE_PATH);
    expect(paths).toContain(".gitattributes");
    expect(paths.filter((candidate) => /^sources\/[a-f0-9]{64}\.txt$/u.test(candidate))).toHaveLength(2);
    expect(entryFiles).toHaveLength(2);
    expect(paths.filter((candidate) => candidate.startsWith("pages/") && candidate !== "pages/index.html")).toHaveLength(2);
    expect(noScriptPagePath).toMatch(/^pages\/.+-[a-f0-9]{8}\.html$/u);
    expect(noScriptIndexHtml).toContain("Documentation pages / 文档页面");
    expect(noScriptIndexHtml).not.toContain("<script");
    expect(noScriptEntryHtml).toContain("buildProfileSummary");
    expect(noScriptEntryHtml).toContain('href="../sources/');
    expect(noScriptEntryHtml).toContain('href="../assets/hia-default.css"');
    expect(noScriptEntryHtml).not.toContain("<script");
    expect(projectIndex.site).toEqual(expect.objectContaining({
      layout: "split-site",
      sourcePresentation: "fetch",
      presentationProfile: expect.objectContaining({ path: PORTAL_PRESENTATION_PROFILE_PATH })
    }));
    expect(validateDocumentationPresentationProfile(presentationProfile)).toEqual([]);
    expect(presentationProfile.source).toMatchObject({ defaultMode: "fetch", mode: "fetch" });
    expect(presentationProfile.source?.assets).toHaveLength(2);
    expect(presentationProfile.theme?.skins).toHaveLength(3);
    expect(rootShard.children).toEqual([
      expect.objectContaining({
        id: "view:js",
        childrenPath: expect.stringMatching(/^navigation\/.+\.json$/u)
      })
    ]);
    expect(rootShard.children?.[0]?.children).toBeUndefined();
    expect(projectIndex.navigationTree?.[0]).toMatchObject({
      id: "view:js",
      children: [
        expect.objectContaining({
          kind: "source-root",
          children: [
            expect.objectContaining({
              kind: "source-file",
              children: [
                expect.objectContaining({
                  kind: "type",
                  entryId: "js:module",
                  children: [
                    expect.objectContaining({
                      kind: "entry",
                      entryId: "js:build"
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
    expect(indexHtml).toContain("data-hia-project-tree");
    expect(indexHtml).toContain("data-hia-skin-control");
    expect(indexHtml).toContain("data-hia-scheme-control");
    expect(indexHtml).toContain('<noscript><p class="hia-noscript-notice"><a href="pages/index.html">');
    expect(indexHtml).toContain("fetch(path");
    expect(indexHtml).not.toContain("data-hia-project-entry=\"js\"");
    expect(indexHtml).not.toContain("function buildProfileSummary(profile)");
    expect(entryFiles.find((file) => file.contents.includes("buildProfileSummary"))?.contents)
      .toMatch(/data-hia-source-fetch="sources\/[a-f0-9]{64}\.txt"/u);
    expect(entryFiles.find((file) => file.contents.includes("buildProfileSummary"))?.contents)
      .not.toContain("https://example.test");
  });

  it("enforces none, link, embed and fetch source presentation at the renderer boundary", () => {
    const input = {
      project: {
        name: "Source Mode Project"
      },
      entries: [
        {
          id: "js:source-mode",
          name: "sourceMode",
          kind: "function",
          view: "js" as const,
          source: {
            path: "src/source-mode.js",
            language: "javascript",
            linkUrl: "https://example.test/src/source-mode.js#L3",
            fetchUrl: "https://raw.example.test/src/source-mode.js",
            range: { start: { line: 3 }, end: { line: 5 } },
            preview: {
              content: "function sourceMode() {\n  return true;\n}",
              range: { start: { line: 3 }, end: { line: 5 } }
            }
          }
        }
      ]
    };
    const renderMode = (presentation: "none" | "link" | "embed" | "fetch") => {
      const result = renderProjectHtmlDocument(input, {
        projectSite: {
          source: {
            presentation
          }
        }
      });
      return {
        result,
        html: result.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "",
        profile: JSON.parse(result.files.find((file) => file.path === PORTAL_PRESENTATION_PROFILE_PATH)?.contents ?? "{}")
      };
    };
    const modes = Object.fromEntries((["none", "link", "embed", "fetch"] as const).map((mode) => [mode, renderMode(mode)])) as Record<
      "none" | "link" | "embed" | "fetch",
      ReturnType<typeof renderMode>
    >;

    expect(modes.none.html).not.toContain("https://example.test");
    expect(modes.none.html).not.toContain("function sourceMode()");
    expect(modes.link.html).toMatch(/href="sources\/[a-f0-9]{64}\.txt"/u);
    expect(modes.link.html).not.toContain("https://example.test");
    expect(modes.link.html).not.toContain("function sourceMode()");
    expect(modes.embed.html).toContain("function sourceMode()");
    expect(modes.embed.html).not.toContain("data-hia-source-fetch");
    expect(modes.fetch.html).toMatch(/data-hia-source-fetch="sources\/[a-f0-9]{64}\.txt"/u);
    expect(modes.fetch.html).toContain("data-hia-source-integrity=\"sha384-");
    expect(modes.fetch.html).toContain("data-hia-source-state=\"idle\"");
    expect(modes.fetch.html).toContain("data-hia-source-reset");
    expect(modes.fetch.html).toContain("data-hia-source-fetch-trigger=\"on-expand\"");
    expect(modes.fetch.html).not.toContain("data-hia-source-fetch-button");
    expect(modes.fetch.html).not.toContain("function sourceMode()");
    for (const mode of ["none", "link", "embed", "fetch"] as const) {
      expect(validateDocumentationPresentationProfile(modes[mode].profile)).toEqual([]);
    }
    expect(compareDocumentationPresentationIdentity(modes.fetch.profile, modes.embed.profile)).toEqual([]);
    expect(compareDocumentationPresentationIdentity(modes.fetch.profile, modes.link.profile)).toEqual([]);

    const manualFetch = renderProjectHtmlDocument(input, {
      projectSite: {
        source: {
          presentation: "fetch",
          fetchTrigger: "manual",
          maxLines: 80
        }
      }
    }).files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    expect(manualFetch).toContain("data-hia-source-fetch-trigger=\"manual\"");
    expect(manualFetch).toContain("data-hia-source-max-lines=\"80\"");
    expect(manualFetch).toContain("data-hia-source-fetch-button");

    const openEndedFetch = renderProjectHtmlDocument({
      ...input,
      entries: [
        {
          ...input.entries[0],
          source: {
            ...input.entries[0]!.source,
            range: { start: { line: 3 } }
          }
        }
      ]
    }, {
      projectSite: {
        source: {
          presentation: "fetch",
          maxLines: 80
        }
      }
    }).files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    expect(openEndedFetch).toContain("<summary>src/source-mode.js:3</summary>");
    expect(openEndedFetch).not.toContain("src/source-mode.js:3-3");
    expect(openEndedFetch).not.toContain("data-hia-source-end=");
    expect(openEndedFetch).toContain("data-hia-source-max-lines=\"80\"");

    const singlePageFetch = renderProjectHtmlDocument(input, {
      projectSite: {
        layout: "single-page",
        source: {
          presentation: "fetch"
        }
      }
    }).files.find((file) => file.path === "index.html")?.contents ?? "";
    expect(singlePageFetch).toContain("function bindSourceFetch(root = document)");
    expect(singlePageFetch).toContain("bindSourceFetch();");

    const missingAsset = renderProjectHtmlDocument({
      project: { name: "Missing Source Asset" },
      entries: [{
        id: "js:missing",
        name: "missing",
        kind: "function",
        view: "js",
        source: { path: "src/missing.js", linkUrl: "https://example.test/src/missing.js" }
      }]
    });
    const missingHtml = missingAsset.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    expect(missingAsset.diagnostics.map(({ code }) => code)).toContain("PRESENTATION_SOURCE_ASSET_INVALID");
    expect(missingHtml).not.toContain("https://example.test");
    expect(missingHtml).not.toContain("data-hia-source-fetch");
  });

  it("selects a Portal-owned skin and scheme without changing presentation identity", () => {
    const input = createWp85TypeScriptPortalFixture();
    const classic = renderProjectHtmlDocument(input, {
      projectSite: { source: { presentation: "none" }, theme: { skinId: "portal.classic", scheme: "system" } }
    });
    const graphite = renderProjectHtmlDocument(input, {
      projectSite: { source: { presentation: "none" }, theme: { skinId: "portal.graphite", scheme: "dark" } }
    });
    const classicProfile = JSON.parse(classic.files.find(({ path }) => path === PORTAL_PRESENTATION_PROFILE_PATH)?.contents ?? "{}");
    const graphiteProfile = JSON.parse(graphite.files.find(({ path }) => path === PORTAL_PRESENTATION_PROFILE_PATH)?.contents ?? "{}");
    const graphiteHtml = graphite.files.find(({ path }) => path === "index.html")?.contents ?? "";

    expect(validateDocumentationPresentationProfile(graphiteProfile)).toEqual([]);
    expect(compareDocumentationPresentationIdentity(classicProfile, graphiteProfile)).toEqual([]);
    expect(graphiteHtml).toContain('data-hia-skin="portal.graphite"');
    expect(graphiteHtml).toContain('data-hia-scheme="dark"');
    expect(graphiteHtml).toContain('<option value="portal.graphite" selected>');
    expect(graphiteHtml).toContain('<option value="dark" selected>');
  });

  it("separates ASP.NET surfaces and project structure from assembly API hierarchy", () => {
    const result = renderProjectHtmlDocument({
      project: {
        name: "Portal"
      },
      entries: [
        {
          id: "endpoint:default",
          name: "Page ~/Default.aspx",
          kind: "aspnet-endpoint",
          view: "dotnet",
          source: { path: "src/Portal/Default.aspx", language: "aspnet-markup" }
        },
        {
          id: "markup:admin",
          name: "DiagnosticsLogs.aspx comment",
          kind: "dotnet-markup-comment",
          view: "dotnet",
          source: { path: "src/Portal/Admin/DiagnosticsLogs.aspx", language: "aspnet-markup" }
        },
        {
          id: "project:portal",
          name: "Portal",
          kind: "dotnet-project",
          view: "dotnet",
          source: { path: "src/Portal/Portal.csproj", language: "msbuild" }
        }
      ]
    });
    const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      navigationTree?: Array<{ children?: Array<{ kind: string; label: string; entryCount: number }> }>;
    };
    const roots = projectIndex.navigationTree?.[0]?.children ?? [];

    expect(roots).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "surface", label: "ASP.NET Surfaces", entryCount: 2 }),
      expect.objectContaining({ kind: "project", label: ".NET Project Structure", entryCount: 1 })
    ]));
    expect(roots.some((item) => item.label === "(unknown assembly)")).toBe(false);
  });

  it("keeps a 3000-entry project index shell small and emits entry content separately", () => {
    const entries = Array.from({ length: 3000 }, (_, index) => {
      const typeIndex = Math.floor(index / 50);
      return {
        id: `dotnet:method:${index}`,
        name: `Method${index}`,
        kind: "dotnet-method",
        view: "dotnet" as const,
        symbolId: `M:Portal.Feature${typeIndex}.Type${typeIndex}.Method${index}`,
        hierarchy: {
          assembly: "Portal",
          namespace: `Portal.Feature${typeIndex}`,
          containingType: `Portal.Feature${typeIndex}.Type${typeIndex}`,
          parentSymbolId: `T:Portal.Feature${typeIndex}.Type${typeIndex}`
        },
        source: {
          path: `src/Portal/Feature${typeIndex}/Type${typeIndex}.cs`,
          language: "csharp",
          range: {
            start: { line: index + 1 },
            end: { line: index + 3 }
          }
        }
      };
    });
    const result = renderProjectHtmlDocument({
      project: {
        name: "Portal Scale Fixture"
      },
      entries
    });
    const indexHtml = result.files.find((file) => file.path === "index.html")?.contents ?? "";
    const rootShard = result.files.find((file) => file.path === "navigation/root.json")?.contents ?? "";

    expect(result.files.filter((file) => file.path.startsWith("entries/"))).toHaveLength(3000);
    expect(result.files.filter((file) => file.path.startsWith("pages/") && file.path !== "pages/index.html")).toHaveLength(3000);
    expect(result.files.some((file) => file.path === "pages/index.html")).toBe(true);
    expect(result.files.some((file) => file.path === "search/index.json")).toBe(true);
    expect(result.files.some((file) => file.path === "relations/project.json")).toBe(true);
    expect(indexHtml.length).toBeLessThan(30000);
    expect(indexHtml).not.toContain("Method2999");
    expect(indexHtml).not.toContain("data-hia-project-entry=\"dotnet\"");
    expect(rootShard.length).toBeLessThan(1000);
    expect(rootShard).toContain("\"id\": \"view:dotnet\"");
    expect(rootShard).not.toContain("Method2999");
  });

  it("renders PowerShell as a first-class project view", () => {
    const result = renderProjectHtmlDocument({
      project: {
        name: "Ops Script Project",
        defaultLocale: "zh-CN",
        locales: ["zh-CN", "en"]
      },
      entries: [
        {
          id: "ps:deploy",
          name: "Invoke-PortalDeploy",
          kind: "powershell-function",
          view: "powershell",
          summary: "部署 Portal 资源。",
          source: {
            path: "scripts/deploy.ps1",
            language: "powershell",
            range: { start: { line: 12 }, end: { line: 48 } }
          }
        }
      ]
    }, {
      projectSite: {
        layout: "single-page"
      }
    });
    const html = result.files[0]?.contents ?? "";

    expect(result.manifest.project?.views).toEqual(["all", "powershell"]);
    expect(result.manifest.project?.entryCounts).toMatchObject({ all: 1, powershell: 1 });
    expect(html).toContain("data-hia-project-view=\"powershell\"");
    expect(html).toContain("data-hia-project-entry=\"powershell\"");
    expect(html).toContain("PowerShell");
    expect(html).toContain("Invoke-PortalDeploy");
  });

  it("renders the read-only generated binding projection without source bodies or ordinary map embedding", () => {
    const generatedDocumentationBindingProjection = {
      contract: "generated-documentation-binding-host-projection",
      contractVersion: "0.1.0-draft",
      bindingContract: "generated-documentation-binding",
      bindingContractVersion: "0.1.0-draft",
      status: "available",
      sidecarId: "sidecar:pug:colors",
      privacy: {
        diagnosticFreeTextIncluded: false,
        localsValueIncluded: false,
        sidecarPathIncluded: false,
        sourceBodyIncluded: false,
        sourceRangeIncluded: false,
        sourcesContentPolicy: "none"
      },
      summary: {
        bindingCount: 1,
        diagnosticCount: 0,
        expansionCount: 2,
        linkedDocSourceMapEntryCount: 1,
        stableInstanceKeyCount: 2,
        targetCount: 2,
        unlinkedBindingCount: 0
      },
      diagnostics: [],
      bindings: [{
        id: "binding:pug:colors:name",
        sourceIntent: { kind: "documentation-field", field: "description" },
        bindingRef: { kind: "member-path", memberPath: ["name"], rootDeclarationId: "decl:pug:colors:value" },
        scopeId: "gdb-scope/v1/pug/source-colors#each/value",
        quality: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-and-generated" },
        composition: { contributionCount: 0, relation: "none", mergePolicy: "not-applicable" },
        docSourceMapEntryIds: ["entry:colorswatch"],
        expansions: [{
          id: "expansion:pug:colors:sky",
          order: 0,
          instanceKey: { displayKey: "gdb-key/v1/string:sky", privacySafe: true, status: "stable" },
          quality: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-and-generated" },
          targetIds: ["target:pug:colors:sky"]
        }],
        targets: [{
          id: "target:pug:colors:sky",
          docSourceMapEntryIds: ["entry:colorswatch"],
          identity: { kind: "generated-html-element", selector: "article.swatch", symbolId: "element:ColorSwatch" },
          quality: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-and-generated" }
        }]
      }]
    } as const;
    const result = renderProjectHtmlDocument({
      project: { name: "Generated Binding Fixture" },
      entries: [{ id: "entry:colorswatch", name: "ColorSwatch", kind: "element", view: "html" }],
      generatedDocumentationBindingProjection
    });
    const indexHtml = result.files.find((file) => file.path === "index.html")?.contents ?? "";
    const projectIndex = result.files.find((file) => file.path === "project-index.json")?.contents ?? "";

    expect(indexHtml).toContain("Generated Documentation Bindings / 生成式文档绑定");
    expect(indexHtml).toContain("binding:pug:colors:name");
    expect(indexHtml).toContain("gdb-key/v1/string:sky");
    expect(indexHtml).toContain("article.swatch");
    expect(indexHtml).toContain("sourcesContent");
    expect(projectIndex).toContain("generatedDocumentationBindingProjection");
    expect(projectIndex).not.toContain("sourcesContent\": [");
  });

  it("exports and resolves the neutral Portal IA contract with fail-closed draft boundaries", () => {
    expect(DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA.properties.contract.const)
      .toBe(DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT);
    expect(DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA.properties.contractVersion.const)
      .toBe(DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION);
    expect(DOCUMENTATION_PORTAL_TOPIC_SECTIONS).toEqual([
      "summary",
      "declaration",
      "metadata",
      "contract",
      "coverage",
      "provenance",
      "members",
      "relations",
      "source",
      "diagnostics"
    ]);

    expect(() => renderProjectHtmlDocument(createWp85TypeScriptPortalFixture(), {
      projectSite: {
        layout: "single-page",
        informationArchitecture: {},
        uiLocale: "en"
      }
    })).toThrow(/HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED/u);
    expect(() => renderProjectHtmlDocument(createWp85TypeScriptPortalFixture(), {
      projectSite: {
        informationArchitecture: {
          contractVersion: "0.2.0-draft" as "0.1.0-draft"
        },
        uiLocale: "en"
      }
    })).toThrow(/HIA_PORTAL_IA_UNSUPPORTED/u);

    const unsafeSemanticPath = createWp85TypeScriptPortalFixture();
    unsafeSemanticPath.entries[0]!.semanticPath = [
      { kind: "repository", id: "private-path", label: "C:\\private\\fixture" }
    ];
    expect(() => renderProjectHtmlDocument(unsafeSemanticPath, {
      projectSite: { informationArchitecture: {}, uiLocale: "en" }
    })).toThrow(/HIA_PORTAL_IA_SEMANTIC_PATH_INVALID/u);

    const leakedContinuity = createWp85TypeScriptPortalFixture() as RenderProjectHtmlInput & {
      documentationContinuity: Record<string, unknown>;
    };
    leakedContinuity.documentationContinuity = {
      contract: "target-documentation-continuity",
      contractVersion: "0.1.0-draft",
      status: "accepted",
      entries: { addedCount: 0, baselineCount: 16, currentCount: 16, removedCount: 0, unchangedCount: 16 },
      requiredOutputsPreserved: true,
      semantics: {
        resolution: "evidence-summary-pair-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-comparison"
      },
      sourceBody: "must-not-cross-the-boundary"
    };
    expect(() => renderProjectHtmlDocument(leakedContinuity, {
      projectSite: { informationArchitecture: {}, uiLocale: "en" }
    })).toThrow(/HIA_PORTAL_IA_CONTINUITY_INVALID/u);
  });

  it("keeps canonical identity stable across all eight Portal IA combinations", () => {
    const fixture = createWp85TypeScriptPortalFixture();
    const baselines: Array<{
      ids: string[];
      canonicalPaths: string[];
      relationCount: number;
      searchIds: string[];
      sourceLinkCount: number;
    }> = [];
    const groupings = ["entry", "semantic-container"] as const;
    const loadings = ["lazy", "eager"] as const;
    const placements = ["separate", "with-parent"] as const;

    for (const contentGrouping of groupings) {
      for (const loadingStrategy of loadings) {
        for (const memberPlacement of placements) {
          const result = renderProjectHtmlDocument(fixture, {
            projectSite: {
              layout: "split-site",
              uiLocale: "en",
              informationArchitecture: {
                contract: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
                contractVersion: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
                contentGrouping,
                loadingStrategy,
                memberPlacement
              }
            }
          });
          const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
            entries: Array<{
              contentPath: string;
              id: string;
              memberAnchor: string;
              presentationPath: string;
              semanticPath?: unknown[];
              source?: { linkUrl?: string };
            }>;
            site?: { informationArchitecture?: { contentGrouping: string; loadingStrategy: string; memberPlacement: string } };
          };
          const searchIndex = JSON.parse(result.files.find((file) => file.path === "search/index.json")?.contents ?? "{}") as {
            entries: Array<{ id: string; contentPath: string; presentationPath: string; memberAnchor: string }>;
          };
          const relationIndex = JSON.parse(result.files.find((file) => file.path === "relations/project.json")?.contents ?? "{}") as {
            relationCount: number;
          };
          const rootShard = JSON.parse(result.files.find((file) => file.path === "navigation/root.json")?.contents ?? "{}") as {
            children?: Array<{ children?: unknown[]; childrenPath?: string }>;
          };
          const parent = projectIndex.entries.find((entry) => entry.id === "ts:r0:p0:e0");
          const member = projectIndex.entries.find((entry) => entry.id === "ts:r0:p0:e1");

          expect(projectIndex.site?.informationArchitecture).toMatchObject({
            contentGrouping,
            loadingStrategy,
            memberPlacement
          });
          expect(projectIndex.entries.every((entry) => entry.semanticPath && entry.memberAnchor === entry.id)).toBe(true);
          expect(result.files.filter((file) => file.path.startsWith("entries/"))).toHaveLength(16);
          expect(result.files.some((file) => file.path === "content/eager.json")).toBe(loadingStrategy === "eager");
          expect(result.files.some((file) => file.path.startsWith("semantic-containers/")))
            .toBe(contentGrouping === "semantic-container");
          expect(Boolean(rootShard.children?.[0]?.children)).toBe(loadingStrategy === "eager");
          expect(Boolean(rootShard.children?.[0]?.childrenPath)).toBe(loadingStrategy === "lazy");
          expect(member?.presentationPath === parent?.presentationPath).toBe(memberPlacement === "with-parent");
          expect(result.files.find((file) => file.path === "index.html")?.contents).not.toContain("role=\"tree\"");

          baselines.push({
            ids: projectIndex.entries.map((entry) => entry.id).sort(),
            canonicalPaths: projectIndex.entries.map((entry) => entry.contentPath).sort(),
            relationCount: relationIndex.relationCount,
            searchIds: searchIndex.entries.map((entry) => entry.id).sort(),
            sourceLinkCount: projectIndex.entries.filter((entry) => entry.source?.linkUrl).length
          });
        }
      }
    }

    expect(baselines).toHaveLength(8);
    for (const candidate of baselines.slice(1)) {
      expect(candidate).toEqual(baselines[0]);
    }
  });

  it("renders manifest semantic hierarchy, fixed topic order, localized unavailable state, and metadata-only continuity", () => {
    const fixture = createWp85TypeScriptPortalFixture();
    fixture.documentationContinuity = {
      contract: "target-documentation-continuity",
      contractVersion: "0.1.0-draft",
      status: "accepted",
      entries: {
        addedCount: 1,
        baselineCount: 15,
        currentCount: 16,
        removedCount: 0,
        unchangedCount: 15
      },
      requiredOutputsPreserved: true,
      semantics: {
        resolution: "evidence-summary-pair-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-comparison"
      }
    };
    const result = renderProjectHtmlDocument(fixture, {
      projectSite: {
        uiLocale: "zh-CN",
        informationArchitecture: {
          contentGrouping: "semantic-container",
          loadingStrategy: "eager",
          memberPlacement: "with-parent"
        }
      }
    });
    const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      navigationTree?: Array<{ children?: unknown[] }>;
      documentationContinuity?: { contract?: string; entries?: { currentCount?: number } };
    };
    const serializedTree = JSON.stringify(projectIndex.navigationTree);
    const parentPath = (JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      entries: Array<{ id: string; contentPath: string }>;
    }).entries.find((entry) => entry.id === "ts:r0:p0:e0")?.contentPath;
    const parentTopic = result.files.find((file) => file.path === parentPath)?.contents ?? "";
    const orderedPresentSections = ["summary", "metadata", "contract", "coverage", "provenance", "members", "relations", "source"];
    let previousIndex = -1;

    expect(serializedTree).toContain('"kind":"repository"');
    expect(serializedTree).toContain('"kind":"package"');
    expect(serializedTree).toContain('"kind":"layer"');
    expect(serializedTree).not.toContain('"kind":"source-root"');
    expect(serializedTree).not.toContain('"kind":"relation"');
    expect(projectIndex.documentationContinuity).toMatchObject({
      contract: "target-documentation-continuity",
      entries: { currentCount: 16 }
    });
    expect(parentTopic).toContain('data-hia-ui-message="portal.metadata.productversion">产品版本</span></dt><dd>2026.8');
    expect(parentTopic).toContain("target-documentation-continuity@0.1.0-draft");
    expect(parentTopic).toContain("id=\"ts:r0:p0:e1\"");
    for (const section of orderedPresentSections) {
      const currentIndex = parentTopic.indexOf(`data-hia-topic-section=\"${section}\"`);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }

    const unavailable = renderProjectHtmlDocument(createWp85TypeScriptPortalFixture(), {
      projectSite: {
        uiLocale: "zh-CN",
        informationArchitecture: {}
      }
    }).files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    expect(unavailable).toContain("暂不可用");
  });

  it("projects owner-adoption readiness only through explicit Portal IA metadata", () => {
    const fixture = createWp85TypeScriptPortalFixture();
    fixture.ownerAdoption = {
      contract: "target-owner-adoption-kit",
      contractVersion: "0.1.0-draft",
      projection: "portal-metadata-only",
      status: "ready-for-owner-review",
      targetFamily: "workspace-container",
      ownerInput: { submitted: true, consent: "recorded-for-review" },
      contracts: { requiredCount: 5, providedCount: 5, missingCount: 0 },
      workspaceHandoff: { repositoryOwnerCount: 3, handoffEdgeCount: 2, state: "owner-review-required" },
      semantics: {
        resolution: "owner-input-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-owner-kit"
      }
    };
    const result = renderProjectHtmlDocument(fixture, {
      projectSite: { informationArchitecture: {}, uiLocale: "en" }
    });
    const projectIndexText = result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}";
    const projectIndex = JSON.parse(projectIndexText) as {
      ownerAdoption?: { status?: string; targetId?: string; trialId?: string };
      entries: Array<{ id: string; contentPath: string }>;
    };
    const topicPath = projectIndex.entries[0]?.contentPath;
    const topic = result.files.find((file) => file.path === topicPath)?.contents ?? "";

    expect(projectIndex.ownerAdoption).toMatchObject({ status: "ready-for-owner-review" });
    expect(projectIndex.ownerAdoption).not.toHaveProperty("targetId");
    expect(projectIndex.ownerAdoption).not.toHaveProperty("trialId");
    expect(topic).toContain('data-hia-ui-message="portal.coverage.ownerreadiness">Owner review readiness</span></dt><dd>ready-for-owner-review');
    expect(topic).toContain('data-hia-ui-message="portal.coverage.handoffs">Repository owners / handoff edges</span></dt><dd>3 / 2');
    expect(topic).toContain("target-owner-adoption-kit@0.1.0-draft");
  });

  it("fails closed when owner-adoption metadata bypasses IA or carries unknown fields", () => {
    const fixture = createWp85TypeScriptPortalFixture();
    fixture.ownerAdoption = {
      contract: "target-owner-adoption-kit",
      contractVersion: "0.1.0-draft",
      projection: "portal-metadata-only",
      status: "deferred-owner-input-missing",
      targetFamily: "workspace-container",
      ownerInput: { submitted: false, consent: "not-recorded" },
      contracts: { requiredCount: 5, providedCount: 0, missingCount: 5 },
      semantics: {
        resolution: "owner-input-not-received",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-owner-kit"
      }
    };

    expect(() => renderProjectHtmlDocument(fixture)).toThrow(/HIA_PORTAL_IA_OWNER_ADOPTION_REQUIRES_IA/u);

    const leaked = fixture.ownerAdoption as typeof fixture.ownerAdoption & { sourceBody?: string };
    leaked.sourceBody = "must-not-cross-the-boundary";
    expect(() => renderProjectHtmlDocument(fixture, {
      projectSite: { informationArchitecture: {}, uiLocale: "en" }
    })).toThrow(/HIA_PORTAL_IA_OWNER_ADOPTION_INVALID/u);
  });

  it("keeps the HIA-owned 2951-entry DotNet IA baseline fragmented and lazy", () => {
    const entries: RenderProjectEntry[] = Array.from({ length: 2951 }, (_, index) => ({
      id: `dotnet:wp85:${index}`,
      name: `Method${index}`,
      kind: "dotnet-method",
      view: "dotnet",
      symbolId: `M:Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}.Method${index}`,
      hierarchy: {
        assembly: "Fixture",
        namespace: `Fixture.Feature${Math.floor(index / 50)}`,
        containingType: `Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}`
      },
      source: {
        path: `src/Fixture/Feature${Math.floor(index / 50)}/Type${Math.floor(index / 50)}.cs`,
        language: "csharp",
        range: { start: { line: index + 1 } },
        confidence: "high"
      },
      sourceUsability: {
        relationId: `dotnetdoc:source-relation:wp95-${index}`,
        resolution: "resolved",
        confidence: "high",
        provenance: {
          producer: "@hia-doc/dotnetdoc-runner",
          activity: "xml-doc-to-csharp-source",
          contract: "dotnetdoc-source-relation",
          contractVersion: "0.1.0-draft"
        },
        projectIdentity: {
          id: "dotnet-project:fixtures-source-portal.components-portal.components.csproj",
          path: "fixtures/source/Portal.Components/Portal.Components.csproj",
          policy: "project-relative-owner-resolved"
        },
        privacy: {
          sourcesContentPolicy: "none",
          sourcePreviewPolicy: "none",
          embedsSourcesContent: false
        }
      },
      semanticPath: [
        { kind: "repository", id: "dotnet-fixture", label: "DotNet Synthetic Fixture" },
        { kind: "assembly", id: "fixture", label: "Fixture" }
      ]
    }));
    const leakedSourceUsability = entries[0].sourceUsability as NonNullable<RenderProjectEntry["sourceUsability"]> & { sourceBody?: string };
    leakedSourceUsability.sourceBody = "must-not-cross-the-boundary";
    const result = renderProjectHtmlDocument({
      project: { name: "W-P85 DotNet Scale Fixture" },
      entries
    }, {
      projectSite: {
        uiLocale: "en",
        informationArchitecture: {
          contentGrouping: "entry",
          loadingStrategy: "lazy",
          memberPlacement: "separate"
        }
      }
    });
    const rootShard = result.files.find((file) => file.path === "navigation/root.json")?.contents ?? "";
    const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      entries?: RenderProjectNavigationEntry[];
    };
    const firstTopic = result.files.find((file) => file.path === projectIndex.entries?.[0]?.contentPath)?.contents ?? "";

    expect(result.files.filter((file) => file.path.startsWith("entries/"))).toHaveLength(2951);
    expect(result.files.some((file) => file.path === "content/eager.json")).toBe(false);
    expect(rootShard.length).toBeLessThan(1000);
    expect(rootShard).toContain('"id": "view:dotnet"');
    expect(rootShard).not.toContain("Method2950");
    expect(projectIndex.entries).toHaveLength(2951);
    expect(projectIndex.entries?.every((entry) => entry.sourceUsability?.resolution === "resolved")).toBe(true);
    expect(projectIndex.entries?.every((entry) => entry.sourceUsability?.projectIdentity?.policy === "project-relative-owner-resolved")).toBe(true);
    expect(projectIndex.entries?.every((entry) => entry.sourceUsability?.privacy.sourcesContentPolicy === "none")).toBe(true);
    expect(firstTopic).toContain('data-hia-ui-message="portal.source.identitypolicy">Identity policy</span></dt><dd>project-relative-owner-resolved');
    expect(JSON.stringify(projectIndex)).not.toContain("must-not-cross-the-boundary");
    expect(result.files.some((file) => file.contents.includes("must-not-cross-the-boundary"))).toBe(false);
  });
});
