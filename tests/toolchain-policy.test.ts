/**
 * @file
 * @lang zh-CN 检查仓库开发与 CI 工具链采用已确认的 Node.js 22/24 LTS；不把配置检查当作运行矩阵通过。
 * @lang en Checks that development and CI use the confirmed Node.js 22/24 LTS lines; configuration assertions do not substitute for an executed runtime matrix.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * @lang zh-CN 从固定仓库相对路径读取公开配置，不访问凭据或网络。
 * @lang en Reads public configuration from a fixed repository-relative path without credential or network access.
 * @param relativePath <lang><zh-CN>测试中声明的固定相对路径。</zh-CN><en>Fixed relative path declared by the test.</en></lang>
 * @returns <lang><zh-CN>UTF-8 配置内容。</zh-CN><en>UTF-8 configuration content.</en></lang>
 */
function read(relativePath: string): string {
  return readFileSync(new URL("../" + relativePath, import.meta.url), "utf8");
}

describe("development and CI Node.js policy", () => {
  it("pins development to the researched Node.js 24 patch and existing pnpm version", () => {
    expect(read(".mise.toml")).toMatch(/^node = "24\.22\.1"$/m);
    expect(read(".mise.toml")).toMatch(/^pnpm = "10\.34\.4"$/m);
  });
  it("runs both supported Node.js lines on Linux and Windows CI", () => {
    // <lang><zh-CN>配置显式包含四个组合，不允许 fail-fast 隐藏另一平台结果。</zh-CN><en>The configuration explicitly includes all four combinations without fail-fast hiding another platform's result.</en></lang>
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("node: [22.x, 24.x]");
    expect(workflow).toContain("os: [ubuntu-24.04, windows-2025]");
    expect(workflow).toContain("fail-fast: false");
    expect(workflow).toContain("node-version: ${{ matrix.node }}");
    expect(workflow).toContain("pnpm run release:gate");
  });
  it.each([
    ["schema-pages.yml", "24.22.1"],
    ["public-reference-build.yml", "24.22.1"],
    ["reference-operations.yml", "24.x"]
  ])("uses the declared Node.js 24 release policy in %s", (fileName, version) => {
    // <lang><zh-CN>两条实际 reference 构建线固定到 engines 下限；运维检查保持同一主版本范围。</zh-CN><en>The two actual reference builders pin the engines floor; the operations check retains the same major release line.</en></lang>
    const workflow = read(".github/workflows/" + fileName);
    expect(workflow).not.toMatch(/node-version:\s*20/);
    expect(workflow).toContain(`node-version: ${version}`);
  });
});
