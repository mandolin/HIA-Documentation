/**
 * @file
 * @lang zh-CN 基于调用者内存来源与解析观察的严格命令文档纯投影，不读取文件、执行例子或序列化原始来源字节。
 * @lang en Strict pure command-documentation projection from caller-owned memory sources and parser observations, without file reads, example execution or serialization of source bytes.
 */
import { validateCommandDocumentation } from "./command-documentation-reader.js";
import { validateHiaDocument } from "./validator.js";
import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
} from "./model.js";
import type {
  HiaDiagnostic,
  HiaDocument,
  HiaNode,
  HiaSourceMetadata,
  HiaSymbol,
} from "./model.js";
import type {
  CommandDocumentation,
  CommandDocumentationCommand,
  CommandDocumentationParameter,
  CommandDocumentationDeclarationObservation,
  CommandDocumentationObservedParameter,
  CommandDocumentationProjectionOptions,
  CommandDocumentationProjectionResult,
} from "./command-documentation-model.js";

/** @lang zh-CN 固定公开投影诊断，仅使用控制消息与内部字段路径。
 * @lang en Fixed public projection diagnostics using controlled messages and internal field paths only.
 */
function issue(path: string, incomplete = false): HiaDiagnostic {
  return {
    code: incomplete
      ? "COMMAND_DOCUMENTATION_INCOMPLETE"
      : "COMMAND_DOCUMENTATION_EVIDENCE_MISMATCH",
    severity: incomplete ? "warning" : "error",
    message: incomplete
      ? "命令投影缺少来源或解析观察。 / Command projection lacks sources or parser observations."
      : "命令投影的来源或解析观察冲突。 / Command-projection sources or parser observations conflict.",
    path,
  };
}

/** @lang zh-CN 固定格式返回缺项或拒绝，失败不携带部分文档。
 * @lang en Return missing or refused states in a fixed format without partial documents on failure.
 */
function failure(
  diagnostics: HiaDiagnostic[],
): CommandDocumentationProjectionResult {
  return {
    status: diagnostics.some((item) => item.severity === "error")
      ? "refused"
      : "incomplete",
    diagnostics,
  };
}

/** @lang zh-CN 命名选项按名称匹配，位置参数按顺序匹配，比较宿主实际观察的名称/类型/短名。
 * @lang en Match named options by name and positionals by order, comparing host-observed names, types and short names.
 */
function matchesParameters(
  expected: CommandDocumentationParameter[],
  actual: CommandDocumentationObservedParameter[],
  positional: boolean,
): boolean {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  // <lang><zh-CN>稀疏观察槽位变成显式缺项，位置标签可重复，命名选项仍须唯一。</zh-CN><en>Materialize sparse observation slots as missing items, allowing repeated positional labels while requiring unique option names.</en></lang>
  const rows = Array.from(actual);
  if (
    rows.some(
      (row) =>
        !row ||
        typeof row.name !== "string" ||
        typeof row.valueType !== "string",
    ) ||
    (!positional && new Set(rows.map((row) => row.name)).size !== rows.length)
  )
    return false;
  return expected.every((parameter, index) => {
    // <lang><zh-CN>仅位置参数使用数组顺序，选项声明顺序不影响匹配。</zh-CN><en>Use array order only for positionals, leaving option declaration order irrelevant.</en></lang>
    const observation = positional
      ? rows[index]
      : rows.find((row) => row.name === parameter.name);
    return (
      observation?.name === parameter.name &&
      observation.valueType === parameter.valueType &&
      observation.short === parameter.short
    );
  });
}

/** @lang zh-CN 比较宿主观察及其来源摘要，观察提取的真实性由调用者宿主负责。
 * @lang en Compare host observations and their source digests, with observation extraction owned by the caller's host.
 */
