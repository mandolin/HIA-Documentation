/**
 * @file
 * @lang zh-CN 文档化配置规范草案的结构检查、文件读取和注册表查询；不执行规则或自动迁移输入。
 * @lang en Structural checks, file loading and registry queries for documentation profile drafts; no rule execution or automatic input migration.
 */
import { readFile } from "node:fs/promises";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";
import { isProfileJsonDataGraph } from "./profile-json-data.js";
import { traverseProfileInheritance } from "./profile-graph.js";

/** @lang zh-CN 本运行时精确支持的草案wire版本，与单份profileVersion/包版本独立。 @lang en Exact draft wire version supported by this runtime, independent of individual profileVersion/package versions. */
export const HIA_PROFILE_SCHEMA_VERSION = "0.1.0-draft";
/** @lang zh-CN 语义分层闭集，不自动排序或建立继承优先级；常量应只读使用。 @lang en Closed semantic layers, without automatic ordering or inheritance precedence; treat the constant as read-only. */
export const HIA_PROFILE_LAYERS = ["stable", "compat", "bridge", "extension"] as const;
/** @lang zh-CN 标签生命周期闭集，alias状态要求目标引用；常量应只读使用。 @lang en Closed tag lifecycle states, with alias status requiring a target reference; treat the constant as read-only. */
export const HIA_PROFILE_TAG_STATUSES = ["stable", "alias", "deprecated", "reserved", "experimental"] as const;
/** @lang zh-CN 标签适用位置闭集，不代表解析器自动具备所有位置的实现。 @lang en Closed tag scopes, without implying that parsers implement every scope. */
export const HIA_PROFILE_TAG_SCOPES = ["block", "inline", "file", "region", "directive"] as const;
/** @lang zh-CN 声明诊断的严重度闭集，error用于阻止无效输入消费。 @lang en Closed declared diagnostic severities, with error used to block invalid-input consumption. */
export const HIA_PROFILE_DIAGNOSTIC_SEVERITIES = ["info", "warning", "error"] as const;
/** @lang zh-CN 草案schema的完整canonical身份，不是运行时网络抓取指令。 @lang en Complete canonical identity of the draft schema, not a runtime network-fetch instruction. */
export const HIA_PROFILE_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-0.1.0-draft.schema.json";

