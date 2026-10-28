import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic } from "./model.js";
import { isJsonDataGraph } from "./json-data.js";

/**
 * @lang zh-CN
 * 跨 renderer UI locale 完整性报告的中性 contract 名称；它不绑定 Portal、JSDoc、DOM 或翻译平台。
 *
 * @lang en
 * Neutral contract name for cross-renderer UI-locale completeness reports; it binds no Portal, JSDoc, DOM, or translation platform.
 */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT = "documentation-ui-locale-completeness" as const;

/** @lang zh-CN 精确保留的历史读取版本，不是当前写者目标。 @lang en Exact historical reader version, not the current writer target. */
export const LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION = "0.1.0-draft" as const;

/** @lang zh-CN 当前写者的精确1.0.0身份，旧报告不得只换号取得此身份。 @lang en Exact 1.0.0 writer identity; legacy reports cannot acquire it by version replacement alone. */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION = "1.0.0" as const;

/** @lang zh-CN 当前报告跨evaluation的总result上限；生成前与深度读取前各自核验。 @lang en Current report-wide result ceiling across evaluations, checked before generation and deep reading. */
export const DOCUMENTATION_UI_LOCALE_MAX_RESULTS = 100000;

/** @lang zh-CN 公开 schema identity。 @lang en Public schema identity. */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-ui-locale-completeness-1.0.0.schema.json" as const;

/** @lang zh-CN 精确历史Schema身份，内容不因当前身份升级而改写。 @lang en Exact historical schema identity, whose content is not rewritten by the current upgrade. */
export const LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-ui-locale-completeness-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN
 * UI locale contract 与 gate 的稳定 diagnostic code；消息不会回显翻译正文或运行环境。
 *
 * @lang en
 * Stable diagnostic codes for the UI-locale contract and gate; messages never echo translations or runtime-environment details.
 */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES = [
  "ULC_INVALID_INPUT",
  "ULC_INVALID_CONTRACT",
  "ULC_LOCALE_SCOPE_INVALID",
  "ULC_MESSAGE_IDENTITY_INVALID",
  "ULC_PLACEHOLDER_MISMATCH",
  "ULC_FALLBACK_UNDECLARED",
  "ULC_REQUIRED_MESSAGE_FALLBACK",
  "ULC_MESSAGE_MISSING",
  "ULC_ACCESSIBILITY_INCOMPLETE",
  "ULC_NO_SCRIPT_INCOMPLETE",
  "ULC_PRIVACY_BOUNDARY",
  "ULC_COMPATIBILITY_UNSUPPORTED"
] as const;

/** @lang zh-CN UI locale diagnostic code 类型。 @lang en UI-locale diagnostic-code type. */
export type DocumentationUiLocaleCompletenessDiagnosticCode =
  typeof DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES[number];

/** @lang zh-CN P1 必须覆盖的执行模式。 @lang en Execution modes that P1 must cover. */
export const DOCUMENTATION_UI_LOCALE_MODES = ["interactive", "no-script"] as const;

/** @lang zh-CN UI message 的可审计使用通道。 @lang en Auditable usage channels for UI messages. */
export const DOCUMENTATION_UI_LOCALE_CHANNELS = ["visible-text", "accessible-name", "status-message"] as const;

/** @lang zh-CN 单个 UI surface 的执行模式。 @lang en Execution mode for one UI surface. */
export type DocumentationUiLocaleMode = typeof DOCUMENTATION_UI_LOCALE_MODES[number];

/** @lang zh-CN 单个 required message 的使用通道。 @lang en Usage channel for one required message. */
export type DocumentationUiLocaleChannel = typeof DOCUMENTATION_UI_LOCALE_CHANNELS[number];

/** @lang zh-CN 稳定 message identity 与占位符定义。 @lang en Stable message identity and placeholder definition. */
export interface DocumentationUiLocaleMessageDefinition {
  messageId: string;
  placeholderNames: string[];
  visibility: "public";
}

/**
 * @lang zh-CN
 * 内存 locale bundle entry；`text` 只用于 gate，绝不投影到公开 report。
 *
 * @lang en
 * In-memory locale-bundle entry; `text` is gate input only and is never projected into the public report.
 */
export interface DocumentationUiLocaleBundleEntry {
  messageId: string;
  text: string;
}

/** @lang zh-CN 一个显式 locale 的 public plain-text bundle。 @lang en Public plain-text bundle for one explicit locale. */
export interface DocumentationUiLocaleBundle {
  bundleId: string;
  entries: DocumentationUiLocaleBundleEntry[];
  locale: string;
}

/** @lang zh-CN 单个 UI locale 的显式有序 fallback chain。 @lang en Explicit ordered fallback chain for one UI locale. */
export interface DocumentationUiLocaleFallbackChain {
  fallbackLocales: string[];
  uiLocale: string;
}

/** @lang zh-CN 某执行模式声明的 UI message 通道。 @lang en UI-message channels declared for one execution mode. */
export interface DocumentationUiLocaleSurfaceMode {
  channels: DocumentationUiLocaleChannel[];
  mode: DocumentationUiLocaleMode;
}

/**
 * @lang zh-CN
 * 页面默认语言与局部语言声明；W-P125 仍须把它映射到真实 DOM/accessibility tree。
 *
 * @lang en
 * Page-default and language-of-parts declaration; W-P125 must still map it to the real DOM/accessibility tree.
 */
export interface DocumentationUiLocaleLanguageMetadata {
  documentLanguage: string;
  partLanguages: string[];
  uiLocale: string;
}

/** @lang zh-CN 一个 renderer-neutral 文档 UI surface。 @lang en One renderer-neutral documentation UI surface. */
export interface DocumentationUiLocaleSurface {
  contentLocale: string;
  languageMetadata: DocumentationUiLocaleLanguageMetadata[];
  modes: DocumentationUiLocaleSurfaceMode[];
  surfaceId: string;
}

/** @lang zh-CN 单个状态下必须覆盖的 stable message。 @lang en Stable message required in one state. */
export interface DocumentationUiLocaleRequirement {
  channel: DocumentationUiLocaleChannel;
  messageId: string;
  mode: DocumentationUiLocaleMode;
  requirementId: string;
  stateId: string;
  surfaceId: string;
}

/**
 * @lang zh-CN
 * Pure evaluator 的完整输入；所有 locale、bundle、surface 与 requirement 都必须由调用方显式给出。
 *
 * @lang en
 * Complete input for the pure evaluator; callers must explicitly provide every locale, bundle, surface, and requirement.
 */
export interface DocumentationUiLocaleCompletenessInput {
  bundles: DocumentationUiLocaleBundle[];
  contentLocales: string[];
  defaultUiLocale: string;
  fallbackChains: DocumentationUiLocaleFallbackChain[];
  messages: DocumentationUiLocaleMessageDefinition[];
  profileId: string;
  requirements: DocumentationUiLocaleRequirement[];
  surfaces: DocumentationUiLocaleSurface[];
  uiLocales: string[];
}

/** @lang zh-CN report 中不含译文的 bundle inventory。 @lang en Translation-free bundle inventory in the report. */
export interface DocumentationUiLocaleBundleInventory {
  bundleId: string;
  locale: string;
  messageIds: string[];
}

/** @lang zh-CN report 中冻结的 locale 分层策略。 @lang en Frozen locale-separation policy in the report. */
export interface DocumentationUiLocaleScope {
  contentAndUiIndependent: true;
  contentLocales: string[];
  defaultUiLocale: string;
  inferFromContentLocale: false;
  inferFromSystemLocale: false;
  languageTagProfile: "bcp47-well-formed-subset";
  uiLocales: string[];
  uiSelection: "caller-explicit";
}

/** @lang zh-CN report 中冻结的显式 fallback 策略。 @lang en Frozen explicit-fallback policy in the report. */
export interface DocumentationUiLocaleFallbackPolicy {
  chains: DocumentationUiLocaleFallbackChain[];
  mode: "explicit-chain-only";
  requiredMessageResolution: "exact";
  resolutionOrder: "exact-then-declared-chain";
}

/** @lang zh-CN requirement 的 locale resolution。 @lang en Locale resolution for one requirement. */
export type DocumentationUiLocaleResolution = "exact" | "declared-fallback" | "missing";

/** @lang zh-CN requirement 的占位符核对状态。 @lang en Placeholder-check state for one requirement. */
export type DocumentationUiLocalePlaceholderStatus = "match" | "mismatch" | "unavailable";

/** @lang zh-CN 单个 required message 的可审计 gate 结果。 @lang en Auditable gate result for one required message. */
export interface DocumentationUiLocaleRequirementResult {
  channel: DocumentationUiLocaleChannel;
  messageId: string;
  placeholderStatus: DocumentationUiLocalePlaceholderStatus;
  requirementId: string;
  resolution: DocumentationUiLocaleResolution;
  resolvedLocale?: string;
  stateId: string;
  status: "covered" | "incomplete";
}

/** @lang zh-CN 一个 surface/mode/UI locale 组合的 count-only 摘要。 @lang en Count-only summary for one surface/mode/UI-locale combination. */
export interface DocumentationUiLocaleEvaluationSummary {
  exact: number;
  fallback: number;
  missing: number;
  placeholderMismatch: number;
  requirements: number;
}

/** @lang zh-CN 自动展开的单个完整性评估。 @lang en One automatically expanded completeness evaluation. */
export interface DocumentationUiLocaleEvaluation {
  contentLocale: string;
  documentLanguage: string;
  mode: DocumentationUiLocaleMode;
  partLanguages: string[];
  results: DocumentationUiLocaleRequirementResult[];
  status: "complete" | "incomplete";
  summary: DocumentationUiLocaleEvaluationSummary;
  surfaceId: string;
  uiLocale: string;
}

/** @lang zh-CN metadata-only report 的 all-false privacy 边界。 @lang en All-false privacy boundary for the metadata-only report. */
export interface DocumentationUiLocaleCompletenessPrivacy {
  absolutePathIncluded: false;
  contentBodyIncluded: false;
  credentialIncluded: false;
  messageTextIncluded: false;
  personalIdentityIncluded: false;
  privateMessageIncluded: false;
  runtimeEnvironmentIncluded: false;
  sourceBodyIncluded: false;
}

/** @lang zh-CN exact draft 与 closed-world compatibility。 @lang en Exact-draft and closed-world compatibility. */
export interface DocumentationUiLocaleCompletenessCompatibility {
  migrationPolicy: "explicit-pure";
  unknownChannelPolicy: "reject";
  unknownProperties: "reject";
  versionMatch: "exact";
}

/**
 * @lang zh-CN
 * 新旧精确界面语言报告共享的无正文wire主体，不把旧报告当成当前写者产物。
 *
 * @lang en
 * Shared metadata-only body for exact current and historical UI-locale reports.
 */
interface DocumentationUiLocaleCompletenessReportBody {
  bundles: DocumentationUiLocaleBundleInventory[];
  compatibility: DocumentationUiLocaleCompletenessCompatibility;
  contract: typeof DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT;
  diagnostics: HiaDiagnostic[];
  evaluations: DocumentationUiLocaleEvaluation[];
  fallbackPolicy: DocumentationUiLocaleFallbackPolicy;
  localeScope: DocumentationUiLocaleScope;
  messages: DocumentationUiLocaleMessageDefinition[];
  privacy: DocumentationUiLocaleCompletenessPrivacy;
  profileId: string;
  requirements: DocumentationUiLocaleRequirement[];
  status: "complete" | "incomplete";
  surfaces: DocumentationUiLocaleSurface[];
}

/** @lang zh-CN 当前1.0.0报告，仅当前评估器或完整输入重建产出。 @lang en Current 1.0.0 report, emitted only by current evaluation or rebuilding with complete input. */
export interface CurrentDocumentationUiLocaleCompletenessReport extends DocumentationUiLocaleCompletenessReportBody {
  /** @lang zh-CN 当前写者精确版本。 @lang en Exact current writer version. */
  contractVersion: typeof DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION;
}

/** @lang zh-CN 可精确读取的历史报告，不自动取得当前门禁资格。 @lang en Exactly readable historical report, without automatic current gate qualification. */
export interface LegacyDocumentationUiLocaleCompletenessReport extends DocumentationUiLocaleCompletenessReportBody {
  /** @lang zh-CN 历史读取精确版本。 @lang en Exact historical reader version. */
  contractVersion: typeof LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION;
}

/** @lang zh-CN 新旧精确可判别联合；未知相邻版本不在读取能力内。 @lang en Exact discriminated current/legacy union; adjacent unknown versions are unsupported. */
export type DocumentationUiLocaleCompletenessReport = CurrentDocumentationUiLocaleCompletenessReport | LegacyDocumentationUiLocaleCompletenessReport;

/** @lang zh-CN 整个 completeness gate 的 count-only 摘要。 @lang en Count-only summary for the whole completeness gate. */
export interface DocumentationUiLocaleCompletenessSummary {
  evaluations: number;
  exact: number;
  fallback: number;
  missing: number;
  placeholderMismatch: number;
  requirements: number;
  surfaces: number;
  uiLocales: number;
}

/**
 * @lang zh-CN
 * Pure evaluator 结果；非法、私密或超出 wire 容量的输入不返回 report，可表示但覆盖不足的输入返回 incomplete report。
 *
 * @lang en
 * Pure evaluator result; malformed, private, or unrepresentably large input returns no report, while representable under-coverage returns an incomplete report.
 */
