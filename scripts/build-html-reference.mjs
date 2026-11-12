/** @file @lang zh-CN 从当前源码正常生成HTML八包API及原资源站。 @lang en Build the eight HTML tool packages and original resources from current sources. */
import assert from "node:assert/strict";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {buildJavaScriptPackageReference} from "./build-javascript-reference.mjs";
import {loadHtmlReferenceInputs, createHtmlReferenceNavigation} from "./html-reference-inputs.mjs";

/**
 * @lang zh-CN 选择已确认HTML清单，复用正常原生/资源装配，两个独立bin按命令账本处理。
 * @lang en Select confirmed HTML inputs and reuse normal native/resource assembly, leaving the two standalone bins to their command inventory.
 * @param {object} [options] - workspaceRoot为真实源容器，out限主仓dist；默认dist/html-reference-publication。 workspaceRoot is the real source container and out stays inside main dist, defaulting to dist/html-reference-publication.
 * @returns {Promise<object>} 完整双语内容、容量与固定源提交。 Complete bilingual contents, size and pinned source commit.
 * @throws {Error} 来源、字段、映射、授权、预算或正常生产失败。 Failed source, field, mapping, authorization, budget or production checks.
 */
export async function buildHtmlReference(options = {}) {
  return buildJavaScriptPackageReference({out: "dist/html-reference-publication", ...options}, {
    registry: loadHtmlReferenceInputs(), registryPath: "reference/html-reference-inputs.json", apiSiteId: "html-api",
    resourceOwner: "hia-htmdoc", createNavigation: createHtmlReferenceNavigation, includeCommandSources: false
  });
}

// <lang><zh-CN>CLI只接受明确的容器与自有输出，不加载任意脚本或私有输入。</zh-CN><en>The CLI accepts only the explicit container and owned output, loading no arbitrary scripts or private inputs.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = {"--workspace-root": "workspaceRoot", "--out": "out"}[process.argv[index]];
    assert(key && process.argv[index + 1] && !Object.hasOwn(options, key));
    options[key] = process.argv[index + 1];
  }
  console.log(JSON.stringify(await buildHtmlReference(options)));
}
