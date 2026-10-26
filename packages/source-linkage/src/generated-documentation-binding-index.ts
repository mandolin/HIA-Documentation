/**
 * @file
 * @lang zh-CN 绑定与文档映射的只读双向组合索引；选项及已消费头部独立投影，嵌套前置数据须来自未篡改工厂索引。
 * @lang en Read-only bidirectional binding/map composition index; independently projects options/consumed headers while nested prerequisite data must come from an untampered factory index.
 */
import { prepareSourceLinkagePathOptions } from "./path-options.js";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourceRange
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION
} from "./constants.js";
import {
  validateGeneratedDocumentationBinding
} from "./generated-documentation-binding.js";
import type {
  DocSourceMapIndex,
  DocSourceMapIndexedEntry
} from "./index.js";

/**
 * @lang zh-CN 建立生成式绑定只读双向索引的自有数据选项；前置索引需保持未篡改。
 * @lang en Own-data options for read-only generated-binding bidirectional indexing; prerequisite indexes must remain untampered.
 *
 * @remarks
 * 中文：调用方必须显式先建立 doc-source-map index；本模块不读取 sidecar path、
 * 不访问文件系统，也不执行 adapter expression 或 locals。
 * English: Callers must explicitly create the doc-source-map index first. This
 * module neither reads sidecar paths nor accesses the filesystem, and it never
 * executes adapter expressions or locals.
 */
export interface GeneratedDocumentationBindingIndexOptions {
  /** @lang zh-CN 必需自有数据引用，来自本包工厂且嵌套数组/条目未篡改；头部检查不是来源认证。 @lang en Required own-data reference from this package's factory with untampered nested arrays/entries; header checks do not authenticate origin. */
  docSourceMapIndex: DocSourceMapIndex;
  /** @lang zh-CN 可选自有string诊断上下文，原空/空白行为保持且未脱敏。 @lang en Optional own string diagnostic context retaining prior empty/whitespace behavior and remaining unsanitized. */
  path?: string;
}

/** @lang zh-CN 仅包含实际消费头部的内部视图；数组借用而非深复制/认证。 @lang en Internal view containing consumed headers only; arrays are borrowed rather than deeply copied/authenticated. */
type BindingDocSourceMapView = Pick<DocSourceMapIndex, "contract" | "contractVersion" | "id" | "status" | "diagnostics" | "entries" | "bindingSidecars" | "entryCount">;

/**
 * 中文：中性 generated-documentation-binding 双向索引。
 * English: Neutral generated-documentation-binding bidirectional index.
 */
export interface GeneratedDocumentationBindingIndex {
  bindingCount: number;
  bindings: readonly GeneratedDocumentationBindingIndexedBinding[];
  contract: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT;
  contractVersion?: string;
  diagnostics: readonly HiaDiagnostic[];
  docSourceMapEntryCount: number;
  expansionCount: number;
  expansions: readonly GeneratedDocumentationBindingIndexedExpansion[];
  linkedDocSourceMapEntryCount: number;
  sidecarId?: string;
  status: "available" | "invalid" | "unsupported-version";
  targetCount: number;
  targets: readonly GeneratedDocumentationBindingIndexedTarget[];
  unlinkedBindingCount: number;
}

/**
 * 中文：可供 renderer/host 后续只读消费的 binding 投影。
 * English: Read-only binding projection for later renderer/host consumption.
 */
export interface GeneratedDocumentationBindingIndexedBinding {
  adapterId: string;
  bindingRef: GeneratedDocumentationBindingReference;
  composition: GeneratedDocumentationBindingComposition;
  docSourceMapEntryIds: readonly string[];
  expansionIds: readonly string[];
  id: string;
  resolution: GeneratedDocumentationBindingResolution;
  scope: GeneratedDocumentationBindingScope;
  sourceIntent: GeneratedDocumentationBindingSourceIntent;
  targetIds: readonly string[];
}

/**
 * 中文：声明与展开之间的实例投影，保留 stable instance key 及独立质量维度。
 * English: Instance projection between declaration and expansion, preserving the
 * stable instance key and separate quality dimensions.
 */
export interface GeneratedDocumentationBindingIndexedExpansion {
  bindingId: string;
  id: string;
  instanceKey: GeneratedDocumentationBindingInstanceKey;
  order: number;
  resolution: GeneratedDocumentationBindingResolution;
  scopeId: string;
  targetIds: readonly string[];
}

