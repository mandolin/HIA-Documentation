import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReferenceDir = path.join(rootDir, "dist", "public-reference-build");
const defaultSchemaSiteDir = path.join(rootDir, "dist", "schema-pages");
const defaultPortalPagesDir = path.join(rootDir, "dist", "public-portal-pages");
const defaultOutputDir = path.join(rootDir, "dist", "reference-pages");
const defaultReleaseId = "0.1.0-draft";
const currentDirectory = "current";
const supportedLocales = ["en", "zh-CN"];

await main();

/**
 * 组装唯一的公开 Pages artifact，同时保持 schema namespace 的字节内容。
 * Assembles the single public Pages artifact while preserving schema namespace bytes.
 */
async function main() {
  const options = parseArguments(process.argv.slice(2));
  const referenceDir = path.resolve(options.reference ?? defaultReferenceDir);
  const schemaSiteDir = path.resolve(options.schemas ?? defaultSchemaSiteDir);
  const portalPagesDir = path.resolve(options.portalPages ?? defaultPortalPagesDir);
  const outputDir = path.resolve(options.out ?? defaultOutputDir);
  const releaseId = options.releaseId ?? defaultReleaseId;
  assert(/^[A-Za-z0-9._-]+$/.test(releaseId), "Reference Pages release id must be URL-safe.");
  const releaseDirectory = `releases/${releaseId}`;

  await assertDirectory(referenceDir, "Public reference build output is missing");
  await assertDirectory(schemaSiteDir, "Schema Pages build output is missing");
  await assertDirectory(path.join(schemaSiteDir, "schemas"), "Schema Pages namespace is missing");
  await assertDirectory(portalPagesDir, "Public portal pages output is missing");

  const referenceBuild = await readJson(path.join(referenceDir, "reference-build.json"));
  const schemaCatalog = await readJson(path.join(schemaSiteDir, "schemas", "catalog.json"));
  const portalPages = await readJson(path.join(portalPagesDir, "public-portal-pages.json"));
  assert(referenceBuild.contract === "hia-public-reference-build", "Unexpected public reference build contract.");
  assert(referenceBuild.privacy?.status === "pass", "Public reference build did not pass its privacy boundary.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Public reference provenance is incomplete.");
  assert(schemaCatalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Unexpected schema Pages base URL.");
  assert(portalPages.contract === "hia-public-portal-pages", "Unexpected public portal pages contract.");
  assert(portalPages.privacy?.status === "pass" && portalPages.privacy?.sourcesContentPolicy === "none", "Public portal pages did not pass privacy validation.");

  for (const locale of supportedLocales) {
    await assertFile(path.join(referenceDir, locale, "index.html"), `Public reference locale is missing: ${locale}`);
  }
  await assertFile(path.join(referenceDir, "source-linkage", "index.html"), "Public source-linkage panel is missing");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await writeReferenceSnapshot(referenceDir, outputDir, "");
  await writeReferenceSnapshot(referenceDir, outputDir, currentDirectory);
  await writeReferenceSnapshot(referenceDir, outputDir, releaseDirectory);
  await mergePublicPortalPages(portalPagesDir, outputDir);
  await copyVisibleTree(path.join(schemaSiteDir, "schemas"), path.join(outputDir, "schemas"));
  await copyFile(path.join(referenceDir, "reference-build.json"), path.join(outputDir, "reference-build.json"));
  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");

  const versionIndex = createVersionIndex(releaseId, referenceBuild, schemaCatalog);
  await writeVersionsIndex(outputDir, versionIndex);
  await writeFile(path.join(outputDir, "versions.json"), `${JSON.stringify(versionIndex, null, 2)}\n`, "utf8");

  const siteManifest = {
    contract: "hia-reference-pages",
    contractVersion: "0.1.0-draft",
    generatedAt: new Date().toISOString(),
    defaultLocale: "en",
    locales: supportedLocales,
    routes: {
      root: "index.html",
      en: "en/index.html",
      zhCN: "zh-CN/index.html",
      sourceLinkage: "source-linkage/index.html",
      schemas: "schemas/index.html",
      current: "current/index.html",
      currentEn: "current/en/index.html",
      currentZhCN: "current/zh-CN/index.html",
      currentSourceLinkage: "current/source-linkage/index.html",
      versions: "versions/index.html",
      releases: "releases/",
      release: `${releaseDirectory}/index.html`,
      releaseEn: `${releaseDirectory}/en/index.html`,
      releaseZhCN: `${releaseDirectory}/zh-CN/index.html`,
      releaseSourceLinkage: `${releaseDirectory}/source-linkage/index.html`,
      publicPortalPages: "public-portal-pages.json",
      publicPortalSearchIndex: "assets/public-portal-search-index.json"
    },
    versioning: versionIndex.versioning,
    provenance: {
      referenceBuild: "reference-build.json",
      sourceCount: referenceBuild.sources.length,
      schemaCatalog: "schemas/catalog.json",
      schemaCount: schemaCatalog.schemas.length,
      publicPortalPages: "public-portal-pages.json",
      publicPortalPageCount: portalPages.locales.reduce((total, locale) => total + locale.pages, 0)
    },
    compatibleMerge: {
      contract: "hia-compatible-reference-pages-merge",
      contractVersion: "0.1.0-draft",
      strategy: "preserve-reference-pages-and-merge-public-portal-routes",
      preservedRouteClasses: ["root aliases", "current snapshot", "release snapshot", "schemas namespace", "versions index", "source-linkage"],
      mergedRouteSets: {
        publicPortal: {
          contract: portalPages.contract,
          contractVersion: portalPages.contractVersion,
          manifest: "public-portal-pages.json",
          searchIndex: "assets/public-portal-search-index.json",
          localeCount: portalPages.locales.length
        }
      }
    },
    privacy: {
      sourcesContentPolicy: referenceBuild.privacy.sourcesContentPolicy,
      sourcePreviewPolicy: referenceBuild.privacy.sourcePreviewPolicy,
      status: "pass"
    }
  };
  await writeFile(path.join(outputDir, "reference-pages.json"), `${JSON.stringify(siteManifest, null, 2)}\n`, "utf8");

  console.log(`Reference Pages artifact generated: ${supportedLocales.length} locales, ${schemaCatalog.schemas.length} schemas, 1 release snapshot at ${path.relative(rootDir, outputDir)}.`);
}

/**
 * 合并公开门户生成页，但保留旧 reference root/current/release/source-linkage 入口。
 * Merges generated public portal pages while preserving legacy reference root/current/release/source-linkage entries.
 */
async function mergePublicPortalPages(portalPagesDir, outputDir) {
  await copyFile(path.join(portalPagesDir, "public-portal-pages.json"), path.join(outputDir, "public-portal-pages.json"));
  await copyVisibleTree(path.join(portalPagesDir, "assets"), path.join(outputDir, "assets"));

  for (const locale of supportedLocales) {
    for (const segment of ["packages", "doc-lines", "adoption", "operations", "docs", "search"]) {
      await copyVisibleTree(path.join(portalPagesDir, locale, segment), path.join(outputDir, locale, segment));
    }
  }
}

/**
 * 写入一个 runtime-facing reference snapshot；同一份构建可作为兼容根、current 和 release snapshot。
 * Writes a runtime-facing reference snapshot; the same build can serve the compatibility root, current, and release snapshot.
 */
async function writeReferenceSnapshot(referenceDir, outputDir, snapshotRoot) {
  const targetRoot = resolveOutputPath(outputDir, snapshotRoot);

  // Only runtime-facing files are copied. Producer intermediates stay out of the Pages artifact.
  await copyVisibleTree(path.join(referenceDir, "en"), targetRoot);
  for (const locale of supportedLocales) {
    await copyVisibleTree(path.join(referenceDir, locale), path.join(targetRoot, locale));
  }
  await copyVisibleTree(path.join(referenceDir, "source-linkage"), path.join(targetRoot, "source-linkage"));

  for (const assetRoot of [
    path.join(targetRoot, "assets"),
    path.join(targetRoot, "en", "assets"),
    path.join(targetRoot, "zh-CN", "assets")
  ]) {
    await writeReferenceSiteCss(path.join(assetRoot, "hia-reference-site.css"));
  }

  await decoratePortalPage(resolveOutputPath(outputDir, joinPosix(snapshotRoot, "index.html")), createNavigationForPage(snapshotRoot, snapshotRoot));
  await decoratePortalPage(resolveOutputPath(outputDir, joinPosix(snapshotRoot, "en/index.html")), createNavigationForPage(joinPosix(snapshotRoot, "en"), snapshotRoot));
  await decoratePortalPage(resolveOutputPath(outputDir, joinPosix(snapshotRoot, "zh-CN/index.html")), createNavigationForPage(joinPosix(snapshotRoot, "zh-CN"), snapshotRoot));
  await decorateSourceLinkagePage(
    resolveOutputPath(outputDir, joinPosix(snapshotRoot, "source-linkage/index.html")),
    createNavigationForPage(joinPosix(snapshotRoot, "source-linkage"), snapshotRoot)
  );
}

/**
 * 复制不含隐藏条目的静态树，避免把 producer 中间产物误发布到 Pages。
 * Copies a static tree without hidden entries so producer intermediates cannot reach Pages.
 */
async function copyVisibleTree(sourceDir, targetDir) {
  await assertDirectory(sourceDir, `Required public source directory is missing: ${sourceDir}`);
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyVisibleTree(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
      continue;
    }
    throw new Error(`Public Pages source contains an unsupported filesystem entry: ${sourcePath}`);
  }
}

