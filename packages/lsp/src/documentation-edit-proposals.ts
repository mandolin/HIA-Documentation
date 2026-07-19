import type {
  Diagnostic,
  Range
} from "vscode-languageserver/node.js";
import type {
  HiaDiagnostic,
  HiaDocument,
  HiaSourceRange,
  HiaSymbol
} from "@hia-doc/core";
import type {
  DocSourceMapArtifactLink,
  DocSourceMapIndex,
  DocSourceMapIndexedEntry,
  DocSourceMapSourceLink
} from "@hia-doc/source-linkage";
import {
  createHiaResourceActions,
  type HiaLspAuthoringContext,
  type HiaLspResourceAction
} from "./authoring.js";
import {
  createHiaLspHostResultMeta,
  type HiaLspHostResultMeta,
  type HiaLspHostResultSource
} from "./host-contract.js";
import { HiaLspDiagnosticCode } from "./diagnostics.js";
import type {
  HiaProjectRelation,
  HiaProjectRelationEntry,
  HiaProjectRelationGraphResult,
  HiaProjectRelationNode
} from "./project-relations.js";

/**
 * AI 辅助文档修复候选的 LSP custom request 名称。
 * LSP custom request name for AI-assisted documentation edit proposals.
 */
export const HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST = "hia/documentationEditProposals";
export const HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST_VERSION = "0.1.0-draft";
export const HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT = "hia-documentation-edit-proposals";
export const HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION = "0.1.0-draft";
export const HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY = "hia.documentationEditProposal";

/**
 * `hia/documentationEditProposals` 请求参数。
 * Parameters for the `hia/documentationEditProposals` request.
 */
export interface HiaDocumentationEditProposalsParams {
  uri: string;
}

export type HiaDocumentationEditProposalsStatus = "available" | "unavailable";
export type HiaDocumentationEditProposalStatus = "review-required" | "blocked";
export type HiaDocumentationEditProposalKind =
  | "missing-locale-stub"
  | "missing-documentation"
  | "missing-translation"
  | "profile-rule-suggestion"
  | "generic-docline-diagnostic";
export type HiaDocumentationEditProposalUnavailableReason =
  | "document-not-open"
  | "proposal-source-empty";

/**
 * AI 可消费上下文的隐私边界。
 * Privacy boundary for AI-consumable authoring context.
 */
export interface HiaDocumentationEditProposalPrivacy {
  allowsAutomaticWrites: false;
  contextPolicy: "public-safe";
  includesSourceContent: false;
  requiresHumanReview: true;
  sourcesContentPolicy: "none";
}

/**
 * 宿主可展示的人工审查流程边界。
 * Human-review workflow boundary that hosts can present.
 */
export interface HiaDocumentationEditProposalWorkflow {
  allowedActions: string[];
  deniedActions: string[];
  defaultAction: "review";
}

/**
 * 不包含源码正文的文档摘要上下文。
 * Document summary context that excludes source text.
 */
export interface HiaDocumentationEditProposalDocumentContext {
  defaultLocale?: string;
  diagnosticCount: number;
  documentId?: string;
  docSourceMap?: HiaDocumentationEditProposalDocSourceMapContext;
  localeCount: number;
  locales: string[];
  missingLocaleCount: number;
  projectRelations?: HiaDocumentationEditProposalRelationContext;
  resourceCount: number;
  sourceReferenceCount: number;
  title?: string;
}

export interface HiaDocumentationEditProposalDocSourceMapContext {
  artifactCount: number;
  entryCount: number;
  linkedEntryCount: number;
  sourceCount: number;
  sourcesContentPolicy: string;
  status: string;
}

export interface HiaDocumentationEditProposalRelationContext {
  nodeCount: number;
  relationCount: number;
  status: string;
}

/**
 * proposal 来源，不包含私有源码正文。
 * Proposal origin without private source text.
 */
export interface HiaDocumentationEditProposalOrigin {
  capability: string;
  diagnosticCodes: string[];
  resourceActionId?: string;
  resourceActionKind?: string;
  source: "document-symbol" | "document-diagnostic" | "profile-diagnostic" | "resource-action";
}

/**
 * proposal 的目标定位。
 * Target location metadata for a proposal.
 */
export interface HiaDocumentationEditProposalTarget {
  diagnosticCode?: string;
  fieldPath?: string;
  key?: string;
  locale?: string;
  path?: string;
  range?: Range;
  relativePath?: string;
  resourcePath?: string;
  resourcePointer?: string;
  symbolId?: string;
  symbolName?: string;
  targetPath?: string;
  targetUri?: string;
}

