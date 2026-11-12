/**
 * @file
 * @lang zh-CN 离线构建与匿名线上复核共用的纯文本UI判据，不依赖安装或已编译包。
 * @lang en Pure text UI criteria shared by offline builds and anonymous online verification, independent of package installation or compilation.
 */
import assert from 'node:assert/strict';

/**
 * @lang zh-CN 按实际页面框架核对.NET主题字段标题与程序集元数据，支持原生及共享阅读布局。
 * @lang en Checks .NET topic field headings and assembly metadata against the actual shell, supporting native and shared reading layouts.
 * @param {string} shell <lang><zh-CN>同语言实际索引HTML。</zh-CN><en>Actual index HTML for this locale.</en></lang>
 * @param {string} topic <lang><zh-CN>实际生成的条目HTML。</zh-CN><en>Actual generated entry HTML.</en></lang>
 * @param {string} locale <lang><zh-CN>当前公开语言标识。</zh-CN><en>Current public locale identifier.</en></lang>
 * @returns {void} <lang><zh-CN>两项满足时返回。</zh-CN><en>Returns when both criteria hold.</en></lang>
 * @throws {Error} <lang><zh-CN>字段小节或程序集元数据缺失。</zh-CN><en>Field sections or assembly metadata are missing.</en></lang>
 */
export function assertPublicReferenceTopicUi(shell, topic, locale) {
  // <lang><zh-CN>共享框架用真实小节增强标记，原生框架仍使用既有本地化标题标记。</zh-CN><en>Shared chrome uses actual reading-section markers, while native chrome retains its existing localized-heading marker.</en></lang>
  const shared = shell.includes('data-hia-site-navigation');
  const heading = shared ? 'data-hia-reading-section=' : 'data-hia-ui-message="portal.section.localizedfields"';
  // <lang><zh-CN>静态页已物化翻译，其元数据行没有运行时消息标记，仍须具有正确语言的字段名与非空值。</zh-CN><en>Static pages materialize translations without runtime message markers, retaining a correctly localized metadata name and nonempty value.</en></lang>
  const assemblyLabel = locale === 'zh-CN' ? '程序集' : 'Assembly';
  const assemblyRow = new RegExp(`<dt><span>${assemblyLabel}</span></dt><dd>[^<\\s][^<]*</dd>`, 'u');
  const assembly = topic.includes('data-hia-ui-message="portal.metadata.assembly"') || (shared && assemblyRow.test(topic));
  assert(topic.includes(heading) && assembly, `${locale}: reference topic UI messages are missing.`);
}
