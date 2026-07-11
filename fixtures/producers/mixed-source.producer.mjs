import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RESULT_CONTRACT = "documentation-producer-result";
const RESULT_CONTRACT_VERSION = "0.1.0-draft";

export const mixedSourceProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
  id: "mixed-source-fixture",
  version: "0.0.0",
  displayName: "Mixed Source Fixture Producer",
  inputKinds: ["html", "css"],
  outputKinds: ["htmdoc-extraction", "cssdoc-extraction", "doc-source-map"],
  capabilities: {
    sourceLinkage: true,
    incremental: false,
    watch: false
  }
});

export const mixedSourceProducer = Object.freeze({
  descriptor: mixedSourceProducerDescriptor,

  /**
   * 读取真实 HTML/CSS 源并写出 producer contract artifacts。
   * Reads real HTML/CSS source and writes producer contract artifacts.
   */
  async produce(request) {
    await mkdir(request.outputDirectory, { recursive: true });

    const artifacts = [];
    const docMapArtifacts = [];
    const docMapSources = [];
    const docMapEntries = [];

    for (const [index, input] of request.inputs.entries()) {
      const source = await readFile(path.resolve(request.workspaceRoot, input.path), "utf8");
      const baseName = path.posix.basename(input.path).replace(/\.[^.]+$/u, "");

      if (input.kind === "html") {
        const artifactPath = `${baseName}.htmdoc.json`;
        const artifact = createHtmlArtifact(input.path, source);
        await writeJson(path.join(request.outputDirectory, artifactPath), artifact);
        artifacts.push(createArtifact(`input-${index + 1}-htmdoc`, "htmdoc-extraction", artifactPath, "hia-htmdoc-extraction"));
        docMapArtifacts.push(createDocMapArtifact("artifact:html:alert", artifactPath, "hia-htmdoc-extraction"));
        docMapSources.push(createDocMapSource("source:html:alert", input.path, "html"));
        docMapEntries.push(createDocMapEntry({
          id: "entry:component-alert",
          artifactId: "artifact:html:alert",
          sourceId: "source:html:alert",
          symbolId: "component:Alert",
          symbolKind: "html-component"
        }));
        continue;
      }

      if (input.kind === "css") {
        const artifactPath = `${baseName}.cssdoc.json`;
        const artifact = createCssArtifact(input.path, source);
        await writeJson(path.join(request.outputDirectory, artifactPath), artifact);
        artifacts.push(createArtifact(`input-${index + 1}-cssdoc`, "cssdoc-extraction", artifactPath, "hia-cssdoc-extraction"));
        docMapArtifacts.push(createDocMapArtifact("artifact:css:alert", artifactPath, "hia-cssdoc-extraction"));
        docMapSources.push(createDocMapSource("source:css:alert", input.path, "css"));
        docMapEntries.push(createDocMapEntry({
          id: "entry:css-alert-style",
          artifactId: "artifact:css:alert",
          sourceId: "source:css:alert",
          symbolId: "css-component-style:Alert",
          symbolKind: "css-component-style"
        }));
      }
    }

    const docSourceMapPath = "alert.docmap.json";
    await writeJson(path.join(request.outputDirectory, docSourceMapPath), createDocSourceMap({
      artifacts: docMapArtifacts,
      entries: docMapEntries,
      sources: docMapSources
    }));
    artifacts.push(createArtifact("doc-source-map", "doc-source-map", docSourceMapPath, "doc-source-map"));

    return {
      contract: RESULT_CONTRACT,
      contractVersion: RESULT_CONTRACT_VERSION,
      producer: {
        id: mixedSourceProducerDescriptor.id,
        version: mixedSourceProducerDescriptor.version
      },
      status: "success",
      artifacts,
      diagnostics: []
    };
  }
});

export default mixedSourceProducer;

function createHtmlArtifact(sourcePath, source) {
  return {
    contract: "hia-htmdoc-extraction",
    contractVersion: "0.1.0-draft",
    id: "fixture:htmdoc:alert",
    source: {
      path: sourcePath,
      language: "html"
    },
    symbols: [
      {
        id: "component:Alert",
        name: "Alert",
        kind: "html-component",
        summary: "Source-produced alert component.",
        source: createSymbolSource(sourcePath, "html", source)
      }
    ],
    diagnostics: []
  };
}

function createCssArtifact(sourcePath, source) {
  return {
    contract: "hia-cssdoc-extraction",
    contractVersion: "0.1.0-draft",
    id: "fixture:cssdoc:alert",
    source: {
      path: sourcePath,
      language: "css"
    },
    symbols: [
      {
        id: "css-component-style:Alert",
        name: "Alert",
        kind: "css-component-style",
        summary: "Source-produced alert styles.",
        source: createSymbolSource(sourcePath, "css", source)
      }
    ],
    diagnostics: []
  };
}

function createSymbolSource(sourcePath, language, source) {
  return {
    path: sourcePath,
    language,
    range: {
      start: { line: 1, column: 1 },
      end: { line: source.split(/\r?\n/u).length, column: 1 }
    },
    rangeSource: "fixture-producer",
    confidence: "medium"
  };
}

function createArtifact(id, kind, artifactPath, contract) {
  return {
    id,
    kind,
    path: artifactPath,
    contract,
    contractVersion: "0.1.0-draft",
    language: "json",
    mediaType: "application/json",
    profileIds: kind === "htmdoc-extraction"
      ? ["htmdoc"]
      : kind === "cssdoc-extraction"
        ? ["cssdoc"]
        : ["doc-source-map"]
  };
}

function createDocSourceMap({ artifacts, entries, sources }) {
  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: "docmap:mixed-source-fixture:alert",
    artifacts,
    sources,
    sourceMaps: [],
    chains: [],
    entries,
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

function createDocMapArtifact(id, artifactPath, contract) {
  return {
    id,
    kind: "extraction-artifact",
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

function createDocMapSource(id, sourcePath, language) {
  return {
    id,
    kind: `${language}-source`,
    path: sourcePath,
    language,
    role: "original",
    sourcesContentPolicy: "none"
  };
}

function createDocMapEntry({ id, artifactId, sourceId, symbolId, symbolKind }) {
  return {
    id,
    kind: "symbol",
    symbolId,
    symbolKind,
    sourceRefs: [
      {
        sourceId,
        range: {
          start: { line: 1, column: 1 },
          end: { line: 5, column: 1 }
        },
        rangeSource: "fixture-producer",
        confidence: "medium"
      }
    ],
    artifactRefs: [
      {
        artifactId,
        rangeSource: "fixture-producer",
        confidence: "medium"
      }
    ],
    diagnostics: []
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
