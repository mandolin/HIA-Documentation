/**
 * @file
 * @lang zh-CN 独立草案派生证据的有界快照、结构和引用读取；真实字节及规则语义由调用方继续核验。
 * @lang en Bounded snapshot, structural and reference reading for separate draft derivation evidence; callers continue verifying actual bytes and rule semantics.
 */
import { createHiaDiagnostic, type HiaDiagnostic } from "@hia-doc/core";
import schema from "./artifact-derivation-evidence.schema.json" with { type: "json" };

/**
 * @lang zh-CN 通用派生证据身份。
 * @lang en Generic derivation-evidence identity.
 */
export const ARTIFACT_DERIVATION_EVIDENCE_CONTRACT = "artifact-derivation-evidence" as const;
/**
 * @lang zh-CN 精确草案版本，与SDK包版本分别管理。
 * @lang en Exact draft version, managed separately from the SDK package version.
 */
export const ARTIFACT_DERIVATION_EVIDENCE_CONTRACT_VERSION = "0.1.0-draft" as const;
/**
 * @lang zh-CN 独立canonical身份，无网络加载副作用。
 * @lang en Separate canonical identity, with no network-loading side effects.
 */
export const ARTIFACT_DERIVATION_EVIDENCE_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/artifact-derivation-evidence-0.1.0-draft.schema.json" as const;
/**
 * @lang zh-CN 通用结构Schema，引用闭包及实际验证单独执行。
 * @lang en Generic structural schema; reference closure and actual verification run separately.
 */
export const ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA = schema;

/**
 * @lang zh-CN 原始字节身份由生产方声明，消费者另行核对。
 * @lang en Raw-byte identities are producer claims checked separately by consumers.
 */
export interface DerivationEvidenceResource {
  /**
   * @lang zh-CN 工件内唯一资源名。
   * @lang en Resource name unique within the evidence.
   */
  readonly id: string;
  /**
   * @lang zh-CN 输入源码或生产工件分类。
   * @lang en Input-source or produced-artifact classification.
   */
  readonly kind: "source" | "artifact";
  /**
   * @lang zh-CN 授权根下的安全相对路径。
   * @lang en Safe relative path below an authorized root.
   */
  readonly path: string;
  /**
   * @lang zh-CN 原始字节的SHA256声明。
   * @lang en Claimed SHA256 of original bytes.
   */
  readonly sha256: string;
}
/**
 * @lang zh-CN 记录活动的输入、输出及规则身份。
 * @lang en Records activity inputs, outputs and rule identity.
 */
export interface DerivationEvidenceActivity {
  /**
   * @lang zh-CN 唯一活动名。
   * @lang en Unique activity name.
   */
  readonly id: string;
  /**
   * @lang zh-CN 活动分类。
   * @lang en Activity classification.
   */
  readonly type: string;
  /**
   * @lang zh-CN 精确规则引用，未知规则保留但不自动通过。
   * @lang en Exact rule reference; unknown rules are preserved without automatic acceptance.
   */
  readonly profile: {
    /**
     * @lang zh-CN 规则身份。
     * @lang en Rule identity.
     */
    readonly contract: string;
    /**
     * @lang zh-CN 精确规则版本。
     * @lang en Exact rule version.
     */
    readonly contractVersion: string;
  };
  /**
   * @lang zh-CN 已声明的输入资源名。
   * @lang en Declared input resource names.
   */
  readonly inputs: readonly string[];
  /**
   * @lang zh-CN 已声明的输出工件名。
   * @lang en Declared output artifact names.
   */
  readonly outputs: readonly string[];
}
/**
 * @lang zh-CN 一项活动范围内的派生关系。
 * @lang en Derivation relation within one activity's scope.
 */
