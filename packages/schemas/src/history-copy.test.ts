/**
 * @file
 * @lang zh-CN 历史分发复制的原字节与失败前置验证回归，仅写测试临时目录。
 * @lang en Regression coverage for byte-exact history copying and failure preflight, writing test temporary directories only.
 */
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error Build tooling is a native JavaScript script without public declarations.
import { copySchemaHistory } from "../scripts/copy-schema-history.mjs";

/** @lang zh-CN 为每项测试建立独立受控包目录，使用非编译器格式的原始schema字节。 @lang en Creates an independently owned package directory per test with schema bytes unlike compiler formatting. */
async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "hia-history-copy-"));
  const source = path.join(root, "src/history");
  const bytes = '{"$id":"https://mandolin.github.io/HIA-Documentation/schemas/example.schema.json","$schema":"https://json-schema.org/draft/2020-12/schema","properties":{"contractVersion":{"const":"0.1.0"}}}\n';
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, "example.schema.json"), bytes);
  await writeFile(path.join(source, "index.json"), JSON.stringify({ formatVersion: "1.0.0", schemas: [{ key: "example", contractVersion: "0.1.0", schemaId: "https://mandolin.github.io/HIA-Documentation/schemas/example.schema.json", fileName: "example.schema.json", sha256: createHash("sha256").update(bytes).digest("hex") }] }));
  return root;
}

/** @lang zh-CN 清理仅接受本测试创建的临时包目录，先校验解析后的绝对边界。 @lang en Cleanup accepts only this test's temporary package directory after checking resolved absolute boundaries. */
async function cleanup(root: string): Promise<void> {
  expect(path.dirname(path.resolve(root))).toBe(path.resolve(tmpdir()));
  expect(path.basename(root).startsWith("hia-history-copy-")).toBe(true);
  await rm(root, { recursive: true, force: true });
}

it("copies original schema and index bytes after compiler formatting", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "dist/history"), { recursive: true });
    await writeFile(path.join(root, "dist/history/example.schema.json"), "reformatted");
    expect(await copySchemaHistory(root)).toBe(1);
    for (const file of ["example.schema.json", "index.json"]) expect(await readFile(path.join(root, "dist/history", file))).toEqual(await readFile(path.join(root, "src/history", file)));
  } finally { await cleanup(root); }
});

it("refuses digest drift before changing existing distribution bytes", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "dist/history"), { recursive: true });
    await writeFile(path.join(root, "dist/history/example.schema.json"), "preserved");
    await writeFile(path.join(root, "src/history/example.schema.json"), "drifted");
    await expect(copySchemaHistory(root)).rejects.toThrow("digest drifted");
    expect(await readFile(path.join(root, "dist/history/example.schema.json"), "utf8")).toBe("preserved");
  } finally { await cleanup(root); }
});
