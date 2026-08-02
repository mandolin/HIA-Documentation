import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runCli, type CliIo } from "./index.js";
import {
  createEnterpriseBaselineCurrentOwnerWorkflow,
  isEnterpriseBaselineCurrentOwnerWorkflowReport,
  ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT,
  ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION,
  ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA,
  type EnterpriseBaselineCurrentOwnerWorkflowReport,
  type EnterpriseBaselineCurrentOwnerWorkflowRequest
} from "./enterprise-owner-workflow.js";
import type { TargetOwnerAdoptionKitRequest } from "./owner-adoption-kit.js";

const FIXTURE_ROOT = fileURLToPath(new URL("../../../fixtures/enterprise-owner-workflow/", import.meta.url));
const CONTINUITY_PAIR_PATH = fileURLToPath(new URL("../../../fixtures/target-continuity/typescript-pair.json", import.meta.url));

/** @lang zh-CN continuity fixture 的 test-only JSON shape。 @lang en Test-only JSON shape of the continuity fixture. */
interface ContinuityPairFixture {
  baseline: unknown;
  current: unknown;
}

/** @lang zh-CN 读取 public synthetic adoption request。 @lang en Reads a public synthetic adoption request. */
async function loadAdoptionRequest(name: string): Promise<TargetOwnerAdoptionKitRequest> {
  return JSON.parse(await readFile(path.join(FIXTURE_ROOT, name), "utf8")) as TargetOwnerAdoptionKitRequest;
}

/** @lang zh-CN 读取既有 W-P84 public-safe evidence pair。 @lang en Reads the existing W-P84 public-safe evidence pair. */
async function loadContinuityPair(): Promise<ContinuityPairFixture> {
  return JSON.parse(await readFile(CONTINUITY_PAIR_PATH, "utf8")) as ContinuityPairFixture;
}

/** @lang zh-CN 创建不会污染 fixture 的 JSON clone。 @lang en Creates a JSON clone that cannot mutate a fixture. */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** @lang zh-CN 构造 isolated CLI IO collector。 @lang en Builds an isolated CLI IO collector. */
function createTestIo(cwd: string, stdout: string[], stderr: string[]): CliIo {
  return { cwd, stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) };
}

