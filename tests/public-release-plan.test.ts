/**
 * @file
 * @lang zh-CN 发布就绪必须有真实候选；日常源码门禁仍允许已发布清单。
 * @lang en Publish readiness requires an actual candidate, while the daily source gate still permits a published manifest.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePublicReleaseIntent, verifyPublishedReleaseBatch } from "../scripts/lib/public-release-intent.mjs";

describe("public release intent", () => {
  it("rejects the all-published manifest as publish-ready", () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-public-release-plan.mjs", import.meta.url)), "--publish-ready"], { encoding: "utf8", windowsHide: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("at least one pending candidate");
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
    const resume = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-public-release-plan.mjs", import.meta.url)), "--resume-verify", "--resume"], { encoding: "utf8", windowsHide: true });
    expect(resume.status).toBe(0);
    expect(resume.stdout).toContain("registry existence remains unverified");
  });
});
