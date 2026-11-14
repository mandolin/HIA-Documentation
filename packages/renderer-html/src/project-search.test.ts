/**
 * @file
 * @lang zh-CN 执行真实生成的检索函数，核索引拒绝、共享请求、并发查询与恢复。
 * @lang en Execute emitted search functions to verify index rejection, shared requests, concurrent queries and recovery.
 */
import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { renderProjectHtmlDocument } from "./index.js";
import { createGeneratedSiteNavigation } from "../../../site/src/lib/generated-navigation.mjs";

/**
 * @lang zh-CN 从正常Portal输出取得本轮实际运行的函数文本。
 * @lang en Obtain the actual function text from normal Portal output.
 * @param name <lang><zh-CN>固定内部检索函数名。</zh-CN><en>Fixed internal search function name.</en></lang>
 * @returns <lang><zh-CN>实际生成函数。</zh-CN><en>Emitted function.</en></lang>
 */
function emitted(name: string): string {
  const output = renderProjectHtmlDocument({ project: { name: "Search fixture", defaultLocale: "en", locales: ["en", "zh-CN"] }, entries: [{ id: "entry:one", name: "one", kind: "function", view: "js" }] }, { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: createGeneratedSiteNavigation() } });
  const shell = output.files.find(file => file.path === "index.html")!.contents;
  // <lang><zh-CN>发布HTML会压缩换行，以既有TypeScript解析器读取实际函数边界。</zh-CN><en>Published HTML compresses newlines, so use the existing TypeScript parser to read actual function boundaries.</en></lang>
  const script = [...shell.matchAll(/<script>([\s\S]*?)<\/script>/gu)].find(match => match[1]!.includes(`async function ${name}(`))![1]!;
  const source = ts.createSourceFile("emitted.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let found = "";
  /** @lang zh-CN 只定位命名声明，不执行其它生成脚本。 @lang en Locate the named declaration without executing other emitted scripts. */
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(found).not.toBe("");
  return found;
}

describe("generated project search", () => {
  it("rejects an invalid entries collection instead of presenting an empty result", async () => {
    const read = runInNewContext(`(${emitted("ensureSearchIndex")})`, { searchEntries: null, searchIndexPromise: null, config: { search: "search/index.json" }, readJson: async () => ({ entries: {} }) });
    await expect(read()).rejects.toThrow("Search index unavailable.");
  });

  it("shares in-flight reads, retains a successful index and retries failed reads with a fixed public error", async () => {
    // <lang><zh-CN>合成错误含不应回显的标记，失败后同一读取器必须可以显式重试。</zh-CN><en>The synthetic failure contains a marker that must not be reflected, and the same reader must allow an explicit retry.</en></lang>
    let reads = 0;
    let resolve!: (value: unknown) => void;
    const response = new Promise(accept => { resolve = accept; });
    const context = { searchEntries: null, searchIndexPromise: null, config: { search: "search/index.json" }, readJson: () => { reads++; return response; } };
    const read = runInNewContext(`(${emitted("ensureSearchIndex")})`, context);
    const first = read();
    const second = read();
    expect(reads).toBe(1);
    resolve({ entries: [] });
    expect(await first).toEqual([]);
    expect(await second).toEqual([]);
    await read();
    expect(reads).toBe(1);
    context.searchEntries = null;
    context.readJson = async () => { throw new Error("RT12_PRIVATE_RESPONSE_DETAIL"); };
    await expect(read()).rejects.toThrow(/^Search index unavailable\.$/u);
    context.readJson = async () => ({ entries: [] });
    expect(await read()).toEqual([]);
  });

  it("keeps the newest query after an older index response and ignores failures after clearing", async () => {
    const children: unknown[] = [];
    const errors: unknown[] = [];
    const treeHost = { set innerHTML(_value: string) { children.length = 0; }, append(value: unknown) { children.push(value); } };
    const requests: Array<{ resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
    const search = { value: "older" };
    const context = { search, contentHost: null, searchSequence: 0, activeView: "all", treeHost, ensureSearchIndex: () => new Promise((resolve, reject) => { requests.push({ resolve, reject }); }), renderRoot() { children.splice(0, children.length, "root"); }, createTreeList(nodes: unknown[]) { return nodes; }, showLoadError(error: unknown) { errors.push(error); }, document: { createElement() { return { dataset: {}, setAttribute() {}, textContent: "" }; } }, uiMessage() { return "No matches"; } };
    const run = runInNewContext(`(${emitted("runSearch")})`, context);
    const older = run();
    search.value = "newer";
    const newer = run();
    requests[1]!.resolve([{ id: "new", name: "newer", kind: "function", view: "js", searchText: "newer", contentPath: "entries/new.html" }]);
    await newer;
    requests[0]!.resolve([{ id: "old", name: "older", kind: "function", view: "js", searchText: "older", contentPath: "entries/old.html" }]);
    await older;
    expect(children).toEqual([[expect.objectContaining({ id: "new" })]]);
    search.value = "failing";
    const failed = run();
    search.value = "";
    await run();
    requests[2]!.reject(new Error("Old failure"));
    await failed;
    expect(children).toEqual(["root"]);
    expect(errors).toEqual([]);
  });
});
