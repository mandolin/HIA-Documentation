import path from "node:path";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export const HIA_PROJECT_MANIFEST_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_PROJECT_MANIFEST_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-0.1.0-draft.schema.json";
export const HIA_PROJECT_MANIFEST_INPUT_KINDS = ["hia-document", "jsdoc-integration", "htmdoc-extraction", "cssdoc-extraction", "doc-source-map"] as const;
export const HIA_PROJECT_MANIFEST_DOMAINS = ["js", "css", "html", "dotnet", "other"] as const;

export type HiaProjectManifestInputKind = typeof HIA_PROJECT_MANIFEST_INPUT_KINDS[number];
export type HiaProjectManifestDomain = typeof HIA_PROJECT_MANIFEST_DOMAINS[number];

export interface HiaProjectDocsManifest {
  schemaVersion?: string;
  project?: HiaProjectManifestProjectInfo;
  producers?: HiaProjectManifestProducerRef[];
  profiles?: HiaProjectManifestProfileRef[];
  inputs?: HiaProjectManifestInput[];
  metadata?: Record<string, unknown>;
}

export interface HiaProjectManifestProjectInfo {
  id?: string;
  name?: string;
  title?: string;
  /**
   * 项目文档的默认展示语言；必须出现在 locales 中。
   * Default display locale for project documentation; it must be included in locales.
   */
  defaultLocale?: string;
  /**
   * 项目聚合页可切换的语言集合。
   * Locale set available to a project aggregation page.
   */
  locales?: string[];
}

export interface HiaProjectManifestProfileRef {
  profileId?: string;
  profileVersion?: string;
  layer?: string;
  path?: string;
}

export interface HiaProjectManifestInputProfileRef {
  profileId: string;
  profileVersion?: string;
  layer?: string;
}

export interface HiaProjectManifestInput {
  kind?: HiaProjectManifestInputKind | string;
  path?: string;
  domain?: HiaProjectManifestDomain;
  profile?: HiaProjectManifestInputProfileRef;
  sourceRoot?: string;
}

export interface HiaProjectManifestProducerInput {
  kind?: string;
  language?: string;
  path?: string;
}

export interface HiaProjectManifestProducerRef {
  exportName?: string;
  failureMode?: "fail" | "warn";
  id?: string;
  inputs?: HiaProjectManifestProducerInput[];
  module?: string;
  options?: Record<string, unknown>;
  outputDirectory?: string;
  profileIds?: string[];
  workspaceRoot?: string;
}

export interface HiaProjectManifestValidationOptions {
  targetPath?: string;
}

export const HIA_PROJECT_MANIFEST_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROJECT_MANIFEST_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "project"],
  additionalProperties: true,
  anyOf: [
    {
      required: ["inputs"],
      properties: {
        inputs: { type: "array", minItems: 1 }
      }
    },
    {
      required: ["producers"],
      properties: {
        producers: { type: "array", minItems: 1 }
      }
    }
  ],
  properties: {
    schemaVersion: { const: HIA_PROJECT_MANIFEST_SCHEMA_VERSION },
    project: { $ref: "#/$defs/project" },
    producers: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/producer" }
    },
    profiles: {
      type: "array",
      items: { $ref: "#/$defs/profileRef" }
    },
    inputs: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/input" }
    },
    metadata: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    safeRelativePath: {
      type: "string",
      minLength: 1,
      not: {
        anyOf: [
          { const: "." },
          { const: ".." },
          { pattern: "^(?:[A-Za-z]:|/|\\\\\\\\|[A-Za-z][A-Za-z0-9+.-]*:)" },
          { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
        ]
      }
    },
    project: {
      type: "object",
      required: ["name"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        name: { $ref: "#/$defs/nonEmptyString" },
        title: { $ref: "#/$defs/nonEmptyString" },
        defaultLocale: { $ref: "#/$defs/nonEmptyString" },
        locales: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    profileRef: {
      type: "object",
      additionalProperties: true,
      properties: {
        profileId: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        layer: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    inputProfileRef: {
      type: "object",
      required: ["profileId"],
      additionalProperties: true,
      properties: {
        profileId: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        layer: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    producerInput: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        language: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    producer: {
      type: "object",
      required: ["id", "module", "inputs"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        module: { $ref: "#/$defs/safeRelativePath" },
        exportName: { $ref: "#/$defs/nonEmptyString" },
        failureMode: { enum: ["fail", "warn"] },
        workspaceRoot: { $ref: "#/$defs/safeRelativePath" },
        outputDirectory: { $ref: "#/$defs/safeRelativePath" },
        inputs: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/producerInput" }
        },
        options: { type: "object" },
        profileIds: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    input: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      properties: {
        kind: { enum: [...HIA_PROJECT_MANIFEST_INPUT_KINDS] },
        path: { $ref: "#/$defs/safeRelativePath" },
        domain: { enum: [...HIA_PROJECT_MANIFEST_DOMAINS] },
        profile: { $ref: "#/$defs/inputProfileRef" },
        sourceRoot: { $ref: "#/$defs/safeRelativePath" }
      }
    }
  }
} as const;

export function validateHiaProjectManifest(value: unknown, options: HiaProjectManifestValidationOptions = {}): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  const targetPrefix = options.targetPath;

  if (!isRecord(value)) {
    return [
      createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_INVALID", "Project docs manifest must be a JSON object.", "error", targetPrefix)
    ];
  }

  if (value.schemaVersion !== HIA_PROJECT_MANIFEST_SCHEMA_VERSION) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_SCHEMA_UNSUPPORTED",
      `Project docs manifest schemaVersion must be ${HIA_PROJECT_MANIFEST_SCHEMA_VERSION}.`,
      "error",
      joinTarget(targetPrefix, "schemaVersion")
    ));
  }

  if (!isRecord(value.project) || typeof value.project.name !== "string" || value.project.name.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.name must be a non-empty string.",
      "error",
      joinTarget(targetPrefix, "project.name")
    ));
  } else {
    validateProjectLocales(value.project, targetPrefix, diagnostics);
  }

  const hasInputs = Array.isArray(value.inputs) && value.inputs.length > 0;
  const hasProducers = Array.isArray(value.producers) && value.producers.length > 0;

  if (!hasInputs && !hasProducers) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest must declare at least one input or producer.",
      "error",
      joinTarget(targetPrefix, "inputs")
    ));
  }

  validateManifestPathEntries(value.profiles, "profiles", targetPrefix, diagnostics);
  validateManifestPathEntries(value.inputs, "inputs", targetPrefix, diagnostics);
  validateProducerEntries(value.producers, targetPrefix, diagnostics);

  return diagnostics;
}

