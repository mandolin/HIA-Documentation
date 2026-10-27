/**
 * @file
 * @lang zh-CN 呈现策略六接口33字段和剩余词汇/schema的严格类型消费者，无导入时执行。
 * @lang en Strict consumer of six policy interfaces, thirty-three fields and remaining vocabulary/schema, without import-time execution.
 */
import { DOCUMENTATION_PRESENTATION_SCHEMES, DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA, DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT, DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION } from "@hia-doc/core";
import type { DocumentationPresentationSkin, DocumentationPresentationThemeProfile, DocumentationPresentationPrivacy, DocumentationPresentationCompatibility, DocumentationPresentationProfile, DocumentationSourceReaderTransitionResult, DocumentationPresentationScheme, DocumentationSourceReaderState, DocumentationSourceReaderEvent } from "@hia-doc/core";

/** @lang zh-CN 编译检查不替代数组覆盖/隐私/状态运行校验，不执行真实主题或状态迁移。 @lang en Compilation does not replace runtime coverage/privacy/state validation and executes no theme or transition. */
export function checkPresentationPolicyTypes(skin: DocumentationPresentationSkin, theme: DocumentationPresentationThemeProfile, privacy: DocumentationPresentationPrivacy, compatibility: DocumentationPresentationCompatibility, profile: DocumentationPresentationProfile, result: DocumentationSourceReaderTransitionResult): void {
  // <lang><zh-CN>接口保持可变，词汇/schema为编译只读；声明本身不证明宿主履约。</zh-CN><en>Interfaces remain mutable while vocabulary/schema are type-readonly; declarations do not prove host conformance.</en></lang>
  const identity: [typeof DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT, typeof DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION] = ["documentation-presentation-profile", "1.0.0"];
  const values: [DocumentationPresentationScheme, DocumentationSourceReaderState, DocumentationSourceReaderEvent] = ["system", "idle", "reset"];
  theme.requiredCapabilities = [];
  result.state = "idle";
  void [identity, values, skin, privacy, compatibility, profile, result];
  // @ts-expect-error The neutral scheme union has no sepia value.
  theme.scheme = "sepia";
  // @ts-expect-error Skin support uses exact neutral schemes.
  skin.supportedSchemes = ["auto"];
  // @ts-expect-error Privacy declarations require literal false.
  privacy.credentialsIncluded = true;
  // @ts-expect-error Compatibility requires exact, not a SemVer range.
  compatibility.versionMatch = "^0.1";
  // @ts-expect-error Unknown patch versions remain unsupported.
  profile.contractVersion = "1.0.1";
  // @ts-expect-error Profile status remains ready/refused only.
  profile.status = "accepted";
  // @ts-expect-error State types do not include arbitrary runtime echoes.
  result.state = "unknown";
  // @ts-expect-error Schema identity is readonly at compile time.
  DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA.$id = "replacement";
  // @ts-expect-error Scheme vocabulary is readonly at compile time.
  DOCUMENTATION_PRESENTATION_SCHEMES.push("dark");
}
