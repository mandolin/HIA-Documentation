import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { waitForNpmPackageVersions } from "./lib/npm-registry.mjs";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const registry = releasePlan.registry ?? "https://registry.npmjs.org/";
const entries = [...(releasePlan.packages ?? [])].sort((left, right) =>
  left.publishOrder - right.publishOrder || left.name.localeCompare(right.name)
);

/**
 * 在全新临时项目中复核首发包的 registry 可见性、tarball 下载、clean install 与 ESM 导入。
 * Revalidates registry visibility, tarball download, clean installation, and ESM imports for the first-publication packages in a fresh temporary project.
 */
async function main() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "hia-public-release-smoke-"));
  const specs = entries.map((entry) => `${entry.name}@${entry.targetVersion}`);

  try {
    await waitForNpmPackageVersions({ registry, entries });
    await runNpm(["init", "-y"], tempDir);
    for (const spec of specs) {
      await runNpm(["pack", spec, `--registry=${registry}`, "--pack-destination", tempDir], tempDir);
    }
    await runNpm(["install", "--ignore-scripts", "--no-audit", "--fund=false", `--registry=${registry}`, ...specs], tempDir);
    await smokeImports(tempDir);
    console.log(`Public release batch smoke passed: ${entries.length} @hia-doc packages clean-install and import from ${registry}.`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function smokeImports(tempDir) {
  const importableNames = [];
  for (const entry of entries) {
    const packageJson = JSON.parse(await readFile(path.join(rootDir, entry.path, "package.json"), "utf8"));
    if (packageJson.exports || packageJson.main || packageJson.module) {
      importableNames.push(entry.name);
    }
  }

  const smokePath = path.join(tempDir, "import-smoke.mjs");
  await writeFile(
    smokePath,
    `${importableNames.map((packageName) => `await import(${JSON.stringify(packageName)});`).join("\n")}\nconsole.log("public imports ok");\n`,
    "utf8"
  );
  await run(process.execPath, [smokePath], tempDir);
}

async function runNpm(args, cwd) {
  const npmCli = process.env.npm_execpath;
  if (npmCli && !/\.(?:cmd|bat|exe)$/i.test(npmCli)) {
    return run(process.execPath, [npmCli, ...args], cwd);
  }
  return run(npmCli || "npm", args, cwd);
}

async function run(command, commandArgs, cwd) {
  console.log(`> ${command} ${commandArgs.join(" ")}`);
  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd,
      shell: process.platform === "win32" && command === "npm",
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
    throw new Error(`${command} ${commandArgs.join(" ")} failed: ${String(error.stderr ?? error.message).trim()}`);
  }
}

assert(entries.length === 13, "The first-publication batch smoke expects the approved 13-package release train.");
await main();
