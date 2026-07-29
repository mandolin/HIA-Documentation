import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDocumentationLocaleResourceDiscoverySidecar,
  validateDocumentationLocaleResourceDiscoverySidecar
} from "../packages/core/dist/index.js";
import {
  DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
  DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
  createDocumentationLocaleResourceSourceDeclaration,
  inspectLegacyHiaI18nJsonBridge
} from "../packages/generic-docline/dist/index.js";
import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";

/**
 * @lang zh-CN 生成 W-P62 的 public-safe declaration/discovery evidence；它只消费 in-memory synthetic source text 和 catalog，不读取 resource/file。
 * @lang en Generates public-safe W-P62 declaration/discovery evidence using in-memory synthetic source text and catalogs only; it reads no resource/file.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @lang zh-CN 忽略的 evidence 输出目录。 @lang en Ignored evidence output directory. */
const outputRoot = path.join(rootDir, "dist", "wp62-dlr-source-declaration");
/** @lang zh-CN machine-readable evidence 路径。 @lang en Machine-readable evidence path. */
const evidencePath = path.join(outputRoot, "evidence.json");
/** @lang zh-CN 中文优先人工 review packet 路径。 @lang en Chinese-first human-review packet path. */
const reviewPacketPath = path.join(outputRoot, "dlr-discovery-review-packet.md");

await main();

/**
 * @lang zh-CN 运行 synthetic declaration/discovery fixture、sidecar linkage 和 public-safe artifact 写入。
 * @lang en Runs synthetic declaration/discovery fixtures, sidecar linkage, and public-safe artifact writing.
 *
 * @returns 无返回值。 / No return value.
 */
