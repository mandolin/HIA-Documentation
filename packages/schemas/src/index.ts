/**
 * @file
 * @lang zh-CN 分发各 owner 的当前 JSON Schema 快照及固定历史身份；新增坐标证据仍归 source-linkage 拥有，不在此推断兼容版本。
 * @lang en Distributes current owner JSON Schema snapshots and fixed historical identities; source-linkage still owns coordinate evidence, and this module does not infer compatible versions.
 */
import catalogData from "./catalog.json" with { type: "json" };
import businessFlowDocumentationSchemaData from "./schemas/business-flow-documentation.schema.json" with { type: "json" };
import businessFlowDocumentationProjectionSchemaData from "./schemas/business-flow-documentation-projection.schema.json" with { type: "json" };
import documentationProfileSchemaData from "./schemas/documentation-profile.schema.json" with { type: "json" };
import documentationProducerResultSchemaData from "./schemas/documentation-producer-result.schema.json" with { type: "json" };
import documentationProducerSchemaData from "./schemas/documentation-producer.schema.json" with { type: "json" };
import docSourceMapSchemaData from "./schemas/doc-source-map.schema.json" with { type: "json" };
import ordinarySourceMapCoordinateProfileSchemaData from "./schemas/ordinary-source-map-coordinate-profile.schema.json" with { type: "json" };
import documentationLocaleResourceSchemaData from "./schemas/documentation-locale-resource.schema.json" with { type: "json" };
import documentationLocaleResourceDeclarationSchemaData from "./schemas/documentation-locale-resource-declaration.schema.json" with { type: "json" };
import documentationLocaleResolutionSchemaData from "./schemas/documentation-locale-resolution.schema.json" with { type: "json" };
import documentationTerminologySchemaData from "./schemas/documentation-terminology.schema.json" with { type: "json" };
import documentationQualityReviewSchemaData from "./schemas/documentation-quality-review.schema.json" with { type: "json" };
import documentationPresentationProfileSchemaData from "./schemas/documentation-presentation-profile.schema.json" with { type: "json" };
import documentationUiLocaleCompletenessSchemaData from "./schemas/documentation-ui-locale-completeness.schema.json" with { type: "json" };
import documentationSourceCommentProjectionSchemaData from "./schemas/documentation-source-comment-projection.schema.json" with { type: "json" };
import generatedDocumentationBindingSchemaData from "./schemas/generated-documentation-binding.schema.json" with { type: "json" };
import hiaDocumentSchemaData from "./schemas/hia-document.schema.json" with { type: "json" };
import projectManifestSchemaData from "./schemas/project-manifest.schema.json" with { type: "json" };
import historyIndexData from "./history/index.json" with { type: "json" };
import historicalDocument from "./history/hia-document-0.2.0.schema.json" with { type: "json" };
import historicalProjectManifest from "./history/hia-project-manifest-0.1.0-draft.schema.json" with { type: "json" };
import historicalProfile from "./history/documentation-profile-0.1.0-draft.schema.json" with { type: "json" };
import historicalProducer from "./history/documentation-producer-0.1.0-draft.schema.json" with { type: "json" };
import historicalProducerResult from "./history/documentation-producer-result-0.1.0-draft.schema.json" with { type: "json" };
import historicalSourceMap from "./history/doc-source-map-0.1.0-draft.schema.json" with { type: "json" };
import historicalSourceMapV1 from "./history/doc-source-map-1.0.0.schema.json" with { type: "json" };
import historicalPresentation from "./history/documentation-presentation-profile-0.1.0-draft.schema.json" with { type: "json" };
import historicalUiLocale from "./history/documentation-ui-locale-completeness-0.1.0-draft.schema.json" with { type: "json" };
import historicalGeneratedBinding from "./history/generated-documentation-binding-0.1.0-draft.schema.json" with { type: "json" };
import historicalGeneratedBindingV02 from "./history/generated-documentation-binding-0.2.0-draft.schema.json" with { type: "json" };

/**
 * @lang zh-CN Schema目录metadata的精确草案版本，独立于每项定义的契约版本和包版本。
 * @lang en Exact draft version of schema-catalog metadata, independent of individual contract and package versions.
 */
