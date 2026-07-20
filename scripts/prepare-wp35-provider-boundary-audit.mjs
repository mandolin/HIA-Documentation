import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-provider-boundary-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  aiAuthoring: path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json"),
  wp34Closeout: path.join(rootDir, "dist", "wp34-closeout-provider-inputs", "evidence.json")
};
const externalReferenceBaseline = [
  {
    id: "mcp-tools",
    source: "Model Context Protocol Tools",
    boundaryTakeaway: "Tools expose named, schema-described external actions; HIA providers must not use tool-like authority to mutate target repositories in the first slice."
  },
  {
    id: "mcp-overview",
    source: "Model Context Protocol Specification",
    boundaryTakeaway: "Context and tool integration should be explicit protocol surfaces rather than hidden side effects."
  },
  {
    id: "openai-structured-outputs",
    source: "OpenAI Structured Outputs",
    boundaryTakeaway: "Schema-constrained model output is useful, but HIA still validates provider results before review or apply stages."
  },
  {
    id: "anthropic-tool-use",
    source: "Anthropic Tool Use",
    boundaryTakeaway: "Client-side tool execution remains host/application responsibility; provider output alone is not write permission."
  },
  {
    id: "json-schema-2020-12",
    source: "JSON Schema Draft 2020-12",
    boundaryTakeaway: "Provider request/result contracts should be schema-versioned and validated as ordinary JSON artifacts."
  }
];

await main();

