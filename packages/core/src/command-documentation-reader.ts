/**
 * @file
 * @lang zh-CN 命令描述的普通JSON、领域shape和引用关系读取，不执行命令或读取来源。
 * @lang en Reads ordinary JSON, domain shapes and relationships for command descriptions without executing commands or reading sources.
 */
import {
  COMMAND_DOCUMENTATION_JSON_SCHEMA as schema,
  COMMAND_DOCUMENTATION_CONTRACT,
  COMMAND_DOCUMENTATION_CONTRACT_VERSION,
} from "./command-documentation.js";
import { isJsonDataGraph } from "./json-data.js";
import { validateHiaDocument } from "./validator.js";
import { HIA_CORE_CONTRACT_VERSION } from "./model.js";
import type { HiaDiagnostic } from "./model.js";
import type {
  CommandDocumentation,
  CommandDocumentationCommand,
  CommandDocumentationParameter,
  CommandDocumentationEvidence,
} from "./command-documentation-model.js";

/** @lang zh-CN 本域闭合对象的字段清单，直接取既有schema。
 * @lang en Closed domain-object field lists taken directly from the existing schema.
 */
type Shape = {
  required: readonly string[];
  properties: Readonly<Record<string, unknown>>;
};

/** @lang zh-CN 从固定schema匹配字符串，调用者值仅作输入。
 * @lang en Match a string against fixed schema patterns, using caller values only as input.
 */
function matches(value: unknown, pattern: string): value is string {
  return typeof value === "string" && new RegExp(pattern, "u").test(value);
}

/** @lang zh-CN 验证JSON对象的必需字段与闭合字段集。
 * @lang en Check required and closed field sets on a JSON object.
 */
function record(
  value: unknown,
  definition: Shape,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    definition.required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => Object.hasOwn(definition.properties, key))
  );
}

/** @lang zh-CN 检查数组并将稀疏项作为undefined检查，避免every跳过空洞。
 * @lang en Check arrays with sparse slots treated as undefined, avoiding skipped holes in every.
 */
function array(
  value: unknown,
  check: (item: unknown) => boolean,
  minimum = 0,
): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    Array.from(value).every(check)
  );
}

/** @lang zh-CN 比较schema中的固定枚举。
 * @lang en Compare fixed enums from the schema.
 */
function member(value: unknown, choices: readonly unknown[]): boolean {
  return choices.includes(value);
}

/** @lang zh-CN 验证非空白字段文本。
 * @lang en Validate nonblank field text.
 */
function text(value: unknown): value is string {
  return matches(value, schema.$defs.commandText.pattern);
}

/** @lang zh-CN 验证原生调用段或参数名。
 * @lang en Validate native invocation tokens or parameter names.
 */
function token(value: unknown): boolean {
  return matches(value, schema.$defs.commandToken.pattern);
}

/** @lang zh-CN 复用core完整语言语义，额外要求原草案的两个实际语言。
 * @lang en Reuse complete core locale semantics while requiring the two actual locales specified by the draft.
 */
function localeModel(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  // <lang><zh-CN>固定外壳隔离不可信语言字段路径，外层仅返回布尔结果。</zh-CN><en>A fixed envelope isolates untrusted locale field paths, exposing only a boolean to the caller.</en></lang>
  const diagnostics = validateHiaDocument({
    schemaVersion: HIA_CORE_CONTRACT_VERSION,
    id: "command-i18n",
    title: "Command i18n",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    nodes: [],
    symbols: [{ id: "model", name: "model", kind: "command", i18n: value }],
  });
  // <lang><zh-CN>复用校验通过后，仅补本草案的实际语言及双语正文约束。</zh-CN><en>After shared validation, add only this draft's actual-locale and bilingual-prose requirements.</en></lang>
  const model = value as Record<string, unknown>;
  if (
    diagnostics.length ||
    model.enabled !== true ||
    !array(model.locales, text) ||
    !model.locales.includes("zh-CN") ||
    !model.locales.includes("en") ||
    new Set(model.locales).size !== model.locales.length
  )
    return false;
  // <lang><zh-CN>字段形状已由既有模型核验，逐字段核实际中英文本。</zh-CN><en>The existing model has checked field shapes, so verify actual Chinese and English text per field.</en></lang>
  const fields = model.fields as Record<
    string,
    { localizedText: Record<string, unknown> }
  >;
  return (
    Object.hasOwn(fields, "summary") &&
    Object.hasOwn(fields, "description") &&
    Object.values(fields).every(
      (field) =>
        text(field.localizedText["zh-CN"]) && text(field.localizedText.en),
    )
  );
}

