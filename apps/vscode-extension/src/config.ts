import path from "node:path";

export const HIA_EXTENSION_NAME = "HIA Documentation";
export const HIA_LANGUAGE_ID = "hia";
export const HIA_OUTPUT_CHANNEL_NAME = "HIA Documentation";
export const HIA_SHOW_OUTPUT_COMMAND = "hia.showOutput";
export const HIA_BUILD_DOCS_COMMAND = "hia.buildDocs";
export const HIA_OPEN_PREVIEW_COMMAND = "hia.openPreview";
export const HIA_OPEN_SOURCE_LINKAGE_COMMAND = "hia.openSourceLinkage";
export const HIA_OPEN_PROJECT_RELATIONS_COMMAND = "hia.openProjectRelations";
export const HIA_VALIDATE_WORKSPACE_COMMAND = "hia.validateWorkspace";
export const HIA_OPEN_RELATED_LOCATION_COMMAND = "hia.openRelatedLocation";
export const HIA_SHOW_RESOURCE_ACTION_COMMAND = "hia.showResourceAction";
export const HIA_COPY_RESOURCE_KEY_COMMAND = "hia.copyResourceKey";
/**
 * VS Code review-only command id for visible documentation proposal review.
 *
 * 中文：VS Code 中用于打开文档化 proposal 人工审查入口的只读命令标识。
 */
export const HIA_REVIEW_DOCUMENTATION_PROPOSALS_COMMAND = "hia.reviewDocumentationProposals";
/**
 * VS Code read-only command id for inspecting W-P38 sandbox checked-apply confirmation evidence.
 *
 * 中文：VS Code 中用于查看 W-P38 sandbox checked-apply 确认证据的只读命令标识。
 */
export const HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND = "hia.showCheckedApplySandboxConfirmation";
/**
 * VS Code read-only command id for inspecting W-P43 host-owned apply UX intake evidence.
 *
 * 中文：VS Code 中用于查看 W-P43 host-owned apply UX intake 证据的只读命令标识。
 */
export const HIA_SHOW_HOST_APPLY_UX_INTAKE_COMMAND = "hia.showHostApplyUxIntake";
/**
 * VS Code read-only command id for inspecting W-P50 authoring surface evidence.
 *
 * @lang zh-CN VS Code 中用于查看 W-P50 authoring surface 证据的只读命令标识。
 * @lang en Read-only VS Code command id for inspecting W-P50 authoring surface evidence.
 */
export const HIA_SHOW_AUTHORING_SURFACE_COMMAND = "hia.showAuthoringSurface";
/**
 * VS Code read-only command id for inspecting W-P52 generated binding relations.
 *
 * @lang zh-CN VS Code 中用于查看 W-P52 generated binding 一对多关系的只读命令标识。
 * @lang en Read-only VS Code command id for inspecting W-P52 generated-binding
 * one-to-many relations.
 */
export const HIA_SHOW_GENERATED_BINDING_RELATIONS_COMMAND = "hia.showGeneratedBindingRelations";
/**
 * VS Code command id for the W-P53 host-owned self-sandbox apply-and-rollback pilot.
 *
 * 中文：VS Code 中仅用于 W-P53 主仓专用 synthetic sandbox apply-and-rollback 试点的命令标识。
 * 它不接受 target path、provider edit 或 LSP edit，也不构成通用 checked-apply 权限。
 * @lang en VS Code command id for the W-P53 main-repository dedicated synthetic-sandbox
 * apply-and-rollback pilot. It accepts no target path, provider edit, or LSP edit and does not
 * grant general checked-apply authority.
 */
export const HIA_RUN_WP53_SELF_SANDBOX_PILOT_COMMAND = "hia.runWp53SelfSandboxPilot";
export const HIA_CLIENT_ID = "hiaDocumentation";
export const HIA_CONFIGURATION_SECTION = "hia";
export const HIA_SERVER_RELATIVE_PATH = ["..", "..", "packages", "lsp", "dist", "node.js"] as const;
export const HIA_CLI_RELATIVE_PATH = ["..", "..", "apps", "cli", "dist", "index.js"] as const;
export const HIA_DEFAULT_PREVIEW_RELATIVE_PATH = ["dist", "docs", "index.html"] as const;
export const HIA_DEFAULT_BUILD_OUTPUT = "dist/docs";
export const HIA_DEFAULT_PREVIEW_PATH = "dist/docs/index.html";
export const HIA_DEFAULT_MANIFEST_PATH = "hia-manifest.json";
export const HIA_RESOURCE_INDEX_REQUEST = "hia/documentResourceIndex";
export const HIA_DOCUMENT_SOURCE_MAP_INDEX_REQUEST = "hia/documentSourceMapIndex";
export const HIA_PROJECT_RELATION_GRAPH_REQUEST = "hia/projectRelationGraph";
export const HIA_IDE_CAPABILITIES_REQUEST = "hia/ideCapabilities";
export const HIA_AUTHORING_LOCATIONS_REQUEST = "hia/documentAuthoringLocations";
export const HIA_RESOURCE_ACTIONS_REQUEST = "hia/resourceActions";
export const HIA_DOCUMENTATION_EDIT_PROPOSALS_REQUEST = "hia/documentationEditProposals";

export interface HiaDocumentSelectorItem {
  language?: string;
  pattern?: string;
  scheme: "file";
}

export interface HiaCommandSettingsInput {
  config?: string | undefined;
  input?: string | undefined;
  jsdocIntegration?: string | undefined;
  locale?: string | undefined;
  manifest?: string | undefined;
  out?: string | undefined;
  previewPath?: string | undefined;
  projectManifest?: string | undefined;
}

export interface HiaCommandSettings {
  config?: string;
  input?: string;
  jsdocIntegration?: string;
  locale?: string;
  manifest: string;
  out: string;
  previewPath: string;
  projectManifest?: string;
}

export interface HiaResourceIndexSummary {
  documentId?: string;
  i18nKeys?: unknown[];
  i18nResources?: unknown[];
  missingLocales?: unknown[];
  sourceReferences?: unknown[];
  uri?: string;
}

export interface HiaIdeCapabilitySummary {
  id?: string;
  owner?: string;
  reason?: string;
  status?: string;
}

export interface HiaIdeCapabilitiesSummary {
  capabilities?: HiaIdeCapabilitySummary[];
  profileDiagnostics?: unknown[];
  profiles?: HiaProfileSummary[];
  uri?: string;
}

export interface HiaProfileSummary {
  displayName?: string;
  profileId?: string;
  profileVersion?: string;
  tagCount?: number;
}

export interface HiaAuthoringLocationSummary {
  kind?: string;
  range?: {
    end: {
      character: number;
      line: number;
    };
    start: {
      character: number;
      line: number;
    };
  };
  resourcePath?: string;
  sourceTargetId?: string;
  targetPath?: string;
  unavailableReason?: string;
  uri?: string;
}

export interface HiaAuthoringLocationsSummary {
  locations?: HiaAuthoringLocationSummary[];
  uri?: string;
}

export interface HiaResourceActionPreflightSummary {
  conflictStatus?: string;
  editKind?: string;
  requiresFileRead?: boolean;
  resourcePath?: string;
  resourcePointer?: string;
  targetUri?: string;
  workspaceEditBoundary?: string;
}

export interface HiaResourceActionSummary {
  fieldPath?: string;
  id?: string;
  key?: string;
  kind?: string;
  locale?: string;
  location?: HiaAuthoringLocationSummary;
  path?: string;
  preflight?: HiaResourceActionPreflightSummary;
  resourcePath?: string;
  resourcePointer?: string;
  status?: string;
  symbolId?: string;
  targetUri?: string;
  title?: string;
  unavailableReason?: string;
}

export interface HiaResourceActionsSummary {
  actions?: HiaResourceActionSummary[];
  uri?: string;
}

export interface HiaDocumentationEditProposalPrivacySummary {
  allowsAutomaticWrites?: boolean;
  contextPolicy?: string;
  includesSourceContent?: boolean;
  requiresHumanReview?: boolean;
  sourcesContentPolicy?: string;
}

/**
 * Review-only draft text summary exposed by the LSP proposal contract.
 *
 * 中文：LSP proposal contract 暴露的仅供审查草稿文本摘要。
 */
export interface HiaDocumentationEditProposalDraftSummary {
  allowsAutomaticWrites?: boolean;
  contract?: string;
  contractVersion?: string;
  draftKind?: string;
  fieldPath?: string;
  generationBasis?: string;
  localeDrafts?: Record<string, string>;
  privacy?: {
    includesSourceBody?: boolean;
    sourcesContentPolicy?: string;
  };
  qualityNotes?: string[];
  requiresHumanReview?: boolean;
  targetLocale?: string;
  text?: string;
  textFormat?: string;
  usesSourceBody?: boolean;
}

export interface HiaDocumentationEditProposalSummary {
  aiContextPackageRef?: {
    contract?: string;
    contractVersion?: string;
    includesSourceContent?: boolean;
    packageId?: string;
    proposalContextId?: string;
    sourceExcerptPolicy?: string;
  };
  draft?: HiaDocumentationEditProposalDraftSummary;
  id?: string;
  kind?: string;
  privacy?: HiaDocumentationEditProposalPrivacySummary;
  status?: string;
  target?: {
    diagnosticCode?: string;
    fieldPath?: string;
    locale?: string;
    relativePath?: string;
    resourcePath?: string;
    resourcePointer?: string;
    symbolId?: string;
    symbolName?: string;
    targetPath?: string;
    targetUri?: string;
  };
  title?: string;
  unifiedContext?: {
    docSourceMapEntries?: unknown[];
    matchedBy?: string[];
    projectEntries?: unknown[];
    relations?: unknown[];
    status?: string;
  };
  unavailableReason?: string;
}

export interface HiaAiContextPackageSummary {
  contract?: string;
  contractVersion?: string;
  integrity?: {
    diagnostics?: unknown[];
    status?: string;
  };
  privacy?: {
    allowsAbsolutePaths?: boolean;
    allowsPrivateWorkspacePaths?: boolean;
    allowsTargetRepositoryMutation?: boolean;
    includesSourceContent?: boolean;
    includesSourceExcerpt?: boolean;
    sourcesContentPolicy?: string;
  };
  proposalContexts?: unknown[];
  proposalCount?: number;
  selectionPolicy?: {
    contextPolicy?: string;
    sourceExcerptPolicy?: {
      mode?: string;
    };
  };
}

