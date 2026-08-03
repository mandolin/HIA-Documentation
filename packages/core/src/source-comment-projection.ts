import { createHiaDiagnostic } from "./diagnostics.js";
import {
  buildDocumentationLocaleFallbackChain,
  canonicalizeDocumentationLocale,
  resolveDocumentationLocaleResource,
  type DocumentationLocaleResource
} from "./locale-resource.js";
import type { HiaDiagnostic } from "./model.js";

/**
 * @lang zh-CN
 * locale-aware 源码注释投影的中性 contract 名称。
 *
 * @lang en
 * Neutral contract name for locale-aware source comment projections.
 */
export const DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT = "documentation-source-comment-projection" as const;

/**
 * @lang zh-CN
 * P1 草案版本；consumer 只能接受精确版本，不能推测 draft 兼容性。
 *
 * @lang en
 * P1 draft version; consumers must require an exact version instead of inferring draft compatibility.
 */
export const DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN
 * 公开 schema identity；普通 source map 只关联 projection identity，不承载此完整模型。
 *
 * @lang en
 * Public schema identity; ordinary source maps link projection identity and never embed this full model.
 */
export const DOCUMENTATION_SOURCE_COMMENT_PROJECTION_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-source-comment-projection-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN
 * P1 正文策略。`none` 是默认和拒绝态；显式策略只允许已投影纯文本。
 *
 * @lang en
 * P1 body policies. `none` is the default and refusal state; the explicit policy permits projected plain text only.
 */
export const DOCUMENTATION_SOURCE_COMMENT_CONTENT_POLICIES = ["none", "explicit-projected-text"] as const;

/**
 * @lang zh-CN
 * 结构化注释种类；它们是中性语义，不暴露 parser 私有 AST 节点。
 *
 * @lang en
 * Structured comment kinds; these are neutral semantics and expose no parser-private AST nodes.
 */
export const DOCUMENTATION_SOURCE_COMMENT_KINDS = ["line", "block", "documentation"] as const;

/**
 * @lang zh-CN
 * 固定 diagnostic 集合，便于 producer、CLI 和 Portal 以稳定 code 处理拒绝原因。
 *
 * @lang en
 * Fixed diagnostics let producers, the CLI, and the Portal handle refusal reasons through stable codes.
 */
export const DOCUMENTATION_SOURCE_COMMENT_DIAGNOSTIC_CODES = [
  "SOURCE_COMMENT_CONTRACT_UNSUPPORTED",
  "SOURCE_COMMENT_REQUEST_INVALID",
  "SOURCE_COMMENT_IDENTITY_DUPLICATE",
  "SOURCE_COMMENT_LOCALE_INVALID",
  "SOURCE_COMMENT_CONTENT_NOT_AUTHORIZED",
  "SOURCE_COMMENT_PRIVATE_FIELD",
  "SOURCE_COMMENT_RESOLUTION_MISSING",
  "SOURCE_COMMENT_PROJECTION_INVALID"
] as const;

/** @lang zh-CN 正文授权策略类型。 @lang en Comment body authorization policy. */
export type DocumentationSourceCommentContentPolicy = typeof DOCUMENTATION_SOURCE_COMMENT_CONTENT_POLICIES[number];
/** @lang zh-CN 中性注释种类。 @lang en Neutral structured comment kind. */
export type DocumentationSourceCommentKind = typeof DOCUMENTATION_SOURCE_COMMENT_KINDS[number];
/** @lang zh-CN locale 解析结果，与 confidence/provenance 独立。 @lang en Locale resolution, independent from confidence and provenance. */
export type DocumentationSourceCommentResolution = "exact" | "fallback" | "default" | "missing";
/** @lang zh-CN producer 声明可信度，不暗示解析成功。 @lang en Producer-declared confidence that does not imply successful resolution. */
export type DocumentationSourceCommentConfidence = "declared" | "none";

/**
 * @lang zh-CN
 * 逻辑 source identity；字段刻意不允许 filesystem path、URI 或源码正文。
 *
 * @lang en
 * Logical source identity; the shape deliberately permits no filesystem path, URI, or source body.
 */