/**
 * 为三个 portal 入口植入跨文档导航，但不改写 renderer 自身的输出语义。
 * Adds cross-reference navigation to portal entries without changing renderer semantics.
 */
async function decoratePortalPage(filePath, navigation) {
  const original = await readFile(filePath, "utf8");
  assert(original.includes("</head>"), `Portal page has no head terminator: ${filePath}`);
  assert(original.includes('<aside class="hia-sidebar">'), `Portal page has no sidebar insertion point: ${filePath}`);

  const withStyle = original.replace("</head>", '<link rel="stylesheet" href="assets/hia-reference-site.css"></head>');
  const decorated = withStyle.replace('<aside class="hia-sidebar">', `<aside class="hia-sidebar">${navigation}`);
  await writeFile(filePath, decorated, "utf8");
}

/**
 * 为独立 source-linkage 页面提供返回文档和 schema 的稳定入口。
 * Gives the standalone source-linkage page stable links back to documentation and schemas.
 */
async function decorateSourceLinkagePage(filePath, navigation) {
  const original = await readFile(filePath, "utf8");
  assert(original.includes("</head>"), "Source-linkage page has no head terminator.");
  assert(original.includes('<aside class="hia-panel-sidebar">'), "Source-linkage page has no sidebar insertion point.");

  const withStyle = original.replace("</head>", '<link rel="stylesheet" href="../assets/hia-reference-site.css"></head>');
  const decorated = withStyle.replace('<aside class="hia-panel-sidebar">', `<aside class="hia-panel-sidebar">${navigation}`);
  await writeFile(filePath, decorated, "utf8");
}

