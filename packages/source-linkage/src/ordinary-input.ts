/**
 * @file
 * @lang zh-CN 普通位置map的内部元数据投影；复制位置与名称，不读取或保留源码正文和未知扩展。
 * @lang en Internal metadata projection for ordinary position maps; copies positions/names without reading or retaining source bodies or unknown extensions.
 */
import { decodedMappings, TraceMap, type SourceMapInput } from "@jridgewell/trace-mapping";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";

/**
 * @lang zh-CN 从四类既有输入建立独立、无正文的TraceMap；不调用输入访问器或toJSON。
 * @lang en Creates an independent body-free TraceMap from the four existing input forms, without calling input accessors or toJSON.
 * @param value <lang><zh-CN>JSON字符串、编码/解码对象或已安装库的TraceMap实例。</zh-CN><en>JSON string, encoded/decoded object or TraceMap instance from the installed library.</en></lang>
 * @param mapPath <lang><zh-CN>新对象的可选解析基准；实例沿用自身已解析路径。</zh-CN><en>Optional resolution base for new objects; instances retain their resolved paths.</en></lang>
 * @returns <lang><zh-CN>只含已验证映射元数据的独立实例；分段索引map不在既有支持范围。</zh-CN><en>Independent instance containing validated mapping metadata only; sectioned maps remain outside existing support.</en></lang>
 * @throws <lang><zh-CN>输入/库处理失败；调用者必须转为固定诊断，不回显异常。</zh-CN><en>Input/library processing failure; callers must convert it to a fixed diagnostic without reflecting errors.</en></lang>
 */
export function createBodyFreeOrdinaryTraceMap(value: unknown, mapPath?: string): TraceMap {
  // <lang><zh-CN>字符串先交标准JSON解析器；反射只检查类型与描述符，Proxy副作用不是沙箱保证。</zh-CN><en>Strings use the standard JSON parser; reflection checks types/descriptors only, without sandboxing proxy side effects.</en></lang>
  const input: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (input === null || typeof input !== "object") throw new Error("Invalid ordinary map input.");
  const prototype = Object.getPrototypeOf(input);
  const instance = prototype === TraceMap.prototype;
  if (!instance && prototype !== Object.prototype && prototype !== null) throw new Error("Invalid ordinary map input.");
  // <lang><zh-CN>只从自有数据描述符取已知字段，忽略未知扩展及sourcesContent，避免正文访问器执行。</zh-CN><en>Read known own data descriptors only, ignoring extensions and sourcesContent to avoid body accessor execution.</en></lang>
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const read = (key: string): unknown => {
    // <lang><zh-CN>缺字段留给结构检查；已声明的访问器在读取前拒绝。</zh-CN><en>Missing fields go to structural checks; reject declared accessors before reading.</en></lang>
    const descriptor = descriptors[key];
    if (descriptor && !Object.hasOwn(descriptor, "value")) throw new Error("Invalid ordinary map field.");
    return descriptor?.value;
  };
  // <lang><zh-CN>实例保留已经解码的映射或原编码；不复用调用者缓存或库的实例短路路径。</zh-CN><en>Instances retain decoded or original encoded mappings without reusing caller caches or the library instance shortcut.</en></lang>
  const mappings = instance ? read("_decoded") ?? read("_encoded") : read("mappings");
  const metadata: Record<string, unknown> = { version: read("version"), sources: read("sources"), names: read("names") ?? [], mappings };
  for (const key of ["file", "sourceRoot", "ignoreList"] as const) {
    // <lang><zh-CN>可省略字段不制造undefined wire值；兼容旧Google忽略列表名称。</zh-CN><en>Omitted fields do not introduce undefined wire values; retain the legacy Google ignore-list spelling.</en></lang>
    const field = key === "ignoreList" ? read(key) ?? read("x_google_ignoreList") : read(key);
    if (field !== undefined) metadata[key] = field;
  }
  if (!isDocSourceMapJsonDataGraph(metadata) || metadata.version !== 3
    || !Array.isArray(metadata.sources) || !metadata.sources.every((source) => source === null || typeof source === "string")
    || !Array.isArray(metadata.names) || !metadata.names.every((name) => typeof name === "string")
    || !(typeof mappings === "string" || Array.isArray(mappings))
    || (metadata.file !== undefined && metadata.file !== null && typeof metadata.file !== "string")
    || (metadata.sourceRoot !== undefined && typeof metadata.sourceRoot !== "string")
    || (metadata.ignoreList !== undefined && (!Array.isArray(metadata.ignoreList) || !metadata.ignoreList.every(isNonnegativeInteger)))) {
    throw new Error("Invalid ordinary map metadata.");
  }
  if (typeof mappings === "string") {
    // <lang><zh-CN>快速VLQ解码器会容忍截断/非法字符；只做语法预检，数值解码仍交给依赖。</zh-CN><en>The fast VLQ decoder tolerates truncated/invalid characters; preflight syntax only and leave numeric decoding to the dependency.</en></lang>
    const segmentPattern = /^(?:[g-z0-9+/]*[A-Za-f])(?:(?:[g-z0-9+/]*[A-Za-f]){3}(?:[g-z0-9+/]*[A-Za-f])?)?$/;
    for (const line of mappings.split(";")) {
      if (line !== "" && !line.split(",").every((segment) => segmentPattern.test(segment))) throw new Error("Invalid encoded mapping syntax.");
    }
  }
  // <lang><zh-CN>普通JSON图预检后复制，库的排序/缓存和调用者的后续修改互不影响。</zh-CN><en>Clone after ordinary-JSON preflight so library sorting/caches and subsequent caller mutations stay independent.</en></lang>
  const trace = new TraceMap(structuredClone(metadata) as unknown as SourceMapInput, mapPath ?? null);
  if (instance) {
    // <lang><zh-CN>已解析实例可能有构造基准URL，复制其路径以保持既有查找语义，不重新解析。</zh-CN><en>Pre-resolved instances may have a construction base URL; copy their paths to preserve existing lookup semantics.</en></lang>
    const resolved = read("resolvedSources");
    if (!isDocSourceMapJsonDataGraph(resolved) || !Array.isArray(resolved) || resolved.length !== trace.sources.length || !resolved.every((source) => typeof source === "string")) throw new Error("Invalid resolved map paths.");
    trace.resolvedSources = [...resolved];
  }
  // <lang><zh-CN>解码仍由成熟库负责；再核查段长、非负整数和引用范围，避免快速解码吞掉无效结构。</zh-CN><en>The mature library still decodes mappings; then check segment lengths, nonnegative integers and reference bounds so fast decoding cannot admit invalid structures.</en></lang>
  for (const line of decodedMappings(trace)) {
    if (!Array.isArray(line)) throw new Error("Invalid mapping line.");
    for (const segment of line) {
      if (!Array.isArray(segment) || ![1, 4, 5].includes(segment.length) || !segment.every(isNonnegativeInteger)
        || (segment.length > 1 && segment[1]! >= trace.sources.length)
        || (segment.length === 5 && segment[4]! >= trace.names.length)) throw new Error("Invalid mapping segment.");
    }
  }
  return trace;
}

/** @lang zh-CN 仅接受可精确表示的非负整数坐标/索引。 @lang en Accepts precisely representable nonnegative integer coordinates/indices only. */
function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
