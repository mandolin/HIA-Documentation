import { describe, expect, it, vi } from "vitest";
import {
  createDeterministicMockProvider
} from "@hia-doc/provider-mock";
import {
  createReviewOnlyProviderPolicy,
  defineHiaProviderAdapter,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  type HiaProviderDescriptor
} from "@hia-doc/provider-sdk";
import {
  createHiaProviderRequestFromReviewPayload,
  createHiaProviderReviewPayloadAugmentation,
  runHiaLocalProvider,
  validateHiaProviderRunnerResult
} from "./index.js";

const reviewPayload = {
  contract: "hia-documentation-review-payload",
  contractVersion: "0.1.0-draft",
  payloadKind: "documentation-review",
  proposalCount: 2,
  draftCount: 1,
  aiContextPackage: {
    contract: "hia-ai-context-package",
    contractVersion: "0.1.0-draft",
    id: "ai-context:fixture.runner:2",
    sourceExcerptPolicy: "none",
    includesSourceContent: false
  },
  items: [
    {
      id: "review-item:missing-doc:alpha",
      proposalId: "proposal:missing-doc:alpha",
      kind: "missing-documentation",
      title: "Review alpha",
      status: "review-required",
      draft: {
        contract: "hia-documentation-draft-text",
        targetLocale: "zh-CN",
        localeDrafts: {
          "zh-CN": "TODO: alpha",
          en: "TODO: alpha"
        }
      }
    },
    {
      id: "review-item:missing-doc:beta",
      proposalId: "proposal:missing-doc:beta",
      kind: "missing-documentation",
      title: "Review beta",
      status: "review-required"
    }
  ],
  actionPolicy: {
    requiresHumanReview: true
  },
  privacy: {
    includesSourceBody: false,
    sourcesContentPolicy: "none"
  }
};

describe("@hia-doc/provider-runner", () => {
  it("creates provider-safe requests from review payloads", () => {
    const provider = createDeterministicMockProvider();
    const request = createHiaProviderRequestFromReviewPayload({
      provider,
      reviewPayload,
      requestId: "runner-fixture",
      profileIds: ["jsdoc"]
    });

    expect(request.requestId).toBe("runner-fixture");
    expect(request.input.aiContextPackageRef).toMatchObject({
      contract: "hia-ai-context-package",
      packageId: "ai-context-fixture.runner-2",
      sourceExcerptPolicy: "none"
    });
    expect(request.input.reviewItemIds).toEqual([
      "review-item-missing-doc-alpha",
      "review-item-missing-doc-beta"
    ]);
    expect(JSON.stringify(request)).not.toContain("sourceText");
    expect(JSON.stringify(request)).not.toContain("\"sourcesContent\":");
  });

  it("runs deterministic mock providers into review payload augmentation", async () => {
    const provider = createDeterministicMockProvider();
    const reportProgress = vi.fn();
    const result = await runHiaLocalProvider({
      provider,
      reviewPayload,
      requestId: "runner-fixture",
      profileIds: ["jsdoc"]
    }, { reportProgress });

    expect(result.status).toBe("success");
    expect(result.reviewPayloadAugmentation.draftOutputs).toHaveLength(4);
    expect(result.reviewPayloadAugmentation.reviewMetadata).toHaveLength(4);
    expect(result.actionPolicy).toMatchObject({
      directApplyAllowed: false,
      directEditObjectAllowed: false,
      requiresHumanReview: true,
      workspaceWriteAllowed: false
    });
    expect(reportProgress).toHaveBeenCalledTimes(2);
    expect(validateHiaProviderRunnerResult(result)).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("workspaceEdit");
  });

  it("rejects source-body markers before provider execution", async () => {
    const provide = vi.fn();
    const provider = createDeterministicMockProvider();
    const result = await runHiaLocalProvider({
      provider: {
        ...provider,
        provide
      },
      reviewPayload: {
        ...reviewPayload,
        sourceText: "private source should not be sent to a provider"
      },
      requestId: "unsafe-runner-fixture"
    });

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_RUNNER_SOURCE_BODY_FORBIDDEN" })
    ]));
    expect(provide).not.toHaveBeenCalled();
  });

  it("flags direct edit objects in runner validation", async () => {
    const provider = createDeterministicMockProvider();
    const result = await runHiaLocalProvider({
      provider,
      reviewPayload,
      requestId: "runner-fixture"
    });
    const unsafe = {
      ...result,
      reviewPayloadAugmentation: {
        ...result.reviewPayloadAugmentation,
        workspaceEdit: {
          documentChanges: []
        }
      }
    };

    expect(validateHiaProviderRunnerResult(unsafe)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_RUNNER_DIRECT_EDIT_FORBIDDEN" })
    ]));
  });

  it("keeps refusal output as review payload data", () => {
    const descriptor: HiaProviderDescriptor = {
      contract: "hia-provider-adapter-descriptor",
      contractVersion: "0.1.0-draft",
      id: "fixture-refusal-provider",
      version: "0.1.0",
      displayName: "Fixture Refusal Provider",
      runtimeKind: "deterministic-mock",
      acceptedInputContracts: ["hia-ai-context-package"],
      outputKinds: ["draft-text", "review-metadata", "refusal"],
      capabilities: {
        draftText: true,
        reviewMetadata: true,
        sourceBodyInput: false,
        toolExecution: false,
        workspaceWrite: false,
        targetRepositoryMutation: false,
        networkAccess: "disabled"
      },
      policies: createReviewOnlyProviderPolicy()
    };
    const provider = defineHiaProviderAdapter({
      descriptor,
      async provide(request) {
        return {
          contract: HIA_PROVIDER_RESULT_CONTRACT,
          contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
          requestId: request.requestId,
          provider: {
            id: descriptor.id,
            version: descriptor.version,
            runtimeKind: descriptor.runtimeKind
          },
          status: "refused",
          outputs: [
            {
              kind: "refusal",
              id: "refusal-output",
              reasonCode: "policy",
              message: "Refused for fixture policy."
            }
          ],
          diagnostics: [],
          privacy: createReviewOnlyProviderPolicy(),
          provenance: {
            providerId: descriptor.id,
            providerVersion: descriptor.version,
            runtimeKind: descriptor.runtimeKind,
            generatedAt: "2026-07-21T00:00:00.000Z",
            deterministic: true
          }
        };
      }
    });
    const providerResult = {
      contract: HIA_PROVIDER_RESULT_CONTRACT,
      contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
      requestId: "fixture-request",
      provider: {
        id: descriptor.id,
        version: descriptor.version,
        runtimeKind: descriptor.runtimeKind
      },
      status: "refused" as const,
      outputs: [
        {
          kind: "refusal" as const,
          id: "refusal-output",
          reasonCode: "policy",
          message: "Refused for fixture policy."
        }
      ],
      diagnostics: [],
      privacy: createReviewOnlyProviderPolicy(),
      provenance: {
        providerId: descriptor.id,
        providerVersion: descriptor.version,
        runtimeKind: descriptor.runtimeKind,
        generatedAt: "2026-07-21T00:00:00.000Z",
        deterministic: true
      }
    };

    expect(provider.descriptor.id).toBe("fixture-refusal-provider");
    expect(createHiaProviderReviewPayloadAugmentation(providerResult, reviewPayload).refusalOutputs).toHaveLength(1);
  });
});
