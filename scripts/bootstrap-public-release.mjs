import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readNpmPackageVersion } from "./lib/npm-registry.mjs";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const execute = args.has("--publish");
const resume = args.has("--resume");
const registry = releasePlan.registry ?? "https://registry.npmjs.org/";
const registryVisibilityAttempts = 20;
const registryVisibilityDelayMs = 3_000;
const entries = [...(releasePlan.packages ?? [])].sort((left, right) =>
  left.publishOrder - right.publishOrder || left.name.localeCompare(right.name)
);

/**
 * 受控首发器只处理 release/public-packages.json 列出的包，并在触碰 registry 前复核版本、可见性与已有发布状态。
 * The controlled bootstrapper only handles packages listed in release/public-packages.json and validates versions, visibility, and registry state before it contacts the registry.
 */
async function main() {
  assert(entries.length > 0, "The public release plan must list at least one package.");
  await Promise.all(entries.map(assertPublishReadyManifest));

  const registryStates = await Promise.all(entries.map(readRegistryState));
  const alreadyPublished = registryStates.filter((state) => state.status === "published");
  const pending = registryStates.filter((state) => state.status === "unpublished");

  for (const state of registryStates) {
    assert(state.status !== "error", `${state.entry.name}: registry preflight failed: ${state.reason}`);
  }

  if (alreadyPublished.length > 0 && !resume) {
    throw new Error(
      `Refusing to continue because ${alreadyPublished.length} target version(s) already exist. Re-run only after review with --resume: ${alreadyPublished.map((state) => state.entry.name).join(", ")}`
    );
  }

  if (!execute) {
    printPlan(pending, alreadyPublished);
    return;
  }

  assert(process.env.NODE_AUTH_TOKEN, "NODE_AUTH_TOKEN is required only for --publish.");
  assert(pending.length > 0, "No unpublished target versions remain in this release batch.");

  const packRoot = await mkdtemp(path.join(os.tmpdir(), "hia-npm-bootstrap-"));
  try {
    for (const state of pending) {
      const tarball = await packPackage(state.entry, packRoot);
      await run("npm", ["publish", tarball, "--access", "public", "--provenance", `--registry=${registry}`], rootDir);
      const publishedState = await waitForRegistryVisibility(state.entry);
      assert(
        publishedState.status === "published",
        `${state.entry.name}: publish command finished but ${state.entry.targetVersion} is not visible from the registry.`
      );
    }
  } finally {
    await rm(packRoot, { recursive: true, force: true });
  }

  console.log(`Bootstrap publish succeeded: ${pending.length} package(s) are now public at their approved target versions.`);
}

async function assertPublishReadyManifest(entry) {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, entry.path, "package.json"), "utf8"));
  assert(packageJson.name === entry.name, `${entry.path}: package name does not match the release plan.`);
  assert(packageJson.version === entry.targetVersion, `${entry.name}: package version must equal ${entry.targetVersion}.`);
  assert(packageJson.private !== true, `${entry.name}: package must not remain private.`);
  assert(packageJson.publishConfig?.access === "public", `${entry.name}: publishConfig.access must explicitly be public.`);
}

async function readRegistryState(entry) {
  const result = await readNpmPackageVersion({ registry, ...entry });
  return { entry, ...result };
}

/**
 * npm publish can succeed before the public registry's read path observes the new version.
 * npm publish 成功后，公共 registry 的读取路径可能暂时还看不到新版本；此处以有界轮询避免把传播延迟误判为发布失败。
 */
async function waitForRegistryVisibility(entry) {
  let latestState;

  for (let attempt = 1; attempt <= registryVisibilityAttempts; attempt += 1) {
    latestState = await readRegistryState(entry);
    if (latestState.status === "published") {
      return latestState;
    }

    if (latestState.status === "error") {
      return latestState;
    }

    if (attempt < registryVisibilityAttempts) {
      console.log(
        `${entry.name}@${entry.targetVersion}: waiting for npm registry visibility (${attempt}/${registryVisibilityAttempts}).`
      );
      await sleep(registryVisibilityDelayMs);
    }
  }

  return latestState;
}

async function packPackage(entry, packRoot) {
  const packageDirectory = path.join(packRoot, entry.name.replaceAll("@", "").replaceAll("/", "-"));
  await run("pnpm", ["--filter", entry.name, "pack", "--pack-destination", packageDirectory], rootDir);
  const tarballs = (await readdir(packageDirectory))
    .filter((fileName) => fileName.endsWith(".tgz"))
    .map((fileName) => path.join(packageDirectory, fileName));

  assert(tarballs.length === 1, `${entry.name}: expected exactly one packed tarball, received ${tarballs.length}.`);
  return tarballs[0];
}

async function run(command, commandArgs, cwd, options = {}) {
  console.log(`> ${command} ${commandArgs.join(" ")}`);
  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd,
      shell: process.platform === "win32" && /^(?:npm|pnpm)$/.test(command),
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
    throw new Error(`${command} ${commandArgs.join(" ")} failed: ${trimError(result.stderr || result.stdout)}`);
  }
}

function printPlan(pending, alreadyPublished) {
  console.log(`Bootstrap preflight passed: ${pending.length} unpublished, ${alreadyPublished.length} already published.`);
  console.log("Use --publish only from the approved GitHub Actions bootstrap workflow after setting its temporary secret.");
  for (const state of pending) {
    console.log(`- publish ${state.entry.name}@${state.entry.targetVersion} (order ${state.entry.publishOrder})`);
  }
}

function trimError(value) {
  return String(value).trim().split(/\r?\n/).slice(0, 4).join(" ");
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

await main();
