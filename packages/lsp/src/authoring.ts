import type {
  CompletionItem,
  DiagnosticRelatedInformation,
  FoldingRange,
  Hover,
  Location,
  MarkupContent,
  Position,
  Range
} from "vscode-languageserver/node.js";
import {
  CompletionItemKind,
  MarkupKind
} from "vscode-languageserver/node.js";
import type {
  Diagnostic
} from "vscode-languageserver/node.js";
import type {
  HiaSourceRange
} from "@hia-doc/core";
import {
  HiaLspDiagnosticCode
} from "./diagnostics.js";
import type {
  HiaLspMissingLocaleLocation,
  HiaLspResourceIndex
} from "./resources.js";

export const HIA_LSP_IDE_CAPABILITIES_REQUEST = "hia/ideCapabilities";
export const HIA_LSP_AUTHORING_LOCATIONS_REQUEST = "hia/documentAuthoringLocations";
export const HIA_LSP_RESOURCE_ACTIONS_REQUEST = "hia/resourceActions";

export const HiaIdeCapabilityId = {
  DiagnosticsDocument: "hia.diagnostics.document",
  DiagnosticsResource: "hia.diagnostics.resource",
  ResourceIndex: "hia.resource.index",
  ResourceLocation: "hia.resource.location",
  CompletionI18n: "hia.completion.i18n",
  CompletionSource: "hia.completion.source",
  HoverSymbol: "hia.hover.symbol",
  HoverResource: "hia.hover.resource",
  DefinitionResource: "hia.definition.resource",
  DefinitionSource: "hia.definition.source",
  FoldingDocument: "hia.folding.document",
  CodeActionResourceOpen: "hia.codeAction.resource.open",
  CodeActionResourceStub: "hia.codeAction.resource.stub",
  CommandBuildDocs: "hia.command.buildDocs",
  CommandOpenPreview: "hia.command.openPreview",
  CommandValidateWorkspace: "hia.command.validateWorkspace"
} as const;

export type HiaIdeCapabilityId = typeof HiaIdeCapabilityId[keyof typeof HiaIdeCapabilityId];

export type HiaIdeCapabilityStatus = "available" | "partial" | "planned" | "unsupported";
export type HiaIdeCapabilityOwner = "core" | "lsp" | "cli" | "renderer" | "vscode";

export interface HiaIdeCapability {
  id: HiaIdeCapabilityId;
  owner: HiaIdeCapabilityOwner;
  status: HiaIdeCapabilityStatus;
  reason?: string;
}

export interface HiaIdeCapabilitiesParams {
  uri: string;
}

export interface HiaDocumentAuthoringLocationsParams {
  uri: string;
}

export interface HiaDocumentResourceActionsParams {
  uri: string;
}

export interface HiaIdeCapabilitiesResult {
  capabilities: HiaIdeCapability[];
  uri: string;
}

export interface HiaDocumentAuthoringLocationsResult {
  locations: HiaLspAuthoringLocation[];
  uri: string;
}

export interface HiaDocumentResourceActionsResult {
  actions: HiaLspResourceAction[];
  uri: string;
}

export interface HiaLspAuthoringDocument {
  diagnostics: Diagnostic[];
  resourceIndex: HiaLspResourceIndex;
  text: string;
  uri: string;
}

export interface HiaLspAuthoringContext {
  document?: HiaLspAuthoringDocument;
  uri: string;
  workspaceRoots: readonly string[];
}

export type HiaLspAuthoringLocationKind =
  | "core-document"
  | "i18n-field"
  | "i18n-resource"
  | "source-block"
  | "source-fragment"
  | "diagnostic-target";

export type HiaLspUnavailableReason =
  | "document-not-open"
  | "not-hia-document"
  | "resource-file-unknown"
  | "resource-key-missing"
  | "workspace-root-missing"
  | "relative-path-missing"
  | "unsafe-relative-path"
  | "source-fragment-missing"
  | "range-unavailable"
  | "diagnostic-target-unknown";

export type HiaLspResourceActionKind =
  | "open-resource"
  | "open-source"
  | "copy-resource-key"
  | "create-missing-locale-stub"
  | "explain-unavailable";

export type HiaLspResourceActionStatus = "available" | "preflight" | "blocked";
export type HiaLspResourceEditConflictStatus = "not-checked" | "none" | "conflict";

export interface HiaLspResourceStubPreview {
  key?: string;
  locale: string;
  path?: string;
  text: string;
}

export interface HiaLspResourceEditPreflight {
  conflictStatus: HiaLspResourceEditConflictStatus;
  editKind: "create-missing-locale-entry";
  requiresFileRead: boolean;
  resourcePath?: string;
  resourcePointer: string;
  rollback: "host-undo";
  stub: HiaLspResourceStubPreview;
  targetUri?: string;
  workspaceEditBoundary: "external-resource-only";
}

export interface HiaLspAuthoringLocation {
  capability?: HiaIdeCapabilityId;
  fieldPath?: string;
  kind: HiaLspAuthoringLocationKind;
  key?: string;
  locale?: string;
  path?: string;
  range?: Range;
  relativePath?: string;
  resourcePath?: string;
  resourcePointer?: string;
  segmentId?: string;
  sourceTargetId?: string;
  symbolId?: string;
  symbolName?: string;
  targetPath?: string;
  unavailableReason?: HiaLspUnavailableReason;
  uri?: string;
}

