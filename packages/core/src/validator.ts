/**
 * @file
 * @lang zh-CN 核心JSON文档的只读边界检查；开放扩展字段但不执行输入的getter/序列化钩子。
 * @lang en Read-only boundary checks for core JSON documents; allows extension fields without executing input getters/serialization hooks.
 */
import { isJsonDataGraph } from "./json-data.js";
import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_CONFIDENCE_LEVELS,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  HIA_SOURCE_MODES,
  HIA_SOURCE_RANGE_SOURCES,
  HIA_TEXT_I18N_MODEL,
  HIA_TEXT_I18N_MODEL_VERSION
} from "./model.js";
import type {
  HiaDiagnostic,
  HiaDiagnosticSeverity,
  HiaDocument,
  HiaI18nField,
  HiaI18nModel,
  HiaLangBlock,
  HiaLangInlineSegment,
  HiaNode,
  HiaSourceFragment,
  HiaSourceMetadata,
  HiaSourcePosition,
  HiaSourcePrimaryBlock,
  HiaSourceReference,
  HiaSymbol
} from "./model.js";

/** @lang zh-CN 独立校验结果；仅无error级诊断时valid为true，不表示文件存在或正文已脱敏。
 * @lang en Independent validation result; valid is true only without error diagnostics, not proof of file existence or text redaction.
 */
export interface HiaValidationResult {
  valid: boolean;
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 校验普通JSON文档并返回新诊断数组，不修改输入或读取文件。
 * @lang en Validates an ordinary JSON document and returns new diagnostics without mutation or file access.
 * @param document <lang><zh-CN>未知内存输入；无效数据产生诊断，不回显未知版本正文。</zh-CN><en>Unknown in-memory input; invalid data produces diagnostics without reflecting unknown-version text.</en></lang>
 * @returns <lang><zh-CN>新数组，空数组表示此校验层有效；不包含领域正文自动脱敏保证。</zh-CN><en>New array; empty means valid at this layer, without automatic domain-text redaction guarantees.</en></lang>
 */
export function validateHiaDocument(document: unknown): HiaDiagnostic[] {
  return validateHiaDocumentDetailed(document).diagnostics;
}

/**
 * @lang zh-CN 先拒绝非JSON/环/访问器，再校验精确版本、模型、相对路径和安全整数；保留输入引用。
 * @lang en Rejects non-JSON values, cycles and accessors before checking exact versions, models, relative paths and safe integers, preserving input references.
 * @param document <lang><zh-CN>待检查值，扩展字段和metadata仅检查JSON/声明形状，不解释领域语义。</zh-CN><en>Value to check; extensions and metadata receive JSON/declared-shape checks, not domain interpretation.</en></lang>
 * @returns <lang><zh-CN>新结果；不迁移原对象、不I/O，不证明真实路径、沙箱隔离或完整隐私。</zh-CN><en>New result, without in-place migration or I/O; does not prove physical paths, sandbox isolation or complete privacy.</en></lang>
 */
export function validateHiaDocumentDetailed(document: unknown): HiaValidationResult {
  // <lang><zh-CN>每次调用独立收集诊断，不复用或写入输入的diagnostics。</zh-CN><en>Collect diagnostics per invocation without reusing or writing the input diagnostics.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(document)) {
    return {
      valid: false,
      diagnostics: [
        createDiagnostic("HIA_DOCUMENT_INVALID", "HIA document must be an object.", "error")
      ]
    };
  }

  // <lang><zh-CN>先检查整个wire图，避免形状遍历进入环或执行访问器，并保持错误不携带不可信键。</zh-CN><en>Check the entire wire graph before shape traversal can enter cycles or execute accessors, keeping untrusted keys out of errors.</en></lang>
  if (!isJsonDataGraph(document)) {
    return { valid: false, diagnostics: [createDiagnostic("HIA_DOCUMENT_JSON_INVALID", "HIA document must contain ordinary finite acyclic JSON data.", "error")] };
  }
  requireString(document, "schemaVersion", diagnostics);
  requireString(document, "id", diagnostics);
  requireString(document, "title", diagnostics);
  requireString(document, "defaultLocale", diagnostics);
  requireArray(document, "locales", diagnostics);
  requireArray(document, "nodes", diagnostics);
  requireArray(document, "symbols", diagnostics);

