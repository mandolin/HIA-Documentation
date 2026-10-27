/** @file @lang zh-CN 呈现新旧schema身份、历史字节与新结构约束分发回归。 @lang en Distribution regressions for presentation schema identities, historical bytes and current structural constraints. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getHiaSchema } from "./index.js";
import { DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA as current } from "../../core/src/documentation-presentation-profile.js";

describe("presentation schema version pairing", () => {
  it("distributes exact current and immutable historical identities", () => {
    const legacy = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-presentation-profile-0.1.0-draft.schema.json";
    expect(getHiaSchema("documentation-presentation-profile")).toEqual(current);
    expect(getHiaSchema(current.$id)).toEqual(current);
    expect(getHiaSchema(legacy)?.$id).toBe(legacy);
    const bytes = readFileSync(new URL("./history/documentation-presentation-profile-0.1.0-draft.schema.json", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("a860db4f272feec7a9e846ccf8b6e4e8d5f472c42b994a41e4dc676c53d40291");
  });
  it("expresses existing numeric boundaries in only the new schema", () => {
    expect(current.$defs.topic.properties.order.maximum).toBe(Number.MAX_SAFE_INTEGER);
    expect(current.$defs.asset.properties.byteLength.maximum).toBe(16_777_216);
    expect(current.$defs.asset.properties.lineCount.maximum).toBe(100_000);
    expect(current.$defs.asset.properties.mediaType.minLength).toBe(2);
  });
  it("aligns nonblank token patterns without normalizing labels", () => {
    const pattern = new RegExp(current.$defs.skin.properties.tokenContract.pattern, "u");
    for (const value of [" ", "\t", "\u00a0", "\ufeff"]) expect(pattern.test(value)).toBe(false);
    for (const value of [" token ", "主题契约", "token@0.1.0-draft"]) expect(pattern.test(value)).toBe(true);
  });
  it("distributes the single-page, none and fetch/link conditions", () => {
    expect(current.allOf).toHaveLength(3);
    expect(current.allOf[0].then.properties.pagePartition.required).toEqual(["singlePageId"]);
    expect(current.allOf[1].then.properties.source.properties.assets.maxItems).toBe(0);
    expect(current.allOf[2].then.properties.source.properties.assets.items.required).toEqual(["relativeUrl"]);
  });
});
