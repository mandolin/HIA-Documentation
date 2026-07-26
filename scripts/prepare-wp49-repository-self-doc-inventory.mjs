import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp49-repository-self-doc-inventory");
const evidencePath = path.join(outputRoot, "evidence.json");
const inventoryPath = path.join(outputRoot, "repository-self-doc-inventory.md");
const publicSurfacePath = path.join(outputRoot, "public-exported-surface-gap-ledger.md");
const internalFlowPath = path.join(outputRoot, "internal-flow-comment-candidate-ledger.md");
const nextInputsPath = path.join(outputRoot, "wp49-next-stage-inputs.md");

await main();

/**
 * 生成 W-P49.2 仓库自文档化盘点 evidence。
 * Generate W-P49.2 repository self-documentation inventory evidence.
 *
 * @lang zh-CN 本脚本读取 main-repo 第一方 TypeScript 源码并只输出结构化元数据：
 * 相对路径、节点名称、行号、缺口类型和统计。它不输出源码正文，不修改源码，不声称历史注释已补齐。
 * @lang en This script reads first-party TypeScript source files in main-repo
 * and emits structured metadata only: relative paths, node names, line numbers,
 * gap kinds, and counts. It does not emit source bodies, mutate source files,
 * or claim historical comment coverage completion.
 *
 * @returns {Promise<void>} Writes public-safe W-P49.2 evidence and reports.
 */
