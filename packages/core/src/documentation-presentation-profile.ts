import { createHiaDiagnostic } from "./diagnostics.js";
import { isJsonDataGraph } from "./json-data.js";
import type { HiaDiagnostic } from "./model.js";

/**
 * @lang zh-CN
 * 跨 renderer 呈现 profile 的中性 contract 名称；名称不绑定 HIA owner、模板或语言 AST。
 *
 * @lang en
 * Neutral cross-renderer presentation profile contract name; it binds no HIA owner, template, or language AST.
 */
export const DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT = "documentation-presentation-profile" as const;

/**
 * @lang zh-CN
 * P1 草案版本。draft consumer 必须精确匹配，不能推测向前或向后兼容。
 *
 * @lang en
 * P1 draft version. Draft consumers must match it exactly and cannot infer forward or backward compatibility.
 */
export const DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN
 * 公开 schema identity；分发包通过此稳定 URL 与 owner schema 对齐。
 *
 * @lang en
 * Public schema identity used by the distribution package to align with the owner schema.
 */
export const DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-presentation-profile-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN 页面分区模式；multi-page是显式必填的规范默认值，single-page是兼容投影。此元组类型只读，运行时未冻结；消费方不得修改共享词汇。
 * @lang en Page modes: multi-page is the explicitly required normative default and single-page is a compatibility projection. The tuple is type-readonly but not runtime-frozen; consumers must not mutate the shared vocabulary.
 */
export const DOCUMENTATION_PRESENTATION_PAGE_MODES = ["multi-page", "single-page"] as const;
/** @lang zh-CN 源码阅读模式；`none` 是显式隐私态。 @lang en Source reading modes; `none` is an explicit privacy state. */
export const DOCUMENTATION_PRESENTATION_SOURCE_MODES = ["fetch", "embed", "link", "none"] as const;
/** @lang zh-CN 主题色彩 scheme，与 skin identity 相互独立。 @lang en Theme color schemes, independent from skin identity. */
export const DOCUMENTATION_PRESENTATION_SCHEMES = ["dark", "light", "system"] as const;
/** @lang zh-CN SRI P1 允许的摘要算法。 @lang en Digest algorithms permitted by the P1 SRI policy. */
export const DOCUMENTATION_PRESENTATION_DIGEST_ALGORITHMS = ["sha256", "sha384", "sha512"] as const;

/**
 * @lang zh-CN
 * Source reader 状态闭集；终态必须通过 `reset` 返回 idle 后才能重新读取。
 *
 * @lang en
 * Closed source-reader state set; a terminal state must reset to idle before another load.
 */
export const DOCUMENTATION_SOURCE_READER_STATES = [
  "idle",
  "loading",
  "ready",
  "empty",
  "denied",
  "not-found",
  "integrity-error",
  "network-error",
  "aborted"
] as const;

/** @lang zh-CN Source reader 输入事件闭集。 @lang en Closed source-reader input event set. */
export const DOCUMENTATION_SOURCE_READER_EVENTS = [
  "load-requested",
  "content-ready",
  "content-empty",
  "access-denied",
  "asset-not-found",
  "integrity-failed",
  "network-failed",
  "load-aborted",
  "reset"
] as const;

/**
 * @lang zh-CN
 * 稳定 diagnostic code 集；网络、完整性、隐私与 identity 失败保持可区分。
 *
 * @lang en
 * Stable diagnostic codes that keep network, integrity, privacy, and identity failures distinguishable.
 */
export const DOCUMENTATION_PRESENTATION_DIAGNOSTIC_CODES = [
  "PRESENTATION_CONTRACT_UNSUPPORTED",
  "PRESENTATION_PROFILE_INVALID",
  "PRESENTATION_IDENTITY_DUPLICATE",
  "PRESENTATION_IDENTITY_DRIFT",
  "PRESENTATION_PARTITION_INVALID",
  "PRESENTATION_SOURCE_MODE_INVALID",
  "PRESENTATION_SOURCE_ASSET_INVALID",
  "PRESENTATION_SOURCE_FETCH_PLAN_REFUSED",
  "PRESENTATION_SOURCE_TRANSITION_INVALID",
  "PRESENTATION_THEME_CAPABILITY_INVALID",
  "PRESENTATION_PRIVACY_BOUNDARY",
  "PRESENTATION_COMPATIBILITY_UNSUPPORTED"
] as const;

/** @lang zh-CN 仅含中性multi-page/single-page词汇；不接受owner的split-site配置别名。 @lang en Contains only neutral multi-page/single-page vocabulary, not the owner's split-site configuration alias. */
export type DocumentationPresentationPageMode = typeof DOCUMENTATION_PRESENTATION_PAGE_MODES[number];
/** @lang zh-CN 源码阅读模式类型。 @lang en Source reading mode type. */
export type DocumentationPresentationSourceMode = typeof DOCUMENTATION_PRESENTATION_SOURCE_MODES[number];
/** @lang zh-CN 主题 scheme 类型。 @lang en Theme scheme type. */
export type DocumentationPresentationScheme = typeof DOCUMENTATION_PRESENTATION_SCHEMES[number];
/** @lang zh-CN Source reader 状态类型。 @lang en Source-reader state type. */
export type DocumentationSourceReaderState = typeof DOCUMENTATION_SOURCE_READER_STATES[number];
/** @lang zh-CN Source reader 事件类型。 @lang en Source-reader event type. */
export type DocumentationSourceReaderEvent = typeof DOCUMENTATION_SOURCE_READER_EVENTS[number];

/**
 * @lang zh-CN
 * 单个 topic 的稳定身份与 page projection。canonical reference 必须等于 `pageId#fragmentId`。
 *
 * @lang en
 * Stable topic identity plus page projection. The canonical reference must equal `pageId#fragmentId`.
 */
export interface DocumentationPresentationTopicProjection {
  /** @lang zh-CN 精确等于pageId#fragmentId的逻辑引用；不是可解析URL，不证明文件或锚点存在。 @lang en Logical reference exactly equal to pageId#fragmentId; not a resolved URL or proof that a file or anchor exists. */
  canonicalReference: string;
  /** @lang zh-CN profile内唯一的稳定片段身份；跨模式保留，不从pageId推导。 @lang en Stable fragment identity unique within the profile; retained across modes and not derived from pageId. */
  fragmentId: string;
  /** @lang zh-CN profile内唯一的稳定导航身份；与topic/fragment各有独立唯一性域。 @lang en Stable navigation identity unique within the profile, with a uniqueness domain separate from topic/fragment identities. */
  navigationId: string;
  /** @lang zh-CN 非负安全整数，topics按数值严格递增；可有空档，不参与当前身份比较。 @lang en Nonnegative safe integer; topics strictly increase numerically. Gaps are allowed; this field is not compared as identity. */
  order: number;
  /** @lang zh-CN 页面投影身份，可被多个topic共享；只有显式模式变化才豁免跨profile页面身份比较。 @lang en Projected page identity, shareable by multiple topics; only an explicit mode change exempts page identity from cross-profile comparison. */
  pageId: string;
  /** @lang zh-CN 0至256个唯一、ASCII身份字典序的稳定关系引用；不同topic可共享，不校验外部关系实体存在。 @lang en Zero to 256 unique, ASCII-identity-ordered stable relation references; topics may share them and external relation existence is not checked. */
  relationIds: string[];
  /** @lang zh-CN profile内唯一且精确区分大小写的连接键；合法身份为1至256个受限ASCII字符，不使用数组位置连接。 @lang en Unique, case-sensitive join key within the profile; valid identities use one to 256 restricted ASCII characters and never join by array position. */
  topicId: string;
  /** @lang zh-CN 合法逻辑类别身份；不要求属于pageTopicKinds，不参与当前身份比较。 @lang en Valid logical kind identity; membership in pageTopicKinds is not required and it is not compared as identity. */
  topicKind: string;
}

