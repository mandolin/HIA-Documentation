/** @file @lang zh-CN .NET文档身份与导航显示分离的回归，覆盖真实泛型字段及旧输入。 @lang en Regressions separating .NET documentation identity from navigation labels, covering generic metadata and legacy inputs. */
import {expect, it} from "vitest";
import {renderProjectHtmlDocument, type RenderProjectEntry, type RenderProjectNavigationTreeNode} from "./index.js";

/**
 * @lang zh-CN 构造与Roslyn投影一致的类型/成员输入，保留原始XML身份和语义显示名。
 * @lang en Creates type/member inputs matching Roslyn projections with XML identities and semantic display names.
 * @returns <lang><zh-CN>固定的公开合成夹具。</zh-CN><en>A fixed public synthetic fixture.</en></lang>
 */
function genericEntries(): RenderProjectEntry[] {
  return [
    {id: "type:box", name: "Box`1", kind: "dotnet-type", view: "dotnet", symbolId: "dotnet:t:fixture.box-1",
      hierarchy: {assembly: "Fixture", namespace: "Fixture", symbolDocumentationId: "T:Fixture.Box`1", displayName: "Fixture.Box<T>"}},
    {id: "member:run", name: "Run", kind: "dotnet-method", view: "dotnet", symbolId: "dotnet:m:fixture.box-1.run",
      hierarchy: {assembly: "Fixture", namespace: "Fixture", symbolDocumentationId: "M:Fixture.Box`1.Run", parentSymbolId: "T:Fixture.Box`1", containingType: "Fixture.Box<T>", displayName: "Fixture.Box<T>.Run()"}}
  ];
}

/**
 * @lang zh-CN 经正常单页入口读取完整导航，广度遍历避免把断言绑定到命名空间层数。
 * @lang en Reads full navigation through the normal single-page entry and traverses it without assuming namespace depth.
 * @param entries <lang><zh-CN>输入条目。</zh-CN><en>Input entries.</en></lang>
 * @returns <lang><zh-CN>类型节点集合。</zh-CN><en>Type-node collection.</en></lang>
 */
function typeNodes(entries: RenderProjectEntry[]): RenderProjectNavigationTreeNode[] {
  // <lang><zh-CN>只使用内存数据，关闭来源呈现，不接触本地源码。</zh-CN><en>Use in-memory data with source presentation disabled and no local source reads.</en></lang>
  const result = renderProjectHtmlDocument({project: {name: "Generic navigation fixture"}, entries}, {projectSite: {layout: "single-page", source: {presentation: "none"}}});
  const index = JSON.parse(result.files.find(file => file.path === "project-index.json")?.contents ?? "{}");
  const nodes: RenderProjectNavigationTreeNode[] = [...index.navigationTree];
  const types: RenderProjectNavigationTreeNode[] = [];
  // <lang><zh-CN>生成树无环，队列追加只访问每个子节点一次。</zh-CN><en>The generated tree is acyclic and queue appends visit each child once.</en></lang>
  for (const node of nodes) {
    if (node.kind === "type") types.push(node);
    nodes.push(...node.children ?? []);
  }
  return types;
}

it.each([false, true])("joins generic type/member identities with reversed input %s", reversed => {
  // <lang><zh-CN>显示与原始名称不同，两个入口必须在同一类型组中。</zh-CN><en>Display and raw names differ, but both entries must share one type group.</en></lang>
  const entries = genericEntries();
  // <lang><zh-CN>也交换可排序入口ID，覆盖渲染器排序后的声明先到和成员先到。</zh-CN><en>Swap sortable entry IDs too, covering declaration-first and member-first normalized ordering.</en></lang>
  if (reversed) {
    entries[0].id = "a:type";
    entries[1].id = "z:member";
  }
  const original = structuredClone(entries);
  const types = typeNodes(reversed ? [...entries].reverse() : entries);
  expect(types).toHaveLength(1);
  expect(types[0]).toMatchObject({label: "Box<T>", entryId: entries[0].id, entryCount: 2});
  expect(types[0].children).toContainEqual(expect.objectContaining({entryId: entries[1].id, label: "Run"}));
  expect(entries).toEqual(original);
});

