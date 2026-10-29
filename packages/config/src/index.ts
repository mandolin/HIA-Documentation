/**
 * @file
 * @lang zh-CN 只加载静态项目配置并验证已实现选项，资源URL不授予文件写入或远程执行权限。
 * @lang en Loads static project configuration and validates implemented options; resource URLs grant neither filesystem writes nor remote execution.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeDocumentationLocale, createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";
import { isProjectManifestJsonDataGraph } from "./manifest-json-data.js";

export * from "./project-manifest.js";

/**
 * @lang zh-CN 项目配置的精确根版本0.1.0，独立于软件包版本；省略根版本沿既有兼容校验。
 * @lang en Exact project-config root version 0.1.0, independent of package versions; omission retains existing compatibility validation.
 */
export const HIA_CONFIG_SCHEMA_VERSION = "0.1.0";
/**
 * @lang zh-CN 当前目录配置发现的默认有序文件名；共享只读约定，不向父目录递归发现。
 * @lang en Default ordered filenames for current-directory config discovery; shared readonly by contract, without recursive ancestor discovery.
 */
export const HIA_CONFIG_FILE_NAMES = ["hia.config.json"] as const;
/**
 * @lang zh-CN 旧源码策略闭集none/file/external；保留兼容输入，不授予文件或网络权限。
 * @lang en Legacy none/file/external source modes, retained as compatibility inputs without filesystem or network authority.
 */
export const HIA_CONFIG_SOURCE_MODES = ["none", "file", "external"] as const;
/**
 * @lang zh-CN 旧源码链接打开方式闭集；现代项目链接沿用浏览器导航。
 * @lang en Closed legacy source-link opening modes; modern project links use browser navigation.
 */
export const HIA_CONFIG_SOURCE_OPEN_MODES = ["same-tab", "new-tab"] as const;
/**
 * @lang zh-CN 源码呈现模式none/link/embed/fetch；正文公开与资产安全仍需独立授权。
 * @lang en Source presentation modes none/link/embed/fetch; source disclosure and asset safety require separate authorization.
 */
export const HIA_CONFIG_SOURCE_PRESENTATIONS = ["none", "link", "embed", "fetch"] as const;
/**
 * @lang zh-CN 同源公开源码资产的展开时或手动加载策略，不控制构建期文件访问。
 * @lang en On-expand or manual loading of same-origin public source assets, without controlling build-time file access.
 */
export const HIA_CONFIG_SOURCE_FETCH_TRIGGERS = ["on-expand", "manual"] as const;
/** @lang zh-CN CLI 可执行的 build-time 源码公开授权。 @lang en Build-time source-publication authorization executable by the CLI. */
export const HIA_CONFIG_SOURCE_PUBLIC_ASSET_POLICIES = ["none", "explicit-public"] as const;
/**
 * @lang zh-CN 项目输出布局split-site/single-page的闭集，不改变单文档入口的单页语义。
 * @lang en Closed split-site/single-page project layouts, without changing single-document rendering semantics.
 */
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
/**
 * @lang zh-CN
 * source-comment projection 的精确中性 contract pin；config 不拥有 runtime contract。
 *
 * @lang en
 * Exact neutral source-comment projection contract pin; config does not own the runtime contract.
 */
export const HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT = "documentation-source-comment-projection" as const;
/** @lang zh-CN P1 只接受这一精确 draft。 @lang en P1 accepts this exact draft only. */
export const HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION = "0.1.0-draft" as const;
/** @lang zh-CN 正文默认关闭，显式模式仍只允许投影纯文本。 @lang en Bodies default off; explicit mode still permits projected plain text only. */
export const HIA_CONFIG_SOURCE_COMMENT_CONTENT_POLICIES = ["none", "explicit-projected-text"] as const;
/** @lang zh-CN 已实现的默认主题及skin别名；未知主题继续产生兼容warning，不动态加载代码。 @lang en Implemented default theme and skin aliases; unknown themes retain compatibility warnings without dynamic code loading. */
export const HIA_CONFIG_THEME_NAMES = ["default", "portal.classic", "portal.graphite", "portal.lumen"] as const;
/** @lang zh-CN 镜像主题owner的semantic颜色词汇；配置校验不成为主题实现owner。 @lang en Mirrors the theme owner's semantic color vocabulary without making config validation the theme implementation owner. */
export const HIA_CONFIG_THEME_COLOR_NAMES = ["canvas", "surface", "surfaceMuted", "border", "text", "textMuted", "accent", "accentContrast", "accentSoft", "accentHover", "focusRing", "codeBackground", "codeText", "danger"] as const;
/** @lang zh-CN Portal owner 的内置 skin 闭集；不复用 JTH 私有 catalog。 @lang en Closed Portal-owned skin set; it does not reuse the private JTH catalog. */
export const HIA_CONFIG_PORTAL_SKINS = ["portal.classic", "portal.graphite", "portal.lumen"] as const;
/** @lang zh-CN skin 正交的 scheme 选择。 @lang en Scheme selection orthogonal to skin. */
export const HIA_CONFIG_PORTAL_SCHEMES = ["system", "light", "dark"] as const;

