/**
 * @file
 * @lang zh-CN 从统一候选计划验证并构建单个维护仓的 npm 归档。仅在隔离副本写入发布清单。
 * @lang en Validate and build one owner's npm archives from the coordinated plan. Write manifests only in an isolated copy.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sections = ["dependencies", "optionalDependencies", "peerDependencies"];
const firstParty = /^@(hia-doc|mandolin)\/[a-z0-9][a-z0-9-]*$/u;
const sha = /^[0-9a-f]{40}$/u;
const sha256 = /^[0-9a-f]{64}$/u;
const manifestPath = /^(?:(?:packages|apps)\/[a-z0-9][a-z0-9-]*|\.)$/u;
const privateText = /(?:[A-Za-z]:[\\/](?:Users[\\/]|Project[\\/]Github_mandolin[\\/])|\/home\/(?:admin|runner)\/work\/|-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|npm_[A-Za-z0-9]{30,})/iu;
const stableVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

/**
 * @lang zh-CN 验证七个维护仓、45 包和按第一方依赖排序的发布波次。
 * @lang en Validate all seven owners, 45 packages, and publication waves ordered by first-party dependencies.
 * @param {object} plan <lang lang="zh-CN">统一候选计划。</lang><lang lang="en">Coordinated candidate plan.</lang>
 * @returns {object} <lang lang="zh-CN">已验证的输入。</lang><lang lang="en">Validated input.</lang>
 * @throws {Error} <lang lang="zh-CN">身份、标签、范围或顺序偏离时。</lang><lang lang="en">When identity, tag, scope, or order disagrees.</lang>
 */
export function validateCandidatePlan(plan) {
  assert.equal(plan.format, "hia-npm-prerelease-plan@1");
  assert.match(plan.stableVersion, stableVersion);
  assert.match(plan.version, /^[\d.]+-rc\.[1-9]\d*$/u);
  assert.equal(plan.version.split("-rc.")[0], plan.stableVersion);
  assert.equal(plan.distTag, "next");
  assert.match(plan.nodeVersion, /^24\.\d+\.\d+$/u);
  assert.equal(plan.owners.length, 7);

  // <lang lang="zh-CN">统一检查 owner、目录和包名唯一性，再检查跨仓依赖。</lang><lang lang="en">Check unique owners, package names, and paths before resolving cross-owner dependencies.</lang>
  const repositories = new Set();
  const packages = new Map();
  for (const owner of plan.owners) {
    assert.match(owner.repository, /^mandolin\/[a-zA-Z0-9-]+$/u);
    assert(!repositories.has(owner.repository), "Duplicate maintenance repository");
    repositories.add(owner.repository);
    assert.match(owner.sourceCommit, sha);
    assert.equal(owner.packer, owner.repository === "mandolin/HIA-Documentation" ? "pnpm-workspace" : "npm");
    assert(owner.packages.length > 0);
    const paths = new Set();
    for (const pkg of owner.packages) {
      assert.match(pkg.name, firstParty);
      assert.match(pkg.path, manifestPath);
      assert(!paths.has(pkg.path) && !packages.has(pkg.name), "Duplicate package path or name");
      paths.add(pkg.path);
      packages.set(pkg.name, pkg);
      assert.match(pkg.sourceManifestSha256, sha256);
      const { visibility, latest, next } = pkg.registryBaseline;
      assert(["public", "anonymous-404"].includes(visibility));
      assert(visibility === "public" || (latest === null && next === null));
      assert([latest, next].every(value => value === null || typeof value === "string"));
    }
  }
  assert.equal(packages.size, 45);
  const waves = new Map();
  for (const [index, names] of plan.waves.entries()) {
    assert(names.length > 0);
    for (const name of names) {
      assert(packages.has(name) && !waves.has(name), "Invalid or duplicate package in publication waves");
      waves.set(name, index);
    }
  }
  assert.equal(waves.size, packages.size);
  for (const pkg of packages.values()) {
    const edges = new Set();
    for (const { dependency, kind, range } of pkg.firstPartyDependencies) {
      const edge = kind + ":" + dependency;
      assert(sections.includes(kind) && !edges.has(edge), "Invalid or duplicate dependency edge");
      edges.add(edge);
      assert(["workspace:*", plan.stableVersion, "^" + plan.stableVersion].includes(range));
      assert(waves.has(dependency) && waves.get(dependency) < waves.get(pkg.name), "Dependency must precede its consumer");
    }
  }
  return plan;
}

