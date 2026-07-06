# HIA Main Repo

`main-repo/` 是 HIA 文档工程化系统的核心 monorepo，包含语言无关 core model、共享配置、HTML renderer、CLI、LSP、VS Code 插件壳和 JSDoc adapter bridge。

外层工作区只是 VS Code 容器。包管理器、lockfile、构建工具和后续 CI 入口都限制在本目录内部。

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
pnpm run hia -- docs build --jsdoc-integration fixtures/jsdoc-integration.real-basic.json --out dist/jsdoc-docs --locale zh-CN
pnpm run hia -- docs build --config hia.config.example.json
```

## Contract Baseline

当前 core document schema 为 `0.2.0`。text i18n 与 source 子模型同为 `0.2.0`。config、renderer manifest、protocol envelope 和 JSDoc adapter bridge 当前为 `0.1.0`。

开发者入口：

- `docs/contract-index.md`: 主仓实现侧 contract 索引。
- `docs/core-fixture-contract.md`: core schema、fixture 和 validator contract。
- `docs/configuration.md`: `hia.config.json` 配置契约。
- `docs/adapter-authoring-notes.md`: adapter 作者指南。

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

## 包与应用

- `packages/core`: 语言无关、IDE 无关、渲染器无关的 HIA 文档模型和协议。
- `packages/config`: HIA 项目配置契约和加载器。
- `packages/parser-jsdoc`: JSDoc Integration JSON 到 HIA core IR 的底层适配。
- `packages/lsp`: 面向多 IDE 的 LSP diagnostics 与服务入口。
- `packages/renderer-html`: HIA HTML 渲染协议。
- `packages/theme-default`: HIA 默认主题。
- `apps/cli`: HIA 命令行入口。
- `apps/vscode-extension`: VS Code 插件壳，连接 `@hia-doc/lsp`。

JSDoc 用户侧集成包放在 `../HIA/jsdoc-plugin-hia-sys/`，JSDoc 主题放在 `../HIA/jsdoc-theme-hia/`，它们作为官方卫星项目独立发布和联调。

## 当前能力

- `@hia-doc/core`: HIA document/node/symbol model、field-level i18n、source metadata、diagnostic registry、protocol envelope、schema draft、fixture helper 和轻量 validator。
- `@hia-doc/config`: 加载并验证 `hia.config.json`，为 CLI、LSP 和 IDE 集成提供共享配置契约。
- `@hia-doc/parser-jsdoc`: 将 `jsdoc-plugin-hia-sys` 的 HIA Integration JSON 转换为 core document，并清理 metadata、diagnostic data 和本机路径。
- `@hia-doc/lsp`: 最小 LSP 服务骨架、diagnostics 内核和 resource index，自定义 request 为 `hia/documentResourceIndex`，只消费 core document。
- `@hia-doc/theme-default`: 默认 CSS/JS 静态主题资产。
- `@hia-doc/renderer-html`: 从 core document 生成 `index.html`、默认主题资产和 renderer manifest，支持字段级 i18n、source preview、source references 和语言切换。
- `@hia-doc/cli`: 提供 `hia --help` 和 `hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--out <dir>] [--locale <locale>] [--manifest <file>]`，可从 core document 或 JSDoc Integration JSON 生成文档，默认输出 `hia-manifest.json`。
- `@hia-doc/vscode-extension`: VS Code 开发版插件壳，激活 `.hia.json` 文件，通过 `vscode-languageclient` 启动 LSP，并提供 Build Docs、Open Preview、Validate Workspace 命令入口。

CLI 生成物当前包含 `index.html`、`assets/hia-default.css`、`assets/hia-default.js` 和 `hia-manifest.json`。端到端测试会检查这些文件以及生成物中不泄露本机绝对路径。

配置文件第一版见 `docs/configuration.md`，可运行示例见 `hia.config.example.json`。当前只支持 JSON 配置；`hia.config.ts`、多层合并和动态配置后移。

VS Code 插件手工验收步骤见 `docs/vscode-extension-manual-validation.md`。

## 本地工具版本

`main-repo/.mise.toml` 固定 Node.js 和 pnpm 版本。外层工作区不设置 mise 配置，避免影响 `HIA/*` 卫星仓库。
