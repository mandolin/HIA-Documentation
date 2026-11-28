/**
 * @file
 * @lang zh-CN 以固定托管归档、波次授权和实际维护仓身份核验正式 npm 发行动作。
 * @lang en Verify stable npm publication against pinned archives, wave authorization and the actual owner workflow identity.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getArtifact, probeOidc, zipMember } from "./publish-npm-candidate.mjs";
import { checkStablePreflightRegistry, validateStablePreflightPlan } from "./npm-stable-preflight.mjs";

const registry = "https://registry.npmjs.org";
const auditBranch = "refs/heads/release/w-p157-stable-entry";
const primaryBranch = "refs/heads/main";
const ownerWorkflow = ".github/workflows/npm-trusted-publish.yml";
const buildIdentity = { event: "push", workflow: ".github/workflows/npm-stable-preflight.yml", branch: "release/w-p157-stable-preflight", name: "npm-stable-preflight" };
const sha = /^[a-f0-9]{64}$/u;
const sri = /^sha512-[A-Za-z0-9+/]{86}==$/u;
const commit = /^[a-f0-9]{40}$/u;

/** @lang zh-CN 按表示计算原件摘要。 @lang en Compute the digest of the supplied original bytes. */
function digest(bytes, integrity = false) {
  if (integrity) return "sha512-" + createHash("sha512").update(bytes).digest("base64");
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * @lang zh-CN 把验收的七仓 45 份归档与同一份来源计划和 Registry 基线绑定。
 * @lang en Bind all 45 verified archives from seven owners to the same source plan and Registry baseline.
 * @returns {Map<string,object>} <lang lang="zh-CN">按包名检索的固定归档资料。</lang><lang lang="en">Pinned archive information indexed by name.</lang>
 */
export function validateStableCustody(custody, source, preflight, preflightSha256) {
  assert.equal(custody.format, "hia-npm-stable-custody@1");
  assert.equal(custody.version, preflight.version);
  assert.equal(custody.tag, preflight.tag);
  assert.equal(custody.preflightSha256, preflightSha256);
  assert.match(custody.consumerLockSha256, sha);
  assert.equal(custody.owners.length, source.owners.length);
  const packages = new Map();
  for (const owner of source.owners) {
    const matches = custody.owners.filter(entry => entry.repository === owner.repository);
    assert.equal(matches.length, 1, "Expected exactly one frozen ZIP per owner");
    const entry = matches[0];
    assert.equal(entry.sourceCommit, owner.sourceCommit);
    assert.match(entry.buildCommit, commit);
    assert.match(entry.artifactSha256, sha);
    assert(Number.isSafeInteger(entry.runId) && entry.runId > 0);
    assert(Number.isSafeInteger(entry.artifactId) && entry.artifactId > 0);
    assert.deepEqual(entry.archives.map(a => a.name).sort(), owner.packages.map(a => a.name).sort());
    for (const archive of entry.archives) {
      const sourcePackage = owner.packages.find(item => item.name === archive.name);
      assert.equal(archive.sourceManifestSha256, sourcePackage.sourceManifestSha256);
      assert.equal(archive.file, archive.name.slice(1).replace("/", "-") + "-" + preflight.version + ".tgz");
      assert.match(archive.sha256, sha);
      assert.match(archive.integrity, sri);
      assert(Number.isSafeInteger(archive.bytes) && archive.bytes > 0 && archive.bytes <= 32 * 1024 * 1024);
      packages.set(archive.name, { ...archive, repository: owner.repository, baseline: preflight.packages.find(item => item.name === archive.name) });
    }
  }
  return packages;
}

/** @lang zh-CN 限定真实维护仓、工作流和触发方式。发布仅在默认分支，先验证授权再访问写入路径。 @lang en Restrict the real owner, workflow and trigger. Publication is main-only and must pass authorization before write access. */
export function selectStableRequest(env, source, preflight, packages, approval, custodySha256) {
  const { GITHUB_REPOSITORY: repo, GITHUB_REF: ref, GITHUB_WORKFLOW_REF: workflowRef, GITHUB_EVENT_NAME: event, STABLE_MODE: mode, STABLE_PACKAGE: name, STABLE_CONFIRMATION: confirmation } = env;
  assert.equal(workflowRef, repo + "/" + ownerWorkflow + "@" + ref);
  const owner = source.owners.find(item => item.repository === repo);
  assert(owner, "Repository is not a frozen owner");
  assert(["audit", "publish"].includes(mode));
  assert((ref === primaryBranch && event === "workflow_dispatch") || (mode === "audit" && event === "push" && [auditBranch, primaryBranch].includes(ref)));
  const selected = name ? owner.packages.filter(item => item.name === name) : owner.packages;
  assert(selected.length > 0, "Package is outside the owner's frozen scope");
  if (mode === "audit") return { owner, selected, prior: [] };

  // <lang lang="zh-CN">批准数据由主分支提供，每次只启用一波，前序凭据须覆盖全部前序包。</lang><lang lang="en">Main supplies authorization for one wave only, with receipts covering every prior package.</lang>
  assert(name && selected.length === 1, "Stable publication selects one exact package");
  assert.equal(confirmation, "publish " + name + "@" + preflight.version + " via latest");
  assert.equal(approval.format, "hia-npm-stable-authorization@1");
  assert.equal(approval.custodySha256, custodySha256);
  assert.equal(approval.publicationApproved, true, "Stable publication remains locked");
  const wave = source.waves.findIndex(row => row.includes(name)) + 1;
  assert.equal(approval.approvedWave, wave, "Package is outside the approved wave");
  const earlier = source.waves.slice(0, wave - 1).flat();
  assert.deepEqual(approval.verified.map(item => item.name).sort(), earlier.slice().sort(), "Prior wave evidence is incomplete");
  for (const row of approval.verified) {
    const item = packages.get(row.name);
    assert.equal(row.integrity, item.integrity);
    assert.equal(row.repository, item.repository);
    assert.match(row.attestationsSha256, sha);
    assert.equal(row.signaturesAndProvenanceVerified, true);
  }
  return { owner, selected, prior: approval.verified };
}

/** @lang zh-CN 已发表的同一归档允许只读恢复动作；其它内容或标签漂移失败。 @lang en Allow read-only resumption for the same published archive; fail on content or tag drift. */
export function classifyStable(pkg, preflight, status, metadata) {
  const published = status === 200 ? metadata.versions?.[preflight.version] : undefined;
  if (!published) {
    checkStablePreflightRegistry(pkg.baseline, preflight.version, status, metadata);
    return "pending";
  }
  assert.equal(metadata.name, pkg.name);
  assert.equal(published.name, pkg.name);
  assert.equal(published.version, preflight.version);
  assert.equal(published.dist?.integrity, pkg.integrity, "Stable version has different bytes");
  assert.equal(metadata["dist-tags"].latest, preflight.version);
  assert.equal(metadata["dist-tags"].next, pkg.baseline.next);
  assert.equal(metadata.versions[pkg.baseline.next]?.dist?.integrity, pkg.baseline.nextIntegrity);
  assert.equal(metadata.versions[pkg.baseline.latest]?.dist?.integrity, pkg.baseline.latestIntegrity);
  return "already-published";
}

/** @lang zh-CN 匿名读取固定 npm 主机，避免凭据、重定向及无限等待。 @lang en Read only the fixed npm host anonymously with bounded, non-redirecting requests. */
async function npmRead(route, accept = "application/json", maxBytes = 32 * 1024 * 1024) {
  assert(route.startsWith("/") && !route.startsWith("//"));
  const response = await fetch(registry + route, { redirect: "error", signal: AbortSignal.timeout(25_000), headers: { Accept: accept, "Cache-Control": "no-cache" } });
  assert.equal(response.status, 200, "Registry read rejected");
  const length = Number(response.headers.get("content-length"));
  assert(!length || length <= maxBytes);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.length <= maxBytes);
  return bytes;
}

