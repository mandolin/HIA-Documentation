import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReferenceDir = path.join(rootDir, "dist", "public-reference-build");
const defaultSchemaSiteDir = path.join(rootDir, "dist", "schema-pages");
const defaultOutputDir = path.join(rootDir, "dist", "reference-pages");
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
  const outputDir = path.resolve(options.out ?? defaultOutputDir);

  await assertDirectory(referenceDir, "Public reference build output is missing");
  await assertDirectory(schemaSiteDir, "Schema Pages build output is missing");
  await assertDirectory(path.join(schemaSiteDir, "schemas"), "Schema Pages namespace is missing");

  const referenceBuild = await readJson(path.join(referenceDir, "reference-build.json"));
  const schemaCatalog = await readJson(path.join(schemaSiteDir, "schemas", "catalog.json"));
  assert(referenceBuild.contract === "hia-public-reference-build", "Unexpected public reference build contract.");
  assert(referenceBuild.privacy?.status === "pass", "Public reference build did not pass its privacy boundary.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Public reference provenance is incomplete.");
  assert(schemaCatalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Unexpected schema Pages base URL.");

  for (const locale of supportedLocales) {
    await assertFile(path.join(referenceDir, locale, "index.html"), `Public reference locale is missing: ${locale}`);
  }
  await assertFile(path.join(referenceDir, "source-linkage", "index.html"), "Public source-linkage panel is missing");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  // Only runtime-facing files are copied. Producer intermediates stay out of the Pages artifact.
  await copyVisibleTree(path.join(referenceDir, "en"), outputDir);
  for (const locale of supportedLocales) {
    await copyVisibleTree(path.join(referenceDir, locale), path.join(outputDir, locale));
  }
  await copyVisibleTree(path.join(referenceDir, "source-linkage"), path.join(outputDir, "source-linkage"));
  await copyVisibleTree(path.join(schemaSiteDir, "schemas"), path.join(outputDir, "schemas"));
  await copyFile(path.join(referenceDir, "reference-build.json"), path.join(outputDir, "reference-build.json"));
  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");
  for (const assetRoot of [
    path.join(outputDir, "assets"),
    path.join(outputDir, "en", "assets"),
    path.join(outputDir, "zh-CN", "assets")
  ]) {
    await writeReferenceSiteCss(path.join(assetRoot, "hia-reference-site.css"));
  }

  await decoratePortalPage(path.join(outputDir, "index.html"), createPortalNavigation({
    rootPrefix: "./",
    englishPrefix: "en/",
    chinesePrefix: "zh-CN/",
    sourceLinkagePrefix: "source-linkage/",
    schemaPrefix: "schemas/"
  }));
  await decoratePortalPage(path.join(outputDir, "en", "index.html"), createPortalNavigation({
    rootPrefix: "../",
    englishPrefix: "./",
    chinesePrefix: "../zh-CN/",
    sourceLinkagePrefix: "../source-linkage/",
    schemaPrefix: "../schemas/"
  }));
  await decoratePortalPage(path.join(outputDir, "zh-CN", "index.html"), createPortalNavigation({
    rootPrefix: "../",
    englishPrefix: "../en/",
    chinesePrefix: "./",
    sourceLinkagePrefix: "../source-linkage/",
    schemaPrefix: "../schemas/"
  }));
  await decorateSourceLinkagePage(path.join(outputDir, "source-linkage", "index.html"));

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
      schemas: "schemas/index.html"
    },
    provenance: {
      referenceBuild: "reference-build.json",
      sourceCount: referenceBuild.sources.length,
      schemaCatalog: "schemas/catalog.json",
      schemaCount: schemaCatalog.schemas.length
    },
    privacy: {
      sourcesContentPolicy: referenceBuild.privacy.sourcesContentPolicy,
      sourcePreviewPolicy: referenceBuild.privacy.sourcePreviewPolicy,
      status: "pass"
    }
  };
  await writeFile(path.join(outputDir, "reference-pages.json"), `${JSON.stringify(siteManifest, null, 2)}\n`, "utf8");

  console.log(`Reference Pages artifact generated: ${supportedLocales.length} locales, ${schemaCatalog.schemas.length} schemas at ${path.relative(rootDir, outputDir)}.`);
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
async function decorateSourceLinkagePage(filePath) {
  const original = await readFile(filePath, "utf8");
  assert(original.includes("</head>"), "Source-linkage page has no head terminator.");
  assert(original.includes('<aside class="hia-panel-sidebar">'), "Source-linkage page has no sidebar insertion point.");

  const navigation = createPortalNavigation({
    rootPrefix: "../",
    englishPrefix: "../en/",
    chinesePrefix: "../zh-CN/",
    sourceLinkagePrefix: "./",
    schemaPrefix: "../schemas/"
  });
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
    "</nav>"
  ].join("");
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
    if (argument === "--reference" || argument === "--schemas" || argument === "--out") {
      const value = args[index + 1];
      assert(value && !value.startsWith("--"), `${argument} requires a directory value.`);
      options[argument.slice(2)] = value;
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
