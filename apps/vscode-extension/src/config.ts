import path from "node:path";

export const HIA_EXTENSION_NAME = "HIA Documentation";
export const HIA_LANGUAGE_ID = "hia";
export const HIA_OUTPUT_CHANNEL_NAME = "HIA Documentation";
export const HIA_SHOW_OUTPUT_COMMAND = "hia.showOutput";
export const HIA_BUILD_DOCS_COMMAND = "hia.buildDocs";
export const HIA_OPEN_PREVIEW_COMMAND = "hia.openPreview";
export const HIA_VALIDATE_WORKSPACE_COMMAND = "hia.validateWorkspace";
export const HIA_OPEN_RELATED_LOCATION_COMMAND = "hia.openRelatedLocation";
export const HIA_CLIENT_ID = "hiaDocumentation";
export const HIA_CONFIGURATION_SECTION = "hia";
export const HIA_SERVER_RELATIVE_PATH = ["..", "..", "packages", "lsp", "dist", "node.js"] as const;
export const HIA_CLI_RELATIVE_PATH = ["..", "..", "apps", "cli", "dist", "index.js"] as const;
export const HIA_DEFAULT_PREVIEW_RELATIVE_PATH = ["dist", "docs", "index.html"] as const;
export const HIA_DEFAULT_BUILD_OUTPUT = "dist/docs";
export const HIA_DEFAULT_PREVIEW_PATH = "dist/docs/index.html";
export const HIA_DEFAULT_MANIFEST_PATH = "hia-manifest.json";
export const HIA_RESOURCE_INDEX_REQUEST = "hia/documentResourceIndex";
export const HIA_IDE_CAPABILITIES_REQUEST = "hia/ideCapabilities";
export const HIA_AUTHORING_LOCATIONS_REQUEST = "hia/documentAuthoringLocations";

export interface HiaDocumentSelectorItem {
  language?: string;
  pattern?: string;
  scheme: "file";
}

export interface HiaCommandSettingsInput {
  config?: string | undefined;
  input?: string | undefined;
  jsdocIntegration?: string | undefined;
  locale?: string | undefined;
  manifest?: string | undefined;
  out?: string | undefined;
  previewPath?: string | undefined;
}

export interface HiaCommandSettings {
  config?: string;
  input?: string;
  jsdocIntegration?: string;
  locale?: string;
  manifest: string;
  out: string;
  previewPath: string;
}

export interface HiaResourceIndexSummary {
  documentId?: string;
  i18nKeys?: unknown[];
  i18nResources?: unknown[];
  missingLocales?: unknown[];
  sourceReferences?: unknown[];
  uri?: string;
}

export interface HiaIdeCapabilitySummary {
  id?: string;
  owner?: string;
  reason?: string;
  status?: string;
}

export interface HiaIdeCapabilitiesSummary {
  capabilities?: HiaIdeCapabilitySummary[];
  uri?: string;
}

export interface HiaAuthoringLocationSummary {
  kind?: string;
  range?: {
    end: {
      character: number;
      line: number;
    };
    start: {
      character: number;
      line: number;
    };
  };
  resourcePath?: string;
  sourceTargetId?: string;
  targetPath?: string;
  unavailableReason?: string;
  uri?: string;
}

export interface HiaAuthoringLocationsSummary {
  locations?: HiaAuthoringLocationSummary[];
  uri?: string;
}

export interface HiaDiagnosticSummary {
  code?: number | string;
  data?: unknown;
  relatedInformation?: unknown[];
  severity?: number;
}

export interface HiaValidationReportInput {
  authoringLocations?: HiaAuthoringLocationsSummary;
  capabilities?: HiaIdeCapabilitiesSummary;
  diagnostics?: HiaDiagnosticSummary[];
  resourceIndex?: HiaResourceIndexSummary;
  uri: string;
}

export interface HiaPreviewManifestSummary {
  documentId?: string;
  entrypoint?: unknown;
  initialLocale?: string;
  locales?: unknown[];
  title?: string;
}

export type HiaPreviewPathSource = "manifest" | "setting";

export type HiaPreviewUnavailableReason =
  | "manifest-entrypoint-missing"
  | "manifest-entrypoint-unsafe"
  | "preview-file-missing"
  | "manifest-file-missing"
  | "active-document-newer-than-preview"
  | "manifest-newer-than-preview";

export interface HiaPreviewPathResolution {
  manifestEntrypoint?: string;
  previewPath: string;
  source: HiaPreviewPathSource;
  unavailableReason?: HiaPreviewUnavailableReason;
}

