import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(mainRepoRoot, "reference", "public-reference-build.definition.json");
const requiredSatelliteSourceIds = [
  "hia-jsdoc",
  "hia-htmdoc",
  "hia-cssdoc",
  "hia-sassdoc",
  "hia-pugdoc",
  "hia-tsdoc",
  "hia-vuedoc"
];

main();

/**
 * 从 public-only checkout 构建可复现的统一 reference artifact。
 * Builds a reproducible unified reference artifact from public-only checkouts.
 */
function main() {
  const options = parseArguments(process.argv.slice(2));
  const definition = readJson(definitionPath);
  validateDefinition(definition);

  if (options.checkDefinition) {
    console.log(`Public reference definition check passed: ${definition.sources.length} sources, ${definition.producers.length} producers.`);
    return;
  }

  const workspaceRoot = path.resolve(options.workspaceRoot ?? mainRepoRoot);
  const resolvedMainRepoRoot = path.resolve(options.mainRepoRoot ?? mainRepoRoot);
  const sourcesRoot = path.resolve(options.sourcesRoot ?? path.join(resolvedMainRepoRoot, "reference", "sources"));
  const outputRoot = path.resolve(options.out ?? path.join(resolvedMainRepoRoot, "dist", "public-reference-build"));

  assertPathInsideOrSame(workspaceRoot, resolvedMainRepoRoot, "main-repo root must stay inside the declared workspace root.");
  assertPathInside(resolvedMainRepoRoot, outputRoot, "Public reference output must stay inside main-repo.");
  assert(existsSync(path.join(resolvedMainRepoRoot, "apps", "cli", "dist", "index.js")), "main-repo CLI is not built. Run `pnpm run build` first.");

  const sourceRoots = resolveSourceRoots(definition, resolvedMainRepoRoot, sourcesRoot);
  const provenance = collectProvenance(definition, sourceRoots);
  const runtime = createRuntimePaths(workspaceRoot, resolvedMainRepoRoot, outputRoot);
  const ephemeralManifestPath = path.join(workspaceRoot, ".hia-public-reference.runtime.hia-project.json");

  if (existsSync(ephemeralManifestPath)) {
    throw new Error(`Refusing to overwrite an existing runtime manifest: ${ephemeralManifestPath}`);
  }

  rmSync(outputRoot, { force: true, recursive: true });
  try {
    const projectManifest = materializeProjectManifest(definition, sourceRoots, runtime, workspaceRoot, resolvedMainRepoRoot);
    writeJson(ephemeralManifestPath, projectManifest);

    const locales = definition.acceptance.requiredLocales.map((locale) => buildLocale({
      definition,
      locale,
      outputRoot,
      projectManifestPath: ephemeralManifestPath,
      resolvedMainRepoRoot
    }));
    const sourceLinkage = buildSourceLinkagePanel({
      definition,
      outputRoot,
      projectManifestPath: ephemeralManifestPath,
      resolvedMainRepoRoot,
      locale: definition.project.defaultLocale
    });

    const report = {
      contract: "hia-public-reference-build",
      contractVersion: "0.1.0-draft",
      generatedAt: new Date().toISOString(),
      buildDefinition: {
        contract: definition.contract,
        contractVersion: definition.contractVersion,
        path: "reference/public-reference-build.definition.json"
      },
      project: definition.project,
      sources: provenance,
      locales,
      sourceLinkage,
      privacy: {
        sourcesContentPolicy: definition.privacy.sourcesContentPolicy,
        sourcePreviewPolicy: definition.privacy.sourcePreviewPolicy,
        workZonePublicInput: false,
        status: "pass"
      }
    };
    writeJson(path.join(outputRoot, "reference-build.json"), report);
    assertNoPrivateOutput(definition, outputRoot);
    console.log(`Public reference build passed: ${locales.length} locales, ${definition.producers.length} producers, ${provenance.length} resolved sources.`);
  } finally {
    rmSync(ephemeralManifestPath, { force: true });
    rmSync(runtime.root, { force: true, recursive: true });
  }
}

/**
 * Public build definitions must remain an explicit source allowlist, rather than becoming a workspace scan.
 * 公开构建定义必须保持为显式 source allowlist，不能退化为工作区扫描。
 */
