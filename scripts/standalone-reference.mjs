/**
 * @file
 * @lang zh-CN 使用正常JSDoc及固定owner生成独立主题公开示例，复用已确认导航并核原生工件与来源。
 * @lang en Generates the public standalone example through normal JSDoc and pinned owners, reusing confirmed navigation and checking native artifacts and sources.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {assertPublicText} from './check-official-web.mjs';
import {assertDocumentationSiteNavigation} from '../packages/renderer-html/dist/site-navigation.js';

/**
 * @lang zh-CN 将已确认导航的当前版本目标限定为真实独立语言首页，手册及代码栏目继续沿原入口。
 * @lang en Targets the current version at actual standalone locale indexes while retaining existing manual and code-tab destinations.
 * @param {object} navigation <lang><zh-CN>官网已确认的导航数据。</zh-CN><en>Confirmed website navigation data.</en></lang>
 * @returns {object} <lang><zh-CN>独立复制的同契约数据。</zh-CN><en>Independent data copy for the same contract.</en></lang>
 */
export function createStandaloneSiteNavigation(navigation) {
  assertDocumentationSiteNavigation(navigation);
  const result = structuredClone(navigation);
  // <lang><zh-CN>原生语言页在同一次生成中确实存在，禁止按目录替换猜测对照页。</zh-CN><en>Native locale pages exist in the same generation, avoiding guessed directory substitutions.</en></lang>
  const targets = {'zh-CN':'/HIA-Documentation/jsdoc/index.zh-CN.html', en:'/HIA-Documentation/jsdoc/index.en.html'};
  result.documentationVersion.entries = result.documentationVersion.entries.map(entry => entry.version === result.documentationVersion.version ? {...entry, hrefByLocale:targets} : entry);
  result.localeTargets = targets;
  assertDocumentationSiteNavigation(result);
  return result;
}

/**
 * @lang zh-CN 遍历独占产物目录并拒绝链接文件，返回根相对路径。
 * @lang en Inventories an exclusive output directory, rejecting symbolic links and returning root-relative paths.
 * @param {string} root <lang><zh-CN>产物根。</zh-CN><en>Artifact root.</en></lang>
 * @param {string} [relative=''] <lang><zh-CN>当前相对目录。</zh-CN><en>Current relative directory.</en></lang>
 * @returns {string[]} <lang><zh-CN>排序后的实际文件路径。</zh-CN><en>Sorted actual file paths.</en></lang>
 */
function files(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), {withFileTypes:true}).flatMap(entry => {
    assert(!entry.isSymbolicLink(), 'Standalone artifact contains a symbolic link.');
    const name = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? files(root, name) : [name];
  }).sort();
}

/**
 * @lang zh-CN 核实际独立产物的契约、双语页、共享导航、原生链接、公开文本及获准源码摘要。
 * @lang en Checks actual standalone contracts, locale pages, shared navigation, native links, public text and admitted source digests.
 * @param {string} directory <lang><zh-CN>已生成独立目录。</zh-CN><en>Generated standalone directory.</en></lang>
 * @returns {{files:number,bytes:number,pages:number,sourceAssets:number}} <lang><zh-CN>实际容量及页面/源资产数量。</zh-CN><en>Actual capacity and page/source-asset counts.</en></lang>
 * @throws {Error} <lang><zh-CN>工件、来源或链接缺失/被更改，或出现私有文本。</zh-CN><en>Missing/changed artifacts, sources or links, or private text.</en></lang>
 */
