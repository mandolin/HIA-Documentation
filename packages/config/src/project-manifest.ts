import path from "node:path";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export const HIA_PROJECT_MANIFEST_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_PROJECT_MANIFEST_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-0.1.0-draft.schema.json";
export const HIA_PROJECT_MANIFEST_INPUT_KINDS = ["hia-document", "jsdoc-integration", "htmdoc-extraction", "cssdoc-extraction", "doc-source-map", "documentation-producer-result"] as const;
export const HIA_PROJECT_MANIFEST_DOMAINS = ["js", "css", "html", "dotnet", "powershell", "other"] as const;
export const HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES = ["all", "relations-only"] as const;
/** Manifest 可声明的中性 semantic path segment kinds。Neutral semantic-path segment kinds available to manifests. */
export const HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS = [
  "repository",
  "package",
  "layer",
  "contract",
  "operation",
  "project",
  "assembly",
  "namespace",
  "type"
] as const;

export type HiaProjectManifestInputKind = typeof HIA_PROJECT_MANIFEST_INPUT_KINDS[number];
export type HiaProjectManifestDomain = typeof HIA_PROJECT_MANIFEST_DOMAINS[number];
export type HiaProjectManifestArtifactPolicy = typeof HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES[number];
export type HiaProjectManifestSemanticPathKind = typeof HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS[number];

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
  /** 产品版本只作为 topic metadata，不建立版本路由。Product version is topic metadata only and does not create version routing. */
  productVersion?: string;
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
  /**
   * 控制 producer result 中哪些 artifact 参与项目聚合；relations-only 只消费关系增强产物。
   * Controls which producer-result artifacts join project aggregation; relations-only consumes relation augmentation only.
   */
  artifactPolicy?: HiaProjectManifestArtifactPolicy;
  /**
   * owner-reviewed 的中性导航前缀；renderer 不从 source/container path 猜测它。
   * Owner-reviewed neutral navigation prefix; the renderer never guesses it from source or container paths.
   */
  semanticPath?: HiaProjectManifestSemanticPathSegment[];
}

/** Manifest input 中单个稳定、公开且无路径语义的 semantic segment。One stable, public, path-free semantic segment in a manifest input. */
export interface HiaProjectManifestSemanticPathSegment {
  kind: HiaProjectManifestSemanticPathKind;
  id: string;
  label: string;
}

export interface HiaProjectManifestProducerInput {
  kind?: string;
  language?: string;
  path?: string;
  [key: string]: unknown;
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
    currentOrSafeRelativePath: {
      type: "string",
      minLength: 1,
      not: {
        anyOf: [
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
        productVersion: { $ref: "#/$defs/nonEmptyString" },
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
        path: { $ref: "#/$defs/safeRelativePath" },
        applicationRoot: { $ref: "#/$defs/currentOrSafeRelativePath" },
        artifactBasePath: { $ref: "#/$defs/safeRelativePath" },
        hiaDocumentId: { $ref: "#/$defs/nonEmptyString" },
        title: { $ref: "#/$defs/nonEmptyString" }
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
        workspaceRoot: { $ref: "#/$defs/currentOrSafeRelativePath" },
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
        sourceRoot: { $ref: "#/$defs/safeRelativePath" },
        artifactPolicy: { enum: [...HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES] },
        semanticPath: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/semanticPathSegment" }
        }
      }
    },
    semanticPathSegment: {
      type: "object",
      required: ["kind", "id", "label"],
      additionalProperties: false,
      properties: {
        kind: { enum: [...HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS] },
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$" },
        label: { type: "string", minLength: 1, maxLength: 160 }
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
    if (value.project.productVersion !== undefined
      && (typeof value.project.productVersion !== "string" || value.project.productVersion.length === 0)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        "Project docs manifest project.productVersion must be a non-empty string when provided.",
        "error",
        joinTarget(targetPrefix, "project.productVersion")
      ));
    }
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
    validateSafeOptionalPath(item, "workspaceRoot", itemPath, targetPrefix, diagnostics, false, true);
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
      validatePathLikeExtensionFields(input, inputPath, targetPrefix, diagnostics);
    });
  });
}

