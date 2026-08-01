import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Versioned, CLI-owned report contract for target-project documentation acceptance.
 *
 * 中文：由 CLI 持有、版本化的 target-project documentation acceptance report contract。
 * English: Versioned, CLI-owned report contract for target-project documentation acceptance.
 * @lang zh-CN 这不是 core runtime schema，也不是 target repository 的配置/状态写入格式；它只描述既生成 documentation evidence 的安全验收结论。
 */
export const TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT = "target-documentation-acceptance" as const;

/**
 * Initial draft version for the target-documentation acceptance report.
 *
 * 中文：target-documentation acceptance report 的初始 draft version。
 * English: Initial draft version for the target-documentation acceptance report.
 */
export const TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * The four public portfolio families identified without exposing target-local source details.
 *
 * 中文：在不暴露 target-local source details 的前提下识别出的四个 public portfolio family。
 * English: The four public portfolio families identified without exposing target-local source details.
 */
export const TARGET_DOCUMENTATION_PORTFOLIO_FAMILIES = [
  "unicode-compatible",
  "html-authoring",
  "enterprise-business",
  "workspace-container"
] as const;

/**
 * Stable union for a public target-documentation portfolio family.
 *
 * 中文：public target-documentation portfolio family 的 stable union。
 * English: Stable union for a public target-documentation portfolio family.
 */
export type TargetDocumentationPortfolioFamily = typeof TARGET_DOCUMENTATION_PORTFOLIO_FAMILIES[number];

/**
 * Fixed, public-safe diagnostics for acceptance and refusal reports.
 *
 * 中文：acceptance/refusal report 使用的固定 public-safe diagnostics。
 * English: Fixed, public-safe diagnostics for acceptance and refusal reports.
 * @lang zh-CN message 不插入 target id、path、source text 或 caller-supplied artifact value，避免 report 反向泄漏输入内容。
 */
export const TARGET_DOCUMENTATION_ACCEPTANCE_DIAGNOSTIC_CODES = [
  "HIA_TARGET_ACCEPTANCE_EVIDENCE_CONTRACT_INVALID",
  "HIA_TARGET_ACCEPTANCE_EVIDENCE_INCOMPLETE",
  "HIA_TARGET_ACCEPTANCE_STABLE_IDENTITY_INVALID",
  "HIA_TARGET_ACCEPTANCE_PRODUCER_COMPATIBILITY_INVALID",
  "HIA_TARGET_ACCEPTANCE_PRIVACY_REFUSED"
] as const;

/**
 * Minimal input shape consumed from an already-materialized generated-docs evidence summary.
 *
 * 中文：从已经 materialized 的 generated-docs evidence summary 消费的最小 input shape。
 * English: Minimal input shape consumed from an already-materialized generated-docs evidence summary.
 */
export interface TargetDocumentationEvidenceSummary {
  contract?: unknown;
  contractVersion?: unknown;
  status?: unknown;
  requiredOutputs?: unknown;
  entries?: unknown;
  producers?: unknown;
  privacy?: unknown;
}

/**
 * Pure request for target-documentation acceptance evaluation.
 *
 * 中文：target-documentation acceptance evaluation 的 pure request。
 * English: Pure request for target-documentation acceptance evaluation.
 */
export interface TargetDocumentationAcceptanceRequest {
  evidence: TargetDocumentationEvidenceSummary;
  targetFamily: string;
  targetId: string;
}

/**
 * Reported diagnostic that deliberately contains no echo of evidence content or file locations.
 *
 * 中文：刻意不回显 evidence content/file locations 的 report diagnostic。
 * English: Reported diagnostic that deliberately contains no echo of evidence content or file locations.
 */
export interface TargetDocumentationAcceptanceDiagnostic {
  code: typeof TARGET_DOCUMENTATION_ACCEPTANCE_DIAGNOSTIC_CODES[number];
  message: string;
  severity: "error";
}