/** @lang zh-CN 2020-12结构定义，不裁决继承环/别名链等运行时语义；导出对象应只读使用，未在运行时冻结。 @lang en 2020-12 structural definition, excluding runtime semantics such as inheritance cycles/alias chains; treat this unfrozen exported object as read-only. */
export const HIA_PROFILE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROFILE_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "profileId", "profileVersion", "displayName", "layer", "extends", "contracts", "targets", "tags", "rules", "mappings", "diagnostics", "capabilities"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: HIA_PROFILE_SCHEMA_VERSION },
    profileId: {
      type: "string",
      pattern: "^[a-z0-9._-]+$"
    },
    profileVersion: { $ref: "#/$defs/nonEmptyString" },
    displayName: { $ref: "#/$defs/nonEmptyString" },
    layer: { enum: [...HIA_PROFILE_LAYERS] },
    extends: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    contracts: {
      type: "array",
      items: { $ref: "#/$defs/contractRef" }
    },
    targets: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    tags: {
      type: "array",
      items: { $ref: "#/$defs/tag" }
    },
    rules: {
      type: "array",
      items: { $ref: "#/$defs/rule" }
    },
    mappings: {
      type: "array",
      items: { $ref: "#/$defs/mapping" }
    },
    diagnostics: {
      type: "array",
      items: { $ref: "#/$defs/diagnostic" }
    },
    capabilities: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    stringList: {
      type: "array",
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    jsonObject: { type: "object" },
    contractRef: {
      type: "object",
      required: ["name"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" },
        role: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    tag: {
      type: "object",
      required: ["name", "status", "scope", "targets"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        status: { enum: [...HIA_PROFILE_TAG_STATUSES] },
        aliasFor: { $ref: "#/$defs/nonEmptyString" },
        scope: {
          type: "array",
          items: { enum: [...HIA_PROFILE_TAG_SCOPES] }
        },
        targets: { $ref: "#/$defs/stringList" },
        repeatable: { type: "boolean" },
        valueGrammar: { $ref: "#/$defs/nonEmptyString" },
        conflicts: { $ref: "#/$defs/stringList" },
        requires: { $ref: "#/$defs/stringList" },
        mapsTo: { $ref: "#/$defs/jsonObject" },
        diagnostics: { $ref: "#/$defs/stringList" },
        metadata: { $ref: "#/$defs/jsonObject" }
      }
    },
    rule: {
      type: "object",
      required: ["ruleId", "optionsSchema", "messages"],
      additionalProperties: true,
      properties: {
        ruleId: { $ref: "#/$defs/nonEmptyString" },
        category: { $ref: "#/$defs/nonEmptyString" },
        defaultSeverity: { enum: [...HIA_PROFILE_DIAGNOSTIC_SEVERITIES] },
        optionsSchema: { $ref: "#/$defs/jsonObject" },
        appliesTo: { $ref: "#/$defs/stringList" },
        messages: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        fixable: { type: "boolean" },
        hasSuggestions: { type: "boolean" },
        metadata: { $ref: "#/$defs/jsonObject" }
      }
    },
    mapping: {
      type: "object",
      required: ["from", "to"],
      additionalProperties: true,
      properties: {
        from: { $ref: "#/$defs/nonEmptyString" },
        to: { $ref: "#/$defs/nonEmptyString" },
        conditions: { $ref: "#/$defs/stringList" },
        confidence: { $ref: "#/$defs/nonEmptyString" },
        sourcePolicy: { $ref: "#/$defs/nonEmptyString" },
        metadataPolicy: { $ref: "#/$defs/nonEmptyString" },
        diagnostics: { $ref: "#/$defs/stringList" }
      }
    },
    diagnostic: {
      type: "object",
      required: ["code", "severity", "defaultMessage"],
      additionalProperties: true,
      properties: {
        code: { $ref: "#/$defs/nonEmptyString" },
        severity: { enum: [...HIA_PROFILE_DIAGNOSTIC_SEVERITIES] },
        messageKey: { $ref: "#/$defs/nonEmptyString" },
        defaultMessage: { $ref: "#/$defs/nonEmptyString" },
        target: { $ref: "#/$defs/nonEmptyString" },
        relatedLocations: {
          type: "array",
          items: {}
        },
        suggestions: { $ref: "#/$defs/stringList" }
      }
    }
  }
} as const;

/** @lang zh-CN 四种已声明语义层的字面类型。 @lang en Literal type of the four declared semantic layers. */
export type HiaProfileLayer = typeof HIA_PROFILE_LAYERS[number];
/** @lang zh-CN 已声明标签生命周期的字面类型。 @lang en Literal type of declared tag lifecycle states. */
export type HiaProfileTagStatus = typeof HIA_PROFILE_TAG_STATUSES[number];
/** @lang zh-CN 五类标签位置的字面类型。 @lang en Literal type of the five tag scopes. */
export type HiaProfileTagScope = typeof HIA_PROFILE_TAG_SCOPES[number];
/** @lang zh-CN 声明诊断的字面严重度类型。 @lang en Literal severity type for declared diagnostics. */
export type HiaProfileDiagnosticSeverity = typeof HIA_PROFILE_DIAGNOSTIC_SEVERITIES[number];
/** @lang zh-CN 兼容输入的开放对象视图，unknown值仍须经过普通JSON检查，不是有效JSON证明。 @lang en Open object view for compatible inputs; unknown values still require ordinary-JSON validation and are not proof of valid JSON. */
export type HiaProfileJsonObject = Record<string, unknown>;

/** @lang zh-CN 草案配置的兼容输入视图，宽string字段不代表通过版本/闭集校验；有效对象由调用者拥有。 @lang en Compatible draft input view; broad string fields do not prove version/closed-set validation, and valid objects remain caller-owned. */
export interface HiaDocumentationProfile {
  /** @lang zh-CN 精确wire身份；静态string保留旧输入兼容，runtime只接受当前草案。 @lang en Exact wire identity; static string retains legacy input compatibility, while runtime accepts only the current draft. */
  schemaVersion: string;
  /** @lang zh-CN 小写字母/数字/点/下划线/短横线身份，集合内唯一。 @lang en Identity using lowercase letters/digits/dot/underscore/hyphen, unique within a set. */
  profileId: string;
  /** @lang zh-CN 配置自身语义版本，非空文本，不由schema版本推导。 @lang en The profile's semantic version, nonempty text independent of schema version. */
  profileVersion: string;
  /** @lang zh-CN 展示名称，不作为注册表主键。 @lang en Display name, not a registry key. */
  displayName: string;
  /** @lang zh-CN 语义层，runtime检查四项闭集，不自动赋予排序或覆盖权。 @lang en Semantic layer, checked against four values at runtime without automatic ordering or override authority. */
  layer: HiaProfileLayer | string;
  /** @lang zh-CN 精确父身份列表，可为空；不自动读取文件或解析版本范围。 @lang en Exact parent identity list, possibly empty, without automatic file loading or version-range resolution. */
  extends: string[];
  /** @lang zh-CN 消费/产生的契约引用，仅检查外壳，不自动验证对应artifact。 @lang en Consumed/produced contract references, with envelope checks only and no automatic artifact validation. */
  contracts: HiaProfileContractRef[];
  /** @lang zh-CN 适用数据面文本列表。 @lang en List of applicable data-surface names. */
  targets: string[];
  /** @lang zh-CN 本地标签声明，继承查询不回写此数组。 @lang en Local tag declarations, never rewritten by inherited queries. */
  tags: HiaProfileTagDefinition[];
  /** @lang zh-CN 本地规则声明，不由此runtime执行。 @lang en Local rule declarations, not executed by this runtime. */
  rules: HiaProfileRuleDefinition[];
  /** @lang zh-CN 本地映射声明，不自动执行或深合并。 @lang en Local mapping declarations, without automatic execution or deep merging. */
  mappings: HiaProfileMappingDefinition[];
  /** @lang zh-CN 本地诊断声明，与校验过程产生的诊断数组不同。 @lang en Local diagnostic declarations, distinct from diagnostics emitted by validation. */
  diagnostics: HiaProfileDiagnosticDefinition[];
  /** @lang zh-CN 能力元数据普通JSON，不自动授予宿主能力或权限。 @lang en Ordinary-JSON capability metadata, without automatic host capabilities or permissions. */
  capabilities: HiaProfileJsonObject;
}

/** @lang zh-CN 契约名称与可选版本/角色的开放引用外壳，不解析版本范围或网络位置。 @lang en Open reference envelope containing contract name and optional version/role, without version-range or network resolution. */
export interface HiaProfileContractRef {
  name: string;
  version?: string;
  role?: string;
}

/** @lang zh-CN 本地标签外壳；aliasFor参与链解析，其它约束/映射正文保留给领域消费者。 @lang en Local tag envelope; aliasFor participates in chain resolution while other constraints/mapping content remain for domain consumers. */
export interface HiaProfileTagDefinition {
  name: string;
  status: HiaProfileTagStatus | string;
  aliasFor?: string;
  scope: string[];
  targets: string[];
  repeatable?: boolean;
  valueGrammar?: string;
  conflicts?: string[];
  requires?: string[];
  mapsTo?: HiaProfileJsonObject;
  diagnostics?: string[];
  metadata?: HiaProfileJsonObject;
}

/** @lang zh-CN 规则外壳；optionsSchema不在此执行，messages须含string default且其它值可为空string。 @lang en Rule envelope; optionsSchema is not executed here, and messages requires a string default while other values may be empty strings. */
export interface HiaProfileRuleDefinition {
  ruleId: string;
  category?: string;
  defaultSeverity?: HiaProfileDiagnosticSeverity | string;
  optionsSchema: HiaProfileJsonObject;
  appliesTo?: string[];
  messages: Record<string, string>;
  fixable?: boolean;
  hasSuggestions?: boolean;
  metadata?: HiaProfileJsonObject;
}

/** @lang zh-CN 映射文本与策略元数据，不构成可执行代码；diagnostics只检查声明引用。 @lang en Mapping text and policy metadata, not executable code; diagnostics only checks declaration references. */
export interface HiaProfileMappingDefinition {
  from: string;
  to: string;
  conditions?: string[];
  confidence?: string;
  sourcePolicy?: string;
  metadataPolicy?: string;
  diagnostics?: string[];
}

/** @lang zh-CN 可查询的诊断声明；relatedLocations保持任意普通JSON数组，不解释为文件读取授权。 @lang en Queryable diagnostic declaration; relatedLocations remains an arbitrary ordinary-JSON array and grants no file-reading permission. */
export interface HiaProfileDiagnosticDefinition {
  code: string;
  severity: HiaProfileDiagnosticSeverity | string;
  messageKey?: string;
  defaultMessage: string;
  target?: string;
  relatedLocations?: unknown[];
  suggestions?: string[];
}

/** @lang zh-CN 校验的调用者上下文；path原样加入字段定位，不是自动脱敏路径。 @lang en Caller context for validation; path is retained in field locations without automatic sanitization. */
export interface HiaProfileLoadOptions {
  path?: string;
}

/** @lang zh-CN 文件加载的兼容结果视图；先检查diagnostics，profile可能是原始非法对象或空占位，类型本身不是校验通过证明。 @lang en Compatible file-load result view; inspect diagnostics first, because profile may be an invalid raw object or empty placeholder and its type is not validation proof. */
export interface HiaLoadedProfile {
  profile: HiaDocumentationProfile;
  diagnostics: HiaDiagnostic[];
  path?: string;
}

/** @lang zh-CN 集合的静态配置列表输入；runtime仍防御非法容器/成员。 @lang en Static profile-list input for a set; runtime still defends against invalid containers/members. */
export interface HiaProfileSetInput {
  profiles: HiaDocumentationProfile[];
}

/** @lang zh-CN 新注册表及校验诊断；成员保留原引用，语义无效成员仍可检查元数据，使用期间须保持不变。 @lang en New registry and validation diagnostics; members retain original references, semantically invalid entries remain inspectable as metadata, and data must stay unchanged during use. */
export interface HiaProfileSet {
  profiles: Map<string, HiaDocumentationProfile>;
  diagnostics: HiaDiagnostic[];
}

/** @lang zh-CN 精确标签查询，includeAliases默认false；不自动猜测大小写、命名别名或版本。 @lang en Exact tag query, with includeAliases defaulting to false and no inference of case, naming aliases or versions. */
export interface HiaProfileTagQuery {
  profileId: string;
  tagName: string;
  includeAliases?: boolean;
}

/** @lang zh-CN 完整解析的原引用结果：profile是查询根，tag为起点，resolvedTag为终点；新aliasChain只含经过的别名、不含规范终点。 @lang en Original-reference result of complete resolution: profile is the query root, tag the starting point and resolvedTag the endpoint; the new aliasChain includes visited aliases but excludes the canonical endpoint. */
export interface HiaResolvedProfileTag {
  profile: HiaDocumentationProfile;
  tag: HiaProfileTagDefinition;
  resolvedTag: HiaProfileTagDefinition;
  aliasChain: string[];
}

/**
 * @lang zh-CN 读取UTF-8 JSON并校验，不改写文件、补默认值或升级版本。
 * @lang en Reads and validates UTF-8 JSON without rewriting files, adding defaults or upgrading versions.
 * @param filePath <lang><zh-CN>调用者提供的本地路径；原样保留在返回path和失败data.profilePath，公开前须由调用者处理。</zh-CN><en>Caller-supplied local path, retained verbatim in returned path and failure data.profilePath; callers must handle it before public disclosure.</en></lang>
 * @returns <lang><zh-CN>配置及诊断；读取/解析失败返回空的无效配置和固定READ_FAILED消息，不回显异常原文；不是文件系统沙箱。</zh-CN><en>Profile and diagnostics; read/parse failures return an empty invalid profile and a fixed READ_FAILED message without exception text; this is not a filesystem sandbox.</en></lang>
 */
export async function loadHiaProfileFromFile(filePath: string): Promise<HiaLoadedProfile> {
  try {
    // <lang><zh-CN>仅读取指定文件；校验实际解析值，避免用占位对象掩盖非对象根。</zh-CN><en>Read only the specified file and validate its actual parsed value so placeholders do not hide non-object roots.</en></lang>
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const profile = isRecord(parsed) ? parsed as unknown as HiaDocumentationProfile : createEmptyInvalidProfile();
    return {
      profile,
      diagnostics: validateHiaProfile(parsed, { path: filePath }),
      path: filePath
    };
  } catch {
    // <lang><zh-CN>解析异常可能包含源文件片段；固定消息与调用者上下文分开，不复制异常正文。</zh-CN><en>Parse errors may contain source excerpts; separate a fixed message from caller context without copying exception text.</en></lang>
    return {
      profile: createEmptyInvalidProfile(),
      diagnostics: [
        createProfileDiagnostic("HIA_PROFILE_READ_FAILED", "Profile could not be read or parsed as JSON.", "error", undefined, {
          profilePath: filePath
        })
      ],
      path: filePath
    };
  }
}

/**
 * @lang zh-CN 纯检查草案身份、普通JSON和声明字段，保留开放扩展；不检查完整继承/别名图或执行optionsSchema。
 * @lang en Purely checks draft identity, ordinary JSON and declared fields while retaining open extensions; does not check complete inheritance/alias graphs or execute optionsSchema.
 * @param value <lang><zh-CN>未知输入；拒绝非JSON、环、访问器、隐藏数据和非普通对象；不修改或复制有效配置。</zh-CN><en>Unknown input; rejects non-JSON values, cycles, accessors, hidden data and non-ordinary objects; does not mutate or copy valid profiles.</en></lang>
 * @param options <lang><zh-CN>可选的调用者路径前缀，原样进入字段定位；不是脱敏结果。</zh-CN><en>Optional caller path prefix, retained in field locations; it is not a sanitized result.</en></lang>
 * @returns <lang><zh-CN>空数组表示本检查范围通过；反射异常转为INVALID且不回显原文。Proxy反射副作用不受沙箱保护。</zh-CN><en>An empty array means these checks pass; reflection failures become INVALID without exception text. Proxy reflection side effects are not sandboxed.</en></lang>
 */
export function validateHiaProfile(value: unknown, options: HiaProfileLoadOptions = {}): HiaDiagnostic[] {
  try {
    // <lang><zh-CN>在读取任何领域字段前检查JSON图，防止getter执行和非JSON对象混入注册表。</zh-CN><en>Check the JSON graph before reading domain fields, preventing getter execution and non-JSON objects from entering registries.</en></lang>
    if (isProfileJsonDataGraph(value) && isRecord(value)) return validateProfileFields(value, options);
  } catch {
    // <lang><zh-CN>恶意Proxy可在多次反射间变更行为；异常统一收敛，不回显私有异常信息。</zh-CN><en>Hostile proxies may change behavior across reflections; collapse exceptions without exposing private error information.</en></lang>
  }
  return [createProfileDiagnostic("HIA_PROFILE_INVALID", "Documentation profile must be an ordinary JSON object.", "error")];
}

/** @lang zh-CN 对预检后的记录执行既有schema字段及局部语义检查。 @lang en Applies existing schema field and local semantic checks to a preflighted record. */
function validateProfileFields(value: Record<string, unknown>, options: HiaProfileLoadOptions): HiaDiagnostic[] {
  // <lang><zh-CN>诊断仅在本次调用内累积；路径前缀属于调用者可信上下文。</zh-CN><en>Accumulate diagnostics for this call only; the path prefix is trusted caller context.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  const targetPrefix = options.path;

  if (!isRecord(value)) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_INVALID", "Documentation profile must be a JSON object.", "error", targetPrefix));
    return diagnostics;
  }

  validateRequiredString(value, "schemaVersion", diagnostics, targetPrefix);
  validateRequiredString(value, "profileId", diagnostics, targetPrefix);
  validateRequiredString(value, "profileVersion", diagnostics, targetPrefix);
  validateRequiredString(value, "displayName", diagnostics, targetPrefix);
  validateRequiredArray(value, "extends", diagnostics, targetPrefix);
  validateRequiredArray(value, "contracts", diagnostics, targetPrefix);
  validateRequiredArray(value, "targets", diagnostics, targetPrefix);
  validateRequiredArray(value, "tags", diagnostics, targetPrefix);
  validateRequiredArray(value, "rules", diagnostics, targetPrefix);
  validateRequiredArray(value, "mappings", diagnostics, targetPrefix);
  validateRequiredArray(value, "diagnostics", diagnostics, targetPrefix);
  validateStringList(value.extends, diagnostics, joinTarget(targetPrefix, "extends"));
  validateStringList(value.targets, diagnostics, joinTarget(targetPrefix, "targets"));
  validateProfileContracts(value.contracts, diagnostics, targetPrefix);

  if (typeof value.schemaVersion === "string" && value.schemaVersion !== HIA_PROFILE_SCHEMA_VERSION) {
    diagnostics.push(createProfileDiagnostic(
      "HIA_PROFILE_SCHEMA_UNSUPPORTED",
      "Unsupported documentation profile schemaVersion.",
      "error",
      joinTarget(targetPrefix, "schemaVersion")
    ));
  }

  if (typeof value.profileId === "string" && !/^[a-z0-9._-]+$/.test(value.profileId)) {
    diagnostics.push(createProfileDiagnostic(
      "HIA_PROFILE_ID_INVALID",
      "Documentation profile id contains unsupported characters.",
      "error",
      joinTarget(targetPrefix, "profileId")
    ));
  }

  validateRequiredEnum(value, "layer", HIA_PROFILE_LAYERS, diagnostics, targetPrefix);

  if (!isRecord(value.capabilities)) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "capabilities must be an object.", "error", joinTarget(targetPrefix, "capabilities")));
  }

  validateProfileTags(value.tags, diagnostics, targetPrefix);
  validateProfileRules(value.rules, diagnostics, targetPrefix);
  validateProfileMappings(value.mappings, diagnostics, targetPrefix);
  validateProfileDiagnostics(value.diagnostics, diagnostics, targetPrefix);

  return diagnostics;
}

