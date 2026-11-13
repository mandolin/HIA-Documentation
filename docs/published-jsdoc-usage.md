# Published JSDoc Usage

This guide covers the JSDoc adapter path using these independently versioned packages:

- `@mandolin/jsdoc-plugin-hia-sys`
- `@mandolin/jsdoc-theme-hia`

It covers both normal JSDoc standalone rendering and the HIA Integration artifact that can be consumed by the HIA CLI.

## Generated example

The website provides a standalone theme module/class example with fixed site navigation, native language pages and admitted source readers. The example uses pinned source candidates. Package versions available on npm are verified separately during release coordination.

- [English example](https://mandolin.github.io/HIA-Documentation/jsdoc/index.en.html)
- [简体中文示例](https://mandolin.github.io/HIA-Documentation/jsdoc/index.zh-CN.html)

## Install

For an available published cohort, inspect the exact plugin and theme versions
and their runtime requirements before installing JSDoc and both packages from
the npm registry. The unversioned command below selects registry tags:

```bash
npm install --save-dev jsdoc @mandolin/jsdoc-plugin-hia-sys @mandolin/jsdoc-theme-hia
```

### Current source candidates

The current 1.0.0 source candidates require a matching plugin, theme and HIA
CLI checkout. Verify registry availability independently. To try source
candidates before their publication, pack the plugin and theme checkouts into
an existing archive directory, then install those archives in a fresh sample
project. Replace every angle-bracket path with your actual local path:

```bash
npm pack <plugin-checkout> --ignore-scripts --pack-destination <archive-directory>
npm pack <theme-checkout> --ignore-scripts --pack-destination <archive-directory>
npm install --save-dev --ignore-scripts jsdoc@4.0.5 <plugin-archive.tgz> <theme-archive.tgz>
```

The plugin checkout is `mandolin/jsdoc-plugin-hia-sys`; the theme checkout is
`mandolin/jsdoc-theme-hia`. Keep the actual source commits and archive digests
with your sample. Run the following configuration and commands from the fresh
sample project's root. For the HIA step, invoke an installed matching CLI or
`node <built-core-checkout>/apps/cli/dist/index.js` followed by the same
`docs build` arguments. Node.js 22.23.4 and 24.22.1 are the supported source
validation runtimes. [Package identities and compatibility](compatibility-matrix.md).

中文说明。当前源码候选可先打包到独立目录，再在新的公开小样本项目安装。
记录插件、主题和主CLI的实际提交及归档摘要，完成配置后显式运行JSDoc和HIA命令。
安装脚本关闭后仍需运行这些生成命令。源码候选的npm可用状态另行核对。

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

If you keep the configured resource file, create
`docs/i18n/docs.hia-i18n.json` in the sample project:

```json
{
  "zh-CN": {"published.buildGreeting": {"text": "构建一条可展示的问候消息。"}},
  "en": {"published.buildGreeting": {"text": "Builds a display-ready greeting message."}}
}
```

The source below supplies its summary, parameter and return translations
directly. The resource file also demonstrates a keyed summary. To use only
source-local translations, remove the `resources` entry from the configuration.

## Add Source Metadata

Use normal JSDoc comments plus HIA metadata tags:

```js
/**
 * Builds a greeting.
 *
 * @param {string} name <lang><zh-CN>用户名称。</zh-CN><en>User name.</en></lang>
 * @returns {string} <lang><zh-CN>问候文本。</zh-CN><en>Greeting text.</en></lang>
 * @example <caption>Build a greeting</caption>
 * @coderef BUILD_GREETING
 * @hiaKey published.buildGreeting
 * @hiaPath publishedSmoke.buildGreeting
 * @lang zh-CN 构建一条可展示的问候消息。
 * @lang en Builds a display-ready greeting message.
 */
export function buildGreeting(name) {
  /* @codeblock BUILD_GREETING */
  // <lang><zh-CN>去除本次名称两端空白；缺省名称仅用于这条问候。</zh-CN><en>Normalize this call's input to a trimmed name, using the fallback only for this greeting.</en></lang>
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