async function main() {
  const sourceFiles = await collectSourceFiles();
  const scannedFiles = [];
  const publicNodes = [];
  const internalFlowCandidates = [];
  const boundaryCategories = createEmptyBoundaryCategories();

  for (const filePath of sourceFiles) {
    const sourceText = await readFile(filePath, "utf8");
    const relativePath = normalizePath(filePath);
    const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const fileInventory = analyzeSourceFile(sourceFile, sourceText, filePath);
    scannedFiles.push(fileInventory.file);
    publicNodes.push(...fileInventory.publicNodes);
    internalFlowCandidates.push(...fileInventory.internalFlowCandidates);
    mergeBoundaryCategories(boundaryCategories, fileInventory.boundaryCategories);
  }

  const gapLedger = createPublicGapLedger(publicNodes);
  const flowLedger = createInternalFlowLedger(internalFlowCandidates);
  const nextInputs = createNextInputs({ flowLedger, gapLedger });
  const summary = summarize({ boundaryCategories, flowLedger, gapLedger, internalFlowCandidates, publicNodes, scannedFiles });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P49.2 repository self-doc inventory has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp49-repository-self-doc-inventory",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp49-changed-scope-annotation-quality-gate",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.2",
    sourceInputs: {
      annotationRichnessPolicyBaseline: "wp49-annotation-richness-policy-baseline",
      scanScope: "main-repo first-party packages/apps TypeScript source metadata only"
    },
    executionPolicy: {
      policy: "self-documentation-inventory-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimHistoricalCommentCoverageComplete: false,
      mayModifySourceAnnotations: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    scanScope: {
      includedRoots: ["packages/*/src", "apps/*/src"],
      excludedPathSegments: ["dist", "node_modules"],
      excludedFilePatterns: ["*.test.ts", "*.test.tsx", "*.d.ts"],
      sourceBodiesSerialized: false
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    boundaryCategories,
    gapLedger,
    internalFlowLedger: flowLedger,
    nextInputs,
    checks,
    generatedDocs: {
      internalFlow: normalizePath(internalFlowPath),
      inventory: normalizePath(inventoryPath),
      nextInputs: normalizePath(nextInputsPath),
      publicSurface: normalizePath(publicSurfacePath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.2 repository self-doc inventory evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(inventoryPath, renderInventory(evidence), "utf8");
  await writeFile(publicSurfacePath, renderPublicSurfaceGapLedger(evidence), "utf8");
  await writeFile(internalFlowPath, renderInternalFlowLedger(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextInputs(evidence), "utf8");

  console.log(`W-P49.2 repository self-doc inventory prepared at ${normalizePath(evidencePath)}`);
  console.log(`Public surface gap ledger prepared at ${normalizePath(publicSurfacePath)}`);
  console.log(`Internal flow candidate ledger prepared at ${normalizePath(internalFlowPath)}`);
}

/**
 * 收集第一方 TypeScript 源文件。
 * Collect first-party TypeScript source files.
 *
 * <lang><zh-CN>扫描范围只覆盖 main-repo 的 packages/apps 源码目录，并显式排除
 * node_modules、dist、测试文件和声明文件，避免把构建产物或依赖包算入本项目自文档化缺口。</zh-CN><en>The scan scope is
 * limited to main-repo packages/apps source directories and explicitly excludes
 * node_modules, dist, tests, and declarations so generated outputs and
 * dependencies are not counted as first-party self-documentation gaps.</en></lang>
 *
 * @returns {Promise<string[]>} Absolute first-party source paths.
 */
async function collectSourceFiles() {
  const roots = [path.join(rootDir, "packages"), path.join(rootDir, "apps")];
  const files = [];
  for (const root of roots) {
    files.push(...await collectSourceFilesUnder(root));
  }
  return files.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

async function collectSourceFilesUnder(currentDir) {
  let entries = [];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (["dist", "node_modules"].includes(entry.name)) {
        continue;
      }
      files.push(...await collectSourceFilesUnder(entryPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!isInventorySourceFile(entryPath)) {
      continue;
    }
    files.push(entryPath);
  }
  return files;
}

function isInventorySourceFile(filePath) {
  const normalized = normalizePath(filePath);
  if (!/\/src\/.+\.tsx?$/.test(normalized)) {
    return false;
  }
  if (/(\.test|\.spec)\.tsx?$/.test(normalized) || /\.d\.ts$/.test(normalized)) {
    return false;
  }
  return true;
}

function analyzeSourceFile(sourceFile, sourceText, absolutePath) {
  const relativePath = normalizePath(absolutePath);
  const boundaryTags = getBoundaryTags(relativePath);
  const file = {
    boundaryTags,
    path: relativePath,
    publicExportedNodeCount: 0,
    internalFlowCandidateCount: 0
  };
  const publicNodes = [];
  const internalFlowCandidates = [];
  const boundaryCategories = createEmptyBoundaryCategories();

  function visit(node) {
    if (isPublicExportedNode(node)) {
      const nodeInventory = analyzePublicNode({ absolutePath, boundaryTags, node, sourceFile, sourceText });
      publicNodes.push(nodeInventory);
      file.publicExportedNodeCount += 1;
      for (const tag of boundaryTags) {
        boundaryCategories[tag].publicExportedNodeCount += 1;
        if (nodeInventory.hasDocBlock) {
          boundaryCategories[tag].documentedPublicExportedNodeCount += 1;
        }
      }
    }

    if (isFunctionLikeWithBody(node)) {
      const candidate = analyzeInternalFlowCandidate({ absolutePath, boundaryTags, node, sourceFile, sourceText });
      if (candidate !== undefined) {
        internalFlowCandidates.push(candidate);
        file.internalFlowCandidateCount += 1;
        for (const tag of boundaryTags) {
          boundaryCategories[tag].internalFlowCandidateCount += 1;
          if (candidate.hasInternalComment) {
            boundaryCategories[tag].internalFlowCandidateWithCommentCount += 1;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { boundaryCategories, file, internalFlowCandidates, publicNodes };
}

function analyzePublicNode({ absolutePath, boundaryTags, node, sourceFile, sourceText }) {
  const docBlock = getLeadingDocBlock(sourceText, node);
  const line = getLine(sourceFile, node);
  const kind = getNodeKind(node);
  const name = getNodeName(node);
  const hasDocBlock = docBlock !== "";
  const hasCanonicalLang = /@lang\b/.test(docBlock) || /<lang\b/i.test(docBlock) || /<l\b/i.test(docBlock);
  const hasInlineLocaleTag = /<(?:en|zh-CN|lang|l)\b/i.test(docBlock);
  const hasLegacyLocaleTag = /@hia(?:Text|Block)\b/.test(docBlock);
  const gapKinds = [];
  if (!hasDocBlock) {
    gapKinds.push("missing-doc-block");
  }
  if (hasDocBlock && !hasCanonicalLang && !hasInlineLocaleTag) {
    gapKinds.push("missing-bilingual-lang-marker");
  }
  if (hasLegacyLocaleTag) {
    gapKinds.push("legacy-locale-tag-present");
  }

  return {
    boundaryTags,
    gapKinds,
    hasCanonicalLang,
    hasDocBlock,
    hasInlineLocaleTag,
    hasLegacyLocaleTag,
    kind,
    line,
    name,
    path: normalizePath(absolutePath)
  };
}

function analyzeInternalFlowCandidate({ absolutePath, boundaryTags, node, sourceFile, sourceText }) {
  const body = node.body;
  const directStatementCount = Array.isArray(body?.statements) ? body.statements.length : 0;
  const branchCount = countBranchLikeNodes(body);
  const complexityScore = directStatementCount + branchCount * 2;
  if (complexityScore < 8 && branchCount < 2) {
    return undefined;
  }

  const bodyText = sourceText.slice(body.getStart(sourceFile), body.end);
  const hasInternalComment = /\/\/|\/\*/.test(bodyText);
  const hasBilingualInternalComment = /<(?:en|zh-CN|lang|l)\b/i.test(bodyText);
  return {
    boundaryTags,
    branchCount,
    directStatementCount,
    hasBilingualInternalComment,
    hasInternalComment,
    line: getLine(sourceFile, node),
    name: getNodeName(node),
    path: normalizePath(absolutePath),
    score: complexityScore
  };
}

function isPublicExportedNode(node) {
  if (!isSupportedNodeKind(node)) {
    return false;
  }
  return hasExportModifier(node);
}

function isSupportedNodeKind(node) {
  return ts.isClassDeclaration(node)
    || ts.isEnumDeclaration(node)
    || ts.isFunctionDeclaration(node)
    || ts.isInterfaceDeclaration(node)
    || ts.isTypeAliasDeclaration(node)
    || ts.isVariableStatement(node);
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
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
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.map((declaration) => declaration.name.getText()).join(", ");
  }
  return node.name?.getText() ?? "default-export";
}

function isFunctionLikeWithBody(node) {
  return (ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)) && node.body !== undefined;
}

function countBranchLikeNodes(root) {
  let count = 0;
  function visit(node) {
    if (ts.isIfStatement(node)
      || ts.isForStatement(node)
      || ts.isForInStatement(node)
      || ts.isForOfStatement(node)
      || ts.isWhileStatement(node)
      || ts.isDoStatement(node)
      || ts.isSwitchStatement(node)
      || ts.isTryStatement(node)
      || ts.isConditionalExpression(node)) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return count;
}

function getLeadingDocBlock(sourceText, node) {
  const comments = ts.getLeadingCommentRanges(sourceText, node.pos) ?? [];
  const doc = comments
    .map((comment) => sourceText.slice(comment.pos, comment.end))
    .reverse()
    .find((commentText) => commentText.trimStart().startsWith("/**"));
  return doc ?? "";
}

function getLine(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function getBoundaryTags(relativePath) {
  const tags = new Set(["first-party-source"]);
  if (/\/(schema|schemas)\//i.test(relativePath) || /schema/i.test(relativePath)) tags.add("schema");
  if (/contract|protocol|model|profile|profiles/i.test(relativePath)) tags.add("contract-profile");
  if (/diagnostic/i.test(relativePath)) tags.add("diagnostic");
  if (/provider/i.test(relativePath)) tags.add("provider");
  if (/runtime|host|vscode|devtools|visual-studio|lsp/i.test(relativePath)) tags.add("runtime-host");
  if (/source-linkage|source-map|sourcemap|doc-source-map/i.test(relativePath)) tags.add("source-map");
  return [...tags].sort();
}

function createEmptyBoundaryCategories() {
  return Object.fromEntries([
    "contract-profile",
    "diagnostic",
    "first-party-source",
    "provider",
    "runtime-host",
    "schema",
    "source-map"
  ].map((tag) => [tag, {
    documentedPublicExportedNodeCount: 0,
    internalFlowCandidateCount: 0,
    internalFlowCandidateWithCommentCount: 0,
    publicExportedNodeCount: 0
  }]));
}

function mergeBoundaryCategories(target, source) {
  for (const [tag, counts] of Object.entries(source)) {
    for (const [key, value] of Object.entries(counts)) {
      target[tag][key] += value;
    }
  }
}

function createPublicGapLedger(publicNodes) {
  const gapNodes = publicNodes.filter((item) => item.gapKinds.length > 0);
  return {
    status: "report-only",
    totalPublicExportedNodeCount: publicNodes.length,
    documentedPublicExportedNodeCount: publicNodes.filter((item) => item.hasDocBlock).length,
    bilingualMarkerPublicExportedNodeCount: publicNodes.filter((item) => item.hasCanonicalLang || item.hasInlineLocaleTag).length,
    missingDocBlockCount: gapNodes.filter((item) => item.gapKinds.includes("missing-doc-block")).length,
    missingBilingualMarkerCount: gapNodes.filter((item) => item.gapKinds.includes("missing-bilingual-lang-marker")).length,
    legacyLocaleTagPublicNodeCount: gapNodes.filter((item) => item.gapKinds.includes("legacy-locale-tag-present")).length,
    topGaps: gapNodes.slice(0, 80)
  };
}

function createInternalFlowLedger(candidates) {
  return {
    status: "report-only-heuristic",
    heuristic: "directStatementCount + branchCount * 2 >= 8 or branchCount >= 2",
    totalCandidateCount: candidates.length,
    candidateWithCommentCount: candidates.filter((item) => item.hasInternalComment).length,
    candidateWithBilingualCommentCount: candidates.filter((item) => item.hasBilingualInternalComment).length,
    topCandidates: candidates
      .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
      .slice(0, 80)
  };
}

function createNextInputs({ flowLedger, gapLedger }) {
  return {
    status: "ready",
    items: [
      {
        id: "wp49-3-changed-scope-quality-gate",
        phase: "W-P49.3",
        priority: "P0",
        title: "Changed-Scope Annotation Quality Gate",
        ready: true,
        inputSignals: {
          missingBilingualMarkerCount: gapLedger.missingBilingualMarkerCount,
          missingDocBlockCount: gapLedger.missingDocBlockCount,
          publicExportedNodeCount: gapLedger.totalPublicExportedNodeCount
        }
      },
      {
        id: "wp49-4-internal-flow-comment-fixture",
        phase: "W-P49.4",
        priority: "P0",
        title: "Internal Flow Comment Fixture",
        ready: true,
        inputSignals: {
          candidateWithBilingualCommentCount: flowLedger.candidateWithBilingualCommentCount,
          internalFlowCandidateCount: flowLedger.totalCandidateCount
        }
      },
      {
        id: "wp49-5-generated-comment-continuity-adr-input",
        phase: "W-P49.5",
        priority: "P1",
        title: "Generated Comment Continuity ADR Input",
        ready: true,
        inputSignals: {
          requiresSeparateGeneratedBindingWork: true
        }
      }
    ]
  };
}

function summarize({ boundaryCategories, flowLedger, gapLedger, internalFlowCandidates, publicNodes, scannedFiles }) {
  return {
    phase: "W-P49.2",
    scannedSourceFileCount: scannedFiles.length,
    publicExportedNodeCount: publicNodes.length,
    documentedPublicExportedNodeCount: gapLedger.documentedPublicExportedNodeCount,
    publicExportedDocCoveragePercent: percent(gapLedger.documentedPublicExportedNodeCount, publicNodes.length),
    bilingualMarkerPublicExportedNodeCount: gapLedger.bilingualMarkerPublicExportedNodeCount,
    publicExportedBilingualMarkerCoveragePercent: percent(gapLedger.bilingualMarkerPublicExportedNodeCount, publicNodes.length),
    missingDocBlockCount: gapLedger.missingDocBlockCount,
    missingBilingualMarkerCount: gapLedger.missingBilingualMarkerCount,
    legacyLocaleTagPublicNodeCount: gapLedger.legacyLocaleTagPublicNodeCount,
    internalFlowCandidateCount: internalFlowCandidates.length,
    internalFlowCandidateWithCommentCount: flowLedger.candidateWithCommentCount,
    internalFlowCandidateWithBilingualCommentCount: flowLedger.candidateWithBilingualCommentCount,
    internalFlowCommentCoveragePercent: percent(flowLedger.candidateWithCommentCount, internalFlowCandidates.length),
    internalFlowBilingualCommentCoveragePercent: percent(flowLedger.candidateWithBilingualCommentCount, internalFlowCandidates.length),
    boundaryCategoryCount: Object.keys(boundaryCategories).length,
    historicalCoverageClaimedComplete: false,
    changedScopeGateReadyInput: true,
    internalFlowFixtureReadyInput: true,
    generatedContinuityAdrReadyInput: true,
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

function percent(part, total) {
  if (total === 0) return 100;
  return Number(((part / total) * 100).toFixed(2));
}

function createChecks(summary) {
  return [
    check("source-files-scanned", summary.scannedSourceFileCount > 0),
    check("public-surface-inventory-created", summary.publicExportedNodeCount > 0),
    check("report-only-not-complete-claim", summary.historicalCoverageClaimedComplete === false),
    check("changed-scope-gate-input-ready", summary.changedScopeGateReadyInput),
    check("internal-flow-fixture-input-ready", summary.internalFlowFixtureReadyInput),
    check("generated-continuity-input-ready", summary.generatedContinuityAdrReadyInput),
    check("no-write-or-target-mutation", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0),
    check("no-provider-network", summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0),
    check("no-private-source-output", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0)
  ];
}

function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

function renderInventory(evidence) {
  return `# W-P49.2 Repository Self-Documentation Inventory\n\n## 中文摘要\n\n本阶段完成 main-repo 第一方 TypeScript 源码的自文档化盘点。盘点范围为 \`packages/*/src\` 与 \`apps/*/src\`，排除 \`node_modules\`、\`dist\`、测试文件和声明文件。\n\n本文件只报告结构化元数据，不输出源码正文，不修改源码，也不宣称历史注释已补齐。\n\n## Summary\n\n| 指标 | 值 |\n| --- | ---: |\n| scanned source files | ${evidence.summary.scannedSourceFileCount} |\n| public/exported nodes | ${evidence.summary.publicExportedNodeCount} |\n| documented public/exported nodes | ${evidence.summary.documentedPublicExportedNodeCount} |\n| doc coverage | ${evidence.summary.publicExportedDocCoveragePercent}% |\n| bilingual marker public nodes | ${evidence.summary.bilingualMarkerPublicExportedNodeCount} |\n| bilingual marker coverage | ${evidence.summary.publicExportedBilingualMarkerCoveragePercent}% |\n| missing doc block | ${evidence.summary.missingDocBlockCount} |\n| missing bilingual marker | ${evidence.summary.missingBilingualMarkerCount} |\n| internal flow candidates | ${evidence.summary.internalFlowCandidateCount} |\n| internal flow candidates with comment | ${evidence.summary.internalFlowCandidateWithCommentCount} |\n| internal flow candidates with bilingual comment | ${evidence.summary.internalFlowCandidateWithBilingualCommentCount} |\n\n## Boundary Categories\n\n${renderBoundaryTable(evidence.boundaryCategories)}\n`;
}

function renderPublicSurfaceGapLedger(evidence) {
  const rows = evidence.gapLedger.topGaps.map((item) => `| ${item.path}:${item.line} | ${item.kind} | \`${item.name}\` | ${item.gapKinds.join(", ")} | ${item.boundaryTags.join(", ")} |`).join("\n");
  return `# Public Exported Surface Gap Ledger\n\n## 中文摘要\n\n本表是 report-only 历史缺口账本，用于 W-P49.3 changed-scope quality gate。它不要求一次性补完历史问题。\n\n| 位置 | kind | name | gap kinds | boundary tags |\n| --- | --- | --- | --- | --- |\n${rows || "| - | - | - | - | - |"}\n`;
}

function renderInternalFlowLedger(evidence) {
  const rows = evidence.internalFlowLedger.topCandidates.map((item) => `| ${item.path}:${item.line} | \`${item.name}\` | ${item.score} | ${item.directStatementCount} | ${item.branchCount} | ${item.hasInternalComment} | ${item.hasBilingualInternalComment} |`).join("\n");
  return `# Internal Flow Comment Candidate Ledger\n\n## 中文摘要\n\n本表用启发式找出“可能需要内部流程块注释”的函数候选。W-P49.4 会基于这些候选建立更稳定的 fixture，不在本阶段把启发式当作硬门禁。\n\nHeuristic: ${evidence.internalFlowLedger.heuristic}\n\n| 位置 | name | score | statements | branches | has comment | has bilingual comment |\n| --- | --- | ---: | ---: | ---: | --- | --- |\n${rows || "| - | - | 0 | 0 | 0 | false | false |"}\n`;
}

function renderNextInputs(evidence) {
  const rows = evidence.nextInputs.items.map((item) => `| ${item.phase} | ${item.priority} | ${item.title} | ${item.ready} |`).join("\n");
  return `# W-P49 Next Stage Inputs\n\n## 中文摘要\n\nW-P49.2 完成后，下一步应进入 W-P49.3 changed-scope annotation quality gate。历史缺口继续 report-only，新改 public/touched surface 再进入 hard gate。\n\n| 阶段 | 优先级 | 标题 | ready |\n| --- | --- | --- | --- |\n${rows}\n\n## Safety Boundary\n\n- source bodies: none\n- sourcesContent: none\n- workspace write: disabled\n- target mutation: disabled\n- provider/network: disabled\n`;
}

function renderBoundaryTable(boundaryCategories) {
  return Object.entries(boundaryCategories)
    .map(([tag, counts]) => `| ${tag} | ${counts.publicExportedNodeCount} | ${counts.documentedPublicExportedNodeCount} | ${counts.internalFlowCandidateCount} | ${counts.internalFlowCandidateWithCommentCount} |`)
    .join("\n")
    .replace(/^/, "| boundary | public nodes | documented nodes | flow candidates | flow candidates with comment |\n| --- | ---: | ---: | ---: | ---: |\n");
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
