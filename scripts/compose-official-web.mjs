/**
 * @lang zh-CN 将已校验官网与旧参考原字节组装为离线候选；不部署、不执行输入代码、不修改来源。
 * @lang en Compose validated website and byte-preserved legacy reference into an offline candidate without deployment, input execution, or source mutation.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, lstat, realpath, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSiteVersionIndex, readLegacyReferenceIndex } from "../site/src/lib/version-index.mjs";
import { assertPublicText, checkWebsite } from "./check-official-web.mjs";
import {encodeCompositionReport, compositionFiles} from "../site/src/lib/composition-report.mjs";

// <lang lang="zh-CN">所有写入固定留在主仓dist，生产工作流尚未接入此脚本。</lang><lang lang="en">All writes stay in the owning repository dist; production workflows do not call this script yet.</lang>
const ownerRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = path.join(ownerRoot, "dist");

/**
 * @lang zh-CN 判断路径是否属于根目录，拒绝跨盘或父目录。
 * @lang en Check containment, rejecting parent traversal or cross-volume paths.
 * @param {string} root - 绝对根目录。 Absolute root.
 * @param {string} target - 绝对目标。 Absolute target.
 * @returns {boolean} 是否包含。 Whether contained.
 */
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative);
}

/**
 * @lang zh-CN 枚举普通工件文件，拒绝符号链接与隐藏的工程目录。
 * @lang en Enumerate regular artifact files, rejecting symlinks and hidden development directories.
 * @param {string} directory - 选定工件根。 Selected artifact root.
 * @param {string} [prefix=""] - 相对递归前缀。 Relative recursion prefix.
 * @returns {Promise<string[]>} 以正斜杠表示的文件名。 Forward-slash relative file names.
 */
async function filesIn(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), "Artifact symlinks are forbidden.");
    assert((!entry.name.startsWith(".") || entry.name === ".nojekyll") && entry.name !== "node_modules", "Development files cannot enter the artifact.");
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await filesIn(directory, relative + "/"));
    else { assert(entry.isFile(), "Unsupported artifact entry."); result.push(relative); }
  }
  return result.sort();
}

/**
 * @lang zh-CN 校验输出父目录的实际位置，不跟随指向主仓外的目录链接。
 * @lang en Verify the real output parent location without following a link outside the owning repository.
 * @param {string} target - 输出路径。 Output path.
 * @returns {Promise<void>} 通过无返回。 No return on success.
 */
