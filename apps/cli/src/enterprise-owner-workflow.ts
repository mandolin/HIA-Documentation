import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createTargetOwnerAdoptionKit,
  TARGET_OWNER_ADOPTION_KIT_CONTRACT,
  TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
  type TargetOwnerAdoptionKitReport,
  type TargetOwnerAdoptionKitRequest
} from "./owner-adoption-kit.js";
import {
  createTargetDocumentationContinuityReport,
  TARGET_DOCUMENTATION_CONTINUITY_CONTRACT,
  TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION,
  type TargetDocumentationContinuityReport
} from "./target-continuity.js";

/**
 * @lang zh-CN 企业 baseline/current owner workflow 的中性 contract 名称；它组合既有报告但不授予目标执行权。
 * @lang en Neutral contract name for the enterprise baseline/current owner workflow; it composes existing reports without granting target execution authority.
 */
export const ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT = "enterprise-baseline-current-owner-workflow" as const;

/**
 * @lang zh-CN 首个 exact-match 草案版本；未知 future draft 必须 fail closed。
 * @lang en First exact-match draft version; unknown future drafts must fail closed.
 */
export const ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN CLI owner-local JSON Schema identity；该 URI 仅表示 identity，不承诺在线分发。
 * @lang en CLI owner-local JSON Schema identity; the URI is identity only and does not promise online distribution.
 */
export const ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/enterprise-baseline-current-owner-workflow-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN 固定 diagnostic catalog；message 不反射 caller data。
 * @lang en Fixed diagnostic catalog whose messages do not reflect caller data.
 */
export const ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_DIAGNOSTIC_CODES = [
  "HIA_ENTERPRISE_OWNER_WORKFLOW_REQUEST_INVALID",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_TARGET_FAMILY_INVALID",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_INPUT_MISSING",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_ADOPTION_KIT_REFUSED",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_CONTINUITY_REFUSED",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_PRIVACY_REFUSED",
  "HIA_ENTERPRISE_OWNER_WORKFLOW_PERMISSION_OR_ADOPTION_REFUSED"
] as const;

/**
 * @lang zh-CN workflow diagnostic code。
 * @lang en Workflow diagnostic code.
 */
export type EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode = typeof ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN pure workflow request；baseline/current 必须同时存在或同时缺省。
 * @lang en Pure workflow request; baseline and current must either both be present or both be absent.
 */
export interface EnterpriseBaselineCurrentOwnerWorkflowRequest {
  /**
   * @lang zh-CN 企业目标族的负责人采用套件请求，由套件生产器独立校验。
   * @lang en Enterprise-family owner adoption-kit request independently validated by the kit producer.
   */
  adoptionRequest: TargetOwnerAdoptionKitRequest;
  /**
   * @lang zh-CN 可选基线证据摘要，与current成对提供；仅套件就绪且两侧存在时参与连续性计算。
   * @lang en Optional baseline evidence summary supplied with current and compared only when the kit is ready and both sides are present.
   */
  baseline?: unknown;
  /**
   * @lang zh-CN 可选当前证据摘要，与baseline成对提供；未提交材料的诚实延后状态须两者均缺省。
   * @lang en Optional current evidence summary supplied with baseline, with both omitted for an honest unsubmitted-input deferral.
   */
  current?: unknown;
}

/**
 * @lang zh-CN 固定、无 caller payload 的 workflow diagnostic。
 * @lang en Fixed workflow diagnostic without caller payload.
 */
