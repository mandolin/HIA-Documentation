# Dependency Notes

This file records the initial dependency choices for `S-sara-1`.

| Dependency | Purpose | License |
| --- | --- | --- |
| `pnpm` | Workspace package manager, pinned through Corepack. | MIT |
| `typescript` | TypeScript compiler and declaration output. | Apache-2.0 |
| `vitest@2.1.9` | Unit tests for package boundaries and CLI smoke tests; pinned to a Node 20.9-compatible line. | MIT |
| `tsx` | Development-time TypeScript CLI runner. | MIT |
| `@types/node` | Node.js 20 type definitions. | MIT |

No runtime dependency is introduced in `S-sara-1`; `core`, `renderer-html`, and `cli` use only local workspace packages and Node.js built-ins.

## Tool Versions

`main-repo/.mise.toml` pins:

- `node@20.20.2`
- `pnpm@10.34.4`

`package.json` keeps `packageManager: pnpm@10.34.4` so package-manager metadata and mise stay aligned.
