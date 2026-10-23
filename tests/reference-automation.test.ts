/**
 * @file
 * @lang zh-CN 防止公开参考的每日构建与线上部署再次脱节；配置测试不替代真实部署和匿名检查。
 * @lang en Prevents daily public-reference builds from diverging from deployment; configuration tests do not replace real deployment and anonymous checks.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * @lang zh-CN 只读取测试声明的仓库配置，不联网或修改文件。
 * @lang en Reads repository configuration declared by the tests without network access or file mutation.
 * @param relativePath <lang><zh-CN>固定仓库相对路径。</zh-CN><en>Fixed repository-relative path.</en></lang>
 * @returns <lang><zh-CN>UTF-8原文；文件不可读时抛出文件系统错误。</zh-CN><en>UTF-8 text; unreadable files throw filesystem errors.</en></lang>
 */
function read(relativePath: string): string {
  return readFileSync(new URL("../" + relativePath, import.meta.url), "utf8");
}

/** @lang zh-CN 配置门禁覆盖调度归属、事件串联、最小权限和原硬阈值。
 * @lang en Configuration gates cover schedule ownership, event chaining, minimum permissions and original hard thresholds.
 */
describe("public reference deployment automation", () => {
  /** @lang zh-CN 每日任务必须执行真正的Pages构建和部署。
   * @lang en The daily task must execute the actual Pages build and deployment.
   */
  it("schedules the deployment owner rather than only an artifact build", () => {
    // <lang><zh-CN>固定在非整点的原每日构建时刻；发布链仍包含本地门禁和真实线上复核。</zh-CN><en>Use the existing off-hour daily build time; the publication chain retains local gates and real online verification.</en></lang>
    const pages = read(".github/workflows/schema-pages.yml");
    expect(pages).toMatch(/^  schedule:\r?\n    - cron: "23 3 \* \* \*"$/m);
    expect(pages).toContain("pnpm run release:gate");
    expect(pages).toContain("uses: actions/deploy-pages@v4");
    expect(pages).toContain("run: node scripts/check-reference-pages-online.mjs");
  });

  /** @lang zh-CN 独立artifact工作流保留push和手动入口，不重复承担每日刷新。
   * @lang en The standalone artifact workflow retains push and manual entry points without duplicating daily refresh.
   */
  it("keeps artifact-only builds available without a duplicate daily schedule", () => {
    const artifact = read(".github/workflows/public-reference-build.yml");
    expect(artifact).not.toMatch(/^  schedule:/m);
    expect(artifact).toMatch(/^  push:/m);
    expect(artifact).toMatch(/^  workflow_dispatch:/m);
    expect(artifact).toContain("name: public-reference-build");
  });

  /** @lang zh-CN 运维检查在主分支Pages实际完成后触发，不依赖两条cron的先后顺序。
   * @lang en Operations follow actual Pages completion on main, without relying on the ordering of two cron schedules.
   */
  it("observes completed Pages workflows on main", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    expect(operations).toMatch(/^  workflow_run:\r?\n    workflows: \["HIA Reference Pages"\]\r?\n    branches: \[main\]\r?\n    types: \[completed\]$/m);
  });

  /** @lang zh-CN 失败或取消的部署不能被作为成功部署后复核；独立定时健康检查仍运行。
   * @lang en Failed or cancelled deployments cannot be treated as successful-deployment checks; independent scheduled monitoring still runs.
   */
  it("runs post-deployment checks only for successful deployment completion", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    expect(operations).toContain("if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success' }}");
    expect(operations).toMatch(/^  schedule:\r?\n    - cron: "41 4 \* \* \*"$/m);
  });

  /** @lang zh-CN 部署后使用触发部署的提交版本检查器，定时或手动入口使用自身提交。
   * @lang en Post-deployment checks use the triggering deployment commit; scheduled and manual entries use their own commit.
   */
  it("checks out the deployment revision without persisted credentials", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    expect(operations).toContain("ref: ${{ github.event.workflow_run.head_sha || github.sha }}");
    expect(operations).toContain("persist-credentials: false");
  });

  /** @lang zh-CN 年龄报警通过真实重新部署修复，不能放宽168小时门禁或删除严格来源模式。
   * @lang en Repair age alarms through real redeployment without relaxing the 168-hour gate or removing strict source mode.
   */
  it("preserves age thresholds and strict source freshness", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    const checker = read("scripts/check-reference-operations.mjs");
    expect(operations).toContain('HIA_REFERENCE_MAX_AGE_HOURS: "168"');
    expect(operations).toContain('HIA_REFERENCE_WARN_AGE_HOURS: "48"');
    expect(operations).toContain("--require-fresh-sources");
    expect(checker).toContain('HIA_REFERENCE_MAX_AGE_HOURS ?? "168"');
    expect(checker).toContain('add("fail", "PAGES_MAX_AGE"');
  });

  /** @lang zh-CN workflow_run不取得部署权限或读取私钥，避免把健康检查升级为有写权限的入口。
   * @lang en workflow_run gains neither deployment permissions nor private-key access, keeping monitoring from becoming a privileged entry point.
   */
  it("keeps operations read-only and secret-free", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    expect(operations).toMatch(/^permissions:\r?\n  contents: read$/m);
    expect(operations).not.toMatch(/pages: write|id-token: write|secrets\.|actions\/deploy-pages/);
  });

  /** @lang zh-CN 串行保留健康检查结果，不以取消旧执行隐藏失败。
   * @lang en Preserve serialized monitoring results without hiding failures by cancelling earlier runs.
   */
  it("serializes monitoring without cancelling earlier checks", () => {
    const operations = read(".github/workflows/reference-operations.yml");
    expect(operations).toMatch(/concurrency:\r?\n  group: reference-operations\r?\n  cancel-in-progress: false/);
  });
});
