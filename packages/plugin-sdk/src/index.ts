import path from "node:path";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";
import {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION
} from "./constants.js";

export {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION
} from "./constants.js";
export {
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA
} from "./schema.js";

/** @lang zh-CN success 要求产物且无 error，partial 要求产物和诊断，failed 要求无产物且有 error。 @lang en Success requires artifacts and no errors; partial requires artifacts and diagnostics; failed requires no artifacts and an error. */
export type DocumentationProducerStatus = "success" | "partial" | "failed";

/** @lang zh-CN 显式能力声明；本 runtime 只接受 incremental/watch=false，sourceLinkage 可按 producer 声明。 @lang en Explicit capabilities; this runtime accepts only incremental/watch=false, while sourceLinkage is producer-defined. */
export interface DocumentationProducerCapabilities {
  incremental: boolean;
  sourceLinkage: boolean;
  watch: boolean;
}

/** @lang zh-CN 不含运行时路径的闭集生产器描述；version 是 producer 自身身份，独立于 contractVersion。 @lang en Closed producer descriptor without runtime paths; version identifies the producer itself independently of contractVersion. */
export interface DocumentationProducerDescriptor {
  capabilities: DocumentationProducerCapabilities;
  contract: typeof DOCUMENTATION_PRODUCER_CONTRACT;
  /** @lang zh-CN reader 接受的两个精确版本；未知版本须诊断拒绝。 @lang en Two exact reader versions; unknown versions must be rejected with diagnostics. */
  contractVersion: typeof DOCUMENTATION_PRODUCER_CONTRACT_VERSION | "0.1.0-draft";
  displayName: string;
  id: string;
  inputKinds: string[];
  outputKinds: string[];
  version: string;
}

/**
 * @lang zh-CN 输入 kind 与一个定位器；path/paths/projectPath/glob/globs 定位器及识别的路径扩展字段只能是安全相对路径。其它扩展值必须是 JSON 数据。
 * @lang en Input kind and a locator; path/paths/projectPath/glob/globs locators and recognized path extension fields must be safe relative paths. Other extension values must be JSON data.
 */
export interface DocumentationProducerInput {
  kind: string;
  language?: string;
  path?: string;
  [key: string]: unknown;
}

/** @lang zh-CN 只在内存中传递的执行请求；workspaceRoot/outputDirectory 为绝对路径，不是公开 wire 产物。 @lang en In-memory execution request; workspaceRoot/outputDirectory are absolute paths, not public wire artifacts. */
export interface DocumentationProducerRequest {
  inputs: DocumentationProducerInput[];
  options?: Record<string, unknown>;
  outputDirectory: string;
  profileIds?: string[];
  workspaceRoot: string;
}

/** @lang zh-CN producer 向调用者报告的进度；数值单位由 producer 定义，SDK 不验证计数或自动转换百分比。 @lang en Progress reported by a producer; units are producer-defined and the SDK neither validates counts nor converts percentages. */
export interface DocumentationProducerProgress {
  current?: number;
  message?: string;
  phase: string;
  total?: number;
}

/** @lang zh-CN 调用者提供的可选回调/中止信号；原对象传给 producer，中止不强杀 Promise，也不回滚其副作用。 @lang en Optional caller callbacks/signal; the original context reaches the producer, and cancellation neither kills a Promise nor rolls back its effects. */
export interface DocumentationProducerContext {
  reportProgress?: (progress: DocumentationProducerProgress) => void;
  signal?: AbortSignal;
}

/** @lang zh-CN 输出目录内的产物声明；path 只作安全相对路径检查，不证明文件存在。contract 与 contractVersion 须同时声明。 @lang en Artifact declaration within the output directory; path is checked only as a safe relative path, not for file existence. Contract and contractVersion must be declared together. */
export interface DocumentationProducerArtifact {
  contract?: string;
  contractVersion?: string;
  format?: string;
  id: string;
  kind: string;
  language?: string;
  mediaType?: string;
  path: string;
  profileIds?: string[];
}

/**
 * @lang zh-CN producer 原生诊断的公开类型；metadata/source 复用既有 wire 字段，全部值须可表示为 JSON，source.path 须安全相对。
 * @lang en Public type for producer-native diagnostics; metadata/source reuse existing wire fields, all values must be representable as JSON and source.path must be safe relative.
 */
export interface DocumentationProducerDiagnostic extends HiaDiagnostic {
  metadata?: Record<string, unknown>;
  source?: { path?: string; [key: string]: unknown };
}

/** @lang zh-CN 可序列化的闭集执行结果；diagnostic 文案/元数据由 producer 负责脱敏，SDK 不把领域正文自动变成可公开数据。 @lang en Serializable closed execution result; producers own redaction of diagnostic text/metadata, and the SDK does not automatically make domain content public-safe. */
export interface DocumentationProducerResult {
  artifacts: DocumentationProducerArtifact[];
  contract: typeof DOCUMENTATION_PRODUCER_RESULT_CONTRACT;
  /** @lang zh-CN 可读取当前版本或已知历史草案；run 保留有效返回的原版本。 @lang en Reads the current version or known historical draft; run retains the original version of a valid return. */
  contractVersion: typeof DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION | "0.1.0-draft";
  diagnostics: DocumentationProducerDiagnostic[];
  producer: {
    id: string;
    version: string;
  };
  status: DocumentationProducerStatus;
}

/** @lang zh-CN 调用方明确加载的生产器；执行权限来自宿主，SDK 不是沙箱。 @lang en Producer explicitly loaded by the caller; execution authority belongs to the host and the SDK is not a sandbox. */
export interface DocumentationProducer {
  descriptor: DocumentationProducerDescriptor;
  /**
   * @lang zh-CN 生成文件/数据并返回声明；I/O、进度和信号响应由该实现负责，返回值还会由 runner 校验。
   * @lang en Generates files/data and returns declarations; the implementation owns I/O, progress and signal handling, and the runner validates its return.
   * @param request <lang><zh-CN>已通过 SDK 校验的内存请求。</zh-CN><en>In-memory request validated by the SDK.</en></lang>
   * @param context <lang><zh-CN>原始回调与信号上下文。</zh-CN><en>Original callback and signal context.</en></lang>
   * @returns <lang><zh-CN>结果 Promise；抛错由 runner 转成安全失败。</zh-CN><en>Result promise; the runner converts throws to safe failures.</en></lang>
   */
  produce(
    request: DocumentationProducerRequest,
    context: DocumentationProducerContext
  ): Promise<DocumentationProducerResult>;
}

