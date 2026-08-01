import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @lang zh-CN 目标项目文档连续性报告的中性 contract 名称；由 CLI 持有，不属于 target repository。
 * @lang en Neutral contract name for target-project documentation continuity reports; it is CLI-owned, not target-owned.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_CONTRACT = "target-documentation-continuity" as const;

/**
 * @lang zh-CN 连续性报告的首个 exact-match 草案版本；未知 future draft 必须 fail closed。
 * @lang en First exact-match draft version of the continuity report; unknown future drafts must fail closed.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN CLI owner-local JSON Schema identity；该 URI 是 identity，不表示本轮已经在线分发。
 * @lang en CLI owner-local JSON Schema identity; the URI is an identity and does not imply online distribution in this slice.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/target-documentation-continuity-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN W-P84 只承接 enterprise/business family；其它 portfolio family 仍使用各自 owner 流程。
 * @lang en W-P84 covers only the enterprise/business family; other portfolio families retain their owner-specific flows.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_FAMILIES = ["enterprise-business"] as const;

/**
 * @lang zh-CN target documentation continuity 支持的唯一第一轮 family。
 * @lang en The sole target-documentation continuity family supported by the first slice.
 */
export type TargetDocumentationContinuityFamily = typeof TARGET_DOCUMENTATION_CONTINUITY_FAMILIES[number];

/**
 * @lang zh-CN 固定且不反射 caller data 的连续性诊断目录。
 * @lang en Fixed continuity diagnostic catalogue that never reflects caller data.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES = [
  "HIA_TARGET_CONTINUITY_REQUEST_INVALID",
  "HIA_TARGET_CONTINUITY_EVIDENCE_CONTRACT_INVALID",
  "HIA_TARGET_CONTINUITY_EVIDENCE_SHAPE_INVALID",
  "HIA_TARGET_CONTINUITY_EVIDENCE_NOT_READY",
  "HIA_TARGET_CONTINUITY_STABLE_IDENTITY_INVALID",
  "HIA_TARGET_CONTINUITY_ENTRY_COVERAGE_REGRESSED",
  "HIA_TARGET_CONTINUITY_REQUIRED_OUTPUT_REGRESSED",
  "HIA_TARGET_CONTINUITY_PRODUCER_COMPATIBILITY_INVALID",
  "HIA_TARGET_CONTINUITY_PRODUCER_COVERAGE_REGRESSED",
  "HIA_TARGET_CONTINUITY_PRIVACY_REFUSED",
  "HIA_TARGET_CONTINUITY_PERMISSION_OR_ADOPTION_REFUSED"
] as const;

/** @lang zh-CN 连续性报告 diagnostic code。 @lang en Continuity-report diagnostic code. */
export type TargetDocumentationContinuityDiagnosticCode = typeof TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN pure evaluator request；baseline/current 保持 unknown，确保 runtime validator 而非 TypeScript 信任输入。
 * @lang en Pure-evaluator request; baseline/current remain unknown so runtime validation, not TypeScript, establishes trust.
 */
export interface TargetDocumentationContinuityRequest {
  baseline: unknown;
  current: unknown;
  targetFamily: string;
  targetId: string;
}

/**
 * @lang zh-CN 不含 caller path、identity 或正文的固定 report diagnostic。
 * @lang en Fixed report diagnostic containing no caller path, identity, or body.
 */
export interface TargetDocumentationContinuityDiagnostic {
  code: TargetDocumentationContinuityDiagnosticCode;
  message: string;
  severity: "error";
}

/** @lang zh-CN 单个 required output 的两侧连续性。 @lang en Two-sided continuity for one required output. */
export interface TargetDocumentationContinuityRequiredOutput {
  baseline: boolean;
  current: boolean;
  preserved: boolean;
}

/** @lang zh-CN 一侧 producer 的无 identity 计数摘要。 @lang en Identity-free producer count summary for one side. */
export interface TargetDocumentationContinuityProducerSummary {
  artifactCount: number;
  producerCount: number;
  successfulProducerCount: number;
}

/**
 * @lang zh-CN 由两份 generated-docs evidence summary 派生的 metadata-only continuity report。
 * @lang en Metadata-only continuity report derived from two generated-docs evidence summaries.
 */
export interface TargetDocumentationContinuityReport {
  contract: typeof TARGET_DOCUMENTATION_CONTINUITY_CONTRACT;
  contractVersion: typeof TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION;
  continuity: {
    entries: {
      addedCount: number;
      baselineCount: number;
      currentCount: number;
      removedCount: number;
      unchangedCount: number;
    };
    privacy: {
      baselineCompatible: boolean;
      continuityPreserved: boolean;
      currentCompatible: boolean;
    };
    producers: {
      artifactCountNonDecreasing: boolean;
      baseline: TargetDocumentationContinuityProducerSummary;
      current: TargetDocumentationContinuityProducerSummary;
      identity: {
        addedCount: number;
        removedCount: number;
        unchangedCount: number;
      };
      successPreserved: boolean;
    };
    requiredOutputs: {
      allPreserved: boolean;
      indexHtml: TargetDocumentationContinuityRequiredOutput;
      manifest: TargetDocumentationContinuityRequiredOutput;
      projectIndex: TargetDocumentationContinuityRequiredOutput;
    };
  };
  diagnostics: TargetDocumentationContinuityDiagnostic[];
  input: {
    baseline: TargetDocumentationContinuityInputRef;
    current: TargetDocumentationContinuityInputRef;
  };
  permissions: {
    networkAccessed: false;
    packagePublished: false;
    targetAdoptionClaimed: false;
    targetArtifactBodyRead: false;
    targetBranchOrPrCreated: false;
    targetCommandExecuted: false;
    targetRepositoryWrite: false;
    targetRuntimeOpened: false;
    targetSourceBodyRead: false;
  };
  privacy: {
    artifactBodySerialized: false;
    entryIdsSerialized: false;
    pathSerialized: false;
    producerIdsSerialized: false;
    sourceBodySerialized: false;
    workingStateSerialized: false;
  };
  semantics: {
    confidence: "caller-provided-unverified";
    provenance: "metadata-only-comparison";
    resolution: "evidence-summary-pair-validated" | "unresolved";
  };
  status: "accepted" | "refused";
  target: {
    family: TargetDocumentationContinuityFamily | "invalid";
    id: string;
  };
}

/** @lang zh-CN report 中不反射 input body 的 contract/status 引用。 @lang en Body-free contract/status reference used by the report. */
export interface TargetDocumentationContinuityInputRef {
  contract: "hia-generated-docs-evidence-summary" | "invalid";
  contractVersion: "0.1.0-draft" | "invalid";
  status: "ready" | "incomplete" | "invalid";
}

/**
 * @lang zh-CN `target-documentation-continuity@0.1.0-draft` 的 CLI owner-local Draft 2020-12 JSON Schema。
 * @lang en CLI owner-local Draft 2020-12 JSON Schema for `target-documentation-continuity@0.1.0-draft`.
 */