/**
 * Public-safe diagnostic summary attached to a review proposal.
 *
 * 中文：附加到 review proposal 的公开安全诊断摘要。
 */
export interface HiaDocumentationEditProposalDiagnostic {
  code: string;
  message: string;
  severity: string;
  path?: string;
  targetPath?: string;
}

/**
 * Public-safe suggestion metadata for hosts and AI reviewers.
 *
 * 中文：供宿主和 AI 审查者消费的公开安全建议元数据。
 */
export interface HiaDocumentationEditProposalSuggestion {
  category: "missing-documentation" | "missing-translation" | "profile-rule" | "generic-docline";
  recommendedAction: string;
}

/**
 * 统一输出上下文桥；只携带公开安全的导航、source-map 与 relation 元数据。
 * Unified output context bridge; carries only public-safe navigation, source-map and relation metadata.
 */
export interface HiaDocumentationEditProposalUnifiedContext {
  docSourceMapEntries?: HiaDocumentationEditProposalDocSourceMapEntryContext[];
  matchedBy: string[];
  projectEntries?: HiaDocumentationEditProposalProjectEntryContext[];
  relations?: HiaDocumentationEditProposalRelationMatchContext[];
  status: "matched";
}

export interface HiaDocumentationEditProposalProjectEntryContext {
  artifactPath?: string;
  docSourceMapEntryId?: string;
  docSourceMapPath?: string;
  entryId: string;
  kind: string;
  name: string;
  projectId?: string;
  sourcePath?: string;
  symbolId?: string;
  view?: string;
}

export interface HiaDocumentationEditProposalDocSourceMapEntryContext {
  artifactLinks: HiaDocumentationEditProposalArtifactLinkContext[];
  diagnostics: string[];
  entryId: string;
  kind: string;
  manifestId?: string;
  manifestPath?: string;
  sourceLinks: HiaDocumentationEditProposalSourceLinkContext[];
  symbolId?: string;
  symbolKind?: string;
}

export interface HiaDocumentationEditProposalSourceLinkContext {
  confidence?: string;
  language?: string;
  path?: string;
  range?: HiaSourceRange;
  rangeSource?: string;
  sourceId: string;
}

export interface HiaDocumentationEditProposalArtifactLinkContext {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  selector?: string;
}

export interface HiaDocumentationEditProposalRelationMatchContext {
  confidence?: string;
  entryId?: string;
  from: HiaDocumentationEditProposalRelationNodeContext;
  id: string;
  kind: string;
  label: string;
  metadata?: Record<string, string | number | boolean | null>;
  to: HiaDocumentationEditProposalRelationNodeContext;
}

export interface HiaDocumentationEditProposalRelationNodeContext {
  entryId?: string;
  id: string;
  kind?: string;
  label?: string;
  path?: string;
  view?: string;
}

/**
 * 缺失 locale stub 的可审查编辑候选。
 * Reviewable edit proposal for a missing-locale stub.
 */
export interface HiaDocumentationEditProposal {
  diagnostic?: HiaDocumentationEditProposalDiagnostic;
  id: string;
  kind: HiaDocumentationEditProposalKind;
  origin: HiaDocumentationEditProposalOrigin;
  privacy: HiaDocumentationEditProposalPrivacy;
  review: HiaDocumentationEditProposalWorkflow;
  status: HiaDocumentationEditProposalStatus;
  suggestion?: HiaDocumentationEditProposalSuggestion;
  target: HiaDocumentationEditProposalTarget;
  title: string;
  unifiedContext?: HiaDocumentationEditProposalUnifiedContext;
  unavailableReason?: HiaDocumentationEditProposalUnavailableReason | string;
  workspaceEditBoundary?: string;
}

/**
 * LSP 返回给 IDE/host 的 AI 辅助文档编辑候选集合。
 * AI-assisted documentation edit proposal collection returned by the LSP to IDE/host clients.
 */
export interface HiaDocumentationEditProposalsResult {
  contract: typeof HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT;
  contractVersion: typeof HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION;
  context?: HiaDocumentationEditProposalDocumentContext;
  host: HiaLspHostResultMeta;
  privacy: HiaDocumentationEditProposalPrivacy;
  proposalCount: number;
  proposals: HiaDocumentationEditProposal[];
  status: HiaDocumentationEditProposalsStatus;
  unavailableReason?: HiaDocumentationEditProposalUnavailableReason;
  uri: string;
  workflow: HiaDocumentationEditProposalWorkflow;
}

