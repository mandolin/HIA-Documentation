import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

export * from "./project-manifest.js";

export const HIA_CONFIG_SCHEMA_VERSION = "0.1.0";
export const HIA_CONFIG_FILE_NAMES = ["hia.config.json"] as const;
export const HIA_CONFIG_SOURCE_MODES = ["none", "file", "external"] as const;
export const HIA_CONFIG_SOURCE_OPEN_MODES = ["same-tab", "new-tab"] as const;
export const HIA_CONFIG_SOURCE_PRESENTATIONS = ["none", "link", "embed", "fetch"] as const;
export const HIA_CONFIG_SOURCE_FETCH_TRIGGERS = ["on-expand", "manual"] as const;
export const HIA_CONFIG_PROJECT_LAYOUTS = ["split-site", "single-page"] as const;
/**
 * Portal IA contract 的中性 identity；config 只验证 vocabulary，不成为 runtime contract owner。
 * Neutral Portal IA contract identity; config validates vocabulary without becoming the runtime contract owner.
 */
export const HIA_CONFIG_PORTAL_IA_CONTRACT = "documentation-portal-information-architecture";
/** Portal IA 首轮只接受 exact draft version。The first Portal IA slice accepts only this exact draft version. */
export const HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION = "0.1.0-draft";
/** 内容分组与获取时机保持正交。Content grouping remains orthogonal to acquisition timing. */
export const HIA_CONFIG_PORTAL_CONTENT_GROUPINGS = ["entry", "semantic-container"] as const;
/** fragment 获取策略闭集。Closed fragment acquisition strategy set. */
export const HIA_CONFIG_PORTAL_LOADING_STRATEGIES = ["lazy", "eager"] as const;
/** member 呈现位置闭集。Closed member presentation placement set. */
export const HIA_CONFIG_PORTAL_MEMBER_PLACEMENTS = ["separate", "with-parent"] as const;
/** 首轮 touched-label catalog 支持的 UI locale。UI locales supported by the first touched-label catalog. */
export const HIA_CONFIG_PORTAL_UI_LOCALES = ["zh-CN", "en"] as const;
export const HIA_CONFIG_THEME_NAMES = ["default"] as const;

export interface HiaProjectConfig {
  schemaVersion?: string;
  docs?: HiaDocsConfig;
}

export interface HiaDocsConfig {
  input?: string;
  projectManifest?: string;
  output?: string;
  locale?: string;
  locales?: string[];
  manifest?: string;
  renderer?: HiaRendererHtmlConfig;
  theme?: HiaThemeConfig;
  source?: HiaSourceLinkConfig;
}

export interface HiaRendererHtmlConfig {
  /** 生成站点标题。Generated site title. */
  title?: string;
  /** 是否输出默认主题静态资源。Whether to emit default theme assets. */
  includeThemeAssets?: boolean;
  /** 大型项目默认使用分片站点；单页模式仅用于兼容和小型输出。Large projects default to split-site; single-page is for compatibility and small outputs. */
  projectLayout?: typeof HIA_CONFIG_PROJECT_LAYOUTS[number];
  /**
   * 显式 Portal IA 配置；缺失时 renderer 保持 P3 兼容路径。
   * Explicit Portal IA configuration; omission preserves the P3-compatible renderer path.
   */
  informationArchitecture?: HiaPortalInformationArchitectureConfig;
  /** UI chrome 语言，与 content locale 分离。UI chrome locale, separate from content locale. */
  uiLocale?: typeof HIA_CONFIG_PORTAL_UI_LOCALES[number];
}

/**
 * Portal IA 的三个独立配置维度；所有字段均可省略并使用 contract defaults。
 * Three independent Portal IA dimensions; every field may be omitted to use contract defaults.
 */