export interface HiaDocumentationReviewPayloadSummary {
  actionPolicy?: {
    allowedActions?: string[];
    defaultAction?: string;
    deniedActions?: string[];
  };
  contract?: string;
  contractVersion?: string;
  draftCount?: number;
  integrity?: {
    diagnostics?: unknown[];
    status?: string;
  };
  items?: HiaDocumentationReviewPayloadItemSummary[];
  payloadKind?: string;
  privacy?: {
    allowsAutomaticWrites?: boolean;
    allowsTargetRepositoryMutation?: boolean;
    contextPolicy?: string;
    includesDraftText?: boolean;
    includesSourceContent?: boolean;
    requiresHumanReview?: boolean;
    sourcesContentPolicy?: string;
  };
  proposalCount?: number;
  summary?: {
    blockedCount?: number;
    draftCount?: number;
    itemCount?: number;
    qualityBlockedCount?: number;
    qualityCheckCount?: number;
    qualityWarningCount?: number;
    reviewRequiredCount?: number;
    unifiedContextCount?: number;
  };
  localeQuality?: {
    canonicalJsOutput?: string;
    checkSummary?: {
      blocked?: number;
      pass?: number;
      warning?: number;
    };
    defaultLocale?: string;
    documentLocales?: string[];
    legacyLocaleTagsPolicy?: string;
    missingLocaleCount?: number;
    policyLocales?: string[];
    sourceDocumentScope?: string;
    sourceDocumentTruth?: string;
    staleLocaleStatus?: string;
  };
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary;
}

export interface HiaProviderReviewPayloadAugmentationSummary {
  actionPolicy?: {
    deniedActions?: string[];
    directApplyAllowed?: boolean;
    directEditObjectAllowed?: boolean;
    requiresHumanReview?: boolean;
    targetRepositoryMutationAllowed?: boolean;
    toolExecutionAllowed?: boolean;
    workspaceWriteAllowed?: boolean;
  };
  contract?: string;
  contractVersion?: string;
  draftOutputs?: Array<{
    id?: string;
    locale?: string;
    proposalId?: string;
    providerOutputId?: string;
    target?: {
      reviewItemId?: string;
    };
  }>;
  provider?: {
    id?: string;
    runtimeKind?: string;
    version?: string;
  };
  refusalOutputs?: Array<{
    id?: string;
    providerOutputId?: string;
    reasonCode?: string;
  }>;
  reviewItemBindings?: Array<{
    providerReviewItemId?: string;
    sourceReviewItemId?: string;
  }>;
  reviewMetadata?: Array<{
    proposalId?: string;
    providerOutputId?: string;
    qualitySignals?: string[];
    riskLevel?: string;
  }>;
  status?: string;
  privacy?: {
    includesSourceBody?: boolean;
    includesSourcesContent?: boolean;
    requiresHumanReview?: boolean;
    sourcesContentPolicy?: string;
  };
}

/**
 * 单个 documentation proposal 的 host-visible 审查摘要。
 * Host-visible review summary for one documentation proposal.
 *
 * 中文：该结构只携带 target metadata、draft 摘要、quality/risk/action hints，不承载可直接写入的 workspace edit。
 * English: This shape carries target metadata, draft summary, quality/risk/action hints, and no directly writable workspace edit.
 */
export interface HiaDocumentationReviewPayloadItemSummary {
  actionHints?: {
    allowedActions?: string[];
    applyAvailable?: boolean;
    copyDraftAvailable?: boolean;
    deniedActions?: string[];
    editCandidateAvailable?: boolean;
    editCandidatePreviewAvailable?: boolean;
    openContextAvailable?: boolean;
    openTargetAvailable?: boolean;
    primaryAction?: string;
  };
  contextLinks?: {
    docSourceMapEntryCount?: number;
    projectEntryCount?: number;
    relationCount?: number;
  };
  draft?: HiaDocumentationEditProposalDraftSummary;
  editCandidate?: HiaDocumentationEditCandidateSummary;
  id?: string;
  kind?: string;
  proposalId?: string;
  qualityChecks?: Array<{
    code?: string;
    message?: string;
    status?: string;
  }>;
  risk?: {
    level?: string;
    reasons?: string[];
  };
  status?: string;
  target?: {
    diagnosticCode?: string;
    fieldPath?: string;
    locale?: string;
    relativePath?: string;
    resourcePath?: string;
    resourcePointer?: string;
    symbolId?: string;
    symbolName?: string;
    targetPath?: string;
    targetUri?: string;
  };
  title?: string;
  workspaceEditBoundary?: string;
}

/**
 * Review payload 中的只读 semantic diff preview 摘要。
 * Read-only semantic diff preview summary carried by a review payload.
 */
export interface HiaDocumentationEditDiffPreviewSummary {
  contract?: string;
  contractVersion?: string;
  id?: string;
  limitations?: string[];
  operations?: Array<{
    fieldPath?: string;
    locale?: string;
    op?: string;
    path?: string;
    pointer?: string;
    symbolId?: string;
    textFormat?: string;
    valuePreview?: string;
  }>;
  previewFormat?: string;
  proposalId?: string;
  safety?: {
    directApply?: boolean;
    executable?: boolean;
    hostWrite?: boolean;
    includesSourceContent?: boolean;
    requiresConflictCheck?: boolean;
    requiresFileRead?: boolean;
    requiresHumanReview?: boolean;
    sourcesContentPolicy?: string;
  };
  status?: string;
  targetKind?: string;
  unavailableReason?: string;
}

/**
 * Review payload 中的 apply 前预检摘要。
 * Apply preflight summary carried by a review payload before any write is allowed.
 */
export interface HiaDocumentationEditApplyPreflightSummary {
  conflictStatus?: string;
  contract?: string;
  contractVersion?: string;
  id?: string;
  limitations?: string[];
  proposalId?: string;
  requiresConflictCheck?: boolean;
  requiresFileRead?: boolean;
  rollback?: {
    recordRequired?: boolean;
    scope?: string;
    strategy?: string;
  };
  status?: string;
  targetFiles?: Array<{
    conflict?: {
      blocking?: boolean;
      expectedBaseVersion?: string;
      requiresFileRead?: boolean;
      status?: string;
    };
    fieldPath?: string;
    fileVersion?: {
      contentHashStatus?: string;
      required?: boolean;
      source?: string;
      status?: string;
    };
    formatting?: {
      formatter?: string;
      indentation?: string;
      lineEnding?: string;
    };
    locale?: string;
    path?: string;
    pointer?: string;
    role?: string;
    rollback?: {
      recordRequired?: boolean;
      scope?: string;
      strategy?: string;
    };
    symbolId?: string;
  }>;
  targetKind?: string;
}

/**
 * Review payload 中的只读 edit candidate 摘要。
 * Read-only edit candidate summary carried by a review payload.
 */
export interface HiaDocumentationEditCandidateSummary {
  applyMode?: string;
  applyPreflight?: HiaDocumentationEditApplyPreflightSummary;
  contract?: string;
  contractVersion?: string;
  diffPreview?: HiaDocumentationEditDiffPreviewSummary;
  id?: string;
  kind?: string;
  preview?: {
    previewKind?: string;
    text?: string;
    textFormat?: string;
  };
  proposalId?: string;
  safety?: {
    allowsAutomaticWrites?: boolean;
    directApply?: boolean;
    hostWrite?: boolean;
    includesSourceContent?: boolean;
    requiresHumanReview?: boolean;
    rollback?: string;
    sourcesContentPolicy?: string;
  };
  status?: string;
  target?: {
    fieldPath?: string;
    locale?: string;
    relativePath?: string;
    resourcePath?: string;
    resourcePointer?: string;
    symbolId?: string;
    symbolName?: string;
    targetPath?: string;
  };
  unavailableReason?: string;
  workspaceEditBoundary?: string;
}

/**
 * VS Code QuickPick 可直接展示的 review item 选择项。
 * Review item choice that can be shown directly by a VS Code QuickPick.
 */
export interface HiaDocumentationReviewItemChoice {
  description?: string;
  detail?: string;
  item: HiaDocumentationReviewPayloadItemSummary;
  label: string;
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary;
}

/**
 * VS Code checked apply confirmation 的 host-visible 摘要。
 * Host-visible summary for a VS Code checked apply confirmation preview.
 *
 * 中文：该结构只表达宿主确认 UI 需要展示的 gate 状态，不包含可直接执行的编辑对象。
 * English: This shape only exposes gate status for host confirmation UI and never carries directly executable edit objects.
 */
export interface HiaDocumentationCheckedApplyConfirmationSummary {
  applyAuditRecordId?: string;
  applyAuthorityStillBlocked?: boolean;
  confirmationState?: string;
  conflictStatus?: string;
  currentState?: string;
  directApplyAllowed?: boolean;
  finalConflictRecheckRequired?: boolean;
  finalHumanConfirmationRequired?: boolean;
  formatterExecutionRequiredAtApply?: boolean;
  formatterId?: string;
  formatterStatus?: string;
  formatterValidationRecordId?: string;
  postApplyValidationRequired?: boolean;
  readyForHostConfirmation?: boolean;
  reportSource?: string;
  rollbackRecordId?: string;
  targetKind?: string;
  targetRepositoryMutationAllowed?: boolean;
  transactionId?: string;
  workspaceWriteAllowed?: boolean;
}

/**
 * VS Code QuickPick 可展示的 checked apply confirmation 选择项。
 * Checked apply confirmation choice that can be shown by a VS Code QuickPick.
 */
export interface HiaDocumentationCheckedApplyConfirmationChoice {
  confirmation: HiaDocumentationCheckedApplyConfirmationSummary;
  description?: string;
  detail?: string;
  label: string;
}

export interface HiaCheckedApplySandboxPolicySummary {
  applyAuthority?: string;
  outputScope?: string;
  providerOwnedApplyAllowed?: boolean;
  realWorkspaceApplyEditAllowed?: boolean;
  sourcesContentPolicy?: string;
  targetRepositoryMutationAllowed?: boolean;
}

export interface HiaCheckedApplySandboxEvidenceRollup {
  directApplyAllowedCount?: number;
  directEditObjectCount?: number;
  formatterExecutionCount?: number;
  hardFailureCount?: number;
  lspServerOwnedApplyCount?: number;
  postApplyValidationSuccessCount?: number;
  providerOwnedApplyCount?: number;
  redactedAuditRecordCount?: number;
  repeatConflictCheckCount?: number;
  rollbackPrivateSnapshotCount?: number;
  sandboxApplySuccessCount?: number;
  sandboxScenarioCount?: number;
  sandboxWriteOperationCount?: number;
  sourceBodyIncludedInEvidence?: boolean;
  sourcesContentPolicy?: string;
  targetRepositoryMutationCount?: number;
  workspaceApplyEditCallCount?: number;
  workspaceWriteAllowedCount?: number;
}

export interface HiaCheckedApplySandboxTransactionSummary {
  applyStatus?: string;
  auditRecord?: string;
  finalHumanConfirmation?: string;
  formatterExecution?: string;
  id?: string;
  label?: string;
  outputScope?: string;
  postApplyValidation?: string;
  redactedAuditRecordId?: string;
  repeatConflictCheck?: string;
  rollbackSnapshotPrepared?: boolean;
  sandboxRelativePath?: string;
  targetKind?: string;
  targetRepositoryMode?: string;
}

