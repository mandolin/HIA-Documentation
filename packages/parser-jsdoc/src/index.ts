import {
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  HIA_TEXT_I18N_MODEL,
  HIA_TEXT_I18N_MODEL_VERSION,
  createHiaDocument
} from "@hia-doc/core";
import type {
  HiaDiagnostic,
  HiaDiagnosticSeverity,
  HiaDocument,
  HiaFallbackLocale,
  HiaI18nField,
  HiaI18nModel,
  HiaI18nResource,
  HiaLangBlock,
  HiaLangInlineSegment,
  HiaLocalizedText,
  HiaNode,
  HiaSourceConfidence,
  HiaSourceDefinedIn,
  HiaSourceFragment,
  HiaSourceLink,
  HiaSourceMetadata,
  HiaSourceMode,
  HiaSourcePosition,
  HiaSourcePreview,
  HiaSourcePrimaryBlock,
  HiaSourceRange,
  HiaSourceRangeSource,
  HiaSourceReference,
  HiaSymbol,
  HiaTextResolution
} from "@hia-doc/core";

export const JSDOC_HIA_INTEGRATION_CONTRACT = "hia-jsdoc-integration";
export const JSDOC_HIA_INTEGRATION_CONTRACT_VERSION = "0.1.0";

export interface JSDocIntegrationInput {
  contract?: string;
  contractVersion?: string;
  pluginVersion?: string;
  mode?: string;
  parserBoundary?: Record<string, unknown>;
  ir?: {
    version?: string;
    source?: string;
    nodes?: unknown[];
  };
  sourceFragments?: unknown[];
  localizationResources?: unknown[];
  diagnostics?: unknown[];
  diagnosticCounts?: Record<string, unknown>;
  docletNodeMap?: unknown[];
}

export interface ConvertJSDocIntegrationOptions {
  documentId?: string;
  title?: string;
  defaultLocale?: string;
  fallbackLocale?: HiaFallbackLocale;
  locales?: string[];
  includeEmptySymbols?: boolean;
}

export interface ConvertJSDocIntegrationResult {
  document: HiaDocument;
  diagnostics: HiaDiagnostic[];
}

export function convertJSDocIntegrationToHiaDocument(
  input: unknown,
  options: ConvertJSDocIntegrationOptions = {}
): HiaDocument {
  return convertJSDocIntegrationToHiaDocumentDetailed(input, options).document;
}

export function convertJSDocIntegrationToHiaDocumentDetailed(
  input: unknown,
  options: ConvertJSDocIntegrationOptions = {}
): ConvertJSDocIntegrationResult {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(input)) {
    diagnostics.push(createDiagnostic(
      "HIA_JSDOC_INTEGRATION_INVALID",
      "JSDoc integration input must be an object.",
      "error"
    ));

    const emptyDocument = createHiaDocument({
      id: options.documentId ?? "jsdoc.integration",
      title: options.title ?? "JSDoc Integration",
      defaultLocale: options.defaultLocale ?? "en",
      locales: options.locales ?? [options.defaultLocale ?? "en"],
      diagnostics
    });

    return {
      document: emptyDocument,
      diagnostics
    };
  }

  const integration = input as JSDocIntegrationInput;

  if (integration.contract && integration.contract !== JSDOC_HIA_INTEGRATION_CONTRACT) {
    diagnostics.push(createDiagnostic(
      "HIA_JSDOC_CONTRACT_UNSUPPORTED",
      `Unsupported JSDoc integration contract: ${integration.contract}.`,
      "warning",
      "contract"
    ));
  }

  const sourceNodes = Array.isArray(integration.ir?.nodes) ? integration.ir.nodes : [];
  const defaultLocale = options.defaultLocale ?? findFirstString(sourceNodes, "i18n.defaultLocale") ?? "en";
  const fallbackLocale = options.fallbackLocale ?? findFirstFallbackLocale(sourceNodes);
  const locales = collectLocales(sourceNodes, options.locales, defaultLocale);
  const symbols = sourceNodes
    .map((node, index) => mapIntegrationNodeToSymbol(node, index, defaultLocale, fallbackLocale, locales, diagnostics))
    .filter((symbol): symbol is HiaSymbol => Boolean(symbol))
    .filter((symbol) => options.includeEmptySymbols || symbol.name.length > 0);
  const documentNodes: HiaNode[] = symbols.length > 0
    ? [
        {
          id: "node.jsdoc",
          kind: "group",
          title: "JSDoc",
          symbolIds: symbols.map((symbol) => symbol.id),
          children: []
        }
      ]
    : [];
  const documentDiagnostics = [
    ...mapDiagnostics(integration.diagnostics, "diagnostics"),
    ...diagnostics
  ];
  const documentInput = {
    id: options.documentId ?? "jsdoc.integration",
    title: options.title ?? "JSDoc Integration",
    defaultLocale,
    locales,
    nodes: documentNodes,
    symbols,
    diagnostics: documentDiagnostics,
    metadata: {
      adapter: "parser-jsdoc",
      source: "jsdoc",
      integration: {
        contract: integration.contract ?? "",
        contractVersion: integration.contractVersion ?? "",
        pluginVersion: integration.pluginVersion ?? "",
        mode: integration.mode ?? "",
        irVersion: integration.ir?.version ?? "",
        parserBoundary: sanitizeMetadata(integration.parserBoundary ?? {}),
        docletNodeMap: sanitizeMetadata(integration.docletNodeMap ?? []),
        sourceFragments: sanitizeMetadata(integration.sourceFragments ?? []),
        localizationResources: sanitizeMetadata(integration.localizationResources ?? []),
        diagnosticCounts: sanitizeMetadata(integration.diagnosticCounts ?? {})
      }
    }
  };

  if (fallbackLocale) {
    Object.assign(documentInput, { fallbackLocale });
  }

  const document = createHiaDocument(documentInput);

  return {
    document,
    diagnostics: documentDiagnostics
  };
}

