/**
 * @file
 * @lang zh-CN 精确配置版本的真实声明消费者；保留宽输入视图，不把类型当作已完成运行时校验。
 * @lang en Actual declaration consumer for exact profile versions, retaining the broad input view without treating types as completed runtime validation.
 */
import { HIA_PROFILE_SCHEMA_VERSION, validateHiaProfile } from "../src/index.js";
import type { HiaDocumentationProfile, HiaProfileSchemaVersion } from "../src/index.js";

// <lang><zh-CN>作者可选择精确版本类型，而既有未知输入interface不被破坏性收窄。</zh-CN><en>Authors may opt into the exact version type while the existing unknown-input interface is not narrowed incompatibly.</en></lang>
const current: HiaProfileSchemaVersion = HIA_PROFILE_SCHEMA_VERSION;
const legacy: HiaProfileSchemaVersion = "0.1.0-draft";
declare const input: HiaDocumentationProfile;
const diagnostics = validateHiaProfile(input);
// @ts-expect-error Unknown patch versions are not members of the exact version type.
const unsupported: HiaProfileSchemaVersion = "1.0.1";
// @ts-expect-error Prerelease compatibility is not implied by the stable root.
const prerelease: HiaProfileSchemaVersion = "1.0.0-rc.1";
// @ts-expect-error The loose input interface is not a proof of supported version identity.
const unproven: HiaProfileSchemaVersion = input.schemaVersion;
void [current, legacy, diagnostics, unsupported, prerelease, unproven];
