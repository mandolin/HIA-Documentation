import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";
import {
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION
} from "./constants.js";

export {
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_ID,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_VERSION,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_REQUEST_SCHEMA_ID,
  HIA_PROVIDER_REQUEST_SCHEMA_VERSION,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_SCHEMA_ID,
  HIA_PROVIDER_RESULT_SCHEMA_VERSION
} from "./constants.js";
export {
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA,
  HIA_PROVIDER_REQUEST_JSON_SCHEMA,
  HIA_PROVIDER_RESULT_JSON_SCHEMA
} from "./schema.js";

export type HiaProviderRuntimeKind = "deterministic-mock" | "local" | "remote-api" | "host-provided";
export type HiaProviderNetworkAccess = "disabled";
export type HiaProviderOutputKind = "draft-text" | "review-metadata" | "refusal" | "diagnostic";
export type HiaProviderResultStatus = "success" | "partial" | "refused" | "failed";
export type HiaProviderDraftFormat = "plain-text" | "markdown-snippet";
export type HiaProviderRiskLevel = "low" | "medium" | "high";

export interface HiaProviderCapabilities {
  draftText: boolean;
  networkAccess: HiaProviderNetworkAccess;
  reviewMetadata: boolean;
  sourceBodyInput: false;
  targetRepositoryMutation: false;
  toolExecution: false;
  workspaceWrite: false;
}

export interface HiaProviderReviewOnlyPolicy {
  allowSourceBody: false;
  allowTargetRepositoryMutation: false;
  allowToolExecution: false;
  allowWorkspaceWrite: false;
  requiresHumanReview: true;
  sourceExcerptPolicy: "none";
  sourcesContentPolicy: "none";
}

export interface HiaProviderDescriptor {
  acceptedInputContracts: string[];
  capabilities: HiaProviderCapabilities;
  contract: typeof HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT;
  contractVersion: typeof HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION;
  displayName: string;
  id: string;
  outputKinds: HiaProviderOutputKind[];
  policies: HiaProviderReviewOnlyPolicy;
  runtimeKind: HiaProviderRuntimeKind;
  version: string;
}

export interface HiaProviderContextPackageRef {
  contract: string;
  contractVersion: string;
  packageId: string;
  sourceExcerptPolicy: "none";
}

export interface HiaProviderRequestInput {
  aiContextPackageRef?: HiaProviderContextPackageRef;
  locales?: string[];
  profileIds?: string[];
  reviewItemIds?: string[];
  reviewPayload?: Record<string, unknown>;
}

export interface HiaProviderRequest {
  contract: typeof HIA_PROVIDER_REQUEST_CONTRACT;
  contractVersion: typeof HIA_PROVIDER_REQUEST_CONTRACT_VERSION;
  input: HiaProviderRequestInput;
  policies: HiaProviderReviewOnlyPolicy;
  providerId: string;
  requestId: string;
}

export interface HiaProviderDraftTarget {
  kind: string;
  locale?: string;
  reviewItemId?: string;
}

export interface HiaProviderDraftTextOutput {
  format: HiaProviderDraftFormat;
  id: string;
  kind: "draft-text";
  locale?: string;
  proposalId: string;
  target?: HiaProviderDraftTarget;
  text: string;
}

export interface HiaProviderReviewMetadataOutput {
  id: string;
  kind: "review-metadata";
  notes?: string[];
  proposalId?: string;
  qualitySignals: string[];
  riskLevel: HiaProviderRiskLevel;
}

export interface HiaProviderRefusalOutput {
  id: string;
  kind: "refusal";
  message: string;
  reasonCode: string;
}

export interface HiaProviderDiagnosticOutput {
  code: string;
  id: string;
  kind: "diagnostic";
  message: string;
  severity: HiaDiagnosticSeverity;
}

export type HiaProviderOutput =
  | HiaProviderDraftTextOutput
  | HiaProviderReviewMetadataOutput
  | HiaProviderRefusalOutput
  | HiaProviderDiagnosticOutput;

export interface HiaProviderProvenance {
  deterministic: boolean;
  generatedAt: string;
  model?: {
    name: string;
    provider: string;
    version?: string;
  };
  providerId: string;
  providerVersion: string;
  runtimeKind: HiaProviderRuntimeKind;
}

export interface HiaProviderResult {
  contract: typeof HIA_PROVIDER_RESULT_CONTRACT;
  contractVersion: typeof HIA_PROVIDER_RESULT_CONTRACT_VERSION;
  diagnostics: HiaDiagnostic[];
  outputs: HiaProviderOutput[];
  privacy: HiaProviderReviewOnlyPolicy;
  provider: {
    id: string;
    runtimeKind: HiaProviderRuntimeKind;
    version: string;
  };
  provenance: HiaProviderProvenance;
  requestId: string;
  status: HiaProviderResultStatus;
}

