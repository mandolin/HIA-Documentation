import {
  createReviewOnlyProviderPolicy,
  defineHiaProviderAdapter,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  type HiaProviderAdapter,
  type HiaProviderDescriptor,
  type HiaProviderRequest,
  type HiaProviderResult,
  type HiaProviderRuntimeKind
} from "@hia-doc/provider-sdk";

export interface DeterministicMockProviderOptions {
  defaultLocale?: string;
  displayName?: string;
  generatedAt?: string;
  id?: string;
  version?: string;
}

const defaultProviderId = "hia-deterministic-mock";
const defaultProviderVersion = "0.1.0";
const defaultGeneratedAt = "2026-07-21T00:00:00.000Z";
const runtimeKind: HiaProviderRuntimeKind = "deterministic-mock";

/**
 * Creates the first offline provider implementation for HIA review workflows.
 *
 * @lang zh-CN
 * 该 provider 只根据 request 中的 review item id、locale 和 profile hint
 * 生成稳定的候选文本与审查元数据。它不调用外部 API、不读取源码正文、不返回
 * 可执行编辑对象，适合用于宿主 UI、runner 和 evidence 的可重复联调。
 *
 * @lang en
 * This provider generates stable candidate text and review metadata only from
 * review item ids, locale hints and profile hints in the request. It performs
 * no external API calls, reads no source bodies, and returns no executable edit
 * objects, making it suitable for repeatable host, runner and evidence tests.
 */
export function createDeterministicMockProvider(
  options: DeterministicMockProviderOptions = {}
): HiaProviderAdapter {
  const descriptor = createDeterministicMockProviderDescriptor(options);
  return defineHiaProviderAdapter({
    descriptor,
    async provide(request, context) {
      context.reportProgress?.({ phase: "draft", current: 0, total: 1 });
      const result = createDeterministicMockProviderResult(descriptor, request, options);
      context.reportProgress?.({ phase: "draft", current: 1, total: 1 });
      return result;
    }
  });
}

/**
 * Creates the deterministic mock provider descriptor.
 *
 * @lang zh-CN
 * Descriptor 明确声明 provider 只能产生 draft/review/refusal/diagnostic 输出，
 * 且没有工具执行、workspace 写入、目标仓库修改或网络访问权限。
 *
 * @lang en
 * The descriptor declares only draft/review/refusal/diagnostic output support
 * and no tool execution, workspace write, target repository mutation or network
 * access authority.
 */
export function createDeterministicMockProviderDescriptor(
  options: DeterministicMockProviderOptions = {}
): HiaProviderDescriptor {
  return {
    contract: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
    contractVersion: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
    id: options.id ?? defaultProviderId,
    version: options.version ?? defaultProviderVersion,
    displayName: options.displayName ?? "HIA Deterministic Mock Provider",
    runtimeKind,
    acceptedInputContracts: ["hia-ai-context-package"],
    outputKinds: ["draft-text", "review-metadata", "refusal", "diagnostic"],
    capabilities: {
      draftText: true,
      reviewMetadata: true,
      sourceBodyInput: false,
      toolExecution: false,
      workspaceWrite: false,
      targetRepositoryMutation: false,
      networkAccess: "disabled"
    },
    policies: createReviewOnlyProviderPolicy()
  };
}

/**
 * Creates deterministic review-only output for a validated provider request.
 *
 * @lang zh-CN
 * 该函数用于测试和 evidence：同一 descriptor、request 与 options 会生成完全相同
 * 的 result。输出只包含候选文本、质量信号和 provenance，不包含源码正文或编辑对象。
 *
 * @lang en
 * This helper is intended for tests and evidence: the same descriptor, request
 * and options produce the same result. Outputs contain only proposal text,
 * quality signals and provenance, never source bodies or edit objects.
 */
export function createDeterministicMockProviderResult(
  descriptor: HiaProviderDescriptor,
  request: HiaProviderRequest,
  options: DeterministicMockProviderOptions = {}
): HiaProviderResult {
  const reviewItemIds = normalizedReviewItemIds(request);
  const locales = normalizedLocales(request, options.defaultLocale ?? "zh-CN");
  const outputs = reviewItemIds.flatMap((reviewItemId) => {
    return locales.flatMap((locale) => {
      const proposalId = slugIdentifier(`proposal-${reviewItemId}-${locale}`);
      return [
        {
          kind: "draft-text" as const,
          id: slugIdentifier(`draft-${reviewItemId}-${locale}`),
          proposalId,
          locale,
          format: "plain-text" as const,
          text: createDraftText(reviewItemId, locale),
          target: {
            kind: "documentation-comment",
            reviewItemId,
            locale
          }
        },
        {
          kind: "review-metadata" as const,
          id: slugIdentifier(`review-${reviewItemId}-${locale}`),
          proposalId,
          riskLevel: "low" as const,
          qualitySignals: [
            "deterministic",
            "review-only",
            "source-free",
            `locale:${locale}`,
            ...profileQualitySignals(request)
          ]
        }
      ];
    });
  });

  return {
    contract: HIA_PROVIDER_RESULT_CONTRACT,
    contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
    requestId: request.requestId,
    provider: {
      id: descriptor.id,
      version: descriptor.version,
      runtimeKind: descriptor.runtimeKind
    },
    status: "success",
    outputs,
    diagnostics: [],
    privacy: createReviewOnlyProviderPolicy(),
    provenance: {
      providerId: descriptor.id,
      providerVersion: descriptor.version,
      runtimeKind: descriptor.runtimeKind,
      generatedAt: options.generatedAt ?? defaultGeneratedAt,
      deterministic: true,
      model: {
        provider: "hia",
        name: "deterministic-mock-template",
        version: descriptor.version
      }
    }
  };
}

function normalizedReviewItemIds(request: HiaProviderRequest): string[] {
  const ids = request.input.reviewItemIds?.filter((item) => item.trim().length > 0) ?? [];
  return ids.length > 0 ? [...new Set(ids)].sort() : ["default-review-item"];
}

function normalizedLocales(request: HiaProviderRequest, defaultLocale: string): string[] {
  const locales = request.input.locales?.filter((locale) => locale.trim().length > 0) ?? [];
  return locales.length > 0 ? [...new Set(locales)].sort() : [defaultLocale];
}

function profileQualitySignals(request: HiaProviderRequest): string[] {
  return (request.input.profileIds ?? [])
    .filter((profileId) => profileId.trim().length > 0)
    .sort()
    .map((profileId) => `profile:${profileId}`);
}

function createDraftText(reviewItemId: string, locale: string): string {
  if (locale.toLowerCase() === "zh-cn") {
    return `建议为 ${reviewItemId} 补齐文档化说明，并保持中英语义一致。`;
  }
  return `Add documentation for ${reviewItemId} and keep bilingual semantics aligned.`;
}

function slugIdentifier(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "mock-output";
}
