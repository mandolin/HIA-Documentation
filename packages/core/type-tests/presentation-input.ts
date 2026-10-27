/**
 * @file
 * @lang zh-CN 严格类型消费者：保持四函数参数、状态联合与只读计划，不扩大运行时拒绝值的公开类型。
 * @lang en Strict type consumer retaining four function parameters, state unions and readonly plans without widening public types for rejected runtime values.
 */
import {
  compareDocumentationPresentationIdentity,
  createDocumentationSourceFetchPlan,
  transitionDocumentationSourceReader,
  validateDocumentationPresentationProfile,
  type DocumentationPresentationProfile,
  type DocumentationSourceFetchPlanResult,
  type DocumentationSourceReaderTransitionResult
} from "@hia-doc/core";
import type { HiaDiagnostic } from "@hia-doc/core";

/** @lang zh-CN 只检查类型，不在导入时执行候选计划。 @lang en Checks types only, without executing candidate plans on import. */
export function checkPresentationInputTypes(profile: DocumentationPresentationProfile, unknownValue: unknown): void {
  const diagnostics: HiaDiagnostic[] = validateDocumentationPresentationProfile(unknownValue);
  const comparison: HiaDiagnostic[] = compareDocumentationPresentationIdentity(profile, unknownValue);
  const result: DocumentationSourceFetchPlanResult = createDocumentationSourceFetchPlan(unknownValue, "asset.fixture");
  const transition: DocumentationSourceReaderTransitionResult = transitionDocumentationSourceReader("idle", "load-requested");
  if (result.plan) {
    // @ts-expect-error Plans retain readonly limits.
    result.plan.limits.maxBytes = 1;
    // @ts-expect-error Plans retain readonly request policy.
    result.plan.request.credentials = "include";
  }
  // @ts-expect-error Arbitrary runtime states are not part of the public union.
  transitionDocumentationSourceReader("toString", "reset");
  // @ts-expect-error Arbitrary runtime events are not part of the public union.
  transitionDocumentationSourceReader("idle", "constructor");
  // @ts-expect-error Asset ids remain primitive strings.
  createDocumentationSourceFetchPlan(profile, 1);
  void [diagnostics, comparison, transition];
}
