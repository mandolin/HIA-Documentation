# 变更日志 / Changelog

## Unreleased — Ordinary position helper input projection

- 三种普通位置helper投影已知自有坐标/偏置数据，拒绝访问器、非法对象/路径和错误偏置，固定诊断不透传异常；坐标错误沿用既有code，路径/偏置使用ORDINARY_SOURCE_MAP_QUERY_INVALID。原输入回显未脱敏，索引篡改仍不支持。合法偏置/缺省列/未命中、契约/schema/包版本及公开导出保持，尚未发布。
- Three ordinary position helpers project known own coordinate/bias data, reject accessors and invalid objects/paths/biases, and return fixed diagnostics without exception text. Coordinate failures retain their code; path/bias failures use ORDINARY_SOURCE_MAP_QUERY_INVALID. Raw echoes remain untrusted and tampered indexes remain unsupported. Valid lookup semantics, contract/schema/package versions and root exports are unchanged; unreleased. See [ordinary lookups](docs/ordinary-source-map-lookup.md).

## Unreleased — Pug producer source-identity coordination

- Pug源码生产器的新映射统一采用绑定端既有完整相对路径源码身份，修复组内断链和slug碰撞；绑定及内容保持。需重新生成完整组后迁移，旧不闭合组仍拒绝。核心运行时/schema/包身份保持，未发布npm。
- The Pug source producer aligns newly generated map source ids with existing binding path identities, fixing local closure and slug collisions while retaining bindings/content. Regenerate complete groups before migration; saved unclosed groups remain refused. Core runtime/schema/package identities are unchanged; unreleased. See [binding migration](docs/generated-documentation-binding-contract.md).

## Unreleased — Generated binding input and coordinated migration

- 生成式绑定输入隔离访问器/环/反射错误，检查集合项、已声明字段、安全坐标及顺序，迭代隐私扫描不回显未知扩展键。新增绑定`0.2.0-draft`与源码映射`1.0.0`精确配对及纯内存整组迁移；旧配对和原始schema字节保留，失败无局部产物。locals契约、包版本及绑定draft性质保持，未发布npm。
- Binding readers guard ordinary JSON and consumed fields, safe coordinates/orders and iterative privacy scanning. New binding `0.2.0-draft` pairs exactly with map `1.0.0`; explicit memory bundle migration validates complete closure, clones and revalidates, returning no partial result on failure. Exact old pairs and schema bytes remain supported. Locals identity, package versions and binding draft status are unchanged; unreleased. See [binding contract and migration](docs/generated-documentation-binding-contract.md).

## Unreleased — Combined query and LSP rejection propagation

- 联合位置/语义查询增加已知数据字段投影，拒绝访问器、错误字符串及非法坐标，保留既有坐标/语义诊断；原始query回显未脱敏。语言服务保留查询状态和新增诊断，无筛选时也隔离invalid/unsupported条目，null/false不再丢弃，拒绝不冒充成功无匹配。协议、schema、包/依赖及宿主UI保持，尚未发布。
- Combined lookups project known runtime fields before matching, reject accessors/wrong strings/invalid coordinates and preserve coordinate/semantic diagnostics; original query echoes remain unsanitized. LSP consumers retain query status and new diagnostics, isolate invalid/unsupported entries even without filters, preserve null/false for validation and distinguish rejection from valid empty states. Protocol/schema/package/dependency versions and host UI are unchanged; unreleased. See [query semantics](docs/doc-source-map-query.md).

## Unreleased — Documentation semantic query validation

- 文档语义查询校验已知字段的普通数据、非空白字符串与一基安全整数坐标；拒绝访问器且不执行，固定诊断不复制异常正文。便捷查询保留非法可选参数交由校验，联合查询传播语义拒绝状态。省略列按核心规则比较为1，范围仍两端包含。契约、schema及包版本保持，尚未发布。
- Documentation semantic queries validate known data fields, nonblank strings and positive safe integer coordinates. Accessors are rejected without execution, and fixed diagnostics omit exception text. Convenience helpers pass invalid optional arguments through validation; combined lookup propagates semantic rejection. Omitted columns compare as one under the core contract; endpoints remain inclusive. Contract/schema/package versions are unchanged; unreleased. See [query semantics](docs/doc-source-map-query.md).

