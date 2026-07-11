import {
  findGeneratedPositionForOriginal,
  querySourceLinkedPosition,
  type DocSourceMapArtifactLink,
  type DocSourceMapIndex,
  type DocSourceMapSourceLink,
  type DocSourceMapSourceMapLink,
  type OrdinarySourceMapIndex,
  type SourceMapGeneratedPosition,
  type SourceMapOriginalPosition
} from "@hia-doc/source-linkage";

export const HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION = "0.1.0";

export type BrowserPanelDomain = "js" | "css" | "html" | "other";

export interface BrowserPanelProjectInfo {
  id?: string;
  name: string;
  title?: string;
}

export interface BrowserPanelPosition {
  column?: number;
  line: number;
}

export interface BrowserPanelRange {
  end?: BrowserPanelPosition;
  start: BrowserPanelPosition;
}

export interface CreateBrowserPanelPayloadInput {
  docSourceMaps: BrowserPanelDocSourceMapInput[];
  project: BrowserPanelProjectInfo;
}

export interface BrowserPanelDocSourceMapInput {
  index: DocSourceMapIndex;
  ordinarySourceMaps?: BrowserPanelOrdinarySourceMapInput[];
  path: string;
}

export interface BrowserPanelOrdinarySourceMapInput {
  index: OrdinarySourceMapIndex;
  path: string;
}

export interface BrowserPanelPayload {
  diagnostics: BrowserPanelDiagnostic[];
  docSourceMaps: BrowserPanelDocSourceMap[];
  entries: BrowserPanelEntry[];
  generator: "@hia-doc/browser-panel";
  project: BrowserPanelProjectInfo;
  schemaVersion: typeof HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION;
  summary: BrowserPanelSummary;
}

export interface BrowserPanelSummary {
  docSourceMapCount: number;
  domainCounts: Record<BrowserPanelDomain | "all", number>;
  entryCount: number;
  linkedEntryCount: number;
  sourceMapCount: number;
}

export interface BrowserPanelDiagnostic {
  code: string;
  message: string;
  severity: string;
  targetPath?: string;
}

export interface BrowserPanelDocSourceMap {
  contractVersion?: string;
  entryCount: number;
  linkedEntryCount: number;
  path: string;
  sourceMapCount: number;
  sourceMaps: BrowserPanelSourceMapRef[];
  sourcesContentPolicy: string;
  status: string;
}

export interface BrowserPanelSourceMapRef {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
  loaded?: boolean;
}

export interface BrowserPanelEntry {
  artifactLinks: BrowserPanelArtifactRef[];
  docSourceMapPath: string;
  domain: BrowserPanelDomain;
  id: string;
  kind: string;
  label: string;
  lookup: BrowserPanelEntryLookup;
  openRequests: BrowserPanelOpenRequest[];
  sourceLinks: BrowserPanelSourceRef[];
  symbolId?: string;
  symbolKind?: string;
}

export interface BrowserPanelSourceRef {
  confidence?: string;
  language?: string;
  path?: string;
  range?: BrowserPanelRange;
  rangeSource?: string;
  sourceId: string;
}

export interface BrowserPanelArtifactRef {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  selector?: string;
}

export interface BrowserPanelEntryLookup {
  generated?: SourceMapGeneratedPosition;
  matchedEntryIds: string[];
  original?: SourceMapOriginalPosition;
  sourceMapPath?: string;
  status: string;
}

export interface BrowserPanelOpenRequest {
  id: string;
  kind: "generated-artifact" | "original-source";
  label: string;
  target: {
    path: string;
    position?: BrowserPanelPosition;
  };
  type: "hia.openGenerated" | "hia.openSource";
}

export interface RenderedBrowserPanelFile {
  contentType: string;
  contents: string;
  path: string;
  role: "entry" | "manifest" | "payload";
}