/**
 * W-P38 sandbox checked-apply evidence 的 VS Code 可见摘要。
 * VS Code-visible summary for W-P38 sandbox checked-apply evidence.
 *
 * 中文：该结构只读取 public-safe evidence 中的 gate 结果，不携带源码正文、可执行
 * WorkspaceEdit 或目标仓库写入指令。
 * English: This shape only reads gate results from public-safe evidence and
 * does not carry source bodies, executable WorkspaceEdit data or target
 * repository write instructions.
 */
export interface HiaCheckedApplySandboxEvidenceSummary {
  contract?: string;
  contractVersion?: string;
  sandboxPolicy?: HiaCheckedApplySandboxPolicySummary;
  status?: string;
  summary?: HiaCheckedApplySandboxEvidenceRollup;
  transactionResults?: HiaCheckedApplySandboxTransactionSummary[];
}

/**
 * VS Code QuickPick 可展示的 W-P38 sandbox checked-apply confirmation 选择项。
 * W-P38 sandbox checked-apply confirmation choice that can be shown by a VS Code QuickPick.
 */
export interface HiaCheckedApplySandboxConfirmationChoice {
  description?: string;
  detail?: string;
  label: string;
  transaction: HiaCheckedApplySandboxTransactionSummary;
}

export interface HiaHostApplyUxRequirementSummary {
  description?: string;
  hostOwned?: boolean;
  id?: string;
  readiness?: string;
  status?: string;
  writeAuthorityGranted?: boolean;
}

export interface HiaHostApplyUxDisplayRuleSummary {
  description?: string;
  id?: string;
  status?: string;
  writeAuthorityGranted?: boolean;
}

export interface HiaHostApplyUxSurfaceSummary {
  actualRuntimeCaptureExecuted?: boolean;
  checkedApplyWriteEnabled?: boolean;
  deferredGateVisible?: boolean;
  directEditObjectProduced?: boolean;
  hostEditorApiCalled?: boolean;
  id?: string;
  label?: string;
  providerNetworkExecuted?: boolean;
  providerReviewLinkageVisible?: boolean;
  sourceBodyIncluded?: boolean;
  sourceReferenceIncluded?: boolean;
  sourcesContentPolicy?: string;
  status?: string;
  surface?: string;
  targetCommandsExecutedByHia?: boolean;
  targetOwnerEvidenceVisible?: boolean;
  targetRepositoryMutationAllowed?: boolean;
  uxRequirementRefs?: string[];
  workspaceWriteAllowed?: boolean;
}

export interface HiaHostApplyUxIntakeRollup {
  actualRuntimeCaptureExecutedCount?: number;
  checkedApplyTriggeredCount?: number;
  checkedApplyWriteEnabled?: boolean;
  credentialValueIncludedCount?: number;
  directEditObjectCount?: number;
  documentContentIncludedInEvidenceCount?: number;
  hostEditorApiCallCount?: number;
  hostSurfaceCount?: number;
  pathExposureCount?: number;
  providerNetworkExecutedCount?: number;
  providerOutputReviewOnly?: boolean;
  providerReviewDisplayRuleCount?: number;
  readyHostSurfaceCount?: number;
  readyUxRequirementCount?: number;
  sourceBodyIncludedInEvidence?: boolean;
  sourceReferenceIncludedCount?: number;
  sourcesContentPolicy?: string;
  targetCommandExecutedByHiaCount?: number;
  targetOwnerActionRequired?: boolean;
  targetOwnerDisplayRuleCount?: number;
  targetOwnerExecutionClaimed?: boolean;
  targetRepositoryMutationCount?: number;
  uxRequirementCount?: number;
  workspaceWriteAllowedCount?: number;
}

/**
 * W-P43 host-owned apply UX intake evidence 的 VS Code 可见摘要。
 * VS Code-visible summary for W-P43 host-owned apply UX intake evidence.
 *
 * 中文：该结构只表达宿主 UX requirement、display rule 与 surface contract，
 * 不携带源码正文、credential、可执行编辑对象或写入指令。
 * English: This shape only exposes host UX requirements, display rules and
 * surface contracts; it carries no source bodies, credentials, executable edit
 * objects or write instructions.
 */
export interface HiaHostApplyUxIntakeEvidenceSummary {
  contract?: string;
  contractVersion?: string;
  hostSurfaces?: HiaHostApplyUxSurfaceSummary[];
  providerReviewDisplayRules?: HiaHostApplyUxDisplayRuleSummary[];
  status?: string;
  summary?: HiaHostApplyUxIntakeRollup;
  targetOwnerDisplayRules?: HiaHostApplyUxDisplayRuleSummary[];
  uxRequirements?: HiaHostApplyUxRequirementSummary[];
}

export interface HiaHostApplyUxSurfaceChoice {
  description?: string;
  detail?: string;
  label: string;
  surface: HiaHostApplyUxSurfaceSummary;
}

/**
 * W-P50 VS Code authoring mode summary displayed in the command picker.
 *
 * @lang zh-CN 描述一个 VS Code 可见 authoring mode，例如 locale marker、changed-scope preview 或 fixture guidance；它不携带可执行编辑。
 * @lang en Describes one VS Code-visible authoring mode such as locale markers, changed-scope preview, or fixture guidance; it carries no executable edit.
 */
export interface HiaVscodeAuthoringModeSummary {
  descriptionZh?: string;
  id?: string;
  label?: string;
  priority?: string;
  sourcePhases?: string[];
  status?: string;
  visibleIn?: string[];
  writeAuthority?: string;
}

/**
 * W-P50 VS Code authoring surface shell summary.
 *
 * @lang zh-CN 描述 VS Code authoring surface 的命令、可见界面和写入边界；默认保持 write disabled。
 * @lang en Describes the VS Code authoring surface command, visible areas, and write boundary; it defaults to write disabled.
 */
export interface HiaVscodeAuthoringSurfaceSummary {
  commandId?: string;
  hostEditorApiCalled?: boolean;
  id?: string;
  label?: string;
  status?: string;
  visibleSurfaces?: string[];
  writeAuthority?: string;
}

/**
 * W-P50 VS Code authoring surface rollup counters.
 *
 * @lang zh-CN 汇总命令注册、可见能力、隐私和 no-write 计数，供输出面板和 evidence 检查复用。
 * @lang en Summarizes command registration, visible capabilities, privacy, and no-write counters for output-panel and evidence checks.
 */
export interface HiaVscodeAuthoringSurfaceRollup {
  authoringModeCount?: number;
  checkedApplyTriggeredCount?: number;
  checkedApplyWriteEnabledCount?: number;
  commandDeclared?: boolean;
  hostEditorApiCallCount?: number;
  markerCompletionVisible?: boolean;
  sourceBodyIncludedInEvidence?: boolean;
  sourcesContentPolicy?: string;
  targetCommandExecutedByHiaCount?: number;
  targetRepositoryMutationCount?: number;
  visibleSurfaceCount?: number;
  vscodeCommandRegistered?: boolean;
  workspaceWriteAllowedCount?: number;
}

/**
 * W-P50 VS Code authoring surface evidence shape consumed by the extension.
 *
 * @lang zh-CN 表示 VS Code 插件读取的 W-P50.2 evidence 摘要，只用于展示 authoring guidance，不表示运行时捕获或写入授权。
 * @lang en Represents the W-P50.2 evidence summary consumed by the VS Code extension for authoring guidance display only, not runtime capture or write authority.
 */
export interface HiaVscodeAuthoringSurfaceEvidenceSummary {
  authoringModes?: HiaVscodeAuthoringModeSummary[];
  contract?: string;
  contractVersion?: string;
  phase?: string;
  status?: string;
  summary?: HiaVscodeAuthoringSurfaceRollup;
  vscodeSurface?: HiaVscodeAuthoringSurfaceSummary;
}

/**
 * W-P50 VS Code authoring mode picker item.
 *
 * @lang zh-CN QuickPick 中的 authoring mode 选择项，绑定原始 mode summary 以便输出详细报告。
 * @lang en Authoring mode choice for QuickPick, retaining the source mode summary for detailed reports.
 */
export interface HiaVscodeAuthoringSurfaceChoice {
  description?: string;
  detail?: string;
  label: string;
  mode: HiaVscodeAuthoringModeSummary;
}

/**
 * W-P52 generated binding relation evidence shape consumed by VS Code.
 *
 * @lang zh-CN 该结构只承载 source-linkage 生成的 public-safe 投影；不含源码正文、
 * sidecar path、locals value/digest 或可写编辑。
 * @lang en This shape carries only the public-safe projection produced by
 * source-linkage; it contains no source bodies, sidecar paths, locals
 * values/digests, or writable edits.
 */
export interface HiaVscodeGeneratedBindingProjectionEvidence {
  contract?: string;
  contractVersion?: string;
  phase?: string;
  projection?: HiaVscodeGeneratedBindingProjection;
  status?: string;
  summary?: HiaVscodeGeneratedBindingProjectionSummary;
}

/** 中文：VS Code 可读的 generated binding 投影。English: Generated-binding projection readable by VS Code. */
export interface HiaVscodeGeneratedBindingProjection {
  bindings?: HiaVscodeGeneratedBindingRelation[];
  contract?: string;
  contractVersion?: string;
  diagnostics?: Array<{ code?: string; severity?: string }>;
  privacy?: {
    localsValueIncluded?: boolean;
    sidecarPathIncluded?: boolean;
    sourceBodyIncluded?: boolean;
    sourceRangeIncluded?: boolean;
    sourcesContentPolicy?: string;
  };
  status?: string;
  summary?: HiaVscodeGeneratedBindingProjectionSummary;
}

/** 中文：一条绑定到 targets 的安全关系。English: Safe relation from one binding to its targets. */
export interface HiaVscodeGeneratedBindingRelation {
  bindingRef?: { memberPath?: string[]; rootDeclarationId?: string };
  composition?: { mergePolicy?: string; relation?: string };
  expansions?: Array<{
    id?: string;
    instanceKey?: { displayKey?: string; status?: string };
    quality?: HiaVscodeGeneratedBindingQuality;
    targetIds?: string[];
  }>;
  id?: string;
  quality?: HiaVscodeGeneratedBindingQuality;
  sourceIntent?: { field?: string; kind?: string };
  targets?: Array<{ id?: string; identity?: { kind?: string; selector?: string; symbolId?: string } }>;
}

/** 中文：resolution/confidence/provenance 三维质量。English: Resolution/confidence/provenance quality dimensions. */
export interface HiaVscodeGeneratedBindingQuality {
  confidence?: string;
  provenanceCoverage?: string;
  resolutionKind?: string;
}

/** 中文：投影界面的只读计数。English: Read-only counters for the projection surface. */
export interface HiaVscodeGeneratedBindingProjectionSummary {
  bindingCount?: number;
  diagnosticCount?: number;
  expansionCount?: number;
  stableInstanceKeyCount?: number;
  targetCount?: number;
}

