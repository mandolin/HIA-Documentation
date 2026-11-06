/**
 * @file
 * @lang zh-CN 从CLI项目清单加载真实JSON生产器并验证完整值进入聚合入口。
 * @lang en Loads the real JSON producer from a CLI project manifest and verifies complete values reach aggregation.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("loads the built JSON SDK producer through an explicit project manifest", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-jsondoc-cli-"));
  try {
    // <lang><zh-CN>显式包装仅导出真实构建模块，不模拟生产器或替换返回工件。</zh-CN><en>The explicit wrapper only exports the actual built module, without simulating the producer or replacing returned artifacts.</en></lang>
    const module = fileURLToPath(new URL("../../../packages/jsondoc/dist/index.js", import.meta.url));
    await writeFile(path.join(root, "producer.mjs"), `export { jsonDocumentationProducer } from ${JSON.stringify(pathToFileURL(module).href)};`);
    await writeFile(path.join(root, "resource.json"), '{"number":9007199254740993,"array":[true,null]}');
    const manifest = { schemaVersion: "1.0.0", project: { name: "JSON resource CLI" }, producers: [{ id: "jsondoc", module: "producer.mjs", exportName: "jsonDocumentationProducer", inputs: [{ kind: "json-resource", path: "resource.json", locale: "en" }] }] };
    await writeFile(path.join(root, "project.json"), JSON.stringify(manifest));
    // <lang><zh-CN>通过构建后的真实CLI进程加载生产模块，核普通用户入口及当前Node运行时，不混合测试转换模块与原生ESM。</zh-CN><en>Load the producer through the actual built CLI process to verify the normal user entry and current Node runtime without mixing test-transformed modules with native ESM.</en></lang>
    const cli = fileURLToPath(new URL("../dist/index.js", import.meta.url));
    const execution = spawnSync(process.execPath, [cli, "docs", "build", "--project-manifest", "project.json", "--out", "out", "--locale", "en"], { cwd: root, encoding: "utf8", timeout: 15000 });
    expect(execution.status, execution.error?.message ?? `${execution.stdout}\n${execution.stderr}`).toBe(0);
    const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
    expect(index.entries).toHaveLength(5);
    // <lang><zh-CN>标准多页输出的实际值位于条目页，根页面承载导航。</zh-CN><en>Actual values reside in entry pages in the standard multipage output, while the root page hosts navigation.</en></lang>
    const pages = await readdir(path.join(root, "out/entries"));
    const content = await Promise.all(pages.filter(page => page.endsWith(".html")).map(page => readFile(path.join(root, "out/entries", page), "utf8")));
    expect(content.some(html => html.includes("9007199254740993"))).toBe(true);
  } finally {
    // <lang><zh-CN>删除前核对测试根的解析后位置与专属前缀，清理限于本次创建的临时目录。</zh-CN><en>Verify the resolved test-root location and dedicated prefix before deletion, restricting cleanup to this invocation's temporary directory.</en></lang>
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith("hia-jsondoc-cli-")) throw new Error("Unexpected fixture boundary.");
    await rm(root, { recursive: true, force: true });
  }
});