## 2026-10-25 — .NET source provenance (cli 0.1.11)

- CLI项目导入隔离旧.NET成员工件的XML文档出处，避免将其公开成代码资产；真实C#来源保留完整定义末行，不再忽略range而继续读后续400行。其他领域XML源码保持支持，公开授权语义不变。
- CLI project import isolates XML documentation origins in legacy .NET member artifacts. Actual C# source retains the declaration end line instead of ignoring its range and reading the next 400 lines. XML code in other domains and explicit publication authority remain supported.

## 2026-10-25 — Source line positions (renderer-html 0.1.8 / cli 0.1.10)

- 源码行号只接受正安全整数，无效的运行时预览行号回退到1，防止绕过TypeScript类型的调用者把定位值插入HTML属性；合法行号、正文、主题和流式构建行为保持。
- Source line numbers accept positive safe integers only; invalid runtime preview positions fall back to one, preventing callers bypassing TypeScript types from interpolating positions as HTML attributes. Valid positions, bodies, themes and streamed builds are unchanged.

## 2026-10-25 — Project source previews (renderer-html 0.1.7 / cli 0.1.9)

- 已授权fetch/link源码提供同源无脚本查看页及真实#L行定位；fetch行号链接到该页，纯文本摘要校验端点保持独立，不恢复未授权或外部链接。
- Authorized fetch/link source includes script-free same-origin viewing pages with real #L targets. Fetch line numbers link to these pages while digest-verified text endpoints stay separate; unauthorized or external links are not restored.
- 项目构建改为有背压的逐文件写出，修复同一源文件并发缓存击穿；CLI流式读取有界片段、真实路径隔离、16MiB片段LRU及明确大小/总预算诊断。旧renderer内存API、完整文档字段、四种源码模式与显式公开授权保持；producer源码片段也遵守maxLines。
- Project builds await per-file output and eliminate concurrent same-file cache misses. Bounded excerpt streams, real-path containment, a 16 MiB excerpt LRU and fixed budget diagnostics replace whole-file accumulation. Legacy renderer collection, complete documentation fields, all four source modes and explicit publication authority remain supported.

## Unreleased — Ordinary source-map isolation

- 普通位置映射复制已知元数据，不读取/保留源码正文或未知扩展；固定解析诊断避免输入泄漏。三类查找拒绝非法一基坐标，联合失败不再返回文件级宽泛条目；合法输入、偏置和已解析路径保持。契约/包版本不变，尚未发布。
- Ordinary maps copy recognized metadata without reading/retaining source bodies or unknown extensions. Fixed parse diagnostics avoid input leakage; all three lookups reject invalid one-based coordinates, and combined failures return no broad file-level entries. Valid inputs, biases and resolved paths remain supported. Contract/package versions are unchanged; unreleased.

本文件记录尚未发布和已发布的用户可见变化。包是否已进入 npm registry，以对应版本的发布记录与 registry 状态为准。

This file records unreleased and released user-visible changes. Registry availability is determined by the release record and npm
registry status for each version.

## 未发布 / Unreleased

- 文档源码映射新增1.0.0源码定义：闭集来源类别、引用层具体来源和显式保真迁移，精确旧reader保留；新旧未知版本隔离。冻结生成式绑定sidecar的schema不变，组合检查真实映射版本，单独迁移拒绝相关联工件。隐藏已声明容器也进行普通JSON预检。包版本和npm发行状态独立。见[来源模型与迁移](docs/doc-source-map-provenance.md)。
- Documentation maps add a 1.0.0 source definition with closed mechanism categories, per-reference origin detail, explicit lossless migration and an exact legacy reader. Frozen binding schemas stay unchanged; composition checks actual map versions, and standalone migration refuses associated artifacts. Hidden declared containers also pass JSON preflight. Package versions and registry publication remain separate.

