import {
  createHiaDiagnostic
} from "./diagnostics.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";
import {
  isDocumentationLocaleResourceId,
  validateDocumentationLocaleResourceLocator
} from "./locale-resource.js";

/**
 * Stable neutral contract for controlled DLR declarations and their public-safe discovery artifacts.
 *
 * 中文：受控 DLR 声明及其 public-safe discovery artifact 的稳定中性 contract。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT = "documentation-locale-resource-declaration" as const;

/**
 * Draft version shared by every W-P62 declaration artifact kind.
 *
 * 中文：所有 W-P62 declaration artifact kind 共用的草案版本。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * Public schema id for the declaration/discovery union.
 *
 * 中文：declaration/discovery union 的公开 schema id。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-locale-resource-declaration-0.1.0-draft.schema.json" as const;

/**
 * Controlled declaration, public discovery, and public sidecar artifact discriminators.
 *
 * 中文：受控 declaration、public discovery 与 public sidecar artifact discriminator。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_KINDS = [
  "controlled-declaration",
  "public-discovery",
  "public-discovery-sidecar"
] as const;

/**
 * Provenance kind emitted only after an approved declaration catalog matches a selection.
 *
 * 中文：仅在 approved declaration catalog 命中 selection 后输出的 provenance kind。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DISCOVERY_PROVENANCE_KIND = "declaration-catalog" as const;

/**
 * DLR declaration/discovery diagnostic catalog. Messages intentionally omit raw locators and source text.
 *
 * 中文：DLR declaration/discovery diagnostic 目录。message 刻意不含 raw locator 或 source text。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "DLR_DECLARATION_INVALID", defaultSeverity: "error", description: "DLR declaration shape is invalid." },
  { code: "DLR_DECLARATION_ID_INVALID", defaultSeverity: "error", description: "DLR declaration id is invalid." },
  { code: "DLR_DECLARATION_ROOT_INVALID", defaultSeverity: "error", description: "DLR logical resource root id is invalid." },
  { code: "DLR_DECLARATION_PROFILE_UNSUPPORTED", defaultSeverity: "error", description: "DLR declaration profile/version is not approved." },
  { code: "DLR_DECLARATION_CATALOG_DUPLICATE", defaultSeverity: "error", description: "DLR controlled catalog contains a duplicate resource identity or locator." },
  { code: "DLR_DISCOVERY_RESOURCE_UNDECLARED", defaultSeverity: "error", description: "DLR selection does not match a declared resource identity." },
  { code: "DLR_DISCOVERY_LOCATOR_UNDECLARED", defaultSeverity: "error", description: "DLR selection does not match a declared catalog locator." },
  { code: "DLR_DISCOVERY_SELECTION_INVALID", defaultSeverity: "error", description: "DLR discovery selection is ambiguous or invalid." },
  { code: "DLR_DISCOVERY_PRIVACY_VIOLATION", defaultSeverity: "error", description: "DLR public discovery metadata contains a prohibited private field." },
  { code: "DLR_DISCOVERY_COMPATIBILITY_REQUIRED", defaultSeverity: "warning", description: "DLR legacy input requires an explicit compatibility bridge." }
] as const satisfies readonly {
  code: string;
  defaultSeverity: HiaDiagnosticSeverity;
  description: string;
}[];

/**
 * One controlled catalog row. Its locator is a private matching input, never public discovery output.
 *
 * 中文：一条受控 catalog row。其 locator 是 private matching input，绝不进入 public discovery output。
 */
export interface DocumentationLocaleResourceDeclarationCatalogEntry {
  locator: string;
  resourceId: string;
}

/**
 * A source-level selection already parsed by its owning profile.
 *
 * 中文：已由所属 profile 解析完成的 source-level selection。
 */
export interface DocumentationLocaleResourceDeclarationReference {
  id: string;
  resource?: string;
  src?: string;
}

/**
 * Controlled declaration input. It may hold locators solely for in-memory allowlist matching.
 *
 * 中文：受控 declaration input。它可仅为 in-memory allowlist matching 持有 locator。
 */