export const fromJSDocIntegration = convertJSDocIntegrationToHiaDocument;

function mapIntegrationNodeToSymbol(
  node: unknown,
  index: number,
  defaultLocale: string,
  fallbackLocale: HiaFallbackLocale | undefined,
  locales: string[],
  diagnostics: HiaDiagnostic[]
): HiaSymbol | null {
  if (!isRecord(node)) {
    diagnostics.push(createDiagnostic(
      "HIA_JSDOC_NODE_INVALID",
      "JSDoc integration node must be an object.",
      "warning",
      `ir.nodes.${index}`
    ));
    return null;
  }

  const kind = stringValue(node.kind) || "unknown";
  const id = stringValue(node.id) || `jsdoc:${kind}:${index}`;
  const longname = stringValue(node.longname);
  const name = stringValue(node.name) || longname || id;
  const i18n = mapI18nModel(node.i18n, defaultLocale, fallbackLocale, locales);
  const symbol: HiaSymbol = {
    id,
    name,
    kind,
    summary: chooseSummary(node, i18n, defaultLocale),
    metadata: {
      adapter: "parser-jsdoc",
      jsdoc: sanitizeMetadata(node.jsdoc ?? {}),
      hia: sanitizeMetadata(node.hia ?? {})
    }
  };
  const source = mapSourceMetadata(node.source);
  const nodeDiagnostics = mapDiagnostics(node.diagnostics, `symbols.${index}.diagnostics`);

  if (longname) {
    symbol.longname = longname;
  }

  const path = findFirstString([node], "i18n.path");
  if (path) {
    symbol.path = path.split(".").filter(Boolean);
  }

  if (i18n) {
    symbol.i18n = i18n;
  }

  if (source) {
    symbol.source = source;
  }

  if (nodeDiagnostics.length > 0) {
    symbol.diagnostics = nodeDiagnostics;
  }

  return symbol;
}

function mapI18nModel(
  value: unknown,
  defaultLocale: string,
  fallbackLocale: HiaFallbackLocale | undefined,
  locales: string[]
): HiaI18nModel | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fields = mapI18nFields(value.fields, defaultLocale, {
    descriptionKey: stringValue(value.key),
    descriptionPath: stringValue(value.path)
  });
  const model: HiaI18nModel = {
    enabled: value.enabled !== false,
    model: HIA_TEXT_I18N_MODEL,
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale: stringValue(value.defaultLocale) || defaultLocale,
    locales: collectStringArray(value.locales, locales),
    fields
  };
  const resolvedFallbackLocale = value.fallbackLocale ?? fallbackLocale;
  const mode = stringValue(value.mode);
  const resources = mapI18nResources(value.resources);
  const diagnostics = mapDiagnostics(value.diagnostics, "i18n.diagnostics");

  if (resolvedFallbackLocale) {
    const normalizedFallbackLocale = normalizeFallbackLocale(resolvedFallbackLocale);

    if (normalizedFallbackLocale) {
      model.fallbackLocale = normalizedFallbackLocale;
    }
  }

  if (mode) {
    model.mode = mode;
  }

  if (resources.length > 0) {
    model.resources = resources;
  }

  if (diagnostics.length > 0) {
    model.diagnostics = diagnostics;
  }

  return model;
}

