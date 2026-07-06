import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../apps/cli/src/index.js";

describe("CLI to renderer e2e", () => {
  it("builds fixture input into html, assets and output manifest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-e2e-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--input",
        "fixtures/basic.hia.json",
        "--out",
        outDir,
        "--locale",
        "en"
      ], {
        cwd: process.cwd(),
        stdout: (message) => messages.push(message),
        stderr: (message) => messages.push(message)
      });

      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const css = await readFile(path.join(outDir, "assets/hia-default.css"), "utf8");
      const js = await readFile(path.join(outDir, "assets/hia-default.js"), "utf8");
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        entrypoint: string;
        initialLocale: string;
        files: Array<{ path: string; role: string; contentType: string }>;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 4 file");
      expect(html).toContain("<html lang=\"en\">");
      expect(html).toContain("Builds a user profile summary.");
      expect(html).toContain("Referenced Source Fragments");
      expect(html).toContain("src/services/profile-service.js:48");
      expect(html).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
      expect(css).toContain(".hia-source-section");
      expect(js).toContain("data-hia-locale-control");
      expect(manifest.entrypoint).toBe("index.html");
      expect(manifest.initialLocale).toBe("en");
      expect(manifest.files.map((file) => file.path)).toEqual([
        "index.html",
        "assets/hia-default.css",
        "assets/hia-default.js",
        "hia-manifest.json"
      ]);
      expect(manifest.files.at(-1)).toMatchObject({
        role: "manifest",
        contentType: "application/json; charset=utf-8"
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds through hia.config.json", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-e2e-config-"));
    const messages: string[] = [];

    try {
      const configPath = path.join(root, "hia.config.json");
      await writeFile(configPath, JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          input: path.join(process.cwd(), "fixtures/basic.hia.json"),
          output: "docs",
          locale: "en",
          manifest: "manifest/hia.json",
          renderer: {
            title: "Configured E2E Docs"
          }
        }
      }), "utf8");

      const exitCode = await runCli(["docs", "build", "--config", configPath], {
        cwd: process.cwd(),
        stdout: (message) => messages.push(message),
        stderr: (message) => messages.push(message)
      });

      const html = await readFile(path.join(root, "docs/index.html"), "utf8");
      const manifest = JSON.parse(await readFile(path.join(root, "docs/manifest/hia.json"), "utf8")) as {
        title: string;
        initialLocale: string;
        files: Array<{ path: string; role: string }>;
      };

      expect(exitCode).toBe(0);
      expect(html).toContain("<title>Configured E2E Docs</title>");
      expect(html).toContain("<html lang=\"en\">");
      expect(html).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
      expect(manifest.title).toBe("Configured E2E Docs");
      expect(manifest.initialLocale).toBe("en");
      expect(manifest.files.at(-1)?.path).toBe("manifest/hia.json");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("builds real JSDoc integration input into html and output manifest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-e2e-jsdoc-"));
    const outDir = path.join(root, "docs");
    const messages: string[] = [];

    try {
      const exitCode = await runCli([
        "docs",
        "build",
        "--jsdoc-integration",
        "fixtures/jsdoc-integration.real-basic.json",
        "--out",
        outDir,
        "--locale",
        "zh-CN"
      ], {
        cwd: process.cwd(),
        stdout: (message) => messages.push(message),
        stderr: (message) => messages.push(message)
      });

      const html = await readFile(path.join(outDir, "index.html"), "utf8");
      const manifest = JSON.parse(await readFile(path.join(outDir, "hia-manifest.json"), "utf8")) as {
        documentId: string;
        initialLocale: string;
        files: Array<{ path: string; role: string; contentType: string }>;
      };

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated 4 file");
      expect(html).toContain("问候一个用户。");
      expect(html).toContain("标准化用户名称。");
      expect(html).toContain("examples/basic/src/greet.js");
      expect(html).not.toContain("package:undefined");
      expect(html).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
      expect(html).not.toContain("/Users/");
      expect(manifest.documentId).toBe("jsdoc.integration");
      expect(manifest.initialLocale).toBe("zh-CN");
      expect(JSON.stringify(manifest)).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