/** @lang zh-CN 校验已声明一基位置，可保留schema允许的其它位置字段。
 * @lang en Validate declared one-based positions, retaining other position fields allowed by the schema.
 */
function position(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  // <lang><zh-CN>只检查schema定义的行列，扩展位置属性按原schema保留。</zh-CN><en>Check schema-defined lines and columns while retaining extension position properties allowed by the original schema.</en></lang>
  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.line) &&
    (item.line as number) >= 1 &&
    (item.column === undefined ||
      (Number.isSafeInteger(item.column) && (item.column as number) >= 1))
  );
}

/** @lang zh-CN 来源字段结构及逐范围约定，与schema1.1词汇一致。
 * @lang en Provenance-field shapes and per-range conventions using the schema 1.1 vocabulary.
 */
function evidenceShape(value: unknown): boolean {
  if (
    !record(value, schema.$defs.commandEvidence) ||
    !text(value.fieldPath) ||
    !text(value.sourceId)
  )
    return false;
  if (value.range === undefined && value.rangeConvention === undefined)
    return true;
  if (
    !record(value.range, schema.$defs.sourceRange) ||
    !position(value.range.start) ||
    !position(value.range.end) ||
    !record(
      value.rangeConvention,
      schema.$defs.commandEvidence.properties.rangeConvention,
    )
  )
    return false;
  // <lang><zh-CN>范围约定必须完整匹配既有词汇，未知精度仍保留声明。</zh-CN><en>Range conventions must match the existing vocabulary, retaining declarations with unknown precision.</en></lang>
  const convention = value.rangeConvention;
  if (
    !member(
      convention.endBoundary,
      schema.$defs.commandEvidence.properties.rangeConvention.properties
        .endBoundary.enum,
    ) ||
    !member(
      convention.columnUnit,
      schema.$defs.commandEvidence.properties.rangeConvention.properties
        .columnUnit.enum,
    )
  )
    return false;
  // <lang><zh-CN>已知列单位需要两个端点列，未知单位允许行级声明。</zh-CN><en>Known column units require columns at both endpoints, while unknown units allow line-level declarations.</en></lang>
  const range = value.range as {
    start: { column?: number };
    end: { column?: number };
  };
  return (
    convention.columnUnit === "unknown" ||
    (range.start.column !== undefined && range.end.column !== undefined)
  );
}

/** @lang zh-CN 校验默认规则的互斥负载，不强制把配置默认值转为固定字面量。
 * @lang en Check exclusive default-rule payloads without forcing configured defaults into fixed literals.
 */
function defaultShape(value: unknown): boolean {
  if (
    !record(value, schema.$defs.commandDefaultRule) ||
    !member(value.kind, schema.$defs.commandDefaultRule.properties.kind.enum)
  )
    return false;
  return (
    Object.hasOwn(value, "value") === (value.kind === "literal") &&
    Object.hasOwn(value, "conditions") === (value.kind === "conditional") &&
    (value.conditions === undefined || array(value.conditions, text, 1))
  );
}

/** @lang zh-CN 校验本域选项或位置参数结构，枚举直接沿schema。
 * @lang en Validate option or positional structures using the schema enums directly.
 */
function parameterShape(
  value: unknown,
  kind: "option" | "positional",
): boolean {
  if (!record(value, schema.$defs.commandParameter)) return false;
  return (
    value.kind === kind &&
    text(value.id) &&
    token(value.name) &&
    member(
      value.valueType,
      schema.$defs.commandParameter.properties.valueType.enum,
    ) &&
    typeof value.required === "boolean" &&
    typeof value.multiple === "boolean" &&
    (value.short === undefined ||
      (kind === "option" &&
        matches(
          value.short,
          schema.$defs.commandParameter.properties.short.pattern,
        ))) &&
    (value.choices === undefined ||
      (array(value.choices, text, 1) &&
        new Set(value.choices).size === value.choices.length)) &&
    defaultShape(value.defaultRule) &&
    localeModel(value.i18n) &&
    array(value.evidence, evidenceShape, 1)
  );
}