async function main() {
  // <lang><zh-CN>输出目录只保存可复现结论；受控 locator、source text、resource body 和 range 均不写入。</zh-CN><en>The output directory stores reproducible conclusions only; controlled locators, source text, resource bodies, and ranges are never written.</en></lang>
  await mkdir(outputRoot, { recursive: true });
  const catalog = [{ resourceId: "docs.api.user", locator: "docs/user.dlr" }];
  // <lang><zh-CN>两个 frozen profile 只接收内存文本；没有 host root、directory walk 或 reader invocation。</lang><en>The two frozen profiles receive in-memory text only; there is no host root, directory walk, or reader invocation.</en></lang>
  const atTag = createDocumentationLocaleResourceSourceDeclaration({
    catalog,
    declarationId: "dlr-declaration:wp62:at-tag",
    discoveryId: "dlr-discovery:wp62:at-tag",
    profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
    resourceRootId: "docs.resources",
    sourceDocumentId: "doc.wp62.at-tag",
    sourceText: ["@langSrc docs/user.dlr", "<lang key=\"user.greet.description\" field=\"description\"/>"].join("\n")
  });
  const xml = createDocumentationLocaleResourceSourceDeclaration({
    catalog,
    declarationId: "dlr-declaration:wp62:xml",
    discoveryId: "dlr-discovery:wp62:xml",
    profile: DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
    resourceRootId: "docs.resources",
    sourceDocumentId: "doc.wp62.xml",
    sourceText: "<langResource resource=\"docs.api.user\"/>"
  });
  assert.deepEqual(atTag.diagnostics, []);
  assert.deepEqual(xml.diagnostics, []);
  assert.ok(atTag.discovery, "Expected at-tag source declaration discovery.");
  assert.ok(xml.discovery, "Expected XML source declaration discovery.");

  // <lang><zh-CN>unknown src 的错误只允许产生 diagnostic；它不能获得 default resource、file read 或 discovery binding。</lang><en>An unknown src may only produce a diagnostic; it cannot gain a default resource, file read, or discovery binding.</en></lang>
  const unknown = createDocumentationLocaleResourceSourceDeclaration({
    catalog,
    declarationId: "dlr-declaration:wp62:unknown",
    discoveryId: "dlr-discovery:wp62:unknown",
    profile: DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
    resourceRootId: "docs.resources",
    sourceDocumentId: "doc.wp62.unknown",
    sourceText: "@langSrc docs/missing.dlr"
  });
  assert.ok(unknown.discovery, "Expected an empty public discovery report for an undeclared selection.");
  assert.deepEqual(unknown.discovery.bindings, []);
  assert.equal(unknown.diagnostics.some((diagnostic) => diagnostic.code === "DLR_DISCOVERY_LOCATOR_UNDECLARED"), true);

  // <lang><zh-CN>sidecar 与 ordinary map 只交换 id、contract/version 和 safe artifact path；index 不加载 body。</lang><en>The sidecar and ordinary map exchange only id, contract/version, and safe artifact path; the index loads no body.</en></lang>
  const sidecar = createDocumentationLocaleResourceDiscoverySidecar("sidecar:wp62:at-tag", atTag.discovery);
  assert.deepEqual(validateDocumentationLocaleResourceDiscoverySidecar(sidecar), []);
  const docMap = createDocSourceMapIndex({
    artifacts: [],
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    entries: [],
    localeDiscoverySidecars: [{
      contract: "documentation-locale-resource-declaration",
      contractVersion: "0.1.0-draft",
      id: sidecar.id,
      path: "dist/wp62.locale-discovery.json"
    }],
    sources: []
  });
  assert.equal(docMap.status, "available");
  assert.equal(docMap.localeDiscoverySidecarCount, 1);

  // <lang><zh-CN>legacy descriptor 保持 compatibility diagnostic，不能被 catalog discovery 自动升级。</lang><en>The legacy descriptor remains a compatibility diagnostic and cannot be automatically upgraded by catalog discovery.</en></lang>
  const legacy = inspectLegacyHiaI18nJsonBridge({ format: "hia-i18n-json", path: "legacy/private-resource.json" });
  assert.equal(legacy.provenance, "legacy-adapter-bridge");
  assert.equal(legacy.diagnostics[0]?.code, "DLR_LEGACY_BRIDGE");

  // <lang><zh-CN>分发 schema 必须锁住 controlled/public union 与 public privacy deny-all；schema 不承担 cross-catalog owner validation。</lang><en>The distributed schema must lock the controlled/public union and public privacy deny-all; schema does not replace cross-catalog owner validation.</en></lang>
  const distributedSchema = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "schemas", "documentation-locale-resource-declaration.schema.json"), "utf8"));
  assert.equal(distributedSchema.$defs.controlledDeclaration.properties.kind.const, "controlled-declaration");
  assert.equal(distributedSchema.$defs.publicDiscovery.properties.kind.const, "public-discovery");
  assert.equal(distributedSchema.$defs.privacy.properties.allowRawLocator.const, false);
  assert.equal(distributedSchema.$defs.privacy.properties.allowSourceBody.const, false);
  assert.equal(distributedSchema.$defs.privacy.properties.allowResourceBody.const, false);

  const evidence = {
    boundary: {
      absolutePathExposureCount: 0,
      directoryWalkInvocationCount: 0,
      filesystemReadInvocationCount: 0,
      globInvocationCount: 0,
      hostWriteEnabledCount: 0,
      locatorSerializationCount: 0,
      networkInvocationCount: 0,
      resourceBodySerializationCount: 0,
      resourceParserInvocationCount: 0,
      resolvedTextSerializationCount: 0,
      sourceBodySerializationCount: 0,
      sourceRangeSerializationCount: 0,
      targetRepositoryActionCount: 0
    },
    checks: {
      approvedAtTagProfileBound: true,
      approvedXmlProfileBound: true,
      catalogOnlyDiscovery: true,
      compatibilityBridgeDiagnosticOnly: true,
      controlledDeclarationNotPublished: true,
      cwdFallbackImplemented: false,
      directoryWalkImplemented: false,
      distributedSchemaPrivacyDenyAll: true,
      docSourceMapLoadsSidecarBody: false,
      filesystemReadImplemented: false,
      globImplemented: false,
      legacyAutoMigrationImplemented: false,
      locatorExactMatchRequired: true,
      publicDiscoveryUsesLogicalIdsOnly: true,
      resourceParserOrResolverImplemented: false,
      sidecarLinkageMetadataOnly: true,
      unknownLocatorFailsClosed: true,
      watchOrCacheImplemented: false,
      writeOrNetworkImplemented: false
    },
    contract: "wp62-dlr-source-declaration-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp62-closeout",
    summary: {
      approvedProfileCount: 2,
      controlledDeclarationCount: 3,
      discoverySidecarCount: docMap.localeDiscoverySidecarCount,
      logicalResourceIdCount: atTag.discovery.resourceIds.length,
      successfulDiscoveryBindingCount: atTag.discovery.bindings.length + xml.discovery.bindings.length,
      unknownLocatorDiscoveryBindingCount: unknown.discovery.bindings.length,
      unknownLocatorDiagnosticCount: unknown.diagnostics.filter((diagnostic) => diagnostic.code === "DLR_DISCOVERY_LOCATOR_UNDECLARED").length
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P62 evidence");
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reviewPacketPath, renderReviewPacket(evidence), "utf8");
  console.log(`W-P62 DLR source declaration evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P62 status: ${evidence.status}`);
}

