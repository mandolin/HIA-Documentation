import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";

/**
 * Neutral contract name for a documentation locale resource (DLR).
 *
 * 中文：文档语言资源（DLR）的中性 contract 名称。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_CONTRACT = "documentation-locale-resource" as const;

/**
 * Draft contract version for the canonical DLR payload.
 *
 * 中文：canonical DLR payload 的草案 contract 版本。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * Canonical P1 wire format for a DLR payload.
 *
 * 中文：DLR payload 的 P1 canonical wire format。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_FORMAT = "documentation-locale-resource-json" as const;

/**
 * Draft format version; it is deliberately independent from the contract version.
 *
 * 中文：format 的草案版本，刻意与 contract version 独立。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION = "0.1.0-draft" as const;

/**
 * Public JSON Schema id for the canonical DLR payload.
 *
 * 中文：canonical DLR payload 的公开 JSON Schema 标识。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-locale-resource-0.1.0-draft.schema.json" as const;

/**
 * Sidecar contract name used to link a document field to one DLR resolution.
 *
 * 中文：将文档 field 关联到一次 DLR resolution 的 sidecar contract 名称。
 */
export const DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT = "documentation-locale-resolution" as const;

/**
 * Draft contract version for the metadata-only resolution sidecar.
 *
 * 中文：metadata-only resolution sidecar 的草案 contract 版本。
 */
export const DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * Public JSON Schema id for the metadata-only locale-resolution sidecar.
 *
 * 中文：metadata-only locale-resolution sidecar 的公开 JSON Schema 标识。
 */
export const DOCUMENTATION_LOCALE_RESOLUTION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-locale-resolution-0.1.0-draft.schema.json" as const;

/**
 * Resolution dimensions remain independent so fallback never implies low confidence.
 *
 * 中文：resolution 的三个维度保持独立，fallback 绝不隐含 low confidence。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_RESOLUTION_KINDS = [
  "direct",
  "parent-fallback",
  "configured-fallback",
  "default-fallback",
  "missing"
] as const;

/**
 * Confidence levels emitted by the neutral DLR resolver.
 *
 * 中文：中性 DLR resolver 输出的 confidence 等级。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_CONFIDENCE_LEVELS = ["high", "medium", "low", "none"] as const;

/**
 * Fixed P1 provenance kinds. Legacy is an explicit bridge signal, not canonical input.
 *
 * 中文：固定的 P1 provenance kind；legacy 仅是显式 bridge 信号，不是 canonical input。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_PROVENANCE_KINDS = [
  "inline-locale",
  "dlr-entry",
  "source-default-text",
  "legacy-adapter-bridge",
  "unresolved"
] as const;

/**
 * Neutral diagnostic catalog required by the DLR P1 contract.
 *
 * 中文：DLR P1 contract 必须提供的中性 diagnostic 目录。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "DLR_RESOURCE_ID_INVALID", defaultSeverity: "error", description: "DLR resourceId is invalid." },
  { code: "DLR_LOCATOR_INVALID", defaultSeverity: "error", description: "DLR locator is not a safe project-relative POSIX path." },
  { code: "DLR_LOCATOR_ABSOLUTE", defaultSeverity: "error", description: "DLR locator is absolute or drive rooted." },
  { code: "DLR_LOCATOR_UNC", defaultSeverity: "error", description: "DLR locator uses a UNC path." },
  { code: "DLR_LOCATOR_TRAVERSAL", defaultSeverity: "error", description: "DLR locator traverses outside its declared root." },
  { code: "DLR_LOCATOR_SYMLINK_ESCAPE", defaultSeverity: "error", description: "DLR locator resolves outside its declared root." },
  { code: "DLR_FORMAT_UNSUPPORTED", defaultSeverity: "error", description: "DLR format is unsupported or cannot be parsed." },
  { code: "DLR_VERSION_UNSUPPORTED", defaultSeverity: "error", description: "DLR contract or format version is unsupported." },
  { code: "DLR_RESOURCE_READ_FAILED", defaultSeverity: "error", description: "DLR resource cannot be read from its declared root." },
  { code: "DLR_ENTRY_DUPLICATE", defaultSeverity: "error", description: "DLR entry identity is duplicated." },
  { code: "DLR_ENTRY_MISSING", defaultSeverity: "error", description: "DLR entry key is missing or unavailable." },
  { code: "DLR_LOCALE_INVALID", defaultSeverity: "error", description: "DLR locale is not a valid BCP 47 tag." },
  { code: "DLR_LOCALE_MISSING", defaultSeverity: "error", description: "A required DLR locale is unavailable." },
  { code: "DLR_FALLBACK_USED", defaultSeverity: "warning", description: "DLR resolution used a deterministic fallback locale." },
  { code: "DLR_REFERENCE_AMBIGUOUS", defaultSeverity: "error", description: "DLR reference selection is ambiguous." },
  { code: "DLR_LIMIT_EXCEEDED", defaultSeverity: "error", description: "DLR input exceeds an explicit profile limit." },
  { code: "DLR_PRIVACY_VIOLATION", defaultSeverity: "error", description: "DLR metadata includes a prohibited private value." },
  { code: "DLR_LEGACY_BRIDGE", defaultSeverity: "warning", description: "A legacy adapter bridge was used instead of canonical DLR input." }
] as const satisfies readonly {
  code: string;
  defaultSeverity: HiaDiagnosticSeverity;
  description: string;
}[];

/**
 * A stable DLR entry, keyed by `resourceId + entryKey` in the containing resource.
 *
 * 中文：稳定的 DLR entry；其身份由包含它的 `resourceId + entryKey` 共同确定。
 */
