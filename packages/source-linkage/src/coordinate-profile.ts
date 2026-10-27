/**
 * @file
 * @lang zh-CN 独立的普通 Source Map 坐标证据读取器；仅消费显式提供的字节与逐槽位证据，严格同点查询不复用旧数值导航的 GLB 结果。
 * @lang en Independent ordinary Source Map coordinate-evidence reader. It consumes only explicitly supplied bytes and per-slot evidence; strict same-point queries never reuse legacy numeric GLB results.
 */
import { decodedMappings, type TraceMap } from "@jridgewell/trace-mapping";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";
import { createBodyFreeOrdinaryTraceMap } from "./ordinary-input.js";
import { createDocSourceMapIndex, type DocSourceMapIndex } from "./index.js";
import { ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT, ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION } from "./coordinate-profile-schema.js";

/** @lang zh-CN 本版单个 profile 的最大 UTF-8 JSON 字节数。 @lang en Maximum UTF-8 JSON bytes for one profile in this version. */
const PROFILE_LIMIT = 2 * 1024 * 1024;
/** @lang zh-CN 单张地图或单份授权源码的最大原始字节数。 @lang en Maximum raw bytes for one map or one authorized source. */
const ARTIFACT_LIMIT = 16 * 1024 * 1024;
/** @lang zh-CN 一次核验的授权源码字节总上限，避免多槽位累积耗尽。 @lang en Aggregate authorized-source byte ceiling for one verification, preventing per-slot resource exhaustion. */
const SOURCE_INPUT_TOTAL_LIMIT = 64 * 1024 * 1024;
/** @lang zh-CN 限制累计段数，避免严格索引被极大映射耗尽。 @lang en Limit total segments to prevent an oversized strict index. */
const SEGMENT_LIMIT = 1_000_000;
/** @lang zh-CN SHA-256 摘要的规范 Base64 形式；填充与位数都必须规范。 @lang en Canonical padded Base64 form of a SHA-256 digest. */
const DIGEST_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
/** @lang zh-CN 不透明公开安全版本标签禁止路径、凭据和 URL 样式字符。 @lang en Public-safe opaque revision labels exclude path, credential and URL-like characters. */
const REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}(?![\s\S])/;
/** @lang zh-CN 公开身份只准不透明标识字符且必须消耗完整字符串，禁止路径、URL、空白及尾随换行。 @lang en Public identities allow only opaque identifier characters and must consume the entire string, excluding paths, URLs, whitespace and trailing newlines. */
const IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*(?![\s\S])/;

/** @lang zh-CN 固定公开诊断，不包含输入路径、摘要、异常或源码。 @lang en Fixed public-safe diagnostic without input paths, hashes, exceptions or source text. */
export interface CoordinateProfileDiagnostic { code: string; message: string }
/** @lang zh-CN 可查询索引的状态；可用不等于每个槽位已授权或每个坐标均有段。 @lang en Index state; available does not imply every slot is authorized or every coordinate has a segment. */
export type CoordinateProfileStatus = "available" | "invalid" | "unsupported-version";
/** @lang zh-CN 严格结果分类；仅 exact-anchor 是已核同点段。 @lang en Strict result categories; only exact-anchor verifies a same-point segment. */
export type CoordinateVerificationKind = "exact-anchor" | "nearest-anchor" | "unverified" | "ambiguous-source" | "unmapped" | "invalid" | "unsupported-version";
/** @lang zh-CN 一基生成坐标，仅代表段起点，不代表 token 或范围逐字符映射。 @lang en One-based generated segment anchor, not character-by-character mapping of a token or range. */
export interface CoordinateGeneratedPosition { line: number; column: number }
/** @lang zh-CN 不含源码正文或工件路径的严格查询结果。 @lang en Strict query result without source text or artifact paths. */
export interface VerifiedSourceAnchorResult {
  diagnostics: CoordinateProfileDiagnostic[];
  verification: { kind: CoordinateVerificationKind; generatedPosition?: CoordinateGeneratedPosition };
}
/** @lang zh-CN 对外只暴露状态与固定诊断；槽位、逻辑文本和段存于私有 WeakMap。 @lang en Exposes only status and fixed diagnostics; slots, logical text and segments live in a private WeakMap. */
export interface OrdinaryCoordinateProfileIndex { status: CoordinateProfileStatus; diagnostics: CoordinateProfileDiagnostic[] }
/** @lang zh-CN 宿主已授权提供的实际来源字节，以普通 map 原始槽位定位；不含路径或网络能力。 @lang en Actual source bytes authorized by the host, addressed by the ordinary map's raw slot; carries no path or network capability. */
export interface CoordinateSourceInput { sectionIndex: number | null; sourceIndex: number; bytes: Uint8Array }
/** @lang zh-CN 显式输入含两张地图实际字节和按槽位授权的来源字节；读取器不自行 I/O。 @lang en Explicit input contains actual bytes for both maps and per-slot authorized source bytes; the reader performs no I/O. */
export interface OrdinaryCoordinateProfileInput {
  profile: unknown;
  ordinaryMapBytes: Uint8Array;
  documentationMapBytes: Uint8Array;
  sourceInputs: CoordinateSourceInput[];
}
/** @lang zh-CN 查询一条文档引用与明确的普通来源槽位；所有坐标一基且列单位必填。 @lang en Queries one documentation reference and explicit ordinary source slot; all coordinates are one-based and the column unit is required. */
export interface VerifiedSourceAnchorQuery {
  entryId: string;
  sourceId: string;
  sectionIndex: number | null;
  sourceIndex: number;
  position: { line: number; column: number };
  columnUnit: "utf16-code-unit" | "unicode-code-point" | "byte";
}

