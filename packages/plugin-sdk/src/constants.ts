/**
 * @file
 * @lang zh-CN 文档生产器 wire 身份；契约版本独立于 SDK 包版本，历史定义由 schema 分发保留。
 * @lang en Documentation producer wire identities; contract versions are independent of SDK package versions and historical definitions remain in schema distribution.
 */
/** @lang zh-CN 生产器描述的中性契约名。 @lang en Neutral contract name for a producer descriptor. */
export const DOCUMENTATION_PRODUCER_CONTRACT = "documentation-producer" as const;
/** @lang zh-CN 生产器执行结果的中性契约名。 @lang en Neutral contract name for a producer execution result. */
export const DOCUMENTATION_PRODUCER_RESULT_CONTRACT = "documentation-producer-result" as const;
/** @lang zh-CN 当前描述 writer 的精确版本；reader 同时接受已知 0.1.0-draft，不推断任意 1.x。 @lang en Exact current descriptor writer version; readers also accept known 0.1.0-draft without inferring arbitrary 1.x compatibility. */
export const DOCUMENTATION_PRODUCER_CONTRACT_VERSION = "1.0.0" as const;
/** @lang zh-CN SDK 自建结果的当前版本；有效的旧 producer 返回不会被改号。 @lang en Current version for SDK-created results; valid legacy producer returns are not renumbered. */
export const DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION = "1.0.0" as const;

/** @lang zh-CN 当前描述 schema 的 wire 版本，与其 const 字段一致。 @lang en Current descriptor schema wire version, matching its const field. */
export const DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION = DOCUMENTATION_PRODUCER_CONTRACT_VERSION;
/** @lang zh-CN 当前结果 schema 的 wire 版本，与其 const 字段一致。 @lang en Current result schema wire version, matching its const field. */
export const DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION = DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION;

/** @lang zh-CN 当前描述的固定 canonical URL；旧 URL 保留原定义。 @lang en Fixed canonical URL for the current descriptor; old URLs retain their original definitions. */
export const DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-producer-1.0.0.schema.json" as const;
/** @lang zh-CN 当前结果的固定 canonical URL；不替换任何历史身份。 @lang en Fixed canonical URL for the current result, replacing no historical identity. */
export const DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/documentation-producer-result-1.0.0.schema.json" as const;
