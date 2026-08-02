/**
 * 中性 Portal IA contract identity；它不包含 renderer、theme 或语言 parser 私有结构。
 * Neutral Portal IA contract identity; it contains no renderer, theme, or language-parser private structures.
 */
export const DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT = "documentation-portal-information-architecture";
/** exact draft compatibility identity。Exact draft compatibility identity. */
export const DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION = "0.1.0-draft";
/** 三维 IA 中的逻辑内容分组闭集。Closed logical content-grouping vocabulary. */
export const DOCUMENTATION_PORTAL_CONTENT_GROUPINGS = ["entry", "semantic-container"] as const;
/** 三维 IA 中的 fragment 获取闭集。Closed fragment-acquisition vocabulary. */
export const DOCUMENTATION_PORTAL_LOADING_STRATEGIES = ["lazy", "eager"] as const;
/** 三维 IA 中的 member 呈现闭集。Closed member-presentation vocabulary. */
export const DOCUMENTATION_PORTAL_MEMBER_PLACEMENTS = ["separate", "with-parent"] as const;
/** manifest-only semantic path 的 target-neutral kind 闭集。Target-neutral kind vocabulary for manifest-only semantic paths. */
export const DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS = [
  "repository",
  "package",
  "layer",
  "contract",
  "operation",
  "project",
  "assembly",
  "namespace",
  "type"
] as const;
/** kind-aware topic 的稳定 section 顺序。Stable section order for kind-aware topics. */
export const DOCUMENTATION_PORTAL_TOPIC_SECTIONS = [
  "summary",
  "declaration",
  "metadata",
  "contract",
  "coverage",
  "provenance",
  "members",
  "relations",
  "source",
  "diagnostics"
] as const;
/** 首轮 touched-label catalog 的 locale 闭集。Locale vocabulary for the first touched-label catalog. */
export const DOCUMENTATION_PORTAL_UI_LOCALES = ["zh-CN", "en"] as const;

export type DocumentationPortalContentGrouping = typeof DOCUMENTATION_PORTAL_CONTENT_GROUPINGS[number];
export type DocumentationPortalLoadingStrategy = typeof DOCUMENTATION_PORTAL_LOADING_STRATEGIES[number];
export type DocumentationPortalMemberPlacement = typeof DOCUMENTATION_PORTAL_MEMBER_PLACEMENTS[number];
export type DocumentationPortalSemanticPathKind = typeof DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS[number];
export type DocumentationPortalTopicSection = typeof DOCUMENTATION_PORTAL_TOPIC_SECTIONS[number];
export type DocumentationPortalUiLocale = typeof DOCUMENTATION_PORTAL_UI_LOCALES[number];

/** renderer 接受的显式 IA 配置；缺失整个对象时必须保留 P3。Explicit IA input; omitting the whole object must preserve P3. */
export interface DocumentationPortalInformationArchitectureOptions {
  contract?: typeof DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT;
  contractVersion?: typeof DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION;
  contentGrouping?: DocumentationPortalContentGrouping;
  loadingStrategy?: DocumentationPortalLoadingStrategy;
  memberPlacement?: DocumentationPortalMemberPlacement;
}

/** manifest owner 审阅并显式投影的公开 semantic segment。Public semantic segment explicitly reviewed and projected by the manifest owner. */
export interface DocumentationPortalSemanticPathSegment {
  kind: DocumentationPortalSemanticPathKind;
  id: string;
  label: string;
}

/**
 * project-index 中的 resolved IA contract；它同时固定 route、locale、accessibility 与 privacy 边界。
 * Resolved IA contract in project-index; it also freezes routing, locale, accessibility, and privacy boundaries.
 */
export interface DocumentationPortalInformationArchitectureContract {
  contract: typeof DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT;
  contractVersion: typeof DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION;
  contentGrouping: DocumentationPortalContentGrouping;
  loadingStrategy: DocumentationPortalLoadingStrategy;
  memberPlacement: DocumentationPortalMemberPlacement;
  semanticPathPolicy: "manifest-only";
  semanticPathKinds: DocumentationPortalSemanticPathKind[];
  topicSections: DocumentationPortalTopicSection[];
  localeModel: {
    uiLocale: DocumentationPortalUiLocale;
    contentLocale: string;
    sourceCommentLocale: "not-projected";
  };
  routing: {
    canonicalEntryRouteStable: true;
    presentationPathAdditive: true;
    versionRouting: false;
  };
  accessibility: {
    disclosureMode: "native-details";
    interactions: ["tab", "enter-space", "visible-focus", "active-ancestor"];
    fullAriaTree: false;
  };
  privacy: {
    semanticPathSource: "manifest-input";
    continuityMode: "metadata-only";
    sourceBodyIncluded: false;
    targetStateRead: false;
  };
}