export interface DocumentationLocaleResourceDeclaration {
  catalog: DocumentationLocaleResourceDeclarationCatalogEntry[];
  contract: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION;
  declarationId: string;
  kind: "controlled-declaration";
  profile: string;
  profileVersion: string;
  references: DocumentationLocaleResourceDeclarationReference[];
  resourceRootId: string;
  sourceDocumentId: string;
  visibility: "controlled";
}

/**
 * Profile capability explicitly supplied by a profile owner; core never parses source grammar.
 *
 * 中文：由 profile owner 显式提供的 profile capability；core 绝不解析 source grammar。
 */
export interface DocumentationLocaleResourceApprovedProfile {
  profile: string;
  profileVersion: string;
}

/**
 * One successful logical declaration binding. It records no locator, range, source text, or resource text.
 *
 * 中文：一条成功的 logical declaration binding；不记录 locator、range、source text 或 resource text。
 */
export interface DocumentationLocaleResourceDiscoveryBinding {
  referenceId: string;
  resourceId: string;
  selectionKind: "catalog-resource" | "catalog-src";
}

/**
 * Stable provenance for a public discovery artifact; this is not locale resolution provenance.
 *
 * 中文：public discovery artifact 的稳定 provenance；它不是 locale resolution provenance。
 */
export interface DocumentationLocaleResourceDiscoveryProvenance {
  declarationId: string;
  kind: typeof DOCUMENTATION_LOCALE_RESOURCE_DISCOVERY_PROVENANCE_KIND;
  profile: string;
  profileVersion: string;
}

/**
 * Privacy policy embedded into every public discovery artifact.
 *
 * 中文：嵌入每个 public discovery artifact 的 privacy policy。
 */
export interface DocumentationLocaleResourceDiscoveryPrivacy {
  allowRawLocator: false;
  allowRanges: false;
  allowResolvedText: false;
  allowResourceBody: false;
  allowSourceBody: false;
}

/**
 * Public-safe result of catalog-only discovery. It proves an allowlist match, not filesystem or entry validity.
 *
 * 中文：catalog-only discovery 的 public-safe 结果。它只证明 allowlist match，不证明 filesystem 或 entry validity。
 */
export interface DocumentationLocaleResourceDiscovery {
  bindings: DocumentationLocaleResourceDiscoveryBinding[];
  contract: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION;
  declarationId: string;
  diagnosticCodes: string[];
  discoveryId: string;
  kind: "public-discovery";
  privacy: DocumentationLocaleResourceDiscoveryPrivacy;
  profile: string;
  profileVersion: string;
  provenance: DocumentationLocaleResourceDiscoveryProvenance;
  resourceIds: string[];
  resourceRootId: string;
  sourceDocumentId: string;
  visibility: "public";
}

/**
 * Independent sidecar for ordinary doc-source-map linkage. It repeats only public-safe discovery metadata.
 *
 * 中文：供 ordinary doc-source-map linkage 使用的独立 sidecar；只重复 public-safe discovery metadata。
 */
export interface DocumentationLocaleResourceDiscoverySidecar {
  contract: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT;
  contractVersion: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION;
  declarationId: string;
  diagnosticCodes: string[];
  discoveryId: string;
  id: string;
  kind: "public-discovery-sidecar";
  privacy: DocumentationLocaleResourceDiscoveryPrivacy;
  profile: string;
  profileVersion: string;
  provenance: DocumentationLocaleResourceDiscoveryProvenance;
  resourceIds: string[];
  resourceRootId: string;
  sourceDocumentId: string;
  visibility: "public";
}

/**
 * Explicit input to pure catalog discovery. The caller must supply known profile/version pairs.
 *
 * 中文：pure catalog discovery 的显式输入。调用方必须提供已知 profile/version pair。
 */
export interface DiscoverDocumentationLocaleResourcesOptions {
  approvedProfiles: readonly DocumentationLocaleResourceApprovedProfile[];
  discoveryId: string;
}

/**
 * Result of pure catalog discovery. Diagnostics remain separate from the public-safe artifact.
 *
 * 中文：pure catalog discovery 的结果。diagnostic 与 public-safe artifact 保持分离。
 */
export interface DiscoverDocumentationLocaleResourcesResult {
  diagnostics: HiaDiagnostic[];
  discovery?: DocumentationLocaleResourceDiscovery;
}

