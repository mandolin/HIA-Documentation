/**
 * @file
 * @lang zh-CN 将七个真实命令入口的原生工件接入既有公开参考，逐来源重算并保留宿主投影边界。
 * @lang en Adopt native artifacts for seven real command entries in the existing public reference, rechecking each source and retaining host-projection boundaries.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  produceCommandDocumentation,
  validateHiaDocument,
} from "../packages/core/dist/index.js";
import { collectCliCommandDocumentation } from "./build-cli-command-documentation.mjs";
import { readJsonResourceBytes } from "./lib/json-resource-audit.mjs";

/** @lang zh-CN 已逐owner验收的固定命令组，包路径、调用身份和数量一起核验。 @lang en Fixed owner-qualified command groups, checking package paths, invocation identities and counts together. */
const owners = [
  {
    id: "main-repo",
    runner: "apps/cli",
    token: "hia-cli",
    bins: ["hia"],
    symbols: 76,
    commands: 14,
  },
  {
    id: "hia-cssdoc",
    runner: "packages/cssdoc-runner",
    token: "cssdoc",
    bins: ["cssdoc"],
    symbols: 10,
    commands: 1,
  },
  {
    id: "hia-jsdoc",
    runner: "packages/jsdoc-runner",
    token: "hia-jsdoc",
    bins: ["hia-jsdoc"],
    symbols: 9,
    commands: 1,
  },
  {
    id: "hia-dotnetdoc",
    runner: "packages/dotnetdoc-runner",
    token: "dotnetdoc",
    bins: ["hia-dotnetdoc", "dotnetdoc"],
    symbols: 16,
    commands: 2,
  },
  {
    id: "hia-htmdoc",
    runner: "packages/htmdoc-runner",
    token: "htmdoc",
    bins: ["htmdoc", "htmdoc-handoff"],
    symbols: 15,
    commands: 2,
  },
];

/** @lang zh-CN 各维护包采用既有已确认API站地址，不增加公开根路由。 @lang en Each owner adopts its existing confirmed API-site address without adding a public root route. */
const siteBases = {
  "main-repo": "/HIA-Documentation-API/",
  "hia-jsdoc": "/HIA-Documentation-API-JavaScript/",
  "hia-htmdoc": "/HIA-Documentation-API-HTML/",
  "hia-cssdoc": "/HIA-Documentation-API-CSS/",
  "hia-dotnetdoc": "/HIA-Documentation-API-DotNetDoc/",
};

/**
 * @lang zh-CN 创建独立网页投影，来源路径限定owner，附加可见命令事实，原工件和字段不修改。
 * @lang en Create an independent web projection with owner-qualified sources and additional visible command facts, retaining native artifacts and fields.
 * @param {object} document <lang><zh-CN>严格投影后的原生文档。</zh-CN><en>Strictly projected native document.</en></lang>
 * @param {string} prefix <lang><zh-CN>已授权owner的公开相对前缀。</zh-CN><en>Public relative prefix of the authorized owner.</en></lang>
 * @param {object} [description] <lang><zh-CN>已严格验证的描述；提供时展开版本、规则、示例、退出码与参数索引。</zh-CN><en>Strictly verified description, expanding versions, rules, examples, exit codes and parameter references when supplied.</en></lang>
 * @returns {object} <lang><zh-CN>原字段保持、来源限定且可附加命令事实的深复制。</zh-CN><en>Deep copy retaining original fields, qualifying sources and optionally adding command facts.</en></lang>
 * @throws {Error} <lang><zh-CN>前缀或原来源路径无效。</zh-CN><en>Invalid prefix or native source path.</en></lang>
 */
