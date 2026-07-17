/**
 * relation graph 中的 1-based source position。
 * A 1-based source position carried by a project relation graph.
 */
export interface HiaProjectRelationPosition {
  column?: number;
  line: number;
}

/**
 * `hia/projectRelationGraph` 的 VS Code 端消费形状。
 * The VS Code consumer shape for `hia/projectRelationGraph`.
 */
export interface HiaProjectRelationGraphSummary {
  contract?: string;
  contractVersion?: string;
  nodeCount?: number;
  nodes?: HiaProjectRelationNode[];
  project?: {
    id?: string;
    name?: string;
    title?: string;
  };
  relationCount?: number;
  relations?: HiaProjectRelation[];
  status?: string;
  unavailableReason?: string;
  uri?: string;
}

/**
 * relation graph 中的稳定节点。
 * Stable node in a project relation graph.
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
 * Directed relation in a project relation graph.
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
 * 供 VS Code relation picker 使用的稳定 summary。
 * A stable summary used by the VS Code relation picker.
 */
export interface HiaProjectRelationChoice {
  description: string;
  detail: string;
  fromNode?: HiaProjectRelationNode;
  label: string;
  relation: HiaProjectRelation;
  toNode?: HiaProjectRelationNode;
}

/**
 * 可打开的 relation graph 节点 target。
 * An openable relation graph node target.
 */
export interface HiaProjectRelationNavigationTarget {
  kind: "from-node" | "to-node";
  label: string;
  node: HiaProjectRelationNode;
  path: string;
  position?: HiaProjectRelationPosition;
}

/**
 * 为 LSP 返回的 relation graph 创建可读、稳定的 relation 选择项。
 * Create readable, stable relation picker choices from an LSP relation graph response.
 */
export function createHiaProjectRelationChoices(graph: HiaProjectRelationGraphSummary): HiaProjectRelationChoice[] {
  const nodesById = new Map((graph.nodes ?? []).map((node) => [node.id, node]));

  return (graph.relations ?? []).map((relation) => {
    const fromNode = nodesById.get(relation.from);
    const toNode = nodesById.get(relation.to);
    const fromLabel = formatProjectRelationNode(fromNode, relation.from);
    const toLabel = formatProjectRelationNode(toNode, relation.to);
    const description = [relation.kind, relation.confidence].filter(isNonEmptyString).join(" | ");
    const detail = [
      `${fromLabel} -> ${toLabel}`,
      relation.entryId ? `entry ${relation.entryId}` : undefined
    ].filter(isNonEmptyString).join(" | ");

    return {
      description,
      detail,
      label: relation.label || relation.id,
      relation,
      ...(fromNode ? { fromNode } : {}),
      ...(toNode ? { toNode } : {})
    };
  });
}

/**
 * 从 relation choice 提取可导航的 source、artifact 或其它带 path 的节点。
 * Extract navigable source, artifact or other path-backed nodes from a relation choice.
 */
export function createHiaProjectRelationNavigationTargets(choice: HiaProjectRelationChoice): HiaProjectRelationNavigationTarget[] {
  const targets: HiaProjectRelationNavigationTarget[] = [];

  pushProjectRelationNavigationTarget(targets, choice, "from-node", choice.fromNode);
  pushProjectRelationNavigationTarget(targets, choice, "to-node", choice.toNode);

  return targets;
}

function pushProjectRelationNavigationTarget(
  targets: HiaProjectRelationNavigationTarget[],
  choice: HiaProjectRelationChoice,
  kind: "from-node" | "to-node",
  node: HiaProjectRelationNode | undefined
): void {
  if (!node?.path) {
    return;
  }

  const position = node.kind === "source" ? getProjectRelationSourcePosition(choice.relation) : undefined;

  targets.push({
    kind,
    label: `Open ${formatProjectRelationNodeKind(node.kind)}: ${node.path}`,
    node,
    path: node.path,
    ...(position ? { position } : {})
  });
}

function getProjectRelationSourcePosition(relation: HiaProjectRelation): HiaProjectRelationPosition | undefined {
  const line = getPositiveNumberMetadata(relation.metadata, "rangeStartLine");
  const column = getPositiveNumberMetadata(relation.metadata, "rangeStartColumn");

  if (!line) {
    return undefined;
  }

  return {
    line,
    ...(column ? { column } : {})
  };
}

function getPositiveNumberMetadata(
  metadata: HiaProjectRelation["metadata"],
  key: string
): number | undefined {
  const value = metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function formatProjectRelationNode(node: HiaProjectRelationNode | undefined, fallback: string): string {
  if (!node) {
    return fallback;
  }

  return node.label || node.entryId || node.path || node.id;
}

function formatProjectRelationNodeKind(kind: string): string {
  if (kind === "artifact") {
    return "generated artifact";
  }

  if (kind === "source") {
    return "source";
  }

  if (kind === "entry") {
    return "documentation entry";
  }

  return kind;
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}