  if (document.schemaVersion && document.schemaVersion !== HIA_CORE_CONTRACT_VERSION && document.schemaVersion !== "0.2.0") {
    diagnostics.push(createDiagnostic(
      "HIA_SCHEMA_VERSION_UNSUPPORTED",
      "Unsupported HIA schemaVersion.",
      "error",
      "schemaVersion"
    ));
  }

  if (Array.isArray(document.locales) && typeof document.defaultLocale === "string" && !document.locales.includes(document.defaultLocale)) {
    diagnostics.push(createDiagnostic(
      "HIA_DEFAULT_LOCALE_MISSING",
      "defaultLocale must be included in locales.",
      "error",
      "defaultLocale"
    ));
  }

  if (Array.isArray(document.locales)) {
    validateStringArray(document.locales, diagnostics, "locales", true);
  }

  validateFallbackLocale(document.fallbackLocale, diagnostics, "fallbackLocale");
  validateDiagnostics(document.diagnostics, diagnostics, "diagnostics");
  validateMetadata(document.metadata, diagnostics, "metadata");

  if (Array.isArray(document.nodes)) {
    validateNodes(document.nodes, diagnostics, "nodes");
  }

  if (Array.isArray(document.symbols)) {
    validateSymbols(document.symbols, diagnostics);
  }

  return {
    valid: diagnostics.every((item) => item.severity !== "error"),
    diagnostics
  };
}

/** @lang zh-CN 以显式栈保留深度优先顺序，有限深树不依赖JS递归调用栈。
 * @lang en Uses an explicit stack to retain depth-first order without relying on the JavaScript call stack for finite deep trees.
 */
