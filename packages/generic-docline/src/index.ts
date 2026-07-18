import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createHiaDiagnostic,
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  type HiaDiagnostic,
  type HiaDocument,
  type HiaSourceRange,
  type HiaSymbol
} from "@hia-doc/core";
import {
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  defineDocumentationProducer,
  type DocumentationProducerArtifact,
  type DocumentationProducerResult
} from "@hia-doc/plugin-sdk";

/**
 * Contract name for generic doc-line scanner configuration.
 *
 * 中文：通用 doc-line 扫描配置的 contract 名称。
 */
export const GENERIC_DOCLINE_CONFIG_CONTRACT = "generic-docline-config" as const;

/**
 * Draft contract version for generic doc-line scanner configuration.
 *
 * 中文：通用 doc-line 扫描配置的草案版本。
 */
export const GENERIC_DOCLINE_CONFIG_VERSION = "0.1.0-draft" as const;

/**
 * Contract name for generic doc-line extraction artifacts.
 *
 * 中文：通用 doc-line 抽取产物的 contract 名称。
 */
export const GENERIC_DOCLINE_EXTRACTION_CONTRACT = "generic-docline-extraction" as const;

/**
 * Draft contract version for generic doc-line extraction artifacts.
 *
 * 中文：通用 doc-line 抽取产物的草案版本。
 */
export const GENERIC_DOCLINE_EXTRACTION_VERSION = "0.1.0-draft" as const;

/**
 * Stable producer id used by the plugin-sdk boundary.
 *
 * 中文：plugin-sdk 边界使用的稳定 producer 标识。
 */
export const GENERIC_DOCLINE_PRODUCER_ID = "generic-docline" as const;

/**
 * Package producer version emitted into generated artifacts.
 *
 * 中文：写入生成产物的 producer 版本。
 */
export const GENERIC_DOCLINE_PRODUCER_VERSION = "0.1.0" as const;

/**
 * Supported P1 doc block attachment policy.
 *
 * 中文：P1 支持的文档块绑定策略。
 */
export type GenericDocLineAttachmentRule = "next-symbol";

/**
 * Supported P1 comment syntax families.
 *
 * 中文：P1 支持的注释语法族。
 */
export type GenericDocLineCommentKind = "line" | "block";

/**
 * Confidence level emitted by the heuristic scanner.
 *
 * 中文：启发式扫描器写入的置信度等级。
 */
export type GenericDocLineConfidence = "high" | "medium" | "low";

/**
 * Language-neutral symbol kinds for fallback documentation.
 *
 * 中文：fallback 文档化使用的语言中性 symbol kind。
 */
export type GenericDocLineSymbolKind =
  | "generic-module"
  | "generic-namespace"
  | "generic-type"
  | "generic-member"
  | "generic-function"
  | "generic-value"
  | "generic-section"
  | string;

/**
 * Comment syntax description consumed by the zero-dependency scanner.
 *
 * 中文：零依赖扫描器消费的注释语法描述。
 */
export interface GenericDocLineCommentSyntax {
  blockEnd?: string;
  blockLinePrefix?: string;
  blockStart?: string;
  kind: GenericDocLineCommentKind;
  linePrefix?: string;
}

/**
 * Marker that distinguishes documentation comments from ordinary comments.
 *
 * 中文：用于区分文档注释与普通注释的标记配置。
 */
export interface GenericDocLineDocBlockConfig {
  marker: string;
  stripMarker?: boolean;
}

/**
 * Regular expression rule used to locate a nearby source symbol.
 *
 * 中文：用于定位相邻源码 symbol 的正则锚点规则。
 */
export interface GenericDocLineSymbolAnchorRule {
  flags?: string;
  kindGroup?: string;
  nameGroup: string;
  pattern: string;
  signatureGroup?: string;
}

/**
 * Versioned configuration for a generic language or private DSL.
 *
 * 中文：面向通用语言或私有 DSL 的版本化配置。
 */
export interface GenericDocLineConfig {
  attachmentRule: GenericDocLineAttachmentRule;
  commentSyntax: GenericDocLineCommentSyntax;
  contract: typeof GENERIC_DOCLINE_CONFIG_CONTRACT;
  contractVersion: typeof GENERIC_DOCLINE_CONFIG_VERSION;
  defaultSymbolKind?: GenericDocLineSymbolKind;
  diagnosticProfile?: "strict" | "warn" | "off";
  docBlock: GenericDocLineDocBlockConfig;
  fileGlobs: string[];
  id?: string;
  inputRoot?: string;
  languageId: string;
  sourceRangePolicy?: "doc-and-symbol";
  symbolAnchorRule: GenericDocLineSymbolAnchorRule;
  symbolKindMapping?: Record<string, GenericDocLineSymbolKind>;
  title?: string;
  visibilityPolicy?: "all";
}

