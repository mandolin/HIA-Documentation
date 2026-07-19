import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceContainer = path.resolve(rootDir, "..");
const godocSatelliteRoot = path.join(workspaceContainer, "HIA", "hia-godoc");
const evidenceRoot = path.join(rootDir, "dist", "wp31-godoc-unified-evidence");
const workspaceRoot = path.join(evidenceRoot, "workspace");
const docsOut = path.join(evidenceRoot, "docs");
const panelOut = path.join(evidenceRoot, "source-linkage");
const evidencePath = path.join(evidenceRoot, "evidence.json");
const godocConfigPath = path.join(workspaceRoot, "godoc.config.json");
const godocOutputRelative = "docs/godoc";
const godocHiaRelative = `${godocOutputRelative}/wp31-godoc.hia.json`;
const godocExtractionRelative = `${godocOutputRelative}/wp31-godoc.godoc.json`;
const godocProducerResultRelative = `${godocOutputRelative}/godoc.producer-result.json`;
const docSourceMapRelative = "docs/wp31-godoc.doc-source-map.json";

await main();

/**
 * 准备 W-P31.3 的真实 GoDoc 统一输出证据。
 * Prepares W-P31.3 real GoDoc unified output evidence.
 *
 * @lang zh-CN 该脚本在临时 evidence workspace 中建立最小 Go module，经本地 `hia-godoc` satellite runner 生成真实 GoDoc artifact，再交给主仓统一输出链路消费。
 * @lang en This script creates a minimal Go module in the evidence workspace, uses the local `hia-godoc` satellite runner to produce real GoDoc artifacts, and feeds them into the main unified output pipeline.
 */
