/**
 * @file
 * @lang zh-CN 从真实主CLI源码提取声明观察并拒绝描述/解析漂移。
 * @lang en Extract observations from actual main-CLI sources and reject description/parser drift.
 */
import assert from "node:assert/strict";
import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectCliCommandDocumentation,
  writeCliCommandDocumentation,
} from "./build-cli-command-documentation.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("generated file groups replace coherently and reject concurrent writers", async () => {
  const fixture = await mkdtemp(
    path.join(os.tmpdir(), "hia-command-artifacts-"),
  );
  const dist = path.join(fixture, "apps/cli/dist");
  try {
    await mkdir(dist, { recursive: true });
    const result = await collectCliCommandDocumentation(root);
    await writeCliCommandDocumentation(fixture, result);
    await writeCliCommandDocumentation(fixture, result);
    assert.deepEqual((await readdir(dist)).sort(), ["command-documentation"]);
    assert.deepEqual(
      JSON.parse(
        await readFile(
          path.join(dist, "command-documentation/description.json"),
          "utf8",
        ),
      ),
      result.description,
    );
    await writeFile(
      path.join(dist, "command-documentation.lock"),
      "other writer",
      { flag: "wx" },
    );
    await assert.rejects(writeCliCommandDocumentation(fixture, result), {
      code: "EEXIST",
    });
  } finally {
    // <lang><zh-CN>删除前核最终绝对临时根，仅清理本用例独占目录。</zh-CN><en>Verify the final absolute temporary root before deleting only this test's owned directory.</en></lang>
    assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
    assert.ok(path.basename(fixture).startsWith("hia-command-artifacts-"));
    await rm(fixture, { recursive: true, force: true });
  }
});

test("unrelated generated-directory files are retained on refusal", async () => {
  const fixture = await mkdtemp(
    path.join(os.tmpdir(), "hia-command-artifacts-"),
  );
  const target = path.join(fixture, "apps/cli/dist/command-documentation");
  try {
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "retain.txt"), "retain");
    await assert.rejects(writeCliCommandDocumentation(fixture, {}));
    assert.equal(
      await readFile(path.join(target, "retain.txt"), "utf8"),
      "retain",
    );
  } finally {
    assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
    assert.ok(path.basename(fixture).startsWith("hia-command-artifacts-"));
    await rm(fixture, { recursive: true, force: true });
  }
});

test("source substitutions cannot fabricate content provenance", async () => {
  await assert.rejects(
    collectCliCommandDocumentation(root, {
      sourceOverrides: new Map([
        ["src/command-content.ts", "export const fabricated = true;"],
      ]),
    }),
  );
});

test("actual route and parser declarations produce fourteen verified commands", async () => {
  const result = await collectCliCommandDocumentation(root);
  assert.equal(result.description.commands.length, 14);
  assert.equal(result.observations.length, 14);
  assert.equal(result.document.symbols.length, 76);
  assert.equal(
    result.document.symbols.find((symbol) => symbol.name === "--locale").source
      .definedIn.relativePath,
    "src/index.ts",
  );
  assert.equal(
    result.document.metadata.commandDocumentation.verification.sourceBytes,
    "matched",
  );
  assert.equal(
    result.description.commands.find(
      (command) => command.id === "docs.coordinate-verify",
    ).options.length,
    12,
  );
});

test("a changed real option name is refused independently of help content", async () => {
  const text = await readFile(
    new URL("../apps/cli/src/index.ts", import.meta.url),
    "utf8",
  );
  const changed = text.replace(
    'readOption(argv, "--locale")',
    'readOption(argv, "--changed-locale")',
  );
  assert.notEqual(changed, text);
  await assert.rejects(
    collectCliCommandDocumentation(root, {
      sourceOverrides: new Map([["src/index.ts", changed]]),
    }),
  );
});

test("an additional executable route cannot silently disappear from documentation", async () => {
  const text = await readFile(
    new URL("../apps/cli/src/index.ts", import.meta.url),
    "utf8",
  );
  const changed = text.replace(
    'normalizedArgv[1] === "build"',
    'normalizedArgv[1] === "changed-build"',
  );
  await assert.rejects(
    collectCliCommandDocumentation(root, {
      sourceOverrides: new Map([["src/index.ts", changed]]),
    }),
  );
});

test("the coordinate required/optional declaration set is checked from actual syntax", async () => {
  const text = await readFile(
    new URL("../apps/cli/src/coordinate-verify.ts", import.meta.url),
    "utf8",
  );
  await assert.rejects(
    collectCliCommandDocumentation(root, {
      sourceOverrides: new Map([
        [
          "src/coordinate-verify.ts",
          text.replace(
            '"--section-index", "--source"',
            '"--section-index", "--changed-source"',
          ),
        ],
      ]),
    }),
  );
});

test("a parser value-type change cannot retain a string observation", async () => {
  const text = await readFile(
    new URL("../apps/cli/src/owner-adoption-kit.ts", import.meta.url),
    "utf8",
  );
  await assert.rejects(
    collectCliCommandDocumentation(root, {
      sourceOverrides: new Map([
        [
          "src/owner-adoption-kit.ts",
          text.replace(
            "new Map<string, string>()",
            "new Map<string, number>()",
          ),
        ],
      ]),
    }),
  );
});
