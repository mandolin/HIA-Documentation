/**
 * @file
 * @lang zh-CN 主CLI的双语命令事实，同时供即时帮助与构建期严格文档投影使用。
 * @lang en Bilingual main-CLI command facts shared by immediate help and strict build-time documentation projection.
 */
import {
  HIA_TEXT_I18N_MODEL_VERSION,
  type CommandDocumentationCommand,
  type CommandDocumentationParameter,
  type HiaI18nModel,
} from "@hia-doc/core";

/** @lang zh-CN 终端参数栏目及对应两种语言标题。
 * @lang en Terminal parameter sections and their two localized headings.
 */
const sections = {
  input: ["输入", "Input"],
  output: ["输出与阅读", "Output and reading"],
  integration: ["项目集成", "Project integration"],
  options: ["参数", "Options"],
  help: ["帮助", "Help"],
} as const;

/** @lang zh-CN 以准确语义正文创建原生字段级语言模型，每次返回独立对象。
 * @lang en Create a native field-level locale model from semantic prose, returning independent objects each time.
 */
function localized(
  fields: Record<string, readonly [string, string]>,
): HiaI18nModel {
  return {
    enabled: true,
    model: "hia-text-i18n",
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, text]) => [
        key,
        {
          fieldPath: key,
          kind: "text",
          defaultLocale: "zh-CN",
          localizedText: { "zh-CN": text[0], en: text[1] },
        },
      ]),
    ),
  };
}

/** @lang zh-CN 创建字符串参数事实，条件默认引用本参数说明，名称仍由实际解析观察独立核验。
 * @lang en Create string-parameter facts with conditional defaults referencing local prose and names checked independently against actual parser observations.
 */
function option(
  name: string,
  metavar: string,
  section: keyof typeof sections,
  zh: string,
  en: string,
  settings: {
    required?: boolean;
    defaultRule?: CommandDocumentationParameter["defaultRule"];
    choices?: string[];
  } = {},
): CommandDocumentationParameter {
  return {
    id: name,
    kind: "option",
    name,
    valueType: "string",
    required: settings.required ?? false,
    multiple: false,
    defaultRule: settings.defaultRule ?? { kind: "not-applicable" },
    ...(settings.choices ? { choices: settings.choices } : {}),
    i18n: localized({
      summary: [zh, en],
      description: [zh, en],
      section: sections[section],
      metavar: [metavar, metavar],
    }),
    evidence: [],
  };
}

/** @lang zh-CN 共享help由实际顶层分发声明控制，帮助本身没有业务默认值。
 * @lang en Shared help is governed by the actual top-level dispatcher and has no business default value.
 */
function help(): CommandDocumentationParameter {
  return {
    id: "help",
    kind: "option",
    name: "help",
    short: "h",
    valueType: "boolean",
    required: false,
    multiple: false,
    defaultRule: { kind: "not-applicable" },
    i18n: localized({
      summary: ["显示当前命令帮助。", "Show command help."],
      description: ["输出本帮助并退出0。", "Print this help and exit 0."],
      section: sections.help,
    }),
    evidence: [],
  };
}

/** @lang zh-CN 创建叶声明，来源由构建期从实际owner原字节及解析节点补齐。
 * @lang en Create a leaf declaration, with provenance completed at build time from actual owner bytes and parser nodes.
 */
