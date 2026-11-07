/**
 * @file
 * @lang zh-CN 读取卫星TypeScript独立schema目录，逐身份与摘要核验后供分发复制。
 * @lang en Reads the separate satellite TypeScript schema catalog, verifying identities and digests before distribution copying.
 */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";

/**
 * @lang zh-CN 只读核验五份明确身份的快照，不把卫星草案并入主owner默认目录。
 * @lang en Read-only validation of five explicit snapshots, keeping satellite drafts separate from the main-owner default catalog.
 * @param {string} directory <lang><zh-CN>schema包的src或dist根。</zh-CN><en>Schema package src or dist root.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>已核目录及原字节快照。</zh-CN><en>Validated catalog and original-byte snapshots.</en></lang>
 * @throws {Error} <lang><zh-CN>身份、路径、摘要或内容冲突。</zh-CN><en>Conflicting identity, path, digest or content.</en></lang>
 */
export async function readTsDocProjectSchemas(directory) {
  // <lang><zh-CN>五份身份为已有提取0.1、提取/桥接0.2及新增0.3，旧桥接未另造schema。</zh-CN><en>The five identities cover existing extraction 0.1, extraction/bridge 0.2 and new 0.3; no legacy bridge schema is invented.</en></lang>
  const catalogBytes=await fs.readFile(path.join(directory,"tsdoc-project-catalog.json"));
  const catalog=JSON.parse(catalogBytes);
  const identities=["hia-tsdoc-extraction-0.1.0-draft","hia-tsdoc-extraction-0.2.0-draft","hia-ts-jsdoc-bridge-0.2.0-draft","hia-tsdoc-extraction-0.3.0-draft","hia-ts-jsdoc-bridge-0.3.0-draft"];
  assert.equal(catalog.catalogVersion,"0.1.0-draft");
  assert.equal(catalog.publicBaseUrl,"https://mandolin.github.io/HIA-Documentation/schemas/");
  assert.deepEqual(catalog.schemas.map(entry=>entry.key),identities);
  const snapshots=[];
  for(const entry of catalog.schemas) {
    const filename=entry.key+".json";
    assert.equal(entry.path,"./tsdoc-project/"+filename);
    assert.equal(entry.schemaId,catalog.publicBaseUrl+filename);
    assert.equal(entry.publicUrl,entry.schemaId);
    assert.equal(entry.ownerPackage,"@hia-doc/tsdoc-spec");
    const file=path.join(directory,"tsdoc-project",filename);
    assert.equal(await fs.realpath(file),file);
    const state=await fs.lstat(file);
    assert(state.isFile()&&!state.isSymbolicLink()&&state.nlink===1&&state.size<1024*1024);
    const bytes=await fs.readFile(file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"),entry.sha256);
    const schema=JSON.parse(bytes);
    assert.equal(schema.$id,entry.schemaId);
    assert.equal(schema.properties.contractVersion.const,entry.contractVersion);
    assert.equal(entry.key,schema.properties.contract.const+"-"+entry.contractVersion);
    snapshots.push({entry,filename,bytes,schema});
  }
  return {catalog,catalogBytes,snapshots};
}
