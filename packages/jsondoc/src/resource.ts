/**
 * @file
 * @lang zh-CN 严格JSON值树投影，原始数值、Pointer和物理UTF16范围均保留；不执行输入或读取网络。
 * @lang en Strict JSON value-tree projection retaining raw numbers, pointers and physical UTF16 ranges, without executing input or accessing networks.
 */
import { createHash } from "node:crypto";
import { createScanner, parseTree, SyntaxKind, type Node, type ParseError } from "jsonc-parser";
import { createHiaDocument, type HiaDocument, type HiaNode, type HiaSourcePosition, type HiaSymbol } from "@hia-doc/core";
import { DOC_SOURCE_MAP_CONTRACT, DOC_SOURCE_MAP_CONTRACT_VERSION } from "@hia-doc/source-linkage";

/**
 * @lang zh-CN 显式资源位置和真实正文语言；path为公开安全相对路径，locale由调用方确认。
 * @lang en Explicit resource location and actual content locale; path is public-safe and relative, and callers confirm locale.
 */
export interface JsonDocumentationOptions {
  /**
   * @lang zh-CN 公开安全相对路径，也是稳定资源身份的来源；最大4096个UTF16单位。
   * @lang en Public-safe relative path defining stable resource identity, at most 4096 UTF16 units.
   */
  path: string;
  /**
   * @lang zh-CN 调用方确认的实际正文语言，未分类可显式使用und；无隐式翻译。
   * @lang en Caller-confirmed actual content locale; und explicitly marks unclassified content, with no implicit translation.
   */
  locale: string;
}

/**
 * @lang zh-CN 核心1.0.0文档、源码映射1.1.0与单份原文；调用方负责存储、授权和公开审查。
 * @lang en Core 1.0.0 document, source map 1.1.0 and a single original text, with callers owning storage, authorization and publication review.
 */
export interface JsonDocumentationResult {
  /**
   * @lang zh-CN 每个JSON值对应一个符号的核心文档，容器不嵌入重复原文。
   * @lang en Core document with one symbol per JSON value, without repeated container source bodies.
   */
  document: HiaDocument;
  /**
   * @lang zh-CN 现有1.1.0映射，逐值声明排除终点及UTF16单位，可交现有reader验证。
   * @lang en Existing 1.1.0 mapping declaring exclusive UTF16 ranges per value, consumable by the existing reader.
   */
  sourceMap: Record<string, unknown>;
  /**
   * @lang zh-CN 单份原始UTF8正文，调用方负责其存储和公开权限。
   * @lang en One original UTF8 text, with callers owning storage and publication authority.
   */
  sourceText: string;
}

/**
 * @lang zh-CN 为一份已授权JSON生成所有值的层级文档，标量保存原始词法；容器正文集中于返回的sourceText。
 * @lang en Generates hierarchical documentation for every value of authorized JSON, retaining raw scalar lexemes and centralizing container text in sourceText.
 * @param input <lang><zh-CN>严格UTF8字节或可无损UTF8往返的原文，最多4MiB。</zh-CN><en>Strict UTF8 bytes or losslessly UTF8-round-trippable text, at most 4MiB.</en></lang>
 * @param options <lang><zh-CN>公开相对路径与实际语言，不从路径推断授权。</zh-CN><en>Public relative path and actual locale, without inferring authorization from the path.</en></lang>
 * @returns <lang><zh-CN>确定性文档、逐值来源和单份原文；引用只标记词法出现，未宣称schema求值。</zh-CN><en>Deterministic document, per-value provenance and one original text; references mark lexical occurrences without claiming schema evaluation.</en></lang>
 * @throws {TypeError} <lang><zh-CN>路径、语言、UTF8、严格JSON、重复解码键或资源预算无效；消息不含输入正文。</zh-CN><en>Invalid path, locale, UTF8, strict JSON, duplicate decoded keys or resource budgets; messages omit input content.</en></lang>
 */