export interface DocumentationLocaleResourceEntry {
  localizedText: Record<string, string>;
}

/**
 * Canonical JSON shape for `documentation-locale-resource@0.1.0-draft`.
 *
 * 中文：`documentation-locale-resource@0.1.0-draft` 的 canonical JSON 结构。
 */
export interface DocumentationLocaleResource {
  $schema?: string;
  contractVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION;
  defaultLocale: string;
  entries: Record<string, DocumentationLocaleResourceEntry>;
  format: typeof DOCUMENTATION_LOCALE_RESOURCE_FORMAT;
  formatVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION;
  kind: typeof DOCUMENTATION_LOCALE_RESOURCE_CONTRACT;
  locales: string[];
  resourceId: string;
}

/**
 * Logical resource reference emitted by a doc-line profile before local I/O occurs.
 *
 * 中文：doc-line profile 在 local I/O 前输出的逻辑资源引用。
 */
export interface DocumentationLocaleResourceReference {
  entryKey: string;
  resource?: string;
  src?: string;
}

/**
 * One deterministic source tier made available to the pure resolver.
 *
 * 中文：提供给纯 resolver 的一个确定性 source tier。
 */
export interface DocumentationLocaleResourceResolutionSource {
  resource: DocumentationLocaleResource;
  role: "direct-resource" | "document-default-resource" | "catalog-default-resource";
}

/**
 * Resolver input. The runtime adapter owns resource loading and passes only validated data.
 *
 * 中文：resolver 输入；runtime adapter 负责资源读取，只传入已校验的数据。
 */
export interface DocumentationLocaleResourceResolutionOptions {
  catalogDefaultResource?: DocumentationLocaleResource;
  catalogDefaultResourceSelectionFailed?: boolean;
  defaultText?: string;
  directResource?: DocumentationLocaleResource;
  directResourceSelectionFailed?: boolean;
  documentDefaultResource?: DocumentationLocaleResource;
  documentDefaultResourceSelectionFailed?: boolean;
  fallbackLocales?: string[];
  inlineLocalizedText?: Record<string, string>;
  requestedLocale: string;
  sourceDefaultLocale?: string;
}

/**
 * Non-secret origin of a resolved text. It deliberately excludes locators and text bodies.
 *
 * 中文：已解析文本的非敏感来源；刻意不包含 locator 或文本正文。
 */
export interface DocumentationLocaleResourceProvenance {
  coverage: "complete" | "missing";
  entryKey?: string;
  kind: typeof DOCUMENTATION_LOCALE_RESOURCE_PROVENANCE_KINDS[number];
  resourceId?: string;
  sourceLocale?: string;
}

/**
 * Complete runtime result. `text` is process-local and must not be copied to a sidecar.
 *
 * 中文：完整 runtime 结果；`text` 仅限进程内使用，绝不可复制到 sidecar。
 */
export interface DocumentationLocaleResourceResolution {
  confidence: typeof DOCUMENTATION_LOCALE_RESOURCE_CONFIDENCE_LEVELS[number];
  diagnostics: HiaDiagnostic[];
  fallbackChain: string[];
  provenance: DocumentationLocaleResourceProvenance;
  requestedLocale: string;
  resolvedLocale: string;
  resolutionKind: typeof DOCUMENTATION_LOCALE_RESOURCE_RESOLUTION_KINDS[number];
  text: string;
}

/**
 * Metadata-only record that can be linked from a doc-source-map without becoming a datastore.
 *
 * 中文：可由 doc-source-map 关联、但绝不成为数据存储的 metadata-only record。
 */
export interface DocumentationLocaleResolutionSidecarEntry {
  confidence: DocumentationLocaleResourceResolution["confidence"];
  diagnosticCodes: string[];
  documentId: string;
  entryKey?: string;
  fieldPath: string;
  provenance: DocumentationLocaleResourceProvenance;
  requestedLocale: string;
  resolvedLocale: string;
  resolutionKind: DocumentationLocaleResourceResolution["resolutionKind"];
  resourceId?: string;
  symbolId?: string;
}

/**
 * Versioned sidecar container. No raw locator, resource body or rendered text is allowed.
 *
 * 中文：版本化 sidecar 容器；禁止 raw locator、resource body 和 rendered text。
 */
export interface DocumentationLocaleResolutionSidecar {
  contract: typeof DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION;
  entries: DocumentationLocaleResolutionSidecarEntry[];
  id: string;
  privacy: {
    allowRawLocator: false;
    allowResourceBody: false;
    allowResolvedText: false;
  };
}

