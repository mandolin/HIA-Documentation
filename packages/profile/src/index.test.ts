import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHiaProfileSet,
  getHiaProfileDiagnostic,
  getHiaProfileRule,
  hasProfileErrors,
  listHiaProfileIds,
  listHiaProfileTags,
  resolveHiaProfileTag,
  validateHiaProfile
} from "./index.js";
import type { HiaDocumentationProfile } from "./index.js";

const fixtureDir = path.resolve(__dirname, "fixtures/profiles");

describe("@hia-doc/profile", () => {
  it("validates and loads the first official profile draft set", async () => {
    const profiles = await loadProfileFixtures();
    const profileSet = createHiaProfileSet({ profiles });

    expect(profileSet.diagnostics).toEqual([]);
    expect(hasProfileErrors(profileSet.diagnostics)).toBe(false);
    expect(listHiaProfileIds(profileSet)).toEqual([
      "cssdoc",
      "doc-source-map",
      "htmdoc",
      "jsdoc",
      "pug-htmdoc-bridge",
      "sass-cssdoc-bridge",
      "ts-jsdoc-bridge"
    ]);
  });

  it("resolves aliases inside stable profiles", async () => {
    const profileSet = createHiaProfileSet({ profiles: await loadProfileFixtures() });

    const cssAlias = resolveHiaProfileTag(profileSet, {
      profileId: "cssdoc",
      tagName: "custom-property",
      includeAliases: true
    });
    expect(cssAlias?.resolvedTag.name).toBe("cssprop");
    expect(cssAlias?.aliasChain).toEqual(["custom-property"]);

    const htmlAlias = resolveHiaProfileTag(profileSet, {
      profileId: "htmdoc",
      tagName: "style-hook",
      includeAliases: true
    });
    expect(htmlAlias?.resolvedTag.name).toBe("stylehook");
  });

  it("queries inherited bridge profile registries", async () => {
    const profileSet = createHiaProfileSet({ profiles: await loadProfileFixtures() });

    const tags = listHiaProfileTags(profileSet, "sass-cssdoc-bridge", { includeInherited: true });
    expect(tags.map((tag) => tag.name)).toContain("component");
    expect(tags.map((tag) => tag.name)).toContain("custom-property");
    expect(tags.map((tag) => tag.name)).toContain("variable");

    expect(getHiaProfileRule(profileSet, "sass-cssdoc-bridge", "doc-source-map/no-unsafe-path")).toBeDefined();
    expect(getHiaProfileDiagnostic(profileSet, "ts-jsdoc-bridge", "TS_JSDOC_TYPE_ONLY_SYMBOL_DEFERRED")).toBeDefined();
  });

  it("reports structure and reference diagnostics", () => {
    const diagnostics = validateHiaProfile({
      schemaVersion: "9.9.9",
      profileId: "Bad Profile",
      profileVersion: "",
      displayName: "Bad Profile",
      layer: "legacy",
      extends: [],
      contracts: [],
      targets: [],
      tags: [
        {
          name: "component",
          status: "alias",
          scope: ["block"],
          targets: ["thing"]
        },
        {
          name: "component",
          status: "stable",
          scope: ["block"],
          targets: ["thing"]
        }
      ],
      rules: [
        {
          ruleId: "bad/rule",
          optionsSchema: {},
          messages: {}
        }
      ],
      mappings: [],
      diagnostics: [],
      capabilities: {}
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_SCHEMA_UNSUPPORTED");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_ID_INVALID");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_ALIAS_TARGET_MISSING");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_TAG_DUPLICATE");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_RULE_MESSAGE_MISSING");
    expect(hasProfileErrors(diagnostics)).toBe(true);
  });

  it("reports unknown extends and alias targets at profile set level", () => {
    const profileSet = createHiaProfileSet({
      profiles: [
        {
          schemaVersion: "0.1.0-draft",
          profileId: "child",
          profileVersion: "0.1.0-draft",
          displayName: "Child",
          layer: "bridge",
          extends: ["missing-parent"],
          contracts: [],
          targets: [],
          tags: [
            {
              name: "other",
              status: "alias",
              aliasFor: "missing-tag",
              scope: ["block"],
              targets: ["thing"]
            }
          ],
          rules: [],
          mappings: [
            {
              from: "tag:other",
              to: "symbolKind:thing",
              diagnostics: ["MISSING_DIAGNOSTIC"]
            }
          ],
          diagnostics: [],
          capabilities: {}
        }
      ]
    });

    expect(profileSet.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_EXTENDS_UNKNOWN");
    expect(profileSet.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_ALIAS_TARGET_UNKNOWN");
    expect(profileSet.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_PROFILE_MAPPING_DIAGNOSTIC_UNKNOWN");
  });
});

async function loadProfileFixtures(): Promise<HiaDocumentationProfile[]> {
  const fileNames = (await readdir(fixtureDir)).filter((fileName) => fileName.endsWith(".profile.json")).sort();
  return Promise.all(fileNames.map(async (fileName) => {
    const content = await readFile(path.join(fixtureDir, fileName), "utf8");
    return JSON.parse(content) as HiaDocumentationProfile;
  }));
}
