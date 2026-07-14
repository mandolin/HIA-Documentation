import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlanPath = path.join(rootDir, "release/public-packages.json");
const workflowPath = path.join(rootDir, ".github/workflows/npm-trusted-publish.yml");
const bootstrapWorkflowPath = path.join(rootDir, ".github/workflows/npm-bootstrap-publish.yml");
const bootstrapScriptPath = path.join(rootDir, "scripts/bootstrap-public-release.mjs");
const rootLicense = await readFile(path.join(rootDir, "LICENSE"), "utf8");
const releasePlan = JSON.parse(await readFile(releasePlanPath, "utf8"));
const publishReady = process.argv.includes("--publish-ready");

const packageEntries = releasePlan.packages ?? [];
const candidatesByName = new Map();
const allowedReleaseStatuses = new Set(["published", "patch-candidate", "candidate"]);

assert(releasePlan.schemaVersion === "0.1.0-draft", "release/public-packages.json: unexpected schemaVersion.");
assert(releasePlan.scope === "@hia-doc", "release/public-packages.json: canonical npm scope must remain @hia-doc.");
assert(releasePlan.registry === "https://registry.npmjs.org/", "release/public-packages.json: registry must remain npmjs.");
assert(releasePlan.runtimeNodeRange === ">=20.19.0", "release/public-packages.json: runtime Node range drifted.");
assert(releasePlan.publishToolchain?.nodeVersion === "24.x", "release/public-packages.json: publish job must use Node 24.x.");
assert(releasePlan.publishToolchain?.minimumNpmVersion === "11.15.0", "release/public-packages.json: Trusted Publishing npm baseline drifted.");

for (const entry of packageEntries) {
  assert(!candidatesByName.has(entry.name), `release/public-packages.json: duplicate package ${entry.name}.`);
  assert(entry.name?.startsWith("@hia-doc/"), `${entry.name}: package must stay in @hia-doc scope.`);
  assert(/^\d+\.\d+\.\d+$/.test(entry.targetVersion ?? ""), `${entry.name}: targetVersion must be npm SemVer without prerelease.`);
  assert(Number.isInteger(entry.publishOrder), `${entry.name}: publishOrder must be an integer.`);
  assert(allowedReleaseStatuses.has(entry.releaseStatus), `${entry.name}: releaseStatus must be one of ${[...allowedReleaseStatuses].join(", ")}.`);
  candidatesByName.set(entry.name, entry);
}

for (const entry of packageEntries) {
  const packageJsonPath = path.join(rootDir, entry.path, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageLicense = await readFile(path.join(rootDir, entry.path, "LICENSE"), "utf8");
  await readFile(path.join(rootDir, entry.path, "README.md"), "utf8");

  assert(packageJson.name === entry.name, `${entry.path}: package name does not match release plan.`);
  assert(packageJson.version === entry.targetVersion, `${entry.name}: package.json must equal release plan target ${entry.targetVersion}.`);
  assert(packageJson.private !== true, `${entry.name}: package must be public after D3 release.`);
  assert(packageJson.publishConfig?.access === "public", `${entry.name}: publishConfig.access must explicitly be public.`);
  assert(packageJson.license === "MIT", `${entry.name}: package license must be MIT.`);
  assert(packageJson.engines?.node === releasePlan.runtimeNodeRange, `${entry.name}: package engine must match runtime baseline.`);
  assert(packageJson.repository?.url === "git+https://github.com/mandolin/HIA-Documentation.git", `${entry.name}: repository URL drifted.`);
  assert(packageJson.repository?.directory === entry.path, `${entry.name}: repository directory must match release plan path.`);
  assert(Array.isArray(packageJson.files), `${entry.name}: package files allowlist is required.`);
  assert(packageJson.files.includes("dist"), `${entry.name}: package files must include dist.`);
  assert(packageJson.files.includes("README.md"), `${entry.name}: package files must include README.md.`);
  assert(packageJson.files.includes("LICENSE"), `${entry.name}: package files must include LICENSE.`);
  assert(packageLicense === rootLicense, `${entry.name}: package LICENSE drifted from repository MIT license.`);

  // 中英说明：首发发布顺序必须尊重 workspace 依赖，避免 npm 端 clean install 找不到下游包。
  // EN: The first public release order must respect workspace dependencies so clean npm installs can resolve every downstream package.
  for (const dependencyName of listLocalDependencyNames(packageJson)) {
    const dependencyEntry = candidatesByName.get(dependencyName);
    assert(dependencyEntry, `${entry.name}: local dependency ${dependencyName} is missing from the public release plan.`);
    assert(
      dependencyEntry.publishOrder < entry.publishOrder,
      `${entry.name}: local dependency ${dependencyName} must publish before this package.`
    );
  }
}

const workflow = await readFile(workflowPath, "utf8");
const bootstrapWorkflow = await readFile(bootstrapWorkflowPath, "utf8");
const bootstrapScript = await readFile(bootstrapScriptPath, "utf8");
assert(workflow.includes("id-token: write"), "npm trusted publish workflow must request id-token: write.");
assert(workflow.includes("node-version: 24.x"), "npm trusted publish workflow must use Node 24.x.");
assert(workflow.includes("npm@^11.15.0"), "npm trusted publish workflow must install npm 11.15.0+.");
assert(workflow.includes("--provenance"), "npm trusted publish workflow must publish with provenance.");
assert(workflow.includes("pnpm --filter"), "npm trusted publish workflow must pack through pnpm to rewrite workspace dependencies.");
assert(workflow.includes("release:gate:publish-ready"), "npm trusted publish workflow must validate the publish-ready manifest.");
assert(bootstrapWorkflow.includes("runs-on: ubuntu-latest"), "npm bootstrap workflow must use a GitHub-hosted runner for provenance.");
assert(bootstrapWorkflow.includes("id-token: write"), "npm bootstrap workflow must request id-token: write for provenance.");
assert(bootstrapWorkflow.includes("node-version: 24.x"), "npm bootstrap workflow must use Node 24.x.");
assert(bootstrapWorkflow.includes("npm@^11.15.0"), "npm bootstrap workflow must install npm 11.15.0+.");
assert(bootstrapWorkflow.includes("HIA_NPM_BOOTSTRAP_TOKEN"), "npm bootstrap workflow must use the dedicated temporary credential secret.");
assert(bootstrapWorkflow.includes("release:gate:publish-ready"), "npm bootstrap workflow must validate the publish-ready manifest.");
assert(bootstrapWorkflow.includes("resume_partial_batch"), "npm bootstrap workflow must make partial-batch resume explicit.");
assert(bootstrapScript.includes("--provenance"), "npm bootstrap script must publish with provenance.");
assert(bootstrapScript.includes("--resume"), "npm bootstrap script must support explicit partial-batch resume.");

console.log(
  publishReady
    ? `Public release plan check passed: ${packageEntries.length} @hia-doc packages match the publish-ready release train.`
    : `Public release plan check passed: ${packageEntries.length} @hia-doc packages match the post-D3 release train.`
);

function listLocalDependencyNames(packageJson) {
  const names = [];
  for (const dependencySection of ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"]) {
    for (const [dependencyName, dependencyRange] of Object.entries(packageJson[dependencySection] ?? {})) {
      if (dependencyName.startsWith("@hia-doc/") && dependencyRange.startsWith("workspace:")) {
        names.push(dependencyName);
      }
    }
  }
  return names;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
