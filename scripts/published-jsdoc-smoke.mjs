import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const smokeRoot = path.join(root, "dist/published-jsdoc-smoke");
const projectRoot = path.join(smokeRoot, "project");
const standaloneOut = path.join(projectRoot, "docs/api");
const hiaOut = path.join(smokeRoot, "hia-docs");
const registry = "https://registry.npmjs.org/";
const npmCommand = "npm";
const nodeCommand = process.execPath;

const unsafeMarkers = [
  {
    label: "Windows absolute path",
    pattern: /(^|[^A-Za-z])[A-Za-z]:[\\/]/
  },
  {
    label: "UNC path",
    pattern: /(^|[\s"'([{])\\\\[A-Za-z0-9._$-]+[\\/][A-Za-z0-9._$-]+/
  },
  {
    label: "macOS user path",
    pattern: /\/Users\//
  },
  {
    label: "macOS private path",
    pattern: /\/private\//
  },
  {
    label: "adapter-private filePath field",
    pattern: /"filePath"\s*:/
  },
  {
    label: "legacy currentPage source link",
    pattern: /"currentPage"/
  },
  {
    label: "synthetic package:undefined node",
    pattern: /package:undefined/
  }
];

function runCommand(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && command === npmCommand,
    env: {
      ...process.env,
      npm_config_registry: registry
    }
  });
}

