import catalogData from "./catalog.json" with { type: "json" };
import businessFlowDocumentationSchemaData from "./schemas/business-flow-documentation.schema.json" with { type: "json" };
import businessFlowDocumentationProjectionSchemaData from "./schemas/business-flow-documentation-projection.schema.json" with { type: "json" };
import documentationProfileSchemaData from "./schemas/documentation-profile.schema.json" with { type: "json" };
import documentationProducerResultSchemaData from "./schemas/documentation-producer-result.schema.json" with { type: "json" };
import documentationProducerSchemaData from "./schemas/documentation-producer.schema.json" with { type: "json" };
import docSourceMapSchemaData from "./schemas/doc-source-map.schema.json" with { type: "json" };
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
import historicalPresentation from "./history/documentation-presentation-profile-0.1.0-draft.schema.json" with { type: "json" };
import historicalUiLocale from "./history/documentation-ui-locale-completeness-0.1.0-draft.schema.json" with { type: "json" };

export const HIA_SCHEMA_CATALOG_VERSION = "0.1.0-draft";
export const HIA_SCHEMA_PUBLIC_BASE_URL = "https://mandolin.github.io/HIA-Documentation/schemas/";
export const HIA_SCHEMA_KEYS = [
  "business-flow-documentation",
  "business-flow-documentation-projection",
  "documentation-profile",
  "documentation-producer",
  "documentation-producer-result",
  "doc-source-map",
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

export type HiaSchemaKey = typeof HIA_SCHEMA_KEYS[number];
export type HiaJsonSchema = Record<string, unknown> & {
  $id: string;
  $schema: string;
};

export interface HiaSchemaCatalogEntry {
  contractVersion: string;
  key: HiaSchemaKey;
  ownerPackage: string;
  path: string;
  publicUrl: string;
  schemaId: string;
  stability: "active-pre-1.0" | "draft";
}

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
  historicalProducerResult, historicalSourceMap, historicalPresentation, historicalUiLocale
];

export const HIA_SCHEMA_CATALOG = catalogData as HiaSchemaCatalog;

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
