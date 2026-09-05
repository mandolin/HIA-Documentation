import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  produceBusinessFlowDocumentationProjection,
  type BusinessFlowDocumentation,
  type BusinessFlowDocumentationProjection
} from "@hia-doc/core";
import fixtureData from "../../../packages/core/src/fixtures/business-flow-documentation.synthetic.json" with { type: "json" };

import { runCli, type CliIo } from "./index.js";
import {
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_SCHEMA_ID,
  createBusinessFlowDocumentationHandoff,
  isBusinessFlowDocumentationHandoffReport,
  validateBusinessFlowDocumentationHandoff,
  type BusinessFlowDocumentationHandoffReport
} from "./business-flow-documentation-handoff.js";

/**
 * @lang zh-CN
 * 从 HIA-owned W-P119 fixture 生成 exact W-P122 public projection；测试不读取目标仓或系统 locale。
 *
 * @lang en
 * Produces an exact W-P122 public projection from the HIA-owned W-P119 fixture; tests read neither a target repository nor the system locale.
 *
 * @returns 已验证的双视图 projection。 / Validated dual-view projection.
 */
function createProjection(): BusinessFlowDocumentationProjection {
  // <lang><zh-CN>producer result 保留 status/diagnostic，测试只在 ready 后提取 projection。</zh-CN><en>The producer result preserves status and diagnostics; the test extracts the projection only after readiness.</en></lang>
  const result = produceBusinessFlowDocumentationProjection(structuredClone(fixtureData) as BusinessFlowDocumentation, {
    audience: "public",
    flowIds: ["generic-device-operation-request"],
    locale: "zh-CN"
  });
  if (!result.projection) throw new Error("HIA-owned business-flow projection fixture must be valid.");
  return result.projection;
}

