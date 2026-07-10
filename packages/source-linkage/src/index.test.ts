import { describe, expect, it } from "vitest";
import {
  createDocSourceMapIndex,
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION,
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
