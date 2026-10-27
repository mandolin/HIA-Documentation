/**
 * @file
 * @lang zh-CN 历史 schema 身份、不可变字节和恶意索引回归；fixture 仅含公开 synthetic 数据。
 * @lang en Regression coverage for historical schema identities, immutable bytes, and hostile indexes; fixtures contain public synthetic data only.
 */
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readHistoricalSchemas } from "../../../scripts/lib/schema-history.mjs";
import { getHiaSchema, HIA_SCHEMA_CATALOG, HIA_SCHEMA_PUBLIC_BASE_URL } from "./index.js";

// <lang><zh-CN>期望摘要独立于可编辑索引，固定首次迁移前已分发的原始文件。</zh-CN><en>Expected digests are independent of the editable index and pin the distributed files before the first migration.</en></lang>
const pinnedDigests: Record<string, string> = {
  "generated-documentation-binding-0.1.0-draft.schema.json": "6ea1aca4fcc69f6fab6bf034be6efc4433d8d5d69e3694d101ea7a59a03998d7",
  "generated-documentation-binding-0.2.0-draft.schema.json": "474c20333ceb5b7e5aaa43ce5dc53e3016d9a0cce4a30eb3e8c0c41d945ba21b",
  "documentation-profile-0.1.0-draft.schema.json": "ddcc684a742da21c898965885a28989b33f2ccaa9f610943b48f77c7be0476a8",
  "documentation-producer-0.1.0-draft.schema.json": "c7ca78e4fc904b4cad638a430b881cd08a3a2eee84550a7725bed2e2c03e898a",
  "documentation-producer-result-0.1.0-draft.schema.json": "f9289c91ceebcf5b75863e1ad492371692edc18e21c44bdbe71de3ec411f6a66",
  "doc-source-map-0.1.0-draft.schema.json": "26981fe51e91fad06b191a6bed0ee9e17e862542b1e95951a93a30f3f485aa3d",
  "doc-source-map-1.0.0.schema.json": "6dddbb5151e5d74f62a21bc0bfe217fb1f309402bc594d0dd0e5e062b64786c3",
  "documentation-presentation-profile-0.1.0-draft.schema.json": "a860db4f272feec7a9e846ccf8b6e4e8d5f472c42b994a41e4dc676c53d40291",
  "documentation-ui-locale-completeness-0.1.0-draft.schema.json": "49c0a2da49a27207098c342c172a8f3aa5bdb06c36be665fd1afbfd8cababfa2",
  "hia-document-0.2.0.schema.json": "29ba249908238edf8eb2795e64d70528db8e5e7e272560d8d1a6c3a0d80f3c1e",
  "hia-project-manifest-0.1.0-draft.schema.json": "a527136765ea85a964b82bb441b28999c6069a1c0dae41ef677ad3587ba1e0f7"
};

/**
 * @lang zh-CN 在独立临时目录测试损坏索引；最终清理只涉及本次 mkdtemp 返回的目录。
 * @lang en Tests a damaged index in an isolated temporary directory; cleanup targets only the directory returned by this invocation's mkdtemp.
 * @param mutate <lang><zh-CN>只修改测试索引的回调。</zh-CN><en>Callback mutating the test index only.</en></lang>
 * @returns <lang><zh-CN>当无效输入已被拒绝后完成。</zh-CN><en>Resolves after invalid input has been rejected.</en></lang>
 */