export interface DocumentationUiLocaleCompletenessResult {
  diagnostics: HiaDiagnostic[];
  report?: CurrentDocumentationUiLocaleCompletenessReport;
  reportJson?: string;
  status: "complete" | "incomplete" | "refused";
  summary?: DocumentationUiLocaleCompletenessSummary;
}

// <lang><zh-CN>Schema fragment 与 runtime 使用同一闭集，避免分发层接受 owner runtime 会拒绝的 mode/channel。</zh-CN><en>Schema fragments and runtime share the same closed sets so distribution never accepts modes or channels rejected by the owner runtime.</en></lang>
const identitySchema = { type: "string", pattern: "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$", maxLength: 128 } as const;
const messageIdentitySchema = { type: "string", pattern: "^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)+$", maxLength: 128 } as const;
const localeSchema = { type: "string", pattern: "^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$", maxLength: 64 } as const;
const placeholderSchema = { type: "string", pattern: "^[A-Za-z][A-Za-z0-9_]{0,63}$" } as const;
const countSchema = { type: "integer", minimum: 0, maximum: 1000000 } as const;
/** @lang zh-CN 与既有 wire schema 一致的 evaluation 上限；超限输入在展开前拒绝。 @lang en Existing wire-schema evaluation ceiling; oversized inputs are refused before expansion. */
const maxReportEvaluations = 100000;
/** @lang zh-CN 与既有 wire schema 一致的去重诊断上限；超限时不生成报告。 @lang en Existing wire-schema ceiling for distinct diagnostics; no report is emitted after overflow. */
const maxReportDiagnostics = 100000;

/**
 * @lang zh-CN
 * Draft 2020-12 结构 schema；message text 不是 wire 字段，跨引用与计数 parity 由 owner validator 执行。
 *
 * @lang en
 * Draft 2020-12 structural schema; message text is not a wire field, while cross-reference and count parity are enforced by the owner validator.
 */
