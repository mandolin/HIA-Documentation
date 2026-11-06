/**
 * @file
 * @lang zh-CN 显式授权JSON输入的SDK生产器，逐资源处理并以独立目录原子提交整批文件。
 * @lang en SDK producer for explicitly authorized JSON inputs, processing per resource and atomically committing each batch in an independent directory.
 */
import path from "node:path";
import { randomUUID } from "node:crypto";
import { lstat, realpath, open, mkdir, writeFile, rename, rm } from "node:fs/promises";
import {
  defineDocumentationProducer, validateDocumentationProducerResult, DOCUMENTATION_PRODUCER_CONTRACT, DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT, DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  type DocumentationProducer, type DocumentationProducerArtifact, type DocumentationProducerContext,
  type DocumentationProducerRequest, type DocumentationProducerResult
} from "@hia-doc/plugin-sdk";
import { generateJsonDocumentation, assertResourcePath } from "./resource.js";

/**
 * @lang zh-CN JSON资源生产器。每项输入kind=json-resource，path为根内相对路径，locale为实际正文语言；不跟随链接或执行schema引用。
 * @lang en JSON resource producer. Each input uses kind=json-resource, a root-relative path and actual content locale; links are not followed and schema references are not executed.
 */
export const jsonDocumentationProducer: DocumentationProducer = defineDocumentationProducer({
  descriptor: {
    contract: DOCUMENTATION_PRODUCER_CONTRACT, contractVersion: DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
    id: "jsondoc", version: "1.0.0", displayName: "HIA JSON resource documentation",
    inputKinds: ["json-resource"], outputKinds: ["hia-document", "doc-source-map", "json-resource"],
    capabilities: { incremental: false, sourceLinkage: true, watch: false }
  },
  produce: produceJsonResources
});

/**
 * @lang zh-CN 逐项读入资源并写暂存目录，全部成功后重命名提交；失败移除本次暂存，保留既有批次。
 * @lang en Reads resources individually into a staging directory, renaming to commit after complete success; failure removes this staging batch while retaining existing batches.
 * @param request <lang><zh-CN>宿主授权的输入根和输出根，最多100项资源。</zh-CN><en>Host-authorized input/output roots and at most 100 resources.</en></lang>
 * @param context <lang><zh-CN>进度及中止上下文。</zh-CN><en>Progress and cancellation context.</en></lang>
 * @returns <lang><zh-CN>完整批次清单或无产物的安全失败。</zh-CN><en>Complete batch manifest or artifact-free safe failure.</en></lang>
 */