export interface HiaProviderProgress {
  current?: number;
  message?: string;
  phase: string;
  total?: number;
}

export interface HiaProviderContext {
  reportProgress?: (progress: HiaProviderProgress) => void;
  signal?: AbortSignal;
}

export interface HiaProviderAdapter {
  descriptor: HiaProviderDescriptor;
  provide(request: HiaProviderRequest, context: HiaProviderContext): Promise<HiaProviderResult>;
}

export interface HiaProviderValidationOptions {
  descriptor?: HiaProviderDescriptor;
  request?: HiaProviderRequest;
  targetPath?: string;
}

const identifierPattern = /^[a-z0-9][a-z0-9._-]*$/;
const openIdentifierPattern = /^[a-z0-9][a-z0-9._/-]*$/;
const diagnosticSeverities = new Set<HiaDiagnosticSeverity>(["error", "warning", "info"]);
const outputKinds = new Set<HiaProviderOutputKind>(["draft-text", "review-metadata", "refusal", "diagnostic"]);
const resultStatuses = new Set<HiaProviderResultStatus>(["success", "partial", "refused", "failed"]);
const runtimeKinds = new Set<HiaProviderRuntimeKind>(["deterministic-mock", "local", "remote-api", "host-provided"]);
const requestSourceLeakKeys = new Set([
  "rawSource",
  "sourceBody",
  "sourceExcerpt",
  "sourceText",
  "sourcesContent"
]);
const providerEditOutputKeys = new Set([
  "apply",
  "changes",
  "documentChanges",
  "edits",
  "patch",
  "workspaceEdit"
]);

/**
 * Creates the canonical review-only privacy policy for P1 provider contracts.
 *
 * @lang zh-CN
 * 返回 P1 provider 边界唯一允许的隐私策略：不携带源码正文、不嵌入
 * sourcesContent、不允许工具执行或写入，并要求人工审查。
 *
 * @lang en
 * Returns the only privacy policy allowed by the P1 provider boundary: no source
 * bodies, no embedded sourcesContent, no tool execution or writes, and mandatory
 * human review.
 */
export function createReviewOnlyProviderPolicy(): HiaProviderReviewOnlyPolicy {
  return {
    sourceExcerptPolicy: "none",
    sourcesContentPolicy: "none",
    allowSourceBody: false,
    allowToolExecution: false,
    allowWorkspaceWrite: false,
    allowTargetRepositoryMutation: false,
    requiresHumanReview: true
  };
}

/**
 * Defines a provider adapter after validating the committed descriptor.
 *
 * @lang zh-CN
 * 该函数只接受“审查建议型”provider：descriptor 必须声明不能读取源码正文、
 * 不能直接写入工作区、不能请求工具执行。验证失败会立即抛出 TypeError，
 * 避免不安全 adapter 被宿主注册。
 *
 * @lang en
 * This helper accepts only review-proposal providers. The descriptor must
 * declare that it cannot receive source bodies, write the workspace, or request
 * tool execution. Invalid adapters fail fast with TypeError before registration.
 */
export function defineHiaProviderAdapter<T extends HiaProviderAdapter>(adapter: T): T {
  const diagnostics = validateHiaProviderDescriptor(adapter?.descriptor);
  if (!adapter || typeof adapter.provide !== "function") {
    diagnostics.push(createProviderDiagnostic(
      "HIA_PROVIDER_ADAPTER_INVALID",
      "HIA provider adapter must provide a provide(request, context) function.",
      "error"
    ));
  }

  if (hasHiaProviderErrors(diagnostics)) {
    throw new TypeError(formatContractDiagnostics(diagnostics));
  }

  return adapter;
}

/**
 * Runs a provider adapter behind the P1 review-only validation gate.
 *
 * @lang zh-CN
 * 宿主应通过该函数调用 provider，而不是直接调用 `provide`。函数会在执行前验证
 * request，在执行后验证 result；任何越界输入或输出都会被转成结构化 failed result。
 *
 * @lang en
 * Hosts should call providers through this function rather than invoking
 * `provide` directly. It validates the request before execution and validates
 * the result afterwards; unsafe inputs or outputs become structured failed
 * results.
 */
