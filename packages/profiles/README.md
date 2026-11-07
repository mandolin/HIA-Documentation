# @hia-doc/profiles

## 1.0.0 source candidate

This source tree targets a coordinated 1.0.0 package candidate. It does not
announce npm availability. See the [package migration guide](../../docs/package-v1-migration.md)
for matching dependencies, artifact versions and source compatibility.

中文：当前为1.0.0源码候选，实际发布及工件版本请分别核对迁移说明。


Official documentation profile JSON, catalog metadata and defensive-copy accessors. Profile accessors and separately created runtime sets return independent profile copies. Catalog constants, the literal ID array and direct JSON module exports remain shared, unfrozen metadata and should be treated as read-only.

The bundled profile schema, catalog and individual profile versions remain `0.1.0-draft`; the `stable` layer name does not itself establish a stable release. Runtime inheritance/alias errors are reported through profile-set diagnostics. See [distribution and version boundaries](../../docs/profile-distribution.md) and [composition limits](../../docs/profile-composition.md).

The package is separate from `@hia-doc/profile`, which owns profile loading, validation and registry queries.

## API

```ts
import {
  createOfficialHiaProfileSet,
  getOfficialHiaProfile,
  listOfficialHiaProfiles
} from "@hia-doc/profiles";

const profile = getOfficialHiaProfile("cssdoc");
const profileSet = createOfficialHiaProfileSet();
const allProfiles = listOfficialHiaProfiles();
```

Every returned profile is a defensive copy. Callers may customize it without mutating the package-owned profile set.

## JSON Exports

Profiles and the catalog are available through explicit JSON subpaths:

```ts
import catalog from "@hia-doc/profiles/catalog.json" with { type: "json" };
import cssdoc from "@hia-doc/profiles/cssdoc.profile.json" with { type: "json" };
```

The distributed files use `documentation-profile@0.1.0-draft`. The runtime now exposes a separate `1.0.0` source schema candidate and retains an exact legacy reader; it does not rewrite these files. Domain-profile, schema, catalog and npm versions remain independent.

## Explicit TypeScript project profile

The generic TypeScript project chain has an independent `ts-jsdoc-bridge@0.2.0-draft` profile using the already supported `documentation-profile@1.0.0` structure. It declares extraction/bridge `0.2.0-draft`, HIA core document `0.2.0` and direct documentation source map `1.1.0`. Actual types and members remain visible. It does not claim JavaScript emission, native JSDoc execution or ordinary-map coordinate evidence.

```ts
import {
  getOfficialTsDocProjectProfile,
  createOfficialTsDocProjectProfileSet,
  HIA_TSDOC_PROJECT_PROFILE_CATALOG
} from "@hia-doc/profiles";
```

The first two functions return independent data. The explicit set selects the new TS profile and keeps the six original parent/peer versions. Existing getters, default sets and `catalog.json` retain their seven original profiles. A runtime set still admits only one version per identity; select the version before creating a set. Catalog constants and JSON imports remain shared metadata.

Explicit JSON subpaths are `@hia-doc/profiles/ts-jsdoc-bridge/0.2.0-draft.profile.json` and `@hia-doc/profiles/tsdoc-project/catalog.json`. The new catalog retains the existing catalog shape/version and describes only the new profile's schema. Neither a new profile nor the stable wire structure establishes a published npm package or stable domain-profile semantics.

## Status

The manifest is publishable. Source changes and local tarballs do not prove registry availability or stable-release qualification. Publication requires approved release versions, npm scope ownership, Trusted Publishing ownership and a registry install smoke. The package uses the MIT license.

## Structured TypeScript projects

Select getOfficialTsDocProjectProfile('0.3.0-draft') or createOfficialTsDocProjectProfileSet('0.3.0-draft') for structured type expressions. Omitted versions still select 0.2. The separate HIA_TSDOC_STRUCTURED_PROJECT_PROFILE_CATALOG and JSON subpaths ./ts-jsdoc-bridge/0.3.0-draft.profile.json and ./tsdoc-project/0.3.0-draft/catalog.json expose the new profile. Each set has one exact version per identity.

中文说明。0.3规范与目录须显式读取，原七规范默认和0.2项目目录保留。类型结构不意味着执行权限或发射证明。

## Generic and array type wrappers

Explicitly select `getOfficialTsDocProjectProfile('0.4.0-draft')` or `createOfficialTsDocProjectProfileSet('0.4.0-draft')` for generic applications, array elements and `readonly` operands. `HIA_TSDOC_WRAPPED_PROJECT_PROFILE_CATALOG`, `./ts-jsdoc-bridge/0.4.0-draft.profile.json` and `./tsdoc-project/0.4.0-draft/catalog.json` describe this exact profile. Target names record source syntax. Generic evaluation, inherited-member expansion and runtime identity remain outside this model.

中文说明。0.4 须显式选择，保留泛型目标与实参顺序、数组元素及 `readonly` 操作数。默认仍为 0.2，0.3 的读取与拒绝边界保持。详见主仓 `docs/sdk-type-wrappers.md`。
