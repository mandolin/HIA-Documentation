/**
 * @file
 * @lang zh-CN 既有宽映射输入的显式字段检查；只在普通JSON预检后调用，不解释跨链执行或读取文件。
 * @lang en Declared-field checks for existing permissive mapping inputs, called only after ordinary-JSON preflight without executing chains or reading files.
 */

/** @lang zh-CN owner内部结构问题，不携带输入正文。 @lang en Owner-internal structural issue without input bodies. */
export interface DocSourceMapInputIssue {
  /** @lang zh-CN 仅由字段名和数组下标组成的位置。 @lang en Location composed only of field names and array indices. */
  target: string;
  /** @lang zh-CN 静态错误说明，不反射输入值或异常。 @lang en Static error description, never reflecting input values or exceptions. */
  message: string;
}

/** @lang zh-CN 已经过普通JSON预检的对象视图，不表示schema验证成功。 @lang en Object view after ordinary-JSON preflight, not proof of schema validity. */
type JsonObject = Record<string, unknown>;

/**
 * @lang zh-CN 检查已提供字段与身份，保留历史宽输入的省略项及开放扩展，不冒充完整wire-schema验证。
 * @lang en Checks supplied fields and identities while retaining omissions and open extensions in legacy permissive inputs; does not claim complete wire-schema validation.
 * @param value <lang><zh-CN>已通过普通JSON图检查的根对象，不修改。</zh-CN><en>Root object already checked as an ordinary JSON graph; never mutated.</en></lang>
 * @returns <lang><zh-CN>新建问题数组；调用方负责转成diagnostic并隔离无效查询。</zh-CN><en>New issue array; the caller creates diagnostics and isolates invalid queries.</en></lang>
 */
