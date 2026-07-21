import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const packagePath = path.join(appRoot, "package.json");
const readmePath = path.join(appRoot, "README.md");
const hostContractPath = path.join(appRoot, "host-contract.json");
const reviewSurfacePath = path.join(appRoot, "review-surface.json");
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
  const reviewSurface = JSON.parse(await readFile(reviewSurfacePath, "utf8"));

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
  assertReviewSurface(contract, reviewSurface);
  assertPrivacy(contract.privacy);
  assert.match(readme, /VisualStudio\.Extensibility/u, "README must name the VisualStudio.Extensibility route.");
  assert.match(readme, /@hia-doc\/lsp/u, "README must name the LSP dependency boundary.");
  assert.match(readme, /does not parse language source/u, "README must preserve the no-parser host boundary.");
  assert.match(readme, /review-surface\.json/u, "README must document the Visual Studio review surface input.");

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
    reviewSurface: {
      contract: reviewSurface.contract,
      contractVersion: reviewSurface.contractVersion,
      status: reviewSurface.status,
      surfaceId: reviewSurface.surface.id,
      payloadContract: reviewSurface.surface.payloadContract,
      editCandidateContract: reviewSurface.surface.editCandidateContract,
      editDiffPreviewContract: reviewSurface.surface.editDiffPreviewContract,
      editApplyPreflightContract: reviewSurface.surface.editApplyPreflightContract,
      applyPreview: reviewSurface.applyPreview,
      checkedApplyConfirmation: reviewSurface.checkedApplyConfirmation,
      targetCollaboration: reviewSurface.targetCollaboration,
      viewCount: reviewSurface.views.length,
      actionCount: reviewSurface.actions.length,
      disabledApply: reviewSurface.actions.some((action) => action.id === "apply-candidate" && action.available === false),
      languageMarkers: reviewSurface.languageAuthoringHints.canonicalMarkers,
      targetScenarios: reviewSurface.targetScenarios.map((scenario) => scenario.id)
    },
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

/**
 * 校验 Visual Studio review tool-window 的只读输入契约。
 * Validate the read-only input contract for the Visual Studio review tool window.
 *
 * @param {object} contract Host skeleton contract.
 * @param {object} reviewSurface Review-surface input contract.
 * @returns {void}
 */
