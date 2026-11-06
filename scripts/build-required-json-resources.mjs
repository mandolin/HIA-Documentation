/**
 * @file
 * @lang zh-CN 显式必要包JSON资源的真实SDK生产及独立逐值验收，输出限于本仓dist。
 * @lang en Actual SDK production and independent per-value verification of explicit required-package JSON resources, writing only this repository's dist.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { auditRequiredJsonResources } from "./audit-required-json-resources.mjs";
import { verifyJsonResourceProjection } from "./lib/json-resource-projection.mjs";
import { assertPublicRootOmission } from "./lib/core-package-api.mjs";
import { jsonDocumentationProducer } from "../packages/jsondoc/dist/index.js";
import { runDocumentationProducer } from "../packages/plugin-sdk/dist/index.js";
import { validateHiaDocument } from "../packages/core/dist/index.js";
import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";

/**
 * @lang zh-CN 基于独立审核显式生成资源，逐文件核对完整值、来源及快照，资源语言由调用方声明。
 * @lang en Explicitly generates independently audited resources and verifies complete values, provenance and snapshots per file, with content locale declared by the caller.
 * @param {string} workspaceRoot <lang><zh-CN>本项目工作区容器。</zh-CN><en>This project's workspace container.</en></lang>
 * @param {string} locale <lang><zh-CN>实际正文语言，未分类资源可显式声明und。</zh-CN><en>Actual content locale; unclassified resources may explicitly use und.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>生成报告、输出位置、实际SDK工件/来源顺序和独立审核输入；后续语义及页面验收单列。</zh-CN><en>Production report, output location, actual SDK artifacts/source order and independent audit inputs; subsequent semantics and page acceptance remain separate.</en></lang>
 */
export async function buildRequiredJsonResources(workspaceRoot, locale) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const { report: audit } = auditRequiredJsonResources(workspaceRoot);
  const sources = [...new Set(audit.entries.map(entry => entry.source))];
  const output = fs.mkdtempSync(path.join(root, "dist/generated-json-resources-"));
  const result = await runDocumentationProducer(jsonDocumentationProducer, { workspaceRoot, outputDirectory: output, inputs: sources.map(source => ({ kind: "json-resource", path: source, locale })) });
  assert.equal(result.status, "success", JSON.stringify(result.diagnostics));
  assert.equal(result.artifacts.length, sources.length * 3);
  const rows = [];
  for (const expected of audit.entries) {
    // <lang><zh-CN>产物位置来自本次成功SDK结果，逐项核类型、原文摘要和独立TS范围。</zh-CN><en>Artifact locations come from this successful SDK result, checking types, original digests and independent TS ranges per item.</en></lang>
    const index = sources.indexOf(expected.source);
    const artifacts = result.artifacts.slice(index * 3, index * 3 + 3);
    const bytes = artifacts.map(artifact => fs.readFileSync(path.join(output, artifact.path)));
    const document = JSON.parse(bytes[0]);
    const map = JSON.parse(bytes[1]);
    assert.deepEqual(validateHiaDocument(document), []);
    const mapped = createDocSourceMapIndex(map);
    assert.equal(mapped.status, "available");
    assert.deepEqual(mapped.diagnostics, []);
    const verified = verifyJsonResourceProjection(expected, document, map, bytes[2]);
    rows.push({ package: expected.package, subpath: expected.subpath, source: expected.source, ...verified, hashes: bytes.map(value => createHash("sha256").update(value).digest("hex")) });
  }
  const report = { purpose: "required-json-resource-production", requiredPackages: audit.summary.requiredPackages, contentLocale: locale, producer: result.producer, resources: rows.length, sourceFiles: sources.length, artifacts: result.artifacts.length, values: rows.reduce((sum, row) => sum + row.values, 0), referenceOccurrences: rows.reduce((sum, row) => sum + row.referenceOccurrences, 0), rows, pending: ["schema-aware-reference-evaluation", "js-export-resource-association", "complete-content-language-review", "generated-page-design-and-interaction-acceptance"], coverageComplete: false, releaseProof: false };
  assertPublicRootOmission(report, workspaceRoot);
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  return { report, output: path.relative(root, output).replaceAll("\\", "/"), artifacts: result.artifacts, resourceAudit: audit, sourcePaths: sources };
}

// <lang><zh-CN>命令显式要求容器根及语言，不从本机环境推断资源语言。</zh-CN><en>The command explicitly requires the container root and locale, without inferring resource language from the machine environment.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length === 4 && args[0] === "--workspace-root" && args[2] === "--locale");
  const { report, output } = await buildRequiredJsonResources(path.resolve(args[1]), args[3]);
  console.log(JSON.stringify({ requiredPackages: report.requiredPackages, resources: report.resources, values: report.values, referenceOccurrences: report.referenceOccurrences, artifacts: report.artifacts, output, coverageComplete: false }));
}
