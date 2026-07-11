import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const allowedLicenses = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"]);
const forbiddenLicenseFragments = ["GPL", "AGPL", "LGPL", "SSPL", "BUSL", "BSL"];

const directDependencyAudit = [
  {
    name: "@jridgewell/trace-mapping",
    dependencyType: "dependencies",
    versionRange: "^0.3.31",
    license: "MIT",
    purpose: "Ordinary source map generated/original position lookup for @hia-doc/source-linkage."
  },
  {
    name: "@types/node",
    dependencyType: "devDependencies",
    versionRange: "^20.19.43",
    license: "MIT",
    purpose: "Node.js 20 type definitions for workspace packages and tests."
  },
  {
    name: "@types/vscode",
    dependencyType: "devDependencies",
    versionRange: "^1.92.0",
    license: "MIT",
    purpose: "VS Code extension API type definitions."
  },
  {
    name: "tsx",
    dependencyType: "devDependencies",
    versionRange: "^4.23.0",
    license: "MIT",
    purpose: "Development-time TypeScript CLI runner for package scripts."
  },
  {
    name: "typescript",
    dependencyType: "devDependencies",
    versionRange: "^6.0.3",
    license: "Apache-2.0",
    purpose: "TypeScript compiler and declaration output."
  },
  {
    name: "vitest",
    dependencyType: "devDependencies",
    versionRange: "2.1.9",
    license: "MIT",
    purpose: "Unit and integration test runner."
  },
  {
    name: "vscode-languageclient",
    dependencyType: "dependencies",
    versionRange: "^9.0.1",
    license: "MIT",
    purpose: "VS Code extension client for connecting to the HIA LSP server."
  },
  {
    name: "vscode-languageserver",
    dependencyType: "dependencies",
    versionRange: "^9.0.1",
    license: "MIT",
    purpose: "LSP transport and protocol types for @hia-doc/lsp."
  },
  {
    name: "vscode-languageserver-textdocument",
    dependencyType: "dependencies",
    versionRange: "^1.0.12",
    license: "MIT",
    purpose: "In-memory text document model for LSP document handling."
  }
];

const toolAudit = [
  {
    name: "node",
    version: "20.20.2",
    license: "MIT",
    purpose: "Pinned runtime for local development and CI parity."
  },
  {
    name: "pnpm",
    version: "10.34.4",
    license: "MIT",
    purpose: "Pinned workspace package manager."
  }
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function listPackageJsonFiles() {
  const packageJsonFiles = ["package.json"];
  const stack = ["apps", "packages"].map((directory) => path.join(root, directory));

  while (stack.length > 0) {
    const current = stack.pop();

    if (!fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile() && entry.name === "package.json") {
        packageJsonFiles.push(path.relative(root, absolutePath).replaceAll(path.sep, "/"));
      }
    }
  }

  return packageJsonFiles.sort((left, right) => left.localeCompare(right));
}

function isInternalWorkspaceDependency(name, versionRange) {
  return name.startsWith("@hia-doc/") || versionRange.startsWith("workspace:");
}

function auditKey(name, dependencyType) {
  return `${dependencyType}:${name}`;
}

function assertAllowedLicense(entry) {
  assert.ok(entry.purpose && entry.purpose.length >= 12, `${entry.name} must have a meaningful purpose`);
  assert.equal(
    allowedLicenses.has(entry.license),
    true,
    `${entry.name} uses ${entry.license}; update policy before allowing it`
  );

  for (const fragment of forbiddenLicenseFragments) {
    assert.equal(
      entry.license.toUpperCase().includes(fragment),
      false,
      `${entry.name} must not use restricted license family ${fragment}`
    );
  }
}

function assertDirectDependencyAudit() {
  const auditByKey = new Map();

  for (const entry of directDependencyAudit) {
    assertAllowedLicense(entry);
    const key = auditKey(entry.name, entry.dependencyType);
    assert.equal(auditByKey.has(key), false, `duplicate dependency audit record: ${key}`);
    auditByKey.set(key, entry);
  }

  const declaredKeys = new Set();

  for (const packageJsonPath of listPackageJsonFiles()) {
    const pkg = readJson(packageJsonPath);

    for (const dependencyType of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      const dependencies = pkg[dependencyType] ?? {};

      for (const [name, versionRange] of Object.entries(dependencies)) {
        if (isInternalWorkspaceDependency(name, versionRange)) {
          continue;
        }

        const key = auditKey(name, dependencyType);
        const audit = auditByKey.get(key);

        assert.ok(audit, `${packageJsonPath} declares ${key}, but docs/dependency-license-audit.md has no audit record`);
        assert.equal(
          versionRange,
          audit.versionRange,
          `${packageJsonPath} declares ${key} as ${versionRange}, expected audited range ${audit.versionRange}`
        );
        declaredKeys.add(key);
      }
    }
  }

  for (const key of auditByKey.keys()) {
    assert.equal(declaredKeys.has(key), true, `${key} is audited but no longer declared`);
  }
}

function assertToolAudit() {
  const rootPackage = readJson("package.json");
  const miseConfig = fs.readFileSync(path.join(root, ".mise.toml"), "utf8");

  for (const entry of toolAudit) {
    assertAllowedLicense(entry);
  }

  assert.equal(rootPackage.packageManager, "pnpm@10.34.4");
  assert.match(miseConfig, /node\s*=\s*"20\.20\.2"/);
  assert.match(miseConfig, /pnpm\s*=\s*"10\.34\.4"/);
}

function assertDocsMentionAuditedDependencies() {
  const auditDoc = fs.readFileSync(path.join(root, "docs/dependency-license-audit.md"), "utf8");
  const notesDoc = fs.readFileSync(path.join(root, "docs/dependency-notes.md"), "utf8");
  const templateDoc = fs.readFileSync(path.join(root, "docs/dependency-review-template.md"), "utf8");

  for (const entry of [...directDependencyAudit, ...toolAudit]) {
    assert.ok(auditDoc.includes(`\`${entry.name}\``), `audit doc must mention ${entry.name}`);
    assert.ok(auditDoc.includes(entry.license), `audit doc must mention ${entry.name} license ${entry.license}`);
  }

  assert.ok(notesDoc.includes("dependency-license-audit.md"), "dependency notes must link to the current audit");
  assert.ok(templateDoc.includes("License"), "dependency review template must include license review");
  assert.ok(templateDoc.includes("Purpose"), "dependency review template must include purpose review");
}

function run() {
  assertToolAudit();
  assertDirectDependencyAudit();
  assertDocsMentionAuditedDependencies();

  console.log("Dependency and license audit passed.");
}

run();
