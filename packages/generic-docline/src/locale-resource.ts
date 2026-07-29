import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import {
  createHiaDiagnostic,
  parseDocumentationLocaleResource,
  resolveDocumentationLocaleResource,
  validateDocumentationLocaleResourceLocator,
  validateDocumentationLocaleResourceReference,
  type DocumentationLocaleResource,
  type DocumentationLocaleResourceReference,
  type DocumentationLocaleResourceResolution,
  type HiaDiagnostic,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";

/**
 * At-tag source profile for DLR reference extraction.
 *
 * 中文：用于 DLR reference extraction 的 at-tag source profile。
 */
export const DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE = "documentation-at-tag-locale-resource-profile" as const;

/**
 * XML-safe source profile for DLR reference extraction.
 *
 * 中文：用于 DLR reference extraction 的 XML-safe source profile。
 */
export const DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE = "documentation-xml-locale-resource-profile" as const;

/**
 * Shared Draft version for both P1 doc-line DLR profiles.
 *
 * 中文：两个 P1 doc-line DLR profile 共用的草案版本。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_PROFILE_VERSION = "0.1.0-draft" as const;

/**
 * Explicit limits for a local, read-only DLR operation.
 *
 * 中文：local、read-only DLR operation 的显式限制。
 */
export interface DocumentationLocaleResourceReadLimits {
  maxBytes: number;
  maxEntries: number;
  maxEntryTextBytes: number;
  maxJsonDepth: number;
  maxLocales: number;
  parseTimeMs: number;
}

/**
 * Safe defaults selected for P1 fixtures; callers may only tighten them in CI profiles.
 *
 * 中文：P1 fixture 选定的安全默认值；CI profile 只能进一步收紧。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DEFAULT_LIMITS: Readonly<DocumentationLocaleResourceReadLimits> = {
  maxBytes: 1_048_576,
  maxEntries: 10_000,
  maxEntryTextBytes: 65_536,
  maxJsonDepth: 32,
  maxLocales: 128,
  parseTimeMs: 250
};

/**
 * One source range from which a profile extracted a literal DLR directive or field reference.
 *
 * 中文：profile 从中提取 literal DLR directive 或 field reference 的一个 source range。
 */
export interface DocumentationLocaleResourceProfileRange {
  end: { column: number; line: number };
  start: { column: number; line: number };
}

/**
 * Document-level resource selector. It contains no entry key by design.
 *
 * 中文：document-level resource selector；按设计不包含 entry key。
 */
export interface DocumentationLocaleResourceDocumentDefault {
  range: DocumentationLocaleResourceProfileRange;
  resource?: string;
  src?: string;
}

/**
 * Field reference extracted from a source profile. `fieldPath` remains logical, never a locator.
 *
 * 中文：从 source profile 提取的 field reference；`fieldPath` 始终是逻辑路径，绝非 locator。
 */
export interface DocumentationLocaleResourceProfileReference {
  fieldPath?: string;
  range: DocumentationLocaleResourceProfileRange;
  reference: DocumentationLocaleResourceReference;
}

/**
 * Result of parsing only the frozen literal surface grammar for one profile.
 *
 * 中文：只解析一个 profile 已冻结 literal surface grammar 的结果。
 */
export interface DocumentationLocaleResourceProfileExtraction {
  diagnostics: HiaDiagnostic[];
  documentDefault?: DocumentationLocaleResourceDocumentDefault;
  fieldReferences: DocumentationLocaleResourceProfileReference[];
  profile: typeof DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE | typeof DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE;
  profileVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_PROFILE_VERSION;
}

/**
 * Input for local DLR reading; `resourceRoot` must be explicitly absolute.
 *
 * 中文：local DLR reading 的输入；`resourceRoot` 必须显式为 absolute。
 */
export interface ReadDocumentationLocaleResourceOptions {
  limits?: Partial<DocumentationLocaleResourceReadLimits>;
  locator: string;
  resourceRoot: string;
}

/**
 * Output of a safe local DLR read. Filesystem paths are deliberately never returned.
 *
 * 中文：safe local DLR read 的输出；刻意绝不返回 filesystem path。
 */
export interface ReadDocumentationLocaleResourceResult {
  diagnostics: HiaDiagnostic[];
  resource?: DocumentationLocaleResource;
}

/**
 * Complete local profile integration input; all resource references stay read-only.
 *
 * 中文：完整的 local profile integration 输入；所有 resource reference 都保持 read-only。
 */
export interface ResolveDocumentationLocaleResourceProfileOptions {
  catalog?: Record<string, string>;
  /** 中文：profile 明确配置的 catalog default resourceId。English: Explicit profile catalog default resourceId. */
  catalogDefaultResource?: string;
  defaultTextByFieldPath?: Record<string, string>;
  fallbackLocales?: string[];
  profile: DocumentationLocaleResourceProfileExtraction["profile"];
  requestedLocale: string;
  resourceRoot: string;
  sourceDefaultLocale?: string;
  sourceText: string;
}

/**
 * One field-level resolution obtained through a read-only source profile integration.
 *
 * 中文：通过 read-only source profile integration 获得的一个 field-level resolution。
 */
export interface DocumentationLocaleResourceProfileResolution {
  fieldPath?: string;
  range: DocumentationLocaleResourceProfileRange;
  resolution: DocumentationLocaleResourceResolution;
}

/**
 * Resolve all references extracted from one source text without writing to source or resources.
 *
 * 中文：在不写入 source 或 resources 的前提下解析一个 source text 提取出的全部 references。
 */
export interface ResolveDocumentationLocaleResourceProfileResult {
  diagnostics: HiaDiagnostic[];
  extraction: DocumentationLocaleResourceProfileExtraction;
  resolutions: DocumentationLocaleResourceProfileResolution[];
}

/**
 * Extract the at-tag P1 grammar: one `@langSrc` and self-closing literal `<lang key>` references.
 *
 * 中文：提取 at-tag P1 grammar：一个 `@langSrc` 及 self-closing literal `<lang key>` references。
 */
export function extractAtTagLocaleResourceReferences(sourceText: string): DocumentationLocaleResourceProfileExtraction {
  const extraction = createExtraction(DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE);
  const directivePattern = /^[ \t]*@langSrc[ \t]+([^\s]+)[ \t]*$/gm;

  // <lang zh-CN>文件级 directive 只能有一个；重复值会使 document default 不再确定。</lang>
  for (const match of sourceText.matchAll(directivePattern)) {
    const src = match[1] ?? "";
    if (extraction.documentDefault) {
      extraction.diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "At-tag profile permits only one @langSrc document default."));
      continue;
    }
    const locatorDiagnostics = validateDocumentationLocaleResourceLocator(src);
    extraction.diagnostics.push(...locatorDiagnostics);
    if (locatorDiagnostics.some(isError)) {
      continue;
    }
    extraction.documentDefault = { range: rangeForMatch(sourceText, match.index ?? 0, match[0].length), src };
  }
  extractLiteralLangReferences(sourceText, extraction);
  return extraction;
}

