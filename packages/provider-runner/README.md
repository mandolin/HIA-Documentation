# @hia-doc/provider-runner

Local review-only provider runner for HIA documentation workflows.

The runner converts a bounded documentation review payload into a provider-safe
request, runs a `@hia-doc/provider-sdk` adapter, and returns provider output as
a review payload augmentation. It never returns `WorkspaceEdit`, source bodies,
`sourcesContent`, tool execution requests, workspace writes or target repository
mutations.

## Usage

```ts
import { runHiaLocalProvider } from "@hia-doc/provider-runner";
import { createDeterministicMockProvider } from "@hia-doc/provider-mock";

const result = await runHiaLocalProvider({
  provider: createDeterministicMockProvider(),
  reviewPayload,
  profileIds: ["jsdoc"],
  locales: ["zh-CN", "en"]
});

console.log(result.reviewPayloadAugmentation.draftOutputs);
```

## Boundary

- Provider requests receive provider-safe ids and public review metadata only.
- Provider results are validated by `@hia-doc/provider-sdk`.
- Runner output is review data only; checked apply remains a separate host-owned
  contract.
- `sourcesContentPolicy` defaults to `none`; source body input is forbidden.
