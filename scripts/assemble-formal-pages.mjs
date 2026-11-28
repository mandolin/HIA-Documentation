
/** @file @lang zh-CN 用冻结的包执行独立示例、保留经过认证的技术深链并验正式工件。 @lang en Generate the standalone example with frozen packages, retain authenticated deep links, and verify the stable artifact. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { compositionFiles } from "../site/src/lib/composition-report.mjs";
import { checkOfficialSite } from "./check-official-site.mjs";
import { composeWebsite } from "./compose-official-web.mjs";
import { checkStandaloneJsdocReference, createStandaloneSiteNavigation } from "./standalone-reference.mjs";

const root = process.cwd();
const inputs = path.join(root, "dist/formal-inputs");
const base = path.join(inputs, "base");
const website = path.join(root, "dist/official-web-preview");
const keep = path.join(root, "dist/formal-reference");
const legacy = path.join(root, "dist/formal-legacy");
const output = path.join(root, "dist/official-site-formal");
const consumer = path.join(inputs, "consumer");
const receipts = JSON.parse(fs.readFileSync(path.join(inputs, "input-receipt.json"), "utf8"));
const requireFrozen = createRequire(path.join(consumer, "package.json"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

/**
 * @lang zh-CN 安全复制认证清单内的单个文件，禁止覆盖及越界。
 * @lang en Copy one authenticated manifest member without overwriting or escaping the root.
 */
