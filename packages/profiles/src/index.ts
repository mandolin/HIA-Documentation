/**
 * @file
 * @lang zh-CN 七份默认规范及显式TypeScript项目版本的分发入口；访问器复制配置，目录常量/直接JSON导出是共享元数据。
 * @lang en Distribution entry for seven default profiles and an explicit TypeScript project version; accessors copy profiles while catalogs/direct JSON exports are shared metadata.
 */
import catalogData from "./catalog.json" with { type: "json" };
import cssdocProfileData from "./profiles/cssdoc.profile.json" with { type: "json" };
import docSourceMapProfileData from "./profiles/doc-source-map.profile.json" with { type: "json" };
import htmdocProfileData from "./profiles/htmdoc.profile.json" with { type: "json" };
import jsdocProfileData from "./profiles/jsdoc.profile.json" with { type: "json" };
import pugHtmdocBridgeProfileData from "./profiles/pug-htmdoc-bridge.profile.json" with { type: "json" };
import sassCssdocBridgeProfileData from "./profiles/sass-cssdoc-bridge.profile.json" with { type: "json" };
import tsJsdocBridgeProfileData from "./profiles/ts-jsdoc-bridge.profile.json" with { type: "json" };
import tsDocProjectProfileData from "./profiles/versioned/ts-jsdoc-bridge-0.2.0-draft.profile.json" with { type: "json" };
import tsDocProjectCatalogData from "./tsdoc-project-catalog.json" with { type: "json" };
import { createHiaProfileSet } from "@hia-doc/profile";
import type { HiaDocumentationProfile, HiaProfileLayer, HiaProfileSet } from "@hia-doc/profile";

/** @lang zh-CN 目录形状的版本，与npm版本和每份规范语义版本独立。 @lang en Catalog-shape version, independent of npm and individual profile semantic versions. */
export const HIA_OFFICIAL_PROFILE_CATALOG_VERSION = "0.1.0-draft";
/** @lang zh-CN 随包七份JSON实际使用的schema身份，不追随runtime未来默认版本。 @lang en Schema identity actually used by the seven bundled JSON files, independent of future runtime defaults. */
export const HIA_OFFICIAL_PROFILE_SCHEMA_VERSION = "0.1.0-draft";
/** @lang zh-CN 官方身份的字面类型与固定列出顺序；调用者应只读使用，运行时未冻结数组。 @lang en Literal official identities and fixed listing order; callers must treat this array as read-only, as it is not frozen at runtime. */
export const HIA_OFFICIAL_PROFILE_IDS = [
  "cssdoc",
  "doc-source-map",
  "htmdoc",
  "jsdoc",
  "pug-htmdoc-bridge",
  "sass-cssdoc-bridge",
  "ts-jsdoc-bridge"
] as const;

/** @lang zh-CN 七个官方身份的闭集；访问器另允许string查询未知身份并返回undefined。 @lang en Closed set of seven official identities; accessors separately allow string queries and return undefined for unknown identities. */
export type HiaOfficialProfileId = typeof HIA_OFFICIAL_PROFILE_IDS[number];

/** @lang zh-CN 目录中的一条元数据引用，不自动加载文件、解析版本范围或授予公开权限。 @lang en One catalog metadata reference, without automatic file loading, version-range resolution or disclosure permission. */
export interface HiaOfficialProfileCatalogEntry {
  /** @lang zh-CN 声明的语义分层，不自动决定继承优先级。 @lang en Declared semantic layer, without automatic inheritance precedence. */
  layer: HiaProfileLayer;
  /** @lang zh-CN 相对于包目录的显式JSON导出位置；不是URL抓取指令。 @lang en Explicit JSON export location relative to the package catalog, not a URL-fetch instruction. */
  path: string;
  /** @lang zh-CN 精确官方身份。 @lang en Exact official identity. */
  profileId: HiaOfficialProfileId;
  /** @lang zh-CN 单份规范的语义版本，不等于schema/catalog/npm版本。 @lang en Individual profile semantic version, distinct from schema/catalog/npm versions. */
  profileVersion: string;
}

/** @lang zh-CN 官方目录的静态类型视图，不是已执行校验或注册表发布证明。 @lang en Static type view of the official catalog, not proof of executed validation or registry publication. */
export interface HiaOfficialProfileCatalog {
  /** @lang zh-CN 目录形状版本。 @lang en Catalog-shape version. */
  catalogVersion: string;
  /** @lang zh-CN 此目录内配置使用的文档化配置规范schema版本。 @lang en Documentation-profile schema version used by this catalog's profiles. */
  profileSchemaVersion: string;
  /** @lang zh-CN 按官方顺序列出的引用；目录元数据共享，调用者不应直接修改。 @lang en References in official order; catalog metadata is shared and callers must not mutate it directly. */
  profiles: HiaOfficialProfileCatalogEntry[];
}

// <lang><zh-CN>固定JSON模块构成分发数据源，不扫描workspace、抓取网络或自动选择项目规范。</zh-CN><en>Fixed JSON modules form distribution data, without workspace scanning, network fetching or automatic project-profile selection.</en></lang>
const officialProfiles = [
  cssdocProfileData,
  docSourceMapProfileData,
  htmdocProfileData,
  jsdocProfileData,
  pugHtmdocBridgeProfileData,
  sassCssdocBridgeProfileData,
  tsJsdocBridgeProfileData
] as unknown as HiaDocumentationProfile[];

