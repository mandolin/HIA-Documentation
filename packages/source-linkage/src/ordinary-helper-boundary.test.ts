/**
 * @file
 * @lang zh-CN 三种普通位置helper的已知输入字段投影与固定拒绝回归，仅使用合成数据。
 * @lang en Regression coverage for known-field projection and fixed rejection in three ordinary position helpers, using synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal } from "./index.js";

/** @lang zh-CN 提供两个端点以复核既有两种偏置，索引是本包新建且未篡改。 @lang en Supplies two endpoints to verify both existing biases using a fresh untampered index. */
function fixture() { return createOrdinarySourceMapIndex({ version: 3, sources: ["src/a.ts"], names: [], mappings: [[[0, 0, 0, 0], [10, 0, 0, 10]]] }, { artifactPath: "dist/a.js", path: "dist/a.js.map" }); }
/** @lang zh-CN 对抗输入有意绕过静态类型，仅通过公开根调用。 @lang en Adversarial inputs intentionally bypass static types through public-root calls only. */
function lookup(direction: string, position: unknown, options?: unknown, source: unknown = "src/a.ts", index = fixture()): any {
  if (direction === "forward") return findOriginalPositionForGenerated(index, position as any, options as any);
  if (direction === "reverse") return findGeneratedPositionForOriginal(index, source as any, position as any, options as any);
  return findAllGeneratedPositionsForOriginal(index, source as any, position as any, options as any);
}
/** @lang zh-CN 只序列化诊断核隐私，不执行不可信输入回显中的getter/toJSON。 @lang en Serializes diagnostics only for privacy checks, never executing getters/toJSON in untrusted input echoes. */
function refused(direction: string, result: any, code: string): void {
  expect(result.status).toBe("invalid");
  expect(result.diagnostics.at(-1)?.code).toBe(code);
  expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
  if (direction === "forward") expect(result.original).toBeUndefined();
  else if (direction === "reverse") expect(result.generated).toBeUndefined();
  else expect(result.generated).toEqual([]);
}

describe.each(["forward", "reverse", "all"])("ordinary helper runtime %s", (direction) => {
  it.each([null, undefined, true, 42, "synthetic-private", [], new Date(0), Object.create({ line: 1 }), {}].map((value, id) => ({ value, id })))("rejects position root $id", ({ value }) => {
    refused(direction, lookup(direction, value), "ORDINARY_SOURCE_MAP_POSITION_INVALID");
  });
  it.each(["line", "column"])("does not execute %s getters", (coordinate) => {
    let reads = 0;
    const value = Object.defineProperty({ line: 1 }, coordinate, { get() { reads += 1; throw new Error("synthetic-private"); } });
    refused(direction, lookup(direction, value), "ORDINARY_SOURCE_MAP_POSITION_INVALID");
    expect(reads).toBe(0);
  });
  it("isolates position reflection exceptions", () => {
    const value = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); } });
    refused(direction, lookup(direction, value), "ORDINARY_SOURCE_MAP_POSITION_INVALID");
  });
  it("rejects revoked position proxies", () => {
    const pair = Proxy.revocable({}, {}); pair.revoke();
    refused(direction, lookup(direction, pair.proxy), "ORDINARY_SOURCE_MAP_POSITION_INVALID");
  });
  it.each([null, false, "synthetic-private", [], new Date(0)].map((value, id) => ({ value, id })))("rejects options root $id", ({ value }) => {
    refused(direction, lookup(direction, { line: 1 }, value), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
  });
  it("rejects invalid bias rather than silently defaulting", () => {
    for (const bias of [null, false, 42, "", " ", "nearest", {}, []]) refused(direction, lookup(direction, { line: 1 }, { bias }), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
  });
  it("does not execute bias getters", () => {
    let reads = 0;
    const options = Object.defineProperty({}, "bias", { get() { reads += 1; throw new Error("synthetic-private"); } });
    refused(direction, lookup(direction, { line: 1 }, options), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
    expect(reads).toBe(0);
  });
  it("isolates options reflection and revoked proxies", () => {
    const options = new Proxy({}, { getPrototypeOf() { throw new Error("synthetic-private"); } });
    refused(direction, lookup(direction, { line: 1 }, options), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
    const pair = Proxy.revocable({}, {}); pair.revoke();
    refused(direction, lookup(direction, { line: 1 }, pair.proxy), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
  });
  it("accepts frozen/null-prototype data and ignores unknown accessors", () => {
    let reads = 0;
    const position = Object.freeze(Object.defineProperty(Object.assign(Object.create(null), { line: 1, column: undefined }), "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } }));
    const options = Object.freeze(Object.defineProperty(Object.assign(Object.create(null), { bias: undefined }), "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } }));
    expect(lookup(direction, position, options).status).toBe("available");
    expect(reads).toBe(0);
  });
  it("retains bias results, default column and raw position identity", () => {
    const position = { line: 1, column: 6 };
    for (const bias of ["greatest-lower-bound", "least-upper-bound"]) {
      const result = lookup(direction, position, { bias });
      const mapped = direction === "forward" ? result.original : direction === "reverse" ? result.generated : result.generated[0];
      expect(mapped.position.column).toBe(bias === "greatest-lower-bound" ? 1 : 11);
      expect((direction === "forward" ? result.generated : result.original).position).toBe(position);
    }
    expect(lookup(direction, { line: 1 }).status).toBe("available");
    expect(lookup(direction, { line: 99 }).status).toBe("unmapped");
  });
  it("keeps index diagnostics and validates bad options even for an invalid map", () => {
    const index = createOrdinarySourceMapIndex({});
    const before = [...index.diagnostics];
    const result = lookup(direction, { line: 1 }, { bias: "wrong" }, "src/a.ts", index);
    refused(direction, result, "ORDINARY_SOURCE_MAP_QUERY_INVALID");
    expect(result.diagnostics.slice(0, before.length)).toEqual(before);
    expect(index.diagnostics).toEqual(before);
  });
});

describe("ordinary reverse path boundary", () => {
  it.each(["reverse", "all"])("rejects wrong/blank source paths in %s", (direction) => {
    for (const source of [null, undefined, false, 42, {}, [], "", " \t"]) {
      // <lang><zh-CN>undefined须作为真实第三参数进入，不使用lookup辅助函数的默认source参数。</zh-CN><en>Pass undefined as the actual source argument rather than using the lookup fixture's default source parameter.</en></lang>
      const index = fixture();
      const result = direction === "reverse" ? findGeneratedPositionForOriginal(index, source as any, { line: 1 }) : findAllGeneratedPositionsForOriginal(index, source as any, { line: 1 });
      refused(direction, result, "ORDINARY_SOURCE_MAP_QUERY_INVALID");
    }
  });
  it("does not invoke source path conversion hooks", () => {
    let reads = 0;
    const source = Object.defineProperty({}, "replaceAll", { get() { reads += 1; throw new Error("synthetic-private"); } });
    for (const direction of ["reverse", "all"]) refused(direction, lookup(direction, { line: 1 }, {}, source), "ORDINARY_SOURCE_MAP_QUERY_INVALID");
    expect(reads).toBe(0);
  });
});
