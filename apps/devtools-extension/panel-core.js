export const HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE = "hia.browserPanel.openRequest";
export const HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT = "hia-devtools-open-request-bridge";
export const HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT_VERSION = "0.1.0-draft";
export const HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE = "hia:devtools-open-request";
export const HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_STRATEGY = "devtools.inspectedWindow.eval-window-event";
export const HIA_DEVTOOLS_PANEL_MESSAGE_SOURCE = "hia-devtools-panel";
export const HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT = "hia-devtools-review-surface";
export const HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT_VERSION = "0.1.0-draft";

/**
 * 将 browser-panel payload 规整为 DevTools panel 可渲染的 view model。
 * Normalize a browser-panel payload into a DevTools-panel-renderable view model.
 *
 * @param {unknown} payload HIA browser-panel payload JSON.
 * @returns {{
 *   entries: Array<{ id: string; kind: string; label: string; openRequests: unknown[] }>;
 *   nodes: Array<{ id: string; kind: string; label: string; path?: string }>;
 *   relations: Array<{ id: string; kind: string; label: string; from: string; to: string; openRequests: unknown[] }>;
 *   review: ReturnType<typeof createHiaDevToolsReviewSurfaceViewModel>;
 *   summary: { entryCount: number; linkedEntryCount: number; relationCount: number; relationNodeCount: number };
 * }}
 */
export function createHiaDevToolsPanelViewModel(payload) {
  const input = isRecord(payload) ? payload : {};
  const summary = isRecord(input.summary) ? input.summary : {};
  const relationGraph = isRecord(input.relationGraph) ? input.relationGraph : {};
  const entries = arrayValue(input.entries).map(normalizeEntry);
  const nodes = arrayValue(relationGraph.nodes).map(normalizeNode);
  const relations = arrayValue(relationGraph.relations).map(normalizeRelation);

  return {
    entries,
    nodes,
    relations,
    review: createHiaDevToolsReviewSurfaceViewModel(input),
    summary: {
      entryCount: numberValue(summary.entryCount) ?? entries.length,
      linkedEntryCount: numberValue(summary.linkedEntryCount) ?? entries.filter((entry) => entry.openRequests.length > 0).length,
      relationCount: numberValue(summary.relationCount) ?? relations.length,
      relationNodeCount: numberValue(summary.relationNodeCount) ?? nodes.length
    }
  };
}

/**
 * 将 HIA review payload 规整为 DevTools 可渲染的只读 review surface。
 * Normalize an HIA review payload into a DevTools-renderable read-only review surface.
 *
 * @param {unknown} payload Browser-panel payload, AI-authoring evidence, or direct `hia-documentation-review-payload`.
 * @returns {{
 *   actionPolicy: { allowedActions: string[]; deniedActions: string[] };
 *   applyPreview: { applyAvailable: boolean; candidateCount: number; checkedApply: boolean; conflictStatus: string; hostCheckPreflightCount: number; hostFileRead: boolean; hostWrite: boolean; rollbackRecordRequiredCount: number; status: string; targetFileCount: number; targetRepositoryMutation: boolean };
 *   contract: string;
 *   contractVersion: string;
 *   draftCount: number;
 *   items: Array<{
 *     actionHints: Record<string, unknown>;
 *     draftText?: string;
 *     editCandidate: { applyMode: string; applyPreflight: { conflictStatus: string; requiresConflictCheck: boolean; requiresFileRead: boolean; rollbackStrategy: string; status: string; targetFileCount: number }; diffPreview: { executable: boolean; operationCount: number; operations: unknown[]; requiresConflictCheck: boolean; requiresFileRead: boolean; status: string; targetKind: string }; kind: string; previewText?: string; status: string; workspaceEditBoundary: string };
 *     id: string;
 *     kind: string;
 *     proposalId: string;
 *     quality: { blocked: number; pass: number; warning: number };
 *     riskLevel: string;
 *     status: string;
 *     targetLabel: string;
 *     title: string;
 *   }>;
 *   payloadContract?: string;
 *   privacy: { allowsAutomaticWrites: boolean; includesSourceContent: boolean; requiresHumanReview: boolean; sourcesContentPolicy: string };
 *   summary: { itemCount: number; reviewRequiredCount: number; blockedCount: number };
 * }}
 */
