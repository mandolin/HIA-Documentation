/**
 * @file
 * @lang zh-CN 项目源码片段的显式授权、有界流读取与命令级LRU；不执行源码，不恢复外部URL。
 * @lang en Explicit authorization, bounded stream reading and command-local LRU for project excerpts; never executes source or restores external URLs.
 */
import { createReadStream } from "node:fs";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { createHiaDiagnostic, type HiaDiagnostic } from "@hia-doc/core";
import type { HiaDocsConfig } from "@hia-doc/config";
import type { RenderProjectEntry, RenderProjectHtmlInput, RenderProjectSourcePresentation, RenderProjectSourcePreviewRef } from "@hia-doc/renderer-html";

// <lang><zh-CN>正文上限与Portal读者既有1MiB限制一致；缓存和总准备量独立控制，均不序列化。</zh-CN><en>The body limit matches the existing 1 MiB Portal-reader limit; cache and aggregate preparation limits are independent and never serialized.</en></lang>
const MAX_PREVIEW_BYTES = 1_048_576;
const MAX_CACHE_BYTES = 16 * 1_048_576;
const MAX_PREPARED_BYTES = 1_073_741_824;

/** @lang zh-CN 单次命令的有界状态，正文只活在授权构建中。 @lang en Bounded state for one command; bodies exist only within the authorized build. */
interface SourceReadState {
  cache: Map<string, { preview: RenderProjectSourcePreviewRef; bytes: number }>;
  cacheBytes: number;
  diagnostics: HiaDiagnostic[];
  counted: WeakSet<RenderProjectSourcePreviewRef>;
  preparedBytes: number;
}

/**
 * @lang zh-CN 串行准备授权片段，避免同文件并发缓存击穿；保留producer显式正文授权，不读取未授权文件。
 * @lang en Prepares authorized excerpts sequentially to avoid concurrent same-file cache misses; preserves explicit producer-body authority without reading unauthorized files.
 * @param projectInput <lang><zh-CN>聚合文档，不修改原条目。</zh-CN><en>Aggregated documentation; original entries are unchanged.</en></lang>
 * @param docsConfig <lang><zh-CN>已验证配置，filesystem读取仍要求explicit-public。</zh-CN><en>Validated configuration; filesystem reads still require explicit-public.</en></lang>
 * @param configBaseDir <lang><zh-CN>localRoot的配置基准。</zh-CN><en>Configuration base for localRoot.</en></lang>
 * @returns <lang><zh-CN>带有界片段或仅locator的新输入；预算超限附固定error，供写出前拒绝。</zh-CN><en>New input with bounded excerpts or locators only; budget failures add fixed errors for refusal before output.</en></lang>
 */
export async function prepareProjectSourcePresentation(projectInput: RenderProjectHtmlInput, docsConfig: HiaDocsConfig, configBaseDir: string): Promise<RenderProjectHtmlInput> {
  // <lang><zh-CN>模式与公开授权分离；即使默认fetch，也不能自动读取本地文件。</zh-CN><en>Separate presentation mode from public authorization; even default fetch cannot automatically read local files.</en></lang>
  const presentation = resolveProjectSourcePresentation(docsConfig);
  const localRoot = path.resolve(configBaseDir, docsConfig.source?.localRoot ?? ".");
  const authorized = docsConfig.source?.publicAssetPolicy === "explicit-public";
  const maxLines = docsConfig.source?.maxLines ?? 400;
  const entries: RenderProjectEntry[] = [];
  const state: SourceReadState = { cache: new Map(), cacheBytes: 0, diagnostics: [], counted: new WeakSet(), preparedBytes: 0 };
  // <lang><zh-CN>逐个await提供读入背压；不会一次启动数千个相同或不同文件的读取。</zh-CN><en>Await each entry for read-side backpressure instead of launching thousands of same/different-file reads.</en></lang>
  for (const entry of projectInput.entries) {
    if (!entry.source) { entries.push(entry); continue; }
    // <lang><zh-CN>保留定位事实但剥离外部端点；producer范围优先，后续裁剪同步更新实际公开范围。</zh-CN><en>Preserve locator facts while stripping external endpoints; producer ranges take precedence and later clipping updates the published range.</en></lang>
    const { preview: existing, fetchUrl: _fetch, linkUrl: _link, ...locator } = entry.source;
    const effectiveRange = existing?.range ?? locator.range;
    const source = { ...locator, ...(effectiveRange ? { range: effectiveRange } : {}) } as NonNullable<RenderProjectEntry["source"]>;
    if (presentation !== "none") {
      // <lang><zh-CN>优先使用producer主块；文件片段只在明确授权且没有前置预算错误时读取。</zh-CN><en>Prefer producer primary blocks; read file excerpts only with explicit authority and no prior budget error.</en></lang>
      const preview = existing ? limitProducerPreview(existing, source.range?.start.line ?? 1, maxLines) : authorized && state.diagnostics.length === 0 ? await readProjectSourcePreview(localRoot, source.path, source.range, maxLines, state) : undefined;
      if (preview && reservePreparedPreview(state, preview)) {
        source.preview = { ...preview, ...(presentation === "embed" ? { defaultExpanded: docsConfig.source?.defaultExpanded ?? false } : {}) };
        if (preview.range) source.range = preview.range;
      }
    }
    entries.push({ ...entry, source });
  }
  return { ...projectInput, entries, ...(state.diagnostics.length ? { diagnostics: [...(projectInput.diagnostics ?? []), ...state.diagnostics] } : {}) };
}

