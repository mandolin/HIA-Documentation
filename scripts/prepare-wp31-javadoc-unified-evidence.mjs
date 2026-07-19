import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceContainer = path.resolve(rootDir, "..");
const javadocSatelliteRoot = path.join(workspaceContainer, "HIA", "hia-javadoc");
const evidenceRoot = path.join(rootDir, "dist", "wp31-javadoc-unified-evidence");
const workspaceRoot = path.join(evidenceRoot, "workspace");
const docsOut = path.join(evidenceRoot, "docs");
const panelOut = path.join(evidenceRoot, "source-linkage");
const evidencePath = path.join(evidenceRoot, "evidence.json");
const javadocConfigPath = path.join(workspaceRoot, "javadoc.config.json");
const javadocOutputRelative = "docs/javadoc";
const javadocHiaRelative = `${javadocOutputRelative}/wp31-javadoc.hia.json`;
const javadocExtractionRelative = `${javadocOutputRelative}/wp31-javadoc.javadoc.json`;
const javadocProducerResultRelative = `${javadocOutputRelative}/javadoc.producer-result.json`;
const docSourceMapRelative = "docs/wp31-javadoc.doc-source-map.json";

await main();

/**
 * 准备 W-P31.2 的真实 JavaDoc 统一输出证据。
 * Prepares W-P31.2 real JavaDoc unified output evidence.
 *
 * @lang zh-CN 该脚本故意通过本地 satellite runner 生成真实 JavaDoc artifact，再由 main-repo CLI 聚合，避免把 `HIA/hia-javadoc` 并入主仓 workspace。
 * @lang en This script intentionally uses the local satellite runner to produce real JavaDoc artifacts before aggregating them with the main-repo CLI, without adding `HIA/hia-javadoc` to the main workspace.
 */
