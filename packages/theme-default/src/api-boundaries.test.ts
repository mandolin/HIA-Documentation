/**
 * @file
 * @lang zh-CN 默认主题公开 API 的数据所有权和拒绝边界；不执行浏览器脚本或宣称视觉验收。
 * @lang en Data ownership and rejection boundaries of the default-theme API; this suite neither executes browser scripts nor claims visual acceptance.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENTATION_PORTAL_THEME,
  DEFAULT_THEME_CSS,
  DEFAULT_THEME_JS,
  DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES,
  PORTAL_THEME_SKIN_IDS,
  getDefaultDocumentationPortalThemeReference,
  getDefaultThemeAssets,
  getPortalThemeSchemeLabel,
  getPortalThemeSkinCatalog,
  getPortalThemeSkinLabel
} from "./index.js";

/**
 * @lang zh-CN 从一个不可信内存选项捕获固定错误；绝不序列化输入或异常细节。
 * @lang en Captures a fixed error from untrusted in-memory options without serializing input or exception details.
 * @param options <lang><zh-CN>仅供负例的非类型化数据。</zh-CN><en>Untyped data used only by negative cases.</en></lang>
 * @returns <lang><zh-CN>固定公开错误消息。</zh-CN><en>The fixed public error message.</en></lang>
 */
function rejection(options: unknown): string {
  try {
    getDefaultThemeAssets(options as never);
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    return (error as TypeError).message;
  }
  throw new Error("Expected brand-color rejection.");
}

/** @lang zh-CN 公开错误不复制负例的字段名或值。 @lang en The public error never copies fixture keys or values. */
const fixedError = "HIA_THEME_COLORS_INVALID: Brand colors require known semantic names and literal hex values.";