/**
 * @lang zh-CN 仅注册结构有效的配置并检查已知引用；无效成员留诊断但不占用身份，首个有效同名项优先。
 * @lang en Registers structurally valid profiles and checks known references; invalid members retain diagnostics without reserving IDs, and the first valid duplicate wins.
 * @param input <lang><zh-CN>自有数据profiles稠密数组；配置与查询结果保持调用者原引用，不冻结或深拷贝。</zh-CN><en>Own-data dense profiles array; profiles and query results retain caller references without freezing or deep copies.</en></lang>
 * @returns <lang><zh-CN>新Map与诊断；非法容器返回空Map及SET_INVALID，继承环/失效别名有错误诊断。层不自动排序；多父冲突优先级仍待定案。</zh-CN><en>A new Map and diagnostics; invalid containers return an empty Map with SET_INVALID, and inheritance cycles/invalid aliases have error diagnostics. Layers are not automatically sorted; multi-parent collision precedence awaits a decision.</en></lang>
 */
export function createHiaProfileSet(input: HiaProfileSetInput): HiaProfileSet {
  // <lang><zh-CN>注册表属于本次集合，成员所有权仍属于调用者；先快照容器描述符，避免迭代器/getter执行。</zh-CN><en>The registry belongs to this set, while members remain caller-owned; snapshot container descriptors first to avoid iterator/getter execution.</en></lang>
  const profiles = new Map<string, HiaDocumentationProfile>();
  const diagnostics: HiaDiagnostic[] = [];
  const candidates = readProfileCandidates(input);
  if (!candidates) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_SET_INVALID", "Profile set must contain an own-data dense profiles array.", "error"));
    return { profiles, diagnostics };
  }

  for (const candidate of candidates) {
    // <lang><zh-CN>先检查每个未知成员，再读取身份和遍历字段；非法项不能阻断其它有效项。</zh-CN><en>Validate each unknown member before reading identity or traversing fields; invalid entries cannot block valid peers.</en></lang>
    const profileDiagnostics = validateHiaProfile(candidate);
    diagnostics.push(...profileDiagnostics);
    if (hasProfileErrors(profileDiagnostics)) continue;
    const profile = candidate as HiaDocumentationProfile;

    if (profile.profileId && profiles.has(profile.profileId)) {
      diagnostics.push(createProfileDiagnostic(
        "HIA_PROFILE_DUPLICATE_ID",
        `Duplicate documentation profile id: ${profile.profileId}.`,
        "error",
        profile.profileId
      ));
      continue;
    }

    if (profile.profileId) {
      profiles.set(profile.profileId, profile);
    }
  }

  // <lang><zh-CN>一次全图迭代检查识别每条祖先回边，避免把共享祖先误报为环或对深图递归溢出。</zh-CN><en>A single iterative graph check identifies ancestor back edges without misclassifying shared ancestors or overflowing on deep graphs.</en></lang>
  const inheritance = traverseProfileInheritance(profiles, profiles.values());
  for (const cycle of inheritance.cycles) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_EXTENDS_CYCLE", "Documentation profile inheritance contains a cycle.", "error", `${cycle.profileId}.extends.${cycle.parentIndex}`, { profileId: cycle.profileId, cycleProfileIds: cycle.profileIds }));
  }

  for (const profile of profiles.values()) {
    for (const parentId of profile.extends) {
      if (!profiles.has(parentId)) {
        diagnostics.push(createProfileDiagnostic(
          "HIA_PROFILE_EXTENDS_UNKNOWN",
          `Documentation profile "${profile.profileId}" extends unknown profile "${parentId}".`,
          "error",
          profile.profileId,
          { profileId: profile.profileId, parentId }
        ));
      }
    }

    diagnostics.push(...validateProfileReferences(profile, profiles));
  }

  return {
    profiles,
    diagnostics
  };
}