/** @lang zh-CN 确定性分区声明与投影；接口可变，类型不编码全部跨字段条件，须校验完整profile。 @lang en Deterministic partition declarations and projections; the mutable interface does not encode every cross-field condition, so validate the complete profile. */
export interface DocumentationPresentationPagePartition {
  /** @lang zh-CN 必填且固定multi-page；校验器不自动填充缺省值。 @lang en Required and fixed to multi-page; validation does not insert omitted defaults. */
  defaultMode: "multi-page";
  /** @lang zh-CN owner声明叶节点用fragment或page投影；core不由此推导父子关系或实际路由。 @lang en Owner declaration of fragment/page leaf projection; core infers neither parentage nor actual routes from it. */
  leafTopicPolicy: "fragment" | "page";
  /** @lang zh-CN 本profile实际模式；与defaultMode独立，是比较器页面投影豁免的开关。 @lang en Actual mode independent of defaultMode; controls the comparator's page-projection exemption. */
  mode: DocumentationPresentationPageMode;
  /** @lang zh-CN 0至256个唯一且ASCII身份字典序的页面类别声明；允许空，不强制覆盖topicKind集合。 @lang en Zero to 256 unique ASCII-identity-ordered page-kind declarations; may be empty and need not cover topicKind values. */
  pageTopicKinds: string[];
  /** @lang zh-CN single-page时必填且必须等于每个topic.pageId；multi-page必须省略，结构类型本身不强制此条件。 @lang en Required in single-page and equal to every topic.pageId; omitted in multi-page. The structural type itself does not enforce this condition. */
  singlePageId?: string;
  /** @lang zh-CN 1至10000个投影，order数值严格递增，topic/fragment/navigation各自唯一；不要求pageId唯一。 @lang en One to 10,000 projections with strictly increasing numeric order and independently unique topic/fragment/navigation ids; pageId need not be unique. */
  topics: DocumentationPresentationTopicProjection[];
}

/**
 * @lang zh-CN
 * 跨呈现变体的 identity 规则；pageId 只允许受 partition mode 影响。
 *
 * @lang en
 * Identity rules across presentation variants; only partition mode may affect pageId.
 */
export interface DocumentationPresentationIdentityPolicy {
  /** @lang zh-CN 固定partition-mode-only；同模式比较pageId/canonicalReference，不同模式仅豁免这两个字段。 @lang en Fixed partition-mode-only policy; same-mode comparisons include pageId/canonicalReference and different modes exempt only those fields. */
  pageIdProjection: "partition-mode-only";
  /** @lang zh-CN 固定false，色彩scheme不得改变稳定身份；并非宿主行为证明。 @lang en Fixed false: color scheme must not alter stable identity; this is not proof of host behavior. */
  schemeAffectsIdentity: false;
  /** @lang zh-CN 固定false，皮肤不得改变稳定身份。 @lang en Fixed false: skin must not alter stable identity. */
  skinAffectsIdentity: false;
  /** @lang zh-CN 固定false，源码阅读模式不得改变稳定身份。 @lang en Fixed false: source reading mode must not alter stable identity. */
  sourceModeAffectsIdentity: false;
  /** @lang zh-CN 精确固定顺序的四字段元组；不包含order/topicKind/profileId或分区policy声明。 @lang en Exact ordered tuple of four stable fields; excludes order/topicKind/profileId and partition policy declarations. */
  stableFields: ["topicId", "fragmentId", "navigationId", "relationIds"];
}

/** @lang zh-CN Revision-bound public source asset 摘要。 @lang en Digest for a revision-bound public source asset. */
export interface DocumentationPresentationDigest {
  algorithm: typeof DOCUMENTATION_PRESENTATION_DIGEST_ALGORITHMS[number];
  value: string;
}

/**
 * @lang zh-CN
 * 不含正文的 source asset manifest entry。`relativeUrl` 不能包含 origin、凭据或目录逃逸。
 *
 * @lang en
 * Body-free source asset manifest entry. `relativeUrl` cannot contain an origin, credentials, or path traversal.
 */
export interface DocumentationPresentationSourceAsset {
  assetId: string;
  byteLength?: number;
  classification: "public";
  digest: DocumentationPresentationDigest;
  lineCount?: number;
  mediaType: string;
  relativeUrl?: string;
  revision: string;
  sourceId: string;
  sourceMapId?: string;
}

/** @lang zh-CN Source reader 的宿主执行限额。 @lang en Host execution limits for a source reader. */
export interface DocumentationPresentationSourceLimits {
  maxBytes: number;
  maxLines: number;
  timeoutMs: number;
}

/**
 * @lang zh-CN
 * 固定的安全 fetch policy；它只描述请求，不授予网络能力。
 *
 * @lang en
 * Fixed safe fetch policy that describes a request without granting network authority.
 */
export interface DocumentationPresentationSourceReaderPolicy {
  bodyExecution: false;
  cache: "default";
  credentials: "omit";
  endpointPolicy: "same-origin-relative";
  limits: DocumentationPresentationSourceLimits;
  redirect: "error";
  requestMode: "same-origin";
}

/** @lang zh-CN Profile 的 source mode、manifest 与 reader policy。 @lang en Profile source mode, manifest, and reader policy. */
export interface DocumentationPresentationSourceProfile {
  assets: DocumentationPresentationSourceAsset[];
  defaultMode: "fetch";
  fallbackPolicy: "none";
  mode: DocumentationPresentationSourceMode;
  readerPolicy: DocumentationPresentationSourceReaderPolicy;
}

/** @lang zh-CN 一个 renderer-neutral skin capability entry。 @lang en One renderer-neutral skin capability entry. */
export interface DocumentationPresentationSkin {
  capabilities: string[];
  skinId: string;
  supportedSchemes: DocumentationPresentationScheme[];
  tokenContract: string;
}

/** @lang zh-CN 选中主题与至少三套 skin 的 capability catalog。 @lang en Selected theme and a capability catalog of at least three skins. */
export interface DocumentationPresentationThemeProfile {
  requiredCapabilities: string[];
  scheme: DocumentationPresentationScheme;
  skinId: string;
  skins: DocumentationPresentationSkin[];
}

/**
 * @lang zh-CN
 * 可序列化 privacy 事实；正文可以由后续 host 显式呈现，但绝不进入本 contract 或 search index。
 *
 * @lang en
 * Serializable privacy facts. A later host may explicitly project a body, but it never enters this contract or its search index.
 */
export interface DocumentationPresentationPrivacy {
  absolutePathsIncluded: false;
  cookiesRequired: false;
  credentialsIncluded: false;
  privateSidecarsIncluded: false;
  sourceBodyInContract: false;
  sourceBodyInSearchIndex: false;
  sourceExposure: "none" | "public-explicit";
  telemetryEnabled: false;
}

/** @lang zh-CN Draft compatibility 采用 exact/closed-world 策略。 @lang en Draft compatibility uses an exact, closed-world policy. */
export interface DocumentationPresentationCompatibility {
  identityChange: "new-contract-version";
  semanticChange: "new-contract-version";
  unknownProperties: "reject";
  versionMatch: "exact";
}

/**
 * @lang zh-CN
 * Neutral presentation wire profile；拒绝态仍保持安全 shape 与可审计 diagnostics。
 *
 * @lang en
 * Neutral presentation wire profile; a refused profile retains a safe shape and auditable diagnostics.
 */
