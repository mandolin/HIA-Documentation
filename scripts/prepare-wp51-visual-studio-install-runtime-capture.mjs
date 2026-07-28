import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const captureDir = path.join(appRoot, "runtime-capture");
const capturePath = path.join(captureDir, "capture.json");
const hostContractPath = path.join(appRoot, "host-contract.json");
const baselinePath = path.join(appRoot, "implementation-baseline.json");
const outputDir = path.join(rootDir, "dist", "wp51-visual-studio-install-runtime-capture");

await main();

/**
 * 校验并规范化 W-P51.6 的真实 Visual Studio 宿主证据。
 * Validate and normalize the W-P51.6 real Visual Studio host evidence.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const hostContract = JSON.parse(await readFile(hostContractPath, "utf8"));
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const serializedCapture = JSON.stringify(capture);

  assert.equal(capture.contract, "hia-visual-studio-runtime-capture");
  assert.equal(capture.contractVersion, "0.1.0-draft");
  assert.equal(capture.phase, "W-P51.6");
  assert.equal(capture.status, "captured");
  assert.equal(capture.deployment.model, "visualstudio-extensibility-f5-oop-experimental-instance");
  assert.equal(capture.deployment.commandLineMode, "/RootSuffix Exp /OopExtDebug");
  assert.equal(capture.deployment.sdkExperimentalDeploymentSucceeded, true);
  assert.equal(capture.deployment.vsixInstallerCustomRootSuffixSupported, false);
  assert.equal(capture.deployment.ordinaryInstanceInstallClaimed, false);
  assert.equal(capture.deployment.ordinaryInstanceExtensionSetModified, false);
  assert.equal(capture.vsix.identity, "HiaDocumentation.VisualStudio.f56aeeb6-e79c-4656-a536-dbdc9acfbdb6");
  assert.equal(capture.vsix.version, "0.1.0.0");
  assert.match(capture.vsix.sha256, /^[A-F0-9]{64}$/u);
  assert.equal(capture.vsix.byteCount, 4467598);
  assert.equal(capture.vsix.extensionType, "VisualStudio.Extensibility");
  assert.equal(capture.vsix.installationTargetRange, "[17.14,)");
  assert.deepEqual(capture.vsix.targetArchitectures, ["amd64", "arm64"]);
  assert.equal(capture.vsix.targetFramework, "net8.0");

  assert.equal(hostContract.status, "install-runtime-captured");
  assert.equal(hostContract.runtime.actualVisualStudioRuntimeCaptureExecuted, true);
  assert.equal(hostContract.runtime.experimentalInstanceExecuted, true);
  assert.equal(hostContract.runtime.runtimeCapture.capturedHostCount, 2);
  assert.equal(baseline.status, "install-runtime-captured");
  assert.equal(baseline.phase, "W-P51.6");
  assert.equal(baseline.currentImplementation.runtimeCaptureExecuted, true);
  assert.equal(baseline.currentImplementation.runtimeCaptureHostCount, 2);

  assert.ok(Array.isArray(capture.hosts));
  assert.equal(capture.hosts.length, 2);
  assert.deepEqual(capture.hosts.map((host) => host.ideMajor), [17, 18]);
  assert.deepEqual(capture.hosts.map((host) => host.id), [
    "visual-studio-2022",
    "visual-studio-2026"
  ]);

  for (const host of capture.hosts) {
    assert.equal(host.captureState, "captured");
    assert.equal(host.experimentalInstanceExecuted, true);
    assert.equal(host.commandVisible, true);
    assert.equal(host.localizedToolWindowVisible, true);
    assert.equal(host.overviewStatus, "ready");
    assert.equal(host.languageServer.state, "ready");
    assert.equal(host.languageServer.reasonCode, "lsp-initialized");
    assert.equal(host.languageServer.runtimeOrigin, "vsix-content");
    assert.equal(host.languageServer.package, "@hia-doc/lsp");
    assert.equal(host.languageServer.packageVersion, "0.1.0");
    assert.equal(host.languageServer.transport, "stdio");
    assert.equal(host.liveAuthoring.state, "ready");
    assert.equal(host.liveAuthoring.reasonCode, "projection-requests-completed");
    assert.equal(host.liveAuthoring.sessionMode, "isolated-read-only");
    assert.equal(host.liveAuthoring.requestCount, 3);
    assert.equal(host.liveAuthoring.capabilityCount, 25);
    assert.equal(host.liveAuthoring.authoringLocationCount, 3);
    assert.equal(host.liveAuthoring.authoringLocationKindCount, 3);
    assert.equal(host.liveAuthoring.proposalCount, 1);
    assert.equal(host.liveAuthoring.draftCount, 1);
    assert.ok(Array.isArray(host.screenshots));
    assert.equal(host.screenshots.length, 3);
  }

  const screenshotNames = capture.hosts.flatMap((host) => host.screenshots);
  assert.equal(new Set(screenshotNames).size, 6);
  assert.equal(capture.summary.capturedHostCount, 2);
  assert.equal(capture.summary.experimentalInstanceExecutionCount, 2);
  assert.equal(capture.summary.sdkExperimentalDeploymentCount, 2);
  assert.equal(capture.summary.ordinaryInstanceInstallCount, 0);
  assert.equal(capture.summary.commandVisibleHostCount, 2);
  assert.equal(capture.summary.localizedToolWindowVisibleHostCount, 2);
  assert.equal(capture.summary.languageServerReadyHostCount, 2);
  assert.equal(capture.summary.liveAuthoringReadyHostCount, 2);
  assert.equal(capture.summary.screenshotCount, 6);
  assert.equal(capture.summary.hostEditorApiCallCount, 0);
  assert.equal(capture.summary.workspaceWriteCount, 0);
  assert.equal(capture.summary.targetRepositoryMutationCount, 0);

  assert.equal(capture.safety.publicSafeVisualInspectionCompleted, true);
  assert.equal(capture.safety.sourceBodyVisibleInScreenshots, false);
  assert.equal(capture.safety.absolutePathVisibleInScreenshots, false);
  assert.equal(capture.safety.credentialVisibleInScreenshots, false);
  assert.equal(capture.safety.sourcesContentPolicy, "none");
  assert.equal(capture.safety.sourceBodyIncluded, false);
  assert.equal(capture.safety.absolutePathIncluded, false);
  assert.equal(capture.safety.credentialIncluded, false);
  assert.equal(capture.safety.providerNetworkExecuted, false);
  assert.equal(capture.safety.hostEditorApiCalled, false);
  assert.equal(capture.safety.checkedApplyWriteEnabled, false);
  assert.equal(capture.safety.workspaceWriteAllowed, false);
  assert.equal(capture.safety.targetRepositoryMutationAllowed, false);
  assert.equal(capture.safety.targetCommandExecutedByHia, false);

  assert.doesNotMatch(serializedCapture, /[A-Za-z]:[\\/]/u);
  assert.doesNotMatch(serializedCapture, /BEGIN [A-Z ]*PRIVATE KEY/u);
  assert.doesNotMatch(serializedCapture, /(?:password|accessToken|apiKey|secretValue)"/iu);

  const screenshots = [];
  for (const name of screenshotNames) {
    assert.match(name, /^vs20(?:22|26)-(?:overview|live-authoring|language-server-ready)\.jpg$/u);
    const filePath = path.join(captureDir, name);
    const [body, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);

    assert.ok(fileStat.isFile(), `${name} must be a regular file.`);
    assert.ok(fileStat.size >= 100_000, `${name} must contain a legible runtime capture.`);
    assert.equal(body[0], 0xff, `${name} must start with a JPEG marker.`);
    assert.equal(body[1], 0xd8, `${name} must start with a JPEG marker.`);
    assert.equal(body.at(-2), 0xff, `${name} must end with a JPEG marker.`);
    assert.equal(body.at(-1), 0xd9, `${name} must end with a JPEG marker.`);

    screenshots.push({
      file: `apps/visual-studio-extension/runtime-capture/${name}`,
      byteCount: fileStat.size,
      sha256: createHash("sha256").update(body).digest("hex")
    });
  }

  const evidence = {
    contract: "hia-wp51-visual-studio-install-runtime-capture-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    phase: "W-P51.6",
    status: "ready-for-wp51-closeout",
    deployment: capture.deployment,
    vsix: capture.vsix,
    hosts: capture.hosts,
    screenshots,
    safety: capture.safety,
    summary: capture.summary,
    findings: [
      {
        code: "official-oop-experimental-deployment-confirmed",
        severity: "info",
        blocksCloseout: false
      },
      {
        code: "vsixinstaller-custom-root-not-supported-for-modern-extension",
        severity: "info",
        blocksCloseout: false
      },
      {
        code: "vs2026-non-hia-markdown-format-duplication-observed",
        severity: "warning",
        blocksCloseout: false
      }
    ]
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
  await writeFile(path.join(outputDir, "report.md"), buildReport(evidence), "utf8");

  console.log(`W-P51.6 Visual Studio runtime capture evidence written to ${path.relative(rootDir, outputDir)}.`);
}

/**
 * 构造中文优先的运行采集报告，不写入本机路径或源码正文。
 * Build a Chinese-first runtime report without local paths or source bodies.
 *
 * @param {object} evidence Normalized evidence.
 * @returns {string} Markdown report.
 */