function matchesDeclaration(
  command: CommandDocumentationCommand,
  observation: CommandDocumentationDeclarationObservation,
  sources: Map<string, string>,
): boolean {
  if (
    !observation.sourceDigests ||
    typeof observation.sourceDigests !== "object" ||
    Array.isArray(observation.sourceDigests)
  )
    return false;
  // <lang><zh-CN>宿主独立提供的观察来源必须属于当前工件且摘要相等。</zh-CN><en>Independently supplied observation sources must belong to this artifact and match its digests.</en></lang>
  const bindings = Object.entries(observation.sourceDigests);
  return (
    bindings.length > 0 &&
    bindings.every(
      ([id, digest]) => sources.has(id) && sources.get(id) === digest,
    ) &&
    matchesParameters(command.options, observation.options, false) &&
    matchesParameters(command.positionals, observation.positionals, true)
  );
}

/** @lang zh-CN 以分型JSON元组形成无歧义身份，原native id另存于领域元数据。
 * @lang en Form unambiguous identities from typed JSON tuples, retaining native ids separately in domain metadata.
 */
function symbolId(
  artifact: CommandDocumentation,
  command: CommandDocumentationCommand,
  parameter?: CommandDocumentationParameter,
): string {
  return parameter
    ? "command-parameter:" +
        JSON.stringify([
          artifact.owner.packageName,
          command.id,
          parameter.kind,
          parameter.id,
        ])
    : "command:" + JSON.stringify([artifact.owner.packageName, command.id]);
}

/** @lang zh-CN 仅把声明范围的行号放入通用来源锚点，完整列/终点约定保留于原始描述快照。
 * @lang en Put only the declared range line into generic source anchors, retaining full columns and end conventions in the original description snapshot.
 */
function sourceAnchor(
  artifact: CommandDocumentation,
  owner: CommandDocumentationCommand | CommandDocumentationParameter,
  field: string,
): HiaSourceMetadata | undefined {
  // <lang><zh-CN>按指定字段取首条实存范围，避免把摘要来源冒充签名定义位置。</zh-CN><en>Take the first declared range for the requested field, avoiding summary provenance masquerading as the signature definition.</en></lang>
  const evidence = owner.evidence.find(
    (item) => item.fieldPath === field && item.range,
  );
  if (!evidence?.range) return undefined;
  // <lang><zh-CN>来源存在性已由严格读取器核验，此处只关联原路径及语言。</zh-CN><en>The strict reader has verified source existence, so this step joins only the original path and language.</en></lang>
  const source = artifact.sources.find(
    (item) => item.id === evidence.sourceId,
  )!;
  return {
    model: HIA_SOURCE_MODEL,
    modelVersion: HIA_SOURCE_MODEL_VERSION,
    mode: "link",
    primaryBlock: null,
    definedIn: {
      kind: "defined-in",
      relativePath: source.path,
      language: source.language,
      position: { line: evidence.range.start.line },
    },
  };
}

/** @lang zh-CN 参数签名保留长短名、类型、多值和必选性，默认值仍按原JSON保存在元数据。
 * @lang en Parameter signatures retain names, types, multiplicity and requiredness while defaults remain original JSON in metadata.
 */
function parameterSignature(parameter: CommandDocumentationParameter): string {
  // <lang><zh-CN>显示名沿用调用语法，原始参数身份不依赖该文本。</zh-CN><en>The display name follows invocation syntax while native parameter identity remains independent of the text.</en></lang>
  const name =
    parameter.kind === "option"
      ? parameter.short
        ? `-${parameter.short}, --${parameter.name}`
        : `--${parameter.name}`
      : parameter.name;
  // <lang><zh-CN>布尔开关省略值槽，其它类型保留值类型及可重复标识。</zh-CN><en>Boolean switches omit the value slot while other types retain their value type and repetition marker.</en></lang>
  const value =
    parameter.valueType === "boolean" && parameter.kind === "option"
      ? ""
      : ` <${parameter.valueType}${parameter.multiple ? "..." : ""}>`;
  return parameter.required ? name + value : `[${name}${value}]`;
}

/** @lang zh-CN 将已验证快照投影到既有文档模型，所有输出数据与调用者输入隔离。
 * @lang en Project a verified snapshot into the existing document model with all output data isolated from caller input.
 */
