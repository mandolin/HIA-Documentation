import {
  getI18nField,
  resolveI18nFieldText,
  type HiaDiagnostic,
  type HiaDocument,
  type HiaI18nField,
  type HiaI18nModel,
  type HiaResolvedText,
  type HiaSourceDefinedIn,
  type HiaSourceFragment,
  type HiaSourceMetadata,
  type HiaSourcePrimaryBlock,
  type HiaSourceReference,
  type HiaSymbol
} from "@hia-doc/core";
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets } from "@hia-doc/theme-default";

export const HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION = "0.1.0";
/**
 * 项目导航索引的中性 contract 名称；供静态 portal、搜索与宿主导航消费。
 * Neutral project-navigation-index contract name consumed by static portals, search, and host navigation.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT = "hia-project-navigation-index";
/**
 * 项目导航索引的首个草案版本；它独立于 renderer manifest 的文件清单版本。
 * First draft version of the project navigation index; independent from the renderer manifest file-list version.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION = "0.1.0-draft";

export interface RenderedHtmlFile {
  path: string;
  contents: string;
  contentType: string;
  role: "entry" | "asset" | "index";
}

export interface RenderHtmlOptions {
  locale?: string;
  title?: string;
  includeThemeAssets?: boolean;
}

export type RenderProjectView = "all" | "js" | "css" | "html" | "dotnet" | "other";

export interface RenderProjectHtmlInput {
  project: RenderProjectInfo;
  entries: RenderProjectEntry[];
  profiles?: RenderProjectProfileRef[];
  docSourceMaps?: RenderProjectDocSourceMapRef[];
  diagnostics?: HiaDiagnostic[];
}

export interface RenderProjectInfo {
  id?: string;
  name: string;
  title?: string;
  /**
   * 项目页面的默认语言；若未提供则从已声明语言或 `und` 推断。
   * Default project-page locale; inferred from declared locales or `und` when omitted.
   */
  defaultLocale?: string;
  /**
   * 项目聚合页中可切换的语言。
   * Locales that can be switched within the project aggregation page.
   */
  locales?: string[];
}

export interface RenderProjectProfileRef {
  profileId: string;
  profileVersion?: string;
  layer?: string;
  path?: string;
}

export interface RenderProjectDocSourceMapRef {
  artifactCount?: number;
  path: string;
  contractVersion?: string;
  entryArtifact?: string;
  entryCount?: number;
  linkedEntryCount?: number;
  sourceCount?: number;
  sourceMaps?: RenderProjectSourceMapRef[];
  sourceMapCount?: number;
  sourcesContentPolicy?: string;
  status?: string;
  unresolvedEntryCount?: number;
}

export interface RenderProjectSourceMapRef {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

export interface RenderProjectEntry {
  id: string;
  name: string;
  kind: string;
  view: RenderProjectView;
  summary?: string;
  signature?: string;
  /**
   * 从领域 adapter/core symbol 透传的字段级 i18n；description 会驱动项目页的语言切换。
   * Field-level i18n forwarded from a domain adapter/core symbol; description drives project-page locale switching.
   */
  i18n?: HiaI18nModel;
  profile?: RenderProjectProfileRef;
  input?: RenderProjectInputRef;
  source?: RenderProjectSourceRef;
  symbolId?: string;
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
  diagnostics?: HiaDiagnostic[];
}

export interface RenderProjectEntryDocSourceMapRef {
  artifactConfidence?: string;
  artifactPath?: string;
  artifactSelector?: string;
  diagnostics?: string[];
  entryId: string;
  path: string;
  sourceConfidence?: string;
  sourcePath?: string;
  sourceRange?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  sourceRangeSource?: string;
}

export interface RenderProjectInputRef {
  kind: string;
  path: string;
  artifactId?: string;
  contract?: string;
  contractVersion?: string;
}

export interface RenderProjectSourceRef {
  confidence?: string;
  language?: string;
  linkUrl?: string;
  path: string;
  preview?: RenderProjectSourcePreviewRef;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  rangeSource?: string;
}

export interface RenderProjectSourcePreviewRef {
  content: string;
  defaultExpanded?: boolean;
  language?: string;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
}

export interface RenderHtmlResult {
  files: RenderedHtmlFile[];
  diagnostics: HiaDiagnostic[];
  manifest: RenderHtmlManifest;
}

export interface RenderHtmlManifest {
  schemaVersion: typeof HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION;
  renderer: "@hia-doc/renderer-html";
  documentId: string;
  title: string;
  entrypoint: string;
  initialLocale: string;
  locales: string[];
  files: RenderHtmlManifestFile[];
  project?: {
    id: string;
    name: string;
    views: RenderProjectView[];
    entryCounts: Record<string, number>;
    navigationIndex?: RenderProjectNavigationIndexRef;
    profiles?: RenderProjectProfileRef[];
    docSourceMaps?: RenderProjectDocSourceMapRef[];
  };
}

export interface RenderHtmlManifestFile {
  path: string;
  role: RenderedHtmlFile["role"];
  contentType: string;
}

/**
 * renderer 输出中项目导航索引的位置与兼容性标识。
 * Location and compatibility identity for the project navigation index emitted by the renderer.
 */
export interface RenderProjectNavigationIndexRef {
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION;
  entryCount: number;
  path: string;
}

/**
 * 供 portal 使用的、无 HTML 表示细节的项目入口索引。
 * Project entry index without HTML presentation details, intended for portal consumption.
 */
export interface RenderProjectNavigationIndex {
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION;
  project: {
    defaultLocale: string;
    entryCounts: Record<string, number>;
    id: string;
    locales: string[];
    name: string;
    title: string;
    views: RenderProjectView[];
  };
  entries: RenderProjectNavigationEntry[];
  groups: RenderProjectNavigationGroup[];
  profiles: RenderProjectProfileRef[];
  docSourceMaps: RenderProjectDocSourceMapRef[];
}

export type RenderProjectNavigationGroupKind = "kind" | "profile-layer" | "source-root";

/**
 * 大型项目导航索引中的轻量分组统计，用于门户、侧栏和后续大项目导航策略。
 * Lightweight group statistics in the large-project navigation index for portals, sidebars, and future navigation strategies.
 */
export interface RenderProjectNavigationGroup {
  id: string;
  kind: RenderProjectNavigationGroupKind;
  label: string;
  entryCount: number;
  views: RenderProjectView[];
}

/**
 * 单个可导航入口的稳定标识及其公开元数据；完整详情仍由统一项目页负责渲染。
 * Stable identity and public metadata for one navigable entry; the unified project page still renders full detail.
 */
export interface RenderProjectNavigationEntry {
  id: string;
  name: string;
  kind: string;
  view: RenderProjectView;
  summary?: string;
  signature?: string;
  i18n?: HiaI18nModel;
  profile?: RenderProjectProfileRef;
  input?: RenderProjectInputRef;
  source?: Omit<RenderProjectSourceRef, "preview">;
  symbolId?: string;
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
}

export function renderHtmlDocument(document: HiaDocument, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const pageTitle = options.title ?? document.title;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderIndexHtml(pageTitle, document, options),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    }
  ];

  if (includeThemeAssets) {
    for (const asset of getDefaultThemeAssets()) {
      files.push({
        path: asset.path,
        contents: asset.contents,
        contentType: asset.contentType,
        role: "asset"
      });
    }
  }

  return {
    files,
    diagnostics: [],
    manifest: createManifest(document, files, options)
  };
}