/**
 * JSON Schema for the canonical DLR payload. Cross-resource policy remains in the validator.
 *
 * 中文：canonical DLR payload 的 JSON Schema；跨资源 policy 仍由 validator 执行。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_LOCALE_RESOURCE_SCHEMA_ID,
  type: "object",
  required: ["kind", "contractVersion", "format", "formatVersion", "resourceId", "defaultLocale", "locales", "entries"],
  additionalProperties: true,
  properties: {
    $schema: { type: "string" },
    kind: { const: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT },
    contractVersion: { const: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION },
    format: { const: DOCUMENTATION_LOCALE_RESOURCE_FORMAT },
    formatVersion: { const: DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION },
    resourceId: { pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$", type: "string" },
    defaultLocale: { minLength: 1, type: "string" },
    locales: { type: "array", minItems: 1, items: { minLength: 1, type: "string" } },
    entries: {
      type: "object",
      additionalProperties: { $ref: "#/$defs/entry" }
    }
  },
  $defs: {
    entry: {
      type: "object",
      required: ["localizedText"],
      additionalProperties: true,
      properties: {
        localizedText: { type: "object", additionalProperties: { type: "string" } }
      }
    }
  }
} as const;

/**
 * JSON Schema for the metadata-only DLR resolution sidecar.
 *
 * 中文：metadata-only DLR resolution sidecar 的 JSON Schema。
 */
export const DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_LOCALE_RESOLUTION_SCHEMA_ID,
  type: "object",
  required: ["contract", "contractVersion", "id", "privacy", "entries"],
  additionalProperties: false,
  properties: {
    contract: { const: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT },
    contractVersion: { const: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION },
    id: { minLength: 1, type: "string" },
    privacy: {
      type: "object",
      required: ["allowRawLocator", "allowResourceBody", "allowResolvedText"],
      additionalProperties: false,
      properties: {
        allowRawLocator: { const: false },
        allowResourceBody: { const: false },
        allowResolvedText: { const: false }
      }
    },
    entries: { type: "array", items: { $ref: "#/$defs/entry" } }
  },
  $defs: {
    provenance: {
      type: "object",
      required: ["kind", "coverage"],
      additionalProperties: false,
      properties: {
        kind: { enum: [...DOCUMENTATION_LOCALE_RESOURCE_PROVENANCE_KINDS] },
        coverage: { enum: ["complete", "missing"] },
        resourceId: { type: "string" },
        entryKey: { type: "string" },
        sourceLocale: { type: "string" }
      }
    },
    entry: {
      type: "object",
      required: [
        "documentId",
        "fieldPath",
        "requestedLocale",
        "resolvedLocale",
        "resolutionKind",
        "confidence",
        "provenance",
        "diagnosticCodes"
      ],
      additionalProperties: false,
      properties: {
        documentId: { minLength: 1, type: "string" },
        symbolId: { minLength: 1, type: "string" },
        fieldPath: { minLength: 1, type: "string" },
        resourceId: { type: "string" },
        entryKey: { type: "string" },
        requestedLocale: { minLength: 1, type: "string" },
        resolvedLocale: { type: "string" },
        resolutionKind: { enum: [...DOCUMENTATION_LOCALE_RESOURCE_RESOLUTION_KINDS] },
        confidence: { enum: [...DOCUMENTATION_LOCALE_RESOURCE_CONFIDENCE_LEVELS] },
        provenance: { $ref: "#/$defs/provenance" },
        diagnosticCodes: { type: "array", items: { minLength: 1, type: "string" } }
      }
    }
  }
} as const;

/**
 * Canonicalize one BCP 47 input without consulting a host, registry or network service.
 *
 * 中文：在不查询 host、registry 或 network 的前提下 canonicalize 一个 BCP 47 输入。
 *
 * @param locale - English: Candidate locale tag. 中文：候选 locale tag。
 * @returns English: Canonical tag and legacy-underscore signal, or undefined when invalid. 中文：canonical tag 与 legacy-underscore 信号；非法时为 undefined。
 */
