import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>所有输入与输出都固定在 main-repo；脚本不接受 target path、URL 或用户正文。</zh-CN><en>All inputs and outputs stay fixed inside main-repo; the script accepts no target path, URL, or user-authored body.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>可复跑产物只写入 ignored dist，避免把生成页面误纳入 package source。</zh-CN><en>Reproducible artifacts are written only to ignored dist so generated pages cannot enter package source accidentally.</en></lang>
const evidenceOutputDirectory = path.join(repositoryRoot, "dist", "wp104-portal-theme-interaction");

/**
 * @lang zh-CN 生成同时覆盖 semantic hierarchy 与 closed source disclosure 的 HIA-owned synthetic fixture。
 * @lang en Creates an HIA-owned synthetic fixture covering semantic hierarchy and a closed source disclosure.
 *
 * @returns {Record<string, unknown>} 只含 synthetic metadata/source body 的 renderer input。Renderer input containing only synthetic metadata and source body.
 */
function createFixture() {
  return {
    project: {
      id: "project:wp104-theme",
      name: "W-P104 Theme Fixture",
      title: "W-P104 主题与原生折叠夹具",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"]
    },
    entries: [
      {
        id: "entry:theme-module",
        name: "ThemeModule",
        kind: "module",
        view: "js",
        symbolId: "module:theme",
        summary: "主题 contract 入口。Theme contract entry.",
        semanticPath: [
          { kind: "repository", id: "wp104", label: "W-P104 Fixture" },
          { kind: "package", id: "theme-default", label: "@hia-doc/theme-default" },
          { kind: "contract", id: "theme-module", label: "ThemeModule" }
        ],
        source: {
          path: "src/theme-module.ts",
          language: "typescript",
          preview: {
            content: "export const themeContract = 'documentation-portal-theme';",
            language: "typescript",
            defaultExpanded: false,
            range: { start: { line: 1 }, end: { line: 1 } }
          }
        }
      },
      {
        id: "entry:resolve-theme",
        name: "resolveTheme",
        kind: "function",
        view: "js",
        symbolId: "module:theme:function:resolveTheme",
        hierarchy: { parentSymbolId: "module:theme" },
        summary: "解析系统主题偏好。Resolves the system theme preference.",
        semanticPath: [
          { kind: "repository", id: "wp104", label: "W-P104 Fixture" },
          { kind: "package", id: "theme-default", label: "@hia-doc/theme-default" },
          { kind: "contract", id: "theme-module", label: "ThemeModule" },
          { kind: "operation", id: "resolve-theme", label: "resolveTheme" }
        ],
        source: {
          path: "src/theme-module.ts",
          language: "typescript",
          preview: {
            content: "export function resolveTheme() { return 'system'; }",
            language: "typescript",
            defaultExpanded: false,
            range: { start: { line: 3 }, end: { line: 3 } }
          }
        }
      }
    ]
  };
}

/**
 * @lang zh-CN 从 renderer result 读取必需文件，缺失时 fail closed。
 * @lang en Reads a required file from a renderer result and fails closed when it is absent.
 *
 * @param {Record<string, unknown>} result renderer result。Renderer result.
 * @param {string} filePath renderer-relative path。Renderer-relative path.
 * @returns {string} 文件正文。File body.
 */
function readRenderedFile(result, filePath) {
  // <lang><zh-CN>按 exact relative path 查找，避免 basename collision。</zh-CN><en>Look up the exact relative path to avoid basename collisions.</en></lang>
  const file = result.files.find((candidate) => candidate.path === filePath);
  assert.ok(file, `Missing rendered file: ${filePath}`);
  return file.contents;
}

/**
 * @lang zh-CN 把 `#rrggbb` 转换为 WCAG relative-luminance channel。
 * @lang en Converts `#rrggbb` into WCAG relative-luminance channels.
 *
 * @param {string} color 六位十六进制颜色。Six-digit hexadecimal color.
 * @returns {[number, number, number]} linear RGB channels。Linear RGB channels.
 */
