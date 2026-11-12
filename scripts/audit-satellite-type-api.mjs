/**
 * @file
 * @lang zh-CN 通过已确认通用项目生产链审核卫星类型声明，未覆盖匿名成员保持严格失败。
 * @lang en Audits satellite declaration APIs through the confirmed generic project producer, retaining strict failures for uncovered anonymous members.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runDocumentationProducer } from "../packages/plugin-sdk/dist/index.js";
import { validateHiaDocument } from "../packages/core/dist/index.js";
import { validateDocSourceMap } from "../packages/source-linkage/dist/index.js";
import { getOfficialTsDocProjectProfile } from "../packages/profiles/dist/index.js";
import { auditRequiredPackages } from "./audit-required-package-api.mjs";
import { verifyProjectApiProjection, assertPublicRootOmission } from "./lib/core-package-api.mjs";
import { collectTypeApiExpectations, verifyTypeApiProjection } from "./lib/type-api-projection.mjs";
import {collectDeclarationValueExpectations,verifyDeclarationValueProjection} from "./lib/declaration-value-projection.mjs";
/**
 * @lang zh-CN 逐owner在授权根内执行真实项目生产器，将本次四工件复制到主仓独立审核目录。
 * @lang en Runs the actual project producer within each authorized owner and copies the four current artifacts into an isolated main-repository audit directory.
 * @param {string} workspaceRoot <lang><zh-CN>当前main-repo所属容器。</zh-CN><en>Container owning this main repository.</en></lang>
 * @param {object} [options] <lang><zh-CN>packageNames显式选择已登记包，省略审核全部必要包；includeDeclarationValues增加声明值根审核并选0.4，省略保留原0.3纯类型范围。</zh-CN><en>packageNames explicitly selects registered packages, defaulting to all required packages; includeDeclarationValues adds declaration-value roots with 0.4, otherwise retaining the original 0.3 pure-type scope.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>逐绑定与成员结果，完整状态只在无缺口时为true。</zh-CN><en>Per-binding/member results, complete only when no gaps remain.</en></lang>
 * @throws {Error} <lang><zh-CN>来源、生产、协议或源字节不一致。</zh-CN><en>Inconsistent sources, production, protocols or source bytes.</en></lang>
 */
