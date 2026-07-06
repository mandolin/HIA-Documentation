import path from "node:path";

export const HIA_EXTENSION_NAME = "HIA Documentation";
export const HIA_LANGUAGE_ID = "hia";
export const HIA_OUTPUT_CHANNEL_NAME = "HIA Documentation";
export const HIA_SHOW_OUTPUT_COMMAND = "hia.showOutput";
export const HIA_CLIENT_ID = "hiaDocumentation";
export const HIA_SERVER_RELATIVE_PATH = ["..", "..", "packages", "lsp", "dist", "node.js"] as const;

export interface HiaDocumentSelectorItem {
  language?: string;
  pattern?: string;
  scheme: "file";
}

export function resolveHiaServerModule(extensionPath: string): string {
  return path.resolve(extensionPath, ...HIA_SERVER_RELATIVE_PATH);
}

export function createHiaDocumentSelector(): HiaDocumentSelectorItem[] {
  return [
    {
      scheme: "file",
      language: HIA_LANGUAGE_ID
    },
    {
      scheme: "file",
      pattern: "**/*.hia.json"
    }
  ];
}

export function createHiaFileWatcherPattern(): string {
  return "**/*.hia.json";
}