export const TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID,
  title: "Target Documentation Continuity Report / 目标文档连续性报告",
  description: "CLI-owned metadata-only comparison of two exact generated-documentation evidence summaries. / 由 CLI 持有、只比较两份精确生成文档证据摘要的 metadata-only 报告。",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "target", "input", "continuity", "semantics", "privacy", "permissions", "diagnostics"],
  properties: {
    contract: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT },
    contractVersion: { const: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION },
    status: { enum: ["accepted", "refused"] },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["family", "id"],
      properties: {
        family: { enum: ["enterprise-business", "invalid"] },
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" }
      }
    },
    input: {
      type: "object",
      additionalProperties: false,
      required: ["baseline", "current"],
      properties: {
        baseline: { $ref: "#/$defs/inputRef" },
        current: { $ref: "#/$defs/inputRef" }
      }
    },
    continuity: {
      type: "object",
      additionalProperties: false,
      required: ["entries", "requiredOutputs", "producers", "privacy"],
      properties: {
        entries: {
          type: "object",
          additionalProperties: false,
          required: ["baselineCount", "currentCount", "unchangedCount", "addedCount", "removedCount"],
          properties: {
            baselineCount: { $ref: "#/$defs/count" },
            currentCount: { $ref: "#/$defs/count" },
            unchangedCount: { $ref: "#/$defs/count" },
            addedCount: { $ref: "#/$defs/count" },
            removedCount: { $ref: "#/$defs/count" }
          }
        },
        requiredOutputs: {
          type: "object",
          additionalProperties: false,
          required: ["allPreserved", "indexHtml", "manifest", "projectIndex"],
          properties: {
            allPreserved: { type: "boolean" },
            indexHtml: { $ref: "#/$defs/requiredOutput" },
            manifest: { $ref: "#/$defs/requiredOutput" },
            projectIndex: { $ref: "#/$defs/requiredOutput" }
          }
        },
        producers: {
          type: "object",
          additionalProperties: false,
          required: ["baseline", "current", "identity", "successPreserved", "artifactCountNonDecreasing"],
          properties: {
            baseline: { $ref: "#/$defs/producerSummary" },
            current: { $ref: "#/$defs/producerSummary" },
            identity: {
              type: "object",
              additionalProperties: false,
              required: ["unchangedCount", "addedCount", "removedCount"],
              properties: {
                unchangedCount: { $ref: "#/$defs/count" },
                addedCount: { $ref: "#/$defs/count" },
                removedCount: { $ref: "#/$defs/count" }
              }
            },
            successPreserved: { type: "boolean" },
            artifactCountNonDecreasing: { type: "boolean" }
          }
        },
        privacy: {
          type: "object",
          additionalProperties: false,
          required: ["baselineCompatible", "currentCompatible", "continuityPreserved"],
          properties: {
            baselineCompatible: { type: "boolean" },
            currentCompatible: { type: "boolean" },
            continuityPreserved: { type: "boolean" }
          }
        }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: ["evidence-summary-pair-validated", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "metadata-only-comparison" }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["entryIdsSerialized", "producerIdsSerialized", "sourceBodySerialized", "artifactBodySerialized", "pathSerialized", "workingStateSerialized"],
      properties: {
        entryIdsSerialized: { const: false },
        producerIdsSerialized: { const: false },
        sourceBodySerialized: { const: false },
        artifactBodySerialized: { const: false },
        pathSerialized: { const: false },
        workingStateSerialized: { const: false }
      }
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: ["targetCommandExecuted", "targetRepositoryWrite", "targetRuntimeOpened", "targetBranchOrPrCreated", "targetSourceBodyRead", "targetArtifactBodyRead", "networkAccessed", "packagePublished", "targetAdoptionClaimed"],
      properties: {
        targetCommandExecuted: { const: false },
        targetRepositoryWrite: { const: false },
        targetRuntimeOpened: { const: false },
        targetBranchOrPrCreated: { const: false },
        targetSourceBodyRead: { const: false },
        targetArtifactBodyRead: { const: false },
        networkAccessed: { const: false },
        packagePublished: { const: false },
        targetAdoptionClaimed: { const: false }
      }
    },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { enum: TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES },
          message: { type: "string", minLength: 1 },
          severity: { const: "error" }
        }
      }
    }
  },
  allOf: [
    {
      if: {
        properties: { status: { const: "accepted" } },
        required: ["status"]
      },
      then: {
        properties: {
          target: {
            properties: { family: { const: "enterprise-business" } },
            required: ["family"]
          },
          semantics: {
            properties: { resolution: { const: "evidence-summary-pair-validated" } },
            required: ["resolution"]
          },
          diagnostics: { maxItems: 0 }
        }
      }
    },
    {
      if: {
        properties: { status: { const: "refused" } },
        required: ["status"]
      },
      then: {
        properties: {
          semantics: {
            properties: { resolution: { const: "unresolved" } },
            required: ["resolution"]
          },
          diagnostics: { minItems: 1 }
        }
      }
    }
  ],
  $defs: {
    count: { type: "integer", minimum: 0 },
    inputRef: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "status"],
      properties: {
        contract: { enum: ["hia-generated-docs-evidence-summary", "invalid"] },
        contractVersion: { enum: ["0.1.0-draft", "invalid"] },
        status: { enum: ["ready", "incomplete", "invalid"] }
      }
    },
    requiredOutput: {
      type: "object",
      additionalProperties: false,
      required: ["baseline", "current", "preserved"],
      properties: {
        baseline: { type: "boolean" },
        current: { type: "boolean" },
        preserved: { type: "boolean" }
      }
    },
    producerSummary: {
      type: "object",
      additionalProperties: false,
      required: ["producerCount", "successfulProducerCount", "artifactCount"],
      properties: {
        producerCount: { $ref: "#/$defs/count" },
        successfulProducerCount: { $ref: "#/$defs/count" },
        artifactCount: { $ref: "#/$defs/count" }
      }
    }
  }
} as const;

/** @lang zh-CN evaluator 内部使用的三项 required output。 @lang en Three required outputs used internally by the evaluator. */
interface NormalizedRequiredOutputs {
  indexHtml: boolean;
  manifest: boolean;
  projectIndex: boolean;
}

/** @lang zh-CN evaluator 内部的 producer metadata；id 从不进入 report。 @lang en Internal producer metadata; IDs never enter the report. */
interface NormalizedProducer {
  artifactCount: number;
  id: string;
  status: string;
}

/** @lang zh-CN 已安全规范化的 evidence summary 中间表示。 @lang en Safely normalized intermediate representation of an evidence summary. */
interface NormalizedEvidenceSummary {
  contractValid: boolean;
  entryIds: string[];
  entryIdentityValid: boolean;
  forbiddenActionClaim: boolean;
  forbiddenPayload: boolean;
  inputRef: TargetDocumentationContinuityInputRef;
  privacyCompatible: boolean;
  producerCompatibilityValid: boolean;
  producers: NormalizedProducer[];
  ready: boolean;
  requiredOutputs: NormalizedRequiredOutputs;
  shapeValid: boolean;
}

/**
 * @lang zh-CN 比较两份 exact generated-docs summary，构建确定且 public-safe 的 continuity report。
 * @lang en Compares two exact generated-docs summaries and builds a deterministic, public-safe continuity report.
 *
 * @param request caller 提供的 baseline/current 与 public target identity。 / Caller-provided baseline/current pair and public target identity.
 * @returns 不含 entry/producer id、path 或正文的 accepted/refused report。 / Accepted/refused report containing no entry/producer IDs, paths, or bodies.
 * @lang zh-CN 该函数是 pure evaluator：不读取 filesystem、不执行 producer/target、不访问 network，也不写入任何 repository。
 * @lang en This is a pure evaluator: it reads no filesystem, executes no producer/target, accesses no network, and writes no repository.
 */
