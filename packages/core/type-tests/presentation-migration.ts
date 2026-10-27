/** @file @lang zh-CN 呈现两精确reader、当前writer和迁移判别结果的严格类型；不在导入时执行。 @lang en Strict types for two exact readers, current writers and discriminated migration results; no import-time execution. */
import { migrateDocumentationPresentationProfile } from "@hia-doc/core";
import type { CurrentDocumentationPresentationProfile, DocumentationPresentationProfile, DocumentationPresentationProfileContractVersion, DocumentationPresentationProfileMigrationResult } from "@hia-doc/core";

/** @lang zh-CN 验证旧输入可读而当前输出精确，失败分支不泄漏局部profile。 @lang en Verifies readable legacy inputs, exact current outputs and no partial profile on refusal. */
export function checkPresentationMigrationTypes(profile: DocumentationPresentationProfile, current: CurrentDocumentationPresentationProfile, result: DocumentationPresentationProfileMigrationResult): void {
  // <lang><zh-CN>两种身份均可用于reader，当前writer仍只允许1.0.0。</zh-CN><en>Both identities are readable, while current writers allow only 1.0.0.</en></lang>
  const versions: DocumentationPresentationProfileContractVersion[] = ["0.1.0-draft", "1.0.0"];
  profile.contractVersion = "0.1.0-draft";
  current.contractVersion = "1.0.0";
  const migrated = migrateDocumentationPresentationProfile(profile);
  if (migrated.status === "ready") {
    const exact: "1.0.0" = migrated.profile.contractVersion;
    void exact;
  }
  if (result.status === "refused") {
    // @ts-expect-error A refusal has no partial profile.
    void result.profile;
  }
  void versions;
  // @ts-expect-error Current writers cannot emit the historical identity.
  current.contractVersion = "0.1.0-draft";
  // @ts-expect-error Readers admit no unknown patch version.
  profile.contractVersion = "1.0.1";
  // @ts-expect-error Readers admit no inferred SemVer range.
  profile.contractVersion = "^1";
  // @ts-expect-error Migration statuses are exact.
  result.status = "migrated";
}