interface DigestWire { algorithm: "sha256"; value: string }
interface SlotWire {
  sectionIndex: number | null; sourceIndex: number; sourceId: string;
  columnUnit: "utf16-code-unit" | "unicode-code-point" | "byte" | "unknown";
  sourceRevision: string; sourceByteDigest: DigestWire;
  sourceTextEncoding: "utf-8"; sourceTextTransform: "none";
  sourceTextDigest: DigestWire & { representation: "decoded-utf16-code-units" };
}
interface ProfileWire {
  contract: typeof ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT;
  contractVersion: typeof ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION;
  id: string;
  ordinaryMap: { sourceMapId: string; artifactId: string; digest: DigestWire };
  documentationMap: { id: string; contractVersion: "1.1.0"; digest: DigestWire };
  sourceSlots: SlotWire[];
  privacy: { sourcesContentPolicy: "none" };
}
interface AnchorSegment {
  sectionIndex: number | null; sourceIndex: number;
  originalLine: number; originalColumn: number;
  generatedLine: number; generatedColumn: number;
}
interface MapSegments {
  segments: AnchorSegment[];
  sourcesBySection: Map<string, readonly (string | null)[]>;
  generatedPoints: Set<string>;
  maxGenerated?: CoordinateGeneratedPosition;
}
interface VerifiedSlot { evidence: SlotWire; logicalText?: string }
interface InternalIndex { doc: DocSourceMapIndex; profile: ProfileWire; map: MapSegments; slots: Map<string, VerifiedSlot> }
/** @lang zh-CN 索引内部证据不通过公共对象属性泄漏。 @lang en Internal evidence is never exposed as a public index property. */
const internals = new WeakMap<OrdinaryCoordinateProfileIndex, InternalIndex>();