/**
 * Versioned report that a target owner may review or retain as their own evidence.
 *
 * 中文：target owner 可自行 review 或 retain 为其 own evidence 的版本化 report。
 * English: Versioned report that a target owner may review or retain as their own evidence.
 */
export interface TargetDocumentationAcceptanceReport {
  acceptance: {
    requiredOutputs: {
      indexHtml: boolean;
      manifest: boolean;
      projectIndex: boolean;
    };
    producerCompatibility: {
      artifactCount: number;
      producerCount: number;
      successfulProducerCount: number;
    };
    requiredPermissions: {
      network: false;
      sourceBodyRead: false;
      targetRepositoryWrite: false;
    };
    stableEntryIdentity: {
      duplicateCount: number;
      entryCount: number;
      uniqueCount: number;
    };
  };
  contract: typeof TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT;
  contractVersion: typeof TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT_VERSION;
  diagnostics: TargetDocumentationAcceptanceDiagnostic[];
  input: {
    contract: "hia-generated-docs-evidence-summary" | "invalid";
    contractVersion: "0.1.0-draft" | "invalid";
  };
  privacy: {
    absolutePathLikeStringCount: number;
    sourceBodyPresent: boolean;
    sourcePresentation: "none" | "link" | "embed" | "fetch" | "invalid";
    sourcesContentPolicy: "none" | "explicit-embed" | "invalid";
    sourcesContentPresent: boolean;
  };
  status: "accepted" | "refused";
  target: {
    family: TargetDocumentationPortfolioFamily | "invalid";
    id: string;
  };
}

/**
 * Build a deterministic, public-safe acceptance or refusal report from generated documentation evidence only.
 *
 * 中文：只从 generated documentation evidence 构建确定性、public-safe 的 acceptance/refusal report。
 * English: Build a deterministic, public-safe acceptance or refusal report from generated documentation evidence only.
 *
 * @param request - target identity/family and already-generated evidence summary. target identity/family 与已生成 evidence summary。
 * @returns public-safe acceptance report; no source body, path, URL, credential, or target-local output is included. public-safe acceptance report；不含 source body、path、URL、credential 或 target-local output。
 * @lang zh-CN 本函数是 pure evaluator：不读取 filesystem、不执行 producer、不写入 target，也不把“报告可生成”当作 target adoption 成功。
 */
