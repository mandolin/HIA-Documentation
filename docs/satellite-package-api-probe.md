# Satellite package API probe

The 32 required satellite tool packages use JavaScript or CommonJS implementation entries. Run the actual HIA JSDoc producer through the documentation producer SDK, then validate its integration, documentation source map, and core-document conversion:

```powershell
node scripts/probe-satellite-package-api.mjs --workspace-root ..
```

Build this repository first. The workspace container must contain the existing `HIA/hia-jsdoc` and `HIA/jsdoc-plugin-hia-sys` tool repositories with their dependencies installed. The fixed package scope is `reference/required-package-api.inputs.json`. This command loads the trusted HIA producer and plugin; it statically parses target source files and does not import or execute the documented packages. It does not install dependencies or accept target commands.

Each invocation writes a new `dist/satellite-api-probe-*` directory. Its `report.json` records source-byte hashes, repository references, artifact hashes, native producer status, integration-node counts and core-reader results. Existing output is not cleaned. Integration retains `hia-jsdoc-integration@0.1.0`; the separately enabled documentation source map uses `1.1.0`. Invalid JSDoc types fail the build rather than being tolerated by a lenient option.

A passing probe establishes parsing and artifact-reader compatibility, **not complete API documentation coverage**. The report explicitly keeps `coverageComplete: false`: public aliases and re-exports must still be joined to actual declarations and original comments; empty placeholders do not establish coverage. Independent declaration-file APIs, resource content, command documentation, translations and generated-page acceptance require separate verification. These counts must not be added to the core-package coverage report as a completed 44-package result.

For object parameters, prefer standard `@param {Object} [options]` plus individual typed properties such as `@param {string} [options.path]`. TypeScript record syntax such as `{path?: string}` is not accepted by the native JSDoc parser. Preserve optionality, defaults and field descriptions when correcting annotations.

Run the native rejection, field-preservation and no-target-execution regressions explicitly in PowerShell:

```powershell
$env:HIA_API_WORKSPACE_ROOT = (Resolve-Path ..).Path
node --test scripts/satellite-jsdoc-probe.test.mjs
```

These integration tests skip when the workspace variable is absent. A skip is not validation evidence; the satellite repositories are required for a real run.