/**
 * One-based source position used by generic doc-line artifacts.
 *
 * 中文：通用 doc-line 产物使用的从 1 开始的源码位置。
 */
export interface GenericDocLinePosition {
  column: number;
  line: number;
}

/**
 * Inclusive source range recorded by the fallback scanner.
 *
 * 中文：fallback 扫描器记录的源码范围。
 */
export interface GenericDocLineRange {
  end: GenericDocLinePosition;
  start: GenericDocLinePosition;
}

/**
 * Documentation block discovered before symbol attachment.
 *
 * 中文：绑定 symbol 前发现的文档块。
 */
export interface GenericDocLineDocBlock {
  attachedSymbolId?: string;
  confidence: GenericDocLineConfidence;
  marker: string;
  range: GenericDocLineRange;
  relativePath: string;
  text: string;
}

/**
 * Source location and confidence metadata for a generic symbol.
 *
 * 中文：通用 symbol 的源码位置与置信度元数据。
 */
export interface GenericDocLineSource {
  confidence: GenericDocLineConfidence;
  docRange?: GenericDocLineRange;
  range: GenericDocLineRange;
  rangeSource: "scanner-basic";
  relativePath: string;
}

/**
 * Fallback symbol emitted from configured comments and source anchors.
 *
 * 中文：由配置化注释和源码锚点生成的 fallback symbol。
 */
export interface GenericDocLineSymbol {
  comment?: {
    kind: "generic-doc-comment";
    marker: string;
    summary: string;
    text: string;
  };
  confidence: GenericDocLineConfidence;
  id: string;
  kind: GenericDocLineSymbolKind;
  languageId: string;
  longname: string;
  name: string;
  signature?: string;
  source: GenericDocLineSource;
  visibility: "unknown";
}

/**
 * Reserved analyzer/adapter slot advertised by the P1 artifact.
 *
 * 中文：P1 产物声明的预留 analyzer/adapter 插槽。
 */
export interface GenericDocLineAdapterSlot {
  id: "scanner-basic" | "tree-sitter" | "universal-ctags" | "doxygen-import" | "lsp-semantic-tokens";
  status: "enabled" | "reserved";
  role: string;
}

/**
 * Complete generic doc-line extraction artifact.
 *
 * 中文：完整的通用 doc-line 抽取产物。
 */
export interface GenericDocLineExtraction {
  adapterSlots: GenericDocLineAdapterSlot[];
  config: {
    attachmentRule: GenericDocLineAttachmentRule;
    diagnosticProfile: "strict" | "warn" | "off";
    fileGlobs: string[];
    languageId: string;
  };
  contract: typeof GENERIC_DOCLINE_EXTRACTION_CONTRACT;
  contractVersion: typeof GENERIC_DOCLINE_EXTRACTION_VERSION;
  diagnostics: HiaDiagnostic[];
  docBlocks: GenericDocLineDocBlock[];
  generator: {
    name: "@hia-doc/generic-docline";
    version: typeof GENERIC_DOCLINE_PRODUCER_VERSION;
  };
  sourcesContentPolicy: "none";
  symbols: GenericDocLineSymbol[];
}

/**
 * Runtime options for scanning a workspace.
 *
 * 中文：扫描工作区所需的运行参数。
 */
export interface GenericDocLineRunOptions {
  config: GenericDocLineConfig;
  outputDirectory: string;
  workspaceRoot: string;
}

/**
 * Scan configured source files and produce a generic doc-line extraction
 * artifact.
 *
 * 中文：按照配置扫描源码文件，生成未知语言或私有 DSL 的通用文档化抽取产物。
 *
 * @param options - English: Workspace, output and config options. 中文：工作区、输出目录与配置。
 * @returns English: Generic extraction artifact. 中文：通用抽取产物。
 */
