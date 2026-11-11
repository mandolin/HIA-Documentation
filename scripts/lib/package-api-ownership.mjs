/**
 * @file
 * @lang zh-CN 固定首方仓库的物理归属、包身份与稳定聚合作用域，不授予源码公开权限。
 * @lang en Physical ownership, package identity and stable aggregate scopes for fixed first-party repositories, granting no source-publication authority.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

// <lang><zh-CN>仓库路径来自本工具固定白名单，包输入只能选择其中一项。</zh-CN><en>Repository paths come from this tool's fixed allowlist, of which package inputs may select one.</en></lang>
const owners = new Set(["main-repo", "hia-jsdoc", "hia-htmdoc", "hia-cssdoc", "hia-dotnetdoc", "jsdoc-plugin-hia-sys", "jsdoc-theme-hia"]);

/**
 * @lang zh-CN 逐级验证已授权根下的普通路径，拒绝链接、越界与非规范拼写。
 * @lang en Check regular path components under an authorized root, rejecting links, traversal and noncanonical spelling.
 * @param {string} root <lang><zh-CN>已核物理根。</zh-CN><en>Verified physical root.</en></lang>
 * @param {string} relative <lang><zh-CN>正斜线相对路径。</zh-CN><en>Forward-slash relative path.</en></lang>
 * @returns {string} <lang><zh-CN>物理根内的实际路径。</zh-CN><en>Actual path within the physical root.</en></lang>
 */
function ownedPath(root, relative) {
  assert(typeof relative === "string" && relative.length > 0 && !/[\\:%?#*]/u.test(relative)
    && !path.isAbsolute(relative) && relative.split("/").every(part => part && part !== "." && part !== ".."), "Unsafe package ownership path.");
  // <lang><zh-CN>读取前逐级拒绝重定向，避免真实目标位于根内的链接也改变归属含义。</zh-CN><en>Reject redirection component by component before reading, including links whose targets stay inside the root.</en></lang>
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    const state = fs.lstatSync(current);
    assert(!state.isSymbolicLink() && (state.isDirectory() || state.isFile() && state.nlink === 1), "Linked package ownership path.");
  }
  assert.equal(fs.realpathSync(current), current, "Redirected package ownership path.");
  return current;
}

/**
 * @lang zh-CN 按固定仓库归属核对实际包名、版本及清单摘要，根目录仅用于只读审计。
 * @lang en Verify the actual package name, version and manifest digest under fixed repository ownership, with roots used only for read-only auditing.
 * @param {string} workspaceRoot <lang><zh-CN>调用方已授权的工作区。</zh-CN><en>Caller-authorized workspace.</en></lang>
 * @param {object} item <lang><zh-CN>固定采用清单中的owner、directory及完整name。</zh-CN><en>Owner, directory and full name from the fixed adoption inventory.</en></lang>
 * @returns {object} <lang><zh-CN>实际根、清单、版本和摘要，不含源码读取或发布许可。</zh-CN><en>Actual roots, manifest, version and digest, without source-read or publication permission.</en></lang>
 * @throws {Error} <lang><zh-CN>未知归属、不安全路径、清单身份或版本无效。</zh-CN><en>Unknown ownership, unsafe paths, or invalid manifest identity/version.</en></lang>
 */
export function resolvePackageApiOwnership(workspaceRoot, item) {
  assert(owners.has(item.owner) && typeof item.directory === "string"
    && (item.directory === "" || /^(?:packages\/[a-z0-9-]+|apps\/cli)$/u.test(item.directory)), "Unknown package API owner or directory.");
  // <lang><zh-CN>先固定调用方工作区，再检查仓库与包的每个路径组件。</zh-CN><en>Fix the caller's workspace before checking every repository/package path component.</en></lang>
  const workspace = fs.realpathSync(workspaceRoot);
  // <lang><zh-CN>主仓固定为本审核工具所在仓库，支持CI独立检出目录；卫星仍按授权容器和固定owner定位。</zh-CN><en>The main repository is fixed to this audit tool's own checkout, supporting standalone CI directory names; satellites retain authorized-container and fixed-owner resolution.</en></lang>
  const ownerRoot = item.owner === "main-repo"
    ? fs.realpathSync(fileURLToPath(new URL("../../", import.meta.url)))
    : ownedPath(workspace, "HIA/" + item.owner);
  const packageRoot = item.directory ? ownedPath(ownerRoot, item.directory) : ownerRoot;
  const manifestPath = ownedPath(packageRoot, "package.json");
  assert(fs.statSync(manifestPath).size <= 1024 * 1024, "Package manifest exceeds audit budget.");
  const bytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert(manifest.name === item.name && typeof manifest.version === "string" && manifest.version.trim(), "Required API package identity mismatch.");
  return {ownerRoot, packageRoot, manifest, version: manifest.version, manifestSha256: createHash("sha256").update(bytes).digest("hex")};
}

/**
 * @lang zh-CN 为已核包的原始模块分配稳定作用域，包版本和临时位置不改变声明身份。
 * @lang en Allocate a stable scope for an audited package's authored module, keeping declaration identity independent of package versions and temporary locations.
 * @param {object} item <lang><zh-CN>已核owner及完整包名。</zh-CN><en>Audited owner and full package name.</en></lang>
 * @param {object} ownership <lang><zh-CN>resolvePackageApiOwnership返回的实际根。</zh-CN><en>Actual roots from resolvePackageApiOwnership.</en></lang>
 * @param {string} modulePath <lang><zh-CN>仓库内原始模块路径。</zh-CN><en>Authored module path within the repository.</en></lang>
 * @returns {string} <lang><zh-CN>可公开的稳定package作用域，无原始物理路径。</zh-CN><en>Public stable package scope without a physical path.</en></lang>
 */
export function createPackageApiIdentityScope(item, ownership, modulePath) {
  assert(owners.has(item.owner) && ownership.manifest.name === item.name, "Package scope ownership mismatch.");
  const moduleFile = ownedPath(ownership.ownerRoot, modulePath);
  const packageRelative = path.relative(ownership.packageRoot, moduleFile);
  assert(packageRelative && !packageRelative.startsWith("..") && !path.isAbsolute(packageRelative)
    && fs.statSync(moduleFile).isFile(), "Package scope requires an owned authored file.");
  return "package:" + createHash("sha256").update(JSON.stringify([item.owner, item.name, modulePath])).digest("hex");
}
