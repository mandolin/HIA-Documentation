/**
 * @file
 * @lang zh-CN 命令描述草案及纯投影的内存类型，字段与已发布结构schema对应。
 * @lang en In-memory types for draft command descriptions and pure projections, matching the distributed structural schema.
 */
import type {
  HiaDiagnostic,
  HiaDocument,
  HiaI18nModel,
  HiaSourceRange,
} from "./model.js";

/** @lang zh-CN 字段绑定到声明来源的事实，范围精度独立保留。
 * @lang en Facts binding a field to a declared source with independent range precision.
 */
export interface CommandDocumentationEvidence {
  /** @lang zh-CN 对象属性键或语言字段键，显式语言键可带i18n.fields.前缀。
   * @lang en Object-property or locale-field key, optionally qualified with i18n.fields. for locale fields.
   */
  fieldPath: string;
  /** @lang zh-CN 当前工件来源身份。
   * @lang en Source identity in the current artifact.
   */
  sourceId: string;
  /** @lang zh-CN 可选一基来源范围。
   * @lang en Optional one-based source range.
   */
  range?: HiaSourceRange;
  /** @lang zh-CN 有范围时必需的终点和列单位。
   * @lang en End boundary and column unit required for a range.
   */
  rangeConvention?: {
    /** @lang zh-CN 原终点约定。
     * @lang en Original end-boundary convention.
     */
    endBoundary: "inclusive" | "exclusive" | "unknown";
    /** @lang zh-CN 原列单位，unknown保留缺精度事实。
     * @lang en Original column unit, with unknown retaining missing precision.
     */
    columnUnit: "utf16-code-unit" | "unicode-code-point" | "byte" | "unknown";
  };
}

/** @lang zh-CN 参数默认规则，字面值保留普通JSON值。
 * @lang en Parameter-default rule retaining ordinary JSON literal values.
 */
export interface CommandDocumentationDefaultRule {
  /** @lang zh-CN 字面量、条件、运行时或不适用。
   * @lang en Literal, conditional, runtime or inapplicable rule.
   */
  kind: "literal" | "conditional" | "runtime" | "not-applicable";
  /** @lang zh-CN 仅literal存在的原JSON值。
   * @lang en Original JSON value present only for literal rules.
   */
  value?: unknown;
  /** @lang zh-CN 仅conditional存在的本参数语言字段键。
   * @lang en Local parameter locale-field keys present only for conditional rules.
   */
  conditions?: string[];
}

/** @lang zh-CN 有序选项或位置参数，来源与显示内容均为声明事实。
 * @lang en Ordered option or positional parameter with declared provenance and display content.
 */
export interface CommandDocumentationParameter {
  /** @lang zh-CN 本命令内参数身份。
   * @lang en Parameter identity within its command.
   */
  id: string;
  /** @lang zh-CN 命名选项或位置参数。
   * @lang en Named option or positional parameter.
   */
  kind: "option" | "positional";
  /** @lang zh-CN 长选项名或位置名称。
   * @lang en Long option name or positional name.
   */
  name: string;
  /** @lang zh-CN 可选单字符短名，位置参数不允许。
   * @lang en Optional single-character short name, unavailable for positionals.
   */
  short?: string;
  /** @lang zh-CN 声明值类型，与宿主观察比较。
   * @lang en Declared value type compared with host observations.
   */
  valueType: "string" | "boolean" | "number" | "integer";
  /** @lang zh-CN 无条件必选事实。
   * @lang en Unconditional requiredness fact.
   */
  required: boolean;
  /** @lang zh-CN 是否接受多值。
   * @lang en Whether multiple values are accepted.
   */
  multiple: boolean;
  /** @lang zh-CN 可选声明值域。
   * @lang en Optional declared choices.
   */
  choices?: string[];
  /** @lang zh-CN 默认规则及条件。
   * @lang en Default rule and conditions.
   */
  defaultRule: CommandDocumentationDefaultRule;
  /** @lang zh-CN 原字段级语言模型。
   * @lang en Original field-level locale model.
   */
  i18n: HiaI18nModel;
  /** @lang zh-CN 参数字段来源。
   * @lang en Parameter-field provenance.
   */
  evidence: CommandDocumentationEvidence[];
}

