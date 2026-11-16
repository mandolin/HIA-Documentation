/**
 * @file
 * @lang zh-CN 持久发布身份、旧地址恢复与首写前拒绝的正常API回归。
 * @lang en Normal-API regressions for persistent publication identity, historical routes and rejection before the first write.
 */
import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { renderProjectHtmlDocument, renderProjectHtmlDocumentToWriter, type RenderHtmlOptions, type RenderProjectHtmlInput } from "./index.js";
import { createGeneratedSiteNavigation } from "../../../site/src/lib/generated-navigation.mjs";
import { withSiteNavigation } from "./site-navigation-chrome.js";

/** @lang zh-CN 将当前原生声明绑定到持久页面，并显式保留已发布地址。
 * @lang en Bind the current native declaration to a persistent page and retain explicit published routes.
 */
function history() {
  return {
    contract: "documentation-project-route-history", contractVersion: "0.1.0-draft", projectId: "project:public",
    sources: [{ repository: "owner/public", commit: "a".repeat(40), locale: "en", indexSha256: "b".repeat(64) }],
    bindings: [{ view: "js", symbolId: "native:current", entryId: "published:stable" }],
    entryAliases: [{ entryId: "published:old", canonicalEntryId: "published:stable" }],
    pathAliases: [
      { path: "entries/legacy.html", kind: "fragment", entryId: "published:stable", anchors: [{ id: "published:old", targetId: "published:stable" }, { id: "published:old--summary", targetId: "published:stable--summary" }] },
      { path: "pages/legacy.html", kind: "page", entryId: "published:stable", anchors: [{ id: "published:old--summary", targetId: "published:stable--summary" }] }
    ]
  };
}

/** @lang zh-CN 新原生声明不承担公网永久身份。
 * @lang en The new native declaration does not own the permanent public identity.
 */
function input(): RenderProjectHtmlInput {
  return { project: { id: "project:public", name: "Public API", defaultLocale: "en", locales: ["en", "zh-CN"] }, entries: [{ id: "generated:current", symbolId: "native:current", name: "current", kind: "function", view: "js", signature: "current(): void", summary: "Current public prose" }] };
}

/** @lang zh-CN 候选选项复用正式导航工厂，兼容层是唯一新增选择。
 * @lang en Reuse the official navigation factory with history as the only new selection.
 */
function options(value = history()): RenderHtmlOptions {
  return { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: createGeneratedSiteNavigation(), routeHistory: value } } as RenderHtmlOptions;
}

