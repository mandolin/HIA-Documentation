import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
  DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  createDocumentationSourceCommentProjection
} from "@hia-doc/core";
import {
  HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT,
  HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION,
  HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_JSON_SCHEMA,
  HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_REQUEST_CONTRACT,
  createHtmlAuthoringSourceCommentIntegrationReport,
  isHtmlAuthoringSourceCommentIntegrationReport,
  runHtmlAuthoringSourceCommentIntegrationCommand,
  type HtmlAuthoringSourceCommentIntegrationRequest
} from "./html-authoring-source-comment-integration.js";

describe("HTML-authoring source-comment integration verification", () => {
  it("accepts exact handoff, projection, and an explicit non-inferred binding", () => {
    const request = createAcceptedRequest();
    const report = createHtmlAuthoringSourceCommentIntegrationReport(request);

    expect(report.status).toBe("accepted");
    expect(report.binding).toMatchObject({
      handoffEntryId: "entry:html-component:status-badge",
      docSourceMapEntryId: "entry:html-component-status-badge",
      verified: true
    });
    expect(report.semantics).toEqual({
      resolution: "explicit-binding-validated",
      confidence: "owner-contract-verified",
      provenance: "handoff-plus-structured-comment-projection"
    });
    expect(report.locale).toEqual({
      canonicalIdentityStable: true,
      handoffLocale: "en",
      requestedLocale: "zh-CN",
      resolvedLocales: ["zh-CN"]
    });
    expect(report.privacy).toMatchObject({
      sourcesContentPolicy: "none",
      sourceBodyIncluded: false,
      rawCommentIncluded: false,
      projectedCommentTextIncluded: true,
      mapBodyIncluded: false,
      sidecarBodyIncluded: false,
      pathIncluded: false,
      richTextPolicy: "plain-text-only"
    });
    expect(Object.values(report.permissions)).toEqual(Array(10).fill(false));
    expect(JSON.stringify(report)).not.toContain("显示当前状态");
    expect(isHtmlAuthoringSourceCommentIntegrationReport(report)).toBe(true);
    expect(HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_JSON_SCHEMA).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: {
        contract: { const: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT },
        contractVersion: { const: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION }
      }
    });
  });

  it("refuses identity mismatch without reflecting caller identity or projected body", () => {
    const request = createAcceptedRequest();
    request.binding.symbolId = "secret-symbol";
    const report = createHtmlAuthoringSourceCommentIntegrationReport(request);

    expect(report.status).toBe("refused");
    expect(report.binding).toMatchObject({ symbolId: "invalid", verified: false });
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("HIA_HTML_AUTHORING_INTEGRATION_BINDING_INVALID");
    expect(JSON.stringify(report)).not.toContain("secret-symbol");
    expect(JSON.stringify(report)).not.toContain("显示当前状态");
    expect(isHtmlAuthoringSourceCommentIntegrationReport(report)).toBe(true);
  });

  it("refuses a handoff that claims host permission", () => {
    const request = createAcceptedRequest();
    const handoff = structuredClone(request.handoff) as { permissions: { tauriIpcIntegration: boolean } };
    handoff.permissions.tauriIpcIntegration = true;
    request.handoff = handoff;
    const report = createHtmlAuthoringSourceCommentIntegrationReport(request);

    expect(report.status).toBe("refused");
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "HIA_HTML_AUTHORING_INTEGRATION_HANDOFF_INVALID",
      "HIA_HTML_AUTHORING_INTEGRATION_PERMISSION_REFUSED"
    ]));
  });

  it("runs only from an explicit safe-relative request and writes a body-free report", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-html-authoring-integration-"));
    const requestPath = "input/request.json";
    const outputPath = "output/report.json";
    const messages: string[] = [];

    try {
      await mkdir(path.join(root, "input"), { recursive: true });
      await writeFile(path.join(root, requestPath), JSON.stringify(createAcceptedRequest()), "utf8");
      const exitCode = await runHtmlAuthoringSourceCommentIntegrationCommand(
        ["--request", requestPath, "--out", outputPath],
        { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) }
      );
      const reportText = await readFile(path.join(root, outputPath), "utf8");

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toContain("Generated HTML-authoring source-comment integration report");
      expect(reportText).toContain(HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT);
      expect(reportText).not.toContain("显示当前状态");
      expect(await runHtmlAuthoringSourceCommentIntegrationCommand(
        ["--request", "../request.json"],
        { cwd: root, stdout: () => undefined, stderr: (message) => messages.push(message) }
      )).toBe(1);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

/**
 * @lang zh-CN 构造一个正文只存在于 W-P96 projection、不会进入 verification report 的 accepted request。
 * @lang en Builds an accepted request whose body exists only in the W-P96 projection and never enters the verification report.
 */
function createAcceptedRequest(): HtmlAuthoringSourceCommentIntegrationRequest {
  const projection = createDocumentationSourceCommentProjection({
    comments: [{
      commentId: "comment.description",
      kind: "documentation",
      localizedText: { en: "Shows the current status.", "zh-CN": "显示当前状态。" },
      order: 0,
      range: { start: { line: 1, column: 0 }, end: { line: 6, column: 3 } }
    }],
    contentPolicy: "explicit-projected-text",
    contract: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT,
    contractVersion: DOCUMENTATION_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
    defaultLocale: "en",
    fallbackLocales: ["en"],
    projectionId: "projection:status-badge:description",
    requestedLocale: "zh-CN",
    source: {
      docSourceMapEntryId: "entry:html-component-status-badge",
      documentId: "htmdoc:fixture:status-badge",
      sourceId: "source:html:fixture-status-badge-html",
      symbolId: "html:component:status-badge"
    }
  });
  return {
    binding: {
      docSourceMapEntryId: "entry:html-component-status-badge",
      documentId: "htmdoc:fixture:status-badge",
      handoffEntryId: "entry:html-component:status-badge",
      projectionId: "projection:status-badge:description",
      sourceId: "source:html:fixture-status-badge-html",
      symbolId: "html:component:status-badge"
    },
    contract: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_REQUEST_CONTRACT,
    contractVersion: HTML_AUTHORING_SOURCE_COMMENT_INTEGRATION_CONTRACT_VERSION,
    handoff: createAcceptedHandoff(),
    projection
  };
}

/** @lang zh-CN 构造 exact W-P80 accepted report fixture。 @lang en Builds an exact W-P80 accepted report fixture. */
function createAcceptedHandoff() {
  return {
    adoption: { targetAdoptionClaimed: false },
    compatibility: { sourcePolicy: "none", nativeUi: "not-applicable", localeChangesCanonicalIdentity: false },
    conformance: { contract: "htmdoc-output-conformance", contractVersion: "0.1.0-draft", conformant: true },
    contract: "html-authoring-documentation-handoff",
    contractVersion: "0.1.0-draft",
    diagnostics: [],
    evidenceSemantics: {
      resolution: "report-contract-validated",
      confidence: "caller-provided-unverified",
      provenance: "metadata-only-derived-projection"
    },
    output: {
      id: "htmdoc-output:status-badge",
      stableEntryIds: ["entry:html-component:status-badge"],
      entryCount: 1,
      locale: { value: "en", changesCanonicalIdentity: false }
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      tauriIpcIntegration: false,
      obsidianVaultIntegration: false,
      sourceReaderImplemented: false,
      fetchEnabled: false,
      networkAccessed: false,
      packagePublished: false
    },
    privacy: {
      sourceBodySerialized: false,
      mapBodySerialized: false,
      sidecarBodySerialized: false,
      absolutePathSerialized: false,
      rawLocatorSerialized: false,
      credentialSerialized: false,
      workingStateSerialized: false
    },
    producer: { id: "htmdoc", version: "0.0.0", status: "success" },
    provenance: {
      kind: "metadata-only-owner-projection",
      ordinaryMapLinkage: "explicit-reference-only",
      ordinaryMapCarriesHandoffModel: false
    },
    status: "accepted"
  } as const;
}