export function createHiaDevToolsReviewSurfaceViewModel(payload) {
  const reviewPayload = selectReviewPayload(payload);
  const items = arrayValue(reviewPayload?.items).map(normalizeReviewItem);
  const summary = isRecord(reviewPayload?.summary) ? reviewPayload.summary : {};
  const privacy = isRecord(reviewPayload?.privacy) ? reviewPayload.privacy : {};
  const actionPolicy = isRecord(reviewPayload?.actionPolicy) ? reviewPayload.actionPolicy : {};

  return {
    actionPolicy: {
      allowedActions: stringArray(actionPolicy.allowedActions),
      deniedActions: stringArray(actionPolicy.deniedActions)
    },
    applyPreview: createDevToolsApplyPreviewSummary(items),
    contract: HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT,
    contractVersion: HIA_DEVTOOLS_REVIEW_SURFACE_CONTRACT_VERSION,
    draftCount: numberValue(reviewPayload?.draftCount) ?? items.filter((item) => Boolean(item.draftText)).length,
    items,
    ...(stringValue(reviewPayload?.contract) ? { payloadContract: stringValue(reviewPayload.contract) } : {}),
    privacy: {
      allowsAutomaticWrites: booleanValue(privacy.allowsAutomaticWrites) ?? false,
      includesSourceContent: booleanValue(privacy.includesSourceContent) ?? false,
      requiresHumanReview: booleanValue(privacy.requiresHumanReview) ?? true,
      sourcesContentPolicy: stringValue(privacy.sourcesContentPolicy) ?? "none"
    },
    summary: {
      blockedCount: numberValue(summary.blockedCount) ?? items.filter((item) => item.status === "blocked").length,
      itemCount: numberValue(summary.itemCount) ?? items.length,
      reviewRequiredCount: numberValue(summary.reviewRequiredCount) ?? items.filter((item) => item.status === "review-required").length
    }
  };
}

function createDevToolsApplyPreviewSummary(items) {
  const preflights = items.map((item) => item.editCandidate.applyPreflight);
  const hostCheckPreflightCount = preflights.filter((preflight) => preflight.status === "requires-host-check").length;
  const targetFileCount = preflights.reduce((sum, preflight) => sum + preflight.targetFileCount, 0);

  return {
    applyAvailable: false,
    candidateCount: items.length,
    checkedApply: false,
    conflictStatus: hostCheckPreflightCount > 0 ? "not-checked" : "not-applicable",
    hostCheckPreflightCount,
    hostFileRead: false,
    hostWrite: false,
    rollbackRecordRequiredCount: preflights.filter((preflight) => preflight.rollbackRecordRequired).length,
    status: hostCheckPreflightCount > 0 ? "input-ready" : "not-applicable",
    targetFileCount,
    targetRepositoryMutation: false
  };
}

/**
 * 为 DevTools panel 的 open request handoff 创建稳定 message。
 * Create a stable message for DevTools-panel open request handoff.
 *
 * @param {unknown} request Structured HIA open request from browser-panel payload.
 * @param {{ relationId?: string; entryId?: string }} metadata Optional relation or entry metadata.
 * @returns {{ createdAt: string; metadata: Record<string, string>; request: unknown; source: string; type: string }}
 */
export function createHiaDevToolsOpenRequestMessage(request, metadata = {}) {
  return {
    createdAt: new Date().toISOString(),
    metadata: Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value === "string" && value.length > 0)),
    request,
    source: HIA_DEVTOOLS_PANEL_MESSAGE_SOURCE,
    type: HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE
  };
}

/**
 * 创建 DevTools panel 到 inspected page 的零权限 bridge envelope。
 * Create a zero-permission bridge envelope from the DevTools panel to the inspected page.
 *
 * @lang zh-CN 该 envelope 只携带结构化 open request，不携带源码内容，也不要求 host permissions。
 * @lang en The envelope carries only structured open request data, embeds no source content, and requires no host permissions.
 *
 * @param {ReturnType<typeof createHiaDevToolsOpenRequestMessage>} message Structured open request message created by the panel.
 * @returns {{
 *   capabilities: { contentScriptRequired: boolean; hostPermissionsRequired: boolean; inspectedWindowEval: boolean; returnsPageData: boolean };
 *   contract: string;
 *   contractVersion: string;
 *   eventType: string;
 *   message: unknown;
 *   source: string;
 *   strategy: string;
 * }}
 */
export function createHiaDevToolsOpenRequestBridgeEnvelope(message) {
  return {
    capabilities: {
      contentScriptRequired: false,
      hostPermissionsRequired: false,
      inspectedWindowEval: true,
      returnsPageData: false
    },
    contract: HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT,
    contractVersion: HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_CONTRACT_VERSION,
    eventType: HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_EVENT_TYPE,
    message: cloneJsonValue(message),
    source: HIA_DEVTOOLS_PANEL_MESSAGE_SOURCE,
    strategy: HIA_DEVTOOLS_OPEN_REQUEST_BRIDGE_STRATEGY
  };
}