/**
 * Validate a controlled declaration before a profile or later reader consumes it.
 *
 * 中文：在 profile 或后续 reader 消费前校验受控 declaration。
 *
 * @param value <lang><zh-CN>不可信 declaration runtime value。</zh-CN><en>Untrusted declaration runtime value.</en></lang>
 * @returns <lang><zh-CN>不包含 raw locator 的 diagnostic。</zh-CN><en>Diagnostics that contain no raw locator.</en></lang>
 */
export function validateDocumentationLocaleResourceDeclaration(value: unknown): HiaDiagnostic[] {
  // <lang zh-CN>先冻结 object boundary；后续字段检查不能把 runtime primitive 误作 declaration。</lang>
  if (!isRecord(value)) {
    return [createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration must be an object.")];
  }
  const diagnostics: HiaDiagnostic[] = [];
  // <lang zh-CN>contract/kind/version 共同区分 controlled input，避免把 public artifact 再输入 discovery。</lang>
  if (value.contract !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT
    || value.contractVersion !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION
    || value.kind !== "controlled-declaration"
    || value.visibility !== "controlled") {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration contract, version, kind, or visibility is invalid."));
  }
  // <lang zh-CN>logical identity 仅允许可稳定比较的非空 scalar；不用 source path、range 或 hash 衍生。</lang>
  if (!isNonEmptyString(value.declarationId) || !isNonEmptyString(value.sourceDocumentId)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_ID_INVALID", "DLR declaration and source-document ids must be non-empty strings."));
  }
  if (!isNonEmptyString(value.profile) || !isNonEmptyString(value.profileVersion)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration profile and profileVersion must be non-empty strings."));
  }
  const resourceRootId = typeof value.resourceRootId === "string" ? value.resourceRootId : "";
  if (!isDocumentationLocaleResourceRootId(resourceRootId)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_ROOT_INVALID", "DLR declaration resourceRootId must be a logical stable id."));
  }

  // <lang zh-CN>catalog 是唯一可发现集合；同 id 或 locator 不能由数组顺序消歧。</lang>
  const catalog = Array.isArray(value.catalog) ? value.catalog : undefined;
  if (!catalog) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration catalog must be an array."));
  } else {
    const resourceIds = new Set<string>();
    const locators = new Set<string>();
    for (const entry of catalog) {
      const resourceId = isRecord(entry) && typeof entry.resourceId === "string" ? entry.resourceId : undefined;
      const locator = isRecord(entry) && typeof entry.locator === "string" ? entry.locator : undefined;
      if (!resourceId || !isDocumentationLocaleResourceId(resourceId) || !locator) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration catalog entry is invalid."));
        continue;
      }
      diagnostics.push(...validateDocumentationLocaleResourceLocator(locator));
      if (resourceIds.has(resourceId) || locators.has(locator)) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_CATALOG_DUPLICATE", "DLR declaration catalog must not repeat a resource identity or locator."));
      }
      resourceIds.add(resourceId);
      locators.add(locator);
    }
  }

  // <lang zh-CN>reference 只表达二选一 selection；entryKey/field path 属于另一个 resolution 层。</lang>
  const references = Array.isArray(value.references) ? value.references : undefined;
  if (!references) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR declaration references must be an array."));
  } else {
    const referenceIds = new Set<string>();
    for (const reference of references) {
      if (!isRecord(reference) || !isNonEmptyString(reference.id)) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_SELECTION_INVALID", "DLR declaration reference id is invalid."));
        continue;
      }
      const referenceId = reference.id;
      if (referenceIds.has(referenceId)) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_SELECTION_INVALID", "DLR declaration reference ids must be unique."));
      }
      referenceIds.add(referenceId);
      const resource = typeof reference.resource === "string" ? reference.resource : undefined;
      const src = typeof reference.src === "string" ? reference.src : undefined;
      const hasResource = resource !== undefined;
      const hasSrc = src !== undefined;
      if (hasResource === hasSrc) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_SELECTION_INVALID", "DLR declaration reference must select exactly one resource or src value."));
        continue;
      }
      if (resource && !isDocumentationLocaleResourceId(resource)) {
        diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_SELECTION_INVALID", "DLR declaration reference resource id is invalid."));
      }
      if (src) {
        diagnostics.push(...validateDocumentationLocaleResourceLocator(src));
      }
    }
  }
  return diagnostics;
}

