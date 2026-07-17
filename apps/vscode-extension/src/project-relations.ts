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
 * VS Code relation picker 中的第二层动作。
 * A second-level action shown after a VS Code relation picker choice.
 */
export type HiaProjectRelationActionChoice =
  | {
      actionKind: "target";
      description?: string;
      label: string;
      target: HiaProjectRelationNavigationTarget;
    }
  | {
      actionKind: "copy-entry-id" | "copy-relation-id" | "documentation-preview";
      description?: string;
      label: string;
    };

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

/**
 * 为某一 relation 生成可测试、宿主无关的 VS Code picker 动作模型。
 * Create a testable, host-neutral VS Code picker action model for one relation.
 */
export function createHiaProjectRelationActionChoices(choice: HiaProjectRelationChoice): HiaProjectRelationActionChoice[] {
  const navigationItems = createHiaProjectRelationNavigationTargets(choice).map((target) => ({
    actionKind: "target" as const,
    description: target.position ? `line ${target.position.line}` : target.node.kind,
    label: target.label,
    target
  }));
  const actions: HiaProjectRelationActionChoice[] = [
    ...navigationItems,
    {
      actionKind: "documentation-preview",
      description: "Uses the existing HIA: Open Preview command",
      label: "Open documentation preview"
    },
    {
      actionKind: "copy-relation-id",
      description: choice.relation.id,
      label: "Copy project relation id"
    }
  ];

  if (choice.relation.entryId) {
    actions.push({
      actionKind: "copy-entry-id",
      description: choice.relation.entryId,
      label: "Copy documentation entry id"
    });
  }

  return actions;
}

/**
 * 生成 VS Code runtime confirmation 可记录的 relation graph 摘要。
 * Create a relation graph summary that can be recorded during VS Code runtime confirmation.
 */
export function createHiaProjectRelationRuntimeReport(graph: HiaProjectRelationGraphSummary): string[] {
  const choices = createHiaProjectRelationChoices(graph);
  const targets = choices.flatMap((choice) => createHiaProjectRelationNavigationTargets(choice));
  const projectName = graph.project?.name || graph.project?.title || graph.project?.id;
  const lines = [
    `Status: ${graph.status || "unknown"}`,
    `Relations: ${graph.relationCount ?? graph.relations?.length ?? 0}`,
    `Nodes: ${graph.nodeCount ?? graph.nodes?.length ?? 0}`,
    `Picker choices: ${choices.length}`,
    `Navigation targets: ${targets.length}`
  ];

  if (projectName) {
    lines.unshift(`Project: ${projectName}`);
  }

  if (graph.uri) {
    lines.push(`URI: ${graph.uri}`);
  }

  if (graph.contract || graph.contractVersion) {
    lines.push(`Contract: ${[graph.contract, graph.contractVersion].filter(isNonEmptyString).join("@")}`);
  }

  const relationKindCounts = countBy((graph.relations ?? []).map((relation) => relation.kind));
  const nodeKindCounts = countBy((graph.nodes ?? []).map((node) => node.kind));
  const targetKindCounts = countBy(targets.map((target) => target.node.kind));

  lines.push(`Relation kinds: ${formatCounts(relationKindCounts)}`);
  lines.push(`Node kinds: ${formatCounts(nodeKindCounts)}`);
  lines.push(`Openable target kinds: ${formatCounts(targetKindCounts)}`);

  if (graph.unavailableReason) {
    lines.push(`Unavailable reason: ${graph.unavailableReason}`);
  }

  return lines;
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

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function formatCounts(counts: Map<string, number>): string {
  if (counts.size === 0) {
    return "none";
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}
