/**
 * @file
 * @lang zh-CN 审阅实际核心文档的description原始语言字段，记录待核项，不生成译文或应用语言回退。
 * @lang en Reviews original description locale fields in actual core documents, recording review items without translation or locale fallback.
 */
import assert from "node:assert/strict";

/**
 * @lang zh-CN 统计已通过核心结构校验的实际文档，区分缺正文、缺语言和相同文本。
 * @lang en Counts an actual core-validated document, distinguishing absent descriptions, missing locales and identical text.
 * @param {object} document <lang><zh-CN>本次生产并通过核心校验的文档；符号与字段顺序保持。</zh-CN><en>A document produced in this run and validated by core, retaining symbol and field order.</en></lang>
 * @returns {object} <lang><zh-CN>仅description维度的原始字段统计与待审阅符号；不同字符串不证明译文质量。</zh-CN><en>Original-field statistics and review symbols for descriptions only; distinct strings do not establish translation quality.</en></lang>
 * @throws {Error} <lang><zh-CN>输入没有已验证的符号数组时拒绝。</zh-CN><en>Rejects inputs lacking a validated symbol array.</en></lang>
 */
export function auditApiDescriptionLocales(document) {
  assert(Array.isArray(document?.symbols), "A validated API document is required.");
  // <lang><zh-CN>报告只保留符号身份和语言缺口，避免复制正文或推测缺失语言。</zh-CN><en>The report retains symbol identities and locale gaps without copying prose or inferring missing languages.</en></lang>
  const review = [];
  for (const symbol of document.symbols) {
    // <lang><zh-CN>直接读取原始description，remarks或defaultText不能代替其显式语言证据。</zh-CN><en>Read the original description directly; remarks and defaultText cannot replace its explicit locale evidence.</en></lang>
    const description = symbol.i18n?.fields?.description;
    const localized = description?.localizedText ?? {};
    const english = typeof localized.en === "string" ? localized.en.trim() : "";
    const chinese = typeof localized["zh-CN"] === "string" ? localized["zh-CN"].trim() : "";
    // <lang><zh-CN>相同文本列为人工审阅项，语言无关术语不被自动断言为错误翻译。</zh-CN><en>Identical text requires human review; language-neutral terms are not automatically judged mistranslated.</en></lang>
    let reason;
    if (!description) reason = "missing-description";
    else if (!english) reason = "missing-en";
    else if (!chinese) reason = "missing-zh-CN";
    else if (english === chinese) reason = "identical-text";
    if (reason) review.push({id:symbol.id, name:symbol.name, kind:symbol.kind, availableLocales:Object.keys(localized), reason});
  }
  return {
    fieldScope: "description",
    symbols: document.symbols.length,
    distinctPairs: document.symbols.length - review.length,
    review,
    translationQualityVerified: false
  };
}
