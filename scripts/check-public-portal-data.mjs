import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portalDataPath = path.join(mainRepoRoot, "reference", "public-portal-data.json");
const publicDocsRoot = path.join(mainRepoRoot, "docs");
const releasePackagesPath = path.join(mainRepoRoot, "release", "public-packages.json");
const profileCatalogPath = path.join(mainRepoRoot, "packages", "profiles", "src", "catalog.json");
const schemaCatalogPath = path.join(mainRepoRoot, "packages", "schemas", "src", "catalog.json");
const forbiddenOutputMarkers = [
  "work-zone/",
  "work-zone\\",
  "ai/codex/",
  "ai\\codex\\",
  "Github_mandolin",
  "HIA-Documentation-Sys"
];

main();

/**
 * 检查公开门户数据只包含可发布字段，并与 package/profile/schema 公开 catalog 对齐。
 * Checks that public portal data contains only publishable fields and matches package/profile/schema public catalogs.
 */
function main() {
  const data = readJson(portalDataPath);
  const publicPackages = readJson(releasePackagesPath);
  const profileCatalog = readJson(profileCatalogPath);
  const schemaCatalog = readJson(schemaCatalogPath);

  validateContract(data);
  validatePrivacyBoundary(data);
  validateProject(data);
  validateEcosystem(data, publicPackages, profileCatalog, schemaCatalog);
  validateAdoption(data);
  validateOperations(data);
  validateHostAnchors(data);
  validateFeedback(data);
  validatePublicDocs(data);
  validateRoutes(data);

  const packageRows = data.ecosystem.corePackages.names.length + data.ecosystem.docLines.reduce((total, line) => total + line.packages.length, 0);
  console.log(`Public portal data check passed: ${data.ecosystem.docLines.length} doc line(s), ${packageRows} package row(s), ${data.adoption.cases.length} adoption case(s), ${data.hostAnchors.surfaces.length} host surface(s).`);
}

function validateContract(data) {
  assert(data.contract === "hia-public-portal-data", "Unexpected public portal data contract.");
  assert(data.contractVersion === "0.1.0-draft", "Unexpected public portal data contract version.");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(data.updated), "Public portal data must carry an ISO date.");
}

/**
 * 公开门户数据会进入 Pages 构建，因此这里硬性拒绝本地路径、内部证据字段和内嵌源码。
 * Public portal data enters the Pages build, so this hard-rejects local paths, internal evidence fields, and embedded sources.
 */
function validatePrivacyBoundary(data) {
  const policy = data.dataPolicy;
  assert(policy?.workZonePublicInput === false, "Public portal data must not depend on private workspace inputs.");
  assert(policy?.sourcesContentPolicy === "none", "Public portal data must keep sourcesContentPolicy=none.");
  assert(Array.isArray(policy.allowedSourceKinds) && policy.allowedSourceKinds.includes("checked-in-public-data"), "Public portal data source kinds must include checked-in public data.");
  assert(Array.isArray(policy.forbiddenFieldNames) && policy.forbiddenFieldNames.length > 0, "Public portal data must declare forbidden field names.");
  assert(policy.forbiddenMarkerPolicy === "private-workspace-and-local-runner-markers", "Public portal data marker policy drifted.");

  const serialized = JSON.stringify(data);
  for (const marker of forbiddenOutputMarkers) {
    assert(!serialized.toLowerCase().includes(marker.toLowerCase()), `Public portal data leaks forbidden marker: ${marker}.`);
  }
  assert(!/(^|[^A-Za-z0-9+.-])[A-Za-z]:[\\/]/.test(serialized), "Public portal data leaks a Windows absolute path.");
  assert(!serialized.includes("/home/runner/"), "Public portal data leaks a GitHub runner path.");
  assertNoForbiddenFields(data, new Set(policy.forbiddenFieldNames), "$");
  assertNoEmbeddedSources(data, "$");
}

function validateProject(data) {
  assert(data.project?.id === "project:hia-public-reference", "Public portal project id drifted.");
  assert(data.project?.defaultLocale === "en", "Public portal default locale must remain en.");
  assertEqualSets(["en", "zh-CN"], data.project?.locales ?? [], "Public portal locale inventory");
  assert(data.project.baseUrl === "https://mandolin.github.io/HIA-Documentation/", "Public portal base URL drifted.");
  assert(data.project.repository === "mandolin/HIA-Documentation", "Public portal repository drifted.");
}

