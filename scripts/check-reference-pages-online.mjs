import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "catalog.json"), "utf8"));
const configuredBaseUrl = process.env.HIA_REFERENCE_PAGES_URL ?? "https://mandolin.github.io/HIA-Documentation/";
const publicBaseUrl = new URL(configuredBaseUrl.endsWith("/") ? configuredBaseUrl : `${configuredBaseUrl}/`);
const reportOnly = process.argv.includes("--report-only");
const maxAttempts = 12;
const retryDelayMs = 5_000;

let lastError;
for (let attempt = 1; attempt <= (reportOnly ? 1 : maxAttempts); attempt += 1) {
  try {
    const result = await checkPublication();
    console.log(`Reference Pages online check passed: ${result.routeCount} public routes and ${catalog.schemas.length} canonical schemas with aliases.`);
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
  const siteManifest = await fetchJson("reference-pages.json");
  assert(siteManifest.contract === "hia-reference-pages", "Published Reference Pages contract drifted.");
  assert(siteManifest.defaultLocale === "en", "Published Reference Pages default locale drifted.");
  assert(siteManifest.provenance?.sourceCount === 8, "Published Reference Pages provenance source count drifted.");
  assert(siteManifest.routes?.publicPortalPages === "public-portal-pages.json", "Published Reference Pages public portal manifest route is missing.");
  assert(siteManifest.routes?.publicPortalSearchIndex === "assets/public-portal-search-index.json", "Published Reference Pages public portal search route is missing.");
  assert(siteManifest.compatibleMerge?.strategy === "preserve-reference-pages-and-merge-public-portal-routes", "Published Reference Pages compatible merge strategy drifted.");

  const referenceBuild = await fetchJson("reference-build.json");
  assert(referenceBuild.contract === "hia-public-reference-build", "Published public reference build contract drifted.");
  assert(referenceBuild.privacy?.status === "pass", "Published public reference privacy status drifted.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Published public reference source provenance drifted.");

  const portalPages = await fetchJson("public-portal-pages.json");
  assert(portalPages.contract === "hia-public-portal-pages", "Published public portal pages contract drifted.");
  assert(portalPages.privacy?.status === "pass" && portalPages.privacy?.sourcesContentPolicy === "none", "Published public portal pages privacy status drifted.");
  const portalSearchIndex = await fetchJson("assets/public-portal-search-index.json");
  assert(portalSearchIndex.contract === "hia-public-portal-search-index", "Published public portal search index contract drifted.");

  const routeExpectations = [
    ["", "HIA Documentation System Reference", "hia-reference-site-nav"],
    ["en/", "HIA Documentation System Reference", "hia-reference-site-nav"],
    ["zh-CN/", "HIA Documentation System Reference", "hia-reference-site-nav"],
    ["source-linkage/", "HIA Public Reference Source Linkage", "hia-reference-site-nav"]
  ];
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

    const versionIndex = await fetchJson("versions.json");
    assert(versionIndex.contract === "hia-reference-version-index", "Published version index contract drifted.");
    assert(versionIndex.versioning?.current?.path === "current/", "Published version index current path drifted.");
  }

  for (const locale of siteManifest.locales) {
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
