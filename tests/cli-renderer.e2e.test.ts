import { mkdtemp, readFile, rm } from "node:fs/promises";
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
});
