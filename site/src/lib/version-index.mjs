/**
 * @lang zh-CN 构造并精确读取两版站点索引，按各自身份确定旧索引地址和文档语言。
 * @lang en Construct and read both site index versions with their exact legacy locations and documentation locales.
 */
import { isDeepStrictEqual } from "node:util";

/**
 * @lang zh-CN 仅抛出固定公开说明，不把失败输入挂到断言错误的actual字段。
 * @lang en Throw only fixed public messages, never attaching rejected input through assertion actual fields.
 * @param {unknown} condition - 不变量结果。 Invariant result.
 * @param {string} [message] - 固定错误说明。 Fixed error message.
 * @returns {void} 条件不成立时抛出。 Throws when the invariant fails.
 */
function assert(condition, message = "Invalid site version index.") { if (!condition) throw new Error(message); }
assert.equal = (actual, expected, message) => assert(Object.is(actual, expected), message);
assert.deepEqual = (actual, expected, message) => assert(isDeepStrictEqual(actual, expected), message);

/** @lang zh-CN 显式系统预览配置；包版本与旧参考技术快照不决定此值。 @lang en Explicit system-preview configuration, independent of package versions and technical snapshots. */
export const currentDocumentation = Object.freeze({ version: "1.0.0", status: "preview" });
/** @lang zh-CN 站点索引的公开schema身份，不重用旧参考schema。 @lang en Public schema identity for the site index, separate from legacy reference schemas. */
export const siteIndexSchema = "https://mandolin.github.io/HIA-Documentation/site/contracts/site-version-index-1.0.0.schema.json";
const supportedLocales = ["zh-CN", "en"];
// <lang lang="zh-CN">每版只接受对应部署目录。2.0.0 的绝对路径固定在同一主机。</lang><lang lang="en">Each version accepts its own deployment directory. The 2.0.0 absolute path stays on the same host.</lang>
const siteIndexLocations = {
  "1.0.0": { schema: siteIndexSchema, root: "legacy-reference/" },
  "2.0.0": { schema: "https://mandolin.github.io/HIA-Documentation/site/contracts/site-version-index-2.0.0.schema.json", root: "/HIA-Documentation-Legacy/" }
};

/**
 * @lang zh-CN 为已支持索引版本返回固定的旧索引定位字段。
 * @lang en Return the fixed legacy index locator for a supported site index version.
 * @param {string} root - 已确认部署目录。 Approved deployment directory.
 * @returns {object} 独立定位对象。 Independent locator object.
 */
function legacyLocator(root) {
  return { root, index: root + "versions.json", contract: "hia-reference-version-index", contractVersion: "0.1.0-draft" };
}

/**
 * @lang zh-CN 校验封闭对象字段；缺少字段和额外字段均失败。
 * @lang en Validate a closed object shape, rejecting missing and extra fields.
 * @param {unknown} value - 已解析JSON值。 Parsed JSON value.
 * @param {string[]} names - 唯一允许字段。 Required field names.
 * @returns {void} 不修改输入。 Does not mutate the input.
 */
function shape(value, names) {
  assert(value && typeof value === "object" && !Array.isArray(value), "Invalid site index object.");
  assert([Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor => !("get" in descriptor) && !("set" in descriptor)), "Site index must contain JSON data properties only.");
  assert.deepEqual(Object.keys(value).sort(), [...names].sort(), "Invalid site index fields.");
}

/**
 * @lang zh-CN 拒绝URI编码、绝对地址和点段，仅接受可复核的相对目录或文件路径。
 * @lang en Accept inspectable relative paths only, rejecting encoded URIs, absolute addresses, and dot segments.
 * @param {unknown} value - 索引路径。 Index path.
 * @param {boolean} [root=false] - 是否允许根空串。 Whether the empty root is allowed.
 * @returns {void} 成功无返回。 No return on success.
 */