/** @lang zh-CN 构造固定诊断；调用者只传静态 code/message。 @lang en Constructs fixed diagnostics from static code/message only. */
function diagnostic(code: string, message: string): CoordinateProfileDiagnostic { return { code, message }; }
/** @lang zh-CN 同一 section 的原始槽位键，null 与数字零不可混同。 @lang en Raw-slot key within a section, keeping null distinct from section zero. */
function slotKey(sectionIndex: number | null, sourceIndex: number): string { return `${sectionIndex === null ? "flat" : `section:${sectionIndex}`}:${sourceIndex}`; }
/** @lang zh-CN 有限非负安全整数，适用于 section 偏移和槽位索引。 @lang en Finite nonnegative safe integer for section offsets and slot indices. */
function nonnegative(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
/** @lang zh-CN 有限正安全整数，适用于一基查询坐标。 @lang en Finite positive safe integer for one-based query coordinates. */
function positive(value: unknown): value is number { return nonnegative(value) && value > 0; }
/** @lang zh-CN 侧载身份使用比文档地图更窄的公开安全 token；查询来源 ID 必须与侧载槽位一致。 @lang en Sidecar identities use a narrower public-safe token than documentation-map IDs; a queried source ID must match its sidecar slot. */
function identity(value: unknown): value is string { return typeof value === "string" && value.length <= 512 && IDENTITY_PATTERN.test(value); }

/** @lang zh-CN 文档地图身份仅按当前 1.1.0 schema 的非空字符串边界核验；不把侧载 token 词法施加给条目或未签发的引用。 @lang en Check documentation-map IDs against the current 1.1.0 schema's nonempty-string boundary, without imposing sidecar token syntax on entries or unsigned references. */
function documentationIdentity(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** @lang zh-CN 普通/null 原型记录；反射异常由上层固定拒绝。 @lang en Plain/null-prototype record; callers convert reflection errors to fixed rejection. */
function record(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
/** @lang zh-CN 仅投影普通记录的自有数据属性，拒绝访问器和继承字段。 @lang en Projects only own data properties of a plain record, rejecting accessors and inherited fields. */
function ownData(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new Error("invalid input field");
  return descriptor.value;
}
/** @lang zh-CN 本版 wire 封闭已知键，避免未知字段偷偷携带源码。 @lang en Closed known wire keys prevent hidden source text in extensions. */
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Reflect.ownKeys(value);
  return actual.length === keys.length && actual.every((key) => typeof key === "string") && keys.every((key) => Object.hasOwn(value, key));
}
/** @lang zh-CN 校验规范 SHA-256 Base64 摘要形状；实际字节比对另行进行。 @lang en Checks canonical SHA-256 Base64 shape; actual-byte comparison happens separately. */
function validDigest(value: unknown): value is DigestWire {
  return record(value) && exactKeys(value, ["algorithm", "value"]) && value.algorithm === "sha256"
    && typeof value.value === "string" && DIGEST_PATTERN.test(value.value)
    && btoa(atob(value.value)) === value.value;
}
/** @lang zh-CN 对新侧载施加独立严格形状检查，不让旧宽读取器决定证据语义。 @lang en Applies an independent strict shape check rather than borrowing permissive legacy admission. */
function validProfile(value: unknown): value is ProfileWire {
  if (!record(value) || !exactKeys(value, ["contract", "contractVersion", "id", "ordinaryMap", "documentationMap", "sourceSlots", "privacy"])
    || value.contract !== ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT
    || value.contractVersion !== ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION || !identity(value.id)) return false;
  // <lang><zh-CN>三个子记录分别声明普通地图、文档地图与无正文策略，不允许其中一个身份替代另一个。</zh-CN><en>The three child records independently declare ordinary map, documentation map and body-free policy; none substitutes for another identity.</en></lang>
  const ordinary = value.ordinaryMap;
  const documentation = value.documentationMap;
  const privacy = value.privacy;
  if (!record(ordinary) || !exactKeys(ordinary, ["sourceMapId", "artifactId", "digest"])
    || !identity(ordinary.sourceMapId) || !identity(ordinary.artifactId) || !validDigest(ordinary.digest)
    || !record(documentation) || !exactKeys(documentation, ["id", "contractVersion", "digest"])
    || !identity(documentation.id) || documentation.contractVersion !== "1.1.0" || !validDigest(documentation.digest)
    || !record(privacy) || !exactKeys(privacy, ["sourcesContentPolicy"]) || privacy.sourcesContentPolicy !== "none"
    || !Array.isArray(value.sourceSlots) || value.sourceSlots.length > 4096) return false;
  // <lang><zh-CN>单位保持逐槽位闭集，键集合按 section/source 原序号排重，不用路径排重。</zh-CN><en>Units remain a per-slot closed set; the key set deduplicates raw section/source ordinals, never paths.</en></lang>
  const knownUnits = new Set(["utf16-code-unit", "unicode-code-point", "byte", "unknown"]);
  const keys = new Set<string>();
  for (const slot of value.sourceSlots) {
    if (!record(slot) || !exactKeys(slot, ["sectionIndex", "sourceIndex", "sourceId", "columnUnit", "sourceRevision", "sourceByteDigest", "sourceTextEncoding", "sourceTextTransform", "sourceTextDigest"])
      || !(slot.sectionIndex === null || nonnegative(slot.sectionIndex) && slot.sectionIndex <= 4095)
      || !nonnegative(slot.sourceIndex) || slot.sourceIndex > 4095
      || !identity(slot.sourceId) || !knownUnits.has(slot.columnUnit as string)
      || typeof slot.sourceRevision !== "string" || !REVISION_PATTERN.test(slot.sourceRevision)
      || !validDigest(slot.sourceByteDigest) || slot.sourceTextEncoding !== "utf-8" || slot.sourceTextTransform !== "none"
      || !record(slot.sourceTextDigest) || !exactKeys(slot.sourceTextDigest, ["representation", "algorithm", "value"])
      || slot.sourceTextDigest.representation !== "decoded-utf16-code-units"
      || !validDigest({ algorithm: slot.sourceTextDigest.algorithm, value: slot.sourceTextDigest.value })) return false;
    const key = slotKey(slot.sectionIndex, slot.sourceIndex);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}
/** @lang zh-CN SHA-256 的规范 Base64；在浏览器和 Node.js 共用 WebCrypto，不触发文件/网络读取。 @lang en Canonical Base64 SHA-256 via WebCrypto in browsers and Node.js, without file or network reads. */
async function sha256(bytes: Uint8Array): Promise<string> {
  // <lang><zh-CN>摘要只在显式提供的字节快照上计算；Base64 不编码原文。</zh-CN><en>Hash only explicitly supplied byte snapshots; Base64 represents the digest, not source content.</en></lang>
  const digestBytes = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)));
  let binary = "";
  for (const byte of digestBytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
/** @lang zh-CN 按实际 UTF-16 code unit 低字节优先编码，不增 BOM、替换代理项或正规化换行。 @lang en Encodes exact UTF-16 code units little-endian without BOM, surrogate replacement or newline normalization. */
function utf16LittleEndian(value: string): Uint8Array {
  // <lang><zh-CN>两个字节保留每个 JS UTF-16 code unit 的原值，包括代理项。</zh-CN><en>Two bytes preserve each JS UTF-16 code unit exactly, including surrogate units.</en></lang>
  const bytes = new Uint8Array(value.length * 2);
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    bytes[index * 2] = unit & 0xff;
    bytes[index * 2 + 1] = unit >>> 8;
  }
  return bytes;
}
/** @lang zh-CN 严格 UTF-8 解码保留初始 BOM 与 CRLF；编译器若另作转换，本版返回未核。 @lang en Fatal UTF-8 decoding retains an initial BOM and CRLF; compiler transformations remain unverified in this version. */
function decodeUtf8(bytes: Uint8Array): string { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
/** @lang zh-CN 复制受限实际字节，阻止调用方在异步摘要中途改动它们。 @lang en Clones bounded actual bytes so callers cannot mutate them during asynchronous hashing. */
function copyBytes(value: unknown): Uint8Array {
  const byteLengthGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "byteLength")?.get;
  if (!(value instanceof Uint8Array) || !byteLengthGetter || byteLengthGetter.call(value) > ARTIFACT_LIMIT) throw new Error("invalid bytes");
  return new Uint8Array(value);
}
/**
 * @lang zh-CN 在 JSON.parse 丢弃同名成员之前扫描有界原始 JSON。每个对象独立维护解码后键集合，`\u` 转义碰撞同样拒绝；超深/非法 JSON 最终固定拒绝。
 * @lang en Scans bounded raw JSON before JSON.parse loses duplicate members. Each object tracks decoded keys, including `\u`-escape collisions; excessive nesting or malformed JSON is rejected with a fixed result.
 */
function parseUniqueJson(text: string, byteLimit: number): unknown {
  if (new TextEncoder().encode(text).byteLength > byteLimit) throw new Error("JSON too large");
  // <lang><zh-CN>游标只在本地原始 JSON 文本移动，递归深度与总字节受限。</zh-CN><en>The cursor walks local raw JSON only; recursion depth and total bytes are bounded.</en></lang>
  let cursor = 0;
  const skipSpace = () => { while (/\s/.test(text[cursor] ?? "") && cursor < text.length) cursor += 1; };
  const parseString = (): string => {
    if (text[cursor] !== '"') throw new Error("invalid string");
    const start = cursor;
    cursor += 1;
    while (cursor < text.length) {
      const character = text[cursor++];
      if (character === "\\") { cursor += 1; continue; }
      if (character === '"') return JSON.parse(text.slice(start, cursor)) as string;
    }
    throw new Error("unterminated string");
  };
  const parseValue = (depth: number): void => {
    if (depth > 128) throw new Error("profile too deep");
    skipSpace();
    const character = text[cursor];
    if (character === "{") {
      cursor += 1;
      // <lang><zh-CN>按解码后的键判重，\u0069d 与 id 视为同一成员。</zh-CN><en>Deduplicate decoded names, so \u0069d and id refer to the same member.</en></lang>
      const keys = new Set<string>();
      skipSpace();
      if (text[cursor] === "}") { cursor += 1; return; }
      while (cursor < text.length) {
        skipSpace();
        const key = parseString();
        if (keys.has(key)) throw new Error("duplicate member");
        keys.add(key);
        skipSpace();
        if (text[cursor++] !== ":") throw new Error("invalid object");
        parseValue(depth + 1);
        skipSpace();
        const separator = text[cursor++];
        if (separator === "}") return;
        if (separator !== ",") throw new Error("invalid object");
      }
      throw new Error("unterminated object");
    }
    if (character === "[") {
      cursor += 1;
      skipSpace();
      if (text[cursor] === "]") { cursor += 1; return; }
      while (cursor < text.length) {
        parseValue(depth + 1);
        skipSpace();
        const separator = text[cursor++];
        if (separator === "]") return;
        if (separator !== ",") throw new Error("invalid array");
      }
      throw new Error("unterminated array");
    }
    if (character === '"') { parseString(); return; }
    const start = cursor;
    while (cursor < text.length && !/[\s,}\]]/.test(text[cursor]!)) cursor += 1;
    if (start === cursor) throw new Error("invalid primitive");
    JSON.parse(text.slice(start, cursor));
  };
  parseValue(0);
  skipSpace();
  if (cursor !== text.length) throw new Error("trailing content");
  return JSON.parse(text);
}
/** @lang zh-CN 解码普通单图，保留 sources 原始槽位及段原始行列；不采用解析路径或 GLB 反查。 @lang en Decodes one ordinary map retaining raw source slots and segment original positions without resolved paths or GLB lookup. */
function collectFlatMap(value: unknown, sectionIndex: number | null, offset: { line: number; column: number }, output: MapSegments): void {
  if (record(value) && Object.hasOwn(value, "sourcesContent")
    && (!Array.isArray(value.sourcesContent) || value.sourcesContent.some((content) => content !== null))) throw new Error("embedded source content");
  // <lang><zh-CN>复用旧解析器的 VLQ/段结构校验，但新索引保留未过滤的原始来源槽位。</zh-CN><en>Reuse the old parser's VLQ/segment structure checks, while retaining unfiltered raw source slots in the new index.</en></lang>
  const trace: TraceMap = createBodyFreeOrdinaryTraceMap(value);
  output.sourcesBySection.set(sectionIndex === null ? "flat" : `section:${sectionIndex}`, [...trace.sources]);
  const lines = decodedMappings(trace);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (const segment of lines[lineIndex] ?? []) {
      // <lang><zh-CN>生成点先于来源检查，故无来源段也能阻止重叠与同点误报。</zh-CN><en>Check the generated point before source fields, so unmapped segments also block overlap and false exact anchors.</en></lang>
      const generatedLine = offset.line + lineIndex + 1;
      const generatedColumn = segment[0]! + (lineIndex === 0 ? offset.column : 0) + 1;
      if (!positive(generatedLine) || !positive(generatedColumn) || output.generatedPoints.size >= SEGMENT_LIMIT) throw new Error("invalid generated coordinate");
      const generatedKey = `${generatedLine}:${generatedColumn}`;
      if (output.generatedPoints.has(generatedKey)) throw new Error("ambiguous generated coordinate");
      output.generatedPoints.add(generatedKey);
      const maximum = output.maxGenerated;
      if (!maximum || generatedLine > maximum.line || generatedLine === maximum.line && generatedColumn > maximum.column) {
        output.maxGenerated = { line: generatedLine, column: generatedColumn };
      }
      // <lang><zh-CN>单字段段到此为止，仅作为普通生成边界，不会进入源码锚点列表。</zh-CN><en>A one-field segment stops here as a generated-only boundary and never enters the source-anchor list.</en></lang>
      if (segment.length === 1) continue;
      const sourceIndex = segment[1]!;
      const originalLine = segment[2]! + 1;
      const originalColumn = segment[3]! + 1;
      if (!positive(originalLine) || !positive(originalColumn)) throw new Error("invalid original coordinate");
      output.segments.push({ sectionIndex, sourceIndex, originalLine, originalColumn, generatedLine, generatedColumn });
    }
  }
}
/** @lang zh-CN 只支持本地非嵌套 section；每段保留原 section/slot，不从展平路径倒推。 @lang en Supports local nonnested sections only, retaining original section/slot per segment instead of reversing flattened paths. */
function collectOrdinaryMap(value: unknown): MapSegments {
  if (!record(value) || value.version !== 3 || Object.hasOwn(value, "url")) throw new Error("invalid map");
  if (Object.hasOwn(value, "sourcesContent")
    && (!Array.isArray(value.sourcesContent) || value.sourcesContent.some((content) => content !== null))) throw new Error("embedded source content");
  // <lang><zh-CN>段与逐 section 的原始 sources 表分开保存；后者保留 null/重复项。</zh-CN><en>Segments and each section's raw sources table are separate; the table retains null and duplicate slots.</en></lang>
  const output: MapSegments = { segments: [], sourcesBySection: new Map(), generatedPoints: new Set() };
  if (!Object.hasOwn(value, "sections")) {
    collectFlatMap(value, null, { line: 0, column: 0 }, output);
    return output;
  }
  if (!Array.isArray(value.sections) || value.sections.length === 0 || value.sections.length > 4096
    || Object.hasOwn(value, "mappings") || Object.hasOwn(value, "sources")) throw new Error("invalid sections");
  // <lang><zh-CN>前一偏移建立严格递增顺序，每段另核不越过下一 section 起点。</zh-CN><en>The preceding offset establishes strict order; each segment is separately checked against the next section start.</en></lang>
  let previous: { line: number; column: number } | undefined;
  for (let sectionIndex = 0; sectionIndex < value.sections.length; sectionIndex += 1) {
    const section = value.sections[sectionIndex];
    if (!record(section) || !exactKeys(section, ["offset", "map"]) || !record(section.offset)
      || !exactKeys(section.offset, ["line", "column"]) || !nonnegative(section.offset.line) || !nonnegative(section.offset.column)
      || !record(section.map) || Object.hasOwn(section.map, "sections") || Object.hasOwn(section.map, "url")) throw new Error("unsupported section");
    const offset = { line: section.offset.line, column: section.offset.column };
    if (previous && (offset.line < previous.line || offset.line === previous.line && offset.column <= previous.column)) throw new Error("unordered sections");
    // <lang><zh-CN>已累计生成点的最大位置同时覆盖映射和无来源段；O(1) 检查前段是否跨越当前 section 起点。</zh-CN><en>The maximum of all emitted points covers mapped and unmapped segments; check prior-section overlap in O(1).</en></lang>
    const maximum = output.maxGenerated;
    if (maximum && (maximum.line - 1 > offset.line || maximum.line - 1 === offset.line && maximum.column - 1 >= offset.column)) throw new Error("overlapping sections");
    collectFlatMap(section.map, sectionIndex, offset, output);
    previous = offset;
  }
  return output;
}
/** @lang zh-CN 新证据只接受相对且无回退/URI 的声明路径；实际路径不参与槽位匹配。 @lang en Strict evidence admits safe relative declaration paths; path text is never used as slot identity. */
function safeRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value !== "." && value !== ".."
    && !/^(?:[A-Za-z]:|[/\\]|[A-Za-z][A-Za-z0-9+.-]*:)/.test(value)
    && !value.split(/[/\\]/).includes("..");
}
/** @lang zh-CN 正版文档引用允许的来源类别。 @lang en Provenance categories admitted by the current documentation reference. */
const RANGE_SOURCES = new Set(["source-map", "parser", "compiler", "adapter", "manual", "heuristic", "unresolved"]);
/** @lang zh-CN 文档引用置信度的闭集。 @lang en Closed documentation-reference confidence set. */
const CONFIDENCES = new Set(["high", "medium", "low", "none"]);
/** @lang zh-CN 文档范围列单位的闭集；unknown 可存证但不能给精确锚点。 @lang en Closed documentation-range unit set; unknown can be recorded but not verify an exact anchor. */
const COLUMN_UNITS = new Set(["utf16-code-unit", "unicode-code-point", "byte", "unknown"]);
/**
 * @lang zh-CN 复核严格同点所消费的当前文档 map 子集。普通 owner 的 available 不是完整 JSON Schema 通过；本检查拒绝会造成同点误报的枚举、范围、身份、隐私和路径缺口。其余非锚点扩展仍由 owner 边界管理。
 * @lang en Rechecks the current documentation-map subset consumed by strict anchors. Legacy owner available is not a full JSON Schema pass; this gate rejects enums, ranges, identities, privacy and paths that could create false exact anchors. Other non-anchor extensions remain under the owner boundary.
 */
