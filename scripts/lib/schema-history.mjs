/**
 * @file
 * @lang zh-CN 校验固定身份的历史 schema 原始字节；只读取指定分发目录，不联网、不写文件。
 * @lang en Validates historical schema bytes with fixed identities; reads only the supplied distribution directory without network access or writes.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * @lang zh-CN 读取历史索引及快照，拒绝路径越界、身份冲突、摘要漂移和版本错配。
 * @lang en Reads the history index and snapshots, rejecting escaping paths, duplicate identities, digest drift, and version mismatches.
 * @param {string} historyDir <lang><zh-CN>调用方显式指定的本地历史分发目录。</zh-CN><en>Explicit local history distribution directory.</en></lang>
 * @param {string} publicBaseUrl <lang><zh-CN>以斜杠结尾的受信任 canonical 命名空间。</zh-CN><en>Trusted canonical namespace ending with a slash.</en></lang>
 * @returns {Promise<Array<{entry: object, bytes: Buffer}>>} <lang><zh-CN>通过校验的索引记录与原始字节；不改变行尾或 JSON 格式。</zh-CN><en>Validated index records and original bytes, preserving line endings and JSON formatting.</en></lang>
 * @throws {Error} <lang><zh-CN>文件不可读、索引或快照无效时抛出，阻止分发。</zh-CN><en>Throws on unreadable files or invalid indexes or snapshots, preventing distribution.</en></lang>
 */
export async function readHistoricalSchemas(historyDir, publicBaseUrl) {
  // <lang><zh-CN>索引仅从调用方提供的目录读取；记录中的路径永远不作为任意文件定位器。</zh-CN><en>Read the index only from the supplied directory; record paths never act as arbitrary file locators.</en></lang>
  const index = JSON.parse(await readFile(path.join(historyDir, "index.json"), "utf8"));
  if (index.formatVersion !== "1.0.0" || !Array.isArray(index.schemas) || index.schemas.length === 0) {
    throw new Error("Invalid schema history index.");
  }
  // <lang><zh-CN>两组身份集合分别阻止 URL 与文件名重复，避免后写记录覆盖先前快照。</zh-CN><en>Separate identity sets reject duplicate URLs and filenames so later records cannot overwrite earlier snapshots.</en></lang>
  const ids = new Set();
  const fileNames = new Set();
  // <lang><zh-CN>只返回经过全部校验的字节；调用方应在清理或写入输出目录前等待此函数完成。</zh-CN><en>Return only fully validated bytes; callers should await this function before clearing or writing output directories.</en></lang>
  const snapshots = [];
  for (const entry of index.schemas) {
    // <lang><zh-CN>只允许无目录、无编码逃逸的 schema 文件名和规范 SHA-256，随后才能拼接本地路径。</zh-CN><en>Allow only schema filenames without directories or encoded escapes and canonical SHA-256 before joining local paths.</en></lang>
    if (!entry || typeof entry !== "object"
      || typeof entry.key !== "string" || !/^[a-z][a-z0-9-]*$/.test(entry.key)
      || typeof entry.contractVersion !== "string" || !entry.contractVersion
      || typeof entry.fileName !== "string" || !/^[a-z0-9][a-z0-9.-]*\.schema\.json$/.test(entry.fileName)
      || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)
      || entry.schemaId !== publicBaseUrl + entry.fileName
      || ids.has(entry.schemaId) || fileNames.has(entry.fileName)) {
      throw new Error("Invalid or duplicate schema history identity.");
    }
    ids.add(entry.schemaId);
    fileNames.add(entry.fileName);
    // <lang><zh-CN>摘要针对原始分发字节计算，不能通过重新序列化掩盖历史文件变化。</zh-CN><en>Hash original distribution bytes so reserialization cannot hide changes to a historical file.</en></lang>
    const bytes = await readFile(path.join(historyDir, entry.fileName));
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
      throw new Error(`Historical schema digest drifted: ${entry.fileName}`);
    }
    // <lang><zh-CN>文件内容必须与索引的 canonical 身份、方言和精确 wire 版本一致。</zh-CN><en>File content must match the index's canonical identity, dialect, and exact wire version.</en></lang>
    const schema = JSON.parse(bytes.toString("utf8"));
    const version = schema.properties?.schemaVersion?.const ?? schema.properties?.contractVersion?.const;
    if (schema.$id !== entry.schemaId || schema.$schema !== "https://json-schema.org/draft/2020-12/schema" || version !== entry.contractVersion) {
      throw new Error(`Historical schema identity drifted: ${entry.fileName}`);
    }
    snapshots.push({ entry, bytes });
  }
  return snapshots;
}
