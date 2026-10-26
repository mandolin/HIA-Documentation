/**
 * @file
 * @lang zh-CN 核已确认的两条LTS候选运行范围与已发布身份拒绝；配置测试不能替代实际安装/运行。
 * @lang en Checks the confirmed two-LTS candidate runtime range and refusal of published identities; configuration tests do not replace actual installation/execution.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** @lang zh-CN 只读取固定仓库内的公开清单；不访问网络或凭据。 @lang en Reads public manifests inside the fixed repository only, without network or credentials. */
function manifest(relativePath: string) {
  return JSON.parse(readFileSync(new URL("../" + relativePath, import.meta.url), "utf8"));
}

// <lang><zh-CN>范围下限取已实测补丁，caret只允许相应major内后续版本，不自动承诺其它major。</zh-CN><en>Range floors use tested patches; carets permit subsequent versions within those majors without promising other majors.</en></lang>
const expectedRange = "^22.23.4 || ^24.22.1";
const plan = manifest("release/public-packages.json");

describe("candidate package runtime policy", () => {
  it("aligns the private workspace root to the tested LTS floors", () => {
    expect(manifest("package.json").engines.node).toBe(expectedRange);
  });
  it("aligns release metadata without changing publication toolchain", () => {
    expect(plan.runtimeNodeRange).toBe(expectedRange);
    expect(plan.publishToolchain.nodeVersion).toBe("24.x");
    expect(plan.publishToolchain.minimumNpmVersion).toBe("11.15.0");
  });
  it.each(plan.packages)("aligns $name to the same supported runtime", entry => {
    // <lang><zh-CN>逐包检查防止根清单正确但归档实际声明仍旧。</zh-CN><en>Check each package so a correct root cannot conceal stale archive declarations.</en></lang>
    expect(manifest(entry.path + "/package.json").engines.node).toBe(expectedRange);
  });
  it.each(plan.packages)("keeps already published $name identities unavailable for publication", entry => {
    // <lang><zh-CN>子进程只解析本地清单，不能发起发布；已有身份不得因源码变更而重用。</zh-CN><en>The subprocess only resolves local manifests and cannot publish; source changes must not permit reuse of existing identities.</en></lang>
    expect(entry.releaseStatus).toBe("published");
    expect(() => execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/resolve-public-release-package.mjs", import.meta.url)), entry.name, "--publish-ready"], { encoding: "utf8", windowsHide: true, stdio: "pipe" })).toThrow(/releaseStatus is published/);
  });
});
