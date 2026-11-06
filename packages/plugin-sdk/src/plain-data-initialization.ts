/**
 * @file
 * @lang zh-CN 在通用证据快照上重放有限初始化声明轨迹；不执行源码，不授予文件或生产主体信任。
 * @lang en Replays finite initialization claim traces over generic evidence snapshots, without executing source or granting file or producer trust.
 */
import { createHiaDiagnostic, type HiaDiagnostic, type HiaSourceRange } from "@hia-doc/core";
import { readArtifactDerivationEvidence, type ArtifactDerivationEvidence } from "./derivation-evidence.js";
import schema from "./plain-data-initialization.schema.json" with { type: "json" };

/** @lang zh-CN 有限初始化规则身份。 @lang en Finite initialization rule identity. */
export const PLAIN_DATA_INITIALIZATION_CONTRACT = "plain-data-initialization" as const;
/** @lang zh-CN 精确独立规则草案版本。 @lang en Exact independent rule draft version. */
export const PLAIN_DATA_INITIALIZATION_CONTRACT_VERSION = "0.1.0-draft" as const;
/** @lang zh-CN 规则Schema身份，作为元数据使用。 @lang en Rule schema identity, used as metadata. */
export const PLAIN_DATA_INITIALIZATION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/plain-data-initialization-0.1.0-draft.schema.json" as const;
/** @lang zh-CN 结构Schema，图和时序约束由纯reader额外校验。 @lang en Structural schema, with graph and ordering constraints additionally checked by the pure reader. */
export const PLAIN_DATA_INITIALIZATION_JSON_SCHEMA = schema;