function validAnchorDocumentation(value: Record<string, unknown>, profile: ProfileWire): boolean {
  if (value.contract !== "doc-source-map" || value.contractVersion !== "1.1.0" || value.id !== profile.documentationMap.id
    || !record(value.privacy) || value.privacy.sourcesContentPolicy !== "none"
    || !Array.isArray(value.sourceMaps) || !Array.isArray(value.artifacts) || !Array.isArray(value.sources)
    || !Array.isArray(value.entries)) return false;
  // <lang><zh-CN>两项声明必须在同一文档地图中各唯一；普通 map 的 mapsFrom 指向生成工件。</zh-CN><en>Both declarations must be unique in the same documentation map; the ordinary map's mapsFrom points at the generated artifact.</en></lang>
  const selectedMaps = value.sourceMaps.filter((node) => record(node) && node.id === profile.ordinaryMap.sourceMapId);
  const selectedArtifacts = value.artifacts.filter((node) => record(node) && node.id === profile.ordinaryMap.artifactId);
  if (selectedMaps.length !== 1 || selectedArtifacts.length !== 1 || !record(selectedMaps[0]) || !record(selectedArtifacts[0])) return false;
  const selectedMap = selectedMaps[0];
  if (selectedMap.kind !== "ordinary-source-map" || !safeRelativePath(selectedMap.path)
    || selectedMap.mapsFrom !== profile.ordinaryMap.artifactId
    || selectedMap.sourcesContentPolicy !== undefined && selectedMap.sourcesContentPolicy !== "none"
    || !Array.isArray(selectedMap.mapsTo) || !selectedMap.mapsTo.every(documentationIdentity)
    || !safeRelativePath(selectedArtifacts[0].path)) return false;
  for (const slot of profile.sourceSlots) {
    // <lang><zh-CN>sourceId 只绑定已声明来源，禁止将同名普通来源路径推作证明。</zh-CN><en>sourceId binds only a declared source; an ordinary path string is never inferred as proof.</en></lang>
    const declarations = value.sources.filter((node) => record(node) && node.id === slot.sourceId);
    if (declarations.length !== 1 || !record(declarations[0]) || !safeRelativePath(declarations[0].path)
      || declarations[0].sourcesContentPolicy !== undefined && declarations[0].sourcesContentPolicy !== "none"
      || Object.hasOwn(declarations[0], "sourcesContent")
      || !selectedMap.mapsTo.includes(slot.sourceId)) return false;
  }
  for (const entry of value.entries) {
    // <lang><zh-CN>每个可被查询的引用先核受消费的枚举/范围；宽 owner 索引的 available 不足以证明该细节。</zh-CN><en>Validate consumed enums/ranges on every queryable reference; the permissive owner index's available is insufficient for these details.</en></lang>
    if (!record(entry) || !documentationIdentity(entry.id) || !Array.isArray(entry.sourceRefs) || !Array.isArray(entry.artifactRefs)) return false;
    for (const sourceRef of entry.sourceRefs) {
      if (!record(sourceRef) || !documentationIdentity(sourceRef.sourceId) || !RANGE_SOURCES.has(sourceRef.rangeSource as string)
        || !CONFIDENCES.has(sourceRef.confidence as string)
        || sourceRef.rangeSource === "unresolved" && sourceRef.confidence !== "none") return false;
      if (!Object.hasOwn(sourceRef, "range")) {
        if (Object.hasOwn(sourceRef, "rangeConvention")) return false;
        continue;
      }
      const range = sourceRef.range;
      const convention = sourceRef.rangeConvention;
      if (!record(range) || !record(range.start) || !record(range.end) || !record(convention)
        || !positive(range.start.line) || !positive(range.end.line)
        || !["inclusive", "exclusive", "unknown"].includes(convention.endBoundary as string)
        || !COLUMN_UNITS.has(convention.columnUnit as string)
        || range.start.line > range.end.line) return false;
      const startColumn = range.start.column;
      const endColumn = range.end.column;
      if (startColumn !== undefined && !positive(startColumn) || endColumn !== undefined && !positive(endColumn)
        || convention.columnUnit !== "unknown" && (!positive(startColumn) || !positive(endColumn))
        || range.start.line === range.end.line && positive(startColumn) && positive(endColumn) && startColumn > endColumn) return false;
    }
    for (const artifactRef of entry.artifactRefs) {
      if (!record(artifactRef) || !documentationIdentity(artifactRef.artifactId) || !RANGE_SOURCES.has(artifactRef.rangeSource as string)
        || !CONFIDENCES.has(artifactRef.confidence as string)
        || artifactRef.rangeSource === "unresolved" && artifactRef.confidence !== "none") return false;
    }
  }
  return true;
}
/** @lang zh-CN 创建固定失败索引，不回显异常文本或输入。 @lang en Creates a fixed failure index without reflecting exception text or input. */
function failed(status: CoordinateProfileStatus, code: string, message: string): OrdinaryCoordinateProfileIndex {
  return Object.freeze({ status, diagnostics: Object.freeze([diagnostic(code, message)]) as unknown as CoordinateProfileDiagnostic[] });
}

