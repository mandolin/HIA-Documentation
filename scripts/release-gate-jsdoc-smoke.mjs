import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "dist", "release-gate-jsdoc-real");
const fixturePath = path.join(root, "fixtures", "jsdoc-integration.real-basic.json");
const cliEntry = path.join(root, "apps", "cli", "dist", "index.js");

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(" ")}`);
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listFiles(directory) {
  const result = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }

  return result;
}

function assertNoLeak(label, text) {
  const checks = [
    [/[^A-Za-z][A-Za-z]:[\\/]/, "Windows absolute path"],
    [/^([A-Za-z]:[\\/])/, "Windows absolute path"],
    [/\\\\[^\\]/, "UNC path"],
    [/\/Users\//, "macOS user path"],
    [/\/private\//, "private absolute path"],
    [/\bfilePath\b/, "adapter-private filePath"],
    [/\bcurrentPage\b/, "legacy source openMode"],
    [/package:undefined/, "synthetic package node"]
  ];

  for (const [pattern, description] of checks) {
    if (pattern.test(text)) {
      throw new Error(`${label} contains ${description}.`);
    }
  }
}

fs.rmSync(outputDir, {
  recursive: true,
  force: true
});

runNode([
  cliEntry,
  "docs",
  "build",
  "--jsdoc-integration",
  "fixtures/jsdoc-integration.real-basic.json",
  "--out",
  "dist/release-gate-jsdoc-real",
  "--locale",
  "zh-CN"
]);

const requiredFiles = [
  "index.html",
  "hia-manifest.json",
  "assets/hia-default.css",
  "assets/hia-default.js"
];

for (const relativePath of requiredFiles) {
  const filePath = path.join(outputDir, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing release gate output: ${relativePath}`);
  }
}

const fixtureText = readText(fixturePath);
const indexHtml = readText(path.join(outputDir, "index.html"));
const manifest = JSON.parse(readText(path.join(outputDir, "hia-manifest.json")));

assertNoLeak("JSDoc integration real fixture", fixtureText);
for (const filePath of listFiles(outputDir)) {
  assertNoLeak(path.relative(root, filePath), readText(filePath));
}

if (!indexHtml.includes("问候一个用户。") || !indexHtml.includes("标准化用户名称。")) {
  throw new Error("Release gate HTML does not contain expected localized JSDoc content.");
}

if (manifest.documentId !== "jsdoc.integration") {
  throw new Error(`Unexpected manifest documentId: ${manifest.documentId}`);
}

console.log("JSDoc integration release gate smoke passed.");
