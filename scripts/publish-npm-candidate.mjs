/**
 * @file
 * @lang zh-CN 从固定的 GitHub Actions 归档审计或发行单个 npm 候选，保持现有正式标签和来源。
 * @lang en Audit or publish one npm candidate from its pinned GitHub Actions archive, preserving the stable tag and provenance.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkCandidateRegistry, validateCandidatePlan } from "./npm-prerelease-candidate.mjs";

const npmRegistry = "https://registry.npmjs.org";
const candidateWorkflow = ".github/workflows/npm-candidate-build.yml";
const trustedWorkflow = ".github/workflows/npm-trusted-publish.yml";
const digestPattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const integrityPattern = /^sha512-[A-Za-z0-9+/]{86}==$/u;

/**
 * @lang zh-CN 校验归档保管清单与实际计划的哈希、七仓来源及包集合，返回全局的归档摘要索引。
 * @lang en Validate the custody manifest against the actual plan hash, seven source repositories and package sets, then index its archive digests.
 * @param {object} custody <lang lang="zh-CN">同时固定托管归档和显式发行审批的清单。</lang><lang lang="en">Manifest pinning hosted artifacts and the explicit release approval.</lang>
 * @param {object} plan <lang lang="zh-CN">已校验的发布计划。</lang><lang lang="en">Validated publication plan.</lang>
 * @param {string} planSha256 <lang lang="zh-CN">读取计划原字节的摘要。</lang><lang lang="en">Digest of the original plan bytes.</lang>
 * @returns {Map<string,string>} <lang lang="zh-CN">按包名索引的 SHA-256。</lang><lang lang="en">SHA-256 indexed by package name.</lang>
 */
export function validateCandidateCustody(custody, plan, planSha256) {
  assert.equal(custody.format, "hia-npm-prerelease-custody@1");
  assert.equal(custody.planSha256, planSha256);
  assert.equal(typeof custody.publicationApproved, "boolean");
  assert.equal(custody.owners.length, plan.owners.length);
  const digests = new Map();
  for (const owner of plan.owners) {
    const matches = custody.owners.filter(entry => entry.repository === owner.repository);
    assert.equal(matches.length, 1, "Exactly one pinned artifact per owner is required");
    const [entry] = matches;
    assert.equal(entry.sourceCommit, owner.sourceCommit);
    assert.match(entry.buildCommit, commitPattern);
    assert(entry.runId > 0 && Number.isSafeInteger(entry.runId));
    assert(entry.artifactId > 0 && Number.isSafeInteger(entry.artifactId));
    assert.match(entry.artifactSha256, digestPattern);
    assert.deepEqual(Object.keys(entry.archives).sort(), owner.packages.map(item => item.name).sort());
    assert.deepEqual(Object.keys(entry.integrities).sort(), Object.keys(entry.archives).sort());
    for (const [name, digest] of Object.entries(entry.archives)) {
      assert.match(digest, digestPattern);
      assert.match(entry.integrities[name], integrityPattern);
      digests.set(name, digest);
    }
  }
  // <lang lang="zh-CN">凭据授权仅对应既定首发包，不能由已有包或未备案名称继承。</lang><lang lang="en">Bootstrap approval applies only to enrolled first publications, never existing or unknown names.</lang>
  const first = new Set(plan.owners.flatMap(owner => owner.packages.filter(pkg => pkg.registryBaseline.visibility === "anonymous-404").map(pkg => pkg.name)));
  assert(Array.isArray(custody.bootstrapApproved) && new Set(custody.bootstrapApproved).size === custody.bootstrapApproved.length);
  assert(custody.bootstrapApproved.every(name => first.has(name)));
  return digests;
}

