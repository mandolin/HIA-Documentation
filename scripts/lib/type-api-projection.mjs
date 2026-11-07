/**
 * @file
 * @lang zh-CN 独立核对类型导出、全部显式成员、双语和源码地图，匿名成员缺口保持可见。
 * @lang en Independently verifies type exports, every explicit member, bilingual prose and source maps while retaining anonymous-member gaps.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";
/**
 * @lang zh-CN 从独立导出清单解析原声明和所有物理成员，不执行源码或跟随继承成员。
 * @lang en Resolves original declarations and every physical member from an independent export inventory, without executing sources or expanding inherited members.
 * @param {string} root <lang><zh-CN>已授权owner根。</zh-CN><en>Authorized owner root.</en></lang>
 * @param {object[]} modules <lang><zh-CN>独立编译器模块与导出。</zh-CN><en>Independent compiler modules and exports.</en></lang>
 * @returns {object} <lang><zh-CN>逐绑定期望和实际读取源摘要。</zh-CN><en>Per-binding expectations and read-source digests.</en></lang>
 * @throws {Error} <lang><zh-CN>原声明不安全、缺失或预算超限。</zh-CN><en>Unsafe or missing declarations, or exhausted resource budgets.</en></lang>
 */
export function collectTypeApiExpectations(root, modules) {
    // <lang><zh-CN>缓存仅保存本次读取的源与摘要，所有位置使用原始UTF-16文本。</zh-CN><en>The cache holds sources and digests read in this call only; positions use original UTF-16 text.</en></lang>
    const sources = new Map();
    const bindings = [];
    let total = 0;
    const memberKinds = new Set([
        ts.SyntaxKind.PropertySignature, ts.SyntaxKind.MethodSignature, ts.SyntaxKind.IndexSignature, ts.SyntaxKind.CallSignature, ts.SyntaxKind.ConstructSignature
    ]);
    /**
     * @lang zh-CN 读取根内普通声明源，拒绝依赖目录、链接和超大文件。
     * @lang en Reads a regular owned declaration source, rejecting dependency directories, links and oversized files.
     * @param {string} relative <lang><zh-CN>安全相对路径。</zh-CN><en>Safe relative path.</en></lang>
     * @returns {object} <lang><zh-CN>独立AST及原字节摘要。</zh-CN><en>Independent AST and original-byte digest.</en></lang>
     */
    function read(relative) {
        assert(typeof relative === "string" && !/[\\:%?#]/.test(relative) && !path.isAbsolute(relative) && !relative.split("/").some(part => !part || part === "." || part === ".." || part === "node_modules"));
        if (sources.has(relative))
            return sources.get(relative);
        // <lang><zh-CN>读取前固定物理归属和资源边界，摘要用于生成结束复核。</zh-CN><en>Fix physical ownership and budgets before reading; digests support post-production verification.</en></lang>
        const absolute = path.resolve(root, relative);
        const state = fs.lstatSync(absolute);
        assert(state.isFile() && !state.isSymbolicLink() && state.nlink === 1 && state.size <= 4 * 1024 * 1024);
        assert.equal(fs.realpathSync(absolute), absolute);
        const bytes = fs.readFileSync(absolute);
        const source = ts.createSourceFile(relative, bytes.toString("utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        assert.equal(source.parseDiagnostics.length, 0);
        const record = { source, sha256: createHash("sha256").update(bytes).digest("hex") };
        sources.set(relative, record);
        return record;
    }
    /**
     * @lang zh-CN 记录原声明、注释和签名片段，完整源码只在内存中用于比较。
     * @lang en Records original declaration, comment and signature spans, retaining full source only in memory for comparison.
     * @param {object} node <lang><zh-CN>独立AST节点。</zh-CN><en>Independent AST node.</en></lang>
     * @param {object} source <lang><zh-CN>所属原文件。</zh-CN><en>Original owning file.</en></lang>
     * @param {string} name <lang><zh-CN>公开名或成员名。</zh-CN><en>Public or member name.</en></lang>
     * @returns {object} <lang><zh-CN>可序列化期望。</zh-CN><en>Serializable expectation.</en></lang>
     */
    function describe(node, source, name) {
        // <lang><zh-CN>位置来自同一独立AST，注释范围与声明范围分开核验。</zh-CN><en>Positions come from one independent AST, with comment and declaration spans verified separately.</en></lang>
        const range = value => {
            const start = source.getLineAndCharacterOfPosition(value.getStart(source));
            const end = source.getLineAndCharacterOfPosition(value.getEnd());
            return { start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } };
        };
        const comment = node.jsDoc?.at(-1);
        const end = node.members ? node.members.pos : node.getEnd();
        return {
            name,
            kind: ts.SyntaxKind[node.kind],
            path: source.fileName,
            range: range(node),
            commentRange: comment ? range(comment) : null,
            signature: source.text.slice(node.getStart(source), end).trim().replace(/[;{]\s*$/, "").trim()
        };
    }
    for (const module of modules) {
        read(module.path);
        for (const binding of module.exports.filter(binding => binding.declarationTypeOnly)) {
            assert.equal(binding.status, "resolved");
            assert(binding.declarations.length > 0);
            // <lang><zh-CN>每个公开别名独立保留全部原声明，合并声明不能只取首项。</zh-CN><en>Each public alias retains all original declarations independently; merged declarations cannot collapse to the first item.</en></lang>
            const declarations = [];
            for (const location of binding.declarations) {
                const { source } = read(location.path);
                let original;
                /**
                 * @lang zh-CN 按位置、种类和原名定位唯一声明。
                 * @lang en Locates the declaration by position, kind and original name.
                 */
                function find(node) {
                    const position = source.getLineAndCharacterOfPosition(node.getStart(source));
                    if (position.line + 1 === location.line && position.character + 1 === location.column && ts.SyntaxKind[node.kind] === location.kind && node.name?.getText(source) === binding.declarationName)
                        original = node;
                    ts.forEachChild(node, find);
                }
                ts.forEachChild(source, find);
                assert(original, "Missing original type declaration.");
                const expected = describe(original, source, binding.name);
                const members = [];
                /**
                 * @lang zh-CN 逐物理类型成员递归，匿名类型容器不会隐藏成员。
                 * @lang en Visits every physical member without hiding members inside anonymous containers.
                 */
                function visit(node, parent) {
                    let next = parent;
                    if (memberKinds.has(node.kind)) {
                        const member = describe(node, source, node.name?.getText(source) ?? ts.SyntaxKind[node.kind]);
                        member.parentRange = parent;
                        members.push(member);
                        next = member.range;
                        total++;
                        assert(total <= 20000, "Type inventory resource limit exceeded.");
                    }
                    ts.forEachChild(node, child => visit(child, next));
                }
                ts.forEachChild(original, child => visit(child, expected.range));
                declarations.push({ ...expected, members });
                total++;
                assert(total <= 20000, "Type inventory resource limit exceeded.");
            }
            bindings.push({ module: module.path, name: binding.name, declarations });
        }
    }
    return { bindings, sources: [...sources].map(([path, record]) => ({ path, sha256: record.sha256 })) };
}
/**
 * @lang zh-CN 按原声明逐项审核本次实际类型节点，不用有效schema或根计数掩盖成员缺口。
 * @lang en Audits actual type nodes against original declarations, preventing valid schemas or root counts from concealing missing members.
 * @param {object} input <lang><zh-CN>独立expected及已验证extraction/map。</zh-CN><en>Independent expectations and validated extraction/map.</en></lang>
 * @returns {object} <lang><zh-CN>明确的根/成员结果和缺口。</zh-CN><en>Explicit root/member results and gaps.</en></lang>
 */
export function verifyTypeApiProjection({ expected, extraction, map }) {
    const roots = [], members = [];
    for (const binding of expected.bindings) {
        // <lang><zh-CN>公开入口及名限定允许的根ID，子节点只能来自该根的实际父项链。</zh-CN><en>The public entry and name delimit root IDs; children must belong to the root's actual parent chain.</en></lang>
        const actual = extraction.modules.find(module => module.path === binding.module)?.exports.find(item => item.name === binding.name);
        const rootNodes = actual?.symbolIds.map(id => extraction.symbols.find(node => node.id === id)).filter(Boolean) ?? [];
        for (const declaration of binding.declarations) {
            const matches = rootNodes.filter(node => node.name === binding.name && node.source.path === declaration.path && isDeepStrictEqual(node.source.range, declaration.range));
            const root = matches.length === 1 ? matches[0] : undefined;
            roots.push({ ...check(declaration, root), module: binding.module, binding: binding.name });
            if (root && (!root.exported || root.parentId || root.metadata?.modulePath !== binding.module))
                roots.at(-1).gaps.push("root-scope-mismatch");
            // <lang><zh-CN>每个物理成员均进入结果，未生成的匿名分支保留明确缺口。</zh-CN><en>Every physical member enters the result; ungenerated anonymous branches remain explicit gaps.</en></lang>
            const descendants = [];
            if (root)
                descendants.push(root);
            for (let index = 0; index < descendants.length; index++) {
                assert(descendants.length <= 20000, "Type projection resource limit exceeded.");
                const node = descendants[index];
                descendants.push(...extraction.symbols.filter(child => child.parentId === node.id && !descendants.some(existing => existing.id === child.id)));
            }
            for (const member of declaration.members) {
                const nodes = descendants.filter(node => node.name === member.name && node.source.path === member.path && isDeepStrictEqual(node.source.range, member.range));
                const node = nodes.length === 1 ? nodes[0] : undefined;
                const parent = node ? descendants.find(candidate => candidate.id === node.parentId) : undefined;
                const result = check(member, node);
                if (node && (parent?.source.path !== member.path || !isDeepStrictEqual(parent?.source.range, member.parentRange)))
                    result.gaps.push("parent-mismatch");
                members.push({ ...result, module: binding.module, binding: binding.name });
            }
            if (rootNodes.length !== binding.declarations.length)
                roots.at(-1).gaps.push("root-declaration-count");
        }
    }
    /**
     * @lang zh-CN 核实际注释、明确两语、原签名及AST/地图范围，缺值不按同名占位接受。
     * @lang en Checks actual comments, explicit locales, original signatures and AST/map ranges, refusing same-name placeholders.
     * @param {object} declaration <lang><zh-CN>独立声明期望。</zh-CN><en>Independent declaration expectation.</en></lang>
     * @param {object} [node] <lang><zh-CN>实际生成节点。</zh-CN><en>Actually generated node.</en></lang>
     * @returns {object} <lang><zh-CN>节点及缺口。</zh-CN><en>Node result and gaps.</en></lang>
     */
    function check(declaration, node) {
        const gaps = [];
        if (!node)
            gaps.push("missing-or-ambiguous-declaration");
        else {
            // <lang><zh-CN>声明文件中的类型节点保留type-only，不提升为运行时发射证明。</zh-CN><en>Type nodes remain type-only, without promotion to runtime-emission proof.</en></lang>
            if (node.classification !== "type-only")
                gaps.push("classification-mismatch");
            if (node.signature !== declaration.signature)
                gaps.push("signature-mismatch");
            if (!declaration.commentRange || !isDeepStrictEqual(node.comment?.range, declaration.commentRange))
                gaps.push("source-comment-mismatch");
            const description = node.comment?.i18n?.fields?.description;
            const localized = description?.localizedText;
            if (!localized?.en || !localized?.["zh-CN"] || localized.en === localized["zh-CN"] || !["en", "zh-CN"].every(locale => description.blocks?.some(block => block.locale === locale)))
                gaps.push("missing-explicit-locales");
            const entries = map.entries.filter(entry => entry.symbolId === node.id);
            // <lang><zh-CN>当前项目地图同时保留声明与注释两种来源，分别按角色和独立AST范围核验。</zh-CN><en>The project map retains declaration and comment references; verify each role against its independent AST range.</en></lang>
            const refs = entries.flatMap(entry => entry.sourceRefs.filter(ref => map.sources.find(source => source.id === ref.sourceId)?.path === declaration.path));
            for (const [detail, range] of [["declaration", declaration.range], ["documentation-comment", declaration.commentRange]]) {
                const matches = refs.filter(ref => ref.rangeSourceDetail === `typescript-native-ast:${detail}`);
                if (entries.length !== 1 || matches.length !== 1 || !range || !isDeepStrictEqual(matches[0].range, range) || !isDeepStrictEqual(matches[0].rangeConvention, { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }))
                    gaps.push("source-map-mismatch");
            }
        }
        return {
            name: declaration.name,
            path: declaration.path,
            range: declaration.range,
            ...(node ? { symbolId: node.id } : {}),
            gaps
        };
    }
    const rootGaps = roots.filter(row => row.gaps.length);
    const memberGaps = members.filter(row => row.gaps.length);
    return {
        bindings: expected.bindings.length,
        rootDeclarations: roots.length,
        members: members.length,
        verifiedRoots: roots.length - rootGaps.length,
        verifiedMembers: members.length - memberGaps.length,
        rootGaps: rootGaps.length,
        memberGaps: memberGaps.length,
        roots,
        membersResults: members,
        complete: roots.length > 0 && rootGaps.length === 0 && memberGaps.length === 0,
        runtimeStateVerified: false
    };
}
