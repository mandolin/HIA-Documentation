/**
 * @file
 * @lang zh-CN 验证冻结归档、真实维护入口、独立批准和正式版本恢复判断。
 * @lang en Test frozen custody, owner workflow identity, separate authorization and stable resume semantics.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateStablePreflightPlan } from "./npm-stable-preflight.mjs";
import { classifyStable, selectStableRequest, validateStableCustody } from "./publish-npm-stable.mjs";

const read = name => readFileSync(new URL("../release/" + name, import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const planBytes = read("stable-preflight.json");
const preflight = JSON.parse(planBytes);
const source = validateStablePreflightPlan(preflight, read("prerelease-candidate.json"));
const custodyBytes = read("stable-publication.json");
const custody = JSON.parse(custodyBytes);
const packages = validateStableCustody(custody, source, preflight, hash(planBytes));
const hold = JSON.parse(read("stable-authorization.json"));

/** @lang zh-CN 以真实包及仓身份构造纯函数调用。 @lang en Create a pure-function invocation with real package and owner identities. */
function request(name, mode = "audit", ref = "refs/heads/main", event = "workflow_dispatch") {
  const { repository } = packages.get(name);
  return {
    GITHUB_REPOSITORY: repository, GITHUB_REF: ref, GITHUB_EVENT_NAME: event,
    GITHUB_WORKFLOW_REF: repository + "/.github/workflows/npm-trusted-publish.yml@" + ref,
    STABLE_MODE: mode, STABLE_PACKAGE: name,
    STABLE_CONFIRMATION: "publish " + name + "@" + preflight.version + " via latest",
  };
}

/** @lang zh-CN 使用同批摘要和两个旧标签构造 Registry 回读。 @lang en Build a Registry response using the matched digest and both prior tags. */
function packument(pkg) {
  return {
    name: pkg.name, "dist-tags": { latest: pkg.baseline.latest, next: pkg.baseline.next },
    versions: {
      [pkg.baseline.latest]: { dist: { integrity: pkg.baseline.latestIntegrity } },
      [pkg.baseline.next]: { dist: { integrity: pkg.baseline.nextIntegrity } },
    },
  };
}

test("the fixed seven-owner stable cohort has 45 earlier-tested archives", () => {
  assert.equal(packages.size, 45);
  assert.equal(custody.owners.length, 7);
  const bad = structuredClone(custody);
  bad.owners[0].archives.pop();
  assert.throws(() => validateStableCustody(bad, source, preflight, hash(planBytes)));
  assert.throws(() => validateStableCustody(custody, source, preflight, hash(Buffer.from("different"))));
});

test("the audit trigger cannot write and the main-branch authorization is closed", () => {
  const name = source.waves[0][0];
  const push = request(name, "audit", "refs/heads/release/w-p157-stable-entry", "push");
  assert.equal(selectStableRequest(push, source, preflight, packages, null, hash(custodyBytes)).selected.length, 1);
  assert.throws(() => selectStableRequest({ ...push, STABLE_MODE: "publish" }, source, preflight, packages, hold, hash(custodyBytes)));
  assert.throws(() => selectStableRequest(request(name, "publish"), source, preflight, packages, hold, hash(custodyBytes)), /locked/u);
  assert.throws(() => selectStableRequest({ ...push, GITHUB_WORKFLOW_REF: "another.yml" }, source, preflight, packages, null, hash(custodyBytes)));
  assert.throws(() => selectStableRequest({ ...push, STABLE_PACKAGE: "@hia-doc/unrelated" }, source, preflight, packages, null, hash(custodyBytes)));
});

test("only the specifically approved wave can publish after all earlier receipts", () => {
  const first = source.waves[0][0];
  const second = source.waves[1][0];
  const approval = { ...hold, publicationApproved: true, approvedWave: 1 };
  assert(selection(first, approval).selected.length === 1);
  assert.throws(() => selection(second, approval), /approved wave/u);
  const next = { ...approval, approvedWave: 2 };
  assert.throws(() => selection(second, next), /incomplete/u);
  next.verified = source.waves[0].map(name => ({
    name, repository: packages.get(name).repository, integrity: packages.get(name).integrity,
    attestationsSha256: "a".repeat(64), signaturesAndProvenanceVerified: true,
  }));
  assert.equal(selection(second, next).prior.length, 11);
  next.verified[0].signaturesAndProvenanceVerified = false;
  assert.throws(() => selection(second, next));
});

/** @lang zh-CN 专用未来发行调用测试，未触及真实 npm。 @lang en Exercise future publication selection without calling npm. */
function selection(name, approval) {
  return selectStableRequest(request(name, "publish"), source, preflight, packages, approval, hash(custodyBytes));
}

test("occupied versions only reconcile matching source and tag state", () => {
  const pkg = packages.get(source.waves[0][0]);
  const state = packument(pkg);
  assert.equal(classifyStable(pkg, preflight, 200, state), "pending");
  state.versions[preflight.version] = { name: pkg.name, version: preflight.version, dist: { integrity: pkg.integrity } };
  assert.throws(() => classifyStable(pkg, preflight, 200, state));
  state["dist-tags"].latest = preflight.version;
  assert.equal(classifyStable(pkg, preflight, 200, state), "already-published");
  state.versions[preflight.version].dist.integrity = pkg.baseline.nextIntegrity;
  assert.throws(() => classifyStable(pkg, preflight, 200, state), /different bytes/u);
  state.versions[preflight.version].dist.integrity = pkg.integrity;
  state["dist-tags"].next = preflight.version;
  assert.throws(() => classifyStable(pkg, preflight, 200, state));
});
