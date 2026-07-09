# Dependency Notes

This file records the initial dependency choices for the HIA main repository.

Current release-facing dependency, license and security policy is maintained in `docs/dependency-license-audit.md` and `docs/security-policy.md`. New external dependencies should first use `docs/dependency-review-template.md`, then update the audit script and documentation together.

| Dependency | Purpose | License |
| --- | --- | --- |
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
