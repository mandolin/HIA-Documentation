/**
 * @lang zh-CN 离线组装必须保持旧索引与非根文件字节，拒绝覆盖和越界输出。
 * @lang en Offline composition must retain legacy indexes and non-root bytes, rejecting collisions and escaping output paths.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {createHash} from "node:crypto";
import { composeWebsite } from "../../scripts/compose-official-web.mjs";
import { checkOfficialSite } from "../../scripts/check-official-site.mjs";
import {compositionFiles} from "../src/lib/composition-report.mjs";

/**
 * @lang zh-CN 创建独立最小旧工件，只用于测试原字节/冲突/拒绝流程，不冒充完整生产参考。
 * @lang en Create an isolated minimal legacy artifact for byte, collision, and rejection tests, never as production-reference proof.
 * @returns {Promise<object>} 本次拥有的测试目录与原始索引字节。 Owned test directories and original index bytes.
 */
async function fixture() {
  const owner = fileURLToPath(new URL("../../", import.meta.url));
  await mkdir(path.join(owner, "dist"), { recursive: true });
  const root = await mkdtemp(path.join(owner, "dist/wp152-fixture-"));
  const reference = path.join(root, "reference");
  const out = path.join(root, "official-site-output");
  await mkdir(path.join(reference, "en"), { recursive: true });
  await mkdir(path.join(reference, "zh-CN"), { recursive: true });
  const index = {contract:"hia-reference-version-index",contractVersion:"0.1.0-draft",versioning:{strategy:"current-and-releases",current:{id:"current",path:"current/"},releases:[],compatibilityAliases:{root:"current",en:"current/en",zhCN:"current/zh-CN",sourceLinkage:"current/source-linkage"},searchPartitions:[]}};
  const bytes = JSON.stringify(index, null, 4) + "\n";
  await writeFile(path.join(reference, "versions.json"), bytes);
  await writeFile(path.join(reference, "index.html"), "<h1>Original reference root</h1>");
  await writeFile(path.join(reference, "en/index.html"), "<!doctype html><h1>Original API reference</h1>");
  await writeFile(path.join(reference, "zh-CN/index.html"), "<!doctype html><h1>原接口参考</h1>");
  // <lang><zh-CN>装配逐项核官网链接的独立主题语言页。</zh-CN><en>Composition checks the standalone locale pages linked by the website.</en></lang>
  await mkdir(path.join(reference, "jsdoc"));
  for (const locale of ["en", "zh-CN"]) await writeFile(path.join(reference, "jsdoc", `index.${locale}.html`), "<!doctype html><h1>Standalone JSDoc</h1>");
  await writeFile(path.join(reference, "reference-pages.json"), JSON.stringify({contract:"hia-reference-pages",contractVersion:"0.1.0-draft",privacy:{status:"pass",sourcesContentPolicy:"none",sourcePreviewPolicy:"public-whitelisted-excerpt"}}));
  return { root, reference, out, bytes };
}

test("missing or overlapping inputs fail before any output mutation", async () => {
  await assert.rejects(composeWebsite({website:"dist/official-web-preview",reference:"dist/official-web-preview",out:"dist/official-site-overlap"}), /overlap/);
  await assert.rejects(composeWebsite({website:"dist/official-web-preview",reference:"dist/reference-pages",out:"../outside"}));
  await assert.rejects(composeWebsite({website:"dist/official-web-preview",reference:"dist/reference-pages",out:"dist/reference-pages/nested"}));
  await assert.rejects(composeWebsite({website:"../work-zone",reference:"dist/reference-pages",out:"dist/official-site-escape"}));
});

