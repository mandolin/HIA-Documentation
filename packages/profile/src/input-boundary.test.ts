/**
 * @file
 * @lang zh-CN 文档化配置规范的声明字段、普通JSON、集合接纳及读取错误隐私回归。
 * @lang en Regressions for declared fields, ordinary JSON, set admission and read-error privacy in documentation profiles.
 */
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHiaProfileSet, getHiaProfile, hasProfileErrors, listHiaProfileIds,
  loadHiaProfileFromFile, validateHiaProfile
} from "./index.js";
import type { HiaDocumentationProfile, HiaProfileSetInput } from "./index.js";

/** @lang zh-CN 创建全新草案测试配置；覆盖值故意允许非法类型。 @lang en Creates a fresh draft fixture; overrides deliberately allow invalid types. */
function profile(overrides: Record<string, unknown> = {}): HiaDocumentationProfile {
  return {
    schemaVersion: "0.1.0-draft", profileId: "example", profileVersion: "local-preview",
    displayName: "Example", layer: "extension", extends: [], contracts: [], targets: [],
    tags: [], rules: [], mappings: [], diagnostics: [], capabilities: {}, ...overrides
  } as HiaDocumentationProfile;
}

/** @lang zh-CN 创建标签字段反例的有效基底。 @lang en Creates a valid base for tag field counterexamples. */
function tag(overrides: Record<string, unknown>): Record<string, unknown> {
  return { name: "example", status: "stable", scope: ["block"], targets: [], ...overrides };
}

/** @lang zh-CN 创建规则字段反例的有效基底。 @lang en Creates a valid base for rule field counterexamples. */
function rule(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ruleId: "example/check", optionsSchema: {}, messages: { default: "" }, ...overrides };
}

/** @lang zh-CN 创建诊断字段反例的有效基底。 @lang en Creates a valid base for diagnostic field counterexamples. */
function diagnostic(overrides: Record<string, unknown>): Record<string, unknown> {
  return { code: "EXAMPLE", severity: "warning", defaultMessage: "Example", ...overrides };
}

// <lang><zh-CN>每项只改变一个既有schema字段，不把失败数量当成独立产品缺陷数量。</zh-CN><en>Each case changes one existing schema field; failure counts do not represent distinct product defect counts.</en></lang>
const invalidFields = [
  { name: "extends item", patch: { extends: [0] } },
  { name: "targets item", patch: { targets: [""] } },
  { name: "contract entry", patch: { contracts: [false] } },
  { name: "contract name", patch: { contracts: [{ name: "" }] } },
  { name: "contract version", patch: { contracts: [{ name: "example", version: false }] } },
  { name: "contract role", patch: { contracts: [{ name: "example", role: "" }] } },
  { name: "tag scope", patch: { tags: [tag({ scope: ["arbitrary"] })] } },
  { name: "tag targets", patch: { tags: [tag({ targets: [true] })] } },
  { name: "tag alias", patch: { tags: [tag({ aliasFor: "" })] } },
  { name: "tag repeatable", patch: { tags: [tag({ repeatable: "yes" })] } },
  { name: "tag grammar", patch: { tags: [tag({ valueGrammar: 0 })] } },
  { name: "tag conflicts", patch: { tags: [tag({ conflicts: "other" })] } },
  { name: "tag requires", patch: { tags: [tag({ requires: [""] })] } },
  { name: "tag mapping", patch: { tags: [tag({ mapsTo: [] })] } },
  { name: "tag diagnostics", patch: { tags: [tag({ diagnostics: [null] })] } },
  { name: "tag metadata", patch: { tags: [tag({ metadata: false })] } },
  { name: "rule category", patch: { rules: [rule({ category: "" })] } },
  { name: "rule severity", patch: { rules: [rule({ defaultSeverity: "fatal" })] } },
  { name: "rule appliesTo", patch: { rules: [rule({ appliesTo: [false] })] } },
  { name: "rule message value", patch: { rules: [rule({ messages: { default: "", en: 0 } })] } },
  { name: "rule fixable", patch: { rules: [rule({ fixable: "yes" })] } },
  { name: "rule suggestions", patch: { rules: [rule({ hasSuggestions: [] })] } },
  { name: "rule metadata", patch: { rules: [rule({ metadata: "text" })] } },
  ...["conditions", "diagnostics"].map((field) => ({ name: `mapping ${field}`, patch: { mappings: [{ from: "a", to: "b", [field]: [0] }] } })),
  ...["confidence", "sourcePolicy", "metadataPolicy"].map((field) => ({ name: `mapping ${field}`, patch: { mappings: [{ from: "a", to: "b", [field]: false }] } })),
  ...["messageKey", "target"].map((field) => ({ name: `diagnostic ${field}`, patch: { diagnostics: [diagnostic({ [field]: "" })] } })),
  { name: "diagnostic locations", patch: { diagnostics: [diagnostic({ relatedLocations: {} })] } },
  { name: "diagnostic suggestions", patch: { diagnostics: [diagnostic({ suggestions: [false] })] } }
];

