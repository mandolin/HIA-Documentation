import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createBrowserPanelPayload,
  HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION,
  HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION,
  renderBrowserPanel
} from "./index.js";
import {
  createDocSourceMapIndex,
  createOrdinarySourceMapIndex
} from "@hia-doc/source-linkage";

describe("@hia-doc/browser-panel", () => {
  it("builds a source-linked panel payload and static files", () => {
    const docSourceMapIndex = createDocSourceMapIndex(readFixture("source-linkage/profile-card.docmap.json"), {
      path: "source-linkage/profile-card.docmap.json"
    });
    const sourceMapIndex = createOrdinarySourceMapIndex(readFixture("source-linkage/profile-card.js.map.json"), {
      artifactPath: "dist/profile-card.js",
      path: "dist/profile-card.js.map"
    });
    const payload = createBrowserPanelPayload({
      project: {
        id: "project:source-linked",
        name: "Source Linked Fixture"
      },
      docSourceMaps: [
        {
          path: "source-linkage/profile-card.docmap.json",
          index: docSourceMapIndex,
          ordinarySourceMaps: [
            {
              path: "dist/profile-card.js.map",
              index: sourceMapIndex
            }
          ]
        }
      ]
    });
    const rendered = renderBrowserPanel(payload);

    expect(payload.schemaVersion).toBe(HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION);
    expect(payload.summary).toMatchObject({
      docSourceMapCount: 1,
      entryCount: 1,
      linkedEntryCount: 1,
      sourceMapCount: 1
    });
    expect(payload.entries[0]).toMatchObject({
      domain: "js",
      label: "ts:function:renderProfileCard",
      lookup: {
        generated: {
          artifactPath: "dist/profile-card.js",
          position: { line: 2, column: 1 }
        },
        matchedEntryIds: ["entry:profile-card-render"],
        original: {
          sourcePath: "src/profile-card.ts",
          position: { line: 6, column: 1 }
        },
        status: "available"
      }
    });
    expect(payload.entries[0]?.openRequests.map((request) => request.type)).toEqual([
      "hia.openSource",
      "hia.openGenerated"
    ]);
    expect(rendered.manifest.schemaVersion).toBe(HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION);
    expect(rendered.files.map((file) => file.path)).toEqual([
      "index.html",
      "browser-panel-payload.json",
      "browser-panel-manifest.json"
    ]);
    expect(rendered.files[0]?.contents).toContain("data-hia-browser-panel");
    expect(rendered.files[0]?.contents).toContain("ts:function:renderProfileCard");
    expect(rendered.files[1]?.contents).toContain("\"@hia-doc/browser-panel\"");
  });
});

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8")) as unknown;
}
