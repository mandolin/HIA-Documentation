import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(rootDir, "fixtures", "source-linkage-host");
const outputRoot = path.join(rootDir, "dist", "vscode-project-relations-runtime-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const projectIndexPath = path.join(fixtureRoot, "temp", "docs", "project-index.json");
const previewPath = path.join(fixtureRoot, "temp", "docs", "index.html");
const cliPath = path.join(rootDir, "apps", "cli", "dist", "index.js");
const extensionPath = path.join(rootDir, "apps", "vscode-extension");
const lspProjectRelationsPath = path.join(rootDir, "packages", "lsp", "dist", "project-relations.js");
const vscodeProjectRelationsPath = path.join(rootDir, "apps", "vscode-extension", "dist", "project-relations.js");

await main();

/**
 * 准备 VS Code project-relations 可见运行态证据所需的 fixture、关系图和启动命令。
 * Prepares the fixture, relation graph, and launch command needed for visible VS Code project-relations runtime evidence.
 */
async function main() {
  assertFile(cliPath, "Build main-repo before preparing VS Code project-relations runtime evidence.");
  assertFile(lspProjectRelationsPath, "Build @hia-doc/lsp before preparing VS Code project-relations runtime evidence.");
  assertFile(vscodeProjectRelationsPath, "Build @hia-doc/vscode-extension before preparing VS Code project-relations runtime evidence.");

  await mkdir(outputRoot, { recursive: true });
  const codeVersion = getCodeVersion();

  runNode([
    cliPath,
    "docs",
    "build",
    "--config",
    path.relative(rootDir, path.join(fixtureRoot, "hia.config.json")),
    "--out",
    path.relative(rootDir, path.join(fixtureRoot, "temp", "docs"))
  ], rootDir);

  assertFile(projectIndexPath, "The fixture project navigation index was not generated.");
  assertFile(previewPath, "The fixture documentation preview was not generated.");

  const { createHiaProjectRelationGraphResult } = await import(pathToFileURL(lspProjectRelationsPath).href);
  const {
    createHiaProjectRelationActionChoices,
    createHiaProjectRelationChoices,
    createHiaProjectRelationRuntimeReport
  } = require(vscodeProjectRelationsPath);
  const projectIndex = JSON.parse(await readFile(projectIndexPath, "utf8"));
  const graph = createHiaProjectRelationGraphResult({
    projectIndex,
    uri: pathToFileURL(projectIndexPath).href
  });

  if (graph.status !== "available" || graph.relationCount === 0) {
    throw new Error(`Expected an available project relation graph. Received ${graph.status}: ${graph.unavailableReason ?? "empty-graph"}.`);
  }

  const choices = createHiaProjectRelationChoices(graph);
  const sourceChoice = choices.find((choice) => choice.relation.kind === "documents-source");
  const artifactChoice = choices.find((choice) => choice.relation.kind === "documents-generated-artifact");

  if (!sourceChoice || !artifactChoice) {
    throw new Error("Expected both documents-source and documents-generated-artifact relation choices.");
  }

  const sourceTarget = createHiaProjectRelationActionChoices(sourceChoice).find((choice) => choice.actionKind === "target");
  const artifactTarget = createHiaProjectRelationActionChoices(artifactChoice).find((choice) => choice.actionKind === "target");

  if (!sourceTarget || !artifactTarget) {
    throw new Error("Expected source and generated artifact navigation actions.");
  }

  const launchCommand = [
    "code",
    "--new-window",
    "--user-data-dir",
    path.join(outputRoot, "user-data"),
    "--extensions-dir",
    path.join(outputRoot, "extensions"),
    "--extensionDevelopmentPath",
    extensionPath,
    fixtureRoot
  ];
  const runtimeReport = createHiaProjectRelationRuntimeReport(graph);
  const evidence = {
    contract: "hia-vscode-project-relations-runtime-evidence",
    contractVersion: "0.1.0-draft",
    status: "prepared-manual-confirmation-required",
    createdAt: new Date().toISOString(),
    vscode: {
      cli: "code",
      status: codeVersion ? "available" : "unavailable",
      version: codeVersion
    },
    fixture: {
      workspaceRoot: normalizePath(fixtureRoot),
      projectIndex: normalizePath(projectIndexPath),
      documentationPreview: normalizePath(previewPath)
    },
    projectRelations: {
      status: graph.status,
      contract: graph.contract,
      contractVersion: graph.contractVersion,
      relationCount: graph.relationCount,
      nodeCount: graph.nodeCount,
      pickerChoiceCount: choices.length,
      runtimeReport,
      selectedRelations: [
        createSelectedRelationEvidence(sourceChoice, sourceTarget),
        createSelectedRelationEvidence(artifactChoice, artifactTarget)
      ]
    },
    launch: {
      command: launchCommand.map(quoteShellArgument).join(" "),
      cwd: normalizePath(rootDir)
    },
    manualChecks: [
      "Open temp/docs/project-index.json in the Extension Development Host.",
      "Run HIA: Open Project Relations.",
      "Confirm the HIA output channel prints the project relation runtime report lines from this evidence file.",
      `Select ${sourceChoice.label}, then choose ${sourceTarget.label}.`,
      "Confirm the source editor selection starts at line 2, column 1.",
      `Run the command again, select ${artifactChoice.label}, then choose ${artifactTarget.label}.`,
      "Run the command again and choose Open documentation preview.",
      "Run the command again and choose Copy project relation id or Copy documentation entry id.",
      "Confirm no action opens a target outside the fixture workspace."
    ]
  };

  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`VS Code project-relations runtime evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
  console.log(`Launch command: ${evidence.launch.command}`);
}

function createSelectedRelationEvidence(choice, target) {
  return {
    id: choice.relation.id,
    kind: choice.relation.kind,
    label: choice.label,
    from: choice.fromNode?.label ?? choice.relation.from,
    to: choice.toNode?.label ?? choice.relation.to,
    action: {
      label: target.label,
      path: target.target.path,
      position: target.target.position,
      targetKind: target.target.node.kind
    }
  };
}

function getCodeVersion() {
  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "code --version"], { encoding: "utf8" })
    : spawnSync("code", ["--version"], { encoding: "utf8" });

  if (result.error || result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim().split(/\r?\n/u);
}

function runNode(args, cwd) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.error || result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(" ")}: ${result.error?.message ?? `exit ${result.status}`}`);
  }
}

function assertFile(filePath, message) {
  if (!existsSync(filePath)) {
    throw new Error(`${message} Missing path: ${filePath}`);
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function quoteShellArgument(value) {
  if (/^[A-Za-z0-9_./:=\\-]+$/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\"", "\\\"")}"`;
}
