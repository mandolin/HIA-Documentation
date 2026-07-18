import crypto from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(mainRepoRoot, "reference", "public-portal-data.json");
const docsRoot = path.join(mainRepoRoot, "docs");
const defaultOutputDir = path.join(mainRepoRoot, "dist", "public-portal-pages");

await main();

/**
 * 从公开 portal data contract 生成可发布的生态、采用、运维和公开文档入口页。
 * Generates publishable ecosystem, adoption, operations, and public-docs pages from the public portal data contract.
 */
async function main() {
  const options = parseArguments(process.argv.slice(2));
  const outputDir = path.resolve(options.out ?? defaultOutputDir);
  const data = await readJson(dataPath);

  validateData(data);
  assertPathInside(mainRepoRoot, outputDir, "Public portal pages output must stay inside main-repo.");
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(path.join(outputDir, "assets"), { recursive: true });

  const packageRows = createPackageRows(data);
  const publicDocs = await collectPublicDocuments(data);
  const localeReports = [];
  const searchLocales = [];

  await writeAssets(outputDir);
  await writeRootIndex(outputDir, data);
  for (const locale of data.project.locales) {
    const labels = getLabels(locale);
    const localeContext = { data, labels, locale, outputDir, packageRows, publicDocs };
    await writeLocaleHome(localeContext);
    await writeEcosystemPages(localeContext);
    await writeAdoptionPages(localeContext);
    await writeOperationsPages(localeContext);
    await writePublicDocsPages(localeContext);
    const search = await writeSearchPages(localeContext);
    searchLocales.push(search);
    localeReports.push({
      locale,
      pages: collectLocalePageList(data, locale).length,
      searchEntries: search.entryCount
    });
  }

  await writeJson(path.join(outputDir, "assets", "public-portal-search-index.json"), {
    contract: "hia-public-portal-search-index",
    contractVersion: "0.1.0-draft",
    locales: searchLocales
  });

  await writeJson(path.join(outputDir, "public-portal-pages.json"), {
    contract: "hia-public-portal-pages",
    contractVersion: "0.1.0-draft",
    generatedAt: new Date().toISOString(),
    sourceContract: {
      contract: data.contract,
      contractVersion: data.contractVersion,
      file: "reference/public-portal-data.json"
    },
    project: data.project,
    locales: localeReports,
    counts: {
      corePackages: data.ecosystem.corePackages.names.length,
      packageRows: packageRows.length,
      docLines: data.ecosystem.docLines.length,
      adoptionCases: data.adoption.cases.length,
      adoptionRecipes: data.adoption.recipes.length,
      operationsRouteGroups: data.operations.routeGroups.length,
      publicDocCategories: data.publicDocs.categories.length,
      publicDocs: publicDocs.length
    },
    routes: data.pageRoutes,
    privacy: {
      sourceBoundary: data.dataPolicy.sourceBoundary,
      workZonePublicInput: false,
      sourcesContentPolicy: data.dataPolicy.sourcesContentPolicy,
      status: "pass"
    }
  });

  console.log(`Public portal pages generated: ${data.project.locales.length} locale(s), ${packageRows.length} package row(s), ${publicDocs.length} public doc(s) at ${path.relative(mainRepoRoot, outputDir).replaceAll("\\", "/")}.`);
}

function validateData(data) {
  assert(data.contract === "hia-public-portal-data", "Unexpected public portal data contract.");
  assert(data.contractVersion === "0.1.0-draft", "Unexpected public portal data contract version.");
  assert(data.dataPolicy?.workZonePublicInput === false, "Public portal data must not depend on private workspace inputs.");
  assert(data.dataPolicy?.sourcesContentPolicy === "none", "Public portal data must not embed sourcesContent.");
  assert(Array.isArray(data.project?.locales) && data.project.locales.includes(data.project.defaultLocale), "Public portal locales are invalid.");
}

function createPackageRows(data) {
  const rows = data.ecosystem.corePackages.names.map((name) => ({
    id: `core:${name}`,
    docLineId: "core",
    docLineTitle: "Core",
    name,
    role: "core-package",
    releaseChannel: data.ecosystem.corePackages.releaseStatus
  }));

  for (const line of data.ecosystem.docLines) {
    for (const packageRow of line.packages) {
      rows.push({
        id: `${line.id}:${packageRow.name}`,
        docLineId: line.id,
        docLineTitle: line.title,
        name: packageRow.name,
        role: packageRow.role,
        releaseChannel: packageRow.releaseChannel
      });
    }
  }
  return rows.sort((left, right) => compareStableText(`${left.docLineId}:${left.name}`, `${right.docLineId}:${right.name}`));
}

/**
 * 从公开 docs 目录派生导航条目，只输出文件名、标题、摘要和分类，不发布本地绝对路径。
 * Derives navigation entries from public docs, emitting only file name, title, summary, and category metadata.
 */
