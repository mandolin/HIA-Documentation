# @hia-doc/profiles

Official documentation profile distribution for HIA documentation tools.

The package contains the stable and bridge profile JSON files proven by the main repository release gate. It is separate from `@hia-doc/profile`, which owns profile loading, validation and registry queries.

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

The distributed files use `documentation-profile@0.1.0-draft`. Profile contract versions are independent from the npm package version.

## Status

This workspace package is not yet a public npm release. The canonical `@hia-doc` scope and MIT license are approved; publication still requires operational npm scope ownership, stable owner/distribution package versions, Trusted Publishing ownership and a registry install smoke.