function writeJson(relativePath, value) {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath, value) {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function assertExists(filePath) {
  assert.equal(fs.existsSync(filePath), true, `${path.relative(root, filePath)} must exist`);
}

function listTextFiles(directory) {
  const files = [];
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (entry.isFile() && [".css", ".html", ".js", ".json"].includes(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function assertNoUnsafeMarkers(directory) {
  const failures = [];

  for (const filePath of listTextFiles(directory)) {
    const content = readText(filePath);
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, "/");

    for (const marker of unsafeMarkers) {
      if (marker.pattern.test(content)) {
        failures.push(`${relativePath}: ${marker.label}`);
      }
    }
  }

  assert.deepEqual(failures, [], `Published usage smoke output contains unsafe markers:\n${failures.join("\n")}`);
}

function createProject() {
  fs.rmSync(smokeRoot, { recursive: true, force: true });
  fs.mkdirSync(projectRoot, { recursive: true });

  writeJson("package.json", {
    name: "hia-published-jsdoc-smoke",
    private: true,
    version: "0.0.0",
    scripts: {
      docs: "jsdoc -c jsdoc.conf.json"
    }
  });

  writeJson("jsdoc.conf.json", {
    plugins: ["node_modules/@mandolin/jsdoc-plugin-hia-sys/src/index.cjs"],
    source: {
      include: ["src"]
    },
    opts: {
      template: "node_modules/@mandolin/jsdoc-theme-hia",
      destination: "docs/api",
      recurse: true,
      hia: {
        mode: "standalone",
        source: {
          mode: "all",
          link: {
            enabled: true,
            rootUrl: "https://github.com/mandolin/hia-published-smoke/blob/main",
            openMode: "new-tab"
          },
          preview: {
            enabled: true,
            defaultExpanded: false
          },
          references: {
            enabled: true,
            defaultExpanded: false
          }
        },
        i18n: {
          enabled: true,
          defaultLocale: "zh-CN",
          fallbackLocale: "en",
          locales: ["zh-CN", "en"],
          mode: "runtimeSwitch",
          resourceBasePath: ".",
          resources: ["docs/i18n/docs.hia-i18n.json"]
        },
        integration: {
          enabled: true,
          outputFile: "docs/api/hia-integration.json"
        },
        theme: {
          skin: "classic",
          collapse: {
            docletsDefaultExpanded: true,
            sectionsDefaultExpanded: true,
            metadataDefaultExpanded: true
          },
          languageControls: {
            mode: "auto",
            dropdownThreshold: 4
          },
          code: {
            controls: true,
            fontFamily: "cascadia",
            fontSize: 12,
            lineHeight: 1.55,
            tabSize: 2,
            wrap: false
          }
        }
      }
    }
  });

  writeJson("docs/i18n/docs.hia-i18n.json", {
    "zh-CN": {
      "published.module": {
        text: "已发布 npm 包 smoke 示例。"
      },
      "published.buildGreeting": {
        text: "构建一条可展示的问候消息。"
      }
    },
    en: {
      "published.module": {
        text: "Published npm package smoke sample."
      },
      "published.buildGreeting": {
        text: "Builds a display-ready greeting message."
      }
    }
  });

  writeText(
    "src/index.js",
    `/**
 * Published JSDoc smoke sample.
 *
 * @module published-smoke
 * @hiaKey published.module
 * @hiaPath publishedSmoke
 * @lang zh-CN 已发布 npm 包 smoke 示例。
 * @lang en Published npm package smoke sample.
 */

/**
 * Builds a greeting.
 *
 * @param {string} name User name.
 * @returns {string} Greeting message.
 * @example <caption>Build a greeting</caption>
 * @coderef BUILD_GREETING
 * @hiaKey published.buildGreeting
 * @hiaPath publishedSmoke.buildGreeting
 * @lang zh-CN 构建一条可展示的问候消息。
 * @lang en Builds a display-ready greeting message.
 */
export function buildGreeting(name) {
  /* @codeblock BUILD_GREETING */
  const normalizedName = String(name || "HIA user").trim();
  return \`Hello, \${normalizedName}\`;
  /* @codeblockend BUILD_GREETING */
}
`
  );
}

function installPackages() {
  runCommand(npmCommand, [
    "install",
    "--no-audit",
    "--fund=false",
    "--ignore-scripts",
    "--registry=https://registry.npmjs.org/",
    "jsdoc@4.0.5",
    "@mandolin/jsdoc-plugin-hia-sys@0.1.0",
    "@mandolin/jsdoc-theme-hia@0.1.0"
  ]);
}

function buildStandaloneDocs() {
  runCommand(npmCommand, ["exec", "--", "jsdoc", "-c", "jsdoc.conf.json"]);
}

function buildHiaDocsFromIntegration() {
  const cliEntry = path.join(root, "apps/cli/dist/index.js");
  assertExists(cliEntry);

  runCommand(
    nodeCommand,
    [
      cliEntry,
      "docs",
      "build",
      "--jsdoc-integration",
      path.join(standaloneOut, "hia-integration.json"),
      "--out",
      hiaOut,
      "--locale",
      "zh-CN"
    ],
    {
      cwd: root
    }
  );
}

function verifyInstalledPackages() {
  const pluginPkg = readJson(path.join(projectRoot, "node_modules/@mandolin/jsdoc-plugin-hia-sys/package.json"));
  const themePkg = readJson(path.join(projectRoot, "node_modules/@mandolin/jsdoc-theme-hia/package.json"));

  assert.equal(pluginPkg.version, "0.1.0");
  assert.equal(themePkg.version, "0.1.0");
}

function verifyStandaloneOutput() {
  for (const fileName of [
    "index.html",
    "index.zh-CN.html",
    "index.en.html",
    "hia-theme.css",
    "hia-theme.js",
    "search-index.json",
    "i18n-index.json",
    "hia-metadata.json",
    "hia-integration.json"
  ]) {
    assertExists(path.join(standaloneOut, fileName));
  }

  const html = readText(path.join(standaloneOut, "index.html"));
  assert.match(html, /Published JSDoc smoke sample/);
  assert.match(html, /data-hia-locale-control="zh-CN"/);
  assert.match(html, /BUILD_GREETING/);

  const integration = readJson(path.join(standaloneOut, "hia-integration.json"));
  assert.equal(integration.contract, "hia-jsdoc-integration");
  assert.equal(integration.contractVersion, "0.1.0");
  assert.equal(integration.artifactKind, "hia-integration");
  assert.ok(integration.ir.nodes.some((node) => node.name === "buildGreeting"));

  assertNoUnsafeMarkers(standaloneOut);
}

function verifyHiaOutput() {
  for (const relativePath of [
    "index.html",
    "hia-manifest.json",
    "assets/hia-default.css",
    "assets/hia-default.js"
  ]) {
    assertExists(path.join(hiaOut, relativePath));
  }

  const html = readText(path.join(hiaOut, "index.html"));
  assert.match(html, /构建一条可展示的问候消息。/);
  assert.match(html, /BUILD_GREETING/);

  const manifest = readJson(path.join(hiaOut, "hia-manifest.json"));
  assert.equal(manifest.documentId, "jsdoc.integration");

  assertNoUnsafeMarkers(hiaOut);
}

function run() {
  createProject();
  installPackages();
  verifyInstalledPackages();
  buildStandaloneDocs();
  verifyStandaloneOutput();
  buildHiaDocsFromIntegration();
  verifyHiaOutput();

  console.log(`Published JSDoc usage smoke passed at ${path.relative(root, smokeRoot).replaceAll(path.sep, "/")}.`);
}

run();