async function produceJsonResources(request: DocumentationProducerRequest, context: DocumentationProducerContext): Promise<DocumentationProducerResult> {
  // <lang><zh-CN>冻结本次所用字符串及输入记录的快照，进度回调修改调用方对象不能扩大已验证读取范围。</zh-CN><en>Snapshot this invocation's strings and input records so progress callbacks mutating caller objects cannot expand the validated read scope.</en></lang>
  request = { ...request, inputs: request.inputs.map(input => ({ ...input })) };
  // <lang><zh-CN>随机批次身份隔离重试和并行调用，最终目录及暂存目录都只由当前调用拥有。</zh-CN><en>A random batch identity isolates retries and concurrent calls; this invocation alone owns both final and staging directories.</en></lang>
  const batch = `jsondoc-${randomUUID()}`;
  const staging = path.join(request.outputDirectory, `.${batch}.tmp`);
  let stagingCreated = false;
  const artifacts: DocumentationProducerArtifact[] = [];
  try {
    if (!request.inputs.length || request.inputs.length > 100) throw new TypeError();
    const seen = new Set<string>();
    for (const input of request.inputs) {
      if (input.kind !== "json-resource" || typeof input.path !== "string" || typeof input.locale !== "string" || (input.language !== undefined && input.language !== "json")) throw new TypeError();
      assertResourcePath(input.path);
      if (seen.has(input.path)) throw new TypeError();
      seen.add(input.path);
    }
    context.signal?.throwIfAborted();
    // <lang><zh-CN>创建前逐层检查既有目录，避免在重定向父目录下产生任何输出。</zh-CN><en>Check existing directory components before creation to avoid producing output under redirected parents.</en></lang>
    await assertPhysicalPath(request.outputDirectory, true);
    await mkdir(request.outputDirectory, { recursive: true });
    await assertPhysicalPath(request.outputDirectory, false);
    await mkdir(staging);
    stagingCreated = true;

    for (const [index, input] of request.inputs.entries()) {
      context.signal?.throwIfAborted();
      context.reportProgress?.({ phase: "json-resource", current: index, total: request.inputs.length });
      context.signal?.throwIfAborted();
      // <lang><zh-CN>一份原文在当前迭代内读取、解析和写入；前一资源的大值树无需常驻内存。</zh-CN><en>Read, parse and write one original resource within this iteration; large trees from earlier resources need not remain resident.</en></lang>
      const bytes = await readAuthorizedResource(request.workspaceRoot, input.path!);
      const result = generateJsonDocumentation(bytes, { path: input.path!, locale: input.locale as string });
      const stem = `resource-${String(index + 1).padStart(3, "0")}`;
      const documentPath = `${stem}.hia.json`;
      const mapPath = `${stem}.doc-source-map.json`;
      const snapshotPath = `${stem}.source.json`;
      // <lang><zh-CN>地图中的产物相对地址以同目录文件为基准，源码身份继续保留授权根内的原路径。</zh-CN><en>Artifact addresses inside the map refer to sibling files, while source identities retain original paths within the authorized root.</en></lang>
      const mappedArtifact = (result.sourceMap.artifacts as Record<string, unknown>[])[0]!;
      mappedArtifact.path = documentPath;
      (mappedArtifact.contractRefs as Record<string, unknown>[])[0]!.path = documentPath;
      (result.document.metadata!.jsonResource as Record<string, unknown>).snapshotPath = snapshotPath;
      await writeFile(path.join(staging, documentPath), JSON.stringify(result.document));
      await writeFile(path.join(staging, mapPath), JSON.stringify(result.sourceMap));
      await writeFile(path.join(staging, snapshotPath), bytes);
      artifacts.push(
        { id: `${stem}-document`, kind: "hia-document", path: `${batch}/${documentPath}`, contract: "hia-core-document", contractVersion: "1.0.0", format: "json", language: "json", mediaType: "application/json" },
        { id: `${stem}-map`, kind: "doc-source-map", path: `${batch}/${mapPath}`, contract: "doc-source-map", contractVersion: "1.1.0", format: "json", language: "json", mediaType: "application/json" },
        { id: `${stem}-source`, kind: "json-resource", path: `${batch}/${snapshotPath}`, format: "json", language: "json", mediaType: "application/json" }
      );
    }
    context.signal?.throwIfAborted();
    // <lang><zh-CN>提交文件前执行SDK结果校验，避免文件已提交而声明因格式错误被宿主拒绝。</zh-CN><en>Validate the SDK result before committing files so malformed declarations cannot cause host rejection after files are committed.</en></lang>
    const result = producerResult("success", artifacts);
    if (validateDocumentationProducerResult(result, { descriptor: jsonDocumentationProducer.descriptor }).some(diagnostic => diagnostic.severity === "error")) throw new TypeError();
    await assertPhysicalPath(request.outputDirectory, false);
    await rename(staging, path.join(request.outputDirectory, batch));
    stagingCreated = false;
    return result;
  } catch {
    // <lang><zh-CN>只清理已由本次调用成功创建的确切暂存目录，输入正文与系统异常原文不进入公开诊断。</zh-CN><en>Clean only the exact staging directory successfully created by this invocation; neither input bodies nor raw system exceptions enter public diagnostics.</en></lang>
    if (stagingCreated) await rm(staging, { recursive: true, force: true });
    return producerResult("failed", []);
  }
}

/**
 * @lang zh-CN 创建固定身份的SDK结果，失败文案不回显路径或资源正文。
 * @lang en Creates an SDK result with fixed identity and failures that echo neither paths nor resource bodies.
 * @param status <lang><zh-CN>整个批次的结果。</zh-CN><en>Outcome of the whole batch.</en></lang>
 * @param artifacts <lang><zh-CN>成功提交的文件声明。</zh-CN><en>Declarations for successfully committed files.</en></lang>
 * @returns <lang><zh-CN>SDK1.0.0结果。</zh-CN><en>SDK 1.0.0 result.</en></lang>
 */
