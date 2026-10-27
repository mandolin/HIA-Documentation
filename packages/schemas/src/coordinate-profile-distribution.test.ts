/**
 * @file
 * @lang zh-CN 逐槽位坐标证据草案的 owner 快照、精确身份与封闭摘要形状回归。
 * @lang en Owner-snapshot, exact-identity and closed digest-shape regressions for the per-slot coordinate evidence draft.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION,
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA,
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID
} from "../../source-linkage/src/coordinate-profile-schema.js";
import { getHiaSchema, HIA_SCHEMA_CATALOG, listHiaSchemas } from "./index.js";

describe("ordinary source-map coordinate profile distribution", () => {
  it("distributes the exact owner draft without promoting unrelated contracts", () => {
    // <lang><zh-CN>当前 key 与精确 ID 必须解析为 owner 快照；未知版本无隐式兼容。</zh-CN><en>The current key and exact ID must resolve to the owner snapshot; unknown versions have no implicit compatibility.</en></lang>
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "ordinary-source-map-coordinate-profile");
    expect(entry).toMatchObject({
      contractVersion: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION,
      ownerPackage: "@hia-doc/source-linkage",
      schemaId: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID,
      stability: "draft"
    });
    expect(getHiaSchema("ordinary-source-map-coordinate-profile")).toEqual(ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA);
    expect(getHiaSchema(ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID)).toEqual(ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA);
    expect(getHiaSchema(ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID.replace("0.1.0-draft", "1.0.0"))).toBeUndefined();
    expect(listHiaSchemas()).toHaveLength(18);
    // <lang><zh-CN>文档地图已独立取得候选标记，坐标侧载仍保持自己的草案身份。</zh-CN><en>The documentation map has independently become a candidate; this coordinate sidecar retains its own draft identity.</en></lang>
    expect(HIA_SCHEMA_CATALOG.schemas.filter(({ stability }) => stability === "stable-candidate")).toHaveLength(7);
  });

  it("pins the source-slot coordinate and privacy wire boundary", () => {
    // <lang><zh-CN>schema只做结构护栏；跨图身份与真实字节由owner reader继续验证。</zh-CN><en>The schema guards structure only; the owner reader still verifies cross-map identities and actual bytes.</en></lang>
    const schema = ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.sourceSlots.maxItems).toBe(4096);
    expect(schema.$defs.sourceSlot.additionalProperties).toBe(false);
    expect(schema.$defs.sourceSlot.required).toEqual(expect.arrayContaining([
      "sectionIndex", "sourceIndex", "sourceId", "columnUnit", "sourceByteDigest",
      "sourceTextEncoding", "sourceTextTransform", "sourceTextDigest"
    ]));
    expect(schema.$defs.sourceSlot.properties.sourceTextEncoding).toEqual({ const: "utf-8" });
    expect(schema.$defs.sourceSlot.properties.sourceTextTransform).toEqual({ const: "none" });
    expect(schema.$defs.sourceSlot.properties.columnUnit.enum).toEqual(["utf16-code-unit", "unicode-code-point", "byte", "unknown"]);
    // <lang><zh-CN>真实Sass/TypeScript/Vue的命名空间ID可保留；路径、凭据URL及末尾换行不能伪装成ID。</zh-CN><en>Real Sass/TypeScript/Vue namespace IDs remain valid; paths, credential URLs and trailing newlines cannot masquerade as identities.</en></lang>
    const identityPattern = new RegExp(schema.$defs.identity.pattern);
    for (const id of [
      "docmap:sass-css:fixtures-doc-source-map-sass-css-src-button-scss",
      "sourcemap:ts-js:document",
      "artifact:vue-template:render",
      "source:vue:fixtures-doc-source-map-vue-sfc-src-components-profilecard-vue"
    ]) expect(identityPattern.test(id)).toBe(true);
    for (const id of ["C:\\private\\source.ts", "\\\\server\\share\\source.ts", "https://user:secret@example.invalid/map", "source:vue\n", " source:vue", "source:vue "]) expect(identityPattern.test(id)).toBe(false);
    expect(new RegExp(schema.$defs.sourceRevision.pattern).test("revision:public-1.0")).toBe(true);
    expect(new RegExp(schema.$defs.sourceRevision.pattern).test("C:\\private\\source.ts")).toBe(false);
    expect(new RegExp(schema.$defs.sourceRevision.pattern).test("https://example.invalid/private")).toBe(false);
    expect(new RegExp(schema.$defs.sourceRevision.pattern).test("revision:public\n")).toBe(false);
    expect(schema.$defs.privacy.properties.sourcesContentPolicy).toEqual({ const: "none" });
    expect(schema.$defs.documentationMap.properties.contractVersion).toEqual({ const: "1.1.0" });
  });

  it("accepts only canonical base64 shape for a 32-byte SHA-256 digest", () => {
    // <lang><zh-CN>规范摘要是摘要字节的base64，而非文件正文的base64或十六进制。</zh-CN><en>The canonical value is base64 of digest bytes, not base64 of file contents or hexadecimal.</en></lang>
    const pattern = new RegExp(ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA.$defs.digest.properties.value.pattern);
    const digest = createHash("sha256").update("public synthetic fixture", "utf8").digest("base64");
    expect(pattern.test(digest)).toBe(true);
    expect(pattern.test(digest.slice(0, -2) + "B=")).toBe(false);
    expect(pattern.test(createHash("sha256").update("public synthetic fixture").digest("hex"))).toBe(false);
  });
});
