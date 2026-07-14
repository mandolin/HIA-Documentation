import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(rootDir, "fixtures", "source-linkage-host");
const outputRoot = path.join(rootDir, "dist", "vscode-source-linkage-runtime-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const docMapPath = path.join(fixtureRoot, "docs", "profile-card.docmap.json");
const sourcePath = path.join(fixtureRoot, "src", "profile-card.html");
const artifactPath = path.join(fixtureRoot, "build", "profile-card.html");
const previewPath = path.join(fixtureRoot, "temp", "docs", "index.html");
const cliPath = path.join(rootDir, "apps", "cli", "dist", "index.js");
const extensionPath = path.join(rootDir, "apps", "vscode-extension");

await main();

/**
 * 准备 VS Code source-linkage 手工 runtime evidence 所需的 fixture、索引和启动命令。
 * Prepares the fixture, index, and launch command needed for manual VS Code source-linkage runtime evidence.
 */
async function main() {
  assertFile(cliPath, "Build main-repo before preparing VS Code runtime evidence.");
  assertFile(docMapPath, "The source-linkage host doc-source-map fixture is missing.");
  assertFile(sourcePath, "The source-linkage original source fixture is missing.");
  assertFile(artifactPath, "The source-linkage generated artifact fixture is missing.");

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

  assertFile(previewPath, "The fixture documentation preview was not generated.");

  const docMap = JSON.parse(await readFile(docMapPath, "utf8"));
  const index = createDocSourceMapIndex(docMap, {
    path: path.relative(rootDir, docMapPath).replaceAll("\\", "/")
  });
  const entry = index.entries.find((candidate) => candidate.symbolId === "html:component:profile-card");

  if (!entry) {
    throw new Error("Expected source-linkage entry html:component:profile-card was not found.");
  }

  const original = entry.sourceLinks.find((link) => link.path === "src/profile-card.html");
  const generated = entry.artifactLinks.find((link) => link.path === "build/profile-card.html");

  if (!original || !generated) {
    throw new Error("Expected original and generated navigation targets were not found.");
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
  const evidence = {
    contract: "hia-vscode-source-linkage-runtime-evidence",
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
      docSourceMap: normalizePath(docMapPath),
      originalSource: normalizePath(sourcePath),
      generatedArtifact: normalizePath(artifactPath),
      documentationPreview: normalizePath(previewPath)
    },
    sourceLinkage: {
      status: index.status,
      entryCount: index.entryCount,
      linkedEntryCount: index.linkedEntryCount,
      sourceCount: index.sourceCount,
      artifactCount: index.artifactCount,
      sourcesContentPolicy: index.sourcesContentPolicy,
      selectedEntry: {
        id: entry.id,
        symbolId: entry.symbolId,
        symbolKind: entry.symbolKind,
        originalSource: {
          path: original.path,
          range: original.range
        },
        generatedArtifact: {
          path: generated.path,
          selector: generated.selector
        }
      }
    },
    launch: {
      command: launchCommand.map(quoteShellArgument).join(" "),
      cwd: normalizePath(rootDir)
    },
    manualChecks: [
      "Open docs/profile-card.docmap.json in the Extension Development Host.",
      "Run HIA: Open Source Linkage.",
      "Select html:component:profile-card.",
      "Choose Open original source: src/profile-card.html and confirm the editor selection starts at line 2, column 1.",
      "Run the command again and choose Open generated artifact: build/profile-card.html.",
      "Run the command again and choose Open documentation preview.",
      "Confirm the HIA output channel records workspace-relative source/generated paths."
    ]
  };

  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`VS Code source-linkage runtime evidence prepared at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
  console.log(`Launch command: ${evidence.launch.command}`);
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
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function quoteShellArgument(value) {
  if (/^[A-Za-z0-9_./:=\\-]+$/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\"", "\\\"")}"`;
}