export interface DocumentationSourceCommentIdentity {
  docSourceMapEntryId?: string;
  documentId: string;
  sourceId: string;
  symbolId: string;
}

/**
 * @lang zh-CN
 * 可选 source range 使用 1-based line 与 0-based column，并且只描述位置，不包含源文本。
 *
 * @lang en
 * An optional source range uses one-based lines and zero-based columns and describes location without source text.
 */
export interface DocumentationSourceCommentRange {
  end: { column: number; line: number };
  start: { column: number; line: number };
}

/**
 * @lang zh-CN
 * 由受信 producer 提供的结构化注释输入。localized text key 必须是 canonical BCP 47 tag。
 *
 * @lang en
 * Structured comment input from a trusted producer. Localized text keys must be canonical BCP 47 tags.
 */
export interface DocumentationSourceCommentInput {
  commentId: string;
  kind: DocumentationSourceCommentKind;
  localizedText: Record<string, string>;
  order: number;
  range?: DocumentationSourceCommentRange;
}

/**
 * @lang zh-CN
 * pure evaluator 的 closed-world 请求；它不授予读取文件、解析源码或执行表达式的能力。
 *
 * @lang en
 * Closed-world request for the pure evaluator; it grants no file reading, source parsing, or expression execution.
 */
export interface DocumentationSourceCommentProjectionRequest {
  comments: DocumentationSourceCommentInput[];
  contentPolicy?: DocumentationSourceCommentContentPolicy;
  contract: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION;
  defaultLocale: string;
  fallbackLocales?: string[];
  projectionId: string;
  requestedLocale: string;
  source: DocumentationSourceCommentIdentity;
}

/**
 * @lang zh-CN
 * 可审计 provenance；confidence 与 resolution 另列，不能由 provenance 暗示。
 *
 * @lang en
 * Auditable provenance; confidence and resolution remain separate and cannot be implied by provenance.
 */
export interface DocumentationSourceCommentProvenance {
  kind: "structured-source-comment" | "unresolved";
  sourceLocale?: string;
}

/**
 * @lang zh-CN
 * 单条稳定注释投影。`stableCommentKey` 不含 locale 或正文，因此 fallback 不改变身份。
 *
 * @lang en
 * One stable comment projection. `stableCommentKey` excludes locale and text, so fallback cannot change identity.
 */
export interface DocumentationSourceCommentProjectionEntry {
  commentId: string;
  confidence: DocumentationSourceCommentConfidence;
  diagnosticCodes: string[];
  kind: DocumentationSourceCommentKind;
  order: number;
  projectedText?: string;
  provenance: DocumentationSourceCommentProvenance;
  range?: DocumentationSourceCommentRange;
  requestedLocale: string;
  resolvedLocale?: string;
  resolution: DocumentationSourceCommentResolution;
  stableCommentKey: string;
}

/**
 * @lang zh-CN
 * P1 privacy 事实必须显式序列化；缺省 source body、raw comment 与 `sourcesContent` 永远关闭。
 *
 * @lang en
 * P1 privacy facts are serialized explicitly; source body, raw comments, and `sourcesContent` always remain disabled.
 */
export interface DocumentationSourceCommentPrivacy {
  projectedCommentTextIncluded: boolean;
  rawCommentIncluded: false;
  richTextPolicy: "plain-text-only";
  sourceBodyIncluded: false;
  sourcesContentPolicy: "none";
}

/**
 * @lang zh-CN
 * 可分发投影。拒绝态会强制 `contentPolicy=none` 并清除所有 projected text。
 *
 * @lang en
 * Distributable projection. A refused result forces `contentPolicy=none` and removes all projected text.
 */
export interface DocumentationSourceCommentProjection {
  contentPolicy: DocumentationSourceCommentContentPolicy;
  contract: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION;
  defaultLocale: string;
  diagnostics: HiaDiagnostic[];
  entries: DocumentationSourceCommentProjectionEntry[];
  fallbackChain: string[];
  privacy: DocumentationSourceCommentPrivacy;
  projectionId: string;
  requestedLocale: string;
  source: DocumentationSourceCommentIdentity;
  status: "ready" | "refused";
}