export interface BrowserPanelManifest {
  entrypoint: string;
  files: Array<{
    contentType: string;
    path: string;
    role: RenderedBrowserPanelFile["role"];
  }>;
  generator: "@hia-doc/browser-panel";
  payload: string;
  project: BrowserPanelProjectInfo;
  schemaVersion: typeof HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION;
}

export interface RenderBrowserPanelResult {
  files: RenderedBrowserPanelFile[];
  manifest: BrowserPanelManifest;
}

/**
 * 将 doc-source-map/source-map 查询结果整理成浏览器面板载荷。
 * Build the browser panel payload without reading files, so the same function can serve CLI, DevTools and tests.
 */
export function createBrowserPanelPayload(input: CreateBrowserPanelPayloadInput): BrowserPanelPayload {
  const docSourceMaps = input.docSourceMaps.map((docMap) => createDocSourceMapSummary(docMap));
  const entries = input.docSourceMaps.flatMap((docMap) => createBrowserPanelEntries(docMap));
  const diagnostics = input.docSourceMaps.flatMap((docMap) => normalizeDiagnostics(docMap.index.diagnostics));

  return {
    diagnostics,
    docSourceMaps,
    entries,
    generator: "@hia-doc/browser-panel",
    project: input.project,
    schemaVersion: HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION,
    summary: {
      docSourceMapCount: docSourceMaps.length,
      domainCounts: countEntriesByDomain(entries),
      entryCount: entries.length,
      linkedEntryCount: entries.filter((entry) => entry.lookup.status === "available" || entry.lookup.status === "doc-linked").length,
      sourceMapCount: docSourceMaps.reduce((total, docMap) => total + docMap.sourceMapCount, 0)
    }
  };
}

/**
 * 渲染可静态打开的面板文件，同时输出 JSON payload 供未来 DevTools panel 直接复用。
 * Render a standalone browser panel and a JSON payload that a future DevTools panel can consume directly.
 */
export function renderBrowserPanel(payload: BrowserPanelPayload): RenderBrowserPanelResult {
  const fileMetadata: BrowserPanelManifest["files"] = [
    { path: "index.html", role: "entry", contentType: "text/html; charset=utf-8" },
    { path: "browser-panel-payload.json", role: "payload", contentType: "application/json; charset=utf-8" },
    { path: "browser-panel-manifest.json", role: "manifest", contentType: "application/json; charset=utf-8" }
  ];
  const manifest: BrowserPanelManifest = {
    entrypoint: "index.html",
    files: fileMetadata,
    generator: "@hia-doc/browser-panel",
    payload: "browser-panel-payload.json",
    project: payload.project,
    schemaVersion: HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION
  };

  return {
    files: [
      {
        path: "index.html",
        contents: renderPanelHtml(payload),
        contentType: "text/html; charset=utf-8",
        role: "entry"
      },
      {
        path: "browser-panel-payload.json",
        contents: `${JSON.stringify(payload, null, 2)}\n`,
        contentType: "application/json; charset=utf-8",
        role: "payload"
      },
      {
        path: "browser-panel-manifest.json",
        contents: `${JSON.stringify(manifest, null, 2)}\n`,
        contentType: "application/json; charset=utf-8",
        role: "manifest"
      }
    ],
    manifest
  };
}

function createDocSourceMapSummary(input: BrowserPanelDocSourceMapInput): BrowserPanelDocSourceMap {
  const loadedSourceMapPaths = new Set((input.ordinarySourceMaps ?? []).map((item) => normalizePath(item.path)));

  return {
    ...(input.index.contractVersion ? { contractVersion: input.index.contractVersion } : {}),
    entryCount: input.index.entryCount,
    linkedEntryCount: input.index.linkedEntryCount,
    path: input.path,
    sourceMapCount: input.index.sourceMapCount,
    sourceMaps: input.index.sourceMaps.map((sourceMap) => ({
      ...sourceMap,
      ...(sourceMap.path ? { loaded: loadedSourceMapPaths.has(normalizePath(sourceMap.path)) } : {})
    })),
    sourcesContentPolicy: input.index.sourcesContentPolicy,
    status: input.index.status
  };
}