export async function auditSatelliteTypeApi(workspaceRoot, options = {}) {
    // <lang><zh-CN>工具、输入容器和输出根固定为同一主仓，参数不替换生产器实现。</zh-CN><en>Tools, input container and output root belong to this main repository; arguments cannot substitute producer implementations.</en></lang>
    const main = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
    const container = fs.realpathSync(workspaceRoot);
    assert.equal(fs.realpathSync(path.join(container, "main-repo")), main);
    // <lang><zh-CN>包选择贯穿原清单读取，当前owner之外的仓库仍受同一链接及归属保护。</zh-CN><en>Carry package selection into the original inventory read, retaining the same link and ownership protection for every repository.</en></lang>
    const inventory = auditRequiredPackages(container, {packageNames: options.packageNames});
    const producerFile = path.join(container, "HIA/hia-tsdoc/packages/tsdoc-producer/src/index.mjs");
    assert.equal(fs.realpathSync(producerFile), producerFile);
    const { tsdocProjectProducer } = await import(pathToFileURL(producerFile));
    // <lang><zh-CN>新增维度须显式选择，旧调用方继续原0.3身份及纯类型判据。</zh-CN><en>The additional dimension is explicit; legacy callers retain 0.3 identities and pure-type criteria.</en></lang>
    const version = options.includeDeclarationValues ? "0.4.0-draft" : "0.3.0-draft";
    const profile = getOfficialTsDocProjectProfile(version);
    const selected = module => options.includeDeclarationValues ? /\.d\.[cm]?ts$/.test(module.path) : module.exports.some(binding => binding.declarationTypeOnly);
    const packages = inventory.packages.filter(pack => pack.owner !== "main-repo" && pack.modules.some(selected));
    const dist = path.join(main, "dist");
    fs.mkdirSync(dist, { recursive: true });
    assert.equal(fs.realpathSync(dist), dist);
    const output = fs.mkdtempSync(path.join(dist, "satellite-type-api-"));
    const groups = [];
    for (const owner of [...new Set(packages.map(pack => pack.owner))]) {
        // <lang><zh-CN>源权限按owner根收窄，编译器不能借文档请求读取业务仓或私有工作区。</zh-CN><en>Source authority narrows to the owner root; documentation requests cannot read business repositories or the private work zone.</en></lang>
        const ownerRoot = path.join(container, "HIA", owner);
        assert.equal(fs.realpathSync(ownerRoot), ownerRoot);
        const owned = packages.filter(pack => pack.owner === owner);
        const modules = owned.flatMap(pack => pack.modules.filter(selected));
        const expected = collectTypeApiExpectations(ownerRoot, modules, {extractionVersion:version});
        const values = options.includeDeclarationValues ? collectDeclarationValueExpectations(ownerRoot, modules) : undefined;
        const ownerDist = path.join(ownerRoot, "dist");
        fs.mkdirSync(ownerDist, { recursive: true });
        assert.equal(fs.realpathSync(ownerDist), ownerDist);
        const generated = fs.mkdtempSync(path.join(ownerDist, "declaration-api-"));
        const result = await runDocumentationProducer(tsdocProjectProducer, {
            options: {extractionVersion:version},
            workspaceRoot: ownerRoot, outputDirectory: generated, inputs: [
                {
                    kind: "typescript-project", paths: modules.map(module => module.path), artifactBasePath: "types", title: "Declared package APIs"
                }
            ], profileIds: ["ts-jsdoc-bridge"]
        });
        assert.equal(result.status, "success", JSON.stringify(result.diagnostics));
        assert.equal(result.artifacts.length, 4);
        const groupDirectory = `group-${groups.length}`;
        fs.mkdirSync(path.join(output, groupDirectory));
        const files = [];
        /**
         * @lang zh-CN 仅复制本次成功清单中的规范文件并按profile核协议版本。
         * @lang en Copies only canonical files registered in this successful manifest, checking protocol versions against the profile.
         * @param {string} kind <lang><zh-CN>唯一工件类别。</zh-CN><en>Unique artifact kind.</en></lang>
         * @returns {object} <lang><zh-CN>实际生成JSON。</zh-CN><en>Actually produced JSON.</en></lang>
         */
        function read(kind) {
            const matches = result.artifacts.filter(file => file.kind === kind);
            assert.equal(matches.length, 1);
            const artifact = matches[0];
            assert(!path.isAbsolute(artifact.path) && !/[\\:%?#]/.test(artifact.path) && !artifact.path.split("/").some(part => !part || part === "." || part === ".."));
            const role = kind === "tsdoc-extraction" ? "consumes" : "produces";
            assert(profile.contracts.some(ref => ref.name === artifact.contract && ref.version === artifact.contractVersion && ref.role === role));
            const file = path.join(generated, artifact.path);
            assert.equal(fs.realpathSync(file), file);
            const state = fs.lstatSync(file);
            assert(state.isFile() && !state.isSymbolicLink() && state.nlink === 1);
            const bytes = fs.readFileSync(file);
            const relative = path.posix.join(groupDirectory, artifact.path);
            fs.mkdirSync(path.dirname(path.join(output, relative)), { recursive: true });
            fs.writeFileSync(path.join(output, relative), bytes, { flag: "wx" });
            files.push({ kind, path: relative, sha256: createHash("sha256").update(bytes).digest("hex") });
            return JSON.parse(bytes);
        }
        const extraction = read("tsdoc-extraction");
        const bridge = read("ts-jsdoc-bridge");
        const document = read("hia-document");
        const map = read("doc-source-map");
        assert.deepEqual(validateHiaDocument(document), []);
        assert.deepEqual(validateDocSourceMap(map), []);
        assert.equal(bridge.artifact, null);
        assertPublicRootOmission({ extraction, bridge, document, map }, container);
        const projection = verifyProjectApiProjection({ modules, extraction, bridge, document });
        const checked = verifyTypeApiProjection({ expected, extraction, map });
        const valueAudit = values ? verifyDeclarationValueProjection({expected:values,extraction,map}) : undefined;
        // <lang><zh-CN>原声明、入口和manifest均核生成后的实际字节，HEAD仅记录仓库参考点。</zh-CN><en>Recheck original declarations, entries and manifests after production; HEAD records a repository reference only.</en></lang>
        for (const source of expected.sources)
            assert.equal(createHash("sha256").update(fs.readFileSync(path.join(ownerRoot, source.path))).digest("hex"), source.sha256, "Type source changed during production.");
        for (const source of values?.sources ?? [])
            assert.equal(createHash("sha256").update(fs.readFileSync(path.join(ownerRoot, source.path))).digest("hex"), source.sha256, "Value source changed during production.");
        for (const pack of owned)
            assert.equal(createHash("sha256").update(fs.readFileSync(path.join(ownerRoot, pack.directory, "package.json"))).digest("hex"), pack.manifestSha256, "Type package manifest changed during production.");
        groups.push({
            owner,
            packages: owned.map(pack => ({ name: pack.name, sourceHead: pack.sourceHead, manifestSha256: pack.manifestSha256 })),
            sources: expected.sources,
            files,
            projection,
            ...checked,
            ...(valueAudit ? {valueSources:values.sources,valueAudit,complete:checked.complete && valueAudit.complete} : {})
        });
    }
    const report = {
        description: "卫星独立类型实际生成与完整物理成员审核，未生成成员保持硬缺口",
        groups,
        packages: packages.length,
        bindings: groups.reduce((sum, group) => sum + group.bindings, 0),
        rootDeclarations: groups.reduce((sum, group) => sum + group.rootDeclarations, 0),
        members: groups.reduce((sum, group) => sum + group.members, 0),
        verifiedRoots: groups.reduce((sum, group) => sum + group.verifiedRoots, 0),
        verifiedMembers: groups.reduce((sum, group) => sum + group.verifiedMembers, 0),
        rootGaps: groups.reduce((sum, group) => sum + group.rootGaps, 0),
        memberGaps: groups.reduce((sum, group) => sum + group.memberGaps, 0),
        expressions: groups.reduce((sum, group) => sum + group.expressions, 0),
        verifiedExpressions: groups.reduce((sum, group) => sum + group.verifiedExpressions, 0),
        expressionGaps: groups.reduce((sum, group) => sum + group.expressionGaps, 0),
        complete: groups.length > 0 && groups.every(group => group.complete),
        runtimeStateVerified: false,
        coverageComplete: false,
        releaseProof: false,
        ...(options.includeDeclarationValues ? {
            declarationValues: {
                scope: "declaration-value-roots",
                bindings: groups.reduce((sum, group) => sum + group.valueAudit.bindings, 0),
                rootDeclarations: groups.reduce((sum, group) => sum + group.valueAudit.rootDeclarations, 0),
                verifiedRoots: groups.reduce((sum, group) => sum + group.valueAudit.verifiedRoots, 0),
                rootGaps: groups.reduce((sum, group) => sum + group.valueAudit.rootGaps, 0),
                complete: groups.every(group => group.valueAudit.complete),
                nestedTypeMembersVerified: false,
                runtimeStateVerified: false
            }
        } : {})
    };
    assertPublicRootOmission(report, container);
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    return { report, output: path.relative(main, output).split(path.sep).join("/") };
}
// <lang><zh-CN>严格入口在任何根/成员缺口时非零退出，inspect只允许查看部分结果。</zh-CN><en>The strict entry exits nonzero for any root/member gaps; inspect permits partial-result inspection only.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    assert(args.length >= 2 && args.length <= 4 && args[0] === "--workspace-root" && new Set(args.slice(2)).size === args.length - 2 && args.slice(2).every(arg=>["--inspect","--declaration-values"].includes(arg)));
    const { report, output } = await auditSatelliteTypeApi(path.resolve(args[1]),{includeDeclarationValues:args.includes("--declaration-values")});
    console.log(JSON.stringify({
        packages: report.packages,
        bindings: report.bindings,
        members: report.members,
        verifiedRoots: report.verifiedRoots,
        verifiedMembers: report.verifiedMembers,
        rootGaps: report.rootGaps,
        memberGaps: report.memberGaps,
        expressions: report.expressions,
        expressionGaps: report.expressionGaps,
        complete: report.complete,
        output,
        ...(report.declarationValues ? {declarationValues:report.declarationValues} : {})
    }));
    if (!report.complete && !args.includes("--inspect"))
        process.exitCode = 1;
}
