/**
 * @file
 * @lang zh-CN 独立站点导航草案的纯数据边界。宿主声明品牌、真实版本与部署内路由，不读取文件或扩大源码权限。
 * @lang en Pure-data boundary for the independent site-navigation draft. Hosts declare branding, actual versions, and deployment-local routes without file reads or additional source authority.
 */

/**
 * @lang zh-CN 独立导航契约身份。
 * @lang en Independent navigation contract identity.
 */
export const DOCUMENTATION_SITE_NAVIGATION_CONTRACT = "documentation-site-navigation";
/**
 * @lang zh-CN 首个导航草案，禁止将其它版本隐式重标。
 * @lang en First navigation draft, without implicit relabeling of other versions.
 */
export const DOCUMENTATION_SITE_NAVIGATION_CONTRACT_VERSION = "0.1.0-draft";

/**
 * @lang zh-CN 本草案支持的两种界面语言均须显式给值。
 * @lang en Both UI locales supported by this draft require explicit values.
 */
export type DocumentationSiteNavigationLocalizedText = Record<"zh-CN" | "en", string>;

/**
 * @lang zh-CN 宿主声明的一个纯文本导航项。
 * @lang en One host-declared plain-text navigation item.
 */
export interface DocumentationSiteNavigationLink {
  /**
   * @lang zh-CN 稳定的小写字母数字身份，同组唯一。
   * @lang en Stable lowercase alphanumeric identity, unique within its group.
   */
  id: string;
  /**
   * @lang zh-CN 两语言纯文本标签，不接受HTML。
   * @lang en Plain-text labels in both locales, never interpreted as HTML.
   */
  labelByLocale: DocumentationSiteNavigationLocalizedText;
  /**
   * @lang zh-CN 两语言的部署内站点绝对路径，可含显式锚点。
   * @lang en Site-absolute deployment-local paths in both locales, optionally with explicit anchors.
   */
  hrefByLocale: DocumentationSiteNavigationLocalizedText;
}

/**
 * @lang zh-CN 一个实际文档版本的宿主声明，不由包版本推导。
 * @lang en Host declaration of one actual documentation version, never inferred from package versions.
 */
export interface DocumentationSiteNavigationVersion {
  /**
   * @lang zh-CN 实际文档的完整三段版本号。
   * @lang en Full three-component version of the actual documentation.
   */
  version: string;
  /**
   * @lang zh-CN 由宿主明确区分预览、稳定与历史封版。
   * @lang en Host-explicit preview, stable, or archived status.
   */
  status: "preview" | "stable" | "archive";
  /**
   * @lang zh-CN 该实际版本两语言的真实入口。
   * @lang en Real entry targets for this actual version in both locales.
   */
  hrefByLocale: DocumentationSiteNavigationLocalizedText;
}

/**
 * @lang zh-CN 可选导航输入0.1.0-draft；两种界面语言必需，最多16个主项、16个栏目、64个真实版本。只允许部署内站点路径，不授予文件/网络读取权限。
 * @lang en Optional 0.1.0-draft navigation input requiring both UI locales, at most 16 primary items, 16 tabs, and 64 actual versions. Deployment-local site paths grant no file or network read authority.
 */
