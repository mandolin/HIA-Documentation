/**
 * @file
 * @lang zh-CN 真实安装包的writer公开类型正反例；不依赖私有源文件。
 * @lang en Positive/negative writer type consumers for actual installed packages, without private source imports.
 */
import { renderProjectHtmlDocumentToWriter, type RenderHtmlFileWriter, type RenderHtmlWriteResult, type RenderProjectHtmlInput } from "../src/index.js";
// <lang><zh-CN>writer可同步完成或等待真实持久化，结果只含清单，不含正文数组。</zh-CN><en>Writers may complete synchronously or await persistence; results carry inventories without body arrays.</en></lang>
const input: RenderProjectHtmlInput = { project: { name: "Synthetic" }, entries: [] };
const writer: RenderHtmlFileWriter = async (file) => { const text: string = file.contents; void text; };
const result: Promise<RenderHtmlWriteResult> = renderProjectHtmlDocumentToWriter(input, writer);
// @ts-expect-error A writer callback is required.
renderProjectHtmlDocumentToWriter(input);
// @ts-expect-error File payloads are strings.
const badWriter: RenderHtmlFileWriter = async (file) => { const bytes: Uint8Array = file.contents; void bytes; };
async function consume(): Promise<void> {
  const complete = await result;
  const count: number = complete.fileCount;
  // @ts-expect-error Streaming results deliberately have no files body array.
  const files = complete.files;
  // @ts-expect-error Manifest files carry metadata only.
  const body = complete.manifest.files[0]?.contents;
  void [count, files, body];
}
void [input, writer, result, badWriter, consume];