/** @lang zh-CN 可选验证上下文，默认空；descriptor 必须是已验证的可信描述，targetPath 仅作诊断前缀。 @lang en Optional validation context, empty by default; descriptor must be trusted and prevalidated, and targetPath only prefixes diagnostics. */
export interface DocumentationProducerValidationOptions {
  descriptor?: DocumentationProducerDescriptor;
  targetPath?: string;
}

// <lang><zh-CN>严格身份与开放kind使用不同语法，不能由artifact领域扩展放松producer身份。</zh-CN><en>Strict identities and open kinds use distinct syntax so artifact-domain extensions cannot relax producer identity.</en></lang>
const identifierPattern = /^[a-z0-9][a-z0-9._-]*$/;
const openIdentifierPattern = /^[a-z0-9][a-z0-9._/-]*$/;
// <lang><zh-CN>severity和status是wire闭集，未知值不能默认为成功。</zh-CN><en>Severity and status are closed wire sets; unknown values cannot default to success.</en></lang>
const diagnosticSeverities = new Set<HiaDiagnosticSeverity>(["error", "warning", "info"]);
const resultStatuses = new Set<DocumentationProducerStatus>(["success", "partial", "failed"]);

/**
 * @lang zh-CN 验证显式加载的描述与 produce 函数，并返回原对象；不执行、克隆或冻结 producer。
 * @lang en Validates an explicitly loaded descriptor and produce function, returning the original object without execution, cloning or freezing.
 * @param producer <lang><zh-CN>含描述与异步执行函数的 producer。</zh-CN><en>Producer containing a descriptor and asynchronous execution function.</en></lang>
 * @returns <lang><zh-CN>同一引用，保留调用者的扩展类型；run 会在每次执行前再次验证描述。</zh-CN><en>The same reference, preserving caller extension types; run revalidates its descriptor before every execution.</en></lang>
 * @throws {TypeError} <lang><zh-CN>描述无效、版本未知或 produce 不可调用时。</zh-CN><en>For invalid descriptors, unknown versions or a non-callable produce member.</en></lang>
 */
export function defineDocumentationProducer<T extends DocumentationProducer>(producer: T): T {
  // <lang><zh-CN>描述诊断只在本次验证中累积，不缓存可变producer的状态。</zh-CN><en>Accumulate descriptor diagnostics for this validation only, without caching mutable producer state.</en></lang>
  const diagnostics = validateDocumentationProducerDescriptor(producer?.descriptor);
  // <lang><zh-CN>缺少执行函数是独立错误，但此入口绝不尝试调用它。</zh-CN><en>A missing execution function is a separate error, and this entry never attempts to invoke it.</en></lang>
  if (!producer || typeof producer.produce !== "function") {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_INVALID",
      "Documentation producer must provide a produce(request, context) function.",
      "error"
    ));
  }

  // <lang><zh-CN>定义错误用TypeError拒绝，不制造看似已运行的failed结果。</zh-CN><en>Reject definition errors with TypeError rather than manufacturing an apparently executed failed result.</en></lang>
  if (hasDocumentationProducerErrors(diagnostics)) {
    throw new TypeError(formatContractDiagnostics(diagnostics));
  }

  return producer;
}

/**
 * @lang zh-CN 验证后至多调用一次 producer；有效结果保留原对象/版本，执行失败、中止或无效结果转为当前版本的安全失败。
 * @lang en Invokes a producer at most once after validation; valid results retain their object/version, while execution failure, cancellation or invalid results become safe current-version failures.
 * @param producer <lang><zh-CN>已明确加载的可信模块；SDK在此重新验证描述。</zh-CN><en>Explicitly loaded trusted module whose descriptor is revalidated here.</en></lang>
 * @param request <lang><zh-CN>内存绝对根与相对输入定位器；无效时不调用producer。</zh-CN><en>In-memory absolute roots and relative input locators; invalid requests prevent invocation.</en></lang>
 * @param context <lang><zh-CN>默认空对象；回调/信号原样传入，在调用前与settle后检查中止。</zh-CN><en>Defaults to an empty object; callbacks/signal pass through, with abort checked before invocation and after settlement.</en></lang>
 * @returns <lang><zh-CN>验证后的原结果或无产物的failed结果；异常原文不进入SDK创建的公开诊断。</zh-CN><en>Validated original result or an artifact-free failed result; raw thrown details never enter SDK-created public diagnostics.</en></lang>
 * @throws {TypeError} <lang><zh-CN>producer定义无效时Promise拒绝；producer执行抛错会转换为结果。</zh-CN><en>Rejects the promise for invalid producer definitions; producer execution throws are converted to results.</en></lang>
 * @remarks <lang><zh-CN>SDK本身不访问文件/网络；producer可执行I/O或回调，中止不撤销已产生的副作用。</zh-CN><en>The SDK itself performs no file/network I/O; producers may perform I/O or callbacks, and cancellation does not undo their effects.</en></lang>
 */