/**
 * @lang zh-CN 静态项目配置根，字段省略由各消费方应用默认值；不是可执行配置或验证证明。
 * @lang en Static project-config root whose omitted fields use consumer defaults; neither executable configuration nor proof of validation.
 */
export interface HiaProjectConfig {
  schemaVersion?: string;
  docs?: HiaDocsConfig;
}

/**
 * @lang zh-CN 文档输入、输出、语言与呈现策略；相对路径由宿主结合配置baseDir解释，结构验证不执行构建。
 * @lang en Documentation inputs, outputs, locales and presentation policy; hosts resolve relative paths against config baseDir, and structural validation does not execute builds.
 */
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

/**
 * @lang zh-CN 已实现HTML输出选项；项目布局、界面语言与正文语言独立，缺省遵循renderer文档。
 * @lang en Implemented HTML-output options with independent project layout, UI locale and content locale; omissions follow renderer documentation.
 */
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
  /**
   * @lang zh-CN
   * 显式 source-comment locale 与正文授权；与 UI locale、content locale 分离。
   *
   * @lang en
   * Explicit source-comment locale and body authorization, separate from UI and content locales.
   */
  sourceCommentProjection?: HiaSourceCommentProjectionConfig;
  /** UI chrome 语言，与 content locale 分离。UI chrome locale, separate from content locale. */
  uiLocale?: typeof HIA_CONFIG_PORTAL_UI_LOCALES[number];
  /**
   * @lang zh-CN
   * W-P123 完整性报告的公开 profile/surface identity；只声明 owner 接入身份，不携带翻译正文。
   *
   * @lang en
   * Public profile/surface identity for the W-P123 completeness report; it declares owner adoption without carrying translations.
   */
  uiLocaleCompleteness?: HiaPortalUiLocaleCompletenessConfig;
}

/**
 * @lang zh-CN
 * Portal UI locale 完整性报告的稳定身份配置。字段值是公开 ID，不是文件系统路径。
 *
 * @lang en
 * Stable identity configuration for the Portal UI-locale completeness report. Values are public IDs, not filesystem paths.
 */
export interface HiaPortalUiLocaleCompletenessConfig {
  profileId?: string;
  surfaceId?: string;
}

/**
 * @lang zh-CN
 * Portal P5 有界 slice 配置。locale 必填，避免从 UI/content locale 猜测注释语言。
 *
 * @lang en
 * Bounded Portal P5 slice configuration. Locale is required so comment language is never inferred from UI or content locale.
 */
