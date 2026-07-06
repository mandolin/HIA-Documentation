# @hia-doc/config

Shared configuration contract and loader for HIA documentation tools.

Current scope:

- Auto-discover `hia.config.json` from the current working directory.
- Load an explicit config through `--config <file>` callers.
- Validate the first JSON config contract.
- Provide diagnostics in the same shape used by `@hia-doc/core`, including machine-readable `data` where useful.

The config package represents project/build profile settings. It does not add fields to the core document IR.

The first contract is intentionally small. `hia.config.ts`, layered config merging and dynamic config evaluation are deferred.

## Contract

The current JSON config schema version is exported as `HIA_CONFIG_SCHEMA_VERSION`.

See `docs/configuration.md` and `docs/contract-index.md` in the repository root for the current config boundary.