function toLinearRgb(color) {
  assert.match(color, /^#[0-9a-f]{6}$/iu);
  // <lang><zh-CN>三个 channel 从固定 hex pair 解析，不接受 alpha 或 shorthand。</zh-CN><en>Parse three channels from fixed hexadecimal pairs; alpha and shorthand are not accepted.</en></lang>
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
  return /** @type {[number, number, number]} */ (channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  )));
}

/**
 * @lang zh-CN 计算两个不透明 sRGB 颜色的 WCAG contrast ratio。
 * @lang en Calculates the WCAG contrast ratio between two opaque sRGB colors.
 *
 * @param {string} foreground 前景颜色。Foreground color.
 * @param {string} background 背景颜色。Background color.
 * @returns {number} 1 到 21 的 contrast ratio。Contrast ratio from 1 to 21.
 */
function calculateContrastRatio(foreground, background) {
  // <lang><zh-CN>luminance 权重来自 WCAG sRGB 定义。</zh-CN><en>Luminance weights follow the WCAG sRGB definition.</en></lang>
  const luminance = (color) => {
    const [red, green, blue] = toLinearRgb(color);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  // <lang><zh-CN>较亮/较暗排序让比值与参数顺序无关。</zh-CN><en>Ordering the lighter and darker values makes the ratio independent of argument order.</en></lang>
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @lang zh-CN 把 renderer files 安全写入一个固定 synthetic site root。
 * @lang en Writes renderer files safely below one fixed synthetic site root.
 *
 * @param {Record<string, unknown>} result renderer result。Renderer result.
 * @param {string} siteName 固定 site directory name。Fixed site-directory name.
 * @returns {Promise<void>} 写入完成。Write completion.
 * @lang zh-CN 副作用只发生在 ignored W-P104 dist directory。
 * @lang en Side effects are limited to the ignored W-P104 dist directory.
 */
async function writeRenderedSite(result, siteName) {
  // <lang><zh-CN>调用方只传固定字面量；额外断言防止未来改动引入 traversal。</zh-CN><en>Callers pass fixed literals; this additional assertion prevents future traversal regressions.</en></lang>
  assert.match(siteName, /^(split-site|single-page)$/u);
  // <lang><zh-CN>逐文件解析并验证仍位于 site root，再创建父目录。</zh-CN><en>Resolve every file, verify it remains below the site root, then create its parent directory.</en></lang>
  const siteRoot = path.join(evidenceOutputDirectory, siteName);
  for (const file of result.files) {
    const outputPath = path.resolve(siteRoot, file.path);
    assert.equal(outputPath.startsWith(`${path.resolve(siteRoot)}${path.sep}`), true);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, file.contents, "utf8");
  }
}

/**
 * @lang zh-CN 执行 W-P104 contract/token/renderer/no-script/print/browser-intake evidence。
 * @lang en Executes W-P104 evidence for contract, tokens, renderer, no-script, print, and browser intake.
 *
 * @returns {Promise<void>} evidence 生成完成。Evidence-generation completion.
 * @lang zh-CN 不访问网络、目标仓库、BP 仓库、凭据或用户 preference。
 * @lang en Does not access the network, target repositories, BP repositories, credentials, or user preferences.
 */
async function prepareEvidence() {
  // <lang><zh-CN>验证刚构建的可分发 owner entries，而不是 TypeScript 测试专用导入。</zh-CN><en>Validate freshly built distributable owner entries rather than test-only TypeScript imports.</en></lang>
  const renderer = await import(pathToFileURL(path.join(repositoryRoot, "packages", "renderer-html", "dist", "index.js")).href);
  const theme = await import(pathToFileURL(path.join(repositoryRoot, "packages", "theme-default", "dist", "index.js")).href);
  // <lang><zh-CN>同一 fixture 分别验证 explicit-IA split site 与 no-script-friendly single page。</zh-CN><en>Use the same fixture for an explicit-IA split site and a no-script-friendly single page.</en></lang>
  const fixture = createFixture();
  const splitResult = renderer.renderProjectHtmlDocument(fixture, {
    projectSite: {
      layout: "split-site",
      uiLocale: "zh-CN",
      informationArchitecture: {
        contract: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
        contractVersion: renderer.DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
        contentGrouping: "entry",
        loadingStrategy: "eager",
        memberPlacement: "separate"
      },
      source: { presentation: "embed", defaultExpanded: false }
    }
  });
  const singleResult = renderer.renderProjectHtmlDocument(fixture, {
    projectSite: {
      layout: "single-page",
      source: { presentation: "embed", defaultExpanded: false }
    }
  });

  // <lang><zh-CN>contract 与 reference 分开验证，确保 index 不复制 token values。</zh-CN><en>Validate contract and reference separately so indexes cannot copy token values.</en></lang>
  const themeContract = theme.DEFAULT_DOCUMENTATION_PORTAL_THEME;
  const themeReference = theme.getDefaultDocumentationPortalThemeReference();
  assert.equal(themeContract.contract, "documentation-portal-theme");
  assert.equal(themeContract.contractVersion, "0.1.0-draft");
  assert.equal(themeContract.disclosurePolicy.scriptRequired, false);
  assert.equal(themeContract.disclosurePolicy.authoredAriaExpanded, false);
  assert.equal("tokens" in themeReference, false);
  assert.deepEqual(Object.keys(themeContract.tokens.light).sort(), [...theme.DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES].sort());
  assert.deepEqual(Object.keys(themeContract.tokens.dark).sort(), [...theme.DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES].sort());

  // <lang><zh-CN>对每个 scheme 验证正文、muted、accent、pressed text 与 focus 的最低 contrast。</zh-CN><en>Check minimum contrast for text, muted text, accent, pressed text, and focus in each scheme.</en></lang>
  const contrast = Object.fromEntries(themeContract.colorSchemes.map((scheme) => {
    const tokens = themeContract.tokens[scheme];
    const facts = {
      textOnCanvas: calculateContrastRatio(tokens.text, tokens.canvas),
      mutedOnCanvas: calculateContrastRatio(tokens.textMuted, tokens.canvas),
      accentOnCanvas: calculateContrastRatio(tokens.accent, tokens.canvas),
      accentContrastOnAccent: calculateContrastRatio(tokens.accentContrast, tokens.accent),
      focusOnCanvas: calculateContrastRatio(tokens.focusRing, tokens.canvas),
      focusOnSurface: calculateContrastRatio(tokens.focusRing, tokens.surface)
    };
    assert.equal(facts.textOnCanvas >= 4.5, true);
    assert.equal(facts.mutedOnCanvas >= 4.5, true);
    assert.equal(facts.accentOnCanvas >= 4.5, true);
    assert.equal(facts.accentContrastOnAccent >= 4.5, true);
    assert.equal(facts.focusOnCanvas >= 3, true);
    assert.equal(facts.focusOnSurface >= 3, true);
    return [scheme, Object.fromEntries(Object.entries(facts).map(([name, value]) => [name, Number(value.toFixed(2))]))];
  }));

  // <lang><zh-CN>静态输出必须在 JavaScript 执行前就携带 exact theme identity。</zh-CN><en>Static output must carry the exact theme identity before JavaScript executes.</en></lang>
  const splitHtml = readRenderedFile(splitResult, "index.html");
  const singleHtml = readRenderedFile(singleResult, "index.html");
  const themeCss = readRenderedFile(singleResult, theme.DEFAULT_THEME_CSS_PATH);
  const projectIndex = JSON.parse(readRenderedFile(splitResult, "project-index.json"));
  for (const html of [splitHtml, singleHtml]) {
    assert.match(html, /data-hia-theme-contract="documentation-portal-theme"/u);
    assert.match(html, /data-hia-theme-contract-version="0\.1\.0-draft"/u);
    assert.match(html, /data-hia-theme-color-scheme-policy="system"/u);
    assert.doesNotMatch(html, /role="tree"/u);
    assert.doesNotMatch(html, /aria-expanded=/u);
  }
  assert.deepEqual(projectIndex.site.theme, themeReference);
  assert.deepEqual(splitResult.manifest.project.theme, themeReference);
  assert.match(singleHtml, /<details class="hia-source-preview(?:\s|")/u);
  assert.match(singleHtml, /<summary>/u);
  assert.match(themeCss, /@media \(prefers-color-scheme: dark\)/u);
  assert.match(themeCss, /@media \(forced-colors: active\)/u);
  assert.match(themeCss, /@media print/u);
  assert.match(themeCss, /details:not\(\[open\]\) > \*:not\(summary\)/u);

  await writeRenderedSite(splitResult, "split-site");
  await writeRenderedSite(singleResult, "single-page");

  // <lang><zh-CN>committed evidence 的 machine precursor 只保留闭集、count、boolean 与 contrast；真实浏览器观察另行记录。</zh-CN><en>The machine precursor for committed evidence retains only closed sets, counts, booleans, and contrast; real-browser observations are recorded separately.</en></lang>
  const evidence = {
    contract: "wp104-portal-theme-interaction-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-real-browser-gate",
    owners: ["@hia-doc/theme-default", "@hia-doc/renderer-html"],
    theme: {
      reference: themeReference,
      colorSchemeCount: themeContract.colorSchemes.length,
      semanticColorTokenCount: theme.DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES.length,
      legacyAliasCount: themeContract.legacyAliases.length,
      exactDraftRequired: themeContract.compatibility.exactDraftRequired,
      contrast
    },
    disclosure: {
      stateAuthority: themeContract.disclosurePolicy.stateAuthority,
      accessibilityState: themeContract.disclosurePolicy.accessibilityState,
      authoredAriaExpanded: themeContract.disclosurePolicy.authoredAriaExpanded,
      scriptRequired: themeContract.disclosurePolicy.scriptRequired,
      printBehavior: themeContract.disclosurePolicy.printBehavior,
      staticSinglePageDetails: true,
      roleTreeEmitted: false
    },
    renderer: {
      htmlRootReference: true,
      manifestReference: true,
      projectIndexReference: true,
      tokenValuesInProjectIndex: JSON.stringify(projectIndex.site.theme).includes("#")
    },
    css: {
      systemColorScheme: true,
      prefersDark: true,
      forcedColors: true,
      visibleFocus: themeCss.includes("--hia-color-focus-ring") && themeCss.includes(":focus-visible"),
      printDisclosureFallback: true
    },
    privacy: themeContract.privacy,
    browserGate: {
      scenarios: ["keyboard-enter-space", "accessibility-expanded-state", "javascript-disabled", "dark", "print", "narrow-viewport"],
      screenshotDirectory: "output/playwright/wp104",
      actualBrowserObserved: false
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      bpRepositoryRead: false,
      bpRepositoryWrite: false,
      networkAccessed: false,
      packagePublished: false,
      wp106Started: false
    }
  };
  assert.equal(evidence.renderer.tokenValuesInProjectIndex, false);
  assert.equal(Object.values(evidence.privacy).every((value) => value === false), true);

  const report = [
    "# W-P104 Portal 主题与原生折叠机器证据",
    "",
    "- 状态：`ready-for-real-browser-gate`",
    `- contract：\`${themeReference.contract}@${themeReference.contractVersion}\``,
    `- token：${evidence.theme.semanticColorTokenCount} semantic colors / ${evidence.theme.colorSchemeCount} schemes / ${evidence.theme.legacyAliasCount} legacy aliases`,
    "- disclosure：native details/summary，open attribute authority，无 authored aria-expanded，无脚本可切换。",
    "- CSS：system dark、forced-colors、visible focus 与 print disclosure fallback 已静态验证。",
    "- privacy：theme/index 不包含源码、raw comment、绝对路径、credential 或持久化 preference。",
    "- 下一门禁：使用真实 Chromium 验证 keyboard/accessibility/no-script/dark/print/narrow screenshots。",
    ""
  ].join("\n");
  await mkdir(evidenceOutputDirectory, { recursive: true });
  await writeFile(path.join(evidenceOutputDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceOutputDirectory, "report.md"), report, "utf8");
}

// <lang><zh-CN>顶层只输出固定完成/失败消息，不反射本地路径、fixture source 或 browser state。</zh-CN><en>The top level prints only fixed completion/failure messages and reflects no local path, fixture source, or browser state.</en></lang>
prepareEvidence().then(() => {
  console.log("W-P104 Portal theme interaction evidence generated.");
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "W-P104 Portal theme interaction evidence failed.");
  process.exitCode = 1;
});
