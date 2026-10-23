/**
 * @file
 * @lang zh-CN 项目清单公开声明的实际编译消费者；保留宽松输入视图与精确版本/闭集负例。
 * @lang en Actual compile consumer of manifest declarations, retaining loose input views and negative exact-version/closed-set cases.
 */
import { HIA_PROJECT_MANIFEST_SCHEMA_VERSION, validateHiaProjectManifest } from "../src/index.js";
import type { HiaProjectDocsManifest, HiaProjectManifestSchemaVersion, HiaProjectManifestDomain, HiaProjectManifestProducerRef, HiaProjectManifestSemanticPathKind } from "../src/index.js";

// <lang><zh-CN>声明视图保持可表示未完整输入；真正wire必需字段由校验器负责，不伪称TS类型即验收。</zh-CN><en>The declaration view still represents incomplete inputs; the guard owns wire-required fields rather than treating a TS type as acceptance.</en></lang>
const incomplete: HiaProjectDocsManifest = {};
const current: HiaProjectDocsManifest = { schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION, project: { name: "Consumer" }, inputs: [{ kind: "hia-document", path: "public.json" }] };
const legacy: HiaProjectDocsManifest = { ...current, schemaVersion: "0.1.0-draft" };
const reference: HiaProjectDocsManifest = { ...current, profiles: [{ profileId: "owner.fixture", profileVersion: "owner-version" }] };
const diagnostics = validateHiaProjectManifest(legacy, { targetPath: "public.project.json" });
// @ts-expect-error Unknown exact root versions need negotiation. 未知精确根版本须协商。
const unknownVersion: HiaProjectManifestSchemaVersion = "1.0.1";
// @ts-expect-error A prerelease is not an implicit accepted identity. 预发行不是隐式准入身份。
const prerelease: HiaProjectManifestSchemaVersion = "1.0.0-rc.1";
// @ts-expect-error Domains remain a closed set. 聚合领域保持闭集。
const unsupportedDomain: HiaProjectManifestDomain = "python";
// @ts-expect-error Producer failure modes do not silently ignore errors. 生产器错误策略不得静默忽略。
const unsupportedMode: HiaProjectManifestProducerRef["failureMode"] = "ignore";
// @ts-expect-error Semantic kinds are confirmed tokens. 语义种类必须使用已确认token。
const unsupportedKind: HiaProjectManifestSemanticPathKind = "filesystem";
void [incomplete, current, legacy, reference, diagnostics, unknownVersion, prerelease, unsupportedDomain, unsupportedMode, unsupportedKind];
