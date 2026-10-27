/**
 * @file
 * @lang zh-CN 整组绑定迁移的严格公开类型用例，覆盖可选结果、精确版本和内部接口隔离。
 * @lang en Strict public binding-bundle migration types covering optional results, exact versions and internal API isolation.
 */
import { migrateGeneratedDocumentationBindingBundle, GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION, type GeneratedDocumentationBindingContractVersion, type GeneratedDocumentationBindingBundleMigrationResult, type GeneratedDocumentationBindingMigrationBundle, type GeneratedDocumentationBindingBundleMigrationOptions, type GeneratedBindingRangeEvidence } from "../src/index.js";
// <lang><zh-CN>unknown输入必须经运行时校验；类型本身不承诺工件合法或可公开。</zh-CN><en>Unknown inputs require runtime validation; types alone promise neither valid artifacts nor public safety.</en></lang>
const result: GeneratedDocumentationBindingBundleMigrationResult = migrateGeneratedDocumentationBindingBundle({});
const bundle: GeneratedDocumentationBindingMigrationBundle | undefined = result.bundle;
const versions: GeneratedDocumentationBindingContractVersion[] = [GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION];
// <lang><zh-CN>旧绑定的主意图与贡献证据各有精确原数组序号；0.3目标需显式指定。</zh-CN><en>Old source-intent and contribution evidence each carries exact original ordinals; the 0.3 target is explicit.</en></lang>
const sourceIntentEvidence: GeneratedBindingRangeEvidence = { sidecarIndex: 0, bindingIndex: 0, kind: "sourceIntent", rangeConvention: { endBoundary: "inclusive", columnUnit: "utf16-code-unit" } };
const contributionEvidence: GeneratedBindingRangeEvidence = { sidecarIndex: 0, bindingIndex: 0, kind: "contribution", contributionIndex: 0, rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" } };
const upgrade: GeneratedDocumentationBindingBundleMigrationOptions = { targetVersion: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, bindingRangeEvidence: [sourceIntentEvidence, contributionEvidence], rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "exclusive", columnUnit: "byte" } }] };
const upgraded: GeneratedDocumentationBindingBundleMigrationResult = migrateGeneratedDocumentationBindingBundle({}, upgrade);
// @ts-expect-error <lang><zh-CN>已公开旧版不能被误用作显式新版目标。</zh-CN><en>The previously published generation cannot masquerade as the explicit new target.</en></lang>
const oldTarget: GeneratedDocumentationBindingBundleMigrationOptions = { targetVersion: "0.2.0-draft" };
// @ts-expect-error <lang><zh-CN>主意图证据禁止贡献序号。</zh-CN><en>Source-intent evidence forbids a contribution ordinal.</en></lang>
const impossibleIntent: GeneratedBindingRangeEvidence = { sidecarIndex: 0, bindingIndex: 0, kind: "sourceIntent", contributionIndex: 0, rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" } };
// @ts-expect-error <lang><zh-CN>贡献证据必须有贡献数组序号。</zh-CN><en>Contribution evidence requires its contribution ordinal.</en></lang>
const missingContributionIndex: GeneratedBindingRangeEvidence = { sidecarIndex: 0, bindingIndex: 0, kind: "contribution", rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" } };
// @ts-expect-error A rejected migration never promises a complete bundle.
const guaranteed: GeneratedDocumentationBindingMigrationBundle = result.bundle;
// @ts-expect-error Unknown patches are not precise supported binding versions.
const unknownVersion: GeneratedDocumentationBindingContractVersion = "0.2.1-draft";
// @ts-expect-error Binding 1.0.0 is not a stable commitment.
const prematureStable: GeneratedDocumentationBindingContractVersion = "1.0.0";
// @ts-expect-error Migration returns a status, not an automatic write/publish capability.
result.write();
// @ts-expect-error Internal cloning does not become a public package export.
import { cloneSourceLinkageJsonData } from "../src/index.js";
void [bundle, versions, upgraded, oldTarget, impossibleIntent, missingContributionIndex, guaranteed, unknownVersion, prematureStable, cloneSourceLinkageJsonData];
