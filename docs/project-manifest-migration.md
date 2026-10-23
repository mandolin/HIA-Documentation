# Project Manifest Migration

The current project-manifest **source contract candidate** is `1.0.0`. The runtime reader also accepts exact `0.1.0-draft`. This does not publish a new `@hia-doc/config` package: the checked-in package remains `0.1.5`, and package/system release readiness is assessed separately.

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
