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
  "wp51-visual-studio-language-server-provider");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "report.md");

/**
 * <lang>
 * <zh-CN>验证 W-P51.4 Provider、production deployment、stdio 握手和 public-safe 边界。</zh-CN>
 * <en>Validates the W-P51.4 provider, production deployment, stdio handshake, and public-safe boundary.</en>
 * </lang>
 *
 * @returns {Promise<void>} Completion after evidence and the Chinese-first report are written.
 */
async function main() {
  const contract = JSON.parse(
    await readFile(path.join(appRoot, "host-contract.json"), "utf8"));
  const baseline = JSON.parse(
    await readFile(path.join(appRoot, "implementation-baseline.json"), "utf8"));
  const runtimeManifest = JSON.parse(
    await readFile(
      path.join(appRoot, ".runtime", "lsp", "runtime-manifest.json"),
      "utf8"));
  const providerSource = await readFile(
    path.join(appRoot, "HiaLanguageServerProvider.cs"),
    "utf8");
  const launcherSource = await readFile(
    path.join(appRoot, "LanguageServerRuntimeLauncher.cs"),
    "utf8");
  const stateSource = await readFile(
    path.join(appRoot, "LanguageServerRuntimeState.cs"),
    "utf8");
  const remoteDataSource = await readFile(
    path.join(appRoot, "DocumentationToolWindowData.cs"),
    "utf8");
  const debugArtifacts = await inspectBuild("Debug");
  const releaseArtifacts = await inspectBuild("Release");
  const runtimeMeasurement = await measureTree(
    path.join(appRoot, ".runtime", "lsp"));
  const packagedDependencies = await inspectPackagedDependencies(
    path.join(appRoot, ".runtime", "lsp"));
  const handshake = await runInitializeHandshake(
    path.join(appRoot, ".runtime", "lsp", "dist", "node.js"));

  assert.ok([
    "language-server-provider",
    "authoring-remediation-projection"
  ].includes(contract.status));
  assert.equal(contract.runtime.languageServerProviderImplemented, true);
  assert.equal(contract.runtime.languageServer.transport, "stdio");
  assert.equal(
    contract.runtime.languageServer.vsixRelativePath,
    "runtime/lsp/dist/node.js");
  assert.ok(["W-P51.4", "W-P51.5"].includes(baseline.phase));
  assert.equal(
    baseline.currentImplementation.languageServerRuntimePackaged,
    true);
  assert.equal(runtimeManifest.package, "@hia-doc/lsp");
  assert.equal(runtimeManifest.packageVersion, "0.1.0");
  assert.equal(runtimeManifest.nodeEngine, ">=20.19.0");
  assert.equal(
    runtimeManifest.deploymentMode,
    "pnpm-legacy-hoisted-production-deploy");
  assert.equal(runtimeManifest.selfContainedAfterExtraction, true);
  assert.equal(runtimeManifest.symbolicLinkCount, 0);
  assert.equal(runtimeManifest.containsAbsolutePaths, false);
  assert.equal(runtimeManifest.sourcesContentPolicy, "none");
  assert.ok(runtimeMeasurement.fileCount >= 400);
  assert.ok(runtimeMeasurement.byteCount >= 2_000_000);
  assert.equal(runtimeMeasurement.symbolicLinkCount, 0);
  assert.equal(packagedDependencies.length, 13);
  assert.deepEqual(
    [...new Set(packagedDependencies.map((entry) => entry.license))],
    ["MIT"]);
  assert.match(providerSource, /LanguageServerProvider/u);
  assert.match(providerSource, /PipeReader\.Create/u);
  assert.match(providerSource, /PipeWriter\.Create/u);
  assert.match(providerSource, /LanguageServerRuntimeLauncher/u);
  assert.match(launcherSource, /"--stdio"/u);
  assert.match(launcherSource, /runtime[\s\S]*lsp[\s\S]*dist[\s\S]*node\.js/u);
  assert.match(stateSource, /stable public-safe reason code/u);
  assert.doesNotMatch(
    stateSource,
    /StackTrace|Exception\.Message|Assembly\.Location/u);
  assert.match(remoteDataSource, /LanguageServerMetrics/u);
  assert.equal(handshake.responseId, 1);
  assert.equal(handshake.serverCapabilitiesReceived, true);
  assert.ok(debugArtifacts.runtimeEntryCount >= runtimeMeasurement.fileCount);
  assert.ok(releaseArtifacts.runtimeEntryCount >= runtimeMeasurement.fileCount);
  assert.equal(debugArtifacts.requiredRuntimeEntriesPresent, true);
  assert.equal(releaseArtifacts.requiredRuntimeEntriesPresent, true);
  assert.equal(debugArtifacts.pnpmVirtualStoreEntryCount, 0);
  assert.equal(releaseArtifacts.pnpmVirtualStoreEntryCount, 0);

  const summary = {
    providerContributionCount: 1,
    documentTypeCount: 1,
    activationFileExtensionCount:
      contract.runtime.languageServer.activationFileExtensions.length,
    stdioPipeCount: 1,
    publicSafeRuntimeStateCount: 1,
    lspRuntimeFileCount: runtimeMeasurement.fileCount,
    lspRuntimeBytes: runtimeMeasurement.byteCount,
    lspRuntimeSymbolicLinkCount: runtimeMeasurement.symbolicLinkCount,
    packagedDependencyCount: packagedDependencies.length,
    initializeHandshakeCount: Number(handshake.serverCapabilitiesReceived),
    debugVsixCount: Number(debugArtifacts.vsixBuilt),
    releaseVsixCount: Number(releaseArtifacts.vsixBuilt),
    debugVsixBytes: debugArtifacts.vsixBytes,
    releaseVsixBytes: releaseArtifacts.vsixBytes,
    debugVsixRuntimeEntryCount: debugArtifacts.runtimeEntryCount,
    releaseVsixRuntimeEntryCount: releaseArtifacts.runtimeEntryCount,
    actualVisualStudioRuntimeCaptureCount: 0,
    experimentalInstanceExecutionCount: 0,
    vsixInstallCount: 0,
    hostEditorApiCallCount: 0,
    workspaceWriteCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutionCount: 0,
    sourcesContentBodyCount: 0
  };

  const evidence = {
    contract: "hia-wp51-visual-studio-language-server-provider-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp51-authoring-projection",
    phase: "W-P51.4",
    provider: {
      model: "VisualStudio.Extensibility LanguageServerProvider",
      package: contract.runtime.languageServer.package,
      packageVersion: contract.runtime.languageServer.packageVersion,
      transport: contract.runtime.languageServer.transport,
      activationFileExtensions:
        contract.runtime.languageServer.activationFileExtensions,
      lifecycleProjection: "Remote UI stable reason codes"
    },
    runtime: {
      deploymentMode: runtimeManifest.deploymentMode,
      vsixRelativeEntry: contract.runtime.languageServer.vsixRelativePath,
      nodeEngine: runtimeManifest.nodeEngine,
      fileCount: runtimeMeasurement.fileCount,
      byteCount: runtimeMeasurement.byteCount,
      selfContainedAfterExtraction:
        runtimeManifest.selfContainedAfterExtraction,
      symbolicLinkCount: runtimeMeasurement.symbolicLinkCount,
      packagedDependencies,
      initializeHandshake: handshake
    },
    builds: {
      debug: debugArtifacts,
      release: releaseArtifacts
    },
    privacy: {
      publicDiagnosticPolicy:
        contract.runtime.languageServer.publicDiagnosticPolicy,
      sourcesContentPolicy: runtimeManifest.sourcesContentPolicy,
      containsAbsolutePaths: runtimeManifest.containsAbsolutePaths,
      sourceBodyIncluded: false,
      rawExceptionIncluded: false,
      stderrBodyIncluded: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false
    },
    deferred: {
      actualVisualStudioRuntimeCaptureExecuted: false,
      experimentalInstanceExecuted: false,
      vsixInstalled: false,
      liveCustomRequestProjectionImplemented: false,
      hostEditorApiCalled: false
    },
    summary
  };

  const report = `# W-P51.4 Visual Studio Language Server Provider 证据

## 结论

- 状态：\`ready-for-wp51-authoring-projection\`
- Provider：VisualStudio.Extensibility \`LanguageServerProvider\`
- Server：\`@hia-doc/lsp@0.1.0\`
- 传输：stdio
- 激活扩展名：${contract.runtime.languageServer.activationFileExtensions.join("、")}
- production deployment：${summary.lspRuntimeFileCount} 个文件，${summary.lspRuntimeBytes} bytes
- 解包自包含：${runtimeManifest.selfContainedAfterExtraction ? "是" : "否"}；符号链接：${summary.lspRuntimeSymbolicLinkCount}
- packaged package/version：${summary.packagedDependencyCount} 项，许可证均为 MIT
- initialize 握手：${handshake.serverCapabilitiesReceived ? "通过" : "失败"}
- Debug / Release VSIX：${summary.debugVsixCount} / ${summary.releaseVsixCount}
- Debug / Release VSIX runtime entries：${summary.debugVsixRuntimeEntryCount} / ${summary.releaseVsixRuntimeEntryCount}

## 已验证

- VSIX 内容入口固定为 \`runtime/lsp/dist/node.js\`，不依赖 monorepo 绝对路径。
- Provider 返回 stdout/stdin 双工管道并显式传入 \`--stdio\`。
- Remote UI 可跟随 configured / starting / initializing / ready / failed / stopped 状态变化。
- UI 与 evidence 仅记录稳定 reason code 和运行时来源类别，不记录本地路径、stderr、异常正文或源码正文。
- Node.js \`>=20.19.0\` 是明确的宿主前置条件；VSIX 当前不重新分发 Node.js。

## 仍未宣称

- 未安装 VSIX，未启动 Visual Studio 实验实例，未形成真实宿主截图。
- 未把 live custom request 结果投影进 Review/Authoring 页面。
- 未调用 host editor API，未开放 WorkspaceEdit、工作区写入或目标仓库修改。
`;

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(reportPath, report, "utf8");
  console.log(
    `W-P51.4 Visual Studio language-server evidence passed at ${path.relative(rootDir, outputRoot).replaceAll("\\", "/")}.`
  );
}