function leaf(
  path: string[],
  title: readonly [string, string],
  indexLabel: readonly [string, string],
  options: CommandDocumentationParameter[],
  paths: readonly [string, string],
  effects: readonly [string, string],
  example: string,
  exit: readonly [string, string] = ["成功", "Success"],
  error: readonly [string, string] = [
    "参数、输入或处理失败",
    "Argument, input or processing failure",
  ],
  filesystem: "read" | "read-write" = "read-write",
): CommandDocumentationCommand {
  return {
    id: path.join("."),
    executable: "hia",
    path,
    kind: "command",
    signature: "hia " + path.join(" ") + " [options]",
    i18n: localized({
      summary: title,
      description: title,
      indexLabel,
      paths,
      effects,
      offline: [
        "@hia-doc/cli/USAGE.md · " + path.join(" "),
        "@hia-doc/cli/USAGE.md · " + path.join(" "),
      ],
    }),
    displayVersion: { kind: "none", value: "" },
    parsing: {
      helpOrder: "before-dispatch",
      unknownOptions: ["build", "evidence", "panel"].includes(path[1]!)
        ? "ignore"
        : "reject",
    },
    options: [...options, help()],
    positionals: [],
    examples: [example],
    effects: { filesystem, network: path[1] === "build" ? "explicit" : "none" },
    exitCodes: [
      { code: 0, i18n: localized({ summary: exit, description: exit }) },
      { code: 1, i18n: localized({ summary: error, description: error }) },
    ],
    evidence: [],
  };
}

/**
 * @lang zh-CN 返回根、两组与十一真实叶的独立内容图。无文件读取、时钟或命令执行，未绑定来源的内容须经构建期观察后才能严格投影。
 * @lang en Return an independent content graph for the root, two groups and eleven actual leaves. Performs no file reads, clock access or command execution, and requires build-time provenance observations before strict projection.
 * @returns <lang><zh-CN>按帮助顺序组织的十四命令事实。</zh-CN><en>Fourteen command facts ordered for help presentation.</en></lang>
 */
