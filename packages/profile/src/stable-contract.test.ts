/**
 * @file
 * @lang zh-CN 文档化配置规范当前候选与精确旧版的准入、组合和结构投影回归。
 * @lang en Regressions for admission, composition and structural projections of the current profile candidate and exact legacy version.
 */
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHiaProfileSet, getHiaProfile, getHiaProfileDiagnostic, getHiaProfileRule,
  HIA_PROFILE_JSON_SCHEMA, HIA_PROFILE_SCHEMA_ID, HIA_PROFILE_SCHEMA_VERSION,
  hasProfileErrors, listHiaProfileTags, loadHiaProfileFromFile, resolveHiaProfileTag, validateHiaProfile
} from "./index.js";
import type { HiaDocumentationProfile } from "./index.js";

/** @lang zh-CN 创建独立普通JSON配置，版本参数允许故意传入非法字符串。 @lang en Creates an independent ordinary-JSON profile, allowing deliberately invalid version strings. */
function profile(schemaVersion: string, profileId = "example"): HiaDocumentationProfile {
  return {
    schemaVersion, profileId, profileVersion: "domain-preview", displayName: profileId,
    layer: "extension", extends: [], contracts: [], targets: [], tags: [], rules: [],
    mappings: [], diagnostics: [], capabilities: {}
  };
}

// <lang><zh-CN>根版本与领域版本独立，当前/历史父链的四组合都必须保持同一已确认语义。</zh-CN><en>Root and domain versions are independent; all four current/legacy parent-chain combinations must retain the same confirmed semantics.</en></lang>
const versions = ["1.0.0", "0.1.0-draft"];
const combinations = versions.flatMap((parent) => versions.map((child) => ({ parent, child })));
const rejectedVersions = ["1.0.1", "1.1.0", "2.0.0", "1.0.0-rc.1", "1.0.0+build", "0.1.0", "0.1.0-draft.1", "v1.0.0", "^1.0.0", "1.0", " 1.0.0", "1.0.0 "];

describe("documentation profile stable definition candidate", () => {
  it("exports a new exact canonical identity without changing profile semantic versions", () => {
    expect(HIA_PROFILE_SCHEMA_VERSION).toBe("1.0.0");
    expect(HIA_PROFILE_SCHEMA_ID).toBe("https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-1.0.0.schema.json");
    expect(HIA_PROFILE_JSON_SCHEMA.$id).toBe(HIA_PROFILE_SCHEMA_ID);
    expect(HIA_PROFILE_JSON_SCHEMA.properties.schemaVersion).toEqual({ const: "1.0.0" });
  });

  it.each(versions)("admits exact %s without mutating caller data", (version) => {
    const input = profile(version);
    const before = JSON.stringify(input);
    expect(validateHiaProfile(input)).toEqual([]);
    const set = createHiaProfileSet({ profiles: [input] });
    expect(set.diagnostics).toEqual([]);
    expect(getHiaProfile(set, "example")).toBe(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(input.profileVersion).toBe("domain-preview");
  });

  it.each(rejectedVersions)("rejects unknown exact version %s instead of negotiating", (version) => {
    const input = profile(version);
    const diagnostics = validateHiaProfile(input);
    expect(diagnostics.map(({ code }) => code)).toContain("HIA_PROFILE_SCHEMA_UNSUPPORTED");
    expect(hasProfileErrors(diagnostics)).toBe(true);
    expect(createHiaProfileSet({ profiles: [input] }).profiles.size).toBe(0);
  });

  it("does not fill a missing version from the current constant", () => {
    const input = profile("1.0.0") as unknown as Record<string, unknown>;
    delete input.schemaVersion;
    expect(hasProfileErrors(validateHiaProfile(input))).toBe(true);
    expect(input).not.toHaveProperty("schemaVersion");
  });

  it.each(combinations)("composes parent $parent with child $child using confirmed overrides", ({ parent, child }) => {
    const base = profile(parent, "base");
    base.tags = [{ name: "target", status: "stable", scope: ["block"], targets: [] }];
    base.rules = [{ ruleId: "check", optionsSchema: {}, messages: { default: "base" } }];
    base.diagnostics = [{ code: "EXAMPLE", severity: "info", defaultMessage: "base" }];
    const derived = profile(child, "derived");
    derived.extends = ["base"];
    derived.tags = [{ name: "target", status: "stable", scope: ["file"], targets: [] }, { name: "shortcut", status: "alias", aliasFor: "target", scope: [], targets: [] }];
    derived.rules = [{ ruleId: "check", optionsSchema: {}, messages: { default: "local" } }];
    derived.diagnostics = [{ code: "EXAMPLE", severity: "warning", defaultMessage: "local" }];
    const before = JSON.stringify([base, derived]);
    const set = createHiaProfileSet({ profiles: [base, derived] });
    expect(set.diagnostics).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "derived", tagName: "shortcut", includeAliases: true })?.resolvedTag).toBe(derived.tags[0]);
    expect(listHiaProfileTags(set, "derived", { includeInherited: true }).find(({ name }) => name === "target")).toBe(derived.tags[0]);
    expect(getHiaProfileRule(set, "derived", "check")).toBe(derived.rules[0]);
    expect(getHiaProfileDiagnostic(set, "derived", "EXAMPLE")).toBe(derived.diagnostics[0]);
    expect(JSON.stringify([base, derived])).toBe(before);
  });

  it.each(versions)("loads %s once without rewriting the file or version", async (version) => {
    // <lang><zh-CN>测试拥有唯一系统临时目录，finally只清理该明确目录，不接触工作区或用户输入路径。</zh-CN><en>The test owns a unique system temporary directory and cleans only that explicit directory in finally, never workspace or user-supplied paths.</en></lang>
    const directory = await mkdtemp(path.join(tmpdir(), "hia-profile-version-"));
    const file = path.join(directory, "profile.json");
    const bytes = JSON.stringify(profile(version));
    try {
      await writeFile(file, bytes);
      const loaded = await loadHiaProfileFromFile(file);
      expect(loaded.diagnostics).toEqual([]);
      expect(loaded.profile.schemaVersion).toBe(version);
      expect(await readFile(file, "utf8")).toBe(bytes);
    } finally {
      await unlink(file);
      await rmdir(directory);
    }
  });

  it.each(versions)("retains open metadata and passive option schemas for %s", (version) => {
    const input = profile(version);
    input.rules = [{ ruleId: "passive", optionsSchema: { customDomainKeyword: true }, messages: { default: "", en: "" } }];
    input.capabilities = { local: { values: [null, false, 1] } };
    Object.assign(input, { extension: { enabled: true } });
    expect(validateHiaProfile(input)).toEqual([]);
    expect(createHiaProfileSet({ profiles: [input] }).diagnostics).toEqual([]);
  });

  it("expresses the existing alias-target requirement in the new structural schema", () => {
    expect(HIA_PROFILE_JSON_SCHEMA.$defs.tag).toHaveProperty("allOf.0.if.properties.status.const", "alias");
    expect(HIA_PROFILE_JSON_SCHEMA.$defs.tag).toHaveProperty("allOf.0.then.required", ["aliasFor"]);
  });

  it("requires the existing default message in the new structural schema", () => {
    expect(HIA_PROFILE_JSON_SCHEMA.$defs.rule.properties.messages).toHaveProperty("required", ["default"]);
  });
});