async function collectPublicDocuments(data) {
  const categoryIds = new Set(data.publicDocs.categories.map((category) => category.id));
  const entries = await readdir(docsRoot, { withFileTypes: true });
  const documents = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const contents = await readFile(path.join(docsRoot, entry.name), "utf8");
    const baseName = entry.name.replace(/\.md$/i, "");
    const category = inferCategory(entry.name, contents, categoryIds);
    documents.push({
      fileName: entry.name,
      title: readMarkdownTitle(contents) ?? baseName,
      summary: readMarkdownSummary(contents),
      category,
      route: `docs/reference/${toRouteToken(baseName)}--${shortHash(entry.name)}.html`
    });
  }
  assert(documents.length >= data.publicDocs.minimumDocumentCount, "Public docs document count is below the public portal floor.");
  return documents.sort((left, right) => compareStableText(left.fileName, right.fileName));
}

async function writeRootIndex(outputDir, data) {
  const localeLinks = data.project.locales
    .map((locale) => `<li><a href="${escapeHtml(`${locale}/index.html`)}">${escapeHtml(formatLocaleName(locale))}</a></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: "index.html",
    locale: "en",
    title: "HIA Public Portal",
    body: [
      '<main class="portal-shell" data-hia-public-portal-root>',
      '<header class="portal-hero"><p class="portal-kicker">HIA Documentation System</p><h1>HIA Public Portal</h1><p>Public reference metadata, ecosystem status, adoption guidance and operations overview.</p></header>',
      `<section class="portal-section"><h2>Locales</h2><ul class="portal-list">${localeLinks}</ul></section>`,
      "</main>"
    ].join(""),
    includeNav: false
  });
}

async function writeLocaleHome({ data, labels, locale, outputDir }) {
  const filePath = `${locale}/index.html`;
  const body = [
    '<main class="portal-shell" data-hia-public-portal-locale>',
    `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.kicker)}</p><h1>${escapeHtml(labels.portal)}</h1><p>${escapeHtml(labels.portalLead)}</p></header>`,
    `<section class="portal-section"><h2>${escapeHtml(labels.sections)}</h2><ul class="portal-card-list"><li><a href="packages/index.html">${escapeHtml(labels.packages)}</a><span>${escapeHtml(labels.packagesLead)}</span></li><li><a href="doc-lines/index.html">${escapeHtml(labels.docLines)}</a><span>${escapeHtml(labels.docLinesLead)}</span></li><li><a href="adoption/index.html">${escapeHtml(labels.adoption)}</a><span>${escapeHtml(labels.adoptionLead)}</span></li><li><a href="operations/index.html">${escapeHtml(labels.operations)}</a><span>${escapeHtml(labels.operationsLead)}</span></li><li><a href="docs/index.html">${escapeHtml(labels.publicDocs)}</a><span>${escapeHtml(labels.publicDocsLead)}</span></li></ul></section>`,
    "</main>"
  ].join("");
  await writePage({ outputDir, filePath, locale, title: labels.portal, body });
}

async function writeEcosystemPages(context) {
  const { data, labels, locale, outputDir, packageRows } = context;
  const maturity = new Map(data.maturityScale.map((item) => [item.id, item]));
  const packageRowsHtml = packageRows
    .map((entry) => `<tr><td><code>${escapeHtml(entry.name)}</code></td><td>${escapeHtml(entry.docLineTitle)}</td><td>${escapeHtml(entry.role)}</td><td>${escapeHtml(entry.releaseChannel)}</td></tr>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/packages/index.html`,
    locale,
    title: labels.packages,
    body: [
      '<main class="portal-shell" data-hia-public-portal-packages>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.ecosystem)}</p><h1>${escapeHtml(labels.packages)}</h1><p>${escapeHtml(labels.packagesLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.packageMatrix)}</h2><div class="portal-table-wrap"><table><thead><tr><th>${escapeHtml(labels.package)}</th><th>${escapeHtml(labels.docLine)}</th><th>${escapeHtml(labels.role)}</th><th>${escapeHtml(labels.channel)}</th></tr></thead><tbody>${packageRowsHtml}</tbody></table></div></section>`,
      "</main>"
    ].join("")
  });

  const docLineCards = data.ecosystem.docLines
    .map((line) => `<li><a href="${escapeHtml(`${line.id}.html`)}"><strong>${escapeHtml(line.title)}</strong></a><span>${escapeHtml(line.domain)}</span><em>${escapeHtml(maturity.get(line.maturity)?.label ?? line.maturity)}</em></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/doc-lines/index.html`,
    locale,
    title: labels.docLines,
    body: [
      '<main class="portal-shell" data-hia-public-portal-doc-lines>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.ecosystem)}</p><h1>${escapeHtml(labels.docLines)}</h1><p>${escapeHtml(labels.docLinesLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.docLineMatrix)}</h2><ul class="portal-card-list">${docLineCards}</ul></section>`,
      "</main>"
    ].join("")
  });

  for (const line of data.ecosystem.docLines) {
    const packageItems = line.packages
      .map((entry) => `<li><code>${escapeHtml(entry.name)}</code><span>${escapeHtml(`${entry.role} / ${entry.releaseChannel}`)}</span></li>`)
      .join("");
    const maturityInfo = maturity.get(line.maturity);
    await writePage({
      outputDir,
      filePath: `${locale}/doc-lines/${line.id}.html`,
      locale,
      title: `${line.title} | ${labels.docLines}`,
      body: [
        '<main class="portal-shell" data-hia-public-portal-doc-line-detail>',
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.docLine)}</p><h1>${escapeHtml(line.title)}</h1><p>${escapeHtml(line.domain)}</p></header>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.maturity)}</h2><p><strong>${escapeHtml(maturityInfo?.label ?? line.maturity)}</strong></p><p>${escapeHtml(maturityInfo?.meaning ?? "")}</p></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.useModes)}</h2><dl class="portal-meta"><dt>${escapeHtml(labels.standalone)}</dt><dd>${escapeHtml(line.standaloneMode)}</dd><dt>${escapeHtml(labels.hiaIntegration)}</dt><dd>${escapeHtml(line.hiaIntegrationMode)}</dd></dl></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.inputsOutputs)}</h2><dl class="portal-meta"><dt>${escapeHtml(labels.inputs)}</dt><dd>${escapeHtml(line.primaryInputs.join(", "))}</dd><dt>${escapeHtml(labels.outputs)}</dt><dd>${escapeHtml(line.primaryOutputs.join(", "))}</dd></dl></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.packages)}</h2><ul class="portal-list">${packageItems}</ul></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.nextPublicMilestone)}</h2><p>${escapeHtml(line.nextPublicMilestone)}</p></section>`,
        "</main>"
      ].join("")
    });
  }
}

async function writeAdoptionPages({ data, labels, locale, outputDir }) {
  const docLines = new Map(data.ecosystem.docLines.map((line) => [line.id, line]));
  const caseCards = data.adoption.cases
    .map((entry) => `<li><a href="${escapeHtml(`cases/${entry.id}.html`)}"><strong>${escapeHtml(entry.title)}</strong></a><span>${escapeHtml(`${entry.targetProject} / ${docLines.get(entry.docLineId)?.title ?? entry.docLineId}`)}</span><em>${escapeHtml(entry.targetRepoPolicy)}</em></li>`)
    .join("");
  const recipeItems = data.adoption.recipes
    .map((entry) => `<li><a href="${escapeHtml(`recipes/${entry.id}.html`)}">${escapeHtml(entry.id)}</a><span>${escapeHtml(`${entry.minimumRunnerPackage}@${entry.minimumRunnerVersion}`)}</span></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/adoption/index.html`,
    locale,
    title: labels.adoption,
    body: [
      '<main class="portal-shell" data-hia-public-portal-adoption>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.adoption)}</p><h1>${escapeHtml(labels.adoptionCases)}</h1><p>${escapeHtml(labels.adoptionLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.policy)}</h2><p>${escapeHtml(labels.policySummary)}</p><p><a href="policy.html">${escapeHtml(labels.openPolicy)}</a></p></section>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.cases)}</h2><ul class="portal-card-list">${caseCards}</ul></section>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.recipes)}</h2><ul class="portal-list">${recipeItems}</ul></section>`,
      "</main>"
    ].join("")
  });

  for (const adoptionCase of data.adoption.cases) {
    const packageItems = adoptionCase.primaryPackages
      .map((entry) => `<li><code>${escapeHtml(`${entry.name}@${entry.version}`)}</code><span>${escapeHtml(entry.role)}</span></li>`)
      .join("");
    const evidence = Object.entries(adoptionCase.publicEvidence)
      .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(", ") : String(value))}</dd>`)
      .join("");
    await writePage({
      outputDir,
      filePath: `${locale}/adoption/cases/${adoptionCase.id}.html`,
      locale,
      title: adoptionCase.title,
      body: [
        '<main class="portal-shell" data-hia-public-portal-adoption-case>',
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.caseStudy)}</p><h1>${escapeHtml(adoptionCase.title)}</h1><p>${escapeHtml(`${adoptionCase.targetProject} / ${docLines.get(adoptionCase.docLineId)?.title ?? adoptionCase.docLineId}`)}</p></header>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.problem)}</h2><p>${escapeHtml(adoptionCase.publicNarrative.problem)}</p></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.solution)}</h2><p>${escapeHtml(adoptionCase.publicNarrative.solution)}</p></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.boundary)}</h2><p>${escapeHtml(adoptionCase.publicNarrative.currentBoundary)}</p></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.packages)}</h2><ul class="portal-list">${packageItems}</ul></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.evidence)}</h2><dl class="portal-meta">${evidence}</dl></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.nextAction)}</h2><p>${escapeHtml(adoptionCase.nextAction)}</p></section>`,
        "</main>"
      ].join("")
    });
  }

  for (const recipe of data.adoption.recipes) {
    await writePage({
      outputDir,
      filePath: `${locale}/adoption/recipes/${recipe.id}.html`,
      locale,
      title: recipe.id,
      body: [
        '<main class="portal-shell" data-hia-public-portal-adoption-recipe>',
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.recipe)}</p><h1>${escapeHtml(recipe.id)}</h1><p><code>${escapeHtml(`${recipe.minimumRunnerPackage}@${recipe.minimumRunnerVersion}`)}</code></p></header>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.summary)}</h2><p>${escapeHtml(recipe.summary)}</p></section>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.minimumRunner)}</h2><p><code>${escapeHtml(`${recipe.minimumRunnerPackage}@^${recipe.minimumRunnerVersion}`)}</code></p></section>`,
        "</main>"
      ].join("")
    });
  }

  const policy = data.adoption.targetPolicy;
  await writePage({
    outputDir,
    filePath: `${locale}/adoption/policy.html`,
    locale,
    title: labels.policy,
    body: [
      '<main class="portal-shell" data-hia-public-portal-adoption-policy>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.adoption)}</p><h1>${escapeHtml(labels.policy)}</h1><p>${escapeHtml(labels.policyLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.targetPolicy)}</h2><dl class="portal-meta"><dt>${escapeHtml(labels.readOnly)}</dt><dd>${escapeHtml(String(policy.targetRepositoriesReadOnly))}</dd><dt>${escapeHtml(labels.notificationOnly)}</dt><dd>${escapeHtml(String(policy.notificationOnly))}</dd><dt>${escapeHtml(labels.notifyPath)}</dt><dd><code>${escapeHtml(policy.notifyPathPattern)}</code></dd><dt>${escapeHtml(labels.sourcesContentPolicy)}</dt><dd><code>${escapeHtml(policy.sourcesContentPolicy)}</code></dd></dl></section>`,
      "</main>"
    ].join("")
  });
}