/** @lang zh-CN 引用活动输入资源的显式排除终点UTF16范围。 @lang en Explicit exclusive-end UTF16 range referencing an activity input resource. */
export interface PlainDataInitializationSource {
  /** @lang zh-CN 活动输入资源身份。 @lang en Activity input resource identity. */
  readonly resourceId: string;
  /** @lang zh-CN 沿用核心范围且显式提供一基列。 @lang en Reuses the core range with explicit one-based columns. */
  readonly range: HiaSourceRange & { start: { line: number; column: number }; end: { line: number; column: number } };
  /** @lang zh-CN 固定终点及列单位。 @lang en Fixed end boundary and column unit. */
  readonly rangeConvention: { readonly endBoundary: "exclusive"; readonly columnUnit: "utf16-code-unit" };
}
/** @lang zh-CN 所有事件的声明顺序和来源。 @lang en Declared order and provenance shared by all events. */
interface StepBase {
  /** @lang zh-CN 从零连续编号。 @lang en Contiguous numbering starting at zero. */
  readonly sequence: number;
  /** @lang zh-CN 声明此操作的输入源码位置。 @lang en Claimed input-source location of this operation. */
  readonly source: PlainDataInitializationSource;
}
/** @lang zh-CN 对象自有数据属性及其独立声明来源。 @lang en Own data property and its separate declaration provenance. */
export interface PlainDataInitializationProperty {
  /** @lang zh-CN 普通字符串键。 @lang en Ordinary string key. */
  readonly key: string;
  /** @lang zh-CN 已分配的值身份。 @lang en Previously allocated value identity. */
  readonly nodeId: string;
  /** @lang zh-CN 属性声明选择器。 @lang en Property-declaration selector. */
  readonly source: PlainDataInitializationSource;
}
/** @lang zh-CN 闭集有限事件，引用必须按序存在，clone映射覆盖全部可达容器。 @lang en Closed finite events whose references must already exist; clone maps cover all reachable containers. */
export type PlainDataInitializationStep = Readonly<StepBase & (
  | { kind: "literal"; nodeId: string; value: string | number | boolean | null }
  | { kind: "object"; nodeId: string; properties: readonly PlainDataInitializationProperty[] }
  | { kind: "array"; nodeId: string; items: readonly string[] }
  | { kind: "bind"; nodeId: string; name: string }
  | { kind: "clone"; nodeId: string; sourceNodeId: string; copies: readonly { fromNodeId: string; toNodeId: string }[] }
  | { kind: "spread"; nodeId: string; sourceNodeId: string }
  | { kind: "write"; targetNodeId: string; key: string; valueNodeId: string }
  | { kind: "freeze"; nodeId: string }
)>;
/** @lang zh-CN 活动的精确规则payload及所选导出绑定。 @lang en Exact activity-rule payload and selected export binding. */
export type PlainDataInitialization = {
  /** @lang zh-CN 固定规则身份。 @lang en Fixed rule identity. */
  readonly contract: typeof PLAIN_DATA_INITIALIZATION_CONTRACT;
  /** @lang zh-CN 精确版本。 @lang en Exact version. */
  readonly contractVersion: typeof PLAIN_DATA_INITIALIZATION_CONTRACT_VERSION;
  /** @lang zh-CN 导出绑定所属输入资源。 @lang en Input resource owning the export binding. */
  readonly entryResourceId: string;
  /** @lang zh-CN 连续顺序的声明事件。 @lang en Claim events in contiguous order. */
  readonly steps: readonly PlainDataInitializationStep[];
  /** @lang zh-CN 声明输出及入口作用域中的const绑定。 @lang en Claimed output and const binding in the entry scope. */
  readonly result: { readonly resourceId: string; readonly bindingName: string };
};
/** @lang zh-CN 最终JSON访问路径、共享身份及不同种类的来源。 @lang en Final JSON access path, shared identity and distinct provenance categories. */
export interface PlainDataInitializationValueLink {
  /** @lang zh-CN RFC6901位置，根为空字符串。 @lang en RFC6901 location, with the empty string for the root. */
  readonly pointer: string;
  /** @lang zh-CN 轨迹内节点名，不作跨记录身份。 @lang en Trace-local node name, not a cross-record identity. */
  readonly nodeId: string;
  /** @lang zh-CN 实际JSON值类型。 @lang en Actual JSON value type. */
  readonly type: "object" | "array" | "string" | "number" | "boolean" | "null";
  /** @lang zh-CN 当前属性来源或节点来源。 @lang en Current property provenance or node provenance. */
  readonly source: PlainDataInitializationSource;
  /** @lang zh-CN 原值产生位置。 @lang en Original value-producing location. */
  readonly valueSource: PlainDataInitializationSource;
  /** @lang zh-CN 被覆盖的属性声明来源。 @lang en Overwritten property-declaration provenance. */
  readonly previousSources: readonly PlainDataInitializationSource[];
  /** @lang zh-CN 当前节点及直接属性边参与的克隆/展开来源，按事件去重并排序。 @lang en Clone/spread provenance involving this node and its direct property edge, deduplicated and ordered by event. */
  readonly transformationSources: readonly PlainDataInitializationSource[];
  /** @lang zh-CN 与变换来源逐项对应的事件序号，同一位置的不同操作仍独立。 @lang en Event sequences corresponding to transformation sources; distinct operations at one location remain distinct. */
  readonly transformationSequences: readonly number[];
}
/** @lang zh-CN 重放只核轨迹内部语义，实际字节、源码及记录方继续未核。 @lang en Replay checks internal trace semantics only; actual bytes, source and recorder remain unverified. */
export type PlainDataInitializationReadResult =
  | { readonly status: "invalid"; readonly diagnostics: readonly HiaDiagnostic[] }
  | { readonly status: "replayed"; readonly diagnostics: readonly []; readonly evidence: ArtifactDerivationEvidence;
      readonly activityId: string; readonly initialization: PlainDataInitialization; readonly value: unknown;
      readonly valueLinks: readonly PlainDataInitializationValueLink[];
      readonly verification: { readonly structure: true; readonly traceSemantics: true; readonly artifactBytes: false; readonly sourceLinks: false; readonly sourceConformance: false; readonly producerAuthenticity: false } };

