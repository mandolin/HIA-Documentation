/**
 * @file
 * @lang zh-CN 八项必要契约的固定历史输入与版本拒绝回归；历史期望不依赖当前版本常量。
 * @lang en Fixed historical-input and version-refusal regressions for eight required contracts; historical expectations do not depend on current version constants.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateHiaProjectManifest } from "../../config/src/project-manifest.js";
import { validateHiaDocument } from "../../core/src/validator.js";
import { validateDocumentationPresentationProfile } from "../../core/src/documentation-presentation-profile.js";
import { validateDocumentationUiLocaleCompletenessReport } from "../../core/src/documentation-ui-locale-completeness.js";
import type { HiaDiagnostic } from "../../core/src/model.js";
import { validateHiaProfile } from "../../profile/src/index.js";
import { validateDocumentationProducerDescriptor, validateDocumentationProducerResult } from "../../plugin-sdk/src/index.js";
import { createDocSourceMapIndex, validateDocSourceMap } from "../../source-linkage/src/index.js";

/**
 * @lang zh-CN 一项历史 wire 契约及其 owner 验证入口；版本不从可变源码常量派生。
 * @lang en One historical wire contract and its owner validator; versions are not derived from mutable source constants.
 */
interface HistoricalContract {
  key: string;
  versionField: "schemaVersion" | "contractVersion";
  historicalVersion: string;
  validate: (value: unknown) => HiaDiagnostic[];
}

// <lang><zh-CN>显式列出八项契约，确保不会因当前 catalog 删除某项而悄悄减少测试范围。</zh-CN><en>List all eight explicitly so removing a current catalog entry cannot silently shrink test coverage.</en></lang>
const contracts: HistoricalContract[] = [
  { key: "hia-document", versionField: "schemaVersion", historicalVersion: "0.2.0", validate: validateHiaDocument },
  { key: "project-manifest", versionField: "schemaVersion", historicalVersion: "0.1.0-draft", validate: validateHiaProjectManifest },
  { key: "documentation-profile", versionField: "schemaVersion", historicalVersion: "0.1.0-draft", validate: validateHiaProfile },
  { key: "documentation-producer", versionField: "contractVersion", historicalVersion: "0.1.0-draft", validate: validateDocumentationProducerDescriptor },
  { key: "documentation-producer-result", versionField: "contractVersion", historicalVersion: "0.1.0-draft", validate: validateDocumentationProducerResult },
  { key: "doc-source-map", versionField: "contractVersion", historicalVersion: "0.1.0-draft", validate: validateDocSourceMap },
  { key: "documentation-presentation-profile", versionField: "contractVersion", historicalVersion: "0.1.0-draft", validate: validateDocumentationPresentationProfile },
  { key: "documentation-ui-locale-completeness", versionField: "contractVersion", historicalVersion: "0.1.0-draft", validate: validateDocumentationUiLocaleCompletenessReport }
];

/**
 * @lang zh-CN 每次从固定历史样本读取独立 JSON；测试修改不会污染下一项。
 * @lang en Reads independent JSON from fixed historical samples on every call, preventing mutation from contaminating later cases.
 * @param key <lang><zh-CN>上方闭集中的契约键。</zh-CN><en>Contract key from the closed set above.</en></lang>
 * @returns <lang><zh-CN>允许测试替换版本字段的独立对象。</zh-CN><en>Independent object whose version field can be replaced by a test.</en></lang>
 */
function fixture(key: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/contract-history/${key}.json`, import.meta.url), "utf8"));
}

describe.each(contracts)("historical $key", ({ key, versionField, historicalVersion, validate }) => {
  it("accepts its precise historical version without mutation", () => {
    // <lang><zh-CN>样本和序列化基线独立保存，既检查有效性也检查 pure validator 不改写输入身份。</zh-CN><en>Keep the sample and serialized baseline separately to check validity and that the pure validator does not rewrite its identity.</en></lang>
    const input = fixture(key);
    const before = JSON.stringify(input);
    expect(input[versionField]).toBe(historicalVersion);
    expect(validate(input)).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each(["9.0.0", "0.0.0-unknown", "", null, 1, undefined])("refuses or isolates unsupported version %s", (version) => {
    // <lang><zh-CN>保持其它字段有效，分别覆盖未知版本、空值、类型错误和字段缺失。</zh-CN><en>Keep other fields valid while covering unknown versions, empty values, wrong types, and missing fields.</en></lang>
    const input = fixture(key);
    if (version === undefined) delete input[versionField];
    else input[versionField] = version;
    const diagnostics = validate(input);
    if (key === "doc-source-map") {
      // <lang><zh-CN>既有 source-map API 用独立状态表达版本隔离；warning 不得被误当作 available。</zh-CN><en>The existing source-map API represents version isolation with a separate status; a warning must not be mistaken for available.</en></lang>
      expect(diagnostics.map(({ code }) => code)).toContain("DOC_SOURCE_MAP_UNSUPPORTED_VERSION");
      expect(createDocSourceMapIndex(input).status).not.toBe("available");
    } else {
      expect(diagnostics.some(({ severity }) => severity === "error")).toBe(true);
    }
  });
});