async function writeOperationsPages({ data, labels, locale, outputDir }) {
  const statusCards = data.operations.routeGroups
    .map((group) => `<li><strong>${escapeHtml(group.id)}</strong><span>${escapeHtml(group.status)}</span><em>${escapeHtml(String(group.minimumPathCount))}</em></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/operations/index.html`,
    locale,
    title: labels.operations,
    body: [
      '<main class="portal-shell" data-hia-public-portal-operations>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.operations)}</p><h1>${escapeHtml(labels.operationsStatus)}</h1><p>${escapeHtml(labels.operationsLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.statusCards)}</h2><ul class="portal-card-list">${statusCards}</ul></section>`,
      "</main>"
    ].join("")
  });

  await writeKeyValuePage({ outputDir, locale, labels, filePath: `${locale}/operations/status.html`, marker: "data-hia-public-portal-operations-status", title: labels.status, values: data.operations.publicReference });
  await writeKeyValuePage({ outputDir, locale, labels, filePath: `${locale}/operations/monitor.html`, marker: "data-hia-public-portal-operations-monitor", title: labels.monitor, values: data.operations.monitor });
  await writeKeyValuePage({ outputDir, locale, labels, filePath: `${locale}/operations/versions.html`, marker: "data-hia-public-portal-operations-versions", title: labels.versions, values: data.operations.versioning });

  const releaseItems = data.operations.releaseHistory
    .map((release) => `<li><strong>${escapeHtml(release.id)}</strong><span>${escapeHtml(release.status)}</span><p>${escapeHtml(release.notes)}</p></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/operations/releases.html`,
    locale,
    title: labels.releases,
    body: [
      '<main class="portal-shell" data-hia-public-portal-operations-releases>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.operations)}</p><h1>${escapeHtml(labels.releases)}</h1><p>${escapeHtml(labels.releasesLead)}</p></header>`,
      `<section class="portal-section"><ul class="portal-list">${releaseItems}</ul></section>`,
      "</main>"
    ].join("")
  });
}