export function canonicalizeDocumentationLocale(locale: string): { canonical: string; usedLegacyUnderscore: boolean } | undefined {
  const trimmed = locale.trim();
  const usedLegacyUnderscore = trimmed.includes("_");
  const candidate = usedLegacyUnderscore ? trimmed.replaceAll("_", "-") : trimmed;

  // <lang zh-CN>Use the platform BCP 47 canonicalizer only; it has no locale guessing or IANA network dependency.</lang>
  try {
    const [canonical] = Intl.getCanonicalLocales(candidate);
    return canonical ? { canonical, usedLegacyUnderscore } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build the frozen fallback order: requested, parents, explicit fallbacks, then default.
 *
 * 中文：构造冻结的 fallback 顺序：requested、父级、显式 fallback、最后 default。
 *
 * @param requestedLocale - English: Requested BCP 47 locale. 中文：请求的 BCP 47 locale。
 * @param defaultLocale - English: Explicit source default locale. 中文：显式 source default locale。
 * @param fallbackLocales - English: Profile-declared fallback locales. 中文：profile 声明的 fallback locales。
 * @returns English: De-duplicated canonical fallback chain. 中文：去重后的 canonical fallback 链。
 */
export function buildDocumentationLocaleFallbackChain(
  requestedLocale: string,
  defaultLocale: string,
  fallbackLocales: readonly string[] = []
): string[] {
  const chain: string[] = [];
  const requested = canonicalizeDocumentationLocale(requestedLocale)?.canonical;
  const canonicalDefault = canonicalizeDocumentationLocale(defaultLocale)?.canonical;

  // <lang zh-CN>父级只由标签截断得出，不进行 likely-subtag 扩张或 host locale 推断。</lang>
  if (requested) {
    const parts = requested.split("-");
    for (let length = parts.length; length >= 1; length -= 1) {
      pushUniqueLocale(chain, parts.slice(0, length).join("-"));
    }
  }

  // <lang zh-CN>显式 fallback 保持 profile 原顺序，只做 canonicalization 与去重。</lang>
  for (const fallbackLocale of fallbackLocales) {
    const canonical = canonicalizeDocumentationLocale(fallbackLocale)?.canonical;
    if (canonical) {
      pushUniqueLocale(chain, canonical);
    }
  }
  if (canonicalDefault) {
    pushUniqueLocale(chain, canonicalDefault);
  }
  return chain;
}

/**
 * Validate a stable resource id without tying it to a physical location.
 *
 * 中文：校验稳定 resource id，不把它绑定到物理位置。
 */
export function isDocumentationLocaleResourceId(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(value);
}

/**
 * Validate a strict project-relative POSIX DLR locator before any filesystem operation.
 *
 * 中文：在任何 filesystem operation 前校验严格的 project-relative POSIX DLR locator。
 *
 * @param locator - English: Untrusted source locator. 中文：不可信 source locator。
 * @returns English: Privacy-safe diagnostics only. 中文：仅返回不泄漏 locator 的 diagnostics。
 */
export function validateDocumentationLocaleResourceLocator(locator: unknown): HiaDiagnostic[] {
  if (typeof locator !== "string" || locator.length === 0 || /[\u0000-\u001F\u007F]/.test(locator)) {
    return [createDlrDiagnostic("DLR_LOCATOR_INVALID", "DLR locator must be a non-empty printable project-relative POSIX path.")];
  }
  if (/^(?:\\\\|\/\/)/.test(locator)) {
    return [createDlrDiagnostic("DLR_LOCATOR_UNC", "DLR locator must not use a UNC path.")];
  }
  if (/^(?:[A-Za-z]:|\/|\\)/.test(locator)) {
    return [createDlrDiagnostic("DLR_LOCATOR_ABSOLUTE", "DLR locator must not be absolute or drive rooted.")];
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(locator) || /[?#]/.test(locator)) {
    return [createDlrDiagnostic("DLR_LOCATOR_INVALID", "DLR locator must not be a URI, query, or fragment.")];
  }
  if (locator.includes("\\") || locator.split("/").some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    return [createDlrDiagnostic("DLR_LOCATOR_TRAVERSAL", "DLR locator must use normalized POSIX segments without traversal.")];
  }
  if (!locator.endsWith(".dlr")) {
    return [createDlrDiagnostic("DLR_FORMAT_UNSUPPORTED", "DLR locator must select a canonical .dlr resource.")];
  }
  return [];
}

/**
 * Validate a neutral reference before a profile attempts catalog or file resolution.
 *
 * 中文：在 profile 尝试 catalog 或 file resolution 前校验中性 reference。
 */
export function validateDocumentationLocaleResourceReference(reference: unknown): HiaDiagnostic[] {
  if (!isRecord(reference)) {
    return [createDlrDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR reference must be an object.")];
  }
  const diagnostics: HiaDiagnostic[] = [];
  const entryKey = reference.entryKey;
  const resource = reference.resource;
  const src = reference.src;

  // <lang zh-CN>entry key 是 identity 的必要一半；path 不参与该语义。</lang>
  if (typeof entryKey !== "string" || !isDocumentationLocaleEntryKey(entryKey)) {
    diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "DLR reference requires a valid entryKey."));
  }
  if (typeof resource === "string" && !isDocumentationLocaleResourceId(resource)) {
    diagnostics.push(createDlrDiagnostic("DLR_RESOURCE_ID_INVALID", "DLR reference resource must be a stable resourceId."));
  }
  if (typeof src === "string") {
    diagnostics.push(...validateDocumentationLocaleResourceLocator(src));
  }
  if (typeof resource === "string" && typeof src === "string") {
    diagnostics.push(createDlrDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR reference must not declare resource and src together."));
  }
  if (resource !== undefined && typeof resource !== "string") {
    diagnostics.push(createDlrDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR reference resource must be a string when present."));
  }
  if (src !== undefined && typeof src !== "string") {
    diagnostics.push(createDlrDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR reference src must be a string when present."));
  }
  return diagnostics;
}

/**
 * Parse canonical UTF-8 JSON text and return normalized, validated DLR data.
 *
 * 中文：解析 canonical UTF-8 JSON 文本，并返回 normalized、validated 的 DLR 数据。
 *
 * @param text - English: Already-decoded UTF-8 JSON text. 中文：已解码的 UTF-8 JSON 文本。
 * @returns English: Normalized resource when valid and privacy-safe diagnostics. 中文：合法时返回 normalized resource，并附 privacy-safe diagnostics。
 */
export function parseDocumentationLocaleResource(text: string): { diagnostics: HiaDiagnostic[]; resource?: DocumentationLocaleResource } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { diagnostics: [createDlrDiagnostic("DLR_FORMAT_UNSUPPORTED", "DLR content must be valid JSON text.")] };
  }

  // <lang zh-CN>JSON.parse 会覆盖重复 key；在已知 entries object 范围内先保留该可审计错误。</lang>
  const duplicateKeys = findDuplicateDlrEntryKeys(text);
  const result = normalizeDocumentationLocaleResource(parsed);
  const diagnostics = [...duplicateKeys.map(() => createDlrDiagnostic("DLR_ENTRY_DUPLICATE", "DLR entries must not repeat an entry key.")), ...result.diagnostics];
  return result.resource && !diagnostics.some((diagnostic) => diagnostic.severity === "error")
    ? { diagnostics, resource: result.resource }
    : { diagnostics };
}

/**
 * Validate an object-shaped DLR payload and normalize locale tags for runtime use.
 *
 * 中文：校验 object 形式的 DLR payload，并为 runtime 使用 normalize locale tag。
 */
export function validateDocumentationLocaleResource(value: unknown): HiaDiagnostic[] {
  return normalizeDocumentationLocaleResource(value).diagnostics;
}

/**
 * Resolve one entry with frozen source priority and locale fallback semantics.
 *
 * 中文：按照冻结的 source priority 与 locale fallback 语义解析一个 entry。
 *
 * @param reference - English: Entry and resource selector. 中文：entry 与 resource selector。
 * @param options - English: Already-loaded source tiers. 中文：已读取的 source tiers。
 * @returns English: Text is runtime-only; provenance and diagnostics are serializable. 中文：text 仅 runtime 使用；provenance 与 diagnostics 可序列化。
 */
export function resolveDocumentationLocaleResource(
  reference: DocumentationLocaleResourceReference,
  options: DocumentationLocaleResourceResolutionOptions
): DocumentationLocaleResourceResolution {
  const diagnostics = validateDocumentationLocaleResourceReference(reference);
  const requested = canonicalizeDocumentationLocale(options.requestedLocale);
  if (!requested) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "Requested locale must be a valid BCP 47 tag."));
    return createMissingResolution(options.requestedLocale, [], diagnostics, reference.entryKey);
  }
  if (requested.usedLegacyUnderscore) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "Legacy underscore locale input was canonicalized; canonical storage uses hyphens.", "warning", { locale: requested.canonical }));
  }

  // <lang zh-CN>完整 inline requested locale 的优先级最高；它不会覆盖其它 locale 的 DLR fallback。</lang>
  const inlineText = findLocalizedText(options.inlineLocalizedText, requested.canonical);
  if (inlineText !== undefined) {
    return {
      confidence: "high",
      diagnostics,
      fallbackChain: [requested.canonical],
      provenance: { coverage: "complete", kind: "inline-locale", sourceLocale: requested.canonical },
      requestedLocale: requested.canonical,
      resolvedLocale: requested.canonical,
      resolutionKind: "direct",
      text: inlineText
    };
  }

  // <lang zh-CN>一旦较高 resource tier 被选择但不可解析，禁止静默降级到另一个 resource tier 或 default text。</lang>
  if (options.directResourceSelectionFailed || options.documentDefaultResourceSelectionFailed || options.catalogDefaultResourceSelectionFailed) {
    diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "A selected DLR resource could not produce a deterministic entry resolution."));
    return createMissingResolution(requested.canonical, [requested.canonical], diagnostics, reference.entryKey);
  }
  const source = firstResolutionSource(options);
  if (source) {
    return resolveFromResource(source, reference.entryKey, requested.canonical, options.fallbackLocales ?? [], diagnostics);
  }

  const sourceDefaultLocale = canonicalizeDocumentationLocale(options.sourceDefaultLocale ?? requested.canonical)?.canonical ?? requested.canonical;
  const fallbackChain = buildDocumentationLocaleFallbackChain(requested.canonical, sourceDefaultLocale, options.fallbackLocales);
  if (typeof options.defaultText === "string" && options.defaultText.length > 0) {
    const usedFallback = sourceDefaultLocale !== requested.canonical;
    if (usedFallback) {
      diagnostics.push(createDlrDiagnostic("DLR_FALLBACK_USED", "DLR resolution used source-document default text.", "warning", { locale: sourceDefaultLocale }));
    }
    return {
      confidence: "high",
      diagnostics,
      fallbackChain,
      provenance: { coverage: "complete", kind: "source-default-text", sourceLocale: sourceDefaultLocale },
      requestedLocale: requested.canonical,
      resolvedLocale: sourceDefaultLocale,
      resolutionKind: "default-fallback",
      text: options.defaultText
    };
  }
  return createMissingResolution(requested.canonical, fallbackChain, diagnostics, reference.entryKey);
}