export async function runHiaProviderAdapter(
  adapter: HiaProviderAdapter,
  request: HiaProviderRequest,
  context: HiaProviderContext = {}
): Promise<HiaProviderResult> {
  const descriptorDiagnostics = validateHiaProviderDescriptor(adapter?.descriptor);
  if (!adapter || typeof adapter.provide !== "function" || hasHiaProviderErrors(descriptorDiagnostics)) {
    throw new TypeError(formatContractDiagnostics([
      ...descriptorDiagnostics,
      ...(adapter && typeof adapter.provide === "function"
        ? []
        : [createProviderDiagnostic(
            "HIA_PROVIDER_ADAPTER_INVALID",
            "HIA provider adapter must provide a provide(request, context) function.",
            "error"
          )])
    ]));
  }

  const requestDiagnostics = validateHiaProviderRequest(request, {
    descriptor: adapter.descriptor
  });
  if (hasHiaProviderErrors(requestDiagnostics)) {
    return createFailedHiaProviderResult(adapter.descriptor, request, requestDiagnostics);
  }

  if (context.signal?.aborted) {
    return createFailedHiaProviderResult(adapter.descriptor, request, [
      createProviderDiagnostic(
        "HIA_PROVIDER_ABORTED",
        "HIA provider execution was aborted before execution.",
        "error"
      )
    ]);
  }

  let value: unknown;
  try {
    value = await adapter.provide(request, context);
  } catch (error) {
    const aborted = context.signal?.aborted || isAbortError(error);
    return createFailedHiaProviderResult(adapter.descriptor, request, [
      createProviderDiagnostic(
        aborted ? "HIA_PROVIDER_ABORTED" : "HIA_PROVIDER_EXECUTION_FAILED",
        aborted
          ? "HIA provider execution was aborted."
          : `HIA provider execution failed: ${errorMessage(error)}`,
        "error"
      )
    ]);
  }

  const resultDiagnostics = validateHiaProviderResult(value, {
    descriptor: adapter.descriptor,
    request
  });
  if (hasHiaProviderErrors(resultDiagnostics)) {
    return createFailedHiaProviderResult(adapter.descriptor, request, resultDiagnostics);
  }

  return value as HiaProviderResult;
}

export function validateHiaProviderDescriptor(
  value: unknown,
  options: HiaProviderValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProviderDiagnostic(
      "HIA_PROVIDER_DESCRIPTOR_INVALID",
      "HIA provider descriptor must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(
    value,
    [
      "contract",
      "contractVersion",
      "id",
      "version",
      "displayName",
      "runtimeKind",
      "acceptedInputContracts",
      "outputKinds",
      "capabilities",
      "policies"
    ],
    diagnostics,
    "descriptor",
    options.targetPath
  );
  validateConst(value.contract, HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT, "descriptor.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
    "descriptor.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateIdentifier(value.id, "descriptor.id", diagnostics, options.targetPath);
  validateNonEmptyString(value.version, "descriptor.version", diagnostics, options.targetPath);
  validateNonEmptyString(value.displayName, "descriptor.displayName", diagnostics, options.targetPath);
  validateRuntimeKind(value.runtimeKind, "descriptor.runtimeKind", diagnostics, options.targetPath);
  validateIdentifierList(value.acceptedInputContracts, "descriptor.acceptedInputContracts", diagnostics, options.targetPath, true, true);
  validateOutputKindList(value.outputKinds, diagnostics, options.targetPath);
  validateProviderCapabilities(value.capabilities, diagnostics, options.targetPath);
  validateReviewOnlyPolicy(value.policies, "descriptor.policies", diagnostics, options.targetPath);
  return diagnostics;
}

export function validateHiaProviderRequest(
  value: unknown,
  options: HiaProviderValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProviderDiagnostic(
      "HIA_PROVIDER_REQUEST_INVALID",
      "HIA provider request must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(
    value,
    ["contract", "contractVersion", "requestId", "providerId", "input", "policies"],
    diagnostics,
    "request",
    options.targetPath
  );
  validateConst(value.contract, HIA_PROVIDER_REQUEST_CONTRACT, "request.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
    "request.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateIdentifier(value.requestId, "request.requestId", diagnostics, options.targetPath);
  validateIdentifier(value.providerId, "request.providerId", diagnostics, options.targetPath);
  if (options.descriptor && value.providerId !== options.descriptor.id) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_REQUEST_TARGET_MISMATCH",
      "request.providerId must match the selected provider descriptor.",
      "request.providerId",
      options.targetPath
    ));
  }
  validateProviderRequestInput(value.input, options.descriptor, diagnostics, options.targetPath);
  validateReviewOnlyPolicy(value.policies, "request.policies", diagnostics, options.targetPath);
  validateNoForbiddenKeys(value, requestSourceLeakKeys, "HIA_PROVIDER_SOURCE_BODY_FORBIDDEN", "request", diagnostics, options.targetPath);
  return diagnostics;
}