async function writePublicDocsPages({ data, labels, locale, outputDir, publicDocs }) {
  const docsByCategory = new Map();
  for (const category of data.publicDocs.categories) {
    docsByCategory.set(category.id, publicDocs.filter((document) => document.category === category.id).sort((left, right) => compareStableText(left.title, right.title)));
  }
  const categories = data.publicDocs.categories
    .map((category) => `<li><a href="${escapeHtml(`categories/${category.id}.html`)}"><strong>${escapeHtml(category.title)}</strong></a><span>${escapeHtml(`${docsByCategory.get(category.id)?.length ?? 0} ${labels.entries}`)}</span></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/docs/index.html`,
    locale,
    title: labels.publicDocs,
    body: [
      '<main class="portal-shell" data-hia-public-portal-docs>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.publicDocs)}</p><h1>${escapeHtml(labels.publicDocs)}</h1><p>${escapeHtml(labels.publicDocsLead)}</p></header>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.summary)}</h2><dl class="portal-meta"><dt>${escapeHtml(labels.publicDocsCount)}</dt><dd>${escapeHtml(String(publicDocs.length))}</dd><dt>${escapeHtml(labels.translationBacklog)}</dt><dd>${escapeHtml(String(data.publicDocs.translationBacklogCount))}</dd><dt>${escapeHtml(labels.highPriorityTranslationBacklog)}</dt><dd>${escapeHtml(String(data.publicDocs.highPriorityTranslationBacklogCount))}</dd></dl></section>`,
      `<section class="portal-section"><h2>${escapeHtml(labels.categories)}</h2><ul class="portal-card-list">${categories}</ul></section>`,
      "</main>"
    ].join("")
  });

  for (const category of data.publicDocs.categories) {
    const documents = docsByCategory.get(category.id) ?? [];
    const docItems = documents
      .map((document) => `<li><a href="${escapeHtml(relativeHref(`${locale}/docs/categories/${category.id}.html`, `${locale}/${document.route}`))}"><strong>${escapeHtml(document.title)}</strong></a><span>${escapeHtml(document.summary)}</span></li>`)
      .join("");
    await writePage({
      outputDir,
      filePath: `${locale}/docs/categories/${category.id}.html`,
      locale,
      title: `${category.title} | ${labels.publicDocs}`,
      body: [
        '<main class="portal-shell" data-hia-public-portal-docs-category>',
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.publicDocs)}</p><h1>${escapeHtml(category.title)}</h1><p>${escapeHtml(labels.publicDocsCategoryLead)}</p></header>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.entries)}</h2><ul class="portal-list">${docItems}</ul></section>`,
        "</main>"
      ].join("")
    });
  }

  for (const document of publicDocs) {
    const category = data.publicDocs.categories.find((item) => item.id === document.category);
    await writePage({
      outputDir,
      filePath: `${locale}/${document.route}`,
      locale,
      title: document.title,
      body: [
        '<main class="portal-shell" data-hia-public-portal-docs-entry>',
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(category?.title ?? labels.publicDocs)}</p><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.summary)}</p></header>`,
        `<section class="portal-section"><h2>${escapeHtml(labels.sourceDocument)}</h2><p><code>${escapeHtml(document.fileName)}</code></p></section>`,
        "</main>"
      ].join("")
    });
  }
}