export async function scanGenericDocLine(options: GenericDocLineRunOptions): Promise<GenericDocLineExtraction> {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const inputRoot = path.resolve(workspaceRoot, options.config.inputRoot ?? ".");
  const diagnostics = validateGenericDocLineConfig(options.config);
  const files = diagnostics.some((diagnostic) => diagnostic.severity === "error")
    ? []
    : await findMatchingFiles(inputRoot, options.config.fileGlobs);
  const docBlocks: GenericDocLineDocBlock[] = [];
  const symbols: GenericDocLineSymbol[] = [];

  for (const filePath of files) {
    const relativePath = normalizeRelativePath(workspaceRoot, filePath);
    const content = await readFile(filePath, "utf8");
    const lines = splitLines(content);
    const comments = collectDocBlocks(lines, options.config, relativePath, diagnostics);
    const anchors = collectSymbolAnchors(lines, options.config, relativePath, diagnostics);
    const attached = attachDocBlocks(comments, anchors, options.config, diagnostics);
    docBlocks.push(...attached.docBlocks);
    symbols.push(...attached.symbols);
  }

  if (files.length === 0 && diagnostics.every((diagnostic) => diagnostic.severity !== "error")) {
    pushConfigurableDiagnostic(options.config, diagnostics,
      "HIA_GENERIC_DOCLINE_NO_FILES",
      "Generic doc-line scanner did not find matching files.",
      "warning"
    );
  }

  return {
    adapterSlots: createAdapterSlots(),
    config: {
      attachmentRule: options.config.attachmentRule,
      diagnosticProfile: options.config.diagnosticProfile ?? "warn",
      fileGlobs: options.config.fileGlobs,
      languageId: options.config.languageId
    },
    contract: GENERIC_DOCLINE_EXTRACTION_CONTRACT,
    contractVersion: GENERIC_DOCLINE_EXTRACTION_VERSION,
    diagnostics,
    docBlocks,
    generator: {
      name: "@hia-doc/generic-docline",
      version: GENERIC_DOCLINE_PRODUCER_VERSION
    },
    sourcesContentPolicy: "none",
    symbols
  };
}

/**
 * Convert a generic doc-line extraction artifact to a HIA document.
 *
 * 中文：将通用文档化抽取产物转换为 HIA document，供统一渲染和 source-linkage 消费。
 *
 * @param extraction - English: Generic extraction artifact. 中文：通用抽取产物。
 * @param options - English: Document identity options. 中文：文档身份选项。
 * @returns English: HIA document. 中文：HIA document。
 */
export function genericDocLineToHiaDocument(
  extraction: GenericDocLineExtraction,
  options: { defaultLocale?: string; documentId?: string; title?: string } = {}
): HiaDocument {
  const defaultLocale = options.defaultLocale ?? "en";
  const symbols: HiaSymbol[] = extraction.symbols.map((symbol) => {
    const hiaSymbol: HiaSymbol = {
      id: symbol.id,
      kind: symbol.kind,
      longname: symbol.longname,
      metadata: {
        confidence: symbol.confidence,
        languageId: symbol.languageId,
        visibility: symbol.visibility
      },
      name: symbol.name,
      source: {
        definedIn: {
          kind: "defined-in",
          language: symbol.languageId,
          position: toHiaPosition(symbol.source.range.start),
          range: toHiaRange(symbol.source.range),
          relativePath: symbol.source.relativePath,
          link: {
            enabled: false,
            openMode: "same-tab"
          }
        },
        diagnostics: [],
        fragments: symbol.source.docRange
          ? [{
              confidence: symbol.source.confidence,
              content: "",
              id: `${symbol.id}:doc-block`,
              kind: "source-fragment",
              language: symbol.languageId,
              range: toHiaRange(symbol.source.docRange),
              rangeSource: "heuristic",
              relativePath: symbol.source.relativePath
            }]
          : [],
        mode: "link",
        model: HIA_SOURCE_MODEL,
        modelVersion: HIA_SOURCE_MODEL_VERSION,
        primaryBlock: null,
        references: []
      },
      summary: symbol.comment?.summary ?? ""
    };
    if (symbol.signature) {
      hiaSymbol.signature = symbol.signature;
    }
    return hiaSymbol;
  });

  return {
    defaultLocale,
    diagnostics: extraction.diagnostics,
    id: options.documentId ?? `${extraction.config.languageId}-generic-docline`,
    locales: [defaultLocale],
    metadata: {
      contract: extraction.contract,
      contractVersion: extraction.contractVersion,
      profile: "generic-docline"
    },
    nodes: [{
      id: "root",
      kind: "root",
      symbolIds: symbols.map((symbol) => symbol.id),
      title: options.title ?? `${extraction.config.languageId} Generic Documentation`
    }],
    schemaVersion: HIA_CORE_CONTRACT_VERSION,
    symbols,
    title: options.title ?? `${extraction.config.languageId} Generic Documentation`
  };
}

