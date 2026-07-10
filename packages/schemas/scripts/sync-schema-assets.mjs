import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HIA_PROJECT_MANIFEST_JSON_SCHEMA,
  HIA_PROJECT_MANIFEST_SCHEMA_VERSION
} from "../../config/dist/index.js";
import {
  HIA_DOCUMENT_SCHEMA,
  HIA_DOCUMENT_SCHEMA_VERSION
} from "../../core/dist/index.js";
import {
  HIA_PROFILE_JSON_SCHEMA,
  HIA_PROFILE_SCHEMA_VERSION
} from "../../profile/dist/index.js";
import {
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA
} from "../../plugin-sdk/dist/index.js";
import {
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_VERSION
} from "../../source-linkage/dist/index.js";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(packageDir, "src");
const schemaDir = path.join(sourceDir, "schemas");
const checkOnly = process.argv.includes("--check");
const publicBaseUrl = "https://mandolin.github.io/HIA-Documentation/schemas/";

const definitions = [
  {
    contractVersion: HIA_PROFILE_SCHEMA_VERSION,
    fileName: "documentation-profile.schema.json",
    key: "documentation-profile",
    ownerPackage: "@hia-doc/profile",
    schema: HIA_PROFILE_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
    fileName: "documentation-producer.schema.json",
    key: "documentation-producer",
    ownerPackage: "@hia-doc/plugin-sdk",
    schema: DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    fileName: "documentation-producer-result.schema.json",
    key: "documentation-producer-result",
    ownerPackage: "@hia-doc/plugin-sdk",
    schema: DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOC_SOURCE_MAP_SCHEMA_VERSION,
    fileName: "doc-source-map.schema.json",
    key: "doc-source-map",
    ownerPackage: "@hia-doc/source-linkage",
    schema: DOC_SOURCE_MAP_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: HIA_DOCUMENT_SCHEMA_VERSION,
    fileName: "hia-document.schema.json",
    key: "hia-document",
    ownerPackage: "@hia-doc/core",
    schema: HIA_DOCUMENT_SCHEMA,
    stability: "active-pre-1.0"
  },
  {
    contractVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
    fileName: "project-manifest.schema.json",
    key: "project-manifest",
    ownerPackage: "@hia-doc/config",
    schema: HIA_PROJECT_MANIFEST_JSON_SCHEMA,
    stability: "draft"
  }
];

const catalog = {
  catalogVersion: "0.1.0-draft",
  publicBaseUrl,
  schemas: definitions.map((definition) => ({
    contractVersion: definition.contractVersion,
    key: definition.key,
    ownerPackage: definition.ownerPackage,
    path: `./${definition.fileName}`,
    publicUrl: definition.schema.$id,
    schemaId: definition.schema.$id,
    stability: definition.stability
  }))
};

await mkdir(schemaDir, { recursive: true });

for (const definition of definitions) {
  await syncJson(path.join(schemaDir, definition.fileName), definition.schema);
}
await syncJson(path.join(sourceDir, "catalog.json"), catalog);

console.log(`Schema assets ${checkOnly ? "check" : "sync"} passed: ${definitions.length} schemas.`);

async function syncJson(filePath, value) {
  const expected = `${JSON.stringify(value, null, 2)}\n`;

  if (checkOnly) {
    const actual = await readFile(filePath, "utf8").catch(() => "");
    if (actual !== expected) {
      throw new Error(`Schema distribution asset is out of date: ${path.relative(packageDir, filePath)}`);
    }
    return;
  }

  await writeFile(filePath, expected, "utf8");
}