/**
 * 创建 AI 辅助文档编辑候选。
 * Create AI-assisted documentation edit proposals.
 *
 * @lang zh-CN 第一轮只从既有 resource action preflight 生成候选，不返回源码正文，也不返回可直接 apply 的 WorkspaceEdit。
 * @lang en The first slice only derives proposals from existing resource-action preflight data; it returns no source text and no directly applicable WorkspaceEdit.
 */
export function createHiaDocumentationEditProposals(options: {
  context: HiaLspAuthoringContext;
  source?: HiaLspHostResultSource;
}): HiaDocumentationEditProposalsResult {
  const { context } = options;
  const source = options.source ?? (context.document ? "managed-document" : "none");
  const privacy = createPrivacyBoundary();
  const workflow = createWorkflowBoundary();

  if (!context.document) {
    return {
      contract: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
      contractVersion: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
      host: createHostMeta(source, "not-loaded"),
      privacy,
      proposalCount: 0,
      proposals: [],
      status: "unavailable",
      unavailableReason: "document-not-open",
      uri: context.uri,
      workflow
    };
  }

  const parsedDocument = parseHiaDocument(context.document.text);
  const resourceActions = createHiaResourceActions(context).actions;
  const proposals = attachUnifiedContexts([
    ...resourceActions.flatMap((action) => createProposalFromResourceAction(action, privacy, workflow)),
    ...createMissingDocumentationProposals(parsedDocument, privacy, workflow),
    ...createMissingTranslationDiagnosticProposals(context.document.diagnostics, resourceActions, privacy, workflow),
    ...createGenericDocLineDiagnosticProposals(parsedDocument, privacy, workflow),
    ...createProfileRuleSuggestionProposals(context.profileDiagnostics ?? [], privacy, workflow)
  ], context);

  return {
    contract: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
    contractVersion: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
    context: createDocumentContext(context),
    host: createHostMeta(source, proposals.length === 0 ? "source-data-empty" : undefined),
    privacy,
    proposalCount: proposals.length,
    proposals,
    status: "available",
    uri: context.uri,
    workflow
  };
}

function createProposalFromResourceAction(
  action: HiaLspResourceAction,
  privacy: HiaDocumentationEditProposalPrivacy,
  workflow: HiaDocumentationEditProposalWorkflow
): HiaDocumentationEditProposal[] {
  if (action.kind !== "create-missing-locale-stub") {
    return [];
  }

  const target = createProposalTarget(action);
  const proposal: HiaDocumentationEditProposal = {
    id: `reviewable:${action.id}`,
    kind: "missing-locale-stub",
    origin: {
      capability: action.capability,
      diagnosticCodes: [HiaLspDiagnosticCode.I18nLocaleMissing],
      resourceActionId: action.id,
      resourceActionKind: action.kind,
      source: "resource-action"
    },
    privacy,
    review: workflow,
    status: action.status === "preflight" ? "review-required" : "blocked",
    target,
    title: `Review ${action.locale ?? "missing"} locale resource stub`,
    ...(action.unavailableReason ? { unavailableReason: action.unavailableReason } : {}),
    ...(action.preflight?.workspaceEditBoundary ? { workspaceEditBoundary: action.preflight.workspaceEditBoundary } : {})
  };

  return [proposal];
}

function createMissingDocumentationProposals(
  document: HiaDocument | undefined,
  privacy: HiaDocumentationEditProposalPrivacy,
  workflow: HiaDocumentationEditProposalWorkflow
): HiaDocumentationEditProposal[] {
  if (!document) {
    return [];
  }

  return document.symbols
    .filter(isMissingDocumentationSymbol)
    .map((symbol) => {
      const source = getSymbolSourceTarget(symbol);
      const target: HiaDocumentationEditProposalTarget = {
        ...(source?.range ? { range: toLspRange(source.range) } : {}),
        ...(source?.relativePath ? { relativePath: source.relativePath } : {}),
        symbolId: symbol.id,
        symbolName: symbol.name
      };

      return {
        diagnostic: {
          code: "HIA_AI_MISSING_DOCUMENTATION",
          message: `Symbol ${symbol.name} has no summary or i18n documentation field.`,
          severity: "warning"
        },
        id: `reviewable:missing-documentation:${symbol.id}`,
        kind: "missing-documentation",
        origin: {
          capability: HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY,
          diagnosticCodes: ["HIA_AI_MISSING_DOCUMENTATION"],
          source: "document-symbol"
        },
        privacy,
        review: workflow,
        status: "review-required",
        suggestion: {
          category: "missing-documentation",
          recommendedAction: "Draft or review public documentation for this symbol before writing it to source."
        },
        target,
        title: `Review missing documentation for ${symbol.name}`,
        workspaceEditBoundary: "proposal-only"
      } satisfies HiaDocumentationEditProposal;
    });
}

