import { describe, expect, it } from "vitest";
import {
  createDocumentationTerminologyCandidateFromProfileObservation,
  createDocumentationTerminologyQualityReviewInput,
  DOCUMENTATION_TERMINOLOGY_CONTRACT,
  DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
  validateDocumentationTerminologyCandidateSet,
  validateDocumentationTerminologyRegistry,
  type DocumentationTerminologyCandidateSet,
  type DocumentationTerminologyRegistry
} from "./documentation-terminology.js";
import { createDocumentationQualityReviewReport } from "./documentation-quality-review.js";

/**
 * @lang zh-CN 创建受控 registry fixture；form 仅在测试输入存在，绝不进入 quality artifact。
 * @lang en Creates a controlled registry fixture; forms exist only in test input and never enter a quality artifact.
 *
 * @returns 受控 registry fixture。 / Controlled registry fixture.
 */
function createRegistry(): DocumentationTerminologyRegistry {
  return {
    contract: DOCUMENTATION_TERMINOLOGY_CONTRACT,
    contractVersion: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
    id: "terminology-registry:fixture",
    kind: "documentation-terminology-registry",
    privacy: {
      allowObservedText: false,
      allowRawLocator: false,
      allowSourceBody: false
    },
    terms: [
      {
        forms: {
          en: { canonical: "Reference contract", synonyms: ["Contract reference"] },
          "zh-CN": { canonical: "参考契约" }
        },
        lifecycle: "approved",
        provenance: { kind: "human-confirmed", recordId: "review:registry:public" },
        termId: "term.documentation.reference-contract",
        visibility: "public"
      },
      {
        forms: {
          en: { canonical: "Internal concept" }
        },
        lifecycle: "approved",
        provenance: { kind: "human-confirmed", recordId: "review:registry:workspace" },
        termId: "term.documentation.internal-concept",
        visibility: "workspace"
      }
    ]
  };
}

/**
 * @lang zh-CN 创建一个 profile 已解析、但不含原始 comment text 的 candidate。
 * @lang en Creates a profile-parsed candidate without raw comment text.
 *
 * @param candidateId 稳定 candidate identity。 / Stable candidate identity.
 * @returns profile observation result。 / Profile observation result.
 */
function createDetectedCandidate(candidateId = "term-candidate:fixture:description:0") {
  return createDocumentationTerminologyCandidateFromProfileObservation({
    candidateId,
    extractionKind: "first-unwrapped-natural-language-phrase",
    locale: "en",
    provenance: { kind: "profile-candidate", profile: "documentation-at-tag-terminology-profile@0.1.0-draft" },
    scope: {
      annotationKind: "jsdoc-param-description",
      fieldPath: "description",
      occurrence: 0,
      sourceDocumentId: "doc:terminology:fixture",
      symbolId: "function:terminology:fixture"
    }
  });
}

/**
 * @lang zh-CN 创建 metadata-only candidate set fixture。
 * @lang en Creates a metadata-only candidate-set fixture.
 *
 * @param candidates fixture candidates。 / Fixture candidates.
 * @returns candidate-set fixture。 / Candidate-set fixture.
 */
function createCandidateSet(candidates: DocumentationTerminologyCandidateSet["candidates"]): DocumentationTerminologyCandidateSet {
  return {
    candidates,
    contract: DOCUMENTATION_TERMINOLOGY_CONTRACT,
    contractVersion: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION,
    id: "terminology-candidates:fixture",
    kind: "documentation-terminology-candidate-set",
    privacy: {
      allowObservedText: false,
      allowRawLocator: false,
      allowSourceBody: false
    }
  };
}