function validateNodes(nodes: unknown[], diagnostics: HiaDiagnostic[], targetPath: string): void {
  // <lang><zh-CN>逆序入栈保持原数组的逐项深度优先诊断顺序；位置由可信字段和序号组成。</zh-CN><en>Reverse insertion preserves original depth-first diagnostic order; locations contain trusted fields and ordinals.</en></lang>
  const pending = nodes.map((node, index) => ({ node, itemPath: `${targetPath}.${index}` })).reverse();
  while (pending.length > 0) {
    const { node, itemPath } = pending.pop()!;

    if (!isRecord(node)) {
      diagnostics.push(createDiagnostic("HIA_NODE_INVALID", "HIA node must be an object.", "error", itemPath));
      continue;
    }

    const typedNode = node as unknown as HiaNode;

    requireString(node, "id", diagnostics, itemPath);
    requireString(node, "kind", diagnostics, itemPath);
    requireString(node, "title", diagnostics, itemPath);
    validateOptionalStringArray(typedNode.symbolIds, diagnostics, `${itemPath}.symbolIds`);

    if (typedNode.children !== undefined) {
      if (!Array.isArray(typedNode.children)) {
        diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.children must be an array.`, "error", `${itemPath}.children`));
      } else {
        // <lang><zh-CN>子节点仍引用原输入，不克隆或改写节点。</zh-CN><en>Children still reference the original input without cloning or rewriting nodes.</en></lang>
        for (let index = typedNode.children.length - 1; index >= 0; index -= 1) {
          pending.push({ node: typedNode.children[index], itemPath: `${itemPath}.children.${index}` });
        }
      }
    }
  }
}

function validateSymbols(symbols: unknown[], diagnostics: HiaDiagnostic[]): void {
  for (const [index, symbol] of symbols.entries()) {
    const targetPath = `symbols.${index}`;

    if (!isRecord(symbol)) {
      diagnostics.push(createDiagnostic("HIA_SYMBOL_INVALID", "HIA symbol must be an object.", "error", targetPath));
      continue;
    }

    const typedSymbol = symbol as unknown as HiaSymbol;

    for (const field of ["id", "name", "kind"] as const) {
      requireString(symbol, field, diagnostics, targetPath);
    }

    validateOptionalString(symbol, "longname", diagnostics, targetPath);
    validateOptionalString(symbol, "parentId", diagnostics, targetPath);
    validateOptionalString(symbol, "signature", diagnostics, targetPath);
    validateOptionalString(symbol, "summary", diagnostics, targetPath, true);
    validateMetadata(symbol.metadata, diagnostics, `${targetPath}.metadata`);
    validateOptionalStringArray(typedSymbol.path, diagnostics, `${targetPath}.path`);
    validateDiagnostics(typedSymbol.diagnostics, diagnostics, `${targetPath}.diagnostics`);

    if (typedSymbol.i18n !== undefined) {
      validateI18nModel(typedSymbol.i18n, diagnostics, `${targetPath}.i18n`);
    }

    if (typedSymbol.source !== undefined) {
      validateSourceMetadata(typedSymbol.source, diagnostics, `${targetPath}.source`);
    }
  }
}

function validateI18nModel(model: HiaI18nModel, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(model)) {
    diagnostics.push(createDiagnostic("HIA_I18N_INVALID", "i18n must be an object.", "error", targetPath));
    return;
  }

  if (typeof model.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  requireString(model, "model", diagnostics, targetPath);
  requireString(model, "modelVersion", diagnostics, targetPath);
  requireString(model, "defaultLocale", diagnostics, targetPath);
  requireArray(model, "locales", diagnostics, targetPath);

  if (model.model && model.model !== HIA_TEXT_I18N_MODEL) {
    diagnostics.push(createDiagnostic(
      "HIA_I18N_MODEL_UNSUPPORTED",
      "Unsupported i18n model.",
      "error",
      `${targetPath}.model`
    ));
  }

  if (model.modelVersion && model.modelVersion !== HIA_TEXT_I18N_MODEL_VERSION && model.modelVersion !== "0.2.0") {
    diagnostics.push(createDiagnostic(
      "HIA_I18N_MODEL_VERSION_UNSUPPORTED",
      "Unsupported i18n modelVersion.",
      "error",
      `${targetPath}.modelVersion`
    ));
  }

  if (Array.isArray(model.locales)) {
    validateStringArray(model.locales, diagnostics, `${targetPath}.locales`, true);

    if (typeof model.defaultLocale === "string" && !model.locales.includes(model.defaultLocale)) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_DEFAULT_LOCALE_MISSING",
        "i18n.defaultLocale must be included in i18n.locales.",
        "error",
        `${targetPath}.defaultLocale`
      ));
    }
  }

  validateFallbackLocale(model.fallbackLocale, diagnostics, `${targetPath}.fallbackLocale`);
  validateOptionalString(model, "mode", diagnostics, targetPath);
  validateI18nFields(model.fields, diagnostics, `${targetPath}.fields`);
  validateI18nResources(model.resources, diagnostics, `${targetPath}.resources`);
  validateDiagnostics(model.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateI18nFields(fields: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(fields)) {
    diagnostics.push(createDiagnostic("HIA_I18N_FIELDS_INVALID", "i18n.fields must be an object.", "error", targetPath));
    return;
  }

  for (const [fieldPath, field] of Object.entries(fields)) {
    // <lang><zh-CN>常规字段保留精确位置；形似私有路径的动态键只定位安全父节点。</zh-CN><en>Ordinary fields retain precise locations; path-like dynamic keys locate only the safe parent.</en></lang>
    const itemPath = safeMapLocation(targetPath, fieldPath);

    if (!isRecord(field)) {
      diagnostics.push(createDiagnostic("HIA_I18N_FIELD_INVALID", "i18n field must be an object.", "error", itemPath));
      continue;
    }

    const typedField = field as unknown as HiaI18nField;
    requireString(field, "fieldPath", diagnostics, itemPath);
    requireString(field, "kind", diagnostics, itemPath);
    requireString(field, "defaultLocale", diagnostics, itemPath);
    validateOptionalString(field, "key", diagnostics, itemPath);
    validateOptionalString(field, "path", diagnostics, itemPath);
    validateOptionalString(field, "defaultText", diagnostics, itemPath, true);
    validateOptionalString(field, "source", diagnostics, itemPath);

    if (typedField.fieldPath && typedField.fieldPath !== fieldPath) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_FIELD_PATH_MISMATCH",
        "i18n field key must match fieldPath.",
        "error",
        `${itemPath}.fieldPath`
      ));
    }

    if (!isRecord(typedField.localizedText)) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_LOCALIZED_TEXT_INVALID",
        "i18n field localizedText must be an object.",
        "error",
        `${itemPath}.localizedText`
      ));
    } else {
      validateLocalizedText(typedField.localizedText, diagnostics, `${itemPath}.localizedText`);
    }

    validateLangBlocks(typedField.blocks, diagnostics, `${itemPath}.blocks`);
    validateLangInlineSegments(typedField.segments, diagnostics, `${itemPath}.segments`);
    validateTextResolutions(typedField.resolutions, diagnostics, `${itemPath}.resolutions`);
    validateOptionalStringArray(typedField.missingLocales, diagnostics, `${itemPath}.missingLocales`);
  }
}

function validateSourceMetadata(source: HiaSourceMetadata, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(source)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_INVALID", "source must be an object.", "error", targetPath));
    return;
  }

  requireString(source, "model", diagnostics, targetPath);
  requireString(source, "modelVersion", diagnostics, targetPath);
  requireString(source, "mode", diagnostics, targetPath);

  if (source.model && source.model !== HIA_SOURCE_MODEL) {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_MODEL_UNSUPPORTED",
      "Unsupported source model.",
      "error",
      `${targetPath}.model`
    ));
  }

  if (source.modelVersion && source.modelVersion !== HIA_SOURCE_MODEL_VERSION && source.modelVersion !== "0.2.0") {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_MODEL_VERSION_UNSUPPORTED",
      "Unsupported source modelVersion.",
      "error",
      `${targetPath}.modelVersion`
    ));
  }

  validateStringEnum(source.mode, HIA_SOURCE_MODES, "HIA_SOURCE_MODE_UNSUPPORTED", diagnostics, `${targetPath}.mode`);

  if (source.definedIn !== undefined && !isRecord(source.definedIn)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_INVALID", "source.definedIn must be an object when present.", "error", `${targetPath}.definedIn`));
  } else if (source.definedIn !== undefined) {
    const definedIn = source.definedIn as unknown as Record<string, unknown>;

    requireString(definedIn, "kind", diagnostics, `${targetPath}.definedIn`);
    validateLiteral(definedIn.kind, "defined-in", "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.definedIn.kind`);
    validateRelativePath(source.definedIn.relativePath, diagnostics, `${targetPath}.definedIn.relativePath`);
    validateOptionalString(definedIn, "language", diagnostics, `${targetPath}.definedIn`);
    validatePosition(source.definedIn.position, diagnostics, `${targetPath}.definedIn.position`);
    validateRange(source.definedIn.range, diagnostics, `${targetPath}.definedIn.range`);
    validateSourceLink(source.definedIn.link, diagnostics, `${targetPath}.definedIn.link`);
  }

  if (source.primaryBlock !== undefined && source.primaryBlock !== null) {
    validateSourceBlock(source.primaryBlock, "primary-block", diagnostics, `${targetPath}.primaryBlock`, false);
  }

  if (source.fragments !== undefined && !Array.isArray(source.fragments)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.fragments must be an array.`, "error", `${targetPath}.fragments`));
  } else {
    for (const [index, fragment] of (source.fragments || []).entries()) {
      validateSourceFragment(fragment, diagnostics, `${targetPath}.fragments.${index}`);
    }
  }

  if (source.references !== undefined && !Array.isArray(source.references)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.references must be an array.`, "error", `${targetPath}.references`));
  } else {
    for (const [index, reference] of (source.references || []).entries()) {
      validateSourceReference(reference, diagnostics, `${targetPath}.references.${index}`);
    }
  }

  validateDiagnostics(source.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateSourceReference(reference: HiaSourceReference, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(reference)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_REFERENCE_INVALID", "source reference must be an object.", "error", targetPath));
    return;
  }

  requireString(reference, "kind", diagnostics, targetPath);
  requireString(reference, "referenceKind", diagnostics, targetPath);
  requireString(reference, "targetId", diagnostics, targetPath);
  validateLiteral(reference.kind, "source-reference", "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.kind`);

  validateOptionalString(reference as unknown as Record<string, unknown>, "sourceNodeId", diagnostics, targetPath);
  validateOptionalString(reference as unknown as Record<string, unknown>, "fieldPath", diagnostics, targetPath);

  if (typeof reference.resolved !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.resolved must be a boolean.`, "error", `${targetPath}.resolved`));
  }

  if (reference.resolved === true && !reference.fragment) {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_REFERENCE_FRAGMENT_MISSING",
      "Resolved source references must include a fragment snapshot.",
      "error",
      `${targetPath}.fragment`
    ));
  }

  if (reference.fragment !== undefined) {
    validateSourceFragment(reference.fragment, diagnostics, `${targetPath}.fragment`);
  }

  validateDiagnostics(reference.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateSourceFragment(fragment: HiaSourceFragment, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(fragment)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_FRAGMENT_INVALID", "source fragment must be an object.", "error", targetPath));
    return;
  }

  requireString(fragment, "kind", diagnostics, targetPath);
  requireString(fragment, "id", diagnostics, targetPath);
  requireString(fragment, "relativePath", diagnostics, targetPath);
  requireString(fragment, "content", diagnostics, targetPath, true);
  validateMetadata(fragment.origin, diagnostics, `${targetPath}.origin`);
  validateSourceBlock(fragment, "source-fragment", diagnostics, targetPath, true);
}

function validateSourceBlock(
  block: HiaSourcePrimaryBlock | HiaSourceFragment,
  expectedKind: "primary-block" | "source-fragment",
  diagnostics: HiaDiagnostic[],
  targetPath: string,
  requirePathAndRange: boolean
): void {
  if (!isRecord(block)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_BLOCK_INVALID", "source block must be an object.", "error", targetPath));
    return;
  }

  requireString(block, "kind", diagnostics, targetPath);
  requireString(block, "content", diagnostics, targetPath, true);
  requireString(block, "rangeSource", diagnostics, targetPath);
  requireString(block, "confidence", diagnostics, targetPath);
  validateLiteral(block.kind, expectedKind, "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.kind`);
  validateStringEnum(block.rangeSource, HIA_SOURCE_RANGE_SOURCES, "HIA_SOURCE_RANGE_SOURCE_UNSUPPORTED", diagnostics, `${targetPath}.rangeSource`);
  validateStringEnum(block.confidence, HIA_SOURCE_CONFIDENCE_LEVELS, "HIA_SOURCE_CONFIDENCE_UNSUPPORTED", diagnostics, `${targetPath}.confidence`);
  validateOptionalString(block, "language", diagnostics, targetPath);

  if (block.id !== undefined) {
    validateOptionalString(block, "id", diagnostics, targetPath);
  }

  if (requirePathAndRange || block.relativePath !== undefined) {
    validateRelativePath(block.relativePath, diagnostics, `${targetPath}.relativePath`);
  }

  // <lang><zh-CN>命名片段的range为必需，不能借可选range验证器的undefined分支绕过。</zh-CN><en>A named fragment requires range and cannot bypass it through the optional-range validator's undefined branch.</en></lang>
  if (requirePathAndRange && block.range === undefined) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_RANGE_INVALID", "Named source fragments require a range.", "error", `${targetPath}.range`));
  } else if (block.range !== undefined) {
    validateRange(block.range, diagnostics, `${targetPath}.range`);
  }

  if (block.rangeSource === "unresolved" && block.confidence !== "none") {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_RANGE_CONFIDENCE_MISMATCH",
      "source blocks with rangeSource unresolved must use confidence none.",
      "error",
      `${targetPath}.confidence`
    ));
  }

  validateSourceLink(block.link, diagnostics, `${targetPath}.link`);
  validateSourcePreview(block.preview, diagnostics, `${targetPath}.preview`);
  validateDiagnostics(block.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateI18nResources(resources: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (resources === undefined) {
    return;
  }

  if (!Array.isArray(resources)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, resource] of resources.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(resource)) {
      diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_INVALID", "i18n resource must be an object.", "error", itemPath));
      continue;
    }

    requireString(resource, "path", diagnostics, itemPath);
    validateI18nResourcePath(resource.path, diagnostics, `${itemPath}.path`);
    validateOptionalString(resource, "kind", diagnostics, itemPath);
    validateOptionalString(resource, "locale", diagnostics, itemPath);
    validateOptionalString(resource, "format", diagnostics, itemPath);
    validateOptionalStringArray(resource.fields, diagnostics, `${itemPath}.fields`);
  }
}