export function projectCommandSources(document, prefix, description) {
  assert(safePath(prefix), "Unsafe command source prefix.");
  // <lang><zh-CN>原生工件继续逐字节分发，宿主路径只写进单独副本。</zh-CN><en>Native artifacts remain byte-preserved; host paths belong only to a separate copy.</en></lang>
  const projected = structuredClone(document);
  for (const symbol of projected.symbols) {
    const source = symbol.source;
    assert(
      source?.model === "hia-source" &&
        source.primaryBlock === null &&
        source.definedIn,
      "Unexpected command source model.",
    );
    assert(
      safePath(source.definedIn.relativePath),
      "Unsafe native command source.",
    );
    source.definedIn.relativePath =
      prefix + "/" + source.definedIn.relativePath;
    if (description) {
      // <lang><zh-CN>原生元数据提供命令/参数身份，禁止按显示名猜测对应关系。</zh-CN><en>Native metadata supplies command/parameter identity, avoiding display-name matching.</en></lang>
      const identity = symbol.metadata.commandDocumentation;
      const command = description.commands.find(
        (item) => item.id === (identity.commandId ?? identity.nativeId),
      );
      assert(command, "Unknown native command identity.");
      const parameter = identity.commandId
        ? [...command.options, ...command.positionals].find(
            (item) =>
              item.id === identity.nativeId && item.kind === identity.kind,
          )
        : undefined;
      assert(
        !identity.commandId || parameter,
        "Unknown native parameter identity.",
      );
      // <lang><zh-CN>事实字段只增加到副本，排除证据/原身份/已显示签名；参数各有独立页。</zh-CN><en>Add facts only to the copy, excluding evidence, native identity and displayed signatures; parameters retain their separate pages.</en></lang>
      appendFacts(symbol.i18n, "command.owner", description.owner);
      appendFacts(
        symbol.i18n,
        parameter ? "parameter" : "command",
        parameter ?? command,
      );
      if (!parameter)
        for (const item of [...command.options, ...command.positionals]) {
          const key = `parameters.${item.kind === "option" ? "--" : ""}${item.name}.summary`;
          assert(
            !symbol.i18n.fields[key],
            "Command parameter field collision.",
          );
          symbol.i18n.fields[key] = {
            ...structuredClone(item.i18n.fields.description),
            fieldPath: key,
          };
        }
    }
  }
  assert.deepEqual(validateHiaDocument(projected), []);
  return projected;
}

/**
 * @lang zh-CN 把已有契约事实逐叶投影为标准语言字段，复用原本地化正文，不执行示例或解析新语义。
 * @lang en Project existing contract facts leaf-by-leaf into standard locale fields, retaining localized prose without running examples or interpreting new semantics.
 * @param {object} model <lang><zh-CN>独立网页字段模型。</zh-CN><en>Independent web field model.</en></lang>
 * @param {string} prefix <lang><zh-CN>原字段身份的限定前缀。</zh-CN><en>Qualified prefix for original field identities.</en></lang>
 * @param {unknown} value <lang><zh-CN>已通过契约验证的事实。</zh-CN><en>Contract-validated facts.</en></lang>
 * @returns {void} <lang><zh-CN>附加字段到该副本。</zh-CN><en>Append fields to this copy.</en></lang>
 */
