/**
 * @file
 * @lang zh-CN 呈现配置四入口的运行时输入边界与全部状态对回归；仅使用公开的合成历史工件。
 * @lang en Runtime input boundaries and all state pairs for four presentation entries, using only the public synthetic history fixture.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareDocumentationPresentationIdentity as compare,
  createDocumentationSourceFetchPlan as fetchPlan,
  DOCUMENTATION_SOURCE_READER_EVENTS as events,
  DOCUMENTATION_SOURCE_READER_STATES as states,
  transitionDocumentationSourceReader as transition,
  validateDocumentationPresentationProfile as validate,
  type DocumentationPresentationProfile,
  type DocumentationSourceReaderEvent,
  type DocumentationSourceReaderState
} from "./documentation-presentation-profile.js";

/** @lang zh-CN 每次解析独立JSON副本，避免测试共享修改。 @lang en Parses an independent JSON copy per test to avoid shared mutations. */
function fixture(): DocumentationPresentationProfile {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
}

/** @lang zh-CN 从所有profile入口检查固定拒绝，不序列化调用方对象。 @lang en Checks fixed refusal across every profile entry without serializing caller objects. */
function expectRefused(value: unknown): void {
  // <lang><zh-CN>四个调用分别覆盖校验、比较两侧和纯计划，避免只加固一个入口。</zh-CN><en>Four calls cover validation, both comparison sides and pure planning, avoiding a single-entry-only fix.</en></lang>
  const results = [validate(value), compare(value, fixture()), compare(fixture(), value), fetchPlan(value, "asset.src.api").diagnostics];
  for (const diagnostics of results) {
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("PRESENTATION_PROFILE_INVALID");
    expect(JSON.stringify(diagnostics)).not.toContain("private-marker");
  }
  expect(fetchPlan(value, "asset.src.api").status).toBe("refused");
}

describe("presentation JSON input boundary", () => {
  it.each(["root", "nested", "hidden", "private"])("does not invoke %s getters", (placement) => {
    const value = fixture();
    let reads = 0;
    // <lang><zh-CN>已知、隐藏及禁止字段均不能通过访问器进入wire。</zh-CN><en>Known, hidden and prohibited fields must not enter the wire through accessors.</en></lang>
    const target = placement === "nested" ? value.source : value;
    const key = placement === "nested" ? "mode" : placement === "private" ? "sourceBody" : "profileId";
    Object.defineProperty(target, key, { configurable: true, enumerable: placement !== "hidden", get() { reads += 1; throw new Error("private-marker"); } });
    expectRefused(value);
    expect(reads).toBe(0);
  });

  it.each(["root", "diagnostic"])("refuses %s cycles without throwing", (placement) => {
    const value = fixture();
    if (placement === "root") Object.assign(value, { cycle: value });
    else value.diagnostics.push({ code: "TEST", severity: "info", message: "fixture", data: { cycle: value } });
    expectRefused(value);
  });

  it.each(["prototype", "keys", "descriptor", "revoked"])("refuses %s reflection failures", (kind) => {
    const fail = () => { throw new Error("private-marker"); };
    const revoked = Proxy.revocable(fixture(), {});
    revoked.revoke();
    const value = kind === "revoked" ? revoked.proxy : new Proxy(fixture(), {
      ...(kind === "prototype" ? { getPrototypeOf: fail } : {}),
      ...(kind === "keys" ? { ownKeys: fail } : {}),
      ...(kind === "descriptor" ? { getOwnPropertyDescriptor: fail } : {})
    });
    expectRefused(value);
  });

  it.each([
    ["undefined", undefined], ["function", () => "private-marker"], ["bigint", 1n],
    ["NaN", NaN], ["infinity", Infinity], ["date", new Date(0)], ["map", new Map()],
    ["boxed string", new String("fixture")], ["sparse", new Array(1)]
  ])("refuses non-JSON diagnostic data: %s", (_name, invalid) => {
    const value = fixture();
    value.diagnostics.push({ code: "TEST", severity: "info", message: "fixture", data: { invalid } });
    expectRefused(value);
  });

  it("does not execute a custom toJSON hook", () => {
    const value = fixture();
    let calls = 0;
    Object.defineProperty(value, "toJSON", { value() { calls += 1; throw new Error("private-marker"); } });
    expectRefused(value);
    expect(calls).toBe(0);
  });

  it("does not execute an array traversal override", () => {
    const value = fixture();
    let calls = 0;
    Object.assign(value.source.assets, { every() { calls += 1; throw new Error("private-marker"); } });
    expectRefused(value);
    expect(calls).toBe(0);
  });

  it("catches clone rejection of a transparent Proxy", () => {
    expectRefused(new Proxy(fixture(), {}));
  });

  it("refuses excessive nesting without exposing an exception", () => {
    const value = fixture();
    const root: Record<string, unknown> = {};
    let cursor = root;
    for (let index = 0; index < 20_000; index += 1) {
      // <lang><zh-CN>合成深链只验证安全拒绝，不承诺任意深度或资源上限。</zh-CN><en>The synthetic deep chain checks safe refusal, not arbitrary-depth support or a resource budget.</en></lang>
      const child = {};
      cursor.child = child;
      cursor = child;
    }
    value.diagnostics.push({ code: "TEST", severity: "info", message: "fixture", data: root });
    expectRefused(value);
  });

  it.each(["plain", "null-prototype", "frozen", "shared", "hidden-data"])("accepts ordinary JSON data: %s", (kind) => {
    const value = fixture();
    if (kind === "null-prototype") Object.setPrototypeOf(value, null);
    if (kind === "frozen") { Object.freeze(value.source.readerPolicy.limits); Object.freeze(value); }
    if (kind === "shared") {
      const shared = { count: 1 };
      value.diagnostics.push({ code: "TEST", severity: "info", message: "fixture", data: { left: shared, right: shared } });
    }
    if (kind === "hidden-data") Object.defineProperty(value, "metadata", { value: "outside-wire" });
    expect(validate(value)).toEqual([]);
    expect(compare(value, fixture())).toEqual([]);
    expect(fetchPlan(value, "asset.src.api").status).toBe("ready");
  });

  it.each(["fetch", "embed", "link", "none"] as const)("preserves %s mode and pure-plan rules", (mode) => {
    const value = fixture();
    value.source.mode = mode;
    if (mode === "none") { value.source.assets = []; value.privacy.sourceExposure = "none"; }
    expect(validate(value)).toEqual([]);
    expect(compare(fixture(), value)).toEqual([]);
    expect(fetchPlan(value, "asset.src.api").status).toBe(mode === "fetch" ? "ready" : "refused");
  });

  it("retains exact version, unknown-field and private-field refusal", () => {
    const version = fixture();
    version.contractVersion = "1.0.1" as typeof version.contractVersion;
    expect(validate(version).map(({ code }) => code)).toContain("PRESENTATION_CONTRACT_UNSUPPORTED");
    expect(validate({ ...fixture(), extension: true })[0]?.code).toBe("PRESENTATION_PROFILE_INVALID");
    expect(validate({ ...fixture(), sourceBody: "fixture" })[0]?.code).toBe("PRESENTATION_PRIVACY_BOUNDARY");
  });

  it("returns detached deeply frozen plan policies", () => {
    const value = fixture();
    const before = JSON.stringify(value);
    const result = fetchPlan(value, "asset.src.api");
    expect(result.status).toBe("ready");
    expect(JSON.stringify(value)).toBe(before);
    expect(result.plan?.limits).not.toBe(value.source.readerPolicy.limits);
    for (const part of [result.plan, result.plan?.limits, result.plan?.request, result.plan?.bodyPolicy]) expect(Object.isFrozen(part)).toBe(true);
    value.source.readerPolicy.limits.maxBytes = 1;
    expect(result.plan?.limits.maxBytes).toBe(262144);
  });
});