async function expectInvalidIndex(mutate: (index: { formatVersion: string; schemas: Record<string, unknown>[] }) => void): Promise<void> {
  // <lang><zh-CN>使用系统临时目录，避免写入实际历史快照或产物。</zh-CN><en>Use the system temporary directory to avoid writing real historical snapshots or artifacts.</en></lang>
  const directory = await mkdtemp(path.join(os.tmpdir(), "hia-schema-history-"));
  try {
    // <lang><zh-CN>单条有效记录与内容构成测试基线，再由回调注入一个明确缺陷。</zh-CN><en>A valid single record and body form the baseline before the callback injects one explicit defect.</en></lang>
    const body = JSON.stringify({ $id: HIA_SCHEMA_PUBLIC_BASE_URL + "fixture-0.1.0.schema.json", $schema: "https://json-schema.org/draft/2020-12/schema", properties: { contractVersion: { const: "0.1.0" } } });
    const index = { formatVersion: "1.0.0", schemas: [{ key: "fixture", contractVersion: "0.1.0", fileName: "fixture-0.1.0.schema.json", schemaId: HIA_SCHEMA_PUBLIC_BASE_URL + "fixture-0.1.0.schema.json", sha256: createHash("sha256").update(body).digest("hex") }] };
    await writeFile(path.join(directory, "fixture-0.1.0.schema.json"), body);
    mutate(index);
    await writeFile(path.join(directory, "index.json"), JSON.stringify(index));
    await expect(readHistoricalSchemas(directory, HIA_SCHEMA_PUBLIC_BASE_URL)).rejects.toThrow();
  } finally {
    // <lang><zh-CN>递归删除前核对最终目录仍是系统 temp 的直接子目录。</zh-CN><en>Before recursive deletion, verify that the final directory remains a direct child of system temp.</en></lang>
    expect(path.dirname(path.resolve(directory))).toBe(path.resolve(os.tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
}

describe("historical schema distribution", () => {
  it.each(["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"])("returns undefined for inherited object key %s", (key) => {
    // <lang><zh-CN>未知字符串不应从 Object.prototype 取得对象或函数，也不能触发 structuredClone 异常。</zh-CN><en>Unknown strings must not retrieve objects or functions from Object.prototype or trigger structuredClone errors.</en></lang>
    expect(getHiaSchema(key)).toBeUndefined();
  });
  it("keeps the old identity resolvable after the current catalog moves to a new identity", () => {
    // <lang><zh-CN>仅在本测试内模拟 owner 升级；finally 恢复当前 catalog，避免污染其它断言。</zh-CN><en>Simulate an owner upgrade within this test only; finally restores the current catalog to avoid contaminating other assertions.</en></lang>
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "hia-document")!;
    const oldId = entry.schemaId;
    try {
      entry.schemaId = HIA_SCHEMA_PUBLIC_BASE_URL + "hia-document-1.0.0.schema.json";
      expect(getHiaSchema(oldId)?.$id).toBe(oldId);
    } finally {
      entry.schemaId = oldId;
    }
  });
  it("preserves eleven canonical identities, original bytes and defensive lookup copies", async () => {
    // <lang><zh-CN>读取实际源码快照，并与独立固定摘要和查询结果逐条比较。</zh-CN><en>Read actual source snapshots and compare each against independent pinned digests and lookup results.</en></lang>
    const snapshots = await readHistoricalSchemas(path.join(__dirname, "history"), HIA_SCHEMA_PUBLIC_BASE_URL);
    expect(snapshots).toHaveLength(11);
    expect(Object.keys(pinnedDigests).sort()).toEqual(snapshots.map(({ entry }) => entry.fileName).sort());
    for (const { entry, bytes } of snapshots) {
      expect(entry.sha256).toBe(pinnedDigests[entry.fileName]);
      expect(getHiaSchema(entry.schemaId)).toEqual(JSON.parse(bytes.toString("utf8")));
      // <lang><zh-CN>调用方修改返回对象不能污染后续按历史身份读取的定义。</zh-CN><en>A caller's mutation cannot contaminate later reads by historical identity.</en></lang>
      const first = getHiaSchema(entry.schemaId)!;
      first.$id = "changed";
      expect(getHiaSchema(entry.schemaId)?.$id).toBe(entry.schemaId);
    }
  });

  it.each(["../private.schema.json", "..\\private.schema.json", "/private.schema.json", "C:\\private.schema.json", "%2e%2e.schema.json"])("rejects unsafe historical filename %s", async (fileName) => {
    await expectInvalidIndex((index) => { index.schemas[0].fileName = fileName; });
  });
  it("rejects a namespace escape", async () => {
    await expectInvalidIndex((index) => { index.schemas[0].schemaId = "https://example.invalid/fixture-0.1.0.schema.json"; });
  });
  it("rejects duplicate canonical destinations", async () => {
    await expectInvalidIndex((index) => { index.schemas.push({ ...index.schemas[0] }); });
  });
  it("rejects digest drift", async () => {
    await expectInvalidIndex((index) => { index.schemas[0].sha256 = "0".repeat(64); });
  });
  it("rejects version and content identity mismatches", async () => {
    await expectInvalidIndex((index) => { index.schemas[0].contractVersion = "9.0.0"; });
  });
  it("rejects unsupported index formats", async () => {
    await expectInvalidIndex((index) => { index.formatVersion = "2.0.0"; });
  });
});
