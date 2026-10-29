/**
 * @file
 * @lang zh-CN 执行真实生成脚本核对三处ID属性编码；最小DOM替身只捕获markup，不代替真实浏览器解析或视觉验收。
 * @lang en Executes the actual generated script to check ID encoding at three attribute sinks; a minimal DOM double captures markup without replacing real browser parsing or visual acceptance.
 */
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex } from "@hia-doc/source-linkage";
import { createBrowserPanelPayload, renderBrowserPanel, type BrowserPanelPayload } from "./index.js";

/** @lang zh-CN 含一个普通文档条目和真实关系投影的合成payload。 @lang en Synthetic payload containing one ordinary documentation entry and a real relation projection. */
function payloadWithId(id: string): BrowserPanelPayload {
  // <lang><zh-CN>旧公开夹具仅作内存输入，不改写固定历史字节。</zh-CN><en>The public legacy fixture is used only in memory without rewriting historical bytes.</en></lang>
  const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/profile-card.docmap.json", import.meta.url), "utf8"));
  // <lang><zh-CN>关系ID合法保留任意字符串，安全编码属于最终落点职责。</zh-CN><en>Relation IDs retain arbitrary strings; safe encoding belongs to the final output sink.</en></lang>
  const payload = createBrowserPanelPayload({
    project: { name: "Attribute boundary fixture" },
    docSourceMaps: [{ path: "fixture.docmap.json", index: createDocSourceMapIndex(fixture) }],
    relationGraph: {
      nodes: [{ id: "source", kind: "source", label: "Source", path: "src/example.ts", entryId: "entry" }, { id: "artifact", kind: "artifact", label: "Artifact", path: "dist/example.js" }],
      relations: [{ id, kind: "generates", from: "source", to: "artifact", label: "Relation" }]
    }
  });
  // <lang><zh-CN>render也公开接受typed payload；直接ID输入不受builder的slug限制。</zh-CN><en>Render also publicly accepts typed payloads; direct IDs are not constrained by the builder's slugging.</en></lang>
  payload.entries[0]!.id = id;
  payload.entries[0]!.openRequests[0]!.id = id;
  return payload;
}

/** @lang zh-CN 单独实现期望编码，不调用被测脚本私有helper。 @lang en Independently computes expected encoding without calling a private runtime helper. */
function attribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** @lang zh-CN 运行完整shipped script并捕获列表/详情，额外触发真实关系点击回调。 @lang en Runs the full shipped script, captures list/detail markup, and invokes the real relation-click callback. */
function renderRuntime(payload: BrowserPanelPayload): { entry: string; relation: string; detail: string; relationDetail: string } {
  // <lang><zh-CN>仅提取普通脚本；application/json不是可执行JavaScript。</zh-CN><en>Extract only the ordinary script; application/json is not executable JavaScript.</en></lang>
  const html = renderBrowserPanel(payload).files[0]!.contents;
  const script = /<script>([\s\S]*?)<\/script>/u.exec(html)?.[1];
  expect(script).toBeTypeOf("string");
  // <lang><zh-CN>关系按钮只保存事件回调，ID按输入原值模拟浏览器dataset。</zh-CN><en>The relation button stores callbacks only, modelling browser dataset with the original input ID.</en></lang>
  let selectRelation: (() => void) | undefined;
  const relationButton = { dataset: { relationId: payload.relationGraph!.relations[0]!.id }, addEventListener(_type: string, callback: () => void) { selectRelation = callback; } };
  // <lang><zh-CN>各元素只收markup，不实现HTML解析或网络。</zh-CN><en>Elements only collect markup; they implement neither HTML parsing nor network access.</en></lang>
  const entry = { innerHTML: "", querySelectorAll: () => [] };
  const relation = { innerHTML: "", querySelectorAll: () => [relationButton] };
  const detail = { innerHTML: "", querySelectorAll: () => [] };
  const search = { value: "", addEventListener() {} };
  const elements: Record<string, unknown> = { "[data-hia-entry-list]": entry, "[data-hia-relation-list]": relation, "[data-hia-relation-section]": { hidden: false }, "[data-hia-entry-detail]": detail, "[data-hia-search]": search };
  new Script(script!).runInNewContext({ document: { getElementById: () => ({ textContent: JSON.stringify(payload) }), querySelector: (selector: string) => elements[selector], querySelectorAll: () => [] } }, { timeout: 1000 });
  // <lang><zh-CN>先存条目详情，再触发关系切换以覆盖关系打开按钮。</zh-CN><en>Save entry details before selecting the relation to cover relation open buttons as well.</en></lang>
  const initialDetail = detail.innerHTML;
  expect(selectRelation).toBeTypeOf("function");
  selectRelation!();
  return { entry: entry.innerHTML, relation: relation.innerHTML, detail: initialDetail, relationDetail: detail.innerHTML };
}

describe("browser-panel ID attribute safety", () => {
  /** @lang zh-CN 四组字符串覆盖直接引号、标签边界、字符引用和普通ID正控。 @lang en Four strings cover raw quotes, tag boundaries, character references and an ordinary-ID control. */
  it.each(['id" data-hia-probe="attribute', 'id"><span data-hia-probe="node">', "id&quot;&<>'", "ordinary:identity-1"].flatMap((id) => [
    { id, sink: "entry" as const, name: "data-entry-id" },
    { id, sink: "relation" as const, name: "data-relation-id" },
    { id, sink: "detail" as const, name: "data-open-request" }
  ]))("encodes $sink identity: $id", ({ id, sink, name }) => {
    // <lang><zh-CN>payload中原ID必须保持，不能通过改名掩盖输出漏洞。</zh-CN><en>Original IDs must remain in the payload; renaming must not conceal an output vulnerability.</en></lang>
    const payload = payloadWithId(id);
    const result = renderRuntime(payload);
    expect(result[sink]).toContain(`${name}="${attribute(id)}"`);
    if (sink === "detail") {
      for (const request of payload.relationGraph!.relations[0]!.openRequests) {
        expect(result.relationDetail).toContain(`data-open-request="${attribute(request.id)}"`);
      }
    }
    expect(payload.entries[0]!.id).toBe(id);
    expect(payload.relationGraph!.relations[0]!.id).toBe(id);
  });
});