export function createTargetDocumentationAcceptanceReport(
  request: TargetDocumentationAcceptanceRequest
): TargetDocumentationAcceptanceReport {
  // <lang><zh-CN>诊断只记录固定 code/message；evidence 中的任意 string 都不进入 report diagnostic。</zh-CN><en>Diagnostics retain fixed code/message pairs only; no string from evidence enters a report diagnostic.</en></lang>
  const diagnostics: TargetDocumentationAcceptanceDiagnostic[] = [];
  // <lang><zh-CN>只接受 record evidence；primitive/array 会退化为空 record 并得到 contract refusal。</zh-CN><en>Accept evidence only as a record; a primitive or array degrades to an empty record and receives a contract refusal.</en></lang>
  const evidence = isRecord(request.evidence) ? request.evidence : {};
  // <lang><zh-CN>target id 必须是 stable public identifier；不合格值被替换为固定 sentinel，避免反射 caller text。</zh-CN><en>The target id must be a stable public identifier; an invalid value is replaced by a fixed sentinel to avoid reflecting caller text.</en></lang>
  const targetId = isStableIdentifier(request.targetId) ? request.targetId : "invalid-target";
  const targetFamily = isPortfolioFamily(request.targetFamily) ? request.targetFamily : "invalid";
  // <lang><zh-CN>required output booleans 逐字段读取，缺失与 false 都可被同一 incomplete diagnostic 解释。</zh-CN><en>Read required-output booleans field by field; missing and false values are both explained by the same incomplete diagnostic.</en></lang>
  const requiredOutputs = normalizeRequiredOutputs(evidence.requiredOutputs);
  const stableEntryIds = normalizeStableEntryIds(evidence.entries);
  const producerCompatibility = summarizeProducers(evidence.producers);
  const privacy = normalizePrivacy(evidence.privacy);
  const evidenceContractValid = evidence.contract === "hia-generated-docs-evidence-summary" && evidence.contractVersion === "0.1.0-draft";
  const evidenceComplete = evidence.status === "ready" && Object.values(requiredOutputs).every(Boolean);
  const uniqueEntryCount = new Set(stableEntryIds).size;
  const identityValid = stableEntryIds.length > 0 && uniqueEntryCount === stableEntryIds.length && stableEntryIds.every(isStableIdentifier);
  const producersValid = producerCompatibility.producerCount > 0 && producerCompatibility.successfulProducerCount === producerCompatibility.producerCount;
  const privacyValid = privacy.sourcePresentation !== "embed" && privacy.sourcePresentation !== "fetch" && privacy.sourcePresentation !== "invalid" &&
    privacy.sourcesContentPolicy === "none" && privacy.sourcesContentPresent === false && privacy.sourceBodyPresent === false && privacy.absolutePathLikeStringCount === 0;

  // <lang><zh-CN>每个 refusal dimension 独立报告，避免“完整但不隐私”或“有 entry 但 producer 失败”被单一总状态掩盖。</zh-CN><en>Report every refusal dimension independently so one overall state never masks complete-but-unsafe or identified-but-failed-producer evidence.</en></lang>
  if (!evidenceContractValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_ACCEPTANCE_EVIDENCE_CONTRACT_INVALID", "Target documentation acceptance requires hia-generated-docs-evidence-summary@0.1.0-draft input.");
  }
  if (!evidenceComplete || targetFamily === "invalid" || targetId === "invalid-target") {
    addDiagnostic(diagnostics, "HIA_TARGET_ACCEPTANCE_EVIDENCE_INCOMPLETE", "Target documentation acceptance requires a ready evidence summary, complete required outputs, and a supported target identity/family.");
  }
  if (!identityValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_ACCEPTANCE_STABLE_IDENTITY_INVALID", "Target documentation acceptance requires non-empty, unique, stable entry identities.");
  }
  if (!producersValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_ACCEPTANCE_PRODUCER_COMPATIBILITY_INVALID", "Target documentation acceptance requires one or more successful producer summaries.");
  }
  if (!privacyValid) {
    addDiagnostic(diagnostics, "HIA_TARGET_ACCEPTANCE_PRIVACY_REFUSED", "Target documentation acceptance refuses embedded/fetched source presentation, source content/body, or absolute-path-like output.");
  }

  // <lang><zh-CN>report 的 permission declaration 描述 evaluator 所需权限，而非声称 central HIA 已在某个 target 执行操作。</zh-CN><en>The report permission declaration describes evaluator requirements; it does not claim that central HIA performed an action in any target.</en></lang>
  return {
    acceptance: {
      requiredOutputs,
      producerCompatibility,
      requiredPermissions: {
        network: false,
        sourceBodyRead: false,
        targetRepositoryWrite: false
      },
      stableEntryIdentity: {
        duplicateCount: stableEntryIds.length - uniqueEntryCount,
        entryCount: stableEntryIds.length,
        uniqueCount: uniqueEntryCount
      }
    },
    contract: TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT,
    contractVersion: TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT_VERSION,
    diagnostics,
    input: {
      contract: evidence.contract === "hia-generated-docs-evidence-summary" ? "hia-generated-docs-evidence-summary" : "invalid",
      contractVersion: evidence.contractVersion === "0.1.0-draft" ? "0.1.0-draft" : "invalid"
    },
    privacy,
    status: diagnostics.length === 0 ? "accepted" : "refused",
    target: {
      family: targetFamily,
      id: targetId
    }
  };
}

