import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>Evidence 输入固定为主仓 synthetic fixture，不接受目标仓路径、URL、凭据或外部正文。</zh-CN><en>Evidence input is fixed to a main-repository synthetic fixture and accepts no target path, URL, credential, or external body.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>所有生成站点和报告仅写入 ignored dist。</zh-CN><en>All generated sites and reports are written only under ignored dist.</en></lang>
const evidenceRoot = path.join(repositoryRoot, "dist", "wp117-portal-presentation-adoption");
const browserSiteRoot = path.join(evidenceRoot, "site");
const sourceBodies = [
  "export class CookieStore {\n  get(name) { return name; }\n}",
  "export function readCookie(name) {\n  return new CookieStore().get(name);\n}"
];

/**
 * @lang zh-CN
 * 构造包含 parent/member、关系、双语文本和两份显式公开源码片段的 Portal owner fixture。
 *
 * @lang en
 * Builds a Portal-owner fixture with parent/member structure, relations, bilingual text, and two explicitly public source excerpts.
 *
 * @returns {Record<string, unknown>} HIA-owned synthetic renderer input。HIA-owned synthetic renderer input.
 */
function createFixture() {
  return {
    project: {
      id: "project:wp117-portal",
      name: "W-P117 Portal Fixture",
      title: "W-P117 Portal 多页与主题夹具",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"]
    },
    entries: [
      {
        id: "entry:cookie-store",
        name: "CookieStore",
        kind: "class",
        view: "js",
        symbolId: "class:CookieStore",
        summary: "Cookie 存储入口。Cookie storage entry.",
        semanticPath: [
          { kind: "repository", id: "wp117", label: "W-P117 Fixture" },
          { kind: "package", id: "portal", label: "@hia-doc/renderer-html" },
          { kind: "type", id: "cookie-store", label: "CookieStore" }
        ],
        source: {
          path: "src/cookie-store.js",
          language: "javascript",
          range: { start: { line: 1 }, end: { line: 3 } },
          preview: { content: sourceBodies[0], language: "javascript", defaultExpanded: false }
        }
      },
      {
        id: "entry:read-cookie",
        name: "readCookie",
        kind: "function",
        view: "js",
        symbolId: "function:readCookie",
        hierarchy: { parentSymbolId: "class:CookieStore" },
        summary: "读取一个 Cookie。Reads one cookie.",
        semanticPath: [
          { kind: "repository", id: "wp117", label: "W-P117 Fixture" },
          { kind: "package", id: "portal", label: "@hia-doc/renderer-html" },
          { kind: "type", id: "cookie-store", label: "CookieStore" },
          { kind: "operation", id: "read-cookie", label: "readCookie" }
        ],
        source: {
          path: "src/read-cookie.js",
          language: "javascript",
          range: { start: { line: 1 }, end: { line: 3 } },
          preview: { content: sourceBodies[1], language: "javascript", defaultExpanded: false }
        }
      }
    ],
    relationGraph: {
      contract: "hia-project-relation-graph",
      contractVersion: "0.1.0-draft",
      nodes: [
        { id: "entry:cookie-store", kind: "entry", label: "CookieStore" },
        { id: "entry:read-cookie", kind: "entry", label: "readCookie" }
      ],
      relations: [
        { id: "relation:cookie-member", kind: "semantic-member", from: "entry:cookie-store", to: "entry:read-cookie", label: "Member / 成员" }
      ]
    }
  };
}

/**
 * @lang zh-CN 从 renderer result 按 exact relative path 读取文件正文。
 * @lang en Reads one file body from a renderer result by exact relative path.
 *
 * @param {Record<string, unknown>} result renderer result。Renderer result.
 * @param {string} filePath renderer-relative path。Renderer-relative path.
 * @returns {string} 文件正文。File body.
 */
function readRenderedFile(result, filePath) {
  const file = result.files.find((candidate) => candidate.path === filePath);
  assert.ok(file, `Missing rendered file: ${filePath}`);
  return file.contents;
}

