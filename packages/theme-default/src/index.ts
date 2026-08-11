/**
 * @lang zh-CN 默认主题 contract 的中性名称；包名与 CSS 命名空间不改变该协议身份。
 * @lang en Neutral name of the default-theme contract; neither the package name nor the CSS namespace changes this protocol identity.
 */
export const DOCUMENTATION_PORTAL_THEME_CONTRACT = "documentation-portal-theme";

/**
 * @lang zh-CN 默认主题 contract 的首个 exact draft 版本；未知版本不得按字符串猜测兼容。
 * @lang en First exact draft version of the default-theme contract; consumers must not infer compatibility for unknown versions.
 */
export const DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION = "0.1.0-draft";

/**
 * @lang zh-CN W-P104 首批稳定的 semantic color token 名称。
 * @lang en Stable semantic color-token names introduced by the W-P104 slice.
 */
export const DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES = [
  "canvas",
  "surface",
  "surfaceMuted",
  "border",
  "text",
  "textMuted",
  "accent",
  "accentContrast",
  "accentSoft",
  "accentHover",
  "focusRing",
  "codeBackground",
  "codeText",
  "danger"
] as const;

/**
 * @lang zh-CN 主题 contract 可识别的 semantic color token 名称。
 * @lang en Semantic color-token name recognized by the theme contract.
 */
export type DocumentationPortalThemeColorTokenName = typeof DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES[number];

/**
 * @lang zh-CN 一个完整 light 或 dark scheme 的颜色值；每项都按语义命名，不绑定具体组件。
 * @lang en Complete color values for one light or dark scheme; every field is semantic rather than component-specific.
 */
export type DocumentationPortalThemeColorTokens = Readonly<Record<DocumentationPortalThemeColorTokenName, string>>;

/**
 * @lang zh-CN renderer 与静态 portal 可投射的最小 theme reference；不包含颜色值、用户偏好或私有状态。
 * @lang en Minimal theme reference projected by renderers and static portals; it contains no color values, user preference, or private state.
 */
export interface DocumentationPortalThemeReference {
  /** @lang zh-CN exact contract 名称。 @lang en Exact contract name. */
  contract: typeof DOCUMENTATION_PORTAL_THEME_CONTRACT;
  /** @lang zh-CN exact contract 版本。 @lang en Exact contract version. */
  contractVersion: typeof DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION;
  /** @lang zh-CN 当前内置主题名称。 @lang en Name of the current built-in theme. */
  name: "default";
  /** @lang zh-CN 颜色模式只跟随系统 preference。 @lang en Color mode follows only the system preference. */
  colorSchemePolicy: "system";
  /** @lang zh-CN disclosure 由原生 details/summary 与 open attribute 负责。 @lang en Disclosure is owned by native details/summary and the open attribute. */
  disclosure: "native-details-summary";
}

/**
 * @lang zh-CN W-P104 默认主题的版本化 contract；它冻结 token、disclosure、兼容性和 privacy 边界。
 * @lang en Versioned W-P104 default-theme contract freezing token, disclosure, compatibility, and privacy boundaries.
 */
