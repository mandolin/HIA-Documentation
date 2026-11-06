/**
 * @file
 * @lang zh-CN JSON生产的内容、身份、来源及拒绝边界回归。
 * @lang en Regressions for JSON production content, identity, provenance and rejection boundaries.
 */
import { describe, expect, it } from "vitest";
import { validateHiaDocument } from "@hia-doc/core";
import { createDocSourceMapIndex } from "@hia-doc/source-linkage";
import { generateJsonDocumentation } from "./index.js";

const options = { path: "schemas/sample.json", locale: "en" };

describe("lossless JSON documentation", () => {
  it("retains every value, RFC6901 identity, hierarchy and raw numeric lexeme", () => {
    const text = '{"": {"a/b~c": [9007199254740993,1e400,-0,null,true]},"__proto__":{"constructor":"ok"}}';
    const result = generateJsonDocumentation(Buffer.from(text), options);
    const values = result.document.symbols.map(symbol => symbol.metadata!.json as Record<string, unknown>);
    expect(values.map(value => value.pointer)).toEqual(["", "/", "//a~1b~0c", "//a~1b~0c/0", "//a~1b~0c/1", "//a~1b~0c/2", "//a~1b~0c/3", "//a~1b~0c/4", "/__proto__", "/__proto__/constructor"]);
    expect(values.slice(3, 6).map(value => value.lexeme)).toEqual(["9007199254740993", "1e400", "-0"]);
    expect(result.document.symbols[3]!.parentId).toBe(result.document.symbols[2]!.id);
    expect(result.sourceText).toBe(text);
    expect(JSON.stringify(result.document)).not.toContain('"content":');
    expect(validateHiaDocument(result.document)).toEqual([]);
    expect(createDocSourceMapIndex(result.sourceMap).status).toBe("available");
  });

  it("uses physical CRLF lines, exclusive endpoints and UTF16 columns", () => {
    const text = '{\r\n"😀":"x\u2028y\u2029", "v":2\r\n}';
    const result = generateJsonDocumentation(text, options);
    const value = result.document.symbols.find(symbol => symbol.name === "v")!;
    const offset = text.indexOf("2");
    expect(value.source!.definedIn!.range).toEqual({ start: { line: 2, column: offset - 2 }, end: { line: 2, column: offset - 1 } });
    const map = result.sourceMap as { entries: { sourceRefs: { rangeConvention: unknown }[] }[] };
    expect(map.entries.every(entry => entry.sourceRefs[0]!.rangeConvention && JSON.stringify(entry.sourceRefs[0]!.rangeConvention) === JSON.stringify({ endBoundary: "exclusive", columnUnit: "utf16-code-unit" }))).toBe(true);
  });

  it.each(["false", "null", "[]", "{}", '"text"'])("supports primitive and empty roots %s", text => {
    const result = generateJsonDocumentation(text, options);
    expect(result.document.symbols).toHaveLength(1);
    expect(result.sourceText).toBe(text);
  });

  it("retains lexical reference context without guessing schema vocabulary", () => {
    const result = generateJsonDocumentation('{"const":{"$ref":"#/$defs/A"},"$defs":{"A":true},"$ref":"https://example.test/schema"}', options);
    const values = result.document.symbols.map(symbol => symbol.metadata!.json as Record<string, unknown>);
    expect(values.find(value => value.pointer === "/const/$ref")!.reference).toEqual({ keyword: "$ref", value: "#/$defs/A", semantics: "lexical-occurrence" });
    expect(values.find(value => value.pointer === "/$ref")!.reference).toEqual({ keyword: "$ref", value: "https://example.test/schema", semantics: "lexical-occurrence" });
  });

  it.each(['{"x":1,"\\u0078":2}', '{"x":1,}', '{/* comment */"x":1}', "", "01", "NaN", '\uFEFF{}'])("rejects ambiguous or non-strict JSON %s", text => {
    expect(() => generateJsonDocumentation(text, options)).toThrow();
  });

  it("rejects malformed UTF8, unpaired input surrogates and unsafe paths", () => {
    expect(() => generateJsonDocumentation(Uint8Array.of(0xc3, 0x28), options)).toThrow();
    expect(() => generateJsonDocumentation('"\ud800"', options)).toThrow();
    for (const path of ["../private.json", "C:/secret.json", "a\\b.json", "/root.json", "a/../b.json", "a%2fb.json"]) {
      expect(() => generateJsonDocumentation("{}", { ...options, path })).toThrow();
    }
  });

  it("bounds bytes, syntax tokens and depth before constructing a tree", () => {
    expect(() => generateJsonDocumentation('"' + "x".repeat(4 * 1024 * 1024) + '"', options)).toThrow();
    expect(() => generateJsonDocumentation("[".repeat(129) + "0" + "]".repeat(129), options)).toThrow();
    expect(() => generateJsonDocumentation("[" + "0,".repeat(125001) + "0]", options)).toThrow();
  });

  it("has deterministic identities and digests and records actual locale only", () => {
    const first = generateJsonDocumentation('{"description":"原始中文"}', { ...options, locale: "zh-CN" });
    expect(generateJsonDocumentation(first.sourceText, { ...options, locale: "zh-CN" })).toEqual(first);
    expect(first.document.locales).toEqual(["zh-CN"]);
    expect(first.document.symbols.every(symbol => symbol.i18n === undefined)).toBe(true);
    expect(generateJsonDocumentation("{}", { ...options, path: "other.json" }).document.id).not.toBe(first.document.id);
  });

  it("bounds deep long-key pointer expansion", () => {
    const key = "x".repeat(4000);
    const text = (`{"${key}":`).repeat(40) + "0" + "}".repeat(40);
    expect(() => generateJsonDocumentation(text, options)).toThrow("pointer budget");
  });
});
