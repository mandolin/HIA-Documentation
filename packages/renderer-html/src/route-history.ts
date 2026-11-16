/**
 * @file
 * @lang zh-CN 持久发布身份与已公开地址的纯数据边界，读取器不执行声明、不读取文件或授予源码权限。
 * @lang en Pure-data boundary for persistent publication identities and published routes, without declaration execution, file reads or source authority.
 */
import type { RenderProjectHtmlInput, RenderProjectView } from "./index.js";

/**
 * @lang zh-CN 独立发布历史契约身份。
 * @lang en Independent publication-history contract identity.
 */
export const DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT = "documentation-project-route-history";
/**
 * @lang zh-CN 首个显式草案，旧工件不会隐式重标。
 * @lang en First explicit draft, without implicit relabeling of older artifacts.
 */
export const DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT_VERSION = "0.1.0-draft";

/** @lang zh-CN 已核公开索引的来源摘要，元数据不授权网络读取。
 * @lang en Provenance of a verified published index, granting no network-read authority.
 */
export interface DocumentationProjectRouteHistorySource {
  /**
   * @lang zh-CN 公开owner/repository。
   * @lang en Public owner/repository.
   */
  repository: string;
  /**
   * @lang zh-CN 固定Git提交的40位小写摘要。
   * @lang en Pinned 40-digit lowercase Git commit digest.
   */
  commit: string;
  /**
   * @lang zh-CN 实际索引所属语言。
   * @lang en Actual locale of the index.
   */
  locale: string;
  /**
   * @lang zh-CN 已发布索引原字节SHA-256。
   * @lang en SHA-256 of the published index's original bytes.
   */
  indexSha256: string;
}

/** @lang zh-CN 当前原生声明到持久发布身份的显式绑定。
 * @lang en Explicit binding from a current native declaration to a persistent publication identity.
 */
export interface DocumentationProjectRouteHistoryBinding {
  /**
   * @lang zh-CN 与当前输入完全一致的可选聚合作用域。
   * @lang en Optional aggregation scope matching the current input exactly.
   */
  identityScope?: string;
  /**
   * @lang zh-CN 当前声明视图。
   * @lang en Current declaration view.
   */
  view: RenderProjectView;
  /**
   * @lang zh-CN 实际当前原生符号，保留源码地图身份。
   * @lang en Actual current native symbol, retaining source-map identity.
   */
  symbolId: string;
  /**
   * @lang zh-CN 发布者维护的持久条目身份。
   * @lang en Persistent entry identity maintained by the publisher.
   */
  entryId: string;
}

/** @lang zh-CN 直接指向当前持久身份的历史条目别名。
 * @lang en Historical entry alias pointing directly to a current persistent identity.
 */
export interface DocumentationProjectRouteHistoryAlias {
  /**
   * @lang zh-CN 已发布旧条目身份。
   * @lang en Previously published entry identity.
   */
  entryId: string;
  /**
   * @lang zh-CN 当前项目实际持久身份。
   * @lang en Actual persistent identity in the current project.
   */
  canonicalEntryId: string;
}

/** @lang zh-CN 已发布旧锚点到实际当前锚点的精确对应。
 * @lang en Exact correspondence from a published historical anchor to an actual current anchor.
 */
export interface DocumentationProjectRouteHistoryAnchor {
  /**
   * @lang zh-CN 原地址的锚点，保留原字符串。
   * @lang en Original address anchor, preserving its exact string.
   */
  id: string;
  /**
   * @lang zh-CN 本次实际渲染的目标锚点。
   * @lang en Target anchor actually rendered in this invocation.
   */
  targetId: string;
}

/** @lang zh-CN 已公开HTML路径及其当前条目，路径不授予输出根之外权限。
 * @lang en Published HTML path and its current entry, granting no authority beyond the output root.
 */
