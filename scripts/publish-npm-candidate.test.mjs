/**
 * @file
 * @lang zh-CN 验证候选发行入口的来源、当前审批和 Registry 重跑边界。
 * @lang en Verify source, approval, and registry resume boundaries for candidate publication.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateCandidatePlan } from "./npm-prerelease-candidate.mjs";
import { classifyCandidate, selectCandidateRequest, validateCandidateCustody } from "./publish-npm-candidate.mjs";

const planBytes = readFileSync(new URL("../release/prerelease-candidate.json", import.meta.url));
const plan = validateCandidatePlan(JSON.parse(planBytes));
const custody = JSON.parse(readFileSync(new URL("../release/prerelease-custody.json", import.meta.url), "utf8"));
const digest = createHash("sha256").update(planBytes).digest("hex");
const owner = plan.owners[0];
const item = owner.packages[0];
const identity = { repository: owner.repository, ref: "refs/heads/main",
  workflowRef: owner.repository + "/.github/workflows/npm-trusted-publish.yml@refs/heads/main", mode: "audit", packageName: item.name };

test("binds the tested archive cohort to the exact plan and all 45 archive identities", () => {
  assert.equal(validateCandidateCustody(custody, plan, digest).size, 45);
  assert.throws(() => validateCandidateCustody(custody, plan, "1".repeat(64)));
  const drift = structuredClone(custody);
  drift.owners[0].integrities[item.name] = "sha512-invalid";
  assert.throws(() => validateCandidateCustody(drift, plan, digest));
  drift.owners[0].integrities = custody.owners[0].integrities;
  drift.bootstrapApproved.push(item.name);
  assert.throws(() => validateCandidateCustody(drift, plan, digest));
});

test("admits only the enrolled workflow and leaves publication locked until approval", () => {
  assert.deepEqual(selectCandidateRequest(identity, plan, custody).selected, [item]);
  assert.throws(() => selectCandidateRequest({ ...identity, ref: "refs/heads/other" }, plan, custody));
  assert.throws(() => selectCandidateRequest({ ...identity, workflowRef: identity.workflowRef.replace("trusted-publish", "candidate-build") }, plan, custody));
  assert.throws(() => selectCandidateRequest({ ...identity, packageName: "@hia-doc/cssdoc-runner" }, plan, custody));
  const intent = { ...identity, mode: "publish", confirmation: "publish " + plan.version + " via next" };
  const unapproved = { ...custody, publicationApproved: false };
  assert.throws(() => selectCandidateRequest(intent, plan, unapproved), /awaiting the separately pinned release approval/u);
  const approved = { ...custody, publicationApproved: true };
  assert.throws(() => selectCandidateRequest({ ...intent, confirmation: "publish latest" }, plan, approved));
  assert.throws(() => selectCandidateRequest({ ...intent, packageName: "" }, plan, approved));
  assert.deepEqual(selectCandidateRequest(intent, plan, approved).selected, [item]);
});

test("recognizes only the same published candidate without changing stable or next", () => {
  const expectedSRI = custody.owners[0].integrities[item.name];
  const pending = { name: item.name, versions: {}, "dist-tags": { latest: item.registryBaseline.latest, next: item.registryBaseline.next } };
  assert.equal(classifyCandidate(item, plan, 200, pending, expectedSRI), "pending");
  const published = structuredClone(pending);
  published.versions[plan.version] = { dist: { integrity: expectedSRI } };
  published["dist-tags"].next = plan.version;
  assert.equal(classifyCandidate(item, plan, 200, published, expectedSRI), "already-published");
  assert.throws(() => classifyCandidate(item, plan, 200, published, "different"), /different bytes/u);
  published["dist-tags"].latest = plan.version;
  assert.throws(() => classifyCandidate(item, plan, 200, published, expectedSRI));
  assert.throws(() => classifyCandidate(item, plan, 200, published, expectedSRI, true));
});

// <lang lang="zh-CN">首次公开的自动标签仅适用于审批名称、唯一版本与原候选归档。</lang><lang lang="en">The first-publish automatic tag is limited to approved names, a sole version and the pinned archive.</lang>
test("accepts npm bootstrap latest only for an approved package's sole candidate", () => {
  const firstOwner = plan.owners.find(entry => entry.repository === "mandolin/hia-cssdoc");
  // <lang lang="zh-CN">以独立的首发基线验证原例外，后续候选使用公开包的实际标签。</lang><lang lang="en">Use a first-publication baseline for the legacy exception; later candidates use the observed tags of existing packages.</lang>
  const firstPackage = firstOwner.packages.find(entry => entry.name === "@hia-doc/cssdoc-spec");
  const first = { ...firstPackage, registryBaseline: { visibility: "anonymous-404", latest: null, next: null } };
  const expectedSRI = custody.owners.find(entry => entry.repository === firstOwner.repository).integrities[first.name];
  const observed = { name: first.name, versions: { [plan.version]: { dist: { integrity: expectedSRI } } },
    "dist-tags": { [plan.distTag]: plan.version, latest: plan.version } };
  assert.equal(classifyCandidate(first, plan, 200, observed, expectedSRI, true), "already-published");
  assert.throws(() => classifyCandidate(first, plan, 200, observed, expectedSRI));
  assert.throws(() => classifyCandidate(first, plan, 200, observed, "unexpected", true), /different bytes/u);
  const extra = structuredClone(observed);
  extra.versions["0.1.0"] = {};
  assert.throws(() => classifyCandidate(first, plan, 200, extra, expectedSRI, true), /only expose/u);
  const stubVersion = "0.0.0-stage";
  const placeholder = structuredClone(observed);
  placeholder.versions[stubVersion] = { name: first.name, version: stubVersion, stub: true };
  assert.equal(classifyCandidate(first, plan, 200, placeholder, expectedSRI, true), "already-published");
  assert.throws(() => classifyCandidate(first, plan, 200, placeholder, expectedSRI));
  placeholder["dist-tags"].staged = stubVersion;
  assert.throws(() => classifyCandidate(first, plan, 200, placeholder, expectedSRI, true), /untagged/u);
  delete placeholder["dist-tags"].staged;
  placeholder.versions[stubVersion].stub = false;
  assert.throws(() => classifyCandidate(first, plan, 200, placeholder, expectedSRI, true), /marker/u);
  placeholder.versions[stubVersion].stub = true;
  placeholder.versions[stubVersion].name = item.name;
  assert.throws(() => classifyCandidate(first, plan, 200, placeholder, expectedSRI, true), /package/u);
  observed["dist-tags"].latest = "0.2.0";
  assert.throws(() => classifyCandidate(first, plan, 200, observed, expectedSRI, true), /Unexpected/u);
  delete observed["dist-tags"].latest;
  assert.equal(classifyCandidate(first, plan, 200, observed, expectedSRI, true), "already-published");
  delete observed["dist-tags"].next;
  assert.throws(() => classifyCandidate(first, plan, 200, observed, expectedSRI, true));
});
