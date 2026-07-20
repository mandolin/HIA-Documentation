import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createReviewOnlyProviderPolicy,
  HIA_PROVIDER_REQUEST_CONTRACT,
  HIA_PROVIDER_REQUEST_CONTRACT_VERSION,
  runHiaProviderAdapter,
  validateHiaProviderDescriptor,
  validateHiaProviderRequest,
  validateHiaProviderResult
} from "../packages/provider-sdk/dist/index.js";
import {
  createDeterministicMockProvider,
  createDeterministicMockProviderDescriptor,
  createDeterministicMockProviderResult
} from "../packages/provider-mock/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-provider-mock-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const adapterEvidencePath = path.join(rootDir, "dist", "wp35-provider-adapter-evidence", "evidence.json");

await main();

/**
 * 准备 W-P35.3 deterministic mock provider evidence。
 * Prepare W-P35.3 deterministic mock provider evidence.
 *
 * The evidence proves that the first provider implementation is offline,
 * deterministic, review-only and fully mediated by `@hia-doc/provider-sdk`.
 *
 * 本 evidence 证明第一轮 provider 实现是离线、确定性、只读审查型，并完全受
 * `@hia-doc/provider-sdk` 契约闸门约束。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const adapterEvidence = await readJson(adapterEvidencePath);
  const descriptor = createDeterministicMockProviderDescriptor();
  const request = createRequest(descriptor);
  const fixtureResult = createDeterministicMockProviderResult(descriptor, request);
  const provider = createDeterministicMockProvider();
  const progressEvents = [];
  const firstRun = await runHiaProviderAdapter(provider, request, {
    reportProgress(progress) {
      progressEvents.push(progress);
    }
  });
  const secondRun = await runHiaProviderAdapter(provider, request);
  const unsafeRequestDiagnostics = validateHiaProviderRequest({
    ...request,
    input: {
      ...request.input,
      reviewPayload: {
        rawSource: "redacted fixture source body"
      }
    }
  }, { descriptor });
  const unsafeRun = await runHiaProviderAdapter(provider, {
    ...request,
    input: {
      ...request.input,
      reviewPayload: {
        rawSource: "redacted fixture source body"
      }
    }
  });
  const summary = {
    adapterInterfaceReady: adapterEvidence.status === "ready-for-deterministic-mock-provider",
    descriptorDiagnosticCount: validateHiaProviderDescriptor(descriptor).length,
    requestDiagnosticCount: validateHiaProviderRequest(request, { descriptor }).length,
    fixtureResultDiagnosticCount: validateHiaProviderResult(fixtureResult, { descriptor, request }).length,
    runResultDiagnosticCount: validateHiaProviderResult(firstRun, { descriptor, request }).length,
    firstRunStatus: firstRun.status,
    secondRunStatus: secondRun.status,
    deterministicRepeat: stableJson(firstRun) === stableJson(secondRun),
    outputCount: firstRun.outputs.length,
    draftOutputCount: firstRun.outputs.filter((output) => output.kind === "draft-text").length,
    reviewMetadataOutputCount: firstRun.outputs.filter((output) => output.kind === "review-metadata").length,
    localeCount: new Set(firstRun.outputs.map((output) => "locale" in output ? output.locale : undefined).filter(Boolean)).size,
    progressEventCount: progressEvents.length,
    unsafeRequestErrorCodes: errorCodes(unsafeRequestDiagnostics),
    unsafeRunStatus: unsafeRun.status,
    directEditObjectCount: countDirectEditObjects(firstRun),
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers(firstRun),
    externalProviderInvocationCount: 0,
    externalProviderApiKeyRequired: false,
    providerNetworkAccess: descriptor.capabilities.networkAccess,
    providerCanWriteWorkspace: descriptor.capabilities.workspaceWrite,
    providerCanExecuteTools: descriptor.capabilities.toolExecution,
    sourcesContentPolicy: descriptor.policies.sourcesContentPolicy,
    requiresHumanReview: descriptor.policies.requiresHumanReview
  };
  const checks = [
    check("HIA_WP35_PROVIDER_MOCK_ADAPTER_INTERFACE_READY", summary.adapterInterfaceReady === true
      && adapterEvidence.summary?.hardFailureCount === 0, {
      actual: {
        hardFailureCount: adapterEvidence.summary?.hardFailureCount,
        status: adapterEvidence.status
      },
      expected: {
        hardFailureCount: 0,
        status: "ready-for-deterministic-mock-provider"
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_FIXTURES_VALID", summary.descriptorDiagnosticCount === 0
      && summary.requestDiagnosticCount === 0
      && summary.fixtureResultDiagnosticCount === 0
      && summary.runResultDiagnosticCount === 0, {
      actual: {
        descriptorDiagnosticCount: summary.descriptorDiagnosticCount,
        fixtureResultDiagnosticCount: summary.fixtureResultDiagnosticCount,
        requestDiagnosticCount: summary.requestDiagnosticCount,
        runResultDiagnosticCount: summary.runResultDiagnosticCount
      },
      expected: {
        descriptorDiagnosticCount: 0,
        fixtureResultDiagnosticCount: 0,
        requestDiagnosticCount: 0,
        runResultDiagnosticCount: 0
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_DETERMINISTIC_REPEAT", summary.firstRunStatus === "success"
      && summary.secondRunStatus === "success"
      && summary.deterministicRepeat === true, {
      actual: {
        deterministicRepeat: summary.deterministicRepeat,
        firstRunStatus: summary.firstRunStatus,
        secondRunStatus: summary.secondRunStatus
      },
      expected: {
        deterministicRepeat: true,
        firstRunStatus: "success",
        secondRunStatus: "success"
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_REVIEW_OUTPUTS", summary.outputCount === 8
      && summary.draftOutputCount === 4
      && summary.reviewMetadataOutputCount === 4
      && summary.localeCount === 2, {
      actual: {
        draftOutputCount: summary.draftOutputCount,
        localeCount: summary.localeCount,
        outputCount: summary.outputCount,
        reviewMetadataOutputCount: summary.reviewMetadataOutputCount
      },
      expected: {
        draftOutputCount: 4,
        localeCount: 2,
        outputCount: 8,
        reviewMetadataOutputCount: 4
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_REJECTS_SOURCE_BODY", summary.unsafeRequestErrorCodes.includes("HIA_PROVIDER_SOURCE_BODY_FORBIDDEN")
      && summary.unsafeRunStatus === "failed", {
      actual: {
        unsafeRequestErrorCodes: summary.unsafeRequestErrorCodes,
        unsafeRunStatus: summary.unsafeRunStatus
      },
      expected: {
        diagnosticCode: "HIA_PROVIDER_SOURCE_BODY_FORBIDDEN",
        unsafeRunStatus: "failed"
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_REVIEW_ONLY_BOUNDARY", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.providerCanWriteWorkspace === false
      && summary.providerCanExecuteTools === false
      && summary.providerNetworkAccess === "disabled"
      && summary.sourcesContentPolicy === "none"
      && summary.requiresHumanReview === true, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        providerCanExecuteTools: summary.providerCanExecuteTools,
        providerCanWriteWorkspace: summary.providerCanWriteWorkspace,
        providerNetworkAccess: summary.providerNetworkAccess,
        requiresHumanReview: summary.requiresHumanReview,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      },
      expected: {
        directEditObjectCount: 0,
        providerCanExecuteTools: false,
        providerCanWriteWorkspace: false,
        providerNetworkAccess: "disabled",
        requiresHumanReview: true,
        sourceBodyMarkerCount: 0,
        sourcesContentPolicy: "none"
      }
    }),
    check("HIA_WP35_PROVIDER_MOCK_NO_EXTERNAL_PROVIDER", summary.externalProviderInvocationCount === 0
      && summary.externalProviderApiKeyRequired === false, {
      actual: {
        externalProviderApiKeyRequired: summary.externalProviderApiKeyRequired,
        externalProviderInvocationCount: summary.externalProviderInvocationCount
      },
      expected: {
        externalProviderApiKeyRequired: false,
        externalProviderInvocationCount: 0
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-deterministic-mock-provider-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-local-provider-runner" : "blocked",
    sourceEvidence: {
      adapterInterface: normalizePath(adapterEvidencePath),
      providerMockPackage: "packages/provider-mock"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.4",
        topic: "local-provider-runner",
        reason: "A deterministic offline provider now produces stable review-only output through provider-sdk."
      },
      {
        phase: "W-P35.5",
        topic: "host-review-integration-refresh",
        reason: "Provider result includes provenance, locale-aware draft text and review metadata that host review surfaces can display."
      }
    ],
    manualChecks: [
      "Confirm W-P35.4 runner still routes provider output back into review payload rather than checked apply.",
      "Confirm external provider credentials remain out of scope until an explicit secret and network boundary exists.",
      "Confirm deterministic mock provider remains suitable for target/self-doc dry-run evidence."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 deterministic mock provider evidence");
  assert.equal(hardFailures.length, 0, `W-P35 deterministic mock provider evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 deterministic mock provider evidence prepared at ${normalizePath(evidencePath)}`);
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
      reviewItemIds: ["beta-item", "alpha-item"],
      locales: ["en", "zh-CN"],
      profileIds: ["jsdoc", "tsdoc"]
    },
    policies: createReviewOnlyProviderPolicy()
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

function stableJson(value) {
  return JSON.stringify(value, Object.keys(flattenKeys(value)).sort());
}

function flattenKeys(value, keys = {}) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenKeys(item, keys));
    return keys;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      keys[key] = true;
      flattenKeys(item, keys);
    }
  }
  return keys;
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
