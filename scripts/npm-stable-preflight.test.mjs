/**
 * @file
 * @lang zh-CN 核验冻结正式预检输入、Registry 反例及可选 peer 的正式打包语义。
 * @lang en Test frozen stable preflight inputs, negative registry cases, and optional peer packing semantics.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveCandidateManifest, validateCandidatePlan } from "./npm-prerelease-candidate.mjs";
import { checkStablePreflightRegistry, validateStablePreflightPlan } from "./npm-stable-preflight.mjs";

const candidateBytes = readFileSync(new URL("../release/prerelease-candidate.json", import.meta.url));
const stable = JSON.parse(readFileSync(new URL("../release/stable-preflight.json", import.meta.url)));

// <lang lang="zh-CN">实际七仓与 45 包必须精确配对，拒绝已批准、缺包、归属漂移和候选字节失配。</lang><lang lang="en">Match all seven owners and 45 packages exactly, rejecting claimed approval, omissions, owner drift, and different candidate bytes.</lang>
test("stable preflight binds the exact candidate bytes and all owners", () => {
  assert.equal(validateStablePreflightPlan(stable, candidateBytes).owners.length, 7);
  assert.throws(() => validateStablePreflightPlan({ ...stable, publicationApproved: true }, candidateBytes), /cannot approve/u);
  assert.throws(() => validateStablePreflightPlan(stable, Buffer.concat([candidateBytes, Buffer.from(" ")])));
  assert.throws(() => validateStablePreflightPlan({ ...stable, packages: stable.packages.slice(1) }, candidateBytes));
  const packages = structuredClone(stable.packages);
  packages[0].repository = "mandolin/hia-jsdoc";
  assert.throws(() => validateStablePreflightPlan({ ...stable, packages }, candidateBytes), /owner mismatch/u);
});

// <lang lang="zh-CN">恢复基线同时绑定标签和归档字节，拒绝部分返回与已写入正式版本。</lang><lang lang="en">Bind both recovery tags and archive bytes, rejecting incomplete responses and a published stable version.</lang>
test("registry drift and occupied stable slots fail closed", () => {
  const item = stable.packages.find(entry => entry.latest !== entry.next);
  const metadata = {
    name: item.name, "dist-tags": { latest: item.latest, next: item.next },
    versions: {
      [item.latest]: { dist: { integrity: item.latestIntegrity } },
      [item.next]: { dist: { integrity: item.nextIntegrity } },
    },
  };
  assert.equal(checkStablePreflightRegistry(item, stable.version, 200, metadata).latest, item.latest);
  assert.throws(() => checkStablePreflightRegistry(item, stable.version, 404, undefined), /read failed/u);
  assert.throws(() => checkStablePreflightRegistry(item, stable.version, 200, { ...metadata, "dist-tags": { next: item.next } }), /tag changed/u);
  assert.throws(() => checkStablePreflightRegistry(item, stable.version, 200, { ...metadata, versions: { ...metadata.versions, [stable.version]: {} } }), /occupied/u);
  metadata.versions[item.latest].dist.integrity = item.nextIntegrity;
  assert.throws(() => checkStablePreflightRegistry(item, stable.version, 200, metadata), /integrity changed/u);
});

// <lang lang="zh-CN">正式产物保留源可选 peer 范围，旧候选入口继续拒绝正式身份。</lang><lang lang="en">Preserve the original optional peer range for stable packing while the candidate entry point still rejects the stable identity.</lang>
test("stable packing preserves the source peer range", () => {
  const source = Buffer.from(JSON.stringify({
    name: "@hia-doc/jsdoc-plugin-hia-sys", version: stable.version,
    license: "MIT", publishConfig: { access: "public" },
    peerDependencies: { "@hia-doc/core": "^1.0.0" },
    peerDependenciesMeta: { "@hia-doc/core": { optional: true } },
  }));
  const packageItem = {
    name: "@hia-doc/jsdoc-plugin-hia-sys",
    sourceManifestSha256: createHash("sha256").update(source).digest("hex"),
    firstPartyDependencies: [{ dependency: "@hia-doc/core", kind: "peerDependencies", range: "^1.0.0" }],
  };
  const candidate = validateCandidatePlan(JSON.parse(candidateBytes));
  const formal = { ...candidate, version: stable.version };
  assert.throws(() => validateCandidatePlan(formal));
  assert.equal(deriveCandidateManifest(source, packageItem, formal).peerDependencies["@hia-doc/core"], "^1.0.0");
  assert.equal(deriveCandidateManifest(source, packageItem, candidate).peerDependencies["@hia-doc/core"], candidate.version);
});
