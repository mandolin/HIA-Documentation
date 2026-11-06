/**
 * @lang zh-CN JSON资源的独立字节与位置审核，供实际文档生产结果交叉核对。
 * @lang en Independent JSON resource byte and location auditing for cross-checking actual documentation production.
 */
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * @lang zh-CN 原生JSON值节点与JSON类型的对应表。
 * @lang en Mapping from native JSON value nodes to JSON types.
 */
const nodeTypes = new Map([
  [ts.SyntaxKind.ObjectLiteralExpression, "object"],
  [ts.SyntaxKind.ArrayLiteralExpression, "array"],
  [ts.SyntaxKind.StringLiteral, "string"],
  [ts.SyntaxKind.NumericLiteral, "number"],
  [ts.SyntaxKind.PrefixUnaryExpression, "number"],
  [ts.SyntaxKind.TrueKeyword, "boolean"],
  [ts.SyntaxKind.FalseKeyword, "boolean"],
  [ts.SyntaxKind.NullKeyword, "null"]
]);

/**
 * @lang zh-CN 从明确资源根读取普通文件，核对实际物理路径和硬链接数。
 * @lang en Reads a regular file beneath an explicit resource root after checking physical identity and hard-link count.
 * @param {string} root - 授权资源根。 Authorized resource root.
 * @param {string} relative - 规范相对文件路径。 Canonical relative file path.
 * @returns {Buffer} 本次读取的原始字节。 Original bytes read during this invocation.
 * @throws {Error} 路径、物理边界或文件类型无效。 Invalid path, physical boundary or file type.
 */
export function readJsonResourceBytes(root, relative) {
  if (typeof relative !== "string" || !relative || /[\\:%?#\u0000-\u001f\u007f]/.test(relative)
    || path.posix.normalize(relative) !== relative || relative.split("/").some(part => !part || part === "." || part === "..")
    || path.isAbsolute(relative)) throw new Error("JSON resource path is invalid.");
  // <lang><zh-CN>最终文件必须使用根内原路径，联接和链接由物理路径及文件状态共同识别。</zh-CN><en>The final file must retain its original path beneath the root, with redirects identified through physical paths and file state.</en></lang>
  const base = fs.realpathSync(root);
  const file = path.join(base, relative);
  const state = fs.lstatSync(file);
  if (!state.isFile() || state.isSymbolicLink() || state.nlink !== 1 || fs.realpathSync(file) !== file) throw new Error("JSON resource physical boundary is invalid.");
  if (state.size > 4 * 1024 * 1024) throw new Error("JSON resource byte limit exceeded.");
  return fs.readFileSync(file);
}

/**
 * @lang zh-CN 在建立AST前限制语法token和容器深度，控制定位审核的内存预算。
 * @lang en Bounds syntax tokens and container depth before AST creation to control location-audit memory use.
 * @param {string} text - 已解码原始正文。 Decoded original text.
 * @returns {void} 预算内完成。 Completes within the budget.
 * @throws {Error} token或深度超过审核限额。 Token or depth audit limit exceeded.
 */
function checkSyntaxBudget(text) {
  // <lang><zh-CN>扫描器跳过空白和注释，后续严格JSON语法检查仍会校验完整原文。</zh-CN><en>The scanner skips trivia while the later strict JSON check validates the complete original text.</en></lang>
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  let tokens = 0;
  let depth = 0;
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    tokens++;
    if (token === ts.SyntaxKind.OpenBraceToken || token === ts.SyntaxKind.OpenBracketToken) depth++;
    if (token === ts.SyntaxKind.CloseBraceToken || token === ts.SyntaxKind.CloseBracketToken) depth--;
    if (tokens > 250000 || depth > 128) throw new Error("JSON resource syntax limit exceeded.");
  }
}

/**
 * @lang zh-CN 严格读取一个JSON资源并记录全部值的Pointer、原始词法、摘要及UTF16范围。
 * @lang en Strictly reads one JSON resource and records every value's pointer, original lexeme, digest and UTF16 range.
 * @param {string|Uint8Array} input - 原始UTF8字节或等价正文。 Original UTF8 bytes or equivalent text.
 * @returns {object} 独立资源事实及引用出现位置。 Independent resource facts and reference occurrence locations.
 * @throws {Error} UTF8、JSON、重复键、范围或资源限额无效。 Invalid UTF8, JSON, duplicate keys, ranges or resource limits.
 */
