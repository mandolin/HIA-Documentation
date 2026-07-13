import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmDocRoot = path.resolve(process.env.HIA_HTMDOC_ROOT ?? path.join(rootDir, "..", "HIA", "hia-htmdoc"));
const keepProbe = process.env.HIA_KEEP_LOCAL_CONSUMER_SMOKE === "1";
const packageManager = resolvePackageManager();
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const registry = "https://registry.npmjs.org/";

/**
 * 在仓库外创建一次性 consumer，验证公开 JSDoc 包、HTMDoc 本地包快照和 HIA 聚合 tarball 可以共同安装与执行。
 * Creates an ephemeral consumer outside the repository and verifies that published JSDoc packages, HTMDoc local package snapshots and HIA aggregation tarballs install and run together.
 *
 * This is D3-preparation evidence only: @hia-doc/* remains unpublished, so the result must not be reported as public-registry or D4 ecosystem-consumption evidence.
 */
async function main() {
  await assertDirectory(htmDocRoot, "HTMDoc workspace");
  await assertDirectory(path.dirname(npmCli), "npm CLI");

  const probeRoot = await mkdtemp(path.join(os.tmpdir(), "hia-local-package-consumer-"));
  const mainPackageDirectory = path.join(probeRoot, "main-packages");
  const htmPackageDirectory = path.join(probeRoot, "htmdoc-packages");

  try {
    await writeConsumerProject(probeRoot);
    await mkdir(mainPackageDirectory, { recursive: true });
    await mkdir(htmPackageDirectory, { recursive: true });
    runPackageManager(["run", "build"], rootDir);
    runPackageManager([
      "-r",
      "--filter",
      "@hia-doc/*",
      "--filter",
      "!@hia-doc/vscode-extension",
      "pack",
      "--pack-destination",
      mainPackageDirectory
    ], rootDir);
    runNpm(["pack", "--workspaces", "--pack-destination", htmPackageDirectory], htmDocRoot);

    const localTarballs = [
      ...(await listTarballs(mainPackageDirectory)),
      ...(await listTarballs(htmPackageDirectory))
    ];
    assert.equal(localTarballs.length, 21, "Expected 13 core and 8 HTMDoc local package tarballs.");

    runNpm([
      "install",
      "--prefix",
      probeRoot,
      "--ignore-scripts",
      "--no-audit",
      "--fund=false",
      "--registry=" + registry,
      ...localTarballs,
      "jsdoc@4.0.5",
      "@mandolin/jsdoc-plugin-hia-sys@0.1.0",
      "@mandolin/jsdoc-theme-hia@0.1.0"
    ], rootDir);

    runNode(["node_modules/@hia-doc/htmdoc-runner/src/cli.mjs", "--config", "htmdoc.config.json"], probeRoot);
    runNode(["node_modules/jsdoc/jsdoc.js", "-c", "jsdoc.conf.json"], probeRoot);
    runNode([
      "node_modules/@hia-doc/cli/dist/index.js",
      "docs",
      "build",
      "--project-manifest",
      "hia-project.json",
      "--out",
      "dist/hia",
      "--locale",
      "zh-CN"
    ], probeRoot);

    const summary = await verifyConsumerOutput(probeRoot);
    process.stdout.write("Local package consumer smoke passed at " + probeRoot + (keepProbe ? " (retained)." : ".") + "\n");
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } finally {
    if (!keepProbe) {
      await rm(probeRoot, { recursive: true, force: true });
    }
  }
}

