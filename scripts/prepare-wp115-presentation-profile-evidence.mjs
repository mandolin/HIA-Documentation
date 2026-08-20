import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// <lang><zh-CN>Evidence 只写入 ignored dist，并且只消费 main-repo 自有 synthetic metadata；它不读取源码正文、目标仓或网络。</zh-CN><en>Evidence is written only to ignored dist and consumes main-repo-owned synthetic metadata only; it reads no source body, target repository, or network.</en></lang>
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(repositoryRoot, "dist", "wp115-documentation-presentation-profile");

/**
 * @lang zh-CN
 * 构造 neutral multi-page/fetch profile。三个 fixture skin 不冻结任何 owner 的公开产品名称。
 *
 * @lang en
 * Builds a neutral multi-page/fetch profile. The three fixture skins freeze no owner's public product names.
 *
 * @param {Record<string, unknown>} core <lang><zh-CN>已构建的 core module。</zh-CN><en>Built core module.</en></lang>
 * @returns {Record<string, unknown>} <lang><zh-CN>不含正文的 synthetic profile。</zh-CN><en>Body-free synthetic profile.</en></lang>
 */
function createProfile(core) {
  return {
    contract: core.DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT,
    contractVersion: core.DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
    status: "ready",
    profileId: "profile.wp115.fetch.reader",
    pagePartition: {
      defaultMode: "multi-page",
      mode: "multi-page",
      pageTopicKinds: ["guide", "module", "type"],
      leafTopicPolicy: "fragment",
      topics: [
        {
          topicId: "topic.module.presentation",
          topicKind: "module",
          pageId: "page.module.presentation",
          fragmentId: "topic-module-presentation",
          navigationId: "nav.module.presentation",
          relationIds: ["relation.module-reader"],
          order: 0,
          canonicalReference: "page.module.presentation#topic-module-presentation"
        },
        {
          topicId: "topic.reader.fetch",
          topicKind: "member",
          pageId: "page.module.presentation",
          fragmentId: "topic-reader-fetch",
          navigationId: "nav.reader.fetch",
          relationIds: ["relation.module-reader"],
          order: 1,
          canonicalReference: "page.module.presentation#topic-reader-fetch"
        }
      ]
    },
    identityPolicy: {
      stableFields: ["topicId", "fragmentId", "navigationId", "relationIds"],
      pageIdProjection: "partition-mode-only",
      sourceModeAffectsIdentity: false,
      skinAffectsIdentity: false,
      schemeAffectsIdentity: false
    },
    source: {
      defaultMode: "fetch",
      mode: "fetch",
      fallbackPolicy: "none",
      readerPolicy: {
        endpointPolicy: "same-origin-relative",
        credentials: "omit",
        requestMode: "same-origin",
        redirect: "error",
        cache: "default",
        bodyExecution: false,
        limits: { maxBytes: 262_144, maxLines: 800, timeoutMs: 8_000 }
      },
      assets: [
        {
          assetId: "asset.wp115.source",
          sourceId: "source.wp115.source",
          sourceMapId: "source-map.wp115.source",
          revision: "0123456789abcdef0123456789abcdef01234567",
          classification: "public",
          relativeUrl: "./sources/0123456789abcdef/src/presentation.mjs",
          mediaType: "text/javascript",
          byteLength: 4_096,
          lineCount: 120,
          digest: {
            algorithm: "sha384",
            value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
          }
        }
      ]
    },
    theme: {
      skinId: "fixture.reader",
      scheme: "system",
      requiredCapabilities: ["native-disclosure", "semantic-tokens", "source-reader"],
      skins: [
        {
          skinId: "fixture.graphite",
          tokenContract: "documentation-semantic-tokens@0.1.0-draft",
          supportedSchemes: ["dark", "light", "system"],
          capabilities: ["native-disclosure", "print", "semantic-tokens", "source-reader"]
        },
        {
          skinId: "fixture.reader",
          tokenContract: "documentation-semantic-tokens@0.1.0-draft",
          supportedSchemes: ["dark", "light", "system"],
          capabilities: ["native-disclosure", "print", "semantic-tokens", "source-reader"]
        },
        {
          skinId: "fixture.reference",
          tokenContract: "documentation-semantic-tokens@0.1.0-draft",
          supportedSchemes: ["dark", "light", "system"],
          capabilities: ["native-disclosure", "print", "semantic-tokens", "source-reader"]
        }
      ]
    },
    privacy: {
      sourceExposure: "public-explicit",
      sourceBodyInContract: false,
      sourceBodyInSearchIndex: false,
      absolutePathsIncluded: false,
      credentialsIncluded: false,
      cookiesRequired: false,
      privateSidecarsIncluded: false,
      telemetryEnabled: false
    },
    compatibility: {
      versionMatch: "exact",
      unknownProperties: "reject",
      identityChange: "new-contract-version",
      semanticChange: "new-contract-version"
    },
    diagnostics: []
  };
}

