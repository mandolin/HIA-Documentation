/**
 * @lang zh-CN 复核离线官网组合工件，逐摘要核原字节、旧深链与新索引；不做网络发布。
 * @lang en Verify an offline composed website through digests, legacy deep links, and the new index; never publishes.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readSiteVersionIndex, readLegacyReferenceIndex } from "../site/src/lib/version-index.mjs";
import { assertPublicText } from "./check-official-web.mjs";
import {compositionFiles} from "../site/src/lib/composition-report.mjs";

/**
 * @lang zh-CN 只接受规范的工件相对文件名，避免清单驱动越界读取。
 * @lang en Accept canonical artifact-relative file names, preventing manifest-driven out-of-root reads.
 * @param {unknown} value - 清单文件名。 Manifest file name.
 * @returns {void} 不符合时抛出固定错误。 Throws a fixed error when invalid.
 */
function safeFile(value) {
  assert(typeof value === "string" && value.length > 0 && !/[\\:%?#]/.test(value) && !path.posix.isAbsolute(value) && path.posix.normalize(value) === value && !value.startsWith("../") && value !== "..", "Unsafe artifact inventory path.");
}

/**
 * @lang zh-CN 递归枚举实际普通文件，拒绝根内符号链接。
 * @lang en Enumerate actual regular files recursively, rejecting symlinks.
 * @param {string} root - 工件根。 Artifact root.
 * @param {string} [prefix=""] - 相对前缀。 Relative prefix.
 * @returns {Promise<string[]>} 实际文件。 Actual files.
 */
async function actualFiles(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), "Artifact symlinks are forbidden.");
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await actualFiles(root, relative + "/"));
    else { assert(entry.isFile(), "Unexpected artifact entry."); files.push(relative); }
  }
  return files;
}

/**
 * @lang zh-CN 逐文件验证新组合工件；清单不等于已验证，所有真实字节重新核对。
 * @lang en Verify actual bytes in the composed artifact; a manifest alone is never accepted as verification.
 * @param {string} [output] - 工件目录。 Artifact directory.
 * @param {string} [legacyOutput] - 2.0.0模式的独立旧参考工件目录。 Independent legacy reference directory for 2.0.0.
 * @param {string} [referenceOutput] - 当前原参考目录，省略时沿用旧同目录调用。 Current original reference directory, defaulting to the legacy same-directory call.
 * @returns {Promise<object>} 无本机路径的统计。 Statistics without local paths.
 * @throws {Error} 清单、字节、路径、来源政策或索引目标不符。 Invalid inventory, bytes, paths, source policy, or index destinations.
 */