/**
 * @lang zh-CN 创建只在内存收集消息的 CLI adapter。
 * @lang en Creates a CLI adapter that captures messages only in memory.
 * @param cwd isolated caller root。 / Isolated caller root.
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

/** @lang zh-CN JSON-compatible detached clone。 @lang en JSON-compatible detached clone. */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("business-flow documentation handoff", () => {
  it("exports an exact neutral owner-local schema and fixed diagnostics", () => {
    expect(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT).toBe("business-flow-documentation-handoff");
    expect(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_SCHEMA_ID).toContain("business-flow-documentation-handoff-0.1.0-draft.schema.json");
    expect(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        contract: { const: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT },
        contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION },
        projection: {
          $ref: "https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-projection-0.1.0-draft.schema.json"
        }
      }
    });
    expect(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES).toEqual([
      "HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT",
      "HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID",
      "HIA_BUSINESS_FLOW_HANDOFF_INTEGRITY_INVALID",
      "HIA_BUSINESS_FLOW_HANDOFF_PRIVACY_REFUSED",
      "HIA_BUSINESS_FLOW_HANDOFF_PERMISSION_REFUSED",
      "HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED"
    ]);
  });

  it("creates a deterministic target-ready packet without claiming owner input or adoption", () => {
    // <lang><zh-CN>baseline projection 与 detached repeat 验证 content-equivalent input 得到同一 packet。</zh-CN><en>The baseline projection and detached repeat prove content-equivalent input yields the same packet.</en></lang>
    const projection = createProjection();
    const report = createBusinessFlowDocumentationHandoff(projection);
    const repeated = createBusinessFlowDocumentationHandoff(cloneJson(projection));

    expect(report).toMatchObject({
      status: "ready-for-owner-review",
      artifact: {
        contract: "business-flow-documentation-projection",
        contractVersion: "0.1.0-draft",
        mediaType: "application/json",
        serialization: "business-flow-projection-stable-json-v1",
        digest: { algorithm: "sha256" }
      },
      review: {
        state: "owner-review-required",
        ownerInput: "not-recorded",
        consent: "not-recorded",
        adoption: "not-asserted"
      },
      semantics: {
        resolution: "exact-projection-validated",
        confidence: "not-aggregated",
        provenance: "embedded-public-projection"
      },
      summary: { flows: 1, humanItems: 16, aiNodes: 25, aiEdges: 37, codeBindings: 4, evidence: 2 },
      permissions: { targetRepositoryRead: false, targetRepositoryWrite: false, targetAdoptionClaimed: false }
    });
    expect(report.artifact?.digest.value).toMatch(/^[a-f0-9]{64}$/u);
    expect(report.artifact?.byteLength).toBeGreaterThan(0);
    expect(report).toEqual(repeated);
    expect(report.projection).toEqual(projection);
    expect(validateBusinessFlowDocumentationHandoff(report)).toEqual([]);
    expect(isBusinessFlowDocumentationHandoffReport(report)).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("refuses invalid projection without leaking a partial payload, digest, or counts", () => {
    // <lang><zh-CN>未知 layout 模拟 target-private extension，必须在 W-P122 closed-world gate 被拒绝。</zh-CN><en>An unknown layout simulates a target-private extension and must be refused by the W-P122 closed-world gate.</en></lang>
    const projection = cloneJson(createProjection()) as BusinessFlowDocumentationProjection & { futureLayout?: string };
    projection.futureLayout = "target-private-layout";
    const report = createBusinessFlowDocumentationHandoff(projection);

    expect(report.status).toBe("refused");
    expect(report.diagnostics.map(({ code }) => code)).toEqual(["HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID"]);
    expect(report).not.toHaveProperty("projection");
    expect(report).not.toHaveProperty("artifact");
    expect(report).not.toHaveProperty("summary");
    expect(JSON.stringify(report)).not.toContain("target-private-layout");
    expect(isBusinessFlowDocumentationHandoffReport(report)).toBe(true);
  });

  it("detects digest, privacy, permission, compatibility, and unknown-field tampering", () => {
    // <lang><zh-CN>冻结 source 作为每个独立 tamper case 的 detached 起点。</zh-CN><en>The frozen source is the detached starting point for every independent tamper case.</en></lang>
    const source = createBusinessFlowDocumentationHandoff(createProjection());
    // <lang><zh-CN>case table 将 validation dimension 与期望稳定 code 一一对应。</zh-CN><en>The case table maps each validation dimension to its expected stable code.</en></lang>
    const cases: Array<{ code: string; mutate: (report: BusinessFlowDocumentationHandoffReport & Record<string, unknown>) => void }> = [
      { code: "HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT", mutate: (report) => { report.futureField = false; } },
      { code: "HIA_BUSINESS_FLOW_HANDOFF_INTEGRITY_INVALID", mutate: (report) => { if (report.artifact) report.artifact.digest.value = "0".repeat(64); } },
      { code: "HIA_BUSINESS_FLOW_HANDOFF_PRIVACY_REFUSED", mutate: (report) => { report.privacy.sourceBodySerialized = true as false; } },
      { code: "HIA_BUSINESS_FLOW_HANDOFF_PERMISSION_REFUSED", mutate: (report) => { report.permissions.targetRepositoryRead = true as false; } },
      { code: "HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED", mutate: (report) => { report.compatibility.versionMatch = "compatible" as "exact"; } }
    ];

    for (const fixtureCase of cases) {
      // <lang><zh-CN>每例从新 clone 开始，避免 tamper 互相污染。</zh-CN><en>Each case starts from a fresh clone so tampering cannot contaminate another case.</en></lang>
      const report = cloneJson(source) as BusinessFlowDocumentationHandoffReport & Record<string, unknown>;
      fixtureCase.mutate(report);
      expect(validateBusinessFlowDocumentationHandoff(report).map(({ code }) => code), fixtureCase.code).toContain(fixtureCase.code);
      expect(isBusinessFlowDocumentationHandoffReport(report), fixtureCase.code).toBe(false);
    }
  });

  it("generates and consumes a handoff through safe-relative CLI paths and explicit Portal IA", async () => {
    // <lang><zh-CN>isolated root 限定本测试的所有读写；finally 精确删除该目录。</zh-CN><en>The isolated root bounds every read and write in this test; finally removes that exact directory.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-business-flow-handoff-"));
    // <lang><zh-CN>stdout/stderr 仅存内存，用于断言固定、无私有路径消息。</zh-CN><en>Stdout and stderr stay in memory to assert fixed messages without private paths.</en></lang>
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      await writeFile(path.join(root, "projection.json"), JSON.stringify(createProjection()), "utf8");
      await writeFile(path.join(root, "basic.hia.json"), await readFile(path.resolve("fixtures/basic.hia.json"), "utf8"), "utf8");
      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          source: { presentation: "none" },
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
        project: { name: "Synthetic Business Flow Portal" },
        inputs: [{ kind: "hia-document", path: "basic.hia.json", domain: "js" }]
      }), "utf8");

      expect(await runCli([
        "docs", "business-flow-handoff", "--projection", "projection.json", "--out", "handoff.json"
      ], createTestIo(root, stdout, stderr))).toBe(0);
      expect(await runCli([
        "docs", "build", "--config", "hia.config.json", "--project-manifest", "project.hia-project.json",
        "--business-flow-handoff", "handoff.json", "--out", "docs"
      ], createTestIo(root, stdout, stderr))).toBe(0);

      // <lang><zh-CN>project index 是完整 projection 的唯一 Portal artifact owner。</zh-CN><en>The project index is the sole Portal artifact owner for the full projection.</en></lang>
      const projectIndex = JSON.parse(await readFile(path.join(root, "docs", "project-index.json"), "utf8")) as {
        businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
        review?: unknown;
      };
      // <lang><zh-CN>manifest 只用于检查 body-free ref/count，不读取 HTML 表示。</zh-CN><en>The manifest is inspected only for its body-free reference and counts, not an HTML representation.</en></lang>
      const manifest = JSON.parse(await readFile(path.join(root, "docs", "hia-manifest.json"), "utf8")) as {
        project?: { businessFlowDocumentationProjection?: { flowCount?: number; path?: string } };
      };
      expect(projectIndex.businessFlowDocumentationProjection?.humanLinear.flows[0]?.items).toHaveLength(16);
      expect(projectIndex.businessFlowDocumentationProjection?.aiGraph.graphs[0]?.edgeRefs).toHaveLength(37);
      expect(projectIndex).not.toHaveProperty("review");
      expect(manifest.project?.businessFlowDocumentationProjection).toEqual(expect.objectContaining({
        flowCount: 1,
        path: "project-index.json"
      }));
      expect(stderr).toEqual([]);

      // <lang><zh-CN>单独 collector 隔离 unsafe-path 诊断，避免合法 build 消息影响泄漏断言。</zh-CN><en>Separate collectors isolate unsafe-path diagnostics so legitimate build messages cannot affect the leak assertion.</en></lang>
      const unsafeStdout: string[] = [];
      const unsafeStderr: string[] = [];
      // <lang><zh-CN>process-style code 是 unsafe path fail-closed 的主断言。</zh-CN><en>The process-style code is the primary fail-closed assertion for an unsafe path.</en></lang>
      const unsafeExitCode = await runCli([
        "docs", "business-flow-handoff", "--projection", "../projection.json"
      ], createTestIo(root, unsafeStdout, unsafeStderr));
      expect(unsafeExitCode).toBe(1);
      expect(unsafeStderr.join("\n")).toContain("HIA_BUSINESS_FLOW_HANDOFF_PATH_INVALID");
      expect([...unsafeStdout, ...unsafeStderr].join("\n")).not.toContain(root);
    } finally {
      // <lang><zh-CN>只清理 mkdtemp 返回的 exact isolated root。</zh-CN><en>Clean up only the exact isolated root returned by mkdtemp.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects tampered handoffs and refuses Portal linkage without explicit IA", async () => {
    // <lang><zh-CN>第二个 isolated root 专门验证 consumer gate，不复用成功路径状态。</zh-CN><en>A second isolated root validates consumer gates without reusing successful-path state.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-business-flow-handoff-gate-"));
    // <lang><zh-CN>collector 记录两阶段拒绝：先缺 IA，再有 IA 但 digest 失配。</zh-CN><en>The collectors record two refusal stages: missing IA first, then digest mismatch with IA.</en></lang>
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      // <lang><zh-CN>detached report 允许构造 digest tamper，而不修改冻结 baseline。</zh-CN><en>The detached report allows digest tampering without mutating the frozen baseline.</en></lang>
      const report = cloneJson(createBusinessFlowDocumentationHandoff(createProjection()));
      if (!report.artifact) throw new Error("Ready handoff fixture must contain an artifact descriptor.");
      report.artifact.digest.value = "0".repeat(64);
      await writeFile(path.join(root, "handoff.json"), JSON.stringify(report), "utf8");
      await writeFile(path.join(root, "basic.hia.json"), await readFile(path.resolve("fixtures/basic.hia.json"), "utf8"), "utf8");
      await writeFile(path.join(root, "project.hia-project.json"), JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: { name: "Synthetic Business Flow Portal Gate" },
        inputs: [{ kind: "hia-document", path: "basic.hia.json", domain: "js" }]
      }), "utf8");

      // <lang><zh-CN>未配置 IA 时必须在读取/投影前拒绝 linkage。</zh-CN><en>Without configured IA, linkage must be refused before reading or projecting the handoff.</en></lang>
      const invalidExitCode = await runCli([
        "docs", "build", "--project-manifest", "project.hia-project.json",
        "--business-flow-handoff", "handoff.json", "--out", "invalid-docs"
      ], createTestIo(root, stdout, stderr));
      expect(invalidExitCode).toBe(1);
      expect(stderr.join("\n")).toContain("HIA_CLI_BUSINESS_FLOW_HANDOFF_IA_REQUIRED");

      await writeFile(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          source: { presentation: "none" },
          renderer: {
            informationArchitecture: {
              contract: "documentation-portal-information-architecture",
              contractVersion: "0.1.0-draft"
            }
          }
        }
      }), "utf8");
      stderr.length = 0;
      // <lang><zh-CN>显式 IA 只解除结构接入前提，不豁免 handoff 完整性校验。</zh-CN><en>Explicit IA satisfies only the structural prerequisite and never bypasses handoff integrity validation.</en></lang>
      const tamperedExitCode = await runCli([
        "docs", "build", "--config", "hia.config.json", "--project-manifest", "project.hia-project.json",
        "--business-flow-handoff", "handoff.json", "--out", "tampered-docs"
      ], createTestIo(root, stdout, stderr));
      expect(tamperedExitCode).toBe(1);
      expect(stderr.join("\n")).toContain("HIA_CLI_BUSINESS_FLOW_HANDOFF_REPORT_INVALID");
    } finally {
      // <lang><zh-CN>只清理 mkdtemp 返回的 exact isolated gate root。</zh-CN><en>Clean up only the exact isolated gate root returned by mkdtemp.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });
});
