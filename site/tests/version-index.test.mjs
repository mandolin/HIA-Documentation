/**
 * @lang zh-CN 站点索引与旧参考读取的边界反例；测试先于实现，避免无意改写旧身份。
 * @lang en Boundary regressions for site and legacy-reference indexes, written before implementation to prevent rewriting old identities.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSiteVersionIndex, createSiteVersionIndex, readSiteVersionIndex, readLegacyReferenceIndex, resolveDocumentationVersion } from "../src/lib/version-index.mjs";

test("preview index separates website, documentation, and legacy reference", () => {
  const index = createSiteVersionIndex();
  assert.equal(index.contract, "hia-site-version-index");
  assert.equal(index.contractVersion, "1.0.0");
  assert.equal(index.defaultLocale, "zh-CN");
  assert.equal(index.website.locales["zh-CN"], "");
  assert.equal(index.website.locales.en, "site/en/");
  assert.equal(index.documentation.current.status, "preview");
  assert.deepEqual(index.documentation.archives, []);
  assert.equal(index.legacyReference.index, "legacy-reference/versions.json");
  assert.deepEqual(readSiteVersionIndex(JSON.stringify(index)), index);
});

for (const mutation of [
  index => { index.contractVersion = "2.0.0"; },
  index => { index.contract = "hia-reference-version-index"; },
  index => { index.basePath = "//external/"; },
  index => { index.basePath = "/HIA-Documentation/../"; },
  index => { index.website.locales["zh-CN"] = "current/"; },
  index => { index.website.locales.en = "https://external/"; },
  index => { index.documentation.current.locales.en = "../escape/"; },
  index => { index.documentation.current.locales.en = "docs/%2e%2e/"; },
  index => { index.documentation.current.locales.en = "docs/en/?query=secret"; },
  index => { index.documentation.current.locales.en = "docs\\en\\"; },
  index => { index.legacyReference.index = "versions.json"; },
  index => { index.defaultLocale = "en"; },
  index => { index.extra = "unreviewed"; },
  index => { index.documentation.current.status = "released"; },
  index => { index.documentation.current.locales.fr = "docs/fr/"; },
]) {
  test("reject an unknown identity, route, or publication state", () => {
    const index = createSiteVersionIndex();
    mutation(index);
    assert.throws(() => readSiteVersionIndex(JSON.stringify(index)));
  });
}

test("one final edition per strictly older major, never technical release snapshots", () => {
  const index = createSiteVersionIndex();
  index.documentation.current.version = "3.0.0";
  index.documentation.archives = [
    { version: "2.9.7", status: "archived", locales: { "zh-CN": "docs/archive/v2/zh-CN/", en: "docs/archive/v2/en/" } },
    { version: "1.8.2", status: "archived", locales: { "zh-CN": "docs/archive/v1/zh-CN/" } },
  ];
  assert.equal(readSiteVersionIndex(JSON.stringify(index)).documentation.archives.length, 2);
  const duplicate = structuredClone(index);
  duplicate.documentation.archives.push({ version: "2.8.0", status: "archived", locales: {en:"docs/archive/v2/en/"} });
  assert.throws(() => readSiteVersionIndex(JSON.stringify(duplicate)));
  index.documentation.archives[0].version = "3.0.1";
  assert.throws(() => readSiteVersionIndex(JSON.stringify(index)));
});

test("missing translation is explicit and never silently resolves to latest", () => {
  const index = createSiteVersionIndex();
  index.documentation.current.version = "2.0.0";
  index.documentation.archives = [{ version: "1.9.7", status: "archived", locales: {"zh-CN":"docs/archive/v1/zh-CN/"} }];
  assert.deepEqual(resolveDocumentationVersion(index, "1.9.7", "en"), { status: "missing-locale", availableLocales: ["zh-CN"] });
  assert.deepEqual(resolveDocumentationVersion(index, "9.0.0", "en"), { status: "missing-version" });
  assert.equal(resolveDocumentationVersion(index, "current", "en").path, "docs/en/");
  assert.throws(() => resolveDocumentationVersion(index, "current", "fr"));
});

test("legacy identity and root alias remain exact and unchanged", () => {
  const legacy = {contract:"hia-reference-version-index",contractVersion:"0.1.0-draft",versioning:{strategy:"current-and-releases",current:{id:"current",path:"current/"},releases:[{id:"0.1.0-draft",path:"releases/0.1.0-draft/"}],compatibilityAliases:{root:"current",en:"current/en",zhCN:"current/zh-CN",sourceLinkage:"current/source-linkage"},searchPartitions:[]},provenance:{retained:true}};
  const bytes = JSON.stringify(legacy);
  assert.deepEqual(readLegacyReferenceIndex(bytes), legacy);
  assert.equal(JSON.stringify(legacy), bytes);
  assert.throws(() => readSiteVersionIndex(bytes));
  assert.throws(() => readLegacyReferenceIndex(JSON.stringify(createSiteVersionIndex())));
  legacy.versioning.compatibilityAliases.root = "";
  assert.throws(() => readLegacyReferenceIndex(JSON.stringify(legacy)));
});

test("invalid JSON and rejected values never enter error payloads", () => {
  const secret = "unpublished-example-token";
  for (const reader of [readSiteVersionIndex, readLegacyReferenceIndex]) {
    assert.throws(() => reader(secret), error => !error.message.includes(secret) && !("actual" in error));
  }
  const index = createSiteVersionIndex();
  index.website.locales.en = secret;
  assert.throws(() => readSiteVersionIndex(JSON.stringify(index)), error => !error.message.includes(secret) && !("actual" in error));
});

test("non-JSON getters cannot execute during validation", () => {
  const index = createSiteVersionIndex();
  let reads = 0;
  Object.defineProperty(index, "contract", { enumerable: true, get() { reads++; return "hia-site-version-index"; } });
  assert.throws(() => assertSiteVersionIndex(index));
  assert.equal(reads, 0);
});