/**
 * Convert a runtime resolution into a metadata-only sidecar entry.
 *
 * 中文：将 runtime resolution 转换为 metadata-only sidecar entry。
 */
export function createDocumentationLocaleResolutionSidecar(
  id: string,
  entries: Array<Omit<DocumentationLocaleResolutionSidecarEntry, "confidence" | "diagnosticCodes" | "provenance" | "requestedLocale" | "resolvedLocale" | "resolutionKind"> & { resolution: DocumentationLocaleResourceResolution }>
): DocumentationLocaleResolutionSidecar {
  return {
    contract: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT,
    contractVersion: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION,
    entries: entries.map(({ resolution, ...entry }) => ({
      ...entry,
      confidence: resolution.confidence,
      diagnosticCodes: resolution.diagnostics.map((diagnostic) => diagnostic.code),
      provenance: resolution.provenance,
      requestedLocale: resolution.requestedLocale,
      resolvedLocale: resolution.resolvedLocale,
      resolutionKind: resolution.resolutionKind
    })),
    id,
    privacy: {
      allowRawLocator: false,
      allowResourceBody: false,
      allowResolvedText: false
    }
  };
}

/**
 * Validate sidecar structure and ensure private DLR data did not cross the linkage boundary.
 *
 * 中文：校验 sidecar 结构，并确保 private DLR data 没有越过 linkage 边界。
 */
