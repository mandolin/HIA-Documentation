import {
  createHiaDiagnostic,
  type HiaDiagnostic
} from "@hia-doc/core";
import {
  createFailedHiaProviderResult,
  createReviewOnlyProviderPolicy,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  hasHiaProviderErrors,
  runHiaProviderAdapter,
  validateHiaProviderResult,
  type HiaProviderAdapter,
  type HiaProviderContext,
  type HiaProviderContextPackageRef,
  type HiaProviderDraftFormat,
  type HiaProviderDraftTarget,
  type HiaProviderOutput,
  type HiaProviderRequest,
  type HiaProviderResult,
  type HiaProviderResultStatus,
  type HiaProviderReviewOnlyPolicy,
  type HiaProviderRiskLevel
} from "@hia-doc/provider-sdk";

export const HIA_PROVIDER_RUNNER_RESULT_CONTRACT = "hia-provider-runner-result" as const;
export const HIA_PROVIDER_RUNNER_RESULT_CONTRACT_VERSION = "0.1.0-draft" as const;
export const HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT =
  "hia-provider-review-payload-augmentation" as const;
export const HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT_VERSION = "0.1.0-draft" as const;

export interface HiaProviderReviewItemBinding {
  kind?: string;
  proposalId?: string;
  providerReviewItemId: string;
  sourceReviewItemId: string;
  status?: string;
  title?: string;
}

export interface HiaProviderReviewPayloadRef {
  contract?: string;
  contractVersion?: string;
  id: string;
}

export interface HiaProviderRunnerContextRef {
  contract?: string;
  contractVersion?: string;
  includesSourceContent: false;
  packageId: string;
  providerSafePackageId: string;
  sourceExcerptPolicy: "none";
}

export interface HiaProviderRunnerActionPolicy {
  deniedActions: string[];
  directApplyAllowed: false;
  directEditObjectAllowed: false;
  requiresHumanReview: true;
  targetRepositoryMutationAllowed: false;
  toolExecutionAllowed: false;
  workspaceWriteAllowed: false;
}

export interface HiaProviderRunnerPrivacy extends HiaProviderReviewOnlyPolicy {
  includesSourceBody: false;
  includesSourcesContent: false;
}

export interface HiaProviderRunnerDraftOutput {
  format: HiaProviderDraftFormat;
  id: string;
  locale?: string;
  proposalId: string;
  providerOutputId: string;
  target?: HiaProviderDraftTarget;
  text: string;
}

export interface HiaProviderRunnerReviewMetadata {
  id: string;
  notes?: string[];
  proposalId?: string;
  providerOutputId: string;
  qualitySignals: string[];
  riskLevel: HiaProviderRiskLevel;
}

export interface HiaProviderRunnerRefusalOutput {
  id: string;
  message: string;
  providerOutputId: string;
  reasonCode: string;
}

export interface HiaProviderReviewPayloadAugmentation {
  actionPolicy: HiaProviderRunnerActionPolicy;
  contract: typeof HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT;
  contractVersion: typeof HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT_VERSION;
  diagnostics: HiaDiagnostic[];
  draftOutputs: HiaProviderRunnerDraftOutput[];
  provider: {
    id: string;
    runtimeKind: string;
    version: string;
  };
  providerResultRef: {
    contract: typeof HIA_PROVIDER_RESULT_CONTRACT;
    contractVersion: typeof HIA_PROVIDER_RESULT_CONTRACT_VERSION;
    requestId: string;
  };
  privacy: HiaProviderRunnerPrivacy;
  refusalOutputs: HiaProviderRunnerRefusalOutput[];
  requestId: string;
  reviewItemBindings: HiaProviderReviewItemBinding[];
  reviewMetadata: HiaProviderRunnerReviewMetadata[];
  sourceAiContextPackageRef?: HiaProviderRunnerContextRef;
  sourceReviewPayloadRef: HiaProviderReviewPayloadRef;
  status: HiaProviderResultStatus;
}

export interface HiaProviderRunnerInput {
  aiContextPackageRef?: HiaProviderContextPackageRef;
  locales?: string[];
  profileIds?: string[];
  provider: HiaProviderAdapter;
  requestId?: string;
  reviewPayload: Record<string, unknown>;
}

