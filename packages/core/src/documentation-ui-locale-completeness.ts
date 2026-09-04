import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic } from "./model.js";

/**
 * @lang zh-CN
 * 跨 renderer UI locale 完整性报告的中性 contract 名称；它不绑定 Portal、JSDoc、DOM 或翻译平台。
 *
 * @lang en
 * Neutral contract name for cross-renderer UI-locale completeness reports; it binds no Portal, JSDoc, DOM, or translation platform.
 */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT = "documentation-ui-locale-completeness" as const;

/** @lang zh-CN P1 exact-match 草案版本。 @lang en Exact-match P1 draft version. */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION = "0.1.0-draft" as const;

/** @lang zh-CN 公开 schema identity。 @lang en Public schema identity. */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID =
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
 * `documentation-ui-locale-completeness@0.1.0-draft` canonical metadata-only wire report。
 *
 * @lang en
 * Canonical metadata-only wire report for `documentation-ui-locale-completeness@0.1.0-draft`.
 */
export interface DocumentationUiLocaleCompletenessReport {
  bundles: DocumentationUiLocaleBundleInventory[];
  compatibility: DocumentationUiLocaleCompletenessCompatibility;
  contract: typeof DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT;
  contractVersion: typeof DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION;
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
 * Pure evaluator 结果；malformed/private 输入不返回 report，有效但覆盖不足的输入返回 incomplete report。
 *
 * @lang en
 * Pure evaluator result; malformed/private input returns no report, while valid but under-covered input returns an incomplete report.
 */
export interface DocumentationUiLocaleCompletenessResult {
  diagnostics: HiaDiagnostic[];
  report?: DocumentationUiLocaleCompletenessReport;
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

/**
 * @lang zh-CN
 * Draft 2020-12 结构 schema；message text 不是 wire 字段，跨引用与计数 parity 由 owner validator 执行。
 *
 * @lang en
 * Draft 2020-12 structural schema; message text is not a wire field, while cross-reference and count parity are enforced by the owner validator.
 */
export const DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_UI_LOCALE_COMPLETENESS_SCHEMA_ID,
  title: "Documentation UI Locale Completeness",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "profileId", "localeScope", "fallbackPolicy", "messages", "bundles", "surfaces", "requirements", "evaluations", "privacy", "compatibility", "diagnostics"],
  properties: {
    contract: { const: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT },
    contractVersion: { const: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION },
    status: { enum: ["complete", "incomplete"] },
    profileId: identitySchema,
    localeScope: { $ref: "#/$defs/localeScope" },
    fallbackPolicy: { $ref: "#/$defs/fallbackPolicy" },
    messages: { type: "array", minItems: 1, maxItems: 10000, items: { $ref: "#/$defs/message" } },
    bundles: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/bundle" } },
    surfaces: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/surface" } },
    requirements: { type: "array", minItems: 1, maxItems: 50000, items: { $ref: "#/$defs/requirement" } },
    evaluations: { type: "array", minItems: 1, maxItems: 100000, items: { $ref: "#/$defs/evaluation" } },
    privacy: { $ref: "#/$defs/privacy" },
    compatibility: { $ref: "#/$defs/compatibility" },
    diagnostics: { type: "array", maxItems: 100000, items: { $ref: "#/$defs/diagnostic" } }
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

/**
 * @lang zh-CN
 * 评估所有 surface × interactive/no-script × UI locale 组合；函数不读取文件、网络、系统 locale、浏览器或目标项目。
 *
 * @lang en
 * Evaluates every surface × interactive/no-script × UI-locale combination; the function reads no files, network, system locale, browser state, or target project.
 *
 * @param value <lang><zh-CN>显式、内存中的 message/surface 输入。</zh-CN><en>Explicit in-memory message and surface input.</en></lang>
 * @returns deeply frozen complete/incomplete report，或 public-safe refusal。 / Deeply frozen complete/incomplete report or public-safe refusal.
 */
export function evaluateDocumentationUiLocaleCompleteness(value: unknown): DocumentationUiLocaleCompletenessResult {
  // <lang><zh-CN>结构、identity、locale、fallback 与 plaintext privacy 先行校验，防止敏感正文进入 diagnostic/report。</zh-CN><en>Validate shape, identity, locale, fallback, and plain-text privacy first so sensitive text cannot enter diagnostics or reports.</en></lang>
  const inputDiagnostic = validateInput(value);
  if (inputDiagnostic) return refuse(inputDiagnostic);

  // <lang><zh-CN>预检后的 input 转为受信 shape，并把所有集合规范化为稳定 wire 顺序。</zh-CN><en>Cast the preflighted input to its trusted shape and normalize every collection into stable wire order.</en></lang>
  const input = value as DocumentationUiLocaleCompletenessInput;
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
  const evaluations: DocumentationUiLocaleEvaluation[] = [];

  for (const surface of surfaces) {
    // <lang><zh-CN>固定展开两种 mode，缺失声明也会生成 incomplete evaluation，不能由调用方省略 no-script。</zh-CN><en>Always expand both modes; a missing declaration still produces an incomplete evaluation so callers cannot omit no-script.</en></lang>
    for (const mode of DOCUMENTATION_UI_LOCALE_MODES) {
      // <lang><zh-CN>本 mode 的声明、requirements 与 channel set 构成一次 UI chrome 覆盖闭包。</zh-CN><en>The declaration, requirements, and channel set for this mode form one UI-chrome coverage closure.</en></lang>
      const modeDefinition = surface.modes.find((candidate) => candidate.mode === mode)!;
      const modeRequirements = requirements.filter((requirement) => requirement.surfaceId === surface.surfaceId && requirement.mode === mode);
      const declaredChannels = new Set(modeDefinition.channels);

      if (mode === "no-script" && modeDefinition.channels.length === 0) {
        diagnostics.push(diagnostic("ULC_NO_SCRIPT_INCOMPLETE", "Every surface must declare a no-script UI message mode.", `surfaces.${surface.surfaceId}.modes.no-script`));
      }
      if (!declaredChannels.has("visible-text") || !declaredChannels.has("accessible-name")) {
        diagnostics.push(diagnostic("ULC_ACCESSIBILITY_INCOMPLETE", "Every surface mode must cover visible text and accessible names.", `surfaces.${surface.surfaceId}.modes.${mode}`));
      }
      for (const channel of modeDefinition.channels) {
        if (!modeRequirements.some((requirement) => requirement.channel === channel)) {
          diagnostics.push(diagnostic("ULC_MESSAGE_MISSING", "A declared UI message channel has no required message.", `surfaces.${surface.surfaceId}.modes.${mode}.channels.${channel}`));
        }
      }

      for (const uiLocale of uiLocales) {
        // <lang><zh-CN>语言元数据独立于 message lookup；默认语言与局部语言并集必须覆盖内容和 UI。</zh-CN><en>Language metadata is independent from message lookup; page-default and part languages must jointly cover content and UI.</en></lang>
        const metadata = surface.languageMetadata.find((candidate) => localeEquals(candidate.uiLocale, uiLocale));
        const documentLanguage = metadata?.documentLanguage ?? surface.contentLocale;
        const partLanguages = metadata ? sortLocales(metadata.partLanguages) : [];
        const languageMetadataComplete = Boolean(metadata) && coversLocale(documentLanguage, partLanguages, surface.contentLocale) && coversLocale(documentLanguage, partLanguages, uiLocale);
        if (!languageMetadataComplete) {
          diagnostics.push(diagnostic("ULC_ACCESSIBILITY_INCOMPLETE", "Document and part language metadata must cover both content and UI locales.", `surfaces.${surface.surfaceId}.languageMetadata.${uiLocale}`));
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
            diagnostics.push(diagnostic("ULC_REQUIRED_MESSAGE_FALLBACK", "A required UI message resolved only through a declared fallback.", `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
          } else if (resolved.resolution === "missing") {
            diagnostics.push(diagnostic("ULC_MESSAGE_MISSING", "A required UI message is missing from the exact locale and its declared chain.", `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
          }
          if (resolved.entry && placeholderStatus === "mismatch") {
            diagnostics.push(diagnostic("ULC_PLACEHOLDER_MISMATCH", "A localized UI message does not preserve the declared placeholder set.", `evaluations.${surface.surfaceId}.${mode}.${uiLocale}.${requirement.requirementId}`));
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

        // <lang><zh-CN>Evaluation status 同时收紧 message、channel 与语言元数据，任一不完整都不能放行。</zh-CN><en>Evaluation status jointly gates messages, channels, and language metadata; any incomplete dimension blocks completion.</en></lang>
        const summary = summarizeResults(results);
        const declaredChannelsCovered = modeDefinition.channels.every((channel) => modeRequirements.some((requirement) => requirement.channel === channel));
        const requiredBaseChannels = declaredChannels.has("visible-text") && declaredChannels.has("accessible-name");
        const status = languageMetadataComplete && declaredChannelsCovered && requiredBaseChannels && results.length > 0 && results.every(({ status: resultStatus }) => resultStatus === "covered")
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
  const report: DocumentationUiLocaleCompletenessReport = {
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
 * 验证公开 completeness report 的 closed-world shape、privacy、compatibility、引用与计数 parity。
 *
 * @lang en
 * Validates the closed-world shape, privacy, compatibility, reference parity, and count parity of a public completeness report.
 *
 * @param value <lang><zh-CN>候选 report。</zh-CN><en>Candidate report.</en></lang>
 * @returns public-safe diagnostics；空数组表示有效。 / Public-safe diagnostics; an empty array means valid.
 */
export function validateDocumentationUiLocaleCompletenessReport(value: unknown): HiaDiagnostic[] {
  if (!isRecord(value)) return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale completeness report must be an object.")];
  if (value.contract !== DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT || value.contractVersion !== DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION) {
    return [diagnostic("ULC_COMPATIBILITY_UNSUPPORTED", "UI-locale completeness contract and version must match exactly.")];
  }
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
  if (report.surfaces.some((surface) => {
    const modeIdentities = new Set(surface.modes.map(({ mode }) => mode));
    const metadataIdentities = new Set(surface.languageMetadata.map(({ uiLocale }) => localeKey(uiLocale)));
    return !includesLocale(report.localeScope.contentLocales, surface.contentLocale)
      || modeIdentities.size !== DOCUMENTATION_UI_LOCALE_MODES.length
      || DOCUMENTATION_UI_LOCALE_MODES.some((mode) => !modeIdentities.has(mode))
      || metadataIdentities.size !== report.localeScope.uiLocales.length
      || report.localeScope.uiLocales.some((locale) => !metadataIdentities.has(localeKey(locale)));
  })) {
    return [diagnostic("ULC_INVALID_CONTRACT", "Surface mode and language-metadata declarations must cover the frozen locale matrix exactly.")];
  }

  // <lang><zh-CN>期望组合数与组合 identity set 一起防止漏项和重复项互相抵消。</zh-CN><en>The expected combination count and identity set jointly prevent omissions and duplicates from cancelling each other.</en></lang>
  const expectedEvaluationCount = report.surfaces.length * DOCUMENTATION_UI_LOCALE_MODES.length * report.localeScope.uiLocales.length;
  if (report.evaluations.length !== expectedEvaluationCount) {
    return [diagnostic("ULC_INVALID_CONTRACT", "UI-locale evaluations must cover every surface, required mode, and UI locale.")];
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
      || evaluation.contentLocale !== surface.contentLocale || !metadata || metadata.documentLanguage !== evaluation.documentLanguage
      || !equalStrings(metadata.partLanguages, evaluation.partLanguages) || evaluationKeysSeen.has(evaluationIdentity)) {
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
      return result.status !== expectedResultStatus || !localePresenceValid || !placeholderPresenceValid;
    })) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation resolution, placeholder, locale, and coverage states must remain consistent.")];
    }
    const expectedSummary = summarizeResults(evaluation.results);
    if (!equalSummary(evaluation.summary, expectedSummary)) {
      return [diagnostic("ULC_INVALID_CONTRACT", "Evaluation summary does not match its requirement results.")];
    }
    const declaredChannelsCovered = modeDefinition.channels.every((channel) => expectedRequirements.some((requirement) => requirement.channel === channel));
    const requiredBaseChannels = modeDefinition.channels.includes("visible-text") && modeDefinition.channels.includes("accessible-name");
    const expectedStatus = evaluation.results.length > 0 && evaluation.results.every(({ status }) => status === "covered")
      && declaredChannelsCovered && requiredBaseChannels
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
  // <lang><zh-CN>沿 UI-locale chain 做 DFS；bundle-only 终点不会继续展开，UI-locale 之间禁止环。</zh-CN><en>Run DFS through UI-locale chains; bundle-only leaves stop, while cycles among UI locales are rejected.</en></lang>
  for (const start of chainByLocale.keys()) {
    // <lang><zh-CN>当前 traversal set 与 cursor 只存 locale identity，不读取 bundle text。</zh-CN><en>The current traversal set and cursor contain locale identity only and never read bundle text.</en></lang>
    const visiting = new Set<string>();
    let current: string | undefined = start;
    while (current && chainByLocale.has(current)) {
      if (visiting.has(current)) return diagnostic("ULC_FALLBACK_UNDECLARED", "Fallback chains must not contain cycles.");
      visiting.add(current);
      const next: string | undefined = chainByLocale.get(current)?.map(localeKey).find((candidate) => chainByLocale.has(candidate));
      current = next;
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

/** @lang zh-CN 判断 report 的完整结构 shape。 @lang en Checks the complete structural shape of a report. */
function isReportShape(value: Record<string, unknown>): boolean {
  return (value.status === "complete" || value.status === "incomplete")
    && isStableIdentity(value.profileId)
    && isLocaleScope(value.localeScope)
    && isFallbackPolicy(value.fallbackPolicy)
    && Array.isArray(value.messages) && value.messages.length > 0 && value.messages.length <= 10000 && value.messages.every((item) => isMessageDefinition(item))
    && Array.isArray(value.bundles) && value.bundles.length > 0 && value.bundles.length <= 1000 && value.bundles.every((item) => isBundleInventory(item))
    && Array.isArray(value.surfaces) && value.surfaces.length > 0 && value.surfaces.length <= 1000 && value.surfaces.every((item) => isReportSurface(item))
    && Array.isArray(value.requirements) && value.requirements.length > 0 && value.requirements.length <= 50000 && value.requirements.every((item) => isRequirement(item))
    && Array.isArray(value.evaluations) && value.evaluations.length > 0 && value.evaluations.length <= 100000 && value.evaluations.every((item) => isEvaluation(item))
    && isRecord(value.privacy) && hasExactKeys(value.privacy, privacyKeys)
    && isRecord(value.compatibility) && hasExactKeys(value.compatibility, compatibilityKeys)
    && Array.isArray(value.diagnostics) && value.diagnostics.every((item) => isDiagnostic(item));
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

/** @lang zh-CN 判断单个 evaluation 与其 result/summary shape。 @lang en Checks one evaluation and its result/summary shapes. */
function isEvaluation(value: unknown): value is DocumentationUiLocaleEvaluation {
  return isRecord(value) && hasExactKeys(value, evaluationKeys) && isStableIdentity(value.surfaceId) && isMode(value.mode)
    && isLocale(value.contentLocale) && isLocale(value.uiLocale) && isLocale(value.documentLanguage) && isLocaleArray(value.partLanguages, false)
    && (value.status === "complete" || value.status === "incomplete") && isEvaluationSummary(value.summary)
    && Array.isArray(value.results) && value.results.every((item) => isRequirementResult(item));
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

/** @lang zh-CN 判断 public-safe diagnostic shape 与 code 闭集。 @lang en Checks the public-safe diagnostic shape and closed code set. */
function isDiagnostic(value: unknown): value is HiaDiagnostic {
  return isRecord(value) && hasExactKeys(value, diagnosticKeys)
    && DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES.includes(value.code as DocumentationUiLocaleCompletenessDiagnosticCode)
    && typeof value.message === "string" && value.message.length > 0 && value.message.length <= 512 && value.severity === "error"
    && (value.path === undefined || (typeof value.path === "string" && value.path.length > 0 && value.path.length <= 512));
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
