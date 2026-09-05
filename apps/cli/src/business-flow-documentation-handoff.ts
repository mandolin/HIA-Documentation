import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_SCHEMA_ID,
  validateBusinessFlowDocumentationProjection,
  type BusinessFlowDocumentationProjection,
  type BusinessFlowDocumentationProjectionSummary
} from "@hia-doc/core";

/**
 * @lang zh-CN 可移植业务流程文档 handoff 的中性 contract 名称；它不绑定 target、Portal DOM 或 renderer layout。
 * @lang en Neutral contract name for a portable business-flow documentation handoff; it binds no target, Portal DOM, or renderer layout.
 */
export const BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT = "business-flow-documentation-handoff" as const;

/** @lang zh-CN handoff 的首个 exact-match 草案版本。 @lang en First exact-match draft version of the handoff. */
export const BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN CLI owner-local schema identity；该 URI 表示 identity，不承诺本轮新增公开 schema 分发项。
 * @lang en CLI owner-local schema identity; the URI denotes identity and does not promise a new public schema distribution entry in this cycle.
 */
export const BUSINESS_FLOW_DOCUMENTATION_HANDOFF_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-handoff-0.1.0-draft.schema.json" as const;

/** @lang zh-CN handoff 固定 diagnostic code；消息不回显输入正文或路径。 @lang en Fixed handoff diagnostic codes whose messages reflect neither input bodies nor paths. */
export const BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES = [
  "HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT",
  "HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID",
  "HIA_BUSINESS_FLOW_HANDOFF_INTEGRITY_INVALID",
  "HIA_BUSINESS_FLOW_HANDOFF_PRIVACY_REFUSED",
  "HIA_BUSINESS_FLOW_HANDOFF_PERMISSION_REFUSED",
  "HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED"
] as const;

/** @lang zh-CN handoff diagnostic code 类型。 @lang en Handoff diagnostic-code type. */
export type BusinessFlowDocumentationHandoffDiagnosticCode =
  typeof BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES[number];

/** @lang zh-CN public-safe、固定消息的 handoff diagnostic。 @lang en Public-safe handoff diagnostic with a fixed message. */
export interface BusinessFlowDocumentationHandoffDiagnostic {
  code: BusinessFlowDocumentationHandoffDiagnosticCode;
  message: string;
  severity: "error";
}

/** @lang zh-CN 嵌入式 projection artifact 的可重算完整性 descriptor。 @lang en Recomputable integrity descriptor for the embedded projection artifact. */
export interface BusinessFlowDocumentationHandoffArtifact {
  byteLength: number;
  contract: typeof BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT;
  contractVersion: typeof BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION;
  digest: {
    algorithm: "sha256";
    value: string;
  };
  mediaType: "application/json";
  serialization: "business-flow-projection-stable-json-v1";
}

/**
 * @lang zh-CN
 * 可交付、可核验的业务流程 projection envelope；ready 只表示可供 owner review，绝不表示 owner 已输入、同意或采用。
 *
 * @lang en
 * Deliverable and verifiable business-flow projection envelope; ready means ready for owner review, never that an owner supplied input, consented, or adopted it.
 */
export interface BusinessFlowDocumentationHandoffReport {
  artifact?: BusinessFlowDocumentationHandoffArtifact;
  compatibility: {
    digestVerification: "required";
    migrationPolicy: "explicit-pure-identity-preserving";
    unknownProperties: "reject";
    versionMatch: "exact";
  };
  contract: typeof BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT;
  contractVersion: typeof BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION;
  diagnostics: BusinessFlowDocumentationHandoffDiagnostic[];
  permissions: {
    networkAccessed: false;
    packagePublished: false;
    targetAdoptionClaimed: false;
    targetCommandExecuted: false;
    targetRepositoryRead: false;
    targetRepositoryWrite: false;
  };
  privacy: {
    absoluteOrPrivatePathSerialized: false;
    credentialSerialized: false;
    nonPublicTopologySerialized: false;
    ownerIdentitySerialized: false;
    runtimePayloadSerialized: false;
    sourceBodySerialized: false;
    sourceRangeSerialized: false;
    targetIdentitySerialized: false;
  };
  projection?: BusinessFlowDocumentationProjection;
  review: {
    adoption: "not-asserted";
    consent: "not-recorded";
    ownerInput: "not-recorded";
    state: "owner-review-required";
  };
  semantics: {
    confidence: "not-aggregated" | "unresolved";
    provenance: "embedded-public-projection" | "unresolved";
    resolution: "exact-projection-validated" | "unresolved";
  };
  status: "ready-for-owner-review" | "refused";
  summary?: BusinessFlowDocumentationProjectionSummary;
}

