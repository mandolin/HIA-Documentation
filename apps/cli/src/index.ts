#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createBrowserPanelPayload,
  renderBrowserPanel,
  type BrowserPanelDocSourceMapInput,
  type BrowserPanelOrdinarySourceMapInput,
  type BrowserPanelProjectInfo,
  type BrowserPanelRelationGraphInput
} from "@hia-doc/browser-panel";
import {
  hasConfigErrors,
  loadHiaProjectConfig,
  validateHiaProjectManifest,
  type HiaDocsConfig,
  type HiaProjectDocsManifest as ProjectDocsManifest,
  type HiaProjectManifestInput as ProjectManifestInput,
  type HiaProjectManifestProducerInput as ProjectManifestProducerInput
} from "@hia-doc/config";
import {
  createBasicFixtureDocument,
  createHiaDiagnostic,
  validateHiaDocumentDetailed,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaDocument,
  type HiaSymbol
} from "@hia-doc/core";
import { convertJSDocIntegrationToHiaDocumentDetailed } from "@hia-doc/parser-jsdoc";
import {
  runDocumentationProducer,
  validateDocumentationProducerResult,
  type DocumentationProducer,
  type DocumentationProducerArtifact,
  type DocumentationProducerInput,
  type DocumentationProducerResult
} from "@hia-doc/plugin-sdk";
import {
  createHiaProfileSet,
  hasProfileErrors,
  loadHiaProfileFromFile,
  type HiaDocumentationProfile
} from "@hia-doc/profile";
import {
  renderHtmlDocument,
  renderProjectHtmlDocument,
  type RenderHtmlOptions,
  type RenderProjectDocSourceMapRef,
  type RenderProjectEntry,
  type RenderProjectHtmlInput,
  type RenderProjectProfileRef,
  type RenderProjectSourcePresentation,
  type RenderProjectView
} from "@hia-doc/renderer-html";
import {
  createDocSourceMapIndex,
  createOrdinarySourceMapIndex,
  type DocSourceMapIndex,
  type DocSourceMapIndexedEntry,
  type DocSourceMapSourceMapLink
} from "@hia-doc/source-linkage";

const OUTPUT_MANIFEST_PATH = "hia-manifest.json";

const HELP_TEXT = `HIA Documentation CLI

Usage:
  hia --help
  hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--project-manifest <file>] [--out <dir>] [--locale <locale>]
  hia docs evidence [--docs-dir <dir>] [--out <file>]
  hia browser panel [--config <file>] [--project-manifest <file>] [--project-index <file>] [--out <dir>]

Commands:
  docs build      Generate HTML documentation from a HIA document fixture.
  docs evidence   Summarize generated project documentation outputs without reading source bodies.
  browser panel   Generate a static source-linked browser panel.

Options:
  --config <file>     HIA config JSON file. Defaults to hia.config.json when present.
  --input <file>      HIA document JSON file. Defaults to the built-in basic fixture.
  --jsdoc-integration <file>
                      JSDoc HIA Integration JSON file to convert before rendering.
  --project-manifest <file>
                      Project docs manifest that aggregates JSDoc, CSSDoc, HTMDoc and doc-source-map artifacts.
  --project-index <file>
                      Generated project-index.json used to attach relation graph payload data to the browser panel.
  --out <dir>         Output directory. Defaults to dist/docs.
  --docs-dir <dir>    Existing generated docs directory for docs evidence. Defaults to dist/docs.
  --locale <locale>   Initial rendered locale. Defaults to the document defaultLocale.
  --manifest <file>   Output manifest path inside --out. Defaults to hia-manifest.json.
`;

export interface CliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface ProjectAggregationResult {
  projectInput?: RenderProjectHtmlInput;
  inputRefs: Array<{
    kind: string;
    path: string;
    profile?: RenderProjectProfileRef;
    producerId?: string;
    source?: RuntimeProjectInputSource;
    artifactPolicy?: ProjectManifestInput["artifactPolicy"];
  }>;
  producerResults?: ProducerRunSummary["results"];
}

interface IndexedProjectDocSourceMap {
  index: DocSourceMapIndex;
  input: RuntimeProjectInput;
}

interface DotNetSourceRelationArtifact {
  relations?: unknown[];
}

type RuntimeProjectInputSource = "manifest" | "producer" | "producer-result";

interface RuntimeProjectInput {
  baseDir: string;
  input: ProjectManifestInput;
  producerId?: string;
  source: RuntimeProjectInputSource;
}

interface ProducerRunSummary {
  diagnostics: HiaDiagnostic[];
  inputRefs: ProjectAggregationResult["inputRefs"];
  runtimeInputs: RuntimeProjectInput[];
  results: Array<{
    id: string;
    status: DocumentationProducerResult["status"];
    artifactCount: number;
  }>;
}

export async function runCli(argv: string[] = process.argv.slice(2), io: CliIo = createDefaultIo()): Promise<number> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  if (normalizedArgv.length === 0 || normalizedArgv.includes("--help") || normalizedArgv.includes("-h")) {
    io.stdout(HELP_TEXT);
    return 0;
  }

  if (normalizedArgv[0] === "docs" && normalizedArgv[1] === "build") {
    return runDocsBuild(normalizedArgv.slice(2), io);
  }

  if (normalizedArgv[0] === "docs" && normalizedArgv[1] === "evidence") {
    return runDocsEvidence(normalizedArgv.slice(2), io);
  }

  if (normalizedArgv[0] === "browser" && normalizedArgv[1] === "panel") {
    return runBrowserPanel(normalizedArgv.slice(2), io);
  }

  io.stderr(`Unknown command: ${normalizedArgv.join(" ")}`);
  io.stderr("Run `hia --help` for available commands.");
  return 1;
}

async function runDocsBuild(argv: string[], io: CliIo): Promise<number> {
  const optionDiagnostics = validateOptionValues(argv, ["--config", "--input", "--jsdoc-integration", "--project-manifest", "--out", "--locale", "--manifest"]);
  reportDiagnostics(optionDiagnostics, io);

  if (optionDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
  }

  const configPath = readOption(argv, "--config");
  const configResult = await loadHiaProjectConfig(configPath
    ? { cwd: io.cwd, configPath }
    : { cwd: io.cwd });
  reportDiagnostics(configResult.diagnostics, io);

  if (hasConfigErrors(configResult.diagnostics)) {
    return 1;
  }

  const docsConfig = configResult.config.docs ?? {};
  const outputDir = resolveConfiguredPath(
    readOption(argv, "--out"),
    docsConfig.output,
    "dist/docs",
    io.cwd,
    configResult.baseDir
  );
  const inputPath = resolveOptionalConfiguredPath(
    readOption(argv, "--input"),
    docsConfig.input,
    io.cwd,
    configResult.baseDir
  );
  const projectManifestPath = resolveOptionalConfiguredPath(
    readOption(argv, "--project-manifest"),
    docsConfig.projectManifest,
    io.cwd,
    configResult.baseDir
  );
  const jsdocIntegrationPath = resolveOptionalConfiguredPath(
    readOption(argv, "--jsdoc-integration"),
    undefined,
    io.cwd,
    configResult.baseDir
  );
  const locale = readOption(argv, "--locale") ?? docsConfig.locale;
  const manifestPath = normalizeOutputRelativePath(readOption(argv, "--manifest") ?? docsConfig.manifest ?? OUTPUT_MANIFEST_PATH);
  const buildOptionDiagnostics = validateBuildOptions(manifestPath, inputPath, jsdocIntegrationPath, projectManifestPath);
  reportDiagnostics(buildOptionDiagnostics, io);

  if (buildOptionDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
  }

  if (projectManifestPath) {
    return runProjectDocsBuild(projectManifestPath, outputDir, manifestPath, docsConfig, configResult.baseDir, locale, io);
  }

  const documentResult = await loadDocument(inputPath ?? "", jsdocIntegrationPath ?? "", io);

  if (!documentResult.document) {
    return 1;
  }

  const validation = validateHiaDocumentDetailed(documentResult.document);
  reportDiagnostics(validation.diagnostics, io);

  if (!validation.valid) {
    return 1;
  }

  const documentDiagnostics = collectBuildDiagnostics(documentResult.document, locale, docsConfig);
  reportDiagnostics(documentDiagnostics, io);

  const rendered = renderHtmlDocument(documentResult.document, createRenderOptions(locale, docsConfig));
  reportDiagnostics(rendered.diagnostics, io);

  if (rendered.diagnostics.some((item) => item.severity === "error")) {
    return 1;
  }

  for (const file of rendered.files) {
    const targetPath = path.join(outputDir, file.path);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.contents, "utf8");
  }

  const manifestFile = createOutputManifest(rendered, manifestPath);
  const manifestTargetPath = path.join(outputDir, manifestPath);
  await mkdir(path.dirname(manifestTargetPath), { recursive: true });
  await writeFile(manifestTargetPath, JSON.stringify(manifestFile, null, 2), "utf8");

  io.stdout(`Generated ${rendered.files.length + 1} file(s) at ${outputDir}`);
  return 0;
}

/**
 * 为已生成的统一文档目录生成 public-safe evidence summary。
 * Creates a public-safe evidence summary for an already generated unified documentation directory.
 *
 * @param argv - CLI 参数。CLI arguments.
 * @param io - 命令行输入输出适配。CLI IO adapter.
 * @returns CLI 退出码。CLI exit code.
 */
async function runDocsEvidence(argv: string[], io: CliIo): Promise<number> {
  const optionDiagnostics = validateOptionValues(argv, ["--docs-dir", "--out"]);
  reportDiagnostics(optionDiagnostics, io);

  if (optionDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
  }

  const docsDir = path.resolve(io.cwd, readOption(argv, "--docs-dir") ?? "dist/docs");
  const outputPath = path.resolve(io.cwd, readOption(argv, "--out") ?? path.join(docsDir, "documentation-evidence.json"));
  const summaryResult = await createGeneratedDocsEvidenceSummary(docsDir);
  reportDiagnostics(summaryResult.diagnostics, io);

  if (summaryResult.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(summaryResult.summary, null, 2), "utf8");
  io.stdout(`Generated documentation evidence summary at ${outputPath}`);
  return 0;
}