describe("documentation profile declared fields", () => {
  it.each(invalidFields)("rejects $name", ({ patch }) => {
    expect(hasProfileErrors(validateHiaProfile(profile(patch)))).toBe(true);
  });

  it("retains open JSON extensions, empty arrays/messages and independent profile versions", () => {
    // <lang><zh-CN>领域正文和optionsSchema不在本轮解释，空消息是合法string。</zh-CN><en>Domain text and optionsSchema are not interpreted here; an empty message is a valid string.</en></lang>
    const input = profile({
      contracts: [{ name: "example", extension: [null, 1] }],
      tags: [tag({ metadata: { nested: [null, true, 2, "text"] } })],
      rules: [rule({ messages: { default: "", "zh-CN": "", en: "" } })],
      diagnostics: [diagnostic({ relatedLocations: [null, {}, [], "free JSON"] })],
      extension: { constructor: "data", __proto__: null }
    });
    const before = JSON.stringify(input);
    expect(validateHiaProfile(input)).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("does not echo invalid schema versions or IDs", () => {
    const errors = validateHiaProfile(profile({ schemaVersion: "PRIVATE-SENTINEL", profileId: "PRIVATE-SENTINEL" }));
    expect(hasProfileErrors(errors)).toBe(true);
    expect(JSON.stringify(errors)).not.toContain("PRIVATE-SENTINEL");
  });
});

// <lang><zh-CN>工厂避免共享可变反例，回调可构造JSON文本无法表达的内存状态。</zh-CN><en>Factories avoid shared mutable counterexamples and construct in-memory states that JSON text cannot express.</en></lang>
const invalidGraphs = [
  { name: "undefined", make: () => profile({ capabilities: { value: undefined } }) },
  { name: "function", make: () => profile({ capabilities: { value: () => 1 } }) },
  { name: "symbol value", make: () => profile({ capabilities: { value: Symbol("private") } }) },
  { name: "bigint", make: () => profile({ capabilities: { value: 1n } }) },
  { name: "NaN", make: () => profile({ capabilities: { value: NaN } }) },
  { name: "infinity", make: () => profile({ capabilities: { value: Infinity } }) },
  { name: "Date", make: () => profile({ capabilities: { value: new Date(0) } }) },
  { name: "Map", make: () => profile({ capabilities: { value: new Map() } }) },
  { name: "sparse array", make: () => profile({ targets: new Array(1) }) },
  { name: "non-index numeric array key", make: () => profile({ targets: Object.assign([], { "4294967295": () => 1 }) }) },
  { name: "cycle", make: () => { const input = profile(); input.capabilities.self = input; return input; } },
  { name: "hidden data", make: () => Object.defineProperty(profile(), "profileId", { value: "example", enumerable: false }) },
  { name: "custom toJSON", make: () => Object.defineProperty(profile(), "toJSON", { value: () => ({}) }) },
  { name: "revoked proxy", make: () => { const proxy = Proxy.revocable(profile(), {}); proxy.revoke(); return proxy.proxy; } }
];

describe("documentation profile JSON boundary", () => {
  it.each(invalidGraphs)("rejects $name without throwing", ({ make }) => {
    expect(hasProfileErrors(validateHiaProfile(make()))).toBe(true);
  });

  it("rejects getters without executing them, including hidden declared fields", () => {
    // <lang><zh-CN>计数器证明预检不执行访问器，而不是只吞掉getter抛出的异常。</zh-CN><en>The counter proves preflight avoids accessors rather than merely swallowing their thrown errors.</en></lang>
    let reads = 0;
    const input = Object.defineProperty(profile(), "displayName", { get() { reads += 1; throw new Error("PRIVATE-SENTINEL"); } });
    expect(hasProfileErrors(validateHiaProfile(input))).toBe(true);
    expect(reads).toBe(0);
  });

  it("permits null prototypes and shared acyclic JSON without mutations", () => {
    const shared = { value: [1, null, true] };
    const input = Object.assign(Object.create(null), profile({ capabilities: { a: shared, b: shared } }));
    expect(validateHiaProfile(input)).toEqual([]);
    expect(input.capabilities.a).toBe(shared);
    expect(input.capabilities.b).toBe(shared);
  });
});

describe("documentation profile set admission", () => {
  it.each([
    { name: "null", value: null }, { name: "non-object", value: 7 },
    { name: "missing extends", value: { profileId: "invalid" } },
    { name: "non-array tags", value: profile({ tags: null }) }
  ])("skips $name members while preserving valid peers", ({ value }) => {
    const valid = profile();
    const set = createHiaProfileSet({ profiles: [value, valid] } as HiaProfileSetInput);
    expect(hasProfileErrors(set.diagnostics)).toBe(true);
    expect(listHiaProfileIds(set)).toEqual(["example"]);
    expect(getHiaProfile(set, "example")).toBe(valid);
  });

  it("does not let an invalid member reserve a valid ID", () => {
    const valid = profile();
    const set = createHiaProfileSet({ profiles: [profile({ contracts: [null] }), valid] });
    expect(getHiaProfile(set, "example")).toBe(valid);
    expect(set.diagnostics.some(({ code }) => code === "HIA_PROFILE_DUPLICATE_ID")).toBe(false);
  });

  it("retains first-valid duplicate handling", () => {
    const first = profile();
    const set = createHiaProfileSet({ profiles: [first, profile()] });
    expect(getHiaProfile(set, "example")).toBe(first);
    expect(set.diagnostics.some(({ code }) => code === "HIA_PROFILE_DUPLICATE_ID")).toBe(true);
  });

  it("rejects container and item accessors without executing them", () => {
    let reads = 0;
    const container = Object.defineProperty({}, "profiles", { enumerable: true, get() { reads += 1; return []; } });
    const members = Object.defineProperty([], "0", { get() { reads += 1; return profile(); } });
    expect(hasProfileErrors(createHiaProfileSet(container as HiaProfileSetInput).diagnostics)).toBe(true);
    expect(hasProfileErrors(createHiaProfileSet({ profiles: members }).diagnostics)).toBe(true);
    expect(reads).toBe(0);
  });

  it("does not invoke caller-defined symbol iterators", () => {
    let calls = 0;
    const members = [profile()];
    members[Symbol.iterator] = () => { calls += 1; throw new Error("must not execute"); };
    expect(createHiaProfileSet({ profiles: members }).diagnostics).toEqual([]);
    expect(calls).toBe(0);
  });

  it.each([{ name: "null", value: null }, { name: "missing list", value: {} }, { name: "wrong list", value: { profiles: "wrong" } }])("reports invalid $name containers", ({ value }) => {
    const set = createHiaProfileSet(value as HiaProfileSetInput);
    expect(set.profiles.size).toBe(0);
    expect(hasProfileErrors(set.diagnostics)).toBe(true);
  });
});

/** @lang zh-CN 在独立临时目录写入一个fixture并清理固定文件；无递归删除。 @lang en Writes one fixture in a separate temporary directory and cleans fixed files without recursive deletion. */
async function withFile(content: string, verify: (file: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "hia-profile-input-"));
  const file = path.join(directory, "profile.json");
  try {
    await writeFile(file, content, "utf8");
    await verify(file);
  } finally {
    await unlink(file);
    await rmdir(directory);
  }
}

describe("documentation profile file loading", () => {
  it("loads a valid file without rewriting it", async () => {
    const content = JSON.stringify(profile());
    await withFile(content, async (file) => {
      const loaded = await loadHiaProfileFromFile(file);
      expect(loaded.diagnostics).toEqual([]);
      expect(loaded.path).toBe(file);
      expect(await readFile(file, "utf8")).toBe(content);
    });
  });

  it("does not disclose malformed JSON content in read errors", async () => {
    await withFile('PRIVATE-SENTINEL invalid JSON', async (file) => {
      const loaded = await loadHiaProfileFromFile(file);
      expect(loaded.diagnostics[0]?.code).toBe("HIA_PROFILE_READ_FAILED");
      expect(JSON.stringify(loaded.diagnostics)).not.toContain("PRIVATE-SENTINEL");
      expect(loaded.path).toBe(file);
    });
  });

  it("reports the actual primitive root as invalid", async () => {
    await withFile("null", async (file) => {
      const loaded = await loadHiaProfileFromFile(file);
      expect(loaded.diagnostics[0]?.code).toBe("HIA_PROFILE_INVALID");
      expect(hasProfileErrors(loaded.diagnostics)).toBe(true);
    });
  });
});