export interface DerivationEvidenceRelation {
  /**
   * @lang zh-CN 唯一关系名。
   * @lang en Unique relation name.
   */
  readonly id: string;
  /**
   * @lang zh-CN 已声明活动。
   * @lang en Declared activity.
   */
  readonly activityId: string;
  /**
   * @lang zh-CN 活动输入的子集。
   * @lang en Subset of activity inputs.
   */
  readonly inputs: readonly string[];
  /**
   * @lang zh-CN 活动输出的子集。
   * @lang en Subset of activity outputs.
   */
  readonly outputs: readonly string[];
  /**
   * @lang zh-CN 已声明地图引用，逐值覆盖时非空。
   * @lang en Declared map references, nonempty for value-link coverage.
   */
  readonly mapRefIds: readonly string[];
}
/**
 * @lang zh-CN 关联实际地图资源及其精确契约身份。
 * @lang en Associates an actual map resource with its exact contract identity.
 */
export interface DerivationEvidenceMapReference {
  /**
   * @lang zh-CN 证据内唯一引用名。
   * @lang en Reference name unique within the evidence.
   */
  readonly id: string;
  /**
   * @lang zh-CN 地图工件资源名。
   * @lang en Map artifact resource name.
   */
  readonly resourceId: string;
  /**
   * @lang zh-CN 地图契约身份。
   * @lang en Map contract identity.
   */
  readonly contract: string;
  /**
   * @lang zh-CN 地图精确版本。
   * @lang en Exact map version.
   */
  readonly contractVersion: string;
}
/**
 * @lang zh-CN 有明确来源类别和覆盖范围的独立草案记录。
 * @lang en Separate draft record with explicit evidence origin and coverage.
 */
export interface ArtifactDerivationEvidence {
  /**
   * @lang zh-CN 精确契约身份。
   * @lang en Exact contract identity.
   */
  readonly contract: typeof ARTIFACT_DERIVATION_EVIDENCE_CONTRACT;
  /**
   * @lang zh-CN 精确wire版本。
   * @lang en Exact wire version.
   */
  readonly contractVersion: typeof ARTIFACT_DERIVATION_EVIDENCE_CONTRACT_VERSION;
  /**
   * @lang zh-CN 稳定记录名。
   * @lang en Stable record name.
   */
  readonly id: string;
  /**
   * @lang zh-CN 实际记录方，不赋予信任。
   * @lang en Actual recorder, without granting trust.
   */
  readonly producer: {
    /**
     * @lang zh-CN 记录工具身份。
     * @lang en Recording-tool identity.
     */
    readonly id: string;
    /**
     * @lang zh-CN 记录工具版本。
     * @lang en Recording-tool version.
     */
    readonly version: string;
  };
  /**
   * @lang zh-CN 实际生产记录或静态推导，禁止隐式改标签。
   * @lang en Actual production record or static inference, with no implicit relabeling.
   */
  readonly evidenceOrigin: "producer-recorded" | "static-inferred";
  /**
   * @lang zh-CN 资源或逐值链接覆盖声明。
   * @lang en Resource-level or value-link coverage claim.
   */
  readonly coverage: "resource" | "value-links";
  /**
   * @lang zh-CN 资源身份和摘要集合。
   * @lang en Resource identities and digests.
   */
  readonly resources: readonly DerivationEvidenceResource[];
  /**
   * @lang zh-CN 生产活动集合。
   * @lang en Production activities.
   */
  readonly activities: readonly DerivationEvidenceActivity[];
  /**
   * @lang zh-CN 活动内的派生关系。
   * @lang en Derivations within activities.
   */
  readonly derivations: readonly DerivationEvidenceRelation[];
  /**
   * @lang zh-CN 地图工件引用。
   * @lang en Map artifact references.
   */
  readonly mapRefs: readonly DerivationEvidenceMapReference[];
  /**
   * @lang zh-CN 按活动名保留规则payload，语义由对应规则读者核验。
   * @lang en Rule payloads keyed by activity name, with semantics checked by corresponding rule readers.
   */
  readonly details: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}
/**
 * @lang zh-CN 结构读取与其它核验维度分开，invalid没有局部证据。
 * @lang en Structural reading is separate from other verification dimensions; invalid results contain no partial evidence.
 */