function createPortalNavigation(prefixes) {
  return [
    '<nav class="hia-reference-site-nav" aria-label="HIA reference navigation">',
    `<a href="${prefixes.rootPrefix}">Overview</a>`,
    `<a href="${prefixes.englishPrefix}">English</a>`,
    `<a href="${prefixes.chinesePrefix}">中文</a>`,
    `<a href="${prefixes.sourceLinkagePrefix}">Source linkage</a>`,
    `<a href="${prefixes.schemaPrefix}">Schemas</a>`,
    `<a href="${prefixes.currentPrefix}">Current</a>`,
    `<a href="${prefixes.versionsPrefix}">Versions</a>`,
    "</nav>"
  ].join("");
}

function createNavigationForPage(pageDir, snapshotRoot) {
  return createPortalNavigation({
    rootPrefix: relativeDirectoryLink(pageDir, snapshotRoot),
    englishPrefix: relativeDirectoryLink(pageDir, joinPosix(snapshotRoot, "en")),
    chinesePrefix: relativeDirectoryLink(pageDir, joinPosix(snapshotRoot, "zh-CN")),
    sourceLinkagePrefix: relativeDirectoryLink(pageDir, joinPosix(snapshotRoot, "source-linkage")),
    schemaPrefix: relativeDirectoryLink(pageDir, "schemas"),
    currentPrefix: relativeDirectoryLink(pageDir, currentDirectory),
    versionsPrefix: relativeDirectoryLink(pageDir, "versions")
  });
}