function validateLangBlocks(blocks: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (blocks === undefined) {
    return;
  }

  if (!Array.isArray(blocks)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, block] of blocks.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(block)) {
      diagnostics.push(createDiagnostic("HIA_I18N_BLOCK_INVALID", "i18n block must be an object.", "error", itemPath));
      continue;
    }

    const typedBlock = block as unknown as HiaLangBlock;
    requireString(block, "kind", diagnostics, itemPath);
    validateLiteral(typedBlock.kind, "lang-block", "HIA_I18N_BLOCK_INVALID", diagnostics, `${itemPath}.kind`);
    requireString(block, "locale", diagnostics, itemPath);
    requireString(block, "fieldPath", diagnostics, itemPath);
    requireString(block, "text", diagnostics, itemPath, true);
    validateOptionalString(block, "source", diagnostics, itemPath);
    validateTextRange(typedBlock.rangeInComment ?? undefined, diagnostics, `${itemPath}.rangeInComment`);
  }
}

function validateLangInlineSegments(segments: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (segments === undefined) {
    return;
  }

  if (!Array.isArray(segments)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, segment] of segments.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(segment)) {
      diagnostics.push(createDiagnostic("HIA_I18N_SEGMENT_INVALID", "i18n segment must be an object.", "error", itemPath));
      continue;
    }

    const typedSegment = segment as unknown as HiaLangInlineSegment;
    requireString(segment, "kind", diagnostics, itemPath);
    validateLiteral(typedSegment.kind, "lang-inline", "HIA_I18N_SEGMENT_INVALID", diagnostics, `${itemPath}.kind`);
    requireString(segment, "id", diagnostics, itemPath);
    requireString(segment, "fieldPath", diagnostics, itemPath);
    requireString(segment, "raw", diagnostics, itemPath, true);
    validateOptionalString(segment, "key", diagnostics, itemPath);
    validateOptionalString(segment, "path", diagnostics, itemPath);

    if (!isRecord(typedSegment.localized)) {
      diagnostics.push(createDiagnostic("HIA_I18N_LOCALIZED_TEXT_INVALID", "segment.localized must be an object.", "error", `${itemPath}.localized`));
    } else {
      validateLocalizedText(typedSegment.localized, diagnostics, `${itemPath}.localized`);
    }

    validateTextRange(typedSegment.rangeInField, diagnostics, `${itemPath}.rangeInField`);
  }
}

