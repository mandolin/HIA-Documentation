/**
 * @file
 * @lang zh-CN 呈现源码资产/限额/摘要/纯请求计划的边界和现行责任；所有地址仅为合成数据，不请求网络。
 * @lang en Boundaries and current responsibilities for presentation assets, limits, digests and pure fetch plans; all URLs are synthetic and never fetched.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDocumentationSourceFetchPlan as plan,
  validateDocumentationPresentationProfile as validate,
  type DocumentationPresentationProfile,
  type DocumentationPresentationSourceAsset
} from "./documentation-presentation-profile.js";

/** @lang zh-CN 每次解析独立公开合成工件。 @lang en Parses an independent public synthetic fixture per invocation. */
function fixture(): DocumentationPresentationProfile {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
}
/** @lang zh-CN 仅提取诊断code用于责任断言。 @lang en Extracts diagnostic codes for responsibility assertions only. */
const codes = (value: unknown) => validate(value).map(({ code }) => code);

describe("presentation source URL boundary", () => {
  it.each(["./%3F/../../private", "./%23/../../private", "./%3fdir/../../../private"])("refuses traversal after an encoded filename delimiter: %s", (url) => {
    // <lang><zh-CN>编码分隔符仍属于文件名；真实URL路径解析会继续处理其后的..，无需发起请求。</zh-CN><en>Encoded delimiters remain filename data; real URL path parsing still processes subsequent dot-dot segments, with no request needed.</en></lang>
    expect(new URL(url, "https://docs.invalid/approved/root/").pathname.startsWith("/approved/root/")).toBe(false);
    const value = fixture();
    value.source.assets[0]!.relativeUrl = url;
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
    expect(plan(value, "asset.src.api").status).toBe("refused");
    value.source.mode = "link";
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });
  it.each([" https://outside.invalid/a", " //outside.invalid/a", " javascript:alert(1)", " ./sources/a", "./sources/a ", " "])("refuses raw boundary whitespace: %s", (url) => {
    const value = fixture();
    value.source.assets[0]!.relativeUrl = url;
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
    expect(plan(value, "asset.src.api").status).toBe("refused");
    value.source.mode = "link";
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });

  it("demonstrates browser leading-space origin normalization without network access", () => {
    const supplied = " https://outside.invalid/a";
    expect(new URL(supplied, "https://docs.invalid/reference/").origin).toBe("https://outside.invalid");
    const value = fixture();
    value.source.assets[0]!.relativeUrl = supplied;
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });

  it.each(["./sources/a", "sources/a", "./sources/a b", "./sources/a%20b", "./sources/%3F", "./sources/%23", "./sources/中.js", "./sources/a..b", "./sources/%252e%252e/a"])("retains relative-path behavior: %s", (url) => {
    const value = fixture();
    value.source.assets[0]!.relativeUrl = url;
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api").plan?.relativeUrl).toBe(url);
  });

  it.each(["https://outside.invalid/a", "//outside.invalid/a", "/root", "../private", "./%2e%2e/private", "./sources\\a", "./%ZZ", "./a?query", "./a#fragment", "./a\n"])("retains existing refusal: %s", (url) => {
    const value = fixture();
    value.source.assets[0]!.relativeUrl = url;
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });
});