/**
 * 中文：可由 generated target 反查到 source binding 的只读投影。
 * English: Read-only projection that permits reverse lookup from a generated
 * target to source bindings.
 */
export interface GeneratedDocumentationBindingIndexedTarget {
  bindingIds: readonly string[];
  docSourceMapEntryIds: readonly string[];
  expansionIds: readonly string[];
  id: string;
  identity: GeneratedDocumentationBindingTargetIdentity;
  resolution: GeneratedDocumentationBindingResolution;
}

/** 中文：受限 member-path binding reference。English: Restricted member-path binding reference. */
export interface GeneratedDocumentationBindingReference {
  kind: string;
  memberPath: readonly string[];
  rootDeclarationId: string;
}

/** 中文：中性 source intent 投影。English: Neutral source-intent projection. */
export interface GeneratedDocumentationBindingSourceIntent {
  field?: string;
  kind: string;
  sourceId?: string;
  sourceRange?: HiaSourceRange;
}

/** 中文：结构化 scope identity。English: Structured scope identity. */
export interface GeneratedDocumentationBindingScope {
  adapterId: string;
  declarationSlot: string;
  id: string;
  semanticAncestry: readonly string[];
  sourceId: string;
}

/** 中文：独立的 resolution/confidence/provenance 三维质量投影。English: Separate resolution/confidence/provenance quality projection. */
export interface GeneratedDocumentationBindingResolution {
  confidence: string;
  provenanceCoverage: string;
  resolutionKind: string;
}

/** 中文：可复现实例键投影。English: Reproducible instance-key projection. */
export interface GeneratedDocumentationBindingInstanceKey {
  key?: string;
  origin?: string;
  privacySafe: boolean;
  status: string;
}

/** 中文：中性生成 target identity。English: Neutral generated-target identity. */
export interface GeneratedDocumentationBindingTargetIdentity {
  artifactId?: string;
  kind: string;
  range?: HiaSourceRange;
  selector?: string;
  symbolId?: string;
}

/** 中文：继承/组合元数据的只读摘要。English: Read-only inheritance/composition metadata summary. */
export interface GeneratedDocumentationBindingComposition {
  contributionIds: readonly string[];
  mergePolicy: string;
  relation: string;
}

/**
 * 中文：从独立 sidecar 与已建立的 doc-source-map index 构造只读双向索引。
 * English: Builds a read-only bidirectional index from an independent sidecar
 * and a pre-built doc-source-map index.
 *
 * @remarks
 * 中文：这个函数只消费已提供的内存对象；不会按 `sidecarPath` 加载 JSON，不会向
 * ordinary source map 写入完整 binding model，也不会调用 renderer 或 host。
 * English: This function consumes only supplied in-memory objects. It does not
 * load JSON from `sidecarPath`, write the full binding model into an ordinary
 * source map, or invoke a renderer or host.
 * @param value <lang><zh-CN>独立绑定sidecar运行时值，仍需owner验证。</zh-CN><en>Independent binding-sidecar runtime value requiring owner validation.</en></lang>
 * @param options <lang><zh-CN>普通/null原型的自有前置索引和可选string路径；已知访问器/错型/反射失败拒绝，未知字段不读。</zh-CN><en>Plain/null-prototype own prerequisite index and optional string path; known accessors/wrong types/reflection failures reject, while unknown fields remain unread.</en></lang>
 * @returns <lang><zh-CN>冻结组合结果。选项/消费头部错误为既有DOC_SOURCE_MAP_UNAVAILABLE、invalid空输出，无部分上下文；合法诊断/状态与未脱敏路径保持。数组仍借用，非深图验证或Proxy/资源/并发沙箱。</zh-CN><en>Frozen composition result. Invalid options/consumed headers yield existing DOC_SOURCE_MAP_UNAVAILABLE with empty invalid output and no partial context; valid diagnostics/statuses and unsanitized paths remain. Arrays are borrowed; no deep-graph validation or proxy/resource/concurrency sandbox.</en></lang>
 */