async function runBrowserPanel(argv: string[], io: CliIo): Promise<number> {
  const optionDiagnostics = validateOptionValues(argv, ["--config", "--project-manifest", "--project-index", "--out"]);
  reportDiagnostics(optionDiagnostics, io);

  if (optionDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
  }

  const configPath = readOption(argv, "--config");
  const configResult = await loadHiaProjectConfig(configPath
    ? { cwd: io.cwd, configPath }
    : { cwd: io.cwd });
  reportDiagnostics(configResult.diagnostics, io);

  if (hasConfigErrors(configResult.diagnostics)) {
    return 1;
  }

  const docsConfig = configResult.config.docs ?? {};
  const outputDir = resolveConfiguredPath(
    readOption(argv, "--out"),
    undefined,
    "dist/browser-panel",
    io.cwd,
    configResult.baseDir
  );
  const projectManifestPath = resolveOptionalConfiguredPath(
    readOption(argv, "--project-manifest"),
    docsConfig.projectManifest,
    io.cwd,
    configResult.baseDir
  );
  const projectIndexPath = resolveOptionalConfiguredPath(
    readOption(argv, "--project-index"),
    undefined,
    io.cwd,
    configResult.baseDir
  );

  if (!projectManifestPath) {
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_BROWSER_PROJECT_MANIFEST_REQUIRED",
        "browser panel requires --project-manifest or docs.projectManifest.",
        "error",
        "browser.projectManifest"
      )
    ], io);
    return 1;
  }

  const manifestResult = await loadProjectManifest(projectManifestPath, io);

  if (!manifestResult.manifest) {
    return 1;
  }

  const panelDocSourceMaps = await loadBrowserPanelDocSourceMaps(manifestResult.manifest, projectManifestPath, io);
  const relationGraphResult = projectIndexPath
    ? await loadBrowserPanelProjectRelationGraph(projectIndexPath, io)
    : {};

  if (panelDocSourceMaps.length === 0) {
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_BROWSER_DOC_SOURCE_MAP_MISSING",
        "browser panel requires at least one doc-source-map project input.",
        "error",
        projectManifestPath
      )
    ], io);
    return 1;
  }

  if (relationGraphResult.failed) {
    return 1;
  }

  const payload = createBrowserPanelPayload({
    project: createBrowserPanelProjectInfo(manifestResult.manifest),
    docSourceMaps: panelDocSourceMaps,
    ...(relationGraphResult.relationGraph ? { relationGraph: relationGraphResult.relationGraph } : {})
  });
  const rendered = renderBrowserPanel(payload);

  for (const file of rendered.files) {
    const targetPath = path.join(outputDir, file.path);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.contents, "utf8");
  }

  io.stdout(`Generated ${rendered.files.length} browser panel file(s) at ${outputDir}`);
  return 0;
}

async function runProjectDocsBuild(
  projectManifestPath: string,
  outputDir: string,
  manifestPath: string,
  docsConfig: HiaDocsConfig,
  configBaseDir: string,
  locale: string | undefined,
  io: CliIo
): Promise<number> {
  const manifestResult = await loadProjectManifest(projectManifestPath, io);

  if (!manifestResult.manifest) {
    return 1;
  }

  const baseDir = path.dirname(projectManifestPath);
  const profileResult = await loadProjectProfiles(manifestResult.manifest, baseDir);
  reportDiagnostics(profileResult.diagnostics, io);

  if (hasProfileErrors(profileResult.diagnostics)) {
    return 1;
  }

  const aggregation = await aggregateProjectDocs(manifestResult.manifest, projectManifestPath, outputDir, profileResult.profiles, io);

  if (!aggregation.projectInput) {
    return 1;
  }

  const preparedProjectInput = await prepareProjectSourcePresentation(
    aggregation.projectInput,
    docsConfig,
    configBaseDir
  );
  const rendered = renderProjectHtmlDocument(preparedProjectInput, createRenderOptions(locale, docsConfig));
  reportDiagnostics(rendered.diagnostics, io);

  if (rendered.diagnostics.some((item) => item.severity === "error")) {
    return 1;
  }

  for (const file of rendered.files) {
    const targetPath = path.join(outputDir, file.path);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.contents, "utf8");
  }

  const manifestFile = createProjectOutputManifest(rendered, manifestPath, aggregation);
  const manifestTargetPath = path.join(outputDir, manifestPath);
  await mkdir(path.dirname(manifestTargetPath), { recursive: true });
  await writeFile(manifestTargetPath, JSON.stringify(manifestFile, null, 2), "utf8");

  io.stdout(`Generated ${rendered.files.length + 1} file(s) at ${outputDir}`);
  return 0;
}

function createOutputManifest(rendered: ReturnType<typeof renderHtmlDocument>, manifestPath: string) {
  return {
    ...rendered.manifest,
    files: [
      ...rendered.manifest.files,
      {
        path: manifestPath,
        role: "manifest",
        contentType: "application/json; charset=utf-8"
      }
    ]
  };
}

function createProjectOutputManifest(
  rendered: ReturnType<typeof renderProjectHtmlDocument>,
  manifestPath: string,
  aggregation: ProjectAggregationResult
) {
  return {
    ...rendered.manifest,
    build: {
      mode: "project",
      inputs: aggregation.inputRefs,
      ...(aggregation.producerResults && aggregation.producerResults.length > 0 ? { producers: aggregation.producerResults } : {}),
      profiles: rendered.manifest.project?.profiles ?? [],
      docSourceMaps: rendered.manifest.project?.docSourceMaps ?? []
    },
    docSourceMaps: rendered.manifest.project?.docSourceMaps ?? [],
    files: [
      ...rendered.manifest.files,
      {
        path: manifestPath,
        role: "manifest",
        contentType: "application/json; charset=utf-8"
      }
    ]
  };
}

interface GeneratedDocsEvidenceSummary {
  contract: "hia-generated-docs-evidence-summary";
  contractVersion: "0.1.0-draft";
  status: "ready" | "incomplete";
  requiredOutputs: {
    indexHtml: boolean;
    manifest: boolean;
    projectIndex: boolean;
  };
  project: {
    name?: string;
    version?: string;
  };
  entries: {
    total: number;
    byView: Record<string, number>;
    byKind: Record<string, number>;
    byProfile: Record<string, number>;
  };
  producers: Array<{
    id: string;
    status: string;
    artifactCount: number;
  }>;
  inputs: Array<{
    kind: string;
    source?: string;
    producerId?: string;
    artifactPolicy?: ProjectManifestInput["artifactPolicy"];
  }>;
  coverage: {
    dotnetEntries: number;
    jsEntries: number;
    htmlEntries: number;
    cssEntries: number;
    markupEntries: number;
    powershellEntries: number;
    surfaceEntries: number;
  };
  privacy: {
    sourcePresentation: "none" | "link" | "embed" | "fetch";
    sourcesContentPolicy: "none" | "explicit-embed";
    sourcesContentPresent: boolean;
    sourceBodyPresent: boolean;
    absolutePathLikeStringCount: number;
  };
  warnings: {
    classificationArtifactPresent: boolean;
    buildWarningGateReady: boolean;
  };
}

async function createGeneratedDocsEvidenceSummary(docsDir: string): Promise<{
  diagnostics: HiaDiagnostic[];
  summary: GeneratedDocsEvidenceSummary;
}> {
  const diagnostics: HiaDiagnostic[] = [];
  const projectIndexPath = path.join(docsDir, "project-index.json");
  const manifestPath = path.join(docsDir, OUTPUT_MANIFEST_PATH);
  const indexHtmlPath = path.join(docsDir, "index.html");
  const projectIndex = await readOptionalJson(projectIndexPath, "HIA_CLI_DOCS_EVIDENCE_PROJECT_INDEX_READ_FAILED", diagnostics);
  const manifest = await readOptionalJson(manifestPath, "HIA_CLI_DOCS_EVIDENCE_MANIFEST_READ_FAILED", diagnostics);
  const indexHtmlText = await readOptionalText(indexHtmlPath);
  const entries = isRecord(projectIndex) && Array.isArray(projectIndex.entries) ? projectIndex.entries.filter(isRecord) : [];
  const project = isRecord(projectIndex) && isRecord(projectIndex.project) ? projectIndex.project : {};
  const manifestBuild = isRecord(manifest) && isRecord(manifest.build) ? manifest.build : {};
  const manifestFiles = isRecord(manifest) && Array.isArray(manifest.files) ? manifest.files.filter(isRecord) : [];
  const projectSite = isRecord(projectIndex) && isRecord(projectIndex.site) ? projectIndex.site : {};
  const sourcePresentation = normalizeEvidenceSourcePresentation(projectSite.sourcePresentation);
  const htmlOutputPaths = (sourcePresentation === "embed" ? manifestFiles : [])
    .filter((file) => stringValue(file.contentType)?.startsWith("text/html"))
    .map((file) => stringValue(file.path))
    .filter((filePath): filePath is string => Boolean(filePath))
    .concat("index.html")
    .filter((filePath, index, paths) => paths.indexOf(filePath) === index);
  const htmlOutputs = await Promise.all(htmlOutputPaths.map(async (filePath) => ({
    path: filePath,
    contents: filePath === "index.html" ? indexHtmlText : await readOptionalText(path.join(docsDir, filePath))
  })));
  const projectSummary: GeneratedDocsEvidenceSummary["project"] = {};
  const projectName = stringValue(project.name);
  const projectVersion = stringValue(project.version);
  const requiredOutputs = {
    indexHtml: Boolean(indexHtmlText) || manifestFiles.some((file) => stringValue(file.path) === "index.html"),
    manifest: Boolean(manifest),
    projectIndex: Boolean(projectIndex)
  };
  const serializedPublicOutputs = JSON.stringify({
    projectIndex,
    manifest,
    htmlOutputs
  });
  const sourcesContentPresent = hasNestedKey(projectIndex, "sourcesContent") || hasNestedKey(manifest, "sourcesContent");
  const sourceBodyPresent = hasNestedKey(projectIndex, "sourceBody")
    || hasNestedKey(projectIndex, "sourceBodies")
    || hasNestedKey(manifest, "sourceBody")
    || hasNestedKey(manifest, "sourceBodies")
    || htmlOutputs.some((output) => hasProjectHtmlEmbeddedSourceBody(output.contents));

  if (!requiredOutputs.projectIndex) {
    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_DOCS_EVIDENCE_PROJECT_INDEX_MISSING",
      "docs evidence requires project-index.json in the generated docs directory.",
      "error",
      "project-index.json"
    ));
  }

  if (!requiredOutputs.manifest) {
    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_DOCS_EVIDENCE_MANIFEST_MISSING",
      "docs evidence requires hia-manifest.json in the generated docs directory.",
      "error",
      OUTPUT_MANIFEST_PATH
    ));
  }

  if (projectName) {
    projectSummary.name = projectName;
  }

  if (projectVersion) {
    projectSummary.version = projectVersion;
  }

  return {
    diagnostics,
    summary: {
      contract: "hia-generated-docs-evidence-summary",
      contractVersion: "0.1.0-draft",
      status: Object.values(requiredOutputs).every(Boolean) ? "ready" : "incomplete",
      requiredOutputs,
      project: projectSummary,
      entries: {
        total: entries.length,
        byView: countBy(entries, (entry) => stringValue(entry.view) ?? "all"),
        byKind: countBy(entries, (entry) => stringValue(entry.kind) ?? "unknown"),
        byProfile: countBy(entries, (entry) => profileIdFromProjectEntry(entry) ?? "unprofiled")
      },
      producers: normalizeEvidenceProducers(manifestBuild),
      inputs: normalizeEvidenceInputs(manifestBuild),
      coverage: {
        dotnetEntries: entries.filter((entry) => stringValue(entry.view) === "dotnet").length,
        jsEntries: entries.filter((entry) => stringValue(entry.view) === "js").length,
        htmlEntries: entries.filter((entry) => stringValue(entry.view) === "html").length,
        cssEntries: entries.filter((entry) => stringValue(entry.view) === "css").length,
        markupEntries: entries.filter((entry) => (stringValue(entry.kind) ?? "").includes("markup")).length,
        powershellEntries: entries.filter((entry) => stringValue(entry.view) === "powershell").length,
        surfaceEntries: entries.filter((entry) => {
          const kind = stringValue(entry.kind) ?? "";
          return kind.includes("surface") || kind.includes("endpoint");
        }).length
      },
      privacy: {
        sourcePresentation,
        sourcesContentPolicy: sourcePresentation === "embed" ? "explicit-embed" : "none",
        sourcesContentPresent,
        sourceBodyPresent,
        absolutePathLikeStringCount: countAbsolutePathLikeStrings(serializedPublicOutputs)
      },
      warnings: {
        classificationArtifactPresent: serializedPublicOutputs.includes("dotnetdoc-build-warning-classification"),
        buildWarningGateReady: true
      }
    }
  };
}