/**
 * 准备 W-P35.1 provider boundary audit evidence。
 * Prepare W-P35.1 provider boundary audit evidence.
 *
 * The audit verifies that existing AI authoring and W-P34 apply/edit contracts
 * can feed a future provider layer without granting the provider network,
 * tool-execution, WorkspaceEdit or target-repository write authority.
 *
 * 本审计验证既有 AI authoring 与 W-P34 apply/edit contract 可以作为未来
 * provider 层输入，同时不授予 provider 网络调用、工具执行、WorkspaceEdit 或
 * 目标仓库写入权限。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = await readJson(inputPaths.aiAuthoring);
  const wp34Closeout = await readJson(inputPaths.wp34Closeout);
  const result = aiAuthoring.result ?? {};
  const aiContextPackage = result.aiContextPackage;
  const reviewPayload = result.reviewPayload;
  const providerGate = wp34Closeout.providerGate ?? {};
  const providerBoundary = {
    contractCandidate: "hia-provider-boundary-audit",
    contractVersion: "0.1.0-draft",
    phase: "W-P35.1",
    integrationMode: "provider-neutral-review-only",
    externalProviderNetworkAllowed: false,
    externalProviderApiKeyRequired: false,
    externalProviderInvocationCount: 0,
    providerCanExecuteTools: false,
    providerCanWriteWorkspace: false,
    providerCanMutateTargetRepository: false,
    providerMayReturnDraftText: true,
    providerMayReturnReviewMetadata: true,
    providerMayReturnWorkspaceEdit: false,
    providerMayBypassHumanReview: false,
    sourceExcerptPolicy: "none",
    sourcesContentPolicy: "none"
  };
  const implementationGaps = [
    {
      id: "provider-adapter-interface",
      phase: "W-P35.2",
      status: "planned",
      reason: "Descriptor/request/result/capability/error model is intentionally not implemented in W-P35.1."
    },
    {
      id: "deterministic-mock-provider",
      phase: "W-P35.3",
      status: "planned",
      reason: "W-P35.1 only audits the boundary; the first executable provider should be deterministic and offline."
    },
    {
      id: "provider-runner",
      phase: "W-P35.4",
      status: "planned",
      reason: "Runner must consume the adapter interface and still return review-only payloads."
    },
    {
      id: "checked-apply-contract",
      phase: "post-W-P35",
      status: "deferred",
      reason: "File read, conflict result, rollback record and user confirmation remain separate from provider integration."
    }
  ];
  const summary = {
    acceptedInputContractCount: Array.isArray(providerGate.acceptedInputContracts) ? providerGate.acceptedInputContracts.length : 0,
    aiContextIntegrityPass: aiContextPackage?.integrity?.status === "pass",
    deniedProviderCapabilityCount: Array.isArray(providerGate.deniedProviderCapabilities) ? providerGate.deniedProviderCapabilities.length : 0,
    directEditObjectCount: countDirectEditObjects({
      aiContextPackage,
      providerBoundary,
      reviewPayload,
      wp34Closeout
    }),
    externalProviderInvocationCount: providerBoundary.externalProviderInvocationCount,
    externalReferenceCount: externalReferenceBaseline.length,
    hardFailureCount: Number(wp34Closeout.summary?.hardFailureCount ?? -1),
    implementationGapCount: implementationGaps.length,
    providerBoundaryReady: providerBoundary.externalProviderNetworkAllowed === false
      && providerBoundary.providerCanWriteWorkspace === false
      && providerBoundary.providerMayReturnWorkspaceEdit === false,
    reviewPayloadRequiresHumanReview: reviewPayload?.privacy?.requiresHumanReview === true,
    reviewPayloadAllowsAutomaticWrites: reviewPayload?.privacy?.allowsAutomaticWrites === true,
    sourceExcerptPolicy: aiContextPackage?.privacy?.sourceExcerptPolicy?.mode ?? "unknown",
    sourcesContentPolicy: aiContextPackage?.privacy?.sourcesContentPolicy ?? "unknown",
    wp34CloseoutReady: wp34Closeout.status === "ready-for-wp35-provider-integration-first-slice"
  };
  const checks = [
    check("HIA_WP35_PROVIDER_BOUNDARY_WP34_CLOSEOUT_READY", summary.wp34CloseoutReady === true
      && wp34Closeout.summary?.providerGateReady === true
      && wp34Closeout.summary?.directEditObjectCount === 0, {
      actual: {
        directEditObjectCount: wp34Closeout.summary?.directEditObjectCount,
        providerGateReady: wp34Closeout.summary?.providerGateReady,
        status: wp34Closeout.status
      },
      expected: {
        directEditObjectCount: 0,
        providerGateReady: true,
        status: "ready-for-wp35-provider-integration-first-slice"
      }
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_CONTEXT_PRIVACY", summary.aiContextIntegrityPass === true
      && summary.sourceExcerptPolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && aiContextPackage?.privacy?.includesSourceContent === false
      && aiContextPackage?.privacy?.includesSourceExcerpt === false, {
      actual: aiContextPackage?.privacy ?? null,
      expected: {
        includesSourceContent: false,
        includesSourceExcerpt: false,
        sourceExcerptPolicy: "none",
        sourcesContentPolicy: "none"
      }
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_REVIEW_PAYLOAD_HUMAN_REVIEW", summary.reviewPayloadRequiresHumanReview === true
      && summary.reviewPayloadAllowsAutomaticWrites === false
      && reviewPayload?.privacy?.allowsTargetRepositoryMutation === false
      && reviewPayload?.actionPolicy?.deniedActions?.includes("apply-workspace-edit"), {
      actual: {
        actionPolicy: reviewPayload?.actionPolicy,
        privacy: reviewPayload?.privacy
      },
      expected: {
        deniedAction: "apply-workspace-edit",
        requiresHumanReview: true,
        allowsAutomaticWrites: false,
        allowsTargetRepositoryMutation: false
      }
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_DENIED_CAPABILITIES", providerGate.deniedProviderCapabilities?.includes("direct-workspace-write")
      && providerGate.deniedProviderCapabilities?.includes("direct-workspace-edit-object")
      && providerGate.deniedProviderCapabilities?.includes("target-repository-mutation")
      && providerGate.deniedProviderCapabilities?.includes("source-body-embedding")
      && providerGate.deniedProviderCapabilities?.includes("bypass-human-review"), {
      actual: providerGate.deniedProviderCapabilities ?? [],
      expected: [
        "direct-workspace-write",
        "direct-workspace-edit-object",
        "target-repository-mutation",
        "source-body-embedding",
        "bypass-human-review"
      ]
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_NO_EXTERNAL_PROVIDER_CALL", summary.externalProviderInvocationCount === 0
      && providerBoundary.externalProviderNetworkAllowed === false
      && providerBoundary.externalProviderApiKeyRequired === false, {
      actual: {
        externalProviderApiKeyRequired: providerBoundary.externalProviderApiKeyRequired,
        externalProviderInvocationCount: summary.externalProviderInvocationCount,
        externalProviderNetworkAllowed: providerBoundary.externalProviderNetworkAllowed
      },
      expected: {
        externalProviderApiKeyRequired: false,
        externalProviderInvocationCount: 0,
        externalProviderNetworkAllowed: false
      }
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_REVIEW_ONLY_OUTPUT", providerBoundary.providerMayReturnDraftText === true
      && providerBoundary.providerMayReturnReviewMetadata === true
      && providerBoundary.providerMayReturnWorkspaceEdit === false
      && providerBoundary.providerMayBypassHumanReview === false, {
      actual: providerBoundary,
      expected: {
        providerMayBypassHumanReview: false,
        providerMayReturnDraftText: true,
        providerMayReturnReviewMetadata: true,
        providerMayReturnWorkspaceEdit: false
      }
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_REFERENCES_RECORDED", summary.externalReferenceCount === 5, {
      actual: summary.externalReferenceCount,
      expected: 5
    }),
    check("HIA_WP35_PROVIDER_BOUNDARY_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-provider-boundary-audit",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-provider-adapter-interface" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPaths.aiAuthoring),
      wp34Closeout: normalizePath(inputPaths.wp34Closeout)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    externalReferenceBaseline,
    providerBoundary,
    implementationGaps,
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.2",
        topic: "provider-adapter-interface",
        reason: "Existing review and apply-preflight contracts are ready to feed a provider-neutral adapter shape without granting write authority."
      },
      {
        phase: "W-P35.3",
        topic: "deterministic-mock-provider",
        reason: "The first provider implementation should be offline and deterministic so that review-only behavior is testable before any real API integration."
      }
    ],
    manualChecks: [
      "Confirm no real provider API key, network call or browser authentication is required for W-P35.1.",
      "Confirm future provider results stay review-only until a checked apply contract exists.",
      "Confirm target projects continue to receive only central notify guidance, not direct repository edits."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 provider boundary audit");
  assert.equal(hardFailures.length, 0, `W-P35 provider boundary audit has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 provider boundary audit prepared at ${normalizePath(evidencePath)}`);
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

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (Object.hasOwn(node, "workspaceEdit") || Object.hasOwn(node, "documentChanges") || Object.hasOwn(node, "changes")) {
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
