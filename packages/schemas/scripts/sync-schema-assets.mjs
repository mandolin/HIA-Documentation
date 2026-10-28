/**
 * @file
 * @lang zh-CN 从各 owner 构建产物同步当前 schema 快照与 catalog，历史 canonical 字节由独立流程保存。
 * @lang en Synchronizes current schema snapshots and the catalog from owner builds; a separate process preserves historical canonical bytes.
 */
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
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA,
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
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION,
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA
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
    // <lang><zh-CN>结构/注册表公开API与确认的组合语义已审；不升级七份领域profile或npm发行状态。</zh-CN><en>Structural/registry public APIs and confirmed composition semantics have been reviewed, without promoting seven domain profiles or npm release status.</en></lang>
    stability: "stable-candidate"
  },
  {
    contractVersion: DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
    fileName: "documentation-producer.schema.json",
    key: "documentation-producer",
    ownerPackage: "@hia-doc/plugin-sdk",
    schema: DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
    // <lang><zh-CN>已完成独立接口/兼容审查的1.0定义候选，不代表SDK包或系统正式发行。</zh-CN><en>A 1.0 definition candidate with its own interface/compatibility review, not a formal SDK or system release.</en></lang>
    stability: "stable-candidate"
  },
  {
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    fileName: "documentation-producer-result.schema.json",
    key: "documentation-producer-result",
    ownerPackage: "@hia-doc/plugin-sdk",
    schema: DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA,
    // <lang><zh-CN>结果reader支持明确历史版本，current schema仍精确约束1.0.0。</zh-CN><en>The result reader supports an explicit historical version while the current schema still constrains exactly 1.0.0.</en></lang>
    stability: "stable-candidate"
  },
  {
    contractVersion: DOC_SOURCE_MAP_SCHEMA_VERSION,
    fileName: "doc-source-map.schema.json",
    key: "doc-source-map",
    ownerPackage: "@hia-doc/source-linkage",
    schema: DOC_SOURCE_MAP_JSON_SCHEMA,
    // <lang><zh-CN>逐引用范围语义、精确历史读取、有限生产分支和隔离安装/宿主已审；此标记不晋升绑定、坐标侧载、npm包或系统发行。</zh-CN><en>Per-reference ranges, exact historical readers, bounded producer branches and isolated installation/host paths have been reviewed; this marker does not promote bindings, coordinate sidecars, packages or system releases.</en></lang>
    stability: "stable-candidate"
  },
  // <lang><zh-CN>坐标证据是source-linkage拥有的独立草案侧载；分发快照必须严格同步owner定义，不改旧普通map或doc-source-map资产。</zh-CN><en>Coordinate evidence is an independent draft sidecar owned by source-linkage; its distributed snapshot must match the owner definition without changing older ordinary or documentation-map assets.</en></lang>
  {
    contractVersion: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION,
    fileName: "ordinary-source-map-coordinate-profile.schema.json",
    key: "ordinary-source-map-coordinate-profile",
    ownerPackage: "@hia-doc/source-linkage",
    schema: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA,
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
    stability: "stable-candidate"
  },
  // <lang><zh-CN>UI locale completeness 只分发 metadata-only gate report；翻译正文、renderer DOM 与运行环境均不进入 schema。</zh-CN><en>UI-locale completeness distributes only metadata-only gate reports; translation text, renderer DOM, and runtime environment never enter the schema.</en></lang>
  {
    contractVersion: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
    fileName: "documentation-ui-locale-completeness.schema.json",
    key: "documentation-ui-locale-completeness",
    ownerPackage: "@hia-doc/core",
    schema: DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA,
    stability: "stable-candidate"
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
    // <lang><zh-CN>核心根已具备候选实现及精确旧reader，不等同包或系统正式发行。</zh-CN><en>The core root has a candidate implementation and exact legacy reader, not a formal package/system release.</en></lang>
    stability: "stable-candidate"
  },
  {
    contractVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
    fileName: "project-manifest.schema.json",
    key: "project-manifest",
    ownerPackage: "@hia-doc/config",
    schema: HIA_PROJECT_MANIFEST_JSON_SCHEMA,
    // <lang><zh-CN>项目清单完成独立边界/语义/类型审查后加入候选，不代表config包全部接口或正式发行已完成。</zh-CN><en>The project manifest joins the candidates after its own boundary/semantic/type review, not completion of all config APIs or formal publication.</en></lang>
    stability: "stable-candidate"
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
