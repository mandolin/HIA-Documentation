import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourceRange
} from "@hia-doc/core";
import {
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";
import {
  validateGeneratedDocumentationBinding
} from "./generated-documentation-binding.js";
import type {
  DocSourceMapIndex,
  DocSourceMapIndexedEntry
} from "./index.js";

/**
 * 中文：建立 generated-documentation-binding 只读双向索引的输入选项。
 * English: Input options for building a read-only generated-documentation-binding
 * bidirectional index.
 *
 * @remarks
 * 中文：调用方必须显式先建立 doc-source-map index；本模块不读取 sidecar path、
 * 不访问文件系统，也不执行 adapter expression 或 locals。
 * English: Callers must explicitly create the doc-source-map index first. This
 * module neither reads sidecar paths nor accesses the filesystem, and it never
 * executes adapter expressions or locals.
 */
export interface GeneratedDocumentationBindingIndexOptions {
  docSourceMapIndex: DocSourceMapIndex;
  path?: string;
}

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
 */
export function createGeneratedDocumentationBindingIndex(
  value: unknown,
  options: GeneratedDocumentationBindingIndexOptions
): GeneratedDocumentationBindingIndex {
  const diagnostics: HiaDiagnostic[] = [
    ...options.docSourceMapIndex.diagnostics,
    ...validateGeneratedDocumentationBinding(value, options.path ? { path: options.path } : {})
  ];
  const contractVersion = isRecord(value) ? stringValue(value.contractVersion) : undefined;
  const sidecarId = isRecord(value) ? stringValue(value.id) : undefined;

  if (!isRecord(value) || diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

  if (options.docSourceMapIndex.status !== "available") {
    const docSourceMapStatus = options.docSourceMapIndex.status === "unsupported-version"
      ? "unsupported-version"
      : "invalid";
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE",
      "generated-documentation-binding indexing requires an available paired doc-source-map index.",
      docSourceMapStatus === "invalid" ? "error" : "warning",
      options.path,
      { docSourceMapStatus: options.docSourceMapIndex.status }
    ));
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: docSourceMapStatus
    });
  }

  const linkage = isRecord(value.docSourceMapLinkage) ? value.docSourceMapLinkage : undefined;
  const declaredSidecar = sidecarId
    ? options.docSourceMapIndex.bindingSidecars.find((sidecar) => sidecar.id === sidecarId)
    : undefined;
  validateSidecarLinkage(value, linkage, declaredSidecar, options.docSourceMapIndex, diagnostics, options.path);

  const bindings = collectRecords(value.bindings);
  const expansions = collectRecords(value.expansions);
  const targets = collectRecords(value.targets);
  const bindingById = new Map(bindings.map((binding) => [requiredString(binding.id), binding]));
  const targetById = new Map(targets.map((target) => [requiredString(target.id), target]));
  const entryIdsByBindingId = collectEntryIdsByBindingId(options.docSourceMapIndex.entries, sidecarId, bindingById, diagnostics, options.path);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

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

  const indexedExpansions = expansions.map((expansion) => freezeExpansion(expansion));
  const indexedBindings = bindings.map((binding) => freezeBinding(
    binding,
    expansionIdsByBindingId.get(requiredString(binding.id)) ?? [],
    targetIdsByBindingId.get(requiredString(binding.id)) ?? [],
    entryIdsByBindingId.get(requiredString(binding.id)) ?? []
  ));
  const indexedTargets = targets.map((target) => {
    const targetId = requiredString(target.id);
    const bindingIds = bindingIdsByTargetId.get(targetId) ?? [];
    const entryIds = bindingIds.flatMap((bindingId) => entryIdsByBindingId.get(bindingId) ?? []);
    return freezeTarget(
      target,
      bindingIds,
      expansionIdsByTargetId.get(targetId) ?? [],
      uniqueStrings(entryIds)
    );
  });

  const linkedDocSourceMapEntryCount = uniqueStrings([...entryIdsByBindingId.values()].flat()).length;

  return Object.freeze({
    bindingCount: indexedBindings.length,
    bindings: freezeList(indexedBindings),
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics: freezeList(diagnostics),
    docSourceMapEntryCount: options.docSourceMapIndex.entryCount,
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

function validateSidecarLinkage(
  sidecar: Record<string, unknown>,
  linkage: Record<string, unknown> | undefined,
  declaredSidecar: DocSourceMapIndex["bindingSidecars"][number] | undefined,
  docSourceMapIndex: DocSourceMapIndex,
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
    || declaredSidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_LINKAGE_INVALID",
      "generated-documentation-binding sidecar declaration must match the frozen contract, version, and sidecar id.",
      "error",
      targetPath,
      { sidecarId }
    ));
  }

  const expectedDocSourceMapId = linkage ? stringValue(linkage.docSourceMapId) : undefined;
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

function resolveIndexStatus(
  contractVersion: string | undefined,
  diagnostics: readonly HiaDiagnostic[]
): GeneratedDocumentationBindingIndex["status"] {
  const hasNonVersionError = diagnostics.some((diagnostic) => diagnostic.severity === "error"
    && diagnostic.code !== "GENERATED_DOCUMENTATION_BINDING_UNSUPPORTED_VERSION");
  return contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && !hasNonVersionError
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
