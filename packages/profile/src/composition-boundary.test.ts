/**
 * @file
 * @lang zh-CN 继承环、失效别名与深图查询的拒绝回归；多父冲突优先级另待定案。
 * @lang en Rejection regressions for inheritance cycles, invalid aliases and deep graph queries; multi-parent collision precedence awaits a separate decision.
 */
import { describe, expect, it } from "vitest";
import {
  createHiaProfileSet, getHiaProfile, getHiaProfileDiagnostic, getHiaProfileRule,
  hasProfileErrors, listHiaProfileTags, resolveHiaProfileTag
} from "./index.js";
import type { HiaDocumentationProfile, HiaProfileSet, HiaProfileTagDefinition } from "./index.js";

/** @lang zh-CN 创建独立的有效草案配置，不共享可变数组。 @lang en Creates an independent valid draft profile without shared mutable arrays. */
function profile(id: string, parents: string[] = [], tags: HiaProfileTagDefinition[] = []): HiaDocumentationProfile {
  return { schemaVersion: "0.1.0-draft", profileId: id, profileVersion: "local", displayName: id, layer: "extension", extends: parents, contracts: [], targets: [], tags, rules: [], mappings: [], diagnostics: [], capabilities: {} };
}

/** @lang zh-CN 创建标签或别名，保留传入的字面身份。 @lang en Creates a tag or alias while retaining supplied literal identities. */
function tag(name: string, aliasFor?: string): HiaProfileTagDefinition {
  return { name, status: aliasFor ? "alias" : "stable", scope: ["block"], targets: [], ...(aliasFor ? { aliasFor } : {}) };
}

describe("documentation profile inheritance cycles", () => {
  it.each([
    { name: "self", entries: [profile("a", ["a"])] },
    { name: "two nodes", entries: [profile("a", ["b"]), profile("b", ["a"])] },
    { name: "three nodes", entries: [profile("a", ["b"]), profile("b", ["c"]), profile("c", ["a"])] }
  ])("reports $name cycles as errors", ({ entries }) => {
    const set = createHiaProfileSet({ profiles: entries });
    expect(set.diagnostics.some(({ code, severity }) => code === "HIA_PROFILE_EXTENDS_CYCLE" && severity === "error")).toBe(true);
  });

  it("does not misclassify a diamond or repeated parent as a cycle", () => {
    const base = profile("base", [], [tag("base")]);
    const set = createHiaProfileSet({ profiles: [base, profile("a", ["base"]), profile("b", ["base"]), profile("child", ["a", "b", "a"])] });
    expect(set.diagnostics).toEqual([]);
    expect(listHiaProfileTags(set, "child", { includeInherited: true }).map(({ name }) => name)).toEqual(["base"]);
  });

  it("keeps metadata inspectable while refusing cyclic semantic queries", () => {
    const a = profile("a", ["b"], [tag("local")]);
    a.rules.push({ ruleId: "local/check", optionsSchema: {}, messages: { default: "ok" } });
    a.diagnostics.push({ code: "LOCAL", severity: "info", defaultMessage: "ok" });
    const set = createHiaProfileSet({ profiles: [a, profile("b", ["a"]), profile("child", ["a"]), profile("independent", [], [tag("safe")])] });
    expect(getHiaProfile(set, "a")).toBe(a);
    expect(listHiaProfileTags(set, "a").map(({ name }) => name)).toEqual(["local"]);
    expect(listHiaProfileTags(set, "a", { includeInherited: true })).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "a", tagName: "local" })).toBeUndefined();
    expect(getHiaProfileRule(set, "child", "local/check")).toBeUndefined();
    expect(getHiaProfileDiagnostic(set, "child", "LOCAL")).toBeUndefined();
    expect(resolveHiaProfileTag(set, { profileId: "independent", tagName: "safe" })?.tag.name).toBe("safe");
  });

  it("does not mutate input parents or local registry arrays", () => {
    const entries = [profile("a", ["b"], [tag("local")]), profile("b", ["a"])];
    const before = JSON.stringify(entries);
    const set = createHiaProfileSet({ profiles: entries });
    expect(hasProfileErrors(set.diagnostics)).toBe(true);
    expect(JSON.stringify(entries)).toBe(before);
  });

  it("reports a closed path and a numeric parent location deterministically", () => {
    const entries = [profile("a", ["b"]), profile("b", ["a"])];
    const first = createHiaProfileSet({ profiles: entries }).diagnostics;
    const second = createHiaProfileSet({ profiles: entries }).diagnostics;
    expect(first).toEqual(second);
    expect(first[0]?.targetPath).toBe("b.extends.0");
    expect(first[0]?.data).toEqual({ profileId: "b", cycleProfileIds: ["a", "b", "a"] });
  });

  it("reports disjoint cycles while keeping unrelated registries usable", () => {
    const set = createHiaProfileSet({ profiles: [profile("a", ["a"]), profile("b", ["c"]), profile("c", ["b"]), profile("safe", [], [tag("safe")])] });
    expect(set.diagnostics.filter(({ code }) => code === "HIA_PROFILE_EXTENDS_CYCLE")).toHaveLength(2);
    expect(resolveHiaProfileTag(set, { profileId: "safe", tagName: "safe" })?.tag.name).toBe("safe");
  });

  it("keeps missing-parent diagnostics distinct from inheritance cycles", () => {
    const set = createHiaProfileSet({ profiles: [profile("a", ["missing"], [tag("local")])] });
    expect(set.diagnostics.map(({ code }) => code)).toEqual(["HIA_PROFILE_EXTENDS_UNKNOWN"]);
    expect(listHiaProfileTags(set, "a").map(({ name }) => name)).toEqual(["local"]);
  });
});