export interface HiaLspResourceAction {
  capability: HiaIdeCapabilityId;
  fieldPath?: string;
  id: string;
  key?: string;
  kind: HiaLspResourceActionKind;
  locale?: string;
  location?: HiaLspAuthoringLocation;
  path?: string;
  preflight?: HiaLspResourceEditPreflight;
  resourcePath?: string;
  resourcePointer?: string;
  status: HiaLspResourceActionStatus;
  symbolId?: string;
  symbolName?: string;
  targetUri?: string;
  title: string;
  unavailableReason?: HiaLspUnavailableReason;
}

export function createHiaIdeCapabilities(context: HiaLspAuthoringContext): HiaIdeCapabilitiesResult {
  const document = context.document;
  const index = document?.resourceIndex;
  const hasDocument = Boolean(document);
  const openableResourceLocations =
    (index?.i18nResources.length ?? 0) + (index?.sourceBlocks.length ?? 0) + (index?.sourceFragments.length ?? 0);

  return {
    uri: context.uri,
    capabilities: [
      implementedCapability(HiaIdeCapabilityId.DiagnosticsDocument, "lsp", hasDocument),
      implementedCapability(HiaIdeCapabilityId.DiagnosticsResource, "lsp", hasDocument),
      implementedCapability(HiaIdeCapabilityId.ResourceIndex, "lsp", hasDocument),
      dataBackedCapability(
        HiaIdeCapabilityId.ResourceLocation,
        "lsp",
        hasDocument,
        (index?.i18nResources.length ?? 0) + (index?.sourceBlocks.length ?? 0) + (index?.sourceFragments.length ?? 0)
      ),
      dataBackedCapability(
        HiaIdeCapabilityId.CompletionI18n,
        "lsp",
        hasDocument,
        (index?.locales.length ?? 0) + (index?.i18nKeys.length ?? 0) + (index?.i18nResources.length ?? 0)
      ),
      dataBackedCapability(
        HiaIdeCapabilityId.CompletionSource,
        "lsp",
        hasDocument,
        (index?.sourceReferences.length ?? 0) + (index?.sourceFragments.length ?? 0) + (index?.sourceBlocks.length ?? 0)
      ),
      implementedCapability(HiaIdeCapabilityId.HoverSymbol, "lsp", hasDocument),
      dataBackedCapability(
        HiaIdeCapabilityId.HoverResource,
        "lsp",
        hasDocument,
        (index?.i18nKeys.length ?? 0) + (index?.i18nResources.length ?? 0) + (index?.sourceReferences.length ?? 0)
      ),
      dataBackedCapability(HiaIdeCapabilityId.DefinitionResource, "lsp", hasDocument, index?.i18nResources.length ?? 0),
      dataBackedCapability(
        HiaIdeCapabilityId.DefinitionSource,
        "lsp",
        hasDocument,
        (index?.sourceBlocks.length ?? 0) + (index?.sourceFragments.length ?? 0)
      ),
      implementedCapability(HiaIdeCapabilityId.FoldingDocument, "lsp", hasDocument),
      dataBackedCapability(HiaIdeCapabilityId.CodeActionResourceOpen, "lsp", hasDocument, openableResourceLocations),
      dataBackedCapability(HiaIdeCapabilityId.CodeActionResourceStub, "lsp", hasDocument, index?.missingLocales.length ?? 0),
      plannedCapability(HiaIdeCapabilityId.CommandBuildDocs, "vscode", "Owned by the IDE shell and CLI."),
      plannedCapability(HiaIdeCapabilityId.CommandOpenPreview, "vscode", "Owned by the IDE shell and CLI/renderer manifest."),
      plannedCapability(HiaIdeCapabilityId.CommandValidateWorkspace, "vscode", "Owned by the IDE shell over LSP diagnostics and resource index.")
    ]
  };
}