function createBrowserPanelEntries(input: BrowserPanelDocSourceMapInput): BrowserPanelEntry[] {
  return input.index.entries.map((entry) => {
    const sourceLinks = entry.sourceLinks.map(normalizeSourceLink);
    const artifactLinks = entry.artifactLinks.map(normalizeArtifactLink);
    const domain = inferEntryDomain(entry.symbolKind ?? entry.kind, sourceLinks, artifactLinks);
    const lookup = createEntryLookup(input, sourceLinks, artifactLinks);
    const id = createEntryId(input.path, entry.id);
    const label = entry.symbolId ?? entry.id;

    return {
      artifactLinks,
      docSourceMapPath: input.path,
      domain,
      id,
      kind: entry.kind,
      label,
      lookup,
      openRequests: createOpenRequests(id, lookup),
      sourceLinks,
      ...(entry.symbolId ? { symbolId: entry.symbolId } : {}),
      ...(entry.symbolKind ? { symbolKind: entry.symbolKind } : {})
    };
  });
}

function createEntryLookup(
  input: BrowserPanelDocSourceMapInput,
  sourceLinks: BrowserPanelSourceRef[],
  artifactLinks: BrowserPanelArtifactRef[]
): BrowserPanelEntryLookup {
  const source = sourceLinks.find((candidate) => candidate.path && candidate.range?.start);
  const artifact = artifactLinks.find((candidate) => candidate.path);
  const original = source?.path && source.range?.start
    ? {
        position: source.range.start,
        sourcePath: normalizePath(source.path)
      }
    : undefined;
  const ordinaryMap = artifact?.path
    ? findOrdinarySourceMapForArtifact(input.ordinarySourceMaps ?? [], artifact.path)
    : undefined;

  if (!original) {
    return {
      matchedEntryIds: [],
      status: "unmapped"
    };
  }

  if (!ordinaryMap) {
    return {
      matchedEntryIds: [],
      original,
      status: "doc-linked"
    };
  }

  const generatedLookup = findGeneratedPositionForOriginal(ordinaryMap.index, original.sourcePath, original.position);
  const generated = generatedLookup.generated;

  if (!generated) {
    return {
      matchedEntryIds: [],
      original,
      sourceMapPath: ordinaryMap.path,
      status: generatedLookup.status
    };
  }

  const combinedLookup = querySourceLinkedPosition(input.index, ordinaryMap.index, {
    originalPosition: original.position,
    originalSourcePath: original.sourcePath
  });

  return {
    generated,
    matchedEntryIds: combinedLookup.entries.map((entry) => entry.id),
    original: combinedLookup.original ?? original,
    sourceMapPath: ordinaryMap.path,
    status: combinedLookup.status
  };
}

function findOrdinarySourceMapForArtifact(sourceMaps: BrowserPanelOrdinarySourceMapInput[], artifactPath: string): BrowserPanelOrdinarySourceMapInput | undefined {
  const normalizedArtifactPath = normalizePath(artifactPath);

  return sourceMaps.find((sourceMap) => {
    if (sourceMap.index.artifactPath && normalizePath(sourceMap.index.artifactPath) === normalizedArtifactPath) {
      return true;
    }

    const normalizedSourceMapPath = normalizePath(sourceMap.path);
    return normalizedSourceMapPath === `${normalizedArtifactPath}.map` || normalizedSourceMapPath.endsWith(`/${basename(normalizedArtifactPath)}.map`);
  });
}

