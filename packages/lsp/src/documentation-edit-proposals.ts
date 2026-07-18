import type {
  Range
} from "vscode-languageserver/node.js";
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
export type HiaDocumentationEditProposalKind = "missing-locale-stub";
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
  source: "resource-action";
}

/**
 * proposal 的目标定位。
 * Target location metadata for a proposal.
 */
export interface HiaDocumentationEditProposalTarget {
  fieldPath?: string;
  key?: string;
  locale?: string;
  path?: string;
  range?: Range;
  resourcePath?: string;
  resourcePointer?: string;
  symbolId?: string;
  symbolName?: string;
  targetUri?: string;
}

/**
 * 缺失 locale stub 的可审查编辑候选。
 * Reviewable edit proposal for a missing-locale stub.
 */
export interface HiaDocumentationEditProposal {
  id: string;
  kind: HiaDocumentationEditProposalKind;
  origin: HiaDocumentationEditProposalOrigin;
  privacy: HiaDocumentationEditProposalPrivacy;
  review: HiaDocumentationEditProposalWorkflow;
  status: HiaDocumentationEditProposalStatus;
  target: HiaDocumentationEditProposalTarget;
  title: string;
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

  const resourceActions = createHiaResourceActions(context).actions;
  const proposals = resourceActions.flatMap((action) => createProposalFromResourceAction(action, privacy, workflow));

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

function createDocumentContext(context: HiaLspAuthoringContext): HiaDocumentationEditProposalDocumentContext {
  const index = context.document?.resourceIndex;
  const docSourceMap = context.document?.docSourceMapIndex;
  const projectRelations = context.document?.projectRelationGraph;

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