export interface HiaPortalInformationArchitectureConfig {
  /** 可选 exact contract identity，用于显式能力钉住。Optional exact contract identity for explicit capability pinning. */
  contract?: typeof HIA_CONFIG_PORTAL_IA_CONTRACT;
  /** 可选 exact draft version；未知 draft fail closed。Optional exact draft version; unknown drafts fail closed. */
  contractVersion?: typeof HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION;
  /** 逻辑内容边界，不决定下载时机。Logical content boundary; does not decide download timing. */
  contentGrouping?: typeof HIA_CONFIG_PORTAL_CONTENT_GROUPINGS[number];
  /** fragment 获取时机，不改变 canonical identity。Fragment acquisition timing; does not change canonical identity. */
  loadingStrategy?: typeof HIA_CONFIG_PORTAL_LOADING_STRATEGIES[number];
  /** member 的呈现位置，不替换 canonical member route。Member presentation placement; does not replace its canonical route. */
  memberPlacement?: typeof HIA_CONFIG_PORTAL_MEMBER_PLACEMENTS[number];
}

export interface HiaThemeConfig {
  name?: string;
  skin?: string;
}

export interface HiaSourceLinkConfig {
  /** 是否启用源码呈现；false 会覆盖 presentation 并按 none 处理。Whether source presentation is enabled; false overrides presentation as none. */
  enabled?: boolean;
  /** 旧版兼容模式；新配置应使用 presentation。Legacy compatibility mode; new configurations should use presentation. */
  mode?: typeof HIA_CONFIG_SOURCE_MODES[number];
  /** linkBaseUrl 的兼容别名。Compatibility alias for linkBaseUrl. */
  baseUrl?: string;
  /** 浏览器源码链接的仓库或服务基础 URL。Repository or service base URL used for browser source links. */
  linkBaseUrl?: string;
  /** fetch 模式下返回纯文本源码的基础 URL。Base URL returning plain source text in fetch mode. */
  fetchBaseUrl?: string;
  /** fetch 模式的加载触发方式；默认展开源码区域时自动加载。Fetch loading trigger; defaults to loading when the source details are expanded. */
  fetchTrigger?: typeof HIA_CONFIG_SOURCE_FETCH_TRIGGERS[number];
  /** embed 模式读取相对源码路径时使用的本地根目录。Local root used to resolve relative source paths in embed mode. */
  localRoot?: string;
  /** 源码卡片呈现策略。Source-card presentation policy. */
  presentation?: typeof HIA_CONFIG_SOURCE_PRESENTATIONS[number];
  /** embed 模式生成的源码详情是否默认展开。Whether embedded source details are expanded by default. */
  defaultExpanded?: boolean;
  /** 单个源码片段允许嵌入或动态显示的最大行数。Maximum lines embedded or dynamically displayed per source excerpt. */
  maxLines?: number;
  /** 旧版源码链接打开方式；当前项目站链接沿用普通浏览器导航。Legacy source-link open mode; project-site links currently use normal browser navigation. */
  openMode?: typeof HIA_CONFIG_SOURCE_OPEN_MODES[number];
}

export interface HiaConfigLoadOptions {
  cwd?: string;
  configPath?: string;
  fileNames?: readonly string[];
}

export interface HiaLoadedProjectConfig {
  config: HiaProjectConfig;
  found: boolean;
  baseDir: string;
  diagnostics: HiaDiagnostic[];
  path?: string;
}

export async function loadHiaProjectConfig(options: HiaConfigLoadOptions = {}): Promise<HiaLoadedProjectConfig> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const configPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : await findHiaConfigPath(cwd, options.fileNames || HIA_CONFIG_FILE_NAMES);

  if (!configPath) {
    return {
      config: {},
      found: false,
      baseDir: cwd,
      diagnostics: []
    };
  }

  const baseDir = path.dirname(configPath);

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const diagnostics = validateHiaProjectConfig(parsed);
    const result: HiaLoadedProjectConfig = {
      config: isRecord(parsed) ? parsed as HiaProjectConfig : {},
      found: true,
      baseDir,
      diagnostics,
      path: configPath
    };

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      config: {},
      found: true,
      baseDir,
      diagnostics: [
        createConfigDiagnostic(
          error instanceof SyntaxError ? "HIA_CONFIG_PARSE_FAILED" : "HIA_CONFIG_READ_FAILED",
          `${configPath} - ${message}`,
          "error",
          undefined,
          {
            configPath
          }
        )
      ],
      path: configPath
    };
  }
}

