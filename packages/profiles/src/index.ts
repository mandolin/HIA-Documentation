import catalogData from "./catalog.json" with { type: "json" };
import cssdocProfileData from "./profiles/cssdoc.profile.json" with { type: "json" };
import docSourceMapProfileData from "./profiles/doc-source-map.profile.json" with { type: "json" };
import htmdocProfileData from "./profiles/htmdoc.profile.json" with { type: "json" };
import jsdocProfileData from "./profiles/jsdoc.profile.json" with { type: "json" };
import pugHtmdocBridgeProfileData from "./profiles/pug-htmdoc-bridge.profile.json" with { type: "json" };
import sassCssdocBridgeProfileData from "./profiles/sass-cssdoc-bridge.profile.json" with { type: "json" };
import tsJsdocBridgeProfileData from "./profiles/ts-jsdoc-bridge.profile.json" with { type: "json" };
import { createHiaProfileSet } from "@hia-doc/profile";
import type { HiaDocumentationProfile, HiaProfileLayer, HiaProfileSet } from "@hia-doc/profile";

export const HIA_OFFICIAL_PROFILE_CATALOG_VERSION = "0.1.0-draft";
export const HIA_OFFICIAL_PROFILE_SCHEMA_VERSION = "0.1.0-draft";
export const HIA_OFFICIAL_PROFILE_IDS = [
  "cssdoc",
  "doc-source-map",
  "htmdoc",
  "jsdoc",
  "pug-htmdoc-bridge",
  "sass-cssdoc-bridge",
  "ts-jsdoc-bridge"
] as const;

export type HiaOfficialProfileId = typeof HIA_OFFICIAL_PROFILE_IDS[number];

export interface HiaOfficialProfileCatalogEntry {
  layer: HiaProfileLayer;
  path: string;
  profileId: HiaOfficialProfileId;
  profileVersion: string;
}

export interface HiaOfficialProfileCatalog {
  catalogVersion: string;
  profileSchemaVersion: string;
  profiles: HiaOfficialProfileCatalogEntry[];
}

const officialProfiles = [
  cssdocProfileData,
  docSourceMapProfileData,
  htmdocProfileData,
  jsdocProfileData,
  pugHtmdocBridgeProfileData,
  sassCssdocBridgeProfileData,
  tsJsdocBridgeProfileData
] as unknown as HiaDocumentationProfile[];

const officialProfileById = new Map(
  officialProfiles.map((profile) => [profile.profileId as HiaOfficialProfileId, profile])
);

export const HIA_OFFICIAL_PROFILE_CATALOG = catalogData as HiaOfficialProfileCatalog;

export function listOfficialHiaProfiles(): HiaDocumentationProfile[] {
  return officialProfiles.map(cloneProfile);
}

export function getOfficialHiaProfile(profileId: HiaOfficialProfileId | string): HiaDocumentationProfile | undefined {
  const profile = officialProfileById.get(profileId as HiaOfficialProfileId);
  return profile ? cloneProfile(profile) : undefined;
}

export function createOfficialHiaProfileSet(): HiaProfileSet {
  return createHiaProfileSet({ profiles: listOfficialHiaProfiles() });
}

function cloneProfile(profile: HiaDocumentationProfile): HiaDocumentationProfile {
  return structuredClone(profile);
}