export interface DocumentationPresentationProfile {
  compatibility: DocumentationPresentationCompatibility;
  contract: typeof DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT;
  contractVersion: typeof DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION;
  diagnostics: HiaDiagnostic[];
  identityPolicy: DocumentationPresentationIdentityPolicy;
  pagePartition: DocumentationPresentationPagePartition;
  privacy: DocumentationPresentationPrivacy;
  profileId: string;
  source: DocumentationPresentationSourceProfile;
  status: "ready" | "refused";
  theme: DocumentationPresentationThemeProfile;
}

/** @lang zh-CN 纯数据 fetch 请求计划；没有响应 body 或可执行 callback。 @lang en Data-only fetch request plan with no response body or executable callback. */
export interface DocumentationSourceFetchPlan {
  readonly assetId: string;
  readonly bodyPolicy: Readonly<{ execute: false; includeInSearchIndex: false }>;
  readonly integrity: string;
  readonly limits: Readonly<DocumentationPresentationSourceLimits>;
  readonly mediaType: string;
  readonly relativeUrl: string;
  readonly request: Readonly<{ cache: "default"; credentials: "omit"; mode: "same-origin"; redirect: "error" }>;
  readonly revision: string;
  readonly sourceId: string;
}

/** @lang zh-CN Fetch plan builder 的成功或拒绝结果。 @lang en Ready or refused result from the fetch-plan builder. */
export interface DocumentationSourceFetchPlanResult {
  diagnostics: HiaDiagnostic[];
  plan?: DocumentationSourceFetchPlan;
  status: "ready" | "refused";
}

/** @lang zh-CN Source reader 状态迁移结果。 @lang en Source-reader state-transition result. */
export interface DocumentationSourceReaderTransitionResult {
  diagnostics: HiaDiagnostic[];
  state: DocumentationSourceReaderState;
}

/**
 * @lang zh-CN
 * Draft 2020-12 wire schema。runtime validator 另外执行排序、摘要长度、同源相对 URL 与跨字段 privacy/identity 不变量。
 *
 * @lang en
 * Draft 2020-12 wire schema. The runtime validator additionally enforces ordering, digest lengths, same-origin relative URLs,
 * and cross-field privacy and identity invariants.
 */
export const DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID,
  title: "Documentation Presentation Profile",
  type: "object",
  additionalProperties: false,
  required: [
    "contract", "contractVersion", "status", "profileId", "pagePartition", "identityPolicy", "source", "theme",
    "privacy", "compatibility", "diagnostics"
  ],
  properties: {
    contract: { const: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT },
    contractVersion: { const: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION },
    status: { enum: ["ready", "refused"] },
    profileId: { $ref: "#/$defs/identity" },
    pagePartition: { $ref: "#/$defs/pagePartition" },
    identityPolicy: { $ref: "#/$defs/identityPolicy" },
    source: { $ref: "#/$defs/source" },
    theme: { $ref: "#/$defs/theme" },
    privacy: { $ref: "#/$defs/privacy" },
    compatibility: { $ref: "#/$defs/compatibility" },
    diagnostics: { type: "array", maxItems: 128, items: { $ref: "#/$defs/diagnostic" } }
  },
  $defs: {
    identity: { type: "string", minLength: 1, maxLength: 256, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    identityArray: {
      type: "array", maxItems: 256, uniqueItems: true, items: { $ref: "#/$defs/identity" }
    },
    topic: {
      type: "object", additionalProperties: false,
      required: ["topicId", "topicKind", "pageId", "fragmentId", "navigationId", "relationIds", "order", "canonicalReference"],
      properties: {
        topicId: { $ref: "#/$defs/identity" }, topicKind: { $ref: "#/$defs/identity" }, pageId: { $ref: "#/$defs/identity" },
        fragmentId: { $ref: "#/$defs/identity" }, navigationId: { $ref: "#/$defs/identity" },
        relationIds: { $ref: "#/$defs/identityArray" }, order: { type: "integer", minimum: 0 },
        canonicalReference: { type: "string", minLength: 3, maxLength: 520 }
      }
    },
    pagePartition: {
      type: "object", additionalProperties: false,
      required: ["defaultMode", "mode", "pageTopicKinds", "leafTopicPolicy", "topics"],
      properties: {
        defaultMode: { const: "multi-page" }, mode: { enum: DOCUMENTATION_PRESENTATION_PAGE_MODES },
        pageTopicKinds: { $ref: "#/$defs/identityArray" }, leafTopicPolicy: { enum: ["fragment", "page"] },
        singlePageId: { $ref: "#/$defs/identity" },
        topics: { type: "array", minItems: 1, maxItems: 10_000, items: { $ref: "#/$defs/topic" } }
      }
    },
    identityPolicy: {
      type: "object", additionalProperties: false,
      required: ["stableFields", "pageIdProjection", "sourceModeAffectsIdentity", "skinAffectsIdentity", "schemeAffectsIdentity"],
      properties: {
        stableFields: { const: ["topicId", "fragmentId", "navigationId", "relationIds"] },
        pageIdProjection: { const: "partition-mode-only" }, sourceModeAffectsIdentity: { const: false },
        skinAffectsIdentity: { const: false }, schemeAffectsIdentity: { const: false }
      }
    },
    digest: {
      type: "object", additionalProperties: false, required: ["algorithm", "value"],
      properties: {
        algorithm: { enum: DOCUMENTATION_PRESENTATION_DIGEST_ALGORITHMS },
        value: { type: "string", minLength: 43, maxLength: 88, pattern: "^[A-Za-z0-9+/]+={0,2}$" }
      }
    },
    asset: {
      type: "object", additionalProperties: false,
      required: ["assetId", "sourceId", "revision", "classification", "mediaType", "digest"],
      properties: {
        assetId: { $ref: "#/$defs/identity" }, sourceId: { $ref: "#/$defs/identity" }, sourceMapId: { $ref: "#/$defs/identity" },
        revision: { type: "string", minLength: 7, maxLength: 128 }, classification: { const: "public" },
        relativeUrl: { type: "string", minLength: 1, maxLength: 2048 }, mediaType: { type: "string", minLength: 1, maxLength: 128 },
        byteLength: { type: "integer", minimum: 0 }, lineCount: { type: "integer", minimum: 0 }, digest: { $ref: "#/$defs/digest" }
      }
    },
    limits: {
      type: "object", additionalProperties: false, required: ["maxBytes", "maxLines", "timeoutMs"],
      properties: {
        maxBytes: { type: "integer", minimum: 1, maximum: 16_777_216 },
        maxLines: { type: "integer", minimum: 1, maximum: 100_000 },
        timeoutMs: { type: "integer", minimum: 100, maximum: 60_000 }
      }
    },
    readerPolicy: {
      type: "object", additionalProperties: false,
      required: ["endpointPolicy", "credentials", "requestMode", "redirect", "cache", "bodyExecution", "limits"],
      properties: {
        endpointPolicy: { const: "same-origin-relative" }, credentials: { const: "omit" }, requestMode: { const: "same-origin" },
        redirect: { const: "error" }, cache: { const: "default" }, bodyExecution: { const: false }, limits: { $ref: "#/$defs/limits" }
      }
    },
    source: {
      type: "object", additionalProperties: false, required: ["defaultMode", "mode", "fallbackPolicy", "readerPolicy", "assets"],
      properties: {
        defaultMode: { const: "fetch" }, mode: { enum: DOCUMENTATION_PRESENTATION_SOURCE_MODES }, fallbackPolicy: { const: "none" },
        readerPolicy: { $ref: "#/$defs/readerPolicy" },
        assets: { type: "array", maxItems: 10_000, items: { $ref: "#/$defs/asset" } }
      }
    },
    skin: {
      type: "object", additionalProperties: false, required: ["skinId", "tokenContract", "supportedSchemes", "capabilities"],
      properties: {
        skinId: { $ref: "#/$defs/identity" }, tokenContract: { type: "string", minLength: 1, maxLength: 256 },
        supportedSchemes: { type: "array", minItems: 1, uniqueItems: true, items: { enum: DOCUMENTATION_PRESENTATION_SCHEMES } },
        capabilities: { $ref: "#/$defs/identityArray" }
      }
    },
    theme: {
      type: "object", additionalProperties: false, required: ["skinId", "scheme", "requiredCapabilities", "skins"],
      properties: {
        skinId: { $ref: "#/$defs/identity" }, scheme: { enum: DOCUMENTATION_PRESENTATION_SCHEMES },
        requiredCapabilities: { $ref: "#/$defs/identityArray" },
        skins: { type: "array", minItems: 3, maxItems: 64, items: { $ref: "#/$defs/skin" } }
      }
    },
    privacy: {
      type: "object", additionalProperties: false,
      required: ["sourceExposure", "sourceBodyInContract", "sourceBodyInSearchIndex", "absolutePathsIncluded", "credentialsIncluded",
        "cookiesRequired", "privateSidecarsIncluded", "telemetryEnabled"],
      properties: {
        sourceExposure: { enum: ["none", "public-explicit"] }, sourceBodyInContract: { const: false },
        sourceBodyInSearchIndex: { const: false }, absolutePathsIncluded: { const: false }, credentialsIncluded: { const: false },
        cookiesRequired: { const: false }, privateSidecarsIncluded: { const: false }, telemetryEnabled: { const: false }
      }
    },
    compatibility: {
      type: "object", additionalProperties: false,
      required: ["versionMatch", "unknownProperties", "identityChange", "semanticChange"],
      properties: {
        versionMatch: { const: "exact" }, unknownProperties: { const: "reject" },
        identityChange: { const: "new-contract-version" }, semanticChange: { const: "new-contract-version" }
      }
    },
    diagnostic: {
      type: "object", additionalProperties: false, required: ["code", "message", "severity"],
      properties: {
        code: { type: "string", minLength: 1 }, message: { type: "string", minLength: 1 },
        severity: { enum: ["info", "warning", "error"] }, path: { type: "string" }, targetPath: { type: "string" }, data: { type: "object" }
      }
    }
  }
} as const;