/**
 * @lang zh-CN 从明确提供的侧载和实际地图/源码字节建立独立严格索引；先核两张地图摘要、文档身份和普通 section/slot，再逐授权来源核原始字节及无转换 UTF-8 逻辑文本。缺少授权来源仅使该槽未核。所有异常收敛为固定诊断，不读取文件或 URL；地图中非空 sourcesContent 被拒绝且不保留正文。
 * @lang en Builds an independent strict index from explicit sidecar and actual map/source bytes. It verifies both map digests, documentation identity and ordinary section/slot before checking raw bytes and untransformed UTF-8 logical text for each authorized source. Missing authorized source leaves only that slot unverified. All exceptions become fixed diagnostics; no file or URL is read, and nonempty sourcesContent is rejected without retaining its body.
 * @param input <lang><zh-CN>包含侧载对象或 JSON 字符串、两张实际地图字节与按槽位授权的实际源码字节；每项上限见本版常量。</zh-CN><en>Sidecar object or JSON text, actual bytes for both maps and authorized actual source bytes by slot; this version applies bounded sizes.</en></lang>
 * @returns <lang><zh-CN>Promise 中的无正文索引；available 仅代表地图和侧载有效，逐槽核验须在查询中检查。</zh-CN><en>Promise of a body-free index; available means valid maps and sidecar, while queries still check per-slot verification.</en></lang>
 */