/**
 * @internal
 * @lang zh-CN 独立核查正文预算，重复引用不重复计费；仅供CLI内部准备器复用，不从包根导出。
 * @lang en Independently checks body budgets without charging repeated references twice; reused by CLI preparation only, never exported at the package root.
 * @param state <lang><zh-CN>当前命令的可变预算/去重/诊断状态。</zh-CN><en>Mutable budget/deduplication/diagnostic state for this command.</en></lang>
 * @param preview <lang><zh-CN>已经按行数裁剪的显式授权片段。</zh-CN><en>Explicitly authorized excerpt already clipped by line count.</en></lang>
 * @returns <lang><zh-CN>预算内为true；否则追加固定错误且返回false，不回显正文。</zh-CN><en>True within budget; otherwise appends a fixed error and returns false without reflecting bodies.</en></lang>
 */
export function reservePreparedPreview(state: SourceReadState, preview: RenderProjectSourcePreviewRef): boolean {
  if (Buffer.byteLength(preview.content, "utf8") > MAX_PREVIEW_BYTES) {
    addLimitDiagnostic(state, "HIA_CLI_SOURCE_PREVIEW_LIMIT", "An authorized source excerpt exceeds 1 MiB. Reduce docs.source.maxLines or provide a bounded producer excerpt.");
    return false;
  }
  if (!state.counted.has(preview)) {
    state.counted.add(preview);
    state.preparedBytes += preview.content.length * 2;
  }
  if (state.preparedBytes > MAX_PREPARED_BYTES) {
    addLimitDiagnostic(state, "HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED", "Authorized source excerpts exceed the 1 GiB preparation budget. Reduce docs.source.maxLines, provide smaller producer excerpts, or split this build.");
    return false;
  }
  return true;
}

/** @lang zh-CN 显式禁用优先，缺省fetch；此选择不授予文件读取权限。 @lang en Explicit disablement wins, otherwise defaults to fetch; this selection grants no file-read authority. */
export function resolveProjectSourcePresentation(config: HiaDocsConfig): RenderProjectSourcePresentation {
  return config.source?.enabled === false || config.source?.mode === "none" ? "none" : config.source?.presentation ?? "fetch";
}