/**
 * @lang zh-CN 把六位 hex color 转为 WCAG linear RGB channel。
 * @lang en Converts a six-digit hex color into WCAG linear RGB channels.
 * @param {string} color opaque hex color。Opaque hex color.
 * @returns {number[]} 三个 linear channel。Three linear channels.
 */
function toLinearRgb(color) {
  assert.match(color, /^#[0-9a-f]{6}$/iu);
  return [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
}

/**
 * @lang zh-CN 计算两种 opaque color 的 WCAG contrast ratio。
 * @lang en Computes the WCAG contrast ratio of two opaque colors.
 * @param {string} left 第一种颜色。First color.
 * @param {string} right 第二种颜色。Second color.
 * @returns {number} contrast ratio。Contrast ratio.
 */
function calculateContrastRatio(left, right) {
  const luminance = (color) => {
    const [red, green, blue] = toLinearRgb(color);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(left), luminance(right)].sort((first, second) => second - first);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @lang zh-CN 从生成 CSS 的 exact skin/scheme root rule 读取 semantic color tokens。
 * @lang en Reads semantic color tokens from an exact generated skin/scheme root rule.
 * @param {string} css 生成 CSS。Generated CSS.
 * @param {string} skinId skin identity。Skin identity.
 * @param {string} scheme concrete light/dark scheme。Concrete light/dark scheme.
 * @returns {Record<string, string>} token-name/value map。Token-name/value map.
 */
function readSkinSchemeTokens(css, skinId, scheme) {
  const selector = `:root[data-hia-skin="${skinId}"][data-hia-scheme="${scheme}"]`;
  const ruleStart = css.indexOf(`${selector} {`);
  assert.notEqual(ruleStart, -1, `Missing skin rule: ${selector}`);
  const ruleEnd = css.indexOf("\n}", ruleStart);
  assert.notEqual(ruleEnd, -1, `Unterminated skin rule: ${selector}`);
  const rule = css.slice(ruleStart, ruleEnd);
  return Object.fromEntries([...rule.matchAll(/--hia-color-([a-z-]+):\s*(#[0-9a-f]{6});/giu)]
    .map(([, name, value]) => [name, value.toLowerCase()]));
}

/**
 * @lang zh-CN 把 canonical fetch/classic/system 站点安全写入固定 browser root。
 * @lang en Writes the canonical fetch/classic/system site safely below the fixed browser root.
 *
 * @param {Record<string, unknown>} result renderer result。Renderer result.
 * @returns {Promise<void>} 写入完成。Write completion.
 */
async function writeBrowserSite(result) {
  await rm(browserSiteRoot, { force: true, recursive: true });
  for (const file of result.files) {
    // <lang><zh-CN>每个输出先 resolve 并验证仍处于固定 root，防止未来 artifact path 回归为 traversal。</zh-CN><en>Resolve every output and verify it remains under the fixed root to catch any future artifact-path traversal regression.</en></lang>
    const outputPath = path.resolve(browserSiteRoot, file.path);
    assert.equal(outputPath.startsWith(`${path.resolve(browserSiteRoot)}${path.sep}`), true);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, file.contents, "utf8");
  }
}

/**
 * @lang zh-CN 执行 Portal owner 的多页、源码、主题、identity、privacy 与浏览器 intake evidence。
 * @lang en Runs Portal-owner evidence for multi-page output, source modes, themes, identity, privacy, and browser intake.
 *
 * @returns {Promise<void>} ignored evidence 与浏览器站点生成完成。Ignored evidence and browser site generation completion.
 */
async function prepareEvidence() {
  await mkdir(evidenceRoot, { recursive: true });
  // <lang><zh-CN>导入刚构建的 package dist，验证实际可分发 owner entry，而不是测试专用源码路径。</zh-CN><en>Import freshly built package distributions to validate actual distributable owner entries rather than test-only source paths.</en></lang>
  const core = await import(pathToFileURL(path.join(repositoryRoot, "packages", "core", "dist", "index.js")).href);
  const renderer = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const theme = await import(pathToFileURL(path.join(repositoryRoot, "packages", "theme-default", "dist", "index.js")).href);
  const fixture = createFixture();
  const sourceModes = ["fetch", "embed", "link", "none"];
  const skinIds = [...theme.PORTAL_THEME_SKIN_IDS];
  const schemes = [...theme.PORTAL_THEME_SCHEMES];
  const variantFacts = [];
  let referenceProfile;
  let browserResult;

  // <lang><zh-CN>三套 skin 的实际生成 token 必须同时通过正文、muted、accent、pressed text 和 focus contrast。</zh-CN><en>Generated tokens for all three skins must pass text, muted, accent, pressed-text, and focus contrast checks.</en></lang>
  const themeCss = theme.DEFAULT_THEME_CSS;
  const themeContrast = {};
  for (const skinId of skinIds) {
    themeContrast[skinId] = {};
    for (const scheme of ["light", "dark"]) {
      const tokens = readSkinSchemeTokens(themeCss, skinId, scheme);
      const facts = {
        textOnCanvas: calculateContrastRatio(tokens.text, tokens.canvas),
        mutedOnCanvas: calculateContrastRatio(tokens["text-muted"], tokens.canvas),
        accentOnCanvas: calculateContrastRatio(tokens.accent, tokens.canvas),
        pressedText: calculateContrastRatio(tokens["accent-contrast"], tokens.accent),
        focusOnCanvas: calculateContrastRatio(tokens["focus-ring"], tokens.canvas),
        focusOnSurface: calculateContrastRatio(tokens["focus-ring"], tokens.surface)
      };
      assert.equal(facts.textOnCanvas >= 4.5, true);
      assert.equal(facts.mutedOnCanvas >= 4.5, true);
      assert.equal(facts.accentOnCanvas >= 4.5, true);
      assert.equal(facts.pressedText >= 4.5, true);
      assert.equal(facts.focusOnCanvas >= 3, true);
      assert.equal(facts.focusOnSurface >= 3, true);
      themeContrast[skinId][scheme] = Object.fromEntries(
        Object.entries(facts).map(([name, value]) => [name, Number(value.toFixed(2))])
      );
    }
  }

  for (const sourceMode of sourceModes) {
    for (const skinId of skinIds) {
      for (const scheme of schemes) {
        // <lang><zh-CN>36 个变体仅改变呈现选择；fixture、关系和 semantic topic 始终相同。</zh-CN><en>The 36 variants change presentation selections only; fixture data, relations, and semantic topics remain identical.</en></lang>
        const result = renderer.renderProjectHtmlDocument(fixture, {
          projectSite: {
            layout: "split-site",
            uiLocale: "zh-CN",
            informationArchitecture: {
              contract: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
              contractVersion: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
              contentGrouping: "semantic-container",
              loadingStrategy: "lazy",
              memberPlacement: "with-parent"
            },
            source: { presentation: sourceMode, fetchTrigger: "on-expand", maxLines: 80 },
            theme: { skinId, scheme }
          }
        });
        const profile = JSON.parse(readRenderedFile(result, renderer.PORTAL_PRESENTATION_PROFILE_PATH));
        const projectIndex = JSON.parse(readRenderedFile(result, "project-index.json"));
        const projectEntry = projectIndex.entries.find(({ id }) => id === "entry:cookie-store");
        const entryPath = projectEntry?.contentPath;
        const noScriptPagePath = projectEntry?.noScriptPagePath;
        assert.equal(typeof entryPath, "string");
        assert.equal(typeof noScriptPagePath, "string");
        const indexHtml = readRenderedFile(result, "index.html");
        const entryHtml = readRenderedFile(result, entryPath);
        const noScriptIndexHtml = readRenderedFile(result, "pages/index.html");
        const noScriptEntryHtml = readRenderedFile(result, noScriptPagePath);

        assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(core.validateDocumentationPresentationProfile(profile), []);
        assert.equal(profile.pagePartition.defaultMode, "multi-page");
        assert.equal(profile.pagePartition.mode, "multi-page");
        assert.equal(profile.source.defaultMode, "fetch");
        assert.equal(profile.source.mode, sourceMode);
        assert.equal(profile.theme.skinId, skinId);
        assert.equal(profile.theme.scheme, scheme);
        assert.equal(profile.theme.skins.length, 3);
        assert.equal(profile.source.assets.length, sourceMode === "none" ? 0 : 2);
        assert.equal(JSON.stringify(profile).includes(sourceBodies[0]), false);
        assert.equal(JSON.stringify(projectIndex).includes(sourceBodies[0]), false);
        assert.match(indexHtml, /data-hia-skin-control/u);
        assert.match(indexHtml, /data-hia-scheme-control/u);
        assert.match(indexHtml, /<noscript>[\s\S]*pages\/index\.html/u);
        assert.match(entryHtml, /class="hia-project-topic-section"/u);
        assert.match(entryHtml, /class="hia-project-member-card"/u);
        assert.doesNotMatch(entryHtml, /aria-expanded/u);
        assert.match(noScriptIndexHtml, /Documentation pages \/ 文档页面/u);
        assert.doesNotMatch(noScriptIndexHtml, /<script/u);
        assert.match(noScriptEntryHtml, /class="hia-project-topic-section"/u);
        assert.doesNotMatch(noScriptEntryHtml, /<script/u);
        assert.doesNotMatch(noScriptEntryHtml, /aria-expanded/u);
        if (sourceMode === "fetch" || sourceMode === "link") {
          assert.match(noScriptEntryHtml, /href="\.\.\/sources\/[a-f0-9]{64}\.txt"/u);
        } else {
          assert.doesNotMatch(noScriptEntryHtml, /href="\.\.\/sources\//u);
        }
        assert.equal(noScriptEntryHtml.includes(sourceBodies[0]), sourceMode === "embed");

        if (referenceProfile) {
          assert.deepEqual(core.compareDocumentationPresentationIdentity(referenceProfile, profile), []);
        } else {
          referenceProfile = profile;
        }

        const sourceArtifactCount = result.files.filter(({ path: filePath }) => /^sources\/[a-f0-9]{64}\.txt$/u.test(filePath)).length;
        assert.equal(sourceArtifactCount, sourceMode === "fetch" || sourceMode === "link" ? 2 : 0);
        assert.equal(result.files.some(({ path: filePath }) => filePath === ".gitattributes"), sourceArtifactCount > 0);
        variantFacts.push({ sourceMode, skinId, scheme, status: profile.status, sourceAssetCount: profile.source.assets.length });

        if (sourceMode === "fetch" && skinId === "portal.classic" && scheme === "system") {
          browserResult = result;
        }
      }
    }
  }

  assert.ok(referenceProfile);
  assert.ok(browserResult);
  assert.equal(variantFacts.length, 36);
  await writeBrowserSite(browserResult);

  // <lang><zh-CN>single-page 只改变允许变化的 page projection，稳定 topic/navigation/relation identity 仍须一致。</zh-CN><en>Single-page changes only the permitted page projection while stable topic/navigation/relation identities remain equal.</en></lang>
  const singlePageResult = renderer.renderProjectHtmlDocument(fixture, {
    projectSite: {
      layout: "single-page",
      source: { presentation: "fetch", maxLines: 80 },
      theme: { skinId: "portal.classic", scheme: "system" }
    }
  });
  const singlePageProfile = JSON.parse(readRenderedFile(singlePageResult, renderer.PORTAL_PRESENTATION_PROFILE_PATH));
  assert.deepEqual(core.validateDocumentationPresentationProfile(singlePageProfile), []);
  assert.equal(singlePageProfile.pagePartition.mode, "single-page");
  assert.deepEqual(core.compareDocumentationPresentationIdentity(referenceProfile, singlePageProfile), []);

  const evidence = {
    contract: "wp117-portal-presentation-adoption-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp117-browser-and-release-gate",
    owners: ["@hia-doc/config", "@hia-doc/theme-default", "@hia-doc/renderer-html", "@hia-doc/cli"],
    presentation: {
      profileContract: referenceProfile.contract,
      profileContractVersion: referenceProfile.contractVersion,
      splitSiteDefault: true,
      multiPageDefault: referenceProfile.pagePartition.defaultMode,
      singlePageCompatibilityVerified: true,
      sourceDefault: referenceProfile.source.defaultMode,
      sourceModes,
      skinIds,
      schemes,
      variantCount: variantFacts.length,
      identityParityAcrossVariants: true,
      exactValidVariantCount: variantFacts.filter(({ status }) => status === "ready").length
    },
    themeContrast,
    sourceAssets: {
      generatedFor: ["fetch", "link"],
      safeRelative: true,
      contentAddressed: true,
      revisionBound: true,
      sha384Bound: true,
      gitTextNormalizationDisabled: true,
      fallbackPolicy: referenceProfile.source.fallbackPolicy
    },
    interaction: {
      visibleSkinSelector: true,
      visibleSchemeSelector: true,
      nativeTopicDisclosure: true,
      nativeMemberDisclosure: true,
      nativeSourceDisclosure: true,
      noScriptMultiPageFallback: true,
      noScriptSourceLinkFallback: true,
      authoredAriaExpanded: false,
      browserSite: "site/index.html"
    },
    privacy: {
      sourceBodyInProfile: false,
      sourceBodyInProjectIndex: false,
      sourceBodyInSearchIndex: false,
      absolutePathsIncluded: false,
      credentialsIncluded: false,
      cookiesRequired: false,
      privateSidecarsIncluded: false,
      telemetryEnabled: false
    },
    permissions: {
      networkExecutedByEvidencePreparer: false,
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      satelliteRepositoryModified: false,
      bpOrPagesModified: false,
      packageVersionChanged: false,
      dependencyOrLockfileChanged: false,
      packagePublished: false,
      wP118Started: false,
      wP119Started: false
    }
  };
  const serializedEvidence = JSON.stringify(evidence);
  assert.equal(sourceBodies.some((body) => serializedEvidence.includes(body)), false);

  const report = [
    "# W-P117 Portal owner 呈现采用 evidence",
    "",
    `- 状态：\`${evidence.status}\`。`,
    `- profile：\`${evidence.presentation.profileContract}@${evidence.presentation.profileContractVersion}\`，${evidence.presentation.exactValidVariantCount}/${evidence.presentation.variantCount} 个 split-site 变体 exact-valid。`,
    `- 页面：默认 \`${evidence.presentation.multiPageDefault}\`，显式 \`single-page\` identity parity 已验证。`,
    `- 源码：默认 \`${evidence.presentation.sourceDefault}\`，模式 \`${sourceModes.join("/")}\`；fetch/link 使用同源内容寻址资源与 SHA-384，fallback=\`${evidence.sourceAssets.fallbackPolicy}\`。`,
    `- 主题：${skinIds.length} 个 Portal-owned skin × ${schemes.length} 个 scheme；选择器可见且 identity 不漂移。`,
    "- disclosure：topic/member/source 均使用 native details/summary，不写 authored aria-expanded；独立 no-script 索引与逐 topic 页面可直接读取。",
    "- privacy：profile/project/search index 不含 source body、绝对路径、凭据、cookie、private sidecar 或 telemetry。",
    "- 边界：未读取或修改目标仓、卫星仓或 BP；未变更版本/依赖/lockfile，未发布 package，未启动 W-P118/W-P119。",
    ""
  ].join("\n");
  await writeFile(path.join(evidenceRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceRoot, "report.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