export async function createOrdinaryCoordinateProfileIndex(input: OrdinaryCoordinateProfileInput): Promise<OrdinaryCoordinateProfileIndex> {
  try {
    if (!record(input)) return failed("invalid", "COORDINATE_PROFILE_INPUT_INVALID", "Coordinate evidence input is invalid.");
    const sourceInputsValue = ownData(input, "sourceInputs");
    if (!Array.isArray(sourceInputsValue) || sourceInputsValue.length > 4096 || Object.getPrototypeOf(sourceInputsValue) !== Array.prototype
      || Object.hasOwn(sourceInputsValue, Symbol.iterator)) return failed("invalid", "COORDINATE_PROFILE_INPUT_INVALID", "Coordinate evidence input is invalid.");
    const ordinaryBytes = copyBytes(ownData(input, "ordinaryMapBytes"));
    const documentationBytes = copyBytes(ownData(input, "documentationMapBytes"));
    // <lang><zh-CN>授权源码的槽位与字节在首次异步摘要前一次性复制，后续不重读宿主数组/访问器。</zh-CN><en>Snapshot authorized source slots and bytes before the first asynchronous digest; never reread the host array or accessors.</en></lang>
    const supplied = new Map<string, Uint8Array>();
    let sourceBytesTotal = 0;
    for (let inputIndex = 0; inputIndex < sourceInputsValue.length; inputIndex += 1) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(sourceInputsValue, String(inputIndex));
      if (!itemDescriptor || !Object.hasOwn(itemDescriptor, "value") || !record(itemDescriptor.value)) throw new Error("invalid source input");
      const item = itemDescriptor.value;
      const sectionIndex = ownData(item, "sectionIndex");
      const sourceIndex = ownData(item, "sourceIndex");
      if (!(sectionIndex === null || nonnegative(sectionIndex)) || !nonnegative(sourceIndex)) throw new Error("invalid source input");
      const key = slotKey(sectionIndex, sourceIndex);
      if (supplied.has(key)) throw new Error("duplicate source input");
      const copied = copyBytes(ownData(item, "bytes"));
      sourceBytesTotal += copied.byteLength;
      if (sourceBytesTotal > SOURCE_INPUT_TOTAL_LIMIT) throw new Error("too many source bytes");
      supplied.set(key, copied);
    }
    // <lang><zh-CN>侧载对象经普通 JSON 图检查后复制，原始文本先做重复成员扫描。</zh-CN><en>Clone sidecar objects only after plain-JSON preflight; scan raw text for duplicate members first.</en></lang>
    const rawProfile = ownData(input, "profile");
    const profileValue: unknown = typeof rawProfile === "string" ? parseUniqueJson(rawProfile, PROFILE_LIMIT) : rawProfile;
    if (!isDocSourceMapJsonDataGraph(profileValue) || new TextEncoder().encode(JSON.stringify(profileValue)).byteLength > PROFILE_LIMIT) return failed("invalid", "COORDINATE_PROFILE_INVALID", "Coordinate profile is invalid.");
    const profile = structuredClone(profileValue);
    if (record(profile) && profile.contract === ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT && profile.contractVersion !== ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION) {
      return failed("unsupported-version", "COORDINATE_PROFILE_VERSION_UNSUPPORTED", "Coordinate profile version is unsupported.");
    }
    if (!validProfile(profile)) return failed("invalid", "COORDINATE_PROFILE_INVALID", "Coordinate profile is invalid.");
    // <lang><zh-CN>两张地图都以本次消费的实际字节核摘要，声明之间互抄摘要不能通过。</zh-CN><en>Hash the actual bytes consumed for both maps; copied claims alone cannot pass.</en></lang>
    if (await sha256(ordinaryBytes) !== profile.ordinaryMap.digest.value || await sha256(documentationBytes) !== profile.documentationMap.digest.value) {
      return failed("invalid", "COORDINATE_PROFILE_MAP_DIGEST_MISMATCH", "Actual map bytes do not match coordinate evidence.");
    }
    const ordinaryValue: unknown = parseUniqueJson(decodeUtf8(ordinaryBytes), ARTIFACT_LIMIT);
    const documentationValue: unknown = parseUniqueJson(decodeUtf8(documentationBytes), ARTIFACT_LIMIT);
    if (!isDocSourceMapJsonDataGraph(ordinaryValue) || !isDocSourceMapJsonDataGraph(documentationValue) || !record(documentationValue)) {
      return failed("invalid", "COORDINATE_PROFILE_MAP_INVALID", "Coordinate map input is invalid.");
    }
    const doc = createDocSourceMapIndex(documentationValue);
    if (doc.status !== "available" || !validAnchorDocumentation(documentationValue, profile)) {
      return failed("invalid", "COORDINATE_PROFILE_DOCUMENTATION_MISMATCH", "Documentation map identity is invalid.");
    }
    const sourceMaps = Array.isArray(documentationValue.sourceMaps) ? documentationValue.sourceMaps : [];
    const artifacts = Array.isArray(documentationValue.artifacts) ? documentationValue.artifacts : [];
    const sources = Array.isArray(documentationValue.sources) ? documentationValue.sources : [];
    const mapLinks = sourceMaps.filter((node) => record(node) && node.id === profile.ordinaryMap.sourceMapId);
    if (mapLinks.length !== 1 || !record(mapLinks[0]) || mapLinks[0].mapsFrom !== profile.ordinaryMap.artifactId
      || artifacts.filter((node) => record(node) && node.id === profile.ordinaryMap.artifactId).length !== 1
      || !Array.isArray(mapLinks[0].mapsTo)) {
      return failed("invalid", "COORDINATE_PROFILE_MAP_LINK_MISMATCH", "Ordinary map declaration does not match coordinate evidence.");
    }
    const map = collectOrdinaryMap(ordinaryValue);
    // <lang><zh-CN>逐槽位复核授权字节与逻辑文本；未提供源码时保留有效索引但该槽未核。</zh-CN><en>Verify authorized bytes and logical text per slot; absent source bytes leave that slot unverified in an otherwise valid index.</en></lang>
    const slots = new Map<string, VerifiedSlot>();
    for (const evidence of profile.sourceSlots) {
      const sectionKey = evidence.sectionIndex === null ? "flat" : `section:${evidence.sectionIndex}`;
      const originalSources = map.sourcesBySection.get(sectionKey);
      const declaredSources = sources.filter((node) => record(node) && node.id === evidence.sourceId);
      if (!originalSources || evidence.sourceIndex >= originalSources.length || typeof originalSources[evidence.sourceIndex] !== "string"
        || !originalSources[evidence.sourceIndex]!.trim()
        || declaredSources.length !== 1 || !mapLinks[0].mapsTo.includes(evidence.sourceId)) {
        return failed("invalid", "COORDINATE_PROFILE_SLOT_MISMATCH", "Source slot evidence does not match the maps.");
      }
      const key = slotKey(evidence.sectionIndex, evidence.sourceIndex);
      const bytes = supplied.get(key);
      const slot: VerifiedSlot = { evidence };
      if (bytes && await sha256(bytes) === evidence.sourceByteDigest.value) {
        // <lang><zh-CN>本版仅准无转换 UTF-8；BOM/CRLF 按实际解码文本保留，两个摘要都通过才持有私有逻辑文本。</zh-CN><en>This version admits only untransformed UTF-8; preserve BOM/CRLF, retaining private logical text only after both digests match.</en></lang>
        try {
          const logicalText = decodeUtf8(bytes);
          if (await sha256(utf16LittleEndian(logicalText)) === evidence.sourceTextDigest.value) slot.logicalText = logicalText;
        } catch { /* <lang><zh-CN>无效 UTF-8 仅令该槽未核。</zh-CN><en>Invalid UTF-8 leaves this slot unverified.</en></lang> */ }
      }
      slots.set(key, slot);
    }
    for (const key of supplied.keys()) {
      if (!slots.has(key)) return failed("invalid", "COORDINATE_PROFILE_SOURCE_INPUT_INVALID", "Authorized source slot is undeclared.");
    }
    const index: OrdinaryCoordinateProfileIndex = Object.freeze({ status: "available", diagnostics: Object.freeze([]) as unknown as CoordinateProfileDiagnostic[] });
    internals.set(index, { doc, profile, map, slots });
    return index;
  } catch {
    return failed("invalid", "COORDINATE_PROFILE_INPUT_INVALID", "Coordinate evidence input is invalid.");
  }
}

