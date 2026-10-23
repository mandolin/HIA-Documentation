/**
 * @file
 * @lang zh-CN 文档化配置规范输入API的真实声明正反例；不执行文件读取或扩展稳定语义。
 * @lang en Positive and negative declaration consumers for documentation profile input APIs; no file reads or expansion of stable semantics.
 */
import {
  createHiaProfileSet, loadHiaProfileFromFile, validateHiaProfile
} from "../src/index.js";
import type { HiaDocumentationProfile, HiaLoadedProfile, HiaProfileSet } from "../src/index.js";
import type { HiaDiagnostic } from "@hia-doc/core";

// <lang><zh-CN>未知输入不需要类型断言；校验仍返回诊断而非类型证明。</zh-CN><en>Unknown input requires no cast; validation returns diagnostics rather than a type proof.</en></lang>
declare const unknownInput: unknown;
const errors: HiaDiagnostic[] = validateHiaProfile(unknownInput, { path: "local.profile.json" });
// <lang><zh-CN>集合的静态输入仍要求配置类型；运行时防御不放宽消费者的编译边界。</zh-CN><en>Static set input still requires profile types; runtime defenses do not widen compile-time consumer boundaries.</en></lang>
declare const profile: HiaDocumentationProfile;
const set: HiaProfileSet = createHiaProfileSet({ profiles: [profile] });
const pending: Promise<HiaLoadedProfile> = loadHiaProfileFromFile("local.profile.json");

// @ts-expect-error Validation options require textual caller paths.
validateHiaProfile(unknownInput, { path: 1 });
// @ts-expect-error Sets require profile records, not arbitrary numbers.
createHiaProfileSet({ profiles: [1] });
// @ts-expect-error Loading requires a local path string.
loadHiaProfileFromFile(1);
// @ts-expect-error Diagnostics do not narrow an unknown value to a validated profile.
const unproven: HiaDocumentationProfile = unknownInput;
void [errors, set, pending, unproven];