async function writeKeyValuePage({ outputDir, locale, labels, filePath, marker, title, values }) {
  const rows = Object.entries(values)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(", ") : String(value))}</dd>`)
    .join("");
  await writePage({
    outputDir,
    filePath,
    locale,
    title,
    body: [
      `<main class="portal-shell" ${marker}>`,
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.operations)}</p><h1>${escapeHtml(title)}</h1></header>`,
      `<section class="portal-section"><dl class="portal-meta">${rows}</dl></section>`,
      "</main>"
    ].join("")
  });
}

async function writeSearchPages(context) {
  const { data, labels, locale, outputDir, packageRows, publicDocs } = context;
  const entries = [
    ...packageRows.map((entry) => ({
      section: "packages",
      title: entry.name,
      description: `${entry.docLineTitle} / ${entry.role} / ${entry.releaseChannel}`,
      route: `${locale}/packages/index.html`
    })),
    ...data.ecosystem.docLines.map((line) => ({
      section: "doc-lines",
      title: line.title,
      description: `${line.domain} / ${line.maturity}`,
      route: `${locale}/doc-lines/${line.id}.html`
    })),
    ...data.adoption.cases.map((adoptionCase) => ({
      section: "adoption",
      title: adoptionCase.title,
      description: `${adoptionCase.targetProject} / ${adoptionCase.docLineId}`,
      route: `${locale}/adoption/cases/${adoptionCase.id}.html`
    })),
    ...data.adoption.recipes.map((recipe) => ({
      section: "adoption",
      title: recipe.id,
      description: `${recipe.minimumRunnerPackage}@${recipe.minimumRunnerVersion}`,
      route: `${locale}/adoption/recipes/${recipe.id}.html`
    })),
    ...data.operations.routeGroups.map((group) => ({
      section: "operations",
      title: group.id,
      description: `${group.status} / ${group.minimumPathCount}`,
      route: `${locale}/operations/index.html`
    })),
    ...data.publicDocs.categories.map((category) => ({
      section: "public-docs",
      title: category.title,
      description: data.publicDocs.sourceMode,
      route: `${locale}/docs/categories/${category.id}.html`
    })),
    ...publicDocs.map((document) => ({
      section: "public-docs",
      title: document.title,
      description: document.summary,
      route: `${locale}/${document.route}`
    }))
  ].map((entry) => ({
    ...entry,
    url: relativeHref(`${locale}/search/index.html`, entry.route),
    searchText: [entry.section, entry.title, entry.description].join(" ").toLowerCase()
  }));

  const searchList = entries
    .map((entry) => `<li><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.title)}</a><span>${escapeHtml(`${entry.section}: ${entry.description}`)}</span></li>`)
    .join("");
  await writePage({
    outputDir,
    filePath: `${locale}/search/index.html`,
    locale,
    title: labels.search,
    body: [
      '<main class="portal-shell" data-hia-public-portal-search>',
      `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.portal)}</p><h1>${escapeHtml(labels.search)}</h1><p>${escapeHtml(labels.searchLead)}</p></header>`,
      `<section class="portal-section"><ul class="portal-list">${searchList}</ul></section>`,
      "</main>"
    ].join("")
  });

  for (const section of ["ecosystem", "adoption", "operations"]) {
    const sectionEntries = entries.filter((entry) => section === "ecosystem" ? ["packages", "doc-lines"].includes(entry.section) : entry.section === section);
    await writePage({
      outputDir,
      filePath: `${locale}/search/${section}.html`,
      locale,
      title: `${labels.search} | ${section}`,
      body: [
        `<main class="portal-shell" data-hia-public-portal-search-${section}>`,
        `<header class="portal-hero"><p class="portal-kicker">${escapeHtml(labels.portal)}</p><h1>${escapeHtml(labels.search)}</h1><p>${escapeHtml(section)}</p></header>`,
        `<section class="portal-section"><ul class="portal-list">${sectionEntries.map((entry) => `<li><a href="${escapeHtml(relativeHref(`${locale}/search/${section}.html`, entry.route))}">${escapeHtml(entry.title)}</a><span>${escapeHtml(entry.description)}</span></li>`).join("")}</ul></section>`,
        "</main>"
      ].join("")
    });
  }

  return {
    locale,
    path: `${locale}/search/index.html`,
    entryCount: entries.length,
    entries
  };
}