function validateTextResolutions(resolutions: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (resolutions === undefined) {
    return;
  }

  if (!isRecord(resolutions)) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOLUTIONS_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  for (const [locale, resolution] of Object.entries(resolutions)) {
    const itemPath = safeMapLocation(targetPath, locale);

    if (!isRecord(resolution)) {
      diagnostics.push(createDiagnostic("HIA_I18N_RESOLUTION_INVALID", "i18n resolution must be an object.", "error", itemPath));
      continue;
    }

    requireString(resolution, "requestedLocale", diagnostics, itemPath);
    requireString(resolution, "resolvedLocale", diagnostics, itemPath, true);
    requireArray(resolution, "fallbackChain", diagnostics, itemPath);

    if (Array.isArray(resolution.fallbackChain)) {
      validateStringArray(resolution.fallbackChain, diagnostics, `${itemPath}.fallbackChain`);
    }

    if (typeof resolution.usedFallback !== "boolean") {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.usedFallback must be a boolean.`, "error", `${itemPath}.usedFallback`));
    }

    if (typeof resolution.missing !== "boolean") {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.missing must be a boolean.`, "error", `${itemPath}.missing`));
    }

    validateOptionalString(resolution, "sourceKind", diagnostics, itemPath);
    validateOptionalString(resolution, "sourceLocale", diagnostics, itemPath, true);
    validateOptionalString(resolution, "source", diagnostics, itemPath);
  }
}

