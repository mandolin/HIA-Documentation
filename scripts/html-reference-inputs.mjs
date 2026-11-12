/** @file @lang zh-CN 核固定HTML工具包、原资源和已确认独立站导航。 @lang en Validate fixed HTML tool packages, original resources and confirmed independent-site navigation. */
import fs from "node:fs";
import assert from "node:assert/strict";
import {createGeneratedSiteNavigation} from "../site/src/lib/generated-navigation.mjs";
import {assertDocumentationSiteNavigation} from "../packages/renderer-html/dist/index.js";

/** @lang zh-CN 精确检查清单字段，拒绝未消费的输入。 @lang en Check exact registry keys, rejecting unconsumed input. */
function shape(value, keys) {
  assert(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

/**
 * @lang zh-CN 仅接纳已登记HTML八包、四个原JSON导出及已确认A路线。
 * @lang en Accept only the eight registered HTML packages, four original JSON exports and confirmed route A.
 * @param {object} value - 待核正常生产清单。 Production registry to validate.
 * @returns {void} 清单符合时返回。 Return for a valid registry.
 * @throws {Error} 包、资源、路由、标题或未知字段不符。 Invalid package, resource, route, title or unknown fields.
 */
export function assertHtmlReferenceInputs(value) {
  shape(value, ["description", "packages", "sites", "resources"]);
  // <lang><zh-CN>必要包清单是包选择的事实源，资源则固定已发布的两个配置与两个提取schema导出。</zh-CN><en>The required-package registry owns package selection; resources pin the two public configuration and two extraction-schema exports.</en></lang>
  const scope = JSON.parse(fs.readFileSync(new URL("../reference/required-package-api.inputs.json", import.meta.url), "utf8"));
  const names = scope.packages.filter(pack => pack.owner === "hia-htmdoc").map(pack => pack.name);
  assert(Array.isArray(value.packages) && value.packages.length === 8 && new Set(value.packages).size === 8);
  assert.deepEqual([...value.packages].sort(), names.sort());
  assert(Array.isArray(value.sites) && value.sites.length === 1);
  const site = value.sites[0];
  shape(site, ["id", "repository", "base", "path", "titleByLocale"]);
  assert.equal(site.id, "html-api");
  assert.equal(site.repository, "mandolin/HIA-Documentation-API-HTML");
  assert.equal(site.base, "/HIA-Documentation-API-HTML/");
  assert.equal(site.path, "");
  shape(site.titleByLocale, ["zh-CN", "en"]);
  assert(Object.values(site.titleByLocale).every(text => typeof text === "string" && text.trim()));
  const selectors = [
    ["@hia-doc/htmdoc-runner", "./schemas/htmdoc-config-1.0.0.schema.json"],
    ["@hia-doc/htmdoc-runner", "./schemas/htmdoc-config-0.1.0-draft.schema.json"],
    ["@hia-doc/htmdoc-spec", "./schemas/hia-htmdoc-extraction-1.0.0.schema.json"],
    ["@hia-doc/htmdoc-spec", "./schemas/hia-htmdoc-extraction-0.1.0-draft.schema.json"]
  ];
  assert(Array.isArray(value.resources) && value.resources.length === 4);
  for (const resource of value.resources) {
    shape(resource, ["package", "subpath", "site"]);
    assert.equal(resource.site, "html-api");
  }
  assert.deepEqual(value.resources.map(resource => JSON.stringify([resource.package, resource.subpath])).sort(), selectors.map(selector => JSON.stringify(selector)).sort());
}

/**
 * @lang zh-CN 每次读取独立清单并立即核已确认边界。
 * @lang en Read an independent registry and immediately validate confirmed boundaries.
 * @returns {object} 已验证的完整清单。 Complete validated registry.
 * @throws {Error} 文件或清单无效。 Invalid file or registry.
 */
export function loadHtmlReferenceInputs() {
  const value = JSON.parse(fs.readFileSync(new URL("../reference/html-reference-inputs.json", import.meta.url), "utf8"));
  assertHtmlReferenceInputs(value);
  return value;
}

/**
 * @lang zh-CN HTML分区版本与语言指向自身，主站栏目沿已确认公共职责。
 * @lang en Target HTML's own partition for version and locale while retaining confirmed shared documentation tabs.
 * @param {object} registry - 已核HTML清单。 Validated HTML registry.
 * @param {string} id - 唯一html-api分区。 The sole html-api partition.
 * @returns {object} 既有导航契约数据。 Existing navigation-contract data.
 * @throws {Error} 清单或分区不符。 Invalid registry or partition.
 */
export function createHtmlReferenceNavigation(registry, id) {
  assertHtmlReferenceInputs(registry);
  assert.equal(id, "html-api");
  const targets = Object.fromEntries(["zh-CN", "en"].map(locale => [locale, registry.sites[0].base + locale + "/"]));
  const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", "/HIA-Documentation-API/");
  navigation.localeTargets = targets;
  navigation.documentationVersion.entries[0].hrefByLocale = targets;
  assertDocumentationSiteNavigation(navigation);
  return navigation;
}
