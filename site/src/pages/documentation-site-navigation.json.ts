/**
 * @file
 * @lang zh-CN 官网构建直接输出HIA导航输入，复用官网路由与实际文档版本事实。
 * @lang en Website builds directly emit HIA navigation input from shared routes and actual documentation-version facts.
 */
import { createGeneratedSiteNavigation } from "../lib/generated-navigation.mjs";
import { apiReferenceBase } from "../lib/routes.mjs";

/**
 * @lang zh-CN 生成独立纯数据导航工件，供正常CLI的--site-navigation读取；不读取源码、账户或工作区。
 * @lang en Produces the independent navigation-data artifact for normal CLI --site-navigation consumption, without reading source, accounts, or workspaces.
 * @returns <lang><zh-CN>UTF-8 JSON响应，随官网静态构建输出。</zh-CN><en>UTF-8 JSON response emitted by the static website build.</en></lang>
 */
export function GET(): Response {
  return new Response(`${JSON.stringify(createGeneratedSiteNavigation("/HIA-Documentation/", apiReferenceBase), null, 2)}\n`, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
