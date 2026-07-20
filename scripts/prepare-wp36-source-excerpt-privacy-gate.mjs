import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-source-excerpt-privacy-gate");
const evidencePath = path.join(outputRoot, "evidence.json");
const networkEvidencePath = path.join(rootDir, "dist", "wp36-network-mediation-consent", "evidence.json");

await main();

/**
 * 准备 W-P36.5 source excerpt opt-in and privacy gate evidence。
 * Prepare W-P36.5 source excerpt opt-in and privacy gate evidence.
 *
 * The gate keeps source excerpts disabled by default. Opt-in excerpts are
 * bounded, reviewed, redacted and carried only through host mediation; evidence
 * stores references and limits, never source bodies or sourcesContent.
 *
 * 本 gate 默认禁用源码片段。显式 opt-in 后，源码片段仍必须受限、可审查、已脱敏，
 * 且只通过宿主中介传输；evidence 只保存引用和限制，不保存源码正文或 sourcesContent。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const networkEvidence = await readJson(networkEvidencePath);
  const privacyPolicy = createPrivacyPolicy();
  const excerptProfiles = createExcerptProfiles();
  const excerptReferences = createExcerptReferences();
  const releaseGate = createReleaseGate();
  const privacyScan = createPrivacyScan(excerptReferences, releaseGate);
  const providerBoundary = createProviderBoundary(excerptProfiles, excerptReferences);
  const unsafeSourceMarkerCount = countUnsafeSourceMarkers({
    privacyPolicy,
    excerptProfiles,
    excerptReferences,
    releaseGate,
    privacyScan,
    providerBoundary
  });
  const defaultProfile = excerptProfiles.find((profile) => profile.id === "default-none");
  const optInProfile = excerptProfiles.find((profile) => profile.id === "bounded-symbol-excerpt");
  const summary = {
    networkConsentReady: networkEvidence.status === "ready-for-source-excerpt-opt-in-and-privacy-gate",
    networkExternalCallExecuted: networkEvidence.summary?.externalNetworkCallExecuted ?? true,
    defaultSourceExcerptPolicy: privacyPolicy.defaults.sourceExcerptPolicy,
    optInRequired: privacyPolicy.defaults.optInRequired,
    sourcesContentAllowed: privacyPolicy.defaults.sourcesContentAllowed,
    fullFileAllowed: privacyPolicy.defaults.fullFileAllowed,
    generatedSourceAllowedByDefault: privacyPolicy.defaults.generatedSourceAllowedByDefault,
    excerptProfileCount: excerptProfiles.length,
    defaultProfileCarriesContent: defaultProfile?.carriesContent ?? true,
    optInProfileMaxChars: optInProfile?.limits.maxChars ?? -1,
    optInProfileMaxLines: optInProfile?.limits.maxLines ?? -1,
    optInProfileMaxFiles: optInProfile?.limits.maxFiles ?? -1,
    excerptReferenceCount: excerptReferences.length,
    excerptReferenceCarriesContentCount: excerptReferences.filter((ref) => ref.contentMaterial !== "not-serialized").length,
    releaseGateRejectCount: releaseGate.rejects.length,
    redactionRequired: privacyPolicy.redaction.required,
    humanReviewRequired: privacyPolicy.consent.humanReviewRequired,
    workspaceTrustRequired: privacyPolicy.consent.workspaceTrustRequired,
    providerResultMayContainExcerpt: providerBoundary.providerResultMayContainExcerpt,
    evidenceMayContainExcerpt: providerBoundary.evidenceMayContainExcerpt,
    remoteInvocationStatus: providerBoundary.remoteInvocationStatus,
    privacyScanHardFailureCount: privacyScan.hardFailures.length,
    unsafeSourceMarkerCount
  };
  const checks = [
    check("HIA_WP36_SOURCE_PRIVACY_NETWORK_READY", summary.networkConsentReady === true
      && summary.networkExternalCallExecuted === false, {
      actual: {
        networkExternalCallExecuted: summary.networkExternalCallExecuted,
        networkStatus: networkEvidence.status
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_DEFAULT_DENY", summary.defaultSourceExcerptPolicy === "none"
      && summary.optInRequired === true
      && summary.sourcesContentAllowed === false
      && summary.fullFileAllowed === false
      && summary.generatedSourceAllowedByDefault === false, {
      actual: {
        defaultSourceExcerptPolicy: summary.defaultSourceExcerptPolicy,
        fullFileAllowed: summary.fullFileAllowed,
        generatedSourceAllowedByDefault: summary.generatedSourceAllowedByDefault,
        optInRequired: summary.optInRequired,
        sourcesContentAllowed: summary.sourcesContentAllowed
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_BOUNDED_OPT_IN", summary.excerptProfileCount >= 2
      && summary.defaultProfileCarriesContent === false
      && summary.optInProfileMaxChars > 0
      && summary.optInProfileMaxChars <= 2000
      && summary.optInProfileMaxLines <= 80
      && summary.optInProfileMaxFiles <= 5, {
      actual: {
        defaultProfileCarriesContent: summary.defaultProfileCarriesContent,
        excerptProfileCount: summary.excerptProfileCount,
        optInProfileMaxChars: summary.optInProfileMaxChars,
        optInProfileMaxFiles: summary.optInProfileMaxFiles,
        optInProfileMaxLines: summary.optInProfileMaxLines
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_REFERENCE_ONLY_EVIDENCE", summary.excerptReferenceCount >= 2
      && summary.excerptReferenceCarriesContentCount === 0
      && summary.providerResultMayContainExcerpt === false
      && summary.evidenceMayContainExcerpt === false, {
      actual: {
        evidenceMayContainExcerpt: summary.evidenceMayContainExcerpt,
        excerptReferenceCarriesContentCount: summary.excerptReferenceCarriesContentCount,
        excerptReferenceIds: excerptReferences.map((ref) => ref.referenceId),
        providerResultMayContainExcerpt: summary.providerResultMayContainExcerpt
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_REVIEW_AND_TRUST_REQUIRED", summary.redactionRequired === true
      && summary.humanReviewRequired === true
      && summary.workspaceTrustRequired === true
      && privacyPolicy.consent.requestConsentRequired === true, {
      actual: {
        humanReviewRequired: summary.humanReviewRequired,
        redactionRequired: summary.redactionRequired,
        requestConsentRequired: privacyPolicy.consent.requestConsentRequired,
        workspaceTrustRequired: summary.workspaceTrustRequired
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_RELEASE_GATE_READY", summary.releaseGateRejectCount >= 7
      && releaseGate.rejects.includes("source-body-field")
      && releaseGate.rejects.includes("sources-content-field")
      && releaseGate.rejects.includes("absolute-local-path")
      && releaseGate.rejects.includes("secret-like-content"), {
      actual: {
        rejects: releaseGate.rejects
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_SCAN_CLEAN", summary.privacyScanHardFailureCount === 0
      && summary.unsafeSourceMarkerCount === 0, {
      actual: {
        privacyScanHardFailureCount: summary.privacyScanHardFailureCount,
        unsafeSourceMarkerCount: summary.unsafeSourceMarkerCount
      }
    }),
    check("HIA_WP36_SOURCE_PRIVACY_REMOTE_STILL_DRY_RUN_ONLY", summary.remoteInvocationStatus === "ready-for-safe-invocation-dry-run-without-source-body"
      && providerBoundary.directRemoteSourceTransportAllowed === false, {
      actual: {
        directRemoteSourceTransportAllowed: providerBoundary.directRemoteSourceTransportAllowed,
        remoteInvocationStatus: summary.remoteInvocationStatus
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-source-excerpt-privacy-gate-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-safe-invocation-dry-run" : "blocked",
    sourceEvidence: {
      networkMediationConsent: normalizePath(networkEvidencePath)
    },
    references: [
      {
        id: "data-minimisation",
        source: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/",
        relevance: "Data minimisation supports sending only necessary source context."
      },
      {
        id: "owasp-logging",
        source: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        relevance: "Logs and evidence must not expose sensitive code or personal data."
      },
      {
        id: "vscode-workspace-trust",
        source: "https://code.visualstudio.com/api/extension-guides/workspace-trust",
        relevance: "Workspace trust informs whether code-derived context may be used by host features."
      },
      {
        id: "mdn-source-map",
        source: "https://developer.mozilla.org/en-US/docs/Glossary/Source_map",
        relevance: "Source maps can reconstruct original code, so source-linkage artifacts need privacy gates."
      },
      {
        id: "ecma426-sourcescontent-discussion",
        source: "https://github.com/tc39/ecma426/issues/42",
        relevance: "sourcesContent can expose source code; HIA keeps it disabled in provider evidence."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    privacyPolicy,
    excerptProfiles,
    excerptReferences,
    releaseGate,
    privacyScan,
    providerBoundary,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.6",
        topic: "safe-invocation-dry-run",
        reason: "Source privacy gates are explicit; the first safe invocation dry-run can proceed without source body transport."
      },
      {
        phase: "W-P36.7",
        topic: "closeout-and-checked-apply-inputs",
        reason: "W-P36.7 should summarize registry, secret, network and privacy gates before handing off checked apply inputs."
      }
    ],
    manualChecks: [
      "Confirm future provider hosts show an excerpt preview and data class summary before users opt in.",
      "Confirm source excerpt bodies are never written to evidence or provider result files.",
      "Confirm sourcesContent remains disabled unless a separate release/privacy policy explicitly permits it."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 source excerpt privacy gate evidence");
  assert.equal(hardFailures.length, 0, `W-P36 source excerpt privacy gate has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 source excerpt privacy gate evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createPrivacyPolicy() {
  return {
    contract: "hia-provider-source-excerpt-privacy-policy",
    contractVersion: "0.1.0-draft",
    defaults: {
      sourceExcerptPolicy: "none",
      optInRequired: true,
      sourcesContentAllowed: false,
      fullFileAllowed: false,
      generatedSourceAllowedByDefault: false,
      absoluteLocalPathAllowed: false
    },
    consent: {
      workspaceTrustRequired: true,
      providerConsentRequired: true,
      workspaceConsentRequired: true,
      requestConsentRequired: true,
      humanReviewRequired: true
    },
    redaction: {
      required: true,
      secretScanRequired: true,
      absolutePathRedactionRequired: true,
      privateCommentRedactionRequired: true
    },
    retention: {
      evidenceStoresContent: false,
      providerResultStoresContent: false,
      auditStoresContent: false,
      expiresWithRequest: true
    }
  };
}

function createExcerptProfiles() {
  return [
    {
      id: "default-none",
      sourceExcerptPolicy: "none",
      carriesContent: false,
      allowedDataClasses: ["symbol-id", "diagnostic-code", "locale", "profile-id"],
      limits: {
        maxChars: 0,
        maxLines: 0,
        maxFiles: 0
      }
    },
    {
      id: "bounded-symbol-excerpt",
      sourceExcerptPolicy: "opt-in-bounded-symbol-excerpt",
      carriesContent: "host-mediator-only",
      allowedDataClasses: ["selected-symbol-snippet", "surrounding-comment", "relative-source-range"],
      limits: {
        maxChars: 2000,
        maxLines: 80,
        maxFiles: 5
      },
      requiredGates: [
        "workspace-trust",
        "provider-consent",
        "workspace-consent",
        "request-consent",
        "human-preview",
        "secret-redaction",
        "path-redaction"
      ]
    }
  ];
}

function createExcerptReferences() {
  return [
    {
      contract: "hia-provider-source-excerpt-ref",
      contractVersion: "0.1.0-draft",
      referenceId: "excerpt.ref.symbol-doc-comment",
      profileId: "bounded-symbol-excerpt",
      language: "typescript",
      rangeKind: "relative-source-range",
      relativePathPolicy: "project-relative-only",
      contentMaterial: "not-serialized",
      redactionStatus: "required-before-transport"
    },
    {
      contract: "hia-provider-source-excerpt-ref",
      contractVersion: "0.1.0-draft",
      referenceId: "excerpt.ref.dotnet-member-summary",
      profileId: "bounded-symbol-excerpt",
      language: "csharp",
      rangeKind: "relative-source-range",
      relativePathPolicy: "project-relative-only",
      contentMaterial: "not-serialized",
      redactionStatus: "required-before-transport"
    }
  ];
}

function createReleaseGate() {
  return {
    contract: "hia-provider-source-excerpt-release-gate",
    contractVersion: "0.1.0-draft",
    rejects: [
      "source-body-field",
      "sources-content-field",
      "raw-source-field",
      "full-file-content",
      "generated-source-content",
      "absolute-local-path",
      "secret-like-content",
      "unreviewed-excerpt"
    ],
    allowedEvidenceFields: [
      "excerptRefId",
      "profileId",
      "language",
      "relativeRange",
      "contentMaterial",
      "redactionStatus"
    ]
  };
}

function createPrivacyScan(excerptReferences, releaseGate) {
  return {
    contract: "hia-provider-source-excerpt-privacy-scan",
    contractVersion: "0.1.0-draft",
    scannedReferenceCount: excerptReferences.length,
    appliedRejectRules: releaseGate.rejects,
    hardFailures: [],
    warnings: [
      {
        code: "HIA_PROVIDER_SOURCE_EXCERPT_BODY_NOT_SERIALIZED",
        message: "Evidence stores source excerpt references only; concrete host transport must scan the actual excerpt before sending."
      }
    ]
  };
}

function createProviderBoundary(excerptProfiles, excerptReferences) {
  return {
    contract: "hia-provider-source-excerpt-boundary",
    contractVersion: "0.1.0-draft",
    requestMayContainExcerptRef: true,
    requestMayContainExcerptBodyAfterOptIn: "host-mediator-only",
    directRemoteSourceTransportAllowed: false,
    providerResultMayContainExcerpt: false,
    evidenceMayContainExcerpt: false,
    excerptProfileIds: excerptProfiles.map((profile) => profile.id),
    excerptReferenceIds: excerptReferences.map((ref) => ref.referenceId),
    remoteInvocationStatus: "ready-for-safe-invocation-dry-run-without-source-body"
  };
}

function countUnsafeSourceMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (Object.hasOwn(node, "sourceBody") || Object.hasOwn(node, "sourcesContent") || Object.hasOwn(node, "rawSource")) {
      count += 1;
    }
    if (node.fullFileAllowed === true || node.sourcesContentAllowed === true || node.evidenceMayContainExcerpt === true) {
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

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/(?:^|[\s"'({\[])[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
  assert(!/(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u.test(serialized), `${label} must not include token-looking values.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