/**
 * @lang zh-CN
 * Draft 2020-12 wire schema。runtime validator 继续负责 canonical locale、stable key 与 privacy 跨字段不变量。
 *
 * @lang en
 * Draft 2020-12 wire schema. The runtime validator additionally enforces canonical locales, stable keys, and privacy invariants.
 */
export const DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_SCHEMA_ID,
  title: "Documentation Source Comment Projection",
  type: "object",
  additionalProperties: false,
  required: [
    "contract", "contractVersion", "status", "projectionId", "source", "requestedLocale", "defaultLocale",
    "fallbackChain", "contentPolicy", "privacy", "entries", "diagnostics"
  ],
  properties: {
    contract: { const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT },
    contractVersion: { const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION },
    status: { enum: ["ready", "refused"] },
    projectionId: { $ref: "#/$defs/identity" },
    source: { $ref: "#/$defs/source" },
    requestedLocale: { type: "string", minLength: 1 },
    defaultLocale: { type: "string", minLength: 1 },
    fallbackChain: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } },
    contentPolicy: { enum: DOCUMENTATION_SOURCE_COMMENT_CONTENT_POLICIES },
    privacy: { $ref: "#/$defs/privacy" },
    entries: { type: "array", maxItems: 256, items: { $ref: "#/$defs/entry" } },
    diagnostics: { type: "array", items: { $ref: "#/$defs/diagnostic" } }
  },
  $defs: {
    identity: { type: "string", minLength: 1, maxLength: 256, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    position: {
      type: "object", additionalProperties: false, required: ["line", "column"],
      properties: { line: { type: "integer", minimum: 1 }, column: { type: "integer", minimum: 0 } }
    },
    range: {
      type: "object", additionalProperties: false, required: ["start", "end"],
      properties: { start: { $ref: "#/$defs/position" }, end: { $ref: "#/$defs/position" } }
    },
    source: {
      type: "object", additionalProperties: false, required: ["documentId", "symbolId", "sourceId"],
      properties: {
        documentId: { $ref: "#/$defs/identity" }, symbolId: { $ref: "#/$defs/identity" },
        sourceId: { $ref: "#/$defs/identity" }, docSourceMapEntryId: { $ref: "#/$defs/identity" }
      }
    },
    provenance: {
      type: "object", additionalProperties: false, required: ["kind"],
      properties: { kind: { enum: ["structured-source-comment", "unresolved"] }, sourceLocale: { type: "string", minLength: 1 } }
    },
    entry: {
      type: "object", additionalProperties: false,
      required: ["commentId", "stableCommentKey", "kind", "order", "requestedLocale", "resolution", "confidence", "provenance", "diagnosticCodes"],
      properties: {
        commentId: { $ref: "#/$defs/identity" }, stableCommentKey: { type: "string", minLength: 1, maxLength: 1200 },
        kind: { enum: DOCUMENTATION_SOURCE_COMMENT_KINDS }, order: { type: "integer", minimum: 0 },
        range: { $ref: "#/$defs/range" }, requestedLocale: { type: "string", minLength: 1 },
        resolvedLocale: { type: "string", minLength: 1 }, resolution: { enum: ["exact", "fallback", "default", "missing"] },
        confidence: { enum: ["declared", "none"] }, provenance: { $ref: "#/$defs/provenance" },
        projectedText: { type: "string", minLength: 1, maxLength: 4096 },
        diagnosticCodes: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } }
      }
    },
    privacy: {
      type: "object", additionalProperties: false,
      required: ["sourcesContentPolicy", "sourceBodyIncluded", "rawCommentIncluded", "projectedCommentTextIncluded", "richTextPolicy"],
      properties: {
        sourcesContentPolicy: { const: "none" }, sourceBodyIncluded: { const: false }, rawCommentIncluded: { const: false },
        projectedCommentTextIncluded: { type: "boolean" }, richTextPolicy: { const: "plain-text-only" }
      }
    },
    diagnostic: {
      type: "object", additionalProperties: false, required: ["code", "message", "severity"],
      properties: {
        code: { type: "string", minLength: 1 }, message: { type: "string", minLength: 1 },
        severity: { enum: ["info", "warning", "error"] }, path: { type: "string" }, targetPath: { type: "string" },
        data: { type: "object" }
      }
    }
  }
} as const;