export interface EnterpriseBaselineCurrentOwnerWorkflowDiagnostic {
  /**
   * @lang zh-CN 所属报告闭集中的稳定诊断码。
   * @lang en Stable diagnostic code from the enclosing report's closed vocabulary.
   */
  code: EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode;
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
 * @lang zh-CN adoption-kit 的 body-free component 投影。
 * @lang en Body-free component projection of the adoption kit.
 */
export interface EnterpriseOwnerWorkflowAdoptionProjection {
  /**
   * @lang zh-CN 从负责人套件复制的target-owner-adoption-kit来源身份。
   * @lang en Target-owner-adoption-kit source identity copied from the owner kit.
   */
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  /**
   * @lang zh-CN 从负责人套件复制的精确0.1.0-draft来源版本。
   * @lang en Exact 0.1.0-draft source version copied from the owner kit.
   */
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  /**
   * @lang zh-CN 负责人套件组件的独立状态，可能与组合流程总状态不同。
   * @lang en Independent owner-kit component status, which may differ from the overall composed-workflow status.
   */
  status: TargetOwnerAdoptionKitReport["status"];
  /**
   * @lang zh-CN 从套件复制或按必需引用列表计算的计数投影。
   * @lang en Count projection copied from the kit or computed from its required-reference list.
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
   * @lang zh-CN 从套件门户投影复制的解析、未核置信度和元数据来源。
   * @lang en Resolution, unverified confidence and metadata provenance copied from the kit's Portal projection.
   */
  semantics: TargetOwnerAdoptionKitReport["portalSummary"]["semantics"];
}

/**
 * @lang zh-CN continuity component 的 count-only 投影；`not-provided` 分支不伪造 comparison 事实。
 * @lang en Count-only continuity component projection; the `not-provided` branch fabricates no comparison facts.
 */
export type EnterpriseOwnerWorkflowContinuityProjection = {
  availability: "not-provided";
} | {
  availability: "provided";
  contract: typeof TARGET_DOCUMENTATION_CONTINUITY_CONTRACT;
  contractVersion: typeof TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION;
  status: TargetDocumentationContinuityReport["status"];
  entries: TargetDocumentationContinuityReport["continuity"]["entries"];
  requiredOutputsPreserved: boolean;
  producers: {
    artifactCountNonDecreasing: boolean;
    baselineArtifactCount: number;
    currentArtifactCount: number;
    successPreserved: boolean;
  };
  privacyContinuityPreserved: boolean;
  semantics: TargetDocumentationContinuityReport["semantics"];
};

/**
 * @lang zh-CN 企业 owner workflow report；ready 只表示 owner input 与 evidence pair 可进入 review，绝不表示 adoption。
 * @lang en Enterprise owner workflow report; ready means owner input and the evidence pair may enter review, never adoption.
 */
export interface EnterpriseBaselineCurrentOwnerWorkflowReport {
  /**
   * @lang zh-CN 固定的enterprise-baseline-current-owner-workflow报告契约名称。
   * @lang en Fixed enterprise-baseline-current-owner-workflow report contract name.
   */
  contract: typeof ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft组合流程报告精确版本。
   * @lang en Fixed exact 0.1.0-draft composed-workflow report version.
   */
  contractVersion: typeof ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION;
  /**
   * @lang zh-CN 错误时拒绝，无材料且无证据对时延后；套件就绪并且连续性接受时就绪。
   * @lang en Refused on errors, deferred for missing input without an evidence pair, or ready when the kit is ready and continuity is accepted.
   */
  status: "ready-for-owner-review" | "deferred-owner-input-missing" | "refused";
  /**
   * @lang zh-CN 固定企业目标族及从负责人套件复制的公开目标标识。
   * @lang en Fixed enterprise target family and public target identifier copied from the owner kit.
   */
  target: {
    /**
     * @lang zh-CN 固定为enterprise-business的企业业务目标族。
     * @lang en Enterprise business target family fixed to enterprise-business.
     */
    family: "enterprise-business";
    /**
     * @lang zh-CN 从负责人套件复制的公开目标标识，无效原值已替换为invalid-target。
     * @lang en Public target identifier copied from the owner kit, with invalid original values already replaced by invalid-target.
     */
    id: string;
  };
  /**
   * @lang zh-CN 从负责人套件复制的提交、审阅同意及负责人和脱敏声明。
   * @lang en Submission, review consent, owner attestation and redaction attestation copied from the owner kit.
   */
  ownerInput: {
    /**
     * @lang zh-CN 从套件规范化材料状态复制的提交标记。
     * @lang en Submission flag copied from the kit's normalized input state.
     */
    submitted: boolean;
    /**
     * @lang zh-CN 从套件复制的审阅同意记录，保持调用方提供语义。
     * @lang en Recorded review consent copied from the kit with caller-provided semantics retained.
     */
    consent: "not-recorded" | "recorded-for-review";
    /**
     * @lang zh-CN 从套件复制的负责人身份声明，保持未经独立核实的语义。
     * @lang en Owner attestation copied from the kit with its independently unverified semantics retained.
     */
    attestation: "not-provided" | "target-owner-attested";
    /**
     * @lang zh-CN 从套件复制的公开安全脱敏声明。
     * @lang en Public-safe redaction attestation copied from the kit.
     */
    redactionAttested: boolean;
  };
  /**
   * @lang zh-CN 负责人套件与连续性的独立元数据投影。
   * @lang en Independent metadata projections of the owner kit and continuity components.
   */
  components: {
    /**
     * @lang zh-CN 负责人套件状态、引用计数与独立语义的无正文投影。
     * @lang en Body-free projection of owner-kit status, reference counts and independent semantics.
     */
    adoptionKit: EnterpriseOwnerWorkflowAdoptionProjection;
    /**
     * @lang zh-CN 实际连续性报告的计数投影，未执行比较时仅为availability:not-provided。
     * @lang en Count projection of an actual continuity report, reduced to availability:not-provided when no comparison ran.
     */
    continuity: EnterpriseOwnerWorkflowContinuityProjection;
  };
  /**
   * @lang zh-CN 组合报告的解析状态、未核置信度、来源、同意及未声明采用状态。
   * @lang en Composed-report resolution, unverified confidence, provenance, consent and unasserted adoption state.
   */
  semantics: {
    /**
     * @lang zh-CN 依总状态映射为owner-input-and-evidence-validated、owner-input-not-received或unresolved。
     * @lang en Maps overall status to owner-input-and-evidence-validated, owner-input-not-received or unresolved.
     */
    resolution: "owner-input-and-evidence-validated" | "owner-input-not-received" | "unresolved";
    /**
     * @lang zh-CN 固定为caller-provided-unverified，输入事实保持调用方声明的置信边界。
     * @lang en Fixed to caller-provided-unverified, retaining the confidence boundary of caller-declared input facts.
     */
    confidence: "caller-provided-unverified";
    /**
     * @lang zh-CN 固定为composed-owner-metadata-workflow的报告组合来源。
     * @lang en Report-composition provenance fixed to composed-owner-metadata-workflow.
     */
    provenance: "composed-owner-metadata-workflow";
    /**
     * @lang zh-CN 从负责人套件复制的审阅同意记录。
     * @lang en Recorded review consent copied from the owner kit.
     */
    consent: "not-recorded" | "recorded-for-review";
    /**
     * @lang zh-CN 固定为not-asserted的目标采用声明状态。
     * @lang en Target-adoption assertion state fixed to not-asserted.
     */
    adoption: "not-asserted";
  };
  /**
   * @lang zh-CN 固定排除请求及证据正文、标识列表、路径、凭据和工作状态的序列化声明。
   * @lang en Fixed serialization declaration excluding request/evidence bodies, identifier lists, paths, credentials and working state.
   */
  privacy: {
    /**
     * @lang zh-CN 固定为false，报告排除负责人采用请求正文。
     * @lang en Fixed to false, excluding the owner adoption-request body from the report.
     */
    adoptionRequestBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除基线证据正文。
     * @lang en Fixed to false, excluding the baseline evidence body from the report.
     */
    baselineEvidenceSerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除当前证据正文。
     * @lang en Fixed to false, excluding the current evidence body from the report.
     */
    currentEvidenceSerialized: false;
    /**
     * @lang zh-CN 固定为false，条目标识列表仅用于内存比较，报告保留计数。
     * @lang en Fixed to false, keeping entry-identifier lists in memory for comparison and retaining counts in the report.
     */
    entryIdsSerialized: false;
    /**
     * @lang zh-CN 固定为false，生产器标识列表仅用于内存比较，报告保留计数。
     * @lang en Fixed to false, keeping producer-identifier lists in memory for comparison and retaining counts in the report.
     */
    producerIdsSerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除源码正文。
     * @lang en Fixed to false, excluding source bodies from the report.
     */
    sourceBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除工件正文。
     * @lang en Fixed to false, excluding artifact bodies from the report.
     */
    artifactBodySerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除路径。
     * @lang en Fixed to false, excluding paths from the report.
     */
    pathSerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除凭据。
     * @lang en Fixed to false, excluding credentials from the report.
     */
    credentialSerialized: false;
    /**
     * @lang zh-CN 固定为false，报告排除工作状态。
     * @lang en Fixed to false, excluding working state from the report.
     */
    workingStateSerialized: false;
    /**
     * @lang zh-CN 固定为none，报告不嵌入sourcesContent源码正文。
     * @lang en Fixed to none, excluding embedded sourcesContent source bodies from the report.
     */
    sourcesContentPolicy: "none";
  };
  /**
   * @lang zh-CN 固定全部为false的负责人联系、目标操作、网络、发布和采用声明边界。
   * @lang en Owner-contact, target-operation, network, publication and adoption-claim boundary fixed entirely to false.
   */
  permissions: {
    /**
     * @lang zh-CN 固定为false，组合评估不联系负责人。
     * @lang en Fixed to false, declaring that composition evaluation does not contact an owner.
     */
    ownerContacted: false;
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
   * @lang zh-CN 按码去重的固定公开诊断，记录组合错误或缺材料延后警告。
   * @lang en Fixed public diagnostics deduplicated by code, recording composition errors or a missing-input deferral warning.
   */
  diagnostics: EnterpriseBaselineCurrentOwnerWorkflowDiagnostic[];
}

const DIAGNOSTIC_MESSAGES: Record<EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode, string> = {
  HIA_ENTERPRISE_OWNER_WORKFLOW_REQUEST_INVALID: "Enterprise owner workflow requires a closed request with one adoption request and an optional complete baseline/current pair.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_TARGET_FAMILY_INVALID: "Enterprise owner workflow accepts only the enterprise-business target family.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_INPUT_MISSING: "Owner input and baseline/current evidence are not recorded; the workflow remains honestly deferred without an adoption claim.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT: "Owner submission and baseline/current availability must form either an honest deferred state or a complete review state.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_ADOPTION_KIT_REFUSED: "Enterprise owner workflow refuses an adoption-kit component that fails its exact contract or safety boundary.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_CONTINUITY_REFUSED: "Enterprise owner workflow refuses a baseline/current pair that fails documentation continuity.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_PRIVACY_REFUSED: "Enterprise owner workflow refuses source, artifact, evidence, path, credential, or working-state payload leakage.",
  HIA_ENTERPRISE_OWNER_WORKFLOW_PERMISSION_OR_ADOPTION_REFUSED: "Enterprise owner workflow grants no owner-contact, target, network, publish, or adoption authority."
};

/**
 * @lang zh-CN `enterprise-baseline-current-owner-workflow@0.1.0-draft` 的 owner-local Draft 2020-12 JSON Schema。
 * @lang en Owner-local Draft 2020-12 JSON Schema for `enterprise-baseline-current-owner-workflow@0.1.0-draft`.
 */
export const ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_SCHEMA_ID,
  title: "Enterprise baseline/current owner workflow report",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "target", "ownerInput", "components", "semantics", "privacy", "permissions", "diagnostics"],
  properties: {
    contract: { const: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT },
    contractVersion: { const: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION },
    status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["family", "id"],
      properties: {
        family: { const: "enterprise-business" },
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" }
      }
    },
    ownerInput: {
      type: "object",
      additionalProperties: false,
      required: ["submitted", "consent", "attestation", "redactionAttested"],
      properties: {
        submitted: { type: "boolean" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        attestation: { enum: ["not-provided", "target-owner-attested"] },
        redactionAttested: { type: "boolean" }
      }
    },
    components: {
      type: "object",
      additionalProperties: false,
      required: ["adoptionKit", "continuity"],
      properties: {
        adoptionKit: { $ref: "#/$defs/adoptionKit" },
        continuity: { oneOf: [{ $ref: "#/$defs/continuityNotProvided" }, { $ref: "#/$defs/continuityProvided" }] }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance", "consent", "adoption"],
      properties: {
        resolution: { enum: ["owner-input-and-evidence-validated", "owner-input-not-received", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "composed-owner-metadata-workflow" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        adoption: { const: "not-asserted" }
      }
    },
    privacy: { $ref: "#/$defs/privacy" },
    permissions: { $ref: "#/$defs/permissions" },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { enum: [...ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_DIAGNOSTIC_CODES] },
          message: { enum: Object.values(DIAGNOSTIC_MESSAGES) },
          severity: { enum: ["error", "warning"] }
        }
      }
    }
  },
  $defs: {
    count: { type: "integer", minimum: 0 },
    adoptionKit: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "status", "contracts", "semantics"],
      properties: {
        contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
        contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
        status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
        contracts: {
          type: "object",
          additionalProperties: false,
          required: ["requiredCount", "providedCount", "missingCount"],
          properties: {
            requiredCount: { $ref: "#/$defs/count" },
            providedCount: { $ref: "#/$defs/count" },
            missingCount: { $ref: "#/$defs/count" }
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
        }
      }
    },
    continuityNotProvided: {
      type: "object",
      additionalProperties: false,
      required: ["availability"],
      properties: { availability: { const: "not-provided" } }
    },
    continuityProvided: {
      type: "object",
      additionalProperties: false,
      required: ["availability", "contract", "contractVersion", "status", "entries", "requiredOutputsPreserved", "producers", "privacyContinuityPreserved", "semantics"],
      properties: {
        availability: { const: "provided" },
        contract: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT },
        contractVersion: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION },
        status: { enum: ["accepted", "refused"] },
        entries: {
          type: "object",
          additionalProperties: false,
          required: ["addedCount", "baselineCount", "currentCount", "removedCount", "unchangedCount"],
          properties: {
            addedCount: { $ref: "#/$defs/count" }, baselineCount: { $ref: "#/$defs/count" }, currentCount: { $ref: "#/$defs/count" },
            removedCount: { $ref: "#/$defs/count" }, unchangedCount: { $ref: "#/$defs/count" }
          }
        },
        requiredOutputsPreserved: { type: "boolean" },
        producers: {
          type: "object",
          additionalProperties: false,
          required: ["artifactCountNonDecreasing", "baselineArtifactCount", "currentArtifactCount", "successPreserved"],
          properties: {
            artifactCountNonDecreasing: { type: "boolean" }, baselineArtifactCount: { $ref: "#/$defs/count" },
            currentArtifactCount: { $ref: "#/$defs/count" }, successPreserved: { type: "boolean" }
          }
        },
        privacyContinuityPreserved: { type: "boolean" },
        semantics: {
          type: "object",
          additionalProperties: false,
          required: ["resolution", "confidence", "provenance"],
          properties: {
            resolution: { enum: ["evidence-summary-pair-validated", "unresolved"] },
            confidence: { const: "caller-provided-unverified" },
            provenance: { const: "metadata-only-comparison" }
          }
        }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["adoptionRequestBodySerialized", "baselineEvidenceSerialized", "currentEvidenceSerialized", "entryIdsSerialized", "producerIdsSerialized", "sourceBodySerialized", "artifactBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"],
      properties: {
        adoptionRequestBodySerialized: { const: false }, baselineEvidenceSerialized: { const: false }, currentEvidenceSerialized: { const: false },
        entryIdsSerialized: { const: false }, producerIdsSerialized: { const: false }, sourceBodySerialized: { const: false },
        artifactBodySerialized: { const: false }, pathSerialized: { const: false }, credentialSerialized: { const: false },
        workingStateSerialized: { const: false }, sourcesContentPolicy: { const: "none" }
      }
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: ["ownerContacted", "targetRepositoryRead", "targetRepositoryWrite", "targetCommandExecuted", "targetRuntimeOpened", "targetBranchOrPrCreated", "networkAccessed", "packagePublished", "targetAdoptionClaimed"],
      properties: {
        ownerContacted: { const: false }, targetRepositoryRead: { const: false }, targetRepositoryWrite: { const: false },
        targetCommandExecuted: { const: false }, targetRuntimeOpened: { const: false }, targetBranchOrPrCreated: { const: false },
        networkAccessed: { const: false }, packagePublished: { const: false }, targetAdoptionClaimed: { const: false }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 从显式 public-safe inputs 创建 deterministic enterprise owner workflow report；pure evaluator 不执行 IO。
 * @lang en Creates a deterministic enterprise owner workflow report from explicit public-safe inputs; the pure evaluator performs no IO.
 *
 * @param request caller-provided adoption request 与可选 evidence pair。 / Caller-provided adoption request and optional evidence pair.
 * @returns ready、deferred 或 fail-closed report。 / Ready, deferred, or fail-closed report.
 */
export function createEnterpriseBaselineCurrentOwnerWorkflow(
  request: EnterpriseBaselineCurrentOwnerWorkflowRequest
): EnterpriseBaselineCurrentOwnerWorkflowReport {
  // <lang><zh-CN>恢复 unknown trust boundary；request exact keys 与 nested component 各自独立验证。</zh-CN><en>Return to the unknown trust boundary; request exact keys and nested components are validated independently.</en></lang>
  const untrusted: unknown = request;
  const candidate = isRecord(untrusted) ? untrusted : {};
  const adoptionKit = createTargetOwnerAdoptionKit(candidate.adoptionRequest as TargetOwnerAdoptionKitRequest);
  const diagnostics: EnterpriseBaselineCurrentOwnerWorkflowDiagnostic[] = [];
  const hasBaseline = candidate.baseline !== undefined;
  const hasCurrent = candidate.current !== undefined;
  const pairProvided = hasBaseline && hasCurrent;
  const requestValid = hasOnlyExactKeys(candidate, ["adoptionRequest"], ["baseline", "current"]);

  if (!requestValid || hasBaseline !== hasCurrent) {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_REQUEST_INVALID", "error");
  }
  if (adoptionKit.trial.targetFamily !== "enterprise-business") {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_TARGET_FAMILY_INVALID", "error");
  }
  if (adoptionKit.status === "refused") {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_ADOPTION_KIT_REFUSED", "error");
  }

  // <lang><zh-CN>只有“未提交+无 pair”或“已提交+完整 pair”一致；任何 partial/contradictory state 都拒绝。</zh-CN><en>Only unsubmitted-without-pair or submitted-with-complete-pair is consistent; every partial or contradictory state is refused.</en></lang>
  const ownerEvidenceStateConsistent = adoptionKit.status === "deferred-owner-input-missing"
    ? !hasBaseline && !hasCurrent
    : adoptionKit.status === "ready-for-owner-review"
      ? pairProvided
      : true;
  if (!ownerEvidenceStateConsistent) {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_EVIDENCE_STATE_INCONSISTENT", "error");
  }

  // <lang><zh-CN>只有 adoption kit 已 ready 且 pair 完整才调用 continuity；deferred 分支不生成虚假 count。</zh-CN><en>Continuity runs only when the adoption kit is ready and the pair is complete; the deferred branch emits no fabricated counts.</en></lang>
  const continuityReport = adoptionKit.status === "ready-for-owner-review" && pairProvided
    ? createTargetDocumentationContinuityReport({
      baseline: candidate.baseline,
      current: candidate.current,
      targetFamily: "enterprise-business",
      targetId: adoptionKit.trial.targetId
    })
    : undefined;
  if (continuityReport?.status === "refused") {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_CONTINUITY_REFUSED", "error");
  }
  if (containsForbiddenPayload(candidate)) {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_PRIVACY_REFUSED", "error");
  }
  if (containsForbiddenActionClaim(candidate)) {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_PERMISSION_OR_ADOPTION_REFUSED", "error");
  }

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const status: EnterpriseBaselineCurrentOwnerWorkflowReport["status"] = hasError
    ? "refused"
    : adoptionKit.status === "deferred-owner-input-missing"
      ? "deferred-owner-input-missing"
      : continuityReport?.status === "accepted"
        ? "ready-for-owner-review"
        : "refused";
  if (status === "deferred-owner-input-missing") {
    addDiagnostic(diagnostics, "HIA_ENTERPRISE_OWNER_WORKFLOW_OWNER_INPUT_MISSING", "warning");
  }

  const adoptionProjection: EnterpriseOwnerWorkflowAdoptionProjection = {
    contract: adoptionKit.contract,
    contractVersion: adoptionKit.contractVersion,
    status: adoptionKit.status,
    contracts: {
      requiredCount: adoptionKit.contracts.required.length,
      providedCount: adoptionKit.contracts.providedCount,
      missingCount: adoptionKit.contracts.missingCount
    },
    semantics: adoptionKit.portalSummary.semantics
  };
  const continuityProjection: EnterpriseOwnerWorkflowContinuityProjection = continuityReport
    ? projectContinuityReport(continuityReport)
    : { availability: "not-provided" };
  const resolution: EnterpriseBaselineCurrentOwnerWorkflowReport["semantics"]["resolution"] = status === "ready-for-owner-review"
    ? "owner-input-and-evidence-validated"
    : status === "deferred-owner-input-missing"
      ? "owner-input-not-received"
      : "unresolved";

  return {
    contract: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT,
    contractVersion: ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION,
    status,
    target: { family: "enterprise-business", id: adoptionKit.trial.targetId },
    ownerInput: {
      submitted: adoptionKit.ownerInput.submitted,
      consent: adoptionKit.ownerInput.consent,
      attestation: adoptionKit.ownerInput.attestation,
      redactionAttested: adoptionKit.ownerInput.redactionAttested
    },
    components: { adoptionKit: adoptionProjection, continuity: continuityProjection },
    semantics: {
      resolution,
      confidence: "caller-provided-unverified",
      provenance: "composed-owner-metadata-workflow",
      consent: adoptionKit.ownerInput.consent,
      adoption: "not-asserted"
    },
    privacy: {
      adoptionRequestBodySerialized: false,
      baselineEvidenceSerialized: false,
      currentEvidenceSerialized: false,
      entryIdsSerialized: false,
      producerIdsSerialized: false,
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      pathSerialized: false,
      credentialSerialized: false,
      workingStateSerialized: false,
      sourcesContentPolicy: "none"
    },
    permissions: {
      ownerContacted: false,
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
 * @lang zh-CN 对 unknown workflow report 执行 closed-world runtime guard 与关键跨字段不变量检查。
 * @lang en Performs a closed-world runtime guard and key cross-field invariant checks for an unknown workflow report.
 *
 * @param value unknown report candidate。 / Unknown report candidate.
 * @returns 是否符合 exact draft report。 / Whether the value conforms to the exact draft report.
 */
export function isEnterpriseBaselineCurrentOwnerWorkflowReport(value: unknown): value is EnterpriseBaselineCurrentOwnerWorkflowReport {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "status", "target", "ownerInput", "components", "semantics", "privacy", "permissions", "diagnostics"])
    || value.contract !== ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT
    || value.contractVersion !== ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_CONTRACT_VERSION
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))
    || !isReportTarget(value.target)
    || !isReportOwnerInput(value.ownerInput)
    || !isReportComponents(value.components)
    || !isReportSemantics(value.semantics)
    || !isReportPrivacy(value.privacy)
    || !isReportPermissions(value.permissions)
    || !isDiagnostics(value.diagnostics)) {
    return false;
  }
  const status = value.status as EnterpriseBaselineCurrentOwnerWorkflowReport["status"];
  const semantics = value.semantics as Record<string, unknown>;
  const components = value.components as Record<string, unknown>;
  const continuity = components.continuity as Record<string, unknown>;
  const diagnostics = value.diagnostics as unknown[];
  if (status === "ready-for-owner-review") {
    return semantics.resolution === "owner-input-and-evidence-validated"
      && continuity.availability === "provided"
      && continuity.status === "accepted"
      && diagnostics.length === 0;
  }
  if (status === "deferred-owner-input-missing") {
    return semantics.resolution === "owner-input-not-received"
      && continuity.availability === "not-provided"
      && diagnostics.length === 1;
  }
  return semantics.resolution === "unresolved" && diagnostics.some((diagnostic) => isRecord(diagnostic) && diagnostic.severity === "error");
}

