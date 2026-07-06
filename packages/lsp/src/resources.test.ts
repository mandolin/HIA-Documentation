import { describe, expect, it } from "vitest";
import { createHiaDocument } from "@hia-doc/core";
import {
  createHiaResourceIndex,
  findI18nKeyLocations
} from "./resources.js";

describe("@hia-doc/lsp resources", () => {
  it("indexes i18n resources, keys, missing locales and source references", () => {
    const document = createHiaDocument({
      id: "fixture.resources",
      title: "Resource Fixture",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"],
      symbols: [
        {
          id: "function:render",
          kind: "function",
          name: "render",
          i18n: {
            enabled: true,
            model: "hia-text-i18n",
            modelVersion: "0.2.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            resources: [
              {
                kind: "external-resource",
                path: "i18n/render.en.json",
                locale: "en",
                format: "hia-i18n-json",
                fields: ["description"]
              }
            ],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
                key: "render.description",
                path: "api.render",
                defaultLocale: "zh-CN",
                localizedText: {
                  "zh-CN": "渲染 <lang key=\"render.target\" />。"
                },
                missingLocales: ["en"],
                segments: [
                  {
                    kind: "lang-inline",
                    id: "description.0",
                    fieldPath: "description",
                    raw: "<lang />",
                    key: "render.target",
                    path: "api.render.target",
                    localized: {
                      "zh-CN": "目标",
                      en: "target"
                    }
                  }
                ]
              }
            }
          },
          source: {
            model: "hia-source",
            modelVersion: "0.2.0",
            mode: "all",
            primaryBlock: {
              kind: "primary-block",
              id: "function:render",
              relativePath: "src/render.js",
              range: {
                start: { line: 8 },
                end: { line: 12 }
              },
              content: "export function render() {}",
              rangeSource: "parser-js",
              confidence: "high",
              preview: {
                enabled: true
              }
            },
            references: [
              {
                kind: "source-reference",
                referenceKind: "coderef",
                targetId: "RENDER_IMPL",
                resolved: true,
                fragment: {
                  kind: "source-fragment",
                  id: "RENDER_IMPL",
                  relativePath: "src/render.js",
                  range: {
                    start: { line: 10 },
                    end: { line: 12 }
                  },
                  content: "export function render() {}",
                  rangeSource: "manual",
                  confidence: "high"
                }
              }
            ]
          }
        }
      ]
    });

    const index = createHiaResourceIndex(document, {
      uri: "file:///workspace/fixture.hia.json"
    });

    expect(index.documentId).toBe("fixture.resources");
    expect(index.uri).toBe("file:///workspace/fixture.hia.json");
    expect(index.i18nResources).toEqual([
      {
        fields: ["description"],
        format: "hia-i18n-json",
        kind: "external-resource",
        locale: "en",
        resourcePath: "i18n/render.en.json",
        symbolId: "function:render",
        symbolName: "render"
      }
    ]);
    expect(findI18nKeyLocations(index, "render.description")).toEqual([
      expect.objectContaining({
        fieldPath: "description",
        path: "api.render",
        source: "field"
      })
    ]);
    expect(findI18nKeyLocations(index, "render.target")).toHaveLength(1);
    expect(findI18nKeyLocations(index, "render.target")[0]).toMatchObject({
      segmentId: "description.0",
      source: "segment"
    });
    expect(index.missingLocales[0]).toMatchObject({
      fieldPath: "description",
      locale: "en"
    });
    expect(index.sourceReferences[0]).toMatchObject({
      targetId: "RENDER_IMPL",
      resolved: true
    });
    expect(index.sourceBlocks).toEqual([
      expect.objectContaining({
        blockId: "function:render",
        blockKind: "primary-block",
        confidence: "high",
        rangeSource: "parser-js",
        relativePath: "src/render.js"
      }),
      expect.objectContaining({
        blockId: "RENDER_IMPL",
        blockKind: "source-fragment",
        confidence: "high",
        rangeSource: "manual",
        relativePath: "src/render.js"
      })
    ]);
    expect(index.sourceFragments[0]).toMatchObject({
      confidence: "high",
      fragmentId: "RENDER_IMPL",
      rangeSource: "manual",
      relativePath: "src/render.js"
    });
  });
});
