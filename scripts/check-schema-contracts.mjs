import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HIA_PROJECT_MANIFEST_JSON_SCHEMA,
  HIA_PROJECT_MANIFEST_SCHEMA_ID,
  HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
  validateHiaProjectManifest
} from "../packages/config/dist/index.js";
import {
  HIA_DOCUMENT_SCHEMA,
  HIA_DOCUMENT_SCHEMA_ID,
  HIA_DOCUMENT_SCHEMA_VERSION
} from "../packages/core/dist/index.js";
import {
  createHiaProfileSet,
  HIA_PROFILE_JSON_SCHEMA,
  HIA_PROFILE_SCHEMA_ID,
  HIA_PROFILE_SCHEMA_VERSION,
  validateHiaProfile
} from "../packages/profile/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
}

async function readProfileFixtures() {
  const fixtureDir = path.join(rootDir, "packages/profile/src/fixtures/profiles");
  const fileNames = (await readdir(fixtureDir)).filter((fileName) => fileName.endsWith(".profile.json")).sort();
  return Promise.all(fileNames.map(async (fileName) => JSON.parse(await readFile(path.join(fixtureDir, fileName), "utf8"))));
}

assert(HIA_DOCUMENT_SCHEMA.$id === HIA_DOCUMENT_SCHEMA_ID, "HIA document schema id drifted.");
assert(HIA_DOCUMENT_SCHEMA_VERSION === "0.2.0", "Unexpected HIA document schema version.");
assert(HIA_DOCUMENT_SCHEMA.properties.schemaVersion.const === HIA_DOCUMENT_SCHEMA_VERSION, "HIA document schemaVersion const drifted.");

assert(HIA_PROJECT_MANIFEST_JSON_SCHEMA.$id === HIA_PROJECT_MANIFEST_SCHEMA_ID, "Project manifest schema id drifted.");
assert(
  HIA_PROJECT_MANIFEST_JSON_SCHEMA.properties.schemaVersion.const === HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
  "Project manifest schemaVersion const drifted."
);
assert(HIA_PROJECT_MANIFEST_JSON_SCHEMA.required.includes("inputs"), "Project manifest schema must require inputs.");

const projectManifest = await readJson("fixtures/project-mixed.hia-project.json");
const projectDiagnostics = validateHiaProjectManifest(projectManifest, { targetPath: "fixtures/project-mixed.hia-project.json" });
assert(projectDiagnostics.length === 0, `Project manifest fixture has diagnostics: ${JSON.stringify(projectDiagnostics, null, 2)}`);

assert(HIA_PROFILE_JSON_SCHEMA.$id === HIA_PROFILE_SCHEMA_ID, "Profile schema id drifted.");
assert(HIA_PROFILE_JSON_SCHEMA.properties.schemaVersion.const === HIA_PROFILE_SCHEMA_VERSION, "Profile schemaVersion const drifted.");
assert(HIA_PROFILE_JSON_SCHEMA.required.includes("capabilities"), "Profile schema must require capabilities.");

const profiles = await readProfileFixtures();
for (const profile of profiles) {
  const diagnostics = validateHiaProfile(profile);
  assert(diagnostics.length === 0, `Profile fixture ${profile.profileId ?? "unknown"} has diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
}

const profileSet = createHiaProfileSet({ profiles });
assert(profileSet.diagnostics.length === 0, `Profile set has diagnostics: ${JSON.stringify(profileSet.diagnostics, null, 2)}`);

console.log(`Schema contract check passed: 1 project manifest, ${profiles.length} profiles.`);
