/**
 * @file
 * @lang zh-CN 公开API候选清单必须拒绝名称、字段、签名和子路径漂移；结构检查不替代语义验收。
 * @lang en The public API candidate inventory rejects name, field, signature and subpath drift; structural checks never replace semantic acceptance.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { collectPublicApiSurface, validatePublicApiSurface } from "../scripts/check-public-api-surface.mjs";

/** @lang zh-CN 最小合成候选，避免测试复制生产清单或泄露主机路径。 @lang en Minimal synthetic candidate avoids copying the production inventory or exposing host paths. */
function fixture() {
  return { packages: [{ name: "@example/api", exportsMap: { ".": "./dist/index.js" }, exports: [{ name: "create", signatures: ["(): Result"], fields: [{ name: "status", optional: false, type: "string" }], declarationFingerprints: ["fixed-declaration"] }] }] };
}

describe("public API candidate inventory", () => {
  /** @lang zh-CN 同一模板字符串在Windows/Linux检出换行下必须产生同一公开指纹。 @lang en The same template literal must produce identical public fingerprints under Windows/Linux checkout line endings. */
  it("keeps declaration fingerprints portable across checkout line endings", async () => {
    // <lang><zh-CN>测试目录由本用例唯一创建，不读取工作区产品源码。</zh-CN><en>This case owns a uniquely created directory and never reads workspace product source.</en></lang>
    const root = mkdtempSync(join(tmpdir(), "hia-api-surface-"));
    // <lang><zh-CN>十二个极小包满足收集范围，不引入第三方依赖或真实发行状态。</zh-CN><en>Twelve minimal packages satisfy collection scope without third-party dependencies or real release state.</en></lang>
    const packages = Array.from({ length: 12 }, (_, index) => ({ name: `@fixture/package-${index}`, path: `packages/package-${index}` }));
    // <lang><zh-CN>真实换行和字面反斜杠转义必须区分，类型字段也使用多行模板。</zh-CN><en>Distinguish physical line endings from literal backslash escapes and cover multiline template types in fields.</en></lang>
    const source = 'export const VALUE = `first\nsecond`;\nexport const ESCAPED = `first\\r\\nsecond`;\nexport interface Shape { value: `first\nsecond` }\n';
    try {
      mkdirSync(join(root, "release"));
      writeFileSync(join(root, "release/public-packages.json"), JSON.stringify({ packages }));
      for (const entry of packages) {
        mkdirSync(join(root, entry.path, "src"), { recursive: true });
        writeFileSync(join(root, entry.path, "package.json"), JSON.stringify({ name: entry.name, exports: { ".": "./dist/index.js" } }));
        writeFileSync(join(root, entry.path, "src/index.ts"), source);
      }
      // <lang><zh-CN>只改变真实文件换行；API字面量语义保持。</zh-CN><en>Change actual file line endings only; the API literal's semantics stay unchanged.</en></lang>
      const lf = await collectPublicApiSurface(root);
      for (const entry of packages) writeFileSync(join(root, entry.path, "src/index.ts"), source.replaceAll("\n", "\r\n"));
      expect(await collectPublicApiSurface(root)).toEqual(lf);
      // <lang><zh-CN>改变转义值确实改变API，不能被平台归一化吞掉。</zh-CN><en>An escaped-value change really changes the API and must survive platform normalization.</en></lang>
      writeFileSync(join(root, packages[0]!.path, "src/index.ts"), source.replace('first\\r\\nsecond', 'first\\nsecond'));
      expect(await collectPublicApiSurface(root)).not.toEqual(lf);
    } finally {
      // <lang><zh-CN>递归清理前核绝对父目录和本任务唯一前缀，只移除本测试创建的目录。</zh-CN><en>Verify the absolute parent and task-specific prefix before recursive cleanup, removing only this test's directory.</en></lang>
      if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith("hia-api-surface-")) throw new Error("Unsafe test cleanup path.");
      rmSync(root, { recursive: true, force: true });
    }
  });
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