export async function runDocumentationProducer(
  producer: DocumentationProducer,
  request: DocumentationProducerRequest,
  context: DocumentationProducerContext = {}
): Promise<DocumentationProducerResult> {
  // <lang><zh-CN>定义错误先于请求与中止检查，保持对调用者编程错误的明确TypeError边界。</zh-CN><en>Definition errors precede request and abort checks, preserving an explicit TypeError boundary for caller programming errors.</en></lang>
  const descriptorDiagnostics = validateDocumentationProducerDescriptor(producer?.descriptor);
  if (!producer || typeof producer.produce !== "function" || hasDocumentationProducerErrors(descriptorDiagnostics)) {
    throw new TypeError(formatContractDiagnostics([
      ...descriptorDiagnostics,
      ...(producer && typeof producer.produce === "function"
        ? []
        : [createProducerDiagnostic(
            "DOCUMENTATION_PRODUCER_INVALID",
            "Documentation producer must provide a produce(request, context) function.",
            "error"
          )])
    ]));
  }

  // <lang><zh-CN>请求需与此描述的输入kind对应；失败只返回诊断，不运行模块。</zh-CN><en>The request must match this descriptor's input kinds; failures return diagnostics without running the module.</en></lang>
  const requestDiagnostics = validateDocumentationProducerRequest(request, {
    descriptor: producer.descriptor
  });
  if (hasDocumentationProducerErrors(requestDiagnostics)) {
    return createFailedProducerResult(producer.descriptor, requestDiagnostics);
  }

  // <lang><zh-CN>已中止的请求不能开始执行，也不回显signal.reason等任意私有值。</zh-CN><en>Already-aborted requests cannot start execution and never echo arbitrary private values such as signal.reason.</en></lang>
  if (context.signal?.aborted) {
    return createFailedProducerResult(producer.descriptor, [
      createProducerDiagnostic(
        "DOCUMENTATION_PRODUCER_ABORTED",
        "Documentation producer was aborted before execution.",
        "error"
      )
    ]);
  }

  // <lang><zh-CN>producer返回值在完整验证前保持unknown，不能依靠TypeScript声明信任运行时对象。</zh-CN><en>Keep the producer return unknown until full validation rather than trusting its runtime object through a TypeScript declaration.</en></lang>
  let value: unknown;
  // <lang><zh-CN>唯一执行位置；模块的I/O、回调与信号响应由模块实现负责。</zh-CN><en>The sole invocation site; the module owns its I/O, callbacks and signal response.</en></lang>
  try {
    value = await producer.produce(request, context);
  } catch (error) {
    // <lang><zh-CN>只保留中止分类，异常message/stack/reason可能含私有根路径或凭据。</zh-CN><en>Retain only the abort classification because message/stack/reason may contain private roots or credentials.</en></lang>
    const aborted = context.signal?.aborted || isAbortError(error);
    return createFailedProducerResult(producer.descriptor, [
      createProducerDiagnostic(
        aborted ? "DOCUMENTATION_PRODUCER_ABORTED" : "DOCUMENTATION_PRODUCER_EXECUTION_FAILED",
        aborted
          ? "Documentation producer execution was aborted."
          : "Documentation producer execution failed.",
        "error"
      )
    ]);
  }

  // <lang><zh-CN>producer可忽略signal后正常resolve；已观察到中止时，晚到结果仍不能成为可消费成功。</zh-CN><en>A producer may ignore its signal and resolve normally; after observed cancellation a late result still cannot become consumable success.</en></lang>
  if (context.signal?.aborted) {
    return createFailedProducerResult(producer.descriptor, [
      createProducerDiagnostic("DOCUMENTATION_PRODUCER_ABORTED", "Documentation producer was aborted during execution.", "error")
    ]);
  }

  // <lang><zh-CN>结果还需匹配实际执行的producer身份、输出kind、状态与路径/JSON边界。</zh-CN><en>The result must also match the executed producer identity, output kinds, status, and path/JSON boundaries.</en></lang>
  const resultDiagnostics = validateDocumentationProducerResult(value, {
    descriptor: producer.descriptor
  });
  if (hasDocumentationProducerErrors(resultDiagnostics)) {
    return createFailedProducerResult(producer.descriptor, resultDiagnostics);
  }

  // <lang><zh-CN>不递归改号、不克隆产物或诊断，保留已验证producer的身份与引用语义。</zh-CN><en>Do not recursively renumber or clone artifacts/diagnostics; preserve the validated producer's identity and reference semantics.</en></lang>
  return value as DocumentationProducerResult;
}

/**
 * @lang zh-CN 校验描述闭集、精确版本与能力；不加载或执行producer。
 * @lang en Validates descriptor fields, exact versions and capabilities without loading or executing a producer.
 * @param value <lang><zh-CN>未知描述数据。</zh-CN><en>Unknown descriptor data.</en></lang>
 * @param options <lang><zh-CN>默认空；targetPath仅供定位。</zh-CN><en>Empty by default; targetPath is diagnostic context only.</en></lang>
 * @returns <lang><zh-CN>新诊断数组；空数组代表有效，不改写输入。</zh-CN><en>New diagnostics array; empty means valid, without mutating input.</en></lang>
 */
export function validateDocumentationProducerDescriptor(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  // <lang><zh-CN>每次调用独立收集诊断；非对象先拒绝再访问字段。</zh-CN><en>Collect diagnostics independently for each call, rejecting non-objects before field access.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
      "Documentation producer descriptor must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  // <lang><zh-CN>先检查闭集，再逐项校验身份、版本、分类与能力。</zh-CN><en>Check the closed field set before validating identities, versions, categories and capabilities.</en></lang>
  validateKnownFields(value, [
    "contract",
    "contractVersion",
    "id",
    "version",
    "displayName",
    "inputKinds",
    "outputKinds",
    "capabilities"
  ], diagnostics, "descriptor", options.targetPath);
  validateConst(value.contract, DOCUMENTATION_PRODUCER_CONTRACT, "descriptor.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    [DOCUMENTATION_PRODUCER_CONTRACT_VERSION, "0.1.0-draft"],
    "descriptor.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateIdentifier(value.id, "descriptor.id", diagnostics, options.targetPath);
  validateNonEmptyString(value.version, "descriptor.version", diagnostics, options.targetPath);
  validateNonEmptyString(value.displayName, "descriptor.displayName", diagnostics, options.targetPath);
  validateIdentifierList(value.inputKinds, "descriptor.inputKinds", diagnostics, options.targetPath, true, true);
  validateIdentifierList(value.outputKinds, "descriptor.outputKinds", diagnostics, options.targetPath, true, true);
  validateCapabilities(value.capabilities, diagnostics, options.targetPath);
  return diagnostics;
}

/**
 * @lang zh-CN 只校验内存请求的绝对根、相对定位器和JSON选项；不证明文件存在或可访问。
 * @lang en Checks only in-memory absolute roots, relative locators and JSON options without proving file existence or access.
 * @param value <lang><zh-CN>未知请求数据。</zh-CN><en>Unknown request data.</en></lang>
 * @param options <lang><zh-CN>默认空；可传入已验证描述以限制输入kind。</zh-CN><en>Empty by default; a prevalidated descriptor may constrain input kinds.</en></lang>
 * @returns <lang><zh-CN>新诊断数组；空数组代表此验证层有效，无输入修改和I/O。</zh-CN><en>New diagnostics array; empty means valid at this layer, with no mutation or I/O.</en></lang>
 */
export function validateDocumentationProducerRequest(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  // <lang><zh-CN>请求诊断与producer结果诊断分离，不携带运行时根路径原文。</zh-CN><en>Keep request diagnostics separate from producer result diagnostics without carrying raw runtime roots.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "Documentation producer request must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  // <lang><zh-CN>固定请求字段后检查根路径、输入定位器及可选参数，避免扩展字段绕过路径检查。</zh-CN><en>After constraining request fields, check roots, locators and options so extensions cannot bypass path validation.</en></lang>
  validateKnownFields(
    value,
    ["workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"],
    diagnostics,
    "request",
    options.targetPath
  );
  validateAbsoluteRuntimePath(value.workspaceRoot, "request.workspaceRoot", diagnostics, options.targetPath);
  validateAbsoluteRuntimePath(value.outputDirectory, "request.outputDirectory", diagnostics, options.targetPath);
  validateProducerInputs(value.inputs, options.descriptor, diagnostics, options.targetPath);
  if (value.options !== undefined && (!isRecord(value.options) || !isJsonCompatible(value.options))) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "request.options must be a JSON-compatible object.",
      "request.options",
      options.targetPath
    ));
  }
  if (value.profileIds !== undefined) {
    validateIdentifierList(value.profileIds, "request.profileIds", diagnostics, options.targetPath, false);
  }
  return diagnostics;
}