export function validateDocumentationLocaleResolutionSidecar(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    return [createDlrDiagnostic("DLR_PRIVACY_VIOLATION", "Locale-resolution sidecar must be an object.")];
  }
  if (value.contract !== DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT || value.contractVersion !== DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION) {
    diagnostics.push(createDlrDiagnostic("DLR_VERSION_UNSUPPORTED", "Locale-resolution sidecar contract or version is unsupported."));
  }
  if (!isNonEmptyString(value.id) || !Array.isArray(value.entries)) {
    diagnostics.push(createDlrDiagnostic("DLR_PRIVACY_VIOLATION", "Locale-resolution sidecar requires an id and entries array."));
  }
  if (!isRecord(value.privacy) || value.privacy.allowRawLocator !== false || value.privacy.allowResourceBody !== false || value.privacy.allowResolvedText !== false) {
    diagnostics.push(createDlrDiagnostic("DLR_PRIVACY_VIOLATION", "Locale-resolution sidecar privacy flags must all be false."));
  }

  // <lang zh-CN>递归检查禁止字段，确保 future 扩展也不能把 locator/body/text 偷渡到 sidecar。</lang>
  if (containsPrivateSidecarData(value)) {
    diagnostics.push(createDlrDiagnostic("DLR_PRIVACY_VIOLATION", "Locale-resolution sidecar must not contain raw locator, resource body, or resolved text."));
  }
  return diagnostics;
}

function normalizeDocumentationLocaleResource(value: unknown): { diagnostics: HiaDiagnostic[]; resource?: DocumentationLocaleResource } {
  if (!isRecord(value)) {
    return { diagnostics: [createDlrDiagnostic("DLR_FORMAT_UNSUPPORTED", "DLR payload must be an object.")] };
  }
  const diagnostics: HiaDiagnostic[] = [];
  if (value.kind !== DOCUMENTATION_LOCALE_RESOURCE_CONTRACT || value.format !== DOCUMENTATION_LOCALE_RESOURCE_FORMAT) {
    diagnostics.push(createDlrDiagnostic("DLR_FORMAT_UNSUPPORTED", "DLR kind or format is unsupported."));
  }
  if (value.contractVersion !== DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION || value.formatVersion !== DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION) {
    diagnostics.push(createDlrDiagnostic("DLR_VERSION_UNSUPPORTED", "DLR contractVersion or formatVersion is unsupported."));
  }
  if (!isNonEmptyString(value.resourceId) || !isDocumentationLocaleResourceId(value.resourceId)) {
    diagnostics.push(createDlrDiagnostic("DLR_RESOURCE_ID_INVALID", "DLR resourceId must use stable lowercase ASCII segments."));
  }
  const defaultLocale = normalizeLocale(value.defaultLocale, diagnostics, "defaultLocale");
  const locales = normalizeLocales(value.locales, diagnostics);
  if (defaultLocale && !locales.includes(defaultLocale)) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_MISSING", "DLR defaultLocale must be declared in locales.", "error", { locale: defaultLocale }));
  }
  const entries = normalizeEntries(value.entries, defaultLocale, locales, diagnostics);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error") || !defaultLocale || !isNonEmptyString(value.resourceId)) {
    return { diagnostics };
  }
  const resource: DocumentationLocaleResource = {
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
    defaultLocale,
    entries,
    format: DOCUMENTATION_LOCALE_RESOURCE_FORMAT,
    formatVersion: DOCUMENTATION_LOCALE_RESOURCE_FORMAT_VERSION,
    kind: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
    locales,
    resourceId: value.resourceId
  };
  if (typeof value.$schema === "string") {
    resource.$schema = value.$schema;
  }
  return { diagnostics, resource };
}

function normalizeLocales(value: unknown, diagnostics: HiaDiagnostic[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_MISSING", "DLR locales must be a non-empty array."));
    return [];
  }
  const output: string[] = [];
  for (const [index, locale] of value.entries()) {
    const normalized = normalizeLocale(locale, diagnostics, `locales.${index}`);
    if (!normalized) {
      continue;
    }
    if (output.includes(normalized)) {
      diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "DLR locales must not repeat a canonical locale.", "error", { locale: normalized }));
      continue;
    }
    output.push(normalized);
  }
  return output;
}

function normalizeEntries(
  value: unknown,
  defaultLocale: string | undefined,
  declaredLocales: readonly string[],
  diagnostics: HiaDiagnostic[]
): Record<string, DocumentationLocaleResourceEntry> {
  if (!isRecord(value)) {
    diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "DLR entries must be an object."));
    return {};
  }
  const entries: Record<string, DocumentationLocaleResourceEntry> = {};
  for (const [entryKey, candidate] of Object.entries(value)) {
    if (!isDocumentationLocaleEntryKey(entryKey)) {
      diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "DLR entry key is invalid.", "error", { entryKey }));
      continue;
    }
    if (!isRecord(candidate) || !isRecord(candidate.localizedText)) {
      diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "DLR entry requires localizedText.", "error", { entryKey }));
      continue;
    }
    const localizedText: Record<string, string> = {};
    for (const [locale, text] of Object.entries(candidate.localizedText)) {
      const canonicalLocale = normalizeLocale(locale, diagnostics, `entries.${entryKey}.localizedText`);
      if (!canonicalLocale || typeof text !== "string") {
        if (typeof text !== "string") {
          diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "DLR localized text must be a string.", "error", { entryKey }));
        }
        continue;
      }
      if (!declaredLocales.includes(canonicalLocale)) {
        diagnostics.push(createDlrDiagnostic("DLR_LOCALE_MISSING", "DLR entry locale must be declared by the resource.", "error", { entryKey, locale: canonicalLocale }));
        continue;
      }
      if (Object.hasOwn(localizedText, canonicalLocale)) {
        diagnostics.push(createDlrDiagnostic("DLR_ENTRY_DUPLICATE", "DLR entry contains duplicate canonical locale text.", "error", { entryKey, locale: canonicalLocale }));
        continue;
      }
      localizedText[canonicalLocale] = text;
    }
    if (defaultLocale && localizedText[defaultLocale] === undefined) {
      diagnostics.push(createDlrDiagnostic("DLR_LOCALE_MISSING", "DLR entry must provide text for its resource defaultLocale.", "error", { entryKey, locale: defaultLocale }));
    }
    entries[entryKey] = { localizedText };
  }
  return entries;
}

