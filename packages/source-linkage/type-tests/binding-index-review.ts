/**
 * @file
 * @lang zh-CN 绑定索引四查询的严格公开类型消费者，保留string参数、readonly列表与metadata字段边界。
 * @lang en Strict public type consumer for four binding-index queries, retaining string arguments, readonly lists and metadata field boundaries.
 */
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, findGeneratedTargetsForBinding, findGeneratedBindingsForTarget, findGeneratedBindingsForTargetSymbol, findGeneratedBindingsForDocSourceMapEntry } from "../src/index.js";
// <lang><zh-CN>类型不假设工厂成功；失败索引仍是四查询的合法输入。</zh-CN><en>Types do not assume factory success; failed indexes remain legitimate inputs to all four queries.</en></lang>
const index = createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: createDocSourceMapIndex({}) });
const targets = findGeneratedTargetsForBinding(index, "binding:synthetic");
const bindings = findGeneratedBindingsForTarget(index, "target:synthetic");
findGeneratedBindingsForTargetSymbol(index, "symbol:synthetic");
findGeneratedBindingsForDocSourceMapEntry(index, "entry:synthetic");
// @ts-expect-error Forward identifiers remain required primitive strings.
findGeneratedTargetsForBinding(index, undefined);
// @ts-expect-error Reverse identifiers do not accept null.
findGeneratedBindingsForTarget(index, null);
// @ts-expect-error Boxed strings are not primitive symbol identifiers.
findGeneratedBindingsForTargetSymbol(index, new String("symbol:synthetic"));
// @ts-expect-error Entry identifiers do not accept numeric coercion.
findGeneratedBindingsForDocSourceMapEntry(index, 1);
// @ts-expect-error Query target lists remain readonly.
targets.push(targets[0]!);
// @ts-expect-error Query binding lists remain readonly.
bindings.push(bindings[0]!);
// @ts-expect-error Borrowed scope ancestry lists remain readonly.
bindings[0]!.scope.semanticAncestry.push("another");
// @ts-expect-error Indexed target identity exposes no source body.
targets[0]!.identity.sourceBody;
void [index, targets, bindings];