export function createTargetDocumentationContinuityReport(
  request: TargetDocumentationContinuityRequest
): TargetDocumentationContinuityReport {
  // <lang><zh-CN>先恢复到 unknown trust boundary，避免 TypeScript interface 让 JavaScript caller 的额外字段绕过 runtime closed-world validation。</zh-CN><en>Return to the unknown trust boundary first so the TypeScript interface cannot let extra JavaScript-caller fields bypass closed-world runtime validation.</en></lang>
  const untrustedRequest: unknown = request;
  // <lang><zh-CN>request 自身也使用 closed-world keys；JavaScript caller 不能借额外字段携带 action/path/body。</zh-CN><en>The request itself uses closed-world keys so JavaScript callers cannot smuggle actions, paths, or bodies through extra fields.</en></lang>
  const requestRecord = isRecord(untrustedRequest) ? untrustedRequest : {};
  // <lang><zh-CN>baseline/current 分别规范化，保持每侧的 contract/shape/readiness/privacy 诊断独立可计算。</zh-CN><en>Normalize baseline and current separately so contract, shape, readiness, and privacy remain independently computable per side.</en></lang>
  const baseline = normalizeEvidenceSummary(requestRecord.baseline);
  const current = normalizeEvidenceSummary(requestRecord.current);
  // <lang><zh-CN>target identity 只允许公开 stable grammar；无效输入替换为固定 sentinel，不反射 caller text。</zh-CN><en>Target identity allows only the public stable grammar; invalid input becomes a fixed sentinel rather than reflecting caller text.</en></lang>
  const targetId = isStableIdentifier(requestRecord.targetId) ? requestRecord.targetId : "invalid-target";
  // <lang><zh-CN>第一轮只接受 enterprise-business，避免把本 contract 未验证地泛化到其它 portfolio。</zh-CN><en>The first slice accepts only enterprise-business, preventing unvalidated generalization to other portfolios.</en></lang>
  const targetFamily = requestRecord.targetFamily === "enterprise-business" ? "enterprise-business" : "invalid";
  // <lang><zh-CN>固定顺序的 diagnostic accumulator 只接收常量 code/message，不接收 summary 中的 string。</zh-CN><en>The fixed-order diagnostic accumulator accepts constant codes/messages only, never strings from a summary.</en></lang>
  const diagnostics: TargetDocumentationContinuityDiagnostic[] = [];

  // <lang><zh-CN>request validity 同时覆盖 exact keys、identity、family 和 request-level action/payload 偷渡。</zh-CN><en>Request validity covers exact keys, identity, family, and request-level action/payload smuggling.</en></lang>
  const requestValid = hasExactKeys(requestRecord, ["baseline", "current", "targetFamily", "targetId"])
    && targetId !== "invalid-target"
    && targetFamily !== "invalid";
  if (!requestValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_REQUEST_INVALID", "Target documentation continuity requires a closed request with a stable target id and enterprise-business family.");
  }
  if (!baseline.contractValid || !current.contractValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_EVIDENCE_CONTRACT_INVALID", "Target documentation continuity requires two exact hia-generated-docs-evidence-summary@0.1.0-draft inputs.");
  }
  if (!baseline.shapeValid || !current.shapeValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_EVIDENCE_SHAPE_INVALID", "Target documentation continuity requires the closed generated-docs evidence summary shape.");
  }
  if (!baseline.ready || !current.ready) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_EVIDENCE_NOT_READY", "Target documentation continuity requires both evidence summaries to be ready.");
  }
  if (!baseline.entryIdentityValid || !current.entryIdentityValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_STABLE_IDENTITY_INVALID", "Target documentation continuity requires non-empty, unique, stable entry identities with matching totals.");
  }

  // <lang><zh-CN>entry set difference 只存在于函数内；report 仅保留计数。</zh-CN><en>Entry set differences exist only inside the function; the report retains counts only.</en></lang>
  const entryDifference = compareIdentifiers(baseline.entryIds, current.entryIds);
  if (baseline.entryIdentityValid && current.entryIdentityValid && entryDifference.removedCount > 0) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_ENTRY_COVERAGE_REGRESSED", "Target documentation continuity refuses removed stable entry coverage.");
  }

  // <lang><zh-CN>required output 必须两侧都存在；preserved 不允许 false->true 掩盖 baseline incomplete。</zh-CN><en>Required outputs must exist on both sides; preserved never lets false-to-true hide an incomplete baseline.</en></lang>
  const requiredOutputs = createRequiredOutputContinuity(baseline.requiredOutputs, current.requiredOutputs);
  if (!requiredOutputs.allPreserved) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_REQUIRED_OUTPUT_REGRESSED", "Target documentation continuity requires index HTML, manifest, and project index on both sides.");
  }
  if (!baseline.producerCompatibilityValid || !current.producerCompatibilityValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_PRODUCER_COMPATIBILITY_INVALID", "Target documentation continuity requires unique successful producer summaries with non-negative artifact counts.");
  }

  // <lang><zh-CN>producer id 仅用于内存 set comparison；聚合后只输出 unchanged/added/removed count。</zh-CN><en>Producer IDs are used only for in-memory set comparison; aggregation outputs unchanged/added/removed counts only.</en></lang>
  const producerDifference = compareIdentifiers(
    baseline.producers.map((producer) => producer.id),
    current.producers.map((producer) => producer.id)
  );
  // <lang><zh-CN>两侧 producer summary 只保留 count/status/artifact count，不保留 producer id。</zh-CN><en>Each producer summary retains counts, statuses, and artifact counts only, never producer IDs.</en></lang>
  const baselineProducerSummary = summarizeProducers(baseline.producers);
  const currentProducerSummary = summarizeProducers(current.producers);
  // <lang><zh-CN>success continuity 要求 baseline/current 全部成功；artifact count 只允许不下降。</zh-CN><en>Success continuity requires all baseline/current producers to succeed; artifact count may only stay level or increase.</en></lang>
  const producerSuccessPreserved = baseline.producerCompatibilityValid && current.producerCompatibilityValid;
  const artifactCountNonDecreasing = currentProducerSummary.artifactCount >= baselineProducerSummary.artifactCount;
  if (producerDifference.removedCount > 0 || !artifactCountNonDecreasing) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_PRODUCER_COVERAGE_REGRESSED", "Target documentation continuity refuses removed producers or a decreased aggregate artifact count.");
  }

  // <lang><zh-CN>privacy continuity 要求两侧都安全；安全 current 不能修饰 unsafe baseline。</zh-CN><en>Privacy continuity requires both sides to be safe; a safe current side cannot sanitize an unsafe baseline.</en></lang>
  const privacyContinuityPreserved = baseline.privacyCompatible && current.privacyCompatible;
  if (!privacyContinuityPreserved || baseline.forbiddenPayload || current.forbiddenPayload || containsForbiddenPayload(requestRecord)) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_PRIVACY_REFUSED", "Target documentation continuity refuses source/artifact bodies, paths, locators, credentials, working state, or unsafe source presentation.");
  }
  // <lang><zh-CN>任何 true action/adoption claim 都单独拒绝；即使 unknown field 也不能只归入 shape error。</zh-CN><en>Any true action/adoption claim is refused independently, even when an unknown field also triggers a shape error.</en></lang>
  if (baseline.forbiddenActionClaim || current.forbiddenActionClaim || containsForbiddenActionClaim(requestRecord)) {
    addDiagnostic(diagnostics, "HIA_TARGET_CONTINUITY_PERMISSION_OR_ADOPTION_REFUSED", "Target documentation continuity refuses target action, network, publish, or adoption claims.");
  }

  // <lang><zh-CN>只有所有维度无 diagnostic 才能声明 pair validated；confidence/provenance 始终保持较弱且独立。</zh-CN><en>Only a diagnostic-free result may claim pair validation; confidence and provenance remain weaker and independent in every status.</en></lang>
  const status = diagnostics.length === 0 ? "accepted" : "refused";
  return {
    contract: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT,
    contractVersion: TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION,
    status,
    target: {
      family: targetFamily,
      id: targetId
    },
    input: {
      baseline: baseline.inputRef,
      current: current.inputRef
    },
    continuity: {
      entries: {
        baselineCount: baseline.entryIds.length,
        currentCount: current.entryIds.length,
        unchangedCount: entryDifference.unchangedCount,
        addedCount: entryDifference.addedCount,
        removedCount: entryDifference.removedCount
      },
      requiredOutputs,
      producers: {
        baseline: baselineProducerSummary,
        current: currentProducerSummary,
        identity: producerDifference,
        successPreserved: producerSuccessPreserved,
        artifactCountNonDecreasing
      },
      privacy: {
        baselineCompatible: baseline.privacyCompatible,
        currentCompatible: current.privacyCompatible,
        continuityPreserved: privacyContinuityPreserved
      }
    },
    semantics: {
      resolution: status === "accepted" ? "evidence-summary-pair-validated" : "unresolved",
      confidence: "caller-provided-unverified",
      provenance: "metadata-only-comparison"
    },
    privacy: {
      entryIdsSerialized: false,
      producerIdsSerialized: false,
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      pathSerialized: false,
      workingStateSerialized: false
    },
    permissions: {
      targetCommandExecuted: false,
      targetRepositoryWrite: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      targetSourceBodyRead: false,
      targetArtifactBodyRead: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false
    },
    diagnostics
  };
}

/**
 * @lang zh-CN 验证 unknown value 是否符合 continuity report 的 closed-world runtime shape。
 * @lang en Validates whether an unknown value conforms to the closed-world runtime shape of a continuity report.
 *
 * @param value unknown report candidate。 / Unknown report candidate.
 * @returns value 是否符合 owner schema 的关键结构、不变量与 deny-all fields。 / Whether value satisfies key owner-schema structure, invariants, and deny-all fields.
 */
export function isTargetDocumentationContinuityReport(value: unknown): value is TargetDocumentationContinuityReport {
  // <lang><zh-CN>顶层先锁定 exact keys/identity；后续 helper 只读取已知 nested records。</zh-CN><en>Lock exact top-level keys and identity first; subsequent helpers read known nested records only.</en></lang>
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "status", "target", "input", "continuity", "semantics", "privacy", "permissions", "diagnostics"])
    || value.contract !== TARGET_DOCUMENTATION_CONTINUITY_CONTRACT
    || value.contractVersion !== TARGET_DOCUMENTATION_CONTINUITY_CONTRACT_VERSION
    || (value.status !== "accepted" && value.status !== "refused")) {
    return false;
  }
  // <lang><zh-CN>identity/input/semantics 各自 closed-world；invalid sentinel 只允许出现在 refused report。</zh-CN><en>Identity, input, and semantics are each closed-world; invalid sentinels are allowed only in refused reports.</en></lang>
  if (!isTargetReportIdentity(value.target)
    || !isInputPair(value.input)
    || !isSemantics(value.semantics)
    || !isContinuity(value.continuity)
    || !isReportPrivacy(value.privacy)
    || !isReportPermissions(value.permissions)
    || !isDiagnostics(value.diagnostics)) {
    return false;
  }
  // <lang><zh-CN>accepted 必须 pair-validated 且无 diagnostic；refused 必须 unresolved 且至少一条 diagnostic。</zh-CN><en>Accepted reports must be pair-validated with no diagnostics; refused reports must be unresolved with at least one diagnostic.</en></lang>
  const semantics = value.semantics as Record<string, unknown>;
  const diagnostics = value.diagnostics as unknown[];
  const target = value.target as Record<string, unknown>;
  const input = value.input as Record<string, unknown>;
  const continuity = value.continuity as Record<string, unknown>;
  return value.status === "accepted"
    ? semantics.resolution === "evidence-summary-pair-validated"
      && diagnostics.length === 0
      && target.family === "enterprise-business"
      && isAcceptedInputPair(input)
      && isAcceptedContinuity(continuity)
    : semantics.resolution === "unresolved" && diagnostics.length > 0;
}

/**
 * @lang zh-CN continuity CLI 所需的最小 IO surface；caller cwd 是唯一允许的显式文件边界。
 * @lang en Minimal IO surface for the continuity CLI; caller cwd is the sole explicit file boundary.
 */
export interface TargetDocumentationContinuityCliIo {
  cwd: string;
  stderr: (message: string) => void;
  stdout: (message: string) => void;
}