function normalizeLocale(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): string | undefined {
  if (typeof value !== "string") {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "DLR locale must be a BCP 47 string.", "error", { targetPath }));
    return undefined;
  }
  const normalized = canonicalizeDocumentationLocale(value);
  if (!normalized) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "DLR locale must be a valid BCP 47 tag.", "error", { targetPath }));
    return undefined;
  }
  if (normalized.usedLegacyUnderscore) {
    diagnostics.push(createDlrDiagnostic("DLR_LOCALE_INVALID", "Legacy underscore locale input was canonicalized; canonical storage uses hyphens.", "warning", { locale: normalized.canonical, targetPath }));
  }
  return normalized.canonical;
}

function firstResolutionSource(options: DocumentationLocaleResourceResolutionOptions): DocumentationLocaleResourceResolutionSource | undefined {
  if (options.directResource) {
    return { resource: options.directResource, role: "direct-resource" };
  }
  if (options.documentDefaultResource) {
    return { resource: options.documentDefaultResource, role: "document-default-resource" };
  }
  if (options.catalogDefaultResource) {
    return { resource: options.catalogDefaultResource, role: "catalog-default-resource" };
  }
  return undefined;
}

function resolveFromResource(
  source: DocumentationLocaleResourceResolutionSource,
  entryKey: string,
  requestedLocale: string,
  fallbackLocales: readonly string[],
  diagnostics: HiaDiagnostic[]
): DocumentationLocaleResourceResolution {
  const resourceDiagnostics = validateDocumentationLocaleResource(source.resource);
  diagnostics.push(...resourceDiagnostics);
  const fallbackChain = buildDocumentationLocaleFallbackChain(requestedLocale, source.resource.defaultLocale, fallbackLocales);
  const entry = source.resource.entries[entryKey];
  if (!entry || resourceDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    if (!entry) {
      diagnostics.push(createDlrDiagnostic("DLR_ENTRY_MISSING", "Selected DLR resource does not contain the requested entry.", "error", { entryKey, resourceId: source.resource.resourceId }));
    }
    return createMissingResolution(requestedLocale, fallbackChain, diagnostics, entryKey, source.resource.resourceId);
  }
  for (const [index, locale] of fallbackChain.entries()) {
    const text = entry.localizedText[locale];
    if (text === undefined) {
      continue;
    }
    const resolutionKind = classifyResolutionKind(index, locale, requestedLocale, source.resource.defaultLocale, fallbackLocales);
    if (resolutionKind !== "direct") {
      diagnostics.push(createDlrDiagnostic("DLR_FALLBACK_USED", "DLR resolution used a deterministic fallback locale.", "warning", { entryKey, locale, resourceId: source.resource.resourceId }));
    }
    return {
      confidence: "high",
      diagnostics,
      fallbackChain,
      provenance: {
        coverage: "complete",
        entryKey,
        kind: "dlr-entry",
        resourceId: source.resource.resourceId,
        sourceLocale: locale
      },
      requestedLocale,
      resolvedLocale: locale,
      resolutionKind,
      text
    };
  }
  diagnostics.push(createDlrDiagnostic("DLR_LOCALE_MISSING", "Selected DLR entry has no text for the deterministic fallback chain.", "error", { entryKey, resourceId: source.resource.resourceId }));
  return createMissingResolution(requestedLocale, fallbackChain, diagnostics, entryKey, source.resource.resourceId);
}

function createMissingResolution(
  requestedLocale: string,
  fallbackChain: string[],
  diagnostics: HiaDiagnostic[],
  entryKey?: string,
  resourceId?: string
): DocumentationLocaleResourceResolution {
  const provenance: DocumentationLocaleResourceProvenance = {
    coverage: "missing",
    kind: "unresolved"
  };
  if (entryKey) {
    provenance.entryKey = entryKey;
  }
  if (resourceId) {
    provenance.resourceId = resourceId;
  }
  return {
    confidence: "none",
    diagnostics,
    fallbackChain,
    provenance,
    requestedLocale,
    resolvedLocale: "",
    resolutionKind: "missing",
    text: ""
  };
}

function classifyResolutionKind(
  index: number,
  locale: string,
  requestedLocale: string,
  defaultLocale: string,
  fallbackLocales: readonly string[]
): DocumentationLocaleResourceResolution["resolutionKind"] {
  if (locale === requestedLocale) {
    return "direct";
  }
  const canonicalDefault = canonicalizeDocumentationLocale(defaultLocale)?.canonical;
  if (locale === canonicalDefault) {
    return "default-fallback";
  }
  const explicitFallbacks = fallbackLocales
    .map((candidate) => canonicalizeDocumentationLocale(candidate)?.canonical)
    .filter((candidate): candidate is string => Boolean(candidate));
  if (explicitFallbacks.includes(locale)) {
    return "configured-fallback";
  }
  return index > 0 ? "parent-fallback" : "missing";
}

