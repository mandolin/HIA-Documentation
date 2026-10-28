/**
 * @file
 * @lang zh-CN 区分源码检查、候选发布资格与显式全已发布恢复核验；只读辅助不执行pack/publish或读取凭据。
 * @lang en Separates source checks, candidate publication eligibility and explicit fully-published resume verification; read-only helpers never pack/publish or read credentials.
 */
import { readNpmPackageVersion } from "./npm-registry.mjs";

/**
 * @lang zh-CN 核已解析发行清单的操作意图；候选数和恢复终态不能互相冒充。
 * @lang en Validates intent for a parsed release plan; candidate counts and terminal resume states cannot stand in for each other.
 * @param {Array<object>} entries <lang><zh-CN>已解析的包条目；不修改。</zh-CN><en>Parsed package entries, never mutated.</en></lang>
 * @param {object} [options] <lang><zh-CN>显式publishReady/resumeVerify/resume，默认仅源码检查。</zh-CN><en>Explicit publishReady/resumeVerify/resume flags, defaulting to source checks.</en></lang>
 * @returns {string} <lang><zh-CN>source、publish-ready或resume-verify。</zh-CN><en>source, publish-ready or resume-verify.</en></lang>
 * @throws {Error} <lang><zh-CN>固定无输入回显的意图拒绝。</zh-CN><en>Fixed intent refusal without input reflection.</en></lang>
 */
export function resolvePublicReleaseIntent(entries, { publishReady = false, resumeVerify = false, resume = false } = {}) {
  // <lang><zh-CN>先排除空/非法状态及互斥模式，避免every空真值或未知状态被算成候选。</zh-CN><en>Reject empty/invalid states and conflicting modes before vacuous every results or unknown states can count as candidates.</en></lang>
  if (!Array.isArray(entries) || entries.length === 0 || entries.some((entry) => !entry || !["published", "candidate", "patch-candidate"].includes(entry.releaseStatus))) {
    throw new Error("Public release intent requires a non-empty valid release plan.");
  }
  if (publishReady && resumeVerify) throw new Error("Publication and resume verification are separate operations.");
  if (resumeVerify) {
    if (!resume || entries.some((entry) => entry.releaseStatus !== "published")) throw new Error("Resume verification requires explicit resume and an entirely published plan.");
    return "resume-verify";
  }
  if (publishReady) {
    if (!entries.some((entry) => entry.releaseStatus === "candidate" || entry.releaseStatus === "patch-candidate")) {
      throw new Error("Publish readiness requires at least one pending candidate.");
    }
    return "publish-ready";
  }
  return "source";
}

/**
 * @lang zh-CN 在显式全已发布终态逐项核registry精确版本；任何缺项或查询失败整体拒绝，无打包/发布/凭据副作用。
 * @lang en Checks every exact registry version for explicit fully-published terminal resume; missing/error results reject the whole operation without packing, publication or credential side effects.
 * @param {object} options <lang><zh-CN>entries、registry、resume及可注入只读readVersion。</zh-CN><en>entries, registry, resume and injectable read-only readVersion.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>全部目标存在时返回模式与计数，不证明源码/归档相同。</zh-CN><en>Mode/count only when all targets exist, without proving source/archive equality.</en></lang>
 * @throws {Error} <lang><zh-CN>意图或registry不确定时固定拒绝。</zh-CN><en>Fixed refusal for invalid intent or uncertain registry state.</en></lang>
 */
export async function verifyPublishedReleaseBatch({ entries, registry, resume, readVersion = readNpmPackageVersion }) {
  resolvePublicReleaseIntent(entries, { resumeVerify: true, resume });
  // <lang><zh-CN>等待所有只读查询结算，错误不能归为已发布；精确registryVersion也须等于目标。</zh-CN><en>Wait for all read-only requests to settle; errors are never published, and exact registryVersion must equal the target.</en></lang>
  const results = await Promise.allSettled(entries.map(async (entry) => readVersion({ registry, name: entry.name, targetVersion: entry.targetVersion })));
  if (results.some((result, index) => result.status !== "fulfilled" || result.value?.status !== "published" || result.value.registryVersion !== entries[index].targetVersion)) {
    throw new Error("Resume verification requires every exact registry target to exist; missing or uncertain targets are refused.");
  }
  return { mode: "resume-verify", verified: entries.length };
}
