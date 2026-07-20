import { describe, expect, it, vi } from "vitest";
import {
  createReviewOnlyProviderPolicy,
  defineHiaProviderAdapter,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_ID,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_REQUEST_JSON_SCHEMA,
  HIA_PROVIDER_REQUEST_SCHEMA_ID,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_JSON_SCHEMA,
  HIA_PROVIDER_RESULT_SCHEMA_ID,
  runHiaProviderAdapter,
  validateHiaProviderDescriptor,
  validateHiaProviderRequest,
  validateHiaProviderResult,
  type HiaProviderAdapter,
  type HiaProviderDescriptor,
  type HiaProviderRequest,
  type HiaProviderResult
} from "./index.js";

const descriptor: HiaProviderDescriptor = {
  contract: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  contractVersion: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  id: "fixture-provider",
  version: "0.1.0",
  displayName: "Fixture Provider",
  runtimeKind: "deterministic-mock",
  acceptedInputContracts: ["hia-ai-context-package"],
  outputKinds: ["draft-text", "review-metadata", "refusal", "diagnostic"],
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

const request: HiaProviderRequest = {
  contract: HIA_PROVIDER_REQUEST_CONTRACT,
  contractVersion: HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  requestId: "fixture-request",
  providerId: descriptor.id,
  input: {
    aiContextPackageRef: {
      contract: "hia-ai-context-package",
      contractVersion: "0.1.0-draft",
      packageId: "fixture-context",
      sourceExcerptPolicy: "none"
    },
    reviewItemIds: ["fixture-item"],
    locales: ["zh-CN", "en"],
    profileIds: ["jsdoc"]
  },
  policies: createReviewOnlyProviderPolicy()
};

function createSuccessResult(): HiaProviderResult {
  return {
    contract: HIA_PROVIDER_RESULT_CONTRACT,
    contractVersion: HIA_PROVIDER_RESULT_CONTRACT_VERSION,
    requestId: request.requestId,
    provider: {
      id: descriptor.id,
      version: descriptor.version,
      runtimeKind: descriptor.runtimeKind
    },
    status: "success",
    outputs: [
      {
        kind: "draft-text",
        id: "draft-output",
        proposalId: "draft-proposal",
        locale: "zh-CN",
        format: "plain-text",
        text: "建议补齐符号级中文说明。",
        target: {
          kind: "documentation-comment",
          reviewItemId: "fixture-item",
          locale: "zh-CN"
        }
      },
      {
        kind: "review-metadata",
        id: "review-output",
        proposalId: "draft-proposal",
        riskLevel: "low",
        qualitySignals: ["locale-covered", "review-only"]
      }
    ],
    diagnostics: [],
    privacy: createReviewOnlyProviderPolicy(),
    provenance: {
      providerId: descriptor.id,
      providerVersion: descriptor.version,
      runtimeKind: descriptor.runtimeKind,
      generatedAt: "2026-07-21T00:00:00.000Z",
      deterministic: true,
      model: {
        provider: "fixture",
        name: "deterministic-template",
        version: "0.1.0"
      }
    }
  };
}

function createProvider(provide: HiaProviderAdapter["provide"]): HiaProviderAdapter {
  return defineHiaProviderAdapter({ descriptor, provide });
}

describe("@hia-doc/provider-sdk", () => {
  it("validates descriptor, request, result and exported schemas", () => {
    expect(validateHiaProviderDescriptor(descriptor)).toEqual([]);
    expect(validateHiaProviderRequest(request, { descriptor })).toEqual([]);
    expect(validateHiaProviderResult(createSuccessResult(), { descriptor, request })).toEqual([]);
    expect(HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA.$id).toBe(HIA_PROVIDER_ADAPTER_DESCRIPTOR_SCHEMA_ID);
    expect(HIA_PROVIDER_REQUEST_JSON_SCHEMA.$id).toBe(HIA_PROVIDER_REQUEST_SCHEMA_ID);
    expect(HIA_PROVIDER_RESULT_JSON_SCHEMA.$id).toBe(HIA_PROVIDER_RESULT_SCHEMA_ID);
  });

  it("runs a provider and forwards progress without giving write privileges", async () => {
    const reportProgress = vi.fn();
    const provider = createProvider(async (_request, context) => {
      context.reportProgress?.({ phase: "draft", current: 1, total: 1 });
      return createSuccessResult();
    });

    const result = await runHiaProviderAdapter(provider, request, { reportProgress });

    expect(result.status).toBe("success");
    expect(result.outputs).toHaveLength(2);
    expect(result.privacy.allowWorkspaceWrite).toBe(false);
    expect(reportProgress).toHaveBeenCalledWith({ phase: "draft", current: 1, total: 1 });
  });

  it("rejects unsafe descriptor capabilities", () => {
    const diagnostics = validateHiaProviderDescriptor({
      ...descriptor,
      capabilities: {
        ...descriptor.capabilities,
        workspaceWrite: true,
        networkAccess: "host-mediated"
      }
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_CAPABILITY_FORBIDDEN" }),
      expect.objectContaining({ code: "HIA_PROVIDER_NETWORK_FORBIDDEN" })
    ]));
  });

  it("rejects request payloads that try to pass source bodies", async () => {
    const provide = vi.fn(async () => createSuccessResult());
    const provider = createProvider(provide);
    const unsafeRequest = {
      ...request,
      input: {
        ...request.input,
        reviewPayload: {
          sourceText: "private source should not be sent to providers"
        }
      }
    };

    expect(validateHiaProviderRequest(unsafeRequest, { descriptor })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_SOURCE_BODY_FORBIDDEN" })
    ]));

    const result = await runHiaProviderAdapter(provider, unsafeRequest);
    expect(result.status).toBe("failed");
    expect(provide).not.toHaveBeenCalled();
  });

  it("converts direct edit outputs into structured failure", async () => {
    const provider = createProvider(async () => ({
      ...createSuccessResult(),
      outputs: [
        {
          ...createSuccessResult().outputs[0],
          workspaceEdit: {
            documentChanges: []
          }
        }
      ]
    }));

    const result = await runHiaProviderAdapter(provider, request);

    expect(result.status).toBe("failed");
    expect(result.outputs).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_DIRECT_EDIT_FORBIDDEN" })
    ]));
  });

  it("accepts explicit refusal without draft text", () => {
    const refusalResult: HiaProviderResult = {
      ...createSuccessResult(),
      status: "refused",
      outputs: [
        {
          kind: "refusal",
          id: "refusal-output",
          reasonCode: "policy",
          message: "The provider refused to produce a draft."
        }
      ]
    };

    expect(validateHiaProviderResult(refusalResult, { descriptor, request })).toEqual([]);
  });

  it("rejects result identity and request mismatches", () => {
    const diagnostics = validateHiaProviderResult({
      ...createSuccessResult(),
      requestId: "other-request",
      provider: {
        id: "other-provider",
        version: descriptor.version,
        runtimeKind: descriptor.runtimeKind
      }
    }, { descriptor, request });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HIA_PROVIDER_RESULT_REQUEST_MISMATCH" }),
      expect.objectContaining({ code: "HIA_PROVIDER_IDENTITY_MISMATCH" })
    ]));
  });

  it("converts thrown provider errors into execution diagnostics", async () => {
    const provider = createProvider(async () => {
      throw new Error("fixture failure");
    });
    const result = await runHiaProviderAdapter(provider, request);

    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]).toMatchObject({
      code: "HIA_PROVIDER_EXECUTION_FAILED",
      severity: "error"
    });
  });

  it("does not start an already aborted provider", async () => {
    const provide = vi.fn(async () => createSuccessResult());
    const provider = createProvider(provide);
    const controller = new AbortController();
    controller.abort();

    const result = await runHiaProviderAdapter(provider, request, { signal: controller.signal });
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]?.code).toBe("HIA_PROVIDER_ABORTED");
    expect(provide).not.toHaveBeenCalled();
  });
});
