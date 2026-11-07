/**
 * @file
 * @lang zh-CN 新项目规范的显式采用、精确旧读与资源分发边界回归。
 * @lang en Regressions for explicit project profile adoption, exact legacy reads and resource distribution boundaries.
 */
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {validateHiaProfile,getHiaProfileRule} from "@hia-doc/profile";
import {getOfficialHiaProfile,listOfficialHiaProfiles,createOfficialHiaProfileSet,HIA_OFFICIAL_PROFILE_CATALOG,HIA_TSDOC_PROJECT_PROFILE_CATALOG,getOfficialTsDocProjectProfile,createOfficialTsDocProjectProfileSet} from "./index.js";

describe("explicit TypeScript project profile distribution",()=>{
  it("keeps legacy defaults and catalog while explicitly selecting the new version",()=>{
    expect(getOfficialHiaProfile("ts-jsdoc-bridge")?.profileVersion).toBe("0.1.0-draft");
    expect(createOfficialHiaProfileSet().profiles.get("ts-jsdoc-bridge")?.profileVersion).toBe("0.1.0-draft");
    expect(listOfficialHiaProfiles().every(profile=>profile.profileVersion==="0.1.0-draft")).toBe(true);
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profileSchemaVersion).toBe("0.1.0-draft");
    const profile=getOfficialTsDocProjectProfile();
    expect(profile.schemaVersion).toBe("1.0.0");
    expect(profile.profileId).toBe("ts-jsdoc-bridge");
    expect(profile.profileVersion).toBe("0.2.0-draft");
    expect(validateHiaProfile(profile)).toEqual([]);
  });

  it("uses exact producer contracts without inventing emitted JavaScript",()=>{
    const profile=getOfficialTsDocProjectProfile();
    expect(profile.contracts).toEqual(expect.arrayContaining([
      {name:"hia-tsdoc-extraction",version:"0.2.0-draft",role:"consumes"},
      {name:"hia-ts-jsdoc-bridge",version:"0.2.0-draft",role:"produces"},
      {name:"hia-core-document",version:"0.2.0",role:"produces"},
      {name:"doc-source-map",version:"1.1.0",role:"produces"}
    ]));
    expect(profile.targets).not.toContain("generated-javascript");
    expect(profile.targets).not.toContain("jsdoc-integration");
    expect(profile.capabilities.ordinarySourceMap).toEqual({produces:false});
    expect(profile.capabilities.nativeJsdocExecution).toBe(false);
    expect(profile.tags.find(tag=>tag.name==="typeParam")?.mapsTo).toEqual({field:"i18n.fields",fieldPathPattern:"typeParams.<name>.description"});
  });

  it("assembles one new TS identity with legacy parents and no old deferred-type rule",()=>{
    const set=createOfficialTsDocProjectProfileSet();
    expect(set.diagnostics).toEqual([]);
    expect(set.profiles.size).toBe(7);
    expect(set.profiles.get("ts-jsdoc-bridge")?.profileVersion).toBe("0.2.0-draft");
    expect(set.profiles.get("jsdoc")?.profileVersion).toBe("0.1.0-draft");
    expect(getHiaProfileRule(set,"ts-jsdoc-bridge","ts-jsdoc/type-only-symbol-policy")?.messages.default).toContain("visible");
    expect(getHiaProfileRule(set,"ts-jsdoc-bridge","ts-jsdoc/generated-js-linkage")).toBeUndefined();
  });

  it("does not share new-profile data or affect future legacy/project sets",()=>{
    const first=getOfficialTsDocProjectProfile();
    const second=getOfficialTsDocProjectProfile();
    first.contracts.length=0;
    expect(second.contracts.length).toBeGreaterThan(0);
    const set=createOfficialTsDocProjectProfileSet();
    set.profiles.get("ts-jsdoc-bridge")!.rules.length=0;
    expect(createOfficialTsDocProjectProfileSet().profiles.get("ts-jsdoc-bridge")!.rules.length).toBeGreaterThan(0);
    expect(createOfficialHiaProfileSet().profiles.get("ts-jsdoc-bridge")?.profileVersion).toBe("0.1.0-draft");
  });

  it("distributes explicit versioned subpaths and a separate catalog with truthful schema",()=>{
    const manifest=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
    expect(manifest.exports["./ts-jsdoc-bridge/0.2.0-draft.profile.json"]).toBe("./dist/profiles/versioned/ts-jsdoc-bridge-0.2.0-draft.profile.json");
    expect(manifest.exports["./tsdoc-project/catalog.json"]).toBe("./dist/tsdoc-project-catalog.json");
    expect(HIA_TSDOC_PROJECT_PROFILE_CATALOG.catalogVersion).toBe("0.1.0-draft");
    expect(HIA_TSDOC_PROJECT_PROFILE_CATALOG.profileSchemaVersion).toBe("1.0.0");
    expect(HIA_TSDOC_PROJECT_PROFILE_CATALOG.profiles).toEqual([{profileId:"ts-jsdoc-bridge",profileVersion:"0.2.0-draft",layer:"bridge",path:"./ts-jsdoc-bridge/0.2.0-draft.profile.json"}]);
  });

  it("selects 0.3 explicitly while retaining exact defaults and separate copies",()=>{
    const profile=getOfficialTsDocProjectProfile("0.3.0-draft");
    expect(profile.profileVersion).toBe("0.3.0-draft");
    expect(validateHiaProfile(profile)).toEqual([]);
    expect(profile.contracts.filter(ref=>ref.name.startsWith("hia-ts")).every(ref=>ref.version==="0.3.0-draft")).toBe(true);
    expect(createOfficialTsDocProjectProfileSet("0.3.0-draft").diagnostics).toEqual([]);
    expect(createOfficialTsDocProjectProfileSet("0.3.0-draft").profiles.get("ts-jsdoc-bridge")?.profileVersion).toBe("0.3.0-draft");
    profile.contracts.length=0;
    expect(getOfficialTsDocProjectProfile("0.3.0-draft").contracts.length).toBeGreaterThan(0);
    expect(getOfficialTsDocProjectProfile().profileVersion).toBe("0.2.0-draft");
    expect(()=>getOfficialTsDocProjectProfile("9.0.0" as "0.3.0-draft")).toThrow();
    const manifest=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
    expect(manifest.exports["./ts-jsdoc-bridge/0.3.0-draft.profile.json"]).toBe("./dist/profiles/versioned/ts-jsdoc-bridge-0.3.0-draft.profile.json");
  });

  it("selects wrapped 0.4 independently and retains the 0.3 profile",()=>{
    const profile=getOfficialTsDocProjectProfile("0.4.0-draft");
    expect(validateHiaProfile(profile)).toEqual([]);
    expect(profile.profileVersion).toBe("0.4.0-draft");
    expect(createOfficialTsDocProjectProfileSet("0.4.0-draft").diagnostics).toEqual([]);
    expect(getOfficialTsDocProjectProfile("0.3.0-draft").profileVersion).toBe("0.3.0-draft");
    expect(getOfficialTsDocProjectProfile().profileVersion).toBe("0.2.0-draft");
    const manifest=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
    expect(manifest.exports["./ts-jsdoc-bridge/0.4.0-draft.profile.json"]).toBe("./dist/profiles/versioned/ts-jsdoc-bridge-0.4.0-draft.profile.json");
    expect(manifest.exports["./tsdoc-project/0.4.0-draft/catalog.json"]).toBe("./dist/tsdoc-wrapped-project-catalog.json");
    profile.contracts.length=0;
    expect(getOfficialTsDocProjectProfile("0.4.0-draft").contracts.length).toBeGreaterThan(0);
  });
});
