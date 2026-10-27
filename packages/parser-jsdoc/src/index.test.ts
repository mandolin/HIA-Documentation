import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { HIA_SOURCE_MODEL_VERSION, validateHiaDocumentDetailed } from "@hia-doc/core";
import {
  JSDOC_ADAPTER_CORE_BRIDGE_VERSION,
  JSDOC_ADAPTER_METADATA_SCHEMA_VERSION,
  JSDOC_ADAPTER_NAME,
  JSDOC_HIA_INTEGRATION_CONTRACT,
  JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
  convertJSDocIntegrationToHiaDocument,
  convertJSDocIntegrationToHiaDocumentDetailed,
  fromJSDocIntegration
} from "./index.js";

async function readIntegrationFixture(name = "jsdoc-integration.basic.json") {
  const fixturePath = new URL(`../../../fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
}

function findDuplicateIds(ids: string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

type IntegrationFixture = {
  artifactKind?: string;
  ir?: {
    nodes?: Array<{
      id?: string;
    }>;
  };
  localizationResources?: Array<Record<string, unknown>>;
  docletNodeMap?: unknown[];
};

describe("@hia-doc/parser-jsdoc", () => {
  it("converts JSDoc integration JSON into a valid HIA document", async () => {
    const integration = await readIntegrationFixture();
    const document = convertJSDocIntegrationToHiaDocument(integration, {
      documentId: "fixture.jsdoc",
      title: "JSDoc Bridge Fixture"
    });
    const result = validateHiaDocumentDetailed(document);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(document.defaultLocale).toBe("zh-CN");
    expect(document.locales).toEqual(["zh-CN", "en"]);
    expect(document.nodes[0]?.symbolIds).toEqual(["jsdoc:function:greet", "jsdoc:function:normalizeName"]);
    expect(document.symbols).toHaveLength(2);
    expect(document.symbols[0]).toMatchObject({
      id: "jsdoc:function:greet",
      name: "greet",
      kind: "function",
      summary: "问候一个用户。"
    });
    expect(document.symbols[0]?.i18n?.model).toBe("hia-text-i18n");
    expect(document.symbols[0]?.i18n?.fields.description?.key).toBe("greet.description");
    expect(document.symbols[0]?.i18n?.fields.description?.path).toBe("api.greet");
    expect(document.symbols[0]?.source?.model).toBe("hia-source");
    // <lang><zh-CN>新转换结果采用当前core writer身份；历史输入fixture仍保留原版本。</zh-CN><en>New conversion results use the current core writer identity; historical input fixtures retain their original versions.</en></lang>
    expect(document.symbols[0]?.source?.modelVersion).toBe(HIA_SOURCE_MODEL_VERSION);
    expect(document.symbols[0]?.source?.definedIn?.relativePath).toBe("examples/basic/src/greet.js");
    expect(document.symbols[0]?.source?.references?.[0]?.fragment).not.toHaveProperty("filePath");
    expect(document.symbols[0]?.source?.references?.[0]?.fragment).toMatchObject({
      confidence: "high",
      rangeSource: "manual"
    });
  });

  it("exposes a compact detailed result and alias", async () => {
    const integration = await readIntegrationFixture();
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration);
    const aliasDocument = fromJSDocIntegration(integration);

    expect(result.diagnostics).toEqual([]);
    expect(result.document.symbols[1]?.summary).toBe("标准化用户名称。");
    expect(aliasDocument.symbols[0]?.id).toBe("jsdoc:function:greet");
  });

  it("keeps JSDoc integration compatibility fixtures inside the core schema baseline", async () => {
    for (const fixtureName of ["jsdoc-integration.basic.json", "jsdoc-integration.compat.json", "jsdoc-integration.real-basic.json"]) {
      const integration = await readIntegrationFixture(fixtureName);
      const result = convertJSDocIntegrationToHiaDocumentDetailed(integration, {
        documentId: `fixture.${fixtureName}`,
        title: fixtureName
      });
      const validation = validateHiaDocumentDetailed(result.document);

      expect(validation.valid, fixtureName).toBe(true);
      expect(validation.diagnostics.filter((item) => item.severity === "error"), fixtureName).toEqual([]);
    }
  });

  it("converts real JPHS output into a valid, deduplicated HIA document", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.real-basic.json");
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration, {
      documentId: "fixture.jsdoc.real-basic",
      title: "Real JPHS Basic"
    });
    const validation = validateHiaDocumentDetailed(result.document);
    const symbolIds = result.document.symbols.map((symbol) => symbol.id);
    const serialized = JSON.stringify(result.document);

    expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    expect(validation.valid).toBe(true);
    expect(validation.diagnostics).toEqual([]);
    expect(symbolIds).toEqual(["jsdoc:function:greet", "jsdoc:function:normalizeName"]);
    expect(findDuplicateIds(symbolIds)).toEqual([]);
    expect(result.document.symbols.every((symbol) => symbol.summary && symbol.summary.length > 0)).toBe(true);
    expect(result.document.symbols[0]?.source?.definedIn?.link?.openMode).toBe("same-tab");
    expect(result.document.symbols[0]?.source?.primaryBlock?.link?.openMode).toBe("same-tab");
    expect(serialized).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("\\\\");
    expect(serialized).not.toContain("package:undefined");
  });

  it("keeps the real JPHS fixture aligned with the hardened producer contract", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.real-basic.json") as IntegrationFixture;
    const nodes = integration.ir?.nodes ?? [];
    const nodeIds = nodes.map((node) => node.id ?? "");
    const serialized = JSON.stringify(integration);
    const resource = integration.localizationResources?.[0];

    expect(integration.artifactKind).toBe("hia-integration");
    expect(nodeIds).toEqual(["jsdoc:function:greet", "jsdoc:function:normalizeName"]);
    expect(findDuplicateIds(nodeIds)).toEqual([]);
    expect(integration.docletNodeMap).toHaveLength(nodes.length);
    expect(resource).toMatchObject({
      kind: "external-resource",
      path: "examples/basic/i18n/docs.hia-i18n.json",
      format: "hia-i18n-json",
      fields: ["shared.helper"],
      locales: ["en", "zh-CN"],
      localeCount: 2
    });
    expect(resource).not.toHaveProperty("filePath");
    expect(serialized).not.toContain("filePath");
    expect(serialized).not.toContain("currentPage");
    expect(serialized).not.toContain("package:undefined");
    expect(serialized).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
  });

  it("preserves adapter metadata and sanitizes unsafe metadata paths", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.compat.json");
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration);
    const metadata = result.document.metadata as Record<string, unknown>;
    const integrationMetadata = metadata.integration as Record<string, unknown>;
    const parserBoundary = integrationMetadata.parserBoundary as Record<string, unknown>;
    const localizationResources = integrationMetadata.localizationResources as Record<string, unknown>[];
    const symbolMetadata = result.document.symbols[0]?.metadata as Record<string, unknown>;
    const jsdocMetadata = symbolMetadata.jsdoc as Record<string, unknown>;
    const jsdocMeta = jsdocMetadata.meta as Record<string, unknown>;
    const warning = result.document.symbols[0]?.diagnostics?.[0];

    expect(metadata).toMatchObject({
      adapter: JSDOC_ADAPTER_NAME,
      adapterBridgeVersion: JSDOC_ADAPTER_CORE_BRIDGE_VERSION,
      metadataSchemaVersion: JSDOC_ADAPTER_METADATA_SCHEMA_VERSION,
      source: "jsdoc"
    });
    expect(integrationMetadata.contractVersion).toBe(JSDOC_HIA_INTEGRATION_CONTRACT_VERSION);
    expect(parserBoundary.safeRelative).toBe("examples/compat");
    expect(parserBoundary).not.toHaveProperty("workspaceRoot");
    expect(parserBoundary).not.toHaveProperty("sourceFilePath");
    expect(localizationResources[0]).toMatchObject({
      path: "examples/compat/i18n/docs.hia-i18n.json",
      localeCount: 2
    });
    expect(localizationResources[0]).not.toHaveProperty("sourceFilePath");
    expect(symbolMetadata).toMatchObject({
      adapter: JSDOC_ADAPTER_NAME,
      metadataSchemaVersion: JSDOC_ADAPTER_METADATA_SCHEMA_VERSION
    });
    expect(jsdocMetadata.docletId).toBe("compatExample");
    expect(jsdocMetadata).not.toHaveProperty("filePath");
    expect(jsdocMeta.relativePath).toBe("examples/compat/src/compat.js");
    expect(jsdocMeta).not.toHaveProperty("workspaceRoot");
    expect(warning?.data).toMatchObject({
      docletId: "compatExample",
      safeRelativePath: "examples/compat/src/compat.js",
      nested: {
        note: "kept"
      }
    });
    expect(warning?.data).not.toHaveProperty("workspaceRoot");
    expect(warning?.data).not.toHaveProperty("filePath");
    expect(JSON.stringify(result.document)).not.toContain("/private/");
  });

  it("omits recognizable local file URLs from ordinary adapter metadata", () => {
    // <lang><zh-CN>普通 metadata 中的 Unix、Windows 与网络本机 file URL 均不应公开；相对引用和网页链接作为正控。</zh-CN><en>Ordinary metadata must omit Unix, Windows and network local file URLs; relative references and web links are controls.</en></lang>
    const privateMarker = "not-for-public";
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      parserBoundary: {
        safeRelativePath: "src/safe.js",
        webReference: "https://example.test/reference",
        sourceUri: `file:///private/${privateMarker}.js`,
        windowsSourceUri: `file:///C:/private/${privateMarker}.js`,
        nested: { safeNote: "kept", networkSourceUri: `file://server/${privateMarker}.js` }
      },
      ir: {
        version: "0.1.0",
        nodes: [{
          id: "jsdoc:function:safe",
          kind: "function",
          name: "safe",
          summary: "Safe summary.",
          jsdoc: { meta: { sourceUri: `file:///private/${privateMarker}.js`, safeRelativePath: "src/safe.js" } }
        }]
      }
    });
    const metadata = result.document.metadata as Record<string, unknown>;
    const integration = metadata.integration as Record<string, unknown>;
    const symbolMetadata = result.document.symbols[0]?.metadata as Record<string, unknown>;

    expect(integration.parserBoundary).toMatchObject({
      safeRelativePath: "src/safe.js",
      webReference: "https://example.test/reference",
      nested: { safeNote: "kept" }
    });
    expect(symbolMetadata.jsdoc).toMatchObject({ meta: { safeRelativePath: "src/safe.js" } });
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    expect(JSON.stringify(result)).not.toContain("file://");
    expect(validateHiaDocumentDetailed(result.document).valid).toBe(true);
  });

  it("rejects prototype-control keys from parsed and literal adapter metadata", () => {
    // <lang><zh-CN>JSON.parse 与计算属性字面量都能生成自有 __proto__ 键；普通 metadata 和诊断 data 应只留下安全字段。</zh-CN><en>JSON.parse and computed object literals can both create an own __proto__ key; ordinary metadata and diagnostic data should retain only safe fields.</en></lang>
    const privateMarker = "not-for-public";
    const parsedMetadata = JSON.parse(`{"__proto__":{"marker":"${privateMarker}"},"constructor":{"marker":"${privateMarker}"},"prototype":{"marker":"${privateMarker}"},"safeNote":"kept"}`) as Record<string, unknown>;
    const literalMetadata: Record<string, unknown> = {
      ["__proto__"]: { marker: privateMarker },
      constructor: { marker: privateMarker },
      prototype: { marker: privateMarker },
      safeRelativePath: "src/safe.js"
    };
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      parserBoundary: parsedMetadata,
      diagnostics: [{ code: "VENDOR_SAFE_HINT", message: "Safe diagnostic.", data: parsedMetadata }],
      ir: {
        version: "0.1.0",
        nodes: [{
          id: "jsdoc:function:safe",
          kind: "function",
          name: "safe",
          summary: "Safe summary.",
          jsdoc: { meta: literalMetadata }
        }]
      }
    });
    const metadata = result.document.metadata as Record<string, unknown>;
    const integration = metadata.integration as Record<string, unknown>;
    const parserBoundary = integration.parserBoundary as Record<string, unknown>;
    const symbolMetadata = result.document.symbols[0]?.metadata as Record<string, unknown>;
    const jsdocMetadata = symbolMetadata.jsdoc as Record<string, unknown>;
    const jsdocMeta = jsdocMetadata.meta as Record<string, unknown>;

    expect(parserBoundary).toEqual({ safeNote: "kept" });
    expect(Object.getPrototypeOf(parserBoundary)).toBe(Object.prototype);
    expect(jsdocMeta).toEqual({ safeRelativePath: "src/safe.js" });
    expect(Object.getPrototypeOf(jsdocMeta)).toBe(Object.prototype);
    expect(result.diagnostics[0]?.data).toEqual({ safeNote: "kept" });
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    expect(validateHiaDocumentDetailed(result.document).valid).toBe(true);
  });

  it("warns when a fixture uses an unsupported JSDoc integration contract version", async () => {
    const integration = await readIntegrationFixture("jsdoc-integration.compat.json") as Record<string, unknown>;
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      ...integration,
      contractVersion: "9.0.0"
    });

    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "HIA_JSDOC_CONTRACT_VERSION_UNSUPPORTED",
      data: {
        actualVersion: "9.0.0",
        expectedVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION
      },
      severity: "warning",
      targetPath: "contractVersion"
    }));
  });

  it("keeps unsafe upstream diagnostic text, paths and data out of the core document", () => {
    // <lang><zh-CN>同一私有标记同时置于顶层与符号诊断，覆盖两处共享映射入口。</zh-CN><en>Place the same private marker in top-level and symbol diagnostics to cover both mapping entry points.</en></lang>
    const privateMarker = "not-for-public";
    const unsafeDiagnostic = {
      code: "HIA_JSDOC_HINT",
      message: `Could not read C:\\private\\${privateMarker}.env; token=${privateMarker}`,
      severity: "warning",
      targetPath: `C:\\private\\${privateMarker}.js`,
      path: `/private/${privateMarker}.js`,
      data: {
        safeRelativePath: "src/hinted.js",
        tokenCount: 2,
        note: `Authorization: Bearer ${privateMarker}`,
        token: privateMarker,
        nested: { safeNote: "kept" }
      }
    };
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      diagnostics: [unsafeDiagnostic],
      ir: {
        version: "0.1.0",
        nodes: [{
          id: "jsdoc:function:hinted",
          kind: "function",
          name: "hinted",
          summary: "Safe summary.",
          diagnostics: [unsafeDiagnostic]
        }]
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.document.symbols).toHaveLength(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.severity).toBe("warning");
    expect(result.diagnostics[0]?.data).toMatchObject({
      safeRelativePath: "src/hinted.js",
      tokenCount: 2,
      nested: { safeNote: "kept" }
    });
    expect(serialized).not.toContain(privateMarker);
    expect(serialized).not.toContain("C:\\private\\");
    expect(serialized).not.toContain("/private/");
  });

  it("redacts unsafe diagnostic codes, file URLs and credential-shaped data without losing safe fields", () => {
    // <lang><zh-CN>代码、正文、逻辑路径和 data 各放一个可辨私有标记；安全扩展代码与相对路径作为正控。</zh-CN><en>Place recognizable private markers in code, prose, logical paths, and data; retain a safe extension code and relative path as controls.</en></lang>
    const privateMarker = "not-for-public";
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      diagnostics: [
        {
          code: `HIA_JSDOC_HINT token=${privateMarker}`,
          message: `Cannot open file:///private/${privateMarker}.js`,
          targetPath: `file:///private/${privateMarker}.js`,
          path: `file:///private/${privateMarker}.js`,
          data: {
            safeRelativePath: "src/hinted.js",
            tokenCount: 2,
            sessionToken: privateMarker,
            cookie: privateMarker,
            nested: { safeNote: "kept", setCookie: privateMarker },
            note: `sessionToken=${privateMarker}`,
            sourceUrl: `file:///private/${privateMarker}.js`
          }
        },
        { code: "VENDOR_SAFE_HINT", message: "Safe diagnostic.", data: { safeRelativePath: "src/hinted.js" } },
        { code: `file:///private/${privateMarker}.js`, message: "Safe fallback message." }
      ]
    });

    expect(result.diagnostics).toHaveLength(3);
    expect(result.diagnostics[0]).toMatchObject({
      code: "HIA_JSDOC_ADAPTER_DIAGNOSTIC",
      message: "JSDoc adapter diagnostic.",
      targetPath: "diagnostics.0",
      path: "diagnostics.0",
      data: { safeRelativePath: "src/hinted.js", tokenCount: 2, nested: { safeNote: "kept" } }
    });
    expect(result.diagnostics[1]).toMatchObject({ code: "VENDOR_SAFE_HINT", message: "Safe diagnostic." });
    expect(result.diagnostics[2]).toMatchObject({ code: "HIA_JSDOC_ADAPTER_DIAGNOSTIC", message: "Safe fallback message." });
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    expect(validateHiaDocumentDetailed(result.document).valid).toBe(true);
  });

  it("does not let diagnostic data change the output object's prototype", () => {
    // <lang><zh-CN>JSON 输入的自有 __proto__ 键不能通过普通赋值改变输出 data 原型并破坏 core 文档有效性。</zh-CN><en>An own __proto__ key in JSON input must not change output data's prototype through assignment or invalidate the core document.</en></lang>
    const inputData = JSON.parse('{"__proto__":{"polluted":"private"},"safeNote":"kept"}') as Record<string, unknown>;
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      diagnostics: [{ code: "VENDOR_SAFE_HINT", message: "Safe diagnostic.", data: inputData }]
    });
    const data = result.diagnostics[0]?.data;

    expect(data).toMatchObject({ safeNote: "kept" });
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(validateHiaDocumentDetailed(result.document).valid).toBe(true);
  });

  it("keeps malformed integration identities private while retaining legacy conversion warnings", () => {
    // <lang><zh-CN>不可信契约标记只触发固定兼容警告，安全符号仍按旧桥接语义转换。</zh-CN><en>Untrusted contract markers trigger fixed compatibility warnings while a safe symbol still converts under the legacy bridge policy.</en></lang>
    const privateMarker = "not-for-public";
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: `hia-jsdoc-integration token=${privateMarker}`,
      contractVersion: `9.0.0 token=${privateMarker}`,
      pluginVersion: `9.0.0 token=${privateMarker}`,
      ir: {
        version: `9.0.0 token=${privateMarker}`,
        nodes: [{ id: "jsdoc:function:safe", kind: "function", name: "safe", summary: "Safe summary." }]
      }
    });
    const serialized = JSON.stringify(result);

    expect(result.document.symbols).toHaveLength(1);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "HIA_JSDOC_CONTRACT_UNSUPPORTED",
      "HIA_JSDOC_CONTRACT_VERSION_UNSUPPORTED"
    ]);
    expect(result.diagnostics.every((diagnostic) => diagnostic.severity === "warning")).toBe(true);
    expect(serialized).not.toContain(privateMarker);
    expect(serialized).not.toContain("token=");
  });

  it.each([
    "read:C:\\private\\not-for-public.env",
    "read:/private/not-for-public.env",
    "read:\\\\server\\not-for-public.env",
    "read:../not-for-public.env",
    "read:file:///private/not-for-public.env",
    "https://reader:not-for-public@example.test/docs"
  ])("redacts recognizable private diagnostic text: %s", (message) => {
    // <lang><zh-CN>各形态仅影响诊断正文；其余普通文档转换不应受阻。</zh-CN><en>Each form affects only diagnostic prose; ordinary document conversion remains available.</en></lang>
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: JSDOC_HIA_INTEGRATION_CONTRACT,
      contractVersion: JSDOC_HIA_INTEGRATION_CONTRACT_VERSION,
      diagnostics: [{ code: "HIA_JSDOC_HINT", message }]
    });

    expect(result.diagnostics[0]?.message).toBe("JSDoc adapter diagnostic.");
    expect(JSON.stringify(result.document)).not.toContain("not-for-public");
  });

  it("maps JPHS hint diagnostics to core info diagnostics and sanitizes diagnostic data", () => {
    const result = convertJSDocIntegrationToHiaDocumentDetailed({
      contract: "hia-jsdoc-integration",
      contractVersion: "0.1.0",
      ir: {
        version: "0.1.0",
        source: "jsdoc",
        nodes: [
          {
            id: "jsdoc:function:hinted",
            kind: "function",
            name: "hinted",
            summary: "Has a hint diagnostic.",
            diagnostics: [
              {
                code: "HIA_JSDOC_HINT",
                message: "Adapter hint.",
                severity: "hint",
                targetPath: "ir.nodes.0",
                path: "ir.nodes.0",
                data: {
                  filePath: "C:\\Users\\example\\project\\src\\hinted.js",
                  safeRelativePath: "src/hinted.js"
                }
              }
            ]
          }
        ]
      }
    });
    const diagnostic = result.document.symbols[0]?.diagnostics?.[0];

    expect(diagnostic).toMatchObject({
      code: "HIA_JSDOC_HINT",
      message: "Adapter hint.",
      severity: "info",
      targetPath: "ir.nodes.0",
      path: "ir.nodes.0",
      data: {
        safeRelativePath: "src/hinted.js"
      }
    });
    expect(diagnostic?.data).not.toHaveProperty("filePath");
  });

  it("does not leak local absolute paths into converted core IR", async () => {
    for (const fixtureName of ["jsdoc-integration.basic.json", "jsdoc-integration.real-basic.json"]) {
      const integration = await readIntegrationFixture(fixtureName);
      const document = convertJSDocIntegrationToHiaDocument(integration);

      expect(JSON.stringify(document), fixtureName).not.toMatch(/(?:^|[\s"'=])[A-Za-z]:[\\/]/);
      expect(JSON.stringify(document), fixtureName).not.toContain("/Users/");
      expect(JSON.stringify(document), fixtureName).not.toContain("\\\\");
    }
  });
});
