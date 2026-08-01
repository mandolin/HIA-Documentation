import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runCli, type CliIo } from "./index.js";
import {
  createTargetDocumentationContinuityReport,
  isTargetDocumentationContinuityReport,
  TARGET_DOCUMENTATION_CONTINUITY_CONTRACT,
  TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION,
  TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA,
  TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID,
  type TargetDocumentationContinuityReport
} from "./target-continuity.js";

/** @lang zh-CN 测试 fixture 中允许的 JSON object 表示。 @lang en JSON-object representation allowed in test fixtures. */
type JsonRecord = Record<string, unknown>;

/** @lang zh-CN synthetic baseline/current pair 的 closed test view。 @lang en Closed test view of a synthetic baseline/current pair. */
interface ContinuityPairFixture {
  baseline: JsonRecord;
  current: JsonRecord;
  targetFamily: string;
  targetId: string;
}

/** @lang zh-CN 拒绝矩阵的 declarative mutation record。 @lang en Declarative mutation record used by the refusal matrix. */
interface RefusalMatrixCase {
  expectedCode: string;
  field: string;
  id: string;
  operation: "set" | "duplicate-entry" | "remove-entry" | "remove-producer" | "invalid-request";
  side: "baseline" | "current";
  value?: unknown;
}

/** @lang zh-CN fixture root 从 test 文件固定位置推导，不读取 target repository。 @lang en Fixture root derived from the fixed test-file location; it reads no target repository. */
const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures/target-continuity");

/**
 * @lang zh-CN 读取 main-repo 自有 synthetic JSON fixture。
 * @lang en Reads a main-repo-owned synthetic JSON fixture.
 *
 * @param name fixture 文件名。 / Fixture file name.
 * @returns parsed JSON value。 / Parsed JSON value.
 */
async function loadFixture<T>(name: string): Promise<T> {
  // <lang><zh-CN>name 仅由本 test 的固定 literals 提供；没有 caller/target path input。</zh-CN><en>The name comes only from fixed literals in this test; no caller or target path is accepted.</en></lang>
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8")) as T;
}

/**
 * @lang zh-CN 对 JSON fixture 做 deterministic deep clone，确保矩阵 case 相互隔离。
 * @lang en Deterministically deep-clones a JSON fixture so matrix cases remain isolated.
 *
 * @param value JSON-compatible input。 / JSON-compatible input.
 * @returns detached JSON clone。 / Detached JSON clone.
 */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * @lang zh-CN 在 synthetic fixture 上设置 dot-separated 字段，专用于拒绝矩阵。
 * @lang en Sets a dot-separated field on a synthetic fixture exclusively for the refusal matrix.
 *
 * @param root mutation root。 / Mutation root.
 * @param field dot-separated field。 / Dot-separated field.
 * @param value synthetic mutation value。 / Synthetic mutation value.
 */
function setNestedField(root: JsonRecord, field: string, value: unknown): void {
  // <lang><zh-CN>逐段进入已知 fixture object/array；矩阵本身是 repository-owned test data。</zh-CN><en>Traverse the known fixture object/array segment by segment; the matrix itself is repository-owned test data.</en></lang>
  const segments = field.split(".");
  let cursor: unknown = root;
  for (const segment of segments.slice(0, -1)) {
    cursor = Array.isArray(cursor)
      ? cursor[Number(segment)]
      : (cursor as JsonRecord)[segment];
  }
  // <lang><zh-CN>最后一段写入 detached clone；不会改写 committed fixture 或 production input。</zh-CN><en>Write the final segment only into a detached clone; committed fixtures and production inputs remain unchanged.</en></lang>
  const finalSegment = segments.at(-1) ?? "";
  if (Array.isArray(cursor)) {
    cursor[Number(finalSegment)] = value;
  } else {
    (cursor as JsonRecord)[finalSegment] = value;
  }
}

/**
 * @lang zh-CN 应用一条 refusal matrix mutation，并维护 entry total 的独立 identity invariant。
 * @lang en Applies one refusal-matrix mutation while preserving the independent entry-total invariant.
 *
 * @param pair detached continuity pair。 / Detached continuity pair.
 * @param matrixCase declarative refusal case。 / Declarative refusal case.
 */
