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
      const navigationIndex = JSON.parse(await readFile(path.join(outDir, "project-index.json"), "utf8")) as {
        contract: string;
        entries: Array<{ id: string; source?: { preview?: unknown } }>;
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
      expect(messages.join("\n")).toContain("Generated 5 file");
      expect(html).toContain("Mixed Project Documentation");
      expect(html).toContain("data-hia-project-search");
      expect(html).toContain("data-hia-project-view=\"js\"");
      expect(html).toContain("data-hia-project-view=\"css\"");
      expect(html).toContain("data-hia-project-view=\"html\"");
      expect(html).toContain("greet");
      expect(html).toContain("Source Preview examples/basic/src/greet.js:17-22");
      expect(html).toContain("function greet(name)");
      expect(html).toContain("css-component-style");
      expect(html).toContain("html-component");
      expect(html).toContain("project-mixed-alert.docmap.json");
      expect(html).toContain("1/1 linked");
      expect(html).toContain("Doc Source Map");
      expect(html).toContain("entry:html:alert");
      expect(html).toContain("[data-component=&quot;Alert&quot;]");
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
      expect(messages.join("\n")).toContain("Generated 5 file");
      expect(html).toContain("DotNet Project Fixture Documentation");
      expect(html).toContain("data-hia-project-view=\"dotnet\"");
      expect(html).toContain("data-hia-project-entry=\"dotnet\"");
      expect(html).toContain(".NET");
      expect(html).toContain("PortalMenu");
      expect(html).toContain("dotnet-type");
      expect(html).toContain("dotnet-method");
      expect(html).toContain("src/Portal.Components/Navigation/PortalMenu.cs:8");
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
      expect(html).toContain("Source-produced alert component.");
      expect(html).toContain("Source-produced alert styles.");
      expect(html).toContain(".hia-producers/mixed-source-fixture/alert.docmap.json");
      expect(html).toContain("Doc Source Map");
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
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: { entryCounts?: Record<string, number> };
        build?: { inputs?: Array<{ kind: string; source?: string }> };
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 5 file");
      expect(html.match(/Profile card component\./g)).toHaveLength(1);
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
      expect(html).toContain("greet");
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
      expect(html).toContain("<html lang=\"en\">");
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
      expect(html).toContain("<html lang=\"en\">");
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
