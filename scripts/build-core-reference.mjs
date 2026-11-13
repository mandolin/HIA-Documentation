/**
 * @file
 * @lang zh-CN 用现有生产器构建独立核心 API 站，保留模块边界、原生工件和双语静态入口。
 * @lang en Build the independent core API site through existing producers, retaining module boundaries, native artifacts, and bilingual static entries.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
import {HIA_SOURCE_MODEL, HIA_SOURCE_MODEL_VERSION} from "../packages/core/dist/index.js";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preparePublicReferencePackageApis, checkPublicReferencePackageApis } from "./public-reference-packages.mjs";
import { preparePublicReferenceResources, checkPublicReferenceResources } from "./public-reference-resources.mjs";
import { preparePublicReferenceSourceConfig, preparePublicReferenceLocaleConfig } from "./public-reference-source.mjs";
import { assertPublicText } from "./check-official-web.mjs";
import { validateDocumentationPresentationProfile } from "../packages/core/dist/index.js";
import { assertDocumentationSiteNavigation, PORTAL_PUBLIC_SOURCE_GITATTRIBUTES } from "../packages/renderer-html/dist/index.js";
import { createGeneratedSiteNavigation } from "../site/src/lib/generated-navigation.mjs";
import {preparePublicReferenceCommands, checkPublicReferenceCommands} from './public-reference-commands.mjs';
import { apiReferenceBase } from "../site/src/lib/routes.mjs";

// <lang zh-CN>输出归主仓 dist 所有，来源只允许当前主仓所属容器。</lang><lang en>Outputs belong to this repository's dist directory, and sources must belong to its workspace container.</lang>
const owner = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const dist = path.join(owner, "dist");
const locales = ["en", "zh-CN"];

/**
 * @lang zh-CN 本站显式采用已公开审阅的插件SDK资源包，资源与模块范围独立记录。
 * @lang en Explicitly select the reviewed plugin SDK resource package, recording resource scope independently of modules.
 */
export const CORE_REFERENCE_RESOURCE_PACKAGES = Object.freeze(["@hia-doc/plugin-sdk"]);

/**
 * @lang zh-CN 检查路径是否在指定目录内。
 * @lang en Check whether a path is contained in the selected directory.
 * @param {string} root - 根目录。 Root directory.
 * @param {string} target - 目标路径。 Target path.
 * @returns {boolean} 是否包含。 Whether contained.
 */
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/**
 * @lang zh-CN 遍历已验证JSON的每个字符串及结构路径，保留重复键出现，不递归展开输入。
 * @lang en Walk every string and structural path in validated JSON, retaining duplicate occurrences without recursively expanding input.
 * @param {string} text - 已通过JSON.parse的文本。 Text accepted by JSON.parse.
 * @yields {{value:string,path:Array<string|number>,isKey:boolean}} 每次词法字符串。 Each lexical string occurrence.
 */
function* jsonStrings(text) {
  // <lang><zh-CN>栈仅保存当前容器路径与键/数组槽位，原始值由词法顺序检查。</zh-CN><en>The stack retains only current container paths and key/array slots; lexical order preserves original values.</en></lang>
  const stack = [];
  for (const token of text.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]/gu)) {
    const spelling = token[0];
    const parent = stack.at(-1);
    const location = parent ? [...parent.path, parent.kind === "array" ? parent.index : parent.key] : [];
    if (spelling === "{" || spelling === "[") {
      stack.push({kind: spelling === "{" ? "object" : "array", path: location, key: undefined, index: 0, expectKey: true});
    } else if (spelling === "}" || spelling === "]") {
      stack.pop();
    } else if (spelling === ",") {
      if (parent.kind === "array") parent.index += 1;
      else parent.expectKey = true;
    } else if (spelling.startsWith('"')) {
      const value = JSON.parse(spelling);
      const isKey = parent?.kind === "object" && parent.expectKey;
      if (isKey) { parent.key = value; parent.expectKey = false; }
      yield {value, path: isKey ? [...parent.path, value] : location, isKey};
    }
  }
}