/**
 * Extract the XML-safe P1 grammar: `<langResource>` plus self-closing literal `<lang key>` references.
 *
 * 中文：提取 XML-safe P1 grammar：`<langResource>` 加 self-closing literal `<lang key>` references。
 */
export function extractXmlLocaleResourceReferences(sourceText: string): DocumentationLocaleResourceProfileExtraction {
  const extraction = createExtraction(DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE);
  const directivePattern = /<langResource\b([^>]*?)(\/?)>/g;

  // <lang zh-CN>仅允许空元素，避免 profile 在 P1 阶段接管 XML text-node grammar 或 AST。</lang>
  for (const match of sourceText.matchAll(directivePattern)) {
    const attributes = parseLiteralAttributes(match[1] ?? "");
    if (!attributes || match[2] !== "/") {
      extraction.diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "XML DLR document default must be a self-closing literal langResource element."));
      continue;
    }
    const selection = readResourceSelection(attributes, extraction.diagnostics);
    if (!selection || extraction.documentDefault) {
      if (extraction.documentDefault) {
        extraction.diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "XML profile permits only one langResource document default."));
      }
      continue;
    }
    extraction.documentDefault = { ...selection, range: rangeForMatch(sourceText, match.index ?? 0, match[0].length) };
  }
  extractLiteralLangReferences(sourceText, extraction);
  return extraction;
}

