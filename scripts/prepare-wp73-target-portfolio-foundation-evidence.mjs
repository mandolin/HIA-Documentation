import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>repository root 由此 script 的固定 location 推导；它只用于加载已构建的 CLI 和写入 ignored dist evidence。</zh-CN><en>The repository root is derived from this script's fixed location; use it only to load the built CLI and write ignored dist evidence.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>dist evidence directory 属于 main-repo 自己的 generated output，不是九个 target 的路径。</zh-CN><en>The dist evidence directory is main-repo-owned generated output, never a path in the nine targets.</en></lang>
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp73-target-portfolio-foundation");

/**
 * Materialize a synthetic, public-safe target-portfolio acceptance evidence record.
 *
 * 中文：materialize 一份 synthetic、public-safe 的 target-portfolio acceptance evidence record。
 * English: Materialize a synthetic, public-safe target-portfolio acceptance evidence record.
 *
 * @returns {Promise<void>} <lang><zh-CN>evidence 生成完成 promise。</zh-CN><en>Evidence-generation completion promise.</en></lang>
 * @lang zh-CN 只运行已构建的 HIA CLI 与 temporary fixture；不读取 source/HTML/manifest、不访问 target repository，也不执行 network/publish。
 */
async function prepareEvidence() {
  // <lang><zh-CN>dist CLI 是本轮 build 的公开 package entry；通过 file URL import 防止 cwd 影响 module resolution。</zh-CN><en>The dist CLI is this build's public package entry; import it by file URL so cwd cannot affect module resolution.</en></lang>
  const cliModuleUrl = pathToFileURL(path.join(repositoryRoot, "apps", "cli", "dist", "index.js")).href;
  const { runCli } = await import(cliModuleUrl);
  // <lang><zh-CN>temporary root 是唯一用于 input/output fixture 的可写位置，并由 finally 精确移除。</zh-CN><en>The temporary root is the sole writable location for input/output fixtures and is removed precisely in finally.</en></lang>
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hia-wp73-foundation-"));

  try {
    // <lang><zh-CN>evidence fixture 仅含 counts/status/privacy booleans/stable ids；没有 source body、locator、absolute path 或 target metadata。</zh-CN><en>The evidence fixture contains only counts, status, privacy booleans, and stable ids; it has no source body, locator, absolute path, or target metadata.</en></lang>
    const summary = {
      contract: "hia-generated-docs-evidence-summary",
      contractVersion: "0.1.0-draft",
      status: "ready",
      requiredOutputs: { indexHtml: true, manifest: true, projectIndex: true },
      entries: { stableIds: ["entry:fixture:component", "entry:fixture:utility"] },
      producers: [{ status: "success", artifactCount: 3 }],
      privacy: {
        sourcePresentation: "link",
        sourcesContentPolicy: "none",
        sourcesContentPresent: false,
        sourceBodyPresent: false,
        absolutePathLikeStringCount: 0
      }
    };
    const summaryPath = path.join(temporaryRoot, "documentation-evidence.json");
    await writeFile(summaryPath, JSON.stringify(summary), "utf8");
    // <lang><zh-CN>messages 捕获 command output，验证默认 stdout 模式不创建 caller output file；stderr 不应有 accepted diagnostic。</zh-CN><en>Messages capture command output, verifying default stdout mode creates no caller output file; stderr must have no accepted diagnostic.</en></lang>
    const stdoutMessages = [];
    const stderrMessages = [];
    const exitCode = await runCli([
      "docs",
      "acceptance",
      "--evidence",
      "documentation-evidence.json",
      "--target-id",
      "unicodeartjs-fixture",
      "--target-family",
      "unicode-compatible"
    ], {
      cwd: temporaryRoot,
      stdout: (message) => stdoutMessages.push(message),
      stderr: (message) => stderrMessages.push(message)
    });
    // <lang><zh-CN>accepted fixture 必须只有一个 JSON report、零 stderr；不依赖 output path 或 target state 断言成功。</zh-CN><en>The accepted fixture must yield one JSON report and zero stderr; success assertions depend on no output path or target state.</en></lang>
    assert.equal(exitCode, 0);
    assert.equal(stdoutMessages.length, 1);
    assert.deepEqual(stderrMessages, []);
    const report = JSON.parse(stdoutMessages[0]);
    assert.equal(report.contract, "target-documentation-acceptance");
    assert.equal(report.contractVersion, "0.1.0-draft");
    assert.equal(report.status, "accepted");
    assert.deepEqual(report.acceptance?.requiredPermissions, {
      network: false,
      sourceBodyRead: false,
      targetRepositoryWrite: false
    });
    assert.equal(JSON.stringify(report).includes("fixtures/"), false);
    assert.equal(JSON.stringify(report).includes("sourcesContent\""), false);
    // <lang><zh-CN>dist evidence 只保存 public-safe report 和它的拒绝权限；不保存 temporary root、command argv 或 summary input path。</zh-CN><en>Dist evidence saves only the public-safe report and its denied permissions; it saves no temporary root, command argv, or summary input path.</en></lang>
    const evidence = {
      contract: "wp73-target-portfolio-foundation-evidence",
      contractVersion: "0.1.0-draft",
      status: "ready-for-wp73-closeout",
      report,
      targetRepositoryMutationPerformed: false,
      targetCommandExecuted: false,
      targetSourceBodyRead: false,
      targetArtifactBodyRead: false,
      networkAccessed: false,
      npmPublished: false
    };
    await mkdir(evidenceOutputDirectory, { recursive: true });
    await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  } finally {
    // <lang><zh-CN>仅删除 mkdtemp 返回的 exact temporary root；不会删除 repository、dist evidence 或任何 target directory。</zh-CN><en>Delete only the exact temporary root returned by mkdtemp; never delete the repository, dist evidence, or any target directory.</en></lang>
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

// <lang><zh-CN>顶层仅输出 fixed success/failure text；assertion error 不含 source body 或 target path。</zh-CN><en>The top level emits fixed success/failure text only; assertion errors contain no source body or target path.</en></lang>
prepareEvidence().then(() => {
  console.log("W-P73 target-portfolio foundation evidence generated.");
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "W-P73 target-portfolio foundation evidence failed.");
  process.exitCode = 1;
});
