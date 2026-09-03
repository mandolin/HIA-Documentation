import { describe, expect, it } from "vitest";
import fixtureData from "./fixtures/business-flow-documentation.synthetic.json" with { type: "json" };
import type { BusinessFlowDocumentation } from "./business-flow-documentation.js";
import {
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA,
  produceBusinessFlowDocumentationProjection,
  validateBusinessFlowDocumentationProjection,
  type BusinessFlowDocumentationProjection
} from "./business-flow-documentation-projection.js";

/**
 * @lang zh-CN
 * 返回 W-P119 合成事实的可修改副本，保证每个负例都从同一已验证基线开始。
 *
 * @lang en
 * Returns a mutable copy of the W-P119 synthetic facts so every negative case starts from the same validated baseline.
 *
 * @returns 可独立修改的业务流程事实。 / Independently mutable business-flow facts.
 */
function createFixture(): BusinessFlowDocumentation {
  return structuredClone(fixtureData) as BusinessFlowDocumentation;
}

/**
 * @lang zh-CN
 * 使用显式 public flow 与 locale 生成投影；测试不从系统 locale 或数组位置推断选项。
 *
 * @lang en
 * Produces a projection with an explicit public flow and locale; tests infer neither option from system locale nor array position.
 *
 * @param source <lang><zh-CN>已验证的 W-P119 事实。</zh-CN><en>Validated W-P119 facts.</en></lang>
 * @param locale <lang><zh-CN>请求的展示 locale。</zh-CN><en>Requested display locale.</en></lang>
 * @returns pure projection 结果。 / Pure projection result.
 */
function project(source = createFixture(), locale = "zh-CN") {
  return produceBusinessFlowDocumentationProjection(source, {
    audience: "public",
    flowIds: ["generic-device-operation-request"],
    locale
  });
}

