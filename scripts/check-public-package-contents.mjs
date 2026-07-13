import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePaths = [
  "apps/cli",
  "packages/browser-panel",
  "packages/config",
  "packages/core",
  "packages/lsp",
  "packages/parser-jsdoc",
  "packages/plugin-sdk",
  "packages/profile",
  "packages/profiles",
  "packages/renderer-html",
  "packages/schemas",
  "packages/source-linkage",
  "packages/theme-default"
];
const npmCli = process.env.npm_execpath;
const npmCliIsExecutable = Boolean(npmCli && /\.(?:cmd|bat|exe)$/i.test(npmCli));
const command = npmCli
  ? npmCliIsExecutable ? npmCli : process.execPath
  : process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const args = npmCli
  ? npmCliIsExecutable ? ["pack", "--dry-run", "--json"] : [npmCli, "pack", "--dry-run", "--json"]
  : process.platform === "win32"
    ? ["/d", "/s", "/c", "npm pack --dry-run --json"]
    : ["pack", "--dry-run", "--json"];

/**
 * 校验准备发布的 `@hia-doc/*` tarball 内容，防止内部构建缓存或缺失的法律文件进入消费者安装包。
 * Validates publish-candidate `@hia-doc/*` tarball contents so internal build caches and missing legal files cannot reach consumer installs.
 */
for (const packagePath of packagePaths) {
  const packageDir = path.join(rootDir, packagePath);
  const packageJson = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
  const result = spawnSync(command, args, { cwd: packageDir, encoding: "utf8" });

  assert.equal(
    result.status,
    0,
    `${packageJson.name}: pack dry-run failed: ${result.error?.message || result.stderr || result.stdout}`
  );

  const parsedPack = JSON.parse(result.stdout);
  const pack = Array.isArray(parsedPack) ? parsedPack[0] : parsedPack;
  const packedPaths = new Set((pack.files ?? []).map((file) => String(file.path).replaceAll("\\", "/")));

  for (const requiredPath of ["LICENSE", "README.md", "package.json", "dist/index.js", "dist/index.d.ts"]) {
    assert.ok(packedPaths.has(requiredPath), `${packageJson.name}: missing ${requiredPath} from pack output.`);
  }

  for (const packedPath of packedPaths) {
    assert.ok(!packedPath.includes("/node_modules/") && !packedPath.startsWith("node_modules/"), `${packageJson.name}: pack output includes node_modules path ${packedPath}.`);
    assert.ok(!packedPath.endsWith(".tgz"), `${packageJson.name}: pack output includes nested tarball ${packedPath}.`);
    assert.ok(!packedPath.endsWith(".tsbuildinfo"), `${packageJson.name}: pack output includes TypeScript build metadata ${packedPath}.`);
  }
}

console.log(`Public package content check passed: ${packagePaths.length} @hia-doc packages have consumer-safe dry-run tarballs.`);
