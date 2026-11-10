/**
 * @file
 * @lang zh-CN 独立导航CLI输入的有界读取、拒绝与正常项目生成回归。
 * @lang en Bounded reads, refusals, and normal project-generation regressions for independent navigation CLI input.
 */
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "./index.js";
import { createGeneratedSiteNavigation } from "../../../site/src/lib/generated-navigation.mjs";

/**
 * @lang zh-CN 自有临时目录中的命令输入和输出，业务仓不参与。
 * @lang en Command inputs and output in an owned temporary directory, without business repositories.
 */
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-navigation-"));
  const navigation = path.join(root, "navigation.json");
  const config = path.join(root, "hia.config.json");
  const output = path.join(root, "output");
  const messages: string[] = [];
  const io: CliIo = { cwd: process.cwd(), stdout: message => messages.push(message), stderr: message => messages.push(message) };
  await writeFile(navigation, JSON.stringify(createGeneratedSiteNavigation()));
  await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { renderer: { projectLayout: "split-site", uiLocale: "en", informationArchitecture: { contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate" } } } }));
  const args = ["docs", "build", "--project-manifest", "fixtures/project-mixed.hia-project.json", "--config", config, "--site-navigation", navigation, "--out", output];
  return { root, navigation, config, output, messages, io, args };
}

describe("docs build --site-navigation", () => {
  it("accepts the normal project entry point and emits one shared asset and a recomputed message report", async () => {
    const input = await fixture();
    try {
      expect(await runCli(input.args, input.io)).toBe(0);
      const html = await readFile(path.join(input.output, "index.html"), "utf8");
      expect(html).toContain("HIA-Documentation-Sys");
      expect(html).toContain('data-hia-site-navigation');
      expect(html).toContain('href="/HIA-Documentation/docs/en/reference/"');
      expect(html).toContain('>Code reference</span>');
      const manifest = JSON.parse(await readFile(path.join(input.output, "hia-manifest.json"), "utf8"));
      expect(manifest.files.filter((file: { path: string }) => file.path === "assets/hia-site-navigation.css")).toHaveLength(1);
      expect(manifest.files.filter((file: { path: string }) => file.path === "assets/hia-site-reading.js")).toHaveLength(1);
      const report = await readFile(path.join(input.output, "documentation-ui-locale-completeness.json"), "utf8");
      expect(JSON.parse(report).status).toBe("complete");
      expect(report).toContain("site.primary.docs");
      expect(report).not.toContain("HIA-Documentation-Sys");
    } finally { await rm(input.root, { recursive: true, force: true }); }
  });

  it.each(["malformed", "missing-locale", "outside-base", "oversized", "invalid-utf8", "missing-file", "missing-ui-locale", "single-document", "manifest-asset-collision", "manifest-reader-collision", "manifest-report-collision"])("rejects %s before creating the output", async scenario => {
    const input = await fixture();
    try {
      const navigation = createGeneratedSiteNavigation();
      if (scenario === "malformed") await writeFile(input.navigation, "{");
      if (scenario === "missing-locale") { delete (navigation.localeTargets as Partial<typeof navigation.localeTargets>).en; await writeFile(input.navigation, JSON.stringify(navigation)); }
      if (scenario === "outside-base") { navigation.localeTargets.en = "/private/"; await writeFile(input.navigation, JSON.stringify(navigation)); }
      if (scenario === "oversized") await writeFile(input.navigation, " ".repeat(524_289));
      if (scenario === "invalid-utf8") await writeFile(input.navigation, Buffer.from([0xff, 0xfe]));
      if (scenario === "missing-file") await rm(input.navigation);
      if (scenario === "missing-ui-locale") await writeFile(input.config, JSON.stringify({ schemaVersion: "0.1.0" }));
      if (scenario === "single-document") input.args.splice(2, 2, "--input", "fixtures/basic.hia.json");
      if (scenario === "manifest-asset-collision") input.args.push("--manifest", "assets/hia-site-navigation.css");
      if (scenario === "manifest-reader-collision") input.args.push("--manifest", "assets/hia-site-reading.js");
      if (scenario === "manifest-report-collision") input.args.push("--manifest", "documentation-ui-locale-completeness.json");
      expect(await runCli(input.args, input.io)).toBe(1);
      expect(input.messages.join("\n")).toContain("HIA_CLI_SITE_NAVIGATION_INPUT_INVALID");
      expect(input.messages.join("\n")).not.toContain(input.root);
      await expect(access(input.output)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(input.root, { recursive: true, force: true }); }
  });
});