export function generateJsonDocumentation(input: string | Uint8Array, options: JsonDocumentationOptions): JsonDocumentationResult {
  assertResourcePath(options?.path);
  if (typeof options.locale !== "string" || !/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(options.locale)) throw new TypeError("JSON resource locale is invalid.");
  if (typeof input !== "string" && !(input instanceof Uint8Array)) throw new TypeError("JSON resource input is invalid.");
  // <lang><zh-CN>先限制调用者输入，避免为超限数据建立额外字节副本；正文为本次调用快照。</zh-CN><en>Bound caller input before allocating another byte copy; text is an invocation-local snapshot.</en></lang>
  if ((typeof input === "string" ? Buffer.byteLength(input) : input.byteLength) > 4 * 1024 * 1024) throw new TypeError("JSON resource byte limit exceeded.");
  const bytes = Buffer.from(input);
  const text = decodeResource(bytes, typeof input === "string" ? input : undefined);
  checkSyntaxBudget(text);
  // <lang><zh-CN>原生严格解析负责语法拒绝，其数值结果不用于文档，避免IEEE754精度损失。</zh-CN><en>Native strict parsing rejects grammar errors; its numeric result never supplies documentation, avoiding IEEE754 precision loss.</en></lang>
  try { JSON.parse(text); } catch { throw new TypeError("JSON resource must contain strict JSON."); }
  const errors: ParseError[] = [];
  const root = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  if (!root || errors.length) throw new TypeError("JSON resource syntax tree is invalid.");

  // <lang><zh-CN>资源路径决定稳定身份，正文摘要单独描述内容版本，符号身份可在值变化后保持。</zh-CN><en>The resource path determines stable identity, while a separate digest identifies content versions so value changes retain symbol identity.</en></lang>
  const identity = createHash("sha256").update(options.path).digest("hex");
  const sourceId = `json-source:${identity}`;
  const documentId = `json-document:${identity}`;
  const symbols: HiaSymbol[] = [];
  const entries: Record<string, unknown>[] = [];
  // <lang><zh-CN>总Pointer预算约束深层长键重复展开，避免小输入形成过大的身份和导航字符串。</zh-CN><en>An aggregate pointer budget bounds repeated expansion of deeply nested long keys, preventing small inputs from creating oversized identity and navigation strings.</en></lang>
  let identityUnits = 0;
  const lineStarts = [0];
  // <lang><zh-CN>仅JSON物理换行CRLF/LF/CR改变行号，字符串内Unicode分隔符保留列位置。</zh-CN><en>Only physical JSON CRLF/LF/CR newlines change line numbers; Unicode separators inside strings retain column positions.</en></lang>
  for (const match of text.matchAll(/\r\n|\r|\n/g)) lineStarts.push(match.index! + match[0].length);

  /**
   * @lang zh-CN 二分查找物理行首，将UTF16偏移转换为一基行列。
   * @lang en Binary-searches physical line starts to convert UTF16 offsets into one-based coordinates.
   * @param offset <lang><zh-CN>当前原文内的UTF16偏移。</zh-CN><en>UTF16 offset in the current original text.</en></lang>
   * @returns <lang><zh-CN>一基行列。</zh-CN><en>One-based line and column.</en></lang>
   */
  function positionAt(offset: number): HiaSourcePosition {
    // <lang><zh-CN>查找窗口逐步收缩到不晚于目标偏移的最后行首。</zh-CN><en>The search window shrinks to the last line start at or before the target offset.</en></lang>
    let lower = 0;
    let upper = lineStarts.length - 1;
    while (lower < upper) {
      const middle = Math.floor((lower + upper + 1) / 2);
      if (lineStarts[middle]! <= offset) lower = middle;
      else upper = middle - 1;
    }
    return { line: lower + 1, column: offset - lineStarts[lower]! + 1 };
  }

  /**
   * @lang zh-CN 逐值建立节点、标量原文和来源，解码键仅作为数据参与Pointer构造。
   * @lang en Builds per-value nodes, scalar source and provenance, treating decoded keys solely as data when constructing pointers.
   * @param node <lang><zh-CN>jsonc-parser原始值节点。</zh-CN><en>Original jsonc-parser value node.</en></lang>
   * @param pointer <lang><zh-CN>当前RFC6901 Pointer。</zh-CN><en>Current RFC6901 pointer.</en></lang>
   * @param name <lang><zh-CN>原始键、数组下标或根路径。</zh-CN><en>Original key, array index or root path.</en></lang>
   * @param parentId <lang><zh-CN>父值符号身份，根节点省略。</zh-CN><en>Parent value symbol identity, omitted for the root.</en></lang>
   * @returns <lang><zh-CN>与符号树对应的导航节点。</zh-CN><en>Navigation node corresponding to the symbol tree.</en></lang>
   * @throws {TypeError} <lang><zh-CN>重复键、无效AST或值数量超限。</zh-CN><en>Duplicate keys, invalid AST or exceeded value count.</en></lang>
   */
  function visit(node: Node, pointer: string, name: string, parentId?: string): HiaNode {
    identityUnits += pointer.length + options.path.length;
    if (identityUnits > 2000000) throw new TypeError("JSON resource pointer budget exceeded.");
    if (symbols.length >= 100000 || node.type === "property") throw new TypeError("JSON resource value limit or structure is invalid.");
    // <lang><zh-CN>来源范围与原文偏移共用排除终点，标量词法直接切片，容器不重复复制正文。</zh-CN><en>Source ranges and original offsets share exclusive endpoints; scalar lexemes are sliced directly while container bodies are never duplicated.</en></lang>
    const id = `json:${identity}:${pointer}`;
    const endOffset = node.offset + node.length;
    const range = { start: positionAt(node.offset), end: positionAt(endOffset) };
    const scalar = node.type !== "object" && node.type !== "array";
    const json: Record<string, unknown> = { pointer, type: node.type, startOffset: node.offset, endOffset };
    if (scalar) json.lexeme = text.slice(node.offset, endOffset);
    // <lang><zh-CN>引用键的出现与schema词汇表求值分开保留，const等数据上下文不会被误作可跳转schema。</zh-CN><en>Reference-key occurrences are retained separately from schema vocabulary evaluation so data contexts such as const never become guessed schema links.</en></lang>
    if ((name === "$ref" || name === "$dynamicRef") && node.type === "string") json.reference = { keyword: name, value: node.value, semantics: "lexical-occurrence" };
    symbols.push({
      id, name: name || '""', kind: `json-${node.type}`, ...(parentId ? { parentId } : {}), longname: `${options.path}#${pointer}`,
      signature: scalar ? `${name || '""'} = ${json.lexeme}` : `${name || '""'} (${node.type})`,
      source: { model: "hia-source", modelVersion: "1.0.0", mode: "link", definedIn: { kind: "defined-in", relativePath: options.path, language: "json", position: range.start, range } },
      metadata: { json }
    });
    entries.push({
      id: `entry:${id}`, kind: "symbol", symbolId: id, symbolKind: `json-${node.type}`,
      sourceRefs: [{ sourceId, range, rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }, rangeSource: "parser", rangeSourceDetail: "jsonc-parser@3.3.1", confidence: "high" }],
      artifactRefs: [{ artifactId: documentId, selector: id, rangeSource: "adapter", confidence: "high" }], diagnostics: []
    });
    // <lang><zh-CN>每个对象独立检查解码键唯一性，Map/Set避免特殊名称触发对象原型行为。</zh-CN><en>Each object checks decoded-key uniqueness independently, using Map/Set to avoid special-name prototype behavior.</en></lang>
    const children: HiaNode[] = [];
    const names = new Set<string>();
    for (const [index, child] of (node.children ?? []).entries()) {
      const key = node.type === "object" ? child.children?.[0]?.value as unknown : String(index);
      const value = node.type === "object" ? child.children?.[1] : child;
      if (typeof key !== "string" || !value || names.has(key)) throw new TypeError("JSON resource has duplicate keys or an invalid tree.");
      names.add(key);
      const escaped = key.replaceAll("~", "~0").replaceAll("/", "~1");
      children.push(visit(value, `${pointer}/${escaped}`, key, id));
    }
    return { id: `node:${id}`, kind: node.type, title: name || '""', symbolIds: [id], ...(children.length ? { children } : {}) };
  }

  // <lang><zh-CN>单份资源摘要记录原始UTF8字节；快照由调用方单独存储，核心文档不嵌入重复源码。</zh-CN><en>The single resource digest covers original UTF8 bytes; callers store the snapshot separately, and core documents embed no repeated source bodies.</en></lang>
  const navigation = visit(root, "", options.path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const document = createHiaDocument({ id: documentId, title: options.path, defaultLocale: options.locale, locales: [options.locale], nodes: [navigation], symbols, metadata: { jsonResource: { path: options.path, sha256, byteLength: bytes.length } } });
  return {
    document, sourceText: text,
    sourceMap: {
      contract: DOC_SOURCE_MAP_CONTRACT, contractVersion: DOC_SOURCE_MAP_CONTRACT_VERSION, id: `map:${identity}`,
      producer: { name: "@hia-doc/jsondoc", version: "1.0.0" },
      artifacts: [{ id: documentId, kind: "hia-document", language: "json", contractRefs: [{ contract: "hia-core-document", contractVersion: "1.0.0", path: "document.hia.json" }] }],
      sources: [{ id: sourceId, kind: "source", path: options.path, language: "json", sourcesContentPolicy: "none" }],
      sourceMaps: [], chains: [], entries, privacy: { sourcesContentPolicy: "none" }, diagnostics: []
    }
  };
}