test("copy legacy bytes and deep links, replace only root and machine index", async () => {
  const input = await fixture();
  const result = await composeWebsite(input);
  assert.equal(result.preservation.originalFiles, 7);
  assert.equal(await readFile(path.join(input.out, "legacy-reference/versions.json"), "utf8"), input.bytes);
  assert.equal(await readFile(path.join(input.out, "en/index.html"), "utf8"), "<!doctype html><h1>Original API reference</h1>");
  assert((await readFile(path.join(input.out, "index.html"), "utf8")).includes("HIA-Documentation-Sys"));
  assert.equal(JSON.parse(await readFile(path.join(input.out, "versions.json"), "utf8")).contract, "hia-site-version-index");
  assert.equal(await readFile(path.join(input.reference, "versions.json"), "utf8"), input.bytes);
  assert.equal((await checkOfficialSite(input.out)).legacyFiles, 7);
  await writeFile(path.join(input.out, "en/index.html"), "tampered bytes");
  await assert.rejects(checkOfficialSite(input.out), /size|digest/);
  await composeWebsite(input);
  assert((await readdir(input.root)).some(name => name.startsWith("official-site-output.previous-")));
});

test("composition verifies actual generated reference entry dependencies", async () => {
  const input = await fixture();
  await writeFile(path.join(input.reference, "zh-CN/index.html"), "not an HTML artifact");
  await assert.rejects(composeWebsite(input), /not an HTML document/);
});

test("composition verifies the actual standalone language entry before copying", async () => {
  const input = await fixture();
  await writeFile(path.join(input.reference, "jsdoc/index.en.html"), "not an HTML artifact");
  await assert.rejects(composeWebsite(input), /not an HTML document/);
});

test("sibling composition retains old non-root bytes and verifies the independent snapshot", async () => {
  const input = await fixture();
  const result = await composeWebsite({ ...input, legacyMode: "sibling" });
  const index = JSON.parse(await readFile(path.join(input.out, "versions.json"), "utf8"));
  assert.equal(index.contractVersion, "2.0.0");
  assert.equal(result.format, "hia-official-site-composition-report@0.3.0");
  assert.equal(result.legacyIndex, "/HIA-Documentation-Legacy/versions.json");
  assert(!compositionFiles(result).some(file => file.path.startsWith("legacy-reference/")));
  assert.equal(await readFile(path.join(input.out, "en/index.html"), "utf8"), await readFile(path.join(input.reference, "en/index.html"), "utf8"));
  await assert.rejects(checkOfficialSite(input.out), /legacy artifact/);
  assert.equal((await checkOfficialSite(input.out, input.reference)).legacyFiles, 7);
  await writeFile(path.join(input.reference, "en/index.html"), "Changed legacy body");
  await assert.rejects(checkOfficialSite(input.out, input.reference), /legacy artifact file/);
});

test("colliding favicon cannot overwrite a preserved legacy route", async () => {
  const input = await fixture();
  await writeFile(path.join(input.reference, "favicon.svg"), "<svg/>");
  await assert.rejects(composeWebsite(input), /collides/);
});

test("fresh reference and pinned compatibility snapshot retain independent byte identities", async () => {
  // <lang><zh-CN>主站正常参考继续更新，兼容快照独立固定；两个来源都须按实际角色复核。</zh-CN><en>The main reference keeps updating while compatibility stays independently pinned; verify both sources in their actual roles.</en></lang>
  const current=await fixture();
  const compatibility=await fixture();
  await writeFile(path.join(current.reference,"en/index.html"),"<!doctype html><h1>Fresh API reference</h1>");
  await writeFile(path.join(compatibility.reference,"index.html"),"<h1>Pinned compatibility root</h1>");
  const result=await composeWebsite({...current,legacyMode:"sibling",legacyReference:compatibility.reference});
  assert.equal(result.legacyRootSha256,createHash("sha256").update(await readFile(path.join(compatibility.reference,"index.html"))).digest("hex"));
  assert.equal(await readFile(path.join(current.out,"en/index.html"),"utf8"),"<!doctype html><h1>Fresh API reference</h1>");
  assert.equal((await checkOfficialSite(current.out,compatibility.reference,current.reference)).preservedDeepLinks,5);
  await writeFile(path.join(compatibility.reference,"index.html"),"<h1>Changed pinned root</h1>");
  await assert.rejects(checkOfficialSite(current.out,compatibility.reference,current.reference),/Legacy home/);
});

