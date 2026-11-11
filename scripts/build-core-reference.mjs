/**
 * @file
 * @lang zh-CN 用现有生产器构建独立核心 API 站，保留模块边界、原生工件和双语静态入口。
 * @lang en Build the independent core API site through existing producers, retaining module boundaries, native artifacts, and bilingual static entries.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preparePublicReferencePackageApis, checkPublicReferencePackageApis } from "./public-reference-packages.mjs";
import { preparePublicReferenceResources, checkPublicReferenceResources } from "./public-reference-resources.mjs";
import { preparePublicReferenceSourceConfig, preparePublicReferenceLocaleConfig } from "./public-reference-source.mjs";
import { assertPublicText } from "./check-official-web.mjs";
import { assertDocumentationSiteNavigation, PORTAL_PUBLIC_SOURCE_GITATTRIBUTES } from "../packages/renderer-html/dist/index.js";
import { createGeneratedSiteNavigation } from "../site/src/lib/generated-navigation.mjs";
import { apiReferenceBase } from "../site/src/lib/routes.mjs";

// <lang zh-CN>输出归主仓 dist 所有，来源只允许当前主仓所属容器。</lang><lang en>Outputs belong to this repository's dist directory, and sources must belong to its workspace container.</lang>
const owner = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const dist = path.join(owner, "dist");
const locales = ["en", "zh-CN"];

/**
 * @lang zh-CN 本站显式采用已公开审阅的插件SDK资源包，资源与模块范围独立记录。
 * @lang en Explicitly select the reviewed plugin SDK resource package, recording resource scope independently of modules.
 */
export const CORE_REFERENCE_RESOURCE_PACKAGES = Object.freeze(["@hia-doc/plugin-sdk"]);

/**
 * @lang zh-CN 检查路径是否在指定目录内。
 * @lang en Check whether a path is contained in the selected directory.
 * @param {string} root - 根目录。 Root directory.
 * @param {string} target - 目标路径。 Target path.
 * @returns {boolean} 是否包含。 Whether contained.
 */
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/**
 * @lang zh-CN 输出必须位于主仓 dist 的子目录，拒绝已有链接和重定向父目录。
 * @lang en Require a child of the owner's dist directory, rejecting existing links and redirected parents.
 * @param {string} output - 绝对目标目录。 Absolute destination.
 * @returns {void} 非法时抛错。 Throws on an invalid location.
 */
export function assertCoreReferenceOutput(output) {
  assert(inside(dist, output) && output !== dist, "Core reference output must be a child of dist.");
  let ancestor = output;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  assert(!fs.lstatSync(ancestor).isSymbolicLink() && inside(owner, fs.realpathSync(ancestor)), "Core reference output is redirected.");
  if (fs.existsSync(output)) assert(fs.lstatSync(output).isDirectory(), "Core reference output is not a directory.");
}

/**
 * @lang zh-CN 逐文件检查可发布目录，拒绝工程副本、链接、越界、隐私及容量超限。
 * @lang en Inspect every publishable file, rejecting build copies, links, escaping paths, private content, and excessive size.
 * @param {string} root - 只含两语言和根入口的站点目录。 Site directory containing both locales and the root entry.
 * @param {string[]} [localeRoots] - 显式语言输出相对根，默认en/zh-CN；分区发布方提供自己的互斥根清单。 Explicit relative locale roots, defaulting to en/zh-CN; partition publishers supply their disjoint roots.
 * @returns {{files:number, bytes:number, inventory:Array<{path:string,bytes:number,sha256:string}>}} 实际文件摘要。 Actual file digests.
 * @throws {Error} 工件路径、内容或容量不符合。 Invalid paths, contents, or capacity.
 */
