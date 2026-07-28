import {
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";
import type {
  GeneratedDocumentationBindingIndex,
  GeneratedDocumentationBindingIndexedBinding,
  GeneratedDocumentationBindingIndexedExpansion,
  GeneratedDocumentationBindingIndexedTarget
} from "./generated-documentation-binding-index.js";

/**
 * 中文：供 renderer 与 IDE/DevTools 宿主消费的 generated binding 只读投影名称。
 * English: Contract name for the read-only generated-binding projection consumed
 * by renderers and IDE/DevTools hosts.
 */
export const GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT =
  "generated-documentation-binding-host-projection";

/**
 * 中文：首个宿主投影草案版本；它不改变 sidecar 的所有权或版本。
 * English: First draft host-projection version; it does not change sidecar
 * ownership or versioning.
 */
export const GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION =
  "0.1.0-draft";

/**
 * 中文：给只读 renderer/host 的生成式文档绑定安全投影。
 * English: Public-safe generated-documentation-binding projection for read-only
 * renderers and hosts.
 *
 * @remarks
 * 中文：此结构只由 W-P52.5 已建立的内存 index 生成。它有意不包含 source body、
 * source range、sidecar path、locals value/digest 或 diagnostic 自由文本。
 * English: This structure is created only from the in-memory index established
 * in W-P52.5. It deliberately excludes source bodies/ranges, sidecar paths,
 * locals values/digests, and diagnostic free text.
 */
export interface GeneratedDocumentationBindingHostProjection {
  bindingContract: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT;
  bindingContractVersion: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
  bindings: readonly GeneratedDocumentationBindingHostBinding[];
  contract: typeof GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT;
  contractVersion: typeof GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION;
  diagnostics: readonly GeneratedDocumentationBindingHostDiagnostic[];
  privacy: GeneratedDocumentationBindingHostProjectionPrivacy;
  sidecarId?: string;
  status: GeneratedDocumentationBindingIndex["status"];
  summary: GeneratedDocumentationBindingHostProjectionSummary;
}

/** 中文：投影中的 source binding 与一对多 target 关系。English: Source binding and its one-to-many target relation in the projection. */
export interface GeneratedDocumentationBindingHostBinding {
  bindingRef: {
    kind: string;
    memberPath: readonly string[];
    rootDeclarationId: string;
  };
  composition: {
    contributionCount: number;
    mergePolicy: string;
    relation: string;
  };
  docSourceMapEntryIds: readonly string[];
  expansions: readonly GeneratedDocumentationBindingHostExpansion[];
  id: string;
  quality: GeneratedDocumentationBindingHostQuality;
  scopeId: string;
  sourceIntent: {
    field?: string;
    kind: string;
  };
  targets: readonly GeneratedDocumentationBindingHostTarget[];
}

/** 中文：投影中的展开实例。English: Expansion instance in the projection. */
export interface GeneratedDocumentationBindingHostExpansion {
  id: string;
  instanceKey: {
    displayKey?: string;
    origin?: string;
    privacySafe: boolean;
    status: string;
  };
  order: number;
  quality: GeneratedDocumentationBindingHostQuality;
  targetIds: readonly string[];
}

/** 中文：投影中的生成 target。English: Generated target in the projection. */
export interface GeneratedDocumentationBindingHostTarget {
  docSourceMapEntryIds: readonly string[];
  id: string;
  identity: {
    artifactId?: string;
    kind: string;
    selector?: string;
    symbolId?: string;
  };
  quality: GeneratedDocumentationBindingHostQuality;
}

/** 中文：三个独立质量维度的宿主可读摘要。English: Host-readable summary of the three independent quality dimensions. */
export interface GeneratedDocumentationBindingHostQuality {
  confidence: string;
  provenanceCoverage: string;
  resolutionKind: string;
}

/** 中文：不含自由文本/路径的诊断摘要。English: Diagnostic summary without free text or paths. */
export interface GeneratedDocumentationBindingHostDiagnostic {
  code: string;
  severity: "error" | "warning" | "info";
}

/** 中文：投影严格遵守的隐私边界。English: Privacy boundary strictly enforced by the projection. */
export interface GeneratedDocumentationBindingHostProjectionPrivacy {
  diagnosticFreeTextIncluded: false;
  localsValueIncluded: false;
  sidecarPathIncluded: false;
  sourceBodyIncluded: false;
  sourceRangeIncluded: false;
  sourcesContentPolicy: "none";
}

/** 中文：宿主界面可直接显示的计数摘要。English: Counter summary directly displayable by host UIs. */
export interface GeneratedDocumentationBindingHostProjectionSummary {
  bindingCount: number;
  diagnosticCount: number;
  expansionCount: number;
  linkedDocSourceMapEntryCount: number;
  stableInstanceKeyCount: number;
  targetCount: number;
  unlinkedBindingCount: number;
}

/**
 * 中文：将 W-P52.5 只读 index 转成四类宿主共用的安全关系投影。
 * English: Converts the W-P52.5 read-only index into the safe relation
 * projection shared by the four host surfaces.
 *
 * @remarks
 * 中文：函数不读取 sidecar 路径、不执行表达式/locals，也不写入 doc-source-map、
 * workspace 或目标仓库。若 index 不可用，返回同样安全的空投影和原有状态。
 * English: The function does not read sidecar paths, execute expressions/locals,
 * or write to a doc-source-map, workspace, or target repository. When the index
 * is unavailable, it returns an equally safe empty projection and its status.
 */
export function createGeneratedDocumentationBindingHostProjection(
  index: GeneratedDocumentationBindingIndex
): GeneratedDocumentationBindingHostProjection {
  const expansionsByBindingId = new Map<string, GeneratedDocumentationBindingIndexedExpansion[]>();
  const targetsByBindingId = new Map<string, GeneratedDocumentationBindingIndexedTarget[]>();

  for (const binding of index.bindings) {
    expansionsByBindingId.set(
      binding.id,
      index.expansions.filter((expansion) => expansion.bindingId === binding.id)
    );
    targetsByBindingId.set(
      binding.id,
      index.targets.filter((target) => target.bindingIds.includes(binding.id))
    );
  }

  const bindings = index.bindings.map((binding) => freezeBindingProjection(
    binding,
    expansionsByBindingId.get(binding.id) ?? [],
    targetsByBindingId.get(binding.id) ?? []
  ));
  const diagnostics = index.diagnostics.map((diagnostic) => Object.freeze({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
  const summary = Object.freeze({
    bindingCount: bindings.length,
    diagnosticCount: diagnostics.length,
    expansionCount: index.expansionCount,
    linkedDocSourceMapEntryCount: index.linkedDocSourceMapEntryCount,
    stableInstanceKeyCount: index.expansions.filter((expansion) => expansion.instanceKey.status === "stable").length,
    targetCount: index.targetCount,
    unlinkedBindingCount: index.unlinkedBindingCount
  });

  return Object.freeze({
    bindingContract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    bindingContractVersion: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
    bindings: freezeList(bindings),
    contract: GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT,
    contractVersion: GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION,
    diagnostics: freezeList(diagnostics),
    privacy: Object.freeze({
      diagnosticFreeTextIncluded: false as const,
      localsValueIncluded: false as const,
      sidecarPathIncluded: false as const,
      sourceBodyIncluded: false as const,
      sourceRangeIncluded: false as const,
      sourcesContentPolicy: "none" as const
    }),
    ...(index.sidecarId ? { sidecarId: index.sidecarId } : {}),
    status: index.status,
    summary
  });
}

function freezeBindingProjection(
  binding: GeneratedDocumentationBindingIndexedBinding,
  expansions: readonly GeneratedDocumentationBindingIndexedExpansion[],
  targets: readonly GeneratedDocumentationBindingIndexedTarget[]
): GeneratedDocumentationBindingHostBinding {
  return Object.freeze({
    bindingRef: Object.freeze({
      kind: binding.bindingRef.kind,
      memberPath: freezeList(binding.bindingRef.memberPath),
      rootDeclarationId: binding.bindingRef.rootDeclarationId
    }),
    composition: Object.freeze({
      contributionCount: binding.composition.contributionIds.length,
      mergePolicy: binding.composition.mergePolicy,
      relation: binding.composition.relation
    }),
    docSourceMapEntryIds: freezeList(binding.docSourceMapEntryIds),
    expansions: freezeList(expansions.map(freezeExpansionProjection)),
    id: binding.id,
    quality: freezeQuality(binding.resolution),
    scopeId: binding.scope.id,
    sourceIntent: Object.freeze({
      ...(binding.sourceIntent.field ? { field: binding.sourceIntent.field } : {}),
      kind: binding.sourceIntent.kind
    }),
    targets: freezeList(targets.map(freezeTargetProjection))
  });
}

function freezeExpansionProjection(
  expansion: GeneratedDocumentationBindingIndexedExpansion
): GeneratedDocumentationBindingHostExpansion {
  const instanceKey = expansion.instanceKey;
  return Object.freeze({
    id: expansion.id,
    instanceKey: Object.freeze({
      ...(instanceKey.privacySafe && instanceKey.key ? { displayKey: instanceKey.key } : {}),
      ...(instanceKey.origin ? { origin: instanceKey.origin } : {}),
      privacySafe: instanceKey.privacySafe,
      status: instanceKey.status
    }),
    order: expansion.order,
    quality: freezeQuality(expansion.resolution),
    targetIds: freezeList(expansion.targetIds)
  });
}

function freezeTargetProjection(
  target: GeneratedDocumentationBindingIndexedTarget
): GeneratedDocumentationBindingHostTarget {
  return Object.freeze({
    docSourceMapEntryIds: freezeList(target.docSourceMapEntryIds),
    id: target.id,
    identity: Object.freeze({
      ...(target.identity.artifactId ? { artifactId: target.identity.artifactId } : {}),
      kind: target.identity.kind,
      ...(target.identity.selector ? { selector: target.identity.selector } : {}),
      ...(target.identity.symbolId ? { symbolId: target.identity.symbolId } : {})
    }),
    quality: freezeQuality(target.resolution)
  });
}

function freezeQuality(
  value: GeneratedDocumentationBindingIndexedBinding["resolution"]
): GeneratedDocumentationBindingHostQuality {
  return Object.freeze({
    confidence: value.confidence,
    provenanceCoverage: value.provenanceCoverage,
    resolutionKind: value.resolutionKind
  });
}

function freezeList<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}