/** @lang zh-CN 校验命令闭合结构，随后才允许身份/来源关联。
 * @lang en Validate closed command structures before joining identities or sources.
 */
function commandShape(value: unknown): boolean {
  if (!record(value, schema.$defs.commandDeclaration)) return false;
  // <lang><zh-CN>固定属性定义复用结构草案，不另建枚举副本。</zh-CN><en>Reuse the structural draft's fixed property definitions without maintaining separate enum copies.</en></lang>
  const definition = schema.$defs.commandDeclaration.properties;
  return (
    text(value.id) &&
    token(value.executable) &&
    array(value.path, token) &&
    member(value.kind, definition.kind.enum) &&
    (value.aliasOf === undefined || text(value.aliasOf)) &&
    text(value.signature) &&
    localeModel(value.i18n) &&
    record(value.displayVersion, definition.displayVersion) &&
    member(
      value.displayVersion.kind,
      definition.displayVersion.properties.kind.enum,
    ) &&
    typeof value.displayVersion.value === "string" &&
    record(value.parsing, definition.parsing) &&
    member(
      value.parsing.helpOrder,
      definition.parsing.properties.helpOrder.enum,
    ) &&
    member(
      value.parsing.unknownOptions,
      definition.parsing.properties.unknownOptions.enum,
    ) &&
    array(value.options, (item) => parameterShape(item, "option")) &&
    array(value.positionals, (item) => parameterShape(item, "positional")) &&
    array(value.examples, text) &&
    record(value.effects, definition.effects) &&
    member(
      value.effects.filesystem,
      definition.effects.properties.filesystem.enum,
    ) &&
    member(value.effects.network, definition.effects.properties.network.enum) &&
    array(
      value.exitCodes,
      (item) =>
        record(item, definition.exitCodes.items) &&
        Number.isInteger(item.code) &&
        (item.code as number) >= 0 &&
        localeModel(item.i18n),
      1,
    ) &&
    array(value.evidence, evidenceShape, 1)
  );
}

/** @lang zh-CN 验证工件结构，与普通JSON检查一起先于所有关联。
 * @lang en Validate artifact structures after ordinary-JSON checks and before all joins.
 */
function artifactShape(value: unknown): boolean {
  if (
    !record(value, schema) ||
    value.contract !== COMMAND_DOCUMENTATION_CONTRACT ||
    value.contractVersion !== COMMAND_DOCUMENTATION_CONTRACT_VERSION
  )
    return false;
  return (
    record(value.owner, schema.$defs.commandOwner) &&
    text(value.owner.packageName) &&
    text(value.owner.packageVersion) &&
    array(
      value.sources,
      (item) =>
        record(item, schema.$defs.commandSource) &&
        text(item.id) &&
        text(item.language) &&
        matches(item.path, schema.$defs.commandSafePath.pattern) &&
        matches(
          item.sha256,
          schema.$defs.commandSource.properties.sha256.pattern,
        ),
      1,
    ) &&
    array(value.commands, commandShape, 1)
  );
}

/** @lang zh-CN 新建固定公开诊断，path只能来自内部索引与固定字段。
 * @lang en Create fixed public diagnostics with paths built only from internal indexes and fixed fields.
 */
function diagnostic(path: string, incomplete = false): HiaDiagnostic {
  return {
    code: incomplete
      ? "COMMAND_DOCUMENTATION_INCOMPLETE"
      : "COMMAND_DOCUMENTATION_INVALID",
    severity: incomplete ? "warning" : "error",
    message: incomplete
      ? "命令描述缺少所需字段证据。 / Required command-field evidence is missing."
      : "命令描述结构或关联无效。 / Command-description structure or relationships are invalid.",
    path,
  };
}