export interface HiaSourceCommentProjectionConfig {
  contract?: typeof HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT;
  contractVersion?: typeof HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION;
  locale: string;
  contentPolicy?: typeof HIA_CONFIG_SOURCE_COMMENT_CONTENT_POLICIES[number];
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

/** @lang zh-CN 主题选择、安全品牌颜色与资源所有权配置，不动态执行主题代码。 @lang en Theme selection, safe brand colors and resource ownership without dynamic theme-code execution. */
export interface HiaThemeConfig {
  /** @lang zh-CN default或已实现skin的别名；显式skin优先，未知名称兼容回退。 @lang en Default or an implemented skin alias; explicit skin wins and unknown names retain compatibility fallback. */
  name?: string;
  /** @lang zh-CN 构建期无脚本默认 skin。 @lang en Build-time no-script default skin. */
  skin?: typeof HIA_CONFIG_PORTAL_SKINS[number];
  /** @lang zh-CN 构建期无脚本默认 scheme。 @lang en Build-time no-script default scheme. */
  scheme?: typeof HIA_CONFIG_PORTAL_SCHEMES[number];
  /** @lang zh-CN 明确的安全hex品牌颜色；省略时保留内置palette，不接收CSS代码。 @lang en Explicit safe hex brand colors; omission retains built-in palettes and accepts no CSS code. */
  colors?: Partial<Record<typeof HIA_CONFIG_THEME_COLOR_NAMES[number], string>>;
  /** @lang zh-CN 外部共享资源只声明同站URL引用，不授予向父目录写文件权限。 @lang en External shared assets declare same-site URL references only, granting no parent-directory file writes. */
  assets?: HiaThemeAssetsConfig;
}

/** @lang zh-CN 主题资源唯一所有者策略；默认local，external由独立的theme-assets命令或宿主提供资源。 @lang en Theme-asset ownership policy, defaulting to local; external assets are provided by a separate theme-assets command or host. */
export interface HiaThemeAssetsConfig {
  /** @lang zh-CN local随构建输出，external只生成引用。 @lang en Local emits with the build, while external emits references only. */
  mode?: "local" | "external";
  /** @lang zh-CN external必需的同站资源目录URL，可为相对或站点根相对，不是文件系统路径。 @lang en Same-site asset-directory URL required for external mode, relative or site-root-relative, never a filesystem path. */
  baseUrl?: string;
}

/**
 * @lang zh-CN 构建期源码公开与呈现策略；外部旧URL仅产生迁移诊断，明确公开资产策略与本地根由宿主校验。
 * @lang en Build-time source disclosure/presentation policy; legacy external URLs yield migration diagnostics, while hosts validate explicit public-asset policy and local roots.
 */
export interface HiaSourceLinkConfig {
  /** 是否启用源码呈现；false 会覆盖 presentation 并按 none 处理。Whether source presentation is enabled; false overrides presentation as none. */
  enabled?: boolean;
  /** 旧版兼容模式；新配置应使用 presentation。Legacy compatibility mode; new configurations should use presentation. */
  mode?: typeof HIA_CONFIG_SOURCE_MODES[number];
  /** @deprecated W-P117 起外部 link endpoint 不再进入 Portal 输出。Since W-P117, external link endpoints no longer enter Portal output. */
  baseUrl?: string;
  /** @deprecated W-P117 起 link 只指向 build-generated same-origin asset。Since W-P117, link points only to build-generated same-origin assets. */
  linkBaseUrl?: string;
  /** @deprecated W-P117 起 fetch 只消费 build-generated same-origin asset；该字段只用于产生迁移 diagnostic。Since W-P117, fetch consumes only build-generated same-origin assets; this field remains only for migration diagnostics. */
  fetchBaseUrl?: string;
  /** fetch 模式的加载触发方式；默认展开源码区域时自动加载。Fetch loading trigger; defaults to loading when the source details are expanded. */
  fetchTrigger?: typeof HIA_CONFIG_SOURCE_FETCH_TRIGGERS[number];
  /** embed 模式读取相对源码路径时使用的本地根目录。Local root used to resolve relative source paths in embed mode. */
  localRoot?: string;
  /** @lang zh-CN 显式授权 CLI 把安全相对源码片段发布为公开静态资源。 @lang en Explicitly authorizes the CLI to publish safe relative source excerpts as public static assets. */
  publicAssetPolicy?: typeof HIA_CONFIG_SOURCE_PUBLIC_ASSET_POLICIES[number];
  /** 源码卡片呈现策略。Source-card presentation policy. */
  presentation?: typeof HIA_CONFIG_SOURCE_PRESENTATIONS[number];
  /** embed 模式生成的源码详情是否默认展开。Whether embedded source details are expanded by default. */
  defaultExpanded?: boolean;
  /** 单个源码片段允许嵌入或动态显示的最大行数。Maximum lines embedded or dynamically displayed per source excerpt. */
  maxLines?: number;
  /** 旧版源码链接打开方式；当前项目站链接沿用普通浏览器导航。Legacy source-link open mode; project-site links currently use normal browser navigation. */
  openMode?: typeof HIA_CONFIG_SOURCE_OPEN_MODES[number];
}

/**
 * @lang zh-CN 只读配置加载参数；cwd默认进程目录，显式configPath优先，否则按fileNames顺序在cwd查找。
 * @lang en Readonly loading options; cwd defaults to the process directory, explicit configPath takes priority, otherwise fileNames are searched in order within cwd.
 */
export interface HiaConfigLoadOptions {
  cwd?: string;
  configPath?: string;
  fileNames?: readonly string[];
}

/**
 * @lang zh-CN 加载结果及诊断；baseDir/path是宿主内部绝对路径，不能直接作为公开诊断投射。found表示已定位路径，不表示验证成功。
 * @lang en Loaded config and diagnostics; baseDir/path are host-internal absolute paths and must not be projected directly into public diagnostics. Found indicates a located path, not validation success.
 */
export interface HiaLoadedProjectConfig {
  config: HiaProjectConfig;
  found: boolean;
  baseDir: string;
  diagnostics: HiaDiagnostic[];
  path?: string;
}

/**
 * @lang zh-CN 只读加载显式或发现的JSON配置，不改文件；未发现返回空配置/found=false，读取或解析失败返回固定安全诊断。
 * @lang en Loads explicit or discovered JSON configuration without writing files; absence returns empty config/found=false, while read/parse failures produce fixed safe diagnostics.
 * @param options <lang><zh-CN>工作目录、显式路径及有序候选名，缺省使用当前目录。</zh-CN><en>Working directory, explicit path and ordered names, defaulting to the current directory.</en></lang>
 * @returns <lang><zh-CN>配置、诊断及内部操作路径；调用者须检查error，不因found而接受无效配置。</zh-CN><en>Config, diagnostics and internal operational paths; callers must check errors rather than accepting invalid config merely because found is true.</en></lang>
 */
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
    // <lang><zh-CN>解析错误可能包含 JSON 片段，读取错误可能包含本机路径；仅输出固定公开诊断，内部路径仍由结果字段承担。</zh-CN><en>Parse errors may contain JSON fragments and read errors may contain local paths; emit only fixed public diagnostics while retaining the operational path in the result.</en></lang>
    const isParseFailure = error instanceof SyntaxError;

