# @hia-doc/plugin-sdk

## 1.0.0 source candidate

This source tree targets a coordinated 1.0.0 package candidate. It does not
announce npm availability. See the [package migration guide](../../docs/package-v1-migration.md)
for matching dependencies, artifact versions and source compatibility.

中文：当前为1.0.0源码候选，实际发布及工件版本请分别核对迁移说明。


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
    contractVersion: "1.0.0",
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
      contractVersion: "1.0.0",
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

## Execution Boundary

- Producers are explicitly loaded in-process modules.
- Serialized input and artifact paths are safe relative paths.
- Workspace and output absolute paths exist only in the runtime request.
- Artifact kinds remain open identifiers for new documentation domains.
- The runtime does not discover modules, spawn commands, manage a build graph or implement watch mode.

The package exports Draft 2020-12 schemas for producer descriptors and results. Structural schema validation does not replace the runtime semantic and privacy checks.

The reader accepts exactly `1.0.0` and historical `0.1.0-draft`. Valid results
retain their original object and wire version; artifact-owned contract references
are preserved. Kit-created failure results use `1.0.0` and omit raw thrown details.
Cancellation is checked before execution and after settlement; it does not stop
an ignored promise or roll back producer effects.
Each invocation captures its validated descriptor, including separate kind arrays
and capabilities, so producer mutations cannot change that invocation's admitted
identity, allowed outputs or kit-created failure identity.

Use `DocumentationProducerDiagnostic` for native diagnostic `metadata` and
`source` fields. These fields must contain JSON-compatible data, and producers
remain responsible for redacting domain text. Unknown field names and duplicate
invalid identities are omitted from public errors.

See the [complete API and migration guide](../../docs/documentation-producers.md)
for types, defaults, diagnostics, status rules and side effects.

## Status

The source implements producer descriptor/result **1.0.0 contract candidates**,
marked `stable-candidate` in schema distribution. Package versions and registry
availability are independent; verify the exact package/source revision consumed.
Candidate source changes do not republish an older package version or constitute
a formal system release.