export function checkStandaloneJsdocReference(directory) {
  const root = path.resolve(directory);
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const pageMap = read('hia-page-map.json');
  assert(pageMap.contract === 'jsdoc-theme-hia/page-map' && pageMap.contractVersion === '0.1.0' && pageMap.mode === 'multi-page', 'Standalone native page-map identity changed.');
  assert(pageMap.pages.length >= 2, 'Standalone module/class page coverage is missing.');
  const presentation = read('documentation-presentation-profile.json');
  assert(presentation.contract === 'documentation-presentation-profile' && presentation.contractVersion === '1.0.0', 'Standalone presentation identity changed.');
  assert.deepEqual(read('i18n-index.json').locales, ['zh-CN','en']);
  read('hia-integration.json');
  read('hia-metadata.json');
  const requiredPages = ['index.html','index.zh-CN.html','index.en.html', ...pageMap.pages.flatMap(page => [page.file, page.file.replace(/\.html$/u, '.zh-CN.html'), page.file.replace(/\.html$/u, '.en.html')])];
  for (const name of requiredPages) assert(fs.existsSync(path.join(root, name)), 'Standalone native locale page is missing.');
  for (const name of ['hia-site-navigation.css','hia-site-reading.js','hia-site-search.json']) assert(fs.existsSync(path.join(root, 'assets', name)), 'Standalone shared asset is missing.');
  // <lang><zh-CN>文本与路径逐文件校验，源码页保持无脚本，局部相对链接须指向同一产物内实际文件。</zh-CN><en>Check text and paths file by file, keeping source pages script-free and local relative links inside actual output files.</en></lang>
  const inventory = files(root);
  for (const name of inventory) {
    const content = fs.readFileSync(path.join(root, name), 'utf8');
    assertPublicText(content);
    if (name.endsWith('.html')) {
      assert(content.includes('data-hia-site-navigation'), 'Standalone page navigation is missing.');
      if (name.startsWith('sources/')) assert(!/<script\b/iu.test(content), 'Standalone source page contains script.');
      for (const match of content.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/gu)) {
        const target = match[1].split('#')[0].split('?')[0];
        if (target.startsWith('/') || /^[a-z][a-z\d+.-]*:/iu.test(target)) continue;
        const resolved = path.resolve(root, path.dirname(name), target);
        assert(resolved.startsWith(root+path.sep) && fs.existsSync(resolved), 'Standalone native relative link is missing.');
      }
    }
    if (name.startsWith('sources/') && name.endsWith('.txt')) {
      const digest = createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
      assert(path.basename(name, '.txt') === digest, 'Standalone source digest changed.');
    }
  }
  const index = fs.readFileSync(path.join(root, 'index.zh-CN.html'), 'utf8');
  assert(index.includes('ThemeRenderer') && index.includes('themeDemo'), 'Standalone real sample declarations are missing.');
  const sourceAssets = inventory.filter(name => name.startsWith('sources/') && name.endsWith('.txt')).length;
  assert(sourceAssets > 0 && inventory.some(name => name.startsWith('sources/') && name.endsWith('.html')), 'Standalone source readers are missing.');
  return {files:inventory.length, bytes:inventory.reduce((sum, name) => sum+fs.statSync(path.join(root, name)).size, 0), pages:pageMap.pages.length, sourceAssets};
}

/**
 * @lang zh-CN 从已安装的固定owner包及对应公开样本运行正常JSDoc，所有写入限定在主仓dist产物内。
 * @lang en Runs normal JSDoc from installed pinned owners and their matching public sample, confining writes to main-checkout dist artifacts.
 * @param {object} options <lang><zh-CN>主仓、来源集合、公开输出根和已校验导航。</zh-CN><en>Main checkout, source set, public output root and validated navigation.</en></lang>
 * @returns {object} <lang><zh-CN>已核容量及公开来源记录。</zh-CN><en>Checked capacity and public provenance record.</en></lang>
 * @throws {Error} <lang><zh-CN>来源/锁/输出边界不符，JSDoc失败或产物检查失败。</zh-CN><en>Provenance/lock/output mismatch, JSDoc failure or failed artifact checks.</en></lang>
 */
