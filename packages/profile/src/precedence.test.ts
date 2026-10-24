/**
 * @file
 * @lang zh-CN 已确认方案A的后声明覆盖、本地覆盖、共享祖先一次与所有查询一致性回归。
 * @lang en Regressions for confirmed option A: later declarations win, local overrides, shared ancestors apply once, and all queries agree.
 */
import { describe, expect, it } from "vitest";
import { createHiaProfileSet, getHiaProfileDiagnostic, getHiaProfileRule, listHiaProfileTags, resolveHiaProfileTag } from "./index.js";
import type { HiaDocumentationProfile, HiaProfileTagDefinition } from "./index.js";

/** @lang zh-CN 创建三类同key声明，owner仅为可公开测试标记；省略owner时不声明注册表项。 @lang en Creates three same-key declarations with public-safe owner markers; omitting owner creates no registry entries. */
function profile(id: string, parents: string[] = [], owner?: string): HiaDocumentationProfile {
  return {
    schemaVersion: "0.1.0-draft", profileId: id, profileVersion: "local", displayName: id,
    layer: "extension", extends: parents, contracts: [], targets: [], mappings: [], capabilities: {},
    tags: owner ? [{ name: "shared", status: "stable", scope: ["block"], targets: [], metadata: { owner } }] : [],
    rules: owner ? [{ ruleId: "shared/check", optionsSchema: { owner }, messages: { default: owner } }] : [],
    diagnostics: owner ? [{ code: "SHARED", severity: "info", defaultMessage: owner }] : []
  };
}

/** @lang zh-CN 创建别名，避免把owner元数据混入链身份。 @lang en Creates an alias without mixing owner metadata into chain identities. */
function alias(name: string, target: string): HiaProfileTagDefinition {
  return { name, status: "alias", aliasFor: target, scope: ["block"], targets: [] };
}

// <lang><zh-CN>表格逐项覆盖确认提案的顺序/菱形规则，不从测试fixture推导新的layer策略。</zh-CN><en>The table covers confirmed ordering/diamond rules without deriving new layer policy from fixtures.</en></lang>
const cases = [
  { name: "later parent", entries: [profile("a", [], "a"), profile("b", [], "b"), profile("child", ["a", "b"])], winner: "b" },
  { name: "reversed parents", entries: [profile("a", [], "a"), profile("b", [], "b"), profile("child", ["b", "a"])], winner: "a" },
  { name: "local declaration", entries: [profile("a", [], "a"), profile("b", [], "b"), profile("child", ["a", "b"], "child")], winner: "child" },
  { name: "shared ancestor once", entries: [profile("base", [], "base"), profile("a", ["base"], "a"), profile("b", ["base"]), profile("child", ["a", "b"])], winner: "a" },
  { name: "diamond with later declaration", entries: [profile("base", [], "base"), profile("a", ["base"], "a"), profile("b", ["base"], "b"), profile("child", ["a", "b"])], winner: "b" },
  { name: "repeated parent identity once", entries: [profile("a", [], "a"), profile("b", [], "b"), profile("child", ["a", "b", "a"])], winner: "b" },
  { name: "ancestor listed again", entries: [profile("base", [], "base"), profile("a", ["base"], "a"), profile("child", ["a", "base"])], winner: "a" }
];

