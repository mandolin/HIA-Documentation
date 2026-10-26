/**
 * @file
 * @lang zh-CN 文档源码映射与生成式文档绑定的精确身份/版本及来源类别；不执行版本协商、I/O、迁移或授权。
 * @lang en Exact documentation-map/generated-binding identities, versions and provenance categories, without version negotiation, I/O, migration or authorization.
 */
/**
 * @lang zh-CN 文档语义映射根contract的精确原语身份doc-source-map，不是普通位置source map的格式版本。
 * @lang en Exact primitive root-contract identity doc-source-map, distinct from the format version of ordinary positional source maps.
 */
export const DOC_SOURCE_MAP_CONTRACT = "doc-source-map";

/**
 * @lang zh-CN 当前文档源码映射根的精确1.0.0版本，与npm包/系统发行独立；不证明catalog稳定化或调用方数据已验证。
 * @lang en Exact current documentation-map root version 1.0.0, independent of npm/system publication and not proof of catalog stabilization or validated caller data.
 */
export const DOC_SOURCE_MAP_CONTRACT_VERSION = "1.0.0";

/** @lang zh-CN 精确历史文档映射0.1.0-draft身份，与旧绑定反向链接配对；不是默认输出版本或未知版本回退。 @lang en Exact historical documentation-map identity 0.1.0-draft paired with legacy binding backlinks, not a default output version or fallback for unknown versions. */
export const DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION = "0.1.0-draft";
/** @lang zh-CN 当前与历史根版本的字面量联合；类型自身不验证运行数据，不协商未知patch/minor/预发行/build值。 @lang en Literal union of current and legacy root versions; the type itself validates no runtime data and negotiates no unknown patches/minors/prereleases/builds. */
export type DocSourceMapContractVersion = typeof DOC_SOURCE_MAP_CONTRACT_VERSION | typeof DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION;
/** @lang zh-CN 按当前公开顺序共享的七个来源类别原语元组，运行时已Object.freeze；描述本引用最终定位机制，工具明细用rangeSourceDetail，不推导信任/置信度或授予源码访问。 @lang en Shared seven-category primitive tuple in its current public order, runtime-frozen with Object.freeze; describes a reference's final locating mechanism, with tool detail in rangeSourceDetail and no inferred trust/confidence or source-access permission. */
export const DOC_SOURCE_MAP_RANGE_SOURCES = Object.freeze(["source-map", "parser", "compiler", "adapter", "manual", "heuristic", "unresolved"] as const);
/** @lang zh-CN 从七项元组导出的当前类别联合，不含工具明细或隐式other；旧reader开放字符串与此类型分开。 @lang en Current category union derived from the seven-item tuple, excluding tool details or implicit other; legacy reader strings remain a separate compatibility surface. */
export type DocSourceMapRangeSource = typeof DOC_SOURCE_MAP_RANGE_SOURCES[number];

/**
 * @lang zh-CN 中性生成式文档绑定独立sidecar的精确原语contract身份，不是普通source map的扩展槽或执行能力。
 * @lang en Exact primitive contract identity of an independent generated-documentation-binding sidecar, not an ordinary source-map extension slot or execution capability.
 */
export const GENERATED_DOCUMENTATION_BINDING_CONTRACT = "generated-documentation-binding";

/** @lang zh-CN 当前绑定根精确0.2.0-draft，与doc-source-map1.0.0配对；不同于npm包版本，不代表绑定稳定1.0承诺或自动迁移。 @lang en Exact current binding root 0.2.0-draft paired with doc-source-map1.0.0; distinct from npm package versions and implying neither binding 1.0 stability nor automatic migration. */
export const GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION = "0.2.0-draft";
/** @lang zh-CN 历史绑定精确0.1.0-draft，只配历史doc-source-map0.1.0-draft与独立旧schema；不跟随当前版本漂移。 @lang en Exact legacy binding 0.1.0-draft paired only with legacy doc-source-map0.1.0-draft and its separate schema, without following current versions. */
export const GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION = "0.1.0-draft";
/** @lang zh-CN 两代绑定根精确版本的字面量联合，不按SemVer范围推测；类型不证明配对或工件有效。 @lang en Literal union of two exact binding root versions without SemVer range inference; the type proves neither pairing nor artifact validity. */
export type GeneratedDocumentationBindingContractVersion = typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION | typeof GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION;
