import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA,
  createDocumentationSourceCommentProjection,
  validateDocumentationSourceCommentProjection,
  type DocumentationSourceCommentProjectionRequest
} from "./index.js";

/**
 * @lang zh-CN
 * 构造只含逻辑 identity 和结构化 locale text 的 canonical P1 请求。
 *
 * @lang en
 * Builds a canonical P1 request containing logical identities and structured locale text only.
 */
function createRequest(): DocumentationSourceCommentProjectionRequest {
  return {
    comments: [
      {
        commentId: "comment.summary",
        kind: "documentation",
        localizedText: {
          en: "Builds an escaped <profile> summary.",
          "zh-CN": "生成转义后的 <profile> 摘要。"
        },
        order: 10,
        range: { start: { line: 3, column: 0 }, end: { line: 8, column: 3 } }
      },
      {
        commentId: "comment.flow",
        kind: "block",
        localizedText: {
          en: "Keep the projection deterministic.",
          "zh-CN": "保持投影确定性。"
        },
        order: 20
      }
    ],
    contentPolicy: "explicit-projected-text",
    contract: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
    contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
    defaultLocale: "zh-CN",
    fallbackLocales: ["en"],
    projectionId: "projection.profile.summary",
    requestedLocale: "en-US",
    source: {
      docSourceMapEntryId: "docmap.profile.summary",
      documentId: "doc.profile",
      sourceId: "source.profile.ts",
      symbolId: "symbol.profile.summary"
    }
  };
}

describe("documentation-source-comment-projection contract", () => {
  it("exports an exact neutral draft schema with fixed privacy facts", () => {
    expect(DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA.properties.contract).toEqual({
      const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT
    });
    expect(DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA.properties.contractVersion).toEqual({
      const: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION
    });
    expect(DOCUMENTATION_SOURCE_COMMENT_PROJECTION_JSON_SCHEMA.$defs.privacy.properties.sourcesContentPolicy).toEqual({
      const: "none"
    });
  });

  it("resolves deterministic locale fallback while preserving three independent dimensions", () => {
    const projection = createDocumentationSourceCommentProjection(createRequest());

    expect(projection.status).toBe("ready");
    expect(projection.fallbackChain).toEqual(["en-US", "en", "zh-CN"]);
    expect(projection.entries).toHaveLength(2);
    expect(projection.entries[0]).toMatchObject({
      commentId: "comment.summary",
      confidence: "declared",
      projectedText: "Builds an escaped <profile> summary.",
      provenance: { kind: "structured-source-comment", sourceLocale: "en" },
      requestedLocale: "en-US",
      resolvedLocale: "en",
      resolution: "fallback",
      stableCommentKey: "projection.profile.summary::doc.profile::symbol.profile.summary::source.profile.ts::comment.summary"
    });
    expect(validateDocumentationSourceCommentProjection(projection)).toEqual([]);
  });

  it("keeps stable identity and metadata when content is not authorized", () => {
    const explicit = createDocumentationSourceCommentProjection(createRequest());
    const metadataOnly = createDocumentationSourceCommentProjection({
      ...createRequest(),
      contentPolicy: "none"
    });

    expect(metadataOnly.entries.map((entry) => entry.stableCommentKey)).toEqual(
      explicit.entries.map((entry) => entry.stableCommentKey)
    );
    expect(JSON.stringify(metadataOnly)).not.toContain("Builds an escaped");
    expect(metadataOnly.privacy).toEqual({
      projectedCommentTextIncluded: false,
      rawCommentIncluded: false,
      richTextPolicy: "plain-text-only",
      sourceBodyIncluded: false,
      sourcesContentPolicy: "none"
    });
  });

  it("refuses unknown fields, non-canonical locale, duplicate identity, and missing resolution without leaking text", () => {
    const cases: unknown[] = [
      { ...createRequest(), sourceBody: "private source" },
      { ...createRequest(), requestedLocale: "en_US" },
      { ...createRequest(), comments: [createRequest().comments[0], createRequest().comments[0]] },
      {
        ...createRequest(),
        comments: [{ ...createRequest().comments[0], localizedText: { "zh-CN": "仅中文。" } }],
        defaultLocale: "fr",
        fallbackLocales: ["de"],
        requestedLocale: "de-DE"
      }
    ];

    for (const input of cases) {
      const projection = createDocumentationSourceCommentProjection(input);
      expect(projection.status).toBe("refused");
      expect(projection.contentPolicy).toBe("none");
      expect(projection.privacy.projectedCommentTextIncluded).toBe(false);
      expect(projection.entries.every((entry) => entry.projectedText === undefined)).toBe(true);
    }
  });

  it("rejects wire-level privacy or stable-key tampering", () => {
    const projection = createDocumentationSourceCommentProjection(createRequest());
    const leaked = structuredClone(projection) as unknown as Record<string, unknown>;
    leaked.sourceBody = "private";
    expect(validateDocumentationSourceCommentProjection(leaked).map((diagnostic) => diagnostic.code)).toContain(
      "SOURCE_COMMENT_PRIVATE_FIELD"
    );

    const tampered = structuredClone(projection);
    tampered.entries[0]!.stableCommentKey = "locale-dependent";
    expect(validateDocumentationSourceCommentProjection(tampered).map((diagnostic) => diagnostic.code)).toContain(
      "SOURCE_COMMENT_PROJECTION_INVALID"
    );

    const diagnosticLeak = structuredClone(projection);
    diagnosticLeak.diagnostics.push({
      code: "SOURCE_COMMENT_PROJECTION_INVALID",
      data: { sourceBody: "private" },
      message: "unsafe diagnostic",
      severity: "error"
    });
    expect(validateDocumentationSourceCommentProjection(diagnosticLeak).map((diagnostic) => diagnostic.code)).toContain(
      "SOURCE_COMMENT_PROJECTION_INVALID"
    );
  });
});
