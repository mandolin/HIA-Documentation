/**
 * @file
 * @lang zh-CN 宿主关系投影保留聚合作用域和独立条目身份。
 * @lang en Host relation projections retain aggregate scopes and independent entry identities.
 */
import {expect, it} from "vitest";
import {createHiaProjectRelationGraphResult} from "./project-relations.js";

it.each(["0.1.0-draft", "0.2.0-draft"])("reads project index %s without collapsing equal native IDs", contractVersion => {
  const entries = ["alpha", "beta"].map(owner => ({id: owner, name: owner, kind: "function", symbolId: "function:run",
    ...(contractVersion === "0.2.0-draft" ? {identityScope: "owner:" + owner} : {})}));
  const result = createHiaProjectRelationGraphResult({uri: "file:///fixture/project-index.json", projectIndex: {
    contract: "hia-project-navigation-index", contractVersion, entries, relationGraph: {nodes: [], relations: []}
  }});
  expect(result.entries).toHaveLength(2);
  expect(result.entries.map(entry => entry.id)).toEqual(["alpha", "beta"]);
  expect(result.entries[0].identityScope).toBe(contractVersion === "0.2.0-draft" ? "owner:alpha" : undefined);
});
