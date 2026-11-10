/**
 * @file
 * @lang zh-CN 项目CLI从各HIA工件保留裸摘要来源语言，跨工件不借用项目选择语言。
 * @lang en Project CLI regressions preserving bare-summary language per HIA artifact without borrowing project selection language.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createBasicFixtureDocument, type HiaI18nModel } from "@hia-doc/core";
import { runCli } from "./index.js";

it("preserves artifact languages through normal project generation", async () => {
  // <lang><zh-CN>随机临时根仅承载合成公开输入及生成输出，finally只清除此测试根。</zh-CN><en>The random temporary root contains only synthetic public inputs and output, and finally removes only this test root.</en></lang>
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-cli-prose-language-"));
  const messages: string[] = [];
  try {
    for (const locale of ["en", "fr"]) {
      const document = createBasicFixtureDocument();
      document.defaultLocale = locale;
      document.locales = [locale];
      for (const symbol of document.symbols) {
        delete symbol.i18n;
        symbol.id += `-${locale}`;
        symbol.summary = locale === "fr" ? "Résumé public." : "Public original prose.";
      }
      // <lang><zh-CN>去除不相关的导航节点，避免改名后的符号引用干扰来源语言反例。</zh-CN><en>Remove unrelated navigation nodes so renamed symbol references cannot obscure the language regression.</en></lang>
      document.nodes = [];
      await writeFile(path.join(root, `${locale}.hia.json`), JSON.stringify(document));
    }
    await writeFile(path.join(root, "project.json"), JSON.stringify({ schemaVersion: "0.1.0-draft", project: { id: "project:prose-languages", name: "Prose languages", defaultLocale: "zh-CN", locales: ["zh-CN", "en", "fr"] }, inputs: ["en", "fr"].map(locale => ({ kind: "hia-document", path: `${locale}.hia.json` })) }));
    const out = path.join(root, "output");
    const code = await runCli(["docs", "build", "--project-manifest", path.join(root, "project.json"), "--out", out, "--locale", "zh-CN"], { stdout: text => messages.push(text), stderr: text => messages.push(text) });
    expect(code, messages.join("\n")).toBe(0);
    const index = JSON.parse(await readFile(path.join(out, "project-index.json"), "utf8")) as { entries: Array<{ symbolId: string; i18n?: HiaI18nModel; contentPath: string }> };
    for (const locale of ["en", "fr"]) {
      const entry = index.entries.find(item => item.symbolId.endsWith(`-${locale}`))!;
      expect(entry.i18n?.defaultLocale).toBe(locale);
      expect(entry.i18n?.enabled).toBe(false);
      expect(entry.i18n?.fields).toEqual({});
      const html = await readFile(path.join(out, entry.contentPath), "utf8");
      expect(html).toContain(`data-hia-locale="zh-CN" lang="${locale}"`);
      expect(html).toContain(`data-hia-fallback-from="${locale}"`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