const requestKeys = ["comments", "contentPolicy", "contract", "contractVersion", "defaultLocale", "fallbackLocales", "projectionId", "requestedLocale", "source"] as const;
const sourceKeys = ["docSourceMapEntryId", "documentId", "sourceId", "symbolId"] as const;
const commentKeys = ["commentId", "kind", "localizedText", "order", "range"] as const;
const outputKeys = ["contentPolicy", "contract", "contractVersion", "defaultLocale", "diagnostics", "entries", "fallbackChain", "privacy", "projectionId", "requestedLocale", "source", "status"] as const;
const identityPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * @lang zh-CN
 * 从结构化注释构造确定性 projection。函数纯计算、fail closed，并对输入数量和正文长度设界。
 *
 * @lang en
 * Builds a deterministic projection from structured comments. The function is pure, fail-closed, and size-bounded.
 *
 * @param request - 结构化、无文件权限的投影请求。 / Structured projection request with no file authority.
 * @returns ready projection，或不含正文的 refused projection。 / A ready projection or a body-free refused projection.
 */
export function createDocumentationSourceCommentProjection(request: unknown): DocumentationSourceCommentProjection {
  const diagnostics = validateRequest(request);
  if (diagnostics.length > 0 || !isRecord(request)) {
    return createRefusedProjection(diagnostics);
  }

  const typedRequest = request as unknown as DocumentationSourceCommentProjectionRequest;
  const requestedLocale = canonicalizeDocumentationLocale(typedRequest.requestedLocale)!.canonical;
  const defaultLocale = canonicalizeDocumentationLocale(typedRequest.defaultLocale)!.canonical;
  const fallbackLocales = (typedRequest.fallbackLocales ?? []).map((locale) => canonicalizeDocumentationLocale(locale)!.canonical);
  const fallbackChain = buildDocumentationLocaleFallbackChain(requestedLocale, defaultLocale, fallbackLocales);
  const contentPolicy = typedRequest.contentPolicy ?? "none";
  const entries: DocumentationSourceCommentProjectionEntry[] = [];

  // <lang><zh-CN>同一内存 DLR 只复用既有 fallback 语义；它不触发 resource discovery、文件读取或 network。</zh-CN><en>The in-memory DLR reuses existing fallback semantics only; it triggers no resource discovery, file read, or network.</en></lang>
  const resource = createInMemoryLocaleResource(typedRequest.comments, defaultLocale);
  for (const comment of [...typedRequest.comments].sort(compareComments)) {
    const resolution = resolveDocumentationLocaleResource(
      { entryKey: comment.commentId },
      { directResource: resource, fallbackLocales, requestedLocale }
    );
    const mappedResolution = mapResolution(resolution.resolutionKind);
    const resolved = mappedResolution !== "missing" && resolution.text.length > 0;
    const entry: DocumentationSourceCommentProjectionEntry = {
      commentId: comment.commentId,
      confidence: resolved ? "declared" : "none",
      diagnosticCodes: [...new Set(resolution.diagnostics.map((diagnostic) => diagnostic.code))],
      kind: comment.kind,
      order: comment.order,
      provenance: !resolved
        ? { kind: "unresolved" }
        : { kind: "structured-source-comment", sourceLocale: resolution.resolvedLocale },
      requestedLocale,
      resolution: mappedResolution,
      stableCommentKey: createStableCommentKey(typedRequest, comment.commentId)
    };
    if (comment.range) entry.range = structuredClone(comment.range);
    if (resolution.resolvedLocale) entry.resolvedLocale = resolution.resolvedLocale;
    if (contentPolicy === "explicit-projected-text" && resolved) entry.projectedText = resolution.text;
    if (!resolved) {
      diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_RESOLUTION_MISSING", "A structured source comment has no deterministic locale resolution.", `comments.${comment.commentId}`));
    }
    entries.push(entry);
  }

  // <lang><zh-CN>任何缺失解析都把整个结果降为拒绝态，避免部分正文被误认为完整投影。</zh-CN><en>Any missing resolution refuses the whole result so partial text cannot be mistaken for a complete projection.</en></lang>
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return {
      ...baseProjection(typedRequest.projectionId, typedRequest.source, requestedLocale, defaultLocale, fallbackChain),
      contentPolicy: "none",
      diagnostics,
      entries: entries.map(({ projectedText: _projectedText, ...entry }) => entry),
      privacy: createPrivacy(false),
      status: "refused"
    };
  }

  return {
    ...baseProjection(typedRequest.projectionId, typedRequest.source, requestedLocale, defaultLocale, fallbackChain),
    contentPolicy,
    diagnostics,
    entries,
    privacy: createPrivacy(contentPolicy === "explicit-projected-text" && entries.length > 0),
    status: "ready"
  };
}

