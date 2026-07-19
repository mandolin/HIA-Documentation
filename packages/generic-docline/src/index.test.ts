import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDocumentationProducer } from "@hia-doc/plugin-sdk";
import {
  GENERIC_DOCLINE_CONFIG_CONTRACT,
  GENERIC_DOCLINE_CONFIG_JSON_SCHEMA,
  GENERIC_DOCLINE_CONFIG_SCHEMA_ID,
  GENERIC_DOCLINE_CONFIG_VERSION,
  GENERIC_DOCLINE_EXTRACTION_CONTRACT,
  GENERIC_DOCLINE_EXTRACTION_JSON_SCHEMA,
  GENERIC_DOCLINE_EXTRACTION_SCHEMA_ID,
  genericDocLineProducer,
  genericDocLineToHiaDocument,
  scanGenericDocLine,
  validateGenericDocLineConfig,
  validateGenericDocLineExtraction,
  type GenericDocLineConfig,
  type GenericDocLineExtraction
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
      expect(validateGenericDocLineConfig(fixtureConfig)).toEqual([]);
      expect(validateGenericDocLineExtraction(extraction)).toEqual([]);
      expect(extraction.symbols.map((symbol) => symbol.name)).toEqual(["greet", "answer"]);
      expect(extraction.symbols[0]?.kind).toBe("generic-function");
      expect(extraction.symbols[0]?.source.relativePath).toBe("src/sample.toy");
      expect(extraction.symbols[0]?.source.docRange?.start.line).toBe(1);
      expect(extraction.adapterSlots.some((slot) => slot.id === "tree-sitter" && slot.status === "reserved")).toBe(true);

      const hia = genericDocLineToHiaDocument(extraction, { title: "Toy Generic Docs" });
      expect(hia.schemaVersion).toBe("0.2.0");
      expect(hia.symbols[0]?.source?.definedIn?.language).toBe("toy");
      expect(hia.symbols[0]?.source?.definedIn?.relativePath).toBe("src/sample.toy");
      expect(hia.symbols.every((symbol) => !("summary" in symbol) || symbol.summary)).toBe(true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("exports schemas and rejects unsafe contracts", async () => {
    const root = await createToyProject();
    try {
      const extraction = await scanGenericDocLine({
        config: fixtureConfig,
        outputDirectory: path.join(root, "dist"),
        workspaceRoot: root
      });
      const badExtraction: GenericDocLineExtraction = {
        ...extraction,
        sourcesContentPolicy: "none",
        symbols: [
          {
            ...extraction.symbols[0]!,
            sourcesContent: "private body"
          } as unknown as GenericDocLineExtraction["symbols"][number]
        ]
      };

      expect(GENERIC_DOCLINE_CONFIG_JSON_SCHEMA.$id).toBe(GENERIC_DOCLINE_CONFIG_SCHEMA_ID);
      expect(GENERIC_DOCLINE_EXTRACTION_JSON_SCHEMA.$id).toBe(GENERIC_DOCLINE_EXTRACTION_SCHEMA_ID);
      expect(GENERIC_DOCLINE_CONFIG_JSON_SCHEMA.properties.contract.const).toBe(GENERIC_DOCLINE_CONFIG_CONTRACT);
      expect(GENERIC_DOCLINE_EXTRACTION_JSON_SCHEMA.properties.contract.const).toBe(GENERIC_DOCLINE_EXTRACTION_CONTRACT);
      expect(validateGenericDocLineConfig({ ...fixtureConfig, inputRoot: "../outside" }).map((diagnostic) => diagnostic.code)).toContain("HIA_GENERIC_DOCLINE_INPUT_ROOT_UNSAFE");
      expect(validateGenericDocLineConfig({ ...fixtureConfig, fileGlobs: ["C:/secret/*.toy"] }).map((diagnostic) => diagnostic.code)).toContain("HIA_GENERIC_DOCLINE_GLOB_UNSAFE");
      expect(validateGenericDocLineExtraction(badExtraction).map((diagnostic) => diagnostic.code)).toContain("HIA_GENERIC_DOCLINE_SOURCES_CONTENT_FORBIDDEN");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("scans configured block comments", async () => {
    const root = await createBlockProject();
    try {
      const extraction = await scanGenericDocLine({
        config: {
          ...fixtureConfig,
          commentSyntax: {
            blockEnd: "*/",
            blockLinePrefix: "*",
            blockStart: "/*",
            kind: "block"
          },
          fileGlobs: ["**/*.dsl"],
          languageId: "blockdsl",
          symbolAnchorRule: {
            kindGroup: "kind",
            nameGroup: "name",
            pattern: "^(?<kind>value)\\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)"
          }
        },
        outputDirectory: path.join(root, "dist"),
        workspaceRoot: root
      });

      expect(validateGenericDocLineExtraction(extraction)).toEqual([]);
      expect(extraction.symbols.map((symbol) => symbol.name)).toEqual(["answer"]);
      expect(extraction.symbols[0]?.comment?.summary).toBe("Documents a block value.");
      expect(extraction.docBlocks[0]?.range.start.line).toBe(1);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("reports orphan and missing-symbol diagnostics by profile", async () => {
    const root = await createDiagnosticProject();
    try {
      const warnExtraction = await scanGenericDocLine({
        config: fixtureConfig,
        outputDirectory: path.join(root, "dist-warn"),
        workspaceRoot: root
      });
      const strictExtraction = await scanGenericDocLine({
        config: {
          ...fixtureConfig,
          diagnosticProfile: "strict"
        },
        outputDirectory: path.join(root, "dist-strict"),
        workspaceRoot: root
      });
      const offExtraction = await scanGenericDocLine({
        config: {
          ...fixtureConfig,
          diagnosticProfile: "off"
        },
        outputDirectory: path.join(root, "dist-off"),
        workspaceRoot: root
      });

      expect(warnExtraction.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_GENERIC_DOCLINE_ORPHAN_BLOCK");
      expect(warnExtraction.diagnostics.find((diagnostic) => diagnostic.code === "HIA_GENERIC_DOCLINE_MISSING_DOC")?.severity).toBe("info");
      expect(strictExtraction.diagnostics.find((diagnostic) => diagnostic.code === "HIA_GENERIC_DOCLINE_MISSING_DOC")?.severity).toBe("warning");
      expect(offExtraction.diagnostics).toEqual([]);
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

async function createBlockProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-generic-docline-block-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "sample.dsl"), [
    "/**",
    " * @doc",
    " * Documents a block value.",
    " */",
    "value answer"
  ].join("\n"), "utf8");
  return root;
}

async function createDiagnosticProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-generic-docline-diag-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "sample.toy"), [
    "fn undocumented()",
    "",
    "# @doc",
    "# This block has no following anchor."
  ].join("\n"), "utf8");
  return root;
}