/**
 * @lang zh-CN 校验结果JSON、闭集、两个精确wire版本、状态组合及引用/路径；不读取产物，也不对领域诊断文案自动脱敏。
 * @lang en Validates result JSON, closed fields, two exact wire versions, status combinations and references/paths without reading artifacts or automatically redacting domain diagnostic text.
 * @param value <lang><zh-CN>未知结果数据，环引用/函数/非有限值被拒绝。</zh-CN><en>Unknown result data; cycles, functions and non-finite values are rejected.</en></lang>
 * @param options <lang><zh-CN>默认空；已验证描述用于核对producer身份及输出kind。</zh-CN><en>Empty by default; a prevalidated descriptor checks producer identity and output kinds.</en></lang>
 * @returns <lang><zh-CN>新诊断数组；空数组表示有效且输入未修改。</zh-CN><en>New diagnostics array; empty means valid, with input unchanged.</en></lang>
 */
export function validateDocumentationProducerResult(
  value: unknown,
  options: DocumentationProducerValidationOptions = {}
): HiaDiagnostic[] {
  // <lang><zh-CN>本次验证独立积累错误，先确保根节点可按对象处理。</zh-CN><en>Accumulate errors for this validation only, first ensuring an object root.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(createProducerDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "Documentation producer result must be an object.",
      "error",
      options.targetPath
    ));
    return diagnostics;
  }

  // <lang><zh-CN>整体先检查可序列化数据，覆盖source等开放元数据而不触发JSON.stringify或回显正文。</zh-CN><en>Check representable data across the whole result, including open metadata such as source, without invoking JSON.stringify or echoing bodies.</en></lang>
  if (!isJsonCompatible(value)) {
    return [createFieldDiagnostic("DOCUMENTATION_PRODUCER_RESULT_INVALID", "Documentation producer result must contain only JSON-compatible values without cycles.", "result", options.targetPath)];
  }

  // <lang><zh-CN>版本、身份与分类检查保持独立；旧wire版本不自动改变producer自身version。</zh-CN><en>Keep wire version, identity and kind checks separate; a legacy wire version never automatically changes the producer's own version.</en></lang>
  validateKnownFields(
    value,
    ["contract", "contractVersion", "producer", "status", "artifacts", "diagnostics"],
    diagnostics,
    "result",
    options.targetPath
  );
  validateConst(value.contract, DOCUMENTATION_PRODUCER_RESULT_CONTRACT, "result.contract", diagnostics, options.targetPath);
  validateConst(
    value.contractVersion,
    [DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION, "0.1.0-draft"],
    "result.contractVersion",
    diagnostics,
    options.targetPath
  );
  validateProducerIdentity(value.producer, options.descriptor, diagnostics, options.targetPath);
  // <lang><zh-CN>未知status保持未解析状态，不能误落入success分支。</zh-CN><en>Unknown status remains unresolved rather than falling into a success branch.</en></lang>
  const status = typeof value.status === "string" && resultStatuses.has(value.status as DocumentationProducerStatus)
    ? value.status as DocumentationProducerStatus
    : undefined;
  if (!status) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.status must be success, partial or failed.",
      "result.status",
      options.targetPath
    ));
  }

  // <lang><zh-CN>验证后的候选产物与原生诊断只用于跨字段状态检查，错误仍留在外层诊断数组。</zh-CN><en>Validated candidate artifacts and native diagnostics feed cross-field status checks; errors remain in the outer diagnostics array.</en></lang>
  const artifacts = validateProducerArtifacts(value.artifacts, options.descriptor, diagnostics, options.targetPath);
  const resultDiagnostics = validateResultDiagnostics(value.diagnostics, diagnostics, options.targetPath);
  if (status) {
    validateResultStatusSemantics(status, artifacts, resultDiagnostics, diagnostics, options.targetPath);
  }
  return diagnostics;
}

/**
 * @lang zh-CN 判断诊断中是否存在error；warning/info或空数组均不构成错误。
 * @lang en Tests for error diagnostics; warnings, information and empty arrays are not errors.
 * @param diagnostics <lang><zh-CN>只读诊断序列。</zh-CN><en>Read-only diagnostic sequence.</en></lang>
 * @returns <lang><zh-CN>至少一条severity=error时为true，不修改序列。</zh-CN><en>True when at least one severity is error, without modifying the sequence.</en></lang>
 */
