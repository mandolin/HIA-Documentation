import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "./index.js";

describe("@hia-doc/cli", () => {
  it("prints help", async () => {
    const messages: string[] = [];
    const exitCode = await runCli(["--help"], createTestIo(messages));

    expect(exitCode).toBe(0);
    expect(messages.join("\n")).toContain("hia docs build");
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
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        project?: {
          views: string[];
          entryCounts: Record<string, number>;
        };
        build?: {
          mode: string;
          inputs: Array<{ kind: string; path: string }>;
        };
        docSourceMaps?: Array<{ path: string }>;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 4 file");
      expect(html).toContain("Mixed Project Documentation");
      expect(html).toContain("data-hia-project-view=\"js\"");
      expect(html).toContain("data-hia-project-view=\"css\"");
      expect(html).toContain("data-hia-project-view=\"html\"");
      expect(html).toContain("greet");
      expect(html).toContain("css-component-style");
      expect(html).toContain("html-component");
      expect(html).toContain("project-mixed-alert.docmap.json");
      expect(html).toContain("1/1 linked");
      expect(html).toContain("Doc Source Map");
      expect(html).toContain("entry:html:alert");
      expect(html).toContain("[data-component=&quot;Alert&quot;]");
      expect(manifest.project?.views).toEqual(["all", "js", "css", "html"]);
      expect(manifest.project?.entryCounts).toMatchObject({ js: 2, css: 2, html: 2 });
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
});

function createTestIo(messages: string[]): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (message) => messages.push(message),
    stderr: (message) => messages.push(message)
  };
}