/**
 * Resolve already-parsed selections only against a controlled in-memory catalog; this function never reads files.
 *
 * 中文：仅用受控 in-memory catalog 解析已解析的 selection；本函数绝不读取文件。
 *
 * @param declaration <lang><zh-CN>受控 declaration。</zh-CN><en>Controlled declaration.</en></lang>
 * @param options <lang><zh-CN>approved profile allowlist 与 stable discovery id。</zh-CN><en>Approved profile allowlist and stable discovery id.</en></lang>
 * @returns <lang><zh-CN>logical discovery，或 fail-closed diagnostic。</zh-CN><en>Logical discovery, or fail-closed diagnostics.</en></lang>
 */
export function discoverDocumentationLocaleResources(
  declaration: DocumentationLocaleResourceDeclaration,
  options: DiscoverDocumentationLocaleResourcesOptions
): DiscoverDocumentationLocaleResourcesResult {
  // <lang zh-CN>先复用 owner validator；invalid declaration 绝不触发 partial catalog matching。</lang>
  const diagnostics = validateDocumentationLocaleResourceDeclaration(declaration);
  if (diagnostics.some(isError)) {
    return { diagnostics };
  }
  const approved = options.approvedProfiles.some((profile) => profile.profile === declaration.profile && profile.profileVersion === declaration.profileVersion);
  if (!approved) {
    return {
      diagnostics: [...diagnostics, createDeclarationDiagnostic("DLR_DECLARATION_PROFILE_UNSUPPORTED", "DLR declaration profile/version is not in the approved profile allowlist.")]
    };
  }
  if (!isNonEmptyString(options.discoveryId)) {
    return {
      diagnostics: [...diagnostics, createDeclarationDiagnostic("DLR_DECLARATION_ID_INVALID", "DLR discoveryId must be a non-empty stable id.")]
    };
  }

  // <lang zh-CN>两张 table 保持 id 与 locator 的 exact allowlist lookup；不提供 prefix、glob 或 cwd fallback。</lang>
  const catalogByResourceId = new Map(declaration.catalog.map((entry) => [entry.resourceId, entry]));
  const catalogByLocator = new Map(declaration.catalog.map((entry) => [entry.locator, entry]));
  const bindings: DocumentationLocaleResourceDiscoveryBinding[] = [];
  for (const reference of declaration.references) {
    const entry = reference.resource ? catalogByResourceId.get(reference.resource) : catalogByLocator.get(reference.src ?? "");
    if (!entry) {
      diagnostics.push(createDeclarationDiagnostic(
        reference.resource ? "DLR_DISCOVERY_RESOURCE_UNDECLARED" : "DLR_DISCOVERY_LOCATOR_UNDECLARED",
        "DLR declaration selection is not declared by the controlled catalog."
      ));
      continue;
    }
    bindings.push({
      referenceId: reference.id,
      resourceId: entry.resourceId,
      selectionKind: reference.resource ? "catalog-resource" : "catalog-src"
    });
  }
  // <lang zh-CN>binding 按 logical reference id 排序，避免 declaration array order 影响 portable artifact。</lang>
  bindings.sort((left, right) => left.referenceId.localeCompare(right.referenceId));
  const resourceIds = [...new Set(bindings.map((binding) => binding.resourceId))].sort((left, right) => left.localeCompare(right));
  const discovery: DocumentationLocaleResourceDiscovery = {
    bindings,
    contract: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT,
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION,
    declarationId: declaration.declarationId,
    diagnosticCodes: uniqueDiagnosticCodes(diagnostics),
    discoveryId: options.discoveryId,
    kind: "public-discovery",
    privacy: createDiscoveryPrivacy(),
    profile: declaration.profile,
    profileVersion: declaration.profileVersion,
    provenance: {
      declarationId: declaration.declarationId,
      kind: DOCUMENTATION_LOCALE_RESOURCE_DISCOVERY_PROVENANCE_KIND,
      profile: declaration.profile,
      profileVersion: declaration.profileVersion
    },
    resourceIds,
    resourceRootId: declaration.resourceRootId,
    sourceDocumentId: declaration.sourceDocumentId,
    visibility: "public"
  };
  const privacyDiagnostics = validateDocumentationLocaleResourceDiscovery(discovery);
  return privacyDiagnostics.some(isError)
    ? { diagnostics: [...diagnostics, ...privacyDiagnostics] }
    : { diagnostics, discovery };
}

