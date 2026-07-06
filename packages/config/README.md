# @hia-doc/config

Shared configuration contract and loader for HIA documentation tools.

Current scope:

- Auto-discover `hia.config.json` from the current working directory.
- Load an explicit config through `--config <file>` callers.
- Validate the first JSON config contract.
- Provide diagnostics in the same shape used by `@hia-doc/core`.

The first contract is intentionally small. `hia.config.ts`, layered config merging and dynamic config evaluation are deferred.
