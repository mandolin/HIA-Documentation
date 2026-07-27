import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import {
  HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
  HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
  HIA_PROJECT_RELATION_GRAPH_CONTRACT,
  HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION,
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
    };
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest.project?.views).toEqual(["all", "dotnet", "js", "css", "html"]);
    expect(result.manifest.project?.entryCounts).toMatchObject({ all: 4, js: 1, css: 1, html: 1, dotnet: 1 });
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
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("css-component-style");
    expect(html).toContain("html-component");
    expect(html).toContain("maps/button.docmap.json");
    expect(html).toContain("maps/button.js.map");
    expect(html).toContain("1/1 linked");
    expect(html).toContain("sourcesContentPolicy=none");
    expect(html).toContain("Source Preview src/profile.js:12-14");
    expect(html).toContain("function buildProfileSummary(profile)");
    expect(html).not.toContain("data-hia-project-search-text=\"dotnet:portal-menu portalmenu dotnet-type portal menu");
    expect(html).toContain("https://example.test/src/profile.js#L12");
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
            range: { start: { line: 1 }, end: { line: 40 } }
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
    const projectIndex = JSON.parse(result.files.find((file) => file.path === "project-index.json")?.contents ?? "{}") as {
      site?: { layout?: string; sourcePresentation?: string };
      navigationTree?: Array<{ id: string; children?: unknown[] }>;
    };
    const rootShard = JSON.parse(result.files.find((file) => file.path === "navigation/root.json")?.contents ?? "{}") as {
      children?: Array<{ id: string; children?: unknown[]; childrenPath?: string }>;
    };
    const entryFiles = result.files.filter((file) => file.path.startsWith("entries/"));

    expect(paths).toContain("navigation/root.json");
    expect(paths).toContain("search/index.json");
    expect(paths).toContain("relations/project.json");
    expect(entryFiles).toHaveLength(2);
    expect(projectIndex.site).toEqual(expect.objectContaining({
      layout: "split-site",
      sourcePresentation: "link"
    }));
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
    expect(indexHtml).toContain("fetch(contentPath");
    expect(indexHtml).not.toContain("data-hia-project-entry=\"js\"");
    expect(indexHtml).not.toContain("function buildProfileSummary(profile)");
    expect(entryFiles.find((file) => file.contents.includes("buildProfileSummary"))?.contents)
      .toContain("https://example.test/src/profile.js#L12");
    expect(entryFiles.find((file) => file.contents.includes("buildProfileSummary"))?.contents)
      .not.toContain("function buildProfileSummary(profile)");
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
    const entryHtml = (presentation: "none" | "link" | "embed" | "fetch") => {
      const result = renderProjectHtmlDocument(input, {
        projectSite: {
          source: {
            presentation
          }
        }
      });
      return result.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
    };

    expect(entryHtml("none")).not.toContain("https://example.test");
    expect(entryHtml("none")).not.toContain("function sourceMode()");
    expect(entryHtml("link")).toContain("https://example.test/src/source-mode.js#L3");
    expect(entryHtml("link")).not.toContain("function sourceMode()");
    expect(entryHtml("embed")).toContain("function sourceMode()");
    expect(entryHtml("embed")).not.toContain("data-hia-source-fetch");
    expect(entryHtml("fetch")).toContain("data-hia-source-fetch=\"https://raw.example.test/src/source-mode.js\"");
    expect(entryHtml("fetch")).not.toContain("function sourceMode()");
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
});
