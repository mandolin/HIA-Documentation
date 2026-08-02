import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>所有路径从 HIA main-repo 脚本位置推导；runner 不解析或访问任何目标仓库。</zh-CN><en>Derive every path from the HIA main-repo script location; the runner neither resolves nor accesses any target repository.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowFixtureRoot = path.join(repositoryRoot, "fixtures", "enterprise-owner-workflow");
const continuityPairPath = path.join(repositoryRoot, "fixtures", "target-continuity", "typescript-pair.json");
const workspaceRequestPath = path.join(repositoryRoot, "fixtures", "target-owner-adoption-kit", "workspace-ready.json");
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp90-enterprise-owner-workflow");

/**
 * @lang zh-CN 读取一份固定 HIA-owned JSON fixture。
 * @lang en Reads one fixed HIA-owned JSON fixture.
 *
 * @param {string} fixturePath HIA main-repo 内的固定 fixture path。 / Fixed fixture path under HIA main-repo.
 * @returns {Promise<Record<string, unknown>>} parsed object。 / Parsed object.
 */
async function loadJson(fixturePath) {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

/**
 * @lang zh-CN 创建 detached JSON clone，拒绝矩阵不会污染共享 fixture。
 * @lang en Creates a detached JSON clone so the refusal matrix cannot mutate shared fixtures.
 *
 * @template T
 * @param {T} value JSON-compatible value。 / JSON-compatible value.
 * @returns {T} detached clone。 / Detached clone.
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @lang zh-CN 执行 synthetic ready、现实 deferred、拒绝矩阵、schema 与 runtime-guard evidence。
 * @lang en Executes synthetic-ready, real-world-deferred, refusal-matrix, schema, and runtime-guard evidence.
 *
 * @returns {Promise<void>} evidence preparation completion。 / Evidence-preparation completion.
 * @lang zh-CN 本 runner 不读取/运行/写入目标项目，不联系 owner，不访问网络，也不声明 adoption。
 */
async function prepareEvidence() {
  const cliModule = await import(pathToFileURL(path.join(repositoryRoot, "apps", "cli", "dist", "index.js")).href);
  const readyAdoptionRequest = await loadJson(path.join(workflowFixtureRoot, "adoption-ready.json"));
  const deferredAdoptionRequest = await loadJson(path.join(workflowFixtureRoot, "adoption-deferred.json"));
  const workspaceAdoptionRequest = await loadJson(workspaceRequestPath);
  const pair = await loadJson(continuityPairPath);

  const readyReport = cliModule.createEnterpriseBaselineCurrentOwnerWorkflow({
    adoptionRequest: readyAdoptionRequest,
    baseline: pair.baseline,
    current: pair.current
  });
  const deferredReport = cliModule.createEnterpriseBaselineCurrentOwnerWorkflow({
    adoptionRequest: deferredAdoptionRequest
  });
  assert.equal(readyReport.status, "ready-for-owner-review");
  assert.equal(deferredReport.status, "deferred-owner-input-missing");
  assert.equal(cliModule.isEnterpriseBaselineCurrentOwnerWorkflowReport(readyReport), true);
  assert.equal(cliModule.isEnterpriseBaselineCurrentOwnerWorkflowReport(deferredReport), true);
  assert.equal(JSON.stringify(readyReport).includes("ts:fixture:service"), false);

  // <lang><zh-CN>每个 refusal 只记录 fixed diagnostic code；caller data、path 与 component body 不进入 evidence。</zh-CN><en>Each refusal records only a fixed diagnostic code; caller data, paths, and component bodies never enter evidence.</en></lang>
  const refusalCases = [
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_REQUEST_INVALID",
      request: { adoptionRequest: readyAdoptionRequest, baseline: pair.baseline }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_TARGET_FAMILY_INVALID",
      request: { adoptionRequest: workspaceAdoptionRequest, baseline: pair.baseline, current: pair.current }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT",
      request: { adoptionRequest: readyAdoptionRequest }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_ADOPTION_KIT_REFUSED",
      request: { adoptionRequest: { ...cloneJson(readyAdoptionRequest), providedContractRefs: [] }, baseline: pair.baseline, current: pair.current }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_CONTINUITY_REFUSED",
      request: { adoptionRequest: readyAdoptionRequest, baseline: pair.baseline, current: { ...pair.current, status: "incomplete" } }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_PRIVACY_REFUSED",
      request: { adoptionRequest: readyAdoptionRequest, baseline: { ...pair.baseline, sourceBody: "refused-before-serialization" }, current: pair.current }
    },
    {
      code: "HIA_ENTERPRISE_OWNER_WORKFLOW_PERMISSION_OR_ADOPTION_REFUSED",
      request: {
        adoptionRequest: { ...cloneJson(readyAdoptionRequest), permissions: { ...readyAdoptionRequest.permissions, targetAdoptionClaimed: true } },
        baseline: pair.baseline,
        current: pair.current
      }
    }
  ];
  const coveredDiagnosticCodes = new Set(deferredReport.diagnostics.map((diagnostic) => diagnostic.code));
  for (const refusalCase of refusalCases) {
    const report = cliModule.createEnterpriseBaselineCurrentOwnerWorkflow(refusalCase.request);
    assert.equal(report.status, "refused");
    assert.equal(report.diagnostics.some((diagnostic) => diagnostic.code === refusalCase.code), true);
    assert.equal(cliModule.isEnterpriseBaselineCurrentOwnerWorkflowReport(report), true);
    report.diagnostics.forEach((diagnostic) => coveredDiagnosticCodes.add(diagnostic.code));
  }

  assert.equal(cliModule.ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(cliModule.ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA.additionalProperties, false);
  assert.deepEqual([...coveredDiagnosticCodes].sort(), [...cliModule.ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_DIAGNOSTIC_CODES].sort());

  const evidence = {
    contract: "hia-wp90-enterprise-owner-workflow-evidence",
    contractVersion: "0.1.0-draft",
    status: "w-p90-complete-real-owner-input-deferred",
    product: {
      owner: "@hia-doc/cli",
      contract: `${cliModule.ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT}@${cliModule.ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION}`,
      componentContractCount: 2,
      cliCommand: "hia docs enterprise-workflow",
      supportedFamily: "enterprise-business",
      schemaDraft: "2020-12",
      unknownFutureDraftPolicy: "fail-closed"
    },
    scenarios: {
      syntheticReadyCount: 1,
      honestDeferredCount: 1,
      refusalCaseCount: refusalCases.length,
      completePairRequired: true,
      componentBodiesSerialized: false,
      entryOrProducerIdsSerialized: false
    },
    semantics: {
      dimensionsIndependent: true,
      readyResolution: readyReport.semantics.resolution,
      deferredResolution: deferredReport.semantics.resolution,
      confidence: readyReport.semantics.confidence,
      provenance: readyReport.semantics.provenance,
      realOwnerInputCount: 0,
      ownerConsentObtainedCount: 0,
      targetAdoptionCount: 0
    },
    validation: {
      runtimeGuardPassed: true,
      schemaIdentityPassed: true,
      diagnosticCatalogCovered: true,
      coveredDiagnosticCodes: [...coveredDiagnosticCodes].sort()
    },
    privacy: {
      adoptionRequestBodySerialized: false,
      baselineEvidenceSerialized: false,
      currentEvidenceSerialized: false,
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      pathSerialized: false,
      credentialSerialized: false,
      workingStateSerialized: false,
      sourcesContentPolicy: "none"
    },
    permissions: {
      ownerContacted: false,
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      targetProjectModified: false,
      wP91Started: false
    }
  };
  await mkdir(evidenceOutputDirectory, { recursive: true });
  await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
