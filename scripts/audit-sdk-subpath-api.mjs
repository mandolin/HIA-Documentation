/**
 * @file
 * @lang zh-CN 通过通用0.4项目生产器核SDK显式子入口，源码/发行条件与完整物理成员分别验收。
 * @lang en Audits explicit SDK subpaths through the generic 0.4 project producer, checking source/distribution conditions and complete physical members separately.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runDocumentationProducer } from "../packages/plugin-sdk/dist/index.js";
import { validateHiaDocument } from "../packages/core/dist/index.js";
import { validateDocSourceMap } from "../packages/source-linkage/dist/index.js";
import { getOfficialTsDocProjectProfile } from "../packages/profiles/dist/index.js";
import { auditRequiredPackages } from "./audit-required-package-api.mjs";
import { verifyProjectApiProjection, assertPublicRootOmission } from "./lib/core-package-api.mjs";
import { collectTypeApiExpectations, verifyTypeApiProjection } from "./lib/type-api-projection.mjs";
/**
 * @lang zh-CN 从固定审核清单选择SDK原始子模块，实际运行领域生产器并逐字段/成员/表达式复核。
 * @lang en Selects original SDK submodules from the fixed audit scope, runs the actual domain producer and verifies fields, members and expressions.
 * @param {string} workspaceRoot <lang><zh-CN>当前主仓所属容器。</zh-CN><en>Container owning this main repository.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>本次结果和唯一输出，不代表全部包或页面完成。</zh-CN><en>This run's result and unique output, without full-package or page acceptance.</en></lang>
 */
