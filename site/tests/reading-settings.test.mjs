/**
 * @file
 * @lang zh-CN 核官网实际阅读控制脚本的封闭选项、默认值与无持久化行为。
 * @lang en Check closed choices, defaults and non-persistence in the actual website reading controls.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('actual website settings expose and apply closed line-number choices', () => {
  // <lang><zh-CN>只提取实际主题设置区，测试不复制被测控制逻辑。</zh-CN><en>Extract the actual settings region without copying the implementation under test.</en></lang>
  const source = readFileSync(new URL('../src/scripts/client.js', import.meta.url), 'utf8');
  const start = source.indexOf('const media = matchMedia(');
  const end = source.indexOf('const english =', start);
  const controls = new Map();
  const root = {dataset:{}};
  for (const selector of ['[data-theme-select]','[data-wrap-select]','[data-lines-select]']) {
    controls.set(selector,{value:'show',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}});
  }
  runInNewContext(source.slice(start,end), {document:{documentElement:root,querySelector:s=>controls.get(s)},matchMedia:()=>({matches:false,addEventListener(){}})});
  // <lang><zh-CN>缺少已确认控制或未绑定事件必须失败，任意字符串不能注入根属性。</zh-CN><en>Missing confirmed controls or unbound events must fail; arbitrary strings cannot enter root attributes.</en></lang>
  const lines = controls.get('[data-lines-select]');
  assert.equal(typeof lines.handlers.change, 'function');
  for (const value of ['hide','show','url(unsafe)']) {
    lines.handlers.change({target:{value}});
    assert.equal(root.dataset.lines,value==='hide'?'hide':'show');
  }
  const layout=readFileSync(new URL('../src/layouts/SiteShell.astro',import.meta.url),'utf8');
  assert.match(layout,/select data-lines-select/u);
  const css=readFileSync(new URL('../src/styles/site.css',import.meta.url),'utf8');
  assert.match(css,/counter-increment:\s*documentation-line/u);
  assert.match(css,/data-lines="hide"[^}]*content:\s*none/u);
});