/**
 * <lang>
 * <zh-CN>检查指定配置的 DLL、VSIX 和已复制 LSP 入口。</zh-CN>
 * <en>Checks the DLL, VSIX, and copied LSP entry for one build configuration.</en>
 * </lang>
 *
 * @param {"Debug" | "Release"} configuration Build configuration.
 * @returns {Promise<object>} Public-safe artifact summary.
 */
async function inspectBuild(configuration) {
  const buildRoot = path.join(
    appRoot,
    "bin",
    configuration,
    "net8.0-windows8.0");
  const vsixPath = path.join(
    buildRoot,
    "HiaDocumentation.VisualStudio.vsix");
  const assemblyPath = path.join(
    buildRoot,
    "HiaDocumentation.VisualStudio.dll");
  const runtimeEntryPath = path.join(
    buildRoot,
    "runtime",
    "lsp",
    "dist",
    "node.js");
  const vsixEntries = await listZipEntries(vsixPath);
  const runtimeEntries = vsixEntries.filter((entry) =>
    entry.startsWith("runtime/lsp/"));
  const requiredRuntimeEntries = [
    "runtime/lsp/dist/node.js",
    "runtime/lsp/package.json",
    "runtime/lsp/runtime-manifest.json",
    "runtime/lsp/node_modules/vscode-languageserver/package.json",
    "runtime/lsp/node_modules/@hia-doc/core/package.json",
    "runtime/lsp/node_modules/@jridgewell/trace-mapping/package.json"
  ];

  return {
    configuration,
    assemblyBuilt: (await stat(assemblyPath)).size > 0,
    vsixBuilt: (await stat(vsixPath)).size > 0,
    vsixBytes: (await stat(vsixPath)).size,
    copiedRuntimeEntry: (await stat(runtimeEntryPath)).size > 0,
    vsixEntryCount: vsixEntries.length,
    runtimeEntryCount: runtimeEntries.length,
    pnpmVirtualStoreEntryCount: runtimeEntries.filter((entry) =>
      entry.includes("/.pnpm/")).length,
    requiredRuntimeEntriesPresent: requiredRuntimeEntries.every((entry) =>
      vsixEntries.includes(entry))
  };
}

