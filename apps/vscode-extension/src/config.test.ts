import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_BUILD_DOCS_COMMAND,
  HIA_LANGUAGE_ID,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  resolveDefaultPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule
} from "./config.js";

describe("@hia-doc/vscode-extension config", () => {
  it("resolves the workspace LSP server module", () => {
    const extensionPath = path.resolve("apps/vscode-extension");
    const serverModule = resolveHiaServerModule(extensionPath);
    const cliModule = resolveHiaCliModule(extensionPath);

    expect(serverModule.replace(/\\/g, "/")).toMatch(/packages\/lsp\/dist\/node\.js$/);
    expect(path.isAbsolute(serverModule)).toBe(true);
    expect(cliModule.replace(/\\/g, "/")).toMatch(/apps\/cli\/dist\/index\.js$/);
    expect(path.isAbsolute(cliModule)).toBe(true);
  });

  it("targets HIA documents and command activation", () => {
    expect(HIA_LANGUAGE_ID).toBe("hia");
    expect(HIA_SHOW_OUTPUT_COMMAND).toBe("hia.showOutput");
    expect(HIA_BUILD_DOCS_COMMAND).toBe("hia.buildDocs");
    expect(HIA_OPEN_PREVIEW_COMMAND).toBe("hia.openPreview");
    expect(HIA_VALIDATE_WORKSPACE_COMMAND).toBe("hia.validateWorkspace");
    expect(createHiaDocumentSelector()).toEqual([
      {
        scheme: "file",
        language: "hia"
      },
      {
        scheme: "file",
        pattern: "**/*.hia.json"
      }
    ]);
    expect(createHiaFileWatcherPattern()).toBe("**/*.hia.json");
    expect(resolveDefaultPreviewPath(path.resolve("workspace")).replace(/\\/g, "/")).toMatch(/workspace\/dist\/docs\/index\.html$/);
  });
});