/**
 * Minimal CLI IO surface needed by the target-acceptance command wrapper.
 *
 * 中文：target-acceptance command wrapper 所需的最小 CLI IO surface。
 * English: Minimal CLI IO surface needed by the target-acceptance command wrapper.
 */
export interface TargetDocumentationAcceptanceCliIo {
  cwd: string;
  stderr: (message: string) => void;
  stdout: (message: string) => void;
}

/**
 * Read one explicit evidence summary and emit its acceptance report without inspecting source artifacts.
 *
 * 中文：读取一份 explicit evidence summary 并输出其 acceptance report；不检查 source artifact。
 * English: Read one explicit evidence summary and emit its acceptance report without inspecting source artifacts.
 *
 * @param argv - command arguments after `hia docs acceptance`. `hia docs acceptance` 之后的 command arguments。
 * @param io - caller-provided CLI IO. caller 提供的 CLI IO。
 * @returns process-style exit code; refusal still emits a public-safe report. process-style exit code；refusal 仍会输出 public-safe report。
 * @lang zh-CN 仅在 caller 显式给出 safe-relative `--out` 时写入该 caller 的当前 workspace；没有隐式 target-local output。
 */
export async function runTargetDocumentationAcceptanceCommand(
  argv: string[],
  io: TargetDocumentationAcceptanceCliIo
): Promise<number> {
  // <lang><zh-CN>option parser 拒绝未知、重复或缺值 option，防止自由参数被误当作 path 或 target metadata。</zh-CN><en>The option parser rejects unknown, duplicate, or valueless options, preventing free arguments from being mistaken for paths or target metadata.</en></lang>
  const parsed = parseOptions(argv, ["--evidence", "--target-id", "--target-family", "--out"]);
  if (!parsed.valid) {
    io.stderr("[error:HIA_TARGET_ACCEPTANCE_OPTION_INVALID] docs acceptance requires --evidence, --target-id, --target-family, and optional --out values.");
    return 1;
  }
  const evidenceRelativePath = parsed.values.get("--evidence");
  const targetId = parsed.values.get("--target-id");
  const targetFamily = parsed.values.get("--target-family");
  const outputRelativePath = parsed.values.get("--out");
  // <lang><zh-CN>evidence/output 路径只允许 relative logical form，杜绝 absolute、UNC、scheme 与 parent traversal。</zh-CN><en>Evidence/output paths allow only relative logical forms, rejecting absolute, UNC, scheme, and parent traversal forms.</en></lang>
  if (!evidenceRelativePath || !targetId || !targetFamily || !isSafeRelativePath(evidenceRelativePath) || (outputRelativePath !== undefined && !isSafeRelativePath(outputRelativePath))) {
    io.stderr("[error:HIA_TARGET_ACCEPTANCE_PATH_INVALID] docs acceptance requires safe relative evidence and output paths.");
    return 1;
  }
  // <lang><zh-CN>guard 后以独立 const 固化 narrowed values，避免 Map.get 的 optional type 在 await boundary 被重新放宽。</zh-CN><en>After the guard, freeze narrowed values in separate constants so Map.get optional types are not widened again across await boundaries.</en></lang>
  const safeEvidenceRelativePath = evidenceRelativePath;
  const safeTargetId = targetId;
  const safeTargetFamily = targetFamily;
  // <lang><zh-CN>唯一 filesystem read 是 caller 明确的 evidence JSON；command 不读取 project manifest、HTML、source 或 target working state。</zh-CN><en>The sole filesystem read is the caller-explicit evidence JSON; the command reads no project manifest, HTML, source, or target working state.</en></lang>
  const evidencePath = path.resolve(io.cwd, safeEvidenceRelativePath);
  let evidence: unknown;
  try {
    evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  } catch {
    io.stderr("[error:HIA_TARGET_ACCEPTANCE_EVIDENCE_READ_FAILED] docs acceptance could not read a valid evidence JSON object.");
    return 1;
  }
  // <lang><zh-CN>record conversion 保留 unknown 字段语义给 pure evaluator，但不允许 primitive/array 越过 typed request boundary。</zh-CN><en>The record conversion preserves unknown-field semantics for the pure evaluator while preventing a primitive or array from crossing the typed request boundary.</en></lang>
  const evidenceSummary: TargetDocumentationEvidenceSummary = isRecord(evidence) ? evidence : {};
  const report = createTargetDocumentationAcceptanceReport({ evidence: evidenceSummary, targetFamily: safeTargetFamily, targetId: safeTargetId });
  const serializedReport = JSON.stringify(report, null, 2);
  // <lang><zh-CN>absence of --out 走 stdout，默认不写；显式 out 也只能在 caller 当前 workspace 的 safe-relative boundary 内。</zh-CN><en>Absence of --out uses stdout and writes nothing by default; an explicit out remains inside the caller workspace's safe-relative boundary.</en></lang>
  if (outputRelativePath) {
    const outputPath = path.resolve(io.cwd, outputRelativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serializedReport, "utf8");
    io.stdout(`Generated target documentation acceptance report at ${outputRelativePath.replaceAll("\\", "/")}`);
  } else {
    io.stdout(serializedReport);
  }
  // <lang><zh-CN>diagnostic 仅为 report 中同一固定 code/message；不补充 evidence path 或 caller content。</zh-CN><en>Diagnostics reuse the report's fixed code/message only; do not add an evidence path or caller content.</en></lang>
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "accepted" ? 0 : 1;
}

