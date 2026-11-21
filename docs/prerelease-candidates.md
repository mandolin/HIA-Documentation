# Coordinated npm prerelease candidates

The [candidate plan](../release/prerelease-candidate.json) records the package names, repository sources, exact manifests, first-party dependency graph, distribution tag, and dependency-first order for the system prerelease. Each maintaining repository runs its candidate build against the source commit identified in the plan. The resulting GitHub Actions artifact contains that repository's tarballs and a receipt with the source and plan identities, registry observations, and archive hashes.

A candidate build has read-only repository permissions. It reads npm anonymously, checks the expected visibility and tags, and refuses an occupied candidate or stable target. It packs in an isolated checkout and retains the prerelease identity throughout first-party dependencies. The candidate tag is next. Regular stable release workflows retain their own inputs and lifecycle.

A subsequent publication decision uses the owner artifact and verifies its digest, version, registry state, and trusted publisher. Package availability and the actual publication attestation are only established once the registry operation succeeds. A first publication also requires an authorized creation path for the scope.

中文说明。统一候选清单固定各包的维护仓、来源提交、依赖、顺序和 next 标签。各仓独立从批准来源生成候选归档及收据，构建以只读权限核 npm 现状，正式发行仍沿维护仓的既有审批路径。
