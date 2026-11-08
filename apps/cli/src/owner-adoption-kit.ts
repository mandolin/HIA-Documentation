import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @lang zh-CN 可复用 target-owner adoption kit 的中性 contract 名称；它只编排既有 contract，不授予目标执行权。
 * @lang en Neutral contract name for the reusable target-owner adoption kit; it composes existing contracts without granting target execution authority.
 */
export const TARGET_OWNER_ADOPTION_KIT_CONTRACT = "target-owner-adoption-kit" as const;

/**
 * @lang zh-CN adoption kit 的首个 exact-match 草案版本；未知 future draft 必须 fail closed。
 * @lang en First exact-match draft version of the adoption kit; unknown future drafts must fail closed.
 */
export const TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN CLI owner-local JSON Schema identity；该 URI 只表示 identity，不承诺在线分发。
 * @lang en CLI owner-local JSON Schema identity; the URI is identity only and does not promise online distribution.
 */
export const TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/target-owner-adoption-kit-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN W-P89 首轮允许的两个 owner-mediated family。
 * @lang en Two owner-mediated families allowed by the first W-P89 slice.
 */
export const TARGET_OWNER_ADOPTION_KIT_FAMILIES = ["enterprise-business", "workspace-container"] as const;

/**
 * @lang zh-CN adoption kit family。
 * @lang en Adoption-kit family.
 */
export type TargetOwnerAdoptionKitFamily = typeof TARGET_OWNER_ADOPTION_KIT_FAMILIES[number];

/**
 * @lang zh-CN owner 可记录的反馈决策；任何值都不等价于 adoption。
 * @lang en Owner feedback decisions; no value is equivalent to adoption.
 */
export const TARGET_OWNER_ADOPTION_KIT_DECISIONS = [
  "not-recorded",
  "owner-submitted-valid",
  "owner-submitted-rejected",
  "owner-deferred",
  "owner-blocked",
  "follow-up-required"
] as const;

/**
 * @lang zh-CN owner feedback decision。
 * @lang en Owner feedback decision.
 */
export type TargetOwnerAdoptionKitDecision = typeof TARGET_OWNER_ADOPTION_KIT_DECISIONS[number];

/**
 * @lang zh-CN fixed diagnostic catalog；message 不反射 caller value。
 * @lang en Fixed diagnostic catalog whose messages never reflect caller values.
 */
export const TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES = [
  "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID",
  "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID",
  "HIA_OWNER_ADOPTION_KIT_OWNER_INPUT_MISSING",
  "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID",
  "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID",
  "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED",
  "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED"
] as const;

/**
 * @lang zh-CN adoption kit diagnostic code。
 * @lang en Adoption-kit diagnostic code.
 */
export type TargetOwnerAdoptionKitDiagnosticCode = typeof TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN owner-operated kit 的 closed request；所有内容均为 public-safe metadata 或既有 contract ref。
 * @lang en Closed request for an owner-operated kit; every field is public-safe metadata or an existing contract reference.
 */
export interface TargetOwnerAdoptionKitRequest {
  /**
   * @lang zh-CN 必须精确为target-owner-adoption-kit的请求契约名称。
   * @lang en Request contract name required to match target-owner-adoption-kit exactly.
   */
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  /**
   * @lang zh-CN 必须精确为0.1.0-draft的请求版本。
   * @lang en Request version required to match 0.1.0-draft exactly.
   */
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  /**
   * @lang zh-CN 调用方指定的公开试用标识，必须满足受限稳定标识语法。
   * @lang en Caller-selected public trial identifier required to satisfy the restricted stable-identifier grammar.
   */
  trialId: string;
  /**
   * @lang zh-CN 调用方指定的公开目标标识，必须满足受限稳定标识语法。
   * @lang en Caller-selected public target identifier required to satisfy the restricted stable-identifier grammar.
   */
  targetId: string;
  /**
   * @lang zh-CN 选择enterprise-business或workspace-container及其固定必需契约集合。
   * @lang en Selects enterprise-business or workspace-container and its fixed required-contract set.
   */
  targetFamily: TargetOwnerAdoptionKitFamily;
  /**
   * @lang zh-CN 调用方提交的负责人材料状态、审阅同意、声明及反馈。
   * @lang en Caller-submitted owner-input state, review consent, attestations and feedback.
   */
  ownerInput: {
    /**
     * @lang zh-CN 调用方声明负责人材料是否已提交，未提交时允许诚实延后。
     * @lang en Caller declaration of whether owner input has been submitted, allowing an honest deferral when false.
     */
    submitted: boolean;
    /**
     * @lang zh-CN 负责人审阅同意的记录状态，已提交材料必须为recorded-for-review。
     * @lang en Recorded owner-review consent state, required to be recorded-for-review for submitted input.
     */
    consent: "not-recorded" | "recorded-for-review";
    /**
     * @lang zh-CN 目标负责人身份声明状态，已提交材料必须为target-owner-attested。
     * @lang en Target-owner attestation state, required to be target-owner-attested for submitted input.
     */
    attestation: "not-provided" | "target-owner-attested";
    /**
     * @lang zh-CN 负责人记录的反馈决策，已提交材料须非not-recorded；各值均为反馈元数据。
     * @lang en Recorded owner feedback decision, required to differ from not-recorded for submitted input and retained as feedback metadata.
     */
    decision: TargetOwnerAdoptionKitDecision;
    /**
     * @lang zh-CN 调用方声明已完成公开安全脱敏，已提交材料必须为true。
     * @lang en Caller attestation that public-safe redaction is complete, required to be true for submitted input.
     */
    redactionAttested: boolean;
  };
  /**
   * @lang zh-CN 目标族允许的精确契约及版本引用，必须唯一；已提交材料须覆盖全部必需引用。
   * @lang en Exact contract/version references allowed for the target family, required to be unique and complete for submitted input.
   */
  providedContractRefs: string[];
  /**
   * @lang zh-CN 工作区目标族的可选计数交接摘要，该族已提交材料时必需，企业目标族禁止提供。
   * @lang en Optional count-only handoff summary required for submitted workspace-family input and forbidden for the enterprise family.
   */
  workspaceHandoff?: {
    /**
     * @lang zh-CN 固定为owner-review-required的交接审阅状态。
     * @lang en Handoff review state fixed to owner-review-required.
     */
    state: "owner-review-required";
    /**
     * @lang zh-CN 调用方声明的仓库负责人数量，有效交接摘要要求为至少2的整数。
     * @lang en Caller-declared repository-owner count, required to be an integer of at least 2 for a valid handoff summary.
     */
    repositoryOwnerCount: number;
    /**
     * @lang zh-CN 调用方声明的交接边数量，有效交接摘要要求为至少1的整数。
     * @lang en Caller-declared handoff-edge count, required to be an integer of at least 1 for a valid handoff summary.
     */
    handoffEdgeCount: number;
    /**
     * @lang zh-CN 固定为false，交接摘要不转移运行时依赖。
     * @lang en Fixed to false, declaring no runtime-dependency transfer in the handoff summary.
     */
    runtimeDependencyTransfer: false;
    /**
     * @lang zh-CN 固定为false，交接摘要声明无需目标写入。
     * @lang en Fixed to false, declaring that the handoff summary requires no target writes.
     */
    targetWriteRequired: false;
  };
  /**
   * @lang zh-CN 必须关闭正文、凭据、私有路径和工作状态输入的封闭隐私声明。
   * @lang en Closed privacy declaration required to exclude bodies, credentials, private paths and working state from input.
   */
  privacy: {
    /**
     * @lang zh-CN 固定为false，声明输入不包含源码正文。
     * @lang en Fixed to false, declaring that input excludes source bodies.
     */
    sourceBodyIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含工件正文。
     * @lang en Fixed to false, declaring that input excludes artifact bodies.
     */
    artifactBodyIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含证据正文。
     * @lang en Fixed to false, declaring that input excludes evidence bodies.
     */
    evidenceBodyIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含命令输出正文。
     * @lang en Fixed to false, declaring that input excludes command-output bodies.
     */
    commandOutputBodyIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含绝对路径或私有路径。
     * @lang en Fixed to false, declaring that input excludes absolute or private paths.
     */
    absoluteOrPrivatePathIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含凭据。
     * @lang en Fixed to false, declaring that input excludes credentials.
     */
    credentialIncluded: false;
    /**
     * @lang zh-CN 固定为false，声明输入不包含工作状态。
     * @lang en Fixed to false, declaring that input excludes working state.
     */
    workingStateIncluded: false;
    /**
     * @lang zh-CN 固定为none，声明不嵌入sourcesContent源码正文。
     * @lang en Fixed to none, declaring that sourcesContent source bodies are not embedded.
     */
    sourcesContentPolicy: "none";
  };
  /**
   * @lang zh-CN 必须全部为false的目标操作、网络、发布与采用声明边界。
   * @lang en Target-operation, network, publication and adoption-claim boundary required to be entirely false.
   */
  permissions: {
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标仓库读取排除边界。
     * @lang en Fixed to false, recording the target-repository-read exclusion boundary of pure metadata evaluation.
     */
    targetRepositoryRead: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标仓库写入排除边界。
     * @lang en Fixed to false, recording the target-repository-write exclusion boundary of pure metadata evaluation.
     */
    targetRepositoryWrite: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标命令执行排除边界。
     * @lang en Fixed to false, recording the target-command-execution exclusion boundary of pure metadata evaluation.
     */
    targetCommandExecuted: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标运行时开启排除边界。
     * @lang en Fixed to false, recording the target-runtime-opening exclusion boundary of pure metadata evaluation.
     */
    targetRuntimeOpened: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标分支及拉取请求创建排除边界。
     * @lang en Fixed to false, recording the target-branch and pull-request creation exclusion boundary of pure metadata evaluation.
     */
    targetBranchOrPrCreated: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的网络访问排除边界。
     * @lang en Fixed to false, recording the network-access exclusion boundary of pure metadata evaluation.
     */
    networkAccessed: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的包发布排除边界。
     * @lang en Fixed to false, recording the package-publication exclusion boundary of pure metadata evaluation.
     */
    packagePublished: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标采用声明排除边界。
     * @lang en Fixed to false, recording the target-adoption-claim exclusion boundary of pure metadata evaluation.
     */
    targetAdoptionClaimed: false;
  };
}