/**
 * Create a metadata-only sidecar from a public discovery artifact.
 *
 * 中文：从 public discovery artifact 创建 metadata-only sidecar。
 */
export function createDocumentationLocaleResourceDiscoverySidecar(
  id: string,
  discovery: DocumentationLocaleResourceDiscovery
): DocumentationLocaleResourceDiscoverySidecar {
  // <lang zh-CN>sidecar 只复制 safe identity/provenance；绝不接受 caller 传入的 locator、range 或 body。</lang>
  return {
    contract: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT,
    contractVersion: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION,
    declarationId: discovery.declarationId,
    diagnosticCodes: [...discovery.diagnosticCodes],
    discoveryId: discovery.discoveryId,
    id,
    kind: "public-discovery-sidecar",
    privacy: createDiscoveryPrivacy(),
    profile: discovery.profile,
    profileVersion: discovery.profileVersion,
    provenance: { ...discovery.provenance },
    resourceIds: [...discovery.resourceIds],
    resourceRootId: discovery.resourceRootId,
    sourceDocumentId: discovery.sourceDocumentId,
    visibility: "public"
  };
}

/**
 * Validate a public discovery artifact and reject any private-source payload before it reaches an artifact boundary.
 *
 * 中文：校验 public discovery artifact，并在进入 artifact boundary 前拒绝任何 private-source payload。
 */
export function validateDocumentationLocaleResourceDiscovery(value: unknown): HiaDiagnostic[] {
  if (!isRecord(value)) {
    return [createDeclarationDiagnostic("DLR_DISCOVERY_PRIVACY_VIOLATION", "DLR public discovery must be an object.")];
  }
  const diagnostics: HiaDiagnostic[] = [];
  if (value.contract !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT
    || value.contractVersion !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION
    || value.kind !== "public-discovery"
    || value.visibility !== "public") {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery contract, version, kind, or visibility is invalid."));
  }
  diagnostics.push(...validatePublicDiscoveryShape(value));
  if (containsDiscoveryPrivateField(value)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_PRIVACY_VIOLATION", "DLR public discovery must not contain locators, paths, ranges, source/resource bodies, or resolved text."));
  }
  return diagnostics;
}

/**
 * Validate a public discovery sidecar independently of ordinary doc-source-map linkage.
 *
 * 中文：独立于 ordinary doc-source-map linkage 校验 public discovery sidecar。
 */
export function validateDocumentationLocaleResourceDiscoverySidecar(value: unknown): HiaDiagnostic[] {
  if (!isRecord(value)) {
    return [createDeclarationDiagnostic("DLR_DISCOVERY_PRIVACY_VIOLATION", "DLR public discovery sidecar must be an object.")];
  }
  const diagnostics: HiaDiagnostic[] = [];
  if (value.contract !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT
    || value.contractVersion !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION
    || value.kind !== "public-discovery-sidecar"
    || value.visibility !== "public"
    || !isNonEmptyString(value.id)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery sidecar identity or contract is invalid."));
  }
  diagnostics.push(...validatePublicDiscoveryShape(value));
  if (containsDiscoveryPrivateField(value)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_PRIVACY_VIOLATION", "DLR public discovery sidecar must not contain locators, paths, ranges, source/resource bodies, or resolved text."));
  }
  return diagnostics;
}

/**
 * JSON Schema for every `documentation-locale-resource-declaration@0.1.0-draft` artifact kind.
 *
 * 中文：所有 `documentation-locale-resource-declaration@0.1.0-draft` artifact kind 的 JSON Schema。
 */