describe("enterprise baseline/current owner workflow", () => {
  it("composes a synthetic owner submission and continuity pair without serializing component bodies", async () => {
    const pair = await loadContinuityPair();
    const report = createEnterpriseBaselineCurrentOwnerWorkflow({
      adoptionRequest: await loadAdoptionRequest("adoption-ready.json"),
      baseline: pair.baseline,
      current: pair.current
    });

    expect(report).toMatchObject({
      contract: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT,
      contractVersion: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION,
      status: "ready-for-owner-review",
      target: { family: "enterprise-business", id: "enterprise-typescript-fixture" },
      components: {
        adoptionKit: { status: "ready-for-owner-review", contracts: { requiredCount: 5, providedCount: 5, missingCount: 0 } },
        continuity: { availability: "provided", status: "accepted", requiredOutputsPreserved: true, privacyContinuityPreserved: true }
      },
      semantics: {
        resolution: "owner-input-and-evidence-validated",
        confidence: "caller-provided-unverified",
        provenance: "composed-owner-metadata-workflow",
        adoption: "not-asserted"
      },
      permissions: { ownerContacted: false, targetRepositoryRead: false, targetAdoptionClaimed: false }
    });
    expect(report.diagnostics).toEqual([]);
    expect(report.components.continuity).not.toHaveProperty("input");
    expect(JSON.stringify(report)).not.toContain("ts:fixture:service");
    expect(isEnterpriseBaselineCurrentOwnerWorkflowReport(report)).toBe(true);
  });

  it("records absent real owner input as an honest deferred result", async () => {
    const report = createEnterpriseBaselineCurrentOwnerWorkflow({
      adoptionRequest: await loadAdoptionRequest("adoption-deferred.json")
    });

    expect(report.status).toBe("deferred-owner-input-missing");
    expect(report.components.continuity).toEqual({ availability: "not-provided" });
    expect(report.semantics).toMatchObject({
      resolution: "owner-input-not-received",
      consent: "not-recorded",
      adoption: "not-asserted"
    });
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ code: "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_INPUT_MISSING", severity: "warning" })
    ]);
    expect(isEnterpriseBaselineCurrentOwnerWorkflowReport(report)).toBe(true);
  });

  it("fails closed for partial pairs, contradictory owner states, component refusals, privacy, and permissions", async () => {
    const ready = await loadAdoptionRequest("adoption-ready.json");
    const deferred = await loadAdoptionRequest("adoption-deferred.json");
    const pair = await loadContinuityPair();
    const cases: Array<{ code: string; request: EnterpriseBaselineCurrentOwnerWorkflowRequest }> = [
      { code: "HIA_ENTERPRISE_OWNER_WORKFLOW_REQUEST_INVALID", request: { adoptionRequest: ready, baseline: pair.baseline } },
      { code: "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT", request: { adoptionRequest: ready } },
      { code: "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT", request: { adoptionRequest: deferred, baseline: pair.baseline, current: pair.current } },
      {
        code: "HIA_ENTERPRISE_OWNER_WORKFLOW_ADOPTION_KIT_REFUSED",
        request: { adoptionRequest: { ...cloneJson(ready), providedContractRefs: [] }, baseline: pair.baseline, current: pair.current }
      },
      {
        code: "HIA_ENTERPRISE_OWNER_WORKFLOW_CONTINUITY_REFUSED",
        request: { adoptionRequest: ready, baseline: pair.baseline, current: { ...(pair.current as Record<string, unknown>), status: "incomplete" } }
      },
      {
        code: "HIA_ENTERPRISE_OWNER_WORKFLOW_PRIVACY_REFUSED",
        request: { adoptionRequest: ready, baseline: { ...(pair.baseline as Record<string, unknown>), sourceBody: "forbidden" }, current: pair.current }
      },
      {
        code: "HIA_ENTERPRISE_OWNER_WORKFLOW_PERMISSION_OR_ADOPTION_REFUSED",
        request: { adoptionRequest: { ...cloneJson(ready), permissions: { ...ready.permissions, targetAdoptionClaimed: true as false } }, baseline: pair.baseline, current: pair.current }
      }
    ];

    for (const fixtureCase of cases) {
      const report = createEnterpriseBaselineCurrentOwnerWorkflow(fixtureCase.request);
      expect(report.status, fixtureCase.code).toBe("refused");
      expect(report.diagnostics.map((diagnostic) => diagnostic.code), fixtureCase.code).toContain(fixtureCase.code);
      expect(report.semantics.resolution, fixtureCase.code).toBe("unresolved");
      expect(isEnterpriseBaselineCurrentOwnerWorkflowReport(report), fixtureCase.code).toBe(true);
    }
  });

  it("publishes a closed Draft 2020-12 report schema", () => {
    expect(ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false
    });
    expect(ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA.properties.contract).toEqual({
      const: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT
    });
    expect(ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA.$defs.privacy.additionalProperties).toBe(false);
    expect(ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA.$defs.permissions.additionalProperties).toBe(false);
  });

  it("rejects leaked fields and cross-status report tampering", async () => {
    const report = cloneJson(createEnterpriseBaselineCurrentOwnerWorkflow({
      adoptionRequest: await loadAdoptionRequest("adoption-deferred.json")
    })) as EnterpriseBaselineCurrentOwnerWorkflowReport & { sourceBody?: string };
    report.sourceBody = "must-not-cross-boundary";
    expect(isEnterpriseBaselineCurrentOwnerWorkflowReport(report)).toBe(false);

    delete report.sourceBody;
    report.status = "ready-for-owner-review";
    expect(isEnterpriseBaselineCurrentOwnerWorkflowReport(report)).toBe(false);
  });

  it("CLI reads only explicit safe-relative metadata paths and accepts honest deferred output", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-enterprise-owner-workflow-"));
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      const pair = await loadContinuityPair();
      await writeFile(path.join(root, "adoption-ready.json"), JSON.stringify(await loadAdoptionRequest("adoption-ready.json")), "utf8");
      await writeFile(path.join(root, "adoption-deferred.json"), JSON.stringify(await loadAdoptionRequest("adoption-deferred.json")), "utf8");
      await writeFile(path.join(root, "baseline.json"), JSON.stringify(pair.baseline), "utf8");
      await writeFile(path.join(root, "current.json"), JSON.stringify(pair.current), "utf8");

      expect(await runCli([
        "docs", "enterprise-workflow", "--adoption-request", "adoption-ready.json",
        "--baseline", "baseline.json", "--current", "current.json", "--out", "reports/ready.json"
      ], createTestIo(root, stdout, stderr))).toBe(0);
      const readyReport = JSON.parse(await readFile(path.join(root, "reports", "ready.json"), "utf8"));
      expect(readyReport.status).toBe("ready-for-owner-review");

      expect(await runCli([
        "docs", "enterprise-workflow", "--adoption-request", "adoption-deferred.json", "--out", "reports/deferred.json"
      ], createTestIo(root, stdout, stderr))).toBe(0);
      const deferredReport = JSON.parse(await readFile(path.join(root, "reports", "deferred.json"), "utf8"));
      expect(deferredReport.status).toBe("deferred-owner-input-missing");

      expect(await runCli([
        "docs", "enterprise-workflow", "--adoption-request", "../adoption-ready.json"
      ], createTestIo(root, stdout, stderr))).toBe(1);
      expect(await runCli([
        "docs", "enterprise-workflow", "--adoption-request", "adoption-ready.json", "--baseline", "baseline.json"
      ], createTestIo(root, stdout, stderr))).toBe(1);
      expect(stderr.join("\n")).toContain("HIA_ENTERPRISE_OWNER_WORKFLOW_PATH_INVALID");
      expect([...stdout, ...stderr].join("\n")).not.toContain(root);
    } finally {
      // <lang><zh-CN>只删除 mkdtemp 返回的 exact isolated root。</zh-CN><en>Delete only the exact isolated root returned by mkdtemp.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });
});
