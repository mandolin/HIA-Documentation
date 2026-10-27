/**
 * @file
 * @lang zh-CN 配置规范新当前根、固定历史根与官方草案分发相互独立的回归。
 * @lang en Regressions separating the new current profile root, fixed historical root and official draft distribution.
 */
import { describe, expect, it } from "vitest";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "./index.js";

describe("documentation profile candidate distribution", () => {
  it("keeps current and historical canonical shapes independently queryable", () => {
    const current = getHiaSchema("documentation-profile")!;
    const legacy = getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-0.1.0-draft.schema.json")!;
    expect(current.$id).toBe("https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-1.0.0.schema.json");
    expect(current.properties).toHaveProperty("schemaVersion.const", "1.0.0");
    expect(legacy.properties).toHaveProperty("schemaVersion.const", "0.1.0-draft");
    expect(current.$defs).toHaveProperty("tag.allOf.0.then.required", ["aliasFor"]);
    expect(legacy.$defs).not.toHaveProperty("tag.allOf");
    expect(legacy.$defs).not.toHaveProperty("rule.properties.messages.required");
  });

  it("never invents canonical IDs for unknown patches or prereleases", () => {
    for (const version of ["1.0.1", "1.1.0", "1.0.0-rc.1", "1.0.0+build"]) {
      expect(getHiaSchema(`https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-${version}.schema.json`)).toBeUndefined();
    }
  });

  it("retains the reviewed profile root in the explicit candidate catalog", () => {
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "documentation-profile")!;
    expect(entry.contractVersion).toBe("1.0.0");
    expect(entry.stability).toBe("stable-candidate");
    expect(HIA_SCHEMA_CATALOG.schemas).toHaveLength(18);
    // <lang><zh-CN>目录显式纳入已审文档地图，profile本身身份不随其它候选漂移。</zh-CN><en>The catalog explicitly includes the reviewed documentation map without shifting this profile's identity.</en></lang>
    expect(HIA_SCHEMA_CATALOG.schemas.filter(({ stability }) => stability === "stable-candidate").map(({ key }) => key)).toEqual(["documentation-profile", "documentation-producer", "documentation-producer-result", "doc-source-map", "documentation-presentation-profile", "hia-document", "project-manifest"]);
  });
});