function appendFacts(model, prefix, value) {
  if (value && typeof value === "object") {
    // <lang><zh-CN>嵌套退出码等说明使用原语言字段，机器值在两语言中保留同一字面量。</zh-CN><en>Nested descriptions such as exit codes retain original locale fields; machine values retain identical literals across locales.</en></lang>
    const root = prefix === "command" || prefix === "parameter";
    if (!root && value.i18n)
      for (const [name, field] of Object.entries(value.i18n.fields)) {
        const key = prefix + "." + name;
        assert(!model.fields[key], "Command fact field collision.");
        model.fields[key] = { ...structuredClone(field), fieldPath: key };
      }
    for (const [name, item] of Object.entries(value)) {
      if (
        ["i18n", "evidence"].includes(name) ||
        (root &&
          [
            "id",
            "executable",
            "path",
            "kind",
            "signature",
            "options",
            "positionals",
          ].includes(name))
      )
        continue;
      appendFacts(model, prefix + "." + name, item);
    }
    return;
  }
  assert(!model.fields[prefix], "Command fact field collision.");
  model.fields[prefix] = {
    fieldPath: prefix,
    kind: "text",
    defaultLocale: model.defaultLocale,
    localizedText: Object.fromEntries(
      model.locales.map((locale) => [
        locale,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    ),
  };
}

/**
 * @lang zh-CN 严格重投影工件，确认摘要、实际观察和分发文档一致。
 * @lang en Strictly reproject artifacts, requiring digests, actual observations and the distributed document to agree.
 * @param {object} bundle <lang><zh-CN>描述、观察、原文档及内存原字节。</zh-CN><en>Description, observations, native document and original memory bytes.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>通过时无返回值。</zh-CN><en>No result on success.</en></lang>
 * @throws {Error} <lang><zh-CN>不完整、冲突或文档漂移。</zh-CN><en>Incomplete evidence, conflicts or document drift.</en></lang>
 */
export async function verifyCommandBundle({
  description,
  observations,
  document,
  sourceBytes,
}) {
  const result = await produceCommandDocumentation(description, {
    sourceBytes,
    declarations: observations,
  });
  assert.equal(result.status, "ready", "Command projection is not ready.");
  assert.deepEqual(
    result.document,
    document,
    "Native command document drifted.",
  );
}

/**
 * @lang zh-CN 读取固定五组owner，重核实际解析声明，准备标准输入和明确源码镜像。
 * @lang en Read the five fixed owners, recheck actual parser declarations and prepare standard inputs with an explicit source mirror.
 * @param {object} options <lang><zh-CN>工作区/主仓、已解析来源根、输出根、语言及固定ownerIds选择，默认全五组。</zh-CN><en>Workspace/main roots, resolved source roots, output, locales and fixed ownerIds selection, defaulting to all five groups.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>既有HIA输入、内存源码及逐组采用记录。</zh-CN><en>Existing HIA inputs, memory sources and per-group adoption records.</en></lang>
 * @throws {Error} <lang><zh-CN>来源、声明、工件、归属或数量变化。</zh-CN><en>Changed sources, declarations, artifacts, ownership or counts.</en></lang>
 */
export async function preparePublicReferenceCommands({
  workspaceRoot,
  mainRoot,
  sourceRoots,
  outputRoot,
  locales,
  ownerIds = owners.map((owner) => owner.id),
}) {
  assert(
    Array.isArray(ownerIds) &&
      ownerIds.length > 0 &&
      new Set(ownerIds).size === ownerIds.length &&
      ownerIds.every((id) => owners.some((owner) => owner.id === id)),
    "Invalid command owner selection.",
  );
  // <lang><zh-CN>先完成所有读取和拒绝门禁，再写本批公开工件。</zh-CN><en>Complete all reads and refusal gates before writing this batch's public artifacts.</en></lang>
  const bundles = [];
  const sources = new Map();
  for (const owner of owners.filter((owner) => ownerIds.includes(owner.id))) {
    const root =
      owner.id === "main-repo" ? mainRoot : sourceRoots.get(owner.id);
    assert(root, "Missing command owner.");
    const runner = path.join(root, owner.runner);
    const directory = path.join(
      runner,
      owner.id === "main-repo"
        ? "dist/command-documentation"
        : "src/command-documentation",
    );
    const manifest = JSON.parse(
      readJsonResourceBytes(root, owner.runner + "/package.json"),
    );
    assert.deepEqual(
      Object.keys(manifest.bin).sort(),
      [...owner.bins].sort(),
      "Command bin inventory drifted.",
    );
    // <lang><zh-CN>主CLI从真实AST重算，卫星执行各owner既有离线声明观察门禁。</zh-CN><en>Recollect actual AST evidence for the main CLI and run each satellite's established offline declaration-observation gate.</en></lang>
    const actual =
      owner.id === "main-repo"
        ? await collectCliCommandDocumentation(mainRoot)
        : undefined;
    if (!actual) {
      const checker = await import(
        pathToFileURL(path.join(root, "scripts/command-documentation.mjs")).href
      );
      await checker.checkCommandDocumentation();
    }
    const names = [
      "description.json",
      owner.id === "main-repo"
        ? "declaration-observations.json"
        : "observations.json",
      "document.hia.json",
    ];
    const bytes = names.map((name) =>
      fs.readFileSync(path.join(directory, name)),
    );
    const [description, observations, document] = bytes.map((data) =>
      JSON.parse(data),
    );
    if (actual)
      assert.deepEqual(
        { description, observations, document },
        actual,
        "Main command snapshots drifted from actual declarations.",
      );
    assert.equal(description.owner.packageName, manifest.name);
    assert.equal(description.owner.packageVersion, manifest.version);
    assert.equal(description.commands.length, owner.commands);
    assert.equal(document.symbols.length, owner.symbols);
    assert.deepEqual(
      [
        ...new Set(description.commands.map((command) => command.executable)),
      ].sort(),
      [...owner.bins].sort(),
    );
    const prefix =
      (owner.id === "main-repo" ? "main-repo" : "HIA/" + owner.id) +
      "/" +
      owner.runner;
    const sourceBytes = new Map();
    for (const source of description.sources) {
      const data = readJsonResourceBytes(runner, source.path);
      assert.equal(hash(data), source.sha256, "Command source bytes drifted.");
      sourceBytes.set(source.id, data);
      sources.set(prefix + "/" + source.path, data);
    }
    await verifyCommandBundle({
      description,
      observations,
      document,
      sourceBytes,
    });
    const projected = projectCommandSources(document, prefix, description);
    bundles.push({
      owner,
      manifest,
      description,
      document,
      projected,
      names,
      bytes,
    });
  }
  const inputs = [];
  const rows = [];
  for (const {
    owner,
    manifest,
    description,
    document,
    projected,
    names,
    bytes,
  } of bundles) {
    const base = "commands/" + owner.token;
    const artifacts = {
      ...Object.fromEntries(
        names.map((name, index) => [
          name === "document.hia.json" ? "document.native.hia.json" : name,
          bytes[index],
        ]),
      ),
      "document.hia.json": Buffer.from(JSON.stringify(projected) + "\n"),
    };
    for (const target of [
      outputRoot,
      ...locales.map((locale) => path.join(outputRoot, locale)),
    ]) {
      fs.mkdirSync(path.join(target, base), { recursive: true });
      for (const [name, data] of Object.entries(artifacts))
        fs.writeFileSync(path.join(target, base, name), data, { flag: "wx" });
    }
    inputs.push({
      kind: "hia-document",
      path: path
        .relative(
          workspaceRoot,
          path.join(outputRoot, base, "document.hia.json"),
        )
        .split(path.sep)
        .join("/"),
      domain: "other",
      semanticPath: [
        { kind: "package", id: owner.token, label: manifest.name },
      ],
    });
    rows.push({
      owner: owner.id,
      package: manifest.name,
      version: manifest.version,
      bins: owner.bins,
      sourcePrefix:
        (owner.id === "main-repo" ? "main-repo" : "HIA/" + owner.id) +
        "/" +
        owner.runner,
      commands: description.commands.length,
      symbols: document.symbols.length,
      documentPath: base + "/document.hia.json",
      artifacts: Object.entries(artifacts).map(([name, data]) => ({
        path: base + "/" + name,
        sha256: hash(data),
      })),
    });
  }
  // <lang><zh-CN>逐语言保留同一采用记录，使既有根/当前/封版快照装配均携带实际证据。</zh-CN><en>Retain the same adoption record in each locale so existing root/current/release snapshot assembly carries actual evidence.</en></lang>
  for (const target of [
    outputRoot,
    ...locales.map((locale) => path.join(outputRoot, locale)),
  ]) {
    fs.mkdirSync(path.join(target, "commands"), { recursive: true });
    fs.writeFileSync(
      path.join(target, "commands/adoption.json"),
      JSON.stringify({ rows }, null, 2) + "\n",
      { flag: "wx" },
    );
  }
  return { inputs, sources };
}

/**
 * @lang zh-CN 在原生生成完成后逐节点核对命令内容、原工件、来源与静态恢复页。
 * @lang en Check command nodes, native artifacts, source paths and static recovery pages after native generation.
 * @param {string} outputRoot <lang><zh-CN>当前公开生产根。</zh-CN><en>Current public production root.</en></lang>
 * @param {string} locale <lang><zh-CN>当前语言目录。</zh-CN><en>Current locale directory.</en></lang>
 * @returns {void} <lang><zh-CN>完整采用时无返回值。</zh-CN><en>No return value for complete adoption.</en></lang>
 * @throws {Error} <lang><zh-CN>缺工件、节点、字段或源码。</zh-CN><en>Missing artifacts, nodes, fields or sources.</en></lang>
 */
export function checkPublicReferenceCommands(outputRoot, locale) {
  const read = (file) =>
    JSON.parse(fs.readFileSync(path.join(outputRoot, file)));
  const report = read(locale + "/commands/adoption.json");
  assert(
    report.rows.length > 0 &&
      new Set(report.rows.map((row) => row.owner)).size === report.rows.length,
  );
  assert(
    report.rows.every((row) => owners.some((owner) => owner.id === row.owner)),
    "Unknown command owner.",
  );
  const entries = read(locale + "/project-index.json").entries;
  const manual = fs.readFileSync(
    new URL(`../site/src/content/reference.${locale}.md`, import.meta.url),
    "utf8",
  );
  for (const owner of owners.filter((owner) =>
    report.rows.some((row) => row.owner === owner.id),
  )) {
    const row = report.rows.find((item) => item.owner === owner.id);
    assert(
      row && row.symbols === owner.symbols && row.commands === owner.commands,
    );
    assert.deepEqual(row.bins, owner.bins);
    assert.equal(
      row.sourcePrefix,
      (owner.id === "main-repo" ? "main-repo" : "HIA/" + owner.id) +
        "/" +
        owner.runner,
      "Command source ownership drifted.",
    );
    for (const artifact of row.artifacts)
      for (const prefix of [locale + "/"]) {
        assert.equal(
          hash(fs.readFileSync(path.join(outputRoot, prefix, artifact.path))),
          artifact.sha256,
        );
      }
    const document = read(locale + "/" + row.documentPath);
    const base = "commands/" + owner.token;
    assert.deepEqual(
      document,
      projectCommandSources(
        read(locale + "/" + base + "/document.native.hia.json"),
        row.sourcePrefix,
        read(locale + "/" + base + "/description.json"),
      ),
      "Website command facts drifted.",
    );
    for (const symbol of document.symbols) {
      const matches = entries.filter((entry) => entry.symbolId === symbol.id);
      assert.equal(
        matches.length,
        1,
        "Command symbol is missing or duplicated.",
      );
      const entry = matches[0];
      if (owner.bins.includes(symbol.name))
        assert(
          manual.includes(
            "https://mandolin.github.io" +
              siteBases[owner.id] +
              locale +
              "/#entry=" +
              encodeURIComponent(entry.id),
          ),
          "Website command entry link drifted.",
        );
      assert.equal(entry.source.path, symbol.source.definedIn.relativePath);
      assert.equal(
        entry.source.range.start.line,
        symbol.source.definedIn.position.line,
      );
      const body = fs.readFileSync(
        path.join(outputRoot, locale, entry.contentPath),
        "utf8",
      );
      assert(
        body.includes(escape(symbol.signature)),
        "Command signature is missing.",
      );
      for (const field of Object.values(symbol.i18n.fields)) {
        assert(
          body.includes(escape(field.localizedText[locale])),
          "Localized command field is missing.",
        );
      }
      assert(
        fs.existsSync(path.join(outputRoot, locale, entry.noScriptPagePath)),
        "Command static page is missing.",
      );
      assert(
        entry.source.fetchUrl &&
          entry.source.linkUrl &&
          entry.source.publicAsset,
        "Command source is unavailable.",
      );
      const asset = fs.readFileSync(
        path.join(outputRoot, locale, entry.source.fetchUrl),
      );
      assert.equal(
        "sha384-" + createHash("sha384").update(asset).digest("base64"),
        entry.source.publicAsset.digest,
        "Command source asset digest drifted.",
      );
      const [sourcePage, anchor] = entry.source.linkUrl.split("#");
      assert(
        fs
          .readFileSync(path.join(outputRoot, locale, sourcePage), "utf8")
          .includes(`id="${anchor}"`),
        "Command source line anchor is missing.",
      );
    }
  }
}

/** @lang zh-CN 对照原生文本转义HTML，字段本身保持不变。 @lang en Escape native text for HTML comparison without changing its value. */
function escape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @lang zh-CN 仅接受规范相对文件路径，拒绝空段、越根和Windows替代语法。 @lang en Accept canonical relative file paths, rejecting empty segments, escapes and alternate Windows syntax. */
function safePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !/[\\:%?#\x00-\x1f\x7f]/u.test(value) &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

/** @lang zh-CN 对已读内存字节计算SHA-256，不再读取宿主。 @lang en Hash already-read memory bytes with SHA-256 without additional host reads. */
function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
