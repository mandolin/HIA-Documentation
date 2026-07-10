import { describe, expect, it } from "vitest";
import {
  getHiaSchema,
  HIA_SCHEMA_CATALOG,
  HIA_SCHEMA_CATALOG_VERSION,
  HIA_SCHEMA_KEYS,
  HIA_SCHEMA_PUBLIC_BASE_URL,
  listHiaSchemas
} from "./index.js";

describe("@hia-doc/schemas", () => {
  it("exports a complete owner-preserving schema catalog", () => {
    expect(HIA_SCHEMA_CATALOG.catalogVersion).toBe(HIA_SCHEMA_CATALOG_VERSION);
    expect(HIA_SCHEMA_CATALOG.publicBaseUrl).toBe(HIA_SCHEMA_PUBLIC_BASE_URL);
    expect(HIA_SCHEMA_CATALOG.schemas.map((entry) => entry.key)).toEqual(HIA_SCHEMA_KEYS);
    expect(HIA_SCHEMA_CATALOG.schemas.every((entry) => entry.path.startsWith("./"))).toBe(true);
    expect(HIA_SCHEMA_CATALOG.schemas.every((entry) => entry.publicUrl.startsWith(HIA_SCHEMA_PUBLIC_BASE_URL))).toBe(true);
    expect(HIA_SCHEMA_CATALOG.schemas.every((entry) => entry.publicUrl === entry.schemaId)).toBe(true);
    expect(new Set(HIA_SCHEMA_CATALOG.schemas.map((entry) => entry.ownerPackage))).toEqual(new Set([
      "@hia-doc/config",
      "@hia-doc/core",
      "@hia-doc/plugin-sdk",
      "@hia-doc/profile",
      "@hia-doc/source-linkage"
    ]));
  });

  it("resolves schemas by catalog key and schema id", () => {
    const schemas = listHiaSchemas();
    expect(schemas).toHaveLength(HIA_SCHEMA_KEYS.length);

    for (const entry of HIA_SCHEMA_CATALOG.schemas) {
      expect(getHiaSchema(entry.key)?.$id).toBe(entry.schemaId);
      expect(getHiaSchema(entry.schemaId)?.$id).toBe(entry.schemaId);
    }

    expect(getHiaSchema("missing")).toBeUndefined();
  });

  it("returns defensive schema copies", () => {
    const first = getHiaSchema("hia-document");
    const second = getHiaSchema("hia-document");

    expect(first).not.toBe(second);
    if (first) {
      first.title = "mutated";
    }
    expect(second?.title).toBeUndefined();
  });
});
