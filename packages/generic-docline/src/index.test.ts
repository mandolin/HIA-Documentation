import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDocumentationProducer } from "@hia-doc/plugin-sdk";
import {
  GENERIC_DOCLINE_CONFIG_CONTRACT,
  GENERIC_DOCLINE_CONFIG_VERSION,
  GENERIC_DOCLINE_EXTRACTION_CONTRACT,
  genericDocLineProducer,
  genericDocLineToHiaDocument,
  scanGenericDocLine,
  type GenericDocLineConfig
} from "./index.js";

const fixtureConfig: GenericDocLineConfig = {
  attachmentRule: "next-symbol",
  commentSyntax: {
    kind: "line",
    linePrefix: "#"
  },
  contract: GENERIC_DOCLINE_CONFIG_CONTRACT,
  contractVersion: GENERIC_DOCLINE_CONFIG_VERSION,
  defaultSymbolKind: "generic-section",
  diagnosticProfile: "warn",
  docBlock: {
    marker: "@doc",
    stripMarker: true
  },
  fileGlobs: ["**/*.toy"],
  inputRoot: "src",
  languageId: "toy",
  sourceRangePolicy: "doc-and-symbol",
  symbolAnchorRule: {
    kindGroup: "kind",
    nameGroup: "name",
    pattern: "^(?<kind>fn|value)\\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)",
    signatureGroup: "signature"
  },
  symbolKindMapping: {
    fn: "generic-function",
    value: "generic-value"
  },
  title: "Toy Generic Docs",
  visibilityPolicy: "all"
};

describe("@hia-doc/generic-docline", () => {
  it("scans configured doc blocks and anchors", async () => {
    const root = await createToyProject();
    try {
      const extraction = await scanGenericDocLine({
        config: fixtureConfig,
        outputDirectory: path.join(root, "dist"),
        workspaceRoot: root
      });

      expect(extraction.contract).toBe(GENERIC_DOCLINE_EXTRACTION_CONTRACT);
      expect(extraction.sourcesContentPolicy).toBe("none");
      expect(extraction.symbols.map((symbol) => symbol.name)).toEqual(["greet", "answer"]);
      expect(extraction.symbols[0]?.kind).toBe("generic-function");
      expect(extraction.symbols[0]?.source.relativePath).toBe("src/sample.toy");
      expect(extraction.symbols[0]?.source.docRange?.start.line).toBe(1);
      expect(extraction.adapterSlots.some((slot) => slot.id === "tree-sitter" && slot.status === "reserved")).toBe(true);

      const hia = genericDocLineToHiaDocument(extraction, { title: "Toy Generic Docs" });
      expect(hia.schemaVersion).toBe("0.2.0");
      expect(hia.symbols[0]?.source?.definedIn?.language).toBe("toy");
      expect(hia.symbols[0]?.source?.definedIn?.relativePath).toBe("src/sample.toy");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("runs as a documentation producer", async () => {
    const root = await createToyProject();
    try {
      await writeFile(path.join(root, "generic-docline.config.json"), `${JSON.stringify(fixtureConfig, null, 2)}\n`, "utf8");
      const result = await runDocumentationProducer(genericDocLineProducer, {
        inputs: [{ kind: "generic-docline-config", path: "generic-docline.config.json" }],
        outputDirectory: path.join(root, "dist"),
        workspaceRoot: root
      });

      expect(result.status).toBe("success");
      expect(result.artifacts.map((artifact) => artifact.kind)).toEqual(["generic-docline-extraction", "hia-document"]);
      const extraction = JSON.parse(await readFile(path.join(root, "dist", "generic-docline.extraction.json"), "utf8")) as { symbols: unknown[] };
      expect(extraction.symbols).toHaveLength(2);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("suppresses non-error diagnostics when the profile is off", async () => {
    const root = await createToyProject();
    try {
      const extraction = await scanGenericDocLine({
        config: {
          ...fixtureConfig,
          diagnosticProfile: "off"
        },
        outputDirectory: path.join(root, "dist"),
        workspaceRoot: root
      });

      expect(extraction.diagnostics).toEqual([]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

async function createToyProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-generic-docline-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "sample.toy"), [
    "# @doc",
    "# Greets a profile.",
    "fn greet(name)",
    "",
    "# ordinary comment",
    "fn undocumented()",
    "",
    "# @doc",
    "# Meaningful value.",
    "value answer"
  ].join("\n"), "utf8");
  return root;
}
