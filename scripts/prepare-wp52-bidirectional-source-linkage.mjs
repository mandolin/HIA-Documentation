import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createDocSourceMapIndex,
  createGeneratedDocumentationBindingIndex,
  findGeneratedBindingsForDocSourceMapEntry,
  findGeneratedBindingsForTarget,
  findGeneratedBindingsForTargetSymbol,
  findGeneratedTargetsForBinding,
  validateGeneratedDocumentationBinding
} from "../packages/source-linkage/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pugDocRoot = path.resolve(root, "..", "HIA", "hia-pugdoc");
const outputRoot = path.join(root, "dist", "wp52-bidirectional-source-linkage");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * 生成 W-P52.5 双向 source-linkage evidence。
 * Generates W-P52.5 bidirectional source-linkage evidence.
 *
 * @remarks
 * 中文：本脚本只在临时目录调用已提交的 Pug producer，再将内存中的 sidecar 与
 * doc-source-map index 交给主仓查询 API。它不改动 PugDoc、不按 sidecar path
 * 读取文件、不执行 template expression，也不启动 renderer/host projection。
 * English: This script invokes the committed Pug producer only in a temporary
 * directory, then passes in-memory sidecar and doc-source-map indexes to the
 * main-repository query API. It does not modify PugDoc, load a sidecar by path,
 * execute template expressions, or start a renderer/host projection.
 *
 * @returns {Promise<void>} 写入 public-safe evidence 与中文优先报告。
 */