    return {
      config: {},
      found: true,
      baseDir,
      diagnostics: [
        createConfigDiagnostic(
          isParseFailure ? "HIA_CONFIG_PARSE_FAILED" : "HIA_CONFIG_READ_FAILED",
          isParseFailure ? "Project config cannot be parsed." : "Project config cannot be read.",
          "error"
        )
      ],
      path: configPath
    };
  }
}

/**
 * @lang zh-CN 按候选顺序在给定目录解析路径并检查可访问性，返回首个存在路径；不向父目录搜索或读取正文。
 * @lang en Resolves candidate paths in the given directory and returns the first accessible path, without ancestor search or body reads.
 * @param cwd <lang><zh-CN>用于解析候选名的宿主目录。</zh-CN><en>Host directory used to resolve candidate names.</en></lang>
 * @param fileNames <lang><zh-CN>有序候选名；可自定义，调用方负责路径范围。</zh-CN><en>Ordered customizable names; callers own the path boundary.</en></lang>
 * @returns <lang><zh-CN>首个可访问路径，或undefined；不证明该路径是有效JSON文件。</zh-CN><en>The first accessible path or undefined, without proving it is a valid JSON file.</en></lang>
 */
export async function findHiaConfigPath(cwd: string, fileNames: readonly string[] = HIA_CONFIG_FILE_NAMES): Promise<string | undefined> {
  for (const fileName of fileNames) {
    const candidate = path.resolve(cwd, fileName);

    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * @lang zh-CN 校验静态 HIA 项目配置。内存输入必须是普通、有限、无环 JSON 图；先拒绝自有访问器再读取字段，不执行文件操作。恶意 Proxy 的反射陷阱不受沙箱隔离。
 * @lang en Validates static HIA project configuration. In-memory input must be an ordinary, finite, acyclic JSON graph; own accessors are rejected before fields are read, with no file I/O. Reflection traps on hostile Proxies are not sandboxed.
 * @param value <lang><zh-CN>未信任的配置值；不修改输入，开放扩展字段仍可携带普通 JSON 值。</zh-CN><en>Untrusted config value; the input is not mutated, and open extension fields may still carry ordinary JSON values.</en></lang>
 * @returns <lang><zh-CN>固定、可公开的诊断；无效图不回显值或异常正文。</zh-CN><en>Fixed, public-safe diagnostics; an invalid graph does not echo values or exception text.</en></lang>
 */
export function validateHiaProjectConfig(value: unknown): HiaDiagnostic[] {
  // <lang><zh-CN>先为原始非对象输入保留既有诊断，再检查对象图的所有已知和扩展字段。</zh-CN><en>Keep the existing diagnostic for primitive input, then inspect every known and extension field in the object graph.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  if (value === null || typeof value !== "object") {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_INVALID", "HIA config must be a JSON object.", "error"));
    return diagnostics;
  }

  // <lang><zh-CN>复用同包普通 JSON 预检，并为配置拒绝隐藏对象字段：访问器、环、非有限数和非 JSON 实例均在属性读取前拒绝。</zh-CN><en>Reuse the package's ordinary-JSON preflight and reject hidden object fields for config; accessors, cycles, non-finite numbers, and non-JSON instances fail before property reads.</en></lang>
  if (!isProjectManifestJsonDataGraph(value, { rejectNonEnumerableObjectFields: true })) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_INVALID", "HIA config must contain ordinary finite acyclic JSON data.", "error"));
    return diagnostics;
  }

  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_INVALID", "HIA config must be a JSON object.", "error"));
    return diagnostics;
  }

  validateOptionalString(value, "schemaVersion", diagnostics);

  if (typeof value.schemaVersion === "string" && value.schemaVersion !== HIA_CONFIG_SCHEMA_VERSION) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SCHEMA_UNSUPPORTED",
      isSafeConfigDiagnosticIdentifier(value.schemaVersion)
        ? `Unsupported HIA config schemaVersion: ${value.schemaVersion}.`
        : "Unsupported HIA config schemaVersion.",
      "error",
      "schemaVersion"
    ));
  }

  if (value.docs !== undefined) {
    validateDocsConfig(value.docs, diagnostics, "docs");
  }

  return diagnostics;
}

