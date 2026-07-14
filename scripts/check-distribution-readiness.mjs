import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishReady = process.argv.includes("--publish-ready");
const schemaCatalog = JSON.parse(await readFile(path.join(rootDir, "packages/schemas/src/catalog.json"), "utf8"));
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const schemaPublicBaseUrl = "https://mandolin.github.io/HIA-Documentation/schemas/";
const packagePaths = [
  "apps/cli/package.json",
  "packages/browser-panel/package.json",
  "packages/config/package.json",
  "packages/core/package.json",
  "packages/lsp/package.json",
  "packages/parser-jsdoc/package.json",
  "packages/plugin-sdk/package.json",
  "packages/profile/package.json",
  "packages/profiles/package.json",
  "packages/renderer-html/package.json",
  "packages/schemas/package.json",
  "packages/source-linkage/package.json",
  "packages/theme-default/package.json"
];
const rootLicense = await readFile(path.join(rootDir, "LICENSE"), "utf8");
const releaseEntriesByPackagePath = new Map((releasePlan.packages ?? []).map((entry) => [`${entry.path}/package.json`, entry]));

for (const packagePath of packagePaths) {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, packagePath), "utf8"));
  const releaseEntry = releaseEntriesByPackagePath.get(packagePath);
  const packageDir = path.dirname(packagePath);
  const packageLicense = await readFile(path.join(rootDir, packageDir, "LICENSE"), "utf8");
  assert(releaseEntry, `${packagePath}: package is missing from release/public-packages.json.`);
  assert(packageJson.name.startsWith("@hia-doc/"), `${packagePath}: expected the canonical @hia-doc workspace scope.`);
  assert(packageJson.name === releaseEntry.name, `${packagePath}: package name drifted from release plan.`);
  assert(packageJson.license === "MIT", `${packagePath}: expected the approved MIT license metadata.`);
  assert(packageLicense === rootLicense, `${packagePath}: package license drifted from the repository MIT license.`);
  assert(packageJson.version === releaseEntry.targetVersion, `${packagePath}: package version must match release plan target ${releaseEntry.targetVersion}.`);
  assert(packageJson.private !== true, `${packagePath}: package must be public after D3 release.`);
  assert(packageJson.publishConfig?.access === "public", `${packagePath}: publishConfig.access must explicitly be public.`);
}

const publicLicenseExists = await anyPathExists([
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt"
]);
assert(publicLicenseExists, "Distribution policy drift: the approved repository MIT license is missing.");

assert(schemaCatalog.publicBaseUrl === schemaPublicBaseUrl, "Schema catalog publicBaseUrl drifted from the approved GitHub Pages namespace.");
for (const entry of schemaCatalog.schemas) {
  assert(
    entry.schemaId.startsWith(schemaPublicBaseUrl),
    `Schema ${entry.key} does not use the approved GitHub Pages namespace.`
  );
  assert(entry.publicUrl === entry.schemaId, `Schema ${entry.key} publicUrl must match its canonical schemaId.`);
}

console.log(
  publishReady
    ? "Distribution readiness check passed: @hia-doc publish-ready manifests, MIT license and GitHub Pages schema namespace match the release train."
    : "Distribution readiness check passed: @hia-doc public package manifests, MIT license and GitHub Pages schema namespace match the post-D3 release train."
);

async function anyPathExists(relativePaths) {
  for (const relativePath of relativePaths) {
    try {
      await access(path.join(rootDir, relativePath));
      return true;
    } catch {
      // Continue checking the remaining conventional license names.
    }
  }
  return false;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