/** 中文：生成 binding QuickPick 选择项。English: Generated-binding QuickPick choice. */
export interface HiaVscodeGeneratedBindingRelationChoice {
  description?: string;
  detail?: string;
  label: string;
  relation: HiaVscodeGeneratedBindingRelation;
}

export interface HiaDocumentationEditProposalsSummary {
  aiContextPackage?: HiaAiContextPackageSummary;
  draftCount?: number;
  privacy?: HiaDocumentationEditProposalPrivacySummary;
  proposalCount?: number;
  proposals?: HiaDocumentationEditProposalSummary[];
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary;
  reviewPayload?: HiaDocumentationReviewPayloadSummary;
  status?: string;
  uri?: string;
}

export interface HiaDiagnosticSummary {
  code?: number | string;
  data?: unknown;
  relatedInformation?: unknown[];
  severity?: number;
}

export interface HiaValidationReportInput {
  authoringLocations?: HiaAuthoringLocationsSummary;
  capabilities?: HiaIdeCapabilitiesSummary;
  diagnostics?: HiaDiagnosticSummary[];
  resourceActions?: HiaResourceActionsSummary;
  resourceIndex?: HiaResourceIndexSummary;
  uri: string;
}

export interface HiaPreviewManifestSummary {
  documentId?: string;
  entrypoint?: unknown;
  initialLocale?: string;
  locales?: unknown[];
  title?: string;
}

export type HiaPreviewPathSource = "manifest" | "setting";

export type HiaPreviewUnavailableReason =
  | "manifest-entrypoint-missing"
  | "manifest-entrypoint-unsafe"
  | "preview-file-missing"
  | "manifest-file-missing"
  | "active-document-newer-than-preview"
  | "manifest-newer-than-preview";

export interface HiaPreviewPathResolution {
  manifestEntrypoint?: string;
  previewPath: string;
  source: HiaPreviewPathSource;
  unavailableReason?: HiaPreviewUnavailableReason;
}

export interface HiaPreviewStatusReportInput {
  manifest?: HiaPreviewManifestSummary;
  manifestExists: boolean;
  manifestPath: string;
  previewExists: boolean;
  previewPath: string;
  source: HiaPreviewPathSource;
  staleReason?: HiaPreviewUnavailableReason;
}

export function resolveHiaServerModule(extensionPath: string): string {
  return path.resolve(extensionPath, ...HIA_SERVER_RELATIVE_PATH);
}

export function resolveHiaCliModule(extensionPath: string): string {
  return path.resolve(extensionPath, ...HIA_CLI_RELATIVE_PATH);
}

export function resolveDefaultPreviewPath(workspaceRoot: string): string {
  return path.resolve(workspaceRoot, ...HIA_DEFAULT_PREVIEW_RELATIVE_PATH);
}

export function resolveConfiguredPreviewPath(workspaceRoot: string, previewPath?: string): string {
  const normalized = normalizeOptionalSetting(previewPath) ?? HIA_DEFAULT_PREVIEW_PATH;
  return path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(workspaceRoot, normalized);
}

export function resolveConfiguredManifestPath(workspaceRoot: string, settings: Pick<HiaCommandSettings, "manifest" | "out">): string {
  return path.resolve(workspaceRoot, settings.out, settings.manifest);
}

export function resolveHiaPreviewPath(
  workspaceRoot: string,
  settings: Pick<HiaCommandSettings, "out" | "previewPath">,
  manifest?: HiaPreviewManifestSummary
): HiaPreviewPathResolution {
  if (typeof manifest?.entrypoint === "string") {
    const entrypoint = normalizeOutputRelativePath(manifest.entrypoint);

    if (isSafeOutputRelativePath(entrypoint)) {
      return {
        manifestEntrypoint: entrypoint,
        previewPath: path.resolve(workspaceRoot, settings.out, entrypoint),
        source: "manifest"
      };
    }

    return {
      previewPath: resolveConfiguredPreviewPath(workspaceRoot, settings.previewPath),
      source: "setting",
      unavailableReason: "manifest-entrypoint-unsafe"
    };
  }

  return {
    previewPath: resolveConfiguredPreviewPath(workspaceRoot, settings.previewPath),
    source: "setting",
    ...(manifest ? { unavailableReason: "manifest-entrypoint-missing" as const } : {})
  };
}

export function normalizeHiaCommandSettings(input: HiaCommandSettingsInput = {}): HiaCommandSettings {
  const settings: HiaCommandSettings = {
    manifest: normalizeOptionalSetting(input.manifest) ?? HIA_DEFAULT_MANIFEST_PATH,
    out: normalizeOptionalSetting(input.out) ?? HIA_DEFAULT_BUILD_OUTPUT,
    previewPath: normalizeOptionalSetting(input.previewPath) ?? HIA_DEFAULT_PREVIEW_PATH
  };
  const config = normalizeOptionalSetting(input.config);
  const hiaInput = normalizeOptionalSetting(input.input);
  const jsdocIntegration = normalizeOptionalSetting(input.jsdocIntegration);
  const locale = normalizeOptionalSetting(input.locale);
  const projectManifest = normalizeOptionalSetting(input.projectManifest);

  if (config) {
    settings.config = config;
  }

  if (hiaInput) {
    settings.input = hiaInput;
  }

  if (jsdocIntegration) {
    settings.jsdocIntegration = jsdocIntegration;
  }

  if (locale) {
    settings.locale = locale;
  }

  if (projectManifest) {
    settings.projectManifest = projectManifest;
  }

  return settings;
}

export function createHiaBuildArgs(settings: HiaCommandSettings = normalizeHiaCommandSettings()): string[] {
  const args = ["docs", "build"];

  pushOption(args, "--config", settings.config);
  pushOption(args, "--input", settings.input);
  pushOption(args, "--jsdoc-integration", settings.jsdocIntegration);
  pushOption(args, "--project-manifest", settings.projectManifest);
  pushOption(args, "--out", settings.out);
  pushOption(args, "--locale", settings.locale);
  pushOption(args, "--manifest", settings.manifest);

  return args;
}

export function createHiaValidationReport(input: HiaValidationReportInput): string[] {
  const index = input.resourceIndex ?? {};
  const diagnostics = input.diagnostics ?? [];
  const capabilities = input.capabilities?.capabilities ?? [];
  const profiles = input.capabilities?.profiles ?? [];
  const profileDiagnostics = input.capabilities?.profileDiagnostics ?? [];
  const locations = input.authoringLocations?.locations ?? [];
  const resourceActions = input.resourceActions?.actions ?? [];
  const diagnosticCounts = countDiagnostics(diagnostics);
  const capabilityCounts = countBy(capabilities.map((item) => item.status || "unknown"));
  const unavailableReasons = countBy([
    ...locations.map((item) => item.unavailableReason).filter(isNonEmptyString),
    ...resourceActions.map((item) => item.unavailableReason).filter(isNonEmptyString),
    ...diagnostics.map((item) => getDiagnosticUnavailableReason(item)).filter(isNonEmptyString)
  ]);
  const diagnosticCodes = countBy(diagnostics.map((item) => String(item.code ?? "unknown")));
  const resourceActionStatuses = countBy(resourceActions.map((item) => item.status || "unknown"));

  const lines = [
    `Document: ${index.documentId || input.uri}`,
    `URI: ${input.uri}`,
    `Diagnostics: ${diagnosticCounts.errors} error(s), ${diagnosticCounts.warnings} warning(s), ${diagnosticCounts.information} info/hint`,
    `Resources: ${index.i18nResources?.length ?? 0} resource(s), ${index.i18nKeys?.length ?? 0} key(s), ${index.missingLocales?.length ?? 0} missing locale(s), ${index.sourceReferences?.length ?? 0} source reference(s)`,
    `Authoring locations: ${locations.length} total, ${locations.filter((item) => item.unavailableReason).length} unavailable`,
    `Capabilities: ${formatCounts(capabilityCounts)}`
  ];

  if (input.resourceActions) {
    lines.push(`Resource actions: ${resourceActions.length} total, ${resourceActionStatuses.get("preflight") ?? 0} preflight, ${resourceActionStatuses.get("blocked") ?? 0} blocked`);
  }

  if (profiles.length > 0 || profileDiagnostics.length > 0) {
    const profileIds = profiles
      .map((profile) => profile.profileId && profile.profileVersion ? `${profile.profileId}@${profile.profileVersion}` : profile.profileId)
      .filter(isNonEmptyString);
    const tagCount = profiles.reduce((count, profile) => count + (profile.tagCount ?? 0), 0);
    lines.push(`Profiles: ${profileIds.join(", ") || "none"}; ${tagCount} tag(s), ${profileDiagnostics.length} diagnostic(s)`);
  }

  if (unavailableReasons.size > 0) {
    lines.push(`Unavailable reasons: ${formatCounts(unavailableReasons)}`);
  }

  if (diagnosticCodes.size > 0) {
    lines.push(`Diagnostic codes: ${formatCounts(diagnosticCodes)}`);
  }

  return lines;
}

export function createHiaResourceActionReport(action: HiaResourceActionSummary): string[] {
  const lines = [
    `Action: ${action.title || action.kind || action.id || "HIA resource action"}`,
    `Status: ${action.status || "unknown"}`
  ];

  pushReportLine(lines, "Kind", action.kind);
  pushReportLine(lines, "Target URI", action.targetUri);
  pushReportLine(lines, "Resource path", action.resourcePath);
  pushReportLine(lines, "Resource pointer", action.resourcePointer);
  pushReportLine(lines, "Locale", action.locale);
  pushReportLine(lines, "Key", action.key);
  pushReportLine(lines, "Path", action.path);
  pushReportLine(lines, "Unavailable reason", action.unavailableReason);

  if (action.preflight) {
    pushReportLine(lines, "Preflight edit", action.preflight.editKind);
    pushReportLine(lines, "Preflight target", action.preflight.targetUri);
    pushReportLine(lines, "Preflight resource", action.preflight.resourcePath);
    pushReportLine(lines, "Preflight pointer", action.preflight.resourcePointer);
    pushReportLine(lines, "Conflict status", action.preflight.conflictStatus);
    pushReportLine(lines, "Workspace edit boundary", action.preflight.workspaceEditBoundary);
    lines.push(`Requires file read: ${action.preflight.requiresFileRead ? "yes" : "no"}`);
  }

  return lines;
}

/**
 * 创建 VS Code 可见 review list 的总体摘要，保持 review-only 与 no-source-body 边界可见。
 * Create the visible VS Code review-list summary while keeping review-only and no-source-body boundaries visible.
 */