/**
 * Run the generic doc-line producer with a config file input.
 *
 * 中文：通过 producer runtime 读取配置文件并输出 extraction 与 HIA document。
 */
export const genericDocLineProducer = defineDocumentationProducer({
  descriptor: {
    capabilities: {
      incremental: false,
      sourceLinkage: true,
      watch: false
    },
    contract: DOCUMENTATION_PRODUCER_CONTRACT,
    contractVersion: DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
    displayName: "Generic Doc-Line Fallback",
    id: GENERIC_DOCLINE_PRODUCER_ID,
    inputKinds: ["generic-docline-config"],
    outputKinds: ["generic-docline-extraction", "hia-document"],
    version: GENERIC_DOCLINE_PRODUCER_VERSION
  },
  async produce(request): Promise<DocumentationProducerResult> {
    const configInput = request.inputs.find((input) => input.kind === "generic-docline-config");
    if (!configInput) {
      return createProducerResult("failed", [], [
        createGenericDiagnostic("HIA_GENERIC_DOCLINE_CONFIG_MISSING", "Generic doc-line producer requires one config input.", "error")
      ]);
    }

    const configPath = path.resolve(request.workspaceRoot, configInput.path);
    const config = JSON.parse(await readFile(configPath, "utf8")) as GenericDocLineConfig;
    const extraction = await scanGenericDocLine({
      config,
      outputDirectory: request.outputDirectory,
      workspaceRoot: request.workspaceRoot
    });
    const documentOptions: { documentId?: string; title?: string } = {};
    if (config.id) {
      documentOptions.documentId = config.id;
    }
    if (config.title) {
      documentOptions.title = config.title;
    }
    const hiaDocument = genericDocLineToHiaDocument(extraction, documentOptions);

    await mkdir(request.outputDirectory, { recursive: true });
    const extractionPath = "generic-docline.extraction.json";
    const documentPath = "generic-docline.hia.json";
    await writeFile(path.join(request.outputDirectory, extractionPath), `${JSON.stringify(extraction, null, 2)}\n`, "utf8");
    await writeFile(path.join(request.outputDirectory, documentPath), `${JSON.stringify(hiaDocument, null, 2)}\n`, "utf8");

    const artifacts: DocumentationProducerArtifact[] = [
      {
        contract: GENERIC_DOCLINE_EXTRACTION_CONTRACT,
        contractVersion: GENERIC_DOCLINE_EXTRACTION_VERSION,
        id: "generic-docline-extraction",
        kind: "generic-docline-extraction",
        language: config.languageId,
        mediaType: "application/json",
        path: extractionPath
      },
      {
        contract: "hia-document",
        contractVersion: HIA_CORE_CONTRACT_VERSION,
        id: "generic-docline-hia-document",
        kind: "hia-document",
        language: config.languageId,
        mediaType: "application/json",
        path: documentPath
      }
    ];

    const hasErrors = extraction.diagnostics.some((diagnostic) => diagnostic.severity === "error");
    return createProducerResult(hasErrors ? "partial" : "success", artifacts, extraction.diagnostics);
  }
});

interface CandidateDocBlock {
  marker: string;
  range: GenericDocLineRange;
  relativePath: string;
  text: string;
}

interface CandidateSymbolAnchor {
  kind: GenericDocLineSymbolKind;
  lineIndex: number;
  name: string;
  range: GenericDocLineRange;
  relativePath: string;
  signature?: string;
}