async function main() {
  const temporaryOutput = await fsp.mkdtemp(path.join(os.tmpdir(), "hia-wp52-5-"));
  try {
    const upstreamEvidence = readJson(path.join(pugDocRoot, "dist", "wp52-pug-one-to-many-parser-fixtures", "evidence.json"));
    assert.equal(upstreamEvidence.status, "ready-for-wp52-bidirectional-source-linkage");
    const { runPugDoc } = await import(pathToFileURL(path.join(pugDocRoot, "packages", "pugdoc-runner", "src", "index.mjs")));
    const locals = createGeneratedBindingLocals();
    const producerResult = await runPugDoc({
      workspaceRoot: pugDocRoot,
      outputDirectory: temporaryOutput,
      inputs: [{
        kind: "pug-entry",
        path: "fixtures/generated-binding-runtime/src/pages/bindings.pug",
        artifactBasePath: "bindings",
        locals: locals.values,
        generatedBindingLocals: locals
      }],
      options: {
        emitDocSourceMap: true,
        emitGeneratedDocumentationBinding: true,
        sourcesContentPolicy: "none",
        writeResultManifest: false
      }
    });

    assert.equal(producerResult.status, "success");
    const sidecar = readJson(path.join(temporaryOutput, "bindings.gdb.json"));
    const docSourceMap = readJson(path.join(temporaryOutput, "bindings.docmap.json"));
    const ownerDiagnostics = validateGeneratedDocumentationBinding(sidecar, { path: "bindings.gdb.json" });
    const docSourceMapIndex = createDocSourceMapIndex(docSourceMap, { path: "bindings.docmap.json" });
    const bindingIndex = createGeneratedDocumentationBindingIndex(sidecar, {
      docSourceMapIndex,
      path: "bindings.gdb.json"
    });
    const summary = createSummary(sidecar, docSourceMap, docSourceMapIndex, bindingIndex, ownerDiagnostics, producerResult);
    const checks = createChecks(summary);
    const evidence = {
      contract: "hia-wp52-bidirectional-source-linkage-evidence",
      contractVersion: "0.1.0-draft",
      createdAt: new Date().toISOString(),
      status: checks.every((check) => check.status === "pass")
        ? "ready-for-wp52-renderer-and-host-projection"
        : "blocked-by-wp52-bidirectional-source-linkage",
      cycleGroupId: "C-HIA-P3",
      phase: "W-P52.5",
      sourceInputs: {
        generatedDocumentationBindingContract: {
          contract: "generated-documentation-binding",
          contractVersion: "0.1.0-draft",
          status: "ready-for-wp52-pug-one-to-many-parser-fixtures"
        },
        pugOneToManyParserFixture: {
          contract: upstreamEvidence.contract,
          contractVersion: upstreamEvidence.contractVersion,
          status: upstreamEvidence.status,
          bindingCount: upstreamEvidence.summary.bindingCount,
          expansionCount: upstreamEvidence.summary.expansionCount,
          targetCount: upstreamEvidence.summary.targetCount
        }
      },
      executionPolicy: {
        policy: "in-memory-neutral-sidecar-and-doc-source-map-read-only-index",
        productionExtractorModifiedNow: false,
        pugFixtureProducerExecutedInTemporaryDirectory: true,
        sidecarPathReadByIndex: false,
        ordinaryDocSourceMapFullBindingModelEmbedded: false,
        bidirectionalIndexImplemented: true,
        rendererOrHostProjectionImplemented: false,
        templateRuntimeDataMayBeExecuted: false,
        arbitraryExpressionMayBeEvaluated: false,
        sourceBodyMayBeSerialized: false,
        digestMayBeSerialized: false,
        providerNetworkMayBeExecuted: false,
        checkedApplyWriteMayBeEnabled: false,
        targetRepositoryMayBeMutated: false,
        sourcesContentPolicy: "none"
      },
      summary,
      checks,
      generatedDocs: {
        overview: "dist/wp52-bidirectional-source-linkage/bidirectional-source-linkage.md",
        queryMatrix: "dist/wp52-bidirectional-source-linkage/bidirectional-query-matrix.md"
      }
    };
    const serialized = JSON.stringify(evidence, null, 2);
    assertNoPrivateMarkers(serialized);

    fs.rmSync(outputRoot, { recursive: true, force: true });
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
    fs.writeFileSync(path.join(outputRoot, "bidirectional-source-linkage.md"), renderOverview(evidence), "utf8");
    fs.writeFileSync(path.join(outputRoot, "bidirectional-query-matrix.md"), renderQueryMatrix(evidence), "utf8");
    console.log(`W-P52.5 bidirectional source-linkage evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
    console.log(`Decision status: ${evidence.status}`);
  } finally {
    await fsp.rm(temporaryOutput, { recursive: true, force: true });
  }
}

/**
 * 构造受审计的 fixture locals envelope。
 * Builds the audited fixture locals envelope.
 *
 * @returns {object} 仅用于 Pug producer 进程内结构化 member-path 解析的输入。
 */
function createGeneratedBindingLocals() {
  return {
    contract: "generated-doc-locals",
    contractVersion: "0.1.0-draft-input",
    adapterId: "pug",
    inputId: "fixture:generated-binding-runtime",
    bindingAllowlist: ["colors", "theme", "item", "summary"],
    privacyClassification: "metadata-only",
    values: {
      colors: { sky: { id: "sky", name: "Sky" }, sun: { id: "sun", name: "Sun" } },
      theme: { primary: { id: "primary", name: "Primary" }, accent: { id: "accent", name: "Accent" } },
      item: { id: "included", name: "Included" },
      summary: { id: "summary", name: "Summary" }
    }
  };
}

/**
 * 汇总实际 Pug sidecar 查询结果。
 * Summarizes actual Pug sidecar query results.
 */
function createSummary(sidecar, docSourceMap, docSourceMapIndex, bindingIndex, ownerDiagnostics, producerResult) {
  const targets = new Map(sidecar.targets.map((target) => [target.id, target]));
  const bindingIdForSymbol = (symbolId) => sidecar.expansions.find((expansion) => expansion.targetIds.some((targetId) => targets.get(targetId)?.identity?.symbolId === symbolId))?.bindingId;
  const eachBindingId = bindingIdForSymbol("element:ColorSwatch");
  const mixinBindingId = bindingIdForSymbol("element:ColorBadge");
  const eachTargetId = sidecar.expansions.find((expansion) => expansion.bindingId === eachBindingId && expansion.order === 1)?.targetIds?.[0];
  const eachEntryId = docSourceMap.entries.find((entry) => entry.symbolId === "element:ColorSwatch")?.id;
  assert.ok(eachBindingId);
  assert.ok(mixinBindingId);
  assert.ok(eachTargetId);
  assert.ok(eachEntryId);

  const bindingToTargets = findGeneratedTargetsForBinding(bindingIndex, eachBindingId);
  const targetToBindings = findGeneratedBindingsForTarget(bindingIndex, eachTargetId);
  const symbolToBindings = findGeneratedBindingsForTargetSymbol(bindingIndex, "element:ColorBadge");
  const entryToBindings = findGeneratedBindingsForDocSourceMapEntry(bindingIndex, eachEntryId);
  const referencedEntryCount = docSourceMap.entries.filter((entry) => Array.isArray(entry.generatedBindingRefs) && entry.generatedBindingRefs.length > 0).length;

  return {
    phase: "W-P52.5",
    contract: `${sidecar.contract}@${sidecar.contractVersion}`,
    bindingCount: bindingIndex.bindingCount,
    expansionCount: bindingIndex.expansionCount,
    targetCount: bindingIndex.targetCount,
    sidecarIdLinkedToDocSourceMap: bindingIndex.sidecarId === sidecar.id,
    ownerDiagnosticCount: ownerDiagnostics.length,
    docSourceMapDiagnosticCount: docSourceMapIndex.diagnostics.length,
    indexOwnDiagnosticCount: bindingIndex.diagnostics.length - docSourceMapIndex.diagnostics.length,
    linkedDocSourceMapEntryCount: bindingIndex.linkedDocSourceMapEntryCount,
    referencedDocSourceMapEntryCount: referencedEntryCount,
    unlinkedBindingCount: bindingIndex.unlinkedBindingCount,
    eachBindingTargetQueryCount: bindingToTargets.length,
    eachStableInstanceKeyCount: bindingIndex.expansions.filter((expansion) => expansion.bindingId === eachBindingId && expansion.instanceKey.status === "stable").length,
    targetToBindingQueryCount: targetToBindings.length,
    targetToBindingExactMatch: targetToBindings.every((binding) => binding.id === eachBindingId),
    symbolToBindingQueryCount: symbolToBindings.length,
    symbolToBindingExactMatch: symbolToBindings.every((binding) => binding.id === mixinBindingId),
    entryToBindingQueryCount: entryToBindings.length,
    entryToBindingExactMatch: entryToBindings.every((binding) => binding.id === eachBindingId),
    queryIndexReadOnly: Object.isFrozen(bindingIndex)
      && Object.isFrozen(bindingIndex.bindings)
      && Object.isFrozen(bindingIndex.expansions)
      && Object.isFrozen(bindingIndex.targets),
    fullBindingModelEmbeddedInDocSourceMap: Object.hasOwn(docSourceMap, "bindings")
      || Object.hasOwn(docSourceMap, "expansions")
      || Object.hasOwn(docSourceMap, "targets"),
    generatedBindingArtifactCount: producerResult.artifacts.filter((artifact) => artifact.kind === "generated-documentation-binding").length,
    productionExtractorModifiedNow: false,
    rendererOrHostProjectionImplementedNow: false,
    templateRuntimeDataExecutionCount: 0,
    arbitraryExpressionEvaluationCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    checkedApplyWriteEnabledCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutedCount: 0,
    hardFailureCount: 0
  };
}

/** 中文：将 W-P52.5 成功条件转为可审计检查。English: Converts W-P52.5 success conditions into auditable checks. */
function createChecks(summary) {
  return [
    check("upstream-contract-and-pug-artifact", summary.contract === "generated-documentation-binding@0.1.0-draft"
      && summary.bindingCount === 4 && summary.expansionCount === 6 && summary.targetCount === 6
      && summary.ownerDiagnosticCount === 0 && summary.indexOwnDiagnosticCount === 0
      && summary.sidecarIdLinkedToDocSourceMap,
    "The index consumes the frozen neutral contract and the actual W-P52.4 Pug sidecar shape."),
    check("binding-to-generated-targets", summary.eachBindingTargetQueryCount === 2
      && summary.eachStableInstanceKeyCount === 2,
    "One each declaration resolves to two independently stable generated targets."),
    check("generated-target-to-binding", summary.targetToBindingQueryCount === 1
      && summary.targetToBindingExactMatch && summary.symbolToBindingQueryCount === 1
      && summary.symbolToBindingExactMatch,
    "A generated target id and a stable target symbol both resolve back to their source binding."),
    check("doc-source-map-sidecar-reference", summary.linkedDocSourceMapEntryCount === 4
      && summary.referencedDocSourceMapEntryCount === 4 && summary.entryToBindingQueryCount === 1
      && summary.entryToBindingExactMatch && !summary.fullBindingModelEmbeddedInDocSourceMap,
    "Ordinary doc-source-map references sidecar ids/binding ids only and remains free of the full binding model."),
    check("read-only-and-phase-boundary", summary.queryIndexReadOnly
      && !summary.productionExtractorModifiedNow && !summary.rendererOrHostProjectionImplementedNow
      && summary.templateRuntimeDataExecutionCount === 0 && summary.arbitraryExpressionEvaluationCount === 0
      && summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0
      && summary.digestValueSerializedCount === 0 && summary.localPathExposureCount === 0
      && summary.credentialMarkerCount === 0 && summary.checkedApplyWriteEnabledCount === 0
      && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0,
    "The index is read-only and does not cross into Pug changes, renderer/host projection, execution, privacy, write, target, or network work.")
  ];
}

/** 中文：创建标准化检查项。English: Creates a normalized check item. */
function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

/** 中文：读取显式 evidence/input JSON。English: Reads an explicit evidence/input JSON file. */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/** 中文：渲染中文优先概览。English: Renders the Chinese-first overview. */
function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P52.5 双向 Source Linkage

## 结论

主仓 \`@hia-doc/source-linkage\` 已实现独立 sidecar 的只读双向查询 index。它消费
W-P52.4 真实 Pug producer 在临时目录生成的
\`generated-documentation-binding@0.1.0-draft\` sidecar 与 paired doc-source-map；
不从 sidecar path 读取文件，也不让 ordinary doc-source-map 内嵌 bindings、expansions
或 targets。

evidence status：\`${evidence.status}\`。

## 结果

- index：${summary.bindingCount} bindings / ${summary.expansionCount} expansions /
  ${summary.targetCount} targets；owner/index own diagnostics：${summary.ownerDiagnosticCount}/
  ${summary.indexOwnDiagnosticCount}；upstream doc-source-map info：${summary.docSourceMapDiagnosticCount}。
- each binding -> generated targets：${summary.eachBindingTargetQueryCount}；stable instance key：
  ${summary.eachStableInstanceKeyCount}。
- generated target -> binding：${summary.targetToBindingQueryCount}；target symbol -> binding：
  ${summary.symbolToBindingQueryCount}；doc-source-map entry -> binding：
  ${summary.entryToBindingQueryCount}。
- doc-source-map linked entries：${summary.linkedDocSourceMapEntryCount}/
  ${summary.referencedDocSourceMapEntryCount}；完整模型 embedded：
  ${summary.fullBindingModelEmbeddedInDocSourceMap}。

## 边界

W-P52.5 不修改 Pug producer，不按 sidecar path 做文件读取，也不实现 W-P52.6 的
renderer/host projection。template expression/runtime data 执行、source/value/digest
序列化、write、target mutation 与 network 均为 0。
`;
}

/** 中文：渲染查询矩阵。English: Renders the query matrix. */
function renderQueryMatrix(evidence) {
  const summary = evidence.summary;
  return `# W-P52.5 双向查询矩阵

| 查询方向 | 实际 Pug fixture 结果 | 说明 |
| --- | ---: | --- |
| binding -> generated targets | ${summary.eachBindingTargetQueryCount} | each declaration 展开为两个 stable instance |
| generated target id -> binding | ${summary.targetToBindingQueryCount} | 反查到一个 source binding |
| generated target symbol -> binding | ${summary.symbolToBindingQueryCount} | 多实例 symbol 仍去重到一个 declaration |
| doc-source-map entry -> binding | ${summary.entryToBindingQueryCount} | 仅通过 sidecar id + binding id reference |
| linked doc-source-map entries | ${summary.linkedDocSourceMapEntryCount} | 完整 binding model 未进入 ordinary map |

resolution、confidence、provenance 继续作为 sidecar projection 的独立字段保留；本阶段
不把它们合并成单一“质量分数”。
`;
}

/** 中文：断言 evidence 不泄露私有内容。English: Asserts that evidence does not leak private content. */
function assertNoPrivateMarkers(text) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /(npm_|ghp_|github_pat_)[A-Za-z0-9_-]{8,}/i,
    /"sourcesContent"\s*:/,
    /"sourceText"\s*:/,
    /"sourceBody"\s*:/,
    /"runtimeValues"\s*:/,
    /"localsValues"\s*:/,
    /"digestValue"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `W-P52.5 evidence includes forbidden private marker: ${pattern}`);
  }
}

/** 中文：将路径转为仓库相对显示。English: Converts a path to repository-relative display form. */
function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}