describe("documentation profile alias termination", () => {
  it.each([
    { name: "self", tags: [tag("a", "a")] },
    { name: "two nodes", tags: [tag("a", "b"), tag("b", "a")] },
    { name: "three nodes", tags: [tag("a", "b"), tag("b", "c"), tag("c", "a")] }
  ])("reports $name alias cycles and refuses a resolved result", ({ tags }) => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], tags)] });
    expect(set.diagnostics.some(({ code, severity }) => code === "HIA_PROFILE_ALIAS_CYCLE" && severity === "error")).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "a", includeAliases: true })).toBeUndefined();
  });

  it("refuses a missing alias target even when aliases are enabled", () => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], [tag("a", "missing")])] });
    expect(set.diagnostics.some(({ code }) => code === "HIA_PROFILE_ALIAS_TARGET_UNKNOWN")).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "a", includeAliases: true })).toBeUndefined();
  });

  it("refuses a prefix leading into an alias cycle", () => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], [tag("prefix", "a"), tag("a", "b"), tag("b", "a")])] });
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "prefix", includeAliases: true })).toBeUndefined();
  });

  it("resolves valid multi-hop aliases with exact chain and caller references", () => {
    const entries = [profile("base", [], [tag("target")]), profile("child", ["base"], [tag("a", "b"), tag("b", "target")])];
    const set = createHiaProfileSet({ profiles: entries });
    expect(set.diagnostics).toEqual([]);
    const resolved = resolveHiaProfileTag(set, { profileId: "child", tagName: "a", includeAliases: true });
    expect(resolved?.profile).toBe(entries[1]);
    expect(resolved?.tag).toBe(entries[1]?.tags[0]);
    expect(resolved?.resolvedTag).toBe(entries[0]?.tags[0]);
    expect(resolved?.aliasChain).toEqual(["a", "b"]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "a" })).toBeUndefined();
  });

  it("permits unrelated valid aliases alongside a broken component", () => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], [tag("a", "a"), tag("good", "target"), tag("target")])] });
    expect(hasProfileErrors(set.diagnostics)).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "good", includeAliases: true })?.resolvedTag.name).toBe("target");
  });

  it("handles literal registry names without prototype lookups", () => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], [tag("constructor", "__proto__"), tag("__proto__")])] });
    expect(set.diagnostics).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "constructor", includeAliases: true })?.resolvedTag.name).toBe("__proto__");
  });

  it("uses numeric alias locations and preserves an exact failure chain", () => {
    const set = createHiaProfileSet({ profiles: [profile("example", [], [tag("prefix", "next"), tag("next", "missing")])] });
    expect(set.diagnostics[0]?.targetPath).toBe("example.tags.0.aliasFor");
    expect(set.diagnostics[0]?.data).toHaveProperty("aliasChain", ["prefix", "next"]);
    expect(resolveHiaProfileTag(set, { profileId: "example", tagName: "prefix", includeAliases: true })).toBeUndefined();
  });

  it("resolves a finite long alias chain without mutating local definitions", () => {
    const tags = Array.from({ length: 256 }, (_, index) => tag(`a${index}`, index === 255 ? "target" : `a${index + 1}`));
    tags.push(tag("target"));
    const input = profile("example", [], tags);
    const before = JSON.stringify(input);
    const set = createHiaProfileSet({ profiles: [input] });
    expect(set.diagnostics).toEqual([]);
    const result = resolveHiaProfileTag(set, { profileId: "example", tagName: "a0", includeAliases: true });
    expect(result?.aliasChain).toHaveLength(256);
    expect(result?.resolvedTag).toBe(tags[256]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("resolves non-conflicting aliases across multiple inherited profiles", () => {
    const set = createHiaProfileSet({ profiles: [profile("base", [], [tag("target")]), profile("a", ["base"], [tag("first", "target")]), profile("b", ["a"], [tag("second", "first")]), profile("child", ["a", "b"])] });
    expect(set.diagnostics).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "second", includeAliases: true })?.aliasChain).toEqual(["second", "first"]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "second", includeAliases: true })?.resolvedTag.name).toBe("target");
  });

  it("retains warning severity for missing mapping diagnostic references", () => {
    const input = profile("example");
    input.mappings.push({ from: "a", to: "b", diagnostics: ["UNKNOWN"] });
    const set = createHiaProfileSet({ profiles: [input] });
    expect(set.diagnostics.map(({ code, severity }) => ({ code, severity }))).toEqual([{ code: "HIA_PROFILE_MAPPING_DIAGNOSTIC_UNKNOWN", severity: "warning" }]);
    expect(hasProfileErrors(set.diagnostics)).toBe(false);
  });
});

