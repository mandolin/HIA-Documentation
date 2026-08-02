import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>repository root 从脚本固定位置推导；本 runner 只读 main-repo synthetic fixtures/dist modules。</zh-CN><en>Derive the repository root from the script's fixed location; this runner reads only main-repo synthetic fixtures and dist modules.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(repositoryRoot, "fixtures", "target-owner-adoption-kit");
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp89-owner-adoption-kit");

/**
 * @lang zh-CN 读取一份固定 HIA-owned synthetic request。
 * @lang en Reads one fixed HIA-owned synthetic request.
 *
 * @param {string} name fixture name。 / Fixture name.
 * @returns {Promise<Record<string, unknown>>} parsed request。 / Parsed request.
 */
async function loadFixture(name) {
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8"));
}

/**
 * @lang zh-CN 对 JSON-compatible fixture 创建 detached clone。
 * @lang en Creates a detached clone of a JSON-compatible fixture.
 *
 * @template T
 * @param {T} value JSON-compatible value。 / JSON-compatible value.
 * @returns {T} detached clone。 / Detached clone.
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @lang zh-CN 执行 pure evaluator、runtime guard、拒绝矩阵与 renderer metadata projection evidence。
 * @lang en Executes pure-evaluator, runtime-guard, refusal-matrix, and renderer metadata-projection evidence.
 *
 * @returns {Promise<void>} evidence preparation completion。 / Evidence-preparation completion.
 * @lang zh-CN 不读取/运行/修改目标项目，不联系 owner，也不执行 network、publish 或 adoption action。
 */