export async function auditSdkSubpathApi(workspaceRoot) {
    // <lang><zh-CN>固定本工具所属主仓及调用方容器，所有后续路径必须归属于二者。</zh-CN><en>Fix this tool's main repository and caller container, which own every subsequent path.</en></lang>
    const main = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
    const container = fs.realpathSync(workspaceRoot);
    assert.equal(fs.realpathSync(path.join(container, "main-repo")), main);
    // <lang><zh-CN>加载固定的一方生产适配器，目标SDK模块仅作为静态输入。</zh-CN><en>Load the fixed first-party producer adapter, using target SDK modules only as static inputs.</en></lang>
    const producer = path.join(container, "HIA/hia-tsdoc/packages/tsdoc-producer/src/index.mjs");
    assert.equal(fs.realpathSync(producer), producer);
    const { tsdocProjectProducer } = await import(pathToFileURL(producer));
    // <lang><zh-CN>独立清单保留发行条件，来源去重后得到两个待生成模块。</zh-CN><en>The independent inventory retains distribution conditions; deduplicated sources identify the two production modules.</en></lang>
    const inventory = auditRequiredPackages(container);
    const sdk = inventory.packages.find(pack => pack.name === "@hia-doc/plugin-sdk");
    assert(sdk?.sourceMappings?.length);
    const sources = new Set(sdk.sourceMappings.map(item => item.source));
    const modules = sdk.modules.filter(module => sources.has(module.path));
    assert.equal(modules.length, sources.size);
    // <lang><zh-CN>验收AST与生产器独立读取，显式选择相同的0.4语法范围。</zh-CN><en>The acceptance AST and producer read independently, explicitly selecting the same 0.4 syntax scope.</en></lang>
    const expected = collectTypeApiExpectations(main, modules, { extractionVersion: "0.4.0-draft" });
    const profile = getOfficialTsDocProjectProfile("0.4.0-draft");
    // <lang><zh-CN>输出只在主仓独占dist，原始SDK模块不导入、不执行。</zh-CN><en>Output owns a unique main-repository dist directory; original SDK modules are never imported or evaluated.</en></lang>
    const dist = path.join(main, "dist");
    fs.mkdirSync(dist, { recursive: true });
    assert.equal(fs.realpathSync(dist), dist);
    const output = fs.mkdtempSync(path.join(dist, "sdk-subpath-api-"));
    // <lang><zh-CN>一次SDK请求实际生成四工件，仅成功清单可供下面读取。</zh-CN><en>One SDK request actually generates four artifacts; only its successful manifest authorizes reads below.</en></lang>
    const result = await runDocumentationProducer(tsdocProjectProducer, { workspaceRoot: main, outputDirectory: output, inputs: [{ kind: "typescript-project", paths: modules.map(module => module.path), artifactBasePath: "sdk", title: "SDK subpath APIs" }], profileIds: ["ts-jsdoc-bridge"], options: { extractionVersion: "0.4.0-draft" } });
    assert.equal(result.status, "success", JSON.stringify(result.diagnostics));
    assert.equal(result.artifacts.length, 4);
    // <lang><zh-CN>本次工件摘要累计到报告，不保留绝对工作区路径。</zh-CN><en>Accumulate this run's artifact digests in the report without absolute workspace paths.</en></lang>
    const files = [];
    /**
     * @lang zh-CN 仅读取本次成功清单的唯一工件，精确核契约和物理来源。
     * @lang en Reads only unique artifacts in this successful manifest, checking exact contracts and physical provenance.
     */
    function read(kind) {
        // <lang><zh-CN>契约种类必须唯一，并与已选规范的消费/生产角色精确对应。</zh-CN><en>Each contract kind must be unique and match the selected profile's consuming/producing role exactly.</en></lang>
        const matches = result.artifacts.filter(item => item.kind === kind);
        assert.equal(matches.length, 1);
        const item = matches[0];
        assert(profile.contracts.some(ref => ref.name === item.contract && ref.version === item.contractVersion && ref.role === (kind === "tsdoc-extraction" ? "consumes" : "produces")));
        assert(!path.isAbsolute(item.path) && !/[\\:%?#]/.test(item.path) && !item.path.split("/").some(part => !part || part === "." || part === ".."));
        // <lang><zh-CN>读取本次输出的普通非链接文件，物理字节用于摘要及JSON校验。</zh-CN><en>Read a regular unlinked file owned by this output, using physical bytes for hashing and JSON validation.</en></lang>
        const file = path.join(output, item.path);
        assert.equal(fs.realpathSync(file), file);
        const state = fs.lstatSync(file);
        assert(state.isFile() && !state.isSymbolicLink() && state.nlink === 1);
        const bytes = fs.readFileSync(file);
        files.push({ kind, path: item.path, sha256: createHash("sha256").update(bytes).digest("hex") });
        return JSON.parse(bytes);
    }
    // <lang><zh-CN>四张实际工件分别验证核心协议及独立投影，不能只验证汇总计数。</zh-CN><en>Validate core protocols and independent projections across all four actual artifacts instead of relying on counts.</en></lang>
    const extraction = read("tsdoc-extraction");
    const bridge = read("ts-jsdoc-bridge");
    const document = read("hia-document");
    const map = read("doc-source-map");
    assert.deepEqual(validateHiaDocument(document), []);
    assert.deepEqual(validateDocSourceMap(map), []);
    const projection = verifyProjectApiProjection({ modules, extraction, bridge, document });
    const checked = verifyTypeApiProjection({ expected, extraction, map });
    assert.equal(checked.complete, true, "SDK physical type or expression coverage has gaps.");
    // <lang><zh-CN>结构包装没有编造正文，物理声明则逐项要求不同的中英原生正文。</zh-CN><en>Structural wrappers have no fabricated prose; every physical declaration requires distinct native Chinese and English prose.</en></lang>
    const documented = extraction.symbols.filter(node => !node.metadata.typeExpression);
    for (const node of documented) {
        const text = node.comment?.i18n?.fields?.description?.localizedText;
        assert(text?.en && text?.["zh-CN"] && text.en !== text["zh-CN"], "SDK declaration is missing distinct bilingual prose.");
    }
    // <lang><zh-CN>生成结束再核入口、发行分支和源字节，不能将不同批输入合成一个成功结果。</zh-CN><en>Recheck entries, distribution branches and source bytes after generation to prevent mixed-input success claims.</en></lang>
    const hash = file => createHash("sha256").update(fs.readFileSync(path.join(main, file))).digest("hex");
    for (const source of expected.sources)
        assert.equal(hash(source.path), source.sha256);
    for (const entry of sdk.sourceMappings) {
        assert.equal(hash(entry.source), entry.sourceSha256);
        assert.equal(hash(entry.target), entry.targetSha256);
    }
    assert.equal(hash("packages/plugin-sdk/package.json"), sdk.manifestSha256);
    // <lang><zh-CN>本子集完整与全项目覆盖分开记录，HEAD仅作参考，实读字节由摘要固定。</zh-CN><en>Record subset completeness separately from full-project coverage, with HEAD as a reference and digests binding read bytes.</en></lang>
    const report = { description: "SDK子入口实际0.4生成及源码/发行/完整物理成员审核", sourceHead: sdk.sourceHead, sourceMappings: sdk.sourceMappings, sources: expected.sources, files, projection, documentedNodes: documented.length, ...checked, coverageComplete: false, releaseProof: false };
    assertPublicRootOmission({ report, extraction, bridge, document, map }, container);
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    return { report, output: path.relative(main, output).split(path.sep).join("/") };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    assert(args.length === 2 && args[0] === "--workspace-root");
    const { report, output } = await auditSdkSubpathApi(path.resolve(args[1]));
    console.log(JSON.stringify({ bindings: report.projection.bindings, typeRoots: report.bindings, members: report.members, expressions: report.expressions, documentedNodes: report.documentedNodes, complete: report.complete, output }));
}
