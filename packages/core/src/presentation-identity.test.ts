/**
 * @file
 * @lang zh-CN 呈现分区与稳定身份的数值顺序、19字段及跨模式责任回归。
 * @lang en Regressions for presentation numeric ordering, nineteen fields and cross-mode identity responsibilities.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareDocumentationPresentationIdentity as compare,
  DOCUMENTATION_PRESENTATION_PAGE_MODES as modes,
  validateDocumentationPresentationProfile as validate,
  type DocumentationPresentationProfile,
  type DocumentationPresentationTopicProjection
} from "./documentation-presentation-profile.js";

/** @lang zh-CN 每个调用解析独立公开合成工件，不共享可变状态。 @lang en Parses a separate public synthetic fixture per call without shared mutable state. */
function fixture(): DocumentationPresentationProfile {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
}

/** @lang zh-CN 仅提取code便于检查责任，不改变生产诊断。 @lang en Extracts codes for responsibility checks without changing production diagnostics. */
function codes(value: unknown): string[] { return validate(value).map(({ code }) => code); }

/** @lang zh-CN 构造显式single-page投影，保持全部稳定身份。 @lang en Constructs an explicit single-page projection retaining every stable identity. */
function singlePage(value = fixture()): DocumentationPresentationProfile {
  value.pagePartition.mode = "single-page";
  value.pagePartition.singlePageId = "page.all";
  for (const topic of value.pagePartition.topics) {
    topic.pageId = "page.all";
    topic.canonicalReference = `page.all#${topic.fragmentId}`;
  }
  return value;
}

describe("presentation numeric topic order", () => {
  it.each([
    [0, Number.MAX_SAFE_INTEGER], [9_999_999_999, 10_000_000_000],
    [99_999_999_999, 100_000_000_000], [999_999_999_999_999, 1_000_000_000_000_000],
    [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER]
  ])("accepts numeric ascending %s < %s and refuses its reverse", (lower, upper) => {
    const value = fixture();
    value.pagePartition.topics[0]!.order = lower;
    value.pagePartition.topics[1]!.order = upper;
    const before = JSON.stringify(value);
    expect(validate(value)).toEqual([]);
    expect(compare(value, structuredClone(value))).toEqual([]);
    expect(JSON.stringify(value)).toBe(before);
    value.pagePartition.topics.reverse();
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, "1", null])("refuses invalid order %s", (invalid) => {
    const value = fixture();
    value.pagePartition.topics[1]!.order = invalid as number;
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
  });

  it("refuses equal order even when topic identities differ", () => {
    const value = fixture();
    value.pagePartition.topics[1]!.order = 0;
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
  });

  it.each([0, 10_000, 10_001])("enforces topic count %s", (count) => {
    const value = fixture();
    const seed = value.pagePartition.topics[0]!;
    // <lang><zh-CN>独立逻辑身份保证只测试数量，不因重复身份或排序混淆结果。</zh-CN><en>Independent logical identities isolate count boundaries from duplicate identities or ordering.</en></lang>
    value.pagePartition.topics = Array.from({ length: count }, (_, order): DocumentationPresentationTopicProjection => ({
      ...seed, topicId: `topic.${order}`, fragmentId: `fragment.${order}`, navigationId: `nav.${order}`,
      canonicalReference: `${seed.pageId}#fragment.${order}`, order
    }));
    expect(codes(value)).toEqual(count === 10_000 ? [] : ["PRESENTATION_PARTITION_INVALID"]);
  });
});