export function createCliCommandContent(): CommandDocumentationCommand[] {
  // <lang><zh-CN>这些共享路径说明来自现有执行实现和随包USAGE，条件默认均保留配置/分支决定。</zh-CN><en>Shared path prose follows existing implementations and bundled USAGE, retaining configuration and branch-dependent defaults.</en></lang>
  const configured = [
    "CLI路径相对调用目录，配置路径按配置规则解析；CLI值覆盖配置。",
    "CLI paths use cwd; config paths follow config rules; CLI values override configuration.",
  ] as const;
  const safe = [
    "输入与可选输出采用相对调用目录的安全相对路径形式。",
    "Inputs and optional output use safe relative path forms resolved from cwd.",
  ] as const;
  const metadata = [
    "读取显式元数据；提供--out时写结果，否则向stdout输出JSON。",
    "Read explicit metadata; write a result for --out, otherwise emit JSON to stdout.",
  ] as const;
  const conditional = {
    kind: "conditional",
    conditions: ["description"],
  } as const;
  const conditionalDefault = {
    kind: conditional.kind,
    conditions: [...conditional.conditions],
  };
  const config = () =>
    option(
      "config",
      "file",
      "input",
      "配置JSON，省略时使用当前目录中存在的hia.config.json。",
      "Config JSON; omission uses hia.config.json when present in cwd.",
      { defaultRule: conditionalDefault },
    );
  const out = () =>
    option(
      "out",
      "file",
      "options",
      "可选输出文件；省略时将结果写stdout。",
      "Optional output file; omission writes the result to stdout.",
      { defaultRule: conditionalDefault },
    );
  const required = { required: true };
  // <lang><zh-CN>根与组只提供已确认导航层次，执行分发仍由原runCli决定。</zh-CN><en>Root and groups provide the confirmed navigation hierarchy while the original runCli owns executable dispatch.</en></lang>
  const groups: CommandDocumentationCommand[] = [
    {
      id: "hia",
      path: [],
      title: ["命令帮助", "Command help"],
      intro: ["命令帮助", "Command help"],
    },
    {
      id: "docs",
      path: ["docs"],
      title: ["构建与核验文档", "Build and verify documentation"],
      intro: [
        "构建、检查与交接文档",
        "Build, verify and hand off documentation",
      ],
    },
    {
      id: "browser",
      path: ["browser"],
      title: ["生成浏览器面板", "Generate a browser panel"],
      intro: ["生成浏览器面板", "Generate a browser panel"],
    },
  ].map((group) => ({
    id: group.id,
    executable: "hia",
    path: group.path,
    kind: "group",
    signature:
      "hia" +
      (group.path.length ? " " + group.path.join(" ") : "") +
      " <command> [options]",
    i18n: localized({
      summary: group.title as [string, string],
      description: group.intro as [string, string],
    }),
    displayVersion: { kind: "none", value: "" },
    parsing: {
      helpOrder: "before-dispatch",
      unknownOptions: "command-specific",
    },
    options: [help()],
    positionals: [],
    examples: [],
    effects: { filesystem: "none", network: "none" },
    exitCodes: [
      {
        code: 0,
        i18n: localized({
          summary: ["帮助", "Help"],
          description: ["帮助输出成功。", "Help printed successfully."],
        }),
      },
      {
        code: 1,
        i18n: localized({
          summary: ["未知执行路径", "Unknown executable path"],
          description: ["执行路径无效。", "Executable path is invalid."],
        }),
      },
    ],
    evidence: [],
  }));
  return [
    ...groups,
    leaf(
      ["docs", "build"],
      ["生成HTML文档", "Generate HTML documentation"],
      ["生成文档", "Generate documentation"],
      [
        config(),
        option(
          "input",
          "file",
          "input",
          "HIA文档JSON。与下两项互斥；省略全部显式输入时读取配置或内置样本。",
          "HIA document JSON. Exclusive with the next two options; omission of all explicit inputs uses configuration or the built-in fixture.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "jsdoc-integration",
          "file",
          "input",
          "JSDoc集成JSON。",
          "JSDoc integration JSON.",
        ),
        option(
          "project-manifest",
          "file",
          "input",
          "项目聚合清单JSON；省略时读取配置，与其它输入互斥。",
          "Project aggregation manifest JSON; omission uses configuration and is exclusive with other inputs.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "out",
          "dir",
          "output",
          "覆盖配置输出目录；缺省回退为dist/docs。",
          "Override configured output directory; fallback is dist/docs.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "locale",
          "locale",
          "output",
          "初始内容语言，使用显式值或配置，缺省使用文档默认语言。",
          "Initial content locale uses the explicit value or configuration, then the document default locale.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "manifest",
          "file",
          "output",
          "覆盖配置清单路径；缺省hia-manifest.json，必须位于输出目录内。",
          "Override the configured manifest path; fallback is hia-manifest.json and must stay inside output.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "site-navigation",
          "file",
          "integration",
          "项目构建的站点导航，需在配置中显式指定界面语言。",
          "Website navigation for project builds, requiring explicit UI locale.",
        ),
        option(
          "adoption-kit",
          "file",
          "integration",
          "显式负责人采用包。",
          "Explicit owner adoption kit.",
        ),
        option(
          "business-flow-handoff",
          "file",
          "integration",
          "显式业务流程交接投影。",
          "Explicit business-flow handoff projection.",
        ),
      ],
      configured,
      [
        "运行构建会写页面、资产及清单。未知开关沿现有行为可能被忽略；显式生产器可按其配置访问网络。",
        "Builds write pages, assets and manifests. Unknown switches may be ignored; explicit producers may access the network according to their configuration.",
      ],
      "hia docs build --input input.hia.json --out site --locale zh-CN",
    ),
    leaf(
      ["docs", "theme-assets"],
      ["写共享主题资产", "Write shared theme assets"],
      ["写共享主题资产", "Write shared theme assets"],
      [
        config(),
        option(
          "out",
          "dir",
          "output",
          "必填输出根，只接受--config与--out带值选项。",
          "Required output root; accepts only --config and --out value options.",
          required,
        ),
      ],
      configured,
      [
        "写assets/hia-default.css与hia-default.js。",
        "Write assets/hia-default.css and hia-default.js.",
      ],
      "hia docs theme-assets --config hia.config.json --out site",
    ),
    leaf(
      ["docs", "evidence"],
      ["汇总既有产物", "Summarize existing output"],
      ["汇总既有产物", "Summarize existing output"],
      [
        option(
          "docs-dir",
          "dir",
          "input",
          "已有产物目录，默认dist/docs。",
          "Existing output directory, default dist/docs.",
          { defaultRule: { kind: "literal", value: "dist/docs" } },
        ),
        option(
          "out",
          "file",
          "output",
          "结果文件，默认所选文档目录内的documentation-evidence.json。",
          "Result file, default documentation-evidence.json inside the selected docs directory.",
          { defaultRule: conditionalDefault },
        ),
      ],
      ["路径相对调用目录。", "Paths are relative to cwd."],
      [
        "读取已有项目输出并写公开安全摘要。未知开关沿现有行为可能被忽略。",
        "Read existing project output and write a public-safe summary. Unknown switches may be ignored.",
      ],
      "hia docs evidence --docs-dir site --out reports/evidence.json",
    ),
    leaf(
      ["docs", "acceptance"],
      ["检查采用证据", "Check adoption evidence"],
      ["检查采用证据", "Check adoption evidence"],
      [
        option(
          "evidence",
          "file",
          "options",
          "必填既有文档化证据摘要JSON。",
          "Required existing documentation evidence-summary JSON.",
          required,
        ),
        option(
          "target-id",
          "id",
          "options",
          "必填稳定公开目标标识。",
          "Required stable public target identifier.",
          required,
        ),
        option(
          "target-family",
          "family",
          "options",
          "必填目标族，支持unicode-compatible、html-authoring、enterprise-business、workspace-container。",
          "Required target family: unicode-compatible, html-authoring, enterprise-business or workspace-container.",
          {
            ...required,
            choices: [
              "unicode-compatible",
              "html-authoring",
              "enterprise-business",
              "workspace-container",
            ],
          },
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs acceptance --evidence evidence.json --target-id sample --target-family unicode-compatible",
      ["accepted", "Accepted"],
      ["其它结果或错误", "Other results or errors"],
    ),
    leaf(
      ["docs", "continuity"],
      ["比较两份证据", "Compare two evidence summaries"],
      ["比较两份证据", "Compare two evidence summaries"],
      [
        option(
          "baseline",
          "file",
          "options",
          "必填较早证据摘要，输入与输出路径须互异。",
          "Required earlier evidence summary; input and output paths must be distinct.",
          required,
        ),
        option(
          "current",
          "file",
          "options",
          "必填较新证据摘要。",
          "Required later evidence summary.",
          required,
        ),
        option(
          "target-id",
          "id",
          "options",
          "必填稳定公开目标标识。",
          "Required stable public target identifier.",
          required,
        ),
        option(
          "target-family",
          "family",
          "options",
          "必填，仅支持enterprise-business。",
          "Required; supports enterprise-business only.",
          { ...required, choices: ["enterprise-business"] },
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs continuity --baseline baseline.json --current current.json --target-id sample --target-family enterprise-business",
      ["accepted", "Accepted"],
      ["其它结果或错误", "Other results or errors"],
    ),
    leaf(
      ["docs", "adoption-kit"],
      ["组装负责人评审包", "Compose an owner review kit"],
      ["组装负责人评审包", "Compose an owner review kit"],
      [
        option(
          "request",
          "file",
          "options",
          "必填负责人采用请求JSON。",
          "Required owner adoption-request JSON.",
          required,
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs adoption-kit --request adoption-request.json",
      [
        "非refused状态，包括缺负责人输入的deferred",
        "Non-refused states, including deferred missing owner input",
      ],
      ["refused或错误", "Refused or errors"],
    ),
    leaf(
      ["docs", "business-flow-handoff"],
      ["打包流程交接", "Package a business-flow handoff"],
      ["打包流程交接", "Package a business-flow handoff"],
      [
        option(
          "projection",
          "file",
          "options",
          "必填精确业务流程投影JSON。",
          "Required exact business-flow projection JSON.",
          required,
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs business-flow-handoff --projection flow-projection.json",
      ["ready-for-owner-review", "Ready for owner review"],
      ["其它结果或错误", "Other results or errors"],
    ),
    leaf(
      ["docs", "enterprise-workflow"],
      ["组装负责人流程", "Compose an enterprise workflow"],
      ["组装负责人流程", "Compose an enterprise workflow"],
      [
        option(
          "adoption-request",
          "file",
          "options",
          "必填负责人采用请求JSON，所有输入输出路径须互异。",
          "Required owner adoption-request JSON; all input/output paths must be distinct.",
          required,
        ),
        option(
          "baseline",
          "file",
          "options",
          "须与--current成对；负责人输入已提交时必需。",
          "Must pair with --current; required for submitted owner input.",
        ),
        option(
          "current",
          "file",
          "options",
          "须与--baseline成对；负责人输入已提交时必需。",
          "Must pair with --baseline; required for submitted owner input.",
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs enterprise-workflow --adoption-request adoption-request.json",
      ["非refused状态，包括deferred", "Non-refused states, including deferred"],
      ["refused或错误", "Refused or errors"],
    ),
    leaf(
      ["docs", "html-authoring-verify"],
      ["核验HTML交接", "Verify an HTML authoring handoff"],
      ["核验HTML交接", "Verify an HTML authoring handoff"],
      [
        option(
          "request",
          "file",
          "options",
          "必填请求，含精确交接、源码注释投影和显式绑定。",
          "Required request containing an exact handoff, source-comment projection and explicit binding.",
          required,
        ),
        out(),
      ],
      safe,
      metadata,
      "hia docs html-authoring-verify --request html-authoring-request.json",
      ["accepted", "Accepted"],
      ["其它结果或错误", "Other results or errors"],
    ),
    leaf(
      ["docs", "coordinate-verify"],
      ["核验来源坐标", "Verify a source coordinate"],
      ["核验来源坐标", "Verify a source coordinate"],
      [
        ...[
          [
            "coordinate-profile",
            "坐标证据侧载JSON",
            "coordinate evidence-profile JSON",
          ],
          ["ordinary-map", "普通源码地图", "ordinary source map"],
          ["doc-source-map", "文档源码地图", "documentation source map"],
        ].map(([name, zh, en]) =>
          option(
            name!,
            "file",
            "options",
            "必填" + zh + "。",
            "Required " + en + ".",
            required,
          ),
        ),
        option(
          "source",
          "file",
          "options",
          "仅在获准读取时提供；省略产生安全未核结果。",
          "Supply only with source-read authorization; omission yields a safe unverified result.",
        ),
        option(
          "source-id",
          "id",
          "options",
          "必填来源身份，最长512字符。",
          "Required source identity, at most 512 characters.",
          required,
        ),
        option(
          "source-index",
          "n",
          "options",
          "必填从0开始的来源槽位十进制整数。",
          "Required zero-based source-slot decimal integer.",
          required,
        ),
        option(
          "section-index",
          "n",
          "options",
          "非嵌套section地图需要从0开始的section槽位。",
          "Non-nested section maps require a zero-based section slot.",
        ),
        option(
          "entry-id",
          "id",
          "options",
          "必填文档条目身份，最长512字符。",
          "Required documentation entry identity, at most 512 characters.",
          required,
        ),
        option(
          "line",
          "n",
          "options",
          "必填从1开始的十进制行号。",
          "Required one-based decimal line number.",
          required,
        ),
        option(
          "column",
          "n",
          "options",
          "必填从1开始的十进制列号。",
          "Required one-based decimal column number.",
          required,
        ),
        option(
          "column-unit",
          "unit",
          "options",
          "必填列单位，支持utf16-code-unit、unicode-code-point、byte。",
          "Required column unit: utf16-code-unit, unicode-code-point or byte.",
          {
            ...required,
            choices: ["utf16-code-unit", "unicode-code-point", "byte"],
          },
        ),
      ],
      [
        "所有文件须安全相对且实际路径位于调用目录内；侧载上限2MiB，各地图/源码上限16MiB。",
        "Files must be safe-relative and resolve within cwd; the profile limit is 2 MiB and each map/source limit is 16 MiB.",
      ],
      [
        "读取显式文件，始终向stdout输出JSON。",
        "Read explicit files and always emit JSON to stdout.",
      ],
      "hia docs coordinate-verify --coordinate-profile coordinate.json --ordinary-map generated.js.map --doc-source-map documentation-map.json --source-id source:sample --source-index 0 --entry-id entry:sample --line 1 --column 1 --column-unit utf16-code-unit",
      ["exact-anchor", "Exact anchor"],
      ["无效输入或契约拒绝", "Invalid input or contract refusal"],
      "read",
    ),
    leaf(
      ["browser", "panel"],
      ["生成浏览器面板", "Generate a browser panel"],
      ["生成浏览器面板", "Generate a browser panel"],
      [
        config(),
        option(
          "project-manifest",
          "file",
          "input",
          "显式或配置中须选定项目，含至少一个有效doc-source-map输入。",
          "Select a project explicitly or in configuration, including at least one valid doc-source-map input.",
          { defaultRule: conditionalDefault },
        ),
        option(
          "project-index",
          "file",
          "input",
          "可选项目索引，用于关系图；省略仍可生成基本面板。",
          "Optional project index for relation data; omission still allows a basic panel.",
        ),
        option(
          "out",
          "dir",
          "output",
          "输出目录默认dist/browser-panel。",
          "Output directory defaults to dist/browser-panel.",
          { defaultRule: { kind: "literal", value: "dist/browser-panel" } },
        ),
      ],
      configured,
      [
        "写静态HTML、JS和JSON，未知开关沿现有行为可能被忽略。",
        "Write static HTML, JS and JSON; unknown switches may be ignored.",
      ],
      "hia browser panel --project-manifest hia-project.json --project-index site/project-index.json --out panel",
    ),
  ].map((command) => {
    // <lang><zh-CN>坐标命令有独立未核退出码，其它命令保持各自原语义。</zh-CN><en>The coordinate command has a distinct non-exact exit code, while other commands retain their original semantics.</en></lang>
    if (command.kind === "command") {
      // <lang><zh-CN>记录原解析器的首值/闭集重复策略，帮助不改变它们。</zh-CN><en>Record original first-value or closed duplicate policies without changing them through help.</en></lang>
      const firstValue = [
        "docs.build",
        "docs.theme-assets",
        "docs.evidence",
        "browser.panel",
      ].includes(command.id);
      command.i18n.fields.parsingRules = localized({
        parsingRules: firstValue
          ? [
              "带值选项使用--name value，重复时读取首值；只支持-h/--help短帮助。",
              "Value options use --name value and read the first repeated value; -h/--help are the supported help switches.",
            ]
          : [
              "带值选项使用--name value，拒绝未知、重复及缺值选项；-h/--help优先于参数校验。",
              "Value options use --name value and reject unknown, duplicate or missing values; -h/--help precede argument validation.",
            ],
      }).fields.parsingRules!;
    }
    if (command.id === "docs.coordinate-verify")
      command.exitCodes.push({
        code: 2,
        i18n: localized({
          summary: [
            "安全未核或非精确锚点",
            "Safe unverified or non-exact anchor",
          ],
          description: [
            "有效输入的未核、最近锚点等非精确结果。",
            "Unverified, nearest-anchor or other non-exact results for valid inputs.",
          ],
        }),
      });
    return structuredClone(command);
  });
}
