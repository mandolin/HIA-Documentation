import { describe, expect, it } from "vitest";
import {
  createHiaProjectRelationActionChoices,
  createHiaProjectRelationChoices,
  createHiaProjectRelationNavigationTargets,
  createHiaProjectRelationRuntimeReport
} from "./project-relations.js";

describe("@hia-doc/vscode-extension project relations", () => {
  it("creates relation choices and navigation targets from the LSP projection", () => {
    const choices = createHiaProjectRelationChoices({
      status: "available",
      nodes: [
        {
          id: "entry:cssdoc-extraction:css-component-alert",
          kind: "entry",
          label: "Alert",
          entryId: "cssdoc-extraction:css-component-alert",
          view: "css"
        },
        {
          id: "source:src/styles/alert.css",
          kind: "source",
          label: "src/styles/alert.css",
          path: "src/styles/alert.css"
        }
      ],
      relations: [
        {
          id: "documents-source:entry:cssdoc-extraction:css-component-alert->source:src/styles/alert.css",
          kind: "documents-source",
          from: "entry:cssdoc-extraction:css-component-alert",
          to: "source:src/styles/alert.css",
          label: "Source: src/styles/alert.css",
          confidence: "high",
          entryId: "cssdoc-extraction:css-component-alert",
          metadata: {
            language: "css",
            rangeStartLine: 3,
            rangeEndLine: 12
          }
        }
      ]
    });

    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      label: "Source: src/styles/alert.css",
      description: "documents-source | high",
      detail: "Alert -> src/styles/alert.css | entry cssdoc-extraction:css-component-alert"
    });
    expect(createHiaProjectRelationNavigationTargets(choices[0])).toEqual([
      {
        kind: "to-node",
        label: "Open source: src/styles/alert.css",
        node: {
          id: "source:src/styles/alert.css",
          kind: "source",
          label: "src/styles/alert.css",
          path: "src/styles/alert.css"
        },
        path: "src/styles/alert.css",
        position: {
          line: 3
        }
      }
    ]);
    expect(createHiaProjectRelationActionChoices(choices[0])).toEqual([
      {
        actionKind: "target",
        description: "line 3",
        label: "Open source: src/styles/alert.css",
        target: {
          kind: "to-node",
          label: "Open source: src/styles/alert.css",
          node: {
            id: "source:src/styles/alert.css",
            kind: "source",
            label: "src/styles/alert.css",
            path: "src/styles/alert.css"
          },
          path: "src/styles/alert.css",
          position: {
            line: 3
          }
        }
      },
      {
        actionKind: "documentation-preview",
        description: "Uses the existing HIA: Open Preview command",
        label: "Open documentation preview"
      },
      {
        actionKind: "copy-relation-id",
        description: "documents-source:entry:cssdoc-extraction:css-component-alert->source:src/styles/alert.css",
        label: "Copy project relation id"
      },
      {
        actionKind: "copy-entry-id",
        description: "cssdoc-extraction:css-component-alert",
        label: "Copy documentation entry id"
      }
    ]);
  });

  it("keeps generated artifact nodes openable without source positions", () => {
    const [choice] = createHiaProjectRelationChoices({
      status: "available",
      nodes: [
        {
          id: "entry:html:alert",
          kind: "entry",
          label: "Alert",
          entryId: "html:alert",
          view: "html"
        },
        {
          id: "artifact:dist/alert.html",
          kind: "artifact",
          label: "dist/alert.html",
          path: "dist/alert.html"
        }
      ],
      relations: [
        {
          id: "documents-generated-artifact:entry:html:alert->artifact:dist/alert.html",
          kind: "documents-generated-artifact",
          from: "entry:html:alert",
          to: "artifact:dist/alert.html",
          label: "Generated: dist/alert.html",
          confidence: "medium",
          entryId: "html:alert",
          metadata: {
            selector: "[data-component=\"Alert\"]"
          }
        }
      ]
    });

    expect(createHiaProjectRelationNavigationTargets(choice)).toEqual([
      {
        kind: "to-node",
        label: "Open generated artifact: dist/alert.html",
        node: {
          id: "artifact:dist/alert.html",
          kind: "artifact",
          label: "dist/alert.html",
          path: "dist/alert.html"
        },
        path: "dist/alert.html"
      }
    ]);
  });

  it("creates a stable runtime report for visible host evidence", () => {
    expect(createHiaProjectRelationRuntimeReport({
      contract: "hia-project-relation-graph",
      contractVersion: "0.1.0-draft",
      nodeCount: 4,
      project: {
        name: "Fixture"
      },
      relationCount: 2,
      status: "available",
      uri: "file:///workspace/dist/docs/project-index.json",
      nodes: [
        {
          id: "entry:api",
          kind: "entry",
          label: "API"
        },
        {
          id: "source:src/api.ts",
          kind: "source",
          label: "src/api.ts",
          path: "src/api.ts"
        },
        {
          id: "artifact:dist/api.js",
          kind: "artifact",
          label: "dist/api.js",
          path: "dist/api.js"
        }
      ],
      relations: [
        {
          id: "documents-source:entry:api->source:src/api.ts",
          kind: "documents-source",
          from: "entry:api",
          to: "source:src/api.ts",
          label: "Source: src/api.ts",
          metadata: {
            rangeStartLine: 10
          }
        },
        {
          id: "documents-generated-artifact:entry:api->artifact:dist/api.js",
          kind: "documents-generated-artifact",
          from: "entry:api",
          to: "artifact:dist/api.js",
          label: "Generated: dist/api.js"
        }
      ]
    })).toEqual([
      "Project: Fixture",
      "Status: available",
      "Relations: 2",
      "Nodes: 4",
      "Picker choices: 2",
      "Navigation targets: 2",
      "URI: file:///workspace/dist/docs/project-index.json",
      "Contract: hia-project-relation-graph@0.1.0-draft",
      "Relation kinds: documents-generated-artifact=1, documents-source=1",
      "Node kinds: artifact=1, entry=1, source=1",
      "Openable target kinds: artifact=1, source=1"
    ]);
  });
});
