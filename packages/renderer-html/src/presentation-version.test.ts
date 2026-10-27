/** @file @lang zh-CN Portal当前呈现身份与局部源码失败策略回归，不执行浏览器或网络。 @lang en Regressions for Portal's current presentation identity and partial source-failure policy without browser/network execution. */
import { describe, expect, it } from "vitest";
import { createDocumentationSourceFetchPlan, validateDocumentationPresentationProfile } from "@hia-doc/core";
import { createPortalPresentationBundle } from "./presentation-profile.js";

describe("Portal presentation current writer", () => {
  it.each([false, true])("writes the current artifact with partial failure=%s", (partial) => {
    const bundle = createPortalPresentationBundle({ projectId: "synthetic", layout: "split-site", sourceMode: "fetch", skinId: "portal.classic", scheme: "system", maxLines: 400,
      topics: [{ entryId: "good", topicKind: "type", relationIds: [] }, { entryId: "missing", topicKind: "type", relationIds: [] }],
      sources: [{ entryId: "good", sourcePath: "src/good.cs", content: "public class Synthetic {}" }, ...(partial ? [{ entryId: "missing", sourcePath: "src/missing.cs" }] : [])] });
    expect(bundle.profile.contractVersion).toBe("1.0.0");
    expect(validateDocumentationPresentationProfile(bundle.profile)).toEqual([]);
    expect(bundle.profile.status).toBe(partial ? "refused" : "ready");
    expect(bundle.profile.source.assets).toHaveLength(1);
    const artifact = bundle.artifacts.find(({ path }) => path === "documentation-presentation-profile.json")!;
    expect(JSON.parse(artifact.contents)).toEqual(bundle.profile);
    expect(createDocumentationSourceFetchPlan(bundle.profile, bundle.profile.source.assets[0]!.assetId).status).toBe("ready");
  });
});