export const DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_SCHEMA_ID,
  oneOf: [
    { $ref: "#/$defs/controlledDeclaration" },
    { $ref: "#/$defs/publicDiscovery" },
    { $ref: "#/$defs/publicDiscoverySidecar" }
  ],
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    resourceId: { type: "string", pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$" },
    rootId: { type: "string", pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$" },
    locator: {
      type: "string",
      minLength: 1,
      pattern: "^(?![A-Za-z]:)(?![\\\\/])(?![A-Za-z][A-Za-z0-9+.-]*:)(?!.*[?#])(?!.*(?:^|/)\\.{1,2}(?:/|$))[A-Za-z0-9._/-]+\\.dlr$"
    },
    privacy: {
      type: "object",
      required: ["allowRawLocator", "allowRanges", "allowResolvedText", "allowResourceBody", "allowSourceBody"],
      additionalProperties: false,
      properties: {
        allowRawLocator: { const: false },
        allowRanges: { const: false },
        allowResolvedText: { const: false },
        allowResourceBody: { const: false },
        allowSourceBody: { const: false }
      }
    },
    provenance: {
      type: "object",
      required: ["kind", "declarationId", "profile", "profileVersion"],
      additionalProperties: false,
      properties: {
        kind: { const: DOCUMENTATION_LOCALE_RESOURCE_DISCOVERY_PROVENANCE_KIND },
        declarationId: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    controlledDeclaration: {
      type: "object",
      required: ["contract", "contractVersion", "kind", "visibility", "declarationId", "sourceDocumentId", "profile", "profileVersion", "resourceRootId", "catalog", "references"],
      additionalProperties: false,
      properties: {
        contract: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT },
        contractVersion: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION },
        kind: { const: "controlled-declaration" },
        visibility: { const: "controlled" },
        declarationId: { $ref: "#/$defs/nonEmptyString" },
        sourceDocumentId: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        resourceRootId: { $ref: "#/$defs/rootId" },
        catalog: {
          type: "array",
          items: {
            type: "object",
            required: ["resourceId", "locator"],
            additionalProperties: false,
            properties: { resourceId: { $ref: "#/$defs/resourceId" }, locator: { $ref: "#/$defs/locator" } }
          }
        },
        references: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            additionalProperties: false,
            properties: {
              id: { $ref: "#/$defs/nonEmptyString" },
              resource: { $ref: "#/$defs/resourceId" },
              src: { $ref: "#/$defs/locator" }
            },
            oneOf: [{ required: ["resource"] }, { required: ["src"] }]
          }
        }
      }
    },
    publicDiscovery: {
      type: "object",
      required: ["contract", "contractVersion", "kind", "visibility", "discoveryId", "declarationId", "sourceDocumentId", "profile", "profileVersion", "resourceRootId", "resourceIds", "bindings", "diagnosticCodes", "provenance", "privacy"],
      additionalProperties: false,
      properties: {
        contract: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT },
        contractVersion: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION },
        kind: { const: "public-discovery" },
        visibility: { const: "public" },
        discoveryId: { $ref: "#/$defs/nonEmptyString" },
        declarationId: { $ref: "#/$defs/nonEmptyString" },
        sourceDocumentId: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        resourceRootId: { $ref: "#/$defs/rootId" },
        resourceIds: { type: "array", items: { $ref: "#/$defs/resourceId" } },
        bindings: { type: "array", items: { $ref: "#/$defs/binding" } },
        diagnosticCodes: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        provenance: { $ref: "#/$defs/provenance" },
        privacy: { $ref: "#/$defs/privacy" }
      }
    },
    publicDiscoverySidecar: {
      type: "object",
      required: ["contract", "contractVersion", "kind", "visibility", "id", "discoveryId", "declarationId", "sourceDocumentId", "profile", "profileVersion", "resourceRootId", "resourceIds", "diagnosticCodes", "provenance", "privacy"],
      additionalProperties: false,
      properties: {
        contract: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT },
        contractVersion: { const: DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION },
        kind: { const: "public-discovery-sidecar" },
        visibility: { const: "public" },
        id: { $ref: "#/$defs/nonEmptyString" },
        discoveryId: { $ref: "#/$defs/nonEmptyString" },
        declarationId: { $ref: "#/$defs/nonEmptyString" },
        sourceDocumentId: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        resourceRootId: { $ref: "#/$defs/rootId" },
        resourceIds: { type: "array", items: { $ref: "#/$defs/resourceId" } },
        diagnosticCodes: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        provenance: { $ref: "#/$defs/provenance" },
        privacy: { $ref: "#/$defs/privacy" }
      }
    },
    binding: {
      type: "object",
      required: ["referenceId", "resourceId", "selectionKind"],
      additionalProperties: false,
      properties: {
        referenceId: { $ref: "#/$defs/nonEmptyString" },
        resourceId: { $ref: "#/$defs/resourceId" },
        selectionKind: { enum: ["catalog-resource", "catalog-src"] }
      }
    }
  }
} as const;

