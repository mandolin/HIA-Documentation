/**
 * @file
 * @lang zh-CN 页面/身份19字段的严格类型消费者；类型不替代运行时安全整数和跨字段校验。
 * @lang en Strict consumer for nineteen page/identity fields; types do not replace runtime safe-integer or cross-field checks.
 */
import { DOCUMENTATION_PRESENTATION_PAGE_MODES, compareDocumentationPresentationIdentity, validateDocumentationPresentationProfile } from "@hia-doc/core";
import type { DocumentationPresentationIdentityPolicy, DocumentationPresentationPageMode, DocumentationPresentationPagePartition, DocumentationPresentationTopicProjection } from "@hia-doc/core";

/** @lang zh-CN 只编译不在导入时执行，无效样例须产生真实类型错误。 @lang en Compile only, without import-time execution; invalid examples must cause actual type errors. */
export function checkPresentationIdentityTypes(topic: DocumentationPresentationTopicProjection, partition: DocumentationPresentationPagePartition, policy: DocumentationPresentationIdentityPolicy): void {
  // <lang><zh-CN>字段保持普通可变接口；number和可选singlePageId都不是运行时有效性的证明。</zh-CN><en>Fields remain ordinary mutable interfaces; number and optional singlePageId do not prove runtime validity.</en></lang>
  const mode: DocumentationPresentationPageMode = DOCUMENTATION_PRESENTATION_PAGE_MODES[0];
  topic.order = Number.MAX_SAFE_INTEGER;
  topic.relationIds.push("relation.fixture");
  const structuralOnly: DocumentationPresentationPagePartition = { defaultMode: "multi-page", mode: "single-page", leafTopicPolicy: "fragment", pageTopicKinds: [], topics: [topic] };
  void [mode, structuralOnly, partition, policy, validateDocumentationPresentationProfile(structuralOnly), compareDocumentationPresentationIdentity({}, {})];
  // @ts-expect-error Only the declared page modes are exposed.
  const invalidMode: DocumentationPresentationPageMode = "split-site";
  // @ts-expect-error The normative default is always multi-page.
  partition.defaultMode = "single-page";
  // @ts-expect-error Exact optional properties require omission rather than undefined.
  partition.singlePageId = undefined;
  // @ts-expect-error Topic order is a number, not a numeric string.
  topic.order = "1";
  // @ts-expect-error Stable fields retain their exact tuple order.
  policy.stableFields = ["fragmentId", "topicId", "navigationId", "relationIds"];
  // @ts-expect-error Source mode cannot affect identity.
  policy.sourceModeAffectsIdentity = true;
  // @ts-expect-error The exported mode tuple is readonly at compile time.
  DOCUMENTATION_PRESENTATION_PAGE_MODES.push("multi-page");
  void invalidMode;
}
