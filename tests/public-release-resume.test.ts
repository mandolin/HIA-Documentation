/**
 * @file
 * @lang zh-CN 在隔离目录和本机可控registry中验证bootstrap三条路径；不接触真实npm凭据或发布。
 * @lang en Verifies three bootstrap paths in an isolated directory with a controlled local registry, without real npm credentials or publication.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, copyFile, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);

describe("isolated bootstrap resume", () => {
  it("verifies terminal resume without credentials/commands and preserves partial-batch planning", async () => {
    // <lang><zh-CN>目录仅用于本次脚本副本和合成清单；服务仅监听loopback，不处理真实包。</zh-CN>
    // <en>The directory holds this invocation's script copies and synthetic plans only; the service listens on loopback and handles no real packages.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-release-resume-"));
    const published = new Set(["@hia-doc/a", "@hia-doc/b"]);
    let requests = 0;
    let serverError = false;
    const server = createServer((request, response) => {
      requests += 1;
      const name = decodeURIComponent(new URL(request.url!, "http://127.0.0.1").pathname.slice(1));
      response.writeHead(serverError ? 503 : 200, { "content-type": "application/json" });
      response.end(JSON.stringify({ name, versions: published.has(name) ? { "1.0.0": { version: "1.0.0" } } : {} }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      assert(address && typeof address === "object");
      await mkdir(path.join(root, "scripts/lib"), { recursive: true });
      await mkdir(path.join(root, "release"), { recursive: true });
      for (const file of ["bootstrap-public-release.mjs", "lib/public-release-intent.mjs", "lib/npm-registry.mjs"]) {
        await copyFile(new URL(`../scripts/${file}`, import.meta.url), path.join(root, "scripts", file));
      }
      const entries = [{ name: "@hia-doc/a", path: "packages/a", targetVersion: "1.0.0", releaseStatus: "published", publishOrder: 10 },
        { name: "@hia-doc/b", path: "packages/b", targetVersion: "1.0.0", releaseStatus: "published", publishOrder: 20 }];
      for (const entry of entries) {
        await mkdir(path.join(root, entry.path), { recursive: true });
        await writeFile(path.join(root, entry.path, "package.json"), JSON.stringify({ name: entry.name, version: "1.0.0", private: false, publishConfig: { access: "public" } }));
      }
      /** @lang zh-CN 只改隔离清单，不改真实发行状态。 @lang en Writes the isolated plan only, never real release states. */
      async function savePlan() { await writeFile(path.join(root, "release/public-packages.json"), JSON.stringify({ registry: `http://127.0.0.1:${address.port}/`, packages: entries })); }
      /** @lang zh-CN 绝对Node路径启动副本；空PATH和空token使任何包命令或凭据要求导致测试失败。 @lang en Runs the copy through an absolute Node path; empty PATH/token make package commands or credential requirements fail the test. */
      async function run(args: string[]) {
        try { return { code: 0, ...await execute(process.execPath, [path.join(root, "scripts/bootstrap-public-release.mjs"), ...args], { cwd: root, windowsHide: true, env: { ...process.env, PATH: "", NODE_AUTH_TOKEN: "" } }) }; }
        catch (error) { const failure = error as { code: number; stdout: string; stderr: string }; return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr }; }
      }
      await savePlan();
      expect(await run(["--publish", "--resume"])).toMatchObject({ code: 0, stdout: expect.stringContaining("resume-verify completed") });
      expect(requests).toBe(2);
      published.delete("@hia-doc/b");
      expect(await run(["--publish", "--resume"])).toMatchObject({ code: 1, stderr: expect.stringContaining("every exact registry target") });
      serverError = true;
      expect((await run(["--publish", "--resume"])).code).toBe(1);
      serverError = false;
      requests = 0;
      expect((await run(["--publish"])).code).toBe(1);
      expect(requests).toBe(0);
      entries[1]!.releaseStatus = "candidate";
      await savePlan();
      expect(await run(["--resume"])).toMatchObject({ code: 0, stdout: expect.stringContaining("publish @hia-doc/b@1.0.0") });
      published.add("@hia-doc/b");
      expect(await run(["--publish", "--resume"])).toMatchObject({ code: 0, stdout: expect.stringContaining("skipping npm publish") });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      // <lang><zh-CN>删除前核最终绝对路径为本次命名的系统temp直属子目录。</zh-CN><en>Before deletion, verify the resolved path is this invocation's named direct child of system temp.</en></lang>
      expect(path.dirname(path.resolve(root))).toBe(path.resolve(os.tmpdir()));
      expect(path.basename(root).startsWith("hia-release-resume-")).toBe(true);
      await rm(root, { recursive: true, force: true });
    }
  }, 30000);

  it("keeps workflow credential/publication steps out of read-only resume and runs consumer verification", async () => {
    const workflow = await readFile(new URL("../.github/workflows/npm-bootstrap-publish.yml", import.meta.url), "utf8");
    for (const name of ["Verify bootstrap credential exists", "Run publish-ready release gate", "Bootstrap approved package batch"]) {
      const step = workflow.split("      - name: ").find((item) => item.startsWith(name))!;
      expect(step).toContain("if: steps.intent.outputs.mode == 'publish-ready'");
    }
    expect(workflow).toContain("node scripts/verify-public-release-resume.mjs --resume");
    const resumePlan = workflow.split("      - name: ").find((item) => item.startsWith("Validate fully published resume plan"))!;
    expect(resumePlan).toContain("node scripts/check-public-release-plan.mjs --resume-verify --resume");
    expect(resumePlan).not.toContain("release:gate");
    expect(workflow).toContain("--resume-verify --resume");
    const smoke = await readFile(new URL("../scripts/post-public-release-batch-smoke.mjs", import.meta.url), "utf8");
    expect(smoke).toContain("if (!resumeVerify)");
    expect(smoke).toContain('runNpm(["install", "--ignore-scripts"');
  });
});