/**
 * Validate a logical resource-root identity without exposing or interpreting a filesystem root.
 *
 * 中文：校验 logical resource-root identity，不暴露或解释 filesystem root。
 */
export function isDocumentationLocaleResourceRootId(value: string): boolean {
  return isDocumentationLocaleResourceId(value);
}

function validatePublicDiscoveryShape(value: Record<string, unknown>): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  const requiredStrings = ["discoveryId", "declarationId", "sourceDocumentId", "profile", "profileVersion"];
  if (requiredStrings.some((key) => !isNonEmptyString(value[key]))) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_ID_INVALID", "DLR public discovery identity fields must be non-empty strings."));
  }
  const resourceRootId = typeof value.resourceRootId === "string" ? value.resourceRootId : "";
  if (!isDocumentationLocaleResourceRootId(resourceRootId)) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_ROOT_INVALID", "DLR public discovery resourceRootId must be a logical stable id."));
  }
  if (!isRecord(value.privacy) || value.privacy.allowRawLocator !== false || value.privacy.allowRanges !== false || value.privacy.allowResolvedText !== false || value.privacy.allowResourceBody !== false || value.privacy.allowSourceBody !== false) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DISCOVERY_PRIVACY_VIOLATION", "DLR public discovery privacy policy must deny every private payload class."));
  }
  if (!Array.isArray(value.resourceIds) || value.resourceIds.some((resourceId) => typeof resourceId !== "string" || !isDocumentationLocaleResourceId(resourceId))) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery resourceIds must be stable resource identities."));
  }
  if (!Array.isArray(value.diagnosticCodes) || value.diagnosticCodes.some((code) => !isNonEmptyString(code))) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery diagnosticCodes must be non-empty strings."));
  }
  if (!isRecord(value.provenance) || value.provenance.kind !== DOCUMENTATION_LOCALE_RESOURCE_DISCOVERY_PROVENANCE_KIND) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery provenance is invalid."));
  }
  if (value.kind === "public-discovery" && (!Array.isArray(value.bindings) || value.bindings.some((binding) => !isDiscoveryBinding(binding)))) {
    diagnostics.push(createDeclarationDiagnostic("DLR_DECLARATION_INVALID", "DLR public discovery bindings are invalid."));
  }
  return diagnostics;
}

function isDiscoveryBinding(value: unknown): value is DocumentationLocaleResourceDiscoveryBinding {
  return isRecord(value)
    && isNonEmptyString(value.referenceId)
    && typeof value.resourceId === "string"
    && isDocumentationLocaleResourceId(value.resourceId)
    && (value.selectionKind === "catalog-resource" || value.selectionKind === "catalog-src");
}

function containsDiscoveryPrivateField(value: unknown): boolean {
  const privateFields = new Set([
    "absolute", "body", "content", "credential", "digest", "locator", "path", "range", "rawlocator",
    "resolvedtext", "resourcebody", "sourcetext", "src", "text"
  ]);
  if (Array.isArray(value)) {
    return value.some(containsDiscoveryPrivateField);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => privateFields.has(key.toLowerCase()) || containsDiscoveryPrivateField(nested));
}

function createDiscoveryPrivacy(): DocumentationLocaleResourceDiscoveryPrivacy {
  return {
    allowRawLocator: false,
    allowRanges: false,
    allowResolvedText: false,
    allowResourceBody: false,
    allowSourceBody: false
  };
}

function createDeclarationDiagnostic(
  code: typeof DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_DIAGNOSTIC_CODE_REGISTRY[number]["code"],
  message: string,
  severity: HiaDiagnosticSeverity = "error"
): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity);
}

function isError(diagnostic: HiaDiagnostic): boolean {
  return diagnostic.severity === "error";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueDiagnosticCodes(diagnostics: readonly HiaDiagnostic[]): string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort((left, right) => left.localeCompare(right));
}
