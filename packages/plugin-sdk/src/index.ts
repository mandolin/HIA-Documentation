import path from "node:path";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";
import {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION
} from "./constants.js";

export {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION
} from "./constants.js";
export {
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA
} from "./schema.js";

export type DocumentationProducerStatus = "success" | "partial" | "failed";

export interface DocumentationProducerCapabilities {
  incremental: boolean;
  sourceLinkage: boolean;
  watch: boolean;
}

export interface DocumentationProducerDescriptor {
  capabilities: DocumentationProducerCapabilities;
  contract: typeof DOCUMENTATION_PRODUCER_CONTRACT;
  contractVersion: typeof DOCUMENTATION_PRODUCER_CONTRACT_VERSION;
  displayName: string;
  id: string;
  inputKinds: string[];
  outputKinds: string[];
  version: string;
}

export interface DocumentationProducerInput {
  kind: string;
  language?: string;
  path: string;
}

export interface DocumentationProducerRequest {
  inputs: DocumentationProducerInput[];
  options?: Record<string, unknown>;
  outputDirectory: string;
  profileIds?: string[];
  workspaceRoot: string;
}

export interface DocumentationProducerProgress {
  current?: number;
  message?: string;
  phase: string;
  total?: number;
}

export interface DocumentationProducerContext {
  reportProgress?: (progress: DocumentationProducerProgress) => void;
  signal?: AbortSignal;
}

export interface DocumentationProducerArtifact {
  contract?: string;
  contractVersion?: string;
  id: string;
  kind: string;
  language?: string;
  mediaType?: string;
  path: string;
  profileIds?: string[];
}

export interface DocumentationProducerResult {
  artifacts: DocumentationProducerArtifact[];
  contract: typeof DOCUMENTATION_PRODUCER_RESULT_CONTRACT;
  contractVersion: typeof DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION;
  diagnostics: HiaDiagnostic[];
  producer: {
    id: string;
    version: string;
  };
  status: DocumentationProducerStatus;
}

export interface DocumentationProducer {
  descriptor: DocumentationProducerDescriptor;
  produce(
    request: DocumentationProducerRequest,
    context: DocumentationProducerContext
  ): Promise<DocumentationProducerResult>;
}

export interface DocumentationProducerValidationOptions {
  descriptor?: DocumentationProducerDescriptor;
  targetPath?: string;
}

const identifierPattern = /^[a-z0-9][a-z0-9._-]*$/;
const openIdentifierPattern = /^[a-z0-9][a-z0-9._/-]*$/;
const diagnosticSeverities = new Set<HiaDiagnosticSeverity>(["error", "warning", "info"]);
const resultStatuses = new Set<DocumentationProducerStatus>(["success", "partial", "failed"]);

export function defineDocumentationProducer<T extends DocumentationProducer>(producer: T): T {
  const diagnostics = validateDocumentationProducerDescriptor(producer?.descriptor);
  if (!producer || typeof producer.produce !== "function") {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_INVALID",
      "Documentation producer must provide a produce(request, context) function.",
      "error"
    ));
  }

  if (hasDocumentationProducerErrors(diagnostics)) {
    throw new TypeError(formatContractDiagnostics(diagnostics));
  }

  return producer;
}

export async function runDocumentationProducer(
  producer: DocumentationProducer,
  request: DocumentationProducerRequest,
  context: DocumentationProducerContext = {}
): Promise<DocumentationProducerResult> {
  const descriptorDiagnostics = validateDocumentationProducerDescriptor(producer?.descriptor);
  if (!producer || typeof producer.produce !== "function" || hasDocumentationProducerErrors(descriptorDiagnostics)) {
    throw new TypeError(formatContractDiagnostics([
      ...descriptorDiagnostics,
      ...(producer && typeof producer.produce === "function"
        ? []
        : [createProducerDiagnostic(
            "DOCUMENTATION_PRODUCER_INVALID",
            "Documentation producer must provide a produce(request, context) function.",
            "error"
          )])
    ]));
  }

  const requestDiagnostics = validateDocumentationProducerRequest(request, {
    descriptor: producer.descriptor
  });
  if (hasDocumentationProducerErrors(requestDiagnostics)) {
    return createFailedProducerResult(producer.descriptor, requestDiagnostics);
  }

  if (context.signal?.aborted) {
    return createFailedProducerResult(producer.descriptor, [
      createProducerDiagnostic(
        "DOCUMENTATION_PRODUCER_ABORTED",
        "Documentation producer was aborted before execution.",
        "error"
      )
    ]);
  }

  let value: unknown;
  try {
    value = await producer.produce(request, context);
  } catch (error) {
    const aborted = context.signal?.aborted || isAbortError(error);
    return createFailedProducerResult(producer.descriptor, [
      createProducerDiagnostic(
        aborted ? "DOCUMENTATION_PRODUCER_ABORTED" : "DOCUMENTATION_PRODUCER_EXECUTION_FAILED",
        aborted
          ? "Documentation producer execution was aborted."
          : `Documentation producer execution failed: ${errorMessage(error)}`,
        "error"
      )
    ]);
  }

  const resultDiagnostics = validateDocumentationProducerResult(value, {
    descriptor: producer.descriptor
  });
  if (hasDocumentationProducerErrors(resultDiagnostics)) {
    return createFailedProducerResult(producer.descriptor, resultDiagnostics);
  }

  return value as DocumentationProducerResult;
}

