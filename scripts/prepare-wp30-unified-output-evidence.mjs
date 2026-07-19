import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(rootDir, "dist", "wp30-unified-output-evidence");
const workspaceRoot = path.join(evidenceRoot, "workspace");
const docsOut = path.join(evidenceRoot, "docs");
const panelOut = path.join(evidenceRoot, "source-linkage");
const evidencePath = path.join(evidenceRoot, "evidence.json");

await main();

/**
 * 准备 W-P30.6 的统一输出证据：generic producer、JavaDoc/GoDoc 风格 HIA document、doc-source-map、统一 HTML 与 browser panel payload。
 * Prepares W-P30.6 unified output evidence with generic producer output, JavaDoc/GoDoc-style HIA documents, doc-source-map, unified HTML, and browser-panel payload.
 */
async function main() {
  await rm(evidenceRoot, { force: true, recursive: true });
  await mkdir(workspaceRoot, { recursive: true });
  await mkdir(docsOut, { recursive: true });
  await materializeWorkspace();

  runCli(["docs", "build", "--project-manifest", path.join(workspaceRoot, "project.hia-project.json"), "--out", docsOut]);
  runCli([
    "browser",
    "panel",
    "--project-manifest",
    path.join(workspaceRoot, "project.hia-project.json"),
    "--project-index",
    path.join(docsOut, "project-index.json"),
    "--out",
    panelOut
  ]);

  const projectIndex = await readJson(path.join(docsOut, "project-index.json"));
  const manifest = await readJson(path.join(docsOut, "hia-manifest.json"));
  const panelPayload = await readJson(path.join(panelOut, "browser-panel-payload.json"));
  const html = await readFile(path.join(docsOut, "index.html"), "utf8");
  const genericExtraction = await readJson(path.join(docsOut, ".hia-producers", "generic-docline", "generic-docline.extraction.json"));

  const entries = projectIndex.entries ?? [];
  const entryNames = new Set(entries.map((entry) => entry.name));
  const genericEntry = entries.find((entry) => entry.symbolId === "generic:toy:src/toy/sample.toy:greet");
  const javadocEntry = entries.find((entry) => entry.symbolId === "javadoc:com.example.Widget");
  const godocEntry = entries.find((entry) => entry.symbolId === "godoc:example.WidgetName");

  assert.equal(projectIndex.contract, "hia-project-navigation-index");
  assert.ok(entryNames.has("Widget"), "Unified project index must include JavaDoc-style entry.");
  assert.ok(entryNames.has("WidgetName"), "Unified project index must include GoDoc-style entry.");
  assert.ok(entryNames.has("greet"), "Unified project index must include generic doc-line entry.");
  assert.ok(genericEntry?.docSourceMap?.sourcePath === "src/toy/sample.toy", "Generic entry must be linked to doc-source-map source.");
  assert.ok(javadocEntry?.docSourceMap?.sourcePath === "src/java/com/example/Widget.java", "JavaDoc entry must be linked to source.");
  assert.ok(godocEntry?.docSourceMap?.sourcePath === "src/go/widget.go", "GoDoc entry must be linked to source.");
  assert.ok(projectIndex.relationGraph?.relationCount >= 6, "Project relation graph must contain source/artifact relations.");
  assert.ok(html.includes("Widget") && html.includes("WidgetName") && html.includes("greet"), "Unified HTML must render all evidence entries.");
  assert.equal(genericExtraction.sourcesContentPolicy, "none");
  assert.equal(panelPayload.docSourceMaps?.[0]?.sourcesContentPolicy, "none");
  assert.ok(panelPayload.relationGraph?.relationCount >= 6, "Browser panel payload must include relation graph.");
  assert.ok((panelPayload.docSourceMaps ?? []).length >= 1, "Browser panel payload must include doc-source-map input.");
  assert.ok(!JSON.stringify(projectIndex).includes("\"sourcesContent\":"), "Project index must not embed sourcesContent.");
  assert.ok(!JSON.stringify(panelPayload).includes("class Widget"), "Browser panel payload must not embed source bodies.");

  const evidence = {
    contract: "wp30-unified-output-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    generatedAt: path.relative(rootDir, evidenceRoot).replaceAll("\\", "/"),
    checks: {
      genericDocLineProducer: {
        symbolCount: genericExtraction.symbols?.length ?? 0,
        sourcesContentPolicy: genericExtraction.sourcesContentPolicy
      },
      unifiedHtml: {
        entryCount: entries.length,
        relationCount: projectIndex.relationGraph?.relationCount ?? 0,
        views: projectIndex.project?.views ?? []
      },
      sourceLinkage: {
        docSourceMapCount: panelPayload.docSourceMaps?.length ?? 0,
        panelRelationCount: panelPayload.relationGraph?.relationCount ?? 0,
        sourcesContentPolicy: panelPayload.docSourceMaps?.[0]?.sourcesContentPolicy
      }
    },
    files: {
      manifest: path.relative(rootDir, path.join(docsOut, "hia-manifest.json")).replaceAll("\\", "/"),
      projectIndex: path.relative(rootDir, path.join(docsOut, "project-index.json")).replaceAll("\\", "/"),
      html: path.relative(rootDir, path.join(docsOut, "index.html")).replaceAll("\\", "/"),
      browserPanelPayload: path.relative(rootDir, path.join(panelOut, "browser-panel-payload.json")).replaceAll("\\", "/")
    },
    manifestBuild: manifest.build
  };

  await writeJson(evidencePath, evidence);
  console.log(`W-P30 unified output evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

async function materializeWorkspace() {
  await mkdir(path.join(workspaceRoot, "src", "toy"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "src", "java", "com", "example"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "src", "go"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "docs"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "producers"), { recursive: true });

  await writeFile(path.join(workspaceRoot, "src", "toy", "sample.toy"), [
    "# @doc",
    "# Greets a profile from a private DSL.",
    "fn greet(name)"
  ].join("\n"), "utf8");
  await writeFile(path.join(workspaceRoot, "src", "java", "com", "example", "Widget.java"), [
    "package com.example;",
    "",
    "/** Represents a Java widget. */",
    "public class Widget {",
    "}"
  ].join("\n"), "utf8");
  await writeFile(path.join(workspaceRoot, "src", "go", "widget.go"), [
    "package example",
    "",
    "// WidgetName returns the visible widget name.",
    "func WidgetName() string {",
    "  return \"widget\"",
    "}"
  ].join("\n"), "utf8");

  await writeJson(path.join(workspaceRoot, "generic-docline.config.json"), createGenericDocLineConfig());
  await writeJson(path.join(workspaceRoot, "docs", "javadoc.hia.json"), createLanguageDocument({
    documentId: "fixture:javadoc",
    kind: "javadoc-class",
    language: "java",
    name: "Widget",
    relativePath: "src/java/com/example/Widget.java",
    summary: "Represents a Java widget.",
    symbolId: "javadoc:com.example.Widget",
    title: "JavaDoc Fixture"
  }));
  await writeJson(path.join(workspaceRoot, "docs", "godoc.hia.json"), createLanguageDocument({
    documentId: "fixture:godoc",
    kind: "godoc-function",
    language: "go",
    name: "WidgetName",
    relativePath: "src/go/widget.go",
    signature: "func WidgetName() string",
    summary: "Returns the visible widget name.",
    symbolId: "godoc:example.WidgetName",
    title: "GoDoc Fixture"
  }));
  await writeJson(path.join(workspaceRoot, "docs", "wp30.doc-source-map.json"), createDocSourceMap());
  await writeJson(path.join(workspaceRoot, "project.hia-project.json"), createProjectManifest());

  const genericProducerDist = path.join(rootDir, "packages", "generic-docline", "dist", "index.js");
  const producerModule = path.join(workspaceRoot, "producers", "generic-docline.producer.mjs");
  const relativeImport = ensureRelativeImport(path.relative(path.dirname(producerModule), genericProducerDist).replaceAll("\\", "/"));
  await writeFile(producerModule, [
    `export { genericDocLineProducer as default } from "${relativeImport}";`,
    `export { genericDocLineProducer } from "${relativeImport}";`
  ].join("\n"), "utf8");
}

function createGenericDocLineConfig() {
  return {
    contract: "generic-docline-config",
    contractVersion: "0.1.0-draft",
    id: "fixture:generic-docline",
    title: "Generic Doc-Line Fixture",
    languageId: "toy",
    fileGlobs: ["src/toy/*.toy"],
    commentSyntax: {
      kind: "line",
      linePrefix: "#"
    },
    docBlock: {
      marker: "@doc",
      stripMarker: true
    },
    attachmentRule: "next-symbol",
    symbolAnchorRule: {
      kindGroup: "kind",
      nameGroup: "name",
      pattern: "^(?<kind>fn|value)\\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)"
    },
    symbolKindMapping: {
      fn: "generic-function",
      value: "generic-value"
    },
    diagnosticProfile: "warn",
    sourceRangePolicy: "doc-and-symbol",
    visibilityPolicy: "all"
  };
}

function createProjectManifest() {
  return {
    schemaVersion: "0.1.0-draft",
    project: {
      id: "project:wp30-unified-output",
      name: "W-P30 Unified Output Evidence",
      title: "W-P30 Unified Output Evidence",
      defaultLocale: "en",
      locales: ["en"]
    },
    producers: [
      {
        id: "generic-docline",
        module: "producers/generic-docline.producer.mjs",
        exportName: "genericDocLineProducer",
        outputDirectory: ".hia-producers/generic-docline",
        inputs: [
          {
            kind: "generic-docline-config",
            path: "generic-docline.config.json"
          }
        ]
      }
    ],
    inputs: [
      {
        kind: "hia-document",
        domain: "other",
        path: "docs/javadoc.hia.json"
      },
      {
        kind: "hia-document",
        domain: "other",
        path: "docs/godoc.hia.json"
      },
      {
        kind: "doc-source-map",
        path: "docs/wp30.doc-source-map.json"
      }
    ]
  };
}

function createLanguageDocument(options) {
  const sourceRange = {
    start: { line: 3, column: 1 },
    end: { line: 5, column: 1 }
  };
  const symbol = {
    id: options.symbolId,
    kind: options.kind,
    name: options.name,
    summary: options.summary,
    ...(options.signature ? { signature: options.signature } : {}),
    source: {
      model: "hia-source",
      modelVersion: "0.2.0",
      mode: "link",
      definedIn: {
        kind: "defined-in",
        language: options.language,
        relativePath: options.relativePath,
        position: sourceRange.start,
        range: sourceRange
      },
      diagnostics: [],
      fragments: []
    }
  };

  return {
    schemaVersion: "0.2.0",
    id: options.documentId,
    title: options.title,
    defaultLocale: "en",
    locales: ["en"],
    nodes: [
      {
        id: "root",
        kind: "root",
        title: options.title,
        symbolIds: [options.symbolId]
      }
    ],
    symbols: [symbol],
    diagnostics: []
  };
}

function createDocSourceMap() {
  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:wp30-unified-output",
    artifacts: [
      createArtifact("artifact:javadoc", "docs/javadoc.hia.json", "hia-document"),
      createArtifact("artifact:godoc", "docs/godoc.hia.json", "hia-document"),
      createArtifact("artifact:generic", ".hia-producers/generic-docline/generic-docline.hia.json", "hia-document")
    ],
    sources: [
      createSource("source:javadoc", "src/java/com/example/Widget.java", "java"),
      createSource("source:godoc", "src/go/widget.go", "go"),
      createSource("source:generic", "src/toy/sample.toy", "toy")
    ],
    sourceMaps: [],
    chains: [],
    entries: [
      createDocMapEntry({
        artifactId: "artifact:javadoc",
        id: "entry:javadoc-widget",
        sourceId: "source:javadoc",
        sourcePath: "src/java/com/example/Widget.java",
        symbolId: "javadoc:com.example.Widget",
        symbolKind: "javadoc-class"
      }),
      createDocMapEntry({
        artifactId: "artifact:godoc",
        id: "entry:godoc-widget-name",
        sourceId: "source:godoc",
        sourcePath: "src/go/widget.go",
        symbolId: "godoc:example.WidgetName",
        symbolKind: "godoc-function"
      }),
      createDocMapEntry({
        artifactId: "artifact:generic",
        id: "entry:generic-greet",
        sourceId: "source:generic",
        sourcePath: "src/toy/sample.toy",
        symbolId: "generic:toy:src/toy/sample.toy:greet",
        symbolKind: "generic-function"
      })
    ],
    privacy: {
      sourcesContentPolicy: "none",
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowPathTraversal: false,
      releaseGate: {
        requireExplicitEmbedOptIn: true,
        failOnUnsafePath: true,
        failOnUnexpectedSourcesContent: true
      }
    },
    diagnostics: []
  };
}

function createArtifact(id, artifactPath, contract) {
  return {
    id,
    kind: "documentation-artifact",
    path: artifactPath,
    language: "json",
    role: "generated",
    contractRefs: [
      {
        contract,
        path: artifactPath
      }
    ]
  };
}

function createSource(id, sourcePath, language) {
  return {
    id,
    kind: `${language}-source`,
    path: sourcePath,
    language,
    role: "original",
    sourcesContentPolicy: "none"
  };
}

function createDocMapEntry(options) {
  return {
    id: options.id,
    kind: "symbol",
    symbolId: options.symbolId,
    symbolKind: options.symbolKind,
    sourceRefs: [
      {
        sourceId: options.sourceId,
        range: {
          start: { line: 1, column: 1 },
          end: { line: 5, column: 1 }
        },
        rangeSource: "wp30-fixture",
        confidence: "medium"
      }
    ],
    artifactRefs: [
      {
        artifactId: options.artifactId,
        selector: `symbol:${options.symbolId}`,
        rangeSource: "wp30-fixture",
        confidence: "medium"
      }
    ],
    diagnostics: []
  };
}

function runCli(args) {
  const result = spawnSync(process.execPath, [path.join(rootDir, "apps", "cli", "dist", "index.js"), ...args], {
    cwd: rootDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, `CLI failed: ${result.stderr || result.stdout}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureRelativeImport(value) {
  return value.startsWith(".") ? value : `./${value}`;
}