export interface DocumentationProjectRouteHistoryPath {
  /**
   * @lang zh-CN 语言输出根内规范相对HTML路径。
   * @lang en Canonical relative HTML path inside the locale output root.
   */
  path: string;
  /**
   * @lang zh-CN 片段返回实际正文，页面提供渐进恢复入口。
   * @lang en Fragments return actual prose, while pages provide progressive recovery.
   */
  kind: "fragment" | "page";
  /**
   * @lang zh-CN 当前实际持久条目身份。
   * @lang en Actual current persistent entry identity.
   */
  entryId: string;
  /**
   * @lang zh-CN 本地化静态路径的显式界面语言，省略沿本次默认值。
   * @lang en Explicit UI locale for a localized static path, defaulting to this render's selection.
   */
  uiLocale?: "zh-CN" | "en";
  /**
   * @lang zh-CN 经实际旧/新页面核实的锚点。
   * @lang en Anchors verified against actual old and current pages.
   */
  anchors: DocumentationProjectRouteHistoryAnchor[];
}

/**
 * @lang zh-CN 16MiB、每类至多100000记录的显式发布登记；原生声明和源码读取权限独立。
 * @lang en Explicit publication registry bounded to 16 MiB and 100000 records per collection, independent of native declarations and source-read authority.
 */
export interface DocumentationProjectRouteHistory {
  /**
   * @lang zh-CN 独立契约名称。
   * @lang en Independent contract name.
   */
  contract: typeof DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT;
  /**
   * @lang zh-CN 精确草案版本。
   * @lang en Exact draft version.
   */
  contractVersion: typeof DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT_VERSION;
  /**
   * @lang zh-CN 与渲染项目一致的身份。
   * @lang en Identity matching the rendered project.
   */
  projectId: string;
  /**
   * @lang zh-CN 主机已核的公开历史来源。
   * @lang en Published historical sources verified by the host.
   */
  sources: DocumentationProjectRouteHistorySource[];
  /**
   * @lang zh-CN 当前原生声明与持久页面绑定。
   * @lang en Current native-declaration bindings to persistent pages.
   */
  bindings: DocumentationProjectRouteHistoryBinding[];
  /**
   * @lang zh-CN 历史条目到实际canonical的直接对应。
   * @lang en Direct historical-entry correspondences to actual canonical entries.
   */
  entryAliases: DocumentationProjectRouteHistoryAlias[];
  /**
   * @lang zh-CN 实际已公开的历史HTML路径。
   * @lang en Actual published historical HTML paths.
   */
  pathAliases: DocumentationProjectRouteHistoryPath[];
}

/**
 * @lang zh-CN 统一拒绝身份，保持解析失败可诊断。
 * @lang en Uniform rejection identity retaining diagnosable parsing failures.
 */
function invalid(detail: string): never {
  throw new TypeError(`HIA_PROJECT_ROUTE_HISTORY_INVALID: ${detail}`);
}

/** @lang zh-CN 核普通记录和封闭字段，不容许未知配置被静默忽略。
 * @lang en Check ordinary records and closed fields, preventing silently ignored configuration.
 */
function record(value: unknown, fields: readonly string[], location: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(location);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => !fields.includes(key))) invalid(location);
  return result;
}

/** @lang zh-CN 身份保留原字符，拒绝空白、控制字符和无界长度。
 * @lang en Preserve identity spelling while rejecting blank values, control characters and unbounded length.
 */
function text(value: unknown, location: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 4096 || /[\u0000-\u001f\u007f]/u.test(value)) invalid(location);
}

/** @lang zh-CN 每类记录使用相同显式数量上限。
 * @lang en Apply the same explicit record-count bound to each collection.
 */
function records(value: unknown, location: string): unknown[] {
  if (!Array.isArray(value) || value.length > 100_000) invalid(location);
  return value;
}

