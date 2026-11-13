/** @file @lang zh-CN 新旧根身份与实际兼容快照配对回归。 @lang en Regressions for root identities and actual compatibility-snapshot pairing. */
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createSiteVersionIndex} from "../site/src/lib/version-index.mjs";
import {encodeCompositionReport} from "../site/src/lib/composition-report.mjs";
import {readReferenceSiteContext,assertReferencePublicationTarget} from "./reference-site-context.mjs";

/** @lang zh-CN 独立旧索引夹具，字段身份沿既有精确读取。 @lang en Independent legacy index fixture using the existing exact reader identity. */
const oldIndex=JSON.stringify({contract:"hia-reference-version-index",contractVersion:"0.1.0-draft",versioning:{strategy:"current-and-releases",current:{id:"current",path:"current/"},releases:[],compatibilityAliases:{root:"current",en:"current/en",zhCN:"current/zh-CN",sourceLinkage:"current/source-linkage"},searchPartitions:[]}});

test("an explicit publication target rejects a healthy previous CDN revision", () => {
  // <lang><zh-CN>健康状态相同仍须核所选实际提交和根类型，不能以旧缓存替代目标。</zh-CN><en>Equal health still requires the selected actual commit and root kind, excluding stale healthy cache entries.</en></lang>
  const build={sources:[{repository:"mandolin/HIA-Documentation",commit:"a".repeat(40)}]};
  assert.doesNotThrow(()=>assertReferencePublicationTarget({kind:"official"},build,"a".repeat(40),"official"));
  assert.doesNotThrow(()=>assertReferencePublicationTarget({kind:"reference"},build,undefined,undefined));
  assert.throws(()=>assertReferencePublicationTarget({kind:"official"},build,"b".repeat(40),"official"),/selected source/);
  assert.throws(()=>assertReferencePublicationTarget({kind:"reference"},build,"a".repeat(40),"official"),/selected root/);
  assert.throws(()=>assertReferencePublicationTarget({kind:"official"},build,"invalid","official"),/Invalid expected/);
  assert.throws(()=>assertReferencePublicationTarget({kind:"official"},build,"a".repeat(40),"other"),/Invalid expected/);
  assert.throws(()=>assertReferencePublicationTarget({kind:"official"},{sources:[...build.sources,...build.sources]},"a".repeat(40),"official"),/selected source/);
});

/**
 * @lang zh-CN 创建固定同源映射，任何额外网络读取均失败。
 * @lang en Create a fixed same-origin map, rejecting additional network reads.
 * @returns {object} 文本映射与只读传输器。 Text map and read-only transport.
 */
function fixture() {
  const base=new URL("https://example.test/HIA-Documentation/");
  const legacyRoot="<h1>Pinned original reference</h1>";
  const report=encodeCompositionReport({format:"hia-official-site-composition-report@0.2.0",siteIndex:"versions.json",legacyIndex:"/HIA-Documentation-Legacy/versions.json",legacyIndexSha256:createHash("sha256").update(oldIndex).digest("hex"),legacyRootSha256:createHash("sha256").update(legacyRoot).digest("hex"),privacy:{status:"pass",sourcesContentPolicy:"none"},files:[{path:"index.html",bytes:1,sha256:"a".repeat(64),kind:"website"}]});
  const texts=new Map([
    [new URL("versions.json",base).href,JSON.stringify(createSiteVersionIndex("2.0.0"))],
    [new URL("official-site.json",base).href,JSON.stringify(report)],
    ["https://example.test/HIA-Documentation-Legacy/versions.json",oldIndex],
    ["https://example.test/HIA-Documentation-Legacy/",legacyRoot],
    ["https://example.test/HIA-Documentation-Legacy/reference-pages.json",JSON.stringify({contract:"hia-reference-pages",contractVersion:"0.1.0-draft",privacy:{status:"pass",sourcesContentPolicy:"none",sourcePreviewPolicy:"public-whitelisted-excerpt"}})],
  ]);
  return {base,texts,fetchText:async value=>{const url=new URL(value,base).href;assert(texts.has(url),url);return texts.get(url);}};
}

test("old root retains its exact index and reference markers", async () => {
  const input=fixture();
  input.texts.set(new URL("versions.json",input.base).href,oldIndex);
  const context=await readReferenceSiteContext(input.base,input.fetchText);
  assert.equal(context.kind,"reference");
  assert.equal(context.rootMarker,"HIA Documentation System Reference");
  assert.deepEqual(context.versionIndex,JSON.parse(oldIndex));
});

test("official root reads the exact sibling index and pinned original root", async () => {
  const input=fixture();
  const context=await readReferenceSiteContext(input.base,input.fetchText);
  assert.equal(context.kind,"official");
  assert.equal(context.siteIndex.contractVersion,"2.0.0");
  assert.equal(context.versionIndex.contract,"hia-reference-version-index");
  assert.equal(context.legacyBase,"https://example.test/HIA-Documentation-Legacy/");
});

for (const [name,mutate] of [
  ["unknown identity",value=>value.texts.set(new URL("versions.json",value.base).href,'{"contract":"unknown"}')],
  ["wrong pinned index bytes",value=>value.texts.set("https://example.test/HIA-Documentation-Legacy/versions.json",oldIndex+"\n")],
  ["wrong pinned root bytes",value=>value.texts.set("https://example.test/HIA-Documentation-Legacy/","changed")],
  ["expanded compatibility policy",value=>value.texts.set("https://example.test/HIA-Documentation-Legacy/reference-pages.json",JSON.stringify({contract:"hia-reference-pages",contractVersion:"0.1.0-draft",privacy:{status:"pass",sourcesContentPolicy:"full"}}))],
  ["wrong locator",value=>{const index=createSiteVersionIndex("2.0.0");index.legacyReference.index="https://other.invalid/versions.json";value.texts.set(new URL("versions.json",value.base).href,JSON.stringify(index));}],
]) {
  test("reject root context "+name, async()=>{const input=fixture();mutate(input);await assert.rejects(readReferenceSiteContext(input.base,input.fetchText));});
}