// <lang><zh-CN>以下 exact-key 表是 runtime closed-world validator 的集中事实源；可选字段仍由各子 validator 单独处理。</zh-CN><en>The exact-key tables below are the runtime closed-world validator's centralized source of truth; child validators still handle optional fields explicitly.</en></lang>
const profileKeys = [
  "compatibility", "contract", "contractVersion", "diagnostics", "identityPolicy", "pagePartition", "privacy", "profileId",
  "source", "status", "theme"
] as const;
const pagePartitionKeys = ["defaultMode", "leafTopicPolicy", "mode", "pageTopicKinds", "singlePageId", "topics"] as const;
const topicKeys = ["canonicalReference", "fragmentId", "navigationId", "order", "pageId", "relationIds", "topicId", "topicKind"] as const;
const identityPolicyKeys = ["pageIdProjection", "schemeAffectsIdentity", "skinAffectsIdentity", "sourceModeAffectsIdentity", "stableFields"] as const;
const sourceKeys = ["assets", "defaultMode", "fallbackPolicy", "mode", "readerPolicy"] as const;
const readerPolicyKeys = ["bodyExecution", "cache", "credentials", "endpointPolicy", "limits", "redirect", "requestMode"] as const;
const limitKeys = ["maxBytes", "maxLines", "timeoutMs"] as const;
const assetKeys = ["assetId", "byteLength", "classification", "digest", "lineCount", "mediaType", "relativeUrl", "revision", "sourceId", "sourceMapId"] as const;
const digestKeys = ["algorithm", "value"] as const;
const themeKeys = ["requiredCapabilities", "scheme", "skinId", "skins"] as const;
const skinKeys = ["capabilities", "skinId", "supportedSchemes", "tokenContract"] as const;
const privacyKeys = ["absolutePathsIncluded", "cookiesRequired", "credentialsIncluded", "privateSidecarsIncluded", "sourceBodyInContract", "sourceBodyInSearchIndex", "sourceExposure", "telemetryEnabled"] as const;
const compatibilityKeys = ["identityChange", "semanticChange", "unknownProperties", "versionMatch"] as const;
const diagnosticKeys = ["code", "data", "message", "path", "severity", "targetPath"] as const;
const identityPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const revisionPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{6,127}$/u;
const mediaTypePattern = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+\-/]{0,126}[A-Za-z0-9]$/u;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const privateFieldNames = new Set(["absolutePath", "ast", "cookie", "css", "html", "ownerTemplate", "password", "sourceBody", "sourcePath", "sourcesContent", "template"]);

/**
 * @lang zh-CN
 * 校验 neutral profile 的 closed-world shape、确定性排序以及跨字段 identity/source/theme/privacy 不变量。
 *
 * @lang en
 * Validates a neutral profile's closed-world shape, deterministic ordering, and cross-field identity/source/theme/privacy invariants.
 *
 * @param value - 待校验的未知 wire value。 / Unknown wire value to validate.
 * @returns 稳定 diagnostics；空数组表示有效。非JSON图、复制或反射失败使用固定拒绝。 / Stable diagnostics; empty means valid. Non-JSON graphs, cloning or reflection failures use a fixed refusal.
 * @remarks
 * @lang zh-CN 只验证普通JSON快照，不调用普通对象getter/toJSON。非枚举数据与Symbol键不属于wire；Proxy反射副作用、全局内建篡改和资源耗尽不受沙箱保护。
 * @lang en Validates an ordinary JSON snapshot without invoking ordinary-object getters/toJSON. Non-enumerable data and Symbol keys are outside the wire; proxy reflection side effects, tampered global intrinsics and resource exhaustion are not sandboxed.
 */
export function validateDocumentationPresentationProfile(value: unknown): HiaDiagnostic[] {
  return readPresentationProfile(value).diagnostics;
}

/**
 * @lang zh-CN 三个profile入口共用一次预检和独立快照，后续仅消费同一已验证副本；不执行I/O或改变原对象。
 * @lang en Shares one preflight and detached snapshot across the three profile entries; subsequent work consumes that validated copy only, with no I/O or caller mutation.
 * @param value - 未知内存输入。 / Unknown in-memory input.
 * @returns 带诊断的拒绝，或可由本次调用独占的有效快照。 / A diagnostic refusal or a valid snapshot owned by this invocation.
 */
function readPresentationProfile(value: unknown): { diagnostics: HiaDiagnostic[]; profile?: DocumentationPresentationProfile } {
  try {
    // <lang><zh-CN>先拒绝访问器、环及非JSON值，再复制；复制也可能因Proxy或过深对象失败，统一收敛。</zh-CN><en>Reject accessors, cycles and non-JSON values before cloning; cloning can also fail for proxies or excessive depth and is handled uniformly.</en></lang>
    if (isJsonDataGraph(value)) {
      const snapshot: unknown = structuredClone(value);
      // <lang><zh-CN>旧shape与跨字段语义仅在独立JSON副本上运行；失败不返回局部profile。</zh-CN><en>Existing shape and cross-field semantics run only on the detached JSON copy; refusals return no partial profile.</en></lang>
      const diagnostics = validatePreparedPresentationProfile(snapshot);
      return diagnostics.length > 0 ? { diagnostics } : { diagnostics, profile: snapshot as DocumentationPresentationProfile };
    }
  } catch {
    // <lang><zh-CN>不透传原异常、路径或正文；这不构成对任意Proxy副作用的隔离。</zh-CN><en>Do not forward original exceptions, paths or bodies; this does not isolate arbitrary proxy side effects.</en></lang>
  }
  return { diagnostics: [presentationDiagnostic("PRESENTATION_PROFILE_INVALID", "Presentation profile must be ordinary, acyclic JSON data that can be copied and validated.")] };
}

