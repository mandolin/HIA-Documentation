import { describe, expect, it } from "vitest";
import {
  produceBusinessFlowDocumentationProjection,
  type BusinessFlowDocumentation,
  type BusinessFlowDocumentationProjection
} from "@hia-doc/core";
import fixtureData from "../../core/src/fixtures/business-flow-documentation.synthetic.json" with { type: "json" };

import { renderProjectHtmlDocument, type RenderProjectHtmlInput } from "./index.js";

/**
 * @lang zh-CN 构造只含 HIA-owned public flow 与一个文档入口的 Portal 结构化消费 fixture。
 * @lang en Builds a Portal structured-consumer fixture containing only an HIA-owned public flow and one documentation entry.
 * @returns renderer project input。 / Renderer project input.
 */
function createFixture(): RenderProjectHtmlInput {
  // <lang><zh-CN>先由 W-P122 producer 生成 exact projection，renderer 测试不手写双视图事实。</zh-CN><en>Generate the exact projection through the W-P122 producer first; the renderer test does not hand-author dual-view facts.</en></lang>
  const projected = produceBusinessFlowDocumentationProjection(structuredClone(fixtureData) as BusinessFlowDocumentation, {
    audience: "public",
    flowIds: ["generic-device-operation-request"],
    locale: "zh-CN"
  });
  if (!projected.projection) throw new Error("HIA-owned business-flow projection fixture must be valid.");
  return {
    project: { name: "Business Flow Structured Consumer", defaultLocale: "zh-CN", locales: ["zh-CN", "en"] },
    entries: [{ id: "business-flow:entry", name: "Business Flow", kind: "module", view: "js" }],
    businessFlowDocumentationProjection: projected.projection
  };
}

describe("business-flow Portal structured consumer", () => {
  it("preserves the exact human/AI projection in project-index and emits only a body-free manifest ref", () => {
    // <lang><zh-CN>空 IA object 仍是 caller 显式采用结构化 Portal contract 的信号。</zh-CN><en>An empty IA object still signals caller-explicit adoption of the structured Portal contract.</en></lang>
    const result = renderProjectHtmlDocument(createFixture(), {
      projectSite: { informationArchitecture: {}, source: { presentation: "none" }, uiLocale: "en" }
    });
    // <lang><zh-CN>project index 用于核对完整 projection parity。</zh-CN><en>The project index is used to verify full projection parity.</en></lang>
    const projectIndex = JSON.parse(result.files.find(({ path }) => path === "project-index.json")?.contents ?? "{}") as {
      businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
    };
    // <lang><zh-CN>topic HTML 只用于证明 W-P124 未越界创建未经确认的可见 flow UI。</zh-CN><en>The topic HTML proves W-P124 did not cross into an unconfirmed visible flow UI.</en></lang>
    const topic = result.files.find(({ path }) => path.startsWith("entries/"))?.contents ?? "";

    expect(projectIndex.businessFlowDocumentationProjection?.humanLinear.flows[0]?.items).toHaveLength(16);
    expect(projectIndex.businessFlowDocumentationProjection?.aiGraph.graphs[0]?.nodeRefs).toHaveLength(25);
    expect(projectIndex.businessFlowDocumentationProjection?.aiGraph.graphs[0]?.edgeRefs).toHaveLength(37);
    expect(result.manifest.project?.businessFlowDocumentationProjection).toEqual({
      contract: "business-flow-documentation-projection",
      contractVersion: "0.1.0-draft",
      flowCount: 1,
      humanItemCount: 16,
      nodeCount: 25,
      relationCount: 37,
      path: "project-index.json"
    });
    // <lang><zh-CN>没有统一 Portal 视觉基线时只交付数据面；flow label 不进入现有 HTML topic。</zh-CN><en>Without a unified Portal visual baseline, only the data plane is delivered; flow labels do not enter existing HTML topics.</en></lang>
    expect(topic).not.toContain("接收设备操作请求");
  });

  it("requires explicit Portal IA and rejects invalid projections before emitting files", () => {
    expect(() => renderProjectHtmlDocument(createFixture())).toThrow(/HIA_PORTAL_IA_BUSINESS_FLOW_REQUIRES_IA/u);

    // <lang><zh-CN>独立 mutable fixture 注入 unknown target layout，验证生成文件前 closed-world refusal。</zh-CN><en>An independent mutable fixture receives an unknown target layout to verify closed-world refusal before file generation.</en></lang>
    const invalid = createFixture();
    const projection = structuredClone(invalid.businessFlowDocumentationProjection) as BusinessFlowDocumentationProjection & { targetPrivateLayout?: string };
    projection.targetPrivateLayout = "must-not-cross";
    invalid.businessFlowDocumentationProjection = projection;
    expect(() => renderProjectHtmlDocument(invalid, {
      projectSite: { informationArchitecture: {}, uiLocale: "en" }
    })).toThrow(/HIA_PORTAL_IA_BUSINESS_FLOW_INVALID/u);
  });
});