/**
 * @lang zh-CN 核对原始清单的 SHA 和依赖边，再仅改写隔离副本的候选身份。
 * @lang en Verify the original manifest digest and dependency edges, then derive only the isolated candidate identity.
 * @param {Buffer} bytes <lang lang="zh-CN">源清单原字节。</lang><lang lang="en">Original manifest bytes.</lang>
 * @param {object} item <lang lang="zh-CN">候选计划中的包项。</lang><lang lang="en">Package entry in the candidate plan.</lang>
 * @param {object} plan <lang lang="zh-CN">已校验的候选计划。</lang><lang lang="en">Validated candidate plan.</lang>
 * @returns {object} <lang lang="zh-CN">改写后的隔离清单。</lang><lang lang="en">Transformed isolated manifest.</lang>
 * @throws {Error} <lang lang="zh-CN">原件、许可、依赖或公开身份不符时。</lang><lang lang="en">When source bytes, license, dependencies, or public identity disagree.</lang>
 */
export function deriveCandidateManifest(bytes, item, plan) {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sourceManifestSha256, "Source manifest digest mismatch");
  const result = JSON.parse(bytes);
  assert.equal(result.name, item.name);
  assert.equal(result.version, plan.stableVersion);
  assert.equal(result.license, "MIT");
  assert.equal(result.publishConfig?.access, "public");
  assert(result.private !== true);
  const expected = new Map(item.firstPartyDependencies.map(edge => [edge.kind + ":" + edge.dependency, edge.range]));
  for (const section of sections) {
    for (const [name, range] of Object.entries(result[section] ?? {})) {
      // <lang lang="zh-CN">第一方引用只能落入固定的候选集合；第三方范围原样进入归档。</lang><lang lang="en">First-party references must belong to the pinned candidate set; preserve third-party ranges.</lang>
      if (!firstParty.test(name)) {
        assert(!/^(workspace:|file:|link:|git|https?:)/u.test(range), "Unportable package dependency");
        continue;
      }
      const key = section + ":" + name;
      assert.equal(range, expected.get(key), "First-party dependency differs from the plan");
      expected.delete(key);
      if (range !== "workspace:*") result[section][name] = plan.version;
    }
  }
  assert.equal(expected.size, 0, "Planned dependency missing from the source");
  result.version = plan.version;
  return result;
}

/**
 * @lang zh-CN 解释独立 registry 查询，区分首发、既有包和版本占用；不处理写权限。
 * @lang en Interpret an anonymous registry read, distinguishing first publication, existing packages, and claimed versions; does not infer write access.
 * @param {object} item <lang lang="zh-CN">候选包计划项。</lang><lang lang="en">Planned package entry.</lang>
 * @param {object} plan <lang lang="zh-CN">候选计划。</lang><lang lang="en">Candidate plan.</lang>
 * @param {number} status <lang lang="zh-CN">HTTP 状态。</lang><lang lang="en">HTTP status.</lang>
 * @param {object} [metadata] <lang lang="zh-CN">公开 npm 包元数据。</lang><lang lang="en">Public npm packument.</lang>
 * @returns {object} <lang lang="zh-CN">通过的只读预检记录。</lang><lang lang="en">Passing read-only preflight receipt.</lang>
 * @throws {Error} <lang lang="zh-CN">版本冲突、不明响应或标签/可见性出现漂移。</lang><lang lang="en">On a version collision, unknown response, or tag/visibility drift.</lang>
 */
