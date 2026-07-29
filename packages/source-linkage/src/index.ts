import path from "node:path";
import {
  allGeneratedPositionsFor,
  eachMapping,
  generatedPositionFor,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
  type Bias,
  type SourceMapInput
} from "@jridgewell/trace-mapping";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourcePosition,
  type HiaSourceRange
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";

export {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";
export {
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION
} from "./schema.js";
export {
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
  validateGeneratedDocumentationBinding,
  type GeneratedDocumentationBindingValidationOptions
} from "./generated-documentation-binding.js";
export {
  createGeneratedDocumentationBindingIndex,
  findGeneratedBindingsForDocSourceMapEntry,
  findGeneratedBindingsForTarget,
  findGeneratedBindingsForTargetSymbol,
  findGeneratedTargetsForBinding,
  type GeneratedDocumentationBindingComposition,
  type GeneratedDocumentationBindingIndex,
  type GeneratedDocumentationBindingIndexedBinding,
  type GeneratedDocumentationBindingIndexedExpansion,
  type GeneratedDocumentationBindingIndexedTarget,
  type GeneratedDocumentationBindingIndexOptions,
  type GeneratedDocumentationBindingInstanceKey,
  type GeneratedDocumentationBindingReference,
  type GeneratedDocumentationBindingResolution,
  type GeneratedDocumentationBindingScope,
  type GeneratedDocumentationBindingSourceIntent,
  type GeneratedDocumentationBindingTargetIdentity
} from "./generated-documentation-binding-index.js";
export {
  GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION,
  createGeneratedDocumentationBindingHostProjection,
  type GeneratedDocumentationBindingHostBinding,
  type GeneratedDocumentationBindingHostDiagnostic,
  type GeneratedDocumentationBindingHostExpansion,
  type GeneratedDocumentationBindingHostProjection,
  type GeneratedDocumentationBindingHostProjectionPrivacy,
  type GeneratedDocumentationBindingHostProjectionSummary,
  type GeneratedDocumentationBindingHostQuality,
  type GeneratedDocumentationBindingHostTarget
} from "./generated-documentation-binding-host-projection.js";

export interface DocSourceMapIndexOptions {
  path?: string;
}

export interface DocSourceMapIndex {
  artifactCount: number;
  bindingSidecarCount: number;
  /**
   * 中文：doc-source-map 声明的 generated binding sidecar 元数据；不加载
   * sidecar 正文。
   * English: Generated-binding sidecar metadata declared by the doc-source-map;
   * sidecar bodies are not loaded here.
   */
  bindingSidecars: DocSourceMapGeneratedBindingSidecar[];
  contract: typeof DOC_SOURCE_MAP_CONTRACT;
  contractVersion?: string;
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  entryCount: number;
  id?: string;
  linkedEntryCount: number;
  path?: string;
  sourceCount: number;
  sourceMaps: DocSourceMapSourceMapLink[];
  sourceMapCount: number;
  sourcesContentPolicy: string;
  status: "available" | "invalid" | "unsupported-version";
  unresolvedEntryCount: number;
}

export interface DocSourceMapIndexedEntry {
  artifactLinks: DocSourceMapArtifactLink[];
  classification?: string;
  diagnostics: string[];
  /**
   * 中文：普通 doc-source-map 中仅保存的 sidecar/binding 引用；不含 binding
   * model 正文。
   * English: Sidecar/binding references stored by an ordinary doc-source-map;
   * never the binding-model body.
   */
  generatedBindingRefs: DocSourceMapGeneratedBindingRef[];
  id: string;
  kind: string;
  relationKind?: string;
  sourceLinks: DocSourceMapSourceLink[];
  symbolId?: string;
  symbolKind?: string;
}

/**
 * 中文：由 doc-source-map entry 指向独立 generated-documentation-binding
 * sidecar 的最小引用。
 * English: Minimal reference from a doc-source-map entry to an independent
 * generated-documentation-binding sidecar.
 */
export interface DocSourceMapGeneratedBindingRef {
  bindingId: string;
  sidecarId: string;
}

/**
 * 中文：普通 doc-source-map 中 generated binding sidecar 的声明元数据。
 * English: Generated-binding sidecar declaration metadata in an ordinary
 * doc-source-map.
 */
export interface DocSourceMapGeneratedBindingSidecar {
  contract?: string;
  contractVersion?: string;
  id: string;
  path?: string;
}

export interface DocSourceMapSourceLink {
  confidence?: string;
  language?: string;
  path?: string;
  range?: HiaSourceRange;
  rangeSource?: string;
  sourceId: string;
}

export interface DocSourceMapArtifactLink {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  selector?: string;
}

export interface DocSourceMapSourceMapLink {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

export interface DocSourceMapQuery {
  artifactPath?: string;
  selector?: string;
  sourcePath?: string;
  position?: HiaSourcePosition;
  symbolId?: string;
  symbolKind?: string;
}

export interface DocSourceMapQueryResult {
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  matchedEntryCount: number;
  query: DocSourceMapQuery;
  status: DocSourceMapIndex["status"];
}

export type OrdinarySourceMapBias = "greatest-lower-bound" | "least-upper-bound";

export interface OrdinarySourceMapIndexOptions {
  artifactPath?: string;
  path?: string;
}

export interface OrdinarySourceMapIndex {
  artifactPath?: string;
  diagnostics: HiaDiagnostic[];
  mappingCount: number;
  path?: string;
  sources: string[];
  sourceCount: number;
  status: "available" | "invalid";
  traceMap?: TraceMap;
}

export interface OrdinarySourceMapLookupOptions {
  bias?: OrdinarySourceMapBias;
}

export interface SourceMapOriginalPosition {
  name?: string;
  position: HiaSourcePosition;
  sourcePath: string;
}

export interface SourceMapGeneratedPosition {
  artifactPath?: string;
  position: HiaSourcePosition;
}

export interface SourceMapOriginalLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition;
  original?: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceMapGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated?: SourceMapGeneratedPosition;
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceMapAllGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition[];
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceLinkedLookupQuery {
  generatedPath?: string;
  generatedPosition?: HiaSourcePosition;
  originalPosition?: HiaSourcePosition;
  originalSourcePath?: string;
  selector?: string;
  symbolId?: string;
  symbolKind?: string;
}

export interface SourceLinkedLookupResult {
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  generated?: SourceMapGeneratedPosition;
  matchedEntryCount: number;
  original?: SourceMapOriginalPosition;
  query: SourceLinkedLookupQuery;
  status: DocSourceMapIndex["status"] | OrdinarySourceMapIndex["status"] | "unmapped";
}

interface IndexedNode {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

/**
 * 中文：从不受信任的 doc-source-map manifest 建立只读查询索引，并把结构、引用、路径、
 * privacy 与版本问题统一投影为 diagnostics。该函数只消费调用方显式提供的 JSON 值：不会
 * 读取 sourceMappingURL、generated binding sidecar 正文或 sourcesContent。
 *
 * English: Builds a read-only query index from an untrusted doc-source-map
 * manifest and projects structure, reference, path, privacy, and version issues
 * into diagnostics. It consumes only caller-provided JSON and never reads a
 * sourceMappingURL, generated-binding sidecar body, or sourcesContent.
 *
 * @lang zh-CN 输入是 manifest 的未知运行时值；`options.path` 只用于 diagnostic 定位。
 * 索引保留 ordinary doc-source-map 的最小 sidecar reference，完整 binding model 始终
 * 留在独立 artifact，防止普通 map 意外承载 binding 正文或私有源码。
 * @lang en Input is an unknown runtime manifest value; `options.path` is used
 * only to locate diagnostics. The index retains ordinary doc-source-map minimal
 * sidecar references, while the complete binding model stays in its independent
 * artifact to prevent a normal map from carrying binding bodies or private source.
 *
 * @param value <lang><zh-CN>待验证的 manifest 运行时值。</zh-CN><en>Runtime manifest value to validate.</en></lang>
 * @param options <lang><zh-CN>可选 diagnostic 路径上下文；默认空对象。</zh-CN><en>Optional diagnostic path context; defaults to an empty object.</en></lang>
 * @returns <lang><zh-CN>可查询的索引；即使无效输入也返回带 diagnostics 的安全空索引。</zh-CN><en>Queryable index; invalid input still returns a safe empty index with diagnostics.</en></lang>
 */
export function createDocSourceMapIndex(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapIndex {
  // <lang><zh-CN>诊断序列是本函数唯一的可观察验证副产物；后续 status 只能由它推导。</zh-CN><en>The diagnostic sequence is this function's sole observable validation byproduct; later status must be derived from it.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  // <lang><zh-CN>先拒绝非对象，避免后续属性读取绕过 manifest 边界或抛出未结构化异常。</zh-CN><en>Reject non-objects first so later property reads cannot bypass the manifest boundary or throw an unstructured exception.</en></lang>
  if (!isRecord(value)) {
    // <lang><zh-CN>使用 source-linkage diagnostic 保留调用方 path，但不回显输入正文。</zh-CN><en>Use a source-linkage diagnostic that preserves caller path without echoing input bodies.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest must be a JSON object.",
      "error",
      options.path
    ));

    // <lang><zh-CN>无效根节点必须返回同一 index 形状，保证调用方不需要特殊空值分支。</zh-CN><en>An invalid root must return the same index shape so callers need no special null branch.</en></lang>
    return createEmptyIndex({
      diagnostics,
      ...(options.path ? { path: options.path } : {}),
      status: "invalid"
    });
  }

  // <lang><zh-CN>contract 标识确认该 JSON 属于 doc-source-map；错误不阻止收集其余可诊断结构。</zh-CN><en>The contract identifier confirms the JSON is a doc-source-map; an error does not stop collection of other diagnosable structure.</en></lang>
  if (value.contract !== DOC_SOURCE_MAP_CONTRACT) {
    // <lang><zh-CN>仅在 diagnostic data 中归一化 contract 文本，缺失值保持空字符串而不是原始对象。</zh-CN><en>Normalize contract text only in diagnostic data; a missing value remains an empty string rather than the raw object.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest contract must be doc-source-map.",
      "error",
      options.path,
      {
        contract: stringValue(value.contract) ?? ""
      }
    ));
  }

  // <lang><zh-CN>contractVersion 是版本兼容性判定的可选文本，不把非字符串值转换为可用版本。</zh-CN><en>contractVersion is optional text for compatibility decisions; non-string values are not coerced into usable versions.</en></lang>
  const contractVersion = stringValue(value.contractVersion);
  // <lang><zh-CN>版本不匹配时继续建立索引，以便调用方同时获得结构问题与 unsupported-version 状态。</zh-CN><en>Continue building when versions differ so callers receive both structural issues and unsupported-version status.</en></lang>
  if (contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSUPPORTED_VERSION",
      `doc-source-map contractVersion should be ${DOC_SOURCE_MAP_CONTRACT_VERSION}.`,
      contractVersion ? "warning" : "error",
      options.path,
      {
        contractVersion: contractVersion ?? ""
      }
    ));
  }

  // <lang><zh-CN>privacy 是可选对象；非对象时回退空策略，后续默认禁止嵌入内容。</zh-CN><en>privacy is optional object data; non-objects fall back to an empty policy whose later default blocks embedded content.</en></lang>
  const privacy = isRecord(value.privacy) ? value.privacy : {};
  // <lang><zh-CN>sourcesContentPolicy 决定 source 条目能否声明嵌入正文；默认 none 是隐私保守值。</zh-CN><en>sourcesContentPolicy decides whether source entries may declare embedded bodies; default none is the privacy-conservative value.</en></lang>
  const sourcesContentPolicy = stringValue(privacy.sourcesContentPolicy) ?? "none";
  // <lang><zh-CN>artifacts 是供 entry artifact reference 解析的最小节点集合。</zh-CN><en>artifacts is the minimal node collection used to resolve entry artifact references.</en></lang>
  const artifacts = collectIndexedNodes(value.artifacts);
  // <lang><zh-CN>sources 是供 entry source reference 解析的最小节点集合，不包含 source 正文。</zh-CN><en>sources is the minimal node collection used to resolve entry source references and contains no source body.</en></lang>
  const sources = collectIndexedNodes(value.sources);
  // <lang><zh-CN>sourceMaps 只投影 ordinary source map 链接元数据，不能替代完整 binding model。</zh-CN><en>sourceMaps projects ordinary source-map link metadata only and cannot substitute for a complete binding model.</en></lang>
  const sourceMaps = collectIndexedNodes(value.sourceMaps).map(indexedNodeToSourceMapLink);
  // <lang><zh-CN>bindingSidecars 只声明独立 artifact；本函数不加载其 body，维持 sidecar privacy 边界。</zh-CN><en>bindingSidecars declares independent artifacts only; this function does not load their bodies, preserving the sidecar privacy boundary.</en></lang>
  const bindingSidecars = collectGeneratedBindingSidecars(value.generatedBindingSidecars);
  // <lang><zh-CN>artifactById 为 entry 校验提供稳定 O(1) 身份查找。</zh-CN><en>artifactById provides stable O(1) identity lookup for entry validation.</en></lang>
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  // <lang><zh-CN>sourceById 为 source range 与来源链接建立独立查找表，不能与 artifact identity 混用。</zh-CN><en>sourceById establishes an independent lookup for source ranges and links and must not be conflated with artifact identity.</en></lang>
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  // <lang><zh-CN>bindingSidecarById 只验证最小 sidecar reference 是否已声明，不解析 binding 内容。</zh-CN><en>bindingSidecarById validates only whether a minimal sidecar reference was declared and never parses binding content.</en></lang>
  const bindingSidecarById = new Map(bindingSidecars.map((sidecar) => [sidecar.id, sidecar]));

  // <lang><zh-CN>先检查所有可公开路径，防止 artifact、source、map 或 sidecar 任一边界引入绝对/越界路径。</zh-CN><en>Check every public path first so no artifact, source, map, or sidecar boundary introduces an absolute or escaping path.</en></lang>
  collectPathDiagnostics(diagnostics, artifacts, options.path, "artifact");
  collectPathDiagnostics(diagnostics, sources, options.path, "source");
  collectPathDiagnostics(diagnostics, sourceMaps, options.path, "sourceMap");
  collectPathDiagnostics(diagnostics, bindingSidecars, options.path, "generated binding sidecar");
  // <lang><zh-CN>随后核验 contract reference、sidecar 声明与 sourcesContent policy，保持普通 map 只含 reference 的不变量。</zh-CN><en>Then validate contract references, sidecar declarations, and sourcesContent policy, preserving the invariant that ordinary maps hold references only.</en></lang>
  collectContractRefDiagnostics(diagnostics, value.artifacts, options.path);
  collectGeneratedBindingSidecarDiagnostics(diagnostics, value.generatedBindingSidecars, options.path);
  collectSourcesContentDiagnostics(diagnostics, value.sources, sourcesContentPolicy, options.path);
  // <lang><zh-CN>manifest 自带 diagnostic 仅被归一化为安全 HIA diagnostic，不信任其原始形状。</zh-CN><en>Manifest-supplied diagnostics are normalized into safe HIA diagnostics only; their raw shape is not trusted.</en></lang>
  diagnostics.push(...normalizeManifestDiagnostics(value.diagnostics, options.path));

  // <lang><zh-CN>entries 只能从对象数组创建；每一项通过三张身份表解析 source、artifact 与 sidecar reference。</zh-CN><en>entries can be created only from an object array; each item resolves source, artifact, and sidecar references through the three identity maps.</en></lang>
  const entries = Array.isArray(value.entries)
    ? value.entries.filter(isRecord).map((entry, index) => createIndexedEntry(entry, index, sourceById, artifactById, bindingSidecarById, diagnostics, options.path))
    : [];

  // <lang><zh-CN>非数组 entries 必须显式诊断，而不是把缺失误报为零条有效 entry。</zh-CN><en>Non-array entries must be diagnosed explicitly rather than misreporting absence as zero valid entries.</en></lang>
  if (!Array.isArray(value.entries)) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest entries must be an array.",
      "error",
      appendTarget(options.path, "entries")
    ));
  }

  // <lang><zh-CN>hasErrors 汇总所有 error severity，是最终 invalid 状态的唯一硬条件。</zh-CN><en>hasErrors aggregates every error severity and is the sole hard condition for final invalid status.</en></lang>
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  // <lang><zh-CN>unsupportedVersion 只在结构无错误时生效，避免覆盖更严重的 invalid 结论。</zh-CN><en>unsupportedVersion applies only when structure has no errors, avoiding replacement of the more severe invalid conclusion.</en></lang>
  const unsupportedVersion = contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && !hasErrors;

  // <lang><zh-CN>id 是可选 manifest 身份；空或非字符串值不进入返回索引。</zh-CN><en>id is optional manifest identity; empty or non-string values do not enter the returned index.</en></lang>
  const id = stringValue(value.id);

  // <lang><zh-CN>最终对象只暴露已归一化 metadata、引用和 diagnostics；它不持有 manifest 原文、sidecar body 或 sourcesContent。</zh-CN><en>The final object exposes normalized metadata, references, and diagnostics only; it holds no manifest body, sidecar body, or sourcesContent.</en></lang>
  return {
    artifactCount: artifacts.length,
    bindingSidecarCount: bindingSidecars.length,
    bindingSidecars,
    contract: DOC_SOURCE_MAP_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics,
    entries,
    entryCount: entries.length,
    ...(id ? { id } : {}),
    linkedEntryCount: entries.filter(isLinkedEntry).length,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: sources.length,
    sourceMaps,
    sourceMapCount: sourceMaps.length,
    sourcesContentPolicy,
    status: hasErrors ? "invalid" : unsupportedVersion ? "unsupported-version" : "available",
    unresolvedEntryCount: entries.filter((entry) => !isLinkedEntry(entry)).length
  };
}

