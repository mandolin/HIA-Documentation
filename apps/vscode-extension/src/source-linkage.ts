import path from "node:path";

/**
 * doc-source-map 中的 1-based source range position。
 * A 1-based source range position carried by a doc-source-map manifest.
 */
export interface HiaSourceLinkagePosition {
  column?: number;
  line: number;
}

/**
 * doc-source-map source link 的宿主所需投影。
 * The host-facing projection of a doc-source-map source link.
 */
export interface HiaSourceLinkageSourceLink {
  path?: string;
  range?: {
    start: HiaSourceLinkagePosition;
  };
}

/**
 * doc-source-map artifact link 的宿主所需投影。
 * The host-facing projection of a doc-source-map artifact link.
 */
export interface HiaSourceLinkageArtifactLink {
  path?: string;
  selector?: string;
}

/**
 * LSP 返回的单个 documentation linkage entry。
 * A single documentation linkage entry returned by the LSP.
 */
export interface HiaSourceLinkageEntry {
  artifactLinks?: HiaSourceLinkageArtifactLink[];
  id: string;
  kind?: string;
  sourceLinks?: HiaSourceLinkageSourceLink[];
  symbolId?: string;
  symbolKind?: string;
}

/**
 * `hia/documentSourceMapIndex` 的 VS Code 端消费形状。
 * The VS Code consumer shape for `hia/documentSourceMapIndex`.
 */
export interface HiaDocumentSourceMapIndexSummary {
  entries?: HiaSourceLinkageEntry[];
  matchedEntryCount?: number;
  status?: string;
  uri?: string;
}

/**
 * 供 VS Code entry picker 使用的稳定 summary。
 * A stable summary used by the VS Code entry picker.
 */
export interface HiaSourceLinkageEntryChoice {
  description: string;
  detail: string;
  entry: HiaSourceLinkageEntry;
  label: string;
}

/**
 * 可打开的 original-source 或 generated-artifact target。
 * An openable original-source or generated-artifact target.
 */
export interface HiaSourceLinkageNavigationTarget {
  kind: "generated-artifact" | "original-source";
  label: string;
  path: string;
  position?: HiaSourceLinkagePosition;
  selector?: string;
}

/**
 * Host path validation 的成功或拒绝结果。
 * The accepted or rejected result of host path validation.
 */
export interface HiaSourceLinkagePathResolution {
  path?: string;
  reason?: "target-path-empty" | "target-path-unsafe";
}

/**
 * 为 LSP 返回的 entries 创建可读、稳定的选择项。
 * Create readable, stable picker choices for entries returned by the LSP.
 */
export function createHiaSourceLinkageEntryChoices(index: HiaDocumentSourceMapIndexSummary): HiaSourceLinkageEntryChoice[] {
  return (index.entries ?? []).map((entry) => {
    const sourcePath = entry.sourceLinks?.find((link) => link.path)?.path;
    const artifactPath = entry.artifactLinks?.find((link) => link.path)?.path;
    const label = entry.symbolId ?? entry.id;
    const description = [sourcePath, artifactPath].filter(isNonEmptyString).join(" -> ") || "No openable path";
    const detail = [entry.symbolKind ?? entry.kind, `entry ${entry.id}`].filter(isNonEmptyString).join(" | ");

    return {
      description,
      detail,
      entry,
      label
    };
  });
}

/**
 * 从 entry 提取所有可导航的原始源码与生成物 target。
 * Extract every navigable original-source and generated-artifact target from an entry.
 */
export function createHiaSourceLinkageNavigationTargets(entry: HiaSourceLinkageEntry): HiaSourceLinkageNavigationTarget[] {
  const targets: HiaSourceLinkageNavigationTarget[] = [];
  const seen = new Set<string>();

  for (const source of entry.sourceLinks ?? []) {
    if (!source.path) {
      continue;
    }

    pushNavigationTarget(targets, seen, {
      kind: "original-source",
      label: `Open original source: ${source.path}`,
      path: source.path,
      ...(source.range?.start ? { position: source.range.start } : {})
    });
  }

  for (const artifact of entry.artifactLinks ?? []) {
    if (!artifact.path) {
      continue;
    }

    pushNavigationTarget(targets, seen, {
      kind: "generated-artifact",
      label: `Open generated artifact: ${artifact.path}`,
      path: artifact.path,
      ...(artifact.selector ? { selector: artifact.selector } : {})
    });
  }

  return targets;
}

/**
 * 将 manifest 相对路径约束到当前 VS Code workspace root 内。
 * Resolve a manifest-relative path only when it remains inside the current VS Code workspace root.
 */
export function resolveHiaSourceLinkageTargetPath(workspaceRoot: string, targetPath: string | undefined): HiaSourceLinkagePathResolution {
  const normalized = targetPath?.trim().replaceAll("/", path.sep);

  if (!normalized) {
    return {
      reason: "target-path-empty"
    };
  }

  if (isUnsafeTargetPath(normalized)) {
    return {
      reason: "target-path-unsafe"
    };
  }

  const resolved = path.resolve(workspaceRoot, normalized);
  const relative = path.relative(workspaceRoot, resolved);

  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return {
      reason: "target-path-unsafe"
    };
  }

  return {
    path: resolved
  };
}

function pushNavigationTarget(
  targets: HiaSourceLinkageNavigationTarget[],
  seen: Set<string>,
  target: HiaSourceLinkageNavigationTarget
): void {
  const key = [target.kind, target.path, target.position?.line ?? "", target.position?.column ?? "", target.selector ?? ""].join("\u0000");

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  targets.push(target);
}

function isUnsafeTargetPath(value: string): boolean {
  const segments = value.split(/[\\/]+/u);

  return path.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z]:/u.test(value)
    || segments.includes("..");
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}