/**
 * @lang zh-CN 纯检查诊断数组是否含error；warning/info不阻断，数组和诊断不改写。
 * @lang en Purely checks for error severity; warning/info do not block and neither the array nor diagnostics are mutated.
 */
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

  if (value.uiLocaleCompleteness !== undefined) {
    validatePortalUiLocaleCompletenessConfig(
      value.uiLocaleCompleteness,
      diagnostics,
      `${targetPath}.uiLocaleCompleteness`
    );
    if (value.informationArchitecture === undefined) {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_UI_LOCALE_COMPLETENESS_IA_REQUIRED",
        "docs.renderer.uiLocaleCompleteness requires explicit informationArchitecture.",
        "error",
        `${targetPath}.uiLocaleCompleteness`
      ));
    }
  }

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
    if (value.uiLocale === undefined) {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_UI_LOCALE_REQUIRED",
        "docs.renderer.uiLocale is required with explicit informationArchitecture.",
        "error",
        `${targetPath}.uiLocale`
      ));
    }
  }

  if (value.sourceCommentProjection !== undefined) {
    validateSourceCommentProjectionConfig(
      value.sourceCommentProjection,
      diagnostics,
      `${targetPath}.sourceCommentProjection`
    );
    if (value.informationArchitecture === undefined) {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_SOURCE_COMMENT_IA_REQUIRED",
        "docs.renderer.sourceCommentProjection requires explicit informationArchitecture.",
        "error",
        `${targetPath}.sourceCommentProjection`
      ));
    }
  }
}

/**
 * @lang zh-CN
 * 校验 owner adoption identity 的 closed-world 结构和 public-safe 稳定 ID，拒绝路径与任意扩展字段。
 *
 * @lang en
 * Validates the closed-world owner-adoption identity and public-safe stable IDs, rejecting paths and arbitrary extension fields.
 */
