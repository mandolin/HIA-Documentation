# @hia-doc/plugin-sdk

Contracts and runtime helpers for documentation producers.

A producer keeps its own standalone API and adds a small HIA-compatible surface:

```ts
import {
  defineDocumentationProducer,
  runDocumentationProducer
} from "@hia-doc/plugin-sdk";

const producer = defineDocumentationProducer({
  descriptor: {
    contract: "documentation-producer",
    contractVersion: "0.1.0-draft",
    id: "example-doc",
    version: "0.1.0",
    displayName: "Example Documentation Producer",
    inputKinds: ["example-source"],
    outputKinds: ["example-extraction"],
    capabilities: {
      sourceLinkage: false,
      incremental: false,
      watch: false
    }
  },
  async produce() {
    return {
      contract: "documentation-producer-result",
      contractVersion: "0.1.0-draft",
      producer: { id: "example-doc", version: "0.1.0" },
      status: "success",
      artifacts: [{ id: "example", kind: "example-extraction", path: "example.json" }],
      diagnostics: []
    };
  }
});

const result = await runDocumentationProducer(producer, {
  workspaceRoot: process.cwd(),
  outputDirectory: `${process.cwd()}/dist`,
  inputs: [{ kind: "example-source", path: "src/example.ext" }]
});
```

## P1 Boundary

- Producers are explicitly loaded in-process modules.
- Serialized input and artifact paths are safe relative paths.
- Workspace and output absolute paths exist only in the runtime request.
- Artifact kinds remain open identifiers for new documentation domains.
- P1 does not discover modules, spawn commands, manage a build graph or implement watch mode.

The package exports Draft 2020-12 schemas for producer descriptors and results. Structural schema validation does not replace the runtime semantic and privacy checks.

## Status

This workspace package implements `documentation-producer@0.1.0-draft` and is not yet a public npm release.