/**
 * @lang zh-CN
 * `business-flow-documentation-handoff@0.1.0-draft` 的 CLI owner-local Draft 2020-12 JSON Schema。
 *
 * @lang en
 * CLI owner-local Draft 2020-12 JSON Schema for `business-flow-documentation-handoff@0.1.0-draft`.
 */
export const BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_SCHEMA_ID,
  title: "Business Flow Documentation Handoff",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "review", "semantics", "privacy", "permissions", "compatibility", "diagnostics"],
  properties: {
    contract: { const: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT },
    contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION },
    status: { enum: ["ready-for-owner-review", "refused"] },
    artifact: { $ref: "#/$defs/artifact" },
    projection: { $ref: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_SCHEMA_ID },
    summary: { $ref: "#/$defs/summary" },
    review: { $ref: "#/$defs/review" },
    semantics: { $ref: "#/$defs/semantics" },
    privacy: { $ref: "#/$defs/privacy" },
    permissions: { $ref: "#/$defs/permissions" },
    compatibility: { $ref: "#/$defs/compatibility" },
    diagnostics: {
      type: "array",
      maxItems: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES.length,
      uniqueItems: true,
      items: { $ref: "#/$defs/diagnostic" }
    }
  },
  allOf: [
    {
      if: { properties: { status: { const: "ready-for-owner-review" } }, required: ["status"] },
      then: { required: ["artifact", "projection", "summary"], properties: { diagnostics: { maxItems: 0 } } },
      else: {
        not: { anyOf: [{ required: ["artifact"] }, { required: ["projection"] }, { required: ["summary"] }] },
        properties: { diagnostics: { minItems: 1 } }
      }
    }
  ],
  $defs: {
    artifact: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "mediaType", "serialization", "byteLength", "digest"],
      properties: {
        contract: { const: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT },
        contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION },
        mediaType: { const: "application/json" },
        serialization: { const: "business-flow-projection-stable-json-v1" },
        byteLength: { type: "integer", minimum: 1 },
        digest: {
          type: "object",
          additionalProperties: false,
          required: ["algorithm", "value"],
          properties: {
            algorithm: { const: "sha256" },
            value: { type: "string", pattern: "^[a-f0-9]{64}$" }
          }
        }
      }
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["aiEdges", "aiNodes", "codeBindings", "evidence", "flows", "humanItems"],
      properties: Object.fromEntries(["aiEdges", "aiNodes", "codeBindings", "evidence", "flows", "humanItems"].map((key) => [
        key,
        { type: "integer", minimum: 0 }
      ]))
    },
    review: {
      type: "object",
      additionalProperties: false,
      required: ["state", "ownerInput", "consent", "adoption"],
      properties: {
        state: { const: "owner-review-required" },
        ownerInput: { const: "not-recorded" },
        consent: { const: "not-recorded" },
        adoption: { const: "not-asserted" }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: ["exact-projection-validated", "unresolved"] },
        confidence: { enum: ["not-aggregated", "unresolved"] },
        provenance: { enum: ["embedded-public-projection", "unresolved"] }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["absoluteOrPrivatePathSerialized", "credentialSerialized", "nonPublicTopologySerialized", "ownerIdentitySerialized", "runtimePayloadSerialized", "sourceBodySerialized", "sourceRangeSerialized", "targetIdentitySerialized"],
      properties: Object.fromEntries(["absoluteOrPrivatePathSerialized", "credentialSerialized", "nonPublicTopologySerialized", "ownerIdentitySerialized", "runtimePayloadSerialized", "sourceBodySerialized", "sourceRangeSerialized", "targetIdentitySerialized"].map((key) => [key, { const: false }]))
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: ["networkAccessed", "packagePublished", "targetAdoptionClaimed", "targetCommandExecuted", "targetRepositoryRead", "targetRepositoryWrite"],
      properties: Object.fromEntries(["networkAccessed", "packagePublished", "targetAdoptionClaimed", "targetCommandExecuted", "targetRepositoryRead", "targetRepositoryWrite"].map((key) => [key, { const: false }]))
    },
    compatibility: {
      type: "object",
      additionalProperties: false,
      required: ["digestVerification", "migrationPolicy", "unknownProperties", "versionMatch"],
      properties: {
        digestVerification: { const: "required" },
        migrationPolicy: { const: "explicit-pure-identity-preserving" },
        unknownProperties: { const: "reject" },
        versionMatch: { const: "exact" }
      }
    },
    diagnostic: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "severity"],
      properties: {
        code: { enum: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES },
        message: { type: "string", minLength: 1, maxLength: 240 },
        severity: { const: "error" }
      }
    }
  }
} as const;