async function writeVersionsIndex(outputDir, versionIndex) {
  const versionsDir = path.join(outputDir, "versions");
  await mkdir(versionsDir, { recursive: true });
  await writeFile(path.join(versionsDir, "index.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HIA Reference Versions</title>
  <link rel="stylesheet" href="../assets/hia-reference-site.css">
</head>
<body>
  <main class="hia-reference-version-index">
    <h1>HIA Reference Versions</h1>
    <nav class="hia-reference-site-nav" aria-label="HIA reference navigation">
      <a href="../">Overview</a>
      <a href="../current/">Current</a>
      <a href="../schemas/">Schemas</a>
      <a href="../source-linkage/">Source linkage</a>
    </nav>
    <section>
      <h2>Current</h2>
      <p><a href="../${versionIndex.versioning.current.path}">${versionIndex.versioning.current.label}</a></p>
    </section>
    <section>
      <h2>Release Snapshots</h2>
      <ul>
${versionIndex.versioning.releases.map((release) => `        <li><a href="../${release.path}">${release.label}</a></li>`).join("\n")}
      </ul>
    </section>
  </main>
</body>
</html>
`, "utf8");
}

function createVersionIndex(releaseId, referenceBuild, schemaCatalog) {
  const releaseDirectory = `releases/${releaseId}/`;
  return {
    contract: "hia-reference-version-index",
    contractVersion: "0.1.0-draft",
    generatedAt: new Date().toISOString(),
    versioning: {
      strategy: "current-and-releases",
      current: {
        id: "current",
        label: "Current",
        path: `${currentDirectory}/`,
        source: "reference-build.json"
      },
      releases: [
        {
          id: releaseId,
          label: releaseId,
          path: releaseDirectory,
          source: "reference-build.json"
        }
      ],
      compatibilityAliases: {
        root: "current",
        en: "current/en",
        zhCN: "current/zh-CN",
        sourceLinkage: "current/source-linkage"
      },
      searchPartitions: [
        ...supportedLocales.map((locale) => ({
          id: `current:${locale}`,
          version: "current",
          locale,
          projectIndex: `${currentDirectory}/${locale}/project-index.json`
        })),
        ...supportedLocales.map((locale) => ({
          id: `${releaseId}:${locale}`,
          version: releaseId,
          locale,
          projectIndex: `${releaseDirectory}${locale}/project-index.json`
        }))
      ]
    },
    provenance: {
      sourceCount: referenceBuild.sources.length,
      schemaCount: schemaCatalog.schemas.length
    }
  };
}

async function writeReferenceSiteCss(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `
.hia-reference-site-nav { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 16px; }
.hia-reference-site-nav a { border: 1px solid #cbd5e1; border-radius: 6px; color: #0f4c5c; font-size: 13px; line-height: 1.2; padding: 6px 8px; text-decoration: none; }
.hia-reference-site-nav a:hover, .hia-reference-site-nav a:focus-visible { background: #e6f4f1; border-color: #0f766e; outline: none; }
`, "utf8");
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--reference" || argument === "--schemas" || argument === "--portal-pages" || argument === "--out" || argument === "--release-id") {
      const value = args[index + 1];
      assert(value && !value.startsWith("--"), `${argument} requires a directory value.`);
      options[toCamel(argument.slice(2))] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function assertDirectory(directoryPath, message) {
  const entry = await stat(directoryPath).catch(() => null);
  assert(entry?.isDirectory(), message);
}

async function assertFile(filePath, message) {
  const entry = await stat(filePath).catch(() => null);
  assert(entry?.isFile(), message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveOutputPath(root, relativePath) {
  return path.join(root, ...relativePath.split("/").filter(Boolean));
}

function joinPosix(...segments) {
  return segments.filter(Boolean).join("/");
}

function relativeDirectoryLink(fromDir, toDir) {
  const from = fromDir || ".";
  const to = toDir || ".";
  const relative = path.posix.relative(from, to);
  return relative ? `${relative}/` : "./";
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}
