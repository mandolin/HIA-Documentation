import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const [packageName, ...flags] = process.argv.slice(2);
const publishReady = flags.includes("--publish-ready");
const githubOutput = flags.includes("--github-output");

if (!packageName) {
  throw new Error("Usage: node scripts/resolve-public-release-package.mjs <package-name> [--publish-ready] [--github-output]");
}

const entry = releasePlan.packages.find((candidate) => candidate.name === packageName);
assert(entry, `${packageName}: package is not listed in release/public-packages.json.`);

const packageJsonPath = path.join(rootDir, entry.path, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
assert(packageJson.name === entry.name, `${entry.path}: package name does not match release plan.`);
assert(packageJson.license === "MIT", `${entry.name}: package license must be MIT.`);
assert(packageJson.engines?.node === releasePlan.runtimeNodeRange, `${entry.name}: package engine drifted.`);

// 中英说明：默认只解析候选包；真正发布时额外要求 package.json 已完成版本翻转并解除 private。
// EN: Normal mode only resolves a candidate package; publish mode also requires the explicit version/private flip.
if (publishReady) {
  assert(packageJson.private !== true, `${entry.name}: package is still private; publication must be explicitly approved first.`);
  assert(packageJson.version === entry.targetVersion, `${entry.name}: package version must equal target ${entry.targetVersion}.`);
}

const outputs = {
  package_name: entry.name,
  package_path: entry.path,
  target_version: entry.targetVersion,
  publish_order: String(entry.publishOrder)
};

if (githubOutput) {
  const outputFile = process.env.GITHUB_OUTPUT;
  assert(outputFile, "GITHUB_OUTPUT is not available.");
  await import("node:fs/promises").then(({ appendFile }) =>
    appendFile(outputFile, `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, "utf8")
  );
} else {
  console.log(JSON.stringify(outputs, null, 2));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
