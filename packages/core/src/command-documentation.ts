/**
 * @file
 * @lang zh-CN 命令文档的独立草案结构身份与自包含schema。复用core字段语言模型，仅定义JSON结构，来源字节、引用关联和执行语义由消费层核实。
 * @lang en Independent draft identity and self-contained schema for command documentation. Reuses core field localization and defines JSON structure only; consumers verify source bytes, relationships and execution semantics.
 */
import { HIA_DOCUMENT_SCHEMA } from "./schema.js";

/** @lang zh-CN 中性命令文档交换契约名称。
 * @lang en Neutral command-documentation exchange contract name.
 */
export const COMMAND_DOCUMENTATION_CONTRACT = "command-documentation" as const;

/** @lang zh-CN 独立草案版本，不随包或系统版本自动升级。
 * @lang en Independent draft version, never promoted automatically with package or system versions.
 */
export const COMMAND_DOCUMENTATION_CONTRACT_VERSION = "0.1.0-draft" as const;

/** @lang zh-CN 精确公开schema身份，读取该常量不执行网络访问。
 * @lang en Exact public schema identity, returned without network access.
 */
export const COMMAND_DOCUMENTATION_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/command-documentation-0.1.0-draft.schema.json";

/**
 * @lang zh-CN 命令描述JSON结构schema，内嵌现有core语言定义，避免外部schema请求。描述不执行命令或授权读取来源；schema通过不证明别名、字段来源和运行时规则一致。
 * @lang en Structural schema for command descriptions, embedding core locale definitions to avoid external schema requests. Descriptions execute no commands and grant no source access; schema success does not prove aliases, field provenance or runtime-rule consistency.
 */