export function createHiaAuthoringLocations(context: HiaLspAuthoringContext): HiaDocumentAuthoringLocationsResult {
  const document = context.document;

  if (!document) {
    return {
      uri: context.uri,
      locations: [
        {
          kind: "core-document",
          uri: context.uri,
          unavailableReason: "document-not-open"
        }
      ]
    };
  }

  const locations: HiaLspAuthoringLocation[] = [
    {
      capability: HiaIdeCapabilityId.DiagnosticsDocument,
      kind: "core-document",
      range: createZeroRange(),
      targetPath: "document",
      uri: document.uri
    }
  ];
  const index = document.resourceIndex;

  for (const item of index.i18nKeys) {
    const location: HiaLspAuthoringLocation = {
      capability: HiaIdeCapabilityId.ResourceLocation,
      fieldPath: item.fieldPath,
      kind: "i18n-field",
      range: createZeroRange(),
      symbolId: item.symbolId,
      symbolName: item.symbolName,
      targetPath: createI18nFieldTargetPath(item.symbolId, item.fieldPath, item.segmentId),
      uri: document.uri
    };

    if (item.key) {
      location.key = item.key;
    }

    if (item.path) {
      location.path = item.path;
    }

    if (item.segmentId) {
      location.segmentId = item.segmentId;
      location.sourceTargetId = item.segmentId;
    }

    locations.push(location);
  }

  for (const [resourceIndex, resource] of index.i18nResources.entries()) {
    const resolved = resolveRelativeFileUriWithReason(context.workspaceRoots, resource.resourcePath);
    const fields = resource.fields.length > 0 ? resource.fields : [undefined];

    for (const fieldPath of fields) {
      const keyLocation = fieldPath
        ? index.i18nKeys.find((item) => item.symbolId === resource.symbolId && item.fieldPath === fieldPath)
        : undefined;
      const location: HiaLspAuthoringLocation = {
        capability: HiaIdeCapabilityId.ResourceLocation,
        kind: "i18n-resource",
        relativePath: resource.resourcePath,
        resourcePath: resource.resourcePath,
        symbolId: resource.symbolId,
        symbolName: resource.symbolName,
        targetPath: createI18nResourceTargetPath(resource.symbolId, resourceIndex, fieldPath)
      };

      if (resolved.uri) {
        location.uri = resolved.uri;
        location.range = createZeroRange();
      }

      if (resolved.unavailableReason) {
        location.unavailableReason = resolved.unavailableReason;
      }

      if (resource.locale) {
        location.locale = resource.locale;
      }

      if (fieldPath) {
        location.fieldPath = fieldPath;
      }

      if (keyLocation?.key) {
        location.key = keyLocation.key;
      }

      if (keyLocation?.path) {
        location.path = keyLocation.path;
      }

      location.resourcePointer = createResourcePointer(resource.locale, keyLocation?.key, keyLocation?.path, fieldPath);
      locations.push(location);
    }
  }

  for (const [blockIndex, block] of index.sourceBlocks.entries()) {
    const relativePath = block.relativePath;
    const resolved = relativePath
      ? resolveRelativeFileUriWithReason(context.workspaceRoots, relativePath)
      : { unavailableReason: "relative-path-missing" as const };
    const location: HiaLspAuthoringLocation = {
      capability: HiaIdeCapabilityId.DefinitionSource,
      kind: "source-block",
      symbolId: block.symbolId,
      symbolName: block.symbolName,
      targetPath: createSourceBlockTargetPath(block.symbolId, blockIndex, block.blockId)
    };

    if (block.blockId) {
      location.sourceTargetId = block.blockId;
    }

    if (relativePath) {
      location.relativePath = relativePath;
    }

    if (resolved.uri) {
      location.uri = resolved.uri;
      location.range = block.range ? sourceRangeToLspRange(block.range) : createZeroRange();
    }

    if (block.range) {
      location.range = sourceRangeToLspRange(block.range);
    }

    if (resolved.unavailableReason) {
      location.unavailableReason = resolved.unavailableReason;
    } else if (!block.range) {
      location.unavailableReason = "range-unavailable";
    }

    locations.push(location);
  }

  for (const fragment of index.sourceFragments) {
    const resolved = resolveRelativeFileUriWithReason(context.workspaceRoots, fragment.relativePath);
    const location: HiaLspAuthoringLocation = {
      capability: HiaIdeCapabilityId.DefinitionSource,
      kind: "source-fragment",
      relativePath: fragment.relativePath,
      sourceTargetId: fragment.fragmentId,
      symbolId: fragment.symbolId,
      symbolName: fragment.symbolName,
      targetPath: createSourceFragmentTargetPath(fragment.symbolId, fragment.fragmentId)
    };

    if (resolved.uri) {
      location.uri = resolved.uri;
      location.range = sourceRangeToLspRange(fragment.range);
    }

    if (resolved.unavailableReason) {
      location.unavailableReason = resolved.unavailableReason;
    }

    locations.push(location);
  }

  for (const [referenceIndex, reference] of index.sourceReferences.entries()) {
    if (reference.fragment) {
      continue;
    }

    const location: HiaLspAuthoringLocation = {
      capability: HiaIdeCapabilityId.DiagnosticsResource,
      kind: "diagnostic-target",
      sourceTargetId: reference.targetId,
      symbolId: reference.symbolId,
      symbolName: reference.symbolName,
      targetPath: createSourceReferenceTargetPath(reference.symbolId, referenceIndex),
      unavailableReason: reference.resolved ? "range-unavailable" : "source-fragment-missing"
    };

    if (reference.fieldPath) {
      location.fieldPath = reference.fieldPath;
    }

    locations.push(location);
  }

  return {
    uri: document.uri,
    locations
  };
}

export function createHiaResourceActions(context: HiaLspAuthoringContext): HiaDocumentResourceActionsResult {
  const document = context.document;

  if (!document) {
    return {
      uri: context.uri,
      actions: [
        {
          capability: HiaIdeCapabilityId.CodeActionResourceOpen,
          id: "explain-unavailable:document-not-open",
          kind: "explain-unavailable",
          status: "blocked",
          title: "HIA: Explain unavailable resource actions",
          unavailableReason: "document-not-open"
        }
      ]
    };
  }

  const locations = createHiaAuthoringLocations(context).locations;
  const actions: HiaLspResourceAction[] = [];
  const seen = new Set<string>();

  for (const location of locations) {
    if (location.kind === "i18n-field") {
      pushCopyResourceKeyAction(actions, seen, location);
      continue;
    }

    if (location.kind === "i18n-resource") {
      pushOpenResourceAction(actions, seen, location);
      pushCopyResourceKeyAction(actions, seen, location);
      pushUnavailableResourceAction(actions, seen, location, HiaIdeCapabilityId.CodeActionResourceOpen);
      continue;
    }

    if (location.kind === "source-block" || location.kind === "source-fragment") {
      pushOpenSourceAction(actions, seen, location);
      pushUnavailableResourceAction(actions, seen, location, HiaIdeCapabilityId.CodeActionResourceOpen);
    }
  }

  for (const missingLocale of document.resourceIndex.missingLocales) {
    pushMissingLocaleStubAction(actions, seen, locations, missingLocale);
  }

  return {
    uri: document.uri,
    actions
  };
}

export function createHiaDiagnosticsWithRelatedInformation(context: HiaLspAuthoringContext): Diagnostic[] {
  const document = context.document;

  if (!document) {
    return [];
  }

  const locations = createHiaAuthoringLocations(context).locations;

  return document.diagnostics.map((diagnostic) => enrichDiagnostic(diagnostic, document.uri, locations));
}