/**
 * @lang zh-CN 流式扫描到所需末行就停止，最多保留一份1MiB片段；LRU按UTF-16正文加记录开销估算。
 * @lang en Stops streaming at the requested end line, retaining at most one 1 MiB excerpt; LRU accounting estimates UTF-16 bodies plus record overhead.
 * @param root <lang><zh-CN>授权根，真实路径也必须包含源文件。</zh-CN><en>Authorized root, which must contain the source's real path too.</en></lang>
 * @param relativePath <lang><zh-CN>安全相对路径，绝对/父级/越根symlink拒绝。</zh-CN><en>Safe relative path; absolute/parent/outside-root symlinks are refused.</en></lang>
 * @param range <lang><zh-CN>一基包含范围，缺省从第一行开始。</zh-CN><en>One-based inclusive range, starting at line one by default.</en></lang>
 * @param maxLines <lang><zh-CN>配置最大公开行数。</zh-CN><en>Configured maximum public lines.</en></lang>
 * @param state <lang><zh-CN>命令级有界缓存/诊断。</zh-CN><en>Command-local bounded cache/diagnostics.</en></lang>
 * @returns <lang><zh-CN>公开候选片段；定位/读取失败时undefined，大小超限另有静态诊断。</zh-CN><en>Candidate public excerpt, or undefined for locator/read failures; size failures additionally carry static diagnostics.</en></lang>
 */
async function readProjectSourcePreview(root: string, relativePath: string, range: NonNullable<RenderProjectEntry["source"]>["range"], maxLines: number, state: SourceReadState): Promise<RenderProjectSourcePreviewRef | undefined> {
  // <lang><zh-CN>先验证locator，避免任何未授权的文件接触；Windows与POSIX分隔符统一。</zh-CN><en>Validate locators before any unauthorized file access, normalizing Windows/POSIX separators.</en></lang>
  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:/u.test(normalized) || normalized.split("/").includes("..")) return undefined;
  // <lang><zh-CN>包含末行的窗口同时受定位器与公开行数上限限制；缓存键不能把不同片段混为一份。</zh-CN><en>The inclusive window is bounded by both locator and publication line cap; cache keys must distinguish different excerpts.</en></lang>
  const start = Math.max(1, range?.start.line ?? 1);
  const end = Math.min(range?.end?.line ?? start + maxLines - 1, start + maxLines - 1);
  const key = `${normalized}\0${start}\0${end}`;
  const cached = state.cache.get(key);
  if (cached) { state.cache.delete(key); state.cache.set(key, cached); return cached.preview; }
  try {
    // <lang><zh-CN>词法和真实路径双重限制，不跟随越过授权根的符号链接。</zh-CN><en>Enforce both lexical and real-path containment, refusing symlinks escaping the authorized root.</en></lang>
    const absolute = path.resolve(root, normalized);
    if (!inside(root, absolute)) return undefined;
    const [realRoot, realSource] = await Promise.all([realpath(root), realpath(absolute)]);
    if (!inside(realRoot, realSource)) return undefined;
    // <lang><zh-CN>只积累选中行；长的未选中行也按chunk跳过，不保存整个文件或其前缀。</zh-CN><en>Accumulate selected lines only; even long unselected lines are skipped by chunk without retaining the file or its prefix.</en></lang>
    const lines: string[] = [];
    // <lang><zh-CN>pieces只跨chunk拼接当前选中行；line为一基扫描位置，bytes计所选UTF-8正文，complete表示已到末行。</zh-CN><en>pieces joins only the current selected line across chunks; line is the one-based scan position, bytes counts selected UTF-8 bodies, and complete marks the final line.</en></lang>
    let pieces: string[] = [];
    let line = 1;
    let bytes = 0;
    let complete = false;
    const input = createReadStream(realSource, { encoding: "utf8", highWaterMark: 65_536 });
    for await (const chunk of input) {
      // <lang><zh-CN>解码流保留跨chunk字符完整性；offset只在当前chunk中推进，不累计未选前缀。</zh-CN><en>The decoded stream preserves characters across chunks; offset advances within this chunk without retaining unselected prefixes.</en></lang>
      const text = chunk as string;
      let offset = 0;
      while (offset < text.length) {
        // <lang><zh-CN>只切到下一换行；未选中的大行也不会组合成一条大字符串。</zh-CN><en>Slice only through the next newline; large unselected lines never form a combined string.</en></lang>
        const next = text.indexOf("\n", offset);
        const piece = text.slice(offset, next < 0 ? text.length : next);
        if (line >= start && line <= end) {
          // <lang><zh-CN>不计被排除的末行换行；超限立即销毁流，不把正文带入错误信息。</zh-CN><en>Exclude the newline after the final selected line; destroy the stream immediately on overflow without reflecting bodies in errors.</en></lang>
          bytes += Buffer.byteLength(piece, "utf8") + (next < 0 || line >= end ? 0 : 1);
          if (bytes > MAX_PREVIEW_BYTES) { addLimitDiagnostic(state, "HIA_CLI_SOURCE_PREVIEW_LIMIT", "An authorized source excerpt exceeds 1 MiB. Reduce docs.source.maxLines or provide a bounded producer excerpt."); input.destroy(); return undefined; }
          pieces.push(piece);
        }
        if (next < 0) break;
        // <lang><zh-CN>完成的选中行去掉CRLF的CR；扫描下一行前丢弃临时片段，到界即停止。</zh-CN><en>Strip CR from completed selected CRLF lines, discard temporary pieces before the next line, and stop at the boundary.</en></lang>
        if (line >= start && line <= end) lines.push(pieces.join("").replace(/\r$/u, ""));
        pieces = [];
        line += 1;
        offset = next + 1;
        if (line > end) { complete = true; break; }
      }
      if (complete) break;
    }
    // <lang><zh-CN>EOF可结束无换行的末行；公开范围按实际取得行数计算，不能保留越过EOF的定位范围。</zh-CN><en>EOF may terminate a line without a newline; derive the published range from actual lines instead of keeping a range beyond EOF.</en></lang>
    if (!complete && line >= start && line <= end) lines.push(pieces.join("").replace(/\r$/u, ""));
    if (lines.length === 0) return undefined;
    const preview: RenderProjectSourcePreviewRef = { content: lines.join("\n"), range: { start: { line: start }, end: { line: start + lines.length - 1 } } };
    // <lang><zh-CN>正文和少量元数据按估算预算淘汰；调用方已取得的片段仍由本次总准备预算约束。</zh-CN><en>Evict body/metadata records by the estimated budget; excerpts already handed to callers remain subject to the aggregate preparation budget.</en></lang>
    const weight = preview.content.length * 2 + 256;
    while (state.cache.size > 0 && state.cacheBytes + weight > MAX_CACHE_BYTES) {
      const oldest = state.cache.keys().next().value!;
      state.cacheBytes -= state.cache.get(oldest)!.bytes;
      state.cache.delete(oldest);
    }
    state.cache.set(key, { preview, bytes: weight });
    state.cacheBytes += weight;
    return preview;
  } catch { return undefined; }
}

