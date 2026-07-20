import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createReviewOnlyProviderPolicy,
  defineHiaProviderAdapter,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION,
  HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  HIA_PROVIDER_REQUEST_JSON_SCHEMA,
  HIA_PROVIDER_RESULT_CONTRACT,
  HIA_PROVIDER_RESULT_CONTRACT_VERSION,
  HIA_PROVIDER_RESULT_JSON_SCHEMA,
  runHiaProviderAdapter,
  validateHiaProviderDescriptor,
  validateHiaProviderRequest,
  validateHiaProviderResult
} from "../packages/provider-sdk/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-provider-adapter-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const boundaryAuditPath = path.join(rootDir, "dist", "wp35-provider-boundary-audit", "evidence.json");

await main();

/**
 * 准备 W-P35.2 provider adapter interface evidence。
 * Prepare W-P35.2 provider adapter interface evidence.
 *
 * The evidence validates the provider descriptor/request/result contract package
 * and proves that unsafe capabilities, source-body inputs and direct edit
 * outputs are rejected before any real provider integration exists.
 *
 * 本 evidence 验证 provider descriptor/request/result 契约包，并证明在接入任何
 * 真实 provider 前，不安全能力、源码正文输入和直接编辑输出都会被拒绝。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const boundaryAudit = await readJson(boundaryAuditPath);
  const descriptor = createDescriptor();
  const request = createRequest(descriptor);
  const successResult = createSuccessResult(descriptor, request);
  const reportProgressEvents = [];
  const adapter = defineHiaProviderAdapter({
    descriptor,
    async provide(_request, context) {
      context.reportProgress?.({ phase: "draft", current: 1, total: 1 });
      return successResult;
    }
  });

  const runResult = await runHiaProviderAdapter(adapter, request, {
    reportProgress(progress) {
      reportProgressEvents.push(progress);
    }
  });
  const safeDescriptorDiagnostics = validateHiaProviderDescriptor(descriptor);
  const safeRequestDiagnostics = validateHiaProviderRequest(request, { descriptor });
  const safeResultDiagnostics = validateHiaProviderResult(successResult, { descriptor, request });
  const unsafeDescriptorDiagnostics = validateHiaProviderDescriptor({
    ...descriptor,
    capabilities: {
      ...descriptor.capabilities,
      toolExecution: true,
      workspaceWrite: true,
      networkAccess: "host-mediated"
    }
  });
  const unsafeRequestDiagnostics = validateHiaProviderRequest({
    ...request,
    input: {
      ...request.input,
      reviewPayload: {
        sourceText: "redacted fixture source body"
      }
    }
  }, { descriptor });
  const unsafeResultDiagnostics = validateHiaProviderResult({
    ...successResult,
    outputs: [
      {
        ...successResult.outputs[0],
        workspaceEdit: {
          documentChanges: []
        }
      }
    ]
  }, { descriptor, request });
  const thrownAdapter = defineHiaProviderAdapter({
    descriptor,
    async provide() {
      throw new Error("fixture provider failure");
    }
  });
  const thrownResult = await runHiaProviderAdapter(thrownAdapter, request);
  const summary = {
    boundaryAuditReady: boundaryAudit.status === "ready-for-provider-adapter-interface",
    descriptorDiagnosticCount: safeDescriptorDiagnostics.length,
    requestDiagnosticCount: safeRequestDiagnostics.length,
    resultDiagnosticCount: safeResultDiagnostics.length,
    descriptorContractVersion: descriptor.contractVersion,
    requestContractVersion: request.contractVersion,
    resultContractVersion: runResult.contractVersion,
    directEditObjectCount: countDirectEditObjects(runResult),
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers(runResult),
    progressEventCount: reportProgressEvents.length,
    runStatus: runResult.status,
    runOutputKinds: runResult.outputs.map((output) => output.kind),
    unsafeDescriptorErrorCodes: errorCodes(unsafeDescriptorDiagnostics),
    unsafeRequestErrorCodes: errorCodes(unsafeRequestDiagnostics),
    unsafeResultErrorCodes: errorCodes(unsafeResultDiagnostics),
    thrownProviderStatus: thrownResult.status,
    providerCanWriteWorkspace: descriptor.capabilities.workspaceWrite,
    providerCanExecuteTools: descriptor.capabilities.toolExecution,
    providerNetworkAccess: descriptor.capabilities.networkAccess,
    requiresHumanReview: descriptor.policies.requiresHumanReview,
    sourcesContentPolicy: descriptor.policies.sourcesContentPolicy
  };
  const checks = [
    check("HIA_WP35_PROVIDER_ADAPTER_BOUNDARY_READY", summary.boundaryAuditReady === true
      && boundaryAudit.summary?.directEditObjectCount === 0
      && boundaryAudit.providerBoundary?.externalProviderInvocationCount === 0, {
      actual: {
        status: boundaryAudit.status,
        directEditObjectCount: boundaryAudit.summary?.directEditObjectCount,
        externalProviderInvocationCount: boundaryAudit.providerBoundary?.externalProviderInvocationCount
      },
      expected: {
        status: "ready-for-provider-adapter-interface",
        directEditObjectCount: 0,
        externalProviderInvocationCount: 0
      }
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_SCHEMAS_EXPORTED", HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA.$id
      && HIA_PROVIDER_REQUEST_JSON_SCHEMA.$id
      && HIA_PROVIDER_RESULT_JSON_SCHEMA.$id, {
      actual: {
        descriptorSchemaExported: Boolean(HIA_PROVIDER_ADAPTER_DESCRIPTOR_JSON_SCHEMA.$id),
        requestSchemaExported: Boolean(HIA_PROVIDER_REQUEST_JSON_SCHEMA.$id),
        resultSchemaExported: Boolean(HIA_PROVIDER_RESULT_JSON_SCHEMA.$id)
      }
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_SAFE_FIXTURES_VALID", summary.descriptorDiagnosticCount === 0
      && summary.requestDiagnosticCount === 0
      && summary.resultDiagnosticCount === 0, {
      actual: {
        descriptorDiagnosticCount: summary.descriptorDiagnosticCount,
        requestDiagnosticCount: summary.requestDiagnosticCount,
        resultDiagnosticCount: summary.resultDiagnosticCount
      },
      expected: {
        descriptorDiagnosticCount: 0,
        requestDiagnosticCount: 0,
        resultDiagnosticCount: 0
      }
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_REJECTS_UNSAFE_DESCRIPTOR", summary.unsafeDescriptorErrorCodes.includes("HIA_PROVIDER_CAPABILITY_FORBIDDEN")
      && summary.unsafeDescriptorErrorCodes.includes("HIA_PROVIDER_NETWORK_FORBIDDEN"), {
      actual: summary.unsafeDescriptorErrorCodes,
      expected: ["HIA_PROVIDER_CAPABILITY_FORBIDDEN", "HIA_PROVIDER_NETWORK_FORBIDDEN"]
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_REJECTS_SOURCE_BODY_INPUT", summary.unsafeRequestErrorCodes.includes("HIA_PROVIDER_SOURCE_BODY_FORBIDDEN"), {
      actual: summary.unsafeRequestErrorCodes,
      expected: ["HIA_PROVIDER_SOURCE_BODY_FORBIDDEN"]
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_REJECTS_DIRECT_EDIT_OUTPUT", summary.unsafeResultErrorCodes.includes("HIA_PROVIDER_DIRECT_EDIT_FORBIDDEN"), {
      actual: summary.unsafeResultErrorCodes,
      expected: ["HIA_PROVIDER_DIRECT_EDIT_FORBIDDEN"]
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_RUNS_REVIEW_ONLY", summary.runStatus === "success"
      && summary.progressEventCount === 1
      && summary.runOutputKinds.includes("draft-text")
      && summary.runOutputKinds.includes("review-metadata")
      && summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        progressEventCount: summary.progressEventCount,
        runOutputKinds: summary.runOutputKinds,
        runStatus: summary.runStatus,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount
      },
      expected: {
        directEditObjectCount: 0,
        progressEventCount: 1,
        runStatus: "success",
        sourceBodyMarkerCount: 0
      }
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_DENIES_AUTHORITY", summary.providerCanWriteWorkspace === false
      && summary.providerCanExecuteTools === false
      && summary.providerNetworkAccess === "disabled"
      && summary.requiresHumanReview === true
      && summary.sourcesContentPolicy === "none", {
      actual: {
        providerCanExecuteTools: summary.providerCanExecuteTools,
        providerCanWriteWorkspace: summary.providerCanWriteWorkspace,
        providerNetworkAccess: summary.providerNetworkAccess,
        requiresHumanReview: summary.requiresHumanReview,
        sourcesContentPolicy: summary.sourcesContentPolicy
      },
      expected: {
        providerCanExecuteTools: false,
        providerCanWriteWorkspace: false,
        providerNetworkAccess: "disabled",
        requiresHumanReview: true,
        sourcesContentPolicy: "none"
      }
    }),
    check("HIA_WP35_PROVIDER_ADAPTER_FAILURE_IS_STRUCTURED", summary.thrownProviderStatus === "failed"
      && thrownResult.diagnostics.some((diagnostic) => diagnostic.code === "HIA_PROVIDER_EXECUTION_FAILED"), {
      actual: {
        status: summary.thrownProviderStatus,
        diagnosticCodes: thrownResult.diagnostics.map((diagnostic) => diagnostic.code)
      },
      expected: {
        diagnosticCode: "HIA_PROVIDER_EXECUTION_FAILED",
        status: "failed"
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-provider-adapter-interface-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-deterministic-mock-provider" : "blocked",
    sourceEvidence: {
      boundaryAudit: normalizePath(boundaryAuditPath),
      providerSdkPackage: "packages/provider-sdk"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    contracts: {
      descriptor: HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT,
      request: HIA_PROVIDER_REQUEST_CONTRACT,
      result: HIA_PROVIDER_RESULT_CONTRACT
    },
    schemas: {
      descriptor: `${HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT}@${HIA_PROVIDER_ADAPTER_DESCRIPTOR_CONTRACT_VERSION}`,
      request: `${HIA_PROVIDER_REQUEST_CONTRACT}@${HIA_PROVIDER_REQUEST_CONTRACT_VERSION}`,
      result: `${HIA_PROVIDER_RESULT_CONTRACT}@${HIA_PROVIDER_RESULT_CONTRACT_VERSION}`
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.3",
        topic: "deterministic-mock-provider",
        reason: "Provider descriptors, requests, results and review-only runtime gate now have executable validation."
      },
      {
        phase: "W-P35.4",
        topic: "provider-runner",
        reason: "A runner can now load adapters through the provider SDK while still returning only reviewable payloads."
      }
    ],
    manualChecks: [
      "Confirm W-P35.3 remains offline and deterministic.",
      "Confirm real provider API keys remain out of scope until provider runner and configuration privacy gates are explicit.",
      "Confirm checked apply remains host-owned and separate from provider results."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 provider adapter evidence");
  assert.equal(hardFailures.length, 0, `W-P35 provider adapter evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 provider adapter evidence prepared at ${normalizePath(evidencePath)}`);
}

function createDescriptor() {
  return {
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
}

function createRequest(descriptor) {
  return {
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
}

function createSuccessResult(descriptor, request) {
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function errorCodes(diagnostics) {
  return [...new Set(diagnostics.filter((diagnostic) => diagnostic.severity === "error").map((diagnostic) => diagnostic.code))].sort();
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "workspaceEdit") ||
      Object.hasOwn(node, "documentChanges") ||
      Object.hasOwn(node, "changes") ||
      Object.hasOwn(node, "patch") ||
      Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenSourceBodyMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceExcerpt")
    ) {
      count += 1;
    }
  });
  return count;
}

function walkJson(value, visitor) {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      walkJson(item, visitor);
    }
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
