/**
 * @file
 * @lang zh-CN 当前项目清单新根与历史草案的独立分发回归，不升级其它未审契约。
 * @lang en Independent distribution regressions for the current project-manifest root and historical draft, without promoting other unreviewed contracts.
 */
import { describe, expect, it } from "vitest";
import { HIA_SCHEMA_CATALOG, getHiaSchema } from "./index.js";
describe("project manifest candidate distribution", () => {
  it("separates the new canonical root from the fixed historical definition", () => {
    const current = getHiaSchema("project-manifest")!;
    const old = getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-0.1.0-draft.schema.json")!;
    expect(current.$id).toBe("https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.0.schema.json");
    expect(current.properties).toHaveProperty("schemaVersion.const", "1.0.0");
    expect(old.properties).toHaveProperty("schemaVersion.const", "0.1.0-draft");
    expect(current.$defs).toHaveProperty("input.allOf.0.then.properties.kind.const", "documentation-producer-result");
    expect(old.$defs).not.toHaveProperty("input.allOf");
  });
  it("does not invent a canonical identity for unknown patches or prereleases", () => {
    expect(getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.1.schema.json")).toBeUndefined();
    expect(getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.0-rc.1.schema.json")).toBeUndefined();
  });
  it("retains the reviewed project root in the explicit candidate catalog", () => {
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "project-manifest")!;
    expect(entry.contractVersion).toBe("1.0.0");
    expect(entry.stability).toBe("stable-candidate");
    expect(HIA_SCHEMA_CATALOG.schemas).toHaveLength(17);
    expect(HIA_SCHEMA_CATALOG.schemas.filter(({ stability }) => stability === "stable-candidate")).toHaveLength(6);
  });
});