export const HIA_SCHEMA_CATALOG_VERSION = "0.1.0-draft";
/**
 * @lang zh-CN 公开canonical schema URL的固定基址；作为metadata返回，不执行网络访问。
 * @lang en Fixed base URL for public canonical schemas, returned as metadata without network access.
 */
export const HIA_SCHEMA_PUBLIC_BASE_URL = "https://mandolin.github.io/HIA-Documentation/schemas/";
/** @lang zh-CN 与生成 catalog 顺序一致的当前 schema key；不包括历史快照。 @lang en Current schema keys in generated-catalog order, excluding historical snapshots. */
export const HIA_SCHEMA_KEYS = [
  "business-flow-documentation",
  "business-flow-documentation-projection",
  "documentation-profile",
  "documentation-producer",
  "documentation-producer-result",
  "doc-source-map",
  "ordinary-source-map-coordinate-profile",
  "generated-documentation-binding",
  "documentation-locale-resource",
  "documentation-locale-resolution",
  "documentation-locale-resource-declaration",
  "documentation-terminology",
  "documentation-quality-review",
  "documentation-presentation-profile",
  "documentation-ui-locale-completeness",
  "documentation-source-comment-projection",
  "hia-document",
  "project-manifest"
] as const;

/**
 * @lang zh-CN 当前owner schema键的闭集，不包括历史URL；历史定义通过精确schema ID读取。
 * @lang en Closed current owner-schema keys, excluding historical URLs; historical definitions are read through exact schema IDs.
 */
export type HiaSchemaKey = typeof HIA_SCHEMA_KEYS[number];
/**
 * @lang zh-CN 含$id/$schema身份的JSON Schema数据视图，不是验证后实例或运行代码。
 * @lang en JSON Schema data view with $id/$schema identity, not a validated instance or executable code.
 */
export type HiaJsonSchema = Record<string, unknown> & {
  $id: string;
  $schema: string;
};

/**
 * @lang zh-CN 每项owner定义的路径、精确版本、公开身份和成熟度；候选成熟度不代表已经发行。
 * @lang en Owner definition path, exact version, public identity and maturity; candidate maturity does not imply publication.
 */
export interface HiaSchemaCatalogEntry {
  contractVersion: string;
  key: HiaSchemaKey;
  ownerPackage: string;
  path: string;
  publicUrl: string;
  schemaId: string;
  /** @lang zh-CN 候选稳定定义与正式发行状态分离，stable-candidate不证明包已发布。 @lang en Candidate contract stability is separate from formal release status; stable-candidate does not prove package publication. */
  stability: "active-pre-1.0" | "draft" | "stable-candidate";
}

/**
 * @lang zh-CN 当前schema分发目录的metadata与条目数组，不包含历史工件正文。
 * @lang en Metadata and entries for the current schema-distribution catalog, without historical artifact bodies.
 */
export interface HiaSchemaCatalog {
  catalogVersion: string;
  publicBaseUrl: string;
  schemas: HiaSchemaCatalogEntry[];
}

const schemasByKey: Readonly<Record<HiaSchemaKey, HiaJsonSchema>> = {
  "business-flow-documentation": businessFlowDocumentationSchemaData,
  "business-flow-documentation-projection": businessFlowDocumentationProjectionSchemaData,
  "documentation-profile": documentationProfileSchemaData,
  "documentation-producer": documentationProducerSchemaData,
  "documentation-producer-result": documentationProducerResultSchemaData,
  "doc-source-map": docSourceMapSchemaData,
  "ordinary-source-map-coordinate-profile": ordinarySourceMapCoordinateProfileSchemaData,
  "generated-documentation-binding": generatedDocumentationBindingSchemaData,
  "documentation-locale-resource": documentationLocaleResourceSchemaData,
  "documentation-locale-resolution": documentationLocaleResolutionSchemaData,
  "documentation-locale-resource-declaration": documentationLocaleResourceDeclarationSchemaData,
  "documentation-terminology": documentationTerminologySchemaData,
  "documentation-quality-review": documentationQualityReviewSchemaData,
  "documentation-presentation-profile": documentationPresentationProfileSchemaData,
  "documentation-ui-locale-completeness": documentationUiLocaleCompletenessSchemaData,
  "documentation-source-comment-projection": documentationSourceCommentProjectionSchemaData,
  "hia-document": hiaDocumentSchemaData,
  "project-manifest": projectManifestSchemaData
};

