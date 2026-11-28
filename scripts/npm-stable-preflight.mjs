/**
 * @file
 * @lang zh-CN 核验正式版本空位和恢复基线，从固定源码生成只读正式打包收据。
 * @lang en Verify stable version availability and recovery baselines, then produce a read-only packing receipt from pinned source.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildOwner, validateCandidatePlan } from "./npm-prerelease-candidate.mjs";

/**
 * @lang zh-CN 校验正式预检清单与候选来源、包集合、发布顺序、恢复标签和摘要配对。
 * @lang en Match the stable preflight plan to candidate source pins, package set, publication order, recovery tags, and digests.
 * @param {object} plan <lang lang="zh-CN">只读正式预检清单。</lang><lang lang="en">Read-only stable preflight plan.</lang>
 * @param {Buffer} candidateBytes <lang lang="zh-CN">固定候选计划原字节。</lang><lang lang="en">Exact bytes of the pinned candidate plan.</lang>
 * @returns {object} <lang lang="zh-CN">验证后的候选来源计划。</lang><lang lang="en">Validated candidate source plan.</lang>
 * @throws {Error} <lang lang="zh-CN">身份、范围、权限标志或摘要偏离清单时。</lang><lang lang="en">When scope, identity, approval flag, or digest disagrees.</lang>
 */
export function validateStablePreflightPlan(plan, candidateBytes) {
  assert.equal(plan.format, "hia-npm-stable-preflight@1");
  assert.equal(plan.publicationApproved, false, "Stable preflight cannot approve publication");
  assert.equal(plan.tag, "latest");
  assert.equal(plan.candidatePlanSha256, createHash("sha256").update(candidateBytes).digest("hex"));
  const candidate = validateCandidatePlan(JSON.parse(candidateBytes));
  assert.equal(plan.version, candidate.stableVersion);
  assert.deepEqual(candidate.waves.map(wave => wave.length), [11, 16, 7, 5, 3, 1, 1, 1]);
  const packages = new Map(candidate.owners.flatMap(owner => owner.packages.map(item => [item.name, owner.repository])));
  assert.equal(plan.packages.length, packages.size);
  for (const item of plan.packages) {
    assert.equal(item.repository, packages.get(item.name), "Package owner mismatch");
    assert(packages.delete(item.name), "Unexpected or duplicate package");
    assert.equal(item.next, candidate.version);
    assert.match(item.latest, /^\d+\.\d+\.\d+(?:-rc\.\d+)?$/u);
    assert.notEqual(item.latest, plan.version);
    for (const integrity of [item.latestIntegrity, item.nextIntegrity]) {
      assert.match(integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
    }
  }
  return candidate;
}

/**
 * @lang zh-CN 从匿名回读确认正式空位、原默认标签和 RC 标签及两份归档摘要。
 * @lang en Confirm the stable slot, prior default and RC tags, and both archive digests from an anonymous read.
 * @param {object} item <lang lang="zh-CN">清单中的当前包。</lang><lang lang="en">Current package in the plan.</lang>
 * @param {string} version <lang lang="zh-CN">必须仍为空的正式版本。</lang><lang lang="en">Stable version that must remain unoccupied.</lang>
 * @param {number} status <lang lang="zh-CN">Registry HTTP 状态。</lang><lang lang="en">Registry HTTP status.</lang>
 * @param {object} metadata <lang lang="zh-CN">匿名包元数据。</lang><lang lang="en">Anonymous package metadata.</lang>
 * @returns {object} <lang lang="zh-CN">读取通过的标签和摘要。</lang><lang lang="en">Tags and digests from the passing read.</lang>
 * @throws {Error} <lang lang="zh-CN">响应未知、标签或摘要漂移，或版本已占用时。</lang><lang lang="en">On unknown response, tag or digest drift, or an occupied version.</lang>
 */
export function checkStablePreflightRegistry(item, version, status, metadata) {
  assert.equal(status, 200, "Package registry read failed: " + item.name);
  assert.equal(metadata.name, item.name);
  assert(!Object.hasOwn(metadata.versions, version), "Stable target already occupied: " + item.name);
  for (const tag of ["latest", "next"]) {
    const tagged = metadata["dist-tags"][tag];
    assert.equal(tagged, item[tag], "Registry tag changed: " + item.name + " " + tag);
    assert.equal(metadata.versions[tagged]?.dist?.integrity, item[tag + "Integrity"], "Registry integrity changed: " + item.name + " " + tag);
  }
  return { name: item.name, latest: item.latest, latestIntegrity: item.latestIntegrity, next: item.next, nextIntegrity: item.nextIntegrity };
}

// <lang lang="zh-CN">只接受计划中的维护仓，解析源码或运行匿名检查和打包。</lang><lang lang="en">Limit invocation to an owner in the plan, resolving its source or running anonymous checks and packing.</lang>
async function runCommand() {
  const [command, planPath, candidatePath, repository, checkout, output] = process.argv.slice(2);
  const planBytes = readFileSync(planPath);
  const plan = JSON.parse(planBytes);
  const candidate = validateStablePreflightPlan(plan, readFileSync(candidatePath));
  const owner = candidate.owners.find(item => item.repository === repository);
  assert(owner, "Caller repository is outside the stable preflight plan");
  if (command === "source") {
    console.log(owner.sourceCommit);
    return;
  }

  assert.equal(command, "build");
  const registry = [];
  // <lang lang="zh-CN">在生成归档前核对所有标签及内容摘要。失败时停止，避免产出可误用的收据。</lang><lang lang="en">Check every tag and digest before packing. On failure, stop without producing a usable receipt.</lang>
  for (const item of plan.packages.filter(entry => entry.repository === repository)) {
    const response = await fetch("https://registry.npmjs.org/" + encodeURIComponent(item.name), {
      headers: { Accept: "application/vnd.npm.install-v1+json", "Cache-Control": "no-cache" },
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    registry.push(checkStablePreflightRegistry(item, plan.version, response.status, response.status === 200 ? await response.json() : undefined));
  }

  const out = path.resolve(output);
  const archives = buildOwner({ ...candidate, version: plan.version }, owner, realpathSync(checkout), out);
  const receipt = {
    repository, sourceCommit: owner.sourceCommit,
    candidatePlanSha256: plan.candidatePlanSha256,
    planSha256: createHash("sha256").update(planBytes).digest("hex"),
    version: plan.version, tag: plan.tag, publicationApproved: false,
    registry, archives,
  };
  writeFileSync(path.join(out, "stable-preflight-receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCommand();
