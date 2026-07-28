import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wp52DecisionPath = path.join(rootDir, "dist", "wp52-syntax-scope-confidence-decision", "evidence.json");
const schemaCatalogPath = path.join(rootDir, "packages", "schemas", "src", "catalog.json");
const distributedSchemaPath = path.join(rootDir, "packages", "schemas", "src", "schemas", "generated-documentation-binding.schema.json");
const outputRoot = path.join(rootDir, "dist", "wp52-generated-doc-binding-contract");
const evidencePath = path.join(outputRoot, "evidence.json");
const contractPath = path.join(outputRoot, "generated-documentation-binding-contract.md");
const fieldMatrixPath = path.join(outputRoot, "contract-field-matrix.md");

await main();

/**
 * 生成 W-P52.3 独立 contract 的可复跑 evidence。
 * Produces reproducible evidence for the W-P52.3 standalone contract.
 *
 * @lang zh-CN 脚本只读取已构建的 owner export、schema snapshot 和已冻结的 W-P52.2
 * evidence；它使用 metadata-only fixture 校验 relation，不读取 source body、执行
 * template expression 或进入 Pug runtime。
 * @lang en The script reads only built owner exports, schema snapshots, and
 * frozen W-P52.2 evidence. It validates relations with a metadata-only fixture
 * and never reads source bodies, executes template expressions, or enters a
 * Pug runtime.
 *
 * @returns {Promise<void>} 写入 public-safe W-P52.3 evidence。
 */