async function checkOutputLocation(target) {
  assert(inside(distRoot, target) && path.basename(target).startsWith("official-site-"), "Output must use a dedicated official-site directory inside dist.");
  let ancestor = path.dirname(target);
  while (true) {
    try { assert(inside(await realpath(ownerRoot), await realpath(ancestor)), "Output parent escapes the owner."); break; }
    catch (error) { if (error.code !== "ENOENT") throw error; ancestor = path.dirname(ancestor); }
  }
  try { assert(!(await lstat(target)).isSymbolicLink(), "Output cannot be a symlink."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

/**
 * @lang zh-CN 有界读取精确旧身份的参考元数据，来源政策由每个实际输入分别提供。
 * @lang en Read exact legacy-reference metadata with bounded I/O, checking the source policy of each actual input separately.
 * @param {string} root - 已核主仓工件目录。 Validated owner artifact directory.
 * @param {number} limit - 单文件读取上限。 Per-file read limit.
 * @returns {Promise<object>} 索引原字节及解析后的manifest。 Original index bytes and parsed manifest.
 */
async function readReferenceMetadata(root,limit) {
  for (const name of ["versions.json","reference-pages.json"]) {
    const stats=await lstat(path.join(root,name));
    assert(stats.isFile() && !stats.isSymbolicLink() && stats.size<=limit,"Legacy metadata exceeds read budget or file boundary.");
  }
  const indexBytes=await readFile(path.join(root,"versions.json"));
  readLegacyReferenceIndex(indexBytes.toString("utf8"));
  let manifest;
  try {manifest=JSON.parse(await readFile(path.join(root,"reference-pages.json"),"utf8"));}
  catch {throw new Error("Invalid legacy artifact metadata JSON.");}
  assert(manifest.contract==="hia-reference-pages" && manifest.contractVersion==="0.1.0-draft" && manifest.privacy?.status==="pass","Legacy artifact lacks its exact manifest or passing privacy state.");
  assert(manifest.privacy.sourcesContentPolicy==="none" && ["none","public-whitelisted-excerpt"].includes(manifest.privacy.sourcePreviewPolicy),"Legacy source policy cannot expand during composition.");
  return {indexBytes,manifest};
}

/**
 * @lang zh-CN 组装独立离线候选，冲突或隐私失败时不替换已存在的输出；旧输出作为完整备份保留。
 * @lang en Assemble an offline candidate without replacing existing output on collision or privacy failure; retain previous output as a complete backup.
 * @param {object} [options] - 受控主仓输入/输出目录与预算。 Owner-controlled artifact paths and budgets.
 * @param {string} [options.website] - 独立官网产物。 Standalone website artifact.
 * @param {string} [options.reference] - 经旧门禁校验的参考产物。 Legacy-gate-validated reference artifact.
 * @param {string} [options.legacyReference] - 分站实际选择的兼容工件，默认使用reference。 Actual selected compatibility artifact for sibling mode, defaulting to reference.
 * @param {string} [options.out] - 主仓dist内专用目录。 Dedicated owner dist directory.
 * @param {"embedded"|"sibling"} [options.legacyMode="embedded"] - 旧索引与参考工件的部署位置。 Deployment location of the legacy index and artifact.
 * @param {number} [options.maxBytes] - 分站模式默认1000000000，旧嵌入模式默认1073741824。 Defaults to 1000000000 for sibling mode and 1073741824 for legacy embedded mode.
 * @param {number} [options.maxFiles=100000] - 输出文件上限。 Output file budget.
 * @param {number} [options.maxFileBytes=33554432] - 单文件有界读取上限。 Bounded per-file read limit.
 * @returns {Promise<object>} 可公开的来源摘要与文件清单；不含本机路径。 Public source digests and file inventory without local paths.
 * @throws {Error} 输入、边界、来源政策、冲突、预算或IO无效；失败不替换既有完整输出。 Invalid inputs, boundaries, source policy, collisions, budgets, or I/O; failure does not replace previous complete output.
 */
export async function composeWebsite(options = {}) {
  const website = path.resolve(ownerRoot, options.website ?? "dist/official-web-preview");
  const reference = path.resolve(ownerRoot, options.reference ?? "dist/reference-pages");
  const output = path.resolve(ownerRoot, options.out ?? "dist/official-site-preview");
  const legacyMode = options.legacyMode ?? "embedded";
  assert(["embedded", "sibling"].includes(legacyMode), "Unsupported legacy deployment mode.");
  const sibling = legacyMode === "sibling";
  const compatibility = path.resolve(ownerRoot,options.legacyReference ?? reference);
  assert(sibling || compatibility===reference,"Separate compatibility input requires sibling mode.");
  const maxBytes = options.maxBytes ?? (sibling ? 1_000_000_000 : 1024 ** 3);
  const maxFiles = options.maxFiles ?? 100000;
  const maxFileBytes = options.maxFileBytes ?? 32 * 1024 ** 2;
  assert(Number.isSafeInteger(maxBytes) && maxBytes > 0 && maxBytes <= (sibling ? 1_000_000_000 : 1024 ** 3) && Number.isSafeInteger(maxFiles) && maxFiles > 0 && maxFiles <= 100000 && Number.isSafeInteger(maxFileBytes) && maxFileBytes > 0 && maxFileBytes <= 32 * 1024 ** 2, "Invalid composition budget.");
  await checkOutputLocation(output);
  for (const input of new Set([website, reference, compatibility])) {
    assert(inside(distRoot, input) && inside(await realpath(distRoot), await realpath(input)), "Inputs must remain in the owner's artifact directory.");
    assert(!inside(input, output) && !inside(output, input), "Output overlaps an input artifact.");
    assert(!(await lstat(input)).isSymbolicLink(), "Input root cannot be a symlink.");
  }
  assert(!inside(website, reference) && !inside(reference, website), "Input artifacts overlap.");
  assert(!inside(website,compatibility) && !inside(compatibility,website),"Website overlaps compatibility input.");
  await checkWebsite(website, reference);
  // <lang lang="zh-CN">只有精确旧身份且通过隐私标记的参考工件可参与，实际旧门禁仍需单独执行。</lang><lang lang="en">Accept only the exact legacy identity with passing privacy markers; the full legacy gate still runs independently.</lang>
  const currentMetadata=await readReferenceMetadata(reference,maxFileBytes);
  const compatibilityMetadata=compatibility===reference ? currentMetadata : await readReferenceMetadata(compatibility,maxFileBytes);
  const legacyManifest=currentMetadata.manifest;
  const oldIndexBytes=compatibilityMetadata.indexBytes;
  const index = createSiteVersionIndex(sibling ? "2.0.0" : "1.0.0");
  const sourceFiles = await filesIn(reference);
  const websiteFiles = await filesIn(website);
  assert(sourceFiles.includes("index.html") && sourceFiles.includes("versions.json"), "Legacy root or index is missing.");
  let legacyRootSha256;
  if (sibling) {
    const home = path.join(compatibility, "index.html");
    const homeStats=await lstat(home);
    assert(homeStats.isFile() && !homeStats.isSymbolicLink() && homeStats.size <= maxFileBytes, "Legacy home exceeds read budget.");
    const body = await readFile(home);
    assertPublicText(body.toString("utf8"));
    assertPublicText(oldIndexBytes.toString("utf8"));
    legacyRootSha256 = createHash("sha256").update(body).digest("hex");
  }
  // <lang lang="zh-CN">先建立唯一目标计划，只有旧根首页与旧根机器索引由新身份明确取代。</lang><lang lang="en">Build a unique destination plan; only the legacy root page and root machine index are intentionally replaced.</lang>
  const plan = new Map();
  for (const file of sourceFiles) {
    assert(!file.startsWith("legacy-reference/"), "Reference source occupies the reserved legacy namespace.");
    if (!sibling) plan.set("legacy-reference/" + file, { root: reference, file, kind: "legacy-copy" });
    if (!["index.html", "versions.json"].includes(file)) plan.set(file, { root: reference, file, kind: "preserved-deep-link" });
  }
  for (const file of websiteFiles) {
    assert(file !== "versions.json" && file !== "official-site.json" && !file.startsWith("legacy-reference/"), "Website collides with a preserved legacy route.");
    // <lang><zh-CN>旧生产入口已附加官网深链。相同原件沿保留路径写一次，任何字节差异仍阻断覆盖。</zh-CN><en>The prior production entry already appends website deep links. Keep identical files once as preserved routes, while blocking every byte difference.</en></lang>
    if (plan.has(file)) {
      // <lang><zh-CN>两来源均为上方已核的普通文件，读前同时核大小与预算。</zh-CN><en>Both sources are regular files checked above. Verify their sizes and read budget before allocation.</en></lang>
      const retained = path.join(reference, file);
      const authored = path.join(website, file);
      const retainedSize = (await lstat(retained)).size;
      const authoredSize = (await lstat(authored)).size;
      assert(retainedSize === authoredSize && authoredSize <= maxFileBytes, "Website collides with a preserved legacy route.");
      assert((await readFile(retained)).equals(await readFile(authored)), "Website collides with a preserved legacy route.");
      continue;
    }
    plan.set(file, { root: website, file, kind: "website" });
  }
  const schemaPath = `site/contracts/site-version-index-${index.contractVersion}.schema.json`;
  assert(!plan.has(schemaPath), "Schema route collides with input.");
  plan.set(schemaPath, { root: ownerRoot, file: schemaPath, kind: "site-schema" });
  assert(plan.size + 2 <= maxFiles, "Composed file budget exceeded.");
  await mkdir(path.dirname(output), { recursive: true });
  // <lang lang="zh-CN">只写本次新建暂存目录；每次只保留一个文件字节，输入不执行也不做HTML后处理。</lang><lang lang="en">Write only a newly owned staging directory, retaining one file at a time without executing inputs or patching HTML.</lang>
  const staging = await mkdtemp(output + ".staging-");
  const inventory = [];
  let totalBytes = 0;
  for (const [target, source] of plan) {
    assert(!/[\\:%?#]/.test(target) && !path.posix.isAbsolute(target) && path.posix.normalize(target) === target && !target.startsWith("../"), "Unsafe artifact inventory path.");
    assertPublicText(target);
    // <lang lang="zh-CN">分配内存前先核单文件与总预算；不能等巨大文件进入Buffer后才拒绝。</lang><lang lang="en">Check per-file and total budgets before allocation, rather than rejecting only after loading a huge buffer.</lang>
    const size = (await lstat(path.join(source.root, source.file))).size;
    assert(size <= maxFileBytes && totalBytes + size <= maxBytes, "Composition read budget exceeded.");
    const bytes = await readFile(path.join(source.root, source.file));
    totalBytes += bytes.length;
    assert(totalBytes <= maxBytes, "Composed byte budget exceeded.");
    assertPublicText(bytes.toString("utf8"));
    await mkdir(path.dirname(path.join(staging, target)), { recursive: true });
    await writeFile(path.join(staging, target), bytes);
    inventory.push({ path: target, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), kind: source.kind });
  }
  await writeFile(path.join(staging, "versions.json"), JSON.stringify(index, null, 2) + "\n", "utf8");
  const manifest = {
    format: sibling ? "hia-official-site-composition-report@0.2.0" : "hia-official-site-composition-report@0.1.0", siteIndex: "versions.json",
    legacyIndex: index.legacyReference.index, sourceIdentity: { contract: legacyManifest.contract, contractVersion: legacyManifest.contractVersion },
    legacyIndexSha256: createHash("sha256").update(oldIndexBytes).digest("hex"),
    ...(sibling ? { legacyRootSha256 } : {}),
    preservation: { rootReplacements: ["index.html", "versions.json"], originalFiles: sourceFiles.length, preservedDeepLinks: sourceFiles.length - 2 },
    privacy: { status: "pass", policy: "public-brand-with-private-path-rejection@1.0.0", sourceAuthorityExpanded: false, sourcesContentPolicy: "none", sourcePreviewPolicy: legacyManifest.privacy.sourcePreviewPolicy },
    files: inventory, copiedBytes: totalBytes,
  };
  // <lang lang="zh-CN">生成清单也计入预算，失败时旧输出仍在原位；不把临时路径写入公开清单。</lang><lang lang="en">Count generated manifests in the budget; failures leave existing output intact and temporary paths stay private.</lang>
  const wireReport = encodeCompositionReport(manifest);
  const manifestBytes = JSON.stringify(wireReport, null, sibling ? 0 : 2) + "\n";
  const indexBytes = JSON.stringify(index, null, 2) + "\n";
  assertPublicText(manifestBytes);
  assertPublicText(indexBytes);
  assert(totalBytes + Buffer.byteLength(manifestBytes) + Buffer.byteLength(indexBytes) <= maxBytes, "Generated metadata exceeds byte budget.");
  await writeFile(path.join(staging, "official-site.json"), manifestBytes, "utf8");
  let backup;
  try {
    try { await lstat(output); backup = output + ".previous-" + randomUUID(); await rename(output, backup); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    await rename(staging, output);
  } catch (error) {
    if (backup) await rename(backup, output);
    throw error;
  }
  return wireReport;
}

// <lang lang="zh-CN">只有直接调用才写产物；导入测试无副作用，生产CI仍由旧脚本管理。</lang><lang lang="en">Only direct invocation writes artifacts; test imports are inert and production CI still uses the legacy assembler.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length % 2 === 0, "Expected option/value pairs.");
  const options = {};
    const names = { "--out": "out", "--reference": "reference", "--legacy-reference":"legacyReference", "--website": "website", "--legacy-mode": "legacyMode" };
  for (let i = 0; i < args.length; i += 2) {
    assert(Object.hasOwn(names, args[i]) && !Object.hasOwn(options, names[args[i]]), "Unknown or duplicated composition option.");
    options[names[args[i]]] = args[i + 1];
  }
  const manifest = await composeWebsite(options);
  console.log(JSON.stringify({ files: compositionFiles(manifest).length + 2, copiedBytes: manifest.copiedBytes, legacyFiles: manifest.preservation.originalFiles, privacy: manifest.privacy.status }));
}