/**
 * 校验 project 级 locale 声明，防止 renderer 收到无法解析的语言模型。
 * Validates project-level locale declarations before the renderer receives an unresolved locale model.
 */
function validateProjectLocales(
  project: Record<string, unknown>,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  const defaultLocale = project.defaultLocale;
  const locales = project.locales;

  if (defaultLocale !== undefined && (typeof defaultLocale !== "string" || defaultLocale.length === 0)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.defaultLocale must be a non-empty string when provided.",
      "error",
      joinTarget(targetPrefix, "project.defaultLocale")
    ));
  }

  if (locales !== undefined && (!Array.isArray(locales)
    || locales.length === 0
    || locales.some((locale) => typeof locale !== "string" || locale.length === 0))) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.locales must be a non-empty array of non-empty strings when provided.",
      "error",
      joinTarget(targetPrefix, "project.locales")
    ));
    return;
  }

  if (typeof defaultLocale === "string" && Array.isArray(locales) && !locales.includes(defaultLocale)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.defaultLocale must be included in project.locales.",
      "error",
      joinTarget(targetPrefix, "project.defaultLocale")
    ));
  }
}

function validateProducerEntries(value: unknown, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest producers must be an array.",
      "error",
      joinTarget(targetPrefix, "producers")
    ));
    return;
  }

  if (value.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest producers must be a non-empty array when provided.",
      "error",
      joinTarget(targetPrefix, "producers")
    ));
    return;
  }

  value.forEach((item, index) => {
    const itemPath = `producers.${index}`;
    if (!isRecord(item)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath} must be an object.`,
        "error",
        joinTarget(targetPrefix, itemPath)
      ));
      return;
    }

    validateRequiredString(item, "id", itemPath, targetPrefix, diagnostics);
    validateSafeOptionalPath(item, "module", itemPath, targetPrefix, diagnostics, true);
    validateSafeOptionalPath(item, "workspaceRoot", itemPath, targetPrefix, diagnostics, false);
    validateSafeOptionalPath(item, "outputDirectory", itemPath, targetPrefix, diagnostics, false);

    if (item.failureMode !== undefined && item.failureMode !== "fail" && item.failureMode !== "warn") {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath}.failureMode must be "fail" or "warn".`,
        "error",
        joinTarget(targetPrefix, `${itemPath}.failureMode`)
      ));
    }

    if (!Array.isArray(item.inputs) || item.inputs.length === 0) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath}.inputs must be a non-empty array.`,
        "error",
        joinTarget(targetPrefix, `${itemPath}.inputs`)
      ));
      return;
    }

    item.inputs.forEach((input, inputIndex) => {
      const inputPath = `${itemPath}.inputs.${inputIndex}`;
      if (!isRecord(input)) {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${inputPath} must be an object.`,
          "error",
          joinTarget(targetPrefix, inputPath)
        ));
        return;
      }

      validateRequiredString(input, "kind", inputPath, targetPrefix, diagnostics);
      validateSafeOptionalPath(input, "path", inputPath, targetPrefix, diagnostics, true);
    });
  });
}

function validateRequiredString(
  item: Record<string, unknown>,
  field: string,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  if (typeof item[field] !== "string" || String(item[field]).length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      `Project docs manifest ${itemPath}.${field} must be a non-empty string.`,
      "error",
      joinTarget(targetPrefix, `${itemPath}.${field}`)
    ));
  }
}

function validateSafeOptionalPath(
  item: Record<string, unknown>,
  field: string,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[],
  required: boolean
): void {
  const value = item[field];
  if (value === undefined && !required) {
    return;
  }

  if (typeof value !== "string" || value.length === 0 || isUnsafeRelativePath(value)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_PATH_INVALID",
      `Project docs manifest ${itemPath}.${field} must be a safe relative path.`,
      "error",
      joinTarget(targetPrefix, `${itemPath}.${field}`)
    ));
  }
}

function validateManifestPathEntries(value: unknown, field: "profiles" | "inputs", targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      `Project docs manifest ${field} must be an array.`,
      "error",
      joinTarget(targetPrefix, field)
    ));
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${field}.${index} must be an object.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}`)
      ));
      return;
    }

    if (field === "inputs" && (typeof item.kind !== "string" || item.kind.length === 0)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${field}.${index}.kind must be a non-empty string.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}.kind`)
      ));
    }

    if (typeof item.path !== "string" || item.path.length === 0 || isUnsafeRelativePath(item.path)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_PATH_INVALID",
        `Project docs manifest ${field}.${index}.path must be a safe relative path.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}.path`)
      ));
    }
  });
}

function isUnsafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

function createProjectManifestDiagnostic(
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

function joinTarget(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
