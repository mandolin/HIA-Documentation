# @hia-doc/jsondoc

Generate complete JSON resource documentation with HIA core documents and exact source maps. Objects, arrays, unknown fields and scalar lexemes retain their original identities and source positions.

中文摘要。本包为JSON资源生成完整值树文档和精确来源。原始数值、特殊键、数组和未知字段均保留，调用方负责授权与公开审查。

## Install

```sh
npm install @hia-doc/jsondoc
```

Requires Node.js `^22.23.4 || ^24.22.1`. Package version `1.0.0` is a release candidate in the source distribution. Registry availability follows the release manifest.

## In-memory API

```js
import { generateJsonDocumentation } from '@hia-doc/jsondoc';

const result = generateJsonDocumentation(
  '{"count":9007199254740993,"values":[true,null]}',
  { path: 'schemas/example.json', locale: 'en' }
);

// HIA core 1.0.0, doc-source-map 1.1.0, and one unchanged source text.
console.log(result.document, result.sourceMap, result.sourceText);
```

`locale` explicitly identifies the actual content language. Values retain their original text. Translation is supplied by the resource owner. Each value becomes a symbol and navigation node, identified by the resource path and RFC 6901 JSON Pointer. Scalar `metadata.json.lexeme` preserves numeric precision, exponent spelling, negative zero and original string escaping. Containers retain ordered children. `sourceText` holds the complete original resource once.

Source positions use one-based physical CRLF/LF/CR lines, one-based UTF16 columns and exclusive endpoints. The source map declares `utf16-code-unit`. Unicode separators inside JSON strings retain their physical column positions.

`$ref` and `$dynamicRef` occurrences retain their original values and pointer context as `lexical-occurrence`. Schema vocabulary evaluation and reference traversal require a separately verified schema-aware consumer. Processing performs no network requests.

## SDK producer

```js
import { jsonDocumentationProducer } from '@hia-doc/jsondoc';
import { runDocumentationProducer } from '@hia-doc/plugin-sdk';

const result = await runDocumentationProducer(jsonDocumentationProducer, {
  workspaceRoot: '/authorized/project',
  outputDirectory: '/authorized/output',
  inputs: [{ kind: 'json-resource', path: 'schemas/example.json', locale: 'en' }]
});
```

The producer writes a unique batch directory containing a core document, a source map and an exact `.source.json` snapshot per input. It processes resources individually, validates the SDK result and commits the batch by renaming its staging directory. Failed batches remove their own staging directory. Concurrent calls and retries retain independent batches. Cancellation is checked before each resource and before commit. The SDK may report late cancellation after a completed filesystem commit, so callers retain responsibility for abandoned successful batches.

The existing `hia docs build --project-manifest` loader accepts the built module and `exportName: "jsonDocumentationProducer"` as an explicit producer. The manifest uses `inputs` with the same `kind`, `path` and `locale` fields.

## Input and publication boundaries

Inputs use strict UTF8 and JSON. Comments, trailing commas, BOMs, duplicate decoded object keys and malformed text are rejected. Each resource is limited to 4MiB, 128 container levels, 250,000 syntax tokens and 100,000 values. Aggregate per-value path and JSON Pointer length is limited to 2,000,000 UTF16 units per resource to bound expansion of deeply nested long keys. Public resource paths are limited to 4,096 UTF16 units. A producer batch accepts at most 100 explicit inputs.

File inputs must be single-link regular files beneath the authorized root. Directory junctions, symlinks, traversal and concurrent file changes are rejected. Output parents undergo physical-path checks. Diagnostics omit raw input and operating-system exception text.

The complete resource, including examples and unknown fields, appears in the generated content and source snapshot. Callers must review those resources for public disclosure. Runtime authorization comes from the host. API type declarations and package availability do not grant publication permission.

## License

MIT. JSON parsing uses Microsoft's `jsonc-parser@3.3.1` under MIT.
