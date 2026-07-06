# Dependency Notes

This file records the initial dependency choices for `S-sara-1`.

| Dependency | Purpose | License |
| --- | --- | --- |
| `pnpm` | Workspace package manager, pinned through Corepack. | MIT |
| `typescript` | TypeScript compiler and declaration output. | Apache-2.0 |
| `vitest@2.1.9` | Unit tests for package boundaries and CLI smoke tests; pinned to a Node 20.9-compatible line. | MIT |
| `tsx` | Development-time TypeScript CLI runner. | MIT |
| `@types/node` | Node.js 20 type definitions. | MIT |
| `vscode-languageserver` | LSP transport and protocol types for `@hia-doc/lsp`. | MIT |
| `vscode-languageserver-textdocument` | In-memory text document model for LSP tests and server document handling. | MIT |

`S-sara-6` introduces the first runtime LSP dependencies in `@hia-doc/lsp`. The diagnostics engine still consumes core documents and does not depend on any IDE-specific API.

## Tool Versions

`main-repo/.mise.toml` pins:

- `node@20.20.2`
- `pnpm@10.34.4`

`package.json` keeps `packageManager: pnpm@10.34.4` so package-manager metadata and mise stay aligned.