function project(artifact: CommandDocumentation): HiaDocument {
  // <lang><zh-CN>先创建所有命令节点与组索引，允许子声明出现在其组之前。</zh-CN><en>Create command nodes and group indexes first, allowing children to precede their groups.</en></lang>
  const nodes = new Map(
    artifact.commands.map((command) => [
      command.id,
      {
        id: symbolId(artifact, command),
        kind: "operation",
        title: [command.executable, ...command.path].join(" "),
        symbolIds: [symbolId(artifact, command)],
        children: [],
      } as HiaNode,
    ]),
  );
  // <lang><zh-CN>组索引按可执行文件及路径元组区分，相同文本标签不构成同一组。</zh-CN><en>Index groups by executable and path tuples, keeping identical labels distinct.</en></lang>
  const groups = new Map(
    artifact.commands
      .filter((command) => command.kind === "group")
      .map((command) => [
        JSON.stringify([command.executable, command.path]),
        command,
      ]),
  );
  // <lang><zh-CN>这些独立容器只累计本次投影，避免跨调用共享可变输出。</zh-CN><en>These isolated containers accumulate this projection only, avoiding mutable output shared across calls.</en></lang>
  const symbols: HiaSymbol[] = [];
  const roots: HiaNode[] = [];
  const locales = new Set<string>();
  for (const command of artifact.commands) {
    // <lang><zh-CN>节点均由前置全量建表取得，父组可位于后续声明。</zh-CN><en>Retrieve nodes from the complete initial table, allowing parent groups to occur later.</en></lang>
    const node = nodes.get(command.id)!;
    let parent: CommandDocumentationCommand | undefined;
    // <lang><zh-CN>只关联已声明的最近祖先组，不补造缺失组或按标签合并。</zh-CN><en>Join only the nearest declared ancestor group without inventing missing groups or merging labels.</en></lang>
    for (let depth = command.path.length - 1; depth >= 0; depth--) {
      parent = groups.get(
        JSON.stringify([command.executable, command.path.slice(0, depth)]),
      );
      if (parent) break;
    }
    if (parent) nodes.get(parent.id)!.children!.push(node);
    else roots.push(node);
    // <lang><zh-CN>每个命令复制其语言字段，别名保留独立调用身份并关联目标。</zh-CN><en>Copy locale fields per command, preserving independent alias invocation identities and target links.</en></lang>
    const symbol: HiaSymbol = {
      id: node.id,
      name: node.title,
      longname: node.title,
      kind: command.kind === "group" ? "command-group" : "command",
      path: [command.executable, ...command.path],
      signature: command.signature,
      i18n: structuredClone(command.i18n),
      metadata: {
        commandDocumentation: {
          nativeId: command.id,
          ...(command.aliasOf
            ? {
                aliasOf: symbolId(
                  artifact,
                  artifact.commands.find(
                    (item) => item.id === command.aliasOf,
                  )!,
                ),
              }
            : {}),
        },
      },
    };
    if (parent) symbol.parentId = symbolId(artifact, parent);
    // <lang><zh-CN>锚点只暴露声明行，完整原范围留在领域快照。</zh-CN><en>Expose only declared source lines, keeping complete original ranges in the domain snapshot.</en></lang>
    const source = sourceAnchor(artifact, command, "signature");
    if (source) symbol.source = source;
    symbols.push(symbol);
    for (const locale of command.i18n.locales) locales.add(locale);
    for (const exit of command.exitCodes)
      for (const locale of exit.i18n.locales) locales.add(locale);
    for (const parameter of [...command.options, ...command.positionals]) {
      // <lang><zh-CN>参数以原生命令及参数身份形成键，重复的位置标签也保持独立。</zh-CN><en>Key parameters by native command and parameter identities, retaining distinct repeated positional labels.</en></lang>
      const id = symbolId(artifact, command, parameter);
      const name =
        parameter.kind === "option" ? "--" + parameter.name : parameter.name;
      // <lang><zh-CN>参数节点复制正文与签名，不与原描述或文档快照共享语言对象。</zh-CN><en>Parameter symbols copy prose and signatures without sharing locale objects with input or document snapshots.</en></lang>
      const child: HiaSymbol = {
        id,
        name,
        kind: parameter.kind === "option" ? "option" : "argument",
        parentId: symbol.id,
        path: [...symbol.path!, name],
        signature: parameterSignature(parameter),
        i18n: structuredClone(parameter.i18n),
        metadata: {
          commandDocumentation: {
            commandId: command.id,
            nativeId: parameter.id,
            kind: parameter.kind,
          },
        },
      };
      // <lang><zh-CN>参数名称来源与命令签名来源独立选择。</zh-CN><en>Select parameter-name provenance independently of command-signature provenance.</en></lang>
      const parameterSource = sourceAnchor(artifact, parameter, "name");
      if (parameterSource) child.source = parameterSource;
      symbols.push(child);
      node.children!.push({
        id,
        kind: "operation",
        title: name,
        symbolIds: [id],
      });
      for (const locale of parameter.i18n.locales) locales.add(locale);
    }
  }
  return {
    schemaVersion: HIA_CORE_CONTRACT_VERSION,
    id:
      "command-documentation:" +
      JSON.stringify([
        artifact.owner.packageName,
        artifact.owner.packageVersion,
      ]),
    title: artifact.owner.packageName + " 命令参考 / Command reference",
    defaultLocale: artifact.commands[0]!.i18n.defaultLocale,
    locales: [...locales],
    nodes: roots,
    symbols,
    metadata: {
      commandDocumentation: {
        artifact: structuredClone(artifact),
        verification: {
          sourceBytes: "matched",
          declarationObservations: "host-observation-matched",
          rangeCoordinates: "declared",
        },
      },
    },
  };
}

