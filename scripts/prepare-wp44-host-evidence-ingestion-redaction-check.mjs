import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-host-evidence-ingestion-redaction-check");
const evidencePath = path.join(outputRoot, "evidence.json");
const ledgerPath = path.join(outputRoot, "host-evidence-ingestion-ledger.md");
const redactionPath = path.join(outputRoot, "public-safe-redaction-check.md");
const upgradePath = path.join(outputRoot, "capture-archive-upgrade-path.md");
const normalizationPath = path.join(rootDir, "dist", "wp44-runtime-evidence-normalization", "evidence.json");

await main();

/**
 * 生成 W-P44.6 host evidence ingestion 与 public-safe redaction check。
 * Generate W-P44.6 host evidence ingestion and public-safe redaction checks.
 *
 * This stage ingests W-P44.5 normalized slots into a host evidence ledger. It
 * accepts user-confirmed VS Code and DevTools observations as observation-only
 * evidence, keeps Visual Studio as route-decision-only evidence, and verifies
 * that no screenshots, source bodies, credentials, paths or write authority are
 * smuggled into public evidence.
 *
 * 中文：本阶段把 W-P44.5 normalized slots 吸收到宿主证据账本。它只把 VS Code
 * 与 DevTools 的用户确认结果作为 observation-only evidence 吸收，把 Visual
 * Studio 保持为 route-decision-only evidence，并检查没有截图、源码正文、
 * credential、本地路径或写入权被混入 public evidence。
 *
 * @returns {Promise<void>} Writes public-safe W-P44.6 ingestion evidence and docs.
 */
