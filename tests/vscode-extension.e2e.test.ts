import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("VS Code extension package", () => {
  it("declares activation, language and command contributions", async () => {
    const packagePath = fileURLToPath(new URL("../apps/vscode-extension/package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      activationEvents: string[];
      contributes: {
        commands: Array<{ command: string; title: string }>;
        languages: Array<{ extensions: string[]; id: string }>;
      };
      main: string;
    };

    expect(manifest.main).toBe("./dist/extension.js");
    expect(manifest.activationEvents).toContain("onLanguage:hia");
    expect(manifest.activationEvents).toContain("onCommand:hia.showOutput");
    expect(manifest.contributes.languages[0]).toMatchObject({
      id: "hia",
      extensions: [".hia.json"]
    });
    expect(manifest.contributes.commands[0]).toMatchObject({
      command: "hia.showOutput",
      title: "HIA: Show Output"
    });
  });
});
