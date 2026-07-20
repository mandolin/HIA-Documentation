# @hia-doc/provider-mock

Deterministic offline provider for HIA review-only provider workflows.

The mock provider is useful for tests, host integration rehearsals, demos and
target-project dry runs. It implements `@hia-doc/provider-sdk` contracts without
calling external APIs, requiring secrets, reading source bodies, or returning
direct edits.

## Usage

```ts
import { createDeterministicMockProvider } from "@hia-doc/provider-mock";
import { runHiaProviderAdapter } from "@hia-doc/provider-sdk";

const provider = createDeterministicMockProvider();
const result = await runHiaProviderAdapter(provider, request);
```

The result contains deterministic `draft-text` and `review-metadata` outputs.
Hosts must still display those outputs for human review before any later apply
workflow can act on them.
