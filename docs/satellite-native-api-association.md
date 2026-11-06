# Native JavaScript declaration association

Use the original source declaration, rather than an entry-file placeholder, when checking JavaScript API documentation. Re-exporting a name does not establish that its original comments reached the generated documentation.

```powershell
node scripts/audit-satellite-native-api.mjs --workspace-root ..
```

Build this repository first and install the existing HIA JSDoc tool dependencies in the sibling `HIA/` repositories. The fixed required-package manifest controls the package scope. The command uses the actual HIA JSDoc producer through SDK 1.0.0 and never imports or executes the documented packages. Each invocation writes a unique `dist/satellite-native-api-*` directory.

An independent compiler inventory supplies expected public names and original source locations. Original JavaScript/CommonJS declaration files are then processed separately through native JSDoc so same-name declarations in different files retain their own artifact scope. The output keeps integration 0.1.0 and documentation source map 1.1.0, validates the map, and writes the actual adapter-generated core document beside the native artifacts.

Association requires the expected source file, declaration line and original declaration name. The corresponding core symbol must retain native parameter/return/property/example metadata, existing localized fields and source positions. A same-name entry placeholder, ambiguous candidate, missing native node or failed producer blocks that binding. Resolved declarations with no runtime value are identified separately by `declarationTypeOnly` and are not counted as JavaScript implementation exports. This flag describes the declaration, rather than establishing runtime availability through arbitrary TypeScript type-only re-export graphs. The report records input and artifact hashes; a repository revision and working-tree source bytes are separate provenance facts.

The default command exits nonzero when bindings are blocked. To inspect partial results explicitly:

```powershell
node scripts/audit-satellite-native-api.mjs --workspace-root .. --inspect
```

Inspection still reports every gap and keeps `coverageComplete: false`. Frozen historical schema files are not rewritten merely to add comments. Documentation-free native nodes that are absent from the current integration remain gaps; invented doclets or aliases cannot fill them. Callable signatures, complete comments/translations, declaration-file APIs, resource/command content and generated-page acceptance remain separate requirements.

For public historical aliases, a current compatibility module can maintain individual documentation while directly retaining the archived constant's value or schema object. Verify exact value/reference identity and unchanged public names; never clone or relabel the archive. Generated source positions then identify the actual documented compatibility declaration. This is distinct from inventing a documentation node for an unchanged undocumented source declaration.

Run the source-identity/field-loss regressions with `node --test scripts/jsdoc-api-bindings.test.mjs`. Actual native generation and structural JSDoc type checks are in the explicitly configured integration suite documented in [the satellite probe guide](satellite-package-api-probe.md).

The strict audit also rejects callable declarations whose native signatures are missing or lost during core conversion. It reports `callableBindings` and `callableSignatureGaps` separately. Signatures originate from verified native AST parameter ranges under the existing source-preview controls, with only explicitly documented return types. No return type is inferred; unsupported or unproven syntax remains a reported gap. This check does not complete nested member, type-only, translation or page acceptance.

## Nested object members

An explicit combined data mode also accepts verified Schema JSON content.

```powershell
node scripts/audit-satellite-native-api.mjs --workspace-root .. --members --schema-resources
```

The original `memberAudit` retains native JSDoc results. `schemaMemberAudit`
separately reports native content, actual Schema-resource content and unresolved
gaps. Data adoption requires actual JSON documentation/map artifacts, exact
member declarations and matching native source bytes. Callable members, failed
native production and native ambiguities retain their original requirements.

The current JSDoc config also requires its installed draft sidecar and independent
native-production/static-definition checks. Original type declarations can point
to a previous value's binding after a verified overwrite. Such links are recorded
as `previous-value-alias`, with exact predecessor selectors and current field
history. They do not replace current value sources.

Only Schema array-element boundaries covered by a verified complete JSON subtree
receive separate data coverage. Other type, recursive, dynamic and instance
boundaries remain unresolved. Any combined gap, boundary or required Schema
failure keeps the strict command nonzero. `--inspect` only collects partial
results. The command without `--schema-resources` retains native-only behavior.

中文说明。组合模式保留原生正文审核，另采纳真实JSON数据及精确来源证据。字段值
与原生注释分别计量，历史值别名关系单独留证。仅已核完整JSON子树的Schema数组
边界可登记数据覆盖，类型和其它未核范围继续阻断严格验收。

```powershell
node scripts/audit-satellite-native-api.mjs --workspace-root .. --members
```

Explicit member inspection adds a recursive, static compiler inventory and runs the same real JSDoc producer on additional declaration sources. Public access paths remain arrays of property names, separate from original implementation names and locations. Renamed references and shorthand properties retain their actual declarations; CommonJS namespace containers retain source-local identity instead of exposing compiler-internal absolute module names. Neither modules nor getters are executed. Repeated default/named aliases are access paths, rather than independent implementations.

`memberAudit` reports association and content gaps separately. An existing object description cannot replace a member's native declaration. Every associated member retains native metadata, localized fields and source information in the core document; callable members must also retain a source-proven signature. The report records `callablePaths` and `callableContentGaps` without implying that all property or resource content is complete.

Arrays, recursive types, unions/intersections, index signatures, dynamic types and constructed-instance content are explicit boundaries. These checks enumerate static object properties; they do not claim complete array contents, runtime discoveries, instance APIs or function return-object APIs. Enumeration over 32 path segments or 10,000 members per export fails explicitly. External or declaration-free properties remain unresolved rather than being treated as first-party coverage.

With `--members`, any member-content gap or recorded boundary makes the default command exit nonzero. Add `--inspect` only to inspect partial results; the report continues to mark incomplete coverage. The original command without `--members` retains the root-binding check. Run the member-inventory regressions with `node --test scripts/package-api-members.test.mjs`.

中文：显式成员审核保留访问路径和原实现两种事实，真实内容仍由JSDoc生成；可调用成员通过不代表schema数据、数组、动态/实例成员或完整译文通过。缺口与未展开边界使严格命令失败，inspect仅用于查看未完成结果。

When a runtime property references an imported value exposed through a
declaration-file entry, member inspection retains the JavaScript assignment as
its documentation source. This allows the property's actual JSDoc comment and
source range to be verified. References to runtime implementations continue to
resolve their original declarations. Declaration-file APIs have their own
coverage requirements.

Use separate canonical `@lang` tags for English and Simplified Chinese property
descriptions. Verify the generated `localizedText` fields for both languages
when checking bilingual completeness.

中文：运行时属性引用声明文件入口中的值时，成员审核保留JavaScript实际赋值来源并核对其原生注释。双语属性应逐语言使用独立@lang标签，并检查生成后的两种localizedText正文。
