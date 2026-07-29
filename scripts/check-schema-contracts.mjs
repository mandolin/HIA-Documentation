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
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT,
  DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOURCE_SCHEMA_ID,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA,
  DOCUMENTATION_LOCALE_RESOLUTION_SCHEMA_ID,
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
import {
  createOfficialHiaProfileSet,
  HIA_OFFICIAL_PROFILE_CATALOG,
  HIA_OFFICIAL_PROFILE_IDS
} from "../packages/profiles/dist/index.js";
import {
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION,
  validateDocumentationProducerDescriptor,
  validateDocumentationProducerResult
} from "../packages/plugin-sdk/dist/index.js";
import {
  getHiaSchema,
  HIA_SCHEMA_CATALOG,
  HIA_SCHEMA_KEYS
} from "../packages/schemas/dist/index.js";
import {
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION,
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
  validateGeneratedDocumentationBinding,
  validateDocSourceMap
} from "../packages/source-linkage/dist/index.js";

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
  const fixtureDir = path.join(rootDir, "packages/profiles/src/profiles");
  const fileNames = (await readdir(fixtureDir)).filter((fileName) => fileName.endsWith(".profile.json")).sort();
  return Promise.all(fileNames.map(async (fileName) => JSON.parse(await readFile(path.join(fixtureDir, fileName), "utf8"))));
}

assert(HIA_DOCUMENT_SCHEMA.$id === HIA_DOCUMENT_SCHEMA_ID, "HIA document schema id drifted.");
assert(HIA_DOCUMENT_SCHEMA_VERSION === "0.2.0", "Unexpected HIA document schema version.");
assert(HIA_DOCUMENT_SCHEMA.properties.schemaVersion.const === HIA_DOCUMENT_SCHEMA_VERSION, "HIA document schemaVersion const drifted.");

assert(DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA.$id === DOCUMENTATION_LOCALE_RESOURCE_SCHEMA_ID, "Documentation locale resource schema id drifted.");
assert(
  DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA.properties.kind.const === DOCUMENTATION_LOCALE_RESOURCE_CONTRACT
    && DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA.properties.contractVersion.const === DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION,
  "Documentation locale resource contract fields drifted."
);
assert(DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA.$id === DOCUMENTATION_LOCALE_RESOLUTION_SCHEMA_ID, "Documentation locale-resolution schema id drifted.");
assert(
  DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA.properties.contract.const === DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT
    && DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA.properties.contractVersion.const === DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION
    && DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA.properties.privacy.properties.allowResolvedText.const === false,
  "Documentation locale-resolution metadata-only boundary drifted."
);

assert(HIA_PROJECT_MANIFEST_JSON_SCHEMA.$id === HIA_PROJECT_MANIFEST_SCHEMA_ID, "Project manifest schema id drifted.");
assert(
  HIA_PROJECT_MANIFEST_JSON_SCHEMA.properties.schemaVersion.const === HIA_PROJECT_MANIFEST_SCHEMA_VERSION,
  "Project manifest schemaVersion const drifted."
);
assert(HIA_PROJECT_MANIFEST_JSON_SCHEMA.required.includes("project"), "Project manifest schema must require project.");
assert(
  Array.isArray(HIA_PROJECT_MANIFEST_JSON_SCHEMA.anyOf)
    && HIA_PROJECT_MANIFEST_JSON_SCHEMA.anyOf.some((entry) => entry.required?.includes("inputs"))
    && HIA_PROJECT_MANIFEST_JSON_SCHEMA.anyOf.some((entry) => entry.required?.includes("producers")),
  "Project manifest schema must allow inputs or producers."
);

const projectManifestFixturePaths = [
  "fixtures/project-mixed.hia-project.json",
  "fixtures/project-producer.hia-project.json",
  "fixtures/project-producer-warn.hia-project.json",
  "fixtures/project-dotnet.hia-project.json"
];

for (const fixturePath of projectManifestFixturePaths) {
  const fixtureManifest = await readJson(fixturePath);
  const fixtureDiagnostics = validateHiaProjectManifest(fixtureManifest, { targetPath: fixturePath });
  assert(fixtureDiagnostics.length === 0, `Project manifest fixture ${fixturePath} has diagnostics: ${JSON.stringify(fixtureDiagnostics, null, 2)}`);
}

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
assert(
  JSON.stringify([...profileSet.profiles.keys()].sort()) === JSON.stringify([...HIA_OFFICIAL_PROFILE_IDS]),
  "Official profile distribution ids drifted from the schema fixture set."
);
assert(createOfficialHiaProfileSet().diagnostics.length === 0, "Official profile distribution has runtime diagnostics.");
assert(HIA_OFFICIAL_PROFILE_CATALOG.profiles.length === profiles.length, "Official profile catalog size drifted.");

