#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createBasicFixtureDocument,
  validateHiaDocumentDetailed,
  type HiaDiagnostic,
  type HiaDocument
} from "@hia-doc/core";
import { renderHtmlDocument } from "@hia-doc/renderer-html";

const OUTPUT_MANIFEST_PATH = "hia-manifest.json";

const HELP_TEXT = `HIA Documentation CLI

Usage:
  hia --help
  hia docs build [--input <file>] [--out <dir>] [--locale <locale>]

Commands:
  docs build   Generate HTML documentation from a HIA document fixture.

Options:
  --input <file>      HIA document JSON file. Defaults to the built-in basic fixture.
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
  const outputDir = path.resolve(io.cwd, readOption(argv, "--out") ?? "dist/docs");
  const inputPath = readOption(argv, "--input");
  const locale = readOption(argv, "--locale");
  const manifestPath = readOption(argv, "--manifest") ?? OUTPUT_MANIFEST_PATH;
  const documentResult = await loadDocument(inputPath ? path.resolve(io.cwd, inputPath) : "", io);

  if (!documentResult.document) {
    return 1;
  }

  const validation = validateHiaDocumentDetailed(documentResult.document);
  reportDiagnostics(validation.diagnostics, io);

  if (!validation.valid) {
    return 1;
  }

  const rendered = renderHtmlDocument(documentResult.document, locale ? { locale } : {});
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

async function loadDocument(inputPath: string, io: CliIo): Promise<{ document?: HiaDocument }> {
  if (!inputPath) {
    return { document: createBasicFixtureDocument() };
  }

  try {
    const content = await readFile(inputPath, "utf8");
    return { document: JSON.parse(content) as HiaDocument };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`[error:HIA_INPUT_READ_FAILED] ${inputPath} - ${message}`);
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

function readOption(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1];
  return value && !value.startsWith("-") ? value : undefined;
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
