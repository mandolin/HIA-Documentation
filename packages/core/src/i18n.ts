/**
 * @file
 * @lang zh-CN 纯内存字段语言选择；消费上游已解析的字段，不读取资源文件或解析语言标记。
 * @lang en Pure in-memory field-language selection; consumes upstream-resolved fields without loading resources or parsing language markers.
 */
import type { HiaFallbackLocale, HiaI18nField, HiaI18nModel, HiaResolvedText } from "./model.js";

/** @lang zh-CN 上游生成localizedText时使用的来源优先级；本模块不再次合并原始标记。
 * @lang en Source priority for upstream localizedText construction; this module does not remerge raw markers.
 */
export const HIA_I18N_TEXT_SOURCE_PRIORITY = [
  "inline-segment",
  "lang-block",
  "external-resource",
  "localized-text",
  "default-text"
] as const;

/** @lang zh-CN 字段缺省语言与显式回退选项，默认空；不执行BCP47规范化。
 * @lang en Default-language and explicit-fallback options, empty by default; performs no BCP47 normalization.
 */
export interface ResolveI18nTextOptions {
  defaultLocale?: string;
  fallbackLocale?: HiaFallbackLocale;
}

/**
 * @lang zh-CN 将可选回退语言变成新数组，过滤空值但保留原顺序与重复项。
 * @lang en Converts optional fallback locales to a new array, filtering empty values while preserving order and duplicates.
 * @param fallbackLocale <lang><zh-CN>单个语言、数组或undefined；调用者提供有效字符串类型。</zh-CN><en>A locale, array or undefined; the caller supplies valid string types.</en></lang>
 * @returns <lang><zh-CN>新数组，无输入修改、语言规范化或I/O。</zh-CN><en>New array, without mutation, locale canonicalization or I/O.</en></lang>
 */
export function normalizeFallbackLocale(fallbackLocale: HiaFallbackLocale | undefined): string[] {
  if (Array.isArray(fallbackLocale)) {
    return fallbackLocale.filter(Boolean);
  }

  return fallbackLocale ? [fallbackLocale] : [];
}

/**
 * @lang zh-CN 按请求语言、首段主语言、显式回退、默认语言建立去重链。
 * @lang en Builds a deduplicated chain of requested locale, first primary-language segment, explicit fallbacks and default locale.
 * @param requestedLocale <lang><zh-CN>原请求字符串，不做大小写或BCP47规范化。</zh-CN><en>Original request string, without case or BCP47 canonicalization.</en></lang>
 * @param defaultLocale <lang><zh-CN>链末默认语言，重复值只保留首次位置。</zh-CN><en>Final default locale; duplicates retain their first position.</en></lang>
 * @param fallbackLocale <lang><zh-CN>可选显式回退，默认无。</zh-CN><en>Optional explicit fallbacks, absent by default.</en></lang>
 * @returns <lang><zh-CN>新数组；不是完整RFC4647逐子标签截断算法。</zh-CN><en>New array; not the full RFC4647 progressive-subtag truncation algorithm.</en></lang>
 */
export function buildLocaleFallbackChain(
  requestedLocale: string,
  defaultLocale: string,
  fallbackLocale?: HiaFallbackLocale
): string[] {
  // <lang><zh-CN>独立结果数组保持调用者输入不变，顺序即实际选择优先级。</zh-CN><en>An independent result array preserves caller input; its order is the actual selection priority.</en></lang>
  const chain: string[] = [];
  pushUnique(chain, requestedLocale);

  // <lang><zh-CN>沿用已有主语言回退语义，未在稳定迁移中扩展多级子标签规则。</zh-CN><en>Retain existing primary-language fallback semantics without extending multilevel subtag rules during stabilization.</en></lang>
  const parentLocale = requestedLocale.includes("-") ? requestedLocale.split("-")[0] : "";
  pushUnique(chain, parentLocale);

  for (const locale of normalizeFallbackLocale(fallbackLocale)) {
    pushUnique(chain, locale);
  }

  pushUnique(chain, defaultLocale);
  return chain;
}