export function createHiaCompletionItems(context: HiaLspAuthoringContext, _position?: Position): CompletionItem[] {
  const document = context.document;

  if (!document) {
    return [];
  }

  const items: CompletionItem[] = [];
  const seen = new Set<string>();
  const index = document.resourceIndex;

  for (const locale of index.locales) {
    pushCompletion(items, seen, `locale:${locale}`, {
      label: locale,
      kind: CompletionItemKind.Value,
      detail: "HIA locale",
      data: {
        capability: HiaIdeCapabilityId.CompletionI18n,
        source: "document.locales",
        locale
      }
    });
  }

  for (const item of index.i18nKeys) {
    if (item.key) {
      pushCompletion(items, seen, `i18n-key:${item.key}`, {
        label: item.key,
        kind: CompletionItemKind.Variable,
        detail: `HIA i18n key for ${item.symbolName}.${item.fieldPath}`,
        data: {
          capability: HiaIdeCapabilityId.CompletionI18n,
          source: item.source,
          symbolId: item.symbolId,
          fieldPath: item.fieldPath,
          key: item.key
        }
      });
    }

    if (item.path) {
      pushCompletion(items, seen, `i18n-path:${item.path}`, {
        label: item.path,
        kind: CompletionItemKind.Property,
        detail: `HIA i18n path for ${item.symbolName}.${item.fieldPath}`,
        data: {
          capability: HiaIdeCapabilityId.CompletionI18n,
          source: item.source,
          symbolId: item.symbolId,
          fieldPath: item.fieldPath,
          path: item.path
        }
      });
    }
  }

  for (const resource of index.i18nResources) {
    pushCompletion(items, seen, `i18n-resource:${resource.resourcePath}`, {
      label: resource.resourcePath,
      kind: CompletionItemKind.File,
      detail: `HIA i18n resource for ${resource.symbolName}`,
      data: {
        capability: HiaIdeCapabilityId.CompletionI18n,
        source: "i18n.resource",
        symbolId: resource.symbolId,
        resourcePath: resource.resourcePath,
        locale: resource.locale
      }
    });
  }

  for (const reference of index.sourceReferences) {
    pushCompletion(items, seen, `source-reference:${reference.targetId}`, {
      label: reference.targetId,
      kind: CompletionItemKind.Reference,
      detail: `HIA source reference for ${reference.symbolName}`,
      data: {
        capability: HiaIdeCapabilityId.CompletionSource,
        source: "source.reference",
        symbolId: reference.symbolId,
        targetId: reference.targetId,
        resolved: reference.resolved
      }
    });
  }

  for (const fragment of index.sourceFragments) {
    pushCompletion(items, seen, `source-fragment:${fragment.fragmentId}`, {
      label: fragment.fragmentId,
      kind: CompletionItemKind.Reference,
      detail: `HIA source fragment for ${fragment.symbolName}`,
      data: {
        capability: HiaIdeCapabilityId.CompletionSource,
        source: "source.fragment",
        symbolId: fragment.symbolId,
        fragmentId: fragment.fragmentId,
        relativePath: fragment.relativePath
      }
    });
  }

  return items;
}

export function createHiaHover(context: HiaLspAuthoringContext, _position?: Position): Hover | null {
  const document = context.document;

  if (!document) {
    return null;
  }

  const index = document.resourceIndex;
  const lines = [
    "### HIA Document",
    "",
    `- URI: \`${document.uri}\``,
    `- Document: \`${index.documentId || "unknown"}\``,
    `- Title: ${index.title || "Untitled"}`,
    `- Locales: ${index.locales.join(", ") || "none"}`,
    `- I18n resources: ${index.i18nResources.length}`,
    `- I18n keys: ${index.i18nKeys.length}`,
    `- Missing locales: ${index.missingLocales.length}`,
    `- Source references: ${index.sourceReferences.length}`,
    `- Source blocks: ${index.sourceBlocks.length}`
  ];
  const contents: MarkupContent = {
    kind: MarkupKind.Markdown,
    value: lines.join("\n")
  };

  return { contents };
}

export function createHiaDefinitionLocations(context: HiaLspAuthoringContext, _position?: Position): Location[] {
  const document = context.document;

  if (!document) {
    return [];
  }

  const locations: Location[] = [];
  const seen = new Set<string>();
  const authoringLocations = createHiaAuthoringLocations(context).locations.filter((location) => {
    return location.kind === "i18n-resource"
      || location.kind === "source-block"
      || location.kind === "source-fragment";
  });

  for (const location of authoringLocations) {
    if (!location.uri || !location.range) {
      continue;
    }

    pushLocation(locations, seen, {
      uri: location.uri,
      range: location.range
    });
  }

  return locations;
}

export function createHiaFoldingRanges(context: HiaLspAuthoringContext): FoldingRange[] {
  if (!context.document) {
    return [];
  }

  return createJsonFoldingRanges(context.document.text);
}