/** @lang zh-CN 读取 Registry 当前版本或原标签，供真实摘要验证及恢复判断。 @lang en Read the current registry version or prior labels for byte verification and resume decisions. */
async function current(pkg, preflight) {
  const metadata = JSON.parse(await npmRead("/" + encodeURIComponent(pkg.name)));
  const state = classifyStable(pkg, preflight, 200, metadata);
  return { state, dist: metadata.versions[preflight.version]?.dist };
}

/** @lang zh-CN 对账可下载归档、签名存在和已核出处的原字节；前序证据由审核后的主分支批准固定。 @lang en Reconcile downloadable bytes, signatures and the exact previously verified attestation response pinned by main's reviewed approval. */
async function verifyVisible(pkg, preflight, dist, verified) {
  const file = pkg.name.split("/").at(-1) + "-" + preflight.version + ".tgz";
  const route = "/" + pkg.name + "/-/" + file;
  assert.equal(dist.tarball, registry + route);
  assert.equal(digest(await npmRead(route, "application/octet-stream", pkg.bytes), true), pkg.integrity);
  assert(dist.signatures?.length > 0, "Registry signatures are missing");
  const url = new URL(dist.attestations.url);
  assert.equal(url.origin, registry);
  assert(url.pathname.startsWith("/-/npm/v1/attestations/") && !url.search && !url.hash);
  const attestations = await npmRead(url.pathname);
  assert(JSON.parse(attestations).attestations.some(row => row.predicateType === "https://slsa.dev/provenance/v1"), "Build provenance is missing");
  if (verified) assert.equal(digest(attestations), verified.attestationsSha256, "Previously verified attestation changed");
  return digest(attestations);
}

