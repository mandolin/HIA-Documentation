/**
 * @file
 * @lang zh-CN 为公开参考暂存明确获准的自有文件，并校验同一官网事实源生成的站点导航。
 * @lang en Stages explicitly approved first-party reference files and validates site navigation from the shared website facts.
 */
import assert from 'node:assert/strict';
import {constants, copyFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {readJsonResourceBytes} from './lib/json-resource-audit.mjs';
import {loadResourceReferencePartitions} from './resource-reference-partitions.mjs';
import {createGeneratedSiteNavigation} from '../site/src/lib/generated-navigation.mjs';
import {assertPublicText} from './check-official-web.mjs';

/**
 * @lang zh-CN 正常公开参考构建默认采用官网导航，显式输入沿既有限长、契约及公开文本检查。
 * @lang en Adopts website navigation for normal public reference builds, retaining existing size, contract and public-text checks for explicit input.
 * @param {string} [inputPath] <lang><zh-CN>可选导航JSON文件；省略时从官网路由及真实版本生成。</zh-CN><en>Optional navigation JSON file, generated from website routes and actual versions when omitted.</en></lang>
 * @returns {Promise<import('../packages/renderer-html/src/site-navigation.js').DocumentationSiteNavigation>} <lang><zh-CN>通过校验的独立导航数据，不携带文件读取授权。</zh-CN><en>Validated independent navigation data without file-read authority.</en></lang>
 * @throws {Error} <lang><zh-CN>文件不可读、超过512KiB、JSON/契约错误或包含私有文本时失败，发生在生产写出前。</zh-CN><en>Fails before production writes for unreadable files, more than 512 KiB, invalid JSON/contracts or private text.</en></lang>
 */
export async function preparePublicReferenceSiteNavigation(inputPath) {
  if (inputPath) assert(statSync(inputPath).size <= 512 * 1024, 'Site navigation exceeds the CLI read budget.');
  // <lang><zh-CN>只在调用时加载已编译校验器，保留纯定义检查不依赖构建的入口。</zh-CN><en>Load the compiled validator only when called so definition-only checks retain their build-independent entry point.</en></lang>
  const {assertDocumentationSiteNavigation} = await import('../packages/renderer-html/dist/site-navigation.js');
  // <lang><zh-CN>显式文件和默认官网数据共用同一校验链，防止正常发布遗漏增强。</zh-CN><en>Explicit files and default website data share the same checks, preventing normal publication from omitting navigation.</en></lang>
  const navigation = inputPath ? JSON.parse(readFileSync(inputPath, 'utf8')) : createGeneratedSiteNavigation();
  assertDocumentationSiteNavigation(navigation);
  assertPublicText(JSON.stringify(navigation));
  return navigation;
}

/**
 * @lang zh-CN 已逐文件审阅的两个公开JSON导出；其它SDK源码不在本授权范围。
 * @lang en Two individually reviewed public JSON exports; other SDK source files are outside this authorization.
 */
export const PUBLIC_REFERENCE_JSON_RESOURCE_PATHS=Object.freeze([
  'packages/plugin-sdk/dist/plain-data-initialization.schema.json',
  'packages/plugin-sdk/dist/artifact-derivation-evidence.schema.json'
]);

/** @lang zh-CN 旧SDK范围与已确认资源分区清单共同给出精确公开审批，实际镜像仍由每次显式选择限定。 @lang en Legacy SDK scope and the confirmed partition registry define exact publication approval; each mirror remains bounded by explicit selection. */
export const APPROVED_PUBLIC_REFERENCE_JSON_RESOURCE_PATHS=Object.freeze([
  ...PUBLIC_REFERENCE_JSON_RESOURCE_PATHS,
  ...loadResourceReferencePartitions().partitions.flatMap(part=>part.exports.map(entry=>entry.source))
]);

/**
 * @lang zh-CN 创建明确文件清单的公开镜像及相对配置；失败可能留下部分暂存内容，由调用方按runtime生命周期清理。
 * @lang en Creates a public mirror from explicit files and relative config; failures may leave partial staging for caller-managed runtime cleanup.
 * @param {string} mainRepoRoot <lang><zh-CN>自有公开主仓根，固定样本须实际位于其中。</zh-CN><en>Owning public repository root containing the actual fixed sample.</en></lang>
 * @param {string} runtimeRoot <lang><zh-CN>已存在且位于主仓内的独占运行目录。</zh-CN><en>Existing exclusive runtime directory inside the repository.</en></lang>
 * @param {string[]} [resourceSources] <lang><zh-CN>默认空，仅可选择旧SDK范围及分区清单已审核的JSON资源。</zh-CN><en>Defaults to empty and selects only JSON resources approved by the legacy SDK scope and partition registry.</en></lang>
 * @param {boolean} [includeDotNetSample=true] <lang><zh-CN>是否加入原有C#样本，独立资源站可显式关闭。</zh-CN><en>Whether to include the existing C# sample; resource-only sites can explicitly omit it.</en></lang>
 * @returns {string} <lang><zh-CN>新配置的绝对路径，供CLI读取；不进入公开产物。</zh-CN><en>Absolute path of the new CLI config, excluded from public artifacts.</en></lang>
 * @throws {Error} <lang><zh-CN>越根、来源缺失、既有暂存或文件操作失败时抛错。</zh-CN><en>Throws for escaping roots, missing sources, existing staging or filesystem failures.</en></lang>
 */
export function preparePublicReferenceSourceConfig(mainRepoRoot, runtimeRoot, resourceSources = [], includeDotNetSample = true) {
  assert(Array.isArray(resourceSources) && new Set(resourceSources).size===resourceSources.length && resourceSources.every(source=>APPROVED_PUBLIC_REFERENCE_JSON_RESOURCE_PATHS.includes(source)), 'Public JSON source selection is invalid.');
  assert(typeof includeDotNetSample==='boolean','Public sample selection must be explicit.');
  // <lang><zh-CN>先核运行根，链接不能把读取或暂存导向主仓之外。</zh-CN><en>Check the runtime root so links cannot redirect reads or staging outside the owner.</en></lang>
  const realMain = realpathSync(mainRepoRoot);
  // <lang><zh-CN>选中样本时先验证其物理边界，拒绝重定向的过程不创建镜像。</zh-CN><en>Validate a selected sample's physical boundary before creating a mirror so rejected redirections leave no mirror.</en></lang>
  const sourcePath = 'reference/samples/dotnet/Envelope.cs';
  const realSource = includeDotNetSample ? realpathSync(path.join(realMain, sourcePath)) : undefined;
  if(realSource) {
    const sourceRelative = path.relative(realMain, realSource);
    assert(sourceRelative && sourceRelative !== '..' && !sourceRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(sourceRelative), 'Public sample source escapes its owner.');
  }
  const realRuntime = realpathSync(runtimeRoot);
  const runtimeRelative = path.relative(realMain, realRuntime);
  assert(runtimeRelative && runtimeRelative !== '..' && !runtimeRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(runtimeRelative), 'Public source runtime escapes its owner.');

  // <lang><zh-CN>独占镜像仅放本次已选择的来源，配置读取范围严格限于该镜像。</zh-CN><en>The exclusive mirror contains only selected sources and bounds all configured reads.</en></lang>
  const sourceRoot = path.join(realRuntime, 'source-root');
  mkdirSync(sourceRoot);
  if(realSource) {
    // <lang><zh-CN>默认调用保留固定C#样本，资源站显式关闭时不读取或复制此文件。</zh-CN><en>Default calls retain the fixed C# sample; resource-only calls omit its read and copy.</en></lang>
    const destination = path.join(sourceRoot, sourcePath);
    mkdirSync(path.dirname(destination), {recursive: true});
    copyFileSync(realSource, destination, constants.COPYFILE_EXCL);
  }

  // <lang><zh-CN>镜像仅含显式资源的实际发行字节，源守卫拒绝链接/越根；目标位于本次新建镜像中。</zh-CN><en>The mirror holds actual distribution bytes only for explicit resources; source guards reject links/escapes, and destinations belong to this fresh mirror.</en></lang>
  for(const resource of resourceSources) {
    const bytes=readJsonResourceBytes(realMain,resource);
    const target=path.join(sourceRoot,resource);
    mkdirSync(path.dirname(target),{recursive:true});
    writeFileSync(target,bytes,{flag:'wx'});
  }

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
 * @param {string} sourceConfigPath <lang><zh-CN>本次构建刚生成的明确文件来源配置绝对路径。</zh-CN><en>Absolute explicit-file source-config path just produced by this build.</en></lang>
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