export interface DocumentationPortalThemeContract extends DocumentationPortalThemeReference {
  /** @lang zh-CN 支持的构建时 token sets。 @lang en Supported build-time token sets. */
  colorSchemes: readonly ["light", "dark"];
  /** @lang zh-CN light/dark 的完整 semantic token 值。 @lang en Complete semantic token values for light and dark schemes. */
  tokens: Readonly<Record<"light" | "dark", DocumentationPortalThemeColorTokens>>;
  /** @lang zh-CN 旧 CSS consumer 可继续使用的 additive alias。 @lang en Additive aliases retained for legacy CSS consumers. */
  legacyAliases: readonly string[];
  /** @lang zh-CN 原生 disclosure 的状态与 fallback policy。 @lang en State and fallback policy for native disclosure. */
  disclosurePolicy: {
    /** @lang zh-CN DOM 状态唯一来源。 @lang en Sole source of DOM state. */
    stateAuthority: "details-open-attribute";
    /** @lang zh-CN expanded/collapsed 由 HTML accessibility mapping 提供。 @lang en Expanded/collapsed state comes from the HTML accessibility mapping. */
    accessibilityState: "native-expanded-state";
    /** @lang zh-CN 原生 summary 不重复写 authored aria-expanded。 @lang en Native summaries do not duplicate authored aria-expanded. */
    authoredAriaExpanded: false;
    /** @lang zh-CN disclosure toggle 不依赖 JavaScript。 @lang en Disclosure toggling does not require JavaScript. */
    scriptRequired: false;
    /** @lang zh-CN 打印介质呈现折叠内容。 @lang en Print media reveals disclosure content. */
    printBehavior: "expand-content";
  };
  /** @lang zh-CN draft 演进与旧 CSS alias 规则。 @lang en Draft evolution and legacy CSS-alias rules. */
  compatibility: {
    /** @lang zh-CN draft consumer 只接受 exact version。 @lang en Draft consumers accept exact versions only. */
    exactDraftRequired: true;
    /** @lang zh-CN 新增 token 是兼容的 additive change。 @lang en Adding a token is a compatible additive change. */
    additiveTokenChange: "compatible";
    /** @lang zh-CN 删除、重命名或改变语义需要新 contract 版本。 @lang en Removal, rename, or semantic change requires a new contract version. */
    semanticTokenChange: "new-contract-version";
  };
  /** @lang zh-CN theme metadata 固定不携带的敏感类别。 @lang en Sensitive categories permanently excluded from theme metadata. */
  privacy: {
    /** @lang zh-CN 不嵌入源码正文。 @lang en Source bodies are not embedded. */
    sourceBodyIncluded: false;
    /** @lang zh-CN 不嵌入原始注释正文。 @lang en Raw comment bodies are not embedded. */
    rawCommentIncluded: false;
    /** @lang zh-CN 不嵌入主机绝对路径。 @lang en Host absolute paths are not embedded. */
    absolutePathIncluded: false;
    /** @lang zh-CN 不嵌入凭据或 secret。 @lang en Credentials and secrets are not embedded. */
    credentialIncluded: false;
    /** @lang zh-CN 不持久化或投射用户主题偏好。 @lang en User theme preferences are neither persisted nor projected. */
    persistedUserPreferenceIncluded: false;
  };
}

/**
 * @lang zh-CN 默认主题的 immutable-by-contract 描述；runtime consumer 不得原地改写。
 * @lang en Immutable-by-contract description of the default theme; runtime consumers must not mutate it in place.
 */
export const DEFAULT_DOCUMENTATION_PORTAL_THEME = {
  contract: DOCUMENTATION_PORTAL_THEME_CONTRACT,
  contractVersion: DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION,
  name: "default",
  colorSchemePolicy: "system",
  disclosure: "native-details-summary",
  colorSchemes: ["light", "dark"],
  tokens: {
    light: {
      canvas: "#f7f8fa",
      surface: "#ffffff",
      surfaceMuted: "#eef2f6",
      border: "#8793a5",
      text: "#172033",
      textMuted: "#4f5e75",
      accent: "#08736f",
      accentContrast: "#ffffff",
      accentSoft: "#d5f0eb",
      accentHover: "#065f5b",
      focusRing: "#005fcc",
      codeBackground: "#101820",
      codeText: "#d7f4ff",
      danger: "#9b2c2c"
    },
    dark: {
      canvas: "#10151f",
      surface: "#18202c",
      surfaceMuted: "#202a38",
      border: "#7b899d",
      text: "#eff4ff",
      textMuted: "#c6d0df",
      accent: "#6ee7da",
      accentContrast: "#061a19",
      accentSoft: "#153c3a",
      accentHover: "#9af2e8",
      focusRing: "#f7c948",
      codeBackground: "#090f17",
      codeText: "#d7f4ff",
      danger: "#ffb4ab"
    }
  },
  legacyAliases: [
    "--hia-bg",
    "--hia-surface",
    "--hia-border",
    "--hia-text",
    "--hia-muted",
    "--hia-accent",
    "--hia-accent-soft",
    "--hia-code-bg",
    "--hia-code-text"
  ],
  disclosurePolicy: {
    stateAuthority: "details-open-attribute",
    accessibilityState: "native-expanded-state",
    authoredAriaExpanded: false,
    scriptRequired: false,
    printBehavior: "expand-content"
  },
  compatibility: {
    exactDraftRequired: true,
    additiveTokenChange: "compatible",
    semanticTokenChange: "new-contract-version"
  },
  privacy: {
    sourceBodyIncluded: false,
    rawCommentIncluded: false,
    absolutePathIncluded: false,
    credentialIncluded: false,
    persistedUserPreferenceIncluded: false
  }
} as const satisfies DocumentationPortalThemeContract;