test("the formal checker still reads the original sibling object report", async () => {
  // <lang><zh-CN>把同一已验记录按原0.2交换对象保存，正式读者须按旧语义复核同一工件。</zh-CN><en>Persist the verified records in the original 0.2 interchange representation and verify the same artifact through legacy reading semantics.</en></lang>
  const input = await fixture();
  const current = await composeWebsite({...input,legacyMode:"sibling"});
  const {fileTable,...metadata} = current;
  const original = {...metadata,format:"hia-official-site-composition-report@0.2.0",files:compositionFiles(current)};
  await writeFile(path.join(input.out,"official-site.json"),JSON.stringify(original));
  assert.equal((await checkOfficialSite(input.out,input.reference)).legacyFiles,7);
});

test("already appended identical website files keep their original deep-link identity", async () => {
  // <lang><zh-CN>真实已发布参考站已有官网深链，相同原件只保留一次，仍计为受保护旧路径。</zh-CN><en>The real published reference already has website deep links. Keep identical files once and retain their protected-route classification.</en></lang>
  const input = await fixture();
  const website = fileURLToPath(new URL("../../dist/official-web-preview/", import.meta.url));
  const relative = "docs/zh-CN/index.html";
  const original = await readFile(path.join(website, relative));
  await mkdir(path.dirname(path.join(input.reference, relative)), {recursive:true});
  await writeFile(path.join(input.reference, relative), original);
  const result = await composeWebsite({...input, legacyMode:"sibling"});
  assert.equal(compositionFiles(result).filter(item=>item.path===relative).length,1);
  assert.equal(compositionFiles(result).find(item=>item.path===relative).kind,"preserved-deep-link");
  assert.deepEqual(await readFile(path.join(input.out,relative)),original);
  assert.equal((await checkOfficialSite(input.out,input.reference)).legacyFiles,8);
  // <lang><zh-CN>相同长度的一字节变更仍是冲突，失败后先前完整输出保持原字节。</zh-CN><en>A same-length one-byte mutation still conflicts, leaving the previous complete output byte-identical.</en></lang>
  const changed = Buffer.from(original);
  changed[0] ^= 1;
  await writeFile(path.join(input.reference,relative),changed);
  await assert.rejects(composeWebsite({...input,legacyMode:"sibling"}),/collides/);
  assert.deepEqual(await readFile(path.join(input.out,relative)),original);
});

test("privacy and byte-budget failures keep previous output intact", async () => {
  const input = await fixture();
  await mkdir(input.out);
  await writeFile(path.join(input.out, "keep.txt"), "previous complete output");
  await writeFile(path.join(input.reference, "opaque.data"), "work-zone/private");
  await assert.rejects(composeWebsite(input), /private path/);
  assert.equal(await readFile(path.join(input.out, "keep.txt"), "utf8"), "previous complete output");
  await assert.rejects(composeWebsite({ ...input, maxBytes: 16 }), /budget/);
  assert.equal(await readFile(path.join(input.out, "keep.txt"), "utf8"), "previous complete output");
  await assert.rejects(composeWebsite({ ...input, maxFileBytes: 1 }), /budget/);
});

test("a passing label cannot authorize expanded embedded source", async () => {
  const input = await fixture();
  const manifest = JSON.parse(await readFile(path.join(input.reference, "reference-pages.json"), "utf8"));
  manifest.privacy.sourcesContentPolicy = "full";
  await writeFile(path.join(input.reference, "reference-pages.json"), JSON.stringify(manifest));
  await assert.rejects(composeWebsite(input), /source policy/);
});

test("private directory names cannot leak through file inventory", async () => {
  const input = await fixture();
  await mkdir(path.join(input.reference, "work-zone"));
  await writeFile(path.join(input.reference, "work-zone/note.txt"), "otherwise harmless text");
  await assert.rejects(composeWebsite(input), /private path/);
});