// <lang><zh-CN>字面身份Map避免constructor/__proto__原型命中，注册时不改写JSON字段。</zh-CN><en>A literal-identity Map avoids constructor/__proto__ prototype hits without rewriting JSON fields during registration.</en></lang>
const officialProfileById = new Map(
  officialProfiles.map((profile) => [profile.profileId as HiaOfficialProfileId, profile])
);

/** @lang zh-CN 共享且未冻结的目录对象，与catalog.json导出共享模块数据；调用者须只读使用或自行复制。 @lang en Shared, unfrozen catalog object using the catalog.json module data; callers must treat it as read-only or clone it themselves. */
export const HIA_OFFICIAL_PROFILE_CATALOG = catalogData as HiaOfficialProfileCatalog;

/** @lang zh-CN 显式项目规范目录；形状版本不变，schema版本仅描述该目录的一份新规范。共享元数据须只读使用。 @lang en Explicit project profile catalog; its shape version is unchanged and schema version describes its one new profile. Treat shared metadata as read-only. */
export const HIA_TSDOC_PROJECT_PROFILE_CATALOG = tsDocProjectCatalogData as HiaOfficialProfileCatalog;

/**
 * @lang zh-CN 显式取得TypeScript项目桥接0.2独立副本，不改变旧默认读取或推断任意版本。
 * @lang en Explicitly get an independent TypeScript project bridge 0.2 copy without changing legacy defaults or inferring arbitrary versions.
 * @returns <lang><zh-CN>使用已确认1.0结构的0.2草案规范副本；不授予执行/源码公开许可。</zh-CN><en>A draft 0.2 profile copy using the confirmed 1.0 structure, without execution/source-publication permission.</en></lang>
 */
export function getOfficialTsDocProjectProfile(): HiaDocumentationProfile {
  return structuredClone(tsDocProjectProfileData) as HiaDocumentationProfile;
}

/**
 * @lang zh-CN 显式为项目链组装规范集合，仅替换旧TS项；六份原父/同级规范保持精确版本。
 * @lang en Explicitly assemble a project-chain profile set, replacing only the legacy TS entry while retaining the six original parent/peer versions.
 * @returns <lang><zh-CN>独立集合和诊断；同一集合每身份仍只有一版，不自动切换现有项目。</zh-CN><en>An independent set and diagnostics; each identity still has one version per set and existing projects are not switched automatically.</en></lang>
 */
export function createOfficialTsDocProjectProfileSet(): HiaProfileSet {
  // <lang><zh-CN>先取旧分发的独立副本，在送入原runtime前明确选择新TS版本，不修改包内数据或运行时选择规则。</zh-CN><en>Start from defensive legacy copies and select the new TS version before invoking the existing runtime, without mutating package data or selection rules.</en></lang>
  const profiles = listOfficialHiaProfiles().map((profile) => profile.profileId === "ts-jsdoc-bridge" ? getOfficialTsDocProjectProfile() : profile);
  return createHiaProfileSet({profiles});
}

/**
 * @lang zh-CN 按官方固定顺序列出七份配置，不解析继承或选择默认配置。
 * @lang en Lists seven profiles in fixed official order without resolving inheritance or choosing a default profile.
 * @returns <lang><zh-CN>新数组及每份配置的独立深拷贝；不访问文件系统/网络。</zh-CN><en>A new array of independent deep copies, without filesystem or network access.</en></lang>
 */
export function listOfficialHiaProfiles(): HiaDocumentationProfile[] {
  return officialProfiles.map(cloneProfile);
}

/**
 * @lang zh-CN 按精确官方身份读取独立配置副本，不按大小写、路径或版本范围猜测。
 * @lang en Reads an independent profile copy by exact official identity without case, path or version-range inference.
 * @param profileId <lang><zh-CN>官方身份或任意string；未知值不回退到默认配置。</zh-CN><en>Official identity or arbitrary string; unknown values do not fall back to a default profile.</en></lang>
 * @returns <lang><zh-CN>深拷贝或undefined；不解析继承、不执行规则、不写回包数据。</zh-CN><en>A deep copy or undefined, without resolving inheritance, executing rules or writing package data.</en></lang>
 */
export function getOfficialHiaProfile(profileId: HiaOfficialProfileId | string): HiaDocumentationProfile | undefined {
  // <lang><zh-CN>静态身份断言只用于Map键类型，不让任意string成为已知官方身份。</zh-CN><en>The static identity cast serves only the Map key type and does not make arbitrary strings known official identities.</en></lang>
  const profile = officialProfileById.get(profileId as HiaOfficialProfileId);
  return profile ? cloneProfile(profile) : undefined;
}

/**
 * @lang zh-CN 从七份全新副本创建运行时集合，保留runtime诊断供调用者检查。
 * @lang en Creates a runtime set from seven fresh copies, retaining runtime diagnostics for caller inspection.
 * @returns <lang><zh-CN>新Map/配置副本/诊断数组；不自动采用到项目或保证所有草案语义已稳定。</zh-CN><en>New Map/profile copies/diagnostics, without automatic project adoption or guarantees that all draft semantics are stable.</en></lang>
 */
export function createOfficialHiaProfileSet(): HiaProfileSet {
  return createHiaProfileSet({ profiles: listOfficialHiaProfiles() });
}

/** @lang zh-CN 复制包内普通JSON配置，访问器修改不影响下一次访问；直接JSON导入仍须只读使用。 @lang en Clones package JSON profiles so accessor mutations do not affect subsequent calls; direct JSON imports still require read-only use. */
function cloneProfile(profile: HiaDocumentationProfile): HiaDocumentationProfile {
  return structuredClone(profile);
}