function findLocalizedText(values: Record<string, string> | undefined, requestedLocale: string): string | undefined {
  if (!values) {
    return undefined;
  }
  for (const [locale, text] of Object.entries(values)) {
    if (canonicalizeDocumentationLocale(locale)?.canonical === requestedLocale && typeof text === "string") {
      return text;
    }
  }
  return undefined;
}

function findDuplicateDlrEntryKeys(text: string): string[] {
  const entriesStart = findJsonObjectPropertyValueStart(text, "entries");
  if (entriesStart === undefined || text[entriesStart] !== "{") {
    return [];
  }
  const keys = readJsonObjectKeys(text, entriesStart);
  const seen = new Set<string>();
  return keys.filter((key) => {
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
    return false;
  });
}

function findJsonObjectPropertyValueStart(text: string, expectedKey: string): number | undefined {
  if (skipJsonWhitespace(text, 0) >= text.length || text[skipJsonWhitespace(text, 0)] !== "{") {
    return undefined;
  }
  let cursor = skipJsonWhitespace(text, 1);
  while (cursor < text.length && text[cursor] !== "}") {
    const key = readJsonString(text, cursor);
    if (!key) {
      return undefined;
    }
    cursor = skipJsonWhitespace(text, key.end);
    if (text[cursor] !== ":") {
      return undefined;
    }
    const valueStart = skipJsonWhitespace(text, cursor + 1);
    if (key.value === expectedKey) {
      return valueStart;
    }
    cursor = skipJsonWhitespace(text, skipJsonValue(text, valueStart));
    if (text[cursor] === ",") {
      cursor = skipJsonWhitespace(text, cursor + 1);
    }
  }
  return undefined;
}

function readJsonObjectKeys(text: string, objectStart: number): string[] {
  const keys: string[] = [];
  let cursor = skipJsonWhitespace(text, objectStart + 1);
  while (cursor < text.length && text[cursor] !== "}") {
    const key = readJsonString(text, cursor);
    if (!key) {
      return keys;
    }
    keys.push(key.value);
    cursor = skipJsonWhitespace(text, key.end);
    if (text[cursor] !== ":") {
      return keys;
    }
    cursor = skipJsonWhitespace(text, skipJsonValue(text, skipJsonWhitespace(text, cursor + 1)));
    if (text[cursor] === ",") {
      cursor = skipJsonWhitespace(text, cursor + 1);
    }
  }
  return keys;
}

function readJsonString(text: string, start: number): { end: number; value: string } | undefined {
  if (text[start] !== "\"") {
    return undefined;
  }
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (text[cursor] === "\"") {
      try {
        return { end: cursor + 1, value: JSON.parse(text.slice(start, cursor + 1)) as string };
      } catch {
        return undefined;
      }
    }
    cursor += 1;
  }
  return undefined;
}

function skipJsonValue(text: string, start: number): number {
  const first = text[start];
  if (first === "\"") {
    return readJsonString(text, start)?.end ?? text.length;
  }
  if (first !== "{" && first !== "[") {
    let cursor = start;
    while (cursor < text.length && !",}]".includes(text[cursor] ?? "")) {
      cursor += 1;
    }
    return cursor;
  }
  const closing = first === "{" ? "}" : "]";
  let depth = 1;
  let cursor = start + 1;
  while (cursor < text.length && depth > 0) {
    if (text[cursor] === "\"") {
      cursor = readJsonString(text, cursor)?.end ?? text.length;
      continue;
    }
    if (text[cursor] === first) {
      depth += 1;
    } else if (text[cursor] === closing) {
      depth -= 1;
    }
    cursor += 1;
  }
  return cursor;
}

function skipJsonWhitespace(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length && /\s/.test(text[cursor] ?? "")) {
    cursor += 1;
  }
  return cursor;
}

function containsPrivateSidecarData(value: unknown, propertyName = ""): boolean {
  const forbiddenPropertyNames = new Set(["absolutepath", "body", "content", "locator", "rawlocator", "resolvedtext", "src", "text"]);
  if (forbiddenPropertyNames.has(propertyName.toLowerCase())) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsPrivateSidecarData(item));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => containsPrivateSidecarData(nested, key));
}

function createDlrDiagnostic(
  code: typeof DOCUMENTATION_LOCALE_RESOURCE_DIAGNOSTIC_CODE_REGISTRY[number]["code"],
  message: string,
  severity: HiaDiagnosticSeverity = diagnosticSeverityFor(code),
  data: Record<string, unknown> = {}
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, Object.keys(data).length > 0 ? { data } : {});
}

function diagnosticSeverityFor(code: typeof DOCUMENTATION_LOCALE_RESOURCE_DIAGNOSTIC_CODE_REGISTRY[number]["code"]): HiaDiagnosticSeverity {
  return DOCUMENTATION_LOCALE_RESOURCE_DIAGNOSTIC_CODE_REGISTRY.find((definition) => definition.code === code)?.defaultSeverity ?? "error";
}

function isDocumentationLocaleEntryKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushUniqueLocale(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
