import { createHash } from "node:crypto";
import {
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
  createHiaDiagnostic,
  validateDocumentationPresentationProfile,
  type DocumentationPresentationProfile,
  type DocumentationPresentationScheme,
  type DocumentationPresentationSourceAsset,
  type DocumentationPresentationSourceMode,
  type HiaDiagnostic
} from "@hia-doc/core";
import {
  getPortalThemeSkinCatalog,
  type PortalThemeSkinId
} from "@hia-doc/theme-default";

/** @lang zh-CN Portal 输出中的中性 presentation profile 固定路径。 @lang en Fixed neutral presentation-profile path in Portal output. */
export const PORTAL_PRESENTATION_PROFILE_PATH = "documentation-presentation-profile.json";
/** @lang zh-CN content-addressed public source 目录。 @lang en Content-addressed public-source directory. */
export const PORTAL_PUBLIC_SOURCE_DIRECTORY = "sources";
/** @lang zh-CN Git 字节稳定性规则内容。 @lang en Git byte-stability rule content. */
export const PORTAL_PUBLIC_SOURCE_GITATTRIBUTES = "sources/*.txt -text\n";

/** @lang zh-CN Portal profile 的单个语义 topic 输入。 @lang en One semantic topic input for a Portal profile. */
export interface PortalPresentationTopicInput {
  entryId: string;
  relationIds: string[];
  topicKind: string;
}

/** @lang zh-CN 已获 renderer 授权的源码 preview；正文只用于生成公开 asset。 @lang en Renderer-authorized source preview whose body is used only to generate a public asset. */
export interface PortalPresentationSourceInput {
  content?: string;
  entryId: string;
  sourceMapId?: string;
  sourcePath: string;
  startLine?: number;
  endLine?: number;
}

/** @lang zh-CN presentation bundle 的构建选项。 @lang en Build options for a presentation bundle. */
export interface PortalPresentationBundleOptions {
  layout: "split-site" | "single-page";
  maxLines: number;
  projectId: string;
  scheme: DocumentationPresentationScheme;
  skinId: PortalThemeSkinId;
  sourceMode: DocumentationPresentationSourceMode;
  sources: PortalPresentationSourceInput[];
  topics: PortalPresentationTopicInput[];
}

/** @lang zh-CN 一个 renderer 可写出的静态 presentation artifact。 @lang en One static presentation artifact writable by the renderer. */
export interface PortalPresentationArtifact {
  contentType: string;
  contents: string;
  path: string;
  role: "asset" | "index";
}

/** @lang zh-CN entry 对应的安全 public asset 投影；不携带正文。 @lang en Safe public-asset projection for an entry, without a body. */
export interface PortalPreparedSourceAsset {
  assetId: string;
  byteLength: number;
  digest: string;
  lineCount: number;
  relativeUrl: string;
  revision: string;
  sourceId: string;
}

/** @lang zh-CN Portal renderer 一次构造的 exact profile、资源与 entry 映射。 @lang en Exact profile, assets, and entry mapping built for one Portal render. */
export interface PortalPresentationBundle {
  artifacts: PortalPresentationArtifact[];
  diagnostics: HiaDiagnostic[];
  profile: DocumentationPresentationProfile;
  sourceByEntryId: ReadonlyMap<string, PortalPreparedSourceAsset>;
  topicByEntryId: ReadonlyMap<string, { fragmentId: string; navigationId: string; pageId: string; topicId: string }>;
}

/**
 * @lang zh-CN
 * 从已授权的内存 preview 构造 Portal-owned neutral profile 和同源 content-addressed source assets；不读取文件或网络。
 *
 * @lang en
 * Builds a Portal-owned neutral profile and same-origin content-addressed source assets from authorized in-memory previews; reads no file or network.
 *
 * @param options - 页面、源码与主题选择。Page, source, and theme selections.
 * @returns exact-valid profile、静态资源和安全 entry mapping。Exact-valid profile, static artifacts, and safe entry mapping.
 * @throws 当内部生成结果违反 W-P115 exact contract 时抛出；调用者输入缺正文只形成 refused profile diagnostic。
 * Throws when an internally generated result violates the W-P115 exact contract; a caller source without a body only creates a refused-profile diagnostic.
 */
