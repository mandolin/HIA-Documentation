# TSDoc Quickstart

This guide shows the minimum public path for using `@hia-doc/tsdoc-runner` in a TypeScript project. It focuses on standalone extraction first, then shows how the same output can become HIA project documentation input later.

## Install

Install the published runner in the target project:

```bash
npm install --save-dev @hia-doc/tsdoc-runner@^0.1.2
```

The package exposes the `hia-tsdoc` command. New scripts should prefer `hia-tsdoc`; the older `tsdoc` alias is only a compatibility alias.

## Add A Documentation Config

Create `tsdoc.config.json` at the project root:

```json
{
  "$schema": "https://mandolin.github.io/HIA-Documentation/schemas/tsdoc-config-0.1.0-draft.schema.json",
  "schemaVersion": "0.1.0-draft",
  "workspaceRoot": ".",
  "outputDirectory": "dist/hia-tsdoc",
  "inputs": [
    {
      "kind": "typescript-entry",
      "path": "src/index.ts",
      "artifactBasePath": "api/index"
    }
  ],
  "options": {
    "emitDocSourceMap": true,
    "sourcesContentPolicy": "none",
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "writeResultManifest": true
  }
}
```

Use `moduleResolution: "bundler"` when the project relies on bundler-style TypeScript resolution. Keep `sourcesContentPolicy` as `none` unless the project explicitly accepts publishing source text inside generated documentation artifacts.

## Run Standalone Extraction

Run the published CLI:

```bash
npx hia-tsdoc --config tsdoc.config.json
```

The runner writes artifacts under `dist/hia-tsdoc`. A successful run reports the artifact count and produces HIA document output, a TSDoc/JSDoc bridge artifact and a doc-source-map manifest.

For a quick read-only probe without a config file, pass compiler options directly:

```bash
npx hia-tsdoc --workspace-root . --out-dir dist/hia-tsdoc --module-resolution bundler --types node src/index.ts
```

## Connect To HIA Project Output

When the project is ready for unified HTML output, add the HIA CLI and the TSDoc producer:

```bash
npm install --save-dev @hia-doc/cli @hia-doc/tsdoc-producer@^0.1.2
```

Then use an explicit HIA project manifest producer entry. HIA does not scan or install producer packages implicitly.

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "id": "project:example-ts",
    "name": "Example TypeScript Project",
    "title": "Example TypeScript Documentation"
  },
  "producers": [
    {
      "id": "tsdoc",
      "module": "node_modules/@hia-doc/tsdoc-producer/src/index.mjs",
      "workspaceRoot": ".",
      "inputs": [
        {
          "kind": "typescript-entry",
          "path": "src/index.ts",
          "artifactBasePath": "api/index"
        }
      ],
      "options": {
        "emitDocSourceMap": true,
        "sourcesContentPolicy": "none",
        "target": "ES2022",
        "module": "ES2022",
        "moduleResolution": "bundler",
        "skipLibCheck": true,
        "writeResultManifest": true
      }
    }
  ]
}
```

Then run the HIA CLI from a project that has `@hia-doc/cli` installed:

```bash
npx hia docs build --project-manifest hia-project.json --out dist/hia-docs
```

## Verify

Use these checks before publishing generated artifacts:

```bash
rg --fixed-strings "sourcesContent" dist/hia-tsdoc
rg --fixed-strings "dist/hia-tsdoc" dist/hia-tsdoc
```

The first command should not find embedded source text when `sourcesContentPolicy` is `none`. The second command is a coarse reminder to check for local path leakage before moving artifacts into a public site.

## Target Repository Policy

For target projects that are not owned by the current HIA workspace, keep the repository read-only. If the target should adopt this setup, write a notification document under `dev/notify/{YYYYMMDD}-{title}.md` and let the target project decide when to copy the config, dependencies and CI steps.
