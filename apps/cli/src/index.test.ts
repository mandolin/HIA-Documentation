import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
});

function createTestIo(messages: string[]): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (message) => messages.push(message),
    stderr: (message) => messages.push(message)
  };
}
