import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const npmBin = "npm";
const nodeBin = process.execPath;
const registry = readFlag("--registry") ?? releasePlan.registry ?? "https://registry.npmjs.org/";
const versionOverride = readFlag("--version");
const skipImport = process.argv.includes("--skip-import");
const packageName = readPositionalPackageName();

if (!packageName) {
  throw new Error("Usage: node scripts/post-publish-smoke.mjs <package-name> [--version <version>] [--registry <url>] [--skip-import]");
}

const entry = releasePlan.packages.find((candidate) => candidate.name === packageName);
if (!entry) {
  throw new Error(`${packageName}: package is not listed in release/public-packages.json.`);
}

const version = versionOverride ?? entry.targetVersion;
const spec = `${packageName}@${version}`;
const packageJson = JSON.parse(await readFile(path.join(rootDir, entry.path, "package.json"), "utf8"));
const tempDir = await mkdtemp(path.join(os.tmpdir(), "hia-post-publish-"));

try {
  await run(npmBin, ["view", spec, "version", `--registry=${registry}`], rootDir);
  await run(npmBin, ["pack", spec, `--registry=${registry}`, "--pack-destination", tempDir], rootDir);
  await run(npmBin, ["init", "-y"], tempDir);
  await run(npmBin, ["install", spec, `--registry=${registry}`], tempDir);

  // 中英说明：只有包声明可导入入口时才做 import smoke，CLI-only 包可用 --skip-import 跳过。
  // EN: Run import smoke only for packages with an importable entry; CLI-only packages can pass --skip-import.
  if (!skipImport && hasImportableEntry(packageJson)) {
    const smokeFile = path.join(tempDir, "smoke.mjs");
    await writeFile(smokeFile, `await import(${JSON.stringify(packageName)});\nconsole.log("import ok");\n`, "utf8");
    await run(nodeBin, [smokeFile], tempDir);
  }

  console.log(`Post-publish smoke passed for ${spec}.`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function run(command, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      shell: process.platform === "win32" && command === npmBin,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10
    });
    if (stdout.trim()) {
      console.log(stdout.trim());
    }
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  } catch (error) {
    if (error.stdout?.trim()) {
      console.log(error.stdout.trim());
    }
    if (error.stderr?.trim()) {
      console.error(error.stderr.trim());
    }
    throw error;
  }
}

function hasImportableEntry(packageJson) {
  return Boolean(packageJson.exports || packageJson.main || packageJson.module);
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function readPositionalPackageName() {
  const positional = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (value === "--version" || value === "--registry") {
      index += 1;
      continue;
    }
    if (value === "--skip-import") {
      continue;
    }
    if (!value.startsWith("--")) {
      positional.push(value);
    }
  }
  return positional[0];
}
