/**
 * @file
 * @lang zh-CN 命令描述草案的结构及边界反例；实际命令语义、来源字节和别名关联由后续读取层复核。
 * @lang en Structural and boundary counterexamples for draft command descriptions; consumers separately verify command semantics, source bytes and alias relationships.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  COMMAND_DOCUMENTATION_JSON_SCHEMA,
  COMMAND_DOCUMENTATION_SCHEMA_ID,
  COMMAND_DOCUMENTATION_CONTRACT_VERSION,
} from "./command-documentation.js";
import { HIA_TEXT_I18N_MODEL_VERSION } from "./model.js";
import { HIA_DOCUMENT_SCHEMA } from "./schema.js";

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