/** @lang zh-CN 判断是否存在error严重度；warning/info不会单独阻止消费。 @lang en Checks for error severity; warning/info alone do not block consumption. */
export function hasProfileErrors(diagnostics: readonly HiaDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

/** @lang zh-CN 读取注册表元数据原引用，即使有语义错误也可检查；未知身份返回undefined，不代表配置已通过语义验收。 @lang en Reads registry metadata by original reference, including entries with semantic errors; unknown identities return undefined, and retrieval does not prove semantic acceptance. */
export function getHiaProfile(profileSet: HiaProfileSet, profileId: string): HiaDocumentationProfile | undefined {
  return profileSet.profiles.get(profileId);
}

/** @lang zh-CN 返回排序后的身份新数组，不改变Map顺序或根据layer筛选。 @lang en Returns a new sorted identity array without changing Map order or filtering by layer. */
export function listHiaProfileIds(profileSet: HiaProfileSet): string[] {
  return [...profileSet.profiles.keys()].sort();
}

/**
 * @lang zh-CN 返回按标签名排序的新数组，成员保持原引用；默认只检查本地定义，含继承时有环返回空数组。
 * @lang en Returns a new name-sorted array retaining original member references; defaults to local definitions, while inherited queries return an empty array on cycles.
 * @param profileSet <lang><zh-CN>调用者不得在查询中修改的已接纳集合。</zh-CN><en>An admitted set that callers must not mutate during the query.</en></lang>
 * @param profileId <lang><zh-CN>精确身份；未知身份返回空数组。</zh-CN><en>Exact identity; unknown identities return an empty array.</en></lang>
 * @param options <lang><zh-CN>includeInherited默认false；本地元数据可在环诊断后继续检查。</zh-CN><en>includeInherited defaults to false; local metadata remains inspectable after cycle diagnostics.</en></lang>
 */
export function listHiaProfileTags(profileSet: HiaProfileSet, profileId: string, options: { includeInherited?: boolean } = {}): HiaProfileTagDefinition[] {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return [];
  }

  const tags = options.includeInherited
    ? collectInheritedTags(profile, profileSet.profiles)
    : [...profile.tags];

  return tags.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @lang zh-CN 在有限无环继承图中解析标签与别名；失效或循环链不返回伪成功。
 * @lang en Resolves tags and aliases in finite acyclic inheritance graphs without returning false success for invalid or cyclic chains.
 * @param profileSet <lang><zh-CN>成员保持原引用，使用期间须保持不变。</zh-CN><en>Members retain original references and must remain unchanged during use.</en></lang>
 * @param query <lang><zh-CN>精确配置/标签名；includeAliases默认false，只有true才允许返回有效别名解析。</zh-CN><en>Exact profile/tag names; includeAliases defaults to false and must be true to return a valid alias resolution.</en></lang>
 * @returns <lang><zh-CN>原始配置/标签/最终标签与新aliasChain；未知、缺失目标、继承环或别名环返回undefined，不修改输入。</zh-CN><en>Original profile/tag/final-tag references and a new aliasChain; unknown entries, missing targets, inheritance cycles or alias cycles return undefined without mutations.</en></lang>
 */
export function resolveHiaProfileTag(profileSet: HiaProfileSet, query: HiaProfileTagQuery): HiaResolvedProfileTag | undefined {
  const profile = getHiaProfile(profileSet, query.profileId);
  if (!profile) {
    return undefined;
  }

  // <lang><zh-CN>本次查询只建立一次可达标签索引，避免别名每跳重新遍历深图。</zh-CN><en>Build a reachable-tag index once per query instead of traversing the deep graph on every alias hop.</en></lang>
  const tags = indexProfileTags(profile, profileSet.profiles);
  const tag = tags?.get(query.tagName);
  if (!tag) {
    return undefined;
  }

  // <lang><zh-CN>解析结果携带失效原因；查询只返回完整终止链，错误由集合诊断面报告。</zh-CN><en>The resolution carries failure reasons; queries return only fully terminating chains while set diagnostics report errors.</en></lang>
  const resolution = resolveProfileAlias(tags!, tag);
  if (resolution.failure) return undefined;
  const { aliasChain, resolvedTag } = resolution;

  if (!query.includeAliases && aliasChain.length > 0) {
    return undefined;
  }

  return {
    profile,
    tag,
    resolvedTag,
    aliasChain
  };
}

/** @lang zh-CN 返回继承规则原引用；未知配置/规则或可达继承环返回undefined，不执行规则。 @lang en Returns an inherited rule by original reference; unknown profiles/rules or reachable inheritance cycles return undefined without executing rules. */
export function getHiaProfileRule(profileSet: HiaProfileSet, profileId: string, ruleId: string): HiaProfileRuleDefinition | undefined {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return undefined;
  }
  return collectInheritedRules(profile, profileSet.profiles).find((rule) => rule.ruleId === ruleId);
}