/**
 * Read one canonical `.dlr` file after lexical and realpath containment gates pass.
 *
 * 中文：在 lexical 与 realpath containment gate 通过后读取一个 canonical `.dlr` 文件。
 */
export async function readDocumentationLocaleResource(
  options: ReadDocumentationLocaleResourceOptions
): Promise<ReadDocumentationLocaleResourceResult> {
  const diagnostics = validateDocumentationLocaleResourceLocator(options.locator);
  if (diagnostics.some(isError)) {
    return { diagnostics };
  }
  if (!path.isAbsolute(options.resourceRoot)) {
    return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_RESOURCE_READ_FAILED", "DLR resourceRoot must be an explicit absolute path.")] };
  }
  const limits = { ...DOCUMENTATION_LOCALE_RESOURCE_DEFAULT_LIMITS, ...options.limits };
  const startedAt = Date.now();

  try {
    // <lang zh-CN>先 realpath root，再 realpath file；任何 junction/symlink escape 都在读取结果前被拒绝。</lang>
    const realRoot = await realpath(options.resourceRoot);
    const candidate = path.resolve(realRoot, ...options.locator.split("/"));
    if (!isPathInsideRoot(realRoot, candidate)) {
      return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_LOCATOR_TRAVERSAL", "DLR locator escapes its declared resource root.")] };
    }
    const realCandidate = await realpath(candidate);
    if (!isPathInsideRoot(realRoot, realCandidate)) {
      return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_LOCATOR_SYMLINK_ESCAPE", "DLR locator resolves outside its declared resource root.")] };
    }
    const bytes = await readFile(realCandidate);
    if (bytes.byteLength > limits.maxBytes) {
      return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_LIMIT_EXCEEDED", "DLR resource exceeds its maximum byte limit.")] };
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (measureJsonDepth(content) > limits.maxJsonDepth) {
      return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_LIMIT_EXCEEDED", "DLR resource exceeds its maximum JSON depth.")] };
    }
    const parsed = parseDocumentationLocaleResource(content);
    diagnostics.push(...parsed.diagnostics);
    if (!parsed.resource || diagnostics.some(isError)) {
      return { diagnostics };
    }
    diagnostics.push(...validateResourceLimits(parsed.resource, limits));
    if (Date.now() - startedAt > limits.parseTimeMs) {
      diagnostics.push(createProfileDiagnostic("DLR_LIMIT_EXCEEDED", "DLR resource exceeds its maximum parse-time limit."));
    }
    return diagnostics.some(isError) ? { diagnostics } : { diagnostics, resource: parsed.resource };
  } catch {
    // <lang zh-CN>read failure 不回显 host path、locator 或操作系统错误；避免把 private layout 写入 artifact。</lang>
    return { diagnostics: [...diagnostics, createProfileDiagnostic("DLR_RESOURCE_READ_FAILED", "DLR resource could not be read from its declared root.")] };
  }
}

/**
 * Execute the two P1 profile paths against the same safe reader and neutral resolver.
 *
 * 中文：用同一个 safe reader 和 neutral resolver 执行两个 P1 profile 路径。
 */
export async function resolveDocumentationLocaleResourceProfile(
  options: ResolveDocumentationLocaleResourceProfileOptions
): Promise<ResolveDocumentationLocaleResourceProfileResult> {
  const extraction = options.profile === DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE
    ? extractAtTagLocaleResourceReferences(options.sourceText)
    : extractXmlLocaleResourceReferences(options.sourceText);
  const diagnostics = [...extraction.diagnostics];
  const documentDefault = await loadDocumentDefault(extraction.documentDefault, options, diagnostics);
  const catalogDefault = options.catalogDefaultResource
    ? await loadSelection({ resource: options.catalogDefaultResource }, options, diagnostics)
    : undefined;
  // <lang zh-CN>document/catalog load failure 也必须进入每个受影响 field 的 resolution diagnostics，供 metadata-only sidecar 记录 code。</lang>
  const sharedLoadDiagnostics = diagnostics.slice(extraction.diagnostics.length);
  const resolutions: DocumentationLocaleResourceProfileResolution[] = [];

  // <lang zh-CN>每个 field 仅选取它自己的 direct tier 或 document default；没有 expression、merge 或 write。</lang>
  for (const fieldReference of extraction.fieldReferences) {
    const diagnosticsBeforeDirectRead = diagnostics.length;
    const directResource = await loadReferenceResource(fieldReference.reference, options, diagnostics);
    const directReadDiagnostics = diagnostics.slice(diagnosticsBeforeDirectRead);
    const resolverOptions: Parameters<typeof resolveDocumentationLocaleResource>[1] = {
      requestedLocale: options.requestedLocale
    };
    const defaultText = fieldReference.fieldPath ? options.defaultTextByFieldPath?.[fieldReference.fieldPath] : undefined;
    if (defaultText !== undefined) {
      resolverOptions.defaultText = defaultText;
    }
    if (directResource) {
      resolverOptions.directResource = directResource;
    }
    if ((fieldReference.reference.resource || fieldReference.reference.src) && !directResource) {
      resolverOptions.directResourceSelectionFailed = true;
    }
    if (documentDefault) {
      resolverOptions.documentDefaultResource = documentDefault;
    }
    if (extraction.documentDefault && !documentDefault) {
      resolverOptions.documentDefaultResourceSelectionFailed = true;
    }
    if (catalogDefault) {
      resolverOptions.catalogDefaultResource = catalogDefault;
    }
    if (options.catalogDefaultResource && !catalogDefault) {
      resolverOptions.catalogDefaultResourceSelectionFailed = true;
    }
    if (options.fallbackLocales) {
      resolverOptions.fallbackLocales = options.fallbackLocales;
    }
    if (options.sourceDefaultLocale) {
      resolverOptions.sourceDefaultLocale = options.sourceDefaultLocale;
    }
    const resolution = resolveDocumentationLocaleResource(fieldReference.reference, resolverOptions);
    resolution.diagnostics = dedupeDiagnostics([
      ...sharedLoadDiagnostics,
      ...directReadDiagnostics,
      ...resolution.diagnostics
    ]);
    resolutions.push({
      ...(fieldReference.fieldPath ? { fieldPath: fieldReference.fieldPath } : {}),
      range: fieldReference.range,
      resolution
    });
    diagnostics.push(...resolution.diagnostics);
  }
  return { diagnostics, extraction, resolutions };
}

/**
 * Classify an old `hia-i18n-json` descriptor without upgrading it to canonical DLR conformance.
 *
 * 中文：识别旧 `hia-i18n-json` descriptor，但绝不把它升级为 canonical DLR conformance。
 */
export function inspectLegacyHiaI18nJsonBridge(value: unknown): { diagnostics: HiaDiagnostic[]; provenance: "legacy-adapter-bridge" | "unsupported" } {
  if (isRecord(value) && value.format === "hia-i18n-json" && typeof value.path === "string") {
    return {
      diagnostics: [createProfileDiagnostic("DLR_LEGACY_BRIDGE", "Legacy hia-i18n-json input requires an explicit conversion before DLR use.", "warning", { format: "hia-i18n-json" })],
      provenance: "legacy-adapter-bridge"
    };
  }
  return {
    diagnostics: [createProfileDiagnostic("DLR_FORMAT_UNSUPPORTED", "Resource descriptor is not canonical DLR or the recognized legacy bridge.")],
    provenance: "unsupported"
  };
}

function createExtraction(profile: DocumentationLocaleResourceProfileExtraction["profile"]): DocumentationLocaleResourceProfileExtraction {
  return {
    diagnostics: [],
    fieldReferences: [],
    profile,
    profileVersion: DOCUMENTATION_LOCALE_RESOURCE_PROFILE_VERSION
  };
}

function extractLiteralLangReferences(sourceText: string, extraction: DocumentationLocaleResourceProfileExtraction): void {
  const tagPattern = /<lang\b([^>]*?)(\/?)>/g;
  for (const match of sourceText.matchAll(tagPattern)) {
    const attributes = parseLiteralAttributes(match[1] ?? "");
    if (!attributes) {
      if (/\bkey\s*=/.test(match[1] ?? "")) {
        extraction.diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR lang reference attributes must be literal quoted values."));
      }
      continue;
    }
    if (!Object.hasOwn(attributes, "key")) {
      continue;
    }
    if (match[2] !== "/") {
      extraction.diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR lang reference must be a self-closing literal element."));
      continue;
    }
    const entryKey = attributes.key ?? "";
    const selection = readResourceSelection(attributes, extraction.diagnostics, true);
    if (selection === undefined) {
      continue;
    }
    const reference: DocumentationLocaleResourceReference = { entryKey };
    if (selection.resource) {
      reference.resource = selection.resource;
    }
    if (selection.src) {
      reference.src = selection.src;
    }
    const referenceDiagnostics = validateDocumentationLocaleResourceReference(reference);
    extraction.diagnostics.push(...referenceDiagnostics);
    if (referenceDiagnostics.some(isError)) {
      continue;
    }
    const fieldPath = attributes.field;
    extraction.fieldReferences.push({
      ...(fieldPath ? { fieldPath } : {}),
      range: rangeForMatch(sourceText, match.index ?? 0, match[0].length),
      reference
    });
  }
}

function readResourceSelection(
  attributes: Record<string, string>,
  diagnostics: HiaDiagnostic[],
  allowNoSelection = false
): { resource?: string; src?: string } | undefined {
  const resource = attributes.resource;
  const src = attributes.src;
  if (!allowNoSelection && !resource && !src) {
    diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR document default requires either resource or src."));
    return undefined;
  }
  if (resource && src) {
    diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR reference must not declare resource and src together."));
    return undefined;
  }
  if (src) {
    const locatorDiagnostics = validateDocumentationLocaleResourceLocator(src);
    diagnostics.push(...locatorDiagnostics);
    if (locatorDiagnostics.some(isError)) {
      return undefined;
    }
  }
  return {
    ...(resource ? { resource } : {}),
    ...(src ? { src } : {})
  };
}

function parseLiteralAttributes(text: string): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};
  const pattern = /\s+([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let consumed = "";
  for (const match of text.matchAll(pattern)) {
    const name = match[1] ?? "";
    const value = match[3] ?? match[4] ?? "";
    if (Object.hasOwn(attributes, name) || !isLiteralAttributeValue(value)) {
      return undefined;
    }
    attributes[name] = value;
    consumed += match[0];
  }
  return consumed.trim() === text.trim() ? attributes : undefined;
}

function isLiteralAttributeValue(value: string): boolean {
  return !value.includes("${") && !value.includes("#{") && !value.includes("<%") && !value.includes("%>");
}

async function loadDocumentDefault(
  documentDefault: DocumentationLocaleResourceDocumentDefault | undefined,
  options: ResolveDocumentationLocaleResourceProfileOptions,
  diagnostics: HiaDiagnostic[]
): Promise<DocumentationLocaleResource | undefined> {
  if (!documentDefault) {
    return undefined;
  }
  return loadSelection(documentDefault, options, diagnostics);
}

async function loadReferenceResource(
  reference: DocumentationLocaleResourceReference,
  options: ResolveDocumentationLocaleResourceProfileOptions,
  diagnostics: HiaDiagnostic[]
): Promise<DocumentationLocaleResource | undefined> {
  if (!reference.resource && !reference.src) {
    return undefined;
  }
  return loadSelection(reference, options, diagnostics);
}

async function loadSelection(
  selection: { resource?: string; src?: string },
  options: ResolveDocumentationLocaleResourceProfileOptions,
  diagnostics: HiaDiagnostic[]
): Promise<DocumentationLocaleResource | undefined> {
  const locator = selection.src ?? (selection.resource ? options.catalog?.[selection.resource] : undefined);
  if (!locator) {
    diagnostics.push(createProfileDiagnostic("DLR_ENTRY_MISSING", "DLR catalog does not declare the requested stable resourceId.", "error", selection.resource ? { resourceId: selection.resource } : {}));
    return undefined;
  }
  const read = await readDocumentationLocaleResource({ locator, resourceRoot: options.resourceRoot });
  diagnostics.push(...read.diagnostics);
  if (!read.resource) {
    return undefined;
  }
  if (selection.resource && read.resource.resourceId !== selection.resource) {
    diagnostics.push(createProfileDiagnostic("DLR_REFERENCE_AMBIGUOUS", "DLR catalog locator did not resolve to its declared stable resourceId.", "error", { resourceId: selection.resource }));
    return undefined;
  }
  return read.resource;
}

function validateResourceLimits(resource: DocumentationLocaleResource, limits: DocumentationLocaleResourceReadLimits): HiaDiagnostic[] {
  if (resource.locales.length > limits.maxLocales || Object.keys(resource.entries).length > limits.maxEntries) {
    return [createProfileDiagnostic("DLR_LIMIT_EXCEEDED", "DLR resource exceeds its locale or entry limit.")];
  }
  for (const entry of Object.values(resource.entries)) {
    for (const text of Object.values(entry.localizedText)) {
      if (Buffer.byteLength(text, "utf8") > limits.maxEntryTextBytes) {
        return [createProfileDiagnostic("DLR_LIMIT_EXCEEDED", "DLR resource contains text exceeding its per-entry limit.")];
      }
    }
  }
  return [];
}

function measureJsonDepth(text: string): number {
  let depth = 0;
  let maximum = 0;
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (inString) {
      if (!escaped && character === "\"") {
        inString = false;
      }
      escaped = !escaped && character === "\\";
      if (character !== "\\") {
        escaped = false;
      }
      continue;
    }
    if (character === "\"") {
      inString = true;
    } else if (character === "{" || character === "[") {
      depth += 1;
      maximum = Math.max(maximum, depth);
    } else if (character === "}" || character === "]") {
      depth -= 1;
    }
  }
  return maximum;
}

function isPathInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function rangeForMatch(sourceText: string, index: number, length: number): DocumentationLocaleResourceProfileRange {
  const before = sourceText.slice(0, index);
  const startLine = before.split("\n").length;
  const startColumn = before.length - before.lastIndexOf("\n");
  const matched = sourceText.slice(index, index + length);
  const matchLines = matched.split("\n");
  return {
    start: { line: startLine, column: startColumn },
    end: {
      line: startLine + matchLines.length - 1,
      column: matchLines.length === 1 ? startColumn + length : (matchLines.at(-1)?.length ?? 0) + 1
    }
  };
}

function createProfileDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity = "error",
  data: Record<string, unknown> = {}
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, Object.keys(data).length > 0 ? { data } : {});
}

function isError(diagnostic: HiaDiagnostic): boolean {
  return diagnostic.severity === "error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keep a field resolution's diagnostic codes stable when shared and direct reads overlap.
 *
 * 中文：在 shared 与 direct read 重叠时，保持 field resolution 的 diagnostic code 稳定且不重复。
 */
function dedupeDiagnostics(diagnostics: HiaDiagnostic[]): HiaDiagnostic[] {
  const output: HiaDiagnostic[] = [];
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}\n${diagnostic.severity}\n${diagnostic.targetPath ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(diagnostic);
    }
  }
  return output;
}