export function createHiaDocumentationReviewReport(input: HiaDocumentationEditProposalsSummary): string[] {
  const payload = input.reviewPayload;
  const summary = payload?.summary;
  const localeQuality = payload?.localeQuality;
  const privacy = payload?.privacy ?? input.privacy;
  const providerAugmentation = getHiaDocumentationProviderAugmentation(input);
  const lines = [
    `Status: ${input.status || "unknown"}`,
    `Proposals: ${input.proposalCount ?? payload?.proposalCount ?? 0}`,
    `Review items: ${summary?.itemCount ?? payload?.items?.length ?? 0}`,
    `Drafts: ${input.draftCount ?? payload?.draftCount ?? summary?.draftCount ?? 0}`,
    `Quality warnings: ${summary?.qualityWarningCount ?? localeQuality?.checkSummary?.warning ?? 0}`,
    `Quality blocked: ${summary?.qualityBlockedCount ?? localeQuality?.checkSummary?.blocked ?? 0}`,
    `Source content: ${privacy?.includesSourceContent ? "included" : "not included"}`,
    `Sources content policy: ${privacy?.sourcesContentPolicy || "none"}`,
    `Automatic writes: ${privacy?.allowsAutomaticWrites ? "enabled" : "disabled"}`,
    `Human review: ${privacy?.requiresHumanReview ? "required" : "not confirmed"}`
  ];

  if (localeQuality) {
    lines.push(`Locale truth: ${localeQuality.sourceDocumentTruth || "unknown"}`);
    lines.push(`Canonical JS output: ${localeQuality.canonicalJsOutput || "unknown"}`);
    lines.push(`Policy locales: ${(localeQuality.policyLocales || []).join(", ") || "none"}`);
  }

  if (providerAugmentation) {
    const provider = providerAugmentation.provider;
    lines.push(`Provider: ${formatProviderLabel(providerAugmentation)}`);
    lines.push(`Provider status: ${providerAugmentation.status || "unknown"}`);
    lines.push(`Provider drafts: ${providerAugmentation.draftOutputs?.length ?? 0}`);
    lines.push(`Provider metadata: ${providerAugmentation.reviewMetadata?.length ?? 0}`);
    lines.push(`Provider refusals: ${providerAugmentation.refusalOutputs?.length ?? 0}`);
    lines.push(`Provider runtime: ${provider?.runtimeKind || "unknown"}`);
    lines.push(`Provider human review: ${providerAugmentation.actionPolicy?.requiresHumanReview ? "required" : "not confirmed"}`);
    lines.push(`Provider direct apply: ${providerAugmentation.actionPolicy?.directApplyAllowed ? "enabled" : "disabled"}`);
  }

  if (payload?.actionPolicy) {
    lines.push(`Allowed actions: ${(payload.actionPolicy.allowedActions || []).join(", ") || "none"}`);
    lines.push(`Denied actions: ${(payload.actionPolicy.deniedActions || []).join(", ") || "none"}`);
  }

  return lines;
}

/**
 * 将 host-neutral review payload 转成 VS Code QuickPick item。
 * Convert a host-neutral review payload into VS Code QuickPick-friendly item summaries.
 */
export function createHiaDocumentationReviewItemChoices(
  payload?: HiaDocumentationReviewPayloadSummary,
  providerAugmentation = payload?.providerAugmentation
): HiaDocumentationReviewItemChoice[] {
  return (payload?.items || []).map((item, index) => {
    const target = summarizeReviewTarget(item);
    const quality = summarizeReviewQuality(item);
    const action = item.actionHints?.copyDraftAvailable ? "copy draft" : "review";
    const editCandidate = item.actionHints?.editCandidatePreviewAvailable ? "edit preview" : undefined;
    const diffPreview = item.editCandidate?.diffPreview?.status === "preview-only" ? "diff preview" : undefined;
    const applyPreflight = item.editCandidate?.applyPreflight?.status === "requires-host-check" ? "host preflight" : undefined;
    const checkedApplyConfirmation = createHiaDocumentationCheckedApplyConfirmationPreview(item) ? "checked confirmation" : undefined;
    const provider = summarizeReviewProvider(item, providerAugmentation);

    return {
      item,
      ...(providerAugmentation ? { providerAugmentation } : {}),
      label: item.title || item.proposalId || item.id || `Review item ${index + 1}`,
      description: [item.kind, item.status, item.risk?.level ? `risk:${item.risk.level}` : undefined]
        .filter(isNonEmptyString)
        .join(" | "),
      detail: [target, quality, provider, editCandidate, diffPreview, applyPreflight, checkedApplyConfirmation, `action:${action}`]
        .filter(isNonEmptyString)
        .join(" | ")
    };
  });
}

/**
 * 创建单个 review item 的可读详情报告。
 * Creates a readable detail report for a single review item.
 */
export function createHiaDocumentationReviewItemReport(
  item: HiaDocumentationReviewPayloadItemSummary,
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary
): string[] {
  const qualityCounts = countBy((item.qualityChecks || []).map((check) => check.status || "unknown"));
  const providerItem = summarizeProviderItemCounts(item, providerAugmentation);
  const lines = [
    `Title: ${item.title || item.proposalId || item.id || "HIA documentation proposal"}`,
    `Proposal: ${item.proposalId || item.id || "unknown"}`,
    `Kind: ${item.kind || "unknown"}`,
    `Status: ${item.status || "unknown"}`,
    `Risk: ${item.risk?.level || "unknown"}`,
    `Target: ${summarizeReviewTarget(item) || "unknown"}`,
    `Draft: ${item.draft ? item.draft.draftKind || "available" : "none"}`,
    `Edit candidate: ${item.editCandidate?.status || "none"}${item.editCandidate?.kind ? ` (${item.editCandidate.kind})` : ""}`,
    `Diff preview: ${item.editCandidate?.diffPreview?.status || "none"}${item.editCandidate?.diffPreview?.targetKind ? ` (${item.editCandidate.diffPreview.targetKind})` : ""}`,
    `Apply preflight: ${item.editCandidate?.applyPreflight?.status || "none"}${item.editCandidate?.applyPreflight?.conflictStatus ? ` (conflict:${item.editCandidate.applyPreflight.conflictStatus})` : ""}`,
    `Context links: docSourceMap=${item.contextLinks?.docSourceMapEntryCount ?? 0}, project=${item.contextLinks?.projectEntryCount ?? 0}, relations=${item.contextLinks?.relationCount ?? 0}`,
    `Action hints: copyDraft=${item.actionHints?.copyDraftAvailable ? "yes" : "no"}, editPreview=${item.actionHints?.editCandidatePreviewAvailable ? "yes" : "no"}, openContext=${item.actionHints?.openContextAvailable ? "yes" : "no"}, apply=${item.actionHints?.applyAvailable ? "yes" : "no"}`,
    `Quality checks: ${formatCounts(qualityCounts)}`,
    `Workspace edit boundary: ${item.workspaceEditBoundary || "not available"}`
  ];

  if (providerAugmentation) {
    lines.push(`Provider: ${formatProviderLabel(providerAugmentation)}`);
    lines.push(`Provider drafts: ${providerItem.draftCount}`);
    lines.push(`Provider metadata: ${providerItem.metadataCount}`);
    lines.push(`Provider refusals: ${providerItem.refusalCount}`);
    lines.push(`Provider quality signals: ${providerItem.qualitySignals.join(", ") || "none"}`);
    lines.push(`Provider direct apply: ${providerAugmentation.actionPolicy?.directApplyAllowed ? "enabled" : "disabled"}`);
  }

  for (const reason of item.risk?.reasons || []) {
    lines.push(`Risk reason: ${reason}`);
  }

  for (const check of item.qualityChecks || []) {
    lines.push(`Quality ${check.status || "unknown"}: ${check.code || "unknown"}${check.message ? ` - ${check.message}` : ""}`);
  }

  return lines;
}

/**
 * 从 review item 的 apply preflight 派生 VS Code checked apply confirmation 的保守预览。
 * Derives a conservative VS Code checked apply confirmation preview from an apply preflight review item.
 *
 * 中文：该 helper 用于当前 VS Code first slice；它不会把 preflight 升级为可写事务，只标明最终确认链路仍被阻断。
 * English: This helper serves the current VS Code first slice; it does not upgrade preflight data into a writable transaction and keeps final apply blocked.
 */
export function createHiaDocumentationCheckedApplyConfirmationPreview(
  item: HiaDocumentationReviewPayloadItemSummary
): HiaDocumentationCheckedApplyConfirmationSummary | undefined {
  const preflight = item.editCandidate?.applyPreflight;

  if (!preflight) {
    return undefined;
  }

  const targetFile = preflight.targetFiles?.[0];
  const summary: HiaDocumentationCheckedApplyConfirmationSummary = {
    applyAuthorityStillBlocked: true,
    confirmationState: "preflight-only",
    directApplyAllowed: false,
    finalConflictRecheckRequired: true,
    finalHumanConfirmationRequired: true,
    formatterExecutionRequiredAtApply: true,
    postApplyValidationRequired: true,
    readyForHostConfirmation: false,
    reportSource: "vscode-review-preflight-preview",
    targetRepositoryMutationAllowed: false,
    workspaceWriteAllowed: false
  };
  const transactionId = preflight.id || item.editCandidate?.id || item.proposalId || item.id;
  const targetKind = preflight.targetKind || item.editCandidate?.kind || item.kind;
  const conflictStatus = preflight.conflictStatus || targetFile?.conflict?.status;
  const formatterId = targetFile?.formatting?.formatter;

  if (transactionId) {
    summary.transactionId = transactionId;
  }

  if (targetKind) {
    summary.targetKind = targetKind;
  }

  if (conflictStatus) {
    summary.conflictStatus = conflictStatus;
  }

  if (preflight.rollback?.recordRequired) {
    summary.rollbackRecordId = "required-at-apply";
  }

  if (formatterId) {
    summary.formatterId = formatterId;
    summary.formatterStatus = "planned-by-preflight";
  } else {
    summary.formatterStatus = "required-at-apply";
  }

  return summary;
}

/**
 * 将 checked apply confirmation 摘要转为 VS Code QuickPick 选择项。
 * Converts checked apply confirmation summaries into VS Code QuickPick-friendly choices.
 */
export function createHiaDocumentationCheckedApplyConfirmationChoices(
  confirmations: readonly HiaDocumentationCheckedApplyConfirmationSummary[]
): HiaDocumentationCheckedApplyConfirmationChoice[] {
  return confirmations.map((confirmation, index) => {
    const label = `Checked apply confirmation ${index + 1}`;
    const readiness = confirmation.readyForHostConfirmation ? "ready for host confirmation" : confirmation.confirmationState || "confirmation preview";
    const applyBoundary = confirmation.applyAuthorityStillBlocked === false ? "apply authority open" : "apply authority blocked";
    const detail = [
      confirmation.transactionId,
      confirmation.targetKind,
      confirmation.conflictStatus ? `conflict:${confirmation.conflictStatus}` : undefined,
      confirmation.rollbackRecordId ? `rollback:${confirmation.rollbackRecordId}` : undefined,
      confirmation.formatterId ? `formatter:${confirmation.formatterId}` : confirmation.formatterStatus ? `formatter:${confirmation.formatterStatus}` : undefined,
      confirmation.applyAuditRecordId ? `audit:${confirmation.applyAuditRecordId}` : undefined
    ]
      .filter(isNonEmptyString)
      .join(" | ");
    const choice: HiaDocumentationCheckedApplyConfirmationChoice = {
      confirmation,
      description: `${readiness}; ${applyBoundary}`,
      label
    };

    if (detail) {
      choice.detail = detail;
    }

    return choice;
  });
}

