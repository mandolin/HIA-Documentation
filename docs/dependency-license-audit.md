# Dependency And License Audit

This audit records the direct external dependencies and pinned tools used by `main-repo`.

The release gate runs:

```bash
pnpm run license:audit
```

The check fails when a new external direct dependency appears in any `package.json`, or an audited platform SDK changes, without a matching record here and in `scripts/check-dependency-license-audit.mjs`.

## Policy

Allowed license families for direct dependencies:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC

Restricted license families require explicit maintainer approval before use:

- GPL
- AGPL
- LGPL
- SSPL
- BUSL / BSL
- Proprietary platform SDK licenses

The current audit is direct-dependency focused. A full transitive SBOM is deferred until the package boundaries and publication targets are more stable.

Dependency review is also a security review. New external dependencies must record runtime impact, maintenance status, security considerations and alternatives in `docs/dependency-review-template.md` before landing.

Generated dependency trees under `apps/**/.runtime`, `node_modules`, `bin`,
`obj`, and `dist` are excluded from the direct source-manifest traversal.
They do not define new direct workspace dependencies. Packaging evidence must
instead enumerate the deployed package name, version, and license set before a
VSIX or similar artifact is released.

中文说明：`apps/**/.runtime` 等目录是由已审计 workspace 依赖生成的发布
staging，不属于新的源码直接依赖声明。W-P51.4 的 Visual Studio VSIX staging
当前包含 13 个唯一 package/version，许可证均为 MIT；未来公开发布 VSIX 前仍
需生成完整 transitive SBOM 并再次复核。

## Pinned Tools

| Tool | Version | Purpose | License |
| --- | --- | --- | --- |
| `node` | `20.20.2` | Pinned runtime for local development and CI parity. | MIT |
| `pnpm` | `10.34.4` | Pinned workspace package manager. | MIT |

## Direct Dependencies

| Dependency | Declared As | Version Range | Purpose | License |
| --- | --- | --- | --- | --- |
| `@jridgewell/trace-mapping` | `dependencies` | `^0.3.31` | Ordinary source map generated/original position lookup for `@hia-doc/source-linkage`. | MIT |
| `@types/node` | `devDependencies` | `^20.19.43` | Node.js 20 type definitions for workspace packages and tests. | MIT |
| `@types/vscode` | `devDependencies` | `^1.92.0` | VS Code extension API type definitions. | MIT |
| `tsx` | `devDependencies` | `^4.23.0` | Development-time TypeScript CLI runner for package scripts. | MIT |
| `typescript` | `devDependencies` | `^6.0.3` | TypeScript compiler and declaration output. | Apache-2.0 |
| `vitest` | `devDependencies` | `2.1.9` | Unit and integration test runner. | MIT |
| `vscode-languageclient` | `dependencies` | `^9.0.1` | VS Code extension client for connecting to the HIA LSP server. | MIT |
| `vscode-languageserver` | `dependencies` | `^9.0.1` | LSP transport and protocol types for `@hia-doc/lsp`. | MIT |
| `vscode-languageserver-textdocument` | `dependencies` | `^1.0.12` | In-memory text document model for LSP document handling. | MIT |

## Approved Platform SDK Dependencies

These dependencies are not part of the permissive open-source allowlist. They are accepted only within the stated platform boundary.

| Dependency | Ecosystem | Version | Purpose | License | Approval |
| --- | --- | --- | --- | --- | --- |
| `Microsoft.VisualStudio.Extensibility.Sdk` | NuGet | `17.14.40608` | Compile the out-of-process HIA Visual Studio extension. `PrivateAssets=all`; no standalone SDK redistribution. | Microsoft Visual Studio Add-ons and Extensions | Explicit maintainer approval, 2026-07-28 |
| `Microsoft.VisualStudio.Extensibility.Build` | NuGet | `17.14.40608` | Generate the VSIX and Visual Studio contribution metadata. `PrivateAssets=all`; no standalone SDK redistribution. | Microsoft Visual Studio Add-ons and Extensions | Explicit maintainer approval, 2026-07-28 |

中文说明：以上两个 NuGet 包是 Visual Studio 平台构建 SDK，不属于 MIT/Apache/LGPL 等开源许可证。维护者已明确批准在 `PrivateAssets=all`、仅与合法 Visual Studio 产品配合使用、且不独立再分发 SDK 的边界内采用。未来公开发布 VSIX 或进入 Marketplace 前仍需再次复核发布材料。

## Internal Workspace Dependencies

Dependencies declared as `workspace:*` or named under `@hia-doc/*` are internal workspace links and are not treated as third-party dependencies by this audit.

## Adding A Dependency

Before adding a new external dependency:

1. Fill out `docs/dependency-review-template.md`.
2. Prefer MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause or ISC.
3. Update this audit table.
4. Update `scripts/check-dependency-license-audit.mjs`.
5. Run `pnpm run license:audit` and `pnpm run release:gate`.

Do not add dependencies only for release automation if an official platform mechanism covers the same need. For npm publication automation, prefer npm Trusted Publishing over long-lived npm token storage.