export function collectDocSourceMapInputIssues(value: JsonObject): DocSourceMapInputIssue[] {
  // <lang><zh-CN>验证状态只归本次调用；所有消息使用静态正文和受控字段路径。</zh-CN><en>Validation state belongs to this call only; all messages use static text and controlled field paths.</en></lang>
  const issues: DocSourceMapInputIssue[] = [];
  /** @lang zh-CN 追加静态问题，不引用输入值。 @lang en Appends a static issue without referencing input values. */
  const issue = (target: string, message: string): void => { issues.push({ target, message }); };
  /** @lang zh-CN 检查显式文本字段，不补充历史省略项。 @lang en Checks declared text fields without adding legacy omissions. */
  const strings = (node: JsonObject, target: string, keys: string[]): void => {
    for (const key of keys) {
      if (Object.hasOwn(node, key) && !nonEmptyString(node[key])) issue(field(target, key), "Declared mapping field must be a non-empty string.");
    }
  };
  /** @lang zh-CN 返回声明对象或记录错型，不访问文件。 @lang en Returns a declared object or records a type error without file access. */
  const objectField = (node: JsonObject, target: string, key: string): JsonObject | undefined => {
    if (!Object.hasOwn(node, key)) return undefined;
    if (object(node[key])) return node[key];
    issue(field(target, key), "Declared mapping field must be an object.");
    return undefined;
  };
  /** @lang zh-CN 校验已确认闭集，不能用于尚有设计冲突的来源词汇。 @lang en Validates confirmed closed sets, not provenance vocabulary with an unresolved design conflict. */
  const enumeration = (node: JsonObject, target: string, key: string, choices: readonly string[]): void => {
    if (Object.hasOwn(node, key) && (typeof node[key] !== "string" || !choices.includes(node[key]))) issue(field(target, key), "Declared mapping field has an unsupported value.");
  };
  /** @lang zh-CN 保留缺失集合与显式空集合的兼容差别。 @lang en Preserves the compatibility distinction between omitted and explicitly empty collections. */
  const arrayField = (node: JsonObject, target: string, key: string): unknown[] | undefined => {
    if (!Object.hasOwn(node, key)) return undefined;
    if (Array.isArray(node[key])) return node[key];
    issue(field(target, key), "Declared mapping field must be an array.");
    return undefined;
  };
  /** @lang zh-CN 逐项验证文本引用列表。 @lang en Checks each item of a text reference list. */
  const stringArray = (node: JsonObject, target: string, key: string): void => {
    const items = arrayField(node, target, key);
    items?.forEach((item, index) => { if (!nonEmptyString(item)) issue(`${field(target, key)}[${index}]`, "Mapping list item must be a non-empty string."); });
  };
  /** @lang zh-CN 遍历结构项并按需检查集合内身份唯一，不合并重复项。 @lang en Visits structural items and optionally checks collection identity uniqueness without merging duplicates. */
  const objectItems = (node: JsonObject, target: string, key: string, visit: (item: JsonObject, location: string) => void, identities = false): void => {
    // <lang><zh-CN>每个顶层集合拥有独立身份域；重复项使索引无效，不为调用者选择先/后赢家。</zh-CN><en>Each top-level collection has its own identity domain; duplicates invalidate the index rather than selecting a first/last winner.</en></lang>
    const seen = new Set<string>();
    arrayField(node, target, key)?.forEach((item, index) => {
      const location = `${field(target, key)}[${index}]`;
      if (!object(item)) { issue(location, "Mapping collection item must be an object."); return; }
      if (identities) {
        if (!nonEmptyString(item.id)) issue(field(location, "id"), "Mapping identity must be a non-empty string.");
        else if (seen.has(item.id)) issue(field(location, "id"), "Mapping identity must be unique within its collection.");
        else seen.add(item.id);
      }
      visit(item, location);
    });
  };
  /** @lang zh-CN 验证HIA一基整数位置，非普通map的零基列。 @lang en Validates HIA one-based integer positions rather than ordinary-map zero-based columns. */
  const position = (input: unknown, target: string): input is { line: number; column?: number } => {
    if (!object(input) || !Number.isInteger(input.line) || (input.line as number) < 1 || (Object.hasOwn(input, "column") && (!Number.isInteger(input.column) || (input.column as number) < 1))) {
      issue(target, "Mapping position must use positive integer line and optional column.");
      return false;
    }
    return true;
  };
  /** @lang zh-CN 检查来源引用与有序范围，不改变定位精度。 @lang en Checks source references and ordered ranges without changing location precision. */
  const sourceRef = (node: JsonObject, target: string): void => {
    strings(node, target, ["sourceId"]);
    if (!nonEmptyString(node.sourceId)) issue(field(target, "sourceId"), "Source reference requires a source identity.");
    referenceQuality(node, target);
    if (Object.hasOwn(node, "range")) {
      if (!object(node.range)) { issue(field(target, "range"), "Mapping range must be an object."); return; }
      const range = node.range;
      const startValid = position(range.start, field(target, "range.start"));
      const endValid = position(range.end, field(target, "range.end"));
      // <lang><zh-CN>只有端点已证明合法才比较，省略列沿用现有一基列默认值。</zh-CN><en>Compare only validated endpoints, preserving the existing one-based default for omitted columns.</en></lang>
      if (startValid && endValid) {
        const start = range.start as { line: number; column?: number };
        const end = range.end as { line: number; column?: number };
        if (start.line > end.line || (start.line === end.line && (start.column ?? 1) > (end.column ?? 1))) issue(field(target, "range"), "Mapping range end must not precede its start.");
      }
    }
  };
  /** @lang zh-CN 保留现有生成器来源文本；来源闭集冲突另由ADR定案，confidence沿用既有闭集。 @lang en Preserves existing generator provenance text pending the separate ADR decision; confidence retains its existing closed set. */
  const referenceQuality = (node: JsonObject, target: string): void => {
    strings(node, target, ["rangeSource"]);
    enumeration(node, target, "confidence", ["high", "medium", "low", "none"]);
  };

  // <lang><zh-CN>先验证根壳和隐私声明；省略字段保留兼容行为，但显式错型不得变为默认值。</zh-CN><en>Check the root shell and privacy declarations first; omissions retain compatibility while declared wrong types cannot become defaults.</en></lang>
  strings(value, "", ["id"]);
  const producer = objectField(value, "", "producer");
  if (producer) strings(producer, "producer", ["name", "version", "runtime", "profile"]);
  arrayField(value, "", "diagnostics");
  const policies = ["none", "reference", "embed", "redacted"] as const;
  const privacy = objectField(value, "", "privacy");
  if (privacy) {
    enumeration(privacy, "privacy", "sourcesContentPolicy", policies);
    for (const key of ["allowAbsolutePaths", "allowUncPaths", "allowPathTraversal"]) {
      if (Object.hasOwn(privacy, key) && typeof privacy[key] !== "boolean") issue(field("privacy", key), "Declared privacy flag must be boolean.");
    }
    objectField(privacy, "privacy", "releaseGate");
  }

  // <lang><zh-CN>只校验声明元数据，不复制源码正文、不加载普通map或任一sidecar。</zh-CN><en>Validate declaration metadata only, without copying source bodies or loading ordinary maps or sidecars.</en></lang>
  objectItems(value, "", "artifacts", (node, target) => {
    strings(node, target, ["kind", "path", "language", "format", "role"]);
    objectItems(node, target, "contractRefs", (reference, location) => { strings(reference, location, ["contract", "contractVersion", "path"]); });
  }, true);
  objectItems(value, "", "sources", (node, target) => {
    strings(node, target, ["kind", "path", "language"]);
    enumeration(node, target, "role", ["original", "generated", "intermediate", "virtual", "external"]);
    enumeration(node, target, "sourcesContentPolicy", policies);
    if (Object.hasOwn(node, "sourcesContent") && typeof node.sourcesContent !== "string") issue(field(target, "sourcesContent"), "Declared source content must be a string.");
  }, true);
  objectItems(value, "", "sourceMaps", (node, target) => {
    strings(node, target, ["path", "format", "mapsFrom"]);
    enumeration(node, target, "kind", ["ordinary-source-map"]);
    enumeration(node, target, "sourcesContentPolicy", policies);
    stringArray(node, target, "mapsTo");
    objectField(node, target, "pointer");
  }, true);
  for (const key of ["generatedBindingSidecars", "localeResolutionSidecars", "localeDiscoverySidecars"]) {
    objectItems(value, "", key, (node, target) => { strings(node, target, ["contract", "contractVersion", "path"]); }, true);
  }

  // <lang><zh-CN>entry和chain仅检查既有字段结构；引用是否解析继续归原owner逻辑，链不会被执行。</zh-CN><en>Check existing entry/chain field structure only; reference resolution remains with the original owner logic and chains are never executed.</en></lang>
  objectItems(value, "", "entries", (node, target) => {
    strings(node, target, ["kind", "classification", "relationKind", "symbolId", "symbolKind"]);
    objectField(node, target, "annotation");
    arrayField(node, target, "diagnostics");
    objectItems(node, target, "sourceRefs", sourceRef);
    objectItems(node, target, "artifactRefs", (reference, location) => {
      strings(reference, location, ["artifactId", "selector"]);
      if (!nonEmptyString(reference.artifactId)) issue(field(location, "artifactId"), "Artifact reference requires an artifact identity.");
      referenceQuality(reference, location);
    });
    objectItems(node, target, "generatedBindingRefs", (reference, location) => { strings(reference, location, ["sidecarId", "bindingId"]); });
  }, true);
  objectItems(value, "", "chains", (node, target) => {
    objectItems(node, target, "stages", (stage, location) => {
      strings(stage, location, ["from", "to", "transform"]);
      if (Object.hasOwn(stage, "sourceMap") && stage.sourceMap !== null && !nonEmptyString(stage.sourceMap)) issue(field(location, "sourceMap"), "Stage map reference must be null or a non-empty string.");
      stringArray(stage, location, "linkage");
    });
  }, true);
  return issues;
}

/** @lang zh-CN 预检后的非数组对象判定；不负责运行时安全沙箱。 @lang en Non-array object check after preflight, without a runtime security-sandbox guarantee. */
function object(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** @lang zh-CN 身份和已声明文本不接受空串或隐式转换。 @lang en Identities and declared text reject empty strings and coercion. */
function nonEmptyString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** @lang zh-CN 组合仅含受控字段名的位置，不引入调用方正文。 @lang en Joins controlled field-name locations without inserting caller bodies. */
function field(target: string, key: string): string { return target ? `${target}.${key}` : key; }