/** @lang zh-CN 返回继承诊断声明原引用；未知配置/代码或可达继承环返回undefined，不生成用户诊断。 @lang en Returns an inherited diagnostic declaration by original reference; unknown profiles/codes or reachable inheritance cycles return undefined without generating user diagnostics. */
export function getHiaProfileDiagnostic(profileSet: HiaProfileSet, profileId: string, code: string): HiaProfileDiagnosticDefinition | undefined {
  const profile = getHiaProfile(profileSet, profileId);
  if (!profile) {
    return undefined;
  }
  return collectInheritedDiagnostics(profile, profileSet.profiles).find((diagnostic) => diagnostic.code === code);
}

/** @lang zh-CN 校验标签声明及可选字段，保持原重复/alias缺失诊断。 @lang en Checks tag declarations and optional fields, retaining duplicate and missing-alias diagnostics. */
function validateProfileTags(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  // <lang><zh-CN>名称仅用于本配置内去重，不重命名或归一化用户标签。</zh-CN><en>Names are used only for deduplication within this profile, without renaming or normalizing user tags.</en></lang>
  const names = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `tags.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_TAG_INVALID", "Profile tag entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "name", diagnostics, target);
    validateRequiredEnum(item, "status", HIA_PROFILE_TAG_STATUSES, diagnostics, target);
    validateRequiredArray(item, "scope", diagnostics, target);
    validateRequiredArray(item, "targets", diagnostics, target);
    validateStringList(item.scope, diagnostics, joinTarget(target, "scope"), HIA_PROFILE_TAG_SCOPES);
    validateStringList(item.targets, diagnostics, joinTarget(target, "targets"));
    validateOptionalFields(item, diagnostics, target, {
      strings: ["aliasFor", "valueGrammar"], lists: ["conflicts", "requires", "diagnostics"],
      objects: ["mapsTo", "metadata"], booleans: ["repeatable"]
    });

    if (typeof item.name === "string") {
      if (names.has(item.name)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_TAG_DUPLICATE", `Duplicate profile tag: ${item.name}.`, "error", joinTarget(target, "name")));
      }
      names.add(item.name);
    }

    if (item.status === "alias" && typeof item.aliasFor !== "string") {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_ALIAS_TARGET_MISSING", `Alias tag "${String(item.name)}" must define aliasFor.`, "error", joinTarget(target, "aliasFor")));
    }
  });
}

/** @lang zh-CN 校验规则外壳和消息字典，不执行规则或解析optionsSchema正文。 @lang en Checks rule envelopes and message dictionaries without executing rules or interpreting optionsSchema. */
function validateProfileRules(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  // <lang><zh-CN>规则身份在单份配置内唯一；跨配置的既有继承逻辑保持。</zh-CN><en>Rule identities are unique within one profile; existing cross-profile inheritance behavior remains.</en></lang>
  const ids = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `rules.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_INVALID", "Profile rule entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "ruleId", diagnostics, target);
    validateRequiredObject(item, "optionsSchema", diagnostics, target);
    validateRequiredObject(item, "messages", diagnostics, target);
    validateOptionalFields(item, diagnostics, target, {
      strings: ["category"], lists: ["appliesTo"], objects: ["metadata"],
      booleans: ["fixable", "hasSuggestions"], enums: { defaultSeverity: HIA_PROFILE_DIAGNOSTIC_SEVERITIES }
    });
    // <lang><zh-CN>所有本地化值均须为string，允许空文本；错误定位父字段，不回显动态语言键。</zh-CN><en>Every localized value must be a string, including empty text; locate errors at the parent field without echoing dynamic locale keys.</en></lang>
    if (isRecord(item.messages) && Object.values(item.messages).some((message) => typeof message !== "string")) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "Rule message values must be strings.", "error", joinTarget(target, "messages")));
    }

    if (typeof item.ruleId === "string") {
      if (ids.has(item.ruleId)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_DUPLICATE", `Duplicate profile rule: ${item.ruleId}.`, "error", joinTarget(target, "ruleId")));
      }
      ids.add(item.ruleId);
    }

    if (isRecord(item.messages) && typeof item.messages.default !== "string") {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_RULE_MESSAGE_MISSING", `Rule "${String(item.ruleId)}" must define messages.default.`, "error", joinTarget(target, "messages.default")));
    }
  });
}

