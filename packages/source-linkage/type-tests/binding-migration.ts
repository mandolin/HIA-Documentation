/**
 * @file
 * @lang zh-CN 整组绑定迁移的严格公开类型用例，覆盖可选结果、精确版本和内部接口隔离。
 * @lang en Strict public binding-bundle migration types covering optional results, exact versions and internal API isolation.
 */
import { migrateGeneratedDocumentationBindingBundle, GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION, type GeneratedDocumentationBindingContractVersion, type GeneratedDocumentationBindingBundleMigrationResult, type GeneratedDocumentationBindingMigrationBundle } from "../src/index.js";
// <lang><zh-CN>unknown输入必须经运行时校验；类型本身不承诺工件合法或可公开。</zh-CN><en>Unknown inputs require runtime validation; types alone promise neither valid artifacts nor public safety.</en></lang>
const result: GeneratedDocumentationBindingBundleMigrationResult = migrateGeneratedDocumentationBindingBundle({});
const bundle: GeneratedDocumentationBindingMigrationBundle | undefined = result.bundle;
const versions: GeneratedDocumentationBindingContractVersion[] = [GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION];
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
void [bundle, versions, guaranteed, unknownVersion, prematureStable, cloneSourceLinkageJsonData];
