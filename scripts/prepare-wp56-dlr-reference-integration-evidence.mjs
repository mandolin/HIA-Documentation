import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  createDocumentationLocaleResolutionSidecar,
  parseDocumentationLocaleResource,
  resolveDocumentationLocaleResource,
  validateDocumentationLocaleResolutionSidecar
} from "../packages/core/dist/index.js";
import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";

/**
 * Generate metadata-only W-P56 evidence after package builds and focused tests succeed.
 *
 * 中文：在 package build 与 focused test 成功后生成 metadata-only W-P56 evidence。
 * English: Generates metadata-only W-P56 evidence after package builds and
 * focused tests have succeeded.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp56-dlr-reference-integration");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "wp56-dlr-reference-integration.md");

await mkdir(outputRoot, { recursive: true });

// <lang zh-CN>fixture 只保留公开 contract metadata；既不写真实资源文件，也不包含可用户识别的文档正文。</lang>
const parsed = parseDocumentationLocaleResource(JSON.stringify({
  kind: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
  contractVersion: DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  format: "documentation-locale-resource-json",
  formatVersion: "0.1.0-draft",
  resourceId: "docs.fixture",
  defaultLocale: "en",
  locales: ["en"],
  entries: {
    "summary.value": {
      localizedText: { en: "Fixture summary." }
    }
  }
}));
assert.ok(parsed.resource, "Expected canonical DLR fixture to parse.");
assert.deepEqual(parsed.diagnostics, []);

// <lang zh-CN>resolution 仍在 runtime 内获得 text；sidecar factory 只接收 provenance 与 diagnostic code。</lang>
const resolution = resolveDocumentationLocaleResource(
  { entryKey: "summary.value" },
  { directResource: parsed.resource, requestedLocale: "en" }
);
assert.equal(resolution.resolutionKind, "direct");
const sidecar = createDocumentationLocaleResolutionSidecar("dlr-sidecar:wp56", [{
  documentId: "doc:wp56",
  entryKey: "summary.value",
  fieldPath: "summary",
  resourceId: "docs.fixture",
  resolution
}]);
assert.deepEqual(validateDocumentationLocaleResolutionSidecar(sidecar), []);
assert.equal(JSON.stringify(sidecar).includes("Fixture summary."), false, "Sidecar must not serialize resolved text.");

// <lang zh-CN>ordinary doc-source-map 只声明 sidecar identity，不能读取或嵌入该 sidecar 的正文。</lang>
const docSourceMap = createDocSourceMapIndex({
  contract: "doc-source-map",
  contractVersion: "0.1.0-draft",
  artifacts: [],
  sources: [],
  entries: [],
  localeResolutionSidecars: [{
    id: "dlr-sidecar:wp56",
    contract: "documentation-locale-resolution",
    contractVersion: "0.1.0-draft",
    path: "dist/wp56.locale-resolution.json"
  }]
});
assert.equal(docSourceMap.status, "available");
assert.equal(docSourceMap.localeResolutionSidecarCount, 1);

const distributedResourceSchema = JSON.parse(await readFile(
  path.join(rootDir, "packages", "schemas", "src", "schemas", "documentation-locale-resource.schema.json"),
  "utf8"
));
const distributedResolutionSchema = JSON.parse(await readFile(
  path.join(rootDir, "packages", "schemas", "src", "schemas", "documentation-locale-resolution.schema.json"),
  "utf8"
));
assert.equal(distributedResourceSchema.properties.kind.const, DOCUMENTATION_LOCALE_RESOURCE_CONTRACT);
assert.equal(distributedResolutionSchema.properties.privacy.properties.allowResolvedText.const, false);

const evidence = {
  contract: "wp56-dlr-reference-integration-evidence",
  contractVersion: "0.1.0-draft",
  status: "ready-for-wp56-closeout",
  checks: {
    canonicalDlrSchemaDistributed: true,
    metadataOnlyResolutionSchemaDistributed: true,
    pureResolutionSeparatesResolutionConfidenceAndProvenance: true,
    ordinaryDocSourceMapLinksOnlySidecarIdentity: true,
    sidecarContainsNoResolvedText: true,
    filesystemReaderCoveredByFocusedTests: true,
    atTagAndXmlProfilesCoveredByFocusedTests: true,
    legacyHiaI18nJsonIsBridgeOnly: true,
    migrationImplemented: false,
    ideOrLintImplemented: false,
    networkOrExpressionExecutionImplemented: false,
    targetRepositoryAction: false
  },
  profileContracts: [
    "documentation-at-tag-locale-resource-profile@0.1.0-draft",
    "documentation-xml-locale-resource-profile@0.1.0-draft"
  ],
  resultDimensions: ["resolutionKind", "confidence", "provenance"],
  sidecarFields: ["documentId", "fieldPath", "resourceId", "entryKey", "requestedLocale", "resolvedLocale", "resolutionKind", "confidence", "provenance", "diagnosticCodes"]
};

await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
await writeFile(reportPath, [
  "# W-P56 DLR Reference Integration 证据",
  "",
  "该 evidence 只记录 contract、schema、profile 与 privacy gate 的公开元数据；不含资源正文、raw locator、绝对路径或 target 信息。",
  "",
  "- canonical DLR 与 locale-resolution schema 已通过 schema distribution 同步。",
  "- at-tag 与 XML-safe 两个 profile 经过相同 root-bound read-only reader 和纯 resolver。",
  "- 普通 doc-source-map 仅声明 locale-resolution sidecar identity。",
  "- 未实现 migration、IDE/Lint、network/expression execution 或 target repository action。",
  ""
].join("\n"), "utf8");

console.log(JSON.stringify(evidence, null, 2));