function relativePath(value, root = false) {
  if (root && value === "") return;
  assert(typeof value === "string" && /^(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\/?$/.test(value), "Invalid relative site path.");
}

/**
 * @lang zh-CN 校验实际语言目录，不自动补缺译。
 * @lang en Validate actual locale directories without filling missing translations.
 * @param {object} locales - 语言到目录的映射。 Locale-directory map.
 * @param {string} prefix - 允许的目录前缀。 Required directory prefix.
 * @param {boolean} complete - 是否必须同时有中英。 Whether both locales are required.
 * @returns {void} 成功无返回。 No return on success.
 */
function localePaths(locales, prefix, complete) {
  assert(locales && typeof locales === "object" && !Array.isArray(locales), "Invalid locale paths.");
  shape(locales, Object.keys(locales));
  // <lang lang="zh-CN">封版可缺译，但至少有一份真实正文语言；当前文档必须中英齐备。</lang><lang lang="en">Archives may lack a translation but require at least one real locale; current docs require both.</lang>
  const names = Object.keys(locales);
  assert(names.length > 0 && names.every(locale => supportedLocales.includes(locale)), "Unsupported index locale.");
  if (complete) assert.deepEqual([...names].sort(), [...supportedLocales].sort(), "Current locale inventory is incomplete.");
  for (const locale of names) {
    relativePath(locales[locale]);
    assert.equal(locales[locale], prefix + locale + "/", "Locale route disagrees with its version.");
  }
}

/**
 * @lang zh-CN 校验站点新身份、固定路由与旧大版本唯一封版；不检查磁盘存在性。
 * @lang en Validate new identity, fixed routes, and one final archive per older major; does not inspect filesystem existence.
 * @param {object} value - 已解析JSON对象。 Parsed JSON object.
 * @returns {void} 不修改对象；不符合时抛出。 Does not mutate; throws on invalid input.
 * @throws {Error} 字段、版本、路径或封版规则无效；不回显输入。 Invalid fields, versions, paths, or archive rules, without echoing input.
 */
export function assertSiteVersionIndex(value) {
  shape(value, ["$schema", "contract", "contractVersion", "basePath", "defaultLocale", "website", "documentation", "legacyReference"]);
  assert.equal(value.contract, "hia-site-version-index", "Unknown site index contract.");
  assert(typeof value.contractVersion === "string" && Object.hasOwn(siteIndexLocations, value.contractVersion), "Unsupported site index version.");
  const location = siteIndexLocations[value.contractVersion];
  assert.equal(value.$schema, location.schema, "Unknown site index schema.");
  assert.equal(value.basePath, "/HIA-Documentation/", "Unsupported deployment base.");
  assert.equal(value.defaultLocale, "zh-CN", "Unsupported default locale.");
  shape(value.website, ["root", "locales"]);
  assert.equal(value.website.root, "");
  shape(value.website.locales, supportedLocales);
  assert.equal(value.website.locales["zh-CN"], "");
  assert.equal(value.website.locales.en, "site/en/");
  shape(value.documentation, ["strategy", "current", "archives"]);
  assert.equal(value.documentation.strategy, "latest-and-final-per-major");
  shape(value.documentation.current, ["version", "status", "locales"]);
  assert(typeof value.documentation.current.version === "string" && value.documentation.current.version.length <= 64 && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.documentation.current.version), "Invalid system documentation version.");
  assert(["preview", "stable"].includes(value.documentation.current.status), "Invalid current publication state.");
  localePaths(value.documentation.current.locales, "docs/", true);
  assert(Array.isArray(value.documentation.archives), "Invalid archive inventory.");
  // <lang lang="zh-CN">以大版本键去重，不把技术releases目录视为系统历史。</lang><lang lang="en">Deduplicate major versions instead of treating technical release directories as system history.</lang>
  const currentMajor = BigInt(value.documentation.current.version.split(".")[0]);
  const archivedMajors = new Set();
  for (const archive of value.documentation.archives) {
    shape(archive, ["version", "status", "locales"]);
    assert(typeof archive.version === "string" && archive.version.length <= 64 && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(archive.version), "Invalid archive version.");
    const major = archive.version.split(".")[0];
    assert(BigInt(major) < currentMajor && !archivedMajors.has(major), "Archive major must be older and unique.");
    archivedMajors.add(major);
    assert.equal(archive.status, "archived", "Invalid archive maintenance state.");
    localePaths(archive.locales, "docs/archive/v" + major + "/", false);
  }
  shape(value.legacyReference, ["root", "index", "contract", "contractVersion"]);
  assert.deepEqual(value.legacyReference, legacyLocator(location.root), "Invalid legacy namespace.");
}

/**
 * @lang zh-CN 创建当前真实预览索引；空历史是显式事实，不从目录自动枚举。
 * @lang en Create the actual preview index with explicit empty history instead of directory inference.
 * @param {string} [version="1.0.0"] - 装配采用的索引版本。 Site index version used by the composition.
 * @returns {object} 独立可序列化对象。 Independent serializable object.
 * @throws {Error} 维护者配置与当前索引规则冲突。 Maintainer configuration conflicts with index rules.
 */