/**
 * 创建 checked apply confirmation 的可读报告行。
 * Creates readable report lines for a checked apply confirmation preview.
 */
export function createHiaDocumentationCheckedApplyConfirmationReport(
  confirmation: HiaDocumentationCheckedApplyConfirmationSummary
): string[] {
  const lines = [
    `Transaction: ${confirmation.transactionId || "unknown"}`,
    `Source: ${confirmation.reportSource || "host-readiness-result"}`,
    `State: ${confirmation.currentState || confirmation.confirmationState || "unknown"}`,
    `Target kind: ${confirmation.targetKind || "unknown"}`,
    `Conflict status: ${confirmation.conflictStatus || "unknown"}`,
    `Ready for host confirmation: ${formatYesNo(confirmation.readyForHostConfirmation)}`,
    `Final human confirmation: ${formatRequiredStatus(confirmation.finalHumanConfirmationRequired)}`,
    `Final conflict recheck: ${formatRequiredStatus(confirmation.finalConflictRecheckRequired)}`,
    `Rollback record: ${confirmation.rollbackRecordId || "not available"}`,
    `Formatter: ${confirmation.formatterId || confirmation.formatterStatus || "not available"}`,
    `Formatter execution: ${formatRequiredStatus(confirmation.formatterExecutionRequiredAtApply)}`,
    `Post-apply validation: ${formatRequiredStatus(confirmation.postApplyValidationRequired)}`,
    `Apply audit record: ${confirmation.applyAuditRecordId || "not available"}`,
    `Apply authority: ${confirmation.applyAuthorityStillBlocked === false ? "not blocked" : "blocked"}`,
    `Direct apply: ${formatEnabledDisabled(confirmation.directApplyAllowed)}`,
    `Workspace write: ${formatEnabledDisabled(confirmation.workspaceWriteAllowed)}`,
    `Target repository mutation: ${formatEnabledDisabled(confirmation.targetRepositoryMutationAllowed)}`,
    "Source bodies: not shown by the VS Code checked apply confirmation preview."
  ];

  pushReportLine(lines, "Formatter validation record", confirmation.formatterValidationRecordId);

  return lines;
}

/**
 * 将 W-P38 sandbox evidence 转成 VS Code 可展示的确认选择项。
 * Converts W-P38 sandbox evidence into VS Code-visible confirmation choices.
 *
 * 中文：该 helper 只公开 sandbox transaction 的 gate 状态；不会输出源码正文、
 * rollback 内容或任何可执行编辑对象。
 * English: This helper exposes only sandbox transaction gate states; it does
 * not emit source bodies, rollback contents or executable edit objects.
 */
export function createHiaCheckedApplySandboxConfirmationChoices(
  evidence: HiaCheckedApplySandboxEvidenceSummary
): HiaCheckedApplySandboxConfirmationChoice[] {
  const transactions = Array.isArray(evidence.transactionResults) ? evidence.transactionResults : [];

  return transactions.map((transaction, index) => {
    const label = transaction.label || transaction.id || `Sandbox checked apply ${index + 1}`;
    const applyStatus = transaction.applyStatus || "apply status unknown";
    const scope = transaction.outputScope || "scope unknown";
    const targetMode = transaction.targetRepositoryMode || "target mode unknown";
    const detail = [
      transaction.id,
      transaction.targetKind,
      transaction.sandboxRelativePath,
      transaction.repeatConflictCheck ? `conflict:${transaction.repeatConflictCheck}` : undefined,
      transaction.formatterExecution ? `formatter:${transaction.formatterExecution}` : undefined,
      transaction.postApplyValidation ? `validation:${transaction.postApplyValidation}` : undefined,
      transaction.auditRecord ? `audit:${transaction.auditRecord}` : transaction.redactedAuditRecordId ? `audit:${transaction.redactedAuditRecordId}` : undefined
    ]
      .filter(isNonEmptyString)
      .join(" | ");

    return {
      description: `${applyStatus}; ${scope}; ${targetMode}`,
      detail,
      label,
      transaction
    };
  });
}

/**
 * 创建 W-P38 sandbox checked-apply confirmation 的可读报告行。
 * Creates readable report lines for a W-P38 sandbox checked-apply confirmation.
 */
export function createHiaCheckedApplySandboxConfirmationReport(
  evidence: HiaCheckedApplySandboxEvidenceSummary,
  transaction?: HiaCheckedApplySandboxTransactionSummary
): string[] {
  const summary = evidence.summary || {};
  const policy = evidence.sandboxPolicy || {};
  const lines = [
    `Evidence: ${evidence.contract || "unknown"}@${evidence.contractVersion || "unknown"}`,
    `Status: ${evidence.status || "unknown"}`,
    `Apply authority: ${policy.applyAuthority || "host-owned-sandbox-only"}`,
    `Output scope: ${transaction?.outputScope || policy.outputScope || "unknown"}`,
    `Transaction: ${transaction?.id || "summary"}`,
    `Target kind: ${transaction?.targetKind || "unknown"}`,
    `Apply status: ${transaction?.applyStatus || "unknown"}`,
    `Final human confirmation: ${transaction?.finalHumanConfirmation || "unknown"}`,
    `Final conflict recheck: ${transaction?.repeatConflictCheck || "unknown"}`,
    `Rollback private snapshot: ${formatYesNo(transaction?.rollbackSnapshotPrepared)}`,
    `Formatter execution: ${transaction?.formatterExecution || "unknown"}`,
    `Post-apply validation: ${transaction?.postApplyValidation || "unknown"}`,
    `Apply audit record: ${transaction?.auditRecord || transaction?.redactedAuditRecordId || "unknown"}`,
    `Sandbox apply successes: ${formatOptionalNumber(summary.sandboxApplySuccessCount)}`,
    `Sandbox write operations: ${formatOptionalNumber(summary.sandboxWriteOperationCount)}`,
    `Workspace applyEdit: ${formatDisabledByZero(summary.workspaceApplyEditCallCount)}`,
    `Workspace write: ${formatDisabledByZero(summary.workspaceWriteAllowedCount)}`,
    `Target repository mutation: ${formatDisabledByZero(summary.targetRepositoryMutationCount)}`,
    `Provider-owned apply: ${formatDisabledByZero(summary.providerOwnedApplyCount)}`,
    `LSP server-owned apply: ${formatDisabledByZero(summary.lspServerOwnedApplyCount)}`,
    `Direct apply: ${formatDisabledByZero(summary.directApplyAllowedCount)}`,
    `Direct edit object: ${formatDisabledByZero(summary.directEditObjectCount)}`,
    `Sources content policy: ${summary.sourcesContentPolicy || policy.sourcesContentPolicy || "none"}`,
    `Source bodies: ${summary.sourceBodyIncludedInEvidence ? "included" : "not shown by the VS Code checked apply sandbox confirmation."}`,
    "Manual GUI confirmation: required before user-facing apply UX is enabled."
  ];

  return lines;
}

/**
 * 将 W-P43 host UX intake evidence 转成 VS Code 可展示的宿主 surface 选择项。
 * Converts W-P43 host UX intake evidence into VS Code-visible host surface choices.
 */
export function createHiaHostApplyUxSurfaceChoices(
  evidence: HiaHostApplyUxIntakeEvidenceSummary
): HiaHostApplyUxSurfaceChoice[] {
  const surfaces = Array.isArray(evidence.hostSurfaces) ? evidence.hostSurfaces : [];

  return surfaces.map((surface, index) => {
    const label = surface.label || surface.id || `Host apply UX surface ${index + 1}`;
    const status = surface.status || "surface status unknown";
    const applyBoundary = surface.checkedApplyWriteEnabled ? "写入启用 / apply write enabled" : "写入禁用 / apply write disabled";
    const detail = [
      surface.id,
      surface.surface,
      `requirements:${surface.uxRequirementRefs?.length ?? 0}`,
      surface.providerReviewLinkageVisible ? "provider 审查可见 / provider review visible" : undefined,
      surface.targetOwnerEvidenceVisible ? "target-owner 证据可见 / target-owner visible" : undefined,
      surface.deferredGateVisible ? "deferred gate 可见 / deferred gates visible" : undefined
    ]
      .filter(isNonEmptyString)
      .join(" | ");

    return {
      description: `${status}; ${applyBoundary}`,
      detail,
      label,
      surface
    };
  });
}

/**
 * 创建 W-P43 host-owned apply UX intake 的可读报告行。
 * Creates readable report lines for W-P43 host-owned apply UX intake.
 */
export function createHiaHostApplyUxIntakeReport(
  evidence: HiaHostApplyUxIntakeEvidenceSummary,
  surface?: HiaHostApplyUxSurfaceSummary
): string[] {
  const summary = evidence.summary || {};
  const selectedSurface = surface || evidence.hostSurfaces?.[0];
  const lines = [
    `Evidence / 证据: ${evidence.contract || "unknown"}@${evidence.contractVersion || "unknown"}`,
    `Status / 状态: ${evidence.status || "unknown"}`,
    `Surface / 宿主界面: ${selectedSurface?.label || selectedSurface?.id || "summary"}`,
    `Surface status / 界面状态: ${selectedSurface?.status || "not selected"}`,
    `UX requirements / UX 要求: ${formatOptionalNumber(summary.readyUxRequirementCount)} / ${formatOptionalNumber(summary.uxRequirementCount)} ready / 就绪`,
    `Provider review rules / Provider 审查规则: ${formatOptionalNumber(summary.providerReviewDisplayRuleCount)}`,
    `Target-owner rules / Target-owner 规则: ${formatOptionalNumber(summary.targetOwnerDisplayRuleCount)}`,
    `Host surfaces / 宿主界面数量: ${formatOptionalNumber(summary.readyHostSurfaceCount)} / ${formatOptionalNumber(summary.hostSurfaceCount)} ready / 就绪`,
    `Provider review-only / Provider 仅审查: ${formatYesNo(summary.providerOutputReviewOnly)}`,
    `Target-owner action required / 需要 target-owner 操作: ${formatYesNo(summary.targetOwnerActionRequired)}`,
    `Target-owner execution claimed / target-owner 已声明执行: ${formatYesNo(summary.targetOwnerExecutionClaimed)}`,
    `Checked apply write / checked apply 写入: ${formatEnabledDisabled(summary.checkedApplyWriteEnabled)}`,
    `Workspace write / 工作区写入: ${formatDisabledByZero(summary.workspaceWriteAllowedCount)}`,
    `Target repository mutation / 目标仓库变更: ${formatDisabledByZero(summary.targetRepositoryMutationCount)}`,
    `Checked apply trigger / checked apply 触发: ${formatDisabledByZero(summary.checkedApplyTriggeredCount)}`,
    `Direct edit object / 直接编辑对象: ${formatDisabledByZero(summary.directEditObjectCount)}`,
    `Provider network / Provider 网络访问: ${formatDisabledByZero(summary.providerNetworkExecutedCount)}`,
    `Target command by HIA / HIA 执行目标命令: ${formatDisabledByZero(summary.targetCommandExecutedByHiaCount)}`,
    `Runtime capture / 运行时采集: ${formatDisabledByZero(summary.actualRuntimeCaptureExecutedCount)}`,
    `Host editor API / 宿主编辑器 API: ${formatDisabledByZero(summary.hostEditorApiCallCount)}`,
    `Sources content policy / 源码正文策略: ${summary.sourcesContentPolicy || selectedSurface?.sourcesContentPolicy || "none"}`,
    `Source bodies / 源码正文: ${summary.sourceBodyIncludedInEvidence ? "included / 已包含" : "未显示在 VS Code host apply UX intake 中。"}`
  ];

  for (const requirement of evidence.uxRequirements || []) {
    lines.push(`UX requirement / UX 要求: ${requirement.id || "unknown"} - ${requirement.status || "unknown"}`);
  }

  for (const rule of evidence.providerReviewDisplayRules || []) {
    lines.push(`Provider rule / Provider 规则: ${rule.id || "unknown"} - ${rule.status || "unknown"}`);
  }

  for (const rule of evidence.targetOwnerDisplayRules || []) {
    lines.push(`Target-owner rule / Target-owner 规则: ${rule.id || "unknown"} - ${rule.status || "unknown"}`);
  }

  return lines;
}

