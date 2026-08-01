import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>repository root 从 script 固定位置推导，仅用于读取自有 fixture/dist module 并写 ignored evidence。</zh-CN><en>Derive the repository root from the script's fixed location, only to read owned fixtures/dist modules and write ignored evidence.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>fixture root 只包含 synthetic metadata pair/refusal matrix，不指向任何 target repository。</zh-CN><en>The fixture root contains only synthetic metadata pairs and a refusal matrix; it points to no target repository.</en></lang>
const fixtureRoot = path.join(repositoryRoot, "fixtures", "target-continuity");
// <lang><zh-CN>最终 evidence 只写 main-repo 自有 ignored dist 目录。</zh-CN><en>Write final evidence only to main-repo's owned, ignored dist directory.</en></lang>
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp84-target-documentation-continuity");

/**
 * @lang zh-CN 读取一份固定 main-repo synthetic JSON fixture。
 * @lang en Reads one fixed main-repo synthetic JSON fixture.
 *
 * @param {string} name fixture 文件名。 / Fixture file name.
 * @returns {Promise<Record<string, unknown>>} parsed JSON object。 / Parsed JSON object.
 */
async function loadFixture(name) {
  // <lang><zh-CN>name 只由下方固定 literals 提供；script 不接收 CLI path argument。</zh-CN><en>The name comes only from fixed literals below; the script accepts no CLI path argument.</en></lang>
  return JSON.parse(await readFile(path.join(fixtureRoot, name), "utf8"));
}

/**
 * @lang zh-CN 对 JSON-compatible synthetic data 创建 detached clone。
 * @lang en Creates a detached clone of JSON-compatible synthetic data.
 *
 * @template T
 * @param {T} value JSON-compatible value。 / JSON-compatible value.
 * @returns {T} detached clone。 / Detached clone.
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @lang zh-CN 为拒绝矩阵设置 repository-owned dot-separated field。
 * @lang en Sets a repository-owned dot-separated field for the refusal matrix.
 *
 * @param {Record<string, unknown>} root mutation root。 / Mutation root.
 * @param {string} field dot-separated field。 / Dot-separated field.
 * @param {unknown} value synthetic value。 / Synthetic value.
 * @returns {void}
 */
function setNestedField(root, field, value) {
  // <lang><zh-CN>逐段导航固定 fixture，numeric segment 仅用于 producer array index。</zh-CN><en>Traverse the fixed fixture segment by segment; numeric segments are used only for producer array indexes.</en></lang>
  const segments = field.split(".");
  let cursor = root;
  for (const segment of segments.slice(0, -1)) {
    cursor = Array.isArray(cursor) ? cursor[Number(segment)] : cursor[segment];
  }
  // <lang><zh-CN>最后写入 detached in-memory clone，不改 committed fixture。</zh-CN><en>Write the final value only to a detached in-memory clone, never the committed fixture.</en></lang>
  const finalSegment = segments.at(-1) ?? "";
  if (Array.isArray(cursor)) {
    cursor[Number(finalSegment)] = value;
  } else {
    cursor[finalSegment] = value;
  }
}

/**
 * @lang zh-CN 应用一条 declarative refusal mutation。
 * @lang en Applies one declarative refusal mutation.
 *
 * @param {Record<string, unknown>} pair detached evidence pair。 / Detached evidence pair.
 * @param {Record<string, unknown>} matrixCase refusal matrix item。 / Refusal-matrix item.
 * @returns {void}
 */
