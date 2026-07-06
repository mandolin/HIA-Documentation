# HIA Main Repo

`main-repo/` 是 HIA 文档工程化系统的核心 monorepo。

当前已建立 `S-sara-4` 的最小端到端链路。外层工作区仍只是 VS Code 容器，包管理器、lockfile、构建工具和后续 CI 入口都限制在本目录内部。

## 快速命令

```bash
mise install
corepack prepare pnpm@10.34.4 --activate
pnpm install
pnpm run build
pnpm run test:unit
pnpm run test:e2e
pnpm run check
pnpm run hia -- --help
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-en --locale en
```

## 子目录

- `packages/`: 核心模型、插件 SDK、解析器、渲染器、主题和 LSP。
- `plugins/`: 官方内置插件或示例插件。
- `apps/`: VS Code 插件、桌面端等应用壳。
- `web/`: 官网、文档站、在线演示等 Web 入口。
- `examples/`: 使用样例和插件作者示例。
- `fixtures/`: 解析器、渲染器和兼容性测试用例。
- `tests/`: 跨包集成测试。
- `tools/`: 维护、构建、发布、代码生成等脚本。
- `docs/`: 主仓库公开或内部工程文档。

## 重点包占位

- `packages/core`: 语言无关、IDE 无关、渲染器无关的 HIA 文档模型和协议。
- `packages/parser-jsdoc`: JSDoc Integration JSON 到 HIA core IR 的底层适配。
- `packages/lsp`: 面向多 IDE 的 LSP diagnostics 与服务入口。
- `packages/renderer-html`: HIA HTML 渲染协议。
- `packages/theme-default`: HIA 默认主题。
- `apps/cli`: HIA 命令行入口。

JSDoc 用户侧集成包放在 `../HIA/jsdoc-plugin-hia-sys/`，JSDoc 主题放在 `../HIA/jsdoc-theme-hia/`，它们作为官方卫星项目独立发布和联调。

## 当前能力

- `@hia-doc/core`: 最小 HIA IR、字段级 i18n、source metadata、fixture helper 和轻量 validator。
- `@hia-doc/parser-jsdoc`: 将 `jsdoc-plugin-hia-sys` 的 HIA Integration JSON 转换为 core document，并清理本机绝对路径。
- `@hia-doc/lsp`: 最小 LSP 服务骨架与 diagnostics 内核，直接消费 core document。
- `@hia-doc/theme-default`: 默认 CSS/JS 静态主题资产。
- `@hia-doc/renderer-html`: 从 core document 生成 `index.html`、默认主题资产和 renderer manifest，支持字段级 i18n、source preview、source references 和最小语言切换。
- `@hia-doc/cli`: 提供 `hia --help` 和 `hia docs build --input <file> --out <dir> [--locale <locale>] [--manifest <file>]`，默认输出 `hia-manifest.json`。

CLI 生成物当前包含 `index.html`、`assets/hia-default.css`、`assets/hia-default.js` 和 `hia-manifest.json`。端到端测试会检查这些文件以及生成物中不泄露本机绝对路径。

## 本地工具版本

`main-repo/.mise.toml` 固定 Node.js 和 pnpm 版本。外层工作区不设置 mise 配置，避免影响 `HIA/*` 卫星仓库。