describe("default-theme public API boundaries", () => {
  /** @lang zh-CN reference 每次独立，且只投射五个公开字段。 @lang en Each reference is independent and projects exactly five public fields. */
  it("returns isolated metadata-only references", () => {
    // <lang><zh-CN>保存初始值，随后只改返回副本而不触碰导出常量。</zh-CN><en>Save initial values, then mutate only the returned copy rather than exported constants.</en></lang>
    const before = getDefaultDocumentationPortalThemeReference();
    // <lang><zh-CN>此副本用于写入探针，原始期待保持不变。</zh-CN><en>This copy receives mutation probes while the original expectation remains unchanged.</en></lang>
    const changed = getDefaultDocumentationPortalThemeReference();
    expect(changed).not.toBe(before);
    expect(Object.keys(changed).sort()).toEqual(["colorSchemePolicy", "contract", "contractVersion", "disclosure", "name"]);
    Reflect.set(changed, "name", "synthetic-private-marker");
    expect(getDefaultDocumentationPortalThemeReference()).toEqual(before);
    expect(DEFAULT_DOCUMENTATION_PORTAL_THEME.name).toBe("default");
  });

  /** @lang zh-CN catalog 的每项和两个嵌套数组都属于调用方。 @lang en Every catalog entry and both nested arrays belong to the caller. */
  it("isolates nested catalog mutations between calls", () => {
    // <lang><zh-CN>独立两次调用用于检出浅拷贝共享，而非只比较相等值。</zh-CN><en>Two independent calls detect shallow-copy aliasing rather than merely equal values.</en></lang>
    const original = getPortalThemeSkinCatalog();
    // <lang><zh-CN>探针只改第二次调用的嵌套数组。</zh-CN><en>The probe mutates only nested arrays from the second call.</en></lang>
    const changed = getPortalThemeSkinCatalog();
    for (let index = 0; index < original.length; index += 1) {
      expect(changed[index]).not.toBe(original[index]);
      expect(changed[index]!.capabilities).not.toBe(original[index]!.capabilities);
      expect(changed[index]!.supportedSchemes).not.toBe(original[index]!.supportedSchemes);
    }
    changed[0]!.capabilities.push("synthetic-private-marker");
    changed[0]!.supportedSchemes.length = 0;
    changed.reverse();
    expect(getPortalThemeSkinCatalog()).toEqual(original);
    expect(original.every((entry) => Object.keys(entry).sort().join(",") === "capabilities,skinId,supportedSchemes,tokenContract")).toBe(true);
  });

  /** @lang zh-CN 资产数组与每条记录可改，不污染后续调用。 @lang en Asset arrays and records are mutable without contaminating later calls. */
  it("returns fresh ordered assets and preserves exact default bytes", () => {
    // <lang><zh-CN>只比较内存内容，不写磁盘或执行资源。</zh-CN><en>Compare in-memory contents without writing or executing assets.</en></lang>
    const first = getDefaultThemeAssets();
    // <lang><zh-CN>第二组记录作为未被写入的对照。</zh-CN><en>The second record set is the untouched control.</en></lang>
    const second = getDefaultThemeAssets();
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(first[1]).not.toBe(second[1]);
    expect(first.map(({ path, contentType }) => [path, contentType])).toEqual([
      ["assets/hia-default.css", "text/css; charset=utf-8"],
      ["assets/hia-default.js", "text/javascript; charset=utf-8"]
    ]);
    first[0]!.contents = "synthetic-private-marker";
    first.pop();
    expect(second.map(({ contents }) => contents)).toEqual([DEFAULT_THEME_CSS, DEFAULT_THEME_JS]);
    expect(getDefaultThemeAssets()).toEqual(second);
  });

  /** @lang zh-CN 每个公开 token 都有唯一 kebab-case 输出，不执行用户转换钩子。 @lang en Every public token has one kebab-case output without invoking user coercion hooks. */
  it.each(DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES)("accepts the known token %s", (name) => {
    // <lang><zh-CN>冻结输入证明函数无需改写颜色；大写hex保留原值。</zh-CN><en>Frozen input proves colors need not be rewritten; uppercase hex keeps its literal value.</en></lang>
    const colors = Object.freeze({ [name]: "#Aa12Bb" });
    // <lang><zh-CN>按公开token名独立派生CSS后缀，不读取被测私有函数。</zh-CN><en>Derive the CSS suffix independently from public token names without accessing private implementation helpers.</en></lang>
    const suffix = name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
    // <lang><zh-CN>本次资源只允许出现一个覆盖声明。</zh-CN><en>The assets for this call must contain exactly one override declaration.</en></lang>
    const assets = getDefaultThemeAssets(Object.freeze({ colors }));
    expect(assets[0]!.contents.slice(DEFAULT_THEME_CSS.length)).toBe(`\n\n:root, :root[data-hia-skin], :root[data-hia-skin][data-hia-scheme] {\n  --hia-color-${suffix}: #Aa12Bb;\n}`);
    expect(assets[1]!.contents).toBe(DEFAULT_THEME_JS);
  });

  /** @lang zh-CN 未提供自有颜色保持默认，继承访问器不参与查找。 @lang en Missing own colors preserve defaults, and inherited accessors are not consulted. */
  it("ignores inherited colors without reading a prototype getter", () => {
    // <lang><zh-CN>计数器仅记录可观察getter执行，生命周期限此用例。</zh-CN><en>The counter records observable getter execution only for this case.</en></lang>
    let reads = 0;
    // <lang><zh-CN>把getter置于原型，验证实现只读取自有描述符。</zh-CN><en>Place the getter on the prototype to verify that only own descriptors are read.</en></lang>
    const prototype = Object.defineProperty({}, "colors", { get() { reads += 1; return { accent: "#fff" }; } });
    expect(getDefaultThemeAssets(Object.create(prototype))).toEqual(getDefaultThemeAssets());
    expect(getDefaultThemeAssets({ colors: undefined } as never)).toEqual(getDefaultThemeAssets());
    expect(reads).toBe(0);
  });

  /** @lang zh-CN null-prototype颜色属于普通安全数据输入。 @lang en Null-prototype colors are accepted as ordinary safe data. */
  it("accepts null-prototype color records", () => {
    // <lang><zh-CN>无原型记录是允许的JSON式颜色容器。</zh-CN><en>A null-prototype record is an admitted JSON-like color container.</en></lang>
    const colors = Object.assign(Object.create(null), { accent: "#AbCd" });
    expect(getDefaultThemeAssets({ colors })[0]!.contents).toContain("--hia-color-accent: #AbCd;");
  });

  /** @lang zh-CN 两层普通访问器都在取值前拒绝。 @lang en Ordinary accessors at both levels are rejected before evaluation. */
  it("rejects own option and token accessors with zero getter executions", () => {
    // <lang><zh-CN>计数器覆盖选项和token两次独立拒绝。</zh-CN><en>The counter covers independent option and token rejections.</en></lang>
    let reads = 0;
    // <lang><zh-CN>若getter被误执行则计数并抛出敏感标记。</zh-CN><en>If accidentally invoked, the getter increments the counter and throws a sensitive marker.</en></lang>
    const getter = () => { reads += 1; throw new Error("synthetic-private-marker"); };
    expect(rejection(Object.defineProperty({}, "colors", { enumerable: true, get: getter }))).toBe(fixedError);
    expect(rejection({ colors: Object.defineProperty({}, "accent", { enumerable: true, get: getter }) })).toBe(fixedError);
    expect(reads).toBe(0);
  });

  /** @lang zh-CN 隐藏属性和Symbol不能绕过闭集颜色检查。 @lang en Hidden properties and symbols cannot bypass the closed color set. */
  it("rejects hidden option, hidden token and symbol token keys", () => {
    expect(rejection(Object.defineProperty({}, "colors", { value: { accent: "#fff" } }))).toBe(fixedError);
    expect(rejection({ colors: Object.defineProperty({}, "accent", { value: "#fff" }) })).toBe(fixedError);
    expect(rejection({ colors: { [Symbol("synthetic-private-marker")]: "#fff" } })).toBe(fixedError);
  });

  /** @lang zh-CN 颜色容器类型无效不触发对象字符串转换。 @lang en Invalid color-container types never trigger object-to-string coercion. */
  it.each([null, [], new Date(0), Object.create({ accent: "#fff" }), "#fff", 1])("rejects invalid color container %#", (colors) => {
    expect(rejection({ colors })).toBe(fixedError);
  });

  /** @lang zh-CN 反射失败被归一化；Proxy反射本身不承诺零副作用。 @lang en Reflection failures are normalized; proxy reflection itself is not promised to be side-effect-free. */
  it("redacts reflection errors without claiming proxy isolation", () => {
    // <lang><zh-CN>计数器明确区分反射trap与普通getter保证。</zh-CN><en>The counter explicitly distinguishes reflection traps from the ordinary-getter guarantee.</en></lang>
    let traps = 0;
    // <lang><zh-CN>代理只用来触发反射异常，不作安全执行示例。</zh-CN><en>The proxy triggers a reflection failure only and is not a safe-execution example.</en></lang>
    const options = new Proxy({}, { getOwnPropertyDescriptor() { traps += 1; throw new Error("synthetic-private-marker"); } });
    expect(rejection(options)).toBe(fixedError);
    expect(traps).toBe(1);
  });

  /** @lang zh-CN 对象颜色不能通过toString/valueOf注入CSS。 @lang en Object-valued colors cannot inject CSS via toString or valueOf. */
  it("rejects object colors without coercing or serializing them", () => {
    // <lang><zh-CN>计数器记录两个本不应执行的用户钩子。</zh-CN><en>The counter records two user hooks that must never execute.</en></lang>
    let calls = 0;
    // <lang><zh-CN>非字符串颜色同时携带转换与JSON钩子。</zh-CN><en>The non-string color carries both coercion and JSON hooks.</en></lang>
    const color = { toString() { calls += 1; return "#fff"; }, toJSON() { calls += 1; return "synthetic-private-marker"; } };
    expect(rejection({ colors: { accent: color } })).toBe(fixedError);
    expect(calls).toBe(0);
  });

  /** @lang zh-CN 合法标签完全覆盖，skin未知值仅复核已有fallback。 @lang en All valid labels are covered; unknown skins only characterize the existing fallback. */
  it("keeps existing labels and the documented unknown-skin fallback", () => {
    expect(PORTAL_THEME_SKIN_IDS.map(getPortalThemeSkinLabel)).toEqual(["Classic / 经典", "Graphite / 石墨", "Lumen / 明亮"]);
    expect(getPortalThemeSkinLabel("synthetic-private-marker" as never)).toBe("Classic / 经典");
    expect(["dark", "light", "system"].map((scheme) => getPortalThemeSchemeLabel(scheme as "dark" | "light" | "system"))).toEqual(["Dark / 深色", "Light / 浅色", "System / 跟随系统"]);
  });
});