/**
 * Normalize the three generated documentation output requirements into fixed booleans.
 *
 * 中文：把三项 generated documentation output requirement 规范为 fixed booleans。
 * English: Normalize the three generated documentation output requirements into fixed booleans.
 *
 * @param value - candidate requiredOutputs object. 候选 requiredOutputs object。
 * @returns fixed output presence flags. 固定 output presence flags。
 */
function normalizeRequiredOutputs(value: unknown): TargetDocumentationAcceptanceReport["acceptance"]["requiredOutputs"] {
  // <lang><zh-CN>record guard 阻止 primitive/array 参与 property access；缺失值一律为 false 而不是 implicit success。</zh-CN><en>The record guard blocks primitive/array property access; missing values are always false rather than implicit success.</en></lang>
  const requiredOutputs = isRecord(value) ? value : {};
  return {
    indexHtml: requiredOutputs.indexHtml === true,
    manifest: requiredOutputs.manifest === true,
    projectIndex: requiredOutputs.projectIndex === true
  };
}

/**
 * Obtain stable entry ids only; no title, source locator, range, or rendered text is copied.
 *
 * 中文：只取得 stable entry ids；不复制 title、source locator、range 或 rendered text。
 * English: Obtain stable entry ids only; no title, source locator, range, or rendered text is copied.
 *
 * @param value - candidate entries summary. 候选 entries summary。
 * @returns copied string ids including duplicates for explicit refusal detection. 包含 duplicates 的 copied string ids，供 explicit refusal detection。
 */
function normalizeStableEntryIds(value: unknown): string[] {
  // <lang><zh-CN>stableIds 必须由 evidence producer 显式给出；不从 count 或 display text 推断 identity。</zh-CN><en>Stable ids must be explicitly supplied by the evidence producer; never infer identity from a count or display text.</en></lang>
  const entries = isRecord(value) ? value : {};
  const stableIds = Array.isArray(entries.stableIds) ? entries.stableIds : [];
  return stableIds.filter((stableId): stableId is string => typeof stableId === "string").slice().sort((left, right) => left.localeCompare(right, "en"));
}

/**
 * Summarize producer compatibility from public counts and statuses only.
 *
 * 中文：只从 public counts/statuses 汇总 producer compatibility。
 * English: Summarize producer compatibility from public counts and statuses only.
 *
 * @param value - candidate producer summaries. 候选 producer summaries。
 * @returns bounded producer count summary. 有界 producer count summary。
 */