function assertReviewSurface(contract, reviewSurface) {
  assert.equal(reviewSurface?.contract, "hia-visual-studio-review-surface", "Visual Studio review surface contract must be explicit.");
  assert.equal(reviewSurface?.contractVersion, "0.1.0-draft", "Visual Studio review surface version must be explicit.");
  assert.equal(reviewSurface?.surface?.primaryRequest, "hia/documentationEditProposals", "Visual Studio review surface must consume the review proposal request.");
  assert.equal(reviewSurface?.surface?.payloadContract, "hia-documentation-review-payload@0.1.0-draft", "Visual Studio review surface must pin review payload.");
  assert.equal(reviewSurface?.surface?.editCandidateContract, "hia-documentation-edit-candidate@0.1.0-draft", "Visual Studio review surface must pin edit candidate preview.");
  assert.equal(reviewSurface?.surface?.editDiffPreviewContract, "hia-documentation-edit-diff-preview@0.1.0-draft", "Visual Studio review surface must pin edit diff preview.");
  assert.equal(reviewSurface?.surface?.editApplyPreflightContract, "hia-documentation-edit-apply-preflight@0.1.0-draft", "Visual Studio review surface must pin edit apply preflight.");
  assert.equal(reviewSurface?.surface?.providerAugmentationContract, "hia-provider-review-payload-augmentation@0.1.0-draft", "Visual Studio review surface must pin provider augmentation.");
  assert.equal(reviewSurface?.providerReview?.status, "input-ready", "Visual Studio review surface must expose provider-review input readiness.");
  assert.equal(reviewSurface?.providerReview?.inputMode, "review-payload-augmentation-only", "Visual Studio provider review must consume augmentation only.");
  assert.equal(reviewSurface?.providerReview?.checkedApplyAvailable, false, "Visual Studio provider review must not claim checked apply.");
  assert.equal(reviewSurface?.providerReview?.externalProviderApiKeyRequired, false, "Visual Studio provider review must not require API keys.");
  assert.equal(reviewSurface?.providerReview?.externalProviderNetworkAllowed, false, "Visual Studio provider review must not claim external network access.");
  assert.equal(reviewSurface?.providerReview?.workspaceWriteAvailable, false, "Visual Studio provider review must not claim workspace writes.");
  assert.equal(reviewSurface?.providerReview?.targetRepositoryMutation, false, "Visual Studio provider review must not mutate target repositories.");
  assert.ok(Array.isArray(reviewSurface?.providerReview?.requiredFields) && reviewSurface.providerReview.requiredFields.includes("providerAugmentation.reviewMetadata"), "Visual Studio provider review must require provider review metadata.");
  assert.equal(reviewSurface?.applyPreview?.status, "input-ready", "Visual Studio review surface must expose apply-preview input readiness.");
  assert.equal(reviewSurface?.applyPreview?.inputMode, "preflight-preview-only", "Visual Studio review surface must keep apply preview preflight-only.");
  assert.equal(reviewSurface?.applyPreview?.checkedApplyAvailable, false, "Visual Studio review surface must not claim checked apply.");
  assert.equal(reviewSurface?.applyPreview?.hostFileReadAvailable, false, "Visual Studio review surface must not claim host file reads.");
  assert.equal(reviewSurface?.applyPreview?.workspaceWriteAvailable, false, "Visual Studio review surface must not claim workspace writes.");
  assert.equal(reviewSurface?.applyPreview?.targetRepositoryMutation, false, "Visual Studio review surface must not mutate target repositories.");
  assert.ok(Array.isArray(reviewSurface?.applyPreview?.requiredFields) && reviewSurface.applyPreview.requiredFields.includes("item.editCandidate.applyPreflight.targetFiles"), "Visual Studio review surface must require apply preflight target files.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.status, "input-ready", "Visual Studio review surface must expose checked apply confirmation readiness.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.inputMode, "confirmation-preview-only", "Visual Studio checked apply confirmation must stay preview-only.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.checkedApplyAvailable, false, "Visual Studio checked apply confirmation must not claim checked apply availability.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.workspaceWriteAvailable, false, "Visual Studio checked apply confirmation must not claim workspace writes.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.targetRepositoryMutation, false, "Visual Studio checked apply confirmation must not mutate target repositories.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.directApplyAvailable, false, "Visual Studio checked apply confirmation must not allow direct apply.");
  assert.ok(Array.isArray(reviewSurface?.checkedApplyConfirmation?.requiredFields) && reviewSurface.checkedApplyConfirmation.requiredFields.includes("checkedApplyConfirmation.confirmationReportCount"), "Visual Studio checked apply confirmation must require confirmation report count.");
  assert.equal(reviewSurface?.targetCollaboration?.status, "input-ready", "Visual Studio review surface must expose target collaboration readiness.");
  assert.equal(reviewSurface?.targetCollaboration?.inputMode, "target-owner-flow-only", "Visual Studio target collaboration must stay target-owner-only.");
  assert.equal(reviewSurface?.targetCollaboration?.targetOwnerActionRequiredForWrite, true, "Visual Studio target collaboration must require target owner action.");
  assert.equal(reviewSurface?.targetCollaboration?.hiaOwnedTargetRepositoryMutationAllowed, false, "Visual Studio target collaboration must not allow HIA-owned target mutation.");
  assert.equal(reviewSurface?.targetCollaboration?.actualTargetBranchCreated, false, "Visual Studio target collaboration must not claim branch creation.");
  assert.equal(reviewSurface?.targetCollaboration?.actualPullRequestCreated, false, "Visual Studio target collaboration must not claim pull request creation.");
  assert.equal(reviewSurface?.targetCollaboration?.targetRepositoryMutationCount, 0, "Visual Studio target collaboration must keep target mutation count at zero.");
  assert.ok(Array.isArray(reviewSurface?.targetCollaboration?.requiredFields) && reviewSurface.targetCollaboration.requiredFields.includes("targetCollaboration.flowStateCount"), "Visual Studio target collaboration must require flow state count.");
  assert.ok(hasSurface(contract, reviewSurface.surface.id), "Host contract must declare the Visual Studio review tool window.");
  assertSurfaceView(reviewSurface, "review-list");
  assertSurfaceView(reviewSurface, "review-detail");
  assertSurfaceView(reviewSurface, "provider-review");
  assertSurfaceView(reviewSurface, "candidate-preview");
  assertSurfaceView(reviewSurface, "checked-apply-confirmation");
  assertSurfaceView(reviewSurface, "target-collaboration");
  assertAction(reviewSurface, "copy-draft", { mutatesTargetRepository: false });
  assertAction(reviewSurface, "open-context", { mutatesTargetRepository: false });
  assertAction(reviewSurface, "apply-candidate", {
    available: false,
    mutatesTargetRepository: false,
    requiresHumanReview: true
  });
  assert.deepEqual(reviewSurface?.languageAuthoringHints?.canonicalMarkers, [
    "@lang",
    "<lang>",
    "<l>"
  ], "Visual Studio language authoring hints must use canonical markers.");
  assert.ok(reviewSurface?.targetScenarios?.some((scenario) => scenario.id === "hia-aspnetportal"), "Visual Studio review surface must keep the HIA-ASPNETPortal scenario visible.");
  assert.equal(reviewSurface?.privacy?.allowTargetRepositoryMutation, false, "Visual Studio review surface must not mutate target repositories.");
  assert.equal(reviewSurface?.privacy?.embedsSourcesContent, false, "Visual Studio review surface must not embed source contents.");
  assert.equal(reviewSurface?.privacy?.allowsAutomaticApply, false, "Visual Studio review surface must not allow automatic apply.");
}

