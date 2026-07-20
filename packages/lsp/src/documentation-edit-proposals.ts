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
export const HIA_AI_CONTEXT_PACKAGE_CONTRACT = "hia-ai-context-package";
export const HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION = "0.1.0-draft";
export const HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT = "hia-documentation-draft-text";
export const HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT_VERSION = "0.1.0-draft";
export const HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT = "hia-documentation-review-payload";
export const HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT_VERSION = "0.1.0-draft";

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
export type HiaDocumentationEditProposalDraftKind =
  | "documentation-stub"
  | "translation-stub";
export type HiaDocumentationEditProposalDraftTextFormat = "plain-text";
export type HiaDocumentationReviewPayloadQualityStatus =
  | "blocked"
  | "pass"
  | "warning";
export type HiaDocumentationReviewPayloadRiskLevel =
  | "blocked"
  | "low"
  | "medium";
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
 * Draft text 的隐私边界；第一轮不携带源码正文或 source-map `sourcesContent`。
 * Privacy boundary for draft text; the first slice carries no source body or source-map `sourcesContent`.
 */
export interface HiaDocumentationEditProposalDraftPrivacy {
  includesSourceBody: false;
  sourcesContentPolicy: "none";
}

/**
 * 可审阅的 documentation / translation 草稿文本。
 * Reviewable documentation / translation draft text.
 *
 * @lang zh-CN 该结构只表达候选文本，不代表可直接写入源码；宿主必须继续走人工审查。
 * @lang en This shape only expresses candidate text; it is not a directly writable source edit, and hosts must keep human review in the loop.
 */
export interface HiaDocumentationEditProposalDraft {
  allowsAutomaticWrites: false;
  contract: typeof HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT;
  contractVersion: typeof HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT_VERSION;
  draftKind: HiaDocumentationEditProposalDraftKind;
  fieldPath?: string;
  generationBasis: "public-metadata-only";
  localeDrafts: Record<string, string>;
  privacy: HiaDocumentationEditProposalDraftPrivacy;
  qualityNotes: string[];
  requiresHumanReview: true;
  targetLocale?: string;
  text: string;
  textFormat: HiaDocumentationEditProposalDraftTextFormat;
  usesSourceBody: false;
}

/**
 * AI 上下文包的源码摘录策略。
 * Source-excerpt policy for an AI context package.
 */
export interface HiaAiContextPackageSourceExcerptPolicy {
  includesSourceBody: false;
  maxExcerptCharacters: 0;
  mode: "none";
  optInRequired: true;
}

/**
 * AI 上下文包的选择策略。
 * Selection policy for an AI context package.
 */
export interface HiaAiContextPackageSelectionPolicy {
  contextPolicy: "public-safe";
  excludedContextKinds: string[];
  includedContextKinds: string[];
  maxDocSourceMapEntries: number;
  maxProjectEntries: number;
  maxRelations: number;
  sourceExcerptPolicy: HiaAiContextPackageSourceExcerptPolicy;
}

/**
 * AI 上下文包的隐私边界。
 * Privacy boundary for an AI context package.
 */
export interface HiaAiContextPackagePrivacy {
  allowsAbsolutePaths: false;
  allowsPrivateWorkspacePaths: false;
  allowsTargetRepositoryMutation: false;
  includesSourceContent: false;
  includesSourceExcerpt: false;
  sourceExcerptPolicy: HiaAiContextPackageSourceExcerptPolicy;
  sourcesContentPolicy: "none";
}

export interface HiaAiContextPackageRequestInfo {
  method: typeof HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST;
  uriPolicy: "redacted";
  version: typeof HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST_VERSION;
}

export interface HiaAiContextPackageLocaleState {
  defaultLocale?: string;
  localeCount: number;
  locales: string[];
  missingLocaleCount: number;
  missingLocales: HiaAiContextPackageMissingLocale[];
}

export interface HiaAiContextPackageMissingLocale {
  fieldPath: string;
  locale: string;
  symbolId: string;
  symbolName: string;
}

export interface HiaAiContextPackageDiagnosticContext {
  code: string;
  message: string;
  path?: string;
  severity: string;
  targetPath?: string;
}

export interface HiaAiContextPackageTarget {
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
}

export interface HiaAiContextPackageProposalContext {
  contextId: string;
  diagnostic?: HiaDocumentationEditProposalDiagnostic;
  kind: HiaDocumentationEditProposalKind;
  origin: HiaDocumentationEditProposalOrigin;
  proposalId: string;
  status: HiaDocumentationEditProposalStatus;
  suggestion?: HiaDocumentationEditProposalSuggestion;
  target: HiaAiContextPackageTarget;
  title: string;
  unifiedContext?: HiaDocumentationEditProposalUnifiedContext;
}