export function checkCandidateRegistry(item, plan, status, metadata) {
  const { visibility, latest, next } = item.registryBaseline;
  if (status === 404) {
    assert.equal(visibility, "anonymous-404", "A previously visible package is unavailable");
    return { name: item.name, status, latest: null, next: null };
  }
  assert.equal(status, 200, "Unexpected registry response");
  assert.equal(visibility, "public", "Package visibility changed since the baseline");
  assert.equal(metadata.name, item.name);
  assert(metadata.versions && metadata["dist-tags"]);
  assert(!Object.hasOwn(metadata.versions, plan.version), "Candidate version already occupied");
  assert(!Object.hasOwn(metadata.versions, plan.stableVersion), "Stable target already occupied");
  const tags = metadata["dist-tags"];
  assert.equal(tags.latest ?? null, latest, "latest changed since the baseline");
  assert.equal(tags.next ?? null, next, "next changed since the baseline");
  return { name: item.name, status, latest, next };
}

// <lang lang="zh-CN">只执行固定程序和参数，外部内容不进入 shell 程序文本。</lang><lang lang="en">Run fixed programs with argv; never interpret input as shell source.</lang>
function run(file, args, cwd) {
  return execFileSync(file, args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 180_000 });
}

// <lang lang="zh-CN">条件导出与通配符的叶子都是实际路径，包含 TypeScript 声明。</lang><lang lang="en">Conditional and wildcard export leaves are archive paths, including TypeScript declarations.</lang>
function archiveEntries(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(archiveEntries);
}

// <lang lang="zh-CN">核归档边界、公开入口和依赖；返回面向发行者的摘要。</lang><lang lang="en">Verify archive boundaries, public entries, and dependencies, then return publisher-facing digests.</lang>
function checkArchive(archive, expected, plan, cwd) {
  // <lang lang="zh-CN">先拒绝越界成员，再读取固定清单和许可证，无需解包。</lang><lang lang="en">Reject out-of-scope members before reading the fixed manifest and license without extracting the archive.</lang>
  const files = run("tar", ["-tzf", archive], cwd).trim().split(/\r?\n/u);
  assert(files.every(file => file.startsWith("package/") && !file.includes("\\") && !file.split("/").some(part => [".", "..", ".npmrc", ".git", "node_modules"].includes(part))));
  assert.equal(new Set(files).size, files.length);
  const details = run("tar", ["-tvzf", archive], cwd).trim().split(/\r?\n/u);
  assert(details.length === files.length && details.every(line => line.startsWith("-")), "Only regular package members are supported");
  // <lang lang="zh-CN">扫描已生成归档中的文本，不打印命中的私有字节。</lang><lang lang="en">Scan text in the generated archive without printing any matched private data.</lang>
  const textFiles = files.filter(file => /\.(?:md|[cm]?js|ts|json|map|cs|csproj|css|txt)$/iu.test(file));
  assert(textFiles.length > 0);
  assert(!privateText.test(run("tar", ["-xOzf", archive, ...textFiles], cwd)), "Archive contains a private path or credential signature");
  const packed = JSON.parse(run("tar", ["-xOzf", archive, "package/package.json"], cwd));
  assert.equal(packed.name, expected.name);
  assert.equal(packed.version, plan.version);
  assert.equal(packed.license, "MIT");
  assert.match(run("tar", ["-xOzf", archive, "package/LICENSE"], cwd), /^MIT License\r?\n/u);
  assert(files.includes("package/README.md"));
  for (const section of sections) {
    const wanted = Object.fromEntries(Object.entries(expected[section] ?? {}).map(([name, range]) => [name, firstParty.test(name) ? plan.version : range]));
    assert.deepEqual(packed[section] ?? {}, wanted);
  }
  const entries = [...archiveEntries(packed.exports ?? packed.main), ...archiveEntries(packed.bin), ...archiveEntries(packed.types)];
  assert(entries.length > 0);
  for (const entry of entries) {
    const target = "package/" + entry.replace(/^\.\//u, "");
    const [prefix, suffix] = target.split("*");
    if (suffix === undefined) assert(files.includes(target), "Missing package entry: " + target);
    else assert(files.some(file => file.startsWith(prefix) && file.endsWith(suffix)), "Empty package entry pattern: " + target);
  }
  const bytes = readFileSync(archive);
  return { file: path.basename(archive), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), integrity: "sha512-" + createHash("sha512").update(bytes).digest("base64"), fileCount: files.length };
}

