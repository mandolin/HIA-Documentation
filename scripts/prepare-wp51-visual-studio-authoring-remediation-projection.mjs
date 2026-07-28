import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const outputRoot = path.join(
  rootDir,
  "dist",
  "wp51-visual-studio-authoring-remediation-projection");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "report.md");

/**
 * <lang>
 * <zh-CN>验证 W-P51.5 的隔离只读 custom-request 投影、补救台账映射和 VSIX 解包自包含边界。</zh-CN>
 * <en>Validates the W-P51.5 isolated read-only custom-request projection, remediation mapping, and extraction-safe VSIX boundary.</en>
 * </lang>
 *
 * @returns {Promise<void>} Completion after public-safe evidence is written.
 */
async function main() {
  const contract = await readJson(
    path.join(appRoot, "host-contract.json"));
  const baseline = await readJson(
    path.join(appRoot, "implementation-baseline.json"));
  const reviewSurface = await readJson(
    path.join(appRoot, "review-surface.json"));
  const fixtureText = await readFile(
    path.join(appRoot, "authoring-probe.hia.json"),
    "utf8");
  const projectionSource = await readFile(
    path.join(appRoot, "AuthoringProjectionProbe.cs"),
    "utf8");
  const toolWindowSource = await readFile(
    path.join(appRoot, "DocumentationToolWindowData.cs"),
    "utf8");
  const xamlSource = await readFile(
    path.join(appRoot, "DocumentationToolWindowControl.xaml"),
    "utf8");
  const remediationEvidence = await readJson(path.join(
    rootDir,
    "dist",
    "wp50-self-doc-remediation-ledger",
    "evidence.json"));
  const generatedBindingEvidence = await readJson(path.join(
    rootDir,
    "dist",
    "wp50-generated-binding-authoring-input",
    "evidence.json"));

  assert.equal(contract.status, "authoring-remediation-projection");
  assert.equal(baseline.phase, "W-P51.5");
  assert.equal(contract.runtime.authoringProjectionImplemented, true);
  assert.equal(
    contract.authoringProjection.mode,
    "isolated-read-only-lsp-session");
  assert.deepEqual(contract.authoringProjection.requests, [
    "hia/ideCapabilities",
    "hia/documentAuthoringLocations",
    "hia/documentationEditProposals"
  ]);
  assert.equal(contract.authoringProjection.syntheticFixtureOnly, true);
  assert.equal(
    contract.authoringProjection.sharesVisualStudioManagedLspStream,
    false);
  assert.equal(contract.authoringProjection.includesSourceContent, false);
  assert.equal(contract.authoringProjection.allowsAutomaticWrites, false);
  assert.equal(contract.authoringProjection.hostEditorApiCalled, false);
  assert.equal(contract.authoringProjection.workspaceWriteAllowed, false);
  assert.equal(
    contract.authoringProjection.targetRepositoryMutationAllowed,
    false);

  assert.equal(
    reviewSurface.authoringProjection.remediationBatchCount,
    remediationEvidence.summary.remediationBatchCount);
  assert.equal(
    reviewSurface.authoringProjection.p0RemediationBatchCount,
    remediationEvidence.summary.p0RemediationBatchCount);
  assert.equal(
    reviewSurface.authoringProjection.publicExportedNodeCount,
    remediationEvidence.summary.publicExportedNodeCount);
  assert.equal(
    reviewSurface.authoringProjection.missingDocBlockCount,
    remediationEvidence.summary.missingDocBlockCount);
  assert.equal(
    reviewSurface.authoringProjection.missingBilingualMarkerCount,
    remediationEvidence.summary.missingBilingualMarkerCount);
  assert.equal(
    reviewSurface.authoringProjection.generatedBindingAuthoringStepCount,
    generatedBindingEvidence.summary.authoringStepCount);
  assert.equal(
    reviewSurface.authoringProjection
      .generatedBindingDiagnosticGuidanceCount,
    generatedBindingEvidence.summary.diagnosticGuidanceCount);
  assert.equal(
    reviewSurface.authoringProjection.generatedBindingConcreteSyntaxFrozen,
    generatedBindingEvidence.summary.concreteSyntaxFrozen);

  assert.match(projectionSource, /hia\/ideCapabilities/u);
  assert.match(projectionSource, /hia\/documentAuthoringLocations/u);
  assert.match(projectionSource, /hia\/documentationEditProposals/u);
  assert.match(projectionSource, /projection-requests-completed/u);
  assert.match(toolWindowSource, /ProjectionMetrics/u);
  assert.match(toolWindowSource, /RefreshAuthoringProjectionAsync/u);
  assert.match(xamlSource, /ItemsSource="\{Binding ProjectionMetrics\}"/u);
  assert.doesNotMatch(
    `${projectionSource}\n${toolWindowSource}`,
    /WorkspaceEdit|workspace\.apply|WriteAllText|WriteAllBytes/u);

  const debug = await inspectBuild("Debug", fixtureText);
  const release = await inspectBuild("Release", fixtureText);
  assertProjection(debug.projection);
  assertProjection(release.projection);
  assert.deepEqual(release.projection, debug.projection);

  const summary = {
    phase: "W-P51.5",
    liveProjectionConfigurationCount: 2,
    liveProjectionRequestCount:
      debug.projection.requestCount + release.projection.requestCount,
    capabilityCount: debug.projection.capabilityCount,
    availableCapabilityCount:
      debug.projection.availableCapabilityCount,
    partialCapabilityCount: debug.projection.partialCapabilityCount,
    plannedCapabilityCount: debug.projection.plannedCapabilityCount,
    unsupportedCapabilityCount:
      debug.projection.unsupportedCapabilityCount,
    authoringLocationCount: debug.projection.authoringLocationCount,
    authoringLocationKindCount:
      debug.projection.authoringLocationKindCount,
    proposalCount: debug.projection.proposalCount,
    draftCount: debug.projection.draftCount,
    remediationBatchCount:
      reviewSurface.authoringProjection.remediationBatchCount,
    p0RemediationBatchCount:
      reviewSurface.authoringProjection.p0RemediationBatchCount,
    generatedBindingAuthoringStepCount:
      reviewSurface.authoringProjection
        .generatedBindingAuthoringStepCount,
    generatedBindingDiagnosticGuidanceCount:
      reviewSurface.authoringProjection
        .generatedBindingDiagnosticGuidanceCount,
    generatedBindingConcreteSyntaxFrozen:
      reviewSurface.authoringProjection
        .generatedBindingConcreteSyntaxFrozen,
    selfContainedRuntimeCount: Number(debug.selfContained)
      + Number(release.selfContained),
    runtimeSymbolicLinkCount:
      debug.runtimeSymbolicLinkCount
      + release.runtimeSymbolicLinkCount,
    pnpmVirtualStoreEntryCount:
      debug.pnpmVirtualStoreEntryCount
      + release.pnpmVirtualStoreEntryCount,
    actualVisualStudioRuntimeCaptureCount: 0,
    experimentalInstanceExecutionCount: 0,
    vsixInstallCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyWriteEnabledCount: 0,
    workspaceWriteCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutionCount: 0,
    sourceBodyOutputCount: 0,
    sourcesContentEntryCount: 0,
    sourcesContentPolicy: "none",
    hardFailureCount: 0
  };

  const evidence = {
    contract:
      "hia-wp51-visual-studio-authoring-remediation-projection-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp51-install-runtime-capture",
    phase: "W-P51.5",
    projectionBoundary: {
      sessionMode: "isolated-read-only",
      fixture: "synthetic-public-fixture",
      sharesVisualStudioManagedLspStream: false,
      requests: contract.authoringProjection.requests,
      resultProjection:
        "aggregate-status-counts-and-privacy-flags-only"
    },
    remediationProjection: {
      remediationBatchCount:
        reviewSurface.authoringProjection.remediationBatchCount,
      p0RemediationBatchCount:
        reviewSurface.authoringProjection.p0RemediationBatchCount,
      publicExportedNodeCount:
        reviewSurface.authoringProjection.publicExportedNodeCount,
      missingDocBlockCount:
        reviewSurface.authoringProjection.missingDocBlockCount,
      missingBilingualMarkerCount:
        reviewSurface.authoringProjection.missingBilingualMarkerCount,
      generatedBindingAuthoringStepCount:
        reviewSurface.authoringProjection
          .generatedBindingAuthoringStepCount,
      generatedBindingDiagnosticGuidanceCount:
        reviewSurface.authoringProjection
          .generatedBindingDiagnosticGuidanceCount,
      generatedBindingConcreteSyntaxFrozen:
        reviewSurface.authoringProjection
          .generatedBindingConcreteSyntaxFrozen
    },
    builds: {
      debug,
      release
    },
    privacy: {
      includesSourceContent: false,
      includesFixtureBody: false,
      includesProposalBody: false,
      includesLocalPath: false,
      includesRawException: false,
      allowsAutomaticWrites: false,
      hostEditorApiCalled: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      providerNetworkExecuted: false,
      sourcesContentPolicy: "none"
    },
    deferred: {
      vsixInstalled: false,
      actualVisualStudioRuntimeCaptureExecuted: false,
      experimentalInstanceExecuted: false,
      hostEditorApiCalled: false,
      checkedApplyWriteEnabled: false
    },
    summary
  };
  assertPublicSafe(evidence);

  const report = `# W-P51.5 Visual Studio Authoring / Remediation Projection 证据

## 结论

- 状态：\`ready-for-wp51-install-runtime-capture\`
- 隔离只读 LSP 会话：Debug / Release 各 1 次，共 ${summary.liveProjectionRequestCount} 个 custom request
- capabilities：${summary.capabilityCount}（available ${summary.availableCapabilityCount} / partial ${summary.partialCapabilityCount} / planned ${summary.plannedCapabilityCount} / unsupported ${summary.unsupportedCapabilityCount}）
- authoring locations：${summary.authoringLocationCount} 个，${summary.authoringLocationKindCount} 种
- proposal / draft：${summary.proposalCount} / ${summary.draftCount}
- remediation batches：${summary.remediationBatchCount}，其中 P0 ${summary.p0RemediationBatchCount}
- generated-binding guidance：${summary.generatedBindingAuthoringStepCount} 个步骤、${summary.generatedBindingDiagnosticGuidanceCount} 条诊断提示；具体语法尚未冻结
- Debug / Release 解包运行时均自包含；符号链接与 \`.pnpm\` 虚拟存储条目均为 0

## 已验证

- Tool Window 的 Live Authoring 页签经独立短生命周期会话调用 \`hia/ideCapabilities\`、\`hia/documentAuthoringLocations\` 与 \`hia/documentationEditProposals\`。
- 两种构建配置都直接从构建输出中的 \`runtime/lsp/dist/node.js\` 完成真实 custom-request 往返，不依赖 monorepo 链接。
- 合成 fixture 只用于验证语言 marker、authoring location 和 proposal 状态；evidence 不保存 fixture、proposal 或源码正文。
- W-P50 remediation ledger 与 generated-binding guidance 的计数已映射进 Visual Studio 只读界面。
- \`sourcesContentPolicy\` 保持 \`none\`，自动写入、host editor API、workspace write、checked apply、provider network 与目标仓库修改均为 0。

## 后续门

- W-P51.6 再执行 VSIX 安装、Visual Studio 2022/2026 实际启动、界面 capture 与兼容结果记录。
- 当前没有因为 custom-request 投影而开放任何写入权限。
`;

  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8");
  await writeFile(reportPath, report, "utf8");
  console.log(
    `W-P51.5 Visual Studio authoring projection evidence passed at ${path.relative(rootDir, outputRoot).replaceAll("\\", "/")}.`
  );
}