export function createGeneratedDocumentationBindingIndex(
  value: unknown,
  options: GeneratedDocumentationBindingIndexOptions
): GeneratedDocumentationBindingIndex {
  // <lang><zh-CN>先固定两选项及八头字段；拒绝时不读取sidecar头或复制未验证的诊断。</zh-CN><en>Snapshot both options and eight header fields first; refusal reads no sidecar headers and copies no unvalidated diagnostics.</en></lang>
  const preparedOptions = prepareBindingIndexOptions(options);
  if (!preparedOptions) return createEmptyGeneratedDocumentationBindingIndex({ status: "invalid", diagnostics: [createIndexDiagnostic("GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE", "generated-documentation-binding indexing requires own data options with a string path and a pre-built doc-source-map index.", "error")] });
  // <lang><zh-CN>头部是内部独立快照；嵌套数组/条目仍按公共前置条件借用。</zh-CN><en>The header is an independent internal snapshot; nested arrays/entries remain borrowed under the public precondition.</en></lang>
  const docSourceMapIndex = preparedOptions.docSourceMapIndex;
  // <lang><zh-CN>新诊断数组保持前置诊断在先，既有状态推导和原数组互不修改。</zh-CN><en>A new diagnostic array keeps prerequisite diagnostics first, preserving status derivation without mutating the original array.</en></lang>
  const diagnostics: HiaDiagnostic[] = [
    ...docSourceMapIndex.diagnostics,
    ...validateGeneratedDocumentationBinding(value, preparedOptions.path ? { path: preparedOptions.path } : {})
  ];
  // <lang><zh-CN>validator拒绝访问器后不能再次直接读取头字段；只投影自有数据描述符供失败状态说明。</zh-CN><en>Never read headers directly after validator rejection of accessors; project own data descriptors only for failure metadata.</en></lang>
  const { contractVersion, sidecarId } = readBindingHeader(value);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error") || !isRecord(value)) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

  if (docSourceMapIndex.status !== "available") {
    const docSourceMapStatus = docSourceMapIndex.status === "unsupported-version"
      ? "unsupported-version"
      : "invalid";
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE",
      "generated-documentation-binding indexing requires an available paired doc-source-map index.",
      docSourceMapStatus === "invalid" ? "error" : "warning",
      preparedOptions.path,
      { docSourceMapStatus: docSourceMapIndex.status }
    ));
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: docSourceMapStatus
    });
  }

  const linkage = isRecord(value.docSourceMapLinkage) ? value.docSourceMapLinkage : undefined;
  // <lang><zh-CN>声明来自快照中的借用sidecar数组，实际版本/路径/身份仍由原配对规则核验。</zh-CN><en>The declaration comes from the snapshot's borrowed sidecar array; existing pairing rules still check exact versions/paths/identities.</en></lang>
  const declaredSidecar = sidecarId
    ? docSourceMapIndex.bindingSidecars.find((sidecar) => sidecar.id === sidecarId)
    : undefined;
  validateSidecarLinkage(value, linkage, declaredSidecar, docSourceMapIndex, diagnostics, preparedOptions.path);

  // <lang><zh-CN>owner验证后的三集合分别保留输入顺序，原sidecar不会被排序或改写。</zh-CN><en>Three owner-validated collections retain input order; the original sidecar is neither sorted nor rewritten.</en></lang>
  const bindings = collectRecords(value.bindings);
  const expansions = collectRecords(value.expansions);
  const targets = collectRecords(value.targets);
  // <lang><zh-CN>两张身份表只做当前内存组的关联，不能推导跨工件或跨版本兼容。</zh-CN><en>Two identity maps join this in-memory group only and infer no cross-artifact/version compatibility.</en></lang>
  const bindingById = new Map(bindings.map((binding) => [requiredString(binding.id), binding]));
  const targetById = new Map(targets.map((target) => [requiredString(target.id), target]));
  // <lang><zh-CN>文档条目边来自头部快照数组，未知binding保持既有warning与空边处理。</zh-CN><en>Documentation-entry edges come from the header snapshot array; unknown bindings retain existing warning/empty-edge handling.</en></lang>
  const entryIdsByBindingId = collectEntryIdsByBindingId(docSourceMapIndex.entries, sidecarId, bindingById, diagnostics, preparedOptions.path);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

  // <lang><zh-CN>正反向边表按输入首次出现顺序去重，不将一对多展开折叠成单目标。</zh-CN><en>Forward/reverse edge maps deduplicate in first-seen input order without collapsing one-to-many expansion to one target.</en></lang>
  const expansionIdsByBindingId = new Map<string, string[]>();
  const targetIdsByBindingId = new Map<string, string[]>();
  const expansionIdsByTargetId = new Map<string, string[]>();
  const bindingIdsByTargetId = new Map<string, string[]>();

  for (const expansion of expansions) {
    const expansionId = requiredString(expansion.id);
    const bindingId = requiredString(expansion.bindingId);
    const targetIds = stringList(expansion.targetIds);
    appendUnique(expansionIdsByBindingId, bindingId, expansionId);

    for (const targetId of targetIds) {
      if (!targetById.has(targetId)) {
        continue;
      }
      appendUnique(targetIdsByBindingId, bindingId, targetId);
      appendUnique(expansionIdsByTargetId, targetId, expansionId);
      appendUnique(bindingIdsByTargetId, targetId, bindingId);
    }
  }

  // <lang><zh-CN>最终投影独立冻结；数组来源借用不意味着把原输入冻结或公开其正文。</zh-CN><en>Final projections are independently frozen; borrowed source arrays imply neither freezing original inputs nor exposing their bodies.</en></lang>
  const indexedExpansions = expansions.map((expansion) => freezeExpansion(expansion));
  const indexedBindings = bindings.map((binding) => freezeBinding(
    binding,
    expansionIdsByBindingId.get(requiredString(binding.id)) ?? [],
    targetIdsByBindingId.get(requiredString(binding.id)) ?? [],
    entryIdsByBindingId.get(requiredString(binding.id)) ?? []
  ));
  const indexedTargets = targets.map((target) => {
    const targetId = requiredString(target.id);
    // <lang><zh-CN>先回溯目标的绑定，再沿绑定汇总文档条目，保持原反查顺序。</zh-CN><en>Trace target bindings first, then aggregate their documentation entries while retaining existing reverse-lookup order.</en></lang>
    const bindingIds = bindingIdsByTargetId.get(targetId) ?? [];
    const entryIds = bindingIds.flatMap((bindingId) => entryIdsByBindingId.get(bindingId) ?? []);
    return freezeTarget(
      target,
      bindingIds,
      expansionIdsByTargetId.get(targetId) ?? [],
      uniqueStrings(entryIds)
    );
  });

  // <lang><zh-CN>同一文档条目可关联多个binding，汇总计数只按唯一条目计算。</zh-CN><en>One documentation entry may link multiple bindings; the summary counts unique entries only.</en></lang>
  const linkedDocSourceMapEntryCount = uniqueStrings([...entryIdsByBindingId.values()].flat()).length;

  return Object.freeze({
    bindingCount: indexedBindings.length,
    bindings: freezeList(indexedBindings),
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics: freezeList(diagnostics),
    docSourceMapEntryCount: docSourceMapIndex.entryCount,
    expansionCount: indexedExpansions.length,
    expansions: freezeList(indexedExpansions),
    linkedDocSourceMapEntryCount,
    ...(sidecarId ? { sidecarId } : {}),
    status: "available" as const,
    targetCount: indexedTargets.length,
    targets: freezeList(indexedTargets),
    unlinkedBindingCount: indexedBindings.filter((binding) => binding.docSourceMapEntryIds.length === 0).length
  });
}

