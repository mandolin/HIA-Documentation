/**
 * @file
 * @lang zh-CN 普通位置映射四入口的查找责任特征；合成稀疏映射区分偏置、同列重复与跨行未命中。
 * @lang en Characterizes four ordinary-map entry responsibilities; synthetic sparse mappings distinguish bias, duplicate columns and cross-line misses.
 */
import { describe, expect, it } from "vitest";
import { encodedMap, TraceMap } from "@jridgewell/trace-mapping";
import { createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal } from "./index.js";

/** @lang zh-CN 同一原始坐标出现三次，第二来源槽位与第一槽位同名；数组中的行/列均零基。 @lang en One original coordinate occurs three times, and the second source slot duplicates the first name; array lines/columns are zero-based. */
function fixture() {
  return { version: 3 as const, file: "not-artifact.js", sources: ["src/A.ts", "src/A.ts"], names: ["begin", "end"], mappings: [
    [[4, 0, 1, 2, 0], [8], [12, 0, 1, 8, 1], [16, 0, 1, 2]], [], [[2, 0, 1, 2]], [[0, 0, 3, 0]], [[0, 1, 1, 2]]
  ] };
}

/** @lang zh-CN 使用编码/解码两种表示核同一算法责任；不重复旧输入拒绝专项。 @lang en Checks the same algorithm responsibilities with encoded/decoded representations without replaying prior input refusals. */
function indexFor(carrier: string) {
  // <lang><zh-CN>每次独立构造以免库缓存跨测试共享；编码由既有依赖生成。</zh-CN><en>Construct independently to avoid cross-test library caches; encode using the existing dependency.</en></lang>
  const value = fixture();
  return createOrdinarySourceMapIndex(carrier === "encoded" ? encodedMap(new TraceMap(value)) : value, { artifactPath: "dist/A.js" });
}