/** @lang zh-CN 校验映射字段形状，不将映射正文当成可执行策略。 @lang en Checks mapping field shapes without treating mapping content as executable policy. */
function validateProfileMappings(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `mappings.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_MAPPING_INVALID", "Profile mapping entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "from", diagnostics, target);
    validateRequiredString(item, "to", diagnostics, target);
    validateOptionalFields(item, diagnostics, target, {
      strings: ["confidence", "sourcePolicy", "metadataPolicy"], lists: ["conditions", "diagnostics"]
    });
  });
}

/** @lang zh-CN 校验声明诊断的字段及唯一身份；relatedLocations只要求JSON数组。 @lang en Checks declared diagnostic fields and unique identities; relatedLocations only requires a JSON array. */
function validateProfileDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], targetPrefix?: string): void {
  if (!Array.isArray(value)) {
    return;
  }

  // <lang><zh-CN>只在本配置内追踪诊断代码，不改变既有继承覆盖语义。</zh-CN><en>Track diagnostic codes within this profile only, without changing existing inheritance override semantics.</en></lang>
  const codes = new Set<string>();

  value.forEach((item, index) => {
    const target = joinTarget(targetPrefix, `diagnostics.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_DIAGNOSTIC_INVALID", "Profile diagnostic entry must be an object.", "error", target));
      return;
    }

    validateRequiredString(item, "code", diagnostics, target);
    validateRequiredString(item, "defaultMessage", diagnostics, target);
    validateRequiredEnum(item, "severity", HIA_PROFILE_DIAGNOSTIC_SEVERITIES, diagnostics, target);
    validateOptionalFields(item, diagnostics, target, { strings: ["messageKey", "target"], lists: ["suggestions"] });
    if (Object.hasOwn(item, "relatedLocations")) validateRequiredArray(item, "relatedLocations", diagnostics, target);

    if (typeof item.code === "string") {
      if (codes.has(item.code)) {
        diagnostics.push(createProfileDiagnostic("HIA_PROFILE_DIAGNOSTIC_DUPLICATE", `Duplicate profile diagnostic: ${item.code}.`, "error", joinTarget(target, "code")));
      }
      codes.add(item.code);
    }
  });
}

/** @lang zh-CN 校验合同引用外壳，保留开放扩展与版本文本的领域独立性。 @lang en Checks contract-reference envelopes while preserving open extensions and independent domain version text. */
function validateProfileContracts(value: unknown, diagnostics: HiaDiagnostic[], prefix?: string): void {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    // <lang><zh-CN>稳定数字索引定位条目，不将合同名称作为错误路径。</zh-CN><en>Locate entries by stable numeric indices rather than contract names.</en></lang>
    const target = joinTarget(prefix, `contracts.${index}`);
    if (!isRecord(item)) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "Contract reference must be an object.", "error", target));
      return;
    }
    validateRequiredString(item, "name", diagnostics, target);
    validateOptionalFields(item, diagnostics, target, { strings: ["version", "role"] });
  });
}

