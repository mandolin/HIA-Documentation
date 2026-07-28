import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const runtimeRoot = path.join(appRoot, ".runtime", "lsp");
const packagePath = path.join(runtimeRoot, "package.json");
const entryPath = path.join(runtimeRoot, "dist", "node.js");
const manifestPath = path.join(runtimeRoot, "runtime-manifest.json");

/**
 * <lang>
 * <zh-CN>生成 VSIX 可携带的 @hia-doc/lsp production deployment，并写入不含本地路径的清单。</zh-CN>
 * <en>Creates the VSIX-ready @hia-doc/lsp production deployment and writes a manifest without local paths.</en>
 * </lang>
 *
 * @returns {Promise<void>} Completion after the runtime tree and manifest are verified.
 */
async function main() {
  await rm(runtimeRoot, { recursive: true, force: true });

  const pnpm = await resolvePnpmInvocation();
  const result = spawnSync(
    pnpm.command,
    [
      ...pnpm.arguments,
      "--filter",
      "@hia-doc/lsp",
      "deploy",
      "--prod",
      "--legacy",
      "--config.node-linker=hoisted",
      runtimeRoot
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`@hia-doc/lsp deployment failed with exit code ${result.status}.`);
  }

  await rm(path.join(runtimeRoot, "node_modules", ".pnpm"), {
    recursive: true,
    force: true
  });

  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(packageJson.name, "@hia-doc/lsp");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.engines?.node, ">=20.19.0");
  await stat(entryPath);

  const deployment = await measureTree(runtimeRoot);
  assert.equal(
    deployment.symbolicLinkCount,
    0,
    "Visual Studio LSP runtime must not depend on links that disappear during VSIX extraction."
  );
  const manifest = {
    contract: "hia-visual-studio-lsp-runtime",
    contractVersion: "0.1.0-draft",
    package: packageJson.name,
    packageVersion: packageJson.version,
    nodeEngine: packageJson.engines.node,
    transport: "stdio",
    deploymentMode: "pnpm-legacy-hoisted-production-deploy",
    selfContainedAfterExtraction: true,
    symbolicLinkCount: deployment.symbolicLinkCount,
    entry: "dist/node.js",
    fileCount: deployment.fileCount + 1,
    byteCount: deployment.byteCount,
    sourcesContentPolicy: "none",
    containsAbsolutePaths: false
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `Prepared public-safe Visual Studio LSP runtime: ${manifest.fileCount} files, ${manifest.byteCount} bytes.`
  );
}

/**
 * <lang>
 * <zh-CN>优先通过随 Node 安装的 Corepack JS 入口运行固定 pnpm，避免 Windows native shim 偶发异常退出。</zh-CN>
 * <en>Prefers the Corepack JavaScript entry bundled with Node to avoid intermittent Windows native-shim crashes while retaining the pinned pnpm version.</en>
 * </lang>
 *
 * @returns {Promise<{command: string, arguments: string[]}>} Shell-free pnpm invocation.
 */
async function resolvePnpmInvocation() {
  const corepackPnpm = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "corepack",
    "dist",
    "pnpm.js");

  try {
    await stat(corepackPnpm);
    return {
      command: process.execPath,
      arguments: [corepackPnpm]
    };
  } catch {
    const pnpmCli = process.env.npm_execpath;
    assert.ok(
      pnpmCli,
      "Run this staging script through pnpm or a Node installation with Corepack."
    );
    const pnpmIsJavaScript = /\.(?:c?js|mjs)$/iu.test(pnpmCli);
    return {
      command: pnpmIsJavaScript ? process.execPath : pnpmCli,
      arguments: pnpmIsJavaScript ? [pnpmCli] : []
    };
  }
}

/**
 * <lang>
 * <zh-CN>递归统计部署树，不在输出或清单中记录文件绝对路径。</zh-CN>
 * <en>Measures the deployment tree recursively without recording absolute file paths in output or manifest data.</en>
 * </lang>
 *
 * @param {string} directory Directory to measure.
 * @returns {Promise<{fileCount: number, byteCount: number, symbolicLinkCount: number}>} Aggregate file count, bytes, and link count.
 */
async function measureTree(directory) {
  let fileCount = 0;
  let byteCount = 0;
  let symbolicLinkCount = 0;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      symbolicLinkCount += 1;
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await measureTree(entryPath);
      fileCount += nested.fileCount;
      byteCount += nested.byteCount;
      symbolicLinkCount += nested.symbolicLinkCount;
      continue;
    }

    if (entry.isFile()) {
      fileCount += 1;
      byteCount += (await stat(entryPath)).size;
    }
  }

  return { fileCount, byteCount, symbolicLinkCount };
}

await main();