describe.each(["decoded", "encoded"])("ordinary entry responsibility %s", carrier => {
  it("accepts an empty map without manufacturing a position from file metadata", () => {
    // <lang><zh-CN>结构可用与位置命中是两个维度；file不会成为artifactPath。</zh-CN><en>Structural availability and a position match are distinct; file does not become artifactPath.</en></lang>
    const index = createOrdinarySourceMapIndex({ version: 3, file: "not-artifact.js", sources: [], names: [], mappings: carrier === "encoded" ? ";;" : [[], [], []] });
    expect(index).toMatchObject({ status: "available", mappingCount: 0, sourceCount: 0 });
    expect(index).not.toHaveProperty("artifactPath");
    expect(findOriginalPositionForGenerated(index, { line: 1 }).status).toBe("unmapped");
    expect(findGeneratedPositionForOriginal(index, "src/A.ts", { line: 1 }).status).toBe("unmapped");
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 1 }).generated).toEqual([]);
  });
  it("uses default lower-bound segment anchors without interpolating columns", () => {
    // <lang><zh-CN>生成列7落在列5之后，返回段锚点2:3，不能按差值推成2:5。</zh-CN><en>Generated column seven follows column five; return segment anchor 2:3 rather than interpolating to 2:5.</en></lang>
    const result = findOriginalPositionForGenerated(indexFor(carrier), { line: 1, column: 7 });
    expect(result).toMatchObject({ status: "available", original: { name: "begin", sourcePath: "src/A.ts", position: { line: 2, column: 3 } } });
    // <lang><zh-CN>非精确GLB命中较小列的最后一个重复项，仍返回其锚点，不做位移插值。</zh-CN><en>A nonexact GLB match selects the last duplicate at the lower column, still returning its anchor without offset interpolation.</en></lang>
    expect(findGeneratedPositionForOriginal(indexFor(carrier), "src/A.ts", { line: 2, column: 6 }).generated!.position).toEqual({ line: 3, column: 3 });
  });
  it("does not skip an unmapped segment to find a nearby mapped segment", () => {
    // <lang><zh-CN>偏置选择到无来源段就未命中，不继续扫描；相反偏置可选后一个段。</zh-CN><en>Choosing an unmapped segment yields a miss without further scanning; the opposite bias can select the next segment.</en></lang>
    const index = indexFor(carrier);
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 10 }).status).toBe("unmapped");
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 10 }, { bias: "least-upper-bound" }).original!.position).toEqual({ line: 2, column: 9 });
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 9 }, { bias: "least-upper-bound" }).status).toBe("unmapped");
  });
  it("keeps forward lookup on its requested generated line", () => {
    const index = indexFor(carrier);
    for (const bias of ["greatest-lower-bound", "least-upper-bound"] as const) {
      // <lang><zh-CN>空行与尾外行不跨行寻找相邻映射。</zh-CN><en>Empty and beyond-end lines do not seek adjacent mappings across lines.</en></lang>
      expect(findOriginalPositionForGenerated(index, { line: 2 }, { bias }).status).toBe("unmapped");
      expect(findOriginalPositionForGenerated(index, { line: 6 }, { bias }).status).toBe("unmapped");
    }
    expect(findOriginalPositionForGenerated(index, { line: 1 }, { bias: "greatest-lower-bound" }).status).toBe("unmapped");
    expect(findOriginalPositionForGenerated(index, { line: 1 }, { bias: "least-upper-bound" }).original!.position).toEqual({ line: 2, column: 3 });
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 99 }, { bias: "least-upper-bound" }).status).toBe("unmapped");
  });
  it("selects first or last generated tie for an exact single reverse lookup", () => {
    const index = indexFor(carrier);
    expect(findGeneratedPositionForOriginal(index, "src/A.ts", { line: 2, column: 3 }).generated!.position).toEqual({ line: 1, column: 5 });
    expect(findGeneratedPositionForOriginal(index, "src/A.ts", { line: 2, column: 3 }, { bias: "least-upper-bound" }).generated!.position).toEqual({ line: 3, column: 3 });
  });
  it("returns all ties at the selected original column rather than every mapping on a line", () => {
    const index = indexFor(carrier);
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 2, column: 6 }).generated.map(item => item.position)).toEqual([{ line: 1, column: 5 }, { line: 1, column: 17 }, { line: 3, column: 3 }]);
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 2, column: 6 }, { bias: "least-upper-bound" }).generated.map(item => item.position)).toEqual([{ line: 1, column: 13 }]);
    // <lang><zh-CN>省略列即HIA列1；这一行首个原始锚点在列3，默认GLB因而未命中。</zh-CN><en>Omitted columns mean HIA column one; the first original anchor on this line is column three, so default GLB misses.</en></lang>
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 2 }).status).toBe("unmapped");
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 2 }, { bias: "least-upper-bound" }).generated).toHaveLength(3);
  });
  it("keeps both reverse lookups on the exact source and original line", () => {
    const index = indexFor(carrier);
    for (const bias of ["greatest-lower-bound", "least-upper-bound"] as const) {
      for (const source of ["src/A.ts", "src/a.ts", "src/A.ts "]) {
        // <lang><zh-CN>不存在的行不会因源码存在而跨行匹配；大小写/尾空格也不折叠。</zh-CN><en>A missing line does not match across lines merely because the source exists; case/trailing spaces are not folded.</en></lang>
        expect(findGeneratedPositionForOriginal(index, source, { line: 3 }, { bias }).status).toBe("unmapped");
        expect(findAllGeneratedPositionsForOriginal(index, source, { line: 3 }, { bias }).generated).toEqual([]);
      }
    }
    expect(findGeneratedPositionForOriginal(index, "src/a.ts", { line: 2, column: 3 }).status).toBe("unmapped");
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts ", { line: 2, column: 3 }).status).toBe("unmapped");
  });
  it("retains first source-slot behavior instead of merging duplicate source names", () => {
    const index = indexFor(carrier);
    expect(findOriginalPositionForGenerated(index, { line: 5 }).original!.sourcePath).toBe("src/A.ts");
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 2, column: 3 }).generated.map(item => item.position.line)).toEqual([1, 1, 3]);
  });
  it("validates a query before propagating an invalid index", () => {
    const index = createOrdinarySourceMapIndex({});
    expect(findOriginalPositionForGenerated(index, { line: 1 }).diagnostics).toBe(index.diagnostics);
    expect(findGeneratedPositionForOriginal(index, "src/A.ts", { line: 1 }).diagnostics).toBe(index.diagnostics);
    expect(findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 1 }).generated).toEqual([]);
    expect(findOriginalPositionForGenerated(index, { line: 0 }).diagnostics.map(item => item.code)).toEqual(["ORDINARY_SOURCE_MAP_INVALID", "ORDINARY_SOURCE_MAP_POSITION_INVALID"]);
    expect(findAllGeneratedPositionsForOriginal(index, "", { line: 1 }).diagnostics.map(item => item.code)).toEqual(["ORDINARY_SOURCE_MAP_INVALID", "ORDINARY_SOURCE_MAP_QUERY_INVALID"]);
  });
});

it("resolves equal generated columns by bias while retaining all-map tie behavior", () => {
  // <lang><zh-CN>两个段在同一生成列，GLB取首个、LUB取末个，不将正向API改成返回数组。</zh-CN><en>Two segments share one generated column: GLB takes the first, LUB the last; the forward API does not become an array.</en></lang>
  const index = createOrdinarySourceMapIndex({ version: 3, sources: ["src/A.ts"], names: ["first", "last"], mappings: [[[0, 0, 0, 0, 0], [0, 0, 0, 9, 1]]] });
  expect(findOriginalPositionForGenerated(index, { line: 1 }).original).toEqual({ sourcePath: "src/A.ts", position: { line: 1, column: 1 }, name: "first" });
  expect(findOriginalPositionForGenerated(index, { line: 1 }, { bias: "least-upper-bound" }).original).toEqual({ sourcePath: "src/A.ts", position: { line: 1, column: 10 }, name: "last" });
});
