/**
 * @file
 * @lang zh-CN 源码相关七接口39字段及纯计划的严格编译消费者；不在导入时执行。
 * @lang en Strict compile consumer for seven source interfaces, thirty-nine fields and pure planning; no import-time execution.
 */
import { createDocumentationSourceFetchPlan, DOCUMENTATION_PRESENTATION_SOURCE_MODES } from "@hia-doc/core";
import type { DocumentationPresentationDigest, DocumentationPresentationSourceAsset, DocumentationPresentationSourceLimits, DocumentationPresentationSourceReaderPolicy, DocumentationPresentationSourceProfile, DocumentationSourceFetchPlan, DocumentationSourceFetchPlanResult } from "@hia-doc/core";

/** @lang zh-CN 保持原公共结构类型和readonly约束；数值/状态有效性仍由运行时判断。 @lang en Retains public structural types and readonly constraints; numeric/state validity still requires runtime checks. */
export function checkPresentationSourceTypes(digest: DocumentationPresentationDigest, asset: DocumentationPresentationSourceAsset, limits: DocumentationPresentationSourceLimits, policy: DocumentationPresentationSourceReaderPolicy, source: DocumentationPresentationSourceProfile, plan: DocumentationSourceFetchPlan, result: DocumentationSourceFetchPlanResult): void {
  // <lang><zh-CN>普通number不证明限额有效；结果status不会让可选plan变为必填。</zh-CN><en>Ordinary number types do not prove valid limits; result status does not make an optional plan required.</en></lang>
  limits.maxBytes = -1;
  const structuralOnly: DocumentationSourceFetchPlanResult = { status: "ready", diagnostics: [] };
  void [digest, asset, limits, policy, source, plan, structuralOnly, createDocumentationSourceFetchPlan({}, "asset.fixture")];
  // @ts-expect-error Exact optional properties require omission rather than undefined.
  asset.relativeUrl = undefined;
  // @ts-expect-error Source classification remains public only.
  asset.classification = "private";
  // @ts-expect-error Unsupported digest algorithms are outside the vocabulary.
  digest.algorithm = "sha1";
  // @ts-expect-error Credentials must be omitted.
  policy.credentials = "include";
  // @ts-expect-error Normative source default remains fetch.
  source.defaultMode = "link";
  // @ts-expect-error Nested plan limits remain readonly.
  plan.limits.maxBytes = 1;
  if (result.status === "ready") {
    // @ts-expect-error The interface is not a discriminated union.
    const unsafeUrl: string = result.plan.relativeUrl;
    void unsafeUrl;
  }
  // @ts-expect-error The mode vocabulary tuple is readonly at compile time.
  DOCUMENTATION_PRESENTATION_SOURCE_MODES.push("fetch");
}
