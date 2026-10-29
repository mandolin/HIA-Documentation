/**
 * @file
 * @lang zh-CN 公开API候选清单必须拒绝名称、字段、签名和子路径漂移；结构检查不替代语义验收。
 * @lang en The public API candidate inventory rejects name, field, signature and subpath drift; structural checks never replace semantic acceptance.
 */
import { describe, expect, it } from "vitest";
import { validatePublicApiSurface } from "../scripts/check-public-api-surface.mjs";

/** @lang zh-CN 最小合成候选，避免测试复制生产清单或泄露主机路径。 @lang en Minimal synthetic candidate avoids copying the production inventory or exposing host paths. */
function fixture() {
  return { packages: [{ name: "@example/api", exportsMap: { ".": "./dist/index.js" }, exports: [{ name: "create", signatures: ["(): Result"], fields: [{ name: "status", optional: false, type: "string" }], declarationFingerprints: ["fixed-declaration"] }] }] };
}

describe("public API candidate inventory", () => {
  /** @lang zh-CN 相同数据可通过，但验证函数不能改写任一输入。 @lang en Equal data passes, without mutation of either input. */
  it("accepts exact identity without rewriting inputs", () => {
    const expected = fixture();
    const actual = structuredClone(expected);
    expect(() => validatePublicApiSurface(expected, actual)).not.toThrow();
    expect(actual).toEqual(expected);
  });
  /** @lang zh-CN 独立变更四种公共面，均须先失败而非自动更新基线。 @lang en Four independently changed public surfaces must fail rather than automatically updating the baseline. */
  it.each(["name", "field", "signature", "subpath", "declaration"])("rejects %s drift", (kind) => {
    const expected = fixture();
    const actual = structuredClone(expected);
    if (kind === "name") actual.packages[0]!.exports[0]!.name = "renamed";
    if (kind === "field") actual.packages[0]!.exports[0]!.fields[0]!.optional = true;
    if (kind === "signature") actual.packages[0]!.exports[0]!.signatures = ["(required: string): Result"];
    if (kind === "subpath") Object.assign(actual.packages[0]!.exportsMap, { "./extra": "./dist/extra.js" });
    if (kind === "declaration") actual.packages[0]!.exports[0]!.declarationFingerprints = ["changed-default-or-readonly"];
    expect(() => validatePublicApiSurface(expected, actual)).toThrow(/inventory drifted/u);
    expect(expected).toEqual(fixture());
  });
});
