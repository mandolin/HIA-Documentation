/**
 * @file
 * @lang zh-CN 两项生产器候选分发与旧身份并存回归；不得把其它契约或包自动标为稳定。
 * @lang en Regression coverage for distributing two producer candidates alongside old identities, without automatically marking other contracts or packages stable.
 */
import { describe, expect, it } from "vitest";
import { getHiaSchema, HIA_SCHEMA_CATALOG, listHiaSchemas } from "./index.js";

describe.each(["documentation-producer", "documentation-producer-result"])("candidate distribution %s", (key) => {
  it("resolves the current key and both precise canonical identities independently", () => {
    // <lang><zh-CN>当前1.0.0和历史草案有不同schema身份及const，不允许旧URL别名到新定义。</zh-CN><en>Current 1.0.0 and the historical draft have distinct schema identities and const values; old URLs must not alias the new definition.</en></lang>
    const currentId = `https://mandolin.github.io/HIA-Documentation/schemas/${key}-1.0.0.schema.json`;
    const historicalId = `https://mandolin.github.io/HIA-Documentation/schemas/${key}-0.1.0-draft.schema.json`;
    const current = getHiaSchema(key)!;
    const historical = getHiaSchema(historicalId)!;
    expect(current.$id).toBe(currentId);
    expect(getHiaSchema(currentId)).toEqual(current);
    expect(current.properties).toHaveProperty("contractVersion.const", "1.0.0");
    expect(historical.$id).toBe(historicalId);
    expect(historical.properties).toHaveProperty("contractVersion.const", "0.1.0-draft");
  });
  it("does not infer retrieval for unregistered patch versions", () => {
    expect(getHiaSchema(`https://mandolin.github.io/HIA-Documentation/schemas/${key}-1.0.1.schema.json`)).toBeUndefined();
  });
});

describe("candidate catalog boundary", () => {
  it("marks only individually reviewed definitions as candidates and lists current schemas once", () => {
    // <lang><zh-CN>核心document和项目清单各自完成独立审查后加入候选，不能自动推广其它未审契约。</zh-CN><en>The core document and project manifest join after their separate reviews; other unreviewed contracts are not promoted automatically.</en></lang>
    expect(HIA_SCHEMA_CATALOG.schemas.filter(({ stability }) => stability === "stable-candidate").map(({ key }) => key)).toEqual(["documentation-producer", "documentation-producer-result", "hia-document", "project-manifest"]);
    expect(listHiaSchemas()).toHaveLength(17);
    expect(new Set(listHiaSchemas().map(({ $id }) => $id)).size).toBe(17);
  });
});