function applyRefusalCase(pair, matrixCase) {
  // <lang><zh-CN>side 由 committed matrix 限定为 baseline/current；不存在 caller-controlled dynamic repository access。</zh-CN><en>The committed matrix limits side to baseline/current; there is no caller-controlled dynamic repository access.</en></lang>
  const evidence = pair[matrixCase.side];
  if (matrixCase.operation === "invalid-request") {
    pair.targetFamily = String(matrixCase.value);
    return;
  }
  if (matrixCase.operation === "set") {
    setNestedField(evidence, matrixCase.field, matrixCase.value);
    return;
  }
  // <lang><zh-CN>entry mutations 同步 total，以区分 identity/coverage rule。</zh-CN><en>Entry mutations synchronize total to distinguish identity and coverage rules.</en></lang>
  if (matrixCase.operation === "duplicate-entry" || matrixCase.operation === "remove-entry") {
    const stableIds = evidence.entries.stableIds;
    if (matrixCase.operation === "duplicate-entry") {
      stableIds.push(stableIds[0] ?? "invalid-entry");
    } else {
      stableIds.pop();
    }
    evidence.entries.total = stableIds.length;
    return;
  }
  // <lang><zh-CN>唯一剩余 operation 是 remove-producer；空 producer list 会被 compatibility 与 coverage 双重拒绝。</zh-CN><en>The only remaining operation is remove-producer; an empty producer list is refused by both compatibility and coverage.</en></lang>
  evidence.producers.pop();
}

/**
 * @lang zh-CN 把 accepted continuity report 投影为无 identity/path/body 的 count-only evidence。
 * @lang en Projects an accepted continuity report into identity-, path-, and body-free count-only evidence.
 *
 * @param {Record<string, unknown>} report accepted continuity report。 / Accepted continuity report.
 * @returns {Record<string, unknown>} public-safe count summary。 / Public-safe count summary.
 */
function summarizeAcceptedReport(report) {
  return {
    status: report.status,
    entries: report.continuity.entries,
    producerArtifactCounts: {
      baseline: report.continuity.producers.baseline.artifactCount,
      current: report.continuity.producers.current.artifactCount,
      nonDecreasing: report.continuity.producers.artifactCountNonDecreasing
    },
    requiredOutputsPreserved: report.continuity.requiredOutputs.allPreserved,
    privacyContinuityPreserved: report.continuity.privacy.continuityPreserved,
    resolution: report.semantics.resolution,
    confidence: report.semantics.confidence,
    provenance: report.semantics.provenance
  };
}

/**
 * @lang zh-CN 执行 W-P84 synthetic API/CLI/refusal evidence 并写 count-only 结果。
 * @lang en Executes W-P84 synthetic API, CLI, and refusal evidence and writes count-only results.
 *
 * @returns {Promise<void>} evidence preparation completion。 / Evidence-preparation completion.
 * @lang zh-CN 不读取 target repository/source/artifact body，不执行 target、network、publish 或 adoption action。
 */
