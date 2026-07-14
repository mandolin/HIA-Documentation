import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBaseUrl = process.env.HIA_REFERENCE_PAGES_URL ?? "https://mandolin.github.io/HIA-Documentation/";
const defaultWarnAgeHours = Number(process.env.HIA_REFERENCE_WARN_AGE_HOURS ?? "48");
const defaultMaxAgeHours = Number(process.env.HIA_REFERENCE_MAX_AGE_HOURS ?? "168");

const options = parseArguments(process.argv.slice(2));
const publicBaseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
const warnAgeHours = Number(options.warnAgeHours ?? defaultWarnAgeHours);
const maxAgeHours = Number(options.maxAgeHours ?? defaultMaxAgeHours);
const requireFreshSources = Boolean(options.requireFreshSources);
const skipSourceFreshness = Boolean(options.skipSourceFreshness);

const definition = JSON.parse(await readFile(path.join(rootDir, "reference", "public-reference-build.definition.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "catalog.json"), "utf8"));
const results = [];

await main();

/**
 * 运行公开 reference 的运维级检查，并把硬失败与可观察告警分开。
 * Runs operational checks for the public reference while separating hard failures from observable warnings.
 */
async function main() {
  const [pagesManifest, referenceBuild] = await Promise.all([
    fetchJson("reference-pages.json"),
    fetchJson("reference-build.json")
  ]);

  checkPagesManifest(pagesManifest, referenceBuild);
  checkReferenceBuild(referenceBuild);
  await checkRoutes(pagesManifest);
  await checkSchemas();

  if (!skipSourceFreshness) {
    await checkSourceFreshness(referenceBuild.sources ?? []);
  }

  printSummary();
  const failures = results.filter((result) => result.level === "fail");
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 校验 Pages manifest 的 contract、隐私策略、provenance 与发布时间年龄。
 * Validates the Pages manifest contract, privacy policy, provenance, and publication age.
 */
function checkPagesManifest(siteManifest, referenceBuild) {
  record(siteManifest.contract === "hia-reference-pages", "PAGES_CONTRACT", "Reference Pages contract is stable.", "Published Reference Pages contract drifted.");
  record(siteManifest.defaultLocale === "en", "PAGES_DEFAULT_LOCALE", "Reference Pages default locale is en.", "Reference Pages default locale drifted.");
  record(siteManifest.privacy?.status === "pass", "PAGES_PRIVACY", "Reference Pages privacy status is pass.", "Reference Pages privacy status is not pass.");
  record(siteManifest.privacy?.sourcesContentPolicy === "none", "PAGES_SOURCES_CONTENT_POLICY", "Reference Pages does not embed sourcesContent.", "Reference Pages sourcesContent policy drifted.");
  record(siteManifest.provenance?.sourceCount === definition.sources.length, "PAGES_SOURCE_COUNT", `Reference Pages records ${definition.sources.length} sources.`, "Reference Pages provenance source count drifted.");
  record(siteManifest.provenance?.sourceCount === referenceBuild.sources?.length, "PAGES_BUILD_PROVENANCE", "Reference Pages and reference-build source counts agree.", "Reference Pages and reference-build source counts differ.");
  if (siteManifest.versioning) {
    record(siteManifest.versioning.strategy === "current-and-releases", "PAGES_VERSIONING_STRATEGY", "Reference Pages use current-and-releases versioning.", "Reference Pages versioning strategy drifted.");
    record(siteManifest.versioning.current?.path === "current/", "PAGES_CURRENT_PATH", "Reference Pages current route is stable.", "Reference Pages current route drifted.");
    record(Array.isArray(siteManifest.versioning.releases) && siteManifest.versioning.releases.length >= 1, "PAGES_RELEASE_INVENTORY", "Reference Pages expose at least one release snapshot.", "Reference Pages release snapshot inventory is missing.");
  }

  const ageHours = getAgeHours(siteManifest.generatedAt);
  record(Number.isFinite(ageHours), "PAGES_GENERATED_AT", "Reference Pages generatedAt is parseable.", "Reference Pages generatedAt is missing or invalid.");
  if (Number.isFinite(ageHours)) {
    if (ageHours > maxAgeHours) {
      add("fail", "PAGES_MAX_AGE", `Reference Pages are ${ageHours.toFixed(1)}h old, exceeding ${maxAgeHours}h.`);
    } else if (ageHours > warnAgeHours) {
      add("warn", "PAGES_WARN_AGE", `Reference Pages are ${ageHours.toFixed(1)}h old, exceeding warning threshold ${warnAgeHours}h.`);
    } else {
      add("pass", "PAGES_AGE", `Reference Pages are ${ageHours.toFixed(1)}h old.`);
    }
  }
}

/**
 * 校验 reference-build manifest 和 build definition 的 source allowlist 是否一致。
 * Validates the reference-build manifest against the source allowlist from the build definition.
 */
function checkReferenceBuild(referenceBuild) {
  record(referenceBuild.contract === "hia-public-reference-build", "BUILD_CONTRACT", "Reference build contract is stable.", "Reference build contract drifted.");
  record(referenceBuild.privacy?.status === "pass", "BUILD_PRIVACY", "Reference build privacy status is pass.", "Reference build privacy status is not pass.");
  record(referenceBuild.privacy?.workZonePublicInput === false, "BUILD_WORKZONE_EXCLUDED", "WorkZone is excluded from public reference input.", "Reference build may include WorkZone input.");

  const sources = new Map((referenceBuild.sources ?? []).map((source) => [source.id, source]));
  for (const expected of definition.sources) {
    const actual = sources.get(expected.id);
    record(Boolean(actual), `SOURCE_PRESENT_${expected.id}`, `Source ${expected.id} is present.`, `Source ${expected.id} is missing from reference build.`);
    if (!actual) {
      continue;
    }
    record(actual.repository === expected.repository, `SOURCE_REPOSITORY_${expected.id}`, `Source ${expected.id} repository matches allowlist.`, `Source ${expected.id} repository drifted.`);
    record(actual.ref === expected.ref, `SOURCE_REF_${expected.id}`, `Source ${expected.id} ref matches allowlist.`, `Source ${expected.id} ref drifted.`);
    record(isSha(actual.commit), `SOURCE_COMMIT_${expected.id}`, `Source ${expected.id} records a resolved commit.`, `Source ${expected.id} has an invalid commit.`);
  }
}

/**
 * 检查用户入口路由仍能返回预期页面标记。
 * Checks that user-facing routes still return expected page markers.
 */
async function checkRoutes(siteManifest) {
  const routes = [
    ["", "HIA Documentation System Reference"],
    ["en/", "HIA Documentation System Reference"],
    ["zh-CN/", "HIA Documentation System Reference"],
    ["source-linkage/", "HIA Public Reference Source Linkage"]
  ];
  if (siteManifest.versioning?.strategy === "current-and-releases") {
    const release = siteManifest.versioning.releases?.[0];
    routes.push(
      ["current/", "HIA Documentation System Reference"],
      ["current/en/", "HIA Documentation System Reference"],
      ["current/zh-CN/", "HIA Documentation System Reference"],
      ["current/source-linkage/", "HIA Public Reference Source Linkage"],
      ["versions/", "HIA Reference Versions"]
    );
    if (release?.path) {
      routes.push(
        [release.path, "HIA Documentation System Reference"],
        [`${release.path}en/`, "HIA Documentation System Reference"],
        [`${release.path}zh-CN/`, "HIA Documentation System Reference"],
        [`${release.path}source-linkage/`, "HIA Public Reference Source Linkage"]
      );
    }
  }
  for (const [route, marker] of routes) {
    const page = await fetchText(route);
    record(page.includes(marker), `ROUTE_${route || "root"}`, `Route ${route || "/"} contains expected marker.`, `Route ${route || "/"} is missing expected marker.`);
    record(page.includes("hia-reference-site-nav"), `ROUTE_NAV_${route || "root"}`, `Route ${route || "/"} contains reference navigation.`, `Route ${route || "/"} is missing reference navigation.`);
  }
}

/**
 * 检查 schema catalog 与 canonical/alias schema URL 仍保持稳定。
 * Checks that the schema catalog and canonical/alias schema URLs remain stable.
 */
async function checkSchemas() {
  const publishedCatalog = await fetchJson("schemas/catalog.json");
  record(publishedCatalog.catalogVersion === catalog.catalogVersion, "SCHEMA_CATALOG_VERSION", "Schema catalog version matches source.", "Schema catalog version drifted.");
  record(publishedCatalog.publicBaseUrl === catalog.publicBaseUrl, "SCHEMA_PUBLIC_BASE_URL", "Schema public base URL matches source.", "Schema public base URL drifted.");

  for (const entry of catalog.schemas) {
    const canonicalFile = path.posix.basename(new URL(entry.publicUrl).pathname);
    const [canonicalSchema, aliasSchema] = await Promise.all([
      fetchJson(`schemas/${canonicalFile}`),
      fetchJson(`schemas/${entry.path.replace(/^\.\//, "")}`)
    ]);
    record(canonicalSchema.$id === entry.schemaId, `SCHEMA_CANONICAL_${entry.key}`, `${entry.key} canonical schema id is stable.`, `${entry.key} canonical schema id drifted.`);
    record(aliasSchema.$id === entry.schemaId, `SCHEMA_ALIAS_${entry.key}`, `${entry.key} package-style alias resolves.`, `${entry.key} package-style alias drifted.`);
  }
}

/**
 * 比较已发布 source commit 与 GitHub 上当前 ref，默认告警，严格模式下失败。
 * Compares published source commits with the current GitHub refs; warnings by default, failures in strict mode.
 */
async function checkSourceFreshness(sources) {
  for (const source of sources) {
    if (!source.repository || !source.ref || !source.commit) {
      add("fail", `FRESHNESS_SHAPE_${source.id ?? "unknown"}`, `Source ${source.id ?? "unknown"} lacks repository/ref/commit.`);
      continue;
    }

    const latest = await fetchLatestCommit(source.repository, source.ref).catch((error) => {
      add("warn", `FRESHNESS_FETCH_${source.id}`, `Could not fetch latest commit for ${source.repository}@${source.ref}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (!latest) {
      continue;
    }

    if (latest === source.commit) {
      add("pass", `FRESHNESS_${source.id}`, `Source ${source.id} is fresh at ${source.commit.slice(0, 12)}.`);
      continue;
    }

    const level = requireFreshSources ? "fail" : "warn";
    add(level, `FRESHNESS_${source.id}`, `Source ${source.id} is stale: published ${source.commit.slice(0, 12)}, current ${latest.slice(0, 12)}.`);
  }
}

async function fetchLatestCommit(repository, ref) {
  const response = await fetch(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(ref)}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "hia-reference-operations-check"
    }
  });
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!isSha(payload.sha)) {
    throw new Error("GitHub API response did not include a commit sha.");
  }
  return payload.sha;
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
  url.searchParams.set("hia_reference_operations_check", Date.now().toString());
  const response = await fetch(url, { headers: { accept } });
  if (!response.ok) {
    throw new Error(`${url.origin}${url.pathname} returned HTTP ${response.status}.`);
  }
  return response;
}

function printSummary() {
  const counts = {
    pass: results.filter((result) => result.level === "pass").length,
    warn: results.filter((result) => result.level === "warn").length,
    fail: results.filter((result) => result.level === "fail").length
  };

  for (const result of results) {
    const prefix = result.level.toUpperCase().padEnd(4);
    console.log(`[${prefix}] ${result.code}: ${result.message}`);
  }
  console.log(`Reference operations check completed: ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail.`);
}

function record(condition, code, passMessage, failMessage) {
  add(condition ? "pass" : "fail", code, condition ? passMessage : failMessage);
}

function add(level, code, message) {
  results.push({ level, code, message });
}

function getAgeHours(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return Number.NaN;
  }
  return (Date.now() - timestamp) / 3_600_000;
}

function isSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function normalizeBaseUrl(value) {
  return new URL(value.endsWith("/") ? value : `${value}/`);
}

function parseArguments(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--base-url" || argument === "--warn-age-hours" || argument === "--max-age-hours") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      parsed[toCamel(argument.slice(2))] = value;
      index += 1;
      continue;
    }
    if (argument === "--require-fresh-sources") {
      parsed.requireFreshSources = true;
      continue;
    }
    if (argument === "--skip-source-freshness") {
      parsed.skipSourceFreshness = true;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}