export function inspectJsonResource(input) {
  // <lang><zh-CN>字节快照限定为本次调用，字符串输入也核对UTF8往返以保留原始内容。</zh-CN><en>The byte snapshot belongs to this invocation; string inputs also undergo a UTF8 round-trip check to retain original content.</en></lang>
  if (typeof input !== "string" && !(input instanceof Uint8Array)) throw new Error("JSON resource input is invalid.");
  const bytes = Buffer.from(input);
  if (bytes.length > 4 * 1024 * 1024) throw new Error("JSON resource byte limit exceeded.");
  let text;
  let parsed;
  try {
    text = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true}).decode(bytes);
    if (typeof input === "string" && text !== input) throw new Error();
    checkSyntaxBudget(text);
    parsed = JSON.parse(text);
  } catch (error) {
    if (error.message === "JSON resource syntax limit exceeded.") throw error;
    throw new Error("JSON resource must contain strict UTF8 JSON.");
  }

  // <lang><zh-CN>原生AST仅用于独立来源核对，节点记录保留原始数值词法。</zh-CN><en>The native AST supplies independent source evidence, and node records retain original number lexemes.</en></lang>
  const source = ts.parseJsonText("resource.json", text);
  if (source.parseDiagnostics.length || source.statements.length !== 1) throw new Error("JSON resource source structure is invalid.");
  // <lang><zh-CN>JSON物理行采用CRLF、LF或CR，字符串中的Unicode分隔符保留其原字符位置。</zh-CN><en>JSON physical lines use CRLF, LF or CR, retaining Unicode separators inside strings at their original character positions.</en></lang>
  const lineStarts = [0];
  for (const match of text.matchAll(/\r\n|\r|\n/g)) lineStarts.push(match.index + match[0].length);
  const nodes = [];
  const referenceOccurrences = [];

  /**
   * @lang zh-CN 将原始UTF16偏移转换为JSON物理行列。
   * @lang en Converts an original UTF16 offset to JSON physical line and column.
   * @param {number} offset - 原始正文偏移。 Original text offset.
   * @returns {object} 一基行列。 One-based line and column.
   */
  function positionAt(offset) {
    // <lang><zh-CN>二分查找包含偏移的最后一个行首，索引区间逐步收缩。</zh-CN><en>Binary-search the last line start containing this offset, shrinking the index interval.</en></lang>
    let lower = 0;
    let upper = lineStarts.length - 1;
    while (lower < upper) {
      const middle = Math.floor((lower + upper + 1) / 2);
      if (lineStarts[middle] <= offset) lower = middle;
      else upper = middle - 1;
    }
    return {line: lower + 1, column: offset - lineStarts[lower] + 1};
  }

  /**
   * @lang zh-CN 逐值保存原始范围，按解码后的对象键生成标准Pointer。
   * @lang en Retains original ranges per value and builds standard pointers from decoded object keys.
   * @param {object} node - 原生JSON值节点。 Native JSON value node.
   * @param {string} pointer - 当前值的RFC6901位置。 RFC6901 location of this value.
   * @returns {void} 追加本轮事实记录。 Appends this invocation's fact records.
   * @throws {Error} 节点身份歧义或超出预算。 Ambiguous node identity or an exceeded budget.
   */
  function visit(node, pointer) {
    if (nodes.length >= 100000) throw new Error("JSON resource node limit exceeded.");
    // <lang><zh-CN>偏移与坐标来自同一原文，终点使用原生排除边界。</zh-CN><en>Offsets and coordinates come from the same original text, using the native exclusive end.</en></lang>
    const startOffset = node.getStart(source);
    const endOffset = node.end;
    const start = positionAt(startOffset);
    const end = positionAt(endOffset);
    const type = nodeTypes.get(node.kind);
    if (!type || endOffset <= startOffset) throw new Error("JSON resource value range is invalid.");
    const lexeme = text.slice(startOffset, endOffset);
    const record = {
      pointer, type, startOffset, endOffset,
      range: {start, end},
      sha256: createHash("sha256").update(lexeme).digest("hex")
    };
    if (type !== "object" && type !== "array") record.lexeme = lexeme;
    nodes.push(record);

    if (ts.isObjectLiteralExpression(node)) {
      // <lang><zh-CN>键集合保存解码身份，结构形状名称按普通数据处理。</zh-CN><en>The key set retains decoded identity, treating structural-looking names as ordinary data.</en></lang>
      const names = new Set();
      for (const property of node.properties) {
        const name = JSON.parse(property.name.getText(source));
        if (names.has(name)) throw new Error("JSON resource has duplicate object keys.");
        names.add(name);
        const escaped = name.replaceAll("~", "~0").replaceAll("/", "~1");
        const childPointer = `${pointer}/${escaped}`;
        if (["$ref", "$dynamicRef"].includes(name) && ts.isStringLiteral(property.initializer)) {
          referenceOccurrences.push({pointer: childPointer, value: JSON.parse(property.initializer.getText(source))});
        }
        visit(property.initializer, childPointer);
      }
    } else if (ts.isArrayLiteralExpression(node)) {
      for (const [index, element] of node.elements.entries()) visit(element, `${pointer}/${index}`);
    }
  }
  visit(source.statements[0].expression, "");

  // <lang><zh-CN>根身份只读取实际自有字符串字段，资源引用继续保存词法上下文。</zh-CN><en>Root identities come only from actual own string fields, while resource references retain lexical context.</en></lang>
  /**
   * @lang zh-CN 读取根对象的自有字符串身份字段。
   * @lang en Reads an own string identity field from the root object.
   * @param {string} key - 身份字段名。 Identity field name.
   * @returns {string|null} 实际字符串或空标记。 Actual string or an absence marker.
   */
  function rootString(key) {
    if (parsed === null || typeof parsed !== "object" || !Object.hasOwn(parsed, key)) return null;
    const value = parsed[key];
    return typeof value === "string" ? value : null;
  }
  return {
    byteLength: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    schemaId: rootString("$id"), dialect: rootString("$schema"), title: rootString("title"),
    rangeConvention: {endBoundary: "exclusive", columnUnit: "utf16-code-unit"},
    nodes, referenceOccurrences, referenceSemantics: "lexical-occurrences"
  };
}
