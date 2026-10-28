# Generated binding host projection: TypeScript migration

`GeneratedDocumentationBindingHostProjection.bindingContractVersion` and the
return value of `createGeneratedDocumentationBindingHostProjection()` expose
`"0.1.0-draft" | "0.2.0-draft" | "0.3.0-draft"`.

Old callers that assign either value to the two-version union receive TS2322.
Old exhaustive branches need an additional case. Preserving legacy artifact
readers does not make this source change backward compatible.

```ts
switch (projection.bindingContractVersion) {
  case "0.1.0-draft": // Historical binding / historical map.
    break;
  case "0.2.0-draft": // Binding paired with documentation map 1.0.0.
    break;
  case "0.3.0-draft": // Binding paired with documentation map 1.1.0.
    break;
  default: {
    const unsupported: never = projection.bindingContractVersion;
    throw new Error("Unsupported binding version");
  }
}
```

Use an explicit runtime guard when a host intentionally accepts only legacy
relations. Do not hide the new value with a type assertion or an inaccurate narrow
overload: a broad index may contain the new pair. The projection's own
`contractVersion: "0.1.0-draft"` is independent of `bindingContractVersion`.

This is an unreleased source change for a separately qualified new package
identity; the planned stable package target is `1.0.0`. Do not republish the
checked-in `@hia-doc/source-linkage@0.1.1` with this payload. Generated binding
artifacts remain drafts; package and artifact versions have separate gates.

中文：宿主投影保留真实三版本联合；旧两值赋值与穷尽分支需要显式源码迁移。
旧工件运行可读不代表旧TypeScript源码完全兼容，目标包1.0.0、工件草案和实际npm发行分别管理。