export interface HiaProviderRunnerResult {
  actionPolicy: HiaProviderRunnerActionPolicy;
  contract: typeof HIA_PROVIDER_RUNNER_RESULT_CONTRACT;
  contractVersion: typeof HIA_PROVIDER_RUNNER_RESULT_CONTRACT_VERSION;
  diagnostics: HiaDiagnostic[];
  privacy: HiaProviderRunnerPrivacy;
  providerResult: HiaProviderResult;
  reviewPayloadAugmentation: HiaProviderReviewPayloadAugmentation;
  status: HiaProviderResultStatus;
}

const forbiddenSourceBodyKeys = new Set([
  "rawSource",
  "sourceBody",
  "sourceExcerpt",
  "sourceText",
  "sourcesContent"
]);
const forbiddenDirectEditKeys = new Set([
  "apply",
  "changes",
  "documentChanges",
  "edits",
  "patch",
  "workspaceEdit"
]);

/**
 * Creates a provider-safe request from a bounded review payload.
 *
 * @lang zh-CN
 * Runner 不把完整 review payload 原样交给 provider，而是提取 item id、locale、
 * profile 与公共摘要，并把带冒号的内部 id 转成 provider SDK 可验证的 lower-case id。
 *
 * @lang en
 * The runner does not pass the full review payload through to providers. It
 * extracts item ids, locales, profiles and a public summary, then converts
 * colon-bearing internal ids into provider-SDK-safe lower-case ids.
 */
export function createHiaProviderRequestFromReviewPayload(input: HiaProviderRunnerInput): HiaProviderRequest {
  const bindings = createReviewItemBindings(input.reviewPayload);
  const aiContextPackageRef = createProviderSafeContextPackageRef(input);
  const reviewPayload = createProviderSafeReviewPayloadSummary(input.reviewPayload, bindings);
  const profileIds = sanitizeIdentifierList(input.profileIds ?? extractProfileIds(input.reviewPayload), ["jsdoc"]);
  const locales = sanitizeStringList(input.locales ?? extractLocales(input.reviewPayload), ["zh-CN", "en"]);

  return {
    contract: HIA_PROVIDER_REQUEST_CONTRACT,
    contractVersion: HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
    requestId: slugIdentifier(input.requestId ?? `provider-run-${Date.now()}`),
    providerId: input.provider.descriptor.id,
    input: {
      ...(aiContextPackageRef ? { aiContextPackageRef } : {}),
      reviewItemIds: bindings.map((binding) => binding.providerReviewItemId),
      locales,
      profileIds,
      reviewPayload
    },
    policies: createReviewOnlyProviderPolicy()
  };
}

/**
 * Runs a local provider and converts output into review payload augmentation.
 *
 * @lang zh-CN
 * 这是 W-P35 的本地 provider runner 入口。它调用 SDK guard，并将输出放回
 * review augmentation；即使 provider 成功，也不会产生可执行编辑对象或写入动作。
 *
 * @lang en
 * This is the W-P35 local provider runner entry point. It calls the SDK guard
 * and routes outputs back into a review augmentation; even successful provider
 * runs do not produce executable edits or write actions.
 */
export async function runHiaLocalProvider(
  input: HiaProviderRunnerInput,
  context: HiaProviderContext = {}
): Promise<HiaProviderRunnerResult> {
  const request = createHiaProviderRequestFromReviewPayload(input);
  const bindings = createReviewItemBindings(input.reviewPayload);
  const inputDiagnostics = validateHiaProviderRunnerInput(input);

  if (hasHiaProviderErrors(inputDiagnostics)) {
    const failedProviderResult = createFailedHiaProviderResult(input.provider.descriptor, request, inputDiagnostics);
    return createRunnerResult(failedProviderResult, input, bindings, inputDiagnostics);
  }

  const providerResult = await runHiaProviderAdapter(input.provider, request, context);
  return createRunnerResult(providerResult, input, bindings, providerResult.diagnostics);
}

/**
 * Creates a review payload augmentation from a provider result.
 *
 * @lang zh-CN
 * Augmentation 是宿主 review surface 的增量输入：包含 provider 来源、候选文本、
 * 审查元数据、拒绝信息和安全策略，但不包含原始 review payload 或源码正文。
 *
 * @lang en
 * The augmentation is additive input for host review surfaces: it carries
 * provider origin, draft text, review metadata, refusals and safety policy, but
 * not the raw review payload or source bodies.
 */
