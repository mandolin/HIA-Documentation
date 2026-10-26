/**
 * @file
 * @lang zh-CN 宿主投影的真实公开类型消费者：保留草案身份、失败状态、只读列表与六项隐私常量。
 * @lang en Real public host-projection type consumer retaining draft identity, failure states, readonly lists and six privacy literals.
 */
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, createGeneratedDocumentationBindingHostProjection, type GeneratedDocumentationBindingHostProjection } from "../src/index.js";
// <lang><zh-CN>失败索引同样是合法工厂结果，类型不把返回状态收窄为available。</zh-CN><en>A failed index remains a valid factory result; the type does not narrow projection status to available.</en></lang>
const index = createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: createDocSourceMapIndex({}) });
const projection: GeneratedDocumentationBindingHostProjection = createGeneratedDocumentationBindingHostProjection(index);
const version: "0.1.0-draft" = projection.contractVersion;
const bodyExcluded: false = projection.privacy.sourceBodyIncluded;
const status: "available" | "invalid" | "unsupported-version" = projection.status;
// @ts-expect-error Raw partial JSON is not a typed prerequisite binding index.
createGeneratedDocumentationBindingHostProjection({});
// @ts-expect-error Required factory index cannot be null in typed calls.
createGeneratedDocumentationBindingHostProjection(null);
// @ts-expect-error Projection binding collections remain readonly.
projection.bindings.push(projection.bindings[0]!);
// @ts-expect-error Member-path collections remain readonly.
projection.bindings[0]!.bindingRef.memberPath.push("another");
// @ts-expect-error Source bodies remain statically excluded.
const included: true = projection.privacy.sourceBodyIncluded;
// @ts-expect-error Projection diagnostics expose no free-text message.
projection.diagnostics[0]!.message;
// @ts-expect-error Target identity exposes no generated range.
projection.bindings[0]!.targets[0]!.identity.range;
// @ts-expect-error Status cannot be treated as always available.
const available: "available" = projection.status;
// <lang><zh-CN>只引用类型测试变量，绝不把此文件当运行时写操作执行。</zh-CN><en>Reference type-test variables only; never execute this file as runtime mutation code.</en></lang>
void [version, bodyExcluded, status, included, available];