export function validateDocumentationProducerDescriptor(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
      "Documentation producer descriptor must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(value, [
    "contract",
    "contractVersion",
    "id",
    "version",
    "displayName",
    "inputKinds",
    "outputKinds",
    "capabilities"
  ], diagnostics, "descriptor", options.targetPath);
  validateConst(value.contract, DOCUMENTATION_PRODUCER_CONTRACT, "descriptor.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
    "descriptor.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateIdentifier(value.id, "descriptor.id", diagnostics, options.targetPath);
  validateNonEmptyString(value.version, "descriptor.version", diagnostics, options.targetPath);
  validateNonEmptyString(value.displayName, "descriptor.displayName", diagnostics, options.targetPath);
  validateIdentifierList(value.inputKinds, "descriptor.inputKinds", diagnostics, options.targetPath, true, true);
  validateIdentifierList(value.outputKinds, "descriptor.outputKinds", diagnostics, options.targetPath, true, true);
  validateCapabilities(value.capabilities, diagnostics, options.targetPath);
  return diagnostics;
}

export function validateDocumentationProducerRequest(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "Documentation producer request must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(
    value,
    ["workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"],
    diagnostics,
    "request",
    options.targetPath
  );
  validateAbsoluteRuntimePath(value.workspaceRoot, "request.workspaceRoot", diagnostics, options.targetPath);
  validateAbsoluteRuntimePath(value.outputDirectory, "request.outputDirectory", diagnostics, options.targetPath);
  validateProducerInputs(value.inputs, options.descriptor, diagnostics, options.targetPath);
  if (value.options !== undefined && (!isRecord(value.options) || !isJsonCompatible(value.options))) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "request.options must be a JSON-compatible object.",
      "request.options",
      options.targetPath
    ));
  }
  if (value.profileIds !== undefined) {
    validateIdentifierList(value.profileIds, "request.profileIds", diagnostics, options.targetPath, false);
  }
  return diagnostics;
}

export function validateDocumentationProducerResult(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "Documentation producer result must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(
    value,
    ["contract", "contractVersion", "producer", "status", "artifacts", "diagnostics"],
    diagnostics,
    "result",
    options.targetPath
  );
  validateConst(value.contract, DOCUMENTATION_PRODUCER_RESULT_CONTRACT, "result.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    "result.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateProducerIdentity(value.producer, options.descriptor, diagnostics, options.targetPath);
  const status = typeof value.status === "string" && resultStatuses.has(value.status as DocumentationProducerStatus)
    ? value.status as DocumentationProducerStatus
    : undefined;
  if (!status) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.status must be success, partial or failed.",
      "result.status",
      options.targetPath
    ));
  }

  const artifacts = validateProducerArtifacts(value.artifacts, options.descriptor, diagnostics, options.targetPath);
  const resultDiagnostics = validateResultDiagnostics(value.diagnostics, diagnostics, options.targetPath);
  if (status) {
    validateResultStatusSemantics(status, artifacts, resultDiagnostics, diagnostics, options.targetPath);
  }
  return diagnostics;
}

export function hasDocumentationProducerErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function validateCapabilities(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
      "descriptor.capabilities must be an object.",
      "descriptor.capabilities",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["sourceLinkage", "incremental", "watch"], diagnostics, "descriptor.capabilities", targetPath);
  for (const field of ["sourceLinkage", "incremental", "watch"] as const) {
    if (typeof value[field] !== "boolean") {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
        `descriptor.capabilities.${field} must be boolean.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
  for (const field of ["incremental", "watch"] as const) {
    if (value[field] === true) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_CAPABILITY_UNSUPPORTED",
        `P1 documentation producer runtime does not support ${field}.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
}

function validateProducerInputs(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "request.inputs must be a non-empty array.",
      "request.inputs",
      targetPath
    ));
    return;
  }

  value.forEach((input, index) => {
    const fieldPath = `request.inputs[${index}]`;
    if (!isRecord(input)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateKnownFields(input, ["kind", "path", "language"], diagnostics, fieldPath, targetPath);
    validateOpenIdentifier(input.kind, `${fieldPath}.kind`, diagnostics, targetPath);
    if (typeof input.kind === "string" && descriptor && !descriptor.inputKinds.includes(input.kind)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_INPUT_KIND_UNSUPPORTED",
        `${fieldPath}.kind is not declared by producer ${descriptor.id}.`,
        `${fieldPath}.kind`,
        targetPath
      ));
    }
    validateSafeRelativePath(input.path, `${fieldPath}.path`, diagnostics, targetPath);
    if (input.language !== undefined) {
      validateNonEmptyString(input.language, `${fieldPath}.language`, diagnostics, targetPath);
    }
  });
}

