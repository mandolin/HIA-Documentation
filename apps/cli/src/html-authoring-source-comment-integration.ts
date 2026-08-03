import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  canonicalizeDocumentationLocale,
  validateDocumentationSourceCommentProjection,
  type DocumentationSourceCommentProjection
} from "@hia-doc/core";

/**
 * @lang zh-CN HTML-authoring source-comment owner verification 的中性 contract 名称。
 * @lang en Neutral contract name for HTML-authoring source-comment owner verification.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT =
  "html-authoring-source-comment-integration-verification" as const;

/**
 * @lang zh-CN 第一轮 exact-match draft；未知版本必须 fail closed。
 * @lang en First exact-match draft; unknown versions must fail closed.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN pure evaluator request 的固定 contract 名称。
 * @lang en Fixed contract name for the pure evaluator request.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_REQUEST_CONTRACT =
  "html-authoring-source-comment-integration-verification-request" as const;

/**
 * @lang zh-CN CLI owner-local schema identity；URI 是 identity，不声明本轮在线发布。
 * @lang en CLI owner-local schema identity; the URI is an identity and does not claim online publication in this slice.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/html-authoring-source-comment-integration-verification-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN 固定 diagnostic 目录；message 不反射 caller body、path 或 identity。
 * @lang en Fixed diagnostic catalogue; messages reflect no caller body, path, or identity.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_DIAGNOSTIC_CODES = [
  "HIA_HTML_AUTHORING_INTEGRATION_REQUEST_INVALID",
  "HIA_HTML_AUTHORING_INTEGRATION_HANDOFF_INVALID",
  "HIA_HTML_AUTHORING_INTEGRATION_PROJECTION_INVALID",
  "HIA_HTML_AUTHORING_INTEGRATION_BINDING_INVALID",
  "HIA_HTML_AUTHORING_INTEGRATION_PRIVACY_REFUSED",
  "HIA_HTML_AUTHORING_INTEGRATION_PERMISSION_REFUSED"
] as const;

/** @lang zh-CN verification diagnostic code。 @lang en Verification diagnostic code. */
export type HtmlAuthoringSourceCommentIntegrationDiagnosticCode =
  typeof HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN W-P80 stable entry 与 W-P96 logical source identity 之间的显式绑定。
 * @lang en Explicit binding between a W-P80 stable entry and a W-P96 logical source identity.
 */
export interface HtmlAuthoringSourceCommentIntegrationBinding {
  docSourceMapEntryId: string;
  documentId: string;
  handoffEntryId: string;
  projectionId: string;
  sourceId: string;
  symbolId: string;
}

/**
 * @lang zh-CN closed-world verification request；handoff/projection 保持 unknown，必须通过 runtime validation 建立信任。
 * @lang en Closed-world verification request; handoff/projection remain unknown and require runtime validation to establish trust.
 */
export interface HtmlAuthoringSourceCommentIntegrationRequest {
  binding: HtmlAuthoringSourceCommentIntegrationBinding;
  contract: typeof HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_REQUEST_CONTRACT;
  contractVersion: typeof HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION;
  handoff: unknown;
  projection: unknown;
}

/** @lang zh-CN 固定、public-safe 的拒绝诊断。 @lang en Fixed, public-safe refusal diagnostic. */
export interface HtmlAuthoringSourceCommentIntegrationDiagnostic {
  code: HtmlAuthoringSourceCommentIntegrationDiagnosticCode;
  message: string;
  severity: "error";
}

/**
 * @lang zh-CN HIA owner-local metadata-only verification report。
 * @lang en HIA owner-local metadata-only verification report.
 */
export interface HtmlAuthoringSourceCommentIntegrationReport {
  binding: HtmlAuthoringSourceCommentIntegrationBinding & { verified: boolean };
  contract: typeof HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT;
  contractVersion: typeof HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION;
  diagnostics: HtmlAuthoringSourceCommentIntegrationDiagnostic[];
  input: {
    handoff: {
      contract: "html-authoring-documentation-handoff" | "invalid";
      contractVersion: "0.1.0-draft" | "invalid";
      status: "accepted" | "refused" | "invalid";
    };
    projection: {
      contract: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT | "invalid";
      contractVersion: typeof DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION | "invalid";
      status: "ready" | "refused" | "invalid";
    };
  };
  locale: {
    canonicalIdentityStable: boolean;
    handoffLocale: string;
    requestedLocale: string;
    resolvedLocales: string[];
  };
  permissions: {
    networkAccessed: false;
    obsidianVaultIntegration: false;
    packagePublished: false;
    sourceReaderImplemented: false;
    targetAdoptionClaimed: false;
    targetCommandExecuted: false;
    targetRepositoryRead: false;
    targetRepositoryWrite: false;
    targetRuntimeOpened: false;
    tauriIpcIntegration: false;
  };
  privacy: {
    mapBodyIncluded: false;
    pathIncluded: false;
    projectedCommentTextIncluded: boolean;
    rawCommentIncluded: false;
    richTextPolicy: "plain-text-only";
    sidecarBodyIncluded: false;
    sourceBodyIncluded: false;
    sourcesContentPolicy: "none";
  };
  semantics: {
    confidence: "owner-contract-verified" | "none";
    provenance: "handoff-plus-structured-comment-projection" | "unresolved";
    resolution: "explicit-binding-validated" | "unresolved";
  };
  status: "accepted" | "refused";
  summary: {
    handoffEntryCount: number;
    projectionEntryCount: number;
    resolvedEntryCount: number;
  };
}