describe("confirmed documentation profile precedence", () => {
  it.each(cases)("makes all registry queries agree for $name", ({ entries, winner }) => {
    const before = JSON.stringify(entries);
    const set = createHiaProfileSet({ profiles: entries });
    expect(set.diagnostics).toEqual([]);
    const expected = entries.find(({ profileId }) => profileId === winner)!;
    const listed = listHiaProfileTags(set, "child", { includeInherited: true });
    const resolved = resolveHiaProfileTag(set, { profileId: "child", tagName: "shared" });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toBe(expected.tags[0]);
    expect(resolved?.tag).toBe(listed[0]);
    expect(resolved?.resolvedTag).toBe(expected.tags[0]);
    expect(getHiaProfileRule(set, "child", "shared/check")).toBe(expected.rules[0]);
    expect(getHiaProfileDiagnostic(set, "child", "SHARED")).toBe(expected.diagnostics[0]);
    expect(JSON.stringify(entries)).toBe(before);
  });

  it("resolves local aliases through the same winning inherited tag", () => {
    const a = profile("a", [], "a");
    const b = profile("b", [], "b");
    const child = profile("child", ["a", "b"]);
    child.tags.push(alias("shortcut", "shared"));
    const set = createHiaProfileSet({ profiles: [a, b, child] });
    expect(set.diagnostics).toEqual([]);
    const result = resolveHiaProfileTag(set, { profileId: "child", tagName: "shortcut", includeAliases: true });
    expect(result?.tag).toBe(child.tags[0]);
    expect(result?.resolvedTag).toBe(b.tags[0]);
    expect(result?.aliasChain).toEqual(["shortcut"]);
  });

  it("uses the later parent's alias declaration and target", () => {
    const a = profile("a", [], "a");
    const b = profile("b", [], "b");
    a.tags.push(alias("shortcut", "shared"));
    b.tags.push(alias("shortcut", "shared"));
    const set = createHiaProfileSet({ profiles: [a, b, profile("child", ["a", "b"])] });
    const result = resolveHiaProfileTag(set, { profileId: "child", tagName: "shortcut", includeAliases: true });
    expect(result?.tag).toBe(b.tags[1]);
    expect(result?.resolvedTag).toBe(b.tags[0]);
    expect(listHiaProfileTags(set, "child", { includeInherited: true }).find(({ name }) => name === "shortcut")).toBe(result?.tag);
  });

  it("applies local target overrides to inherited aliases", () => {
    const parent = profile("parent", [], "parent");
    parent.tags.push(alias("shortcut", "shared"));
    const child = profile("child", ["parent"], "child");
    const set = createHiaProfileSet({ profiles: [parent, child] });
    expect(set.diagnostics).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shortcut", includeAliases: true })?.resolvedTag).toBe(child.tags[0]);
  });

  it("allows a local canonical tag to replace an inherited alias", () => {
    const parent = profile("parent", [], "parent");
    parent.tags.push(alias("shortcut", "shared"));
    const child = profile("child", ["parent"]);
    child.tags.push({ name: "shortcut", status: "stable", scope: ["block"], targets: [] });
    const set = createHiaProfileSet({ profiles: [parent, child] });
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shortcut" })?.tag).toBe(child.tags[0]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shortcut" })?.aliasChain).toEqual([]);
  });

  it("reports an effective cycle introduced by a later alias override", () => {
    const a = profile("a");
    a.tags.push(alias("first", "second"), { name: "second", status: "stable", scope: ["block"], targets: [] });
    const b = profile("b", ["a"]);
    b.tags.push(alias("second", "first"));
    const child = profile("child", ["a", "b"]);
    const set = createHiaProfileSet({ profiles: [a, b, child] });
    expect(set.diagnostics.some(({ code }) => code === "HIA_PROFILE_ALIAS_CYCLE")).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "first", includeAliases: true })).toBeUndefined();
  });

  it("does not reorder declarations by layer names", () => {
    const a = profile("a", [], "a");
    const b = profile("b", [], "b");
    a.layer = "extension";
    b.layer = "stable";
    const set = createHiaProfileSet({ profiles: [a, b, profile("child", ["a", "b"])] });
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shared" })?.resolvedTag).toBe(b.tags[0]);
  });

  it("does not merge individual fields of overridden declarations", () => {
    const a = profile("a", [], "a");
    a.tags[0]!.repeatable = true;
    const b = profile("b", [], "b");
    const set = createHiaProfileSet({ profiles: [a, b, profile("child", ["a", "b"])] });
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shared" })?.tag).toBe(b.tags[0]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "shared" })?.tag.repeatable).toBeUndefined();
  });

  it("diagnoses cycles created only by combining otherwise valid branches", () => {
    const base = profile("base");
    base.tags.push({ name: "first", status: "stable", scope: ["block"], targets: [] }, { name: "second", status: "stable", scope: ["block"], targets: [] });
    const a = profile("a", ["base"]);
    a.tags.push(alias("first", "second"));
    const b = profile("b", ["base"]);
    b.tags.push(alias("second", "first"));
    expect(createHiaProfileSet({ profiles: [base, a] }).diagnostics).toEqual([]);
    expect(createHiaProfileSet({ profiles: [base, b] }).diagnostics).toEqual([]);
    const set = createHiaProfileSet({ profiles: [base, a, b, profile("child", ["a", "b"])] });
    expect(set.diagnostics.some(({ code, data }) => code === "HIA_PROFILE_ALIAS_CYCLE" && data?.profileId === "child")).toBe(true);
    expect(set.diagnostics.filter(({ data }) => data?.profileId === "child").every(({ targetPath }) => targetPath === "child.extends")).toBe(true);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "first", includeAliases: true })).toBeUndefined();
  });

  it("permits a local canonical override to break a combined alias cycle", () => {
    const base = profile("base");
    base.tags.push({ name: "first", status: "stable", scope: ["block"], targets: [] }, { name: "second", status: "stable", scope: ["block"], targets: [] });
    const a = profile("a", ["base"]);
    a.tags.push(alias("first", "second"));
    const b = profile("b", ["base"]);
    b.tags.push(alias("second", "first"));
    const child = profile("child", ["a", "b"]);
    child.tags.push({ name: "first", status: "stable", scope: ["block"], targets: [] });
    const set = createHiaProfileSet({ profiles: [base, a, b, child] });
    expect(set.diagnostics).toEqual([]);
    expect(resolveHiaProfileTag(set, { profileId: "child", tagName: "second", includeAliases: true })?.resolvedTag).toBe(child.tags[0]);
  });
});
