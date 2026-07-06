import {
  getI18nField,
  resolveI18nFieldText,
  type HiaDiagnostic,
  type HiaDocument,
  type HiaI18nField,
  type HiaResolvedText,
  type HiaSourceDefinedIn,
  type HiaSourceFragment,
  type HiaSourcePrimaryBlock,
  type HiaSourceReference,
  type HiaSymbol
} from "@hia-doc/core";
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets } from "@hia-doc/theme-default";

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

export interface RenderHtmlResult {
  files: RenderedHtmlFile[];
  diagnostics: HiaDiagnostic[];
  manifest: RenderHtmlManifest;
}

export interface RenderHtmlManifest {
  schemaVersion: "0.1.0";
  renderer: "@hia-doc/renderer-html";
  documentId: string;
  title: string;
  entrypoint: string;
  initialLocale: string;
  locales: string[];
  files: RenderHtmlManifestFile[];
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

function createManifest(document: HiaDocument, files: RenderedHtmlFile[], options: RenderHtmlOptions): RenderHtmlManifest {
  return {
    schemaVersion: "0.1.0",
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

  if (!source) {
    return "";
  }

  const definedIn = source.definedIn ? renderDefinedIn(source.definedIn) : "";
  const primaryBlock = source.primaryBlock?.content ? renderPrimaryBlock(source.primaryBlock) : "";
  const fragments = [
    ...(source.fragments || []).map((fragment) => renderSourceFragment(fragment)),
    ...(source.references || []).map((reference) => renderSourceReference(reference)).filter(Boolean)
  ].join("");

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

function renderDefinedIn(definedIn: HiaSourceDefinedIn): string {
  const line = definedIn.position?.line ? `:${definedIn.position.line}` : "";
  const label = `${definedIn.relativePath}${line}`;

  if (definedIn.link?.lineUrl) {
    return `<p class="hia-source-line">Defined in <a href="${escapeHtml(definedIn.link.lineUrl)}">${escapeHtml(label)}</a></p>`;
  }

  return `<p class="hia-source-line">Defined in ${escapeHtml(label)}</p>`;
}

function renderPrimaryBlock(block: HiaSourcePrimaryBlock): string {
  if (!block.content || block.confidence === "none") {
    return "";
  }

  const caption = formatSourceCaption(block.relativePath || "source", block.range);
  return [
    "<details class=\"hia-source-preview\" open>",
    `<summary>${escapeHtml(caption)}</summary>`,
    `<pre class="hia-source-code"><code>${escapeHtml(block.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderSourceReference(reference: HiaSourceReference): string {
  if (!reference.resolved || !reference.fragment) {
    return `<p class="hia-source-unresolved">${escapeHtml(reference.targetId)} unresolved</p>`;
  }

  return renderSourceFragment(reference.fragment, reference.targetId);
}

function renderSourceFragment(fragment: HiaSourceFragment, label = fragment.id): string {
  const caption = `${label} - ${formatSourceCaption(fragment.relativePath, fragment.range)}`;
  return [
    "<details class=\"hia-source-fragment\">",
    `<summary>${escapeHtml(caption)}</summary>`,
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
