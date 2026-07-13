import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import { HiaIdeCapabilityId } from "./authoring.js";
import { createHiaLspService } from "./service.js";

describe("@hia-doc/lsp service", () => {
  it("handles initialize, document validation and shutdown", () => {
    const service = createHiaLspService();
    const initializeResult = service.initialize({
      capabilities: {},
      processId: null,
      rootUri: "file:///workspace",
      workspaceFolders: [
        {
          name: "workspace",
          uri: "file:///workspace"
        }
      ]
    });
    const document = service.openDocument(
      "file:///workspace/basic.hia.json",
      JSON.stringify(createBasicFixtureDocument()),
      "json",
      1
    );

    expect(initializeResult.capabilities.textDocumentSync).toBe(2);
    expect(initializeResult.capabilities.completionProvider).toMatchObject({
      resolveProvider: false
    });
    expect(initializeResult.capabilities.hoverProvider).toBe(true);
    expect(initializeResult.capabilities.definitionProvider).toBe(true);
    expect(initializeResult.capabilities.foldingRangeProvider).toBe(true);
    expect(service.isInitialized()).toBe(true);
    expect(service.getWorkspaceRoots()).toEqual(["file:///workspace"]);
    expect(document.diagnostics).toEqual([]);
    expect(service.validateManagedDocument(document.uri)).toEqual([]);
    expect(service.getManagedResourceIndex(document.uri)).toMatchObject({
      documentId: "fixture.basic",
      title: "HIA Basic Fixture",
      uri: document.uri
    });
    expect(service.documents.has(document.uri)).toBe(true);

    service.closeDocument(document.uri);
    expect(service.documents.has(document.uri)).toBe(false);

    expect(service.shutdown()).toBeNull();
    expect(service.isShutdownRequested()).toBe(true);
  });

  it("manages doc-source-map documents and answers source-linkage queries", () => {
    const service = createHiaLspService();
    service.initialize({
      capabilities: {},
      processId: null,
      rootUri: "file:///workspace"
    });
    const uri = "file:///workspace/fixtures/project-mixed-alert.docmap.json";
    const document = service.openDocument(uri, readFixture("project-mixed-alert.docmap.json"), "json", 1);
    const fullIndex = service.getManagedDocSourceMapIndex(uri);
    const symbolIndex = service.getManagedDocSourceMapIndex(uri, {
      symbolId: "html:component:alert"
    });
    const sourceIndex = service.getManagedDocSourceMapIndex(uri, {
      sourcePath: "src/components/alert.html",
      position: {
        line: 2,
        column: 1
      }
    });
    const capability = service.getIdeCapabilities(uri).capabilities.find((item) => item.id === HiaIdeCapabilityId.SourceLinkageQuery);

    expect(document.diagnostics).toEqual([]);
    expect(fullIndex).toMatchObject({
      entryCount: 1,
      matchedEntryCount: 1,
      status: "available",
      uri
    });
    expect(symbolIndex.entries.map((entry) => entry.id)).toEqual(["entry:html:alert"]);
    expect(sourceIndex.entries[0]?.sourceLinks[0]).toMatchObject({
      path: "src/components/alert.html",
      rangeSource: "parser"
    });
    expect(capability).toMatchObject({
      id: "hia.sourceLinkage.query",
      status: "available"
    });
  });

  it("loads workspace project doc-source-map inputs and profiles from HIA config", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "hia-lsp-workspace-"));

    try {
      mkdirSync(path.join(root, "docs"), { recursive: true });
      mkdirSync(path.join(root, "profiles"), { recursive: true });
      writeFileSync(path.join(root, "hia.config.json"), JSON.stringify({
        schemaVersion: "0.1.0",
        docs: {
          projectManifest: "project.hia-project.json"
        }
      }), "utf8");
      writeFileSync(path.join(root, "project.hia-project.json"), JSON.stringify({
        schemaVersion: "0.1.0-draft",
        project: {
          name: "Workspace Source Linkage"
        },
        profiles: [
          {
            profileId: "doc-source-map",
            path: "profiles/doc-source-map.profile.json"
          }
        ],
        inputs: [
          {
            kind: "doc-source-map",
            path: "docs/alert.docmap.json",
            profile: {
              profileId: "doc-source-map"
            }
          }
        ]
      }), "utf8");
      writeFileSync(path.join(root, "profiles", "doc-source-map.profile.json"), readFixture("project-mixed-profiles/doc-source-map.profile.json"), "utf8");
      writeFileSync(path.join(root, "docs", "alert.docmap.json"), readFixture("project-mixed-alert.docmap.json"), "utf8");

      const service = createHiaLspService();
      const docSourceMapUri = pathToFileURL(path.join(root, "docs", "alert.docmap.json")).href;
      service.initialize({
        capabilities: {},
        processId: null,
        rootUri: pathToFileURL(root).href
      });

      expect(service.getWorkspaceSourceMapUris()).toEqual([docSourceMapUri]);
      expect(service.getManagedDocSourceMapIndex(docSourceMapUri, { symbolId: "html:component:alert" }).matchedEntryCount).toBe(1);
      expect(service.getIdeCapabilities(docSourceMapUri).profiles.map((profile) => profile.profileId)).toEqual(["doc-source-map"]);

      writeFileSync(
        path.join(root, "docs", "alert.docmap.json"),
        readFixture("project-mixed-alert.docmap.json").replace("html:component:alert", "html:component:toast"),
        "utf8"
      );
      service.reloadWorkspaceRuntime();

      expect(service.getManagedDocSourceMapIndex(docSourceMapUri, { symbolId: "html:component:alert" }).matchedEntryCount).toBe(0);
      expect(service.getManagedDocSourceMapIndex(docSourceMapUri, { symbolId: "html:component:toast" }).matchedEntryCount).toBe(1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("loads the source-linkage host fixture through its real workspace configuration", () => {
    const root = path.resolve("fixtures/source-linkage-host");
    const docSourceMapUri = pathToFileURL(path.join(root, "docs", "profile-card.docmap.json")).href;
    const service = createHiaLspService();

    service.initialize({
      capabilities: {},
      processId: null,
      rootUri: pathToFileURL(root).href
    });

    expect(service.getWorkspaceSourceMapUris()).toEqual([docSourceMapUri]);
    expect(service.getManagedDocSourceMapIndex(docSourceMapUri, {
      symbolId: "html:component:profile-card"
    })).toMatchObject({
      matchedEntryCount: 1,
      status: "available"
    });
  });
});

function readFixture(name: string): string {
  return readFileSync(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8");
}