/**
 * @lang zh-CN 仅为有效呈现契约内、与站内实际字节匹配的摘要槽位建立非文本证明。
 * @lang en Establish non-text evidence only for digest slots in valid presentation contracts that match actual local site bytes.
 * @param {unknown} value - 已解析JSON。 Parsed JSON.
 * @param {string} file - JSON绝对路径。 Absolute JSON path.
 * @param {string} root - 授权发布根。 Authorized publication root.
 * @returns {Map<string,string>} 结构路径到已验证摘要。 Structural paths to verified digests.
 * @throws {Error} 本地资产越界、非普通文件或摘要不符。 Escaping/nonregular local assets or mismatching digests.
 */
function verifiedPresentationDigests(value, file, root) {
  const verified = new Map();
  if (value?.contract !== "documentation-presentation-profile" || validateDocumentationPresentationProfile(value).length) return verified;
  for (const [index, asset] of (value.source?.assets ?? []).entries()) {
    if (!asset.relativeUrl || !asset.digest) continue;
    // <lang><zh-CN>只读取本发布根中的普通本地资产，外部URL不获得摘要例外，也不发起网络请求。</zh-CN><en>Read regular local assets within this publication root only; external URLs receive no digest exception or network request.</en></lang>
    const url = new URL(asset.relativeUrl, pathToFileURL(file));
    if (url.protocol !== "file:") continue;
    const source = fileURLToPath(url);
    assert(inside(root, source) && !url.search && !url.hash && fs.realpathSync(source) === source, "Invalid presentation asset path.");
    const state = fs.lstatSync(source);
    assert(state.isFile() && state.nlink === 1 && state.size <= 32 * 1024 ** 2, "Invalid presentation asset file.");
    const body = fs.readFileSync(source);
    assert(asset.byteLength === undefined || asset.byteLength === body.length, "Invalid presentation asset byte length.");
    assert.equal(createHash(asset.digest.algorithm).update(body).digest("base64"), asset.digest.value, "Invalid presentation asset digest.");
    verified.set(JSON.stringify(["source", "assets", index, "digest", "value"]), asset.digest.value);
  }
  return verified;
}

/**
 * @lang zh-CN 输出必须位于主仓 dist 的子目录，拒绝已有链接和重定向父目录。
 * @lang en Require a child of the owner's dist directory, rejecting existing links and redirected parents.
 * @param {string} output - 绝对目标目录。 Absolute destination.
 * @returns {void} 非法时抛错。 Throws on an invalid location.
 */
export function assertCoreReferenceOutput(output) {
  assert(inside(dist, output) && output !== dist, "Core reference output must be a child of dist.");
  let ancestor = output;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  assert(!fs.lstatSync(ancestor).isSymbolicLink() && inside(owner, fs.realpathSync(ancestor)), "Core reference output is redirected.");
  if (fs.existsSync(output)) assert(fs.lstatSync(output).isDirectory(), "Core reference output is not a directory.");
}

/**
 * @lang zh-CN 按实际源码语法分离正则分隔符与模式正文，全部内容继续执行原公开路径判据。
 * @lang en Separate regexp delimiters from pattern bodies using actual source syntax, retaining the original public-path predicate for all content.
 * @param {string} text - 原字节解码后的完整源码，只用于只读验证。 Complete decoded source, used only for read-only verification.
 * @param {string} filename - 已核站点内相对源码名，用于选择语法种类。 Validated site-relative source name, used to select syntax kind.
 * @returns {import("typescript").SourceFile} 已验证的只读语法树，供同一源码的精确范围核对。 Validated read-only syntax tree for exact ranges in the same source.
 * @throws {Error} 语法不受支持或任一区域含禁止路径。 Unsupported syntax or a forbidden path in any region.
 */