export function validateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): HiaDiagnostic[] {
  return createDocSourceMapIndex(value, options).diagnostics;
}

/**
 * 建立普通 source map 查询索引。输入由调用方显式提供，本函数不抓取 sourceMappingURL，也不暴露 sourcesContent。
 * Build an ordinary source map lookup index. The caller provides the map explicitly; this helper does not fetch sourceMappingURL or expose sourcesContent.
 */
export function createOrdinarySourceMapIndex(value: SourceMapInput | unknown, options: OrdinarySourceMapIndexOptions = {}): OrdinarySourceMapIndex {
  const diagnostics: HiaDiagnostic[] = [];

  try {
    const traceMap = new TraceMap(value as SourceMapInput, options.path ?? null);
    let mappingCount = 0;
    eachMapping(traceMap, () => {
      mappingCount += 1;
    });

    const sources = traceMap.sources
      .map((source) => typeof source === "string" ? normalizeLookupPath(source) : "")
      .filter((source) => source.length > 0);

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount,
      ...(options.path ? { path: options.path } : {}),
      sources,
      sourceCount: sources.length,
      status: "available",
      traceMap
    };
  } catch (error) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "ORDINARY_SOURCE_MAP_INVALID",
      `ordinary source map could not be parsed: ${errorMessage(error)}`,
      "error",
      options.path
    ));

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount: 0,
      ...(options.path ? { path: options.path } : {}),
      sources: [],
      sourceCount: 0,
      status: "invalid"
    };
  }
}

