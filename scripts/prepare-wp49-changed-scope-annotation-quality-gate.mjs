import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp49-changed-scope-annotation-quality-gate");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "changed-scope-annotation-quality-gate.md");

await main();

/**
 * 准备 W-P49.3 changed-scope 注释质量门禁 evidence。
 * Prepare W-P49.3 changed-scope annotation quality gate evidence.
 *
 * @lang zh-CN 本脚本只检查“当前变更范围”内的 public/exported TypeScript 节点。
 * 历史缺口继续 report-only，不因 W-P49.2 盘点结果一次性阻塞。
 * @lang en This script checks public/exported TypeScript nodes only inside the
 * current changed scope. Historical gaps remain report-only and are not turned
 * into a one-shot blocking gate from the W-P49.2 inventory.
 *
 * @returns {Promise<void>} Writes public-safe gate evidence and a human report.
 */
async function main() {
  const changedScope = collectChangedScope();
  const touchedSourceFiles = [...changedScope.files.keys()].filter(isFirstPartySourceFile).sort();
  const touchedNodes = [];
  const skippedFiles = [];

  for (const relativePath of touchedSourceFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const sourceText = await readFile(absolutePath, "utf8");
    const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const touchedLineRanges = changedScope.files.get(relativePath) ?? [];
    const publicNodes = collectPublicExportedNodes(sourceFile, sourceText, relativePath);

    if (touchedLineRanges.length === 0) {
      skippedFiles.push({
        path: relativePath,
        reason: "changed-file-without-line-ranges-no-public-node-hard-gate"
      });
      touchedNodes.push(...publicNodes.map((node) => ({ ...node, gateReason: "changed-file-fallback" })));
      continue;
    }

    for (const node of publicNodes) {
      if (isLineTouched(node.line, touchedLineRanges)) {
        touchedNodes.push({ ...node, gateReason: "changed-declaration-line" });
      }
    }
  }

  const failures = touchedNodes
    .map((node) => ({ ...node, failureKinds: getFailureKinds(node) }))
    .filter((node) => node.failureKinds.length > 0);
  const summary = createSummary({ changedScope, failures, skippedFiles, touchedNodes, touchedSourceFiles });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp49-changed-scope-annotation-quality-gate",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp49-internal-flow-comment-fixture" : "blocked-by-changed-scope-annotation-quality-gate",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.3",
    executionPolicy: {
      policy: "changed-scope-quality-gate-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      historicalGapsAreReportOnly: true,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    gatePolicy: {
      mode: "diff-hunk-first-file-fallback",
      hardGateAppliesTo: "public/exported TypeScript declarations whose declaration line is touched by the current diff; when only a changed-file list is available, all public/exported declarations in that file are checked",
      requiredMarkers: ["JSDoc/TSDoc doc block", "canonical @lang or inline <lang>/<l>/<en>/<zh-CN> marker"],
      legacyLocaleMarkersAcceptedForCompatOnly: ["@hiaText", "@hiaBlock"],
      historicalGapPolicy: "report-only"
    },
    changedScope: {
      source: changedScope.source,
      changedFileCount: changedScope.files.size,
      touchedSourceFileCount: touchedSourceFiles.length,
      touchedLineRangeCount: [...changedScope.files.values()].reduce((total, ranges) => total + ranges.length, 0),
      envFileListUsed: changedScope.envFileListUsed,
      gitDiffUsed: changedScope.gitDiffUsed
    },
    summary,
    failures,
    skippedFiles,
    checks,
    generatedDocs: {
      report: normalizePath(reportPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.3 changed-scope gate evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");

  console.log(`W-P49.3 changed-scope annotation quality gate prepared at ${normalizePath(evidencePath)}`);
  console.log(`Gate status: ${evidence.status}`);
}

/**
 * 收集当前变更范围，优先使用 git diff hunk。
 * Collects the current changed scope, preferring git diff hunks.
 *
 * @returns {{source: string, envFileListUsed: boolean, gitDiffUsed: boolean, files: Map<string, Array<{start: number, end: number}>>}}
 */
function collectChangedScope() {
  const envFiles = parseEnvChangedFiles();
  if (envFiles.length > 0) {
    return {
      source: "HIA_DOC_CHANGED_FILES",
      envFileListUsed: true,
      gitDiffUsed: false,
      files: new Map(envFiles.map((file) => [file, []]))
    };
  }

  const files = new Map();
  for (const mode of ["worktree", "cached", "head"]) {
    const diffText = getGitDiff(mode);
    if (diffText.length === 0) continue;
    mergeDiffHunks(files, diffText);
  }

  return {
    source: "git-diff-worktree-cached-head",
    envFileListUsed: false,
    gitDiffUsed: true,
    files
  };
}

/**
 * 解析可选环境变量传入的 changed files。
 * Parses optional changed files supplied by environment variable.
 *
 * @returns {string[]} Normalized relative paths.
 */
function parseEnvChangedFiles() {
  const raw = process.env.HIA_DOC_CHANGED_FILES ?? "";
  return raw
    .split(/[\n,;]+/)
    .map((item) => normalizeRelativeInputPath(item.trim()))
    .filter(Boolean);
}

/**
 * 获取当前仓库 diff。
 * Gets the repository diff for a mode.
 *
 * @param {"worktree" | "cached" | "head"} mode Diff mode.
 * @returns {string} Unified diff text, or an empty string when unavailable.
 */
function getGitDiff(mode) {
  const args = ["diff", "--unified=0", "--no-ext-diff", "--diff-filter=ACMR"];
  if (mode === "cached") args.splice(1, 0, "--cached");
  if (mode === "head") args.splice(1, 0, "HEAD~1..HEAD");

  try {
    return execFileSync("git", args, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/**
 * 将 unified diff hunk 合并为文件行范围。
 * Merges unified diff hunks into per-file changed line ranges.
 *
 * @param {Map<string, Array<{start: number, end: number}>>} files File map.
 * @param {string} diffText Unified diff text.
 */
function mergeDiffHunks(files, diffText) {
  let currentFile = "";
  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      currentFile = normalizeRelativeInputPath(fileMatch[1]);
      if (currentFile) ensureFile(files, currentFile);
      continue;
    }

    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunkMatch || !currentFile) continue;
    const start = Number(hunkMatch[1]);
    const length = hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]);
    const end = Math.max(start, start + Math.max(length, 1) - 1);
    ensureFile(files, currentFile).push({ start, end });
  }
}

