import {
  createHiaLspHostResultMeta,
  type HiaLspHostResultMeta,
  type HiaLspHostResultSource
} from "./host-contract.js";

/**
 * 项目级 relation graph 的 LSP custom request 名称。
 * LSP custom request name for project-level relation graph data.
 */
export const HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST = "hia/projectRelationGraph";
export const HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST_VERSION = "0.1.0-draft";
export const HIA_LSP_PROJECT_RELATION_GRAPH_QUERY_CAPABILITY = "hia.projectRelationGraph.query";

/**
 * LSP relation graph 请求的加载状态。
 * Loading status for the LSP relation graph request.
 */
export type HiaProjectRelationGraphStatus = "available" | "unavailable";

/**
 * relation graph 不可用时的机器可读原因。
 * Machine-readable reason used when relation graph data is unavailable.
 */
export type HiaProjectRelationGraphUnavailableReason =
  | "project-index-missing"
  | "project-relation-graph-missing";

/**
 * `hia/projectRelationGraph` 请求参数。
 * Parameters for the `hia/projectRelationGraph` request.
 */
export interface HiaProjectRelationGraphParams {
  uri: string;
}

/**
 * LSP 返回给 IDE/host 的项目级 relation graph view model。
 * Project-level relation graph view model returned by the LSP to IDE/host clients.
 */
export interface HiaProjectRelationGraphResult {
  contract?: string;
  contractVersion?: string;
  host: HiaLspHostResultMeta;
  nodeCount: number;
  nodes: HiaProjectRelationNode[];
  project?: HiaProjectRelationProjectInfo;
  relationCount: number;
  relations: HiaProjectRelation[];
  status: HiaProjectRelationGraphStatus;
  unavailableReason?: HiaProjectRelationGraphUnavailableReason;
  uri: string;
}

/**
 * relation graph 所属项目的轻量公开信息。
 * Lightweight public project information associated with a relation graph.
 */
export interface HiaProjectRelationProjectInfo {
  defaultLocale?: string;
  id?: string;
  locales?: string[];
  name?: string;
  title?: string;
  views?: string[];
}

/**
 * relation graph 中的稳定节点。
 * Stable node in a relation graph.
 */
export interface HiaProjectRelationNode {
  entryId?: string;
  id: string;
  kind: string;
  label: string;
  path?: string;
  view?: string;
}

/**
 * relation graph 中的一条方向关系。
 * Directed relation in a relation graph.
 */
export interface HiaProjectRelation {
  confidence?: string;
  entryId?: string;
  from: string;
  id: string;
  kind: string;
  label: string;
  metadata?: Record<string, string | number | boolean | null>;
  to: string;
}

/**
 * 将 renderer 的 project-index relation graph 转换成 IDE-neutral LSP view model。
 * Convert a renderer project-index relation graph into an IDE-neutral LSP view model.
 */
export function createHiaProjectRelationGraphResult(options: {
  projectIndex?: unknown;
  source?: HiaLspHostResultSource;
  uri: string;
}): HiaProjectRelationGraphResult {
  const projectIndex = asRecord(options.projectIndex);
  const source = options.source ?? (projectIndex ? "managed-document" : "none");

  if (!projectIndex) {
    return createUnavailableProjectRelationGraphResult(options.uri, "project-index-missing", source);
  }

  const relationGraph = asRecord(projectIndex.relationGraph);

  if (!relationGraph) {
    return createUnavailableProjectRelationGraphResult(options.uri, "project-relation-graph-missing", source);
  }

  const nodes = arrayValue(relationGraph.nodes).map(createProjectRelationNode).filter(isProjectRelationNode);
  const relations = arrayValue(relationGraph.relations).map(createProjectRelation).filter(isProjectRelation);
  const project = createProjectInfo(projectIndex.project);
  const contract = stringValue(relationGraph.contract);
  const contractVersion = stringValue(relationGraph.contractVersion);

  return {
    ...(contract ? { contract } : {}),
    ...(contractVersion ? { contractVersion } : {}),
    host: createHiaLspHostResultMeta({
      capability: HIA_LSP_PROJECT_RELATION_GRAPH_QUERY_CAPABILITY,
      ...(relations.length === 0 ? { emptyState: "relation-graph-empty" } : {}),
      method: HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST,
      source,
      version: HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST_VERSION
    }),
    nodeCount: numberValue(relationGraph.nodeCount) ?? nodes.length,
    nodes,
    ...(project ? { project } : {}),
    relationCount: numberValue(relationGraph.relationCount) ?? relations.length,
    relations,
    status: "available",
    uri: options.uri
  };
}

