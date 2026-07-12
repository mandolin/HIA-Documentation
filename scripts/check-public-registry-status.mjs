import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releasePlan = JSON.parse(await readFile(path.join(rootDir, "release/public-packages.json"), "utf8"));
const args = new Set(process.argv.slice(2));
const prepublish = args.has("--prepublish");
const jsonOutput = args.has("--json");
const npmBin = "npm";
const registry = releasePlan.registry ?? "https://registry.npmjs.org/";
const scopeName = String(releasePlan.scope ?? "").replace(/^@/, "");
const packages = releasePlan.packages ?? [];

const auth = await checkWhoami();
const org = auth.status === "authenticated" ? await checkOrg() : createSkippedOrgStatus();
const packageStatuses = [];

for (const entry of packages) {
  packageStatuses.push(await checkPackageVersion(entry));
}

const summary = {
  contract: "hia-public-registry-status",
  contractVersion: "0.1.0-draft",
  registry,
  scope: releasePlan.scope,
  auth,
  org,
  packages: packageStatuses,
  counts: {
    total: packageStatuses.length,
    published: packageStatuses.filter((item) => item.status === "published").length,
    unpublished: packageStatuses.filter((item) => item.status === "unpublished").length,
    errors: packageStatuses.filter((item) => item.status === "error").length
  }
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printHumanSummary(summary);
}

const failures = [];

if (summary.counts.errors > 0) {
  failures.push("one or more npm registry package checks failed unexpectedly");
}

if (prepublish) {
  if (auth.status !== "authenticated") {
    failures.push("npm auth is required for --prepublish");
  }
  if (org.status !== "accessible") {
    failures.push("npm organization/scope membership check is required for --prepublish");
  }
  if (summary.counts.published > 0) {
    failures.push("target versions must be unpublished before first-publication preflight");
  }
}

if (failures.length > 0) {
  throw new Error(`Public registry status check failed: ${failures.join("; ")}.`);
}

async function checkWhoami() {
  const result = await npm(["whoami", `--registry=${registry}`]);
  if (result.ok) {
    return {
      status: "authenticated",
      username: result.stdout.trim()
    };
  }

  if (isAuthError(result.stderr)) {
    return {
      status: "unauthenticated",
      reason: "npm whoami returned E401"
    };
  }

  return {
    status: "error",
    reason: trimError(result.stderr)
  };
}

async function checkOrg() {
  const result = await npm(["org", "ls", scopeName, `--registry=${registry}`]);
  if (result.ok) {
    return {
      status: "accessible",
      memberCountHint: countNonEmptyLines(result.stdout)
    };
  }

  if (isAuthError(result.stderr)) {
    return {
      status: "unauthorized",
      reason: "npm org ls returned E401"
    };
  }

  if (isNotFoundError(result.stderr)) {
    return {
      status: "not-found",
      reason: `npm organization ${scopeName} was not found or is not visible to this account`
    };
  }

  return {
    status: "error",
    reason: trimError(result.stderr)
  };
}

function createSkippedOrgStatus() {
  return {
    status: "skipped",
    reason: "npm auth is unavailable"
  };
}

async function checkPackageVersion(entry) {
  const spec = `${entry.name}@${entry.targetVersion}`;
  const result = await npm(["view", spec, "version", `--registry=${registry}`]);

  if (result.ok) {
    return {
      name: entry.name,
      targetVersion: entry.targetVersion,
      publishOrder: entry.publishOrder,
      status: "published",
      registryVersion: result.stdout.trim()
    };
  }

  if (isNotFoundError(result.stderr)) {
    return {
      name: entry.name,
      targetVersion: entry.targetVersion,
      publishOrder: entry.publishOrder,
      status: "unpublished"
    };
  }

  return {
    name: entry.name,
    targetVersion: entry.targetVersion,
    publishOrder: entry.publishOrder,
    status: "error",
    reason: trimError(result.stderr)
  };
}

async function npm(commandArgs) {
  try {
    const { stdout, stderr } = await execFileAsync(npmBin, commandArgs, {
      cwd: rootDir,
      shell: process.platform === "win32",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10
    });
    return { ok: true, stdout, stderr };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message
    };
  }
}

function printHumanSummary(status) {
  console.log(`Public registry status for ${status.scope} at ${status.registry}`);
  console.log(`npm auth: ${status.auth.status}${status.auth.username ? ` (${status.auth.username})` : ""}`);
  console.log(`npm org: ${status.org.status}${status.org.reason ? ` (${status.org.reason})` : ""}`);
  console.log(`packages: ${status.counts.unpublished} unpublished, ${status.counts.published} published, ${status.counts.errors} errors`);

  for (const item of status.packages) {
    const detail = item.status === "published"
      ? `registry=${item.registryVersion}`
      : item.reason ?? "";
    console.log(`- ${item.name}@${item.targetVersion}: ${item.status}${detail ? ` (${detail})` : ""}`);
  }

  if (prepublish && status.auth.status !== "authenticated") {
    console.log("prepublish: blocked until npm login/org ownership is available.");
  }
}

function isAuthError(stderr) {
  return /\bE401\b|Unable to authenticate|Unauthorized/i.test(stderr);
}

function isNotFoundError(stderr) {
  return /\bE404\b|404 Not Found|is not in this registry|Not found/i.test(stderr);
}

function trimError(stderr) {
  return stderr.trim().split(/\r?\n/).slice(0, 4).join(" ");
}

function countNonEmptyLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}
