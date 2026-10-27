import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createBrowserPanelPayload,
  HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION,
  HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION,
  renderBrowserPanel
} from "./index.js";
import {
  createDocSourceMapIndex,
  createOrdinarySourceMapIndex,
  type DocSourceMapRangeConvention
} from "@hia-doc/source-linkage";

describe("@hia-doc/browser-panel", () => {
  it("builds a source-linked panel payload and static files", () => {
    const docSourceMapIndex = createDocSourceMapIndex(readFixture("source-linkage/profile-card.docmap.json"), {
      path: "source-linkage/profile-card.docmap.json"
    });
    const sourceMapIndex = createOrdinarySourceMapIndex(readFixture("source-linkage/profile-card.js.map.json"), {
      artifactPath: "dist/profile-card.js",
      path: "dist/profile-card.js.map"
    });
    const payload = createBrowserPanelPayload({
      project: {
        id: "project:source-linked",
        name: "Source Linked Fixture"
      },
      docSourceMaps: [
        {
          path: "source-linkage/profile-card.docmap.json",
          index: docSourceMapIndex,
          ordinarySourceMaps: [
            {
              path: "dist/profile-card.js.map",
              index: sourceMapIndex
            }
          ]
        }
      ]
    });
    const rendered = renderBrowserPanel(payload);

    expect(payload.schemaVersion).toBe(HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION);
    expect(payload.summary).toMatchObject({
      docSourceMapCount: 1,
      entryCount: 1,
      linkedEntryCount: 1,
      sourceMapCount: 1
    });
    expect(payload.entries[0]).toMatchObject({
      domain: "js",
      label: "ts:function:renderProfileCard",
      lookup: {
        generated: {
          artifactPath: "dist/profile-card.js",
          position: { line: 2, column: 1 }
        },
        matchedEntryIds: ["entry:profile-card-render"],
        original: {
          sourcePath: "src/profile-card.ts",
          position: { line: 6, column: 1 }
        },
        status: "available"
      }
    });
    expect(payload.entries[0]?.openRequests.map((request) => request.type)).toEqual([
      "hia.openSource",
      "hia.openGenerated"
    ]);
    expect(rendered.manifest.schemaVersion).toBe(HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION);
    expect(rendered.files.map((file) => file.path)).toEqual([
      "index.html",
      "browser-panel-payload.json",
      "browser-panel-manifest.json"
    ]);
    expect(rendered.files[0]?.contents).toContain("data-hia-browser-panel");
    expect(rendered.files[0]?.contents).toContain("ts:function:renderProfileCard");
    expect(rendered.files[1]?.contents).toContain("\"@hia-doc/browser-panel\"");
  });

  it("matches a current documentation range using its own declared original column unit", () => {
    // <lang><zh-CN>一基第一列在字节与 UTF-16 中相同，反例只检查面板是否按来源引用传递单位。</zh-CN><en>One-based column one agrees in bytes and UTF-16; these cases check that the panel forwards the source reference's own unit.</en></lang>
    expect(currentEntryLookup({ endBoundary: "inclusive", columnUnit: "utf16-code-unit" })).toMatchObject({
      matchedEntryIds: ["entry:profile-card-render"],
      status: "available"
    });
    expect(currentEntryLookup({ endBoundary: "inclusive", columnUnit: "byte" })).toMatchObject({
      matchedEntryIds: ["entry:profile-card-render"],
      status: "available"
    });
  });

  it("does not invent precision for a current range with an unknown column unit or endpoint", () => {
    expect(currentEntryLookup({ endBoundary: "inclusive", columnUnit: "unknown" })).toMatchObject({
      matchedEntryIds: [],
      status: "available"
    });
    expect(currentEntryLookup({ endBoundary: "unknown", columnUnit: "utf16-code-unit" })).toMatchObject({
      matchedEntryIds: [],
      status: "available"
    });
  });

  it("adds project relation graph payload and relation open requests", () => {
    const payload = createBrowserPanelPayload({
      project: {
        id: "project:mixed",
        name: "Mixed Project"
      },
      docSourceMaps: [],
      relationGraph: {
        contract: "hia-project-relation-graph",
        contractVersion: "0.1.0-draft",
        nodeCount: 2,
        relationCount: 1,
        nodes: [
          {
            id: "entry:html:alert",
            kind: "entry",
            label: "Alert",
            entryId: "html:alert",
            view: "html"
          },
          {
            id: "artifact:dist/alert.html",
            kind: "artifact",
            label: "dist/alert.html",
            path: "dist/alert.html"
          }
        ],
        relations: [
          {
            id: "documents-generated-artifact:entry:html:alert->artifact:dist/alert.html",
            kind: "documents-generated-artifact",
            from: "entry:html:alert",
            to: "artifact:dist/alert.html",
            label: "Generated: dist/alert.html",
            confidence: "medium",
            entryId: "html:alert",
            metadata: {
              selector: "[data-component=\"Alert\"]"
            }
          }
        ]
      }
    });
    const rendered = renderBrowserPanel(payload);

    expect(payload.summary).toMatchObject({
      relationCount: 1,
      relationNodeCount: 2
    });
    expect(payload.relationGraph?.relations[0]?.openRequests.map((request) => request.type)).toEqual([
      "hia.openDocumentationEntry",
      "hia.openGenerated"
    ]);
    expect(payload.relationGraph?.relations[0]?.openRequests[1]).toMatchObject({
      kind: "generated-artifact",
      target: {
        path: "dist/alert.html",
        selector: "[data-component=\"Alert\"]"
      }
    });
    expect(rendered.files[0]?.contents).toContain("data-hia-relation-list");
    expect(rendered.files[1]?.contents).toContain("\"relationGraph\"");
  });
});

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}`, import.meta.url), "utf8")) as unknown;
}

/**
 * @lang zh-CN 用未改写的旧夹具构造新版定位反例；只在内存中加入已确认的逐引用约定。
 * @lang en Builds current-range lookup cases from an unchanged historical fixture, adding the confirmed per-reference convention only in memory.
 * @param convention <lang><zh-CN>该源码引用自身声明的终点与列单位。</zh-CN><en>Endpoint and column unit declared on this source reference.</en></lang>
 * @returns <lang><zh-CN>面板生成的组合查询摘要；无文件写入。</zh-CN><en>The panel's combined lookup summary without file writes.</en></lang>
 */
function currentEntryLookup(convention: DocSourceMapRangeConvention) {
  // <lang><zh-CN>每次从磁盘读取旧夹具的独立对象，只在此测试内调整版本与引用约定。</zh-CN><en>Read a fresh historical fixture each time and adjust its version and reference convention only within this test.</en></lang>
  const manifest = readFixture("source-linkage/profile-card.docmap.json") as {
    contractVersion: string;
    entries: Array<{ sourceRefs: Array<{ rangeConvention?: DocSourceMapRangeConvention }> }>;
  };
  manifest.contractVersion = "1.1.0";
  manifest.entries[0]!.sourceRefs[0]!.rangeConvention = convention;
  // <lang><zh-CN>文档索引与普通位置索引独立构造，普通映射不提供原始列单位元数据。</zh-CN><en>Build the documentation and ordinary indexes separately; the ordinary map provides no original-column-unit metadata.</en></lang>
  const index = createDocSourceMapIndex(manifest);
  const ordinary = createOrdinarySourceMapIndex(readFixture("source-linkage/profile-card.js.map.json"), {
    artifactPath: "dist/profile-card.js",
    path: "dist/profile-card.js.map"
  });
  return createBrowserPanelPayload({
    project: { name: "Current Range Fixture" },
    docSourceMaps: [{ path: "source-linkage/profile-card.docmap.json", index, ordinarySourceMaps: [{ path: "dist/profile-card.js.map", index: ordinary }] }]
  }).entries[0]?.lookup;
}
