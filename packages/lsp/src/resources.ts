import type {
  HiaDocument,
  HiaSourceBlock,
  HiaSourceFragment,
  HiaSourcePrimaryBlock,
  HiaSourceReference,
  HiaSourceRange,
  HiaSymbol
} from "@hia-doc/core";

export const HIA_LSP_RESOURCE_INDEX_REQUEST = "hia/documentResourceIndex";

export interface HiaDocumentResourceIndexParams {
  uri: string;
}

export interface HiaLspResourceIndex {
  defaultLocale?: string;
  documentId?: string;
  i18nKeys: HiaLspI18nKeyLocation[];
  i18nResources: HiaLspI18nResourceLocation[];
  locales: string[];
  missingLocales: HiaLspMissingLocaleLocation[];
  sourceBlocks: HiaLspSourceBlockLocation[];
  sourceFragments: HiaLspSourceFragmentLocation[];
  sourceReferences: HiaLspSourceReferenceLocation[];
  title?: string;
  uri?: string;
}

export interface HiaLspI18nResourceLocation {
  fields: string[];
  format?: string;
  kind?: string;
  locale?: string;
  resourcePath: string;
  symbolId: string;
  symbolName: string;
}

export interface HiaLspI18nKeyLocation {
  fieldPath: string;
  key?: string;
  locales: string[];
  path?: string;
  segmentId?: string;
  source: "field" | "segment";
  symbolId: string;
  symbolName: string;
}

export interface HiaLspMissingLocaleLocation {
  fieldPath: string;
  locale: string;
  symbolId: string;
  symbolName: string;
}

export interface HiaLspSourceReferenceLocation {
  fieldPath?: string;
  fragment?: HiaLspSourceFragmentLocation;
  referenceKind: string;
  resolved: boolean;
  sourceNodeId?: string;
  symbolId: string;
  symbolName: string;
  targetId: string;
}

export interface HiaLspSourceFragmentLocation {
  confidence?: string;
  fragmentId: string;
  range: HiaSourceRange;
  rangeSource?: string;
  relativePath: string;
  symbolId: string;
  symbolName: string;
}

export interface HiaLspSourceBlockLocation {
  blockId?: string;
  blockKind: HiaSourceBlock["kind"];
  confidence: string;
  previewEnabled?: boolean;
  range?: HiaSourceRange;
  rangeSource: string;
  relativePath?: string;
  symbolId: string;
  symbolName: string;
}

export interface HiaResourceIndexOptions {
  uri?: string;
}

export function createEmptyHiaResourceIndex(options: HiaResourceIndexOptions = {}): HiaLspResourceIndex {
  const index: HiaLspResourceIndex = {
    i18nKeys: [],
    i18nResources: [],
    locales: [],
    missingLocales: [],
    sourceBlocks: [],
    sourceFragments: [],
    sourceReferences: []
  };

  if (options.uri) {
    index.uri = options.uri;
  }

  return index;
}

export function createHiaResourceIndex(document: HiaDocument, options: HiaResourceIndexOptions = {}): HiaLspResourceIndex {
  const index = createEmptyHiaResourceIndex(options);

  index.documentId = document.id;
  index.title = document.title;
  index.defaultLocale = document.defaultLocale;
  index.locales = [...document.locales];

  for (const symbol of document.symbols) {
    collectI18nResources(symbol, index);
    collectI18nKeys(symbol, index);
    collectSourceBlocks(symbol, index);
    collectSourceReferences(symbol, index);
    collectSourceFragments(symbol, index);
  }

  return index;
}

export function findI18nKeyLocations(index: HiaLspResourceIndex, key: string): HiaLspI18nKeyLocation[] {
  return index.i18nKeys.filter((item) => item.key === key);
}

function collectI18nResources(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  const i18n = symbol.i18n;

  if (!i18n) {
    return;
  }

  for (const resource of i18n.resources || []) {
    const item: HiaLspI18nResourceLocation = {
      fields: resource.fields ? [...resource.fields] : Object.keys(i18n.fields),
      resourcePath: resource.path,
      symbolId: symbol.id,
      symbolName: symbol.name
    };

    if (resource.locale) {
      item.locale = resource.locale;
    }

    if (resource.kind) {
      item.kind = resource.kind;
    }

    if (resource.format) {
      item.format = resource.format;
    }

    index.i18nResources.push(item);
  }
}

