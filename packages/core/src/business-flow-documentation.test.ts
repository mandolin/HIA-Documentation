import { describe, expect, it } from "vitest";
import fixtureData from "./fixtures/business-flow-documentation.synthetic.json" with { type: "json" };
import {
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA,
  produceBusinessFlowDocumentation,
  validateBusinessFlowDocumentation,
  type BusinessFlowDocumentation
} from "./business-flow-documentation.js";

/**
 * @lang zh-CN
 * 返回 W-P114 冻结场景的可修改副本；测试不得改变提交的 canonical fixture。
 *
 * @lang en
 * Returns a mutable copy of the W-P114 frozen scenario; tests must not mutate the committed canonical fixture.
 *
 * @returns 可独立修改的业务流程文档。 / An independently mutable business-flow document.
 */
function createFixture(): BusinessFlowDocumentation {
  return structuredClone(fixtureData) as BusinessFlowDocumentation;
}

/**
 * @lang zh-CN
 * 列出 synthetic code binding 明确引用的稳定目标；该集合只是调用方提供的 metadata registry。
 *
 * @lang en
 * Lists stable targets explicitly referenced by synthetic code bindings; this set is caller-supplied metadata only.
 *
 * @returns 已知 code target identity。 / Known code-target identities.
 */
function createKnownCodeTargets(): string[] {
  return createFixture().codeBindings.map(({ targetId }) => targetId);
}