function enrichDiagnostic(diagnostic: Diagnostic, documentUri: string, locations: HiaLspAuthoringLocation[]): Diagnostic {
  const data = isRecord(diagnostic.data) ? { ...diagnostic.data } : {};
  const relatedLocations: HiaLspAuthoringLocation[] = [];
  const relatedInformation: DiagnosticRelatedInformation[] = [
    ...(diagnostic.relatedInformation || [])
  ];
  const code = String(diagnostic.code || "");

  if (code === HiaLspDiagnosticCode.I18nLocaleMissing) {
    data.capability = HiaIdeCapabilityId.DiagnosticsResource;
    collectMissingLocaleRelatedLocations(data, locations, relatedLocations);
  } else if (code === HiaLspDiagnosticCode.I18nKeyDuplicate) {
    data.capability = HiaIdeCapabilityId.DiagnosticsResource;
    collectDuplicateKeyRelatedLocations(data, locations, relatedLocations);
  } else if (code === HiaLspDiagnosticCode.SourceReferenceInvalid) {
    data.capability = HiaIdeCapabilityId.DiagnosticsResource;
    collectSourceReferenceRelatedLocations(data, locations, relatedLocations);
  } else {
    data.capability = classifyDiagnosticCapability(code);
    collectCoreDiagnosticRelatedLocations(code, data, documentUri, diagnostic.range, relatedLocations);
  }

  for (const location of relatedLocations) {
    const info = toDiagnosticRelatedInformation(location);

    if (info) {
      relatedInformation.push(info);
    }
  }

  const next: Diagnostic = {
    ...diagnostic,
    data: {
      ...data,
      relatedLocations: relatedLocations.map(serializeAuthoringLocationForDiagnostic)
    }
  };

  if (relatedInformation.length > 0) {
    next.relatedInformation = relatedInformation;
  }

  if (!("unavailableReason" in next.data)) {
    const unavailableReason = relatedLocations.find((location) => location.unavailableReason)?.unavailableReason;

    if (unavailableReason) {
      next.data = {
        ...next.data,
        unavailableReason
      };
    }
  }

  return next;
}

function collectMissingLocaleRelatedLocations(
  data: Record<string, unknown>,
  locations: HiaLspAuthoringLocation[],
  relatedLocations: HiaLspAuthoringLocation[]
): void {
  const symbolId = stringValue(data.symbolId);
  const fieldPath = stringValue(data.fieldPath);
  const locale = stringValue(data.locale);
  const fieldLocation = findI18nFieldLocation(locations, symbolId, fieldPath);
  const resourceLocation = locations.find((location) => {
    return location.kind === "i18n-resource"
      && location.symbolId === symbolId
      && location.fieldPath === fieldPath
      && (!locale || !location.locale || location.locale === locale);
  });

  if (fieldLocation) {
    relatedLocations.push(fieldLocation);
  }

  if (resourceLocation) {
    relatedLocations.push(resourceLocation);
    data.resourcePath = resourceLocation.resourcePath;
    data.resourcePointer = resourceLocation.resourcePointer;
  } else {
    data.unavailableReason = "resource-file-unknown";
  }
}

function collectDuplicateKeyRelatedLocations(
  data: Record<string, unknown>,
  locations: HiaLspAuthoringLocation[],
  relatedLocations: HiaLspAuthoringLocation[]
): void {
  const currentLocation = findI18nFieldLocation(
    locations,
    stringValue(data.symbolId),
    stringValue(data.fieldPath),
    stringValue(data.segmentId)
  );
  const previousLocation = findI18nFieldLocation(
    locations,
    stringValue(data.previousSymbolId),
    stringValue(data.previousFieldPath),
    stringValue(data.previousSegmentId)
  );

  if (currentLocation) {
    relatedLocations.push(currentLocation);
  }

  if (previousLocation) {
    relatedLocations.push(previousLocation);
    data.duplicateOf = {
      symbolId: previousLocation.symbolId,
      fieldPath: previousLocation.fieldPath,
      segmentId: previousLocation.segmentId
    };
  } else {
    data.unavailableReason = "diagnostic-target-unknown";
  }
}

function collectSourceReferenceRelatedLocations(
  data: Record<string, unknown>,
  locations: HiaLspAuthoringLocation[],
  relatedLocations: HiaLspAuthoringLocation[]
): void {
  const symbolId = stringValue(data.symbolId);
  const targetId = stringValue(data.targetId);
  const fragmentLocation = locations.find((location) => {
    return location.kind === "source-fragment"
      && location.symbolId === symbolId
      && location.sourceTargetId === targetId;
  });
  const diagnosticTarget = locations.find((location) => {
    return location.kind === "diagnostic-target"
      && location.symbolId === symbolId
      && location.sourceTargetId === targetId;
  });

  if (fragmentLocation) {
    relatedLocations.push(fragmentLocation);
    return;
  }

  if (diagnosticTarget) {
    relatedLocations.push(diagnosticTarget);
    data.unavailableReason = diagnosticTarget.unavailableReason;
    return;
  }

  data.unavailableReason = "source-fragment-missing";
}

function collectCoreDiagnosticRelatedLocations(
  code: string,
  data: Record<string, unknown>,
  documentUri: string,
  range: Range,
  relatedLocations: HiaLspAuthoringLocation[]
): void {
  const targetPath = stringValue(data.targetPath) || stringValue(data.path);

  if (!targetPath) {
    return;
  }

  relatedLocations.push({
    capability: HiaIdeCapabilityId.DiagnosticsDocument,
    kind: "core-document",
    range,
    targetPath,
    uri: documentUri
  });

  if (!data.unavailableReason) {
    const unavailableReason = inferUnavailableReasonFromDiagnosticData(code, data);

    if (unavailableReason) {
      data.unavailableReason = unavailableReason;
    }
  }
}

function classifyDiagnosticCapability(code: string): HiaIdeCapabilityId {
  if (code.startsWith("HIA_I18N_") || code.startsWith("HIA_SOURCE_")) {
    return HiaIdeCapabilityId.DiagnosticsResource;
  }

  return HiaIdeCapabilityId.DiagnosticsDocument;
}

function inferUnavailableReasonFromDiagnosticData(code: string, data: Record<string, unknown>): HiaLspUnavailableReason | undefined {
  const targetPath = stringValue(data.targetPath) || stringValue(data.path);
  const codeOrPath = `${code} ${targetPath}`;

  if (codeOrPath.includes("PATH_MISSING")) {
    return "relative-path-missing";
  }

  if (codeOrPath.includes("ABSOLUTE_PATH") || codeOrPath.includes("PATH_TRAVERSAL")) {
    return "unsafe-relative-path";
  }

  return undefined;
}

