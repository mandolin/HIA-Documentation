/**
 * @file
 * @lang zh-CN 普通位置索引选项的运行时、快照和失败上下文回归，仅使用合成数据。
 * @lang en Runtime, snapshot and failure-context regressions for ordinary index options, using synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { TraceMap } from "@jridgewell/trace-mapping";
import { createOrdinarySourceMapIndex, findOriginalPositionForGenerated, type OrdinarySourceMapIndexOptions } from "./index.js";

/** @lang zh-CN 合法最小映射含不得进入索引的合成正文。 @lang en Minimal valid map with a synthetic body that must not enter the index. */
function fixture() {
  return { version: 3 as const, sources: ["src/a.ts"], sourcesContent: ["synthetic-private-body"], names: [], mappings: "AAAA" };
}

/** @lang zh-CN 错误运行时输入不扩大公开静态类型。 @lang en Passes malformed runtime inputs without widening public static types. */
function create(options: unknown, map: unknown = fixture()) {
  return createOrdinarySourceMapIndex(map, options as OrdinarySourceMapIndexOptions);
}

/** @lang zh-CN 选项拒绝必须为空、无不可信上下文和异常正文。 @lang en Rejected options must yield an empty result without untrusted context or exception text. */
function refused(options: unknown, map: unknown = fixture()) {
  // <lang><zh-CN>检查完整结果可序列化，因为创建失败不保留原options回显。</zh-CN><en>Check the entire serializable result because creation failure retains no raw options echo.</en></lang>
  const result = create(options, map);
  expect(result).toMatchObject({ status: "invalid", mappingCount: 0, sourceCount: 0, sources: [], diagnostics: [{ code: "ORDINARY_SOURCE_MAP_INVALID", message: "Ordinary source map metadata could not be read safely." }] });
  for (const key of ["traceMap", "path", "artifactPath"]) expect(Object.hasOwn(result, key)).toBe(false);
  expect(JSON.stringify(result)).not.toContain("synthetic-private");
}