/**
 * 生成 `chrome.devtools.inspectedWindow.eval` 可执行的 inspected page event bridge 表达式。
 * Create an inspected-page event bridge expression executable through `chrome.devtools.inspectedWindow.eval`.
 *
 * @lang zh-CN 表达式只 dispatch 一个 `CustomEvent` 并返回 JSON-safe ack；DevTools 侧不得信任 inspected page 返回的扩展数据。
 * @lang en The expression only dispatches a `CustomEvent` and returns a JSON-safe acknowledgement; DevTools code must not trust extended data returned by the inspected page.
 *
 * @param {ReturnType<typeof createHiaDevToolsOpenRequestMessage>} message Structured open request message created by the panel.
 * @returns {string} JavaScript expression evaluated in the inspected page.
 */
export function createHiaDevToolsInspectedWindowBridgeExpression(message) {
  const envelope = createHiaDevToolsOpenRequestBridgeEnvelope(message);
  const serialized = JSON.stringify(envelope);

  return `(() => { const envelope = ${serialized}; window.dispatchEvent(new CustomEvent(envelope.eventType, { detail: envelope })); return { contract: envelope.contract, eventType: envelope.eventType, requestType: envelope.message && envelope.message.request && envelope.message.request.type || null, status: "dispatched", strategy: envelope.strategy }; })();`;
}

/**
 * 读取 relation detail 并保留 open request 列表。
 * Read relation detail while preserving the open request list.
 *
 * @param {ReturnType<typeof createHiaDevToolsPanelViewModel>} model DevTools panel view model.
 * @param {string} relationId Relation id.
 * @returns {{ fromLabel: string; openRequests: unknown[]; relation: unknown; toLabel: string } | undefined}
 */
export function getHiaDevToolsRelationDetail(model, relationId) {
  const relation = model.relations.find((candidate) => candidate.id === relationId);

  if (!relation) {
    return undefined;
  }

  const nodesById = new Map(model.nodes.map((node) => [node.id, node]));
  const fromNode = nodesById.get(relation.from);
  const toNode = nodesById.get(relation.to);

  return {
    fromLabel: formatNode(fromNode, relation.from),
    openRequests: relation.openRequests,
    relation,
    toLabel: formatNode(toNode, relation.to)
  };
}

/**
 * 读取 DevTools review item detail，不执行任何写入动作。
 * Read a DevTools review item detail without executing any write action.
 *
 * @param {ReturnType<typeof createHiaDevToolsPanelViewModel>} model DevTools panel view model.
 * @param {string} itemId Review item id.
 * @returns {ReturnType<typeof normalizeReviewItem> | undefined}
 */
export function getHiaDevToolsReviewDetail(model, itemId) {
  return model.review.items.find((candidate) => candidate.id === itemId);
}

function selectReviewPayload(payload) {
  const input = isRecord(payload) ? payload : {};

  if (input.contract === "hia-documentation-review-payload") {
    return input;
  }

  if (isRecord(input.reviewPayload)) {
    return input.reviewPayload;
  }

  if (isRecord(input.result) && isRecord(input.result.reviewPayload)) {
    return input.result.reviewPayload;
  }

  return undefined;
}

function normalizeReviewItem(value) {
  const item = isRecord(value) ? value : {};
  const actionHints = isRecord(item.actionHints) ? item.actionHints : {};
  const draft = isRecord(item.draft) ? item.draft : {};
  const editCandidate = isRecord(item.editCandidate) ? item.editCandidate : {};
  const qualityChecks = arrayValue(item.qualityChecks);

  return {
    actionHints: cloneJsonValue(actionHints) ?? {},
    ...(stringValue(draft.text) ? { draftText: stringValue(draft.text) } : {}),
    editCandidate: normalizeEditCandidate(editCandidate),
    id: stringValue(item.id) ?? stringValue(item.proposalId) ?? "review-item:unknown",
    kind: stringValue(item.kind) ?? "review-item",
    proposalId: stringValue(item.proposalId) ?? stringValue(item.id) ?? "proposal:unknown",
    quality: {
      blocked: qualityChecks.filter((check) => isRecord(check) && check.status === "blocked").length,
      pass: qualityChecks.filter((check) => isRecord(check) && check.status === "pass").length,
      warning: qualityChecks.filter((check) => isRecord(check) && check.status === "warning").length
    },
    riskLevel: stringValue(isRecord(item.risk) ? item.risk.level : undefined) ?? "unknown",
    status: stringValue(item.status) ?? "unknown",
    targetLabel: formatReviewTarget(item.target),
    title: stringValue(item.title) ?? stringValue(item.proposalId) ?? "HIA documentation proposal"
  };
}

function normalizeEditCandidate(value) {
  const preview = isRecord(value.preview) ? value.preview : {};
  const diffPreview = normalizeEditDiffPreview(value.diffPreview);
  const applyPreflight = normalizeEditApplyPreflight(value.applyPreflight);

  return {
    applyMode: stringValue(value.applyMode) ?? "manual-copy",
    applyPreflight,
    diffPreview,
    kind: stringValue(value.kind) ?? "copy-only",
    ...(stringValue(preview.text) ? { previewText: stringValue(preview.text) } : {}),
    status: stringValue(value.status) ?? "unavailable",
    workspaceEditBoundary: stringValue(value.workspaceEditBoundary) ?? "review-only"
  };
}