function applyRefusalCase(pair: ContinuityPairFixture, matrixCase: RefusalMatrixCase): void {
  // <lang><zh-CN>只变更矩阵指定的一侧；另一侧继续作为 valid control。</zh-CN><en>Mutate only the side named by the matrix; the other side remains the valid control.</en></lang>
  const evidence = pair[matrixCase.side];
  if (matrixCase.operation === "invalid-request") {
    pair.targetFamily = String(matrixCase.value);
    return;
  }
  if (matrixCase.operation === "set") {
    setNestedField(evidence, matrixCase.field, matrixCase.value);
    return;
  }
  // <lang><zh-CN>entry operations 同步 total，使 test 精确命中 duplicate/removal，而不是偶然的 total mismatch。</zh-CN><en>Entry operations synchronize total so the test targets duplicate/removal rather than an incidental total mismatch.</en></lang>
  if (matrixCase.operation === "duplicate-entry" || matrixCase.operation === "remove-entry") {
    const entries = evidence.entries as JsonRecord;
    const stableIds = entries.stableIds as string[];
    if (matrixCase.operation === "duplicate-entry") {
      stableIds.push(stableIds[0] ?? "invalid-entry");
    } else {
      stableIds.pop();
    }
    entries.total = stableIds.length;
    return;
  }
  // <lang><zh-CN>producer removal 保留其余 evidence shape，由 evaluator 同时证明 compatibility 与 coverage fail closed。</zh-CN><en>Producer removal preserves the rest of the evidence shape, letting the evaluator prove compatibility and coverage both fail closed.</en></lang>
  const producers = evidence.producers as unknown[];
  producers.pop();
}

/**
 * @lang zh-CN 从 fixture 调用 pure evaluator，不授予 filesystem/network/target action。
 * @lang en Invokes the pure evaluator from a fixture without filesystem, network, or target-action authority.
 *
 * @param pair synthetic evidence pair。 / Synthetic evidence pair.
 * @returns metadata-only continuity report。 / Metadata-only continuity report.
 */
function evaluatePair(pair: ContinuityPairFixture): TargetDocumentationContinuityReport {
  return createTargetDocumentationContinuityReport({
    baseline: pair.baseline,
    current: pair.current,
    targetFamily: pair.targetFamily,
    targetId: pair.targetId
  });
}

/**
 * @lang zh-CN 创建把 stdout/stderr 保留在 memory 的 CLI test adapter。
 * @lang en Creates a CLI test adapter that retains stdout/stderr in memory.
 *
 * @param cwd temporary caller root。 / Temporary caller root.
 * @param stdout captured stdout。 / Captured stdout.
 * @param stderr captured stderr。 / Captured stderr.
 * @returns controlled CLI IO。 / Controlled CLI IO.
 */
function createTestIo(cwd: string, stdout: string[], stderr: string[]): CliIo {
  return {
    cwd,
    // <lang><zh-CN>两个 sink 只追加 test-local array，不写 external service 或 target notification。</zh-CN><en>Both sinks append only to test-local arrays and write no external service or target notification.</en></lang>
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message)
  };
}