function normalizeEvidenceSourcePresentation(
  value: unknown
): GeneratedDocsEvidenceSummary["privacy"]["sourcePresentation"] {
  return value === "none" || value === "embed" || value === "fetch" ? value : "link";
}

async function prepareProjectSourcePresentation(
  projectInput: RenderProjectHtmlInput,
  docsConfig: HiaDocsConfig,
  configBaseDir: string
): Promise<RenderProjectHtmlInput> {
  const presentation = resolveProjectSourcePresentation(docsConfig);
  const linkBaseUrl = docsConfig.source?.linkBaseUrl ?? docsConfig.source?.baseUrl;
  const fetchBaseUrl = docsConfig.source?.fetchBaseUrl;
  const localRoot = path.resolve(configBaseDir, docsConfig.source?.localRoot ?? ".");
  const defaultExpanded = docsConfig.source?.defaultExpanded ?? false;
  const maxLines = docsConfig.source?.maxLines ?? 400;
  const sourceFileCache = new Map<string, string>();

  return {
    ...projectInput,
    entries: await Promise.all(projectInput.entries.map(async (entry) => {
      if (!entry.source) {
        return entry;
      }

      const { preview: existingPreview, fetchUrl: _existingFetchUrl, linkUrl: existingLinkUrl, ...locator } = entry.source;
      const linkUrl = linkBaseUrl
        ? createProjectSourceUrl(linkBaseUrl, locator.path, locator.range, true)
        : existingLinkUrl;
      const source: NonNullable<RenderProjectEntry["source"]> = {
        ...locator,
        ...(linkUrl && presentation !== "none" ? { linkUrl } : {})
      };

      if (presentation === "fetch" && fetchBaseUrl) {
        source.fetchUrl = createProjectSourceUrl(fetchBaseUrl, locator.path, undefined, false);
        if (!source.range) {
          source.range = {
            start: { line: 1 },
            end: { line: maxLines }
          };
        }
      }

      if (presentation === "embed") {
        const preview = existingPreview ?? await readProjectSourcePreview(
          localRoot,
          locator.path,
          locator.range,
          maxLines,
          sourceFileCache
        );
        if (preview) {
          source.preview = {
            ...preview,
            defaultExpanded
          };
        }
      }

      return {
        ...entry,
        source
      };
    }))
  };
}

function resolveProjectSourcePresentation(
  docsConfig: HiaDocsConfig
): RenderProjectSourcePresentation {
  if (docsConfig.source?.enabled === false || docsConfig.source?.mode === "none") {
    return "none";
  }
  return docsConfig.source?.presentation ?? "link";
}

async function readProjectSourcePreview(
  localRoot: string,
  relativePath: string,
  range: NonNullable<RenderProjectEntry["source"]>["range"],
  maxLines: number,
  cache: Map<string, string>
): Promise<NonNullable<NonNullable<RenderProjectEntry["source"]>["preview"]> | undefined> {
  const normalizedPath = toPosix(relativePath);
  if (!normalizedPath || normalizedPath.startsWith("/") || /^[a-zA-Z]:\//u.test(normalizedPath) || normalizedPath.split("/").includes("..")) {
    return undefined;
  }
  const absolutePath = path.resolve(localRoot, normalizedPath);
  if (!isPathInside(localRoot, absolutePath)) {
    return undefined;
  }

  let sourceText = cache.get(absolutePath);
  if (sourceText === undefined) {
    try {
      sourceText = await readFile(absolutePath, "utf8");
      cache.set(absolutePath, sourceText);
    } catch {
      return undefined;
    }
  }

  const lines = sourceText.split(/\r?\n/u);
  const startLine = Math.max(1, range?.start.line ?? 1);
  const requestedEndLine = range?.end?.line ?? (startLine + maxLines - 1);
  const endLine = Math.min(lines.length, requestedEndLine, startLine + maxLines - 1);
  return {
    content: lines.slice(startLine - 1, endLine).join("\n"),
    range: {
      start: { line: startLine },
      end: { line: endLine }
    }
  };
}

function createProjectSourceUrl(
  baseUrl: string,
  relativePath: string,
  range: NonNullable<RenderProjectEntry["source"]>["range"] | undefined,
  includeLineFragment: boolean
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const encodedPath = toPosix(relativePath).split("/").map(encodeURIComponent).join("/");
  const lineFragment = includeLineFragment && range
    ? `#L${range.start.line}${range.end?.line ? `-L${range.end.line}` : ""}`
    : "";
  return `${normalizedBase}${encodedPath}${lineFragment}`;
}

function hasProjectHtmlEmbeddedSourceBody(value: string | undefined): boolean {
  return typeof value === "string" && /<pre class="hia-source-code"[^>]*><code>[\s\S]+?<\/code><\/pre>/u.test(value);
}

async function readOptionalJson(inputPath: string, code: string, diagnostics: HiaDiagnostic[]): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return undefined;
    }

    diagnostics.push(createCliDiagnostic(
      code,
      `${inputPath} - ${errorMessage(error)}`,
      "error",
      inputPath
    ));
    return undefined;
  }
}

async function readOptionalText(inputPath: string): Promise<string | undefined> {
  try {
    return await readFile(inputPath, "utf8");
  } catch (error) {
    return isFileNotFoundError(error) ? undefined : "";
  }
}

function normalizeEvidenceProducers(build: Record<string, unknown>): GeneratedDocsEvidenceSummary["producers"] {
  if (!Array.isArray(build.producers)) {
    return [];
  }

  return build.producers.filter(isRecord).map((producer) => ({
    id: stringValue(producer.id) ?? "unknown-producer",
    status: stringValue(producer.status) ?? "unknown",
    artifactCount: numberValue(producer.artifactCount) ?? 0
  }));
}

function normalizeEvidenceInputs(build: Record<string, unknown>): GeneratedDocsEvidenceSummary["inputs"] {
  if (!Array.isArray(build.inputs)) {
    return [];
  }

  return build.inputs.filter(isRecord).map((input) => {
    const item: GeneratedDocsEvidenceSummary["inputs"][number] = {
      kind: stringValue(input.kind) ?? "unknown"
    };
    const source = stringValue(input.source);
    const producerId = stringValue(input.producerId);
    const artifactPolicy = stringValue(input.artifactPolicy);

    if (source) {
      item.source = source;
    }

    if (producerId) {
      item.producerId = producerId;
    }

    if (artifactPolicy === "all" || artifactPolicy === "relations-only") {
      item.artifactPolicy = artifactPolicy;
    }

    return item;
  });
}

function profileIdFromProjectEntry(entry: Record<string, unknown>): string | undefined {
  return isRecord(entry.profile) ? stringValue(entry.profile.profileId) : undefined;
}

function countBy(items: Record<string, unknown>[], getKey: (item: Record<string, unknown>) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hasNestedKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasNestedKey(item, key));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(([entryKey, entryValue]) => entryKey === key || hasNestedKey(entryValue, key));
}

function countAbsolutePathLikeStrings(value: string): number {
  const windowsPathMatches = value.match(/[A-Za-z]:\\\\/g) ?? [];
  const posixPathMatches = value.match(/"\/(?:Users|home|workspace|mnt|var|tmp|Project)\//g) ?? [];
  return windowsPathMatches.length + posixPathMatches.length;
}

async function loadDocument(inputPath: string, jsdocIntegrationPath: string, io: CliIo): Promise<{ document?: HiaDocument }> {
  if (jsdocIntegrationPath) {
    return loadJSDocIntegrationDocument(jsdocIntegrationPath, io);
  }

  if (!inputPath) {
    return { document: createBasicFixtureDocument() };
  }

  try {
    const content = await readFile(inputPath, "utf8");
    return { document: JSON.parse(content) as HiaDocument };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_INPUT_READ_FAILED",
        `${inputPath} - ${message}`,
        "error",
        undefined,
        {
          inputPath
        }
      )
    ], io);
    return {};
  }
}

async function loadJSDocIntegrationDocument(inputPath: string, io: CliIo): Promise<{ document?: HiaDocument }> {
  try {
    const content = await readFile(inputPath, "utf8");
    const integration = JSON.parse(content) as unknown;
    const result = convertJSDocIntegrationToHiaDocumentDetailed(integration, {
      documentId: "jsdoc.integration",
      title: "JSDoc Integration"
    });

    reportDiagnostics(result.diagnostics, io);

    if (result.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return {};
    }

    return { document: result.document };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_JSDOC_INTEGRATION_READ_FAILED",
        `${inputPath} - ${message}`,
        "error",
        undefined,
        {
          inputPath
        }
      )
    ], io);
    return {};
  }
}

async function loadProjectManifest(inputPath: string, io: CliIo): Promise<{ manifest?: ProjectDocsManifest }> {
  try {
    const content = await readFile(inputPath, "utf8");
    const manifest = JSON.parse(content) as unknown;
    const diagnostics = validateHiaProjectManifest(manifest, { targetPath: inputPath });
    reportDiagnostics(diagnostics, io);

    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return {};
    }

    return { manifest: manifest as ProjectDocsManifest };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_PROJECT_MANIFEST_READ_FAILED",
        `${inputPath} - ${message}`,
        "error",
        undefined,
        {
          projectManifestPath: inputPath
        }
      )
    ], io);
    return {};
  }
}

