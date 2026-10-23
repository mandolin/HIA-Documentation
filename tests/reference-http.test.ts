/**
 * @file
 * @lang zh-CN 离线复现瞬态503/传输故障及不可重试内容错误，不访问网络或真实等待。
 * @lang en Reproduces transient 503/transport failures and non-retryable content errors offline without network access or real waits.
 */
import { describe, expect, it, vi } from "vitest";
import { readReferenceText } from "../scripts/reference-http.mjs";

/** @lang zh-CN 每个测试独立的合成URL与注入函数，禁止真实fetch与延迟。
 * @lang en Independent synthetic URL and injected functions per test, prohibiting real fetches or delays.
 */
function probe() {
  // <lang><zh-CN>地址中的query为隐私哨兵，重试日志不得输出。</zh-CN><en>The query is a privacy sentinel that retry logs must omit.</en></lang>
  return { url: new URL("https://example.test/current/zh-CN/?private-token=sentinel"), fetchImpl: vi.fn(), wait: vi.fn(async () => {}), warn: vi.fn() };
}
describe("reference HTTP transient recovery", () => {
  it("recovers one 503 without restarting semantic checks", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
    expect(p.fetchImpl).toHaveBeenCalledTimes(2);
    expect(p.wait).toHaveBeenCalledWith(1000);
  });
  it("retries native transport failure", async () => {
    const p = probe();
    p.fetchImpl.mockRejectedValueOnce(new TypeError("fetch failed private-token")).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
  });
  it("recovers 502 and 504 on the final permitted attempt", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValueOnce(new Response("", { status: 502 })).mockResolvedValueOnce(new Response("", { status: 504 })).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
    expect(p.wait.mock.calls).toEqual([[1000], [2000]]);
  });
  it("fails persistent 503 after exactly three attempts", async () => {
    const p = probe();
    p.fetchImpl.mockImplementation(async () => new Response("busy", { status: 503 }));
    await expect(readReferenceText(p.url, "text/plain", p)).rejects.toThrow("HTTP 503");
    expect(p.fetchImpl).toHaveBeenCalledTimes(3);
    expect(p.wait).toHaveBeenCalledTimes(2);
  });
  it("does not retry missing resources", async () => {
    // <lang><zh-CN>认证拒绝与缺失均不是短暂服务错误，不可通过重试掩盖。</zh-CN><en>Authentication denial and missing resources are not transient service errors and cannot be hidden by retries.</en></lang>
    for (const status of [401, 403, 404]) {
    const p = probe();
    p.fetchImpl.mockResolvedValue(new Response("missing", { status }));
    await expect(readReferenceText(p.url, "text/plain", p)).rejects.toThrow("HTTP " + status);
    expect(p.fetchImpl).toHaveBeenCalledTimes(1);
    expect(p.wait).not.toHaveBeenCalled();
    }
  });
  it("leaves malformed JSON to immediate caller validation", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValue(new Response("{broken"));
    const body = await readReferenceText(p.url, "application/json", p);
    expect(() => JSON.parse(body)).toThrow();
    expect(p.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("retries body transport failure within the request boundary", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValueOnce({ ok: true, text: async () => { throw new TypeError("terminated"); } }).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
  });
  it("retries request timeout without leaking its text", async () => {
    const p = probe();
    p.fetchImpl.mockRejectedValueOnce(new DOMException("private-token", "TimeoutError")).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
    expect(p.warn.mock.calls.join(" ")).not.toContain("private-token");
  });
  it("does not retry arbitrary programming errors", async () => {
    const p = probe();
    p.fetchImpl.mockRejectedValue(new Error("programming failure"));
    await expect(readReferenceText(p.url, "text/plain", p)).rejects.toThrow("programming failure");
    expect(p.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("caps Retry-After without unbounded workflow sleeps", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValueOnce(new Response("busy", { status: 429, headers: { "retry-after": "9999" } })).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(p.url, "text/plain", p)).toBe("ok");
    expect(p.wait).toHaveBeenCalledWith(5000);
    // <lang><zh-CN>HTTP日期形式的服务端建议也不得突破相同上限。</zh-CN><en>A server suggestion expressed as an HTTP date must obey the same cap.</en></lang>
    const dated = probe();
    dated.fetchImpl.mockResolvedValueOnce(new Response("busy", { status: 503, headers: { "retry-after": new Date(Date.now() + 60_000).toUTCString() } })).mockResolvedValueOnce(new Response("ok"));
    expect(await readReferenceText(dated.url, "text/plain", dated)).toBe("ok");
    expect(dated.wait).toHaveBeenCalledWith(5000);
  });
  it("releases a discarded response and logs only a safe location", async () => {
    const p = probe();
    const cancel = vi.fn(async () => {});
    p.fetchImpl.mockResolvedValueOnce({ ok: false, status: 503, headers: new Headers(), body: { cancel } }).mockResolvedValueOnce(new Response("ok"));
    await readReferenceText(p.url, "text/plain", p);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(p.warn.mock.calls.join(" ")).toContain("https://example.test/current/zh-CN/");
    expect(p.warn.mock.calls.join(" ")).not.toContain("private-token");
  });
  it("uses explicit GET with a per-request timeout signal", async () => {
    const p = probe();
    p.fetchImpl.mockResolvedValue(new Response("ok"));
    await readReferenceText(p.url, "text/plain", p);
    expect(p.fetchImpl.mock.calls[0][1].method).toBe("GET");
    expect(p.fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
