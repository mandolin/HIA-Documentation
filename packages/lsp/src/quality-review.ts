import {
  createDocumentationQualityReviewDiagnostic,
  createDocumentationQualityReviewReport,
  type DocumentationQualityReviewInput,
  type DocumentationQualityReviewReport
} from "@hia-doc/core";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";
import type { Diagnostic } from "vscode-languageserver/node.js";

/**
 * 中文：返回 metadata-only quality-review report 的版本化 LSP request。
 * English: Versioned LSP request returning a metadata-only quality-review report.
 */
export const HIA_LSP_DOCUMENTATION_QUALITY_REVIEW_REQUEST = "hia/documentationQualityReview";

/** 中文：quality-review request 参数。 English: Parameters for the quality-review request. */
export interface HiaDocumentationQualityReviewParams {
  uri: string;
}

/**
 * 中文：将中性 finding 映射为 normal LSP diagnostics；不会创建 code action 或 edit。
 * English: Maps neutral findings to normal LSP diagnostics; creates neither code actions nor edits.
 */
export function createHiaDocumentationQualityReviewDiagnostics(input: DocumentationQualityReviewInput): Diagnostic[] {
  /** 中文：core 先负责稳定 identity/privacy，LSP 只负责 transport projection。 English: Core owns stable identity/privacy first; LSP owns transport projection only. */
  const report = createDocumentationQualityReviewReport(input);
  return report.findings.map((finding) => {
    /** 中文：core diagnostic data 已经是 metadata-only；此处不追加 source text 或 locator。 English: Core diagnostic data is already metadata-only; do not append source text or locator here. */
    const diagnostic = createDocumentationQualityReviewDiagnostic(finding);
    return {
      code: diagnostic.code,
      data: diagnostic.data,
      message: diagnostic.message,
      range: createZeroRange(),
      severity: mapSeverity(diagnostic.severity),
      source: "hia-quality-review"
    };
  });
}

/**
 * 中文：创建供 custom request 和四宿主共用的纯 report；没有 input 时明确返回 undefined。
 * English: Creates the pure report shared by the custom request and four hosts; explicitly returns undefined when input is absent.
 */
export function getHiaDocumentationQualityReview(input: DocumentationQualityReviewInput | undefined): DocumentationQualityReviewReport | undefined {
  return input ? createDocumentationQualityReviewReport(input) : undefined;
}

/** 中文：创建 LSP zero range，避免在没有位置 metadata 时伪造 source location。 English: Creates an LSP zero range, avoiding fabricated source locations when position metadata is absent. */
function createZeroRange(): Diagnostic["range"] {
  return {
    end: { character: 0, line: 0 },
    start: { character: 0, line: 0 }
  };
}

/** 中文：转换 core severity 到 LSP severity。 English: Converts a core severity to an LSP severity. */
function mapSeverity(severity: "error" | "warning" | "info"): DiagnosticSeverity {
  if (severity === "error") {
    return DiagnosticSeverity.Error;
  }
  return severity === "warning" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information;
}
