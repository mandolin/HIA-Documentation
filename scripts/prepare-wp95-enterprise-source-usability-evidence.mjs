import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>W-P95 runner 只使用 main-repo 自有 producer-result fixture 与 synthetic scale data。</zh-CN><en>The W-P95 runner uses only main-repo-owned producer-result fixtures and synthetic scale data.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(repositoryRoot, "dist", "wp95-enterprise-source-usability");
const cliSiteRoot = path.join(evidenceRoot, "cli-site");

/**
 * @lang zh-CN 从 renderer result 读取固定 JSON 文件，缺失时 fail closed。
 * @lang en Reads a fixed JSON file from a renderer result and fails closed when missing.
 *
 * @param {Record<string, unknown>} result <lang><zh-CN>renderer result。</zh-CN><en>Renderer result.</en></lang>
 * @param {string} filePath <lang><zh-CN>固定输出相对路径。</zh-CN><en>Fixed output-relative path.</en></lang>
 * @returns {Record<string, unknown>} <lang><zh-CN>解析后的 JSON。</zh-CN><en>Parsed JSON.</en></lang>
 */
function readRenderedJson(result, filePath) {
  const file = result.files.find((candidate) => candidate.path === filePath);
  assert.ok(file, `Missing rendered file: ${filePath}`);
  return JSON.parse(file.contents);
}

/**
 * @lang zh-CN 创建 2951-entry .NET source-usability fixture；identity 不依赖 display label、locale 或绝对路径。
 * @lang en Creates a 2,951-entry .NET source-usability fixture whose identity is independent of display labels, locales, and absolute paths.
 *
 * @returns {Record<string, unknown>} <lang><zh-CN>metadata-only renderer input。</zh-CN><en>Metadata-only renderer input.</en></lang>
 */
function createScaleFixture() {
  const entries = Array.from({ length: 2951 }, (_, index) => ({
    id: `dotnet:wp95:${index}`,
    name: `Method${index}`,
    kind: "dotnet-method",
    view: "dotnet",
    symbolId: `M:Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}.Method${index}`,
    source: {
      path: `src/Fixture/Feature${Math.floor(index / 50)}/Type${Math.floor(index / 50)}.cs`,
      language: "csharp",
      range: { start: { line: index + 1 } },
      confidence: "high"
    },
    sourceUsability: {
      relationId: `dotnetdoc:source-relation:wp95-${index}`,
      resolution: "resolved",
      confidence: "high",
      provenance: {
        producer: "@hia-doc/dotnetdoc-runner",
        activity: "xml-doc-to-csharp-source",
        contract: "dotnetdoc-source-relation",
        contractVersion: "0.1.0-draft"
      },
      projectIdentity: {
        id: "dotnet-project:fixtures-source-portal.components-portal.components.csproj",
        path: "fixtures/source/Portal.Components/Portal.Components.csproj",
        policy: "project-relative-owner-resolved"
      },
      privacy: {
        sourcesContentPolicy: "none",
        sourcePreviewPolicy: "none",
        embedsSourcesContent: false
      }
    },
    hierarchy: {
      assembly: "Fixture",
      namespace: `Fixture.Feature${Math.floor(index / 50)}`,
      containingType: `Fixture.Feature${Math.floor(index / 50)}.Type${Math.floor(index / 50)}`
    },
    semanticPath: [
      { kind: "repository", id: "dotnet-fixture", label: "DotNet Synthetic Fixture" },
      { kind: "assembly", id: "fixture", label: "Fixture" }
    ]
  }));
  // <lang><zh-CN>故意注入非 allowlist 字段，验证 navigation index 与 topic 均不会泄漏。</zh-CN><en>Deliberately inject a non-allowlisted field to verify neither the navigation index nor topic leaks it.</en></lang>
  entries[0].sourceUsability.sourceBody = "must-not-cross-the-boundary";
  return { project: { name: "W-P95 DotNet Source Usability Scale Fixture" }, entries };
}

/**
 * @lang zh-CN 执行 CLI relation-to-entry 与大型 Portal source-state evidence。
 * @lang en Executes evidence for CLI relation-to-entry projection and large-Portal source state.
 *
 * @returns {Promise<void>} <lang><zh-CN>evidence 写入完成。</zh-CN><en>Completion of evidence writing.</en></lang>
 * @lang zh-CN 副作用只写 main-repo ignored `dist`；不访问 target、network 或 publish surface。
 * @lang en Side effects are limited to main-repo's ignored `dist`; no target, network, or publish surface is accessed.
 */