/**
 * @lang zh-CN verification report 的 Draft 2020-12 schema；runtime validator 另行检查 binding 与状态不变量。
 * @lang en Draft 2020-12 schema for verification reports; the runtime validator additionally checks binding and status invariants.
 */
export const HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_SCHEMA_ID,
  title: "HTML Authoring Source Comment Integration Verification / HTML 创作源码注释集成验证",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "input", "binding", "locale", "summary", "semantics", "privacy", "permissions", "diagnostics"],
  properties: {
    contract: { const: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT },
    contractVersion: { const: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION },
    status: { enum: ["accepted", "refused"] },
    input: {
      type: "object",
      additionalProperties: false,
      required: ["handoff", "projection"],
      properties: {
        handoff: { $ref: "#/$defs/handoffRef" },
        projection: { $ref: "#/$defs/projectionRef" }
      }
    },
    binding: {
      type: "object",
      additionalProperties: false,
      required: ["handoffEntryId", "documentId", "symbolId", "sourceId", "docSourceMapEntryId", "projectionId", "verified"],
      properties: {
        handoffEntryId: { $ref: "#/$defs/identityOrInvalid" },
        documentId: { $ref: "#/$defs/identityOrInvalid" },
        symbolId: { $ref: "#/$defs/identityOrInvalid" },
        sourceId: { $ref: "#/$defs/identityOrInvalid" },
        docSourceMapEntryId: { $ref: "#/$defs/identityOrInvalid" },
        projectionId: { $ref: "#/$defs/identityOrInvalid" },
        verified: { type: "boolean" }
      }
    },
    locale: {
      type: "object",
      additionalProperties: false,
      required: ["handoffLocale", "requestedLocale", "resolvedLocales", "canonicalIdentityStable"],
      properties: {
        handoffLocale: { type: "string", minLength: 1 },
        requestedLocale: { type: "string", minLength: 1 },
        resolvedLocales: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
        canonicalIdentityStable: { type: "boolean" }
      }
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["handoffEntryCount", "projectionEntryCount", "resolvedEntryCount"],
      properties: {
        handoffEntryCount: { $ref: "#/$defs/count" },
        projectionEntryCount: { $ref: "#/$defs/count" },
        resolvedEntryCount: { $ref: "#/$defs/count" }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: ["explicit-binding-validated", "unresolved"] },
        confidence: { enum: ["owner-contract-verified", "none"] },
        provenance: { enum: ["handoff-plus-structured-comment-projection", "unresolved"] }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["sourcesContentPolicy", "sourceBodyIncluded", "rawCommentIncluded", "projectedCommentTextIncluded", "mapBodyIncluded", "sidecarBodyIncluded", "pathIncluded", "richTextPolicy"],
      properties: {
        sourcesContentPolicy: { const: "none" },
        sourceBodyIncluded: { const: false },
        rawCommentIncluded: { const: false },
        projectedCommentTextIncluded: { type: "boolean" },
        mapBodyIncluded: { const: false },
        sidecarBodyIncluded: { const: false },
        pathIncluded: { const: false },
        richTextPolicy: { const: "plain-text-only" }
      }
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: ["targetRepositoryRead", "targetRepositoryWrite", "targetCommandExecuted", "targetRuntimeOpened", "tauriIpcIntegration", "obsidianVaultIntegration", "sourceReaderImplemented", "networkAccessed", "packagePublished", "targetAdoptionClaimed"],
      properties: Object.fromEntries([
        "targetRepositoryRead", "targetRepositoryWrite", "targetCommandExecuted", "targetRuntimeOpened", "tauriIpcIntegration",
        "obsidianVaultIntegration", "sourceReaderImplemented", "networkAccessed", "packagePublished", "targetAdoptionClaimed"
      ].map((key) => [key, { const: false }]))
    },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { enum: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_DIAGNOSTIC_CODES },
          message: { type: "string", minLength: 1 },
          severity: { const: "error" }
        }
      }
    }
  },
  allOf: [
    {
      if: { properties: { status: { const: "accepted" } }, required: ["status"] },
      then: {
        properties: {
          input: {
            properties: {
              handoff: {
                properties: {
                  contract: { const: "html-authoring-documentation-handoff" },
                  contractVersion: { const: "0.1.0-draft" },
                  status: { const: "accepted" }
                }
              },
              projection: {
                properties: {
                  contract: { const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT },
                  contractVersion: { const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION },
                  status: { const: "ready" }
                }
              }
            }
          },
          binding: {
            properties: {
              handoffEntryId: { not: { const: "invalid" } }, documentId: { not: { const: "invalid" } },
              symbolId: { not: { const: "invalid" } }, sourceId: { not: { const: "invalid" } },
              docSourceMapEntryId: { not: { const: "invalid" } }, projectionId: { not: { const: "invalid" } },
              verified: { const: true }
            },
            required: ["verified"]
          },
          locale: {
            properties: { canonicalIdentityStable: { const: true }, resolvedLocales: { minItems: 1 } },
            required: ["canonicalIdentityStable", "resolvedLocales"]
          },
          summary: {
            properties: {
              handoffEntryCount: { type: "integer", minimum: 1 },
              projectionEntryCount: { type: "integer", minimum: 1 },
              resolvedEntryCount: { type: "integer", minimum: 1 }
            }
          },
          semantics: {
            properties: {
              resolution: { const: "explicit-binding-validated" },
              confidence: { const: "owner-contract-verified" },
              provenance: { const: "handoff-plus-structured-comment-projection" }
            }
          },
          diagnostics: { maxItems: 0 }
        }
      }
    },
    {
      if: { properties: { status: { const: "refused" } }, required: ["status"] },
      then: {
        properties: {
          binding: { properties: { verified: { const: false } }, required: ["verified"] },
          semantics: {
            properties: { resolution: { const: "unresolved" }, confidence: { const: "none" }, provenance: { const: "unresolved" } }
          },
          diagnostics: { minItems: 1 }
        }
      }
    }
  ],
  $defs: {
    count: { type: "integer", minimum: 0 },
    identityOrInvalid: { type: "string", minLength: 1, maxLength: 256, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    handoffRef: {
      type: "object", additionalProperties: false, required: ["contract", "contractVersion", "status"],
      properties: {
        contract: { enum: ["html-authoring-documentation-handoff", "invalid"] },
        contractVersion: { enum: ["0.1.0-draft", "invalid"] },
        status: { enum: ["accepted", "refused", "invalid"] }
      }
    },
    projectionRef: {
      type: "object", additionalProperties: false, required: ["contract", "contractVersion", "status"],
      properties: {
        contract: { enum: [DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT, "invalid"] },
        contractVersion: { enum: [DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION, "invalid"] },
        status: { enum: ["ready", "refused", "invalid"] }
      }
    }
  }
} as const;