describe("presentation source metadata and limits", () => {
  it.each(["sha256", "sha384", "sha512"] as const)("builds %s integrity without hashing a response", (algorithm) => {
    const value = fixture();
    // <lang><zh-CN>合成零字节只生成格式正确的摘要，不代表任何源码正文。</zh-CN><en>Synthetic zero bytes generate a format-valid digest, not a digest of any source body.</en></lang>
    const digest = Buffer.alloc({ sha256: 32, sha384: 48, sha512: 64 }[algorithm]).toString("base64");
    value.source.assets[0]!.digest = { algorithm, value: digest };
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api").plan?.integrity).toBe(`${algorithm}-${digest}`);
    value.source.assets[0]!.digest.value = Buffer.alloc(1).toString("base64");
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });

  it("retains alphabet/padding/length checks without canonicalizing unused bits", () => {
    const value = fixture();
    value.source.assets[0]!.digest = { algorithm: "sha256", value: `${"A".repeat(42)}B=` };
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api").plan?.integrity).toBe(`sha256-${"A".repeat(42)}B=`);
  });

  it.each([
    ["maxBytes", 1, 16_777_216], ["maxLines", 1, 100_000], ["timeoutMs", 100, 60_000]
  ] as const)("enforces %s integer range", (field, minimum, maximum) => {
    for (const [number, valid] of [[minimum, true], [maximum, true], [minimum - 1, false], [maximum + 1, false], [minimum + 0.5, false]] as const) {
      const value = fixture();
      value.source.readerPolicy.limits[field] = number;
      expect(codes(value)).toEqual(valid ? [] : ["PRESENTATION_SOURCE_ASSET_INVALID"]);
    }
  });

  it.each([["byteLength", 16_777_216], ["lineCount", 100_000]] as const)("enforces optional %s facts independently of reader limits", (field, maximum) => {
    for (const [number, valid] of [[0, true], [maximum, true], [-1, false], [maximum + 1, false]] as const) {
      const value = fixture();
      value.source.assets[0]![field] = number;
      expect(codes(value)).toEqual(valid ? [] : ["PRESENTATION_SOURCE_ASSET_INVALID"]);
      if (valid) expect(plan(value, "asset.src.api").status).toBe("ready");
    }
  });

  it.each(["release7", "R".repeat(128), "short6", "R".repeat(129), "release/path"])("checks logical revision %s", (revision) => {
    const value = fixture();
    value.source.assets[0]!.revision = revision;
    expect(codes(value)).toEqual(revision === "release7" || revision.length === 128 ? [] : ["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });

  it("treats optional source-map ids and media-type metadata as declarations", () => {
    const value = fixture();
    value.source.assets[0]!.sourceMapId = "map.not-resolved";
    value.source.assets[0]!.mediaType = "javascript";
    delete value.source.assets[0]!.byteLength;
    delete value.source.assets[0]!.lineCount;
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api").plan?.mediaType).toBe("javascript");
  });

  it.each([0, 10_000, 10_001])("enforces manifest count %s", (count) => {
    const value = fixture();
    const seed = value.source.assets[0]!;
    // <lang><zh-CN>唯一且已排序的id隔离数量边界；不同资产可声明相同URL，core不读取内容。</zh-CN><en>Unique sorted ids isolate count boundaries; assets may declare the same URL and core reads no contents.</en></lang>
    value.source.assets = Array.from({ length: count }, (_, index): DocumentationPresentationSourceAsset => ({ ...seed, assetId: `asset.${String(index).padStart(5, "0")}`, sourceId: `source.${index}` }));
    expect(codes(value)).toEqual(count <= 10_000 ? [] : ["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });

  it.each(["assetId", "sourceId", "order"])("enforces manifest identity and order: %s", (kind) => {
    const value = fixture();
    const other = structuredClone(value.source.assets[0]!);
    other.assetId = "asset.zzz";
    other.sourceId = "source.zzz";
    value.source.assets.push(other);
    if (kind === "assetId") other.assetId = value.source.assets[0]!.assetId;
    if (kind === "sourceId") other.sourceId = value.source.assets[0]!.sourceId;
    if (kind === "order") value.source.assets.reverse();
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });
});

describe("pure fetch plan responsibilities", () => {
  it.each(["fetch", "embed", "link", "none"] as const)("retains %s mode requirements", (mode) => {
    const value = fixture();
    value.source.mode = mode;
    if (mode === "none") { value.source.assets = []; value.privacy.sourceExposure = "none"; }
    if (mode === "embed") delete value.source.assets[0]!.relativeUrl;
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api").status).toBe(mode === "fetch" ? "ready" : "refused");
  });

  it("requires URL for every fetch/link asset and no assets in none mode", () => {
    const value = fixture();
    delete value.source.assets[0]!.relativeUrl;
    for (const mode of ["fetch", "link"] as const) { value.source.mode = mode; expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]); }
    value.source.mode = "none";
    value.privacy.sourceExposure = "none";
    expect(codes(value)).toEqual(["PRESENTATION_PRIVACY_BOUNDARY"]);
  });

  it("preserves current refused-profile behavior without treating it as execution consent", () => {
    const value = fixture();
    value.status = "refused";
    value.diagnostics = [{ code: "SYNTHETIC", message: "synthetic refusal", severity: "error" }];
    expect(validate(value)).toEqual([]);
    expect(plan(value, "asset.src.api")).toMatchObject({ status: "ready", diagnostics: [] });
    expect(value.diagnostics).toHaveLength(1);
  });

  it("returns detached frozen plan policies and a mutable outer result", () => {
    const value = fixture();
    const before = JSON.stringify(value);
    const result = plan(value, "asset.src.api");
    expect(JSON.stringify(value)).toBe(before);
    for (const object of [result.plan, result.plan?.limits, result.plan?.bodyPolicy, result.plan?.request]) expect(Object.isFrozen(object)).toBe(true);
    expect(Object.isFrozen(result)).toBe(false);
    expect(Object.isFrozen(result.diagnostics)).toBe(false);
    value.source.readerPolicy.limits.maxBytes = 1;
    expect(result.plan?.limits.maxBytes).toBe(262144);
    expect(result.plan?.request).toEqual({ cache: "default", credentials: "omit", mode: "same-origin", redirect: "error" });
  });

  it.each(["asset.absent", " invalid", ""])("refuses missing/invalid exact asset id %s", (id) => {
    expect(plan(fixture(), id)).toMatchObject({ status: "refused", diagnostics: [{ code: "PRESENTATION_SOURCE_FETCH_PLAN_REFUSED" }] });
    expect(plan(fixture(), id).plan).toBeUndefined();
  });
});
