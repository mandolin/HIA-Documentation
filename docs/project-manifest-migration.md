# Project Manifest Migration

## Scoped aggregation

中文说明。独立文档使用相同原生符号标识时，显式采用清单 `1.1.0` 并提供稳定的
`identityScope`。同一输入展开的正文和地图继承该作用域。聚合按作用域、领域视图和
原生符号标识关联，保留原生 ID。仓库归属、导航标签及源码公开许可分别核验。

Use manifest `1.1.0` for explicit document identity scopes. The existing default
writer and schema key `project-manifest` retain `1.0.0`. The new schema key is
`project-manifest-scoped`, with canonical URI
`https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.1.0.schema.json`.
Configuration exports `HIA_PROJECT_MANIFEST_SCOPED_SCHEMA_VERSION`,
`HIA_PROJECT_MANIFEST_SCOPED_SCHEMA_ID` and `HIA_PROJECT_MANIFEST_SCOPED_JSON_SCHEMA`.

```json
{
  "schemaVersion": "1.1.0",
  "project": { "name": "Combined libraries" },
  "inputs": [
    { "kind": "documentation-producer-result", "path": "alpha/result.json", "identityScope": "package:alpha:public-api" },
    { "kind": "documentation-producer-result", "path": "beta/result.json", "identityScope": "package:beta:public-api" }
  ]
}
```

Scopes match `^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$`. Choose stable, public logical
identifiers from audited repository/package/module ownership. Temporary paths,
input order and display labels must not determine them. Scope assignment grants
no permission to read or publish sources.

An input's scope is inherited by its materialized documents and maps. Explicit
scoped inputs can coexist with legacy inputs. A scoped parent joins within the
same scope and view. .NET's explicit documentation IDs also resolve within this
boundary. Conflicting declarations within one identity fail before rendering.
Conflicting scoped map coordinates fail with
`HIA_CLI_PROJECT_SOURCE_MAP_AMBIGUOUS`. Identical canonical projections still
deduplicate. Legacy conflicting declarations fail with
`HIA_CLI_PROJECT_SYMBOL_ID_AMBIGUOUS` so independent documents can be assigned
explicit scopes.

An index containing scoped entries uses `hia-project-navigation-index`
`0.2.0-draft` and retains each entry's `identityScope`. Unscoped output retains
`0.1.0-draft`. Consumers should join scoped symbols by scope, view and native ID,
and use unique `entry.id` values for page and relation references. Colliding page
slugs receive deterministic opaque IDs. Reordering inputs preserves those IDs.
Rebuild indexes and presentation profiles together when adopting scopes.

Legacy manifests `0.1.0-draft` and `1.0.0` retain their interpretation of unknown
extensions. An `identityScope` extension in these versions remains inert. Upgrade
the manifest version explicitly and review its document/map grouping before
activation. Existing noncolliding legacy routes retain their IDs.

The default project-manifest **source contract candidate** is `1.0.0`, with the explicit scoped identity described above at `1.1.0`. The runtime reader also accepts exact `0.1.0-draft`. The checked-in `@hia-doc/config` package has source candidate `1.0.0`; registry availability and system release readiness are assessed separately.

中文摘要：项目清单源码契约候选为1.0.0，精确读取旧0.1.0-draft，不原地迁移清单。包版本、项目配置、文档配置运行时、生产器契约和实际发布身份各自独立；旧npm版本不能据此宣称含有本候选代码。

## Exact Versions and Fixed Schemas

| Identity | Definition |
| --- | --- |
| Current canonical | `https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.0.schema.json` |
| Fixed legacy canonical | `https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-0.1.0-draft.schema.json` |
| Runtime reader | Exact `1.0.0` and `0.1.0-draft` |

The new schema requires the new root version. The historical schema retains its original bytes and draft constraints. The current alias resolves to the current definition; it does not replace the historical identity. Unknown patches, minor versions, prereleases, build metadata and version-range strings are not automatically negotiated.

No field-removal migration is required. Existing valid bundled legacy fixtures remain readable. A caller that intends to create a new root can do so explicitly:

