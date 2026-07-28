import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createDocSourceMapIndex,
  createGeneratedDocumentationBindingHostProjection,
  createGeneratedDocumentationBindingIndex
} from "../packages/source-linkage/dist/index.js";
import { renderProjectHtmlDocument } from "../packages/renderer-html/dist/index.js";
import {
  createHiaVscodeGeneratedBindingRelationChoices,
  createHiaVscodeGeneratedBindingRelationReport
} from "../apps/vscode-extension/dist/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pugDocRoot = path.resolve(root, "..", "HIA", "hia-pugdoc");
const outputRoot = path.join(root, "dist", "wp52-renderer-and-host-projection");
const devToolsPayloadPath = path.join(root, "apps", "devtools-extension", "browser-panel-payload.json");
const devToolsCheckPath = path.join(root, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(root, "dist", "visual-studio-extension-check.json");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * 生成 W-P52.6 renderer 与四宿主只读 projection evidence。
 * Generates W-P52.6 renderer and four-host read-only projection evidence.
 *
 * @remarks
 * 中文：仅在临时目录运行已提交的 Pug fixture producer。随后由 W-P52.5 index 生成
 * public-safe host projection，实际交给 HTML renderer、VS Code report helper 与
 * DevTools view model 消费；Visual Studio 使用同一 contract 的嵌入式静态摘要。
 * 本脚本不读取 sidecar path、不执行 expression/locals、不写 ordinary doc-source-map，
 * 也不启动宿主、网络、checked apply 或目标仓库写入。
 * English: Runs the committed Pug fixture producer only in a temporary directory.
 * The W-P52.5 index then creates a public-safe host projection actually consumed
 * by the HTML renderer, VS Code report helper, and DevTools view model; Visual
 * Studio uses an embedded static summary of the same contract. This script does
 * not read a sidecar path, execute expressions/locals, write an ordinary
 * doc-source-map, or start hosts, network, checked apply, or target writes.
 */
async function main() {
  const temporaryOutput = await fsp.mkdtemp(path.join(os.tmpdir(), "hia-wp52-6-"));
  try {
    const inputs = await readInputs();
    const { sidecar, docSourceMap } = await producePugFixture(temporaryOutput, inputs.pugEvidence);
    const bindingIndex = createGeneratedDocumentationBindingIndex(sidecar, {
      docSourceMapIndex: createDocSourceMapIndex(docSourceMap, { path: "bindings.docmap.json" }),
      path: "bindings.gdb.json"
    });
    assert.equal(bindingIndex.status, "available", "W-P52.5 index must be available before host projection.");
    assert.equal(bindingIndex.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length, 0);

    const projection = createGeneratedDocumentationBindingHostProjection(bindingIndex);
    const htmlProjection = verifyHtmlRendererProjection(projection);
    const vscodeProjection = verifyVscodeProjection(projection);
    const devtoolsProjection = await verifyDevToolsProjection(projection);
    const visualStudioProjection = verifyVisualStudioProjection(inputs.visualStudioCheck);
    const summary = summarize({ projection, htmlProjection, vscodeProjection, devtoolsProjection, visualStudioProjection });
    const checks = createChecks(summary);
    const hardFailures = checks.filter((check) => check.status === "fail");
    const projectionEnvelope = {
      contract: "hia-wp52-renderer-and-host-projection-evidence",
      contractVersion: "0.1.0-draft",
      phase: "W-P52.6",
      status: hardFailures.length === 0
        ? "ready-for-wp52-cross-language-reuse-and-closeout"
        : "blocked-by-wp52-renderer-and-host-projection",
      projection,
      summary: projection.summary
    };
    const evidence = {
      ...projectionEnvelope,
      createdAt: new Date().toISOString(),
      cycleGroupId: "C-HIA-P3",
      sourceInputs: {
        generatedBindingContract: {
          contract: inputs.contractEvidence.summary.contract,
          status: inputs.contractEvidence.status
        },
        bidirectionalSourceLinkage: {
          status: inputs.linkageEvidence.status,
          bindingCount: inputs.linkageEvidence.summary.bindingCount,
          expansionCount: inputs.linkageEvidence.summary.expansionCount,
          targetCount: inputs.linkageEvidence.summary.targetCount
        },
        pugOneToManyFixture: {
          status: inputs.pugEvidence.status,
          bindingCount: inputs.pugEvidence.summary.bindingCount,
          expansionCount: inputs.pugEvidence.summary.expansionCount,
          targetCount: inputs.pugEvidence.summary.targetCount
        }
      },
      hostProjections: [htmlProjection, vscodeProjection, devtoolsProjection, visualStudioProjection],
      executionPolicy: {
        policy: "generated-binding-host-projection-read-only",
        sidecarPathReadByHost: false,
        ordinaryDocSourceMapFullBindingModelEmbedded: false,
        templateRuntimeDataMayBeExecuted: false,
        arbitraryExpressionMayBeEvaluated: false,
        sourceBodyMayBeSerialized: false,
        sourceRangeMayBeSerialized: false,
        localsValueMayBeSerialized: false,
        digestMayBeSerialized: false,
        hostRuntimeMayBeLaunched: false,
        hostEditorApiMayBeCalled: false,
        checkedApplyWriteMayBeEnabled: false,
        workspaceWriteMayBeAllowed: false,
        providerNetworkMayBeExecuted: false,
        targetRepositoryMayBeMutated: false,
        sourcesContentPolicy: "none"
      },
      summary: {
        ...summary,
        hardFailureCount: hardFailures.length
      },
      checks,
      generatedDocs: {
        overview: "dist/wp52-renderer-and-host-projection/renderer-and-host-projection.md",
        hostMatrix: "dist/wp52-renderer-and-host-projection/host-projection-matrix.md",
        bindingRelationProjection: "dist/wp52-renderer-and-host-projection/binding-relation-projection.json"
      }
    };
    const serializedEvidence = JSON.stringify(evidence, null, 2);
    const serializedProjection = JSON.stringify(projectionEnvelope, null, 2);

    assertNoPrivateMarkers(serializedEvidence, "W-P52.6 evidence");
    assertNoPrivateMarkers(serializedProjection, "W-P52.6 binding relation projection");
    if (hardFailures.length > 0) {
      console.error(`W-P52.6 failed checks: ${hardFailures.map((check) => check.id).join(", ")}`);
    }
    assert.equal(hardFailures.length, 0, `W-P52.6 has ${hardFailures.length} hard failure(s).`);

    fs.rmSync(outputRoot, { recursive: true, force: true });
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, "evidence.json"), `${serializedEvidence}\n`, "utf8");
    fs.writeFileSync(path.join(outputRoot, "binding-relation-projection.json"), `${serializedProjection}\n`, "utf8");
    fs.writeFileSync(path.join(outputRoot, "renderer-and-host-projection.md"), renderOverview(evidence), "utf8");
    fs.writeFileSync(path.join(outputRoot, "host-projection-matrix.md"), renderHostMatrix(evidence), "utf8");
    console.log(`W-P52.6 renderer and host projection evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
    console.log(`Decision status: ${evidence.status}`);
  } finally {
    await fsp.rm(temporaryOutput, { recursive: true, force: true });
  }
}

async function readInputs() {
  const [contractEvidence, linkageEvidence, pugEvidence, visualStudioCheck] = await Promise.all([
    readJson(path.join(root, "dist", "wp52-generated-doc-binding-contract", "evidence.json")),
    readJson(path.join(root, "dist", "wp52-bidirectional-source-linkage", "evidence.json")),
    readJson(path.join(pugDocRoot, "dist", "wp52-pug-one-to-many-parser-fixtures", "evidence.json")),
    readJson(visualStudioCheckPath)
  ]);
  assert.equal(contractEvidence.status, "ready-for-wp52-pug-one-to-many-parser-fixtures");
  assert.equal(linkageEvidence.status, "ready-for-wp52-renderer-and-host-projection");
  assert.equal(pugEvidence.status, "ready-for-wp52-bidirectional-source-linkage");
  assert.equal(visualStudioCheck.contract, "hia-visual-studio-extension-check");
  return { contractEvidence, linkageEvidence, pugEvidence, visualStudioCheck };
}

async function producePugFixture(temporaryOutput, pugEvidence) {
  const { runPugDoc } = await import(pathToFileURL(path.join(pugDocRoot, "packages", "pugdoc-runner", "src", "index.mjs")));
  const producerResult = await runPugDoc({
    workspaceRoot: pugDocRoot,
    outputDirectory: temporaryOutput,
    inputs: [{
      kind: "pug-entry",
      path: "fixtures/generated-binding-runtime/src/pages/bindings.pug",
      artifactBasePath: "bindings",
      locals: createGeneratedBindingLocals().values,
      generatedBindingLocals: createGeneratedBindingLocals()
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
  assert.equal(sidecar.bindings.length, pugEvidence.summary.bindingCount);
  assert.equal(sidecar.expansions.length, pugEvidence.summary.expansionCount);
  assert.equal(sidecar.targets.length, pugEvidence.summary.targetCount);
  return { sidecar, docSourceMap };
}

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

function verifyHtmlRendererProjection(projection) {
  const entries = projection.bindings.flatMap((binding) => binding.targets.map((target) => ({
    id: target.id,
    name: target.identity.symbolId ?? target.id,
    kind: target.identity.kind,
    symbolId: target.identity.symbolId,
    view: "html"
  })));
  const result = renderProjectHtmlDocument({
    project: { id: "fixture:generated-binding-projection", name: "Generated Binding Projection" },
    entries,
    generatedDocumentationBindingProjection: projection
  }, {
    projectSite: { layout: "single-page", source: { presentation: "none" } }
  });
  const html = result.files.find((file) => file.path === "index.html")?.contents ?? "";
  const projectIndex = result.files.find((file) => file.path === "project-index.json")?.contents ?? "";

  assert.match(html, /Generated Documentation Bindings/u);
  assert.equal(html.includes(projection.bindings[0]?.id ?? "binding:missing"), true);
  assert.equal(html.includes("Sources Content"), false);
  assert.equal(projectIndex.includes("generatedDocumentationBindingProjection"), true);
  assert.equal(projectIndex.includes("\"sourcesContent\""), false);
  assert.equal(projectIndex.includes("Sky"), false);
  return {
    host: "html-renderer",
    status: "projection-ready",
    bindingCount: projection.summary.bindingCount,
    targetCount: projection.summary.targetCount,
    relationVisible: html.includes(projection.bindings[0]?.id ?? "binding:missing"),
    threeQualityDimensionsVisible: /exact \/ high \/ source-and-generated/u.test(html),
    diagnosticsVisible: html.includes("Diagnostics / 诊断"),
    sourceBodyIncluded: false,
    sidecarPathIncluded: false,
    localsValueIncluded: false,
    sourcesContentPolicy: "none",
    writeAuthority: "disabled"
  };
}

function verifyVscodeProjection(projection) {
  const envelope = {
    contract: "hia-wp52-renderer-and-host-projection-evidence",
    contractVersion: "0.1.0-draft",
    phase: "W-P52.6",
    status: "ready-for-wp52-cross-language-reuse-and-closeout",
    projection,
    summary: projection.summary
  };
  const choices = createHiaVscodeGeneratedBindingRelationChoices(envelope);
  const report = createHiaVscodeGeneratedBindingRelationReport(envelope, choices[0]?.relation);

  assert.equal(choices.length, projection.summary.bindingCount);
  assert.equal(report.some((line) => line.startsWith("Targets / 目标:")), true);
  assert.equal(report.some((line) => line.startsWith("Stable instance keys / 稳定实例键:")), true);
  assert.equal(report.some((line) => line.startsWith("Source body / 源码正文: not included")), true);
  return {
    host: "vscode-extension",
    status: "projection-ready",
    bindingCount: choices.length,
    targetCount: projection.summary.targetCount,
    relationVisible: choices.length === projection.summary.bindingCount,
    threeQualityDimensionsVisible: report.some((line) => line.startsWith("Resolution / 解析质量:")),
    diagnosticsVisible: report.some((line) => line.startsWith("Diagnostics / 诊断:")),
    sourceBodyIncluded: false,
    sidecarPathIncluded: false,
    localsValueIncluded: false,
    sourcesContentPolicy: "none",
    writeAuthority: "disabled"
  };
}

async function verifyDevToolsProjection(projection) {
  const payload = readJson(devToolsPayloadPath);
  payload.generatedDocumentationBindingProjection = projection;
  const { createHiaDevToolsPanelViewModel } = await import(pathToFileURL(path.join(root, "apps", "devtools-extension", "panel-core.js")));
  const viewModel = createHiaDevToolsPanelViewModel(payload);
  const hostProjection = viewModel.review.generatedDocumentationBindingProjection;

  assert.equal(hostProjection.status, "available");
  assert.equal(hostProjection.bindingCount, projection.summary.bindingCount);
  assert.equal(hostProjection.targetCount, projection.summary.targetCount);
  assert.equal(hostProjection.targetRelationVisible, true);
  assert.equal(hostProjection.threeQualityDimensionsVisible, true);
  assert.equal(hostProjection.sourceBodyIncluded, false);
  assert.equal(hostProjection.workspaceWriteAllowed, false);
  return {
    host: "chrome-devtools-extension",
    status: "projection-ready",
    bindingCount: hostProjection.bindingCount,
    targetCount: hostProjection.targetCount,
    relationVisible: hostProjection.targetRelationVisible,
    threeQualityDimensionsVisible: hostProjection.threeQualityDimensionsVisible,
    diagnosticsVisible: hostProjection.diagnosticCount === projection.summary.diagnosticCount,
    sourceBodyIncluded: hostProjection.sourceBodyIncluded,
    sidecarPathIncluded: false,
    localsValueIncluded: false,
    sourcesContentPolicy: hostProjection.sourcesContentPolicy,
    writeAuthority: hostProjection.writeAuthority
  };
}

function verifyVisualStudioProjection(visualStudioCheck) {
  const projection = visualStudioCheck.reviewSurface?.generatedDocumentationBindingProjection;
  assert.equal(projection?.status, "available");
  assert.equal(projection?.summary?.bindingCount, 4);
  assert.equal(projection?.summary?.expansionCount, 6);
  assert.equal(projection?.summary?.targetCount, 6);
  assert.equal(projection?.summary?.stableInstanceKeyCount, 6);
  assert.equal(projection?.targetRelationVisible, true);
  assert.equal(projection?.threeQualityDimensionsVisible, true);
  assert.equal(projection?.sourceBodyIncluded, false);
  assert.equal(projection?.workspaceWriteAvailable, false);
  return {
    host: "visual-studio-extension",
    status: "projection-ready",
    bindingCount: projection.summary.bindingCount,
    targetCount: projection.summary.targetCount,
    relationVisible: projection.targetRelationVisible,
    threeQualityDimensionsVisible: projection.threeQualityDimensionsVisible,
    diagnosticsVisible: projection.diagnosticsVisible === true,
    sourceBodyIncluded: projection.sourceBodyIncluded,
    sidecarPathIncluded: projection.sidecarPathIncluded,
    localsValueIncluded: projection.localsValueIncluded,
    sourcesContentPolicy: projection.sourcesContentPolicy,
    writeAuthority: "disabled"
  };
}

function summarize({ projection, htmlProjection, vscodeProjection, devtoolsProjection, visualStudioProjection }) {
  const hosts = [htmlProjection, vscodeProjection, devtoolsProjection, visualStudioProjection];
  return {
    phase: "W-P52.6",
    bindingCount: projection.summary.bindingCount,
    expansionCount: projection.summary.expansionCount,
    targetCount: projection.summary.targetCount,
    diagnosticCount: projection.summary.diagnosticCount,
    stableInstanceKeyCount: projection.summary.stableInstanceKeyCount,
    hostProjectionCount: hosts.length,
    readyHostProjectionCount: hosts.filter((host) => host.status === "projection-ready").length,
    relationVisibleHostCount: hosts.filter((host) => host.relationVisible).length,
    threeQualityDimensionsVisibleHostCount: hosts.filter((host) => host.threeQualityDimensionsVisible).length,
    diagnosticsVisibleHostCount: hosts.filter((host) => host.diagnosticsVisible).length,
    sourceBodyIncludedHostCount: hosts.filter((host) => host.sourceBodyIncluded).length,
    sidecarPathIncludedHostCount: hosts.filter((host) => host.sidecarPathIncluded).length,
    localsValueIncludedHostCount: hosts.filter((host) => host.localsValueIncluded).length,
    unsafeSourcesContentPolicyHostCount: hosts.filter((host) => host.sourcesContentPolicy !== "none").length,
    writeAuthorityEnabledHostCount: hosts.filter((host) => host.writeAuthority !== "disabled").length,
    ordinaryDocSourceMapFullBindingModelEmbedded: false,
    templateRuntimeDataExecutionCount: 0,
    arbitraryExpressionEvaluationCount: 0,
    hostRuntimeLaunchCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyWriteEnabledCount: 0,
    workspaceWriteAllowedCount: 0,
    providerNetworkExecutedCount: 0,
    targetRepositoryMutationCount: 0,
    sourceTextSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentPolicy: "none"
  };
}

function createChecks(summary) {
  return [
    check("pug-fixture-projection", summary.bindingCount === 4 && summary.expansionCount === 6 && summary.targetCount === 6 && summary.stableInstanceKeyCount === 6, "Actual Pug sidecar reaches the host projection with 4 bindings, 6 expansions, 6 targets, and 6 stable instance keys."),
    check("four-host-read-only-projection", summary.hostProjectionCount === 4 && summary.readyHostProjectionCount === 4 && summary.relationVisibleHostCount === 4, "HTML, VS Code, DevTools, and Visual Studio all expose the one-to-many relation read-only."),
    check("three-quality-dimensions-visible", summary.threeQualityDimensionsVisibleHostCount === 4, "All hosts show resolution, confidence, and provenance as separate dimensions."),
    check("diagnostics-visible", summary.diagnosticsVisibleHostCount === 4 && summary.diagnosticCount === 1, "All hosts retain the one paired doc-source-map information diagnostic without inventing errors."),
    check("privacy-projection-clean", summary.sourceBodyIncludedHostCount === 0 && summary.sidecarPathIncludedHostCount === 0 && summary.localsValueIncludedHostCount === 0 && summary.unsafeSourcesContentPolicyHostCount === 0 && summary.sourceTextSerializedCount === 0 && summary.digestValueSerializedCount === 0 && summary.localPathExposureCount === 0 && summary.credentialMarkerCount === 0, "Host projections exclude source body/range, sidecar path, locals values, digests, local paths, and credentials."),
    check("no-write-or-execution", summary.writeAuthorityEnabledHostCount === 0 && summary.templateRuntimeDataExecutionCount === 0 && summary.arbitraryExpressionEvaluationCount === 0 && summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0 && summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.targetRepositoryMutationCount === 0, "No expression execution, host runtime/editor call, write, network, or target mutation is enabled."),
    check("ordinary-doc-source-map-stays-reference-only", summary.ordinaryDocSourceMapFullBindingModelEmbedded === false, "Ordinary doc-source-map remains reference-only; the full binding model is not embedded.")
  ];
}

function check(id, condition, message) {
  return { id, status: condition ? "pass" : "fail", message };
}

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P52.6 Renderer And Host Projection

## 中文摘要

W-P52.6 已以 W-P52.5 的内存只读双向 index 为唯一数据入口，把实际 Pug fixture 的
生成式文档绑定投影到 HTML renderer、VS Code、Chrome DevTools 与 Visual Studio。四个
宿主都能显示上游 binding、展开实例、下游 targets、stable instance key、resolution /
confidence / provenance 与 diagnostics 维度；它们不加载 sidecar path、不读源码正文、
不执行 expression/locals，也不启用写入。

## 实际输入

- bindings / expansions / targets：${summary.bindingCount} / ${summary.expansionCount} / ${summary.targetCount}
- stable instance keys：${summary.stableInstanceKeyCount}
- diagnostics：${summary.diagnosticCount}
- host projections ready：${summary.readyHostProjectionCount}/${summary.hostProjectionCount}

## 固定边界

- ordinary doc-source-map full binding model embedded：${summary.ordinaryDocSourceMapFullBindingModelEmbedded}
- source body / sidecar path / locals value visible host count：${summary.sourceBodyIncludedHostCount} / ${summary.sidecarPathIncludedHostCount} / ${summary.localsValueIncludedHostCount}
- checked apply / workspace write / network / target mutation：${summary.checkedApplyWriteEnabledCount} / ${summary.workspaceWriteAllowedCount} / ${summary.providerNetworkExecutedCount} / ${summary.targetRepositoryMutationCount}
- 下一阶段尚未开始：W-P52.7 只获得输入，不在本阶段执行。
`;
}

function renderHostMatrix(evidence) {
  const rows = evidence.hostProjections
    .map((host) => `| ${host.host} | ${host.status} | ${host.bindingCount} | ${host.targetCount} | ${host.relationVisible ? "yes" : "no"} | ${host.threeQualityDimensionsVisible ? "yes" : "no"} | ${host.writeAuthority} |`)
    .join("\n");
  return `# W-P52.6 宿主投影矩阵

| 宿主 | 状态 | bindings | targets | relation | 三维质量 | 写入 |
| --- | --- | ---: | ---: | --- | --- | --- |
${rows}

所有行都消费 generated-documentation-binding-host-projection@0.1.0-draft
的安全投影，且 sourcesContentPolicy=none。这不是普通 doc-source-map 的完整模型嵌入。
`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text, label) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/,
    /"sourcesContent"\s*:/,
    /"sidecarPath"\s*:/,
    /"localsValue"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
