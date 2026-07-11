import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createOrdinarySourceMapIndex,
  createDocSourceMapIndex,
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION,
  findAllGeneratedPositionsForOriginal,
  findDocSourceMapEntriesByArtifact,
  findDocSourceMapEntriesBySource,
  findDocSourceMapEntriesBySymbol,
  findGeneratedPositionForOriginal,
  findOriginalPositionForGenerated,
  queryDocSourceMapIndex,
  querySourceLinkedPosition,
  validateDocSourceMap
} from "./index.js";

describe("@hia-doc/source-linkage", () => {
  it("exports the doc-source-map JSON Schema contract", () => {
    expect(DOC_SOURCE_MAP_JSON_SCHEMA.$id).toBe(DOC_SOURCE_MAP_SCHEMA_ID);
    expect(DOC_SOURCE_MAP_JSON_SCHEMA.properties.contractVersion.const).toBe(DOC_SOURCE_MAP_SCHEMA_VERSION);
    expect(DOC_SOURCE_MAP_JSON_SCHEMA.required).toContain("entries");
    expect(DOC_SOURCE_MAP_JSON_SCHEMA.$defs.privacy.required).toContain("sourcesContentPolicy");
  });

  it("indexes doc-source-map entries and linked source/artifact paths", () => {
    const index = createDocSourceMapIndex({
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      id: "docmap:fixture",
      artifacts: [
        { id: "artifact:html", path: "dist/card.html", language: "html" }
      ],
      sources: [
        { id: "source:pug", path: "src/card.pug", language: "pug", sourcesContentPolicy: "none" }
      ],
      sourceMaps: [],
      entries: [
        {
          id: "entry:card",
          kind: "symbol",
          symbolId: "component:Card",
          symbolKind: "html-component",
          sourceRefs: [
            {
              sourceId: "source:pug",
              range: {
                start: { line: 2, column: 1 },
                end: { line: 4, column: 8 }
              },
              rangeSource: "parser",
              confidence: "high"
            }
          ],
          artifactRefs: [
            {
              artifactId: "artifact:html",
              selector: "[data-component=\"Card\"]",
              rangeSource: "adapter",
              confidence: "medium"
            }
          ]
        }
      ],
      privacy: {
        sourcesContentPolicy: "none"
      }
    }, { path: "fixtures/card.docmap.json" });

    expect(index.status).toBe("available");
    expect(index.entryCount).toBe(1);
    expect(index.linkedEntryCount).toBe(1);
    expect(index.unresolvedEntryCount).toBe(0);
    expect(index.entries[0]).toMatchObject({
      id: "entry:card",
      symbolId: "component:Card",
      sourceLinks: [
        {
          path: "src/card.pug",
          rangeSource: "parser"
        }
      ],
      artifactLinks: [
        {
          path: "dist/card.html",
          selector: "[data-component=\"Card\"]"
        }
      ]
    });
    expect(index.diagnostics).toEqual([]);
  });

  it("queries doc-source-map entries by symbol, source position and artifact selector", () => {
    const index = createDocSourceMapIndex({
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      artifacts: [
        { id: "artifact:html", path: "dist/card.html", language: "html" }
      ],
      sources: [
        { id: "source:pug", path: "src/card.pug", language: "pug", sourcesContentPolicy: "none" }
      ],
      sourceMaps: [],
      entries: [
        {
          id: "entry:card",
          kind: "symbol",
          symbolId: "component:Card",
          symbolKind: "html-component",
          sourceRefs: [
            {
              sourceId: "source:pug",
              range: {
                start: { line: 2, column: 1 },
                end: { line: 4, column: 8 }
              }
            }
          ],
          artifactRefs: [
            {
              artifactId: "artifact:html",
              selector: "[data-component=\"Card\"]"
            }
          ]
        }
      ],
      privacy: {
        sourcesContentPolicy: "none"
      }
    });

    expect(findDocSourceMapEntriesBySymbol(index, "component:Card").map((entry) => entry.id)).toEqual(["entry:card"]);
    expect(findDocSourceMapEntriesBySource(index, "src/card.pug", { line: 3, column: 2 }).map((entry) => entry.id)).toEqual(["entry:card"]);
    expect(findDocSourceMapEntriesBySource(index, "src/card.pug", { line: 8, column: 1 })).toEqual([]);
    expect(findDocSourceMapEntriesByArtifact(index, "dist/card.html", "[data-component=\"Card\"]").map((entry) => entry.id)).toEqual(["entry:card"]);
    expect(queryDocSourceMapIndex(index, { symbolKind: "html-component" })).toMatchObject({
      matchedEntryCount: 1,
      status: "available"
    });
  });

  it("queries generated-source navigation fixtures for Pug and TypeScript chains", () => {
    const pugIndex = createDocSourceMapIndex(readFixture("source-linkage/pug-card.docmap.json"));
    const tsIndex = createDocSourceMapIndex(readFixture("source-linkage/ts-calculator.docmap.json"));

    expect(findDocSourceMapEntriesBySource(pugIndex, "src/card.pug", { line: 4, column: 2 }).map((entry) => entry.symbolId)).toEqual(["html:component:card"]);
    expect(findDocSourceMapEntriesByArtifact(pugIndex, "dist/card.html", "[data-component=\"Card\"]").map((entry) => entry.id)).toEqual(["entry:pug:card"]);
    expect(findDocSourceMapEntriesBySource(tsIndex, "src/calculator.ts", { line: 6, column: 1 }).map((entry) => entry.symbolId)).toEqual(["ts:function:add"]);
    expect(findDocSourceMapEntriesByArtifact(tsIndex, "dist/calculator.js").map((entry) => entry.id)).toEqual(["entry:ts:add"]);
  });

  it("looks up ordinary source map positions and combines them with doc-source-map entries", () => {
    const sourceMapIndex = createOrdinarySourceMapIndex(readFixture("source-linkage/profile-card.js.map.json"), {
      artifactPath: "dist/profile-card.js",
      path: "dist/profile-card.js.map"
    });
    const docSourceMapIndex = createDocSourceMapIndex(readFixture("source-linkage/profile-card.docmap.json"));

    expect(sourceMapIndex).toMatchObject({
      artifactPath: "dist/profile-card.js",
      mappingCount: 2,
      sourceCount: 1,
      status: "available"
    });
    expect(docSourceMapIndex.sourceMaps).toEqual([
      {
        id: "sourcemap:profile-card",
        kind: "ordinary-source-map",
        language: "json",
        path: "dist/profile-card.js.map"
      }
    ]);
    expect(findOriginalPositionForGenerated(sourceMapIndex, { line: 2, column: 1 })).toMatchObject({
      original: {
        name: "renderProfileCard",
        position: { line: 6, column: 1 },
        sourcePath: "src/profile-card.ts"
      },
      status: "available"
    });
    expect(findGeneratedPositionForOriginal(sourceMapIndex, "src/profile-card.ts", { line: 6, column: 1 })).toMatchObject({
      generated: {
        artifactPath: "dist/profile-card.js",
        position: { line: 2, column: 1 }
      },
      status: "available"
    });
    expect(findAllGeneratedPositionsForOriginal(sourceMapIndex, "src/profile-card.ts", { line: 6, column: 1 }).generated).toEqual([
      {
        artifactPath: "dist/profile-card.js",
        position: { line: 2, column: 1 }
      }
    ]);
    expect(querySourceLinkedPosition(docSourceMapIndex, sourceMapIndex, {
      generatedPath: "dist/profile-card.js",
      generatedPosition: { line: 2, column: 1 }
    })).toMatchObject({
      matchedEntryCount: 1,
      original: {
        position: { line: 6, column: 1 },
        sourcePath: "src/profile-card.ts"
      },
      entries: [
        {
          id: "entry:profile-card-render",
          symbolId: "ts:function:renderProfileCard"
        }
      ],
      status: "available"
    });
  });

  it("reports unsafe paths and blocked embedded source content", () => {
    const diagnostics = validateDocSourceMap({
      contract: "doc-source-map",
      contractVersion: "0.1.0-draft",
      artifacts: [
        { id: "artifact:html", path: "C:/secret/card.html" }
      ],
      sources: [
        { id: "source:pug", path: "../secret/card.pug", content: "private source" }
      ],
      entries: []
    }, { path: "bad.docmap.json" });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "DOC_SOURCE_MAP_UNSAFE_PATH",
      "DOC_SOURCE_MAP_UNSAFE_PATH",
      "DOC_SOURCE_MAP_SOURCES_CONTENT_BLOCKED"
    ]);
    expect(diagnostics.every((diagnostic) => diagnostic.severity === "error")).toBe(true);
  });
});

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8")) as unknown;
}
