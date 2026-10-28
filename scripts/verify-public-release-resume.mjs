/**
 * @file
 * @lang zh-CN 显式全已发布恢复核验CLI；无凭据读取、pack或publish，后置消费由工作流独立执行。
 * @lang en Explicit fully-published resume-verification CLI; no credential reads, pack or publish; the workflow separately runs post-consumer checks.
 */
import { readFile } from "node:fs/promises";
import { verifyPublishedReleaseBatch } from "./lib/public-release-intent.mjs";

// <lang><zh-CN>仅允许--resume，不能把--publish混入只读路径。</zh-CN><en>Allow only --resume; --publish cannot be mixed into the read-only path.</en></lang>
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--resume")) throw new Error("Unsupported resume-verification argument.");
const plan = JSON.parse(await readFile(new URL("../release/public-packages.json", import.meta.url), "utf8"));
const result = await verifyPublishedReleaseBatch({ entries: plan.packages, registry: plan.registry, resume: args.includes("--resume") });
console.log(`Read-only resume verification passed: ${result.verified} exact published targets; no pack or publish executed.`);
