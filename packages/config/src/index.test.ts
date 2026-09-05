import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_CONFIG_PROJECT_LAYOUTS,
  HIA_CONFIG_PORTAL_CONTENT_GROUPINGS,
  HIA_CONFIG_PORTAL_IA_CONTRACT,
  HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION,
  HIA_CONFIG_PORTAL_LOADING_STRATEGIES,
  HIA_CONFIG_PORTAL_MEMBER_PLACEMENTS,
  HIA_CONFIG_PORTAL_SCHEMES,
  HIA_CONFIG_PORTAL_SKINS,
  HIA_CONFIG_PORTAL_UI_LOCALES,
  HIA_CONFIG_SOURCE_PUBLIC_ASSET_POLICIES,
  HIA_CONFIG_SOURCE_MODES,
  HIA_CONFIG_SOURCE_PRESENTATIONS,
  HIA_CONFIG_SCHEMA_VERSION,
  HIA_CONFIG_THEME_NAMES,
  HIA_PROJECT_MANIFEST_JSON_SCHEMA,
  HIA_PROJECT_MANIFEST_SCHEMA_ID,
  HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
  hasConfigErrors,
  loadHiaProjectConfig,
  validateHiaProjectConfig,
  validateHiaProjectManifest
} from "./index.js";

describe("@hia-doc/config", () => {
  it("auto-discovers hia.config.json in cwd", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-config-"));

    try {
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: HIA_CONFIG_SCHEMA_VERSION,
        docs: {
          input: "fixtures/basic.hia.json",
          projectManifest: "fixtures/project.hia-project.json",
          output: "dist/docs",
          locale: "en",
          renderer: {
            title: "Configured HIA Docs",
            includeThemeAssets: true
          },
          theme: {
            name: "default",
            skin: "portal.classic",
            scheme: "system"
          },
          source: {
            enabled: true,
            mode: "file",
            publicAssetPolicy: "explicit-public",
            openMode: "same-tab"
          }
        }
      }), "utf8");

      const result = await loadHiaProjectConfig({ cwd: root });

      expect(result.found).toBe(true);
      expect(result.path).toBe(path.join(root, "hia.config.json"));
      expect(result.baseDir).toBe(root);
      expect(result.config.docs?.input).toBe("fixtures/basic.hia.json");
      expect(result.config.docs?.projectManifest).toBe("fixtures/project.hia-project.json");
      expect(result.diagnostics).toEqual([]);
      expect(HIA_CONFIG_SOURCE_MODES).toEqual(["none", "file", "external"]);
      expect(HIA_CONFIG_SOURCE_PRESENTATIONS).toEqual(["none", "link", "embed", "fetch"]);
      expect(HIA_CONFIG_PROJECT_LAYOUTS).toEqual(["split-site", "single-page"]);
      expect(HIA_CONFIG_THEME_NAMES).toEqual(["default"]);
      expect(HIA_CONFIG_PORTAL_SKINS).toEqual(["portal.classic", "portal.graphite", "portal.lumen"]);
      expect(HIA_CONFIG_PORTAL_SCHEMES).toEqual(["system", "light", "dark"]);
      expect(HIA_CONFIG_SOURCE_PUBLIC_ASSET_POLICIES).toEqual(["none", "explicit-public"]);
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

  it("uses build-generated fetch assets and rejects remote fetch endpoints or disabled presentation conflicts", () => {
    const generatedFetch = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "fetch"
        }
      }
    });
    const remoteFetch = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "fetch",
          fetchBaseUrl: "https://raw.example.test/project"
        }
      }
    });
    const remoteLink = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "link",
          linkBaseUrl: "https://github.example.test/project/blob/main"
        }
      }
    });
    const disabledEmbed = validateHiaProjectConfig({
      docs: {
        source: {
          enabled: false,
          presentation: "embed"
        }
      }
    });

    expect(generatedFetch).toEqual([]);
    expect(remoteFetch.map((diagnostic) => diagnostic.code)).toContain("HIA_CONFIG_SOURCE_FETCH_BASE_UNSUPPORTED");
    expect(remoteLink.map((diagnostic) => diagnostic.code)).toContain("HIA_CONFIG_SOURCE_LINK_BASE_UNSUPPORTED");
    expect(disabledEmbed.map((diagnostic) => diagnostic.code)).toContain("HIA_CONFIG_SOURCE_PRESENTATION_DISABLED");
  });

  it("validates the Portal-owned skin, scheme, and explicit public asset policy as closed selections", () => {
    const valid = validateHiaProjectConfig({
      docs: {
        theme: { name: "default", skin: "portal.graphite", scheme: "dark" },
        source: { presentation: "fetch", publicAssetPolicy: "explicit-public" }
      }
    });
    const invalid = validateHiaProjectConfig({
      docs: {
        theme: { skin: "classic", scheme: "sepia" },
        source: { publicAssetPolicy: "private" }
      }
    });

    expect(valid).toEqual([]);
    expect(invalid.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "HIA_CONFIG_FIELD_INVALID"
    ]));
  });

  it("accepts the exact Portal IA draft and keeps its three dimensions independent", () => {
    const diagnostics = validateHiaProjectConfig({
      docs: {
        renderer: {
          projectLayout: "split-site",
          uiLocale: "zh-CN",
          uiLocaleCompleteness: {
            profileId: "hia-jsdoc.portal-bridge",
            surfaceId: "hia-jsdoc.portal-bridge"
          },
          informationArchitecture: {
            contract: HIA_CONFIG_PORTAL_IA_CONTRACT,
            contractVersion: HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION,
            contentGrouping: "semantic-container",
            loadingStrategy: "eager",
            memberPlacement: "with-parent"
          }
        }
      }
    });

    expect(diagnostics).toEqual([]);
    expect(HIA_CONFIG_PORTAL_CONTENT_GROUPINGS).toEqual(["entry", "semantic-container"]);
    expect(HIA_CONFIG_PORTAL_LOADING_STRATEGIES).toEqual(["lazy", "eager"]);
    expect(HIA_CONFIG_PORTAL_MEMBER_PLACEMENTS).toEqual(["separate", "with-parent"]);
    expect(HIA_CONFIG_PORTAL_UI_LOCALES).toEqual(["zh-CN", "en"]);
  });

  it("requires an explicit UI locale for IA and validates completeness identity independently", () => {
    const diagnostics = validateHiaProjectConfig({
      docs: {
        renderer: {
          informationArchitecture: {},
          uiLocaleCompleteness: {
            profileId: "private/path",
            surfaceId: "hia-jsdoc.portal-bridge",
            messages: { title: "must-not-cross" }
          }
        }
      }
    });
    const codes = diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).toContain("HIA_CONFIG_UI_LOCALE_REQUIRED");
    expect(codes).toContain("HIA_CONFIG_UI_LOCALE_COMPLETENESS_ID_INVALID");
    expect(codes).toContain("HIA_CONFIG_UI_LOCALE_COMPLETENESS_FIELD_UNSUPPORTED");
  });

  it("fails closed for unknown Portal IA drafts, enums, fields, locales, and explicit single-page use", () => {
    const diagnostics = validateHiaProjectConfig({
      docs: {
        renderer: {
          projectLayout: "single-page",
          uiLocale: "fr",
          informationArchitecture: {
            contractVersion: "0.2.0-draft",
            contentGrouping: "all",
            adaptive: true
          }
        }
      }
    });
    const codes = diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).toContain("HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED");
    expect(codes).toContain("HIA_CONFIG_IA_VERSION_UNSUPPORTED");
    expect(codes).toContain("HIA_CONFIG_IA_FIELD_UNSUPPORTED");
    expect(codes).toContain("HIA_CONFIG_FIELD_INVALID");
  });

  it("accepts on-expand/manual fetch triggers and rejects unknown triggers", () => {
    const onExpand = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "fetch",
          fetchTrigger: "on-expand"
        }
      }
    });
    const manual = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "fetch",
          fetchTrigger: "manual"
        }
      }
    });
    const invalid = validateHiaProjectConfig({
      docs: {
        source: {
          presentation: "fetch",
          fetchTrigger: "immediate"
        }
      }
    });

    expect(onExpand).toEqual([]);
    expect(manual).toEqual([]);
    expect(invalid.some((diagnostic) => diagnostic.code === "HIA_CONFIG_FIELD_INVALID")).toBe(true);
  });

  it("exports and validates the project manifest contract", () => {
    expect(HIA_PROJECT_MANIFEST_JSON_SCHEMA.$id).toBe(HIA_PROJECT_MANIFEST_SCHEMA_ID);
    expect(HIA_PROJECT_MANIFEST_JSON_SCHEMA.properties.schemaVersion.const).toBe(HIA_PROJECT_MANIFEST_SCHEMA_VERSION);

    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Mixed Project",
        defaultLocale: "en",
        locales: ["en", "zh-CN"]
      },
      profiles: [
        {
          profileId: "cssdoc",
          path: "profiles/cssdoc.profile.json"
        }
      ],
      inputs: [
        {
          kind: "cssdoc-extraction",
          path: "artifacts/button.cssdoc.json",
          domain: "css",
          profile: {
            profileId: "cssdoc",
            profileVersion: "0.1.0-draft"
          }
        },
        {
          kind: "hia-document",
          path: "artifacts/Portal.Components.hia.json",
          domain: "dotnet",
          profile: {
            profileId: "dotnetdoc",
            profileVersion: "0.1.0-draft"
          }
        },
        {
          kind: "hia-document",
          path: "artifacts/Portal.AdminScripts.hia.json",
          domain: "powershell",
          profile: {
            profileId: "psdoc",
            profileVersion: "0.1.0-draft"
          }
        }
      ]
    });

    expect(diagnostics).toEqual([]);
  });

  it("rejects a project default locale that is not declared", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Locale Project",
        defaultLocale: "zh-CN",
        locales: ["en"]
      },
      inputs: [
        {
          kind: "hia-document",
          path: "artifacts/basic.hia.json"
        }
      ]
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROJECT_MANIFEST_FIELD_INVALID");
    expect(hasConfigErrors(diagnostics)).toBe(true);
  });

  it("validates manifest-only semantic paths and product-version metadata", () => {
    const accepted = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Portal IA Fixture",
        productVersion: "2026.8"
      },
      inputs: [{
        kind: "hia-document",
        path: "artifacts/core.hia.json",
        semanticPath: [
          { kind: "repository", id: "main-repo", label: "Main Repository" },
          { kind: "package", id: "core", label: "@hia-doc/core" },
          { kind: "layer", id: "protocol", label: "Protocol Layer" }
        ]
      }]
    });
    const rejected = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: { name: "Unsafe Portal IA Fixture" },
      inputs: [{
        kind: "hia-document",
        path: "artifacts/core.hia.json",
        semanticPath: [
          { kind: "repository", id: "duplicate", label: "Main" },
          { kind: "package", id: "duplicate", label: "C:/private/repository" },
          { kind: "unknown", id: "bad/path", label: "Bad", privatePath: "secret" }
        ]
      }]
    });

    expect(accepted).toEqual([]);
    expect(rejected.map((diagnostic) => diagnostic.code)).toContain("HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID");
    expect(HIA_PROJECT_MANIFEST_JSON_SCHEMA.$defs.semanticPathSegment.additionalProperties).toBe(false);
  });

  it("accepts producer-only project manifests", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Producer Project"
      },
      producers: [
        {
          id: "fixture-producer",
          module: "producers/fixture.producer.mjs",
          workspaceRoot: "src",
          inputs: [
            {
              kind: "html",
              path: "alert.html"
            }
          ],
          profileIds: ["htmdoc"]
        }
      ]
    });

    expect(diagnostics).toEqual([]);
  });

  it("accepts producer-result inputs and DotNetDoc producer extension fields", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Portal Documentation"
      },
      inputs: [
        {
          kind: "documentation-producer-result",
          path: "temp/documentation/dotnetdoc/dotnetdoc.producer-result.json",
          domain: "dotnet",
          artifactPolicy: "relations-only"
        }
      ],
      producers: [
        {
          id: "dotnetdoc",
          module: "node_modules/@hia-doc/dotnetdoc-producer/src/index.mjs",
          workspaceRoot: ".",
          inputs: [
            {
              kind: "dotnet-xml-doc",
              path: "src/Portal/bin/Portal.xml",
              artifactBasePath: "api/Portal",
              hiaDocumentId: "dotnetdoc:Portal",
              title: "Portal API"
            }
          ]
        }
      ]
    });

    expect(diagnostics).toEqual([]);
  });

  it("rejects relations-only for inputs other than producer results", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Invalid Relation Input"
      },
      inputs: [
        {
          kind: "hia-document",
          path: "artifacts/basic.hia.json",
          artifactPolicy: "relations-only"
        }
      ]
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROJECT_MANIFEST_FIELD_INVALID");
    expect(hasConfigErrors(diagnostics)).toBe(true);
  });

  it("rejects empty producer arrays when provided", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Empty Producer Project"
      },
      inputs: [
        {
          kind: "hia-document",
          path: "artifacts/basic.hia.json"
        }
      ],
      producers: []
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROJECT_MANIFEST_FIELD_INVALID");
    expect(hasConfigErrors(diagnostics)).toBe(true);
  });

  it("rejects unsafe project manifest paths", () => {
    const diagnostics = validateHiaProjectManifest({
      schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
      project: {
        name: "Unsafe Project"
      },
      inputs: [
        {
          kind: "hia-document",
          path: "../private.hia.json"
        },
        {
          kind: "cssdoc-extraction",
          path: "C:/private/button.cssdoc.json"
        }
      ],
      producers: [
        {
          id: "unsafe-producer",
          module: "../producer.mjs",
          outputDirectory: "../generated",
          inputs: [
            {
              kind: "html",
              path: "../alert.html"
            }
          ]
        }
      ]
    }, { targetPath: "project.hia-project.json" });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROJECT_MANIFEST_PATH_INVALID");
    expect(hasConfigErrors(diagnostics)).toBe(true);
  });
});