/**
 * @lang zh-CN 固定且不反射 caller data 的 report diagnostic。
 * @lang en Fixed report diagnostic that does not reflect caller data.
 */
export interface TargetOwnerAdoptionKitDiagnostic {
  /**
   * @lang zh-CN 所属报告闭集中的稳定诊断码。
   * @lang en Stable diagnostic code from the enclosing report's closed vocabulary.
   */
  code: TargetOwnerAdoptionKitDiagnosticCode;
  /**
   * @lang zh-CN 固定的公开诊断说明，避免反射调用方正文或私有路径。
   * @lang en Fixed public diagnostic explanation avoiding reflection of caller bodies or private paths.
   */
  message: string;
  /**
   * @lang zh-CN error表示拒绝条件，warning记录材料未提交等非错误状态。
   * @lang en Error marks a refusal condition, while warning records non-error states such as missing owner input.
   */
  severity: "error" | "warning";
}

/**
 * @lang zh-CN Portal 可消费的最小投影；不含 target/trial identity、path、body、owner identity 或工作区状态。
 * @lang en Minimal Portal projection without target/trial identity, paths, bodies, owner identity, or working state.
 */
export interface TargetOwnerAdoptionPortalSummary {
  /**
   * @lang zh-CN 固定的target-owner-adoption-kit投影来源契约。
   * @lang en Fixed target-owner-adoption-kit contract identifying the projection source.
   */
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft来源契约版本。
   * @lang en Fixed 0.1.0-draft source-contract version.
   */
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  /**
   * @lang zh-CN 固定为portal-metadata-only的投影用途标记。
   * @lang en Projection-purpose marker fixed to portal-metadata-only.
   */
  projection: "portal-metadata-only";
  /**
   * @lang zh-CN 复制完整负责人套件报告的审阅就绪、缺材料延后或拒绝状态。
   * @lang en Copies the full owner-kit report's review-ready, missing-input deferred or refused status.
   */
  status: TargetOwnerAdoptionKitReport["status"];
  /**
   * @lang zh-CN 从完整报告复制的规范化目标族。
   * @lang en Normalized target family copied from the full report.
   */
  targetFamily: TargetOwnerAdoptionKitFamily;
  /**
   * @lang zh-CN 仅保留材料提交标记及审阅同意的负责人输入投影。
   * @lang en Owner-input projection retaining only the submission flag and review consent.
   */
  ownerInput: {
    /**
     * @lang zh-CN 从规范化负责人材料复制的提交标记。
     * @lang en Submission flag copied from normalized owner input.
     */
    submitted: boolean;
    /**
     * @lang zh-CN 从规范化负责人材料复制的审阅同意记录状态。
     * @lang en Recorded review-consent state copied from normalized owner input.
     */
    consent: "not-recorded" | "recorded-for-review";
  };
  /**
   * @lang zh-CN 投影中的必需、提供和缺失引用数量，省略引用列表。
   * @lang en Required, provided and missing reference counts in the projection, omitting reference lists.
   */
  contracts: {
    /**
     * @lang zh-CN 所选目标族必需契约引用列表的长度，当前固定为5。
     * @lang en Length of the selected family's required-reference list, currently fixed to 5.
     */
    requiredCount: number;
    /**
     * @lang zh-CN 规范化全字符串提供引用数组的项数，保留随后被拒绝的重复或未知引用计数。
     * @lang en Item count of the normalized all-string provided-reference array, retaining counts for duplicate or unknown references later refused.
     */
    providedCount: number;
    /**
     * @lang zh-CN 所选目标族必需引用中尚未提供的数量。
     * @lang en Number of required references still missing for the selected target family.
     */
    missingCount: number;
  };
  /**
   * @lang zh-CN 有效工作区交接摘要的负责人、边数量和审阅状态投影。
   * @lang en Projection of owner/edge counts and review state from a valid workspace-handoff summary.
   */
  workspaceHandoff?: {
    /**
     * @lang zh-CN 调用方声明的仓库负责人数量，有效交接摘要要求为至少2的整数。
     * @lang en Caller-declared repository-owner count, required to be an integer of at least 2 for a valid handoff summary.
     */
    repositoryOwnerCount: number;
    /**
     * @lang zh-CN 调用方声明的交接边数量，有效交接摘要要求为至少1的整数。
     * @lang en Caller-declared handoff-edge count, required to be an integer of at least 1 for a valid handoff summary.
     */
    handoffEdgeCount: number;
    /**
     * @lang zh-CN 固定为owner-review-required的交接审阅状态。
     * @lang en Handoff review state fixed to owner-review-required.
     */
    state: "owner-review-required";
  };
  /**
   * @lang zh-CN 与完整报告一致的材料解析、未核置信度和元数据来源。
   * @lang en Input resolution, unverified confidence and metadata provenance shared with the full report.
   */
  semantics: {
    /**
     * @lang zh-CN 由报告状态映射为owner-input-validated、owner-input-not-received或unresolved。
     * @lang en Maps report status to owner-input-validated, owner-input-not-received or unresolved.
     */
    resolution: "owner-input-validated" | "owner-input-not-received" | "unresolved";
    /**
     * @lang zh-CN 固定为caller-provided-unverified，负责人声明保持调用方提供且未经独立核实。
     * @lang en Fixed to caller-provided-unverified, retaining owner attestations as caller-provided and independently unverified.
     */
    confidence: "caller-provided-unverified";
    /**
     * @lang zh-CN 固定为metadata-only-owner-kit的纯元数据评估来源。
     * @lang en Metadata-only evaluation provenance fixed to metadata-only-owner-kit.
     */
    provenance: "metadata-only-owner-kit";
  };
}