function createMissingTranslationDiagnosticProposals(
  diagnostics: readonly Diagnostic[],
  resourceActions: readonly HiaLspResourceAction[],
  privacy: HiaDocumentationEditProposalPrivacy,
  workflow: HiaDocumentationEditProposalWorkflow
): HiaDocumentationEditProposal[] {
  const covered = new Set(
    resourceActions
      .filter((action) => action.kind === "create-missing-locale-stub")
      .map((action) => createTranslationKey(action.symbolId, action.fieldPath, action.locale))
  );

  return diagnostics
    .filter((diagnostic) => String(diagnostic.code) === HiaLspDiagnosticCode.I18nLocaleMissing)
    .flatMap((diagnostic, index) => {
      const data = isRecord(diagnostic.data) ? diagnostic.data : {};
      const symbolId = getString(data.symbolId);
      const fieldPath = getString(data.fieldPath);
      const locale = getString(data.locale);
      if (covered.has(createTranslationKey(symbolId, fieldPath, locale))) {
        return [];
      }

      return [{
        diagnostic: createDiagnosticSummary(diagnostic),
        id: `reviewable:missing-translation:${index}:${symbolId ?? "unknown"}:${fieldPath ?? "field"}:${locale ?? "locale"}`,
        kind: "missing-translation",
        origin: {
          capability: HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY,
          diagnosticCodes: [HiaLspDiagnosticCode.I18nLocaleMissing],
          source: "document-diagnostic"
        },
        privacy,
        review: workflow,
        status: "review-required",
        suggestion: {
          category: "missing-translation",
          recommendedAction: "Draft or review the missing localized text in the appropriate locale resource."
        },
        target: {
          ...(diagnostic.range ? { range: diagnostic.range } : {}),
          ...(fieldPath ? { fieldPath } : {}),
          ...(locale ? { locale } : {}),
          ...(symbolId ? { symbolId } : {})
        },
        title: `Review missing ${locale ?? "locale"} translation`,
        workspaceEditBoundary: "proposal-only"
      } satisfies HiaDocumentationEditProposal];
    });
}

function createGenericDocLineDiagnosticProposals(
  document: HiaDocument | undefined,
  privacy: HiaDocumentationEditProposalPrivacy,
  workflow: HiaDocumentationEditProposalWorkflow
): HiaDocumentationEditProposal[] {
  return (document?.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.code.startsWith("HIA_GENERIC_DOCLINE_"))
    .map((diagnostic, index) => ({
      diagnostic: createCoreDiagnosticSummary(diagnostic),
      id: `reviewable:generic-docline:${index}:${diagnostic.code}`,
      kind: "generic-docline-diagnostic",
      origin: {
        capability: HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY,
        diagnosticCodes: [diagnostic.code],
        source: "document-diagnostic"
      },
      privacy,
      review: workflow,
      status: diagnostic.severity === "error" ? "blocked" : "review-required",
      suggestion: {
        category: "generic-docline",
        recommendedAction: "Review the generic doc-line configuration or add documentation at the reported target."
      },
      target: {
        diagnosticCode: diagnostic.code,
        ...(diagnostic.path ? { path: diagnostic.path } : {}),
        ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
      },
      title: `Review generic doc-line diagnostic ${diagnostic.code}`,
      workspaceEditBoundary: "proposal-only"
    }));
}

function createProfileRuleSuggestionProposals(
  diagnostics: readonly HiaDiagnostic[],
  privacy: HiaDocumentationEditProposalPrivacy,
  workflow: HiaDocumentationEditProposalWorkflow
): HiaDocumentationEditProposal[] {
  return diagnostics.map((diagnostic, index) => ({
    diagnostic: createCoreDiagnosticSummary(diagnostic),
    id: `reviewable:profile-rule:${index}:${diagnostic.code}`,
    kind: "profile-rule-suggestion",
    origin: {
      capability: HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY,
      diagnosticCodes: [diagnostic.code],
      source: "profile-diagnostic"
    },
    privacy,
    review: workflow,
    status: diagnostic.severity === "error" ? "blocked" : "review-required",
    suggestion: {
      category: "profile-rule",
      recommendedAction: "Review the profile rule diagnostic and decide whether documentation or profile configuration needs an update."
    },
    target: {
      diagnosticCode: diagnostic.code,
      ...(diagnostic.path ? { path: diagnostic.path } : {}),
      ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
    },
    title: `Review profile rule suggestion ${diagnostic.code}`,
    workspaceEditBoundary: "proposal-only"
  }));
}

