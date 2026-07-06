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
            modelVersion: "0.1.0",
            defaultLocale: "zh-CN",
            locales: ["zh-CN", "en"],
            resources: [
              {
                path: "i18n/render.en.json",
                locale: "en",
                fields: ["description"]
              }
            ],
            fields: {
              description: {
                fieldPath: "description",
                kind: "description",
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
            modelVersion: "0.1.0",
            mode: "all",
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
                  content: "export function render() {}"
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
        locale: "en",
        resourcePath: "i18n/render.en.json",
        symbolId: "function:render",
        symbolName: "render"
      }
    ]);
    expect(findI18nKeyLocations(index, "render.target")).toHaveLength(1);
    expect(index.missingLocales[0]).toMatchObject({
      fieldPath: "description",
      locale: "en"
    });
    expect(index.sourceReferences[0]).toMatchObject({
      targetId: "RENDER_IMPL",
      resolved: true
    });
    expect(index.sourceFragments[0]).toMatchObject({
      fragmentId: "RENDER_IMPL",
      relativePath: "src/render.js"
    });
  });
});