/** @lang zh-CN 托管收据须匹配整个维护仓的固定身份及逐包摘要。 @lang en Match the complete hosted receipt to the pinned owner identity and every member digest. */
function verifyOwnerReceipt(zip, entry, preflight, planDigest, packages) {
  const receipt = JSON.parse(zipMember(zip, "stable-preflight-receipt.json"));
  assert.equal(receipt.repository, entry.repository);
  assert.equal(receipt.sourceCommit, entry.sourceCommit);
  assert.equal(receipt.planSha256, planDigest);
  assert.equal(receipt.candidatePlanSha256, preflight.candidatePlanSha256);
  assert.equal(receipt.version, preflight.version);
  assert.equal(receipt.tag, preflight.tag);
  assert.equal(receipt.publicationApproved, false);
  assert.deepEqual(receipt.archives.map(row => row.name).sort(), entry.archives.map(row => row.name).sort());
  for (const row of receipt.archives) {
    const pkg = packages.get(row.name);
    for (const key of ["file", "sha256", "integrity", "bytes", "sourceManifestSha256"]) assert.equal(row[key], pkg[key]);
  }
}

/** @lang zh-CN 从实际工作流执行已冻结的归档、Registry 和 OIDC 检查；写入仅在完成波次批准后可达。 @lang en Run pinned archive, registry and OIDC checks from the actual workflow; reach publication only after authorized wave checks. */
async function runCommand(env) {
  const [planBytes, sourceBytes, custodyBytes] = await Promise.all(["stable-preflight.json", "prerelease-candidate.json", "stable-publication.json"].map(file => readFile(new URL("../release/" + file, import.meta.url))));
  const preflight = JSON.parse(planBytes);
  const source = validateStablePreflightPlan(preflight, sourceBytes);
  const custody = JSON.parse(custodyBytes);
  const packages = validateStableCustody(custody, source, preflight, digest(planBytes));
  const approval = env.STABLE_MODE === "publish" ? JSON.parse(await readFile(env.STABLE_APPROVAL_FILE)) : null;
  const request = selectStableRequest(env, source, preflight, packages, approval, digest(custodyBytes));
  const area = await mkdtemp(path.join(tmpdir(), "hia-stable-"));
  try {
    const entry = custody.owners.find(record => record.repository === request.owner.repository);
    const zip = path.join(area, "owner.zip");
    await getArtifact(entry, zip, env.GH_TOKEN, buildIdentity);
    verifyOwnerReceipt(zip, entry, preflight, digest(planBytes), packages);
    for (const item of request.selected) {
      const pkg = packages.get(item.name);
      const bytes = zipMember(zip, pkg.file);
      assert.equal(bytes.length, pkg.bytes);
      assert.equal(digest(bytes), pkg.sha256);
      assert.equal(digest(bytes, true), pkg.integrity);
      const observed = await current(pkg, preflight);
      if (observed.state === "already-published") {
        const attestationsSha256 = await verifyVisible(pkg, preflight, observed.dist);
        console.log(JSON.stringify({ package: pkg.name, state: observed.state, sha256: pkg.sha256, attestationsSha256 }));
        continue;
      }
      const authority = await probeOidc(pkg.name, env);
      assert(authority.verified, "The bound npm publisher rejected the workflow: " + pkg.name + " (" + authority.status + ")");
      console.log(JSON.stringify({ package: pkg.name, state: observed.state, sha256: pkg.sha256, oidcStatus: authority.status }));
      if (env.STABLE_MODE === "audit") continue;

      // <lang lang="zh-CN">逐个回读已验前序归档及出处。再次检查目标以缩短并发标签漂移窗口。</lang><lang lang="en">Re-read every earlier verified artifact and provenance, then recheck the target to narrow the concurrent tag-drift window.</lang>
      for (const prior of request.prior) {
        const previous = packages.get(prior.name);
        const verified = await current(previous, preflight);
        assert.equal(verified.state, "already-published");
        await verifyVisible(previous, preflight, verified.dist, prior);
      }
      assert.equal((await current(pkg, preflight)).state, "pending", "Target changed before publish");
      const tarball = path.join(area, pkg.file);
      const config = path.join(area, "empty.npmrc");
      await writeFile(tarball, bytes, { flag: "wx", mode: 0o600 });
      await writeFile(config, "", { flag: "wx", mode: 0o600 });
      const npmEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !/^(?:npm_config_|npm_token$|node_auth_token$|gh_token$|hia_npm_)/iu.test(key)));
      const receipt = spawnSync("npm", ["publish", tarball, "--tag", "latest", "--access", "public", "--provenance", "--ignore-scripts", "--registry=" + registry + "/", "--userconfig", config, "--globalconfig", config], { env: npmEnv, cwd: area, timeout: 180_000 });
      assert.equal(receipt.status, 0, "npm did not confirm publication; reconcile before retrying");
      for (let attempt = 0; attempt < 24; attempt++) {
        const after = await current(pkg, preflight);
        if (after.state === "already-published") {
          const attestationsSha256 = await verifyVisible(pkg, preflight, after.dist);
          console.log(JSON.stringify({ package: pkg.name, state: after.state, sha256: pkg.sha256, attestationsSha256 }));
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 10_000));
      }
      throw new Error("Publication submitted; registry readback is pending");
    }
  } finally {
    await rm(area, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCommand(process.env).catch(error => {
    // <lang lang="zh-CN">压缩为单一安全诊断，避免 dump 认证数据和原始运行环境。</lang><lang lang="en">Report a single diagnostic without dumping authentication data or the raw process environment.</lang>
    console.error(error.message);
    process.exitCode = 1;
  });
}