function validatePortalUiLocaleCompletenessConfig(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_UI_LOCALE_COMPLETENESS_INVALID",
      "uiLocaleCompleteness must be an object.",
      "error",
      targetPath
    ));
    return;
  }
  const allowedFields = new Set(["profileId", "surfaceId"]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      // <lang><zh-CN>普通短键保留精确定位；路径或凭据形态的键只报告安全父级。</zh-CN><en>Keep precise locations for ordinary short keys; path- or credential-shaped keys report only the safe parent.</en></lang>
      const safeField = isSafeConfigDiagnosticIdentifier(field);
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_UI_LOCALE_COMPLETENESS_FIELD_UNSUPPORTED",
        safeField ? `Unsupported uiLocaleCompleteness field: ${field}.` : "Unsupported uiLocaleCompleteness field.",
        "error",
        safeField ? `${targetPath}.${field}` : targetPath
      ));
    }
  }
  for (const field of allowedFields) {
    const identity = value[field];
    if (identity === undefined) continue;
    if (typeof identity !== "string" || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(identity)) {
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_UI_LOCALE_COMPLETENESS_ID_INVALID",
        `uiLocaleCompleteness.${field} must be a public stable identifier.`,
        "error",
        `${targetPath}.${field}`
      ));
    }
  }
}

/**
 * @lang zh-CN
 * 校验 source-comment projection 的 closed-world、精确版本与 canonical BCP 47 locale。
 *
 * @lang en
 * Validates closed-world source-comment projection configuration, exact version, and canonical BCP 47 locale.
 */