async function prepareEvidence() {
  const cliModule = await import(pathToFileURL(path.join(repositoryRoot, "apps", "cli", "dist", "index.js")).href);
  const rendererModule = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const enterpriseRequest = await loadFixture("enterprise-ready.json");
  const workspaceRequest = await loadFixture("workspace-ready.json");
  const deferredRequest = await loadFixture("workspace-deferred.json");

  const enterpriseReport = cliModule.createTargetOwnerAdoptionKit(enterpriseRequest);
  const workspaceReport = cliModule.createTargetOwnerAdoptionKit(workspaceRequest);
  const deferredReport = cliModule.createTargetOwnerAdoptionKit(deferredRequest);
  assert.equal(enterpriseReport.status, "ready-for-owner-review");
  assert.equal(workspaceReport.status, "ready-for-owner-review");
  assert.equal(deferredReport.status, "deferred-owner-input-missing");
  assert.equal(cliModule.isTargetOwnerAdoptionKitReport(enterpriseReport), true);
  assert.equal(cliModule.isTargetOwnerAdoptionKitReport(workspaceReport), true);
  assert.equal(cliModule.isTargetOwnerAdoptionKitReport(deferredReport), true);

  // <lang><zh-CN>矩阵从同一 workspace fixture clone，只保存 fixed diagnostic code，不输出 input identity/body。</zh-CN><en>The matrix clones one workspace fixture and retains only fixed diagnostic codes, never input identity or bodies.</en></lang>
  const refusalCases = [
    { code: "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID", mutate: (request) => { request.futureField = false; } },
    { code: "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID", mutate: (request) => { request.providedContractRefs.pop(); } },
    { code: "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID", mutate: (request) => { request.ownerInput.consent = "not-recorded"; } },
    { code: "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID", mutate: (request) => { request.workspaceHandoff.runtimeDependencyTransfer = true; } },
    { code: "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED", mutate: (request) => { request.privacy.sourceBodyIncluded = true; } },
    { code: "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED", mutate: (request) => { request.permissions.targetAdoptionClaimed = true; } }
  ];
  const coveredDiagnosticCodes = new Set(deferredReport.diagnostics.map((diagnostic) => diagnostic.code));
  for (const refusalCase of refusalCases) {
    const request = cloneJson(workspaceRequest);
    refusalCase.mutate(request);
    const report = cliModule.createTargetOwnerAdoptionKit(request);
    assert.equal(report.status, "refused");
    assert.equal(report.diagnostics.some((diagnostic) => diagnostic.code === refusalCase.code), true);
    assert.equal(cliModule.isTargetOwnerAdoptionKitReport(report), true);
    report.diagnostics.forEach((diagnostic) => coveredDiagnosticCodes.add(diagnostic.code));
  }

  // <lang><zh-CN>renderer 只收到 report.portalSummary；完整 target/trial identity 从未进入 input。</zh-CN><en>The renderer receives only report.portalSummary; full target and trial identities never enter its input.</en></lang>
  const rendered = rendererModule.renderProjectHtmlDocument({
    project: { name: "W-P89 Synthetic Portal Fixture" },
    entries: [{ id: "wp89:synthetic:entry", name: "SyntheticEntry", kind: "module", view: "js" }],
    ownerAdoption: workspaceReport.portalSummary
  }, {
    projectSite: { informationArchitecture: {} }
  });
  const projectIndexText = rendered.files.find((file) => file.path === "project-index.json")?.contents ?? "{}";
  const projectIndex = JSON.parse(projectIndexText);
  assert.equal(projectIndex.ownerAdoption.status, "ready-for-owner-review");
  assert.equal(Object.hasOwn(projectIndex.ownerAdoption, "targetId"), false);
  assert.equal(Object.hasOwn(projectIndex.ownerAdoption, "trialId"), false);
  assert.equal(projectIndexText.includes(workspaceRequest.targetId), false);
  const topicText = rendered.files.find((file) => file.path.startsWith("entries/"))?.contents ?? "";
  assert.equal(topicText.includes("Owner Review Readiness"), true);

  const evidence = {
    contract: "hia-wp89-owner-adoption-kit-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp90-independent-authorization",
    product: {
      owner: "@hia-doc/cli",
      contract: `${cliModule.TARGET_OWNER_ADOPTION_KIT_CONTRACT}@${cliModule.TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION}`,
      supportedFamilyCount: cliModule.TARGET_OWNER_ADOPTION_KIT_FAMILIES.length,
      existingContractReferenceCountPerFamily: 5,
      rendererConsumer: "@hia-doc/renderer-html",
      cliCommand: "hia docs adoption-kit",
      projectBuildLinkage: "--adoption-kit-with-explicit-portal-ia"
    },
    scenarios: {
      readyCount: 2,
      deferredCount: 1,
      refusedCount: refusalCases.length,
      enterpriseWorkflowCount: 1,
      workspaceWorkflowCount: 1,
      portalProjectionCount: 1,
      portalTargetIdentitySerialized: false,
      portalTrialIdentitySerialized: false
    },
    semantics: {
      dimensionsIndependent: true,
      readyResolution: enterpriseReport.semantics.resolution,
      deferredResolution: deferredReport.semantics.resolution,
      confidence: enterpriseReport.semantics.confidence,
      provenance: enterpriseReport.semantics.provenance,
      realOwnerInputCount: 0,
      ownerConsentObtainedCount: 0,
      targetAdoptionCount: 0
    },
    validation: {
      positiveFixtureCount: 3,
      refusalCaseCount: refusalCases.length,
      coveredDiagnosticCodes: [...coveredDiagnosticCodes].sort(),
      runtimeGuardPassed: true,
      portalExactProjectionPassed: true
    },
    privacy: {
      sourceBodyIncluded: false,
      artifactBodyIncluded: false,
      evidenceBodyIncluded: false,
      commandOutputBodyIncluded: false,
      absoluteOrPrivatePathIncluded: false,
      credentialIncluded: false,
      workingStateIncluded: false,
      sourcesContentPolicy: "none"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      ownerContacted: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      portalP5ToP7Started: false,
      independentOutputModified: false,
      wP90Started: false
    }
  };
  await mkdir(evidenceOutputDirectory, { recursive: true });
  await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