export function validateHiaProviderResult(
  value: unknown,
  options: HiaProviderValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProviderDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
      "HIA provider result must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  validateKnownFields(
    value,
    [
      "contract",
      "contractVersion",
      "requestId",
      "provider",
      "status",
      "outputs",
      "diagnostics",
      "privacy",
      "provenance"
    ],
    diagnostics,
    "result",
    options.targetPath
  );
  validateConst(value.contract, HIA_PROVIDER_RESULT_CONTRACT, "result.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    HIA_PROVIDER_RESULT_CONTRACT_VERSION,
    "result.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateIdentifier(value.requestId, "result.requestId", diagnostics, options.targetPath);
  if (options.request && value.requestId !== options.request.requestId) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_REQUEST_MISMATCH",
      "result.requestId must match the executed request.",
      "result.requestId",
      options.targetPath
    ));
  }
  validateProviderIdentity(value.provider, options.descriptor, diagnostics, options.targetPath);
  const status = typeof value.status === "string" && resultStatuses.has(value.status as HiaProviderResultStatus)
    ? value.status as HiaProviderResultStatus
    : undefined;
  if (!status) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
      "result.status must be success, partial, refused or failed.",
      "result.status",
      options.targetPath
    ));
  }

  const outputs = validateProviderOutputs(value.outputs, options.descriptor, diagnostics, options.targetPath);
  const resultDiagnostics = validateResultDiagnostics(value.diagnostics, diagnostics, options.targetPath);
  validateReviewOnlyPolicy(value.privacy, "result.privacy", diagnostics, options.targetPath);
  validateProviderProvenance(value.provenance, options.descriptor, diagnostics, options.targetPath);
  validateNoForbiddenKeys(value, providerEditOutputKeys, "HIA_PROVIDER_DIRECT_EDIT_FORBIDDEN", "result", diagnostics, options.targetPath);
  validateNoForbiddenKeys(value, requestSourceLeakKeys, "HIA_PROVIDER_SOURCE_BODY_FORBIDDEN", "result", diagnostics, options.targetPath);
  if (status) {
    validateResultStatusSemantics(status, outputs, resultDiagnostics, diagnostics, options.targetPath);
  }
  return diagnostics;
}

export function hasHiaProviderErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function createFailedHiaProviderResult(
  descriptor: HiaProviderDescriptor,
  request: HiaProviderRequest | unknown,
  diagnostics: HiaDiagnostic[]
): HiaProviderResult {
  const requestId = isRecord(request) && typeof request.requestId === "string"
    ? request.requestId
    : "invalid-request";
  return {
    contract: HIA_PROVIDER_RESULT_CONTRACT,
    contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
    requestId,
    provider: {
      id: descriptor.id,
      version: descriptor.version,
      runtimeKind: descriptor.runtimeKind
    },
    status: "failed",
    outputs: [],
    diagnostics,
    privacy: createReviewOnlyProviderPolicy(),
    provenance: {
      providerId: descriptor.id,
      providerVersion: descriptor.version,
      runtimeKind: descriptor.runtimeKind,
      generatedAt: new Date().toISOString(),
      deterministic: false
    }
  };
}

function validateProviderCapabilities(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_DESCRIPTOR_INVALID",
      "descriptor.capabilities must be an object.",
      "descriptor.capabilities",
      targetPath
    ));
    return;
  }

  validateKnownFields(
    value,
    [
      "draftText",
      "reviewMetadata",
      "sourceBodyInput",
      "toolExecution",
      "workspaceWrite",
      "targetRepositoryMutation",
      "networkAccess"
    ],
    diagnostics,
    "descriptor.capabilities",
    targetPath
  );
  for (const field of ["draftText", "reviewMetadata"] as const) {
    if (typeof value[field] !== "boolean") {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_CAPABILITY_INVALID",
        `descriptor.capabilities.${field} must be boolean.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
  for (const field of ["sourceBodyInput", "toolExecution", "workspaceWrite", "targetRepositoryMutation"] as const) {
    if (value[field] !== false) {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_CAPABILITY_FORBIDDEN",
        `P1 provider adapters must set descriptor.capabilities.${field} to false.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
  if (value.networkAccess !== "disabled") {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_NETWORK_FORBIDDEN",
      "P1 provider adapters must set descriptor.capabilities.networkAccess to disabled.",
      "descriptor.capabilities.networkAccess",
      targetPath
    ));
  }
  if (value.draftText !== true && value.reviewMetadata !== true) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_CAPABILITY_INVALID",
      "P1 provider adapters must expose at least draftText or reviewMetadata capability.",
      "descriptor.capabilities",
      targetPath
    ));
  }
}

