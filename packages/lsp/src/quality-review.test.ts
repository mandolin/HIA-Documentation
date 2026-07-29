import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
  createBasicFixtureDocument,
  type DocumentationQualityReviewInput
} from "@hia-doc/core";
import {
  createHiaDocumentationQualityReviewDiagnostics,
  HIA_LSP_DOCUMENTATION_QUALITY_REVIEW_REQUEST
} from "./quality-review.js";
import { createHiaLspService } from "./service.js";

/** 中文：创建 metadata-only DLR review fixture。 English: Creates a metadata-only DLR review fixture. */
function createFixture(): DocumentationQualityReviewInput {
  return {
    contract: DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
    contractVersion: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
    id: "quality-review:lsp-fixture",
    observations: [{
      category: "locale-resource",
      confidence: "high",
      diagnosticCodes: ["DLR_ENTRY_MISSING"],
      provenance: { kind: "locale-resolution-sidecar", sidecarId: "sidecar:locale:lsp" },
      rule: "locale-resolution-diagnostic",
      scope: { fieldPath: "description", sourceDocumentId: "fixture.basic" },
      state: "missing"
    }],
    privacy: {
      allowRawLocator: false,
      allowResourceBody: false,
      allowSourceBody: false,
      allowTermPhrase: false
    }
  };
}

describe("LSP quality review", () => {
  it("maps normalized review findings to a no-edit LSP diagnostic", () => {
    const diagnostics = createHiaDocumentationQualityReviewDiagnostics(createFixture());

    expect(diagnostics).toMatchObject([{
      code: "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED",
      range: { start: { character: 0, line: 0 }, end: { character: 0, line: 0 } },
      source: "hia-quality-review"
    }]);
    expect(JSON.stringify(diagnostics)).not.toContain("locator");
  });

  it("exposes only explicitly injected review input through a versioned custom request surface", () => {
    const uri = "file:///workspace/fixture.hia.json";
    const service = createHiaLspService({ qualityReviewInputs: new Map([[uri, createFixture()]]) });
    const document = service.openDocument(uri, JSON.stringify(createBasicFixtureDocument()), "json", 1);

    expect(HIA_LSP_DOCUMENTATION_QUALITY_REVIEW_REQUEST).toBe("hia/documentationQualityReview");
    expect(document.diagnostics.map((item) => item.code)).toContain("DQR_LOCALE_RESOURCE_REVIEW_REQUIRED");
    expect(service.getDocumentationQualityReview(uri)).toMatchObject({
      actionPolicy: "review-only",
      summary: { findingCount: 1, requiresHumanReview: true }
    });
    expect(service.getDocumentationQualityReview("file:///workspace/absent.hia.json")).toBeUndefined();
  });
});
