/**
 * @file
 * @lang zh-CN 在GitHub工作流中只读选择候选发布或全已发布恢复核验；只向显式GITHUB_OUTPUT追加固定模式，不调用包命令。
 * @lang en Selects candidate publishing or fully-published resume verification read-only in GitHub workflows; only appends a fixed mode to explicit GITHUB_OUTPUT and invokes no package commands.
 */
import { appendFile, readFile } from "node:fs/promises";
import { resolvePublicReleaseIntent } from "./lib/public-release-intent.mjs";

// <lang><zh-CN>参数只接受显式恢复，清单来自本仓固定路径，不由外部输入重定位。</zh-CN><en>Accept only explicit resume; the plan comes from a fixed repository path, never relocated by external input.</en></lang>
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--resume")) throw new Error("Unsupported release-mode argument.");
const plan = JSON.parse(await readFile(new URL("../release/public-packages.json", import.meta.url), "utf8"));
const resume = args.includes("--resume");
const terminal = resume && Array.isArray(plan.packages) && plan.packages.length > 0 && plan.packages.every((entry) => entry.releaseStatus === "published");
const mode = resolvePublicReleaseIntent(plan.packages, { publishReady: !terminal, resumeVerify: terminal, resume });
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
console.log(`Release operation selected: ${mode}.`);