/** @lang zh-CN 检查schema既有文本数组；空数组有效，scope等字段可附带闭集。 @lang en Checks existing schema string lists; empty arrays are valid, with optional closed sets for fields such as scope. */
function validateStringList(value: unknown, diagnostics: HiaDiagnostic[], target: string, allowed?: readonly string[]): void {
  if (!Array.isArray(value)) {
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "Field must be an array.", "error", target));
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.length === 0 || (allowed && !allowed.includes(item))) {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "List item must be an allowed non-empty string.", "error", `${target}.${index}`));
    }
  });
}

/** @lang zh-CN 批量检查已声明可选字段，缺省不补值；开放扩展由JSON预检覆盖。 @lang en Checks declared optional fields without filling defaults; JSON preflight covers open extensions. */
function validateOptionalFields(
  record: Record<string, unknown>, diagnostics: HiaDiagnostic[], prefix: string,
  fields: { strings?: readonly string[]; lists?: readonly string[]; objects?: readonly string[]; booleans?: readonly string[]; enums?: Record<string, readonly string[]> }
): void {
  for (const field of fields.strings ?? []) if (Object.hasOwn(record, field)) validateRequiredString(record, field, diagnostics, prefix);
  for (const field of fields.lists ?? []) if (Object.hasOwn(record, field)) validateStringList(record[field], diagnostics, joinTarget(prefix, field));
  for (const field of fields.objects ?? []) if (Object.hasOwn(record, field)) validateRequiredObject(record, field, diagnostics, prefix);
  for (const field of fields.booleans ?? []) {
    if (Object.hasOwn(record, field) && typeof record[field] !== "boolean") {
      diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", "Field must be a boolean.", "error", joinTarget(prefix, field)));
    }
  }
  for (const [field, allowed] of Object.entries(fields.enums ?? {})) if (Object.hasOwn(record, field)) validateRequiredEnum(record, field, allowed, diagnostics, prefix);
}

/** @lang zh-CN 快照集合容器的数据成员，拒绝getter/空洞且不调用自定义迭代方法；不预判成员有效性。 @lang en Snapshots data members of set containers, rejecting getters/holes and avoiding custom iterators without prejudging member validity. */
function readProfileCandidates(input: unknown): unknown[] | undefined {
  try {
    if (!isRecord(input)) return undefined;
    // <lang><zh-CN>容器只接受普通/null原型记录，自有可枚举数据profiles属性才能充当输入。</zh-CN><en>Accept only ordinary/null-prototype containers with an own enumerable data profiles property.</en></lang>
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    const property = Object.getOwnPropertyDescriptor(input, "profiles");
    if (!property?.enumerable || !Object.hasOwn(property, "value")) return undefined;
    const list: unknown = property.value;
    if (!Array.isArray(list) || Object.getPrototypeOf(list) !== Array.prototype) return undefined;
    // <lang><zh-CN>用描述符获取稠密数据索引，避免执行可被覆写的数组迭代器或元素访问器。</zh-CN><en>Read dense data indices through descriptors, avoiding overridable array iterators or item accessors.</en></lang>
    const descriptors = Object.getOwnPropertyDescriptors(list);
    if (Object.keys(descriptors).some((key) => key !== "length" && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= list.length))) return undefined;
    const result: unknown[] = [];
    for (let index = 0; index < list.length; index += 1) {
      const entry = descriptors[String(index)];
      if (!entry || !Object.hasOwn(entry, "value")) return undefined;
      result.push(entry.value);
    }
    return result;
  } catch {
    return undefined;
  }
}

/** @lang zh-CN 检查本地别名的完整终止链和既有映射引用；有继承环时避免派生伪结果/重复下游噪声。 @lang en Checks complete termination of local aliases and existing mapping references, avoiding false results and cascading noise when inheritance cycles exist. */
function validateProfileReferences(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): HiaDiagnostic[] {
  // <lang><zh-CN>无引用的配置不逐根遍历全图，使深层无别名配置集合仍保持线性接纳。</zh-CN><en>Profiles without references avoid per-root graph traversal, keeping admission linear for deep alias-free sets.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  const hasReferences = profile.tags.some((tag) => tag.aliasFor) || profile.mappings.some((mapping) => mapping.diagnostics?.length);
  if (!hasReferences) return diagnostics;
  const tags = indexProfileTags(profile, profiles);
  if (!tags) return diagnostics;

  for (const [index, tag] of profile.tags.entries()) {
    if (!tag.aliasFor) continue;
    // <lang><zh-CN>同一解析函数供公开查询和诊断复用，缺失终点/环均不能停在中间标签后冒充成功。</zh-CN><en>Queries and diagnostics share one resolver so missing endpoints/cycles cannot stop at intermediate tags and masquerade as success.</en></lang>
    const resolution = resolveProfileAlias(tags, tag);
    if (resolution.failure) {
      diagnostics.push(createProfileDiagnostic(
        resolution.failure === "cycle" ? "HIA_PROFILE_ALIAS_CYCLE" : "HIA_PROFILE_ALIAS_TARGET_UNKNOWN",
        resolution.failure === "cycle" ? "Profile alias chain contains a cycle." : "Profile alias chain points to an unknown tag.",
        "error",
        `${profile.profileId}.tags.${index}.aliasFor`,
        { profileId: profile.profileId, tagName: tag.name, aliasFor: tag.aliasFor, aliasChain: resolution.aliasChain }
      ));
    }
  }

  for (const mapping of profile.mappings) {
    for (const code of mapping.diagnostics ?? []) {
      if (!findDiagnosticInProfileTree(profile, profiles, code)) {
        diagnostics.push(createProfileDiagnostic(
          "HIA_PROFILE_MAPPING_DIAGNOSTIC_UNKNOWN",
          `Profile mapping references unknown diagnostic "${code}".`,
          "warning",
          `${profile.profileId}.mappings.${mapping.from}`,
          { profileId: profile.profileId, diagnosticCode: code }
        ));
      }
    }
  }

  return diagnostics;
}

/** @lang zh-CN 以原列表的后序/后声明覆盖规则收集标签，继承环返回空；优先级定案前不改现有列表选择。 @lang en Collects tags with the existing postorder/later-declaration list rule, returning empty on inheritance cycles without changing list selection before a precedence decision. */
function collectInheritedTags(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): HiaProfileTagDefinition[] {
  const traversal = traverseProfileInheritance(profiles, [profile]);
  return traversal.cycles.length ? [] : dedupeByName(traversal.postorder.flatMap((entry) => entry.tags));
}