export interface DocumentationSiteNavigation {
  /**
   * @lang zh-CN 精确契约身份。
   * @lang en Exact contract identity.
   */
  contract: typeof DOCUMENTATION_SITE_NAVIGATION_CONTRACT;
  /**
   * @lang zh-CN 精确草案版本。
   * @lang en Exact draft version.
   */
  contractVersion: typeof DOCUMENTATION_SITE_NAVIGATION_CONTRACT_VERSION;
  /**
   * @lang zh-CN 站点绝对部署根，必须以斜杠开始及结束。
   * @lang en Site-absolute deployment root, beginning and ending with a slash.
   */
  deploymentBase: string;
  /**
   * @lang zh-CN 宿主公开品牌及两语言首页，不影响项目元数据。
   * @lang en Public host brand and bilingual home targets, independent of project metadata.
   */
  brand: {
    /**
     * @lang zh-CN 公开全称，最多128字符。
     * @lang en Full public name, at most 128 characters.
     */
    title: string;
    /**
     * @lang zh-CN 两语言品牌副标题，最多256字符。
     * @lang en Bilingual brand captions, at most 256 characters.
     */
    captionByLocale: DocumentationSiteNavigationLocalizedText;
    /**
     * @lang zh-CN 两语言真实首页目标。
     * @lang en Actual home targets in both locales.
     */
    homeByLocale: DocumentationSiteNavigationLocalizedText;
  };
  /**
   * @lang zh-CN 有序顶部主导航。
   * @lang en Ordered primary header navigation.
   */
  primaryNavigation: DocumentationSiteNavigationLink[];
  /**
   * @lang zh-CN 有序文档栏目。
   * @lang en Ordered documentation tabs.
   */
  documentationTabs: DocumentationSiteNavigationLink[];
  /**
   * @lang zh-CN 主导航选中身份，必须存在。
   * @lang en Selected primary identity, which must exist.
   */
  activePrimaryId: string;
  /**
   * @lang zh-CN 栏目选中身份，必须存在。
   * @lang en Selected tab identity, which must exist.
   */
  activeTabId: string;
  /**
   * @lang zh-CN 当前文档身份、真实菜单和历史总入口。
   * @lang en Current documentation identity, actual menu, and archive-directory entry.
   */
  documentationVersion: {
    /**
     * @lang zh-CN 当前文档完整三段版本。
     * @lang en Full three-component current documentation version.
     */
    version: string;
    /**
     * @lang zh-CN 当前文档的显式状态。
     * @lang en Explicit current-documentation status.
     */
    status: DocumentationSiteNavigationVersion["status"];
    /**
     * @lang zh-CN 至少含一个当前版本，身份不可重复。
     * @lang en Includes the current version exactly once, with no duplicate versions.
     */
    entries: DocumentationSiteNavigationVersion[];
    /**
     * @lang zh-CN 历史总页的标签和真实目标，不制造不存在的历史版本。
     * @lang en Archive-directory labels and real targets, without fabricating historical versions.
     */
    history: {
      /**
       * @lang zh-CN 两语言纯文本历史入口标签。
       * @lang en Plain-text archive-entry labels in both locales.
       */
      labelByLocale: DocumentationSiteNavigationLocalizedText;
      /**
       * @lang zh-CN 两语言的历史总页。
       * @lang en Archive-directory targets in both locales.
       */
      hrefByLocale: DocumentationSiteNavigationLocalizedText;
    };
  };
  /**
   * @lang zh-CN 宿主显式提供的跨语言对应入口，不根据当前URL猜测。
   * @lang en Explicit host-provided counterpart entry targets, never guessed from the current URL.
   */
  localeTargets: DocumentationSiteNavigationLocalizedText;
}

/**
 * @lang zh-CN 在输出前严格校验版本、闭集字段、资源上限、两语言与部署内路径；不读文件，不检查目标是否已部署。
 * @lang en Strictly validates version, closed fields, resource bounds, both locales, and deployment-local paths before output, without file reads or checking deployment existence.
 * @param value <lang><zh-CN>不受信任的JSON形状导航输入。</zh-CN><en>Untrusted JSON-shaped navigation input.</en></lang>
 * @returns <lang><zh-CN>成功时无返回并收窄类型，不修改输入。</zh-CN><en>Returns nothing on success and narrows the type without modifying input.</en></lang>
 * @throws {TypeError} <lang><zh-CN>含稳定HIA_SITE_NAVIGATION_INVALID码及字段位置，不回显私有值。</zh-CN><en>Uses the stable HIA_SITE_NAVIGATION_INVALID code and field location, without echoing private values.</en></lang>
 */
