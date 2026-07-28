import { describe, expect, it } from "vitest";
import {
  createDocSourceMapIndex,
  createGeneratedDocumentationBindingIndex,
  findGeneratedBindingsForDocSourceMapEntry,
  findGeneratedBindingsForTarget,
  findGeneratedBindingsForTargetSymbol,
  findGeneratedTargetsForBinding
} from "./index.js";

/**
 * 中文：构造与 W-P52.4 Pug one-to-many 产物相同边界的公开安全 sidecar。
 * English: Builds a public-safe sidecar with the same boundary as the W-P52.4
 * Pug one-to-many artifact.
 *
 * @remarks
 * 中文：fixture 只保留 contract 所需的元数据；不携带 Pug AST、源码正文、locals
 * value 或 digest。
 * English: The fixture retains only contract metadata; it carries no Pug AST,
 * source body, locals value, or digest.
 */
function createPugLikeSidecar(): Record<string, unknown> {
  const bindingId = "binding:pug:colors:name";
  const scopeId = "gdb-scope/v1/pug/source-colors#each-colors/value";
  return {
    contract: "generated-documentation-binding",
    contractVersion: "0.1.0-draft",
    id: "sidecar:pug:colors",
    producer: {
      name: "@hia-doc/pug-doc-extractor",
      version: "0.0.0",
      adapterId: "pug"
    },
    docSourceMapLinkage: {
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      docSourceMapId: "docmap:pug:colors",
      sidecarId: "sidecar:pug:colors",
      sidecarPath: "colors.gdb.json",
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
      inputId: "fixture:pug:colors",
      adapterId: "pug",
      bindingAllowlist: ["colors"],
      privacyClassification: "metadata-only",
      limits: { maxDepth: 12, maxEntries: 10000, maxStringBytes: 65536 },
      prohibitedSources: ["process-environment", "network", "provider", "host-editor", "implicit-runtime-capture"]
    },
    compatibility: {
      minimumConsumerContractVersion: "0.1.0-draft",
      unknownFieldPolicy: "ignore-unknown-optional-fields",
      breakingChangePolicy: "new-contract-version-and-schema-id"
    },
    bindings: [
      {
        id: bindingId,
        adapterId: "pug",
        sourceIntent: {
          kind: "documentation-field",
          field: "description",
          sourceRef: {
            sourceId: "source:pug:colors",
            range: { start: { line: 4, column: 3 }, end: { line: 7, column: 42 } },
            rangeSource: "parser"
          }
        },
        bindingRef: {
          kind: "member-path",
          rootDeclarationId: "decl:pug:colors:each:value",
          memberPath: ["name"]
        },
        scope: {
          id: scopeId,
          adapterId: "pug",
          sourceId: "source:pug:colors",
          semanticAncestry: ["template-root", "generator-each:3"],
          declarationSlot: "each:3",
          aliasMetadata: ["color", "colorKey"]
        },
        resolution: {
          resolutionKind: "exact",
          confidence: "high",
          provenanceCoverage: "source-and-generated"
        },
        composition: {
          relation: "none",
          mergePolicy: "not-applicable",
          contributions: []
        }
      }
    ],
    expansions: [
      createExpansion("expansion:pug:colors:sky", bindingId, scopeId, "gdb-key/v1/string:sky", "target:pug:colors:sky", 0),
      createExpansion("expansion:pug:colors:sun", bindingId, scopeId, "gdb-key/v1/string:sun", "target:pug:colors:sun", 1)
    ],
    targets: [
      createTarget("target:pug:colors:sky"),
      createTarget("target:pug:colors:sun")
    ],
    diagnostics: []
  };
}

/** 中文：构造稳定一对一 expansion。English: Builds one stable one-to-one expansion. */
function createExpansion(
  id: string,
  bindingId: string,
  scopeId: string,
  instanceKey: string,
  targetId: string,
  order: number
): Record<string, unknown> {
  return {
    id,
    bindingId,
    scopeId,
    order,
    instanceKey: {
      status: "stable",
      key: instanceKey,
      origin: "explicit-instance-key",
      privacySafe: true
    },
    resolution: {
      resolutionKind: "exact",
      confidence: "high",
      provenanceCoverage: "source-and-generated"
    },
    targetIds: [targetId]
  };
}

/** 中文：构造两次 each 生成后共享 symbol identity 的 target。English: Builds a target sharing symbol identity across two each expansions. */
function createTarget(id: string): Record<string, unknown> {
  return {
    id,
    identity: {
      kind: "generated-html-element",
      artifactId: "artifact:colors-html",
      symbolId: "element:ColorSwatch",
      selector: "article.swatch"
    },
    resolution: {
      resolutionKind: "exact",
      confidence: "high",
      provenanceCoverage: "source-and-generated"
    }
  };
}