/** @lang zh-CN 将局部来源键解析到结构字段或确切语言字段，显式前缀消除重名。
 * @lang en Resolve local provenance keys to structural or exact locale fields, using an explicit prefix to disambiguate names.
 */
function fieldKey(
  owner: CommandDocumentationCommand | CommandDocumentationParameter,
  key: string,
): string | undefined {
  if (key.startsWith("i18n.fields.")) {
    // <lang><zh-CN>显式前缀之后的全部文本都是原字段键，点号不会继续分割。</zh-CN><en>The entire suffix is the original locale-field key, with no further splitting on dots.</en></lang>
    const field = key.slice("i18n.fields.".length);
    return Object.hasOwn(owner.i18n.fields, field)
      ? "text:" + field
      : undefined;
  }
  if (Object.hasOwn(owner, key)) return "field:" + key;
  return Object.hasOwn(owner.i18n.fields, key) ? "text:" + key : undefined;
}

/** @lang zh-CN 核字段覆盖、来源引用及范围顺序，保留缺项warning与冲突error。
 * @lang en Check field coverage, source references and range order, retaining missing warnings and conflicting errors.
 */
function checkEvidence(
  owner: CommandDocumentationCommand | CommandDocumentationParameter,
  sources: Set<string>,
  path: string,
  diagnostics: HiaDiagnostic[],
): void {
  // <lang><zh-CN>身份和容器由声明图自身控制，所有领域值与语言字段需要明确来源。</zh-CN><en>Declaration graphs own identity and containers while every domain value and locale field requires explicit provenance.</en></lang>
  const required = new Set([
    ...Object.keys(owner)
      .filter(
        (key) =>
          !["id", "i18n", "evidence", "options", "positionals"].includes(key),
      )
      .map((key) => "field:" + key),
    ...Object.keys(owner.i18n.fields).map((key) => "text:" + key),
  ]);
  for (const [index, evidence] of owner.evidence.entries()) {
    // <lang><zh-CN>内部覆盖键不进入公开诊断，避免回显宿主私有字段。</zh-CN><en>Internal coverage keys stay out of public diagnostics, avoiding disclosure of private host fields.</en></lang>
    const resolved = fieldKey(owner, evidence.fieldPath);
    if (!resolved || !sources.has(evidence.sourceId))
      diagnostics.push(diagnostic(`${path}.evidence.${index}`));
    if (resolved) required.delete(resolved);
    if (evidence.range) {
      // <lang><zh-CN>只比较已同时声明的列，缺列时不推测默认列。</zh-CN><en>Compare columns only when both are declared, avoiding inferred defaults for missing columns.</en></lang>
      const { start, end } = evidence.range;
      if (
        start.line > end.line ||
        (start.line === end.line &&
          start.column !== undefined &&
          end.column !== undefined &&
          start.column > end.column)
      )
        diagnostics.push(diagnostic(`${path}.evidence.${index}.range`));
    }
  }
  if (required.size) diagnostics.push(diagnostic(`${path}.evidence`, true));
}

/** @lang zh-CN 判断本作用域键是否重复，支持数字退出码与字符串身份。
 * @lang en Detect duplicate keys within a scope, supporting numeric exit codes and string identities.
 */