function validateLocalizedText(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath: string): void {
  for (const [locale, text] of Object.entries(value)) {
    if (!locale || typeof text !== "string") {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_LOCALIZED_TEXT_INVALID",
        "localizedText entries must map non-empty locale keys to string values.",
        "error",
        safeMapLocation(targetPath, locale)
      ));
    }
  }
}

function validateFallbackLocale(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (value.length === 0) {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
    }
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a string or string array.`, "error", targetPath));
    return;
  }

  validateStringArray(value, diagnostics, targetPath, true);
}

function validateDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_DIAGNOSTICS_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, diagnostic] of value.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(diagnostic)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_INVALID", "diagnostic must be an object.", "error", itemPath));
      continue;
    }

    requireString(diagnostic, "code", diagnostics, itemPath);
    requireString(diagnostic, "message", diagnostics, itemPath);
    requireString(diagnostic, "severity", diagnostics, itemPath);
    validateOptionalString(diagnostic, "path", diagnostics, itemPath);
    validateOptionalString(diagnostic, "targetPath", diagnostics, itemPath);

    if (diagnostic.data !== undefined && !isRecord(diagnostic.data)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_DATA_INVALID", `${itemPath}.data must be an object when present.`, "error", `${itemPath}.data`));
    }

    if (typeof diagnostic.severity === "string" && !["info", "warning", "error"].includes(diagnostic.severity)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_SEVERITY_INVALID", `${itemPath}.severity is not supported.`, "error", `${itemPath}.severity`));
    }
  }
}

function validateStringArray(value: unknown[], diagnostics: HiaDiagnostic[], targetPath: string, requireNonEmpty = false): void {
  if (requireNonEmpty && value.length === 0) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must not be empty.`, "error", targetPath));
  }

  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.${index} must be a non-empty string.`, "error", `${targetPath}.${index}`));
    }
  }
}

function validateOptionalStringArray(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array of strings.`, "error", targetPath));
    return;
  }

  validateStringArray(value, diagnostics, targetPath);
}