export function hasDocumentationProducerErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function validateCapabilities(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
      "descriptor.capabilities must be an object.",
      "descriptor.capabilities",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["sourceLinkage", "incremental", "watch"], diagnostics, "descriptor.capabilities", targetPath);
  for (const field of ["sourceLinkage", "incremental", "watch"] as const) {
    if (typeof value[field] !== "boolean") {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID",
        `descriptor.capabilities.${field} must be boolean.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
  for (const field of ["incremental", "watch"] as const) {
    if (value[field] === true) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_CAPABILITY_UNSUPPORTED",
        `P1 documentation producer runtime does not support ${field}.`,
        `descriptor.capabilities.${field}`,
        targetPath
      ));
    }
  }
}

function validateProducerInputs(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      "request.inputs must be a non-empty array.",
      "request.inputs",
      targetPath
    ));
    return;
  }

  value.forEach((input, index) => {
    const fieldPath = `request.inputs[${index}]`;
    if (!isRecord(input)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateProducerInputExtensionFields(input, fieldPath, diagnostics, targetPath);
    validateOpenIdentifier(input.kind, `${fieldPath}.kind`, diagnostics, targetPath);
    if (typeof input.kind === "string" && descriptor && !descriptor.inputKinds.includes(input.kind)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_INPUT_KIND_UNSUPPORTED",
        `${fieldPath}.kind is not declared by producer ${descriptor.id}.`,
        `${fieldPath}.kind`,
        targetPath
      ));
    }
    if (!hasProducerInputLocator(input)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
        `${fieldPath} must define path, paths, projectPath, glob or globs.`,
        fieldPath,
        targetPath
      ));
    }
    if (input.path !== undefined) {
      validateSafeRelativePath(input.path, `${fieldPath}.path`, diagnostics, targetPath);
    }
    if (input.language !== undefined) {
      validateNonEmptyString(input.language, `${fieldPath}.language`, diagnostics, targetPath);
    }
  });
}

/**
 * @lang zh-CN 校验输入扩展值的JSON表示和已知路径语义；非法扩展名在错误中只定位到父input。
 * @lang en Validates JSON-compatible input extensions and recognized path semantics; malformed extension names locate only the parent input in errors.
 * @param input <lang><zh-CN>本次输入对象，不修改。</zh-CN><en>Input object for this call, without mutation.</en></lang>
 * @param fieldPath <lang><zh-CN>宿主已构造的安全input定位。</zh-CN><en>Safe input location constructed by the host.</en></lang>
 * @param diagnostics <lang><zh-CN>追加验证错误的调用局部列表。</zh-CN><en>Call-local list receiving validation errors.</en></lang>
 * @param targetPath <lang><zh-CN>可选可信定位前缀。</zh-CN><en>Optional trusted location prefix.</en></lang>
 * @returns <lang><zh-CN>无返回值，不访问文件或展开glob。</zh-CN><en>No return value, file access or glob expansion.</en></lang>
 */
function validateProducerInputExtensionFields(
  input: Record<string, unknown>,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isJsonCompatible(input)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_REQUEST_INVALID",
      `${fieldPath} must be JSON-compatible.`,
      fieldPath,
      targetPath
    ));
    return;
  }

  for (const [field, value] of Object.entries(input)) {
    if (value === undefined || field === "kind" || field === "path" || field === "language") {
      continue;
    }

    // <lang><zh-CN>扩展键不是受信任字段名；仅标识符保留细粒度定位，其它键回到父input以避免路径/私密名称回显。</zh-CN><en>Extension keys are untrusted names; retain fine-grained locations only for identifiers, otherwise use the parent input to avoid echoing paths or private names.</en></lang>
    const extensionFieldPath = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field) ? `${fieldPath}.${field}` : fieldPath;
    if (field === "paths") {
      validateSafeRelativePathArray(value, `${fieldPath}.paths`, diagnostics, targetPath);
    } else if (field === "glob" || field === "projectPath" || isPathLikeFieldName(field)) {
      validateSafeRelativePath(value, extensionFieldPath, diagnostics, targetPath);
    } else if (field === "globs" || field === "excludeGlobs" || field === "globPatterns" || field === "excludeGlobPatterns") {
      validateSafeRelativePathArray(value, `${fieldPath}.${field}`, diagnostics, targetPath);
    }
  }
}

function hasProducerInputLocator(input: Record<string, unknown>): boolean {
  return typeof input.path === "string"
    || (Array.isArray(input.paths) && input.paths.length > 0)
    || typeof input.projectPath === "string"
    || typeof input.glob === "string"
    || (Array.isArray(input.globs) && input.globs.length > 0);
}

function validateProducerIdentity(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.producer must be an object.",
      "result.producer",
      targetPath
    ));
    return;
  }
  validateKnownFields(value, ["id", "version"], diagnostics, "result.producer", targetPath);
  validateIdentifier(value.id, "result.producer.id", diagnostics, targetPath);
  validateNonEmptyString(value.version, "result.producer.version", diagnostics, targetPath);
  if (descriptor && (value.id !== descriptor.id || value.version !== descriptor.version)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_IDENTITY_MISMATCH",
      "result.producer must match the executed producer descriptor.",
      "result.producer",
      targetPath
    ));
  }
}

/**
 * @lang zh-CN 校验产物声明、严格身份/开放kind与安全相对路径；重复诊断不回显未知身份值。
 * @lang en Validates artifact declarations, strict identities/open kinds and safe relative paths; duplicate diagnostics do not echo unknown identity values.
 * @param value <lang><zh-CN>未知产物数组。</zh-CN><en>Unknown artifact array.</en></lang>
 * @param descriptor <lang><zh-CN>可选已验证描述，用于检查输出kind。</zh-CN><en>Optional prevalidated descriptor constraining output kinds.</en></lang>
 * @param diagnostics <lang><zh-CN>外层调用的验证错误列表。</zh-CN><en>Validation errors for the enclosing call.</en></lang>
 * @param targetPath <lang><zh-CN>可选定位前缀。</zh-CN><en>Optional location prefix.</en></lang>
 * @returns <lang><zh-CN>候选对象项供状态组合复核；调用方仍须拒绝diagnostics中的error。</zh-CN><en>Candidate object entries for status checks; callers must still reject error diagnostics.</en></lang>
 */
function validateProducerArtifacts(
  value: unknown,
  descriptor: DocumentationProducerDescriptor | undefined,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocumentationProducerArtifact[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.artifacts must be an array.",
      "result.artifacts",
      targetPath
    ));
    return [];
  }
  // <lang><zh-CN>候选项与身份集合仅用于当前结果的组合/重复检查，不读取任何产物。</zh-CN><en>Candidate entries and the identity set serve only combination/duplicate checks within this result, without reading artifacts.</en></lang>
  const validArtifacts: DocumentationProducerArtifact[] = [];
  const ids = new Set<string>();
  value.forEach((artifact, index) => {
    // <lang><zh-CN>定位只用固定字段及数组序号，避免把不受信任身份拼进diagnostic路径。</zh-CN><en>Locations use fixed fields and array indexes only, without embedding untrusted identities in diagnostic paths.</en></lang>
    const fieldPath = `result.artifacts[${index}]`;
    if (!isRecord(artifact)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_ARTIFACT_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateKnownFields(
      artifact,
      ["id", "kind", "path", "contract", "contractVersion", "format", "language", "mediaType", "profileIds"],
      diagnostics,
      fieldPath,
      targetPath
    );
    validateIdentifier(artifact.id, `${fieldPath}.id`, diagnostics, targetPath);
    validateOpenIdentifier(artifact.kind, `${fieldPath}.kind`, diagnostics, targetPath);
    validateSafeRelativePath(artifact.path, `${fieldPath}.path`, diagnostics, targetPath);
    if (typeof artifact.id === "string") {
      if (ids.has(artifact.id)) {
        diagnostics.push(createFieldDiagnostic(
          "DOCUMENTATION_PRODUCER_ARTIFACT_DUPLICATE",
            "Duplicate artifact id.",
          `${fieldPath}.id`,
          targetPath
        ));
      }
      ids.add(artifact.id);
    }
    if (typeof artifact.kind === "string" && descriptor && !descriptor.outputKinds.includes(artifact.kind)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_OUTPUT_KIND_UNDECLARED",
        `${fieldPath}.kind is not declared by producer ${descriptor.id}.`,
        `${fieldPath}.kind`,
        targetPath
      ));
    }
    validateOptionalStringPair(artifact, "contract", "contractVersion", fieldPath, diagnostics, targetPath);
    for (const field of ["format", "language", "mediaType"] as const) {
      if (artifact[field] !== undefined) {
        validateNonEmptyString(artifact[field], `${fieldPath}.${field}`, diagnostics, targetPath);
      }
    }
    if (artifact.profileIds !== undefined) {
      validateIdentifierList(artifact.profileIds, `${fieldPath}.profileIds`, diagnostics, targetPath, false);
    }
    validArtifacts.push(artifact as unknown as DocumentationProducerArtifact);
  });
  return validArtifacts;
}

/**
 * @lang zh-CN 在外层JSON检查后校验producer原生诊断；data/metadata/source内容的公开分类仍由producer负责。
 * @lang en Validates native producer diagnostics after the outer JSON check; producers still own public classification of data/metadata/source content.
 * @param value <lang><zh-CN>未知诊断数组。</zh-CN><en>Unknown diagnostic array.</en></lang>
 * @param diagnostics <lang><zh-CN>外层验证错误，与producer原生诊断分离。</zh-CN><en>Outer validation errors, separate from native producer diagnostics.</en></lang>
 * @param targetPath <lang><zh-CN>可选可信定位前缀。</zh-CN><en>Optional trusted location prefix.</en></lang>
 * @returns <lang><zh-CN>候选原生诊断项供状态检查，不改写或复制诊断正文。</zh-CN><en>Candidate native diagnostics for status checks, without rewriting or copying their bodies.</en></lang>
 */
function validateResultDiagnostics(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocumentationProducerDiagnostic[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RESULT_INVALID",
      "result.diagnostics must be an array.",
      "result.diagnostics",
      targetPath
    ));
    return [];
  }
  // <lang><zh-CN>本地候选数组保留现有source/metadata类型，不把它们降格为不可访问的基础诊断字段。</zh-CN><en>The local candidate array preserves source/metadata types rather than hiding them behind inaccessible base diagnostic fields.</en></lang>
  const validDiagnostics: DocumentationProducerDiagnostic[] = [];
  value.forEach((diagnostic, index) => {
    // <lang><zh-CN>原生诊断按数组序号定位，未知字段的键不进入公开错误。</zh-CN><en>Locate native diagnostics by array index; unknown field keys never enter public errors.</en></lang>
    const fieldPath = `result.diagnostics[${index}]`;
    if (!isRecord(diagnostic)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath} must be an object.`,
        fieldPath,
        targetPath
      ));
      return;
    }
    validateKnownFields(diagnostic, ["code", "message", "severity", "data", "metadata", "source", "path", "targetPath"], diagnostics, fieldPath, targetPath);
    validateNonEmptyString(diagnostic.code, `${fieldPath}.code`, diagnostics, targetPath);
    validateNonEmptyString(diagnostic.message, `${fieldPath}.message`, diagnostics, targetPath);
    if (typeof diagnostic.severity !== "string" || !diagnosticSeverities.has(diagnostic.severity as HiaDiagnosticSeverity)) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath}.severity must be error, warning or info.`,
        `${fieldPath}.severity`,
        targetPath
      ));
    }
    if (diagnostic.data !== undefined && (!isRecord(diagnostic.data) || !isJsonCompatible(diagnostic.data))) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath}.data must be a JSON-compatible object.`,
        `${fieldPath}.data`,
        targetPath
      ));
    }
    if (diagnostic.metadata !== undefined && (!isRecord(diagnostic.metadata) || !isJsonCompatible(diagnostic.metadata))) {
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
        `${fieldPath}.metadata must be a JSON-compatible object.`,
        `${fieldPath}.metadata`,
        targetPath
      ));
    }
    if (diagnostic.source !== undefined) {
      if (!isRecord(diagnostic.source)) {
        diagnostics.push(createFieldDiagnostic(
          "DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID",
          `${fieldPath}.source must be an object when present.`,
          `${fieldPath}.source`,
          targetPath
        ));
      } else if (diagnostic.source.path !== undefined) {
        validateSafeRelativePath(diagnostic.source.path, `${fieldPath}.source.path`, diagnostics, targetPath);
      }
    }
    for (const pathField of ["path", "targetPath"] as const) {
      if (diagnostic[pathField] !== undefined) {
        validateSafeRelativePath(diagnostic[pathField], `${fieldPath}.${pathField}`, diagnostics, targetPath);
      }
    }
    validDiagnostics.push(diagnostic as unknown as DocumentationProducerDiagnostic);
  });
  return validDiagnostics;
}