function createOpenRequests(entryId: string, lookup: BrowserPanelEntryLookup): BrowserPanelOpenRequest[] {
  const requests: BrowserPanelOpenRequest[] = [];

  if (lookup.original) {
    requests.push({
      id: `${entryId}:open-source`,
      kind: "original-source",
      label: `Open source ${formatPositionLabel(lookup.original.sourcePath, lookup.original.position)}`,
      target: {
        path: lookup.original.sourcePath,
        position: lookup.original.position
      },
      type: "hia.openSource"
    });
  }

  if (lookup.generated?.artifactPath) {
    requests.push({
      id: `${entryId}:open-generated`,
      kind: "generated-artifact",
      label: `Open generated ${formatPositionLabel(lookup.generated.artifactPath, lookup.generated.position)}`,
      target: {
        path: lookup.generated.artifactPath,
        position: lookup.generated.position
      },
      type: "hia.openGenerated"
    });
  }

  return requests;
}

function normalizeSourceLink(link: DocSourceMapSourceLink): BrowserPanelSourceRef {
  return {
    sourceId: link.sourceId,
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: normalizePath(link.path) } : {}),
    ...(link.range ? { range: link.range } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {})
  };
}

function normalizeArtifactLink(link: DocSourceMapArtifactLink): BrowserPanelArtifactRef {
  return {
    artifactId: link.artifactId,
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: normalizePath(link.path) } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {}),
    ...(link.selector ? { selector: link.selector } : {})
  };
}

function normalizeDiagnostics(diagnostics: DocSourceMapIndex["diagnostics"]): BrowserPanelDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
  }));
}

function countEntriesByDomain(entries: BrowserPanelEntry[]): Record<BrowserPanelDomain | "all", number> {
  return {
    all: entries.length,
    css: entries.filter((entry) => entry.domain === "css").length,
    html: entries.filter((entry) => entry.domain === "html").length,
    js: entries.filter((entry) => entry.domain === "js").length,
    other: entries.filter((entry) => entry.domain === "other").length
  };
}

function inferEntryDomain(kind: string, sources: BrowserPanelSourceRef[], artifacts: BrowserPanelArtifactRef[]): BrowserPanelDomain {
  if (kind.startsWith("css-") || hasLanguage(sources, artifacts, ["css", "scss", "sass", "less", "stylus"])) {
    return "css";
  }

  if (kind.startsWith("html-") || hasLanguage(sources, artifacts, ["html", "pug"])) {
    return "html";
  }

  if (kind.startsWith("js-") || kind.startsWith("ts-") || hasLanguage(sources, artifacts, ["javascript", "typescript", "jsx", "tsx"])) {
    return "js";
  }

  return "other";
}

function hasLanguage(sources: BrowserPanelSourceRef[], artifacts: BrowserPanelArtifactRef[], languages: string[]): boolean {
  const normalized = new Set(languages);
  return [...sources, ...artifacts].some((item) => item.language && normalized.has(item.language.toLowerCase()));
}

function renderPanelHtml(payload: BrowserPanelPayload): string {
  const title = payload.project.title ?? payload.project.name;
  const serializedPayload = JSON.stringify(payload).replaceAll("<", "\\u003c");

  return [
    "<!doctype html>",
    "<html lang=\"und\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(title)} Browser Panel</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<style>${PANEL_CSS}</style>`,
    "</head>",
    "<body>",
    "<div class=\"hia-browser-panel\" data-hia-browser-panel>",
    "<aside class=\"hia-panel-sidebar\">",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class=\"hia-panel-kicker\">${escapeHtml(payload.summary.entryCount.toString())} source-linked entr${payload.summary.entryCount === 1 ? "y" : "ies"}</p>`,
    "<div class=\"hia-panel-filters\" role=\"group\" aria-label=\"Documentation domain filters\">",
    "<button type=\"button\" data-hia-domain=\"all\">All</button>",
    "<button type=\"button\" data-hia-domain=\"js\">JS</button>",
    "<button type=\"button\" data-hia-domain=\"css\">CSS</button>",
    "<button type=\"button\" data-hia-domain=\"html\">HTML</button>",
    "</div>",
    "<label class=\"hia-panel-search\"><span>Search</span><input type=\"search\" data-hia-search></label>",
    "<ol class=\"hia-panel-list\" data-hia-entry-list></ol>",
    "</aside>",
    "<main class=\"hia-panel-detail\" data-hia-entry-detail></main>",
    "</div>",
    `<script type="application/json" id="hia-browser-panel-payload">${serializedPayload}</script>`,
    `<script>${PANEL_SCRIPT}</script>`,
    "</body>",
    "</html>"
  ].join("");
}

