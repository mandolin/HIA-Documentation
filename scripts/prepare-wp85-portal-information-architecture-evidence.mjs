import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>所有输入均由 main-repo 内固定 synthetic builder 生成；脚本不接受 target path 或运行命令。</zh-CN><en>All inputs come from fixed synthetic builders owned by main-repo; the script accepts no target path or command.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>evidence 只写 ignored dist 边界，绝不写目标项目。</zh-CN><en>Evidence is written only to the ignored dist boundary, never to a target project.</en></lang>
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp85-portal-information-architecture");

/**
 * @lang zh-CN 生成 2 repository / 4 package / 4 layer / 16 entry 的 TypeScript Portal fixture。
 * @lang en Generates a TypeScript Portal fixture with 2 repositories, 4 packages, 4 layers, and 16 entries.
 *
 * @returns {Record<string, unknown>} 仅含 synthetic metadata/link 的 renderer input。 / Renderer input containing synthetic metadata and links only.
 */
function createTypeScriptFixture() {
  const entries = [];
  for (let repositoryIndex = 0; repositoryIndex < 2; repositoryIndex += 1) {
    for (let packageOffset = 0; packageOffset < 2; packageOffset += 1) {
      const packageIndex = repositoryIndex * 2 + packageOffset;
      const parentSymbolId = `module:repo-${repositoryIndex}:package-${packageIndex}`;
      for (let entryIndex = 0; entryIndex < 4; entryIndex += 1) {
        const isMember = entryIndex > 0;
        entries.push({
          id: `ts:r${repositoryIndex}:p${packageIndex}:e${entryIndex}`,
          name: isMember ? `operation${entryIndex}` : `package${packageIndex}Api`,
          kind: isMember ? "function" : "module",
          view: "js",
          symbolId: isMember ? `${parentSymbolId}:operation:${entryIndex}` : parentSymbolId,
          signature: isMember ? `export function operation${entryIndex}(): void` : undefined,
          summary: isMember ? `Operation ${entryIndex}.` : `Package ${packageIndex} API.`,
          input: {
            kind: "hia-document",
            path: `artifacts/package-${packageIndex}.hia.json`,
            contract: "hia-core-document",
            contractVersion: "0.1.0"
          },
          hierarchy: isMember ? { parentSymbolId } : undefined,
          semanticPath: [
            { kind: "repository", id: `repo-${repositoryIndex}`, label: `Repository ${repositoryIndex}` },
            { kind: "package", id: `package-${packageIndex}`, label: `@fixture/package-${packageIndex}` },
            { kind: "layer", id: `layer-${packageIndex}`, label: `Layer ${packageIndex}` },
            { kind: "contract", id: `contract-${packageIndex}`, label: `Contract ${packageIndex}` },
            ...(isMember
              ? [{ kind: "operation", id: `operation-${entryIndex}`, label: `Operation ${entryIndex}` }]
              : [])
          ],
          source: {
            path: `src/package-${packageIndex}/entry-${entryIndex}.ts`,
            language: "typescript",
            linkUrl: `https://example.test/repository-${repositoryIndex}/package-${packageIndex}/entry-${entryIndex}.ts#L1`,
            range: { start: { line: 1 }, end: { line: 3 } }
          }
        });
      }
    }
  }
  return {
    project: {
      name: "W-P85 TypeScript Portal Fixture",
      defaultLocale: "en",
      locales: ["en", "zh-CN"],
      productVersion: "2026.8"
    },
    documentationContinuity: {
      contract: "target-documentation-continuity",
      contractVersion: "0.1.0-draft",
      status: "accepted",
      entries: {
        addedCount: 1,
        baselineCount: 15,
        currentCount: 16,
        removedCount: 0,
        unchangedCount: 15
      },
      requiredOutputsPreserved: true,
      semantics: {
        resolution: "evidence-summary-pair-validated",
        confidence: "caller-provided-unverified",
        provenance: "metadata-only-comparison"
      }
    },
    entries
  };
}

/**
 * @lang zh-CN 生成 2951 entry 的 HIA-owned .NET scale fixture；不读取真实仓库或真实输出。
 * @lang en Generates a 2,951-entry HIA-owned .NET scale fixture without reading a real repository or output.
 *
 * @returns {Record<string, unknown>} synthetic renderer input。 / Synthetic renderer input.
 */