const requestKeys = ["binding", "contract", "contractVersion", "handoff", "projection"] as const;
const bindingKeys = ["docSourceMapEntryId", "documentId", "handoffEntryId", "projectionId", "sourceId", "symbolId"] as const;
const reportKeys = ["binding", "contract", "contractVersion", "diagnostics", "input", "locale", "permissions", "privacy", "semantics", "status", "summary"] as const;
const stableIdentityPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * @lang zh-CN 验证 W-P80 handoff、W-P96 projection 和 explicit stable binding，并生成不复制正文的确定性报告。
 * @lang en Verifies a W-P80 handoff, W-P96 projection, and explicit stable binding, producing a deterministic report that copies no body.
 *
 * @param request caller-provided closed-world integration request。 / Caller-provided closed-world integration request.
 * @returns accepted verification 或 public-safe refused report。 / Accepted verification or a public-safe refused report.
 * @lang zh-CN pure evaluator 不读取 filesystem、不执行 target/host、不访问 network，也不写 artifact。
 * @lang en The pure evaluator reads no filesystem, executes no target/host, accesses no network, and writes no artifact.
 */
export function createHtmlAuthoringSourceCommentIntegrationReport(
  request: HtmlAuthoringSourceCommentIntegrationRequest
): HtmlAuthoringSourceCommentIntegrationReport {
  const untrusted: unknown = request;
  const candidate = isRecord(untrusted) ? untrusted : {};
  const diagnostics: HtmlAuthoringSourceCommentIntegrationDiagnostic[] = [];

  // <lang><zh-CN>request-level exact keys 和 exact draft 首先锁定，防止 path/action/body 通过扩展字段进入 verifier。</zh-CN><en>Request-level exact keys and draft are locked first so paths, actions, or bodies cannot enter through extension fields.</en></lang>
  const requestValid = hasExactKeys(candidate, requestKeys)
    && candidate.contract === HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_REQUEST_CONTRACT
    && candidate.contractVersion === HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION;
  if (!requestValid) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_REQUEST_INVALID", "HTML-authoring integration verification requires one exact closed-world request.");
  }

  const handoff = candidate.handoff;
  const projection = candidate.projection;
  const binding = normalizeBinding(candidate.binding);
  const handoffAccepted = isAcceptedHtmlAuthoringHandoff(handoff);
  const readyProjection = isReadySourceCommentProjection(projection) ? projection : undefined;
  const projectionValid = readyProjection !== undefined;

  if (!handoffAccepted) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_HANDOFF_INVALID", "HTML-authoring integration verification requires one exact accepted W-P80 handoff report.");
  }
  if (!projectionValid) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_PROJECTION_INVALID", "HTML-authoring integration verification requires one exact ready W-P96 source-comment projection.");
  }
  if (!binding) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_BINDING_INVALID", "HTML-authoring integration verification requires one explicit stable identity binding.");
  }
  if (!hasSafeHandoffPrivacy(handoff) || !hasSafeProjectionPrivacy(projection)) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_PRIVACY_REFUSED", "HTML-authoring integration requires none-only source/map privacy and plain-text projection boundaries.");
  }
  if (!hasDenyAllHandoffPermissions(handoff)) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_PERMISSION_REFUSED", "HTML-authoring integration grants no target, host, source-reader, network, publish, or adoption permission.");
  }

  // <lang><zh-CN>entry id 与 doc-source-map entry id 分别校验；二者允许不同，绝不通过 slug 或字符串替换推导。</zh-CN><en>The handoff entry and doc-source-map entry are checked separately; they may differ and are never inferred through slugging or string replacement.</en></lang>
  const explicitBindingMatches = Boolean(binding && handoffAccepted && projectionValid
    && (handoff as AcceptedHandoff).output.stableEntryIds.includes(binding.handoffEntryId)
    && binding.documentId === readyProjection?.source.documentId
    && binding.symbolId === readyProjection?.source.symbolId
    && binding.sourceId === readyProjection?.source.sourceId
    && binding.docSourceMapEntryId === readyProjection?.source.docSourceMapEntryId
    && binding.projectionId === readyProjection?.projectionId);
  if (binding && !explicitBindingMatches) {
    addDiagnostic(diagnostics, "HIA_HTML_AUTHORING_INTEGRATION_BINDING_INVALID", "HTML-authoring integration binding does not match the accepted handoff and ready projection identities.");
  }

  if (diagnostics.length > 0 || !binding || !handoffAccepted || !projectionValid || !explicitBindingMatches) {
    return createRefusedReport(handoff, projection, diagnostics);
  }

  const typedHandoff = handoff as AcceptedHandoff;
  const typedProjection = readyProjection;
  const resolvedLocales = [...new Set(typedProjection.entries
    .map((entry) => entry.resolvedLocale)
    .filter((locale): locale is string => typeof locale === "string"))].sort((left, right) => left.localeCompare(right, "en"));
  const projectedCommentTextIncluded = typedProjection.entries.some((entry) => typeof entry.projectedText === "string");

  return {
    binding: { ...binding, verified: true },
    contract: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT,
    contractVersion: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION,
    diagnostics: [],
    input: {
      handoff: { contract: "html-authoring-documentation-handoff", contractVersion: "0.1.0-draft", status: "accepted" },
      projection: {
        contract: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
        contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
        status: "ready"
      }
    },
    locale: {
      canonicalIdentityStable: typedHandoff.output.locale.changesCanonicalIdentity === false,
      handoffLocale: typedHandoff.output.locale.value,
      requestedLocale: typedProjection.requestedLocale,
      resolvedLocales
    },
    permissions: createPermissionBoundary(),
    privacy: createPrivacyBoundary(projectedCommentTextIncluded),
    semantics: {
      confidence: "owner-contract-verified",
      provenance: "handoff-plus-structured-comment-projection",
      resolution: "explicit-binding-validated"
    },
    status: "accepted",
    summary: {
      handoffEntryCount: typedHandoff.output.entryCount,
      projectionEntryCount: typedProjection.entries.length,
      resolvedEntryCount: typedProjection.entries.filter((entry) => entry.resolution !== "missing").length
    }
  };
}