/** @lang zh-CN 在预检复制后的JSON快照上保留既有closed-world及跨字段规则。 @lang en Preserves existing closed-world and cross-field rules on a preflighted JSON snapshot. */
function validatePreparedPresentationProfile(value: unknown): HiaDiagnostic[] {
  if (containsPrivateField(value)) {
    return [presentationDiagnostic("PRESENTATION_PRIVACY_BOUNDARY", "Presentation profile contains a prohibited private field.")];
  }
  if (!isExactRecord(value, profileKeys) || !hasRequiredKeys(value, profileKeys)) {
    return [presentationDiagnostic("PRESENTATION_PROFILE_INVALID", "Presentation profile must be a complete closed-world object.")];
  }

  const diagnostics: HiaDiagnostic[] = [];
  if (value.contract !== DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT
    || value.contractVersion !== DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_CONTRACT_UNSUPPORTED", "Presentation contract and version must match exactly."));
  }
  if ((value.status !== "ready" && value.status !== "refused") || !isIdentity(value.profileId)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_PROFILE_INVALID", "Presentation status or profile identity is invalid."));
  }

  // <lang><zh-CN>各子对象先独立验证 shape，再执行跨字段规则，避免读取 malformed input 的私有成员。</zh-CN><en>Validate each child shape before cross-field rules so malformed input properties are never trusted.</en></lang>
  if (!isPagePartition(value.pagePartition)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_PARTITION_INVALID", "Page partition is invalid or nondeterministic.", "pagePartition"));
  }
  if (!isIdentityPolicy(value.identityPolicy)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_PROFILE_INVALID", "Identity policy must preserve the frozen stable fields.", "identityPolicy"));
  }
  if (!isSourceProfile(value.source)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_SOURCE_ASSET_INVALID", "Source profile or asset manifest is invalid.", "source"));
  }
  if (!isThemeProfile(value.theme)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_THEME_CAPABILITY_INVALID", "Theme catalog, selection, or capability set is invalid.", "theme"));
  }
  if (!isPrivacy(value.privacy)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_PRIVACY_BOUNDARY", "Presentation privacy facts must fail closed.", "privacy"));
  }
  if (!isCompatibility(value.compatibility)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_COMPATIBILITY_UNSUPPORTED", "Presentation compatibility policy is unsupported.", "compatibility"));
  }
  if (!Array.isArray(value.diagnostics) || value.diagnostics.length > 128 || !value.diagnostics.every(isSafeDiagnostic)) {
    diagnostics.push(presentationDiagnostic("PRESENTATION_PROFILE_INVALID", "Presentation diagnostics are invalid or unsafe.", "diagnostics"));
  }

  // <lang><zh-CN>即使排序或 order 已失效，只要 topic shape 安全，仍单独报告 identity duplicate，避免被宽泛 partition 错误遮蔽。</zh-CN><en>When topic shapes remain safe, report duplicate identity separately even if sorting or order is invalid, rather than hiding it behind a broad partition error.</en></lang>
  const shapedTopics = isRecord(value.pagePartition) && Array.isArray(value.pagePartition.topics)
    && value.pagePartition.topics.every(isTopicProjection)
    ? value.pagePartition.topics
    : undefined;
  if (shapedTopics) {
    const topicIds = shapedTopics.map(({ topicId }) => topicId);
    const fragmentIds = shapedTopics.map(({ fragmentId }) => fragmentId);
    const navigationIds = shapedTopics.map(({ navigationId }) => navigationId);
    if (hasDuplicates(topicIds) || hasDuplicates(fragmentIds) || hasDuplicates(navigationIds)) {
      diagnostics.push(presentationDiagnostic("PRESENTATION_IDENTITY_DUPLICATE", "Topic, fragment, and navigation identities must be unique.", "pagePartition.topics"));
    }
  }

  if (isSourceProfile(value.source) && isPrivacy(value.privacy)) {
    const expectedExposure = value.source.mode === "none" ? "none" : "public-explicit";
    if (value.privacy.sourceExposure !== expectedExposure || (value.source.mode === "none" && value.source.assets.length !== 0)) {
      diagnostics.push(presentationDiagnostic("PRESENTATION_PRIVACY_BOUNDARY", "Source mode and explicit source exposure are inconsistent.", "privacy.sourceExposure"));
    }
    if ((value.source.mode === "fetch" || value.source.mode === "link")
      && value.source.assets.some(({ relativeUrl }) => relativeUrl === undefined)) {
      diagnostics.push(presentationDiagnostic("PRESENTATION_SOURCE_ASSET_INVALID", "Fetch and link modes require a safe relative URL for every asset.", "source.assets"));
    }
  }

  return deduplicateDiagnostics(diagnostics);
}

/**
 * @lang zh-CN
 * 比较两个 profile 的稳定 topic/navigation/relation identity；不同 partition mode 只豁免 pageId/canonicalReference 投影。
 *
 * @lang en
 * Compares stable topic/navigation/relation identity across profiles; a different partition mode exempts only pageId/canonicalReference projection.
 *
 * @param reference - 身份基准 profile。 / Reference identity profile.
 * @param candidate - 待比较 profile。 / Candidate profile to compare.
 * @returns identity drift 或输入诊断。 / Identity drift or input diagnostics.
 */
export function compareDocumentationPresentationIdentity(reference: unknown, candidate: unknown): HiaDiagnostic[] {
  // <lang><zh-CN>两侧分别拥有独立验证副本，绝不在检查后重读调用方的原对象。</zh-CN><en>Each side owns a separately validated copy; never reread caller objects after checking them.</en></lang>
  const referenceResult = readPresentationProfile(reference);
  const candidateResult = readPresentationProfile(candidate);
  if (!referenceResult.profile || !candidateResult.profile) {
    return deduplicateDiagnostics([...referenceResult.diagnostics, ...candidateResult.diagnostics]);
  }

  // <lang><zh-CN>局部引用均来自本次快照；索引只按稳定topicId连接，不用数组位置推断身份。</zh-CN><en>Local references belong to this invocation's snapshots; join the index by stable topicId, never inferred array position.</en></lang>
  const referenceProfile = referenceResult.profile;
  const candidateProfile = candidateResult.profile;
  const candidateByTopicId = new Map(candidateProfile.pagePartition.topics.map((topic) => [topic.topicId, topic]));
  const samePartitionMode = referenceProfile.pagePartition.mode === candidateProfile.pagePartition.mode;

  // <lang><zh-CN>topicId 是 join key；数组位置只提供确定性输出顺序，不能成为 identity。</zh-CN><en>topicId is the join key; array position provides deterministic output order and never becomes identity.</en></lang>
  if (candidateByTopicId.size !== referenceProfile.pagePartition.topics.length) {
    return [presentationDiagnostic("PRESENTATION_IDENTITY_DRIFT", "Presentation variants contain different topic identity sets.", "pagePartition.topics")];
  }
  for (const referenceTopic of referenceProfile.pagePartition.topics) {
    const candidateTopic = candidateByTopicId.get(referenceTopic.topicId);
    if (!candidateTopic
      || referenceTopic.fragmentId !== candidateTopic.fragmentId
      || referenceTopic.navigationId !== candidateTopic.navigationId
      || !arraysEqual(referenceTopic.relationIds, candidateTopic.relationIds)
      || (samePartitionMode && (referenceTopic.pageId !== candidateTopic.pageId
        || referenceTopic.canonicalReference !== candidateTopic.canonicalReference))) {
      return [presentationDiagnostic("PRESENTATION_IDENTITY_DRIFT", "Presentation variant changed a stable identity or an unpermitted page projection.", `pagePartition.topics.${referenceTopic.topicId}`)];
    }
  }
  return [];
}