/** @lang zh-CN 保持现有后序规则覆盖与原引用，使用显式栈处理深图/拒绝环。 @lang en Preserves existing postorder rule overrides and references, using an explicit stack for deep graphs and cycle rejection. */
function collectInheritedRules(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): HiaProfileRuleDefinition[] {
  const traversal = traverseProfileInheritance(profiles, [profile]);
  return traversal.cycles.length ? [] : dedupeById(traversal.postorder.flatMap((entry) => entry.rules), "ruleId");
}

/** @lang zh-CN 保持现有后序诊断覆盖与原引用，环不产生可消费的继承声明。 @lang en Preserves existing postorder diagnostic overrides and references, with cycles producing no consumable inherited declarations. */
function collectInheritedDiagnostics(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): HiaProfileDiagnosticDefinition[] {
  const traversal = traverseProfileInheritance(profiles, [profile]);
  return traversal.cycles.length ? [] : dedupeById(traversal.postorder.flatMap((entry) => entry.diagnostics), "code");
}

/** @lang zh-CN 查询侧先保持旧先序首命中规则，只解决终止性/环边界；待优先级确认后统一到列表。 @lang en Initially preserves the old preorder first-match lookup rule while fixing termination/cycles, pending confirmation before alignment with listing. */
function indexProfileTags(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>): Map<string, HiaProfileTagDefinition> | undefined {
  const traversal = traverseProfileInheritance(profiles, [profile]);
  if (traversal.cycles.length) return undefined;
  // <lang><zh-CN>Map按字面名称查询，constructor/__proto__等不命中Object原型。</zh-CN><en>Map looks up literal names so constructor/__proto__ cannot hit Object prototypes.</en></lang>
  const tags = new Map<string, HiaProfileTagDefinition>();
  for (const entry of traversal.preorder) {
    for (const tag of entry.tags) if (!tags.has(tag.name)) tags.set(tag.name, tag);
  }
  return tags;
}

/** @lang zh-CN 内部别名结果区分完整成功与失效原因，避免可选终点被误当有效解析。 @lang en Internal alias results distinguish complete success from failure reasons so an optional endpoint cannot be mistaken for valid resolution. */
type ProfileAliasResolution =
  | { failure?: undefined; aliasChain: string[]; resolvedTag: HiaProfileTagDefinition }
  | { failure: "cycle" | "missing"; aliasChain: string[] };

/** @lang zh-CN 迭代追踪有限别名链；每跳至多访问一次身份，不修改任何标签。 @lang en Iteratively follows finite alias chains, visiting each identity at most once without mutating tags. */
function resolveProfileAlias(tags: Map<string, HiaProfileTagDefinition>, start: HiaProfileTagDefinition): ProfileAliasResolution {
  // <lang><zh-CN>seen属于本次起点解析；链保存原始别名名，成功终点不计入aliasChain。</zh-CN><en>seen belongs to this starting-point resolution; the chain retains original alias names and excludes successful endpoints.</en></lang>
  const seen = new Set<string>();
  const aliasChain: string[] = [];
  let current = start;
  while (current.aliasFor) {
    if (seen.has(current.name)) return { failure: "cycle", aliasChain };
    seen.add(current.name);
    aliasChain.push(current.name);
    const next = tags.get(current.aliasFor);
    if (!next) return { failure: "missing", aliasChain };
    current = next;
  }
  return { aliasChain, resolvedTag: current };
}

/** @lang zh-CN 查询有效继承诊断视图，不把继承环当空父项继续合成。 @lang en Queries a valid inherited diagnostic view rather than treating cycles as empty parents and continuing composition. */
function findDiagnosticInProfileTree(profile: HiaDocumentationProfile, profiles: Map<string, HiaDocumentationProfile>, code: string): HiaProfileDiagnosticDefinition | undefined {
  return collectInheritedDiagnostics(profile, profiles).find((diagnostic) => diagnostic.code === code);
}

/** @lang zh-CN 检查非空文本，字段名仅来自固定schema而非用户动态键。 @lang en Checks nonempty text using fixed schema field names rather than user-defined keys. */
function validateRequiredString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = Object.hasOwn(record, field) ? record[field] : undefined;
  if (typeof value !== "string" || value.length === 0) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

/** @lang zh-CN 检查数组外壳；元素与最小长度由调用者的既有字段规则决定。 @lang en Checks array envelopes; item and minimum-length rules come from existing caller field rules. */
function validateRequiredArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = Object.hasOwn(record, field) ? record[field] : undefined;
  if (!Array.isArray(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
  }
}

/** @lang zh-CN 在JSON预检后区分对象与数组/标量。 @lang en Distinguishes objects from arrays/scalars after JSON preflight. */
function validateRequiredObject(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix?: string): void {
  const value = Object.hasOwn(record, field) ? record[field] : undefined;
  if (!isRecord(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be an object.`, "error", targetPath));
  }
}

/** @lang zh-CN 检查既有闭集，不插值被拒绝的用户值。 @lang en Checks existing closed sets without interpolating rejected user values. */
function validateRequiredEnum(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  diagnostics: HiaDiagnostic[],
  prefix?: string
): void {
  const value = Object.hasOwn(record, field) ? record[field] : undefined;
  if (typeof value !== "string" || !allowed.includes(value)) {
    const targetPath = joinTarget(prefix, field);
    diagnostics.push(createProfileDiagnostic("HIA_PROFILE_FIELD_INVALID", `${targetPath} must be one of: ${allowed.join(", ")}.`, "error", targetPath));
  }
}

function createProfileDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function createEmptyInvalidProfile(): HiaDocumentationProfile {
  return {
    schemaVersion: "",
    profileId: "",
    profileVersion: "",
    displayName: "",
    layer: "stable",
    extends: [],
    contracts: [],
    targets: [],
    tags: [],
    rules: [],
    mappings: [],
    diagnostics: [],
    capabilities: {}
  };
}

function joinTarget(prefix: string | undefined, field: string): string {
  return prefix ? `${prefix}.${field}` : field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const result = new Map<string, T>();
  for (const item of items) {
    result.set(item.name, item);
  }
  return [...result.values()];
}

function dedupeById<T extends Record<K, string>, K extends keyof T>(items: T[], key: K): T[] {
  const result = new Map<string, T>();
  for (const item of items) {
    result.set(item[key], item);
  }
  return [...result.values()];
}