function validateResultStatusSemantics(
  status: DocumentationProducerStatus,
  artifacts: DocumentationProducerArtifact[],
  resultDiagnostics: HiaDiagnostic[],
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  const hasErrors = resultDiagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (status === "success" && (artifacts.length === 0 || hasErrors)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A success result requires at least one artifact and no error diagnostics.",
      "result.status",
      targetPath
    ));
  }
  if (status === "partial" && (artifacts.length === 0 || resultDiagnostics.length === 0)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A partial result requires at least one artifact and one diagnostic.",
      "result.status",
      targetPath
    ));
  }
  if (status === "failed" && (artifacts.length > 0 || !hasErrors)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_STATUS_INVALID",
      "A failed result must contain no artifacts and at least one error diagnostic.",
      "result.status",
      targetPath
    ));
  }
}

/**
 * @lang zh-CN 为SDK门禁失败构造当前版本结果；不保留原producer的任何候选产物。
 * @lang en Constructs a current-version result for SDK gate failures, retaining no candidate artifacts from the producer.
 * @param descriptor <lang><zh-CN>已验证的生产器身份来源。</zh-CN><en>Prevalidated producer identity source.</en></lang>
 * @param diagnostics <lang><zh-CN>SDK生成的安全错误序列。</zh-CN><en>Safe errors generated by the SDK.</en></lang>
 * @returns <lang><zh-CN>无产物、状态failed的结果；无I/O或输入修改。</zh-CN><en>Artifact-free failed result without I/O or input mutation.</en></lang>
 */
