/** @file @lang zh-CN 为公开参考构建暂存唯一获准的自有源码文件，配置复用既有来源契约。 @lang en Stages the sole authorized first-party source file for public reference builds using the existing source configuration contract. */
import assert from 'node:assert/strict';
import {constants, copyFileSync, mkdirSync, realpathSync, writeFileSync} from 'node:fs';
import path from 'node:path';

/**
 * @lang zh-CN 创建单文件公开镜像及相对配置；失败可能留下部分暂存内容，由调用方按runtime生命周期清理。
 * @lang en Creates a single-file public mirror and relative config; failures may leave partial staging for caller-managed runtime cleanup.
 * @param {string} mainRepoRoot <lang><zh-CN>自有公开主仓根，固定样本须实际位于其中。</zh-CN><en>Owning public repository root containing the actual fixed sample.</en></lang>
 * @param {string} runtimeRoot <lang><zh-CN>已存在且位于主仓内的独占运行目录。</zh-CN><en>Existing exclusive runtime directory inside the repository.</en></lang>
 * @returns {string} <lang><zh-CN>新配置的绝对路径，供CLI读取；不进入公开产物。</zh-CN><en>Absolute path of the new CLI config, excluded from public artifacts.</en></lang>
 * @throws {Error} <lang><zh-CN>越根、来源缺失、既有暂存或文件操作失败时抛错。</zh-CN><en>Throws for escaping roots, missing sources, existing staging or filesystem failures.</en></lang>
 */
export function preparePublicReferenceSourceConfig(mainRepoRoot, runtimeRoot) {
  // <lang><zh-CN>先核实际路径，链接不能把唯一公开文件或写入目录导向主仓之外。</zh-CN><en>Check real paths first so links cannot redirect the public file or staging writes outside the owner.</en></lang>
  const realMain = realpathSync(mainRepoRoot);
  const sourcePath = 'reference/samples/dotnet/Envelope.cs';
  const realSource = realpathSync(path.join(realMain, sourcePath));
  const sourceRelative = path.relative(realMain, realSource);
  assert(sourceRelative && sourceRelative !== '..' && !sourceRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(sourceRelative), 'Public sample source escapes its owner.');
  const realRuntime = realpathSync(runtimeRoot);
  const runtimeRelative = path.relative(realMain, realRuntime);
  assert(runtimeRelative && runtimeRelative !== '..' && !runtimeRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(runtimeRelative), 'Public source runtime escapes its owner.');

  // <lang><zh-CN>独占新目录仅含固定相对路径的一份副本，配置不能读取主仓或卫星仓的其它文件。</zh-CN><en>Create an exclusive directory with one copy at its fixed relative path, bounding config reads to that mirror.</en></lang>
  const sourceRoot = path.join(realRuntime, 'source-root');
  mkdirSync(sourceRoot);
  const destination = path.join(sourceRoot, sourcePath);
  mkdirSync(path.dirname(destination), {recursive: true});
  copyFileSync(realSource, destination, constants.COPYFILE_EXCL);

  // <lang><zh-CN>相对localRoot按配置目录解析；400行沿用原默认值，暂存和配置均随runtime清理。</zh-CN><en>Resolve relative localRoot from the config directory, retaining the 400-line default and runtime-scoped cleanup.</en></lang>
  const configPath = path.join(realRuntime, 'source.config.json');
  const config = {
    schemaVersion: '0.1.0',
    docs: {
      source: {
        presentation: 'fetch',
        publicAssetPolicy: 'explicit-public',
        localRoot: 'source-root',
        maxLines: 400
      }
    }
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
  return configPath;
}
