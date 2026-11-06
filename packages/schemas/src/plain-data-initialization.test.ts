/**
 * @file
 * @lang zh-CN 初始化规则独立草案的分发和精确身份回归。
 * @lang en Distribution and exact-identity regressions for the independent initialization-rule draft.
 */
import { expect, it } from "vitest";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "./index.js";
import { PLAIN_DATA_INITIALIZATION_JSON_SCHEMA } from "../../plugin-sdk/src/plain-data-initialization.js";

it("distributes the exact owner draft without promoting the rule", () => {
  const id = "https://mandolin.github.io/HIA-Documentation/schemas/plain-data-initialization-0.1.0-draft.schema.json";
  expect(getHiaSchema("plain-data-initialization")).toEqual(PLAIN_DATA_INITIALIZATION_JSON_SCHEMA);
  expect(getHiaSchema(id)).toEqual(PLAIN_DATA_INITIALIZATION_JSON_SCHEMA);
  expect(getHiaSchema(id.replace("0.1.0-draft", "1.0.0"))).toBeUndefined();
  expect(HIA_SCHEMA_CATALOG.schemas.find(row => row.key === "plain-data-initialization")).toMatchObject({ stability: "draft", ownerPackage: "@hia-doc/plugin-sdk", contractVersion: "0.1.0-draft" });
});
it("returns defensive rule schema copies", () => {
  const schema = getHiaSchema("plain-data-initialization")!;
  schema.title = "changed";
  expect(getHiaSchema("plain-data-initialization")!.title).toBeUndefined();
});