export function renderProjectHtmlDocument(projectInput: RenderProjectHtmlInput, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const pageTitle = options.title ?? projectInput.project.title ?? projectInput.project.name;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const navigationIndex = createProjectNavigationIndex(projectInput, pageTitle, options);
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderProjectIndexHtml(pageTitle, projectInput, options),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    },
    {
      path: "project-index.json",
      contents: `${JSON.stringify(navigationIndex, null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    }
  ];

  if (includeThemeAssets) {
    for (const asset of getDefaultThemeAssets()) {
      files.push({
        path: asset.path,
        contents: asset.contents,
        contentType: asset.contentType,
        role: "asset"
      });
    }
  }

  return {
    files,
    diagnostics: projectInput.diagnostics ?? [],
    manifest: createProjectManifest(projectInput, files, pageTitle, options, navigationIndex)
  };
}

function createManifest(document: HiaDocument, files: RenderedHtmlFile[], options: RenderHtmlOptions): RenderHtmlManifest {
  return {
    schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
    renderer: "@hia-doc/renderer-html",
    documentId: document.id,
    title: options.title ?? document.title,
    entrypoint: "index.html",
    initialLocale: options.locale || document.defaultLocale,
    locales: normalizeLocales(document, options.locale || document.defaultLocale),
    files: files.map((file) => ({
      path: file.path,
      role: file.role,
      contentType: file.contentType
    }))
  };
}

function createProjectManifest(
  projectInput: RenderProjectHtmlInput,
  files: RenderedHtmlFile[],
  pageTitle: string,
  options: RenderHtmlOptions,
  navigationIndex: RenderProjectNavigationIndex
): RenderHtmlManifest {
  const projectId = projectInput.project.id ?? `project:${projectInput.project.name}`;
  const views = collectProjectViews(projectInput.entries);
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);

  return {
    schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
    renderer: "@hia-doc/renderer-html",
    documentId: projectId,
    title: pageTitle,
    entrypoint: "index.html",
    initialLocale: localeModel.selectedLocale,
    locales: localeModel.locales,
    files: files.map((file) => ({
      path: file.path,
      role: file.role,
      contentType: file.contentType
    })),
    project: {
      id: projectId,
      name: projectInput.project.name,
      views,
      entryCounts: countEntriesByView(projectInput.entries),
      navigationIndex: {
        contract: navigationIndex.contract,
        contractVersion: navigationIndex.contractVersion,
        entryCount: navigationIndex.entries.length,
        path: "project-index.json"
      },
      ...(projectInput.profiles && projectInput.profiles.length > 0 ? { profiles: projectInput.profiles } : {}),
      ...(projectInput.docSourceMaps && projectInput.docSourceMaps.length > 0 ? { docSourceMaps: projectInput.docSourceMaps } : {})
    }
  };
}

function createProjectNavigationIndex(
  projectInput: RenderProjectHtmlInput,
  pageTitle: string,
  options: RenderHtmlOptions
): RenderProjectNavigationIndex {
  const projectId = projectInput.project.id ?? `project:${projectInput.project.name}`;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);

  return {
    contract: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
    contractVersion: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
    project: {
      defaultLocale: localeModel.selectedLocale,
      entryCounts: countEntriesByView(projectInput.entries),
      id: projectId,
      locales: localeModel.locales,
      name: projectInput.project.name,
      title: pageTitle,
      views: collectProjectViews(projectInput.entries)
    },
    entries: projectInput.entries
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        view: entry.view,
        ...(entry.summary ? { summary: entry.summary } : {}),
        ...(entry.signature ? { signature: entry.signature } : {}),
        ...(entry.i18n ? { i18n: entry.i18n } : {}),
        ...(entry.profile ? { profile: entry.profile } : {}),
        ...(entry.input ? { input: entry.input } : {}),
        ...(entry.source ? { source: omitProjectSourcePreview(entry.source) } : {}),
        ...(entry.symbolId ? { symbolId: entry.symbolId } : {}),
        ...(entry.docSourceMap ? { docSourceMap: entry.docSourceMap } : {})
      }))
      .sort(compareProjectNavigationEntries),
    groups: collectProjectNavigationGroups(projectInput.entries),
    profiles: [...(projectInput.profiles ?? [])].sort(compareProjectProfiles),
    docSourceMaps: [...(projectInput.docSourceMaps ?? [])].sort(compareProjectDocSourceMaps)
  };
}

function omitProjectSourcePreview(source: RenderProjectSourceRef): Omit<RenderProjectSourceRef, "preview"> {
  const { preview: _preview, ...sourceWithoutPreview } = source;
  return sourceWithoutPreview;
}

function compareProjectNavigationEntries(left: RenderProjectNavigationEntry, right: RenderProjectNavigationEntry): number {
  return compareStableText(left.id, right.id);
}

function compareProjectProfiles(left: RenderProjectProfileRef, right: RenderProjectProfileRef): number {
  return compareStableText(left.profileId, right.profileId);
}

function compareProjectDocSourceMaps(left: RenderProjectDocSourceMapRef, right: RenderProjectDocSourceMapRef): number {
  return compareStableText(left.path, right.path);
}

function compareStableText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function renderIndexHtml(pageTitle: string, document: HiaDocument, options: RenderHtmlOptions): string {
  const selectedLocale = options.locale || document.defaultLocale;
  const locales = normalizeLocales(document, selectedLocale);
  const navigation = document.symbols
    .map((symbol) => `<li><a href="#${escapeHtml(symbol.id)}">${escapeHtml(symbol.name)}</a></li>`)
    .join("");
  const symbols = document.symbols.map((symbol) => renderSymbol(symbol, document, locales, selectedLocale)).join("");

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(selectedLocale)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(document.title)}</h1>`,
    renderLocaleControl(locales, selectedLocale),
    navigation ? `<nav><ul>${navigation}</ul></nav>` : "",
    "</aside>",
    "<main class=\"hia-main\">",
    symbols || "<p>No symbols.</p>",
    "</main>",
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectIndexHtml(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const views = collectProjectViews(projectInput.entries);
  const entryCounts = countEntriesByView(projectInput.entries);
  const groups = collectProjectNavigationGroups(projectInput.entries);
  const navigation = projectInput.entries
    .map((entry) => renderProjectNavItem(entry))
    .join("");
  const entries = projectInput.entries
    .map((entry) => renderProjectEntry(entry, localeModel.locales, localeModel.selectedLocale))
    .join("");
  const profileSummary = renderProjectProfiles(projectInput.profiles ?? []);
  const docSourceMapSummary = renderProjectDocSourceMaps(projectInput.docSourceMaps ?? []);
  const diagnostics = renderProjectDiagnostics(projectInput.diagnostics ?? []);

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(localeModel.selectedLocale)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell hia-project-shell\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1>`,
    renderLocaleControl(localeModel.locales, localeModel.selectedLocale),
    renderProjectViewControl(views, entryCounts),
    renderProjectSearchControl(),
    renderProjectGroupSummary(groups),
    navigation ? `<nav><ul>${navigation}</ul></nav>` : "",
    profileSummary,
    docSourceMapSummary,
    diagnostics,
    "</aside>",
    "<main class=\"hia-main hia-project-main\">",
    entries || "<p>No project documentation entries.</p>",
    "<p class=\"hia-project-empty\" data-hia-project-empty hidden>No entries match the current filters.</p>",
    "</main>",
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    renderProjectViewScript(),
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectViewControl(views: RenderProjectView[], entryCounts: Record<string, number>): string {
  const buttons = views
    .map((view) => `<button type="button" class="hia-project-view-button" data-hia-project-view="${escapeHtml(view)}">${escapeHtml(formatProjectViewLabel(view))}<span>${escapeHtml(String(entryCounts[view] ?? 0))}</span></button>`)
    .join("");

  return `<div class="hia-project-views">${buttons}</div>`;
}

function renderProjectSearchControl(): string {
  return [
    "<label class=\"hia-project-search\">",
    "<span>Search</span>",
    "<input type=\"search\" data-hia-project-search placeholder=\"Name, kind, source, selector\">",
    "</label>"
  ].join("");
}

function renderProjectGroupSummary(groups: RenderProjectNavigationGroup[]): string {
  if (groups.length === 0) {
    return "";
  }

  const sections = ([
    ["kind", "Kinds"],
    ["profile-layer", "Profile Layers"],
    ["source-root", "Source Roots"]
  ] as const)
    .map(([kind, label]) => {
      const items = groups
        .filter((group) => group.kind === kind)
        .sort(compareProjectNavigationGroups)
        .slice(0, 12)
        .map((group) => `<li><span>${escapeHtml(group.label)}</span><strong>${escapeHtml(String(group.entryCount))}</strong></li>`)
        .join("");

      return items ? `<section><h3>${escapeHtml(label)}</h3><ul class="hia-project-group-list">${items}</ul></section>` : "";
    })
    .join("");

  return sections ? `<section class="hia-project-summary hia-project-groups"><h2>Groups</h2>${sections}</section>` : "";
}

function renderProjectNavItem(entry: RenderProjectEntry): string {
  const searchText = createProjectEntrySearchText(entry);
  return [
    `<li data-hia-project-nav="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    `<a href="#${escapeHtml(entry.id)}">`,
    `<span>${escapeHtml(entry.name)}</span>`,
    `<small>${escapeHtml(formatProjectViewLabel(entry.view))} / ${escapeHtml(entry.kind)}</small>`,
    "</a>",
    "</li>"
  ].join("");
}