/** @lang zh-CN 固定 diagnostic message catalog，避免将不可信值反射到输出。 @lang en Fixed diagnostic message catalog that prevents reflecting untrusted values into output. */
const DIAGNOSTIC_MESSAGES: Record<BusinessFlowDocumentationHandoffDiagnosticCode, string> = {
  HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT: "Business-flow documentation handoff must be a complete closed-world object.",
  HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID: "Business-flow documentation handoff requires an exact public projection.",
  HIA_BUSINESS_FLOW_HANDOFF_INTEGRITY_INVALID: "Business-flow documentation handoff artifact integrity must verify exactly.",
  HIA_BUSINESS_FLOW_HANDOFF_PRIVACY_REFUSED: "Business-flow documentation handoff refuses private identity, path, body, range, runtime, or topology data.",
  HIA_BUSINESS_FLOW_HANDOFF_PERMISSION_REFUSED: "Business-flow documentation handoff grants no target, network, publish, or adoption authority.",
  HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED: "Business-flow documentation handoff draft and compatibility policy must match exactly."
};

/** @lang zh-CN privacy 字段闭集。 @lang en Closed privacy-field set. */
const PRIVACY_FIELDS = [
  "absoluteOrPrivatePathSerialized",
  "credentialSerialized",
  "nonPublicTopologySerialized",
  "ownerIdentitySerialized",
  "runtimePayloadSerialized",
  "sourceBodySerialized",
  "sourceRangeSerialized",
  "targetIdentitySerialized"
] as const;

/** @lang zh-CN permission 字段闭集。 @lang en Closed permission-field set. */
const PERMISSION_FIELDS = [
  "networkAccessed",
  "packagePublished",
  "targetAdoptionClaimed",
  "targetCommandExecuted",
  "targetRepositoryRead",
  "targetRepositoryWrite"
] as const;

/**
 * @lang zh-CN 从 exact public projection 创建 deterministic、target-agnostic owner-review packet。
 * @lang en Creates a deterministic, target-agnostic owner-review packet from an exact public projection.
 * @param value unknown projection candidate。 / Unknown projection candidate.
 * @returns ready packet 或不含 partial payload 的 refused report。 / Ready packet or a refused report without a partial payload.
 */
export function createBusinessFlowDocumentationHandoff(value: unknown): BusinessFlowDocumentationHandoffReport {
  // <lang><zh-CN>先执行 W-P122 owner validator，malformed/private graph 不参与 hash、count 或 handoff。</zh-CN><en>Run the W-P122 owner validator first so malformed or private graphs never participate in hashing, counting, or handoff.</en></lang>
  if (validateBusinessFlowDocumentationProjection(value).length > 0) {
    return deepFreeze(createRefusedReport("HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID"));
  }

  // <lang><zh-CN>detached projection 是 handoff 的唯一 payload；clone 隔离 caller 后续 mutation。</zh-CN><en>The detached projection is the handoff's only payload; cloning isolates subsequent caller mutation.</en></lang>
  const projection = structuredClone(value) as BusinessFlowDocumentationProjection;
  // <lang><zh-CN>stable bytes 同时驱动 byte length 与 digest，consumer 可以原样复算。</zh-CN><en>The same stable bytes drive byte length and digest so consumers can recompute both exactly.</en></lang>
  const serializedProjection = stableJson(projection);
  // <lang><zh-CN>summary 只复述 projection 可验证计数，不引入新的业务事实。</zh-CN><en>The summary repeats only verifiable projection counts and introduces no new business facts.</en></lang>
  const summary = createProjectionSummary(projection);
  // <lang><zh-CN>report 组装完成后递归冻结，保持已核验事实的生命周期不变。</zh-CN><en>The report is deeply frozen after assembly to preserve verified facts throughout its lifetime.</en></lang>
  const report: BusinessFlowDocumentationHandoffReport = {
    artifact: {
      byteLength: Buffer.byteLength(serializedProjection, "utf8"),
      contract: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
      contractVersion: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
      digest: { algorithm: "sha256", value: digestProjection(serializedProjection) },
      mediaType: "application/json",
      serialization: "business-flow-projection-stable-json-v1"
    },
    compatibility: createCompatibility(),
    contract: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION,
    diagnostics: [],
    permissions: createPermissions(),
    privacy: createPrivacy(),
    projection,
    review: createReview(),
    semantics: {
      confidence: "not-aggregated",
      provenance: "embedded-public-projection",
      resolution: "exact-projection-validated"
    },
    status: "ready-for-owner-review",
    summary
  };
  return deepFreeze(report);
}

