/**
 * @file
 * @lang zh-CN 主CLI已确认终端层次、真实内容及help优先边界的回归。
 * @lang en Regressions for confirmed main-CLI terminal hierarchy, real content and help precedence.
 */
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";
import { createCliCommandContent } from "./command-content.js";
import { renderCliHelp, terminalColumns } from "./command-help.js";

describe("main CLI command help", () => {
  it("retains first-line paragraph indentation and compact bilingual descriptions", () => {
    for (const width of [80, 120]) {
      const text = renderCliHelp(["docs", "build"], width);
      expect(text).toMatch(/^  运行构建会写页面/mu);
      expect(text).toContain(
        "显式业务流程交接投影。 / Explicit business-flow handoff projection.",
      );
    }
  });
  it("describes the root, two groups and eleven actual leaves", () => {
    const commands = createCliCommandContent();
    expect(commands).toHaveLength(14);
    expect(
      commands.filter((command) => command.kind === "command"),
    ).toHaveLength(11);
    expect(
      commands.every((command) =>
        command.options.some(
          (option) => option.name === "help" && option.short === "h",
        ),
      ),
    ).toBe(true);
  });

  it.each([80, 120])(
    "renders all command fields within %i display columns",
    (columns) => {
      for (const command of createCliCommandContent()) {
        const text = renderCliHelp(command.path, columns);
        expect(text).toContain("用法 / Usage");
        expect(text).not.toMatch(/\x1b/u);
        expect(
          text.split("\n").every((line) => terminalColumns(line) <= columns),
        ).toBe(true);
        if (command.kind === "command") {
          expect(text).toContain("退出码 / Exit codes");
          expect(text).toContain("@hia-doc/cli/USAGE.md");
          for (const option of command.options)
            expect(text).toContain("--" + option.name);
        }
      }
    },
  );

  it("uses display columns for Chinese, combining marks and long tokens", () => {
    expect(terminalColumns("中a")).toBe(3);
    expect(terminalColumns("e\u0301")).toBe(1);
  });

  it.each(createPaths())(
    "returns dedicated offline help for %s without reading cwd",
    async (route) => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      const code = await runCli(
        [...route.split(" "), "--input", "missing.json", "--help"],
        {
          cwd: "missing-command-help-cwd",
          stdout: (text) => stdout.push(text),
          stderr: (text) => stderr.push(text),
        },
      );
      expect(code).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout.join("\n")).toContain(
        "HIA-Documentation-Sys · hia " + route,
      );
    },
  );

  it("keeps no-argument and unknown-path help on the root", async () => {
    for (const argv of [
      [],
      ["docs", "missing", "--help"],
      ["docs", "build", "extra", "--help"],
      ["unknown", "--help"],
    ]) {
      const messages: string[] = [];
      expect(
        await runCli(argv, {
          cwd: "missing",
          stdout: (text) => messages.push(text),
          stderr: (text) => messages.push(text),
        }),
      ).toBe(0);
      expect(messages).toEqual([renderCliHelp([])]);
    }
  });

  it("keeps a leading argument separator and short help", async () => {
    const messages: string[] = [];
    expect(
      await runCli(["--", "docs", "evidence", "-h"], {
        cwd: "missing",
        stdout: (text) => messages.push(text),
        stderr: (text) => messages.push(text),
      }),
    ).toBe(0);
    expect(messages).toEqual([renderCliHelp(["docs", "evidence"])]);
  });
});

/** @lang zh-CN 固定已确认十一叶及两组路径，独立约束实际路由覆盖。
 * @lang en Fix the confirmed eleven leaves and two group paths to independently constrain route coverage.
 */
function createPaths() {
  return [
    "docs",
    "browser",
    ...[
      "build",
      "theme-assets",
      "evidence",
      "acceptance",
      "continuity",
      "adoption-kit",
      "business-flow-handoff",
      "enterprise-workflow",
      "html-authoring-verify",
      "coordinate-verify",
    ].map((name) => "docs " + name),
    "browser panel",
  ];
}