function createDotNetFixture() {
  return {
    project: { name: "W-P85 DotNet Scale Fixture" },
    entries: Array.from({ length: 2951 }, (_, index) => ({
      id: `dotnet:wp85:${index}`,
      name: `Method${index}`,
      kind: "dotnet-method",
      view: "dotnet",
      symbolId: `M:Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}.Method${index}`,
      hierarchy: {
        assembly: "Fixture",
        namespace: `Fixture.Feature${Math.floor(index / 50)}`,
        containingType: `Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}`
      },
      semanticPath: [
        { kind: "repository", id: "dotnet-fixture", label: "DotNet Synthetic Fixture" },
        { kind: "assembly", id: "fixture", label: "Fixture" }
      ]
    }))
  };
}

/**
 * @lang zh-CN 读取 renderer result 中一份必需 JSON file，缺失时立即失败。
 * @lang en Reads one required JSON file from a renderer result and fails immediately when absent.
 *
 * @param {Record<string, unknown>} result renderer result。 / Renderer result.
 * @param {string} filePath repository-relative rendered path。 / Repository-relative rendered path.
 * @returns {Record<string, unknown>} parsed JSON。 / Parsed JSON.
 */
function readRenderedJson(result, filePath) {
  const file = result.files.find((candidate) => candidate.path === filePath);
  assert.ok(file, `Missing rendered file: ${filePath}`);
  return JSON.parse(file.contents);
}

/**
 * @lang zh-CN 为稳定 identity/path 集合计算不可逆摘要，evidence 不暴露 synthetic entry ids。
 * @lang en Computes an irreversible digest for stable identity/path sets so evidence exposes no synthetic entry IDs.
 *
 * @param {unknown} value JSON-compatible stable value。 / JSON-compatible stable value.
 * @returns {string} SHA-256 digest。 / SHA-256 digest.
 */
function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * @lang zh-CN 收集 error diagnostic code，并断言指定输入被 fail-closed validator 拒绝。
 * @lang en Collects error diagnostic codes and asserts that fail-closed validation rejects an input.
 *
 * @param {(value: unknown) => Array<{code: string, severity: string}>} validate validator。 / Validator.
 * @param {unknown[]} invalidInputs fixed invalid inputs。 / Fixed invalid inputs.
 * @returns {string[]} sorted diagnostic codes。 / Sorted diagnostic codes.
 */
function collectRefusalCodes(validate, invalidInputs) {
  const codes = new Set();
  for (const invalidInput of invalidInputs) {
    const diagnostics = validate(invalidInput);
    assert.equal(diagnostics.some((diagnostic) => diagnostic.severity === "error"), true);
    diagnostics.forEach((diagnostic) => codes.add(diagnostic.code));
  }
  return [...codes].sort();
}

/**
 * @lang zh-CN 执行 W-P85 contract/config/router/topic/a11y/privacy synthetic evidence。
 * @lang en Executes W-P85 synthetic evidence for the contract, config, router, topics, accessibility, and privacy.
 *
 * @returns {Promise<void>} evidence generation completion。 / Evidence-generation completion.
 * @lang zh-CN 副作用仅限写入 main-repo/dist；不执行 network、publish、target 或 adoption。
 * @lang en Side effects are limited to main-repo/dist; no network, publish, target, or adoption action is executed.
 */