```js
import { HIA_PROJECT_MANIFEST_SCHEMA_VERSION, validateHiaProjectManifest } from "@hia-doc/config";

const legacy = {
  schemaVersion: "0.1.0-draft",
  project: { name: "Documentation example" },
  inputs: [{ kind: "hia-document", path: "artifacts/public.json" }]
};
const current = { ...legacy, schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION };
console.assert(validateHiaProjectManifest(legacy).length === 0);
console.assert(validateHiaProjectManifest(current).length === 0);
console.assert(legacy.schemaVersion === "0.1.0-draft");
```

This is a shallow copy: nested data retains its original ownership. The validator does not rewrite versions, insert defaults, sort references, clone metadata or freeze input. Its result is a new diagnostic array.

## Previously Missed Declared Constraints

Both admitted versions now receive the declared shape and lexical-safety checks. Do not treat an old permissive-validator result as proof that an invalid input matched its schema.

- Static input kinds and domains use their existing closed sets. Producer input kinds remain domain-specific nonempty strings.
- Optional declared strings, profile-reference shells, producer `exportName`/`options`/`profileIds`, source roots and project metadata are checked when present.
- At least one nonempty `inputs` or `producers` chain is required. A provided empty chain is invalid even when the other is populated; `profiles: []` remains valid.
- Producer identities must be unique within one manifest. `relations-only` remains restricted to `documentation-producer-result`; the new schema now expresses that existing runtime constraint too.
- Plain extension objects stay open. Their domain meaning and body privacy remain with the owner, while path-like producer input extensions retain their existing relative-locator constraints.

`HiaProjectDocsManifest` remains a loose declaration view with optional properties, useful for representing incomplete inputs. It is not a validated model or a type predicate. Keep decoded external data as `unknown` until checking diagnostics. The new exact-version type alias does not establish support for arbitrary strings.

## Profile References and Execution

Top-level `profiles[]` entries may contain only `profileId`, `profileVersion` and `layer` metadata. Without `path`, validation does not require a file and the CLI does not fetch one. A supplied safe local `path` permits the existing CLI loading path when the entry has an explicit `profileId`.

The reference shape retains optional metadata fields. An empty entry or one without `profileId` is inert in the current CLI; the reader does not invent its identity. References intended for consumption should provide `profileId` explicitly. In contrast, an individual `inputs[].profile` must provide `profileId` when present.

Profile structure, inheritance, tag/rule registries and profile-version negotiation belong to `@hia-doc/profile`. They are not validated or promoted by the project-manifest candidate. See [Official Profile Distribution](profile-distribution.md).

Producer modules remain explicit local paths. Validation does not discover/install packages, load a module or execute a shell. An actual CLI build performs the existing owner-authorized execution path. Failure-mode defaults and producer-output placement stay with that CLI path.

## Data, Paths and Diagnostics

The preflight accepts ordinary same-realm or null-prototype objects, dense standard arrays and finite JSON primitives. Shared acyclic data is allowed. Cycles, non-JSON values, custom serialization hooks, array-method shadowing and accessors—including hidden model accessors—are rejected without intentionally executing them. Reflection failures become generic invalid-input diagnostics. This is not a proxy execution sandbox; non-enumerable data and Symbol keys are outside the wire model.

Manifest locators are checked lexically for Windows/POSIX absolute paths, URI/drive prefixes, parent traversal and control characters. Producer workspace/root fields retain the documented `.` exception; ordinary artifact paths do not accept a literal `.`. These checks do not prove file existence, resolve symlinks, authorize source publication or interpret domain options. Paths resolve at the existing CLI consumption boundary, not during validation.

Generated diagnostics omit rejected path/version values. Unsafe dynamic extension names locate their safe parent rather than becoming public error paths. `options.targetPath` is different: it is a caller-owned prefix used unchanged in diagnostic `targetPath`/`path`. Callers must choose its publication scope. The validator does not automatically redact project names, prose, metadata or producer-owned diagnostic bodies.

JSON Schema and the runtime guard retain distinct scopes. The runtime guard checks locale membership, producer identity uniqueness and lexical/domain boundaries; it is not a general JSON Schema 2020-12 evaluator. The new canonical schema adds conditions and safer locator patterns without modifying the legacy definition.

For runnable inputs and output behavior, see [Project Manifest Guide](project-manifest-guide.md).
