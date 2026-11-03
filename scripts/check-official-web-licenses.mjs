/**
 * @lang zh-CN 复核官网构建依赖的实际可达闭包，排除孤立缓存，拒绝受限图片二进制。
 * @lang en Audit the reachable website build dependency closure, excluding orphaned caches and rejecting restricted image binaries.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// <lang lang="zh-CN">仅从主仓已安装Astro开始，不把pnpm存储内旧包误算为有效依赖。</lang><lang lang="en">Start from the installed Astro package, never treating old pnpm store entries as effective dependencies.</lang>
const root = fileURLToPath(new URL("../", import.meta.url));
const pending = [fs.realpathSync(path.join(root, "node_modules/astro"))];
const visited = new Set();
const records = [];
const allowed = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "BlueOak-1.0.0", "CC0-1.0", "MPL-2.0"]);

/**
 * @lang zh-CN 按Node包目录层级查找实际依赖清单，兼容exports隐藏package.json的包。
 * @lang en Resolve manifests by Node package-directory ancestry, including packages whose exports hide package.json.
 * @param {string} directory - 当前真实包目录。 Current real package directory.
 * @param {string} name - 已声明依赖名称。 Declared dependency name.
 * @returns {string | undefined} 已安装包真实目录；未安装可选项为空。 Real installed directory, or undefined for absent optional packages.
 */
function resolvePackage(directory, name) {
  for (let current = directory; ; current = path.dirname(current)) {
    // <lang lang="zh-CN">依赖名来自已安装清单，不接收用户路径。</lang><lang lang="en">Dependency names come from installed manifests, not user-supplied paths.</lang>
    const candidate = path.join(current, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return fs.realpathSync(candidate);
    if (current === path.dirname(current)) return undefined;
  }
}
while (pending.length) {
  // <lang lang="zh-CN">真实路径去重可处理提升、共享依赖及环。</lang><lang lang="en">Real-path deduplication handles hoisting, shared dependencies, and cycles.</lang>
  const directory = pending.pop();
  if (visited.has(directory)) continue;
  visited.add(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  assert(manifest.name !== "sharp" && !manifest.name.startsWith("@img/"), "Image optimization dependencies must remain excluded.");
  assert(allowed.has(manifest.license), "Unreviewed website dependency license: " + manifest.name);
  records.push({ name: manifest.name, version: manifest.version, license: manifest.license });
  for (const name of Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies })) {
    // <lang lang="zh-CN">工作区明确排除Sharp可选项；孤立缓存不属于此配置的依赖图，干净安装另行验证。</lang><lang lang="en">The workspace explicitly excludes optional Sharp; orphaned caches are outside this configured graph and clean installation is checked separately.</lang>
    if (name === "sharp" && manifest.optionalDependencies?.[name]) continue;
    // <lang lang="zh-CN">缺失可选项和可选peer不要求安装；必需依赖缺失必须失败。</lang><lang lang="en">Absent optional dependencies and optional peers need not be installed; missing required dependencies fail.</lang>
    const resolved = resolvePackage(directory, name);
    if (resolved) pending.push(resolved);
    else assert(!manifest.dependencies?.[name] && (!manifest.peerDependencies?.[name] || manifest.peerDependenciesMeta?.[name]?.optional), "Missing required website build dependency: " + name);
  }
}
records.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
// <lang lang="zh-CN">输出只含公开包身份，不泄漏安装绝对路径。</lang><lang lang="en">Output only public package identities, never absolute installation paths.</lang>
console.log(JSON.stringify({ packages: records.length, restrictedImageDependencies: 0, records }, null, 2));