function validateGenericDocLineConfig(config: GenericDocLineConfig): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (config.contract !== GENERIC_DOCLINE_CONFIG_CONTRACT || config.contractVersion !== GENERIC_DOCLINE_CONFIG_VERSION) {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_CONFIG_CONTRACT", "Generic doc-line config contract/version is unsupported.", "error"));
  }
  if (!config.languageId || !/^[a-z][a-z0-9._-]*$/.test(config.languageId)) {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_LANGUAGE_INVALID", "Generic doc-line config languageId must be a lower-case identifier.", "error"));
  }
  if (!Array.isArray(config.fileGlobs) || config.fileGlobs.length === 0) {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_GLOBS_INVALID", "Generic doc-line config requires at least one file glob.", "error"));
  }
  if (config.attachmentRule !== "next-symbol") {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_ATTACHMENT_UNSUPPORTED", "Generic doc-line P1 supports only next-symbol attachment.", "error"));
  }
  if (!config.docBlock?.marker) {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_MARKER_MISSING", "Generic doc-line config requires a doc block marker.", "error"));
  }
  try {
    new RegExp(config.symbolAnchorRule.pattern, config.symbolAnchorRule.flags);
  } catch (error) {
    diagnostics.push(createGenericDiagnostic("HIA_GENERIC_DOCLINE_ANCHOR_REGEX_INVALID", `Symbol anchor pattern is invalid: ${errorMessage(error)}`, "error"));
  }
  return diagnostics;
}

function collectDocBlocks(
  lines: readonly string[],
  config: GenericDocLineConfig,
  relativePath: string,
  diagnostics: HiaDiagnostic[]
): CandidateDocBlock[] {
  return config.commentSyntax.kind === "line"
    ? collectLineDocBlocks(lines, config, relativePath, diagnostics)
    : collectBlockDocBlocks(lines, config, relativePath, diagnostics);
}

function collectLineDocBlocks(
  lines: readonly string[],
  config: GenericDocLineConfig,
  relativePath: string,
  diagnostics: HiaDiagnostic[]
): CandidateDocBlock[] {
  const prefix = config.commentSyntax.linePrefix ?? "";
  const blocks: CandidateDocBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trimStart().startsWith(prefix)) {
      index += 1;
      continue;
    }

    const start = index;
    const texts: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trimStart().startsWith(prefix)) {
      texts.push(stripLinePrefix(lines[index] ?? "", prefix));
      index += 1;
    }

    const rawText = rawDocText(texts);
    const text = normalizeDocText(texts, config);
    if (rawText.includes(config.docBlock.marker)) {
      blocks.push({
        marker: config.docBlock.marker,
        range: {
          start: { line: start + 1, column: 1 },
          end: { line: index, column: (lines[index - 1] ?? "").length + 1 }
        },
        relativePath,
        text
      });
    } else if (texts.some((item) => item.trim().length > 0)) {
      pushConfigurableDiagnostic(config, diagnostics,
        "HIA_GENERIC_DOCLINE_COMMENT_IGNORED",
        "Comment block does not contain the configured doc marker.",
        "info",
        relativePath
      );
    }
  }
  return blocks;
}

function collectBlockDocBlocks(
  lines: readonly string[],
  config: GenericDocLineConfig,
  relativePath: string,
  diagnostics: HiaDiagnostic[]
): CandidateDocBlock[] {
  const startMarker = config.commentSyntax.blockStart ?? "";
  const endMarker = config.commentSyntax.blockEnd ?? "";
  const blocks: CandidateDocBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.includes(startMarker)) {
      index += 1;
      continue;
    }
    const start = index;
    const texts: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      texts.push(stripBlockMarkers(current, config, index === start));
      if (current.includes(endMarker)) {
        index += 1;
        break;
      }
      index += 1;
    }
    const rawText = rawDocText(texts);
    const text = normalizeDocText(texts, config);
    if (rawText.includes(config.docBlock.marker)) {
      blocks.push({
        marker: config.docBlock.marker,
        range: {
          start: { line: start + 1, column: 1 },
          end: { line: index, column: (lines[index - 1] ?? "").length + 1 }
        },
        relativePath,
        text
      });
    } else {
      pushConfigurableDiagnostic(config, diagnostics,
        "HIA_GENERIC_DOCLINE_COMMENT_IGNORED",
        "Comment block does not contain the configured doc marker.",
        "info",
        relativePath
      );
    }
  }
  return blocks;
}

