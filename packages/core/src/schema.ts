import { HIA_CORE_CONTRACT_VERSION } from "./model.js";

export const HIA_DOCUMENT_SCHEMA_ID = "https://hia-doc.local/schema/hia-document-0.2.0.json";

export const HIA_DOCUMENT_SCHEMA = {
  $id: HIA_DOCUMENT_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "id", "title", "defaultLocale", "locales", "nodes", "symbols"],
  properties: {
    schemaVersion: { const: HIA_CORE_CONTRACT_VERSION },
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    defaultLocale: { type: "string", minLength: 1 },
    fallbackLocale: {
      anyOf: [
        { type: "string", minLength: 1 },
        { type: "array", items: { type: "string", minLength: 1 } }
      ]
    },
    locales: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    nodes: { type: "array" },
    symbols: { type: "array" },
    diagnostics: { type: "array" },
    metadata: { type: "object" }
  }
} as const;
