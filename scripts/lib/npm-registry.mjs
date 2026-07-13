/**
 * Reads one exact package version from npm's public metadata endpoint.
 * 从 npm 公共 metadata endpoint 读取一个精确包版本；缓存规避参数防止首发后的负缓存误判。
 */
export async function readNpmPackageVersion({ registry, name, targetVersion }) {
  const metadataUrl = new URL(encodeURIComponent(name), registry);
  metadataUrl.searchParams.set("hia_registry_probe", String(Date.now()));

  let response;
  try {
    response = await fetch(metadataUrl, {
      headers: { accept: "application/vnd.npm.install-v1+json" },
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    return { status: "error", reason: `registry request failed: ${error.message}` };
  }

  if (response.status === 404) {
    return { status: "unpublished" };
  }

  if (!response.ok) {
    return { status: "error", reason: `registry returned HTTP ${response.status}` };
  }

  try {
    const metadata = await response.json();
    const registryVersion = metadata?.versions?.[targetVersion]?.version;
    return registryVersion === targetVersion
      ? { status: "published", registryVersion }
      : { status: "unpublished" };
  } catch (error) {
    return { status: "error", reason: `registry metadata was not readable: ${error.message}` };
  }
}

/**
 * Verifies that npm's public metadata endpoint exposes an exact package version.
 * 验证 npm 公共 metadata endpoint 已暴露一个精确包版本。
 */
export async function assertNpmPackageVersion(options) {
  const result = await readNpmPackageVersion(options);
  if (result.status !== "published") {
    const suffix = result.reason ? ` (${result.reason})` : "";
    throw new Error(`${options.name}@${options.targetVersion}: package is not publicly visible from ${options.registry}.${suffix}`);
  }
  return result;
}

/**
 * Waits for every exact version in a release batch to become publicly observable together.
 * 等待发布批次中的全部精确版本一起进入公共可观测状态，避免逐包等待把正常的 registry 传播延迟放大为失败。
 */
export async function waitForNpmPackageVersions({ registry, entries, attempts = 60, delayMs = 10_000 }) {
  let latestResults = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    latestResults = await Promise.all(
      entries.map(async (entry) => ({ entry, ...(await readNpmPackageVersion({ registry, ...entry })) }))
    );
    const unavailable = latestResults.filter((result) => result.status !== "published");

    if (unavailable.length === 0) {
      return latestResults;
    }

    if (attempt < attempts) {
      console.log(
        `Waiting for npm registry visibility: ${unavailable.length}/${entries.length} target version(s) remain unavailable (${attempt}/${attempts}).`
      );
      await sleep(delayMs);
    }
  }

  const unavailable = latestResults
    .filter((result) => result.status !== "published")
    .map((result) => `${result.entry.name}@${result.entry.targetVersion}${result.reason ? ` (${result.reason})` : ""}`);
  throw new Error(`Timed out waiting for npm registry visibility: ${unavailable.join(", ")}.`);
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