/**
 * @lang zh-CN 可复用 adoption kit report；`ready` 只表示可供 owner review，不表示目标已采用。
 * @lang en Reusable adoption-kit report; `ready` means ready for owner review, never that a target adopted it.
 */
export interface TargetOwnerAdoptionKitReport {
  /**
   * @lang zh-CN 固定的target-owner-adoption-kit报告契约名称。
   * @lang en Fixed target-owner-adoption-kit report contract name.
   */
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft报告精确版本。
   * @lang en Fixed exact 0.1.0-draft report version.
   */
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  /**
   * @lang zh-CN 错误导致refused，否则依材料提交状态为ready-for-owner-review或deferred-owner-input-missing。
   * @lang en Errors produce refused, otherwise submission state selects ready-for-owner-review or deferred-owner-input-missing.
   */
  status: "ready-for-owner-review" | "deferred-owner-input-missing" | "refused";
  /**
   * @lang zh-CN 公开试用和目标标识、规范化目标族及其审阅流程。
   * @lang en Public trial and target identifiers, normalized target family and its review workflow.
   */
  trial: {
    /**
     * @lang zh-CN 语法有效的公开试用标识，非法输入替换为invalid-trial。
     * @lang en Grammar-valid public trial identifier, with invalid input replaced by invalid-trial.
     */
    id: string;
    /**
     * @lang zh-CN 语法有效的公开目标标识，非法输入替换为invalid-target。
     * @lang en Grammar-valid public target identifier, with invalid input replaced by invalid-target.
     */
    targetId: string;
    /**
     * @lang zh-CN 已识别的目标族，未知输入在拒绝诊断之外规范为enterprise-business。
     * @lang en Recognized target family, with unknown input normalized to enterprise-business alongside a refusal diagnostic.
     */
    targetFamily: TargetOwnerAdoptionKitFamily;
    /**
     * @lang zh-CN 由目标族确定的enterprise-continuity或workspace-handoff-review审阅流程。
     * @lang en Enterprise-continuity or workspace-handoff-review workflow selected by the target family.
     */
    workflow: "enterprise-continuity" | "workspace-handoff-review";
  };
  /**
   * @lang zh-CN 有效负责人材料状态的副本，无效形状规范为未提交的默认状态。
   * @lang en Copy of valid owner-input state, with invalid shapes normalized to unsubmitted defaults.
   */
  ownerInput: {
    /**
     * @lang zh-CN 调用方声明负责人材料是否已提交，未提交时允许诚实延后。
     * @lang en Caller declaration of whether owner input has been submitted, allowing an honest deferral when false.
     */
    submitted: boolean;
    /**
     * @lang zh-CN 负责人审阅同意的记录状态，已提交材料必须为recorded-for-review。
     * @lang en Recorded owner-review consent state, required to be recorded-for-review for submitted input.
     */
    consent: "not-recorded" | "recorded-for-review";
    /**
     * @lang zh-CN 目标负责人身份声明状态，已提交材料必须为target-owner-attested。
     * @lang en Target-owner attestation state, required to be target-owner-attested for submitted input.
     */
    attestation: "not-provided" | "target-owner-attested";
    /**
     * @lang zh-CN 负责人记录的反馈决策，已提交材料须非not-recorded；各值均为反馈元数据。
     * @lang en Recorded owner feedback decision, required to differ from not-recorded for submitted input and retained as feedback metadata.
     */
    decision: TargetOwnerAdoptionKitDecision;
    /**
     * @lang zh-CN 调用方声明已完成公开安全脱敏，已提交材料必须为true。
     * @lang en Caller attestation that public-safe redaction is complete, required to be true for submitted input.
     */
    redactionAttested: boolean;
  };
  /**
   * @lang zh-CN 所选目标族的必需引用列表、提供引用数量和缺失数量。
   * @lang en Required-reference list for the selected family, provided-reference count and missing count.
   */
  contracts: {
    /**
     * @lang zh-CN 所选目标族的五条固定有序契约及版本引用。
     * @lang en Five fixed ordered contract/version references for the selected target family.
     */
    required: string[];
    /**
     * @lang zh-CN 输入引用数组为全字符串时保留的原始项数，包括随后被拒绝的重复或未知引用。
     * @lang en Original item count retained for an all-string input-reference array, including duplicate or unknown references later refused.
     */
    providedCount: number;
    /**
     * @lang zh-CN 必需引用中未出现在规范化提供引用列表的项数。
     * @lang en Number of required references absent from the normalized provided-reference list.
     */
    missingCount: number;
  };
  /**
   * @lang zh-CN 仅工作区目标族且摘要有效时复制的计数交接信息，拒绝报告也可保留该有效摘要。
   * @lang en Count-only handoff copied for a workspace-family target with a valid summary, including valid summaries in refused reports.
   */
  workspaceHandoff?: {
    /**
     * @lang zh-CN 调用方声明的仓库负责人数量，有效交接摘要要求为至少2的整数。
     * @lang en Caller-declared repository-owner count, required to be an integer of at least 2 for a valid handoff summary.
     */
    repositoryOwnerCount: number;
    /**
     * @lang zh-CN 调用方声明的交接边数量，有效交接摘要要求为至少1的整数。
     * @lang en Caller-declared handoff-edge count, required to be an integer of at least 1 for a valid handoff summary.
     */
    handoffEdgeCount: number;
    /**
     * @lang zh-CN 固定为owner-review-required的交接审阅状态。
     * @lang en Handoff review state fixed to owner-review-required.
     */
    state: "owner-review-required";
    /**
     * @lang zh-CN 固定为false，交接摘要不转移运行时依赖。
     * @lang en Fixed to false, declaring no runtime-dependency transfer in the handoff summary.
     */
    runtimeDependencyTransfer: false;
    /**
     * @lang zh-CN 固定为false，交接摘要声明无需目标写入。
     * @lang en Fixed to false, declaring that the handoff summary requires no target writes.
     */
    targetWriteRequired: false;
  };
  /**
   * @lang zh-CN 移除试用及目标标识的门户元数据投影，保留审阅状态与计数。
   * @lang en Portal metadata projection omitting trial and target identifiers while retaining review state and counts.
   */
  portalSummary: TargetOwnerAdoptionPortalSummary;
  /**
   * @lang zh-CN 解析状态、调用方未核置信度、元数据来源、审阅同意及未声明采用状态。
   * @lang en Resolution, caller-unverified confidence, metadata provenance, review consent and unasserted adoption state.
   */
  semantics: TargetOwnerAdoptionPortalSummary["semantics"] & {
    consent: "not-recorded" | "recorded-for-review";
    adoption: "not-asserted";
  };
  /**
   * @lang zh-CN 固定的报告正文、路径、凭据及工作状态序列化排除标记。
   * @lang en Fixed report-serialization exclusion flags for bodies, paths, credentials and working state.
   */
  privacy: {
    /**
     * @lang zh-CN 固定为false，声明报告不序列化源码正文。
     * @lang en Fixed to false, declaring that the report excludes from serialization source bodies.
     */
    sourceBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化工件正文。
     * @lang en Fixed to false, declaring that the report excludes from serialization artifact bodies.
     */
    artifactBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化证据正文。
     * @lang en Fixed to false, declaring that the report excludes from serialization evidence bodies.
     */
    evidenceBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化命令输出正文。
     * @lang en Fixed to false, declaring that the report excludes from serialization command-output bodies.
     */
    commandOutputBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化路径。
     * @lang en Fixed to false, declaring that the report excludes paths from serialization.
     */
    pathSerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化凭据。
     * @lang en Fixed to false, declaring that the report excludes from serialization credentials.
     */
    credentialSerialized: false;
    /**
     * @lang zh-CN 固定为false，声明报告不序列化工作状态。
     * @lang en Fixed to false, declaring that the report excludes from serialization working state.
     */
    workingStateSerialized: false;
    /**
     * @lang zh-CN 固定为none，声明不嵌入sourcesContent源码正文。
     * @lang en Fixed to none, declaring that sourcesContent source bodies are not embedded.
     */
    sourcesContentPolicy: "none";
  };
  /**
   * @lang zh-CN 固定全部为false的纯材料评估操作边界。
   * @lang en Pure input-evaluation operation boundary fixed entirely to false.
   */
  permissions: {
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标仓库读取排除边界。
     * @lang en Fixed to false, recording the target-repository-read exclusion boundary of pure metadata evaluation.
     */
    targetRepositoryRead: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标仓库写入排除边界。
     * @lang en Fixed to false, recording the target-repository-write exclusion boundary of pure metadata evaluation.
     */
    targetRepositoryWrite: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标命令执行排除边界。
     * @lang en Fixed to false, recording the target-command-execution exclusion boundary of pure metadata evaluation.
     */
    targetCommandExecuted: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标运行时开启排除边界。
     * @lang en Fixed to false, recording the target-runtime-opening exclusion boundary of pure metadata evaluation.
     */
    targetRuntimeOpened: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标分支及拉取请求创建排除边界。
     * @lang en Fixed to false, recording the target-branch and pull-request creation exclusion boundary of pure metadata evaluation.
     */
    targetBranchOrPrCreated: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的网络访问排除边界。
     * @lang en Fixed to false, recording the network-access exclusion boundary of pure metadata evaluation.
     */
    networkAccessed: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的包发布排除边界。
     * @lang en Fixed to false, recording the package-publication exclusion boundary of pure metadata evaluation.
     */
    packagePublished: false;
    /**
     * @lang zh-CN 固定为false，记录纯元数据评估的目标采用声明排除边界。
     * @lang en Fixed to false, recording the target-adoption-claim exclusion boundary of pure metadata evaluation.
     */
    targetAdoptionClaimed: false;
  };
  /**
   * @lang zh-CN 按稳定追加顺序按码去重的固定诊断，包含拒绝错误或未提交警告。
   * @lang en Fixed diagnostics deduplicated by code in stable append order, including refusal errors or a missing-input warning.
   */
  diagnostics: TargetOwnerAdoptionKitDiagnostic[];
}