export interface HiaPreviewStatusReportInput {
  manifest?: HiaPreviewManifestSummary;
  manifestExists: boolean;
  manifestPath: string;
  previewExists: boolean;
  previewPath: string;
  source: HiaPreviewPathSource;
  staleReason?: HiaPreviewUnavailableReason;
}

export function resolveHiaServerModule(extensionPath: string): string {
  return path.resolve(extensionPath, ...HIA_SERVER_RELATIVE_PATH);
}

export function resolveHiaCliModule(extensionPath: string): string {
  return path.resolve(extensionPath, ...HIA_CLI_RELATIVE_PATH);
}

export function resolveDefaultPreviewPath(workspaceRoot: string): string {
  return path.resolve(workspaceRoot, ...HIA_DEFAULT_PREVIEW_RELATIVE_PATH);
}

export function resolveConfiguredPreviewPath(workspaceRoot: string, previewPath?: string): string {
  const normalized = normalizeOptionalSetting(previewPath) ?? HIA_DEFAULT_PREVIEW_PATH;
  return path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(workspaceRoot, normalized);
}

export function resolveConfiguredManifestPath(workspaceRoot: string, settings: Pick<HiaCommandSettings, "manifest" | "out">): string {
  return path.resolve(workspaceRoot, settings.out, settings.manifest);
}

export function resolveHiaPreviewPath(
  workspaceRoot: string,
  settings: Pick<HiaCommandSettings, "out" | "previewPath">,
  manifest?: HiaPreviewManifestSummary
): HiaPreviewPathResolution {
  if (typeof manifest?.entrypoint === "string") {
    const entrypoint = normalizeOutputRelativePath(manifest.entrypoint);

    if (isSafeOutputRelativePath(entrypoint)) {
      return {
        manifestEntrypoint: entrypoint,
        previewPath: path.resolve(workspaceRoot, settings.out, entrypoint),
        source: "manifest"
      };
    }

    return {
      previewPath: resolveConfiguredPreviewPath(workspaceRoot, settings.previewPath),
      source: "setting",
      unavailableReason: "manifest-entrypoint-unsafe"
    };
  }

  return {
    previewPath: resolveConfiguredPreviewPath(workspaceRoot, settings.previewPath),
    source: "setting",
    ...(manifest ? { unavailableReason: "manifest-entrypoint-missing" as const } : {})
  };
}

export function normalizeHiaCommandSettings(input: HiaCommandSettingsInput = {}): HiaCommandSettings {
  const settings: HiaCommandSettings = {
    manifest: normalizeOptionalSetting(input.manifest) ?? HIA_DEFAULT_MANIFEST_PATH,
    out: normalizeOptionalSetting(input.out) ?? HIA_DEFAULT_BUILD_OUTPUT,
    previewPath: normalizeOptionalSetting(input.previewPath) ?? HIA_DEFAULT_PREVIEW_PATH
  };
  const config = normalizeOptionalSetting(input.config);
  const hiaInput = normalizeOptionalSetting(input.input);
  const jsdocIntegration = normalizeOptionalSetting(input.jsdocIntegration);
  const locale = normalizeOptionalSetting(input.locale);

  if (config) {
    settings.config = config;
  }

  if (hiaInput) {
    settings.input = hiaInput;
  }

  if (jsdocIntegration) {
    settings.jsdocIntegration = jsdocIntegration;
  }

  if (locale) {
    settings.locale = locale;
  }

  return settings;
}

export function createHiaBuildArgs(settings: HiaCommandSettings = normalizeHiaCommandSettings()): string[] {
  const args = ["docs", "build"];

  pushOption(args, "--config", settings.config);
  pushOption(args, "--input", settings.input);
  pushOption(args, "--jsdoc-integration", settings.jsdocIntegration);
  pushOption(args, "--out", settings.out);
  pushOption(args, "--locale", settings.locale);
  pushOption(args, "--manifest", settings.manifest);

  return args;
}