async function writeConsumerProject(probeRoot) {
  await writeJson(path.join(probeRoot, "package.json"), {
    name: "hia-local-package-consumer-smoke",
    private: true,
    version: "0.0.0",
    type: "module",
    engines: { node: ">=20.19.0" }
  });
  await writeJson(path.join(probeRoot, "htmdoc.config.json"), {
    schemaVersion: "0.1.0-draft",
    workspaceRoot: ".",
    outputDirectory: "dist/htmdoc",
    inputs: [{ kind: "html-fragment", path: "src/profile-card.html" }],
    options: {
      emitDocSourceMap: true,
      sourcesContentPolicy: "none"
    }
  });
  await writeJson(path.join(probeRoot, "jsdoc.conf.json"), {
    plugins: ["node_modules/@mandolin/jsdoc-plugin-hia-sys/src/index.cjs"],
    source: { include: ["src/index.js"] },
    opts: {
      template: "node_modules/@mandolin/jsdoc-theme-hia",
      destination: "dist/jsdoc",
      recurse: true,
      hia: {
        mode: "standalone",
        i18n: {
          enabled: true,
          defaultLocale: "zh-CN",
          fallbackLocale: "en",
          locales: ["zh-CN", "en"],
          mode: "runtimeSwitch"
        },
        integration: {
          enabled: true,
          outputFile: "dist/jsdoc/hia-integration.json"
        }
      }
    }
  });
  await writeJson(path.join(probeRoot, "hia-project.json"), {
    schemaVersion: "0.1.0-draft",
    project: {
      id: "local-package-consumer-smoke",
      name: "Local Package Consumer Smoke",
      title: "Local Package Consumer Documentation",
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en"]
    },
    inputs: [{
      kind: "jsdoc-integration",
      path: "dist/jsdoc/hia-integration.json",
      domain: "js"
    }],
    producers: [{
      id: "htmdoc",
      module: "node_modules/@hia-doc/htmdoc-producer/src/index.mjs",
      inputs: [{ kind: "html-fragment", path: "src/profile-card.html" }],
      options: {
        emitDocSourceMap: true,
        sourcesContentPolicy: "none"
      }
    }]
  });
  await writeText(path.join(probeRoot, "src", "profile-card.html"), [
    "<!--",
    "@component profile-card",
    "@description A reusable user profile card.",
    "@attr name {string} Display name.",
    "@slot default Main profile content.",
    "@stylehook --profile-card-accent Controls the accent color.",
    "@a11y Use a semantic heading for the visible name.",
    "-->",
    '<article class="profile-card">',
    '  <h2><slot name="name">Anonymous</slot></h2>',
    "  <div><slot></slot></div>",
    "</article>",
    ""
  ].join("\n"));
  await writeText(path.join(probeRoot, "src", "index.js"), [
    "/**",
    " * Local package consumer probe module.",
    " *",
    " * @module local-package-consumer-smoke",
    " * @lang zh-CN 验证已安装文档化包的最小 JavaScript 模块。",
    " * @lang en Minimal JavaScript module that verifies installed documentation packages.",
    " */",
    "",
    "/**",
    " * Formats a profile display label.",
    " *",
    " * @param {string} name Raw display name.",
    " * @returns {string} Normalized label.",
    " * @lang zh-CN 格式化资料卡片中的显示名称。",
    " * @lang en Formats the profile card display name.",
    " */",
    "export function formatProfileName(name) {",
    '  return String(name || "Anonymous").trim();',
    "}",
    ""
  ].join("\n"));
}