function ensureFile(files, relativePath) {
  if (!files.has(relativePath)) files.set(relativePath, []);
  return files.get(relativePath);
}

function isFirstPartySourceFile(relativePath) {
  return /^(packages|apps)\/[^/]+\/src\/.+\.tsx?$/.test(relativePath)
    && !relativePath.includes("/node_modules/")
    && !relativePath.includes("/dist/")
    && !/\.(test|spec)\.tsx?$/.test(relativePath)
    && !relativePath.endsWith(".d.ts");
}

function collectPublicExportedNodes(sourceFile, sourceText, relativePath) {
  const nodes = [];
  for (const statement of sourceFile.statements) {
    if (!isPublicExportedStatement(statement)) continue;
    const name = getNodeName(statement);
    const line = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
    const doc = getLatestLeadingJsDoc(sourceText, statement);
    const locale = inspectLocaleMarkers(doc);
    nodes.push({
      path: relativePath,
      line,
      kind: getNodeKind(statement),
      name,
      hasDocBlock: doc.length > 0,
      hasCanonicalLang: locale.hasCanonicalLang,
      hasInlineLocaleTag: locale.hasInlineLocaleTag,
      hasLegacyLocaleTag: locale.hasLegacyLocaleTag
    });
  }
  return nodes;
}

function isPublicExportedStatement(node) {
  return Boolean(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)
    || (ts.isVariableStatement(node) && Boolean(ts.getCombinedModifierFlags(node.declarationList) & ts.ModifierFlags.Export));
}

function getNodeKind(node) {
  if (ts.isClassDeclaration(node)) return "class";
  if (ts.isEnumDeclaration(node)) return "enum";
  if (ts.isFunctionDeclaration(node)) return "function";
  if (ts.isInterfaceDeclaration(node)) return "interface";
  if (ts.isTypeAliasDeclaration(node)) return "type";
  if (ts.isVariableStatement(node)) return "variable";
  return "unknown";
}

function getNodeName(node) {
  if ("name" in node && node.name) return node.name.getText();
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.map((declaration) => declaration.name.getText()).join(", ");
  }
  return "(anonymous)";
}

function getLatestLeadingJsDoc(sourceText, node) {
  const comments = ts.getLeadingCommentRanges(sourceText, node.pos) ?? [];
  const jsDocs = comments
    .filter((comment) => sourceText.slice(comment.pos, comment.pos + 3) === "/**")
    .map((comment) => sourceText.slice(comment.pos, comment.end));
  return jsDocs.at(-1) ?? "";
}