function createFailedProducerResult(
  descriptor: DocumentationProducerDescriptor,
  diagnostics: HiaDiagnostic[]
): DocumentationProducerResult {
  // <lang><zh-CN>只复制安全身份字段；诊断已由SDK验证/创建，不复制运行时根或异常对象。</zh-CN><en>Copy only safe identity fields; diagnostics were validated/created by the SDK, without copying runtime roots or thrown objects.</en></lang>
  return {
    contract: DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    producer: {
      id: descriptor.id,
      version: descriptor.version
    },
    status: "failed",
    artifacts: [],
    diagnostics
  };
}

function validateOptionalStringPair(
  record: Record<string, unknown>,
  first: string,
  second: string,
  prefix: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if ((record[first] === undefined) !== (record[second] === undefined)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_ARTIFACT_INVALID",
      `${prefix}.${first} and ${prefix}.${second} must be declared together.`,
      prefix,
      targetPath
    ));
    return;
  }
  if (record[first] !== undefined) {
    validateNonEmptyString(record[first], `${prefix}.${first}`, diagnostics, targetPath);
    validateNonEmptyString(record[second], `${prefix}.${second}`, diagnostics, targetPath);
  }
}

/**
 * @lang zh-CN 校验字段闭集；未知键只产生父节点错误，防止私有路径或名称泄漏。
 * @lang en Checks a closed field set; unknown keys produce parent-only errors to prevent private paths or names leaking.
 * @param record <lang><zh-CN>待检查对象，不修改。</zh-CN><en>Object to inspect without mutation.</en></lang>
 * @param allowed <lang><zh-CN>调用方定义的可信字段闭集。</zh-CN><en>Trusted field set defined by the caller.</en></lang>
 * @param diagnostics <lang><zh-CN>追加错误的本次列表。</zh-CN><en>Invocation-local list receiving errors.</en></lang>
 * @param prefix <lang><zh-CN>已知的安全父字段定位。</zh-CN><en>Known safe parent field location.</en></lang>
 * @param targetPath <lang><zh-CN>可选可信宿主前缀。</zh-CN><en>Optional trusted host prefix.</en></lang>
 * @returns <lang><zh-CN>无返回值，只追加固定code和安全定位。</zh-CN><en>No return value; appends only fixed codes and safe locations.</en></lang>
 */
function validateKnownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix: string,
  targetPath?: string
): void {
  // <lang><zh-CN>本次调用的查找集合只来自声明字段，不吸收输入对象键。</zh-CN><en>The call-local lookup set comes only from declared fields and never absorbs input keys.</en></lang>
  const allowedFields = new Set(allowed);
  for (const field of Object.keys(record)) {
    if (!allowedFields.has(field)) {
      // <lang><zh-CN>未知键可能是私有路径或标识；公开诊断只定位到已知父节点，不回显任意输入键。</zh-CN><en>Unknown keys may contain private paths or identifiers; public diagnostics locate only the known parent without echoing arbitrary input keys.</en></lang>
      diagnostics.push(createFieldDiagnostic(
        "DOCUMENTATION_PRODUCER_FIELD_UNKNOWN",
        `${prefix} contains a field outside the contract.`,
        prefix,
        targetPath
      ));
    }
  }
}

function isPathLikeFieldName(field: string): boolean {
  return /(?:path|root|directory)$/iu.test(field);
}

/**
 * @lang zh-CN 校验严格身份或开放kind列表的形状/唯一性；错误不回显列表值。
 * @lang en Validates the shape and uniqueness of strict identity or open-kind lists without echoing list values in errors.
 * @param value <lang><zh-CN>未知数组。</zh-CN><en>Unknown array.</en></lang>
 * @param fieldPath <lang><zh-CN>安全字段定位。</zh-CN><en>Safe field location.</en></lang>
 * @param diagnostics <lang><zh-CN>本次验证错误列表。</zh-CN><en>Validation errors for this call.</en></lang>
 * @param targetPath <lang><zh-CN>可选可信前缀。</zh-CN><en>Optional trusted prefix.</en></lang>
 * @param requireNonEmpty <lang><zh-CN>该字段是否至少包含一项。</zh-CN><en>Whether the field requires at least one item.</en></lang>
 * @param allowSlash <lang><zh-CN>默认false；仅kind分类可设true。</zh-CN><en>False by default; true only for kind categories.</en></lang>
 * @returns <lang><zh-CN>无返回值，不修改列表。</zh-CN><en>No return value or list mutation.</en></lang>
 */