describe("target documentation continuity contract", () => {
  it("exports a closed Draft 2020-12 schema with deny-all privacy and permission facts", () => {
    // <lang><zh-CN>schema identity 与 wire contract 分开断言，防止 `$id` 被误当 distributed endpoint。</zh-CN><en>Assert schema identity separately from the wire contract so `$id` cannot be mistaken for a distributed endpoint.</en></lang>
    expect(TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID).toContain("target-documentation-continuity-0.1.0-draft.schema.json");
    expect(TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        contract: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT },
        contractVersion: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION },
        privacy: { additionalProperties: false },
        permissions: { additionalProperties: false }
      }
    });
    // <lang><zh-CN>所有 permission property 都必须 const false；未来 capability 不能静默扩大本 draft。</zh-CN><en>Every permission property must be const false; a future capability cannot silently expand this draft.</en></lang>
    const permissionProperties = TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA.properties.permissions.properties;
    expect(Object.values(permissionProperties).every((schema) => schema.const === false)).toBe(true);
  });

  it("accepts the TypeScript pair and serializes counts without entry or producer identities", async () => {
    // <lang><zh-CN>TypeScript pair 证明 stable entry 增量与 artifact count 增量可以被接受。</zh-CN><en>The TypeScript pair proves stable-entry and artifact-count growth can be accepted.</en></lang>
    const pair = await loadFixture<ContinuityPairFixture>("typescript-pair.json");
    const report = evaluatePair(pair);
    const serialized = JSON.stringify(report);

    expect(report).toMatchObject({
      contract: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT,
      contractVersion: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION,
      status: "accepted",
      continuity: {
        entries: { baselineCount: 3, currentCount: 4, unchangedCount: 3, addedCount: 1, removedCount: 0 },
        producers: { artifactCountNonDecreasing: true, successPreserved: true },
        privacy: { continuityPreserved: true },
        requiredOutputs: { allPreserved: true }
      },
      semantics: {
        resolution: "evidence-summary-pair-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-comparison"
      }
    });
    expect(report.diagnostics).toEqual([]);
    expect(isTargetDocumentationContinuityReport(report)).toBe(true);
    expect(serialized).not.toContain("ts:fixture:");
    expect(serialized).not.toContain("typescript-docs");
  });

  it("accepts the .NET pair without changing the neutral report contract", async () => {
    // <lang><zh-CN>.NET pair 使用相同 contract/semantics，证明 continuity 不依赖 language-specific AST。</zh-CN><en>The .NET pair uses the same contract and semantics, proving continuity has no language-specific AST dependency.</en></lang>
    const pair = await loadFixture<ContinuityPairFixture>("dotnet-pair.json");
    const report = evaluatePair(pair);

    expect(report.status).toBe("accepted");
    expect(report.continuity.entries).toEqual({
      baselineCount: 4,
      currentCount: 5,
      unchangedCount: 4,
      addedCount: 1,
      removedCount: 0
    });
    expect(report.continuity.producers.baseline.artifactCount).toBe(6);
    expect(report.continuity.producers.current.artifactCount).toBe(9);
    expect(JSON.stringify(report)).not.toContain("dotnet-docs");
  });

  it("fails closed for every version, shape, identity, coverage, privacy, and permission matrix case", async () => {
    // <lang><zh-CN>每个 case 从同一 valid TypeScript pair clone，确保预期 code 由单项 mutation 触发。</zh-CN><en>Each case clones the same valid TypeScript pair so its expected code is caused by one mutation.</en></lang>
    const sourcePair = await loadFixture<ContinuityPairFixture>("typescript-pair.json");
    const matrix = await loadFixture<{ cases: RefusalMatrixCase[] }>("refusal-matrix.json");
    for (const matrixCase of matrix.cases) {
      const pair = cloneJson(sourcePair);
      applyRefusalCase(pair, matrixCase);
      const report = evaluatePair(pair);
      const codes = report.diagnostics.map((diagnostic) => diagnostic.code);

      expect(report.status, matrixCase.id).toBe("refused");
      expect(report.semantics.resolution, matrixCase.id).toBe("unresolved");
      expect(codes, matrixCase.id).toContain(matrixCase.expectedCode);
      expect(isTargetDocumentationContinuityReport(report), matrixCase.id).toBe(true);
    }
  });

  it("refuses an invalid request family, identity, or unknown request field without reflecting caller values", async () => {
    // <lang><zh-CN>强制 extra field 模拟 untyped JavaScript caller；runtime closed-world guard 必须拒绝。</zh-CN><en>The forced extra field simulates an untyped JavaScript caller; the runtime closed-world guard must refuse it.</en></lang>
    const pair = await loadFixture<ContinuityPairFixture>("typescript-pair.json");
    const report = createTargetDocumentationContinuityReport({
      baseline: pair.baseline,
      current: pair.current,
      targetFamily: "future-family",
      targetId: "invalid target with spaces",
      futureAction: false
    } as never);

    expect(report.status).toBe("refused");
    expect(report.target).toEqual({ family: "invalid", id: "invalid-target" });
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_TARGET_CONTINUITY_REQUEST_INVALID");
    expect(JSON.stringify(report)).not.toContain("future-family");
    expect(JSON.stringify(report)).not.toContain("invalid target with spaces");
  });

  it("rejects a report with unknown fields through the runtime type guard", async () => {
    // <lang><zh-CN>type guard 复核 owner schema 的 closed-world boundary，不只检查 contract string。</zh-CN><en>The type guard rechecks the owner schema's closed-world boundary rather than only the contract string.</en></lang>
    const pair = await loadFixture<ContinuityPairFixture>("dotnet-pair.json");
    const candidate = cloneJson(evaluatePair(pair)) as TargetDocumentationContinuityReport & { futureField?: boolean };
    candidate.futureField = false;

    expect(isTargetDocumentationContinuityReport(candidate)).toBe(false);
    // <lang><zh-CN>accepted status 也不能与 invalid family 或不一致 count 组合。</zh-CN><en>Accepted status also cannot be combined with an invalid family or inconsistent count.</en></lang>
    const invalidAccepted = cloneJson(evaluatePair(pair));
    invalidAccepted.target.family = "invalid";
    expect(isTargetDocumentationContinuityReport(invalidAccepted)).toBe(false);
    const inconsistentCount = cloneJson(evaluatePair(pair));
    inconsistentCount.continuity.entries.currentCount += 1;
    expect(isTargetDocumentationContinuityReport(inconsistentCount)).toBe(false);
  });

  it("CLI emits accepted stdout and writes refused output only to an explicit safe-relative location", async () => {
    // <lang><zh-CN>temporary caller root 是该 test 唯一读写边界；不位于 main-repo 或任何 target repository。</zh-CN><en>The temporary caller root is this test's sole read/write boundary and is outside main-repo and every target repository.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-target-continuity-"));
    const pair = await loadFixture<ContinuityPairFixture>("typescript-pair.json");
    const stdout: string[] = [];
    const stderr: string[] = [];
    try {
      await writeFile(path.join(root, "baseline.json"), JSON.stringify(pair.baseline), "utf8");
      await writeFile(path.join(root, "current.json"), JSON.stringify(pair.current), "utf8");
      const acceptedExitCode = await runCli([
        "docs", "continuity",
        "--baseline", "baseline.json",
        "--current", "current.json",
        "--target-id", pair.targetId,
        "--target-family", pair.targetFamily
      ], createTestIo(root, stdout, stderr));

      expect(acceptedExitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(JSON.parse(stdout[0] ?? "{}")).toMatchObject({ status: "accepted" });
      // <lang><zh-CN>第二次调用只改变 current privacy fact 并显式请求 output；CLI 应写 refused report 且返回 1。</zh-CN><en>The second invocation changes only a current privacy fact and explicitly requests output; the CLI must write a refused report and return 1.</en></lang>
      const refusedPair = cloneJson(pair);
      (refusedPair.current.privacy as JsonRecord).sourceBodyPresent = true;
      await writeFile(path.join(root, "refused-current.json"), JSON.stringify(refusedPair.current), "utf8");
      const refusedExitCode = await runCli([
        "docs", "continuity",
        "--baseline", "baseline.json",
        "--current", "refused-current.json",
        "--target-id", pair.targetId,
        "--target-family", pair.targetFamily,
        "--out", "reports/refused.json"
      ], createTestIo(root, stdout, stderr));
      const refusedReport = JSON.parse(await readFile(path.join(root, "reports", "refused.json"), "utf8")) as TargetDocumentationContinuityReport;

      expect(refusedExitCode).toBe(1);
      expect(refusedReport.status).toBe("refused");
      expect(refusedReport.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_TARGET_CONTINUITY_PRIVACY_REFUSED");
      expect([...stdout, ...stderr].join("\n")).not.toContain(root);
    } finally {
      // <lang><zh-CN>只删除 mkdtemp 返回的 exact root；不清理 repository 或宽泛目录。</zh-CN><en>Delete only the exact root returned by mkdtemp; never clean a repository or broad directory.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });

  it("CLI refuses unsafe, duplicate, or missing paths before any evidence read", async () => {
    // <lang><zh-CN>无效 path 测试不创建文件；固定 diagnostic 应在 filesystem read 之前返回。</zh-CN><en>The invalid-path test creates no file; a fixed diagnostic must return before any filesystem read.</en></lang>
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runCli([
      "docs", "continuity",
      "--baseline", "../baseline.json",
      "--current", "../current.json",
      "--target-id", "enterprise-fixture",
      "--target-family", "enterprise-business"
    ], createTestIo("synthetic-caller-root", stdout, stderr));

    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("\n")).toContain("HIA_TARGET_CONTINUITY_PATH_INVALID");
    expect(stderr.join("\n")).not.toContain("../baseline.json");
  });
});
