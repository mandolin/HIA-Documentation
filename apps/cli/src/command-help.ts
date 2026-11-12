/**
 * @file
 * @lang zh-CN 已确认命令终端基线的纯文本排版，仅消费共享内存内容。
 * @lang en Plain-text layout for the confirmed command-terminal baseline, consuming shared memory content only.
 */
import type { HiaI18nModel } from "@hia-doc/core";
import { createCliCommandContent } from "./command-content.js";

/** @lang zh-CN 估算本帮助所用中英文及组合音标的终端显示列，控制字符不进入内容。
 * @lang en Estimate terminal columns for the Chinese, English and combining marks used by this help, whose content excludes control characters.
 * @param text <lang><zh-CN>本地帮助正文。</zh-CN><en>Local help text.</en></lang>
 * @returns <lang><zh-CN>用于80/120列排版的显示列估计，不推广为任意终端字体的完整wcwidth。</zh-CN><en>Display-column estimate for the 80/120 layouts, without claiming complete wcwidth coverage for arbitrary terminal fonts.</en></lang>
 */
export function terminalColumns(text: string): number {
  return Array.from(text).reduce((width, character) => {
    // <lang><zh-CN>组合标记及连接符不增加列，常用东亚全宽字符占两列。</zh-CN><en>Combining marks and joiners add no columns, and common East Asian wide characters occupy two.</en></lang>
    const code = character.codePointAt(0)!;
    if (/\p{Mark}/u.test(character) || code === 0x200d) return width;
    return (
      width +
      ((code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe6f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      code >= 0x1f300
        ? 2
        : 1)
    );
  }, 0);
}

/** @lang zh-CN 按显示列折行，英语先保留词边界，超长标识和中文连续段再按码点切分。
 * @lang en Wrap by display columns, retaining English word boundaries before splitting long identifiers or continuous Chinese runs by code point.
 */
function wrap(
  text: string,
  width: number,
  prefix = "",
  continuation = prefix,
): string[] {
  // <lang><zh-CN>当前行和已完成行仅属于本次排版，不输出终端控制序列。</zh-CN><en>The current and completed lines belong to this layout call only and emit no terminal controls.</en></lang>
  const lines: string[] = [];
  let line = prefix;
  // <lang><zh-CN>标签缩进不算正文，首个超长词应从原始缩进开始拆分。</zh-CN><en>Label indentation is not prose, so split the first long token from the original indentation.</en></lang>
  let hasContent = false;
  for (const token of text.split(/\s+/u)) {
    if (!token) continue;
    // <lang><zh-CN>已有缩进尾空格无需重复插空格，标签列保持与确认稿对齐。</zh-CN><en>Existing indentation needs no additional space, keeping label columns aligned with the confirmed draft.</en></lang>
    const separator = line.trim() && !line.endsWith(" ") ? " " : "";
    if (terminalColumns(line + separator + token) <= width) {
      line += separator + token;
      hasContent = true;
      continue;
    }
    if (hasContent) {
      lines.push(line);
      line = continuation;
      hasContent = false;
    }
    for (const character of token) {
      if (terminalColumns(line + character) > width) {
        lines.push(line);
        line = continuation;
        hasContent = false;
      }
      line += character;
      hasContent = true;
    }
  }
  if (line.trim()) lines.push(line);
  return lines;
}

/** @lang zh-CN 读取实际语言文本，内容层已要求两语，不猜测或回退翻译。
 * @lang en Read actual locale text, with both locales required by content construction and no inferred translation fallback.
 */
function text(model: HiaI18nModel, field: string, locale: string): string {
  return model.fields[field]!.localizedText[locale]!;
}

/** @lang zh-CN 按确认稿短文同行、长文两语分行，续行缩进增加两格。
 * @lang en Follow the confirmed layout with compact bilingual prose on one line and longer prose on separate locale lines, adding two spaces on continuation.
 */
function prose(
  model: HiaI18nModel,
  field: string,
  width: number,
  indent = "",
): string[] {
  // <lang><zh-CN>两语分别保留真实字段，短文的组合不会改变原正文。</zh-CN><en>Keep the two actual fields separate, combining short prose without changing its source text.</en></lang>
  const zh = text(model, field, "zh-CN");
  const en = text(model, field, "en");
  const joined = zh + " / " + en;
  return terminalColumns(indent + joined) <= 80
    ? wrap(joined, width, indent, indent + "  ")
    : [
        ...wrap(zh, width, indent, indent + "  "),
        ...wrap(en, width, indent, indent + "  "),
      ];
}

/**
 * @lang zh-CN 生成根、已知组或叶帮助，未知路径回退根。列宽按已确认80/120画布选择，无文件、网络、配置或命令执行。
 * @lang en Render root, known-group or leaf help, falling back to root for unknown paths. Selects the confirmed 80/120-column canvas without file, network, configuration or command execution.
 * @param route <lang><zh-CN>仅命令路径段，不含参数值。</zh-CN><en>Command path tokens only, excluding option values.</en></lang>
 * @param columns <lang><zh-CN>宿主显示列，缺省80，至少120时采用120列稿。</zh-CN><en>Host display columns, default 80, selecting the 120-column canvas at 120 or more.</en></lang>
 * @returns <lang><zh-CN>纯文本帮助，不含结尾换行。</zh-CN><en>Plain-text help without a trailing newline.</en></lang>
 */
export function renderCliHelp(route: string[], columns = 80): string {
  // <lang><zh-CN>每次使用独立内容图，避免其它调用者修改影响即时帮助。</zh-CN><en>Use an independent content graph per call so other callers cannot mutate immediate help.</en></lang>
  const commands = createCliCommandContent();
  // <lang><zh-CN>完整路径精确选择，未知段或多余段使用根基线。</zh-CN><en>Select exact complete paths, using the root baseline for unknown or extra segments.</en></lang>
  const command =
    commands.find(
      (item) => JSON.stringify(item.path) === JSON.stringify(route),
    ) ?? commands[0]!;
  // <lang><zh-CN>只选择已确认两画布，文本内容在TTY及重定向使用同一规则。</zh-CN><en>Select only the two confirmed canvases, sharing text rules across TTY and redirected output.</en></lang>
  const width = columns >= 120 ? 120 : 80;
  const lines: string[] = [];
  const bilingual = (field: string) =>
    text(command.i18n, field, "zh-CN") +
    " / " +
    text(command.i18n, field, "en");
  if (command.path.length === 0) {
    lines.push(
      "HIA-Documentation-Sys",
      "命令帮助 / Command help",
      "",
      "用法 / Usage",
      "  hia docs <command> [options]",
      "  hia browser <command> [options]",
      "",
      "命令组 / Command groups",
    );
    for (const group of commands.filter((item) => item.path.length === 1))
      lines.push(
        ...wrap(
          text(group.i18n, "summary", "zh-CN") +
            " / " +
            text(group.i18n, "summary", "en"),
          width,
          "  " + group.path[0]!.padEnd(11),
          "    ",
        ),
      );
    for (const group of ["docs", "browser"]) {
      lines.push(
        "",
        group === "docs"
          ? "文档命令 / Documentation commands"
          : "浏览器命令 / Browser commands",
      );
      lines.push(
        ...wrap(
          commands
            .filter((item) => item.kind === "command" && item.path[0] === group)
            .map((item) => item.path[1])
            .join(", "),
          64,
          "  ",
        ),
      );
    }
    lines.push(
      "",
      "帮助 / Help",
      "  -h, --help",
      "    显示当前命令帮助，不运行构建。",
      "    Show command help without running a build.",
      "",
      "下一步 / Next steps",
      "  hia docs --help",
      "  hia docs build --help",
      "",
      "离线完整说明 / Complete offline reference",
      "  @hia-doc/cli/USAGE.md",
    );
    return lines.join("\n");
  }
  lines.push(
    "HIA-Documentation-Sys · hia " + command.path.join(" "),
    ...wrap(bilingual("description"), width),
    "",
    "用法 / Usage",
    ...wrap(command.signature, width, "  ", "    "),
  );
  if (command.kind === "group") {
    lines.push("", "命令 / Commands");
    for (const leaf of commands.filter(
      (item) => item.kind === "command" && item.path[0] === command.path[0],
    ))
      lines.push(
        ...wrap(
          text(leaf.i18n, "indexLabel", "zh-CN") +
            " / " +
            text(leaf.i18n, "indexLabel", "en"),
          width,
          "  " + leaf.path[1]!.padEnd(25),
          "    ",
        ),
      );
    lines.push(
      "",
      "帮助 / Help",
      "  hia " + command.path[0] + " <command> --help",
      "",
      "运行具体命令前，按各命令说明准备输入并确认输出目录。",
      ...wrap(
        "Before running a command, prepare its inputs and check its output directory.",
        width,
      ),
    );
    return lines.join("\n");
  }
  // <lang><zh-CN>参数顺序来自共享描述，栏目仅在变化时打印一次。</zh-CN><en>Parameter order follows shared descriptions, printing each section only when it changes.</en></lang>
  let currentSection = "";
  for (const option of command.options) {
    // <lang><zh-CN>栏目、开关标签及参数槽都来自同一字段模型。</zh-CN><en>Section names, switch labels and value slots all come from the shared field model.</en></lang>
    const section =
      text(option.i18n, "section", "zh-CN") +
      " / " +
      text(option.i18n, "section", "en");
    if (section !== currentSection) {
      lines.push("", section);
      currentSection = section;
    }
    const name = option.short
      ? "-" + option.short + ", --" + option.name
      : "--" + option.name;
    const label =
      option.valueType === "boolean"
        ? name
        : name + " <" + text(option.i18n, "metavar", "en") + ">";
    lines.push(
      ...wrap(label, width, "  ", "    "),
      ...prose(option.i18n, "description", width, "    "),
    );
  }
  lines.push(
    "",
    "路径和副作用 / Paths and effects",
    ...prose(command.i18n, "paths", width, "  "),
    ...prose(command.i18n, "effects", width, "  "),
    ...prose(command.i18n, "parsingRules", width, "  "),
    "",
    "退出码 / Exit codes",
  );
  for (const exit of command.exitCodes) {
    // <lang><zh-CN>退出码只打印一次，长双语含义续行而不重复状态标识。</zh-CN><en>Print each exit code once, continuing long bilingual meanings without repeating status identities.</en></lang>
    const zh = text(exit.i18n, "description", "zh-CN");
    const en = text(exit.i18n, "description", "en");
    lines.push(...wrap(zh + " / " + en, width, "  " + exit.code + " ", "    "));
  }
  lines.push("", "示例 / Example");
  for (const example of command.examples)
    lines.push(...wrap(example, width, "  ", "    "));
  lines.push(
    "",
    "离线完整说明 / Complete offline reference",
    ...wrap(text(command.i18n, "offline", "en"), width, "  ", "    "),
  );
  return lines.join("\n");
}