async function loadProjectProfiles(manifest: ProjectDocsManifest, baseDir: string): Promise<{
  profiles: RenderProjectProfileRef[];
  diagnostics: HiaDiagnostic[];
}> {
  const diagnostics: HiaDiagnostic[] = [];
  const loadedProfiles: HiaDocumentationProfile[] = [];
  const profileRefs: RenderProjectProfileRef[] = [];

  for (const profileRef of manifest.profiles ?? []) {
    if (!profileRef.profileId) {
      continue;
    }

    if (profileRef.path) {
      const loaded = await loadHiaProfileFromFile(path.resolve(baseDir, profileRef.path));
      diagnostics.push(...loaded.diagnostics);

      if (!hasProfileErrors(loaded.diagnostics)) {
        loadedProfiles.push(loaded.profile);
        profileRefs.push({
          profileId: loaded.profile.profileId,
          profileVersion: loaded.profile.profileVersion,
          layer: loaded.profile.layer,
          path: profileRef.path
        });
      }
      continue;
    }

    profileRefs.push({
      profileId: profileRef.profileId,
      ...(profileRef.profileVersion ? { profileVersion: profileRef.profileVersion } : {}),
      ...(profileRef.layer ? { layer: profileRef.layer } : {})
    });
  }

  if (loadedProfiles.length > 0) {
    const profileSet = createHiaProfileSet({ profiles: loadedProfiles });
    diagnostics.push(...profileSet.diagnostics);
  }

  return {
    profiles: dedupeProfileRefs(profileRefs),
    diagnostics
  };
}

async function loadBrowserPanelDocSourceMaps(
  manifest: ProjectDocsManifest,
  projectManifestPath: string,
  io: CliIo
): Promise<BrowserPanelDocSourceMapInput[]> {
  const baseDir = path.dirname(projectManifestPath);
  const docSourceMaps: BrowserPanelDocSourceMapInput[] = [];

  for (const input of manifest.inputs ?? []) {
    if (input.kind !== "doc-source-map" || !input.path) {
      continue;
    }

    const inputPath = path.resolve(baseDir, input.path);
    const readResult = await readProjectJson(inputPath, input, io);

    if (!readResult) {
      continue;
    }

    const index = createDocSourceMapIndex(readResult, { path: input.path });
    reportDiagnostics(index.diagnostics, io);
    const ordinarySourceMaps = await loadBrowserPanelOrdinarySourceMaps(index, input.path, inputPath, baseDir, io);
    const item: BrowserPanelDocSourceMapInput = {
      path: input.path,
      index,
      ...(ordinarySourceMaps.length > 0 ? { ordinarySourceMaps } : {})
    };
    docSourceMaps.push(item);
  }

  return docSourceMaps;
}

async function loadBrowserPanelProjectRelationGraph(
  projectIndexPath: string,
  io: CliIo
): Promise<{ failed?: boolean; relationGraph?: BrowserPanelRelationGraphInput }> {
  try {
    const projectIndex = JSON.parse(await readFile(projectIndexPath, "utf8")) as unknown;

    if (!isRecord(projectIndex) || !isRecord(projectIndex.relationGraph)) {
      reportDiagnostics([
        createCliDiagnostic(
          "HIA_CLI_BROWSER_PROJECT_RELATION_GRAPH_MISSING",
          `project-index.json does not contain relationGraph: ${projectIndexPath}.`,
          "warning",
          projectIndexPath,
          {
            projectIndexPath
          }
        )
      ], io);
      return {};
    }

    return {
      relationGraph: projectIndex.relationGraph as BrowserPanelRelationGraphInput
    };
  } catch (error) {
    reportDiagnostics([
      createCliDiagnostic(
        error instanceof SyntaxError ? "HIA_CLI_BROWSER_PROJECT_INDEX_PARSE_FAILED" : "HIA_CLI_BROWSER_PROJECT_INDEX_READ_FAILED",
        `${projectIndexPath} - ${errorMessage(error)}`,
        "error",
        projectIndexPath,
        {
          projectIndexPath
        }
      )
    ], io);

    return {
      failed: true
    };
  }
}

async function loadBrowserPanelOrdinarySourceMaps(
  docSourceMapIndex: DocSourceMapIndex,
  docSourceMapInputPath: string,
  docSourceMapAbsolutePath: string,
  projectBaseDir: string,
  io: CliIo
): Promise<BrowserPanelOrdinarySourceMapInput[]> {
  const ordinarySourceMaps: BrowserPanelOrdinarySourceMapInput[] = [];

  for (const sourceMapRef of docSourceMapIndex.sourceMaps) {
    if (!sourceMapRef.path) {
      continue;
    }

    if (isUnsafeOutputRelativePath(sourceMapRef.path)) {
      reportDiagnostics([
        createCliDiagnostic(
          "HIA_CLI_BROWSER_SOURCE_MAP_PATH_UNSAFE",
          `Skipped unsafe source map path: ${sourceMapRef.path}.`,
          "warning",
          sourceMapRef.path,
          {
            docSourceMapPath: docSourceMapInputPath,
            sourceMapPath: sourceMapRef.path
          }
        )
      ], io);
      continue;
    }

    const readResult = await readBrowserPanelSourceMapJson(sourceMapRef, docSourceMapInputPath, docSourceMapAbsolutePath, projectBaseDir, io);

    if (!readResult) {
      continue;
    }

    const artifactPath = inferSourceMapArtifactPath(docSourceMapIndex, sourceMapRef);
    const sourceMapIndex = createOrdinarySourceMapIndex(readResult.value, {
      path: sourceMapRef.path,
      ...(artifactPath ? { artifactPath } : {})
    });
    reportDiagnostics(sourceMapIndex.diagnostics, io);
    ordinarySourceMaps.push({
      path: sourceMapRef.path,
      index: sourceMapIndex
    });
  }

  return ordinarySourceMaps;
}

async function readBrowserPanelSourceMapJson(
  sourceMapRef: DocSourceMapSourceMapLink,
  docSourceMapInputPath: string,
  docSourceMapAbsolutePath: string,
  projectBaseDir: string,
  io: CliIo
): Promise<{ path: string; value: unknown } | undefined> {
  const sourceMapPath = sourceMapRef.path ?? "";
  const producerOutputDirectory = inferDocSourceMapOutputDirectory(docSourceMapAbsolutePath);
  const candidates = dedupePaths([
    path.resolve(projectBaseDir, sourceMapPath),
    path.resolve(path.dirname(docSourceMapAbsolutePath), sourceMapPath),
    ...(producerOutputDirectory ? [path.resolve(producerOutputDirectory, sourceMapPath)] : [])
  ]);

  for (const candidate of candidates) {
    try {
      return {
        path: candidate,
        value: JSON.parse(await readFile(candidate, "utf8")) as unknown
      };
    } catch (error) {
      if (isFileNotFoundError(error)) {
        continue;
      }

      reportDiagnostics([
        createCliDiagnostic(
          error instanceof SyntaxError ? "HIA_CLI_BROWSER_SOURCE_MAP_PARSE_FAILED" : "HIA_CLI_BROWSER_SOURCE_MAP_READ_FAILED",
          `${sourceMapPath} - ${errorMessage(error)}`,
          "warning",
          sourceMapPath,
          {
            docSourceMapPath: docSourceMapInputPath,
            sourceMapPath,
            resolvedPath: candidate
          }
        )
      ], io);
      return undefined;
    }
  }

  reportDiagnostics([
    createCliDiagnostic(
      "HIA_CLI_BROWSER_SOURCE_MAP_NOT_FOUND",
      `Source map declared by ${docSourceMapInputPath} was not found: ${sourceMapPath}.`,
      "warning",
      sourceMapPath,
      {
        docSourceMapPath: docSourceMapInputPath,
        sourceMapPath
      }
    )
  ], io);
  return undefined;
}

/**
 * Producer artifact maps use `pathBases.artifacts=outputDirectory`, while the doc-source-map itself commonly lives below `artifacts/`.
 *
 * 生产器 artifact map 使用 `pathBases.artifacts=outputDirectory`，而 doc-source-map 本身通常位于 `artifacts/` 子目录中。
 */