/** 默认主题 CSS artifact path。Default theme CSS artifact path. */
export const DEFAULT_THEME_CSS_PATH = "assets/hia-default.css";
/** 默认主题 JavaScript artifact path。Default theme JavaScript artifact path. */
export const DEFAULT_THEME_JS_PATH = "assets/hia-default.js";

/** 单个静态主题资源。One static theme asset. */
export interface HiaThemeAsset {
  /** @lang zh-CN renderer 输出中的相对资源路径。 @lang en Relative asset path in renderer output. */
  path: string;
  /** @lang zh-CN UTF-8 静态资源正文。 @lang en UTF-8 static asset body. */
  contents: string;
  /** @lang zh-CN 带字符集的 MIME 类型。 @lang en MIME type including its character set. */
  contentType: string;
}

/**
 * @lang zh-CN 返回不含 token 值的默认 theme reference 副本，供 renderer 安全投射。
 * @lang en Returns a copy of the default theme reference without token values for safe renderer projection.
 *
 * @returns 默认主题的公开 metadata-only reference。Public metadata-only reference for the default theme.
 */
export function getDefaultDocumentationPortalThemeReference(): DocumentationPortalThemeReference {
  return {
    contract: DEFAULT_DOCUMENTATION_PORTAL_THEME.contract,
    contractVersion: DEFAULT_DOCUMENTATION_PORTAL_THEME.contractVersion,
    name: DEFAULT_DOCUMENTATION_PORTAL_THEME.name,
    colorSchemePolicy: DEFAULT_DOCUMENTATION_PORTAL_THEME.colorSchemePolicy,
    disclosure: DEFAULT_DOCUMENTATION_PORTAL_THEME.disclosure
  };
}

/**
 * 返回 renderer 可直接分发的默认主题资源副本。
 * Returns default theme asset records ready for renderer distribution.
 */
export function getDefaultThemeAssets(): HiaThemeAsset[] {
  return [
    {
      path: DEFAULT_THEME_CSS_PATH,
      contents: DEFAULT_THEME_CSS,
      contentType: "text/css; charset=utf-8"
    },
    {
      path: DEFAULT_THEME_JS_PATH,
      contents: DEFAULT_THEME_JS,
      contentType: "text/javascript; charset=utf-8"
    }
  ];
}

