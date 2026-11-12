/**
 * @file
 * @lang zh-CN 命令描述草案的结构及边界反例；实际命令语义、来源字节和别名关联由后续读取层复核。
 * @lang en Structural and boundary counterexamples for draft command descriptions; consumers separately verify command semantics, source bytes and alias relationships.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMMAND_DOCUMENTATION_JSON_SCHEMA,
  COMMAND_DOCUMENTATION_SCHEMA_ID,
  COMMAND_DOCUMENTATION_CONTRACT_VERSION,
} from "./command-documentation.js";
import { HIA_TEXT_I18N_MODEL_VERSION } from "./model.js";
import { HIA_DOCUMENT_SCHEMA } from "./schema.js";
import { validateHiaDocument } from "./validator.js";
import { validateCommandDocumentation } from "./command-documentation-reader.js";
import { produceCommandDocumentation } from "./command-documentation-producer.js";
import type {
  CommandDocumentation,
  CommandDocumentationCommand,
  CommandDocumentationParameter,
  CommandDocumentationProjectionOptions,
} from "./command-documentation-model.js";

/**
 * @lang zh-CN 构造公开安全合成语言事实，字段使用现有core模型。
 * @lang en Build public-safe synthetic locale facts using the existing core model.
 * @returns <lang><zh-CN>新的中英字段对象。</zh-CN><en>Fresh bilingual field object.</en></lang>
 */
function textModel() {
  return {
    enabled: true,
    model: "hia-text-i18n",
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    fields: {
      summary: {
        fieldPath: "summary",
        kind: "text",
        defaultLocale: "zh-CN",
        localizedText: {
          "zh-CN": "合成命令摘要。",
          en: "Synthetic command summary.",
        },
      },
      description: {
        fieldPath: "description",
        kind: "text",
        defaultLocale: "zh-CN",
        localizedText: {
          "zh-CN": "仅供结构反例使用。",
          en: "Used only for structural counterexamples.",
        },
      },
    },
  };
}

/**
 * @lang zh-CN 创建未声称来源实存的完整wire夹具，每次返回独立引用。
 * @lang en Create a complete wire fixture without claiming that sources exist, returning independent references each time.
 * @returns <lang><zh-CN>合成命令描述。</zh-CN><en>Synthetic command description.</en></lang>
 */
function fixture() {
  return {
    contract: "command-documentation",
    contractVersion: "0.1.0-draft",
    owner: { packageName: "@example/docs", packageVersion: "1.0.0" },
    sources: [
      {
        id: "cli",
        path: "src/cli.mjs",
        sha256: "a".repeat(64),
        language: "javascript",
      },
    ],
    commands: [
      {
        id: "docs-build",
        executable: "example-docs",
        path: ["build"],
        kind: "command",
        signature: "example-docs build [options]",
        i18n: textModel(),
        displayVersion: { kind: "package", value: "1.0.0" },
        parsing: {
          helpOrder: "after-argument-validation",
          unknownOptions: "reject",
        },
        options: [
          {
            id: "out",
            kind: "option",
            name: "out",
            short: "o",
            valueType: "string",
            required: false,
            multiple: false,
            defaultRule: { kind: "literal", value: "dist/docs" },
            i18n: textModel(),
            evidence: [{ fieldPath: "defaultRule", sourceId: "cli" }],
          },
        ],
        positionals: [],
        examples: ["example-docs build --out public-docs"],
        effects: { filesystem: "write", network: "none" },
        exitCodes: [
          { code: 0, i18n: textModel() },
          { code: 1, i18n: textModel() },
        ],
        evidence: [{ fieldPath: "summary", sourceId: "cli" }],
      },
    ],
  };
}

// <lang><zh-CN>复用仓库已有Ajv2020，不为运行时core增加第三方依赖。</zh-CN><en>Reuse repository Ajv2020 without adding runtime dependencies to core.</en></lang>
const validate = new Ajv2020({ strict: true, allErrors: true }).compile(
  COMMAND_DOCUMENTATION_JSON_SCHEMA,
);

