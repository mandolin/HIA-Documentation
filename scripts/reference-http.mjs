/**
 * @file
 * @lang zh-CN 公开参考只读HTTP传输边界，内容与schema验证仍由调用者负责。
 * @lang en Read-only HTTP transport boundary for public references; callers retain content/schema validation.
 */
import { setTimeout as delay } from "node:timers/promises";

// <lang><zh-CN>只重试可恢复HTTP状态，三个请求和每次15秒超时限制总传输预算。</zh-CN><en>Retry only recoverable HTTP statuses; three requests and 15-second per-request timeouts bound the transport budget.</en></lang>
const transientStatuses = new Set([408, 429, 500, 502, 503, 504]);
/**
 * @lang zh-CN 只读GET最多三次，瞬态状态/原生传输或超时错误有限退避；内容校验不在重试范围。
 * @lang en Makes at most three read-only GETs with bounded backoff for transient statuses/native transport or timeout errors; content validation is outside retry scope.
 * @param {URL} url <lang><zh-CN>已确定的公开资源地址。</zh-CN><en>Established public resource URL.</en></lang>
 * @param {string} accept <lang><zh-CN>期望媒体类型。</zh-CN><en>Expected media types.</en></lang>
 * @param {{fetchImpl?: typeof fetch, wait?: (ms:number)=>Promise<void>, warn?: (message:string)=>void}} [dependencies] <lang><zh-CN>默认原生fetch/timer与console.warn；测试可注入，无全局修改。</zh-CN><en>Defaults to native fetch/timer and console.warn; injectable for tests without global changes.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>原始正文，无JSON解析或业务验证；永久/耗尽错误拒绝，日志不带query或传输异常正文。</zh-CN><en>Raw text without JSON/domain validation; permanent/exhausted failures reject, with queries and transport exception text omitted from logs.</en></lang>
 */
export async function readReferenceText(url, accept, { fetchImpl = fetch, wait = delay, warn = console.warn } = {}) {
  // <lang><zh-CN>公开位置去除query/片段；错误原因只使用固定状态或类别，避免反射网络异常中的凭据。</zh-CN><en>Strip query/fragment from the public location; reasons use fixed statuses/categories rather than reflecting network exceptions containing credentials.</en></lang>
  const location = `${url.origin}${url.pathname}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    // <lang><zh-CN>每次默认线性退避1/2秒；Retry-After最多5秒，不能无限拖住workflow。</zh-CN><en>Default linear backoff is 1/2 seconds; Retry-After is capped at five seconds and cannot hold a workflow indefinitely.</en></lang>
    let backoff = attempt * 1000;
    let failure;
    try {
      // <lang><zh-CN>超时信号覆盖响应头和正文读取；显式GET不重试任何写操作。</zh-CN><en>The timeout signal covers headers and body consumption; explicit GET never retries writes.</en></lang>
      const response = await fetchImpl(url, { method: "GET", headers: { accept }, signal: AbortSignal.timeout(15_000) });
      if (response.ok) return await response.text();
      failure = new Error(`${location} returned HTTP ${response.status}.`);
      if (!transientStatuses.has(response.status)) throw failure;
      // <lang><zh-CN>丢弃临时错误正文并释放连接；支持秒数和HTTP日期，限制服务端建议的等待时间。</zh-CN><en>Discard transient error bodies and release connections; support seconds and HTTP dates while bounding server-suggested waits.</en></lang>
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : Number.NaN;
      const requested = Number.isFinite(seconds) ? seconds * 1000 : retryAfter ? Date.parse(retryAfter) - Date.now() : Number.NaN;
      if (Number.isFinite(requested)) backoff = Math.min(5000, Math.max(0, requested));
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      // <lang><zh-CN>仅原生网络/超时错误进入重试；程序错误与内容语义错误直接传播。</zh-CN><en>Only native network/timeout errors enter retry; programming and semantic errors propagate immediately.</en></lang>
      if (!(error instanceof TypeError) && error?.name !== "TimeoutError") throw error;
      failure = new Error(`${location} transport failed or timed out.`);
    }
    if (attempt === 3) throw failure;
    warn(`Reference HTTP attempt ${attempt}/3 failed: ${failure.message} Retrying in ${backoff}ms.`);
    await wait(backoff);
  }
}
