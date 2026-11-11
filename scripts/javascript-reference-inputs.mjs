/**
 * @file
 * @lang zh-CN 已确认JavaScript发布清单、当前分区导航和原声明分组；纯分组不授予源码读取权限。
 * @lang en Confirmed JavaScript publication inputs, current-partition navigation and original-declaration grouping; pure grouping grants no source access.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {createGeneratedSiteNavigation} from "../site/src/lib/generated-navigation.mjs";
import {assertDocumentationSiteNavigation} from "../packages/renderer-html/dist/index.js";

/** @lang zh-CN 核对内部清单对象的封闭字段。 @lang en Check closed fields of an internal registry object. */
function shape(value, keys) {
  assert(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

/**
 * @lang zh-CN 仅接纳已登记十包、互斥分区与精确公开资源选择。
 * @lang en Accept only the ten registered packages, disjoint partitions and exact public resource selectors.
 * @param {object} value - 待核内部清单。 Internal registry to check.
 * @returns {void} 无效时抛错。 Throws for invalid data.
 */
export function assertJavaScriptReferenceInputs(value) {
  shape(value, ["description", "packages", "sites", "resources"]);
  // <lang><zh-CN>允许包来自必要包同一事实源，仅选择三个既有JavaScript owner。</zh-CN><en>Allowed packages come from the required-package source of truth, selecting the three existing JavaScript owners only.</en></lang>
  const scope = JSON.parse(fs.readFileSync(new URL("../reference/required-package-api.inputs.json", import.meta.url), "utf8"));
  const names = scope.packages.filter(pack => ["hia-jsdoc", "jsdoc-plugin-hia-sys", "jsdoc-theme-hia"].includes(pack.owner)).map(pack => pack.name);
  assert(Array.isArray(value.packages) && value.packages.length === 10 && new Set(value.packages).size === 10);
  assert.deepEqual([...value.packages].sort(), names.sort());
  assert(Array.isArray(value.sites) && value.sites.length === 2);
  assert.deepEqual(value.sites.map(site => site.id), ["javascript-api", "derivation-evidence"]);
  for (const site of value.sites) {
    shape(site, ["id", "repository", "base", "path", "titleByLocale"]);
    assert(/^mandolin\/HIA-Documentation-[A-Za-z-]+$/u.test(site.repository));
    assert.equal(site.base, "/" + site.repository.split("/")[1] + "/");
    assert.equal(site.path, site.id === "javascript-api" ? "" : "derivation-evidence/");
    shape(site.titleByLocale, ["zh-CN", "en"]);
    assert(Object.values(site.titleByLocale).every(label => typeof label === "string" && label.trim()));
  }
  assert.equal(new Set(value.sites.map(site => site.base)).size, 2);
  assert(Array.isArray(value.resources) && value.resources.length === 3);
  assert.equal(new Set(value.resources.map(item => JSON.stringify([item.package, item.subpath]))).size, 3);
  for (const item of value.resources) {
    shape(item, ["package", "subpath", "site"]);
    assert(value.packages.includes(item.package) && value.sites.some(site => site.id === item.site));
    assert(typeof item.subpath === "string" && /^\.\/[a-zA-Z0-9./-]+\.json$/u.test(item.subpath));
    assert(!item.subpath.slice(2).split("/").some(part => !part || part === "." || part === ".."));
  }
}

/**
 * @lang zh-CN 读取并验证已确认清单，每次返回独立JSON对象。
 * @lang en Read and validate the confirmed registry, returning independent JSON data each time.
 * @returns {object} 已核包/站点/资源选择。 Validated package/site/resource selection.
 * @throws {Error} 清单内容无效或不可读。 Invalid or unreadable registry.
 */
export function loadJavaScriptReferenceInputs() {
  const value = JSON.parse(fs.readFileSync(new URL("../reference/javascript-reference-inputs.json", import.meta.url), "utf8"));
  assertJavaScriptReferenceInputs(value);
  return value;
}

/**
 * @lang zh-CN 沿既有栏目职责，为当前分区设置实际语言与预览版本入口。
 * @lang en Set actual locale and preview-version targets for the current partition under existing tab responsibilities.
 * @param {object} registry - 已核清单。 Validated registry.
 * @param {string} id - 当前分区。 Current partition.
 * @returns {object} 既有导航契约数据。 Existing navigation-contract data.
 * @throws {Error} 清单或分区身份无效。 Invalid registry or partition identity.
 */
export function createJavaScriptReferenceNavigation(registry, id) {
  assertJavaScriptReferenceInputs(registry);
  const site = registry.sites.find(site => site.id === id);
  assert(site, "Unknown JavaScript reference partition.");
  const targets = Object.fromEntries(["zh-CN", "en"].map(locale => [locale, site.base + site.path + locale + "/"]));
  const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", "/HIA-Documentation-API/");
  navigation.localeTargets = targets;
  navigation.documentationVersion.entries[0].hrefByLocale = targets;
  assertDocumentationSiteNavigation(navigation);
  return navigation;
}

/**
 * @lang zh-CN 将实际根/成员/数组槽位按物理声明包分组，资源成员保留独立证明。
 * @lang en Group actual roots/members/array slots by their physical declaring package, retaining separate resource-member evidence.
 * @param {object} inventory - 当前独立编译器清单。 Current independent compiler inventory.
 * @param {object} proof - 本次真实原生及资源审核层。 Current actual native/resource audit layer.
 * @returns {{groups:object[],members:object[]}} 来源分组与逐访问路径证据。 Source groups and per-access-path evidence.
 */
export function groupJavaScriptPublicationDeclarations(inventory, proof) {
  const groups = new Map();
  const members = [];
  for (const pack of inventory.packages) for (const module of pack.modules) for (const root of module.exports) {
    for (const binding of [{...root, memberPath: []}, ...(root.members ?? []), ...(root.declaredArrayMembers ?? [])]) {
      let prior;
      if (binding.memberPath.length) {
        const matches = [...proof.rows, ...proof.declaredArrayRows].filter(row => row.package === pack.name && row.module === module.path && row.name === root.name && JSON.stringify(row.memberPath) === JSON.stringify(binding.memberPath));
        assert.equal(matches.length, 1, "Missing or ambiguous member proof.");
        prior = matches[0];
        assert.deepEqual(prior.originalDeclarations, binding.declarations, "Member source changed.");
        assert(prior.contentVerified || prior.sourceRangeVerified, "Unverified member content.");
        if (prior.evidenceKind === "schema-resource") {
          members.push({package: pack.name, module: module.path, name: root.name, memberPath: binding.memberPath, schemaEvidence: prior.schemaEvidence});
          continue;
        }
      }
      for (const declaration of binding.declarations) {
        // <lang><zh-CN>公开暴露包与真实声明owner分别保留，最长包根决定跨模块归属。</zh-CN><en>Retain exposing packages separately from declaring owners, using the longest package root for cross-module ownership.</en></lang>
        const owner = inventory.packages.filter(candidate => candidate.owner === pack.owner && (!candidate.directory || declaration.path.startsWith(candidate.directory + "/")))
          .sort((left, right) => right.directory.length - left.directory.length)[0];
        assert(owner, "Declaration has no audited physical owner.");
        const source = "HIA/" + pack.owner + "/" + declaration.path;
        if (!groups.has(source)) groups.set(source, {pack: owner, source, declarationPath: declaration.path, bindings: []});
        groups.get(source).bindings.push({...binding, declarations: [declaration]});
        if (binding.memberPath.length) members.push({package: pack.name, module: module.path, name: root.name, memberPath: binding.memberPath, source, declarations: prior.declarations});
      }
    }
  }
  return {groups: [...groups.values()], members};
}