export async function findHiaConfigPath(cwd: string, fileNames: readonly string[] = HIA_CONFIG_FILE_NAMES): Promise<string | undefined> {
  for (const fileName of fileNames) {
    const candidate = path.resolve(cwd, fileName);

    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function validateHiaProjectConfig(value: unknown): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_INVALID", "HIA config must be a JSON object.", "error"));
    return diagnostics;
  }

  validateOptionalString(value, "schemaVersion", diagnostics);

  if (typeof value.schemaVersion === "string" && value.schemaVersion !== HIA_CONFIG_SCHEMA_VERSION) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SCHEMA_UNSUPPORTED",
      `Unsupported HIA config schemaVersion: ${value.schemaVersion}.`,
      "error",
      "schemaVersion"
    ));
  }

  if (value.docs !== undefined) {
    validateDocsConfig(value.docs, diagnostics, "docs");
  }

  return diagnostics;
}

export function hasConfigErrors(diagnostics: HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function validateDocsConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_DOCS_INVALID", "docs must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "input", diagnostics, targetPath);
  validateOptionalString(value, "projectManifest", diagnostics, targetPath);
  validateOptionalString(value, "output", diagnostics, targetPath);
  validateOptionalString(value, "locale", diagnostics, targetPath);
  validateOptionalString(value, "manifest", diagnostics, targetPath);
  validateOptionalStringArray(value, "locales", diagnostics, targetPath);

  if (value.renderer !== undefined) {
    validateRendererConfig(value.renderer, diagnostics, `${targetPath}.renderer`);
  }

  if (value.theme !== undefined) {
    validateThemeConfig(value.theme, diagnostics, `${targetPath}.theme`);
  }

  if (value.source !== undefined) {
    validateSourceConfig(value.source, diagnostics, `${targetPath}.source`);
  }
}

function validateRendererConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_RENDERER_INVALID", "docs.renderer must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "title", diagnostics, targetPath);
  validateOptionalBoolean(value, "includeThemeAssets", diagnostics, targetPath);
  validateOptionalEnum(value, "projectLayout", HIA_CONFIG_PROJECT_LAYOUTS, diagnostics, targetPath);
  validateOptionalEnum(value, "uiLocale", HIA_CONFIG_PORTAL_UI_LOCALES, diagnostics, targetPath);

  // <lang zh-CN>只有显式 IA 对象才进入 P4 runtime；未配置时继续走 P3。</lang>
  // <lang en>Only an explicit IA object enters the P4 runtime; omission keeps the P3 path.</lang>
  if (value.informationArchitecture !== undefined) {
    validatePortalInformationArchitectureConfig(
      value.informationArchitecture,
      diagnostics,
      `${targetPath}.informationArchitecture`
    );

    if (value.projectLayout === "single-page") {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED",
        "docs.renderer.informationArchitecture is supported only with split-site in this draft.",
        "error",
        `${targetPath}.informationArchitecture`
      ));
    }
  }
}

/**
 * 校验 Portal IA exact draft 与三维闭集，拒绝尚无确定语义的扩展字段。
 * Validates the exact Portal IA draft and its three closed dimensions, rejecting extension fields without defined semantics.
 */
function validatePortalInformationArchitectureConfig(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_IA_INVALID",
      "docs.renderer.informationArchitecture must be an object.",
      "error",
      targetPath
    ));
    return;
  }

  // <lang zh-CN>closed-world key 检查避免 draft consumer 静默接受未实现语义。</lang>
  // <lang en>The closed-world key check prevents draft consumers from silently accepting unimplemented semantics.</lang>
  const allowedFields = new Set([
    "contract",
    "contractVersion",
    "contentGrouping",
    "loadingStrategy",
    "memberPlacement"
  ]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_IA_FIELD_UNSUPPORTED",
        `Unsupported Portal IA field: ${field}.`,
        "error",
        `${targetPath}.${field}`
      ));
    }
  }

  validateOptionalString(value, "contract", diagnostics, targetPath);
  validateOptionalString(value, "contractVersion", diagnostics, targetPath);
  validateOptionalEnum(value, "contentGrouping", HIA_CONFIG_PORTAL_CONTENT_GROUPINGS, diagnostics, targetPath);
  validateOptionalEnum(value, "loadingStrategy", HIA_CONFIG_PORTAL_LOADING_STRATEGIES, diagnostics, targetPath);
  validateOptionalEnum(value, "memberPlacement", HIA_CONFIG_PORTAL_MEMBER_PLACEMENTS, diagnostics, targetPath);

  if (typeof value.contract === "string" && value.contract !== HIA_CONFIG_PORTAL_IA_CONTRACT) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_IA_CONTRACT_UNSUPPORTED",
      `Unsupported Portal IA contract: ${value.contract}.`,
      "error",
      `${targetPath}.contract`
    ));
  }
  if (typeof value.contractVersion === "string" && value.contractVersion !== HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_IA_VERSION_UNSUPPORTED",
      `Unsupported Portal IA contractVersion: ${value.contractVersion}.`,
      "error",
      `${targetPath}.contractVersion`
    ));
  }
}

function validateThemeConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_THEME_INVALID", "docs.theme must be an object.", "error", targetPath));
    return;
  }

  validateOptionalString(value, "name", diagnostics, targetPath);
  validateOptionalString(value, "skin", diagnostics, targetPath);

  if (typeof value.name === "string" && !HIA_CONFIG_THEME_NAMES.includes(value.name as typeof HIA_CONFIG_THEME_NAMES[number])) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_THEME_UNSUPPORTED",
      `Theme "${value.name}" is not implemented yet; the default theme will be used.`,
      "warning",
      `${targetPath}.name`,
      {
        requestedTheme: value.name,
        fallbackTheme: "default"
      }
    ));
  }
}

function validateSourceConfig(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_INVALID", "docs.source must be an object.", "error", targetPath));
    return;
  }

  validateOptionalBoolean(value, "enabled", diagnostics, targetPath);
  validateOptionalString(value, "baseUrl", diagnostics, targetPath);
  validateOptionalString(value, "linkBaseUrl", diagnostics, targetPath);
  validateOptionalString(value, "fetchBaseUrl", diagnostics, targetPath);
  validateOptionalEnum(value, "fetchTrigger", HIA_CONFIG_SOURCE_FETCH_TRIGGERS, diagnostics, targetPath);
  validateOptionalString(value, "localRoot", diagnostics, targetPath);
  validateOptionalEnum(value, "mode", HIA_CONFIG_SOURCE_MODES, diagnostics, targetPath);
  validateOptionalEnum(value, "presentation", HIA_CONFIG_SOURCE_PRESENTATIONS, diagnostics, targetPath);
  validateOptionalBoolean(value, "defaultExpanded", diagnostics, targetPath);
  validateOptionalPositiveInteger(value, "maxLines", diagnostics, targetPath);
  validateOptionalEnum(value, "openMode", HIA_CONFIG_SOURCE_OPEN_MODES, diagnostics, targetPath);

  if (value.presentation === "fetch" && (typeof value.fetchBaseUrl !== "string" || value.fetchBaseUrl.length === 0)) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SOURCE_FETCH_BASE_REQUIRED",
      "docs.source.fetchBaseUrl is required when docs.source.presentation is fetch.",
      "error",
      `${targetPath}.fetchBaseUrl`
    ));
  }

  if ((value.enabled === false || value.mode === "none") && value.presentation !== undefined && value.presentation !== "none") {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SOURCE_PRESENTATION_DISABLED",
      "docs.source.presentation must be none when docs.source is disabled or mode is none.",
      "error",
      `${targetPath}.presentation`
    ));
  }
}

function validateOptionalPositiveInteger(
  record: Record<string, unknown>,
  field: string,
  diagnostics: HiaDiagnostic[],
  prefix = ""
): void {
  const value = record[field];
  if (value !== undefined && (!Number.isInteger(value) || Number(value) <= 0)) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be a positive integer.`, "error", targetPath));
  }
}

function validateOptionalString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

function validateOptionalBoolean(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value !== undefined && typeof value !== "boolean") {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be a boolean.`, "error", targetPath));
  }
}

function validateOptionalStringArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value === undefined) {
    return;
  }

  const targetPath = prefix ? `${prefix}.${field}` : field;

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_FIELD_INVALID", `${targetPath} must be an array of non-empty strings.`, "error", targetPath));
  }
}

function validateOptionalEnum(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix = ""
): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_FIELD_INVALID",
      `${targetPath} must be one of: ${allowed.join(", ")}.`,
      "error",
      targetPath
    ));
  }
}

function createConfigDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}
