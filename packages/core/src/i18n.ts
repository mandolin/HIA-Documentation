import type { HiaFallbackLocale, HiaI18nField, HiaI18nModel, HiaResolvedText } from "./model.js";

export const HIA_I18N_TEXT_SOURCE_PRIORITY = [
  "inline-segment",
  "lang-block",
  "external-resource",
  "localized-text",
  "default-text"
] as const;

export interface ResolveI18nTextOptions {
  defaultLocale?: string;
  fallbackLocale?: HiaFallbackLocale;
}

export function normalizeFallbackLocale(fallbackLocale: HiaFallbackLocale | undefined): string[] {
  if (Array.isArray(fallbackLocale)) {
    return fallbackLocale.filter(Boolean);
  }

  return fallbackLocale ? [fallbackLocale] : [];
}

export function buildLocaleFallbackChain(
  requestedLocale: string,
  defaultLocale: string,
  fallbackLocale?: HiaFallbackLocale
): string[] {
  const chain: string[] = [];
  pushUnique(chain, requestedLocale);

  const parentLocale = requestedLocale.includes("-") ? requestedLocale.split("-")[0] : "";
  pushUnique(chain, parentLocale);

  for (const locale of normalizeFallbackLocale(fallbackLocale)) {
    pushUnique(chain, locale);
  }

  pushUnique(chain, defaultLocale);
  return chain;
}

export function resolveI18nFieldText(
  field: HiaI18nField | undefined,
  requestedLocale: string,
  options: ResolveI18nTextOptions = {}
): HiaResolvedText {
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
    const text = field.localizedText[locale];

    if (typeof text === "string" && text.length > 0) {
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

export function getI18nField(model: HiaI18nModel | undefined, fieldPath: string): HiaI18nField | undefined {
  return model?.fields[fieldPath];
}

function pushUnique(values: string[], value: string | undefined): void {
  if (value && !values.includes(value)) {
    values.push(value);
  }
}
