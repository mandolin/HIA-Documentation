#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  hasConfigErrors,
  loadHiaProjectConfig,
  validateHiaProjectManifest,
  type HiaDocsConfig,
  type HiaProjectDocsManifest as ProjectDocsManifest,
  type HiaProjectManifestInput as ProjectManifestInput
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
  type DocumentationProducer,
  type DocumentationProducerArtifact,
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
  type RenderProjectView
} from "@hia-doc/renderer-html";
import {
  createDocSourceMapIndex,
  type DocSourceMapIndex,
  type DocSourceMapIndexedEntry
} from "@hia-doc/source-linkage";

const OUTPUT_MANIFEST_PATH = "hia-manifest.json";

const HELP_TEXT = `HIA Documentation CLI

Usage:
  hia --help
  hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--project-manifest <file>] [--out <dir>] [--locale <locale>]

Commands:
  docs build   Generate HTML documentation from a HIA document fixture.

Options:
  --config <file>     HIA config JSON file. Defaults to hia.config.json when present.
  --input <file>      HIA document JSON file. Defaults to the built-in basic fixture.
  --jsdoc-integration <file>
                      JSDoc HIA Integration JSON file to convert before rendering.
  --project-manifest <file>
                      Project docs manifest that aggregates JSDoc, CSSDoc, HTMDoc and doc-source-map artifacts.
  --out <dir>         Output directory. Defaults to dist/docs.
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
    source?: "manifest" | "producer";
  }>;
  producerResults?: ProducerRunSummary["results"];
}

interface IndexedProjectDocSourceMap {
  index: DocSourceMapIndex;
  input: RuntimeProjectInput;
}

interface RuntimeProjectInput {
  baseDir: string;
  input: ProjectManifestInput;
  producerId?: string;
  source: "manifest" | "producer";
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
    return runProjectDocsBuild(projectManifestPath, outputDir, manifestPath, docsConfig, locale, io);
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

async function runProjectDocsBuild(
  projectManifestPath: string,
  outputDir: string,
  manifestPath: string,
  docsConfig: HiaDocsConfig,
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

  const rendered = renderProjectHtmlDocument(aggregation.projectInput, createRenderOptions(locale, docsConfig));
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
        ...(manifest.project?.title ? { title: manifest.project.title } : {})
      },
      profiles: profileRefs,
      docSourceMaps,
      entries: linkProjectEntriesWithDocSourceMaps(entries, indexedDocSourceMaps),
      diagnostics
    },
    inputRefs,
    producerResults: producerSummary.results
  };
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
        inputs: (producerRef.inputs ?? []).map((input) => ({
          kind: input.kind ?? "",
          path: input.path ?? "",
          ...(input.language ? { language: input.language } : {})
        })),
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

    for (const artifact of result.artifacts) {
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
    diagnostic.targetPath ?? diagnostic.path ?? `producers.${producerIndex}.diagnostics.${diagnosticIndex}`,
    {
      ...(diagnostic.data ?? {}),
      producerId,
      producerStatus: result.status
    }
  ));
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

  return {
    id: createProjectEntryId(input.kind ?? "hia-document", symbol.id || symbol.name, index),
    name: symbol.name || symbol.id,
    kind: symbol.kind,
    symbolId: symbol.id,
    view: input.domain ?? fallbackView ?? inferProjectView(symbol.kind),
    ...(symbol.summary ? { summary: symbol.summary } : {}),
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(input.profile ? { profile: input.profile } : {}),
    input: {
      kind: input.kind ?? "hia-document",
      path: input.path ?? "",
      ...(document.schemaVersion ? { contract: "hia-core-document", contractVersion: document.schemaVersion } : {})
    },
    ...(sourceRef ? { source: sourceRef } : {})
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
      const artifactId = stringValue(artifact.id);
      const contract = stringValue(artifact.contract);
      const contractVersion = stringValue(artifact.contractVersion);

      return {
        id: createProjectEntryId(input.kind ?? "extraction", stringValue(symbol.id) ?? name, index),
        name,
        kind,
        ...(symbolId ? { symbolId } : {}),
        view: input.domain ?? inferProjectView(kind, input.kind),
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
          ...(sourceConfidence ? { confidence: sourceConfidence } : {})
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

  if (!definedIn?.relativePath) {
    return {};
  }

  const source: NonNullable<RenderProjectEntry["source"]> = {
    path: definedIn.relativePath
  };

  if (definedIn.position) {
    source.range = {
      start: {
        line: definedIn.position.line,
        ...(definedIn.position.column ? { column: definedIn.position.column } : {})
      }
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

  return "other";
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

function isPathInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
