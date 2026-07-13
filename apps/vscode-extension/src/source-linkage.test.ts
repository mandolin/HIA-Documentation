import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHiaSourceLinkageEntryChoices,
  createHiaSourceLinkageNavigationTargets,
  resolveHiaSourceLinkageTargetPath
} from "./source-linkage.js";

describe("@hia-doc/vscode-extension source linkage", () => {
  it("creates source-to-generated entry and navigation choices from the LSP projection", () => {
    const entries = createHiaSourceLinkageEntryChoices({
      status: "available",
      entries: [
        {
          id: "entry:profile-card",
          symbolId: "html:component:profile-card",
          symbolKind: "html-component",
          sourceLinks: [
            {
              path: "src/profile-card.html",
              range: {
                start: {
                  line: 2,
                  column: 1
                }
              }
            }
          ],
          artifactLinks: [
            {
              path: "build/profile-card.html",
              selector: "[data-component=\"ProfileCard\"]"
            }
          ]
        }
      ]
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      label: "html:component:profile-card",
      description: "src/profile-card.html -> build/profile-card.html",
      detail: "html-component | entry entry:profile-card"
    });
    expect(createHiaSourceLinkageNavigationTargets(entries[0].entry)).toEqual([
      {
        kind: "original-source",
        label: "Open original source: src/profile-card.html",
        path: "src/profile-card.html",
        position: {
          line: 2,
          column: 1
        }
      },
      {
        kind: "generated-artifact",
        label: "Open generated artifact: build/profile-card.html",
        path: "build/profile-card.html",
        selector: "[data-component=\"ProfileCard\"]"
      }
    ]);
  });

  it("keeps host-openable targets inside the workspace and rejects unsafe paths", () => {
    const workspaceRoot = path.resolve("fixtures/source-linkage-host");
    const safe = resolveHiaSourceLinkageTargetPath(workspaceRoot, "src/profile-card.html");

    expect(safe.path).toBe(path.resolve(workspaceRoot, "src/profile-card.html"));
    expect(resolveHiaSourceLinkageTargetPath(workspaceRoot, "../outside.html")).toEqual({
      reason: "target-path-unsafe"
    });
    expect(resolveHiaSourceLinkageTargetPath(workspaceRoot, "C:\\outside.html")).toEqual({
      reason: "target-path-unsafe"
    });
    expect(resolveHiaSourceLinkageTargetPath(workspaceRoot, "")).toEqual({
      reason: "target-path-empty"
    });
  });
});