function validateSourceCommentProjectionConfig(
  value: unknown,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (!isRecord(value)) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_COMMENT_INVALID", "sourceCommentProjection must be an object.", "error", targetPath));
    return;
  }
  const allowedFields = new Set(["contract", "contractVersion", "locale", "contentPolicy"]);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      // <lang><zh-CN>不可信动态键可能含私有定位或令牌；只回显安全短键。</zh-CN><en>Untrusted dynamic keys may contain private locators or tokens; echo only safe short keys.</en></lang>
      const safeField = isSafeConfigDiagnosticIdentifier(field);
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_SOURCE_COMMENT_FIELD_UNSUPPORTED",
        safeField ? `Unsupported sourceCommentProjection field: ${field}.` : "Unsupported sourceCommentProjection field.",
        "error",
        safeField ? `${targetPath}.${field}` : targetPath
      ));
    }
  }
  validateOptionalString(value, "contract", diagnostics, targetPath);
  validateOptionalString(value, "contractVersion", diagnostics, targetPath);
  validateOptionalString(value, "locale", diagnostics, targetPath);
  validateOptionalEnum(value, "contentPolicy", HIA_CONFIG_SOURCE_COMMENT_CONTENT_POLICIES, diagnostics, targetPath);
  if (typeof value.locale !== "string" || value.locale.length === 0) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_COMMENT_LOCALE_REQUIRED", "sourceCommentProjection.locale is required.", "error", `${targetPath}.locale`));
  } else {
    const canonical = canonicalizeDocumentationLocale(value.locale);
    if (!canonical || canonical.usedLegacyUnderscore || canonical.canonical !== value.locale) {
      diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_COMMENT_LOCALE_INVALID", "sourceCommentProjection.locale must be a canonical BCP 47 tag.", "error", `${targetPath}.locale`));
    }
  }
  if (typeof value.contract === "string" && value.contract !== HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_COMMENT_CONTRACT_UNSUPPORTED", "Unsupported source-comment projection contract.", "error", `${targetPath}.contract`));
  }
  if (typeof value.contractVersion === "string" && value.contractVersion !== HIA_CONFIG_SOURCE_COMMENT_PROJECTION_CONTRACT_VERSION) {
    diagnostics.push(createConfigDiagnostic("HIA_CONFIG_SOURCE_COMMENT_VERSION_UNSUPPORTED", "Unsupported source-comment projection contractVersion.", "error", `${targetPath}.contractVersion`));
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
      // <lang><zh-CN>诊断只在键符合公开短标识条件时包含该键，否则定位 IA 对象。</zh-CN><en>Include a key in diagnostics only when it is a public short identifier; otherwise locate the IA object.</en></lang>
      const safeField = isSafeConfigDiagnosticIdentifier(field);
      diagnostics.push(createConfigDiagnostic(
        "HIA_CONFIG_IA_FIELD_UNSUPPORTED",
        safeField ? `Unsupported Portal IA field: ${field}.` : "Unsupported Portal IA field.",
        "error",
        safeField ? `${targetPath}.${field}` : targetPath
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
      isSafeConfigDiagnosticIdentifier(value.contract)
        ? `Unsupported Portal IA contract: ${value.contract}.`
        : "Unsupported Portal IA contract.",
      "error",
      `${targetPath}.contract`
    ));
  }
  if (typeof value.contractVersion === "string" && value.contractVersion !== HIA_CONFIG_PORTAL_IA_CONTRACT_VERSION) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_IA_VERSION_UNSUPPORTED",
      isSafeConfigDiagnosticIdentifier(value.contractVersion)
        ? `Unsupported Portal IA contractVersion: ${value.contractVersion}.`
        : "Unsupported Portal IA contractVersion.",
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
  validateOptionalEnum(value, "skin", HIA_CONFIG_PORTAL_SKINS, diagnostics, targetPath);
  validateOptionalEnum(value, "scheme", HIA_CONFIG_PORTAL_SCHEMES, diagnostics, targetPath);

  // <lang><zh-CN>新增边界读取自有描述符，不以getter或静默忽略非法颜色/资产选项换绿色。</zh-CN><en>Read own descriptors for new boundaries without getters or silently ignoring invalid color/asset options.</en></lang>
  for (const field of ["colors", "assets"] as const) {
    const property = Object.getOwnPropertyDescriptor(value, field);
    if (!property) continue;
    if (!property.enumerable || !("value" in property) || !(field === "colors" ? isSafeThemeColors(property.value) : isSafeThemeAssets(property.value))) {
      diagnostics.push(createConfigDiagnostic("HIA_CONFIG_THEME_OPTIONS_INVALID", "Theme colors/assets must be ordinary supported data with safe literal values.", "error", `${targetPath}.${field}`));
    }
  }

  if (typeof value.name === "string" && !HIA_CONFIG_THEME_NAMES.includes(value.name as typeof HIA_CONFIG_THEME_NAMES[number])) {
    // <lang><zh-CN>安全短主题名维持旧提示及机器数据；疑似路径或令牌仅保留固定回退主题。</zh-CN><en>Safe short theme names keep legacy text and machine data; suspected paths or tokens retain only the fixed fallback theme.</en></lang>
    const safeRequestedTheme = isSafeConfigDiagnosticIdentifier(value.name);
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_THEME_UNSUPPORTED",
      safeRequestedTheme
        ? `Theme "${value.name}" is not implemented yet; the default theme will be used.`
        : "Theme is not implemented yet; the default theme will be used.",
      "warning",
      `${targetPath}.name`,
      safeRequestedTheme ? { requestedTheme: value.name, fallbackTheme: "default" } : { fallbackTheme: "default" }
    ));
  }
}

/**
 * @lang zh-CN 仅允许诊断回显有限长的普通公开标识；拒绝路径/URL 字符、常见凭据前缀及长无分隔令牌。它是输出最小化规则，不证明任意短字符串无秘密。
 * @lang en Allows diagnostic echoes only for bounded ordinary public identifiers; rejects path/URL characters, common credential prefixes, and long undelimited tokens. This is output minimization, not proof that every short string is non-secret.
 * @param value <lang><zh-CN>未受信任的版本、主题、契约值或动态字段名。</zh-CN><en>Untrusted version, theme, contract value, or dynamic field name.</en></lang>
 * @returns <lang><zh-CN>仅表示可用于最小化诊断的短标识格式。</zh-CN><en>Whether the value has the short-identifier form allowed in minimized diagnostics.</en></lang>
 */
function isSafeConfigDiagnosticIdentifier(value: string): boolean {
  if (value.length === 0 || value.length > 48 || !/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u.test(value)) return false;
  if (/(?:^|[._-])(?:token|secret|password|passwd|credential|authorization|apikey)(?:$|[._-])/iu.test(value)) return false;
  if (/^(?:sk-|gh[pousr]_|github_pat_|glpat-|npm_|xox[baprs]-|AKIA|ASIA|eyJ[A-Za-z0-9_-]{8,}\.)/iu.test(value)) return false;
  return !/^[A-Za-z0-9]{32,}$/u.test(value);
}

