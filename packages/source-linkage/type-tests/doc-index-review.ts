/**
 * @file
 * @lang zh-CN 九个普通索引接口的严格消费者，保留原可变类型并拒绝正文、错型身份和范围。
 * @lang en Strict consumer for nine ordinary-index interfaces, retaining mutable types while rejecting bodies, mistyped identities and ranges.
 */
import {
  createDocSourceMapIndex,
  type DocSourceMapIndex,
  type DocSourceMapIndexedEntry,
  type DocSourceMapGeneratedBindingRef,
  type DocSourceMapGeneratedBindingSidecar,
  type DocSourceMapLocaleResolutionSidecar,
  type DocSourceMapLocaleDiscoverySidecar,
  type DocSourceMapSourceLink,
  type DocSourceMapArtifactLink,
  type DocSourceMapSourceMapLink
} from "../src/index.js";

// <lang><zh-CN>空索引也保留统一类型；本文件仅由noEmit消费者编译，不执行数组访问。</zh-CN><en>Empty indexes retain uniform types; this file is compiled by a noEmit consumer without executing array access.</en></lang>
const index: DocSourceMapIndex = createDocSourceMapIndex({});
// <lang><zh-CN>节点注解逐项锁定九接口的公开关系，不能借文档工作改成readonly。</zh-CN><en>Node annotations pin the public relations of all nine interfaces; documentation work must not turn them readonly.</en></lang>
const entry: DocSourceMapIndexedEntry = index.entries[0]!;
const binding: DocSourceMapGeneratedBindingRef = entry.generatedBindingRefs[0]!;
const bindingSidecar: DocSourceMapGeneratedBindingSidecar = index.bindingSidecars[0]!;
const resolution: DocSourceMapLocaleResolutionSidecar = index.localeResolutionSidecars[0]!;
const discovery: DocSourceMapLocaleDiscoverySidecar = index.localeDiscoverySidecars[0]!;
const source: DocSourceMapSourceLink = entry.sourceLinks[0]!;
const artifact: DocSourceMapArtifactLink = entry.artifactLinks[0]!;
const map: DocSourceMapSourceMapLink = index.sourceMaps[0]!;
// <lang><zh-CN>这些赋值保持已存在的可变类型能力，不鼓励消费中篡改已验证索引。</zh-CN><en>These assignments retain existing mutable type capabilities without encouraging tampering during validated-index consumption.</en></lang>
index.entryCount = 1;
index.entries.push(entry);
entry.sourceLinks.push(source);
binding.bindingId = "binding:public";
bindingSidecar.path = "dist/bindings.json";
resolution.path = "dist/resolution.json";
discovery.path = "dist/discovery.json";
source.range = { start: { line: 1 }, end: { line: 2, column: 3 } };
artifact.selector = "#public";
map.kind = "ordinary-source-map";
// @ts-expect-error 中文：计数保持number。 English: Counts remain numbers.
index.sourceCount = "2";
// @ts-expect-error 中文：条目不暴露源码正文。 English: Entries expose no source bodies.
entry.sourceBody;
// @ts-expect-error 中文：范围列保持number。 English: Range columns remain numbers.
source.range.start.column = "1";
// @ts-expect-error 中文：sidecar身份保持string。 English: Sidecar identities remain strings.
binding.sidecarId = 1;
// @ts-expect-error 中文：声明版本保持可选string。 English: Declaration versions remain optional strings.
bindingSidecar.contractVersion = {};
// @ts-expect-error 中文：语言解析声明不暴露资源正文。 English: Resolution declarations expose no resource bodies.
resolution.resourceBody;
// @ts-expect-error 中文：发现声明不嵌入catalog。 English: Discovery declarations embed no catalog.
discovery.catalog;
// @ts-expect-error 中文：映射链接不携带mappings正文。 English: Map links carry no mappings body.
map.mappings;
void [index, entry, binding, bindingSidecar, resolution, discovery, source, artifact, map];