function assertPublicCodeSource(text, filename) {
  // <lang><zh-CN>编译器仅解析当前内存文本，解析错误阻断；不创建程序或读取导入依赖。</zh-CN><en>The compiler parses only this in-memory text, rejecting parse errors without creating a program or reading imports.</en></lang>
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, "Invalid public source syntax.");
  // <lang><zh-CN>按语法节点记录正则的UTF-16文本区间，便于其它源码区域保留原有检查。</zh-CN><en>Record regexp UTF-16 spans from syntax nodes so all other source regions retain their existing checks.</en></lang>
  const ranges = [];

  /** @lang zh-CN 正则原模式及字面斜线恢复后的模式均核隐私，递归访问其它节点。 @lang en Check both original patterns and restored literal slashes for privacy while recursively visiting other nodes. */
  function visit(node) {
    if (ts.isRegularExpressionLiteral(node)) {
      // <lang><zh-CN>最后的斜线是语法结束分隔符，正文中的转义斜线保持在模式内。</zh-CN><en>The final slash is the syntax delimiter; escaped slashes inside the body remain part of the pattern.</en></lang>
      const delimiter = node.text.lastIndexOf("/");
      assert(delimiter > 0, "Invalid public regexp syntax.");
      const pattern = node.text.slice(1, delimiter);
      assertPublicText(pattern);
      assertPublicText(node.text.slice(delimiter + 1));
      // <lang><zh-CN>按原词法顺序恢复字面斜线、反斜线和星号，避免注释起始标记的转义星号被当成第二个路径分隔符；原模式及真实UNC/盘符仍逐项检查。</zh-CN><en>Restore literal slash, backslash and asterisk escapes in lexical order so an escaped comment-marker asterisk cannot become a second path separator; original patterns and actual UNC/drive paths remain checked.</en></lang>
      const literalPattern = pattern.replace(/\\([\\/*])/gu, "$1");
      assertPublicText(literalPattern);
      ranges.push({start: node.getStart(source), end: node.getEnd()});
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  // <lang><zh-CN>中性分隔文本隔开已核正则，其余字符原样保留，字符串、模板、注释及编码路径继续检查。</zh-CN><en>Neutral text separates checked regexps while preserving every other character for string, template, comment and encoded-path checks.</en></lang>
  const parts = [];
  let end = 0;
  for (const range of ranges.sort((left, right) => left.start - right.start)) {
    assert(range.start >= end && range.end > range.start);
    parts.push(text.slice(end, range.start), " REGEXP ");
    end = range.end;
  }
  parts.push(text.slice(end));
  assertPublicText(parts.join(""));
  return source;
}

/**
 * @lang zh-CN 仅为与已验证完整源及精确UTF-16范围一致的HIA源码块记录代码文本证明。
 * @lang en Record code-text evidence only for HIA source blocks matching validated complete sources and exact UTF-16 ranges.
 * @param {unknown} value - 已解析JSON。 Parsed JSON.
 * @param {string} file - 当前JSON文件。 Current JSON file.
 * @param {string} root - 发布根。 Publication root.
 * @param {string[]} localeRoots - 已核语言根。 Validated locale roots.
 * @param {Map<string,object>} cache - 本次检查独占的完整源缓存。 Complete-source cache owned by this inspection.
 * @returns {Map<string,string>} 结构路径到已验证原内容；其它字段继续文本检查。 Structural paths to validated original contents, with other fields retaining text checks.
 * @throws {Error} 已声明的来源身份、摘要或范围不符。 Mismatching declared source identity, digest or range.
 */
function verifiedSourceCodeContents(value, file, root, localeRoots, cache) {
  // <lang><zh-CN>证明只使用当前语言发布根内的完整源清单，缺清单时沿原文本检查。
  // </zh-CN><en>Evidence uses only the current locale's complete-source manifest, retaining ordinary text checks when no manifest exists.</en></lang>
  const verified = new Map();
  const localeRoot = localeRoots.map(locale => path.join(root, locale)).find(directory => inside(directory, file));
  const manifestPath = localeRoot && path.join(localeRoot, "source-files/index.json");
  if (!manifestPath || !fs.existsSync(manifestPath)) return verified;
  // <lang><zh-CN>清单也必须为发布根内的普通原文件，本次缓存避免每个代码片段重复读取相同清单。</zh-CN><en>The manifest must also be an ordinary original file inside the publication root; this invocation's cache avoids repeated reads for every code fragment.</en></lang>
  const manifestKey = "manifest:" + path.resolve(manifestPath);
  if (!cache.has(manifestKey)) {
    assert(fs.realpathSync(manifestPath) === path.resolve(manifestPath), "Invalid public code manifest path.");
    const state = fs.lstatSync(manifestPath);
    assert(state.isFile() && state.nlink === 1 && state.size <= 32 * 1024 ** 2, "Invalid public code manifest.");
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert(Array.isArray(parsed.sources), "Invalid public code manifest.");
    cache.set(manifestKey, parsed);
  }
  const manifest = cache.get(manifestKey);
  // <lang><zh-CN>显式栈逐节点查看，避免因任意JSON深度增加递归调用栈。</zh-CN><en>Inspect nodes with an explicit stack rather than recursive calls driven by arbitrary JSON depth.</en></lang>
  const pending = [{value, location: []}];
  while (pending.length) {
    const current = pending.pop();
    if (!current.value || typeof current.value !== "object") continue;
    if (current.value.model === HIA_SOURCE_MODEL && [HIA_SOURCE_MODEL_VERSION, "0.2.0"].includes(current.value.modelVersion)
      || current.value.model === "hia-jsdoc-source" && current.value.modelVersion === "0.2.0") {
      // <lang><zh-CN>只识别原模型的主块，预览内容须由同一原源范围证明。</zh-CN><en>Recognize only the model's primary block; preview contents require evidence from the same original source range.</en></lang>
      const block = current.value.primaryBlock;
      if (block?.kind === "primary-block" && ["javascript", "typescript"].includes(block.language) && typeof block.content === "string") {
        const matches = manifest.sources?.filter(source => source.source === block.relativePath) ?? [];
        assert(matches.length <= 1, "Ambiguous public code source.");
        if (matches.length === 1) {
          const declared = matches[0];
          assert(/\.[cm]?[jt]sx?$/iu.test(block.relativePath), "Unsupported public code source.");
          assert(declared.path === "source-files/" + block.relativePath && !/[\\:%?#]/u.test(declared.path) && !declared.path.split("/").some(part => !part || part === "." || part === ".."), "Invalid public code asset path.");
          const sourcePath = path.resolve(localeRoot, declared.path);
          assert(inside(localeRoot, sourcePath) && fs.realpathSync(sourcePath) === sourcePath, "Invalid public code asset path.");
          // <lang><zh-CN>每个完整源按清单原字节核验，再复用只读语法及隐私检查。</zh-CN><en>Verify each complete source's original bytes against its manifest before reusing read-only syntax and privacy checks.</en></lang>
          const cacheKey = sourcePath + ":" + declared.sha256;
          if (!cache.has(cacheKey)) {
            const state = fs.lstatSync(sourcePath);
            assert(state.isFile() && state.nlink === 1 && state.size <= 32 * 1024 ** 2 && state.size === declared.byteLength, "Invalid public code asset.");
            const bytes = fs.readFileSync(sourcePath);
            assert.equal(createHash("sha256").update(bytes).digest("hex"), declared.sha256, "Public code source digest mismatch.");
            cache.set(cacheKey, assertPublicCodeSource(bytes.toString("utf8"), block.relativePath));
          }
          const source = cache.get(cacheKey);
          for (const item of [{content: block.content, range: block.range, location: [...current.location, "primaryBlock", "content"]},
            {content: block.preview?.content, range: block.preview?.range ?? block.range, location: [...current.location, "primaryBlock", "preview", "content"]}]) {
            if (typeof item.content !== "string") continue;
            // <lang><zh-CN>范围使用同一语法树的行/UTF-16列，往返核验后与原源码片段逐字符比较。</zh-CN><en>Use the same syntax tree's line/UTF-16 columns, round-trip positions and compare the original slice character by character.</en></lang>
            const offsets = [item.range?.start, item.range?.end].map(position => {
              assert(Number.isInteger(position?.line) && position.line > 0 && position.line <= source.getLineStarts().length && Number.isInteger(position.column) && position.column > 0, "Invalid embedded source range.");
              const offset = source.getPositionOfLineAndCharacter(position.line - 1, position.column - 1);
              const actual = source.getLineAndCharacterOfPosition(offset);
              assert(actual.line === position.line - 1 && actual.character === position.column - 1, "Invalid embedded source range.");
              return offset;
            });
            assert(offsets[1] >= offsets[0], "Invalid embedded source range.");
            assert.equal(source.text.slice(...offsets).replace(/\r\n?/gu, "\n"), item.content.replace(/\r\n?/gu, "\n"), "Embedded source content mismatch.");
            verified.set(JSON.stringify(item.location), item.content);
          }
        }
      }
    }
    for (const [key, child] of Object.entries(current.value)) pending.push({value: child, location: [...current.location, Array.isArray(current.value) ? Number(key) : key]});
  }
  return verified;
}

/**
 * @lang zh-CN 逐文件检查可发布目录，拒绝工程副本、链接、越界、隐私及容量超限。
 * @lang en Inspect every publishable file, rejecting build copies, links, escaping paths, private content, and excessive size.
 * @param {string} root - 只含两语言和根入口的站点目录。 Site directory containing both locales and the root entry.
 * @param {string[]} [localeRoots] - 显式语言输出相对根，默认en/zh-CN；分区发布方提供自己的互斥根清单。 Explicit relative locale roots, defaulting to en/zh-CN; partition publishers supply their disjoint roots.
 * @returns {{files:number, bytes:number, inventory:Array<{path:string,bytes:number,sha256:string}>}} 实际文件摘要。 Actual file digests.
 * @throws {Error} 工件路径、内容或容量不符合。 Invalid paths, contents, or capacity.
 */
export function inspectCoreReferenceSite(root, localeRoots = locales) {
  assert(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), "Invalid core reference site root.");
  assert(Array.isArray(localeRoots) && localeRoots.length && new Set(localeRoots).size === localeRoots.length && localeRoots.every(value=>typeof value === "string" && /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/u.test(value)), "Invalid reference locale roots.");
  assert(localeRoots.every(value=>!localeRoots.some(other=>other!==value&&value.startsWith(other+"/"))), "Overlapping reference roots.");
  const topDirectories=new Set(localeRoots.map(value=>value.split("/")[0]));
  const inventory = [];
  // <lang><zh-CN>缓存只在本次站点检查内复用已核完整源，工件字段仍逐次按路径和值核对。</zh-CN><en>Reuse validated complete sources only within this inspection while checking artifact fields by path and value each time.</en></lang>
  const sourceCodeCache = new Map();
  let bytes = 0;
  /**
   * @lang zh-CN 只遍历已选站点目录，逐文件累计摘要和容量。
   * @lang en Traverse only the selected site directory, accumulating per-file digests and size.
   */
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, entry.name);
      const file = path.join(directory, entry.name);
      const state = fs.lstatSync(file);
      // <lang zh-CN>来源字节保护文件仅位于语言根，任意其他隐藏工程文件继续拒绝。</lang><lang en>Source-byte protection metadata belongs only at locale roots; other hidden development files remain rejected.</lang>
      const sourceAttributes = localeRoots.some(localeRoot => relative === localeRoot + "/.gitattributes");
      assert(!state.isSymbolicLink() && !/[\\:%?#]/u.test(relative) && (!entry.name.startsWith(".") || relative === ".nojekyll" || sourceAttributes), "Unexpected core reference path.");
      if (sourceAttributes) assert(state.isFile(), "Invalid core reference source attributes.");
      if (!prefix) assert(topDirectories.has(entry.name) || ["index.html", ".nojekyll"].includes(entry.name), "Build files cannot enter the core reference site.");
      assert(["index.html",".nojekyll"].includes(relative)||localeRoots.some(localeRoot=>relative===localeRoot||relative.startsWith(localeRoot+"/")||state.isDirectory()&&localeRoot.startsWith(relative+"/")),"Unexpected core reference path.");
      if (state.isDirectory()) { visit(file, relative); continue; }
      assert(state.isFile() && state.nlink === 1 && state.size <= 32 * 1024 ** 2, "Invalid core reference file size or type.");
      assert(inventory.length < 100000 && bytes + state.size <= 1_000_000_000, "Core reference site exceeds its publication budget.");
      // <lang zh-CN>逐文件读取保留背压，不把整个站点留在内存中。</lang><lang en>Read one file at a time without retaining the entire site in memory.</lang>
      const body = fs.readFileSync(file);
      if (sourceAttributes) assert.equal(body.toString("utf8"), PORTAL_PUBLIC_SOURCE_GITATTRIBUTES, "Invalid core reference source attributes.");
      assertPublicText(relative);
      // <lang><zh-CN>JSON的词法字符串先按JSON语法解码，避免将代码正则的转义反斜线误作UNC路径；逐token检查保留重复键旧值的隐私检测。</zh-CN><en>Decode JSON lexical strings using JSON syntax before inspection, avoiding fictitious UNC paths from escaped code regexes; per-token inspection retains privacy checks for shadowed duplicate-key values.</en></lang>
      const text = body.toString("utf8");
      if (relative.toLowerCase().endsWith(".json")) {
        let value;
        try { value = JSON.parse(text); }
        catch { throw new Error("Invalid public JSON artifact."); }
        const digests = verifiedPresentationDigests(value, file, root);
        const codeContents = verifiedSourceCodeContents(value, file, root, localeRoots, sourceCodeCache);
        for (const token of jsonStrings(text)) {
          // <lang><zh-CN>相同字串的其它字段仍检查隐私；重复摘要旧值也必须与实际字节相符。</zh-CN><en>Other fields containing the same string remain privacy-checked; shadowed digest values must also match actual bytes.</en></lang>
          if (!token.isKey && digests.get(JSON.stringify(token.path)) === token.value) continue;
          if (!token.isKey && codeContents.get(JSON.stringify(token.path)) === token.value) continue;
          assertPublicText(token.value);
        }
      } else if (relative.includes("/source-files/") && /\.[cm]?[jt]sx?$/iu.test(relative)) {
        assertPublicCodeSource(text, relative);
      } else {
        assertPublicText(text);
      }
      bytes += body.length;
      inventory.push({ path: relative, bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") });
    }
  }
  visit(root);
  assert(inventory.some(file => file.path === "index.html"), "Missing default core reference entry.");
  for (const localeRoot of localeRoots) assert(inventory.some(file => file.path === localeRoot + "/project-index.json"), "Missing core reference language index.");
  return { files: inventory.length, bytes, inventory: inventory.sort((left, right) => left.path.localeCompare(right.path, "en")) };
}

/**
 * @lang zh-CN 正常构建全部十三核心模块，在完整检查通过后替换目标目录并保留前一输出。
 * @lang en Build all thirteen core modules and replace the destination after complete checks, retaining the previous output.
 * @param {object} [options] - 显式工作区和输出位置。 Explicit workspace and output location.
 * @param {string} [options.workspaceRoot] - 包含本主仓与 HIA 工具的容器。 Container containing this repository and HIA tools.
 * @param {string} [options.out] - 主仓 dist 下的输出。 Output under the owner's dist.
 * @returns {Promise<object>} 发布目录摘要及来源提交。 Publishable-file summary and source revisions.
 * @throws {Error} 来源、生产、路径、内容或容量无效。 Invalid sources, production, paths, content, or capacity.
 */
export async function buildCoreReference(options = {}) {
  const workspace = fs.realpathSync(options.workspaceRoot ?? path.dirname(owner));
  const output = path.resolve(owner, options.out ?? "dist/core-api-reference");
  assertCoreReferenceOutput(output);
  assert(fs.realpathSync(path.join(workspace, "main-repo")) === owner, "Workspace does not own this main repository.");
  const tool = fs.realpathSync(path.join(workspace, "HIA/hia-tsdoc"));
  assert(inside(workspace, tool), "Core reference producer escapes the workspace.");
  assert(fs.existsSync(path.join(owner, "apps/cli/dist/index.js")), "Build the HIA CLI before building core references.");
  // <lang zh-CN>固定两个生产仓的已提交状态，避免报告提交与实际构建源码不一致。</lang><lang en>Pin committed states of both production repositories so reported revisions match the built sources.</lang>
  const revisions = [owner, tool].map(repository => {
    execFileSync("git", ["-C", repository, "diff", "--exit-code", "HEAD", "--"], { stdio: "pipe" });
    return execFileSync("git", ["-C", repository, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  });
  const packages = JSON.parse(fs.readFileSync(path.join(owner, "reference/required-package-api.inputs.json"), "utf8")).packages.filter(item => item.owner === "main-repo").map(item => item.name);
  assert(packages.length === 13 && new Set(packages).size === 13, "Expected thirteen explicit core packages.");
  // <lang zh-CN>暂存目录和清单均由本轮独占，失败时目标原目录保持可读。</lang><lang en>This run owns its staging directory and manifest, keeping the existing destination readable on failure.</lang>
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // <lang zh-CN>同一目标只允许一个写者，独立目标仍能并行构建。</lang><lang en>Allow one writer per destination while permitting independent destinations to build concurrently.</lang>
  const lockPath = output + ".lock";
  const lock = fs.openSync(lockPath, "wx");
  let staging;
  const manifestPath = path.join(workspace, ".hia-core-reference-" + randomUUID() + ".runtime.hia-project.json");
  let ownsManifest = false;
  try {
    staging = fs.mkdtempSync(output + ".staging-");
    const inputs = await preparePublicReferencePackageApis({ packageNames: packages, workspaceRoot: workspace, mainRoot: owner, toolRoot: tool, outputRoot: staging, locales });
    // <lang zh-CN>资源复用正常JSONdoc准备链，实际原文、地图与逐值声明沿同一项目聚合。</lang><lang en>Resources reuse normal JSONdoc preparation, aggregating original bytes, maps and per-value declarations into the same project.</lang>
    const resourceResult = await preparePublicReferenceResources({ packageNames: CORE_REFERENCE_RESOURCE_PACKAGES, workspaceRoot: workspace, mainRoot: owner, outputRoot: staging, locales });
    const sourceConfigPath = preparePublicReferenceSourceConfig(owner, path.join(staging, ".runtime"), resourceResult.sourcePaths, false);
    // <lang><zh-CN>主命令归核心包参考站，避免在主站兼容快照中多份复制。</zh-CN><en>The main command belongs to the core-package reference, avoiding repeated copies in the main site's compatibility snapshots.</en></lang>
    const commands = await preparePublicReferenceCommands({workspaceRoot:workspace, mainRoot:owner, sourceRoots:new Map(), outputRoot:staging, locales, ownerIds:['main-repo']});
    for (const [source, bytes] of commands.sources) {
      const target = path.join(staging, '.runtime/source-root', source);
      fs.mkdirSync(path.dirname(target), {recursive:true});
      fs.writeFileSync(target, bytes, {flag:'wx'});
    }
    const manifest = { schemaVersion: "0.1.0-draft", project: { id: "project:hia-core-api-reference", name: "HIA Documentation System Core Package API", defaultLocale: "zh-CN", locales: ["zh-CN", "en"] }, inputs: [...inputs, ...resourceResult.inputs, ...commands.inputs] };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    ownsManifest = true;
    const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", apiReferenceBase);
    assertDocumentationSiteNavigation(navigation);
    const navigationPath = path.join(staging, ".runtime/site-navigation.json");
    fs.writeFileSync(navigationPath, JSON.stringify(navigation, null, 2) + "\n");
    for (const locale of locales) {
      const configPath = preparePublicReferenceLocaleConfig(sourceConfigPath, locale);
      execFileSync(process.execPath, [path.join(owner, "apps/cli/dist/index.js"), "docs", "build", "--config", configPath, "--project-manifest", manifestPath, "--site-navigation", navigationPath, "--out", path.join(staging, locale), "--locale", locale], { cwd: workspace, stdio: "inherit" });
      checkPublicReferencePackageApis({ packageApis: packages }, staging, locale);
      checkPublicReferenceResources({ packageResources: CORE_REFERENCE_RESOURCE_PACKAGES }, staging, locale);
      checkPublicReferenceCommands(staging, locale);
    }
    const site = path.join(staging, "site");
    fs.mkdirSync(site);
    for (const locale of locales) fs.renameSync(path.join(staging, locale), path.join(site, locale));
    // <lang zh-CN>默认入口明确使用中文，普通语言链接支持无脚本导航。</lang><lang en>The default entry selects Chinese explicitly, with ordinary language links for script-free navigation.</lang>
    fs.writeFileSync(path.join(site, "index.html"), '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=zh-CN/"><title>HIA Documentation System API</title><link rel="icon" href="data:,"></head><body><a href="zh-CN/" lang="zh-CN">HIA Documentation System · 中文 API 参考</a><a href="en/" lang="en">HIA Documentation System · English API reference</a></body></html>\n');
    fs.writeFileSync(path.join(site, ".nojekyll"), "");
    const checked = inspectCoreReferenceSite(site);
    const sourceCommit = execFileSync("git", ["-C", owner, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const producerCommit = execFileSync("git", ["-C", tool, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.deepEqual([sourceCommit, producerCommit], revisions, "Source revisions changed during the build.");
    for (const repository of [owner, tool]) execFileSync("git", ["-C", repository, "diff", "--exit-code", "HEAD", "--"], { stdio: "pipe" });
    const resources = JSON.parse(fs.readFileSync(path.join(staging, "package-resources/adoption.json"), "utf8")).rows;
    const report = {
      sourceRepository: "mandolin/HIA-Documentation",
      sourceCommit,
      producerRepository: "mandolin/hia-tsdoc",
      producerCommit,
      packages,
      resourcePackages: CORE_REFERENCE_RESOURCE_PACKAGES,
      resources,
      sourcePolicy: { paths: resourceResult.sourcePaths, maxLines: 400, presentation: "fetch" },
      ...checked
    };
    assertPublicText(JSON.stringify(report));
    fs.writeFileSync(path.join(staging, "build-report.json"), JSON.stringify(report, null, 2) + "\n");
    // <lang zh-CN>清单与运行配置留在构建报告外；只删除本轮拥有的暂存运行目录。</lang><lang en>Exclude runtime configuration from publication, removing only this run's owned runtime directory.</lang>
    assert(!fs.lstatSync(path.join(staging, ".runtime")).isSymbolicLink());
    fs.rmSync(path.join(staging, ".runtime"), { recursive: true, force: true });
    let backup;
    if (fs.existsSync(output)) { backup = output + ".previous-" + randomUUID(); fs.renameSync(output, backup); }
    try { fs.renameSync(staging, output); }
    catch (error) { if (backup) fs.renameSync(backup, output); throw error; }
    return { sourceCommit, producerCommit, packages: packages.length, files: checked.files, bytes: checked.bytes };
  } finally {
    try { if (ownsManifest) fs.unlinkSync(manifestPath); }
    finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
  }
}

// <lang zh-CN>命令入口只解析显式目录，导入测试不会运行构建。</lang><lang en>The command parses explicit directories; importing tests never runs a build.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { "--workspace-root": "workspaceRoot", "--out": "out" }[args[index]];
    assert(key && args[index + 1] && !Object.hasOwn(options, key), "Use --workspace-root and optional --out.");
    options[key] = args[index + 1];
  }
  console.log(JSON.stringify(await buildCoreReference(options)));
}