const ENTERPRISE_REQUIRED_CONTRACT_REFS = [
  "hia-generated-docs-evidence-summary@0.1.0-draft",
  "target-documentation-acceptance@0.1.0-draft",
  "target-documentation-continuity@0.1.0-draft",
  "hia-owner-provided-evidence-packet@0.1.0-draft",
  "hia-wp46-target-owner-handoff-report-packet@0.1.0-draft"
] as const;

const WORKSPACE_REQUIRED_CONTRACT_REFS = [
  "workspace-documentation-handoff@0.1.0-draft",
  "hia-generated-docs-evidence-summary@0.1.0-draft",
  "target-documentation-acceptance@0.1.0-draft",
  "documentation-portal-information-architecture@0.1.0-draft",
  "hia-owner-provided-evidence-packet@0.1.0-draft"
] as const;

const PRIVACY_FIELDS = [
  "sourceBodyIncluded",
  "artifactBodyIncluded",
  "evidenceBodyIncluded",
  "commandOutputBodyIncluded",
  "absoluteOrPrivatePathIncluded",
  "credentialIncluded",
  "workingStateIncluded",
  "sourcesContentPolicy"
] as const;

const PERMISSION_FIELDS = [
  "targetRepositoryRead",
  "targetRepositoryWrite",
  "targetCommandExecuted",
  "targetRuntimeOpened",
  "targetBranchOrPrCreated",
  "networkAccessed",
  "packagePublished",
  "targetAdoptionClaimed"
] as const;

/**
 * @lang zh-CN `target-owner-adoption-kit@0.1.0-draft` 的 CLI owner-local Draft 2020-12 JSON Schema。
 * @lang en CLI owner-local Draft 2020-12 JSON Schema for `target-owner-adoption-kit@0.1.0-draft`.
 */
