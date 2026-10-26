/**
 * @file
 * @lang zh-CN 五个诊断路径入口的选项形状、访问器、反射及快照回归，仅使用公开合成工件。
 * @lang en Option-shape, accessor, reflection and snapshot regressions for five diagnostic-path entries, using public synthetic artifacts only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/** @lang zh-CN 五入口复用各自有效历史输入，不借错误fixture掩盖选项行为。 @lang en Gives each entry valid legacy input instead of masking option behavior with malformed fixtures. */
function fixture(kind: string): unknown {
  // <lang><zh-CN>绑定和组迁移使用配套公开fixture，单映射迁移用不含绑定关联的历史样本。</zh-CN><en>Binding/bundle migration use a paired public fixture; standalone map migration uses a historical sample without binding linkage.</en></lang>
  if (kind === "binding" || kind === "bundle") {
    const pair = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
    return kind === "binding" ? pair.bindingSidecar : { docSourceMap: pair.documentMap, bindingSidecars: [pair.bindingSidecar] };
  }
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
}

/** @lang zh-CN 统一测试视图不扩大产品类型；诊断数组入口也暴露可断言的状态。 @lang en Normalizes the test view without widening product types; diagnostic-array entries also get an assertable state. */
function invoke(kind: string, options: unknown, value: unknown = fixture(kind)) {
  // <lang><zh-CN>未知值只在本运行时对抗测试中越过静态类型，所有调用走公开根。</zh-CN><en>Unknown values bypass static types only in this adversarial runtime test; every call uses the public root.</en></lang>
  const output = kind === "index" ? api.createDocSourceMapIndex(value, options as never)
    : kind === "validate" ? api.validateDocSourceMap(value, options as never)
    : kind === "migrate" ? api.migrateDocSourceMap(value, options as never)
    : kind === "bundle" ? api.migrateGeneratedDocumentationBindingBundle(value, options as never)
    : api.validateGeneratedDocumentationBinding(value, options as never);
  const diagnostics = Array.isArray(output) ? output : output.diagnostics;
  return { output, diagnostics, status: Array.isArray(output) ? output.some(diagnostic => diagnostic.severity === "error") ? "invalid" : "available" : output.status };
}

/** @lang zh-CN 选项失败必须使用入口原有code，不回显原值、部分路径或迁移产物。 @lang en Option failure must use the entry's existing code without reflecting values, partial paths or migration artifacts. */
function refused(kind: string, options: unknown, value: unknown = fixture(kind)) {
  const result = invoke(kind, options, value);
  const code = kind === "migrate" ? "DOC_SOURCE_MAP_MIGRATION_INVALID" : kind === "bundle" ? "GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID" : kind === "binding" ? "GENERATED_DOCUMENTATION_BINDING_INVALID" : "DOC_SOURCE_MAP_MANIFEST_INVALID";
  expect(result.status).toBe("invalid");
  expect(result.diagnostics).toHaveLength(1);
  expect(result.diagnostics[0]?.code).toBe(code);
  expect(JSON.stringify(result)).not.toContain("synthetic-private");
  expect(JSON.stringify(result.diagnostics)).not.toContain("targetPath");
  if (!Array.isArray(result.output)) {
    expect("path" in result.output).toBe(false);
    expect("manifest" in result.output).toBe(false);
    expect("bundle" in result.output).toBe(false);
  }
}

