/**
 * @file
 * @lang zh-CN 共享主题资产由显式命令唯一写入，不让各半边构建隐式越过输出边界。
 * @lang en Shared theme assets have an explicit sole writer, preventing each half-site build from implicitly crossing output boundaries.
 */
import { mkdtemp, readFile, readdir, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";

describe("explicit shared theme asset command", () => {
  it.each([undefined, "portal.classic"])("consumes a known non-default name with explicit skin precedence: %s", async (skin) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-theme-name-"));
    const config = path.join(root, "hia.config.json");
    const output = path.join(root, "site");
    const manifest = path.resolve(import.meta.dirname, "../../../fixtures/project-dotnet.hia-project.json");
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { name: "portal.graphite", ...(skin ? { skin } : {}) } } }));
    expect(await runCli(["docs", "build", "--project-manifest", manifest, "--config", config, "--out", output], { cwd: root, stdout() {}, stderr() {} })).toBe(0);
    expect(await readFile(path.join(output, "index.html"), "utf8")).toContain(`data-hia-skin="${skin ?? "portal.graphite"}"`);
  });

  it("builds fifteen independent halves against one shared pair with valid nested links", async () => {
    // <lang><zh-CN>唯一资源根与半边输出均位于测试拥有的新临时目录，业务仓不参与。</zh-CN><en>The sole asset root and all half-site outputs live in a new test-owned temporary directory, without business repositories.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-fifteen-halves-"));
    const config = path.join(root, "hia.config.json");
    const site = path.join(root, "site");
    const messages: string[] = [];
    const io = { cwd: root, stdout: (message: string) => messages.push(message), stderr: (message: string) => messages.push(message) };
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { colors: { accent: "#0f4f82" }, assets: { mode: "external", baseUrl: "../../assets/" } } } }));
    expect(await runCli(["docs", "theme-assets", "--config", config, "--out", site], io)).toBe(0);
    const manifest = path.resolve(import.meta.dirname, "../../../fixtures/project-dotnet.hia-project.json");
    for (let half = 0; half < 15; half += 1) {
      const output = path.join(site, `half-${half}`, "zh-CN");
      const input = half % 3 === 0 ? [] : ["--project-manifest", manifest];
      expect(await runCli(["docs", "build", ...input, "--config", config, "--out", output], io), messages.join("\n")).toBe(0);
      const inventory = JSON.parse(await readFile(path.join(output, "hia-manifest.json"), "utf8"));
      expect(inventory.files.some((file: { path: string }) => /hia-default\.(css|js)$/u.test(file.path))).toBe(false);
    }
    const paths = await readdir(site, { recursive: true });
    expect(paths.filter((file) => file.endsWith("hia-default.css"))).toHaveLength(1);
    expect(paths.filter((file) => file.endsWith("hia-default.js"))).toHaveLength(1);
    // <lang><zh-CN>逐个完整HTML检查引用的资源实际存在，覆盖entries片段以外的无脚本嵌套页。</zh-CN><en>Check resource existence for every complete HTML page, including nested no-script pages beyond entry fragments.</en></lang>
    let links = 0;
    for (const relative of paths.filter((file) => file.endsWith(".html"))) {
      const absolute = path.join(site, relative);
      const html = await readFile(absolute, "utf8");
      for (const match of html.matchAll(/(?:href|src)="([^"]*hia-default\.(?:css|js))"/gu)) {
        await expect(access(path.resolve(path.dirname(absolute), match[1]!))).resolves.toBeUndefined();
        links += 1;
      }
    }
    expect(links).toBeGreaterThan(30);
  });

  it("writes one branded CSS/JS pair under the explicit publication root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-theme-owner-"));
    const config = path.join(root, "hia.config.json");
    const output = path.join(root, "site");
    const messages: string[] = [];
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { colors: { accent: "#0f4f82" } } } }));
    const code = await runCli(["docs", "theme-assets", "--config", config, "--out", output], { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) });
    expect(code, messages.join("\n")).toBe(0);
    expect((await readdir(path.join(output, "assets"))).sort()).toEqual(["hia-default.css", "hia-default.js"]);
    expect(await readFile(path.join(output, "assets/hia-default.css"), "utf8")).toContain("--hia-color-accent: #0f4f82;");
    expect(await readdir(output)).toEqual(["assets"]);
  });

  it("rejects invalid configuration before creating output", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-theme-invalid-"));
    const config = path.join(root, "hia.config.json");
    const output = path.join(root, "site");
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { colors: { accent: "url(https://example.com/)" } } } }));
    const code = await runCli(["docs", "theme-assets", "--config", config, "--out", output], { cwd: root, stdout() {}, stderr() {} });
    expect(code).toBe(1);
    await expect(access(output)).rejects.toThrow();
  });

  it("rejects unknown command options rather than silently ignoring them", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-theme-options-"));
    const output = path.join(root, "site");
    const code = await runCli(["docs", "theme-assets", "--input", "private.json", "--out", output], { cwd: root, stdout() {}, stderr() {} });
    expect(code).toBe(1);
    await expect(access(output)).rejects.toThrow();
  });
});
