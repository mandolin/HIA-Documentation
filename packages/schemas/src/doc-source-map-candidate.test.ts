/**
 * @file
 * @lang zh-CN 文档源码映射候选成熟度、同身份原字节与独立草案/历史读取保护回归。
 * @lang en Guards documentation-map candidate maturity, unchanged same-identity bytes, and separate draft/historical readers.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOC_SOURCE_MAP_JSON_SCHEMA } from "../../source-linkage/src/schema.js";
import { getHiaSchema, HIA_SCHEMA_CATALOG, listHiaSchemas } from "./index.js";

describe("documentation source-map 1.1.0 candidate distribution", () => {
  it("promotes maturity without changing the owner schema identity or bytes", () => {
    // <lang><zh-CN>候选标记是目录事实，不能借此改写同一1.1.0身份下的schema内容。</zh-CN><en>Candidate maturity is a catalog fact, not permission to rewrite schema content under the same 1.1.0 identity.</en></lang>
    const entry = HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "doc-source-map");
    // <lang><zh-CN>固定原始快照摘要独立于catalog，包含其现行生成排版字节。</zh-CN><en>The snapshot digest is independent of the catalog and includes its current generated formatting bytes.</en></lang>
    const schemaBytes = readFileSync(new URL("./schemas/doc-source-map.schema.json", import.meta.url));
    expect(entry).toMatchObject({
      contractVersion: "1.1.0",
      ownerPackage: "@hia-doc/source-linkage",
      schemaId: "https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.1.0.schema.json",
      stability: "stable-candidate"
    });
    expect(createHash("sha256").update(schemaBytes).digest("hex")).toBe("166a85bde480e143d9b424073f6a84f8118d7bf7102c1956c35152e719e2e2db");
    expect(getHiaSchema("doc-source-map")).toEqual(DOC_SOURCE_MAP_JSON_SCHEMA);
    expect(getHiaSchema(entry!.schemaId)).toEqual(DOC_SOURCE_MAP_JSON_SCHEMA);
  });

  it("retains exact historical identities without accepting an unknown adjacent version", () => {
    // <lang><zh-CN>成熟度不协商版本；历史精确URL仍取自身定义，未知minor/patch不回退到当前版。</zh-CN><en>Maturity does not negotiate versions; exact historical URLs retain their definitions, while unknown minor/patch versions never fall back to current.</en></lang>
    for (const version of ["0.1.0-draft", "1.0.0", "1.1.0"]) {
      const id = `https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-${version}.schema.json`;
      expect(getHiaSchema(id)?.$id).toBe(id);
      expect(getHiaSchema(id)?.properties.contractVersion).toEqual({ const: version });
    }
    for (const version of ["1.1.1", "1.2.0", "2.0.0", "1.1.0-draft"]) {
      expect(getHiaSchema(`https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-${version}.schema.json`)).toBeUndefined();
    }
  });

  it("leaves binding and coordinate evidence drafts independent", () => {
    // <lang><zh-CN>只晋升这一个契约；绑定/侧载的独立门禁不能被顺带跳过。</zh-CN><en>Promote this contract alone; independent binding and sidecar gates must not be bypassed.</en></lang>
    for (const key of ["generated-documentation-binding", "ordinary-source-map-coordinate-profile"]) {
      expect(HIA_SCHEMA_CATALOG.schemas.find((entry) => entry.key === key)?.stability).toBe("draft");
    }
    expect(listHiaSchemas()).toHaveLength(18);
    expect(HIA_SCHEMA_CATALOG.schemas.filter(({ stability }) => stability === "stable-candidate")).toHaveLength(8);
  });
});