/**
 * 查询 doc-source-map 索引中的文档化语义链路。
 * Query documentation linkage entries from a doc-source-map index.
 */
export function queryDocSourceMapIndex(index: DocSourceMapIndex, query: DocSourceMapQuery = {}): DocSourceMapQueryResult {
  const entries = index.entries.filter((entry) => matchesDocSourceMapQuery(entry, query));

  return {
    diagnostics: index.diagnostics,
    entries,
    matchedEntryCount: entries.length,
    query,
    status: index.status
  };
}

export function findDocSourceMapEntriesBySymbol(index: DocSourceMapIndex, symbolId: string): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, { symbolId }).entries;
}

export function findDocSourceMapEntriesBySource(
  index: DocSourceMapIndex,
  sourcePath: string,
  position?: HiaSourcePosition
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    sourcePath,
    ...(position ? { position } : {})
  }).entries;
}

export function findDocSourceMapEntriesByArtifact(
  index: DocSourceMapIndex,
  artifactPath: string,
  selector?: string
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    artifactPath,
    ...(selector ? { selector } : {})
  }).entries;
}

/**
 * 从生成位置追溯到原始源码位置。
 * Trace a generated position back to the original source position.
 */
export function findOriginalPositionForGenerated(
  index: OrdinarySourceMapIndex,
  generatedPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapOriginalLookupResult {
  const generated = createGeneratedPosition(index.artifactPath, generatedPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: index.status
    };
  }

  const original = originalPositionFor(index.traceMap, {
    line: generatedPosition.line,
    column: hiaColumnToSourceMapColumn(generatedPosition.column),
    bias: toTraceMapBias(options.bias)
  });

  if (!original.source || !original.line || original.column === null) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated,
    original: {
      ...(original.name ? { name: original.name } : {}),
      position: {
        line: original.line,
        column: sourceMapColumnToHiaColumn(original.column)
      },
      sourcePath: normalizeLookupPath(original.source)
    },
    status: index.status
  };
}