/**
 * @lang zh-CN
 * 校验可分发 projection 的 closed-world shape 与跨字段 privacy/identity 不变量。
 *
 * @lang en
 * Validates the closed-world wire shape and cross-field privacy and identity invariants of a projection.
 *
 * @param value - 待校验的未知值。 / Unknown value to validate.
 * @returns 所有发现的 stable diagnostics；空数组表示有效。 / Stable diagnostics; an empty array means valid.
 */
export function validateDocumentationSourceCommentProjection(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (isRecord(value) && Object.keys(value).some((key) => privateFieldNames.has(key))) {
    return [sourceCommentDiagnostic("SOURCE_COMMENT_PRIVATE_FIELD", "Projection contains a prohibited private field.")];
  }
  if (!isExactRecord(value, outputKeys)) {
    return [sourceCommentDiagnostic("SOURCE_COMMENT_PROJECTION_INVALID", "Projection must be a closed-world object.")];
  }
  if (value.contract !== DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT || value.contractVersion !== DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_CONTRACT_UNSUPPORTED", "Projection contract and version must match exactly."));
  }
  if ((value.status !== "ready" && value.status !== "refused") || !isIdentity(value.projectionId) || !isSourceIdentity(value.source)) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_PROJECTION_INVALID", "Projection status or logical identity is invalid."));
  }
  if (!isCanonicalLocale(value.requestedLocale) || !isCanonicalLocale(value.defaultLocale) || !isCanonicalLocaleArray(value.fallbackChain)
    || value.fallbackChain[0] !== value.requestedLocale || !(value.fallbackChain as unknown[]).includes(value.defaultLocale)) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_LOCALE_INVALID", "Projection locales must be canonical BCP 47 tags."));
  }
  if (!DOCUMENTATION_SOURCE_COMMENT_CONTENT_POLICIES.includes(value.contentPolicy as DocumentationSourceCommentContentPolicy)) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_CONTENT_NOT_AUTHORIZED", "Projection content policy is unsupported."));
  }
  if (!isPrivacy(value.privacy) || !Array.isArray(value.entries) || value.entries.length > 256 || !Array.isArray(value.diagnostics)
    || !(value.diagnostics as unknown[]).every(isSafeDiagnostic)) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_PROJECTION_INVALID", "Projection privacy, entries, or diagnostics are invalid."));
    return diagnostics;
  }

  const seen = new Set<string>();
  let bodyCount = 0;
  for (const entry of value.entries) {
    if (!isProjectionEntry(entry, value as unknown as DocumentationSourceCommentProjection)) {
      diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_PROJECTION_INVALID", "Projection entry violates its closed-world contract."));
      continue;
    }
    if (seen.has(entry.commentId)) diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_IDENTITY_DUPLICATE", "Projection comment identity is duplicated."));
    seen.add(entry.commentId);
    if (entry.projectedText !== undefined) bodyCount += 1;
  }
  const privacy = value.privacy as unknown as DocumentationSourceCommentPrivacy;
  const contentPolicyMatches = value.contentPolicy === "explicit-projected-text" ? bodyCount === value.entries.length && bodyCount > 0 : bodyCount === 0;
  const statusConsistent = value.status === "ready"
    ? value.entries.length > 0
    : bodyCount === 0 && (value.diagnostics as HiaDiagnostic[]).some((diagnostic) => diagnostic.severity === "error");
  if (!contentPolicyMatches || privacy.projectedCommentTextIncluded !== (bodyCount > 0) || !statusConsistent) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_CONTENT_NOT_AUTHORIZED", "Projection body does not match content policy, privacy facts, or refusal state."));
  }
  return diagnostics;
}