async function main() {
  const normalization = await readJson(normalizationPath);
  const ledgerEntries = createLedgerEntries(normalization.runtimeSlots || []);
  const redactionControls = createRedactionControls(ledgerEntries, normalization);
  const captureArchiveUpgradePath = createCaptureArchiveUpgradePath(ledgerEntries);
  const aggregate = summarize(normalization, ledgerEntries, redactionControls);
  const checks = [
    check("HIA_WP44_HOST_EVIDENCE_INGESTION_INPUT_READY", normalization.status === "ready-for-wp44-host-evidence-ingestion"
      && normalization.summary?.hardFailureCount === 0
      && aggregate.inputSlotCount === 3
      && aggregate.inputManualVerificationConfirmedCount === 2
      && aggregate.inputRouteDecisionExecutedCount === 1, {
      actual: {
        inputManualVerificationConfirmedCount: aggregate.inputManualVerificationConfirmedCount,
        inputRouteDecisionExecutedCount: aggregate.inputRouteDecisionExecutedCount,
        inputSlotCount: aggregate.inputSlotCount,
        normalizationStatus: normalization.status
      }
    }),
    check("HIA_WP44_HOST_EVIDENCE_LEDGER_READY", aggregate.ledgerEntryCount === 3
      && aggregate.acceptedObservationOnlyCount === 2
      && aggregate.acceptedRouteDecisionOnlyCount === 1
      && aggregate.releaseGradeArchivePendingCount === 2
      && aggregate.visualStudioImplementationPendingCount === 1, {
      actual: {
        acceptedObservationOnlyCount: aggregate.acceptedObservationOnlyCount,
        acceptedRouteDecisionOnlyCount: aggregate.acceptedRouteDecisionOnlyCount,
        ledgerEntryCount: aggregate.ledgerEntryCount,
        releaseGradeArchivePendingCount: aggregate.releaseGradeArchivePendingCount,
        visualStudioImplementationPendingCount: aggregate.visualStudioImplementationPendingCount
      }
    }),
    check("HIA_WP44_HOST_EVIDENCE_NO_FAKE_ARCHIVE", aggregate.capturedArchivedCount === 0
      && aggregate.runtimeCaptureArchivedCount === 0
      && aggregate.captureCompletionClaimedCount === 0
      && aggregate.publicScreenshotArchiveCount === 0
      && aggregate.publicTranscriptArchiveCount === 0
      && aggregate.publicReportArchiveCount === 0, {
      actual: {
        capturedArchivedCount: aggregate.capturedArchivedCount,
        captureCompletionClaimedCount: aggregate.captureCompletionClaimedCount,
        publicReportArchiveCount: aggregate.publicReportArchiveCount,
        publicScreenshotArchiveCount: aggregate.publicScreenshotArchiveCount,
        publicTranscriptArchiveCount: aggregate.publicTranscriptArchiveCount,
        runtimeCaptureArchivedCount: aggregate.runtimeCaptureArchivedCount
      }
    }),
    check("HIA_WP44_HOST_EVIDENCE_REDACTION_CLEAN", aggregate.redactionControlCount >= 8
      && aggregate.redactionControlPassCount === aggregate.redactionControlCount
      && aggregate.sourcesContentPolicyNoneCount === 3
      && aggregate.sourceBodyIncludedCount === 0
      && aggregate.sourceTextIncludedCount === 0
      && aggregate.documentContentIncludedCount === 0
      && aggregate.digestValueIncludedCount === 0
      && aggregate.credentialValueIncludedCount === 0
      && aggregate.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: aggregate.credentialValueIncludedCount,
        digestValueIncludedCount: aggregate.digestValueIncludedCount,
        documentContentIncludedCount: aggregate.documentContentIncludedCount,
        pathExposureCount: aggregate.pathExposureCount,
        redactionControlCount: aggregate.redactionControlCount,
        redactionControlPassCount: aggregate.redactionControlPassCount,
        sourceBodyIncludedCount: aggregate.sourceBodyIncludedCount,
        sourceTextIncludedCount: aggregate.sourceTextIncludedCount,
        sourcesContentPolicyNoneCount: aggregate.sourcesContentPolicyNoneCount
      }
    }),
    check("HIA_WP44_HOST_EVIDENCE_NO_EXECUTION_OR_WRITE", aggregate.providerNetworkExecutedCount === 0
      && aggregate.externalNetworkCallExecutedCount === 0
      && aggregate.targetCommandsExecutedByHiaCount === 0
      && aggregate.targetOwnerExecutionClaimedCount === 0
      && aggregate.checkedApplyWriteEnabledCount === 0
      && aggregate.workspaceWriteAllowedCount === 0
      && aggregate.targetRepositoryMutationCount === 0
      && aggregate.directEditObjectCount === 0, {
      actual: {
        checkedApplyWriteEnabledCount: aggregate.checkedApplyWriteEnabledCount,
        directEditObjectCount: aggregate.directEditObjectCount,
        externalNetworkCallExecutedCount: aggregate.externalNetworkCallExecutedCount,
        providerNetworkExecutedCount: aggregate.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: aggregate.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: aggregate.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: aggregate.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: aggregate.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP44_HOST_EVIDENCE_CLOSEOUT_INPUT_READY", captureArchiveUpgradePath.rules.length >= 5
      && captureArchiveUpgradePath.nextPhase === "W-P44.7"
      && captureArchiveUpgradePath.captureArchiveCanBeDeferred === true
      && captureArchiveUpgradePath.mayClaimCapturedWithoutArchive === false, {
      actual: {
        captureArchiveCanBeDeferred: captureArchiveUpgradePath.captureArchiveCanBeDeferred,
        mayClaimCapturedWithoutArchive: captureArchiveUpgradePath.mayClaimCapturedWithoutArchive,
        nextPhase: captureArchiveUpgradePath.nextPhase,
        ruleCount: captureArchiveUpgradePath.rules.length
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-host-evidence-ingestion-redaction-check",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp44-closeout-and-downstream-inputs" : "blocked",
    sourceEvidence: {
      runtimeEvidenceNormalization: normalizePath(normalizationPath)
    },
    summary: {
      ...aggregate,
      hardFailureCount: hardFailures.length
    },
    hostEvidenceLedger: {
      contract: "hia-wp44-host-evidence-ledger",
      contractVersion: "0.1.0-draft",
      entries: ledgerEntries
    },
    redactionCheck: {
      contract: "hia-wp44-public-safe-redaction-check",
      contractVersion: "0.1.0-draft",
      controls: redactionControls
    },
    captureArchiveUpgradePath,
    checks,
    generatedDocs: {
      hostEvidenceIngestionLedger: normalizePath(ledgerPath),
      publicSafeRedactionCheck: normalizePath(redactionPath),
      captureArchiveUpgradePath: normalizePath(upgradePath)
    },
    nextStageInputs: [
      {
        phase: "W-P44.7",
        topic: "closeout-and-wp45-wp46-wp47-inputs",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "future-release-evidence",
        topic: "optional-public-safe-captured-archive-upgrade",
        status: "deferred-input",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 host evidence ingestion redaction check");
  assert.equal(hardFailures.length, 0, `W-P44 host evidence ingestion redaction check has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(ledgerPath, renderLedger(ledgerEntries, aggregate), "utf8");
  await writeFile(redactionPath, renderRedaction(redactionControls, aggregate), "utf8");
  await writeFile(upgradePath, renderUpgradePath(captureArchiveUpgradePath), "utf8");
  console.log(`W-P44 host evidence ingestion prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 host evidence ledger prepared at ${normalizePath(ledgerPath)}`);
  console.log(`W-P44 public-safe redaction check prepared at ${normalizePath(redactionPath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createLedgerEntries(runtimeSlots) {
  return runtimeSlots.map((slot) => {
    const isManual = slot.normalizedSlotState === "manual-verification-confirmed";
    const isRoute = slot.normalizedSlotState === "route-decision-executed";

    return {
      id: `wp44-host-evidence:${slot.host}`,
      host: slot.host,
      hostKind: slot.hostKind,
      hostRuntime: slot.hostRuntime,
      sourceSlotState: slot.normalizedSlotState,
      ingestionState: isManual ? "accepted-observation-only" : "accepted-route-decision-only",
      evidenceTier: isManual ? "runtime-observation-without-public-archive" : "route-metadata-only",
      redactionCheckState: isManual ? "passed-metadata-only-observation" : "passed-route-metadata",
      actualRuntimeObservationConfirmed: slot.actualRuntimeObservationConfirmed === true,
      runtimeCaptureArchived: false,
      capturedArchived: false,
      captureCompletionClaimed: false,
      publicEvidenceArchiveState: slot.publicEvidenceArchiveState,
      releaseGradeArchiveRequiredBeforeCaptured: true,
      visualStudioImplementationPending: slot.visualStudioRuntime?.realRuntimeImplementationPending === true,
      observationMarkerCount: Array.isArray(slot.observationMarkers)
        ? slot.observationMarkers.filter((markerItem) => markerItem.observed === true).length
        : 0,
      observationMarkers: Array.isArray(slot.observationMarkers) ? slot.observationMarkers : [],
      publicArchives: {
        screenshots: 0,
        transcripts: 0,
        redactionReports: 0
      },
      executionAndWriteBoundary: slot.executionAndWriteBoundary,
      privacy: slot.privacy,
      downstreamUse: {
        wP44CloseoutInput: true,
        providerExecutionInput: false,
        targetOwnerExecutionInput: false,
        checkedApplyWriteInput: false,
        releaseGradeCaptureInput: false,
        notesZh: isRoute
          ? "只能作为 Visual Studio 后续实体实现输入，不能作为真实 capture 证据。"
          : "可作为 W-P44.7 closeout 的真实观察输入，但不能作为发布级 captured archive。"
      },
      invariants: {
        noSourceBody: true,
        noSourcesContent: true,
        noCredential: true,
        noDigest: true,
        noLocalPath: true,
        noWriteAuthority: true
      },
      routeMetadata: isRoute ? slot.routeDecision : null
    };
  });
}

function createRedactionControls(ledgerEntries, normalization) {
  return [
    control("no-source-body", "源码正文不得进入 public evidence。", ledgerEntries.every((entry) => entry.privacy?.sourceBodyIncluded !== true)),
    control("no-source-text", "source text 不得进入 public evidence。", ledgerEntries.every((entry) => entry.privacy?.sourceTextIncluded !== true)),
    control("no-document-content", "document content 不得进入 public evidence。", ledgerEntries.every((entry) => entry.privacy?.documentContentIncluded !== true)),
    control("no-sources-content", "sourcesContent 必须保持 none，且 evidence 不含 sourcesContent 字段。", ledgerEntries.every((entry) => entry.privacy?.sourcesContentPolicy === "none")),
    control("no-credential", "credential value 不得进入 public evidence。", ledgerEntries.every((entry) => entry.privacy?.credentialValueIncluded !== true)),
    control("no-digest", "digest value 不得进入 public evidence。", ledgerEntries.every((entry) => entry.privacy?.digestValueIncluded !== true)),
    control("no-local-path", "本地绝对路径与 file URL 不得进入 public evidence。", ledgerEntries.every((entry) => numberValue(entry.privacy?.pathExposureCount) === 0)),
    control("no-write-authority", "host evidence ingestion 不授予 provider/network、target command、checked apply write、workspace write 或 target mutation。", ledgerEntries.every((entry) => Object.values(entry.executionAndWriteBoundary || {}).every((value) => value === false))),
    control("no-fake-captured-archive", "没有 public-safe screenshot/transcript/report 归档前不得声明 captured-archived。", ledgerEntries.every((entry) => entry.capturedArchived === false && entry.runtimeCaptureArchived === false && entry.captureCompletionClaimed === false)),
    control("input-hard-failure-free", "上游 normalization evidence 必须无 hard failure。", normalization.summary?.hardFailureCount === 0)
  ];
}

function control(id, requirementZh, passed) {
  return {
    id,
    requirementZh,
    status: passed ? "pass" : "fail"
  };
}

function createCaptureArchiveUpgradePath(ledgerEntries) {
  return {
    contract: "hia-wp44-captured-archive-upgrade-path",
    contractVersion: "0.1.0-draft",
    nextPhase: "W-P44.7",
    captureArchiveCanBeDeferred: true,
    mayClaimCapturedWithoutArchive: false,
    currentCapturedArchivedHosts: [],
    releaseGradeArchivePendingHosts: ledgerEntries
      .filter((entry) => entry.ingestionState === "accepted-observation-only")
      .map((entry) => entry.host),
    visualStudioImplementationPendingHosts: ledgerEntries
      .filter((entry) => entry.visualStudioImplementationPending === true)
      .map((entry) => entry.host),
    rules: [
      "只有 public-safe screenshot、transcript 与 redaction report 均归档后，host slot 才能从 manual-verification-confirmed 升级为 captured-archived。",
      "截图或 transcript 中不得包含源码正文、本地绝对路径、credential、digest、目标项目私有内容或 sourcesContent。",
      "Visual Studio 必须先完成 VSIX/Experimental Instance 实体实现、依赖/许可证审计和人工运行清单，才能进入 captured-archived 候选。",
      "W-P44.7 closeout 可以消费 observation-only ledger，但不得把它转成 provider execution、target-owner execution 或 checked apply write 权限。",
      "后续若补采发布级证据，应作为独立 capture archive upgrade，而不是改写 W-P44.2/W-P44.3 的历史结论。"
    ]
  };
}

function summarize(normalization, ledgerEntries, redactionControls) {
  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.6",
    inputStatus: normalization.status,
    inputSlotCount: numberValue(normalization.summary?.hostSlotCount),
    inputManualVerificationConfirmedCount: numberValue(normalization.summary?.manualVerificationConfirmedCount),
    inputRouteDecisionExecutedCount: numberValue(normalization.summary?.routeDecisionExecutedCount),
    ledgerEntryCount: ledgerEntries.length,
    acceptedObservationOnlyCount: countBy(ledgerEntries, "ingestionState", "accepted-observation-only"),
    acceptedRouteDecisionOnlyCount: countBy(ledgerEntries, "ingestionState", "accepted-route-decision-only"),
    releaseGradeArchivePendingCount: ledgerEntries.filter((entry) => entry.releaseGradeArchiveRequiredBeforeCaptured === true && entry.ingestionState === "accepted-observation-only").length,
    visualStudioImplementationPendingCount: ledgerEntries.filter((entry) => entry.visualStudioImplementationPending === true).length,
    capturedArchivedCount: ledgerEntries.filter((entry) => entry.capturedArchived === true).length,
    runtimeCaptureArchivedCount: ledgerEntries.filter((entry) => entry.runtimeCaptureArchived === true).length,
    captureCompletionClaimedCount: ledgerEntries.filter((entry) => entry.captureCompletionClaimed === true).length,
    publicScreenshotArchiveCount: sum(ledgerEntries, (entry) => entry.publicArchives?.screenshots),
    publicTranscriptArchiveCount: sum(ledgerEntries, (entry) => entry.publicArchives?.transcripts),
    publicReportArchiveCount: sum(ledgerEntries, (entry) => entry.publicArchives?.redactionReports),
    observationMarkerCount: sum(ledgerEntries, (entry) => entry.observationMarkerCount),
    redactionControlCount: redactionControls.length,
    redactionControlPassCount: redactionControls.filter((item) => item.status === "pass").length,
    providerNetworkExecutedCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "providerNetworkExecuted"),
    externalNetworkCallExecutedCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "externalNetworkCallExecuted"),
    targetCommandsExecutedByHiaCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "targetCommandsExecutedByHia"),
    targetOwnerExecutionClaimedCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "targetOwnerExecutionClaimed"),
    checkedApplyWriteEnabledCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "checkedApplyWriteEnabled"),
    workspaceWriteAllowedCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "workspaceWriteAllowed"),
    targetRepositoryMutationCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "targetRepositoryMutationAllowed"),
    directEditObjectCount: countNestedTrue(ledgerEntries, "executionAndWriteBoundary", "directEditObjectIncluded")
      + countDirectEditObjects(ledgerEntries),
    sourcesContentPolicyNoneCount: ledgerEntries.filter((entry) => entry.privacy?.sourcesContentPolicy === "none").length,
    sourceBodyIncludedCount: countNestedTrue(ledgerEntries, "privacy", "sourceBodyIncluded"),
    sourceTextIncludedCount: countNestedTrue(ledgerEntries, "privacy", "sourceTextIncluded"),
    documentContentIncludedCount: countNestedTrue(ledgerEntries, "privacy", "documentContentIncluded"),
    digestValueIncludedCount: countNestedTrue(ledgerEntries, "privacy", "digestValueIncluded"),
    credentialValueIncludedCount: countNestedTrue(ledgerEntries, "privacy", "credentialValueIncluded"),
    pathExposureCount: sum(ledgerEntries, (entry) => entry.privacy?.pathExposureCount)
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function countBy(items, field, expected) {
  return items.filter((item) => item[field] === expected).length;
}

function countNestedTrue(items, objectKey, field) {
  return items.filter((item) => item[objectKey]?.[field] === true).length;
}

function sum(items, selector) {
  return items.reduce((total, item) => total + numberValue(selector(item)), 0);
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function countDirectEditObjects(value) {
  return countMatchingValues(value, /workspaceEdit|documentChanges|TextEdit\[/iu);
}

function countMatchingValues(value, pattern) {
  let count = 0;

  visitValues(value, (candidate) => {
    if (pattern.test(candidate)) {
      count += 1;
    }
  });

  return count;
}

function visitValues(value, visitor) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValues(item, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function renderLedger(ledgerEntries, aggregate) {
  const lines = [
    "# W-P44.6 Host Evidence Ingestion Ledger",
    "",
    "## 摘要",
    "",
    `- Ledger entries / 账本条目：${aggregate.ledgerEntryCount}`,
    `- Observation-only / 仅观察证据：${aggregate.acceptedObservationOnlyCount}`,
    `- Route-decision-only / 仅路线决策：${aggregate.acceptedRouteDecisionOnlyCount}`,
    `- Captured archived / 已归档 captured：${aggregate.capturedArchivedCount}`,
    `- Release-grade archive pending / 发布级归档待补：${aggregate.releaseGradeArchivePendingCount}`,
    "",
    "| Host | Runtime | Ingestion State | Evidence Tier | Observed | Captured | Archive Pending | Write |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const entry of ledgerEntries) {
    const writeDisabled = Object.values(entry.executionAndWriteBoundary || {}).every((value) => value === false);
    lines.push(`| \`${entry.host}\` | \`${entry.hostRuntime}\` | \`${entry.ingestionState}\` | \`${entry.evidenceTier}\` | ${entry.actualRuntimeObservationConfirmed} | ${entry.capturedArchived} | ${entry.releaseGradeArchiveRequiredBeforeCaptured} | ${writeDisabled ? "disabled" : "enabled"} |`);
  }

  lines.push("");
  lines.push("本 ledger 可以作为 W-P44.7 closeout 输入，但它不会授予 provider、target-owner 或 checked apply 写入权限。");

  return `${lines.join("\n")}\n`;
}

function renderRedaction(redactionControls, aggregate) {
  const lines = [
    "# W-P44.6 Public-Safe Redaction Check",
    "",
    "## 摘要",
    "",
    `- Redaction controls / 脱敏控制：${aggregate.redactionControlPassCount} / ${aggregate.redactionControlCount} pass`,
    `- Source body included / 源码正文：${aggregate.sourceBodyIncludedCount}`,
    `- Credential value included / credential：${aggregate.credentialValueIncludedCount}`,
    `- Digest value included / digest：${aggregate.digestValueIncludedCount}`,
    `- Path exposure / 路径暴露：${aggregate.pathExposureCount}`,
    `- sourcesContent policy none / sourcesContent none：${aggregate.sourcesContentPolicyNoneCount}`,
    "",
    "## Controls / 控制项",
    ""
  ];

  for (const controlItem of redactionControls) {
    lines.push(`- \`${controlItem.id}\`：${controlItem.status}，${controlItem.requirementZh}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderUpgradePath(upgrade) {
  const lines = [
    "# W-P44.6 Capture Archive Upgrade Path",
    "",
    "## 摘要",
    "",
    `- Next phase / 下一阶段：\`${upgrade.nextPhase}\``,
    `- Capture archive can be deferred / 是否可后延归档：${upgrade.captureArchiveCanBeDeferred}`,
    `- May claim captured without archive / 无归档是否可声明 captured：${upgrade.mayClaimCapturedWithoutArchive}`,
    `- Release-grade archive pending hosts / 待补发布级归档宿主：${upgrade.releaseGradeArchivePendingHosts.map((host) => `\`${host}\``).join(", ")}`,
    `- Visual Studio implementation pending hosts / VS 实体实现待补宿主：${upgrade.visualStudioImplementationPendingHosts.map((host) => `\`${host}\``).join(", ")}`,
    "",
    "## Rules / 规则",
    ""
  ];

  upgrade.rules.forEach((rule, index) => {
    lines.push(`${index + 1}. ${rule}`);
  });

  return `${lines.join("\n")}\n`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