export type ArtifactDerivationEvidenceReadResult =
  | {
    /**
     * @lang zh-CN 当前分支的invalid读取状态。
     * @lang en The invalid read status for this branch.
     */
    readonly status: "invalid";
    /**
     * @lang zh-CN 当前读取分支的受控诊断，成功分支为空。
     * @lang en Controlled diagnostics for this read branch, empty on success.
     */
    readonly diagnostics: readonly HiaDiagnostic[] }
  | {
    /**
     * @lang zh-CN 当前分支的readable读取状态。
     * @lang en The readable read status for this branch.
     */
    readonly status: "readable";
    /**
     * @lang zh-CN 当前读取分支的受控诊断，成功分支为空。
     * @lang en Controlled diagnostics for this read branch, empty on success.
     */
    readonly diagnostics: readonly [];
    /**
     * @lang zh-CN 已完成结构读取的独立证据快照。
     * @lang en Owned evidence snapshot after structural reading.
     */
    readonly evidence: ArtifactDerivationEvidence;

    /**
     * @lang zh-CN 逐维度核验状态，false维度仍需对应证据。
     * @lang en Per-dimension verification state, with false dimensions requiring their own evidence.
     */
    readonly verification: {
    /**
     * @lang zh-CN 已通过结构、身份和引用检查。
     * @lang en Structure, identity and reference checks have passed.
     */
    readonly structure: true;
    /**
     * @lang zh-CN 本次读取尚未核对实际工件原字节。
     * @lang en Actual artifact bytes remain unchecked by this read.
     */
    readonly artifactBytes: false;
    /**
     * @lang zh-CN 本次读取尚未核对实际源码链接或范围。
     * @lang en Actual source links and ranges remain unchecked by this read.
     */
    readonly sourceLinks: false;
    /**
     * @lang zh-CN 对应规则的语义仍由专用读者核验。
     * @lang en The corresponding rule semantics still require their dedicated reader.
     */
    readonly profileSemantics: false;
    /**
     * @lang zh-CN 本次读取尚未认证生产主体身份。
     * @lang en Producer authenticity remains unchecked by this read.
     */
    readonly producerAuthenticity: false } };

