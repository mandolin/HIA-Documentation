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
