import {
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_ID,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_REQUEST_SCHEMA_ID,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_SCHEMA_ID
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

const jsonObjectSchema = {
  type: "object",
  additionalProperties: true
} as const;

const privacyPolicySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourceExcerptPolicy",
    "sourcesContentPolicy",
    "allowSourceBody",
    "allowToolExecution",
    "allowWorkspaceWrite",
    "allowTargetRepositoryMutation",
    "requiresHumanReview"
  ],
  properties: {
    sourceExcerptPolicy: { const: "none" },
    sourcesContentPolicy: { const: "none" },
    allowSourceBody: { const: false },
    allowToolExecution: { const: false },
    allowWorkspaceWrite: { const: false },
    allowTargetRepositoryMutation: { const: false },
    requiresHumanReview: { const: true }
  }
} as const;

export const HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_ID,
  title: "HIA Provider Adapter Descriptor",
  type: "object",
  additionalProperties: false,
  required: [
    "contract",
    "contractVersion",
    "id",
    "version",
    "displayName",
    "runtimeKind",
    "acceptedInputContracts",
    "outputKinds",
    "capabilities",
    "policies"
  ],
  properties: {
    contract: { const: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT },
    contractVersion: { const: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION },
    id: identifierSchema,
    version: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    runtimeKind: { enum: ["deterministic-mock", "local", "remote-api", "host-provided"] },
    acceptedInputContracts: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: openKindSchema
    },
    outputKinds: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: openKindSchema
    },
    capabilities: {
      type: "object",
      additionalProperties: false,
      required: [
        "draftText",
        "reviewMetadata",
        "sourceBodyInput",
        "toolExecution",
        "workspaceWrite",
        "targetRepositoryMutation",
        "networkAccess"
      ],
      properties: {
        draftText: { type: "boolean" },
        reviewMetadata: { type: "boolean" },
        sourceBodyInput: { const: false },
        toolExecution: { const: false },
        workspaceWrite: { const: false },
        targetRepositoryMutation: { const: false },
        networkAccess: { const: "disabled" }
      }
    },
    policies: privacyPolicySchema
  }
} as const;

export const HIA_PROVIDER_REQUEST_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROVIDER_REQUEST_SCHEMA_ID,
  title: "HIA Provider Request",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "requestId", "providerId", "input", "policies"],
  properties: {
    contract: { const: HIA_PROVIDER_REQUEST_CONTRACT },
    contractVersion: { const: HIA_PROVIDER_REQUEST_CONTRACT_VERSION },
    requestId: identifierSchema,
    providerId: identifierSchema,
    input: {
      type: "object",
      additionalProperties: false,
      properties: {
        aiContextPackageRef: jsonObjectSchema,
        reviewPayload: jsonObjectSchema,
        reviewItemIds: {
          type: "array",
          uniqueItems: true,
          items: identifierSchema
        },
        locales: {
          type: "array",
          uniqueItems: true,
          items: { type: "string", minLength: 1 }
        },
        profileIds: {
          type: "array",
          uniqueItems: true,
          items: identifierSchema
        }
      }
    },
    policies: privacyPolicySchema
  }
} as const;

export const HIA_PROVIDER_RESULT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROVIDER_RESULT_SCHEMA_ID,
  title: "HIA Provider Result",
  type: "object",
  additionalProperties: false,
  required: [
    "contract",
    "contractVersion",
    "requestId",
    "provider",
    "status",
    "outputs",
    "diagnostics",
    "privacy",
    "provenance"
  ],
  properties: {
    contract: { const: HIA_PROVIDER_RESULT_CONTRACT },
    contractVersion: { const: HIA_PROVIDER_RESULT_CONTRACT_VERSION },
    requestId: identifierSchema,
    provider: {
      type: "object",
      additionalProperties: false,
      required: ["id", "version", "runtimeKind"],
      properties: {
        id: identifierSchema,
        version: { type: "string", minLength: 1 },
        runtimeKind: { enum: ["deterministic-mock", "local", "remote-api", "host-provided"] }
      }
    },
    status: { enum: ["success", "partial", "refused", "failed"] },
    outputs: {
      type: "array",
      items: jsonObjectSchema
    },
    diagnostics: {
      type: "array",
      items: jsonObjectSchema
    },
    privacy: privacyPolicySchema,
    provenance: jsonObjectSchema
  }
} as const;