// <lang><zh-CN>历史定义按 canonical 身份独立保存，不能从会被 owner sync 覆盖的当前快照派生。</zh-CN><en>Keep historical definitions independently by canonical identity rather than deriving them from current snapshots overwritten by owner sync.</en></lang>
const historicalSchemas: readonly HiaJsonSchema[] = [
  historicalDocument, historicalProjectManifest, historicalProfile, historicalProducer,
  historicalProducerResult, historicalSourceMap, historicalSourceMapV1, historicalPresentation,
  historicalUiLocale, historicalGeneratedBinding, historicalGeneratedBindingV02
];

/**
 * @lang zh-CN 共享目录数据，调用方不得改写；未做运行时深冻结，不等于可变schema查询副本。
 * @lang en Shared catalog data that callers must not mutate; it is not deeply frozen at runtime and is distinct from copied schema-query results.
 */
export const HIA_SCHEMA_CATALOG = catalogData as HiaSchemaCatalog;

/**
 * @lang zh-CN 返回所有当前 owner schema 的独立深拷贝；不读取文件或网络，不包含历史身份。
 * @lang en Returns independent deep copies of all current owner schemas, without file or network access or historical identities.
 * @returns <lang><zh-CN>按 catalog key 顺序的当前结构定义。</zh-CN><en>Current schema definitions in catalog-key order.</en></lang>
 */
export function listHiaSchemas(): HiaJsonSchema[] {
  return HIA_SCHEMA_KEYS.map((key) => structuredClone(schemasByKey[key]));
}

/**
 * @lang zh-CN 按当前 key 或精确 canonical 身份读取 schema；历史身份保留原定义，不自动升级数据。
 * @lang en Reads a schema by current key or exact canonical identity; historical identities preserve original definitions without automatically upgrading data.
 * @param keyOrId <lang><zh-CN>当前 catalog key，或已分发的完整 schema ID；不按前缀或版本范围猜测。</zh-CN><en>Current catalog key or complete distributed schema ID, without prefix or version-range inference.</en></lang>
 * @returns <lang><zh-CN>独立深拷贝；未知身份返回 undefined。不访问文件或网络。</zh-CN><en>Independent deep copy, or undefined for unknown identities. No file or network access.</en></lang>
 */
export function getHiaSchema(keyOrId: HiaSchemaKey | string): HiaJsonSchema | undefined {
  // <lang><zh-CN>无版本 key 只匹配当前 owner 的自有属性；继承的 constructor/__proto__ 不是 schema 身份。</zh-CN><en>Unversioned keys match only the current owner's own properties; inherited constructor/__proto__ values are not schema identities.</en></lang>
  const byKey = Object.hasOwn(schemasByKey, keyOrId) ? schemasByKey[keyOrId as HiaSchemaKey] : undefined;
  if (byKey) {
    return structuredClone(byKey);
  }

  // <lang><zh-CN>精确历史 ID 优先于可变 catalog，防止升级当前项时旧身份失效或指向新定义。</zh-CN><en>Exact historical IDs precede the mutable catalog so upgrading a current entry cannot invalidate an old identity or redirect it to a new definition.</en></lang>
  const historical = historyIndexData.schemas.some((entry) => entry.schemaId === keyOrId)
    ? historicalSchemas.find((schema) => schema.$id === keyOrId)
    : undefined;
  if (historical) {
    return structuredClone(historical);
  }
  // <lang><zh-CN>尚未归档的当前身份保持原查询语义；未知值不执行隐式回退。</zh-CN><en>Current identities not yet archived retain existing lookup semantics; unknown values receive no implicit fallback.</en></lang>
  const entry = HIA_SCHEMA_CATALOG.schemas.find((candidate) => candidate.schemaId === keyOrId);
  return entry ? structuredClone(schemasByKey[entry.key]) : undefined;
}
