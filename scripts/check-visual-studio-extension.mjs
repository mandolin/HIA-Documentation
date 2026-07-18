import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const packagePath = path.join(appRoot, "package.json");
const readmePath = path.join(appRoot, "README.md");
const hostContractPath = path.join(appRoot, "host-contract.json");
const evidencePath = path.join(rootDir, "dist", "visual-studio-extension-check.json");

await main();

/**
 * 校验 Visual Studio host skeleton 的位置、契约映射和隐私边界。
 * Validate the Visual Studio host skeleton placement, contract mapping, and privacy boundary.
 */
async function main() {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const readme = await readFile(readmePath, "utf8");
  const contract = JSON.parse(await readFile(hostContractPath, "utf8"));

  assert.equal(packageJson.name, "@hia-doc/visual-studio-extension", "Visual Studio host package name must be stable.");
  assert.equal(packageJson.private, true, "Visual Studio skeleton must not be publishable yet.");
  assert.equal(packageJson.scripts?.check, "node ../../scripts/check-visual-studio-extension.mjs", "Visual Studio app check script must call the shared checker.");
  assert.equal(packageJson.dependencies, undefined, "Visual Studio skeleton must not add runtime npm dependencies.");
  assert.equal(packageJson.devDependencies, undefined, "Visual Studio skeleton must not add npm dev dependencies.");
  assert.equal(contract.contract, "hia-visual-studio-host-skeleton", "Visual Studio host contract must be explicit.");
  assert.equal(contract.contractVersion, "0.1.0-draft", "Visual Studio host contract version must be explicit.");
  assert.equal(contract.appDirectory, "apps/visual-studio-extension", "Visual Studio host must live under main-repo/apps.");
  assert.equal(contract.host?.model, "hybrid", "Visual Studio host must use the planned hybrid model.");
  assert.equal(contract.runtime?.languageServer?.package, "@hia-doc/lsp", "Visual Studio host must delegate LSP features to @hia-doc/lsp.");
  assert.equal(contract.runtime?.cli?.package, "@hia-doc/cli", "Visual Studio host must delegate builds to @hia-doc/cli.");
  assertRequiredMethods(contract.customRequests);
  assertHostResultMetadata(contract.hostResultMetadata);
  assertPrivacy(contract.privacy);
  assert.match(readme, /VisualStudio\.Extensibility/u, "README must name the VisualStudio.Extensibility route.");
  assert.match(readme, /@hia-doc\/lsp/u, "README must name the LSP dependency boundary.");
  assert.match(readme, /does not parse language source/u, "README must preserve the no-parser host boundary.");

  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify({
    contract: "hia-visual-studio-extension-check",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    app: {
      directory: contract.appDirectory,
      packageName: packageJson.name,
      private: packageJson.private
    },
    host: {
      model: contract.host.model,
      primaryRoute: contract.host.primaryRoute,
      targetIde: contract.host.targetIde
    },
    hostResultMetadata: contract.hostResultMetadata,
    privacy: contract.privacy,
    requests: contract.customRequests.map((request) => ({
      capability: request.capability,
      method: request.method,
      requiresHostMetadata: Boolean(request.requiresHostMetadata),
      version: request.version
    }))
  }, null, 2)}\n`, "utf8");
  console.log(`Visual Studio extension check passed at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

function assertRequiredMethods(customRequests) {
  assert.ok(Array.isArray(customRequests), "Visual Studio host customRequests must be an array.");
  const methods = new Set(customRequests.map((request) => request.method));

  for (const method of [
    "hia/ideCapabilities",
    "hia/documentSourceMapIndex",
    "hia/projectRelationGraph",
    "hia/resourceActions",
    "hia/documentationEditProposals"
  ]) {
    assert.ok(methods.has(method), `Visual Studio host must map ${method}.`);
  }
}

function assertHostResultMetadata(metadata) {
  assert.equal(metadata?.contract, "hia-lsp-host-result", "Visual Studio host must consume hia-lsp-host-result metadata.");
  assert.equal(metadata?.contractVersion, "0.1.0-draft", "Visual Studio host must pin host metadata version.");
  assert.deepEqual(metadata?.supportedSources, [
    "managed-document",
    "workspace-runtime",
    "none"
  ], "Visual Studio host must recognize all host result sources.");
  assert.ok(metadata?.supportedEmptyStates?.includes("query-no-match"), "Visual Studio host must recognize query no-match empty state.");
  assert.ok(metadata?.supportedEmptyStates?.includes("relation-graph-empty"), "Visual Studio host must recognize relation graph empty state.");
}

function assertPrivacy(privacy) {
  assert.equal(privacy?.allowAbsolutePathsInHostPayload, false, "Visual Studio host payloads must avoid absolute paths.");
  assert.equal(privacy?.allowTargetRepositoryMutation, false, "Visual Studio host must not mutate target repositories in this skeleton.");
  assert.equal(privacy?.embedsSourcesContent, false, "Visual Studio host must not embed source contents.");
  assert.equal(privacy?.requiresHumanReviewForEditProposals, true, "Visual Studio host must require human review for edit proposals.");
  assert.equal(privacy?.parsesGeneratedHtml, false, "Visual Studio host must not parse generated HTML.");
  assert.equal(privacy?.runsDocumentationProducers, false, "Visual Studio host must not run producers.");
}