/**
 * @lang zh-CN
 * Boolean runtime guard；适合 CLI/renderer 在消费 metadata 前 fail closed。
 *
 * @lang en
 * Boolean runtime guard for fail-closed CLI and renderer metadata consumption.
 */
export function isDocumentationSourceCommentProjection(value: unknown): value is DocumentationSourceCommentProjection {
  return validateDocumentationSourceCommentProjection(value).length === 0;
}

function validateRequest(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (containsPrivateField(value)) return [sourceCommentDiagnostic("SOURCE_COMMENT_PRIVATE_FIELD", "Request contains a prohibited private field.")];
  if (!isExactRecord(value, requestKeys)) return [sourceCommentDiagnostic("SOURCE_COMMENT_REQUEST_INVALID", "Request must be a closed-world object.")];
  if (value.contract !== DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT || value.contractVersion !== DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_CONTRACT_UNSUPPORTED", "Request contract and version must match exactly."));
  }
  if (!isIdentity(value.projectionId) || !isSourceIdentity(value.source)) diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_REQUEST_INVALID", "Request logical identity is invalid."));
  if (!isCanonicalLocale(value.requestedLocale) || !isCanonicalLocale(value.defaultLocale) || (value.fallbackLocales !== undefined && !isCanonicalLocaleArray(value.fallbackLocales))) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_LOCALE_INVALID", "Request locales must be canonical BCP 47 tags."));
  }
  if (value.contentPolicy !== undefined && !DOCUMENTATION_SOURCE_COMMENT_CONTENT_POLICIES.includes(value.contentPolicy as DocumentationSourceCommentContentPolicy)) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_CONTENT_NOT_AUTHORIZED", "Request content policy is unsupported."));
  }
  if (!Array.isArray(value.comments) || value.comments.length === 0 || value.comments.length > 256) {
    diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_REQUEST_INVALID", "Request must include between 1 and 256 structured comments."));
    return diagnostics;
  }
  const seen = new Set<string>();
  for (const comment of value.comments) {
    if (!isCommentInput(comment)) {
      diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_REQUEST_INVALID", "Structured comment shape, locale map, range, or text bound is invalid."));
      continue;
    }
    if (seen.has(comment.commentId)) diagnostics.push(sourceCommentDiagnostic("SOURCE_COMMENT_IDENTITY_DUPLICATE", "Structured comment identity is duplicated."));
    seen.add(comment.commentId);
  }
  return diagnostics;
}

function createRefusedProjection(diagnostics: HiaDiagnostic[]): DocumentationSourceCommentProjection {
  return {
    ...baseProjection("refused", { documentId: "unknown", sourceId: "unknown", symbolId: "unknown" }, "und", "und", ["und"]),
    contentPolicy: "none",
    diagnostics: diagnostics.length > 0 ? diagnostics : [sourceCommentDiagnostic("SOURCE_COMMENT_REQUEST_INVALID", "Request was refused.")],
    entries: [],
    privacy: createPrivacy(false),
    status: "refused"
  };
}

function baseProjection(
  projectionId: string,
  source: DocumentationSourceCommentIdentity,
  requestedLocale: string,
  defaultLocale: string,
  fallbackChain: string[]
): Pick<DocumentationSourceCommentProjection, "contract" | "contractVersion" | "projectionId" | "source" | "requestedLocale" | "defaultLocale" | "fallbackChain"> {
  return {
    contract: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
    contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
    defaultLocale,
    fallbackChain,
    projectionId,
    requestedLocale,
    source: structuredClone(source)
  };
}