function inferDocSourceMapOutputDirectory(docSourceMapAbsolutePath: string): string | undefined {
  let current = path.dirname(docSourceMapAbsolutePath);

  while (true) {
    if (path.basename(current) === "artifacts") {
      return path.dirname(current);
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function createBrowserPanelProjectInfo(manifest: ProjectDocsManifest): BrowserPanelProjectInfo {
  return {
    name: manifest.project?.name ?? "HIA Project",
    ...(manifest.project?.id ? { id: manifest.project.id } : {}),
    ...(manifest.project?.title ? { title: manifest.project.title } : {})
  };
}

function inferSourceMapArtifactPath(index: DocSourceMapIndex, sourceMapRef: DocSourceMapSourceMapLink): string | undefined {
  const sourceMapPath = sourceMapRef.path ? toPosix(sourceMapRef.path) : "";
  const artifactPaths = index.entries
    .flatMap((entry) => entry.artifactLinks.map((link) => link.path))
    .filter((value): value is string => Boolean(value));

  return artifactPaths.find((artifactPath) => {
    const normalizedArtifactPath = toPosix(artifactPath);
    return sourceMapPath === `${normalizedArtifactPath}.map` || sourceMapPath.endsWith(`/${basename(normalizedArtifactPath)}.map`);
  }) ?? artifactPaths[0];
}

async function aggregateProjectDocs(
  manifest: ProjectDocsManifest,
  projectManifestPath: string,
  outputDir: string,
  profileRefs: RenderProjectProfileRef[],
  io: CliIo
): Promise<ProjectAggregationResult> {
  const baseDir = path.dirname(projectManifestPath);
  const entries: RenderProjectEntry[] = [];
  const diagnostics: HiaDiagnostic[] = [];
  const docSourceMaps: RenderProjectDocSourceMapRef[] = [];
  const indexedDocSourceMaps: IndexedProjectDocSourceMap[] = [];
  const dotnetSourceRelations: DotNetSourceRelationArtifact[] = [];
  const inputRefs: ProjectAggregationResult["inputRefs"] = [];
  const knownProfileIds = new Set(profileRefs.map((profile) => profile.profileId));
  const producerSummary = await runProjectProducers(manifest, baseDir, outputDir, profileRefs);
  diagnostics.push(...producerSummary.diagnostics);
  inputRefs.push(...producerSummary.inputRefs);
  const runtimeInputs: RuntimeProjectInput[] = [
    ...(manifest.inputs ?? []).map((input) => ({
      baseDir,
      input,
      source: "manifest" as const
    })),
    ...producerSummary.runtimeInputs
  ];

  for (const runtimeInput of runtimeInputs) {
    const { input } = runtimeInput;
    if (!input.kind || !input.path) {
      continue;
    }

    if (runtimeInput.source === "manifest") {
      inputRefs.push({
        kind: input.kind,
        path: input.path,
        ...(input.profile ? { profile: input.profile } : {}),
        ...(input.artifactPolicy ? { artifactPolicy: input.artifactPolicy } : {}),
        source: runtimeInput.source
      });
    }

    if (input.profile?.profileId && knownProfileIds.size > 0 && !knownProfileIds.has(input.profile.profileId)) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_PROJECT_PROFILE_UNKNOWN",
        `Project input references unknown profile "${input.profile.profileId}".`,
        "warning",
        input.path,
        {
          profileId: input.profile.profileId,
          inputPath: input.path
        }
      ));
    }

    const inputPath = path.resolve(runtimeInput.baseDir, input.path);
    const readResult = await readProjectJson(inputPath, input, io);

    if (!readResult) {
      return {
        inputRefs,
        producerResults: producerSummary.results
      };
    }

    if (input.kind === "hia-document") {
      const document = readResult as HiaDocument;
      const validation = validateHiaDocumentDetailed(document);
      diagnostics.push(...validation.diagnostics);

      if (!validation.valid) {
        continue;
      }

      entries.push(...document.symbols.map((symbol, index) => hiaSymbolToProjectEntry(symbol, document, input, index)));
      continue;
    }

    if (input.kind === "jsdoc-integration") {
      const result = convertJSDocIntegrationToHiaDocumentDetailed(readResult, {
        documentId: `project:${manifest.project?.name ?? "docs"}:jsdoc`,
        title: "JSDoc Integration"
      });
      diagnostics.push(...result.diagnostics);

      if (result.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
        continue;
      }

      entries.push(...result.document.symbols.map((symbol, index) => hiaSymbolToProjectEntry(symbol, result.document, input, index, "js")));
      continue;
    }

    if (input.kind === "htmdoc-extraction" || input.kind === "cssdoc-extraction") {
      entries.push(...extractionArtifactToProjectEntries(readResult, input));
      continue;
    }

    if (input.kind === "doc-source-map") {
      const sourceMapIndex = createDocSourceMapIndex(readResult, { path: input.path });
      diagnostics.push(...sourceMapIndex.diagnostics);
      indexedDocSourceMaps.push({
        index: sourceMapIndex,
        input: runtimeInput
      });
      docSourceMaps.push(docSourceMapToRef(sourceMapIndex, input));
      continue;
    }

    if (input.kind === "documentation-producer-result") {
      const resultDiagnostics = validateDocumentationProducerResult(readResult);
      diagnostics.push(...resultDiagnostics.map((diagnostic) => createCliDiagnostic(
        diagnostic.code,
        diagnostic.message,
        diagnostic.severity,
        producerDiagnosticTargetPath(diagnostic, input.path ?? "project.inputs"),
        producerDiagnosticData(diagnostic)
      )));

      if (resultDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
        continue;
      }

      dotnetSourceRelations.push(...await readDotNetSourceRelationArtifacts(
        readResult as DocumentationProducerResult,
        inputPath,
        diagnostics
      ));

      const materializedInputs = producerResultToRuntimeInputs(
        readResult as DocumentationProducerResult,
        input,
        inputPath,
        profileRefs
      );
      runtimeInputs.push(...materializedInputs);
      inputRefs.push(...materializedInputs.map((materializedInput) => ({
        kind: materializedInput.input.kind ?? "unknown",
        path: materializedInput.input.path ?? "",
        ...(materializedInput.input.profile ? { profile: materializedInput.input.profile } : {}),
        ...(materializedInput.producerId ? { producerId: materializedInput.producerId } : {}),
        source: materializedInput.source
      })));
      continue;
    }

    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_PROJECT_INPUT_KIND_UNSUPPORTED",
      `Unsupported project input kind: ${input.kind}.`,
      "error",
      input.path,
      {
        inputKind: input.kind
      }
    ));
  }

  return {
    projectInput: {
      project: {
        name: manifest.project?.name ?? "HIA Project",
        ...(manifest.project?.id ? { id: manifest.project.id } : {}),
        ...(manifest.project?.title ? { title: manifest.project.title } : {}),
        ...(manifest.project?.defaultLocale ? { defaultLocale: manifest.project.defaultLocale } : {}),
        ...(manifest.project?.locales ? { locales: manifest.project.locales } : {})
      },
      profiles: profileRefs,
      docSourceMaps,
      entries: linkProjectEntriesWithDocSourceMaps(
        applyDotNetSourceRelations(dedupeProjectEntries(entries), dotnetSourceRelations),
        indexedDocSourceMaps
      ),
      diagnostics
    },
    inputRefs,
    producerResults: producerSummary.results
  };
}

/**
 * 按领域视图和 canonical symbol id 去重，保留先出现的规范化 API 文档，避免 source-probe 辅助 document 形成第二套卡片。
 * Deduplicates by domain view and canonical symbol id, preserving the first normalized API document so source-probe helper documents do not create duplicate cards.
 */
function dedupeProjectEntries(entries: RenderProjectEntry[]): RenderProjectEntry[] {
  const seenSymbolKeys = new Set<string>();
  return entries.filter((entry) => {
    if (!entry.symbolId) {
      return true;
    }
    const key = `${entry.view}:${entry.symbolId}`;
    if (seenSymbolKeys.has(key)) {
      return false;
    }
    seenSymbolKeys.add(key);
    return true;
  });
}

async function readDotNetSourceRelationArtifacts(
  result: DocumentationProducerResult,
  resultPath: string,
  diagnostics: HiaDiagnostic[]
): Promise<DotNetSourceRelationArtifact[]> {
  const resultBaseDir = path.dirname(resultPath);
  const relationArtifacts = result.artifacts.filter((artifact) => artifact.kind === "dotnetdoc-source-relation" || artifact.contract === "dotnetdoc-source-relation");
  const relations: DotNetSourceRelationArtifact[] = [];
  for (const artifact of relationArtifacts) {
    const artifactPath = normalizeOutputRelativePath(artifact.path);
    if (isUnsafeOutputRelativePath(artifactPath)) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_DOTNET_SOURCE_RELATION_PATH_UNSAFE",
        `Skipped unsafe DotNetDoc source relation path: ${artifact.path}.`,
        "warning",
        artifact.path
      ));
      continue;
    }
    const absolutePath = path.resolve(resultBaseDir, artifactPath);
    try {
      const parsed = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
      if (isRecord(parsed) && Array.isArray(parsed.relations)) {
        relations.push(parsed as DotNetSourceRelationArtifact);
      }
    } catch (error) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_DOTNET_SOURCE_RELATION_READ_FAILED",
        `Unable to read DotNetDoc source relation artifact: ${artifact.path}.`,
        "warning",
        artifact.path,
        {
          cause: errorMessage(error)
        }
      ));
    }
  }
  return relations;
}

async function runProjectProducers(
  manifest: ProjectDocsManifest,
  baseDir: string,
  outputDir: string,
  profileRefs: RenderProjectProfileRef[]
): Promise<ProducerRunSummary> {
  const diagnostics: HiaDiagnostic[] = [];
  const inputRefs: ProjectAggregationResult["inputRefs"] = [];
  const runtimeInputs: RuntimeProjectInput[] = [];
  const results: ProducerRunSummary["results"] = [];

  for (const [index, producerRef] of (manifest.producers ?? []).entries()) {
    const producerId = producerRef.id ?? `producer-${index + 1}`;
    const failureMode = producerRef.failureMode ?? "fail";
    const modulePath = producerRef.module ?? "";
    const outputRelativePath = producerRef.outputDirectory ?? `.hia-producers/${slug(producerId)}`;
    const producerOutputDir = path.resolve(outputDir, outputRelativePath);

    if (!isPathInside(outputDir, producerOutputDir)) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_PRODUCER_OUTPUT_UNSAFE",
        `Producer "${producerId}" outputDirectory must stay inside the CLI output directory.`,
        failureMode === "warn" ? "warning" : "error",
        `producers.${index}.outputDirectory`,
        {
          producerId,
          outputDirectory: outputRelativePath
        }
      ));
      results.push(createProducerRunResult(producerId, "failed", 0));
      continue;
    }

    let producer: DocumentationProducer | undefined;
    try {
      producer = await loadDocumentationProducer(path.resolve(baseDir, modulePath), producerRef.exportName);
    } catch (error) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_PRODUCER_LOAD_FAILED",
        `Unable to load producer "${producerId}": ${errorMessage(error)}`,
        failureMode === "warn" ? "warning" : "error",
        `producers.${index}.module`,
        {
          producerId,
          module: modulePath
        }
      ));
      results.push(createProducerRunResult(producerId, "failed", 0));
      continue;
    }

    let result: DocumentationProducerResult;
    try {
      result = await runDocumentationProducer(producer, {
        workspaceRoot: path.resolve(baseDir, producerRef.workspaceRoot ?? "."),
        outputDirectory: producerOutputDir,
        inputs: (producerRef.inputs ?? []).map(normalizeProducerInputForRuntime),
        ...(producerRef.options ? { options: producerRef.options } : {}),
        ...(producerRef.profileIds ? { profileIds: producerRef.profileIds } : {})
      });
    } catch (error) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_PRODUCER_RUN_FAILED",
        `Producer "${producerId}" failed during execution: ${errorMessage(error)}`,
        failureMode === "warn" ? "warning" : "error",
        `producers.${index}`,
        {
          producerId
        }
      ));
      results.push(createProducerRunResult(producerId, "failed", 0));
      continue;
    }

    diagnostics.push(...normalizeProducerDiagnostics(result, producerId, index, failureMode === "warn"));
    results.push(createProducerRunResult(producerId, result.status, result.artifacts.length));

    for (const artifact of selectProducerArtifactsForAggregation(result.artifacts)) {
      const runtimeInput = producerArtifactToRuntimeInput(artifact, producerId, producerOutputDir, outputDir, profileRefs);
      if (!runtimeInput) {
        continue;
      }

      runtimeInputs.push(runtimeInput);
      inputRefs.push({
        kind: runtimeInput.input.kind ?? artifact.kind,
        path: runtimeInput.input.path ?? artifact.path,
        ...(runtimeInput.input.profile ? { profile: runtimeInput.input.profile } : {}),
        producerId,
        source: "producer"
      });
    }
  }

  return {
    diagnostics,
    inputRefs,
    runtimeInputs,
    results
  };
}

/**
 * 保留 manifest 中声明的 producer input 扩展字段，供 DotNetDoc 等 producer 消费。
 * Preserves producer input extension fields declared by the manifest for producers such as DotNetDoc.
 */
function normalizeProducerInputForRuntime(input: ProjectManifestProducerInput): DocumentationProducerInput {
  return {
    ...input,
    kind: input.kind ?? "",
    path: input.path ?? ""
  };
}