function mapI18nFields(
  value: unknown,
  defaultLocale: string,
  options: { descriptionKey?: string; descriptionPath?: string } = {}
): Record<string, HiaI18nField> {
  if (!isRecord(value)) {
    return {};
  }

  const fields: Record<string, HiaI18nField> = {};

  for (const [fieldPath, rawField] of Object.entries(value)) {
    if (!isRecord(rawField)) {
      continue;
    }

    const localizedText = mapLocalizedText(rawField.localizedText);
    const defaultText = stringValue(rawField.defaultText);

    if (Object.keys(localizedText).length === 0 && defaultText) {
      localizedText[defaultLocale] = defaultText;
    }

    const field: HiaI18nField = {
      fieldPath: stringValue(rawField.fieldPath) || fieldPath,
      kind: stringValue(rawField.kind) || fieldPath,
      defaultLocale: stringValue(rawField.defaultLocale) || defaultLocale,
      localizedText
    };
    const key = stringValue(rawField.key) || (fieldPath === "description" ? options.descriptionKey || "" : "");
    const path = stringValue(rawField.path) || (fieldPath === "description" ? options.descriptionPath || "" : "");
    const source = stringValue(rawField.source);
    const blocks = mapLangBlocks(rawField.blocks, field.fieldPath);
    const segments = mapLangInlineSegments(rawField.segments, field.fieldPath);
    const resolutions = mapTextResolutions(rawField.resolutions);
    const missingLocales = collectStringArray(rawField.missingLocales);

    if (key) {
      field.key = key;
    }

    if (path) {
      field.path = path;
    }

    if (defaultText) {
      field.defaultText = defaultText;
    }

    if (source) {
      field.source = source;
    }

    if (blocks.length > 0) {
      field.blocks = blocks;
    }

    if (segments.length > 0) {
      field.segments = segments;
    }

    if (Object.keys(resolutions).length > 0) {
      field.resolutions = resolutions;
    }

    if (missingLocales.length > 0) {
      field.missingLocales = missingLocales;
    }

    fields[fieldPath] = field;
  }

  return fields;
}

function mapSourceMetadata(value: unknown): HiaSourceMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const source: HiaSourceMetadata = {
    model: HIA_SOURCE_MODEL,
    modelVersion: HIA_SOURCE_MODEL_VERSION,
    mode: toSourceMode(value.mode)
  };
  const definedIn = mapSourceDefinedIn(value.definedIn);
  const primaryBlock = mapSourcePrimaryBlock(value.primaryBlock);
  const references = mapSourceReferences(value.references);
  const fragments = mapSourceFragments(value.fragments);
  const diagnostics = mapDiagnostics(value.diagnostics, "source.diagnostics");

  if (definedIn) {
    source.definedIn = definedIn;
  }

  if (value.primaryBlock === null) {
    source.primaryBlock = null;
  } else if (primaryBlock) {
    source.primaryBlock = primaryBlock;
  }

  if (references.length > 0) {
    source.references = references;
  }

  if (fragments.length > 0) {
    source.fragments = fragments;
  }

  if (diagnostics.length > 0) {
    source.diagnostics = diagnostics;
  }

  return source;
}

function mapSourceDefinedIn(value: unknown): HiaSourceDefinedIn | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const relativePath = toRelativePath(value.relativePath);
  const position = mapPosition(value.position);

  if (!relativePath || !position) {
    return undefined;
  }

  const definedIn: HiaSourceDefinedIn = {
    kind: "defined-in",
    relativePath,
    position
  };
  const language = stringValue(value.language);
  const range = mapRange(value.range);
  const link = mapSourceLink(value.link);

  if (language) {
    definedIn.language = language;
  }

  if (range) {
    definedIn.range = range;
  }

  if (link) {
    definedIn.link = link;
  }

  return definedIn;
}

