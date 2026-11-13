/** @file @lang zh-CN 命令网页投影与证据漂移反例。 @lang en Command-web projection and evidence-drift regressions. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  projectCommandSources,
  preparePublicReferenceCommands,
  verifyCommandBundle,
} from "./public-reference-commands.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) =>
  JSON.parse(
    fs.readFileSync(
      path.join(root, "apps/cli/dist/command-documentation", name),
    ),
  );
const native = read("document.hia.json");
const description = read("description.json");
const observations = read("declaration-observations.json");
const sourceBytes = new Map(
  description.sources.map((source) => [
    source.id,
    fs.readFileSync(path.join(root, "apps/cli", source.path)),
  ]),
);

for (const ownerIds of [[], ['unknown'], ['main-repo', 'main-repo']]) test('reject invalid command owner selection ' + JSON.stringify(ownerIds), async () => {
  await assert.rejects(preparePublicReferenceCommands({ownerIds}), /Invalid command owner selection/u);
});

test("native evidence strictly reproduces all command fields", async () => {
  await verifyCommandBundle({
    description,
    observations,
    document: native,
    sourceBytes,
  });
});

test("website projection changes only explicit source paths and retains native input", () => {
  const before = structuredClone(native);
  const projected = projectCommandSources(native, "main-repo/apps/cli");
  assert.deepEqual(native, before);
  for (const symbol of projected.symbols) {
    assert(
      symbol.source.definedIn.relativePath.startsWith("main-repo/apps/cli/"),
    );
    symbol.source.definedIn.relativePath =
      symbol.source.definedIn.relativePath.slice("main-repo/apps/cli/".length);
  }
  assert.deepEqual(projected, native);
});

test("web facts retain localized fields and expose versions, exit codes, examples and parameter defaults", () => {
  const before = structuredClone(native);
  const projected = projectCommandSources(
    native,
    "main-repo/apps/cli",
    description,
  );
  assert.deepEqual(native, before);
  for (let index = 0; index < native.symbols.length; index++) {
    for (const [key, field] of Object.entries(
      native.symbols[index].i18n.fields,
    ))
      assert.deepEqual(projected.symbols[index].i18n.fields[key], field);
    assert.equal(
      projected.symbols[index].i18n.fields["command.owner.packageName"]
        .localizedText.en,
      "@hia-doc/cli",
    );
    assert.equal(
      projected.symbols[index].i18n.fields["command.owner.packageVersion"]
        .localizedText.en,
      description.owner.packageVersion,
    );
  }
  const leaf = projected.symbols.find(
    (symbol) => symbol.name === "hia docs build",
  );
  assert.equal(
    leaf.i18n.fields["command.displayVersion.kind"].localizedText.en,
    description.commands.find((command) => command.id === "docs.build")
      .displayVersion.kind,
  );
  assert(leaf.i18n.fields["command.exitCodes.0.code"]);
  assert(leaf.i18n.fields["command.examples.0"]);
  assert(leaf.i18n.fields["parameters.--input.summary"]);
  const parameter = projected.symbols.find(
    (symbol) =>
      symbol.parentId === leaf.id &&
      symbol.metadata.commandDocumentation.nativeId === "input",
  );
  assert(parameter.i18n.fields["parameter.defaultRule.kind"]);
});

for (const prefix of [
  "",
  "../private",
  "/absolute",
  "C:/private",
  "a\\b",
  "a//b",
])
  test("reject unsafe owner prefix " + JSON.stringify(prefix), () => {
    assert.throws(
      () => projectCommandSources(native, prefix),
      /Unsafe command source prefix/u,
    );
  });

test("reject unsafe native paths before host projection", () => {
  const changed = structuredClone(native);
  changed.symbols[0].source.definedIn.relativePath = "../private";
  assert.throws(
    () => projectCommandSources(changed, "main-repo/apps/cli"),
    /Unsafe native command source/u,
  );
});

test("source-byte drift blocks command adoption", async () => {
  const changed = new Map(sourceBytes);
  changed.set(description.sources[0].id, Buffer.from("changed"));
  await assert.rejects(
    verifyCommandBundle({
      description,
      observations,
      document: native,
      sourceBytes: changed,
    }),
    /not ready/u,
  );
});

test("missing parser observations block command adoption", async () => {
  await assert.rejects(
    verifyCommandBundle({
      description,
      observations: [],
      document: native,
      sourceBytes,
    }),
    /not ready/u,
  );
});

test("missing localized fields in native snapshot block adoption", async () => {
  const changed = structuredClone(native);
  delete changed.symbols[0].i18n.fields.summary.localizedText.en;
  await assert.rejects(
    verifyCommandBundle({
      description,
      observations,
      document: changed,
      sourceBytes,
    }),
    /document drifted/u,
  );
});