/**
 * @lang zh-CN 读取两个 safe-relative evidence JSON 并输出 continuity report；默认 stdout，不发现 target。
 * @lang en Reads two safe-relative evidence JSON files and emits a continuity report; defaults to stdout and discovers no target.
 *
 * @param argv `hia docs continuity` 后的 command arguments。 / Command arguments after `hia docs continuity`.
 * @param io caller 提供的 cwd/stdout/stderr。 / Caller-provided cwd/stdout/stderr.
 * @returns process-style exit code；refused report 返回 1。 / Process-style exit code; a refused report returns 1.
 * @lang zh-CN 唯一 reads 是 caller 明示的 baseline/current；只有显式 safe-relative `--out` 才写 report。
 * @lang en The only reads are caller-explicit baseline/current files; a report is written only for an explicit safe-relative `--out`.
 */
export async function runTargetDocumentationContinuityCommand(
  argv: string[],
  io: TargetDocumentationContinuityCliIo
): Promise<number> {
  // <lang><zh-CN>closed option parser 拒绝 positional、unknown、duplicate 与 missing value。</zh-CN><en>The closed option parser rejects positional, unknown, duplicate, and missing values.</en></lang>
  const parsed = parseOptions(argv, ["--baseline", "--current", "--target-id", "--target-family", "--out"]);
  if (!parsed.valid) {
    io.stderr("[error:HIA_TARGET_CONTINUITY_OPTION_INVALID] docs continuity requires --baseline, --current, --target-id, --target-family, and optional --out values.");
    return 1;
  }
  // <lang><zh-CN>每个 option value 在 await 前固定；避免 Map optional narrowing 跨异步边界失效。</zh-CN><en>Freeze every option value before awaits so Map optional narrowing cannot widen across asynchronous boundaries.</en></lang>
  const baselineRelativePath = parsed.values.get("--baseline");
  const currentRelativePath = parsed.values.get("--current");
  const targetId = parsed.values.get("--target-id");
  const targetFamily = parsed.values.get("--target-family");
  const outputRelativePath = parsed.values.get("--out");
  // <lang><zh-CN>input/output 都必须 safe relative；两侧文件名相同也拒绝，防止无意义 self-comparison 被误当 continuity。</zh-CN><en>Inputs and output must be safe-relative; identical input names are also rejected so a self-comparison cannot masquerade as continuity.</en></lang>
  if (!baselineRelativePath
    || !currentRelativePath
    || !targetId
    || !targetFamily
    || baselineRelativePath === currentRelativePath
    || !isSafeRelativePath(baselineRelativePath)
    || !isSafeRelativePath(currentRelativePath)
    || (outputRelativePath !== undefined && !isSafeRelativePath(outputRelativePath))) {
    io.stderr("[error:HIA_TARGET_CONTINUITY_PATH_INVALID] docs continuity requires distinct safe relative baseline/current paths and a safe relative output path.");
    return 1;
  }
  // <lang><zh-CN>guard 后的 aliases 是后续唯一使用的 path/identity values；它们不会进入 error diagnostic。</zh-CN><en>Post-guard aliases are the only path/identity values used later; they never enter error diagnostics.</en></lang>
  const safeBaselineRelativePath = baselineRelativePath;
  const safeCurrentRelativePath = currentRelativePath;
  const safeTargetId = targetId;
  const safeTargetFamily = targetFamily;

  // <lang><zh-CN>两个 filesystem reads 都由 caller 显式指定；command 不读取 source、HTML、manifest、target root 或 working state。</zh-CN><en>Both filesystem reads are caller-explicit; the command reads no source, HTML, manifest, target root, or working state.</en></lang>
  let baseline: unknown;
  let current: unknown;
  try {
    baseline = JSON.parse(await readFile(path.resolve(io.cwd, safeBaselineRelativePath), "utf8"));
    current = JSON.parse(await readFile(path.resolve(io.cwd, safeCurrentRelativePath), "utf8"));
  } catch {
    io.stderr("[error:HIA_TARGET_CONTINUITY_EVIDENCE_READ_FAILED] docs continuity could not read two valid evidence JSON objects.");
    return 1;
  }
  // <lang><zh-CN>pure evaluator 接收 memory objects；CLI 不预先删除 unknown fields，以便 closed-world validator 明确拒绝。</zh-CN><en>The pure evaluator receives in-memory objects; the CLI does not strip unknown fields, allowing the closed-world validator to refuse them explicitly.</en></lang>
  const report = createTargetDocumentationContinuityReport({
    baseline,
    current,
    targetFamily: safeTargetFamily,
    targetId: safeTargetId
  });
  // <lang><zh-CN>序列化后的 report 已由 pure evaluator 限定为 body/id/path-free 计数；CLI 不附加 input path。</zh-CN><en>The pure evaluator already limits the serialized report to body/ID/path-free counts; the CLI appends no input path.</en></lang>
  const serializedReport = JSON.stringify(report, null, 2);
  if (outputRelativePath) {
    try {
      // <lang><zh-CN>显式 output 只在 caller cwd 内创建 parent 并写入；没有 target-local default。</zh-CN><en>An explicit output creates its parent and writes only within caller cwd; there is no target-local default.</en></lang>
      const outputPath = path.resolve(io.cwd, outputRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serializedReport, "utf8");
      io.stdout(`Generated target documentation continuity report at ${outputRelativePath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_TARGET_CONTINUITY_OUTPUT_WRITE_FAILED] docs continuity could not write the explicit output report.");
      return 1;
    }
  } else {
    io.stdout(serializedReport);
  }
  // <lang><zh-CN>stderr 只输出 report 内固定 message；不输出 target id、文件名或 input value。</zh-CN><en>Stderr emits only fixed report messages, never a target ID, file name, or input value.</en></lang>
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "accepted" ? 0 : 1;
}

/**
 * @lang zh-CN 规范化一份 generated-docs summary，同时保留拒绝维度而不复制正文。
 * @lang en Normalizes one generated-docs summary while preserving refusal dimensions without copying bodies.
 *
 * @param value unknown summary candidate。 / Unknown summary candidate.
 * @returns 只含 counts、booleans 与内存 identity sets 的中间表示。 / Intermediate representation containing only counts, booleans, and in-memory identity sets.
 */
function normalizeEvidenceSummary(value: unknown): NormalizedEvidenceSummary {
  // <lang><zh-CN>非 record 使用空对象并触发 contract/shape/readiness refusal；不抛出 caller value。</zh-CN><en>Non-record inputs use an empty object and trigger contract/shape/readiness refusal without throwing caller data.</en></lang>
  const evidence = isRecord(value) ? value : {};
  // <lang><zh-CN>contract/version exact-match 与结构校验分开，防止 future draft 只得到笼统 shape error。</zh-CN><en>Contract/version exact matching is separate from structural validation so a future draft receives more than a generic shape error.</en></lang>
  const contractValid = evidence.contract === "hia-generated-docs-evidence-summary"
    && evidence.contractVersion === "0.1.0-draft";
  // <lang><zh-CN>closed-world shape 锁定当前真实 CLI summary 的 10 个字段与关键 nested shape。</zh-CN><en>The closed-world shape locks the ten fields and key nested shapes of the current real CLI summary.</en></lang>
  const shapeValid = isEvidenceShape(evidence);
  // <lang><zh-CN>inputRef 只投影 contract/version/status sentinel，不投影 project、entry、producer 或 path。</zh-CN><en>The input reference projects only contract/version/status sentinels, never project, entry, producer, or path data.</en></lang>
  const inputRef: TargetDocumentationContinuityInputRef = {
    contract: evidence.contract === "hia-generated-docs-evidence-summary" ? "hia-generated-docs-evidence-summary" : "invalid",
    contractVersion: evidence.contractVersion === "0.1.0-draft" ? "0.1.0-draft" : "invalid",
    status: evidence.status === "ready" || evidence.status === "incomplete" ? evidence.status : "invalid"
  };
  // <lang><zh-CN>三项 output 缺失时为 false；missing 绝不转为 implicit success。</zh-CN><en>Missing required outputs normalize to false and never become implicit success.</en></lang>
  const requiredOutputs = normalizeRequiredOutputs(evidence.requiredOutputs);
  // <lang><zh-CN>stable ids 经 string filter/sort 供内存集合比较；任何非 string 由 shape/identity 拒绝。</zh-CN><en>Stable IDs are string-filtered and sorted for in-memory set comparison; non-strings are refused by shape/identity checks.</en></lang>
  const entryIds = normalizeStableIds(evidence.entries);
  // <lang><zh-CN>total 必须与原始 stableIds array length 相等，且全部 id unique/stable。</zh-CN><en>Total must equal the raw stable-ID array length, and every ID must be unique and stable.</en></lang>
  const entries = isRecord(evidence.entries) ? evidence.entries : {};
  const rawStableIds = Array.isArray(entries.stableIds) ? entries.stableIds : [];
  const entryIdentityValid = isNonNegativeInteger(entries.total)
    && entries.total === rawStableIds.length
    && entryIds.length > 0
    && entryIds.length === rawStableIds.length
    && new Set(entryIds).size === entryIds.length
    && entryIds.every(isStableIdentifier);
  // <lang><zh-CN>producer normalization 只保留 id/status/artifactCount，供内存差分和聚合。</zh-CN><en>Producer normalization retains only ID, status, and artifact count for in-memory differences and aggregation.</en></lang>
  const producers = normalizeProducers(evidence.producers);
  const rawProducers = Array.isArray(evidence.producers) ? evidence.producers : [];
  const producerIds = producers.map((producer) => producer.id);
  const producerCompatibilityValid = producers.length > 0
    && producers.length === rawProducers.length
    && new Set(producerIds).size === producerIds.length
    && producers.every((producer) => isStableIdentifier(producer.id) && producer.status === "success" && isNonNegativeInteger(producer.artifactCount));
  // <lang><zh-CN>privacy 只判定固定事实；不复制 presentation/path/body。</zh-CN><en>Privacy evaluates fixed facts only and copies no presentation, path, or body.</en></lang>
  const privacyCompatible = isPrivacyCompatible(evidence.privacy);
  return {
    contractValid,
    entryIds,
    entryIdentityValid,
    forbiddenActionClaim: containsForbiddenActionClaim(evidence),
    forbiddenPayload: containsForbiddenPayload(evidence),
    inputRef,
    privacyCompatible,
    producerCompatibilityValid,
    producers,
    ready: evidence.status === "ready",
    requiredOutputs,
    shapeValid
  };
}

/**
 * @lang zh-CN 检查 current generated-docs summary 的 closed-world wire shape。
 * @lang en Checks the closed-world wire shape of the current generated-docs summary.
 *
 * @param evidence 已收窄的 summary record。 / Narrowed summary record.
 * @returns 当前 exact shape 是否完整。 / Whether the current exact shape is complete.
 */
function isEvidenceShape(evidence: Record<string, unknown>): boolean {
  // <lang><zh-CN>顶层 key set 与现有 evidence producer 保持精确同步；unknown extension 必须走新 contract/version。</zh-CN><en>The top-level key set stays exactly synchronized with the current evidence producer; unknown extensions require a new contract/version.</en></lang>
  if (!hasExactKeys(evidence, ["contract", "contractVersion", "status", "requiredOutputs", "project", "entries", "producers", "inputs", "coverage", "privacy", "warnings"])) {
    return false;
  }
  // <lang><zh-CN>各 nested validator 只接受已知 key/type，不验证业务 continuity；业务规则由 evaluator 独立处理。</zh-CN><en>Nested validators accept only known keys/types and do not decide business continuity, which the evaluator handles separately.</en></lang>
  return (evidence.status === "ready" || evidence.status === "incomplete")
    && isRequiredOutputsShape(evidence.requiredOutputs)
    && isProjectShape(evidence.project)
    && isEntriesShape(evidence.entries)
    && isProducersShape(evidence.producers)
    && isInputsShape(evidence.inputs)
    && isCoverageShape(evidence.coverage)
    && isPrivacyShape(evidence.privacy)
    && isWarningsShape(evidence.warnings);
}

/**
 * @lang zh-CN 校验 requiredOutputs exact shape。
 * @lang en Validates the exact requiredOutputs shape.
 * @param value unknown required-output candidate。 / Unknown required-output candidate.
 * @returns 三项 boolean 字段是否精确存在。 / Whether all three Boolean fields exist exactly.
 */
function isRequiredOutputsShape(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["indexHtml", "manifest", "projectIndex"])
    && [value.indexHtml, value.manifest, value.projectIndex].every((item) => typeof item === "boolean");
}

/**
 * @lang zh-CN 校验 optional project name/version metadata。
 * @lang en Validates optional project name/version metadata.
 * @param value unknown project metadata candidate。 / Unknown project-metadata candidate.
 * @returns candidate 是否只含可选非空 name/version。 / Whether the candidate contains only optional non-empty name/version fields.
 */
function isProjectShape(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, ["name", "version"])
    && (value.name === undefined || isNonEmptyString(value.name))
    && (value.version === undefined || isNonEmptyString(value.version));
}

/**
 * @lang zh-CN 校验 entries counts/maps/stableIds shape；identity 不变量另行检查。
 * @lang en Validates entries counts/maps/stableIds shape; identity invariants are checked separately.
 * @param value unknown entries candidate。 / Unknown entries candidate.
 * @returns closed entries wire shape 是否成立。 / Whether the closed entries wire shape is valid.
 */
function isEntriesShape(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["total", "stableIds", "byView", "byKind", "byProfile"])
    && isNonNegativeInteger(value.total)
    && Array.isArray(value.stableIds)
    && value.stableIds.every((item) => typeof item === "string")
    && isCountMap(value.byView)
    && isCountMap(value.byKind)
    && isCountMap(value.byProfile);
}

/**
 * @lang zh-CN 校验 producer item exact shape，不决定 success continuity。
 * @lang en Validates exact producer-item shape without deciding success continuity.
 * @param value unknown producer array candidate。 / Unknown producer-array candidate.
 * @returns 每个 producer item 是否为 closed metadata shape。 / Whether every producer item has the closed metadata shape.
 */
function isProducersShape(value: unknown): boolean {
  return Array.isArray(value) && value.every((producer) => isRecord(producer)
    && hasExactKeys(producer, ["id", "status", "artifactCount"])
    && typeof producer.id === "string"
    && typeof producer.status === "string"
    && isNonNegativeInteger(producer.artifactCount));
}

/**
 * @lang zh-CN 校验 evidence input metadata；source 是固定来源枚举，不是 source path。
 * @lang en Validates evidence input metadata; source is a fixed provenance enum, not a source path.
 * @param value unknown input metadata array。 / Unknown input-metadata array.
 * @returns items 是否只含允许的 metadata fields/values。 / Whether items contain only allowed metadata fields and values.
 */
function isInputsShape(value: unknown): boolean {
  return Array.isArray(value) && value.every((input) => isRecord(input)
    && hasOnlyKeys(input, ["kind", "source", "producerId", "artifactPolicy"])
    && isNonEmptyString(input.kind)
    && (input.source === undefined || input.source === "manifest" || input.source === "producer" || input.source === "producer-result")
    && (input.producerId === undefined || isNonEmptyString(input.producerId))
    && (input.artifactPolicy === undefined || input.artifactPolicy === "all" || input.artifactPolicy === "relations-only"));
}

/**
 * @lang zh-CN 校验七项 coverage count。
 * @lang en Validates the seven coverage counts.
 * @param value unknown coverage candidate。 / Unknown coverage candidate.
 * @returns 七项 closed non-negative count 是否成立。 / Whether the seven closed non-negative counts are valid.
 */
function isCoverageShape(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["dotnetEntries", "jsEntries", "htmlEntries", "cssEntries", "markupEntries", "powershellEntries", "surfaceEntries"])
    && Object.values(value).every(isNonNegativeInteger);
}

/**
 * @lang zh-CN 校验 privacy fact shape；安全性由独立 helper 判断。
 * @lang en Validates privacy-fact shape; a separate helper decides safety.
 * @param value unknown privacy-fact candidate。 / Unknown privacy-fact candidate.
 * @returns 当前 evidence privacy wire shape 是否成立。 / Whether the current evidence privacy wire shape is valid.
 */
function isPrivacyShape(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["sourcePresentation", "sourcesContentPolicy", "sourcesContentPresent", "sourceBodyPresent", "absolutePathLikeStringCount"])
    && (value.sourcePresentation === "none" || value.sourcePresentation === "link" || value.sourcePresentation === "embed" || value.sourcePresentation === "fetch")
    && (value.sourcesContentPolicy === "none" || value.sourcesContentPolicy === "explicit-embed")
    && typeof value.sourcesContentPresent === "boolean"
    && typeof value.sourceBodyPresent === "boolean"
    && isNonNegativeInteger(value.absolutePathLikeStringCount);
}

/**
 * @lang zh-CN 校验 warning summary 的两个 boolean。
 * @lang en Validates the two warning-summary booleans.
 * @param value unknown warning summary。 / Unknown warning summary.
 * @returns closed warning shape 是否成立。 / Whether the closed warning shape is valid.
 */
function isWarningsShape(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["classificationArtifactPresent", "buildWarningGateReady"])
    && typeof value.classificationArtifactPresent === "boolean"
    && typeof value.buildWarningGateReady === "boolean";
}

/**
 * @lang zh-CN 把 required output candidate 规范为固定 booleans。
 * @lang en Normalizes a required-output candidate to fixed booleans.
 * @param value unknown required-output candidate。 / Unknown required-output candidate.
 * @returns exact-true normalized output flags。 / Exact-true normalized output flags.
 */
function normalizeRequiredOutputs(value: unknown): NormalizedRequiredOutputs {
  // <lang><zh-CN>record guard 后逐字段 exact true；unknown/missing/false 都不会成为 success。</zh-CN><en>After the record guard, each field requires exact true; unknown, missing, and false never become success.</en></lang>
  const outputs = isRecord(value) ? value : {};
  return {
    indexHtml: outputs.indexHtml === true,
    manifest: outputs.manifest === true,
    projectIndex: outputs.projectIndex === true
  };
}

/**
 * @lang zh-CN 提取 entry stable ids 的内存副本。
 * @lang en Extracts an in-memory copy of entry stable IDs.
 * @param value unknown entries candidate。 / Unknown entries candidate.
 * @returns filtered、deterministically sorted in-memory IDs。 / Filtered, deterministically sorted in-memory IDs.
 */
function normalizeStableIds(value: unknown): string[] {
  // <lang><zh-CN>filter 后排序只服务 deterministic set math；report 永远不返回该 array。</zh-CN><en>Filtering and sorting serve deterministic set math only; the report never returns this array.</en></lang>
  const entries = isRecord(value) ? value : {};
  const stableIds = Array.isArray(entries.stableIds) ? entries.stableIds : [];
  return stableIds.filter((item): item is string => typeof item === "string").slice().sort((left, right) => left.localeCompare(right, "en"));
}

/**
 * @lang zh-CN 提取 producer 的最小内存表示。
 * @lang en Extracts the minimal in-memory producer representation.
 * @param value unknown producer array。 / Unknown producer array.
 * @returns 只含 id/status/artifactCount 的内存 records。 / In-memory records containing only ID, status, and artifact count.
 */
function normalizeProducers(value: unknown): NormalizedProducer[] {
  // <lang><zh-CN>malformed item 被过滤并由 raw length mismatch 触发 compatibility refusal；不把其值写入 report。</zh-CN><en>Malformed items are filtered and cause compatibility refusal through raw-length mismatch; their values never enter the report.</en></lang>
  const producers = Array.isArray(value) ? value.filter(isRecord) : [];
  return producers.map((producer) => ({
    id: typeof producer.id === "string" ? producer.id : "invalid-producer",
    status: typeof producer.status === "string" ? producer.status : "invalid",
    artifactCount: isNonNegativeInteger(producer.artifactCount) ? producer.artifactCount : 0
  }));
}

/**
 * @lang zh-CN 汇总 producer count/status/artifact，不序列化 identity。
 * @lang en Summarizes producer counts, statuses, and artifacts without serializing identity.
 * @param producers normalized in-memory producer records。 / Normalized in-memory producer records.
 * @returns identity-free producer summary。 / Identity-free producer summary.
 */
function summarizeProducers(producers: NormalizedProducer[]): TargetDocumentationContinuityProducerSummary {
  // <lang><zh-CN>artifactCount 是非负整数之和；invalid item 已在 normalization 中变为 0 并触发 refusal。</zh-CN><en>Artifact count is a sum of non-negative integers; invalid items became zero during normalization and already trigger refusal.</en></lang>
  const artifactCount = producers.reduce((total, producer) => total + producer.artifactCount, 0);
  const successfulProducerCount = producers.filter((producer) => producer.status === "success").length;
  return {
    artifactCount,
    producerCount: producers.length,
    successfulProducerCount
  };
}

/**
 * @lang zh-CN 创建三项 required output continuity。
 * @lang en Creates continuity for the three required outputs.
 * @param baseline baseline output flags。 / Baseline output flags.
 * @param current current output flags。 / Current output flags.
 * @returns per-output 与 aggregate preserved facts。 / Per-output and aggregate preserved facts.
 */
function createRequiredOutputContinuity(
  baseline: NormalizedRequiredOutputs,
  current: NormalizedRequiredOutputs
): TargetDocumentationContinuityReport["continuity"]["requiredOutputs"] {
  // <lang><zh-CN>每项 preserved 表示两侧都存在，不只是 current 未下降。</zh-CN><en>Each preserved flag means presence on both sides, not merely that current did not regress.</en></lang>
  const indexHtml = { baseline: baseline.indexHtml, current: current.indexHtml, preserved: baseline.indexHtml && current.indexHtml };
  const manifest = { baseline: baseline.manifest, current: current.manifest, preserved: baseline.manifest && current.manifest };
  const projectIndex = { baseline: baseline.projectIndex, current: current.projectIndex, preserved: baseline.projectIndex && current.projectIndex };
  return {
    allPreserved: indexHtml.preserved && manifest.preserved && projectIndex.preserved,
    indexHtml,
    manifest,
    projectIndex
  };
}

/**
 * @lang zh-CN 只以 count 表达两个 identity set 的差分。
 * @lang en Expresses the difference between two identity sets using counts only.
 * @param baselineIds baseline in-memory identities。 / Baseline in-memory identities.
 * @param currentIds current in-memory identities。 / Current in-memory identities.
 * @returns added/removed/unchanged counts，不返回 identity。 / Added, removed, and unchanged counts without identities.
 */
function compareIdentifiers(baselineIds: string[], currentIds: string[]): { addedCount: number; removedCount: number; unchangedCount: number } {
  // <lang><zh-CN>Set 只在当前 stack frame 存活；结束后没有 identity 被缓存或序列化。</zh-CN><en>The sets live only in this stack frame; no identity is cached or serialized afterward.</en></lang>
  const baselineSet = new Set(baselineIds);
  const currentSet = new Set(currentIds);
  const unchangedCount = baselineIds.filter((identity) => currentSet.has(identity)).length;
  const addedCount = currentIds.filter((identity) => !baselineSet.has(identity)).length;
  const removedCount = baselineIds.filter((identity) => !currentSet.has(identity)).length;
  return { addedCount, removedCount, unchangedCount };
}

/**
 * @lang zh-CN 判定一侧 privacy facts 是否满足 none/link metadata-only boundary。
 * @lang en Determines whether one side's privacy facts satisfy the none/link metadata-only boundary.
 * @param value unknown privacy-fact candidate。 / Unknown privacy-fact candidate.
 * @returns source/body/path policy 是否安全。 / Whether the source, body, and path policy is safe.
 */
function isPrivacyCompatible(value: unknown): boolean {
  // <lang><zh-CN>unknown value fail closed；`embed`/`fetch` 即使 body flags 为 false 也拒绝。</zh-CN><en>Unknown values fail closed; embed/fetch are refused even when body flags are false.</en></lang>
  const privacy = isRecord(value) ? value : {};
  return (privacy.sourcePresentation === "none" || privacy.sourcePresentation === "link")
    && privacy.sourcesContentPolicy === "none"
    && privacy.sourcesContentPresent === false
    && privacy.sourceBodyPresent === false
    && privacy.absolutePathLikeStringCount === 0;
}

/**
 * @lang zh-CN 深度识别禁止的 body/path/locator/credential/working-state key；允许固定 `*Present` privacy booleans。
 * @lang en Deeply detects prohibited body/path/locator/credential/working-state keys while allowing fixed `*Present` privacy booleans.
 * @param value unknown input subtree。 / Unknown input subtree.
 * @returns 是否发现禁止 payload key。 / Whether a forbidden payload key was found.
 */
function containsForbiddenPayload(value: unknown): boolean {
  // <lang><zh-CN>array 逐项递归，确保 unknown extension 不能通过 nested collection 偷渡。</zh-CN><en>Arrays recurse item by item so unknown extensions cannot smuggle data through nested collections.</en></lang>
  if (Array.isArray(value)) {
    return value.some(containsForbiddenPayload);
  }
  if (!isRecord(value)) {
    return false;
  }
  // <lang><zh-CN>这些 exact keys 表示内容或 locator，而不是已允许的 `sourceBodyPresent`/`sourcesContentPresent` facts。</zh-CN><en>These exact keys represent content or locators, unlike the allowed `sourceBodyPresent`/`sourcesContentPresent` facts.</en></lang>
  const forbiddenKeys = new Set([
    "sourceBody",
    "sourceText",
    "sourceContent",
    "sourcesContent",
    "artifactBody",
    "artifactContent",
    "html",
    "content",
    "contents",
    "path",
    "locator",
    "credential",
    "workingState"
  ]);
  return Object.entries(value).some(([key, item]) => forbiddenKeys.has(key) || containsForbiddenPayload(item));
}

/**
 * @lang zh-CN 深度识别 true target/network/publish/adoption claim。
 * @lang en Deeply detects true target, network, publish, or adoption claims.
 * @param value unknown input subtree。 / Unknown input subtree.
 * @returns 是否发现 exact-true forbidden claim。 / Whether an exact-true forbidden claim was found.
 */
function containsForbiddenActionClaim(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenActionClaim);
  }
  if (!isRecord(value)) {
    return false;
  }
  // <lang><zh-CN>只有 exact true 才表示 action claim；false 仍会因 unknown shape 被拒绝，但不伪报 action 已发生。</zh-CN><en>Only exact true represents an action claim; false still fails unknown-shape validation without falsely claiming an action occurred.</en></lang>
  const forbiddenClaimKeys = new Set([
    "targetCommandExecuted",
    "targetRepositoryWrite",
    "targetRuntimeOpened",
    "targetBranchOrPrCreated",
    "targetSourceBodyRead",
    "targetArtifactBodyRead",
    "networkAccessed",
    "packagePublished",
    "targetAdoptionClaimed"
  ]);
  return Object.entries(value).some(([key, item]) => (forbiddenClaimKeys.has(key) && item === true) || containsForbiddenActionClaim(item));
}

/**
 * @lang zh-CN 向 accumulator 加入一次固定 diagnostic。
 * @lang en Adds one fixed diagnostic to the accumulator exactly once.
 * @param diagnostics mutable fixed-diagnostic accumulator。 / Mutable fixed-diagnostic accumulator.
 * @param code fixed diagnostic code。 / Fixed diagnostic code.
 * @param message fixed public-safe message。 / Fixed public-safe message.
 * @returns 无返回；仅可能追加一次 diagnostic。 / No return value; may append one diagnostic only.
 */
function addDiagnostic(
  diagnostics: TargetDocumentationContinuityDiagnostic[],
  code: TargetDocumentationContinuityDiagnosticCode,
  message: string
): void {
  // <lang><zh-CN>同 code 去重使输出与 input 重复次数无关，避免 side channel。</zh-CN><en>Deduplicating by code makes output independent of input repetition count and avoids a side channel.</en></lang>
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) {
    diagnostics.push({ code, message, severity: "error" });
  }
}

/**
 * @lang zh-CN 解析 closed two-token CLI options。
 * @lang en Parses closed two-token CLI options.
 * @param argv command option/value tokens。 / Command option/value tokens.
 * @param allowedOptions closed option allowlist。 / Closed option allowlist.
 * @returns validity 与唯一 option map。 / Validity and unique option map.
 */
function parseOptions(argv: string[], allowedOptions: string[]): { valid: boolean; values: Map<string, string> } {
  // <lang><zh-CN>Map 保证每个 option 唯一；奇数参数、unknown/duplicate/empty value 全部失败。</zh-CN><en>The map guarantees option uniqueness; odd arguments and unknown, duplicate, or empty values all fail.</en></lang>
  const values = new Map<string, string>();
  if (argv.length % 2 !== 0) {
    return { valid: false, values };
  }
  for (let index = 0; index < argv.length; index += 2) {
    // <lang><zh-CN>每次消费 exact option/value pair；不支持 positional fallback。</zh-CN><en>Consume one exact option/value pair at a time with no positional fallback.</en></lang>
    const option = argv[index] ?? "";
    const optionValue = argv[index + 1] ?? "";
    if (!allowedOptions.includes(option) || values.has(option) || optionValue.length === 0) {
      return { valid: false, values };
    }
    values.set(option, optionValue);
  }
  return { valid: true, values };
}

/**
 * @lang zh-CN 验证 caller-explicit evidence/output 的 safe-relative path。
 * @lang en Validates safe-relative paths for caller-explicit evidence and output.
 * @param value unknown path candidate。 / Unknown path candidate.
 * @returns 是否为不含 escape/scheme/absolute prefix 的 relative path。 / Whether it is a relative path with no escape, scheme, or absolute prefix.
 */
function isSafeRelativePath(value: unknown): value is string {
  // <lang><zh-CN>统一 slash 后拒绝 empty、`.`、absolute、UNC/scheme/drive 与任意 `..` segment。</zh-CN><en>After slash normalization, reject empty, `.`, absolute, UNC/scheme/drive, and any `..` segment.</en></lang>
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/") : "";
  return Boolean(normalized)
    && normalized !== "."
    && !normalized.startsWith("/")
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
    && !normalized.split("/").includes("..");
}

/**
 * @lang zh-CN 验证 public stable identifier grammar。
 * @lang en Validates the public stable-identifier grammar.
 * @param value unknown identifier candidate。 / Unknown identifier candidate.
 * @returns 是否为允许的 stable identifier。 / Whether it is an allowed stable identifier.
 */
function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value);
}

/**
 * @lang zh-CN 验证非空 string。
 * @lang en Validates a non-empty string.
 * @param value unknown string candidate。 / Unknown string candidate.
 * @returns 是否为非空 string。 / Whether it is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * @lang zh-CN 验证不 coercing 的非负整数。
 * @lang en Validates a non-negative integer without coercion.
 * @param value unknown count candidate。 / Unknown count candidate.
 * @returns 是否为非负整数。 / Whether it is a non-negative integer.
 */
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * @lang zh-CN 验证 string -> non-negative integer count map。
 * @lang en Validates a string-to-non-negative-integer count map.
 * @param value unknown count-map candidate。 / Unknown count-map candidate.
 * @returns 所有 map values 是否为非负整数。 / Whether all map values are non-negative integers.
 */
function isCountMap(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isNonNegativeInteger);
}

/**
 * @lang zh-CN 把 unknown 收窄为非数组 record。
 * @lang en Narrows an unknown value to a non-array record.
 * @param value unknown candidate。 / Unknown candidate.
 * @returns 是否可作为 record 读取。 / Whether the value can be read as a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * @lang zh-CN 验证 record 的 sorted key set 精确相等。
 * @lang en Validates exact equality of a record's sorted key set.
 * @param value candidate record。 / Candidate record.
 * @param expectedKeys exact expected keys。 / Exact expected keys.
 * @returns key set 是否精确相等。 / Whether the key sets are exactly equal.
 */
function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

/**
 * @lang zh-CN 验证 record 不含 allowlist 外 key。
 * @lang en Validates that a record has no key outside an allowlist.
 * @param value candidate record。 / Candidate record.
 * @param allowedKeys allowed key set。 / Allowed key set.
 * @returns 是否没有 unknown key。 / Whether no unknown key exists.
 */
function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

/**
 * @lang zh-CN 验证 report target identity。
 * @lang en Validates report target identity.
 * @param value unknown target record。 / Unknown target record.
 * @returns target family/id shape 是否成立。 / Whether the target family and ID shape is valid.
 */
function isTargetReportIdentity(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["family", "id"])
    && (value.family === "enterprise-business" || value.family === "invalid")
    && isStableIdentifier(value.id);
}

/**
 * @lang zh-CN 验证 report baseline/current input refs。
 * @lang en Validates report baseline/current input references.
 * @param value unknown input pair。 / Unknown input pair.
 * @returns 两侧 body-free refs 是否为 closed shape。 / Whether both body-free references have the closed shape.
 */
function isInputPair(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["baseline", "current"])
    && isInputRef(value.baseline)
    && isInputRef(value.current);
}

/**
 * @lang zh-CN 验证单个 body-free input ref。
 * @lang en Validates one body-free input reference.
 * @param value unknown input ref。 / Unknown input reference.
 * @returns contract/version/status sentinel shape 是否成立。 / Whether the contract, version, and status sentinel shape is valid.
 */
function isInputRef(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["contract", "contractVersion", "status"])
    && (value.contract === "hia-generated-docs-evidence-summary" || value.contract === "invalid")
    && (value.contractVersion === "0.1.0-draft" || value.contractVersion === "invalid")
    && (value.status === "ready" || value.status === "incomplete" || value.status === "invalid");
}

/**
 * @lang zh-CN 验证 accepted report 的两侧 input 都是 exact ready contract。
 * @lang en Validates that both inputs of an accepted report are the exact ready contract.
 * @param value 已通过 input-pair shape guard 的 record。 / Record that passed the input-pair shape guard.
 * @returns 两侧是否均为 exact ready input。 / Whether both sides are exact ready inputs.
 */
function isAcceptedInputPair(value: Record<string, unknown>): boolean {
  // <lang><zh-CN>isTargetDocumentationContinuityReport 已先完成 input pair shape guard，此处只收紧 accepted semantics。</zh-CN><en>The report guard already established input-pair shape; this helper only tightens accepted semantics.</en></lang>
  const baseline = value.baseline as Record<string, unknown>;
  const current = value.current as Record<string, unknown>;
  return [baseline, current].every((input) => input.contract === "hia-generated-docs-evidence-summary"
    && input.contractVersion === "0.1.0-draft"
    && input.status === "ready");
}

/**
 * @lang zh-CN 验证 report semantics 三维独立 shape。
 * @lang en Validates the independent three-dimensional report-semantics shape.
 * @param value unknown semantics candidate。 / Unknown semantics candidate.
 * @returns resolution/confidence/provenance shape 是否成立。 / Whether the resolution, confidence, and provenance shape is valid.
 */
function isSemantics(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["resolution", "confidence", "provenance"])
    && (value.resolution === "evidence-summary-pair-validated" || value.resolution === "unresolved")
    && value.confidence === "caller-provided-unverified"
    && value.provenance === "metadata-only-comparison";
}

/**
 * @lang zh-CN 验证 continuity 的四个封闭子结构。
 * @lang en Validates the four closed continuity substructures.
 * @param value unknown continuity candidate。 / Unknown continuity candidate.
 * @returns entries/outputs/producers/privacy shape 是否成立。 / Whether the entries, outputs, producers, and privacy shapes are valid.
 */
function isContinuity(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["entries", "requiredOutputs", "producers", "privacy"])) {
    return false;
  }
  return isEntryContinuity(value.entries)
    && isRequiredOutputContinuity(value.requiredOutputs)
    && isProducerContinuity(value.producers)
    && isContinuityPrivacy(value.privacy);
}

/**
 * @lang zh-CN 验证 accepted report 没有 coverage/output/producer/privacy regression。
 * @lang en Validates that an accepted report has no coverage, output, producer, or privacy regression.
 * @param value 已通过 continuity shape guard 的 record。 / Record that passed the continuity shape guard.
 * @returns accepted cross-field invariants 是否全部成立。 / Whether all accepted cross-field invariants hold.
 */
function isAcceptedContinuity(value: Record<string, unknown>): boolean {
  // <lang><zh-CN>closed shape 已由 isContinuity 建立；这里验证跨字段 accepted invariants。</zh-CN><en>The closed shape was established by isContinuity; validate cross-field accepted invariants here.</en></lang>
  const entries = value.entries as Record<string, unknown>;
  const requiredOutputs = value.requiredOutputs as Record<string, unknown>;
  const producers = value.producers as Record<string, unknown>;
  const producerIdentity = producers.identity as Record<string, unknown>;
  const baselineProducers = producers.baseline as { artifactCount: number; producerCount: number; successfulProducerCount: number };
  const currentProducers = producers.current as { artifactCount: number; producerCount: number; successfulProducerCount: number };
  const privacy = value.privacy as Record<string, unknown>;
  return (entries.baselineCount as number) > 0
    && (entries.currentCount as number) > 0
    && entries.baselineCount === (entries.unchangedCount as number) + (entries.removedCount as number)
    && entries.currentCount === (entries.unchangedCount as number) + (entries.addedCount as number)
    && entries.removedCount === 0
    && requiredOutputs.allPreserved === true
    && baselineProducers.producerCount === (producerIdentity.unchangedCount as number) + (producerIdentity.removedCount as number)
    && currentProducers.producerCount === (producerIdentity.unchangedCount as number) + (producerIdentity.addedCount as number)
    && baselineProducers.successfulProducerCount === baselineProducers.producerCount
    && currentProducers.successfulProducerCount === currentProducers.producerCount
    && currentProducers.artifactCount >= baselineProducers.artifactCount
    && producers.successPreserved === true
    && producers.artifactCountNonDecreasing === true
    && producerIdentity.removedCount === 0
    && privacy.continuityPreserved === true;
}

/**
 * @lang zh-CN 验证 entry count-only continuity。
 * @lang en Validates count-only entry continuity.
 * @param value unknown entry-continuity candidate。 / Unknown entry-continuity candidate.
 * @returns 五项 non-negative count shape 是否成立。 / Whether the five non-negative count fields are valid.
 */
function isEntryContinuity(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["baselineCount", "currentCount", "unchangedCount", "addedCount", "removedCount"])
    && Object.values(value).every(isNonNegativeInteger);
}

/**
 * @lang zh-CN 验证三项 required output continuity。
 * @lang en Validates continuity for the three required outputs.
 * @param value unknown required-output continuity candidate。 / Unknown required-output continuity candidate.
 * @returns per-output 与 aggregate facts 是否自洽。 / Whether per-output and aggregate facts are internally consistent.
 */
function isRequiredOutputContinuity(value: unknown): boolean {
  if (!isRecord(value)
    || !hasExactKeys(value, ["allPreserved", "indexHtml", "manifest", "projectIndex"])
    || typeof value.allPreserved !== "boolean"
    || !isRequiredOutput(value.indexHtml)
    || !isRequiredOutput(value.manifest)
    || !isRequiredOutput(value.projectIndex)) {
    return false;
  }
  // <lang><zh-CN>allPreserved 必须与三个逐项 preserved 的 conjunction 一致。</zh-CN><en>allPreserved must equal the conjunction of the three item-level preserved facts.</en></lang>
  const outputs = [value.indexHtml, value.manifest, value.projectIndex] as Array<Record<string, unknown>>;
  return value.allPreserved === outputs.every((output) => output.preserved === true);
}

/**
 * @lang zh-CN 验证一个 required output pair。
 * @lang en Validates one required-output pair.
 * @param value unknown output pair。 / Unknown output pair.
 * @returns baseline/current/preserved booleans 是否自洽。 / Whether baseline, current, and preserved booleans are consistent.
 */
function isRequiredOutput(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["baseline", "current", "preserved"])
    && [value.baseline, value.current, value.preserved].every((item) => typeof item === "boolean")
    && value.preserved === (value.baseline === true && value.current === true);
}

/**
 * @lang zh-CN 验证 producer count-only continuity。
 * @lang en Validates count-only producer continuity.
 * @param value unknown producer-continuity candidate。 / Unknown producer-continuity candidate.
 * @returns producer summaries/identity/trend shape 是否成立。 / Whether producer summaries, identity counts, and trend shape are valid.
 */
function isProducerContinuity(value: unknown): boolean {
  if (!isRecord(value)
    || !hasExactKeys(value, ["baseline", "current", "identity", "successPreserved", "artifactCountNonDecreasing"])
    || !isProducerSummary(value.baseline)
    || !isProducerSummary(value.current)
    || !isProducerIdentityCounts(value.identity)
    || typeof value.successPreserved !== "boolean"
    || typeof value.artifactCountNonDecreasing !== "boolean") {
    return false;
  }
  // <lang><zh-CN>artifact trend 对 accepted/refused 都可由公开 count 重算；identity/success 关系只在 accepted helper 收紧。</zh-CN><en>The artifact trend can be recomputed from public counts for accepted and refused reports; identity and success relationships are tightened only by the accepted helper.</en></lang>
  const baseline = value.baseline as { artifactCount: number; producerCount: number; successfulProducerCount: number };
  const current = value.current as { artifactCount: number; producerCount: number; successfulProducerCount: number };
  return value.artifactCountNonDecreasing === (current.artifactCount >= baseline.artifactCount);
}

/**
 * @lang zh-CN 验证单侧 producer count summary。
 * @lang en Validates one-sided producer count summary.
 * @param value unknown producer summary。 / Unknown producer summary.
 * @returns count/status-count/artifact-count 是否有效。 / Whether producer, successful-producer, and artifact counts are valid.
 */
function isProducerSummary(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["producerCount", "successfulProducerCount", "artifactCount"])
    && Object.values(value).every(isNonNegativeInteger)
    && (value.successfulProducerCount as number) <= (value.producerCount as number);
}

/**
 * @lang zh-CN 验证 producer identity difference counts。
 * @lang en Validates producer identity-difference counts.
 * @param value unknown identity-count candidate。 / Unknown identity-count candidate.
 * @returns added/removed/unchanged 是否为 non-negative counts。 / Whether added, removed, and unchanged are non-negative counts.
 */
function isProducerIdentityCounts(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["unchangedCount", "addedCount", "removedCount"])
    && Object.values(value).every(isNonNegativeInteger);
}

/**
 * @lang zh-CN 验证三项 privacy continuity booleans。
 * @lang en Validates the three privacy-continuity booleans.
 * @param value unknown privacy-continuity candidate。 / Unknown privacy-continuity candidate.
 * @returns 两侧 compatibility 与 aggregate fact 是否自洽。 / Whether both compatibility sides and the aggregate fact are consistent.
 */
function isContinuityPrivacy(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["baselineCompatible", "currentCompatible", "continuityPreserved"])
    && Object.values(value).every((item) => typeof item === "boolean")
    && value.continuityPreserved === (value.baselineCompatible === true && value.currentCompatible === true);
}

/**
 * @lang zh-CN 验证 report-level deny-all serialization boundary。
 * @lang en Validates the report-level deny-all serialization boundary.
 * @param value unknown privacy record。 / Unknown privacy record.
 * @returns 六项 serialization facts 是否全部为 false。 / Whether all six serialization facts are false.
 */
function isReportPrivacy(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["entryIdsSerialized", "producerIdsSerialized", "sourceBodySerialized", "artifactBodySerialized", "pathSerialized", "workingStateSerialized"])
    && Object.values(value).every((item) => item === false);
}

/**
 * @lang zh-CN 验证 report-level all-false permission/adoption boundary。
 * @lang en Validates the report-level all-false permission and adoption boundary.
 * @param value unknown permission record。 / Unknown permission record.
 * @returns 九项 permission/adoption facts 是否全部为 false。 / Whether all nine permission and adoption facts are false.
 */
function isReportPermissions(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["targetCommandExecuted", "targetRepositoryWrite", "targetRuntimeOpened", "targetBranchOrPrCreated", "targetSourceBodyRead", "targetArtifactBodyRead", "networkAccessed", "packagePublished", "targetAdoptionClaimed"])
    && Object.values(value).every((item) => item === false);
}

/**
 * @lang zh-CN 验证 fixed diagnostic array，不锁定 message 文案版本。
 * @lang en Validates the fixed diagnostic array without pinning message wording.
 * @param value unknown diagnostic array。 / Unknown diagnostic array.
 * @returns 每项 code/message/severity closed shape 是否成立。 / Whether every item has a valid closed code, message, and severity shape.
 */
function isDiagnostics(value: unknown): boolean {
  return Array.isArray(value) && value.every((diagnostic) => isRecord(diagnostic)
    && hasExactKeys(diagnostic, ["code", "message", "severity"])
    && TARGET_DOCUMENTATION_CONTINUITY_DIAGNOSTIC_CODES.includes(diagnostic.code as TargetDocumentationContinuityDiagnosticCode)
    && isNonEmptyString(diagnostic.message)
    && diagnostic.severity === "error");
}