function collectLocalePageList(data, locale, publicDocs = []) {
  return [
    `${locale}/index.html`,
    `${locale}/packages/index.html`,
    `${locale}/doc-lines/index.html`,
    ...data.ecosystem.docLines.map((line) => `${locale}/doc-lines/${line.id}.html`),
    `${locale}/adoption/index.html`,
    `${locale}/adoption/policy.html`,
    ...data.adoption.cases.map((item) => `${locale}/adoption/cases/${item.id}.html`),
    ...data.adoption.recipes.map((item) => `${locale}/adoption/recipes/${item.id}.html`),
    `${locale}/operations/index.html`,
    `${locale}/operations/status.html`,
    `${locale}/operations/monitor.html`,
    `${locale}/operations/releases.html`,
    `${locale}/operations/versions.html`,
    `${locale}/docs/index.html`,
    ...data.publicDocs.categories.map((category) => `${locale}/docs/categories/${category.id}.html`),
    ...publicDocs.map((document) => `${locale}/${document.route}`),
    `${locale}/search/index.html`,
    `${locale}/search/ecosystem.html`,
    `${locale}/search/adoption.html`,
    `${locale}/search/operations.html`
  ];
}

async function writePage({ outputDir, filePath, locale, title, body, includeNav = true }) {
  const nav = includeNav ? createNavigation(filePath, locale) : "";
  const html = `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${escapeHtml(relativeHref(filePath, "assets/hia-public-portal.css"))}">
</head>
<body>
${nav}
${body}
</body>
</html>
`;
  await writeText(path.join(outputDir, ...filePath.split("/")), html);
}

function createNavigation(filePath, locale) {
  const items = [
    [labelsForNav(locale).home, `${locale}/index.html`],
    [labelsForNav(locale).packages, `${locale}/packages/index.html`],
    [labelsForNav(locale).docLines, `${locale}/doc-lines/index.html`],
    [labelsForNav(locale).adoption, `${locale}/adoption/index.html`],
    [labelsForNav(locale).operations, `${locale}/operations/index.html`],
    [labelsForNav(locale).docs, `${locale}/docs/index.html`],
    [labelsForNav(locale).search, `${locale}/search/index.html`]
  ];
  return `<nav class="portal-nav" aria-label="HIA public portal navigation">${items.map(([label, target]) => `<a href="${escapeHtml(relativeHref(filePath, target))}">${escapeHtml(label)}</a>`).join("")}</nav>`;
}