/** @lang zh-CN 采用UTF-16词序，避免机器语言设置影响工件顺序。
 * @lang en Use UTF-16 lexical order so host language preferences cannot change artifact order.
 */
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * @lang zh-CN 校验独立历史的结构、版本、限额和直接别名；当前条目与实际锚点由渲染前置核验负责。
 * @lang en Validate independent history structure, version, limits and direct aliases, leaving current-entry and actual-anchor checks to render preflight.
 * @param value <lang><zh-CN>调用方提供的内存数据，不读取文件或网络。</zh-CN><en>Caller-supplied in-memory data, without file or network reads.</en></lang>
 * @returns <lang><zh-CN>通过时收窄类型，不修改输入。</zh-CN><en>Narrows the type on success without mutating input.</en></lang>
 * @throws <lang><zh-CN>未知身份、字段、越界、冲突或非法路径。</zh-CN><en>Unknown identities/fields, exceeded bounds, collisions or unsafe paths.</en></lang>
 */
export function assertDocumentationProjectRouteHistory(value: unknown): asserts value is DocumentationProjectRouteHistory {
  const root = record(value, ["contract", "contractVersion", "projectId", "sources", "bindings", "entryAliases", "pathAliases"], "root");
  if (root.contract !== DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT || root.contractVersion !== DOCUMENTATION_PROJECT_ROUTE_HISTORY_CONTRACT_VERSION) invalid("contract/version");
  text(root.projectId, "projectId");
  const sources = records(root.sources, "sources");
  if (!sources.length) invalid("sources");
  const sourceKeys = new Set<string>();
  for (const item of sources) {
    const source = record(item, ["repository", "commit", "locale", "indexSha256"], "source");
    text(source.repository, "source.repository");
    text(source.locale, "source.locale");
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(source.repository) || typeof source.commit !== "string" || !/^[a-f0-9]{40}$/u.test(source.commit) || typeof source.indexSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(source.indexSha256)) invalid("source provenance");
    const key = JSON.stringify([source.repository, source.commit, source.locale]);
    if (sourceKeys.has(key)) invalid("duplicate source");
    sourceKeys.add(key);
  }
  const bindings = records(root.bindings, "bindings");
  const bindingKeys = new Set<string>();
  const publishedIds = new Set<string>();
  for (const item of bindings) {
    const binding = record(item, ["identityScope", "view", "symbolId", "entryId"], "binding");
    for (const field of ["view", "symbolId", "entryId"]) text(binding[field], `binding.${field}`);
    if (!["all", "js", "css", "html", "dotnet", "powershell", "other"].includes(binding.view as string)) invalid("binding.view");
    if (binding.identityScope !== undefined && (typeof binding.identityScope !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(binding.identityScope))) invalid("binding.identityScope");
    const key = JSON.stringify([binding.identityScope ?? null, binding.view, binding.symbolId]);
    if (bindingKeys.has(key) || publishedIds.has(binding.entryId as string)) invalid("duplicate binding/publication");
    bindingKeys.add(key);
    publishedIds.add(binding.entryId as string);
  }
  const aliases = records(root.entryAliases, "entryAliases");
  const aliasIds = new Set<string>();
  for (const item of aliases) {
    const alias = record(item, ["entryId", "canonicalEntryId"], "entry alias");
    text(alias.entryId, "alias.entryId");
    text(alias.canonicalEntryId, "alias.canonicalEntryId");
    if (aliasIds.has(alias.entryId) || alias.entryId === alias.canonicalEntryId) invalid("duplicate/self alias");
    aliasIds.add(alias.entryId);
  }
  for (const item of aliases) if (aliasIds.has((item as DocumentationProjectRouteHistoryAlias).canonicalEntryId)) invalid("alias chain/cycle");
  const paths = new Set<string>();
  for (const item of records(root.pathAliases, "pathAliases")) {
    const route = record(item, ["path", "kind", "entryId", "uiLocale", "anchors"], "path alias");
    text(route.path, "path");
    text(route.entryId, "path.entryId");
    if (!["fragment", "page"].includes(route.kind as string) || !/^(entries|pages)\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.html$/u.test(route.path) || route.path.split("/").some(part => part === "." || part === "..") || route.path.toLowerCase().endsWith("/index.html")) invalid("path spelling");
    if (!route.path.startsWith(route.kind === "fragment" ? "entries/" : "pages/")) invalid("path role");
    const shape = route.kind === "fragment" ? /^entries\/[A-Za-z0-9][A-Za-z0-9._-]*\.html$/u : /^pages\/(?:(?:en|zh-CN)\/)?[A-Za-z0-9][A-Za-z0-9._-]*\.html$/u;
    if (!shape.test(route.path)) invalid("generated path shape");
    if (route.uiLocale !== undefined && (route.kind !== "page" || !["en", "zh-CN"].includes(route.uiLocale as string))) invalid("path.uiLocale");
    const localized = route.path.match(/^pages\/(en|zh-CN)\//u)?.[1];
    if (localized && route.uiLocale !== localized) invalid("path locale mismatch");
    // <lang><zh-CN>发布文件须可安全落盘到大小写不敏感的文件系统，原路径拼写仍原样保存。</zh-CN><en>Publication files must remain safe on case-insensitive filesystems while retaining their original path spelling.</en></lang>
    if (paths.has(route.path.toLowerCase())) invalid("duplicate path");
    paths.add(route.path.toLowerCase());
    const anchors = new Set<string>();
    const targets = new Set<string>();
    for (const item of records(route.anchors, "anchors")) {
      const anchor = record(item, ["id", "targetId"], "anchor");
      text(anchor.id, "anchor.id");
      text(anchor.targetId, "anchor.targetId");
      if (anchors.has(anchor.id) || targets.has(anchor.targetId)) invalid("ambiguous anchor");
      anchors.add(anchor.id);
      targets.add(anchor.targetId);
    }
  }
  // <lang><zh-CN>结构和单值先有界；序列化期间累计字符串，避免超大调用方对象先分配整份JSON。</zh-CN><en>Bound structure and individual values first, counting strings during serialization before allocating oversized caller JSON.</en></lang>
  let characters = 0;
  try {
    const serialized = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === "string") characters += item.length;
      if (characters > 16 * 1024 * 1024) invalid("size");
      return item;
    });
    if (new TextEncoder().encode(serialized).byteLength > 16 * 1024 * 1024) invalid("size");
  } catch { invalid("size/serialization"); }
}

