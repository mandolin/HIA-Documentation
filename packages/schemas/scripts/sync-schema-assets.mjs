import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HIA_PROJECT_MANIFEST_JSON_SCHEMA,
  HIA_PROJECT_MANIFEST_SCHEMA_VERSION
} from "../../config/dist/index.js";
import {
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA,
  DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
  DOCUMENTATION_TERMINOLOGY_JSON_SCHEMA,
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
  DOCUMENTATION_QUALITY_REVIEW_JSON_SCHEMA,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
  DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA,
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
  DOC_SOURCE_MAP_SCHEMA_VERSION,
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION
} from "../../source-linkage/dist/index.js";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(packageDir, "src");
const schemaDir = path.join(sourceDir, "schemas");
const checkOnly = process.argv.includes("--check");
const publicBaseUrl = "https://mandolin.github.io/HIA-Documentation/schemas/";

const definitions = [
  // <lang><zh-CN>业务流程 schema 只承载 owner-authored 非执行事实；图语义与 code target registry 仍由 core pure validator/producer 校验。</zh-CN><en>The business-flow schema carries only owner-authored non-executable facts; core's pure validator/producer still enforces graph semantics and the code-target registry.</en></lang>
  {
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
    fileName: "business-flow-documentation.schema.json",
    key: "business-flow-documentation",
    ownerPackage: "@hia-doc/core",
    schema: BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA,
    stability: "draft"
  },
  // <lang><zh-CN>双视图投影共享一份 public facts；schema 不携带 Portal layout、图坐标或目标身份。</zh-CN><en>The dual-view projection shares one public fact set; its schema carries no Portal layout, graph coordinates, or target identity.</en></lang>
  {
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
    fileName: "business-flow-documentation-projection.schema.json",
    key: "business-flow-documentation-projection",
    ownerPackage: "@hia-doc/core",
    schema: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA,
    stability: "draft"
  },
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
    contractVersion: GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
    fileName: "generated-documentation-binding.schema.json",
    key: "generated-documentation-binding",
    ownerPackage: "@hia-doc/source-linkage",
    schema: GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
    fileName: "documentation-locale-resource.schema.json",
    key: "documentation-locale-resource",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION,
    fileName: "documentation-locale-resolution.schema.json",
    key: "documentation-locale-resolution",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA,
    stability: "draft"
  },
  // <lang><zh-CN>受控 declaration 与 public discovery/sidecar 共用 schema；catalog 必须同步 owner 的 privacy union，而不能只分发一个 profile 私有形状。</zh-CN><en>Controlled declarations and public discovery/sidecars share one schema; the catalog must synchronize the owner's privacy union instead of distributing a profile-private shape.</en></lang>
  {
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION,
    fileName: "documentation-locale-resource-declaration.schema.json",
    key: "documentation-locale-resource-declaration",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_JSON_SCHEMA,
    stability: "draft"
  },
  // <lang><zh-CN>candidate-set 与受控 registry 共享一个中性 terminology schema；同步器必须成为 catalog 的唯一事实来源。</zh-CN><en>Candidate sets and controlled registries share one neutral terminology schema; the synchronizer must remain the catalog's single source of truth.</en></lang>
  {
    contractVersion: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
    fileName: "documentation-terminology.schema.json",
    key: "documentation-terminology",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_TERMINOLOGY_JSON_SCHEMA,
    stability: "draft"
  },
  {
    contractVersion: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
    fileName: "documentation-quality-review.schema.json",
    key: "documentation-quality-review",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_QUALITY_REVIEW_JSON_SCHEMA,
    stability: "draft"
  },
  // <lang><zh-CN>跨 renderer presentation profile 只分发 neutral page/source/theme/privacy 语义，不承载 owner DOM、CSS 或 source body。</zh-CN><en>The cross-renderer presentation profile distributes only neutral page/source/theme/privacy semantics and carries no owner DOM, CSS, or source body.</en></lang>
  {
    contractVersion: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
    fileName: "documentation-presentation-profile.schema.json",
    key: "documentation-presentation-profile",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA,
    stability: "draft"
  },
  // <lang><zh-CN>source-comment projection 是独立 sidecar contract；普通 source map 不承载正文或完整模型。</zh-CN><en>The source-comment projection is an independent sidecar contract; ordinary source maps carry neither bodies nor the full model.</en></lang>
  {
    contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
    fileName: "documentation-source-comment-projection.schema.json",
    key: "documentation-source-comment-projection",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA,
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
