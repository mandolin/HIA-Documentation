import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  HIA_TEXT_I18N_MODEL,
  HIA_TEXT_I18N_MODEL_VERSION
} from "./model.js";
import type { HiaDocument, HiaDocumentInput, HiaI18nModel, HiaSymbol } from "./model.js";

export function getCoreRuntimeInfo() {
  return {
    packageName: "@hia-doc/core",
    contractVersion: HIA_CORE_CONTRACT_VERSION
  };
}

export function createHiaDocument(input: HiaDocumentInput = {}): HiaDocument {
  const defaultLocale = input.defaultLocale ?? "en";
  const locales = input.locales ?? [defaultLocale];
  const document: HiaDocument = {
    schemaVersion: HIA_CORE_CONTRACT_VERSION,
    id: input.id ?? "hia.document",
    title: input.title ?? "HIA Document",
    defaultLocale,
    locales,
    nodes: input.nodes ?? [],
    symbols: input.symbols ?? []
  };

  if (input.fallbackLocale) {
    document.fallbackLocale = input.fallbackLocale;
  }

  if (input.diagnostics) {
    document.diagnostics = input.diagnostics;
  }

  if (input.metadata) {
    document.metadata = input.metadata;
  }

  return document;
}

export function createBasicFixtureDocument(): HiaDocument {
  const moduleSymbol: HiaSymbol = {
    id: "module:webtest",
    kind: "module",
    name: "webtest",
    longname: "module:webtest",
    path: ["webtest"],
    summary: "Webtest 示例模块。",
    i18n: createSymbolI18n({
      description: {
        zhCN: "Webtest 示例模块。",
        en: "Webtest sample module."
      }
    }),
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "all",
      definedIn: {
        kind: "defined-in",
        relativePath: "src/index.js",
        language: "javascript",
        position: { line: 1, column: 1 },
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 }
        },
        link: {
          enabled: true,
          fileUrl: "https://example.test/repo/src/index.js",
          lineUrl: "https://example.test/repo/src/index.js#L1",
          openMode: "new-tab"
        }
      },
      primaryBlock: null,
      references: [],
      fragments: []
    }
  };

  const functionSymbol: HiaSymbol = {
    id: "function:buildProfileSummary",
    kind: "function",
    name: "buildProfileSummary",
    longname: "module:webtest.buildProfileSummary",
    parentId: "module:webtest",
    path: ["webtest", "buildProfileSummary"],
    signature: "buildProfileSummary(profile) => string",
    summary: "生成用户资料摘要。",
    i18n: createSymbolI18n({
      description: {
        zhCN: "生成用户资料摘要。",
        en: "Builds a user profile summary."
      },
      "params.profile.description": {
        zhCN: "标准化后的用户资料对象。",
        en: "Normalized user profile object."
      },
      "returns.0.description": {
        zhCN: "摘要文本。",
        en: "Summary text."
      }
    }),
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "all",
      definedIn: {
        kind: "defined-in",
        relativePath: "src/services/profile-service.js",
        language: "javascript",
        position: { line: 48, column: 1 },
        range: {
          start: { line: 48, column: 1 },
          end: { line: 56, column: 1 }
        },
        link: {
          enabled: true,
          fileUrl: "https://example.test/repo/src/services/profile-service.js",
          lineUrl: "https://example.test/repo/src/services/profile-service.js#L48-L56",
          openMode: "new-tab"
        }
      },
      primaryBlock: {
        kind: "primary-block",
        id: "function:buildProfileSummary",
        relativePath: "src/services/profile-service.js",
        language: "javascript",
        range: {
          start: { line: 48, column: 1 },
          end: { line: 56, column: 1 }
        },
        content: [
          "function buildProfileSummary(profile) {",
          "  const name = profile.displayName || profile.username;",
          "  const status = profile.active ? \"active\" : \"inactive\";",
          "  return `${name} - ${status}`;",
          "}"
        ].join("\n"),
        rangeSource: "parser-js",
        confidence: "high",
        preview: {
          enabled: true,
          defaultExpanded: false
        }
      },
      references: [
        {
          kind: "source-reference",
          referenceKind: "coderef",
          targetId: "BUILD_PROFILE_SUMMARY",
          sourceNodeId: "function:buildProfileSummary",
          fieldPath: "examples.0.body",
          resolved: true,
          fragment: {
            kind: "source-fragment",
            id: "BUILD_PROFILE_SUMMARY",
            relativePath: "src/services/profile-service.js",
            language: "javascript",
            range: {
              start: { line: 50, column: 3 },
              end: { line: 54, column: 32 }
            },
            content: [
              "const name = profile.displayName || profile.username;",
              "const status = profile.active ? \"active\" : \"inactive\";",
              "return `${name} - ${status}`;"
            ].join("\n"),
            rangeSource: "manual",
            confidence: "high",
            origin: {
              marker: "codeblock"
            },
            preview: {
              enabled: true,
              defaultExpanded: false
            }
          }
        }
      ],
      fragments: []
    }
  };

  return createHiaDocument({
    id: "fixture.basic",
    title: "HIA Basic Fixture",
    defaultLocale: "zh-CN",
    fallbackLocale: ["en", "zh-CN"],
    locales: ["zh-CN", "en"],
    nodes: [
      {
        id: "node.module.webtest",
        kind: "module",
        title: "webtest",
        symbolIds: ["module:webtest", "function:buildProfileSummary"],
        children: []
      }
    ],
    symbols: [moduleSymbol, functionSymbol],
    diagnostics: [],
    metadata: {
      fixture: "basic",
      purpose: "Shared core fixture"
    }
  });
}

function createSymbolI18n(fields: Record<string, { zhCN: string; en: string }>): HiaI18nModel {
  return {
    enabled: true,
    model: HIA_TEXT_I18N_MODEL,
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale: "zh-CN",
    fallbackLocale: ["en", "zh-CN"],
    locales: ["zh-CN", "en"],
    mode: "runtimeSwitch",
    fields: Object.fromEntries(
      Object.entries(fields).map(([fieldPath, value]) => [
        fieldPath,
        {
          fieldPath,
          kind: fieldPath,
          defaultLocale: "zh-CN",
          defaultText: value.zhCN,
          source: `fixture.${fieldPath}`,
          blocks: [],
          segments: [],
          localizedText: {
            "zh-CN": value.zhCN,
            en: value.en
          },
          resolutions: {
            "zh-CN": {
              requestedLocale: "zh-CN",
              resolvedLocale: "zh-CN",
              fallbackChain: ["zh-CN", "en"],
              usedFallback: false,
              missing: false
            },
            en: {
              requestedLocale: "en",
              resolvedLocale: "en",
              fallbackChain: ["en", "zh-CN"],
              usedFallback: false,
              missing: false
            }
          },
          missingLocales: []
        }
      ])
    )
  };
}
