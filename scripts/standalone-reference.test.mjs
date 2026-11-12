/**
 * @file
 * @lang zh-CN 独立JSDoc公开入口的真实语言导航和产物拒绝边界回归。
 * @lang en Regressions for actual locale navigation and artifact rejection boundaries of the standalone JSDoc publication entry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGeneratedSiteNavigation} from '../site/src/lib/generated-navigation.mjs';
import {createStandaloneSiteNavigation, checkStandaloneJsdocReference} from './standalone-reference.mjs';

/**
 * @lang zh-CN 最小产物仅用于拒绝反例，真实CLI/部署另有完整验收。
 * @lang en Minimal artifacts serve rejection cases only; real CLI generation and deployment have separate full acceptance.
 * @param {object} t <lang><zh-CN>测试清理宿主。</zh-CN><en>Test cleanup host.</en></lang>
 * @returns {string} <lang><zh-CN>独占临时目录。</zh-CN><en>Exclusive temporary directory.</en></lang>
 */
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hia-standalone-reference-'));
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.mkdirSync(path.join(directory, 'assets'));
  fs.mkdirSync(path.join(directory, 'sources'));
  // <lang><zh-CN>只提供校验器声明要求的原生身份和真实相对文件关系。</zh-CN><en>Provide the native identities and actual relative file relationships required by the checker.</en></lang>
  fs.writeFileSync(path.join(directory, 'hia-page-map.json'), JSON.stringify({contract:'jsdoc-theme-hia/page-map',contractVersion:'0.1.0',mode:'multi-page',pages:[{file:'class.html'},{file:'function.html'}]}));
  fs.writeFileSync(path.join(directory, 'documentation-presentation-profile.json'), JSON.stringify({contract:'documentation-presentation-profile',contractVersion:'1.0.0'}));
  fs.writeFileSync(path.join(directory, 'hia-integration.json'), '{}');
  fs.writeFileSync(path.join(directory, 'hia-metadata.json'), '{}');
  fs.writeFileSync(path.join(directory, 'i18n-index.json'), JSON.stringify({locales:['zh-CN','en']}));
  for (const name of ['hia-site-navigation.css','hia-site-reading.js','hia-site-search.json']) fs.writeFileSync(path.join(directory, 'assets', name), '');
  for (const stem of ['index','class','function']) for (const locale of ['', '.zh-CN', '.en']) {
    fs.writeFileSync(path.join(directory, stem+locale+'.html'), '<html data-hia-site-navigation><main>ThemeRenderer themeDemo</main><a href="index.html">Home</a></html>');
  }
  const source = 'function example() {}';
  const digest = createHash('sha256').update(source).digest('hex');
  fs.writeFileSync(path.join(directory, 'sources', digest+'.txt'), source);
  fs.writeFileSync(path.join(directory, 'sources', 'source.en.html'), '<html data-hia-site-navigation><a id="L1" href="#L1">1</a><code>function example() {}</code></html>');
  return directory;
}

test('standalone versions use real native bilingual index files without mutating website navigation', () => {
  const original = createGeneratedSiteNavigation();
  const before = structuredClone(original);
  const navigation = createStandaloneSiteNavigation(original);
  assert.deepEqual(navigation.documentationVersion.entries[0].hrefByLocale, {'zh-CN':'/HIA-Documentation/jsdoc/index.zh-CN.html',en:'/HIA-Documentation/jsdoc/index.en.html'});
  assert.deepEqual(original, before);
  assert.throws(() => createStandaloneSiteNavigation({}));
});

test('native output checks reject missing navigation, tampered source bytes and broken relative links', t => {
  const directory = fixture(t);
  assert.ok(checkStandaloneJsdocReference(directory).files > 0);
  const file = path.join(directory, 'class.en.html');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('data-hia-site-navigation', ''));
  assert.throws(() => checkStandaloneJsdocReference(directory), /navigation/u);
  fs.writeFileSync(file, original.replace('index.html', 'missing.html'));
  assert.throws(() => checkStandaloneJsdocReference(directory), /link/u);
  fs.writeFileSync(file, original);
  const source = fs.readdirSync(path.join(directory, 'sources')).find(name => name.endsWith('.txt'));
  fs.appendFileSync(path.join(directory, 'sources', source), 'changed');
  assert.throws(() => checkStandaloneJsdocReference(directory), /digest/u);
});

test('source HTML and private metadata fail the public standalone gate', t => {
  const directory = fixture(t);
  const source = path.join(directory, 'sources', 'source.en.html');
  fs.appendFileSync(source, '<script>alert(1)</script>');
  assert.throws(() => checkStandaloneJsdocReference(directory), /script/u);
  fs.writeFileSync(source, '<html data-hia-site-navigation><code>source</code></html>');
  fs.writeFileSync(path.join(directory, 'hia-metadata.json'), '{"path":"K:/private"}');
  assert.throws(() => checkStandaloneJsdocReference(directory), /private/u);
});