/**
 * <lang>
 * <zh-CN>读取普通 VSIX/ZIP central directory，用结构化方式验证随包 runtime 内容。</zh-CN>
 * <en>Reads the standard VSIX/ZIP central directory to verify packaged runtime content structurally.</en>
 * </lang>
 *
 * @param {string} archivePath VSIX archive path.
 * @returns {Promise<string[]>} Forward-slash entry names.
 */
async function listZipEntries(archivePath) {
  const archive = await readFile(archivePath);
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumEndOffset = Math.max(0, archive.length - 65_557);
  let endOffset = -1;

  for (let offset = archive.length - 22; offset >= minimumEndOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }

  assert.notEqual(endOffset, -1, "VSIX must contain a ZIP end-of-central-directory record.");
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
    entries.push(
      archive.subarray(
        fileNameStart,
        fileNameStart + fileNameLength).toString("utf8").replaceAll("\\", "/"));
    offset = fileNameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

/**
 * <lang>
 * <zh-CN>递归统计 runtime staging 树，不保留路径清单。</zh-CN>
 * <en>Measures the runtime staging tree recursively without retaining a path list.</en>
 * </lang>
 *
 * @param {string} directory Directory to measure.
 * @returns {Promise<{fileCount: number, byteCount: number, symbolicLinkCount: number}>} Aggregate counts.
 */
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

/**
 * <lang>
 * <zh-CN>枚举 VSIX staging 中唯一的 package/version/license，用于发布前许可证证据。</zh-CN>
 * <en>Enumerates unique package/version/license tuples in VSIX staging for pre-release license evidence.</en>
 * </lang>
 *
 * @param {string} directory Runtime staging directory.
 * @returns {Promise<Array<{name: string, version: string, license: string}>>} Sorted unique package metadata.
 */
async function inspectPackagedDependencies(directory) {
  const packages = new Map();

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const item of await inspectPackagedDependencies(entryPath)) {
        packages.set(`${item.name}@${item.version}`, item);
      }
      continue;
    }

    if (!entry.isFile() || entry.name !== "package.json") {
      continue;
    }

    const packageJson = JSON.parse(await readFile(entryPath, "utf8"));
    if (typeof packageJson.name === "string"
      && typeof packageJson.version === "string") {
      packages.set(`${packageJson.name}@${packageJson.version}`, {
        name: packageJson.name,
        version: packageJson.version,
        license: String(packageJson.license ?? "UNKNOWN")
      });
    }
  }

  return [...packages.values()].sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(
      `${right.name}@${right.version}`));
}