function validateReviewOnlyPolicy(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_POLICY_INVALID",
      `${fieldPath} must be an object.`,
      fieldPath,
      targetPath
    ));
    return;
  }

  validateKnownFields(
    value,
    [
      "sourceExcerptPolicy",
      "sourcesContentPolicy",
      "allowSourceBody",
      "allowToolExecution",
      "allowWorkspaceWrite",
      "allowTargetRepositoryMutation",
      "requiresHumanReview"
    ],
    diagnostics,
    fieldPath,
    targetPath
  );
  validateConst(value.sourceExcerptPolicy, "none", `${fieldPath}.sourceExcerptPolicy`, diagnostics, targetPath);
  validateConst(value.sourcesContentPolicy, "none", `${fieldPath}.sourcesContentPolicy`, diagnostics, targetPath);
  for (const field of ["allowSourceBody", "allowToolExecution", "allowWorkspaceWrite", "allowTargetRepositoryMutation"] as const) {
    if (value[field] !== false) {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_POLICY_FORBIDDEN",
        `${fieldPath}.${field} must be false.`,
        `${fieldPath}.${field}`,
        targetPath
      ));
    }
  }
  if (value.requiresHumanReview !== true) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_HUMAN_REVIEW_REQUIRED",
      `${fieldPath}.requiresHumanReview must be true.`,
      `${fieldPath}.requiresHumanReview`,
      targetPath
    ));
  }
}

function validateProviderRequestInput(
  value: unknown,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_REQUEST_INVALID",
      "request.input must be an object.",
      "request.input",
      targetPath
    ));
    return;
  }

  validateKnownFields(
    value,
    ["aiContextPackageRef", "reviewPayload", "reviewItemIds", "locales", "profileIds"],
    diagnostics,
    "request.input",
    targetPath
  );
  if (value.aiContextPackageRef !== undefined) {
    validateContextPackageRef(value.aiContextPackageRef, descriptor, diagnostics, targetPath);
  }
  if (value.reviewPayload !== undefined && (!isRecord(value.reviewPayload) || !isJsonCompatible(value.reviewPayload))) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_REQUEST_INVALID",
      "request.input.reviewPayload must be a JSON-compatible object.",
      "request.input.reviewPayload",
      targetPath
    ));
  }
  if (value.reviewItemIds !== undefined) {
    validateIdentifierList(value.reviewItemIds, "request.input.reviewItemIds", diagnostics, targetPath, false);
  }
  if (value.locales !== undefined) {
    validateStringList(value.locales, "request.input.locales", diagnostics, targetPath, false);
  }
  if (value.profileIds !== undefined) {
    validateIdentifierList(value.profileIds, "request.input.profileIds", diagnostics, targetPath, false);
  }
}

function validateContextPackageRef(
  value: unknown,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_CONTEXT_REF_INVALID",
      "request.input.aiContextPackageRef must be an object.",
      "request.input.aiContextPackageRef",
      targetPath
    ));
    return;
  }
  validateKnownFields(
    value,
    ["contract", "contractVersion", "packageId", "sourceExcerptPolicy"],
    diagnostics,
    "request.input.aiContextPackageRef",
    targetPath
  );
  validateOpenIdentifier(value.contract, "request.input.aiContextPackageRef.contract", diagnostics, targetPath);
  validateNonEmptyString(value.contractVersion, "request.input.aiContextPackageRef.contractVersion", diagnostics, targetPath);
  validateIdentifier(value.packageId, "request.input.aiContextPackageRef.packageId", diagnostics, targetPath);
  validateConst(value.sourceExcerptPolicy, "none", "request.input.aiContextPackageRef.sourceExcerptPolicy", diagnostics, targetPath);
  if (
    descriptor &&
    typeof value.contract === "string" &&
    !descriptor.acceptedInputContracts.includes(value.contract)
  ) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_INPUT_CONTRACT_UNSUPPORTED",
      "request.input.aiContextPackageRef.contract is not declared by the provider descriptor.",
      "request.input.aiContextPackageRef.contract",
      targetPath
    ));
  }
}

function validateProviderIdentity(
  value: unknown,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
      "result.provider must be an object.",
      "result.provider",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["id", "version", "runtimeKind"], diagnostics, "result.provider", targetPath);
  validateIdentifier(value.id, "result.provider.id", diagnostics, targetPath);
  validateNonEmptyString(value.version, "result.provider.version", diagnostics, targetPath);
  validateRuntimeKind(value.runtimeKind, "result.provider.runtimeKind", diagnostics, targetPath);
  if (
    descriptor &&
    (value.id !== descriptor.id || value.version !== descriptor.version || value.runtimeKind !== descriptor.runtimeKind)
  ) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_IDENTITY_MISMATCH",
      "result.provider must match the executed provider descriptor.",
      "result.provider",
      targetPath
    ));
  }
}

