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
  "packages/jsondoc",
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

  if (packagePath === "apps/cli") {
    // <lang><zh-CN>随包指南及固定主题锚点必须离线可达，README 的仓库外链不能替代该检查。</zh-CN><en>The bundled guide and fixed topic anchors must resolve offline, independently of repository links.</en></lang>
    assert.ok(packedPaths.has("USAGE.md"), "@hia-doc/cli: missing bundled USAGE.md.");
    // <lang><zh-CN>仅核本包维护的固定主题标题，避免把本门禁扩展成通用 Markdown 解析器。</zh-CN><en>Check only the maintained topic headings, keeping this gate scoped to this package.</en></lang>
    const usage = (await readFile(path.join(packageDir, "USAGE.md"), "utf8")).replaceAll("\r\n", "\n");
    // <lang><zh-CN>README 引用须与指南标题成对，打包清单已经证明两文件可供消费者读取。</zh-CN><en>README references must pair with guide headings, with both files present in the pack list.</en></lang>
    const readme = await readFile(path.join(packageDir, "README.md"), "utf8");
    for (const [heading, anchor] of [["Candidate versions", "candidate-versions"], ["Large project builds", "large-project-builds"], ["Shared theme assets", "shared-theme-assets"], ["Installation routes", "installation-routes"], ["Command reference", "command-reference"]]) {
      assert.ok(usage.includes(`## ${heading}\n`), `Missing usage heading ${heading}.`);
      assert.ok(readme.includes(`(USAGE.md#${anchor})`), `Missing bundled guide link ${anchor}.`);
    }
    // <lang><zh-CN>逐命令标题保持十一条执行路径可查，输出格式的设计仍独立管理。</zh-CN><en>Per-command headings keep all eleven execution paths discoverable, independently of terminal presentation design.</en></lang>
    for (const command of ["docs build", "docs theme-assets", "docs evidence", "docs acceptance", "docs continuity", "docs adoption-kit", "docs business-flow-handoff", "docs enterprise-workflow", "docs html-authoring-verify", "docs coordinate-verify", "browser panel"]) {
      assert.ok(usage.includes(`### ${command}\n`), `Missing command reference ${command}.`);
    }
  }
}

console.log(`Public package content check passed: ${packagePaths.length} @hia-doc packages have consumer-safe dry-run tarballs.`);
