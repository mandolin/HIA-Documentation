#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  hasConfigErrors,
  loadHiaProjectConfig,
  type HiaDocsConfig
} from "@hia-doc/config";
import {
  createBasicFixtureDocument,
  createHiaDiagnostic,
  validateHiaDocumentDetailed,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaDocument
} from "@hia-doc/core";
import { convertJSDocIntegrationToHiaDocumentDetailed } from "@hia-doc/parser-jsdoc";
import { renderHtmlDocument, type RenderHtmlOptions } from "@hia-doc/renderer-html";

const OUTPUT_MANIFEST_PATH = "hia-manifest.json";

const HELP_TEXT = `HIA Documentation CLI

Usage:
  hia --help
  hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--out <dir>] [--locale <locale>]

Commands:
  docs build   Generate HTML documentation from a HIA document fixture.

Options:
  --config <file>     HIA config JSON file. Defaults to hia.config.json when present.
  --input <file>      HIA document JSON file. Defaults to the built-in basic fixture.
  --jsdoc-integration <file>
                      JSDoc HIA Integration JSON file to convert before rendering.
  --out <dir>         Output directory. Defaults to dist/docs.
  --locale <locale>   Initial rendered locale. Defaults to the document defaultLocale.
  --manifest <file>   Output manifest path inside --out. Defaults to hia-manifest.json.
`;

export interface CliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
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
  const optionDiagnostics = validateOptionValues(argv, ["--config", "--input", "--jsdoc-integration", "--out", "--locale", "--manifest"]);
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
  const jsdocIntegrationPath = resolveOptionalConfiguredPath(
    readOption(argv, "--jsdoc-integration"),
    undefined,
    io.cwd,
    configResult.baseDir
  );
  const locale = readOption(argv, "--locale") ?? docsConfig.locale;
  const manifestPath = normalizeOutputRelativePath(readOption(argv, "--manifest") ?? docsConfig.manifest ?? OUTPUT_MANIFEST_PATH);
  const buildOptionDiagnostics = validateBuildOptions(manifestPath, inputPath, jsdocIntegrationPath);
  reportDiagnostics(buildOptionDiagnostics, io);

  if (buildOptionDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return 1;
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

function validateBuildOptions(manifestPath: string, inputPath?: string, jsdocIntegrationPath?: string): HiaDiagnostic[] {
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