/**
 * @lang zh-CN
 * 运行 W-P115 的 contract、identity、fetch、状态机、privacy 与 schema distribution 检查。
 *
 * @lang en
 * Runs W-P115 contract, identity, fetch, state-machine, privacy, and schema-distribution checks.
 *
 * @returns {Promise<void>} <lang><zh-CN>ignored evidence 写入完成。</zh-CN><en>Completion of ignored evidence writing.</en></lang>
 */
async function prepareEvidence() {
  await mkdir(evidenceRoot, { recursive: true });
  const core = await import(pathToFileURL(path.join(repositoryRoot, "packages", "core", "dist", "index.js")).href);
  const schemas = await import(pathToFileURL(path.join(repositoryRoot, "packages", "schemas", "dist", "index.js")).href);
  const profile = createProfile(core);

  assert.deepEqual(core.validateDocumentationPresentationProfile(profile), []);
  assert.equal(profile.pagePartition.defaultMode, "multi-page");
  assert.equal(profile.source.defaultMode, "fetch");
  assert.equal(profile.theme.skins.length, 3);
  assert.deepEqual([...new Set(profile.theme.skins.flatMap(({ supportedSchemes }) => supportedSchemes))].sort(), ["dark", "light", "system"]);

  // <lang><zh-CN>source/theme 变体共享 topic/navigation/relation/page identity；只改变显式呈现选择。</zh-CN><en>Source/theme variants share topic/navigation/relation/page identity and change only explicit presentation choices.</en></lang>
  const presentationVariants = [
    ["fetch", "fixture.reader", "system"],
    ["embed", "fixture.reference", "light"],
    ["link", "fixture.graphite", "dark"]
  ].map(([sourceMode, skinId, scheme]) => {
    const variant = structuredClone(profile);
    variant.profileId = `profile.wp115.${sourceMode}.${skinId.split(".").at(-1)}`;
    variant.source.mode = sourceMode;
    variant.theme.skinId = skinId;
    variant.theme.scheme = scheme;
    assert.deepEqual(core.validateDocumentationPresentationProfile(variant), []);
    assert.deepEqual(core.compareDocumentationPresentationIdentity(profile, variant), []);
    return variant;
  });

  const singlePage = structuredClone(profile);
  singlePage.profileId = "profile.wp115.fetch.single";
  singlePage.pagePartition.mode = "single-page";
  singlePage.pagePartition.singlePageId = "page.all";
  for (const topic of singlePage.pagePartition.topics) {
    topic.pageId = "page.all";
    topic.canonicalReference = `page.all#${topic.fragmentId}`;
  }
  assert.deepEqual(core.validateDocumentationPresentationProfile(singlePage), []);
  assert.deepEqual(core.compareDocumentationPresentationIdentity(profile, singlePage), []);

  const fetchPlanResult = core.createDocumentationSourceFetchPlan(profile, "asset.wp115.source");
  assert.equal(fetchPlanResult.status, "ready");
  assert.equal(fetchPlanResult.plan.request.credentials, "omit");
  assert.equal(fetchPlanResult.plan.request.mode, "same-origin");
  assert.equal(fetchPlanResult.plan.request.redirect, "error");
  assert.equal(fetchPlanResult.plan.bodyPolicy.execute, false);
  assert.equal(fetchPlanResult.plan.bodyPolicy.includeInSearchIndex, false);

  const terminalEvents = {
    "content-ready": "ready",
    "content-empty": "empty",
    "access-denied": "denied",
    "asset-not-found": "not-found",
    "integrity-failed": "integrity-error",
    "network-failed": "network-error",
    "load-aborted": "aborted"
  };
  const terminalStates = [];
  for (const [event, expectedState] of Object.entries(terminalEvents)) {
    const loading = core.transitionDocumentationSourceReader("idle", "load-requested");
    const terminal = core.transitionDocumentationSourceReader(loading.state, event);
    assert.equal(terminal.state, expectedState);
    assert.deepEqual(terminal.diagnostics, []);
    assert.equal(core.transitionDocumentationSourceReader(terminal.state, "reset").state, "idle");
    terminalStates.push(terminal.state);
  }
  const invalidTransition = core.transitionDocumentationSourceReader("idle", "content-ready");
  assert.equal(invalidTransition.state, "idle");
  assert.deepEqual(invalidTransition.diagnostics.map(({ code }) => code), ["PRESENTATION_SOURCE_TRANSITION_INVALID"]);

  const noneProfile = structuredClone(profile);
  noneProfile.profileId = "profile.wp115.none.reader";
  noneProfile.source.mode = "none";
  noneProfile.source.assets = [];
  noneProfile.privacy.sourceExposure = "none";
  assert.deepEqual(core.validateDocumentationPresentationProfile(noneProfile), []);
  assert.equal(core.createDocumentationSourceFetchPlan(noneProfile, "asset.wp115.source").status, "refused");

  const unsafeProfile = structuredClone(profile);
  unsafeProfile.source.assets[0].relativeUrl = "https://example.test/source.mjs";
  assert.ok(core.validateDocumentationPresentationProfile(unsafeProfile).some(({ code }) => code === "PRESENTATION_SOURCE_ASSET_INVALID"));
  const privateProfile = { ...structuredClone(profile), sourceBody: "must-not-cross" };
  assert.deepEqual(core.validateDocumentationPresentationProfile(privateProfile).map(({ code }) => code), ["PRESENTATION_PRIVACY_BOUNDARY"]);

  const distributedSchema = schemas.getHiaSchema("documentation-presentation-profile");
  assert.equal(distributedSchema.$id, core.DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID);
  assert.equal(distributedSchema.additionalProperties, false);

  const evidence = {
    contract: "wp115-documentation-presentation-profile-evidence",
    contractVersion: "0.1.0-draft",
    status: "ready-for-wp115-closeout",
    owners: ["@hia-doc/core", "@hia-doc/schemas"],
    presentation: {
      contract: profile.contract,
      contractVersion: profile.contractVersion,
      defaultPageMode: profile.pagePartition.defaultMode,
      compatibilityPageMode: singlePage.pagePartition.mode,
      stableTopicCount: profile.pagePartition.topics.length,
      sourceModes: presentationVariants.map(({ source }) => source.mode),
      nonePrivacyStateVerified: noneProfile.privacy.sourceExposure === "none",
      skinCount: profile.theme.skins.length,
      schemes: ["dark", "light", "system"],
      identityStableAcrossPresentationVariants: true,
      pageIdChangesOnlyAcrossPartitionMode: true
    },
    sourceReader: {
      planCreated: fetchPlanResult.status === "ready",
      endpointPolicy: profile.source.readerPolicy.endpointPolicy,
      credentials: fetchPlanResult.plan.request.credentials,
      requestMode: fetchPlanResult.plan.request.mode,
      fallbackPolicy: profile.source.fallbackPolicy,
      revisionBound: Boolean(fetchPlanResult.plan.revision),
      integrityBound: Boolean(fetchPlanResult.plan.integrity),
      bodyExecution: fetchPlanResult.plan.bodyPolicy.execute,
      terminalStates,
      invalidTransitionRefused: invalidTransition.diagnostics.length === 1,
      unsafeAbsoluteEndpointRefused: true
    },
    privacy: {
      sourceBodyInContract: profile.privacy.sourceBodyInContract,
      sourceBodyInSearchIndex: profile.privacy.sourceBodyInSearchIndex,
      absolutePathsIncluded: profile.privacy.absolutePathsIncluded,
      credentialsIncluded: profile.privacy.credentialsIncluded,
      cookiesRequired: profile.privacy.cookiesRequired,
      privateSidecarsIncluded: profile.privacy.privateSidecarsIncluded,
      telemetryEnabled: profile.privacy.telemetryEnabled,
      privateFieldRefused: true
    },
    distribution: {
      schemaKey: "documentation-presentation-profile",
      schemaId: distributedSchema.$id,
      closedWorld: distributedSchema.additionalProperties === false,
      ownerPackage: schemas.HIA_SCHEMA_CATALOG.schemas.find(({ key }) => key === "documentation-presentation-profile")?.ownerPackage
    },
    permissions: {
      networkRequestExecuted: false,
      fileOrSourceBodyRead: false,
      rendererOwnerModified: false,
      satelliteRepositoryModified: false,
      bpOrPagesModified: false,
      packageVersionChanged: false,
      packagePublished: false,
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      wP116Started: false,
      wP117Started: false,
      wP119Started: false
    }
  };
  assert.equal(JSON.stringify(evidence).includes("must-not-cross"), false);

  const report = [
    "# W-P115 跨 renderer 呈现 contract evidence",
    "",
    `- 状态：\`${evidence.status}\``,
    `- contract：\`${evidence.presentation.contract}@${evidence.presentation.contractVersion}\``,
    `- 页面：默认 \`${evidence.presentation.defaultPageMode}\`，兼容 \`${evidence.presentation.compatibilityPageMode}\`，topic ${evidence.presentation.stableTopicCount} 个。`,
    `- 源码：\`${evidence.presentation.sourceModes.join("/")}\` + \`none\` privacy；endpoint \`${evidence.sourceReader.endpointPolicy}\`，credentials \`${evidence.sourceReader.credentials}\`。`,
    `- reader 终态：\`${evidence.sourceReader.terminalStates.join("/")}\`；非法迁移与绝对 endpoint 均 fail closed。`,
    `- 主题：${evidence.presentation.skinCount} 套 synthetic skin，scheme \`${evidence.presentation.schemes.join("/")}\`；未冻结 owner 皮肤名、DOM 或 CSS。`,
    `- schema：\`${evidence.distribution.schemaKey}\`，owner \`${evidence.distribution.ownerPackage}\`，closed-world=${evidence.distribution.closedWorld}。`,
    "- 权限：没有执行网络或读取源码正文；没有修改 renderer owner、卫星仓、BP/Pages 或目标仓；没有发布 package；没有启动 W-P116/W-P117/W-P119。",
    ""
  ].join("\n");
  await writeFile(path.join(evidenceRoot, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceRoot, "report.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

await prepareEvidence();