/**
 * 从原始源码位置查找一个生成位置。
 * Find one generated position for an original source position.
 */
export function findGeneratedPositionForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapGeneratedLookupResult {
  const original = createOriginalPosition(sourcePath, originalPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: index.status
    };
  }

  const generated = generatedPositionFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: originalPosition.line,
    column: hiaColumnToSourceMapColumn(originalPosition.column),
    bias: toTraceMapBias(options.bias)
  });

  if (!generated.line || generated.column === null) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated: createGeneratedPosition(index.artifactPath, {
      line: generated.line,
      column: sourceMapColumnToHiaColumn(generated.column)
    }),
    original,
    status: index.status
  };
}

/**
 * 从原始源码位置查找全部生成位置。
 * Find all generated positions for an original source position.
 */
export function findAllGeneratedPositionsForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapAllGeneratedLookupResult {
  const original = createOriginalPosition(sourcePath, originalPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated: [],
      original,
      status: index.status
    };
  }

  const generated = allGeneratedPositionsFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: originalPosition.line,
    column: hiaColumnToSourceMapColumn(originalPosition.column),
    bias: toTraceMapBias(options.bias)
  }).map((position) => createGeneratedPosition(index.artifactPath, {
    line: position.line,
    column: sourceMapColumnToHiaColumn(position.column)
  }));

  return {
    diagnostics: index.diagnostics,
    generated,
    original,
    status: generated.length > 0 ? index.status : "unmapped"
  };
}

