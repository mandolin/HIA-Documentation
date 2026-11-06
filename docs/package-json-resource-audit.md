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

## Static schema export associations

Compare satellite JavaScript schema-named exports with declared JSON resources
and the actual generated core documents and source maps.

```powershell
node scripts/audit-schema-resource-associations.mjs --workspace-root .. --inspect
```

The command writes an independent `dist/schema-resource-association-*` report.
It reads explicit module exports and aliases through TypeScript syntax and module
resolution. Target modules are never imported or executed. Matching requires
the complete value tree, actual generated artifacts and exact original member
declarations. A schema identifier only locates comparison candidates.

Supported declaration data includes const literals, object/array spreads,
unshadowed `Object.freeze`, `Object.values`, `Object.keys`, relative re-exports
and strict JSON imports. Source bytes, property locations and resolved variable
alias declarations retain their separate provenance. Numeric proof currently
covers exact safe integers. Resource lexemes are compared before numeric
rounding, including exponent notation.

Top-level data updates, clone/update initialization graphs, unknown calls,
getters, mutable bindings, redirected files and ambiguous export chains retain
explicit unverified results. Type-declaration branches are listed separately.
The report proves static declaration data, and records runtime state as
unverified. It also retains native-member gate adoption and page acceptance as
separate pending work. `--inspect` permits partial evidence collection. Without
it, any unverified binding or missing exact member declaration produces a
nonzero exit.

中文补充。该审核把真实JS声明、JSON资源和生成文档逐值连接，保留两类源码位置。静态数据证明与模块执行后状态分别记录。动态克隆修改、现有成员门禁采用、独立类型、schema引用及页面验收继续逐项处理。
