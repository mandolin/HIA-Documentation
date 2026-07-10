import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaCatalog = JSON.parse(await readFile(path.join(rootDir, "packages/schemas/src/catalog.json"), "utf8"));
const schemaPublicBaseUrl = "https://mandolin.github.io/HIA-Documentation/schemas/";
const packagePaths = [
  "packages/profiles/package.json",
  "packages/schemas/package.json",
  "packages/source-linkage/package.json"
];
const rootLicense = await readFile(path.join(rootDir, "LICENSE"), "utf8");

for (const packagePath of packagePaths) {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, packagePath), "utf8"));
  const packageDir = path.dirname(packagePath);
  const packageLicense = await readFile(path.join(rootDir, packageDir, "LICENSE"), "utf8");
  assert(packageJson.name.startsWith("@hia-doc/"), `${packagePath}: expected the canonical @hia-doc workspace scope.`);
  assert(packageJson.license === "MIT", `${packagePath}: expected the approved MIT license metadata.`);
  assert(packageLicense === rootLicense, `${packagePath}: package license drifted from the repository MIT license.`);
  assert(packageJson.version === "0.0.0", `${packagePath}: package version must remain 0.0.0 before publication approval.`);
  assert(packageJson.private === true, `${packagePath}: package must remain private while npm publication blockers are open.`);
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

console.log("Distribution readiness check passed: @hia-doc scope, MIT license and GitHub Pages schema namespace are approved; npm publication remains blocked by release-version and Trusted Publishing setup.");

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