export interface HiaAiContextPackageIntegrityDiagnostic {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface HiaAiContextPackageIntegrity {
  diagnostics: HiaAiContextPackageIntegrityDiagnostic[];
  status: "failed" | "pass";
}

/**
 * 可供 AI/IDE 审查流程消费的公开安全上下文包。
 * Public-safe context package for AI/IDE review workflows.
 */
export interface HiaAiContextPackage {
  contract: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT;
  contractVersion: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION;
  diagnostics: HiaAiContextPackageDiagnosticContext[];
  document?: HiaDocumentationEditProposalDocumentContext;
  id: string;
  integrity: HiaAiContextPackageIntegrity;
  localeState?: HiaAiContextPackageLocaleState;
  packageKind: "proposal-review-context";
  privacy: HiaAiContextPackagePrivacy;
  proposalContexts: HiaAiContextPackageProposalContext[];
  proposalCount: number;
  request: HiaAiContextPackageRequestInfo;
  selectionPolicy: HiaAiContextPackageSelectionPolicy;
}

/**
 * proposal 到 AI 上下文包中对应片段的引用。
 * Reference from a proposal to its context inside the AI context package.
 */
export interface HiaAiContextPackageRef {
  contract: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT;
  contractVersion: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION;
  includesSourceContent: false;
  packageId: string;
  proposalContextId: string;
  sourceExcerptPolicy: "none";
}

export interface HiaDocumentationReviewPayloadPrivacy {
  allowsAutomaticWrites: false;
  allowsTargetRepositoryMutation: false;
  contextPolicy: "public-safe";
  includesDraftText: boolean;
  includesSourceContent: false;
  requiresHumanReview: true;
  sourcesContentPolicy: "none";
}

export interface HiaDocumentationReviewPayloadActionPolicy {
  allowedActions: string[];
  defaultAction: "review";
  deniedActions: string[];
}

export interface HiaDocumentationReviewPayloadAiContextRef {
  contract: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT;
  contractVersion: typeof HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION;
  integrityStatus: HiaAiContextPackageIntegrity["status"];
  packageId: string;
  sourceExcerptPolicy: "none";
}

export interface HiaDocumentationReviewPayloadSummary {
  blockedCount: number;
  draftCount: number;
  itemCount: number;
  qualityBlockedCount: number;
  qualityCheckCount: number;
  qualityWarningCount: number;
  reviewRequiredCount: number;
  unifiedContextCount: number;
}

export interface HiaDocumentationReviewPayloadLocaleQualitySummary {
  canonicalJsOutput: "@lang/<lang>";
  checkSummary: {
    blocked: number;
    pass: number;
    warning: number;
  };
  defaultLocale?: string;
  documentLocales: string[];
  legacyLocaleTagsPolicy: "compat-input-only";
  missingLocaleCount: number;
  policyLocales: string[];
  sourceDocumentScope: "source-document";
  sourceDocumentTruth: "HiaI18nModel.fields";
  staleLocaleStatus: "not-evaluated";
}

export interface HiaDocumentationReviewPayloadRisk {
  level: HiaDocumentationReviewPayloadRiskLevel;
  reasons: string[];
}

export interface HiaDocumentationReviewPayloadActionHints {
  allowedActions: string[];
  applyAvailable: false;
  copyDraftAvailable: boolean;
  deniedActions: string[];
  openContextAvailable: boolean;
  openTargetAvailable: boolean;
  primaryAction: "review";
}

export interface HiaDocumentationReviewPayloadQualityCheck {
  code: string;
  message: string;
  status: HiaDocumentationReviewPayloadQualityStatus;
}

export interface HiaDocumentationReviewPayloadContextLinks {
  aiContextPackageRef?: HiaAiContextPackageRef;
  docSourceMapEntries?: HiaDocumentationEditProposalDocSourceMapEntryContext[];
  docSourceMapEntryCount: number;
  projectEntries?: HiaDocumentationEditProposalProjectEntryContext[];
  projectEntryCount: number;
  relationCount: number;
  relations?: HiaDocumentationEditProposalRelationMatchContext[];
}

export interface HiaDocumentationReviewPayloadItem {
  actionHints: HiaDocumentationReviewPayloadActionHints;
  contextLinks: HiaDocumentationReviewPayloadContextLinks;
  diagnostic?: HiaDocumentationEditProposalDiagnostic;
  draft?: HiaDocumentationEditProposalDraft;
  id: string;
  kind: HiaDocumentationEditProposalKind;
  proposalId: string;
  qualityChecks: HiaDocumentationReviewPayloadQualityCheck[];
  risk: HiaDocumentationReviewPayloadRisk;
  status: HiaDocumentationEditProposalStatus;
  suggestion?: HiaDocumentationEditProposalSuggestion;
  target: HiaAiContextPackageTarget;
  title: string;
  workspaceEditBoundary?: string;
}

/**
 * 宿主中立的审查面板 payload。
 * Host-neutral review panel payload.
 *
 * @lang zh-CN 该 payload 面向 VS Code、DevTools、Visual Studio 或 CLI 审查器，不承载源码写入动作。
 * @lang en This payload targets VS Code, DevTools, Visual Studio or CLI reviewers and carries no source-writing action.
 */
export interface HiaDocumentationReviewPayload {
  actionPolicy: HiaDocumentationReviewPayloadActionPolicy;
  aiContextPackage?: HiaDocumentationReviewPayloadAiContextRef;
  contract: typeof HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT;
  contractVersion: typeof HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT_VERSION;
  draftCount: number;
  integrity: HiaAiContextPackageIntegrity;
  items: HiaDocumentationReviewPayloadItem[];
  localeQuality: HiaDocumentationReviewPayloadLocaleQualitySummary;
  payloadKind: "host-neutral-review-panel";
  privacy: HiaDocumentationReviewPayloadPrivacy;
  proposalCount: number;
  request: HiaAiContextPackageRequestInfo;
  summary: HiaDocumentationReviewPayloadSummary;
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
  aiContextPackageRef?: HiaAiContextPackageRef;
  diagnostic?: HiaDocumentationEditProposalDiagnostic;
  draft?: HiaDocumentationEditProposalDraft;
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
  aiContextPackage?: HiaAiContextPackage;
  contract: typeof HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT;
  contractVersion: typeof HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION;
  context?: HiaDocumentationEditProposalDocumentContext;
  draftCount: number;
  host: HiaLspHostResultMeta;
  privacy: HiaDocumentationEditProposalPrivacy;
  proposalCount: number;
  proposals: HiaDocumentationEditProposal[];
  reviewPayload?: HiaDocumentationReviewPayload;
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
      draftCount: 0,
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
  const unifiedProposals = attachUnifiedContexts([
    ...resourceActions.flatMap((action) => createProposalFromResourceAction(action, privacy, workflow)),
    ...createMissingDocumentationProposals(parsedDocument, privacy, workflow),
    ...createMissingTranslationDiagnosticProposals(context.document.diagnostics, resourceActions, privacy, workflow),
    ...createGenericDocLineDiagnosticProposals(parsedDocument, privacy, workflow),
    ...createProfileRuleSuggestionProposals(context.profileDiagnostics ?? [], privacy, workflow)
  ], context);
  const aiContextPackage = createHiaAiContextPackage({
    context,
    documentContext: createDocumentContext(context),
    proposals: unifiedProposals
  });
  const proposals = attachAiContextPackageRefs(unifiedProposals, aiContextPackage);
  const reviewPayload = createHiaDocumentationReviewPayload({
    aiContextPackage,
    proposals
  });

