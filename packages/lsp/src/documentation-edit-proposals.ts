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
  const proposals = [
    ...resourceActions.flatMap((action) => createProposalFromResourceAction(action, privacy, workflow)),
    ...createMissingDocumentationProposals(parsedDocument, privacy, workflow),
    ...createMissingTranslationDiagnosticProposals(context.document.diagnostics, resourceActions, privacy, workflow),
    ...createGenericDocLineDiagnosticProposals(parsedDocument, privacy, workflow),
    ...createProfileRuleSuggestionProposals(context.profileDiagnostics ?? [], privacy, workflow)
  ];

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