/**
 * 中文：按 source binding 查询全部 generated targets。
 * English: Finds all generated targets for a source binding.
 */
export function findGeneratedTargetsForBinding(
  index: GeneratedDocumentationBindingIndex,
  bindingId: string
): readonly GeneratedDocumentationBindingIndexedTarget[] {
  const binding = index.bindings.find((item) => item.id === bindingId);
  if (!binding) {
    return Object.freeze([]);
  }
  const targetById = new Map(index.targets.map((target) => [target.id, target]));
  return freezeList(binding.targetIds.flatMap((targetId) => {
    const target = targetById.get(targetId);
    return target ? [target] : [];
  }));
}

/**
 * 中文：按 generated target 查询全部 source bindings。
 * English: Finds all source bindings for a generated target.
 */
export function findGeneratedBindingsForTarget(
  index: GeneratedDocumentationBindingIndex,
  targetId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  const target = index.targets.find((item) => item.id === targetId);
  if (!target) {
    return Object.freeze([]);
  }
  const bindingById = new Map(index.bindings.map((binding) => [binding.id, binding]));
  return freezeList(target.bindingIds.flatMap((bindingId) => {
    const binding = bindingById.get(bindingId);
    return binding ? [binding] : [];
  }));
}

/**
 * 中文：按 generated target 的稳定 symbol identity 查询 source bindings。
 * English: Finds source bindings by a generated target's stable symbol identity.
 */
export function findGeneratedBindingsForTargetSymbol(
  index: GeneratedDocumentationBindingIndex,
  symbolId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  const bindingIds = uniqueStrings(index.targets
    .filter((target) => target.identity.symbolId === symbolId)
    .flatMap((target) => target.bindingIds));
  const bindingById = new Map(index.bindings.map((binding) => [binding.id, binding]));
  return freezeList(bindingIds.flatMap((bindingId) => {
    const binding = bindingById.get(bindingId);
    return binding ? [binding] : [];
  }));
}