describe("command-documentation draft structure", () => {
  it("reuses localization definitions without sharing mutable schema objects", () => {
    expect(COMMAND_DOCUMENTATION_JSON_SCHEMA.$defs.i18nModel).toEqual(
      HIA_DOCUMENT_SCHEMA.$defs.i18nModel,
    );
    expect(COMMAND_DOCUMENTATION_JSON_SCHEMA.$defs.i18nModel).not.toBe(
      HIA_DOCUMENT_SCHEMA.$defs.i18nModel,
    );
  });
  it("keeps its independent draft identity", () => {
    expect(COMMAND_DOCUMENTATION_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(COMMAND_DOCUMENTATION_JSON_SCHEMA.$id).toBe(
      COMMAND_DOCUMENTATION_SCHEMA_ID,
    );
    expect(validate(fixture())).toBe(true);
  });

  it.each([
    ["contract", "other"],
    ["contractVersion", "1.0.0"],
    ["contractVersion", "0.1.0"],
    ["contractVersion", ""],
    ["commands", []],
    ["sources", []],
  ])("rejects invalid root %s", (field, value) => {
    expect(validate({ ...fixture(), [field]: value })).toBe(false);
  });

  it.each([
    "/src/cli.mjs",
    "C:/src/cli.mjs",
    "../cli.mjs",
    "src/../cli.mjs",
    "src//cli.mjs",
    "src/./cli.mjs",
    "https://example.test/cli.mjs",
    "src\\cli.mjs",
    "src/%2e%2e/cli.mjs",
    "src/cli.mjs#secret",
    "src/cli.mjs\n",
    "src/cli.mjs\r",
    "src/cli.mjs\u007f",
  ])("rejects unsafe source %s", (source) => {
    const input = fixture();
    input.sources[0].path = source;
    expect(validate(input)).toBe(false);
  });

  it("rejects an invalid digest and undeclared fields", () => {
    const input = fixture();
    input.sources[0].sha256 = "not-a-digest";
    expect(validate(input)).toBe(false);
    input.sources[0].sha256 = "a".repeat(64) + "\n";
    expect(validate(input)).toBe(false);
    expect(validate({ ...fixture(), sourceBody: "private" })).toBe(false);
  });

  it("rejects final newlines in invocation names and short flags", () => {
    const input = fixture();
    input.commands[0].executable = "example-docs\n";
    expect(validate(input)).toBe(false);
    input.commands[0].executable = "example-docs";
    input.commands[0].options[0].short = "o\n";
    expect(validate(input)).toBe(false);
  });

  it("requires both real locale values for every field", () => {
    const input = fixture();
    input.commands[0].i18n.fields.description.localizedText.en = "  ";
    expect(validate(input)).toBe(false);
    delete (
      input.commands[0].i18n.fields.description.localizedText as Record<
        string,
        string
      >
    ).en;
    expect(validate(input)).toBe(false);
  });

  it("requires explicit values for literal defaults", () => {
    const input = fixture();
    delete (input.commands[0].options[0].defaultRule as { value?: string })
      .value;
    expect(validate(input)).toBe(false);
  });

  it("requires conditions for conditional defaults", () => {
    const input = fixture();
    Object.assign(input.commands[0].options[0], {
      defaultRule: { kind: "conditional" },
    });
    expect(validate(input)).toBe(false);
  });

  it("keeps one-based ranges and explicit conventions", () => {
    const input = fixture();
    const evidence = input.commands[0].evidence[0];
    Object.assign(evidence, {
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
    });
    expect(validate(input)).toBe(false);
    Object.assign(evidence, {
      rangeConvention: {
        endBoundary: "exclusive",
        columnUnit: "utf16-code-unit",
      },
    });
    expect(validate(input)).toBe(true);
    Object.assign(evidence, {
      range: { start: { line: 0, column: 1 }, end: { line: 1, column: 2 } },
    });
    expect(validate(input)).toBe(false);
  });

  it("records current help policy differences without executing them", () => {
    const input = fixture();
    input.commands[0].parsing = {
      helpOrder: "before-dispatch",
      unknownOptions: "command-specific",
    };
    expect(validate(input)).toBe(true);
    input.commands[0].parsing.helpOrder = "invented";
    expect(validate(input)).toBe(false);
  });

  it.each([false, 0, null])("retains a literal default of %s", (value) => {
    const input = fixture();
    Object.assign(input.commands[0].options[0].defaultRule, { value });
    expect(validate(input)).toBe(true);
  });

  it("permits line-only unknown precision while rejecting missing known columns", () => {
    const input = fixture();
    const evidence = input.commands[0].evidence[0];
    Object.assign(evidence, {
      range: { start: { line: 1 }, end: { line: 2 } },
      rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" },
    });
    expect(validate(input)).toBe(true);
    Object.assign(evidence, {
      rangeConvention: {
        endBoundary: "exclusive",
        columnUnit: "utf16-code-unit",
      },
    });
    expect(validate(input)).toBe(false);
    Object.assign(evidence, { range: undefined });
    expect(validate(input)).toBe(false);
  });

  it("rejects a convention without a range", () => {
    const input = fixture();
    Object.assign(input.commands[0].evidence[0], {
      rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" },
    });
    expect(validate(input)).toBe(false);
  });

  it("does not permit positional declarations in the options collection", () => {
    const input = fixture();
    input.commands[0].options[0].kind = "positional";
    expect(validate(input)).toBe(false);
  });

  it("retains artifact display versions independently of package versions", () => {
    const input = fixture();
    input.commands[0].displayVersion = {
      kind: "artifact",
      value: "0.1.0-draft",
    };
    expect(validate(input)).toBe(true);
    expect(input.owner.packageVersion).toBe("1.0.0");
  });
});

/**
 * @lang zh-CN 为合成声明补足逐字段来源，原地更新测试夹具。
 * @lang en Complete per-field provenance for synthetic declarations, updating the test fixture in place.
 * @param owner <lang><zh-CN>当前合成命令或参数。</zh-CN><en>Current synthetic command or parameter.</en></lang>
 */
function bindEvidence(
  owner: CommandDocumentationCommand | CommandDocumentationParameter,
) {
  // <lang><zh-CN>每个实存字段单独声明来源，参数容器由各自节点负责。</zh-CN><en>Bind each present field separately, leaving parameter containers to their own nodes.</en></lang>
  owner.evidence = [
    ...Object.keys(owner).filter(
      (key) =>
        !["id", "i18n", "evidence", "options", "positionals"].includes(key),
    ),
    ...Object.keys(owner.i18n.fields).map((key) => "i18n.fields." + key),
  ].map((fieldPath) => ({ fieldPath, sourceId: "cli" }));
}

/** @lang zh-CN 为内存比较创建完整合成描述及宿主上下文。
 * @lang en Create a complete synthetic description and host context for memory comparisons.
 */
function completeFixture() {
  const input = fixture() as CommandDocumentation;
  const bytes = new TextEncoder().encode("// Synthetic declaration fixture\n");
  input.sources[0].sha256 = createHash("sha256").update(bytes).digest("hex");
  const command = input.commands[0];
  // <lang><zh-CN>结构字段和语言字段各自绑定，容器参数由其自身证据覆盖。</zh-CN><en>Bind structural and locale fields separately, with argument containers covered by their own evidence.</en></lang>
  for (const owner of [command, ...command.options]) {
    bindEvidence(owner);
  }
  const options: CommandDocumentationProjectionOptions = {
    sourceBytes: new Map([["cli", bytes]]),
    declarations: [
      {
        commandId: command.id,
        sourceDigests: { cli: input.sources[0].sha256 },
        options: [{ name: "out", short: "o", valueType: "string" }],
        positionals: [],
      },
    ],
  };
  return { input, options };
}

describe("command-documentation semantic reading and pure production", () => {
  it("rejects schema-invalid mutations across closed objects and inherited locale structures", () => {
    // <lang><zh-CN>删除所有必需键及破坏嵌套类型，独立Ajv验证其确为结构反例。</zh-CN><en>Delete every required key and corrupt nested types, independently checking structural invalidity with Ajv.</en></lang>
    const mutations: Array<(input: CommandDocumentation) => void> = [
      (input) => {
        Object.assign(input.owner, { extra: true });
      },
      (input) => {
        input.commands[0].i18n.resources = [{ path: 3 }] as never;
      },
      (input) => {
        input.commands[0].i18n.fields.summary.localizedText.fr = 3 as never;
      },
      (input) => {
        input.commands[0].options[0].choices = ["same", "same"];
      },
      (input) => {
        input.commands[0].options[0].short = "ab";
      },
      (input) => {
        input.commands[0].exitCodes[0].code = -1;
      },
    ];
    for (const select of [
      (input: CommandDocumentation) => input,
      (input: CommandDocumentation) => input.owner,
      (input: CommandDocumentation) => input.sources[0],
      (input: CommandDocumentation) => input.commands[0],
      (input: CommandDocumentation) => input.commands[0].options[0],
      (input: CommandDocumentation) => input.commands[0].i18n,
      (input: CommandDocumentation) => input.commands[0].i18n.fields.summary,
    ]) {
      for (const key of Object.keys(select(completeFixture().input))) {
        const input = completeFixture().input;
        delete (select(input) as Record<string, unknown>)[key];
        if (!validate(input)) {
          expect(
            validateCommandDocumentation(input).some(
              (item) => item.severity === "error",
            ),
            key,
          ).toBe(true);
        }
      }
    }
    for (const mutate of mutations) {
      const input = completeFixture().input;
      mutate(input);
      expect(validate(input)).toBe(false);
      expect(
        validateCommandDocumentation(input).some(
          (item) => item.severity === "error",
        ),
      ).toBe(true);
    }
  });

  it("joins explicit ancestor groups independently of declaration order and retains aliases", async () => {
    const { input, options } = completeFixture();
    const group = {
      ...structuredClone(input.commands[0]),
      id: "root",
      path: [],
      kind: "group" as const,
      options: [],
    };
    const alias = {
      ...structuredClone(input.commands[0]),
      id: "alias",
      path: ["make"],
      aliasOf: "docs-build",
    };
    bindEvidence(group);
    bindEvidence(alias);
    input.commands.push(alias, group);
    options.declarations = [
      ...options.declarations!,
      { ...structuredClone(options.declarations![0]), commandId: "alias" },
      {
        ...structuredClone(options.declarations![0]),
        commandId: "root",
        options: [],
      },
    ];
    const result = await produceCommandDocumentation(input, options);
    expect(result.status).toBe("ready");
    expect(result.document!.nodes).toHaveLength(1);
    expect(result.document!.nodes[0].children).toHaveLength(2);
    const canonical = result.document!.symbols.find((symbol) =>
      symbol.name.endsWith(" build"),
    )!;
    const aliasSymbol = result.document!.symbols.find((symbol) =>
      symbol.name.endsWith(" make"),
    )!;
    expect(aliasSymbol.metadata!.commandDocumentation).toMatchObject({
      aliasOf: canonical.id,
    });
    alias.aliasOf = "alias";
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "refused",
    );
  });

  it("compares options by name and positionals by ordered identity including repeated labels", async () => {
    const { input, options } = completeFixture();
    const second = {
      ...structuredClone(input.commands[0].options[0]),
      id: "mode",
      name: "mode",
      short: "m",
    };
    input.commands[0].options.push(second);
    options.declarations![0].options.unshift({
      name: "mode",
      valueType: "string",
      short: "m",
    });
    const positional = {
      ...structuredClone(second),
      id: "first",
      name: "item",
      kind: "positional" as const,
    };
    delete positional.short;
    bindEvidence(positional);
    input.commands[0].positionals.push(positional, {
      ...structuredClone(positional),
      id: "second",
      valueType: "number",
    });
    options.declarations![0].positionals.push(
      { name: "item", valueType: "string" },
      { name: "item", valueType: "number" },
    );
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "ready",
    );
    options.declarations![0].positionals.reverse();
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "refused",
    );
  });

  it("retains exact range conventions while exposing only declared line anchors", async () => {
    const { input, options } = completeFixture();
    const evidence = input.commands[0].evidence.find(
      (item) => item.fieldPath === "signature",
    )!;
    evidence.range = {
      start: { line: 1, column: 3 },
      end: { line: 1, column: 5 },
    };
    evidence.rangeConvention = {
      endBoundary: "exclusive",
      columnUnit: "unicode-code-point",
    };
    const result = await produceCommandDocumentation(input, options);
    expect(result.status).toBe("ready");
    expect(result.document!.symbols[0].source!.definedIn!.position).toEqual({
      line: 1,
    });
    expect(
      result.document!.symbols[0].source!.definedIn!.range,
    ).toBeUndefined();
    expect(result.document!.metadata!.commandDocumentation).toMatchObject({
      artifact: input,
      verification: { rangeCoordinates: "declared" },
    });
    evidence.rangeConvention.columnUnit = "unknown";
    delete evidence.range.end.column;
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "ready",
    );
  });

  it("copies Buffer-backed sources and host observations before waiting", async () => {
    const { input, options } = completeFixture();
    const bytes = Buffer.from(options.sourceBytes!.get("cli")!);
    options.sourceBytes = new Map([["cli", bytes]]);
    const pending = produceCommandDocumentation(input, options);
    bytes.fill(0);
    options.declarations![0].options[0].name = "changed";
    expect((await pending).status).toBe("ready");
  });

  it("refuses conflicting observation provenance and duplicate observation identities", async () => {
    const { input, options } = completeFixture();
    options.declarations![0].sourceDigests.cli = "0".repeat(64);
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "refused",
    );
    options.declarations = [
      options.declarations![0],
      structuredClone(options.declarations![0]),
    ];
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "refused",
    );
  });

  it("accepts complete local relationships", () => {
    expect(validateCommandDocumentation(completeFixture().input)).toEqual([]);
  });

  it("does not invoke accessors or serialization hooks", () => {
    let reads = 0;
    const accessor = Object.defineProperty({}, "commands", {
      enumerable: true,
      get() {
        reads++;
        throw new Error("private");
      },
    });
    expect(
      validateCommandDocumentation(accessor).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
    expect(
      validateCommandDocumentation({
        toJSON() {
          reads++;
        },
      }).some((item) => item.severity === "error"),
    ).toBe(true);
    expect(reads).toBe(0);
  });

  it.each([
    "command-id",
    "invocation",
    "parameter-id",
    "option-name",
    "short",
    "exit-code",
    "source-id",
  ])("rejects duplicate %s", (kind) => {
    const { input } = completeFixture();
    const command = input.commands[0];
    if (kind === "command-id") input.commands.push(structuredClone(command));
    if (kind === "invocation")
      input.commands.push({ ...structuredClone(command), id: "other" });
    if (kind === "parameter-id")
      command.options.push(structuredClone(command.options[0]));
    if (kind === "option-name")
      command.options.push({
        ...structuredClone(command.options[0]),
        id: "other",
        short: "x",
      });
    if (kind === "short")
      command.options.push({
        ...structuredClone(command.options[0]),
        id: "other",
        name: "other",
      });
    if (kind === "exit-code")
      command.exitCodes.push(structuredClone(command.exitCodes[0]));
    if (kind === "source-id")
      input.sources.push(structuredClone(input.sources[0]));
    expect(
      validateCommandDocumentation(input).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
  });

  it("rejects dangling aliases and alias cycles", () => {
    const { input } = completeFixture();
    input.commands[0].aliasOf = "missing";
    expect(
      validateCommandDocumentation(input).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
    input.commands[0].aliasOf = input.commands[0].id;
    expect(
      validateCommandDocumentation(input).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
  });

  it("rejects unresolved source and field references without reflecting private keys", () => {
    const { input } = completeFixture();
    input.commands[0].evidence[0] = {
      fieldPath: "private-key-do-not-echo",
      sourceId: "private-source-do-not-echo",
    };
    const diagnostics = validateCommandDocumentation(input);
    expect(diagnostics.some((item) => item.severity === "error")).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain("do-not-echo");
  });

  it("requires exact condition-field keys", () => {
    const { input } = completeFixture();
    input.commands[0].options[0].defaultRule = {
      kind: "conditional",
      conditions: ["missing"],
    };
    expect(
      validateCommandDocumentation(input).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports missing field evidence as incomplete", async () => {
    const { input, options } = completeFixture();
    input.commands[0].evidence = [];
    expect(
      (await produceCommandDocumentation(input, options)).document,
    ).toBeUndefined();
    input.commands[0].evidence = [{ fieldPath: "summary", sourceId: "cli" }];
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "incomplete",
    );
  });

  it("retains refusal when field evidence is incomplete and supplied bytes conflict", async () => {
    const { input, options } = completeFixture();
    input.commands[0].evidence = [{ fieldPath: "summary", sourceId: "cli" }];
    options.sourceBytes = new Map([["cli", new Uint8Array([0])]]);
    const result = await produceCommandDocumentation(input, options);
    expect(result.status).toBe("refused");
    expect(result.diagnostics.some((item) => item.severity === "warning")).toBe(
      true,
    );
    expect(result.diagnostics.some((item) => item.severity === "error")).toBe(
      true,
    );
    expect(result.document).toBeUndefined();
  });

  it("rejects reversed ranges and broken locale membership", () => {
    const { input } = completeFixture();
    Object.assign(input.commands[0].evidence[0], {
      range: { start: { line: 2 }, end: { line: 1 } },
      rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" },
    });
    expect(
      validateCommandDocumentation(input).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
    const other = completeFixture().input;
    other.commands[0].i18n.fields.summary.fieldPath = "wrong";
    expect(
      validateCommandDocumentation(other).some(
        (item) => item.severity === "error",
      ),
    ).toBe(true);
  });

  it("keeps missing sources or observations incomplete", async () => {
    const { input, options } = completeFixture();
    expect((await produceCommandDocumentation(input)).status).toBe(
      "incomplete",
    );
    expect(
      (
        await produceCommandDocumentation(input, {
          sourceBytes: options.sourceBytes,
        })
      ).status,
    ).toBe("incomplete");
  });

  it("refuses digest and parser-observation conflicts", async () => {
    const { input, options } = completeFixture();
    expect(
      (
        await produceCommandDocumentation(input, {
          ...options,
          sourceBytes: new Map([["cli", new Uint8Array([0])]]),
        })
      ).status,
    ).toBe("refused");
    options.declarations![0].options[0].name = "other";
    expect((await produceCommandDocumentation(input, options)).status).toBe(
      "refused",
    );
  });

  it("produces deterministic valid HiaDocuments retaining original fields and metadata", async () => {
    const { input, options } = completeFixture();
    const before = structuredClone(input);
    const first = await produceCommandDocumentation(input, options);
    const second = await produceCommandDocumentation(input, options);
    expect(first.status).toBe("ready");
    expect(first.document).toEqual(second.document);
    expect(validateHiaDocument(first.document)).toEqual([]);
    expect(first.document!.symbols).toHaveLength(2);
    expect(first.document!.symbols[0].i18n).toEqual(input.commands[0].i18n);
    expect(first.document!.symbols[0].signature).toBe(
      input.commands[0].signature,
    );
    expect(JSON.stringify(first.document)).not.toContain(
      "Synthetic declaration fixture",
    );
    expect(input).toEqual(before);
    first.document!.symbols[0].i18n!.fields.summary.localizedText.en =
      "Changed output";
    expect(input).toEqual(before);
    expect(
      second.document!.symbols[0].i18n!.fields.summary.localizedText.en,
    ).not.toBe("Changed output");
  });

  it("snapshots data and source bytes before asynchronous work", async () => {
    const { input, options } = completeFixture();
    const pending = produceCommandDocumentation(input, options);
    options.sourceBytes!.get("cli")!.fill(0);
    input.commands[0].signature = "mutated";
    const result = await pending;
    expect(result.status).toBe("ready");
    expect(result.document!.symbols[0].signature).not.toBe("mutated");
  });

  it.each([false, 0, null])(
    "preserves literal %s in the lossless descriptor snapshot",
    async (value) => {
      const { input, options } = completeFixture();
      input.commands[0].options[0].defaultRule.value = value;
      const result = await produceCommandDocumentation(input, options);
      expect(result.status).toBe("ready");
      expect(
        (
          result.document!.metadata!.commandDocumentation as {
            artifact: CommandDocumentation;
          }
        ).artifact.commands[0].options[0].defaultRule.value,
      ).toEqual(value);
    },
  );
});