async function writeAssets(outputDir) {
  await writeText(path.join(outputDir, "assets", "hia-public-portal.css"), `
:root { color-scheme: light; --portal-ink: #1d2b2f; --portal-muted: #5d6f75; --portal-line: #d7e0df; --portal-accent: #0f766e; --portal-bg: #f7faf9; --portal-panel: #ffffff; }
* { box-sizing: border-box; }
body { background: var(--portal-bg); color: var(--portal-ink); font-family: Inter, "Noto Sans", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif; line-height: 1.55; margin: 0; }
a { color: #0f5f68; }
code { font-family: "Sarasa Mono SC", "等距更纱黑体 SC", "Cascadia Code", "Fira Code", Consolas, monospace; font-size: 0.95em; }
.portal-nav { align-items: center; background: #ffffff; border-bottom: 1px solid var(--portal-line); display: flex; flex-wrap: wrap; gap: 8px; padding: 12px max(18px, calc((100vw - 1120px) / 2)); position: sticky; top: 0; z-index: 1; }
.portal-nav a { border: 1px solid var(--portal-line); border-radius: 6px; color: #0f4c5c; font-size: 13px; padding: 6px 9px; text-decoration: none; }
.portal-nav a:focus-visible, .portal-nav a:hover { background: #e5f3f0; border-color: var(--portal-accent); outline: none; }
.portal-shell { margin: 0 auto; max-width: 1120px; padding: 32px 18px 48px; }
.portal-hero { border-bottom: 1px solid var(--portal-line); margin-bottom: 24px; padding-bottom: 18px; }
.portal-kicker { color: var(--portal-accent); font-size: 13px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; }
h1 { font-size: 32px; line-height: 1.15; margin: 0 0 10px; }
h2 { font-size: 20px; margin: 0 0 14px; }
p { margin: 0 0 12px; }
.portal-section { background: var(--portal-panel); border: 1px solid var(--portal-line); border-radius: 8px; margin: 16px 0; padding: 18px; }
.portal-card-list, .portal-list { display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }
.portal-card-list { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.portal-card-list li, .portal-list li { border: 1px solid var(--portal-line); border-radius: 8px; display: grid; gap: 4px; padding: 12px; }
.portal-card-list span, .portal-list span, .portal-card-list em { color: var(--portal-muted); font-style: normal; }
.portal-meta { display: grid; gap: 8px 16px; grid-template-columns: minmax(140px, max-content) 1fr; margin: 0; }
.portal-meta dt { color: var(--portal-muted); font-weight: 700; }
.portal-meta dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.portal-table-wrap { overflow-x: auto; }
table { border-collapse: collapse; min-width: 720px; width: 100%; }
th, td { border-bottom: 1px solid var(--portal-line); padding: 9px 10px; text-align: left; vertical-align: top; }
th { background: #eef5f3; }
@media (max-width: 720px) { h1 { font-size: 26px; } .portal-meta { grid-template-columns: 1fr; } .portal-nav { position: static; } }
`);
}