/**
 * 中文：按 ordinary doc-source-map entry 反查其绑定声明。
 * English: Finds binding declarations referenced by an ordinary doc-source-map entry.
 */
export function findGeneratedBindingsForDocSourceMapEntry(
  index: GeneratedDocumentationBindingIndex,
  entryId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  return freezeList(index.bindings.filter((binding) => binding.docSourceMapEntryIds.includes(entryId)));
}

/**
 * @lang zh-CN 投影选项和已消费的前置头部；只保证浅层形状，不认证工厂来源或校验借用图。
 * @lang en Projects options and consumed prerequisite headers; guarantees shallow shape only, neither factory-origin authentication nor borrowed-graph validation.
 * @param value <lang><zh-CN>未知选项，必需docSourceMapIndex与可选path均为自有数据。</zh-CN><en>Unknown options with required docSourceMapIndex and optional path, both own data.</en></lang>
 * @returns <lang><zh-CN>独立头部及原数组引用，或原子失败undefined。Proxy反射异常收敛，不是沙箱。</zh-CN><en>Independent headers with original array references, or atomic undefined failure; catches proxy reflection errors without sandboxing.</en></lang>
 */
function prepareBindingIndexOptions(value: unknown): { docSourceMapIndex: BindingDocSourceMapView; path?: string } | undefined {
  try {
    // <lang><zh-CN>路径投影同时核普通/null原型根，之后只读取必需的自有索引描述符。</zh-CN><en>Path projection also checks a plain/null-prototype root, followed only by the required own index descriptor.</en></lang>
    const location = prepareSourceLinkagePathOptions(value);
    if (!location) return undefined;
    const reference = Object.getOwnPropertyDescriptor(value as object, "docSourceMapIndex");
    if (!reference || !Object.hasOwn(reference, "value")) return undefined;
    const index: unknown = reference.value;
    if (typeof index !== "object" || index === null || Array.isArray(index)) return undefined;
    const prototype = Object.getPrototypeOf(index);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    // <lang><zh-CN>只保存八个已消费字段，缺少可选id/版本视为省略，不沿原型或枚举扩展取值。</zh-CN><en>Retain eight consumed fields only; missing optional id/version is omitted, without inherited reads or extension enumeration.</en></lang>
    const header: Record<string, unknown> = {};
    for (const field of ["contract", "contractVersion", "id", "status", "diagnostics", "entries", "bindingSidecars", "entryCount"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(index, field);
      if (!descriptor) {
        if (field === "id" || field === "contractVersion") continue;
        return undefined;
      }
      if (!Object.hasOwn(descriptor, "value")) return undefined;
      header[field] = descriptor.value;
    }
    if (header.contract !== DOC_SOURCE_MAP_CONTRACT || !["available", "invalid", "unsupported-version"].includes(header.status as string)) return undefined;
    if ((header.id !== undefined && typeof header.id !== "string") || (header.contractVersion !== undefined && typeof header.contractVersion !== "string")) return undefined;
    for (const field of ["diagnostics", "entries", "bindingSidecars"]) {
      // <lang><zh-CN>标准数组头部不等于条目认证；公共契约仍要求数组及其内容来自未篡改前置索引。</zh-CN><en>Standard array headers do not authenticate entries; the public contract still requires untampered prerequisite arrays and contents.</en></lang>
      if (!Array.isArray(header[field]) || Object.getPrototypeOf(header[field]) !== Array.prototype) return undefined;
    }
    // <lang><zh-CN>计数必须与条目数组长度一致，用自有长度描述符避免读取调用者的普通get陷阱。</zh-CN><en>The count must match entry-array length, using its own length descriptor to avoid ordinary caller get traps.</en></lang>
    const length = Object.getOwnPropertyDescriptor(header.entries, "length");
    if (!Number.isSafeInteger(header.entryCount) || (header.entryCount as number) < 0 || !length || header.entryCount !== length.value) return undefined;
    return { ...location, docSourceMapIndex: {
      contract: DOC_SOURCE_MAP_CONTRACT,
      ...(typeof header.contractVersion === "string" ? { contractVersion: header.contractVersion } : {}),
      ...(typeof header.id === "string" ? { id: header.id } : {}),
      status: header.status as DocSourceMapIndex["status"],
      diagnostics: header.diagnostics as DocSourceMapIndex["diagnostics"],
      entries: header.entries as DocSourceMapIndex["entries"],
      bindingSidecars: header.bindingSidecars as DocSourceMapIndex["bindingSidecars"],
      entryCount: header.entryCount as number
    } };
  } catch {
    return undefined;
  }
}

/** @lang zh-CN 核对明确配对的sidecar/map身份、精确版本与路径，不以相同id推定跨版本兼容。 @lang en Checks explicitly paired sidecar/map identities, exact versions and paths without inferring cross-version compatibility from matching ids. */
function validateSidecarLinkage(
  sidecar: Record<string, unknown>,
  linkage: Record<string, unknown> | undefined,
  declaredSidecar: DocSourceMapIndex["bindingSidecars"][number] | undefined,
  docSourceMapIndex: BindingDocSourceMapView,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined
): void {
  const sidecarId = stringValue(sidecar.id);
  const linkageSidecarId = linkage ? stringValue(linkage.sidecarId) : undefined;

  if (!sidecarId || !declaredSidecar) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_SIDECAR_UNDECLARED",
      "generated-documentation-binding sidecar must be declared by the paired doc-source-map before indexing.",
      "error",
      targetPath,
      { sidecarId: sidecarId ?? "" }
    ));
    return;
  }

  if (linkageSidecarId !== sidecarId
    || declaredSidecar.contract !== GENERATED_DOCUMENTATION_BINDING_CONTRACT
    || declaredSidecar.contractVersion !== sidecar.contractVersion) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_LINKAGE_INVALID",
      "generated-documentation-binding sidecar declaration must match the frozen contract, version, and sidecar id.",
      "error",
      targetPath,
      { sidecarId }
    ));
  }

  const expectedDocSourceMapId = linkage ? stringValue(linkage.docSourceMapId) : undefined;
  // <lang><zh-CN>sidecar草案的反向引用版本必须匹配真实map；当前根升级不得使冻结旧引用静默变义。</zh-CN><en>The draft sidecar's back-reference version must match the actual map; advancing the current root must not silently reinterpret a frozen legacy reference.</en></lang>
  if (linkage?.contractVersion !== docSourceMapIndex.contractVersion) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_MISMATCH",
      "generated-documentation-binding linkage version must match the paired doc-source-map exactly.",
      "error",
      targetPath
    ));
  }
  if (expectedDocSourceMapId && docSourceMapIndex.id !== expectedDocSourceMapId) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_MISMATCH",
      "generated-documentation-binding sidecar docSourceMapId must match the paired doc-source-map index.",
      "error",
      targetPath,
      { actualDocSourceMapId: docSourceMapIndex.id ?? "", expectedDocSourceMapId }
    ));
  }

  const expectedSidecarPath = linkage ? stringValue(linkage.sidecarPath) : undefined;
  if (expectedSidecarPath && declaredSidecar.path && normalizePath(expectedSidecarPath) !== normalizePath(declaredSidecar.path)) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_SIDECAR_PATH_MISMATCH",
      "generated-documentation-binding sidecar path must match the paired doc-source-map declaration.",
      "error",
      targetPath,
      { declaredSidecarPath: declaredSidecar.path, expectedSidecarPath }
    ));
  }
}