/**
 * 选择供项目页面渲染的 producer artifact；保留所有 artifact 于 producer result，但避免 extraction 与其规范化 HIA document 重复渲染。
 * Selects producer artifacts for project-page rendering; all artifacts remain in the producer result, while an extraction and its normalized HIA document are not rendered twice.
 */
function selectProducerArtifactsForAggregation(artifacts: DocumentationProducerArtifact[]): DocumentationProducerArtifact[] {
  const hasNormalizedHiaDocument = artifacts.some((artifact) => artifact.kind === "hia-document");

  if (!hasNormalizedHiaDocument) {
    return artifacts;
  }

  return artifacts.filter((artifact) => artifact.kind !== "htmdoc-extraction" && artifact.kind !== "cssdoc-extraction");
}

function createProducerRunResult(
  id: string,
  status: DocumentationProducerResult["status"],
  artifactCount: number
): ProducerRunSummary["results"][number] {
  return {
    id,
    status,
    artifactCount
  };
}

async function loadDocumentationProducer(modulePath: string, exportName?: string): Promise<DocumentationProducer> {
  const moduleExports = await import(pathToFileURL(modulePath).href) as Record<string, unknown>;
  const candidate = exportName ? moduleExports[exportName] : moduleExports.default;

  if (isDocumentationProducer(candidate)) {
    return candidate;
  }

  if (!exportName) {
    const discovered = Object.values(moduleExports).find(isDocumentationProducer);
    if (discovered) {
      return discovered;
    }
  }

  throw new Error(exportName
    ? `Export "${exportName}" is not a documentation producer.`
    : "Module does not export a documentation producer.");
}

function isDocumentationProducer(value: unknown): value is DocumentationProducer {
  return isRecord(value)
    && isRecord(value.descriptor)
    && typeof value.produce === "function";
}

function normalizeProducerDiagnostics(
  result: DocumentationProducerResult,
  producerId: string,
  producerIndex: number,
  downgradeErrors: boolean
): HiaDiagnostic[] {
  return result.diagnostics.map((diagnostic, diagnosticIndex) => createCliDiagnostic(
    diagnostic.code,
    `Producer "${producerId}": ${diagnostic.message}`,
    downgradeErrors && diagnostic.severity === "error" ? "warning" : diagnostic.severity,
    producerDiagnosticTargetPath(diagnostic, `producers.${producerIndex}.diagnostics.${diagnosticIndex}`),
    {
      ...producerDiagnosticData(diagnostic),
      producerId,
      producerStatus: result.status
    }
  ));
}

function producerDiagnosticTargetPath(diagnostic: HiaDiagnostic, fallbackPath: string): string {
  const extended = diagnostic as HiaDiagnostic & { source?: { path?: unknown } };
  return diagnostic.targetPath
    ?? diagnostic.path
    ?? (typeof extended.source?.path === "string" ? extended.source.path : undefined)
    ?? fallbackPath;
}

function producerDiagnosticData(diagnostic: HiaDiagnostic): HiaDiagnosticData | undefined {
  const extended = diagnostic as HiaDiagnostic & { metadata?: unknown; source?: unknown };
  const data = {
    ...(diagnostic.data ?? {}),
    ...(isPlainJsonObject(extended.metadata) ? { metadata: extended.metadata } : {}),
    ...(isPlainJsonObject(extended.source) ? { source: extended.source } : {})
  };
  return Object.keys(data).length > 0 ? data : undefined;
}

function isPlainJsonObject(value: unknown): value is HiaDiagnosticData {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function producerArtifactToRuntimeInput(
  artifact: DocumentationProducerArtifact,
  producerId: string,
  producerOutputDir: string,
  outputDir: string,
  profileRefs: RenderProjectProfileRef[]
): RuntimeProjectInput | undefined {
  const inputKind = projectInputKindFromArtifactKind(artifact.kind);
  if (!inputKind) {
    return undefined;
  }

  const artifactPath = path.resolve(producerOutputDir, artifact.path);
  if (!isPathInside(producerOutputDir, artifactPath)) {
    return undefined;
  }

  const projectRelativePath = toPosix(path.relative(outputDir, artifactPath));
  if (isUnsafeOutputRelativePath(projectRelativePath)) {
    return undefined;
  }

  const domain = domainFromProjectInputKind(inputKind);
  const profile = profileFromArtifactProfileIds(artifact.profileIds, profileRefs);

  return {
    baseDir: outputDir,
    input: {
      kind: inputKind,
      path: projectRelativePath,
      ...(domain ? { domain } : {}),
      ...(profile ? { profile } : {})
    },
    producerId,
    source: "producer"
  };
}

/**
 * 将既有 documentation-producer-result 展开成 project aggregation runtime inputs。
 * Expands an existing documentation-producer-result into project aggregation runtime inputs.
 */
function producerResultToRuntimeInputs(
  result: DocumentationProducerResult,
  input: ProjectManifestInput,
  resultPath: string,
  profileRefs: RenderProjectProfileRef[]
): RuntimeProjectInput[] {
  if (input.artifactPolicy === "relations-only") {
    return [];
  }

  const resultBaseDir = path.dirname(resultPath);
  return selectProducerArtifactsForAggregation(result.artifacts)
    .map((artifact) => producerResultArtifactToRuntimeInput(artifact, result, input, resultBaseDir, profileRefs))
    .filter((runtimeInput): runtimeInput is RuntimeProjectInput => Boolean(runtimeInput));
}

function producerResultArtifactToRuntimeInput(
  artifact: DocumentationProducerArtifact,
  result: DocumentationProducerResult,
  input: ProjectManifestInput,
  resultBaseDir: string,
  profileRefs: RenderProjectProfileRef[]
): RuntimeProjectInput | undefined {
  const inputKind = projectInputKindFromArtifactKind(artifact.kind);
  if (!inputKind) {
    return undefined;
  }

  const artifactPath = normalizeOutputRelativePath(artifact.path);
  if (isUnsafeOutputRelativePath(artifactPath)) {
    return undefined;
  }

  const domain = input.domain ?? domainFromProjectInputKind(inputKind);
  const profile = input.profile ?? profileFromArtifactProfileIds(artifact.profileIds, profileRefs);

  return {
    baseDir: resultBaseDir,
    input: {
      kind: inputKind,
      path: artifactPath,
      ...(domain ? { domain } : {}),
      ...(profile ? { profile } : {})
    },
    producerId: result.producer.id,
    source: "producer-result"
  };
}

function projectInputKindFromArtifactKind(kind: string): ProjectManifestInput["kind"] | undefined {
  if (kind === "hia-document" || kind === "jsdoc-integration" || kind === "htmdoc-extraction" || kind === "cssdoc-extraction" || kind === "doc-source-map") {
    return kind;
  }

  return undefined;
}

function domainFromProjectInputKind(kind: string): ProjectManifestInput["domain"] | undefined {
  if (kind === "jsdoc-integration") {
    return "js";
  }

  if (kind === "cssdoc-extraction") {
    return "css";
  }

  if (kind === "htmdoc-extraction") {
    return "html";
  }

  return undefined;
}

function profileFromArtifactProfileIds(profileIds: string[] | undefined, profileRefs: RenderProjectProfileRef[]): RenderProjectProfileRef | undefined {
  const profileId = profileIds?.find((candidate) => profileRefs.some((profile) => profile.profileId === candidate));
  return profileId ? profileRefs.find((profile) => profile.profileId === profileId) : undefined;
}

function applyDotNetSourceRelations(entries: RenderProjectEntry[], artifacts: DotNetSourceRelationArtifact[]): RenderProjectEntry[] {
  if (artifacts.length === 0) {
    return entries;
  }
  const relationsBySymbolId = new Map<string, Record<string, unknown>>();
  for (const artifact of artifacts) {
    for (const item of artifact.relations ?? []) {
      if (!isRecord(item)) {
        continue;
      }
      const hiaSymbol = isRecord(item.hiaSymbol) ? item.hiaSymbol : {};
      const symbolId = stringValue(hiaSymbol.id) ?? stringValue(item.memberId);
      const declaration = isRecord(item.declaration) ? item.declaration : undefined;
      if (symbolId && declaration) {
        const current = relationsBySymbolId.get(symbolId);
        if (!current || compareDotNetSourceRelationPreference(item, current) < 0) {
          relationsBySymbolId.set(symbolId, item);
        }
      }
    }
  }

  return entries.map((entry) => {
    const relation = entry.symbolId ? relationsBySymbolId.get(entry.symbolId) : undefined;
    const declaration = isRecord(relation?.declaration) ? relation.declaration : undefined;
    const declarationPath = stringValue(declaration?.path);
    if (!declarationPath) {
      return entry;
    }

    const declarationRange = isRecord(declaration?.range) ? normalizeProjectRange(declaration.range) : undefined;
    const declarationLanguage = stringValue(declaration?.language);
    const declarationRangeSource = stringValue(declaration?.rangeSource);
    const declarationConfidence = stringValue(declaration?.confidence);
    const declarationSemantic = isRecord(declaration?.semantic) ? declaration.semantic : undefined;
    const declarationHierarchy = createProjectEntryHierarchyFromDotNetSemantic(declarationSemantic);
    const mergedHierarchy = mergeProjectEntryHierarchy(entry.hierarchy, declarationHierarchy);

    return {
      ...entry,
      source: {
        path: declarationPath,
        ...(declarationLanguage ? { language: declarationLanguage } : {}),
        ...(declarationRange ? { range: declarationRange } : {}),
        ...(declarationRangeSource ? { rangeSource: declarationRangeSource } : {}),
        ...(declarationConfidence ? { confidence: declarationConfidence } : {})
      },
      ...(mergedHierarchy ? { hierarchy: mergedHierarchy } : {})
    };
  });
}

/**
 * 在 partial type 的多个合法声明中优先人工维护的声明，避免节点卡片默认跳到 designer/generated 文件。
 * Prefer a human-maintained declaration among partial-type locations so entry cards do not default to designer/generated files.
 */
function compareDotNetSourceRelationPreference(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  const leftKey = dotNetSourceRelationPreferenceKey(left);
  const rightKey = dotNetSourceRelationPreferenceKey(right);
  return leftKey[0] - rightKey[0]
    || leftKey[1] - rightKey[1]
    || leftKey[2] - rightKey[2]
    || leftKey[3].localeCompare(rightKey[3])
    || leftKey[4] - rightKey[4];
}

function dotNetSourceRelationPreferenceKey(relation: Record<string, unknown>): [number, number, number, string, number] {
  const declaration = isRecord(relation.declaration) ? relation.declaration : {};
  const match = isRecord(relation.match) ? relation.match : {};
  const range = isRecord(declaration.range) ? declaration.range : {};
  const start = isRecord(range.start) ? range.start : {};
  const sourcePath = stringValue(declaration.path) ?? "";
  const normalizedPath = sourcePath.replaceAll("\\", "/").toLowerCase();
  const generatedRank = /(?:^|\/)(?:obj|generated)(?:\/|$)|\.(?:designer|generated|g|g\.i)\.cs$/u.test(normalizedPath)
    ? 1
    : 0;
  const matchMode = stringValue(match.mode);
  const matchRank = matchMode === "documentation-id"
    ? 0
    : matchMode === "normalized-signature-fallback"
      ? 1
      : 2;
  const confidence = stringValue(declaration.confidence) ?? stringValue(relation.confidence);
  const confidenceRank = confidence === "high" ? 0 : confidence === "medium" ? 1 : 2;
  const line = typeof start.line === "number" ? start.line : Number.MAX_SAFE_INTEGER;
  return [generatedRank, matchRank, confidenceRank, normalizedPath, line];
}

/**
 * 将 DotNetDoc/Roslyn 的语义结果投影为 renderer 中立层级，不让 HTML renderer 猜测 C# 语义。
 * Projects DotNetDoc/Roslyn semantic output into renderer-neutral hierarchy data so the HTML renderer does not infer C# semantics.
 */
function createProjectEntryHierarchyFromDotNetSemantic(
  semantic: Record<string, unknown> | undefined
): RenderProjectEntry["hierarchy"] | undefined {
  if (!semantic) {
    return undefined;
  }

  const hierarchy: NonNullable<RenderProjectEntry["hierarchy"]> = {};
  const assembly = stringValue(semantic.containingAssembly);
  const namespace = stringValue(semantic.containingNamespace);
  const containingType = stringValue(semantic.containingType);
  const symbolDocumentationId = stringValue(semantic.documentationCommentId);
  const displayName = stringValue(semantic.displayName);
  const parentSymbolId = stringValue(semantic.parentDocumentationCommentId);
  const baseTypeIds = stringArrayValue(semantic.baseTypeIds);
  const interfaceIds = stringArrayValue(semantic.interfaceIds);

  if (assembly) hierarchy.assembly = assembly;
  if (namespace) hierarchy.namespace = namespace;
  if (containingType) hierarchy.containingType = containingType;
  if (symbolDocumentationId) hierarchy.symbolDocumentationId = symbolDocumentationId;
  if (displayName) hierarchy.displayName = displayName;
  if (parentSymbolId) hierarchy.parentSymbolId = parentSymbolId;
  if (baseTypeIds.length > 0) hierarchy.baseTypeIds = baseTypeIds;
  if (interfaceIds.length > 0) hierarchy.interfaceIds = interfaceIds;

  return Object.keys(hierarchy).length > 0 ? hierarchy : undefined;
}

function mergeProjectEntryHierarchy(
  current: RenderProjectEntry["hierarchy"],
  incoming: RenderProjectEntry["hierarchy"]
): RenderProjectEntry["hierarchy"] {
  if (!current) {
    return incoming;
  }
  if (!incoming) {
    return current;
  }
  return {
    ...current,
    ...incoming
  };
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

async function readProjectJson(inputPath: string, input: ProjectManifestInput, io: CliIo): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportDiagnostics([
      createCliDiagnostic(
        "HIA_CLI_PROJECT_INPUT_READ_FAILED",
        `${input.path} - ${message}`,
        "error",
        input.path,
        {
          inputKind: input.kind,
          inputPath: input.path
        }
      )
    ], io);
    return undefined;
  }
}

