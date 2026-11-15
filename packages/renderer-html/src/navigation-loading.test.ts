/**
 * @file
 * @lang zh-CN 真实生成Portal的正文关键路径、祖先去重和异步选择顺序回归。
 * @lang en Regressions for the actual generated Portal's prose critical path, deduplicated ancestors and asynchronous selection order.
 */
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { renderProjectHtmlDocument } from "./index.js";
import { createGeneratedSiteNavigation } from "../../../site/src/lib/generated-navigation.mjs";

/**
 * @lang zh-CN 从实际产物读取函数和路由初始化，保持父子同页及原生条目标识。
 * @lang en Read functions and route initialization from actual output, retaining same-page parent/member placement and native identities.
 */
function generatedNavigation() {
  // <lang><zh-CN>两个同页节点及一个同级节点覆盖祖先共享和不同呈现位置。</zh-CN><en>Two same-page nodes and a sibling cover shared ancestors and distinct presentation locations.</en></lang>
  const result = renderProjectHtmlDocument({
    project: { name: "Loading fixture", defaultLocale: "en", locales: ["en", "zh-CN"] },
    entries: [
      { id: "parent", symbolId: "symbol:parent", name: "Parent", kind: "class", view: "js" },
      { id: "child", symbolId: "symbol:child", name: "child", kind: "method", view: "js", hierarchy: { parentSymbolId: "symbol:parent" } },
      { id: "sibling", name: "sibling", kind: "function", view: "js" }
    ]
  }, { projectSite: { uiLocale: "en", informationArchitecture: { memberPlacement: "with-parent" }, siteNavigation: createGeneratedSiteNavigation() } });
  const html = result.files.find(file => file.path === "index.html")!.contents;
  const client = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].find(match => match[1]!.includes("function loadEntry("))![1]!;
  const source = ts.createSourceFile("generated.js", client, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = new Map<string, string>();
  let startup = "";
  let initial = "";
  /** @lang zh-CN 保留实际语法节点，避免以测试实现替代运行时代码。 @lang en Preserve actual syntax nodes instead of substituting a test implementation. */
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node.getText(source));
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer.getText(source));
    if (ts.isExpressionStatement(node) && node.getText(source).startsWith("readingNavigation = readJson(")) startup = node.getText(source);
    if (ts.isTryStatement(node) && node.getText(source).includes("void openReadingEntry(decodeURIComponent(")) initial = node.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { result, html, declarations, startup, initial };
}

/** @lang zh-CN 执行实际路由元数据，仅用受控宿主观察正文调用与索引读取。 @lang en Execute actual route metadata with a controlled host observing prose calls and index reads. */
function readingHost() {
  const output = generatedNavigation();
  const source = output.declarations.get("openReadingEntry");
  expect(source).toBeDefined();
  const routes = output.declarations.get("readingEntries");
  expect(routes).toBeDefined();
  const readingEntries = runInNewContext(routes!);
  const calls: Array<{ entry: { id: string; entryId: string; contentPath?: string; presentationPath?: string }; updateHash: boolean }> = [];
  const errors: unknown[] = [];
  const context = {
    readingEntries,
    readingEntrySequence: 0,
    ensureSearchIndex: vi.fn(async (): Promise<unknown[]> => { throw new Error("Index intentionally unavailable"); }),
    async loadEntry(entry: typeof calls[number]["entry"], updateHash: boolean) {
      context.readingEntrySequence++;
      calls.push({ entry, updateHash });
    },
    showLoadError(error: unknown) { errors.push(error); }
  };
  const open = runInNewContext(`(${source})`, context) as (entryId: string, updateHash: boolean) => Promise<void>;
  return { output, context, calls, errors, open };
}

