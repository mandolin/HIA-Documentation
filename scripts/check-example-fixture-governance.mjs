import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const textExtensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".txt"]);

const unsafeMarkers = [
  {
    id: "windows-absolute-path",
    label: "Windows absolute path",
    pattern: /(^|[^A-Za-z])[A-Za-z]:[\\/]/
  },
  {
    id: "unc-path",
    label: "UNC path",
    pattern: /(^|[\s"'([{])\\\\[A-Za-z0-9._$-]+[\\/][A-Za-z0-9._$-]+/
  },
  {
    id: "macos-user-path",
    label: "macOS user path",
    pattern: /\/Users\//
  },
  {
    id: "macos-private-path",
    label: "macOS private path",
    pattern: /\/private\//
  },
  {
    id: "adapter-private-filepath",
    label: "adapter-private filePath field",
    pattern: /"filePath"\s*:/
  },
  {
    id: "legacy-current-page",
    label: "legacy currentPage source link",
    pattern: /"currentPage"/
  },
  {
    id: "synthetic-package-undefined",
    label: "synthetic package:undefined node",
    pattern: /package:undefined/
  }
];

const allowedFixtureMarkers = new Map([
  [
    "fixtures/jsdoc-integration.basic.json",
    new Set(["legacy-current-page"])
  ],
  [
    "fixtures/jsdoc-integration.compat.json",
    new Set(["macos-private-path", "adapter-private-filepath"])
  ]
]);

function toRelative(absolutePath) {
  return path.relative(root, absolutePath).replaceAll(path.sep, "/");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function listTextFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);

  if (!fs.existsSync(directory)) {
    return [];
  }

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

      if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function assertNoGeneratedOutput() {
  const generatedExampleDirs = [
    "examples/basic-jsdoc/out",
    "examples/basic-jsdoc/dist",
    "examples/basic-jsdoc/docs/api",
    "examples/plugin-authoring/out",
    "examples/plugin-authoring/dist",
    "examples/plugin-authoring/docs/api",
    "examples/typedoc-interop/out",
    "examples/typedoc-interop/dist",
    "examples/typedoc-interop/docs/api"
  ];

  for (const relativePath of generatedExampleDirs) {
    assert.equal(exists(relativePath), false, `${relativePath} must not be committed in main-repo examples`);
  }

  const tarballs = fs.readdirSync(root).filter((entry) => entry.endsWith(".tgz"));
  assert.deepEqual(tarballs, [], "dry-run tarballs must not remain in main-repo");
}

function scanFiles(relativeDirectory) {
  const failures = [];

  for (const absolutePath of listTextFiles(relativeDirectory)) {
    const relativePath = toRelative(absolutePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    const allowedMarkers = allowedFixtureMarkers.get(relativePath) ?? new Set();

    for (const marker of unsafeMarkers) {
      if (!allowedMarkers.has(marker.id) && marker.pattern.test(content)) {
        failures.push(`${relativePath}: ${marker.label}`);
      }
    }
  }

  return failures;
}

function run() {
  assertNoGeneratedOutput();

  const failures = [
    ...scanFiles("fixtures"),
    ...scanFiles("examples")
  ];

  if (exists("dist/release-gate-jsdoc-real")) {
    failures.push(...scanFiles("dist/release-gate-jsdoc-real"));
  }

  assert.deepEqual(failures, [], `Example/fixture governance violations:\n${failures.join("\n")}`);

  console.log("Example and fixture governance check passed.");
}

run();