/** @lang zh-CN 命令或命令组的完整声明。
 * @lang en Complete declaration of a command or command group.
 */
export interface CommandDocumentationCommand {
  /** @lang zh-CN 工件内命令身份。
   * @lang en Command identity within the artifact.
   */
  id: string;
  /** @lang zh-CN 原bin调用名。
   * @lang en Original bin invocation name.
   */
  executable: string;
  /** @lang zh-CN 有序调用段，根为空数组。
   * @lang en Ordered invocation tokens, empty for a root.
   */
  path: string[];
  /** @lang zh-CN 组或叶。
   * @lang en Group or leaf.
   */
  kind: "group" | "command";
  /** @lang zh-CN 可选别名目标原生身份。
   * @lang en Optional native alias-target identity.
   */
  aliasOf?: string;
  /** @lang zh-CN 原生调用语法。
   * @lang en Native invocation syntax.
   */
  signature: string;
  /** @lang zh-CN 原字段级语言内容。
   * @lang en Original field-level localized content.
   */
  i18n: HiaI18nModel;
  /** @lang zh-CN 独立显示版本身份，值不从包版本猜测。
   * @lang en Independent displayed-version identity, never inferred from the package version.
   */
  displayVersion: {
    /** @lang zh-CN 显示版本所属类别。
     * @lang en Category owning the displayed version.
     */
    kind: "package" | "artifact" | "runner" | "none";
    /** @lang zh-CN 原显示值。
     * @lang en Original display value.
     */
    value: string;
  };
  /** @lang zh-CN 记录帮助优先级和未知参数策略。
   * @lang en Recorded help precedence and unknown-option policy.
   */
  parsing: {
    /** @lang zh-CN 原帮助处理阶段。
     * @lang en Original help-processing stage.
     */
    helpOrder: "before-dispatch" | "after-argument-validation";
    /** @lang zh-CN 原未知参数策略。
     * @lang en Original unknown-option policy.
     */
    unknownOptions: "reject" | "ignore" | "command-specific";
  };
  /** @lang zh-CN 有序命名选项。
   * @lang en Ordered named options.
   */
  options: CommandDocumentationParameter[];
  /** @lang zh-CN 有序位置参数。
   * @lang en Ordered positional parameters.
   */
  positionals: CommandDocumentationParameter[];
  /** @lang zh-CN 仅作为文本保留的调用例子。
   * @lang en Invocation examples retained only as text.
   */
  examples: string[];
  /** @lang zh-CN 已声明的文件和网络效果。
   * @lang en Declared filesystem and network effects.
   */
  effects: {
    /** @lang zh-CN 文件系统效果。
     * @lang en Filesystem effect.
     */
    filesystem: "none" | "read" | "write" | "read-write";
    /** @lang zh-CN 网络效果。
     * @lang en Network effect.
     */
    network: "none" | "explicit";
  };
  /** @lang zh-CN 退出码及其原双语正文。
   * @lang en Exit codes and original bilingual prose.
   */
  exitCodes: Array<{
    /** @lang zh-CN 原非负整数退出码。
     * @lang en Original nonnegative integer exit code.
     */
    code: number;
    /** @lang zh-CN 对应状态的语言内容。
     * @lang en Localized content for this status.
     */
    i18n: HiaI18nModel;
  }>;
  /** @lang zh-CN 命令字段来源。
   * @lang en Command-field provenance.
   */
  evidence: CommandDocumentationEvidence[];
}

/** @lang zh-CN 命令文档0.1.0-draft原始wire数据。
 * @lang en Original command-documentation 0.1.0-draft wire data.
 */
