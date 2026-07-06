import { describe, expect, it } from "vitest";
import {
  HiaLspDiagnosticCode,
  analyzeHiaDocument,
  analyzeHiaDocumentText
} from "./diagnostics.js";
import { createBasicFixtureDocument, createHiaDocument } from "@hia-doc/core";

describe("@hia-doc/lsp diagnostics", () => {
  it("accepts the shared core fixture", () => {
    const diagnostics = analyzeHiaDocument(createBasicFixtureDocument());

    expect(diagnostics).toEqual([]);
  });

  it("reports missing locales, duplicate keys and invalid source references", () => {
    const document = createHiaDocument({
      id: "fixture.lsp.bad",
      title: "Bad LSP Fixture",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"],
      symbols: [
        {
          id: "function:badOne",
          kind: "function",
          name: "badOne",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.1.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                defaultLocale: "zh-CN",
                localizedText: {
                  "zh-CN": "坏例子。"
                },
                missingLocales: ["en"],
                segments: [
                  {
                    kind: "lang-inline",
                    id: "description.0",
                    fieldPath: "description",
                    raw: "<lang />",
                    key: "duplicate.key",
                    localized: {
                      "zh-CN": "坏"
                    }
                  }
                ]
              }
            }
          },
          source: {
            model: "hia-source",
            modelVersion: "0.1.0",
            mode: "all",
            references: [
              {
                kind: "source-reference",
                referenceKind: "coderef",
                targetId: "MISSING",
                resolved: false
              }
            ]
          }
        },
        {
          id: "function:badTwo",
          kind: "function",
          name: "badTwo",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.1.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                defaultLocale: "zh-CN",
                localizedText: {
                  "zh-CN": "第二个坏例子。",
                  en: "Second bad sample."
                },
                segments: [
                  {
                    kind: "lang-inline",
                    id: "description.0",
                    fieldPath: "description",
                    raw: "<lang />",
                    key: "duplicate.key",
                    localized: {
                      en: "bad"
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    });

    const codes = analyzeHiaDocument(document).map((item) => item.code);

    expect(codes).toContain(HiaLspDiagnosticCode.I18nLocaleMissing);
    expect(codes).toContain(HiaLspDiagnosticCode.I18nKeyDuplicate);
    expect(codes).toContain(HiaLspDiagnosticCode.SourceReferenceInvalid);
  });

  it("reports JSON parse errors for text documents", () => {
    const diagnostics = analyzeHiaDocumentText("{");

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(HiaLspDiagnosticCode.JsonParseError);
  });
});