/**
 * @lang zh-CN 从描述及宿主授权取得的内存原字节/解析观察生成HiaDocument。同步阶段复制所有输入，缺项incomplete，冲突refused，只有ready携带新文档。不读文件、访问网络、运行命令或证明观察提取器及范围坐标的正确性。
 * @lang en Produce a HiaDocument from descriptions and host-authorized memory bytes/parser observations. Copies inputs synchronously, returns incomplete for missing evidence and refused for conflicts, with a fresh document only when ready. Performs no file/network/command IO and does not prove extractor correctness or range coordinates.
 * @param value <lang><zh-CN>未知命令描述wire对象。</zh-CN><en>Unknown command-description wire object.</en></lang>
 * @param options <lang><zh-CN>受信宿主内存数据，缺省为空，不是读取授权或回调。</zh-CN><en>Trusted host memory data, empty by default, without reader authorization or callbacks.</en></lang>
 * @returns <lang><zh-CN>确定性投影结果，源码字节和观察原文不进入文档。</zh-CN><en>Deterministic projection result excluding source bytes and observation payloads from the document.</en></lang>
 */
export async function produceCommandDocumentation(
  value: unknown,
  options: CommandDocumentationProjectionOptions = {},
): Promise<CommandDocumentationProjectionResult> {
  // <lang><zh-CN>先核wire图与关联，缺项或冲突均不输出部分文档。</zh-CN><en>Validate the wire graph and relationships first, withholding partial documents for missing or conflicting evidence.</en></lang>
  const diagnostics = validateCommandDocumentation(value);
  if (diagnostics.some((item) => item.severity === "error"))
    return failure(diagnostics);
  // <lang><zh-CN>同步快照容器跨越摘要await，调用者后续修改不影响本轮。</zh-CN><en>Synchronous snapshot containers survive digest awaits, isolating this call from later caller mutations.</en></lang>
  let artifact: CommandDocumentation;
  let declarations: CommandDocumentationDeclarationObservation[];
  const bytes = new Map<string, Uint8Array>();
  try {
    // <lang><zh-CN>所有拷贝发生在首次await之前，Buffer也用Uint8Array构造器复制，避免slice共享底层存储。</zh-CN><en>Copy everything before the first await, using Uint8Array construction even for Buffer to avoid shared storage from slice.</en></lang>
    artifact = structuredClone(value) as CommandDocumentation;
    declarations = structuredClone(
      options.declarations ?? [],
    ) as CommandDocumentationDeclarationObservation[];
    for (const source of artifact.sources) {
      // <lang><zh-CN>仅取清单声明的内存来源，额外宿主来源不会被读取或发布。</zh-CN><en>Read only memory sources declared by the inventory, leaving extra host sources unread and unpublished.</en></lang>
      const content = options.sourceBytes?.get(source.id);
      if (content !== undefined) {
        if (
          !ArrayBuffer.isView(content) ||
          Object.prototype.toString.call(content) !== "[object Uint8Array]"
        )
          return failure([issue("sources")]);
        bytes.set(source.id, new Uint8Array(content));
      }
    }
    if (
      !Array.isArray(declarations) ||
      Array.from(declarations).some(
        (item) => !item || typeof item.commandId !== "string",
      ) ||
      new Set(declarations.map((item) => item.commandId)).size !==
        declarations.length
    )
      return failure([issue("declarations")]);
  } catch {
    return failure([issue("")]);
  }
  // <lang><zh-CN>声明摘要索引用于核观察来源，实际字节在下方逐项重算。</zh-CN><en>Index declared digests for observation provenance, recomputing actual source-byte digests below.</en></lang>
  const sourceDigests = new Map(
    artifact.sources.map((source) => [source.id, source.sha256]),
  );
  for (const [index, source] of artifact.sources.entries()) {
    // <lang><zh-CN>缺字节保留未核状态，空字节数组仍是可摘要的真实输入。</zh-CN><en>Missing bytes remain unverified while empty byte arrays remain valid digest inputs.</en></lang>
    const content = bytes.get(source.id);
    if (!content) {
      diagnostics.push(issue(`sources.${index}`, true));
      continue;
    }
    try {
      // <lang><zh-CN>原生SHA-256仅处理已复制内存，摘要由字节组成固定小写十六进制。</zh-CN><en>Native SHA-256 operates only on copied memory and emits fixed lowercase hexadecimal bytes.</en></lang>
      const digest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        new Uint8Array(content),
      );
      // <lang><zh-CN>固定小写编码与schema摘要表示逐字比较。</zh-CN><en>Compare the fixed lowercase encoding exactly against the schema digest representation.</en></lang>
      const hex = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (hex !== source.sha256) diagnostics.push(issue(`sources.${index}`));
    } catch {
      diagnostics.push(issue(`sources.${index}`, true));
    }
  }
  // <lang><zh-CN>观察身份已去重，额外命令观察允许宿主复用包级观察表。</zh-CN><en>Observation identities are already unique, allowing extra commands so hosts can reuse package-wide observation tables.</en></lang>
  const observed = new Map(declarations.map((item) => [item.commandId, item]));
  for (const [index, command] of artifact.commands.entries()) {
    // <lang><zh-CN>每个描述命令均需对应观察，缺项与实际冲突分别诊断。</zh-CN><en>Every described command requires a matching observation, distinguishing missing entries from actual conflicts.</en></lang>
    const declaration = observed.get(command.id);
    if (!declaration) diagnostics.push(issue(`commands.${index}`, true));
    else if (!matchesDeclaration(command, declaration, sourceDigests))
      diagnostics.push(issue(`commands.${index}`));
  }
  if (diagnostics.length) return failure(diagnostics);
  try {
    // <lang><zh-CN>最后用既有模型验证完整输出，投影异常转为固定公开拒绝诊断。</zh-CN><en>Finally validate the complete output with the existing model, converting projection failures into fixed public refusal diagnostics.</en></lang>
    const document = project(artifact);
    if (validateHiaDocument(document).length) return failure([issue("")]);
    return { status: "ready", diagnostics: [], document };
  } catch {
    return failure([issue("")]);
  }
}