export const TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID,
  title: "Target Owner Adoption Kit",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "trial", "ownerInput", "contracts", "portalSummary", "semantics", "privacy", "permissions", "diagnostics"],
  properties: {
    contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
    contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
    status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
    trial: {
      type: "object",
      additionalProperties: false,
      required: ["id", "targetId", "targetFamily", "workflow"],
      properties: {
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" },
        targetId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" },
        targetFamily: { enum: TARGET_OWNER_ADOPTION_KIT_FAMILIES },
        workflow: { enum: ["enterprise-continuity", "workspace-handoff-review"] }
      }
    },
    ownerInput: { $ref: "#/$defs/ownerInput" },
    contracts: {
      type: "object",
      additionalProperties: false,
      required: ["required", "providedCount", "missingCount"],
      properties: {
        required: { type: "array", minItems: 5, maxItems: 5, uniqueItems: true, items: { type: "string" } },
        providedCount: { type: "integer", minimum: 0 },
        missingCount: { type: "integer", minimum: 0 }
      }
    },
    workspaceHandoff: { $ref: "#/$defs/workspaceHandoff" },
    portalSummary: { $ref: "#/$defs/portalSummary" },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance", "consent", "adoption"],
      properties: {
        resolution: { enum: ["owner-input-validated", "owner-input-not-received", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "metadata-only-owner-kit" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        adoption: { const: "not-asserted" }
      }
    },
    privacy: { $ref: "#/$defs/reportPrivacy" },
    permissions: { $ref: "#/$defs/permissions" },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { enum: TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES },
          message: { type: "string" },
          severity: { enum: ["error", "warning"] }
        }
      }
    }
  },
  $defs: {
    ownerInput: {
      type: "object",
      additionalProperties: false,
      required: ["submitted", "consent", "attestation", "decision", "redactionAttested"],
      properties: {
        submitted: { type: "boolean" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        attestation: { enum: ["not-provided", "target-owner-attested"] },
        decision: { enum: TARGET_OWNER_ADOPTION_KIT_DECISIONS },
        redactionAttested: { type: "boolean" }
      }
    },
    workspaceHandoff: {
      type: "object",
      additionalProperties: false,
      required: ["repositoryOwnerCount", "handoffEdgeCount", "state", "runtimeDependencyTransfer", "targetWriteRequired"],
      properties: {
        repositoryOwnerCount: { type: "integer", minimum: 2 },
        handoffEdgeCount: { type: "integer", minimum: 1 },
        state: { const: "owner-review-required" },
        runtimeDependencyTransfer: { const: false },
        targetWriteRequired: { const: false }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: ["owner-input-validated", "owner-input-not-received", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "metadata-only-owner-kit" }
      }
    },
    portalSummary: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "projection", "status", "targetFamily", "ownerInput", "contracts", "semantics"],
      properties: {
        contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
        contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
        projection: { const: "portal-metadata-only" },
        status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
        targetFamily: { enum: TARGET_OWNER_ADOPTION_KIT_FAMILIES },
        ownerInput: {
          type: "object",
          additionalProperties: false,
          required: ["submitted", "consent"],
          properties: { submitted: { type: "boolean" }, consent: { enum: ["not-recorded", "recorded-for-review"] } }
        },
        contracts: {
          type: "object",
          additionalProperties: false,
          required: ["requiredCount", "providedCount", "missingCount"],
          properties: {
            requiredCount: { type: "integer", minimum: 0 },
            providedCount: { type: "integer", minimum: 0 },
            missingCount: { type: "integer", minimum: 0 }
          }
        },
        workspaceHandoff: {
          type: "object",
          additionalProperties: false,
          required: ["repositoryOwnerCount", "handoffEdgeCount", "state"],
          properties: {
            repositoryOwnerCount: { type: "integer", minimum: 2 },
            handoffEdgeCount: { type: "integer", minimum: 1 },
            state: { const: "owner-review-required" }
          }
        },
        semantics: { $ref: "#/$defs/semantics" }
      }
    },
    reportPrivacy: {
      type: "object",
      additionalProperties: false,
      required: ["sourceBodySerialized", "artifactBodySerialized", "evidenceBodySerialized", "commandOutputBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"],
      properties: {
        sourceBodySerialized: { const: false }, artifactBodySerialized: { const: false }, evidenceBodySerialized: { const: false },
        commandOutputBodySerialized: { const: false }, pathSerialized: { const: false }, credentialSerialized: { const: false },
        workingStateSerialized: { const: false }, sourcesContentPolicy: { const: "none" }
      }
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: PERMISSION_FIELDS,
      properties: {
        targetRepositoryRead: { const: false }, targetRepositoryWrite: { const: false }, targetCommandExecuted: { const: false },
        targetRuntimeOpened: { const: false }, targetBranchOrPrCreated: { const: false }, networkAccessed: { const: false },
        packagePublished: { const: false }, targetAdoptionClaimed: { const: false }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 从 public-safe request 创建 deterministic adoption kit；pure evaluator 不读取文件、目标或网络。
 * @lang en Creates a deterministic adoption kit from a public-safe request; the pure evaluator reads no files, targets, or network.
 *
 * @param request caller-provided metadata request。 / Caller-provided metadata request.
 * @returns ready、deferred 或 refused report；永不声明 adoption。 / Ready, deferred, or refused report that never claims adoption.
 */
export function createTargetOwnerAdoptionKit(request: TargetOwnerAdoptionKitRequest): TargetOwnerAdoptionKitReport {
  // <lang><zh-CN>恢复 unknown trust boundary，所有 nested object 均重新做 closed-world runtime validation。</zh-CN><en>Return to an unknown trust boundary and revalidate every nested object as closed-world runtime data.</en></lang>
  const untrusted: unknown = request;
  const candidate = isRecord(untrusted) ? untrusted : {};
  const family = isTargetFamily(candidate.targetFamily) ? candidate.targetFamily : "enterprise-business";
  const required = [...requiredContractRefs(family)];
  const providedRefs = normalizeContractRefs(candidate.providedContractRefs);
  const missingCount = required.filter((ref) => !providedRefs.includes(ref)).length;
  const diagnostics: TargetOwnerAdoptionKitDiagnostic[] = [];
  const ownerInput = normalizeOwnerInput(candidate.ownerInput);
  const requestValid = hasOnlyExactKeys(candidate, [
    "contract", "contractVersion", "trialId", "targetId", "targetFamily", "ownerInput", "providedContractRefs", "privacy", "permissions"
  ], ["workspaceHandoff"])
    && candidate.contract === TARGET_OWNER_ADOPTION_KIT_CONTRACT
    && candidate.contractVersion === TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    && isStableIdentifier(candidate.trialId)
    && isStableIdentifier(candidate.targetId)
    && isTargetFamily(candidate.targetFamily)
    && isOwnerInput(candidate.ownerInput);

  if (!requestValid) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID", "Target-owner adoption kit requires an exact request, supported draft, stable identities, and a supported family.", "error");
  }

  // <lang><zh-CN>provided refs 只能是本 family 已冻结的 exact refs；缺失只在 owner 声称已提交时成为拒绝。</zh-CN><en>Provided refs must be exact frozen refs for this family; missing refs become a refusal only after the owner claims submission.</en></lang>
  const refsValid = isStringArray(candidate.providedContractRefs)
    && new Set(candidate.providedContractRefs).size === candidate.providedContractRefs.length
    && candidate.providedContractRefs.every((ref) => required.includes(ref as never));
  if (!refsValid || (ownerInput.submitted && missingCount > 0)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID", "Target-owner adoption kit requires unique exact contract references for the selected family.", "error");
  }

  if (!ownerInput.submitted) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_OWNER_INPUT_MISSING", "Target-owner input is not recorded; the kit remains deferred without an adoption claim.", "warning");
  } else if (ownerInput.consent !== "recorded-for-review"
    || ownerInput.attestation !== "target-owner-attested"
    || ownerInput.decision === "not-recorded"
    || !ownerInput.redactionAttested) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID", "Submitted owner input requires review consent, owner attestation, a recorded decision, and public-safe redaction attestation.", "error");
  }

  const workspaceHandoff = normalizeWorkspaceHandoff(candidate.workspaceHandoff);
  const workspaceValid = family === "workspace-container"
    ? (!ownerInput.submitted || isWorkspaceHandoff(candidate.workspaceHandoff))
    : candidate.workspaceHandoff === undefined;
  if (!workspaceValid) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID", "Workspace handoff review requires count-only owner and edge metadata with no runtime transfer or target write.", "error");
  }

  if (!isRequestPrivacy(candidate.privacy)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED", "Target-owner adoption kit refuses source, artifact, evidence, command output, path, credential, or working-state payloads.", "error");
  }
  if (!isPermissions(candidate.permissions)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED", "Target-owner adoption kit grants no target, network, publish, or adoption authority.", "error");
  }

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const status: TargetOwnerAdoptionKitReport["status"] = hasError
    ? "refused"
    : ownerInput.submitted
      ? "ready-for-owner-review"
      : "deferred-owner-input-missing";
  const resolution: TargetOwnerAdoptionPortalSummary["semantics"]["resolution"] = status === "ready-for-owner-review"
    ? "owner-input-validated"
    : status === "deferred-owner-input-missing"
      ? "owner-input-not-received"
      : "unresolved";
  const semantics = {
    resolution,
    confidence: "caller-provided-unverified" as const,
    provenance: "metadata-only-owner-kit" as const
  };
  const portalSummary: TargetOwnerAdoptionPortalSummary = {
    contract: TARGET_OWNER_ADOPTION_KIT_CONTRACT,
    contractVersion: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
    projection: "portal-metadata-only",
    status,
    targetFamily: family,
    ownerInput: { submitted: ownerInput.submitted, consent: ownerInput.consent },
    contracts: { requiredCount: required.length, providedCount: providedRefs.length, missingCount },
    ...(family === "workspace-container" && workspaceHandoff ? {
      workspaceHandoff: {
        repositoryOwnerCount: workspaceHandoff.repositoryOwnerCount,
        handoffEdgeCount: workspaceHandoff.handoffEdgeCount,
        state: workspaceHandoff.state
      }
    } : {}),
    semantics
  };

  return {
    contract: TARGET_OWNER_ADOPTION_KIT_CONTRACT,
    contractVersion: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
    status,
    trial: {
      id: isStableIdentifier(candidate.trialId) ? candidate.trialId : "invalid-trial",
      targetId: isStableIdentifier(candidate.targetId) ? candidate.targetId : "invalid-target",
      targetFamily: family,
      workflow: family === "enterprise-business" ? "enterprise-continuity" : "workspace-handoff-review"
    },
    ownerInput,
    contracts: { required, providedCount: providedRefs.length, missingCount },
    ...(family === "workspace-container" && workspaceHandoff ? { workspaceHandoff } : {}),
    portalSummary,
    semantics: { ...semantics, consent: ownerInput.consent, adoption: "not-asserted" },
    privacy: {
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      evidenceBodySerialized: false,
      commandOutputBodySerialized: false,
      pathSerialized: false,
      credentialSerialized: false,
      workingStateSerialized: false,
      sourcesContentPolicy: "none"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false
    },
    diagnostics
  };
}