export function assertDocumentationSiteNavigation(value: unknown): asserts value is DocumentationSiteNavigation {
  // <lang><zh-CN>字段采用闭集，避免把源码授权或其它版本选项悄悄当作有效输入。</zh-CN><en>Closed fields prevent silently accepting source authority or options from another version.</en></lang>
  const root = object(value, ["contract", "contractVersion", "deploymentBase", "brand", "primaryNavigation", "documentationTabs", "activePrimaryId", "activeTabId", "documentationVersion", "localeTargets"], "navigation");
  if (root.contract !== DOCUMENTATION_SITE_NAVIGATION_CONTRACT || root.contractVersion !== DOCUMENTATION_SITE_NAVIGATION_CONTRACT_VERSION) invalid("contract");
  // <lang><zh-CN>根目录与目标使用同一URL语法，边界斜杠防止product-other前缀混淆。</zh-CN><en>Root and targets share URL syntax, with boundary slashes preventing product-other prefix confusion.</en></lang>
  const base = target(root.deploymentBase, "/", "deploymentBase");
  if (!base.endsWith("/") || base.includes("#")) invalid("deploymentBase");
  const brand = object(root.brand, ["title", "captionByLocale", "homeByLocale"], "brand");
  label(brand.title, 128, "brand.title");
  localized(brand.captionByLocale, "brand.captionByLocale");
  localized(brand.homeByLocale, "brand.homeByLocale", base);
  // <lang><zh-CN>两个导航组独立约束有序身份和选中项，不从URL或文案猜测选中态。</zh-CN><en>Both ordered groups constrain identities and selected entries independently, without inferring selection from URLs or labels.</en></lang>
  links(root.primaryNavigation, root.activePrimaryId, base, "primaryNavigation");
  links(root.documentationTabs, root.activeTabId, base, "documentationTabs");
  localized(root.localeTargets, "localeTargets", base);
  const versions = object(root.documentationVersion, ["version", "status", "entries", "history"], "documentationVersion");
  version(versions, "documentationVersion");
  const entries = array(versions.entries, 64, "documentationVersion.entries");
  const identities = new Set<string>();
  let currentCount = 0;
  for (const entry of entries) {
    const record = object(entry, ["version", "status", "hrefByLocale"], "documentationVersion.entries");
    version(record, "documentationVersion.entries");
    localized(record.hrefByLocale, "documentationVersion.entries.hrefByLocale", base);
    if (identities.has(record.version as string)) invalid("documentationVersion.entries.version");
    identities.add(record.version as string);
    if (record.version === versions.version && record.status === versions.status) currentCount += 1;
  }
  if (currentCount !== 1) invalid("documentationVersion.entries.current");
  const history = object(versions.history, ["labelByLocale", "hrefByLocale"], "documentationVersion.history");
  localized(history.labelByLocale, "documentationVersion.history.labelByLocale");
  localized(history.hrefByLocale, "documentationVersion.history.hrefByLocale", base);
}

/**
 * @lang zh-CN 拒绝额外/缺失字段及非JSON记录，不输出输入内容。
 * @lang en Rejects additional/missing fields and non-JSON records without printing input content.
 */
function object(value: unknown, keys: string[], location: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(location);
  const record = value as Record<string, unknown>;
  // <lang><zh-CN>只接受可枚举数据属性，读取前拒绝getter、隐藏字段和symbol，避免验证/快照之间执行或丢失字段。</zh-CN><en>Accept enumerable data properties only, refusing getters, hidden fields, and symbols before reading to prevent execution or field loss between validation and snapshotting.</en></lang>
  const descriptors = Object.getOwnPropertyDescriptors(record);
  if (Reflect.ownKeys(record).length !== keys.length || keys.some(key => !descriptors[key]?.enumerable || !Object.hasOwn(descriptors[key]!, "value"))) invalid(location);
  return record;
}

/**
 * @lang zh-CN 纯文本必须非空有界且不含控制符；HTML由呈现层转义。
 * @lang en Plain text must be bounded, nonblank, and control-free; presentation escapes HTML.
 */
function text(value: unknown, limit: number, location: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/u.test(value)) invalid(location);
}

/**
 * @lang zh-CN 限定两语言，路径值额外核部署根。
 * @lang en Restricts values to both locales and additionally checks deployment boundaries for paths.
 */
function localized(value: unknown, location: string, base?: string): void {
  const record = object(value, ["zh-CN", "en"], location);
  for (const locale of ["zh-CN", "en"]) {
    if (base === undefined) label(record[locale], 256, `${location}.${locale}`);
    else target(record[locale], base, `${location}.${locale}`);
  }
}

