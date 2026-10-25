/**
 * @file
 * @lang zh-CN 对预检后的旧绑定工件补充已声明字段检查；保留未知可选扩展，不实现通用schema引擎。
 * @lang en Adds declared-field checks to preflighted legacy binding artifacts, retaining unknown optional extensions without implementing a general schema engine.
 */

/** @lang zh-CN 已通过普通JSON图预检的对象视图。 @lang en Object view after ordinary-JSON graph preflight. */
type Node = Record<string, unknown>;
/** @lang zh-CN 固定字段定位与固定说明，不包含输入正文。 @lang en Fixed field location and explanation without input bodies. */
export interface BindingInputIssue {
  /** @lang zh-CN 仅由固定字段与数字下标组成的相对定位。 @lang en Relative location containing fixed fields and numeric indices only. */
  target: string;
  /** @lang zh-CN 不回显被拒绝的值。 @lang en Does not echo rejected values. */
  message: string;
}

/**
 * @lang zh-CN 检查已消费字段的类型/枚举/const，配合既有跨集合validator使用；不修改工件。
 * @lang en Checks consumed field types/enums/constants alongside the existing cross-collection validator without mutating artifacts.
 * @param value <lang><zh-CN>已通过普通JSON预检的根对象。</zh-CN><en>Root object passing ordinary-JSON preflight.</en></lang>
 * @returns <lang><zh-CN>固定诊断素材，不宣称完整schema验证。</zh-CN><en>Fixed diagnostic material, without claiming complete schema validation.</en></lang>
 */