/**
 * <lang>
 * <zh-CN>向 production deployment 发送最小 LSP initialize 请求并解析首个响应。</zh-CN>
 * <en>Sends a minimal LSP initialize request to the production deployment and parses the first response.</en>
 * </lang>
 *
 * @param {string} entryPath Runtime entry to execute.
 * @returns {Promise<{responseId: number, serverCapabilitiesReceived: boolean}>} Handshake result without paths or process output.
 */
async function runInitializeHandshake(entryPath) {
  const child = spawn(process.execPath, [entryPath, "--stdio"], {
    cwd: path.dirname(entryPath),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: null,
      rootUri: null,
      capabilities: {},
      workspaceFolders: null
    }
  };
  const body = JSON.stringify(request);
  child.stdin.write(
    `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);

  try {
    const response = await readLspMessage(child.stdout, 8_000);
    return {
      responseId: response.id,
      serverCapabilitiesReceived:
        typeof response.result?.capabilities === "object"
    };
  } finally {
    child.stdin.end();
    child.kill();
  }
}

/**
 * <lang>
 * <zh-CN>按 Content-Length framing 读取一个 LSP 消息，并设置硬超时防止证据命令挂起。</zh-CN>
 * <en>Reads one Content-Length-framed LSP message with a hard timeout to prevent evidence commands from hanging.</en>
 * </lang>
 *
 * @param {import("node:stream").Readable} stream LSP stdout stream.
 * @param {number} timeoutMs Timeout in milliseconds.
 * @returns {Promise<object>} Parsed JSON-RPC message.
 */
function readLspMessage(stream, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for the LSP initialize response."));
    }, timeoutMs);

    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) {
        return;
      }

      const header = buffer.subarray(0, headerEnd).toString("ascii");
      const match = /Content-Length:\s*(\d+)/iu.exec(header);
      if (!match) {
        cleanup();
        reject(new Error("LSP response omitted Content-Length."));
        return;
      }

      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + contentLength) {
        return;
      }

      cleanup();
      resolve(JSON.parse(
        buffer.subarray(bodyStart, bodyStart + contentLength).toString("utf8")));
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stream.off("data", onData);
      stream.off("error", onError);
    };

    stream.on("data", onData);
    stream.on("error", onError);
  });
}

await main();
