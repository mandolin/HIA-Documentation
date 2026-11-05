/**
 * @file
 * @lang zh-CN 官方分发包真实声明消费者：身份闭集与开放查询string并存，不把读取当成稳定验收。
 * @lang en Actual declaration consumer for official distribution: closed identities coexist with open string lookup, without treating reads as stability acceptance.
 */
import { createOfficialHiaProfileSet, getOfficialHiaProfile, HIA_OFFICIAL_PROFILE_CATALOG, HIA_OFFICIAL_PROFILE_IDS, listOfficialHiaProfiles } from "../src/index.js";
import type { HiaOfficialProfileCatalog, HiaOfficialProfileCatalogEntry, HiaOfficialProfileId } from "../src/index.js";
import type { HiaDocumentationProfile, HiaProfileSet } from "@hia-doc/profile";
import {getOfficialTsDocProjectProfile,createOfficialTsDocProjectProfileSet,HIA_TSDOC_PROJECT_PROFILE_CATALOG} from "../src/index.js";

// <lang><zh-CN>官方ID是闭集，但string查询允许未知输入并保留undefined结果。</zh-CN><en>Official IDs form a closed set, while string queries permit unknown input and retain undefined results.</en></lang>
const id: HiaOfficialProfileId = "cssdoc";
const maybe: HiaDocumentationProfile | undefined = getOfficialHiaProfile("arbitrary");
const entries: HiaDocumentationProfile[] = listOfficialHiaProfiles();
const set: HiaProfileSet = createOfficialHiaProfileSet();
const catalog: HiaOfficialProfileCatalog = HIA_OFFICIAL_PROFILE_CATALOG;
const entry: HiaOfficialProfileCatalogEntry | undefined = catalog.profiles[0];
const ids: readonly HiaOfficialProfileId[] = HIA_OFFICIAL_PROFILE_IDS;
// @ts-expect-error Arbitrary strings are not known official identities.
const unknownId: HiaOfficialProfileId = "arbitrary";
// @ts-expect-error Exact lookup can return undefined.
const guaranteed: HiaDocumentationProfile = getOfficialHiaProfile("cssdoc");
// @ts-expect-error The exported literal array is readonly in the type system.
HIA_OFFICIAL_PROFILE_IDS.push("new");
void [id, maybe, entries, set, catalog, entry, ids, unknownId, guaranteed];

// <lang><zh-CN>新项目采用具有独立入口和已存在的真实公开类型，旧读取的undefined边界不被扩大。</zh-CN><en>New project adoption has separate entries with actual existing public types, without widening legacy lookup's undefined boundary.</en></lang>
const projectProfile: HiaDocumentationProfile = getOfficialTsDocProjectProfile();
const projectSet: HiaProfileSet = createOfficialTsDocProjectProfileSet();
const projectCatalog: HiaOfficialProfileCatalog = HIA_TSDOC_PROJECT_PROFILE_CATALOG;
void [projectProfile,projectSet,projectCatalog];
