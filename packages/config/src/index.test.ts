import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_CONFIG_SOURCE_MODES,
  HIA_CONFIG_SCHEMA_VERSION,
  HIA_CONFIG_THEME_NAMES,
  hasConfigErrors,
  loadHiaProjectConfig,
  validateHiaProjectConfig
} from "./index.js";

describe("@hia-doc/config", () => {
  it("auto-discovers hia.config.json in cwd", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-config-"));

    try {
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: HIA_CONFIG_SCHEMA_VERSION,
        docs: {
          input: "fixtures/basic.hia.json",
          output: "dist/docs",
          locale: "en",
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

      const result = await loadHiaProjectConfig({ cwd: root });

      expect(result.found).toBe(true);
      expect(result.path).toBe(path.join(root, "hia.config.json"));
      expect(result.baseDir).toBe(root);
      expect(result.config.docs?.input).toBe("fixtures/basic.hia.json");
      expect(result.diagnostics).toEqual([]);
      expect(HIA_CONFIG_SOURCE_MODES).toEqual(["none", "file", "external"]);
      expect(HIA_CONFIG_THEME_NAMES).toEqual(["default"]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("returns an empty config when no config file exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-config-empty-"));

    try {
      const result = await loadHiaProjectConfig({ cwd: root });

      expect(result.found).toBe(false);
      expect(result.config).toEqual({});
      expect(result.diagnostics).toEqual([]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("reports validation diagnostics", () => {
    const diagnostics = validateHiaProjectConfig({
      schemaVersion: "9.9.9",
      docs: {
        manifest: "",
        locales: ["en", ""],
        renderer: {
          includeThemeAssets: "yes"
        },
        theme: {
          name: "custom-theme"
        },
        source: {
          mode: "remote"
        }
      }
    });

    expect(hasConfigErrors(diagnostics)).toBe(true);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_CONFIG_SCHEMA_UNSUPPORTED");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_CONFIG_THEME_UNSUPPORTED");
    expect(diagnostics.find((diagnostic) => diagnostic.code === "HIA_CONFIG_THEME_UNSUPPORTED")?.data).toEqual({
      requestedTheme: "custom-theme",
      fallbackTheme: "default"
    });
    expect(diagnostics.some((diagnostic) => diagnostic.severity === "warning")).toBe(true);
  });
});