function validateProducerIdentity(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.producer must be an object.",
      "result.producer",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["id", "version"], diagnostics, "result.producer", targetPath);
  validateIdentifier(value.id, "result.producer.id", diagnostics, targetPath);
  validateNonEmptyString(value.version, "result.producer.version", diagnostics, targetPath);
  if (descriptor && (value.id !== descriptor.id || value.version !== descriptor.version)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_IDENTITY_MISMATCH",
      "result.producer must match the executed producer descriptor.",
      "result.producer",
      targetPath
    ));
  }
}

function validateProducerArtifacts(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocumentationProducerArtifact[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.artifacts must be an array.",
      "result.artifacts",
      targetPath
    ));
    return [];
  }
  const validArtifacts: DocumentationProducerArtifact[] = [];
  const ids = new Set<string>();
  value.forEach((artifact, index) => {
    const fieldPath = `result.artifacts[${index}]`;
    if (!isRecord(artifact)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_ARTIFACT_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateKnownFields(
      artifact,
      ["id", "kind", "path", "contract", "contractVersion", "language", "mediaType", "profileIds"],
      diagnostics,
      fieldPath,
      targetPath
    );
    validateIdentifier(artifact.id, `${fieldPath}.id`, diagnostics, targetPath);
    validateOpenIdentifier(artifact.kind, `${fieldPath}.kind`, diagnostics, targetPath);
    validateSafeRelativePath(artifact.path, `${fieldPath}.path`, diagnostics, targetPath);
    if (typeof artifact.id === "string") {
      if (ids.has(artifact.id)) {
        diagnostics.push(createFieldDiagnostic(
          "DOCUMENTATION_PRODUCER_ARTIFACT_DUPLICATE",
          `Duplicate artifact id ${artifact.id}.`,
          `${fieldPath}.id`,
          targetPath
        ));
      }
      ids.add(artifact.id);
    }
    if (typeof artifact.kind === "string" && descriptor && !descriptor.outputKinds.includes(artifact.kind)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_OUTPUT_KIND_UNDECLARED",
        `${fieldPath}.kind is not declared by producer ${descriptor.id}.`,
        `${fieldPath}.kind`,
        targetPath
      ));
    }
    validateOptionalStringPair(artifact, "contract", "contractVersion", fieldPath, diagnostics, targetPath);
    for (const field of ["language", "mediaType"] as const) {
      if (artifact[field] !== undefined) {
        validateNonEmptyString(artifact[field], `${fieldPath}.${field}`, diagnostics, targetPath);
      }
    }
    if (artifact.profileIds !== undefined) {
      validateIdentifierList(artifact.profileIds, `${fieldPath}.profileIds`, diagnostics, targetPath, false);
    }
    validArtifacts.push(artifact as unknown as DocumentationProducerArtifact);
  });
  return validArtifacts;
}

function validateResultDiagnostics(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.diagnostics must be an array.",
      "result.diagnostics",
      targetPath
    ));
    return [];
  }
  const validDiagnostics: HiaDiagnostic[] = [];
  value.forEach((diagnostic, index) => {
    const fieldPath = `result.diagnostics[${index}]`;
    if (!isRecord(diagnostic)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateKnownFields(diagnostic, ["code", "message", "severity", "data", "path", "targetPath"], diagnostics, fieldPath, targetPath);
    validateNonEmptyString(diagnostic.code, `${fieldPath}.code`, diagnostics, targetPath);
    validateNonEmptyString(diagnostic.message, `${fieldPath}.message`, diagnostics, targetPath);
    if (typeof diagnostic.severity !== "string" || !diagnosticSeverities.has(diagnostic.severity as HiaDiagnosticSeverity)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath}.severity must be error, warning or info.`,
        `${fieldPath}.severity`,
        targetPath
      ));
    }
    if (diagnostic.data !== undefined && (!isRecord(diagnostic.data) || !isJsonCompatible(diagnostic.data))) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath}.data must be a JSON-compatible object.`,
        `${fieldPath}.data`,
        targetPath
      ));
    }
    for (const pathField of ["path", "targetPath"] as const) {
      if (diagnostic[pathField] !== undefined) {
        validateSafeRelativePath(diagnostic[pathField], `${fieldPath}.${pathField}`, diagnostics, targetPath);
      }
    }
    validDiagnostics.push(diagnostic as unknown as HiaDiagnostic);
  });
  return validDiagnostics;
}