function buildReport(evidence) {
  const hostRows = evidence.hosts.map((host) =>
    `| ${host.product} | ${host.version} | ${host.languageServer.state} / ${host.languageServer.reasonCode} | ${host.liveAuthoring.state} / ${host.liveAuthoring.reasonCode} | ${host.screenshots.length} |`
  ).join("\n");

  return `# W-P51.6 Visual Studio 安装与运行采集报告

## 结论

- 状态：\`${evidence.status}\`
- 部署路线：\`${evidence.deployment.model}\`
- 实验宿主：${evidence.summary.capturedHostCount}
- LSP ready：${evidence.summary.languageServerReadyHostCount}
- Live Authoring ready：${evidence.summary.liveAuthoringReadyHostCount}
- public-safe 截图：${evidence.summary.screenshotCount}

## 宿主矩阵

| 宿主 | 版本 | Language Server | Live Authoring | 截图 |
| --- | --- | --- | --- | --- |
${hostRows}

## 安装口径

现代 \`VisualStudio.Extensibility\` 扩展通过 SDK 的 \`/RootSuffix Exp /OopExtDebug\` F5 路线部署到实验实例。常规 \`VSIXInstaller\` 对这类扩展会转交 Visual Studio Installer，不能用于自定义 root suffix 的多实例安装。因此本阶段证明的是两代真实实验宿主运行成功，不声称普通实例已经安装，也未修改普通实例的扩展集合。

## 安全边界

- \`sourcesContentPolicy = none\`
- 未展示或保存源码正文、绝对路径、凭据。
- 未调用 host editor API。
- checked apply、workspace write、provider network 与目标仓库变更保持关闭。

## 非阻塞观察

Visual Studio 2026 实验实例的 ActivityLog 出现 6 个非 HIA Markdown editor-format 重复定义；HIA error entry 为 0，且 HIA Command、Tool Window、LSP 与 Live Authoring 均正常，因此不阻塞 W-P51.6 收口。
`;
}
