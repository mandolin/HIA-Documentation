import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {assertPublicReferenceTopicUi} from "./public-reference-ui.mjs";
import {readReferenceSiteContext} from "./reference-site-context.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>发布来源数量由同一显式构建清单决定，与离线装配和上传前检查一致。</zh-CN><en>Use the same explicit build allowlist for published provenance counts, matching assembly and pre-upload checks.</en></lang>
const referenceDefinition = JSON.parse(await readFile(path.join(rootDir, "reference", "public-reference-build.definition.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "catalog.json"), "utf8"));
// <lang><zh-CN>线上历史字节必须与仓库固定索引一致，不能只检查当前 catalog 仍可访问。</zh-CN><en>Published historical bytes must match the repository's fixed index, beyond checking availability of the current catalog.</en></lang>
const schemaHistory = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "history", "index.json"), "utf8"));
const configuredBaseUrl = process.env.HIA_REFERENCE_PAGES_URL ?? "https://mandolin.github.io/HIA-Documentation/";
const publicBaseUrl = new URL(configuredBaseUrl.endsWith("/") ? configuredBaseUrl : `${configuredBaseUrl}/`);
const reportOnly = process.argv.includes("--report-only");
const maxAttempts = 12;
const retryDelayMs = 5_000;

let lastError;
for (let attempt = 1; attempt <= (reportOnly ? 1 : maxAttempts); attempt += 1) {
  try {
    const result = await checkPublication();
    console.log(`Reference Pages online check passed: ${result.routeCount} public routes, ${catalog.schemas.length} current schemas with aliases and ${schemaHistory.schemas.length} historical byte digests.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (reportOnly) {
      console.log(`Reference Pages online report-only detected drift: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(0);
    }
    if (attempt === maxAttempts) {
      break;
    }
    console.warn(`Reference Pages check attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

throw lastError;

/**
 * 验证已发布的 portal 路由、provenance 与既有 schema canonical identity。
 * Verifies published portal routes, provenance, and existing schema canonical identity.
 */
async function checkPublication() {
  const context=await readReferenceSiteContext(publicBaseUrl,fetchText);
  const siteManifest = await fetchJson("reference-pages.json");
  assert(siteManifest.contract === "hia-reference-pages", "Published Reference Pages contract drifted.");
  assert(siteManifest.defaultLocale === "en", "Published Reference Pages default locale drifted.");
  assert(siteManifest.provenance?.sourceCount === referenceDefinition.sources.length, "Published Reference Pages provenance source count drifted.");
  assert(siteManifest.routes?.publicPortalPages === "public-portal-pages.json", "Published Reference Pages public portal manifest route is missing.");
  assert(siteManifest.routes?.publicPortalSearchIndex === "assets/public-portal-search-index.json", "Published Reference Pages public portal search route is missing.");
  assert(siteManifest.compatibleMerge?.strategy === "preserve-reference-pages-and-merge-public-portal-routes", "Published Reference Pages compatible merge strategy drifted.");

  const referenceBuild = await fetchJson("reference-build.json");
  assert(referenceBuild.contract === "hia-public-reference-build", "Published public reference build contract drifted.");
  assert(referenceBuild.privacy?.status === "pass", "Published public reference privacy status drifted.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === referenceDefinition.sources.length, "Published public reference source provenance drifted.");

  const portalPages = await fetchJson("public-portal-pages.json");
  assert(portalPages.contract === "hia-public-portal-pages", "Published public portal pages contract drifted.");
  assert(portalPages.privacy?.status === "pass" && portalPages.privacy?.sourcesContentPolicy === "none", "Published public portal pages privacy status drifted.");
  const portalSearchIndex = await fetchJson("assets/public-portal-search-index.json");
  assert(portalSearchIndex.contract === "hia-public-portal-search-index", "Published public portal search index contract drifted.");

  const routeExpectations = [
    ["", context.rootMarker, context.navigationMarker],
    ["en/", "HIA Documentation System Reference", "hia-reference-site-nav"],
    ["zh-CN/", "HIA Documentation System Reference", "hia-reference-site-nav"],
    ["source-linkage/", "HIA Public Reference Source Linkage", "hia-reference-site-nav"]
  ];
  // <lang><zh-CN>独立主题直接入口须与同一正常发布一并在线可读。</zh-CN><en>Direct standalone-theme entries must be readable online as part of the same normal publication.</en></lang>
  for (const locale of ["zh-CN", "en"]) routeExpectations.push([`jsdoc/index.${locale}.html`, "ThemeRenderer", "data-hia-site-navigation"]);
  if (siteManifest.versioning?.strategy === "current-and-releases") {
    const release = siteManifest.versioning.releases?.[0];
    assert(siteManifest.versioning.current?.path === "current/", "Published current reference path drifted.");
    assert(release?.path, "Published release snapshot path is missing.");
    routeExpectations.push(
      ["current/", "HIA Documentation System Reference", "hia-reference-site-nav"],
      ["current/en/", "HIA Documentation System Reference", "hia-reference-site-nav"],
      ["current/zh-CN/", "HIA Documentation System Reference", "hia-reference-site-nav"],
      ["current/source-linkage/", "HIA Public Reference Source Linkage", "hia-reference-site-nav"],
      [release.path, "HIA Documentation System Reference", "hia-reference-site-nav"],
      [`${release.path}en/`, "HIA Documentation System Reference", "hia-reference-site-nav"],
      [`${release.path}zh-CN/`, "HIA Documentation System Reference", "hia-reference-site-nav"],
      [`${release.path}source-linkage/`, "HIA Public Reference Source Linkage", "hia-reference-site-nav"],
      ["versions/", "HIA Reference Versions", "hia-reference-site-nav"]
    );

    const versionIndex = context.versionIndex;
    assert(versionIndex.contract === "hia-reference-version-index", "Published version index contract drifted.");
    assert(versionIndex.versioning?.current?.path === "current/", "Published version index current path drifted.");
  }

  for (const locale of siteManifest.locales) {
    // <lang><zh-CN>线上索引必须含显式关键条目，包括.NET类型与方法，避免只部署了新的来源计数。</zh-CN><en>The published index must contain canonical required entries, including the .NET type and method, beyond updated provenance counts.</en></lang>
    const projectIndex = await fetchJson(`${locale}/project-index.json`);
    // <lang><zh-CN>从实际索引HTML确认当前框架，供同一语言的静态主题使用相同UI判据。</zh-CN><en>Identify the current shell from actual index HTML so static topics in this locale use the same UI criteria.</en></lang>
    const shell = await fetchText(`${locale}/`);
    // <lang><zh-CN>运维检查无需构建本地包；核实际部署的owner报告、两种语言模式和钴蓝资产。</zh-CN><en>Operations requires no local package build; check the deployed owner report, both UI-language modes and cobalt asset.</en></lang>
    const ia = projectIndex.site?.informationArchitecture;
    assert(ia?.contentGrouping === "entry" && ia.loadingStrategy === "lazy" && ia.memberPlacement === "separate" && ia.localeModel.uiLocale === locale, `${locale}: published reference UI adoption drifted.`);
    const uiReport = await fetchJson(`${locale}/documentation-ui-locale-completeness.json`);
    assert(uiReport.contract === "documentation-ui-locale-completeness" && uiReport.contractVersion === "1.0.0" && uiReport.profileId === "portal.default" && uiReport.status === "complete", `${locale}: published reference UI report is missing or incomplete.`);
    assert(uiReport.evaluations?.length === 4 && uiReport.evaluations.every(item => item.status === "complete" && item.documentLanguage === item.uiLocale && item.summary.fallback === 0 && item.summary.missing === 0), `${locale}: published UI-language evaluations drifted.`);
    assert(projectIndex.site.uiLocaleCompleteness?.path === "documentation-ui-locale-completeness.json" && projectIndex.site.uiLocaleCompleteness.status === uiReport.status, `${locale}: published UI report linkage drifted.`);
    assert(/--hia-color-accent:\s*#0047AB;/i.test(await fetchText(`${locale}/assets/hia-default.css`)), `${locale}: published cobalt brand is missing.`);
    const entryIds = new Set((projectIndex.entries ?? []).map(entry => entry.id));
    for (const entryId of referenceDefinition.acceptance.requiredEntryIds) {
      assert(entryIds.has(entryId), `${locale}: published required reference entry missing: ${entryId}`);
    }
    // <lang><zh-CN>声明和成员必须在同一类型节点下，防止来源正确但导航仍分裂的旧索引混入。</zh-CN><en>Require the declaration and member under one type node, rejecting a stale split index even when sources are valid.</en></lang>
    const sampleTypeId = "hia-document:dotnet-t-hiadocumentationsample.envelope-1";
    const sampleMemberId = "hia-document:dotnet-m-hiadocumentationsample.envelope-1.formatlabel-system.string";
    const dotnetNodes = [...(projectIndex.navigationTree ?? []).filter(node => node.id === "view:dotnet")];
    for (const node of dotnetNodes) dotnetNodes.push(...node.children ?? []);
    const sampleType = dotnetNodes.find(node => node.kind === "type" && node.entryId === sampleTypeId);
    assert(sampleType?.label === "Envelope<T>" && sampleType.entryCount === 2 && sampleType.children?.some(node => node.entryId === sampleMemberId), `${locale}: published .NET navigation is split.`);
    // <lang><zh-CN>新增.NET源码必须真实部署为同源纯文本，摘要与行号页均可消费。</zh-CN><en>Publish .NET source as consumable same-origin plain text with matching digests and line pages.</en></lang>
    for (const id of [sampleTypeId, sampleMemberId]) {
      const entry = projectIndex.entries.find(item => item.id === id);
      const localizedPage = entry?.noScriptLocalePages?.find(page => page.uiLocale === locale);
      assert(localizedPage?.path.startsWith(`pages/${locale}/`), `${locale}: published localized topic path is missing.`);
      const topicHtml = await fetchText(`${locale}/${localizedPage.path}`);
      assert(topicHtml.includes(`<html lang="${locale}"`), `${locale}: published topic UI language is missing.`);
      assertPublicReferenceTopicUi(shell, topicHtml, locale);
      const asset = entry?.source?.publicAsset;
      assert(asset && entry.source.fetchUrl === asset.relativeUrl && entry.source.linkUrl === asset.linkUrl && /^sources\/[a-f0-9]+\.txt$/.test(asset.relativeUrl), `${locale}: published .NET source asset missing.`);
      const response = await fetchWithCacheBust(`${locale}/${asset.relativeUrl}`, "text/plain");
      assert((response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/plain"), `${locale}: published .NET source MIME is invalid.`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert(bytes.length === asset.byteLength && `sha384-${createHash("sha384").update(bytes).digest("base64")}` === asset.digest, `${locale}: published .NET source integrity mismatch.`);
      const [sourcePage, fragment] = (entry.source.linkUrl ?? "").split("#");
      assert(/^sources\/[a-f0-9]+\.L[1-9][0-9]*\.html$/.test(sourcePage) && fragment === `L${entry.source.range.start.line}`, `${locale}: published .NET source line URL is invalid.`);
      const sourceHtml = await fetchText(`${locale}/${sourcePage}`);
      assert(sourceHtml.includes(`id="${fragment}"`), `${locale}: published .NET source anchor missing.`);
    }
    routeExpectations.push(
      [`${locale}/packages/`, "data-hia-public-portal-packages", "portal-nav"],
      [`${locale}/doc-lines/`, "data-hia-public-portal-doc-lines", "portal-nav"],
      [`${locale}/doc-lines/tsdoc.html`, "data-hia-public-portal-doc-line-detail", "portal-nav"],
      [`${locale}/doc-lines/dotnetdoc.html`, "data-hia-public-portal-doc-line-detail", "portal-nav"],
      [`${locale}/adoption/`, "data-hia-public-portal-adoption", "portal-nav"],
      [`${locale}/adoption/cases/unicodeartjs-tsdoc.html`, "data-hia-public-portal-adoption-case", "portal-nav"],
      [`${locale}/adoption/cases/aspnetportal-dotnetdoc.html`, "data-hia-public-portal-adoption-case", "portal-nav"],
      [`${locale}/adoption/policy.html`, "data-hia-public-portal-adoption-policy", "portal-nav"],
      [`${locale}/operations/`, "data-hia-public-portal-operations", "portal-nav"],
      [`${locale}/operations/status.html`, "data-hia-public-portal-operations-status", "portal-nav"],
      [`${locale}/operations/monitor.html`, "data-hia-public-portal-operations-monitor", "portal-nav"],
      [`${locale}/operations/versions.html`, "data-hia-public-portal-operations-versions", "portal-nav"],
      [`${locale}/hosts/`, "data-hia-public-portal-hosts", "portal-nav"],
      [`${locale}/hosts/source-linkage.html`, "data-hia-public-portal-host-source-linkage", "portal-nav"],
      [`${locale}/hosts/ide-devtools.html`, "data-hia-public-portal-host-ide-devtools", "portal-nav"],
      [`${locale}/hosts/evidence.html`, "data-hia-public-portal-host-evidence", "portal-nav"],
      [`${locale}/hosts/ai-assisted-authoring.html`, "data-hia-public-portal-ai-authoring", "portal-nav"],
      [`${locale}/feedback/`, "data-hia-public-portal-feedback", "portal-nav"],
      [`${locale}/feedback/compatibility.html`, "data-hia-public-portal-feedback-compatibility", "portal-nav"],
      [`${locale}/feedback/templates.html`, "data-hia-public-portal-feedback-templates", "portal-nav"],
      [`${locale}/feedback/d4-candidates.html`, "data-hia-public-portal-feedback-d4-candidates", "portal-nav"],
      [`${locale}/docs/`, "data-hia-public-portal-docs", "portal-nav"],
      [`${locale}/docs/categories/configuration.html`, "data-hia-public-portal-docs-category", "portal-nav"],
      [`${locale}/docs/reference/reference-pages--077ce10c88.html`, "data-hia-public-docs-rendered", "portal-nav"],
      [`${locale}/docs/reference/tsdoc-quickstart--40de72c37e.html`, "data-hia-public-docs-rendered", "portal-nav"],
      [`${locale}/docs/reference/dotnetdoc-quickstart--cefba20162.html`, "data-hia-public-docs-rendered", "portal-nav"],
      [`${locale}/search/`, "data-hia-public-portal-search", "portal-nav"],
      [`${locale}/search/ecosystem.html`, "data-hia-public-portal-search-ecosystem", "portal-nav"],
      [`${locale}/search/adoption.html`, "data-hia-public-portal-search-adoption", "portal-nav"],
      [`${locale}/search/operations.html`, "data-hia-public-portal-search-operations", "portal-nav"],
      [`${locale}/search/hosts.html`, "data-hia-public-portal-search-hosts", "portal-nav"],
      [`${locale}/search/feedback.html`, "data-hia-public-portal-search-feedback", "portal-nav"],
      [`${locale}/search/docs.html`, "data-hia-public-portal-search-docs", "portal-nav"]
    );
    const searchLocale = portalSearchIndex.locales.find((entry) => entry.locale === locale);
    assert(searchLocale?.entryCount > 0 && searchLocale.entries?.length === searchLocale.entryCount, `${locale}: published public portal search index drifted.`);
  }

  for (const [route, marker, navigationMarker] of routeExpectations) {
    const page = await fetchText(route);
    assert(page.includes(marker), `Published route ${route || "/"} is missing its expected content.`);
    assert(page.includes(navigationMarker), `Published route ${route || "/"} is missing expected navigation.`);
  }

  const publishedCatalog = await fetchJson("schemas/catalog.json");
  assert(publishedCatalog.catalogVersion === catalog.catalogVersion, "Published catalog version drifted.");
  assert(publishedCatalog.publicBaseUrl === catalog.publicBaseUrl, "Published catalog base URL drifted.");

  for (const entry of catalog.schemas) {
    const canonicalFile = path.posix.basename(new URL(entry.publicUrl).pathname);
    const canonicalSchema = await fetchJson(`schemas/${canonicalFile}`);
    assert(canonicalSchema.$id === entry.schemaId, `${entry.key}: canonical schema id drifted.`);

    const aliasSchema = await fetchJson(`schemas/${entry.path.replace(/^\.\//, "")}`);
    assert(aliasSchema.$id === entry.schemaId, `${entry.key}: package-style alias does not resolve to the canonical schema.`);
  }

  // <lang><zh-CN>索引与每份旧 canonical 文件分别核验；JSON 内容相同但字节被重写也必须失败。</zh-CN><en>Verify the index and each old canonical file separately; rewritten bytes must fail even when parsed JSON is equivalent.</en></lang>
  const publishedHistory = await fetchJson("schemas/history.json");
  assert(JSON.stringify(publishedHistory) === JSON.stringify(schemaHistory), "Published schema history index drifted.");
  for (const entry of schemaHistory.schemas) {
    // <lang><zh-CN>文件名取自已审查的本地索引，不使用线上响应给出的任意 URL。</zh-CN><en>Use filenames from the reviewed local index rather than arbitrary URLs supplied by a network response.</en></lang>
    const response = await fetchWithCacheBust(`schemas/${entry.fileName}`, "application/schema+json, application/json");
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(createHash("sha256").update(bytes).digest("hex") === entry.sha256, `${entry.key}: historical schema bytes drifted.`);
    assert(JSON.parse(bytes.toString("utf8")).$id === entry.schemaId, `${entry.key}: historical schema identity drifted.`);
  }

  return { routeCount: routeExpectations.length };
}

async function fetchJson(value) {
  const response = await fetchWithCacheBust(value, "application/schema+json, application/json");
  return response.json();
}

async function fetchText(value) {
  const response = await fetchWithCacheBust(value, "text/html, text/plain");
  return response.text();
}

async function fetchWithCacheBust(value, accept) {
  const url = new URL(value, publicBaseUrl);
  url.searchParams.set("hia_reference_pages_check", Date.now().toString());
  const response = await fetch(url, { headers: { accept } });
  if (!response.ok) {
    throw new Error(`${url.origin}${url.pathname} returned HTTP ${response.status}.`);
  }
  return response;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