describe("documentation terminology reference", () => {
  it("maps a structured profile observation without parsing or serializing a source phrase", () => {
    // <lang><zh-CN>fixture 只模拟 profile 已确定的位置；core API 没有 raw comment 或 phrase 参数。</zh-CN><en>The fixture simulates only a profile-confirmed location; the core API has no raw-comment or phrase parameter.</en></lang>
    const result = createDetectedCandidate();
    expect(result.diagnostics).toEqual([]);
    expect(result.candidate).toMatchObject({
      candidateId: "term-candidate:fixture:description:0",
      locale: "en",
      status: "detected"
    });
    expect(JSON.stringify(result.candidate)).not.toContain("observedText");
    expect(JSON.stringify(result.candidate)).not.toContain("Reference contract");
  });

  it("canonicalizes a legacy locale bridge and preserves an explicit grammar-unknown review signal", () => {
    // <lang><zh-CN>legacy 输入只在 bridge 边界接受，candidate artifact 自身只存 canonical BCP 47。</zh-CN><en>Legacy input is accepted only at the bridge boundary; the candidate artifact stores canonical BCP 47 only.</en></lang>
    const legacy = createDocumentationTerminologyCandidateFromProfileObservation({
      candidateId: "term-candidate:fixture:legacy:0",
      extractionKind: "profile-grammar-unknown",
      locale: "zh_CN",
      provenance: { kind: "profile-candidate", profile: "documentation-at-tag-terminology-profile@0.1.0-draft" },
      scope: { annotationKind: "jsdoc-property-description", fieldPath: "description", occurrence: 0, sourceDocumentId: "doc:terminology:legacy" }
    });
    expect(legacy.candidate?.locale).toBe("zh-CN");
    expect(legacy.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["TERM_LOCALE_INVALID", "TERM_CANDIDATE_GRAMMAR_UNKNOWN"]);
  });

  it("requires human review and an approved term before a candidate can link", () => {
    // <lang><zh-CN>linked candidate 复用 detected scope，但必须补充 human review 与 stable approved termId。</zh-CN><en>A linked candidate reuses detected scope but must add human review and a stable approved termId.</en></lang>
    const detected = createDetectedCandidate().candidate!;
    const linked = {
      ...detected,
      review: { decision: "linked" as const, reviewId: "review:candidate:fixture" },
      status: "linked" as const,
      termId: "term.documentation.reference-contract"
    };
    expect(validateDocumentationTerminologyCandidateSet(createCandidateSet([linked]), createRegistry())).toEqual([]);

    // <lang><zh-CN>把同一 link 指向不存在 term 时，validator 只公开 logical identity 与 lifecycle 错误。</zh-CN><en>When the same link targets a missing term, the validator exposes only logical identity and lifecycle failure.</en></lang>
    const invalid = { ...linked, termId: "term.documentation.missing" };
    expect(validateDocumentationTerminologyCandidateSet(createCandidateSet([invalid]), createRegistry()).map((diagnostic) => diagnostic.code)).toContain("TERM_LIFECYCLE_VIOLATION");
  });

  it("detects normalized canonical and synonym conflicts without echoing controlled forms", () => {
    // <lang><zh-CN>两个 approved term 的同 locale synonym collision 是 registry 语义错误，不依赖 source scan。</zh-CN><en>A same-locale synonym collision between approved terms is a registry semantic error and needs no source scan.</en></lang>
    const conflicting = createRegistry();
    conflicting.terms.push({
      forms: { en: { canonical: "Another reference", synonyms: ["Contract reference"] } },
      lifecycle: "approved",
      provenance: { kind: "human-confirmed", recordId: "review:registry:conflict" },
      termId: "term.documentation.another-reference",
      visibility: "public"
    });
    const diagnostics = validateDocumentationTerminologyRegistry(conflicting);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("TERM_FORM_CONFLICT");
    expect(JSON.stringify(diagnostics)).not.toContain("Contract reference");
  });

  it("creates a public quality input with only logical review metadata", () => {
    // <lang><zh-CN>workspace-visible term 可以保留受控 registry 中，但 public quality input 只能给 visibility review signal。</zh-CN><en>A workspace-visible term may remain in the controlled registry, but public quality input can only emit a visibility review signal.</en></lang>
    const detected = createDetectedCandidate().candidate!;
    const publicLink = {
      ...detected,
      review: { decision: "linked" as const, reviewId: "review:candidate:public" },
      status: "linked" as const,
      termId: "term.documentation.reference-contract"
    };
    const workspaceLink = {
      ...detected,
      candidateId: "term-candidate:fixture:workspace:0",
      review: { decision: "linked" as const, reviewId: "review:candidate:workspace" },
      status: "linked" as const,
      termId: "term.documentation.internal-concept"
    };
    const input = createDocumentationTerminologyQualityReviewInput(createCandidateSet([publicLink, workspaceLink]), createRegistry(), "quality-input:terminology:fixture");
    const report = createDocumentationQualityReviewReport(input);
    expect(report.actionPolicy).toBe("review-only");
    expect(report.summary.terminologyFindingCount).toBe(2);
    expect(input.observations.some((observation) => observation.diagnosticCodes?.includes("TERM_VISIBILITY_DENIED"))).toBe(true);
    expect(JSON.stringify(input)).not.toContain("Reference contract");
    expect(JSON.stringify(input)).not.toContain("Internal concept");
    expect(JSON.stringify(input)).not.toContain("locator");
  });

  it("rejects unknown private candidate fields before they can reach quality review", () => {
    // <lang><zh-CN>unknown extension 不得以兼容性名义携带 raw phrase 或 source body。</zh-CN><en>An unknown extension cannot carry a raw phrase or source body in the name of compatibility.</en></lang>
    const unsafe = {
      ...createCandidateSet([createDetectedCandidate().candidate!]),
      candidates: [{ ...createDetectedCandidate().candidate!, observedText: "private candidate phrase" }]
    };
    expect(validateDocumentationTerminologyCandidateSet(unsafe).map((diagnostic) => diagnostic.code)).toContain("TERM_PRIVACY_VIOLATION");
  });
});

