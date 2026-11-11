/**
 * @file
 * @lang zh-CN 作用域清单版本与旧扩展读取的兼容反例。
 * @lang en Compatibility counterexamples for scoped manifest versions and legacy extension reading.
 */
import {expect, it} from "vitest";
import {validateHiaProjectManifest} from "./index.js";

it("accepts explicit 1.1.0 scopes and retains all admitted legacy versions", () => {
  for (const schemaVersion of ["0.1.0-draft", "1.0.0", "1.1.0"]) {
    expect(validateHiaProjectManifest({schemaVersion, project:{name:"Fixture"}, inputs:[{kind:"hia-document",path:"doc.json",identityScope:"package:fixture:module"}]})).toEqual([]);
  }
});

it("rejects malformed scopes only where the version interprets them", () => {
  for (const identityScope of ["", "../private", "C:\\private", " leading", "x".repeat(257), 1, null]) {
    const inputs=[{kind:"hia-document",path:"doc.json",identityScope}];
    expect(validateHiaProjectManifest({schemaVersion:"1.1.0",project:{name:"Fixture"},inputs}).map(item=>item.code)).toContain("HIA_PROJECT_MANIFEST_IDENTITY_SCOPE_INVALID");
    expect(validateHiaProjectManifest({schemaVersion:"1.0.0",project:{name:"Fixture"},inputs})).toEqual([]);
  }
});