export function collectBindingInputIssues(value: Node): BindingInputIssue[] {
  // <lang><zh-CN>问题路径只由下方固定模型键生成，未知扩展键不写入诊断。</zh-CN><en>Issue paths use fixed model keys below; unknown extension keys never enter diagnostics.</en></lang>
  const issues: BindingInputIssue[] = [];
  /** @lang zh-CN 登记固定类型错误，不包含实际值。 @lang en Records a fixed type error without the actual value. */
  const issue = (target: string): void => { issues.push({ target, message: "Declared binding field has an invalid type or value." }); };
  /** @lang zh-CN 仅检查已声明可选字符串，缺省继续兼容。 @lang en Checks declared optional strings only, preserving omissions. */
  const strings = (node: Node, target: string, keys: readonly string[]): void => {
    for (const key of keys) if (Object.hasOwn(node, key) && !text(node[key])) issue(`${target}.${key}`);
  };
  /** @lang zh-CN 按既有枚举核必需字段，不猜测别名。 @lang en Checks required fields against existing enums without guessing aliases. */
  const enumeration = (node: Node, target: string, key: string, allowed: readonly string[]): void => {
    if (!allowed.includes(node[key] as string)) issue(`${target}.${key}`);
  };
  /** @lang zh-CN 已声明的字符串列表不能含会在投影时丢失的非法成员。 @lang en Declared string lists cannot contain invalid members that projection would discard. */
  const stringList = (node: Node, target: string, key: string): void => {
    if (Object.hasOwn(node, key) && (!Array.isArray(node[key]) || !(node[key] as unknown[]).every(text))) issue(`${target}.${key}`);
  };

  // <lang><zh-CN>兼容声明是冻结wire的一部分，不能让错误最低版本或政策被静默接受。</zh-CN><en>Compatibility declarations are part of the frozen wire and cannot silently admit wrong minimum versions or policies.</en></lang>
  if (!record(value.compatibility)
    || value.compatibility.minimumConsumerContractVersion !== value.contractVersion
    || value.compatibility.unknownFieldPolicy !== "ignore-unknown-optional-fields"
    || value.compatibility.breakingChangePolicy !== "new-contract-version-and-schema-id") issue("compatibility");
  if (record(value.docSourceMapLinkage)) strings(value.docSourceMapLinkage, "docSourceMapLinkage", ["docSourceMapId"]);
  if (record(value.deterministicLocalsPolicy)) {
    // <lang><zh-CN>这里只检查政策摘要，不读取或推导任何locals值。</zh-CN><en>Check the policy summary only, without reading or inferring locals values.</en></lang>
    const policy = value.deterministicLocalsPolicy;
    enumeration(policy, "deterministicLocalsPolicy", "mode", ["none", "deterministic-json-compatible"]);
    strings(policy, "deterministicLocalsPolicy", ["inputId"]);
    stringList(policy, "deterministicLocalsPolicy", "bindingAllowlist");
    if (Array.isArray(policy.prohibitedSources) && policy.prohibitedSources.some((source) => !["process-environment", "network", "provider", "host-editor", "implicit-runtime-capture"].includes(source as string))) issue("deterministicLocalsPolicy.prohibitedSources");
  }

  for (const [index, binding] of records(value.bindings).entries()) {
    // <lang><zh-CN>下标只定位当前声明；非法集合项由外层validator另报，不变成成功条目。</zh-CN><en>Indices locate declarations; invalid collection members are diagnosed by the outer validator and never become successful entries.</en></lang>
    const target = `bindings.${index}`;
    if (record(binding.sourceIntent)) strings(binding.sourceIntent, `${target}.sourceIntent`, ["field", "locale"]);
    if (record(binding.bindingRef)) {
      enumeration(binding.bindingRef, `${target}.bindingRef`, "kind", ["identifier", "member-path", "adapter-defined"]);
      strings(binding.bindingRef, `${target}.bindingRef`, ["adapterReferenceId"]);
      stringList(binding.bindingRef, `${target}.bindingRef`, "memberPath");
    }
    if (record(binding.scope)) {
      stringList(binding.scope, `${target}.scope`, "aliasMetadata");
      strings(binding.scope, `${target}.scope`, ["stableUpstreamId"]);
    }
    if (record(binding.composition)) {
      enumeration(binding.composition, `${target}.composition`, "mergePolicy", ["not-applicable", "nearest-explicit-child-wins", "ordered-contribution", "compose-in-linked-order", "same-precedence-singleton-conflict"]);
      for (const [offset, contribution] of records(binding.composition.contributions).entries()) {
        // <lang><zh-CN>贡献项保留自己的覆盖上下文，不能用外层relation替代其mode。</zh-CN><en>Contributions retain their own override context; the outer relation cannot substitute for their mode.</en></lang>
        const location = `${target}.composition.contributions.${offset}`;
        enumeration(contribution, location, "mode", ["base", "replace", "append", "prepend", "include"]);
        if (record(contribution.overrideContext)) {
          enumeration(contribution.overrideContext, `${location}.overrideContext`, "kind", ["none", "base", "child", "include", "adapter-defined"]);
          strings(contribution.overrideContext, `${location}.overrideContext`, ["contextId"]);
        }
      }
    }
  }
  for (const [index, target] of records(value.targets).entries()) {
    if (record(target.identity)) strings(target.identity, `targets.${index}.identity`, ["artifactId", "symbolId", "selector"]);
  }
  for (const [index, expansion] of records(value.expansions).entries()) {
    if (record(expansion.instanceKey) && expansion.instanceKey.status === "stable") enumeration(expansion.instanceKey, `expansions.${index}.instanceKey`, "origin", ["explicit-instance-key", "each-object-key", "meta-schema-stable-id", "generated-target-stable-id"]);
  }
  for (const [index, diagnostic] of records(value.diagnostics).entries()) strings(diagnostic, `diagnostics.${index}`, ["subjectId"]);
  return issues;
}

/** @lang zh-CN 预检后的对象项视图，非法项由外层validator明确诊断。 @lang en Object-item view after preflight; the outer validator explicitly diagnoses invalid members. */
function records(value: unknown): Node[] { return Array.isArray(value) ? value.filter(record) : []; }
/** @lang zh-CN 沿用旧schema的minLength1，不额外裁剪或改写身份。 @lang en Retains legacy schema minLength one without trimming or rewriting identities. */
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** @lang zh-CN 普通JSON预检后的对象形状，不单独提供沙箱保证。 @lang en Object shape after ordinary-JSON preflight, without a separate sandbox guarantee. */
function record(value: unknown): value is Node { return typeof value === "object" && value !== null && !Array.isArray(value); }
