/**
 * @file
 * @lang zh-CN 核已确认的两条LTS候选运行范围与已发布身份拒绝；配置测试不能替代实际安装/运行。
 * @lang en Checks the confirmed two-LTS candidate runtime range and refusal of published identities; configuration tests do not replace actual installation/execution.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
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
  it("checks VSIX staging against the current release range instead of a stale literal", () => {
    // <lang><zh-CN>VSIX staging不在普通release:gate里，防止遗漏的旧断言只在独立工作流暴露。</zh-CN><en>VSIX staging is outside the ordinary release gate; prevent stale assertions surfacing only in its separate workflow.</en></lang>
    const source = readFileSync(new URL("../scripts/prepare-visual-studio-lsp-runtime.mjs", import.meta.url), "utf8");
    expect(source).toContain('readFile(path.join(rootDir, "release/public-packages.json"), "utf8")');
    expect(source).toContain("assert.equal(packageJson.engines?.node, releasePlan.runtimeNodeRange)");
    expect(source).not.toContain('assert.equal(packageJson.engines?.node, ">=20.19.0")');
  });
  it("documents the source runtime range in release governance and versioning", () => {
    for (const file of ["docs/release-governance.md", "docs/versioning.md"]) {
      expect(readFileSync(new URL("../" + file, import.meta.url), "utf8")).toContain(expectedRange);
    }
  });
  it.each(plan.packages)("aligns $name to the same supported runtime", entry => {
    // <lang><zh-CN>逐包检查防止根清单正确但归档实际声明仍旧。</zh-CN><en>Check each package so a correct root cannot conceal stale archive declarations.</en></lang>
    expect(manifest(entry.path + "/package.json").engines.node).toBe(expectedRange);
  });
  it.each(plan.packages)("refuses published $name identities and resolves candidate identities", entry => {
    // <lang><zh-CN>每个实际包的三种状态在隔离副本中执行，避免把当前发行阶段写死为全已发布。</zh-CN><en>Execute three states for each actual package in an isolated copy rather than pinning the repository's release phase to fully published.</en></lang>
    const root = mkdtempSync(join(tmpdir(), "hia-runtime-policy-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "release"));
      mkdirSync(join(root, entry.path), {recursive: true});
      copyFileSync(new URL("../scripts/resolve-public-release-package.mjs", import.meta.url), join(root, "scripts/resolve-public-release-package.mjs"));
      writeFileSync(join(root, entry.path, "package.json"), JSON.stringify(manifest(entry.path + "/package.json")));
      for (const releaseStatus of ["published", "candidate", "patch-candidate"]) {
        writeFileSync(join(root, "release/public-packages.json"), JSON.stringify({...plan, packages: [{...entry, releaseStatus}]}));
        // <lang><zh-CN>子进程仅解析清单；拒绝态不变，候选态只返回元数据而不pack/publish。</zh-CN><en>The subprocess only resolves manifests; published identities remain refused and candidate states return metadata without packing/publishing.</en></lang>
        const result = spawnSync(process.execPath, [join(root, "scripts/resolve-public-release-package.mjs"), entry.name, "--publish-ready"], {encoding: "utf8", windowsHide: true});
        if (releaseStatus === "published") {
          expect(result.status).not.toBe(0);
          expect(result.stderr).toContain("releaseStatus is published");
        } else {
          expect(result.status).toBe(0);
          expect(JSON.parse(result.stdout)).toMatchObject({package_name: entry.name, target_version: entry.targetVersion});
        }
      }
    } finally {
      // <lang><zh-CN>递归清理前核本次创建目录的绝对父目录和专属前缀。</zh-CN><en>Verify the created directory's absolute parent and task-specific prefix before recursive cleanup.</en></lang>
      if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith("hia-runtime-policy-")) throw new Error("Unsafe policy test cleanup path.");
      rmSync(root, {recursive: true, force: true});
    }
  });
});
