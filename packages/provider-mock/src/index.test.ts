import { describe, expect, it, vi } from "vitest";
import {
  createReviewOnlyProviderPolicy,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  runHiaProviderAdapter,
  validateHiaProviderDescriptor,
  validateHiaProviderResult,
  type HiaProviderRequest
} from "@hia-doc/provider-sdk";
import {
  createDeterministicMockProvider,
  createDeterministicMockProviderDescriptor,
  createDeterministicMockProviderResult
} from "./index.js";

const request: HiaProviderRequest = {
  contract: HIA_PROVIDER_REQUEST_CONTRACT,
  contractVersion: HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  requestId: "fixture-request",
  providerId: "hia-deterministic-mock",
  input: {
    aiContextPackageRef: {
      contract: "hia-ai-context-package",
      contractVersion: "0.1.0-draft",
      packageId: "fixture-context",
      sourceExcerptPolicy: "none"
    },
    reviewItemIds: ["beta-item", "alpha-item"],
    locales: ["en", "zh-CN"],
    profileIds: ["tsdoc", "jsdoc"]
  },
  policies: createReviewOnlyProviderPolicy()
};

describe("@hia-doc/provider-mock", () => {
  it("creates a valid review-only provider descriptor", () => {
    const descriptor = createDeterministicMockProviderDescriptor();

    expect(validateHiaProviderDescriptor(descriptor)).toEqual([]);
    expect(descriptor.capabilities).toMatchObject({
      sourceBodyInput: false,
      targetRepositoryMutation: false,
      toolExecution: false,
      workspaceWrite: false,
      networkAccess: "disabled"
    });
  });

  it("generates deterministic output for identical requests", () => {
    const descriptor = createDeterministicMockProviderDescriptor();
    const first = createDeterministicMockProviderResult(descriptor, request);
    const second = createDeterministicMockProviderResult(descriptor, request);

    expect(second).toEqual(first);
    expect(validateHiaProviderResult(first, { descriptor, request })).toEqual([]);
    expect(first.outputs.filter((output) => output.kind === "draft-text")).toHaveLength(4);
    expect(JSON.stringify(first)).not.toContain("workspaceEdit");
    expect(JSON.stringify(first)).not.toContain("sourceText");
  });

  it("runs through provider-sdk runtime guard", async () => {
    const reportProgress = vi.fn();
    const provider = createDeterministicMockProvider();
    const result = await runHiaProviderAdapter(provider, request, { reportProgress });

    expect(result.status).toBe("success");
    expect(result.outputs.map((output) => output.kind)).toEqual(expect.arrayContaining(["draft-text", "review-metadata"]));
    expect(reportProgress).toHaveBeenCalledTimes(2);
  });

  it("honors custom provider identity and default locale", async () => {
    const provider = createDeterministicMockProvider({
      defaultLocale: "en",
      displayName: "Fixture Mock",
      id: "fixture-mock-provider",
      version: "0.1.1"
    });
    const { locales: _locales, ...inputWithoutLocales } = request.input;
    const result = await runHiaProviderAdapter(provider, {
      ...request,
      providerId: "fixture-mock-provider",
      input: {
        ...inputWithoutLocales,
        reviewItemIds: ["missing-summary"]
      }
    });

    expect(result.provider).toMatchObject({
      id: "fixture-mock-provider",
      version: "0.1.1",
      runtimeKind: "deterministic-mock"
    });
    expect(result.outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: "en" })
    ]));
  });
});