async function main() {
  await rm(evidenceRoot, { force: true, recursive: true });
  await mkdir(workspaceRoot, { recursive: true });
  await mkdir(docsOut, { recursive: true });
  await materializeWorkspace();

  const javadocRun = runJavadocRunner();
  const javadocDocument = await readJson(path.join(workspaceRoot, javadocHiaRelative));
  const javadocExtraction = await readJson(path.join(workspaceRoot, javadocExtractionRelative));
  const javadocProducerResult = await readJson(path.join(workspaceRoot, javadocProducerResultRelative));
  await writeJson(path.join(workspaceRoot, docSourceMapRelative), createDocSourceMap(javadocDocument));
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
  const javadocEntries = entries.filter((entry) => entry.symbolId?.startsWith("java:com.example.docs"));
  const linkedJavadocEntries = javadocEntries.filter((entry) => entry.docSourceMap?.sourcePath);
  const genericEntry = entries.find((entry) => entry.symbolId === "generic:toy:src/toy/sample.toy:greet");
  const profileService = entries.find((entry) => entry.symbolId === "java:com.example.docs.ProfileService:ProfileService");
  const displayName = entries.find((entry) => entry.name === "displayName");
  const docSourceMap = panelPayload.docSourceMaps?.[0];

  assert.equal(projectIndex.contract, "hia-project-navigation-index");
  assert.equal(javadocExtraction.contract, "javadoc-extraction");
  assert.equal(javadocExtraction.sourcesContentPolicy, "none");
  assert.equal(javadocProducerResult.status, "success");
  assert.ok(javadocProducerResult.produced?.some((item) => item.kind === "javadoc-extraction"), "JavaDoc runner must produce extraction artifact.");
  assert.ok(javadocProducerResult.produced?.some((item) => item.kind === "hia-document"), "JavaDoc runner must produce HIA document.");
  assert.ok(javadocEntries.length >= 6, "Unified project index must include real JavaDoc entries.");
  assert.ok(linkedJavadocEntries.length >= 4, "Real JavaDoc entries must be linked through doc-source-map.");
  assert.ok(profileService?.docSourceMap?.sourcePath === "src/java/com/example/docs/ProfileService.java", "ProfileService must link back to Java source.");
  assert.ok(displayName?.docSourceMap?.sourcePath === "src/java/com/example/docs/ProfileService.java", "displayName method must link back to Java source.");
  assert.ok(genericEntry?.docSourceMap?.sourcePath === "src/toy/sample.toy", "Generic entry must remain linked.");
  assert.ok(projectIndex.relationGraph?.relationCount >= linkedJavadocEntries.length * 2, "Project relation graph must contain JavaDoc source/artifact relations.");
  assert.ok(html.includes("ProfileService") && html.includes("displayName") && html.includes("greet"), "Unified HTML must render JavaDoc and generic entries.");
  assert.equal(genericExtraction.sourcesContentPolicy, "none");
  assert.equal(docSourceMap?.sourcesContentPolicy, "none");
  assert.ok((docSourceMap?.linkedEntryCount ?? 0) >= linkedJavadocEntries.length, "Browser panel doc-source-map must expose linked JavaDoc entries.");
  assert.ok(panelPayload.relationGraph?.relationCount >= linkedJavadocEntries.length * 2, "Browser panel payload must include relation graph.");
  assert.ok(!JSON.stringify(projectIndex).includes("\"sourcesContent\":"), "Project index must not embed sourcesContent.");
  assert.ok(!JSON.stringify(panelPayload).includes("return \"Profile: \""), "Browser panel payload must not embed Java source body.");

  const evidence = {
    contract: "wp31-javadoc-unified-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    generatedAt: normalizeRelative(evidenceRoot),
    checks: {
      javadocRunner: {
        command: normalizeRelative(path.join(javadocSatelliteRoot, "packages", "javadoc-runner", "src", "cli.mjs")),
        producedKinds: javadocProducerResult.produced?.map((item) => item.kind) ?? [],
        runnerStdout: javadocRun.stdout.trim(),
        symbolCount: javadocDocument.symbols?.length ?? 0,
        sourcedSymbolCount: linkedJavadocEntries.length,
        extractionSourcesContentPolicy: javadocExtraction.sourcesContentPolicy
      },
      genericDocLineProducer: {
        symbolCount: genericExtraction.symbols?.length ?? 0,
        sourcesContentPolicy: genericExtraction.sourcesContentPolicy
      },
      unifiedHtml: {
        entryCount: entries.length,
        javadocEntryCount: javadocEntries.length,
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
      javadocExtraction: normalizeRelative(path.join(workspaceRoot, javadocExtractionRelative)),
      javadocHiaDocument: normalizeRelative(path.join(workspaceRoot, javadocHiaRelative)),
      docSourceMap: normalizeRelative(path.join(workspaceRoot, docSourceMapRelative))
    },
    manifestBuild: manifest.build
  };

  await writeJson(evidencePath, evidence);
  console.log(`W-P31 JavaDoc unified output evidence prepared at ${normalizeRelative(evidencePath)}`);
}

async function materializeWorkspace() {
  await mkdir(path.join(workspaceRoot, "src", "java", "com", "example", "docs"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "src", "toy"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "docs"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "producers"), { recursive: true });

  await writeFile(path.join(workspaceRoot, "src", "java", "com", "example", "docs", "Profile.java"), [
    "package com.example.docs;",
    "",
    "/**",
    " * Stores W-P31 JavaDoc profile data.",
    " * @since 0.1.0",
    " */",
    "public class Profile {",
    "  /** Public display name. */",
    "  public final String name;",
    "",
    "  /**",
    "   * Creates a profile.",
    "   * @param name public display name",
    "   */",
    "  public Profile(String name) {",
    "    this.name = name;",
    "  }",
    "",
    "  /**",
    "   * Returns the public display name.",
    "   * @return public display name",
    "   */",
    "  public String name() {",
    "    return name;",
    "  }",
    "}"
  ].join("\n"), "utf8");

  await writeFile(path.join(workspaceRoot, "src", "java", "com", "example", "docs", "ProfileService.java"), [
    "package com.example.docs;",
    "",
    "/** Renders W-P31 JavaDoc evidence data. */",
    "public class ProfileService {",
    "  /** Creates a profile service. */",
    "  public ProfileService() {",
    "  }",
    "",
    "  /**",
    "   * Returns a formatted display name.",
    "   * @param profile source profile",
    "   * @return formatted display name",
    "   */",
    "  public String displayName(Profile profile) {",
    "    return \"Profile: \" + profile.name();",
    "  }",
    "}"
  ].join("\n"), "utf8");

  await writeFile(path.join(workspaceRoot, "src", "toy", "sample.toy"), [
    "# @doc",
    "# Greets a profile from a private DSL.",
    "fn greet(name)"
  ].join("\n"), "utf8");

  await writeJson(javadocConfigPath, {
    workspaceRoot,
    outputDirectory: path.join(workspaceRoot, javadocOutputRelative),
    sourceVersion: "11",
    defaultLocale: "en",
    inputs: [
      {
        kind: "java-source-root",
        sourceRoot: "src/java",
        packages: ["com.example.docs"],
        artifactBasePath: "wp31-javadoc",
        title: "W-P31 Real JavaDoc Evidence",
        hiaDocumentId: "wp31-real-javadoc"
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
      id: "project:wp31-javadoc-unified",
      name: "W-P31 JavaDoc Unified Evidence",
      title: "W-P31 JavaDoc Unified Evidence",
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
        path: javadocHiaRelative
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
  const javaSymbols = (document.symbols ?? []).filter((symbol) => symbol.source?.definedIn?.relativePath);
  const sources = [...new Map(javaSymbols.map((symbol) => {
    const definedIn = symbol.source.definedIn;
    return [definedIn.relativePath, createSource(sourceId("java", definedIn.relativePath), definedIn.relativePath, "java")];
  })).values()];

  sources.push(createSource("source:generic:toy-sample", "src/toy/sample.toy", "toy"));

  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:wp31-javadoc-unified",
    artifacts: [
      createArtifact("artifact:javadoc-hia", javadocHiaRelative, "hia-document"),
      createArtifact("artifact:generic-hia", ".hia-producers/generic-docline/generic-docline.hia.json", "hia-document")
    ],
    sources,
    sourceMaps: [],
    chains: [],
    entries: [
      ...javaSymbols.map((symbol) => createJavaDocMapEntry(symbol)),
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

function createJavaDocMapEntry(symbol) {
  const definedIn = symbol.source.definedIn;
  const range = definedIn.range ?? {
    start: definedIn.position,
    end: definedIn.position
  };

  return {
    id: `entry:javadoc:${slug(symbol.id)}`,
    kind: "symbol",
    symbolId: symbol.id,
    symbolKind: symbol.kind,
    sourceRefs: [
      {
        sourceId: sourceId("java", definedIn.relativePath),
        range,
        rangeSource: "javadoc-runner",
        confidence: "high"
      }
    ],
    artifactRefs: [
      {
        artifactId: "artifact:javadoc-hia",
        selector: `symbol:${symbol.id}`,
        rangeSource: "javadoc-runner",
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

function runJavadocRunner() {
  const runnerPath = path.join(javadocSatelliteRoot, "packages", "javadoc-runner", "src", "cli.mjs");
  const result = spawnSync(process.execPath, [runnerPath, "--config", javadocConfigPath], {
    cwd: javadocSatelliteRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, `JavaDoc runner failed: ${result.stderr || result.stdout}`);
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
