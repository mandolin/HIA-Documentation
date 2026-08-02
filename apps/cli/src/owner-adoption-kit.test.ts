import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runCli, type CliIo } from "./index.js";
import {
  createTargetOwnerAdoptionKit,
  isTargetOwnerAdoptionKitReport,
  TARGET_OWNER_ADOPTION_KIT_CONTRACT,
  TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
  TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA,
  TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID,
  type TargetOwnerAdoptionKitReport,
  type TargetOwnerAdoptionKitRequest
} from "./owner-adoption-kit.js";

/** @lang zh-CN fixture root 只指向 main-repo 自有 synthetic adoption-kit 数据。 @lang en Fixture root points only to main-repo-owned synthetic adoption-kit data. */
const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures/target-owner-adoption-kit");

/**
 * @lang zh-CN 读取一份固定 synthetic request fixture。
 * @lang en Reads one fixed synthetic request fixture.
 *
 * @param name repository-owned fixture name。 / Repository-owned fixture name.
 * @returns parsed adoption-kit request。 / Parsed adoption-kit request.
 */
async function loadFixture(name: string): Promise<TargetOwnerAdoptionKitRequest> {
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8")) as TargetOwnerAdoptionKitRequest;
}

/**
 * @lang zh-CN 对 JSON-compatible test value 创建 detached clone。
 * @lang en Creates a detached clone of a JSON-compatible test value.
 *
 * @param value JSON-compatible value。 / JSON-compatible value.
 * @returns detached clone。 / Detached clone.
 */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * @lang zh-CN 创建只在 memory 收集输出的 CLI test adapter。
 * @lang en Creates a CLI test adapter that captures output only in memory.
 *
 * @param cwd isolated temporary caller root。 / Isolated temporary caller root.
 * @param stdout stdout collector。 / Stdout collector.
 * @param stderr stderr collector。 / Stderr collector.
 * @returns controlled CLI IO。 / Controlled CLI IO.
 */
function createTestIo(cwd: string, stdout: string[], stderr: string[]): CliIo {
  return {
    cwd,
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message)
  };
}

