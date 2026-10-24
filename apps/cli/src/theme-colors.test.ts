/**
 * @file
 * @lang zh-CN 普通和项目构建必须直接消费安全品牌颜色，不要求手工改输出CSS。
 * @lang en Document and project builds must directly consume safe brand colors without manual output-CSS edits.
 */
import { mkdtemp, writeFile, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";

describe("CLI brand colors in ordinary builds", () => {
  it.each([false, true])("applies config colors and theme selection: project=%s", async (project) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-brand-build-"));
    const config = path.join(root, "hia.config.json");
    const output = path.join(root, "site");
    const manifest = path.resolve(import.meta.dirname, "../../../fixtures/project-dotnet.hia-project.json");
    const messages: string[] = [];
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { name: "portal.graphite", scheme: "light", colors: { accent: "#0f4f82" } } } }));
    expect(await runCli(["docs", "build", ...(project ? ["--project-manifest", manifest] : []), "--config", config, "--out", output], { cwd: root, stdout: (message) => messages.push(message), stderr: (message) => messages.push(message) }), messages.join("\n")).toBe(0);
    expect(await readFile(path.join(output, "assets/hia-default.css"), "utf8")).toContain("--hia-color-accent: #0f4f82;");
    const html = await readFile(path.join(output, "index.html"), "utf8");
    expect(html).toContain('data-hia-skin="portal.graphite"');
    expect(html).toContain('data-hia-scheme="light"');
  });

  it("rejects unsafe colors before writing any output", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-brand-reject-"));
    const config = path.join(root, "hia.config.json");
    const output = path.join(root, "site");
    await writeFile(config, JSON.stringify({ schemaVersion: "0.1.0", docs: { theme: { colors: { accent: "red;}</style><script>" } } } }));
    expect(await runCli(["docs", "build", "--config", config, "--out", output], { cwd: root, stdout() {}, stderr() {} })).toBe(1);
    await expect(access(output)).rejects.toThrow();
  });
});