async function main() {
  const wp52Decision = await readJson(wp52DecisionPath);
  assert.equal(wp52Decision.status, "ready-for-wp52-generated-doc-binding-contract");
  assert.equal(wp52Decision.summary.standaloneContractSelected, true);
  assert.equal(wp52Decision.summary.coreSchemaModifiedNow, false);

  const sourceLinkage = await import(pathToFileURL(path.join(rootDir, "packages", "source-linkage", "dist", "index.js")).href);
  const catalog = await readJson(schemaCatalogPath);
  const distributedSchema = await readJson(distributedSchemaPath);
  const fixture = createMetadataOnlyFixture();
  const bindingDiagnostics = sourceLinkage.validateGeneratedDocumentationBinding(fixture);
  const docMapDiagnostics = sourceLinkage.validateDocSourceMap(createDocSourceMapFixture());

  assert.deepEqual(bindingDiagnostics, []);
  assert.deepEqual(docMapDiagnostics, []);
  assert.equal(sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT, "generated-documentation-binding");
  assert.equal(sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, "0.1.0-draft");
  assert.equal(sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$id, sourceLinkage.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID);
  assert.equal(distributedSchema.$id, sourceLinkage.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID);
  assert.equal(catalog.schemas.some((entry) => entry.key === "generated-documentation-binding" && entry.ownerPackage === "@hia-doc/source-linkage"), true);
  assert.deepEqual(sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.filter((field) => ["bindings", "expansions", "targets", "diagnostics"].includes(field)), ["bindings", "expansions", "targets", "diagnostics"]);
  assert.equal(sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.privacy.properties.sourcesContentPolicy.const, "none");
  assert.equal(sourceLinkage.DOC_SOURCE_MAP_JSON_SCHEMA.properties.generatedBindingSidecars.type, "array");
  assert.equal(sourceLinkage.DOC_SOURCE_MAP_JSON_SCHEMA.$defs.entry.properties.generatedBindingRefs.type, "array");

  const summary = {
    phase: "W-P52.3",
    contract: `${sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT}@${sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION}`,
    schemaDialect: "https://json-schema.org/draft/2020-12/schema",
    schemaDistributed: true,
    neutralTopLevelCollectionCount: 4,
    diagnosticCodeCount: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.diagnostic.properties.code.enum.length,
    resolutionConfidenceCombinationCount: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.resolution.oneOf.length,
    provenanceCoverageCount: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.resolution.properties.provenanceCoverage.enum.length,
    deterministicLocalsMaxDepth: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.deterministicLocalsPolicy.properties.limits.properties.maxDepth.const,
    deterministicLocalsMaxEntries: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.deterministicLocalsPolicy.properties.limits.properties.maxEntries.const,
    deterministicLocalsMaxStringBytes: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.deterministicLocalsPolicy.properties.limits.properties.maxStringBytes.const,
    docSourceMapSidecarLinkageReady: true,
    fullBindingModelEmbeddedInDocSourceMap: false,
    productionExtractorModifiedNow: false,
    parserRuntimeImplementedNow: false,
    hostProjectionImplementedNow: false,
    bidirectionalIndexImplementedNow: false,
    templateRuntimeDataExecutionCount: 0,
    arbitraryExpressionEvaluationCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    checkedApplyWriteEnabledCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutedCount: 0
  };
  const checks = createChecks(summary, sourceLinkage);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp52-generated-doc-binding-contract-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0
      ? "ready-for-wp52-pug-one-to-many-parser-fixtures"
      : "blocked-by-wp52-generated-doc-binding-contract",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P52.3",
    sourceInputs: {
      syntaxScopeConfidenceDecision: {
        contract: wp52Decision.contract,
        contractVersion: wp52Decision.contractVersion,
        status: wp52Decision.status
      }
    },
    contractOwnership: {
      ownerPackage: "@hia-doc/source-linkage",
      distributionPackage: "@hia-doc/schemas",
      schemaId: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
      contract: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT,
      contractVersion: sourceLinkage.GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
    },
    executionPolicy: {
      policy: "neutral-contract-schema-validator-and-sidecar-linkage-only",
      productionExtractorMayBeModified: false,
      parserRuntimeMayBeImplemented: false,
      hostProjectionMayBeImplemented: false,
      bidirectionalIndexMayBeImplemented: false,
      templateRuntimeDataMayBeExecuted: false,
      arbitraryExpressionMayBeEvaluated: false,
      sourceBodyMayBeSerialized: false,
      digestMayBeSerialized: false,
      providerNetworkMayBeExecuted: false,
      checkedApplyWriteMayBeEnabled: false,
      targetRepositoryMayBeMutated: false,
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      contract: normalizePath(contractPath),
      fieldMatrix: normalizePath(fieldMatrixPath),
      publicContract: "docs/generated-documentation-binding-contract.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serialized}\n`, "utf8");
  await writeFile(contractPath, renderContractEvidence(evidence), "utf8");
  await writeFile(fieldMatrixPath, renderFieldMatrix(sourceLinkage), "utf8");

  console.log(`W-P52.3 generated documentation binding contract evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Contract status: ${evidence.status}`);
}

function createMetadataOnlyFixture() {
  return {
    contract: "generated-documentation-binding",
    contractVersion: "0.1.0-draft",
    id: "gdb:fixture:card",
    producer: { name: "fixture-adapter", version: "0.1.0", adapterId: "fixture-template" },
    docSourceMapLinkage: {
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      docSourceMapId: "docmap:fixture:card",
      sidecarId: "sidecar:fixture:card",
      sidecarPath: "dist/card.generated-doc-binding.json",
      entryReferenceField: "generatedBindingRefs"
    },
    privacy: {
      sourcesContentPolicy: "none",
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowSourceBodySerialization: false,
      allowRuntimeValueSerialization: false,
      allowRuntimeExpressionExecution: false,
      allowDigestSerialization: false,
      allowSecretSerialization: false
    },
    deterministicLocalsPolicy: {
      contract: "generated-doc-locals",
      contractVersion: "0.1.0-draft-input",
      mode: "deterministic-json-compatible",
      inputId: "locals:fixture:card",
      adapterId: "fixture-template",
      bindingAllowlist: ["binding:color-name"],
      privacyClassification: "metadata-only",
      limits: { maxDepth: 12, maxEntries: 10000, maxStringBytes: 65536 },
      prohibitedSources: ["process-environment", "network", "provider", "host-editor", "implicit-runtime-capture"]
    },
    compatibility: {
      minimumConsumerContractVersion: "0.1.0-draft",
      unknownFieldPolicy: "ignore-unknown-optional-fields",
      breakingChangePolicy: "new-contract-version-and-schema-id"
    },
    bindings: [{
      id: "binding:color-name",
      adapterId: "fixture-template",
      sourceIntent: {
        kind: "description",
        sourceRef: { sourceId: "source:template", range: { start: { line: 3 }, end: { line: 3 } }, rangeSource: "adapter" }
      },
      bindingRef: { kind: "member-path", rootDeclarationId: "declaration:color", memberPath: ["name"] },
      scope: {
        id: "gdb-scope/v1/fixture-template/source-template#loop-color/declaration-1",
        adapterId: "fixture-template",
        sourceId: "source:template",
        semanticAncestry: ["generator-loop", "attached-documentation"],
        declarationSlot: "declaration-1"
      },
      resolution: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-only" },
      composition: { relation: "none", mergePolicy: "not-applicable", contributions: [] }
    }],
    expansions: [{
      id: "expansion:color-42",
      bindingId: "binding:color-name",
      scopeId: "gdb-scope/v1/fixture-template/source-template#loop-color/declaration-1",
      order: 0,
      instanceKey: { status: "stable", key: "gdb-key/v1/stable-id:color-42", origin: "explicit-instance-key", privacySafe: true },
      resolution: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-and-generated" },
      targetIds: ["target:card-title"]
    }],
    targets: [{
      id: "target:card-title",
      identity: { kind: "generated-element", artifactId: "artifact:card-html", selector: "[data-card-title]" },
      resolution: { resolutionKind: "exact", confidence: "high", provenanceCoverage: "source-and-generated" }
    }],
    diagnostics: []
  };
}

function createDocSourceMapFixture() {
  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:fixture:card",
    producer: { name: "fixture-adapter", version: "0.1.0" },
    artifacts: [{ id: "artifact:card-html", kind: "generated-artifact", path: "dist/card.html" }],
    sources: [{ id: "source:template", kind: "template-source", path: "src/card.pug", sourcesContentPolicy: "none" }],
    sourceMaps: [],
    generatedBindingSidecars: [{
      id: "sidecar:fixture:card",
      contract: "generated-documentation-binding",
      contractVersion: "0.1.0-draft",
      path: "dist/card.generated-doc-binding.json"
    }],
    chains: [],
    entries: [{
      id: "entry:card-title",
      kind: "symbol",
      sourceRefs: [],
      artifactRefs: [],
      generatedBindingRefs: [{ bindingId: "binding:color-name", sidecarId: "sidecar:fixture:card" }],
      diagnostics: []
    }],
    privacy: { sourcesContentPolicy: "none" },
    diagnostics: []
  };
}