/** @lang zh-CN 新主题选项只接受无访问器的普通自有数据；反射异常不回显。 @lang en New theme options accept only ordinary own data without accessors, never echoing reflection errors. */
function themeOptionData(value: unknown): Record<string, unknown> | undefined {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return undefined;
    const result: Record<string, unknown> = Object.create(null);
    for (const name of Reflect.ownKeys(value)) {
      const property = Object.getOwnPropertyDescriptor(value, name);
      if (typeof name !== "string" || !property?.enumerable || !("value" in property)) return undefined;
      result[name] = property.value;
    }
    return result;
  } catch { return undefined; }
}

/** @lang zh-CN 检查封闭semantic颜色名及hex值，不解析CSS表达式。 @lang en Checks closed semantic color names and hex values without parsing CSS expressions. */
function isSafeThemeColors(value: unknown): boolean {
  const colors = themeOptionData(value);
  return Boolean(colors && Object.entries(colors).every(([name, color]) => HIA_CONFIG_THEME_COLOR_NAMES.includes(name as typeof HIA_CONFIG_THEME_COLOR_NAMES[number]) && typeof color === "string" && color.trim() === color && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(color)));
}

/** @lang zh-CN 资源引用必须同站且无query/hash；相对父路径只用于URL，不用于写入。 @lang en Asset references must remain same-site without queries/fragments; parent-relative segments are URLs only, never write paths. */
function isSafeThemeAssets(value: unknown): boolean {
  const assets = themeOptionData(value);
  if (!assets || Object.keys(assets).some((name) => !["mode", "baseUrl"].includes(name))) return false;
  const mode = assets.mode ?? "local";
  if (mode === "local") return assets.baseUrl === undefined;
  if (mode !== "external" || typeof assets.baseUrl !== "string" || !assets.baseUrl || /[\s\\<>"']/u.test(assets.baseUrl) || assets.baseUrl.startsWith("//") || /^[a-z][a-z0-9+.-]*:/iu.test(assets.baseUrl)) return false;
  try {
    const url = new URL(assets.baseUrl, "https://hia.invalid/base/");
    return url.origin === "https://hia.invalid" && !url.search && !url.hash;
  } catch { return false; }
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
  validateOptionalEnum(value, "publicAssetPolicy", HIA_CONFIG_SOURCE_PUBLIC_ASSET_POLICIES, diagnostics, targetPath);
  validateOptionalEnum(value, "mode", HIA_CONFIG_SOURCE_MODES, diagnostics, targetPath);
  validateOptionalEnum(value, "presentation", HIA_CONFIG_SOURCE_PRESENTATIONS, diagnostics, targetPath);
  validateOptionalBoolean(value, "defaultExpanded", diagnostics, targetPath);
  validateOptionalPositiveInteger(value, "maxLines", diagnostics, targetPath);
  validateOptionalEnum(value, "openMode", HIA_CONFIG_SOURCE_OPEN_MODES, diagnostics, targetPath);

  if (value.presentation === "fetch" && typeof value.fetchBaseUrl === "string" && value.fetchBaseUrl.length > 0) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SOURCE_FETCH_BASE_UNSUPPORTED",
      "docs.source.fetchBaseUrl cannot provide fetch bodies; use build-generated same-origin public assets.",
      "error",
      `${targetPath}.fetchBaseUrl`
    ));
  }

  if ((typeof value.linkBaseUrl === "string" && value.linkBaseUrl.length > 0)
    || (typeof value.baseUrl === "string" && value.baseUrl.length > 0)) {
    diagnostics.push(createConfigDiagnostic(
      "HIA_CONFIG_SOURCE_LINK_BASE_UNSUPPORTED",
      "docs.source.linkBaseUrl/baseUrl cannot provide Portal source links; use build-generated same-origin public assets.",
      "error",
      `${targetPath}.${typeof value.linkBaseUrl === "string" && value.linkBaseUrl.length > 0 ? "linkBaseUrl" : "baseUrl"}`
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