function toDiagnosticRelatedInformation(location: HiaLspAuthoringLocation): DiagnosticRelatedInformation | undefined {
  if (!location.uri || !location.range) {
    return undefined;
  }

  return {
    location: {
      uri: location.uri,
      range: location.range
    },
    message: createLocationMessage(location)
  };
}

function createLocationMessage(location: HiaLspAuthoringLocation): string {
  if (location.kind === "i18n-resource") {
    return `HIA i18n resource${location.resourcePointer ? ` ${location.resourcePointer}` : ""}`;
  }

  if (location.kind === "i18n-field") {
    return `HIA i18n field ${location.fieldPath || ""}`.trim();
  }

  if (location.kind === "source-fragment") {
    return `HIA source fragment ${location.sourceTargetId || ""}`.trim();
  }

  if (location.kind === "source-block") {
    return `HIA source block ${location.sourceTargetId || ""}`.trim();
  }

  return "HIA diagnostic target";
}

function serializeAuthoringLocationForDiagnostic(location: HiaLspAuthoringLocation): HiaLspAuthoringLocation {
  const serialized: HiaLspAuthoringLocation = {
    kind: location.kind
  };

  copyOptionalString(serialized, "capability", location.capability);
  copyOptionalString(serialized, "fieldPath", location.fieldPath);
  copyOptionalString(serialized, "key", location.key);
  copyOptionalString(serialized, "locale", location.locale);
  copyOptionalString(serialized, "path", location.path);
  copyOptionalString(serialized, "relativePath", location.relativePath);
  copyOptionalString(serialized, "resourcePath", location.resourcePath);
  copyOptionalString(serialized, "resourcePointer", location.resourcePointer);
  copyOptionalString(serialized, "segmentId", location.segmentId);
  copyOptionalString(serialized, "sourceTargetId", location.sourceTargetId);
  copyOptionalString(serialized, "symbolId", location.symbolId);
  copyOptionalString(serialized, "symbolName", location.symbolName);
  copyOptionalString(serialized, "targetPath", location.targetPath);
  copyOptionalString(serialized, "unavailableReason", location.unavailableReason);
  copyOptionalString(serialized, "uri", location.uri);

  if (location.range) {
    serialized.range = location.range;
  }

  return serialized;
}

function findI18nFieldLocation(
  locations: HiaLspAuthoringLocation[],
  symbolId?: string,
  fieldPath?: string,
  segmentId?: string
): HiaLspAuthoringLocation | undefined {
  return locations.find((location) => {
    return location.kind === "i18n-field"
      && location.symbolId === symbolId
      && location.fieldPath === fieldPath
      && (!segmentId || location.segmentId === segmentId);
  });
}

function findI18nResourceLocation(
  locations: HiaLspAuthoringLocation[],
  symbolId: string,
  fieldPath: string,
  locale: string
): HiaLspAuthoringLocation | undefined {
  return locations.find((location) => {
    return location.kind === "i18n-resource"
      && location.symbolId === symbolId
      && location.fieldPath === fieldPath
      && (location.locale === locale || !location.locale);
  }) ?? locations.find((location) => {
    return location.kind === "i18n-resource"
      && location.symbolId === symbolId
      && location.fieldPath === fieldPath;
  });
}

function pushOpenResourceAction(
  actions: HiaLspResourceAction[],
  seen: Set<string>,
  location: HiaLspAuthoringLocation
): void {
  if (!location.uri) {
    return;
  }

  const action = createResourceAction("open-resource", HiaIdeCapabilityId.CodeActionResourceOpen, "available", [
    "open-resource",
    location.uri,
    location.resourcePointer,
    location.targetPath
  ], `HIA: Open i18n resource${location.resourcePointer ? ` ${location.resourcePointer}` : ""}`);

  attachLocationFields(action, location);
  pushUniqueResourceAction(actions, seen, action);
}

function pushOpenSourceAction(
  actions: HiaLspResourceAction[],
  seen: Set<string>,
  location: HiaLspAuthoringLocation
): void {
  if (!location.uri) {
    return;
  }

  const action = createResourceAction("open-source", HiaIdeCapabilityId.CodeActionResourceOpen, "available", [
    "open-source",
    location.uri,
    location.sourceTargetId,
    location.targetPath
  ], `HIA: Open source ${location.sourceTargetId || location.targetPath || "target"}`);

  attachLocationFields(action, location);
  pushUniqueResourceAction(actions, seen, action);
}

function pushCopyResourceKeyAction(
  actions: HiaLspResourceAction[],
  seen: Set<string>,
  location: HiaLspAuthoringLocation
): void {
  const value = location.key || location.path;

  if (!value) {
    return;
  }

  const action = createResourceAction("copy-resource-key", HiaIdeCapabilityId.CodeActionResourceOpen, "available", [
    "copy-resource-key",
    location.symbolId,
    location.fieldPath,
    value
  ], `HIA: Copy i18n ${location.key ? "key" : "path"}`);

  attachLocationFields(action, location);
  pushUniqueResourceAction(actions, seen, action);
}

function pushUnavailableResourceAction(
  actions: HiaLspResourceAction[],
  seen: Set<string>,
  location: HiaLspAuthoringLocation,
  capability: HiaIdeCapabilityId
): void {
  if (!location.unavailableReason) {
    return;
  }

  const action = createResourceAction("explain-unavailable", capability, "blocked", [
    "explain-unavailable",
    location.kind,
    location.symbolId,
    location.fieldPath,
    location.sourceTargetId,
    location.unavailableReason
  ], `HIA: Explain unavailable ${location.kind}`);

  attachLocationFields(action, location);
  action.unavailableReason = location.unavailableReason;
  pushUniqueResourceAction(actions, seen, action);
}