async function prepareEvidence() {
  await mkdir(cliSiteRoot, { recursive: true });
  const cli = await import(pathToFileURL(path.join(repositoryRoot, "apps", "cli", "dist", "index.js")).href);
  const renderer = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const messages = [];
  const exitCode = await cli.runCli([
    "docs",
    "build",
    "--project-manifest",
    "fixtures/project-producer-result.hia-project.json",
    "--out",
    cliSiteRoot
  ], {
    cwd: repositoryRoot,
    stdout: (message) => messages.push(message),
    stderr: (message) => messages.push(message)
  });
  const cliIndex = JSON.parse(await readFile(path.join(cliSiteRoot, "project-index.json"), "utf8"));
  const portalEntry = cliIndex.entries.find((entry) => entry.symbolId === "T:Portal.Components.PortalSecurity");
  const portalTopic = await readFile(path.join(cliSiteRoot, portalEntry.contentPath), "utf8");

  assert.equal(exitCode, 0);
  assert.equal(portalEntry.source.path, "src/Portal.Components/PortalSecurity.cs");
  assert.equal(portalEntry.sourceUsability.resolution, "resolved");
  assert.equal(portalEntry.sourceUsability.confidence, "high");
  assert.equal(portalEntry.sourceUsability.provenance.activity, "xml-doc-to-csharp-source");
  assert.equal(portalEntry.sourceUsability.projectIdentity.policy, "project-relative-owner-resolved");
  assert.equal(portalEntry.sourceUsability.privacy.sourcesContentPolicy, "none");
  assert.match(portalTopic, /Source Usability/u);
  assert.doesNotMatch(JSON.stringify(portalEntry), /sourceBody|sourcesContent\s*:/u);

  const scaleResult = renderer.renderProjectHtmlDocument(createScaleFixture(), {
    projectSite: {
      informationArchitecture: {
        contentGrouping: "entry",
        loadingStrategy: "lazy",
        memberPlacement: "separate"
      }
    }
  });
  const scaleIndex = readRenderedJson(scaleResult, "project-index.json");
  const rootShard = scaleResult.files.find((file) => file.path === "navigation/root.json")?.contents ?? "";
  const scaleSerialized = JSON.stringify(scaleIndex);
  assert.equal(scaleIndex.entries.length, 2951);
  assert.equal(scaleResult.files.filter((file) => file.path.startsWith("entries/")).length, 2951);
  assert.equal(scaleResult.files.some((file) => file.path === "content/eager.json"), false);
  assert.equal(scaleIndex.entries.every((entry) => entry.sourceUsability.resolution === "resolved"), true);
  assert.equal(scaleIndex.entries.every((entry) => entry.sourceUsability.privacy.sourcesContentPolicy === "none"), true);
  assert.ok(rootShard.length < 1000);
  assert.doesNotMatch(rootShard, /Method2950/u);
  assert.doesNotMatch(scaleSerialized, /must-not-cross-the-boundary/u);
  assert.equal(Object.hasOwn(scaleIndex.entries[0].sourceUsability, "sourceBody"), false);
  assert.equal(scaleResult.files.some((file) => file.contents.includes("must-not-cross-the-boundary")), false);

  const evidence = {
    contract: "wp95-enterprise-source-usability-portal-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp95-closeout",
    owners: ["@hia-doc/cli", "@hia-doc/renderer-html"],
    projection: {
      canonicalEntryCount: 1,
      sourceRelationApplied: true,
      identityPolicy: portalEntry.sourceUsability.projectIdentity.policy,
      resolution: portalEntry.sourceUsability.resolution,
      confidence: portalEntry.sourceUsability.confidence,
      provenance: portalEntry.sourceUsability.provenance.activity,
      dimensionsIndependent: true
    },
    scaleRegression: {
      entryCount: scaleIndex.entries.length,
      canonicalFragmentCount: scaleResult.files.filter((file) => file.path.startsWith("entries/")).length,
      loadingStrategy: "lazy",
      eagerContentIndex: false,
      rootShardBounded: rootShard.length < 1000,
      sourceUsabilityCount: scaleIndex.entries.filter((entry) => entry.sourceUsability).length
    },
    privacy: {
      sourcesContentPolicy: "none",
      allowlistProjection: true,
      injectedSourceBodySerialized: scaleSerialized.includes("must-not-cross-the-boundary"),
      sourceReaderCapabilityGranted: false
    },
    release: {
      compatibility: "additive-renderer-entry-field",
      packageVersionChanged: false,
      publishRequired: false,
      rollback: "revert-owner-commit-and-retain-existing-source-and-hierarchy-projection"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      wP96Started: false
    }
  };
  const report = [
    "# W-P95 Enterprise source usability Portal evidence",
    "",
    `- 状态：\`${evidence.status}\``,
    `- canonical entry projection：${evidence.projection.canonicalEntryCount}，identity policy：\`${evidence.projection.identityPolicy}\``,
    `- 2951-entry regression：${evidence.scaleRegression.canonicalFragmentCount} fragment，lazy root bounded：${evidence.scaleRegression.rootShardBounded ? "是" : "否"}`,
    `- privacy：\`sourcesContentPolicy=${evidence.privacy.sourcesContentPolicy}\`，injected body serialized：${evidence.privacy.injectedSourceBodySerialized ? "是" : "否"}`,
    "- 权限：未读取、运行或修改目标项目；未访问网络、发布 package、声明 adoption 或启动 W-P96。",
    ""
  ].join("\n");
  await writeFile(path.join(evidenceRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceRoot, "report.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
