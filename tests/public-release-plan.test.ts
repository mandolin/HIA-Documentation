/**
 * @file
 * @lang zh-CN 发布就绪必须有真实候选；日常源码门禁仍允许已发布清单。
 * @lang en Publish readiness requires an actual candidate, while the daily source gate still permits a published manifest.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePublicReleaseIntent, verifyPublishedReleaseBatch } from "../scripts/lib/public-release-intent.mjs";

describe("public release intent", () => {
  it("rejects the all-published manifest as publish-ready", () => {
    const result = runPublishedPlanCheck(["--publish-ready"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("at least one pending candidate");
  });

  /** @lang zh-CN 必要包的候选身份精确协调，不能误升独立语言服务器或伪称已发布。 @lang en Required candidate identities are coordinated exactly, without promoting the independent language server or claiming publication. */
  it("coordinates twelve v1 targets while preserving the independent language server", () => {
    // <lang><zh-CN>读取实际发行清单而非复制候选列表，保持根包目标可验。</zh-CN><en>Read the actual release plan rather than duplicating its candidate list.</en></lang>
    const plan = JSON.parse(readFileSync(new URL("../release/public-packages.json", import.meta.url), "utf8"));
    const required = plan.packages.filter((entry: {name: string}) => entry.name !== "@hia-doc/lsp");
    expect(required).toHaveLength(12);
    expect(required.every((entry: {targetVersion: string; releaseStatus: string}) => entry.targetVersion === "1.0.0" && ["candidate", "published"].includes(entry.releaseStatus))).toBe(true);
    expect(plan.packages.find((entry: {name: string}) => entry.name === "@hia-doc/lsp")).toMatchObject({targetVersion: "0.1.0", releaseStatus: "published"});
  });

  it("keeps source checks, one/multiple candidates and explicit terminal resume separate", () => {
    const published = [{ name: "@hia-doc/a", targetVersion: "1.0.0", releaseStatus: "published" }];
    expect(resolvePublicReleaseIntent(published)).toBe("source");
    expect(() => resolvePublicReleaseIntent(published, { publishReady: true })).toThrow("at least one pending candidate");
    expect(() => resolvePublicReleaseIntent([], { resumeVerify: true, resume: true })).toThrow();
    for (const status of ["candidate", "patch-candidate"]) {
      const mixed = [...published, { name: "@hia-doc/b", targetVersion: "1.0.0", releaseStatus: status }];
      expect(resolvePublicReleaseIntent(mixed, { publishReady: true, resume: true })).toBe("publish-ready");
      expect(resolvePublicReleaseIntent([...mixed, { ...mixed[1], name: "@hia-doc/c" }], { publishReady: true })).toBe("publish-ready");
      expect(() => resolvePublicReleaseIntent(mixed, { resumeVerify: true, resume: true })).toThrow();
    }
    expect(resolvePublicReleaseIntent(published, { resumeVerify: true, resume: true })).toBe("resume-verify");
    expect(() => resolvePublicReleaseIntent(published, { resumeVerify: true })).toThrow();
    expect(() => resolvePublicReleaseIntent(published, { publishReady: true, resumeVerify: true, resume: true })).toThrow();
    expect(() => resolvePublicReleaseIntent([{ releaseStatus: "unknown" }], { publishReady: true })).toThrow();
  });

  it("requires exact complete registry observations and never treats errors as published", async () => {
    const entries = [{ name: "@hia-doc/a", targetVersion: "1.0.0", releaseStatus: "published" }, { name: "@hia-doc/b", targetVersion: "1.0.0", releaseStatus: "published" }];
    const calls: unknown[] = [];
    expect(await verifyPublishedReleaseBatch({ entries, registry: "https://registry.npmjs.org/", resume: true, readVersion: async (value: unknown) => { calls.push(value); return { status: "published", registryVersion: "1.0.0" }; } })).toEqual({ mode: "resume-verify", verified: 2 });
    expect(calls).toHaveLength(2);
    for (const result of [{ status: "unpublished" }, { status: "error" }, { status: "published", registryVersion: "1.0.1" }]) {
      await expect(verifyPublishedReleaseBatch({ entries, registry: "https://registry.npmjs.org/", resume: true, readVersion: async () => result })).rejects.toThrow("every exact registry target");
    }
    await expect(verifyPublishedReleaseBatch({ entries, registry: "https://registry.npmjs.org/", resume: true, readVersion: async () => { throw new Error("PRIVATE_TEST_MARKER"); } })).rejects.not.toThrow("PRIVATE_TEST_MARKER");
    await expect(verifyPublishedReleaseBatch({ entries, registry: "https://registry.npmjs.org/", resume: true, readVersion: () => { throw new Error("SYNC_PRIVATE_TEST_MARKER"); } })).rejects.toThrow("every exact registry target");
    const source = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-public-release-plan.mjs", import.meta.url))], { encoding: "utf8", windowsHide: true });
    expect(source.status).toBe(0);
    const resume = runPublishedPlanCheck(["--resume-verify", "--resume"]);
    expect(resume.status).toBe(0);
    expect(resume.stdout).toContain("registry existence remains unverified");
  });
});

/**
 * @lang zh-CN 在独立临时副本中构造全已发布状态，不依赖主仓当前发行阶段，也不修改生产清单。
 * @lang en Constructs a fully published state in an isolated temporary copy, independent of the repository's release phase and without mutating production manifests.
 * @param args <lang><zh-CN>只读检查器参数。</zh-CN><en>Read-only checker arguments.</en></lang>
 * @returns <lang><zh-CN>真实子进程结果，无网络或发布。</zh-CN><en>Actual subprocess result, without network or publication.</en></lang>
 */
function runPublishedPlanCheck(args: string[]) {
  // <lang><zh-CN>只复制检查器实际读取的受信文件；不复制node_modules或凭据。</zh-CN><en>Copy only trusted files read by the checker, excluding node_modules and credentials.</en></lang>
  const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
  const root = mkdtempSync(join(tmpdir(), "hia-release-plan-"));
  const plan = JSON.parse(readFileSync(join(sourceRoot, "release/public-packages.json"), "utf8"));
  try {
    const files = ["LICENSE", ".github/workflows/npm-trusted-publish.yml", ".github/workflows/npm-bootstrap-publish.yml", "scripts/check-public-release-plan.mjs", "scripts/bootstrap-public-release.mjs", "scripts/lib/public-release-intent.mjs", "scripts/lib/npm-registry.mjs", ...plan.packages.flatMap((entry: {path: string}) => ["package.json", "LICENSE", "README.md"].map((name) => `${entry.path}/${name}`))];
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), {recursive: true});
      copyFileSync(join(sourceRoot, file), join(root, file));
    }
    mkdirSync(join(root, "release"));
    // <lang><zh-CN>只改副本状态，目标版本和依赖顺序保留真实值。</zh-CN><en>Change copied statuses only, retaining actual versions and dependency order.</en></lang>
    writeFileSync(join(root, "release/public-packages.json"), JSON.stringify({...plan, packages: plan.packages.map((entry: object) => ({...entry, releaseStatus: "published"}))}));
    return spawnSync(process.execPath, [join(root, "scripts/check-public-release-plan.mjs"), ...args], {encoding: "utf8", windowsHide: true});
  } finally {
    // <lang><zh-CN>递归删除前核系统temp直属路径及任务前缀，避免越界。</zh-CN><en>Verify the direct system-temp parent and task prefix before recursive deletion.</en></lang>
    if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith("hia-release-plan-")) throw new Error("Unsafe release test cleanup path.");
    rmSync(root, {recursive: true, force: true});
  }
}