export function createHiaProviderReviewPayloadAugmentation(
  providerResult: HiaProviderResult,
  reviewPayload: Record<string, unknown>,
  bindings = createReviewItemBindings(reviewPayload)
): HiaProviderReviewPayloadAugmentation {
  const sourceAiContextPackageRef = createSourceContextPackageRef(reviewPayload);
  const augmentationBase: Omit<HiaProviderReviewPayloadAugmentation, "sourceAiContextPackageRef"> = {
    contract: HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT,
    contractVersion: HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT_VERSION,
    requestId: providerResult.requestId,
    status: providerResult.status,
    provider: providerResult.provider,
    providerResultRef: {
      contract: HIA_PROVIDER_RESULT_CONTRACT,
      contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
      requestId: providerResult.requestId
    },
    sourceReviewPayloadRef: createSourceReviewPayloadRef(reviewPayload),
    reviewItemBindings: bindings,
    draftOutputs: providerResult.outputs
      .filter((output): output is Extract<HiaProviderOutput, { kind: "draft-text" }> => output.kind === "draft-text")
      .map((output) => ({
        id: slugIdentifier(`runner-${output.id}`),
        providerOutputId: output.id,
        proposalId: output.proposalId,
        ...(output.locale ? { locale: output.locale } : {}),
        format: output.format,
        text: output.text,
        ...(output.target ? { target: output.target } : {})
      })),
    reviewMetadata: providerResult.outputs
      .filter((output): output is Extract<HiaProviderOutput, { kind: "review-metadata" }> => output.kind === "review-metadata")
      .map((output) => ({
        id: slugIdentifier(`runner-${output.id}`),
        providerOutputId: output.id,
        ...(output.proposalId ? { proposalId: output.proposalId } : {}),
        riskLevel: output.riskLevel,
        qualitySignals: output.qualitySignals,
        ...(output.notes ? { notes: output.notes } : {})
      })),
    refusalOutputs: providerResult.outputs
      .filter((output): output is Extract<HiaProviderOutput, { kind: "refusal" }> => output.kind === "refusal")
      .map((output) => ({
        id: slugIdentifier(`runner-${output.id}`),
        providerOutputId: output.id,
        reasonCode: output.reasonCode,
        message: output.message
      })),
    diagnostics: providerResult.diagnostics,
    actionPolicy: createReviewOnlyRunnerActionPolicy(),
    privacy: createRunnerPrivacy()
  };

  return sourceAiContextPackageRef
    ? { ...augmentationBase, sourceAiContextPackageRef }
    : augmentationBase;
}

/**
 * Validates the runner result boundary.
 *
 * @lang zh-CN
 * 该验证器面向宿主和 evidence：它复用 provider result validator，并额外确认 runner
 * 结果仍是 review-only，不含 direct edit 对象或 source body marker。
 *
 * @lang en
 * This validator is intended for hosts and evidence. It reuses the provider
 * result validator and additionally proves that runner output remains
 * review-only, with no direct edit objects or source body markers.
 */
export function validateHiaProviderRunnerResult(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_RESULT_INVALID",
      "Provider runner result must be an object."
    ));
    return diagnostics;
  }

  if (value.contract !== HIA_PROVIDER_RUNNER_RESULT_CONTRACT) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_CONTRACT_INVALID",
      "provider runner result contract is unsupported."
    ));
  }
  if (value.contractVersion !== HIA_PROVIDER_RUNNER_RESULT_CONTRACT_VERSION) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_CONTRACT_INVALID",
      "provider runner result contractVersion is unsupported."
    ));
  }
  diagnostics.push(...validateHiaProviderResult(value.providerResult));
  validateRunnerActionPolicy(value.actionPolicy, diagnostics);
  validateRunnerPrivacy(value.privacy, diagnostics);
  validateReviewPayloadAugmentation(value.reviewPayloadAugmentation, diagnostics);
  validateNoForbiddenKeys(value, forbiddenSourceBodyKeys, "HIA_PROVIDER_RUNNER_SOURCE_BODY_FORBIDDEN", diagnostics);
  validateNoForbiddenKeys(value, forbiddenDirectEditKeys, "HIA_PROVIDER_RUNNER_DIRECT_EDIT_FORBIDDEN", diagnostics);
  return diagnostics;
}

export function hasHiaProviderRunnerErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function createReviewOnlyRunnerActionPolicy(): HiaProviderRunnerActionPolicy {
  return {
    directApplyAllowed: false,
    directEditObjectAllowed: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    toolExecutionAllowed: false,
    requiresHumanReview: true,
    deniedActions: [
      "apply-workspace-edit",
      "write-workspace",
      "mutate-target-repository",
      "execute-tool",
      "bypass-human-review",
      "embed-private-source"
    ]
  };
}

