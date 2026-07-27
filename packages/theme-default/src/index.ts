export const DEFAULT_THEME_CSS_PATH = "assets/hia-default.css";
export const DEFAULT_THEME_JS_PATH = "assets/hia-default.js";

export interface HiaThemeAsset {
  path: string;
  contents: string;
  contentType: string;
}

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

export const DEFAULT_THEME_CSS = `
:root {
  color-scheme: light;
  --hia-bg: #f7f8fa;
  --hia-surface: #ffffff;
  --hia-border: #d7dde5;
  --hia-text: #172033;
  --hia-muted: #5d6b82;
  --hia-accent: #087f7a;
  --hia-accent-soft: #dff4ef;
  --hia-code-bg: #101820;
  --hia-code-text: #d7f4ff;
  font-family: "Inter", "Noto Sans SC", "Source Han Sans SC", "Sarasa Gothic SC", sans-serif;
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
  background: #eef2f6;
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
  color: #ffffff;
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

.hia-project-search input:focus {
  border-color: var(--hia-accent);
  outline: 2px solid var(--hia-accent-soft);
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
  color: #9b2c2c;
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
  border-left: 3px solid #b42318;
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
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: .86rem;
  min-height: 2rem;
  padding: .35rem .65rem;
}

.hia-source-actions button:hover {
  background: #065f5b;
  border-color: #065f5b;
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

@media (max-width: 760px) {
  .hia-shell {
    display: block;
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
