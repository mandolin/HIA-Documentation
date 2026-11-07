# SDK type wrappers

The generic TypeScript project producer supports explicit extraction and bridge `0.4.0-draft` for generic applications, array element types and `readonly` operands. HIA core remains `0.2.0` and direct documentation source maps remain `1.1.0`.

```js
const request = {
  workspaceRoot,
  outputDirectory,
  inputs: [{kind: "typescript-project", paths: ["src/index.ts"]}],
  profileIds: ["ts-jsdoc-bridge"],
  options: {extractionVersion: "0.4.0-draft"}
};
```

CLI selection uses `--project --extraction-version 0.4.0-draft`. The direct `extractTsDocProject()` API uses `contractVersion: "0.4.0-draft"`. The original project default remains `0.2.0-draft`.

Generic targets retain their lexical names and ordered type arguments. An alias named `Readonly` can refer to a local type, so the producer records the name and syntax without assigning builtin behavior. Array and `readonly` nodes each retain an actual child expression. All nodes preserve original signatures and ranges. Structural nodes carry source metadata while physical declarations retain their comments.

Unsupported wrappers containing anonymous members produce errors. Earlier extraction versions retain their exact readers, schemas and supported boundaries, including the 0.3 rejection of opaque wrappers hiding members. Migrate by reading authorized original sources again.

The SDK subpath audit verifies authored modules separately from declaration/runtime distribution targets and compares the complete physical type inventory against actual production. See [Generating the core package APIs](core-package-api-generation.md).

中文说明。0.4是显式结构语法模型，保存泛型目标、实参、数组与readonly，并沿既有核心及地图投影。它不执行类型变换或提供运行时冻结证明。原始源码、声明条件、发行文件和生成内容分别核验。

Version 0.4 resolves the pinned native compiler's same-version platform libraries explicitly, so inferred signatures are consistent across source and installed producer layouts. Earlier identities retain their original library-read behavior.

中文说明。0.4显式定位固定原生编译器的平台标准库，避免安装位置导致数组类型推导差异。
