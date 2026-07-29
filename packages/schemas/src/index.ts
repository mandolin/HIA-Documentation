import catalogData from "./catalog.json" with { type: "json" };
import documentationProfileSchemaData from "./schemas/documentation-profile.schema.json" with { type: "json" };
import documentationProducerResultSchemaData from "./schemas/documentation-producer-result.schema.json" with { type: "json" };
import documentationProducerSchemaData from "./schemas/documentation-producer.schema.json" with { type: "json" };
import docSourceMapSchemaData from "./schemas/doc-source-map.schema.json" with { type: "json" };
import documentationLocaleResourceSchemaData from "./schemas/documentation-locale-resource.schema.json" with { type: "json" };
import documentationLocaleResourceDeclarationSchemaData from "./schemas/documentation-locale-resource-declaration.schema.json" with { type: "json" };
import documentationLocaleResolutionSchemaData from "./schemas/documentation-locale-resolution.schema.json" with { type: "json" };
import documentationTerminologySchemaData from "./schemas/documentation-terminology.schema.json" with { type: "json" };
import documentationQualityReviewSchemaData from "./schemas/documentation-quality-review.schema.json" with { type: "json" };
import generatedDocumentationBindingSchemaData from "./schemas/generated-documentation-binding.schema.json" with { type: "json" };
import hiaDocumentSchemaData from "./schemas/hia-document.schema.json" with { type: "json" };
import projectManifestSchemaData from "./schemas/project-manifest.schema.json" with { type: "json" };

export const HIA_SCHEMA_CATALOG_VERSION = "0.1.0-draft";
export const HIA_SCHEMA_PUBLIC_BASE_URL = "https://mandolin.github.io/HIA-Documentation/schemas/";
export const HIA_SCHEMA_KEYS = [
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
  "hia-document": hiaDocumentSchemaData,
  "project-manifest": projectManifestSchemaData
};

export const HIA_SCHEMA_CATALOG = catalogData as HiaSchemaCatalog;

export function listHiaSchemas(): HiaJsonSchema[] {
  return HIA_SCHEMA_KEYS.map((key) => structuredClone(schemasByKey[key]));
}

export function getHiaSchema(keyOrId: HiaSchemaKey | string): HiaJsonSchema | undefined {
  const byKey = schemasByKey[keyOrId as HiaSchemaKey];
  if (byKey) {
    return structuredClone(byKey);
  }

  const entry = HIA_SCHEMA_CATALOG.schemas.find((candidate) => candidate.schemaId === keyOrId);
  return entry ? structuredClone(schemasByKey[entry.key]) : undefined;
}
