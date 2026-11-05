---
title: "参考资料的使用方式"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Reference</p>

# 参考资料的使用方式

先确定所用包、配置与工件的精确版本，再查对应权威参考。CLI参数、默认值、诊断代码和Schema分别由原维护包负责，本页提供入口而不手写第二份完整定义。

## 文档构建

```sh
hia docs build --input <工件> --out <目录> --locale <语言>
```

| 参数 | 用途 |
| --- | --- |
| `--input` | 已生成且兼容的HIA文档工件 |
| `--out` | 本次文档构建的专用输出目录 |
| `--locale` | 本次渲染语言，例如 `zh-CN` 或 `en` |

此命令结构需要替换占位参数并使用已安装的兼容CLI。多输入聚合使用项目清单入口，详见下列权威参考。

## 查找规则与契约

- 命令行：查看CLI README，区分单工件、JSDoc Integration和项目清单入口。
- 项目配置：查看configuration及配置包README；主题资源URL与读取权限分别验证。
- 项目清单：查看project-manifest-guide及迁移说明；字段省略、默认与显式null不是同一语义。
- 文档化配置规范：查看profile-authoring-guide、profile-composition与profile-distribution。按父规范声明顺序合并，后者覆盖前者，本地最后覆盖，共享祖先一次；循环保留明确拒绝。
- 核心契约：从contract-index选择精确版本与Schema，不修改旧稳定地址或用包版本推断wire版本。
- 来源坐标：查看range约定与普通source-map坐标证据。读取器、范围终点、列单位及实际字节证据分别承担职责；不能省略未知状态。
- 兼容迁移：查看compatibility-matrix和各包MIGRATION。只有显式、有效且无损的迁移结果才可写入；失败保留原输入。
- 诊断：按代码与severity分支，查看原owner定义和参数，不依赖译后文案匹配，也不把警告等同于成功。

原参考中的旧配置或旧quickstart可以继续用于对应旧包，但不能成为当前源码候选的默认指南。Schema校验不代替路径/权限/版本或运行时语义检查。

## 品牌颜色

主题通过文档配置传入。钴蓝用于HIA-Documentation-Sys品牌，其它宿主可指定自己的颜色：

```json
{"docs":{"theme":{"name":"default","colors":{"accent":"#0047AB"}}}}
```

这是 `hia.config.json` 的主题片段。完整配置与可用颜色token见配置参考。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [apps/cli/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/README.md)
- [docs/compatibility-matrix.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md)
- [docs/configuration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)
- [docs/contract-index.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/contract-index.md)
- [docs/core-fixture-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/core-fixture-contract.md)
- [docs/doc-source-map-options-and-results.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-options-and-results.md)
- [docs/doc-source-map-range-conventions.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-range-conventions.md)
- [docs/migration-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/migration-guide.md)
- [docs/ordinary-source-map-coordinate-profile.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-coordinate-profile.md)
- [docs/package-v1-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-v1-migration.md)
- [docs/profile-authoring-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-authoring-guide.md)
- [docs/profile-composition.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-composition.md)
- [docs/profile-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-distribution.md)
- [docs/project-manifest-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-guide.md)
- [docs/project-manifest-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-migration.md)
- [docs/schema-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/schema-distribution.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [packages/config/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/config/README.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
