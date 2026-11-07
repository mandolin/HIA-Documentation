/**
 * @file
 * @lang zh-CN 类型审核的真实AST、匿名成员、原声明和字段缺失回归。
 * @lang en Regressions for actual type ASTs, anonymous members, original declarations and missing fields.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectModuleExports } from "./lib/package-api-inputs.mjs";
import { collectTypeApiExpectations, verifyTypeApiProjection } from "./lib/type-api-projection.mjs";
// <lang><zh-CN>夹具独占本owner忽略目录，真实TypeScript只读源码且不会执行顶层抛错。</zh-CN><en>Fixtures own an ignored directory; actual TypeScript reads sources without executing top-level throws.</en></lang>
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
fs.mkdirSync(dist, { recursive: true });
const root = fs.mkdtempSync(path.join(dist, "type-api-test-"));
fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
fs.writeFileSync(path.join(root, "api.mts"), [
    'throw new Error("DO_NOT_RUN");',
    '/** @lang en Root prose. */',
    'export interface Original {',
    '/** @lang en Field prose. */',
    'value: string;',
    '}',
    'export {Original as Alias};'
].join("\n"));
/**
 * @lang zh-CN 构造最小实际AST期望与中性生成形状，原生SDK实链另行执行。
 * @lang en Builds actual AST expectations and neutral generated shapes; actual SDK chains run separately.
 * @returns {object} <lang><zh-CN>本次独立输入。</zh-CN><en>Independent input for this test.</en></lang>
 */
function fixture() {
    const expected = collectTypeApiExpectations(root, collectModuleExports(root, ["api.mts"]));
    const symbols = [], modules = [{ path: "api.mts", exports: [] }], entries = [];
    for (const [index, binding] of expected.bindings.entries()) {
        const declaration = binding.declarations[0];
        const rootId = `root-${index}`;
        modules[0].exports.push({ name: binding.name, symbolIds: [rootId] });
        for (const [position, item] of [declaration, ...declaration.members].entries()) {
            // <lang><zh-CN>父项身份与源码位置分别固定，测试不能用同名替代原声明。</zh-CN><en>Parent identities and source positions are fixed separately, preventing same-name declaration substitution.</en></lang>
            const id = position === 0 ? rootId : `field-${index}`;
            symbols.push({
                id, name: item.name, classification: "type-only", exported: position === 0, ...(position ? { parentId: rootId } : {}), signature: item.signature, metadata: { modulePath: binding.module }, source: { path: item.path, range: item.range }, comment: {
                    range: item.commentRange, i18n: {
                        fields: {
                            description: { localizedText: { en: "Actual prose", "zh-CN": "实际正文" }, blocks: [{ locale: "en" }, { locale: "zh-CN" }] }
                        }
                    }
                }
            });
            entries.push({
                symbolId: id, sourceRefs: [
                    {
                        sourceId: "source", range: item.range, rangeSourceDetail: "typescript-native-ast:declaration", rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
                    },
                    {
                        sourceId: "source", range: item.commentRange, rangeSourceDetail: "typescript-native-ast:documentation-comment", rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
                    }
                ]
            });
        }
    }
    return { expected, extraction: { modules, symbols }, map: { sources: [{ id: "source", path: "api.mts" }], entries } };
}
test("aliases retain separate roots with exact member provenance", () => {
    const input = fixture();
    const result = verifyTypeApiProjection(input);
    assert.equal(result.bindings, 2);
    assert.equal(result.members, 2);
    assert.equal(result.complete, true);
    assert.equal(result.runtimeStateVerified, false);
});
test("anonymous union/intersection members enter independent expectations", () => {
    fs.writeFileSync(path.join(root, "branches.mts"), 'export type Input = {kind: string} & ({path: string} | {paths: string[]}); export type Json = string | {[key: string]: unknown};');
    const expected = collectTypeApiExpectations(root, collectModuleExports(root, ["branches.mts"]));
    assert.equal(expected.bindings.flatMap(binding => binding.declarations.flatMap(root => root.members)).length, 4);
    assert(expected.bindings.flatMap(binding => binding.declarations.flatMap(root => root.members)).some(member => member.kind === "IndexSignature"));
});
test("missing anonymous member output remains a strict gap", () => {
    const input = fixture();
    input.extraction.symbols = input.extraction.symbols.filter(node => !node.parentId);
    const result = verifyTypeApiProjection(input);
    assert.equal(result.verifiedRoots, 2);
    assert.equal(result.memberGaps, 2);
    assert.equal(result.complete, false);
});
test("wrong binding IDs, source ranges and parent roots cannot borrow coverage", () => {
    for (const kind of ["binding", "source", "parent"]) {
        const input = fixture();
        if (kind === "binding")
            input.extraction.modules[0].exports[0].symbolIds = ["root-1"];
        if (kind === "source")
            input.extraction.symbols[0].source = { path: "other.mts", range: input.extraction.symbols[0].source.range };
        if (kind === "parent")
            input.extraction.symbols.find(node => node.id === "field-0").parentId = "root-1";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("mixed locale fallback, changed signatures and comment ranges fail", () => {
    for (const kind of ["locale", "signature", "comment", "classification", "scope"]) {
        const input = fixture();
        const node = input.extraction.symbols[0];
        if (kind === "locale")
            node.comment.i18n.fields.description.localizedText["zh-CN"] = "Actual prose";
        if (kind === "signature")
            node.signature = "invented signature";
        if (kind === "comment")
            node.comment.range = null;
        if (kind === "classification")
            node.classification = "runtime";
        if (kind === "scope")
            node.metadata.modulePath = "other.mts";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("missing explicit locale blocks and map precision remain gaps", () => {
    for (const kind of ["blocks", "map", "convention"]) {
        const input = fixture();
        if (kind === "blocks")
            input.extraction.symbols[0].comment.i18n.fields.description.blocks = [];
        if (kind === "map")
            input.map.entries[0].sourceRefs = [];
        if (kind === "convention")
            input.map.entries[0].sourceRefs[0].rangeConvention.endBoundary = "inclusive";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("foreign declarations and source-coordinate mismatches are rejected", () => {
    const modules = collectModuleExports(root, ["api.mts"]);
    modules[0].exports[0].declarations[0].path = "../outside.mts";
    assert.throws(() => collectTypeApiExpectations(root, modules));
    const altered = collectModuleExports(root, ["api.mts"]);
    altered[0].exports[0].declarations[0].line = 999;
    assert.throws(() => collectTypeApiExpectations(root, altered), /original type declaration/);
});