/**
 * @lang zh-CN runtime-check verification report 的 closed-world shape 与 accepted/refused 跨字段不变量。
 * @lang en Runtime-checks the verification report's closed-world shape and accepted/refused cross-field invariants.
 * @param value unknown report candidate。 / Unknown report candidate.
 * @returns 是否满足 owner report contract。 / Whether the owner report contract is satisfied.
 */
export function isHtmlAuthoringSourceCommentIntegrationReport(
  value: unknown
): value is HtmlAuthoringSourceCommentIntegrationReport {
  if (!isRecord(value)
    || !hasExactKeys(value, reportKeys)
    || value.contract !== HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT
    || value.contractVersion !== HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION
    || (value.status !== "accepted" && value.status !== "refused")
    || !isReportInput(value.input)
    || !isReportBinding(value.binding)
    || !isReportLocale(value.locale)
    || !isReportSummary(value.summary)
    || !isReportSemantics(value.semantics)
    || !isReportPrivacy(value.privacy)
    || !isReportPermissions(value.permissions)
    || !isReportDiagnostics(value.diagnostics)) {
    return false;
  }

  const binding = value.binding as Record<string, unknown>;
  const input = value.input as {
    handoff: Record<string, unknown>;
    projection: Record<string, unknown>;
  };
  const locale = value.locale as Record<string, unknown>;
  const summary = value.summary as {
    handoffEntryCount: number;
    projectionEntryCount: number;
    resolvedEntryCount: number;
  };
  const semantics = value.semantics as Record<string, unknown>;
  const diagnostics = value.diagnostics as unknown[];
  return value.status === "accepted"
    ? binding.verified === true
      && bindingKeys.every((key) => binding[key] !== "invalid")
      && input.handoff.contract === "html-authoring-documentation-handoff"
      && input.handoff.contractVersion === "0.1.0-draft"
      && input.handoff.status === "accepted"
      && input.projection.contract === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT
      && input.projection.contractVersion === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION
      && input.projection.status === "ready"
      && locale.canonicalIdentityStable === true
      && Array.isArray(locale.resolvedLocales) && locale.resolvedLocales.length > 0
      && summary.handoffEntryCount > 0 && summary.projectionEntryCount > 0 && summary.resolvedEntryCount > 0
      && summary.resolvedEntryCount <= summary.projectionEntryCount
      && semantics.resolution === "explicit-binding-validated"
      && semantics.confidence === "owner-contract-verified"
      && semantics.provenance === "handoff-plus-structured-comment-projection"
      && diagnostics.length === 0
    : binding.verified === false
      && semantics.resolution === "unresolved"
      && semantics.confidence === "none"
      && semantics.provenance === "unresolved"
      && diagnostics.length > 0;
}