/**
 * <lang>
 * <zh-CN>检查一个构建配置中的自包含 runtime、VSIX 条目并执行三个只读请求。</zh-CN>
 * <en>Checks one build configuration's self-contained runtime and VSIX entries, then executes three read-only requests.</en>
 * </lang>
 *
 * @param {"Debug" | "Release"} configuration Build configuration.
 * @param {string} fixtureText Synthetic fixture text kept out of evidence.
 * @returns {Promise<object>} Public-safe build and projection summary.
 */
async function inspectBuild(configuration, fixtureText) {
  const buildRoot = path.join(
    appRoot,
    "bin",
    configuration,
    "net8.0-windows8.0");
  const runtimeRoot = path.join(buildRoot, "runtime", "lsp");
  const runtimeEntry = path.join(runtimeRoot, "dist", "node.js");
  const runtimeManifest = await readJson(path.join(
    runtimeRoot,
    "runtime-manifest.json"));
  const runtimeMeasurement = await measureTree(runtimeRoot);
  const vsixPath = path.join(
    buildRoot,
    "HiaDocumentation.VisualStudio.vsix");
  const vsixEntries = await listZipEntries(vsixPath);
  const runtimeEntries = vsixEntries.filter((entry) =>
    entry.startsWith("runtime/lsp/"));
  const requiredEntries = [
    "runtime/lsp/dist/node.js",
    "runtime/lsp/runtime-manifest.json",
    "runtime/lsp/node_modules/@hia-doc/core/package.json",
    "runtime/lsp/node_modules/@jridgewell/trace-mapping/package.json",
    "runtime/lsp/node_modules/vscode-languageserver/package.json"
  ];

  assert.equal(
    runtimeManifest.deploymentMode,
    "pnpm-legacy-hoisted-production-deploy");
  assert.equal(runtimeManifest.selfContainedAfterExtraction, true);
  assert.equal(runtimeManifest.symbolicLinkCount, 0);
  assert.equal(runtimeManifest.containsAbsolutePaths, false);
  assert.equal(runtimeManifest.sourcesContentPolicy, "none");
  assert.equal(runtimeMeasurement.symbolicLinkCount, 0);
  assert.equal(
    runtimeMeasurement.fileCount,
    runtimeManifest.fileCount);
  assert.ok((await stat(runtimeEntry)).size > 0);
  assert.ok((await stat(vsixPath)).size > 0);
  assert.equal(
    requiredEntries.every((entry) => vsixEntries.includes(entry)),
    true);
  const pnpmVirtualStoreEntryCount = runtimeEntries.filter((entry) =>
    entry.includes("/.pnpm/")).length;
  assert.equal(pnpmVirtualStoreEntryCount, 0);

  return {
    configuration,
    selfContained: runtimeManifest.selfContainedAfterExtraction,
    runtimeFileCount: runtimeMeasurement.fileCount,
    runtimeByteCount: runtimeMeasurement.byteCount,
    runtimeSymbolicLinkCount: runtimeMeasurement.symbolicLinkCount,
    vsixEntryCount: vsixEntries.length,
    vsixRuntimeEntryCount: runtimeEntries.length,
    requiredRuntimeEntriesPresent: true,
    pnpmVirtualStoreEntryCount,
    projection: await runProjection(runtimeEntry, fixtureText)
  };
}