function hiaSymbolToProjectEntry(
  symbol: HiaSymbol,
  document: HiaDocument,
  input: ProjectManifestInput,
  index: number,
  fallbackView?: RenderProjectView
): RenderProjectEntry {
  const sourceRef = createProjectSourceFromHiaSymbol(symbol).source;
  const dotnetdoc = isRecord(symbol.metadata?.dotnetdoc) ? symbol.metadata.dotnetdoc : undefined;
  const semantic = isRecord(dotnetdoc?.semantic) ? dotnetdoc.semantic : undefined;
  const semanticHierarchy = createProjectEntryHierarchyFromDotNetSemantic(semantic);
  const hierarchy = mergeProjectEntryHierarchy(
    symbol.parentId ? { parentSymbolId: symbol.parentId } : undefined,
    semanticHierarchy
  );

  return {
    id: createProjectEntryId(input.kind ?? "hia-document", symbol.id || symbol.name, index),
    name: symbol.name || symbol.id,
    kind: symbol.kind,
    symbolId: symbol.id,
    view: resolveProjectEntryView(symbol.kind, input.kind, input.domain, fallbackView),
    ...(symbol.summary ? { summary: symbol.summary } : {}),
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(symbol.i18n ? { i18n: symbol.i18n } : {}),
    ...(input.profile ? { profile: input.profile } : {}),
    input: {
      kind: input.kind ?? "hia-document",
      path: input.path ?? "",
      ...(document.schemaVersion ? { contract: "hia-core-document", contractVersion: document.schemaVersion } : {})
    },
    ...(sourceRef ? { source: sourceRef } : {}),
    ...(hierarchy ? { hierarchy } : {})
  };
}

function extractionArtifactToProjectEntries(artifact: unknown, input: ProjectManifestInput): RenderProjectEntry[] {
  if (!isRecord(artifact) || !Array.isArray(artifact.symbols)) {
    return [];
  }

  return artifact.symbols
    .filter(isRecord)
    .map((symbol, index) => {
      const kind = stringValue(symbol.kind) ?? "symbol";
      const symbolId = stringValue(symbol.id);
      const name = stringValue(symbol.name) ?? stringValue(symbol.id) ?? `${input.kind}-${index + 1}`;
      const artifactSource = isRecord(artifact.source) ? artifact.source : {};
      const symbolSource = isRecord(symbol.source) ? symbol.source : artifactSource;
      const profile = input.profile ?? profileFromArtifact(artifact);

      const summary = stringValue(symbol.summary);
      const sourceRange = isRecord(symbolSource.range) ? normalizeProjectRange(symbolSource.range) : undefined;
      const sourceLanguage = stringValue(symbolSource.language);
      const sourceRangeSource = stringValue(symbolSource.rangeSource);
      const sourceConfidence = stringValue(symbolSource.confidence);
      const sourcePreview = createProjectSourcePreviewFromRecord(symbolSource);
      const artifactId = stringValue(artifact.id);
      const contract = stringValue(artifact.contract);
      const contractVersion = stringValue(artifact.contractVersion);

      return {
        id: createProjectEntryId(input.kind ?? "extraction", stringValue(symbol.id) ?? name, index),
        name,
        kind,
        ...(symbolId ? { symbolId } : {}),
        view: resolveProjectEntryView(kind, input.kind, input.domain),
        ...(summary ? { summary } : {}),
        ...(profile ? { profile } : {}),
        input: {
          kind: input.kind ?? "extraction",
          path: input.path ?? "",
          ...(artifactId ? { artifactId } : {}),
          ...(contract ? { contract } : {}),
          ...(contractVersion ? { contractVersion } : {})
        },
        source: {
          path: stringValue(symbolSource.path) ?? stringValue(artifactSource.path) ?? input.path ?? "",
          ...(sourceLanguage ? { language: sourceLanguage } : {}),
          ...(sourceRange ? { range: sourceRange } : {}),
          ...(sourceRangeSource ? { rangeSource: sourceRangeSource } : {}),
          ...(sourceConfidence ? { confidence: sourceConfidence } : {}),
          ...(sourcePreview ? { preview: sourcePreview } : {})
        }
      };
    });
}

function docSourceMapToRef(index: DocSourceMapIndex, input: ProjectManifestInput): RenderProjectDocSourceMapRef {
  return {
    path: input.path ?? "",
    ...(index.contractVersion ? { contractVersion: index.contractVersion } : {}),
    ...(index.entries[0]?.artifactLinks[0]?.path ? { entryArtifact: index.entries[0].artifactLinks[0].path } : {}),
    artifactCount: index.artifactCount,
    entryCount: index.entryCount,
    linkedEntryCount: index.linkedEntryCount,
    sourceCount: index.sourceCount,
    ...(index.sourceMaps.length > 0 ? {
      sourceMaps: index.sourceMaps.map((sourceMap) => ({
        id: sourceMap.id,
        ...(sourceMap.kind ? { kind: sourceMap.kind } : {}),
        ...(sourceMap.language ? { language: sourceMap.language } : {}),
        ...(sourceMap.path ? { path: sourceMap.path } : {})
      }))
    } : {}),
    sourceMapCount: index.sourceMapCount,
    sourcesContentPolicy: index.sourcesContentPolicy,
    status: index.status,
    unresolvedEntryCount: index.unresolvedEntryCount
  };
}

function linkProjectEntriesWithDocSourceMaps(
  entries: RenderProjectEntry[],
  docSourceMaps: IndexedProjectDocSourceMap[]
): RenderProjectEntry[] {
  if (docSourceMaps.length === 0) {
    return entries;
  }

  const docMapEntriesBySymbolId = new Map<string, Array<{
    entry: DocSourceMapIndexedEntry;
    sourceMap: IndexedProjectDocSourceMap;
  }>>();

  for (const sourceMap of docSourceMaps) {
    for (const entry of sourceMap.index.entries) {
      if (!entry.symbolId) {
        continue;
      }

      const bucket = docMapEntriesBySymbolId.get(entry.symbolId) ?? [];
      bucket.push({ entry, sourceMap });
      docMapEntriesBySymbolId.set(entry.symbolId, bucket);
    }
  }

  return entries.map((entry) => {
    const matches = entry.symbolId ? docMapEntriesBySymbolId.get(entry.symbolId) ?? [] : [];
    const firstMatch = matches[0];

    if (!firstMatch) {
      return entry;
    }

    const sourceLink = firstMatch.entry.sourceLinks[0];
    const artifactLink = firstMatch.entry.artifactLinks[0];

    return {
      ...entry,
      docSourceMap: {
        path: firstMatch.sourceMap.input.input.path ?? "",
        entryId: firstMatch.entry.id,
        ...(sourceLink?.path ? { sourcePath: sourceLink.path } : {}),
        ...(sourceLink?.range ? { sourceRange: sourceLink.range } : {}),
        ...(sourceLink?.rangeSource ? { sourceRangeSource: sourceLink.rangeSource } : {}),
        ...(sourceLink?.confidence ? { sourceConfidence: sourceLink.confidence } : {}),
        ...(artifactLink?.path ? { artifactPath: artifactLink.path } : {}),
        ...(artifactLink?.selector ? { artifactSelector: artifactLink.selector } : {}),
        ...(artifactLink?.confidence ? { artifactConfidence: artifactLink.confidence } : {}),
        ...(firstMatch.entry.diagnostics.length > 0 ? { diagnostics: firstMatch.entry.diagnostics } : {})
      }
    };
  });
}