describe("documentation profile deep inheritance", () => {
  it("queries a deep finite chain without recursive stack overflow", () => {
    // <lang><zh-CN>直接建立类型正确的Map隔离查询复杂度，6000层可复现旧递归溢出。</zh-CN><en>Build a correctly typed Map directly to isolate query complexity; 6000 levels reproduce old recursive overflow.</en></lang>
    const entries = Array.from({ length: 6000 }, (_, index) => profile(`p${index}`, index ? [`p${index - 1}`] : [], index ? [] : [tag("base")]));
    const set: HiaProfileSet = { profiles: new Map(entries.map((entry) => [entry.profileId, entry])), diagnostics: [] };
    expect(listHiaProfileTags(set, "p5999", { includeInherited: true }).map(({ name }) => name)).toEqual(["base"]);
    expect(resolveHiaProfileTag(set, { profileId: "p5999", tagName: "base" })?.resolvedTag.name).toBe("base");
    expect(getHiaProfileRule(set, "p5999", "missing")).toBeUndefined();
    expect(getHiaProfileDiagnostic(set, "p5999", "missing")).toBeUndefined();
  });

  it("admits a deep finite set using a whole-graph iterative check", () => {
    const entries = Array.from({ length: 6000 }, (_, index) => profile(`p${index}`, index ? [`p${index - 1}`] : []));
    expect(createHiaProfileSet({ profiles: entries }).diagnostics).toEqual([]);
  });

  it("diagnoses a deep cycle without overflowing or publishing partial inherited tags", () => {
    const entries = Array.from({ length: 6000 }, (_, index) => profile(`p${index}`, [`p${(index + 1) % 6000}`]));
    const set = createHiaProfileSet({ profiles: entries });
    expect(set.diagnostics.some(({ code }) => code === "HIA_PROFILE_EXTENDS_CYCLE")).toBe(true);
    expect(listHiaProfileTags(set, "p0", { includeInherited: true })).toEqual([]);
  });
});