function mapSourcePrimaryBlock(value: unknown): HiaSourcePrimaryBlock | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const content = stringValue(value.content);
  const primaryBlock: HiaSourcePrimaryBlock = {
    kind: "primary-block",
    content,
    rangeSource: toRangeSource(value.rangeSource),
    confidence: toConfidence(value.confidence)
  };
  const id = stringValue(value.id);
  const relativePath = toRelativePath(value.relativePath);
  const language = stringValue(value.language);
  const range = mapRange(value.range);
  const link = mapSourceLink(value.link);
  const preview = mapSourcePreview(value.preview);
  const diagnostics = mapDiagnostics(value.diagnostics, "source.primaryBlock.diagnostics");

  if (id) {
    primaryBlock.id = id;
  }

  if (relativePath) {
    primaryBlock.relativePath = relativePath;
  }

  if (language) {
    primaryBlock.language = language;
  }

  if (range) {
    primaryBlock.range = range;
  }

  if (link) {
    primaryBlock.link = link;
  }

  if (preview) {
    primaryBlock.preview = preview;
  }

  if (diagnostics.length > 0) {
    primaryBlock.diagnostics = diagnostics;
  }

  return primaryBlock;
}

function mapSourceReferences(value: unknown): HiaSourceReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): HiaSourceReference | null => {
      if (!isRecord(item)) {
        return null;
      }

      const targetId = stringValue(item.targetId);

      if (!targetId) {
        return null;
      }

      const reference: HiaSourceReference = {
        kind: "source-reference",
        referenceKind: stringValue(item.referenceKind) || "coderef",
        targetId,
        resolved: item.resolved === true
      };
      const sourceNodeId = stringValue(item.sourceNodeId);
      const fieldPath = stringValue(item.fieldPath);
      const fragment = mapSourceFragment(item.fragment);
      const diagnostics = mapDiagnostics(item.diagnostics, "source.references.diagnostics");

      if (sourceNodeId) {
        reference.sourceNodeId = sourceNodeId;
      }

      if (fieldPath) {
        reference.fieldPath = fieldPath;
      }

      if (fragment) {
        reference.fragment = fragment;
      }

      if (diagnostics.length > 0) {
        reference.diagnostics = diagnostics;
      }

      return reference;
    })
    .filter((item): item is HiaSourceReference => Boolean(item));
}

function mapSourceFragments(value: unknown): HiaSourceFragment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => mapSourceFragment(item))
    .filter((item): item is HiaSourceFragment => Boolean(item));
}

function mapSourceFragment(value: unknown): HiaSourceFragment | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = stringValue(value.id);
  const relativePath = toRelativePath(value.relativePath);
  const range = mapRange(value.range);

  if (!id || !relativePath || !range) {
    return undefined;
  }

  const fragment: HiaSourceFragment = {
    kind: "source-fragment",
    id,
    relativePath,
    range,
    content: stringValue(value.content),
    rangeSource: toRangeSource(value.rangeSource) === "unresolved" ? "manual" : toRangeSource(value.rangeSource),
    confidence: toConfidence(value.confidence) === "none" ? "high" : toConfidence(value.confidence)
  };
  const language = stringValue(value.language);
  const origin = isRecord(value.origin) ? sanitizeMetadata(value.origin) : undefined;
  const link = mapSourceLink(value.link);
  const preview = mapSourcePreview(value.preview);
  const diagnostics = mapDiagnostics(value.diagnostics, "source.fragments.diagnostics");

  if (language) {
    fragment.language = language;
  }

  if (isRecord(origin)) {
    fragment.origin = origin;
  }

  if (link) {
    fragment.link = link;
  }

  if (preview) {
    fragment.preview = preview;
  }

  if (diagnostics.length > 0) {
    fragment.diagnostics = diagnostics;
  }

  return fragment;
}

function mapSourceLink(value: unknown): HiaSourceLink | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const link: HiaSourceLink = {
    enabled: value.enabled !== false
  };
  const fileUrl = stringValue(value.fileUrl);
  const lineUrl = stringValue(value.lineUrl);
  const openMode = stringValue(value.openMode);

  if (fileUrl) {
    link.fileUrl = fileUrl;
  }

  if (lineUrl) {
    link.lineUrl = lineUrl;
  }

  if (openMode) {
    link.openMode = openMode;
  }

  return link;
}

function mapSourcePreview(value: unknown): HiaSourcePreview | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const preview: HiaSourcePreview = {
    enabled: value.enabled !== false
  };
  const content = stringValue(value.content);
  const language = stringValue(value.language);
  const range = mapRange(value.range);

  if (typeof value.defaultExpanded === "boolean") {
    preview.defaultExpanded = value.defaultExpanded;
  }

  if (content) {
    preview.content = content;
  }

  if (language) {
    preview.language = language;
  }

  if (range) {
    preview.range = range;
  }

  return preview;
}