export async function checkOfficialSite(output = fileURLToPath(new URL("../dist/official-site-preview/", import.meta.url)), legacyOutput, referenceOutput) {
  assert(!(await lstat(output)).isSymbolicLink(), "Artifact root cannot be a symlink.");
  for (const name of ["official-site.json", "versions.json"]) assert((await lstat(path.join(output, name))).size <= 32 * 1024 ** 2, "Artifact metadata exceeds read budget.");
  const reportText = await readFile(path.join(output, "official-site.json"), "utf8");
  const indexText = await readFile(path.join(output, "versions.json"), "utf8");
  assertPublicText(reportText);
  assertPublicText(indexText);
  let report;
  try { report = JSON.parse(reportText); }
  catch { throw new Error("Invalid composition report JSON."); }
  const index = readSiteVersionIndex(indexText);
  // <lang lang="zh-CN">新版索引的主机路径只用于HTTP，本地验收必须单独提供旧工件根。</lang><lang lang="en">The new index's host path is for HTTP. Offline verification requires the separate legacy root.</lang>
  const sibling = index.contractVersion === "2.0.0";
  const reportFormat = sibling ? "hia-official-site-composition-report@0.2.0" : "hia-official-site-composition-report@0.1.0";
  assert((report.format === reportFormat || sibling && report.format === "hia-official-site-composition-report@0.3.0") && report.siteIndex === "versions.json" && report.legacyIndex === index.legacyReference.index, "Unexpected composition report.");
  if (sibling) assert(typeof legacyOutput === "string" && (await lstat(legacyOutput)).isDirectory(), "Independent legacy artifact directory is required.");
  const legacyRoot = sibling ? legacyOutput : path.join(output, "legacy-reference");
  // <lang><zh-CN>原深链与当前参考逐字节对应，兼容站根/旧索引另按其固定输入核验。</zh-CN><en>Match preserved routes to the current reference byte-for-byte, verifying the compatibility root and index against their independent pinned input.</en></lang>
  const referenceRoot=sibling ? referenceOutput ?? legacyRoot : legacyRoot;
  assert((await lstat(referenceRoot)).isDirectory() && !(await lstat(referenceRoot)).isSymbolicLink(),"Original reference directory is invalid.");
  assert(report.privacy?.status === "pass" && report.privacy.sourceAuthorityExpanded === false && report.privacy.policy === "public-brand-with-private-path-rejection@1.0.0", "Invalid composed privacy boundary.");
  const reportFiles = compositionFiles(report);
  assert(Array.isArray(reportFiles) && reportFiles.length > 0 && reportFiles.length <= 100000, "Invalid file inventory.");
  const actual = new Set(await actualFiles(output));
  assert(actual.size === reportFiles.length + 2 && actual.has("versions.json") && actual.has("official-site.json"), "Actual output inventory disagrees with its report.");
  const hashes = new Map();
  let copiedBytes = 0;
  for (const entry of reportFiles) {
    safeFile(entry.path);
    assert(actual.has(entry.path) && !hashes.has(entry.path), "Missing or duplicated artifact file.");
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && /^[a-f0-9]{64}$/.test(entry.sha256), "Invalid file digest metadata.");
    assert(["legacy-copy", "preserved-deep-link", "website", "site-schema"].includes(entry.kind) && (!sibling || (entry.kind !== "legacy-copy" && !entry.path.startsWith("legacy-reference/"))), "Unexpected inventory class or legacy namespace.");
    // <lang lang="zh-CN">先核大小再读，不允许被篡改清单触发巨大文件分配。</lang><lang lang="en">Check size before reading so a tampered report cannot cause an enormous allocation.</lang>
    const size = (await lstat(path.join(output, entry.path))).size;
    assert(size === entry.bytes && size <= 32 * 1024 ** 2, "Artifact size or bounded-read limit disagrees.");
    const bytes = await readFile(path.join(output, entry.path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert(digest === entry.sha256, "Artifact byte digest mismatch.");
    assertPublicText(bytes.toString("utf8"));
    hashes.set(entry.path, { digest, kind: entry.kind, bytes: size });
    copiedBytes += bytes.length;
  }
  assert(copiedBytes === report.copiedBytes, "Copied byte total disagrees.");
  // <lang><zh-CN>新表示把自身清单及索引计入十进制发布预算，旧版继续各自原读取语义。</zh-CN><en>The new representation counts its own inventory and index in the decimal publication budget, while existing formats retain their reading semantics.</en></lang>
  if (report.format === "hia-official-site-composition-report@0.3.0") assert(copiedBytes + Buffer.byteLength(reportText) + Buffer.byteLength(indexText) <= 1_000_000_000, "Complete official site exceeds publication budget.");
  // <lang lang="zh-CN">旧根与旧机器索引之外，每个旧文件必须与保留深链对应。分站模式从独立目录读取实际字节。</lang><lang lang="en">Every legacy file beyond the old root and index must match a retained deep link. Split mode reads the actual independent directory.</lang>
  const legacyFiles = await actualFiles(referenceRoot);
  for (const file of legacyFiles) {
    safeFile(file);
    if (["index.html", "versions.json"].includes(file)) continue;
    const preserved = hashes.get(file);
    assert(preserved?.kind === "preserved-deep-link", "A legacy deep link was lost or changed.");
    if (sibling) {
      const legacyFile = path.join(referenceRoot, file);
      const stats = await lstat(legacyFile);
      assert(stats.isFile() && stats.nlink === 1 && stats.size === preserved.bytes, "A legacy artifact file has an unexpected size or type.");
      assert(createHash("sha256").update(await readFile(legacyFile)).digest("hex") === preserved.digest, "A legacy artifact file has an unexpected digest.");
    } else {
      assert(hashes.get("legacy-reference/" + file)?.digest === preserved.digest, "A legacy deep link was lost or changed.");
    }
  }
  const originalFiles = legacyFiles.length;
  assert(originalFiles === report.preservation?.originalFiles && report.preservation?.preservedDeepLinks === originalFiles - 2 && [...hashes.values()].filter(entry => entry.kind === "preserved-deep-link").length === originalFiles - 2, "Legacy preservation counts disagree.");
  const legacyIndex = path.join(legacyRoot, "versions.json");
  assert((await lstat(legacyIndex)).size <= 32 * 1024 ** 2, "Legacy index exceeds read budget.");
  const oldText = await readFile(legacyIndex, "utf8");
  if (sibling) {
    const legacyHome = path.join(legacyRoot, "index.html");
    assert((await lstat(legacyHome)).size <= 32 * 1024 ** 2, "Legacy root metadata exceeds read budget.");
    const body = await readFile(legacyHome);
    assertPublicText(body.toString("utf8"));
    assert(createHash("sha256").update(body).digest("hex") === report.legacyRootSha256, "Legacy home bytes changed.");
  }
  assertPublicText(oldText);
  readLegacyReferenceIndex(oldText);
  const legacyManifest = JSON.parse(await readFile(path.join(legacyRoot, "reference-pages.json"), "utf8"));
  assert(legacyManifest.privacy?.sourcesContentPolicy === "none" && ["none", "public-whitelisted-excerpt"].includes(legacyManifest.privacy.sourcePreviewPolicy), "Composed compatibility policy drifted.");
  assert((await lstat(path.join(referenceRoot,"reference-pages.json"))).size<=32*1024**2,"Reference metadata exceeds read budget.");
  const referenceManifest=JSON.parse(await readFile(path.join(referenceRoot,"reference-pages.json"),"utf8"));
  assert(referenceManifest.contract===report.sourceIdentity?.contract && referenceManifest.contractVersion===report.sourceIdentity.contractVersion && referenceManifest.privacy?.status==="pass" && referenceManifest.privacy.sourcesContentPolicy==="none" && report.privacy.sourcesContentPolicy==="none" && report.privacy.sourcePreviewPolicy===referenceManifest.privacy.sourcePreviewPolicy,"Composed source policy drifted.");
  assert(createHash("sha256").update(oldText).digest("hex") === report.legacyIndexSha256, "Legacy index bytes changed.");
  assert(hashes.get("index.html")?.kind === "website" && (sibling || hashes.get("legacy-reference/index.html")?.kind === "legacy-copy"), "Website root did not replace the reference root explicitly.");
  for (const target of [...Object.values(index.website.locales), ...Object.values(index.documentation.current.locales), ...index.documentation.archives.flatMap(entry => Object.values(entry.locales))]) assert(actual.has(target + "index.html"), "Version index points to missing content.");
  const schema = JSON.parse(await readFile(path.join(output, `site/contracts/site-version-index-${index.contractVersion}.schema.json`), "utf8"));
  assert(schema.$id === index.$schema && schema.properties.contract.const === index.contract && schema.properties.contractVersion.const === index.contractVersion, "Site schema identity disagrees.");
  return { files: actual.size, copiedBytes, legacyFiles: originalFiles, preservedDeepLinks: originalFiles - 2, systemStatus: index.documentation.current.status };
}

// <lang lang="zh-CN">分站验收通过显式目录读取两个本地工件。</lang><lang lang="en">Split-mode verification reads two artifacts from explicit local directories.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length%2===0 && args.length<=6,"Use --out, --legacy and optional --reference.");
  const options={};
  for (let index=0;index<args.length;index+=2) {
    assert(["--out","--legacy","--reference"].includes(args[index]) && !Object.hasOwn(options,args[index]),"Unknown or duplicate checking option.");
    options[args[index]]=args[index+1];
  }
  const owner = fileURLToPath(new URL("../", import.meta.url));
  console.log(JSON.stringify(await checkOfficialSite(options["--out"] ? path.resolve(owner,options["--out"]) : undefined,options["--legacy"] ? path.resolve(owner,options["--legacy"]) : undefined,options["--reference"] ? path.resolve(owner,options["--reference"]) : undefined)));
}
