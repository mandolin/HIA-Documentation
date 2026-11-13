/** @file @lang zh-CN 从当前源码正常生成DotNetDoc六包API及原资源站。 @lang en Build the six DotNetDoc tool packages and original resources from current sources. */
import assert from "node:assert/strict";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {buildJavaScriptPackageReference} from "./build-javascript-reference.mjs";
import {loadDotNetReferenceInputs, createDotNetReferenceNavigation} from "./dotnet-reference-inputs.mjs";

/**
 * @lang zh-CN 选择已确认DotNetDoc清单，正常装配原生/资源及保留别名关系的两个命令入口。
 * @lang en Select confirmed DotNetDoc inputs and assemble native APIs, resources and both command entries retaining their alias relationship.
 * @param {object} [options] - workspaceRoot为真实源容器，out限主仓dist；默认dist/dotnet-reference-publication。 workspaceRoot is the real source container and out stays inside main dist, defaulting to dist/dotnet-reference-publication.
 * @returns {Promise<object>} 完整双语内容、容量与固定源提交。 Complete bilingual contents, size and pinned source commit.
 * @throws {Error} 来源、字段、映射、授权、预算或正常生产失败。 Failed source, field, mapping, authorization, budget or production checks.
 */
export async function buildDotNetReference(options = {}) {
  return buildJavaScriptPackageReference({out: "dist/dotnet-reference-publication", ...options}, {
    registry: loadDotNetReferenceInputs(), registryPath: "reference/dotnet-reference-inputs.json", apiSiteId: "dotnet-api",
    resourceOwner: "hia-dotnetdoc", createNavigation: createDotNetReferenceNavigation, includeCommandSources: false
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
  console.log(JSON.stringify(await buildDotNetReference(options)));
}