/**
 * 联合 ordinary source map 与 doc-source-map，回答生成物位置对应的文档化语义。
 * Combine ordinary source map and doc-source-map lookup to answer documentation semantics for a generated artifact position.
 */
export function querySourceLinkedPosition(
  docSourceMapIndex: DocSourceMapIndex,
  ordinarySourceMapIndex: OrdinarySourceMapIndex,
  query: SourceLinkedLookupQuery
): SourceLinkedLookupResult {
  let original: SourceMapOriginalPosition | undefined;
  let generated: SourceMapGeneratedPosition | undefined;
  let status: SourceLinkedLookupResult["status"] = docSourceMapIndex.status;

  if (query.generatedPosition) {
    const generatedLookup = findOriginalPositionForGenerated(ordinarySourceMapIndex, query.generatedPosition);
    original = generatedLookup.original;
    generated = createGeneratedPosition(query.generatedPath ?? generatedLookup.generated.artifactPath, query.generatedPosition);
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  if (query.originalSourcePath && query.originalPosition) {
    original = createOriginalPosition(query.originalSourcePath, query.originalPosition);
    const generatedLookup = findGeneratedPositionForOriginal(ordinarySourceMapIndex, query.originalSourcePath, query.originalPosition);
    generated = generatedLookup.generated;
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  const docQuery: DocSourceMapQuery = {
    ...(query.symbolId ? { symbolId: query.symbolId } : {}),
    ...(query.symbolKind ? { symbolKind: query.symbolKind } : {}),
    ...(original ? { sourcePath: original.sourcePath, position: original.position } : {}),
    ...(generated?.artifactPath ?? query.generatedPath ? { artifactPath: generated?.artifactPath ?? query.generatedPath } : {}),
    ...(query.selector ? { selector: query.selector } : {})
  };
  const docQueryResult = queryDocSourceMapIndex(docSourceMapIndex, docQuery);

  return {
    diagnostics: [
      ...docQueryResult.diagnostics,
      ...ordinarySourceMapIndex.diagnostics
    ],
    entries: docQueryResult.entries,
    ...(generated ? { generated } : {}),
    matchedEntryCount: docQueryResult.matchedEntryCount,
    ...(original ? { original } : {}),
    query,
    status
  };
}

function createIndexedEntry(
  entry: Record<string, unknown>,
  index: number,
  sourceById: Map<string, IndexedNode>,
  artifactById: Map<string, IndexedNode>,
  bindingSidecarById: Map<string, IndexedNode>,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocSourceMapIndexedEntry {
  const id = stringValue(entry.id) ?? `entry:${index + 1}`;
  const sourceLinks = Array.isArray(entry.sourceRefs)
    ? entry.sourceRefs.filter(isRecord).map((sourceRef) => createSourceLink(sourceRef, sourceById))
    : [];
  const artifactLinks = Array.isArray(entry.artifactRefs)
    ? entry.artifactRefs.filter(isRecord).map((artifactRef) => createArtifactLink(artifactRef, artifactById))
    : [];
  const generatedBindingRefs = Array.isArray(entry.generatedBindingRefs)
    ? entry.generatedBindingRefs.filter(isRecord).flatMap((bindingRef) => {
      const bindingId = stringValue(bindingRef.bindingId);
      const sidecarId = stringValue(bindingRef.sidecarId);
      return bindingId && sidecarId ? [{ bindingId, sidecarId }] : [];
    })
    : [];

  for (const sourceRef of Array.isArray(entry.sourceRefs) ? entry.sourceRefs.filter(isRecord) : []) {
    const sourceId = stringValue(sourceRef.sourceId);
    if (sourceId && !sourceById.has(sourceId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown source "${sourceId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.sourceRefs`),
        {
          entryId: id,
          sourceId
        }
      ));
    }
  }

  for (const artifactRef of Array.isArray(entry.artifactRefs) ? entry.artifactRefs.filter(isRecord) : []) {
    const artifactId = stringValue(artifactRef.artifactId);
    if (artifactId && !artifactById.has(artifactId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown artifact "${artifactId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.artifactRefs`),
        {
          artifactId,
          entryId: id
        }
      ));
    }
  }

  for (const bindingRef of Array.isArray(entry.generatedBindingRefs) ? entry.generatedBindingRefs.filter(isRecord) : []) {
    const bindingId = stringValue(bindingRef.bindingId);
    const sidecarId = stringValue(bindingRef.sidecarId);
    if (!bindingId || !sidecarId || !bindingSidecarById.has(sidecarId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_BINDING_SIDECAR_UNRESOLVED",
        "doc-source-map generated binding reference must name a bindingId and declared sidecarId.",
        "warning",
        appendTarget(targetPath, `entries.${index}.generatedBindingRefs`),
        {
          bindingId: bindingId ?? "",
          entryId: id,
          sidecarId: sidecarId ?? ""
        }
      ));
    }
  }

  const item: DocSourceMapIndexedEntry = {
    artifactLinks,
    diagnostics: collectEntryDiagnosticCodes(entry.diagnostics),
    generatedBindingRefs,
    id,
    kind: stringValue(entry.kind) ?? "entry",
    sourceLinks
  };
  const classification = stringValue(entry.classification);
  const relationKind = stringValue(entry.relationKind);
  const symbolId = stringValue(entry.symbolId);
  const symbolKind = stringValue(entry.symbolKind);

  if (classification) {
    item.classification = classification;
  }

  if (relationKind) {
    item.relationKind = relationKind;
  }

  if (symbolId) {
    item.symbolId = symbolId;
  }

  if (symbolKind) {
    item.symbolKind = symbolKind;
  }

  return item;
}