/**
 * @lang zh-CN 限定为本仓默认分支上的一个已备案包，实际发行要求固定清单批准和精确确认语。
 * @lang en Restrict the request to one enrolled package on the owner default branch. Publication additionally needs pinned approval and exact confirmation.
 * @param {object} input <lang lang="zh-CN">包含实际调用身份、模式和用户输入的受控执行参数。</lang><lang lang="en">Controlled operation parameters including caller identity, mode and inputs.</lang>
 * @param {object} plan <lang lang="zh-CN">已核验的统一发布计划。</lang><lang lang="en">Validated coordinated publication plan.</lang>
 * @param {object} custody <lang lang="zh-CN">已核验的归档与审批清单。</lang><lang lang="en">Validated artifact custody and approval manifest.</lang>
 * @returns {object} <lang lang="zh-CN">当前维护仓和选中的计划条目。</lang><lang lang="en">Current owner and selected plan entries.</lang>
 */
export function selectCandidateRequest({ repository, ref, workflowRef, mode, packageName, confirmation }, plan, custody) {
  assert.equal(ref, "refs/heads/main");
  assert.equal(workflowRef, repository + "/" + trustedWorkflow + "@" + ref);
  assert(["audit", "publish"].includes(mode));
  const owner = plan.owners.find(entry => entry.repository === repository);
  assert(owner, "Caller is outside the coordinated plan");
  const selected = packageName ? owner.packages.filter(item => item.name === packageName) : owner.packages;
  assert(selected.length > 0, "Package is outside the caller's plan");
  if (mode === "publish") {
    assert.equal(custody.publicationApproved, true, "Candidate publication is awaiting the separately pinned release approval");
    assert.equal(confirmation, "publish " + plan.version + " via " + plan.distTag);
    assert(packageName && selected.length === 1, "Publication selects exactly one package");
  }
  return { owner, selected };
}

/**
 * @lang zh-CN 分类当前 Registry 状态。重跑只接受同一候选摘要、原 latest 和精确 next。
 * @lang en Classify current registry state. Resuming accepts only the same candidate digest, original latest, and exact next.
 * @param {object} item <lang lang="zh-CN">固定的包条目。</lang><lang lang="en">Pinned package entry.</lang>
 * @param {object} plan <lang lang="zh-CN">候选计划。</lang><lang lang="en">Candidate plan.</lang>
 * @param {number} status <lang lang="zh-CN">Registry 的 HTTP 状态。</lang><lang lang="en">Registry HTTP status.</lang>
 * @param {object} metadata <lang lang="zh-CN">Registry 的公开元数据。</lang><lang lang="en">Public registry packument.</lang>
 * @param {string} archiveDigest <lang lang="zh-CN">经过验证的候选 tarball 摘要。</lang><lang lang="en">Verified candidate tarball digest.</lang>
 * @returns {string} <lang lang="zh-CN">待发行或同摘要已发行。</lang><lang lang="en">Pending or already published with matching bytes.</lang>
 */
export function classifyCandidate(item, plan, status, metadata, archiveDigest) {
  const published = status === 200 && metadata?.versions?.[plan.version];
  if (!published) {
    checkCandidateRegistry(item, plan, status, metadata);
    return "pending";
  }
  assert.equal(metadata.name, item.name);
  assert(!Object.hasOwn(metadata.versions, plan.stableVersion), "Stable version already occupied");
  assert.equal(metadata["dist-tags"].latest ?? null, item.registryBaseline.latest);
  assert.equal(metadata["dist-tags"].next, plan.version);
  assert.equal(published.dist?.integrity, archiveDigest, "Candidate version exists with different bytes");
  return "already-published";
}

// <lang lang="zh-CN">固定期限和禁止重定向，防止令牌或认证请求离开指定服务。</lang><lang lang="en">Bound request times and refuse redirects carrying credential-bearing requests to other services.</lang>
function service(url, options = {}) {
  return fetch(url, { signal: AbortSignal.timeout(25_000), redirect: "error", ...options });
}