function summarizeProducers(value: unknown): TargetDocumentationAcceptanceReport["acceptance"]["producerCompatibility"] {
  // <lang><zh-CN>忽略 malformed item，避免 report 带出 producer id 或其他 artifact metadata；它们会通过 count/status 得到 refusal。</zh-CN><en>Ignore malformed items so the report does not carry producer ids or other artifact metadata; counts/status then yield refusal.</en></lang>
  const producers = Array.isArray(value) ? value.filter(isRecord) : [];
  const successfulProducerCount = producers.filter((producer) => producer.status === "success").length;
  const artifactCount = producers.reduce((total, producer) => total + (isNonNegativeInteger(producer.artifactCount) ? producer.artifactCount : 0), 0);
  return {
    artifactCount,
    producerCount: producers.length,
    successfulProducerCount
  };
}

/**
 * Normalize privacy facts into a fixed report shape and refuse unknown values by default.
 *
 * 中文：把 privacy facts 规范为 fixed report shape，并默认拒绝 unknown values。
 * English: Normalize privacy facts into a fixed report shape and refuse unknown values by default.
 *
 * @param value - candidate privacy summary. 候选 privacy summary。
 * @returns public privacy facts without source content. 不带 source content 的 public privacy facts。
 */
function normalizePrivacy(value: unknown): TargetDocumentationAcceptanceReport["privacy"] {
  // <lang><zh-CN>unknown privacy 等于 invalid 而非宽松 fallback；foundation 必须把安全信息缺失解释为 refusal。</zh-CN><en>Unknown privacy is invalid rather than a permissive fallback; the foundation treats missing safety information as refusal.</en></lang>
  const privacy = isRecord(value) ? value : {};
  const sourcePresentation = privacy.sourcePresentation === "none" || privacy.sourcePresentation === "link" || privacy.sourcePresentation === "embed" || privacy.sourcePresentation === "fetch"
    ? privacy.sourcePresentation
    : "invalid";
  const sourcesContentPolicy = privacy.sourcesContentPolicy === "none" || privacy.sourcesContentPolicy === "explicit-embed"
    ? privacy.sourcesContentPolicy
    : "invalid";
  return {
    absolutePathLikeStringCount: isNonNegativeInteger(privacy.absolutePathLikeStringCount) ? privacy.absolutePathLikeStringCount : -1,
    sourceBodyPresent: privacy.sourceBodyPresent === true,
    sourcePresentation,
    sourcesContentPolicy,
    sourcesContentPresent: privacy.sourcesContentPresent === true
  };
}

/**
 * Add a fixed diagnostic exactly once to preserve deterministic report output.
 *
 * 中文：恰好一次加入 fixed diagnostic，保持确定性 report output。
 * English: Add a fixed diagnostic exactly once to preserve deterministic report output.
 *
 * @param diagnostics - diagnostic accumulator. diagnostic accumulator。
 * @param code - frozen public diagnostic code. 冻结的 public diagnostic code。
 * @param message - fixed message without caller interpolation. 不插入 caller 值的 fixed message。
 * @returns void. 无返回。
 */
function addDiagnostic(
  diagnostics: TargetDocumentationAcceptanceDiagnostic[],
  code: TargetDocumentationAcceptanceDiagnostic["code"],
  message: string
): void {
  // <lang><zh-CN>一个 code 对应一个 boundary failure；去重让 consumer 不必以重复次数推断 evidence 内容。</zh-CN><en>One code represents one boundary failure; deduplication prevents consumers from inferring evidence content from repetition count.</en></lang>
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) {
    diagnostics.push({ code, message, severity: "error" });
  }
}

/**
 * Parse a closed set of two-token CLI options without accepting positional or repeatable values.
 *
 * 中文：解析 closed set 的 two-token CLI options，不接受 positional/repeatable values。
 * English: Parse a closed set of two-token CLI options without accepting positional or repeatable values.
 *
 * @param argv - untrusted command arguments. 未受信任的 command arguments。
 * @param allowedOptions - exact allowed option names. exact allowed option names。
 * @returns parse result with no caller text in diagnostics. 不在 diagnostics 中包含 caller text 的 parse result。
 */