describe("source reader closed runtime transitions", () => {
  it("preserves all 81 declared pairs (15 legal, 66 refused)", () => {
    const legal = new Map<string, string>([
      ["idle/load-requested", "loading"], ["loading/content-ready", "ready"],
      ["loading/content-empty", "empty"], ["loading/access-denied", "denied"],
      ["loading/asset-not-found", "not-found"], ["loading/integrity-failed", "integrity-error"],
      ["loading/network-failed", "network-error"], ["loading/load-aborted", "aborted"],
      ...states.filter((state) => state !== "idle" && state !== "loading").map((state): [string, string] => [`${state}/reset`, "idle"])
    ]);
    let accepted = 0;
    let refused = 0;
    for (const state of states) for (const event of events) {
      const result = transition(state, event);
      const expected = legal.get(`${state}/${event}`);
      if (expected) { expect(result).toEqual({ diagnostics: [], state: expected }); accepted += 1; }
      else {
        expect(result.state).toBe(state);
        expect(result.diagnostics[0]?.code).toBe("PRESENTATION_SOURCE_TRANSITION_INVALID");
        expect(result.diagnostics[0]?.message).toBe(`Source reader cannot apply ${event} while ${state}.`);
        refused += 1;
      }
    }
    expect([accepted, refused]).toEqual([15, 66]);
  });

  it.each(["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"])("rejects inherited state/event %s", (value) => {
    const invalidState = transition(value as DocumentationSourceReaderState, "reset");
    const invalidEvent = transition("idle", value as DocumentationSourceReaderEvent);
    expect(invalidState.state).toBe(value);
    expect(invalidEvent.state).toBe("idle");
    for (const result of [invalidState, invalidEvent]) expect(result.diagnostics[0]?.code).toBe("PRESENTATION_SOURCE_TRANSITION_INVALID");
  });

  it.each([undefined, null, 0, false, Symbol("private-marker"), new String("idle"), {}])("refuses nonprimitive input without coercion: %s", (value) => {
    const invalidState = transition(value as DocumentationSourceReaderState, "reset");
    const invalidEvent = transition("idle", value as DocumentationSourceReaderEvent);
    expect(invalidState.state).toBe(value);
    expect(invalidEvent.state).toBe("idle");
    for (const result of [invalidState, invalidEvent]) {
      expect(result.diagnostics[0]?.code).toBe("PRESENTATION_SOURCE_TRANSITION_INVALID");
      expect(JSON.stringify(result.diagnostics)).not.toContain("private-marker");
    }
  });

  it("does not execute state/event conversion hooks", () => {
    let calls = 0;
    const value = { [Symbol.toPrimitive]() { calls += 1; throw new Error("private-marker"); } };
    const invalidState = transition(value as unknown as DocumentationSourceReaderState, "reset");
    const invalidEvent = transition("idle", value as unknown as DocumentationSourceReaderEvent);
    expect(invalidState.state).toBe(value);
    expect(invalidEvent.state).toBe("idle");
    for (const result of [invalidState, invalidEvent]) expect(result.diagnostics[0]?.code).toBe("PRESENTATION_SOURCE_TRANSITION_INVALID");
    expect(calls).toBe(0);
  });
});
