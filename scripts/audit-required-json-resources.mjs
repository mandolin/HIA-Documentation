/**
 * @lang zh-CN 按必要包显式出口核对JSON资源字节、完整值位置与引用出现位置。
 * @lang en Audits JSON resource bytes, complete value locations and reference occurrences through explicit required-package exports.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath, pathToFileURL} from "node:url";
import {collectPackageEntries} from "./lib/package-api-inputs.mjs";
import {inspectJsonResource, readJsonResourceBytes} from "./lib/json-resource-audit.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 从当前主仓所属容器读取45必要包，输出独立审核快照。
 * @lang en Reads the 45 required packages from this main repository's container and writes an independent audit snapshot.
 * @param {string} workspaceRoot - 授权工作区容器。 Authorized workspace container.
 * @param {object} [options] - packageNames为允许清单中的非空唯一子集，省略沿原45包。 packageNames is a nonempty unique allowlisted subset, defaulting to the original 45 packages.
 * @returns {object} 实际审核报告与主仓相对输出位置。 Actual audit report and main-relative output location.
 * @throws {Error} 清单、物理边界、JSON或写入位置无效。 Invalid manifest, physical boundary, JSON or output location.
 */
export function auditRequiredJsonResources(workspaceRoot, options = {}) {
  // <lang><zh-CN>主仓身份和owner目录固定为本工作区，显式清单限定全部包入口。</zh-CN><en>Main-repository identity and owner directories belong to this workspace, with package entries bounded by the explicit inventory.</en></lang>
  const mainRoot = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
  const scope = JSON.parse(readJsonResourceBytes(mainRoot, "reference/required-package-api.inputs.json"));
  assert.equal(scope.packages.length, 45);
  assert.equal(new Set(scope.packages.map(item => item.name)).size, 45);
  // <lang><zh-CN>读取任何包前核显式子集，空/重复/未知选择均拒绝；省略保持原范围。</zh-CN><en>Validate explicit subsets before reading any package, rejecting empty, duplicate or unknown selections; omission retains the original scope.</en></lang>
  const names = options.packageNames;
  assert(names === undefined || Array.isArray(names) && names.length && new Set(names).size === names.length && names.every(name => scope.packages.some(item => item.name === name)), "Invalid JSON resource package selection.");
  const container = fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container, "main-repo")), mainRoot);
  const owners = new Set(["main-repo", "hia-jsdoc", "hia-htmdoc", "hia-cssdoc", "hia-dotnetdoc", "jsdoc-plugin-hia-sys", "jsdoc-theme-hia"]);
  const manifests = [];
  const entries = [];
  for (const item of scope.packages) {
    if (names && !names.includes(item.name)) continue;
    assert(owners.has(item.owner));
    assert(typeof item.directory === "string" && /^(?:packages\/[a-z0-9-]+|apps\/cli)?$/.test(item.directory));
    const ownerRoot = item.owner === "main-repo" ? mainRoot : path.join(container, "HIA", item.owner);
    assert.equal(fs.realpathSync(ownerRoot), ownerRoot);
    const packageRoot = path.join(ownerRoot, item.directory);
    assert.equal(fs.realpathSync(packageRoot), packageRoot);
    // <lang><zh-CN>包清单按既有入口审核读取，记录共享安装的链接数和本次字节摘要。</zh-CN><en>Package manifests follow the existing entry-audit read path, recording shared-install link counts and this invocation's byte digest.</en></lang>
    const manifestPath = path.join(packageRoot, "package.json");
    const manifestState = fs.lstatSync(manifestPath);
    assert(manifestState.isFile() && !manifestState.isSymbolicLink());
    assert.equal(fs.realpathSync(manifestPath), manifestPath);
    assert(manifestState.size <= 4 * 1024 * 1024);
    const manifestBytes = fs.readFileSync(manifestPath);
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.name, item.name);
    manifests.push({package: item.name, owner: item.owner, directory: item.directory, hardLinkCount: manifestState.nlink, sha256: createHash("sha256").update(manifestBytes).digest("hex")});
    const exported = collectPackageEntries(packageRoot, manifest, item.sourceEntry, item.sourceEntries);
    for (const entry of exported.filter(candidate => candidate.kind === "json-resource")) {
      // <lang><zh-CN>资源事实来自实际声明文件，包的代码入口仅参与静态清单读取。</zh-CN><en>Resource facts come from the actual declared files, while code entries participate through static inventory reads.</en></lang>
      const bytes = readJsonResourceBytes(packageRoot, entry.target);
      const inspected = inspectJsonResource(bytes);
      entries.push({package: item.name, owner: item.owner, subpath: entry.subpath, conditions: entry.conditions, source: path.relative(container, path.join(packageRoot, entry.target)).replaceAll("\\", "/"), ...inspected});
    }
  }

  // <lang><zh-CN>相同schema身份的多入口作为独立事实登记，供后续资源语义核对。</zh-CN><en>Multiple entries sharing a schema identity remain separate facts for subsequent resource-semantic verification.</en></lang>
  const schemaIdentities = new Map();
  for (const entry of entries.filter(item => item.schemaId)) {
    if (!schemaIdentities.has(entry.schemaId)) schemaIdentities.set(entry.schemaId, []);
    schemaIdentities.get(entry.schemaId).push({package: entry.package, subpath: entry.subpath, sha256: entry.sha256});
  }
  const summary = {
    requiredPackages: manifests.length,
    resourceEntries: entries.length,
    resourcePackages: new Set(entries.map(item => item.package)).size,
    schemaEntries: entries.filter(item => item.schemaId && item.dialect).length,
    valueNodes: entries.reduce((sum, item) => sum + item.nodes.length, 0),
    referenceOccurrences: entries.reduce((sum, item) => sum + item.referenceOccurrences.length, 0)
  };
  const report = {purpose: "independent-json-resource-audit", manifests, entries, summary, duplicateSchemaIdentities: [...schemaIdentities].filter(([, items]) => items.length > 1).map(([schemaId, bindings]) => ({schemaId, bindings})), referenceSemantics: "lexical-occurrences", coverageComplete: false, releaseProof: false};
  assertPublicRootOmission(report, container);

  // <lang><zh-CN>全部输入核验后才在主仓dist建立本轮唯一输出目录。</zh-CN><en>Create a unique output under main-repo dist only after every input has passed inspection.</en></lang>
  const dist = path.join(mainRoot, "dist");
  fs.mkdirSync(dist, {recursive: true});
  assert.equal(fs.realpathSync(dist), dist);
  const output = fs.mkdtempSync(path.join(dist, "required-json-resources-"));
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", {flag: "wx"});
  return {report, output: path.relative(mainRoot, output).replaceAll("\\", "/")};
}

// <lang><zh-CN>命令入口仅接收当前授权容器，输出目录按主仓自身位置计算。</zh-CN><en>The command accepts only the authorized container, deriving output from this main repository's own location.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length === 2 && args[0] === "--workspace-root", "Expected --workspace-root.");
  const {report, output} = auditRequiredJsonResources(path.resolve(args[1]));
  console.log(JSON.stringify({...report.summary, output, coverageComplete: false}));
}
