/** @file @lang zh-CN 读取安装包根坐标的JSDoc配置侧车并强制B/A/字节核验。 @lang en Reads package-root JSDoc config sidecars and requires B/A/byte verification. */
import { createHash } from "node:crypto";
import { readJsonResourceBytes } from "./json-resource-audit.mjs";
import { verifyPlainDataProduction } from "./plain-data-production-verification.mjs";

/** @lang zh-CN 配置1.0.0对应的独立证据draft子路径。 @lang en Independent draft-evidence subpath corresponding to config 1.0.0. */
export const JSDOC_CONFIG_EVIDENCE_PATH="evidence/hia-jsdoc-config-1.0.0.derivation-evidence-0.1.0-draft.json";
/**
 * @lang zh-CN 从明确包根读取必需侧车，验证实际源/输出字节和独立定义；失败不退回静态猜测。
 * @lang en Reads required sidecars from an explicit package root, verifying actual source/output bytes and independent definitions without falling back to static guesses on failure.
 * @param {string} packageRoot <lang><zh-CN>实际安装或源码包根。</zh-CN><en>Actual installed or source package root.</en></lang>
 * @returns {object} <lang><zh-CN>核验事实和包内侧车摘要，或固定未核原因。</zh-CN><en>Verification facts and package-sidecar digest, or a fixed unverified reason.</en></lang>
 */
export function readJsdocConfigEvidence(packageRoot) {
  try {
    const bytes=readJsonResourceBytes(packageRoot,JSDOC_CONFIG_EVIDENCE_PATH);
    const evidence=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    const schemaPath="schemas/hia-jsdoc-config-1.0.0.schema.json";
    const artifact=readJsonResourceBytes(packageRoot,schemaPath);
    const outputs=evidence.resources?.filter(resource=>resource.kind==="artifact");
    if(outputs?.length!==1 || outputs[0].path!==schemaPath)throw new Error();
    const verification=verifyPlainDataProduction(packageRoot,"src/schema.mjs","HIA_JSDOC_CONFIG_JSON_SCHEMA",evidence,artifact);
    if(verification.status!=="verified")throw new Error();
    return {status:"verified",path:JSDOC_CONFIG_EVIDENCE_PATH,sha256:createHash("sha256").update(bytes).digest("hex"),verification};
  } catch {return {status:"unverified",reason:"required-jsdoc-production-evidence"};}
}
