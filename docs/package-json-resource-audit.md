# JSON resource auditing

Audit declared JSON package exports from the explicit required-package inventory.
The command reads resource files and records their original bytes, value
locations and identity fields.

```powershell
node scripts/audit-required-json-resources.mjs --workspace-root ..
```

The current repository must have its existing distribution files available.
Each successful invocation writes a unique `dist/required-json-resources-*`
directory containing `report.json`. Package manifests and source bytes have
separate SHA-256 records.

Every JSON value receives an RFC 6901 pointer, an original source range and a
value-span digest. Scalar records preserve their original lexemes, including
large integers, exponent notation and negative zero. Coordinates use one-based
UTF-16 columns with exclusive ends. Physical lines use CRLF, LF or CR. Unicode
line separators inside strings retain their character positions. Empty keys, Unicode keys, slashes and tildes
retain their actual pointer identity.

Input checks cover strict UTF-8, JSON syntax, duplicate decoded object keys,
physical path containment and regular single-link files. Current inspection
budgets are 4 MiB per file, 250,000 syntax tokens, 128 nested containers and
100,000 value nodes.

`$ref` and `$dynamicRef` records describe lexical occurrences, including keys
inside ordinary data payloads. Their context remains available for subsequent
JSON Schema semantic checks. `coverageComplete` and `releaseProof` track the
separate documentation-production and release acceptance stages.

Run the focused regressions with
`node --test scripts/json-resource-audit.test.mjs`. The regular API check also
runs this suite.

中文：本审核逐资源保留原始摘要、全部值的标准Pointer、词法及精确位置。引用记录保留词法上下文，文档生产与发行验收分别跟踪。

## Documentation production

The generic [`@hia-doc/jsondoc`](../packages/jsondoc/README.md) package produces
core 1.0.0 documents, doc-source-map 1.1.0 artifacts and one unchanged source
snapshot per resource through the existing SDK 1.0.0 interface.

```powershell
node scripts/build-required-json-resources.mjs --workspace-root .. --locale und
```

The command processes the explicit 45-package scope, verifies produced values
against the independent TypeScript JSON audit and writes a unique
`dist/generated-json-resources-*` directory. `und` explicitly records an
unclassified content language. Choose an actual reviewed language where known.
Every raw value, pointer, hierarchy, source range, numeric lexeme and original
snapshot digest is compared. The four projection regressions also reject
omissions, changed numbers, incorrect parents and altered range conventions.

Schema-aware references, JavaScript export associations, content-language
review and generated-page design acceptance remain tracked separately in the
report. Lexical reference occurrences retain their original data contexts.

中文补充。生产与独立审核采用不同JSON解析链，当前45项必要包共享同一显式输入。报告逐值对账，正文语言由调用方声明。schema引用语义、JS导出关联与页面验收分别继续完成。