function pushMissingLocaleStubAction(
  actions: HiaLspResourceAction[],
  seen: Set<string>,
  locations: HiaLspAuthoringLocation[],
  missingLocale: HiaLspMissingLocaleLocation
): void {
  const fieldLocation = findI18nFieldLocation(locations, missingLocale.symbolId, missingLocale.fieldPath);
  const resourceLocation = findI18nResourceLocation(
    locations,
    missingLocale.symbolId,
    missingLocale.fieldPath,
    missingLocale.locale
  );
  const key = fieldLocation?.key || resourceLocation?.key;
  const path = fieldLocation?.path || resourceLocation?.path;
  const resourcePointer = createResourcePointer(missingLocale.locale, key, path, missingLocale.fieldPath);
  const hasWritableTarget = Boolean(resourceLocation?.uri && resourceLocation.resourcePath);
  const hasResourceKey = Boolean(key || path);
  const status: HiaLspResourceActionStatus = hasWritableTarget && hasResourceKey ? "preflight" : "blocked";
  const action = createResourceAction("create-missing-locale-stub", HiaIdeCapabilityId.CodeActionResourceStub, status, [
    "create-missing-locale-stub",
    missingLocale.symbolId,
    missingLocale.fieldPath,
    missingLocale.locale,
    resourceLocation?.uri,
    key,
    path
  ], `HIA: Preview ${missingLocale.locale} resource stub`);

  action.fieldPath = missingLocale.fieldPath;
  action.locale = missingLocale.locale;
  action.resourcePointer = resourcePointer;
  action.symbolId = missingLocale.symbolId;
  action.symbolName = missingLocale.symbolName;
  copyOptionalActionString(action, "key", key);
  copyOptionalActionString(action, "path", path);

  if (resourceLocation) {
    attachLocationFields(action, resourceLocation);
  }

  if (!hasResourceKey) {
    action.unavailableReason = "resource-key-missing";
  } else if (!hasWritableTarget) {
    action.unavailableReason = resourceLocation?.unavailableReason ?? "resource-file-unknown";
  } else if (resourceLocation?.uri) {
    action.preflight = createMissingLocaleStubPreflight(missingLocale.locale, resourcePointer, resourceLocation, key, path);
  }

  pushUniqueResourceAction(actions, seen, action);
}

function createMissingLocaleStubPreflight(
  locale: string,
  resourcePointer: string,
  location: HiaLspAuthoringLocation,
  key?: string,
  path?: string
): HiaLspResourceEditPreflight {
  const stub: HiaLspResourceStubPreview = {
    locale,
    text: ""
  };
  const preflight: HiaLspResourceEditPreflight = {
    conflictStatus: "not-checked",
    editKind: "create-missing-locale-entry",
    requiresFileRead: true,
    resourcePointer,
    rollback: "host-undo",
    stub,
    workspaceEditBoundary: "external-resource-only"
  };

  copyOptionalStubString(stub, "key", key);
  copyOptionalStubString(stub, "path", path);
  copyOptionalPreflightString(preflight, "resourcePath", location.resourcePath);
  copyOptionalPreflightString(preflight, "targetUri", location.uri);

  return preflight;
}

function createResourceAction(
  kind: HiaLspResourceActionKind,
  capability: HiaIdeCapabilityId,
  status: HiaLspResourceActionStatus,
  idParts: readonly unknown[],
  title: string
): HiaLspResourceAction {
  return {
    capability,
    id: createResourceActionId(idParts),
    kind,
    status,
    title
  };
}

function attachLocationFields(action: HiaLspResourceAction, location: HiaLspAuthoringLocation): void {
  action.location = location;
  copyOptionalActionString(action, "fieldPath", location.fieldPath);
  copyOptionalActionString(action, "key", location.key);
  copyOptionalActionString(action, "locale", location.locale);
  copyOptionalActionString(action, "path", location.path);
  copyOptionalActionString(action, "resourcePath", location.resourcePath);
  copyOptionalActionString(action, "resourcePointer", location.resourcePointer);
  copyOptionalActionString(action, "symbolId", location.symbolId);
  copyOptionalActionString(action, "symbolName", location.symbolName);
  copyOptionalActionString(action, "targetUri", location.uri);
}

function pushUniqueResourceAction(actions: HiaLspResourceAction[], seen: Set<string>, action: HiaLspResourceAction): void {
  if (seen.has(action.id)) {
    return;
  }

  seen.add(action.id);
  actions.push(action);
}

function createResourceActionId(parts: readonly unknown[]): string {
  return parts
    .map((part) => typeof part === "string" ? part : "")
    .filter((part) => part.length > 0)
    .join("\u0000");
}

function copyOptionalActionString<T extends keyof HiaLspResourceAction>(
  target: HiaLspResourceAction,
  key: T,
  value: HiaLspResourceAction[T] | undefined
): void {
  if (typeof value === "string") {
    Object.assign(target, {
      [key]: value
    });
  }
}

function copyOptionalPreflightString<T extends keyof HiaLspResourceEditPreflight>(
  target: HiaLspResourceEditPreflight,
  key: T,
  value: HiaLspResourceEditPreflight[T] | undefined
): void {
  if (typeof value === "string") {
    Object.assign(target, {
      [key]: value
    });
  }
}

function copyOptionalStubString<T extends keyof HiaLspResourceStubPreview>(
  target: HiaLspResourceStubPreview,
  key: T,
  value: HiaLspResourceStubPreview[T] | undefined
): void {
  if (typeof value === "string") {
    Object.assign(target, {
      [key]: value
    });
  }
}

