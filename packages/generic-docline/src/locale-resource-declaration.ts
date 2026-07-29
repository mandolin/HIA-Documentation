import {
  discoverDocumentationLocaleResources,
  validateDocumentationLocaleResourceDeclaration,
  type DocumentationLocaleResourceDeclaration,
  type DocumentationLocaleResourceDeclarationCatalogEntry,
  type DocumentationLocaleResourceDiscovery,
  type HiaDiagnostic
} from "@hia-doc/core";
import {
  DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE,
  DOCUMENTATION_LOCALE_RESOURCE_PROFILE_VERSION,
  DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE,
  extractAtTagLocaleResourceReferences,
  extractXmlLocaleResourceReferences,
  type DocumentationLocaleResourceProfileExtraction
} from "./locale-resource.js";

/**
 * W-P62 input for binding one already-parsed source profile to a controlled declaration catalog.
 *
 * 中文：W-P62 将一个已解析 source profile 绑定到受控 declaration catalog 的输入。
 */
export interface CreateDocumentationLocaleResourceSourceDeclarationOptions {
  catalog: DocumentationLocaleResourceDeclarationCatalogEntry[];
  declarationId: string;
  discoveryId: string;
  profile: typeof DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE | typeof DOCUMENTATION_XML_LOCALE_RESOURCE_PROFILE;
  resourceRootId: string;
  sourceDocumentId: string;
  sourceText: string;
}

/**
 * Profile extraction and catalog-only discovery result. `declaration` is controlled input and must not be published.
 *
 * 中文：profile extraction 与 catalog-only discovery 的结果。`declaration` 是受控输入，不能公开发布。
 */
export interface CreateDocumentationLocaleResourceSourceDeclarationResult {
  declaration: DocumentationLocaleResourceDeclaration;
  diagnostics: HiaDiagnostic[];
  discovery?: DocumentationLocaleResourceDiscovery;
  extraction: DocumentationLocaleResourceProfileExtraction;
}

/**
 * Reuse one W-P56 literal profile extraction and turn only its explicit resource selections into a controlled declaration.
 *
 * 中文：复用一个 W-P56 literal profile extraction，只把其中显式 resource selection 转为 controlled declaration。
 *
 * @param options <lang><zh-CN>in-memory source text、logical identity 与受控 catalog。</zh-CN><en>In-memory source text, logical identities, and controlled catalog.</en></lang>
 * @returns <lang><zh-CN>受控 declaration 和 public-safe logical discovery；从不读取 resource/file。</zh-CN><en>Controlled declaration and public-safe logical discovery; never reads a resource/file.</en></lang>
 */
export function createDocumentationLocaleResourceSourceDeclaration(
  options: CreateDocumentationLocaleResourceSourceDeclarationOptions
): CreateDocumentationLocaleResourceSourceDeclarationResult {
  // <lang zh-CN>profile owns source grammar；此处只消费既有 extraction，绝不以新正则猜测其他语言。</lang>
  const extraction = options.profile === DOCUMENTATION_AT_TAG_LOCALE_RESOURCE_PROFILE
    ? extractAtTagLocaleResourceReferences(options.sourceText)
    : extractXmlLocaleResourceReferences(options.sourceText);
  // <lang zh-CN>document default 与 field override 使用稳定 logical reference id；range 留在 extraction，不进入 declaration/discovery artifact。</lang>
  const references = collectDeclarationReferences(extraction);
  const declaration: DocumentationLocaleResourceDeclaration = {
    catalog: options.catalog.map((entry) => ({ ...entry })),
    contract: "documentation-locale-resource-declaration",
    contractVersion: "0.1.0-draft",
    declarationId: options.declarationId,
    kind: "controlled-declaration",
    profile: extraction.profile,
    profileVersion: extraction.profileVersion,
    references,
    resourceRootId: options.resourceRootId,
    sourceDocumentId: options.sourceDocumentId,
    visibility: "controlled"
  };
  // <lang zh-CN>source grammar error 不允许继续发现，防止部分解析静默放宽 declaration policy。</lang>
  const declarationDiagnostics = validateDocumentationLocaleResourceDeclaration(declaration);
  const diagnostics = [...extraction.diagnostics, ...declarationDiagnostics];
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { declaration, diagnostics, extraction };
  }
  // <lang zh-CN>approved profile list 是精确 pair，而不是仅按名称或版本前缀匹配。</lang>
  const discoveryResult = discoverDocumentationLocaleResources(declaration, {
    approvedProfiles: [{ profile: extraction.profile, profileVersion: DOCUMENTATION_LOCALE_RESOURCE_PROFILE_VERSION }],
    discoveryId: options.discoveryId
  });
  return {
    declaration,
    diagnostics: [...diagnostics, ...discoveryResult.diagnostics],
    ...(discoveryResult.discovery ? { discovery: discoveryResult.discovery } : {}),
    extraction
  };
}

function collectDeclarationReferences(extraction: DocumentationLocaleResourceProfileExtraction): DocumentationLocaleResourceDeclaration["references"] {
  const references: DocumentationLocaleResourceDeclaration["references"] = [];
  // <lang zh-CN>document-level selection 是默认 declaration；没有 selector 时不人为产生 external discovery。</lang>
  if (extraction.documentDefault?.resource || extraction.documentDefault?.src) {
    references.push({
      id: "document-default",
      ...(extraction.documentDefault.resource ? { resource: extraction.documentDefault.resource } : {}),
      ...(extraction.documentDefault.src ? { src: extraction.documentDefault.src } : {})
    });
  }
  const occurrences = new Map<string, number>();
  for (const fieldReference of extraction.fieldReferences) {
    // <lang zh-CN>没有 inline selector 的 field 将继承 document default，不重复定义一个同义 declaration binding。</lang>
    if (!fieldReference.reference.resource && !fieldReference.reference.src) {
      continue;
    }
    const key = fieldReference.fieldPath ?? "field";
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    references.push({
      id: `field:${key}:${occurrence}`,
      ...(fieldReference.reference.resource ? { resource: fieldReference.reference.resource } : {}),
      ...(fieldReference.reference.src ? { src: fieldReference.reference.src } : {})
    });
  }
  return references;
}
