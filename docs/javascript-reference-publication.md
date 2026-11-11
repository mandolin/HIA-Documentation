# JavaScript文档工具参考站构建

JavaScript文档工具包API与JSDoc配置派生证据由HIA正常生产链生成。两个站点的包选择、公开资源、路径和完整名称统一记录于`reference/javascript-reference-inputs.json`。

| 内容 | 公开站点根 |
| --- | --- |
| JavaScript文档工具包API | /HIA-Documentation-API-JavaScript/{locale}/ |
| JSDoc配置派生证据 | /HIA-Documentation-Resources-JSDoc/derivation-evidence/{locale}/ |

支持zh-CN与en。系统文档版本由官网版本配置提供，当前版本标签反映实际预览状态。品牌、学习、参考和开发文档连接主站，代码文档栏目连接核心API总入口。语言和版本选择对应当前内容分区。

## 准备与构建

在包含`main-repo/`与`HIA/`的源容器中安装并构建主仓及JSDoc生产器。当前复用的完整卫星审核器读取必要包清单中的全部卫星，因此源容器需包含`hia-jsdoc`、`hia-htmdoc`、`hia-cssdoc`、`hia-dotnetdoc`、`jsdoc-plugin-hia-sys`与`jsdoc-theme-hia`六个实际仓库，Git origin应与各自公开身份对应。JSDoc及其官方插件/主题依赖需可解析。

在主仓执行。

```powershell
pnpm run build
node scripts/build-javascript-reference.mjs --workspace-root .. --out dist/javascript-reference-publication
```

生产器从当前原声明重新提取JSDoc、核字段/签名/地图，使用现有静态成员、配置schema、冻结数组与描述符证明。每次构建重新生成输入，来源与归属通过审核。当前完整审核读取的其它领域内容留在构建中间结果，公开站点采用清单中的十个JavaScript包。

完整源码下载位于每种语言的`source-files/`，摘要清单为`source-files/index.json`。页面片段沿原生primaryBlock和400行上限，完整声明范围按原地图另外核验。六份生成数据快照保留各自静态推导证据。

## 输出和发布

两个可发布目录分别为`sites/javascript-api/`与`sites/derivation-evidence/`，每个目录含自己的根入口、两种语言和完整资产。`reports/`记录来源提交、包/owner、资源、实际文件清单与摘要。`.runtime/`用于本轮装配。

构建使用独占锁，来源变更或内容/预算检查失败会停止，并保留失败暂存与上次成功输出以便诊断。完成时重核主仓、包清单、入口及全部公开源摘要，再提交新的输出目录。发布前按报告逐文件核验归档和实际上传内容，固定源提交、清单摘要、压缩包及展开TAR摘要。

现行发布守卫按每站1,000,000,000字节、100,000文件及单文件32MiB检查。新增内容、导航或系统大版本封版时重新测量实际发布目录。原生ID和地图范围沿各自契约读取，实际站点采用、界面与线上访问按工件分别验收。