function createI18nFieldTargetPath(symbolId: string, fieldPath: string, segmentId?: string): string {
  const base = `symbols[${symbolId}].i18n.fields[${fieldPath}]`;
  return segmentId ? `${base}.segments[${segmentId}]` : base;
}

function createI18nResourceTargetPath(symbolId: string, resourceIndex: number, fieldPath?: string): string {
  const base = `symbols[${symbolId}].i18n.resources[${resourceIndex}]`;
  return fieldPath ? `${base}.fields[${fieldPath}]` : base;
}

function createSourceBlockTargetPath(symbolId: string, blockIndex: number, blockId?: string): string {
  return blockId
    ? `symbols[${symbolId}].source.blocks[${blockId}]`
    : `symbols[${symbolId}].source.blocks[${blockIndex}]`;
}

function createSourceFragmentTargetPath(symbolId: string, fragmentId: string): string {
  return `symbols[${symbolId}].source.fragments[${fragmentId}]`;
}

function createSourceReferenceTargetPath(symbolId: string, referenceIndex: number): string {
  return `symbols[${symbolId}].source.references[${referenceIndex}]`;
}

function createResourcePointer(locale?: string, key?: string, path?: string, fieldPath?: string): string {
  const segments = [
    locale || "<locale>",
    key || path || fieldPath || "<field>"
  ];

  return `/${segments.map(escapeResourcePointerSegment).join("/")}`;
}

function escapeResourcePointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function resolveRelativeFileUriWithReason(
  workspaceRoots: readonly string[],
  relativePath: string
): { unavailableReason?: HiaLspUnavailableReason; uri?: string } {
  const normalized = relativePath.replaceAll("\\", "/");

  if (isUnsafeRelativePath(normalized)) {
    return {
      unavailableReason: normalized ? "unsafe-relative-path" : "relative-path-missing"
    };
  }

  const root = workspaceRoots.find((item) => item.startsWith("file://"));

  if (!root) {
    return {
      unavailableReason: "workspace-root-missing"
    };
  }

  const base = root.endsWith("/") ? root : `${root}/`;
  return {
    uri: new URL(normalized, base).toString()
  };
}

function copyOptionalString<T extends keyof HiaLspAuthoringLocation>(
  target: HiaLspAuthoringLocation,
  key: T,
  value: HiaLspAuthoringLocation[T]
): void {
  if (typeof value === "string") {
    Object.assign(target, {
      [key]: value
    });
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function implementedCapability(id: HiaIdeCapabilityId, owner: HiaIdeCapabilityOwner, hasDocument: boolean): HiaIdeCapability {
  if (hasDocument) {
    return {
      id,
      owner,
      status: "available"
    };
  }

  return {
    id,
    owner,
    status: "unsupported",
    reason: "document-not-open"
  };
}

function dataBackedCapability(id: HiaIdeCapabilityId, owner: HiaIdeCapabilityOwner, hasDocument: boolean, count: number): HiaIdeCapability {
  if (!hasDocument) {
    return {
      id,
      owner,
      status: "unsupported",
      reason: "document-not-open"
    };
  }

  if (count > 0) {
    return {
      id,
      owner,
      status: "available"
    };
  }

  return {
    id,
    owner,
    status: "partial",
    reason: "source-data-empty"
  };
}

function plannedCapability(id: HiaIdeCapabilityId, owner: HiaIdeCapabilityOwner, reason: string): HiaIdeCapability {
  return {
    id,
    owner,
    status: "planned",
    reason
  };
}

function pushCompletion(items: CompletionItem[], seen: Set<string>, key: string, item: CompletionItem): void {
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  items.push(item);
}

function pushLocation(locations: Location[], seen: Set<string>, location: Location): void {
  const key = [
    location.uri,
    location.range.start.line,
    location.range.start.character,
    location.range.end.line,
    location.range.end.character
  ].join("\u0000");

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  locations.push(location);
}

function isUnsafeRelativePath(value: string): boolean {
  return !value
    || value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.split("/").some((segment) => segment === "..");
}

function sourceRangeToLspRange(range: HiaSourceRange): Range {
  return {
    start: {
      line: Math.max(0, range.start.line - 1),
      character: Math.max(0, (range.start.column || 1) - 1)
    },
    end: {
      line: Math.max(0, range.end.line - 1),
      character: Math.max(0, (range.end.column || 1) - 1)
    }
  };
}

function createZeroRange(): Range {
  return {
    start: {
      line: 0,
      character: 0
    },
    end: {
      line: 0,
      character: 0
    }
  };
}

function createJsonFoldingRanges(text: string): FoldingRange[] {
  const ranges: FoldingRange[] = [];
  const stack: Array<{ line: number; token: "{" | "[" }> = [];
  const lines = text.split(/\r?\n/);
  let inString = false;
  let escaped = false;

  for (const [lineIndex, line] of lines.entries()) {
    for (const character of line) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = inString;
        continue;
      }

      if (character === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (character === "{" || character === "[") {
        stack.push({
          line: lineIndex,
          token: character
        });
        continue;
      }

      if (character !== "}" && character !== "]") {
        continue;
      }

      const opening = stack.pop();

      if (!opening || !tokensMatch(opening.token, character)) {
        continue;
      }

      if (lineIndex > opening.line) {
        ranges.push({
          startLine: opening.line,
          endLine: lineIndex
        });
      }
    }
  }

  return ranges;
}

function tokensMatch(opening: "{" | "[", closing: "}" | "]"): boolean {
  return (opening === "{" && closing === "}") || (opening === "[" && closing === "]");
}
