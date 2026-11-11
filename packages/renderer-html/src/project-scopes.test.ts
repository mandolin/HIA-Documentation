/**
 * @file
 * @lang zh-CN 直接渲染API的作用域、视图与无授权源码边界回归。
 * @lang en Scope, view and unauthorized-source regressions for the direct rendering API.
 */
import {expect, it} from "vitest";
import {renderProjectHtmlDocument, renderProjectHtmlDocumentToWriter, type RenderProjectEntry} from "./index.js";

it("keeps a child from borrowing another scope's parent", () => {
  const entries: RenderProjectEntry[] = [
    {id: "alpha-parent", symbolId: "class:Parent", identityScope: "owner:alpha", view: "js", kind: "class", name: "Alpha parent"},
    {id: "beta-child", symbolId: "method:run", identityScope: "owner:beta", view: "js", kind: "method", name: "Beta child", hierarchy: {parentSymbolId: "class:Parent"}}
  ];
  const result = renderProjectHtmlDocument({project: {name: "Fixture"}, entries}, {projectSite: {source: {presentation: "none"}}});
  const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
  expect(index.entries).toHaveLength(2);
  expect(result.diagnostics.some(item => item.code === "HIA_RENDER_PROJECT_PARENT_UNRESOLVED")).toBe(true);
  const parent = result.files.find(file => file.path === index.entries.find((entry: any) => entry.id === "alpha-parent").contentPath)!;
  expect(parent.contents).not.toContain("Beta child");
  expect(result.files.filter(file => file.path.startsWith("source-assets/"))).toHaveLength(0);
});

it("keeps equal native IDs separate across explicitly scoped views", () => {
  const entries: RenderProjectEntry[] = ["js", "css"].map(view => ({id: view, symbolId: "shared", identityScope: "owner:alpha", view: view as "js" | "css", kind: "member", name: view}));
  const result = renderProjectHtmlDocument({project: {name: "Fixture"}, entries}, {projectSite: {source: {presentation: "none"}}});
  const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
  expect(index.entries.map((entry: any) => entry.view).sort()).toEqual(["css", "js"]);
});

it.each(["../private", "", "a".repeat(257)])("refuses malformed scopes before writer calls", async identityScope => {
  const writes: string[] = [];
  await expect(renderProjectHtmlDocumentToWriter({project: {name: "Fixture"}, entries: [{id: "entry", name: "entry", kind: "member", view: "js", identityScope}]},
    file => {writes.push(file.path);})).rejects.toThrow("HIA_RENDER_PROJECT_IDENTITY_SCOPE_INVALID");
  expect(writes).toEqual([]);
});