function mapPosition(value: unknown): HiaSourcePosition | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const line = numberValue(value.line);

  if (!Number.isInteger(line) || line < 1) {
    return undefined;
  }

  const position: HiaSourcePosition = { line };
  const column = numberValue(value.column);

  if (Number.isInteger(column) && column > 0) {
    position.column = column;
  }

  return position;
}

function mapRange(value: unknown): HiaSourceRange | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const start = mapPosition(value.start);
  const end = mapPosition(value.end);

  if (!start || !end) {
    return undefined;
  }

  return {
    start,
    end
  };
}

function mapLangBlocks(value: unknown, fallbackFieldPath: string): HiaLangBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): HiaLangBlock | null => {
      if (!isRecord(item)) {
        return null;
      }

      const locale = stringValue(item.locale);
      const text = stringValue(item.text);

      if (!locale || !text) {
        return null;
      }

      const block: HiaLangBlock = {
        kind: "lang-block",
        locale,
        fieldPath: stringValue(item.fieldPath) || fallbackFieldPath,
        text
      };
      const source = stringValue(item.source);
      const rangeInComment = mapTextRange(item.rangeInComment);

      if (source) {
        block.source = source;
      }

      if (rangeInComment) {
        block.rangeInComment = rangeInComment;
      }

      return block;
    })
    .filter((item): item is HiaLangBlock => Boolean(item));
}

function mapLangInlineSegments(value: unknown, fallbackFieldPath: string): HiaLangInlineSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): HiaLangInlineSegment | null => {
      if (!isRecord(item)) {
        return null;
      }

      const localized = mapLocalizedText(item.localized);

      if (Object.keys(localized).length === 0) {
        return null;
      }

      const segment: HiaLangInlineSegment = {
        kind: "lang-inline",
        id: stringValue(item.id) || `${fallbackFieldPath}.${index}`,
        fieldPath: stringValue(item.fieldPath) || fallbackFieldPath,
        raw: stringValue(item.raw),
        localized
      };
      const key = stringValue(item.key);
      const path = stringValue(item.path);
      const rangeInField = mapTextRange(item.rangeInField);

      if (key) {
        segment.key = key;
      }

      if (path) {
        segment.path = path;
      }

      if (rangeInField) {
        segment.rangeInField = rangeInField;
      }

      return segment;
    })
    .filter((item): item is HiaLangInlineSegment => Boolean(item));
}

function mapTextRange(value: unknown): { start: number; end: number } | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const start = numberValue(value.start);
  const end = numberValue(value.end);

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return undefined;
  }

  return {
    start,
    end
  };
}

function mapTextResolutions(value: unknown): Record<string, HiaTextResolution> {
  if (!isRecord(value)) {
    return {};
  }

  const resolutions: Record<string, HiaTextResolution> = {};

  for (const [locale, rawResolution] of Object.entries(value)) {
    if (!isRecord(rawResolution)) {
      continue;
    }

    const requestedLocale = stringValue(rawResolution.requestedLocale) || locale;
    const resolvedLocale = stringValue(rawResolution.resolvedLocale) || requestedLocale;
    resolutions[locale] = {
      requestedLocale,
      resolvedLocale,
      fallbackChain: collectStringArray(rawResolution.fallbackChain, [requestedLocale]),
      usedFallback: rawResolution.usedFallback === true,
      missing: rawResolution.missing === true
    };
  }

  return resolutions;
}

function mapI18nResources(value: unknown): HiaI18nResource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): HiaI18nResource | null => {
      if (!isRecord(item)) {
        return null;
      }

      const path = toRelativePath(item.path) || stringValue(item.name) || "";

      if (!path) {
        return null;
      }

      const resource: HiaI18nResource = { path };
      const kind = stringValue(item.kind);
      const locale = stringValue(item.locale);
      const format = stringValue(item.format);
      const fields = collectStringArray(item.fields);

      if (kind) {
        resource.kind = kind;
      }

      if (locale) {
        resource.locale = locale;
      }

      if (format) {
        resource.format = format;
      }

      if (fields.length > 0) {
        resource.fields = fields;
      }

      return resource;
    })
    .filter((item): item is HiaI18nResource => Boolean(item));
}

function mapLocalizedText(value: unknown): HiaLocalizedText {
  if (!isRecord(value)) {
    return {};
  }

  const localizedText: HiaLocalizedText = {};

  for (const [locale, text] of Object.entries(value)) {
    if (typeof text === "string") {
      localizedText[locale] = text;
    }
  }

  return localizedText;
}

