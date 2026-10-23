/**
 * @file
 * @lang zh-CN 核心新根与旧schema身份共存回归；仅当前已审根加入候选。
 * @lang en Regressions for coexistence of the new core root and legacy schema identities; only the reviewed current root becomes a candidate.
 */
import { describe, expect, it } from "vitest";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "./index.js";

describe("core document candidate distribution", () => {
  it("separates the current root from the immutable old canonical schema", () => {
    const current = getHiaSchema("hia-document")!;
    const old = getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-document-0.2.0.schema.json")!;
    expect(current.$id).toBe("https://mandolin.github.io/HIA-Documentation/schemas/hia-document-1.0.0.schema.json");
    expect(current.properties).toHaveProperty("schemaVersion.const", "1.0.0");
    expect(old.properties).toHaveProperty("schemaVersion.const", "0.2.0");
    expect(old.$defs).toHaveProperty("sourceMetadata.properties.modelVersion.const", "0.2.0");
    expect(current.$defs).toHaveProperty("sourceMetadata.properties.modelVersion.enum", ["1.0.0", "0.2.0"]);
  });
  it("does not invent a canonical schema for an unknown patch or prerelease", () => {
    expect(getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-document-1.0.1.schema.json")).toBeUndefined();
    expect(getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/hia-document-1.0.0-rc.1.schema.json")).toBeUndefined();
  });
  it("marks the independently reviewed core root as a candidate without changing catalog cardinality", () => {
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "hia-document")!;
    expect(entry.contractVersion).toBe("1.0.0");
    expect(entry.stability).toBe("stable-candidate");
    expect(HIA_SCHEMA_CATALOG.schemas).toHaveLength(17);
  });
});