describe("ordinary index options boundary", () => {
  // <lang><zh-CN>用工厂封装对抗根，避免参数框架先读取或复制特殊对象。</zh-CN><en>Wrap hostile roots in factories so the parameter framework never inspects or copies special objects first.</en></lang>
  it.each([
    { name: "null", make: () => null }, { name: "boolean", make: () => false },
    { name: "number", make: () => 0 }, { name: "string", make: () => "map" },
    { name: "array", make: () => [] }, { name: "function", make: () => () => undefined },
    { name: "date", make: () => new Date(0) }, { name: "boxed", make: () => new String("map") },
    { name: "inherited", make: () => Object.create({ path: "synthetic-private" }) }
  ])("rejects $name option roots", ({ make }) => { refused(make()); });

  for (const field of ["path", "artifactPath"] as const) {
    it.each([
      { name: "null", make: () => null }, { name: "boolean", make: () => false },
      { name: "number", make: () => 0 }, { name: "array", make: () => [] },
      { name: "object", make: () => ({}) }, { name: "boxed", make: () => new String("map") },
      { name: "symbol", make: () => Symbol("synthetic-private") },
      { name: "bigint", make: () => 1n }, { name: "function", make: () => () => undefined }
    ])(`rejects $name ${field} values`, ({ make }) => {
      refused({ path: "valid.map", artifactPath: "valid.js", [field]: make() });
    });

    it.each(["valid", "invalid"])(`does not execute ${field} getters with %s maps`, (kind) => {
      // <lang><zh-CN>getter若被调用会抛异常；失败map也不能在catch中再次访问。</zh-CN><en>The getter throws if invoked; invalid maps must not trigger another access from catch.</en></lang>
      let reads = 0;
      const options = Object.defineProperty({}, field, { get() { reads += 1; throw new Error("synthetic-private-error"); } });
      refused(options, kind === "valid" ? fixture() : {});
      expect(reads).toBe(0);
    });

    it(`rejects setter-only ${field} descriptors`, () => {
      refused(Object.defineProperty({}, field, { set(_value: unknown) { throw new Error("synthetic-private"); } }));
    });
  }

  it.each(["prototype", "descriptor", "revoked"])("contains %s reflection failures", (kind) => {
    // <lang><zh-CN>反射可能运行代理陷阱；这里只承诺捕获异常和固定输出。</zh-CN><en>Reflection may run proxy traps; this checks caught exceptions and fixed output only.</en></lang>
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const options = kind === "revoked" ? revoked.proxy : new Proxy({}, kind === "prototype"
      ? { getPrototypeOf() { throw new Error("synthetic-private"); } }
      : { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); } });
    refused(options);
  });

  it.each(["plain", "null"])("accepts frozen %s data and ignores extensions", (kind) => {
    // <lang><zh-CN>未知访问器、循环和toJSON不会参与已知路径投影。</zh-CN><en>Unknown accessors, cycles and toJSON do not participate in known-path projection.</en></lang>
    let reads = 0;
    const options = Object.assign(Object.create(kind === "null" ? null : Object.prototype), { path: "cache/a.js.map", artifactPath: "./dist\\a.js" });
    Object.defineProperty(options, "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } });
    options.self = options;
    options.toJSON = () => { reads += 1; throw new Error("synthetic-private"); };
    const result = create(Object.freeze(options));
    expect(result).toMatchObject({ status: "available", path: "cache/a.js.map", artifactPath: "dist/a.js", mappingCount: 1 });
    expect(reads).toBe(0);
    expect(JSON.stringify(result)).not.toContain("synthetic-private-body");
  });

  it.each(["omitted", "undefined", "empty", "whitespace", "normal"])("retains %s path semantics", (kind) => {
    // <lang><zh-CN>路径仍由库解析；空白不裁剪，空字符串按旧返回上下文规则省略。</zh-CN><en>The library still resolves paths; whitespace is untrimmed and empty strings retain prior context omission.</en></lang>
    const value = kind === "empty" ? "" : kind === "whitespace" ? " " : "cache/a.js.map";
    const options = kind === "omitted" ? undefined : kind === "undefined" ? { path: undefined, artifactPath: undefined } : { path: value, artifactPath: value };
    const result = create(options);
    expect(result.status).toBe("available");
    if (["omitted", "undefined", "empty"].includes(kind)) {
      expect(Object.hasOwn(result, "path")).toBe(false);
      expect(Object.hasOwn(result, "artifactPath")).toBe(false);
    } else {
      expect(result.path).toBe(value);
      expect(result.artifactPath).toBe(value);
    }
    expect(result.traceMap?.resolvedSources).toEqual(new TraceMap(fixture(), kind === "omitted" || kind === "undefined" ? null : value).resolvedSources);
  });

  it.each(["object", "string", "decoded", "trace"])("preserves %s resolution with projected options", (kind) => {
    // <lang><zh-CN>已有实例保留旧解析基准；其它三输入使用新基准。</zh-CN><en>An existing instance keeps its old base; the other three inputs use the new base.</en></lang>
    const map = fixture();
    const input = kind === "string" ? JSON.stringify(map) : kind === "decoded" ? { ...map, mappings: [[[0, 0, 0, 0]]] } : kind === "trace" ? new TraceMap(map, "old/a.js.map") : map;
    const before = JSON.stringify(input);
    const result = create({ path: "https://example.test/maps/a.js.map", artifactPath: "./dist\\a.js" }, input);
    expect(result.status).toBe("available");
    expect(findOriginalPositionForGenerated(result, { line: 1 }).original?.sourcePath).toBe(kind === "trace" ? "old/src/a.ts" : "https://example.test/maps/src/a.ts");
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(result)).not.toContain("synthetic-private-body");
  });

  it("retains validated context when the map is invalid", () => {
    const result = create({ path: "cache/a.js.map", artifactPath: "./dist\\a.js" }, {});
    expect(result).toMatchObject({ status: "invalid", path: "cache/a.js.map", artifactPath: "dist/a.js", diagnostics: [{ code: "ORDINARY_SOURCE_MAP_INVALID", path: "cache/a.js.map" }] });
  });

  it("uses snapshots if map reflection changes the caller options", () => {
    // <lang><zh-CN>map反射晚于选项投影，不能使成功或catch读取新的getter。</zh-CN><en>Map reflection follows option projection and must not make success/catch read newly installed getters.</en></lang>
    let reads = 0;
    const options = { path: "old/a.js.map", artifactPath: "./dist\\a.js" };
    const map = new Proxy(fixture(), { getPrototypeOf(target) {
      for (const field of ["path", "artifactPath"]) Object.defineProperty(options, field, { configurable: true, get() { reads += 1; throw new Error("synthetic-private"); } });
      return Reflect.getPrototypeOf(target);
    } });
    const result = create(options, map);
    expect(result).toMatchObject({ status: "available", path: "old/a.js.map", artifactPath: "dist/a.js" });
    expect(reads).toBe(0);
  });

  it("reads known descriptors once without get or ownKeys", () => {
    // <lang><zh-CN>已知字段逐个取一次描述符，不枚举扩展或读取代理属性值。</zh-CN><en>Read each known descriptor once without enumerating extensions or reading proxy properties.</en></lang>
    const descriptors: string[] = [];
    const options = new Proxy({ path: "cache/a.js.map", artifactPath: "dist/a.js" }, {
      get() { throw new Error("synthetic-private"); }, ownKeys() { throw new Error("synthetic-private"); },
      getOwnPropertyDescriptor(target, key) { descriptors.push(String(key)); return Reflect.getOwnPropertyDescriptor(target, key); }
    });
    expect(create(options).status).toBe("available");
    expect(descriptors.sort()).toEqual(["artifactPath", "path"]);
  });

  it("does not invoke path conversion hooks", () => {
    let reads = 0;
    const value = { toString() { reads += 1; throw new Error("synthetic-private"); }, [Symbol.toPrimitive]() { reads += 1; throw new Error("synthetic-private"); } };
    refused({ path: value });
    refused({ artifactPath: value });
    expect(reads).toBe(0);
  });

  it("keeps caller context separate from publication permission", () => {
    const result = create({ path: "C:/caller-private/a.js.map", artifactPath: "https://example.test/a.js" }, {});
    expect(result.path).toBe("C:/caller-private/a.js.map");
    expect(result.diagnostics[0]?.path).toBe(result.path);
    expect(result.artifactPath).toBe("https://example.test/a.js");
  });
});