function producerResult(status: "success" | "failed", artifacts: DocumentationProducerArtifact[]): DocumentationProducerResult {
  return {
    contract: DOCUMENTATION_PRODUCER_RESULT_CONTRACT, contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    producer: { id: "jsondoc", version: "1.0.0" }, status, artifacts,
    diagnostics: status === "failed" ? [{ code: "JSONDOC_BATCH_FAILED", severity: "error", message: "JSON resource batch failed validation, cancellation or file processing." }] : []
  };
}

/**
 * @lang zh-CN 逐层拒绝符号链接与目录联接，可选允许尚未创建的目录后缀。
 * @lang en Rejects symlinks and junctions component by component, optionally allowing directory suffixes that do not yet exist.
 * @param target <lang><zh-CN>宿主授权的绝对路径。</zh-CN><en>Host-authorized absolute path.</en></lang>
 * @param allowMissing <lang><zh-CN>创建输出目录前允许缺省后缀。</zh-CN><en>Allows missing suffixes before output-directory creation.</en></lang>
 * @throws {Error} <lang><zh-CN>重定向、非目录父项或文件系统错误。</zh-CN><en>Redirects, nondirectory parents or filesystem errors.</en></lang>
 */
async function assertPhysicalPath(target: string, allowMissing: boolean): Promise<void> {
  // <lang><zh-CN>从卷根开始检查原绝对路径的全部组件，不能用realpath结果替代对链接本身的检查。</zh-CN><en>Check every component of the original absolute path from its volume root; resolving realpath cannot replace inspecting links themselves.</en></lang>
  let current = path.parse(target).root;
  const segments = path.relative(current, target).split(path.sep).filter(Boolean);
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    try {
      const state = await lstat(current);
      if (state.isSymbolicLink() || (index < segments.length - 1 && !state.isDirectory())) throw new TypeError("JSON resource physical path is invalid.");
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

/**
 * @lang zh-CN 从显式授权根读取有界单链接文件，并在打开及读取后核对物理身份。
 * @lang en Reads a bounded single-link file from an explicitly authorized root, checking physical identity after opening and reading.
 * @param root <lang><zh-CN>宿主授权根，先解析为物理目录。</zh-CN><en>Host-authorized root, first resolved to a physical directory.</en></lang>
 * @param relative <lang><zh-CN>已校验的公开相对路径。</zh-CN><en>Validated public relative path.</en></lang>
 * @returns <lang><zh-CN>最多4MiB的独立原始字节。</zh-CN><en>Independent original bytes, at most 4MiB.</en></lang>
 * @throws {Error} <lang><zh-CN>链接、路径重定向、并发变更或超限。</zh-CN><en>Links, redirects, concurrent changes or exceeded limits.</en></lang>
 */
async function readAuthorizedResource(root: string, relative: string): Promise<Buffer> {
  assertResourcePath(relative);
  const base = await realpath(root);
  const file = path.join(base, relative);
  await assertPhysicalPath(file, false);
  const before = await lstat(file);
  if (!before.isFile() || before.nlink !== 1 || before.size > 4 * 1024 * 1024) throw new TypeError("JSON resource physical file is invalid.");
  const handle = await open(file, "r");
  try {
    const opened = await handle.stat();
    if (opened.ino !== before.ino || opened.dev !== before.dev) throw new TypeError("JSON resource changed while opening.");
    // <lang><zh-CN>额外一字节可检测读入期间增长，禁止readFile随输入无限分配。</zh-CN><en>One extra byte detects growth during reads, avoiding unbounded readFile allocations.</en></lang>
    const buffer = Buffer.alloc(Math.min(before.size + 1, 4 * 1024 * 1024 + 1));
    let count = 0;
    while (count < buffer.length) {
      const read = await handle.read(buffer, count, buffer.length - count, null);
      if (!read.bytesRead) break;
      count += read.bytesRead;
    }
    const after = await handle.stat();
    await assertPhysicalPath(file, false);
    const current = await lstat(file);
    if (count !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || after.nlink !== 1 || current.ino !== before.ino || current.dev !== before.dev) throw new TypeError("JSON resource changed while reading.");
    return Buffer.from(buffer.subarray(0, count));
  } finally { await handle.close(); }
}
