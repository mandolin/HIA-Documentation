# Dependency Notes

This file records the initial dependency choices for the HIA main repository.

Current release-facing dependency, license and security policy is maintained in `docs/dependency-license-audit.md` and `docs/security-policy.md`. New external dependencies should first use `docs/dependency-review-template.md`, then update the audit script and documentation together.

| Dependency | Purpose | License |
| --- | --- | --- |
| `@jridgewell/trace-mapping` | Ordinary source map generated/original position lookup for `@hia-doc/source-linkage`. | MIT |
| `pnpm` | Workspace package manager, pinned through Corepack. | MIT |
| `typescript` | TypeScript compiler and declaration output. | Apache-2.0 |
| `vitest@2.1.9` | Unit tests for package boundaries and CLI smoke tests; pinned to a Node 20.9-compatible line. | MIT |
| `tsx` | Development-time TypeScript CLI runner. | MIT |
| `@types/node` | Node.js 20 type definitions. | MIT |
| `vscode-languageserver` | LSP transport and protocol types for `@hia-doc/lsp`. | MIT |
| `vscode-languageserver-textdocument` | In-memory text document model for LSP tests and server document handling. | MIT |
| `vscode-languageclient` | VS Code extension client for connecting to the HIA LSP server. | MIT |
| `@types/vscode` | VS Code extension API type definitions for `@hia-doc/vscode-extension`. | MIT |

The first runtime LSP dependencies are limited to `@hia-doc/lsp`. The diagnostics engine still consumes core documents and does not depend on any IDE-specific API.
VS Code extension-shell dependencies are limited to `apps/vscode-extension`; core, parser, renderer, CLI and LSP internals remain VS Code independent.

## Tool Versions

`main-repo/.mise.toml` pins:

- `node@20.20.2`
- `pnpm@10.34.4`

`package.json` keeps `packageManager: pnpm@10.34.4` so package-manager metadata and mise stay aligned.

## Release Gate

`pnpm run license:audit` checks the direct external dependency audit and is included in `pnpm run release:gate`.

## @astrojs/markdown-satteri 0.4.6

Purpose and runtime impact. Configure the existing Astro7.4.5 Markdown processor through its documented `markdown.processor` and `hastPlugins` API for static, keyboard-reachable table wrappers. The dependency is development-only, MIT, and pinned to the version already present in the current Astro tree.

Maintenance and security. This is the Astro-maintained processor. Inputs are repository Markdown. The table visitor queues a native `wrapNode` operation and preserves existing nodes, attributes and text. Configuration and real processor rendering have regression tests, followed by script-free browser checks.

Alternatives reviewed. Legacy rehype configuration requires an additional processor. The selected integration follows the current default processor and its documented native plugin API. [Official processor API](https://docs.astro.build/en/reference/markdown-processors/satteri/).

中文说明。采用当前Astro处理器的标准HAST接口，固定MIT开发依赖0.4.6用于构建及回归。输入为仓库文档，表格访问器保留原节点和内容，通过正常构建与无脚本浏览器验收。
