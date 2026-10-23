import {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID
} from "./constants.js";

// <lang><zh-CN>producer/artifact 身份不包含命名空间斜杠，避免与 kind 分类混用。</zh-CN><en>Producer/artifact identities exclude namespace slashes to keep them distinct from kind categories.</en></lang>
const identifierSchema = {
  type: "string",
  minLength: 1,
  pattern: "^[a-z0-9][a-z0-9._-]*$"
} as const;

// <lang><zh-CN>开放领域 kind 可含斜杠；允许新文档领域而不放松身份约束。</zh-CN><en>Open domain kinds permit slashes, enabling new documentation domains without relaxing identity constraints.</en></lang>
const openKindSchema = {
  type: "string",
  minLength: 1,
  pattern: "^[a-z0-9][a-z0-9._/-]*$"
} as const;

// <lang><zh-CN>输入/输出能力必须至少声明一个不同的 kind。</zh-CN><en>Input/output capabilities must declare at least one distinct kind.</en></lang>
const stringListSchema = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: openKindSchema
} as const;

/**
 * @lang zh-CN 当前 1.0.0 描述的 Draft 2020-12 只读结构定义；只接受该 wire 版本，历史输入应选历史 schema。
 * @lang en Read-only Draft 2020-12 structural definition for current 1.0.0 descriptors; accepts only that wire version, with historical schemas selected for old input.
 */
export const DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  title: "Documentation Producer Descriptor",
  type: "object",
  additionalProperties: false,
  required: [
    "contract",
    "contractVersion",
    "id",
    "version",
    "displayName",
    "inputKinds",
    "outputKinds",
    "capabilities"
  ],
  properties: {
    contract: { const: DOCUMENTATION_PRODUCER_CONTRACT },
    contractVersion: { const: DOCUMENTATION_PRODUCER_CONTRACT_VERSION },
    id: identifierSchema,
    version: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    inputKinds: stringListSchema,
    outputKinds: stringListSchema,
    capabilities: {
      type: "object",
      additionalProperties: false,
      required: ["sourceLinkage", "incremental", "watch"],
      properties: {
        sourceLinkage: { type: "boolean" },
        incremental: { const: false },
        watch: { const: false }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 当前 1.0.0 结果的结构定义；状态/产物组合、producer 对应和路径隐私仍须 runtime 校验。
 * @lang en Structural definition for current 1.0.0 results; status/artifact combinations, producer matching and path privacy still require runtime validation.
 */
export const DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  title: "Documentation Producer Result",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "producer", "status", "artifacts", "diagnostics"],
  properties: {
    contract: { const: DOCUMENTATION_PRODUCER_RESULT_CONTRACT },
    contractVersion: { const: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION },
    producer: {
      type: "object",
      additionalProperties: false,
      required: ["id", "version"],
      properties: {
        id: identifierSchema,
        version: { type: "string", minLength: 1 }
      }
    },
    status: { enum: ["success", "partial", "failed"] },
    artifacts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "path"],
        properties: {
          id: identifierSchema,
          kind: openKindSchema,
          path: { type: "string", minLength: 1 },
          contract: { type: "string", minLength: 1 },
          contractVersion: { type: "string", minLength: 1 },
          format: { type: "string", minLength: 1 },
          language: { type: "string", minLength: 1 },
          mediaType: { type: "string", minLength: 1 },
          profileIds: {
            type: "array",
            uniqueItems: true,
            items: identifierSchema
          }
        }
      }
    },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { type: "string", minLength: 1 },
          message: { type: "string", minLength: 1 },
          severity: { enum: ["error", "warning", "info"] },
          data: { type: "object" },
          metadata: { type: "object" },
          source: {
            type: "object",
            additionalProperties: true,
            properties: {
              path: { type: "string", minLength: 1 }
            }
          },
          path: { type: "string", minLength: 1 },
          targetPath: { type: "string", minLength: 1 }
        }
      }
    }
  }
} as const;
/**
 * @file
 * @lang zh-CN 当前生产器描述与结果的结构 schema；身份、路径、状态和 JSON 语义另由 runtime validator 完成。
 * @lang en Structural schemas for current producer descriptors and results; runtime validators additionally enforce identity, paths, status and JSON semantics.
 */
