import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertNpmPackageVersion } from "./lib/npm-registry.mjs";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const registry = releasePlan.registry ?? "https://registry.npmjs.org/";
const entries = [...(releasePlan.packages ?? [])].sort((left, right) =>
  left.publishOrder - right.publishOrder || left.name.localeCompare(right.name)
);
const trustCommandPrefix = ["--yes", "npm@11.18.0", "trust", "github"];

/**
 * 为已经公开的首发包批量建立 GitHub Actions OIDC Trusted Publishing；执行态保留给完成 2FA 的维护者。
 * Configures GitHub Actions OIDC Trusted Publishing in bulk for already-public first-release packages; execution remains with a maintainer who completes 2FA.
 */
async function main() {
  assert(entries.length === 13, "The first Trusted Publishing setup expects the approved 13-package release train.");
  await Promise.all(entries.map(assertPublished));

  if (!execute) {
    console.log("Trusted Publisher preflight passed. Run with --execute from a mise-managed Node environment after npm login and account-level 2FA are ready.");
    for (const entry of entries) {
      console.log(formatCommand(entry));
    }
    return;
  }

  for (const [index, entry] of entries.entries()) {
    await run("npx", [...trustCommandPrefix, entry.name, "--file", "npm-trusted-publish.yml", "--repo", "mandolin/HIA-Documentation", "--allow-publish", "--yes", `--registry=${registry}`]);
    if (index < entries.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`Trusted Publisher configuration succeeded for ${entries.length} @hia-doc packages.`);
}

async function assertPublished(entry) {
  await assertNpmPackageVersion({ registry, ...entry });
}

function formatCommand(entry) {
  return `npx ${[...trustCommandPrefix, entry.name, "--file", "npm-trusted-publish.yml", "--repo", "mandolin/HIA-Documentation", "--allow-publish", "--yes", `--registry=${registry}`].join(" ")}`;
}

async function run(command, commandArgs, options = {}) {
  console.log(`> ${command} ${commandArgs.join(" ")}`);
  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd: rootDir,
      shell: process.platform === "win32" && /^(?:npm|npx)$/.test(command),
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10
    });
    if (stdout.trim()) {
      console.log(stdout.trim());
    }
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    return { ok: true, stdout, stderr };
  } catch (error) {
    const result = {
      ok: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message
    };
    if (options.allowFailure) {
      return result;
    }
    throw new Error(`${command} ${commandArgs.join(" ")} failed: ${String(result.stderr).trim()}`);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

await main();