function normalizeEditApplyPreflight(value) {
  const preflight = isRecord(value) ? value : {};
  const rollback = isRecord(preflight.rollback) ? preflight.rollback : {};

  return {
    conflictStatus: stringValue(preflight.conflictStatus) ?? "not-applicable",
    requiresConflictCheck: booleanValue(preflight.requiresConflictCheck) ?? false,
    requiresFileRead: booleanValue(preflight.requiresFileRead) ?? false,
    rollbackRecordRequired: booleanValue(rollback.recordRequired) ?? false,
    rollbackStrategy: stringValue(rollback.strategy) ?? "not-applicable",
    status: stringValue(preflight.status) ?? "not-applicable",
    targetFileCount: arrayValue(preflight.targetFiles).length
  };
}

function normalizeEditDiffPreview(value) {
  const diffPreview = isRecord(value) ? value : {};
  const safety = isRecord(diffPreview.safety) ? diffPreview.safety : {};
  const operations = arrayValue(diffPreview.operations).map(normalizeEditDiffOperation);

  return {
    executable: booleanValue(safety.executable) ?? false,
    operationCount: operations.length,
    operations,
    requiresConflictCheck: booleanValue(safety.requiresConflictCheck) ?? false,
    requiresFileRead: booleanValue(safety.requiresFileRead) ?? false,
    status: stringValue(diffPreview.status) ?? "unavailable",
    targetKind: stringValue(diffPreview.targetKind) ?? "copy-only"
  };
}

function normalizeEditDiffOperation(value) {
  const operation = isRecord(value) ? value : {};

  return {
    ...(stringValue(operation.fieldPath) ? { fieldPath: stringValue(operation.fieldPath) } : {}),
    ...(stringValue(operation.locale) ? { locale: stringValue(operation.locale) } : {}),
    op: stringValue(operation.op) ?? "unknown",
    ...(stringValue(operation.path) ? { path: stringValue(operation.path) } : {}),
    ...(stringValue(operation.pointer) ? { pointer: stringValue(operation.pointer) } : {}),
    ...(stringValue(operation.symbolId) ? { symbolId: stringValue(operation.symbolId) } : {}),
    ...(stringValue(operation.textFormat) ? { textFormat: stringValue(operation.textFormat) } : {})
  };
}

function formatReviewTarget(value) {
  const target = isRecord(value) ? value : {};

  return [
    stringValue(target.relativePath) ?? stringValue(target.resourcePath) ?? stringValue(target.targetPath),
    stringValue(target.symbolName) ?? stringValue(target.symbolId),
    stringValue(target.fieldPath),
    stringValue(target.locale) ? `locale:${stringValue(target.locale)}` : undefined
  ]
    .filter((item) => typeof item === "string" && item.length > 0)
    .join(" ") || "target unavailable";
}

function normalizeEntry(value) {
  const entry = isRecord(value) ? value : {};

  return {
    id: stringValue(entry.id) ?? "entry:unknown",
    kind: stringValue(entry.kind) ?? "entry",
    label: stringValue(entry.label) ?? stringValue(entry.id) ?? "entry",
    openRequests: arrayValue(entry.openRequests)
  };
}

function normalizeNode(value) {
  const node = isRecord(value) ? value : {};

  return {
    id: stringValue(node.id) ?? "node:unknown",
    kind: stringValue(node.kind) ?? "node",
    label: stringValue(node.label) ?? stringValue(node.id) ?? "node",
    ...(stringValue(node.path) ? { path: stringValue(node.path) } : {})
  };
}

function normalizeRelation(value) {
  const relation = isRecord(value) ? value : {};

  return {
    from: stringValue(relation.from) ?? "node:unknown",
    id: stringValue(relation.id) ?? "relation:unknown",
    kind: stringValue(relation.kind) ?? "relation",
    label: stringValue(relation.label) ?? stringValue(relation.id) ?? "relation",
    openRequests: arrayValue(relation.openRequests),
    to: stringValue(relation.to) ?? "node:unknown"
  };
}

function formatNode(node, fallback) {
  if (!node) {
    return fallback;
  }

  return node.path || node.label || node.id;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJsonValue(value) {
  try {
    const serialized = JSON.stringify(value);

    return typeof serialized === "string" ? JSON.parse(serialized) : null;
  } catch {
    return null;
  }
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value) {
  return typeof value === "boolean" ? value : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArray(value) {
  return arrayValue(value).filter((item) => typeof item === "string" && item.length > 0);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