/**
 * @lang zh-CN 在任何输出前复制并应用宿主显式绑定，保留原生符号/地图及调用方数据。
 * @lang en Snapshot and apply explicit host bindings before output, preserving native symbols/maps and caller-owned data.
 * @param input <lang><zh-CN>当前项目及实际声明。</zh-CN><en>Current project and actual declarations.</en></lang>
 * @param value <lang><zh-CN>待校验历史登记。</zh-CN><en>History registry to validate.</en></lang>
 * @returns <lang><zh-CN>独立历史快照与持久条目投影。</zh-CN><en>Isolated history snapshot and persistent-entry projection.</en></lang>
 * @throws <lang><zh-CN>项目、原生绑定、持久身份或别名目标矛盾。</zh-CN><en>Contradictory project, native binding, persistent identity or alias target.</en></lang>
 */
export function prepareProjectRouteHistory(input: RenderProjectHtmlInput, value: unknown): { input: RenderProjectHtmlInput; history: DocumentationProjectRouteHistory } {
  assertDocumentationProjectRouteHistory(value);
  const history = structuredClone(value);
  // <lang><zh-CN>声明顺序不参与登记身份或兼容文件顺序；本地化正文顺序仍由正常渲染器决定。</zh-CN><en>Registry identity and compatibility-file order ignore record order; normal rendering still determines localized prose order.</en></lang>
  history.sources.sort((left, right) => compareText(JSON.stringify(left), JSON.stringify(right)));
  history.bindings.sort((left, right) => compareText(left.entryId, right.entryId));
  history.entryAliases.sort((left, right) => compareText(left.entryId, right.entryId));
  history.pathAliases.sort((left, right) => compareText(left.path, right.path));
  for (const route of history.pathAliases) route.anchors.sort((left, right) => compareText(left.id, right.id));
  if (history.projectId !== (input.project.id ?? `project:${input.project.name}`)) invalid("project identity");
  // <lang><zh-CN>同作用域/视图下的原生符号必须唯一，避免从多个同名声明中挑选。</zh-CN><en>Require a unique native symbol within scope/view instead of choosing among matching declarations.</en></lang>
  const nativeEntries = new Map<string, number[]>();
  const originalIds = new Map(input.entries.map((entry, index) => [entry.id, index]));
  input.entries.forEach((entry, index) => {
    if (!entry.symbolId) return;
    const key = JSON.stringify([entry.identityScope ?? null, entry.view, entry.symbolId]);
    nativeEntries.set(key, [...(nativeEntries.get(key) ?? []), index]);
  });
  const replacements = new Map<number, string>();
  for (const binding of history.bindings) {
    const matches = nativeEntries.get(JSON.stringify([binding.identityScope ?? null, binding.view, binding.symbolId]));
    if (matches?.length !== 1) invalid("native binding missing/ambiguous");
    const index = matches[0]!;
    if (originalIds.has(binding.entryId) && originalIds.get(binding.entryId) !== index) invalid("publication captures another entry");
    replacements.set(index, binding.entryId);
  }
  const entries = input.entries.map((entry, index) => replacements.has(index) ? { ...entry, id: replacements.get(index)! } : entry);
  const entryIds = new Set(entries.map(entry => entry.id));
  if (entryIds.size !== entries.length) invalid("duplicate publication identity");
  for (const alias of history.entryAliases) if (entryIds.has(alias.entryId) || !entryIds.has(alias.canonicalEntryId)) invalid("entry alias target/shadow");
  for (const route of history.pathAliases) if (!entryIds.has(route.entryId)) invalid("path entry missing");
  // <lang><zh-CN>显式关系图的entryId同步投影，调用方图节点身份与原生symbolId保持。</zh-CN><en>Project explicit graph entry references while retaining caller-owned graph-node and native-symbol identities.</en></lang>
  const publicationIds = new Map(input.entries.map((entry, index) => [entry.id, entries[index]!.id]));
  const relationGraph = input.relationGraph ? { ...input.relationGraph, nodes: input.relationGraph.nodes.map(node => node.entryId && publicationIds.has(node.entryId) ? { ...node, entryId: publicationIds.get(node.entryId)! } : node) } : undefined;
  return { input: { ...input, entries, ...(relationGraph ? { relationGraph } : {}) }, history };
}

/**
 * @lang zh-CN 每站一份的渐进恢复脚本，禁脚本时页面普通链接仍可阅读。
 * @lang en One progressive-recovery script per site, retaining ordinary readable links when scripts are disabled.
 */
export const PROJECT_ROUTE_HISTORY_SCRIPT = String.raw`/**
 * @lang zh-CN 只消费同页已生成登记，已知小节精确恢复；未知小节保留普通链接。
 * @lang en Consume same-page generated records only, restoring known sections while retaining links for unknown sections.
 */
(() => {
  const record = document.querySelector('[data-hia-route-history-page]');
  if (!record) return;
  const config = JSON.parse(record.textContent);
  const target = new URL(config.target, location.href);
  if (target.origin !== location.origin) return;
  const status = document.querySelector('[data-hia-route-status]');
  const anchors = new Map(config.anchors);
  let requested;
  try {
    requested = decodeURIComponent(location.hash.slice(1));
  } catch {
    status.textContent = config.missing;
    return;
  }
  if (requested) {
    const current = anchors.get(requested);
    if (!current) {
      status.textContent = config.missing;
      return;
    }
    target.hash = current;
  }
  target.search = location.search;
  location.replace(target.href);
})();
`;
