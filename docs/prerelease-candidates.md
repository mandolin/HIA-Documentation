# Coordinated npm prerelease candidates

The [candidate plan](../release/prerelease-candidate.json) records the package names, repository sources, exact manifests, first-party dependency graph, distribution tag, and dependency-first order for the system prerelease. Each maintaining repository runs its candidate build against the source commit identified in the plan. The resulting GitHub Actions artifact contains that repository's tarballs and a receipt with the source and plan identities, registry observations, and archive hashes.

A candidate build has read-only repository permissions. It reads npm anonymously, checks the expected visibility and tags, and refuses an occupied candidate or stable target. It packs in an isolated checkout and retains the prerelease identity throughout first-party dependencies. The candidate tag is next. Regular stable release workflows retain their own inputs and lifecycle.

A subsequent publication decision uses the owner artifact and verifies its digest, version, registry state, and trusted publisher. Package availability and the actual publication attestation are only established once the registry operation succeeds. A first publication also requires an authorized creation path for the scope.

中文说明。统一候选清单固定各包的维护仓、来源提交、依赖、顺序和 next 标签。各仓独立从批准来源生成候选归档及收据，构建以只读权限核 npm 现状，正式发行仍沿维护仓的既有审批路径。

## Audit a candidate

In the package's maintenance repository, run **npm Trusted Publish** on `main` with **candidate-audit**. Enter a package name to check one candidate, or leave it empty to check the repository's full group. The audit verifies the prior successful build and checks the downloaded ZIP and tarball against the [custody manifest](../release/prerelease-custody.json). It reads npm version and tag state and reports whether the caller can exchange its GitHub OIDC identity for that package. For first publications it reports whether the repository supplies a credential and whether npm accepts it for authentication. A credential's creation scope requires separate verification.

Candidate publication requires pinned release approval, an explicit package and the confirmation phrase for the current version and tag. The workflow rejects earlier incomplete waves, occupied versions with different bytes, and changes to the original `latest` tag. A matching candidate can be reconciled without publishing it again. The current custody manifest enables the audit.

在候选包所属仓的 `main` 运行 **npm Trusted Publish**，选择 **candidate-audit**。输入包名可单独核验，留空则核验整仓。作业使用已验收的托管归档，校验来源、摘要、版本、标签与当前授权。首次公开的凭据认证状态不能替代 scope 创建权限证明。实际发行须另有固定审批，并核验前序波次、精确候选和既有标签。