function collectEntryIdsByBindingId(
  entries: readonly DocSourceMapIndexedEntry[],
  sidecarId: string | undefined,
  bindingById: ReadonlyMap<string, Record<string, unknown>>,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined
): Map<string, string[]> {
  const entryIdsByBindingId = new Map<string, string[]>();
  if (!sidecarId) {
    return entryIdsByBindingId;
  }

  for (const entry of entries) {
    for (const ref of entry.generatedBindingRefs) {
      if (ref.sidecarId !== sidecarId) {
        continue;
      }
      if (!bindingById.has(ref.bindingId)) {
        diagnostics.push(createIndexDiagnostic(
          "GENERATED_DOCUMENTATION_BINDING_INDEX_ENTRY_BINDING_UNRESOLVED",
          "doc-source-map generated binding reference does not resolve in the paired sidecar.",
          "warning",
          targetPath,
          { bindingId: ref.bindingId, entryId: entry.id, sidecarId }
        ));
        continue;
      }
      appendUnique(entryIdsByBindingId, ref.bindingId, entry.id);
    }
  }

  return entryIdsByBindingId;
}

function freezeBinding(
  value: Record<string, unknown>,
  expansionIds: string[],
  targetIds: string[],
  docSourceMapEntryIds: string[]
): GeneratedDocumentationBindingIndexedBinding {
  const sourceIntent = recordValue(value.sourceIntent);
  const bindingRef = recordValue(value.bindingRef);
  const scope = recordValue(value.scope);
  const composition = recordValue(value.composition);
  const projectedSourceIntent: GeneratedDocumentationBindingSourceIntent = {
    kind: requiredString(sourceIntent.kind)
  };
  const field = stringValue(sourceIntent.field);
  const sourceRange = sourceIntentRange(sourceIntent);
  const sourceId = sourceIntentSourceId(sourceIntent);
  if (field) {
    projectedSourceIntent.field = field;
  }
  if (sourceRange) {
    projectedSourceIntent.sourceRange = sourceRange;
  }
  if (sourceId) {
    projectedSourceIntent.sourceId = sourceId;
  }

  return Object.freeze({
    adapterId: requiredString(value.adapterId),
    bindingRef: Object.freeze({
      kind: requiredString(bindingRef.kind),
      memberPath: freezeList(stringList(bindingRef.memberPath)),
      rootDeclarationId: requiredString(bindingRef.rootDeclarationId)
    }),
    composition: Object.freeze({
      contributionIds: freezeList(collectContributionIds(composition.contributions)),
      mergePolicy: requiredString(composition.mergePolicy),
      relation: requiredString(composition.relation)
    }),
    docSourceMapEntryIds: freezeList(docSourceMapEntryIds),
    expansionIds: freezeList(expansionIds),
    id: requiredString(value.id),
    resolution: freezeResolution(recordValue(value.resolution)),
    scope: Object.freeze({
      adapterId: requiredString(scope.adapterId),
      declarationSlot: requiredString(scope.declarationSlot),
      id: requiredString(scope.id),
      semanticAncestry: freezeList(stringList(scope.semanticAncestry)),
      sourceId: requiredString(scope.sourceId)
    }),
    sourceIntent: Object.freeze(projectedSourceIntent),
    targetIds: freezeList(targetIds)
  });
}

