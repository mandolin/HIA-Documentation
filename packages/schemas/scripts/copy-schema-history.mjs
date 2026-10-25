/**
 * @file
 * @lang zh-CN 编译后按原字节复制已校验的历史schema，避免TypeScript格式化破坏固定canonical身份。
 * @lang en Copies validated historical schemas byte-for-byte after compilation, preventing TypeScript formatting from breaking fixed canonical identities.
 */
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readHistoricalSchemas } from "../../../scripts/lib/schema-history.mjs";

/**
 * @lang zh-CN 先校验全部源快照，再复制原字节；不删除目录、不更新预期摘要。
 * @lang en Validates every source snapshot before copying original bytes, without deleting directories or updating expected digests.
 * @param {string} packageRoot <lang><zh-CN>调用方拥有的schema包根目录；输出固定为其dist/history。</zh-CN><en>Caller-owned schema package root; output is fixed to its dist/history.</en></lang>
 * @returns {Promise<number>} <lang><zh-CN>复制的快照数，不含索引。</zh-CN><en>Number of copied snapshots, excluding the index.</en></lang>
 * @throws {Error} <lang><zh-CN>任一快照无效或IO失败时抛出；IO不提供磁盘事务保证。</zh-CN><en>Throws on invalid snapshots or I/O errors; I/O provides no disk-transaction guarantee.</en></lang>
 */
export async function copySchemaHistory(packageRoot) {
  // <lang><zh-CN>固定输入/输出边界由显式包根派生，历史索引中的文件名由共用validator严格核验。</zh-CN><en>Fixed input/output boundaries derive from the explicit package root; the shared validator strictly checks indexed filenames.</en></lang>
  const source = path.resolve(packageRoot, "src/history");
  const destination = path.resolve(packageRoot, "dist/history");
  const snapshots = await readHistoricalSchemas(source, "https://mandolin.github.io/HIA-Documentation/schemas/");
  await mkdir(destination, { recursive: true });
  for (const { entry } of snapshots) await copyFile(path.join(source, entry.fileName), path.join(destination, entry.fileName));
  await copyFile(path.join(source, "index.json"), path.join(destination, "index.json"));
  return snapshots.length;
}

// <lang><zh-CN>直接运行才写包的固定dist，测试导入不会触发生产目录写入。</zh-CN><en>Only direct execution writes the fixed package dist; test imports never trigger production-directory writes.</en></lang>
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  console.log(`Preserved ${await copySchemaHistory(packageRoot)} historical schema snapshots byte-for-byte.`);
}