/**
 * owner-local Draft 2020-12 schema；用于验证 resolved contract，不承诺未知 draft 兼容。
 * Owner-local Draft 2020-12 schema for resolved contracts; it does not promise compatibility with unknown drafts.
 */
export const DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://mandolin.github.io/HIA-Documentation/contracts/documentation-portal-information-architecture-0.1.0-draft.schema.json",
  title: "Generated Documentation Portal Information Architecture",
  type: "object",
  additionalProperties: false,
  required: [
    "contract",
    "contractVersion",
    "contentGrouping",
    "loadingStrategy",
    "memberPlacement",
    "semanticPathPolicy",
    "semanticPathKinds",
    "topicSections",
    "localeModel",
    "routing",
    "accessibility",
    "privacy"
  ],
  properties: {
    contract: { const: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT },
    contractVersion: { const: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION },
    contentGrouping: { enum: [...DOCUMENTATION_PORTAL_CONTENT_GROUPINGS] },
    loadingStrategy: { enum: [...DOCUMENTATION_PORTAL_LOADING_STRATEGIES] },
    memberPlacement: { enum: [...DOCUMENTATION_PORTAL_MEMBER_PLACEMENTS] },
    semanticPathPolicy: { const: "manifest-only" },
    semanticPathKinds: { const: [...DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS] },
    topicSections: { const: [...DOCUMENTATION_PORTAL_TOPIC_SECTIONS] },
    localeModel: {
      type: "object",
      additionalProperties: false,
      required: ["uiLocale", "contentLocale", "sourceCommentLocale"],
      properties: {
        uiLocale: { enum: [...DOCUMENTATION_PORTAL_UI_LOCALES] },
        contentLocale: { type: "string", minLength: 1 },
        sourceCommentLocale: { const: "not-projected" }
      }
    },
    routing: {
      type: "object",
      additionalProperties: false,
      required: ["canonicalEntryRouteStable", "presentationPathAdditive", "versionRouting"],
      properties: {
        canonicalEntryRouteStable: { const: true },
        presentationPathAdditive: { const: true },
        versionRouting: { const: false }
      }
    },
    accessibility: {
      type: "object",
      additionalProperties: false,
      required: ["disclosureMode", "interactions", "fullAriaTree"],
      properties: {
        disclosureMode: { const: "native-details" },
        interactions: { const: ["tab", "enter-space", "visible-focus", "active-ancestor"] },
        fullAriaTree: { const: false }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["semanticPathSource", "continuityMode", "sourceBodyIncluded", "targetStateRead"],
      properties: {
        semanticPathSource: { const: "manifest-input" },
        continuityMode: { const: "metadata-only" },
        sourceBodyIncluded: { const: false },
        targetStateRead: { const: false }
      }
    }
  }
} as const;

/** Portal shell 与 topic 本轮触碰的 label catalog。Label catalog limited to shell and topic labels touched in this slice. */
export interface DocumentationPortalLabels {
  contract: string;
  coverage: string;
  declaration: string;
  diagnostics: string;
  hierarchy: string;
  loading: string;
  members: string;
  metadata: string;
  open: string;
  provenance: string;
  relations: string;
  requiresServer: string;
  search: string;
  searchPlaceholder: string;
  select: string;
  source: string;
  summary: string;
  unavailable: string;
}

const PORTAL_LABEL_CATALOG: Record<DocumentationPortalUiLocale, DocumentationPortalLabels> = {
  "zh-CN": {
    contract: "契约",
    coverage: "覆盖情况",
    declaration: "声明",
    diagnostics: "诊断",
    hierarchy: "层级导航",
    loading: "正在加载文档导航...",
    members: "成员",
    metadata: "元数据",
    open: "打开",
    provenance: "溯源",
    relations: "项目关系",
    requiresServer: "该站点需要通过 HTTP(S) 提供；请使用本地静态服务器打开输出目录。",
    search: "搜索",
    searchPlaceholder: "名称、类型、源码或选择器",
    select: "请从左侧层级导航选择一个文档节点。",
    source: "源码",
    summary: "摘要",
    unavailable: "暂不可用"
  },
  en: {
    contract: "Contract",
    coverage: "Coverage",
    declaration: "Declaration",
    diagnostics: "Diagnostics",
    hierarchy: "Hierarchy",
    loading: "Loading documentation navigation...",
    members: "Members",
    metadata: "Metadata",
    open: "Open",
    provenance: "Provenance",
    relations: "Project relations",
    requiresServer: "The site must be served over HTTP(S); open the output directory through a local static server.",
    search: "Search",
    searchPlaceholder: "Name, kind, source, selector",
    select: "Select a documentation node from the hierarchy.",
    source: "Source",
    summary: "Summary",
    unavailable: "Unavailable"
  }
};

