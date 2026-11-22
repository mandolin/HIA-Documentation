/**
 * @file
 * @lang zh-CN 检查候选清单的身份、依赖边、标签与浏览器无关的只读 registry 语义。
 * @lang en Exercise candidate identity, dependency edges, tags, and read-only registry semantics.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkCandidateRegistry, deriveCandidateManifest, validateCandidatePlan } from "./npm-prerelease-candidate.mjs";

const plan = JSON.parse(readFileSync(new URL("../release/prerelease-candidate.json", import.meta.url)));
const catalog = plan.owners.flatMap(owner => owner.packages);

test("the coordinated plan has seven owners and a closed, ordered 45-package scope", () => {
  assert.equal(validateCandidatePlan(plan), plan);
  assert.equal(catalog.length, 45);
  assert.equal(catalog.flatMap(item => item.firstPartyDependencies).length, 64);
});

test("the plan rejects mutable sources, stable tags, unsafe paths, and out-of-order dependencies", () => {
  // <lang lang="zh-CN">在实际计划上逐项引入偏差，避免虚拟范围掩盖生产输入错误。</lang><lang lang="en">Mutate the actual plan so fixtures cannot conceal an error in production input.</lang>
  for (const alter of [
    copy => { copy.distTag = "latest"; },
    copy => { copy.version = copy.stableVersion; },
    copy => { copy.owners[0].sourceCommit = "main"; },
    copy => { copy.owners[0].packages[0].path = "../elsewhere"; },
    copy => { copy.waves.reverse(); },
  ]) {
    const invalid = structuredClone(plan);
    alter(invalid);
    assert.throws(() => validateCandidatePlan(invalid));
  }
});

test("candidate manifests preserve workspace links and rewrite only first-party release ranges", () => {
  const source = Buffer.from(JSON.stringify({
    name: "@hia-doc/example",
    version: plan.stableVersion,
    license: "MIT",
    publishConfig: { access: "public" },
    dependencies: { "@hia-doc/core": "workspace:*", "ajv": "8.17.1" },
    peerDependencies: { "@hia-doc/renderer-html": "^1.0.0" },
    peerDependenciesMeta: { "@hia-doc/renderer-html": { optional: true } },
  }));
  const pin = {
    name: "@hia-doc/example",
    sourceManifestSha256: createHash("sha256").update(source).digest("hex"),
    firstPartyDependencies: [
      { kind: "dependencies", dependency: "@hia-doc/core", range: "workspace:*" },
      { kind: "peerDependencies", dependency: "@hia-doc/renderer-html", range: "^1.0.0" },
    ],
  };
  const candidate = deriveCandidateManifest(source, pin, plan);
  assert.equal(candidate.version, plan.version);
  assert.equal(candidate.dependencies["@hia-doc/core"], "workspace:*");
  assert.equal(candidate.dependencies.ajv, "8.17.1");
  assert.equal(candidate.peerDependencies["@hia-doc/renderer-html"], plan.version);
  assert.equal(candidate.peerDependenciesMeta["@hia-doc/renderer-html"].optional, true);
  assert.equal(JSON.parse(source).version, plan.stableVersion);
  assert.throws(() => deriveCandidateManifest(Buffer.concat([source, Buffer.from("\n")]), pin, plan), /digest mismatch/u);
  assert.throws(() => deriveCandidateManifest(source, { ...pin, firstPartyDependencies: [] }, plan), /differs from the plan/u);
});

test("registry inspection rejects version occupancy, tag drift and unknown visibility", () => {
  const existing = catalog.find(item => item.registryBaseline.visibility === "public");
  // <lang lang="zh-CN">保留首发探针，后续候选的生产清单可以全部公开。</lang><lang lang="en">Keep a first-publication fixture even when a later candidate has no unpublished packages.</lang>
  const first = { ...existing, registryBaseline: { visibility: "anonymous-404", latest: null, next: null } };
  const packument = { name: existing.name, versions: {}, "dist-tags": { latest: existing.registryBaseline.latest, next: existing.registryBaseline.next } };
  assert.equal(checkCandidateRegistry(existing, plan, 200, packument).status, 200);
  assert.equal(checkCandidateRegistry(first, plan, 404).status, 404);
  assert.throws(() => checkCandidateRegistry(existing, plan, 404), /unavailable/u);
  assert.throws(() => checkCandidateRegistry(first, plan, 200, packument), /visibility changed/u);
  assert.throws(() => checkCandidateRegistry(first, plan, 503), /Unexpected registry/u);
  for (const occupied of [plan.version, plan.stableVersion]) {
    assert.throws(() => checkCandidateRegistry(existing, plan, 200, { ...packument, versions: { [occupied]: {} } }), /occupied/u);
  }
  assert.throws(() => checkCandidateRegistry(existing, plan, 200, { ...packument, "dist-tags": { latest: "0.0.0" } }), /latest changed/u);
});
