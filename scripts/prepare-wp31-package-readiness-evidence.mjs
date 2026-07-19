import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readNpmPackageVersion } from "./lib/npm-registry.mjs";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(mainRepoRoot, "..");
const outputRoot = path.join(mainRepoRoot, "dist", "wp31-package-readiness");
const evidencePath = path.join(outputRoot, "evidence.json");
const registry = "https://registry.npmjs.org/";

const packageGroups = [
  {
    id: "javadoc",
    title: "JavaDoc",
    repo: "mandolin/hia-javadoc",
    repoPath: path.join(workspaceRoot, "HIA", "hia-javadoc"),
    releaseGateCommand: "npm run release:gate",
    recommendedDecision: "publish-prep-required",
    targetContinuity: "no-current-target-action",
    packages: [
      { directory: "packages/javadoc-spec", order: 10, role: "spec" },
      { directory: "packages/java-doc-extractor", order: 20, role: "extractor" },
      { directory: "packages/javadoc-adapter", order: 30, role: "adapter" },
      { directory: "packages/javadoc-runner", order: 40, role: "runner", bin: "hia-javadoc" },
      { directory: "packages/javadoc-producer", order: 50, role: "producer" }
    ],
    remainingSteps: [
      "Choose explicit first-release window and commit/push a satellite release plan.",
      "Use an approved first-publication route before Trusted Publisher can be configured for new npm package names.",
      "Configure npm Trusted Publisher after the first versions are visible.",
      "Run registry install/import smoke for every package after publish.",
      "Decide whether prebuilt Java helper artifacts belong in future npm packages; P1 keeps source/helper build path."
    ]
  },
  {
    id: "godoc",
    title: "GoDoc",
    repo: "mandolin/hia-godoc",
    repoPath: path.join(workspaceRoot, "HIA", "hia-godoc"),
    releaseGateCommand: "npm run release:gate",
    recommendedDecision: "publish-prep-required",
    targetContinuity: "no-current-target-action",
    packages: [
      { directory: "packages/godoc-spec", order: 10, role: "spec" },
      { directory: "packages/go-doc-extractor", order: 20, role: "extractor" },
      { directory: "packages/godoc-adapter", order: 30, role: "adapter" },
      { directory: "packages/godoc-runner", order: 40, role: "runner", bin: "hia-godoc" },
      { directory: "packages/godoc-producer", order: 50, role: "producer" }
    ],
    remainingSteps: [
      "Choose explicit first-release window and commit/push a satellite release plan.",
      "Use an approved first-publication route before Trusted Publisher can be configured for new npm package names.",
      "Configure npm Trusted Publisher after the first versions are visible.",
      "Run registry install/import smoke for every package after publish.",
      "Decide whether prebuilt Go helper binaries belong in future npm packages; P1 keeps source/helper build path."
    ]
  },
  {
    id: "generic-docline",
    title: "Generic Doc-Line",
    repo: "mandolin/HIA-Documentation",
    repoPath: mainRepoRoot,
    releaseGateCommand: "pnpm --filter @hia-doc/generic-docline check && pnpm --filter @hia-doc/generic-docline contract:check",
    recommendedDecision: "keep-incubating-until-release-plan-entry",
    targetContinuity: "no-current-target-action",
    packages: [
      { directory: "packages/generic-docline", order: 10, role: "fallback-runtime" }
    ],
    remainingSteps: [
      "Add @hia-doc/generic-docline to the main public release plan before any npm publication.",
      "Normalize workspace:* dependencies through the main release tooling or an explicit publish batch.",
      "Wait for at least one real non-dedicated language consumer or W-P32 AI workflow need before publishing.",
      "Run registry install/import smoke after publish."
    ]
  }
];

await main();

/**
 * 生成 W-P31.6 包准备度证据，不执行发布。
 * Generate W-P31.6 package-readiness evidence without publishing anything.
 */
async function main() {
  const releasePlan = await readJson(path.join(mainRepoRoot, "release", "public-packages.json"));
  const releasePlanNames = new Set((releasePlan.packages ?? []).map((item) => item.name));
  const groups = [];
  const hardFailures = [];

  for (const group of packageGroups) {
    const groupResult = await analyzeGroup(group, releasePlanNames);
    groups.push(groupResult);
    hardFailures.push(...groupResult.hardFailures);
  }

  assert.deepEqual(hardFailures, [], `W-P31 package readiness hard failures:\n${hardFailures.join("\n")}`);

  const evidence = {
    contract: "hia-wp31-package-readiness-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    registry,
    summary: {
      packageCount: groups.reduce((count, group) => count + group.packages.length, 0),
      groups: groups.length,
      publishedCount: groups.flatMap((group) => group.packages).filter((item) => item.registry.status === "published").length,
      unpublishedCount: groups.flatMap((group) => group.packages).filter((item) => item.registry.status === "unpublished").length
    },
    groups,
    targetContinuity: {
      policy: "work-zone/notify pull model",
      notificationsCreated: [],
      reason: "JavaDoc, GoDoc and generic-docline package readiness does not require current UnicodeArtJs or HIA-ASPNETPortal repository action. No target project body was modified."
    },
    decision: {
      javadoc: "Local package manifests, CI and release gate are publish-candidate quality; first npm publication is deferred to an explicit release stage.",
      godoc: "Local package manifests, CI and release gate are publish-candidate quality; first npm publication is deferred to an explicit release stage.",
      genericDocLine: "Keep as main-repo incubation package until a release-plan entry and real fallback consumer justify publication."
    }
  };

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`W-P31 package readiness evidence prepared at ${path.relative(mainRepoRoot, evidencePath).replaceAll("\\", "/")}`);
}