/**
 * <lang>
 * <zh-CN>对构建输出中的 LSP runtime 执行与 Visual Studio Probe 相同的只读 custom request。</zh-CN>
 * <en>Executes the same read-only custom requests as the Visual Studio probe against a build-output LSP runtime.</en>
 * </lang>
 *
 * @param {string} entryPath Runtime entry.
 * @param {string} fixtureText Synthetic fixture text.
 * @returns {Promise<object>} Aggregate public-safe projection result.
 */
async function runProjection(entryPath, fixtureText) {
  const child = spawn(process.execPath, [entryPath, "--stdio"], {
    cwd: path.dirname(entryPath),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
  child.stderr.resume();
  const messages = readLspMessages(child.stdout)[Symbol.asyncIterator]();

  try {
    const initialize = await request(child, messages, 1, "initialize", {
      processId: null,
      rootUri: null,
      capabilities: {},
      workspaceFolders: null
    });
    assert.equal(typeof initialize.result?.capabilities, "object");
    notify(child, "initialized", {});
    notify(child, "textDocument/didOpen", {
      textDocument: {
        uri: "untitled:hia-wp51-authoring-probe.hia.json",
        languageId: "hia",
        version: 1,
        text: fixtureText
      }
    });
    const capabilitiesResponse = await request(
      child,
      messages,
      2,
      "hia/ideCapabilities",
      { uri: "untitled:hia-wp51-authoring-probe.hia.json" });
    const locationsResponse = await request(
      child,
      messages,
      3,
      "hia/documentAuthoringLocations",
      { uri: "untitled:hia-wp51-authoring-probe.hia.json" });
    const proposalsResponse = await request(
      child,
      messages,
      4,
      "hia/documentationEditProposals",
      { uri: "untitled:hia-wp51-authoring-probe.hia.json" });
    const capabilities = capabilitiesResponse.result?.capabilities;
    const locations = locationsResponse.result?.locations;
    const proposalResult = proposalsResponse.result;
    assert.ok(Array.isArray(capabilities));
    assert.ok(Array.isArray(locations));
    assert.equal(typeof proposalResult, "object");

    await request(child, messages, 5, "shutdown", {});
    notify(child, "exit", {});
    child.stdin.end();

    return {
      state: "ready",
      reasonCode: "projection-requests-completed",
      sessionMode: "isolated-read-only",
      requestCount: 3,
      capabilityCount: capabilities.length,
      availableCapabilityCount: countStatus(capabilities, "available"),
      partialCapabilityCount: countStatus(capabilities, "partial"),
      plannedCapabilityCount: countStatus(capabilities, "planned"),
      unsupportedCapabilityCount: countStatus(
        capabilities,
        "unsupported"),
      languageMarkerCapabilityStatus:
        capabilities.find((item) =>
          item.id === "hia.completion.languageMarker")?.status
          ?? "unavailable",
      authoringLocationCount: locations.length,
      authoringLocationKindCount: new Set(
        locations
          .map((item) => item.kind)
          .filter((item) => typeof item === "string")).size,
      proposalCount: proposalResult.proposalCount,
      draftCount: proposalResult.draftCount,
      proposalStatus: proposalResult.status,
      allowsAutomaticWrites:
        proposalResult.privacy?.allowsAutomaticWrites,
      includesSourceContent:
        proposalResult.privacy?.includesSourceContent,
      sourcesContentPolicy:
        proposalResult.privacy?.sourcesContentPolicy
    };
  } finally {
    child.stdin.end();
    if (!child.killed) {
      child.kill();
    }
  }
}

/**
 * <lang>
 * <zh-CN>断言 live projection 的稳定计数与隐私状态。</zh-CN>
 * <en>Asserts stable counts and privacy states for the live projection.</en>
 * </lang>
 *
 * @param {object} projection Projection summary.
 * @returns {void}
 */
function assertProjection(projection) {
  assert.equal(projection.state, "ready");
  assert.equal(projection.reasonCode, "projection-requests-completed");
  assert.equal(projection.sessionMode, "isolated-read-only");
  assert.equal(projection.requestCount, 3);
  assert.equal(projection.capabilityCount, 25);
  assert.equal(projection.availableCapabilityCount, 14);
  assert.equal(projection.partialCapabilityCount, 2);
  assert.equal(projection.plannedCapabilityCount, 3);
  assert.equal(projection.unsupportedCapabilityCount, 6);
  assert.equal(projection.languageMarkerCapabilityStatus, "available");
  assert.equal(projection.authoringLocationCount, 3);
  assert.equal(projection.authoringLocationKindCount, 3);
  assert.equal(projection.proposalCount, 1);
  assert.equal(projection.draftCount, 1);
  assert.equal(projection.proposalStatus, "available");
  assert.equal(projection.allowsAutomaticWrites, false);
  assert.equal(projection.includesSourceContent, false);
  assert.equal(projection.sourcesContentPolicy, "none");
}

function countStatus(capabilities, status) {
  return capabilities.filter((item) => item.status === status).length;
}

function notify(child, method, parameters) {
  writeLspMessage(child, {
    jsonrpc: "2.0",
    method,
    params: parameters
  });
}

async function request(child, messages, id, method, parameters) {
  writeLspMessage(child, {
    jsonrpc: "2.0",
    id,
    method,
    params: parameters
  });

  while (true) {
    const message = await nextWithTimeout(messages, 10_000);
    if (message?.id !== id) {
      continue;
    }

    assert.equal(message.error, undefined, `${method} returned an LSP error.`);
    return message;
  }
}

function writeLspMessage(child, message) {
  const body = JSON.stringify(message);
  child.stdin.write(
    `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

async function nextWithTimeout(iterator, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      iterator.next().then((result) => {
        if (result.done) {
          throw new Error("LSP output ended before the expected response.");
        }

        return result.value;
      }),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Timed out waiting for an LSP response.")),
          timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function* readLspMessages(stream) {
  let buffer = Buffer.alloc(0);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) {
        break;
      }

      const header = buffer.subarray(0, headerEnd).toString("ascii");
      const match = /Content-Length:\s*(\d+)/iu.exec(header);
      assert.ok(match, "LSP response must include Content-Length.");
      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + contentLength) {
        break;
      }

      const body = buffer.subarray(
        bodyStart,
        bodyStart + contentLength);
      buffer = buffer.subarray(bodyStart + contentLength);
      yield JSON.parse(body.toString("utf8"));
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function measureTree(directory) {
  let fileCount = 0;
  let byteCount = 0;
  let symbolicLinkCount = 0;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      symbolicLinkCount += 1;
    } else if (entry.isDirectory()) {
      const nested = await measureTree(entryPath);
      fileCount += nested.fileCount;
      byteCount += nested.byteCount;
      symbolicLinkCount += nested.symbolicLinkCount;
    } else if (entry.isFile()) {
      fileCount += 1;
      byteCount += (await stat(entryPath)).size;
    }
  }

  return { fileCount, byteCount, symbolicLinkCount };
}

async function listZipEntries(archivePath) {
  const archive = await readFile(archivePath);
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumEndOffset = Math.max(0, archive.length - 65_557);
  let endOffset = -1;

  for (
    let offset = archive.length - 22;
    offset >= minimumEndOffset;
    offset -= 1
  ) {
    if (archive.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }

  assert.notEqual(
    endOffset,
    -1,
    "VSIX must contain a ZIP end-of-central-directory record.");
  const entryCount = archive.readUInt16LE(endOffset + 10);
  let offset = archive.readUInt32LE(endOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(
      archive.readUInt32LE(offset),
      centralSignature,
      "VSIX central directory entry signature must be valid.");
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const fileNameStart = offset + 46;
    entries.push(archive
      .subarray(fileNameStart, fileNameStart + fileNameLength)
      .toString("utf8")
      .replaceAll("\\", "/"));
    offset =
      fileNameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function assertPublicSafe(evidence) {
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(
    serialized,
    /(?:^|[^A-Za-z])[A-Za-z]:[\\/]/u,
    "Evidence must not contain local absolute paths.");
  assert.equal(serialized.includes(fixtureTextMarker()), false);
  assert.equal(
    evidence.privacy.includesSourceContent,
    false);
  assert.equal(evidence.privacy.includesFixtureBody, false);
  assert.equal(evidence.privacy.includesProposalBody, false);
}

function fixtureTextMarker() {
  return "投影视觉工作室编写状态。";
}

await main();