export const LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID,
  title: "Documentation UI Locale Completeness",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "profileId", "localeScope", "fallbackPolicy", "messages", "bundles", "surfaces", "requirements", "evaluations", "privacy", "compatibility", "diagnostics"],
  properties: {
    contract: { const: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT },
    contractVersion: { const: LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION },
    status: { enum: ["complete", "incomplete"] },
    profileId: identitySchema,
    localeScope: { $ref: "#/$defs/localeScope" },
    fallbackPolicy: { $ref: "#/$defs/fallbackPolicy" },
    messages: { type: "array", minItems: 1, maxItems: 10000, items: { $ref: "#/$defs/message" } },
    bundles: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/bundle" } },
    surfaces: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/surface" } },
    requirements: { type: "array", minItems: 1, maxItems: 50000, items: { $ref: "#/$defs/requirement" } },
    evaluations: { type: "array", minItems: 1, maxItems: maxReportEvaluations, items: { $ref: "#/$defs/evaluation" } },
    privacy: { $ref: "#/$defs/privacy" },
    compatibility: { $ref: "#/$defs/compatibility" },
    diagnostics: { type: "array", maxItems: maxReportDiagnostics, items: { $ref: "#/$defs/diagnostic" } }
  },
  $defs: {
    stringArray: { type: "array", maxItems: 1000, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 128 } },
    localeArray: { type: "array", maxItems: 1000, uniqueItems: true, items: localeSchema },
    message: {
      type: "object",
      additionalProperties: false,
      required: ["messageId", "placeholderNames", "visibility"],
      properties: {
        messageId: messageIdentitySchema,
        placeholderNames: { type: "array", maxItems: 64, uniqueItems: true, items: placeholderSchema },
        visibility: { const: "public" }
      }
    },
    bundle: {
      type: "object",
      additionalProperties: false,
      required: ["bundleId", "locale", "messageIds"],
      properties: {
        bundleId: identitySchema,
        locale: localeSchema,
        messageIds: { type: "array", maxItems: 10000, uniqueItems: true, items: messageIdentitySchema }
      }
    },
    fallbackChain: {
      type: "object",
      additionalProperties: false,
      required: ["uiLocale", "fallbackLocales"],
      properties: { uiLocale: localeSchema, fallbackLocales: { $ref: "#/$defs/localeArray" } }
    },
    localeScope: {
      type: "object",
      additionalProperties: false,
      required: ["contentLocales", "uiLocales", "defaultUiLocale", "contentAndUiIndependent", "uiSelection", "inferFromContentLocale", "inferFromSystemLocale", "languageTagProfile"],
      properties: {
        contentLocales: { type: "array", minItems: 1, maxItems: 1000, uniqueItems: true, items: localeSchema },
        uiLocales: { type: "array", minItems: 1, maxItems: 1000, uniqueItems: true, items: localeSchema },
        defaultUiLocale: localeSchema,
        contentAndUiIndependent: { const: true },
        uiSelection: { const: "caller-explicit" },
        inferFromContentLocale: { const: false },
        inferFromSystemLocale: { const: false },
        languageTagProfile: { const: "bcp47-well-formed-subset" }
      }
    },
    fallbackPolicy: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "resolutionOrder", "requiredMessageResolution", "chains"],
      properties: {
        mode: { const: "explicit-chain-only" },
        resolutionOrder: { const: "exact-then-declared-chain" },
        requiredMessageResolution: { const: "exact" },
        chains: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/fallbackChain" } }
      }
    },
    surfaceMode: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "channels"],
      properties: {
        mode: { enum: ["interactive", "no-script"] },
        channels: { type: "array", maxItems: 3, uniqueItems: true, items: { enum: ["visible-text", "accessible-name", "status-message"] } }
      }
    },
    languageMetadata: {
      type: "object",
      additionalProperties: false,
      required: ["uiLocale", "documentLanguage", "partLanguages"],
      properties: { uiLocale: localeSchema, documentLanguage: localeSchema, partLanguages: { $ref: "#/$defs/localeArray" } }
    },
    surface: {
      type: "object",
      additionalProperties: false,
      required: ["surfaceId", "contentLocale", "modes", "languageMetadata"],
      properties: {
        surfaceId: identitySchema,
        contentLocale: localeSchema,
        modes: { type: "array", minItems: 2, maxItems: 2, items: { $ref: "#/$defs/surfaceMode" } },
        languageMetadata: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/languageMetadata" } }
      }
    },
    requirement: {
      type: "object",
      additionalProperties: false,
      required: ["requirementId", "surfaceId", "mode", "stateId", "channel", "messageId"],
      properties: {
        requirementId: identitySchema,
        surfaceId: identitySchema,
        mode: { enum: ["interactive", "no-script"] },
        stateId: identitySchema,
        channel: { enum: ["visible-text", "accessible-name", "status-message"] },
        messageId: messageIdentitySchema
      }
    },
    requirementResult: {
      type: "object",
      additionalProperties: false,
      required: ["requirementId", "stateId", "channel", "messageId", "resolution", "placeholderStatus", "status"],
      properties: {
        requirementId: identitySchema,
        stateId: identitySchema,
        channel: { enum: ["visible-text", "accessible-name", "status-message"] },
        messageId: messageIdentitySchema,
        resolution: { enum: ["exact", "declared-fallback", "missing"] },
        resolvedLocale: localeSchema,
        placeholderStatus: { enum: ["match", "mismatch", "unavailable"] },
        status: { enum: ["covered", "incomplete"] }
      }
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["requirements", "exact", "fallback", "missing", "placeholderMismatch"],
      properties: { requirements: countSchema, exact: countSchema, fallback: countSchema, missing: countSchema, placeholderMismatch: countSchema }
    },
    evaluation: {
      type: "object",
      additionalProperties: false,
      required: ["surfaceId", "mode", "contentLocale", "uiLocale", "documentLanguage", "partLanguages", "status", "summary", "results"],
      properties: {
        surfaceId: identitySchema,
        mode: { enum: ["interactive", "no-script"] },
        contentLocale: localeSchema,
        uiLocale: localeSchema,
        documentLanguage: localeSchema,
        partLanguages: { $ref: "#/$defs/localeArray" },
        status: { enum: ["complete", "incomplete"] },
        summary: { $ref: "#/$defs/summary" },
        results: { type: "array", maxItems: 50000, items: { $ref: "#/$defs/requirementResult" } }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["messageTextIncluded", "contentBodyIncluded", "sourceBodyIncluded", "absolutePathIncluded", "credentialIncluded", "personalIdentityIncluded", "privateMessageIncluded", "runtimeEnvironmentIncluded"],
      properties: {
        messageTextIncluded: { const: false }, contentBodyIncluded: { const: false }, sourceBodyIncluded: { const: false },
        absolutePathIncluded: { const: false }, credentialIncluded: { const: false }, personalIdentityIncluded: { const: false },
        privateMessageIncluded: { const: false }, runtimeEnvironmentIncluded: { const: false }
      }
    },
    compatibility: {
      type: "object",
      additionalProperties: false,
      required: ["versionMatch", "unknownProperties", "unknownChannelPolicy", "migrationPolicy"],
      properties: {
        versionMatch: { const: "exact" }, unknownProperties: { const: "reject" },
        unknownChannelPolicy: { const: "reject" }, migrationPolicy: { const: "explicit-pure" }
      }
    },
    diagnostic: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "severity"],
      properties: {
        code: { enum: [...DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES] },
        message: { type: "string", minLength: 1, maxLength: 512 },
        severity: { enum: ["info", "warning", "error"] },
        path: { type: "string", minLength: 1, maxLength: 512 }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 当前结构Schema允许稀疏语言元数据；跨数组十万总预算仍由运行期核验，Schema单独不能证明。
 * @lang en Current structural schema permits sparse language metadata; the runtime still enforces the cross-array 100,000-result budget, which schema alone cannot prove.
 */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA = {
  ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA,
  $id: DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID,
  properties: { ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.properties,
    contractVersion: { const: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION } },
  $defs: { ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs,
    surface: { ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs.surface,
      properties: { ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs.surface.properties,
        languageMetadata: { ...LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs.surface.properties.languageMetadata, minItems: 0 } } } },
} as const;

const inputKeys = ["bundles", "contentLocales", "defaultUiLocale", "fallbackChains", "messages", "profileId", "requirements", "surfaces", "uiLocales"] as const;
const reportKeys = ["bundles", "compatibility", "contract", "contractVersion", "diagnostics", "evaluations", "fallbackPolicy", "localeScope", "messages", "privacy", "profileId", "requirements", "status", "surfaces"] as const;
const messageKeys = ["messageId", "placeholderNames", "visibility"] as const;
const bundleInputKeys = ["bundleId", "entries", "locale"] as const;
const bundleInventoryKeys = ["bundleId", "locale", "messageIds"] as const;
const bundleEntryKeys = ["messageId", "text"] as const;
const fallbackChainKeys = ["fallbackLocales", "uiLocale"] as const;
const surfaceKeys = ["contentLocale", "languageMetadata", "modes", "surfaceId"] as const;
const surfaceModeKeys = ["channels", "mode"] as const;
const languageMetadataKeys = ["documentLanguage", "partLanguages", "uiLocale"] as const;
const requirementKeys = ["channel", "messageId", "mode", "requirementId", "stateId", "surfaceId"] as const;
const localeScopeKeys = ["contentAndUiIndependent", "contentLocales", "defaultUiLocale", "inferFromContentLocale", "inferFromSystemLocale", "languageTagProfile", "uiLocales", "uiSelection"] as const;
const fallbackPolicyKeys = ["chains", "mode", "requiredMessageResolution", "resolutionOrder"] as const;
const evaluationKeys = ["contentLocale", "documentLanguage", "mode", "partLanguages", "results", "status", "summary", "surfaceId", "uiLocale"] as const;
const requirementResultKeys = ["channel", "messageId", "placeholderStatus", "requirementId", "resolution", "resolvedLocale", "stateId", "status"] as const;
const evaluationSummaryKeys = ["exact", "fallback", "missing", "placeholderMismatch", "requirements"] as const;
const privacyKeys = ["absolutePathIncluded", "contentBodyIncluded", "credentialIncluded", "messageTextIncluded", "personalIdentityIncluded", "privateMessageIncluded", "runtimeEnvironmentIncluded", "sourceBodyIncluded"] as const;
const compatibilityKeys = ["migrationPolicy", "unknownChannelPolicy", "unknownProperties", "versionMatch"] as const;
const diagnosticKeys = ["code", "message", "path", "severity"] as const;
const stableIdentityPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const messageIdentityPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/u;
const localePattern = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;
const placeholderPattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/u;
/** @lang zh-CN 报告可出现的固定诊断正文；生产者与独立 reader 共用，避免词表漂移。 @lang en Fixed report diagnostic prose shared by producer and independent reader to prevent vocabulary drift. */
const reportDiagnosticText = {
  noScript: "Every surface must declare a no-script UI message mode.",
  baseChannels: "Every surface mode must cover visible text and accessible names.",
  declaredChannel: "A declared UI message channel has no required message.",
  undeclaredChannel: "A required UI message uses a channel absent from its surface mode.",
  language: "Document and part language metadata must cover both content and UI locales.",
  fallback: "A required UI message resolved only through a declared fallback.",
  missing: "A required UI message is missing from the exact locale and its declared chain.",
  placeholder: "A localized UI message does not preserve the declared placeholder set."
} as const;
/** @lang zh-CN 固定 code/message 配对是报告诊断的第一道隐私边界。 @lang en Fixed code/message pairs are the first privacy boundary for report diagnostics. */
const reportDiagnosticMessages = new Map<DocumentationUiLocaleCompletenessDiagnosticCode, readonly string[]>([
  ["ULC_NO_SCRIPT_INCOMPLETE", [reportDiagnosticText.noScript]],
  ["ULC_ACCESSIBILITY_INCOMPLETE", [reportDiagnosticText.baseChannels, reportDiagnosticText.language]],
  ["ULC_MESSAGE_MISSING", [reportDiagnosticText.declaredChannel, reportDiagnosticText.undeclaredChannel, reportDiagnosticText.missing]],
  ["ULC_REQUIRED_MESSAGE_FALLBACK", [reportDiagnosticText.fallback]],
  ["ULC_PLACEHOLDER_MISMATCH", [reportDiagnosticText.placeholder]]
]);

/**
 * @lang zh-CN
 * 评估所有 surface × interactive/no-script × UI locale 组合；函数不读取文件、网络、系统 locale、浏览器或目标项目。
 *
 * @lang en
 * Evaluates every surface × interactive/no-script × UI-locale combination; the function reads no files, network, system locale, browser state, or target project.
 *
 * @param value <lang><zh-CN>显式、内存中的 message/surface 输入。</zh-CN><en>Explicit in-memory message and surface input.</en></lang>
 * @returns 深度冻结的 complete/incomplete 报告，或对非法、私密、超出 wire 容量的输入给出 public-safe refusal。 / Deeply frozen complete/incomplete report or a public-safe refusal for malformed, private or wire-overflow input.
 */
export function evaluateDocumentationUiLocaleCompleteness(value: unknown): DocumentationUiLocaleCompletenessResult {
  // <lang><zh-CN>先拒绝访问器/循环/类实例，不执行普通对象getter或toJSON；Proxy反射副作用不构成沙箱保证。</zh-CN><en>Reject accessors, cycles and class instances without invoking ordinary-object getters/toJSON; proxy reflection is not a sandbox guarantee.</en></lang>
  if (!isWireJsonDataGraph(value)) return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input must be ordinary JSON data."));
  // <lang><zh-CN>结构、identity、locale、fallback 与 plaintext privacy 先行校验，防止敏感正文进入 diagnostic/report。</zh-CN><en>Validate shape, identity, locale, fallback, and plain-text privacy first so sensitive text cannot enter diagnostics or reports.</en></lang>
  const inputDiagnostic = validateInput(value);
  if (inputDiagnostic) return refuse(inputDiagnostic);

  // <lang><zh-CN>预检后的 input 转为受信 shape，并把所有集合规范化为稳定 wire 顺序。</zh-CN><en>Cast the preflighted input to its trusted shape and normalize every collection into stable wire order.</en></lang>
  const input = value as DocumentationUiLocaleCompletenessInput;
  // <lang><zh-CN>全矩阵 evaluation 数可由两个已验证长度计算；超过 schema 限额时在生成任何 report 节点前固定拒绝。</zh-CN><en>The full evaluation count follows from two validated lengths; reject before creating report nodes when it exceeds the schema ceiling.</en></lang>
  if (input.surfaces.length * DOCUMENTATION_UI_LOCALE_MODES.length * input.uiLocales.length > maxReportEvaluations) {
    return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input exceeds the bounded evaluation limit."));
  }
  // <lang><zh-CN>每条要求属于唯一surface/mode，因此总result为R×U；在规范化与报告分配前拒绝超限。</zh-CN><en>Each requirement belongs to one surface/mode, so total results equal R×U; reject overflow before normalization or report allocation.</en></lang>
  if (input.requirements.length * input.uiLocales.length > DOCUMENTATION_UI_LOCALE_MAX_RESULTS) {
    return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input exceeds the total result limit."));
  }
  const contentLocales = sortLocales(input.contentLocales);
  const uiLocales = sortLocales(input.uiLocales);
  // <lang><zh-CN>默认 UI locale 复用 uiLocales 中第一次显式拼写，避免大小写等价标签产生双重 wire spelling。</zh-CN><en>The default UI locale reuses the first explicit spelling from uiLocales so case-equivalent tags do not create two wire spellings.</en></lang>
  const defaultUiLocale = uiLocales.find((locale) => localeEquals(locale, input.defaultUiLocale))!;
  const messages = input.messages
    .map((message) => ({ ...message, placeholderNames: [...message.placeholderNames].sort(compareStrings) }))
    .sort((left, right) => compareStrings(left.messageId, right.messageId));
  const bundles = input.bundles
    .map((bundle) => ({ bundleId: bundle.bundleId, locale: bundle.locale, messageIds: bundle.entries.map(({ messageId }) => messageId).sort(compareStrings) }))
    .sort((left, right) => compareLocales(left.locale, right.locale));
  const fallbackChains = input.fallbackChains
    .map((chain) => ({ uiLocale: chain.uiLocale, fallbackLocales: [...chain.fallbackLocales] }))
    .sort((left, right) => compareLocales(left.uiLocale, right.uiLocale));
  const surfaces = input.surfaces.map((surface) => normalizeSurface(surface, uiLocales)).sort((left, right) => compareStrings(left.surfaceId, right.surfaceId));
  const requirements = [...input.requirements].map((requirement) => ({ ...requirement })).sort((left, right) => compareStrings(left.requirementId, right.requirementId));

  // <lang><zh-CN>运行期 lookup maps 使用大小写不敏感 locale key；两个 accumulator 只收集 metadata-only 结果。</zh-CN><en>Runtime lookup maps use case-insensitive locale keys; the two accumulators collect metadata-only results.</en></lang>
  const definitionById = new Map(messages.map((message) => [message.messageId, message]));
  const inputBundleByLocale = new Map(input.bundles.map((bundle) => [localeKey(bundle.locale), bundle]));
  const fallbackByLocale = new Map(fallbackChains.map((chain) => [localeKey(chain.uiLocale), chain.fallbackLocales]));
  const diagnostics: HiaDiagnostic[] = [];
  // <lang><zh-CN>诊断预算按最终 code/path/message 去重身份计数；重复模式命中的同一路径不耗用额外 wire 容量。</zh-CN><en>Count diagnostic budget by final code/path/message identity so repeated mode hits on one path do not consume extra wire capacity.</en></lang>
  const diagnosticIdentities = new Set<string>();
  let diagnosticBudgetExceeded = false;
  /** @lang zh-CN 只收集 schema 上限内的不同诊断，超限记状态并由当前生成块返回固定拒绝。 @lang en Collects distinct diagnostics only within the schema limit; the current generation block returns a fixed refusal after overflow. */
  function appendReportDiagnostic(item: HiaDiagnostic): void {
    const identity = `${item.code}\u0000${item.path ?? ""}\u0000${item.message}`;
    if (diagnosticIdentities.has(identity) || diagnosticBudgetExceeded) return;
    if (diagnostics.length >= maxReportDiagnostics) {
      diagnosticBudgetExceeded = true;
      return;
    }
    diagnosticIdentities.add(identity);
    diagnostics.push(item);
  }
  const evaluations: DocumentationUiLocaleEvaluation[] = [];

  for (const surface of surfaces) {
    // <lang><zh-CN>固定展开两种 mode，缺失声明也会生成 incomplete evaluation，不能由调用方省略 no-script。</zh-CN><en>Always expand both modes; a missing declaration still produces an incomplete evaluation so callers cannot omit no-script.</en></lang>
    for (const mode of DOCUMENTATION_UI_LOCALE_MODES) {
      // <lang><zh-CN>本 mode 的声明、requirements 与 channel set 构成一次 UI chrome 覆盖闭包。</zh-CN><en>The declaration, requirements, and channel set for this mode form one UI-chrome coverage closure.</en></lang>
      const modeDefinition = surface.modes.find((candidate) => candidate.mode === mode)!;
      const modeRequirements = requirements.filter((requirement) => requirement.surfaceId === surface.surfaceId && requirement.mode === mode);
      const declaredChannels = new Set(modeDefinition.channels);

      if (mode === "no-script" && modeDefinition.channels.length === 0) {
        appendReportDiagnostic(diagnostic("ULC_NO_SCRIPT_INCOMPLETE", reportDiagnosticText.noScript, `surfaces.${surface.surfaceId}.modes.no-script`));
      }
      if (!declaredChannels.has("visible-text") || !declaredChannels.has("accessible-name")) {
        appendReportDiagnostic(diagnostic("ULC_ACCESSIBILITY_INCOMPLETE", reportDiagnosticText.baseChannels, `surfaces.${surface.surfaceId}.modes.${mode}`));
      }
      for (const channel of modeDefinition.channels) {
        if (!modeRequirements.some((requirement) => requirement.channel === channel)) {
          appendReportDiagnostic(diagnostic("ULC_MESSAGE_MISSING", reportDiagnosticText.declaredChannel, `surfaces.${surface.surfaceId}.modes.${mode}.channels.${channel}`));
        }
      }
      // <lang><zh-CN>反向核对每条 requirement；额外使用未声明通道也不能冒充完整覆盖。</zh-CN><en>Check every requirement in the other direction; an undeclared channel cannot masquerade as complete coverage.</en></lang>
      const undeclaredRequirements = modeRequirements.filter((requirement) => !declaredChannels.has(requirement.channel));
      for (const requirement of undeclaredRequirements) {
        appendReportDiagnostic(diagnostic("ULC_MESSAGE_MISSING", reportDiagnosticText.undeclaredChannel, `requirements.${requirement.requirementId}.channel`));
      }
      if (diagnosticBudgetExceeded) {
        return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input exceeds the bounded diagnostic limit."));
      }

      for (const uiLocale of uiLocales) {
        // <lang><zh-CN>语言元数据独立于 message lookup；默认语言与局部语言并集必须覆盖内容和 UI。</zh-CN><en>Language metadata is independent from message lookup; page-default and part languages must jointly cover content and UI.</en></lang>
        const metadata = surface.languageMetadata.find((candidate) => localeEquals(candidate.uiLocale, uiLocale));
        const documentLanguage = metadata?.documentLanguage ?? surface.contentLocale;
        const partLanguages = metadata ? sortLocales(metadata.partLanguages) : [];
        const languageMetadataComplete = Boolean(metadata) && coversLocale(documentLanguage, partLanguages, surface.contentLocale) && coversLocale(documentLanguage, partLanguages, uiLocale);
        if (!languageMetadataComplete) {
          appendReportDiagnostic(diagnostic("ULC_ACCESSIBILITY_INCOMPLETE", reportDiagnosticText.language, `surfaces.${surface.surfaceId}.languageMetadata.${uiLocale}`));
        }
        if (diagnosticBudgetExceeded) {
          return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input exceeds the bounded diagnostic limit."));
        }

        // <lang><zh-CN>逐 requirement 只投影 identity、resolution 与 placeholder 状态，原始 text 始终留在内存 lookup 中。</zh-CN><en>Project only identity, resolution, and placeholder state per requirement; raw text remains confined to the in-memory lookup.</en></lang>
        const results = modeRequirements.map((requirement) => {
          // <lang><zh-CN>定义集合与实际 bundle token 分别解析，再以 exact resolution + placeholder parity 判定覆盖。</zh-CN><en>Resolve the declared set and actual bundle tokens separately, then require exact resolution plus placeholder parity for coverage.</en></lang>
          const definition = definitionById.get(requirement.messageId)!;
          const resolved = resolveMessage(uiLocale, requirement.messageId, inputBundleByLocale, fallbackByLocale);
          const actualPlaceholders = resolved.entry ? extractPlaceholderNames(resolved.entry.text) : undefined;
          const placeholderStatus: DocumentationUiLocalePlaceholderStatus = actualPlaceholders
            ? (equalStrings(actualPlaceholders, definition.placeholderNames) ? "match" : "mismatch")
            : "unavailable";
          const covered = resolved.resolution === "exact" && placeholderStatus === "match";

          if (resolved.resolution === "declared-fallback") {
            appendReportDiagnostic(diagnostic("ULC_REQUIRED_MESSAGE_FALLBACK", reportDiagnosticText.fallback, `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
          } else if (resolved.resolution === "missing") {
            appendReportDiagnostic(diagnostic("ULC_MESSAGE_MISSING", reportDiagnosticText.missing, `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
          }
          if (resolved.entry && placeholderStatus === "mismatch") {
            appendReportDiagnostic(diagnostic("ULC_PLACEHOLDER_MISMATCH", reportDiagnosticText.placeholder, `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
          }

          // <lang><zh-CN>结果对象不含 text；resolvedLocale 仅在 exact/fallback 命中时出现。</zh-CN><en>The result object contains no text; resolvedLocale appears only after an exact or fallback hit.</en></lang>
          const result: DocumentationUiLocaleRequirementResult = {
            requirementId: requirement.requirementId,
            stateId: requirement.stateId,
            channel: requirement.channel,
            messageId: requirement.messageId,
            resolution: resolved.resolution,
            placeholderStatus,
            status: covered ? "covered" : "incomplete"
          };
          if (resolved.resolvedLocale) result.resolvedLocale = resolved.resolvedLocale;
          return result;
        });
        if (diagnosticBudgetExceeded) {
          return refuse(diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input exceeds the bounded diagnostic limit."));
        }

        // <lang><zh-CN>Evaluation status 同时收紧 message、channel 与语言元数据，任一不完整都不能放行。</zh-CN><en>Evaluation status jointly gates messages, channels, and language metadata; any incomplete dimension blocks completion.</en></lang>
        const summary = summarizeResults(results);
        const declaredChannelsCovered = modeDefinition.channels.every((channel) => modeRequirements.some((requirement) => requirement.channel === channel));
        const requiredBaseChannels = declaredChannels.has("visible-text") && declaredChannels.has("accessible-name");
        const status = languageMetadataComplete && declaredChannelsCovered && undeclaredRequirements.length === 0 && requiredBaseChannels
          && results.length > 0 && results.every(({ status: resultStatus }) => resultStatus === "covered")
          ? "complete"
          : "incomplete";
        evaluations.push({
          surfaceId: surface.surfaceId,
          mode,
          contentLocale: surface.contentLocale,
          uiLocale,
          documentLanguage,
          partLanguages,
          status,
          summary,
          results
        });
      }
    }
  }

  // <lang><zh-CN>最终 report 使用去重 diagnostic、固定 policy/privacy，并生成可重复的 property-sorted JSON。</zh-CN><en>The final report uses deduplicated diagnostics, fixed policy/privacy, and repeatable property-sorted JSON.</en></lang>
  const normalizedDiagnostics = normalizeDiagnostics(diagnostics);
  const status = evaluations.every((evaluation) => evaluation.status === "complete") && normalizedDiagnostics.length === 0 ? "complete" : "incomplete";
  const report: CurrentDocumentationUiLocaleCompletenessReport = {
    contract: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
    contractVersion: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
    status,
    profileId: input.profileId,
    localeScope: {
      contentLocales,
      uiLocales,
      defaultUiLocale,
      contentAndUiIndependent: true,
      uiSelection: "caller-explicit",
      inferFromContentLocale: false,
      inferFromSystemLocale: false,
      languageTagProfile: "bcp47-well-formed-subset"
    },
    fallbackPolicy: {
      mode: "explicit-chain-only",
      resolutionOrder: "exact-then-declared-chain",
      requiredMessageResolution: "exact",
      chains: fallbackChains
    },
    messages,
    bundles,
    surfaces,
    requirements,
    evaluations,
    privacy: createPrivacyBoundary(),
    compatibility: createCompatibilityBoundary(),
    diagnostics: normalizedDiagnostics
  };
  const summary = summarizeEvaluations(report);
  const reportJson = stableJson(report);
  return deepFreeze({ status, report, reportJson, summary, diagnostics: normalizedDiagnostics });
}

/**
 * @lang zh-CN
 * 验证公开 completeness report 的 closed-world shape、有界集合、固定诊断的隐私边界、compatibility、引用与计数 parity。
 *
 * @lang en
 * Validates the closed-world shape, bounded collections, fixed-diagnostic privacy boundary, compatibility, reference parity, and count parity of a public completeness report.
 *
 * @param value <lang><zh-CN>候选 report。</zh-CN><en>Candidate report.</en></lang>
 * @returns public-safe diagnostics；空数组表示有效。 / Public-safe diagnostics; an empty array means valid.
 */
export function validateDocumentationUiLocaleCompletenessReport(value: unknown): HiaDiagnostic[] {
  if (!isRecord(value)) return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report must be an object.")];
  // <lang><zh-CN>描述符读取版本不触发普通getter；当前版先累计result长度，再运行会遍历值的JSON/shape检查。</zh-CN><en>Read the version descriptor without ordinary getters; for current reports sum result lengths before JSON/shape checks traverse values.</en></lang>
  const version = dataProperty(value, "contractVersion");
  if (version !== DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION && version !== LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION) {
    return [diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale completeness contract and version must match exactly.")];
  }
  const current = version === DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION;
  if (current && !hasBoundedReportResults(value)) return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report exceeds the total result limit.")];
  if (!isWireJsonDataGraph(value)) return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report must be ordinary JSON data.")];
  if (value.contract !== DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT) return [diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale completeness contract and version must match exactly.")];
  if (!hasExactKeys(value, reportKeys) || !isReportShape(value)) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report must match the closed-world contract shape.")];
  }

  // <lang><zh-CN>完成 closed-world shape 后才读取 typed report，先检查不可协商的 privacy/compatibility。</zh-CN><en>Read the typed report only after closed-world shape validation, then check non-negotiable privacy and compatibility first.</en></lang>
  const report = value as unknown as DocumentationUiLocaleCompletenessReport;
  if (!isPrivacyBoundary(report.privacy)) {
    return [diagnostic("ULC_PRIVACY_BOUNDARY", "UI-locale completeness report must keep every privacy disclosure false.")];
  }
  if (!isCompatibilityBoundary(report.compatibility)) {
    return [diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale completeness compatibility policy is unsupported.")];
  }

  // <lang><zh-CN>Report 不含 text，validator 因而验证声明/结果闭包和计数，而不伪装成重新执行 placeholder gate。</zh-CN><en>The report contains no text, so the validator checks declaration/result closure and counts without pretending to rerun the placeholder gate.</en></lang>
  // <lang><zh-CN>Identity maps 与 locale sets 用于证明所有跨引用闭合且 bundle identity 唯一。</zh-CN><en>Identity maps and locale sets prove that all cross-references close and bundle identities remain unique.</en></lang>
  const messageIds = new Set(report.messages.map(({ messageId }) => messageId));
  const requirementById = new Map(report.requirements.map((requirement) => [requirement.requirementId, requirement]));
  const surfaceById = new Map(report.surfaces.map((surface) => [surface.surfaceId, surface]));
  const bundleIds = new Set(report.bundles.map(({ bundleId }) => bundleId));
  const bundleLocales = new Set(report.bundles.map(({ locale }) => localeKey(locale)));
  if (messageIds.size !== report.messages.length || requirementById.size !== report.requirements.length || surfaceById.size !== report.surfaces.length
    || bundleIds.size !== report.bundles.length || bundleLocales.size !== report.bundles.length) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness identities must be unique.")];
  }
  if (report.requirements.some((requirement) => !messageIds.has(requirement.messageId) || !surfaceById.has(requirement.surfaceId))
    || report.bundles.some((bundle) => bundle.messageIds.some((messageId) => !messageIds.has(messageId)))) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness references must resolve within the report.")];
  }
  // <lang><zh-CN>复用 input fallback preflight，并检查每个 surface 都完整声明固定 mode/locale 矩阵。</zh-CN><en>Reuse input fallback preflight and check that every surface fully declares the fixed mode/locale matrix.</en></lang>
  const fallbackDiagnostic = validateFallbackChains(report.fallbackPolicy.chains, report.localeScope.uiLocales, bundleLocales);
  if (fallbackDiagnostic) return [fallbackDiagnostic];
  // <lang><zh-CN>每个 bundle 的消息身份只建一次集合；大量 requirement 的来源核对不能逐次线性扫描清单。</zh-CN><en>Index each bundle's message identities once; many requirement resolutions must not repeatedly scan the inventory linearly.</en></lang>
  const bundleByLocale = new Map(report.bundles.map((bundle) => [localeKey(bundle.locale), {
    locale: bundle.locale,
    messageIds: new Set(bundle.messageIds)
  }]));
  const fallbackByLocale = new Map(report.fallbackPolicy.chains.map((chain) => [localeKey(chain.uiLocale), chain.fallbackLocales]));
  if (report.surfaces.some((surface) => {
    const modeIdentities = new Set(surface.modes.map(({ mode }) => mode));
    const metadataIdentities = new Set(surface.languageMetadata.map(({ uiLocale }) => localeKey(uiLocale)));
    return !includesLocale(report.localeScope.contentLocales, surface.contentLocale)
      || modeIdentities.size !== DOCUMENTATION_UI_LOCALE_MODES.length
      || DOCUMENTATION_UI_LOCALE_MODES.some((mode) => !modeIdentities.has(mode))
      || (current
        ? metadataIdentities.size !== surface.languageMetadata.length || surface.languageMetadata.some(({ uiLocale }) => !includesLocale(report.localeScope.uiLocales, uiLocale))
        : metadataIdentities.size !== report.localeScope.uiLocales.length || report.localeScope.uiLocales.some((locale) => !metadataIdentities.has(localeKey(locale))));
  })) {
    return [diagnostic("ULC_INVALID_CONTRACT", "Surface mode and language-metadata declarations must cover the frozen locale matrix exactly.")];
  }

  // <lang><zh-CN>期望组合数与组合 identity set 一起防止漏项和重复项互相抵消。</zh-CN><en>The expected combination count and identity set jointly prevent omissions and duplicates from cancelling each other.</en></lang>
  const expectedEvaluationCount = report.surfaces.length * DOCUMENTATION_UI_LOCALE_MODES.length * report.localeScope.uiLocales.length;
  if (report.evaluations.length !== expectedEvaluationCount) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale evaluations must cover every surface, required mode, and UI locale.")];
  }
  // <lang><zh-CN>来源索引只从当前报告可验证的缺口建立；诊断路径必须回接相应 surface、requirement 或 evaluation 事实。</zh-CN><en>Build provenance only from report-observable gaps; diagnostic paths must join to their surface, requirement or evaluation facts.</en></lang>
  const diagnosticPaths = createReportDiagnosticPathIndex(report, requirementById);
  if (!diagnosticPaths) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report exceeds the bounded diagnostic facts.")];
  }
  if (report.diagnostics.some((item) => !isPublicSafeReportDiagnostic(item, diagnosticPaths))) {
    return [diagnostic("ULC_PRIVACY_BOUNDARY", "UI-locale completeness report diagnostics must use fixed public-safe text and actual structural paths.")];
  }
  // <lang><zh-CN>新版诊断必须完整对应真实缺口，缺元数据不能靠删诊断伪造通过；旧报告保持原读取规则。</zh-CN><en>Current diagnostics must cover actual gaps completely; deleting missing-metadata findings cannot forge acceptance, while legacy reading retains its rules.</en></lang>
  if (current) {
    const actualFindings = new Set(report.diagnostics.map((item) => `${item.message}\u0000${item.path}`));
    const expectedFindings = [...diagnosticPaths].flatMap(([message, paths]) => [...paths].map((path) => `${message}\u0000${path}`));
    if (actualFindings.size !== report.diagnostics.length || actualFindings.size !== expectedFindings.length || expectedFindings.some((finding) => !actualFindings.has(finding))) {
      return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness diagnostics must cover every actual finding.")];
    }
  }
  // <lang><zh-CN>组合键确保数量正确但重复同一组合、遗漏另一组合的伪报告也会被拒绝。</zh-CN><en>Combination keys reject reports that preserve counts by duplicating one combination while omitting another.</en></lang>
  const evaluationKeysSeen = new Set<string>();
  for (const evaluation of report.evaluations) {
    // <lang><zh-CN>每条 evaluation 必须精确回接 surface、mode、语言元数据和唯一组合 identity。</zh-CN><en>Each evaluation must join exactly to its surface, mode, language metadata, and unique combination identity.</en></lang>
    const surface = surfaceById.get(evaluation.surfaceId);
    const modeDefinition = surface?.modes.find(({ mode }) => mode === evaluation.mode);
    const metadata = surface?.languageMetadata.find(({ uiLocale }) => localeEquals(uiLocale, evaluation.uiLocale));
    const evaluationIdentity = `${evaluation.surfaceId}\u0000${evaluation.mode}\u0000${localeKey(evaluation.uiLocale)}`;
    if (!surface || !modeDefinition || !includesLocale(report.localeScope.uiLocales, evaluation.uiLocale)
      || evaluation.contentLocale !== surface.contentLocale || (!metadata && !current)
      || (metadata?.documentLanguage ?? surface.contentLocale) !== evaluation.documentLanguage
      || !equalStrings(metadata?.partLanguages ?? [], evaluation.partLanguages) || evaluationKeysSeen.has(evaluationIdentity)) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation identity, locale, surface, or language metadata drifted from its declaration.")];
    }
    evaluationKeysSeen.add(evaluationIdentity);
    // <lang><zh-CN>Result collection 逐字段对齐 declaration，随后重算 count 和 coverage status。</zh-CN><en>The result collection aligns field-for-field with declarations before counts and coverage status are recomputed.</en></lang>
    const expectedRequirements = report.requirements.filter((requirement) => requirement.surfaceId === evaluation.surfaceId && requirement.mode === evaluation.mode);
    if (!equalStrings(evaluation.results.map(({ requirementId }) => requirementId), expectedRequirements.map(({ requirementId }) => requirementId))) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation requirement results must preserve exact declaration parity.")];
    }
    if (evaluation.results.some((result, index) => {
      const requirement = expectedRequirements[index];
      return !requirement || result.stateId !== requirement.stateId || result.channel !== requirement.channel || result.messageId !== requirement.messageId;
    })) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation result facts must match their declared requirements.")];
    }
    if (evaluation.results.some((result) => {
      const expectedResultStatus = result.resolution === "exact" && result.placeholderStatus === "match" ? "covered" : "incomplete";
      const localePresenceValid = result.resolution === "missing" ? result.resolvedLocale === undefined : isLocale(result.resolvedLocale);
      const placeholderPresenceValid = result.resolution === "missing" ? result.placeholderStatus === "unavailable" : result.placeholderStatus !== "unavailable";
      const inventoryResolution = resolveInventoryMessage(evaluation.uiLocale, result.messageId, bundleByLocale, fallbackByLocale);
      const inventoryLocaleValid = inventoryResolution.resolvedLocale === undefined
        ? result.resolvedLocale === undefined
        : typeof result.resolvedLocale === "string" && localeEquals(result.resolvedLocale, inventoryResolution.resolvedLocale);
      return result.status !== expectedResultStatus || !localePresenceValid || !placeholderPresenceValid
        || result.resolution !== inventoryResolution.resolution || !inventoryLocaleValid;
    })) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation resolution, placeholder, locale, and coverage states must remain consistent.")];
    }
    const expectedSummary = summarizeResults(evaluation.results);
    if (!equalSummary(evaluation.summary, expectedSummary)) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation summary does not match its requirement results.")];
    }
    const declaredChannelsCovered = modeDefinition.channels.every((channel) => expectedRequirements.some((requirement) => requirement.channel === channel));
    const requirementChannelsDeclared = expectedRequirements.every((requirement) => modeDefinition.channels.includes(requirement.channel));
    const requiredBaseChannels = modeDefinition.channels.includes("visible-text") && modeDefinition.channels.includes("accessible-name");
    const expectedStatus = evaluation.results.length > 0 && evaluation.results.every(({ status }) => status === "covered")
      && declaredChannelsCovered && requirementChannelsDeclared && requiredBaseChannels && Boolean(metadata)
      && coversLocale(evaluation.documentLanguage, evaluation.partLanguages, evaluation.contentLocale)
      && coversLocale(evaluation.documentLanguage, evaluation.partLanguages, evaluation.uiLocale)
      ? "complete"
      : "incomplete";
    if (evaluation.status !== expectedStatus) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation status does not match requirements, channels, and language declarations.")];
    }
  }
  if ((report.status === "complete") !== (report.evaluations.every(({ status }) => status === "complete") && report.diagnostics.length === 0)) {
    return [diagnostic("ULC_INVALID_CONTRACT", "Report status does not match evaluations and diagnostics.")];
  }
  return [];
}

/**
 * @lang zh-CN 用精确旧报告与完整真实内存消息重新评估当前报告；拒绝无源换号或声明身份漂移。报告不含译文，不能证明历史正文相同或实际DOM通过。
 * @lang en Re-evaluates a current report from an exact legacy report and complete actual in-memory messages; refuses report-only relabeling or declaration drift. Body-free reports cannot prove historical text equality or DOM compliance.
 * @param value <lang><zh-CN>仅legacyReport/sourceInput两字段的普通JSON对象；不读文件、环境或网络，不修改输入。</zh-CN><en>Ordinary JSON object with only legacyReport/sourceInput; no file, environment or network reads, or input mutation.</en></lang>
 * @returns <lang><zh-CN>独立深冻结的新complete/incomplete结果，或固定无部分报告的拒绝；旧complete允许因实际占位符漂移变为incomplete。</zh-CN><en>Detached deeply frozen current complete/incomplete result, or fixed refusal without a partial report; legacy complete may become incomplete due to actual placeholder drift.</en></lang>
 * @remarks <lang><zh-CN>普通getter/toJSON不执行；Proxy反射副作用和调用前已物化的大对象不受沙箱保护。</zh-CN><en>Ordinary getters/toJSON are not invoked; proxy reflection side effects and already-materialized large objects are not sandboxed.</en></lang>
 */
export function migrateDocumentationUiLocaleCompletenessReport(value: unknown): DocumentationUiLocaleCompletenessResult {
  // <lang><zh-CN>先用数据描述符取旧工件并核总量，再遍历整个输入；缺原始消息不能从旧清单猜正文。</zh-CN><en>Read the legacy artifact via data descriptors and check total size before traversing input; missing original messages cannot be guessed from inventories.</en></lang>
  const legacy = isRecord(value) ? dataProperty(value, "legacyReport") : undefined;
  if (!isRecord(value) || !isRecord(legacy) || !hasBoundedReportResults(legacy) || !isWireJsonDataGraph(value)
    || !hasExactKeys(value, ["legacyReport", "sourceInput"]) || legacy.contractVersion !== LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION
    || validateDocumentationUiLocaleCompletenessReport(legacy).length > 0) {
    return refuse(diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale migration requires an exact legacy report and complete source input."));
  }
  // <lang><zh-CN>评估器从实际文本重新比对占位符，结果可以诚实变为不完整，不复制旧状态。</zh-CN><en>The evaluator compares placeholders from actual text; the result may truthfully become incomplete rather than copying historical status.</en></lang>
  const rebuilt = evaluateDocumentationUiLocaleCompleteness(value.sourceInput);
  if (!rebuilt.report) return rebuilt;
  if (stableJson(declarationIdentity(legacy as unknown as LegacyDocumentationUiLocaleCompletenessReport)) !== stableJson(declarationIdentity(rebuilt.report))) {
    return refuse(diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale migration source declarations must match the legacy report exactly."));
  }
  if (validateDocumentationUiLocaleCompletenessReport(rebuilt.report).length > 0) {
    return refuse(diagnostic("ULC_INVALID_CONTRACT", "Rebuilt UI-locale report does not satisfy the current contract."));
  }
  return rebuilt;
}

/**
 * @lang zh-CN 选择可由旧报告证明的声明身份，排除正文、版本和评估结果；只用于无损身份配对。
 * @lang en Selects declaration identities provable from a legacy report, excluding bodies, versions and evaluation outcomes; used only for identity pairing.
 * @param report <lang><zh-CN>已验证报告。</zh-CN><en>Validated report.</en></lang>
 * @returns <lang><zh-CN>只读使用的声明投影，不传给调用者。</zh-CN><en>Declaration projection used internally, never returned to callers.</en></lang>
 */
function declarationIdentity(report: DocumentationUiLocaleCompletenessReport): unknown {
  return { profileId: report.profileId, localeScope: report.localeScope, fallbackPolicy: report.fallbackPolicy,
    messages: report.messages, bundles: report.bundles, surfaces: report.surfaces, requirements: report.requirements };
}

/**
 * @lang zh-CN 在读取result值前只累加数组长度；缺结构、访问器或超限返回false，不能替代受限JSON解码。
 * @lang en Sums array lengths before reading result values; missing shapes, accessors or overflow return false, without replacing bounded JSON decoding.
 * @param report <lang><zh-CN>尚未深入读取的报告对象。</zh-CN><en>Report object not yet deeply read.</en></lang>
 * @returns <lang><zh-CN>外层数组和总result容量满足上限。</zh-CN><en>Outer array and total results satisfy their ceilings.</en></lang>
 */
function hasBoundedReportResults(report: Record<string, unknown>): boolean {
  // <lang><zh-CN>预算仅依赖自有数据描述符，不能通过数组或条目的普通访问器执行正文。</zh-CN><en>The budget uses own data descriptors so ordinary array/entry accessors cannot execute bodies.</en></lang>
  const evaluations = dataProperty(report, "evaluations");
  if (!Array.isArray(evaluations) || evaluations.length > maxReportEvaluations) return false;
  let total = 0;
  for (let index = 0; index < evaluations.length; index += 1) {
    const evaluation = dataProperty(evaluations, String(index));
    const results = isRecord(evaluation) ? dataProperty(evaluation, "results") : undefined;
    if (!Array.isArray(results)) return false;
    total += results.length;
    if (total > DOCUMENTATION_UI_LOCALE_MAX_RESULTS) return false;
  }
  return true;
}

/**
 * @lang zh-CN 仅读取自有数据属性，访问器和反射异常视为缺项；不执行普通getter。
 * @lang en Reads only own data properties; accessors and reflection errors count as absent, without invoking ordinary getters.
 * @param value <lang><zh-CN>对象。</zh-CN><en>Object.</en></lang>
 * @param key <lang><zh-CN>固定字段或数组索引。</zh-CN><en>Fixed field or array index.</en></lang>
 * @returns <lang><zh-CN>数据值或undefined。</zh-CN><en>Data value or undefined.</en></lang>
 */
function dataProperty(value: object, key: string): unknown {
  try { return Object.getOwnPropertyDescriptor(value, key)?.value; } catch { return undefined; }
}

/**
 * @lang zh-CN 在普通JSON图基础上拒绝隐藏自有字段，避免后续已知字段读取进入未被图预检访问的子图；不修改共用JSON辅助器的语义。
 * @lang en Rejects hidden own fields in an ordinary JSON graph so known-field reads cannot enter subgraphs skipped by graph preflight; shared JSON-helper semantics are unchanged.
 * @param value <lang><zh-CN>未知内存输入。</zh-CN><en>Unknown in-memory input.</en></lang>
 * @returns <lang><zh-CN>所有对象自有字段均为可枚举数据属性，数组仅豁免原生length；反射失败为false。</zh-CN><en>All own object fields are enumerable data properties, with only native array length exempt; reflection failures return false.</en></lang>
 */
function isWireJsonDataGraph(value: unknown): boolean {
  if (!isJsonDataGraph(value)) return false;
  // <lang><zh-CN>第二个只读有界遍历只核可枚举性，共享子图只访问一次；getter不会通过属性取值执行。</zh-CN><en>A second read-only traversal checks enumerability, visiting shared subgraphs once and never invoking getters through property reads.</en></lang>
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  try {
    while (pending.length > 0) {
      const current = pending.pop();
      if (typeof current !== "object" || current === null || seen.has(current)) continue;
      seen.add(current);
      for (const key of Object.getOwnPropertyNames(current)) {
        if (Array.isArray(current) && key === "length") continue;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) return false;
        pending.push(descriptor.value);
      }
    }
    return true;
  } catch { return false; }
}

/** @lang zh-CN 输入预检返回第一个 public-safe refusal。 @lang en Input preflight returns the first public-safe refusal. */
function validateInput(value: unknown): HiaDiagnostic | undefined {
  if (!isRecord(value) || !hasExactKeys(value, inputKeys)) {
    return diagnostic("ULC_INVALID_INPUT", "UI-locale completeness input must match the closed-world input shape.");
  }
  if (!isStableIdentity(value.profileId)) {
    return diagnostic("ULC_INVALID_INPUT", "UI-locale completeness profile identity is invalid.");
  }
  if (!isLocaleArray(value.contentLocales, true) || !isLocaleArray(value.uiLocales, true) || !isLocale(value.defaultUiLocale)
    || !includesLocale(value.uiLocales, value.defaultUiLocale)) {
    return diagnostic("ULC_LOCALE_SCOPE_INVALID", "Content/UI locale scopes and the default UI locale must be explicit and internally consistent.");
  }
  if (!Array.isArray(value.messages) || value.messages.length === 0 || value.messages.length > 10000) {
    return diagnostic("ULC_MESSAGE_IDENTITY_INVALID", "UI message definitions must be a non-empty bounded array.");
  }
  // <lang><zh-CN>Message set 同时承担重复检测和后续 bundle/requirement 引用解析。</zh-CN><en>The message set detects duplicates and later resolves bundle and requirement references.</en></lang>
  const messageIds = new Set<string>();
  for (const candidate of value.messages) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, messageKeys) || !isMessageIdentity(candidate.messageId)
      || candidate.visibility !== "public" || !isPlaceholderArray(candidate.placeholderNames) || messageIds.has(candidate.messageId)) {
      return diagnostic("ULC_MESSAGE_IDENTITY_INVALID", "UI message identities, visibility, and placeholder definitions must be stable and unique.");
    }
    messageIds.add(candidate.messageId);
  }
  if (!Array.isArray(value.bundles) || value.bundles.length === 0 || value.bundles.length > 1000) {
    return diagnostic("ULC_INVALID_INPUT", "UI locale bundles must be a non-empty bounded array.");
  }
  // <lang><zh-CN>Bundle identity 与大小写不敏感 locale 分开去重，entry identity 在每个 bundle 内去重。</zh-CN><en>Deduplicate bundle identity and case-insensitive locale separately, and entry identity within each bundle.</en></lang>
  const bundleIds = new Set<string>();
  const bundleLocales = new Set<string>();
  for (const candidate of value.bundles) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, bundleInputKeys) || !isStableIdentity(candidate.bundleId) || !isLocale(candidate.locale)
      || bundleIds.has(candidate.bundleId) || bundleLocales.has(localeKey(candidate.locale)) || !Array.isArray(candidate.entries)) {
      return diagnostic("ULC_INVALID_INPUT", "UI locale bundle identity, locale, or entry collection is invalid.");
    }
    bundleIds.add(candidate.bundleId);
    bundleLocales.add(localeKey(candidate.locale));
    const entryIds = new Set<string>();
    for (const entry of candidate.entries) {
      if (!isRecord(entry) || !hasExactKeys(entry, bundleEntryKeys) || !isMessageIdentity(entry.messageId) || !messageIds.has(entry.messageId)
        || typeof entry.text !== "string" || entry.text.length === 0 || entry.text.length > 8192 || entryIds.has(entry.messageId)) {
        return diagnostic("ULC_INVALID_INPUT", "UI locale bundle entries must reference unique declared messages and non-empty text.");
      }
      if (entry.text.includes("<") || entry.text.includes(">")) {
        return diagnostic("ULC_PRIVACY_BOUNDARY", "UI locale bundles accept public plain text only; markup-like content is refused.");
      }
      entryIds.add(entry.messageId);
    }
  }
  // <lang><zh-CN>Fallback 通过后再校验 surface 与 requirement graph，避免 unresolved refs 进入 evaluator。</zh-CN><en>Validate the surface and requirement graph after fallback succeeds so unresolved references never enter evaluation.</en></lang>
  const fallbackDiagnostic = validateFallbackChains(value.fallbackChains, value.uiLocales, bundleLocales);
  if (fallbackDiagnostic) return fallbackDiagnostic;
  if (!Array.isArray(value.surfaces) || value.surfaces.length === 0 || value.surfaces.length > 1000) {
    return diagnostic("ULC_INVALID_INPUT", "UI locale surfaces must be a non-empty bounded array.");
  }
  const surfaceIds = new Set<string>();
  for (const candidate of value.surfaces) {
    if (!isInputSurface(candidate, value.contentLocales, value.uiLocales) || surfaceIds.has(candidate.surfaceId)) {
      return diagnostic("ULC_INVALID_INPUT", "UI locale surface declarations are malformed or contain duplicate identities.");
    }
    surfaceIds.add(candidate.surfaceId);
  }
  if (!Array.isArray(value.requirements) || value.requirements.length === 0 || value.requirements.length > 50000) {
    return diagnostic("ULC_INVALID_INPUT", "UI locale requirements must be a non-empty bounded array.");
  }
  const requirementIds = new Set<string>();
  for (const candidate of value.requirements) {
    if (!isRequirement(candidate) || requirementIds.has(candidate.requirementId) || !surfaceIds.has(candidate.surfaceId) || !messageIds.has(candidate.messageId)) {
      return diagnostic("ULC_INVALID_INPUT", "UI locale requirements must have unique identities and resolvable surface/message references.");
    }
    // <lang><zh-CN>Requirement 可暂时指向缺失的 mode/channel；gate 会把这种声明漂移报告为 incomplete，而不是吞掉覆盖证据。</zh-CN><en>A requirement may temporarily target a missing mode/channel; the gate reports that declaration drift as incomplete instead of discarding coverage evidence.</en></lang>
    requirementIds.add(candidate.requirementId);
  }
  return undefined;
}

/** @lang zh-CN 校验显式 chain 完整性、目标 bundle 与无环约束。 @lang en Validates explicit chain coverage, target bundles, and acyclicity. */
function validateFallbackChains(value: unknown, uiLocales: unknown[], bundleLocales: Set<string>): HiaDiagnostic | undefined {
  if (!Array.isArray(value) || value.length !== uiLocales.length) {
    return diagnostic("ULC_FALLBACK_UNDECLARED", "Every UI locale must have exactly one explicit fallback chain.");
  }
  // <lang><zh-CN>大小写不敏感 chain map 同时执行 UI locale 唯一性和覆盖核对。</zh-CN><en>The case-insensitive chain map simultaneously checks UI-locale uniqueness and coverage.</en></lang>
  const chainByLocale = new Map<string, string[]>();
  for (const candidate of value) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, fallbackChainKeys) || !isLocale(candidate.uiLocale)
      || !isLocaleArray(candidate.fallbackLocales, false)) {
      return diagnostic("ULC_FALLBACK_UNDECLARED", "Fallback chains must be explicit, unique, bundle-backed, and non-self-referential.");
    }
    // <lang><zh-CN>窄化后的 locale 与 chain 供闭包安全复用，不重新读取 unknown record。</zh-CN><en>The narrowed locale and chain are reused safely by closures without rereading the unknown record.</en></lang>
    const uiLocale = candidate.uiLocale;
    const fallbackLocales = candidate.fallbackLocales;
    if (!includesLocale(uiLocales, uiLocale) || chainByLocale.has(localeKey(uiLocale))
      || fallbackLocales.some((locale) => localeEquals(locale, uiLocale))
      || fallbackLocales.some((locale) => !bundleLocales.has(localeKey(locale)))) {
      return diagnostic("ULC_FALLBACK_UNDECLARED", "Fallback chains must be explicit, unique, bundle-backed, and non-self-referential.");
    }
    chainByLocale.set(localeKey(uiLocale), fallbackLocales);
  }
  for (const uiLocale of uiLocales) {
    if (typeof uiLocale !== "string" || !chainByLocale.has(localeKey(uiLocale))) {
      return diagnostic("ULC_FALLBACK_UNDECLARED", "Every UI locale must have exactly one explicit fallback chain.");
    }
  }
  // <lang><zh-CN>遍历每条有序回退边，而非只取首个 UI locale；迭代栈避免长链递归耗尽调用栈。</zh-CN><en>Visit every ordered fallback edge rather than only the first UI locale; an iterative stack avoids recursion on long chains.</en></lang>
  const visitState = new Map<string, "visiting" | "visited">();
  for (const start of chainByLocale.keys()) {
    if (visitState.get(start) === "visited") continue;
    const pending: { locale: string; nextFallback: number }[] = [{ locale: start, nextFallback: 0 }];
    visitState.set(start, "visiting");
    while (pending.length > 0) {
      const frame = pending[pending.length - 1]!;
      const fallbackLocales = chainByLocale.get(frame.locale)!;
      if (frame.nextFallback === fallbackLocales.length) {
        visitState.set(frame.locale, "visited");
        pending.pop();
        continue;
      }
      const next = localeKey(fallbackLocales[frame.nextFallback++]!);
      if (!chainByLocale.has(next)) continue;
      if (visitState.get(next) === "visiting") return diagnostic("ULC_FALLBACK_UNDECLARED", "Fallback chains must not contain cycles.");
      if (visitState.get(next) === "visited") continue;
      visitState.set(next, "visiting");
      pending.push({ locale: next, nextFallback: 0 });
    }
  }
  return undefined;
}

/** @lang zh-CN 校验 surface 的基础 shape；可访问性完整性留给 gate 形成 incomplete report。 @lang en Validates basic surface shape; accessibility completeness remains a gate-level incomplete result. */
function isInputSurface(value: unknown, contentLocales: unknown[], uiLocales: unknown[]): value is DocumentationUiLocaleSurface {
  if (!isRecord(value) || !hasExactKeys(value, surfaceKeys) || !isStableIdentity(value.surfaceId) || !isLocale(value.contentLocale)
    || !includesLocale(contentLocales, value.contentLocale) || !Array.isArray(value.modes) || !Array.isArray(value.languageMetadata)) return false;
  const modes = new Set<string>();
  for (const candidate of value.modes) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, surfaceModeKeys) || !isMode(candidate.mode) || !isChannelArray(candidate.channels)
      || modes.has(candidate.mode)) return false;
    modes.add(candidate.mode);
  }
  const metadataLocales = new Set<string>();
  for (const candidate of value.languageMetadata) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, languageMetadataKeys) || !isLocale(candidate.uiLocale) || !includesLocale(uiLocales, candidate.uiLocale)
      || !isLocale(candidate.documentLanguage) || !isLocaleArray(candidate.partLanguages, false) || metadataLocales.has(localeKey(candidate.uiLocale))) return false;
    metadataLocales.add(localeKey(candidate.uiLocale));
  }
  return true;
}

/** @lang zh-CN 把缺失 mode 显式投影为空 channel，以便完整组合仍可审计。 @lang en Projects missing modes as empty channels so the full combination matrix remains auditable. */
function normalizeSurface(surface: DocumentationUiLocaleSurface, uiLocales: string[]): DocumentationUiLocaleSurface {
  // <lang><zh-CN>固定 mode 顺序并用空 channel 暴露缺失声明；语言元数据按 UI locale 稳定排序。</zh-CN><en>Freeze mode order and expose missing declarations with empty channels; sort language metadata stably by UI locale.</en></lang>
  const modes = DOCUMENTATION_UI_LOCALE_MODES.map((mode) => ({
    mode,
    channels: [...(surface.modes.find((candidate) => candidate.mode === mode)?.channels ?? [])].sort(compareChannels)
  }));
  const languageMetadata = surface.languageMetadata
    .filter((metadata) => includesLocale(uiLocales, metadata.uiLocale))
    .map((metadata) => ({ ...metadata, partLanguages: sortLocales(metadata.partLanguages) }))
    .sort((left, right) => compareLocales(left.uiLocale, right.uiLocale));
  return { surfaceId: surface.surfaceId, contentLocale: surface.contentLocale, modes, languageMetadata };
}

/** @lang zh-CN exact 优先，再按 caller chain 查找；不做 truncation、likely-subtag 或系统默认推断。 @lang en Resolves exact first, then the caller chain; it performs no truncation, likely-subtag, or system-default inference. */
function resolveMessage(
  uiLocale: string,
  messageId: string,
  bundles: Map<string, DocumentationUiLocaleBundle>,
  fallbackChains: Map<string, string[]>
): { entry?: DocumentationUiLocaleBundleEntry; resolution: DocumentationUiLocaleResolution; resolvedLocale?: string } {
  // <lang><zh-CN>Exact bundle/entry 永远优先于显式 chain，避免默认 locale 覆盖目标 locale。</zh-CN><en>The exact bundle/entry always precedes the explicit chain so a default locale cannot override the target locale.</en></lang>
  const exactBundle = bundles.get(localeKey(uiLocale));
  const exactEntry = exactBundle?.entries.find((entry) => entry.messageId === messageId);
  if (exactBundle && exactEntry) return { entry: exactEntry, resolution: "exact", resolvedLocale: exactBundle.locale };
  for (const fallbackLocale of fallbackChains.get(localeKey(uiLocale)) ?? []) {
    const fallbackBundle = bundles.get(localeKey(fallbackLocale));
    const fallbackEntry = fallbackBundle?.entries.find((entry) => entry.messageId === messageId);
    if (fallbackBundle && fallbackEntry) return { entry: fallbackEntry, resolution: "declared-fallback", resolvedLocale: fallbackBundle.locale };
  }
  return { resolution: "missing" };
}

/**
 * @lang zh-CN
 * 仅用公开 bundle 清单重算报告声称的来源语言；不把占位符状态误当作可从无正文报告重验。
 *
 * @lang en
 * Recomputes the claimed source locale from public bundle inventories only; placeholder status cannot be rechecked without message text.
 *
 * @param uiLocale <lang><zh-CN>当前评估要求的界面语言。</zh-CN><en>UI locale required by this evaluation.</en></lang>
 * @param messageId <lang><zh-CN>已声明的稳定消息身份。</zh-CN><en>Declared stable message identity.</en></lang>
 * @param bundles <lang><zh-CN>按不区分大小写语言键索引的无正文消息集合。</zh-CN><en>Text-free message sets indexed by case-insensitive locale key.</en></lang>
 * @param fallbackChains <lang><zh-CN>按语言键索引的显式有序回退列表。</zh-CN><en>Explicit ordered fallback lists indexed by locale key.</en></lang>
 * @returns <lang><zh-CN>清单可证的解析状态及命中语言。</zh-CN><en>Inventory-supported resolution and matched locale.</en></lang>
 */
function resolveInventoryMessage(
  uiLocale: string,
  messageId: string,
  bundles: Map<string, { locale: string; messageIds: ReadonlySet<string> }>,
  fallbackChains: Map<string, string[]>
): { resolution: DocumentationUiLocaleResolution; resolvedLocale?: string } {
  // <lang><zh-CN>目标 UI bundle 的命中优先于任何回退，且必须含确切消息身份。</zh-CN><en>An exact target UI bundle hit precedes every fallback and must contain the precise message identity.</en></lang>
  const exactBundle = bundles.get(localeKey(uiLocale));
  if (exactBundle?.messageIds.has(messageId)) return { resolution: "exact", resolvedLocale: exactBundle.locale };
  // <lang><zh-CN>按声明顺序寻找第一项可用回退；未列出的语言不能被报告声称为来源。</zh-CN><en>Find the first available fallback in declared order; the report cannot claim an undeclared source locale.</en></lang>
  for (const fallbackLocale of fallbackChains.get(localeKey(uiLocale)) ?? []) {
    const fallbackBundle = bundles.get(localeKey(fallbackLocale));
    if (fallbackBundle?.messageIds.has(messageId)) return { resolution: "declared-fallback", resolvedLocale: fallbackBundle.locale };
  }
  return { resolution: "missing" };
}

/** @lang zh-CN 提取非执行 `{name}` 占位符并稳定排序；非法 token 会以不可匹配名称保留。 @lang en Extracts non-executable `{name}` placeholders in stable order; invalid tokens remain as non-matching names. */
function extractPlaceholderNames(text: string): string[] {
  // <lang><zh-CN>临时 name list 不保留 text；重复 placeholder 规范化为同一声明 identity。</zh-CN><en>The temporary name list retains no text; repeated placeholders normalize to one declared identity.</en></lang>
  const names: string[] = [];
  for (const match of text.matchAll(/\{([^{}]*)\}/gu)) names.push(match[1] ?? "");
  if ((text.match(/\{/gu)?.length ?? 0) !== names.length || (text.match(/\}/gu)?.length ?? 0) !== names.length) names.push("__invalid_brace__");
  return [...new Set(names)].sort(compareStrings);
}

/** @lang zh-CN 汇总单次 evaluation 的 resolution 与 placeholder 计数。 @lang en Summarizes resolution and placeholder counts for one evaluation. */
function summarizeResults(results: DocumentationUiLocaleRequirementResult[]): DocumentationUiLocaleEvaluationSummary {
  return {
    requirements: results.length,
    exact: results.filter(({ resolution }) => resolution === "exact").length,
    fallback: results.filter(({ resolution }) => resolution === "declared-fallback").length,
    missing: results.filter(({ resolution }) => resolution === "missing").length,
    placeholderMismatch: results.filter(({ placeholderStatus }) => placeholderStatus === "mismatch").length
  };
}

/** @lang zh-CN 汇总整个 report；同一 requirement 在每个 UI locale 分别计数。 @lang en Summarizes the entire report; each requirement is counted once per UI locale. */
function summarizeEvaluations(report: DocumentationUiLocaleCompletenessReport): DocumentationUiLocaleCompletenessSummary {
  return report.evaluations.reduce<DocumentationUiLocaleCompletenessSummary>((summary, evaluation) => ({
    ...summary,
    exact: summary.exact + evaluation.summary.exact,
    fallback: summary.fallback + evaluation.summary.fallback,
    missing: summary.missing + evaluation.summary.missing,
    placeholderMismatch: summary.placeholderMismatch + evaluation.summary.placeholderMismatch
  }), {
    surfaces: report.surfaces.length,
    uiLocales: report.localeScope.uiLocales.length,
    evaluations: report.evaluations.length,
    requirements: report.requirements.length,
    exact: 0,
    fallback: 0,
    missing: 0,
    placeholderMismatch: 0
  });
}

/** @lang zh-CN 创建不会泄漏 translation/source/runtime 的固定 privacy 边界。 @lang en Creates the fixed privacy boundary that exposes no translation, source, or runtime data. */
function createPrivacyBoundary(): DocumentationUiLocaleCompletenessPrivacy {
  return {
    messageTextIncluded: false,
    contentBodyIncluded: false,
    sourceBodyIncluded: false,
    absolutePathIncluded: false,
    credentialIncluded: false,
    personalIdentityIncluded: false,
    privateMessageIncluded: false,
    runtimeEnvironmentIncluded: false
  };
}

/** @lang zh-CN 创建 exact、closed-world compatibility 边界。 @lang en Creates the exact, closed-world compatibility boundary. */
function createCompatibilityBoundary(): DocumentationUiLocaleCompletenessCompatibility {
  return { versionMatch: "exact", unknownProperties: "reject", unknownChannelPolicy: "reject", migrationPolicy: "explicit-pure" };
}

/** @lang zh-CN 生成不含 partial report 的 refusal。 @lang en Creates a refusal with no partial report. */
function refuse(item: HiaDiagnostic): DocumentationUiLocaleCompletenessResult {
  return deepFreeze({ status: "refused", diagnostics: [item] });
}

/** @lang zh-CN 生成固定英文 machine diagnostic；中文语义由 code 文档/evidence 解释。 @lang en Creates a stable English machine diagnostic; Chinese semantics live in code documentation and evidence. */
function diagnostic(code: DocumentationUiLocaleCompletenessDiagnosticCode, message: string, path?: string): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", path ? { path } : {});
}

/** @lang zh-CN 按 code/path/message 去重并稳定排序 diagnostic。 @lang en Deduplicates and stably orders diagnostics by code/path/message. */
function normalizeDiagnostics(items: HiaDiagnostic[]): HiaDiagnostic[] {
  // <lang><zh-CN>Diagnostic identity 只由稳定 code/path/message 构成，不使用数组位置或时间戳。</zh-CN><en>Diagnostic identity uses only stable code/path/message, never array positions or timestamps.</en></lang>
  const byIdentity = new Map<string, HiaDiagnostic>();
  for (const item of items) byIdentity.set(`${item.code}\u0000${item.path ?? ""}\u0000${item.message}`, item);
  return [...byIdentity.values()].sort((left, right) => compareStrings(`${left.code}\u0000${left.path ?? ""}`, `${right.code}\u0000${right.path ?? ""}`));
}

/** @lang zh-CN 判断 report 的完整结构 shape 与 schema 已限定的集合长度。 @lang en Checks the complete structural shape and schema-bounded collection lengths of a report. */
function isReportShape(value: Record<string, unknown>): boolean {
  return (value.status === "complete" || value.status === "incomplete")
    && isStableIdentity(value.profileId)
    && isLocaleScope(value.localeScope)
    && isFallbackPolicy(value.fallbackPolicy)
    && Array.isArray(value.messages) && value.messages.length > 0 && value.messages.length <= 10000 && value.messages.every((item) => isMessageDefinition(item))
    && Array.isArray(value.bundles) && value.bundles.length > 0 && value.bundles.length <= 1000 && value.bundles.every((item) => isBundleInventory(item))
    && Array.isArray(value.surfaces) && value.surfaces.length > 0 && value.surfaces.length <= 1000 && value.surfaces.every((item) => isReportSurface(item))
    && Array.isArray(value.requirements) && value.requirements.length > 0 && value.requirements.length <= 50000 && value.requirements.every((item) => isRequirement(item))
    && Array.isArray(value.evaluations) && value.evaluations.length > 0 && value.evaluations.length <= maxReportEvaluations && value.evaluations.every((item) => isEvaluation(item))
    && isRecord(value.privacy) && hasExactKeys(value.privacy, privacyKeys)
    && isRecord(value.compatibility) && hasExactKeys(value.compatibility, compatibilityKeys)
    && Array.isArray(value.diagnostics) && value.diagnostics.length <= maxReportDiagnostics && value.diagnostics.every((item) => isDiagnostic(item));
}

/** @lang zh-CN 判断 locale scope 固定字段和 locale 数组。 @lang en Checks fixed locale-scope fields and locale arrays. */
function isLocaleScope(value: unknown): value is DocumentationUiLocaleScope {
  return isRecord(value) && hasExactKeys(value, localeScopeKeys)
    && isLocaleArray(value.contentLocales, true) && isLocaleArray(value.uiLocales, true) && isLocale(value.defaultUiLocale)
    && includesLocale(value.uiLocales, value.defaultUiLocale) && value.contentAndUiIndependent === true
    && value.uiSelection === "caller-explicit" && value.inferFromContentLocale === false && value.inferFromSystemLocale === false
    && value.languageTagProfile === "bcp47-well-formed-subset";
}

/** @lang zh-CN 判断 report fallback policy 的固定语义。 @lang en Checks the fixed semantics of a report fallback policy. */
function isFallbackPolicy(value: unknown): value is DocumentationUiLocaleFallbackPolicy {
  return isRecord(value) && hasExactKeys(value, fallbackPolicyKeys) && value.mode === "explicit-chain-only"
    && value.resolutionOrder === "exact-then-declared-chain" && value.requiredMessageResolution === "exact"
    && Array.isArray(value.chains) && value.chains.length > 0 && value.chains.length <= 1000 && value.chains.every((item) => isFallbackChain(item));
}

/** @lang zh-CN 判断不含正文的 message definition。 @lang en Checks a text-free message definition. */
function isMessageDefinition(value: unknown): value is DocumentationUiLocaleMessageDefinition {
  return isRecord(value) && hasExactKeys(value, messageKeys) && isMessageIdentity(value.messageId)
    && isPlaceholderArray(value.placeholderNames) && value.visibility === "public";
}

/** @lang zh-CN 判断 metadata-only bundle inventory。 @lang en Checks a metadata-only bundle inventory. */
function isBundleInventory(value: unknown): value is DocumentationUiLocaleBundleInventory {
  return isRecord(value) && hasExactKeys(value, bundleInventoryKeys) && isStableIdentity(value.bundleId)
    && isLocale(value.locale) && Array.isArray(value.messageIds) && value.messageIds.length <= 10000
    && value.messageIds.every(isMessageIdentity) && new Set(value.messageIds).size === value.messageIds.length;
}

/** @lang zh-CN 判断 report surface；完整 report 固定包含两个 mode。 @lang en Checks a report surface; a complete report always contains both modes. */
function isReportSurface(value: unknown): value is DocumentationUiLocaleSurface {
  return isRecord(value) && hasExactKeys(value, surfaceKeys) && isStableIdentity(value.surfaceId) && isLocale(value.contentLocale)
    && Array.isArray(value.modes) && value.modes.length === 2 && value.modes.every((item) => isSurfaceMode(item))
    && Array.isArray(value.languageMetadata) && value.languageMetadata.every((item) => isLanguageMetadata(item));
}

/** @lang zh-CN 判断 surface mode。 @lang en Checks a surface mode. */
function isSurfaceMode(value: unknown): value is DocumentationUiLocaleSurfaceMode {
  return isRecord(value) && hasExactKeys(value, surfaceModeKeys) && isMode(value.mode) && isChannelArray(value.channels);
}

/** @lang zh-CN 判断页面/局部语言声明。 @lang en Checks page and language-of-parts metadata. */
function isLanguageMetadata(value: unknown): value is DocumentationUiLocaleLanguageMetadata {
  return isRecord(value) && hasExactKeys(value, languageMetadataKeys) && isLocale(value.uiLocale)
    && isLocale(value.documentLanguage) && isLocaleArray(value.partLanguages, false);
}

/** @lang zh-CN 判断 requirement shape。 @lang en Checks requirement shape. */
function isRequirement(value: unknown): value is DocumentationUiLocaleRequirement {
  return isRecord(value) && hasExactKeys(value, requirementKeys) && isStableIdentity(value.requirementId)
    && isStableIdentity(value.surfaceId) && isMode(value.mode) && isStableIdentity(value.stateId)
    && isChannel(value.channel) && isMessageIdentity(value.messageId);
}

/** @lang zh-CN 判断单个 evaluation 与其 result/summary shape，并在逐项读取前应用 schema 上限。 @lang en Checks one evaluation and its result/summary shape, applying the schema limit before reading items. */
function isEvaluation(value: unknown): value is DocumentationUiLocaleEvaluation {
  return isRecord(value) && hasExactKeys(value, evaluationKeys) && isStableIdentity(value.surfaceId) && isMode(value.mode)
    && isLocale(value.contentLocale) && isLocale(value.uiLocale) && isLocale(value.documentLanguage) && isLocaleArray(value.partLanguages, false)
    && (value.status === "complete" || value.status === "incomplete") && isEvaluationSummary(value.summary)
    && Array.isArray(value.results) && value.results.length <= 50000 && value.results.every((item) => isRequirementResult(item));
}

/** @lang zh-CN 判断 requirement result，包括 resolvedLocale 的条件 shape。 @lang en Checks a requirement result, including the conditional resolved locale. */
function isRequirementResult(value: unknown): value is DocumentationUiLocaleRequirementResult {
  if (!isRecord(value) || !hasExactKeys(value, requirementResultKeys) || !isStableIdentity(value.requirementId) || !isStableIdentity(value.stateId)
    || !isChannel(value.channel) || !isMessageIdentity(value.messageId) || !["exact", "declared-fallback", "missing"].includes(String(value.resolution))
    || !["match", "mismatch", "unavailable"].includes(String(value.placeholderStatus)) || !["covered", "incomplete"].includes(String(value.status))) return false;
  return value.resolution === "missing" ? value.resolvedLocale === undefined : isLocale(value.resolvedLocale);
}

/** @lang zh-CN 判断非负整数 evaluation summary。 @lang en Checks a non-negative integer evaluation summary. */
function isEvaluationSummary(value: unknown): value is DocumentationUiLocaleEvaluationSummary {
  return isRecord(value) && hasExactKeys(value, evaluationSummaryKeys)
    && [value.requirements, value.exact, value.fallback, value.missing, value.placeholderMismatch].every(isCount);
}

/** @lang zh-CN 判断 diagnostic 基础 shape 与 code 闭集；正文/路径隐私另由 report 规则核定。 @lang en Checks the diagnostic base shape and closed code set; report rules separately verify prose/path privacy. */
function isDiagnostic(value: unknown): value is HiaDiagnostic {
  return isRecord(value) && hasExactKeys(value, diagnosticKeys)
    && DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES.includes(value.code as DocumentationUiLocaleCompletenessDiagnosticCode)
    && typeof value.message === "string" && value.message.length > 0 && value.message.length <= 512 && value.severity === "error"
    && (value.path === undefined || (typeof value.path === "string" && value.path.length > 0 && value.path.length <= 512));
}

/**
 * @lang zh-CN
 * 从报告已有的声明与结果重建八类可公开诊断路径；缺口事实超过 wire 上限时停止，不分配无限增长的路径集合。
 *
 * @lang en
 * Rebuilds the eight admissible diagnostic path families from report declarations and results; stops if observable findings exceed the wire ceiling.
 *
 * @param report <lang><zh-CN>已通过闭集 shape 与矩阵数量检查的报告。</zh-CN><en>Report with closed-world shape and matrix count already checked.</en></lang>
 * @param requirementById <lang><zh-CN>同一报告内已索引的 requirement。</zh-CN><en>Requirements indexed from the same report.</en></lang>
 * @returns <lang><zh-CN>按固定消息分组的真实路径，超限则无索引。</zh-CN><en>Actual paths grouped by fixed message, or no index on overflow.</en></lang>
 */
function createReportDiagnosticPathIndex(
  report: DocumentationUiLocaleCompletenessReport,
  requirementById: ReadonlyMap<string, DocumentationUiLocaleRequirement>
): Map<string, Set<string>> | undefined {
  // <lang><zh-CN>路径按固定消息分组，同一路径可对应不同诊断事实，故容量按 message/path 配对计数。</zh-CN><en>Group paths by fixed message; one path may represent distinct findings, so the budget counts message/path pairs.</en></lang>
  const pathsByMessage = new Map<string, Set<string>>();
  let distinctPathCount = 0;
  /** @lang zh-CN 在上限内记录真实缺口路径；返回 false 表示报告无法由本契约有界表示。 @lang en Records an actual finding path within the ceiling; false means this contract cannot represent the report within bounds. */
  function record(message: string, path: string): boolean {
    let paths = pathsByMessage.get(message);
    if (!paths) {
      paths = new Set<string>();
      pathsByMessage.set(message, paths);
    }
    if (paths.has(path)) return true;
    if (distinctPathCount >= maxReportDiagnostics) return false;
    paths.add(path);
    distinctPathCount += 1;
    return true;
  }

  // <lang><zh-CN>先索引 requirement 的真实 surface/mode/channel，供声明缺项和越界通道双向判定。</zh-CN><en>Index real requirement surface/mode/channel facts for both missing declarations and undeclared channel use.</en></lang>
  const requirementChannels = new Set(report.requirements.map((item) => `${item.surfaceId}\u0000${item.mode}\u0000${item.channel}`));
  const modeBySurface = new Map<string, DocumentationUiLocaleSurfaceMode>();
  for (const surface of report.surfaces) {
    for (const mode of surface.modes) {
      modeBySurface.set(`${surface.surfaceId}\u0000${mode.mode}`, mode);
      if (mode.mode === "no-script" && mode.channels.length === 0
        && !record(reportDiagnosticText.noScript, `surfaces.${surface.surfaceId}.modes.no-script`)) return undefined;
      if ((!mode.channels.includes("visible-text") || !mode.channels.includes("accessible-name"))
        && !record(reportDiagnosticText.baseChannels, `surfaces.${surface.surfaceId}.modes.${mode.mode}`)) return undefined;
      for (const channel of mode.channels) {
        if (!requirementChannels.has(`${surface.surfaceId}\u0000${mode.mode}\u0000${channel}`)
          && !record(reportDiagnosticText.declaredChannel, `surfaces.${surface.surfaceId}.modes.${mode.mode}.channels.${channel}`)) return undefined;
      }
    }
    // <lang><zh-CN>语言元数据可缺省；此时 evaluator 仍对每个显式 UI locale 形成固定缺口路径。</zh-CN><en>Language metadata may be absent; the evaluator still emits a fixed gap path for each explicit UI locale.</en></lang>
    for (const uiLocale of report.localeScope.uiLocales) {
      const metadata = surface.languageMetadata.find((item) => localeEquals(item.uiLocale, uiLocale));
      const documentLanguage = metadata?.documentLanguage ?? surface.contentLocale;
      const partLanguages = metadata?.partLanguages ?? [];
      if ((!metadata || !coversLocale(documentLanguage, partLanguages, surface.contentLocale)
        || !coversLocale(documentLanguage, partLanguages, uiLocale))
        && !record(reportDiagnosticText.language, `surfaces.${surface.surfaceId}.languageMetadata.${uiLocale}`)) return undefined;
    }
  }
  for (const requirement of report.requirements) {
    const mode = modeBySurface.get(`${requirement.surfaceId}\u0000${requirement.mode}`);
    if (mode && !mode.channels.includes(requirement.channel)
      && !record(reportDiagnosticText.undeclaredChannel, `requirements.${requirement.requirementId}.channel`)) return undefined;
  }

  // <lang><zh-CN>结果路径必须同时落在真实 evaluation 与对应 requirement 上；仅凭正则形状不足以阻止伪造身份。</zh-CN><en>Result paths must join an actual evaluation and matching requirement; syntax alone cannot reject fabricated identities.</en></lang>
  for (const evaluation of report.evaluations) {
    for (const result of evaluation.results) {
      const requirement = requirementById.get(result.requirementId);
      if (!requirement || requirement.surfaceId !== evaluation.surfaceId || requirement.mode !== evaluation.mode) continue;
      const path = `evaluations.${evaluation.surfaceId}.${evaluation.mode}.${evaluation.uiLocale}.${result.requirementId}`;
      if (result.resolution === "declared-fallback" && !record(reportDiagnosticText.fallback, path)) return undefined;
      if (result.resolution === "missing" && !record(reportDiagnosticText.missing, path)) return undefined;
      if (result.placeholderStatus === "mismatch" && !record(reportDiagnosticText.placeholder, path)) return undefined;
    }
  }
  return pathsByMessage;
}

/**
 * @lang zh-CN
 * 将报告诊断限制在 evaluator 的固定 code/message 配对及报告可回接的实际缺口路径；身份内容仍由生产者负责。
 *
 * @lang en
 * Restricts report diagnostics to the evaluator's fixed code/message pairs and paths backed by actual report facts; producers remain responsible for identity contents.
 *
 * @param value <lang><zh-CN>待核的一条已过基础 shape 的诊断。</zh-CN><en>One diagnostic that passed the basic shape check.</en></lang>
 * @param pathsByMessage <lang><zh-CN>从同一报告重建的允许路径。</zh-CN><en>Admissible paths rebuilt from the same report.</en></lang>
 * @returns <lang><zh-CN>code、固定正文与真实路径均匹配才为 true。</zh-CN><en>True only when code, fixed prose and actual path match.</en></lang>
 */
function isPublicSafeReportDiagnostic(value: HiaDiagnostic, pathsByMessage: ReadonlyMap<string, ReadonlySet<string>>): boolean {
  const expectedMessages = reportDiagnosticMessages.get(value.code as DocumentationUiLocaleCompletenessDiagnosticCode);
  return expectedMessages?.includes(value.message) === true
    && typeof value.path === "string" && pathsByMessage.get(value.message)?.has(value.path) === true;
}

/** @lang zh-CN 判断 all-false privacy。 @lang en Checks the all-false privacy boundary. */
function isPrivacyBoundary(value: DocumentationUiLocaleCompletenessPrivacy): boolean {
  return Object.values(value).every((flag) => flag === false);
}

/** @lang zh-CN 判断 exact/closed-world compatibility。 @lang en Checks exact/closed-world compatibility. */
function isCompatibilityBoundary(value: DocumentationUiLocaleCompletenessCompatibility): boolean {
  return value.versionMatch === "exact" && value.unknownProperties === "reject"
    && value.unknownChannelPolicy === "reject" && value.migrationPolicy === "explicit-pure";
}

/** @lang zh-CN 判断 fallback chain 的基础 wire shape。 @lang en Checks the basic wire shape of a fallback chain. */
function isFallbackChain(value: unknown): value is DocumentationUiLocaleFallbackChain {
  return isRecord(value) && hasExactKeys(value, fallbackChainKeys) && isLocale(value.uiLocale) && isLocaleArray(value.fallbackLocales, false);
}

/** @lang zh-CN 判断 stable dotted identity。 @lang en Checks a stable dotted identity. */
function isStableIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && stableIdentityPattern.test(value);
}

/** @lang zh-CN 判断至少含两段的 stable dotted message identity。 @lang en Checks a stable dotted message identity with at least two segments. */
function isMessageIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && messageIdentityPattern.test(value);
}

/** @lang zh-CN 判断 BCP-47-shaped P1 locale。 @lang en Checks a BCP-47-shaped P1 locale. */
function isLocale(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && localePattern.test(value);
}

/** @lang zh-CN 判断大小写不敏感唯一的 locale array。 @lang en Checks a case-insensitively unique locale array. */
function isLocaleArray(value: unknown, nonEmpty: boolean): value is string[] {
  return Array.isArray(value) && (!nonEmpty || value.length > 0) && value.length <= 1000 && value.every(isLocale)
    && new Set(value.map(localeKey)).size === value.length;
}

/** @lang zh-CN 判断唯一、有效的 placeholder array。 @lang en Checks a unique valid placeholder array. */
function isPlaceholderArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 64 && value.every((item) => typeof item === "string" && placeholderPattern.test(item))
    && new Set(value).size === value.length;
}

/** @lang zh-CN 判断唯一 channel array。 @lang en Checks a unique channel array. */
function isChannelArray(value: unknown): value is DocumentationUiLocaleChannel[] {
  return Array.isArray(value) && value.length <= DOCUMENTATION_UI_LOCALE_CHANNELS.length && value.every(isChannel)
    && new Set(value).size === value.length;
}

/** @lang zh-CN 判断已冻结 mode。 @lang en Checks a frozen mode. */
function isMode(value: unknown): value is DocumentationUiLocaleMode {
  return DOCUMENTATION_UI_LOCALE_MODES.includes(value as DocumentationUiLocaleMode);
}

/** @lang zh-CN 判断已冻结 message channel。 @lang en Checks a frozen message channel. */
function isChannel(value: unknown): value is DocumentationUiLocaleChannel {
  return DOCUMENTATION_UI_LOCALE_CHANNELS.includes(value as DocumentationUiLocaleChannel);
}

/** @lang zh-CN 判断非负整数 count。 @lang en Checks a non-negative integer count. */
function isCount(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1000000;
}

/** @lang zh-CN 判断对象是否只含允许键；optional key 缺失仍允许。 @lang en Checks that an object contains only allowed keys; optional keys may be absent. */
function hasExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  // <lang><zh-CN>实际键用于 unknown-field 拒绝，允许集合同时用于 required-field 检查。</zh-CN><en>Actual keys reject unknown fields, while the allowed set also drives required-field checks.</en></lang>
  const actual = Object.keys(value);
  const allowed = new Set(allowedKeys);
  return actual.every((key) => allowed.has(key)) && allowedKeys.filter((key) => !["path", "resolvedLocale"].includes(key)).every((key) => key in value);
}

/** @lang zh-CN 判断非数组 object。 @lang en Checks for a non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @lang zh-CN 大小写不敏感 locale key。 @lang en Case-insensitive locale key. */
function localeKey(value: string): string {
  return value.toLowerCase();
}

/** @lang zh-CN 比较两个 locale。 @lang en Compares two locales. */
function localeEquals(left: string, right: string): boolean {
  return localeKey(left) === localeKey(right);
}

/** @lang zh-CN 判断数组是否包含 locale。 @lang en Checks whether an array contains a locale. */
function includesLocale(values: unknown[], locale: string): boolean {
  return values.some((value) => typeof value === "string" && localeEquals(value, locale));
}

/** @lang zh-CN 判断页面默认语言与局部语言并集是否覆盖目标 locale。 @lang en Checks whether page-default and part languages jointly cover a target locale. */
function coversLocale(documentLanguage: string, partLanguages: string[], locale: string): boolean {
  return localeEquals(documentLanguage, locale) || includesLocale(partLanguages, locale);
}

/** @lang zh-CN 按大小写不敏感 locale key 稳定排序。 @lang en Stably sorts by case-insensitive locale key. */
function sortLocales(values: string[]): string[] {
  return [...values].sort(compareLocales);
}

/** @lang zh-CN locale 比较函数。 @lang en Locale comparator. */
function compareLocales(left: string, right: string): number {
  return compareStrings(localeKey(left), localeKey(right));
}

/** @lang zh-CN channel 按冻结词表顺序排序。 @lang en Sorts channels by frozen-vocabulary order. */
function compareChannels(left: DocumentationUiLocaleChannel, right: DocumentationUiLocaleChannel): number {
  return DOCUMENTATION_UI_LOCALE_CHANNELS.indexOf(left) - DOCUMENTATION_UI_LOCALE_CHANNELS.indexOf(right);
}

/** @lang zh-CN Unicode code-point 近似稳定字符串比较。 @lang en Stable string comparison approximating Unicode code-point order. */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @lang zh-CN 比较两个有序字符串数组。 @lang en Compares two ordered string arrays. */
function equalStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** @lang zh-CN 比较两个 evaluation summary。 @lang en Compares two evaluation summaries. */
function equalSummary(left: DocumentationUiLocaleEvaluationSummary, right: DocumentationUiLocaleEvaluationSummary): boolean {
  return left.requirements === right.requirements && left.exact === right.exact && left.fallback === right.fallback
    && left.missing === right.missing && left.placeholderMismatch === right.placeholderMismatch;
}

/** @lang zh-CN 生成 property-sorted deterministic JSON。 @lang en Produces property-sorted deterministic JSON. */
function stableJson(value: unknown): string {
  return `${JSON.stringify(value, (_, item) => isRecord(item)
    ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => compareStrings(left, right)))
    : item, 2)}\n`;
}

/** @lang zh-CN 递归冻结公开结果，避免调用方改变已验证事实。 @lang en Recursively freezes public results so callers cannot mutate validated facts. */
function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}