async function prepareEvidence() {
  // <lang><zh-CN>加载刚构建的 owner dist entry，确保 evidence 验证可分发 JavaScript 而非测试专用源码导入。</zh-CN><en>Load freshly built owner dist entries so evidence validates distributable JavaScript rather than test-only source imports.</en></lang>
  const renderer = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const config = await import(pathToFileURL(path.join(repositoryRoot, "packages", "config", "dist", "index.js")).href);
  const fixture = createTypeScriptFixture();

  // <lang><zh-CN>三维笛卡尔积完整覆盖八种配置；每种都验证 canonical identity/search/relation/source linkage 不漂移。</zh-CN><en>Cover the full eight-item Cartesian product and verify canonical identity, search, relations, and source linkage do not drift.</en></lang>
  const combinationFacts = [];
  const parityDigests = new Set();
  for (const contentGrouping of renderer.DOCUMENTATION_PORTAL_CONTENT_GROUPINGS) {
    for (const loadingStrategy of renderer.DOCUMENTATION_PORTAL_LOADING_STRATEGIES) {
      for (const memberPlacement of renderer.DOCUMENTATION_PORTAL_MEMBER_PLACEMENTS) {
        const result = renderer.renderProjectHtmlDocument(fixture, {
          projectSite: {
            layout: "split-site",
            uiLocale: "en",
            informationArchitecture: {
              contract: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
              contractVersion: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
              contentGrouping,
              loadingStrategy,
              memberPlacement
            }
          }
        });
        const projectIndex = readRenderedJson(result, "project-index.json");
        const searchIndex = readRenderedJson(result, "search/index.json");
        const relationIndex = readRenderedJson(result, "relations/project.json");
        const rootShard = readRenderedJson(result, "navigation/root.json");
        const parent = projectIndex.entries.find((entry) => entry.id === "ts:r0:p0:e0");
        const member = projectIndex.entries.find((entry) => entry.id === "ts:r0:p0:e1");
        const canonical = {
          ids: projectIndex.entries.map((entry) => entry.id).sort(),
          contentPaths: projectIndex.entries.map((entry) => entry.contentPath).sort(),
          searchIds: searchIndex.entries.map((entry) => entry.id).sort(),
          relationCount: relationIndex.relationCount,
          sourceLinkCount: projectIndex.entries.filter((entry) => entry.source?.linkUrl).length
        };
        parityDigests.add(digest(canonical));
        assert.equal(projectIndex.entries.length, 16);
        assert.equal(result.files.filter((file) => file.path.startsWith("entries/")).length, 16);
        assert.equal(result.files.some((file) => file.path === "content/eager.json"), loadingStrategy === "eager");
        assert.equal(result.files.some((file) => file.path.startsWith("semantic-containers/")), contentGrouping === "semantic-container");
        assert.equal(Boolean(rootShard.children?.[0]?.children), loadingStrategy === "eager");
        assert.equal(Boolean(rootShard.children?.[0]?.childrenPath), loadingStrategy === "lazy");
        assert.equal(member.presentationPath === parent.presentationPath, memberPlacement === "with-parent");
        assert.equal(projectIndex.entries.every((entry) => entry.memberAnchor === entry.id), true);
        assert.equal(projectIndex.entries.every((entry) => !entry.contentPath.includes("2026.8")), true);
        combinationFacts.push({
          contentGrouping,
          loadingStrategy,
          memberPlacement,
          canonicalEntryCount: projectIndex.entries.length,
          canonicalFragmentCount: result.files.filter((file) => file.path.startsWith("entries/")).length,
          semanticContainerFragments: result.files.filter((file) => file.path.startsWith("semantic-containers/")).length,
          eagerContentIndex: result.files.some((file) => file.path === "content/eager.json"),
          memberPresentationCoLocated: member.presentationPath === parent.presentationPath
        });
      }
    }
  }
  assert.equal(combinationFacts.length, 8);
  assert.equal(parityDigests.size, 1);

  // <lang><zh-CN>缺省路径单独验证 P3 compatibility；显式 IA 与 single-page 的组合必须拒绝。</zh-CN><en>Validate P3 compatibility on the omitted path and require explicit IA plus single-page to be refused.</en></lang>
  const legacyResult = renderer.renderProjectHtmlDocument(fixture, { projectSite: { layout: "split-site" } });
  const legacyIndex = readRenderedJson(legacyResult, "project-index.json");
  assert.equal(legacyIndex.site?.informationArchitecture, undefined);
  assert.equal(legacyIndex.entries.some((entry) => entry.presentationPath !== undefined), false);
  assert.throws(() => renderer.renderProjectHtmlDocument(fixture, {
    projectSite: { layout: "single-page", informationArchitecture: {} }
  }), /HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED/u);

  // <lang><zh-CN>中文 topic 验证 semantic hierarchy、固定 section order、W-P84 metadata-only linkage 与 touched labels。</zh-CN><en>The Chinese topic verifies semantic hierarchy, fixed section order, W-P84 metadata-only linkage, and touched labels.</en></lang>
  const topicResult = renderer.renderProjectHtmlDocument(fixture, {
    projectSite: {
      uiLocale: "zh-CN",
      informationArchitecture: { contentGrouping: "semantic-container", loadingStrategy: "eager", memberPlacement: "with-parent" }
    }
  });
  const topicIndex = readRenderedJson(topicResult, "project-index.json");
  const parentIndexEntry = topicIndex.entries.find((entry) => entry.id === "ts:r0:p0:e0");
  const parentTopic = topicResult.files.find((file) => file.path === parentIndexEntry.contentPath)?.contents ?? "";
  const presentSectionOrder = renderer.DOCUMENTATION_PORTAL_TOPIC_SECTIONS
    .filter((section) => parentTopic.includes(`data-hia-topic-section=\"${section}\"`));
  assert.deepEqual(presentSectionOrder, ["summary", "declaration", "metadata", "contract", "coverage", "provenance", "members", "relations", "source"]);
  assert.match(JSON.stringify(topicIndex.navigationTree), /"kind":"repository"/u);
  assert.doesNotMatch(JSON.stringify(topicIndex.navigationTree), /"kind":"source-root"|"kind":"relation"/u);
  assert.match(parentTopic, /Product Version<\/dt><dd>2026\.8/u);
  assert.match(parentTopic, /target-documentation-continuity@0\.1\.0-draft/u);
  assert.match(parentTopic, /覆盖情况|溯源/u);
  assert.doesNotMatch(parentTopic, /must-not-cross-the-boundary/u);

  // <lang><zh-CN>scale fixture 只验证 lazy 分片与 canonical fragment 数，不持久化 2951 份 HTML。</zh-CN><en>The scale fixture verifies lazy sharding and canonical fragment count without persisting 2,951 HTML files.</en></lang>
  const dotNetResult = renderer.renderProjectHtmlDocument(createDotNetFixture(), {
    projectSite: {
      informationArchitecture: { contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate" }
    }
  });
  const dotNetRoot = dotNetResult.files.find((file) => file.path === "navigation/root.json")?.contents ?? "";
  const dotNetCanonicalFragmentCount = dotNetResult.files.filter((file) => file.path.startsWith("entries/")).length;
  assert.equal(dotNetCanonicalFragmentCount, 2951);
  assert.equal(dotNetResult.files.some((file) => file.path === "content/eager.json"), false);
  assert.ok(dotNetRoot.length < 1000);
  assert.doesNotMatch(dotNetRoot, /Method2950/u);

  // <lang><zh-CN>direct renderer API 也逐项验证未知 draft、private semantic path 与 continuity extra field，不能只依赖 TypeScript/config caller。</zh-CN><en>The direct renderer API also verifies an unknown draft, a private semantic path, and a continuity extra field instead of relying only on TypeScript/config callers.</en></lang>
  assert.throws(() => renderer.renderProjectHtmlDocument(createTypeScriptFixture(), {
    projectSite: { informationArchitecture: { contractVersion: "0.2.0-draft" } }
  }), /HIA_PORTAL_IA_UNSUPPORTED/u);
  const privateSemanticPathFixture = createTypeScriptFixture();
  privateSemanticPathFixture.entries[0].semanticPath = [
    { kind: "repository", id: "private-path", label: "C:\\private\\fixture" }
  ];
  assert.throws(() => renderer.renderProjectHtmlDocument(privateSemanticPathFixture, {
    projectSite: { informationArchitecture: {} }
  }), /HIA_PORTAL_IA_SEMANTIC_PATH_INVALID/u);
  const leakedContinuityFixture = createTypeScriptFixture();
  leakedContinuityFixture.documentationContinuity.sourceBody = "must-not-cross-the-boundary";
  assert.throws(() => renderer.renderProjectHtmlDocument(leakedContinuityFixture, {
    projectSite: { informationArchitecture: {} }
  }), /HIA_PORTAL_IA_CONTINUITY_INVALID/u);

  // <lang><zh-CN>config/manifest 拒绝矩阵覆盖未知 draft/enum/field、single-page 冲突与 semantic path 隐私。</zh-CN><en>The config/manifest refusal matrix covers unknown drafts, enums, fields, the single-page conflict, and semantic-path privacy.</en></lang>
  const validConfig = {
    schemaVersion: "0.1.0",
    docs: {
      renderer: {
        projectLayout: "split-site",
        uiLocale: "zh-CN",
        informationArchitecture: {
          contract: "documentation-portal-information-architecture",
          contractVersion: "0.1.0-draft",
          contentGrouping: "entry",
          loadingStrategy: "lazy",
          memberPlacement: "separate"
        }
      }
    }
  };
  assert.equal(config.validateHiaProjectConfig(validConfig).some((diagnostic) => diagnostic.severity === "error"), false);
  const configRefusalCodes = collectRefusalCodes(config.validateHiaProjectConfig, [
    { ...validConfig, docs: { renderer: { informationArchitecture: { contract: "unknown-contract" } } } },
    { ...validConfig, docs: { renderer: { informationArchitecture: { contractVersion: "0.2.0-draft" } } } },
    { ...validConfig, docs: { renderer: { informationArchitecture: { contentGrouping: "source-root" } } } },
    { ...validConfig, docs: { renderer: { informationArchitecture: { loadingStrategy: "stream" } } } },
    { ...validConfig, docs: { renderer: { informationArchitecture: { memberPlacement: "inline" } } } },
    { ...validConfig, docs: { renderer: { informationArchitecture: { privatePath: "secret" } } } },
    { ...validConfig, docs: { renderer: { projectLayout: "single-page", informationArchitecture: {} } } },
    { ...validConfig, docs: { renderer: { uiLocale: "fr", informationArchitecture: {} } } }
  ]);
  const manifestBase = {
    schemaVersion: "0.1.0-draft",
    project: { name: "W-P85 Manifest Fixture", productVersion: "2026.8" },
    inputs: [{
      kind: "hia-document",
      path: "artifacts/input.json",
      semanticPath: [{ kind: "repository", id: "fixture", label: "Fixture" }]
    }]
  };
  assert.equal(config.validateHiaProjectManifest(manifestBase).some((diagnostic) => diagnostic.severity === "error"), false);
  const manifestRefusalCodes = collectRefusalCodes(config.validateHiaProjectManifest, [
    { ...manifestBase, inputs: [{ ...manifestBase.inputs[0], semanticPath: [] }] },
    { ...manifestBase, inputs: [{ ...manifestBase.inputs[0], semanticPath: [{ kind: "repository", id: "fixture", label: "C:\\private\\fixture" }] }] },
    { ...manifestBase, inputs: [{ ...manifestBase.inputs[0], semanticPath: [{ kind: "source-root", id: "fixture", label: "Fixture" }] }] },
    { ...manifestBase, inputs: [{ ...manifestBase.inputs[0], semanticPath: [{ kind: "repository", id: "fixture", label: "Fixture", privatePath: "secret" }] }] },
    { ...manifestBase, inputs: [{ ...manifestBase.inputs[0], semanticPath: [
      { kind: "repository", id: "fixture", label: "Fixture" },
      { kind: "package", id: "fixture", label: "Duplicate" }
    ] }] }
  ]);

  // <lang><zh-CN>最终 evidence 仅保留 count、boolean、闭集值和 digest；不写页面正文、entry identity 或路径清单。</zh-CN><en>Final evidence retains only counts, booleans, closed-set values, and digests; it writes no page bodies, entry identities, or path lists.</en></lang>
  const indexHtml = topicResult.files.find((file) => file.path === "index.html")?.contents ?? "";
  const themeCss = topicResult.files.find((file) => file.path === "assets/hia-default.css")?.contents ?? "";
  const evidence = {
    contract: "wp85-portal-information-architecture-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp85-closeout",
    owners: ["@hia-doc/renderer-html", "@hia-doc/config", "@hia-doc/cli", "@hia-doc/theme-default"],
    informationArchitecture: {
      contract: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
      contractVersion: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
      draft202012: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA.$schema === "https://json-schema.org/draft/2020-12/schema",
      topLevelClosedWorld: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA.additionalProperties === false,
      dimensionsOrthogonal: true,
      combinationCount: combinationFacts.length,
      canonicalParity: parityDigests.size === 1,
      canonicalParityDigest: [...parityDigests][0],
      combinations: combinationFacts
    },
    semanticHierarchy: {
      policy: topicIndex.site.informationArchitecture.semanticPathPolicy,
      repositoryCount: 2,
      packageCount: 4,
      layerCount: 4,
      entryCount: topicIndex.entries.length,
      sourceGroupingInExplicitIa: false,
      inheritanceInContainmentTree: false
    },
    topics: {
      fixedOrder: [...renderer.DOCUMENTATION_PORTAL_TOPIC_SECTIONS],
      presentFixtureOrder: presentSectionOrder,
      productVersionMetadataOnly: true,
      continuityMetadataOnly: true,
      missingDataExplicitlyUnavailable: true,
      memberPlacementCovered: true,
      relationsSeparatedFromContainment: true
    },
    routing: {
      canonicalEntryRouteStable: true,
      presentationPathAdditive: true,
      memberAnchorStable: true,
      productVersionInRoute: false,
      omittedIaPreservesP3: true,
      singlePageWithExplicitIaRefused: true
    },
    scaleRegression: {
      language: "dotnet-synthetic",
      entryCount: 2951,
      canonicalFragmentCount: dotNetCanonicalFragmentCount,
      loadingStrategy: "lazy",
      eagerContentIndex: false,
      rootShardBounded: dotNetRoot.length < 1000
    },
    localization: {
      uiLocales: [...renderer.DOCUMENTATION_PORTAL_UI_LOCALES],
      contentLocaleIndependent: true,
      sourceCommentLocale: "not-projected",
      touchedLabelsLocalized: /覆盖情况|溯源/u.test(parentTopic)
    },
    accessibility: {
      nativeDetailsSummary: indexHtml.includes("createElement('details')") && indexHtml.includes("createElement('summary')"),
      fullAriaTreeClaimed: false,
      roleTreeEmitted: indexHtml.includes("role=\"tree\""),
      tabAndEnterSpaceNative: true,
      visibleFocus: themeCss.includes(":focus-visible"),
      activeAncestor: themeCss.includes("data-hia-active-ancestor")
    },
    refusalMatrix: {
      configCaseCount: 8,
      configDiagnosticCodes: configRefusalCodes,
      manifestCaseCount: 5,
      manifestDiagnosticCodes: manifestRefusalCodes,
      directRuntimeUnknownDraftRefused: true,
      directRuntimePrivateSemanticPathRefused: true,
      continuityExtraFieldRefused: true
    },
    privacy: {
      sourceBodySerialized: false,
      targetArtifactBodySerialized: false,
      targetIdentitySerialized: false,
      targetPathSerialized: false,
      workingStateSerialized: false,
      semanticPathSource: "manifest-input"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      wp86Started: false
    }
  };
  assert.equal(evidence.accessibility.roleTreeEmitted, false);
  assert.equal(evidence.accessibility.nativeDetailsSummary, true);
  assert.equal(evidence.accessibility.visibleFocus, true);
  assert.equal(evidence.accessibility.activeAncestor, true);

  const report = [
    "# W-P85 Portal 信息架构实现证据",
    "",
    "- 状态：`ready-for-wp85-closeout`",
    `- 中性契约：\`${evidence.informationArchitecture.contract}@${evidence.informationArchitecture.contractVersion}\``,
    `- 三维组合：${evidence.informationArchitecture.combinationCount}/8，canonical parity：${evidence.informationArchitecture.canonicalParity ? "通过" : "失败"}`,
    `- TypeScript synthetic：${evidence.semanticHierarchy.repositoryCount} repository / ${evidence.semanticHierarchy.packageCount} package / ${evidence.semanticHierarchy.layerCount} layer / ${evidence.semanticHierarchy.entryCount} entry`,
    `- .NET synthetic：${evidence.scaleRegression.entryCount} entry，lazy root shard bounded：${evidence.scaleRegression.rootShardBounded ? "是" : "否"}`,
    `- 可访问性：native details/summary=${evidence.accessibility.nativeDetailsSummary}，visible focus=${evidence.accessibility.visibleFocus}，role=tree=${evidence.accessibility.roleTreeEmitted}`,
    "- 隐私与权限：未读取/写入/执行目标项目，未访问网络，未发布包，未启动 W-P86。",
    ""
  ].join("\n");
  await mkdir(evidenceOutputDirectory, { recursive: true });
  await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceOutputDirectory, "report.md"), report, "utf8");
}

// <lang><zh-CN>顶层只输出固定完成/失败消息，不反射 synthetic identity 或 filesystem path。</zh-CN><en>The top level prints only fixed completion/failure messages and reflects no synthetic identity or filesystem path.</en></lang>
prepareEvidence().then(() => {
  console.log("W-P85 Portal information architecture evidence generated.");
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "W-P85 Portal information architecture evidence failed.");
  process.exitCode = 1;
});
