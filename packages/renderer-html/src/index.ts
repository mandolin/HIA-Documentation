import {
  getI18nField,
  resolveI18nFieldText,
  type HiaDiagnostic,
  type HiaDocument,
  type HiaI18nField,
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

export interface RenderedHtmlFile {
  path: string;
  contents: string;
  contentType: string;
  role: "entry" | "asset";
}

export interface RenderHtmlOptions {
  locale?: string;
  title?: string;
  includeThemeAssets?: boolean;
}

export type RenderProjectView = "all" | "js" | "css" | "html" | "other";

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
}

export interface RenderProjectProfileRef {
  profileId: string;
  profileVersion?: string;
  layer?: string;
  path?: string;
}

export interface RenderProjectDocSourceMapRef {
  path: string;
  contractVersion?: string;
  entryArtifact?: string;
  status?: string;
}

export interface RenderProjectEntry {
  id: string;
  name: string;
  kind: string;
  view: RenderProjectView;
  summary?: string;
  signature?: string;
  profile?: RenderProjectProfileRef;
  input?: RenderProjectInputRef;
  source?: RenderProjectSourceRef;
  diagnostics?: HiaDiagnostic[];
}

export interface RenderProjectInputRef {
  kind: string;
  path: string;
  artifactId?: string;
  contract?: string;
  contractVersion?: string;
}

export interface RenderProjectSourceRef {
  path: string;
  language?: string;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  rangeSource?: string;
  confidence?: string;
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
    profiles?: RenderProjectProfileRef[];
    docSourceMaps?: RenderProjectDocSourceMapRef[];
  };
}

export interface RenderHtmlManifestFile {
  path: string;
  role: RenderedHtmlFile["role"];
  contentType: string;
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
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderProjectIndexHtml(pageTitle, projectInput),
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
    diagnostics: projectInput.diagnostics ?? [],
    manifest: createProjectManifest(projectInput, files, pageTitle)
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

function createProjectManifest(projectInput: RenderProjectHtmlInput, files: RenderedHtmlFile[], pageTitle: string): RenderHtmlManifest {
  const projectId = projectInput.project.id ?? `project:${projectInput.project.name}`;
  const views = collectProjectViews(projectInput.entries);

  return {
    schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
    renderer: "@hia-doc/renderer-html",
    documentId: projectId,
    title: pageTitle,
    entrypoint: "index.html",
    initialLocale: "und",
    locales: ["und"],
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
      ...(projectInput.profiles && projectInput.profiles.length > 0 ? { profiles: projectInput.profiles } : {}),
      ...(projectInput.docSourceMaps && projectInput.docSourceMaps.length > 0 ? { docSourceMaps: projectInput.docSourceMaps } : {})
    }
  };
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

function renderProjectIndexHtml(pageTitle: string, projectInput: RenderProjectHtmlInput): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const views = collectProjectViews(projectInput.entries);
  const navigation = projectInput.entries
    .map((entry) => `<li data-hia-project-nav="${escapeHtml(entry.view)}"><a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</a></li>`)
    .join("");
  const entries = projectInput.entries.map((entry) => renderProjectEntry(entry)).join("");
  const profileSummary = renderProjectProfiles(projectInput.profiles ?? []);
  const docSourceMapSummary = renderProjectDocSourceMaps(projectInput.docSourceMaps ?? []);
  const diagnostics = renderProjectDiagnostics(projectInput.diagnostics ?? []);

  return [
    "<!doctype html>",
    "<html lang=\"und\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell hia-project-shell\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1>`,
    renderProjectViewControl(views),
    navigation ? `<nav><ul>${navigation}</ul></nav>` : "",
    profileSummary,
    docSourceMapSummary,
    diagnostics,
    "</aside>",
    "<main class=\"hia-main hia-project-main\">",
    entries || "<p>No project documentation entries.</p>",
    "</main>",
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    renderProjectViewScript(),
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectViewControl(views: RenderProjectView[]): string {
  const buttons = views
    .map((view) => `<button type="button" class="hia-project-view-button" data-hia-project-view="${escapeHtml(view)}">${escapeHtml(formatProjectViewLabel(view))}</button>`)
    .join("");

  return `<div class="hia-project-views">${buttons}</div>`;
}

function renderProjectEntry(entry: RenderProjectEntry): string {
  const signature = entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : "";
  const summary = entry.summary ? `<p>${escapeHtml(entry.summary)}</p>` : "";
  const input = entry.input ? renderProjectEntryInput(entry.input) : "";
  const profile = entry.profile ? renderProjectEntryProfile(entry.profile) : "";
  const source = entry.source ? renderProjectEntrySource(entry.source) : "";
  const diagnostics = renderProjectDiagnostics(entry.diagnostics ?? []);

  return [
    `<article class="hia-symbol hia-project-entry" id="${escapeHtml(entry.id)}" data-hia-project-entry="${escapeHtml(entry.view)}">`,
    `<h2>${escapeHtml(entry.name)}</h2>`,
    `<span class="hia-kind">${escapeHtml(entry.kind)}</span>`,
    `<span class="hia-kind">${escapeHtml(formatProjectViewLabel(entry.view))}</span>`,
    signature,
    summary,
    input,
    profile,
    source,
    diagnostics,
    "</article>"
  ].join("");
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
  const sourceDetails = [
    `<dt>Source</dt><dd>${escapeHtml(source.path)}${escapeHtml(range)}</dd>`,
    source.language ? `<dt>Language</dt><dd>${escapeHtml(source.language)}</dd>` : "",
    source.rangeSource ? `<dt>Range Source</dt><dd>${escapeHtml(source.rangeSource)}</dd>` : "",
    source.confidence ? `<dt>Confidence</dt><dd>${escapeHtml(source.confidence)}</dd>` : ""
  ].join("");

  return `<section class="hia-source-section"><h3>Source</h3><dl class="hia-project-meta">${sourceDetails}</dl></section>`;
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
    .map((item) => `<li>${escapeHtml(item.path)}${item.status ? ` (${escapeHtml(item.status)})` : ""}</li>`)
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
    "  function activate(view) {",
    "    for (const entry of entries) entry.hidden = view !== 'all' && entry.dataset.hiaProjectEntry !== view;",
    "    for (const item of navItems) item.hidden = view !== 'all' && item.dataset.hiaProjectNav !== view;",
    "    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.hiaProjectView === view));",
    "  }",
    "  for (const button of buttons) button.addEventListener('click', () => activate(button.dataset.hiaProjectView || 'all'));",
    "  activate('all');",
    "})();",
    "</script>"
  ].join("");
}

function collectProjectViews(entries: RenderProjectEntry[]): RenderProjectView[] {
  const views: RenderProjectView[] = ["all"];

  for (const view of ["js", "css", "html", "other"] as const) {
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

function createI18nResolveOptions(symbol: HiaSymbol) {
  return {
    ...(symbol.i18n?.defaultLocale ? { defaultLocale: symbol.i18n.defaultLocale } : {}),
    ...(symbol.i18n?.fallbackLocale ? { fallbackLocale: symbol.i18n.fallbackLocale } : {})
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
