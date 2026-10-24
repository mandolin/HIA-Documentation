/**
 * @file
 * @lang zh-CN 验证可消费的主题名、安全颜色与共享资产配置；不把URL引用当成文件写入授权。
 * @lang en Validates implemented theme names, safe colors and shared-asset configuration, without treating URL references as filesystem-write authorization.
 */
import { describe, expect, it } from "vitest";
import { hasConfigErrors, validateHiaProjectConfig } from "./index.js";

/** @lang zh-CN 只改变合成theme对象，沿用实际项目配置校验入口。 @lang en Changes only a synthetic theme object while using the actual project-config validator. */
function diagnostics(theme: unknown) { return validateHiaProjectConfig({ schemaVersion: "0.1.0", docs: { theme } }); }

describe("theme brand configuration", () => {
  it("accepts host brand colors", () => {
    expect(diagnostics({ name: "default", colors: { accent: "#0f4f82", border: "#ccd6e0" } })).toEqual([]);
  });

  it.each(["portal.classic", "portal.graphite", "portal.lumen"])("recognizes implemented theme name %s", (name) => {
    expect(diagnostics({ name })).toEqual([]);
  });

  it.each([{ accent: "url(https://example.com/)" }, { accent: "#12345" }, { accent: "#fff\n" }, { accent: 1 }, { privateToken: "#fff" }, [], null])("rejects invalid colors %#", (colors) => {
    expect(hasConfigErrors(diagnostics({ colors }))).toBe(true);
  });

  it.each(["../../assets/", "/docs/assets/", "./shared/", "assets/"])("accepts explicit external same-site asset reference %s", (baseUrl) => {
    expect(diagnostics({ assets: { mode: "external", baseUrl } })).toEqual([]);
  });

  it.each([
    { mode: "external" }, { mode: "invalid", baseUrl: "./" }, { mode: "local", baseUrl: "../" },
    ...["https://example.com/", "//example.com/", "javascript:alert(1)", "data:text/css,x", "../x?private=1", "../x#fragment", "..\\assets\\", "../\nassets/"].map((baseUrl) => ({ mode: "external", baseUrl }))
  ])("rejects ambiguous or unsafe asset options %#", (assets) => {
    expect(hasConfigErrors(diagnostics({ assets }))).toBe(true);
  });
});