  return {
    aiContextPackage,
    contract: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT,
    contractVersion: HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION,
    context: createDocumentContext(context),
    draftCount: countProposalDrafts(proposals),
    host: createHostMeta(source, proposals.length === 0 ? "source-data-empty" : undefined),
    privacy,
    proposalCount: proposals.length,
    proposals,
    reviewPayload,
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
    draft: createMissingLocaleStubDraft(action),
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
        draft: createMissingDocumentationDraft(symbol),
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
        draft: createMissingTranslationDraft({
          fieldPath,
          locale,
          symbolId
        }),
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

function createMissingLocaleStubDraft(action: HiaLspResourceAction): HiaDocumentationEditProposalDraft {
  const targetLocale = sanitizeDraftMetadataValue(action.locale, "und");
  const fieldPath = sanitizeDraftMetadataValue(action.fieldPath ?? action.key, "documentation");
  const subject = createDraftSubject(action.symbolName ?? action.symbolId, "target symbol");
  const text = `TODO(${targetLocale}): Review localized ${fieldPath} text for ${subject}.`;

  return createDraftText({
    draftKind: "translation-stub",
    fieldPath,
    localeDrafts: {
      [targetLocale]: text
    },
    targetLocale,
    text
  });
}

function createMissingDocumentationDraft(symbol: HiaSymbol): HiaDocumentationEditProposalDraft {
  const subject = createDraftSubject(symbol.name ?? symbol.id, "symbol");
  const kind = sanitizeDraftMetadataValue(symbol.kind, "symbol");
  const text = `TODO: Review documentation draft for ${kind} ${subject}.`;

  return createDraftText({
    draftKind: "documentation-stub",
    localeDrafts: {
      "en": `TODO: Document ${kind} ${subject}.`,
      "zh-CN": `TODO: 补充 ${kind} ${subject} 的文档说明。`
    },
    text
  });
}

function createMissingTranslationDraft(options: {
  fieldPath: string | undefined;
  locale: string | undefined;
  symbolId: string | undefined;
}): HiaDocumentationEditProposalDraft {
  const targetLocale = sanitizeDraftMetadataValue(options.locale, "und");
  const fieldPath = sanitizeDraftMetadataValue(options.fieldPath, "documentation");
  const subject = createDraftSubject(options.symbolId, "target symbol");
  const text = `TODO(${targetLocale}): Review localized ${fieldPath} text for ${subject}.`;

  return createDraftText({
    draftKind: "translation-stub",
    fieldPath,
    localeDrafts: {
      [targetLocale]: text
    },
    targetLocale,
    text
  });
}

function createDraftText(options: {
  draftKind: HiaDocumentationEditProposalDraftKind;
  fieldPath?: string;
  localeDrafts: Record<string, string>;
  targetLocale?: string;
  text: string;
}): HiaDocumentationEditProposalDraft {
  return {
    allowsAutomaticWrites: false,
    contract: HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT,
    contractVersion: HIA_DOCUMENTATION_DRAFT_TEXT_CONTRACT_VERSION,
    draftKind: options.draftKind,
    ...(options.fieldPath ? { fieldPath: options.fieldPath } : {}),
    generationBasis: "public-metadata-only",
    localeDrafts: options.localeDrafts,
    privacy: {
      includesSourceBody: false,
      sourcesContentPolicy: "none"
    },
    qualityNotes: [
      "Generated from public metadata only; no source body or existing localized text was used.",
      "Human review is required before writing this draft to any source or locale resource."
    ],
    requiresHumanReview: true,
    ...(options.targetLocale ? { targetLocale: options.targetLocale } : {}),
    text: options.text,
    textFormat: "plain-text",
    usesSourceBody: false
  };
}

function countProposalDrafts(proposals: readonly HiaDocumentationEditProposal[]): number {
  return proposals.filter((proposal) => proposal.draft).length;
}

const MAX_DRAFT_METADATA_LENGTH = 80;

function createDraftSubject(value: string | undefined, fallback: string): string {
  return sanitizeDraftMetadataValue(value, fallback);
}

function sanitizeDraftMetadataValue(value: string | undefined, fallback: string): string {
  if (!value || !isPublicSafeContextString(value)) {
    return fallback;
  }

  const normalized = value
    .replace(/[^\p{Letter}\p{Number}_.:-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return normalized.slice(0, MAX_DRAFT_METADATA_LENGTH) || fallback;
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

/**
 * 创建 AI context package，并在返回前执行隐私完整性检查。
 * Create an AI context package and run privacy integrity checks before returning it.
 */
export function createHiaAiContextPackage(options: {
  context: HiaLspAuthoringContext;
  documentContext?: HiaDocumentationEditProposalDocumentContext;
  proposals: readonly HiaDocumentationEditProposal[];
}): HiaAiContextPackage {
  const sourceExcerptPolicy = createNoSourceExcerptPolicy();
  const localeState = createAiContextLocaleState(options.context);
  const packageWithoutIntegrity: Omit<HiaAiContextPackage, "integrity"> = {
    contract: HIA_AI_CONTEXT_PACKAGE_CONTRACT,
    contractVersion: HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION,
    diagnostics: createAiContextDiagnostics(options.proposals),
    ...(options.documentContext ? { document: options.documentContext } : {}),
    id: createAiContextPackageId(options.context, options.proposals),
    ...(localeState ? { localeState } : {}),
    packageKind: "proposal-review-context",
    privacy: {
      allowsAbsolutePaths: false,
      allowsPrivateWorkspacePaths: false,
      allowsTargetRepositoryMutation: false,
      includesSourceContent: false,
      includesSourceExcerpt: false,
      sourceExcerptPolicy,
      sourcesContentPolicy: "none"
    },
    proposalContexts: options.proposals.map(createAiProposalContext),
    proposalCount: options.proposals.length,
    request: {
      method: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
      uriPolicy: "redacted",
      version: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST_VERSION
    },
    selectionPolicy: {
      contextPolicy: "public-safe",
      excludedContextKinds: [
        "source-body",
        "inline-source-preview",
        "sourcesContent",
        "absolute-path",
        "workspace-private-path",
        "target-repository-mutation"
      ],
      includedContextKinds: [
        "document-summary",
        "diagnostic-summary",
        "locale-state",
        "proposal-target",
        "doc-source-map-entry",
        "project-entry",
        "relation-summary"
      ],
      maxDocSourceMapEntries: MAX_UNIFIED_CONTEXT_ENTRIES,
      maxProjectEntries: MAX_UNIFIED_CONTEXT_ENTRIES,
      maxRelations: MAX_UNIFIED_CONTEXT_RELATIONS,
      sourceExcerptPolicy
    }
  };

  return {
    ...packageWithoutIntegrity,
    integrity: validateHiaAiContextPackagePrivacy(packageWithoutIntegrity)
  };
}

/**
 * 校验 AI context package 没有携带默认禁止的源码、绝对路径或私有工作区标记。
 * Validate that an AI context package does not carry blocked source content, absolute paths, or private workspace markers.
 */
export function validateHiaAiContextPackagePrivacy(value: unknown): HiaAiContextPackageIntegrity {
  const serialized = JSON.stringify(value);
  const diagnostics: HiaAiContextPackageIntegrityDiagnostic[] = [];

  if (serialized.includes("\"sourcesContent\":")) {
    diagnostics.push({
      code: "HIA_AI_CONTEXT_SOURCES_CONTENT",
      message: "AI context package must not embed sourcesContent.",
      severity: "error"
    });
  }

  if (/(?:file:\/\/|[A-Za-z]:[\\/]|\\\\)/u.test(serialized)) {
    diagnostics.push({
      code: "HIA_AI_CONTEXT_ABSOLUTE_PATH",
      message: "AI context package must not expose file URLs, Windows drive paths, or UNC paths.",
      severity: "error"
    });
  }

  if (/(?:work-zone|WorkZone|\.codex|Users[\\/]|AppData[\\/])/u.test(serialized)) {
    diagnostics.push({
      code: "HIA_AI_CONTEXT_PRIVATE_WORKSPACE_PATH",
      message: "AI context package must not expose private workspace, Codex, user profile, or AppData paths.",
      severity: "error"
    });
  }

  return {
    diagnostics,
    status: diagnostics.length > 0 ? "failed" : "pass"
  };
}

function attachAiContextPackageRefs(
  proposals: HiaDocumentationEditProposal[],
  aiContextPackage: HiaAiContextPackage
): HiaDocumentationEditProposal[] {
  const proposalContextIds = new Set(aiContextPackage.proposalContexts.map((context) => context.contextId));

  return proposals.map((proposal) => {
    const proposalContextId = createAiProposalContextId(proposal.id);

    if (!proposalContextIds.has(proposalContextId)) {
      return proposal;
    }

    return {
      ...proposal,
      aiContextPackageRef: {
        contract: HIA_AI_CONTEXT_PACKAGE_CONTRACT,
        contractVersion: HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION,
        includesSourceContent: false,
        packageId: aiContextPackage.id,
        proposalContextId,
        sourceExcerptPolicy: "none"
      }
    };
  });
}

/**
 * 创建宿主中立的 review payload。
 * Create a host-neutral review payload.
 */
export function createHiaDocumentationReviewPayload(options: {
  aiContextPackage?: HiaAiContextPackage;
  proposals: readonly HiaDocumentationEditProposal[];
}): HiaDocumentationReviewPayload {
  const items = options.proposals.map((proposal) => createReviewPayloadItem(proposal, options.aiContextPackage?.localeState));
  const draftCount = countProposalDrafts(options.proposals);
  const actionPolicy = createReviewPayloadActionPolicy();
  const payloadWithoutIntegrity: Omit<HiaDocumentationReviewPayload, "integrity"> = {
    actionPolicy,
    ...(options.aiContextPackage ? {
      aiContextPackage: {
        contract: HIA_AI_CONTEXT_PACKAGE_CONTRACT,
        contractVersion: HIA_AI_CONTEXT_PACKAGE_CONTRACT_VERSION,
        integrityStatus: options.aiContextPackage.integrity.status,
        packageId: options.aiContextPackage.id,
        sourceExcerptPolicy: "none"
      }
    } : {}),
    contract: HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT,
    contractVersion: HIA_DOCUMENTATION_REVIEW_PAYLOAD_CONTRACT_VERSION,
    draftCount,
    items,
    localeQuality: createReviewPayloadLocaleQualitySummary(options.aiContextPackage?.localeState, items),
    payloadKind: "host-neutral-review-panel",
    privacy: {
      allowsAutomaticWrites: false,
      allowsTargetRepositoryMutation: false,
      contextPolicy: "public-safe",
      includesDraftText: draftCount > 0,
      includesSourceContent: false,
      requiresHumanReview: true,
      sourcesContentPolicy: "none"
    },
    proposalCount: options.proposals.length,
    request: {
      method: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
      uriPolicy: "redacted",
      version: HIA_LSP_DOCUMENTATION_EDIT_PROPOSALS_REQUEST_VERSION
    },
    summary: createReviewPayloadSummary(items, draftCount)
  };

  return {
    ...payloadWithoutIntegrity,
    integrity: validateHiaDocumentationReviewPayloadPrivacy(payloadWithoutIntegrity)
  };
}

/**
 * 校验 review payload 不泄漏源码正文、绝对路径或私有工作区路径。
 * Validate that the review payload does not leak source text, absolute paths or private workspace paths.
 */
export function validateHiaDocumentationReviewPayloadPrivacy(value: unknown): HiaAiContextPackageIntegrity {
  const serialized = JSON.stringify(value);
  const diagnostics: HiaAiContextPackageIntegrityDiagnostic[] = [];

  if (serialized.includes("\"sourcesContent\":")) {
    diagnostics.push({
      code: "HIA_REVIEW_PAYLOAD_SOURCES_CONTENT",
      message: "Review payload must not embed sourcesContent.",
      severity: "error"
    });
  }

  if (/(?:file:\/\/|[A-Za-z]:[\\/]|\\\\)/u.test(serialized)) {
    diagnostics.push({
      code: "HIA_REVIEW_PAYLOAD_ABSOLUTE_PATH",
      message: "Review payload must not expose file URLs, Windows drive paths, or UNC paths.",
      severity: "error"
    });
  }

  if (/(?:work-zone|WorkZone|\.codex|Users[\\/]|AppData[\\/])/u.test(serialized)) {
    diagnostics.push({
      code: "HIA_REVIEW_PAYLOAD_PRIVATE_WORKSPACE_PATH",
      message: "Review payload must not expose private workspace, Codex, user profile, or AppData paths.",
      severity: "error"
    });
  }

  return {
    diagnostics,
    status: diagnostics.length > 0 ? "failed" : "pass"
  };
}

function createReviewPayloadItem(
  proposal: HiaDocumentationEditProposal,
  localeState: HiaAiContextPackageLocaleState | undefined
): HiaDocumentationReviewPayloadItem {
  const contextLinks = createReviewPayloadContextLinks(proposal);
  const qualityChecks = createReviewPayloadQualityChecks(proposal, contextLinks, localeState);
  const item: HiaDocumentationReviewPayloadItem = {
    actionHints: createReviewPayloadActionHints(proposal, contextLinks),
    contextLinks,
    ...(proposal.diagnostic ? { diagnostic: proposal.diagnostic } : {}),
    ...(proposal.draft ? { draft: proposal.draft } : {}),
    id: createReviewPayloadItemId(proposal.id),
    kind: proposal.kind,
    proposalId: sanitizeContextId(proposal.id),
    qualityChecks,
    risk: createReviewPayloadRisk(proposal, contextLinks),
    status: proposal.status,
    ...(proposal.suggestion ? { suggestion: proposal.suggestion } : {}),
    target: createAiContextTarget(proposal.target),
    title: proposal.title,
    ...(proposal.workspaceEditBoundary ? { workspaceEditBoundary: proposal.workspaceEditBoundary } : {})
  };

  return item;
}

function createReviewPayloadActionPolicy(): HiaDocumentationReviewPayloadActionPolicy {
  return {
    allowedActions: [
      "review",
      "open-target",
      "open-context",
      "copy-proposal",
      "copy-draft",
      "cancel"
    ],
    defaultAction: "review",
    deniedActions: [
      "auto-apply",
      "write-target-file-without-review",
      "embed-private-source",
      "apply-workspace-edit"
    ]
  };
}

function createReviewPayloadSummary(
  items: readonly HiaDocumentationReviewPayloadItem[],
  draftCount: number
): HiaDocumentationReviewPayloadSummary {
  const qualityChecks = items.flatMap((item) => item.qualityChecks);

  return {
    blockedCount: items.filter((item) => item.status === "blocked").length,
    draftCount,
    itemCount: items.length,
    qualityBlockedCount: qualityChecks.filter((check) => check.status === "blocked").length,
    qualityCheckCount: qualityChecks.length,
    qualityWarningCount: qualityChecks.filter((check) => check.status === "warning").length,
    reviewRequiredCount: items.filter((item) => item.status === "review-required").length,
    unifiedContextCount: items.filter((item) => item.contextLinks.docSourceMapEntryCount > 0
      || item.contextLinks.projectEntryCount > 0
      || item.contextLinks.relationCount > 0).length
  };
}

const HIA_REVIEW_POLICY_LOCALES = ["en", "zh-CN"] as const;

function createReviewPayloadLocaleQualitySummary(
  localeState: HiaAiContextPackageLocaleState | undefined,
  items: readonly HiaDocumentationReviewPayloadItem[]
): HiaDocumentationReviewPayloadLocaleQualitySummary {
  const qualityChecks = items.flatMap((item) => item.qualityChecks);
  const summary: HiaDocumentationReviewPayloadLocaleQualitySummary = {
    canonicalJsOutput: "@lang/<lang>",
    checkSummary: {
      blocked: qualityChecks.filter((check) => check.status === "blocked").length,
      pass: qualityChecks.filter((check) => check.status === "pass").length,
      warning: qualityChecks.filter((check) => check.status === "warning").length
    },
    documentLocales: localeState?.locales ?? [],
    legacyLocaleTagsPolicy: "compat-input-only",
    missingLocaleCount: localeState?.missingLocaleCount ?? 0,
    policyLocales: [...HIA_REVIEW_POLICY_LOCALES],
    sourceDocumentScope: "source-document",
    sourceDocumentTruth: "HiaI18nModel.fields",
    staleLocaleStatus: "not-evaluated"
  };

  if (localeState?.defaultLocale) {
    summary.defaultLocale = localeState.defaultLocale;
  }

  return summary;
}

function createReviewPayloadContextLinks(
  proposal: HiaDocumentationEditProposal
): HiaDocumentationReviewPayloadContextLinks {
  const docSourceMapEntries = proposal.unifiedContext?.docSourceMapEntries ?? [];
  const projectEntries = proposal.unifiedContext?.projectEntries ?? [];
  const relations = proposal.unifiedContext?.relations ?? [];
  const contextLinks: HiaDocumentationReviewPayloadContextLinks = {
    docSourceMapEntryCount: docSourceMapEntries.length,
    projectEntryCount: projectEntries.length,
    relationCount: relations.length
  };

  if (proposal.aiContextPackageRef) {
    contextLinks.aiContextPackageRef = proposal.aiContextPackageRef;
  }

  if (docSourceMapEntries.length > 0) {
    contextLinks.docSourceMapEntries = docSourceMapEntries.slice(0, MAX_UNIFIED_CONTEXT_ENTRIES);
  }

  if (projectEntries.length > 0) {
    contextLinks.projectEntries = projectEntries.slice(0, MAX_UNIFIED_CONTEXT_ENTRIES);
  }

  if (relations.length > 0) {
    contextLinks.relations = relations.slice(0, MAX_UNIFIED_CONTEXT_RELATIONS);
  }

  return contextLinks;
}

function createReviewPayloadActionHints(
  proposal: HiaDocumentationEditProposal,
  contextLinks: HiaDocumentationReviewPayloadContextLinks
): HiaDocumentationReviewPayloadActionHints {
  const copyDraftAvailable = Boolean(proposal.draft);
  const openContextAvailable = Boolean(contextLinks.aiContextPackageRef)
    || contextLinks.docSourceMapEntryCount > 0
    || contextLinks.projectEntryCount > 0
    || contextLinks.relationCount > 0;
  const openTargetAvailable = Boolean(
    proposal.target.range
      || proposal.target.relativePath
      || proposal.target.resourcePath
      || proposal.target.targetPath
      || proposal.target.fieldPath
      || proposal.target.symbolId
  );
  const allowedActions = uniqueStrings([
    ...proposal.review.allowedActions,
    ...(copyDraftAvailable ? ["copy-draft"] : []),
    ...(openContextAvailable ? ["open-context"] : [])
  ]);

  return {
    allowedActions,
    applyAvailable: false,
    copyDraftAvailable,
    deniedActions: uniqueStrings([
      ...proposal.review.deniedActions,
      "apply-workspace-edit"
    ]),
    openContextAvailable,
    openTargetAvailable,
    primaryAction: "review"
  };
}

function createReviewPayloadQualityChecks(
  proposal: HiaDocumentationEditProposal,
  contextLinks: HiaDocumentationReviewPayloadContextLinks,
  localeState: HiaAiContextPackageLocaleState | undefined
): HiaDocumentationReviewPayloadQualityCheck[] {
  const checks: HiaDocumentationReviewPayloadQualityCheck[] = [
    {
      code: "HIA_REVIEW_HUMAN_REVIEW_REQUIRED",
      message: "Human review is required before any source or resource write.",
      status: proposal.privacy.requiresHumanReview ? "pass" : "blocked"
    },
    {
      code: "HIA_REVIEW_NO_AUTOMATIC_WRITE",
      message: "Automatic write actions are disabled for this proposal.",
      status: proposal.privacy.allowsAutomaticWrites === false ? "pass" : "blocked"
    },
    {
      code: "HIA_REVIEW_NO_SOURCE_BODY",
      message: "The proposal and review payload do not include private source bodies.",
      status: proposal.privacy.includesSourceContent === false ? "pass" : "blocked"
    }
  ];

  if (proposal.draft) {
    checks.push({
      code: "HIA_REVIEW_DRAFT_REVIEW_ONLY",
      message: "Draft text is available for review but is not a directly applicable edit.",
      status: proposal.draft.allowsAutomaticWrites === false
        && proposal.draft.usesSourceBody === false
        && proposal.draft.privacy.sourcesContentPolicy === "none"
        ? "pass"
        : "blocked"
    });
  } else if (requiresDraftForReview(proposal.kind)) {
    checks.push({
      code: "HIA_REVIEW_DRAFT_MISSING",
      message: "This proposal kind normally expects draft text, but no draft is available.",
      status: "warning"
    });
  } else {
    checks.push({
      code: "HIA_REVIEW_SUGGESTION_ONLY",
      message: "This diagnostic proposal is suggestion-only in the current review payload.",
      status: "pass"
    });
  }

  checks.push({
    code: "HIA_REVIEW_CONTEXT_LINKS",
    message: contextLinks.aiContextPackageRef
      ? "Review item is linked to the AI context package and optional unified context metadata."
      : "Review item has no AI context package reference.",
    status: contextLinks.aiContextPackageRef ? "pass" : "warning"
  });

  checks.push(...createReviewPayloadLocaleQualityChecks(proposal, localeState));

  return checks;
}

function createReviewPayloadLocaleQualityChecks(
  proposal: HiaDocumentationEditProposal,
  localeState: HiaAiContextPackageLocaleState | undefined
): HiaDocumentationReviewPayloadQualityCheck[] {
  const checks: HiaDocumentationReviewPayloadQualityCheck[] = [];

  if (proposal.draft) {
    checks.push(...createDraftLocaleQualityChecks(proposal.draft));
  } else {
    checks.push({
      code: "HIA_REVIEW_LOCALE_DRAFT_NOT_PRESENT",
      message: "No draft locale text is present for this suggestion-only review item.",
      status: requiresDraftForReview(proposal.kind) ? "warning" : "pass"
    });
  }

  if (proposal.kind === "missing-locale-stub" || proposal.kind === "missing-translation") {
    checks.push(createFieldLevelI18nTargetCheck(proposal));
    checks.push(createSourceDocumentMissingLocaleCheck(proposal, localeState));
    checks.push(createStaleLocaleStatusCheck());
    return checks;
  }

  if (proposal.kind === "missing-documentation") {
    checks.push({
      code: "HIA_REVIEW_SOURCE_DOCUMENT_TRUTH_BOUNDARY",
      message: "Documentation draft text is not source-document truth until a reviewed source/documentation update writes it into HiaI18nModel.fields or the language-specific doc line.",
      status: "warning"
    });
    checks.push(createStaleLocaleStatusCheck());
    return checks;
  }

  checks.push({
    code: "HIA_REVIEW_LOCALE_QUALITY_NOT_APPLICABLE",
    message: "Locale quality checks are not directly applicable to this diagnostic suggestion item.",
    status: "pass"
  });

  return checks;
}

function createDraftLocaleQualityChecks(
  draft: HiaDocumentationEditProposalDraft
): HiaDocumentationReviewPayloadQualityCheck[] {
  const checks: HiaDocumentationReviewPayloadQualityCheck[] = [];

  if (draft.draftKind === "documentation-stub") {
    const missingPolicyLocales = HIA_REVIEW_POLICY_LOCALES.filter((locale) => !hasNonEmptyLocaleDraft(draft, locale));
    checks.push({
      code: "HIA_REVIEW_BILINGUAL_DRAFT_LOCALES",
      message: missingPolicyLocales.length === 0
        ? "Documentation draft includes the first-round bilingual policy locales en and zh-CN."
        : `Documentation draft is missing policy locale draft text: ${missingPolicyLocales.join(", ")}.`,
      status: missingPolicyLocales.length === 0 ? "pass" : "warning"
    });
  } else {
    const targetLocale = draft.targetLocale;
    checks.push({
      code: "HIA_REVIEW_TARGET_LOCALE_DRAFT_PRESENT",
      message: targetLocale && hasNonEmptyLocaleDraft(draft, targetLocale)
        ? `Translation draft includes target locale ${targetLocale}.`
        : "Translation draft must include non-empty text for its target locale.",
      status: targetLocale && hasNonEmptyLocaleDraft(draft, targetLocale) ? "pass" : "blocked"
    });
  }

  checks.push({
    code: "HIA_REVIEW_CANONICAL_LOCALE_OUTPUT_BOUNDARY",
    message: "Draft text is plain review text; JS source writes must be converted through canonical @lang / inline <lang>, and legacy @hiaText/@hiaBlock are rejected for new output.",
    status: containsLegacyLocaleTag(draft) ? "blocked" : "pass"
  });

  return checks;
}

function createFieldLevelI18nTargetCheck(
  proposal: HiaDocumentationEditProposal
): HiaDocumentationReviewPayloadQualityCheck {
  const targetLocale = proposal.target.locale ?? proposal.draft?.targetLocale;
  const fieldPath = proposal.target.fieldPath ?? proposal.draft?.fieldPath;

  return {
    code: "HIA_REVIEW_FIELD_LEVEL_I18N_TARGET",
    message: targetLocale && fieldPath
      ? `Review item targets field-level i18n path ${fieldPath} for locale ${targetLocale}.`
      : "Review item does not include enough field-level i18n target metadata.",
    status: targetLocale && fieldPath ? "pass" : "warning"
  };
}

function createSourceDocumentMissingLocaleCheck(
  proposal: HiaDocumentationEditProposal,
  localeState: HiaAiContextPackageLocaleState | undefined
): HiaDocumentationReviewPayloadQualityCheck {
  const targetLocale = proposal.target.locale ?? proposal.draft?.targetLocale;
  const fieldPath = proposal.target.fieldPath ?? proposal.draft?.fieldPath;
  const symbolId = proposal.target.symbolId;
  const isRecordedMissingLocale = Boolean(targetLocale && fieldPath && symbolId
    && localeState?.missingLocales.some((missingLocale) => missingLocale.locale === targetLocale
      && missingLocale.fieldPath === fieldPath
      && missingLocale.symbolId === symbolId));

  return {
    code: "HIA_REVIEW_SOURCE_DOCUMENT_MISSING_LOCALE",
    message: isRecordedMissingLocale
      ? "Missing locale is recorded by source-document HiaI18nModel.fields metadata."
      : "Missing locale was not matched against source-document HiaI18nModel.fields metadata.",
    status: isRecordedMissingLocale ? "pass" : "warning"
  };
}

function createStaleLocaleStatusCheck(): HiaDocumentationReviewPayloadQualityCheck {
  return {
    code: "HIA_REVIEW_STALE_LOCALE_STATUS",
    message: "Stale locale detection needs source revision or translation freshness metadata and is not evaluated in this first W-P32.5 slice.",
    status: "warning"
  };
}

function hasNonEmptyLocaleDraft(draft: HiaDocumentationEditProposalDraft, locale: string): boolean {
  return typeof draft.localeDrafts[locale] === "string" && draft.localeDrafts[locale].trim().length > 0;
}

function containsLegacyLocaleTag(draft: HiaDocumentationEditProposalDraft): boolean {
  const values = [
    draft.text,
    ...Object.values(draft.localeDrafts)
  ];

  return values.some((value) => /@hiaText|@hiaBlock/u.test(value));
}

function createReviewPayloadRisk(
  proposal: HiaDocumentationEditProposal,
  contextLinks: HiaDocumentationReviewPayloadContextLinks
): HiaDocumentationReviewPayloadRisk {
  const reasons = [
    "human-review-required",
    "no-automatic-write"
  ];

  if (proposal.status === "blocked") {
    reasons.push("proposal-blocked");
    return {
      level: "blocked",
      reasons
    };
  }

  if (requiresDraftForReview(proposal.kind) && !proposal.draft) {
    reasons.push("draft-missing");
  }

  if (!contextLinks.aiContextPackageRef) {
    reasons.push("context-package-ref-missing");
  }

  const level: HiaDocumentationReviewPayloadRiskLevel = reasons.length > 2 ? "medium" : "low";

  return {
    level,
    reasons
  };
}

function requiresDraftForReview(kind: HiaDocumentationEditProposalKind): boolean {
  return kind === "missing-documentation"
    || kind === "missing-locale-stub"
    || kind === "missing-translation";
}

function createReviewPayloadItemId(proposalId: string): string {
  return `review-item:${sanitizeContextId(proposalId)}`;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function createNoSourceExcerptPolicy(): HiaAiContextPackageSourceExcerptPolicy {
  return {
    includesSourceBody: false,
    maxExcerptCharacters: 0,
    mode: "none",
    optInRequired: true
  };
}

function createAiContextPackageId(
  context: HiaLspAuthoringContext,
  proposals: readonly HiaDocumentationEditProposal[]
): string {
  const documentId = context.document?.resourceIndex.documentId ?? "document";
  return `ai-context:${sanitizeContextId(documentId)}:${proposals.length}`;
}

function createAiProposalContext(proposal: HiaDocumentationEditProposal): HiaAiContextPackageProposalContext {
  const context: HiaAiContextPackageProposalContext = {
    contextId: createAiProposalContextId(proposal.id),
    kind: proposal.kind,
    origin: createAiContextOrigin(proposal.origin),
    proposalId: sanitizeContextId(proposal.id),
    status: proposal.status,
    target: createAiContextTarget(proposal.target),
    title: proposal.title
  };

  if (proposal.diagnostic) {
    context.diagnostic = proposal.diagnostic;
  }

  if (proposal.suggestion) {
    context.suggestion = proposal.suggestion;
  }

  if (proposal.unifiedContext) {
    context.unifiedContext = proposal.unifiedContext;
  }

  return context;
}

function createAiContextOrigin(origin: HiaDocumentationEditProposalOrigin): HiaDocumentationEditProposalOrigin {
  const contextOrigin: HiaDocumentationEditProposalOrigin = {
    capability: origin.capability,
    diagnosticCodes: [...origin.diagnosticCodes],
    source: origin.source
  };

  if (origin.resourceActionId && isPublicSafeContextString(origin.resourceActionId)) {
    contextOrigin.resourceActionId = origin.resourceActionId;
  }

  if (origin.resourceActionKind) {
    contextOrigin.resourceActionKind = origin.resourceActionKind;
  }

  return contextOrigin;
}

function createAiProposalContextId(proposalId: string): string {
  return `ai-proposal-context:${sanitizeContextId(proposalId)}`;
}

function createAiContextTarget(target: HiaDocumentationEditProposalTarget): HiaAiContextPackageTarget {
  const context: HiaAiContextPackageTarget = {};

  copySafeOptionalString(context, "diagnosticCode", target.diagnosticCode);
  copySafeOptionalString(context, "fieldPath", target.fieldPath);
  copySafeOptionalString(context, "key", target.key);
  copySafeOptionalString(context, "locale", target.locale);
  copySafeOptionalString(context, "path", target.path);
  copySafeOptionalString(context, "relativePath", target.relativePath);
  copySafeOptionalString(context, "resourcePath", target.resourcePath);
  copySafeOptionalString(context, "resourcePointer", target.resourcePointer);
  copySafeOptionalString(context, "symbolId", target.symbolId);
  copySafeOptionalString(context, "symbolName", target.symbolName);
  copySafeOptionalString(context, "targetPath", target.targetPath);

  if (target.range) {
    context.range = target.range;
  }

  return context;
}

function createAiContextDiagnostics(
  proposals: readonly HiaDocumentationEditProposal[]
): HiaAiContextPackageDiagnosticContext[] {
  return proposals.flatMap((proposal) => {
    const diagnostic = proposal.diagnostic;

    if (!diagnostic) {
      return [];
    }

    return [{
      code: diagnostic.code,
      message: diagnostic.message,
      ...(diagnostic.path ? { path: diagnostic.path } : {}),
      severity: diagnostic.severity,
      ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
    }];
  });
}

function createAiContextLocaleState(context: HiaLspAuthoringContext): HiaAiContextPackageLocaleState | undefined {
  const index = context.document?.resourceIndex;

  if (!index) {
    return undefined;
  }

  return {
    ...(index.defaultLocale ? { defaultLocale: index.defaultLocale } : {}),
    localeCount: index.locales.length,
    locales: [...index.locales],
    missingLocaleCount: index.missingLocales.length,
    missingLocales: index.missingLocales.map((item) => ({
      fieldPath: item.fieldPath,
      locale: item.locale,
      symbolId: item.symbolId,
      symbolName: item.symbolName
    }))
  };
}

function copySafeOptionalString<T extends keyof HiaAiContextPackageTarget>(
  target: HiaAiContextPackageTarget,
  key: T,
  value: HiaAiContextPackageTarget[T] | undefined
): void {
  if (typeof value !== "string" || !isPublicSafeContextString(value)) {
    return;
  }

  Object.assign(target, {
    [key]: value
  });
}

function isPublicSafeContextString(value: string): boolean {
  return !value.includes("file://")
    && !/[A-Za-z]:[\\/]/u.test(value)
    && !/\\\\/u.test(value)
    && !/(?:work-zone|WorkZone|\.codex|Users[\\/]|AppData[\\/])/u.test(value);
}

function sanitizeContextId(value: string): string {
  const redacted = value
    .replace(/file:\/\/[^\u0000\s]+/gu, "file-uri-redacted")
    .replace(/[A-Za-z]:[\\/][^\u0000\s]+/gu, "absolute-path-redacted")
    .replace(/\\\\[^\u0000\s]+/gu, "unc-path-redacted");

  return redacted.replace(/[^A-Za-z0-9:._-]+/gu, "-").slice(0, 96) || "unknown";
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
