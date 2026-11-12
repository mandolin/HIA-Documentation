/**
 * @file
 * @lang zh-CN 从主CLI实际分发和参数读取AST提取独立观察，绑定原字节并生成严格命令文档。
 * @lang en Extract independent observations from actual main-CLI dispatch and option-reading ASTs, binding original bytes and producing strict command documentation.
 */
import {
  readFile,
  writeFile,
  open,
  mkdtemp,
  rename,
  rm,
  unlink,
  lstat,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { produceCommandDocumentation } from "../packages/core/dist/index.js";
import { createCliCommandContent } from "../apps/cli/dist/command-content.js";

/** @lang zh-CN 遍历静态节点，不执行被观察源码。
 * @lang en Traverse static nodes without executing observed source.
 */
function find(node, predicate) {
  // <lang><zh-CN>收集当前静态子树，递归仅沿编译器提供的AST边。</zh-CN><en>Collect the current static subtree, recursing only along compiler-provided AST edges.</en></lang>
  const results = predicate(node) ? [node] : [];
  ts.forEachChild(node, (child) => {
    results.push(...find(child, predicate));
  });
  return results;
}

/** @lang zh-CN 要求本域可证明语法形态，失败只使用固定错误。
 * @lang en Require syntax provable by this domain reader, using fixed errors on failure.
 */
function requireFact(condition) {
  if (!condition)
    throw new Error("CLI command declaration shape or coverage mismatch.");
}

/** @lang zh-CN 取单一顶层函数，拒绝缺项或同名歧义。
 * @lang en Select one top-level function, rejecting missing or ambiguous declarations.
 */
function declaredFunction(source, name) {
  // <lang><zh-CN>顶层函数表限定解析器责任边界，忽略同名嵌套声明。</zh-CN><en>Top-level declarations bound parser responsibilities, excluding nested namesakes.</en></lang>
  const matches = source.ast.statements.filter(
    (node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === name && node.body,
  );
  requireFact(matches.length === 1);
  return matches[0];
}

/** @lang zh-CN 严格读取字面量选项数组，as const只剥离语法包装。
 * @lang en Read literal option arrays strictly, unwrapping only as-const syntax.
 */
function literalOptions(node) {
  if (ts.isAsExpression(node)) node = node.expression;
  requireFact(ts.isArrayLiteralExpression(node));
  requireFact(
    node.elements.every(
      (item) => ts.isStringLiteral(item) && /^--[a-z][a-z-]*$/u.test(item.text),
    ),
  );
  requireFact(
    new Set(node.elements.map((item) => item.text)).size ===
      node.elements.length,
  );
  return node.elements;
}

/** @lang zh-CN 读取精确的normalizedArgv槽位等值条件，新增动态路由须先扩展观察器。
 * @lang en Read exact normalizedArgv-slot equality conditions, requiring observer extension for new dynamic routes.
 */
function routeToken(node, slot) {
  requireFact(
    ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isElementAccessExpression(node.left) &&
      node.left.expression.getText() === "normalizedArgv" &&
      node.left.argumentExpression.getText() === String(slot) &&
      ts.isStringLiteral(node.right),
  );
  return node.right.text;
}

/** @lang zh-CN 按原AST UTF-16偏移声明一基半开范围，调用方另核精确字符意义。
 * @lang en Declare one-based half-open ranges from original AST UTF-16 offsets, leaving exact character semantics to separate verification.
 */
function evidence(source, node, fieldPath) {
  // <lang><zh-CN>原始AST偏移只在对应来源内换算，端点不使用其它文件的行表。</zh-CN><en>Convert original AST offsets within their own source, never using another file's line table.</en></lang>
  const start = source.ast.getLineAndCharacterOfPosition(
    node.getStart(source.ast),
  );
  const end = source.ast.getLineAndCharacterOfPosition(node.getEnd());
  return {
    fieldPath,
    sourceId: source.id,
    range: {
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 },
    },
    rangeConvention: {
      endBoundary: "exclusive",
      columnUnit: "utf16-code-unit",
    },
  };
}

/** @lang zh-CN 从处理器自己的参数声明提取名称与原生字符串类型，帮助观察由顶层分发独立提供。
 * @lang en Extract names and native string types from handler-owned parameter declarations, with help observed independently in the top-level dispatcher.
 */
function observeOptions(source, handler) {
  // <lang><zh-CN>三种现存解析模式分别限界，不将内容数组当作解析真值源。</zh-CN><en>Bound the three existing parser modes separately, never treating content arrays as parsing truth.</en></lang>
  const calls = find(handler.body, ts.isCallExpression);
  const reads = calls.filter(
    (call) => call.expression.getText() === "readOption",
  );
  if (reads.length) {
    // <lang><zh-CN>已有readOption的返回声明限定字符串词法值，数值领域约束仍由处理器执行。</zh-CN><en>The existing readOption return declaration limits lexical values to strings, with numeric domain rules enforced by handlers.</en></lang>
    const parser = declaredFunction(source, "readOption");
    requireFact(
      ts.isUnionTypeNode(parser.type) &&
        parser.type.types.some(
          (type) => type.kind === ts.SyntaxKind.StringKeyword,
        ) &&
        parser.type.types.every(
          (type) =>
            type.kind === ts.SyntaxKind.StringKeyword ||
            type.kind === ts.SyntaxKind.UndefinedKeyword,
        ),
    );
    requireFact(
      reads.every(
        (call) =>
          call.arguments.length === 2 &&
          call.arguments[0].getText() === "argv" &&
          ts.isStringLiteral(call.arguments[1]),
      ),
    );
    // <lang><zh-CN>相同开关可能被读取多次，观察按真实名称去重并保留定义节点。</zh-CN><en>The same switch may be read repeatedly, so deduplicate observations by actual name while retaining definition nodes.</en></lang>
    const options = new Map(
      reads.map((call) => [call.arguments[1].text, call.arguments[1]]),
    );
    const validation = calls.filter(
      (call) => call.expression.getText() === "validateOptionValues",
    );
    requireFact(validation.length === 1);
    const validated = literalOptions(validation[0].arguments[1])
      .map((item) => item.text)
      .sort();
    requireFact(
      JSON.stringify(validated) === JSON.stringify([...options.keys()].sort()),
    );
    return [...options].map(([name, node]) => ({ name: name.slice(2), node }));
  }
  const parsers = calls.filter(
    (call) => call.expression.getText() === "parseOptions",
  );
  if (parsers.length) {
    // <lang><zh-CN>闭集数组与独立Map值类型共同限定观察，描述内容不参与提取。</zh-CN><en>The closed array and independent Map value type jointly bound observations, with help content excluded from extraction.</en></lang>
    const implementation = declaredFunction(source, "parseOptions");
    const maps = find(
      implementation,
      (node) => ts.isNewExpression(node) && node.expression.getText() === "Map",
    );
    requireFact(
      maps.length === 1 &&
        maps[0].typeArguments?.length === 2 &&
        maps[0].typeArguments.every(
          (type) => type.kind === ts.SyntaxKind.StringKeyword,
        ),
    );
    requireFact(
      parsers.length === 1 && parsers[0].arguments[0].getText() === "argv",
    );
    return literalOptions(parsers[0].arguments[1]).map((node) => ({
      name: node.text.slice(2),
      node,
    }));
  }
  requireFact(
    calls.filter(
      (call) => call.expression.getText() === "parseCoordinateOptions",
    ).length === 1,
  );
  // <lang><zh-CN>坐标解析器的必需/可选常量均须被实际解析函数引用。</zh-CN><en>Both required and optional coordinate constants must be referenced by the actual parser.</en></lang>
  const constants = find(
    source.ast,
    (node) =>
      ts.isVariableDeclaration(node) &&
      ["REQUIRED_OPTIONS", "OPTIONAL_OPTIONS"].includes(node.name.getText()),
  );
  requireFact(constants.length === 2);
  const parser = declaredFunction(source, "parseCoordinateOptions");
  const maps = find(
    parser,
    (node) => ts.isNewExpression(node) && node.expression.getText() === "Map",
  );
  requireFact(
    maps.length === 1 &&
      maps[0].typeArguments?.length === 2 &&
      maps[0].typeArguments.every(
        (type) => type.kind === ts.SyntaxKind.StringKeyword,
      ),
  );
  requireFact(
    constants.every(
      (node) =>
        find(
          parser,
          (item) => ts.isIdentifier(item) && item.text === node.name.getText(),
        ).length > 0,
    ),
  );
  return constants.flatMap((constant) =>
    literalOptions(constant.initializer).map((node) => ({
      name: node.text.slice(2),
      node,
    })),
  );
}

/**
 * @lang zh-CN 只读取本主仓CLI owner固定文件，提取真实观察并经core严格投影。覆盖/语法/描述冲突均拒绝，测试可显式替换内存源码。
 * @lang en Read fixed files in this repository's CLI owner, extract actual observations and perform strict core projection. Reject coverage, syntax and content conflicts, allowing explicit in-memory source substitution for tests.
 * @param {string} root <lang><zh-CN>明确的主仓根。</zh-CN><en>Explicit main-repository root.</en></lang>
 * @param {object} options <lang><zh-CN>测试用内存替换，缺省读取实际文件。</zh-CN><en>In-memory test substitutions, defaulting to actual files.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>描述、独立观察及严格HiaDocument。</zh-CN><en>Description, independent observations and strict HiaDocument.</en></lang>
 */
export async function collectCliCommandDocumentation(root, options = {}) {
  // <lang><zh-CN>固定owner根及文件列表防止输入决定任意源码读取路径。</zh-CN><en>A fixed owner root and file list prevent input from choosing arbitrary source-read paths.</en></lang>
  const owner = path.join(root, "apps/cli");
  const names = [
    "src/index.ts",
    "src/command-content.ts",
    "src/command-help.ts",
    "src/target-acceptance.ts",
    "src/target-continuity.ts",
    "src/owner-adoption-kit.ts",
    "src/business-flow-documentation-handoff.ts",
    "src/enterprise-owner-workflow.ts",
    "src/html-authoring-source-comment-integration.ts",
    "src/coordinate-verify.ts",
    "USAGE.md",
    "package.json",
  ];
  const sources = new Map();
  requireFact(
    [...(options.sourceOverrides?.keys() ?? [])].every(
      (name) =>
        names.includes(name) &&
        ![
          "src/command-content.ts",
          "src/command-help.ts",
          "USAGE.md",
          "package.json",
        ].includes(name),
    ),
  );
  for (const name of names) {
    // <lang><zh-CN>先核实际源码与已编译模块同版，再应用仅用于AST反例的解析器内存替换。</zh-CN><en>First verify actual sources match compiled modules, then apply parser-only memory substitutions for AST counterexamples.</en></lang>
    const original = await readFile(path.join(owner, name));
    if (name.endsWith(".ts")) {
      const compiled = await readFile(
        path.join(owner, "dist", name.slice(4).replace(/\.ts$/u, ".js")),
        "utf8",
      );
      const expected = ts.transpileModule(original.toString("utf8"), {
        fileName: name,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
          newLine: ts.NewLineKind.LineFeed,
        },
      }).outputText;
      requireFact(
        compiled
          .replaceAll("\r\n", "\n")
          .replace(/\/\/# sourceMappingURL=.*\n?$/u, "") ===
          expected.replaceAll("\r\n", "\n"),
      );
    }
    const bytes = options.sourceOverrides?.has(name)
      ? Buffer.from(options.sourceOverrides.get(name), "utf8")
      : original;
    const ast = ts.createSourceFile(
      name,
      bytes.toString("utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    if (name.endsWith(".ts")) requireFact(ast.parseDiagnostics.length === 0);
    sources.set(name, {
      id: name,
      path: name,
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ast,
      language: name.endsWith(".ts")
        ? "typescript"
        : name.endsWith(".json")
          ? "json"
          : "markdown",
    });
  }
  // <lang><zh-CN>主分发语法与导入归属独立读取，禁止从内容数组创建虚构路由。</zh-CN><en>Read dispatch syntax and import ownership independently, preventing content arrays from inventing executable routes.</en></lang>
  const main = sources.get("src/index.ts");
  const dispatcher = declaredFunction(main, "runCli");
  const helpReads = find(
    dispatcher,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText() === "normalizedArgv.includes",
  );
  requireFact(
    JSON.stringify(helpReads.map((node) => node.arguments[0]?.text).sort()) ===
      JSON.stringify(["--help", "-h"].sort()),
  );
  // <lang><zh-CN>只解析owner内相对具名导入，实际路由命中的文件还须属于固定来源表。</zh-CN><en>Resolve only relative named imports inside the owner, with routed files also required to belong to the fixed source table.</en></lang>
  const imports = new Map(
    main.ast.statements
      .filter(ts.isImportDeclaration)
      .filter(
        (node) =>
          node.moduleSpecifier.text.startsWith("./") &&
          node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings),
      )
      .flatMap((node) =>
        node.importClause.namedBindings.elements.map((item) => [
          item.name.text,
          {
            file:
              "src/" +
              node.moduleSpecifier.text.slice(2).replace(/\.js$/u, ".ts"),
            name: item.propertyName?.text ?? item.name.text,
          },
        ]),
      ),
  );
  // <lang><zh-CN>每条执行路由保留处理函数及分发位置，重复或动态形态立即拒绝。</zh-CN><en>Retain each route's handler and dispatch location, rejecting duplicate or dynamic shapes immediately.</en></lang>
  const routes = new Map();
  for (const branch of dispatcher.body.statements.filter(ts.isIfStatement)) {
    if (
      !find(
        branch.expression,
        (node) =>
          ts.isElementAccessExpression(node) &&
          node.expression.getText() === "normalizedArgv",
      ).length
    )
      continue;
    requireFact(
      ts.isBinaryExpression(branch.expression) &&
        branch.expression.operatorToken.kind ===
          ts.SyntaxKind.AmpersandAmpersandToken,
    );
    const route = [
      routeToken(branch.expression.left, 0),
      routeToken(branch.expression.right, 1),
    ];
    const returns = find(branch.thenStatement, ts.isReturnStatement);
    requireFact(
      returns.length === 1 &&
        ts.isCallExpression(returns[0].expression) &&
        ts.isIdentifier(returns[0].expression.expression),
    );
    const name = returns[0].expression.expression.text;
    const location = imports.get(name) ?? { file: "src/index.ts", name };
    requireFact(sources.has(location.file) && !routes.has(route.join(".")));
    const source = sources.get(location.file);
    routes.set(route.join("."), {
      source,
      handler: declaredFunction(source, location.name),
      branch,
    });
  }
  // <lang><zh-CN>内容只在实际执行路由全量取得后读取，两集合必须精确相等。</zh-CN><en>Read content only after collecting every executable route, requiring exact set equality.</en></lang>
  const commands = createCliCommandContent();
  requireFact(
    JSON.stringify(
      commands
        .filter((command) => command.kind === "command")
        .map((command) => command.id)
        .sort(),
    ) === JSON.stringify([...routes.keys()].sort()),
  );
  const content = sources.get("src/command-content.ts");
  const usage = sources.get("USAGE.md");
  const observations = [];
  for (const command of commands) {
    // <lang><zh-CN>组使用全局帮助分发，叶使用自己的处理器和独立参数观察。</zh-CN><en>Groups use global help dispatch, while leaves use their own handlers and independent parameter observations.</en></lang>
    const route = routes.get(command.id);
    const source = route?.source ?? main;
    const handler = route?.handler ?? dispatcher;
    const parserOptions = route ? observeOptions(source, handler) : [];
    const observed = [
      ...parserOptions.map((item) => ({
        name: item.name,
        valueType: "string",
      })),
      { name: "help", valueType: "boolean", short: "h" },
    ];
    // <lang><zh-CN>构建期将结构语义绑定到执行处理器，语言字段同时绑定内容声明与随包手册。</zh-CN><en>At build time bind structural semantics to the executable handler and locale fields to both content declarations and the bundled manual.</en></lang>
    for (const item of [command, ...command.options]) {
      const keys = Object.keys(item).filter(
        (key) =>
          !["id", "i18n", "evidence", "options", "positionals"].includes(key),
      );
      item.evidence = keys.flatMap((key) => [
        evidence(content, content.ast, key),
        evidence(source, handler, key),
      ]);
      item.evidence.push(
        ...Object.keys(item.i18n.fields).flatMap((key) => [
          evidence(content, content.ast, "i18n.fields." + key),
          { fieldPath: "i18n.fields." + key, sourceId: usage.id },
        ]),
      );
      if (item !== command) {
        const observedOption = parserOptions.find(
          (option) => option.name === item.name,
        );
        requireFact(item.name === "help" || observedOption);
        item.evidence.unshift(
          evidence(
            item.name === "help" ? main : source,
            item.name === "help" ? helpReads[0] : observedOption.node,
            "name",
          ),
        );
      } else {
        item.evidence.unshift(
          evidence(main, route?.branch ?? dispatcher, "signature"),
        );
      }
    }
    observations.push({
      commandId: command.id,
      sourceDigests: Object.fromEntries([
        [main.id, main.sha256],
        [source.id, source.sha256],
      ]),
      options: observed,
      positionals: [],
    });
  }
  // <lang><zh-CN>包归属、真实bin与包版本来自owner清单，主CLI显示版本仍保持none。</zh-CN><en>Package ownership, actual bin and version come from the owner manifest, while displayed CLI version remains none.</en></lang>
  const manifest = JSON.parse(
    sources.get("package.json").bytes.toString("utf8"),
  );
  requireFact(
    manifest.name === "@hia-doc/cli" && manifest.bin.hia === "./dist/index.js",
  );
  const description = {
    contract: "command-documentation",
    contractVersion: "0.1.0-draft",
    owner: { packageName: manifest.name, packageVersion: manifest.version },
    sources: [...sources.values()].map(({ id, path, sha256, language }) => ({
      id,
      path,
      sha256,
      language,
    })),
    commands,
  };
  // <lang><zh-CN>严格投影重算全部内存原字节，观察/字段缺项或冲突不写任何新工件。</zh-CN><en>Strict projection rehashes all original memory bytes and writes no new artifacts for missing or conflicting observations or fields.</en></lang>
  const result = await produceCommandDocumentation(description, {
    sourceBytes: new Map(
      [...sources].map(([id, source]) => [id, source.bytes]),
    ),
    declarations: observations,
  });
  requireFact(result.status === "ready");
  return { description, observations, document: result.document };
}

/**
 * @lang zh-CN 独占写入同一工件目录，先完成暂存，替换失败恢复旧目录。只处理CLI dist内的三个生成文件。
 * @lang en Write the artifact directory exclusively after completing staging, restoring its predecessor on replacement failure. Handles only the three generated files inside CLI dist.
 * @param {string} root <lang><zh-CN>主仓根，dist已由编译器建立。</zh-CN><en>Main-repository root, with dist already created by the compiler.</en></lang>
 * @param {object} result <lang><zh-CN>严格收集结果。</zh-CN><en>Strict collection result.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>整组生成文件替换完成。</zh-CN><en>The generated file group has been replaced.</en></lang>
 */
export async function writeCliCommandDocumentation(root, result) {
  // <lang><zh-CN>目录及清理边界固定在已解析dist根，任何已有符号链接或非本组文件均保留并拒绝覆盖。</zh-CN><en>Fix directory and cleanup boundaries within the resolved dist root, retaining and refusing to overwrite existing symlinks or unrelated files.</en></lang>
  const dist = path.resolve(root, "apps/cli/dist");
  const target = path.join(dist, "command-documentation");
  const lockPath = target + ".lock";
  const files = [
    ["description.json", result.description],
    ["declaration-observations.json", result.observations],
    ["document.hia.json", result.document],
  ];
  const lock = await open(lockPath, "wx");
  let staging;
  let backup;
  try {
    const existing = await lstat(target).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (existing) {
      requireFact(existing.isDirectory() && !existing.isSymbolicLink());
      for (const name of await readdir(target))
        requireFact(
          files.some(([expected]) => expected === name) &&
            (await lstat(path.join(target, name))).isFile() &&
            !(await lstat(path.join(target, name))).isSymbolicLink(),
        );
    }
    staging = await mkdtemp(path.join(dist, ".command-documentation-staging-"));
    for (const [name, data] of files)
      await writeFile(
        path.join(staging, name),
        JSON.stringify(data, null, 2) + "\n",
        "utf8",
      );
    if (existing) {
      backup = staging + ".previous";
      requireFact(path.dirname(backup) === dist);
      await rename(target, backup);
    }
    try {
      await rename(staging, target);
    } catch (error) {
      if (backup) await rename(backup, target);
      throw error;
    }
    staging = undefined;
    if (backup) {
      requireFact(path.dirname(backup) === dist);
      await rm(backup, { recursive: true });
    }
  } finally {
    try {
      if (staging) {
        requireFact(path.dirname(staging) === dist);
        await rm(staging, { recursive: true, force: true });
      }
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}

// <lang><zh-CN>正常构建在编译后运行，实际描述/观察/文档随dist分发；import只暴露只读构建函数。</zh-CN><en>Normal builds run after compilation, distributing actual descriptions, observations and documents with dist; imports expose only the read-only collection function.</en></lang>
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const result = await collectCliCommandDocumentation(root);
  await writeCliCommandDocumentation(root, result);
  console.log(
    `CLI command documentation: ${result.description.commands.length} declarations, ${result.document.symbols.length} symbols, actual parser observations matched.`,
  );
}
