# HTML文档工具包参考站构建

HTML文档工具包API由HIA自身正常生成，包含八包公开绑定、原生注释/签名、schema逐值内容、静态声明数据和授权完整源码。清单位于`reference/html-reference-inputs.json`，使用独立站点`/HIA-Documentation-API-HTML/{locale}/`，支持zh-CN与en。

## 准备与构建

源容器包含本主仓、`HIA/hia-htmdoc`、JSDoc生产器`HIA/hia-jsdoc`及`HIA/jsdoc-plugin-hia-sys`。安装并构建主仓及原生产器后，在主仓执行。

```powershell
pnpm run build
node scripts/build-html-reference.mjs --workspace-root .. --out dist/html-reference-publication
```

构建从当前实际源码重新运行原生/资源/数组/描述符审核，逐声明保持字段、地图、包版本和仓库归属，使用标准聚合清单与显式源码公开许可。两个独立bin按命令使用文档及对应命令清单维护。

完整双语输出位于`sites/html-api/`，逐文件摘要和来源记录位于`reports/html-api.json`。完整原文下载位于各语言`source-files/`，摘要目录为`source-files/index.json`；页面片段沿原生primaryBlock及400行上限。版本与语言指向当前HTML分区，品牌及手册栏目连接HIA主站。

## 固定发布

发布仓`mandolin/HIA-Documentation-API-HTML`的`snapshot.json`固定源提交、生产清单和完整归档摘要。工作流下载固定Release归档，复用原生API归档校验器逐文件、逐节点及完整源码验证后部署。

```powershell
python scripts/prepare_javascript_reference.py snapshot.json reference.tar.gz build-report.json <new-output-directory>
python -m unittest discover -s scripts -p test_javascript_reference_publication.py
```

每站按1,000,000,000字节、100,000文件和单文件32MiB检查；新增内容及系统大版本封版前重新测量。失败保留先前成功输出及本次失败暂存，构建锁阻止并发覆盖。

## English summary

The independent HTML tool reference is generated through HIA's native API pipeline from the eight registered packages. It preserves original documentation, schemas, maps and authorized complete source files. Build with `scripts/build-html-reference.mjs`, then publish a pinned archive and its validated report through the dedicated publication repository.
