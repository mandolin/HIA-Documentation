# Core Document Compatibility and Migration

The core document, text internationalization model, source provenance model and protocol envelope have **1.0.0 source contract candidates**. Package versions are separate: the current package manifest remains `@hia-doc/core@0.1.1`. A registry installation at that version does not acquire unreleased source changes. Use a reviewed source revision or its locally packed artifact for candidate evaluation.

中文摘要：本页的1.0.0是源码契约候选，不是已发布的软件包版本。核心文档及两个子模型精确兼容旧0.2.0；协议封装类型保留旧0.1.0。旧schema地址/原字节保留，校验不会原地改号。未知版本需要明确协商。其它核心领域契约仍按各自状态治理。

## Version Boundaries

| Surface | Current writer | Legacy support | Boundary |
| --- | --- | --- | --- |
| Core document | `1.0.0` | Exact `0.2.0` runtime reader | `HiaCoreContractVersion` / `validateHiaDocumentDetailed` |
| Text internationalization | `1.0.0` | Exact `0.2.0` runtime reader | `HiaTextI18nModelVersion` |
| Source provenance | `1.0.0` | Exact `0.2.0` runtime reader | `HiaSourceModelVersion` |
| Generic protocol envelope | `1.0.0` | Exact `0.1.0` type representation | `HiaProtocolEnvelopeVersion`; payload validation remains caller-owned |

Unknown patch, minor, prerelease, build-metadata and range strings are not implicit aliases for these exact document/submodel versions. The three document version lines are independent: a new root can contain a validated legacy submodel. Reader compatibility does not rewrite the root, submodel, artifact references or producer-owned metadata.

The envelope builder creates a generic **in-memory** shell. It preserves payload and diagnostic references, including payloads that are not JSON values. Neither the envelope type nor its builder validates arbitrary payloads or provides a JSON decoder.

## Canonical Schemas

- Current root: `https://mandolin.github.io/HIA-Documentation/schemas/hia-document-1.0.0.schema.json`.
- Historical root: `https://mandolin.github.io/HIA-Documentation/schemas/hia-document-0.2.0.schema.json`.

The new root schema requires `schemaVersion: "1.0.0"` and permits exact `1.0.0` / `0.2.0` text/source submodels. The old canonical schema retains its original bytes and `0.2.0` constraints. Using the current alias does not redirect an old fixed identity to a new definition.

JSON Schema and runtime validation have distinct scopes. A canonical schema checks its own exact root and keyword constraints; the runtime guard additionally checks source paths, safe integer positions, range order and resolved source-reference snapshots. The runtime guard is not a general JSON Schema 2020-12 evaluator. Root extension fields remain open.

## Reading and Creating Documents

```js
import assert from "node:assert/strict";
import {
  HIA_CORE_CONTRACT_VERSION,
  createHiaDocument,
  createHiaProtocolEnvelope,
  validateHiaDocumentDetailed
} from "@hia-doc/core";

const legacy = { ...createHiaDocument(), schemaVersion: "0.2.0" };
assert.equal(validateHiaDocumentDetailed(legacy).valid, true);

// Explicitly create a new root; keep the legacy input unchanged.
const current = { ...legacy, schemaVersion: HIA_CORE_CONTRACT_VERSION };
assert.equal(validateHiaDocumentDetailed(current).valid, true);
assert.equal(legacy.schemaVersion, "0.2.0");

const envelope = createHiaProtocolEnvelope("core-document", legacy);
assert.equal(envelope.schemaVersion, "1.0.0");
assert.equal(envelope.payload, legacy);
assert.equal(envelope.payload.schemaVersion, "0.2.0");
```

No field-removal migration is required for these candidates. Existing valid legacy fixtures remain readable. The explicit new-root copy above is not a deep clone: nested arrays, symbols and metadata retain their original ownership.

`createHiaDocument()` defaults to id `hia.document`, title `HIA Document`, default locale `en`, that locale's singleton list, and empty node/symbol arrays. Supplied collections and metadata retain their references. It builds a shell without validating or freezing caller input; validate before wire use.

Type aliases represent only admitted exact versions. Keep unknown decoded input typed as `unknown` and inspect validation results rather than treating arbitrary strings as established version types.

## Ordinary JSON Data

Document validation accepts finite primitives, dense standard arrays, ordinary objects and null-prototype objects with ordinary data properties. Shared acyclic objects are allowed. It rejects cycles, undefined values, functions, BigInt, non-finite numbers, class instances, sparse arrays, array-method shadowing, enumerable accessors and custom serialization hooks.

Metadata remains opaque domain data. Its declared object shape and JSON compatibility are checked; its keys and prose are not reinterpreted or automatically redacted. Unknown root extension fields are retained.

The graph preflight and node walker are iterative. Input is not cloned, frozen or mutated. Reflection failures become a generic `HIA_DOCUMENT_JSON_INVALID` diagnostic. Proxy traps can still have process-local side effects: this is not an execution sandbox. Non-enumerable object data and Symbol keys are outside the JSON wire contract.

## Text and Locale Selection

Free text can be empty, including symbol summaries, block/fragment/preview bodies, default text, language-block text, inline raw text and missing-resolution output. Identity tokens such as id, kind, title and field paths must satisfy their nonempty rules.

The field helper selects own `localizedText` values using:

1. Requested locale.
2. Its first primary-language segment.
3. Explicit fallback locales in order.
4. Default locale.

Duplicates retain their first position. An empty localized string is not a selected match. Inherited properties do not become documentation text or fields; explicitly owned special keys remain ordinary data.

This helper does not canonicalize language names, implement full RFC4647 subtag truncation, load external resources or reparse raw blocks/segments. Higher-level locale-resource contracts have their own capabilities. A missing selection returns empty text/resolved locale and explicit missing/fallback facts.

## Source and Diagnostic Boundaries

Source lines and optional columns remain one-based safe integers. Text offsets remain nonnegative safe integers, with end no earlier than start. Core does not convert existing adapter column/offset units or infer file lengths.

Source/resource locators are lexical project-relative paths. Drive/scheme prefixes, absolute paths and parent traversal are rejected. These checks do not resolve symlinks, prove files exist, authorize network access or publish source bodies. Source `mode` expresses consumption intent, not privacy permission.

`definedIn` is a location without source text. A named fragment requires its range. `primaryBlock: null` remains valid, while other present optional shells must have their declared shapes. A resolved source reference requires a fragment snapshot.

Guard-generated diagnostics omit unsupported model/version values and path-like dynamic map keys. Ordinary field names retain precise locations; unsafe dynamic keys locate the parent. Producer-provided diagnostic messages/data still need independent privacy review.

## Diagnostic and API Ownership

`createHiaDiagnostic` builds a new object with caller-supplied severity; it does not apply registry defaults or sanitize message/data. Data retains its reference. Empty optional paths are omitted; a nonempty targetPath also supplies path when no explicit path is supplied.

`getHiaDiagnosticCodeDefinition` returns the shared registry entry, not a clone. The registry and schema objects follow a read-only usage convention but are not runtime-frozen. Mutating them can affect later consumers.

The candidate review covers the seven foundation modules: model, protocol, i18n, diagnostics, schema, validator and fixture/build helpers. Other exported core-domain contracts keep their documented draft or experimental status; package/system release readiness is assessed separately.