/** @lang zh-CN 给指定单位的一基列计算行内最大锚位置；仅按已核逻辑文本，不能证明生成范围。 @lang en Computes the last possible one-based line anchor for a unit using verified logical text only, without claiming a generated range. */
function validSourcePosition(text: string, position: { line: number; column: number }, unit: VerifiedSourceAnchorQuery["columnUnit"]): boolean {
  const lines = text.split("\n");
  const line = lines[position.line - 1];
  if (line === undefined) return false;
  const width = unit === "utf16-code-unit" ? line.length : unit === "unicode-code-point" ? Array.from(line).length : new TextEncoder().encode(line).length;
  return position.column <= width + 1;
}
/** @lang zh-CN 逐引用比较一基区间，unknown 端点/单位永远不算命中。 @lang en Compares one-based per-reference ranges; unknown endpoint/unit can never match. */
function withinReference(link: DocSourceMapIndex["entries"][number]["sourceLinks"][number], position: VerifiedSourceAnchorQuery["position"], unit: VerifiedSourceAnchorQuery["columnUnit"]): boolean {
  const range = link.range;
  const convention = link.rangeConvention;
  if (!range || !convention || convention.columnUnit !== unit
    || !["inclusive", "exclusive"].includes(convention.endBoundary)
    || !positive(range.start.line) || !positive(range.end.line) || !positive(range.start.column) || !positive(range.end.column)
    || range.start.line > range.end.line || range.start.line === range.end.line && range.start.column > range.end.column) return false;
  const start = position.line > range.start.line || position.line === range.start.line && position.column >= range.start.column;
  const end = position.line < range.end.line || position.line === range.end.line
    && (convention.endBoundary === "inclusive" ? position.column <= range.end.column : position.column < range.end.column);
  return start && end;
}
/** @lang zh-CN 查询固定结果，不回显调用方字段。 @lang en Produces fixed query output without echoing caller fields. */
function result(kind: CoordinateVerificationKind, code: string, message: string, generatedPosition?: CoordinateGeneratedPosition): VerifiedSourceAnchorResult {
  return { diagnostics: [diagnostic(code, message)], verification: { kind, ...(generatedPosition ? { generatedPosition } : {}) } };
}

/**
 * @lang zh-CN 对明确 section/原始槽位与文档条目查询已核同点段。只有两图实际字节、来源字节及逻辑文本、同一已知列单位、文档范围和请求点处真实映射段全部满足时返回 exact-anchor；GLB 近邻只返回 nearest-anchor。
 * @lang en Queries a verified same-point segment for an explicit section/raw slot and documentation entry. exact-anchor requires actual bytes of both maps, verified source bytes/logical text, one matching known column unit, a matching documentation range, and an actual segment at the requested point. A GLB predecessor yields nearest-anchor only.
 * @param index <lang><zh-CN>由严格创建函数产生且未篡改的索引。</zh-CN><en>Index produced by the strict creator and not tampered with.</en></lang>
 * @param query <lang><zh-CN>一基位置和明确槽位；entryId 遵守文档地图的非空身份，sourceId 遵守已签发侧载 token，不按同名路径猜测来源。</zh-CN><en>One-based position and explicit slot; entryId follows the documentation map's nonempty ID boundary, sourceId follows the signed sidecar token, and duplicate paths never imply source identity.</en></lang>
 * @returns <lang><zh-CN>无正文、无私有路径的固定机器状态；exact-anchor 仅承诺段起点。</zh-CN><en>Fixed machine state without body or private path; exact-anchor asserts a segment start only.</en></lang>
 */