/** @lang zh-CN 内部属性槽保持值引用与字段历史分别演化。 @lang en Internal slots evolve value references and field histories separately. */
interface Slot { nodeId: string; source: PlainDataInitializationSource; history: PlainDataInitializationSource[]; transforms: Transformation[] }
/** @lang zh-CN 顺序身份区分同一源码位置发生的多个变换。 @lang en Sequence identities distinguish multiple transformations at one source location. */
interface Transformation { sequence: number; source: PlainDataInitializationSource }
/** @lang zh-CN 有身份的堆记录，所有权及浅冻结属于对象而非绑定。 @lang en Identified heap record whose ownership and shallow freezing belong to objects rather than bindings. */
interface HeapNode { id: string; kind: "literal" | "object" | "array"; value: string | number | boolean | null; owner: string;
  source: PlainDataInitializationSource; frozen: boolean; properties: Map<string, Slot>; transforms: Transformation[] }

/**
 * @lang zh-CN 精确读取所选活动规则并静态重放有限数据事件，不执行源码或读取文件。
 * @lang en Reads an exact selected activity rule and statically replays finite data events without executing source or reading files.
 * @param input <lang><zh-CN>已解码的通用证据JSON，先由通用reader复制和核引用。</zh-CN><en>Decoded generic evidence JSON, first copied and reference-checked by the generic reader.</en></lang>
 * @param activityId <lang><zh-CN>必须显式给出的活动身份。</zh-CN><en>Required explicit activity identity.</en></lang>
 * @returns <lang><zh-CN>声明结果及逐值来源，或无局部产物的固定诊断。replayed不证明源码符合性。</zh-CN><en>Claimed result and per-value provenance, or fixed diagnostics without partial output. Replayed does not prove source conformance.</en></lang>
 */
