/**
 * @file
 * @lang zh-CN 在旧参考旁附加已确认官网深链，保留旧根入口和机器索引。
 * @lang en Append confirmed website deep links beside existing references, preserving the reference root and machine index.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkWebsite } from "./check-official-web.mjs";

const owner = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));

/**
 * @lang zh-CN 枚举普通文件并拒绝链接，只处理已选择的工件目录。
 * @lang en Enumerate ordinary files and reject links within the selected artifact directory.
 * @param {string} root - 已选择目录。 Selected directory.
 * @param {string} [prefix] - 工件相对前缀。 Artifact-relative prefix.
 * @returns {string[]} 普通相对路径。 Ordinary relative paths.
 */
function filesIn(root, prefix = "") {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    const state = fs.lstatSync(path.join(root, relative));
    assert(!state.isSymbolicLink(), "Artifact links are forbidden.");
    if (state.isDirectory()) return filesIn(root, relative);
    assert(state.isFile() && state.nlink === 1, "Expected ordinary artifact files.");
    return [relative];
  });
}

/**
 * @lang zh-CN 附加已检查的非根页面，预检所有冲突，重试可接受完全相同的已复制文件。
 * @lang en Append checked non-root pages after preflighting every collision, accepting identical copied files on retry.
 * @param {string} [reference="dist/reference-pages"] - 已生成参考工件。 Generated reference artifact.
 * @param {string} [website="dist/official-web-preview"] - 已生成官网。 Generated website.
 * @returns {Promise<object>} 新增文件数及最终容量。 Added-file count and final capacity.
 * @throws {Error} 目标越界、冲突、隐私或容量失败。 Escaping paths, collisions, privacy or capacity failures.
 */
export async function appendOfficialWeb(reference = "dist/reference-pages", website = "dist/official-web-preview") {
  const target = fs.realpathSync(path.resolve(owner, reference));
  const source = fs.realpathSync(path.resolve(owner, website));
  // <lang zh-CN>两输入都属于主仓dist且互不包含，复制范围固定为已确认官网路径。</lang><lang en>Both inputs belong to the owner's dist and are disjoint; copying is restricted to confirmed website paths.</lang>
  for (const directory of [target, source]) {
    const relative = path.relative(path.join(owner, "dist"), directory);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Artifact must be an owned dist child.");
  }
  assert(!target.startsWith(source + path.sep) && !source.startsWith(target + path.sep) && target !== source, "Artifact inputs overlap.");
  await checkWebsite(source, target);
  const original = filesIn(target);
  const protectedFiles = new Map(["index.html", "versions.json"].map(name => [name, fs.readFileSync(path.join(target, name))]));
  const additions = filesIn(source).filter(name => name !== "index.html");
  let addedBytes = 0;
  let addedFiles = 0;
  for (const name of additions) {
    assert(/^(?:docs\/|site\/|_astro\/|documentation-site-navigation\.json$|favicon\.svg$)/.test(name), "Unexpected website output path.");
    const destination = path.join(target, name);
    // <lang zh-CN>既有父目录已由全树枚举排除链接；冲突在写入任何文件前处理。</lang><lang en>The full target traversal excludes linked parents; handle collisions before writing any file.</lang>
    if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(fs.readFileSync(path.join(source, name))), "Website path conflicts with an existing artifact.");
    else { addedFiles += 1; addedBytes += fs.statSync(path.join(source, name)).size; }
  }
  const totalBytes = original.reduce((sum, name) => sum + fs.statSync(path.join(target, name)).size, 0) + addedBytes;
  assert(original.length + addedFiles <= 100000 && totalBytes <= 1_000_000_000, "Appended website exceeds its publication budget.");
  for (const name of additions) {
    const destination = path.join(target, name);
    if (fs.existsSync(destination)) continue;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(source, name), destination, fs.constants.COPYFILE_EXCL);
  }
  for (const [name, body] of protectedFiles) assert(fs.readFileSync(path.join(target, name)).equals(body), "Original root or index changed.");
  return { addedFiles, totalFiles: original.length + addedFiles, totalBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await appendOfficialWeb(...process.argv.slice(2))));
}