assert(
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA.$id === DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  "Documentation producer descriptor schema id drifted."
);
assert(
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION === "0.1.0-draft",
  "Unexpected documentation producer descriptor schema version."
);
assert(
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA.$id === DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  "Documentation producer result schema id drifted."
);
assert(
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION === "0.1.0-draft",
  "Unexpected documentation producer result schema version."
);
const producerDescriptor = await readJson("fixtures/producer/basic.producer-descriptor.json");
const producerResult = await readJson("fixtures/producer/basic.producer-result.json");
assert(
  validateDocumentationProducerDescriptor(producerDescriptor).length === 0,
  "Documentation producer descriptor fixture has diagnostics."
);
assert(
  validateDocumentationProducerResult(producerResult, { descriptor: producerDescriptor }).length === 0,
  "Documentation producer result fixture has diagnostics."
);

assert(DOC_SOURCE_MAP_JSON_SCHEMA.$id === DOC_SOURCE_MAP_SCHEMA_ID, "Doc source map schema id drifted.");
assert(
  DOC_SOURCE_MAP_JSON_SCHEMA.properties.contractVersion.const === DOC_SOURCE_MAP_SCHEMA_VERSION,
  "Doc source map contractVersion const drifted."
);
const docSourceMap = await readJson("fixtures/project-mixed-alert.docmap.json");
const docSourceMapDiagnostics = validateDocSourceMap(docSourceMap, { path: "fixtures/project-mixed-alert.docmap.json" });
assert(docSourceMapDiagnostics.length === 0, `Doc source map fixture has diagnostics: ${JSON.stringify(docSourceMapDiagnostics, null, 2)}`);

assert(
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$id === GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
  "Generated documentation binding schema id drifted."
);
assert(
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.properties.contractVersion.const === GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
  "Generated documentation binding contractVersion const drifted."
);
assert(
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.includes("bindings")
    && GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.includes("expansions")
    && GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.includes("targets")
    && GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.includes("diagnostics"),
  "Generated documentation binding schema must retain its four neutral collections."
);
assert(
  typeof validateGeneratedDocumentationBinding === "function",
  "Generated documentation binding owner validator must be exported."
);

const ownerSchemas = new Map([
  [HIA_DOCUMENT_SCHEMA_ID, HIA_DOCUMENT_SCHEMA],
  [DOCUMENTATION_LOCALE_RESOURCE_SCHEMA_ID, DOCUMENTATION_LOCALE_RESOURCE_JSON_SCHEMA],
  [DOCUMENTATION_LOCALE_RESOLUTION_SCHEMA_ID, DOCUMENTATION_LOCALE_RESOLUTION_JSON_SCHEMA],
  [HIA_PROJECT_MANIFEST_SCHEMA_ID, HIA_PROJECT_MANIFEST_JSON_SCHEMA],
  [HIA_PROFILE_SCHEMA_ID, HIA_PROFILE_JSON_SCHEMA],
  [DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID, DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA],
  [DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID, DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA],
  [DOC_SOURCE_MAP_SCHEMA_ID, DOC_SOURCE_MAP_JSON_SCHEMA],
  [GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID, GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA]
]);
assert(
  JSON.stringify(HIA_SCHEMA_CATALOG.schemas.map((entry) => entry.key)) === JSON.stringify([...HIA_SCHEMA_KEYS]),
  "Schema distribution catalog keys drifted."
);
for (const entry of HIA_SCHEMA_CATALOG.schemas) {
  const ownerSchema = ownerSchemas.get(entry.schemaId);
  assert(ownerSchema, `Schema catalog references an unknown owner schema: ${entry.schemaId}`);
  assert(
    JSON.stringify(getHiaSchema(entry.key)) === JSON.stringify(ownerSchema),
    `Distributed schema snapshot drifted from owner package: ${entry.key}`
  );
}

console.log(`Schema contract check passed: ${projectManifestFixturePaths.length} project manifests, 1 producer descriptor/result, 1 doc-source-map, 1 generated documentation binding schema, 1 documentation locale resource schema, 1 documentation locale-resolution schema, ${profiles.length} profiles, ${HIA_SCHEMA_CATALOG.schemas.length} distributed schemas.`);