/**
 * @lang zh-CN 校验资源公开相对路径，拒绝平台路径、编码分隔符及跳转片段。
 * @lang en Validates public relative resource paths, rejecting platform paths, encoded separators and traversal segments.
 * @param value <lang><zh-CN>调用方提供的路径。</zh-CN><en>Caller-provided path.</en></lang>
 * @throws {TypeError} <lang><zh-CN>路径不安全。</zh-CN><en>Unsafe path.</en></lang>
 */
export function assertResourcePath(value: string): void {
  if (typeof value !== "string" || !value || value.length > 4096 || /[\\:%?#\u0000-\u001f\u007f]/u.test(value) || value.split("/").some(part => !part || part === "." || part === "..")) throw new TypeError("JSON resource path is invalid.");
}

/**
 * @lang zh-CN 严格解码UTF8并保持BOM，由后续严格JSON语法拒绝BOM。
 * @lang en Strictly decodes UTF8 while retaining BOM for rejection by strict JSON grammar.
 * @param bytes <lang><zh-CN>当前字节快照。</zh-CN><en>Current byte snapshot.</en></lang>
 * @param original <lang><zh-CN>可选字符串输入，用于无损往返核对。</zh-CN><en>Optional string input for lossless round-trip checking.</en></lang>
 * @returns <lang><zh-CN>精确保留的原文。</zh-CN><en>Exactly retained original text.</en></lang>
 * @throws {TypeError} <lang><zh-CN>UTF8或往返无效。</zh-CN><en>Invalid UTF8 or round trip.</en></lang>
 */
function decodeResource(bytes: Uint8Array, original?: string): string {
  try {
    // <lang><zh-CN>不替换无效字节，也不静默丢弃BOM或孤立代理项。</zh-CN><en>Never replace invalid bytes or silently discard BOMs or lone surrogates.</en></lang>
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (original !== undefined && text !== original) throw new TypeError();
    return text;
  } catch { throw new TypeError("JSON resource must contain valid UTF8."); }
}

/**
 * @lang zh-CN AST建立前限制扫描token及容器深度，避免病理输入耗尽栈或内存。
 * @lang en Bounds scanned tokens and container depth before AST construction to avoid stack or memory exhaustion.
 * @param text <lang><zh-CN>已解码原文。</zh-CN><en>Decoded original text.</en></lang>
 * @throws {TypeError} <lang><zh-CN>超过250000 token或128层。</zh-CN><en>More than 250000 tokens or 128 container levels.</en></lang>
 */
function checkSyntaxBudget(text: string): void {
  // <lang><zh-CN>扫描器仅测预算，严格语法由后续JSON.parse及parseTree共同验证。</zh-CN><en>The scanner measures budgets only; subsequent JSON.parse and parseTree jointly validate strict grammar.</en></lang>
  const scanner = createScanner(text, true);
  let tokens = 0;
  let depth = 0;
  for (let token = scanner.scan(); token !== SyntaxKind.EOF; token = scanner.scan()) {
    tokens++;
    if (token === SyntaxKind.OpenBraceToken || token === SyntaxKind.OpenBracketToken) depth++;
    if (token === SyntaxKind.CloseBraceToken || token === SyntaxKind.CloseBracketToken) depth--;
    if (tokens > 250000 || depth > 128) throw new TypeError("JSON resource syntax budget exceeded.");
  }
}