function mapDiagnostics(value: unknown, targetPathPrefix: string): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): HiaDiagnostic | null => {
      if (!isRecord(item)) {
        return null;
      }

      const diagnostic = createDiagnostic(
        stringValue(item.code) || "HIA_JSDOC_ADAPTER_DIAGNOSTIC",
        stringValue(item.message) || "JSDoc adapter diagnostic.",
        toSeverity(item.severity),
        stringValue(item.targetPath) || `${targetPathPrefix}.${index}`
      );
      const path = stringValue(item.path);

      if (path) {
        diagnostic.path = path;
      }

      return diagnostic;
    })
    .filter((item): item is HiaDiagnostic => Boolean(item));
}

function chooseSummary(node: Record<string, unknown>, i18n: HiaI18nModel | undefined, defaultLocale: string): string {
  const field = i18n?.fields.description;
  return field?.localizedText[defaultLocale] ?? field?.defaultText ?? stringValue(node.summary) ?? stringValue(node.title) ?? "";
}

function collectLocales(nodes: unknown[], optionsLocales: string[] | undefined, defaultLocale: string): string[] {
  const locales: string[] = [];

  for (const locale of optionsLocales ?? []) {
    pushUnique(locales, locale);
  }

  pushUnique(locales, defaultLocale);

  for (const node of nodes) {
    if (!isRecord(node) || !isRecord(node.i18n)) {
      continue;
    }

    for (const locale of collectStringArray(node.i18n.locales)) {
      pushUnique(locales, locale);
    }
  }

  return locales;
}

function findFirstString(nodes: unknown[], path: string): string | undefined {
  const segments = path.split(".");

  for (const node of nodes) {
    let current: unknown = node;

    for (const segment of segments) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }

      current = current[segment];
    }

    const value = stringValue(current);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function findFirstFallbackLocale(nodes: unknown[]): HiaFallbackLocale | undefined {
  for (const node of nodes) {
    if (!isRecord(node) || !isRecord(node.i18n)) {
      continue;
    }

    const fallbackLocale = normalizeFallbackLocale(node.i18n.fallbackLocale);
    if (fallbackLocale) {
      return fallbackLocale;
    }
  }

  return undefined;
}

function normalizeFallbackLocale(value: unknown): HiaFallbackLocale | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  const values = collectStringArray(value);

  return values.length > 0 ? values : undefined;
}

function collectStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result: string[] = [];

  for (const item of value) {
    const text = stringValue(item);
    if (text) {
      pushUnique(result, text);
    }
  }

  return result.length > 0 ? result : fallback;
}

function pushUnique(items: string[], value: string): void {
  if (value && !items.includes(value)) {
    items.push(value);
  }
}

function toSourceMode(value: unknown): HiaSourceMode {
  return value === "none" || value === "link" || value === "include" || value === "all"
    ? value
    : "all";
}

function toRangeSource(value: unknown): HiaSourceRangeSource {
  return value === "heuristic" || value === "parser" || value === "parser-js" || value === "jsdoc-meta" || value === "manual" || value === "unresolved"
    ? value
    : "unresolved";
}

function toConfidence(value: unknown): HiaSourceConfidence {
  return value === "high" || value === "medium" || value === "low" || value === "none"
    ? value
    : "none";
}

function toSeverity(value: unknown): HiaDiagnosticSeverity {
  return value === "info" || value === "warning" || value === "error" ? value : "warning";
}

function toRelativePath(value: unknown): string {
  const text = stringValue(value).replace(/\\/g, "/");

  return isUnsafePathLike(text) ? "" : text;
}

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item)).filter((item) => item !== undefined);
  }

  if (isRecord(value)) {
    const record: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (/filePath$/i.test(key)) {
        continue;
      }

      const sanitized = sanitizeMetadata(item);
      if (sanitized !== undefined) {
        record[key] = sanitized;
      }
    }

    return record;
  }

  if (typeof value === "string" && isUnsafePathLike(value)) {
    return undefined;
  }

  return value;
}

function isUnsafePathLike(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");

  return /^[A-Za-z]:[\\/]/.test(value)
    || normalized.startsWith("/")
    || normalized.startsWith("//")
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..");
}

function createDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string
): HiaDiagnostic {
  const diagnostic: HiaDiagnostic = {
    code,
    message,
    severity
  };

  if (targetPath) {
    diagnostic.targetPath = targetPath;
    diagnostic.path = targetPath;
  }

  return diagnostic;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