export function createPortalPresentationBundle(options: PortalPresentationBundleOptions): PortalPresentationBundle {
  // <lang><zh-CN>topic 按 entry identity 排序并重新编号，使调用数组顺序不影响 wire output。</zh-CN><en>Sort topics by entry identity and renumber them so caller array order cannot affect wire output.</en></lang>
  const sortedTopics = [...options.topics].sort((left, right) => compareText(left.entryId, right.entryId));
  const topicByEntryId = new Map<string, { fragmentId: string; navigationId: string; pageId: string; topicId: string }>();
  const singlePageId = stableIdentity("portal.page.single", options.projectId);
  const topics = sortedTopics.map((topic, order) => {
    // <lang><zh-CN>owner route 保留在 project-index；neutral identity 使用确定性、跨平台安全的 opaque id。</zh-CN><en>The owner route remains in project-index; neutral identity uses a deterministic cross-platform-safe opaque id.</en></lang>
    const topicId = stableIdentity("portal.topic", topic.entryId);
    const fragmentId = stableIdentity("portal.fragment", topic.entryId);
    const navigationId = stableIdentity("portal.navigation", topic.entryId);
    const pageId = options.layout === "single-page" ? singlePageId : stableIdentity("portal.page", topic.entryId);
    const relationIds = [...new Set(topic.relationIds.map((relationId) => stableIdentity("portal.relation", relationId)))]
      .sort(compareText);
    topicByEntryId.set(topic.entryId, { fragmentId, navigationId, pageId, topicId });
    return {
      canonicalReference: `${pageId}#${fragmentId}`,
      fragmentId,
      navigationId,
      order,
      pageId,
      relationIds,
      topicId,
      topicKind: safeIdentityOrHash("portal.kind", topic.topicKind)
    };
  });

  // <lang><zh-CN>正文只在此局部阶段进入 hash/asset；profile、mapping 和 diagnostics 永不保存正文。</zh-CN><en>Bodies enter hashing/assets only in this local stage; profiles, mappings, and diagnostics never retain them.</en></lang>
  const sourceResult = createPortalSourceArtifacts(options.sources, options.sourceMode);
  const diagnostics = [...sourceResult.diagnostics];
  const themeSkins = getPortalThemeSkinCatalog();
  const profile: DocumentationPresentationProfile = {
    contract: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT,
    contractVersion: DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION,
    status: diagnostics.length === 0 ? "ready" : "refused",
    profileId: stableIdentity("portal.profile", options.projectId),
    pagePartition: {
      defaultMode: "multi-page",
      mode: options.layout === "split-site" ? "multi-page" : "single-page",
      leafTopicPolicy: "page",
      pageTopicKinds: [...new Set(topics.map(({ topicKind }) => topicKind))].sort(compareText),
      ...(options.layout === "single-page" ? { singlePageId } : {}),
      topics
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
      mode: options.sourceMode,
      fallbackPolicy: "none",
      assets: sourceResult.assets,
      readerPolicy: {
        endpointPolicy: "same-origin-relative",
        credentials: "omit",
        requestMode: "same-origin",
        redirect: "error",
        cache: "default",
        bodyExecution: false,
        limits: {
          maxBytes: 1_048_576,
          maxLines: options.maxLines,
          timeoutMs: 10_000
        }
      }
    },
    theme: {
      skinId: options.skinId,
      scheme: options.scheme,
      requiredCapabilities: ["native-disclosure", "no-script-default", "source-reader", "theme-selector"],
      skins: themeSkins
    },
    privacy: {
      sourceExposure: options.sourceMode === "none" ? "none" : "public-explicit",
      sourceBodyInContract: false,
      sourceBodyInSearchIndex: false,
      absolutePathsIncluded: false,
      credentialsIncluded: false,
      cookiesRequired: false,
      privateSidecarsIncluded: false,
      telemetryEnabled: false
    },
    diagnostics,
    compatibility: {
      versionMatch: "exact",
      unknownProperties: "reject",
      identityChange: "new-contract-version",
      semanticChange: "new-contract-version"
    }
  };

  // <lang><zh-CN>renderer 自己生成的 contract 若失效就是实现错误，不能作为普通用户 diagnostic 继续输出。</zh-CN><en>An invalid renderer-generated contract is an implementation error and must not continue as an ordinary user diagnostic.</en></lang>
  const validationDiagnostics = validateDocumentationPresentationProfile(profile);
  if (validationDiagnostics.length > 0) {
    throw new TypeError(`HIA_PORTAL_PRESENTATION_PROFILE_INVALID: ${validationDiagnostics.map(({ code }) => code).join(",")}`);
  }

  const profileArtifact: PortalPresentationArtifact = {
    path: PORTAL_PRESENTATION_PROFILE_PATH,
    contents: `${JSON.stringify(profile, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
    role: "index"
  };
  return {
    profile,
    diagnostics,
    topicByEntryId,
    sourceByEntryId: sourceResult.sourceByEntryId,
    artifacts: [profileArtifact, ...sourceResult.artifacts]
  };
}

/** @lang zh-CN Source artifact 子流程的结构化返回值。 @lang en Structured return value from the source-artifact subflow. */
interface PortalSourceArtifactResult {
  artifacts: PortalPresentationArtifact[];
  assets: DocumentationPresentationSourceAsset[];
  diagnostics: HiaDiagnostic[];
  sourceByEntryId: ReadonlyMap<string, PortalPreparedSourceAsset>;
}

/** @lang zh-CN 构造 public asset 并按 source identity 去重。 @lang en Builds public assets and deduplicates them by source identity. */
function createPortalSourceArtifacts(
  sources: PortalPresentationSourceInput[],
  mode: DocumentationPresentationSourceMode
): PortalSourceArtifactResult {
  if (mode === "none") {
    return { artifacts: [], assets: [], diagnostics: [], sourceByEntryId: new Map() };
  }

  const diagnostics: HiaDiagnostic[] = [];
  const assetsBySourceId = new Map<string, { asset: DocumentationPresentationSourceAsset; artifact?: PortalPresentationArtifact; projection: PortalPreparedSourceAsset; contentHash: string }>();
  const sourceByEntryId = new Map<string, PortalPreparedSourceAsset>();
  // <lang zh-CN>缺正文可能覆盖数千 topic；只记录计数并在循环后发出一个有界诊断，避免突破 contract 的 128 项上限。</lang>
  // <lang en>A missing body can affect thousands of topics; retain only a count and emit one bounded diagnostic after the loop to stay within the contract's 128-item limit.</lang>
  let missingAuthorizedAssetCount = 0;
  for (const source of [...sources].sort((left, right) => compareText(left.entryId, right.entryId))) {
    const identitySeed = `${source.sourcePath}:${source.startLine ?? 1}:${source.endLine ?? "open"}`;
    const sourceId = stableIdentity("portal.source", identitySeed);
    const content = source.content;
    if (content === undefined) {
      missingAuthorizedAssetCount += 1;
      continue;
    }

    const byteLength = Buffer.byteLength(content, "utf8");
    if (byteLength > 1_048_576) {
      diagnostics.push(createHiaDiagnostic(
        "PRESENTATION_SOURCE_ASSET_INVALID",
        "An authorized public source asset exceeds the Portal byte limit.",
        "error",
        { targetPath: `source.assets.${stableIdentity("portal.topic", source.entryId)}` }
      ));
      continue;
    }

    const contentHash = digestHex("sha256", content);
    const existing = assetsBySourceId.get(sourceId);
    if (existing && existing.contentHash !== contentHash) {
      diagnostics.push(createHiaDiagnostic(
        "PRESENTATION_SOURCE_ASSET_INVALID",
        "One stable source identity resolved to inconsistent authorized content.",
        "error",
        { targetPath: `source.assets.${sourceId}` }
      ));
      continue;
    }
    if (existing) {
      sourceByEntryId.set(source.entryId, existing.projection);
      continue;
    }

    const relativeUrl = `${PORTAL_PUBLIC_SOURCE_DIRECTORY}/${contentHash}.txt`;
    const lineCount = content.length === 0 ? 0 : content.split(/\r?\n/u).length;
    const digest = `sha384-${digestBase64("sha384", content)}`;
    const assetId = stableIdentity("portal.asset", `${identitySeed}:${contentHash}`);
    const projection: PortalPreparedSourceAsset = {
      assetId,
      sourceId,
      relativeUrl,
      revision: `content:${contentHash}`,
      digest,
      byteLength,
      lineCount
    };
    const asset: DocumentationPresentationSourceAsset = {
      assetId,
      sourceId,
      classification: "public",
      mediaType: "text/plain",
      revision: projection.revision,
      digest: { algorithm: "sha384", value: digest.slice("sha384-".length) },
      byteLength,
      lineCount,
      ...(mode === "fetch" || mode === "link" ? { relativeUrl } : {}),
      ...(source.sourceMapId ? { sourceMapId: safeIdentityOrHash("portal.source-map", source.sourceMapId) } : {})
    };
    const artifact = mode === "fetch" || mode === "link"
      ? { path: relativeUrl, contents: content, contentType: "text/plain; charset=utf-8", role: "asset" as const }
      : undefined;
    // <lang zh-CN>仅在 fetch/link 确实产生静态文件时保留 artifact 字段，满足 exact optional property 语义。</lang>
    // <lang en>Retain the artifact field only when fetch/link actually emits a static file, preserving exact optional-property semantics.</lang>
    assetsBySourceId.set(sourceId, {
      asset,
      projection,
      contentHash,
      ...(artifact ? { artifact } : {})
    });
    sourceByEntryId.set(source.entryId, projection);
  }

  if (missingAuthorizedAssetCount > 0) {
    diagnostics.unshift(createHiaDiagnostic(
      "PRESENTATION_SOURCE_ASSET_INVALID",
      `${missingAuthorizedAssetCount} documented source reference(s) have no explicitly authorized public text asset; no fallback mode was selected.`,
      "warning",
      { targetPath: "source.assets" }
    ));
  }

  const records = [...assetsBySourceId.values()].sort((left, right) => compareText(left.asset.assetId, right.asset.assetId));
  // <lang zh-CN>内容寻址会让不同 source identity 共享同一路径；按路径再去重可避免输出重复 artifact。</lang>
  // <lang en>Content addressing can map distinct source identities to one path, so deduplicate artifacts by path before emission.</lang>
  const sourceArtifacts = [...new Map(
    records.flatMap(({ artifact }) => artifact ? [[artifact.path, artifact] as const] : [])
  ).values()];
  const gitAttributes = sourceArtifacts.length > 0
    ? [{ path: ".gitattributes", contents: PORTAL_PUBLIC_SOURCE_GITATTRIBUTES, contentType: "text/plain; charset=utf-8", role: "asset" as const }]
    : [];
  return {
    diagnostics,
    sourceByEntryId,
    assets: records.map(({ asset }) => asset),
    artifacts: [...gitAttributes, ...sourceArtifacts]
  };
}

/** @lang zh-CN 保留已合法的中性 identity，否则生成 opaque hash identity。 @lang en Preserves an already valid neutral identity or creates an opaque hash identity. */
function safeIdentityOrHash(prefix: string, value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value) ? value : stableIdentity(prefix, value);
}

/** @lang zh-CN 创建不泄漏原字符串的确定性 identity。 @lang en Creates a deterministic identity that does not disclose the original string. */
function stableIdentity(prefix: string, value: string): string {
  return `${prefix}:${digestHex("sha256", value).slice(0, 32)}`;
}

/** @lang zh-CN 计算十六进制摘要。 @lang en Computes a hexadecimal digest. */
function digestHex(algorithm: "sha256", value: string): string {
  return createHash(algorithm).update(value, "utf8").digest("hex");
}

/** @lang zh-CN 计算 contract 使用的 base64 摘要。 @lang en Computes a base64 digest used by the contract. */
function digestBase64(algorithm: "sha384", value: string): string {
  return createHash(algorithm).update(value, "utf8").digest("base64");
}

/** @lang zh-CN 跨 locale 的稳定 code-point 排序。 @lang en Stable code-point ordering independent of locale. */
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
