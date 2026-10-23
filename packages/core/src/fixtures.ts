/**
 * @file
 * @lang zh-CN 文档构造器与公开合成fixture；不读取真实项目或将构造结果自动视为已验证。
 * @lang en Document builders and public synthetic fixtures; do not read real projects or automatically treat constructed results as validated.
 */
import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  HIA_TEXT_I18N_MODEL,
  HIA_TEXT_I18N_MODEL_VERSION
} from "./model.js";
import type { HiaDocument, HiaDocumentInput, HiaI18nModel, HiaSymbol } from "./model.js";

/**
 * @lang zh-CN 返回本源码的包名和核心writer契约身份，不查询注册表。
 * @lang en Returns this source's package name and core writer identity without registry queries.
 * @returns <lang><zh-CN>新对象，版本是源码契约而非已发布包版本，无I/O。</zh-CN><en>New object with the source contract version rather than the published package version, without I/O.</en></lang>
 */
export function getCoreRuntimeInfo() {
  return {
    packageName: "@hia-doc/core",
    contractVersion: HIA_CORE_CONTRACT_VERSION
  };
}

/**
 * @lang zh-CN 创建当前版本文档外壳，传入数组/metadata保留引用，不做验证、深拷贝或冻结。
 * @lang en Creates a current-version document shell retaining array/metadata references without validation, deep copying or freezing.
 * @param input <lang><zh-CN>默认空；id/title为hia.document/HIA Document，默认语言en，locales缺省为默认语言，nodes/symbols缺省为空。</zh-CN><en>Empty by default; id/title default to hia.document/HIA Document, default locale to en, locales to that locale, and nodes/symbols to empty arrays.</en></lang>
 * @returns <lang><zh-CN>新外壳；可选fallback/diagnostics/metadata按原有真值规则加入，无I/O，wire使用前需校验。</zh-CN><en>New shell; optional fallback/diagnostics/metadata follow existing truthiness inclusion rules, without I/O, requiring validation before wire use.</en></lang>
 */
export function createHiaDocument(input: HiaDocumentInput = {}): HiaDocument {
  // <lang><zh-CN>本次构造的缺省语言和集合可共享调用者引用，后续修改由调用者负责。</zh-CN><en>Invocation defaults and collections may share caller references; callers own later mutation.</en></lang>
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

/**
 * @lang zh-CN 新建包含中英文、来源与源码引用的公开合成fixture，无真实项目数据。
 * @lang en Creates a new public synthetic fixture with Chinese/English text, provenance and source references, without real project data.
 * @returns <lang><zh-CN>独立可变fixture对象；每次调用新建，无I/O。</zh-CN><en>Independent mutable fixture newly created per invocation, without I/O.</en></lang>
 */
export function createBasicFixtureDocument(): HiaDocument {
  // <lang><zh-CN>本次调用独立创建的公开模块fixture，包含合成双语正文而非真实业务数据。</zh-CN><en>Create an independent public module fixture with synthetic bilingual text, not real business data.</en></lang>
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

  // <lang><zh-CN>独立函数fixture演示定义定位、主源码块和片段引用，所有正文均为公开合成示例。</zh-CN><en>The independent function fixture demonstrates definition locations, a primary block and fragment references using public synthetic examples only.</en></lang>
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

/** @lang zh-CN 把fixture的成对正文投影为独立字段模型和解析事实，不读取外部语言资源。
 * @lang en Projects paired fixture text into independent field models and resolution facts without reading external locale resources.
 */
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