export function createRunnerPrivacy(): HiaProviderRunnerPrivacy {
  return {
    ...createReviewOnlyProviderPolicy(),
    includesSourceBody: false,
    includesSourcesContent: false
  };
}

export function validateHiaProviderRunnerInput(input: HiaProviderRunnerInput): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!input.provider) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_PROVIDER_REQUIRED",
      "Provider runner input requires a provider adapter."
    ));
  }
  if (!isRecord(input.reviewPayload)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_REVIEW_PAYLOAD_INVALID",
      "Provider runner input reviewPayload must be a JSON object."
    ));
    return diagnostics;
  }
  if (!isJsonCompatible(input.reviewPayload)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_REVIEW_PAYLOAD_INVALID",
      "Provider runner input reviewPayload must be JSON-compatible."
    ));
  }
  validateNoForbiddenKeys(input.reviewPayload, forbiddenSourceBodyKeys, "HIA_PROVIDER_RUNNER_SOURCE_BODY_FORBIDDEN", diagnostics);
  return diagnostics;
}

function createRunnerResult(
  providerResult: HiaProviderResult,
  input: HiaProviderRunnerInput,
  bindings: HiaProviderReviewItemBinding[],
  diagnostics: HiaDiagnostic[]
): HiaProviderRunnerResult {
  const reviewPayloadAugmentation = createHiaProviderReviewPayloadAugmentation(providerResult, input.reviewPayload, bindings);
  return {
    contract: HIA_PROVIDER_RUNNER_RESULT_CONTRACT,
    contractVersion: HIA_PROVIDER_RUNNER_RESULT_CONTRACT_VERSION,
    status: providerResult.status,
    providerResult,
    reviewPayloadAugmentation,
    diagnostics,
    actionPolicy: createReviewOnlyRunnerActionPolicy(),
    privacy: createRunnerPrivacy()
  };
}

function createProviderSafeReviewPayloadSummary(
  reviewPayload: Record<string, unknown>,
  bindings: readonly HiaProviderReviewItemBinding[]
): Record<string, unknown> {
  return {
    contract: getString(reviewPayload.contract) ?? "hia-documentation-review-payload",
    contractVersion: getString(reviewPayload.contractVersion) ?? "0.1.0-draft",
    payloadKind: getString(reviewPayload.payloadKind) ?? "documentation-review",
    itemCount: bindings.length,
    proposalCount: getNumber(reviewPayload.proposalCount) ?? bindings.length,
    draftCount: getNumber(reviewPayload.draftCount) ?? countDraftLikeItems(reviewPayload),
    reviewItemIds: bindings.map((binding) => binding.providerReviewItemId),
    sourceReviewPayloadId: getString(reviewPayload.id) ?? "review-payload",
    privacy: {
      includesSourceBody: false,
      sourcesContentPolicy: "none"
    },
    actionPolicy: {
      requiresHumanReview: true,
      directApplyAllowed: false
    }
  };
}

function createReviewItemBindings(reviewPayload: Record<string, unknown>): HiaProviderReviewItemBinding[] {
  const items = Array.isArray(reviewPayload.items) ? reviewPayload.items : [];
  const used = new Set<string>();
  const bindings = items
    .map((item, index) => {
      if (!isRecord(item)) {
        return undefined;
      }
      const sourceReviewItemId = getString(item.id) ?? getString(item.proposalId) ?? `review-item-${index + 1}`;
      const providerReviewItemId = uniqueSlug(sourceReviewItemId, `review-item-${index + 1}`, used);
      const proposalId = getString(item.proposalId);
      const kind = getString(item.kind);
      const title = getString(item.title);
      const status = getString(item.status);
      const binding: HiaProviderReviewItemBinding = {
        providerReviewItemId,
        sourceReviewItemId
      };
      if (proposalId) {
        binding.proposalId = proposalId;
      }
      if (kind) {
        binding.kind = kind;
      }
      if (title) {
        binding.title = title;
      }
      if (status) {
        binding.status = status;
      }
      return binding;
    })
    .filter((binding): binding is HiaProviderReviewItemBinding => Boolean(binding));

  if (bindings.length > 0) {
    return bindings;
  }

  return [
    {
      providerReviewItemId: "review-item",
      sourceReviewItemId: "review-item"
    }
  ];
}