function validateIdentifierList(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined,
  requireNonEmpty: boolean,
  allowSlash = false
): void {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be ${requireNonEmpty ? "a non-empty" : "an"} array.`,
      fieldPath,
      targetPath
    ));
    return;
  }
  // <lang><zh-CN>身份集合仅在本列表内检测重复，错误定位用数组序号而不使用值。</zh-CN><en>The identity set detects duplicates within this list only, locating errors by array index rather than value.</en></lang>
  const ids = new Set<string>();
  value.forEach((item, index) => {
    if (allowSlash) {
      validateOpenIdentifier(item, `${fieldPath}[${index}]`, diagnostics, targetPath);
    } else {
      validateIdentifier(item, `${fieldPath}[${index}]`, diagnostics, targetPath);
    }
    if (typeof item === "string") {
      if (ids.has(item)) {
        diagnostics.push(createFieldDiagnostic(
          "DOCUMENTATION_PRODUCER_FIELD_INVALID",
          `${fieldPath} contains a duplicate value.`,
          `${fieldPath}[${index}]`,
          targetPath
        ));
      }
      ids.add(item);
    }
  });
}

function validateIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a lower-case identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateOpenIdentifier(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || !openIdentifierPattern.test(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a lower-case kind identifier.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateNonEmptyString(value: unknown, fieldPath: string, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_FIELD_INVALID",
      `${fieldPath} must be a non-empty string.`,
      fieldPath,
      targetPath
    ));
  }
}

/**
 * @lang zh-CN 按明确列出的字面值匹配契约名或版本，不解析SemVer范围。
 * @lang en Matches explicitly listed literal contract names or versions without interpreting SemVer ranges.
 * @param value <lang><zh-CN>未知wire字段。</zh-CN><en>Unknown wire field.</en></lang>
 * @param expected <lang><zh-CN>单个身份或精确版本闭集。</zh-CN><en>Single identity or closed exact-version set.</en></lang>
 * @param fieldPath <lang><zh-CN>固定字段定位。</zh-CN><en>Fixed field location.</en></lang>
 * @param diagnostics <lang><zh-CN>本次调用的诊断列表。</zh-CN><en>Invocation-local diagnostics list.</en></lang>
 * @param targetPath <lang><zh-CN>可选宿主定位前缀。</zh-CN><en>Optional host location prefix.</en></lang>
 * @returns <lang><zh-CN>无返回值；不匹配时只追加安全错误。</zh-CN><en>No return value; appends a safe error on mismatch.</en></lang>
 */
function validateConst(
  value: unknown,
  expected: string | readonly string[],
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  // <lang><zh-CN>单值与版本闭集使用同一精确比较，错误不回显未知输入值。</zh-CN><en>Single identities and version sets use the same exact comparison; errors never echo unknown input values.</en></lang>
  const allowed = typeof expected === "string" ? [expected] : expected;
  if (typeof value !== "string" || !allowed.includes(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_CONTRACT_UNSUPPORTED",
      `${fieldPath} must be ${allowed.join(" or ")}.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateAbsoluteRuntimePath(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (typeof value !== "string" || (!path.posix.isAbsolute(value) && !path.win32.isAbsolute(value))) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_RUNTIME_PATH_INVALID",
      `${fieldPath} must be an absolute runtime path.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateSafeRelativePath(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (typeof value !== "string" || !isSafeRelativePath(value)) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_PATH_UNSAFE",
      `${fieldPath} must be a safe relative path.`,
      fieldPath,
      targetPath
    ));
  }
}

function validateSafeRelativePathArray(
  value: unknown,
  fieldPath: string,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createFieldDiagnostic(
      "DOCUMENTATION_PRODUCER_PATH_UNSAFE",
      `${fieldPath} must be a non-empty array of safe relative paths.`,
      fieldPath,
      targetPath
    ));
    return;
  }
  value.forEach((item, index) => validateSafeRelativePath(item, `${fieldPath}[${index}]`, diagnostics, targetPath));
}

function isSafeRelativePath(value: string): boolean {
  if (!value || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    return false;
  }
  const normalized = value.replaceAll("\\", "/");
  return !normalized.startsWith("//") &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized) &&
    !normalized.split("/").includes("..");
}

/**
 * @lang zh-CN 检查可枚举值是否由有限JSON数据组成；按当前祖先栈拒绝环，允许共享子对象，不调用JSON序列化钩子。
 * @lang en Checks enumerable values for finite JSON-compatible data; rejects ancestor cycles while allowing shared children, without invoking JSON serialization hooks.
 * @param value <lang><zh-CN>本层待检查值。</zh-CN><en>Value at the current traversal level.</en></lang>
 * @param seen <lang><zh-CN>本次遍历的祖先集合，默认新建，不是全局去重表。</zh-CN><en>Traversal-local ancestor set, newly allocated by default rather than a global deduplication table.</en></lang>
 * @returns <lang><zh-CN>值可表示为本验证层支持的JSON数据时为true。</zh-CN><en>True for JSON-compatible data supported by this validation layer.</en></lang>
 */
function isJsonCompatible(value: unknown, seen = new Set<object>()): boolean {
  // <lang><zh-CN>JSON标量直接判定；数值还须排除NaN和Infinity。</zh-CN><en>Check JSON scalars directly, additionally excluding NaN and Infinity for numbers.</en></lang>
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    // <lang><zh-CN>只把当前数组加入祖先栈，遍历完即移除，避免误拒共享数组。</zh-CN><en>Add only the current array to the ancestor stack and remove it after traversal, avoiding false rejection of shared arrays.</en></lang>
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    // <lang><zh-CN>子项共用当前祖先栈以检测回边，结果只在此分支存活。</zh-CN><en>Children share the current ancestor stack to detect back edges; this result lives only in this branch.</en></lang>
    const compatible = value.every((item) => isJsonCompatible(item, seen));
    seen.delete(value);
    return compatible;
  }
  if (isRecord(value)) {
    // <lang><zh-CN>对象采用同一祖先栈策略；只检查其可枚举字段值，不读取私有资源。</zh-CN><en>Objects use the same ancestor-stack policy, inspecting enumerable field values without reading private resources.</en></lang>
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    // <lang><zh-CN>一项不兼容即短路；返回前恢复祖先集合以允许兄弟节点共享对象。</zh-CN><en>Short-circuit on the first incompatible value and restore the ancestor set before returning so siblings may share objects.</en></lang>
    const compatible = Object.values(value).every((item) => isJsonCompatible(item, seen));
    seen.delete(value);
    return compatible;
  }
  return false;
}

function createFieldDiagnostic(
  code: string,
  message: string,
  fieldPath: string,
  targetPath?: string
): HiaDiagnostic {
  return createProducerDiagnostic(code, message, "error", targetPath, { fieldPath });
}

function createProducerDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: Record<string, unknown>
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, {
    ...(data ? { data } : {}),
    ...(targetPath ? { targetPath } : {})
  });
}

function formatContractDiagnostics(diagnostics: readonly HiaDiagnostic[]): string {
  return diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n");
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * @file
 * @lang zh-CN 显式加载的进程内文档生产器接口与验证/执行门禁；SDK 不发现模块、不读写产物、不管理事务或进程沙箱。
 * @lang en Interfaces and validation/execution gates for explicitly loaded in-process documentation producers; the SDK does not discover modules, access artifacts, manage transactions or sandbox processes.
 */