async function main() {
  await rm(evidenceRoot, { force: true, recursive: true });
  await mkdir(workspaceRoot, { recursive: true });
  await mkdir(docsOut, { recursive: true });
  await materializeWorkspace();

  const godocRun = runGoDocRunner();
  const godocDocument = await readJson(path.join(workspaceRoot, godocHiaRelative));
  const godocExtraction = await readJson(path.join(workspaceRoot, godocExtractionRelative));
  const godocProducerResult = await readJson(path.join(workspaceRoot, godocProducerResultRelative));
  await writeJson(path.join(workspaceRoot, docSourceMapRelative), createDocSourceMap(godocDocument));
  await writeJson(path.join(workspaceRoot, "project.hia-project.json"), createProjectManifest());

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
  const godocEntries = entries.filter((entry) => entry.symbolId?.startsWith("go:example.com/hia/wp31godoc/profile"));
  const linkedGoDocEntries = godocEntries.filter((entry) => entry.docSourceMap?.sourcePath);
  const packageEntry = entries.find((entry) => entry.symbolId === "go:example.com/hia/wp31godoc/profile:package");
  const profileType = entries.find((entry) => entry.symbolId === "go:example.com/hia/wp31godoc/profile:type:Profile");
  const displayName = entries.find((entry) => entry.symbolId === "go:example.com/hia/wp31godoc/profile:func:.DisplayName");
  const genericEntry = entries.find((entry) => entry.symbolId === "generic:toy:src/toy/sample.toy:greet");
  const docSourceMap = panelPayload.docSourceMaps?.[0];

  assert.equal(projectIndex.contract, "hia-project-navigation-index");
  assert.equal(godocExtraction.contract, "godoc-extraction");
  assert.equal(godocExtraction.sourcesContentPolicy, "none");
  assert.equal(godocProducerResult.status, "success");
  assert.ok(godocProducerResult.produced?.some((item) => item.kind === "godoc-extraction"), "GoDoc runner must produce extraction artifact.");
  assert.ok(godocProducerResult.produced?.some((item) => item.kind === "hia-document"), "GoDoc runner must produce HIA document.");
  assert.ok(godocEntries.length >= 5, "Unified project index must include real GoDoc entries.");
  assert.ok(linkedGoDocEntries.length >= 5, "Real GoDoc entries must be linked through doc-source-map.");
  assert.ok(packageEntry?.docSourceMap?.sourcePath === "src/go/profile/doc.go", "Go package entry must link back to doc.go.");
  assert.ok(profileType?.docSourceMap?.sourcePath === "src/go/profile/profile.go", "Profile type must link back to profile.go.");
  assert.ok(displayName?.docSourceMap?.sourcePath === "src/go/profile/profile.go", "DisplayName function must link back to profile.go.");
  assert.ok(genericEntry?.docSourceMap?.sourcePath === "src/toy/sample.toy", "Generic entry must remain linked.");
  assert.ok(projectIndex.relationGraph?.relationCount >= linkedGoDocEntries.length * 2, "Project relation graph must contain GoDoc source/artifact relations.");
  assert.ok(html.includes("profile") && html.includes("DisplayName") && html.includes("greet"), "Unified HTML must render GoDoc and generic entries.");
  assert.equal(genericExtraction.sourcesContentPolicy, "none");
  assert.equal(docSourceMap?.sourcesContentPolicy, "none");
  assert.ok((docSourceMap?.linkedEntryCount ?? 0) >= linkedGoDocEntries.length, "Browser panel doc-source-map must expose linked GoDoc entries.");
  assert.ok(panelPayload.relationGraph?.relationCount >= linkedGoDocEntries.length * 2, "Browser panel payload must include relation graph.");
  assert.ok(!JSON.stringify(projectIndex).includes("\"sourcesContent\":"), "Project index must not embed sourcesContent.");
  assert.ok(!JSON.stringify(panelPayload).includes("return \"Profile: \""), "Browser panel payload must not embed Go source body.");

  const evidence = {
    contract: "wp31-godoc-unified-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    generatedAt: normalizeRelative(evidenceRoot),
    checks: {
      godocRunner: {
        command: normalizeRelative(path.join(godocSatelliteRoot, "packages", "godoc-runner", "src", "cli.mjs")),
        producedKinds: godocProducerResult.produced?.map((item) => item.kind) ?? [],
        runnerStdout: godocRun.stdout.trim(),
        symbolCount: godocDocument.symbols?.length ?? 0,
        sourcedSymbolCount: linkedGoDocEntries.length,
        extractionSourcesContentPolicy: godocExtraction.sourcesContentPolicy
      },
      genericDocLineProducer: {
        symbolCount: genericExtraction.symbols?.length ?? 0,
        sourcesContentPolicy: genericExtraction.sourcesContentPolicy
      },
      unifiedHtml: {
        entryCount: entries.length,
        godocEntryCount: godocEntries.length,
        relationCount: projectIndex.relationGraph?.relationCount ?? 0,
        views: projectIndex.project?.views ?? []
      },
      sourceLinkage: {
        docSourceMapCount: panelPayload.docSourceMaps?.length ?? 0,
        linkedEntryCount: docSourceMap?.linkedEntryCount ?? 0,
        panelRelationCount: panelPayload.relationGraph?.relationCount ?? 0,
        sourcesContentPolicy: docSourceMap?.sourcesContentPolicy
      }
    },
    files: {
      manifest: normalizeRelative(path.join(docsOut, "hia-manifest.json")),
      projectIndex: normalizeRelative(path.join(docsOut, "project-index.json")),
      html: normalizeRelative(path.join(docsOut, "index.html")),
      browserPanelPayload: normalizeRelative(path.join(panelOut, "browser-panel-payload.json")),
      godocExtraction: normalizeRelative(path.join(workspaceRoot, godocExtractionRelative)),
      godocHiaDocument: normalizeRelative(path.join(workspaceRoot, godocHiaRelative)),
      docSourceMap: normalizeRelative(path.join(workspaceRoot, docSourceMapRelative))
    },
    manifestBuild: manifest.build
  };

  await writeJson(evidencePath, evidence);
  console.log(`W-P31 GoDoc unified output evidence prepared at ${normalizeRelative(evidencePath)}`);
}

async function materializeWorkspace() {
  await mkdir(path.join(workspaceRoot, "src", "go", "profile"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "src", "toy"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "docs"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "producers"), { recursive: true });

  await writeFile(path.join(workspaceRoot, "src", "go", "go.mod"), [
    "module example.com/hia/wp31godoc",
    "",
    "go 1.26.0"
  ].join("\n"), "utf8");

  await writeFile(path.join(workspaceRoot, "src", "go", "profile", "doc.go"), [
    "// Package profile renders W-P31 GoDoc evidence data.",
    "package profile"
  ].join("\n"), "utf8");

  await writeFile(path.join(workspaceRoot, "src", "go", "profile", "profile.go"), [
    "package profile",
    "",
    "// DefaultDisplayName is used when a profile has no name.",
    "const DefaultDisplayName = \"anonymous\"",
    "",
    "// Profile stores W-P31 profile data.",
    "type Profile struct {",
    "\t// Name is the public display name.",
    "\tName string",
    "}",
    "",
    "// DisplayName returns a formatted display name.",
    "func DisplayName(profile Profile) string {",
    "\tif profile.Name == \"\" {",
    "\t\treturn DefaultDisplayName",
    "\t}",
    "\treturn \"Profile: \" + profile.Name",
    "}"
  ].join("\n"), "utf8");

  await writeFile(path.join(workspaceRoot, "src", "toy", "sample.toy"), [
    "# @doc",
    "# Greets a profile from a private DSL.",
    "fn greet(name)"
  ].join("\n"), "utf8");

  await writeJson(godocConfigPath, {
    workspaceRoot,
    outputDirectory: path.join(workspaceRoot, godocOutputRelative),
    defaultLocale: "en",
    inputs: [
      {
        kind: "go-package-root",
        packageDirectory: "src/go",
        patterns: ["./profile"],
        artifactBasePath: "wp31-godoc",
        title: "W-P31 Real GoDoc Evidence",
        hiaDocumentId: "wp31-real-godoc"
      }
    ]
  });

  await writeJson(path.join(workspaceRoot, "generic-docline.config.json"), createGenericDocLineConfig());

  const genericProducerDist = path.join(rootDir, "packages", "generic-docline", "dist", "index.js");
  const producerModule = path.join(workspaceRoot, "producers", "generic-docline.producer.mjs");
  const relativeImport = ensureRelativeImport(path.relative(path.dirname(producerModule), genericProducerDist).replaceAll("\\", "/"));
  await writeFile(producerModule, [
    `export { genericDocLineProducer as default } from "${relativeImport}";`,
    `export { genericDocLineProducer } from "${relativeImport}";`
  ].join("\n"), "utf8");
}

