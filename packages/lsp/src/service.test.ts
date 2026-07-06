import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import { createHiaLspService } from "./service.js";

describe("@hia-doc/lsp service", () => {
  it("handles initialize, document validation and shutdown", () => {
    const service = createHiaLspService();
    const initializeResult = service.initialize();
    const document = service.openDocument(
      "file:///workspace/basic.hia.json",
      JSON.stringify(createBasicFixtureDocument()),
      "json",
      1
    );

    expect(initializeResult.capabilities.textDocumentSync).toBe(2);
    expect(service.isInitialized()).toBe(true);
    expect(document.diagnostics).toEqual([]);
    expect(service.validateManagedDocument(document.uri)).toEqual([]);
    expect(service.documents.has(document.uri)).toBe(true);

    service.closeDocument(document.uri);
    expect(service.documents.has(document.uri)).toBe(false);

    expect(service.shutdown()).toBeNull();
    expect(service.isShutdownRequested()).toBe(true);
  });
});