function renderProjectEntry(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  const signature = entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : "";
  const summary = renderProjectEntrySummary(entry, locales, selectedLocale);
  const input = entry.input ? renderProjectEntryInput(entry.input) : "";
  const profile = entry.profile ? renderProjectEntryProfile(entry.profile) : "";
  const source = entry.source ? renderProjectEntrySource(entry.source) : "";
  const docSourceMap = entry.docSourceMap ? renderProjectEntryDocSourceMap(entry.docSourceMap) : "";
  const diagnostics = renderProjectDiagnostics(entry.diagnostics ?? []);
  const searchText = createProjectEntrySearchText(entry);

  return [
    `<article class="hia-symbol hia-project-entry" id="${escapeHtml(entry.id)}" data-hia-project-entry="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    `<h2>${escapeHtml(entry.name)}</h2>`,
    `<span class="hia-kind">${escapeHtml(entry.kind)}</span>`,
    `<span class="hia-kind">${escapeHtml(formatProjectViewLabel(entry.view))}</span>`,
    signature,
    summary,
    input,
    profile,
    source,
    docSourceMap,
    diagnostics,
    "</article>"
  ].join("");
}

function renderProjectEntrySummary(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  const field = entry.i18n?.fields.description;

  if (!field && !entry.summary) {
    return "";
  }

  const blocks = locales
    .map((locale) => renderLocalizedBlock(
      field,
      locale,
      selectedLocale,
      createI18nResolveOptionsFromModel(entry.i18n),
      entry.summary ?? ""
    ))
    .join("");

  return `<div class="hia-localized-set" data-hia-i18n-field="description">${blocks}</div>`;
}

function renderProjectEntryInput(input: RenderProjectInputRef): string {
  const details = [
    `<dt>Input</dt><dd>${escapeHtml(input.kind)}</dd>`,
    `<dt>Path</dt><dd>${escapeHtml(input.path)}</dd>`,
    input.contract ? `<dt>Contract</dt><dd>${escapeHtml(input.contract)}</dd>` : "",
    input.contractVersion ? `<dt>Version</dt><dd>${escapeHtml(input.contractVersion)}</dd>` : "",
    input.artifactId ? `<dt>Artifact</dt><dd>${escapeHtml(input.artifactId)}</dd>` : ""
  ].join("");

  return `<dl class="hia-project-meta">${details}</dl>`;
}

function renderProjectEntryProfile(profile: RenderProjectProfileRef): string {
  const version = profile.profileVersion ? `@${profile.profileVersion}` : "";
  return `<p class="hia-project-profile">Profile ${escapeHtml(profile.profileId)}${escapeHtml(version)}</p>`;
}

function renderProjectEntrySource(source: RenderProjectSourceRef): string {
  const range = source.range ? `:${source.range.start.line}${source.range.end ? `-${source.range.end.line}` : ""}` : "";
  const label = `${source.path}${range}`;
  const sourceLabel = source.linkUrl
    ? `<a href="${escapeHtml(source.linkUrl)}">${escapeHtml(label)}</a>`
    : escapeHtml(label);
  const sourceDetails = [
    `<dt>Source</dt><dd>${sourceLabel}</dd>`,
    source.language ? `<dt>Language</dt><dd>${escapeHtml(source.language)}</dd>` : "",
    source.rangeSource ? `<dt>Range Source</dt><dd>${escapeHtml(source.rangeSource)}</dd>` : "",
    source.confidence ? `<dt>Confidence</dt><dd>${escapeHtml(source.confidence)}</dd>` : ""
  ].join("");
  const preview = source.preview ? renderProjectSourcePreview(source.preview, source.path) : "";

  return `<section class="hia-source-section"><h3>Source</h3><dl class="hia-project-meta">${sourceDetails}</dl>${preview}</section>`;
}

function renderProjectEntryDocSourceMap(docSourceMap: RenderProjectEntryDocSourceMapRef): string {
  const sourceRange = docSourceMap.sourceRange ? `:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.end ? `-${docSourceMap.sourceRange.end.line}` : ""}` : "";
  const diagnostics = docSourceMap.diagnostics && docSourceMap.diagnostics.length > 0
    ? `<dt>Diagnostics</dt><dd>${escapeHtml(docSourceMap.diagnostics.join(", "))}</dd>`
    : "";
  const details = [
    `<dt>Manifest</dt><dd>${escapeHtml(docSourceMap.path)}</dd>`,
    `<dt>Entry</dt><dd>${escapeHtml(docSourceMap.entryId)}</dd>`,
    docSourceMap.sourcePath ? `<dt>Original Source</dt><dd>${escapeHtml(docSourceMap.sourcePath)}${escapeHtml(sourceRange)}</dd>` : "",
    docSourceMap.sourceRangeSource ? `<dt>Range Source</dt><dd>${escapeHtml(docSourceMap.sourceRangeSource)}</dd>` : "",
    docSourceMap.sourceConfidence ? `<dt>Source Confidence</dt><dd>${escapeHtml(docSourceMap.sourceConfidence)}</dd>` : "",
    docSourceMap.artifactPath ? `<dt>Generated Artifact</dt><dd>${escapeHtml(docSourceMap.artifactPath)}</dd>` : "",
    docSourceMap.artifactSelector ? `<dt>Selector</dt><dd>${escapeHtml(docSourceMap.artifactSelector)}</dd>` : "",
    docSourceMap.artifactConfidence ? `<dt>Artifact Confidence</dt><dd>${escapeHtml(docSourceMap.artifactConfidence)}</dd>` : "",
    diagnostics
  ].join("");
  const actions = renderProjectDocSourceMapOpenRequests(docSourceMap);

  return `<section class="hia-source-section"><h3>Doc Source Map</h3><dl class="hia-project-meta">${details}</dl>${actions}</section>`;
}

function renderProjectSourcePreview(preview: RenderProjectSourcePreviewRef, fallbackPath: string): string {
  if (!preview.content) {
    return "";
  }

  const caption = preview.range
    ? `${fallbackPath}:${preview.range.start.line}-${preview.range.end?.line ?? preview.range.start.line}`
    : fallbackPath;
  const open = preview.defaultExpanded === false ? "" : " open";
  const language = preview.language ? ` data-hia-source-language="${escapeHtml(preview.language)}"` : "";

  return [
    `<details class="hia-source-preview hia-project-source-preview"${open}>`,
    `<summary>Source Preview ${escapeHtml(caption)}</summary>`,
    `<pre class="hia-source-code"${language}><code>${escapeHtml(preview.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderProjectDocSourceMapOpenRequests(docSourceMap: RenderProjectEntryDocSourceMapRef): string {
  const sourceLabel = docSourceMap.sourcePath && docSourceMap.sourceRange
    ? `${docSourceMap.sourcePath}:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.start.column ? `:${docSourceMap.sourceRange.start.column}` : ""}`
    : docSourceMap.sourcePath;
  const generatedLabel = docSourceMap.artifactPath ?? "";
  const buttons = [
    sourceLabel
      ? `<button type="button" data-hia-open-request="source" data-hia-open-path="${escapeHtml(docSourceMap.sourcePath ?? "")}" data-hia-open-line="${escapeHtml(String(docSourceMap.sourceRange?.start.line ?? ""))}" data-hia-open-column="${escapeHtml(String(docSourceMap.sourceRange?.start.column ?? ""))}">Open Source ${escapeHtml(sourceLabel)}</button>`
      : "",
    generatedLabel
      ? `<button type="button" data-hia-open-request="generated" data-hia-open-path="${escapeHtml(generatedLabel)}">Open Generated ${escapeHtml(generatedLabel)}</button>`
      : ""
  ].filter(Boolean).join("");

  return buttons ? `<div class="hia-source-actions">${buttons}</div>` : "";
}

function renderProjectProfiles(profiles: RenderProjectProfileRef[]): string {
  if (profiles.length === 0) {
    return "";
  }

  const items = profiles
    .map((profile) => {
      const version = profile.profileVersion ? `@${profile.profileVersion}` : "";
      return `<li>${escapeHtml(profile.profileId)}${escapeHtml(version)}</li>`;
    })
    .join("");

  return `<section class="hia-project-summary"><h2>Profiles</h2><ul>${items}</ul></section>`;
}

function renderProjectDocSourceMaps(docSourceMaps: RenderProjectDocSourceMapRef[]): string {
  if (docSourceMaps.length === 0) {
    return "";
  }

  const items = docSourceMaps
    .map((item) => {
      const status = item.status ? ` (${escapeHtml(item.status)})` : "";
      const counts = typeof item.entryCount === "number"
        ? ` - ${escapeHtml(String(item.linkedEntryCount ?? 0))}/${escapeHtml(String(item.entryCount))} linked`
        : "";
      const privacy = item.sourcesContentPolicy ? `, sourcesContentPolicy=${escapeHtml(item.sourcesContentPolicy)}` : "";
      const shape = typeof item.sourceCount === "number" && typeof item.artifactCount === "number"
        ? `, ${escapeHtml(String(item.sourceCount))} source(s), ${escapeHtml(String(item.artifactCount))} artifact(s)`
        : "";
      const sourceMaps = item.sourceMaps && item.sourceMaps.length > 0
        ? `<ul class="hia-project-source-map-list">${item.sourceMaps.map((sourceMap) => `<li>${escapeHtml(sourceMap.path ?? sourceMap.id)}</li>`).join("")}</ul>`
        : "";
      const sourceMapCount = typeof item.sourceMapCount === "number" ? `, ${escapeHtml(String(item.sourceMapCount))} source map(s)` : "";
      return `<li>${escapeHtml(item.path)}${status}${counts}${privacy}${shape}${sourceMapCount}${sourceMaps}</li>`;
    })
    .join("");

  return `<section class="hia-project-summary"><h2>Doc Source Maps</h2><ul>${items}</ul></section>`;
}

function renderProjectDiagnostics(diagnostics: HiaDiagnostic[]): string {
  if (diagnostics.length === 0) {
    return "";
  }

  const items = diagnostics
    .map((diagnostic) => `<li>${escapeHtml(diagnostic.severity)}:${escapeHtml(diagnostic.code)} - ${escapeHtml(diagnostic.message)}</li>`)
    .join("");

  return `<section class="hia-project-diagnostics"><h3>Diagnostics</h3><ul>${items}</ul></section>`;
}

function renderProjectViewScript(): string {
  return [
    "<script>",
    "(() => {",
    "  const buttons = Array.from(document.querySelectorAll('[data-hia-project-view]'));",
    "  const entries = Array.from(document.querySelectorAll('[data-hia-project-entry]'));",
    "  const navItems = Array.from(document.querySelectorAll('[data-hia-project-nav]'));",
    "  const search = document.querySelector('[data-hia-project-search]');",
    "  const empty = document.querySelector('[data-hia-project-empty]');",
    "  let activeView = 'all';",
    "  function matchesFilter(item, view, query) {",
    "    const viewName = item.dataset.hiaProjectEntry || item.dataset.hiaProjectNav || 'other';",
    "    const text = (item.dataset.hiaProjectSearchText || '').toLowerCase();",
    "    return (view === 'all' || viewName === view) && (!query || text.includes(query));",
    "  }",
    "  function activate(view) {",
    "    activeView = view;",
    "    const query = String(search?.value || '').trim().toLowerCase();",
    "    let visibleCount = 0;",
    "    for (const entry of entries) {",
    "      const visible = matchesFilter(entry, view, query);",
    "      entry.hidden = !visible;",
    "      if (visible) visibleCount += 1;",
    "    }",
    "    for (const item of navItems) item.hidden = !matchesFilter(item, view, query);",
    "    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.hiaProjectView === view));",
    "    if (empty) empty.hidden = visibleCount > 0;",
    "  }",
    "  for (const button of buttons) button.addEventListener('click', () => activate(button.dataset.hiaProjectView || 'all'));",
    "  search?.addEventListener('input', () => activate(activeView));",
    "  for (const button of document.querySelectorAll('[data-hia-open-request]')) {",
    "    button.addEventListener('click', () => {",
    "      window.postMessage({",
    "        type: 'hia.renderer.openRequest',",
    "        request: {",
    "          kind: button.getAttribute('data-hia-open-request'),",
    "          path: button.getAttribute('data-hia-open-path'),",
    "          line: Number(button.getAttribute('data-hia-open-line')) || undefined,",
    "          column: Number(button.getAttribute('data-hia-open-column')) || undefined",
    "        }",
    "      }, window.location.protocol === 'file:' || window.location.origin === 'null' ? '*' : window.location.origin);",
    "    });",
    "  }",
    "  activate('all');",
    "})();",
    "</script>"
  ].join("");
}

const PROJECT_VIEW_ORDER: readonly RenderProjectView[] = ["all", "js", "css", "html", "dotnet", "other"];

function collectProjectNavigationGroups(entries: RenderProjectEntry[]): RenderProjectNavigationGroup[] {
  return [
    ...collectProjectNavigationGroupsBy(entries, "kind", (entry) => entry.kind || "unknown-kind"),
    ...collectProjectNavigationGroupsBy(entries, "profile-layer", (entry) => entry.profile?.layer || entry.profile?.profileId || "unknown-profile"),
    ...collectProjectNavigationGroupsBy(entries, "source-root", (entry) => getProjectSourceRoot(entry.source?.path))
  ].sort(compareProjectNavigationGroups);
}

function collectProjectNavigationGroupsBy(
  entries: RenderProjectEntry[],
  kind: RenderProjectNavigationGroupKind,
  keyFactory: (entry: RenderProjectEntry) => string
): RenderProjectNavigationGroup[] {
  const groups = new Map<string, { entryCount: number; views: Set<RenderProjectView> }>();

  for (const entry of entries) {
    const label = keyFactory(entry);
    const current = groups.get(label) ?? { entryCount: 0, views: new Set<RenderProjectView>() };
    current.entryCount += 1;
    current.views.add(entry.view);
    groups.set(label, current);
  }

  return [...groups.entries()].map(([label, group]) => ({
    id: `${kind}:${slugProjectGroupLabel(label)}`,
    kind,
    label,
    entryCount: group.entryCount,
    views: sortProjectViews([...group.views])
  }));
}

function getProjectSourceRoot(sourcePath: string | undefined): string {
  if (!sourcePath) {
    return "unknown-source";
  }

  const normalized = sourcePath.replaceAll("\\", "/");
  const firstSegment = normalized.split("/").find((segment) => segment.length > 0);
  return firstSegment || "unknown-source";
}

function compareProjectNavigationGroups(left: RenderProjectNavigationGroup, right: RenderProjectNavigationGroup): number {
  const kindOrder = compareStableNumber(projectGroupKindOrder(left.kind), projectGroupKindOrder(right.kind));
  if (kindOrder !== 0) {
    return kindOrder;
  }

  const countOrder = compareStableNumber(right.entryCount, left.entryCount);
  if (countOrder !== 0) {
    return countOrder;
  }

  return compareStableText(left.label, right.label);
}

function projectGroupKindOrder(kind: RenderProjectNavigationGroupKind): number {
  if (kind === "kind") {
    return 0;
  }

  if (kind === "profile-layer") {
    return 1;
  }

  return 2;
}

function compareStableNumber(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function slugProjectGroupLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "group";
}

function sortProjectViews(views: RenderProjectView[]): RenderProjectView[] {
  return views.sort((left, right) => PROJECT_VIEW_ORDER.indexOf(left) - PROJECT_VIEW_ORDER.indexOf(right));
}

function collectProjectViews(entries: RenderProjectEntry[]): RenderProjectView[] {
  const views: RenderProjectView[] = ["all"];

  for (const view of PROJECT_VIEW_ORDER.filter((view) => view !== "all")) {
    if (entries.some((entry) => entry.view === view)) {
      views.push(view);
    }
  }

  return views;
}

function countEntriesByView(entries: RenderProjectEntry[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: entries.length
  };

  for (const entry of entries) {
    counts[entry.view] = (counts[entry.view] ?? 0) + 1;
  }

  return counts;
}

function createProjectEntrySearchText(entry: RenderProjectEntry): string {
  return [
    entry.id,
    entry.name,
    entry.kind,
    entry.summary,
    entry.signature,
    entry.symbolId,
    entry.view,
    entry.profile?.profileId,
    entry.input?.kind,
    entry.input?.path,
    entry.source?.path,
    entry.source?.language,
    entry.source?.preview?.content,
    entry.docSourceMap?.path,
    entry.docSourceMap?.entryId,
    entry.docSourceMap?.sourcePath,
    entry.docSourceMap?.artifactPath,
    entry.docSourceMap?.artifactSelector,
    ...collectProjectEntryLocalizedText(entry)
  ].filter((item): item is string => typeof item === "string" && item.length > 0).join(" ").toLowerCase();
}

function collectProjectEntryLocalizedText(entry: RenderProjectEntry): string[] {
  return Object.values(entry.i18n?.fields ?? {})
    .flatMap((field) => Object.values(field.localizedText));
}

function formatProjectViewLabel(view: RenderProjectView): string {
  if (view === "js") {
    return "JS";
  }

  if (view === "css") {
    return "CSS";
  }

  if (view === "html") {
    return "HTML";
  }

  if (view === "dotnet") {
    return ".NET";
  }

  if (view === "all") {
    return "All";
  }

  return "Other";
}

function renderLocaleControl(locales: string[], selectedLocale: string): string {
  if (locales.length < 2) {
    return "";
  }

  const options = locales
    .map((locale) => {
      const selected = locale === selectedLocale ? " selected" : "";
      return `<option value="${escapeHtml(locale)}"${selected}>${escapeHtml(locale)}</option>`;
    })
    .join("");

  return [
    "<div class=\"hia-language-switch\">",
    "<label for=\"hia-locale-control\">Language</label>",
    `<select id="hia-locale-control" data-hia-locale-control>${options}</select>`,
    "</div>"
  ].join("");
}

function renderSymbol(symbol: HiaSymbol, document: HiaDocument, locales: string[], selectedLocale: string): string {
  const signature = symbol.signature ? `<pre class="hia-signature"><code>${escapeHtml(symbol.signature)}</code></pre>` : "";
  const description = renderI18nField(symbol, "description", locales, selectedLocale, symbol.summary);
  const otherFields = renderAdditionalI18nFields(symbol, locales, selectedLocale);
  const source = renderSource(symbol);

  return [
    `<article class="hia-symbol" id="${escapeHtml(symbol.id)}">`,
    `<h2>${escapeHtml(symbol.name)}</h2>`,
    `<span class="hia-kind">${escapeHtml(symbol.kind)}</span>`,
    signature,
    description || (symbol.summary ? `<p>${escapeHtml(symbol.summary)}</p>` : ""),
    otherFields,
    source,
    "</article>"
  ].join("");
}

function renderAdditionalI18nFields(symbol: HiaSymbol, locales: string[], selectedLocale: string): string {
  const fields = symbol.i18n?.fields || {};
  const fieldEntries = Object.entries(fields).filter(([fieldPath]) => fieldPath !== "description");

  if (fieldEntries.length === 0) {
    return "";
  }

  const items = fieldEntries
    .map(([fieldPath]) => {
      const renderedField = renderI18nField(symbol, fieldPath, locales, selectedLocale);
      return renderedField
        ? `<div class="hia-i18n-field"><dt>${escapeHtml(fieldPath)}</dt><dd>${renderedField}</dd></div>`
        : "";
    })
    .join("");

  return items ? `<section class="hia-i18n-fields"><h3>Localized Fields</h3><dl>${items}</dl></section>` : "";
}

function renderI18nField(
  symbol: HiaSymbol,
  fieldPath: string,
  locales: string[],
  selectedLocale: string,
  fallbackText = ""
): string {
  const field = getI18nField(symbol.i18n, fieldPath);

  if (!field && !fallbackText) {
    return "";
  }

  const blocks = locales
    .map((locale) => renderLocalizedBlock(field, locale, selectedLocale, createI18nResolveOptions(symbol), fallbackText))
    .join("");

  return `<div class="hia-localized-set" data-hia-i18n-field="${escapeHtml(fieldPath)}">${blocks}</div>`;
}

function renderLocalizedBlock(
  field: HiaI18nField | undefined,
  locale: string,
  selectedLocale: string,
  options: ReturnType<typeof createI18nResolveOptions>,
  fallbackText: string
): string {
  const resolved = field
    ? resolveI18nFieldText(field, locale, options)
    : createFallbackResolvedText(locale, selectedLocale, fallbackText);
  const hidden = locale === selectedLocale ? "" : " hidden";
  const fallbackAttrs = resolved.usedFallback
    ? ` data-hia-used-fallback="true" data-hia-fallback-from="${escapeHtml(resolved.resolvedLocale)}"`
    : "";
  const fallbackBadge = resolved.usedFallback && resolved.resolvedLocale
    ? `<span class="hia-fallback-badge">fallback: ${escapeHtml(resolved.resolvedLocale)}</span>`
    : "";

  return [
    `<p class="hia-localized-text" data-hia-locale="${escapeHtml(locale)}"${fallbackAttrs}${hidden}>`,
    escapeHtml(resolved.text),
    fallbackBadge,
    "</p>"
  ].join("");
}

function createFallbackResolvedText(locale: string, selectedLocale: string, text: string): HiaResolvedText {
  return {
    requestedLocale: locale,
    resolvedLocale: selectedLocale,
    fallbackChain: [locale, selectedLocale],
    usedFallback: locale !== selectedLocale,
    missing: !text,
    text
  };
}

function renderSource(symbol: HiaSymbol): string {
  const source = symbol.source;

  if (!source || source.mode === "none") {
    return "";
  }

  const showLinks = source.mode === "link" || source.mode === "all";
  const showPreview = source.mode === "include" || source.mode === "all";
  const definedIn = source.definedIn ? renderDefinedIn(source.definedIn, showLinks) : "";
  const primaryBlock = showPreview && source.primaryBlock?.content ? renderPrimaryBlock(source.primaryBlock) : "";
  const fragments = showPreview ? renderSourceReferences(source) : "";

  if (!definedIn && !primaryBlock && !fragments) {
    return "";
  }

  return [
    "<section class=\"hia-source-section\">",
    "<h3>Source</h3>",
    definedIn,
    primaryBlock,
    fragments ? `<section class="hia-source-references"><h4>Referenced Source Fragments</h4>${fragments}</section>` : "",
    "</section>"
  ].join("");
}

function renderDefinedIn(definedIn: HiaSourceDefinedIn, enableLink: boolean): string {
  const line = definedIn.position?.line ? `:${definedIn.position.line}` : "";
  const label = `${definedIn.relativePath}${line}`;

  if (enableLink && definedIn.link?.enabled !== false && definedIn.link?.lineUrl) {
    return `<p class="hia-source-line">Defined in <a href="${escapeHtml(definedIn.link.lineUrl)}">${escapeHtml(label)}</a></p>`;
  }

  return `<p class="hia-source-line">Defined in ${escapeHtml(label)}</p>`;
}

function renderPrimaryBlock(block: HiaSourcePrimaryBlock): string {
  if (!block.content || block.confidence === "none" || block.preview?.enabled === false) {
    return "";
  }

  const caption = formatSourceCaption(block.relativePath || "source", block.range);
  const open = block.preview?.defaultExpanded === false ? "" : " open";
  return [
    `<details class="hia-source-preview"${open}>`,
    `<summary>${renderSourceCaption(caption, block.link?.lineUrl, block.link?.enabled !== false)}</summary>`,
    `<pre class="hia-source-code"><code>${escapeHtml(block.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderSourceReferences(source: HiaSourceMetadata): string {
  const fragmentsById = new Map((source.fragments || []).map((fragment) => [fragment.id, fragment]));
  const referencedFragmentIds = new Set(
    (source.references || [])
      .map((reference) => reference.fragment?.id)
      .filter((id): id is string => Boolean(id))
  );
  const standaloneFragments = (source.fragments || []).filter((fragment) => !referencedFragmentIds.has(fragment.id));

  return [
    ...standaloneFragments.map((fragment) => renderSourceFragment(fragment)),
    ...(source.references || [])
      .map((reference) => renderSourceReference(reference, fragmentsById.get(reference.fragment?.id || reference.targetId)))
      .filter(Boolean)
  ].join("");
}

function renderSourceReference(reference: HiaSourceReference, fallbackFragment?: HiaSourceFragment): string {
  if (!reference.resolved || !reference.fragment) {
    return `<p class="hia-source-unresolved">${escapeHtml(reference.targetId)} unresolved</p>`;
  }

  const fragment = {
    ...fallbackFragment,
    ...reference.fragment
  };

  return renderSourceFragment(fragment, reference.targetId);
}

function renderSourceFragment(fragment: HiaSourceFragment, label = fragment.id): string {
  if (!fragment.content || fragment.confidence === "none" || fragment.preview?.enabled === false) {
    return "";
  }

  const caption = `${label} - ${formatSourceCaption(fragment.relativePath, fragment.range)}`;
  const open = fragment.preview?.defaultExpanded === true ? " open" : "";
  return [
    `<details class="hia-source-fragment"${open}>`,
    `<summary>${renderSourceCaption(caption, fragment.link?.lineUrl, fragment.link?.enabled !== false)}</summary>`,
    `<pre class="hia-source-code"><code>${escapeHtml(fragment.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function formatSourceCaption(path: string, range: HiaSourcePrimaryBlock["range"]): string {
  if (!range) {
    return path;
  }

  return `${path}:${range.start.line}-${range.end.line}`;
}

function renderSourceCaption(caption: string, lineUrl: string | undefined, enableLink: boolean): string {
  if (!enableLink || !lineUrl) {
    return escapeHtml(caption);
  }

  return `<a href="${escapeHtml(lineUrl)}">${escapeHtml(caption)}</a>`;
}

function normalizeLocales(document: HiaDocument, selectedLocale: string): string[] {
  const locales = [...document.locales];

  for (const locale of [selectedLocale, document.defaultLocale]) {
    if (locale && !locales.includes(locale)) {
      locales.unshift(locale);
    }
  }

  return locales;
}

function resolveProjectLocaleModel(
  projectInput: RenderProjectHtmlInput,
  requestedLocale: string | undefined
): { selectedLocale: string; locales: string[] } {
  const declaredLocales = projectInput.project.locales ?? [];
  const inferredLocales = projectInput.entries
    .flatMap((entry) => [
      ...(entry.i18n?.locales ?? []),
      ...Object.values(entry.i18n?.fields ?? {}).flatMap((field) => Object.keys(field.localizedText))
    ]);
  const defaultLocale = projectInput.project.defaultLocale
    ?? declaredLocales[0]
    ?? inferredLocales[0]
    ?? "und";
  const selectedLocale = requestedLocale ?? defaultLocale;
  const locales: string[] = [];

  for (const locale of [selectedLocale, defaultLocale, ...declaredLocales, ...inferredLocales]) {
    if (locale && !locales.includes(locale)) {
      locales.push(locale);
    }
  }

  return { selectedLocale, locales };
}

function createI18nResolveOptions(symbol: HiaSymbol) {
  return createI18nResolveOptionsFromModel(symbol.i18n);
}

function createI18nResolveOptionsFromModel(model: HiaI18nModel | undefined) {
  return {
    ...(model?.defaultLocale ? { defaultLocale: model.defaultLocale } : {}),
    ...(model?.fallbackLocale ? { fallbackLocale: model.fallbackLocale } : {})
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