async function verifyConsumerOutput(probeRoot) {
  const pluginPackage = await readJson(path.join(probeRoot, "node_modules", "@mandolin", "jsdoc-plugin-hia-sys", "package.json"));
  const themePackage = await readJson(path.join(probeRoot, "node_modules", "@mandolin", "jsdoc-theme-hia", "package.json"));
  assert.equal(pluginPackage.version, "0.1.0");
  assert.equal(themePackage.version, "0.1.0");

  const standaloneExtraction = await readJson(path.join(probeRoot, "dist", "htmdoc", "artifacts", "src", "profile-card.html-fragment-1.htmdoc.json"));
  assert.equal(standaloneExtraction.diagnostics.length, 0);
  assert.equal(standaloneExtraction.symbols.length, 5);

  const hiaOutput = path.join(probeRoot, "dist", "hia");
  const manifest = await readJson(path.join(hiaOutput, "hia-manifest.json"));
  const projectIndex = await readJson(path.join(hiaOutput, "project-index.json"));
  const docMap = await readJson(path.join(hiaOutput, ".hia-producers", "htmdoc", "artifacts", "src", "profile-card.html-fragment-1.docmap.json"));

  assert.deepEqual(manifest.project.views, ["all", "js", "html"]);
  assert.deepEqual(manifest.project.entryCounts, { all: 7, js: 2, html: 5 });
  assert.deepEqual(manifest.build.producers, [{ id: "htmdoc", status: "success", artifactCount: 3 }]);
  assert.deepEqual(manifest.build.inputs.map((input) => input.kind), ["hia-document", "doc-source-map", "jsdoc-integration"]);
  assert.equal(projectIndex.entries.filter((entry) => entry.view === "html").length, 5);
  assert.equal(projectIndex.entries.filter((entry) => entry.view === "js").length, 2);
  assert.equal(docMap.entries.length, 5);
  assert.equal(docMap.privacy.sourcesContentPolicy, "none");
  assert.ok(docMap.sources.every((source) => source.sourcesContentPolicy === "none"));

  await assertNoUnsafeOutput(hiaOutput);
  await assertNoUnsafeOutput(path.join(probeRoot, "dist", "jsdoc"));

  return {
    jsdocPackages: {
      plugin: pluginPackage.version,
      theme: themePackage.version
    },
    projectEntryCounts: manifest.project.entryCounts,
    htmDocSymbolCount: standaloneExtraction.symbols.length,
    docSourceMapEntryCount: docMap.entries.length,
    sourcesContentPolicy: docMap.privacy.sourcesContentPolicy
  };
}

async function assertNoUnsafeOutput(directory) {
  const files = await listTextFiles(directory);

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    assert.doesNotMatch(content, /(^|[^A-Za-z])[A-Za-z]:[\\/]/, filePath + ": output leaks a Windows absolute path.");
    assert.doesNotMatch(content, /(^|[\s"'([{])\\\\[A-Za-z0-9._$-]+[\\/]/, filePath + ": output leaks a UNC path.");
    assert.doesNotMatch(content, /\/Users\//, filePath + ": output leaks a macOS user path.");
    assert.doesNotMatch(content, /"filePath"\s*:/, filePath + ": output retains an adapter-private filePath field.");
  }
}

async function listTextFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTextFiles(target));
    } else if (entry.isFile() && [".css", ".html", ".js", ".json"].includes(path.extname(entry.name))) {
      files.push(target);
    }
  }

  return files;
}

async function listTarballs(directory) {
  return (await readdir(directory))
    .filter((entry) => entry.endsWith(".tgz"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(directory, entry));
}

async function writeJson(filePath, value) {
  await writeText(filePath, JSON.stringify(value, null, 2) + "\n");
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function resolvePackageManager() {
  const cli = process.env.npm_execpath;
  if (!cli) {
    return { command: "pnpm", prefixArgs: [] };
  }

  return /\.(?:cmd|bat|exe)$/i.test(cli)
    ? { command: cli, prefixArgs: [] }
    : { command: process.execPath, prefixArgs: [cli] };
}

function runPackageManager(args, cwd) {
  run(packageManager.command, [...packageManager.prefixArgs, ...args], cwd);
}

function runNpm(args, cwd) {
  run(process.execPath, [npmCli, ...args], cwd);
}

function runNode(args, cwd) {
  run(process.execPath, args, cwd);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_registry: registry
    }
  });

  if (result.error || result.status !== 0) {
    throw new Error("Command failed (" + command + " " + args.join(" ") + "): " + (result.error?.message ?? "exit " + result.status));
  }
}

async function assertDirectory(directory, label) {
  try {
    const entry = await stat(directory);
    assert.ok(entry.isDirectory(), label + " is not a directory: " + directory);
  } catch (error) {
    throw new Error(label + " is unavailable at " + directory + ": " + (error instanceof Error ? error.message : String(error)));
  }
}

await main();