export function createHiaValidationReport(input: HiaValidationReportInput): string[] {
  const index = input.resourceIndex ?? {};
  const diagnostics = input.diagnostics ?? [];
  const capabilities = input.capabilities?.capabilities ?? [];
  const locations = input.authoringLocations?.locations ?? [];
  const diagnosticCounts = countDiagnostics(diagnostics);
  const capabilityCounts = countBy(capabilities.map((item) => item.status || "unknown"));
  const unavailableReasons = countBy([
    ...locations.map((item) => item.unavailableReason).filter(isNonEmptyString),
    ...diagnostics.map((item) => getDiagnosticUnavailableReason(item)).filter(isNonEmptyString)
  ]);
  const diagnosticCodes = countBy(diagnostics.map((item) => String(item.code ?? "unknown")));

  const lines = [
    `Document: ${index.documentId || input.uri}`,
    `URI: ${input.uri}`,
    `Diagnostics: ${diagnosticCounts.errors} error(s), ${diagnosticCounts.warnings} warning(s), ${diagnosticCounts.information} info/hint`,
    `Resources: ${index.i18nResources?.length ?? 0} resource(s), ${index.i18nKeys?.length ?? 0} key(s), ${index.missingLocales?.length ?? 0} missing locale(s), ${index.sourceReferences?.length ?? 0} source reference(s)`,
    `Authoring locations: ${locations.length} total, ${locations.filter((item) => item.unavailableReason).length} unavailable`,
    `Capabilities: ${formatCounts(capabilityCounts)}`
  ];

  if (unavailableReasons.size > 0) {
    lines.push(`Unavailable reasons: ${formatCounts(unavailableReasons)}`);
  }

  if (diagnosticCodes.size > 0) {
    lines.push(`Diagnostic codes: ${formatCounts(diagnosticCodes)}`);
  }

  return lines;
}

export function createHiaPreviewReport(input: HiaPreviewStatusReportInput): string[] {
  const status = input.previewExists
    ? input.staleReason ? "stale" : "ready"
    : "missing";
  const lines = [
    `Strategy: generated-html`,
    `Status: ${status}`,
    `Preview file: ${input.previewPath}`,
    `Preview source: ${input.source}`,
    `Manifest: ${input.manifestExists ? input.manifestPath : `${input.manifestPath} (missing)`}`
  ];

  if (typeof input.manifest?.entrypoint === "string") {
    lines.push(`Manifest entrypoint: ${input.manifest.entrypoint}`);
  }

  if (input.manifest?.documentId) {
    lines.push(`Document: ${input.manifest.documentId}`);
  }

  if (input.manifest?.title) {
    lines.push(`Title: ${input.manifest.title}`);
  }

  if (input.manifest?.initialLocale) {
    lines.push(`Initial locale: ${input.manifest.initialLocale}`);
  }

  if (input.staleReason) {
    lines.push(`Stale reason: ${input.staleReason}`);
  }

  return lines;
}

export function getHiaPreviewStaleReason(input: {
  manifestMtimeMs?: number;
  previewMtimeMs?: number;
  sourceMtimeMs?: number;
}): HiaPreviewUnavailableReason | undefined {
  if (input.previewMtimeMs === undefined) {
    return undefined;
  }

  if (input.sourceMtimeMs !== undefined && input.sourceMtimeMs > input.previewMtimeMs) {
    return "active-document-newer-than-preview";
  }

  if (input.manifestMtimeMs !== undefined && input.manifestMtimeMs > input.previewMtimeMs) {
    return "manifest-newer-than-preview";
  }

  return undefined;
}

export function createHiaDocumentSelector(): HiaDocumentSelectorItem[] {
  return [
    {
      scheme: "file",
      language: HIA_LANGUAGE_ID
    },
    {
      scheme: "file",
      pattern: "**/*.hia.json"
    }
  ];
}

export function createHiaFileWatcherPattern(): string {
  return "**/*.hia.json";
}

function normalizeOptionalSetting(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOutputRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function isSafeOutputRelativePath(value: string): boolean {
  return Boolean(value)
    && value !== "."
    && !path.isAbsolute(value)
    && value !== ".."
    && !value.startsWith("../")
    && !value.includes("/../")
    && !value.endsWith("/..");
}

function pushOption(args: string[], name: string, value: string | undefined): void {
  if (value) {
    args.push(name, value);
  }
}

function countDiagnostics(diagnostics: HiaDiagnosticSummary[]): { errors: number; information: number; warnings: number } {
  const counts = {
    errors: 0,
    information: 0,
    warnings: 0
  };

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 0) {
      counts.errors += 1;
    } else if (diagnostic.severity === 1) {
      counts.warnings += 1;
    } else {
      counts.information += 1;
    }
  }

  return counts;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function formatCounts(counts: Map<string, number>): string {
  if (counts.size === 0) {
    return "none";
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

function getDiagnosticUnavailableReason(diagnostic: HiaDiagnosticSummary): string | undefined {
  if (!isRecord(diagnostic.data)) {
    return undefined;
  }

  const reason = diagnostic.data.unavailableReason;
  return isNonEmptyString(reason) ? reason : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
