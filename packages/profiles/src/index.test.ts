import { describe, expect, it } from "vitest";
import { validateHiaProfile } from "@hia-doc/profile";
import {
  createOfficialHiaProfileSet,
  getOfficialHiaProfile,
  HIA_OFFICIAL_PROFILE_CATALOG,
  HIA_OFFICIAL_PROFILE_CATALOG_VERSION,
  HIA_OFFICIAL_PROFILE_IDS,
  HIA_OFFICIAL_PROFILE_SCHEMA_VERSION,
  listOfficialHiaProfiles
} from "./index.js";

describe("@hia-doc/profiles", () => {
  it("exports a complete catalog for the official profile set", () => {
    expect(HIA_OFFICIAL_PROFILE_CATALOG.catalogVersion).toBe(HIA_OFFICIAL_PROFILE_CATALOG_VERSION);
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profileSchemaVersion).toBe(HIA_OFFICIAL_PROFILE_SCHEMA_VERSION);
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profiles.map((entry) => entry.profileId)).toEqual(HIA_OFFICIAL_PROFILE_IDS);
    expect(HIA_OFFICIAL_PROFILE_CATALOG.profiles.every((entry) => entry.path.startsWith("./"))).toBe(true);
  });

  it("validates every distributed profile through the runtime package", () => {
    const profiles = listOfficialHiaProfiles();

    expect(profiles.map((profile) => profile.profileId)).toEqual(HIA_OFFICIAL_PROFILE_IDS);
    expect(profiles.flatMap((profile) => validateHiaProfile(profile))).toEqual([]);
    expect(createOfficialHiaProfileSet().diagnostics).toEqual([]);
  });

  it("returns defensive profile copies", () => {
    const first = getOfficialHiaProfile("cssdoc");
    const second = getOfficialHiaProfile("cssdoc");

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);

    first?.tags.splice(0, first.tags.length);
    expect(second?.tags.length).toBeGreaterThan(0);
    expect(getOfficialHiaProfile("missing")).toBeUndefined();
  });
});