function duplicates(values: unknown[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * @lang zh-CN 校验命令描述的普通JSON、闭合shape、身份/调用/别名/字段/来源关系。warning表示缺证据，error表示无效。真实字节与宿主观察由投影阶段比较。
 * @lang en Validate ordinary JSON, closed shapes and identity/invocation/alias/field/source relationships. Warnings indicate missing evidence and errors indicate invalidity. Projection compares actual bytes and host observations separately.
 * @param value <lang><zh-CN>未知内存wire数据，不调用访问器或toJSON。</zh-CN><en>Unknown in-memory wire data without invoking accessors or toJSON.</en></lang>
 * @returns <lang><zh-CN>确定性固定公开诊断，不修改输入。Proxy反射行为不构成沙箱。</zh-CN><en>Deterministic fixed public diagnostics without input mutation. Proxy reflection is not sandboxed.</en></lang>
 */
export function validateCommandDocumentation(value: unknown): HiaDiagnostic[] {
  try {
    if (!isJsonDataGraph(value) || !artifactShape(value))
      return [diagnostic("")];
    // <lang><zh-CN>普通JSON及shape已通过，这些局部引用只读当前输入。</zh-CN><en>Ordinary JSON and shapes have passed, and these local references read only the current input.</en></lang>
    const artifact = value as CommandDocumentation;
    const diagnostics: HiaDiagnostic[] = [];
    // <lang><zh-CN>所有关联按原生身份，调用路径另行去重，不由标签/位置或摘要生成身份。</zh-CN><en>Join by native identity, deduplicating invocation paths separately without deriving identity from labels, positions or digests.</en></lang>
    const sources = new Set(artifact.sources.map((source) => source.id));
    const commands = new Map(
      artifact.commands.map((command) => [command.id, command]),
    );
    if (sources.size !== artifact.sources.length)
      diagnostics.push(diagnostic("sources"));
    if (
      commands.size !== artifact.commands.length ||
      duplicates(
        artifact.commands.map((command) =>
          JSON.stringify([command.executable, command.path]),
        ),
      )
    )
      diagnostics.push(diagnostic("commands"));
    for (const [index, command] of artifact.commands.entries()) {
      // <lang><zh-CN>固定索引路径用于安全诊断，参数身份在同一命令内跨两容器去重。</zh-CN><en>Fixed index paths provide safe diagnostics, with parameter identities deduplicated across both containers within each command.</en></lang>
      const path = `commands.${index}`;
      const parameters = [...command.options, ...command.positionals];
      if (
        duplicates(parameters.map((parameter) => parameter.id)) ||
        duplicates(command.options.map((parameter) => parameter.name)) ||
        duplicates(
          command.options
            .filter((parameter) => parameter.short !== undefined)
            .map((parameter) => parameter.short),
        ) ||
        duplicates(command.exitCodes.map((exit) => exit.code))
      )
        diagnostics.push(diagnostic(path));
      if (
        command.displayVersion.kind === "package" &&
        command.displayVersion.value !== artifact.owner.packageVersion
      )
        diagnostics.push(diagnostic(`${path}.displayVersion`));
      if (
        command.displayVersion.kind !== "none" &&
        !text(command.displayVersion.value)
      )
        diagnostics.push(diagnostic(`${path}.displayVersion`));
      checkEvidence(command, sources, path, diagnostics);
      for (const [parameterIndex, parameter] of parameters.entries()) {
        // <lang><zh-CN>默认条件引用本参数的确切语言键，保留字段名内的点号。</zh-CN><en>Default conditions reference exact locale keys on this parameter, retaining dots inside keys.</en></lang>
        const parameterPath = `${path}.parameters.${parameterIndex}`;
        if (
          parameter.defaultRule.conditions?.some(
            (key) => !Object.hasOwn(parameter.i18n.fields, key),
          )
        )
          diagnostics.push(diagnostic(`${parameterPath}.defaultRule`));
        checkEvidence(parameter, sources, parameterPath, diagnostics);
      }
    }
    // <lang><zh-CN>迭代别名图，完成集避免重复追踪长链，也不依赖JS递归栈。</zh-CN><en>Walk alias graphs iteratively, using a completed set to avoid repeated long-chain traversal and JavaScript recursion.</en></lang>
    const complete = new Set<string>();
    for (const [index, command] of artifact.commands.entries()) {
      // <lang><zh-CN>当前链只跟踪尚未完成的别名，循环和断链分别产生固定错误。</zh-CN><en>The current chain tracks unfinished aliases only, producing fixed errors for cycles and broken links.</en></lang>
      let current: CommandDocumentationCommand | undefined = command;
      const chain = new Set<string>();
      while (current && !complete.has(current.id)) {
        if (chain.has(current.id)) {
          diagnostics.push(diagnostic(`commands.${index}.aliasOf`));
          break;
        }
        chain.add(current.id);
        if (!current.aliasOf) break;
        current = commands.get(current.aliasOf);
        if (!current) diagnostics.push(diagnostic(`commands.${index}.aliasOf`));
      }
      for (const id of chain) complete.add(id);
    }
    return diagnostics;
  } catch {
    return [diagnostic("")];
  }
}