describe("documentation-project-route-history@0.1.0-draft", () => {
  it.each([true, false])("resolves a legacy hash without search, shared navigation %s", async shared => {
    const record = history();
    const selected = options(record);
    if (!shared) {
      delete selected.projectSite!.siteNavigation;
      for (const route of record.pathAliases) route.anchors = route.anchors.filter(anchor => anchor.targetId === "published:stable");
    }
    const result = renderProjectHtmlDocument(input(), selected);
    const html = result.files.find(file => file.path === "index.html")!.contents;
    const source = ts.createSourceFile("generated.js", [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].map(match => match[1]).join("\n"), ts.ScriptTarget.Latest, true);
    let declaration = "";
    /** @lang zh-CN 读取真实发出的函数，不替换其查询与排序逻辑。
     * @lang en Read the actual emitted function without replacing lookup or ordering logic.
     */
    function visit(node: ts.Node): void {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "openReadingEntry") declaration = node.getText(source);
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(declaration).not.toBe("");
    const loadEntry = vi.fn(async () => {});
    const ensureSearchIndex = vi.fn(async () => { throw Error("Search must remain unused"); });
    const showLoadError = vi.fn();
    const open = runInNewContext(`${declaration}; openReadingEntry`, {
      readingEntrySequence: 0, readingAliases: new Map([["published:old", "published:stable"]]),
      readingEntries: new Map([["published:stable", { contentPath: "entries/current.html" }]]),
      loadEntry, ensureSearchIndex, showLoadError
    });
    await open("published:old", false);
    expect(loadEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "published:stable", entryId: "published:stable" }), true);
    expect(ensureSearchIndex).not.toHaveBeenCalled();
    expect(showLoadError).not.toHaveBeenCalled();
  });

  it("omits all history outputs when adoption is absent", () => {
    const result = renderProjectHtmlDocument(input());
    const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
    expect(index.entries[0].id).toBe("generated:current");
    expect(result.files.some(file => file.path.includes("route-history"))).toBe(false);
  });

  it("rejects case-colliding historical paths and current files before writing", async () => {
    const duplicate = history();
    duplicate.pathAliases.push({ ...duplicate.pathAliases[0]!, path: "entries/LEGACY.html" });
    expect(() => renderProjectHtmlDocument(input(), options(duplicate))).toThrow("HIA_PROJECT_ROUTE_HISTORY_INVALID");
    const normal = renderProjectHtmlDocument(input(), options());
    const index = JSON.parse(normal.files.find(file => file.path === "project-index.json")!.contents);
    const actual = index.entries[0].contentPath as string;
    const collision = history();
    collision.pathAliases[0]!.path = actual.slice(0, actual.lastIndexOf("/") + 1) + actual.slice(actual.lastIndexOf("/") + 1, -5).toUpperCase() + ".html";
    const write = vi.fn();
    await expect(renderProjectHtmlDocumentToWriter(input(), { writeFile: write }, options(collision))).rejects.toThrow("HIA_PROJECT_ROUTE_HISTORY_INVALID");
    expect(write).not.toHaveBeenCalled();
  });

  it("compacts only generator-owned static messages while retaining prose, layout and runtime markers", () => {
    const source = [{ path: "pages/example.html", contents: '<!doctype html><html lang="en"><head></head><body><main><article><h1>Example</h1><p><span>Author content</span></p></article></main></body></html>', contentType: "text/html", role: "entry" as const }];
    const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", "/HIA-Documentation-API/");
    const normal = [...withSiteNavigation(source, navigation, "en")][0]!.contents;
    const compact = [...withSiteNavigation(source, navigation, "en", [], [], true)][0]!.contents;
    const text = (html: string) => html.replace(/<[^>]+>/gu, "");
    expect(text(compact)).toBe(text(normal));
    expect(compact.length).toBeLessThan(normal.length - 200);
    expect(compact).toContain("<span>Author content</span>");
    expect(compact).toContain('class="hia-site-title"');
    const output = renderProjectHtmlDocument(input(), options());
    expect(output.files.find(file => file.path === "index.html")!.contents).toContain("data-hia-ui-message");
  });

  it("pins publication identity while retaining native symbols and caller input", () => {
    const project = input();
    const output = renderProjectHtmlDocument(project, options());
    const index = JSON.parse(output.files.find(file => file.path === "project-index.json")!.contents);
    expect(index.entries[0]).toMatchObject({ id: "published:stable", symbolId: "native:current" });
    expect(project.entries[0].id).toBe("generated:current");
    expect(output.files.some(file => file.path === "route-history.json")).toBe(true);
    expect(output.files.find(file => file.path === "index.html")!.contents).toContain('"published:old","published:stable"');
  });

  it("emits actual legacy prose and a progressive section-recovery page", () => {
    const output = renderProjectHtmlDocument(input(), options());
    const fragment = output.files.find(file => file.path === "entries/legacy.html")!.contents;
    expect(fragment).toContain('id="published:old"');
    expect(fragment).toContain("Current public prose");
    expect(fragment).not.toContain('http-equiv="refresh"');
    const page = output.files.find(file => file.path === "pages/legacy.html")!.contents;
    expect(page).toContain("This link has moved");
    expect(page).toContain('id="published:old--summary"');
    expect(page).toContain("Read the current section");
    expect(page).toContain("assets/hia-route-history.js");
    expect(output.files.find(file => file.path === "assets/hia-route-history.js")!.contents).toContain("location.replace");
    expect(page).toContain("data-hia-site-navigation");
    expect(page).not.toContain('class="hia-site-mobile-outline"');
    expect(page).not.toContain('http-equiv="refresh"');
  });

  it("retains the same public ID through another native generation", () => {
    const project = input();
    project.entries[0].id = "generated:next";
    project.entries[0].symbolId = "native:next";
    const record = history();
    record.bindings[0].symbolId = "native:next";
    const output = renderProjectHtmlDocument(project, options(record));
    const index = JSON.parse(output.files.find(file => file.path === "project-index.json")!.contents);
    expect(index.entries[0]).toMatchObject({ id: "published:stable", symbolId: "native:next" });
  });

  it.each([
    ["unknown version", (value: ReturnType<typeof history>) => { value.contractVersion = "9.0.0"; }],
    ["unknown property", (value: ReturnType<typeof history>) => { Object.assign(value, { guessed: true }); }],
    ["wrong project", (value: ReturnType<typeof history>) => { value.projectId = "project:other"; }],
    ["missing binding", (value: ReturnType<typeof history>) => { value.bindings[0].symbolId = "native:absent"; }],
    ["duplicate binding", (value: ReturnType<typeof history>) => { value.bindings.push({ ...value.bindings[0] }); }],
    ["dangling alias", (value: ReturnType<typeof history>) => { value.entryAliases[0].canonicalEntryId = "missing"; }],
    ["shadowed canonical", (value: ReturnType<typeof history>) => { value.entryAliases[0].entryId = "published:stable"; }],
    ["alias cycle", (value: ReturnType<typeof history>) => { value.entryAliases.push({ entryId: "published:stable", canonicalEntryId: "published:old" }); }],
    ["path traversal", (value: ReturnType<typeof history>) => { value.pathAliases[0].path = "entries/../../outside.html"; }],
    ["encoded traversal", (value: ReturnType<typeof history>) => { value.pathAliases[0].path = "entries/%2e%2e/outside.html"; }],
    ["index collision", (value: ReturnType<typeof history>) => { value.pathAliases[0].path = "pages/index.html"; }],
    ["duplicate path", (value: ReturnType<typeof history>) => { value.pathAliases.push({ ...value.pathAliases[0] }); }],
    ["missing section", (value: ReturnType<typeof history>) => { value.pathAliases[0].anchors[0].targetId = "not-a-current-anchor"; }]
  ])("rejects %s before the first writer call", async (_name, mutate) => {
    const record = history();
    mutate(record);
    const writes: string[] = [];
    await expect(renderProjectHtmlDocumentToWriter(input(), async file => { writes.push(file.path); }, options(record))).rejects.toThrow(/HIA_PROJECT_ROUTE_HISTORY_INVALID/u);
    expect(writes).toEqual([]);
  });

  it("requires the actual identity scope", () => {
    const project = input();
    project.entries[0].identityScope = "another-owner";
    expect(() => renderProjectHtmlDocument(project, options())).toThrow(/HIA_PROJECT_ROUTE_HISTORY_INVALID/u);
  });

  it("isolates lazy history from caller mutation during writes", async () => {
    const record = history();
    const files: Array<{ path: string; contents: string }> = [];
    await renderProjectHtmlDocumentToWriter(input(), async file => {
      files.push(file);
      record.pathAliases[1].path = "pages/changed-after-start.html";
      record.entryAliases[0].canonicalEntryId = "missing";
    }, options(record));
    expect(files.find(file => file.path === "pages/legacy.html")?.contents).toContain("Read the current section");
    expect(files.some(file => file.path === "pages/changed-after-start.html")).toBe(false);
  });

  it("rejects a binding that captures another public entry", () => {
    const project = input();
    project.entries.push({ id: "published:stable", name: "another", kind: "class", view: "js", symbolId: "native:another" });
    expect(() => renderProjectHtmlDocument(project, options())).toThrow(/HIA_PROJECT_ROUTE_HISTORY_INVALID/u);
  });

  it("retains native parentage and source-map references while projecting graph entries", () => {
    const project = input();
    project.entries[0].docSourceMap = { path: "api.docmap.json", entryId: "entry:native:current" };
    project.relationGraph = { contract: "hia-project-relation-graph", contractVersion: "0.1.0-draft", nodeCount: 1, relationCount: 0, nodes: [{ id: "graph:caller", kind: "entry", label: "Current", entryId: "generated:current" }], relations: [] };
    const result = renderProjectHtmlDocument(project, options());
    const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
    expect(index.entries[0].docSourceMap.entryId).toBe("entry:native:current");
    const graph = JSON.parse(result.files.find(file => file.path === "relations/project.json")!.contents);
    expect(graph.nodes[0]).toMatchObject({ id: "graph:caller", entryId: "published:stable" });
    expect(project.relationGraph.nodes[0].entryId).toBe("generated:current");
  });

  it("canonicalizes history collection order without changing the caller", () => {
    const first = history();
    first.entryAliases.push({ entryId: "published:older", canonicalEntryId: "published:stable" });
    const second = structuredClone(first);
    second.entryAliases.reverse();
    second.pathAliases.reverse();
    for (const route of second.pathAliases) route.anchors.reverse();
    expect(renderProjectHtmlDocument(input(), options(first)).files).toEqual(renderProjectHtmlDocument(input(), options(second)).files);
    expect(second.pathAliases[0].path).toBe("pages/legacy.html");
  });

  it("localizes a historical page through its explicit current locale", () => {
    const record = history();
    Object.assign(record.pathAliases[1], { path: "pages/zh-CN/legacy.html", uiLocale: "zh-CN" });
    const result = renderProjectHtmlDocument(input(), options(record));
    const page = result.files.find(file => file.path === "pages/zh-CN/legacy.html")!.contents;
    expect(page).toContain("旧链接已迁移");
    expect(page).toContain("阅读当前小节");
    expect(page).toContain("摘要");
  });

  it("rejects a locale path without its explicit locale declaration", () => {
    const record = history();
    record.pathAliases[1].path = "pages/zh-CN/legacy.html";
    expect(() => renderProjectHtmlDocument(input(), options(record))).toThrow(/HIA_PROJECT_ROUTE_HISTORY_INVALID/u);
  });

  it("rejects actual canonical file collisions", () => {
    const record = history();
    record.pathAliases = [];
    const result = renderProjectHtmlDocument(input(), options(record));
    const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
    record.pathAliases = history().pathAliases;
    record.pathAliases[0].path = index.entries[0].contentPath;
    expect(() => renderProjectHtmlDocument(input(), options(record))).toThrow(/HIA_PROJECT_ROUTE_HISTORY_INVALID/u);
  });

  it("keeps HTML and executable script boundaries for hostile legacy spelling", () => {
    const record = history();
    const hostile = '</script><img src=x onerror="bad()">';
    record.entryAliases[0].entryId = hostile;
    record.pathAliases[0].anchors[0].id = hostile;
    const result = renderProjectHtmlDocument(input(), options(record));
    expect(result.files.find(file => file.path === "index.html")!.contents).not.toContain(hostile);
    const fragment = result.files.find(file => file.path === "entries/legacy.html")!.contents;
    expect(fragment).not.toContain('<img src=x');
    expect(fragment).toContain("&lt;/script&gt;");
  });
});