/** 默认主题 CSS；Portal IA 仍依赖 native HTML disclosure，不声明 ARIA tree。Default-theme CSS; Portal IA keeps native HTML disclosure and makes no ARIA-tree claim. */
export const DEFAULT_THEME_CSS = `
:root {
  color-scheme: light dark;
  --hia-color-canvas: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.canvas};
  --hia-color-surface: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.surface};
  --hia-color-surface-muted: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.surfaceMuted};
  --hia-color-border: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.border};
  --hia-color-text: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.text};
  --hia-color-text-muted: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.textMuted};
  --hia-color-accent: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.accent};
  --hia-color-accent-contrast: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.accentContrast};
  --hia-color-accent-soft: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.accentSoft};
  --hia-color-accent-hover: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.accentHover};
  --hia-color-focus-ring: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.focusRing};
  --hia-color-code-background: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.codeBackground};
  --hia-color-code-text: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.codeText};
  --hia-color-danger: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light.danger};
  --hia-bg: var(--hia-color-canvas);
  --hia-surface: var(--hia-color-surface);
  --hia-border: var(--hia-color-border);
  --hia-text: var(--hia-color-text);
  --hia-muted: var(--hia-color-text-muted);
  --hia-accent: var(--hia-color-accent);
  --hia-accent-soft: var(--hia-color-accent-soft);
  --hia-code-bg: var(--hia-color-code-background);
  --hia-code-text: var(--hia-color-code-text);
  font-family: "Inter", "Noto Sans SC", "Source Han Sans SC", "Sarasa Gothic SC", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --hia-color-canvas: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.canvas};
    --hia-color-surface: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.surface};
    --hia-color-surface-muted: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.surfaceMuted};
    --hia-color-border: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.border};
    --hia-color-text: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.text};
    --hia-color-text-muted: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.textMuted};
    --hia-color-accent: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.accent};
    --hia-color-accent-contrast: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.accentContrast};
    --hia-color-accent-soft: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.accentSoft};
    --hia-color-accent-hover: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.accentHover};
    --hia-color-focus-ring: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.focusRing};
    --hia-color-code-background: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.codeBackground};
    --hia-color-code-text: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.codeText};
    --hia-color-danger: ${DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark.danger};
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--hia-bg);
  color: var(--hia-text);
  line-height: 1.55;
  overflow-x: hidden;
}

a {
  color: var(--hia-accent);
}

.hia-shell {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
  min-height: 100vh;
}

.hia-sidebar {
  border-right: 1px solid var(--hia-border);
  padding: 1.5rem;
  background: var(--hia-color-surface-muted);
}

.hia-project-split-site .hia-sidebar {
  height: 100vh;
  overflow: auto;
  position: sticky;
  top: 0;
}

.hia-sidebar nav ul,
.hia-project-summary ul {
  padding-left: 1.25rem;
}

.hia-sidebar nav li,
.hia-project-summary li {
  margin: .25rem 0;
}

.hia-sidebar nav a {
  display: grid;
  gap: .1rem;
  text-decoration: none;
}

.hia-sidebar nav small {
  color: var(--hia-muted);
  font-size: .72rem;
}

.hia-project-views {
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: .25rem;
  margin: 1rem 0;
}

.hia-project-view-button {
  appearance: none;
  background: var(--hia-surface);
  border: 1px solid var(--hia-border);
  border-radius: 6px;
  color: var(--hia-text);
  cursor: pointer;
  font: inherit;
  font-size: .86rem;
  line-height: 1.2;
  min-height: 2rem;
  padding: .35rem .65rem;
}

.hia-project-view-button span {
  display: inline-block;
  font-size: .72rem;
  margin-left: .35rem;
  opacity: .8;
}

.hia-project-view-button:hover {
  border-color: var(--hia-accent);
  color: var(--hia-accent);
}

.hia-project-view-button[aria-pressed="true"] {
  background: var(--hia-accent);
  border-color: var(--hia-accent);
  color: var(--hia-color-accent-contrast);
}

.hia-project-search {
  display: grid;
  gap: .35rem;
  margin: .75rem 0 1rem;
}

.hia-project-search span {
  color: var(--hia-muted);
  font-size: .82rem;
  font-weight: 700;
}

.hia-project-search input {
  background: var(--hia-surface);
  border: 1px solid var(--hia-border);
  border-radius: 6px;
  color: var(--hia-text);
  font: inherit;
  min-height: 2.25rem;
  padding: .45rem .6rem;
  width: 100%;
}

.hia-project-search input:focus-visible,
.hia-language-switch select:focus-visible {
  border-color: var(--hia-accent);
  outline: 3px solid var(--hia-color-focus-ring);
  outline-offset: 2px;
}

.hia-language-switch {
  display: grid;
  gap: .35rem;
  margin: 1rem 0;
}

.hia-language-switch label {
  color: var(--hia-muted);
  font-size: .82rem;
  font-weight: 700;
}

.hia-language-switch select {
  border: 1px solid var(--hia-border);
  border-radius: 6px;
  padding: .4rem .55rem;
  width: 100%;
}

.hia-main {
  max-width: 72rem;
  min-width: 0;
  width: 100%;
  padding: 2rem;
}

.hia-symbol {
  background: var(--hia-surface);
  border: 1px solid var(--hia-border);
  border-radius: 6px;
  margin: 1rem 0;
  min-width: 0;
  padding: 1rem;
}

.hia-project-meta,
.hia-project-meta dd,
.hia-project-entry,
.hia-project-entry a {
  min-width: 0;
  overflow-wrap: anywhere;
}

.hia-symbol h2 {
  margin: 0 0 .5rem;
}

.hia-kind {
  display: inline-block;
  border: 1px solid var(--hia-border);
  border-radius: 999px;
  color: var(--hia-muted);
  font-size: .78rem;
  padding: .05rem .45rem;
}

.hia-signature,
.hia-source-code {
  overflow-x: auto;
  border-radius: 6px;
  font-family: "Sarasa Mono SC", "Sarasa Fixed SC", "Noto Sans Mono CJK SC", "Source Han Mono SC", "Cascadia Code", "JetBrains Mono", "Fira Code", monospace;
}

.hia-signature {
  border: 1px solid var(--hia-border);
  padding: .5rem;
}

.hia-source-code {
  background: var(--hia-code-bg);
  color: var(--hia-code-text);
  padding: 1rem;
}

.hia-source-line {
  color: var(--hia-muted);
}

.hia-localized-text[hidden] {
  display: none;
}

.hia-fallback-badge {
  background: var(--hia-accent-soft);
  border-radius: 999px;
  color: var(--hia-accent);
  display: inline-block;
  font-size: .75rem;
  margin-left: .5rem;
  padding: .08rem .45rem;
}

.hia-i18n-fields,
.hia-source-section {
  border-top: 1px solid var(--hia-border);
  margin-top: 1rem;
  padding-top: 1rem;
}

.hia-i18n-fields h3,
.hia-source-section h3,
.hia-source-references h4 {
  margin: 0 0 .75rem;
}

.hia-i18n-field {
  display: grid;
  grid-template-columns: minmax(9rem, 14rem) minmax(0, 1fr);
  gap: .75rem;
  margin: .5rem 0;
}

.hia-i18n-field dt {
  color: var(--hia-muted);
  font-family: "Sarasa Mono SC", "Sarasa Fixed SC", "Noto Sans Mono CJK SC", "Source Han Mono SC", "Cascadia Code", "JetBrains Mono", "Fira Code", monospace;
  font-size: .85rem;
}

.hia-i18n-field dt,
.hia-i18n-field dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.hia-i18n-field dd {
  margin: 0;
}

.hia-source-preview,
.hia-source-fragment {
  margin: .75rem 0;
}

.hia-source-preview summary,
.hia-source-fragment summary {
  color: var(--hia-muted);
  cursor: pointer;
  font-family: "Sarasa Mono SC", "Sarasa Fixed SC", "Noto Sans Mono CJK SC", "Source Han Mono SC", "Cascadia Code", "JetBrains Mono", "Fira Code", monospace;
  font-size: .86rem;
  margin-bottom: .35rem;
}

.hia-source-unresolved {
  color: var(--hia-color-danger);
}

.hia-project-source-preview {
  margin-top: .75rem;
}

.hia-source-fetch-button,
.hia-project-secondary-action,
.hia-project-entry-link {
  appearance: none;
  border: 1px solid var(--hia-border);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.hia-source-fetch-button,
.hia-project-secondary-action {
  background: var(--hia-surface);
  color: var(--hia-text);
  min-height: 2rem;
  padding: .35rem .65rem;
}

.hia-project-secondary-action {
  margin-top: .75rem;
  width: 100%;
}

.hia-source-fetch-button:hover,
.hia-project-secondary-action:hover,
.hia-project-entry-link:hover {
  border-color: var(--hia-accent);
  color: var(--hia-accent);
}

.hia-project-entry-link {
  background: transparent;
  color: var(--hia-accent);
  padding: .15rem .2rem;
  text-align: left;
}

.hia-project-hierarchy-list details > summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: .4rem;
  justify-content: space-between;
  overflow-wrap: anywhere;
}

details > summary:focus-visible,
.hia-project-entry-link:focus-visible,
.hia-project-secondary-action:focus-visible,
.hia-project-view-button:focus-visible,
.hia-source-fetch-button:focus-visible {
  outline: 3px solid var(--hia-color-focus-ring);
  outline-offset: 2px;
}

.hia-project-hierarchy-list details[data-hia-active-ancestor="true"] > summary {
  background: var(--hia-accent-soft);
  border-radius: 4px;
  color: var(--hia-accent);
}

.hia-project-hierarchy-list [data-hia-active-entry="true"] > .hia-project-entry-link,
.hia-project-hierarchy-list [data-hia-active-entry="true"] > details > summary {
  font-weight: 700;
}

.hia-project-tree-open {
  flex: none;
  font-size: .78rem;
  padding: .18rem .45rem;
}

.hia-project-hierarchy-list details > ul {
  border-left: 1px solid var(--hia-border);
  margin-left: .25rem;
}

.hia-project-loading,
.hia-project-load-error {
  color: var(--hia-muted);
}

.hia-project-load-error {
  border-left: 3px solid var(--hia-color-danger);
  padding-left: .75rem;
}

.hia-source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .75rem;
}

.hia-source-actions button {
  appearance: none;
  background: var(--hia-accent);
  border: 1px solid var(--hia-accent);
  border-radius: 6px;
  color: var(--hia-color-accent-contrast);
  cursor: pointer;
  font: inherit;
  font-size: .86rem;
  min-height: 2rem;
  padding: .35rem .65rem;
}

.hia-source-actions button:hover {
  background: var(--hia-color-accent-hover);
  border-color: var(--hia-color-accent-hover);
  color: var(--hia-color-accent-contrast);
}

.hia-project-source-map-list {
  margin: .35rem 0 0;
  padding-left: 1rem;
}

.hia-project-groups h3 {
  color: var(--hia-muted);
  font-size: .82rem;
  margin: .75rem 0 .25rem;
}

.hia-project-group-list {
  list-style: none;
  padding-left: 0;
}

.hia-project-group-list li {
  align-items: baseline;
  display: flex;
  gap: .75rem;
  justify-content: space-between;
}

.hia-project-group-list strong {
  color: var(--hia-muted);
  font-size: .78rem;
}

.hia-project-relation-list {
  display: grid;
  gap: .5rem;
  list-style: none;
  padding-left: 0;
}

.hia-project-relation-list li {
  border-top: 1px solid var(--hia-border);
  display: grid;
  gap: .2rem;
  padding-top: .5rem;
}

.hia-project-relation-list small {
  color: var(--hia-muted);
  overflow-wrap: anywhere;
}

.hia-project-empty {
  color: var(--hia-muted);
  padding: 1rem;
}

.hia-project-topic-header {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: .45rem;
}

.hia-project-topic-header h2 {
  flex: 1 1 100%;
}

.hia-project-topic-section {
  border-top: 1px solid var(--hia-border);
  margin-top: 1rem;
  padding-top: 1rem;
}

.hia-project-topic-section > h3 {
  margin: 0 0 .65rem;
}

.hia-project-member-topics {
  display: grid;
  gap: .75rem;
}

.hia-project-member-topics > .hia-project-topic {
  border-left: 3px solid var(--hia-accent-soft);
  margin: 0;
}

.hia-project-unavailable {
  color: var(--hia-muted);
  font-style: italic;
}

@media (forced-colors: active) {
  :root {
    --hia-color-canvas: Canvas;
    --hia-color-surface: Canvas;
    --hia-color-surface-muted: Canvas;
    --hia-color-border: CanvasText;
    --hia-color-text: CanvasText;
    --hia-color-text-muted: CanvasText;
    --hia-color-accent: LinkText;
    --hia-color-accent-contrast: Canvas;
    --hia-color-accent-soft: Canvas;
    --hia-color-accent-hover: LinkText;
    --hia-color-focus-ring: Highlight;
    --hia-color-code-background: Canvas;
    --hia-color-code-text: CanvasText;
    --hia-color-danger: MarkText;
  }
}

@media print {
  :root {
    color-scheme: only light;
    --hia-color-canvas: #ffffff;
    --hia-color-surface: #ffffff;
    --hia-color-surface-muted: #ffffff;
    --hia-color-border: #000000;
    --hia-color-text: #000000;
    --hia-color-text-muted: #222222;
    --hia-color-accent: #000000;
    --hia-color-accent-contrast: #ffffff;
    --hia-color-accent-soft: #ffffff;
    --hia-color-code-background: #ffffff;
    --hia-color-code-text: #000000;
  }

  body,
  .hia-shell {
    background: #ffffff;
    color: #000000;
  }

  .hia-shell {
    display: block;
  }

  .hia-sidebar,
  .hia-project-split-site .hia-sidebar {
    border: 0;
    height: auto;
    max-height: none;
    overflow: visible;
    padding: 0;
    position: static;
  }

  .hia-main {
    max-width: none;
    padding: 0;
  }

  .hia-language-switch,
  .hia-project-search,
  .hia-project-secondary-action,
  .hia-project-views,
  .hia-source-actions {
    display: none !important;
  }

  details:not([open]) > *:not(summary) {
    display: block !important;
  }

  details > summary {
    color: #000000;
  }

  a {
    color: #000000;
    text-decoration: underline;
  }
}

@media (max-width: 760px) {
  .hia-shell {
    display: block;
  }

  /* <lang><zh-CN>窄屏把长字段键与正文改为单列，避免术语键撑大页面。</zh-CN><en>Stack long field keys and bodies on narrow screens so terminology keys cannot widen the page.</en></lang> */
  .hia-i18n-field {
    grid-template-columns: minmax(0, 1fr);
  }

  .hia-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--hia-border);
  }

  .hia-project-split-site .hia-sidebar {
    height: auto;
    max-height: 48vh;
    position: static;
  }

  .hia-main {
    padding: 1rem;
  }
}
`.trim();

/** 默认主题的最小 locale switch runtime。Minimal locale-switch runtime for the default theme. */
export const DEFAULT_THEME_JS = `
(() => {
  document.documentElement.dataset.hiaTheme = "default";

  const control = document.querySelector("[data-hia-locale-control]");
  const localizedBlocks = Array.from(document.querySelectorAll("[data-hia-locale]"));

  function applyLocale(locale) {
    document.documentElement.lang = locale;

    for (const block of localizedBlocks) {
      block.hidden = block.getAttribute("data-hia-locale") !== locale;
    }
  }

  if (control) {
    applyLocale(control.value);
    control.addEventListener("change", () => applyLocale(control.value));
  }
})();
`.trim();