function createSourceLink(sourceRef: Record<string, unknown>, sourceById: Map<string, IndexedNode>): DocSourceMapSourceLink {
  const sourceId = stringValue(sourceRef.sourceId) ?? "";
  const source = sourceById.get(sourceId);
  const link: DocSourceMapSourceLink = {
    sourceId
  };
  const confidence = stringValue(sourceRef.confidence);
  const range = normalizeRange(sourceRef.range);
  const rangeSource = stringValue(sourceRef.rangeSource);

  if (confidence) {
    link.confidence = confidence;
  }

  if (source?.language) {
    link.language = source.language;
  }

  if (source?.path) {
    link.path = source.path;
  }

  if (range) {
    link.range = range;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  return link;
}

function createArtifactLink(artifactRef: Record<string, unknown>, artifactById: Map<string, IndexedNode>): DocSourceMapArtifactLink {
  const artifactId = stringValue(artifactRef.artifactId) ?? "";
  const artifact = artifactById.get(artifactId);
  const link: DocSourceMapArtifactLink = {
    artifactId
  };
  const confidence = stringValue(artifactRef.confidence);
  const rangeSource = stringValue(artifactRef.rangeSource);
  const selector = stringValue(artifactRef.selector);

  if (artifact?.language) {
    link.language = artifact.language;
  }

  if (artifact?.path) {
    link.path = artifact.path;
  }

  if (selector) {
    link.selector = selector;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  if (confidence) {
    link.confidence = confidence;
  }

  return link;
}

function isLinkedEntry(entry: DocSourceMapIndexedEntry): boolean {
  const hasUsableSource = entry.sourceLinks.some((link) => link.sourceId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");
  const hasUsableArtifact = entry.artifactLinks.some((link) => link.artifactId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");

  return hasUsableSource && hasUsableArtifact;
}

function matchesDocSourceMapQuery(entry: DocSourceMapIndexedEntry, query: DocSourceMapQuery): boolean {
  if (query.symbolId && entry.symbolId !== query.symbolId) {
    return false;
  }

  if (query.symbolKind && entry.symbolKind !== query.symbolKind) {
    return false;
  }

  if (query.sourcePath) {
    const sourcePath = query.sourcePath;
    if (!entry.sourceLinks.some((link) => pathsEqual(link.path, sourcePath) && (!query.position || containsPosition(link.range, query.position)))) {
      return false;
    }
  }

  if (query.artifactPath) {
    const artifactPath = query.artifactPath;
    if (!entry.artifactLinks.some((link) => pathsEqual(link.path, artifactPath) && (!query.selector || link.selector === query.selector))) {
      return false;
    }
  }

  return true;
}

function containsPosition(range: HiaSourceRange | undefined, position: HiaSourcePosition): boolean {
  if (!range) {
    return false;
  }

  return comparePositions(position, range.start) >= 0 && comparePositions(position, range.end) <= 0;
}

function comparePositions(left: HiaSourcePosition, right: HiaSourcePosition): number {
  if (left.line !== right.line) {
    return left.line - right.line;
  }

  return (left.column ?? 0) - (right.column ?? 0);
}

function createOriginalPosition(sourcePath: string, position: HiaSourcePosition): SourceMapOriginalPosition {
  return {
    position,
    sourcePath: normalizeLookupPath(sourcePath)
  };
}

function createGeneratedPosition(artifactPath: string | undefined, position: HiaSourcePosition): SourceMapGeneratedPosition {
  return {
    ...(artifactPath ? { artifactPath: normalizeLookupPath(artifactPath) } : {}),
    position
  };
}

function hiaColumnToSourceMapColumn(column: number | undefined): number {
  return Math.max(0, (column ?? 1) - 1);
}

function sourceMapColumnToHiaColumn(column: number): number {
  return column + 1;
}

function toTraceMapBias(value: OrdinarySourceMapBias | undefined): Bias {
  return value === "least-upper-bound" ? LEAST_UPPER_BOUND : GREATEST_LOWER_BOUND;
}

function pathsEqual(left: string | undefined, right: string): boolean {
  return typeof left === "string" && normalizeLookupPath(left) === normalizeLookupPath(right);
}

function normalizeLookupPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function collectIndexedNodes(value: unknown): IndexedNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => {
      const node: IndexedNode = {
        id: stringValue(item.id) ?? `node:${index + 1}`
      };
      const kind = stringValue(item.kind);
      const language = stringValue(item.language);
      const itemPath = stringValue(item.path);

      if (kind) {
        node.kind = kind;
      }

      if (language) {
        node.language = language;
      }

      if (itemPath) {
        node.path = itemPath;
      }

      return node;
    });
}

function collectGeneratedBindingSidecars(value: unknown): DocSourceMapGeneratedBindingSidecar[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => {
      const sidecar: DocSourceMapGeneratedBindingSidecar = {
        id: stringValue(item.id) ?? `generated-binding-sidecar:${index + 1}`
      };
      const contract = stringValue(item.contract);
      const contractVersion = stringValue(item.contractVersion);
      const sidecarPath = stringValue(item.path);

      if (contract) {
        sidecar.contract = contract;
      }
      if (contractVersion) {
        sidecar.contractVersion = contractVersion;
      }
      if (sidecarPath) {
        sidecar.path = sidecarPath;
      }

      return sidecar;
    });
}

function indexedNodeToSourceMapLink(node: IndexedNode): DocSourceMapSourceMapLink {
  return {
    id: node.id,
    ...(node.kind ? { kind: node.kind } : {}),
    ...(node.language ? { language: node.language } : {}),
    ...(node.path ? { path: node.path } : {})
  };
}

function collectPathDiagnostics(diagnostics: HiaDiagnostic[], nodes: IndexedNode[], targetPath: string | undefined, kind: string): void {
  for (const node of nodes) {
    if (!node.path || !isUnsafeRelativePath(node.path)) {
      continue;
    }

    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSAFE_PATH",
      `doc-source-map ${kind} path must be a safe relative path.`,
      "error",
      targetPath,
      {
        id: node.id,
        path: node.path
      }
    ));
  }
}