async function prepareEvidence() {
  // <lang><zh-CN>通过 file URL 加载本轮刚构建的公开 CLI owner entry，避免 cwd 影响 module resolution。</zh-CN><en>Load the freshly built public CLI-owner entry by file URL so cwd cannot affect module resolution.</en></lang>
  const cliModuleUrl = pathToFileURL(path.join(repositoryRoot, "apps", "cli", "dist", "index.js")).href;
  const {
    createTargetDocumentationContinuityReport,
    isTargetDocumentationContinuityReport,
    runCli,
    TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES,
    TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA,
    TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID
  } = await import(cliModuleUrl);
  // <lang><zh-CN>两条 pair 与拒绝矩阵均是 fixed synthetic inputs；没有 target discovery。</zh-CN><en>Both pairs and the refusal matrix are fixed synthetic inputs; no target discovery occurs.</en></lang>
  const typescriptPair = await loadFixture("typescript-pair.json");
  const dotnetPair = await loadFixture("dotnet-pair.json");
  const refusalMatrix = await loadFixture("refusal-matrix.json");

  // <lang><zh-CN>pure API 分别验证 TypeScript/.NET metadata pair，语言差异不进入中性 report contract。</zh-CN><en>The pure API validates TypeScript and .NET metadata pairs separately; language differences do not enter the neutral report contract.</en></lang>
  const typescriptReport = createTargetDocumentationContinuityReport(typescriptPair);
  const dotnetReport = createTargetDocumentationContinuityReport(dotnetPair);
  assert.equal(typescriptReport.status, "accepted");
  assert.equal(dotnetReport.status, "accepted");
  assert.equal(isTargetDocumentationContinuityReport(typescriptReport), true);
  assert.equal(isTargetDocumentationContinuityReport(dotnetReport), true);
  // <lang><zh-CN>序列化泄漏检查从 input 动态取得 entry/producer ids，但 evidence 输出只保留 boolean/count。</zh-CN><en>Serialization-leak checks derive entry and producer IDs dynamically from inputs, while evidence output retains only booleans and counts.</en></lang>
  for (const [pair, report] of [[typescriptPair, typescriptReport], [dotnetPair, dotnetReport]]) {
    const serializedReport = JSON.stringify(report);
    const forbiddenIdentities = [
      ...pair.baseline.entries.stableIds,
      ...pair.current.entries.stableIds,
      ...pair.baseline.producers.map((producer) => producer.id),
      ...pair.current.producers.map((producer) => producer.id)
    ];
    assert.equal(forbiddenIdentities.some((identity) => serializedReport.includes(identity)), false);
  }

  // <lang><zh-CN>矩阵逐项从 valid pair clone；只收集 fixed diagnostic codes 与 count，不输出 case/entry/producer identity。</zh-CN><en>Each matrix item clones the valid pair; collect only fixed diagnostic codes and counts, never case, entry, or producer identities.</en></lang>
  const coveredDiagnosticCodes = new Set();
  let refusedCaseCount = 0;
  for (const matrixCase of refusalMatrix.cases) {
    const pair = cloneJson(typescriptPair);
    applyRefusalCase(pair, matrixCase);
    const report = createTargetDocumentationContinuityReport(pair);
    assert.equal(report.status, "refused");
    assert.equal(report.diagnostics.some((diagnostic) => diagnostic.code === matrixCase.expectedCode), true);
    assert.equal(isTargetDocumentationContinuityReport(report), true);
    refusedCaseCount += 1;
    report.diagnostics.forEach((diagnostic) => coveredDiagnosticCodes.add(diagnostic.code));
  }

  // <lang><zh-CN>temporary root 是 CLI fixture 唯一写边界，finally 精确删除。</zh-CN><en>The temporary root is the CLI fixture's sole write boundary and is removed precisely in finally.</en></lang>
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hia-wp84-continuity-"));
  let cliEvidence;
  try {
    await writeFile(path.join(temporaryRoot, "baseline.json"), JSON.stringify(typescriptPair.baseline), "utf8");
    await writeFile(path.join(temporaryRoot, "current.json"), JSON.stringify(typescriptPair.current), "utf8");
    const acceptedStdout = [];
    const acceptedStderr = [];
    const acceptedExitCode = await runCli([
      "docs", "continuity",
      "--baseline", "baseline.json",
      "--current", "current.json",
      "--target-id", typescriptPair.targetId,
      "--target-family", typescriptPair.targetFamily
    ], {
      cwd: temporaryRoot,
      stdout: (message) => acceptedStdout.push(message),
      stderr: (message) => acceptedStderr.push(message)
    });
    assert.equal(acceptedExitCode, 0);
    assert.equal(acceptedStdout.length, 1);
    assert.deepEqual(acceptedStderr, []);
    assert.equal(JSON.parse(acceptedStdout[0]).status, "accepted");

    // <lang><zh-CN>显式 output case 使用 privacy refusal，证明 report 不会因 exit code 1 而丢失。</zh-CN><en>The explicit-output case uses a privacy refusal, proving the report is preserved even with exit code 1.</en></lang>
    const refusedCurrent = cloneJson(typescriptPair.current);
    refusedCurrent.privacy.sourceBodyPresent = true;
    await writeFile(path.join(temporaryRoot, "refused-current.json"), JSON.stringify(refusedCurrent), "utf8");
    const refusedStdout = [];
    const refusedStderr = [];
    const refusedExitCode = await runCli([
      "docs", "continuity",
      "--baseline", "baseline.json",
      "--current", "refused-current.json",
      "--target-id", typescriptPair.targetId,
      "--target-family", typescriptPair.targetFamily,
      "--out", "reports/refused.json"
    ], {
      cwd: temporaryRoot,
      stdout: (message) => refusedStdout.push(message),
      stderr: (message) => refusedStderr.push(message)
    });
    const refusedReport = JSON.parse(await readFile(path.join(temporaryRoot, "reports", "refused.json"), "utf8"));
    assert.equal(refusedExitCode, 1);
    assert.equal(refusedReport.status, "refused");

    // <lang><zh-CN>unsafe path 在 evidence read 前被拒绝；fixed stderr 不反射输入或 temporary root。</zh-CN><en>An unsafe path is refused before evidence reads; fixed stderr reflects neither input nor the temporary root.</en></lang>
    const unsafeStdout = [];
    const unsafeStderr = [];
    const unsafeExitCode = await runCli([
      "docs", "continuity",
      "--baseline", "../baseline.json",
      "--current", "current.json",
      "--target-id", typescriptPair.targetId,
      "--target-family", typescriptPair.targetFamily
    ], {
      cwd: temporaryRoot,
      stdout: (message) => unsafeStdout.push(message),
      stderr: (message) => unsafeStderr.push(message)
    });
    assert.equal(unsafeExitCode, 1);
    assert.equal(unsafeStdout.length, 0);
    assert.equal(unsafeStderr.join("\n").includes("HIA_TARGET_CONTINUITY_PATH_INVALID"), true);
    assert.equal(unsafeStderr.join("\n").includes(temporaryRoot), false);

    cliEvidence = {
      acceptedStdout: true,
      acceptedExitCode,
      refusedExplicitOutput: refusedReport.status === "refused",
      refusedExitCode,
      unsafePathRefused: unsafeExitCode === 1,
      unsafePathInputReflected: false,
      callerAbsolutePathSerialized: false
    };
  } finally {
    // <lang><zh-CN>只删除 mkdtemp 返回的 exact directory；不删除 repository、dist 或 target directory。</zh-CN><en>Delete only the exact directory returned by mkdtemp; never delete a repository, dist root, or target directory.</en></lang>
    await rm(temporaryRoot, { force: true, recursive: true });
  }

  // <lang><zh-CN>evidence 顶层仅输出 schema facts、counts、fixed diagnostic codes 与 all-false authority/privacy facts。</zh-CN><en>The evidence top level outputs only schema facts, counts, fixed diagnostic codes, and all-false authority/privacy facts.</en></lang>
  const evidence = {
    contract: "wp84-target-documentation-continuity-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp84-closeout",
    schema: {
      identityExported: typeof TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID === "string",
      draft202012: TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA.$schema === "https://json-schema.org/draft/2020-12/schema",
      topLevelClosedWorld: TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA.additionalProperties === false,
      permissionPropertiesDenyAll: Object.values(TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA.properties.permissions.properties).every((property) => property.const === false)
    },
    acceptedPairCount: 2,
    acceptedPairs: {
      typescript: summarizeAcceptedReport(typescriptReport),
      dotnet: summarizeAcceptedReport(dotnetReport)
    },
    refusalMatrix: {
      caseCount: refusalMatrix.cases.length,
      refusedCaseCount,
      diagnosticCodes: [...coveredDiagnosticCodes].sort(),
      supportedDiagnosticCodeCount: TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES.length
    },
    cli: cliEvidence,
    privacy: {
      entryIdsSerialized: false,
      producerIdsSerialized: false,
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      pathSerialized: false,
      workingStateSerialized: false
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false
    }
  };
  await mkdir(evidenceOutputDirectory, { recursive: true });
  await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
}

// <lang><zh-CN>顶层只打印 fixed completion/failure message；不会打印 fixture、target identity 或 filesystem path。</zh-CN><en>The top level prints only fixed completion/failure messages, never fixtures, target identities, or filesystem paths.</en></lang>
prepareEvidence().then(() => {
  console.log("W-P84 target documentation continuity evidence generated.");
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "W-P84 target documentation continuity evidence failed.");
  process.exitCode = 1;
});
