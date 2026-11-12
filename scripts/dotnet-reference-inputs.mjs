/** @file @lang zh-CN 核固定DotNetDoc工具包、原资源和已确认独立站导航。 @lang en Validate fixed DotNetDoc tool packages, original resources and confirmed independent-site navigation. */
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
 * @lang zh-CN 仅接纳已登记DotNetDoc六包、十六个原JSON导出及已确认A路线。
 * @lang en Accept only the six registered DotNetDoc packages, sixteen original JSON exports and confirmed route A.
 * @param {object} value - 待核正常生产清单。 Production registry to validate.
 * @returns {void} 清单符合时返回。 Return for a valid registry.
 * @throws {Error} 包、资源、路由、标题或未知字段不符。 Invalid package, resource, route, title or unknown fields.
 */
export function assertDotNetReferenceInputs(value) {
  shape(value, ["description", "packages", "sites", "resources"]);
  // <lang><zh-CN>必要包清单是包选择的事实源，资源固定两代配置和七类领域schema的十六个原始导出。</zh-CN><en>The required-package registry owns package selection; resources pin sixteen original exports across two configuration generations and seven domain schemas.</en></lang>
  const scope = JSON.parse(fs.readFileSync(new URL("../reference/required-package-api.inputs.json", import.meta.url), "utf8"));
  const names = scope.packages.filter(pack => pack.owner === "hia-dotnetdoc").map(pack => pack.name);
  assert(Array.isArray(value.packages) && value.packages.length === 6 && new Set(value.packages).size === 6);
  assert.deepEqual([...value.packages].sort(), names.sort());
  assert(Array.isArray(value.sites) && value.sites.length === 1);
  const site = value.sites[0];
  shape(site, ["id", "repository", "base", "path", "titleByLocale"]);
  assert.equal(site.id, "dotnet-api");
  assert.equal(site.repository, "mandolin/HIA-Documentation-API-DotNetDoc");
  assert.equal(site.base, "/HIA-Documentation-API-DotNetDoc/");
  assert.equal(site.path, "");
  shape(site.titleByLocale, ["zh-CN", "en"]);
  assert(Object.values(site.titleByLocale).every(text => typeof text === "string" && text.trim()));
  const selectors = [
    [
      "@hia-doc/dotnetdoc-runner",
      "./schemas/dotnetdoc-config-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-runner",
      "./schemas/dotnetdoc-config-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-aspnet-endpoint-extraction-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-aspnet-endpoint-extraction-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-build-warning-classification-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-build-warning-classification-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-csharp-source-extraction-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-csharp-source-extraction-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-markup-comment-extraction-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-markup-comment-extraction-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-project-discovery-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-project-discovery-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-source-relation-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-source-relation-1.0.0.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-xml-doc-extraction-0.1.0-draft.schema.json"
    ],
    [
      "@hia-doc/dotnetdoc-spec",
      "./schemas/dotnetdoc-xml-doc-extraction-1.0.0.schema.json"
    ]
  ];
  assert(Array.isArray(value.resources) && value.resources.length === 16);
  for (const resource of value.resources) {
    shape(resource, ["package", "subpath", "site"]);
    assert.equal(resource.site, "dotnet-api");
  }
  assert.deepEqual(value.resources.map(resource => JSON.stringify([resource.package, resource.subpath])).sort(), selectors.map(selector => JSON.stringify(selector)).sort());
}

/**
 * @lang zh-CN 每次读取独立清单并立即核已确认边界。
 * @lang en Read an independent registry and immediately validate confirmed boundaries.
 * @returns {object} 已验证的完整清单。 Complete validated registry.
 * @throws {Error} 文件或清单无效。 Invalid file or registry.
 */
export function loadDotNetReferenceInputs() {
  const value = JSON.parse(fs.readFileSync(new URL("../reference/dotnet-reference-inputs.json", import.meta.url), "utf8"));
  assertDotNetReferenceInputs(value);
  return value;
}

/**
 * @lang zh-CN DotNetDoc分区版本与语言指向自身，主站栏目沿已确认公共职责。
 * @lang en Target DotNetDoc's own partition for version and locale while retaining confirmed shared documentation tabs.
 * @param {object} registry - 已核DotNetDoc清单。 Validated DotNetDoc registry.
 * @param {string} id - 唯一dotnet-api分区。 The sole dotnet-api partition.
 * @returns {object} 既有导航契约数据。 Existing navigation-contract data.
 * @throws {Error} 清单或分区不符。 Invalid registry or partition.
 */
export function createDotNetReferenceNavigation(registry, id) {
  assertDotNetReferenceInputs(registry);
  assert.equal(id, "dotnet-api");
  const targets = Object.fromEntries(["zh-CN", "en"].map(locale => [locale, registry.sites[0].base + locale + "/"]));
  const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", "/HIA-Documentation-API/");
  navigation.localeTargets = targets;
  navigation.documentationVersion.entries[0].hrefByLocale = targets;
  assertDocumentationSiteNavigation(navigation);
  return navigation;
}