function validateProviderOutputs(
  value: unknown,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): HiaProviderOutput[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
      "result.outputs must be an array.",
      "result.outputs",
      targetPath
    ));
    return [];
  }
  const validOutputs: HiaProviderOutput[] = [];
  const ids = new Set<string>();
  value.forEach((output, index) => {
    const fieldPath = `result.outputs[${index}]`;
    if (!isRecord(output)) {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_OUTPUT_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateProviderOutput(output, fieldPath, descriptor, diagnostics, targetPath);
    if (typeof output.id === "string") {
      if (ids.has(output.id)) {
        diagnostics.push(createFieldDiagnostic(
          "HIA_PROVIDER_OUTPUT_DUPLICATE",
          `Duplicate provider output id ${output.id}.`,
          `${fieldPath}.id`,
          targetPath
        ));
      }
      ids.add(output.id);
    }
    validOutputs.push(output as unknown as HiaProviderOutput);
  });
  return validOutputs;
}

function validateProviderOutput(
  output: Record<string, unknown>,
  fieldPath: string,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  validateIdentifier(output.id, `${fieldPath}.id`, diagnostics, targetPath);
  if (typeof output.kind !== "string" || !outputKinds.has(output.kind as HiaProviderOutputKind)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_KIND_INVALID",
      `${fieldPath}.kind must be draft-text, review-metadata, refusal or diagnostic.`,
      `${fieldPath}.kind`,
      targetPath
    ));
    return;
  }
  if (descriptor && !descriptor.outputKinds.includes(output.kind as HiaProviderOutputKind)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_KIND_UNDECLARED",
      `${fieldPath}.kind is not declared by provider ${descriptor.id}.`,
      `${fieldPath}.kind`,
      targetPath
    ));
  }

  if (output.kind === "draft-text") {
    validateDraftTextOutput(output, fieldPath, diagnostics, targetPath);
    return;
  }
  if (output.kind === "review-metadata") {
    validateReviewMetadataOutput(output, fieldPath, diagnostics, targetPath);
    return;
  }
  if (output.kind === "refusal") {
    validateRefusalOutput(output, fieldPath, diagnostics, targetPath);
    return;
  }
  validateDiagnosticOutput(output, fieldPath, diagnostics, targetPath);
}

function validateDraftTextOutput(
  output: Record<string, unknown>,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  validateKnownFields(output, ["kind", "id", "proposalId", "locale", "format", "text", "target"], diagnostics, fieldPath, targetPath);
  validateIdentifier(output.proposalId, `${fieldPath}.proposalId`, diagnostics, targetPath);
  if (output.locale !== undefined) {
    validateNonEmptyString(output.locale, `${fieldPath}.locale`, diagnostics, targetPath);
  }
  if (output.format !== "plain-text" && output.format !== "markdown-snippet") {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_INVALID",
      `${fieldPath}.format must be plain-text or markdown-snippet.`,
      `${fieldPath}.format`,
      targetPath
    ));
  }
  validateNonEmptyString(output.text, `${fieldPath}.text`, diagnostics, targetPath);
  if (output.target !== undefined) {
    validateDraftTarget(output.target, `${fieldPath}.target`, diagnostics, targetPath);
  }
}

function validateDraftTarget(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_INVALID",
      `${fieldPath} must be an object.`,
      fieldPath,
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["kind", "reviewItemId", "locale"], diagnostics, fieldPath, targetPath);
  validateOpenIdentifier(value.kind, `${fieldPath}.kind`, diagnostics, targetPath);
  if (value.reviewItemId !== undefined) {
    validateIdentifier(value.reviewItemId, `${fieldPath}.reviewItemId`, diagnostics, targetPath);
  }
  if (value.locale !== undefined) {
    validateNonEmptyString(value.locale, `${fieldPath}.locale`, diagnostics, targetPath);
  }
}

function validateReviewMetadataOutput(
  output: Record<string, unknown>,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  validateKnownFields(output, ["kind", "id", "proposalId", "riskLevel", "qualitySignals", "notes"], diagnostics, fieldPath, targetPath);
  if (output.proposalId !== undefined) {
    validateIdentifier(output.proposalId, `${fieldPath}.proposalId`, diagnostics, targetPath);
  }
  if (output.riskLevel !== "low" && output.riskLevel !== "medium" && output.riskLevel !== "high") {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_INVALID",
      `${fieldPath}.riskLevel must be low, medium or high.`,
      `${fieldPath}.riskLevel`,
      targetPath
    ));
  }
  validateStringList(output.qualitySignals, `${fieldPath}.qualitySignals`, diagnostics, targetPath, false);
  if (output.notes !== undefined) {
    validateStringList(output.notes, `${fieldPath}.notes`, diagnostics, targetPath, false);
  }
}

function validateRefusalOutput(
  output: Record<string, unknown>,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  validateKnownFields(output, ["kind", "id", "reasonCode", "message"], diagnostics, fieldPath, targetPath);
  validateIdentifier(output.reasonCode, `${fieldPath}.reasonCode`, diagnostics, targetPath);
  validateNonEmptyString(output.message, `${fieldPath}.message`, diagnostics, targetPath);
}

