import path from "node:path";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export const HIA_PROJECT_MANIFEST_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_PROJECT_MANIFEST_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-0.1.0-draft.schema.json";
export const HIA_PROJECT_MANIFEST_INPUT_KINDS = ["hia-document", "jsdoc-integration", "htmdoc-extraction", "cssdoc-extraction", "doc-source-map"] as const;
export const HIA_PROJECT_MANIFEST_DOMAINS = ["js", "css", "html", "other"] as const;

export type HiaProjectManifestInputKind = typeof HIA_PROJECT_MANIFEST_INPUT_KINDS[number];
export type HiaProjectManifestDomain = typeof HIA_PROJECT_MANIFEST_DOMAINS[number];

export interface HiaProjectDocsManifest {
  schemaVersion?: string;
  project?: HiaProjectManifestProjectInfo;
  profiles?: HiaProjectManifestProfileRef[];
  inputs?: HiaProjectManifestInput[];
  metadata?: Record<string, unknown>;
}

export interface HiaProjectManifestProjectInfo {
  id?: string;
  name?: string;
  title?: string;
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

export interface HiaProjectManifestValidationOptions {
  targetPath?: string;
}

export const HIA_PROJECT_MANIFEST_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROJECT_MANIFEST_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "project", "inputs"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: HIA_PROJECT_MANIFEST_SCHEMA_VERSION },
    project: { $ref: "#/$defs/project" },
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
        title: { $ref: "#/$defs/nonEmptyString" }
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
  }

  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest inputs must be a non-empty array.",
      "error",
      joinTarget(targetPrefix, "inputs")
    ));
  }

  validateManifestPathEntries(value.profiles, "profiles", targetPrefix, diagnostics);
  validateManifestPathEntries(value.inputs, "inputs", targetPrefix, diagnostics);

  return diagnostics;
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
