import { describe, expect, it } from "vitest";
import {
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
  validateGeneratedDocumentationBinding
} from "./index.js";

/**
 * 中文：为 schema 与 owner validator 提供不含源码正文或 runtime locals 值的
 * 最小中性 sidecar fixture。
 * English: Provides a minimal neutral sidecar fixture for schema and owner
 * validator tests without source bodies or runtime-local values.
 */
function createValidBindingSidecar(): Record<string, unknown> {
  return {
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    contractVersion: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
    id: "gdb:fixture:card",
    producer: {
      name: "fixture-adapter",
      version: "0.1.0",
      adapterId: "fixture-template"
    },
    docSourceMapLinkage: {
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      docSourceMapId: "docmap:fixture:card",
      sidecarId: "sidecar:fixture:card",
      sidecarPath: "dist/card.generated-doc-binding.json",
      entryReferenceField: "generatedBindingRefs"
    },
    privacy: {
      sourcesContentPolicy: "none",
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowSourceBodySerialization: false,
      allowRuntimeValueSerialization: false,
      allowRuntimeExpressionExecution: false,
      allowDigestSerialization: false,
      allowSecretSerialization: false
    },
    deterministicLocalsPolicy: {
      contract: "generated-doc-locals",
      contractVersion: "0.1.0-draft-input",
      mode: "deterministic-json-compatible",
      inputId: "locals:fixture:card",
      adapterId: "fixture-template",
      bindingAllowlist: ["binding:color-name"],
      privacyClassification: "metadata-only",
      limits: {
        maxDepth: 12,
        maxEntries: 10000,
        maxStringBytes: 65536
      },
      prohibitedSources: ["process-environment", "network", "provider", "host-editor", "implicit-runtime-capture"]
    },
    compatibility: {
      minimumConsumerContractVersion: "0.1.0-draft",
      unknownFieldPolicy: "ignore-unknown-optional-fields",
      breakingChangePolicy: "new-contract-version-and-schema-id"
    },
    bindings: [
      {
        id: "binding:color-name",
        adapterId: "fixture-template",
        sourceIntent: {
          kind: "description",
          field: "description",
          sourceRef: {
            sourceId: "source:template",
            range: {
              start: { line: 3, column: 5 },
              end: { line: 3, column: 32 }
            },
            rangeSource: "adapter"
          }
        },
        bindingRef: {
          kind: "member-path",
          rootDeclarationId: "declaration:color",
          memberPath: ["name"]
        },
        scope: {
          id: "gdb-scope/v1/fixture-template/source-template#loop-color/declaration-1",
          adapterId: "fixture-template",
          sourceId: "source:template",
          semanticAncestry: ["generator-loop", "attached-documentation"],
          declarationSlot: "declaration-1",
          aliasMetadata: ["color"]
        },
        resolution: {
          resolutionKind: "exact",
          confidence: "high",
          provenanceCoverage: "source-only"
        },
        composition: {
          relation: "none",
          mergePolicy: "not-applicable",
          contributions: []
        }
      }
    ],
    expansions: [
      {
        id: "expansion:color-42",
        bindingId: "binding:color-name",
        scopeId: "gdb-scope/v1/fixture-template/source-template#loop-color/declaration-1",
        order: 0,
        instanceKey: {
          status: "stable",
          key: "gdb-key/v1/stable-id:color-42",
          origin: "explicit-instance-key",
          privacySafe: true
        },
        resolution: {
          resolutionKind: "exact",
          confidence: "high",
          provenanceCoverage: "source-and-generated"
        },
        targetIds: ["target:card-title"]
      }
    ],
    targets: [
      {
        id: "target:card-title",
        identity: {
          kind: "generated-element",
          artifactId: "artifact:card-html",
          selector: "[data-card-title]"
        },
        resolution: {
          resolutionKind: "exact",
          confidence: "high",
          provenanceCoverage: "source-and-generated"
        }
      }
    ],
    diagnostics: []
  };
}

describe("generated-documentation-binding contract", () => {
  it("exports the versioned Draft 2020-12 schema and frozen top-level collections", () => {
    expect(GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$id).toBe(GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID);
    expect(GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.properties.contract.const).toBe(GENERATED_DOCUMENTATION_BINDING_CONTRACT);
    expect(GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required).toEqual(expect.arrayContaining([
      "bindings",
      "expansions",
      "targets",
      "diagnostics",
      "docSourceMapLinkage"
    ]));
    expect(GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.privacy.properties.sourcesContentPolicy.const).toBe("none");
  });

  it("accepts a neutral sidecar with separate declaration, expansion, target, and doc-source-map linkage", () => {
    expect(validateGeneratedDocumentationBinding(createValidBindingSidecar(), { path: "dist/card.generated-doc-binding.json" })).toEqual([]);
  });

  it("rejects invalid resolution pairs, duplicated instance keys, and forbidden serialized values", () => {
    const invalid = createValidBindingSidecar();
    const expansions = invalid.expansions as Record<string, unknown>[];
    const secondExpansion = structuredClone(expansions[0]);
    secondExpansion.id = "expansion:color-43";
    expansions.push(secondExpansion);
    const binding = (invalid.bindings as Record<string, unknown>[])[0];
    const resolution = binding.resolution as Record<string, unknown>;
    resolution.confidence = "medium";
    invalid.sourceText = "forbidden";

    const codes = validateGeneratedDocumentationBinding(invalid).map((diagnostic) => diagnostic.code);
    expect(codes).toContain("GENERATED_DOCUMENTATION_BINDING_INVALID");
    expect(codes).toContain("GENERATED_DOCUMENTATION_BINDING_PRIVACY_VIOLATION");
  });
});