function validateDiagnosticOutput(
  output: Record<string, unknown>,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  validateKnownFields(output, ["kind", "id", "code", "message", "severity"], diagnostics, fieldPath, targetPath);
  validateNonEmptyString(output.code, `${fieldPath}.code`, diagnostics, targetPath);
  validateNonEmptyString(output.message, `${fieldPath}.message`, diagnostics, targetPath);
  if (typeof output.severity !== "string" || !diagnosticSeverities.has(output.severity as HiaDiagnosticSeverity)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_OUTPUT_INVALID",
      `${fieldPath}.severity must be error, warning or info.`,
      `${fieldPath}.severity`,
      targetPath
    ));
  }
}

function validateResultDiagnostics(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
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
        "HIA_PROVIDER_DIAGNOSTIC_INVALID",
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
        "HIA_PROVIDER_DIAGNOSTIC_INVALID",
        `${fieldPath}.severity must be error, warning or info.`,
        `${fieldPath}.severity`,
        targetPath
      ));
    }
    if (diagnostic.data !== undefined && (!isRecord(diagnostic.data) || !isJsonCompatible(diagnostic.data))) {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_DIAGNOSTIC_INVALID",
        `${fieldPath}.data must be a JSON-compatible object.`,
        `${fieldPath}.data`,
        targetPath
      ));
    }
    for (const pathField of ["path", "targetPath"] as const) {
      if (diagnostic[pathField] !== undefined) {
        validateNonEmptyString(diagnostic[pathField], `${fieldPath}.${pathField}`, diagnostics, targetPath);
      }
    }
    validDiagnostics.push(diagnostic as unknown as HiaDiagnostic);
  });
  return validDiagnostics;
}

function validateProviderProvenance(
  value: unknown,
  descriptor: HiaProviderDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RESULT_INVALID",
      "result.provenance must be an object.",
      "result.provenance",
      targetPath
    ));
    return;
  }
  validateKnownFields(
    value,
    ["providerId", "providerVersion", "runtimeKind", "generatedAt", "deterministic", "model"],
    diagnostics,
    "result.provenance",
    targetPath
  );
  validateIdentifier(value.providerId, "result.provenance.providerId", diagnostics, targetPath);
  validateNonEmptyString(value.providerVersion, "result.provenance.providerVersion", diagnostics, targetPath);
  validateRuntimeKind(value.runtimeKind, "result.provenance.runtimeKind", diagnostics, targetPath);
  validateNonEmptyString(value.generatedAt, "result.provenance.generatedAt", diagnostics, targetPath);
  if (typeof value.generatedAt === "string" && Number.isNaN(Date.parse(value.generatedAt))) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_PROVENANCE_INVALID",
      "result.provenance.generatedAt must be an ISO-compatible timestamp.",
      "result.provenance.generatedAt",
      targetPath
    ));
  }
  if (typeof value.deterministic !== "boolean") {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_PROVENANCE_INVALID",
      "result.provenance.deterministic must be boolean.",
      "result.provenance.deterministic",
      targetPath
    ));
  }
  if (
    descriptor &&
    (value.providerId !== descriptor.id ||
      value.providerVersion !== descriptor.version ||
      value.runtimeKind !== descriptor.runtimeKind)
  ) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_IDENTITY_MISMATCH",
      "result.provenance must match the executed provider descriptor.",
      "result.provenance",
      targetPath
    ));
  }
  if (value.model !== undefined) {
    validateProviderModel(value.model, diagnostics, targetPath);
  }
}

function validateProviderModel(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_PROVENANCE_INVALID",
      "result.provenance.model must be an object.",
      "result.provenance.model",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["provider", "name", "version"], diagnostics, "result.provenance.model", targetPath);
  validateNonEmptyString(value.provider, "result.provenance.model.provider", diagnostics, targetPath);
  validateNonEmptyString(value.name, "result.provenance.model.name", diagnostics, targetPath);
  if (value.version !== undefined) {
    validateNonEmptyString(value.version, "result.provenance.model.version", diagnostics, targetPath);
  }
}

