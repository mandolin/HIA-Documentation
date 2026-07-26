import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vscodeEvidencePath = path.join(rootDir, "dist", "wp50-vscode-authoring-surface", "evidence.json");
const devtoolsEvidencePath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioEvidencePath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const outputRoot = path.join(rootDir, "dist", "wp50-devtools-visual-studio-authoring-projection");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "devtools-visual-studio-authoring-projection.md");

await main();

/**
 * 准备 W-P50.3 DevTools / Visual Studio authoring projection evidence。
 * Prepare W-P50.3 evidence for DevTools / Visual Studio authoring projection.
 *
 * @lang zh-CN 本脚本复用 W-P50.2 VS Code authoring surface 的 contract，
 * 只验证 DevTools 与 Visual Studio 是否能只读展示同一类 authoring guidance。
 * 它不启动 Chrome 或 Visual Studio，不调用宿主 editor API，不输出源码正文，也不启用 checked apply。
 * @lang en This script reuses the W-P50.2 VS Code authoring surface contract
 * and only verifies that DevTools and Visual Studio can project the same
 * authoring guidance read-only. It does not launch Chrome or Visual Studio,
 * call host editor APIs, emit source bodies, or enable checked apply.
 *
 * @returns {Promise<void>} Writes public-safe W-P50.3 evidence and report.
 */