/**
 * @lang zh-CN 复用UI词条的纯文本与无占位符边界，拒绝尖括号及模板花括号。
 * @lang en Matches the UI catalog's plain-text and placeholder-free boundary, rejecting angle brackets and template braces.
 */
function label(value: unknown, limit: number, location: string): void {
  text(value, limit, location);
  if (/[<>{}]/u.test(value)) invalid(location);
}

/**
 * @lang zh-CN 接受无编码路径和显式锚点，拒绝归一化绕根、代码协议及本机地址；百分号只允许锚点中的有效编码。
 * @lang en Accepts unencoded paths and explicit anchors, rejecting normalized root escapes, code schemes, and local addresses; percent encoding is allowed only in valid anchors.
 */
function target(value: unknown, base: string, location: string): string {
  text(value, 2048, location);
  // <lang><zh-CN>保守草案路径语法让浏览器和部署服务器不需要多层解码，锚点仍可表示本地化标题。</zh-CN><en>The conservative draft path grammar avoids layered browser/server decoding while anchors can still represent localized headings.</en></lang>
  const pathname = value.split("#")[0]!;
  if (!value.startsWith(base) || value.startsWith("//") || /[\s\\<>"'`?]/u.test(value) || /[%:&]/u.test(pathname) || pathname.includes("//") || pathname.split("/").some(part => part === "." || part === "..")) invalid(location);
  try {
    const parsed = new URL(value, "https://hia.invalid");
    if (parsed.origin !== "https://hia.invalid" || parsed.pathname !== pathname || parsed.search) invalid(location);
    decodeURIComponent(parsed.hash);
  } catch { invalid(location); }
  return value;
}

/**
 * @lang zh-CN 以有限非空数组约束导航与版本资源量。
 * @lang en Bounds navigation and version resources with finite nonempty arrays.
 */
function array(value: unknown, limit: number, location: string): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > limit) invalid(location);
  // <lang><zh-CN>数组同样必须是稠密JSON数据，拒绝索引getter和自定义迭代器，循环不触发调用方代码。</zh-CN><en>Arrays must likewise be dense JSON data, refusing indexed getters and custom iterators so loops do not invoke caller code.</en></lang>
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) invalid(location);
  for (let index = 0; index < value.length; index += 1) {
    if (!descriptors[index]?.enumerable || !Object.hasOwn(descriptors[index]!, "value")) invalid(location);
  }
  return value;
}

/**
 * @lang zh-CN 组内身份唯一且选中身份真实存在。
 * @lang en Group identities are unique and the selected identity must exist.
 */
function links(value: unknown, selected: unknown, base: string, location: string): void {
  const records = array(value, 16, location);
  const identities = new Set<string>();
  for (const item of records) {
    const record = object(item, ["id", "labelByLocale", "hrefByLocale"], location);
    if (typeof record.id !== "string" || !/^[a-z][a-z0-9]{0,31}$/u.test(record.id) || identities.has(record.id)) invalid(`${location}.id`);
    identities.add(record.id);
    localized(record.labelByLocale, `${location}.labelByLocale`);
    localized(record.hrefByLocale, `${location}.hrefByLocale`, base);
  }
  if (typeof selected !== "string" || !identities.has(selected)) invalid(`${location}.selected`);
}

/**
 * @lang zh-CN 版本完整且状态显式，禁止使用浮动别名或包版本推断。
 * @lang en Versions are complete and statuses explicit, without floating aliases or package-version inference.
 */
function version(record: Record<string, unknown>, location: string): void {
  if (typeof record.version !== "string" || record.version.length > 64 || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(record.version) || !["preview", "stable", "archive"].includes(record.status as string)) invalid(location);
}

/**
 * @lang zh-CN 所有输入拒绝共享公开错误码，字段位置由实现固定。
 * @lang en All input refusals share a public error code with implementation-fixed field locations.
 */
function invalid(location: string): never {
  throw new TypeError(`HIA_SITE_NAVIGATION_INVALID: Invalid navigation field ${location}.`);
}