- 文档源码映射索引新增普通JSON预检、显式字段类型、集合身份唯一及有序正整数范围校验；拒绝访问器、环、稀疏/自定义行为数组，不调用toJSON或数组自有迭代器。无效输入沿用现有查询隔离；该次输入修复保留历史省略项、开放JSON扩展、生成器来源字符串与契约/包版本，后续来源模型见上方。
- Documentation-map indexing adds ordinary-JSON, declared-field, identity and range checks, rejecting hooks/cycles/custom arrays while retaining query isolation. That input repair preserved legacy omissions, extensions, origin strings and contract/package identities; see the subsequent provenance definition above and [input validation](docs/doc-source-map-input-validation.md).

- 文档化配置规范增加独立的1.0.0源码定义候选，精确兼容旧0.1.0-draft reader；历史canonical原字节保持。新schema表达既有aliasFor/default消息约束，新增精确版本类型和完整字段双语文档。七份官方领域配置、包版本及系统正式发行独立管理。
- Documentation profiles now expose an independent 1.0.0 source definition candidate with exact legacy 0.1.0-draft reader support and unchanged historical canonical bytes. The new schema expresses existing alias-target/default-message constraints; exact version typing and bilingual field documentation are added. Official domain profiles, package versions and system releases remain independent.

- 文档化配置规范的标签列表、单标签/别名目标、规则及诊断现统一按父序祖先先应用、身份仅一次、后实际声明覆盖、本地最后覆盖；新增组合后才形成的别名环检查。早期草案中先命中的单标签查询现与继承列表一致，schema/包版本不变。
- Documentation profile queries now consistently apply ancestors in parent order once per identity, with later actual declarations winning and local declarations applied last. Effective alias validation catches cycles introduced only by composition. Earlier first-match single-tag lookup now agrees with inherited listing; schema/package identifiers are unchanged.

- 文档化配置规范新增继承环与别名环诊断；失效别名不再返回伪成功，深层继承改为显式栈遍历。官方分发API补充所有权/版本说明及回归，该次草案修复保留原schema/包身份；后续继承规则与当前候选见上方。
- Documentation profiles now report inheritance/alias cycles, refuse invalid alias resolutions and traverse deep inheritance with an explicit stack. Official distribution APIs document ownership/version boundaries with regression coverage. That draft repair retained schema/package identities; see the subsequent composition rule and current candidate above.

- 文档化配置规范运行时补齐既有字段/数组项和普通JSON检查；无效集合成员留诊断并跳过，不能占用有效身份。文件解析错误不再回显源码片段，调用者路径上下文仍保留。该次输入修复保持原schema、官方配置和包身份；后续继承和候选变更见上方。
- Documentation profile runtime checks now cover existing declared fields, list items and ordinary JSON. Invalid set members retain diagnostics and are skipped without reserving valid IDs. Parse errors no longer echo source excerpts; caller path context remains. That input repair retained schema, official profile and package identities; see subsequent composition and candidate changes above. See [validation and ownership](docs/profile-input-validation.md).

## 2026-10-25 — Portal tree layout repair

- 默认主题 `0.1.4` 已发布，修复深树缩进与标签竖排：侧栏更宽、内边距更小、标签独立换行，打开按钮保持可见并可移至下一行；极深树在侧栏内局部滚动。新增 `--hia-tree-indent` CSS 变量。
- Published theme `0.1.4` fixes deep-tree indentation and collapsed labels with a wider sidebar, independent label wrapping, visible wrapping open actions and local overflow. `--hia-tree-indent` controls indentation.
- 已发布HTML渲染器 `0.1.6` 与CLI `0.1.8`，更新精确主题依赖链；渲染器/CLI运行代码及源码公开策略不变。本批不发布文档源码映射的未发布候选。
- Published renderer `0.1.6` and CLI `0.1.8` carry the exact updated theme dependency chain without changing renderer/CLI runtime code or source-publication policy. Unreleased documentation-map candidates are excluded from this publication batch.

## 2026-10-25 — Documentation rendering repair

### 发布版本 / Released versions