/**
 * 将 W-P50 VS Code authoring surface evidence 转成 VS Code picker 选择项。
 * Converts W-P50 VS Code authoring surface evidence into VS Code picker items.
 *
 * @lang zh-CN 这些选择项只展示 authoring guidance，不包含可执行 edit 或 workspace write。
 * @lang en These choices only display authoring guidance and contain no executable edit or workspace write.
 */
export function createHiaVscodeAuthoringSurfaceChoices(
  evidence: HiaVscodeAuthoringSurfaceEvidenceSummary
): HiaVscodeAuthoringSurfaceChoice[] {
  const modes = Array.isArray(evidence.authoringModes) ? evidence.authoringModes : [];

  return modes.map((mode, index) => {
    const label = mode.label || mode.id || `Authoring mode ${index + 1}`;
    const status = mode.status || "unknown";
    const priority = mode.priority || "P?";
    const writeAuthority = mode.writeAuthority || evidence.vscodeSurface?.writeAuthority || "disabled";
    const detail = [
      mode.id,
      priority,
      `visible:${mode.visibleIn?.length ?? 0}`,
      `source:${mode.sourcePhases?.join("+") || "unknown"}`,
      `write:${writeAuthority}`
    ]
      .filter(isNonEmptyString)
      .join(" | ");

    return {
      description: `${status}; ${writeAuthority === "disabled" ? "写入禁用 / write disabled" : `write:${writeAuthority}`}`,
      detail,
      label,
      mode
    };
  });
}

/**
 * 创建 W-P50 VS Code authoring surface 的中英双语可读报告行。
 * Creates bilingual readable report lines for the W-P50 VS Code authoring surface.
 *
 * @lang zh-CN 报告必须让 marker completion、changed-scope preview、fixture guidance 和 no-write 边界同时可见。
 * @lang en The report must make marker completion, changed-scope preview, fixture guidance, and the no-write boundary visible together.
 */
export function createHiaVscodeAuthoringSurfaceReport(
  evidence: HiaVscodeAuthoringSurfaceEvidenceSummary,
  mode?: HiaVscodeAuthoringModeSummary
): string[] {
  const summary = evidence.summary || {};
  const surface = evidence.vscodeSurface || {};
  const selectedMode = mode || evidence.authoringModes?.[0];
  const lines = [
    `Evidence / 证据: ${evidence.contract || "unknown"}@${evidence.contractVersion || "unknown"}`,
    `Status / 状态: ${evidence.status || "unknown"}`,
    `Phase / 阶段: ${evidence.phase || "unknown"}`,
    `Surface / 宿主界面: ${surface.label || surface.id || "VS Code Extension"}`,
    `Command / 命令: ${surface.commandId || HIA_SHOW_AUTHORING_SURFACE_COMMAND}`,
    `Surface status / 界面状态: ${surface.status || "unknown"}`,
    `Selected mode / 已选模式: ${selectedMode?.label || selectedMode?.id || "summary"}`,
    `Mode status / 模式状态: ${selectedMode?.status || "not selected"}`,
    `Mode priority / 模式优先级: ${selectedMode?.priority || "unknown"}`,
    `Mode guidance / 模式说明: ${selectedMode?.descriptionZh || "未提供"}`,
    `Visible surfaces / 可见界面: ${formatOptionalNumber(summary.visibleSurfaceCount ?? surface.visibleSurfaces?.length)}`,
    `Authoring modes / authoring 模式: ${formatOptionalNumber(summary.authoringModeCount ?? evidence.authoringModes?.length)}`,
    `Marker completion / marker 补全: ${formatEnabledDisabled(summary.markerCompletionVisible)}`,
    `Command declared / 命令声明: ${formatYesNo(summary.commandDeclared)}`,
    `VS Code command registered / VS Code 命令注册: ${formatYesNo(summary.vscodeCommandRegistered)}`,
    `Checked apply write / checked apply 写入: ${formatDisabledByZero(summary.checkedApplyWriteEnabledCount)}`,
    `Workspace write / 工作区写入: ${formatDisabledByZero(summary.workspaceWriteAllowedCount)}`,
    `Target repository mutation / 目标仓库变更: ${formatDisabledByZero(summary.targetRepositoryMutationCount)}`,
    `Checked apply trigger / checked apply 触发: ${formatDisabledByZero(summary.checkedApplyTriggeredCount)}`,
    `Target command by HIA / HIA 执行目标命令: ${formatDisabledByZero(summary.targetCommandExecutedByHiaCount)}`,
    `Host editor API / 宿主编辑器 API: ${formatDisabledByZero(summary.hostEditorApiCallCount)}`,
    `Sources content policy / 源码正文策略: ${summary.sourcesContentPolicy || "none"}`,
    `Source bodies / 源码正文: ${summary.sourceBodyIncludedInEvidence ? "included / 已包含" : "not included / 未包含"}`
  ];

  for (const visibleSurface of surface.visibleSurfaces || []) {
    lines.push(`Visible surface / 可见界面: ${visibleSurface}`);
  }

  for (const sourcePhase of selectedMode?.sourcePhases || []) {
    lines.push(`Source phase / 来源阶段: ${sourcePhase}`);
  }

  return lines;
}

/**
 * 中文：将 generated binding 安全投影转为 VS Code picker 选择项。
 * English: Converts a safe generated-binding projection into VS Code picker choices.
 */
export function createHiaVscodeGeneratedBindingRelationChoices(
  evidence: HiaVscodeGeneratedBindingProjectionEvidence
): HiaVscodeGeneratedBindingRelationChoice[] {
  const relations = evidence.projection?.bindings ?? [];

  return relations.map((relation, index) => {
    const memberPath = relation.bindingRef?.memberPath?.join(".") || relation.bindingRef?.rootDeclarationId || "binding ref unavailable";
    const quality = formatHiaGeneratedBindingQuality(relation.quality);
    const targetCount = relation.targets?.length ?? 0;
    return {
      description: `${targetCount} target(s) · ${quality}`,
      detail: `${relation.sourceIntent?.kind || "source intent"}${relation.sourceIntent?.field ? ` / ${relation.sourceIntent.field}` : ""} · ${relation.composition?.relation || "none"}`,
      label: relation.id || `Generated binding ${index + 1}: ${memberPath}`,
      relation
    };
  });
}

/**
 * 中文：创建 generated binding relation 的中英双语只读报告。
 * English: Creates a bilingual read-only report for a generated-binding relation.
 */
export function createHiaVscodeGeneratedBindingRelationReport(
  evidence: HiaVscodeGeneratedBindingProjectionEvidence,
  relation?: HiaVscodeGeneratedBindingRelation
): string[] {
  const projection = evidence.projection || {};
  const summary = projection.summary || evidence.summary || {};
  const selected = relation || projection.bindings?.[0];
  const lines = [
    `Evidence / 证据: ${evidence.contract || "unknown"}@${evidence.contractVersion || "unknown"}`,
    `Status / 状态: ${evidence.status || projection.status || "unknown"}`,
    `Phase / 阶段: ${evidence.phase || "W-P52.6"}`,
    `Projection / 投影: ${projection.contract || "generated-documentation-binding-host-projection"}@${projection.contractVersion || "unknown"}`,
    `Bindings / 绑定: ${formatOptionalNumber(summary.bindingCount)}`,
    `Expansions / 展开: ${formatOptionalNumber(summary.expansionCount)}`,
    `Targets / 目标: ${formatOptionalNumber(summary.targetCount)}`,
    `Stable instance keys / 稳定实例键: ${formatOptionalNumber(summary.stableInstanceKeyCount)}`,
    `Diagnostics / 诊断: ${formatOptionalNumber(summary.diagnosticCount)}`,
    `Source body / 源码正文: ${projection.privacy?.sourceBodyIncluded ? "included / 已包含" : "not included / 未包含"}`,
    `Sidecar path / sidecar 路径: ${projection.privacy?.sidecarPathIncluded ? "included / 已包含" : "not included / 未包含"}`,
    `Locals value / locals 值: ${projection.privacy?.localsValueIncluded ? "included / 已包含" : "not included / 未包含"}`,
    `sourcesContent policy / 源码正文策略: ${projection.privacy?.sourcesContentPolicy || "none"}`
  ];

  if (!selected) {
    return lines;
  }

  const memberPath = selected.bindingRef?.memberPath?.join(".") || selected.bindingRef?.rootDeclarationId || "unknown";
  lines.push(
    `Binding / 绑定: ${selected.id || "unknown"}`,
    `Binding ref / 绑定引用: ${memberPath}`,
    `Source intent / 上游意图: ${selected.sourceIntent?.kind || "unknown"}${selected.sourceIntent?.field ? ` / ${selected.sourceIntent.field}` : ""}`,
    `Resolution / 解析质量: ${formatHiaGeneratedBindingQuality(selected.quality)}`,
    `Composition / 组合: ${selected.composition?.relation || "none"} / ${selected.composition?.mergePolicy || "not-applicable"}`
  );

  for (const expansion of selected.expansions || []) {
    lines.push(`Expansion / 展开: ${expansion.id || "unknown"} · key=${expansion.instanceKey?.displayKey || expansion.instanceKey?.status || "unknown"} · ${formatHiaGeneratedBindingQuality(expansion.quality)} · targets=${expansion.targetIds?.length ?? 0}`);
  }
  for (const target of selected.targets || []) {
    const identity = target.identity || {};
    lines.push(`Target / 目标: ${target.id || "unknown"} · ${identity.kind || "unknown"}${identity.selector ? ` · ${identity.selector}` : ""}${identity.symbolId ? ` · ${identity.symbolId}` : ""}`);
  }

  return lines;
}