function validateDefinition(definition) {
  assert(isRecord(definition), "Public reference definition must be an object.");
  assert(definition.contract === "hia-public-reference-build-definition", "Unexpected public reference definition contract.");
  assert(definition.contractVersion === "0.1.0-draft", "Unexpected public reference definition version.");
  assert(Array.isArray(definition.project?.locales) && definition.project.locales.length >= 2, "Public reference requires at least two locales.");
  assert(definition.project.locales.includes(definition.project.defaultLocale), "Project default locale must be declared.");
  assert(Array.isArray(definition.sources) && definition.sources.length === requiredSatelliteSourceIds.length + 1, "Public reference source inventory is incomplete.");
  assert(Array.isArray(definition.producers) && definition.producers.length === definition.acceptance?.requiredProducerCount, "Producer count must match the acceptance contract.");
  assert(definition.privacy?.sourcesContentPolicy === "none", "Public reference must use sourcesContentPolicy=none.");
  assert(definition.privacy?.workZonePublicInput === false, "Public reference must reject WorkZone as an input.");

  const sourceIds = definition.sources.map((source) => source.id);
  assert(new Set(sourceIds).size === sourceIds.length, "Source identifiers must be unique.");
  assert(sourceIds.includes("main-repo"), "Public reference source inventory must include main-repo.");
  for (const sourceId of requiredSatelliteSourceIds) {
    assert(sourceIds.includes(sourceId), `Public reference source inventory is missing ${sourceId}.`);
  }
  for (const source of definition.sources) {
    assert(typeof source.repository === "string" && source.repository.startsWith("mandolin/"), `Source ${source.id} must name an allowlisted mandolin repository.`);
    assert(source.ref === "main", `Source ${source.id} must use the reviewed main ref.`);
  }

  const producerIds = definition.producers.map((producer) => producer.id);
  assert(new Set(producerIds).size === producerIds.length, "Producer identifiers must be unique.");
  for (const producer of definition.producers) {
    assert(sourceIds.includes(producer.sourceId), `Producer ${producer.id} references an unknown workspace source.`);
    assert(sourceIds.includes(producer.moduleSourceId ?? producer.sourceId), `Producer ${producer.id} references an unknown module source.`);
    assert(isSafeRelativePath(producer.module), `Producer ${producer.id} module path is unsafe.`);
    for (const input of producer.inputs ?? []) {
      assert(isSafeRelativePath(input.path), `Producer ${producer.id} input path is unsafe.`);
    }
  }
}

function resolveSourceRoots(definition, resolvedMainRepoRoot, sourcesRoot) {
  const roots = new Map();
  for (const source of definition.sources) {
    const root = source.id === "main-repo"
      ? resolvedMainRepoRoot
      : path.join(sourcesRoot, source.id);
    assert(existsSync(root) && statSync(root).isDirectory(), `Required public source checkout is missing: ${source.id}.`);
    assert(existsSync(path.join(root, ".git")), `Required public source checkout is not a git working tree: ${source.id}.`);
    roots.set(source.id, root);
  }
  return roots;
}

function collectProvenance(definition, sourceRoots) {
  return definition.sources.map((source) => {
    const sha = runGit(sourceRoots.get(source.id), ["rev-parse", "HEAD"]);
    assert(/^[0-9a-f]{40}$/i.test(sha), `Source ${source.id} did not resolve to a full Git SHA.`);
    return {
      id: source.id,
      repository: source.repository,
      ref: source.ref,
      commit: sha.toLowerCase()
    };
  });
}

function createRuntimePaths(workspaceRoot, resolvedMainRepoRoot, outputRoot) {
  const root = path.join(outputRoot, ".runtime");
  assertPathInside(resolvedMainRepoRoot, root, "Runtime directory must stay inside main-repo output.");
  return {
    root,
    producersRoot: path.join(root, "producers"),
    workspaceRoot
  };
}

