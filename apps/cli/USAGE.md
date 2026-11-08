# HIA CLI usage notes

中文。本指南随 `@hia-doc/cli` 分发，涵盖候选版本、大项目构建和共享主题资产。示例假设已安装配套包，且 `hia` 可在项目脚本中调用。Node.js 支持 `^22.23.4 || ^24.22.1`。

English. This bundled guide covers candidate versions, large builds, and shared theme assets. Examples assume matching packages are installed and `hia` is available in a project script. Supported Node.js versions are `^22.23.4 || ^24.22.1`.

## Candidate versions

中文。此源码树的包版本为协调的 1.0.0 候选。实际安装前应确认注册表中的目标版本及配套依赖均已发布。升级时使用匹配的核心、配置、渲染器和主题包，并重新构建消费代码。

English. The package versions in this source tree form a coordinated 1.0.0 candidate. Check registry availability of the target versions and dependencies before installation. Upgrade core, config, renderer, and theme as a matching set and rebuild consumer code.

中文。包版本与工件身份分别管理。配置仍使用 `schemaVersion: "0.1.0"`，源码映射可使用已支持的 `doc-source-map@1.1.0`，其它工件依各自精确身份读取。旧版的读取、显式迁移与 TypeScript 源码兼容边界应逐项核对。宿主绑定投影包含三个版本的真实联合类型，原有穷尽分支须迁移。

English. Package and artifact versions are independent. Config retains `schemaVersion: "0.1.0"`, supported source maps include `doc-source-map@1.1.0`, and other artifacts retain their exact identities. Review legacy reading, explicit migration, and TypeScript source compatibility individually. Host-binding projections expose a three-version union, requiring updates to older exhaustive branches.

## Large project builds

### Unknown build options

中文。当前 `hia docs build` 只读取已知参数，未知选项及其附带文本可能被忽略，构建仍可成功并写出文件。拼错 `--out` 时可能使用配置输出目录或默认 `dist/docs`。退出 0 只表示本次构建成功，不能证明每个传入选项均被识别。自动化脚本请逐项核对本指南的参数名称，并在独立暂存目录检查实际输出位置。

English. Current `hia docs build` reads known options and may ignore unknown options and their accompanying text while still succeeding and writing files. A misspelled `--out` may leave the configured output or default `dist/docs` in effect. Exit 0 confirms build success but does not prove recognition of every supplied option. Check option names against this guide and review the actual output location in a dedicated staging directory.

```sh
hia docs build --input input.hia.json --out review-output --unrecognized-example ignored
```

中文。上例仍可生成 `review-output/index.html`，未知开关没有校验效果。这是现有构建入口的行为说明。`hia docs theme-assets` 和卫星命令各有自己的参数校验，须分别核对。

English. The example can still generate `review-output/index.html`; the unknown switch has no validation effect. This documents the existing build entry. Check the independent option validation rules of `hia docs theme-assets` and satellite commands separately.

中文。项目构建默认使用多页输出。准备一个有效的项目清单后执行以下命令。构建会写入输出目录，建议先在独立暂存目录验收，再部署完整目录。

English. Project builds default to split-site output. Prepare a valid project manifest and run the command below. Builds write to the output directory. Review a dedicated staging output before deploying the complete directory.

```sh
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
```

中文。项目输出采用逐文件等待写入的流式路径，清单和索引元数据仍随条目数增长。显式选择单页或一次性保留全部文件会增加内存需求。缓存上限仅约束相应缓存，进程 RSS 还包含解析结果、运行时和其它构建状态。

English. Project output awaits each file write through the streaming path. Manifest and index metadata still grow with entry count. Explicit single-page or eager output increases memory requirements. Cache limits bound their respective caches, while process RSS also includes parsed artifacts, runtime overhead, and other build state.

中文。本地源码预览须明确设置 `docs.source.publicAssetPolicy: "explicit-public"`，并限定 localRoot、范围和 maxLines。localRoot 相对于配置目录解析，maxLines 默认 400。单份摘录上限为 1 MiB，命令级 LRU 按 UTF-16 估算为 16 MiB，保留正文预算为 1 GiB。超限应缩小获准范围或拆分构建。

English. Local source previews require `docs.source.publicAssetPolicy: "explicit-public"` and bounded localRoot, ranges, and maxLines. Resolve localRoot from the config directory. The default maxLines is 400. Limits include 1 MiB per excerpt, a command-level LRU estimated at 16 MiB in UTF-16, and a 1 GiB retained-body budget. Reduce the authorized scope or split the build when a limit is reached.

中文。相关错误码为 `HIA_CLI_SOURCE_PREVIEW_LIMIT` 和 `HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED`。应检查诊断及生产结果后再发布。XML 文档位置与 C# 声明位置分别按生产器提供的来源处理。

English. The relevant diagnostics are `HIA_CLI_SOURCE_PREVIEW_LIMIT` and `HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED`. Review diagnostics and producer results before publishing. XML documentation locations and C# declaration locations retain producer-supplied provenance.

## Shared theme assets

中文。由一次专用命令在站点根写出主题，再让各输出引用同一份资产。以下配置保存为 `hia.config.json`，项目清单保存在 `hia-project.json`。

English. Use one dedicated command to write theme assets at the site root, then reference them from each output. Save the configuration below as `hia.config.json` and the project manifest as `hia-project.json`.

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "theme": {
      "name": "default",
      "colors": { "accent": "#0f4f82" },
      "assets": { "mode": "external", "baseUrl": "../../assets/" }
    }
  }
}
```

```sh
hia docs theme-assets --config hia.config.json --out site
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
```

中文。第一条命令拥有 `site/assets/hia-default.css` 与 `.js` 的写入权。第二条按入口页相对路径引用 `../../assets/`，更深的条目页由渲染器调整引用。若其它输出位于不同深度，应为该构建提供匹配的 baseUrl。发布时包含共享资产目录，并确保各构建使用相同主题配置。

English. The first command writes `site/assets/hia-default.css` and `.js`. The second references `../../assets/` from its entry page, with deeper-page references adjusted by the renderer. Supply a matching baseUrl for outputs at other depths. Deploy the shared asset directory and use matching theme configuration across builds.

中文。颜色、共享资产与源码公开许可分别配置。主题命令的成功不能证明源码已获准公开。

English. Configure colors, shared assets, and source-publication permission independently. Verify source-publication permission separately from successful theme generation.
