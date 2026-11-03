/**
 * @lang zh-CN 官网公开边界回归反例：品牌、编码泄漏、语言与路由拒绝，不依赖网络。
 * @lang en Website boundary regression cases for branding, encoded leaks, and rejected locales/routes; no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPublicText } from "./check-official-web.mjs";
import { href, route } from "../site/src/lib/routes.mjs";

test("Public brand prose remains allowed", () => {
  assert.doesNotThrow(() => assertPublicText("HIA-Documentation-Sys · Documentation for people and AI."));
});

// <lang lang="zh-CN">固定虚构路径，仅验证常见编码和拼接形式，无真实工作区内容。</lang><lang lang="en">Fixed fictitious paths exercise common encodings and compositions without real workspace data.</lang>
for (const leak of ["K:/Project/HIA-Documentation-Sys/", "K:\\Project\\HIA-Documentation-Sys\\", "work-zone/notes", "ai/codex/private", "Github_mandolin", "file:///tmp/input", "/home/sample/project/", "%77ork-zone%2Fnotes", "%2577ork-zone%252Fnotes", "work-zone&#47;notes", "work-zone&sol;notes", String.raw`work-zone\u002fnotes`, String.raw`work-zone\x2fnotes`]) {
  test("Reject private representation: " + leak, () => assert.throws(() => assertPublicText(leak)));
}
test("Unrecognized locales and topics never fall back silently", () => {
  assert.throws(() => route("home", "fr"));
  assert.throws(() => route("../outside", "en"));
  assert.throws(() => href("home", "en", "//external/"));
  assert.throws(() => href("home", "en", "/x/../"));
});
test("Nested translated topics preserve the deployment base", () => {
  assert.equal(href("start", "en"), "/HIA-Documentation/docs/en/learn/start/");
  assert.equal(href("home", "zh-CN"), "/HIA-Documentation/");
});
test("Literal percent cannot hide an encoded private path", () => {
  assert.throws(() => assertPublicText("100% public work%2Dzone%2Fnotes"));
  assert.throws(() => assertPublicText(String.raw`\\server\share\private`));
});