function profileFromArtifact(artifact: Record<string, unknown>): RenderProjectProfileRef | undefined {
  const profile = isRecord(artifact.profile) ? artifact.profile : undefined;
  const profileId = stringValue(profile?.profileId) ?? stringValue(profile?.name);

  if (!profileId) {
    return undefined;
  }

  const profileVersion = stringValue(profile?.profileVersion) ?? stringValue(profile?.version);

  return {
    profileId,
    ...(profileVersion ? { profileVersion } : {})
  };
}

function createProjectSourceFromHiaSymbol(symbol: HiaSymbol): { source?: RenderProjectEntry["source"] } {
  const definedIn = symbol.source?.definedIn;
  const primaryBlock = symbol.source?.primaryBlock;

  if (!definedIn?.relativePath) {
    return {};
  }

  const source: NonNullable<RenderProjectEntry["source"]> = {
    path: definedIn.relativePath
  };

  if (definedIn.language) {
    source.language = definedIn.language;
  }

  if (definedIn.link?.enabled !== false && definedIn.link?.lineUrl) {
    source.linkUrl = definedIn.link.lineUrl;
  }

  if (definedIn.position) {
    source.range = {
      start: {
        line: definedIn.position.line,
        ...(definedIn.position.column ? { column: definedIn.position.column } : {})
      }
    };
  }

  if ((symbol.source?.mode === "include" || symbol.source?.mode === "all") && primaryBlock?.content && primaryBlock.confidence !== "none" && primaryBlock.preview?.enabled !== false) {
    source.preview = {
      content: primaryBlock.preview?.content ?? primaryBlock.content,
      ...(primaryBlock.preview?.defaultExpanded !== undefined ? { defaultExpanded: primaryBlock.preview.defaultExpanded } : {}),
      ...(primaryBlock.preview?.language ?? primaryBlock.language ? { language: primaryBlock.preview?.language ?? primaryBlock.language } : {}),
      ...(primaryBlock.preview?.range ?? primaryBlock.range ? { range: primaryBlock.preview?.range ?? primaryBlock.range } : {})
    };
  }

  return { source };
}

function inferProjectView(kind: string, inputKind?: string): RenderProjectView {
  if (inputKind === "jsdoc-integration" || kind.startsWith("js-") || ["module", "class", "function", "member", "constant", "typedef"].includes(kind)) {
    return "js";
  }

  if (inputKind === "cssdoc-extraction" || kind.startsWith("css-") || kind === "design-token") {
    return "css";
  }

  if (inputKind === "htmdoc-extraction" || kind.startsWith("html-")) {
    return "html";
  }

  if (kind.startsWith("dotnet-")) {
    return "dotnet";
  }

  if (kind.startsWith("powershell-") || kind.startsWith("ps-") || inputKind === "psdoc-extraction") {
    return "powershell";
  }

  return "other";
}

function resolveProjectEntryView(
  kind: string,
  inputKind: string | undefined,
  explicitDomain: ProjectManifestInput["domain"] | undefined,
  fallbackView?: RenderProjectView
): RenderProjectView {
  const inferredView = inferProjectView(kind, inputKind);
  if (explicitDomain && explicitDomain !== "other") {
    return explicitDomain;
  }

  if (inferredView !== "other") {
    return inferredView;
  }

  return explicitDomain ?? fallbackView ?? inferredView;
}

function createProjectEntryId(inputKind: string, rawId: string, index: number): string {
  return `${inputKind}:${slug(rawId || `entry-${index + 1}`)}`;
}

function normalizeProjectRange(value: Record<string, unknown>): NonNullable<RenderProjectEntry["source"]>["range"] | undefined {
  const start = isRecord(value.start) ? value.start : undefined;
  const end = isRecord(value.end) ? value.end : undefined;
  const startLine = numberValue(start?.line);
  const startColumn = numberValue(start?.column);
  const endLine = numberValue(end?.line);
  const endColumn = numberValue(end?.column);

  if (!startLine) {
    return undefined;
  }

  return {
    start: {
      line: startLine,
      ...(startColumn ? { column: startColumn } : {})
    },
    ...(endLine
      ? {
          end: {
            line: endLine,
            ...(endColumn ? { column: endColumn } : {})
          }
        }
      : {})
  };
}

function createProjectSourcePreviewFromRecord(value: Record<string, unknown>): NonNullable<RenderProjectEntry["source"]>["preview"] | undefined {
  const preview = isRecord(value.preview) ? value.preview : undefined;
  const content = stringValue(preview?.content) ?? stringValue(value.content);

  if (!content || preview?.enabled === false) {
    return undefined;
  }

  const previewRange = isRecord(preview?.range) ? normalizeProjectRange(preview.range) : undefined;
  const sourceRange = isRecord(value.range) ? normalizeProjectRange(value.range) : undefined;
  const range = previewRange ?? sourceRange;
  const language = stringValue(preview?.language) ?? stringValue(value.language);
  const defaultExpanded = typeof preview?.defaultExpanded === "boolean" ? preview.defaultExpanded : undefined;

  return {
    content,
    ...(defaultExpanded !== undefined ? { defaultExpanded } : {}),
    ...(language ? { language } : {}),
    ...(range ? { range } : {})
  };
}

function dedupeProfileRefs(profileRefs: RenderProjectProfileRef[]): RenderProjectProfileRef[] {
  const result = new Map<string, RenderProjectProfileRef>();

  for (const profileRef of profileRefs) {
    result.set(profileRef.profileId, profileRef);
  }

  return [...result.values()].sort((left, right) => left.profileId.localeCompare(right.profileId));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

function toPosix(value: string): string {
  return value.replaceAll("\\", "/");
}

function basename(value: string): string {
  const parts = toPosix(value).split("/");
  return parts.at(-1) ?? value;
}

function dedupePaths(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = path.normalize(value).toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function isPathInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isFileNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reportDiagnostics(diagnostics: HiaDiagnostic[], io: CliIo): void {
  for (const diagnostic of diagnostics) {
    const target = diagnostic.targetPath || diagnostic.path || "";
    const location = target ? ` ${target}` : "";
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}]${location} - ${diagnostic.message}`);
  }
}

function createRenderOptions(locale: string | undefined, docsConfig: HiaDocsConfig): RenderHtmlOptions {
  const options: RenderHtmlOptions = {};

  if (locale) {
    options.locale = locale;
  }

  if (docsConfig.renderer?.title) {
    options.title = docsConfig.renderer.title;
  }

  if (typeof docsConfig.renderer?.includeThemeAssets === "boolean") {
    options.includeThemeAssets = docsConfig.renderer.includeThemeAssets;
  }

  options.projectSite = {
    layout: docsConfig.renderer?.projectLayout ?? "split-site",
    source: {
      presentation: resolveProjectSourcePresentation(docsConfig),
      defaultExpanded: docsConfig.source?.defaultExpanded ?? false
    }
  };

  return options;
}

function collectBuildDiagnostics(document: HiaDocument, locale: string | undefined, docsConfig: HiaDocsConfig): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  const checkedLocales = new Set<string>();

  for (const item of [locale, ...(docsConfig.locales || [])]) {
    if (!item || checkedLocales.has(item)) {
      continue;
    }

    checkedLocales.add(item);

    if (!document.locales.includes(item)) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_LOCALE_NOT_DECLARED",
        `Configured locale "${item}" is not declared by the HIA document.`,
        "warning",
        "docs.locale",
        {
          locale: item,
          declaredLocales: document.locales
        }
      ));
    }
  }

  return diagnostics;
}

function validateBuildOptions(manifestPath: string, inputPath?: string, jsdocIntegrationPath?: string, projectManifestPath?: string): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  if (inputPath && jsdocIntegrationPath) {
    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_INPUT_CONFLICT",
      "--input and --jsdoc-integration cannot be used together.",
      "error",
      "docs.input",
      {
        inputPath,
        jsdocIntegrationPath
      }
    ));
  }

  if (projectManifestPath && (inputPath || jsdocIntegrationPath)) {
    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_INPUT_CONFLICT",
      "--project-manifest cannot be used with --input or --jsdoc-integration.",
      "error",
      "docs.projectManifest",
      {
        projectManifestPath,
        inputPath: inputPath ?? "",
        jsdocIntegrationPath: jsdocIntegrationPath ?? ""
      }
    ));
  }

  if (isUnsafeOutputRelativePath(manifestPath)) {
    diagnostics.push(createCliDiagnostic(
      "HIA_CLI_MANIFEST_PATH_INVALID",
      "--manifest and docs.manifest must be a relative path inside the output directory.",
      "error",
      "docs.manifest",
      {
        manifestPath
      }
    ));
  }

  return diagnostics;
}

function validateOptionValues(argv: string[], names: readonly string[]): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  for (const name of names) {
    const index = argv.indexOf(name);

    if (index === -1) {
      continue;
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      diagnostics.push(createCliDiagnostic(
        "HIA_CLI_OPTION_VALUE_MISSING",
        `${name} requires a value.`,
        "error",
        name,
        {
          option: name
        }
      ));
    }
  }

  return diagnostics;
}

function resolveConfiguredPath(
  cliValue: string | undefined,
  configValue: string | undefined,
  defaultValue: string,
  cwd: string,
  configBaseDir: string
): string {
  if (cliValue) {
    return path.resolve(cwd, cliValue);
  }

  if (configValue) {
    return path.resolve(configBaseDir, configValue);
  }

  return path.resolve(cwd, defaultValue);
}

function resolveOptionalConfiguredPath(
  cliValue: string | undefined,
  configValue: string | undefined,
  cwd: string,
  configBaseDir: string
): string | undefined {
  if (cliValue) {
    return path.resolve(cwd, cliValue);
  }

  if (configValue) {
    return path.resolve(configBaseDir, configValue);
  }

  return undefined;
}

function normalizeOutputRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function isUnsafeOutputRelativePath(value: string): boolean {
  const normalized = normalizeOutputRelativePath(value);

  return !normalized
    || normalized === "."
    || path.isAbsolute(normalized)
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..");
}

function readOption(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1];
  return value && !value.startsWith("-") ? value : undefined;
}

function createCliDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function createDefaultIo(): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message)
  };
}

/**
 * 判断当前模块是否是 CLI 入口，并兼容 npm 在 POSIX 平台创建的 `.bin` symlink。
 * Detects whether this module is the CLI entry point, including npm `.bin` symlinks on POSIX platforms.
 *
 * @param moduleUrl - 当前模块 URL。Current module URL.
 * @param argvPath - Node 传入的入口脚本路径。Entrypoint script path passed by Node.
 * @returns 当前模块是否应执行 CLI 主流程。
 */
export function isCliEntrypoint(moduleUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) {
    return false;
  }

  return normalizeCliEntrypointPath(fileURLToPath(moduleUrl)) === normalizeCliEntrypointPath(argvPath);
}

function normalizeCliEntrypointPath(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

if (isCliEntrypoint(import.meta.url, process.argv[1])) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
