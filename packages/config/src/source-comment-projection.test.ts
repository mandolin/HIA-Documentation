import { describe, expect, it } from "vitest";
import {
  HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT,
  HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
  validateHiaProjectConfig
} from "./index.js";

/**
 * @lang zh-CN
 * 构造显式 IA 与独立 source-comment locale 的最小配置。
 *
 * @lang en
 * Builds the minimum configuration with explicit IA and an independent source-comment locale.
 */
function createConfig(): unknown {
  return {
    schemaVersion: "0.1.0",
    docs: {
      renderer: {
        informationArchitecture: {},
        sourceCommentProjection: {
          contract: HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT,
          contractVersion: HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION,
          contentPolicy: "explicit-projected-text",
          locale: "zh-CN"
        },
        uiLocale: "en"
      }
    }
  };
}

describe("source-comment projection config", () => {
  it("keeps UI and source-comment locales independent under explicit IA", () => {
    expect(validateHiaProjectConfig(createConfig())).toEqual([]);
  });

  it("requires explicit IA and canonical source-comment locale", () => {
    const noIa = structuredClone(createConfig()) as {
      docs: { renderer: { informationArchitecture?: unknown } };
    };
    delete noIa.docs.renderer.informationArchitecture;
    expect(validateHiaProjectConfig(noIa).map((diagnostic) => diagnostic.code)).toContain(
      "HIA_CONFIG_SOURCE_COMMENT_IA_REQUIRED"
    );

    const legacyLocale = structuredClone(createConfig()) as {
      docs: { renderer: { sourceCommentProjection: { locale: string } } };
    };
    legacyLocale.docs.renderer.sourceCommentProjection.locale = "zh_CN";
    expect(validateHiaProjectConfig(legacyLocale).map((diagnostic) => diagnostic.code)).toContain(
      "HIA_CONFIG_SOURCE_COMMENT_LOCALE_INVALID"
    );
  });

  it("rejects unknown fields and unsupported draft versions", () => {
    const invalid = structuredClone(createConfig()) as {
      docs: { renderer: { sourceCommentProjection: Record<string, unknown> } };
    };
    invalid.docs.renderer.sourceCommentProjection.contractVersion = "0.2.0-draft";
    invalid.docs.renderer.sourceCommentProjection.sourcePath = "private/source.ts";
    const codes = validateHiaProjectConfig(invalid).map((diagnostic) => diagnostic.code);
    expect(codes).toContain("HIA_CONFIG_SOURCE_COMMENT_VERSION_UNSUPPORTED");
    expect(codes).toContain("HIA_CONFIG_SOURCE_COMMENT_FIELD_UNSUPPORTED");
  });
});
