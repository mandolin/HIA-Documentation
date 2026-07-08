import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export const HIA_CONFIG_SCHEMA_VERSION = "0.1.0";
export const HIA_CONFIG_FILE_NAMES = ["hia.config.json"] as const;
export const HIA_CONFIG_SOURCE_MODES = ["none", "file", "external"] as const;
export const HIA_CONFIG_SOURCE_OPEN_MODES = ["same-tab", "new-tab"] as const;
export const HIA_CONFIG_THEME_NAMES = ["default"] as const;

export interface HiaProjectConfig {
  schemaVersion?: string;
  docs?: HiaDocsConfig;
}

export interface HiaDocsConfig {
  input?: string;
  projectManifest?: string;
  output?: string;
  locale?: string;
  locales?: string[];
  manifest?: string;
  renderer?: HiaRendererHtmlConfig;
  theme?: HiaThemeConfig;
  source?: HiaSourceLinkConfig;
}

export interface HiaRendererHtmlConfig {
  title?: string;
  includeThemeAssets?: boolean;
}

export interface HiaThemeConfig {
  name?: string;
  skin?: string;
}

export interface HiaSourceLinkConfig {
  enabled?: boolean;
  mode?: typeof HIA_CONFIG_SOURCE_MODES[number];
  baseUrl?: string;
  openMode?: typeof HIA_CONFIG_SOURCE_OPEN_MODES[number];
}

export interface HiaConfigLoadOptions {
  cwd?: string;
  configPath?: string;
  fileNames?: readonly string[];
}

export interface HiaLoadedProjectConfig {
  config: HiaProjectConfig;
  found: boolean;
  baseDir: string;
  diagnostics: HiaDiagnostic[];
  path?: string;
}

export async function loadHiaProjectConfig(options: HiaConfigLoadOptions = {}): Promise<HiaLoadedProjectConfig> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const configPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : await findHiaConfigPath(cwd, options.fileNames || HIA_CONFIG_FILE_NAMES);

  if (!configPath) {
    return {
      config: {},
      found: false,
      baseDir: cwd,
      diagnostics: []
    };
  }

  const baseDir = path.dirname(configPath);

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const diagnostics = validateHiaProjectConfig(parsed);
    const result: HiaLoadedProjectConfig = {
      config: isRecord(parsed) ? parsed as HiaProjectConfig : {},
      found: true,
      baseDir,
      diagnostics,
      path: configPath
    };

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      config: {},
      found: true,
      baseDir,
      diagnostics: [
        createConfigDiagnostic(
          error instanceof SyntaxError ? "HIA_CONFIG_PARSE_FAILED" : "HIA_CONFIG_READ_FAILED",
          `${configPath} - ${message}`,
          "error",
          undefined,
          {
            configPath
          }
        )
      ],
      path: configPath
    };
  }
}

export async function findHiaConfigPath(cwd: string, fileNames: readonly string[] = HIA_CONFIG_FILE_NAMES): Promise<string | undefined> {
  for (const fileName of fileNames) {
    const candidate = path.resolve(cwd, fileName);

    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function validateHiaProjectConfig(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_INVALID", "HIA config must be a JSON object.", "error"));
    return diagnostics;
  }

  validateOptionalString(value, "schemaVersion", diagnostics);

  if (typeof value.schemaVersion === "string" && value.schemaVersion !== HIA_CONFIG_SCHEMA_VERSION) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SCHEMA_UNSUPPORTED",
      `Unsupported HIA config schemaVersion: ${value.schemaVersion}.`,
      "error",
      "schemaVersion"
    ));
  }

  if (value.docs !== undefined) {
    validateDocsConfig(value.docs, diagnostics, "docs");
  }

  return diagnostics;
}

export function hasConfigErrors(diagnostics: HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function validateDocsConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_DOCS_INVALID", "docs must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "input", diagnostics, targetPath);
  validateOptionalString(value, "projectManifest", diagnostics, targetPath);
  validateOptionalString(value, "output", diagnostics, targetPath);
  validateOptionalString(value, "locale", diagnostics, targetPath);
  validateOptionalString(value, "manifest", diagnostics, targetPath);
  validateOptionalStringArray(value, "locales", diagnostics, targetPath);

  if (value.renderer !== undefined) {
    validateRendererConfig(value.renderer, diagnostics, `${targetPath}.renderer`);
  }

  if (value.theme !== undefined) {
    validateThemeConfig(value.theme, diagnostics, `${targetPath}.theme`);
  }

  if (value.source !== undefined) {
    validateSourceConfig(value.source, diagnostics, `${targetPath}.source`);
  }
}

function validateRendererConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_RENDERER_INVALID", "docs.renderer must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "title", diagnostics, targetPath);
  validateOptionalBoolean(value, "includeThemeAssets", diagnostics, targetPath);
}

function validateThemeConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_THEME_INVALID", "docs.theme must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "name", diagnostics, targetPath);
  validateOptionalString(value, "skin", diagnostics, targetPath);

  if (typeof value.name === "string" && !HIA_CONFIG_THEME_NAMES.includes(value.name as typeof HIA_CONFIG_THEME_NAMES[number])) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_THEME_UNSUPPORTED",
      `Theme "${value.name}" is not implemented yet; the default theme will be used.`,
      "warning",
      `${targetPath}.name`,
      {
        requestedTheme: value.name,
        fallbackTheme: "default"
      }
    ));
  }
}

function validateSourceConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_INVALID", "docs.source must be an object.", "error", targetPath));
    return;
  }

  validateOptionalBoolean(value, "enabled", diagnostics, targetPath);
  validateOptionalString(value, "baseUrl", diagnostics, targetPath);
  validateOptionalEnum(value, "mode", HIA_CONFIG_SOURCE_MODES, diagnostics, targetPath);
  validateOptionalEnum(value, "openMode", HIA_CONFIG_SOURCE_OPEN_MODES, diagnostics, targetPath);
}

function validateOptionalString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

function validateOptionalBoolean(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value !== undefined && typeof value !== "boolean") {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be a boolean.`, "error", targetPath));
  }
}

function validateOptionalStringArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value === undefined) {
    return;
  }

  const targetPath = prefix ? `${prefix}.${field}` : field;

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be an array of non-empty strings.`, "error", targetPath));
  }
}

function validateOptionalEnum(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix = ""
): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_FIELD_INVALID",
      `${targetPath} must be one of: ${allowed.join(", ")}.`,
      "error",
      targetPath
    ));
  }
}

function createConfigDiagnostic(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}
