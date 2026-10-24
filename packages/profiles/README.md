# @hia-doc/profiles

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

## Status

The manifest is publishable. Source changes and local tarballs do not prove registry availability or stable-release qualification. Publication requires approved release versions, npm scope ownership, Trusted Publishing ownership and a registry install smoke. The package uses the MIT license.