/** @lang zh-CN 按code限一条静态错误，不回显文件正文、私有绝对路径或原异常。 @lang en Keeps at most one static error per code, without reflecting file bodies, private absolute paths or original exceptions. */
function addLimitDiagnostic(state: SourceReadState, code: string, message: string): void {
  if (!state.diagnostics.some((item) => item.code === code)) state.diagnostics.push(createHiaDiagnostic(code, message, "error", { targetPath: "docs.source.maxLines" }));
}

/** @lang zh-CN 真实/词法路径均使用同一目录包含规则。 @lang en Uses one directory-containment rule for real and lexical paths. */
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/** @lang zh-CN producer正文也服从同一行数上限；只裁剪源码片段，不修改摘要/备注/参数等文档字段。 @lang en Producer bodies share the same line cap; clips source excerpts only, never summary/remarks/parameter documentation fields. */
function limitProducerPreview(preview: RenderProjectSourcePreviewRef, locatorStart: number, maxLines: number): RenderProjectSourcePreviewRef {
  // <lang><zh-CN>按换行位置扫描，避免先把整份producer正文拆成庞大的行数组。</zh-CN><en>Scan newline positions rather than first splitting the entire producer body into a large line array.</en></lang>
  let end = -1;
  for (let line = 0; line < maxLines; line += 1) {
    end = preview.content.indexOf("\n", end + 1);
    if (end < 0) return preview;
  }
  const start = preview.range?.start.line ?? locatorStart;
  return { ...preview, content: preview.content.slice(0, end).replace(/\r$/u, ""), range: { start: { line: start }, end: { line: start + maxLines - 1 } } };
}
