/**
 * @file
 * @lang zh-CN 已发布包族与新版本候选必须分开，缺少旧版证据时不能凭candidate宣称包已发布。
 * @lang en Published package families remain distinct from new-version candidates; a candidate alone cannot establish publication without previous-version evidence.
 */
import {describe, expect, it} from "vitest";
import {isPublishedPackageFamily} from "../scripts/lib/public-package-family.mjs";

describe("public package family publication", () => {
  /** @lang zh-CN 仅已发布目标或明确不同的旧已发布版本可支持包族声明。 @lang en Only a published target or an explicit distinct previously published version supports the family claim. */
  it.each(["candidate", "patch-candidate"])("requires separate prior publication evidence for %s", (releaseStatus) => {
    const entry = {releaseStatus, targetVersion: "1.0.0"};
    expect(isPublishedPackageFamily(entry)).toBe(false);
    expect(isPublishedPackageFamily({...entry, previousPublishedVersion: "0.1.2"})).toBe(true);
    for (const previousPublishedVersion of ["1.0.0", "", "not-a-version", "0.1.2-private", null]) {
      expect(isPublishedPackageFamily({...entry, previousPublishedVersion})).toBe(false);
    }
    expect(entry).toEqual({releaseStatus, targetVersion: "1.0.0"});
  });
  /** @lang zh-CN 精确已发布状态保留，未知状态不能冒充发布。 @lang en Exact published status remains valid, while unknown states cannot imply publication. */
  it("preserves published targets and refuses unknown states", () => {
    expect(isPublishedPackageFamily({releaseStatus: "published", targetVersion: "0.1.0"})).toBe(true);
    expect(isPublishedPackageFamily({releaseStatus: "unknown", targetVersion: "1.0.0", previousPublishedVersion: "0.1.0"})).toBe(false);
  });
});