function materializeProjectManifest(definition, sourceRoots, runtime, workspaceRoot, resolvedMainRepoRoot) {
  rmSync(runtime.root, { force: true, recursive: true });
  writeDirectory(runtime.producersRoot);
  const wrapperModules = new Map();

  for (const producer of definition.producers) {
    const moduleSourceRoot = sourceRoots.get(producer.moduleSourceId ?? producer.sourceId);
    const modulePath = path.resolve(moduleSourceRoot, producer.module);
    assertPathInside(moduleSourceRoot, modulePath, `Producer ${producer.id} module leaves its source checkout.`);
    assert(existsSync(modulePath), `Producer ${producer.id} module is missing: ${producer.module}`);
    const wrapperPath = path.join(runtime.producersRoot, `${producer.id}.producer.mjs`);
    writeFileSync(wrapperPath, `export { default } from ${JSON.stringify(toModuleSpecifier(wrapperPath, modulePath))};\n`, "utf8");
    wrapperModules.set(producer.id, toSafeWorkspaceRelative(workspaceRoot, wrapperPath));
  }

  return {
    schemaVersion: "0.1.0-draft",
    project: definition.project,
    profiles: definition.profiles.map((profileId) => ({
      profileId,
      path: toSafeWorkspaceRelative(workspaceRoot, path.join(resolvedMainRepoRoot, "packages", "profiles", "src", "profiles", `${profileId}.profile.json`))
    })),
    producers: definition.producers.map((producer) => {
      const workspaceRoot = sourceRoots.get(producer.sourceId);
      const workspaceRootPath = toSafeWorkspaceRelative(runtime.workspaceRoot, workspaceRoot);
      return {
        id: producer.id,
        module: wrapperModules.get(producer.id),
        ...(workspaceRootPath === "." ? {} : { workspaceRoot: workspaceRootPath }),
        inputs: producer.inputs,
        profileIds: producer.profileIds,
        options: producer.options
      };
    }),
    metadata: {
      purpose: "HIA public first-party reference build",
      stage: "W-P14.2",
      privacy: {
        sourcesContentPolicy: definition.privacy.sourcesContentPolicy,
        sourcePreviewPolicy: definition.privacy.sourcePreviewPolicy,
        workZonePublicInput: false
      }
    }
  };
}

function buildLocale({ definition, locale, outputRoot, projectManifestPath, resolvedMainRepoRoot }) {
  const localeOutput = path.join(outputRoot, locale);
  runMainRepoCli(resolvedMainRepoRoot, [
    "docs",
    "build",
    "--project-manifest",
    projectManifestPath,
    "--out",
    localeOutput,
    "--locale",
    locale
  ]);

  const manifest = readJson(path.join(localeOutput, "hia-manifest.json"));
  assert(manifest.initialLocale === locale, `${locale}: output did not retain the requested locale.`);
  assert(Array.isArray(manifest.build?.producers) && manifest.build.producers.length === definition.acceptance.requiredProducerCount, `${locale}: producer summary count drifted.`);
  for (const producer of definition.producers) {
    assert(manifest.build.producers.some((summary) => summary.id === producer.id && summary.status === "success"), `${locale}: producer ${producer.id} did not succeed.`);
  }
  for (const [view, minimum] of Object.entries(definition.acceptance.minimumEntryCounts)) {
    assert(manifest.project?.entryCounts?.[view] >= minimum, `${locale}: ${view} entry count is below the reviewed floor.`);
  }
  assert((manifest.docSourceMaps?.length ?? 0) >= definition.acceptance.minimumDocSourceMapCount, `${locale}: doc-source-map count is below the reviewed floor.`);
  return {
    locale,
    entryCounts: manifest.project.entryCounts,
    producerCount: manifest.build.producers.length,
    docSourceMapCount: manifest.docSourceMaps.length
  };
}