function formatHiaGeneratedBindingQuality(quality: HiaVscodeGeneratedBindingQuality | undefined): string {
  return `${quality?.resolutionKind || "unknown"} / ${quality?.confidence || "unknown"} / ${quality?.provenanceCoverage || "unknown"}`;
}

/**
 * 创建 provider augmentation 的可读审查摘要。
 * Create a readable review summary for provider augmentation data.
 */
export function createHiaDocumentationReviewProviderReport(
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary
): string[] {
  if (!providerAugmentation) {
    return ["Provider: none"];
  }

  const actionPolicy = providerAugmentation.actionPolicy;
  const privacy = providerAugmentation.privacy;
  return [
    `Provider: ${formatProviderLabel(providerAugmentation)}`,
    `Provider status: ${providerAugmentation.status || "unknown"}`,
    `Provider drafts: ${providerAugmentation.draftOutputs?.length ?? 0}`,
    `Provider metadata: ${providerAugmentation.reviewMetadata?.length ?? 0}`,
    `Provider refusals: ${providerAugmentation.refusalOutputs?.length ?? 0}`,
    `Provider direct apply: ${actionPolicy?.directApplyAllowed ? "enabled" : "disabled"}`,
    `Provider direct edit object: ${actionPolicy?.directEditObjectAllowed ? "enabled" : "disabled"}`,
    `Provider workspace write: ${actionPolicy?.workspaceWriteAllowed ? "enabled" : "disabled"}`,
    `Provider target mutation: ${actionPolicy?.targetRepositoryMutationAllowed ? "enabled" : "disabled"}`,
    `Provider tool execution: ${actionPolicy?.toolExecutionAllowed ? "enabled" : "disabled"}`,
    `Provider human review: ${actionPolicy?.requiresHumanReview ? "required" : "not confirmed"}`,
    `Provider sources content policy: ${privacy?.sourcesContentPolicy || "none"}`,
    `Provider source body: ${privacy?.includesSourceBody ? "included" : "not included"}`
  ];
}

export function getHiaDocumentationProviderAugmentation(
  input?: HiaDocumentationEditProposalsSummary
): HiaProviderReviewPayloadAugmentationSummary | undefined {
  return input?.providerAugmentation ?? input?.reviewPayload?.providerAugmentation;
}

/**
 * 取出可复制的 review draft 文本，优先使用 plain text，其次合并 localeDrafts。
 * Gets copyable review draft text, preferring plain text and falling back to merged localeDrafts.
 */
export function getHiaDocumentationReviewDraftText(item: HiaDocumentationReviewPayloadItemSummary): string | undefined {
  if (item.draft?.text && item.draft.text.trim()) {
    return item.draft.text;
  }

  const localeDrafts = Object.entries(item.draft?.localeDrafts || {})
    .filter(([, text]) => text.trim().length > 0);

  if (localeDrafts.length === 0) {
    return undefined;
  }

  return localeDrafts
    .map(([locale, text]) => `[${locale}]\n${text}`)
    .join("\n\n");
}

export function createHiaPreviewReport(input: HiaPreviewStatusReportInput): string[] {
  const status = input.previewExists
    ? input.staleReason ? "stale" : "ready"
    : "missing";
  const lines = [
    `Strategy: generated-html`,
    `Status: ${status}`,
    `Preview file: ${input.previewPath}`,
    `Preview source: ${input.source}`,
    `Manifest: ${input.manifestExists ? input.manifestPath : `${input.manifestPath} (missing)`}`
  ];

  if (typeof input.manifest?.entrypoint === "string") {
    lines.push(`Manifest entrypoint: ${input.manifest.entrypoint}`);
  }

  if (input.manifest?.documentId) {
    lines.push(`Document: ${input.manifest.documentId}`);
  }

  if (input.manifest?.title) {
    lines.push(`Title: ${input.manifest.title}`);
  }

  if (input.manifest?.initialLocale) {
    lines.push(`Initial locale: ${input.manifest.initialLocale}`);
  }

  if (input.staleReason) {
    lines.push(`Stale reason: ${input.staleReason}`);
  }

  return lines;
}

function summarizeReviewTarget(item: HiaDocumentationReviewPayloadItemSummary): string | undefined {
  const target = item.target;

  if (!target) {
    return undefined;
  }

  return [
    target.relativePath,
    target.symbolName || target.symbolId,
    target.fieldPath,
    target.locale ? `locale:${target.locale}` : undefined,
    target.diagnosticCode
  ]
    .filter(isNonEmptyString)
    .join(" ");
}

function formatEnabledDisabled(value: boolean | undefined): string {
  if (value === undefined) {
    return "unknown";
  }

  return value ? "enabled" : "disabled";
}

function formatDisabledByZero(value: number | undefined): string {
  if (value === undefined) {
    return "unknown";
  }

  return value === 0 ? "disabled" : `enabled:${value}`;
}

function formatOptionalNumber(value: number | undefined): string {
  return value === undefined ? "unknown" : String(value);
}

function formatRequiredStatus(value: boolean | undefined): string {
  if (value === undefined) {
    return "unknown";
  }

  return value ? "required" : "not required";
}

function formatYesNo(value: boolean | undefined): string {
  if (value === undefined) {
    return "unknown";
  }

  return value ? "yes" : "no";
}

function summarizeReviewQuality(item: HiaDocumentationReviewPayloadItemSummary): string | undefined {
  const counts = countBy((item.qualityChecks || []).map((check) => check.status || "unknown"));
  return counts.size > 0 ? `quality:${formatCounts(counts)}` : undefined;
}

function summarizeReviewProvider(
  item: HiaDocumentationReviewPayloadItemSummary,
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary
): string | undefined {
  if (!providerAugmentation) {
    return undefined;
  }

  const counts = summarizeProviderItemCounts(item, providerAugmentation);
  return `provider:drafts=${counts.draftCount}, metadata=${counts.metadataCount}, refusals=${counts.refusalCount}`;
}

function summarizeProviderItemCounts(
  item: HiaDocumentationReviewPayloadItemSummary,
  providerAugmentation?: HiaProviderReviewPayloadAugmentationSummary
): { draftCount: number; metadataCount: number; refusalCount: number; qualitySignals: string[] } {
  if (!providerAugmentation) {
    return {
      draftCount: 0,
      metadataCount: 0,
      refusalCount: 0,
      qualitySignals: []
    };
  }

  const providerReviewItemId = findProviderReviewItemId(item, providerAugmentation);
  const draftOutputs = (providerAugmentation.draftOutputs || [])
    .filter((output) => !providerReviewItemId || output.target?.reviewItemId === providerReviewItemId);
  const draftProposalIds = new Set(draftOutputs.map((output) => output.proposalId).filter(isNonEmptyString));
  const reviewMetadata = (providerAugmentation.reviewMetadata || [])
    .filter((output) => draftProposalIds.size === 0 || (output.proposalId && draftProposalIds.has(output.proposalId)));
  const refusalOutputs = providerAugmentation.refusalOutputs || [];
  const qualitySignals = [...new Set(reviewMetadata.flatMap((output) => output.qualitySignals || []))].sort();

  return {
    draftCount: draftOutputs.length,
    metadataCount: reviewMetadata.length,
    refusalCount: refusalOutputs.length,
    qualitySignals
  };
}

function findProviderReviewItemId(
  item: HiaDocumentationReviewPayloadItemSummary,
  providerAugmentation: HiaProviderReviewPayloadAugmentationSummary
): string | undefined {
  const sourceId = item.id || item.proposalId;
  const binding = (providerAugmentation.reviewItemBindings || [])
    .find((candidate) => candidate.sourceReviewItemId === sourceId);
  return binding?.providerReviewItemId;
}

function formatProviderLabel(providerAugmentation: HiaProviderReviewPayloadAugmentationSummary): string {
  const provider = providerAugmentation.provider;
  const id = provider?.id || "unknown";
  const version = provider?.version ? `@${provider.version}` : "";
  return `${id}${version}`;
}

export function getHiaPreviewStaleReason(input: {
  manifestMtimeMs?: number;
  previewMtimeMs?: number;
  sourceMtimeMs?: number;
}): HiaPreviewUnavailableReason | undefined {
  if (input.previewMtimeMs === undefined) {
    return undefined;
  }

  if (input.sourceMtimeMs !== undefined && input.sourceMtimeMs > input.previewMtimeMs) {
    return "active-document-newer-than-preview";
  }

  if (input.manifestMtimeMs !== undefined && input.manifestMtimeMs > input.previewMtimeMs) {
    return "manifest-newer-than-preview";
  }

  return undefined;
}

export function createHiaDocumentSelector(): HiaDocumentSelectorItem[] {
  return [
    {
      scheme: "file",
      language: HIA_LANGUAGE_ID
    },
    {
      scheme: "file",
      pattern: "**/*.hia.json"
    },
    {
      scheme: "file",
      pattern: "**/*.docmap.json"
    },
    {
      scheme: "file",
      pattern: "**/project-index.json"
    }
  ];
}

export function createHiaFileWatcherPattern(): string {
  return "**/{*.hia.json,*.docmap.json,project-index.json}";
}

function normalizeOptionalSetting(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOutputRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function isSafeOutputRelativePath(value: string): boolean {
  return Boolean(value)
    && value !== "."
    && !path.isAbsolute(value)
    && value !== ".."
    && !value.startsWith("../")
    && !value.includes("/../")
    && !value.endsWith("/..");
}

function pushOption(args: string[], name: string, value: string | undefined): void {
  if (value) {
    args.push(name, value);
  }
}

function pushReportLine(lines: string[], label: string, value: string | undefined): void {
  if (value) {
    lines.push(`${label}: ${value}`);
  }
}

function countDiagnostics(diagnostics: HiaDiagnosticSummary[]): { errors: number; information: number; warnings: number } {
  const counts = {
    errors: 0,
    information: 0,
    warnings: 0
  };

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 0) {
      counts.errors += 1;
    } else if (diagnostic.severity === 1) {
      counts.warnings += 1;
    } else {
      counts.information += 1;
    }
  }

  return counts;
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

function getDiagnosticUnavailableReason(diagnostic: HiaDiagnosticSummary): string | undefined {
  if (!isRecord(diagnostic.data)) {
    return undefined;
  }

  const reason = diagnostic.data.unavailableReason;
  return isNonEmptyString(reason) ? reason : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