function validatePathLikeExtensionFields(
  item: Record<string, unknown>,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  for (const field of Object.keys(item)) {
    if (field === "path" || !isPathLikeFieldName(field)) {
      continue;
    }

    validateSafeOptionalPath(item, field, itemPath, targetPrefix, diagnostics, true, field.toLowerCase().endsWith("root"));
  }
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
  required: boolean,
  allowCurrentDirectory = false
): void {
  const value = item[field];
  if (value === undefined && !required) {
    return;
  }

  if (typeof value !== "string" || value.length === 0 || isUnsafeRelativePath(value, allowCurrentDirectory)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_PATH_INVALID",
      `Project docs manifest ${itemPath}.${field} must be a safe relative path.`,
      "error",
      joinTarget(targetPrefix, `${itemPath}.${field}`)
    ));
  }
}

function isPathLikeFieldName(field: string): boolean {
  return /(?:path|root|directory)$/iu.test(field);
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

    if (field === "inputs" && item.artifactPolicy !== undefined) {
      if (!HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES.includes(item.artifactPolicy as HiaProjectManifestArtifactPolicy)) {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${field}.${index}.artifactPolicy must be "all" or "relations-only".`,
          "error",
          joinTarget(targetPrefix, `${field}.${index}.artifactPolicy`)
        ));
      } else if (item.artifactPolicy === "relations-only" && item.kind !== "documentation-producer-result") {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${field}.${index}.artifactPolicy "relations-only" is only valid for documentation-producer-result inputs.`,
          "error",
          joinTarget(targetPrefix, `${field}.${index}.artifactPolicy`)
        ));
      }
    }

    if (field === "inputs" && item.semanticPath !== undefined) {
      validateSemanticPath(item.semanticPath, `${field}.${index}.semanticPath`, targetPrefix, diagnostics);
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

/**
 * 校验 manifest-only semantic path 的闭集、稳定 id 与公开 label 隐私边界。
 * Validates the closed semantic path vocabulary, stable ids, and public-label privacy boundary.
 */
function validateSemanticPath(
  value: unknown,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
      `Project docs manifest ${itemPath} must be a non-empty array.`,
      "error",
      joinTarget(targetPrefix, itemPath)
    ));
    return;
  }

  const seenIds = new Set<string>();
  value.forEach((segment, index) => {
    const segmentPath = `${itemPath}.${index}`;
    if (!isRecord(segment)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
        `Project docs manifest ${segmentPath} must be an object.`,
        "error",
        joinTarget(targetPrefix, segmentPath)
      ));
      return;
    }

    // <lang zh-CN>segment 是 closed-world contract，避免 path/private extension 旁路进入公开索引。</lang>
    // <lang en>A segment is closed-world so path/private extensions cannot bypass the public index boundary.</lang>
    const fields = Object.keys(segment);
    const hasUnknownField = fields.some((field) => field !== "kind" && field !== "id" && field !== "label");
    const id = typeof segment.id === "string" ? segment.id : "";
    const label = typeof segment.label === "string" ? segment.label : "";
    const kind = segment.kind;
    const idValid = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(id);
    const labelValid = isSafeSemanticLabel(label);
    const kindValid = HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS.includes(kind as HiaProjectManifestSemanticPathKind);

    if (hasUnknownField || !kindValid || !idValid || !labelValid || seenIds.has(id)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
        `Project docs manifest ${segmentPath} must contain unique, safe kind/id/label fields.`,
        "error",
        joinTarget(targetPrefix, segmentPath)
      ));
    }
    if (id) {
      seenIds.add(id);
    }
  });
}

/** Public label 可含 npm display slash，但不能像绝对路径、URI 或 traversal。Public labels may contain npm display slashes but not absolute paths, URIs, or traversal. */
function isSafeSemanticLabel(value: string): boolean {
  if (!value || value.length > 160 || /[\u0000-\u001F\u007F]/u.test(value)) {
    return false;
  }
  const normalized = value.replaceAll("\\", "/");
  return !normalized.includes("../")
    && normalized !== ".."
    && !normalized.startsWith("/")
    && !path.win32.isAbsolute(value)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(normalized);
}

function isUnsafeRelativePath(value: string, allowCurrentDirectory = false): boolean {
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || (!allowCurrentDirectory && normalized === ".")
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
