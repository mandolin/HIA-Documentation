export const HIA_LSP_HOST_RESULT_CONTRACT = "hia-lsp-host-result";
export const HIA_LSP_HOST_RESULT_CONTRACT_VERSION = "0.1.0-draft";

/**
 * 宿主请求结果的数据来源。
 * Data source used to answer a host request.
 */
export type HiaLspHostResultSource = "managed-document" | "workspace-runtime" | "none";

/**
 * 宿主请求可识别的空状态。
 * Host-visible empty state for request results.
 */
export type HiaLspHostEmptyState =
  | "not-loaded"
  | "query-no-match"
  | "relation-graph-empty"
  | "source-data-empty";

/**
 * HIA LSP custom request 的统一宿主元信息。
 * Common host metadata returned by HIA LSP custom requests.
 *
 * @lang zh-CN 该字段为 additive contract，供 VS Code、DevTools、Visual Studio 等宿主识别 request 版本、能力与降级状态。
 * @lang en This additive contract lets hosts such as VS Code, DevTools, and Visual Studio identify request versions, capabilities, and fallback states.
 */
export interface HiaLspHostResultMeta {
  capability: string;
  contract: typeof HIA_LSP_HOST_RESULT_CONTRACT;
  contractVersion: typeof HIA_LSP_HOST_RESULT_CONTRACT_VERSION;
  emptyState?: HiaLspHostEmptyState;
  request: {
    method: string;
    version: string;
  };
  source: HiaLspHostResultSource;
}

/**
 * 创建稳定的 LSP host result metadata。
 * Create stable metadata for an LSP host result.
 */
export function createHiaLspHostResultMeta(options: {
  capability: string;
  emptyState?: HiaLspHostEmptyState;
  method: string;
  source: HiaLspHostResultSource;
  version: string;
}): HiaLspHostResultMeta {
  return {
    capability: options.capability,
    contract: HIA_LSP_HOST_RESULT_CONTRACT,
    contractVersion: HIA_LSP_HOST_RESULT_CONTRACT_VERSION,
    ...(options.emptyState ? { emptyState: options.emptyState } : {}),
    request: {
      method: options.method,
      version: options.version
    },
    source: options.source
  };
}