// <lang><zh-CN>模式固定在模块私域，外部修改导出的Schema不会放松读取边界。</zh-CN><en>Patterns remain module-private so external edits to exported schemas cannot loosen reader boundaries.</en></lang>
const idPattern = /^[a-z0-9][a-z0-9._-]*$/;
const pathPattern = /^(?!\/)(?!.*[\\:%?#\u0000-\u001f])(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\/$).+$/;

/**
 * @lang zh-CN 防御性读取通用证据，仅校验结构、引用和覆盖，不访问文件或执行生产器。
 * @lang en Defensively reads generic evidence, checking structure, references and coverage without accessing files or executing producers.
 * @param input <lang><zh-CN>已解码的普通JSON数据。调用方负责原字节解析及重复键治理。</zh-CN><en>Decoded ordinary JSON data. Callers own original-byte parsing and duplicate-key handling.</en></lang>
 * @returns <lang><zh-CN>独立快照及分维度状态，或不含输入值的固定诊断。没有隐式版本迁移。</zh-CN><en>Owned snapshot and separate verification states, or fixed diagnostics without input values. No implicit version migration occurs.</en></lang>
 */
export function readArtifactDerivationEvidence(input: unknown): ArtifactDerivationEvidenceReadResult {
  // <lang><zh-CN>预算在每次请求内累计，覆盖共享子图重复展开，避免快照内存放大。</zh-CN><en>Invocation-local budgets include repeated expansion of shared subgraphs, preventing snapshot amplification.</en></lang>
  let nodes = 0;
  let units = 0;
  const active = new WeakSet<object>();
  const failures = new WeakMap<object, string>();
  /**
   * @lang zh-CN 固定字段路径中止，绝不回显未知键或值。
   * @lang en Stops at fixed field paths, never echoing unknown keys or values.
   */
  function invalid(fieldPath: string): never {
    const failure = {};
    failures.set(failure, fieldPath);
    throw failure;
  }
  /**
   * @lang zh-CN 无getter/toJSON调用的有界普通数据快照，Proxy反射不提供沙箱保证。
   * @lang en Bounded ordinary-data snapshot without getter/toJSON calls; proxy reflection is not sandboxed.
   */
  function snapshot(value: unknown, depth = 0): unknown {
    if (++nodes > 50000 || depth > 64) invalid("input");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") {
      units += value.length;
      if (units > 2000000) invalid("input");
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || value === null || active.has(value)) invalid("input");
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) invalid("input");
    if (Object.getOwnPropertySymbols(value).length) invalid("input");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result: unknown[] | Record<string, unknown> = array ? [] : Object.create(null) as Record<string, unknown>;
    active.add(value);
    if (array) {
      const length = descriptors.length?.value as unknown;
      if (typeof length !== "number" || !Number.isSafeInteger(length) || length > 50000 || Object.keys(descriptors).length !== length + 1) invalid("input");
      for (let i = 0; i < length; i++) {
        const descriptor = descriptors[String(i)];
        if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) invalid("input");
        (result as unknown[]).push(snapshot(descriptor.value, depth + 1));
      }
    } else for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) invalid("input");
      units += key.length;
      if (units > 2000000) invalid("input");
      (result as Record<string, unknown>)[key] = snapshot(descriptor.value, depth + 1);
    }
    active.delete(value);
    return result;
  }
  /**
   * @lang zh-CN 校验闭集且全部必需的对象字段。
   * @lang en Checks closed, entirely required object fields.
   */
  function fields(value: unknown, names: readonly string[], field: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field);
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== names.length || names.some(name => !Object.hasOwn(row, name))) invalid(field);
    return row;
  }
  /**
   * @lang zh-CN 校验固定长度上限的非空文本。
   * @lang en Checks nonblank text with a fixed length bound.
   */
  function text(value: unknown, field: string): string {
    if (typeof value !== "string" || !value.trim() || value.length > 200) invalid(field);
    return value;
  }
  /**
   * @lang zh-CN 采用既有小写工具身份规则和长度上限。
   * @lang en Uses existing lowercase tool-identity rules and a length bound.
   */
  function id(value: unknown, field: string): string {
    const name = text(value, field);
    if (name.length > 160 || !idPattern.test(name)) invalid(field);
    return name;
  }
  /**
   * @lang zh-CN 有界集合，调用方声明是否允许空集。
   * @lang en Bounded collection whose caller declares whether emptiness is allowed.
   */
  function list(value: unknown, field: string, empty = false): unknown[] {
    if (!Array.isArray(value) || value.length > 10000 || !empty && value.length === 0) invalid(field);
    return value;
  }
  /**
   * @lang zh-CN 校验唯一身份并保留已验证记录。
   * @lang en Checks unique identity and retains the validated record.
   */
  function register(table: Map<string, Record<string, unknown>>, row: Record<string, unknown>, field: string): string {
    const key = id(row.id, field + ".id");
    if (table.has(key)) invalid(field + ".id");
    table.set(key, row);
    return key;
  }
  /**
   * @lang zh-CN 校验非重复引用，只接受允许集合中的身份。
   * @lang en Checks nonduplicate references belonging to the allowed identity set.
   */
  function refs(value: unknown, allowed: ReadonlySet<string>, field: string, empty = false): string[] {
    const names = list(value, field, empty).map(item => id(item, field));
    if (new Set(names).size !== names.length || names.some(name => !allowed.has(name))) invalid(field);
    return names;
  }

  try {
    const value = fields(snapshot(input), ["contract", "contractVersion", "id", "producer", "evidenceOrigin", "resources", "activities", "derivations", "coverage", "mapRefs", "details"], "evidence");
    if (value.contract !== ARTIFACT_DERIVATION_EVIDENCE_CONTRACT || value.contractVersion !== ARTIFACT_DERIVATION_EVIDENCE_CONTRACT_VERSION) invalid("identity");
    id(value.id, "id");
    const producer = fields(value.producer, ["id", "version"], "producer");
    id(producer.id, "producer.id");
    text(producer.version, "producer.version");
    if (value.evidenceOrigin !== "producer-recorded" && value.evidenceOrigin !== "static-inferred") invalid("evidenceOrigin");
    if (value.coverage !== "resource" && value.coverage !== "value-links") invalid("coverage");
    const resources = new Map<string, Record<string, unknown>>();
    for (const item of list(value.resources, "resources")) {
      const row = fields(item, ["id", "kind", "path", "sha256"], "resources");
      register(resources, row, "resources");
      if (row.kind !== "source" && row.kind !== "artifact") invalid("resources.kind");
      if (typeof row.path !== "string" || row.path.length > 4096 || !pathPattern.test(row.path)) invalid("resources.path");
      if (typeof row.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.sha256)) invalid("resources.sha256");
    }
    const resourceIds = new Set(resources.keys());
    const activities = new Map<string, Record<string, unknown>>();
    for (const item of list(value.activities, "activities")) {
      const row = fields(item, ["id", "type", "profile", "inputs", "outputs"], "activities");
      register(activities, row, "activities");
      id(row.type, "activities.type");
      const profile = fields(row.profile, ["contract", "contractVersion"], "activities.profile");
      text(profile.contract, "activities.profile.contract");
      text(profile.contractVersion, "activities.profile.contractVersion");
      refs(row.inputs, resourceIds, "activities.inputs");
      const outputs = refs(row.outputs, resourceIds, "activities.outputs");
      if (outputs.some(name => resources.get(name)!.kind !== "artifact")) invalid("activities.outputs");
      if ((row.inputs as string[]).some(name => outputs.includes(name))) invalid("activities");
    }
    const maps = new Map<string, Record<string, unknown>>();
    for (const item of list(value.mapRefs, "mapRefs", true)) {
      const row = fields(item, ["id", "resourceId", "contract", "contractVersion"], "mapRefs");
      register(maps, row, "mapRefs");
      const resourceId = id(row.resourceId, "mapRefs.resourceId");
      if (resources.get(resourceId)?.kind !== "artifact") invalid("mapRefs.resourceId");
      text(row.contract, "mapRefs.contract");
      text(row.contractVersion, "mapRefs.contractVersion");
    }
    const mapIds = new Set(maps.keys());
    const derivations = new Map<string, Record<string, unknown>>();
    for (const item of list(value.derivations, "derivations")) {
      const row = fields(item, ["id", "activityId", "inputs", "outputs", "mapRefIds"], "derivations");
      register(derivations, row, "derivations");
      const activity = activities.get(id(row.activityId, "derivations.activityId"));
      if (!activity) invalid("derivations.activityId");
      refs(row.inputs, new Set(activity.inputs as string[]), "derivations.inputs");
      refs(row.outputs, new Set(activity.outputs as string[]), "derivations.outputs");
      refs(row.mapRefIds, mapIds, "derivations.mapRefIds", value.coverage === "resource");
    }
    if (!value.details || typeof value.details !== "object" || Array.isArray(value.details)) invalid("details");
    const details = value.details as Record<string, unknown>;
    if (Object.keys(details).length !== activities.size || Object.keys(details).some(name => !activities.has(name))) invalid("details");
    for (const payload of Object.values(details)) if (!payload || typeof payload !== "object" || Array.isArray(payload)) invalid("details");
    return { status: "readable", diagnostics: [], evidence: value as unknown as ArtifactDerivationEvidence,
      verification: { structure: true, artifactBytes: false, sourceLinks: false, profileSemantics: false, producerAuthenticity: false } };
  } catch (error) {
    // <lang><zh-CN>只识别本次创建的失败，不读取任意反射异常上的属性。</zh-CN><en>Recognize only failures created by this invocation, without reading properties of arbitrary reflection exceptions.</en></lang>
    const fieldPath = error && typeof error === "object" ? failures.get(error) ?? "input" : "input";
    return { status: "invalid", diagnostics: [createHiaDiagnostic("ARTIFACT_DERIVATION_EVIDENCE_INVALID", "Invalid artifact derivation evidence.", "error", { data: { fieldPath } })] };
  }
}