function freezeExpansion(value: Record<string, unknown>): GeneratedDocumentationBindingIndexedExpansion {
  const instanceKey = recordValue(value.instanceKey);
  const projectedInstanceKey: GeneratedDocumentationBindingInstanceKey = {
    privacySafe: instanceKey.privacySafe === true,
    status: requiredString(instanceKey.status)
  };
  const instanceKeyValue = stringValue(instanceKey.key);
  const instanceKeyOrigin = stringValue(instanceKey.origin);
  if (instanceKeyValue) {
    projectedInstanceKey.key = instanceKeyValue;
  }
  if (instanceKeyOrigin) {
    projectedInstanceKey.origin = instanceKeyOrigin;
  }

  return Object.freeze({
    bindingId: requiredString(value.bindingId),
    id: requiredString(value.id),
    instanceKey: Object.freeze(projectedInstanceKey),
    order: typeof value.order === "number" ? value.order : 0,
    resolution: freezeResolution(recordValue(value.resolution)),
    scopeId: requiredString(value.scopeId),
    targetIds: freezeList(stringList(value.targetIds))
  });
}

function freezeTarget(
  value: Record<string, unknown>,
  bindingIds: string[],
  expansionIds: string[],
  docSourceMapEntryIds: string[]
): GeneratedDocumentationBindingIndexedTarget {
  const identity = recordValue(value.identity);
  const range = normalizeRange(identity.range);
  const projectedIdentity: GeneratedDocumentationBindingTargetIdentity = {
    kind: requiredString(identity.kind)
  };
  const artifactId = stringValue(identity.artifactId);
  const selector = stringValue(identity.selector);
  const symbolId = stringValue(identity.symbolId);
  if (artifactId) {
    projectedIdentity.artifactId = artifactId;
  }
  if (range) {
    projectedIdentity.range = range;
  }
  if (selector) {
    projectedIdentity.selector = selector;
  }
  if (symbolId) {
    projectedIdentity.symbolId = symbolId;
  }

  return Object.freeze({
    bindingIds: freezeList(bindingIds),
    docSourceMapEntryIds: freezeList(docSourceMapEntryIds),
    expansionIds: freezeList(expansionIds),
    id: requiredString(value.id),
    identity: Object.freeze(projectedIdentity),
    resolution: freezeResolution(recordValue(value.resolution))
  });
}