function buildSourceLinkagePanel({ definition, outputRoot, resolvedMainRepoRoot, locale }) {
  const localeOutput = path.join(outputRoot, locale);
  const manifest = readJson(path.join(localeOutput, "hia-manifest.json"));
  const sourceLinkageManifestPath = path.join(localeOutput, ".hia-source-linkage.hia-project.json");
  try {
    writeJson(sourceLinkageManifestPath, {
      schemaVersion: "0.1.0-draft",
      project: {
        id: `${definition.project.id}:source-linkage`,
        name: "HIA Public Reference Source Linkage",
        title: "HIA Public Reference Source Linkage",
        defaultLocale: definition.project.defaultLocale,
        locales: definition.project.locales
      },
      inputs: (manifest.docSourceMaps ?? []).map((item) => ({
        kind: "doc-source-map",
        path: item.path
      }))
    });
    runMainRepoCli(resolvedMainRepoRoot, [
      "browser",
      "panel",
      "--project-manifest",
      sourceLinkageManifestPath,
      "--out",
      path.join(outputRoot, "source-linkage")
    ]);
    const payload = readJson(path.join(outputRoot, "source-linkage", "browser-panel-payload.json"));
    assert(payload.summary?.entryCount > 0, "Source-linkage panel did not contain entries.");
    assert(payload.summary?.sourceMapCount >= definition.acceptance.minimumPanelSourceMapCount, "Source-linkage panel source-map count is below the reviewed floor.");
    return {
      locale,
      entryCount: payload.summary.entryCount,
      linkedEntryCount: payload.summary.linkedEntryCount,
      sourceMapCount: payload.summary.sourceMapCount
    };
  } finally {
    rmSync(sourceLinkageManifestPath, { force: true });
  }
}

function runMainRepoCli(resolvedMainRepoRoot, args) {
  const cliPath = path.join(resolvedMainRepoRoot, "apps", "cli", "dist", "index.js");
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: resolvedMainRepoRoot, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`main-repo CLI exited with ${result.status}.`);
  }
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`git ${args.join(" ")} failed in ${cwd}: ${result.stderr || "unknown error"}`);
  }
  return result.stdout.trim();
}

function assertNoPrivateOutput(definition, root) {
  for (const filePath of listFiles(root, (file) => [".css", ".html", ".js", ".json", ".map"].includes(path.extname(file)))) {
    const content = readFileSync(filePath, "utf8");
    const normalized = content.replaceAll("\\", "/").toLowerCase();
    assert(!/(^|[^a-z0-9+.-])[a-z]:\//i.test(normalized) && !normalized.includes("//?/"), `Public reference output leaks a local absolute path: ${filePath}`);
    for (const marker of definition.privacy.forbiddenOutputMarkers) {
      assert(!normalized.includes(marker.toLowerCase()), `Public reference output leaks private marker ${marker}: ${filePath}`);
    }
    if (path.extname(filePath) === ".json") assertNoEmbeddedSources(JSON.parse(content), filePath);
  }
}

function assertNoEmbeddedSources(value, filePath) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoEmbeddedSources(item, filePath);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "sourcesContent" && Array.isArray(item) && item.some((entry) => typeof entry === "string" && entry.length > 0)) {
      throw new Error(`Public reference output embeds sourcesContent: ${filePath}`);
    }
    assertNoEmbeddedSources(item, filePath);
  }
}

function parseArguments(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--") continue;
    if (value === "--check-definition") options.checkDefinition = true;
    else if (["--workspace-root", "--main-repo-root", "--sources-root", "--out"].includes(value)) options[toCamelCase(value.slice(2))] = values[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

function listFiles(directory, predicate) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (predicate(entryPath)) files.push(entryPath);
    }
  }
  return files;
}

function toModuleSpecifier(fromPath, toPath) {
  const relative = path.relative(path.dirname(fromPath), toPath).replaceAll("\\", "/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function toSafeWorkspaceRelative(workspaceRoot, candidate) {
  assertPathInsideOrSame(workspaceRoot, candidate, `Path must stay inside workspace root: ${candidate}`);
  const relative = path.relative(workspaceRoot, candidate).replaceAll("\\", "/") || ".";
  assert(isSafeRelativePath(relative), `Path is not safe for a project manifest: ${relative}`);
  return relative;
}

function assertPathInside(root, candidate, message) {
  const relative = path.relative(root, candidate);
  assert(Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative), message);
}

function assertPathInsideOrSame(root, candidate, message) {
  const relative = path.relative(root, candidate);
  assert(!relative.startsWith("..") && !path.isAbsolute(relative), message);
}

function isSafeRelativePath(value) {
  const normalized = typeof value === "string" ? value.replaceAll("\\", "/") : "";
  return Boolean(normalized)
    && !path.posix.isAbsolute(normalized)
    && !path.win32.isAbsolute(normalized)
    && !normalized.split("/").includes("..")
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

function writeDirectory(directory) {
  rmSync(directory, { force: true, recursive: true });
  mkdirSync(directory, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