/** 中文：构造只声明 sidecar/ref 的 ordinary doc-source-map。English: Builds an ordinary doc-source-map that declares only sidecar/ref metadata. */
function createDocSourceMap(bindingId = "binding:pug:colors:name", sidecarPath = "colors.gdb.json"): Record<string, unknown> {
  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:pug:colors",
    producer: { name: "@hia-doc/pug-to-html-doc-source-map", version: "0.0.0" },
    artifacts: [{ id: "artifact:colors-html", kind: "generated-html", path: "colors.html" }],
    sources: [{ id: "source:pug:colors", kind: "template-source", path: "src/colors.pug", sourcesContentPolicy: "none" }],
    sourceMaps: [],
    generatedBindingSidecars: [{
      id: "sidecar:pug:colors",
      contract: "generated-documentation-binding",
      contractVersion: "0.1.0-draft",
      path: sidecarPath
    }],
    chains: [],
    entries: [{
      id: "entry:element-colorswatch",
      kind: "symbol",
      symbolId: "element:ColorSwatch",
      sourceRefs: [],
      artifactRefs: [{ artifactId: "artifact:colors-html", rangeSource: "adapter", confidence: "high" }],
      diagnostics: [],
      generatedBindingRefs: [{ bindingId, sidecarId: "sidecar:pug:colors" }]
    }],
    privacy: { sourcesContentPolicy: "none" },
    diagnostics: []
  };
}

describe("generated-documentation-binding bidirectional index", () => {
  it("links a Pug-like one-to-many binding to targets and resolves targets back to the declaration", () => {
    const docSourceMapIndex = createDocSourceMapIndex(createDocSourceMap());
    const index = createGeneratedDocumentationBindingIndex(createPugLikeSidecar(), { docSourceMapIndex });

    expect(index).toMatchObject({
      status: "available",
      bindingCount: 1,
      expansionCount: 2,
      targetCount: 2,
      linkedDocSourceMapEntryCount: 1,
      unlinkedBindingCount: 0
    });
    expect(index.diagnostics).toEqual([]);
    expect(findGeneratedTargetsForBinding(index, "binding:pug:colors:name").map((target) => target.id)).toEqual([
      "target:pug:colors:sky",
      "target:pug:colors:sun"
    ]);
    expect(findGeneratedBindingsForTarget(index, "target:pug:colors:sun").map((binding) => binding.id)).toEqual([
      "binding:pug:colors:name"
    ]);
    expect(findGeneratedBindingsForTargetSymbol(index, "element:ColorSwatch").map((binding) => binding.id)).toEqual([
      "binding:pug:colors:name"
    ]);
    expect(findGeneratedBindingsForDocSourceMapEntry(index, "entry:element-colorswatch").map((binding) => binding.id)).toEqual([
      "binding:pug:colors:name"
    ]);
    expect(index.expansions.map((expansion) => expansion.instanceKey.key)).toEqual([
      "gdb-key/v1/string:sky",
      "gdb-key/v1/string:sun"
    ]);
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(index.targets)).toBe(true);
  });

  it("rejects a sidecar path declaration that does not match the linked doc-source-map", () => {
    const index = createGeneratedDocumentationBindingIndex(
      createPugLikeSidecar(),
      { docSourceMapIndex: createDocSourceMapIndex(createDocSourceMap("binding:pug:colors:name", "elsewhere.gdb.json")) }
    );

    expect(index.status).toBe("invalid");
    expect(index.targetCount).toBe(0);
    expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_SIDECAR_PATH_MISMATCH"
    );
  });

  it("keeps a missing doc-source-map binding reference diagnostic as non-mutating query metadata", () => {
    const index = createGeneratedDocumentationBindingIndex(
      createPugLikeSidecar(),
      { docSourceMapIndex: createDocSourceMapIndex(createDocSourceMap("binding:pug:missing")) }
    );

    expect(index.status).toBe("available");
    expect(index.linkedDocSourceMapEntryCount).toBe(0);
    expect(index.unlinkedBindingCount).toBe(1);
    expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_ENTRY_BINDING_UNRESOLVED"
    );
  });

  it("does not query through an unsupported paired doc-source-map contract version", () => {
    const docSourceMap = createDocSourceMap();
    docSourceMap.contractVersion = "0.2.0-draft";
    const index = createGeneratedDocumentationBindingIndex(
      createPugLikeSidecar(),
      { docSourceMapIndex: createDocSourceMapIndex(docSourceMap) }
    );

    expect(index.status).toBe("unsupported-version");
    expect(index.bindingCount).toBe(0);
    expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE"
    );
  });
});