export interface CommandDocumentation {
  /** @lang zh-CN 中性契约名称。
   * @lang en Neutral contract name.
   */
  contract: "command-documentation";
  /** @lang zh-CN 精确草案版本。
   * @lang en Exact draft version.
   */
  contractVersion: "0.1.0-draft";
  /** @lang zh-CN 原包归属及包版本。
   * @lang en Original owning package and package version.
   */
  owner: {
    /** @lang zh-CN 原包名。
     * @lang en Original package name.
     */
    packageName: string;
    /** @lang zh-CN 原包版本。
     * @lang en Original package version.
     */
    packageVersion: string;
  };
  /** @lang zh-CN 显式相对来源与原字节摘要。
   * @lang en Explicit relative sources and original-byte digests.
   */
  sources: Array<{
    /** @lang zh-CN 本工件来源身份。
     * @lang en Source identity in this artifact.
     */
    id: string;
    /** @lang zh-CN 相对宿主授权根的原路径。
     * @lang en Original path relative to the host-authorized root.
     */
    path: string;
    /** @lang zh-CN 原字节SHA-256。
     * @lang en SHA-256 of original bytes.
     */
    sha256: string;
    /** @lang zh-CN 原生来源语言。
     * @lang en Native source language.
     */
    language: string;
  }>;
  /** @lang zh-CN 有序命令声明。
   * @lang en Ordered command declarations.
   */
  commands: CommandDocumentationCommand[];
}

/** @lang zh-CN 宿主从真实解析声明提取的单个参数观察。
 * @lang en Parameter observation extracted by the host from real parser declarations.
 */
export interface CommandDocumentationObservedParameter {
  /** @lang zh-CN 实际参数名称。
   * @lang en Actual parameter name.
   */
  name: string;
  /** @lang zh-CN 实际声明值类型。
   * @lang en Actual declared value type.
   */
  valueType: CommandDocumentationParameter["valueType"];
  /** @lang zh-CN 实际短名。
   * @lang en Actual short name.
   */
  short?: string;
}

/** @lang zh-CN 宿主观察及其提取来源的独立摘要绑定，core比较而不运行解析器。
 * @lang en Host observations independently bound to extraction-source digests, compared by core without running a parser.
 */
export interface CommandDocumentationDeclarationObservation {
  /** @lang zh-CN 所观察命令的原生身份。
   * @lang en Native identity of the observed command.
   */
  commandId: string;
  /** @lang zh-CN 观察所用来源身份到原字节摘要的映射。
   * @lang en Source identities and original-byte digests used for observation.
   */
  sourceDigests: Record<string, string>;
  /** @lang zh-CN 实际命名选项，按名称比较。
   * @lang en Actual named options compared by name.
   */
  options: CommandDocumentationObservedParameter[];
  /** @lang zh-CN 实际位置参数，保留声明顺序。
   * @lang en Actual positional parameters in declaration order.
   */
  positionals: CommandDocumentationObservedParameter[];
}

/** @lang zh-CN 宿主授权读取完成后的内存输入，不含读取回调。
 * @lang en In-memory inputs after host-authorized reading, without reader callbacks.
 */
export interface CommandDocumentationProjectionOptions {
  /** @lang zh-CN 来源身份到原始字节，调用开始时复制，仅做摘要比较。
   * @lang en Source identities and original bytes, copied when called and used only for digest comparison.
   */
  sourceBytes?: ReadonlyMap<string, Uint8Array>;
  /** @lang zh-CN 宿主提供的解析声明观察，缺失时incomplete。
   * @lang en Host parser-declaration observations, incomplete when absent.
   */
  declarations?: readonly CommandDocumentationDeclarationObservation[];
}

/** @lang zh-CN 严格纯投影结果，仅ready携带文档，缺项与冲突分别保留。
 * @lang en Strict pure-projection result, with a document only when ready and separate missing/conflicting states.
 */
export interface CommandDocumentationProjectionResult {
  /** @lang zh-CN 本轮投影状态，不代表系统发行或实际CLI行为验收。
   * @lang en Projection status for this call, independent of system release or actual CLI behavioral acceptance.
   */
  status: "ready" | "incomplete" | "refused";
  /** @lang zh-CN 固定公开诊断，不回显不可信键或原字节。
   * @lang en Fixed public diagnostics excluding untrusted keys and original bytes.
   */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN ready时新建且与输入隔离的HiaDocument。
   * @lang en Fresh input-isolated HiaDocument when ready.
   */
  document?: HiaDocument;
}
