import { describe, expect, it } from "vitest";
import {
  createHiaProjectRelationChoices,
  createHiaProjectRelationNavigationTargets
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
});
