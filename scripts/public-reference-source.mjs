/** @file @lang zh-CN 为公开参考构建暂存唯一获准的自有源码文件，配置复用既有来源契约。 @lang en Stages the sole authorized first-party source file for public reference builds using the existing source configuration contract. */
import assert from 'node:assert/strict';
import {constants, copyFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
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

/**
 * @lang zh-CN 在同一独占目录派生本站每语言配置，复用既有信息架构、UI语言及主题能力，来源许可精确保留。
 * @lang en Derives this site's per-locale config inside the same exclusive directory using existing IA, UI-language and theme capabilities, preserving source authorization exactly.
 * @param {string} sourceConfigPath <lang><zh-CN>本次构建刚生成的单文件来源配置绝对路径。</zh-CN><en>Absolute source-config path just produced by this build.</en></lang>
 * @param {'zh-CN'|'en'} locale <lang><zh-CN>显式界面语言，与本次参考正文目录对应。</zh-CN><en>Explicit UI language matching this reference content directory.</en></lang>
 * @returns {string} <lang><zh-CN>新配置绝对路径，与来源镜像一同由调用方清理。</zh-CN><en>Absolute derived-config path, cleaned with the source mirror by the caller.</en></lang>
 * @throws {Error} <lang><zh-CN>不支持的语言、已有文件、来源JSON或文件操作失败时拒绝；不会覆盖原文件。</zh-CN><en>Rejects unsupported locales, existing files, invalid source JSON or filesystem failures without overwriting originals.</en></lang>
 */
export function preparePublicReferenceLocaleConfig(sourceConfigPath, locale) {
  assert(locale === 'zh-CN' || locale === 'en', 'Unsupported public reference UI locale.');
  // <lang><zh-CN>相同目录保持原相对localRoot的解释，源配置来自本次受控构建。</zh-CN><en>The shared directory preserves relative localRoot resolution; the input comes from this controlled build.</en></lang>
  const sourceConfig = JSON.parse(readFileSync(sourceConfigPath, 'utf8'));
  const configPath = path.join(path.dirname(sourceConfigPath), `portal-${locale}.config.json`);
  // <lang><zh-CN>只显式采用已支持的呈现选项，独立入口及惰性加载继续保留。</zh-CN><en>Adopt supported presentation options explicitly, retaining separate entries and lazy loading.</en></lang>
  const config = {
    ...sourceConfig,
    docs: {
      ...sourceConfig.docs,
      renderer: {
        projectLayout: 'split-site',
        informationArchitecture: {contentGrouping: 'entry', loadingStrategy: 'lazy', memberPlacement: 'separate'},
        uiLocale: locale
      },
      theme: {name: 'default', colors: {accent: '#0047AB'}}
    }
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
  return configPath;
}