/**
 * @lang zh-CN
 * 从已验证 fetch profile 构造有界、同源、无凭据的纯数据 request plan；本函数不解析 origin、不调用网络。
 *
 * @lang en
 * Builds a bounded, same-origin, credential-free data-only request plan from a validated fetch profile; it resolves no origin and performs no network call.
 *
 * @param value - Presentation profile wire value。 / Presentation profile wire value.
 * @param assetId - 要读取的稳定 asset identity。 / Stable asset identity to read.
 * @returns ready plan 或 fail-closed refused result。 / A ready plan or fail-closed refused result.
 */
export function createDocumentationSourceFetchPlan(value: unknown, assetId: string): DocumentationSourceFetchPlanResult {
  // <lang><zh-CN>计划只能消费刚通过同一轮语义校验的副本；拒绝不泄漏局部计划。</zh-CN><en>The plan consumes only the copy admitted by this validation pass; refusal exposes no partial plan.</en></lang>
  const result = readPresentationProfile(value);
  if (!result.profile) return { diagnostics: result.diagnostics, status: "refused" };

  const profile = result.profile;
  if (profile.source.mode !== "fetch" || !isIdentity(assetId)) {
    return {
      diagnostics: [presentationDiagnostic("PRESENTATION_SOURCE_FETCH_PLAN_REFUSED", "Fetch planning requires an explicit fetch profile and valid asset identity.")],
      status: "refused"
    };
  }
  // <lang><zh-CN>精确匹配副本中的公开资产，不转换或规范化调用方assetId。</zh-CN><en>Match the public asset in the copy exactly, without coercing or normalizing the caller's assetId.</en></lang>
  const asset = profile.source.assets.find((candidate) => candidate.assetId === assetId);
  if (!asset?.relativeUrl) {
    return {
      diagnostics: [presentationDiagnostic("PRESENTATION_SOURCE_FETCH_PLAN_REFUSED", "Requested fetch asset is absent or has no safe relative URL.", `source.assets.${assetId}`)],
      status: "refused"
    };
  }

  // <lang><zh-CN>冻结每个嵌套 policy，防止调用者在验证后改变 request 或 limit 语义。</zh-CN><en>Freeze every nested policy so callers cannot alter request or limit semantics after validation.</en></lang>
  const plan: DocumentationSourceFetchPlan = Object.freeze({
    assetId: asset.assetId,
    sourceId: asset.sourceId,
    relativeUrl: asset.relativeUrl,
    revision: asset.revision,
    integrity: `${asset.digest.algorithm}-${asset.digest.value}`,
    mediaType: asset.mediaType,
    request: Object.freeze({ cache: "default", credentials: "omit", mode: "same-origin", redirect: "error" }),
    limits: Object.freeze(structuredClone(profile.source.readerPolicy.limits)),
    bodyPolicy: Object.freeze({ execute: false, includeInSearchIndex: false })
  });
  return { diagnostics: [], plan, status: "ready" };
}

/**
 * @lang zh-CN
 * 执行 deterministic source-reader 状态迁移。非法事件保持原状态并返回 diagnostic，不自动重试或降级。
 *
 * @lang en
 * Applies a deterministic source-reader transition. An invalid event preserves the state and returns a diagnostic without retry or fallback.
 *
 * @param state - 当前 reader 状态。 / Current reader state.
 * @param event - 单个明确事件。 / One explicit event.
 * @returns 新状态与迁移 diagnostics。 / Next state and transition diagnostics.
 * @remarks
 * @lang zh-CN 运行时非法参数不转换，使用固定诊断并原样回显state；绕过类型的回显值未验证、未脱敏且未必可序列化，调用方不得将其当成合法状态或公开数据。
 * @lang en Invalid runtime arguments are not coerced; a fixed diagnostic accompanies the unchanged state echo. An echo obtained by bypassing types is unvalidated, unsanitized and not necessarily serializable; callers must not treat it as a valid state or public data.
 */
export function transitionDocumentationSourceReader(
  state: DocumentationSourceReaderState,
  event: DocumentationSourceReaderEvent
): DocumentationSourceReaderTransitionResult {
  // <lang><zh-CN>只允许primitive闭集值；先检查再索引或插值，避免继承键与自定义转换。</zh-CN><en>Admit only primitive closed-set values before indexing or interpolation, avoiding inherited keys and custom coercion.</en></lang>
  if (typeof state !== "string" || typeof event !== "string"
    || !DOCUMENTATION_SOURCE_READER_STATES.includes(state) || !DOCUMENTATION_SOURCE_READER_EVENTS.includes(event)
    || !Object.hasOwn(sourceReaderTransitions, state)) {
    return { diagnostics: [presentationDiagnostic("PRESENTATION_SOURCE_TRANSITION_INVALID", "Source reader state and event must be declared primitive strings.")], state };
  }
  // <lang><zh-CN>行内只取自有迁移；合法但未声明的pair保持原有拒绝文案及状态。</zh-CN><en>Read own transitions only; declared but absent pairs retain the existing refusal message and state.</en></lang>
  const row = sourceReaderTransitions[state];
  const nextState = Object.hasOwn(row, event) ? row[event] : undefined;
  if (!nextState) {
    return {
      diagnostics: [presentationDiagnostic("PRESENTATION_SOURCE_TRANSITION_INVALID", `Source reader cannot apply ${event} while ${state}.`)],
      state
    };
  }
  return { diagnostics: [], state: nextState };
}

// <lang><zh-CN>显式 transition table 是状态机唯一事实源；缺失 pair 一律为非法迁移。</zh-CN><en>The explicit transition table is the state machine's sole source of truth; every absent pair is invalid.</en></lang>
const sourceReaderTransitions: Readonly<Record<DocumentationSourceReaderState, Partial<Record<DocumentationSourceReaderEvent, DocumentationSourceReaderState>>>> = {
  idle: { "load-requested": "loading" },
  loading: {
    "content-ready": "ready",
    "content-empty": "empty",
    "access-denied": "denied",
    "asset-not-found": "not-found",
    "integrity-failed": "integrity-error",
    "network-failed": "network-error",
    "load-aborted": "aborted"
  },
  ready: { reset: "idle" },
  empty: { reset: "idle" },
  denied: { reset: "idle" },
  "not-found": { reset: "idle" },
  "integrity-error": { reset: "idle" },
  "network-error": { reset: "idle" },
  aborted: { reset: "idle" }
};

