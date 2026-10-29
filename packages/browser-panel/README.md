# @hia-doc/browser-panel

Static browser panel renderer for HIA source-linked documentation lookup.

The package turns `doc-source-map` indexes and ordinary source map lookup indexes into:

- `browser-panel-payload.json`
- a standalone `index.html` panel
- a small output manifest

The generated HTML can be opened as a local page today. Its payload shape is intentionally close to a future DevTools panel message boundary, so browser extensions can consume the same data without reimplementing source-linkage or project relation logic.

## Current Scope

- Renders project-level doc-source-map entries.
- Shows original source and generated artifact positions when ordinary source maps are available.
- Optionally carries `project-index.json.relationGraph` so hosts can choose documentation entries, relations, source files and generated artifacts without scraping generated HTML.
- Emits open-request payloads instead of directly controlling editors or DevTools.
- Does not read files or discover source maps; callers provide validated indexes.

## Non Goals

- No Chrome Web Store package.
- No runtime access to private source content.
- No replacement for `@hia-doc/source-linkage`.

## Data and host boundaries

`createBrowserPanelPayload(input)` projects caller-provided indexes and project
data. `renderBrowserPanel(payload)` returns three in-memory file records in this
order: HTML, JSON payload, JSON manifest. Both perform no file I/O and neither
executes open requests nor validates host permissions.

The payload version is exactly `0.1.0-draft`; the manifest version is `0.1.0`.
These typed rendering entries are not unknown-version validators. Callers own
input-graph validation, publication scope and diagnostic/text redaction. Some
project, range and relation metadata objects retain input references; outputs are
not deep-frozen snapshots.

Display text and dynamic identity attributes are HTML-encoded at their respective
output sinks. JSON script-data escaping alone does not protect a later
`innerHTML` attribute insertion. Attribute encoding preserves original entry,
relation and request IDs after browser parsing, including quotes and literal
character-reference text. Open-request messages carry the original request.

Encoding does not sanitize arbitrary project metadata, authorize paths, prove
source-map coordinate equality or grant editor/DevTools execution permission.
Hosts must validate the message source/origin, request shape, allowed target and
execution permission before acting on `hia.browserPanel.openRequest`.

中文说明：本包输出内存文件和打开请求，不执行宿主动作。动态ID在HTML属性落点编码，浏览器解析后仍保持原值；
调用方继续负责输入校验、公开范围和隐私，宿主继续负责消息来源与执行授权。契约、包版本和正式版验收分别管理。