function collectContractRefDiagnostics(diagnostics: HiaDiagnostic[], artifacts: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(artifacts)) {
    return;
  }

  artifacts.filter(isRecord).forEach((artifact, artifactIndex) => {
    const refs = Array.isArray(artifact.contractRefs) ? artifact.contractRefs : [];

    refs.filter(isRecord).forEach((ref, refIndex) => {
      const refPath = stringValue(ref.path);
      if (!refPath || !isUnsafeRelativePath(refPath)) {
        return;
      }

      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "doc-source-map contractRef path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `artifacts.${artifactIndex}.contractRefs.${refIndex}.path`),
        {
          path: refPath
        }
      ));
    });
  });
}

/**
 * 中文：只校验 doc-source-map 对 generated binding sidecar 的声明，不读取
 * sidecar 本体；完整 binding model 始终保持在独立 artifact。
 * English: Validates only doc-source-map declarations of generated-binding
 * sidecars without reading their bodies; the complete binding model remains in
 * the independent artifact.
 */
function collectGeneratedBindingSidecarDiagnostics(diagnostics: HiaDiagnostic[], sidecars: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(sidecars)) {
    return;
  }
  const ids = new Set<string>();
  sidecars.filter(isRecord).forEach((sidecar, index) => {
    const id = stringValue(sidecar.id);
    const sidecarPath = stringValue(sidecar.path);
    if (!id || ids.has(id) || sidecar.contract !== GENERATED_DOCUMENTATION_BINDING_CONTRACT || sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_BINDING_SIDECAR_INVALID",
        "generated binding sidecar must have a unique id and the supported contract/version.",
        "error",
        appendTarget(targetPath, `generatedBindingSidecars.${index}`)
      ));
    }
    if (id) {
      ids.add(id);
    }
    if (!sidecarPath || isUnsafeRelativePath(sidecarPath)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "generated binding sidecar path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `generatedBindingSidecars.${index}.path`)
      ));
    }
  });
}