/** @lang zh-CN 验证 page partition shape、排序和 single-page 投影。 @lang en Validates page-partition shape, ordering, and single-page projection. */
function isPagePartition(value: unknown): value is DocumentationPresentationPagePartition {
  // <lang><zh-CN>先确认声明与每个投影形状，再读取数值顺序；不填默认值或推导路由。</zh-CN><en>Check declarations and each projection shape before reading numeric order; insert no defaults and infer no routes.</en></lang>
  if (!isExactRecord(value, pagePartitionKeys) || !hasRequiredKeys(value, ["defaultMode", "leafTopicPolicy", "mode", "pageTopicKinds", "topics"] as const)) return false;
  if (value.defaultMode !== "multi-page" || !DOCUMENTATION_PRESENTATION_PAGE_MODES.includes(value.mode as DocumentationPresentationPageMode)
    || (value.leafTopicPolicy !== "fragment" && value.leafTopicPolicy !== "page") || !isSortedIdentityArray(value.pageTopicKinds, 256)) return false;
  if (!Array.isArray(value.topics) || value.topics.length === 0 || value.topics.length > 10_000 || !value.topics.every(isTopicProjection)) return false;
  // <lang><zh-CN>已校验的非负安全整数按相邻数值严格递增；同时拒绝重复order，不用固定位宽字符串key。</zh-CN><en>Validated nonnegative safe integers must strictly increase between neighbors; this also rejects duplicate order without fixed-width string keys.</en></lang>
  const topics = value.topics as DocumentationPresentationTopicProjection[];
  if (topics.some((topic, index) => index > 0 && topics[index - 1]!.order >= topic.order)) return false;
  // <lang><zh-CN>single-page限定同一页面身份；multi-page不允许携带该单页声明，但可共享pageId。</zh-CN><en>Single-page requires one page identity; multi-page omits that declaration but may still share pageId values.</en></lang>
  if (value.mode === "single-page") {
    if (!isIdentity(value.singlePageId) || topics.some(({ pageId }) => pageId !== value.singlePageId)) return false;
  } else if (value.singlePageId !== undefined) return false;
  return true;
}

/** @lang zh-CN 验证单个 topic identity 与 canonical reference。 @lang en Validates one topic identity and canonical reference. */
function isTopicProjection(value: unknown): value is DocumentationPresentationTopicProjection {
  return isExactRecord(value, topicKeys) && hasRequiredKeys(value, topicKeys)
    && isIdentity(value.topicId) && isIdentity(value.topicKind) && isIdentity(value.pageId) && isIdentity(value.fragmentId)
    && isIdentity(value.navigationId) && Number.isSafeInteger(value.order) && (value.order as number) >= 0
    && isSortedIdentityArray(value.relationIds, 256)
    && value.canonicalReference === `${value.pageId}#${value.fragmentId}`;
}

/** @lang zh-CN 验证冻结的跨变体 identity policy。 @lang en Validates the frozen cross-variant identity policy. */
function isIdentityPolicy(value: unknown): value is DocumentationPresentationIdentityPolicy {
  return isExactRecord(value, identityPolicyKeys) && hasRequiredKeys(value, identityPolicyKeys)
    && Array.isArray(value.stableFields) && arraysEqual(value.stableFields, ["topicId", "fragmentId", "navigationId", "relationIds"])
    && value.pageIdProjection === "partition-mode-only" && value.sourceModeAffectsIdentity === false
    && value.skinAffectsIdentity === false && value.schemeAffectsIdentity === false;
}

/** @lang zh-CN 验证 source mode、reader policy 与确定性 asset manifest。 @lang en Validates source mode, reader policy, and deterministic asset manifest. */
function isSourceProfile(value: unknown): value is DocumentationPresentationSourceProfile {
  if (!isExactRecord(value, sourceKeys) || !hasRequiredKeys(value, sourceKeys)) return false;
  if (value.defaultMode !== "fetch" || value.fallbackPolicy !== "none"
    || !DOCUMENTATION_PRESENTATION_SOURCE_MODES.includes(value.mode as DocumentationPresentationSourceMode)
    || !isReaderPolicy(value.readerPolicy) || !Array.isArray(value.assets) || value.assets.length > 10_000
    || !value.assets.every(isSourceAsset)) return false;
  const assets = value.assets as DocumentationPresentationSourceAsset[];
  return isSortedBy(assets, ({ assetId }) => assetId) && !hasDuplicates(assets.map(({ assetId }) => assetId))
    && !hasDuplicates(assets.map(({ sourceId }) => sourceId));
}

/** @lang zh-CN 验证无凭据、同源且不执行正文的 reader policy。 @lang en Validates a credential-free, same-origin, non-executing reader policy. */
function isReaderPolicy(value: unknown): value is DocumentationPresentationSourceReaderPolicy {
  return isExactRecord(value, readerPolicyKeys) && hasRequiredKeys(value, readerPolicyKeys)
    && value.endpointPolicy === "same-origin-relative" && value.credentials === "omit" && value.requestMode === "same-origin"
    && value.redirect === "error" && value.cache === "default" && value.bodyExecution === false && isLimits(value.limits);
}

/** @lang zh-CN 验证 reader byte/line/time 上界。 @lang en Validates reader byte, line, and time bounds. */
function isLimits(value: unknown): value is DocumentationPresentationSourceLimits {
  return isExactRecord(value, limitKeys) && hasRequiredKeys(value, limitKeys)
    && isBoundedInteger(value.maxBytes, 1, 16_777_216) && isBoundedInteger(value.maxLines, 1, 100_000)
    && isBoundedInteger(value.timeoutMs, 100, 60_000);
}

/** @lang zh-CN 验证 public、revision/digest-bound、body-free asset metadata。 @lang en Validates public, revision/digest-bound, body-free asset metadata. */
function isSourceAsset(value: unknown): value is DocumentationPresentationSourceAsset {
  if (!isExactRecord(value, assetKeys)
    || !hasRequiredKeys(value, ["assetId", "classification", "digest", "mediaType", "revision", "sourceId"] as const)) return false;
  if (!isIdentity(value.assetId) || !isIdentity(value.sourceId) || (value.sourceMapId !== undefined && !isIdentity(value.sourceMapId))
    || value.classification !== "public" || typeof value.revision !== "string" || !revisionPattern.test(value.revision)
    || typeof value.mediaType !== "string" || !mediaTypePattern.test(value.mediaType) || !isDigest(value.digest)) return false;
  if (value.relativeUrl !== undefined && !isSafeRelativeUrl(value.relativeUrl)) return false;
  if (value.byteLength !== undefined && !isBoundedInteger(value.byteLength, 0, 16_777_216)) return false;
  return value.lineCount === undefined || isBoundedInteger(value.lineCount, 0, 100_000);
}

/** @lang zh-CN 验证 SRI 算法与 base64 解码字节长度。 @lang en Validates the SRI algorithm and decoded base64 byte length. */
function isDigest(value: unknown): value is DocumentationPresentationDigest {
  if (!isExactRecord(value, digestKeys) || !hasRequiredKeys(value, digestKeys)
    || !DOCUMENTATION_PRESENTATION_DIGEST_ALGORITHMS.includes(value.algorithm as DocumentationPresentationDigest["algorithm"])
    || typeof value.value !== "string" || !base64Pattern.test(value.value)) return false;
  const expectedBytes = { sha256: 32, sha384: 48, sha512: 64 }[value.algorithm as DocumentationPresentationDigest["algorithm"]];
  return decodedBase64Length(value.value) === expectedBytes;
}

/** @lang zh-CN 验证至少三套 skin、scheme 与 selected capability 覆盖。 @lang en Validates at least three skins, schemes, and selected capability coverage. */
function isThemeProfile(value: unknown): value is DocumentationPresentationThemeProfile {
  if (!isExactRecord(value, themeKeys) || !hasRequiredKeys(value, themeKeys) || !isIdentity(value.skinId)
    || !DOCUMENTATION_PRESENTATION_SCHEMES.includes(value.scheme as DocumentationPresentationScheme)
    || !isSortedIdentityArray(value.requiredCapabilities, 64) || !Array.isArray(value.skins) || value.skins.length < 3
    || value.skins.length > 64 || !value.skins.every(isSkin)) return false;
  const skins = value.skins as DocumentationPresentationSkin[];
  if (!isSortedBy(skins, ({ skinId }) => skinId) || hasDuplicates(skins.map(({ skinId }) => skinId))) return false;
  const selected = skins.find(({ skinId }) => skinId === value.skinId);
  return selected !== undefined && selected.supportedSchemes.includes(value.scheme as DocumentationPresentationScheme)
    && (value.requiredCapabilities as string[]).every((capability) => selected.capabilities.includes(capability));
}

