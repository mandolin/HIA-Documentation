import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIA_LANGUAGE_ID,
  HIA_SHOW_OUTPUT_COMMAND,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  resolveHiaServerModule
} from "./config.js";

describe("@hia-doc/vscode-extension config", () => {
  it("resolves the workspace LSP server module", () => {
    const extensionPath = path.resolve("apps/vscode-extension");
    const serverModule = resolveHiaServerModule(extensionPath);

    expect(serverModule.replace(/\\/g, "/")).toMatch(/packages\/lsp\/dist\/node\.js$/);
    expect(path.isAbsolute(serverModule)).toBe(true);
  });

  it("targets HIA documents and command activation", () => {
    expect(HIA_LANGUAGE_ID).toBe("hia");
    expect(HIA_SHOW_OUTPUT_COMMAND).toBe("hia.showOutput");
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
  });
});