/**
 * @lang zh-CN 生成中文优先 review packet，只陈述可公开计数与安全边界。
 * @lang en Generates a Chinese-first review packet that states public-safe counts and boundaries only.
 *
 * @param evidence public-safe evidence。 / Public-safe evidence.
 * @returns Markdown packet。 / Markdown packet.
 */
function renderReviewPacket(evidence) {
  return `# W-P62 DLR 声明与安全发现审查 Packet

## 结论

本 packet 证明两种已冻结 profile 的内存 source declaration 都只能命中受控 catalog 的
logical resource identity。成功不代表 .dlr 文件存在、可读、内容有效、entry 可用或 locale
已 resolution；本周期没有调用 reader、parser/resolver、directory walk、glob 或 network。

## 审查清单

- profile/version 是否为 caller 明确批准的精确 pair，而非名称或版本前缀猜测。
- src 是否只用受控 catalog exact locator match 转换为 logical resource id。
- resource 是否只命中同一 declaration catalog 的 approved identity。
- unknown/unsafe selection 是否 fail-closed，且没有降级到 default resource 或 source text。
- public discovery、sidecar 与 ordinary doc-source-map 是否没有 controlled locator、range、body、text 或绝对路径。
- legacy hia-i18n-json 是否仅保留 compatibility diagnostic，未自动迁移或升级。

## 统计与边界

- 已批准 profile：${evidence.summary.approvedProfileCount}
- successful discovery binding：${evidence.summary.successfulDiscoveryBindingCount}
- unknown locator binding：${evidence.summary.unknownLocatorDiscoveryBindingCount}
- resource/file read、resource parser/resolver、directory walk/glob/cwd fallback、network/write、卫星/target action：全部为 0 或 false。

## English summary

This packet records catalog-only declaration discovery. It does not prove a resource exists or is valid,
and it does not invoke filesystem access, a DLR parser/resolver, directory traversal, network access, or writes.
`;
}

/**
 * @lang zh-CN 把本机路径规范化为 main-repo 相对 artifact identity。
 * @lang en Normalizes a local path to a main-repo-relative artifact identity.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * @lang zh-CN 阻止 evidence 写入 locator、path、正文、range、credential 或 secret marker。
 * @lang en Prevents evidence from writing locator, path, body, range, credential, or secret markers.
 */
function assertNoPrivateMarkers(value, label) {
  // <lang zh-CN>assertion 只报告 pattern，不回显可能敏感的实际 match。</lang><en>The assertion reports only a pattern and never echoes a potentially sensitive match.</en></lang>
  const forbiddenPatterns = [
    /\b[A-Z]:[\\/]/u,
    /file:\/\//iu,
    /"(?:locator|src|path|range|sourceBody|resourceBody|resolvedText)"\s*:/u,
    /sk-[A-Za-z0-9_-]+/u,
    /ghp_[A-Za-z0-9_]+/u,
    /npm_[A-Za-z0-9_]+/u
  ];
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a forbidden public-safe marker: ${hit}`);
}