describe("target-owner adoption kit contract", () => {
  it("exports a closed owner-local schema with deny-all permissions", () => {
    expect(TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID).toContain("target-owner-adoption-kit-0.1.0-draft.schema.json");
    expect(TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
        contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
        portalSummary: { $ref: "#/$defs/portalSummary" },
        permissions: { $ref: "#/$defs/permissions" }
      }
    });
    const permissions = TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA.$defs.permissions.properties;
    expect(Object.values(permissions).every((schema) => schema.const === false)).toBe(true);
  });

  it("builds an enterprise continuity kit without claiming adoption", async () => {
    const request = await loadFixture("enterprise-ready.json");
    const report = createTargetOwnerAdoptionKit(request);

    expect(report).toMatchObject({
      status: "ready-for-owner-review",
      trial: { workflow: "enterprise-continuity", targetFamily: "enterprise-business" },
      contracts: { providedCount: 5, missingCount: 0 },
      semantics: {
        resolution: "owner-input-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-owner-kit",
        adoption: "not-asserted"
      },
      permissions: { targetAdoptionClaimed: false, targetRepositoryWrite: false }
    });
    expect(report.portalSummary).not.toHaveProperty("targetId");
    expect(report.portalSummary).not.toHaveProperty("trialId");
    expect(isTargetOwnerAdoptionKitReport(report)).toBe(true);
  });

  it("builds a count-only workspace handoff review kit", async () => {
    const report = createTargetOwnerAdoptionKit(await loadFixture("workspace-ready.json"));

    expect(report.status).toBe("ready-for-owner-review");
    expect(report.workspaceHandoff).toEqual({
      state: "owner-review-required",
      repositoryOwnerCount: 3,
      handoffEdgeCount: 2,
      runtimeDependencyTransfer: false,
      targetWriteRequired: false
    });
    expect(report.portalSummary.workspaceHandoff).toEqual({
      state: "owner-review-required",
      repositoryOwnerCount: 3,
      handoffEdgeCount: 2
    });
    expect(JSON.stringify(report.portalSummary)).not.toContain("synthetic-workspace-container");
    expect(isTargetOwnerAdoptionKitReport(report)).toBe(true);
  });

  it("keeps absent owner input honestly deferred with zero real adoption", async () => {
    const report = createTargetOwnerAdoptionKit(await loadFixture("workspace-deferred.json"));

    expect(report.status).toBe("deferred-owner-input-missing");
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ code: "HIA_OWNER_ADOPTION_KIT_OWNER_INPUT_MISSING", severity: "warning" })
    ]);
    expect(report.contracts).toMatchObject({ providedCount: 0, missingCount: 5 });
    expect(report.semantics).toMatchObject({
      resolution: "owner-input-not-received",
      consent: "not-recorded",
      adoption: "not-asserted"
    });
    expect(isTargetOwnerAdoptionKitReport(report)).toBe(true);
  });

  it("fails closed for contract, attestation, handoff, privacy, permission, and unknown-field violations", async () => {
    const source = await loadFixture("workspace-ready.json");
    const cases: Array<{ code: string; mutate: (request: TargetOwnerAdoptionKitRequest & Record<string, unknown>) => void }> = [
      { code: "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID", mutate: (request) => { request.futureField = false; } },
      { code: "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID", mutate: (request) => { request.providedContractRefs.pop(); } },
      { code: "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID", mutate: (request) => { request.ownerInput.consent = "not-recorded"; } },
      { code: "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID", mutate: (request) => { if (request.workspaceHandoff) request.workspaceHandoff.runtimeDependencyTransfer = true as false; } },
      { code: "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED", mutate: (request) => { request.privacy.sourceBodyIncluded = true as false; } },
      { code: "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED", mutate: (request) => { request.permissions.targetAdoptionClaimed = true as false; } }
    ];

    for (const fixtureCase of cases) {
      const request = cloneJson(source) as TargetOwnerAdoptionKitRequest & Record<string, unknown>;
      fixtureCase.mutate(request);
      const report = createTargetOwnerAdoptionKit(request);
      expect(report.status, fixtureCase.code).toBe("refused");
      expect(report.diagnostics.map((diagnostic) => diagnostic.code), fixtureCase.code).toContain(fixtureCase.code);
      expect(report.semantics.resolution, fixtureCase.code).toBe("unresolved");
      expect(isTargetOwnerAdoptionKitReport(report), fixtureCase.code).toBe(true);
    }
  });

  it("CLI reads and writes only explicit safe-relative request/report paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-owner-adoption-kit-"));
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      const request = await loadFixture("enterprise-ready.json");
      await writeFile(path.join(root, "request.json"), JSON.stringify(request), "utf8");
      const exitCode = await runCli([
        "docs", "adoption-kit", "--request", "request.json", "--out", "reports/kit.json"
      ], createTestIo(root, stdout, stderr));
      const report = JSON.parse(await readFile(path.join(root, "reports", "kit.json"), "utf8")) as TargetOwnerAdoptionKitReport;

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(report.status).toBe("ready-for-owner-review");
      expect(isTargetOwnerAdoptionKitReport(report)).toBe(true);

      const unsafeExitCode = await runCli([
        "docs", "adoption-kit", "--request", "../request.json"
      ], createTestIo(root, stdout, stderr));
      expect(unsafeExitCode).toBe(1);
      expect(stderr.join("\n")).toContain("HIA_OWNER_ADOPTION_KIT_PATH_INVALID");
      expect([...stdout, ...stderr].join("\n")).not.toContain(root);
    } finally {
      // <lang><zh-CN>只清理 mkdtemp 返回的 exact test root。</zh-CN><en>Clean up only the exact test root returned by mkdtemp.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });

  it("links a generated kit into project Portal output through explicit IA only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-owner-adoption-portal-"));
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      await writeFile(path.join(root, "request.json"), JSON.stringify(await loadFixture("workspace-ready.json")), "utf8");
      await writeFile(path.join(root, "basic.hia.json"), await readFile(path.resolve("fixtures/basic.hia.json"), "utf8"), "utf8");
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          renderer: {
            projectLayout: "split-site",
            informationArchitecture: {
              contract: "documentation-portal-information-architecture",
              contractVersion: "0.1.0-draft"
            }
          }
        }
      }), "utf8");
      await writeFile(path.join(root, "project.hia-project.json"), JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: { name: "Synthetic Owner Adoption Portal" },
        inputs: [{ kind: "hia-document", path: "basic.hia.json", domain: "js" }]
      }), "utf8");

      expect(await runCli([
        "docs", "adoption-kit", "--request", "request.json", "--out", "kit.json"
      ], createTestIo(root, stdout, stderr))).toBe(0);
      expect(await runCli([
        "docs", "build",
        "--config", "hia.config.json",
        "--project-manifest", "project.hia-project.json",
        "--adoption-kit", "kit.json",
        "--out", "docs"
      ], createTestIo(root, stdout, stderr))).toBe(0);
      const projectIndex = JSON.parse(await readFile(path.join(root, "docs", "project-index.json"), "utf8")) as {
        ownerAdoption?: { status?: string; targetId?: string };
      };

      expect(projectIndex.ownerAdoption).toMatchObject({ status: "ready-for-owner-review" });
      expect(projectIndex.ownerAdoption).not.toHaveProperty("targetId");
      expect(stderr).toEqual([]);
    } finally {
      // <lang><zh-CN>Portal integration test 只删除 isolated temporary root。</zh-CN><en>The Portal integration test deletes only its isolated temporary root.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects a report with a leaked projection field", async () => {
    const report = cloneJson(createTargetOwnerAdoptionKit(await loadFixture("enterprise-ready.json"))) as TargetOwnerAdoptionKitReport & {
      portalSummary: TargetOwnerAdoptionKitReport["portalSummary"] & { sourceBody?: string };
    };
    report.portalSummary.sourceBody = "must-not-cross-the-boundary";

    expect(isTargetOwnerAdoptionKitReport(report)).toBe(false);
  });
});