export function readPlainDataInitialization(input: unknown, activityId: string): PlainDataInitializationReadResult {
  const generic = readArtifactDerivationEvidence(input);
  if (generic.status === "invalid") return generic;
  // <lang><zh-CN>本请求持有独立图、绑定、预算和失败身份；不会修改调用方输入或跨调用缓存。</zh-CN>
  // <en>This request owns its graph, bindings, budgets and failure identities, without mutating caller input or sharing caches.</en></lang>
  const heap = new Map<string, HeapNode>();
  const bindings = new Map<string, string>();
  const failures = new WeakMap<object, { reason: string; fieldPath: string }>();
  let edges = 0;
  let provenanceUnits = 0;
  let inputs: ReadonlySet<string> = new Set();
  /** @lang zh-CN 固定失败身份只在本次请求内可识别。 @lang en Fixed failure identities are recognizable only within this request. */
  function reject(reason: string, fieldPath: string): never {
    const error = {};
    failures.set(error, { reason, fieldPath });
    throw error;
  }
  /** @lang zh-CN 有界列表保持wire顺序。 @lang en Bounded lists retain wire order. */
  function list(value: unknown, field: string, maximum: number): unknown[] {
    if (!Array.isArray(value) || value.length > maximum) reject("collection", field);
    return value;
  }
  /** @lang zh-CN 检查全部必需且闭集的对象字段。 @lang en Checks entirely required, closed object fields. */
  function fields(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) reject("shape", field);
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== keys.length || keys.some(key => !Object.hasOwn(row, key))) reject("shape", field);
    return row;
  }
  /** @lang zh-CN 节点身份使用已确认的小写工具命名。 @lang en Node identities use the confirmed lowercase tool naming rules. */
  function id(value: unknown, field: string): string {
    if (typeof value !== "string" || value.length > 160 || !/^[a-z0-9][a-z0-9._-]*$/.test(value)) reject("identity", field);
    return value;
  }
  /** @lang zh-CN 绑定名保留源语言大小写，但拒绝空白与控制字符。 @lang en Binding names preserve source-language casing while rejecting blank names and control characters. */
  function name(value: unknown, field: string): string {
    if (typeof value !== "string" || !value.trim() || value.length > 200 || /[\u0000-\u001f]/.test(value)) reject("binding", field);
    return value;
  }
  /** @lang zh-CN 核显式来源结构及活动输入范围，实际文件长度仍未核。 @lang en Checks explicit provenance shape and activity-input scope, leaving actual file lengths unverified. */
  function source(value: unknown, field: string): PlainDataInitializationSource {
    const row = fields(value, ["resourceId", "range", "rangeConvention"], field);
    if (!inputs.has(id(row.resourceId, field))) reject("source-resource", field);
    const range = fields(row.range, ["start", "end"], field);
    const start = fields(range.start, ["line", "column"], field);
    const end = fields(range.end, ["line", "column"], field);
    for (const position of [start, end]) for (const key of ["line", "column"]) if (!Number.isSafeInteger(position[key]) || (position[key] as number) < 1) reject("source-range", field);
    if ((end.line as number) < (start.line as number) || end.line === start.line && (end.column as number) < (start.column as number)) reject("source-range", field);
    const convention = fields(row.rangeConvention, ["endBoundary", "columnUnit"], field);
    if (convention.endBoundary !== "exclusive" || convention.columnUnit !== "utf16-code-unit") reject("source-convention", field);
    return row as unknown as PlainDataInitializationSource;
  }
  /** @lang zh-CN 引用只指向已分配节点，禁止猜测前向定义。 @lang en References point only to allocated nodes, without guessing forward definitions. */
  function node(value: unknown, field: string): HeapNode {
    const found = heap.get(id(value, field));
    if (!found) reject("node-reference", field);
    return found;
  }
  /** @lang zh-CN 约束来源复制总量，防止小图放大历史数组。 @lang en Bounds total provenance copying so small graphs cannot amplify history arrays. */
  function charge(count: number): void {
    provenanceUnits += count;
    if (provenanceUnits > 200000) reject("provenance-budget", "steps");
  }
  /** @lang zh-CN 分配唯一身份，actor资源决定对象所有权。 @lang en Allocates unique identities whose actor resources determine object ownership. */
  function allocate(value: unknown, kind: HeapNode["kind"], provenance: PlainDataInitializationSource, field: string): HeapNode {
    const key = id(value, field);
    if (heap.has(key)) reject("duplicate-node", field);
    if (heap.size >= 10000) reject("heap-budget", field);
    const created: HeapNode = { id: key, kind, owner: provenance.resourceId, source: provenance, frozen: false, properties: new Map(), value: null, transforms: [] };
    heap.set(key, created);
    return created;
  }
  /** @lang zh-CN 原型相关键按首版保守边界拒绝，其它键只作数据。 @lang en Prototype-related keys follow the initial conservative boundary; other keys are data only. */
  function key(value: unknown, field: string): string {
    if (typeof value !== "string" || ["__proto__", "prototype", "constructor"].includes(value)) reject("property-key", field);
    return value;
  }
  /** @lang zh-CN 每条属性边和替换分别计费。 @lang en Charges each property edge and replacement separately. */
  function set(target: HeapNode, key: string, slot: Slot): void {
    if (++edges > 20000) reject("edge-budget", "steps");
    target.properties.set(key, slot);
  }

  try {
    const activity = generic.evidence.activities.find(row => row.id === activityId);
    if (typeof activityId !== "string" || !activity) reject("activity", "activityId");
    if (activity.profile.contract !== PLAIN_DATA_INITIALIZATION_CONTRACT || activity.profile.contractVersion !== PLAIN_DATA_INITIALIZATION_CONTRACT_VERSION) reject("profile-version", "profile");
    inputs = new Set(activity.inputs);
    const payload = fields(generic.evidence.details[activityId], ["contract", "contractVersion", "entryResourceId", "steps", "result"], "details");
    if (payload.contract !== PLAIN_DATA_INITIALIZATION_CONTRACT || payload.contractVersion !== PLAIN_DATA_INITIALIZATION_CONTRACT_VERSION) reject("profile-version", "details");
    const entry = id(payload.entryResourceId, "entryResourceId");
    if (!inputs.has(entry)) reject("entry-resource", "entryResourceId");
    const result = fields(payload.result, ["resourceId", "bindingName"], "result");
    if (!activity.outputs.includes(id(result.resourceId, "result.resourceId"))) reject("result-resource", "result.resourceId");
    const derivations = generic.evidence.derivations.filter(row => row.activityId === activityId && row.outputs.includes(result.resourceId as string));
    if (!derivations.length) reject("result-derivation", "result.resourceId");
    inputs = new Set(derivations.flatMap(row => [...row.inputs]));
    if (!inputs.has(entry)) reject("entry-resource", "entryResourceId");
    const steps = list(payload.steps, "steps", 10000);
    if (!steps.length) reject("collection", "steps");
    for (const [index, value] of steps.entries()) {
      // <lang><zh-CN>先核固定头与来源，再按闭集操作解释；所有诊断位置使用索引而非输入身份。</zh-CN>
      // <en>Check fixed headers and provenance before interpreting closed operations; diagnostics use indices rather than input identities.</en></lang>
      const field = `steps[${index}]`;
      if (!value || typeof value !== "object" || Array.isArray(value)) reject("shape", field);
      const row = value as Record<string, unknown>;
      if (row.sequence !== index) reject("sequence", field);
      const provenance = source(row.source, field + ".source");
      const base = ["sequence", "source", "kind"];
      if (row.kind === "literal") {
        // <lang><zh-CN>只接受JSON标量和精确安全整数，保持与独立静态分析的数值范围一致。</zh-CN><en>Accept JSON scalars and exact safe integers only, matching the independent static analyzer's numeric scope.</en></lang>
        fields(row, [...base, "nodeId", "value"], field);
        if (row.value !== null && !["string", "boolean", "number"].includes(typeof row.value) || typeof row.value === "number" && !Number.isSafeInteger(row.value)) reject("literal", field);
        const created = allocate(row.nodeId, "literal", provenance, field);
        created.value = row.value as string | number | boolean | null;
      } else if (row.kind === "object" || row.kind === "array") {
        // <lang><zh-CN>初始边引用已存在节点；覆盖由独立write事件表达，避免字段来源歧义。</zh-CN><en>Initial edges reference existing nodes; separate write events express overrides, avoiding ambiguous field provenance.</en></lang>
        fields(row, [...base, "nodeId", row.kind === "object" ? "properties" : "items"], field);
        const slots: Array<[string, Slot]> = [];
        const properties = list(row.kind === "object" ? row.properties : row.items, field, 20000);
        for (const [position, property] of properties.entries()) {
          if (row.kind === "array") slots.push([String(position), { nodeId: node(property, field).id, source: provenance, history: [], transforms: [] }]);
          else {
            const item = fields(property, ["key", "nodeId", "source"], field);
            slots.push([key(item.key, field), { nodeId: node(item.nodeId, field).id, source: source(item.source, field), history: [], transforms: [] }]);
          }
        }
        const created = allocate(row.nodeId, row.kind, provenance, field);
        if (new Set(slots.map(([key]) => key)).size !== slots.length) reject("duplicate-property", field);
        for (const [key, slot] of slots) set(created, key, slot);
      } else if (row.kind === "bind") {
        // <lang><zh-CN>相同名称可属于不同模块，同一模块中的const绑定只创建一次。</zh-CN><en>The same name can belong to different modules; a module-local const binding is created once.</en></lang>
        fields(row, [...base, "nodeId", "name"], field);
        const binding = provenance.resourceId + "\0" + name(row.name, field);
        if (bindings.has(binding)) reject("duplicate-binding", field);
        bindings.set(binding, node(row.nodeId, field).id);
      } else if (row.kind === "freeze") {
        // <lang><zh-CN>只冻结当前容器，子节点保留各自的所有权和可写性。</zh-CN><en>Freeze the current container only; children retain their own ownership and writability.</en></lang>
        fields(row, [...base, "nodeId"], field);
        const target = node(row.nodeId, field);
        if (target.kind === "literal" || target.owner !== provenance.resourceId) reject("freeze-owner", field);
        target.frozen = true;
      } else if (row.kind === "write") {
        // <lang><zh-CN>槽的字段历史与新值来源分开，别名继续看到同一目标对象。</zh-CN><en>Keep field history separate from the new value's provenance while aliases continue observing one target object.</en></lang>
        fields(row, [...base, "targetNodeId", "key", "valueNodeId"], field);
        const target = node(row.targetNodeId, field);
        const property = key(row.key, field);
        const replacement = node(row.valueNodeId, field);
        if (target.kind !== "object" || target.owner !== provenance.resourceId || target.frozen) reject("write-boundary", field);
        const previous = target.properties.get(property);
        charge((previous?.history.length ?? 0) + 1);
        set(target, property, { nodeId: replacement.id, source: provenance, history: previous ? [...previous.history, previous.source] : [], transforms: [] });
      } else if (row.kind === "spread") {
        // <lang><zh-CN>浅展开只分配外壳，挂接子图的所有权保持原记录。</zh-CN><en>Shallow spreading allocates a shell only, retaining recorded ownership of attached subgraphs.</en></lang>
        fields(row, [...base, "nodeId", "sourceNodeId"], field);
        const original = node(row.sourceNodeId, field);
        if (original.kind === "literal") reject("spread-container", field);
        const created = allocate(row.nodeId, original.kind, provenance, field);
        charge(original.transforms.length + 1);
        const transformation = { sequence: index, source: provenance };
        created.transforms = [...original.transforms, transformation];
        for (const [key, slot] of original.properties) {
          // <lang><zh-CN>复制直接引用边的变换，子图保持自己的记录。</zh-CN><en>Record the copied direct reference edge while subgraphs retain their own histories.</en></lang>
          charge(slot.transforms.length + 1);
          set(created, key, { ...slot, transforms: [...slot.transforms, transformation] });
        }
      } else if (row.kind === "clone") {
        fields(row, [...base, "nodeId", "sourceNodeId", "copies"], field);
        const original = node(row.sourceNodeId, field);
        const copies = new Map<string, string>();
        const destinations = new Set<string>();
        for (const item of list(row.copies, field, 10000)) {
          const pair = fields(item, ["fromNodeId", "toNodeId"], field);
          const from = node(pair.fromNodeId, field);
          const to = id(pair.toNodeId, field);
          if (from.kind === "literal" || copies.has(from.id) || destinations.has(to) || heap.has(to)) reject("clone-map", field);
          copies.set(from.id, to); destinations.add(to);
        }
        if (original.kind === "literal") {
          if (copies.size) reject("clone-map", field);
          const created = allocate(row.nodeId, "literal", provenance, field);
          created.value = original.value; created.source = original.source;
          charge(original.transforms.length + 1);
          created.transforms = [...original.transforms, { sequence: index, source: provenance }];
        } else {
          if (copies.get(original.id) !== row.nodeId) reject("clone-root", field);
          // <lang><zh-CN>先固定可达容器闭包和全部新身份，再连接边，从而保留共享与循环。</zh-CN>
          // <en>Fix the reachable-container closure and all new identities before connecting edges, preserving sharing and cycles.</en></lang>
          const reachable = new Map<string, HeapNode>();
          const pending = [original];
          while (pending.length) {
            const current = pending.pop()!;
            if (reachable.has(current.id)) continue;
            if (reachable.size >= 10000) reject("heap-budget", field);
            reachable.set(current.id, current);
            for (const slot of current.properties.values()) {
              const child = heap.get(slot.nodeId)!;
              if (child.kind !== "literal") pending.push(child);
            }
          }
          if (reachable.size !== copies.size || [...reachable.keys()].some(key => !copies.has(key))) reject("clone-map", field);
          for (const [oldId, old] of reachable) {
            const created = allocate(copies.get(oldId), old.kind, provenance, field);
            created.source = old.source;
            charge(old.transforms.length + 1);
            created.transforms = [...old.transforms, { sequence: index, source: provenance }];
          }
          for (const [oldId, old] of reachable) {
            const created = heap.get(copies.get(oldId)!)!;
            for (const [key, slot] of old.properties) {
              // <lang><zh-CN>克隆边也携带事件身份，使标量不因节点复用丢失复制来源。</zh-CN><en>Cloned edges carry event identities so reused scalar nodes retain copying provenance.</en></lang>
              charge(slot.transforms.length + 1);
              set(created, key, { ...slot, nodeId: copies.get(slot.nodeId) ?? slot.nodeId, transforms: [...slot.transforms, { sequence: index, source: provenance }] });
            }
          }
        }
      } else reject("operation", field);
    }
    const rootId = bindings.get(entry + "\0" + name(result.bindingName, "result.bindingName"));
    if (!rootId) reject("result-binding", "result.bindingName");
    const links: PlainDataInitializationValueLink[] = [];
    const active = new Set<string>();
    let pointerUnits = 0;
    /** @lang zh-CN 最后读取活图，循环与共享展开预算分别校验。 @lang en Reads the final live graph, checking cycles and shared-expansion budgets separately. */
    function materialize(current: HeapNode, pointer: string, slot?: Slot, depth = 0): unknown {
      if (active.has(current.id)) reject("cyclic-json-value", "result");
      if (depth > 128) reject("depth-budget", "result");
      pointerUnits += pointer.length;
      if (links.length >= 100000 || pointerUnits > 2000000) reject("value-budget", "result");
      // <lang><zh-CN>只合并当前节点与直接边，祖先的早期变换不会归因给后来插入的值。</zh-CN><en>Merge this node and its direct edge only; earlier ancestor transformations cannot be attributed to later insertions.</en></lang>
      charge(4 * (current.transforms.length + (slot?.transforms.length ?? 0)) + (slot?.history.length ?? 0));
      const transformations = new Map(current.transforms.map(event => [event.sequence, event]));
      for (const event of slot?.transforms ?? []) transformations.set(event.sequence, event);
      const ordered = [...transformations.values()].sort((left, right) => left.sequence - right.sequence);
      const type = current.kind === "literal" ? current.value === null ? "null" : typeof current.value as "string" | "number" | "boolean" : current.kind;
      links.push({ pointer, nodeId: current.id, type, source: slot?.source ?? current.source, valueSource: current.source, previousSources: slot?.history ?? [], transformationSources: ordered.map(event => event.source), transformationSequences: ordered.map(event => event.sequence) });
      if (current.kind === "literal") return current.value;
      active.add(current.id);
      const value: unknown[] | Record<string, unknown> = current.kind === "array" ? [] : Object.create(null) as Record<string, unknown>;
      for (const [key, child] of current.properties) {
        const result = materialize(heap.get(child.nodeId)!, pointer + "/" + key.replaceAll("~", "~0").replaceAll("/", "~1"), child, depth + 1);
        if (Array.isArray(value)) value.push(result);
        else value[key] = result;
      }
      active.delete(current.id);
      return value;
    }
    const value = materialize(heap.get(rootId)!, "");
    return { status: "replayed", diagnostics: [], evidence: generic.evidence, activityId, initialization: payload as unknown as PlainDataInitialization,
      value, valueLinks: links, verification: { structure: true, traceSemantics: true, artifactBytes: false, sourceLinks: false, sourceConformance: false, producerAuthenticity: false } };
  } catch (error) {
    const failure = error && typeof error === "object" ? failures.get(error) : undefined;
    return { status: "invalid", diagnostics: [createHiaDiagnostic("PLAIN_DATA_INITIALIZATION_INVALID", "Invalid plain data initialization trace.", "error", { data: failure ?? { reason: "input", fieldPath: "details" } })] };
  }
}