function createProviderSafeContextPackageRef(input: HiaProviderRunnerInput): HiaProviderContextPackageRef | undefined {
  const source = input.aiContextPackageRef ?? findContextPackageRef(input.reviewPayload);
  if (!source) {
    return undefined;
  }
  const sourceRecord = source as unknown as Record<string, unknown>;
  const contract = getString(sourceRecord.contract) ?? "hia-ai-context-package";
  const contractVersion = getString(sourceRecord.contractVersion) ?? "0.1.0-draft";
  const packageId = getString(sourceRecord.packageId) ?? getString(sourceRecord.id) ?? "ai-context-package";
  return {
    contract: slugOpenIdentifier(contract),
    contractVersion,
    packageId: slugIdentifier(packageId),
    sourceExcerptPolicy: "none"
  };
}

function createSourceContextPackageRef(reviewPayload: Record<string, unknown>): HiaProviderRunnerContextRef | undefined {
  const source = findContextPackageRef(reviewPayload);
  if (!source) {
    return undefined;
  }
  const packageId = getString(source.packageId) ?? getString(source.id) ?? "ai-context-package";
  const contract = getString(source.contract);
  const contractVersion = getString(source.contractVersion);
  const ref: HiaProviderRunnerContextRef = {
    packageId,
    providerSafePackageId: slugIdentifier(packageId),
    sourceExcerptPolicy: "none",
    includesSourceContent: false
  };
  if (contract) {
    ref.contract = contract;
  }
  if (contractVersion) {
    ref.contractVersion = contractVersion;
  }
  return ref;
}

function findContextPackageRef(value: unknown, seen = new Set<object>()): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findContextPackageRef(item, seen);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!isRecord(value) || seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  if (
    (value.contract === "hia-ai-context-package" || value.contract === "hia-ai-context-package-ref") &&
    (typeof value.packageId === "string" || typeof value.id === "string")
  ) {
    return value;
  }
  if (isRecord(value.aiContextPackageRef)) {
    return value.aiContextPackageRef;
  }
  if (isRecord(value.aiContextPackage)) {
    return value.aiContextPackage;
  }
  for (const item of Object.values(value)) {
    const found = findContextPackageRef(item, seen);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function createSourceReviewPayloadRef(reviewPayload: Record<string, unknown>): HiaProviderReviewPayloadRef {
  const ref: HiaProviderReviewPayloadRef = {
    id: getString(reviewPayload.id) ?? "review-payload"
  };
  const contract = getString(reviewPayload.contract);
  const contractVersion = getString(reviewPayload.contractVersion);
  if (contract) {
    ref.contract = contract;
  }
  if (contractVersion) {
    ref.contractVersion = contractVersion;
  }
  return ref;
}

function extractLocales(reviewPayload: Record<string, unknown>): string[] {
  const locales = new Set<string>();
  walkJson(reviewPayload, (node) => {
    if (!isRecord(node)) {
      return;
    }
    for (const key of ["locale", "targetLocale"] as const) {
      const value = node[key];
      if (typeof value === "string") {
        locales.add(value);
      }
    }
    if (isRecord(node.localeDrafts)) {
      for (const locale of Object.keys(node.localeDrafts)) {
        locales.add(locale);
      }
    }
  });
  return [...locales];
}

function extractProfileIds(reviewPayload: Record<string, unknown>): string[] {
  const profileIds = new Set<string>();
  walkJson(reviewPayload, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (typeof node.profileId === "string") {
      profileIds.add(node.profileId);
    }
    if (Array.isArray(node.profileIds)) {
      for (const item of node.profileIds) {
        if (typeof item === "string") {
          profileIds.add(item);
        }
      }
    }
  });
  return [...profileIds];
}

function countDraftLikeItems(value: unknown): number {
  let count = 0;
  walkJson(value, (node) => {
    if (isRecord(node) && node.contract === "hia-documentation-draft-text") {
      count += 1;
    }
  });
  return count;
}

function validateReviewPayloadAugmentation(value: unknown, diagnostics: HiaDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation must be an object."
    ));
    return;
  }
  if (value.contract !== HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation contract is unsupported."
    ));
  }
  if (value.contractVersion !== HIA_PROVIDER_REVIEW_PAYLOAD_AUGMENTATION_CONTRACT_VERSION) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation contractVersion is unsupported."
    ));
  }
  validateRunnerActionPolicy(value.actionPolicy, diagnostics);
  validateRunnerPrivacy(value.privacy, diagnostics);
  if (!Array.isArray(value.draftOutputs)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation.draftOutputs must be an array."
    ));
  }
  if (!Array.isArray(value.reviewMetadata)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation.reviewMetadata must be an array."
    ));
  }
  if (!Array.isArray(value.refusalOutputs)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_AUGMENTATION_INVALID",
      "reviewPayloadAugmentation.refusalOutputs must be an array."
    ));
  }
}

