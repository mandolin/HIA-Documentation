import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>W-P96 runner 只使用 main-repo 自有结构化数据，不打开源码、目标仓库或外部资源。</zh-CN><en>The W-P96 runner uses main-repo-owned structured data only and opens no source, target repository, or external resource.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(repositoryRoot, "dist", "wp96-locale-source-comment-projection");

/**
 * @lang zh-CN
 * 读取 renderer 结果中的固定文件，缺失时 fail closed。
 *
 * @lang en
 * Reads a fixed renderer output and fails closed when it is missing.
 *
 * @param {Record<string, unknown>} result <lang><zh-CN>renderer 结果。</zh-CN><en>Renderer result.</en></lang>
 * @param {string} filePath <lang><zh-CN>固定相对路径。</zh-CN><en>Fixed relative path.</en></lang>
 * @returns {string} <lang><zh-CN>文件正文。</zh-CN><en>File contents.</en></lang>
 */
function renderedText(result, filePath) {
  const file = result.files.find((candidate) => candidate.path === filePath);
  assert.ok(file, `Missing rendered file: ${filePath}`);
  return file.contents;
}

/**
 * @lang zh-CN
 * 生成 contract、locale fallback、双重 opt-in 与 index privacy 的 owner-local evidence。
 *
 * @lang en
 * Produces owner-local evidence for the contract, locale fallback, double opt-in, and index privacy.
 *
 * @returns {Promise<void>} <lang><zh-CN>ignored dist evidence 写入完成。</zh-CN><en>Completion of ignored dist evidence writing.</en></lang>
 */
