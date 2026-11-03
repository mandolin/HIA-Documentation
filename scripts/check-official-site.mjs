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
 * @returns {Promise<object>} 无本机路径的统计。 Statistics without local paths.
 * @throws {Error} 清单、字节、路径、来源政策或索引目标不符。 Invalid inventory, bytes, paths, source policy, or index destinations.
 */
export async function checkOfficialSite(output = fileURLToPath(new URL("../dist/official-site-preview/", import.meta.url))) {
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
  assert(report.format === "hia-official-site-composition-report@0.1.0" && report.siteIndex === "versions.json" && report.legacyIndex === index.legacyReference.index, "Unexpected composition report.");
  assert(report.privacy?.status === "pass" && report.privacy.sourceAuthorityExpanded === false && report.privacy.policy === "public-brand-with-private-path-rejection@1.0.0", "Invalid composed privacy boundary.");
  assert(Array.isArray(report.files) && report.files.length > 0 && report.files.length <= 100000, "Invalid file inventory.");
  const actual = new Set(await actualFiles(output));
  assert(actual.size === report.files.length + 2 && actual.has("versions.json") && actual.has("official-site.json"), "Actual output inventory disagrees with its report.");
  const hashes = new Map();
  let copiedBytes = 0;
  for (const entry of report.files) {
    safeFile(entry.path);
    assert(actual.has(entry.path) && !hashes.has(entry.path), "Missing or duplicated artifact file.");
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && /^[a-f0-9]{64}$/.test(entry.sha256), "Invalid file digest metadata.");
    assert(["legacy-copy", "preserved-deep-link", "website", "site-schema"].includes(entry.kind), "Unknown inventory class.");
    // <lang lang="zh-CN">先核大小再读，不允许被篡改清单触发巨大文件分配。</lang><lang lang="en">Check size before reading so a tampered report cannot cause an enormous allocation.</lang>
    const size = (await lstat(path.join(output, entry.path))).size;
    assert(size === entry.bytes && size <= 32 * 1024 ** 2, "Artifact size or bounded-read limit disagrees.");
    const bytes = await readFile(path.join(output, entry.path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert(digest === entry.sha256, "Artifact byte digest mismatch.");
    assertPublicText(bytes.toString("utf8"));
    hashes.set(entry.path, { digest, kind: entry.kind });
    copiedBytes += bytes.length;
  }
  assert(copiedBytes === report.copiedBytes, "Copied byte total disagrees.");
  // <lang lang="zh-CN">每个兼容副本都必须与对应保留深链一致，旧根与旧机器索引是唯一明确替代项。</lang><lang lang="en">Each compatibility copy must match its retained deep link; the old root and machine index are the only intentional replacements.</lang>
  let originalFiles = 0;
  for (const [file, entry] of hashes) if (entry.kind === "legacy-copy") {
    assert(file.startsWith("legacy-reference/"), "Invalid compatibility namespace.");
    originalFiles++;
    const original = file.slice("legacy-reference/".length);
    if (!["index.html", "versions.json"].includes(original)) {
      assert(hashes.get(original)?.kind === "preserved-deep-link" && hashes.get(original).digest === entry.digest, "A legacy deep link was lost or changed.");
    }
  }
  assert(originalFiles === report.preservation?.originalFiles && report.preservation?.preservedDeepLinks === originalFiles - 2, "Legacy preservation counts disagree.");
  const oldText = await readFile(path.join(output, index.legacyReference.index), "utf8");
  readLegacyReferenceIndex(oldText);
  const legacyManifest = JSON.parse(await readFile(path.join(output, "legacy-reference/reference-pages.json"), "utf8"));
  assert(legacyManifest.privacy?.sourcesContentPolicy === "none" && ["none", "public-whitelisted-excerpt"].includes(legacyManifest.privacy.sourcePreviewPolicy) && report.privacy.sourcesContentPolicy === "none" && report.privacy.sourcePreviewPolicy === legacyManifest.privacy.sourcePreviewPolicy, "Composed source policy drifted.");
  assert(createHash("sha256").update(oldText).digest("hex") === report.legacyIndexSha256, "Legacy index bytes changed.");
  assert(hashes.get("index.html")?.kind === "website" && hashes.get("legacy-reference/index.html")?.kind === "legacy-copy", "Website root did not replace the reference root explicitly.");
  for (const target of [...Object.values(index.website.locales), ...Object.values(index.documentation.current.locales), ...index.documentation.archives.flatMap(entry => Object.values(entry.locales))]) assert(actual.has(target + "index.html"), "Version index points to missing content.");
  const schema = JSON.parse(await readFile(path.join(output, "site/contracts/site-version-index-1.0.0.schema.json"), "utf8"));
  assert(schema.$id === index.$schema && schema.properties.contract.const === index.contract && schema.properties.contractVersion.const === index.contractVersion, "Site schema identity disagrees.");
  return { files: actual.size, copiedBytes, legacyFiles: originalFiles, preservedDeepLinks: originalFiles - 2, systemStatus: index.documentation.current.status };
}

// <lang lang="zh-CN">CLI只接受显式输出目录，不读取账户或发布站点。</lang><lang lang="en">The CLI accepts an explicit output directory only, without reading accounts or publishing sites.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length === 0 || args.length === 2 && args[0] === "--out", "Only --out is accepted.");
  console.log(JSON.stringify(await checkOfficialSite(args[1] ? path.resolve(fileURLToPath(new URL("../", import.meta.url)), args[1]) : undefined)));
}