/** @lang zh-CN 验证单个 renderer-neutral skin capability entry。 @lang en Validates one renderer-neutral skin capability entry. */
function isSkin(value: unknown): value is DocumentationPresentationSkin {
  return isExactRecord(value, skinKeys) && hasRequiredKeys(value, skinKeys) && isIdentity(value.skinId)
    && typeof value.tokenContract === "string" && value.tokenContract.length > 0 && value.tokenContract.length <= 256
    && !isAbsolutePathLike(value.tokenContract) && isSortedEnumArray(value.supportedSchemes, DOCUMENTATION_PRESENTATION_SCHEMES)
    && isSortedIdentityArray(value.capabilities, 64);
}

/** @lang zh-CN 验证 fail-closed privacy facts。 @lang en Validates fail-closed privacy facts. */
function isPrivacy(value: unknown): value is DocumentationPresentationPrivacy {
  return isExactRecord(value, privacyKeys) && hasRequiredKeys(value, privacyKeys)
    && (value.sourceExposure === "none" || value.sourceExposure === "public-explicit") && value.sourceBodyInContract === false
    && value.sourceBodyInSearchIndex === false && value.absolutePathsIncluded === false && value.credentialsIncluded === false
    && value.cookiesRequired === false && value.privateSidecarsIncluded === false && value.telemetryEnabled === false;
}

/** @lang zh-CN 验证 exact draft 与 closed-world compatibility policy。 @lang en Validates exact-draft and closed-world compatibility policy. */
function isCompatibility(value: unknown): value is DocumentationPresentationCompatibility {
  return isExactRecord(value, compatibilityKeys) && hasRequiredKeys(value, compatibilityKeys) && value.versionMatch === "exact"
    && value.unknownProperties === "reject" && value.identityChange === "new-contract-version" && value.semanticChange === "new-contract-version";
}

/** @lang zh-CN 验证可公开 diagnostic shape 与 locator privacy。 @lang en Validates a public-safe diagnostic shape and locator privacy. */
function isSafeDiagnostic(value: unknown): value is HiaDiagnostic {
  if (!isExactRecord(value, diagnosticKeys) || !hasRequiredKeys(value, ["code", "message", "severity"] as const)) return false;
  if (typeof value.code !== "string" || value.code.length === 0 || typeof value.message !== "string" || value.message.length === 0
    || !["info", "warning", "error"].includes(value.severity as string)) return false;
  for (const candidate of [value.path, value.targetPath]) {
    if (candidate !== undefined && (typeof candidate !== "string" || isAbsolutePathLike(candidate))) return false;
  }
  return value.data === undefined || isPublicDiagnosticData(value.data);
}

/** @lang zh-CN 递归验证 diagnostic data 不含私有字段或绝对路径。 @lang en Recursively validates diagnostic data for private fields and absolute paths. */
function isPublicDiagnosticData(value: unknown): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return !isAbsolutePathLike(value);
  if (Array.isArray(value)) return value.every(isPublicDiagnosticData);
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, child]) => !privateFieldNames.has(key) && isPublicDiagnosticData(child));
}

/** @lang zh-CN 验证无 origin、query、fragment、反斜杠或目录逃逸的相对 asset URL。 @lang en Validates a relative asset URL without origin, query, fragment, backslash, or path traversal. */
function isSafeRelativeUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 || /[\u0000-\u001F\u007F\\]/u.test(value)
    || value.includes("?") || value.includes("#") || value.startsWith("/") || value.startsWith("//")
    || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  const pathPart = decoded.split(/[?#]/u, 1)[0] ?? "";
  return !pathPart.startsWith("/") && !pathPart.split("/").some((segment) => segment === "..");
}

/** @lang zh-CN 计算 canonical base64 的解码字节数，不分配正文 buffer。 @lang en Computes decoded canonical base64 byte length without allocating a body buffer. */
function decodedBase64Length(value: string): number {
  if (value.length === 0 || value.length % 4 !== 0) return -1;
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

/** @lang zh-CN 验证公开稳定 identity。 @lang en Validates a public stable identity. */
function isIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256 && identityPattern.test(value);
}

/** @lang zh-CN 验证有界、唯一、code-point 排序的 identity 数组。 @lang en Validates a bounded, unique, code-point-sorted identity array. */
function isSortedIdentityArray(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(isIdentity) && !hasDuplicates(value)
    && arraysEqual(value, [...value].sort(compareText));
}

/** @lang zh-CN 验证非空、唯一、排序的 enum 数组。 @lang en Validates a non-empty, unique, sorted enum array. */
function isSortedEnumArray<const T extends readonly string[]>(value: unknown, allowed: T): value is T[number][] {
  return Array.isArray(value) && value.length > 0 && value.every((candidate) => allowed.includes(candidate as T[number]))
    && !hasDuplicates(value) && arraysEqual(value, [...value].sort(compareText));
}

/** @lang zh-CN 按稳定 selector 检查既有数组顺序，不修改输入。 @lang en Checks existing array order with a stable selector without mutating input. */
function isSortedBy<T>(value: T[], selector: (item: T) => string): boolean {
  return arraysEqual(value.map(selector), value.map(selector).sort(compareText));
}

/** @lang zh-CN 验证安全整数的闭区间。 @lang en Validates a safe integer within a closed interval. */
function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

/** @lang zh-CN 检测 primitive identity/value 重复。 @lang en Detects duplicate primitive identities or values. */
function hasDuplicates<T>(values: T[]): boolean {
  return new Set(values).size !== values.length;
}

/** @lang zh-CN 进行浅层、顺序敏感数组比较。 @lang en Performs a shallow, order-sensitive array comparison. */
function arraysEqual(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** @lang zh-CN 提供 locale-independent code-point 文本顺序。 @lang en Provides locale-independent code-point text ordering. */
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @lang zh-CN 识别非数组 object record。 @lang en Identifies a non-array object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @lang zh-CN 拒绝 allowlist 之外的 object key。 @lang en Rejects object keys outside an allowlist. */
function isExactRecord<const T extends readonly string[]>(value: unknown, keys: T): value is Record<T[number], unknown> {
  return isRecord(value) && Object.keys(value).every((key) => (keys as readonly string[]).includes(key));
}

/** @lang zh-CN 检查所有必需 own property。 @lang en Checks every required own property. */
function hasRequiredKeys<const T extends readonly string[]>(value: Record<string, unknown>, keys: T): boolean {
  return keys.every((key) => Object.hasOwn(value, key));
}

/** @lang zh-CN 深度检测显式禁止的私有字段名。 @lang en Deeply detects explicitly prohibited private field names. */
function containsPrivateField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsPrivateField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => privateFieldNames.has(key) || containsPrivateField(child));
}

/** @lang zh-CN 检测 Windows、POSIX 与 UNC 绝对路径。 @lang en Detects Windows, POSIX, and UNC absolute paths. */
function isAbsolutePathLike(value: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.startsWith("\\\\");
}

/** @lang zh-CN 按 code/path/message 确定性去重 diagnostic。 @lang en Deterministically deduplicates diagnostics by code, path, and message. */
function deduplicateDiagnostics(diagnostics: HiaDiagnostic[]): HiaDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.path ?? ""}:${diagnostic.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @lang zh-CN 构造 stable error diagnostic，可选逻辑 path 不能是 filesystem locator。 @lang en Builds a stable error diagnostic whose optional logical path is never a filesystem locator. */
function presentationDiagnostic(
  code: typeof DOCUMENTATION_PRESENTATION_DIAGNOSTIC_CODES[number],
  message: string,
  path?: string
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", path ? { path } : {});
}