export const COMMAND_DOCUMENTATION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: COMMAND_DOCUMENTATION_SCHEMA_ID,
  title: "命令文档描述 / Command documentation description",
  description:
    "版本化声明、字段语言及来源元数据；消费层另核关系和实际来源。 / Versioned declarations, field localization and provenance metadata; consumers separately verify relationships and actual sources.",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "owner", "sources", "commands"],
  properties: {
    contract: {
      const: COMMAND_DOCUMENTATION_CONTRACT,
      description: "契约名称。 / Contract name.",
    },
    contractVersion: {
      const: COMMAND_DOCUMENTATION_CONTRACT_VERSION,
      description: "精确草案版本。 / Exact draft version.",
    },
    owner: {
      $ref: "#/$defs/commandOwner",
      description: "拥有描述的包。 / Package owning these descriptions.",
    },
    sources: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/commandSource" },
      description: "显式来源清单。 / Explicit source inventory.",
    },
    commands: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/commandDeclaration" },
      description:
        "有序根、组及叶声明。 / Ordered root, group and leaf declarations.",
    },
  },
  $defs: {
    // <lang><zh-CN>保留语言模型所有局部引用，单份分发可独立编译，无远端解析。</zh-CN><en>Retain all locale-model local references so a distributed schema compiles independently without remote resolution.</en></lang>
    ...structuredClone(HIA_DOCUMENT_SCHEMA.$defs),
    commandText: {
      type: "string",
      pattern: "\\S",
      description:
        "至少一个非空白字符。 / At least one non-whitespace character.",
    },
    commandToken: {
      type: "string",
      pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$",
      description:
        "调用名或路径段，不含空白及开关前缀。 / Invocation name or path token without whitespace or a switch prefix.",
    },
    commandSafePath: {
      type: "string",
      pattern:
        "^(?!\\.{1,2}(?:/|$))(?!.*?/\\.{1,2}(?:/|$))[^\\\\:/\\u0000-\\u001f\\u007f?#%]+(?:/[^\\\\:/\\u0000-\\u001f\\u007f?#%]+)*$",
      description:
        "安全相对POSIX来源路径，不携带查询、片段或编码跳转。 / Safe relative POSIX source path without query, fragment or encoded traversal.",
    },
    commandOwner: {
      type: "object",
      additionalProperties: false,
      required: ["packageName", "packageVersion"],
      description:
        "包归属与版本声明，注册表存在性独立验证。 / Package ownership and version declarations, with registry existence checked separately.",
      properties: {
        packageName: {
          $ref: "#/$defs/commandText",
          description: "原包名。 / Original package name.",
        },
        packageVersion: {
          $ref: "#/$defs/commandText",
          description: "精确包版本字符串。 / Exact package-version string.",
        },
      },
    },
    commandSource: {
      type: "object",
      additionalProperties: false,
      required: ["id", "path", "sha256", "language"],
      description:
        "来源原字节摘要，结构检查不读取文件。 / Digest of original source bytes; structure checking does not read files.",
      properties: {
        id: {
          $ref: "#/$defs/commandText",
          description:
            "本描述内来源身份。 / Source identity within this description.",
        },
        path: {
          $ref: "#/$defs/commandSafePath",
          description:
            "相对授权来源根的路径。 / Path relative to an authorized source root.",
        },
        sha256: {
          type: "string",
          pattern: "^[a-f0-9]{64}$",
          description: "原字节SHA-256。 / SHA-256 of original bytes.",
        },
        language: {
          $ref: "#/$defs/commandText",
          description: "原生语言标识。 / Native language identifier.",
        },
      },
    },
    commandField: {
      allOf: [
        { $ref: "#/$defs/i18nField" },
        {
          type: "object",
          properties: {
            localizedText: {
              type: "object",
              required: ["zh-CN", "en"],
              properties: {
                "zh-CN": { $ref: "#/$defs/commandText" },
                en: { $ref: "#/$defs/commandText" },
              },
            },
          },
        },
      ],
      description:
        "复用字段语言模型，必须有实际中英正文。 / Reuse field localization with actual Chinese and English text.",
    },
    commandI18n: {
      allOf: [
        { $ref: "#/$defs/i18nModel" },
        {
          type: "object",
          properties: {
            enabled: { const: true },
            locales: {
              type: "array",
              uniqueItems: true,
              allOf: [
                { contains: { const: "zh-CN" } },
                { contains: { const: "en" } },
              ],
            },
            fields: {
              type: "object",
              required: ["summary", "description"],
              properties: {
                summary: { $ref: "#/$defs/commandField" },
                description: { $ref: "#/$defs/commandField" },
              },
              additionalProperties: { $ref: "#/$defs/commandField" },
            },
          },
        },
      ],
      description:
        "现有core字段级i18n，summary和description为必需正文。 / Existing core field i18n with required summary and description.",
    },
    commandEvidence: {
      type: "object",
      additionalProperties: false,
      required: ["fieldPath", "sourceId"],
      description:
        "逐字段来源绑定，范围约定沿文档源码映射1.1。 / Per-field provenance binding following documentation source-map 1.1 range conventions.",
      properties: {
        fieldPath: {
          $ref: "#/$defs/commandText",
          description:
            "描述内精确字段键。 / Exact field key within the description.",
        },
        sourceId: {
          $ref: "#/$defs/commandText",
          description:
            "显式来源身份，关联存在性由读取层核实。 / Explicit source identity, resolved by the consumer.",
        },
        range: {
          $ref: "#/$defs/sourceRange",
          description: "可选一基范围。 / Optional one-based range.",
        },
        rangeConvention: {
          type: "object",
          additionalProperties: false,
          required: ["endBoundary", "columnUnit"],
          description:
            "终点与列单位，未知值保留精度限制。 / End boundary and column unit, retaining unknown precision.",
          properties: {
            endBoundary: {
              enum: ["inclusive", "exclusive", "unknown"],
              description: "终点约定。 / End-boundary convention.",
            },
            columnUnit: {
              enum: [
                "utf16-code-unit",
                "unicode-code-point",
                "byte",
                "unknown",
              ],
              description: "列计量单位。 / Column unit.",
            },
          },
        },
      },
      dependentRequired: {
        range: ["rangeConvention"],
        rangeConvention: ["range"],
      },
      allOf: [
        {
          if: {
            required: ["rangeConvention"],
            properties: {
              rangeConvention: {
                type: "object",
                required: ["columnUnit"],
                properties: {
                  columnUnit: {
                    enum: ["utf16-code-unit", "unicode-code-point", "byte"],
                  },
                },
              },
            },
          },
          then: {
            properties: {
              range: {
                type: "object",
                properties: {
                  start: {
                    type: "object",
                    required: ["column"],
                    properties: {
                      column: {
                        type: "integer",
                        minimum: 1,
                        maximum: Number.MAX_SAFE_INTEGER,
                      },
                    },
                  },
                  end: {
                    type: "object",
                    required: ["column"],
                    properties: {
                      column: {
                        type: "integer",
                        minimum: 1,
                        maximum: Number.MAX_SAFE_INTEGER,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
    commandDefaultRule: {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      description:
        "区分字面量、条件、运行时决定与不适用，正文解释由字段i18n承载。 / Distinguish literal, conditional, runtime and inapplicable defaults, with explanations in field i18n.",
      properties: {
        kind: {
          enum: ["literal", "conditional", "runtime", "not-applicable"],
          description: "默认规则类型。 / Default-rule kind.",
        },
        value: {
          description:
            "字面量JSON值，保留false、0和null。 / Literal JSON value preserving false, zero and null.",
        },
        conditions: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/commandText" },
          description:
            "条件对应的精确语言字段键。 / Exact locale-field keys describing conditions.",
        },
      },
      allOf: [
        {
          if: { properties: { kind: { const: "literal" } } },
          then: { required: ["value"], properties: { value: {} } },
          else: { not: { required: ["value"], properties: { value: {} } } },
        },
        {
          if: { properties: { kind: { const: "conditional" } } },
          then: { required: ["conditions"], properties: { conditions: {} } },
          else: {
            not: { required: ["conditions"], properties: { conditions: {} } },
          },
        },
      ],
    },
    commandParameter: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "kind",
        "name",
        "valueType",
        "required",
        "multiple",
        "defaultRule",
        "i18n",
        "evidence",
      ],
      description:
        "有序选项或位置参数声明；必选及重复规则由原解析器裁决。 / Ordered option or positional declaration; the original parser owns required and repetition semantics.",
      properties: {
        id: {
          $ref: "#/$defs/commandText",
          description:
            "本命令内参数身份。 / Parameter identity within the command.",
        },
        kind: {
          enum: ["option", "positional"],
          description: "参数种类。 / Parameter kind.",
        },
        name: {
          $ref: "#/$defs/commandToken",
          description:
            "选项长名或位置参数显示名。 / Long option name or positional display name.",
        },
        short: {
          type: "string",
          pattern: "^[A-Za-z0-9]$",
          description:
            "可选单ASCII字符短名。 / Optional single ASCII short name.",
        },
        valueType: {
          enum: ["string", "boolean", "number", "integer"],
          description: "声明值类型。 / Declared value type.",
        },
        required: {
          type: "boolean",
          description:
            "无条件必选声明，条件要求记录在语言字段。 / Unconditionally required declaration; conditional requirements live in locale fields.",
        },
        multiple: {
          type: "boolean",
          description:
            "是否接受多个值，具体覆盖/收集规则另记正文。 / Whether multiple values are accepted; prose records replacement or collection behavior.",
        },
        choices: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { $ref: "#/$defs/commandText" },
          description: "可选值域。 / Optional choices.",
        },
        defaultRule: {
          $ref: "#/$defs/commandDefaultRule",
          description: "显式默认规则。 / Explicit default rule.",
        },
        i18n: {
          $ref: "#/$defs/commandI18n",
          description:
            "参数双语语义及限制。 / Bilingual parameter meaning and constraints.",
        },
        evidence: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/commandEvidence" },
          description: "逐字段来源。 / Per-field provenance.",
        },
      },
      allOf: [
        {
          if: { properties: { kind: { const: "positional" } } },
          then: { not: { required: ["short"], properties: { short: {} } } },
        },
      ],
    },
    commandDeclaration: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "executable",
        "path",
        "kind",
        "signature",
        "i18n",
        "displayVersion",
        "parsing",
        "options",
        "positionals",
        "examples",
        "effects",
        "exitCodes",
        "evidence",
      ],
      description:
        "命令或命令组的元数据，不执行其中示例。 / Command or group metadata, without executing examples.",
      properties: {
        id: {
          $ref: "#/$defs/commandText",
          description:
            "本描述内命令身份。 / Command identity within this description.",
        },
        executable: {
          $ref: "#/$defs/commandToken",
          description: "真实bin调用名。 / Actual bin invocation name.",
        },
        path: {
          type: "array",
          items: { $ref: "#/$defs/commandToken" },
          description:
            "有序子命令段，根为空数组。 / Ordered subcommand tokens, empty for a root.",
        },
        kind: {
          enum: ["group", "command"],
          description: "组或可执行叶。 / Group or executable leaf.",
        },
        aliasOf: {
          $ref: "#/$defs/commandText",
          description:
            "可选别名目标身份，消费层另核闭合与循环。 / Optional alias target identity, separately checked for closure and cycles.",
        },
        signature: {
          $ref: "#/$defs/commandText",
          description: "原生调用语法。 / Native invocation syntax.",
        },
        i18n: {
          $ref: "#/$defs/commandI18n",
          description:
            "用途、条件、路径及效果的字段正文。 / Field prose for purpose, conditions, paths and effects.",
        },
        displayVersion: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "value"],
          description:
            "帮助/版本使用的独立身份。 / Independent identity used in help or version output.",
          properties: {
            kind: {
              enum: ["package", "artifact", "runner", "none"],
              description: "版本身份种类。 / Version identity kind.",
            },
            value: {
              type: "string",
              description:
                "原版本显示值；none可为空。 / Original display value, optionally empty for none.",
            },
          },
        },
        parsing: {
          type: "object",
          additionalProperties: false,
          required: ["helpOrder", "unknownOptions"],
          description:
            "记录原解析行为，不改变执行。 / Record original parsing behavior without changing execution.",
          properties: {
            helpOrder: {
              enum: ["before-dispatch", "after-argument-validation"],
              description: "帮助处理阶段。 / Help-processing stage.",
            },
            unknownOptions: {
              enum: ["reject", "ignore", "command-specific"],
              description: "未知选项策略。 / Unknown-option policy.",
            },
          },
        },
        options: {
          type: "array",
          items: {
            allOf: [
              { $ref: "#/$defs/commandParameter" },
              { type: "object", properties: { kind: { const: "option" } } },
            ],
          },
          description: "有序命名选项。 / Ordered named options.",
        },
        positionals: {
          type: "array",
          items: {
            allOf: [
              { $ref: "#/$defs/commandParameter" },
              { type: "object", properties: { kind: { const: "positional" } } },
            ],
          },
          description: "有序位置参数。 / Ordered positional arguments.",
        },
        examples: {
          type: "array",
          items: { $ref: "#/$defs/commandText" },
          description: "公开安全调用例子。 / Public-safe invocation examples.",
        },
        effects: {
          type: "object",
          additionalProperties: false,
          required: ["filesystem", "network"],
          description:
            "已声明效果，具体作用域由正文与原实现约束。 / Declared effects, with scope constrained by prose and implementation.",
          properties: {
            filesystem: {
              enum: ["none", "read", "write", "read-write"],
              description: "文件系统效果。 / Filesystem effect.",
            },
            network: {
              enum: ["none", "explicit"],
              description: "网络效果声明。 / Network-effect declaration.",
            },
          },
        },
        exitCodes: {
          type: "array",
          minItems: 1,
          description:
            "退出码及其双语语义。 / Exit codes and bilingual meanings.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["code", "i18n"],
            properties: {
              code: {
                type: "integer",
                minimum: 0,
                description: "原非负退出码。 / Original nonnegative exit code.",
              },
              i18n: {
                $ref: "#/$defs/commandI18n",
                description: "对应状态语义。 / Meaning of this status.",
              },
            },
          },
        },
        evidence: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/commandEvidence" },
          description:
            "用途及各语义字段的来源。 / Provenance for purpose and semantic fields.",
        },
      },
    },
  },
} as const;
