/**
 * @file
 * @lang zh-CN 已授权源码的行投影及同源查看页；转义文本，不执行源码或生成外部链接。
 * @lang en Line projection and same-origin viewing pages for authorized source; escapes text without executing source or generating external links.
 */

/** @lang zh-CN 已确认最小范围的行/焦点/定位样式，不改导航。 @lang en Line/focus/target styles for the confirmed minimal scope without changing navigation. */
const LINE_STYLE = ".hia-source-code-line{display:block;min-width:max-content}.hia-source-line-number{display:inline-block;min-width:3ch;margin-inline-end:1.25rem;color:inherit;text-align:right;user-select:none}.hia-source-code-line:target{background:color-mix(in srgb,var(--hia-accent,#0f4f82) 14%,transparent)}.hia-source-line-number:focus-visible{outline:3px solid currentColor;outline-offset:2px}";

/**
 * @lang zh-CN 转义授权正文并逐行编号；独立页使用L锚点，内联避免重复DOM id。
 * @lang en Escapes/ numbers authorized text by line; standalone pages use L anchors while inline previews avoid duplicate DOM IDs.
 * @param content <lang><zh-CN>owner已限长的源码片段。</zh-CN><en>Source excerpt already bounded by its owner.</en></lang>
 * @param startLine <lang><zh-CN>片段的一基起始行。</zh-CN><en>One-based first line of the excerpt.</en></lang>
 * @param anchors <lang><zh-CN>仅独立页生成L行id。</zh-CN><en>Only standalone pages emit L-line IDs.</en></lang>
 * @returns <lang><zh-CN>仅span/a与转义文本，无脚本。</zh-CN><en>Spans/anchors and escaped text only, without scripts.</en></lang>
 */
export function renderSourceLines(content: string, startLine = 1, anchors = false): string {
  // <lang><zh-CN>数组只覆盖有界片段，不读取其它源码；编号只来自数值，正文永远转义。</zh-CN><en>The array covers the bounded excerpt only without other source reads; numbers derive from numeric positions and bodies are always escaped.</en></lang>
  return content.split(/\r?\n/u).map((text, index) => {
    // <lang><zh-CN>行号来自片段原始位置；固定行号列不改变源码缩进，标签仅在独立页可点击。</zh-CN><en>Numbers follow original excerpt positions; the fixed gutter preserves code indentation and is clickable only on standalone pages.</en></lang>
    const number = startLine + index;
    const style = "display:inline-block;min-width:3ch;margin-inline-end:1.25rem;text-align:right;user-select:none";
    const label = anchors ? `<a class="hia-source-line-number" href="#L${number}" aria-label="L${number}" style="${style}">${number}</a>` : `<span class="hia-source-line-number" aria-hidden="true" style="${style}">${number}</span>`;
    return `<span class="hia-source-code-line" data-hia-source-line-number="${number}"${anchors ? ` id="L${number}" tabindex="-1"` : ""} style="display:block;min-width:max-content">${label}${escape(text)}</span>`;
  }).join("");
}

/**
 * @lang zh-CN 复用现有主题生成无脚本源码页，为#L提供真实锚点；HTML不是fetch文本资产。
 * @lang en Generates a script-free source page using the existing theme with real #L anchors; HTML is not a fetch text asset.
 * @param content <lang><zh-CN>授权且限长的纯文本。</zh-CN><en>Authorized bounded plain text.</en></lang>
 * @param sourcePath <lang><zh-CN>公开locator，在标题中转义。</zh-CN><en>Published locator, escaped in the title.</en></lang>
 * @param startLine <lang><zh-CN>一基起始行。</zh-CN><en>One-based first line.</en></lang>
 * @returns <lang><zh-CN>完整HTML；CSP禁止脚本/外部请求，长行局部滚动。</zh-CN><en>Complete HTML with CSP blocking scripts/external requests and local scrolling for long lines.</en></lang>
 */
export function renderPublicSourcePage(content: string, sourcePath: string, startLine: number): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(sourcePath)} · Source / 源码</title><link rel="icon" href="data:,"><link rel="stylesheet" href="../assets/hia-default.css"><style>${LINE_STYLE}body{margin:0;padding:clamp(1rem,3vw,2rem)}main{max-width:70rem;margin:auto;padding:1rem;background:var(--hia-bg,#fff);border:1px solid var(--hia-border,#ac9474);border-radius:.7rem}h1{font-size:1.35rem;overflow-wrap:break-word}pre{overflow:auto;padding:1rem;line-height:1.6}</style></head><body><main><h1>${escape(sourcePath)} · Source / 源码</h1><pre class="hia-source-code"><code>${renderSourceLines(content, startLine, true)}</code></pre></main></body></html>`;
}

/** @lang zh-CN 转义文本/属性的HTML特殊字符，不解释源码。 @lang en Escapes HTML-special characters in text/attributes without interpreting source. */
function escape(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
