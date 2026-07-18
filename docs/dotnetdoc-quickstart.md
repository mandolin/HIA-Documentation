# DotNetDoc Quickstart

This guide shows the minimum public path for using `@hia-doc/dotnetdoc-runner` with compiler-generated .NET XML documentation. XML documentation is the stable baseline; source relation and ASP.NET surface inputs can be added progressively.

## Install

Install the published runner in the target project:

```bash
npm install --save-dev @hia-doc/dotnetdoc-runner@^0.1.1
```

The package exposes the `hia-dotnetdoc` command.

## Enable XML Documentation

Build the .NET project with XML documentation output enabled. For SDK-style projects this is usually controlled by project settings such as `GenerateDocumentationFile`; older projects may already emit XML documentation through their build configuration.

The runner consumes the XML file that the compiler creates. It does not require source edits for the first pass.

## Add A Documentation Config

Create `dotnetdoc.config.json` at the project root:

```json
{
  "$schema": "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json",
  "schemaVersion": "0.1.0-draft",
  "workspaceRoot": ".",
  "outputDirectory": "dist/dotnetdoc",
  "inputs": [
    {
      "kind": "dotnet-xml-doc",
      "path": "xml-doc/Portal.Components.xml",
      "artifactBasePath": "Portal.Components",
      "hiaDocumentId": "dotnetdoc:Portal.Components",
      "title": "Portal.Components API"
    }
  ],
  "options": {
    "writeResultManifest": true
  }
}
```

Use a relative `path` that points to the XML documentation file inside the project workspace. The public config schema rejects absolute paths and parent-directory traversal.

## Run Standalone Extraction

Run the published CLI:

```bash
npx hia-dotnetdoc --config dotnetdoc.config.json
```

For a quick read-only probe without a config file, pass XML files directly:

```bash
npx hia-dotnetdoc --workspace-root . --out-dir dist/dotnetdoc --title "Portal Components API" xml-doc/Portal.Components.xml
```

The runner writes DotNetDoc extraction artifacts, HIA document artifacts and a documentation producer result manifest without embedding private source text.

## Add Source Relation Later

After XML documentation is stable, add C# source inputs or project discovery inputs to improve source linkage:

```json
{
  "kind": "dotnet-csharp-source",
  "path": "src/Portal.Components/Widget.cs",
  "artifactBasePath": "source/Widget"
}
```

For ASP.NET or Web Forms projects, `dotnet-aspnet-surface` inputs can be added as a progressive bridge. Treat these as enhancements; the first reliable milestone is still XML documentation intake.

## Connect To HIA Project Output

When the project is ready for unified HTML output, add the HIA CLI and the DotNetDoc producer:

```bash
npm install --save-dev @hia-doc/cli @hia-doc/dotnetdoc-producer@^0.1.1
```

Then use an explicit HIA project manifest producer entry:

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "id": "project:example-dotnet",
    "name": "Example .NET Project",
    "title": "Example .NET Documentation"
  },
  "producers": [
    {
      "id": "dotnetdoc",
      "module": "node_modules/@hia-doc/dotnetdoc-producer/src/index.mjs",
      "workspaceRoot": ".",
      "inputs": [
        {
          "kind": "dotnet-xml-doc",
          "path": "xml-doc/Portal.Components.xml",
          "artifactBasePath": "Portal.Components",
          "hiaDocumentId": "dotnetdoc:Portal.Components",
          "title": "Portal.Components API"
        }
      ],
      "options": {
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
rg --fixed-strings "sourcesContent" dist/dotnetdoc
rg --fixed-strings "xml-doc/Portal.Components.xml" dist/dotnetdoc
```

The first command should not find embedded source text. The second command helps confirm that published output refers to project-relative inputs rather than local machine paths.

## Target Repository Policy

For target projects that are not owned by the current HIA workspace, keep the repository read-only. If the target should adopt this setup, write a notification document under `dev/notify/{YYYYMMDD}-{title}.md` and let the target project decide when to copy the config, dependencies and CI steps.