function validateRunnerActionPolicy(value: unknown, diagnostics: HiaDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_ACTION_POLICY_INVALID",
      "runner actionPolicy must be an object."
    ));
    return;
  }
  const expectedFalseFields = [
    "directApplyAllowed",
    "directEditObjectAllowed",
    "workspaceWriteAllowed",
    "targetRepositoryMutationAllowed",
    "toolExecutionAllowed"
  ];
  for (const field of expectedFalseFields) {
    if (value[field] !== false) {
      diagnostics.push(createRunnerDiagnostic(
        "HIA_PROVIDER_RUNNER_ACTION_POLICY_INVALID",
        `runner actionPolicy.${field} must be false.`
      ));
    }
  }
  if (value.requiresHumanReview !== true) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_ACTION_POLICY_INVALID",
      "runner actionPolicy.requiresHumanReview must be true."
    ));
  }
  if (!Array.isArray(value.deniedActions) || value.deniedActions.length === 0) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_ACTION_POLICY_INVALID",
      "runner actionPolicy.deniedActions must be a non-empty array."
    ));
  }
}

function validateRunnerPrivacy(value: unknown, diagnostics: HiaDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_PRIVACY_INVALID",
      "runner privacy must be an object."
    ));
    return;
  }
  const expectedFalseFields = [
    "allowSourceBody",
    "allowToolExecution",
    "allowWorkspaceWrite",
    "allowTargetRepositoryMutation",
    "includesSourceBody",
    "includesSourcesContent"
  ];
  for (const field of expectedFalseFields) {
    if (value[field] !== false) {
      diagnostics.push(createRunnerDiagnostic(
        "HIA_PROVIDER_RUNNER_PRIVACY_INVALID",
        `runner privacy.${field} must be false.`
      ));
    }
  }
  if (value.sourceExcerptPolicy !== "none" || value.sourcesContentPolicy !== "none") {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_PRIVACY_INVALID",
      "runner privacy must keep sourceExcerptPolicy and sourcesContentPolicy at none."
    ));
  }
  if (value.requiresHumanReview !== true) {
    diagnostics.push(createRunnerDiagnostic(
      "HIA_PROVIDER_RUNNER_PRIVACY_INVALID",
      "runner privacy.requiresHumanReview must be true."
    ));
  }
}

function validateNoForbiddenKeys(
  value: unknown,
  forbiddenKeys: ReadonlySet<string>,
  code: string,
  diagnostics: HiaDiagnostic[],
  path = "runner",
  seen = new Set<object>()
): void {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    value.forEach((item, index) => validateNoForbiddenKeys(item, forbiddenKeys, code, diagnostics, `${path}[${index}]`, seen));
    seen.delete(value);
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [field, child] of Object.entries(value)) {
    if (forbiddenKeys.has(field)) {
      diagnostics.push(createRunnerDiagnostic(
        code,
        `${path}.${field} is forbidden by the provider runner review-only boundary.`,
        path
      ));
    }
    validateNoForbiddenKeys(child, forbiddenKeys, code, diagnostics, `${path}.${field}`, seen);
  }
  seen.delete(value);
}

function createRunnerDiagnostic(code: string, message: string, targetPath?: string): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", {
    ...(targetPath ? { targetPath } : {})
  });
}

function sanitizeIdentifierList(values: readonly string[], fallback: readonly string[]): string[] {
  const sanitized = [...new Set(values.map((value) => slugIdentifier(value)).filter(Boolean))];
  return sanitized.length > 0 ? sanitized : [...fallback];
}

function sanitizeStringList(values: readonly string[], fallback: readonly string[]): string[] {
  const sanitized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return sanitized.length > 0 ? sanitized : [...fallback];
}

function uniqueSlug(value: string, fallback: string, used: Set<string>): string {
  const base = slugIdentifier(value) || slugIdentifier(fallback);
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function slugIdentifier(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "provider-runner";
}

function slugOpenIdentifier(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "hia-ai-context-package";
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function walkJson(value: unknown, visitor: (value: unknown) => void, seen = new Set<object>()): void {
  visitor(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const item of value) {
      walkJson(item, visitor, seen);
    }
    seen.delete(value);
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const item of Object.values(value)) {
    walkJson(item, visitor, seen);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
