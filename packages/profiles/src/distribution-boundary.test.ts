/**
 * @file
 * @lang zh-CN 官方文档化配置规范的精确身份、深拷贝所有权与目录版本独立性回归。
 * @lang en Regressions for exact official documentation-profile identities, deep-copy ownership and independent catalog versions.
 */
import { describe, expect, it } from "vitest";
import { hasProfileErrors, resolveHiaProfileTag } from "@hia-doc/profile";
import {
  createOfficialHiaProfileSet, getOfficialHiaProfile, HIA_OFFICIAL_PROFILE_CATALOG,
  HIA_OFFICIAL_PROFILE_IDS, listOfficialHiaProfiles
} from "./index.js";

describe("official documentation profile distribution boundaries", () => {
  it.each(["constructor", "__proto__", "CSSDOC", "./cssdoc.profile.json", "cssdoc@0.1.0-draft", "", "missing"])("does not infer an official profile for %s", (identity) => {
    expect(getOfficialHiaProfile(identity)).toBeUndefined();
  });

  it("isolates nested metadata, rules and arrays across accessor calls", () => {
    const first = listOfficialHiaProfiles();
    const second = listOfficialHiaProfiles();
    const before = JSON.stringify(second);
    first[0]!.capabilities.custom = { nested: ["changed"] };
    first[0]!.rules[0]!.messages.default = "changed";
    first[0]!.tags[0]!.scope.push("changed");
    first.reverse();
    expect(JSON.stringify(second)).toBe(before);
    expect(JSON.stringify(listOfficialHiaProfiles())).toBe(before);
  });

  it("isolates profiles in separately created runtime sets", () => {
    const first = createOfficialHiaProfileSet();
    const second = createOfficialHiaProfileSet();
    const copy = getOfficialHiaProfile("cssdoc")!;
    first.profiles.get("cssdoc")!.tags.length = 0;
    first.profiles.delete("jsdoc");
    expect(second.profiles.get("cssdoc")).toEqual(copy);
    expect(second.profiles.has("jsdoc")).toBe(true);
    expect(getOfficialHiaProfile("cssdoc")).toEqual(copy);
  });

  it("retains seven draft versions and valid acyclic official aliases", () => {
    const set = createOfficialHiaProfileSet();
    expect(hasProfileErrors(set.diagnostics)).toBe(false);
    expect(set.diagnostics).toEqual([]);
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profileSchemaVersion).toBe("0.1.0-draft");
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profiles.map(({ profileId }) => profileId)).toEqual(HIA_OFFICIAL_PROFILE_IDS);
    expect(listOfficialHiaProfiles().every(({ schemaVersion, profileVersion }) => schemaVersion === "0.1.0-draft" && profileVersion === "0.1.0-draft")).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "cssdoc", tagName: "custom-property", includeAliases: true })?.resolvedTag.name).toBe("cssprop");
  });
});