function buildOwner(plan, owner, source, out) {
  // <lang lang="zh-CN">要求批准提交的干净独立副本，拒绝已用输出；源清单全部核过后才开始构建。</lang><lang lang="en">Require a clean isolated checkout at the approved revision and an unused output; verify every source manifest before building.</lang>
  assert.equal(process.versions.node, plan.nodeVersion);
  assert.equal(run("git", ["rev-parse", "HEAD"], source).trim(), owner.sourceCommit);
  assert.equal(run("git", ["status", "--porcelain", "--untracked-files=no"], source).trim(), "");
  assert(!existsSync(out), "Candidate output already exists");
  assert(!out.startsWith(source + path.sep) && out !== source, "Output must be separate from the source");
  const pending = owner.packages.map(item => {
    const file = realpathSync(path.join(source, item.path, "package.json"));
    assert(file.startsWith(source + path.sep));
    return { item, file, candidate: deriveCandidateManifest(readFileSync(file), item, plan) };
  });
  if (owner.packer === "pnpm-workspace") {
    process.stdout.write(run("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], source));
  }
  for (const { file, candidate } of pending) writeFileSync(file, JSON.stringify(candidate, null, 2) + "\n");
  if (owner.packer === "pnpm-workspace") process.stdout.write(run("pnpm", ["run", "build"], source));

  mkdirSync(out);
  const archives = [];
  for (const { item, file, candidate } of pending) {
    const cwd = path.dirname(file);
    const packer = owner.packer === "pnpm-workspace" ? "pnpm" : "npm";
    const args = ["pack", "--pack-destination", out];
    if (packer === "npm") args.push("--ignore-scripts");
    run(packer, args, cwd);
    const archive = path.join(out, item.name.slice(1).replace("/", "-") + "-" + plan.version + ".tgz");
    archives.push({ name: item.name, sourceManifestSha256: item.sourceManifestSha256, ...checkArchive(archive, candidate, plan, cwd) });
  }
  return archives;
}

// <lang lang="zh-CN">接入 GitHub Actions；构建收据只记录已验证的来源和产物。</lang><lang lang="en">GitHub Actions entry point; receipts contain only verified source and artifact facts.</lang>
async function runCommand() {
  const [command, planPath, repo, checkout, output] = process.argv.slice(2);
  const bytes = readFileSync(planPath);
  const plan = validateCandidatePlan(JSON.parse(bytes));
  const owner = plan.owners.find(item => item.repository === repo);
  assert(owner, "Caller repository is outside the candidate plan");
  if (command === "source") {
    console.log(owner.sourceCommit);
    return;
  }
  assert.equal(command, "build");
  const out = path.resolve(output);
  const source = realpathSync(checkout);
  const registry = [];
  // <lang lang="zh-CN">只读取公开 Registry 元数据，未知、漂移和版本占用都中止。</lang><lang lang="en">Use only anonymous registry reads; fail closed on unknown results, drift, and occupied versions.</lang>
  for (const item of owner.packages) {
    const response = await fetch("https://registry.npmjs.org/" + encodeURIComponent(item.name), {
      headers: { Accept: "application/vnd.npm.install-v1+json", "Cache-Control": "no-cache" },
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    registry.push(checkCandidateRegistry(item, plan, response.status, response.status === 200 ? await response.json() : undefined));
  }
  const archives = buildOwner(plan, owner, source, out);
  const receipt = { repository: repo, sourceCommit: owner.sourceCommit, planSha256: createHash("sha256").update(bytes).digest("hex"), version: plan.version, distTag: plan.distTag, registry, archives };
  writeFileSync(path.join(out, "candidate-receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCommand();
