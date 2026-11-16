/**
 * @file
 * @lang zh-CN 显式发布历史的有界文件读取与输出换向前检，原生源码和相邻文件均不由历史授权。
 * @lang en Bounded explicit history-file reads and output-redirection preflight, without authorizing native sources or neighboring files.
 */
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import { assertDocumentationProjectRouteHistory, type DocumentationProjectRouteHistory } from "@hia-doc/renderer-html";
import type { CliIo } from "./index.js";

/**
 * @lang zh-CN 只把不存在作为可创建状态，其余文件系统失败直接拒绝。
 * @lang en Treat only absence as a creatable state, rejecting other filesystem failures.
 */
async function optionalState(file: string) {
  try { return await lstat(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
}

/**
 * @lang zh-CN 静态核历史新增文件和已有祖先，复用普通文件允许重建；并发换向沿既有writer边界。
 * @lang en Statically check added historical files and existing ancestors, allowing ordinary-file rebuilds under the existing writer's concurrent-swap boundary.
 */
async function checkHistoryDestinations(output: string, history: DocumentationProjectRouteHistory): Promise<void> {
  // <lang><zh-CN>只遍历本功能将写的地址，祖先缓存避免大型历史逐项重复stat。</zh-CN><en>Inspect only addresses written by this feature, caching ancestors to avoid repeated stats for large histories.</en></lang>
  const checked = new Set<string>();
  const files = [...history.pathAliases.map(route => route.path), "route-history.json", ...(history.pathAliases.some(route => route.kind === "page") ? ["assets/hia-route-history.js"] : [])];
  for (const file of files) {
    const target = path.resolve(output, file);
    const state = await optionalState(target);
    if (state && (state.isSymbolicLink() || !state.isFile() || state.nlink !== 1)) throw new TypeError("history output file");
    let directory = path.dirname(target);
    while (!checked.has(directory)) {
      const parentState = await optionalState(directory);
      if (parentState && (parentState.isSymbolicLink() || !parentState.isDirectory())) throw new TypeError("history output ancestor");
      checked.add(directory);
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
}

/**
 * @lang zh-CN 读取调用方唯一显式历史输入，严格UTF-8/16MiB并核新增输出地址；失败只回公开固定诊断。
 * @lang en Read the caller's single explicit history input under strict UTF-8/16 MiB bounds and check added destinations, reporting fixed public diagnostics on failure.
 * @param file <lang><zh-CN>调用方解析后的明确绝对文件路径。</zh-CN><en>Caller-resolved explicit absolute file path.</en></lang>
 * @param output <lang><zh-CN>本次输出根，不创建目录。</zh-CN><en>This output root, without creating directories.</en></lang>
 * @param io <lang><zh-CN>只接收固定错误码和说明。</zh-CN><en>Receives fixed error codes and explanations only.</en></lang>
 * @returns <lang><zh-CN>有效登记；失败为undefined，未开始渲染。</zh-CN><en>Valid registry, or undefined before rendering on failure.</en></lang>
 */
export async function loadProjectRouteHistory(file: string, output: string, io: CliIo): Promise<DocumentationProjectRouteHistory | undefined> {
  try {
    const state = await lstat(file);
    if (!state.isFile() || state.isSymbolicLink()) throw new TypeError("history input file");
    const handle = await open(file, "r");
    let value: unknown;
    try {
      // <lang><zh-CN>上限加一字节区分精确EOF与超限，短读继续直到EOF。
      // </zh-CN><en>Read one byte beyond the bound to distinguish exact EOF from overflow, continuing short reads until EOF.</en></lang>
      const limit = 16 * 1024 * 1024;
      const openedState = await handle.stat();
      if (!openedState.isFile() || openedState.size > limit) throw new TypeError("history size");
      const buffer = Buffer.alloc(limit + 1);
      let length = 0;
      while (length < buffer.length) {
        const chunk = await handle.read(buffer, length, buffer.length - length, length);
        if (!chunk.bytesRead) break;
        length += chunk.bytesRead;
      }
      if (length > limit) throw new TypeError("history size");
      value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)));
    } finally { await handle.close(); }
    assertDocumentationProjectRouteHistory(value);
    await checkHistoryDestinations(output, value);
    return value;
  } catch {
    io.stderr("[error:HIA_CLI_ROUTE_HISTORY_INPUT_INVALID] Publication history requires a regular explicit UTF-8 file within 16 MiB, a valid history contract, and ordinary output paths.");
    return undefined;
  }
}