export function createSiteVersionIndex(version = "1.0.0") {
  assert(typeof version === "string" && Object.hasOwn(siteIndexLocations, version), "Unsupported site index version.");
  const location = siteIndexLocations[version];
  // <lang lang="zh-CN">新对象避免调用方修改公共配置；状态由维护者管理。</lang><lang lang="en">A new object prevents caller mutation of shared configuration; publication state is maintainer-controlled.</lang>
  const value = {
    $schema: location.schema, contract: "hia-site-version-index", contractVersion: version,
    basePath: "/HIA-Documentation/", defaultLocale: "zh-CN",
    website: { root: "", locales: { "zh-CN": "", en: "site/en/" } },
    documentation: { strategy: "latest-and-final-per-major", current: { ...currentDocumentation, locales: { "zh-CN": "docs/zh-CN/", en: "docs/en/" } }, archives: [] },
    legacyReference: legacyLocator(location.root),
  };
  assertSiteVersionIndex(value);
  return value;
}

/**
 * @lang zh-CN 精确读取新索引JSON，不用结构猜测或升级旧索引。
 * @lang en Read the exact new JSON identity without structural guessing or upgrading legacy indexes.
 * @param {string} text - 索引JSON。 Index JSON text.
 * @returns {object} 已校验的独立对象。 Validated independent object.
 * @throws {Error} 非JSON文本或不支持的身份/语义。 Invalid JSON text or unsupported identity/semantics.
 */
export function readSiteVersionIndex(text) {
  assert.equal(typeof text, "string", "Index input must be JSON text.");
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error("Invalid site index JSON."); }
  assertSiteVersionIndex(value);
  return value;
}

/**
 * @lang zh-CN 精确读取旧参考索引，保留所有原始JSON字段；根别名不能被改写成官网。
 * @lang en Read the legacy reference index and retain all JSON fields; its root alias cannot be rewritten as the website.
 * @param {string} text - 原旧索引JSON。 Original legacy JSON.
 * @returns {object} 原语义解析对象，不修改输入文本。 Parsed original semantics without modifying the input.
 * @throws {Error} 非法JSON或旧身份/别名不匹配。 Invalid JSON or mismatching legacy identity/aliases.
 */
export function readLegacyReferenceIndex(text) {
  assert.equal(typeof text, "string");
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error("Invalid legacy reference index JSON."); }
  assert.equal(value?.contract, "hia-reference-version-index", "Unknown reference index contract.");
  assert.equal(value.contractVersion, "0.1.0-draft", "Unsupported reference index version.");
  assert.equal(value.versioning?.strategy, "current-and-releases");
  assert.equal(value.versioning?.current?.id, "current");
  assert.equal(value.versioning?.current?.path, "current/");
  assert.deepEqual(value.versioning?.compatibilityAliases, { root: "current", en: "current/en", zhCN: "current/zh-CN", sourceLinkage: "current/source-linkage" });
  assert(Array.isArray(value.versioning.releases) && Array.isArray(value.versioning.searchPartitions));
  return value;
}

/**
 * @lang zh-CN 按指定版本和语言解析目录，缺失明确返回，不静默回退最新。
 * @lang en Resolve a requested version and locale explicitly, never silently falling back to latest.
 * @param {object} index - 新索引对象。 New index object.
 * @param {string} version - current或精确系统版本。 current or exact system version.
 * @param {string} locale - 明确语言。 Explicit locale.
 * @returns {object} ready路径、missing-version或missing-locale结果。 Ready path or explicit missing-version/missing-locale result.
 * @throws {Error} 索引非法或语言未声明；缺版本/缺译用返回状态表达。 Invalid index or undeclared locale; missing versions/translations use return statuses.
 */
export function resolveDocumentationVersion(index, version, locale) {
  assertSiteVersionIndex(index);
  assert(supportedLocales.includes(locale), "Unsupported documentation locale.");
  const entry = version === "current" || version === index.documentation.current.version ? index.documentation.current : index.documentation.archives.find(candidate => candidate.version === version);
  if (!entry) return { status: "missing-version" };
  if (!entry.locales[locale]) return { status: "missing-locale", availableLocales: Object.keys(entry.locales) };
  return { status: "ready", version: entry.version, publicationStatus: entry.status, path: entry.locales[locale] };
}