export function queryVerifiedSourceAnchor(index: OrdinaryCoordinateProfileIndex, query: VerifiedSourceAnchorQuery): VerifiedSourceAnchorResult {
  try {
    if (!record(query) || !isDocSourceMapJsonDataGraph(query) || !documentationIdentity(query.entryId) || !identity(query.sourceId)
      || !(query.sectionIndex === null || nonnegative(query.sectionIndex)) || !nonnegative(query.sourceIndex)
      || !record(query.position) || !positive(query.position.line) || !positive(query.position.column)
      || !["utf16-code-unit", "unicode-code-point", "byte"].includes(query.columnUnit)) {
      return result("invalid", "COORDINATE_QUERY_INVALID", "Strict coordinate query is invalid.");
    }
    if (!record(index)) return result("invalid", "COORDINATE_PROFILE_INVALID", "Coordinate profile is invalid.");
    const indexStatus = ownData(index, "status");
    if (indexStatus === "invalid") return result("invalid", "COORDINATE_PROFILE_INVALID", "Coordinate profile is invalid.");
    if (indexStatus === "unsupported-version") return result("unsupported-version", "COORDINATE_PROFILE_VERSION_UNSUPPORTED", "Coordinate profile version is unsupported.");
    const internal = internals.get(index);
    if (!internal) return result("invalid", "COORDINATE_PROFILE_INVALID", "Coordinate profile index is invalid.");
    // <lang><zh-CN>显式槽位是证明键；路径一致、扩展名或另一槽的单位都不参与。</zh-CN><en>The explicit raw slot is the proof key; matching paths, extensions or another slot's unit do not participate.</en></lang>
    const slot = internal.slots.get(slotKey(query.sectionIndex, query.sourceIndex));
    if (!slot || slot.evidence.sourceId !== query.sourceId || !slot.logicalText || slot.evidence.columnUnit === "unknown"
      || slot.evidence.columnUnit !== query.columnUnit) return result("unverified", "COORDINATE_SOURCE_UNVERIFIED", "Source slot or column unit is unverified.");
    if (!validSourcePosition(slot.logicalText, query.position, query.columnUnit)) return result("unverified", "COORDINATE_POSITION_UNVERIFIED", "Requested source position is not present in verified source text.");
    // <lang><zh-CN>文档条目、生成工件和唯一来源范围必须在同一条目收敛。</zh-CN><en>Documentation entry, generated artifact and unique source range must converge on the same entry.</en></lang>
    const entries = internal.doc.entries.filter((entry) => entry.id === query.entryId);
    if (entries.length !== 1) return result("unverified", "COORDINATE_DOCUMENTATION_UNVERIFIED", "Documentation entry is not uniquely verified.");
    const artifactLinks = entries[0]!.artifactLinks.filter((link) => link.artifactId === internal.profile.ordinaryMap.artifactId
      && link.confidence !== "none" && link.rangeSource !== "unresolved");
    if (artifactLinks.length !== 1) return result("unverified", "COORDINATE_ARTIFACT_UNVERIFIED", "Documentation entry does not uniquely link the generated artifact.");
    const links = entries[0]!.sourceLinks.filter((link) => link.sourceId === query.sourceId && link.confidence !== "none" && link.rangeSource !== "unresolved"
      && withinReference(link, query.position, query.columnUnit));
    if (links.length !== 1) {
      return result("unverified", "COORDINATE_DOCUMENTATION_UNVERIFIED", "Documentation source range does not verify the point.");
    }
    // <lang><zh-CN>只在本次唯一文档范围内寻找真实段；范围外的同源近邻不能借作该条目的导航锚点。</zh-CN><en>Search actual segments only inside this unique documentation range; an earlier same-source point outside the range cannot serve as this entry's navigation anchor.</en></lang>
    const segments = internal.map.segments.filter((segment) => segment.sectionIndex === query.sectionIndex && segment.sourceIndex === query.sourceIndex
      && segment.originalLine === query.position.line
      && withinReference(links[0]!, { line: segment.originalLine, column: segment.originalColumn }, query.columnUnit));
    const exact = segments.filter((segment) => segment.originalColumn === query.position.column);
    if (exact.length > 0) {
      const distinctGenerated = new Set(exact.map((segment) => `${segment.generatedLine}:${segment.generatedColumn}`));
      if (distinctGenerated.size !== 1) return result("ambiguous-source", "COORDINATE_ANCHOR_AMBIGUOUS", "Multiple generated anchors match the same source point.");
      const anchor = exact[0]!;
      return result("exact-anchor", "COORDINATE_EXACT_ANCHOR", "Actual source-map segment and documentation range verify the same source point.", { line: anchor.generatedLine, column: anchor.generatedColumn });
    }
    const preceding = segments.filter((segment) => segment.originalColumn < query.position.column).sort((a, b) => b.originalColumn - a.originalColumn);
    if (preceding.length > 0) {
      const nearest = preceding[0]!;
      const nearestGenerated = new Set(preceding.filter((segment) => segment.originalColumn === nearest.originalColumn)
        .map((segment) => `${segment.generatedLine}:${segment.generatedColumn}`));
      if (nearestGenerated.size !== 1) return result("ambiguous-source", "COORDINATE_ANCHOR_AMBIGUOUS", "Multiple nearest generated anchors share the same source point.");
      return result("nearest-anchor", "COORDINATE_NEAREST_ANCHOR", "Only a preceding source-map navigation anchor is available.", { line: nearest.generatedLine, column: nearest.generatedColumn });
    }
    return result("unmapped", "COORDINATE_UNMAPPED", "No source-map segment maps the requested source point.");
  } catch {
    return result("invalid", "COORDINATE_QUERY_INVALID", "Strict coordinate query is invalid.");
  }
}