function collectSymbolAnchors(
  lines: readonly string[],
  config: GenericDocLineConfig,
  relativePath: string,
  diagnostics: HiaDiagnostic[]
): CandidateSymbolAnchor[] {
  const regex = new RegExp(config.symbolAnchorRule.pattern, config.symbolAnchorRule.flags);
  const anchors: CandidateSymbolAnchor[] = [];
  lines.forEach((line, index) => {
    const match = regex.exec(line);
    if (!match?.groups) {
      return;
    }
    const name = match.groups[config.symbolAnchorRule.nameGroup];
    if (!name) {
      pushConfigurableDiagnostic(config, diagnostics, "HIA_GENERIC_DOCLINE_ANCHOR_NAME_MISSING", "Symbol anchor matched without a name group.", "warning", relativePath);
      return;
    }
    const rawKind = config.symbolAnchorRule.kindGroup ? match.groups[config.symbolAnchorRule.kindGroup] : undefined;
    const mappedKind = rawKind ? config.symbolKindMapping?.[rawKind] : undefined;
    const kind = mappedKind ?? config.defaultSymbolKind ?? "generic-section";
    const anchor: CandidateSymbolAnchor = {
      kind,
      lineIndex: index,
      name,
      range: {
        start: { line: index + 1, column: 1 },
        end: { line: index + 1, column: line.length + 1 }
      },
      relativePath
    };
    const signature = config.symbolAnchorRule.signatureGroup ? match.groups[config.symbolAnchorRule.signatureGroup] : line.trim();
    if (signature) {
      anchor.signature = signature;
    }
    anchors.push(anchor);
  });
  return anchors;
}

function attachDocBlocks(
  docBlocks: readonly CandidateDocBlock[],
  anchors: readonly CandidateSymbolAnchor[],
  config: GenericDocLineConfig,
  diagnostics: HiaDiagnostic[]
): { docBlocks: GenericDocLineDocBlock[]; symbols: GenericDocLineSymbol[] } {
  const emittedBlocks: GenericDocLineDocBlock[] = [];
  const symbols: GenericDocLineSymbol[] = [];
  const usedAnchorIndexes = new Set<number>();

  for (const block of docBlocks) {
    const anchorIndex = anchors.findIndex((anchor, index) =>
      !usedAnchorIndexes.has(index) &&
      anchor.relativePath === block.relativePath &&
      anchor.lineIndex + 1 > block.range.end.line
    );
    if (anchorIndex === -1) {
      pushConfigurableDiagnostic(config, diagnostics, "HIA_GENERIC_DOCLINE_ORPHAN_BLOCK", "Doc block could not attach to the next symbol.", "warning", block.relativePath);
      emittedBlocks.push({ ...block, confidence: "low" });
      continue;
    }

    const anchor = anchors[anchorIndex];
    if (!anchor) {
      continue;
    }
    usedAnchorIndexes.add(anchorIndex);
    const id = createSymbolId(config.languageId, anchor.relativePath, anchor.name);
    const text = stripConfiguredMarker(block.text, config);
    emittedBlocks.push({
      ...block,
      attachedSymbolId: id,
      confidence: "medium",
      text
    });
    const nextSymbol: GenericDocLineSymbol = {
      comment: {
        kind: "generic-doc-comment",
        marker: block.marker,
        summary: firstSentence(text),
        text
      },
      confidence: "medium",
      id,
      kind: anchor.kind,
      languageId: config.languageId,
      longname: `${config.languageId}:${anchor.relativePath}:${anchor.name}`,
      name: anchor.name,
      source: {
        confidence: "medium",
        docRange: block.range,
        range: anchor.range,
        rangeSource: "scanner-basic",
        relativePath: anchor.relativePath
      },
      visibility: "unknown"
    };
    if (anchor.signature) {
      nextSymbol.signature = anchor.signature;
    }
    symbols.push(nextSymbol);
  }

  for (const [index, anchor] of anchors.entries()) {
    if (!usedAnchorIndexes.has(index)) {
      pushConfigurableDiagnostic(config, diagnostics,
        "HIA_GENERIC_DOCLINE_MISSING_DOC",
        `Symbol ${anchor.name} has no attached doc block.`,
        config.diagnosticProfile === "strict" ? "warning" : "info",
        anchor.relativePath
      );
    }
  }

  return { docBlocks: emittedBlocks, symbols };
}

async function findMatchingFiles(root: string, globs: readonly string[]): Promise<string[]> {
  const allFiles = await walkFiles(root);
  return allFiles
    .filter((filePath) => {
      const relative = normalizeRelativePath(root, filePath);
      return globs.some((glob) => matchesGlob(relative, glob));
    })
    .sort((left, right) => left.localeCompare(right));
}

async function walkFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      output.push(...await walkFiles(absolute));
    } else if (entry.isFile()) {
      output.push(absolute);
    } else {
      const info = await stat(absolute);
      if (info.isFile()) {
        output.push(absolute);
      }
    }
  }
  return output;
}

