/**
 * 中文：普通位置映射之外的文档语义 linkage manifest 标识。
 * English: Identifies the documentation-semantic linkage manifest that complements ordinary source maps.
 */
export const DOC_SOURCE_MAP_CONTRACT = "doc-source-map";

/**
 * @lang zh-CN 当前文档源码映射1.0.0源码定义，与包/系统发行独立；读取兼容精确历史版本。
 * @lang en Current documentation-map 1.0.0 source definition, independent of package/system publication; reading also supports the exact historical version.
 */
export const DOC_SOURCE_MAP_CONTRACT_VERSION = "1.0.0";

/** @lang zh-CN 精确历史reader与冻结sidecar使用的版本，不跟随当前定义漂移。 @lang en Exact historical reader/frozen-sidecar version, independent of changes to the current definition. */
export const DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION = "0.1.0-draft";
/** @lang zh-CN 准入的两个精确版本；不协商未知patch/minor/预发行/build值。 @lang en The two admitted exact versions, without negotiating unknown patches/minors/prereleases/builds. */
export type DocSourceMapContractVersion = typeof DOC_SOURCE_MAP_CONTRACT_VERSION | typeof DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION;
/** @lang zh-CN 本引用最终定位依据的类别闭集；具体工具通过rangeSourceDetail表达，不从名称推导信任。 @lang en Closed categories for the final locating mechanism of a reference; rangeSourceDetail identifies tools without inferring trust from names. */
export const DOC_SOURCE_MAP_RANGE_SOURCES = Object.freeze(["source-map", "parser", "compiler", "adapter", "manual", "heuristic", "unresolved"] as const);
/** @lang zh-CN 新版来源类别类型；旧索引字符串仍允许历史具体来源。 @lang en Current provenance-category type; legacy index strings still permit historical concrete sources. */
export type DocSourceMapRangeSource = typeof DOC_SOURCE_MAP_RANGE_SOURCES[number];

/**
 * 中文：中性生成式文档绑定 sidecar contract 标识。
 * English: Identifies the neutral generated-documentation-binding sidecar contract.
 */
export const GENERATED_DOCUMENTATION_BINDING_CONTRACT = "generated-documentation-binding";

/**
 * 中文：中性生成式文档绑定 contract 的首个草案版本。
 * English: First draft version of the neutral generated-documentation-binding contract.
 */
export const GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION = "0.1.0-draft";