/**
 * 把显式 IA 输入解析成可序列化 contract；未知 identity/enum 直接抛错，避免 direct API caller 绕过 config。
 * Resolves explicit IA input into a serializable contract; unknown identities/enums throw so direct API callers cannot bypass config.
 */
export function resolveDocumentationPortalInformationArchitecture(
  options: DocumentationPortalInformationArchitectureOptions,
  uiLocale: DocumentationPortalUiLocale,
  contentLocale: string
): DocumentationPortalInformationArchitectureContract {
  // <lang zh-CN>direct API 也执行 closed-world key 检查，不能依赖 config caller。</lang>
  // <lang en>The direct API also performs a closed-world key check instead of trusting a config caller.</lang>
  const allowedFields = new Set(["contract", "contractVersion", "contentGrouping", "loadingStrategy", "memberPlacement"]);
  for (const field of Object.keys(options)) {
    if (!allowedFields.has(field)) {
      throw createPortalIaError(field, "unsupported-field");
    }
  }
  assertExactValue(options.contract, DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT, "contract");
  assertExactValue(options.contractVersion, DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION, "contractVersion");
  const contentGrouping = resolveEnum(options.contentGrouping, DOCUMENTATION_PORTAL_CONTENT_GROUPINGS, "contentGrouping", "entry");
  const loadingStrategy = resolveEnum(options.loadingStrategy, DOCUMENTATION_PORTAL_LOADING_STRATEGIES, "loadingStrategy", "lazy");
  const memberPlacement = resolveEnum(options.memberPlacement, DOCUMENTATION_PORTAL_MEMBER_PLACEMENTS, "memberPlacement", "separate");

  return {
    contract: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
    contractVersion: DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
    contentGrouping,
    loadingStrategy,
    memberPlacement,
    semanticPathPolicy: "manifest-only",
    semanticPathKinds: [...DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS],
    topicSections: [...DOCUMENTATION_PORTAL_TOPIC_SECTIONS],
    localeModel: {
      uiLocale,
      contentLocale,
      sourceCommentLocale: "not-projected"
    },
    routing: {
      canonicalEntryRouteStable: true,
      presentationPathAdditive: true,
      versionRouting: false
    },
    accessibility: {
      disclosureMode: "native-details",
      interactions: ["tab", "enter-space", "visible-focus", "active-ancestor"],
      fullAriaTree: false
    },
    privacy: {
      semanticPathSource: "manifest-input",
      continuityMode: "metadata-only",
      sourceBodyIncluded: false,
      targetStateRead: false
    }
  };
}

/** 解析 touched-label locale；显式未知值 fail closed，缺省按 content locale 选择。Resolves touched-label locale; explicit unknown values fail closed, omission follows content locale. */
export function resolveDocumentationPortalUiLocale(requested: string | undefined, contentLocale: string): DocumentationPortalUiLocale {
  if (requested !== undefined) {
    if (!DOCUMENTATION_PORTAL_UI_LOCALES.includes(requested as DocumentationPortalUiLocale)) {
      throw createPortalIaError("uiLocale", requested);
    }
    return requested as DocumentationPortalUiLocale;
  }
  return contentLocale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

/** 返回不可变 catalog 的浅拷贝，避免 caller 污染全局 label。Returns a shallow catalog copy so callers cannot mutate global labels. */
export function getDocumentationPortalLabels(locale: DocumentationPortalUiLocale): DocumentationPortalLabels {
  return { ...PORTAL_LABEL_CATALOG[locale] };
}

/** exact optional identity 校验。Validates one optional exact identity. */
function assertExactValue(value: string | undefined, expected: string, field: string): void {
  if (value !== undefined && value !== expected) {
    throw createPortalIaError(field, value);
  }
}

/** enum 解析只接受闭集或已冻结缺省值。Enum resolution accepts only the closed set or its frozen default. */
function resolveEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  field: string,
  fallback: T
): T {
  if (value === undefined) {
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    throw createPortalIaError(field, value);
  }
  return value as T;
}

/** 创建带固定 code 的 fail-closed runtime error。Creates a fail-closed runtime error carrying a stable code. */
function createPortalIaError(field: string, value: string): TypeError {
  return new TypeError(`HIA_PORTAL_IA_UNSUPPORTED: Unsupported ${field}: ${value}.`);
}
