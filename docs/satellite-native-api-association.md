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