function createProposalTarget(action: HiaLspResourceAction): HiaDocumentationEditProposalTarget {
  const target: HiaDocumentationEditProposalTarget = {
    ...(action.fieldPath ? { fieldPath: action.fieldPath } : {}),
    ...(action.key ? { key: action.key } : {}),
    ...(action.locale ? { locale: action.locale } : {}),
    ...(action.path ? { path: action.path } : {}),
    ...(action.location?.range ? { range: action.location.range } : {}),
    ...(action.preflight?.resourcePath ?? action.resourcePath ? { resourcePath: action.preflight?.resourcePath ?? action.resourcePath } : {}),
    ...(action.preflight?.resourcePointer ?? action.resourcePointer ? { resourcePointer: action.preflight?.resourcePointer ?? action.resourcePointer } : {}),
    ...(action.symbolId ? { symbolId: action.symbolId } : {}),
    ...(action.symbolName ? { symbolName: action.symbolName } : {}),
    ...(action.preflight?.targetUri ?? action.targetUri ? { targetUri: action.preflight?.targetUri ?? action.targetUri } : {})
  };

  return target;
}

const MAX_UNIFIED_CONTEXT_ENTRIES = 5;
const MAX_UNIFIED_CONTEXT_RELATIONS = 10;

function attachUnifiedContexts(
  proposals: HiaDocumentationEditProposal[],
  context: HiaLspAuthoringContext
): HiaDocumentationEditProposal[] {
  return proposals.map((proposal) => {
    const unifiedContext = createUnifiedContext(context, proposal.target);
    return unifiedContext ? { ...proposal, unifiedContext } : proposal;
  });
}

function createUnifiedContext(
  context: HiaLspAuthoringContext,
  target: HiaDocumentationEditProposalTarget
): HiaDocumentationEditProposalUnifiedContext | undefined {
  const matchHints = new Set<string>();
  const docSourceMapEntries = collectDocSourceMapEntryContexts(context, target, matchHints);
  const projectEntries = collectProjectEntryContexts(context, target, docSourceMapEntries, matchHints);
  const relations = collectRelationContexts(context, projectEntries);

  if (relations.length > 0) {
    matchHints.add("project-relation");
  }

  if (docSourceMapEntries.length === 0 && projectEntries.length === 0 && relations.length === 0) {
    return undefined;
  }

  const unifiedContext: HiaDocumentationEditProposalUnifiedContext = {
    matchedBy: [...matchHints].sort(),
    status: "matched"
  };

  if (docSourceMapEntries.length > 0) {
    unifiedContext.docSourceMapEntries = docSourceMapEntries.slice(0, MAX_UNIFIED_CONTEXT_ENTRIES);
  }

  if (projectEntries.length > 0) {
    unifiedContext.projectEntries = projectEntries.slice(0, MAX_UNIFIED_CONTEXT_ENTRIES);
  }

  if (relations.length > 0) {
    unifiedContext.relations = relations.slice(0, MAX_UNIFIED_CONTEXT_RELATIONS);
  }

  return unifiedContext;
}

function collectDocSourceMapEntryContexts(
  context: HiaLspAuthoringContext,
  target: HiaDocumentationEditProposalTarget,
  matchHints: Set<string>
): HiaDocumentationEditProposalDocSourceMapEntryContext[] {
  const indexes = collectDocSourceMapIndexes(context);
  const entries: HiaDocumentationEditProposalDocSourceMapEntryContext[] = [];
  const seen = new Set<string>();

  for (const index of indexes) {
    for (const entry of index.entries) {
      const matchedBy = getDocSourceMapEntryMatchHints(entry, target);
      if (matchedBy.length === 0) {
        continue;
      }

      const key = `${index.id ?? index.path ?? "doc-source-map"}:${entry.id}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      matchedBy.forEach((hint) => matchHints.add(hint));
      entries.push(createDocSourceMapEntryContext(index, entry));
    }
  }

  return entries;
}

function collectProjectEntryContexts(
  context: HiaLspAuthoringContext,
  target: HiaDocumentationEditProposalTarget,
  docSourceMapEntries: readonly HiaDocumentationEditProposalDocSourceMapEntryContext[],
  matchHints: Set<string>
): HiaDocumentationEditProposalProjectEntryContext[] {
  const graphs = collectProjectRelationGraphs(context);
  const docSourceMapEntryIds = new Set(docSourceMapEntries.map((entry) => entry.entryId));
  const entries: HiaDocumentationEditProposalProjectEntryContext[] = [];
  const seen = new Set<string>();

  for (const graph of graphs) {
    for (const entry of graph.entries) {
      const matchedBy = getProjectEntryMatchHints(entry, target, docSourceMapEntryIds);
      if (matchedBy.length === 0) {
        continue;
      }

      const key = `${graph.project?.id ?? graph.uri}:${entry.id}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      matchedBy.forEach((hint) => matchHints.add(hint));
      entries.push(createProjectEntryContext(graph, entry));
    }
  }

  return entries;
}

