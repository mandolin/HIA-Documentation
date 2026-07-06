import type {
  HiaDocument,
  HiaSourceFragment,
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
  sourceFragments: HiaLspSourceFragmentLocation[];
  sourceReferences: HiaLspSourceReferenceLocation[];
  title?: string;
  uri?: string;
}

export interface HiaLspI18nResourceLocation {
  fields: string[];
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
  segmentId: string;
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
  fragmentId: string;
  range: HiaSourceRange;
  relativePath: string;
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

    index.i18nResources.push(item);
  }
}

function collectI18nKeys(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  for (const [fieldPath, field] of Object.entries(symbol.i18n?.fields || {})) {
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

function collectSourceFragments(symbol: HiaSymbol, index: HiaLspResourceIndex): void {
  for (const fragment of symbol.source?.fragments || []) {
    index.sourceFragments.push(createSourceFragmentLocation(symbol, fragment));
  }

  for (const reference of symbol.source?.references || []) {
    if (reference.fragment) {
      index.sourceFragments.push(createSourceFragmentLocation(symbol, reference.fragment));
    }
  }
}

function createSourceFragmentLocation(symbol: HiaSymbol, fragment: HiaSourceFragment): HiaLspSourceFragmentLocation {
  return {
    fragmentId: fragment.id,
    range: fragment.range,
    relativePath: fragment.relativePath,
    symbolId: symbol.id,
    symbolName: symbol.name
  };
}