function hasSurface(contract, surfaceId) {
  return Array.isArray(contract?.surfaces) && contract.surfaces.some((surface) => surface.id === surfaceId);
}

function assertSurfaceView(reviewSurface, viewId) {
  assert.ok(
    Array.isArray(reviewSurface?.views) && reviewSurface.views.some((view) => view.id === viewId && Array.isArray(view.requiredFields) && view.requiredFields.length > 0),
    `Visual Studio review surface must define ${viewId}.`
  );
}

function assertAction(reviewSurface, actionId, expected) {
  const action = Array.isArray(reviewSurface?.actions)
    ? reviewSurface.actions.find((candidate) => candidate.id === actionId)
    : undefined;

  assert.ok(action, `Visual Studio review surface must define ${actionId}.`);

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(action[key], value, `Visual Studio review action ${actionId} must set ${key}.`);
  }
}

function assertPrivacy(privacy) {
  assert.equal(privacy?.allowAbsolutePathsInHostPayload, false, "Visual Studio host payloads must avoid absolute paths.");
  assert.equal(privacy?.allowTargetRepositoryMutation, false, "Visual Studio host must not mutate target repositories in this skeleton.");
  assert.equal(privacy?.embedsSourcesContent, false, "Visual Studio host must not embed source contents.");
  assert.equal(privacy?.allowsAutomaticApply, false, "Visual Studio host must not auto-apply edit candidates.");
  assert.equal(privacy?.requiresHumanReviewForEditProposals, true, "Visual Studio host must require human review for edit proposals.");
  assert.equal(privacy?.parsesGeneratedHtml, false, "Visual Studio host must not parse generated HTML.");
  assert.equal(privacy?.runsDocumentationProducers, false, "Visual Studio host must not run producers.");
}