function collectI18nKeys(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  for (const [fieldPath, field] of Object.entries(symbol.i18n?.fields || {})) {
    if (field.key || field.path) {
      const item: HiaLspI18nKeyLocation = {
        fieldPath,
        locales: Object.keys(field.localizedText),
        source: "field",
        symbolId: symbol.id,
        symbolName: symbol.name
      };

      if (field.key) {
        item.key = field.key;
      }

      if (field.path) {
        item.path = field.path;
      }

      index.i18nKeys.push(item);
    }

    for (const locale of field.missingLocales || []) {
      index.missingLocales.push({
        fieldPath,
        locale,
        symbolId: symbol.id,
        symbolName: symbol.name
      });
    }

    for (const segment of field.segments || []) {
      if (!segment.key && !segment.path) {
        continue;
      }

      const item: HiaLspI18nKeyLocation = {
        fieldPath,
        locales: Object.keys(segment.localized),
        segmentId: segment.id,
        source: "segment",
        symbolId: symbol.id,
        symbolName: symbol.name
      };

      if (segment.key) {
        item.key = segment.key;
      }

      if (segment.path) {
        item.path = segment.path;
      }

      index.i18nKeys.push(item);
    }
  }
}

function collectSourceReferences(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  for (const reference of symbol.source?.references || []) {
    const item: HiaLspSourceReferenceLocation = {
      referenceKind: reference.referenceKind,
      resolved: reference.resolved,
      symbolId: symbol.id,
      symbolName: symbol.name,
      targetId: reference.targetId
    };

    if (reference.fieldPath) {
      item.fieldPath = reference.fieldPath;
    }

    if (reference.sourceNodeId) {
      item.sourceNodeId = reference.sourceNodeId;
    }

    if (reference.fragment) {
      item.fragment = createSourceFragmentLocation(symbol, reference.fragment);
    }

    index.sourceReferences.push(item);
  }
}

function collectSourceBlocks(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  const primaryBlock = symbol.source?.primaryBlock;

  if (primaryBlock) {
    pushUniqueSourceBlock(index, createSourceBlockLocation(symbol, primaryBlock));
  }

  for (const fragment of symbol.source?.fragments || []) {
    pushUniqueSourceBlock(index, createSourceBlockLocation(symbol, fragment));
  }

  for (const reference of symbol.source?.references || []) {
    if (reference.fragment) {
      pushUniqueSourceBlock(index, createSourceBlockLocation(symbol, reference.fragment));
    }
  }
}

function collectSourceFragments(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  for (const fragment of symbol.source?.fragments || []) {
    pushUniqueSourceFragment(index, createSourceFragmentLocation(symbol, fragment));
  }

  for (const reference of symbol.source?.references || []) {
    if (reference.fragment) {
      pushUniqueSourceFragment(index, createSourceFragmentLocation(symbol, reference.fragment));
    }
  }
}

function createSourceFragmentLocation(symbol: HiaSymbol, fragment: HiaSourceFragment): HiaLspSourceFragmentLocation {
  return {
    confidence: fragment.confidence,
    fragmentId: fragment.id,
    range: fragment.range,
    rangeSource: fragment.rangeSource,
    relativePath: fragment.relativePath,
    symbolId: symbol.id,
    symbolName: symbol.name
  };
}

function createSourceBlockLocation(symbol: HiaSymbol, block: HiaSourcePrimaryBlock | HiaSourceFragment): HiaLspSourceBlockLocation {
  const item: HiaLspSourceBlockLocation = {
    blockKind: block.kind,
    confidence: block.confidence,
    rangeSource: block.rangeSource,
    symbolId: symbol.id,
    symbolName: symbol.name
  };

  if (block.id) {
    item.blockId = block.id;
  }

  if (block.relativePath) {
    item.relativePath = block.relativePath;
  }

  if (block.range) {
    item.range = block.range;
  }

  if (block.preview) {
    item.previewEnabled = block.preview.enabled;
  }

  return item;
}

function pushUniqueSourceBlock(index: HiaLspResourceIndex, item: HiaLspSourceBlockLocation): void {
  const key = [
    item.symbolId,
    item.blockKind,
    item.blockId || "",
    item.relativePath || "",
    item.range?.start.line ?? "",
    item.range?.end.line ?? ""
  ].join("\u0000");
  const exists = index.sourceBlocks.some((existing) => [
    existing.symbolId,
    existing.blockKind,
    existing.blockId || "",
    existing.relativePath || "",
    existing.range?.start.line ?? "",
    existing.range?.end.line ?? ""
  ].join("\u0000") === key);

  if (!exists) {
    index.sourceBlocks.push(item);
  }
}

function pushUniqueSourceFragment(index: HiaLspResourceIndex, item: HiaLspSourceFragmentLocation): void {
  const key = [
    item.symbolId,
    item.fragmentId,
    item.relativePath,
    item.range.start.line,
    item.range.end.line
  ].join("\u0000");
  const exists = index.sourceFragments.some((existing) => [
    existing.symbolId,
    existing.fragmentId,
    existing.relativePath,
    existing.range.start.line,
    existing.range.end.line
  ].join("\u0000") === key);

  if (!exists) {
    index.sourceFragments.push(item);
  }
}