/**
 * @lang zh-CN 校验 handoff shape、projection、digest/count parity、三维语义、privacy、permissions 与 compatibility。
 * @lang en Validates handoff shape, projection, digest/count parity, three-dimensional semantics, privacy, permissions, and compatibility.
 * @param value unknown handoff candidate。 / Unknown handoff candidate.
 * @returns deterministic public-safe diagnostics；空数组表示 report exact-valid。 / Deterministic public-safe diagnostics; empty means the report is exact-valid.
 */
export function validateBusinessFlowDocumentationHandoff(value: unknown): BusinessFlowDocumentationHandoffDiagnostic[] {
  if (!isRecord(value) || !isTopLevelShape(value)) {
    return [handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT")];
  }

  // <lang><zh-CN>诊断先按校验维度收集，出口再按冻结 catalog 去重排序。</zh-CN><en>Diagnostics are collected by validation dimension, then deduplicated and ordered by the frozen catalog at the exit.</en></lang>
  const diagnostics: BusinessFlowDocumentationHandoffDiagnostic[] = [];
  if (value.contract !== BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT
    || value.contractVersion !== BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION) {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED"));
  }
  if (!isCompatibility(value.compatibility)) {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_COMPATIBILITY_UNSUPPORTED"));
  }
  if (!isAllFalseRecord(value.privacy, PRIVACY_FIELDS)) {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_PRIVACY_REFUSED"));
  }
  if (!isAllFalseRecord(value.permissions, PERMISSION_FIELDS)) {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_PERMISSION_REFUSED"));
  }
  if (!isReview(value.review) || !isSemantics(value.semantics) || !isDiagnostics(value.diagnostics)) {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT"));
  }

  if (value.status === "ready-for-owner-review") {
    if (validateBusinessFlowDocumentationProjection(value.projection).length > 0) {
      diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_INVALID"));
    } else {
      // <lang><zh-CN>owner validator 成功后才能把 unknown 收窄为 exact projection。</zh-CN><en>Only owner-validator success narrows the unknown value to an exact projection.</en></lang>
      const projection = value.projection as BusinessFlowDocumentationProjection;
      // <lang><zh-CN>consumer 重新规范化 bytes，不能信任 producer 提供的 digest。</zh-CN><en>The consumer renormalizes bytes and never trusts a producer-supplied digest.</en></lang>
      const serializedProjection = stableJson(projection);
      // <lang><zh-CN>计数也从嵌入式 projection 重建，防止 detached summary 漂移。</zh-CN><en>Counts are rebuilt from the embedded projection to prevent detached-summary drift.</en></lang>
      const expectedSummary = createProjectionSummary(projection);
      if (!isArtifact(value.artifact)
        || value.artifact.byteLength !== Buffer.byteLength(serializedProjection, "utf8")
        || value.artifact.digest.value !== digestProjection(serializedProjection)
        || !isSummary(value.summary)
        || stableJson(value.summary) !== stableJson(expectedSummary)) {
        diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INTEGRITY_INVALID"));
      }
    }
    if (!isReadySemantics(value.semantics) || !Array.isArray(value.diagnostics) || value.diagnostics.length !== 0) {
      diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT"));
    }
  } else if (value.status === "refused") {
    if (Object.hasOwn(value, "artifact") || Object.hasOwn(value, "projection") || Object.hasOwn(value, "summary")
      || !isRefusedSemantics(value.semantics) || !Array.isArray(value.diagnostics) || value.diagnostics.length === 0) {
      diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT"));
    }
  } else {
    diagnostics.push(handoffDiagnostic("HIA_BUSINESS_FLOW_HANDOFF_INVALID_CONTRACT"));
  }

  // <lang><zh-CN>同一 code 只输出一次，并按冻结 catalog 排序，避免校验路径影响 wire result。</zh-CN><en>Emit each code once and order by the frozen catalog so validation paths cannot affect the wire result.</en></lang>
  // <lang><zh-CN>code set 只保存稳定身份，不保存 caller 值或路径。</zh-CN><en>The code set stores stable identities only, never caller values or paths.</en></lang>
  const codes = new Set(diagnostics.map(({ code }) => code));
  return BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES
    .filter((code) => codes.has(code))
    .map(handoffDiagnostic);
}

/**
 * @lang zh-CN 对 JavaScript/JSON caller 执行 exact runtime guard，并重算嵌入式 projection digest。
 * @lang en Performs an exact runtime guard for JavaScript/JSON callers and recomputes the embedded projection digest.
 * @param value unknown handoff candidate。 / Unknown handoff candidate.
 * @returns 是否完整匹配当前 draft。 / Whether the value exactly matches this draft.
 */
export function isBusinessFlowDocumentationHandoffReport(value: unknown): value is BusinessFlowDocumentationHandoffReport {
  return validateBusinessFlowDocumentationHandoff(value).length === 0;
}

/** @lang zh-CN handoff command 所需最小 IO surface。 @lang en Minimal IO surface required by the handoff command. */
export interface BusinessFlowDocumentationHandoffCliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

/**
 * @lang zh-CN 从 caller cwd 下显式 safe-relative projection 生成 owner-review handoff。
 * @lang en Generates an owner-review handoff from an explicit safe-relative projection under the caller cwd.
 * @param argv handoff command arguments。 / Handoff command arguments.
 * @param io controlled CLI IO。 / Controlled CLI IO.
 * @returns process-style exit code；refused report 返回 1。 / Process-style exit code; a refused report returns 1.
 */
export async function runBusinessFlowDocumentationHandoffCommand(
  argv: string[],
  io: BusinessFlowDocumentationHandoffCliIo
): Promise<number> {
  // <lang><zh-CN>参数解析器仅接受本命令的两个显式 option，拒绝未知或重复 token。</zh-CN><en>The argument parser accepts only this command's two explicit options and rejects unknown or duplicate tokens.</en></lang>
  const options = parseOptions(argv, ["--projection", "--out"]);
  // <lang><zh-CN>projection path 是唯一输入授权，必须保持 caller-relative。</zh-CN><en>The projection path is the sole input authorization and must remain caller-relative.</en></lang>
  const projectionRelativePath = options.values.get("--projection");
  // <lang><zh-CN>output path 可省略；省略时 report 只写 stdout。</zh-CN><en>The output path is optional; when omitted, the report is written only to stdout.</en></lang>
  const outputRelativePath = options.values.get("--out");
  if (!options.valid || !isSafeRelativePath(projectionRelativePath)
    || (outputRelativePath !== undefined && !isSafeRelativePath(outputRelativePath))) {
    io.stderr("[error:HIA_BUSINESS_FLOW_HANDOFF_PATH_INVALID] docs business-flow-handoff requires a safe relative projection path and optional output path.");
    return 1;
  }

  // <lang><zh-CN>读取前保持 unknown，直到 W-P122 validator 完成 closed-world 判定。</zh-CN><en>Keep the payload unknown until the W-P122 validator completes its closed-world decision.</en></lang>
  let projection: unknown;
  try {
    // <lang><zh-CN>只读取 caller 明示 projection；不扫描 manifest、target root、source 或相邻文件。</zh-CN><en>Read only the caller-explicit projection; scan no manifest, target root, source, or adjacent file.</en></lang>
    projection = JSON.parse(await readFile(path.resolve(io.cwd, projectionRelativePath), "utf8"));
  } catch {
    io.stderr("[error:HIA_BUSINESS_FLOW_HANDOFF_PROJECTION_READ_FAILED] docs business-flow-handoff could not read a valid projection JSON object.");
    return 1;
  }

  // <lang><zh-CN>producer 无论 ready/refused 都返回可验证 report；refused 不携带 partial payload。</zh-CN><en>The producer returns a verifiable report for both ready and refused states; refused carries no partial payload.</en></lang>
  const report = createBusinessFlowDocumentationHandoff(projection);
  // <lang><zh-CN>面向文件/终端的表示采用可读 JSON；artifact digest 仍基于内部 stable projection bytes。</zh-CN><en>The file/terminal representation uses readable JSON; the artifact digest still uses internal stable projection bytes.</en></lang>
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputRelativePath) {
    try {
      // <lang><zh-CN>仅在 safe-relative gate 之后解析绝对落盘位置。</zh-CN><en>Resolve the absolute write location only after the safe-relative gate.</en></lang>
      const outputPath = path.resolve(io.cwd, outputRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
      io.stdout(`Generated business-flow documentation handoff at ${outputRelativePath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_BUSINESS_FLOW_HANDOFF_OUTPUT_WRITE_FAILED] docs business-flow-handoff could not write the explicit output report.");
      return 1;
    }
  } else {
    io.stdout(serialized.trimEnd());
  }
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "ready-for-owner-review" ? 0 : 1;
}

/** @lang zh-CN 创建不含 partial payload 的规范 refused report。 @lang en Creates a canonical refused report without a partial payload. */
function createRefusedReport(code: BusinessFlowDocumentationHandoffDiagnosticCode): BusinessFlowDocumentationHandoffReport {
  return {
    compatibility: createCompatibility(),
    contract: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION,
    diagnostics: [handoffDiagnostic(code)],
    permissions: createPermissions(),
    privacy: createPrivacy(),
    review: createReview(),
    semantics: { confidence: "unresolved", provenance: "unresolved", resolution: "unresolved" },
    status: "refused"
  };
}

/** @lang zh-CN 从 projection 的两个视图与共享事实构造 count parity。 @lang en Builds count parity from both projection views and shared facts. */
function createProjectionSummary(projection: BusinessFlowDocumentationProjection): BusinessFlowDocumentationProjectionSummary {
  return {
    aiEdges: projection.sharedFacts.relations.length,
    aiNodes: projection.sharedFacts.nodes.length,
    codeBindings: projection.sharedFacts.codeBindings.length,
    evidence: projection.sharedFacts.evidence.length,
    flows: projection.sharedFacts.flows.length,
    humanItems: projection.humanLinear.flows.reduce((total, flow) => total + flow.items.length, 0)
  };
}

/** @lang zh-CN 创建固定 owner-review 未决事实。 @lang en Creates fixed pending owner-review facts. */
function createReview(): BusinessFlowDocumentationHandoffReport["review"] {
  return { adoption: "not-asserted", consent: "not-recorded", ownerInput: "not-recorded", state: "owner-review-required" };
}

/** @lang zh-CN 创建 fail-closed privacy 声明。 @lang en Creates a fail-closed privacy declaration. */
function createPrivacy(): BusinessFlowDocumentationHandoffReport["privacy"] {
  return {
    absoluteOrPrivatePathSerialized: false,
    credentialSerialized: false,
    nonPublicTopologySerialized: false,
    ownerIdentitySerialized: false,
    runtimePayloadSerialized: false,
    sourceBodySerialized: false,
    sourceRangeSerialized: false,
    targetIdentitySerialized: false
  };
}

/** @lang zh-CN 创建 deny-all target/network/publish 权限事实。 @lang en Creates deny-all target, network, and publish permission facts. */
function createPermissions(): BusinessFlowDocumentationHandoffReport["permissions"] {
  return {
    networkAccessed: false,
    packagePublished: false,
    targetAdoptionClaimed: false,
    targetCommandExecuted: false,
    targetRepositoryRead: false,
    targetRepositoryWrite: false
  };
}

/** @lang zh-CN 创建 exact draft compatibility policy。 @lang en Creates the exact-draft compatibility policy. */
function createCompatibility(): BusinessFlowDocumentationHandoffReport["compatibility"] {
  return {
    digestVerification: "required",
    migrationPolicy: "explicit-pure-identity-preserving",
    unknownProperties: "reject",
    versionMatch: "exact"
  };
}

/** @lang zh-CN 对 W-P122 stable JSON bytes 计算 SHA-256。 @lang en Computes SHA-256 over W-P122 stable JSON bytes. */
function digestProjection(serializedProjection: string): string {
  return createHash("sha256").update(serializedProjection, "utf8").digest("hex");
}

/** @lang zh-CN 生成 key-sorted JSON；本函数不宣称 RFC 8785/JCS conformance。 @lang en Produces key-sorted JSON; this function does not claim RFC 8785/JCS conformance. */
function stableJson(value: unknown): string {
  return JSON.stringify(toStableJsonValue(value));
}

/** @lang zh-CN 递归排序 object key，同时保留 array 的语义顺序。 @lang en Recursively sorts object keys while preserving semantic array order. */
function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStableJsonValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, toStableJsonValue(value[key])]));
}

/** @lang zh-CN 创建不反射 caller data 的 fixed diagnostic。 @lang en Creates a fixed diagnostic that reflects no caller data. */
function handoffDiagnostic(code: BusinessFlowDocumentationHandoffDiagnosticCode): BusinessFlowDocumentationHandoffDiagnostic {
  return { code, message: DIAGNOSTIC_MESSAGES[code], severity: "error" };
}

/** @lang zh-CN 验证 report 顶层 required/optional closed set。 @lang en Validates the report top-level required and optional closed set. */
function isTopLevelShape(value: Record<string, unknown>): boolean {
  // <lang><zh-CN>required/optional 两组共同定义顶层 closed world。</zh-CN><en>The required and optional groups jointly define the top-level closed world.</en></lang>
  const required = ["contract", "contractVersion", "status", "review", "semantics", "privacy", "permissions", "compatibility", "diagnostics"];
  const optional = ["artifact", "projection", "summary"];
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

/** @lang zh-CN 验证 artifact 的 exact identity、media type、serialization 与 digest shape。 @lang en Validates exact artifact identity, media type, serialization, and digest shape. */
function isArtifact(value: unknown): value is BusinessFlowDocumentationHandoffArtifact {
  return isExactRecord(value, ["byteLength", "contract", "contractVersion", "digest", "mediaType", "serialization"])
    && Number.isSafeInteger(value.byteLength) && Number(value.byteLength) > 0
    && value.contract === BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT
    && value.contractVersion === BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION
    && value.mediaType === "application/json"
    && value.serialization === "business-flow-projection-stable-json-v1"
    && isExactRecord(value.digest, ["algorithm", "value"])
    && value.digest.algorithm === "sha256"
    && typeof value.digest.value === "string" && /^[a-f0-9]{64}$/u.test(value.digest.value);
}

/** @lang zh-CN 验证 summary closed shape 与非负安全整数。 @lang en Validates the closed summary shape and non-negative safe integers. */
function isSummary(value: unknown): value is BusinessFlowDocumentationProjectionSummary {
  // <lang><zh-CN>summary field order 与 schema/producer 固定词表一致。</zh-CN><en>The summary-field order matches the schema/producer frozen vocabulary.</en></lang>
  const fields = ["aiEdges", "aiNodes", "codeBindings", "evidence", "flows", "humanItems"];
  return isExactRecord(value, fields) && fields.every((field) => Number.isSafeInteger(value[field]) && Number(value[field]) >= 0);
}

/** @lang zh-CN 验证固定 owner-review 未决状态。 @lang en Validates the fixed pending owner-review state. */
function isReview(value: unknown): value is BusinessFlowDocumentationHandoffReport["review"] {
  return isExactRecord(value, ["adoption", "consent", "ownerInput", "state"])
    && value.adoption === "not-asserted" && value.consent === "not-recorded"
    && value.ownerInput === "not-recorded" && value.state === "owner-review-required";
}

/** @lang zh-CN 验证三维语义基础 closed shape。 @lang en Validates the base closed shape of the three semantic dimensions. */
function isSemantics(value: unknown): value is BusinessFlowDocumentationHandoffReport["semantics"] {
  return isExactRecord(value, ["confidence", "provenance", "resolution"])
    && ["not-aggregated", "unresolved"].includes(String(value.confidence))
    && ["embedded-public-projection", "unresolved"].includes(String(value.provenance))
    && ["exact-projection-validated", "unresolved"].includes(String(value.resolution));
}

/** @lang zh-CN 验证 ready 状态的三维语义组合。 @lang en Validates the ready-state combination of the three semantic dimensions. */
function isReadySemantics(value: unknown): boolean {
  return isSemantics(value) && value.confidence === "not-aggregated"
    && value.provenance === "embedded-public-projection" && value.resolution === "exact-projection-validated";
}

/** @lang zh-CN 验证 refused 状态的三维 unresolved 组合。 @lang en Validates the refused-state unresolved combination of the three semantic dimensions. */
function isRefusedSemantics(value: unknown): boolean {
  return isSemantics(value) && value.confidence === "unresolved"
    && value.provenance === "unresolved" && value.resolution === "unresolved";
}

/** @lang zh-CN 验证 exact compatibility policy。 @lang en Validates the exact compatibility policy. */
function isCompatibility(value: unknown): boolean {
  return isExactRecord(value, ["digestVerification", "migrationPolicy", "unknownProperties", "versionMatch"])
    && value.digestVerification === "required"
    && value.migrationPolicy === "explicit-pure-identity-preserving"
    && value.unknownProperties === "reject"
    && value.versionMatch === "exact";
}

/** @lang zh-CN 验证 diagnostics closed shape、固定 message 与唯一 code。 @lang en Validates closed diagnostics, fixed messages, and unique codes. */
function isDiagnostics(value: unknown): value is BusinessFlowDocumentationHandoffDiagnostic[] {
  if (!Array.isArray(value) || value.length > BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES.length) return false;
  // <lang><zh-CN>局部 set 强制每个 diagnostic code 最多出现一次。</zh-CN><en>The local set enforces at most one occurrence of each diagnostic code.</en></lang>
  const codes = new Set<string>();
  return value.every((diagnostic) => {
    if (!isExactRecord(diagnostic, ["code", "message", "severity"])
      || !BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES.includes(diagnostic.code as BusinessFlowDocumentationHandoffDiagnosticCode)
      || diagnostic.message !== DIAGNOSTIC_MESSAGES[diagnostic.code as BusinessFlowDocumentationHandoffDiagnosticCode]
      || diagnostic.severity !== "error" || codes.has(String(diagnostic.code))) return false;
    codes.add(String(diagnostic.code));
    return true;
  });
}

/** @lang zh-CN 验证字段闭集且所有值严格为 false。 @lang en Validates a closed field set whose values are all strictly false. */
function isAllFalseRecord(value: unknown, fields: readonly string[]): boolean {
  return isExactRecord(value, fields) && fields.every((field) => value[field] === false);
}

/** @lang zh-CN exact record helper。 @lang en Exact-record helper. */
function isExactRecord(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && fields.every((field) => Object.hasOwn(value, field))
    && Object.keys(value).every((field) => fields.includes(field));
}

/** @lang zh-CN plain JSON object guard。 @lang en Plain JSON-object guard. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @lang zh-CN 解析无重复、无未知 token 的 CLI options。 @lang en Parses CLI options with no duplicate or unknown tokens. */
function parseOptions(argv: string[], names: readonly string[]): { valid: boolean; values: Map<string, string> } {
  // <lang><zh-CN>map 同时保存值并检测重复 option；其生命周期只限单次命令。</zh-CN><en>The map stores values and detects duplicate options; its lifetime is limited to one command.</en></lang>
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    // <lang><zh-CN>每轮严格消费 option/value pair，不接受 positional token。</zh-CN><en>Each iteration consumes one strict option/value pair and accepts no positional token.</en></lang>
    const name = argv[index];
    const value = argv[index + 1];
    if (!name || !names.includes(name) || values.has(name) || !value || value.startsWith("--")) {
      return { valid: false, values };
    }
    values.set(name, value);
  }
  return { valid: argv.length % 2 === 0, values };
}

/** @lang zh-CN 限制 caller path 为 cwd 内、非绝对、无 traversal 的相对路径。 @lang en Restricts caller paths to non-absolute, traversal-free paths under cwd. */
function isSafeRelativePath(value: string | undefined): value is string {
  if (!value || path.isAbsolute(value)) return false;
  // <lang><zh-CN>统一 separator 后才能在 Windows/portable input 上执行同一 traversal policy。</zh-CN><en>Normalize separators before applying the same traversal policy to Windows and portable inputs.</en></lang>
  const normalized = value.replaceAll("\\", "/");
  return normalized !== "." && normalized !== ".." && !normalized.startsWith("../") && !normalized.includes("/../");
}

/** @lang zh-CN 递归冻结 JSON-compatible report，防止 consumer 后续改变已核验事实。 @lang en Recursively freezes a JSON-compatible report so consumers cannot mutate verified facts later. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
