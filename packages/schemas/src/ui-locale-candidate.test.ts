/**
 * @file
 * @lang zh-CN 新旧界面语言Schema精确分发、稀疏元数据和原始历史字节保护。
 * @lang en Exact current/legacy UI-locale schema distribution, sparse metadata and original historical-byte protection.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA, LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA } from "../../core/src/documentation-ui-locale-completeness.js";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "./index.js";

describe("UI locale 1.0.0 candidate distribution", () => {
  it("keeps both exact schema identities and rejects adjacent versions", () => {
    expect(getHiaSchema("documentation-ui-locale-completeness")).toEqual(DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA);
    expect(getHiaSchema(LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$id)).toEqual(LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA);
    expect(HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "documentation-ui-locale-completeness")).toMatchObject({ contractVersion: "1.0.0", stability: "stable-candidate" });
    for (const version of ["1.0.1", "1.1.0", "1.0.0-draft"]) {
      expect(getHiaSchema(`https://mandolin.github.io/HIA-Documentation/schemas/documentation-ui-locale-completeness-${version}.schema.json`)).toBeUndefined();
    }
  });

  it("changes sparse metadata only under the new identity and preserves historical bytes", () => {
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs.surface.properties.languageMetadata.minItems).toBe(0);
    expect(LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$defs.surface.properties.languageMetadata.minItems).toBe(1);
    const bytes = readFileSync(new URL("./history/documentation-ui-locale-completeness-0.1.0-draft.schema.json", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("49c0a2da49a27207098c342c172a8f3aa5bdb06c36be665fd1afbfd8cababfa2");
    expect(JSON.parse(bytes.toString("utf8"))).toEqual(LEGACY_DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA);
  });
});