function copyReference(name, bytes) {
  assert.equal(name, path.posix.normalize(name));
  assert(!name.startsWith("/") && !name.startsWith("../") && !/[\\:%?#]/.test(name));
  const file = path.join(keep, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: "wx" });
}

// <lang><zh-CN>原站根和索引由正式官网覆盖。用实际兼容索引提供旧身份输入。</zh-CN><en>Stable website files replace the old root and index. Use the actual legacy index for the technical input.</en></lang>
const original = JSON.parse(fs.readFileSync(path.join(base, "official-site.json")));
const rows = compositionFiles(original);
for (const row of rows) {
  const from = path.join(base, row.path);
  // <lang><zh-CN>Pages 传输省去空文件，按原清单认证后复原原始空字节。</zh-CN><en>Pages transport omits the empty marker; restore its exact authenticated zero bytes.</en></lang>
  const bytes = row.path === ".nojekyll" && !fs.existsSync(from) ? Buffer.alloc(0) : fs.readFileSync(from);
  assert.equal(bytes.length, row.bytes, row.path);
  assert.equal(hash(bytes), row.sha256, row.path);
  if (row.kind === "preserved-deep-link" && !row.path.startsWith("jsdoc/")) copyReference(row.path, bytes);
}
for (const name of ["index.html", "versions.json"]) copyReference(name, fs.readFileSync(path.join(legacy, name)));

// <lang><zh-CN>从同一消费锁中解析实际插件、主题、渲染器及 JSDoc。输出只授权源样本。</zh-CN><en>Resolve the actual plugin, theme, renderer and JSDoc through the same consumer lock. Only the admitted sample is exposed.</en></lang>
const native = path.join(keep, "jsdoc");
const sourceBase = path.join(inputs, "native-source");
const source = receipts.sourceSample;
const sample = path.join(sourceBase, source.path);
const find = name => {
  const item = receipts.archives.find(row => row.package === name);
  assert(item, name);
  return item;
};
const plugin = find("@mandolin/jsdoc-plugin-hia-sys");
const theme = find("@mandolin/jsdoc-theme-hia");
const renderer = find("@hia-doc/renderer-html");
assert.equal(hash(fs.readFileSync(sample)), source.sha256);
const rendererFiles = path.dirname(requireFrozen.resolve("@hia-doc/renderer-html/site-chrome"));
assert.equal(fs.realpathSync(path.join(root, "packages/renderer-html/dist")), fs.realpathSync(rendererFiles));
const nav = JSON.parse(fs.readFileSync(path.join(website, "documentation-site-navigation.json"), "utf8"));
assert.equal(nav.documentationVersion.status, "stable");
const config = {
  plugins: [requireFrozen.resolve(plugin.package)],
  source: { include: [sample] },
  opts: {
    template: path.dirname(requireFrozen.resolve(theme.package + "/package.json")),
    destination: native, recurse: true,
    hia: {
      mode: "standalone", uiLocale: "zh-CN", siteNavigation: createStandaloneSiteNavigation(nav),
      theme: { code: { fontFamily: "mono" } },
      source: {
        basePath: sourceBase, mode: "all",
        link: { enabled: true, rootUrl: "https://github.com/" + source.repository + "/blob/" + source.commit, openMode: "same-tab" },
        preview: { enabled: true, defaultExpanded: false }, references: { enabled: true, defaultExpanded: false },
      },
      i18n: { enabled: true, defaultLocale: "zh-CN", fallbackLocale: "en", locales: ["zh-CN", "en"], mode: "runtimeSwitch" },
      presentation: { pageMode: "multi-page", sourceMode: "fetch" },
      integration: { enabled: true, outputFile: path.join(native, "hia-integration.json") },
    },
  },
};
const configPath = path.join(inputs, "jsdoc-config.json");
fs.writeFileSync(configPath, JSON.stringify(config), { flag: "wx" });
try {
  execFileSync(process.execPath, [requireFrozen.resolve("jsdoc/jsdoc.js"), "-c", configPath], {
    cwd: consumer, stdio: "inherit", env: { ...process.env, NODE_PATH: path.join(consumer, "node_modules") },
  });
} finally {
  fs.unlinkSync(configPath);
}
const payload = checkStandaloneJsdocReference(native);
// <lang><zh-CN>正式站保留与预览相同的实际原生路由，内部模板元数据不进入发布路径。</zh-CN><en>Keep the same native routes as preview. Internal template metadata stays out of the release paths.</en></lang>
const marker = path.join(native, ".gitattributes");
if (fs.existsSync(marker)) fs.unlinkSync(marker);
const publication = {
  ...JSON.parse(fs.readFileSync(path.join(base, "jsdoc/publication.json"))),
  owners: [plugin, theme].map(row => ({ name: row.package, version: "1.0.0", commit: row.commit, integrity: row.integrity })),
  renderer: { repository: renderer.repository, commit: renderer.commit },
  generatedPayload: payload,
};
fs.writeFileSync(path.join(native, "publication.json"), JSON.stringify(publication, null, 2) + "\n", { flag: "wx" });

await composeWebsite({ reference: "dist/formal-reference", legacyReference: "dist/formal-legacy", legacyMode: "sibling", out: "dist/official-site-formal" });
const status = await checkOfficialSite(output, legacy, keep);
assert.equal(status.systemStatus, "stable");
const inventory = fs.readFileSync(path.join(output, "official-site.json"));
const indexBytes = fs.readFileSync(path.join(output, "versions.json"));
const composed = compositionFiles(JSON.parse(inventory));
assert.deepEqual(composed.map(row => row.path).sort(), rows.map(row => row.path).sort());
const before = new Map(rows.map(row => [row.path, row]));
for (const row of composed) {
  const old = before.get(row.path);
  assert.equal(old.kind, row.kind, row.path);
  if (row.kind === "preserved-deep-link" && !row.path.startsWith("jsdoc/")) assert.equal(row.sha256, old.sha256, row.path);
}

// <lang><zh-CN>验证站点真实语言、正式身份及精确迁移来源；离线安装由独立执行步骤复核。</zh-CN><en>Verify the output language, stable identity and exact migration links; a separate step executes the offline consumer.</en></lang>
for (const locale of ["zh-CN", "en"]) {
  const docs = path.join(output, "docs", locale);
  const start = fs.readFileSync(path.join(docs, "learn/start/index.html"), "utf8");
  const guide = fs.readFileSync(path.join(docs, "learn/deployment-versions/index.html"), "utf8");
  const main = fs.readFileSync(path.join(docs, "index.html"), "utf8");
  const page = fs.readFileSync(path.join(output, "jsdoc", publication.localePages[locale]), "utf8");
  const label = locale === "en" ? /1\.0\.0 stable/ : /1\.0\.0 正式版/;
  assert.match(main, label);
  assert.match(page, locale === "en" ? label : /1\.0\.0 稳定版/);
  assert.match(start, /npm install --save-exact @hia-doc\/cli@1\.0\.0/);
  assert.match(start, /npm exec --offline -- hia docs build --input basic\.hia\.json/);
  assert.match(start, /deployment-versions\/#upgrade/);
  assert.match(guide, /id="upgrade"/);
  assert.match(guide, /3307718d802e620b6af4259a9ef12fcfbb90efe6\/docs\/package-v1-migration\.md/);
}
const proof = { ...receipts, status, standalone: publication,
  release: { deployment: false, npmPublication: false, exactRoutes: status.files,
    indexSha256: hash(indexBytes), inventorySha256: hash(inventory), totalBytes: status.copiedBytes + indexBytes.length + inventory.length },
};
fs.writeFileSync(path.join(root, "dist/formal-pages-receipt.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ ...status, archivedPackages: receipts.archives.length, standaloneNativeFiles: payload.files, totalBytes: proof.release.totalBytes }));