async function analyzeGroup(group, releasePlanNames) {
  const rootPackage = await readJson(path.join(group.repoPath, "package.json"));
  const ciPath = path.join(group.repoPath, ".github", "workflows", "ci.yml");
  const hardFailures = [];
  const packages = [];

  if (!rootPackage.private) {
    hardFailures.push(`${group.id}: workspace root package must remain private.`);
  }

  if (!rootPackage.scripts?.["release:gate"] && group.id !== "generic-docline") {
    hardFailures.push(`${group.id}: workspace root must expose release:gate.`);
  }

  if (group.id !== "generic-docline" && !existsSync(ciPath)) {
    hardFailures.push(`${group.id}: satellite CI workflow is missing.`);
  }

  for (const packageRef of group.packages) {
    const packageResult = await analyzePackage(group, packageRef, releasePlanNames);
    packages.push(packageResult);
    hardFailures.push(...packageResult.hardFailures);
  }

  return {
    id: group.id,
    title: group.title,
    repo: group.repo,
    releaseGateCommand: group.releaseGateCommand,
    recommendedDecision: group.recommendedDecision,
    targetContinuity: group.targetContinuity,
    ci: {
      path: path.relative(group.repoPath, ciPath).replaceAll("\\", "/"),
      present: group.id === "generic-docline" ? "main-repo-ci" : existsSync(ciPath)
    },
    hardFailures,
    packages,
    remainingSteps: group.remainingSteps
  };
}

async function analyzePackage(group, packageRef, releasePlanNames) {
  const packageDir = path.join(group.repoPath, packageRef.directory);
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = await readJson(packageJsonPath);
  const hardFailures = [];
  const readinessWarnings = [];
  const registryState = await readNpmPackageVersion({
    name: packageJson.name,
    registry,
    targetVersion: packageJson.version
  });

  check(packageJson.name?.startsWith("@hia-doc/"), hardFailures, `${packageRef.directory}: package name must use @hia-doc scope.`);
  check(packageJson.version === "0.1.0", hardFailures, `${packageJson.name}: W-P31 readiness expects version 0.1.0.`);
  check(packageJson.private !== true, hardFailures, `${packageJson.name}: package must not be private.`);
  check(packageJson.license === "MIT", hardFailures, `${packageJson.name}: package license must be MIT.`);
  check(packageJson.publishConfig?.access === "public", hardFailures, `${packageJson.name}: publishConfig.access must be public.`);
  check(Boolean(packageJson.repository?.url), hardFailures, `${packageJson.name}: repository.url is required.`);
  check(existsSync(path.join(packageDir, "README.md")), hardFailures, `${packageJson.name}: README.md is required.`);
  check(existsSync(path.join(packageDir, "LICENSE")), hardFailures, `${packageJson.name}: LICENSE is required.`);
  check(Array.isArray(packageJson.files) && packageJson.files.includes("README.md") && packageJson.files.includes("LICENSE"), hardFailures, `${packageJson.name}: files must include README.md and LICENSE.`);

  if (packageRef.bin) {
    check(packageJson.bin?.[packageRef.bin], hardFailures, `${packageJson.name}: runner bin ${packageRef.bin} is required.`);
  }

  if (!releasePlanNames.has(packageJson.name)) {
    readinessWarnings.push("not-listed-in-current-main-release-plan");
  }

  if (Object.values(packageJson.dependencies ?? {}).some((version) => version === "workspace:*")) {
    readinessWarnings.push("workspace-dependency-versioning-required-before-publication");
  }

  if (registryState.status === "unpublished") {
    readinessWarnings.push("target-version-not-yet-published");
  } else if (registryState.status === "error") {
    readinessWarnings.push("registry-status-unverified");
  }

  return {
    name: packageJson.name,
    version: packageJson.version,
    role: packageRef.role,
    publishOrder: packageRef.order,
    path: path.relative(group.repoPath, packageDir).replaceAll("\\", "/"),
    hasBin: Boolean(packageRef.bin),
    releasePlanStatus: releasePlanNames.has(packageJson.name) ? "listed" : "not-listed",
    registry: registryState,
    readinessWarnings,
    hardFailures
  };
}

function check(condition, failures, message) {
  if (!condition) {
    failures.push(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