function matchesGlob(relativePath: string, glob: string): boolean {
  const normalizedGlob = glob.replaceAll("\\", "/");
  if (normalizedGlob.startsWith("**/*")) {
    return relativePath.endsWith(normalizedGlob.slice(4));
  }
  if (normalizedGlob.endsWith("/**")) {
    return relativePath.startsWith(normalizedGlob.slice(0, -3));
  }
  if (normalizedGlob.includes("*")) {
    const pattern = `^${escapeRegExp(normalizedGlob).replaceAll("\\*", ".*")}$`;
    return new RegExp(pattern).test(relativePath);
  }
  return relativePath === normalizedGlob;
}

function stripLinePrefix(line: string, prefix: string): string {
  const trimmedStart = line.trimStart();
  const withoutPrefix = trimmedStart.startsWith(prefix) ? trimmedStart.slice(prefix.length) : trimmedStart;
  return withoutPrefix.replace(/^\s?/, "");
}

function stripBlockMarkers(line: string, config: GenericDocLineConfig, firstLine: boolean): string {
  let value = line.trim();
  if (firstLine && config.commentSyntax.blockStart) {
    value = value.replace(config.commentSyntax.blockStart, "");
  }
  if (config.commentSyntax.blockEnd) {
    value = value.replace(config.commentSyntax.blockEnd, "");
  }
  if (config.commentSyntax.blockLinePrefix && value.startsWith(config.commentSyntax.blockLinePrefix)) {
    value = value.slice(config.commentSyntax.blockLinePrefix.length);
  }
  return value.trim();
}

function normalizeDocText(lines: readonly string[], config: GenericDocLineConfig): string {
  const text = rawDocText(lines);
  return config.docBlock.stripMarker === true ? stripConfiguredMarker(text, config) : text;
}

function rawDocText(lines: readonly string[]): string {
  return lines.map((line) => line.trim()).join("\n").trim();
}

function stripConfiguredMarker(text: string, config: GenericDocLineConfig): string {
  return text.split("\n")
    .map((line) => line.replace(config.docBlock.marker, "").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = /[.!?。！？]/.exec(trimmed);
  return match ? trimmed.slice(0, match.index + match[0].length).trim() : trimmed.split("\n")[0]?.trim() ?? "";
}

function toHiaRange(range: GenericDocLineRange): HiaSourceRange {
  return {
    end: toHiaPosition(range.end),
    start: toHiaPosition(range.start)
  };
}

function toHiaPosition(position: GenericDocLinePosition): { column: number; line: number } {
  return {
    column: position.column,
    line: position.line
  };
}

function createProducerResult(
  status: DocumentationProducerResult["status"],
  artifacts: DocumentationProducerArtifact[],
  diagnostics: HiaDiagnostic[]
): DocumentationProducerResult {
  return {
    artifacts,
    contract: DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    diagnostics,
    producer: {
      id: GENERIC_DOCLINE_PRODUCER_ID,
      version: GENERIC_DOCLINE_PRODUCER_VERSION
    },
    status
  };
}

function createAdapterSlots(): GenericDocLineAdapterSlot[] {
  return [
    { id: "scanner-basic", role: "Built-in zero-dependency scanner.", status: "enabled" },
    { id: "tree-sitter", role: "Reserved syntax-aware analyzer slot after grammar/license review.", status: "reserved" },
    { id: "universal-ctags", role: "Reserved symbol inventory analyzer slot after binary/output audit.", status: "reserved" },
    { id: "doxygen-import", role: "Reserved existing documentation import slot; not a default dependency.", status: "reserved" },
    { id: "lsp-semantic-tokens", role: "Reserved IDE runtime context slot; not offline source of truth.", status: "reserved" }
  ];
}

function createSymbolId(languageId: string, relativePath: string, name: string): string {
  return `generic:${languageId}:${relativePath}:${name}`.replace(/[^A-Za-z0-9:._/-]/g, "-");
}

function createGenericDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnostic["severity"],
  targetPath?: string
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, targetPath ? { targetPath } : {});
}

function pushConfigurableDiagnostic(
  config: GenericDocLineConfig,
  diagnostics: HiaDiagnostic[],
  code: string,
  message: string,
  severity: HiaDiagnostic["severity"],
  targetPath?: string
): void {
  if (config.diagnosticProfile === "off" && severity !== "error") {
    return;
  }
  diagnostics.push(createGenericDiagnostic(code, message, severity, targetPath));
}

function normalizeRelativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
