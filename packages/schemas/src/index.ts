import catalogData from "./catalog.json" with { type: "json" };
import documentationProfileSchemaData from "./schemas/documentation-profile.schema.json" with { type: "json" };
import documentationProducerResultSchemaData from "./schemas/documentation-producer-result.schema.json" with { type: "json" };
import documentationProducerSchemaData from "./schemas/documentation-producer.schema.json" with { type: "json" };
import docSourceMapSchemaData from "./schemas/doc-source-map.schema.json" with { type: "json" };
import hiaDocumentSchemaData from "./schemas/hia-document.schema.json" with { type: "json" };
import projectManifestSchemaData from "./schemas/project-manifest.schema.json" with { type: "json" };

export const HIA_SCHEMA_CATALOG_VERSION = "0.1.0-draft";
export const HIA_SCHEMA_PUBLIC_BASE_URL = "https://mandolin.github.io/HIA-Documentation/schemas/";
export const HIA_SCHEMA_KEYS = [
  "documentation-profile",
  "documentation-producer",
  "documentation-producer-result",
  "doc-source-map",
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
