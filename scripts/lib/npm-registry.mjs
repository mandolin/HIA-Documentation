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