/**
 * @lang zh-CN 对 JavaScript/JSON caller 执行 exact runtime guard。
 * @lang en Performs an exact runtime guard for JavaScript and JSON callers.
 *
 * @param value unknown report candidate。 / Unknown report candidate.
 * @returns 是否完整匹配当前 draft。 / Whether the value exactly matches this draft.
 */
export function isTargetOwnerAdoptionKitReport(value: unknown): value is TargetOwnerAdoptionKitReport {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "status", "trial", "ownerInput", "contracts", "portalSummary", "semantics", "privacy", "permissions", "diagnostics"], ["workspaceHandoff"])
    || value.contract !== TARGET_OWNER_ADOPTION_KIT_CONTRACT
    || value.contractVersion !== TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))
    || !isReportTrial(value.trial)
    || !isOwnerInput(value.ownerInput)
    || !isReportContracts(value.contracts)
    || !isPortalSummary(value.portalSummary)
    || !isReportSemantics(value.semantics)
    || !isReportPrivacy(value.privacy)
    || !isPermissions(value.permissions)
    || !isDiagnostics(value.diagnostics)) {
    return false;
  }
  const family = value.trial.targetFamily;
  const required = requiredContractRefs(family);
  const contracts = value.contracts;
  const portal = value.portalSummary;
  const hasWorkspace = Object.hasOwn(value, "workspaceHandoff");
  const hasError = value.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const statusSemanticsValid = value.status === "ready-for-owner-review"
    ? value.ownerInput.submitted
      && value.ownerInput.consent === "recorded-for-review"
      && value.ownerInput.attestation === "target-owner-attested"
      && value.ownerInput.decision !== "not-recorded"
      && value.ownerInput.redactionAttested
      && contracts.missingCount === 0
      && value.semantics.resolution === "owner-input-validated"
      && !hasError
    : value.status === "deferred-owner-input-missing"
      ? !value.ownerInput.submitted
        && value.semantics.resolution === "owner-input-not-received"
        && !hasError
      : value.semantics.resolution === "unresolved" && hasError;
  return arraysEqual(contracts.required, required)
    && contracts.providedCount + contracts.missingCount === contracts.required.length
    && portal.targetFamily === family
    && portal.status === value.status
    && portal.contracts.requiredCount === contracts.required.length
    && portal.contracts.providedCount === contracts.providedCount
    && portal.contracts.missingCount === contracts.missingCount
    && portal.ownerInput.submitted === value.ownerInput.submitted
    && portal.ownerInput.consent === value.ownerInput.consent
    && portal.semantics.resolution === value.semantics.resolution
    && statusSemanticsValid
    && (family === "workspace-container"
      ? (value.status !== "ready-for-owner-review" || hasWorkspace)
      : !hasWorkspace)
    && (!hasWorkspace
      || (isWorkspaceHandoff(value.workspaceHandoff)
        && isPortalWorkspaceHandoff(portal.workspaceHandoff)
        && portal.workspaceHandoff.repositoryOwnerCount === value.workspaceHandoff.repositoryOwnerCount
        && portal.workspaceHandoff.handoffEdgeCount === value.workspaceHandoff.handoffEdgeCount));
}

/**
 * @lang zh-CN adoption-kit command 所需的最小 IO surface。
 * @lang en Minimal IO surface required by the adoption-kit command.
 */
export interface TargetOwnerAdoptionKitCliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

/**
 * @lang zh-CN 从 caller cwd 下的显式 safe-relative JSON 生成 owner-operated kit。
 * @lang en Generates an owner-operated kit from an explicit safe-relative JSON file under the caller cwd.
 *
 * @param argv adoption-kit command arguments。 / Adoption-kit command arguments.
 * @param io controlled CLI IO。 / Controlled CLI IO.
 * @returns process-style exit code；deferred 是诚实产物，因此返回 0。 / Process-style exit code; an honest deferred artifact returns 0.
 */
