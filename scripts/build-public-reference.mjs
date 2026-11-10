/** @file @lang zh-CN 从显式公开来源构建参考站；只编译自有.NET样本，生产器输出须通过来源和隐私门禁。 @lang en Builds reference output from explicit public sources, compiling only the first-party .NET sample and checking producer provenance and privacy. */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { preparePublicReferenceLocaleConfig, preparePublicReferenceSourceConfig } from "./public-reference-source.mjs";
import { assertPublicText } from "./check-official-web.mjs";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(mainRepoRoot, "reference", "public-reference-build.definition.json");
const requiredSatelliteSourceIds = [
  "hia-jsdoc",
  "hia-htmdoc",
  "hia-cssdoc",
  "hia-sassdoc",
  "hia-pugdoc",
  "hia-tsdoc",
  "hia-vuedoc",
  "hia-dotnetdoc"
];

await main();

/**
 * 从 public-only checkout 构建可复现的统一 reference artifact。
 * Builds a reproducible unified reference artifact from public-only checkouts.
 */
async function main() {
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

  // <lang><zh-CN>离线正式候选显式采用官网导航；在任何构建写入前限长、校验并固定一份纯数据快照。</zh-CN><en>Offline official candidates explicitly adopt host navigation, bounding, validating and snapshotting pure data before any build writes.</en></lang>
  let siteNavigation;
  if (options.siteNavigation) {
    assert(statSync(options.siteNavigation).size <= 512 * 1024, "Site navigation exceeds the CLI read budget.");
    siteNavigation = readJson(options.siteNavigation);
    const { assertDocumentationSiteNavigation } = await import("../packages/renderer-html/dist/index.js");
    assertDocumentationSiteNavigation(siteNavigation);
    assertPublicText(JSON.stringify(siteNavigation));
  }

  const sourceRoots = resolveSourceRoots(definition, resolvedMainRepoRoot, sourcesRoot);
  // <lang><zh-CN>只编译本构建owner内的固定公开样本；首次还原/编译写bin和obj，失败时保留上一份参考输出。</zh-CN><en>Compile only the owning repository's fixed public sample; restore/build writes bin and obj, preserving the previous reference output on failure.</en></lang>
  const sampleBuild = spawnSync("dotnet", ["build", "reference/samples/dotnet/HiaDocumentationSample.csproj", "--configuration", "Release", "--nologo"], {
    cwd: resolvedMainRepoRoot,
    stdio: "inherit"
  });
  assert(sampleBuild.status === 0, `First-party .NET sample compilation failed${sampleBuild.error ? `: ${sampleBuild.error.message}` : "."}`);
  assert(existsSync(path.join(resolvedMainRepoRoot, "reference/samples/dotnet/bin/Release/net10.0/HiaDocumentationSample.xml")), "Compiled .NET sample XML is missing.");
  // <lang><zh-CN>来源快照仅在输入与编译准备成功后收集，后续公开产物只记录仓库和提交身份。</zh-CN><en>Collect provenance after input and compilation preparation; public artifacts retain only repository and commit identities.</en></lang>
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
    // <lang><zh-CN>源码读取仅授予独占单文件镜像，配置和镜像统一由finally清理。</zh-CN><en>Authorize source reads only from the exclusive single-file mirror, cleaned with its config in finally.</en></lang>
    const sourceConfigPath = preparePublicReferenceSourceConfig(resolvedMainRepoRoot, runtime.root);
    // <lang><zh-CN>两语言读取同一已验证快照，宿主文件后续变化不影响这次构建。</zh-CN><en>Both locales read the same validated snapshot, isolating this build from later host-file changes.</en></lang>
    const siteNavigationPath = siteNavigation ? path.join(runtime.root, "site-navigation.json") : undefined;
    if (siteNavigationPath) writeJson(siteNavigationPath, siteNavigation);

    const locales = definition.acceptance.requiredLocales.map((locale) => buildLocale({
      definition,
      locale,
      outputRoot,
      projectManifestPath: ephemeralManifestPath,
      sourceConfigPath,
      siteNavigationPath,
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

function buildLocale({ definition, locale, outputRoot, projectManifestPath, sourceConfigPath, siteNavigationPath, resolvedMainRepoRoot }) {
  const localeOutput = path.join(outputRoot, locale);
  // <lang><zh-CN>本站每语言显式采用既有UI/信息架构，来源相对根及许可由同目录配置保留。</zh-CN><en>Explicitly adopt existing UI/IA for each site locale, preserving source-root resolution and authorization in the same directory.</en></lang>
  const localeConfigPath = preparePublicReferenceLocaleConfig(sourceConfigPath, locale);
  runMainRepoCli(resolvedMainRepoRoot, [
    "docs",
    "build",
    "--config",
    localeConfigPath,
    "--project-manifest",
    projectManifestPath,
    ...(siteNavigationPath ? ["--site-navigation", siteNavigationPath] : []),
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
  assertRequiredEntryIds(definition, localeOutput, locale);
  return {
    locale,
    entryCounts: manifest.project.entryCounts,
    producerCount: manifest.build.producers.length,
    docSourceMapCount: manifest.docSourceMaps.length
  };
}

/**
 * 复核 canonical project index 中的关键 CSS/HTML 符号，避免旧 extraction 重复计数移除后门禁只剩数量检查。
 * Verifies key CSS/HTML symbols in the canonical project index so the gate does not rely only on counts after duplicate extraction entries are removed.
 */
function assertRequiredEntryIds(definition, localeOutput, locale) {
  const requiredEntryIds = definition.acceptance.requiredEntryIds ?? [];
  assert(Array.isArray(requiredEntryIds) && requiredEntryIds.every((id) => typeof id === "string" && id.length > 0), "Public reference requiredEntryIds must be non-empty strings.");
  if (requiredEntryIds.length === 0) return;

  const projectIndex = readJson(path.join(localeOutput, "project-index.json"));
  const actualIds = new Set((projectIndex.entries ?? []).map((entry) => entry.id).filter((id) => typeof id === "string"));
  for (const entryId of requiredEntryIds) {
    assert(actualIds.has(entryId), `${locale}: required reference entry is missing: ${entryId}.`);
  }
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
    assertPublicText(content);
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
    else if (["--workspace-root", "--main-repo-root", "--sources-root", "--out", "--site-navigation"].includes(value)) options[toCamelCase(value.slice(2))] = values[++index];
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
