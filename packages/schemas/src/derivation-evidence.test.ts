/**
 * @file
 * @lang zh-CN 独立派生证据草案的owner分发、精确版本及防御副本复核。
 * @lang en Owner distribution, exact-version and defensive-copy checks for the separate derivation-evidence draft.
 */
import { describe, expect, it } from "vitest";
import { ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA } from "../../plugin-sdk/src/derivation-evidence.js";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "./index.js";

describe("artifact derivation evidence draft distribution", () => {
  it("distributes the owner schema with the exact independent draft identity", () => {
    const id = "https://mandolin.github.io/HIA-Documentation/schemas/artifact-derivation-evidence-0.1.0-draft.schema.json";
    expect(getHiaSchema("artifact-derivation-evidence")).toEqual(ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA);
    expect(getHiaSchema(id)).toEqual(ARTIFACT_DERIVATION_EVIDENCE_JSON_SCHEMA);
    expect(HIA_SCHEMA_CATALOG.schemas.find(row => row.key === "artifact-derivation-evidence")).toMatchObject({ contractVersion: "0.1.0-draft", stability: "draft", ownerPackage: "@hia-doc/plugin-sdk" });
    expect(getHiaSchema(id.replace("0.1.0-draft", "1.0.0"))).toBeUndefined();
  });
  it("returns independent schema copies", () => {
    const first = getHiaSchema("artifact-derivation-evidence")!;
    first.title = "changed";
    expect(getHiaSchema("artifact-derivation-evidence")!.title).toBeUndefined();
  });
});