function createProjectManifest() {
  return {
    schemaVersion: "0.1.0-draft",
    project: {
      id: "project:wp31-godoc-unified",
      name: "W-P31 GoDoc Unified Evidence",
      title: "W-P31 GoDoc Unified Evidence",
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
        path: godocHiaRelative
      },
      {
        kind: "doc-source-map",
        path: docSourceMapRelative
      }
    ]
  };
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

function createDocSourceMap(document) {
  const goSymbols = (document.symbols ?? []).filter((symbol) => symbol.source?.definedIn?.relativePath);
  const sources = [...new Map(goSymbols.map((symbol) => {
    const definedIn = symbol.source.definedIn;
    return [definedIn.relativePath, createSource(sourceId("go", definedIn.relativePath), definedIn.relativePath, "go")];
  })).values()];

  sources.push(createSource("source:generic:toy-sample", "src/toy/sample.toy", "toy"));

  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:wp31-godoc-unified",
    artifacts: [
      createArtifact("artifact:godoc-hia", godocHiaRelative, "hia-document"),
      createArtifact("artifact:generic-hia", ".hia-producers/generic-docline/generic-docline.hia.json", "hia-document")
    ],
    sources,
    sourceMaps: [],
    chains: [],
    entries: [
      ...goSymbols.map((symbol) => createGoDocMapEntry(symbol)),
      createGenericDocMapEntry()
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

function createGoDocMapEntry(symbol) {
  const definedIn = symbol.source.definedIn;
  const range = definedIn.range ?? {
    start: definedIn.position,
    end: definedIn.position
  };

  return {
    id: `entry:godoc:${slug(symbol.id)}`,
    kind: "symbol",
    symbolId: symbol.id,
    symbolKind: symbol.kind,
    sourceRefs: [
      {
        sourceId: sourceId("go", definedIn.relativePath),
        range,
        rangeSource: "godoc-runner",
        confidence: "high"
      }
    ],
    artifactRefs: [
      {
        artifactId: "artifact:godoc-hia",
        selector: `symbol:${symbol.id}`,
        rangeSource: "godoc-runner",
        confidence: "high"
      }
    ],
    diagnostics: []
  };
}

function createGenericDocMapEntry() {
  return {
    id: "entry:generic-greet",
    kind: "symbol",
    symbolId: "generic:toy:src/toy/sample.toy:greet",
    symbolKind: "generic-function",
    sourceRefs: [
      {
        sourceId: "source:generic:toy-sample",
        range: {
          start: { line: 1, column: 1 },
          end: { line: 3, column: 15 }
        },
        rangeSource: "generic-docline-fixture",
        confidence: "medium"
      }
    ],
    artifactRefs: [
      {
        artifactId: "artifact:generic-hia",
        selector: "symbol:generic:toy:src/toy/sample.toy:greet",
        rangeSource: "generic-docline-fixture",
        confidence: "medium"
      }
    ],
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

function sourceId(language, sourcePath) {
  return `source:${language}:${slug(sourcePath)}`;
}

function runGoDocRunner() {
  const runnerPath = path.join(godocSatelliteRoot, "packages", "godoc-runner", "src", "cli.mjs");
  const result = spawnSync(process.execPath, [runnerPath, "--config", godocConfigPath], {
    cwd: godocSatelliteRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, `GoDoc runner failed: ${result.stderr || result.stdout}`);
  return result;
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

function normalizeRelative(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function ensureRelativeImport(value) {
  return value.startsWith(".") ? value : `./${value}`;
}

function slug(value) {
  return String(value).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "item";
}
