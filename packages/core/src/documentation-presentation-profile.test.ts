import { describe, expect, it } from "vitest";
import {
  compareDocumentationPresentationIdentity,
  createDocumentationSourceFetchPlan,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
  DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA,
  transitionDocumentationSourceReader,
  validateDocumentationPresentationProfile
} from "./documentation-presentation-profile.js";

/**
 * @lang zh-CN
 * 构造不含源码正文的 synthetic multi-page/fetch profile；三个皮肤名称只属于测试数据。
 *
 * @lang en
 * Builds a body-free synthetic multi-page/fetch profile; the three skin names belong to test data only.
 *
 * @returns 可独立修改的 profile fixture。 / An independently mutable profile fixture.
 */
function createProfileFixture() {
  return {
    contract: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT,
    contractVersion: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
    status: "ready",
    profileId: "profile.fixture.fetch.reader",
    pagePartition: {
      defaultMode: "multi-page",
      mode: "multi-page",
      pageTopicKinds: ["guide", "module", "type"],
      leafTopicPolicy: "fragment",
      topics: [
        {
          topicId: "topic.module.cookies",
          topicKind: "module",
          pageId: "page.module.cookies",
          fragmentId: "topic-module-cookies",
          navigationId: "nav.module.cookies",
          relationIds: ["relation.module-to-api"],
          order: 0,
          canonicalReference: "page.module.cookies#topic-module-cookies"
        },
        {
          topicId: "topic.api.get",
          topicKind: "member",
          pageId: "page.module.cookies",
          fragmentId: "topic-api-get",
          navigationId: "nav.api.get",
          relationIds: ["relation.module-to-api"],
          order: 1,
          canonicalReference: "page.module.cookies#topic-api-get"
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
          assetId: "asset.src.api",
          sourceId: "source.src.api",
          sourceMapId: "source-map.src.api",
          revision: "0123456789abcdef0123456789abcdef01234567",
          classification: "public",
          relativeUrl: "./sources/0123456789abcdef/src/api.mjs",
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

describe("documentation-presentation-profile", () => {
  it("publishes an exact, closed-world Draft 2020-12 schema", () => {
    expect(DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA.$id).toContain("documentation-presentation-profile-0.1.0-draft");
    expect(DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(validateDocumentationPresentationProfile(createProfileFixture())).toEqual([]);
  });

  it("rejects unknown fields, unsupported versions, duplicate identity, and source privacy violations", () => {
    const unknownField = { ...createProfileFixture(), extensionField: "unknown" };
    expect(validateDocumentationPresentationProfile(unknownField).map(({ code }) => code)).toContain("PRESENTATION_PROFILE_INVALID");

    const unsupported = { ...createProfileFixture(), contractVersion: "0.1.1-draft" };
    expect(validateDocumentationPresentationProfile(unsupported).map(({ code }) => code)).toContain("PRESENTATION_CONTRACT_UNSUPPORTED");

    const duplicate = createProfileFixture();
    duplicate.pagePartition.topics.push(structuredClone(duplicate.pagePartition.topics[0]));
    expect(validateDocumentationPresentationProfile(duplicate).map(({ code }) => code)).toContain("PRESENTATION_IDENTITY_DUPLICATE");

    const absoluteEndpoint = createProfileFixture();
    absoluteEndpoint.source.assets[0].relativeUrl = "https://example.test/src/api.mjs";
    expect(validateDocumentationPresentationProfile(absoluteEndpoint).map(({ code }) => code)).toContain("PRESENTATION_SOURCE_ASSET_INVALID");

    const traversingEndpoint = createProfileFixture();
    traversingEndpoint.source.assets[0].relativeUrl = "../private/src/api.mjs";
    expect(validateDocumentationPresentationProfile(traversingEndpoint).map(({ code }) => code)).toContain("PRESENTATION_SOURCE_ASSET_INVALID");
  });

  it("keeps stable identity across source, skin, and scheme variants", () => {
    const reference = createProfileFixture();
    const candidate = createProfileFixture();
    candidate.profileId = "profile.fixture.embed.graphite";
    candidate.source.mode = "embed";
    candidate.theme.skinId = "fixture.graphite";
    candidate.theme.scheme = "dark";
    expect(compareDocumentationPresentationIdentity(reference, candidate)).toEqual([]);

    candidate.pagePartition.topics[1].relationIds = ["relation.changed"];
    expect(compareDocumentationPresentationIdentity(reference, candidate).map(({ code }) => code)).toEqual([
      "PRESENTATION_IDENTITY_DRIFT"
    ]);
  });

  it("allows pageId projection only when the explicit partition mode changes", () => {
    const reference = createProfileFixture();
    const samePartition = createProfileFixture();
    samePartition.pagePartition.topics[0].pageId = "page.changed";
    samePartition.pagePartition.topics[0].canonicalReference = "page.changed#topic-module-cookies";
    expect(compareDocumentationPresentationIdentity(reference, samePartition).map(({ code }) => code)).toEqual([
      "PRESENTATION_IDENTITY_DRIFT"
    ]);

    const singlePage = createProfileFixture();
    singlePage.pagePartition.mode = "single-page";
    singlePage.pagePartition.singlePageId = "page.all";
    for (const topic of singlePage.pagePartition.topics) {
      topic.pageId = "page.all";
      topic.canonicalReference = `page.all#${topic.fragmentId}`;
    }
    expect(validateDocumentationPresentationProfile(singlePage)).toEqual([]);
    expect(compareDocumentationPresentationIdentity(reference, singlePage)).toEqual([]);
  });

  it("builds a bounded same-origin credential-free fetch plan without executing a request", () => {
    const result = createDocumentationSourceFetchPlan(createProfileFixture(), "asset.src.api");
    expect(result.status).toBe("ready");
    expect(result.diagnostics).toEqual([]);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan?.request)).toBe(true);
    expect(Object.isFrozen(result.plan?.limits)).toBe(true);
    expect(result.plan).toEqual({
      assetId: "asset.src.api",
      sourceId: "source.src.api",
      relativeUrl: "./sources/0123456789abcdef/src/api.mjs",
      revision: "0123456789abcdef0123456789abcdef01234567",
      integrity: "sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      mediaType: "text/javascript",
      request: { cache: "default", credentials: "omit", mode: "same-origin", redirect: "error" },
      limits: { maxBytes: 262_144, maxLines: 800, timeoutMs: 8_000 },
      bodyPolicy: { execute: false, includeInSearchIndex: false }
    });
  });

  it("covers every reader terminal state and rejects invalid transitions", () => {
    const terminalCases = [
      ["content-ready", "ready"],
      ["content-empty", "empty"],
      ["access-denied", "denied"],
      ["asset-not-found", "not-found"],
      ["integrity-failed", "integrity-error"],
      ["network-failed", "network-error"],
      ["load-aborted", "aborted"]
    ] as const;

    for (const [event, expectedState] of terminalCases) {
      const loading = transitionDocumentationSourceReader("idle", "load-requested");
      expect(loading).toEqual({ state: "loading", diagnostics: [] });
      expect(transitionDocumentationSourceReader(loading.state, event)).toEqual({ state: expectedState, diagnostics: [] });
      expect(transitionDocumentationSourceReader(expectedState, "reset")).toEqual({ state: "idle", diagnostics: [] });
    }

    const invalid = transitionDocumentationSourceReader("idle", "content-ready");
    expect(invalid.state).toBe("idle");
    expect(invalid.diagnostics.map(({ code }) => code)).toEqual(["PRESENTATION_SOURCE_TRANSITION_INVALID"]);
  });

  it("models none as an explicit body-free privacy state and refuses fetch planning", () => {
    const profile = createProfileFixture();
    profile.profileId = "profile.fixture.none.reader";
    profile.source.mode = "none";
    profile.source.assets = [];
    profile.privacy.sourceExposure = "none";
    expect(validateDocumentationPresentationProfile(profile)).toEqual([]);

    const result = createDocumentationSourceFetchPlan(profile, "asset.src.api");
    expect(result.status).toBe("refused");
    expect(result.plan).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["PRESENTATION_SOURCE_FETCH_PLAN_REFUSED"]);
  });
});