export async function runTargetOwnerAdoptionKitCommand(argv: string[], io: TargetOwnerAdoptionKitCliIo): Promise<number> {
  const options = parseOptions(argv, ["--request", "--out"]);
  const requestRelativePath = options.values.get("--request");
  const outputRelativePath = options.values.get("--out");
  if (!options.valid || !isSafeRelativePath(requestRelativePath) || (outputRelativePath !== undefined && !isSafeRelativePath(outputRelativePath))) {
    io.stderr("[error:HIA_OWNER_ADOPTION_KIT_PATH_INVALID] docs adoption-kit requires a safe relative request path and optional output path.");
    return 1;
  }

  let request: unknown;
  try {
    // <lang><zh-CN>command 只读取 caller 明确给出的 JSON；不发现 target、不读取 source/artifact body。</zh-CN><en>The command reads only caller-explicit JSON; it discovers no target and reads no source or artifact body.</en></lang>
    request = JSON.parse(await readFile(path.resolve(io.cwd, requestRelativePath), "utf8"));
  } catch {
    io.stderr("[error:HIA_OWNER_ADOPTION_KIT_REQUEST_READ_FAILED] docs adoption-kit could not read a valid request JSON object.");
    return 1;
  }
  const report = createTargetOwnerAdoptionKit(request as TargetOwnerAdoptionKitRequest);
  const serialized = JSON.stringify(report, null, 2);
  if (outputRelativePath) {
    try {
      const outputPath = path.resolve(io.cwd, outputRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
      io.stdout(`Generated target-owner adoption kit at ${outputRelativePath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_OWNER_ADOPTION_KIT_OUTPUT_WRITE_FAILED] docs adoption-kit could not write the explicit output report.");
      return 1;
    }
  } else {
    io.stdout(serialized);
  }
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "refused" ? 1 : 0;
}

/**
 * @lang zh-CN 根据 family 返回冻结且有序的既有 contract refs。
 * @lang en Returns frozen ordered existing contract references for a family.
 */
function requiredContractRefs(family: TargetOwnerAdoptionKitFamily): readonly string[] {
  return family === "enterprise-business" ? ENTERPRISE_REQUIRED_CONTRACT_REFS : WORKSPACE_REQUIRED_CONTRACT_REFS;
}

/**
 * @lang zh-CN 将 invalid owner input 替换为不授予任何事实的固定默认值。
 * @lang en Replaces invalid owner input with fixed defaults that grant no facts.
 */
function normalizeOwnerInput(value: unknown): TargetOwnerAdoptionKitReport["ownerInput"] {
  if (!isOwnerInput(value)) {
    return { submitted: false, consent: "not-recorded", attestation: "not-provided", decision: "not-recorded", redactionAttested: false };
  }
  return { ...value };
}

/**
 * @lang zh-CN 只保留 stable string contract refs 供 count 比较；invalid shape 归一为空数组。
 * @lang en Retains only stable string contract refs for count comparison; invalid shapes normalize to an empty array.
 */
function normalizeContractRefs(value: unknown): string[] {
  return isStringArray(value) ? [...value] : [];
}

/**
 * @lang zh-CN 只复制 count-only workspace handoff summary。
 * @lang en Copies only a count-only workspace-handoff summary.
 */
function normalizeWorkspaceHandoff(value: unknown): TargetOwnerAdoptionKitReport["workspaceHandoff"] | undefined {
  return isWorkspaceHandoff(value) ? { ...value } : undefined;
}

/**
 * @lang zh-CN 按固定顺序去重追加 diagnostic。
 * @lang en Appends a diagnostic in fixed order without duplicates.
 */
function addDiagnostic(diagnostics: TargetOwnerAdoptionKitDiagnostic[], code: TargetOwnerAdoptionKitDiagnosticCode, message: string, severity: "error" | "warning"): void {
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) {
    diagnostics.push({ code, message, severity });
  }
}

/**
 * @lang zh-CN 检查首轮冻结的 target family。
 * @lang en Checks a target family frozen for the first slice.
 */
function isTargetFamily(value: unknown): value is TargetOwnerAdoptionKitFamily {
  return TARGET_OWNER_ADOPTION_KIT_FAMILIES.includes(value as TargetOwnerAdoptionKitFamily);
}

/**
 * @lang zh-CN 验证 closed owner input attestation shape。
 * @lang en Validates the closed owner-input attestation shape.
 */
function isOwnerInput(value: unknown): value is TargetOwnerAdoptionKitRequest["ownerInput"] {
  return isRecord(value)
    && hasExactKeys(value, ["submitted", "consent", "attestation", "decision", "redactionAttested"])
    && typeof value.submitted === "boolean"
    && ["not-recorded", "recorded-for-review"].includes(String(value.consent))
    && ["not-provided", "target-owner-attested"].includes(String(value.attestation))
    && TARGET_OWNER_ADOPTION_KIT_DECISIONS.includes(value.decision as TargetOwnerAdoptionKitDecision)
    && typeof value.redactionAttested === "boolean";
}

/**
 * @lang zh-CN 验证无 identity 的 workspace handoff count summary。
 * @lang en Validates an identity-free workspace-handoff count summary.
 */
function isWorkspaceHandoff(value: unknown): value is NonNullable<TargetOwnerAdoptionKitRequest["workspaceHandoff"]> {
  return isRecord(value)
    && hasExactKeys(value, ["state", "repositoryOwnerCount", "handoffEdgeCount", "runtimeDependencyTransfer", "targetWriteRequired"])
    && value.state === "owner-review-required"
    && isNonNegativeInteger(value.repositoryOwnerCount) && value.repositoryOwnerCount >= 2
    && isNonNegativeInteger(value.handoffEdgeCount) && value.handoffEdgeCount >= 1
    && value.runtimeDependencyTransfer === false
    && value.targetWriteRequired === false;
}

/**
 * @lang zh-CN 验证进一步收窄的 Portal workspace handoff 投影。
 * @lang en Validates the further-reduced Portal workspace-handoff projection.
 */
function isPortalWorkspaceHandoff(value: unknown): value is NonNullable<TargetOwnerAdoptionPortalSummary["workspaceHandoff"]> {
  return isRecord(value)
    && hasExactKeys(value, ["repositoryOwnerCount", "handoffEdgeCount", "state"])
    && value.state === "owner-review-required"
    && isNonNegativeInteger(value.repositoryOwnerCount) && value.repositoryOwnerCount >= 2
    && isNonNegativeInteger(value.handoffEdgeCount) && value.handoffEdgeCount >= 1;
}

/**
 * @lang zh-CN 验证 request 的 deny-payload privacy facts。
 * @lang en Validates deny-payload privacy facts on a request.
 */
function isRequestPrivacy(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, PRIVACY_FIELDS)
    && PRIVACY_FIELDS.filter((field) => field !== "sourcesContentPolicy").every((field) => value[field] === false)
    && value.sourcesContentPolicy === "none";
}

/**
 * @lang zh-CN 验证所有 target/network/publish/adoption permission 均为 false。
 * @lang en Validates that every target, network, publish, and adoption permission is false.
 */
function isPermissions(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, PERMISSION_FIELDS)
    && PERMISSION_FIELDS.every((field) => value[field] === false);
}

/**
 * @lang zh-CN 验证 report 的 stable trial identity 与 family/workflow 对应关系。
 * @lang en Validates stable trial identity and family/workflow correspondence in a report.
 */
function isReportTrial(value: unknown): value is TargetOwnerAdoptionKitReport["trial"] {
  return isRecord(value)
    && hasExactKeys(value, ["id", "targetId", "targetFamily", "workflow"])
    && isStableIdentifier(value.id)
    && isStableIdentifier(value.targetId)
    && isTargetFamily(value.targetFamily)
    && value.workflow === (value.targetFamily === "enterprise-business" ? "enterprise-continuity" : "workspace-handoff-review");
}

/**
 * @lang zh-CN 验证 report contract-ref counts 与有序 required refs shape。
 * @lang en Validates report contract-reference counts and ordered required-reference shape.
 */
function isReportContracts(value: unknown): value is TargetOwnerAdoptionKitReport["contracts"] {
  return isRecord(value)
    && hasExactKeys(value, ["required", "providedCount", "missingCount"])
    && isStringArray(value.required)
    && new Set(value.required).size === value.required.length
    && isNonNegativeInteger(value.providedCount)
    && isNonNegativeInteger(value.missingCount);
}

/**
 * @lang zh-CN 验证 Portal metadata-only projection 的 closed shape 与 count invariant。
 * @lang en Validates the closed shape and count invariant of a metadata-only Portal projection.
 */
function isPortalSummary(value: unknown): value is TargetOwnerAdoptionPortalSummary {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "projection", "status", "targetFamily", "ownerInput", "contracts", "semantics"], ["workspaceHandoff"])
    || value.contract !== TARGET_OWNER_ADOPTION_KIT_CONTRACT
    || value.contractVersion !== TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    || value.projection !== "portal-metadata-only"
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))
    || !isTargetFamily(value.targetFamily)
    || !isRecord(value.ownerInput)
    || !hasExactKeys(value.ownerInput, ["submitted", "consent"])
    || typeof value.ownerInput.submitted !== "boolean"
    || !["not-recorded", "recorded-for-review"].includes(String(value.ownerInput.consent))
    || !isRecord(value.contracts)
    || !hasExactKeys(value.contracts, ["requiredCount", "providedCount", "missingCount"])
    || ![value.contracts.requiredCount, value.contracts.providedCount, value.contracts.missingCount].every(isNonNegativeInteger)
    || Number(value.contracts.providedCount) + Number(value.contracts.missingCount) !== Number(value.contracts.requiredCount)
    || !isPortalSemantics(value.semantics)) {
    return false;
  }
  const hasWorkspace = Object.hasOwn(value, "workspaceHandoff");
  return value.targetFamily === "workspace-container"
    ? (value.status === "ready-for-owner-review" ? isPortalWorkspaceHandoff(value.workspaceHandoff) : (!hasWorkspace || isPortalWorkspaceHandoff(value.workspaceHandoff)))
    : !hasWorkspace;
}

/**
 * @lang zh-CN 分别验证 resolution、confidence 与 provenance 三维。
 * @lang en Independently validates resolution, confidence, and provenance.
 */
function isPortalSemantics(value: unknown): value is TargetOwnerAdoptionPortalSummary["semantics"] {
  return isRecord(value)
    && hasExactKeys(value, ["resolution", "confidence", "provenance"])
    && ["owner-input-validated", "owner-input-not-received", "unresolved"].includes(String(value.resolution))
    && value.confidence === "caller-provided-unverified"
    && value.provenance === "metadata-only-owner-kit";
}

/**
 * @lang zh-CN 验证 report semantics，并保持 consent/adoption 独立。
 * @lang en Validates report semantics while keeping consent and adoption independent.
 */
function isReportSemantics(value: unknown): value is TargetOwnerAdoptionKitReport["semantics"] {
  return isRecord(value)
    && hasExactKeys(value, ["resolution", "confidence", "provenance", "consent", "adoption"])
    && isPortalSemantics({ resolution: value.resolution, confidence: value.confidence, provenance: value.provenance })
    && ["not-recorded", "recorded-for-review"].includes(String(value.consent))
    && value.adoption === "not-asserted";
}

/**
 * @lang zh-CN 验证 report 未序列化受限 payload。
 * @lang en Validates that the report serializes no restricted payload.
 */
function isReportPrivacy(value: unknown): value is TargetOwnerAdoptionKitReport["privacy"] {
  const fields = ["sourceBodySerialized", "artifactBodySerialized", "evidenceBodySerialized", "commandOutputBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"];
  return isRecord(value)
    && hasExactKeys(value, fields)
    && fields.filter((field) => field !== "sourcesContentPolicy").every((field) => value[field] === false)
    && value.sourcesContentPolicy === "none";
}

/**
 * @lang zh-CN 验证 diagnostics 只来自 fixed catalog。
 * @lang en Validates that diagnostics come only from the fixed catalog.
 */
function isDiagnostics(value: unknown): value is TargetOwnerAdoptionKitDiagnostic[] {
  return Array.isArray(value) && value.every((diagnostic) => isRecord(diagnostic)
    && hasExactKeys(diagnostic, ["code", "message", "severity"])
    && TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES.includes(diagnostic.code as TargetOwnerAdoptionKitDiagnosticCode)
    && typeof diagnostic.message === "string"
    && ["error", "warning"].includes(String(diagnostic.severity)));
}

/**
 * @lang zh-CN 检查纯 string array。
 * @lang en Checks a string-only array.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * @lang zh-CN 检查 public stable identifier grammar。
 * @lang en Checks the public stable-identifier grammar.
 */
function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
}

/**
 * @lang zh-CN 检查可安全序列化的非负整数。
 * @lang en Checks a safely serializable non-negative integer.
 */
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/**
 * @lang zh-CN 比较 deterministic ordered ref arrays。
 * @lang en Compares deterministic ordered reference arrays.
 */
function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @lang zh-CN 检查非 array object record。
 * @lang en Checks a non-array object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @lang zh-CN 检查 required/optional key 的 closed-world 集合。
 * @lang en Checks a closed-world set of required and optional keys.
 */
function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = [...required, ...optional];
  return required.every((field) => Object.hasOwn(value, field))
    && Object.keys(value).every((field) => allowed.includes(field));
}

/**
 * @lang zh-CN 为 request boundary 提供语义明确的 exact-key alias。
 * @lang en Provides a semantically explicit exact-key alias for the request boundary.
 */
function hasOnlyExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[]): boolean {
  return hasExactKeys(value, required, optional);
}

/**
 * @lang zh-CN 解析不重复的 option/value pairs，拒绝 unknown 或缺值 option。
 * @lang en Parses unique option/value pairs and refuses unknown or missing-value options.
 */
function parseOptions(argv: string[], allowedOptions: string[]): { valid: boolean; values: Map<string, string> } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option || !allowedOptions.includes(option) || !value || value.startsWith("--") || values.has(option)) {
      return { valid: false, values };
    }
    values.set(option, value);
  }
  return { valid: argv.length % 2 === 0, values };
}

/**
 * @lang zh-CN 将 CLI 文件 IO 限定在 caller cwd 的 safe-relative boundary。
 * @lang en Constrains CLI file IO to the caller cwd safe-relative boundary.
 */
function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value) || value.includes("\0")) {
    return false;
  }
  const normalized = path.normalize(value);
  return normalized !== ".." && !normalized.startsWith(`..${path.sep}`) && !normalized.startsWith("\\\\");
}