function freezeResolution(value: Record<string, unknown>): GeneratedDocumentationBindingResolution {
  return Object.freeze({
    confidence: requiredString(value.confidence),
    provenanceCoverage: requiredString(value.provenanceCoverage),
    resolutionKind: requiredString(value.resolutionKind)
  });
}

function collectContributionIds(value: unknown): string[] {
  return collectRecords(value).flatMap((contribution) => {
    const id = stringValue(contribution.id);
    return id ? [id] : [];
  });
}

function sourceIntentSourceId(value: Record<string, unknown>): string | undefined {
  const sourceRef = recordValue(value.sourceRef);
  return stringValue(sourceRef.sourceId);
}

function sourceIntentRange(value: Record<string, unknown>): HiaSourceRange | undefined {
  const sourceRef = recordValue(value.sourceRef);
  return normalizeRange(sourceRef.range);
}

function createEmptyGeneratedDocumentationBindingIndex(options: {
  contractVersion?: string;
  diagnostics: HiaDiagnostic[];
  sidecarId?: string;
  status: GeneratedDocumentationBindingIndex["status"];
}): GeneratedDocumentationBindingIndex {
  return Object.freeze({
    bindingCount: 0,
    bindings: Object.freeze([]),
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    ...(options.contractVersion ? { contractVersion: options.contractVersion } : {}),
    diagnostics: freezeList(options.diagnostics),
    docSourceMapEntryCount: 0,
    expansionCount: 0,
    expansions: Object.freeze([]),
    linkedDocSourceMapEntryCount: 0,
    ...(options.sidecarId ? { sidecarId: options.sidecarId } : {}),
    status: options.status,
    targetCount: 0,
    targets: Object.freeze([]),
    unlinkedBindingCount: 0
  });
}

/** @lang zh-CN 仅读取数据描述符中的版本/id，不执行getter；反射失败返回空元数据。 @lang en Reads version/id data descriptors without executing getters; reflection failure returns empty metadata. */
function readBindingHeader(value: unknown): { contractVersion?: string; sidecarId?: string } {
  try {
    if (typeof value !== "object" || value === null) return {};
    // <lang><zh-CN>描述符本身由引擎复制，访问器没有value，不会在这里执行。</zh-CN><en>The engine copies descriptors; accessors have no value and never execute here.</en></lang>
    const version = Object.getOwnPropertyDescriptor(value, "contractVersion");
    const identity = Object.getOwnPropertyDescriptor(value, "id");
    const contractVersion = version && Object.hasOwn(version, "value") ? stringValue(version.value) : undefined;
    const sidecarId = identity && Object.hasOwn(identity, "value") ? stringValue(identity.value) : undefined;
    return { ...(contractVersion ? { contractVersion } : {}), ...(sidecarId ? { sidecarId } : {}) };
  } catch {
    return {};
  }
}

function resolveIndexStatus(
  contractVersion: string | undefined,
  diagnostics: readonly HiaDiagnostic[]
): GeneratedDocumentationBindingIndex["status"] {
  const hasNonVersionError = diagnostics.some((diagnostic) => diagnostic.severity === "error"
    && diagnostic.code !== "GENERATED_DOCUMENTATION_BINDING_UNSUPPORTED_VERSION");
  return contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION && !hasNonVersionError
    ? "unsupported-version"
    : "invalid";
}

function createIndexDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: { data?: HiaDiagnosticData; targetPath?: string } = {};
  if (data) {
    options.data = data;
  }
  if (targetPath) {
    options.targetPath = targetPath;
  }
  return createHiaDiagnostic(code, message, severity, options);
}

function collectRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredString(value: unknown): string {
  return stringValue(value) ?? "";
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function appendUnique(map: Map<string, string[]>, key: string, value: string): void {
  const current = map.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
  }
  map.set(key, current);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function freezeList<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeRange(value: unknown): HiaSourceRange | undefined {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
    return undefined;
  }
  const startLine = numberValue(value.start.line);
  const endLine = numberValue(value.end.line);
  if (!startLine || !endLine) {
    return undefined;
  }

  const range: HiaSourceRange = {
    start: { line: startLine },
    end: { line: endLine }
  };
  const startColumn = numberValue(value.start.column);
  const endColumn = numberValue(value.end.column);
  if (startColumn) {
    range.start.column = startColumn;
  }
  if (endColumn) {
    range.end.column = endColumn;
  }
  return Object.freeze({
    start: Object.freeze(range.start),
    end: Object.freeze(range.end)
  });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
