/**
 * @file
 * @lang zh-CN 新版映射的必要结构和来源模型B约束；历史宽输入不经过此附加检查。
 * @lang en Required structure and model-B constraints for current maps; legacy permissive inputs bypass these additional checks.
 */
import { DOC_SOURCE_MAP_CONTRACT_VERSION, DOC_SOURCE_MAP_RANGE_SOURCES } from "./constants.js";
import type { DocSourceMapInputIssue } from "./manifest-input.js";

/** @lang zh-CN 预检后的对象视图，仅供结构访问。 @lang en Object view after preflight, for structural access only. */
type Node = Record<string, unknown>;
/**
 * @lang zh-CN 追加新版必需项与来源检查；不猜测工具名称或修改输入，不替代引用/隐私语义检查。
 * @lang en Adds current required-field/provenance checks without guessing tool names or mutating input; does not replace reference/privacy semantic checks.
 * @param value <lang><zh-CN>已通过普通JSON预检的根对象。</zh-CN><en>Root object already passing ordinary-JSON preflight.</en></lang>
 * @returns <lang><zh-CN>静态问题数组；旧版本返回空数组。</zh-CN><en>Static issue array; empty for legacy versions.</en></lang>
 */
export function collectCurrentDocSourceMapIssues(value: Node): DocSourceMapInputIssue[] {
  if (value.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION) return [];
  // <lang><zh-CN>所有路径仅包含固定字段和下标；错误不回显私有正文。</zh-CN><en>All paths contain fixed fields and indices only; errors never echo private bodies.</en></lang>
  const issues: DocSourceMapInputIssue[] = [];
  /** @lang zh-CN 按schema要求确认自有必填项，错型由共享字段检查补充。 @lang en Confirms own required fields from the schema; shared field checks handle wrong types. */
  const required = (node: Node, target: string, keys: readonly string[]): void => {
    for (const key of keys) if (!Object.hasOwn(node, key)) issues.push({ target: `${target}${target ? "." : ""}${key}`, message: "Current mapping requires the declared field." });
  };
  /** @lang zh-CN 仅遍历形状已可访问的对象项，不对错型重复解引用。 @lang en Visits accessible object items only, avoiding dereferencing wrong shapes. */
  const items = (node: Node, key: string, visit: (item: Node, target: string) => void, target = ""): void => {
    if (Array.isArray(node[key])) node[key].forEach((item, index) => { if (object(item)) visit(item, `${target}${target ? "." : ""}${key}[${index}]`); });
  };
  /** @lang zh-CN 类别决定通用语义，具体标签不参与类别/置信度推导。 @lang en Categories determine common semantics; detail labels never infer categories or confidence. */
  const quality = (node: Node, target: string): void => {
    required(node, target, ["rangeSource", "confidence"]);
    if (!(DOC_SOURCE_MAP_RANGE_SOURCES as readonly unknown[]).includes(node.rangeSource)) issues.push({ target: `${target}.rangeSource`, message: "Current provenance must use a supported mechanism category." });
    if (Object.hasOwn(node, "rangeSourceDetail") && (typeof node.rangeSourceDetail !== "string" || !/\S/u.test(node.rangeSourceDetail))) issues.push({ target: `${target}.rangeSourceDetail`, message: "Provenance detail must be a nonblank string." });
    if (node.rangeSource === "unresolved" && node.confidence !== "none") issues.push({ target: `${target}.confidence`, message: "Unresolved provenance requires confidence none." });
  };
  required(value, "", ["contract", "contractVersion", "id", "producer", "artifacts", "sources", "sourceMaps", "chains", "entries", "privacy", "diagnostics"]);
  if (object(value.producer)) required(value.producer, "producer", ["name", "version"]);
  if (object(value.privacy)) required(value.privacy, "privacy", ["sourcesContentPolicy"]);
  for (const key of ["artifacts", "sources"]) items(value, key, (node, target) => { required(node, target, ["id", "kind"]); });
  items(value, "artifacts", (node, target) => { items(node, "contractRefs", (ref, location) => required(ref, location, ["contract", "path"]), target); });
  items(value, "sourceMaps", (node, target) => required(node, target, ["id", "kind", "path"]));
  for (const key of ["generatedBindingSidecars", "localeResolutionSidecars", "localeDiscoverySidecars"]) items(value, key, (node, target) => required(node, target, ["id", "contract", "contractVersion", "path"]));
  items(value, "chains", (node, target) => {
    required(node, target, ["id", "stages"]);
    items(node, "stages", (stage, location) => required(stage, location, ["from", "to", "transform"]), target);
  });
  items(value, "entries", (node, target) => {
    required(node, target, ["id", "kind", "sourceRefs", "artifactRefs", "diagnostics"]);
    for (const key of ["sourceRefs", "artifactRefs"]) items(node, key, quality, target);
    items(node, "generatedBindingRefs", (ref, location) => required(ref, location, ["bindingId", "sidecarId"]), target);
  });
  return issues;
}
/** @lang zh-CN 预检后的普通对象判断，不提供沙箱保证。 @lang en Ordinary-object check after preflight, without a sandbox guarantee. */
function object(value: unknown): value is Node { return typeof value === "object" && value !== null && !Array.isArray(value); }