function collectSourcesContentDiagnostics(
  diagnostics: HiaDiagnostic[],
  sources: unknown,
  manifestPolicy: string,
  targetPath: string | undefined
): void {
  if (!Array.isArray(sources)) {
    return;
  }

  sources.filter(isRecord).forEach((source, index) => {
    const sourcePolicy = stringValue(source.sourcesContentPolicy) ?? manifestPolicy;
    const embedsContent = typeof source.content === "string" || Array.isArray(source.sourcesContent);

    if (!embedsContent || sourcePolicy === "embed" || sourcePolicy === "redacted") {
      return;
    }

    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_SOURCES_CONTENT_BLOCKED",
      "doc-source-map source content is blocked unless sourcesContentPolicy explicitly opts in.",
      "error",
      appendTarget(targetPath, `sources.${index}`),
      {
        sourcesContentPolicy: sourcePolicy
      }
    ));
  });
}

function normalizeManifestDiagnostics(value: unknown, targetPath: string | undefined): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      return [createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC",
        item,
        "info",
        appendTarget(targetPath, `diagnostics.${index}`),
        {
          sourceDiagnostic: item
        }
      )];
    }

    if (!isRecord(item)) {
      return [];
    }

    const code = stringValue(item.code) ?? "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC";
    const severity = normalizeSeverity(item.severity);
    const message = stringValue(item.message) ?? code;

    return [createSourceLinkageDiagnostic(code, message, severity, appendTarget(targetPath, `diagnostics.${index}`))];
  });
}

function collectEntryDiagnosticCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        return stringValue(item.code);
      }

      return undefined;
    })
    .filter((item): item is string => Boolean(item));
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
    start: {
      line: startLine
    },
    end: {
      line: endLine
    }
  };
  const startColumn = numberValue(value.start.column);
  const endColumn = numberValue(value.end.column);

  if (startColumn) {
    range.start.column = startColumn;
  }

  if (endColumn) {
    range.end.column = endColumn;
  }

  return range;
}

function createEmptyIndex(options: {
  diagnostics: HiaDiagnostic[];
  path?: string;
  status: DocSourceMapIndex["status"];
}): DocSourceMapIndex {
  return {
    artifactCount: 0,
    bindingSidecarCount: 0,
    bindingSidecars: [],
    contract: DOC_SOURCE_MAP_CONTRACT,
    diagnostics: options.diagnostics,
    entries: [],
    entryCount: 0,
    linkedEntryCount: 0,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: 0,
    sourceMaps: [],
    sourceMapCount: 0,
    sourcesContentPolicy: "none",
    status: options.status,
    unresolvedEntryCount: 0
  };
}

function normalizeSeverity(value: unknown): HiaDiagnosticSeverity {
  return value === "error" || value === "warning" || value === "info" ? value : "info";
}

function isUnsafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function appendTarget(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

function createSourceLinkageDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
