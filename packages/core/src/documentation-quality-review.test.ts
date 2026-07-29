import { describe, expect, it } from "vitest";
import {
  createDocumentationQualityReviewDiagnostic,
  createDocumentationQualityReviewReport,
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
  DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
  validateDocumentationQualityReview,
  type DocumentationQualityReviewInput
} from "./documentation-quality-review.js";

/** 中文：构建不含正文/locator 的最小质量审查 fixture。 English: Builds a minimal quality-review fixture without bodies or locators. */
function createFixture(): DocumentationQualityReviewInput {
  return {
    contract: DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
    contractVersion: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
    id: "quality-review:fixture",
    observations: [
      {
        category: "locale-resource",
        confidence: "high",
        diagnosticCodes: ["DLR_LOCALE_MISSING"],
        provenance: { kind: "locale-resolution-sidecar", sidecarId: "sidecar:locale:fixture" },
        rule: "locale-resolution-diagnostic",
        scope: { sourceDocumentId: "doc:fixture", fieldPath: "description" },
        state: "missing"
      },
      {
        category: "rop",
        confidence: "medium",
        provenance: { kind: "rop-observation" },
        rule: "flow-block",
        scope: { sourceDocumentId: "doc:fixture", symbolId: "function:fixture", occurrence: 1 },
        state: "observed"
      },
      {
        category: "terminology",
        confidence: "none",
        diagnosticCodes: ["TERM_CANDIDATE_GRAMMAR_UNKNOWN"],
        provenance: { kind: "profile-diagnostic" },
        rule: "candidate-grammar",
        scope: { sourceDocumentId: "doc:fixture", fieldPath: "remarks" },
        state: "unavailable"
      }
    ],
    privacy: {
      allowRawLocator: false,
      allowResourceBody: false,
      allowSourceBody: false,
      allowTermPhrase: false
    }
  };
}

describe("documentation quality review", () => {
  it("aggregates ROP, terminology, and DLR observations without treating them as automatic approval", () => {
    const report = createDocumentationQualityReviewReport(createFixture());

    expect(report.actionPolicy).toBe("review-only");
    expect(report.summary).toMatchObject({
      findingCount: 3,
      localeResourceFindingCount: 1,
      requiresHumanReview: true,
      ropFindingCount: 1,
      terminologyFindingCount: 1,
      unavailableFindingCount: 1
    });
    expect(report.findings.every((finding) => finding.requiresHumanReview)).toBe(true);
    expect(report.findings.map((finding) => finding.id)).toEqual([...report.findings.map((finding) => finding.id)].sort());
  });

  it("maps a normalized finding back to a metadata-only diagnostic", () => {
    const finding = createDocumentationQualityReviewReport(createFixture()).findings[0];
    expect(finding).toBeDefined();

    const diagnostic = createDocumentationQualityReviewDiagnostic(finding!);
    expect(diagnostic.code).toBe("DQR_LOCALE_RESOURCE_REVIEW_REQUIRED");
    expect(diagnostic.data).toMatchObject({
      category: "locale-resource",
      findingId: finding!.id,
      scope: { fieldPath: "description", sourceDocumentId: "doc:fixture" }
    });
    expect(JSON.stringify(diagnostic)).not.toContain("locator");
  });

  it("rejects private phrase and body fields even when an unknown producer adds them", () => {
    const unsafe = {
      ...createFixture(),
      observations: [{ ...createFixture().observations[0], observedText: "private phrase" }]
    };

    expect(validateDocumentationQualityReview(unsafe).map((diagnostic) => diagnostic.code)).toContain("DQR_PRIVACY_VIOLATION");
    expect(createDocumentationQualityReviewReport(unsafe as DocumentationQualityReviewInput).summary.unavailableFindingCount).toBe(1);
  });
});
