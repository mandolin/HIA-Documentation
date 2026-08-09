import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isCliEntrypoint, runCli, type CliIo } from "./index.js";

describe("@hia-doc/cli", () => {
  it("prints help", async () => {
    const messages: string[] = [];
    const exitCode = await runCli(["--help"], createTestIo(messages));

    expect(exitCode).toBe(0);
    expect(messages.join("\n")).toContain("hia docs build");
    expect(messages.join("\n")).toContain("hia docs evidence");
    expect(messages.join("\n")).toContain("hia docs adoption-kit");
    expect(messages.join("\n")).toContain("hia docs html-authoring-verify");
    expect(messages.join("\n")).toContain("hia browser panel");
  });

  it("builds the shared fixture document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "--",
        "docs",
        "build",
        "--input",
        "fixtures/basic.hia.json",
        "--out",
        outDir,
        "--locale",
        "en"
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        files: Array<{ path: string; role: string }>;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 4 file");
      expect(html).toContain("HIA Basic Fixture");
      expect(html).toContain("buildProfileSummary");
      expect(html).toContain("Builds a user profile summary.");
      expect(html).toContain("assets/hia-default.css");
      expect(manifest.files.map((file) => file.path)).toEqual([
        "index.html",
        "assets/hia-default.css",
        "assets/hia-default.js",
        "hia-manifest.json"
      ]);
      expect(manifest.files.at(-1)?.role).toBe("manifest");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("reports validator diagnostics for invalid input", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-invalid-"));
    const inputPath = path.join(root, "invalid.hia.json");
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      await writeFile(inputPath, JSON.stringify({ schemaVersion: "0.2.0", title: "", symbols: [] }), "utf8");
      const exitCode = await runCli(["docs", "build", "--input", inputPath, "--out", outDir], createTestIo(messages));

      expect(exitCode).toBe(1);
      expect(messages.join("\n")).toContain("[error:HIA_FIELD_MISSING]");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds a unified project page from a project manifest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-project-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-mixed.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const navigationIndex = JSON.parse(await readFile(path.join(outDir, "project-index.json"), "utf8")) as {
        contract: string;
        entries: Array<{ id: string; source?: { preview?: unknown } }>;
        navigationTree?: Array<{ id: string; label: string; children?: Array<{ label: string }> }>;
      };
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: {
          views: string[];
          entryCounts: Record<string, number>;
          navigationIndex?: { path: string; entryCount: number };
        };
        build?: {
          mode: string;
          inputs: Array<{ kind: string; path: string }>;
        };
        docSourceMaps?: Array<{ path: string }>;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/Generated \d+ file\(s\)/u);
      expect(html).toContain("Mixed Project Documentation");
      expect(html).toContain("data-hia-project-search");
      expect(html).toContain("data-hia-project-view=\"js\"");
      expect(html).toContain("data-hia-project-view=\"css\"");
      expect(html).toContain("data-hia-project-view=\"html\"");
      expect(html).not.toContain("data-hia-project-entry=");
      expect(entryHtml).toContain("greet");
      expect(entryHtml).not.toContain("Source Preview examples/basic/src/greet.js:17-22");
      expect(entryHtml).not.toContain("function greet(name)");
      expect(entryHtml).toContain("css-component-style");
      expect(entryHtml).toContain("html-component");
      expect(entryHtml).toContain("project-mixed-alert.docmap.json");
      expect(entryHtml).toContain("Doc Source Map");
      expect(entryHtml).toContain("entry:html:alert");
      expect(entryHtml).toContain("[data-component=&quot;Alert&quot;]");
      expect(manifest.project?.views).toEqual(["all", "js", "css", "html"]);
      expect(manifest.project?.entryCounts).toMatchObject({ js: 2, css: 2, html: 2 });
      expect(manifest.project?.navigationIndex).toEqual({
        contract: "hia-project-navigation-index",
        contractVersion: "0.1.0-draft",
        entryCount: 6,
        path: "project-index.json"
      });
      expect(navigationIndex.contract).toBe("hia-project-navigation-index");
      expect(navigationIndex.entries).toHaveLength(6);
      expect(navigationIndex.entries.some((entry) => entry.source?.preview)).toBe(false);
      expect(navigationIndex.navigationTree?.map((node) => node.id)).toEqual(["view:js", "view:css", "view:html"]);
      expect(html).toContain("hia-project-hierarchy");
      expect(manifest.build?.mode).toBe("project");
      expect(manifest.build?.inputs.map((input) => input.kind)).toEqual([
        "jsdoc-integration",
        "htmdoc-extraction",
        "cssdoc-extraction",
        "doc-source-map"
      ]);
      expect(manifest.docSourceMaps?.[0]?.path).toBe("project-mixed-alert.docmap.json");
      expect(manifest.docSourceMaps?.[0]).toMatchObject({
        artifactCount: 1,
        entryCount: 1,
        linkedEntryCount: 1,
        sourceCount: 1,
        sourceMapCount: 0,
        sourcesContentPolicy: "none",
        status: "available",
        unresolvedEntryCount: 0
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("projects Portal IA config and manifest semantic paths into renderer output", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-portal-ia-"));
    const outDir = path.join(root, "docs");
    const configPath = path.join(root, "hia.config.json");
    const manifestPath = path.join(root, "project.hia-project.json");
    const inputPath = path.join(root, "basic.hia.json");
    const messages: string[] = [];

    try {
      await writeFile(inputPath, await readFile(path.resolve("fixtures/basic.hia.json"), "utf8"), "utf8");
      await writeFile(configPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          renderer: {
            projectLayout: "split-site",
            uiLocale: "zh-CN",
            informationArchitecture: {
              contract: "documentation-portal-information-architecture",
              contractVersion: "0.1.0-draft",
              contentGrouping: "semantic-container",
              loadingStrategy: "eager",
              memberPlacement: "with-parent"
            }
          }
        }
      }), "utf8");
      await writeFile(manifestPath, JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: {
          name: "CLI Portal IA Fixture",
          productVersion: "2026.8"
        },
        inputs: [{
          kind: "hia-document",
          path: "basic.hia.json",
          domain: "js",
          semanticPath: [
            { kind: "repository", id: "main-repo", label: "Main Repository" },
            { kind: "package", id: "core", label: "@hia-doc/core" },
            { kind: "layer", id: "protocol", label: "Protocol Layer" }
          ]
        }]
      }), "utf8");

      const exitCode = await runCli([
        "docs",
        "build",
        "--config",
        configPath,
        "--project-manifest",
        manifestPath,
        "--out",
        outDir
      ], createTestIo(messages));
      const projectIndex = JSON.parse(await readFile(path.join(outDir, "project-index.json"), "utf8")) as {
        entries: Array<{ semanticPath?: Array<{ kind: string; id: string }> }>;
        navigationTree: unknown[];
        site?: { informationArchitecture?: { contract?: string; loadingStrategy?: string } };
      };
      const rendererManifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: { informationArchitecture?: { contract?: string; contractVersion?: string } };
      };

      expect(exitCode).toBe(0);
      expect(projectIndex.site?.informationArchitecture).toMatchObject({
        contract: "documentation-portal-information-architecture",
        loadingStrategy: "eager"
      });
      expect(projectIndex.entries.every((entry) => entry.semanticPath?.[0]?.kind === "repository")).toBe(true);
      expect(JSON.stringify(projectIndex.navigationTree)).toContain('"kind":"repository"');
      expect(rendererManifest.project?.informationArchitecture).toMatchObject({
        contract: "documentation-portal-information-architecture",
        contractVersion: "0.1.0-draft"
      });
      expect(await readFile(path.join(outDir, "content/eager.json"), "utf8")).toContain("documentation-portal-eager-fragment-index");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("consumes a validated HIA source-comment projection without adding a source reader", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-source-comment-"));
    const outDir = path.join(root, "docs");
    const configPath = path.join(root, "hia.config.json");
    const manifestPath = path.join(root, "project.hia-project.json");
    const inputPath = path.join(root, "source-comments.hia.json");
    const messages: string[] = [];

    try {
      const document = JSON.parse(await readFile(path.resolve("fixtures/basic.hia.json"), "utf8")) as {
        id: string;
        symbols: Array<{ id: string; metadata?: Record<string, unknown> }>;
      };
      const symbol = document.symbols.find((candidate) => candidate.id === "function:buildProfileSummary");
      expect(symbol).toBeDefined();
      // <lang><zh-CN>fixture 直接提供已完成的中性投影，CLI 不获得源码路径读取或注释解析权限。</zh-CN><en>The fixture supplies a completed neutral projection directly; the CLI gains no source-path read or comment-parser authority.</en></lang>
      symbol!.metadata = {
        sourceCommentProjection: {
          contract: "documentation-source-comment-projection",
          contractVersion: "0.1.0-draft",
          status: "ready",
          projectionId: "projection.profile.summary",
          source: {
            documentId: document.id,
            symbolId: symbol!.id,
            sourceId: "source.profile.service"
          },
          requestedLocale: "zh-CN",
          defaultLocale: "en",
          fallbackChain: ["zh-CN", "zh", "en"],
          contentPolicy: "explicit-projected-text",
          privacy: {
            sourcesContentPolicy: "none",
            sourceBodyIncluded: false,
            rawCommentIncluded: false,
            projectedCommentTextIncluded: true,
            richTextPolicy: "plain-text-only"
          },
          entries: [{
            commentId: "comment.summary",
            stableCommentKey: `projection.profile.summary::${document.id}::${symbol!.id}::source.profile.service::comment.summary`,
            kind: "documentation",
            order: 0,
            requestedLocale: "zh-CN",
            resolvedLocale: "zh-CN",
            resolution: "exact",
            confidence: "declared",
            provenance: { kind: "structured-source-comment", sourceLocale: "zh-CN" },
            projectedText: "从 CLI 安全显示 <profile> 注释。",
            diagnosticCodes: []
          }],
          diagnostics: []
        }
      };
      await writeFile(inputPath, JSON.stringify(document), "utf8");
      await writeFile(configPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          renderer: {
            informationArchitecture: {},
            sourceCommentProjection: {
              contract: "documentation-source-comment-projection",
              contractVersion: "0.1.0-draft",
              contentPolicy: "explicit-projected-text",
              locale: "zh-CN"
            }
          }
        }
      }), "utf8");
      await writeFile(manifestPath, JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: { name: "CLI Source Comment Fixture" },
        inputs: [{ kind: "hia-document", path: "source-comments.hia.json", domain: "js" }]
      }), "utf8");

      const exitCode = await runCli([
        "docs", "build", "--config", configPath, "--project-manifest", manifestPath, "--out", outDir
      ], createTestIo(messages));
      const projectIndexText = await readFile(path.join(outDir, "project-index.json"), "utf8");
      const projectIndex = JSON.parse(projectIndexText) as {
        entries: Array<{ name: string; contentPath: string; sourceCommentProjection?: { entryCount: number } }>;
      };
      const projectedEntry = projectIndex.entries.find((entry) => entry.name === "buildProfileSummary");
      const entryHtml = await readFile(path.join(outDir, projectedEntry!.contentPath), "utf8");

      expect(exitCode).toBe(0);
      expect(projectedEntry?.sourceCommentProjection?.entryCount).toBe(1);
      expect(entryHtml).toContain("从 CLI 安全显示 &lt;profile&gt; 注释。");
      expect(projectIndexText).not.toContain("从 CLI 安全显示");
      expect(projectIndexText).not.toContain("projectedText");
      expect(projectIndexText).not.toMatch(/[A-Za-z]:\\/u);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds a .NET unified project page from a DotNetDoc HIA document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-dotnet-project-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-dotnet.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const navigationIndex = JSON.parse(await readFile(path.join(outDir, "project-index.json"), "utf8")) as {
        entries: Array<{ id: string; view: string; input?: { path?: string }; source?: { path?: string; language?: string } }>;
      };
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: {
          views: string[];
          entryCounts: Record<string, number>;
        };
        build?: {
          inputs: Array<{ kind: string; path: string; profile?: { profileId: string; layer?: string } }>;
        };
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/Generated \d+ file\(s\)/u);
      expect(html).toContain("DotNet Project Fixture Documentation");
      expect(html).toContain("data-hia-project-view=\"dotnet\"");
      expect(html).not.toContain("data-hia-project-entry=\"dotnet\"");
      expect(html).toContain(".NET");
      expect(entryHtml).toContain("PortalMenu");
      expect(entryHtml).toContain("dotnet-type");
      expect(entryHtml).toContain("dotnet-method");
      expect(entryHtml).toContain("src/Portal.Components/Navigation/PortalMenu.cs:8");
      expect(manifest.project?.views).toEqual(["all", "dotnet"]);
      expect(manifest.project?.entryCounts).toMatchObject({ all: 2, dotnet: 2 });
      expect(manifest.build?.inputs).toEqual([
        {
          kind: "hia-document",
          path: "project-dotnet.hia.json",
          profile: {
            profileId: "dotnetdoc",
            profileVersion: "0.1.0-draft",
            layer: "dotnet"
          },
          source: "manifest"
        }
      ]);
      expect(navigationIndex.entries).toHaveLength(2);
      expect(navigationIndex.entries.every((entry) => entry.view === "dotnet")).toBe(true);
      expect(navigationIndex.entries.every((entry) => entry.input?.path === "project-dotnet.hia.json")).toBe(true);
      expect(navigationIndex.entries.every((entry) => entry.source?.language === "csharp")).toBe(true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("runs configured producers before building a unified project page", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-producer-project-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-producer.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        build?: {
          inputs: Array<{ kind: string; path: string; producerId?: string; source?: string }>;
          producers?: Array<{ id: string; status: string; artifactCount: number }>;
        };
        project?: {
          entryCounts: Record<string, number>;
        };
      };

      expect(exitCode).toBe(0);
      expect(html).toContain("Producer Mixed Project Documentation");
      expect(entryHtml).toContain("Source-produced alert component.");
      expect(entryHtml).toContain("Source-produced alert styles.");
      expect(entryHtml).toContain(".hia-producers/mixed-source-fixture/alert.docmap.json");
      expect(entryHtml).toContain("Doc Source Map");
      expect(manifest.project?.entryCounts).toMatchObject({ css: 1, html: 1 });
      expect(manifest.build?.producers).toEqual([
        {
          id: "mixed-source-fixture",
          status: "success",
          artifactCount: 3
        }
      ]);
      expect(manifest.build?.inputs.map((input) => input.kind)).toEqual([
        "htmdoc-extraction",
        "cssdoc-extraction",
        "doc-source-map"
      ]);
      expect(manifest.build?.inputs.every((input) => input.source === "producer")).toBe(true);
      expect(await readFile(path.join(outDir, ".hia-producers", "mixed-source-fixture", "alert.htmdoc.json"), "utf8")).toContain("component:Alert");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("materializes existing producer-result inputs into a unified project page", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-producer-result-project-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-producer-result.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        build?: {
          inputs: Array<{ kind: string; path: string; producerId?: string; source?: string }>;
        };
        project?: {
          entryCounts: Record<string, number>;
        };
      };
      const projectIndex = JSON.parse(await readFile(path.join(outDir, "project-index.json"), "utf8")) as {
        entries: Array<{
          id: string;
          source?: { path?: string; language?: string };
          sourceUsability?: {
            relationId: string;
            resolution: string;
            confidence: string;
            projectIdentity?: { id: string; path: string; policy: string };
            provenance: { producer: string; activity: string; contract: string; contractVersion: string };
            privacy: { sourcesContentPolicy: string; sourcePreviewPolicy: string; embedsSourcesContent: boolean };
          };
          hierarchy?: { assembly?: string; namespace?: string; baseTypeIds?: string[]; interfaceIds?: string[] };
        }>;
        navigationTree?: Array<{
          id: string;
          label: string;
          children?: Array<{ label: string; children?: Array<{ label: string; entryId?: string }> }>;
        }>;
      };

      expect(exitCode).toBe(0);
      expect(html).toContain("Producer Result Project Documentation");
      expect(entryHtml).toContain("PortalSecurity");
      expect(entryHtml).toContain("Portal security helper surface produced by DotNetDoc.");
      expect(entryHtml).toContain("src/Portal.Components/PortalSecurity.cs:12");
      expect(entryHtml).toContain("<dt>Language</dt><dd>csharp</dd>");
      expect(entryHtml).toContain("Source Usability");
      expect(entryHtml).toContain("src/Portal.Components/Portal.Components.csproj");
      expect(entryHtml).toContain("project-relative-owner-resolved");
      expect(entryHtml).toContain("greet");
      const portalSecurityEntry = projectIndex.entries.find((entry) => entry.id.includes("portalsecurity"));
      expect(portalSecurityEntry?.source).toMatchObject({
        path: "src/Portal.Components/PortalSecurity.cs",
        language: "csharp"
      });
      expect(portalSecurityEntry?.sourceUsability).toEqual({
        relationId: "dotnetdoc:source-relation:t-portal.components.portalsecurity",
        resolution: "resolved",
        confidence: "high",
        provenance: {
          producer: "@hia-doc/dotnetdoc-runner",
          activity: "xml-doc-to-csharp-source",
          contract: "dotnetdoc-source-relation",
          contractVersion: "0.1.0-draft"
        },
        projectIdentity: {
          id: "dotnet-project:src-portal.components-portal.components.csproj",
          path: "src/Portal.Components/Portal.Components.csproj",
          policy: "project-relative-owner-resolved"
        },
        privacy: {
          sourcesContentPolicy: "none",
          sourcePreviewPolicy: "none",
          embedsSourcesContent: false
        }
      });
      expect(JSON.stringify(portalSecurityEntry)).not.toContain("sourceBody");
      expect(portalSecurityEntry?.hierarchy).toMatchObject({
        assembly: "Portal.Components",
        namespace: "Portal.Components",
        baseTypeIds: ["T:System.Object"],
        interfaceIds: ["T:Portal.Components.IPortalSecurity"]
      });
      expect(projectIndex.navigationTree?.find((node) => node.id === "view:dotnet")).toMatchObject({
        label: ".NET",
        children: [
          expect.objectContaining({
            kind: "assembly",
            children: [
              expect.objectContaining({
                label: "Portal",
                children: [
                  expect.objectContaining({
                    label: "Components"
                  })
                ]
              })
            ]
          })
        ]
      });
      expect(manifest.project?.entryCounts).toMatchObject({ dotnet: 1, js: 2, all: 3 });
      expect(manifest.build?.inputs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "documentation-producer-result",
          source: "manifest"
        }),
        expect.objectContaining({
          kind: "hia-document",
          path: "Portal.Components.hia.json",
          producerId: "dotnetdoc",
          source: "producer-result"
        }),
        expect.objectContaining({
          kind: "jsdoc-integration",
          source: "manifest"
        })
      ]));
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("uses producer results as relation-only augmentation without materializing document cards", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-producer-result-relations-only-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-producer-result-relations-only.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        build?: {
          inputs: Array<{
            artifactPolicy?: string;
            kind: string;
            source?: string;
          }>;
        };
        project?: {
          entryCounts: Record<string, number>;
        };
      };

      expect(exitCode).toBe(0);
      expect(entryHtml).toContain("src/Portal.Components/PortalSecurity.cs:12");
      expect(entryHtml).not.toContain("bin/Portal.Components.xml");
      expect(manifest.project?.entryCounts).toMatchObject({ dotnet: 1, all: 1 });
      expect(manifest.build?.inputs).toEqual([
        expect.objectContaining({
          kind: "hia-document",
          source: "manifest"
        }),
        expect.objectContaining({
          kind: "documentation-producer-result",
          artifactPolicy: "relations-only",
          source: "manifest"
        })
      ]);
      expect(manifest.build?.inputs.some((input) => input.source === "producer-result")).toBe(false);

      const evidencePath = path.join(root, "evidence.json");
      const evidenceExitCode = await runCli([
        "docs",
        "evidence",
        "--docs-dir",
        outDir,
        "--out",
        evidencePath
      ], createTestIo(messages));
      const evidence = JSON.parse(await readFile(evidencePath, "utf8")) as {
        inputs?: Array<{ artifactPolicy?: string; kind: string }>;
      };
      expect(evidenceExitCode).toBe(0);
      expect(evidence.inputs).toContainEqual(expect.objectContaining({
        kind: "documentation-producer-result",
        artifactPolicy: "relations-only"
      }));
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds clickable DotNet source links from declaration relations", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-dotnet-source-link-"));
    const outDir = path.join(root, "docs");
    const configPath = path.join(root, "hia.config.json");
    const messages: string[] = [];

    try {
      await writeFile(configPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          source: {
            presentation: "link",
            linkBaseUrl: "https://github.com/mandolin/HIA-ASPNETPortal/blob/main"
          }
        }
      }), "utf8");
      const exitCode = await runCli([
        "docs",
        "build",
        "--config",
        configPath,
        "--project-manifest",
        "fixtures/project-producer-result.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const entryHtml = await readGeneratedEntryHtml(outDir);

      expect(exitCode).toBe(0);
      expect(entryHtml).toContain(
        "https://github.com/mandolin/HIA-ASPNETPortal/blob/main/src/Portal.Components/PortalSecurity.cs#L12-L24"
      );
      expect(entryHtml).not.toContain("bin/Portal.Components.xml");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("supports explicit embedded and URL-fetched project source modes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-source-modes-"));
    const embedOutDir = path.join(root, "embed-docs");
    const fetchOutDir = path.join(root, "fetch-docs");
    const embedConfigPath = path.join(root, "hia.embed.config.json");
    const fetchConfigPath = path.join(root, "hia.fetch.config.json");
    const evidencePath = path.join(root, "embed-evidence.json");
    const messages: string[] = [];

    try {
      await writeFile(embedConfigPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          source: {
            presentation: "embed",
            defaultExpanded: false,
            maxLines: 80
          }
        }
      }), "utf8");
      await writeFile(fetchConfigPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          source: {
            presentation: "fetch",
            fetchBaseUrl: "https://raw.example.test/mandolin/project/main",
            fetchTrigger: "on-expand",
            maxLines: 80
          }
        }
      }), "utf8");

      const embedExitCode = await runCli([
        "docs",
        "build",
        "--config",
        embedConfigPath,
        "--project-manifest",
        "fixtures/project-mixed.hia-project.json",
        "--out",
        embedOutDir
      ], createTestIo(messages));
      const evidenceExitCode = await runCli([
        "docs",
        "evidence",
        "--docs-dir",
        embedOutDir,
        "--out",
        evidencePath
      ], createTestIo(messages));
      const fetchExitCode = await runCli([
        "docs",
        "build",
        "--config",
        fetchConfigPath,
        "--project-manifest",
        "fixtures/project-mixed.hia-project.json",
        "--out",
        fetchOutDir
      ], createTestIo(messages));
      const embedHtml = await readGeneratedEntryHtml(embedOutDir);
      const fetchHtml = await readGeneratedEntryHtml(fetchOutDir);
      const evidence = JSON.parse(await readFile(evidencePath, "utf8")) as {
        privacy?: {
          sourcePresentation?: string;
          sourcesContentPolicy?: string;
          sourceBodyPresent?: boolean;
        };
      };

      expect(embedExitCode).toBe(0);
      expect(evidenceExitCode).toBe(0);
      expect(fetchExitCode).toBe(0);
      expect(embedHtml).toContain("function greet(name)");
      expect(embedHtml).toContain("hia-source-preview hia-project-source-preview");
      expect(evidence.privacy).toMatchObject({
        sourcePresentation: "embed",
        sourcesContentPolicy: "explicit-embed",
        sourceBodyPresent: true
      });
      expect(fetchHtml).toContain(
        "data-hia-source-fetch=\"https://raw.example.test/mandolin/project/main/examples/basic/src/greet.js\""
      );
      expect(fetchHtml).toContain("data-hia-source-fetch-trigger=\"on-expand\"");
      expect(fetchHtml).toContain("data-hia-source-max-lines=\"80\"");
      expect(fetchHtml).toContain("data-hia-source-start=\"17\"");
      expect(fetchHtml).toContain("data-hia-source-end=\"22\"");
      expect(fetchHtml).not.toContain("data-hia-source-fetch-button");
      expect(fetchHtml).not.toContain("function greet(name)");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("creates a public-safe evidence summary for generated project docs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-docs-evidence-"));
    const outDir = path.join(root, "docs");
    const evidencePath = path.join(root, "documentation-evidence.json");
    const messages: string[] = [];

    try {
      const buildExitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-producer-result.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const evidenceExitCode = await runCli([
        "docs",
        "evidence",
        "--docs-dir",
        outDir,
        "--out",
        evidencePath
      ], createTestIo(messages));
      const evidence = JSON.parse(await readFile(evidencePath, "utf8")) as {
        contract: string;
        status: string;
        entries: {
          total: number;
          stableIds: string[];
          byView: Record<string, number>;
          byProfile: Record<string, number>;
        };
        coverage: {
          dotnetEntries: number;
          jsEntries: number;
          powershellEntries: number;
        };
        privacy: {
          sourcesContentPolicy: string;
          sourcesContentPresent: boolean;
          sourceBodyPresent: boolean;
          absolutePathLikeStringCount: number;
        };
      };

      expect(buildExitCode).toBe(0);
      expect(evidenceExitCode).toBe(0);
      expect(evidence.contract).toBe("hia-generated-docs-evidence-summary");
      expect(evidence.status).toBe("ready");
      expect(evidence.entries.total).toBe(3);
      expect(evidence.entries.stableIds).toHaveLength(3);
      expect(new Set(evidence.entries.stableIds).size).toBe(3);
      expect(evidence.entries.byView).toMatchObject({ dotnet: 1, js: 2 });
      expect(evidence.entries.byProfile).toMatchObject({ jsdoc: 2 });
      expect(evidence.coverage).toMatchObject({ dotnetEntries: 1, jsEntries: 2, powershellEntries: 0 });
      expect(evidence.privacy).toMatchObject({
        sourcePresentation: "link",
        sourcesContentPolicy: "none",
        sourcesContentPresent: false,
        sourceBodyPresent: false,
        absolutePathLikeStringCount: 0
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("prefers a producer HIA document over its equivalent extraction when aggregating a project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-preferred-hia-document-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-preferred-hia-document.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: { entryCounts?: Record<string, number> };
        build?: { inputs?: Array<{ kind: string; source?: string }> };
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/Generated \d+ file\(s\)/u);
      expect(entryHtml.match(/Profile card component\./g)).toHaveLength(1);
      expect(manifest.project?.entryCounts).toMatchObject({ html: 1, all: 1 });
      expect(manifest.build?.inputs).toEqual([
        expect.objectContaining({
          kind: "hia-document",
          source: "producer"
        })
      ]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("keeps building project docs when a configured producer fails in warn mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-producer-warn-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-producer-warn.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const entryHtml = await readGeneratedEntryHtml(outDir);
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        build?: {
          inputs: Array<{ kind: string; path: string; profile?: { profileId: string }; source?: string }>;
          producers?: Array<{ id: string; status: string; artifactCount: number }>;
        };
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("[warning:FIXTURE_PRODUCER_FAILED]");
      expect(messages.join("\n")).toContain("[warning:DOCUMENTATION_PRODUCER_EXECUTION_FAILED]");
      expect(html).toContain("Producer Warn Project Documentation");
      expect(entryHtml).toContain("greet");
      expect(manifest.build?.inputs).toEqual([
        {
          kind: "jsdoc-integration",
          path: "jsdoc-integration.basic.json",
          profile: {
            profileId: "jsdoc"
          },
          source: "manifest"
        }
      ]);
      expect(manifest.build?.producers).toEqual([
        {
          id: "failing-fixture",
          status: "failed",
          artifactCount: 0
        },
        {
          id: "throwing-fixture",
          status: "failed",
          artifactCount: 0
        }
      ]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds a static browser panel from project doc-source-map inputs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-browser-panel-"));
    const outDir = path.join(root, "browser-panel");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "browser",
        "panel",
        "--project-manifest",
        "fixtures/project-source-linked.hia-project.json",
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const payload = JSON.parse(await readFile(path.join(outDir, "browser-panel-payload.json"), "utf8")) as {
        entries: Array<{
          label: string;
          lookup: {
            generated?: { artifactPath?: string; position: { line: number; column?: number } };
            original?: { sourcePath: string; position: { line: number; column?: number } };
            status: string;
          };
        }>;
        summary: { entryCount: number; linkedEntryCount: number; sourceMapCount: number };
      };
      const manifest = JSON.parse(await readFile(path.join(outDir, "browser-panel-manifest.json"), "utf8")) as {
        entrypoint: string;
        payload: string;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 3 browser panel file");
      expect(html).toContain("data-hia-browser-panel");
      expect(html).toContain("Source Linked Browser Panel Fixture");
      expect(payload.summary).toMatchObject({
        entryCount: 1,
        linkedEntryCount: 1,
        sourceMapCount: 1
      });
      expect(payload.entries[0]).toMatchObject({
        label: "ts:function:renderProfileCard",
        lookup: {
          generated: {
            artifactPath: "dist/profile-card.js",
            position: { line: 2, column: 1 }
          },
          original: {
            sourcePath: "src/profile-card.ts",
            position: { line: 6, column: 1 }
          },
          status: "available"
        }
      });
      expect(manifest).toMatchObject({
        entrypoint: "index.html",
        payload: "browser-panel-payload.json"
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("attaches project relation graph payload to the static browser panel", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-browser-panel-relations-"));
    const docsDir = path.join(root, "docs");
    const outDir = path.join(root, "browser-panel");
    const messages: string[] = [];

    try {
      const docsExitCode = await runCli([
        "docs",
        "build",
        "--project-manifest",
        "fixtures/project-mixed.hia-project.json",
        "--out",
        docsDir
      ], createTestIo(messages));
      const panelExitCode = await runCli([
        "browser",
        "panel",
        "--project-manifest",
        "fixtures/project-mixed.hia-project.json",
        "--project-index",
        path.join(docsDir, "project-index.json"),
        "--out",
        outDir
      ], createTestIo(messages));
      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const payload = JSON.parse(await readFile(path.join(outDir, "browser-panel-payload.json"), "utf8")) as {
        relationGraph?: {
          relationCount: number;
          relations: Array<{
            kind: string;
            openRequests: Array<{ type: string }>;
          }>;
        };
        summary: { relationCount: number; relationNodeCount: number };
      };

      expect(docsExitCode).toBe(0);
      expect(panelExitCode).toBe(0);
      expect(html).toContain("data-hia-relation-list");
      expect(payload.summary.relationCount).toBeGreaterThan(0);
      expect(payload.summary.relationNodeCount).toBeGreaterThan(0);
      expect(payload.relationGraph?.relationCount).toBeGreaterThan(0);
      expect(payload.relationGraph?.relations.some((relation) => relation.kind === "documents-generated-artifact")).toBe(true);
      expect(payload.relationGraph?.relations.flatMap((relation) => relation.openRequests.map((request) => request.type))).toContain("hia.openDocumentationEntry");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("resolves producer output-relative ordinary source maps from nested doc-source-map artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-browser-panel-producer-"));
    const producerArtifactDirectory = path.join(root, "producer", "artifacts");
    const outDir = path.join(root, "browser-panel");
    const messages: string[] = [];

    try {
      await mkdir(producerArtifactDirectory, { recursive: true });
      await writeFile(path.join(root, "project.hia-project.json"), JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: { name: "Producer Source Map Fixture" },
        inputs: [{ kind: "doc-source-map", path: "producer/artifacts/profile-card.docmap.json" }]
      }), "utf8");
      await writeFile(path.join(producerArtifactDirectory, "profile-card.docmap.json"), JSON.stringify({
        contract: "doc-source-map",
        contractVersion: "0.1.0-draft",
        id: "docmap:producer-output-base",
        producer: { name: "@hia-doc/fixture", version: "0.1.0" },
        pathBases: { artifacts: "outputDirectory", sources: "workspaceRoot" },
        artifacts: [{ id: "artifact:js", path: "artifacts/profile-card.js", language: "javascript" }],
        sources: [{ id: "source:ts", path: "src/profile-card.ts", language: "typescript", sourcesContentPolicy: "none" }],
        sourceMaps: [{ id: "sourcemap:profile-card", kind: "ordinary-source-map", path: "artifacts/profile-card.js.map" }],
        chains: [],
        entries: [{
          id: "entry:profile-card",
          kind: "symbol",
          symbolId: "ts:function:renderProfileCard",
          sourceRefs: [{ sourceId: "source:ts", range: { start: { line: 6, column: 1 } } }],
          artifactRefs: [{ artifactId: "artifact:js", rangeSource: "source-map" }],
          diagnostics: []
        }],
        privacy: { sourcesContentPolicy: "none", allowAbsolutePaths: false, allowUncPaths: false, allowPathTraversal: false },
        diagnostics: []
      }), "utf8");
      await writeFile(
        path.join(producerArtifactDirectory, "profile-card.js.map"),
        await readFile(path.join(process.cwd(), "fixtures", "browser-panel", "maps", "profile-card.js.map"), "utf8"),
        "utf8"
      );

      const exitCode = await runCli([
        "browser",
        "panel",
        "--project-manifest",
        path.join(root, "project.hia-project.json"),
        "--out",
        outDir
      ], createTestIo(messages));
      const payload = JSON.parse(await readFile(path.join(outDir, "browser-panel-payload.json"), "utf8")) as {
        summary: { sourceMapCount: number };
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).not.toContain("HIA_CLI_BROWSER_SOURCE_MAP_NOT_FOUND");
      expect(payload.summary.sourceMapCount).toBe(1);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("reports machine-readable CLI diagnostics for missing input files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-missing-input-"));
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--input",
        path.join(root, "missing.hia.json"),
        "--out",
        path.join(root, "docs")
      ], createTestIo(messages));

      expect(exitCode).toBe(1);
      expect(messages.join("\n")).toContain("[error:HIA_CLI_INPUT_READ_FAILED]");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });


  it("builds from hia.config.json with config-relative paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-config-"));
    const inputDir = path.join(root, "input");
    const messages: string[] = [];

    try {
      await mkdir(inputDir, { recursive: true });
      await writeFile(
        path.join(inputDir, "basic.hia.json"),
        await readFile(path.join(process.cwd(), "fixtures/basic.hia.json"), "utf8"),
        "utf8"
      );
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          input: "input/basic.hia.json",
          output: "site",
          locale: "en",
          manifest: "meta/hia-manifest.json",
          renderer: {
            title: "Configured HIA Docs",
            includeThemeAssets: true
          },
          theme: {
            name: "default"
          },
          source: {
            enabled: true,
            mode: "file",
            openMode: "same-tab"
          }
        }
      }), "utf8");

      const exitCode = await runCli(["docs", "build", "--config", path.join(root, "hia.config.json")], createTestIo(messages));
      const html = await readFile(path.join(root, "site/index.html"), "utf8");
      const manifest = JSON.parse(await readFile(path.join(root, "site/meta/hia-manifest.json"), "utf8")) as {
        initialLocale: string;
        title: string;
        files: Array<{ path: string; role: string }>;
      };

      expect(exitCode).toBe(0);
      expect(html).toContain("<title>Configured HIA Docs</title>");
      expect(html).toContain("<html lang=\"en\"");
      expect(manifest.title).toBe("Configured HIA Docs");
      expect(manifest.initialLocale).toBe("en");
      expect(manifest.files.at(-1)).toEqual({
        path: "meta/hia-manifest.json",
        role: "manifest",
        contentType: "application/json; charset=utf-8"
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("lets CLI options override config values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-config-override-"));
    const messages: string[] = [];

    try {
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          input: path.join(process.cwd(), "fixtures/basic.hia.json"),
          output: "from-config",
          locale: "zh-CN"
        }
      }), "utf8");

      const exitCode = await runCli([
        "docs",
        "build",
        "--config",
        path.join(root, "hia.config.json"),
        "--out",
        path.join(root, "from-cli"),
        "--locale",
        "en"
      ], createTestIo(messages));
      const html = await readFile(path.join(root, "from-cli/index.html"), "utf8");

      expect(exitCode).toBe(0);
      expect(html).toContain("<html lang=\"en\"");
      await expect(readFile(path.join(root, "from-config/index.html"), "utf8")).rejects.toThrow();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects manifest paths outside the output directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-manifest-"));
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--input",
        "fixtures/basic.hia.json",
        "--out",
        path.join(root, "docs"),
        "--manifest",
        "../manifest.json"
      ], createTestIo(messages));

      expect(exitCode).toBe(1);
      expect(messages.join("\n")).toContain("[error:HIA_CLI_MANIFEST_PATH_INVALID]");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("reports missing option values", async () => {
    const messages: string[] = [];
    const exitCode = await runCli(["docs", "build", "--config"], createTestIo(messages));

    expect(exitCode).toBe(1);
    expect(messages.join("\n")).toContain("[error:HIA_CLI_OPTION_VALUE_MISSING]");
  });

  it("recognizes npm bin symlinks as CLI entrypoints", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-entrypoint-"));
    const realEntry = path.join(root, "dist", "index.js");
    const binDir = path.join(root, ".bin");
    const symlinkEntry = path.join(binDir, "hia");

    try {
      await mkdir(path.dirname(realEntry), { recursive: true });
      await mkdir(binDir, { recursive: true });
      await writeFile(realEntry, "", "utf8");

      try {
        await symlink(realEntry, symlinkEntry);
      } catch {
        return;
      }

      expect(isCliEntrypoint(pathToFileURL(realEntry).href, symlinkEntry)).toBe(true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function createTestIo(messages: string[]): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (message) => messages.push(message),
    stderr: (message) => messages.push(message)
  };
}

async function readGeneratedEntryHtml(outDir: string): Promise<string> {
  const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
    files?: Array<{ path?: string }>;
  };
  const entryPaths = (manifest.files ?? [])
    .map((file) => file.path)
    .filter((filePath): filePath is string => typeof filePath === "string" && filePath.startsWith("entries/"));
  const entryFiles = await Promise.all(entryPaths.map((filePath) => readFile(path.join(outDir, filePath), "utf8")));
  return entryFiles.join("\n");
}