function validateSourceLink(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_LINK_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  if (typeof value.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  validateOptionalString(value, "fileUrl", diagnostics, targetPath);
  validateOptionalString(value, "lineUrl", diagnostics, targetPath);
  validateOptionalString(value, "openMode", diagnostics, targetPath);
}

function validateSourcePreview(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PREVIEW_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  if (typeof value.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  if (value.defaultExpanded !== undefined && typeof value.defaultExpanded !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.defaultExpanded must be a boolean.`, "error", `${targetPath}.defaultExpanded`));
  }

  validateOptionalString(value, "content", diagnostics, targetPath, true);
  validateOptionalString(value, "language", diagnostics, targetPath);
  validateRange(value.range as { start: HiaSourcePosition; end: HiaSourcePosition } | undefined, diagnostics, `${targetPath}.range`);
}

/** @lang zh-CN 仅验证相对定位器的词法边界，不读取文件或解析真实链接目标。
 * @lang en Checks lexical relative-locator boundaries only, without reading files or resolving physical targets.
 */
function validateRelativePath(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (typeof value !== "string" || !value) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PATH_MISSING", "Source relativePath is required.", "error", targetPath));
    return;
  }

  const normalized = value.replaceAll("\\", "/");

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) || normalized.startsWith("/") || normalized.startsWith("//")) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_ABSOLUTE_PATH", "Source paths must be relative.", "error", targetPath));
    return;
  }

  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PATH_TRAVERSAL", "Source paths must stay inside the project source boundary.", "error", targetPath));
  }
}

/** @lang zh-CN 国际化资源保持项目内相对定位器，畸形值不通过String钩子转换。
 * @lang en Keeps i18n resources as project-relative locators without coercing malformed values through String hooks.
 */
function validateI18nResourcePath(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (typeof value !== "string" || !value) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_PATH_MISSING", "i18n resource path is required.", "error", targetPath));
    return;
  }

  const normalized = value.replaceAll("\\", "/");

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) || normalized.startsWith("/") || normalized.startsWith("//")) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_ABSOLUTE_PATH", "i18n resource paths must be relative.", "error", targetPath));
    return;
  }

  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_PATH_TRAVERSAL", "i18n resource paths must stay inside the project resource boundary.", "error", targetPath));
  }
}

function validateRange(range: { start: HiaSourcePosition; end: HiaSourcePosition } | undefined, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (range === undefined) {
    return;
  }

  if (!isRecord(range)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_RANGE_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  const startValid = validatePosition(range.start, diagnostics, `${targetPath}.start`);
  const endValid = validatePosition(range.end, diagnostics, `${targetPath}.end`);

  if (startValid && endValid) {
    const startColumn = range.start.column || 1;
    const endColumn = range.end.column || 1;
    const endsBeforeStart = range.end.line < range.start.line
      || (range.end.line === range.start.line && endColumn < startColumn);

    if (endsBeforeStart) {
      diagnostics.push(createDiagnostic("HIA_SOURCE_RANGE_ORDER_INVALID", "Source range end must not be before start.", "error", targetPath));
    }
  }
}

function validatePosition(position: HiaSourcePosition | undefined, diagnostics: HiaDiagnostic[], targetPath: string): boolean {
  if (!position || !Number.isSafeInteger(position.line) || position.line < 1) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_POSITION_INVALID", "Source position line must be a positive safe integer.", "error", targetPath));
    return false;
  }

  if (position.column !== undefined && (!Number.isSafeInteger(position.column) || position.column < 1)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_POSITION_INVALID", "Source position column must be a positive safe integer when present.", "error", `${targetPath}.column`));
    return false;
  }

  return true;
}

function validateTextRange(range: { start: number; end: number } | undefined, diagnostics: HiaDiagnostic[], targetPath: string): void {
  // <lang><zh-CN>comment range的null已在调用点按明确可空契约转换为undefined；inline range不能接受null。</zh-CN><en>Nullable comment ranges are explicitly converted to undefined at the call site; inline ranges cannot accept null.</en></lang>
  if (range === undefined) {
    return;
  }

  if (!isRecord(range) || !Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < 0 || range.end < range.start) {
    diagnostics.push(createDiagnostic("HIA_TEXT_RANGE_INVALID", `${targetPath} must contain a valid start/end pair.`, "error", targetPath));
  }
}

function validateStringEnum(
  value: unknown,
  allowedValues: readonly string[],
  code: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (typeof value === "string" && !allowedValues.includes(value)) {
    diagnostics.push(createDiagnostic(code, `${targetPath} is not supported.`, "error", targetPath));
  }
}

function validateLiteral(
  value: unknown,
  expectedValue: string,
  code: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (typeof value === "string" && value !== expectedValue) {
    diagnostics.push(createDiagnostic(code, `${targetPath} must be ${expectedValue}.`, "error", targetPath));
  }
}

/** @lang zh-CN token默认非空，自由文本可显式允许空串；要求自有字段，不进行隐式字符串转换。
 * @lang en Tokens are nonempty by default; free text may explicitly allow empty strings, with own fields required and no implicit coercion.
 */
function requireString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = "", allowEmpty = false): void {
  const value = record[field];
  if (!Object.hasOwn(record, field) || typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_MISSING", `HIA document requires a non-empty ${targetPath}.`, "error", targetPath));
  }
}

/** @lang zh-CN 验证出现时的字符串；自由文本允许空串但不接受其它JSON原语。
 * @lang en Validates strings when present; free text may be empty but cannot be another JSON primitive.
 */
function validateOptionalString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = "", allowEmpty = false): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || (!allowEmpty && value.length === 0))) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

/** @lang zh-CN 必需数组只能由自有属性提供，不能从原型补足wire字段。
 * @lang en Required arrays must be own properties rather than prototype-supplied wire fields.
 */
function requireArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  if (!Object.hasOwn(record, field) || !Array.isArray(record[field])) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
  }
}

/** @lang zh-CN metadata只检查对象形状；领域键、内容和隐私责任仍归生产者。
 * @lang en Checks metadata object shape only; domain keys, content and privacy remain producer responsibilities.
 */
function validateMetadata(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value !== undefined && !isRecord(value)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", "Metadata must be an object when present.", "error", targetPath));
  }
}

/** @lang zh-CN 常规字段路径精确保留；不可信路径式键只定位父节点，避免诊断泄漏。
 * @lang en Preserves ordinary field paths precisely while locating untrusted path-like keys at the parent to avoid diagnostic leaks.
 */
function safeMapLocation(parent: string, key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.[\]-]*$/.test(key) && !key.includes("..") ? `${parent}.${key}` : parent;
}

/** @lang zh-CN 构造独立公开诊断；调用者只传入固定文案和已净化位置，不附输入正文。
 * @lang en Constructs independent public diagnostics from fixed messages and sanitized locations without attaching input text.
 */
function createDiagnostic(code: string, message: string, severity: HiaDiagnosticSeverity, targetPath?: string): HiaDiagnostic {
  const diagnostic: HiaDiagnostic = { code, message, severity };

  if (targetPath) {
    diagnostic.targetPath = targetPath;
    diagnostic.path = targetPath;
  }

  return diagnostic;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
