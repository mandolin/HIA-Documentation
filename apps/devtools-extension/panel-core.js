export const HIA_DEVTOOLS_OPEN_REQUEST_MESSAGE_TYPE = "hia.browserPanel.openRequest";
export const HIA_DEVTOOLS_PANEL_MESSAGE_SOURCE = "hia-devtools-panel";

/**
 * 将 browser-panel payload 规整为 DevTools panel 可渲染的 view model。
 * Normalize a browser-panel payload into a DevTools-panel-renderable view model.
 *
 * @param {unknown} payload HIA browser-panel payload JSON.
 * @returns {{
 *   entries: Array<{ id: string; kind: string; label: string; openRequests: unknown[] }>;
 *   nodes: Array<{ id: string; kind: string; label: string; path?: string }>;
 *   relations: Array<{ id: string; kind: string; label: string; from: string; to: string; openRequests: unknown[] }>;
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
    summary: {
      entryCount: numberValue(summary.entryCount) ?? entries.length,
      linkedEntryCount: numberValue(summary.linkedEntryCount) ?? entries.filter((entry) => entry.openRequests.length > 0).length,
      relationCount: numberValue(summary.relationCount) ?? relations.length,
      relationNodeCount: numberValue(summary.relationNodeCount) ?? nodes.length
    }
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

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