describe("generated reading entry loading", () => {
  it("starts a known deep link before the root navigation resolves", async () => {
    const output = generatedNavigation();
    expect(output.startup).not.toBe("");
    expect(output.initial).not.toBe("");
    // <lang><zh-CN>目录挂起时直接观察原启动代码的调用，正文选择无需目录响应。</zh-CN><en>Observe the emitted bootstrap while navigation is gated, proving selection does not need its response.</en></lang>
    let complete!: (value: { children: unknown[] }) => void;
    const navigation = new Promise<{ children: unknown[] }>(resolve => { complete = resolve; });
    const openReadingEntry = vi.fn(async () => {});
    const context = { readingNavigation: Promise.resolve(), readJson: () => navigation, config: { navigation: "root" }, rootNodes: [],
      runSearch: async () => {}, showLoadError: vi.fn(), location: { hash: "#entry=child" }, openReadingEntry };
    runInNewContext(output.startup + "\n" + output.initial, context);
    expect(openReadingEntry).toHaveBeenCalledWith("child", false);
    complete({ children: [] });
    await context.readingNavigation;
  });

  it("opens a known member through its exact presentation without reading search", async () => {
    const { output, context, calls, errors, open } = readingHost();
    const index = JSON.parse(output.result.files.find(file => file.path === "project-index.json")!.contents);
    const expected = index.entries.find((entry: { id: string }) => entry.id === "child");
    await open("child", false);
    expect(context.ensureSearchIndex).not.toHaveBeenCalled();
    expect(calls).toEqual([{ entry: expect.objectContaining({ id: "child", entryId: "child", contentPath: expected.contentPath, presentationPath: expected.presentationPath }), updateHash: false }]);
    expect(errors).toEqual([]);
  });

  it("keeps the existing search-index fallback for an unknown route", async () => {
    const { context, calls, open } = readingHost();
    context.ensureSearchIndex.mockResolvedValue([{ id: "compatibility", contentPath: "entries/compatibility.html" }]);
    await open("compatibility", true);
    expect(context.ensureSearchIndex).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{ entry: { id: "compatibility", entryId: "compatibility", contentPath: "entries/compatibility.html" }, updateHash: true }]);
  });

  it.each([false, true])("ignores an older fallback after a newer known selection (failure %s)", async failed => {
    const { context, calls, errors, open } = readingHost();
    // <lang><zh-CN>兼容查询先挂起，随后已知条目完成，旧成功与旧失败都失去本次选择所有权。</zh-CN><en>Suspend compatibility lookup before completing a known entry, invalidating both older success and older failure.</en></lang>
    let accept!: (entries: unknown[]) => void;
    let reject!: (reason: Error) => void;
    const pending = new Promise<unknown[]>((resolve, decline) => { accept = resolve; reject = decline; });
    context.ensureSearchIndex.mockReturnValue(pending);
    const older = open("older", false);
    await open("parent", true);
    if (failed) reject(new Error("Old lookup failed"));
    else accept([{ id: "older", contentPath: "entries/older.html" }]);
    await older;
    expect(calls.map(call => call.entry.id)).toEqual(["parent"]);
    expect(errors).toEqual([]);
  });

  it("stores each ancestor once while retaining exact parent chains and generated routes", () => {
    const output = generatedNavigation();
    const parents = runInNewContext(output.declarations.get("readingParents")!) as Array<{ id: string; parent: number; path: string }>;
    const entries = runInNewContext(output.declarations.get("readingEntries")!) as Map<string, { parent: number; contentPath: string }>;
    expect(new Set(parents.map(parent => parent.id)).size).toBe(parents.length);
    expect(entries.size).toBe(3);
    const index = JSON.parse(output.result.files.find(file => file.path === "project-index.json")!.contents);
    for (const entry of index.entries) expect(entries.get(entry.id)?.contentPath).toBe(entry.contentPath);
    const child = entries.get("child")!;
    const chain: string[] = [];
    for (let parent = child.parent; parent >= 0; parent = parents[parent]!.parent) {
      chain.unshift(parents[parent]!.id);
      expect(output.result.files.some(file => file.path === parents[parent]!.path)).toBe(true);
    }
    expect(chain[0]).toBe("view:js");
    expect(chain.some(identity => identity.includes("parent"))).toBe(true);
    expect(output.html).not.toContain("const readingPaths = new Map(");
  });

  it("uses confirmed source-path typography only on adopted pages", () => {
    const output = generatedNavigation();
    const style = output.result.files.find(file => file.path === "assets/hia-site-navigation.css")!.contents;
    expect(style).toContain('[data-hia-site-navigation] :is(.hia-source-preview,.hia-source-fragment) summary{font-family:Consolas,monospace}');
  });

  it("stops stale ancestor restoration before touching the current tree", async () => {
    const output = generatedNavigation();
    const inspect = vi.fn(() => []);
    const reveal = runInNewContext(`(${output.declarations.get("revealReadingEntry")})`, {
      readingEntries: runInNewContext(output.declarations.get("readingEntries")!),
      readingParents: runInNewContext(output.declarations.get("readingParents")!),
      readingEntrySequence: 2, treeHost: { querySelectorAll: inspect }
    });
    await reveal("child", 1);
    expect(inspect).not.toHaveBeenCalled();
  });
});