describe("business-flow-documentation-projection", () => {
  it("publishes an exact closed-world neutral projection contract", () => {
    expect(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT).toBe("business-flow-documentation-projection");
    expect(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES).toEqual([
      "BFP_INVALID_CONTRACT",
      "BFP_INVALID_SOURCE",
      "BFP_INVALID_OPTIONS",
      "BFP_FLOW_NOT_FOUND",
      "BFP_PRIVACY_BOUNDARY",
      "BFP_PROJECTION_INVARIANT",
      "BFP_COMPATIBILITY_UNSUPPORTED"
    ]);
  });

  it("creates deterministic human-linear traversal and an AI graph over shared facts", () => {
    const result = project();

    expect(result.status).toBe("ready");
    expect(result.diagnostics).toEqual([]);
    expect(result.summary).toEqual({
      aiEdges: 37,
      aiNodes: 25,
      codeBindings: 4,
      evidence: 2,
      flows: 1,
      humanItems: 16
    });
    expect(result.projection?.humanLinear.flows[0]?.items.map(({ nodeRef }) => nodeRef)).toEqual([
      "start.request-received",
      "step.validate-request",
      "decision.request-valid",
      "step.authorize-request",
      "decision.request-authorized",
      "step.dispatch-operation",
      "step.persist-success",
      "step.notify-success",
      "end.success",
      "step.record-failure",
      "step.notify-failure",
      "end.failed",
      "merge.rejection-paths",
      "step.record-rejection",
      "step.notify-rejection",
      "end.rejected"
    ]);
    expect(result.projection?.humanLinear.flows[0]?.items.find(({ nodeRef }) => nodeRef === "merge.rejection-paths")).toBeDefined();
    expect(validateBusinessFlowDocumentationProjection(result.projection)).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.projection?.sharedFacts.nodes)).toBe(true);
  });

  it("keeps flow, node, edge, evidence, and binding identities in exact parity", () => {
    const projection = project().projection!;
    const human = projection.humanLinear.flows[0]!;
    const graph = projection.aiGraph.graphs[0]!;
    const sharedNodeRefs = projection.sharedFacts.nodes.map(({ id }) => id).sort();
    const sharedEdgeRefs = projection.sharedFacts.relations.map(({ id }) => id).sort();

    expect(projection.source.flowRefs).toEqual([human.flowRef]);
    expect(projection.source.flowRefs).toEqual([graph.flowRef]);
    expect(human.items.map(({ nodeRef }) => nodeRef).sort()).toEqual(
      projection.sharedFacts.nodes.filter(({ kind }) => !["actor", "artifact"].includes(kind)).map(({ id }) => id).sort()
    );
    expect(graph.nodeRefs).toEqual(sharedNodeRefs);
    expect(graph.edgeRefs).toEqual(sharedEdgeRefs);
    expect(graph.evidenceRefs).toEqual(projection.sharedFacts.evidence.map(({ id }) => id));
    expect(graph.codeBindingRefs).toEqual(projection.sharedFacts.codeBindings.map(({ id }) => id));
  });

  it("is byte-stable across non-semantic source and option ordering", () => {
    const reference = project();
    const shuffled = createFixture();
    shuffled.flows.reverse();
    shuffled.nodes.reverse();
    shuffled.relations.reverse();
    shuffled.evidence.reverse();
    shuffled.codeBindings.reverse();

    const candidate = produceBusinessFlowDocumentationProjection(shuffled, {
      audience: "public",
      flowIds: ["generic-device-operation-request"],
      locale: "zh-CN"
    });

    expect(candidate.projectionJson).toBe(reference.projectionJson);
  });

  it("records exact locale resolution and deterministic flow-default fallback without changing identity", () => {
    const exact = project(createFixture(), "en").projection!;
    const fallback = project(createFixture(), "fr").projection!;

    expect(exact.humanLinear.flows[0]?.localeResolution).toEqual({
      requestedLocale: "en",
      resolvedLocale: "en",
      strategy: "requested-exact"
    });
    expect(fallback.humanLinear.flows[0]?.localeResolution).toEqual({
      requestedLocale: "fr",
      resolvedLocale: "zh-CN",
      strategy: "flow-default"
    });
    expect(fallback.humanLinear.flows[0]?.items.every(({ localeResolution }) => localeResolution.resolvedLocale === "zh-CN")).toBe(true);
    expect(fallback.aiGraph.graphs[0]?.nodeRefs).toEqual(exact.aiGraph.graphs[0]?.nodeRefs);
    expect(fallback.aiGraph.graphs[0]?.edgeRefs).toEqual(exact.aiGraph.graphs[0]?.edgeRefs);
  });

  it("fails closed before exposing non-public topology or evidence", () => {
    const internalFlow = createFixture();
    internalFlow.flows[0]!.privacyClass = "internal";
    for (const node of internalFlow.nodes) node.privacyClass = "internal";
    const flowResult = project(internalFlow);
    expect(flowResult.status).toBe("refused");
    expect(flowResult.projection).toBeUndefined();
    expect(flowResult.summary).toBeUndefined();
    expect(flowResult.diagnostics.map(({ code }) => code)).toEqual(["BFP_PRIVACY_BOUNDARY"]);

    const internalEvidence = createFixture();
    internalEvidence.evidence[0]!.privacyClass = "internal";
    const evidenceResult = project(internalEvidence);
    expect(evidenceResult.status).toBe("refused");
    expect(evidenceResult.projectionJson).toBeUndefined();
    expect(evidenceResult.diagnostics.map(({ code }) => code)).toEqual(["BFP_PRIVACY_BOUNDARY"]);
  });

  it("rejects invalid sources, invalid options, and unknown flow selection with stable diagnostics", () => {
    const invalidSource = createFixture();
    Object.assign(invalidSource, { contractVersion: "0.2.0-draft" });
    expect(project(invalidSource).diagnostics.map(({ code }) => code)).toEqual(["BFP_INVALID_SOURCE"]);

    expect(produceBusinessFlowDocumentationProjection(createFixture(), {
      audience: "public",
      flowIds: [],
      locale: "zh-CN"
    }).diagnostics.map(({ code }) => code)).toEqual(["BFP_INVALID_OPTIONS"]);

    expect(produceBusinessFlowDocumentationProjection(createFixture(), {
      audience: "public",
      flowIds: ["flow.missing"],
      locale: "zh-CN"
    }).diagnostics.map(({ code }) => code)).toEqual(["BFP_FLOW_NOT_FOUND"]);
  });

  it("validates parity, privacy, compatibility, and unknown fields on produced payloads", () => {
    const unknownField = structuredClone(project().projection!) as BusinessFlowDocumentationProjection & { layout?: string };
    unknownField.layout = "force-directed";
    expect(validateBusinessFlowDocumentationProjection(unknownField).map(({ code }) => code)).toContain("BFP_INVALID_CONTRACT");

    const parity = structuredClone(project().projection!);
    parity.aiGraph.graphs[0]!.edgeRefs.pop();
    expect(validateBusinessFlowDocumentationProjection(parity).map(({ code }) => code)).toContain("BFP_PROJECTION_INVARIANT");

    const privacy = structuredClone(project().projection!);
    privacy.privacy.hiddenAiContentIncluded = true as false;
    expect(validateBusinessFlowDocumentationProjection(privacy).map(({ code }) => code)).toContain("BFP_PRIVACY_BOUNDARY");

    const compatibility = structuredClone(project().projection!);
    compatibility.contractVersion = "0.2.0-draft" as "0.1.0-draft";
    expect(validateBusinessFlowDocumentationProjection(compatibility).map(({ code }) => code)).toContain("BFP_COMPATIBILITY_UNSUPPORTED");
  });
});