function createPrivacy(projectedCommentTextIncluded: boolean): DocumentationSourceCommentPrivacy {
  return {
    projectedCommentTextIncluded,
    rawCommentIncluded: false,
    richTextPolicy: "plain-text-only",
    sourceBodyIncluded: false,
    sourcesContentPolicy: "none"
  };
}

function createInMemoryLocaleResource(comments: DocumentationSourceCommentInput[], defaultLocale: string): DocumentationLocaleResource {
  const locales = [...new Set(comments.flatMap((comment) => Object.keys(comment.localizedText)))].sort();
  return {
    contractVersion: "0.1.0-draft",
    defaultLocale,
    entries: Object.fromEntries(comments.map((comment) => [comment.commentId, { localizedText: comment.localizedText }])),
    format: "documentation-locale-resource-json",
    formatVersion: "0.1.0-draft",
    kind: "documentation-locale-resource",
    locales,
    resourceId: "source.comments.projection"
  };
}

function mapResolution(kind: string): DocumentationSourceCommentResolution {
  if (kind === "direct") return "exact";
  if (kind === "parent-fallback" || kind === "configured-fallback") return "fallback";
  if (kind === "default-fallback") return "default";
  return "missing";
}

function createStableCommentKey(request: DocumentationSourceCommentProjectionRequest, commentId: string): string {
  return [request.projectionId, request.source.documentId, request.source.symbolId, request.source.sourceId, commentId].join("::");
}

function compareComments(left: DocumentationSourceCommentInput, right: DocumentationSourceCommentInput): number {
  return left.order - right.order || left.commentId.localeCompare(right.commentId, "en");
}

function isCommentInput(value: unknown): value is DocumentationSourceCommentInput {
  if (!isExactRecord(value, commentKeys) || !isIdentity(value.commentId) || !DOCUMENTATION_SOURCE_COMMENT_KINDS.includes(value.kind as DocumentationSourceCommentKind)) return false;
  if (!Number.isSafeInteger(value.order) || (value.order as number) < 0 || (value.range !== undefined && !isRange(value.range))) return false;
  if (!isRecord(value.localizedText) || Object.keys(value.localizedText).length === 0) return false;
  return Object.entries(value.localizedText).every(([locale, text]) => isCanonicalLocale(locale) && typeof text === "string" && text.length > 0 && text.length <= 4096);
}

function isProjectionEntry(value: unknown, projection: DocumentationSourceCommentProjection): value is DocumentationSourceCommentProjectionEntry {
  const keys = ["commentId", "confidence", "diagnosticCodes", "kind", "order", "projectedText", "provenance", "range", "requestedLocale", "resolvedLocale", "resolution", "stableCommentKey"] as const;
  if (!isExactRecord(value, keys) || !isIdentity(value.commentId) || typeof value.stableCommentKey !== "string" || value.stableCommentKey.length === 0 || value.stableCommentKey.length > 1200) return false;
  if (!DOCUMENTATION_SOURCE_COMMENT_KINDS.includes(value.kind as DocumentationSourceCommentKind) || !Number.isSafeInteger(value.order) || (value.order as number) < 0) return false;
  if (value.range !== undefined && !isRange(value.range)) return false;
  if (value.requestedLocale !== projection.requestedLocale || (value.resolvedLocale !== undefined && !isCanonicalLocale(value.resolvedLocale))) return false;
  if (!["exact", "fallback", "default", "missing"].includes(value.resolution as string) || !["declared", "none"].includes(value.confidence as string)) return false;
  if (!isProvenance(value.provenance) || !Array.isArray(value.diagnosticCodes) || !value.diagnosticCodes.every((code) => typeof code === "string" && code.length > 0)) return false;
  if (value.projectedText !== undefined && (typeof value.projectedText !== "string" || value.projectedText.length === 0 || value.projectedText.length > 4096)) return false;
  const semanticDimensionsMatch = value.resolution === "missing"
    ? value.confidence === "none" && value.provenance.kind === "unresolved" && value.resolvedLocale === undefined && value.projectedText === undefined
    : value.confidence === "declared" && value.provenance.kind === "structured-source-comment" && value.resolvedLocale === value.provenance.sourceLocale;
  if (!semanticDimensionsMatch) return false;
  const expectedKey = [projection.projectionId, projection.source.documentId, projection.source.symbolId, projection.source.sourceId, value.commentId].join("::");
  return value.stableCommentKey === expectedKey;
}