// <lang lang="zh-CN">摘要只根据本轮实际读取的字节计算。</lang><lang lang="en">Compute digests from the bytes actually read in this invocation.</lang>
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// <lang lang="zh-CN">下载成功候选作业的准确工件，解包前复核 GitHub 标识和完整 ZIP 摘要。</lang><lang lang="en">Download the exact artifact from the successful candidate workflow, checking GitHub identity and the full ZIP digest before reading members.</lang>
async function getArtifact(entry, destination, token) {
  const api = "https://api.github.com/repos/" + entry.repository + "/actions";
  assert(token, "GitHub read token is required");
  const options = { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" } };
  const runResponse = await service(api + "/runs/" + entry.runId, options);
  assert.equal(runResponse.status, 200, "Could not read pinned Actions run");
  const run = await runResponse.json();
  assert.equal(run.id, entry.runId);
  assert.equal(run.event, "workflow_dispatch");
  assert.equal(run.path, candidateWorkflow);
  assert.equal(run.head_branch, "main");
  assert.equal(run.head_sha, entry.buildCommit);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  const artifactResponse = await service(api + "/artifacts/" + entry.artifactId, options);
  assert.equal(artifactResponse.status, 200, "Could not read pinned Actions artifact");
  const artifact = await artifactResponse.json();
  assert.equal(artifact.name, "npm-candidate");
  assert.equal(artifact.expired, false);
  assert.equal(artifact.digest, "sha256:" + entry.artifactSha256);
  assert.equal(artifact.workflow_run.id, entry.runId);
  assert.equal(artifact.workflow_run.head_sha, entry.buildCommit);
  assert(artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 64 * 1024 * 1024);
  // <lang lang="zh-CN">GitHub 官方接口签发下载地址，跳转目标仅接收其签名 URL。</lang><lang lang="en">Only GitHub receives the API token; the redirected storage endpoint receives its own signed URL only.</lang>
  const redirect = await service(api + "/artifacts/" + entry.artifactId + "/zip", { ...options, redirect: "manual" });
  assert.equal(redirect.status, 302, "Expected a GitHub artifact storage link");
  const signed = new URL(redirect.headers.get("location"));
  assert.equal(signed.protocol, "https:");
  const download = await service(signed);
  assert.equal(download.status, 200, "Candidate ZIP download failed");
  const claimedLength = Number(download.headers.get("content-length"));
  assert(!claimedLength || claimedLength === artifact.size_in_bytes);
  const bytes = Buffer.from(await download.arrayBuffer());
  assert.equal(bytes.length, artifact.size_in_bytes);
  assert.equal(sha256(bytes), entry.artifactSha256);
  await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
}

// <lang lang="zh-CN">仅从已认证 ZIP 提取明确条目；不执行归档中的任何程序。</lang><lang lang="en">Read only explicitly named members from the verified ZIP; never execute archived code.</lang>
function zipMember(zip, member) {
  return execFileSync("unzip", ["-p", zip, member], { maxBuffer: 32 * 1024 * 1024, timeout: 15_000 });
}

// <lang lang="zh-CN">使用绑定工作流的真实 OIDC 身份，短期令牌只在内存验证且不输出。</lang><lang lang="en">Use the actual bound workflow OIDC identity. Validate the short-lived token in memory without emitting it.</lang>
async function probeOidc(name, env) {
  assert(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, "GitHub OIDC request token is unavailable");
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  assert.equal(url.protocol, "https:");
  assert(url.hostname.endsWith(".actions.githubusercontent.com"));
  url.searchParams.set("audience", "npm:registry.npmjs.org");
  const identity = await service(url, { headers: { Authorization: "Bearer " + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN } });
  assert.equal(identity.status, 200, "GitHub OIDC identity request failed");
  const { value } = await identity.json();
  assert(typeof value === "string" && value.length > 0);
  const exchange = await service(npmRegistry + "/-/npm/v1/oidc/token/exchange/package/" + encodeURIComponent(name), {
    method: "POST", headers: { Authorization: "Bearer " + value },
  });
  if (exchange.status === 201) {
    const grant = await exchange.json();
    assert(typeof grant.token === "string" && grant.token.length > 0);
  } else {
    await exchange.body?.cancel();
  }
  return { authority: "github-oidc", status: exchange.status, verified: exchange.status === 201 };
}

// <lang lang="zh-CN">首发凭据只能只读检查有效身份；不存在包名时无法在不写入的条件下证明创建权限。</lang><lang lang="en">A first-publish credential can be checked for authenticated identity only; a nonexistent package has no non-mutating creation-authorization proof.</lang>
async function probeBootstrap(token) {
  if (!token) return { authority: "bootstrap", present: false, scopeProven: false };
  const response = await service(npmRegistry + "/-/whoami", { headers: { Authorization: "Bearer " + token } });
  await response.body?.cancel();
  return { authority: "bootstrap", present: true, status: response.status, scopeProven: false };
}

// <lang lang="zh-CN">公开查询仅用于版本、标签和归档对账，不携带任何 token。</lang><lang lang="en">Public lookups reconcile versions, labels and archive digests without carrying a token.</lang>
async function current(item, plan, receipt) {
  const response = await service(npmRegistry + "/" + encodeURIComponent(item.name), {
    headers: { Accept: "application/vnd.npm.install-v1+json", "Cache-Control": "no-cache" },
  });
  return classifyCandidate(item, plan, response.status, response.ok ? await response.json() : undefined, receipt.integrity);
}

// <lang lang="zh-CN">私有的 GitHub 下载回复与 npm 候选收据一致后，才交给发行逻辑。</lang><lang lang="en">Only expose the archive data to release logic after the GitHub response and npm candidate receipt agree.</lang>
function getReceipts(zip, entry, plan, planDigest) {
  const receipt = JSON.parse(zipMember(zip, "candidate-receipt.json"));
  assert.equal(receipt.repository, entry.repository);
  assert.equal(receipt.sourceCommit, entry.sourceCommit);
  assert.equal(receipt.planSha256, planDigest);
  assert.equal(receipt.version, plan.version);
  assert.equal(receipt.distTag, plan.distTag);
  assert.deepEqual(receipt.archives.map(record => record.name).sort(), Object.keys(entry.archives).sort());
  for (const record of receipt.archives) {
    assert.equal(record.sha256, entry.archives[record.name]);
    assert.equal(record.file, record.name.slice(1).replace("/", "-") + "-" + plan.version + ".tgz");
    assert.equal(record.integrity, entry.integrities[record.name]);
  }
  return new Map(receipt.archives.map(record => [record.name, record]));
}

// <lang lang="zh-CN">前序波次完成才能发行；包括跨仓每个版本、摘要和标签，而非只验包名存在。</lang><lang lang="en">Complete every earlier wave before publishing, checking each cross-repository version, digest and tag rather than package existence alone.</lang>
async function assertEarlierWaves(item, plan, receipts) {
  const packages = new Map(plan.owners.flatMap(owner => owner.packages.map(pkg => [pkg.name, pkg])));
  const wave = plan.waves.findIndex(names => names.includes(item.name));
  for (const names of plan.waves.slice(0, wave)) {
    await Promise.all(names.map(async name => {
      assert.equal(await current(packages.get(name), plan, receipts.get(name)), "already-published", "Earlier wave has not been published: " + name);
    }));
  }
}

// <lang lang="zh-CN">实际执行入口保留原标签，在新版推送之前必须有独立的固定审批清单。</lang><lang lang="en">The write entry preserves the prior stable tag and requires separate pinned approval before making a candidate available.</lang>
async function runCommand(env) {
  const bytes = await readFile(new URL("../release/prerelease-candidate.json", import.meta.url));
  const custody = JSON.parse(await readFile(new URL("../release/prerelease-custody.json", import.meta.url), "utf8"));
  const plan = validateCandidatePlan(JSON.parse(bytes));
  const planDigest = sha256(bytes);
  validateCandidateCustody(custody, plan, planDigest);
  const mode = env.CANDIDATE_MODE;
  const request = selectCandidateRequest({
    repository: env.GITHUB_REPOSITORY, ref: env.GITHUB_REF, workflowRef: env.GITHUB_WORKFLOW_REF,
    mode, packageName: env.CANDIDATE_PACKAGE, confirmation: env.CANDIDATE_CONFIRMATION,
  }, plan, custody);
  const privateDirectory = await mkdtemp(path.join(tmpdir(), "hia-prerelease-"));
  try {
    const receiptsByName = new Map();
    // <lang lang="zh-CN">只读预检仅下载本仓工件；发行时本仓 token 无权读取其它仓的备份，因此跨仓 SRI 来自冻结清单。</lang><lang lang="en">Audit downloads only the caller's artifact. Cross-repository prerelease SRI is taken from the pinned custody manifest during publication.</lang>
    const entry = custody.owners.find(record => record.repository === request.owner.repository);
    const zip = path.join(privateDirectory, "candidate.zip");
    await getArtifact(entry, zip, env.GH_TOKEN);
    for (const [name, record] of getReceipts(zip, entry, plan, planDigest)) receiptsByName.set(name, record);
    for (const item of request.selected) {
      const record = receiptsByName.get(item.name);
      const bytes = zipMember(zip, record.file);
      assert.equal(sha256(bytes), record.sha256);
      assert.equal("sha512-" + createHash("sha512").update(bytes).digest("base64"), record.integrity);
      const state = await current(item, plan, record);
      const first = item.registryBaseline.visibility === "anonymous-404";
      const authorization = first ? await probeBootstrap(env.HIA_NPM_BOOTSTRAP_TOKEN) : await probeOidc(item.name, env);
      console.log(JSON.stringify({ package: item.name, state, sha256: record.sha256, ...authorization }));
      if (mode === "audit" || state === "already-published") continue;
      // <lang lang="zh-CN">固定首发清单必须由 W-P156 补齐范围证明；存在令牌也不会自动授权首次创建。</lang><lang lang="en">W-P156 must pin proof of scoped bootstrap authority; token presence never automatically authorizes a first publication.</lang>
      assert(!first || (authorization.status === 200 && custody.bootstrapApproved.includes(item.name)), "Bootstrap scope authorization is unverified");
      assert(first || authorization.verified, "The registered npm trusted publisher rejected this workflow");
      const allReceipts = new Map(custody.owners.flatMap(owner => Object.entries(owner.integrities).map(([name, integrity]) => [name, { integrity }])));
      await assertEarlierWaves(item, plan, allReceipts);
      const tarball = path.join(privateDirectory, record.file);
      await writeFile(tarball, bytes, { flag: "wx", mode: 0o600 });
      const npmEnv = { ...env };
      delete npmEnv.HIA_NPM_BOOTSTRAP_TOKEN;
      delete npmEnv.NODE_AUTH_TOKEN;
      delete npmEnv.NPM_TOKEN;
      if (first) {
        npmEnv.NODE_AUTH_TOKEN = env.HIA_NPM_BOOTSTRAP_TOKEN;
        npmEnv.NPM_CONFIG_USERCONFIG = path.join(privateDirectory, "npmrc");
        await writeFile(npmEnv.NPM_CONFIG_USERCONFIG, "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\n", { mode: 0o600 });
      }
      const result = spawnSync("npm", ["publish", tarball, "--tag", plan.distTag, "--access", "public",
        "--provenance", "--ignore-scripts", "--registry=" + npmRegistry + "/"], { env: npmEnv, timeout: 180_000 });
      assert.equal(result.status, 0, "npm publication failed; reconcile registry before retrying");
      for (let attempt = 0; attempt < 6; attempt++) {
        if (await current(item, plan, record) === "already-published") return;
        await new Promise(resolve => setTimeout(resolve, 2_000));
      }
      throw new Error("npm publication was submitted; registry did not yet confirm bytes and tags");
    }
  } finally {
    await rm(privateDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCommand(process.env);