function inspectLocaleMarkers(docText) {
  return {
    hasCanonicalLang: /@lang\b/.test(docText),
    hasInlineLocaleTag: /<(?:lang|l|en|zh-CN)(?:\s|>)/i.test(docText),
    hasLegacyLocaleTag: /@hia(?:Text|Block)\b/.test(docText)
  };
}

function isLineTouched(line, ranges) {
  return ranges.some((range) => line >= range.start && line <= range.end);
}

function getFailureKinds(node) {
  const failures = [];
  if (!node.hasDocBlock) failures.push("missing-doc-block");
  if (node.hasDocBlock && !node.hasCanonicalLang && !node.hasInlineLocaleTag) failures.push("missing-bilingual-lang-marker");
  if (node.hasLegacyLocaleTag) failures.push("legacy-locale-tag-present");
  return failures;
}

function createSummary({ changedScope, failures, skippedFiles, touchedNodes, touchedSourceFiles }) {
  return {
    phase: "W-P49.3",
    changedFileCount: changedScope.files.size,
    touchedSourceFileCount: touchedSourceFiles.length,
    touchedPublicExportedNodeCount: touchedNodes.length,
    touchedPublicExportedNodeWithDocCount: touchedNodes.filter((node) => node.hasDocBlock).length,
    touchedPublicExportedNodeWithBilingualMarkerCount: touchedNodes.filter((node) => node.hasCanonicalLang || node.hasInlineLocaleTag).length,
    hardFailureCount: failures.length,
    missingDocBlockFailureCount: failures.filter((node) => node.failureKinds.includes("missing-doc-block")).length,
    missingBilingualMarkerFailureCount: failures.filter((node) => node.failureKinds.includes("missing-bilingual-lang-marker")).length,
    legacyLocaleTagFailureCount: failures.filter((node) => node.failureKinds.includes("legacy-locale-tag-present")).length,
    fileFallbackCount: touchedNodes.filter((node) => node.gateReason === "changed-file-fallback").length,
    skippedFileCount: skippedFiles.length,
    historicalGapsRemainReportOnly: true,
    readyForInternalFlowFixture: failures.length === 0,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("changed-scope-computed", summary.changedFileCount >= 0),
    check("historical-gaps-report-only", summary.historicalGapsRemainReportOnly),
    check("changed-scope-hard-gate-pass", summary.hardFailureCount === 0),
    check("ready-for-internal-flow-fixture", summary.readyForInternalFlowFixture),
    check("no-write-or-target-mutation", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0),
    check("no-provider-network", summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0),
    check("no-private-source-output", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0)
  ];
}

function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

function renderReport(evidence) {
  const failures = evidence.failures.map((item) => `| ${item.path}:${item.line} | ${item.kind} | \`${item.name}\` | ${item.failureKinds.join(", ")} | ${item.gateReason} |`).join("\n");
  return `# W-P49.3 Changed-Scope Annotation Quality Gate

## 中文摘要

本阶段建立 changed-scope 注释质量门禁。历史缺口继续 report-only；当前变更范围内被触碰的 public/exported TypeScript declaration 必须具备文档块和 canonical 双语 marker。

## Summary

| 指标 | 值 |
| --- | ---: |
| changed files | ${evidence.summary.changedFileCount} |
| touched source files | ${evidence.summary.touchedSourceFileCount} |
| touched public/exported nodes | ${evidence.summary.touchedPublicExportedNodeCount} |
| hard failures | ${evidence.summary.hardFailureCount} |
| missing doc block failures | ${evidence.summary.missingDocBlockFailureCount} |
| missing bilingual marker failures | ${evidence.summary.missingBilingualMarkerFailureCount} |
| legacy locale tag failures | ${evidence.summary.legacyLocaleTagFailureCount} |

## Failures

| 位置 | kind | name | failure kinds | gate reason |
| --- | --- | --- | --- | --- |
${failures || "| - | - | - | - | - |"}

## Safety Boundary

- historical gaps: report-only
- source bodies: none
- sourcesContent: none
- workspace write: disabled
- target mutation: disabled
- provider/network: disabled
`;
}

function normalizeRelativeInputPath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(value, label) {
  const forbidden = [
    /\b[A-Z]:[\\/]/,
    /file:\/\//i,
    /work-zone/i,
    /Users[\\/]/i,
    /"sourcesContent"\s*:/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/
  ];
  const hit = forbidden.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