/**
 * @lang zh-CN 按回退链选择首个非空自有localizedText，否则使用defaultText；不解释块、片段或外部资源。
 * @lang en Selects the first nonempty own localizedText in fallback order, otherwise defaultText; does not interpret blocks, segments or external resources.
 * @param field <lang><zh-CN>可选已验证字段；undefined产生missing结果。</zh-CN><en>Optional validated field; undefined produces a missing result.</en></lang>
 * @param requestedLocale <lang><zh-CN>所需语言字符串。</zh-CN><en>Requested locale string.</en></lang>
 * @param options <lang><zh-CN>默认空；字段defaultLocale优先于选项和请求语言。</zh-CN><en>Empty by default; field defaultLocale precedes the option and requested locale.</en></lang>
 * @returns <lang><zh-CN>新解析结果；缺失时text/resolvedLocale为空，不修改字段，无I/O。</zh-CN><en>New resolution; missing text/resolvedLocale are empty, without field mutation or I/O.</en></lang>
 */
export function resolveI18nFieldText(
  field: HiaI18nField | undefined,
  requestedLocale: string,
  options: ResolveI18nTextOptions = {}
): HiaResolvedText {
  // <lang><zh-CN>默认语言与实际回退链是本次调用的派生值，不写回字段。</zh-CN><en>The default locale and fallback chain are invocation-derived values, never written back to the field.</en></lang>
  const defaultLocale = field?.defaultLocale || options.defaultLocale || requestedLocale;
  const fallbackChain = buildLocaleFallbackChain(requestedLocale, defaultLocale, options.fallbackLocale);

  if (!field) {
    return {
      requestedLocale,
      resolvedLocale: "",
      fallbackChain,
      usedFallback: false,
      missing: true,
      sourceKind: "default-text",
      text: ""
    };
  }

  for (const locale of fallbackChain) {
    // <lang><zh-CN>继承值不属于用户的序列化字段，不能因原型污染被选为公开文本。</zh-CN><en>Inherited values are not the user's serialized fields and cannot become public text through prototype pollution.</en></lang>
    const text = Object.hasOwn(field.localizedText, locale) ? field.localizedText[locale] : undefined;

    if (typeof text === "string" && text.length > 0) {
      // <lang><zh-CN>独立结果标明命中的语言和回退事实，字符串来源保持不变。</zh-CN><en>The independent result records the matched locale and fallback facts while preserving source strings.</en></lang>
      const resolved: HiaResolvedText = {
        requestedLocale,
        resolvedLocale: locale,
        fallbackChain,
        usedFallback: locale !== requestedLocale,
        missing: false,
        sourceKind: "localized-text",
        sourceLocale: locale,
        text
      };

      if (field.source) {
        resolved.source = field.source;
      }

      return resolved;
    }
  }

  // <lang><zh-CN>最后的默认正文允许空串；它不触发额外语言资源读取。</zh-CN><en>The final default text may be empty and does not trigger additional resource loading.</en></lang>
  const defaultText = field.defaultText || "";
  const resolved: HiaResolvedText = {
    requestedLocale,
    resolvedLocale: defaultText ? defaultLocale : "",
    fallbackChain,
    usedFallback: Boolean(defaultText && requestedLocale !== defaultLocale),
    missing: !defaultText,
    sourceKind: "default-text",
    sourceLocale: defaultText ? defaultLocale : "",
    text: defaultText
  };

  if (field.source) {
    resolved.source = field.source;
  }

  return resolved;
}

/**
 * @lang zh-CN 精确返回自有字段引用，继承的constructor/__proto__等不是文档字段。
 * @lang en Returns an exact own-field reference; inherited constructor/__proto__ entries are not documentation fields.
 * @param model <lang><zh-CN>可选已验证模型；undefined返回undefined。</zh-CN><en>Optional validated model; undefined returns undefined.</en></lang>
 * @param fieldPath <lang><zh-CN>精确字段键，不做大小写或路径转换。</zh-CN><en>Exact field key, without case or path conversion.</en></lang>
 * @returns <lang><zh-CN>原字段引用或undefined；无克隆、修改和I/O。</zh-CN><en>Original field reference or undefined, without cloning, mutation or I/O.</en></lang>
 */
export function getI18nField(model: HiaI18nModel | undefined, fieldPath: string): HiaI18nField | undefined {
  return model && Object.hasOwn(model.fields, fieldPath) ? model.fields[fieldPath] : undefined;
}

/** @lang zh-CN 在本地派生链末尾追加非空且尚未出现的语言。
 * @lang en Appends a nonempty, unseen locale to the locally derived chain.
 */
function pushUnique(values: string[], value: string | undefined): void {
  if (value && !values.includes(value)) {
    values.push(value);
  }
}