async function main() {
  const inputs = await readInputs();

  assert.equal(inputs.vscode.status, "ready-for-wp50-devtools-visual-studio-projection");
  assert.equal(inputs.devtools.panel.reviewSurface.authoringProjection.status, "input-ready");
  assert.equal(inputs.visualStudio.reviewSurface.authoringProjection.status, "input-ready");

  const projections = createProjections(inputs);
  const summary = summarize(inputs, projections);
  const checks = createChecks(summary, projections);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp50-devtools-visual-studio-authoring-projection",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.3",
    status: hardFailures.length === 0 ? "ready-for-wp50-generated-binding-authoring-input" : "blocked-by-wp50-host-authoring-projection",
    sourceEvidence: {
      vscodeAuthoringSurface: normalizePath(vscodeEvidencePath),
      devtoolsCheck: normalizePath(devtoolsEvidencePath),
      visualStudioCheck: normalizePath(visualStudioEvidencePath)
    },
    projections,
    executionPolicy: {
      policy: "devtools-visual-studio-authoring-projection-read-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayLaunchHostRuntime: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartAnotherWPhase: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      surfaceSummary: normalizePath(reportPath)
    },
    nextStageInputs: [
      {
        phase: "W-P50.4",
        status: "ready-input",
        topic: "generated-binding-authoring-input",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P50.5",
        status: "ready-input",
        topic: "self-doc-remediation-ledger",
        writeAuthorityGranted: false
      }
    ]
  };
  const serialized = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serialized, "W-P50.3 DevTools / Visual Studio authoring projection evidence");
  assert.equal(hardFailures.length, 0, `W-P50.3 host authoring projection has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serialized}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");

  console.log(`W-P50.3 DevTools / Visual Studio authoring projection evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50.3 status: ${evidence.status}`);
}

async function readInputs() {
  const [vscode, devtools, visualStudio] = await Promise.all([
    readJson(vscodeEvidencePath),
    readJson(devtoolsEvidencePath),
    readJson(visualStudioEvidencePath)
  ]);

  return {
    devtools,
    visualStudio,
    vscode
  };
}

function createProjections(inputs) {
  const devtools = inputs.devtools.panel.reviewSurface.authoringProjection;
  const visualStudio = inputs.visualStudio.reviewSurface.authoringProjection;

  return [
    {
      authoringModeCount: devtools.authoringModeCount,
      canonicalMarkerCount: devtools.canonicalMarkerCount,
      changedScopePreviewVisible: devtools.changedScopePreviewVisible,
      contract: devtools.contract,
      coverageRemediationVisible: devtools.coverageRemediationVisible,
      fixtureGuidanceVisible: devtools.fixtureGuidanceVisible,
      host: "Chrome DevTools Extension",
      hostId: "devtools-extension",
      sourceBodyIncluded: devtools.sourceBodyIncluded,
      sourcesContentPolicy: devtools.sourcesContentPolicy,
      status: devtools.status,
      writeAuthority: "disabled"
    },
    {
      authoringModeCount: visualStudio.authoringModeCount,
      canonicalMarkerCount: visualStudio.canonicalMarkers.length,
      changedScopePreviewVisible: visualStudio.changedScopePreviewVisible,
      contract: visualStudio.contract,
      coverageRemediationVisible: visualStudio.coverageRemediationVisible,
      fixtureGuidanceVisible: visualStudio.fixtureGuidanceVisible,
      host: "Visual Studio Extension",
      hostId: "visual-studio-extension",
      sourceBodyIncluded: visualStudio.sourceBodyIncluded,
      sourcesContentPolicy: visualStudio.sourcesContentPolicy,
      status: visualStudio.status,
      writeAuthority: "disabled"
    }
  ];
}

function summarize(inputs, projections) {
  return {
    phase: "W-P50.3",
    vscodeBaselineReady: inputs.vscode.status === "ready-for-wp50-devtools-visual-studio-projection",
    devtoolsReady: projections.some((item) => item.hostId === "devtools-extension" && item.status === "input-ready"),
    visualStudioReady: projections.some((item) => item.hostId === "visual-studio-extension" && item.status === "input-ready"),
    projectionHostCount: projections.length,
    readyProjectionHostCount: projections.filter((item) => item.status === "input-ready").length,
    authoringModeCountMin: Math.min(...projections.map((item) => item.authoringModeCount)),
    canonicalMarkerCountMin: Math.min(...projections.map((item) => item.canonicalMarkerCount)),
    changedScopePreviewVisibleHostCount: projections.filter((item) => item.changedScopePreviewVisible).length,
    coverageRemediationVisibleHostCount: projections.filter((item) => item.coverageRemediationVisible).length,
    fixtureGuidanceVisibleHostCount: projections.filter((item) => item.fixtureGuidanceVisible).length,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    hostRuntimeLaunchCount: 0,
    sourceBodyOutputCount: projections.filter((item) => item.sourceBodyIncluded).length,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: projections.filter((item) => item.sourcesContentPolicy !== "none").length,
    sourcesContentPolicy: "none",
    nextWPhaseStarted: false,
    anotherWPhaseStarted: false,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationClaimed: false
  };
}

function createChecks(summary, projections) {
  return [
    check("vscode-baseline-ready", summary.vscodeBaselineReady, "W-P50.2 VS Code baseline is ready."),
    check("projection-hosts-ready", summary.projectionHostCount === 2 && summary.readyProjectionHostCount === 2 && summary.devtoolsReady && summary.visualStudioReady, "DevTools and Visual Studio authoring projections are ready."),
    check("markers-visible", summary.authoringModeCountMin >= 5 && summary.canonicalMarkerCountMin >= 3, "Both projections expose authoring modes and canonical markers."),
    check("guidance-visible", summary.changedScopePreviewVisibleHostCount === projections.length && summary.coverageRemediationVisibleHostCount === projections.length && summary.fixtureGuidanceVisibleHostCount === projections.length, "Both projections expose changed-scope, coverage, and fixture guidance."),
    check("next-stage-not-started", summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P50.4 input is ready without starting another W phase."),
    check("no-host-runtime-or-editor-call", summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0, "No host runtime or editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies or sourcesContent are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderReport(evidence) {
  const rows = evidence.projections
    .map((item) => `| ${item.host} | ${item.status} | ${item.authoringModeCount} | ${item.canonicalMarkerCount} | ${item.changedScopePreviewVisible ? "yes" : "no"} | ${item.writeAuthority} |`)
    .join("\n");
  const summary = evidence.summary;

  return `# W-P50.3 DevTools / Visual Studio Authoring Projection

## 中文摘要

W-P50.3 已把 W-P50.2 的 VS Code authoring surface baseline 投射到 Chrome DevTools Extension 与 Visual Studio Extension。两个宿主都只展示 authoring guidance：canonical locale markers、changed-scope preview、coverage remediation 和 fixture guidance；写入、宿主 editor API、provider/network、target mutation 与源码正文输出继续保持禁用。

## Projection Matrix

| host | status | modes | markers | changed-scope | write |
| --- | --- | ---: | ---: | --- | --- |
${rows}

## Safety Boundary

- checked apply write: ${summary.checkedApplyWriteEnabledCount === 0 ? "disabled" : "enabled"}
- workspace write: ${summary.workspaceWriteAllowedCount === 0 ? "disabled" : "enabled"}
- target mutation: ${summary.targetRepositoryMutationCount === 0 ? "disabled" : "enabled"}
- host editor API: ${summary.hostEditorApiCallCount === 0 ? "disabled" : "enabled"}
- provider/network: ${summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0 ? "disabled" : "enabled"}
- sourcesContent policy: ${summary.sourcesContentPolicy}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text, label) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/,
    /"sourcesContent"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