/**
 * @lang zh-CN enterprise workflow CLI 的最小 IO surface。
 * @lang en Minimal IO surface for the enterprise workflow CLI.
 */
export interface EnterpriseBaselineCurrentOwnerWorkflowCliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

/**
 * @lang zh-CN 从 caller cwd 中的显式 safe-relative JSON 运行 enterprise workflow；不发现或打开 target。
 * @lang en Runs the enterprise workflow from explicit safe-relative JSON files under caller cwd; it never discovers or opens a target.
 *
 * @param argv `hia docs enterprise-workflow` 后的 arguments。 / Arguments after `hia docs enterprise-workflow`.
 * @param io controlled caller IO。 / Controlled caller IO.
 * @returns process-style exit code；诚实 deferred 返回 0，refused 返回 1。 / Process-style exit code; honest deferred returns 0 and refused returns 1.
 */
export async function runEnterpriseBaselineCurrentOwnerWorkflowCommand(
  argv: string[],
  io: EnterpriseBaselineCurrentOwnerWorkflowCliIo
): Promise<number> {
  const options = parseOptions(argv, ["--adoption-request", "--baseline", "--current", "--out"]);
  const adoptionRequestRelativePath = options.values.get("--adoption-request");
  const baselineRelativePath = options.values.get("--baseline");
  const currentRelativePath = options.values.get("--current");
  const outputRelativePath = options.values.get("--out");
  const hasBaseline = baselineRelativePath !== undefined;
  const hasCurrent = currentRelativePath !== undefined;
  const paths = [adoptionRequestRelativePath, baselineRelativePath, currentRelativePath, outputRelativePath].filter((value): value is string => value !== undefined);
  if (!options.valid
    || !isSafeRelativePath(adoptionRequestRelativePath)
    || hasBaseline !== hasCurrent
    || paths.some((value) => !isSafeRelativePath(value))
    || new Set(paths.map(normalizeComparablePath)).size !== paths.length) {
    io.stderr("[error:HIA_ENTERPRISE_OWNER_WORKFLOW_PATH_INVALID] docs enterprise-workflow requires a safe relative adoption request, an optional complete baseline/current pair, and a distinct optional output path.");
    return 1;
  }

  let adoptionRequest: unknown;
  let baseline: unknown;
  let current: unknown;
  try {
    // <lang><zh-CN>所有 reads 都是 caller 明示的 metadata 文件；没有 target root、source、HTML、manifest 或 working-state discovery。</zh-CN><en>Every read is a caller-explicit metadata file; there is no target-root, source, HTML, manifest, or working-state discovery.</en></lang>
    adoptionRequest = JSON.parse(await readFile(path.resolve(io.cwd, adoptionRequestRelativePath), "utf8"));
    if (baselineRelativePath && currentRelativePath) {
      baseline = JSON.parse(await readFile(path.resolve(io.cwd, baselineRelativePath), "utf8"));
      current = JSON.parse(await readFile(path.resolve(io.cwd, currentRelativePath), "utf8"));
    }
  } catch {
    io.stderr("[error:HIA_ENTERPRISE_OWNER_WORKFLOW_INPUT_READ_FAILED] docs enterprise-workflow could not read its explicit JSON inputs.");
    return 1;
  }
  const request: EnterpriseBaselineCurrentOwnerWorkflowRequest = {
    adoptionRequest: adoptionRequest as TargetOwnerAdoptionKitRequest,
    ...(hasBaseline ? { baseline, current } : {})
  };
  const report = createEnterpriseBaselineCurrentOwnerWorkflow(request);
  const serialized = JSON.stringify(report, null, 2);
  if (outputRelativePath) {
    try {
      const outputPath = path.resolve(io.cwd, outputRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
      io.stdout(`Generated enterprise owner workflow report at ${outputRelativePath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_ENTERPRISE_OWNER_WORKFLOW_OUTPUT_WRITE_FAILED] docs enterprise-workflow could not write the explicit output report.");
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
 * @lang zh-CN 把 continuity report 投影为无 identity/body 的 count-only component。
 * @lang en Projects a continuity report into a count-only component without identities or bodies.
 */
function projectContinuityReport(report: TargetDocumentationContinuityReport): EnterpriseOwnerWorkflowContinuityProjection {
  return {
    availability: "provided",
    contract: report.contract,
    contractVersion: report.contractVersion,
    status: report.status,
    entries: report.continuity.entries,
    requiredOutputsPreserved: report.continuity.requiredOutputs.allPreserved,
    producers: {
      artifactCountNonDecreasing: report.continuity.producers.artifactCountNonDecreasing,
      baselineArtifactCount: report.continuity.producers.baseline.artifactCount,
      currentArtifactCount: report.continuity.producers.current.artifactCount,
      successPreserved: report.continuity.producers.successPreserved
    },
    privacyContinuityPreserved: report.continuity.privacy.continuityPreserved,
    semantics: report.semantics
  };
}

/**
 * @lang zh-CN 按固定顺序添加去重 diagnostic。
 * @lang en Adds a deduplicated diagnostic in fixed order.
 */
function addDiagnostic(
  diagnostics: EnterpriseBaselineCurrentOwnerWorkflowDiagnostic[],
  code: EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode,
  severity: "error" | "warning"
): void {
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) {
    diagnostics.push({ code, message: DIAGNOSTIC_MESSAGES[code], severity });
  }
}

/**
 * @lang zh-CN 检测 request 内禁止序列化的 payload key。
 * @lang en Detects payload keys that the request must never serialize.
 */
function containsForbiddenPayload(value: unknown): boolean {
  const forbidden = new Set(["sourceBody", "artifactBody", "evidenceBody", "commandOutputBody", "sourceText", "sourcesContent", "absolutePath", "privatePath", "credential", "workingState"]);
  return containsForbiddenKey(value, (key, nested) => forbidden.has(key) && nested !== false && nested !== "none");
}

/**
 * @lang zh-CN 检测任何越权 true claim；正常 deny-all false 字段保持合法。
 * @lang en Detects any unauthorized true claim while allowing normal deny-all false fields.
 */
function containsForbiddenActionClaim(value: unknown): boolean {
  const forbidden = new Set(["ownerContacted", "targetRepositoryRead", "targetRepositoryWrite", "targetCommandExecuted", "targetRuntimeOpened", "targetBranchOrPrCreated", "networkAccessed", "packagePublished", "targetAdoptionClaimed"]);
  return containsForbiddenKey(value, (key, nested) => forbidden.has(key) && nested === true);
}

/**
 * @lang zh-CN 深度扫描 JSON-like value，但不执行 getter 或表达式。
 * @lang en Scans a JSON-like value deeply without executing getters or expressions.
 */
function containsForbiddenKey(value: unknown, matches: (key: string, nested: unknown) => boolean): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, matches));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => matches(key, nested) || containsForbiddenKey(nested, matches));
}

/**
 * @lang zh-CN 验证 report target identity。
 * @lang en Validates report target identity.
 */
function isReportTarget(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["family", "id"]) && value.family === "enterprise-business" && isStableIdentifier(value.id);
}

/**
 * @lang zh-CN 验证 owner input 投影。
 * @lang en Validates the owner-input projection.
 */
function isReportOwnerInput(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["submitted", "consent", "attestation", "redactionAttested"])
    && typeof value.submitted === "boolean"
    && (value.consent === "not-recorded" || value.consent === "recorded-for-review")
    && (value.attestation === "not-provided" || value.attestation === "target-owner-attested")
    && typeof value.redactionAttested === "boolean";
}

/**
 * @lang zh-CN 验证两个 body-free component projections。
 * @lang en Validates the two body-free component projections.
 */
function isReportComponents(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["adoptionKit", "continuity"])
    && isAdoptionProjection(value.adoptionKit) && isContinuityProjection(value.continuity);
}

/**
 * @lang zh-CN 验证 adoption component exact shape。
 * @lang en Validates the exact adoption-component shape.
 */
function isAdoptionProjection(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["contract", "contractVersion", "status", "contracts", "semantics"])) return false;
  if (value.contract !== TARGET_OWNER_ADOPTION_KIT_CONTRACT || value.contractVersion !== TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION) return false;
  if (!["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))) return false;
  const contracts = value.contracts;
  const semantics = value.semantics;
  return isRecord(contracts) && hasExactKeys(contracts, ["requiredCount", "providedCount", "missingCount"])
    && Object.values(contracts).every(isNonNegativeInteger)
    && isRecord(semantics) && hasExactKeys(semantics, ["resolution", "confidence", "provenance"])
    && ["owner-input-validated", "owner-input-not-received", "unresolved"].includes(String(semantics.resolution))
    && semantics.confidence === "caller-provided-unverified" && semantics.provenance === "metadata-only-owner-kit";
}

/**
 * @lang zh-CN 验证 not-provided 或 provided continuity projection。
 * @lang en Validates a not-provided or provided continuity projection.
 */
function isContinuityProjection(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.availability === "not-provided") return hasExactKeys(value, ["availability"]);
  if (value.availability !== "provided" || !hasExactKeys(value, ["availability", "contract", "contractVersion", "status", "entries", "requiredOutputsPreserved", "producers", "privacyContinuityPreserved", "semantics"])) return false;
  if (value.contract !== TARGET_DOCUMENTATION_CONTINUITY_CONTRACT || value.contractVersion !== TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION || (value.status !== "accepted" && value.status !== "refused")) return false;
  const entries = value.entries;
  const producers = value.producers;
  const semantics = value.semantics;
  return isRecord(entries) && hasExactKeys(entries, ["addedCount", "baselineCount", "currentCount", "removedCount", "unchangedCount"])
    && Object.values(entries).every(isNonNegativeInteger)
    && typeof value.requiredOutputsPreserved === "boolean" && typeof value.privacyContinuityPreserved === "boolean"
    && isRecord(producers) && hasExactKeys(producers, ["artifactCountNonDecreasing", "baselineArtifactCount", "currentArtifactCount", "successPreserved"])
    && typeof producers.artifactCountNonDecreasing === "boolean" && isNonNegativeInteger(producers.baselineArtifactCount)
    && isNonNegativeInteger(producers.currentArtifactCount) && typeof producers.successPreserved === "boolean"
    && isRecord(semantics) && hasExactKeys(semantics, ["resolution", "confidence", "provenance"])
    && (semantics.resolution === "evidence-summary-pair-validated" || semantics.resolution === "unresolved")
    && semantics.confidence === "caller-provided-unverified" && semantics.provenance === "metadata-only-comparison";
}

/**
 * @lang zh-CN 验证 workflow semantics 的三维独立性与 deny-adoption。
 * @lang en Validates independent workflow semantics and denied adoption.
 */
function isReportSemantics(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["resolution", "confidence", "provenance", "consent", "adoption"])
    && ["owner-input-and-evidence-validated", "owner-input-not-received", "unresolved"].includes(String(value.resolution))
    && value.confidence === "caller-provided-unverified" && value.provenance === "composed-owner-metadata-workflow"
    && (value.consent === "not-recorded" || value.consent === "recorded-for-review") && value.adoption === "not-asserted";
}

/**
 * @lang zh-CN 验证所有 privacy disclosure 均为 deny-all。
 * @lang en Validates that every privacy disclosure is deny-all.
 */
function isReportPrivacy(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["adoptionRequestBodySerialized", "baselineEvidenceSerialized", "currentEvidenceSerialized", "entryIdsSerialized", "producerIdsSerialized", "sourceBodySerialized", "artifactBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"])) return false;
  return Object.entries(value).every(([key, nested]) => key === "sourcesContentPolicy" ? nested === "none" : nested === false);
}

/**
 * @lang zh-CN 验证 workflow 不授予任何 external action。
 * @lang en Validates that the workflow grants no external action.
 */
function isReportPermissions(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["ownerContacted", "targetRepositoryRead", "targetRepositoryWrite", "targetCommandExecuted", "targetRuntimeOpened", "targetBranchOrPrCreated", "networkAccessed", "packagePublished", "targetAdoptionClaimed"])
    && Object.values(value).every((nested) => nested === false);
}

/**
 * @lang zh-CN 验证 diagnostic 使用固定 code/message pairing。
 * @lang en Validates fixed diagnostic code/message pairing.
 */
function isDiagnostics(value: unknown): boolean {
  return Array.isArray(value) && value.every((diagnostic) => isRecord(diagnostic)
    && hasExactKeys(diagnostic, ["code", "message", "severity"])
    && ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_DIAGNOSTIC_CODES.includes(diagnostic.code as EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode)
    && (diagnostic.severity === "error" || diagnostic.severity === "warning")
    && diagnostic.message === DIAGNOSTIC_MESSAGES[diagnostic.code as EnterpriseBaselineCurrentOwnerWorkflowDiagnosticCode]);
}

/**
 * @lang zh-CN closed option parser 拒绝 positional、unknown、duplicate 与 missing value。
 * @lang en Closed option parser rejects positional, unknown, duplicate, and missing values.
 */
function parseOptions(argv: string[], allowedOptions: string[]): { valid: boolean; values: Map<string, string> } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name || !allowedOptions.includes(name) || values.has(name) || !value || value.startsWith("--")) return { valid: false, values };
    values.set(name, value);
  }
  return { valid: argv.length % 2 === 0, values };
}

/**
 * @lang zh-CN 只允许 caller cwd 下的 normalized relative path。
 * @lang en Allows only normalized relative paths under caller cwd.
 */
function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && !path.isAbsolute(value)
    && !value.includes("\0") && !value.split(/[\\/]+/u).some((segment) => segment === ".." || segment === "")
    && !/^[A-Za-z]:/u.test(value);
}

/**
 * @lang zh-CN 规范化 path equality，阻止 Windows case/separator alias 覆盖 input。
 * @lang en Normalizes path equality to prevent Windows case/separator aliases from overwriting an input.
 */
function normalizeComparablePath(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

/**
 * @lang zh-CN 验证公开 stable identifier grammar。
 * @lang en Validates the public stable-identifier grammar.
 */
function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
}

/**
 * @lang zh-CN 验证非负整数 count。
 * @lang en Validates a non-negative integer count.
 */
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

/**
 * @lang zh-CN JSON object type guard。
 * @lang en JSON-object type guard.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @lang zh-CN 验证 object exact keys。
 * @lang en Validates exact object keys.
 */
function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

/**
 * @lang zh-CN 验证 required + optional closed-world keys。
 * @lang en Validates required plus optional closed-world keys.
 */
function hasOnlyExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[]): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => required.includes(key) || optional.includes(key));
}
