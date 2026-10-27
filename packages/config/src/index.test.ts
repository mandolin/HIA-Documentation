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
      expect(HIA_CONFIG_THEME_NAMES).toEqual(["default", "portal.classic", "portal.graphite", "portal.lumen"]);
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

  it("keeps malformed config content and the local path out of parse diagnostics", async () => {
    // <lang><zh-CN>损坏 JSON 的原始错误可含输入片段，公开诊断只保留固定错误码与正文。</zh-CN><en>A raw JSON error can contain input fragments; public diagnostics retain only a fixed code and message.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-config-private-"));
    const configPath = path.join(root, "hia.config.json");
    const privateMarker = "PRIVATE_CONFIG_PARSE_MARKER";

    try {
      await writeFile(configPath, `{"secret":${privateMarker}}`, "utf8");
      const result = await loadHiaProjectConfig({ cwd: root });
      const diagnosticText = JSON.stringify(result.diagnostics);

      expect(result.found).toBe(true);
      expect(result.path).toBe(configPath);
      expect(result.baseDir).toBe(root);
      expect(result.diagnostics[0]?.code).toBe("HIA_CONFIG_PARSE_FAILED");
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toBe("Project config cannot be parsed.");
      expect(result.diagnostics[0]?.data).toBeUndefined();
      expect(diagnosticText).not.toContain(root);
      expect(diagnosticText).not.toContain(privateMarker);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("keeps an explicit missing config path out of read diagnostics", async () => {
    // <lang><zh-CN>调用者仍取得内部解析路径，但诊断不可回显该路径或系统错误正文。</zh-CN><en>The caller still receives its resolved operational path, but diagnostics must not echo it or the system error.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-config-private-"));
    const configPath = path.join(root, "PRIVATE_CONFIG_MISSING_MARKER.json");

    try {
      const result = await loadHiaProjectConfig({ cwd: root, configPath });
      const diagnosticText = JSON.stringify(result.diagnostics);

      expect(result.found).toBe(true);
      expect(result.path).toBe(configPath);
      expect(result.baseDir).toBe(root);
      expect(result.diagnostics[0]?.code).toBe("HIA_CONFIG_READ_FAILED");
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toBe("Project config cannot be read.");
      expect(result.diagnostics[0]?.data).toBeUndefined();
      expect(diagnosticText).not.toContain(root);
      expect(diagnosticText).not.toContain("PRIVATE_CONFIG_MISSING_MARKER");
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

  it("keeps unsafe version, contract, theme and dynamic field inputs out of diagnostics", () => {
    // <lang><zh-CN>有效 JSON 的无效字段也会进入公开诊断，不能靠解析失败的隐私回归代替。</zh-CN><en>Invalid fields in syntactically valid JSON also reach public diagnostics; parse-failure privacy tests do not cover them.</en></lang>
    const privatePath = "C:/private-owner/config.json";
    const credentialUrl = "https://owner:password@example.test/contract";
    const token = "ghp_012345678901234567890123456789012345";
    const diagnostics = validateHiaProjectConfig({
      schemaVersion: privatePath,
      docs: {
        renderer: {
          uiLocale: "en",
          informationArchitecture: { contract: credentialUrl, contractVersion: token, [privatePath]: true },
          sourceCommentProjection: { locale: "en", [privatePath]: true },
          uiLocaleCompleteness: { [privatePath]: true }
        },
        theme: { name: token }
      }
    });
    const diagnosticText = JSON.stringify(diagnostics);

    for (const privateValue of [privatePath, credentialUrl, token, "password"]) {
      expect(diagnosticText).not.toContain(privateValue);
    }
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_IA_FIELD_UNSUPPORTED")?.targetPath)
      .toBe("docs.renderer.informationArchitecture");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_SOURCE_COMMENT_FIELD_UNSUPPORTED")?.targetPath)
      .toBe("docs.renderer.sourceCommentProjection");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_UI_LOCALE_COMPLETENESS_FIELD_UNSUPPORTED")?.targetPath)
      .toBe("docs.renderer.uiLocaleCompleteness");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_THEME_UNSUPPORTED")?.data)
      .toEqual({ fallbackTheme: "default" });
  });

  it("preserves concise public identifiers in existing diagnostic messages and locations", () => {
    // <lang><zh-CN>常规短标识仍提供精确纠错线索，安全过滤不把所有值都降为匿名。</zh-CN><en>Ordinary short identifiers retain precise correction clues; safe filtering does not anonymize every value.</en></lang>
    const diagnostics = validateHiaProjectConfig({
      schemaVersion: "9.9.9",
      docs: {
        renderer: { uiLocale: "en", informationArchitecture: { contract: "custom-contract", contractVersion: "0.2.0-draft", adaptive: true } },
        theme: { name: "custom-theme" }
      }
    });

    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_SCHEMA_UNSUPPORTED")?.message).toContain("9.9.9");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_IA_CONTRACT_UNSUPPORTED")?.message).toContain("custom-contract");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_IA_VERSION_UNSUPPORTED")?.message).toContain("0.2.0-draft");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_IA_FIELD_UNSUPPORTED")?.targetPath)
      .toBe("docs.renderer.informationArchitecture.adaptive");
    expect(diagnostics.find((item) => item.code === "HIA_CONFIG_THEME_UNSUPPORTED")?.data)
      .toEqual({ requestedTheme: "custom-theme", fallbackTheme: "default" });
  });

  it.each([
    "sk-proj-0123456789abcdef",
    "npm_0123456789abcdef",
    "xoxb-0123456789abcdef",
    "AKIA0123456789ABCDEF"
  ])("does not echo a common credential-shaped theme value: %s", (token) => {
    // <lang><zh-CN>短令牌也可能符合一般字母数字词法，须靠已知前缀另行排除。</zh-CN><en>Short credentials can satisfy ordinary alphanumeric syntax and need explicit known-prefix rejection.</en></lang>
    const diagnostic = validateHiaProjectConfig({ docs: { theme: { name: token } } })
      .find((item) => item.code === "HIA_CONFIG_THEME_UNSUPPORTED");

    expect(JSON.stringify(diagnostic)).not.toContain(token);
    expect(diagnostic?.targetPath).toBe("docs.theme.name");
    expect(diagnostic?.data).toEqual({ fallbackTheme: "default" });
  });

  it("rejects a root accessor without executing it or exposing its error", () => {
    // <lang><zh-CN>未知内存输入可带访问器；配置校验必须在字段读取之前将其拒绝。</zh-CN><en>Unknown in-memory input may carry an accessor; config validation must reject it before reading fields.</en></lang>
    let calls = 0;
    const config = Object.defineProperty({ docs: {} }, "schemaVersion", {
      enumerable: true,
      get() { calls += 1; throw new Error("private-root-secret"); }
    });

    const diagnostics = validateHiaProjectConfig(config);

    expect(calls).toBe(0);
    expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
    expect(JSON.stringify(diagnostics)).not.toContain("private-root-secret");
  });

  it("rejects a nested accessor without executing it or exposing its error", () => {
    // <lang><zh-CN>嵌套 renderer 属性与根字段使用相同的普通 JSON 边界。</zh-CN><en>Nested renderer properties use the same ordinary-JSON boundary as root fields.</en></lang>
    let calls = 0;
    const renderer = Object.defineProperty({}, "title", {
      enumerable: true,
      get() { calls += 1; throw new Error("private-nested-secret"); }
    });

    const diagnostics = validateHiaProjectConfig({ schemaVersion: HIA_CONFIG_SCHEMA_VERSION, docs: { renderer } });

    expect(calls).toBe(0);
    expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
    expect(JSON.stringify(diagnostics)).not.toContain("private-nested-secret");
  });

  it.each(["root", "nested"])("rejects a hidden %s config field before reading its nested accessor", (caseName) => {
    // <lang><zh-CN>非枚举自有字段不属于 JSON wire，不能跳过预检后再按普通配置读取。</zh-CN><en>Non-enumerable own fields are outside the JSON wire and must not be read as config after preflight skips them.</en></lang>
    let calls = 0;
    const renderer = Object.defineProperty({}, "title", {
      enumerable: true,
      get() { calls += 1; throw new Error("private-hidden-secret"); }
    });
    const config: Record<string, unknown> = { schemaVersion: HIA_CONFIG_SCHEMA_VERSION };
    if (caseName === "root") {
      Object.defineProperty(config, "docs", { value: { renderer }, enumerable: false });
    } else {
      const docs = Object.defineProperty({}, "renderer", { value: renderer, enumerable: false });
      config.docs = docs;
    }

    const diagnostics = validateHiaProjectConfig(config);

    expect(calls).toBe(0);
    expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
    expect(JSON.stringify(diagnostics)).not.toContain("private-hidden-secret");
  });

  it("rejects a huge sparse extension array before scanning its length", () => {
    // <lang><zh-CN>只读取两个已定义槽位和 length 的描述符即可判定稀疏，无须逐个探测十亿个索引。</zh-CN><en>The two defined slots and length descriptor suffice to reject sparsity without probing a billion indices.</en></lang>
    const sparse: unknown[] = [];
    sparse.length = 1_000_000_000;
    sparse[0] = "first";
    sparse[sparse.length - 1] = "last";
    let lengthReads = 0;
    const watched = new Proxy(sparse, {
      get(target, key, receiver) {
        if (key === "length") lengthReads += 1;
        return Reflect.get(target, key, receiver);
      }
    });

    const diagnostics = validateHiaProjectConfig({ schemaVersion: HIA_CONFIG_SCHEMA_VERSION, extension: watched });

    expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
    expect(lengthReads).toBe(0);
  });

  it.each(["object data", "object accessor", "array data", "array accessor"])(
    "rejects an own Symbol field in config %s without executing accessors",
    (caseName) => {
      // <lang><zh-CN>Symbol 键不会进入 JSON wire，但可隐藏在普通对象或数组上；配置严格模式须在模型读取前拒绝。</zh-CN><en>Symbol keys are absent from the JSON wire yet may hide on objects or arrays; strict config mode rejects them before model reads.</en></lang>
      let calls = 0;
      const extension: Record<string, unknown> | unknown[] = caseName.startsWith("array") ? ["public"] : { public: "value" };
      Object.defineProperty(extension, Symbol("C:/private-owner/symbol"), caseName.endsWith("accessor")
        ? { enumerable: true, get() { calls += 1; throw new Error("private-symbol-secret"); } }
        : { enumerable: true, value: "private-symbol-secret" });

      const diagnostics = validateHiaProjectConfig({ schemaVersion: HIA_CONFIG_SCHEMA_VERSION, extension });

      expect(calls).toBe(0);
      expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
      expect(JSON.stringify(diagnostics)).not.toContain("private-symbol-secret");
      expect(JSON.stringify(diagnostics)).not.toContain("private-owner");
    }
  );

  it.each(["cycle", "date", "non-finite number"])("rejects non-JSON config data: %s", (caseName) => {
    // <lang><zh-CN>额外字段仍允许普通 JSON 值，但不能借开放字段藏入非 JSON 图。</zh-CN><en>Extension fields still allow ordinary JSON values, but cannot hide a non-JSON graph.</en></lang>
    const config: Record<string, unknown> = { schemaVersion: HIA_CONFIG_SCHEMA_VERSION };
    if (caseName === "cycle") config.extension = config;
    else if (caseName === "date") config.extension = new Date(0);
    else config.extension = Number.POSITIVE_INFINITY;

    const diagnostics = validateHiaProjectConfig(config);

    expect(diagnostics.map((item) => item.code)).toContain("HIA_CONFIG_INVALID");
  });

  it("retains ordinary JSON configuration and open extension data", () => {
    // <lang><zh-CN>安全预检不改变已支持配置字段及可序列化扩展的结果。</zh-CN><en>The safe preflight preserves supported config fields and serializable extension data.</en></lang>
    const config = {
      schemaVersion: HIA_CONFIG_SCHEMA_VERSION,
      docs: {
        renderer: { title: "Public docs" },
        theme: { colors: { accent: "#0f4f82" } },
        futureExtension: { values: ["plain", 1, false, null] }
      }
    };

    expect(validateHiaProjectConfig(config)).toEqual([]);
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