function createUnavailableProjectRelationGraphResult(
  uri: string,
  unavailableReason: HiaProjectRelationGraphUnavailableReason,
  source: HiaLspHostResultSource
): HiaProjectRelationGraphResult {
  return {
    host: createHiaLspHostResultMeta({
      capability: HIA_LSP_PROJECT_RELATION_GRAPH_QUERY_CAPABILITY,
      emptyState: "not-loaded",
      method: HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST,
      source,
      version: HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST_VERSION
    }),
    nodeCount: 0,
    nodes: [],
    relationCount: 0,
    relations: [],
    status: "unavailable",
    unavailableReason,
    uri
  };
}

function createProjectInfo(value: unknown): HiaProjectRelationProjectInfo | undefined {
  const project = asRecord(value);

  if (!project) {
    return undefined;
  }
  const defaultLocale = stringValue(project.defaultLocale);
  const id = stringValue(project.id);
  const name = stringValue(project.name);
  const title = stringValue(project.title);

  const item: HiaProjectRelationProjectInfo = {
    ...(defaultLocale ? { defaultLocale } : {}),
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...(title ? { title } : {})
  };
  const locales = stringArrayValue(project.locales);
  const views = stringArrayValue(project.views);

  if (locales.length > 0) {
    item.locales = locales;
  }

  if (views.length > 0) {
    item.views = views;
  }

  return Object.keys(item).length > 0 ? item : undefined;
}

function createProjectRelationNode(value: unknown): HiaProjectRelationNode | undefined {
  const node = asRecord(value);
  const id = stringValue(node?.id);
  const kind = stringValue(node?.kind);
  const label = stringValue(node?.label);
  const entryId = stringValue(node?.entryId);
  const path = stringValue(node?.path);
  const view = stringValue(node?.view);

  if (!id || !kind || !label) {
    return undefined;
  }

  return {
    ...(entryId ? { entryId } : {}),
    id,
    kind,
    label,
    ...(path ? { path } : {}),
    ...(view ? { view } : {})
  };
}

function createProjectRelation(value: unknown): HiaProjectRelation | undefined {
  const relation = asRecord(value);
  const from = stringValue(relation?.from);
  const id = stringValue(relation?.id);
  const kind = stringValue(relation?.kind);
  const label = stringValue(relation?.label);
  const to = stringValue(relation?.to);
  const confidence = stringValue(relation?.confidence);
  const entryId = stringValue(relation?.entryId);

  if (!from || !id || !kind || !label || !to) {
    return undefined;
  }

  const metadata = createRelationMetadata(relation?.metadata);

  return {
    ...(confidence ? { confidence } : {}),
    ...(entryId ? { entryId } : {}),
    from,
    id,
    kind,
    label,
    ...(metadata ? { metadata } : {}),
    to
  };
}

function createRelationMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined {
  const metadata = asRecord(value);

  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata)
    .filter((entry): entry is [string, string | number | boolean | null] => {
      const valueType = typeof entry[1];
      return entry[1] === null || valueType === "string" || valueType === "number" || valueType === "boolean";
    });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isProjectRelationNode(value: HiaProjectRelationNode | undefined): value is HiaProjectRelationNode {
  return Boolean(value);
}

function isProjectRelation(value: HiaProjectRelation | undefined): value is HiaProjectRelation {
  return Boolean(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