export function inspectCoreReferenceSite(root, localeRoots = locales) {
  assert(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), "Invalid core reference site root.");
  assert(Array.isArray(localeRoots) && localeRoots.length && new Set(localeRoots).size === localeRoots.length && localeRoots.every(value=>typeof value === "string" && /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/u.test(value)), "Invalid reference locale roots.");
  assert(localeRoots.every(value=>!localeRoots.some(other=>other!==value&&value.startsWith(other+"/"))), "Overlapping reference roots.");
  const topDirectories=new Set(localeRoots.map(value=>value.split("/")[0]));
  const inventory = [];
  let bytes = 0;
  /**
   * @lang zh-CN 只遍历已选站点目录，逐文件累计摘要和容量。
   * @lang en Traverse only the selected site directory, accumulating per-file digests and size.
   */
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, entry.name);
      const file = path.join(directory, entry.name);
      const state = fs.lstatSync(file);
      // <lang zh-CN>来源字节保护文件仅位于语言根，任意其他隐藏工程文件继续拒绝。</lang><lang en>Source-byte protection metadata belongs only at locale roots; other hidden development files remain rejected.</lang>
      const sourceAttributes = localeRoots.some(localeRoot => relative === localeRoot + "/.gitattributes");
      assert(!state.isSymbolicLink() && !/[\\:%?#]/u.test(relative) && (!entry.name.startsWith(".") || relative === ".nojekyll" || sourceAttributes), "Unexpected core reference path.");
      if (sourceAttributes) assert(state.isFile(), "Invalid core reference source attributes.");
      if (!prefix) assert(topDirectories.has(entry.name) || ["index.html", ".nojekyll"].includes(entry.name), "Build files cannot enter the core reference site.");
      assert(["index.html",".nojekyll"].includes(relative)||localeRoots.some(localeRoot=>relative===localeRoot||relative.startsWith(localeRoot+"/")||state.isDirectory()&&localeRoot.startsWith(relative+"/")),"Unexpected core reference path.");
      if (state.isDirectory()) { visit(file, relative); continue; }
      assert(state.isFile() && state.nlink === 1 && state.size <= 32 * 1024 ** 2, "Invalid core reference file size or type.");
      assert(inventory.length < 100000 && bytes + state.size <= 1_000_000_000, "Core reference site exceeds its publication budget.");
      // <lang zh-CN>逐文件读取保留背压，不把整个站点留在内存中。</lang><lang en>Read one file at a time without retaining the entire site in memory.</lang>
      const body = fs.readFileSync(file);
      if (sourceAttributes) assert.equal(body.toString("utf8"), PORTAL_PUBLIC_SOURCE_GITATTRIBUTES, "Invalid core reference source attributes.");
      assertPublicText(relative);
      assertPublicText(body.toString("utf8"));
      bytes += body.length;
      inventory.push({ path: relative, bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") });
    }
  }
  visit(root);
  assert(inventory.some(file => file.path === "index.html"), "Missing default core reference entry.");
  for (const localeRoot of localeRoots) assert(inventory.some(file => file.path === localeRoot + "/project-index.json"), "Missing core reference language index.");
  return { files: inventory.length, bytes, inventory: inventory.sort((left, right) => left.path.localeCompare(right.path, "en")) };
}

/**
 * @lang zh-CN 正常构建全部十三核心模块，在完整检查通过后替换目标目录并保留前一输出。
 * @lang en Build all thirteen core modules and replace the destination after complete checks, retaining the previous output.
 * @param {object} [options] - 显式工作区和输出位置。 Explicit workspace and output location.
 * @param {string} [options.workspaceRoot] - 包含本主仓与 HIA 工具的容器。 Container containing this repository and HIA tools.
 * @param {string} [options.out] - 主仓 dist 下的输出。 Output under the owner's dist.
 * @returns {Promise<object>} 发布目录摘要及来源提交。 Publishable-file summary and source revisions.
 * @throws {Error} 来源、生产、路径、内容或容量无效。 Invalid sources, production, paths, content, or capacity.
 */
export async function buildCoreReference(options = {}) {
  const workspace = fs.realpathSync(options.workspaceRoot ?? path.dirname(owner));
  const output = path.resolve(owner, options.out ?? "dist/core-api-reference");
  assertCoreReferenceOutput(output);
  assert(fs.realpathSync(path.join(workspace, "main-repo")) === owner, "Workspace does not own this main repository.");
  const tool = fs.realpathSync(path.join(workspace, "HIA/hia-tsdoc"));
  assert(inside(workspace, tool), "Core reference producer escapes the workspace.");
  assert(fs.existsSync(path.join(owner, "apps/cli/dist/index.js")), "Build the HIA CLI before building core references.");
  // <lang zh-CN>固定两个生产仓的已提交状态，避免报告提交与实际构建源码不一致。</lang><lang en>Pin committed states of both production repositories so reported revisions match the built sources.</lang>
  const revisions = [owner, tool].map(repository => {
    execFileSync("git", ["-C", repository, "diff", "--exit-code", "HEAD", "--"], { stdio: "pipe" });
    return execFileSync("git", ["-C", repository, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  });
  const packages = JSON.parse(fs.readFileSync(path.join(owner, "reference/required-package-api.inputs.json"), "utf8")).packages.filter(item => item.owner === "main-repo").map(item => item.name);
  assert(packages.length === 13 && new Set(packages).size === 13, "Expected thirteen explicit core packages.");
  // <lang zh-CN>暂存目录和清单均由本轮独占，失败时目标原目录保持可读。</lang><lang en>This run owns its staging directory and manifest, keeping the existing destination readable on failure.</lang>
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // <lang zh-CN>同一目标只允许一个写者，独立目标仍能并行构建。</lang><lang en>Allow one writer per destination while permitting independent destinations to build concurrently.</lang>
  const lockPath = output + ".lock";
  const lock = fs.openSync(lockPath, "wx");
  let staging;
  const manifestPath = path.join(workspace, ".hia-core-reference-" + randomUUID() + ".runtime.hia-project.json");
  let ownsManifest = false;
  try {
    staging = fs.mkdtempSync(output + ".staging-");
    const inputs = await preparePublicReferencePackageApis({ packageNames: packages, workspaceRoot: workspace, mainRoot: owner, toolRoot: tool, outputRoot: staging, locales });
    // <lang zh-CN>资源复用正常JSONdoc准备链，实际原文、地图与逐值声明沿同一项目聚合。</lang><lang en>Resources reuse normal JSONdoc preparation, aggregating original bytes, maps and per-value declarations into the same project.</lang>
    const resourceResult = await preparePublicReferenceResources({ packageNames: CORE_REFERENCE_RESOURCE_PACKAGES, workspaceRoot: workspace, mainRoot: owner, outputRoot: staging, locales });
    const sourceConfigPath = preparePublicReferenceSourceConfig(owner, path.join(staging, ".runtime"), resourceResult.sourcePaths, false);
    const manifest = { schemaVersion: "0.1.0-draft", project: { id: "project:hia-core-api-reference", name: "HIA Documentation System Core Package API", defaultLocale: "zh-CN", locales: ["zh-CN", "en"] }, inputs: [...inputs, ...resourceResult.inputs] };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    ownsManifest = true;
    const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", apiReferenceBase);
    assertDocumentationSiteNavigation(navigation);
    const navigationPath = path.join(staging, ".runtime/site-navigation.json");
    fs.writeFileSync(navigationPath, JSON.stringify(navigation, null, 2) + "\n");
    for (const locale of locales) {
      const configPath = preparePublicReferenceLocaleConfig(sourceConfigPath, locale);
      execFileSync(process.execPath, [path.join(owner, "apps/cli/dist/index.js"), "docs", "build", "--config", configPath, "--project-manifest", manifestPath, "--site-navigation", navigationPath, "--out", path.join(staging, locale), "--locale", locale], { cwd: workspace, stdio: "inherit" });
      checkPublicReferencePackageApis({ packageApis: packages }, staging, locale);
      checkPublicReferenceResources({ packageResources: CORE_REFERENCE_RESOURCE_PACKAGES }, staging, locale);
    }
    const site = path.join(staging, "site");
    fs.mkdirSync(site);
    for (const locale of locales) fs.renameSync(path.join(staging, locale), path.join(site, locale));
    // <lang zh-CN>默认入口明确使用中文，普通语言链接支持无脚本导航。</lang><lang en>The default entry selects Chinese explicitly, with ordinary language links for script-free navigation.</lang>
    fs.writeFileSync(path.join(site, "index.html"), '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=zh-CN/"><title>HIA Documentation System API</title><link rel="icon" href="data:,"></head><body><a href="zh-CN/" lang="zh-CN">HIA Documentation System · 中文 API 参考</a><a href="en/" lang="en">HIA Documentation System · English API reference</a></body></html>\n');
    fs.writeFileSync(path.join(site, ".nojekyll"), "");
    const checked = inspectCoreReferenceSite(site);
    const sourceCommit = execFileSync("git", ["-C", owner, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const producerCommit = execFileSync("git", ["-C", tool, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.deepEqual([sourceCommit, producerCommit], revisions, "Source revisions changed during the build.");
    for (const repository of [owner, tool]) execFileSync("git", ["-C", repository, "diff", "--exit-code", "HEAD", "--"], { stdio: "pipe" });
    const resources = JSON.parse(fs.readFileSync(path.join(staging, "package-resources/adoption.json"), "utf8")).rows;
    const report = {
      sourceRepository: "mandolin/HIA-Documentation",
      sourceCommit,
      producerRepository: "mandolin/hia-tsdoc",
      producerCommit,
      packages,
      resourcePackages: CORE_REFERENCE_RESOURCE_PACKAGES,
      resources,
      sourcePolicy: { paths: resourceResult.sourcePaths, maxLines: 400, presentation: "fetch" },
      ...checked
    };
    assertPublicText(JSON.stringify(report));
    fs.writeFileSync(path.join(staging, "build-report.json"), JSON.stringify(report, null, 2) + "\n");
    // <lang zh-CN>清单与运行配置留在构建报告外；只删除本轮拥有的暂存运行目录。</lang><lang en>Exclude runtime configuration from publication, removing only this run's owned runtime directory.</lang>
    assert(!fs.lstatSync(path.join(staging, ".runtime")).isSymbolicLink());
    fs.rmSync(path.join(staging, ".runtime"), { recursive: true, force: true });
    let backup;
    if (fs.existsSync(output)) { backup = output + ".previous-" + randomUUID(); fs.renameSync(output, backup); }
    try { fs.renameSync(staging, output); }
    catch (error) { if (backup) fs.renameSync(backup, output); throw error; }
    return { sourceCommit, producerCommit, packages: packages.length, files: checked.files, bytes: checked.bytes };
  } finally {
    try { if (ownsManifest) fs.unlinkSync(manifestPath); }
    finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
  }
}

// <lang zh-CN>命令入口只解析显式目录，导入测试不会运行构建。</lang><lang en>The command parses explicit directories; importing tests never runs a build.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { "--workspace-root": "workspaceRoot", "--out": "out" }[args[index]];
    assert(key && args[index + 1] && !Object.hasOwn(options, key), "Use --workspace-root and optional --out.");
    options[key] = args[index + 1];
  }
  console.log(JSON.stringify(await buildCoreReference(options)));
}
