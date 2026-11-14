/**
 * @lang zh-CN 用真实生成脚本和受控异步响应验证目录初始化不会覆盖用户检索。
 * @lang en Verify that directory initialization preserves user searches using actual generated scripts and controlled asynchronous responses.
 */
import { Script } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { renderProjectHtmlDocument } from "./index.js";

/** @lang zh-CN 从实际产物提取检索函数与启动表达式，避免复制被测实现。 @lang en Extract search and startup expressions from actual output instead of copying the implementation. */
function generatedSearch() {
  // <lang><zh-CN>两个符号足以生成真实延迟目录与检索运行时，不引入DOM库。</zh-CN><en>Two symbols generate the real lazy-directory/search runtime without a DOM dependency.</en></lang>
  const output = renderProjectHtmlDocument({
    project: { name: "Search startup", locales: ["en"], defaultLocale: "en" },
    entries: [
      { id: "a", name: "alpha", kind: "function", view: "js" },
      { id: "b", name: "beta", kind: "function", view: "js" }
    ]
  });
  const html = output.files.find(file => file.path === "index.html")!.contents;
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gu)].map(match => match[1]).join("\n");
  const source = ts.createSourceFile("generated.js",scripts,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let search = "";
  let startup = "";
  // <lang><zh-CN>按语法节点精确定位两个执行边界，签名或装配改变时直接失败。</zh-CN><en>Locate the two execution boundaries by syntax nodes, failing directly when signatures or assembly change.</en></lang>
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "runSearch") {
      search = node.getText(source);
    }
    if (ts.isExpressionStatement(node) && node.getText(source).startsWith("readJson(config.navigation).then(")) {
      startup = node.getText(source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(search).not.toBe("");
  expect(startup).not.toBe("");
  return { search, startup };
}

/** @lang zh-CN 创建只观察检索树的最小宿主，异步源由测试显式控制。 @lang en Create a minimal host observing only the search tree, with asynchronous sources controlled by each test. */
function host() {
  // <lang><zh-CN>只观察结果文本，DOM呈现另外由真实浏览器验收。</zh-CN><en>Observe only result text; real browsers separately verify DOM presentation.</en></lang>
  const tree = {
    innerHTML: "",
    append(value: unknown) {
      this.innerHTML = JSON.stringify(value);
    }
  };
  const context = {
    search: { value: "alpha" },
    activeView: "all",
    treeHost: tree,
    rootNodes: [],
    config: { navigation: "root" },
    location: { hash: "" },
    renderRoot() { tree.innerHTML = "root"; },
    createTreeList(nodes: unknown) { return nodes; },
    showLoadError() { tree.innerHTML = "error"; },
    ensureSearchIndex: async () => [
      { id: "a", name: "alpha", kind: "function", view: "js", searchText: "alpha" }
    ],
    readJson: async (): Promise<{ children: unknown[] }> => ({ children: [] })
  };
  return { context, tree };
}

describe("generated search startup", () => {
  it("keeps a completed search when initial navigation arrives later", async () => {
    const code = generatedSearch();
    const { context, tree } = host();
    // <lang><zh-CN>人为延后根目录响应，检索先完成，精确重现被覆盖顺序。</zh-CN><en>Delay the root response until after search completes, reproducing the overwrite order exactly.</en></lang>
    let completeNavigation!: (value: { children: unknown[] }) => void;
    const navigation = new Promise<{ children: unknown[] }>(resolve => {
      completeNavigation = resolve;
    });
    context.readJson = () => navigation;
    const startup = new Script(code.search + "\n" + code.startup).runInNewContext(context) as Promise<unknown>;
    await new Script("runSearch()").runInNewContext(context);
    expect(tree.innerHTML).toContain("alpha");
    completeNavigation({ children: [] });
    await startup;
    expect(tree.innerHTML).toContain("alpha");
  });
});
