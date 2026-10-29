/**
 * @file
 * @lang zh-CN 从发行元数据识别已发布包族，不查询registry或把候选目标称为已发布。
 * @lang en Identifies published families from release metadata without querying the registry or calling a candidate target published.
 */

/**
 * @lang zh-CN 判断元数据是否包含已发布目标或不同的旧已发布版本声明；旧版声明须由维护者据实际registry记录维护。
 * @lang en Checks for a published target or a distinct previous-publication declaration; maintainers must substantiate that declaration with actual registry records.
 * @param {object} entry <lang><zh-CN>已解析的发行条目，不修改；支持无预发布标签的三段版本。</zh-CN><en>Parsed release entry, never mutated; supports three-part versions without prerelease tags.</en></lang>
 * @returns {boolean} <lang><zh-CN>元数据支持包族声明时为真，不是registry存在性或目标发布资格证明，无I/O。</zh-CN><en>True when metadata supports a family claim, not proof of registry existence or target release readiness; no I/O.</en></lang>
 */
export function isPublishedPackageFamily(entry) {
  // <lang><zh-CN>只接收明确的版本与状态，不用任意truthy字段填补发布证据。</zh-CN><en>Require explicit versions and states rather than arbitrary truthy publication markers.</en></lang>
  const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
  if (!versionPattern.test(entry?.targetVersion)) return false;
  if (entry.releaseStatus === "published") return true;
  return ["candidate", "patch-candidate"].includes(entry.releaseStatus)
    && versionPattern.test(entry.previousPublishedVersion)
    && entry.previousPublishedVersion !== entry.targetVersion;
}