describe("business-flow-documentation", () => {
  it("publishes the exact closed-world draft contract and validates the frozen synthetic fixture", () => {
    expect(BUSINESS_FLOW_DOCUMENTATION_CONTRACT).toBe("business-flow-documentation");
    expect(BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(validateBusinessFlowDocumentation(createFixture())).toEqual([]);
  });

  it("keeps the fourteen W-P114 diagnostics fixed", () => {
    expect(BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES).toEqual([
      "BFD_INVALID_CONTRACT",
      "BFD_DUPLICATE_ID",
      "BFD_UNKNOWN_REFERENCE",
      "BFD_INVALID_ENTRY_OR_END",
      "BFD_UNREACHABLE_CONTROL_NODE",
      "BFD_CONTROL_CYCLE_UNSUPPORTED",
      "BFD_BRANCH_INVARIANT",
      "BFD_MERGE_INVARIANT",
      "BFD_EXCEPTION_INVARIANT",
      "BFD_AUTHORSHIP_BOUNDARY",
      "BFD_QUALITY_DIMENSION_INVALID",
      "BFD_PRIVACY_BOUNDARY",
      "BFD_CODE_BINDING_UNRESOLVED",
      "BFD_COMPATIBILITY_UNSUPPORTED"
    ]);
  });

  it("produces byte-stable canonical JSON and count-only evidence without mutating array semantics", () => {
    // <lang><zh-CN>reference 以 frozen fixture 顺序生产，candidate 故意反转所有非语义数组。</zh-CN><en>The reference uses frozen fixture order; the candidate deliberately reverses every non-semantic array.</en></lang>
    const reference = produceBusinessFlowDocumentation(createFixture(), { availableCodeTargetIds: createKnownCodeTargets() });
    const shuffledInput = createFixture();
    shuffledInput.flows.reverse();
    shuffledInput.nodes.reverse();
    shuffledInput.relations.reverse();
    shuffledInput.evidence.reverse();
    shuffledInput.codeBindings.reverse();
    shuffledInput.flows[0]!.endNodeIds.reverse();
    const candidate = produceBusinessFlowDocumentation(shuffledInput, { availableCodeTargetIds: createKnownCodeTargets() });

    expect(reference.status).toBe("ready");
    expect(reference.diagnostics).toEqual([]);
    expect(reference.canonicalJson).toBe(candidate.canonicalJson);
    expect(reference.summary).toEqual({
      actorNodes: 5,
      artifactNodes: 4,
      codeBindings: 4,
      controlNodes: 16,
      controlRelations: 16,
      dataRelations: 10,
      evidence: 2,
      flows: 1,
      responsibilityRelations: 11
    });
    expect(Object.isFrozen(reference)).toBe(true);
    expect(Object.isFrozen(reference.canonical)).toBe(true);
    expect(Object.isFrozen(reference.canonical?.relations)).toBe(true);
  });

  it("fails closed on contract, identity, reference, entry, and reachability violations", () => {
    const unknownField = createFixture();
    Object.assign(unknownField, { extensionField: true });
    expect(validateBusinessFlowDocumentation(unknownField).map(({ code }) => code)).toContain("BFD_INVALID_CONTRACT");

    const duplicate = createFixture();
    duplicate.nodes.push(structuredClone(duplicate.nodes[0]!));
    expect(validateBusinessFlowDocumentation(duplicate).map(({ code }) => code)).toContain("BFD_DUPLICATE_ID");

    const unknownReference = createFixture();
    Object.assign(unknownReference.relations[0]!, { to: "step.missing" });
    expect(validateBusinessFlowDocumentation(unknownReference).map(({ code }) => code)).toContain("BFD_UNKNOWN_REFERENCE");

    const invalidEntry = createFixture();
    invalidEntry.flows[0]!.entryNodeId = "step.validate-request";
    expect(validateBusinessFlowDocumentation(invalidEntry).map(({ code }) => code)).toContain("BFD_INVALID_ENTRY_OR_END");

    const unreachable = createFixture();
    unreachable.relations = unreachable.relations.filter(({ id }) => id !== "control.02-validate-to-validity");
    expect(validateBusinessFlowDocumentation(unreachable).map(({ code }) => code)).toContain("BFD_UNREACHABLE_CONTROL_NODE");
  });

  it("rejects cycles and branch, merge, or exception invariant drift", () => {
    const cycle = createFixture();
    cycle.relations.push({
      authorship: "author-provided",
      family: "control",
      flowId: "generic-device-operation-request",
      from: "step.notify-success",
      id: "control.17-success-cycle",
      kind: "exception",
      order: 1,
      caseKey: "retry",
      quality: structuredClone(cycle.relations[0]!.quality!),
      to: "step.validate-request"
    });
    expect(validateBusinessFlowDocumentation(cycle).map(({ code }) => code)).toContain("BFD_CONTROL_CYCLE_UNSUPPORTED");

    const branch = createFixture();
    branch.relations = branch.relations.filter(({ id }) => id !== "control.04-invalid-to-rejection-merge");
    expect(validateBusinessFlowDocumentation(branch).map(({ code }) => code)).toContain("BFD_BRANCH_INVARIANT");

    const merge = createFixture();
    Object.assign(merge.nodes.find(({ kind }) => kind === "merge"), { kind: "step" });
    expect(validateBusinessFlowDocumentation(merge).map(({ code }) => code)).toContain("BFD_MERGE_INVARIANT");

    const exception = createFixture();
    Object.assign(exception.relations.find(({ kind }) => kind === "exception"), { caseKey: undefined });
    expect(validateBusinessFlowDocumentation(exception).map(({ code }) => code)).toContain("BFD_EXCEPTION_INVARIANT");
  });

  it("keeps authorship, quality, privacy, binding resolution, and compatibility independent", () => {
    const authorship = createFixture();
    authorship.nodes[0]!.authorship = "producer-resolved";
    expect(validateBusinessFlowDocumentation(authorship).map(({ code }) => code)).toContain("BFD_AUTHORSHIP_BOUNDARY");

    const quality = createFixture();
    Object.assign(quality.relations[0]!.quality, { confidence: "certain" });
    expect(validateBusinessFlowDocumentation(quality).map(({ code }) => code)).toContain("BFD_QUALITY_DIMENSION_INVALID");

    const privacy = createFixture();
    Object.assign(privacy.privacy, { sourceBodyIncluded: true });
    expect(validateBusinessFlowDocumentation(privacy).map(({ code }) => code)).toContain("BFD_PRIVACY_BOUNDARY");

    const evidenceBody = createFixture();
    Object.assign(evidenceBody.evidence[0], { bodyIncluded: true });
    expect(validateBusinessFlowDocumentation(evidenceBody).map(({ code }) => code)).toContain("BFD_PRIVACY_BOUNDARY");

    const unresolved = produceBusinessFlowDocumentation(createFixture(), { availableCodeTargetIds: [] });
    expect(unresolved.status).toBe("refused");
    expect(unresolved.diagnostics.map(({ code }) => code)).toContain("BFD_CODE_BINDING_UNRESOLVED");
    expect(unresolved.canonical).toBeUndefined();

    const unsupported = createFixture();
    Object.assign(unsupported, { contractVersion: "0.2.0-draft" });
    expect(validateBusinessFlowDocumentation(unsupported).map(({ code }) => code)).toContain("BFD_COMPATIBILITY_UNSUPPORTED");

    const unknownKind = createFixture();
    Object.assign(unknownKind.nodes[0], { kind: "timer" });
    expect(validateBusinessFlowDocumentation(unknownKind).map(({ code }) => code)).toContain("BFD_COMPATIBILITY_UNSUPPORTED");

    const embeddedError = createFixture();
    embeddedError.diagnostics.push({ code: "BFD_UNKNOWN_REFERENCE", message: "Synthetic unresolved reference.", severity: "error" });
    expect(produceBusinessFlowDocumentation(embeddedError, { availableCodeTargetIds: createKnownCodeTargets() }).status).toBe("refused");
  });
});