async function prepareEvidence() {
  await mkdir(evidenceRoot, { recursive: true });
  const core = await import(pathToFileURL(path.join(repositoryRoot, "packages", "core", "dist", "index.js")).href);
  const renderer = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const request = {
    comments: [{
      commentId: "comment.summary",
      kind: "documentation",
      localizedText: {
        en: "W-P96 renders <comment> as plain text.",
        "zh-CN": "W-P96 将 <comment> 作为纯文本呈现。"
      },
      order: 0,
      range: { start: { line: 4, column: 0 }, end: { line: 7, column: 3 } }
    }],
    contentPolicy: "explicit-projected-text",
    contract: core.DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
    contractVersion: core.DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
    defaultLocale: "zh-CN",
    projectionId: "projection.wp96.fixture",
    requestedLocale: "en-US",
    source: {
      docSourceMapEntryId: "docmap.wp96.fixture",
      documentId: "doc.wp96.fixture",
      sourceId: "source.wp96.fixture",
      symbolId: "symbol.wp96.fixture"
    }
  };
  const projection = core.createDocumentationSourceCommentProjection(request);
  assert.equal(projection.status, "ready");
  assert.deepEqual(core.validateDocumentationSourceCommentProjection(projection), []);
  assert.equal(projection.entries[0].resolution, "fallback");
  assert.equal(projection.entries[0].confidence, "declared");
  assert.equal(projection.entries[0].provenance.sourceLocale, "en");
  assert.equal(projection.source.docSourceMapEntryId, "docmap.wp96.fixture");
  assert.equal(projection.privacy.sourcesContentPolicy, "none");

  const projectInput = {
    project: { name: "W-P96 Source Comment Projection Fixture", defaultLocale: "zh-CN", locales: ["zh-CN", "en"] },
    entries: [{
      id: "entry.wp96.fixture",
      kind: "function",
      name: "renderComment",
      sourceCommentProjection: projection,
      symbolId: "symbol.wp96.fixture",
      view: "js"
    }]
  };
  const bodyResult = renderer.renderProjectHtmlDocument(projectInput, {
    projectSite: {
      informationArchitecture: {},
      sourceCommentProjection: { contentPolicy: "explicit-projected-text", locale: "en-US" }
    }
  });
  const metadataResult = renderer.renderProjectHtmlDocument(projectInput, {
    projectSite: {
      informationArchitecture: {},
      sourceCommentProjection: { contentPolicy: "none", locale: "en-US" }
    }
  });
  const bodyEntryPath = bodyResult.files.find((file) => file.path.startsWith("entries/"))?.path;
  const metadataEntryPath = metadataResult.files.find((file) => file.path.startsWith("entries/"))?.path;
  assert.ok(bodyEntryPath && metadataEntryPath);
  const bodyEntry = renderedText(bodyResult, bodyEntryPath);
  const metadataEntry = renderedText(metadataResult, metadataEntryPath);
  const navigationIndexText = renderedText(bodyResult, "project-index.json");
  const navigationIndex = JSON.parse(navigationIndexText);

  assert.match(bodyEntry, /W-P96 renders &lt;comment&gt; as plain text\./u);
  assert.doesNotMatch(bodyEntry, /W-P96 renders <comment>/u);
  assert.match(metadataEntry, /Comment Contract/u);
  assert.doesNotMatch(metadataEntry, /W-P96 renders/u);
  assert.equal(navigationIndex.entries[0].sourceCommentProjection.entryCount, 1);
  assert.equal(navigationIndex.entries[0].sourceCommentProjection.privacy.projectedCommentTextIncluded, false);
  assert.doesNotMatch(navigationIndexText, /W-P96 renders|projectedText|"sourcesContent"/u);

  const refused = core.createDocumentationSourceCommentProjection({ ...request, sourceBody: "must-not-cross" });
  assert.equal(refused.status, "refused");
  assert.equal(refused.contentPolicy, "none");
  assert.doesNotMatch(JSON.stringify(refused), /must-not-cross/u);

  const evidence = {
    contract: "wp96-locale-source-comment-projection-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp96-closeout",
    owners: ["@hia-doc/core", "@hia-doc/config", "@hia-doc/schemas", "@hia-doc/cli", "@hia-doc/renderer-html"],
    projection: {
      contract: projection.contract,
      contractVersion: projection.contractVersion,
      entryCount: projection.entries.length,
      stableCommentKey: projection.entries[0].stableCommentKey,
      requestedLocale: projection.requestedLocale,
      resolvedLocale: projection.entries[0].resolvedLocale,
      resolution: projection.entries[0].resolution,
      confidence: projection.entries[0].confidence,
      provenance: projection.entries[0].provenance.kind,
      dimensionsIndependent: true,
      docSourceMapEntryLinked: Boolean(projection.source.docSourceMapEntryId)
    },
    portal: {
      explicitBodyRendered: bodyEntry.includes("W-P96 renders &lt;comment&gt;"),
      plainTextEscaped: !bodyEntry.includes("W-P96 renders <comment>"),
      metadataOnlyBodyAbsent: !metadataEntry.includes("W-P96 renders"),
      navigationMetadataPresent: Boolean(navigationIndex.entries[0].sourceCommentProjection),
      navigationBodyAbsent: !navigationIndexText.includes("W-P96 renders") && !navigationIndexText.includes("projectedText")
    },
    privacy: {
      sourcesContentPolicy: projection.privacy.sourcesContentPolicy,
      sourceBodyIncluded: projection.privacy.sourceBodyIncluded,
      rawCommentIncluded: projection.privacy.rawCommentIncluded,
      richTextPolicy: projection.privacy.richTextPolicy,
      unknownPrivateFieldRefused: refused.status === "refused",
      sourceReaderCapabilityGranted: false,
      parserCapabilityGranted: false
    },
    release: {
      compatibility: "additive-exact-draft-contract-and-opt-in-portal-field",
      packageVersionChanged: false,
      publishRequired: false,
      rollback: "revert-owner-commit-and-omit-source-comment-config-and-symbol-metadata"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      htmdocModified: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false,
      portalP5ToP7FullyStarted: false,
      wP97Started: false
    }
  };
  const report = [
    "# W-P96 Locale-aware source comment projection evidence",
    "",
    `- 状态：\`${evidence.status}\``,
    `- contract：\`${evidence.projection.contract}@${evidence.projection.contractVersion}\`，entry：${evidence.projection.entryCount}`,
    `- locale：\`${evidence.projection.requestedLocale} -> ${evidence.projection.resolvedLocale}\`，resolution/confidence/provenance：\`${evidence.projection.resolution}/${evidence.projection.confidence}/${evidence.projection.provenance}\``,
    `- Portal：显式正文=${evidence.portal.explicitBodyRendered ? "是" : "否"}，转义=${evidence.portal.plainTextEscaped ? "是" : "否"}，metadata-only 无正文=${evidence.portal.metadataOnlyBodyAbsent ? "是" : "否"}`,
    `- privacy：\`sourcesContentPolicy=${evidence.privacy.sourcesContentPolicy}\`，source reader/parser=${evidence.privacy.sourceReaderCapabilityGranted}/${evidence.privacy.parserCapabilityGranted}`,
    "- 权限：未读取、运行或修改目标项目；未修改 HTMDoc；未访问网络、发布 package、声明 adoption、启动完整 Portal P5-P7 或 W-P97。",
    ""
  ].join("\n");
  await writeFile(path.join(evidenceRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceRoot, "report.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