function parseOptions(argv: string[], allowedOptions: string[]): { valid: boolean; values: Map<string, string> } {
  // <lang><zh-CN>Map 保留每个 allowed option 的唯一 value；任何重复都让整条 invocation 无效。</zh-CN><en>The map retains one value per allowed option; any duplicate invalidates the whole invocation.</en></lang>
  const values = new Map<string, string>();
  if (argv.length % 2 !== 0) {
    return { valid: false, values };
  }
  for (let index = 0; index < argv.length; index += 2) {
    // <lang><zh-CN>option/value pair 必须完整且 option 在 closed allowlist 内；不把 unknown flag 当作 path。</zh-CN><en>The option/value pair must be complete and the option must be in the closed allowlist; never treat an unknown flag as a path.</en></lang>
    const option = argv[index] ?? "";
    const value = argv[index + 1] ?? "";
    if (!allowedOptions.includes(option) || values.has(option) || typeof value !== "string" || value.length === 0) {
      return { valid: false, values };
    }
    values.set(option, value);
  }
  return { valid: true, values };
}

/**
 * Check the public stable-identifier grammar used for targets and generated entry identities.
 *
 * 中文：检查 target/generated entry identity 使用的 public stable-identifier grammar。
 * English: Check the public stable-identifier grammar used for targets and generated entry identities.
 *
 * @param value - candidate identifier. 候选 identifier。
 * @returns whether the identifier is public-safe and stable-formatted. identifier 是否 public-safe 且 stable-formatted。
 */
function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value);
}

/**
 * Check the fixed target portfolio family vocabulary.
 *
 * 中文：检查 fixed target portfolio family vocabulary。
 * English: Check the fixed target portfolio family vocabulary.
 *
 * @param value - candidate family. 候选 family。
 * @returns whether the family belongs to the four portfolio groups. family 是否属于四个 portfolio group。
 */
function isPortfolioFamily(value: unknown): value is TargetDocumentationPortfolioFamily {
  return typeof value === "string" && TARGET_DOCUMENTATION_PORTFOLIO_FAMILIES.includes(value as TargetDocumentationPortfolioFamily);
}

/**
 * Check a relative logical path without resolving it outside the caller workspace.
 *
 * 中文：检查 relative logical path，不将它 resolve 到 caller workspace 之外。
 * English: Check a relative logical path without resolving it outside the caller workspace.
 *
 * @param value - candidate file path. 候选 file path。
 * @returns whether the path is safe for explicit CLI evidence I/O. path 是否适合 explicit CLI evidence I/O。
 */
function isSafeRelativePath(value: unknown): value is string {
  // <lang><zh-CN>统一 slash 后拒绝 absolute、drive/scheme、UNC 和 `..`；`.` 本身也不是 evidence file。</zh-CN><en>After normalizing slashes, reject absolute, drive/scheme, UNC, and `..`; `.` itself is not an evidence file.</en></lang>
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/") : "";
  return Boolean(normalized) && normalized !== "." && !normalized.startsWith("/") && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) && !normalized.split("/").includes("..");
}

/**
 * Narrow a value to a record before reading fixed public fields.
 *
 * 中文：在读取 fixed public fields 前把 value 收窄为 record。
 * English: Narrow a value to a record before reading fixed public fields.
 *
 * @param value - untrusted candidate. 未受信任 candidate。
 * @returns record type guard. record type guard。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check a finite public count without coercing arbitrary evidence values.
 *
 * 中文：检查 finite public count，不 coercing arbitrary evidence values。
 * English: Check a finite public count without coercing arbitrary evidence values.
 *
 * @param value - candidate count. 候选 count。
 * @returns whether the value is a non-negative integer. value 是否为 non-negative integer。
 */
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