for (const kind of ["index", "validate", "migrate", "bundle", "binding"]) {
  describe(`${kind} diagnostic path options`, () => {
    it.each([
      { name: "null", make: () => null }, { name: "boolean", make: () => false }, { name: "number", make: () => 0 },
      { name: "string", make: () => "path" }, { name: "array", make: () => [] }, { name: "function", make: () => () => undefined },
      { name: "date", make: () => new Date(0) }, { name: "boxed", make: () => new String("path") }, { name: "inherited", make: () => Object.create({ path: "synthetic-private" }) }
    ])("rejects $name options", ({ make }) => { refused(kind, make()); });

    it.each([
      { name: "null", make: () => null }, { name: "boolean", make: () => false }, { name: "number", make: () => 0 },
      { name: "array", make: () => [] }, { name: "object", make: () => ({}) }, { name: "boxed", make: () => new String("path") },
      { name: "symbol", make: () => Symbol("synthetic-private") }, { name: "bigint", make: () => 1n }, { name: "function", make: () => () => undefined }
    ])("rejects $name paths", ({ make }) => { refused(kind, { path: make() }); });

    it.each(["valid", "invalid"])("does not execute path getter for %s input", (state) => {
      // <lang><zh-CN>getter抛错不得在正常或失败路径执行，包括错误处理再次访问。</zh-CN><en>A throwing getter must run in neither normal nor failure paths, including error-handler rereads.</en></lang>
      let reads = 0;
      const options = Object.defineProperty({}, "path", { get() { reads += 1; throw new Error("synthetic-private"); } });
      refused(kind, options, state === "valid" ? fixture(kind) : {});
      expect(reads).toBe(0);
    });

    it("rejects setter-only path descriptors", () => { refused(kind, Object.defineProperty({}, "path", { set() { throw new Error("synthetic-private"); } })); });

    it.each(["prototype", "descriptor", "revoked"])("contains %s reflection errors", (trap) => {
      const revoked = Proxy.revocable({}, {}); revoked.revoke();
      const options = trap === "revoked" ? revoked.proxy : new Proxy({}, trap === "prototype" ? { getPrototypeOf() { throw new Error("synthetic-private"); } } : { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); } });
      refused(kind, options);
    });

    it.each(["plain", "null"])("accepts frozen %s data and ignores extensions", (prototype) => {
      let reads = 0;
      const options = Object.assign(Object.create(prototype === "null" ? null : Object.prototype), { path: "context/map.json" });
      Object.defineProperty(options, "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } });
      options.self = options;
      const result = invoke(kind, Object.freeze(options));
      expect(result.status).not.toBe("invalid");
      expect(result.diagnostics.some(diagnostic => diagnostic.severity === "error")).toBe(false);
      expect(reads).toBe(0);
    });

    it.each(["default", "undefined", "empty", "whitespace", "normal"])("preserves %s context", (state) => {
      const path = state === "empty" ? "" : state === "whitespace" ? " " : "context/map.json";
      const options = state === "default" ? undefined : state === "undefined" ? { path: undefined } : { path };
      const result = invoke(kind, options);
      expect(result.status).not.toBe("invalid");
      if (kind === "index") expect((result.output as api.DocSourceMapIndex).path).toBe(state === "default" || state === "undefined" || state === "empty" ? undefined : path);
    });

    it("reads only one own descriptor, without get or ownKeys", () => {
      const seen: string[] = [];
      const options = new Proxy({ path: "context/map.json" }, {
        get() { throw new Error("synthetic-private"); }, ownKeys() { throw new Error("synthetic-private"); },
        getOwnPropertyDescriptor(target, key) { seen.push(String(key)); return Reflect.getOwnPropertyDescriptor(target, key); }
      });
      expect(invoke(kind, options).status).not.toBe("invalid");
      expect(seen).toEqual(["path"]);
    });

    it.each([false, true])("keeps snapshots after input reflection (failure=%s)", (fail) => {
      // <lang><zh-CN>输入图反射晚于选项投影；内部前后验证不得重读原options。</zh-CN><en>Input-graph reflection follows option projection; internal before/after validation must not reread original options.</en></lang>
      let reads = 0;
      const options = { path: "context/early.json" };
      const input = new Proxy(fixture(kind) as object, { getPrototypeOf(target) {
        Object.defineProperty(options, "path", { configurable: true, get() { reads += 1; throw new Error("synthetic-private"); } });
        if (fail) throw new Error("synthetic-private");
        return Reflect.getPrototypeOf(target);
      } });
      const result = invoke(kind, options, input);
      expect(reads).toBe(0);
      expect(result.status === "invalid").toBe(fail);
      if (fail) expect(JSON.stringify(result.diagnostics)).toContain("context/early.json");
    });

    it("retains valid unsanitized context on input failure", () => {
      const result = invoke(kind, { path: "C:/caller-private/map.json" }, {});
      expect(result.status).toBe("invalid");
      expect(JSON.stringify(result.diagnostics)).toContain("C:/caller-private/map.json");
    });

    it("rejects options before inspecting the input graph", () => {
      let reflections = 0;
      const input = new Proxy({}, { getPrototypeOf() { reflections += 1; throw new Error("synthetic-private"); } });
      refused(kind, { path: null }, input);
      expect(reflections).toBe(0);
    });
  });
}