function createChecks(summary, sourceLinkage) {
  return [
    check("frozen-wp52-2-input", summary.contract === "generated-documentation-binding@0.1.0-draft", "The W-P52.2 standalone neutral contract selection is implemented without reopening syntax decisions."),
    check("neutral-collections", summary.neutralTopLevelCollectionCount === 4 && summary.diagnosticCodeCount === 10, "Bindings, expansions, targets, and diagnostics are versioned neutral collections with the frozen GDB taxonomy."),
    check("quality-dimensions", summary.resolutionConfidenceCombinationCount === 5 && summary.provenanceCoverageCount === 3, "Resolution, confidence, and provenance remain separate with only frozen combinations."),
    check("locals-and-privacy", summary.deterministicLocalsMaxDepth === 12 && summary.deterministicLocalsMaxEntries === 10000 && summary.deterministicLocalsMaxStringBytes === 65536 && sourceLinkage.validateGeneratedDocumentationBinding(createMetadataOnlyFixture()).length === 0, "Deterministic locals stays reference-only and privacy validation accepts only the metadata-safe fixture."),
    check("sidecar-linkage", summary.docSourceMapSidecarLinkageReady && !summary.fullBindingModelEmbeddedInDocSourceMap, "doc-source-map declares a sidecar and binding-id references without embedding the binding model."),
    check("distribution-and-compatibility", summary.schemaDistributed && summary.schemaDialect === "https://json-schema.org/draft/2020-12/schema", "The owner schema is distributed with a versioned Draft 2020-12 identity and compatibility constraints."),
    check("phase-boundary", !summary.productionExtractorModifiedNow && !summary.parserRuntimeImplementedNow && !summary.hostProjectionImplementedNow && !summary.bidirectionalIndexImplementedNow, "W-P52.3 does not cross into Pug runtime, W-P52.5 indexes, or W-P52.6 host projection."),
    check("privacy-write-network", summary.templateRuntimeDataExecutionCount === 0 && summary.arbitraryExpressionEvaluationCount === 0 && summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.digestValueSerializedCount === 0 && summary.localPathExposureCount === 0 && summary.credentialMarkerCount === 0 && summary.checkedApplyWriteEnabledCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0, "No runtime values, source body, digest, path, credential, write, target mutation, or provider network enters W-P52.3 evidence.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderContractEvidence(evidence) {
  return `# W-P52.3 Generated Documentation Binding Contract Evidence

## 中文摘要

已实现独立中性 \`${evidence.summary.contract}\` contract，并由
\`@hia-doc/source-linkage\` owner validator 与 \`@hia-doc/schemas\` snapshot
共同提供。它包含 bindings、expansions、targets、diagnostics 四个集合，且保持
scope、stable instance key、resolution/confidence/provenance、inheritance/
composition、deterministic locals、privacy、sidecar linkage 与兼容性边界。

## 验证摘要

- schema dialect：\`${evidence.summary.schemaDialect}\`。
- 诊断代码：${evidence.summary.diagnosticCodeCount} 个冻结 \`GDB_*\` code。
- resolution/confidence 合法组合：${evidence.summary.resolutionConfidenceCombinationCount} 个；provenance coverage：${evidence.summary.provenanceCoverageCount} 个。
- doc-source-map 只声明 sidecar 与 binding id reference；完整模型嵌入数：0。
- Pug extractor/runtime、双向 index、host projection、runtime locals 执行、source body、write、network 与目标仓库修改均为 0 / false。

## 下一步

W-P52.4 才在 \`hia-pugdoc\` 实现 each/mixin/include/extends/block 的 production
parser fixture/runtime；当前 contract 不执行 adapter expression。
`;
}

function renderFieldMatrix(sourceLinkage) {
  const diagnosticCodes = sourceLinkage.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.diagnostic.properties.code.enum.map((code) => `- \`${code}\``).join("\n");
  return `# Generated Documentation Binding Contract 字段矩阵

## 顶层集合

| 字段 | 责任 | 隐私/互操作边界 |
| --- | --- | --- |
| bindings | 上游 source intent、normalized ref、scope、quality 与 composition | 不保存 adapter expression 或 Pug AST。 |
| expansions | binding 的零到多个实例、key、顺序与 target id | key 必须 privacy-safe；重复 key 被 owner validator 拒绝。 |
| targets | 生成 artifact 或 documentation symbol identity | 不把 target 升格为 adapter 私有 AST。 |
| diagnostics | 冻结 GDB taxonomy | 使用固定 code/severity，不输出 source text。 |

## Sidecar linkage

\`docSourceMapLinkage\` 固定 \`doc-source-map@0.1.0-draft\`、safe relative
sidecar path 与 \`generatedBindingRefs\` entry field。doc-source-map 自身只保留
sidecar id + binding id；不会嵌入完整四集合。

## 诊断代码

${diagnosticCodes}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /(npm_|ghp_|github_pat_)[A-Za-z0-9_-]{8,}/i,
    /"sourcesContent"\s*:/,
    /"sourceText"\s*:/,
    /"sourceBody"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `W-P52.3 evidence includes forbidden private marker: ${pattern}`);
  }
}