Released packages: core `0.1.2`, config `0.1.6`, source-linkage `0.1.1`, theme-default `0.1.3`, renderer-html `0.1.5`, CLI `0.1.7`.
All six versions are published on npm and tagged latest. A fresh CLI/DotNetDoc registry consumer passes on Node.js 22 and 24.
中文：六包完整依赖链已发布并经全新安装验收，详见[发行状态](docs/public-package-release-plan.md)。
The core runtime and source-linkage public types are included so a clean registry consumer can load the renderer and compile its declarations.
Existing source definition candidates retain their documented compatibility boundaries; package patches do not declare the system 1.0.0 release.
中文：六包构成完整依赖闭包，保留既有精确兼容reader。以下条目/品牌/共享资产修复随本批发行，以registry收据为准。

- 新增安全品牌颜色资源API与`hia docs theme-assets --out`显式唯一写入命令；独立单文档/项目构建可用同站external资源路由共享一份CSS/JS，按HTML深度引用。theme.name支持已实现skin别名，显式skin优先。普通本地资源构建同样消费颜色覆盖。
- Adds validated brand-color assets and an explicit sole-writer command. Same-site external routing deduplicates CSS/JS across independent document/project builds with depth-correct references. Implemented theme names alias skins; explicit skin wins. Local document/project builds also consume color overrides.
- 项目多页、无脚本成员页和显式信息架构条目保留全部非空本地化字段（含未知扩展），与单文档共用主字段及附加字段逻辑；只有summary时只呈现一次。签名在窄屏自动换行。公共`RenderHtmlOptions.theme`支持颜色与皮肤/配色，逐字段兼容旧项目选项。
- Project, no-script and explicit-IA entry pages preserve all nonempty localized fields, including unknown extensions, sharing primary/additional-field logic with documents. Summary-only primary content appears once. Signatures wrap on narrow screens. Public `RenderHtmlOptions.theme` provides colors and per-field skin/scheme compatibility.

## 2026-08-09 — Enterprise source usability

### 发布版本 / Released versions

- `@hia-doc/core@0.1.1`
- `@hia-doc/config@0.1.5`
- `@hia-doc/renderer-html@0.1.4`
- `@hia-doc/schemas@0.1.4`
- `@hia-doc/cli@0.1.6`

### 变化 / Changes

- 增加 locale-aware source comment projection、稳定 comment identity、独立的 resolution/confidence/provenance 和
  `sourcesContentPolicy: none` 隐私边界。
- 统一 HTML renderer 与 CLI 可消费 DotNetDoc project-relative source usability metadata，并保持 tree、relation、source topic
  与 lazy fragment 输出的一致性。
- schemas 包同步分发 13 项公开 contract；既有 `0.1.0-draft` wire contract identity 保持不变。
- 五个版本已通过 GitHub Actions OIDC Trusted Publishing 发布，registry SHA-512 integrity、SLSA provenance v1 与
  registry-only consumer smoke 均已验证。

- Adds locale-aware source comment projection, stable comment identity, independent resolution/confidence/provenance, and the
  `sourcesContentPolicy: none` privacy boundary.
- Lets the unified HTML renderer and CLI consume DotNetDoc project-relative source-usability metadata while preserving tree,
  relation, source-topic, and lazy-fragment consistency.
- Keeps the schemas package aligned with all 13 public contracts without changing existing `0.1.0-draft` wire identities.
- Publishes all five versions through GitHub Actions OIDC Trusted Publishing, with registry SHA-512 integrity, SLSA provenance
  v1, and registry-only consumer smoke verified.

### 兼容性与限制 / Compatibility and limits

- 本批次为 additive patch，不删除公开 API；源码正文、原始注释和绝对路径不会进入 navigation index。
- source reader、目标项目配置与目标项目采用不包含在这些包版本中。
- 这些版本已进入 npm registry；公开包发布不等同于目标项目已经接入或采用。

- This batch is additive and removes no public API; source bodies, raw comments, and absolute paths do not enter the navigation
  index.
- Source readers, target-project configuration, and target adoption are outside these package versions.
- These versions are available from the npm registry; public package release does not imply target-project integration or adoption.