function collectRelationContexts(
  context: HiaLspAuthoringContext,
  projectEntries: readonly HiaDocumentationEditProposalProjectEntryContext[]
): HiaDocumentationEditProposalRelationMatchContext[] {
  if (projectEntries.length === 0) {
    return [];
  }

  const projectEntryIds = new Set(projectEntries.map((entry) => entry.entryId));
  const graphs = collectProjectRelationGraphs(context);
  const relations: HiaDocumentationEditProposalRelationMatchContext[] = [];
  const seen = new Set<string>();

  for (const graph of graphs) {
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const relation of graph.relations) {
      if (!matchesProjectEntryRelation(relation, nodes, projectEntryIds)) {
        continue;
      }

      const key = `${graph.project?.id ?? graph.uri}:${relation.id}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      relations.push(createRelationMatchContext(relation, nodes));
    }
  }

  return relations;
}

function collectDocSourceMapIndexes(context: HiaLspAuthoringContext): DocSourceMapIndex[] {
  const indexes: DocSourceMapIndex[] = [];
  if (context.document?.docSourceMapIndex) {
    indexes.push(context.document.docSourceMapIndex);
  }
  indexes.push(...(context.docSourceMapIndexes ?? []));
  return indexes;
}

function collectProjectRelationGraphs(context: HiaLspAuthoringContext): HiaProjectRelationGraphResult[] {
  const graphs: HiaProjectRelationGraphResult[] = [];
  if (context.document?.projectRelationGraph) {
    graphs.push(context.document.projectRelationGraph);
  }
  graphs.push(...(context.projectRelationGraphs ?? []));
  return graphs.filter((graph) => graph.status === "available");
}

function getDocSourceMapEntryMatchHints(
  entry: DocSourceMapIndexedEntry,
  target: HiaDocumentationEditProposalTarget
): string[] {
  const hints: string[] = [];
  const targetPath = getTargetLookupPath(target);

  if (target.symbolId && entry.symbolId === target.symbolId) {
    hints.push("symbolId");
  }

  if (targetPath && entry.sourceLinks.some((link) => pathsEqual(link.path, targetPath))) {
    hints.push("sourcePath");
  }

  if (targetPath && entry.artifactLinks.some((link) => pathsEqual(link.path, targetPath))) {
    hints.push("artifactPath");
  }

  return hints;
}

function getProjectEntryMatchHints(
  entry: HiaProjectRelationEntry,
  target: HiaDocumentationEditProposalTarget,
  docSourceMapEntryIds: Set<string>
): string[] {
  const hints: string[] = [];
  const targetPath = getTargetLookupPath(target);

  if (target.symbolId && entry.symbolId === target.symbolId) {
    hints.push("project-entry-symbolId");
  }

  if (entry.docSourceMapEntryId && docSourceMapEntryIds.has(entry.docSourceMapEntryId)) {
    hints.push("doc-source-map-entry");
  }

  if (targetPath && pathsEqual(entry.sourcePath, targetPath)) {
    hints.push("project-entry-sourcePath");
  }

  if (targetPath && pathsEqual(entry.artifactPath, targetPath)) {
    hints.push("project-entry-artifactPath");
  }

  return hints;
}

function createDocSourceMapEntryContext(
  index: DocSourceMapIndex,
  entry: DocSourceMapIndexedEntry
): HiaDocumentationEditProposalDocSourceMapEntryContext {
  const context: HiaDocumentationEditProposalDocSourceMapEntryContext = {
    artifactLinks: entry.artifactLinks.map(createArtifactLinkContext),
    diagnostics: [...entry.diagnostics],
    entryId: entry.id,
    kind: entry.kind,
    sourceLinks: entry.sourceLinks.map(createSourceLinkContext)
  };

  if (index.id) {
    context.manifestId = index.id;
  }

  if (index.path && !index.path.startsWith("file://")) {
    context.manifestPath = index.path;
  }

  if (entry.symbolId) {
    context.symbolId = entry.symbolId;
  }

  if (entry.symbolKind) {
    context.symbolKind = entry.symbolKind;
  }

  return context;
}

function createProjectEntryContext(
  graph: HiaProjectRelationGraphResult,
  entry: HiaProjectRelationEntry
): HiaDocumentationEditProposalProjectEntryContext {
  const context: HiaDocumentationEditProposalProjectEntryContext = {
    entryId: entry.id,
    kind: entry.kind,
    name: entry.name
  };

  if (entry.artifactPath) {
    context.artifactPath = entry.artifactPath;
  }

  if (entry.docSourceMapEntryId) {
    context.docSourceMapEntryId = entry.docSourceMapEntryId;
  }

  if (entry.docSourceMapPath) {
    context.docSourceMapPath = entry.docSourceMapPath;
  }

  if (graph.project?.id) {
    context.projectId = graph.project.id;
  }

  if (entry.sourcePath) {
    context.sourcePath = entry.sourcePath;
  }

  if (entry.symbolId) {
    context.symbolId = entry.symbolId;
  }

  if (entry.view) {
    context.view = entry.view;
  }

  return context;
}

function createSourceLinkContext(link: DocSourceMapSourceLink): HiaDocumentationEditProposalSourceLinkContext {
  return {
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: link.path } : {}),
    ...(link.range ? { range: link.range } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {}),
    sourceId: link.sourceId
  };
}

function createArtifactLinkContext(link: DocSourceMapArtifactLink): HiaDocumentationEditProposalArtifactLinkContext {
  return {
    artifactId: link.artifactId,
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: link.path } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {}),
    ...(link.selector ? { selector: link.selector } : {})
  };
}

function matchesProjectEntryRelation(
  relation: HiaProjectRelation,
  nodes: Map<string, HiaProjectRelationNode>,
  projectEntryIds: Set<string>
): boolean {
  if (relation.entryId && projectEntryIds.has(relation.entryId)) {
    return true;
  }

  const from = nodes.get(relation.from);
  const to = nodes.get(relation.to);
  return Boolean(
    from?.entryId && projectEntryIds.has(from.entryId)
    || to?.entryId && projectEntryIds.has(to.entryId)
  );
}

function createRelationMatchContext(
  relation: HiaProjectRelation,
  nodes: Map<string, HiaProjectRelationNode>
): HiaDocumentationEditProposalRelationMatchContext {
  const context: HiaDocumentationEditProposalRelationMatchContext = {
    from: createRelationNodeContext(relation.from, nodes.get(relation.from)),
    id: relation.id,
    kind: relation.kind,
    label: relation.label,
    to: createRelationNodeContext(relation.to, nodes.get(relation.to))
  };

  if (relation.confidence) {
    context.confidence = relation.confidence;
  }

  if (relation.entryId) {
    context.entryId = relation.entryId;
  }

  if (relation.metadata) {
    context.metadata = relation.metadata;
  }

  return context;
}

function createRelationNodeContext(
  id: string,
  node: HiaProjectRelationNode | undefined
): HiaDocumentationEditProposalRelationNodeContext {
  const context: HiaDocumentationEditProposalRelationNodeContext = {
    id
  };

  if (node?.entryId) {
    context.entryId = node.entryId;
  }

  if (node?.kind) {
    context.kind = node.kind;
  }

  if (node?.label) {
    context.label = node.label;
  }

  if (node?.path) {
    context.path = node.path;
  }

  if (node?.view) {
    context.view = node.view;
  }

  return context;
}

function getTargetLookupPath(target: HiaDocumentationEditProposalTarget): string | undefined {
  return normalizeLookupPath(target.relativePath ?? target.resourcePath ?? target.targetPath ?? target.path);
}

function pathsEqual(left: string | undefined, right: string): boolean {
  const normalizedLeft = normalizeLookupPath(left);
  const normalizedRight = normalizeLookupPath(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeLookupPath(value: string | undefined): string | undefined {
  const normalized = value?.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized && !normalized.startsWith("file://") ? normalized : undefined;
}

function createDocumentContext(context: HiaLspAuthoringContext): HiaDocumentationEditProposalDocumentContext {
  const index = context.document?.resourceIndex;
  const docSourceMap = context.document?.docSourceMapIndex ?? context.docSourceMapIndexes?.[0];
  const projectRelations = context.document?.projectRelationGraph ?? context.projectRelationGraphs?.[0];

  return {
    ...(index?.defaultLocale ? { defaultLocale: index.defaultLocale } : {}),
    diagnosticCount: context.document?.diagnostics.length ?? 0,
    ...(index?.documentId ? { documentId: index.documentId } : {}),
    ...(docSourceMap
      ? {
          docSourceMap: {
            artifactCount: docSourceMap.artifactCount,
            entryCount: docSourceMap.entryCount,
            linkedEntryCount: docSourceMap.linkedEntryCount,
            sourceCount: docSourceMap.sourceCount,
            sourcesContentPolicy: docSourceMap.sourcesContentPolicy,
            status: docSourceMap.status
          }
        }
      : {}),
    localeCount: index?.locales.length ?? 0,
    locales: [...(index?.locales ?? [])],
    missingLocaleCount: index?.missingLocales.length ?? 0,
    ...(projectRelations
      ? {
          projectRelations: {
            nodeCount: projectRelations.nodeCount,
            relationCount: projectRelations.relationCount,
            status: projectRelations.status
          }
        }
      : {}),
    resourceCount: index?.i18nResources.length ?? 0,
    sourceReferenceCount: index?.sourceReferences.length ?? 0,
    ...(index?.title ? { title: index.title } : {})
  };
}

function parseHiaDocument(text: string): HiaDocument | undefined {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isHiaDocument(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isHiaDocument(value: unknown): value is HiaDocument {
  return isRecord(value)
    && Array.isArray(value.symbols)
    && Array.isArray(value.nodes)
    && typeof value.id === "string";
}

function isMissingDocumentationSymbol(symbol: HiaSymbol): boolean {
  const hasSummary = Boolean(symbol.summary?.trim());
  const hasI18nFields = Boolean(symbol.i18n?.fields && Object.keys(symbol.i18n.fields).length > 0);
  const hasSourceTarget = Boolean(getSymbolSourceTarget(symbol));
  return hasSourceTarget && !hasSummary && !hasI18nFields;
}

function getSymbolSourceTarget(symbol: HiaSymbol): { range?: HiaSourceRange; relativePath?: string } | undefined {
  const definedIn = symbol.source?.definedIn;
  if (definedIn) {
    return {
      ...(definedIn.range ? { range: definedIn.range } : {}),
      ...(definedIn.relativePath ? { relativePath: definedIn.relativePath } : {})
    };
  }

  const primaryBlock = symbol.source?.primaryBlock;
  if (primaryBlock) {
    return {
      ...(primaryBlock.range ? { range: primaryBlock.range } : {}),
      ...(primaryBlock.relativePath ? { relativePath: primaryBlock.relativePath } : {})
    };
  }

  const fragment = symbol.source?.fragments?.[0];
  if (fragment) {
    return {
      ...(fragment.range ? { range: fragment.range } : {}),
      ...(fragment.relativePath ? { relativePath: fragment.relativePath } : {})
    };
  }

  return undefined;
}

function toLspRange(range: HiaSourceRange): Range {
  return {
    start: {
      line: Math.max(0, range.start.line - 1),
      character: Math.max(0, (range.start.column ?? 1) - 1)
    },
    end: {
      line: Math.max(0, range.end.line - 1),
      character: Math.max(0, (range.end.column ?? 1) - 1)
    }
  };
}

function createTranslationKey(symbolId: string | undefined, fieldPath: string | undefined, locale: string | undefined): string {
  return `${symbolId ?? ""}:${fieldPath ?? ""}:${locale ?? ""}`;
}

function createDiagnosticSummary(diagnostic: Diagnostic): HiaDocumentationEditProposalDiagnostic {
  return {
    code: String(diagnostic.code ?? "HIA_LSP_DIAGNOSTIC"),
    message: diagnostic.message,
    severity: String(diagnostic.severity ?? "unknown")
  };
}

function createCoreDiagnosticSummary(diagnostic: HiaDiagnostic): HiaDocumentationEditProposalDiagnostic {
  const summary: HiaDocumentationEditProposalDiagnostic = {
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity
  };
  if (diagnostic.path) {
    summary.path = diagnostic.path;
  }
  if (diagnostic.targetPath) {
    summary.targetPath = diagnostic.targetPath;
  }
  return summary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function createPrivacyBoundary(): HiaDocumentationEditProposalPrivacy {
  return {
    allowsAutomaticWrites: false,
    contextPolicy: "public-safe",
    includesSourceContent: false,
    requiresHumanReview: true,
    sourcesContentPolicy: "none"
  };
}

function createWorkflowBoundary(): HiaDocumentationEditProposalWorkflow {
  return {
    allowedActions: ["review", "open-target", "copy-proposal", "cancel"],
    deniedActions: ["auto-apply", "write-target-file-without-review", "embed-private-source"],
    defaultAction: "review"
  };
}

function createHostMeta(
  source: HiaLspHostResultSource,
  emptyState: "not-loaded" | "source-data-empty" | undefined
): HiaLspHostResultMeta {
  return createHiaLspHostResultMeta({
    capability: HIA_DOCUMENTATION_EDIT_PROPOSAL_CAPABILITY,
    ...(emptyState ? { emptyState } : {}),
    method: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
    source,
    version: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST_VERSION
  });
}