export function buildStandaloneJsdocReference({mainRepoRoot, sourcesRoot, outputRoot, navigation}) {
  const main = fs.realpathSync(mainRepoRoot);
  const output = path.resolve(outputRoot, 'jsdoc');
  assert(output.startsWith(path.join(main, 'dist')+path.sep) && !fs.existsSync(output), 'Standalone output boundary is invalid or already exists.');
  // <lang><zh-CN>固定主题样本从同一已提交owner读取；模板/插件来自它声明的实际归档安装。</zh-CN><en>Read the fixed sample from the matching committed theme owner, with template/plugin resolved from its declared archive installation.</en></lang>
  const umbrella = path.resolve(sourcesRoot, 'hia-jsdoc');
  const themeSource = path.resolve(sourcesRoot, 'jsdoc-theme-hia');
  const ownerRequire = createRequire(path.join(umbrella, 'package.json'));
  ownerRequire('./scripts/prepare-owner-packages.cjs').verifyOwnerLock(umbrella);
  const owners = JSON.parse(fs.readFileSync(path.join(umbrella, 'owner-sources.json'), 'utf8')).owners;
  const theme = owners.find(owner => owner.name === '@mandolin/jsdoc-theme-hia');
  const themeHead = execFileSync('git', ['-C', themeSource, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
  assert(theme?.commit === themeHead, 'Standalone source sample and pinned theme revision differ.');
  const sourcePath = 'examples/basic/src/demo.js';
  const source = path.join(themeSource, sourcePath);
  const committed = execFileSync('git', ['-C', themeSource, 'show', `${themeHead}:${sourcePath}`]);
  assert(committed.equals(fs.readFileSync(source)), 'Standalone source sample has uncommitted changes.');
  const template = path.dirname(ownerRequire.resolve('@mandolin/jsdoc-theme-hia/package.json'));
  const plugin = ownerRequire.resolve('@mandolin/jsdoc-plugin-hia-sys');
  // <lang><zh-CN>共享peer仅从当前已编译主仓解析，解析路径只作用于本次子进程。</zh-CN><en>Resolve the shared peer only from the compiled main checkout, scoping module search to this child process.</en></lang>
  const rendererRequire = createRequire(path.join(main, 'apps/cli/package.json'));
  assert(fs.realpathSync(rendererRequire.resolve('@hia-doc/renderer-html/site-chrome')) === fs.realpathSync(path.join(main, 'packages/renderer-html/dist/site-chrome.js')), 'Standalone renderer peer does not belong to this build.');
  const sourceUrl = `https://github.com/mandolin/jsdoc-theme-hia/blob/${themeHead}`;
  const config = {plugins:[plugin], source:{include:[source]}, opts:{template, destination:output, recurse:true, hia:{
    mode:'standalone', uiLocale:'zh-CN', siteNavigation:createStandaloneSiteNavigation(navigation),
    source:{basePath:themeSource, mode:'all', link:{enabled:true, rootUrl:sourceUrl, openMode:'same-tab'}, preview:{enabled:true, defaultExpanded:false}, references:{enabled:true, defaultExpanded:false}},
    i18n:{enabled:true, defaultLocale:'zh-CN', fallbackLocale:'en', locales:['zh-CN','en'], mode:'runtimeSwitch'},
    presentation:{pageMode:'multi-page', sourceMode:'fetch'},
    integration:{enabled:true, outputFile:path.join(output, 'hia-integration.json')}
  }}};
  const configPath = path.join(outputRoot, '.runtime/standalone-config.json');
  fs.mkdirSync(path.dirname(configPath), {recursive:true});
  fs.writeFileSync(configPath, JSON.stringify(config));
  execFileSync(process.execPath, [ownerRequire.resolve('jsdoc/jsdoc.js'), '-c', configPath], {
    cwd:main, stdio:'inherit', env:{...process.env, NODE_PATH:path.join(main, 'apps/cli/node_modules')}
  });
  const result = checkStandaloneJsdocReference(output);
  const publication = {purpose:'Standalone JSDoc theme example', source:{repository:'mandolin/jsdoc-theme-hia', commit:themeHead, path:sourcePath, sha256:createHash('sha256').update(committed).digest('hex')},
    owners:owners.map(owner => ({name:owner.name, version:owner.version, commit:owner.commit, integrity:owner.integrity})),
    renderer:{repository:'mandolin/HIA-Documentation', commit:execFileSync('git', ['-C', main, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim()},
    localePages:{'zh-CN':'index.zh-CN.html', en:'index.en.html'}, coverage:'The existing theme module/class example; package API references are published separately.', generatedPayload:result};
  fs.writeFileSync(path.join(output, 'publication.json'), JSON.stringify(publication, null, 2)+'\n');
  return publication;
}