function validateResultStatusSemantics(
  status: DocumentationProducerStatus,
  artifacts: DocumentationProducerArtifact[],
  resultDiagnostics: HiaDiagnostic[],
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  const hasErrors = resultDiagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (status === "success" && (artifacts.length === 0 || hasErrors)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A success result requires at least one artifact and no error diagnostics.",
      "result.status",
      targetPath
    ));
  }
  if (status === "partial" && (artifacts.length === 0 || resultDiagnostics.length === 0)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A partial result requires at least one artifact and one diagnostic.",
      "result.status",
      targetPath
    ));
  }
  if (status === "failed" && (artifacts.length > 0 || !hasErrors)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A failed result must contain no artifacts and at least one error diagnostic.",
      "result.status",
      targetPath
    ));
  }
}

function createFailedProducerResult(
  descriptor: DocumentationProducerDescriptor,
  diagnostics: HiaDiagnostic[]
): DocumentationProducerResult {
  return {
    contract: DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    producer: {
      id: descriptor.id,
      version: descriptor.version
    },
    status: "failed",
    artifacts: [],
    diagnostics
  };
}

function validateOptionalStringPair(
  record: Record<string, unknown>,
  first: string,
  second: string,
  prefix: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if ((record[first] === undefined) !== (record[second] === undefined)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_ARTIFACT_INVALID",
      `${prefix}.${first} and ${prefix}.${second} must be declared together.`,
      prefix,
      targetPath
    ));
    return;
  }
  if (record[first] !== undefined) {
    validateNonEmptyString(record[first], `${prefix}.${first}`, diagnostics, targetPath);
    validateNonEmptyString(record[second], `${prefix}.${second}`, diagnostics, targetPath);
  }
}

function validateKnownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix: string,
  targetPath?: string
): void {
  const allowedFields = new Set(allowed);
  for (const field of Object.keys(record)) {
    if (!allowedFields.has(field)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_FIELD_UNKNOWN",
        `${prefix}.${field} is not part of the P1 contract.`,
        `${prefix}.${field}`,
        targetPath
      ));
    }
  }
}

function validateIdentifierList(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined,
  requireNonEmpty: boolean,
  allowSlash = false
): void {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be ${requireNonEmpty ? "a non-empty" : "an"} array.`,
      fieldPath,
      targetPath
    ));
    return;
  }
  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (allowSlash) {
      validateOpenIdentifier(item, `${fieldPath}[${index}]`, diagnostics, targetPath);
    } else {
      validateIdentifier(item, `${fieldPath}[${index}]`, diagnostics, targetPath);
    }
    if (typeof item === "string") {
      if (ids.has(item)) {
        diagnostics.push(createFieldDiagnostic(
          "DOCUMENTATION_PRODUCER_FIELD_INVALID",
          `${fieldPath} contains duplicate value ${item}.`,
          `${fieldPath}[${index}]`,
          targetPath
        ));
      }
      ids.add(item);
    }
  });
}

function validateIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a lower-case identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateOpenIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !openIdentifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a lower-case kind identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateNonEmptyString(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a non-empty string.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateConst(
  value: unknown,
  expected: string,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (value !== expected) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_CONTRACT_UNSUPPORTED",
      `${fieldPath} must be ${expected}.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateAbsoluteRuntimePath(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (typeof value !== "string" || (!path.posix.isAbsolute(value) && !path.win32.isAbsolute(value))) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RUNTIME_PATH_INVALID",
      `${fieldPath} must be an absolute runtime path.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateSafeRelativePath(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (typeof value !== "string" || !isSafeRelativePath(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_PATH_UNSAFE",
      `${fieldPath} must be a safe relative path.`,
      fieldPath,
      targetPath
    ));
  }
}

function isSafeRelativePath(value: string): boolean {
  if (!value || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    return false;
  }
  const normalized = value.replaceAll("\\", "/");
  return !normalized.startsWith("//") &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized) &&
    !normalized.split("/").includes("..");
}

function isJsonCompatible(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    const compatible = value.every((item) => isJsonCompatible(item, seen));
    seen.delete(value);
    return compatible;
  }
  if (isRecord(value)) {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    const compatible = Object.values(value).every((item) => isJsonCompatible(item, seen));
    seen.delete(value);
    return compatible;
  }
  return false;
}

function createFieldDiagnostic(
  code: string,
  message: string,
  fieldPath: string,
  targetPath?: string
): HiaDiagnostic {
  return createProducerDiagnostic(code, message, "error", targetPath, { fieldPath });
}

function createProducerDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: Record<string, unknown>
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, {
    ...(data ? { data } : {}),
    ...(targetPath ? { targetPath } : {})
  });
}

function formatContractDiagnostics(diagnostics: readonly HiaDiagnostic[]): string {
  return diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n");
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
