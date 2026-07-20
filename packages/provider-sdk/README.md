# @hia-doc/provider-sdk

Review-only provider adapter contracts for HIA documentation workflows.

This package defines the first provider boundary used by HIA host tools when
they need AI-assisted draft text, review metadata, or refusal diagnostics. The
P1 contract is intentionally restrictive: provider adapters may return
proposals, but they must not return workspace edits, target repository
mutations, embedded source bodies, or tool execution requests.

## Install

```bash
pnpm add @hia-doc/provider-sdk
```

## Usage

```ts
import {
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  defineHiaProviderAdapter
} from "@hia-doc/provider-sdk";

export const provider = defineHiaProviderAdapter({
  descriptor: {
    contract: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
    contractVersion: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
    id: "example-provider",
    version: "0.1.0",
    displayName: "Example Provider",
    runtimeKind: "deterministic-mock",
    acceptedInputContracts: ["hia-ai-context-package"],
    outputKinds: ["draft-text", "review-metadata", "refusal"],
    capabilities: {
      draftText: true,
      reviewMetadata: true,
      sourceBodyInput: false,
      toolExecution: false,
      workspaceWrite: false,
      targetRepositoryMutation: false,
      networkAccess: "disabled"
    },
    policies: {
      sourceExcerptPolicy: "none",
      sourcesContentPolicy: "none",
      allowSourceBody: false,
      allowToolExecution: false,
      allowWorkspaceWrite: false,
      allowTargetRepositoryMutation: false,
      requiresHumanReview: true
    }
  },
  async provide() {
    throw new Error("Provider implementation omitted.");
  }
});
```

## Boundary

- Providers receive review-safe context references rather than source bodies.
- Providers return draft/review outputs only; host tools own diff preview and
  apply gates.
- Providers must require human review before any suggestion can affect files.
- P1 providers run without direct network access in this SDK contract. Remote
  providers will be introduced through an explicit later host-mediated contract.