function isSourceIdentity(value: unknown): value is DocumentationSourceCommentIdentity {
  if (!isExactRecord(value, sourceKeys)) return false;
  return isIdentity(value.documentId) && isIdentity(value.sourceId) && isIdentity(value.symbolId)
    && (value.docSourceMapEntryId === undefined || isIdentity(value.docSourceMapEntryId));
}

function isRange(value: unknown): value is DocumentationSourceCommentRange {
  if (!isExactRecord(value, ["end", "start"] as const)) return false;
  return isPosition(value.start) && isPosition(value.end)
    && ((value.end.line as number) > (value.start.line as number)
      || ((value.end.line as number) === (value.start.line as number) && (value.end.column as number) >= (value.start.column as number)));
}

function isPosition(value: unknown): value is { column: number; line: number } {
  return isExactRecord(value, ["column", "line"] as const)
    && Number.isSafeInteger(value.line) && (value.line as number) >= 1
    && Number.isSafeInteger(value.column) && (value.column as number) >= 0;
}

function isProvenance(value: unknown): value is DocumentationSourceCommentProvenance {
  if (!isExactRecord(value, ["kind", "sourceLocale"] as const)) return false;
  if (value.kind === "unresolved") return value.sourceLocale === undefined;
  return value.kind === "structured-source-comment" && isCanonicalLocale(value.sourceLocale);
}

function isPrivacy(value: unknown): value is DocumentationSourceCommentPrivacy {
  return isExactRecord(value, ["projectedCommentTextIncluded", "rawCommentIncluded", "richTextPolicy", "sourceBodyIncluded", "sourcesContentPolicy"] as const)
    && value.sourcesContentPolicy === "none" && value.sourceBodyIncluded === false && value.rawCommentIncluded === false
    && typeof value.projectedCommentTextIncluded === "boolean" && value.richTextPolicy === "plain-text-only";
}

function isCanonicalLocale(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = canonicalizeDocumentationLocale(value);
  return normalized !== undefined && !normalized.usedLegacyUnderscore && normalized.canonical === value;
}

function isCanonicalLocaleArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(isCanonicalLocale);
}

function isIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256 && identityPattern.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExactRecord<const T extends readonly string[]>(value: unknown, keys: T): value is Record<T[number], unknown> {
  return isRecord(value) && Object.keys(value).every((key) => (keys as readonly string[]).includes(key));
}

const privateFieldNames = new Set([
  "absolutePath", "ast", "html", "locator", "markdown", "path", "rawComment", "sourceBody", "sourcePath", "sourcesContent", "uri"
]);

function containsPrivateField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsPrivateField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => privateFieldNames.has(key) || containsPrivateField(child));
}

function isSafeDiagnostic(value: unknown): value is HiaDiagnostic {
  if (!isExactRecord(value, ["code", "data", "message", "path", "severity", "targetPath"] as const)) return false;
  if (typeof value.code !== "string" || value.code.length === 0 || typeof value.message !== "string" || value.message.length === 0) return false;
  if (!["info", "warning", "error"].includes(value.severity as string)) return false;
  for (const candidate of [value.path, value.targetPath]) {
    if (candidate !== undefined && (typeof candidate !== "string" || isAbsolutePathLike(candidate))) return false;
  }
  return value.data === undefined || isPublicDiagnosticData(value.data);
}

function isPublicDiagnosticData(value: unknown): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return !isAbsolutePathLike(value);
  if (Array.isArray(value)) return value.every(isPublicDiagnosticData);
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, child]) => !privateFieldNames.has(key) && isPublicDiagnosticData(child));
}

function isAbsolutePathLike(value: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.startsWith("\\\\");
}

function sourceCommentDiagnostic(code: typeof DOCUMENTATION_SOURCE_COMMENT_DIAGNOSTIC_CODES[number], message: string, path?: string): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", path ? { path } : {});
}