function getLabels(locale) {
  const zh = locale === "zh-CN";
  return {
    kicker: "HIA Documentation System",
    portal: zh ? "HIA 公共门户" : "HIA Public Portal",
    portalLead: zh ? "公开 reference 元数据、生态状态、采用指南和运维概览。" : "Public reference metadata, ecosystem status, adoption guidance and operations overview.",
    sections: zh ? "入口" : "Sections",
    ecosystem: zh ? "生态" : "Ecosystem",
    packages: zh ? "包" : "Packages",
    packagesLead: zh ? "核心包与各 doc line 包的公开状态矩阵。" : "Public status matrix for core packages and doc-line packages.",
    docLines: zh ? "文档化线条" : "Doc Lines",
    docLinesLead: zh ? "各语言/框架文档化线条的成熟度、输入、输出和下一步。" : "Maturity, inputs, outputs and next steps for each language/framework documentation line.",
    adoption: zh ? "采用" : "Adoption",
    adoptionLead: zh ? "目标项目采用案例与最小 recipe。" : "Target-project adoption cases and minimum recipes.",
    operations: zh ? "运维" : "Operations",
    operationsLead: zh ? "公开 reference 的部署、监控、版本与发布状态。" : "Deployment, monitor, versioning and release status for the public reference.",
    publicDocs: zh ? "公开文档" : "Public Docs",
    publicDocsLead: zh ? "公开文档分类、翻译优先级和导航准备度。" : "Public documentation categories, translation priority and navigation readiness.",
    publicDocsCategoryLead: zh ? "该分类由公开文档元数据派生，详细条目将在后续构建阶段补齐。" : "This category is derived from public documentation metadata; detailed entries will be filled by a later build stage.",
    packageMatrix: zh ? "包矩阵" : "Package Matrix",
    package: zh ? "包" : "Package",
    docLine: zh ? "文档化线条" : "Doc Line",
    role: zh ? "角色" : "Role",
    channel: zh ? "发布通道" : "Channel",
    docLineMatrix: zh ? "线条矩阵" : "Doc-Line Matrix",
    maturity: zh ? "成熟度" : "Maturity",
    useModes: zh ? "使用模式" : "Use Modes",
    standalone: zh ? "独立运行" : "Standalone",
    hiaIntegration: zh ? "HIA 集成" : "HIA Integration",
    inputsOutputs: zh ? "输入与输出" : "Inputs And Outputs",
    inputs: zh ? "输入" : "Inputs",
    outputs: zh ? "输出" : "Outputs",
    nextPublicMilestone: zh ? "下一公开里程碑" : "Next Public Milestone",
    adoptionCases: zh ? "采用案例" : "Adoption Cases",
    policy: zh ? "策略" : "Policy",
    policySummary: zh ? "目标仓库保持只读，仅通过通知文档建议接入。" : "Target repositories remain read-only; integration changes are proposed through notification documents.",
    openPolicy: zh ? "查看策略" : "Open policy",
    cases: zh ? "案例" : "Cases",
    recipes: zh ? "Recipe" : "Recipes",
    caseStudy: zh ? "案例" : "Case Study",
    problem: zh ? "问题" : "Problem",
    solution: zh ? "方案" : "Solution",
    boundary: zh ? "边界" : "Boundary",
    evidence: zh ? "证据摘要" : "Evidence Summary",
    nextAction: zh ? "下一步" : "Next Action",
    recipe: "Recipe",
    summary: zh ? "摘要" : "Summary",
    minimumRunner: zh ? "最小 runner" : "Minimum Runner",
    policyLead: zh ? "公开采用策略保护目标仓库自主吸收节奏。" : "The public adoption policy preserves target-project control over integration timing.",
    targetPolicy: zh ? "目标仓库策略" : "Target Policy",
    readOnly: zh ? "只读" : "Read-only",
    notificationOnly: zh ? "仅通知" : "Notification-only",
    notifyPath: zh ? "通知路径" : "Notify path",
    sourcesContentPolicy: "sourcesContent",
    operationsStatus: zh ? "运维状态" : "Operations Status",
    statusCards: zh ? "状态项" : "Status Cards",
    status: zh ? "状态" : "Status",
    monitor: zh ? "监控" : "Monitor",
    versions: zh ? "版本" : "Versions",
    releases: zh ? "发布历史" : "Releases",
    releasesLead: zh ? "当前发布历史仍是 single-current 候选。" : "The release history is still a single-current candidate.",
    categories: zh ? "分类" : "Categories",
    publicDocsCount: zh ? "公开文档数" : "Public docs",
    translationBacklog: zh ? "翻译缺口" : "Translation backlog",
    highPriorityTranslationBacklog: zh ? "高优先翻译缺口" : "High-priority translation backlog",
    entries: zh ? "条目" : "Entries",
    sourceDocument: zh ? "源文档" : "Source Document",
    search: zh ? "搜索" : "Search",
    searchLead: zh ? "统一搜索索引的静态预览。" : "Static preview of the unified search index."
  };
}

function labelsForNav(locale) {
  const labels = getLabels(locale);
  return {
    home: locale === "zh-CN" ? "首页" : "Home",
    packages: labels.packages,
    docLines: labels.docLines,
    adoption: labels.adoption,
    operations: labels.operations,
    docs: labels.publicDocs,
    search: labels.search
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

function relativeHref(fromFile, targetFile) {
  const relative = path.posix.relative(path.posix.dirname(fromFile), targetFile);
  return relative || path.posix.basename(targetFile);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatLocaleName(locale) {
  return locale === "zh-CN" ? "中文" : "English";
}

function inferCategory(fileName, contents, categoryIds) {
  const value = `${fileName}\n${contents}`;
  const selected = (() => {
    if (/reference[- ]operations|reference[- ]pages|public[- ]reference|public[- ]portal|pages artifact|github pages|ci|gate|acceptance/i.test(value)) return "operations";
    if (/schema|profile|contract|fixture|manifest/i.test(fileName)) return "contracts";
    if (/release|version|compat|migration|public-package/i.test(fileName)) return "release";
    if (/security|dependency|license|governance|review-template/i.test(fileName)) return "governance";
    if (/ide|vscode|adapter|plugin|devtools|browser/i.test(fileName)) return "tooling";
    if (/configuration|config/i.test(fileName)) return "configuration";
    return "guide";
  })();
  return categoryIds.has(selected) ? selected : "guide";
}

function readMarkdownTitle(contents) {
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("# "));
  return line?.replace(/^#\s+/, "").trim();
}

function readMarkdownSummary(contents) {
  const lines = contents.split(/\r?\n/);
  let seenTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!seenTitle) {
      if (trimmed.startsWith("# ")) seenTitle = true;
      continue;
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) continue;
    return normalizeMarkdownInline(trimmed);
  }
  return "";
}

function normalizeMarkdownInline(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function toRouteToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

function shortHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--out") {
      const value = args[index + 1];
      assert(value && !value.startsWith("--"), `${argument} requires a directory value.`);
      options.out = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function assertPathInside(root, candidate, message) {
  const relative = path.relative(root, candidate);
  assert(Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative), message);
}

function compareStableText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
