# Published JSDoc Usage

This guide shows the first published HIA adapter path using the public npm packages:

- `@mandolin/jsdoc-plugin-hia-sys`
- `@mandolin/jsdoc-theme-hia`

It covers both normal JSDoc standalone rendering and the HIA Integration artifact that can be consumed by the HIA CLI.

## Install

Install JSDoc, the HIA plugin and the HIA theme from the npm registry:

```bash
npm install --save-dev jsdoc @mandolin/jsdoc-plugin-hia-sys @mandolin/jsdoc-theme-hia
```

## Configure JSDoc

Create `jsdoc.conf.json`:

```json
{
  "plugins": ["node_modules/@mandolin/jsdoc-plugin-hia-sys/src/index.cjs"],
  "source": {
    "include": ["src"]
  },
  "opts": {
    "template": "node_modules/@mandolin/jsdoc-theme-hia",
    "destination": "docs/api",
    "recurse": true,
    "hia": {
      "mode": "standalone",
      "source": {
        "mode": "all",
        "link": {
          "enabled": true,
          "rootUrl": "https://github.com/example/project/blob/main",
          "openMode": "new-tab"
        },
        "preview": {
          "enabled": true,
          "defaultExpanded": false
        },
        "references": {
          "enabled": true,
          "defaultExpanded": false
        }
      },
      "i18n": {
        "enabled": true,
        "defaultLocale": "zh-CN",
        "fallbackLocale": "en",
        "locales": ["zh-CN", "en"],
        "mode": "runtimeSwitch",
        "resourceBasePath": ".",
        "resources": ["docs/i18n/docs.hia-i18n.json"]
      },
      "integration": {
        "enabled": true,
        "outputFile": "docs/api/hia-integration.json"
      }
    }
  }
}
```

## Add Source Metadata

Use normal JSDoc comments plus HIA metadata tags:

```js
/**
 * Builds a greeting.
 *
 * @param {string} name User name.
 * @returns {string} Greeting message.
 * @example <caption>Build a greeting</caption>
 * @coderef BUILD_GREETING
 * @hiaKey published.buildGreeting
 * @hiaPath publishedSmoke.buildGreeting
 * @lang zh-CN 构建一条可展示的问候消息。
 * @lang en Builds a display-ready greeting message.
 */
export function buildGreeting(name) {
  /* @codeblock BUILD_GREETING */
  const normalizedName = String(name || "HIA user").trim();
  return `Hello, ${normalizedName}`;
  /* @codeblockend BUILD_GREETING */
}
```

## Build Standalone Docs

Run JSDoc:

```bash
npx jsdoc -c jsdoc.conf.json
```

The theme writes:

- `docs/api/index.html`
- `docs/api/index.zh-CN.html`
- `docs/api/index.en.html`
- `docs/api/hia-theme.css`
- `docs/api/hia-theme.js`
- `docs/api/search-index.json`
- `docs/api/i18n-index.json`
- `docs/api/hia-metadata.json`
- `docs/api/hia-integration.json`

## Build HIA Docs From Integration JSON

The same `hia-integration.json` can be consumed by the HIA CLI:

```bash
hia docs build --jsdoc-integration docs/api/hia-integration.json --out docs/hia --locale zh-CN
```

This produces HIA renderer output:

- `docs/hia/index.html`
- `docs/hia/hia-manifest.json`
- `docs/hia/assets/hia-default.css`
- `docs/hia/assets/hia-default.js`

## Verify The Published Path

From `main-repo`, run the published package smoke test:

```bash
pnpm run smoke:published-jsdoc
```

The smoke test creates `dist/published-jsdoc-smoke`, installs the published npm packages from the official registry, builds standalone JSDoc output, feeds `hia-integration.json` into the HIA CLI and scans both outputs for local path leakage and legacy fields.