function createEntryId(docMapPath: string, entryId: string): string {
  return `entry:${slug(docMapPath)}:${slug(entryId)}`;
}

function formatPositionLabel(filePath: string, position?: BrowserPanelPosition): string {
  if (!position) {
    return filePath;
  }

  return `${filePath}:${position.line}${position.column ? `:${position.column}` : ""}`;
}

function basename(value: string): string {
  const parts = value.split("/");
  return parts.at(-1) ?? value;
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function slug(value: string): string {
  return normalizePath(value).trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-|-$/g, "") || "entry";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

const PANEL_CSS = `
:root{color-scheme:light;font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f8fb;color:#172033}
body{margin:0}
button,input{font:inherit}
.hia-browser-panel{display:grid;grid-template-columns:minmax(260px,340px) 1fr;min-height:100vh}
.hia-panel-sidebar{background:#ffffff;border-right:1px solid #d9e0ea;padding:20px;display:flex;flex-direction:column;gap:16px}
.hia-panel-sidebar h1{font-size:20px;line-height:1.25;margin:0;color:#0f172a}
.hia-panel-kicker{margin:0;color:#506177;font-size:13px}
.hia-panel-filters{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.hia-panel-filters button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:7px 8px;color:#1f2937;cursor:pointer}
.hia-panel-filters button[aria-pressed=true]{background:#0f766e;border-color:#0f766e;color:#fff}
.hia-panel-search{display:grid;gap:6px;color:#506177;font-size:12px}
.hia-panel-search input{border:1px solid #cbd5e1;border-radius:6px;padding:9px 10px;color:#172033;background:#fff}
.hia-panel-list{list-style:none;margin:0;padding:0;display:grid;gap:8px;overflow:auto}
.hia-panel-list button{width:100%;text-align:left;border:1px solid #d9e0ea;border-radius:8px;background:#fff;padding:10px;display:grid;gap:4px;cursor:pointer}
.hia-panel-list button[aria-current=true]{border-color:#0f766e;box-shadow:0 0 0 2px rgba(15,118,110,.15)}
.hia-entry-title{font-weight:700;color:#111827}
.hia-entry-meta{font-size:12px;color:#64748b}
.hia-panel-detail{padding:28px;display:grid;align-content:start;gap:18px}
.hia-detail-card{background:#fff;border:1px solid #d9e0ea;border-radius:8px;padding:20px;display:grid;gap:16px;max-width:980px}
.hia-detail-card h2{font-size:24px;margin:0;color:#0f172a}
.hia-badge-row{display:flex;gap:8px;flex-wrap:wrap}
.hia-badge{border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;color:#334155;font-size:12px;background:#f8fafc}
.hia-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.hia-section{border-top:1px solid #e5e7eb;padding-top:14px}
.hia-section h3{font-size:15px;margin:0 0 8px;color:#172033}
.hia-kv{display:grid;grid-template-columns:96px 1fr;gap:6px 10px;margin:0}
.hia-kv dt{color:#64748b}
.hia-kv dd{margin:0;word-break:break-word}
.hia-open-list{display:flex;gap:8px;flex-wrap:wrap}
.hia-open-list button{border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer}
.hia-empty{color:#64748b}
@media (max-width:760px){.hia-browser-panel{grid-template-columns:1fr}.hia-panel-sidebar{border-right:0;border-bottom:1px solid #d9e0ea}.hia-panel-detail{padding:18px}}
`;

const PANEL_SCRIPT = `
(() => {
  const payload = JSON.parse(document.getElementById("hia-browser-panel-payload").textContent || "{}");
  const list = document.querySelector("[data-hia-entry-list]");
  const detail = document.querySelector("[data-hia-entry-detail]");
  const search = document.querySelector("[data-hia-search]");
  const buttons = Array.from(document.querySelectorAll("[data-hia-domain]"));
  let activeDomain = "all";
  let selectedId = payload.entries[0]?.id || "";

  function formatPosition(target) {
    if (!target?.path) return "";
    const position = target.position;
    return position ? target.path + ":" + position.line + (position.column ? ":" + position.column : "") : target.path;
  }

  function visibleEntries() {
    const query = (search.value || "").toLowerCase();
    return payload.entries.filter((entry) => {
      const domainMatch = activeDomain === "all" || entry.domain === activeDomain;
      const text = [entry.label, entry.kind, entry.symbolId, entry.symbolKind].filter(Boolean).join(" ").toLowerCase();
      return domainMatch && (!query || text.includes(query));
    });
  }

  function renderList() {
    const entries = visibleEntries();
    if (!entries.some((entry) => entry.id === selectedId)) selectedId = entries[0]?.id || "";
    list.innerHTML = entries.map((entry) => '<li><button type="button" data-entry-id="' + entry.id + '" aria-current="' + String(entry.id === selectedId) + '"><span class="hia-entry-title">' + escapeHtml(entry.label) + '</span><span class="hia-entry-meta">' + escapeHtml(entry.domain.toUpperCase() + " / " + entry.kind + " / " + entry.lookup.status) + '</span></button></li>').join("");
    for (const button of list.querySelectorAll("button")) button.addEventListener("click", () => { selectedId = button.dataset.entryId || ""; render(); });
  }

  function renderDetail() {
    const entry = payload.entries.find((candidate) => candidate.id === selectedId);
    if (!entry) {
      detail.innerHTML = '<p class="hia-empty">No source-linked entry selected.</p>';
      return;
    }
    const source = entry.lookup.original ? formatPosition({ path: entry.lookup.original.sourcePath, position: entry.lookup.original.position }) : "";
    const generated = entry.lookup.generated ? formatPosition({ path: entry.lookup.generated.artifactPath, position: entry.lookup.generated.position }) : "";
    const openButtons = entry.openRequests.map((request) => '<button type="button" data-open-request="' + request.id + '">' + escapeHtml(request.label) + '</button>').join("");
    detail.innerHTML = '<article class="hia-detail-card"><h2>' + escapeHtml(entry.label) + '</h2><div class="hia-badge-row"><span class="hia-badge">' + escapeHtml(entry.domain.toUpperCase()) + '</span><span class="hia-badge">' + escapeHtml(entry.kind) + '</span><span class="hia-badge">' + escapeHtml(entry.lookup.status) + '</span></div><section class="hia-section"><h3>Source Linkage</h3><dl class="hia-kv"><dt>Original</dt><dd>' + escapeHtml(source || "unmapped") + '</dd><dt>Generated</dt><dd>' + escapeHtml(generated || "unmapped") + '</dd><dt>Source Map</dt><dd>' + escapeHtml(entry.lookup.sourceMapPath || "none") + '</dd><dt>Doc Map</dt><dd>' + escapeHtml(entry.docSourceMapPath) + '</dd></dl></section><section class="hia-section"><h3>Open Requests</h3><div class="hia-open-list">' + (openButtons || '<span class="hia-empty">No open request available.</span>') + '</div></section></article>';
    for (const button of detail.querySelectorAll("[data-open-request]")) {
      button.addEventListener("click", () => {
        const request = entry.openRequests.find((candidate) => candidate.id === button.dataset.openRequest);
        window.postMessage({ type: "hia.browserPanel.openRequest", request }, window.location.origin);
      });
    }
  }

  function render() {
    renderList();
    renderDetail();
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.hiaDomain === activeDomain));
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  for (const button of buttons) button.addEventListener("click", () => { activeDomain = button.dataset.hiaDomain || "all"; render(); });
  search.addEventListener("input", render);
  render();
})();
`;