it("uses the member documentation owner when parent metadata is absent", () => {
  // <lang><zh-CN>旧字段缺父ID时仍使用已有文档ID中的所属类型。</zh-CN><en>Use the documentation ID's owner type when legacy parent metadata is absent.</en></lang>
  const entries = genericEntries();
  delete entries[1].hierarchy!.parentSymbolId;
  expect(typeNodes(entries)).toMatchObject([{label: "Box<T>", entryCount: 2}]);
});

it("retains raw generic arity when only legacy documentation IDs are available", () => {
  // <lang><zh-CN>只知道参数数量时保留原始名称，不生成未知类型参数名。</zh-CN><en>Retain raw names when only arity is known, without inventing parameter names.</en></lang>
  const entries = genericEntries();
  delete entries[0].hierarchy!.displayName;
  delete entries[1].hierarchy!.containingType;
  delete entries[1].hierarchy!.displayName;
  expect(typeNodes(entries)).toMatchObject([{label: "Box`1", entryCount: 2}]);
});

it("retains qualified generic arguments and nested type display text", () => {
  // <lang><zh-CN>点可能属于泛型实参，显示文本不能按最后一个点切断。</zh-CN><en>Dots can belong to generic arguments, so display text cannot be split at its last dot.</en></lang>
  const entries = genericEntries();
  entries[0].hierarchy!.displayName = "Fixture.Outer<System.String>.Box<T>";
  entries[1].hierarchy!.containingType = "Fixture.Outer<System.String>.Box<T>";
  expect(typeNodes(entries)).toMatchObject([{label: "Outer<System.String>.Box<T>", entryCount: 2}]);
});

it("keeps distinct arities and assemblies in separate type groups", () => {
  // <lang><zh-CN>相同显示基础名称的不同身份各自保留声明和成员。</zh-CN><en>Distinct identities with the same base display name retain their declarations and members.</en></lang>
  const entries = genericEntries();
  const otherArity = genericEntries();
  for (const entry of otherArity) {
    entry.id += ":arity2";
    entry.symbolId = entry.symbolId!.replace("box-1", "box-2");
    entry.hierarchy!.symbolDocumentationId = entry.hierarchy!.symbolDocumentationId!.replace("`1", "`2");
    entry.hierarchy!.parentSymbolId = entry.hierarchy!.parentSymbolId?.replace("`1", "`2");
    entry.hierarchy!.displayName = entry.hierarchy!.displayName!.replace("<T>", "<T, U>");
    entry.hierarchy!.containingType = entry.hierarchy!.containingType?.replace("<T>", "<T, U>");
  }
  const otherAssembly = genericEntries();
  for (const entry of otherAssembly) {
    entry.id += ":assembly2";
    entry.hierarchy!.assembly = "OtherAssembly";
  }
  const types = typeNodes([...entries, ...otherArity, ...otherAssembly]);
  expect(types).toHaveLength(3);
  expect(types.every(type => type.entryCount === 2)).toBe(true);
});

it("supports a member-only input without inventing a type declaration entry", () => {
  // <lang><zh-CN>只有成员时分组可见，类型声明入口仍为空。</zh-CN><en>A member-only group remains visible without a fabricated type declaration entry.</en></lang>
  const types = typeNodes([genericEntries()[1]]);
  expect(types).toHaveLength(1);
  expect(types[0].label).toBe("Box<T>");
  expect(types[0].entryId).toBeUndefined();
  expect(types[0].children).toContainEqual(expect.objectContaining({entryId: "member:run"}));
});

it("joins generic declarations in the global namespace", () => {
  // <lang><zh-CN>移除命名空间限定以覆盖单段类型ID的回退路径。</zh-CN><en>Remove namespace qualification to cover the single-segment type-ID fallback.</en></lang>
  const entries = genericEntries();
  for (const entry of entries) {
    entry.hierarchy!.namespace = "";
    entry.hierarchy!.symbolDocumentationId = entry.hierarchy!.symbolDocumentationId!.replace("Fixture.", "");
    entry.hierarchy!.parentSymbolId = entry.hierarchy!.parentSymbolId?.replace("Fixture.", "");
    entry.hierarchy!.displayName = entry.hierarchy!.displayName!.replace("Fixture.", "");
    entry.hierarchy!.containingType = entry.hierarchy!.containingType?.replace("Fixture.", "");
  }
  expect(typeNodes(entries)).toMatchObject([{label: "Box<T>", entryCount: 2}]);
});