function validateResultStatusSemantics(
  status: HiaProviderResultStatus,
  outputs: HiaProviderOutput[],
  resultDiagnostics: HiaDiagnostic[],
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  const hasErrors = resultDiagnostics.some((diagnostic) => diagnostic.severity === "error");
  const hasDraft = outputs.some((output) => output.kind === "draft-text");
  const hasRefusal = outputs.some((output) => output.kind === "refusal");
  if (status === "success" && (outputs.length === 0 || hasErrors || hasRefusal)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_STATUS_INVALID",
      "A success result requires non-refusal outputs and no error diagnostics.",
      "result.status",
      targetPath
    ));
  }
  if (status === "partial" && (outputs.length === 0 || resultDiagnostics.length === 0 || hasRefusal)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_STATUS_INVALID",
      "A partial result requires proposal outputs plus at least one diagnostic.",
      "result.status",
      targetPath
    ));
  }
  if (status === "refused" && (!hasRefusal || hasDraft)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_STATUS_INVALID",
      "A refused result requires a refusal output and must not include draft text.",
      "result.status",
      targetPath
    ));
  }
  if (status === "failed" && (outputs.length > 0 || !hasErrors)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_STATUS_INVALID",
      "A failed result must contain no outputs and at least one error diagnostic.",
      "result.status",
      targetPath
    ));
  }
}

function validateOutputKindList(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_FIELD_INVALID",
      "descriptor.outputKinds must be a non-empty array.",
      "descriptor.outputKinds",
      targetPath
    ));
    return;
  }
  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (typeof item !== "string" || !outputKinds.has(item as HiaProviderOutputKind)) {
      diagnostics.push(createFieldDiagnostic(
        "HIA_PROVIDER_OUTPUT_KIND_INVALID",
        "descriptor.outputKinds entries must be known P1 provider output kinds.",
        `descriptor.outputKinds[${index}]`,
        targetPath
      ));
    }
    if (typeof item === "string") {
      if (ids.has(item)) {
        diagnostics.push(createFieldDiagnostic(
          "HIA_PROVIDER_FIELD_INVALID",
          `descriptor.outputKinds contains duplicate value ${item}.`,
          `descriptor.outputKinds[${index}]`,
          targetPath
        ));
      }
      ids.add(item);
    }
  });
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
      "HIA_PROVIDER_FIELD_INVALID",
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
          "HIA_PROVIDER_FIELD_INVALID",
          `${fieldPath} contains duplicate value ${item}.`,
          `${fieldPath}[${index}]`,
          targetPath
        ));
      }
      ids.add(item);
    }
  });
}

function validateStringList(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined,
  requireNonEmpty: boolean
): void {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_FIELD_INVALID",
      `${fieldPath} must be ${requireNonEmpty ? "a non-empty" : "an"} array.`,
      fieldPath,
      targetPath
    ));
    return;
  }
  const ids = new Set<string>();
  value.forEach((item, index) => {
    validateNonEmptyString(item, `${fieldPath}[${index}]`, diagnostics, targetPath);
    if (typeof item === "string") {
      if (ids.has(item)) {
        diagnostics.push(createFieldDiagnostic(
          "HIA_PROVIDER_FIELD_INVALID",
          `${fieldPath} contains duplicate value ${item}.`,
          `${fieldPath}[${index}]`,
          targetPath
        ));
      }
      ids.add(item);
    }
  });
}

function validateRuntimeKind(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !runtimeKinds.has(value as HiaProviderRuntimeKind)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_RUNTIME_INVALID",
      `${fieldPath} must be deterministic-mock, local, remote-api or host-provided.`,
      fieldPath,
      targetPath
    ));
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
        "HIA_PROVIDER_FIELD_UNKNOWN",
        `${prefix}.${field} is not part of the P1 provider contract.`,
        `${prefix}.${field}`,
        targetPath
      ));
    }
  }
}

function validateIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_FIELD_INVALID",
      `${fieldPath} must be a lower-case identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateOpenIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !openIdentifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_FIELD_INVALID",
      `${fieldPath} must be a lower-case kind identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateNonEmptyString(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "HIA_PROVIDER_FIELD_INVALID",
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
      "HIA_PROVIDER_CONTRACT_UNSUPPORTED",
      `${fieldPath} must be ${expected}.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateNoForbiddenKeys(
  value: unknown,
  forbiddenKeys: ReadonlySet<string>,
  code: string,
  prefix: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string,
  seen = new Set<object>()
): void {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    value.forEach((item, index) => {
      validateNoForbiddenKeys(item, forbiddenKeys, code, `${prefix}[${index}]`, diagnostics, targetPath, seen);
    });
    seen.delete(value);
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [field, child] of Object.entries(value)) {
    if (forbiddenKeys.has(field)) {
      diagnostics.push(createFieldDiagnostic(
        code,
        `${prefix}.${field} is forbidden by the P1 review-only provider boundary.`,
        `${prefix}.${field}`,
        targetPath
      ));
    }
    validateNoForbiddenKeys(child, forbiddenKeys, code, `${prefix}.${field}`, diagnostics, targetPath, seen);
  }
  seen.delete(value);
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
  return createProviderDiagnostic(code, message, "error", targetPath, { fieldPath });
}

function createProviderDiagnostic(
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