function validateEcosystem(data, publicPackages, profileCatalog, schemaCatalog) {
  const maturityIds = new Set((data.maturityScale ?? []).map((item) => item.id));
  assertEqualSets(["bridge-consumable", "local-consumable", "published-consumable", "workspace-incubation"], [...maturityIds], "Maturity scale");

  const publishedCorePackages = publicPackages.packages
    .filter((item) => item.releaseStatus === "published")
    .map((item) => item.name)
    .sort(compareStableText);
  assert(data.ecosystem.corePackages.scope === publicPackages.scope, "Core package scope drifted.");
  assert(data.ecosystem.corePackages.releaseStatus === "published", "Core package release status drifted.");
  assert(data.ecosystem.corePackages.names.length >= data.ecosystem.corePackages.minimumCount, "Core package list is below the reviewed floor.");
  assertEqualSets(publishedCorePackages, data.ecosystem.corePackages.names, "Published core package inventory");

  assertEqualSets(profileCatalog.profiles.map((profile) => profile.profileId), data.ecosystem.profiles.ids, "Profile inventory");
  assert(data.ecosystem.profiles.ids.length >= data.ecosystem.profiles.minimumCount, "Profile list is below the reviewed floor.");
  assertEqualSets(schemaCatalog.schemas.map((schema) => schema.key), data.ecosystem.schemas.keys, "Schema inventory");
  assert(data.ecosystem.schemas.keys.length >= data.ecosystem.schemas.minimumCount, "Schema list is below the reviewed floor.");

  assert(Array.isArray(data.ecosystem.docLines) && data.ecosystem.docLines.length === 8, "Public portal data must describe eight doc lines.");
  const docLineIds = data.ecosystem.docLines.map((line) => line.id);
  assertEqualSets(["cssdoc", "dotnetdoc", "htmdoc", "jsdoc", "pugdoc", "sassdoc", "tsdoc", "vuedoc"], docLineIds, "Doc-line inventory");

  const releaseChannels = new Set(["npm-published", "workspace-private", "local-unpublished"]);
  const packageNames = new Set(data.ecosystem.corePackages.names);
  for (const line of data.ecosystem.docLines) {
    assert(maturityIds.has(line.maturity), `Doc line ${line.id} references an unknown maturity.`);
    assert(/^mandolin\/hia-[a-z0-9-]+$/.test(line.repository), `Doc line ${line.id} repository is not a public GitHub repository id.`);
    assert((line.profileIds ?? []).every((id) => data.ecosystem.profiles.ids.includes(id)), `Doc line ${line.id} references an unknown profile.`);
    assert((line.schemaKeys ?? []).every((key) => data.ecosystem.schemas.keys.includes(key)), `Doc line ${line.id} references an unknown schema.`);
    assert(Array.isArray(line.packages) && line.packages.length > 0, `Doc line ${line.id} must list package rows.`);
    for (const packageRow of line.packages) {
      assert(/^@(?:hia-doc|mandolin)\//.test(packageRow.name), `Package ${packageRow.name} must stay inside an approved public scope.`);
      assert(releaseChannels.has(packageRow.releaseChannel), `Package ${packageRow.name} has an unknown release channel.`);
      packageNames.add(packageRow.name);
    }
  }
  assert(packageNames.size === 72, `Expected 72 public package rows including core packages; found ${packageNames.size}.`);
}

function validateAdoption(data) {
  const docLineIds = new Set(data.ecosystem.docLines.map((line) => line.id));
  const recipeIds = new Set(data.adoption.recipes.map((recipe) => recipe.id));
  const packageNames = new Set(data.ecosystem.docLines.flatMap((line) => line.packages.map((packageRow) => packageRow.name)));
  assert(data.adoption.targetPolicy?.targetRepositoriesReadOnly === true, "Adoption target policy must remain read-only.");
  assert(data.adoption.targetPolicy?.notificationOnly === true, "Adoption target policy must remain notification-only.");
  assert(data.adoption.targetPolicy?.notificationMode === "maintainer-pull-notify", "Adoption notification mode drifted.");
  assert(data.adoption.targetPolicy?.sourcesContentPolicy === "none", "Adoption policy must not embed source content.");
  assert(data.adoption.targetPolicy?.notifyPathPattern === "maintainer-notify-log/{YYYY-MM-DD}/{YYYYMMDD}-{title}.md", "Adoption notify path pattern drifted.");
  assert(Array.isArray(data.adoption.recipes) && data.adoption.recipes.length === 2, "Adoption recipe count drifted.");
  assert(Array.isArray(data.adoption.cases) && data.adoption.cases.length === 2, "Adoption case count drifted.");

  for (const recipe of data.adoption.recipes) {
    assert(docLineIds.has(recipe.docLineId), `Recipe ${recipe.id} references an unknown doc line.`);
    assert(packageNames.has(recipe.minimumRunnerPackage), `Recipe ${recipe.id} references an unknown runner package.`);
    assert(/^\d+\.\d+\.\d+$/.test(recipe.minimumRunnerVersion), `Recipe ${recipe.id} runner version must be semver-like.`);
    assert(/^[a-z0-9][a-z0-9-]*\.md$/.test(recipe.quickstartDocument ?? ""), `Recipe ${recipe.id} must reference a public quickstart document.`);
    assert(existsSync(path.join(publicDocsRoot, recipe.quickstartDocument)), `Recipe ${recipe.id} quickstart document is missing.`);
  }

  for (const adoptionCase of data.adoption.cases) {
    assert(docLineIds.has(adoptionCase.docLineId), `Adoption case ${adoptionCase.id} references an unknown doc line.`);
    assert(recipeIds.has(adoptionCase.recipeId), `Adoption case ${adoptionCase.id} references an unknown recipe.`);
    assert(adoptionCase.targetRepoPolicy === "read-only-notify-only", `Adoption case ${adoptionCase.id} target policy drifted.`);
    assert(adoptionCase.maturityRequired === "published-consumable", `Adoption case ${adoptionCase.id} should only use published-consumable doc lines.`);
    assert(adoptionCase.publicEvidence?.sourcesContentEmbedded === false, `Adoption case ${adoptionCase.id} must not embed source content.`);
    for (const packageRow of adoptionCase.primaryPackages) {
      assert(packageNames.has(packageRow.name), `Adoption case ${adoptionCase.id} references an unknown package: ${packageRow.name}.`);
      assert(/^\d+\.\d+\.\d+$/.test(packageRow.version), `Adoption case ${adoptionCase.id} package ${packageRow.name} version must be semver-like.`);
    }
  }
}

function validateOperations(data) {
  const operations = data.operations;
  assert(operations.publicReference?.baseUrl === data.project.baseUrl, "Operations base URL must match project base URL.");
  assert(operations.publicReference?.sourceRepository === data.project.repository, "Operations source repository must match project repository.");
  assert(operations.monitor?.minimumProbePathCount >= 18, "Operations monitor probe floor regressed.");
  assert(operations.monitor?.expectedStatus === 200, "Operations expected status must remain HTTP 200.");
  assert(operations.versioning?.canonicalSchemaPreservation === "required", "Schema canonical preservation must remain required.");
  assert(Array.isArray(operations.releaseHistory) && operations.releaseHistory.length >= 1, "Operations release history must not be empty.");
  assertEqualSets(["generated-adoption-pages", "generated-ecosystem-pages", "generated-operations-pages", "legacy-reference-pages", "portal-route-set"], operations.routeGroups.map((group) => group.id), "Operations route group inventory");
}

function validateHostAnchors(data) {
  const anchors = data.hostAnchors;
  assert(anchors?.status === "host-productization-input", "Host anchor status drifted.");
  assert(typeof anchors.summary === "string" && anchors.summary.includes("relation graph"), "Host anchors must summarize the relation graph boundary.");
  assert(Array.isArray(anchors.principles) && anchors.principles.length >= 3, "Host anchors must declare public principles.");
  assertEqualSets(["open-request", "relation-graph", "source-linkage"], anchors.concepts.map((concept) => concept.id), "Host concept inventory");
  for (const concept of anchors.concepts) {
    assert(typeof concept.title === "string" && concept.title.length > 0, `Host concept ${concept.id} must have a title.`);
    assert(typeof concept.summary === "string" && concept.summary.length > 0, `Host concept ${concept.id} must have a summary.`);
  }

  const allowedMaturity = new Set(["compatibility-boundary", "host-candidate", "implemented-boundary", "local-shell"]);
  assertEqualSets(["browser-panel", "devtools", "lsp", "multi-ide", "vscode"], anchors.surfaces.map((surface) => surface.id), "Host surface inventory");
  const surfaceIds = new Set(anchors.surfaces.map((surface) => surface.id));
  for (const surface of anchors.surfaces) {
    assert(allowedMaturity.has(surface.maturity), `Host surface ${surface.id} has an unknown maturity.`);
    assert(typeof surface.entryPoint === "string" && surface.entryPoint.length > 0, `Host surface ${surface.id} must declare an entry point.`);
    assert(Array.isArray(surface.currentEvidence) && surface.currentEvidence.length >= 2, `Host surface ${surface.id} must carry public evidence summary.`);
    assert(typeof surface.currentBoundary === "string" && surface.currentBoundary.length > 0, `Host surface ${surface.id} must declare current boundary.`);
    assert(typeof surface.nextPublicMilestone === "string" && surface.nextPublicMilestone.length > 0, `Host surface ${surface.id} must declare next milestone.`);
  }

  assertEqualSets(["browser-panel-payload", "doc-source-map", "project-index", "project-relation-graph", "structured-open-request"], anchors.artifactContracts.map((contract) => contract.id), "Host artifact contract inventory");
  for (const contract of anchors.artifactContracts) {
    assert(typeof contract.publicArtifact === "string" && contract.publicArtifact.length > 0, `Host contract ${contract.id} must declare a public artifact.`);
    assert(typeof contract.role === "string" && contract.role.length > 0, `Host contract ${contract.id} must declare a role.`);
    assert(Array.isArray(contract.consumedBy) && contract.consumedBy.every((id) => surfaceIds.has(id)), `Host contract ${contract.id} references an unknown host surface.`);
    assert(typeof contract.currentBoundary === "string" && contract.currentBoundary.length > 0, `Host contract ${contract.id} must declare current boundary.`);
  }

  assertEqualSets([...surfaceIds], anchors.evidenceMatrix.map((row) => row.surfaceId), "Host evidence matrix inventory");
  const contractIds = new Set(anchors.artifactContracts.map((contract) => contract.id));
  for (const row of anchors.evidenceMatrix) {
    assert(Array.isArray(row.consumes) && row.consumes.every((id) => contractIds.has(id)), `Host evidence row ${row.surfaceId} references an unknown contract.`);
    assert(Array.isArray(row.supports) && row.supports.length >= 2, `Host evidence row ${row.surfaceId} must declare supported flows.`);
    assert(typeof row.publicEvidence === "string" && row.publicEvidence.length > 0, `Host evidence row ${row.surfaceId} must declare public evidence.`);
    assert(typeof row.notClaimed === "string" && row.notClaimed.length > 0, `Host evidence row ${row.surfaceId} must declare not-claimed boundary.`);
  }

  assert(Array.isArray(anchors.wP29Inputs) && anchors.wP29Inputs.length >= 4, "Host anchors must carry W-P29 inputs.");

  const workflow = anchors.aiAssistedAuthoring;
  assert(workflow?.status === "workflow-candidate", "AI-assisted authoring status drifted.");
  assert(Array.isArray(workflow.workflowSteps) && workflow.workflowSteps.length >= 4, "AI-assisted authoring workflow must have at least four steps.");
  assert(Array.isArray(workflow.guardrails) && workflow.guardrails.length >= 4, "AI-assisted authoring guardrails must have at least four items.");
}

function validateFeedback(data) {
  const feedback = data.feedback;
  assert(feedback?.status === "d4-prep", "Feedback status drifted.");
  assert(typeof feedback.summary === "string" && feedback.summary.includes("public-safe"), "Feedback summary must describe the public-safe boundary.");
  assert(Array.isArray(feedback.publicBoundaries) && feedback.publicBoundaries.length >= 3, "Feedback must declare public boundaries.");

  assertEqualSets(["compatibility-report", "portal-feedback"], feedback.issueTemplates.map((template) => template.id), "Feedback issue template inventory");
  for (const template of feedback.issueTemplates) {
    assert(typeof template.title === "string" && template.title.length > 0, `Feedback template ${template.id} must have a title.`);
    assert(/^\.github\/ISSUE_TEMPLATE\/hia-[a-z0-9-]+\.yml$/.test(template.publicTemplate), `Feedback template ${template.id} must reference a public issue template.`);
    assert(existsSync(path.join(mainRepoRoot, ...template.publicTemplate.split("/"))), `Feedback template ${template.id} file is missing.`);
    assert(Array.isArray(template.useFor) && template.useFor.length >= 3, `Feedback template ${template.id} must describe use cases.`);
    assert(Array.isArray(template.requiredEvidence) && template.requiredEvidence.length >= 3, `Feedback template ${template.id} must describe required evidence.`);
    assert(typeof template.notFor === "string" && template.notFor.length > 0, `Feedback template ${template.id} must declare non-goals.`);
  }

  assertEqualSets(["host-capability-boundary", "maturity-labels", "runner-version-policy", "source-content-privacy"], feedback.compatibilityNotes.map((note) => note.id), "Feedback compatibility note inventory");
  for (const note of feedback.compatibilityNotes) {
    assert(typeof note.title === "string" && note.title.length > 0, `Compatibility note ${note.id} must have a title.`);
    assert(Array.isArray(note.appliesTo) && note.appliesTo.length >= 2, `Compatibility note ${note.id} must declare appliesTo.`);
    assert(typeof note.summary === "string" && note.summary.length > 0, `Compatibility note ${note.id} must have a summary.`);
    assert(typeof note.currentBoundary === "string" && note.currentBoundary.length > 0, `Compatibility note ${note.id} must declare current boundary.`);
  }

  const allowedStatuses = new Set(["candidate-needed", "internal-evidence", "prepared"]);
  assertEqualSets(["feedback-loop", "host-consumer-feedback", "public-third-party-consumer", "published-package-repeatability"], feedback.d4CandidateBacklog.map((candidate) => candidate.id), "Feedback D4 candidate inventory");
  for (const candidate of feedback.d4CandidateBacklog) {
    assert(typeof candidate.title === "string" && candidate.title.length > 0, `D4 candidate ${candidate.id} must have a title.`);
    assert(allowedStatuses.has(candidate.status), `D4 candidate ${candidate.id} has an unknown status.`);
    assert(Array.isArray(candidate.evidenceNeeded) && candidate.evidenceNeeded.length >= 2, `D4 candidate ${candidate.id} must declare required evidence.`);
    assert(typeof candidate.currentBoundary === "string" && candidate.currentBoundary.length > 0, `D4 candidate ${candidate.id} must declare current boundary.`);
  }
}

function validatePublicDocs(data) {
  const publicDocs = data.publicDocs;
  assert(publicDocs?.sourceMode === "derive-from-main-repo-docs", "Public docs source mode drifted.");
  assert(publicDocs.minimumDocumentCount >= 32, "Public docs minimum document count regressed.");
  assert(publicDocs.highPriorityTranslationBacklogCount <= publicDocs.translationBacklogCount, "High-priority translation backlog cannot exceed total backlog.");
  assertEqualSets(["configuration", "contracts", "governance", "guide", "operations", "release", "tooling"], publicDocs.categories.map((category) => category.id), "Public docs category inventory");
}

function validateRoutes(data) {
  const routeValues = [
    ...Object.values(data.pageRoutes.ecosystem),
    ...Object.values(data.pageRoutes.adoption),
    ...Object.values(data.pageRoutes.operations),
    ...Object.values(data.pageRoutes.hosts),
    ...Object.values(data.pageRoutes.feedback)
  ];
  assert(routeValues.length === new Set(routeValues).size, "Public portal route patterns must be unique.");
  for (const route of routeValues) {
    assert(!route.startsWith("/") && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(route), `Route pattern must be relative: ${route}.`);
    assert(route.includes("{locale}"), `Route pattern must be locale-aware: ${route}.`);
    assert(route.endsWith(".html") || route.endsWith("/index.html"), `Route pattern must render to HTML: ${route}.`);
  }
}

function assertNoForbiddenFields(value, forbiddenFields, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, forbiddenFields, `${location}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key !== "forbiddenFieldNames" && forbiddenFields.has(key)) {
      throw new Error(`Public portal data contains forbidden field ${key} at ${location}.`);
    }
    assertNoForbiddenFields(child, forbiddenFields, `${location}.${key}`);
  }
}

function assertNoEmbeddedSources(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoEmbeddedSources(item, `${location}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "sourcesContent" && Array.isArray(child) && child.some((item) => typeof item === "string" && item.length > 0)) {
      throw new Error(`Public portal data embeds sourcesContent at ${location}.`);
    }
    assertNoEmbeddedSources(child, `${location}.${key}`);
  }
}

function assertEqualSets(expected, actual, label) {
  const expectedValues = [...expected].sort(compareStableText);
  const actualValues = [...actual].sort(compareStableText);
  assert(expectedValues.length === actualValues.length && expectedValues.every((value, index) => value === actualValues[index]), `${label} drifted. Expected ${expectedValues.join(", ")}; received ${actualValues.join(", ")}.`);
}

function readJson(filePath) {
  assert(existsSync(filePath), `Required file is missing: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareStableText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
