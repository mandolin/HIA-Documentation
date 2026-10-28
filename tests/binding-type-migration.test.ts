/**
 * @file
 * @lang zh-CN 实际声明入口的旧两值赋值拒绝与三值迁移正例；运行兼容不等于源码兼容。
 * @lang en Old two-value assignment rejection and three-value migration through real declarations; runtime compatibility does not imply source compatibility.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("binding projection TypeScript migration", () => {
  it("rejects two legacy assignments and accepts the explicit third-version branch", async () => {
    // <lang><zh-CN>只写本次命名的系统临时目录，读取真实构建声明；普通包名入口由归档消费另核。</zh-CN><en>Write only this invocation's named system temporary directory and read real built declarations; archive consumers separately check bare package imports.</en></lang>
    const directory = await mkdtemp(path.join(os.tmpdir(), "hia-binding-type-"));
    try {
      const entry = fileURLToPath(new URL("../packages/source-linkage/dist/index.js", import.meta.url)).replaceAll("\\", "/");
      const prelude = `import { createGeneratedDocumentationBindingHostProjection, type GeneratedDocumentationBindingHostProjection } from ${JSON.stringify(entry)};\ndeclare const projection: GeneratedDocumentationBindingHostProjection;\ndeclare const index: Parameters<typeof createGeneratedDocumentationBindingHostProjection>[0];\n`;
      const negative = path.join(directory, "old.mts");
      const positive = path.join(directory, "current.mts");
      await writeFile(negative, prelude + 'const a: "0.1.0-draft" | "0.2.0-draft" = projection.bindingContractVersion;\nconst b: "0.1.0-draft" | "0.2.0-draft" = createGeneratedDocumentationBindingHostProjection(index).bindingContractVersion;\n');
      await writeFile(positive, prelude + 'const a: "0.1.0-draft" | "0.2.0-draft" | "0.3.0-draft" = projection.bindingContractVersion;\nswitch (projection.bindingContractVersion) { case "0.1.0-draft": case "0.2.0-draft": case "0.3.0-draft": break; default: const exhausted: never = projection.bindingContractVersion; }\n');
      /** @lang zh-CN 显式文件列表隔离项目配置，保留严格检查。 @lang en Isolates project config with an explicit file list and retains strict checking. */
      function compile(file: string) { return spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url)), "--ignoreConfig", "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", windowsHide: true }); }
      const refused = compile(negative);
      expect(refused.status).not.toBe(0);
      expect(refused.stdout.match(/TS2322/g)).toHaveLength(2);
      const accepted = compile(positive);
      expect(accepted.stdout + accepted.stderr).toBe("");
      expect(accepted.status).toBe(0);
    } finally {
      expect(path.dirname(path.resolve(directory))).toBe(path.resolve(os.tmpdir()));
      expect(path.basename(directory).startsWith("hia-binding-type-")).toBe(true);
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
});