/** @lang zh-CN integration CLI 最小 IO surface。 @lang en Minimal IO surface for the integration CLI. */
export interface HtmlAuthoringSourceCommentIntegrationCliIo {
  cwd: string;
  stderr: (message: string) => void;
  stdout: (message: string) => void;
}

/**
 * @lang zh-CN 从 caller 明示的一个 safe-relative JSON request 运行 owner verification。
 * @lang en Runs owner verification from one caller-explicit safe-relative JSON request.
 * @param argv `hia docs html-authoring-verify` 后的 arguments。 / Arguments after `hia docs html-authoring-verify`.
 * @param io controlled cwd/stdout/stderr。 / Controlled cwd/stdout/stderr.
 * @returns process-style exit code；refused 为 1。 / Process-style exit code; refused returns 1.
 * @lang zh-CN command 不发现 target；只有 explicit safe-relative `--out` 才写 report。
 * @lang en The command discovers no target and writes a report only for an explicit safe-relative `--out`.
 */
export async function runHtmlAuthoringSourceCommentIntegrationCommand(
  argv: string[],
  io: HtmlAuthoringSourceCommentIntegrationCliIo
): Promise<number> {
  const parsed = parseOptions(argv, ["--request", "--out"]);
  const requestPath = parsed.values.get("--request");
  const outputPath = parsed.values.get("--out");
  if (!parsed.valid || !requestPath || !isSafeRelativePath(requestPath) || (outputPath !== undefined && !isSafeRelativePath(outputPath))) {
    io.stderr("[error:HIA_HTML_AUTHORING_INTEGRATION_OPTION_INVALID] docs html-authoring-verify requires --request and optional --out safe-relative paths.");
    return 1;
  }

  let request: unknown;
  try {
    // <lang><zh-CN>唯一 read 是 caller 明示的 request；command 不读取 HTML/source/map/target root 或 working state。</zh-CN><en>The sole read is the caller-explicit request; the command reads no HTML/source/map/target root or working state.</en></lang>
    request = JSON.parse(await readFile(path.resolve(io.cwd, requestPath), "utf8"));
  } catch {
    io.stderr("[error:HIA_HTML_AUTHORING_INTEGRATION_REQUEST_READ_FAILED] docs html-authoring-verify could not read one valid request JSON object.");
    return 1;
  }

  const report = createHtmlAuthoringSourceCommentIntegrationReport(request as HtmlAuthoringSourceCommentIntegrationRequest);
  const serialized = JSON.stringify(report, null, 2);
  if (outputPath) {
    try {
      // <lang><zh-CN>output 被限定在 invocation cwd 内，且没有 target-local default。</zh-CN><en>The output is confined to the invocation cwd and has no target-local default.</en></lang>
      const absoluteOutputPath = path.resolve(io.cwd, outputPath);
      await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
      await writeFile(absoluteOutputPath, serialized, "utf8");
      io.stdout(`Generated HTML-authoring source-comment integration report at ${outputPath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_HTML_AUTHORING_INTEGRATION_OUTPUT_WRITE_FAILED] docs html-authoring-verify could not write the explicit output report.");
      return 1;
    }
  } else {
    io.stdout(serialized);
  }
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "accepted" ? 0 : 1;
}

/** @lang zh-CN verifier 内部接受的 W-P80 report 最小类型。 @lang en Minimal W-P80 report type accepted internally by the verifier. */
interface AcceptedHandoff {
  output: {
    entryCount: number;
    locale: { changesCanonicalIdentity: false; value: string };
    stableEntryIds: string[];
  };
}

/**
 * @lang zh-CN 检查 W-P80 accepted report 的 exact shape 与 frozen boundary。
 * @lang en Checks the exact shape and frozen boundary of a W-P80 accepted report.
 */
function isAcceptedHtmlAuthoringHandoff(value: unknown): value is AcceptedHandoff {
  if (!isRecord(value) || !hasExactKeys(value, ["adoption", "compatibility", "conformance", "contract", "contractVersion", "diagnostics", "evidenceSemantics", "output", "permissions", "privacy", "producer", "provenance", "status"])) return false;
  if (value.contract !== "html-authoring-documentation-handoff" || value.contractVersion !== "0.1.0-draft" || value.status !== "accepted") return false;
  if (!isRecord(value.output) || !hasExactKeys(value.output, ["entryCount", "id", "locale", "stableEntryIds"]) || !isStableIdentity(value.output.id)
    || !Array.isArray(value.output.stableEntryIds) || value.output.stableEntryIds.length === 0
    || !value.output.stableEntryIds.every(isStableIdentity) || new Set(value.output.stableEntryIds).size !== value.output.stableEntryIds.length
    || value.output.entryCount !== value.output.stableEntryIds.length || !isRecord(value.output.locale)
    || !hasExactKeys(value.output.locale, ["changesCanonicalIdentity", "value"]) || value.output.locale.changesCanonicalIdentity !== false
    || !isCanonicalLocale(value.output.locale.value)) return false;
  if (!matchesExactRecord(value.producer, { id: "htmdoc", status: "success" }, ["id", "status", "version"]) || !isRecord(value.producer) || typeof value.producer.version !== "string") return false;
  if (!matchesExactRecord(value.conformance, { conformant: true, contract: "htmdoc-output-conformance", contractVersion: "0.1.0-draft" })) return false;
  if (!matchesExactRecord(value.provenance, { kind: "metadata-only-owner-projection", ordinaryMapCarriesHandoffModel: false, ordinaryMapLinkage: "explicit-reference-only" })) return false;
  if (!matchesExactRecord(value.compatibility, { localeChangesCanonicalIdentity: false, nativeUi: "not-applicable", sourcePolicy: "none" })) return false;
  if (!matchesExactRecord(value.evidenceSemantics, { confidence: "caller-provided-unverified", provenance: "metadata-only-derived-projection", resolution: "report-contract-validated" })) return false;
  return hasSafeHandoffPrivacy(value) && hasDenyAllHandoffPermissions(value)
    && matchesExactRecord(value.adoption, { targetAdoptionClaimed: false })
    && Array.isArray(value.diagnostics) && value.diagnostics.length === 0;
}

/** @lang zh-CN 组合 W-P96 runtime validator 与 W-P98 ready/non-empty 要求。 @lang en Combines the W-P96 runtime validator with W-P98 ready/non-empty requirements. */
function isReadySourceCommentProjection(value: unknown): value is DocumentationSourceCommentProjection {
  return validateDocumentationSourceCommentProjection(value).length === 0
    && isRecord(value)
    && value.status === "ready"
    && Array.isArray(value.entries)
    && value.entries.length > 0;
}

/** @lang zh-CN 检查 handoff/source-map privacy frozen facts。 @lang en Checks frozen handoff/source-map privacy facts. */
function hasSafeHandoffPrivacy(value: unknown): boolean {
  return isRecord(value) && matchesExactRecord(value.privacy, {
    absolutePathSerialized: false,
    credentialSerialized: false,
    mapBodySerialized: false,
    rawLocatorSerialized: false,
    sidecarBodySerialized: false,
    sourceBodySerialized: false,
    workingStateSerialized: false
  });
}

/** @lang zh-CN 检查 W-P96 projection 的 none-only/raw-free privacy facts。 @lang en Checks W-P96 projection none-only/raw-free privacy facts. */
function hasSafeProjectionPrivacy(value: unknown): boolean {
  return isRecord(value) && isRecord(value.privacy)
    && value.privacy.sourcesContentPolicy === "none"
    && value.privacy.sourceBodyIncluded === false
    && value.privacy.rawCommentIncluded === false
    && value.privacy.richTextPolicy === "plain-text-only";
}

/** @lang zh-CN 检查 handoff 的 deny-all target/host permission facts。 @lang en Checks deny-all target/host permission facts on a handoff. */
function hasDenyAllHandoffPermissions(value: unknown): boolean {
  return isRecord(value) && matchesExactRecord(value.permissions, {
    fetchEnabled: false,
    networkAccessed: false,
    obsidianVaultIntegration: false,
    packagePublished: false,
    sourceReaderImplemented: false,
    targetCommandExecuted: false,
    targetRepositoryRead: false,
    targetRepositoryWrite: false,
    targetRuntimeOpened: false,
    tauriIpcIntegration: false
  }) && matchesExactRecord(value.adoption, { targetAdoptionClaimed: false });
}

/** @lang zh-CN 规范化且不推导 explicit binding。 @lang en Normalizes the explicit binding without deriving any identity. */
function normalizeBinding(value: unknown): HtmlAuthoringSourceCommentIntegrationBinding | undefined {
  if (!isRecord(value) || !hasExactKeys(value, bindingKeys) || !bindingKeys.every((key) => isStableIdentity(value[key]))) return undefined;
  return {
    docSourceMapEntryId: value.docSourceMapEntryId as string,
    documentId: value.documentId as string,
    handoffEntryId: value.handoffEntryId as string,
    projectionId: value.projectionId as string,
    sourceId: value.sourceId as string,
    symbolId: value.symbolId as string
  };
}

/** @lang zh-CN 构造不反射 untrusted identity/body 的 refused report。 @lang en Builds a refused report that reflects no untrusted identity or body. */
function createRefusedReport(
  handoff: unknown,
  projection: unknown,
  diagnostics: HtmlAuthoringSourceCommentIntegrationDiagnostic[]
): HtmlAuthoringSourceCommentIntegrationReport {
  return {
    binding: {
      docSourceMapEntryId: "invalid",
      documentId: "invalid",
      handoffEntryId: "invalid",
      projectionId: "invalid",
      sourceId: "invalid",
      symbolId: "invalid",
      verified: false
    },
    contract: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT,
    contractVersion: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION,
    diagnostics: diagnostics.length > 0 ? diagnostics : [{
      code: "HIA_HTML_AUTHORING_INTEGRATION_REQUEST_INVALID",
      message: "HTML-authoring integration verification requires one exact closed-world request.",
      severity: "error"
    }],
    input: {
      handoff: createHandoffRef(handoff),
      projection: createProjectionRef(projection)
    },
    locale: { canonicalIdentityStable: false, handoffLocale: "und", requestedLocale: "und", resolvedLocales: [] },
    permissions: createPermissionBoundary(),
    privacy: createPrivacyBoundary(false),
    semantics: { confidence: "none", provenance: "unresolved", resolution: "unresolved" },
    status: "refused",
    summary: { handoffEntryCount: 0, projectionEntryCount: 0, resolvedEntryCount: 0 }
  };
}

/** @lang zh-CN 只投影 handoff contract/version/status sentinel。 @lang en Projects only handoff contract/version/status sentinels. */
function createHandoffRef(value: unknown): HtmlAuthoringSourceCommentIntegrationReport["input"]["handoff"] {
  const candidate = isRecord(value) ? value : {};
  return {
    contract: candidate.contract === "html-authoring-documentation-handoff" ? candidate.contract : "invalid",
    contractVersion: candidate.contractVersion === "0.1.0-draft" ? candidate.contractVersion : "invalid",
    status: candidate.status === "accepted" || candidate.status === "refused" ? candidate.status : "invalid"
  };
}

/** @lang zh-CN 只投影 projection contract/version/status sentinel。 @lang en Projects only projection contract/version/status sentinels. */
function createProjectionRef(value: unknown): HtmlAuthoringSourceCommentIntegrationReport["input"]["projection"] {
  const candidate = isRecord(value) ? value : {};
  return {
    contract: candidate.contract === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT ? candidate.contract : "invalid",
    contractVersion: candidate.contractVersion === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION ? candidate.contractVersion : "invalid",
    status: candidate.status === "ready" || candidate.status === "refused" ? candidate.status : "invalid"
  };
}

/** @lang zh-CN 返回固定 privacy boundary，绝不复制 projection text。 @lang en Returns a fixed privacy boundary without copying projection text. */
function createPrivacyBoundary(projectedCommentTextIncluded: boolean): HtmlAuthoringSourceCommentIntegrationReport["privacy"] {
  return {
    mapBodyIncluded: false,
    pathIncluded: false,
    projectedCommentTextIncluded,
    rawCommentIncluded: false,
    richTextPolicy: "plain-text-only",
    sidecarBodyIncluded: false,
    sourceBodyIncluded: false,
    sourcesContentPolicy: "none"
  };
}

/** @lang zh-CN 返回固定 deny-all permission boundary。 @lang en Returns a fixed deny-all permission boundary. */
function createPermissionBoundary(): HtmlAuthoringSourceCommentIntegrationReport["permissions"] {
  return {
    networkAccessed: false,
    obsidianVaultIntegration: false,
    packagePublished: false,
    sourceReaderImplemented: false,
    targetAdoptionClaimed: false,
    targetCommandExecuted: false,
    targetRepositoryRead: false,
    targetRepositoryWrite: false,
    targetRuntimeOpened: false,
    tauriIpcIntegration: false
  };
}

/** @lang zh-CN 按 code 去重并保持固定调用顺序。 @lang en Deduplicates by code while preserving fixed call order. */
function addDiagnostic(
  diagnostics: HtmlAuthoringSourceCommentIntegrationDiagnostic[],
  code: HtmlAuthoringSourceCommentIntegrationDiagnosticCode,
  message: string
): void {
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) diagnostics.push({ code, message, severity: "error" });
}

/** @lang zh-CN closed option parser；拒绝 positional、unknown、duplicate 或 missing value。 @lang en Closed option parser rejecting positional, unknown, duplicate, or missing values. */
function parseOptions(argv: string[], allowed: string[]): { valid: boolean; values: Map<string, string> } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option || !allowed.includes(option) || values.has(option) || !value || value.startsWith("--")) return { valid: false, values };
    values.set(option, value);
  }
  return { valid: argv.length % 2 === 0, values };
}

/** @lang zh-CN 限定 CLI input/output 到 cwd 下的 safe-relative path。 @lang en Confines CLI input/output to safe-relative paths below cwd. */
function isSafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return normalized.length > 0
    && !path.posix.isAbsolute(normalized)
    && !path.win32.isAbsolute(value)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
    && !normalized.split("/").includes("..");
}

/** @lang zh-CN 检查 canonical BCP 47 tag。 @lang en Checks a canonical BCP 47 tag. */
function isCanonicalLocale(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const result = canonicalizeDocumentationLocale(value);
  return Boolean(result && !result.usedLegacyUnderscore && result.canonical === value);
}

/** @lang zh-CN 检查 logical stable identity grammar。 @lang en Checks the logical stable identity grammar. */
function isStableIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256 && stableIdentityPattern.test(value);
}

/** @lang zh-CN 检查 plain record。 @lang en Checks a plain record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** @lang zh-CN 检查 exact key set。 @lang en Checks an exact key set. */
function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

/** @lang zh-CN 检查 exact record keys 与指定常量字段。 @lang en Checks exact record keys and specified constant fields. */
function matchesExactRecord(value: unknown, expected: Record<string, unknown>, keys: readonly string[] = Object.keys(expected)): boolean {
  return isRecord(value) && hasExactKeys(value, keys) && Object.entries(expected).every(([key, item]) => value[key] === item);
}

/** @lang zh-CN runtime-check report input refs。 @lang en Runtime-checks report input references. */
function isReportInput(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["handoff", "projection"])
    && isRecord(value.handoff) && hasExactKeys(value.handoff, ["contract", "contractVersion", "status"])
    && (value.handoff.contract === "html-authoring-documentation-handoff" || value.handoff.contract === "invalid")
    && (value.handoff.contractVersion === "0.1.0-draft" || value.handoff.contractVersion === "invalid")
    && ["accepted", "refused", "invalid"].includes(String(value.handoff.status))
    && isRecord(value.projection) && hasExactKeys(value.projection, ["contract", "contractVersion", "status"])
    && (value.projection.contract === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT || value.projection.contract === "invalid")
    && (value.projection.contractVersion === DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION || value.projection.contractVersion === "invalid")
    && ["ready", "refused", "invalid"].includes(String(value.projection.status));
}

/** @lang zh-CN runtime-check report binding。 @lang en Runtime-checks report binding. */
function isReportBinding(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, [...bindingKeys, "verified"])
    && bindingKeys.every((key) => isStableIdentity(value[key])) && typeof value.verified === "boolean";
}

/** @lang zh-CN runtime-check locale summary。 @lang en Runtime-checks the locale summary. */
function isReportLocale(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["canonicalIdentityStable", "handoffLocale", "requestedLocale", "resolvedLocales"])
    && typeof value.canonicalIdentityStable === "boolean" && isCanonicalLocale(value.handoffLocale) && isCanonicalLocale(value.requestedLocale)
    && Array.isArray(value.resolvedLocales) && value.resolvedLocales.every(isCanonicalLocale)
    && new Set(value.resolvedLocales).size === value.resolvedLocales.length;
}

/** @lang zh-CN runtime-check non-negative summary counts。 @lang en Runtime-checks non-negative summary counts. */
function isReportSummary(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["handoffEntryCount", "projectionEntryCount", "resolvedEntryCount"])
    && Object.values(value).every((item) => Number.isInteger(item) && Number(item) >= 0);
}

/** @lang zh-CN runtime-check 三个独立 semantics 维度。 @lang en Runtime-checks the three independent semantic dimensions. */
function isReportSemantics(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["confidence", "provenance", "resolution"])
    && ["explicit-binding-validated", "unresolved"].includes(String(value.resolution))
    && ["owner-contract-verified", "none"].includes(String(value.confidence))
    && ["handoff-plus-structured-comment-projection", "unresolved"].includes(String(value.provenance));
}

/** @lang zh-CN runtime-check body-free report privacy。 @lang en Runtime-checks body-free report privacy. */
function isReportPrivacy(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, ["mapBodyIncluded", "pathIncluded", "projectedCommentTextIncluded", "rawCommentIncluded", "richTextPolicy", "sidecarBodyIncluded", "sourceBodyIncluded", "sourcesContentPolicy"])
    && value.sourcesContentPolicy === "none" && value.sourceBodyIncluded === false && value.rawCommentIncluded === false
    && value.mapBodyIncluded === false && value.sidecarBodyIncluded === false && value.pathIncluded === false
    && value.richTextPolicy === "plain-text-only" && typeof value.projectedCommentTextIncluded === "boolean";
}

/** @lang zh-CN runtime-check deny-all report permissions。 @lang en Runtime-checks deny-all report permissions. */
function isReportPermissions(value: unknown): boolean {
  const keys = ["networkAccessed", "obsidianVaultIntegration", "packagePublished", "sourceReaderImplemented", "targetAdoptionClaimed", "targetCommandExecuted", "targetRepositoryRead", "targetRepositoryWrite", "targetRuntimeOpened", "tauriIpcIntegration"];
  return isRecord(value) && hasExactKeys(value, keys) && Object.values(value).every((item) => item === false);
}

/** @lang zh-CN runtime-check 固定 diagnostic。 @lang en Runtime-checks fixed diagnostics. */
function isReportDiagnostics(value: unknown): boolean {
  return Array.isArray(value) && value.every((diagnostic) => isRecord(diagnostic)
    && hasExactKeys(diagnostic, ["code", "message", "severity"])
    && HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_DIAGNOSTIC_CODES.includes(diagnostic.code as HtmlAuthoringSourceCommentIntegrationDiagnosticCode)
    && typeof diagnostic.message === "string" && diagnostic.message.length > 0 && diagnostic.severity === "error");
}
