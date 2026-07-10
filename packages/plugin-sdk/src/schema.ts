import {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID
} from "./constants.js";

const identifierSchema = {
  type: "string",
  minLength: 1,
  pattern: "^[a-z0-9][a-z0-9._-]*$"
} as const;

const openKindSchema = {
  type: "string",
  minLength: 1,
  pattern: "^[a-z0-9][a-z0-9._/-]*$"
} as const;

const stringListSchema = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: openKindSchema
} as const;

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
          path: { type: "string", minLength: 1 },
          targetPath: { type: "string", minLength: 1 }
        }
      }
    }
  }
} as const;