describe("presentation partition and identity field responsibilities", () => {
  it("retains explicit modes and does not insert defaults or freeze caller data", () => {
    const value = fixture();
    expect(modes).toEqual(["multi-page", "single-page"]);
    expect(Object.isFrozen(modes)).toBe(false);
    expect(validate(value)).toEqual([]);
    expect(Object.isFrozen(value.pagePartition)).toBe(false);
    delete (value.pagePartition as Partial<typeof value.pagePartition>).defaultMode;
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
    expect(Object.hasOwn(value.pagePartition, "defaultMode")).toBe(false);
  });

  it.each(["missing", "wrong-page", "multi-extra", "canonical"])("refuses malformed projection: %s", (kind) => {
    const value = singlePage();
    if (kind === "missing") delete value.pagePartition.singlePageId;
    if (kind === "wrong-page") {
      value.pagePartition.topics[1]!.pageId = "page.other";
      value.pagePartition.topics[1]!.canonicalReference = "page.other#topic-api-get";
    }
    if (kind === "multi-extra") value.pagePartition.mode = "multi-page";
    if (kind === "canonical") value.pagePartition.topics[0]!.canonicalReference = "page.wrong#topic-module-cookies";
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
  });

  it.each(["topicId", "fragmentId", "navigationId"] as const)("requires unique %s within its own domain", (field) => {
    const value = fixture();
    value.pagePartition.topics[1]![field] = value.pagePartition.topics[0]![field];
    if (field === "fragmentId") value.pagePartition.topics[1]!.canonicalReference = `${value.pagePartition.topics[1]!.pageId}#${value.pagePartition.topics[1]!.fragmentId}`;
    expect(codes(value)).toContain("PRESENTATION_IDENTITY_DUPLICATE");
  });

  it.each(["", "主题", "x".repeat(257)])("refuses an invalid logical identity %s", (invalid) => {
    const value = fixture();
    value.pagePartition.topics[0]!.topicId = invalid;
    expect(codes(value)).toContain("PRESENTATION_PARTITION_INVALID");
  });

  it("allows shared pages/relations and equal spelling across distinct identity domains", () => {
    const value = fixture();
    value.pagePartition.topics[0]!.topicId = value.pagePartition.topics[0]!.navigationId;
    expect(validate(value)).toEqual([]);
    expect(value.pagePartition.topics[0]!.pageId).toBe(value.pagePartition.topics[1]!.pageId);
    expect(value.pagePartition.topics[0]!.relationIds).toEqual(value.pagePartition.topics[1]!.relationIds);
  });

  it.each(["empty", "maximum", "oversize", "unsorted", "duplicate"])("checks relation identity array %s", (kind) => {
    const value = fixture();
    const relations = kind === "empty" ? [] : kind === "unsorted" ? ["relation.b", "relation.a"] : kind === "duplicate" ? ["relation.a", "relation.a"]
      : Array.from({ length: kind === "maximum" ? 256 : 257 }, (_, index) => `relation.${String(index).padStart(3, "0")}`);
    value.pagePartition.topics[0]!.relationIds = relations;
    expect(codes(value)).toEqual(kind === "empty" || kind === "maximum" ? [] : ["PRESENTATION_PARTITION_INVALID"]);
  });

  it("treats page kinds and leaf policy as declarations rather than route inference", () => {
    const value = fixture();
    value.pagePartition.pageTopicKinds = [];
    value.pagePartition.leafTopicPolicy = "page";
    expect(validate(value)).toEqual([]);
    expect(compare(fixture(), value)).toEqual([]);
    value.pagePartition.pageTopicKinds = ["kind.unused"];
    expect(validate(value)).toEqual([]);
  });

  it.each(["maximum", "unsorted", "duplicate", "oversize"])("checks page kind catalog %s", (kind) => {
    const value = fixture();
    value.pagePartition.pageTopicKinds = kind === "unsorted" ? ["type", "guide"] : kind === "duplicate" ? ["type", "type"]
      : Array.from({ length: kind === "maximum" ? 256 : 257 }, (_, index) => `kind.${String(index).padStart(3, "0")}`);
    expect(codes(value)).toEqual(kind === "maximum" ? [] : ["PRESENTATION_PARTITION_INVALID"]);
  });

  it.each(["schemeAffectsIdentity", "skinAffectsIdentity", "sourceModeAffectsIdentity", "stableFields", "pageIdProjection"] as const)("requires exact identity policy %s", (field) => {
    const value = fixture();
    Object.assign(value.identityPolicy, { [field]: field === "stableFields" ? ["fragmentId", "topicId", "navigationId", "relationIds"] : field === "pageIdProjection" ? "always" : true });
    expect(codes(value)).toContain("PRESENTATION_PROFILE_INVALID");
  });

  it.each(["fragmentId", "navigationId", "relationIds", "topicId"] as const)("detects stable identity drift for %s", (field) => {
    const reference = fixture();
    const candidate = fixture();
    Object.assign(candidate.pagePartition.topics[0]!, { [field]: field === "relationIds" ? ["relation.changed"] : "identity.changed" });
    if (field === "fragmentId") candidate.pagePartition.topics[0]!.canonicalReference = `${candidate.pagePartition.topics[0]!.pageId}#identity.changed`;
    expect(validate(candidate)).toEqual([]);
    expect(compare(reference, candidate).map(({ code }) => code)).toEqual(["PRESENTATION_IDENTITY_DRIFT"]);
    expect(compare(candidate, reference).map(({ code }) => code)).toEqual(["PRESENTATION_IDENTITY_DRIFT"]);
  });

  it("joins topics by identity and allows explicit reorder/topic-kind changes", () => {
    const reference = fixture();
    const candidate = fixture();
    candidate.profileId = "profile.another";
    candidate.pagePartition.topics.reverse();
    candidate.pagePartition.topics.forEach((topic, order) => { topic.order = order; topic.topicKind = "kind.changed"; });
    expect(validate(candidate)).toEqual([]);
    const before = JSON.stringify(candidate);
    expect(compare(reference, candidate)).toEqual([]);
    expect(JSON.stringify(candidate)).toBe(before);
  });

  it("allows only page/canonical projection differences when modes differ", () => {
    const multi = fixture();
    const single = singlePage();
    expect(compare(multi, single)).toEqual([]);
    expect(compare(single, multi)).toEqual([]);
    const sameMode = fixture();
    sameMode.pagePartition.topics[0]!.pageId = "page.changed";
    sameMode.pagePartition.topics[0]!.canonicalReference = "page.changed#topic-module-cookies";
    expect(compare(multi, sameMode)[0]?.code).toBe("PRESENTATION_IDENTITY_DRIFT");
    single.pagePartition.topics[0]!.navigationId = "nav.changed";
    expect(compare(multi, single)[0]?.code).toBe("PRESENTATION_IDENTITY_DRIFT");
  });

  it("refuses changed topic sets and validates both sides before comparison", () => {
    const reference = fixture();
    const candidate = fixture();
    candidate.pagePartition.topics.pop();
    expect(compare(reference, candidate)[0]?.code).toBe("PRESENTATION_IDENTITY_DRIFT");
    expect(compare(candidate, reference)[0]?.code).toBe("PRESENTATION_IDENTITY_DRIFT");
    candidate.pagePartition.topics[0]!.order = -1;
    expect(compare(reference, candidate).map(({ code }) => code)).toEqual(["PRESENTATION_PARTITION_INVALID"]);
  });
});
