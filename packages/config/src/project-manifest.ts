/**
 * @file
 * @lang zh-CN 项目文档聚合清单的声明、schema与纯校验；不读取文件、加载生产器或授予发布权限。
 * @lang en Declarations, schema and pure validation for project documentation aggregation manifests; no file reads, producer loading or publication authorization.
 */
import path from "node:path";
import { isProjectManifestJsonDataGraph } from "./manifest-json-data.js";
import { createHiaDiagnostic } from "@hia-doc/core";
import type { HiaDiagnostic, HiaDiagnosticData, HiaDiagnosticSeverity } from "@hia-doc/core";

/** @lang zh-CN 当前源码清单定义版本候选，与配置包/系统正式发行身份独立。
 * @lang en Current source manifest-definition candidate, independent of config-package/system release identity.
 */
export const HIA_PROJECT_MANIFEST_SCHEMA_VERSION = "1.0.0";
/** @lang zh-CN 当前新根的固定schema身份；旧0.1.0-draft归档不会重定向为它。
 * @lang en Fixed schema identity for the new current root; the legacy 0.1.0-draft archive never redirects to it.
 */
export const HIA_PROJECT_MANIFEST_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.0.schema.json";
/** @lang zh-CN 静态artifact输入种类闭集，不触发源语言解析或自动发现生产器；运行时按只读约定使用。
 * @lang en Closed static-artifact input kinds, without source-language parsing or producer discovery; use the runtime collection as read-only.
 */
export const HIA_PROJECT_MANIFEST_INPUT_KINDS = ["hia-document", "jsdoc-integration", "htmdoc-extraction", "cssdoc-extraction", "doc-source-map", "documentation-producer-result"] as const;
/** @lang zh-CN 已支持的聚合领域标识，other保留通用投影；不从路径推断领域。
 * @lang en Supported aggregation-domain identifiers, with other retaining generic projection; domains are not inferred from paths.
 */
export const HIA_PROJECT_MANIFEST_DOMAINS = ["js", "css", "html", "dotnet", "powershell", "other"] as const;
/** @lang zh-CN 输入artifact选择策略；relations-only仅允许生产器结果输入，不授予关系编辑权限。
 * @lang en Input artifact-selection policies; relations-only applies only to producer-result inputs and grants no relation-edit permission.
 */
export const HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES = ["all", "relations-only"] as const;
/** @lang zh-CN 已确认的中性语义导航段种类；调用者不得修改共享常量数组。
 * @lang en Confirmed neutral semantic-navigation segment kinds; callers must not mutate the shared constant array.
 */
export const HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS = [
  "repository", "package", "layer", "contract", "operation", "project", "assembly", "namespace", "type"
] as const;

/** @lang zh-CN 静态输入kind闭集的类型投影，不代表已读取artifact。
 * @lang en Type projection of closed static input kinds, not proof that an artifact was read.
 */
export type HiaProjectManifestInputKind = typeof HIA_PROJECT_MANIFEST_INPUT_KINDS[number];
/** @lang zh-CN 支持的聚合领域类型，不扩展某个领域的抽取契约。
 * @lang en Supported aggregation-domain type, without extending a domain's extraction contract.
 */
export type HiaProjectManifestDomain = typeof HIA_PROJECT_MANIFEST_DOMAINS[number];
/** @lang zh-CN artifact选择类型，省略时由CLI沿用全部可消费产物规则。
 * @lang en Artifact-selection type; omission retains the CLI's all-consumable-artifacts behavior.
 */
export type HiaProjectManifestArtifactPolicy = typeof HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES[number];
/** @lang zh-CN 已确认的语义路径段kind，不承载文件系统路径。
 * @lang en Confirmed semantic-path segment kind, carrying no filesystem path.
 */
export type HiaProjectManifestSemanticPathKind = typeof HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS[number];
/** @lang zh-CN 两个准入的精确根版本，不协商未知patch/minor/预发行或build元数据。
 * @lang en The two admitted exact root versions, without negotiating unknown patches/minors/prereleases or build metadata.
 */
export type HiaProjectManifestSchemaVersion = typeof HIA_PROJECT_MANIFEST_SCHEMA_VERSION | "0.1.0-draft";

/** @lang zh-CN 未验证清单的宽松声明视图；required/JSON/路径及跨字段条件仍须纯守卫验证，数组与metadata不被克隆。
 * @lang en Loose declaration view of an unvalidated manifest; the pure guard still checks required/JSON/path/cross-field conditions without cloning arrays or metadata.
 */
export interface HiaProjectDocsManifest {
  /** @lang zh-CN 精确根版本，wire必填；省略不会自动补当前值。 @lang en Exact root version, required on the wire; omission does not insert the current value. */
  schemaVersion?: HiaProjectManifestSchemaVersion;
  /** @lang zh-CN wire必需的项目外壳，name须非空。 @lang en Project shell required on the wire, with a nonempty name. */
  project?: HiaProjectManifestProjectInfo;
  /** @lang zh-CN 显式生产器声明，出现时非空；仅CLI实际build才加载。 @lang en Explicit producer declarations, nonempty when present; only an actual CLI build loads them. */
  producers?: HiaProjectManifestProducerRef[];
  /** @lang zh-CN 可为空的引用/元信息列表，不自动加载远程profile。 @lang en Possibly empty reference/metadata list, without automatic remote-profile loading. */
  profiles?: HiaProjectManifestProfileRef[];
  /** @lang zh-CN 显式静态输入，出现时非空；与producers至少提供一条非空链。 @lang en Explicit static inputs, nonempty when present; at least one nonempty chain of inputs/producers is required. */
  inputs?: HiaProjectManifestInput[];
  /** @lang zh-CN 可选普通JSON对象，领域内容及隐私仍归调用者。 @lang en Optional ordinary JSON object; domain content and privacy remain caller responsibilities. */
  metadata?: Record<string, unknown>;
}

/** @lang zh-CN 项目公开身份及语言元信息，不建立版本路由或推断目录结构。
 * @lang en Public project identity and locale metadata, without version routing or directory-structure inference.
 */
export interface HiaProjectManifestProjectInfo {
  /** @lang zh-CN 可选非空公开ID，不默认生成。 @lang en Optional nonempty public ID, never generated by default. */
  id?: string;
  /** @lang zh-CN wire必填的非空项目名，不自动脱敏正文。 @lang en Nonempty project name required on the wire, without automatic prose redaction. */
  name?: string;
  /** @lang zh-CN 可选非空展示标题。 @lang en Optional nonempty display title. */
  title?: string;
  /** @lang zh-CN 可选默认内容语言，locales出现时必须包含它。 @lang en Optional default content locale, which must occur in locales when that list is present. */
  defaultLocale?: string;
  /** @lang zh-CN 可选非空语言列表，不在此规范化或去重。 @lang en Optional nonempty locale list, without canonicalization or deduplication here. */
  locales?: string[];
  /** @lang zh-CN 可选非空产品版本元信息，不改变清单schema或创建版本页面。 @lang en Optional nonempty product-version metadata, without changing the manifest schema or creating version pages. */
  productVersion?: string;
}

/** @lang zh-CN 可选的profile元信息/本地文件引用；无path时不读取文件，缺profileId的惰性条目不会被CLI自动补身份。
 * @lang en Optional profile metadata/local-file reference; omission of path reads no file, and the CLI never invents identities for inert entries without profileId.
 */
export interface HiaProjectManifestProfileRef {
  /** @lang zh-CN 可选非空profile身份；实际CLI消费引用应显式提供。 @lang en Optional nonempty profile identity; references intended for actual CLI consumption should provide it explicitly. */
  profileId?: string;
  /** @lang zh-CN 可选profile自身版本，不等于清单/包版本。 @lang en Optional profile's own version, distinct from manifest/package versions. */
  profileVersion?: string;
  /** @lang zh-CN 可选非空层元信息，具体支持由profile运行时决定。 @lang en Optional nonempty layer metadata; the profile runtime decides concrete support. */
  layer?: string;
  /** @lang zh-CN 可选清单目录相对路径，不可绝对、越界或使用控制字符。 @lang en Optional manifest-directory-relative path, without absolute/traversing/control-character locators. */
  path?: string;
}

/** @lang zh-CN 单个静态输入的profile引用；出现时profileId必填，不触发下载或继承求值。
 * @lang en Profile reference for one static input; profileId is required when present, without downloads or inheritance evaluation.
 */
export interface HiaProjectManifestInputProfileRef {
  /** @lang zh-CN 非空精确profile身份。 @lang en Nonempty exact profile identity. */
  profileId: string;
  /** @lang zh-CN 可选非空profile版本。 @lang en Optional nonempty profile version. */
  profileVersion?: string;
  /** @lang zh-CN 可选非空层元信息。 @lang en Optional nonempty layer metadata. */
  layer?: string;
}

/** @lang zh-CN 未验证静态artifact输入视图；kind的宽松string便于表示未知输入，守卫仍拒绝闭集外kind。
 * @lang en Unvalidated static-artifact input view; a loose string kind can represent unknown input, while the guard still rejects kinds outside the closed set.
 */
export interface HiaProjectManifestInput {
  /** @lang zh-CN wire必需输入kind，不直接解析源语言。 @lang en Input kind required on the wire, without direct source-language parsing. */
  kind?: HiaProjectManifestInputKind | string;
  /** @lang zh-CN wire必需artifact相对路径，基于清单目录。 @lang en Artifact-relative path required on the wire, based on the manifest directory. */
  path?: string;
  /** @lang zh-CN 可选领域标识，省略时消费者沿用既有kind推断。 @lang en Optional domain identifier; omission retains the consumer's existing kind-based inference. */
  domain?: HiaProjectManifestDomain;
  /** @lang zh-CN 可选显式输入profile引用。 @lang en Optional explicit input-profile reference. */
  profile?: HiaProjectManifestInputProfileRef;
  /** @lang zh-CN 可选源码相对根，声明不读取源码或授予发布。 @lang en Optional relative source root; declaration reads no source and grants no publication rights. */
  sourceRoot?: string;
  /** @lang zh-CN 可选产物策略；relations-only仅消费生产器结果的关系增强产物。 @lang en Optional artifact policy; relations-only consumes relation augmentation from producer results only. */
  artifactPolicy?: HiaProjectManifestArtifactPolicy;
  /** @lang zh-CN 可选非空owner-reviewed导航前缀，不从source/container路径猜测。 @lang en Optional nonempty owner-reviewed navigation prefix, never guessed from source/container paths. */
  semanticPath?: HiaProjectManifestSemanticPathSegment[];
}

/** @lang zh-CN 单个稳定公开语义段，字段闭集kind/id/label，不承载路径或私有扩展。
 * @lang en One stable public semantic segment with closed kind/id/label fields, carrying no path or private extensions.
 */
export interface HiaProjectManifestSemanticPathSegment {
  /** @lang zh-CN 已确认种类。 @lang en Confirmed kind. */
  kind: HiaProjectManifestSemanticPathKind;
  /** @lang zh-CN 1–128字符公开token，同一前缀内唯一。 @lang en Public token of 1–128 characters, unique within the prefix. */
  id: string;
  /** @lang zh-CN 最长160字符公开标签，拒绝路径/URI式值及控制字符。 @lang en Public label of at most 160 characters, rejecting path/URI-like values and controls. */
  label: string;
}

/** @lang zh-CN 显式生产器的领域输入；扩展保持普通JSON，名称以path/root/directory结尾者另受相对路径约束。
 * @lang en Domain input for an explicit producer; extensions remain ordinary JSON, with names ending in path/root/directory also constrained to relative paths.
 */
export interface HiaProjectManifestProducerInput {
  /** @lang zh-CN wire必需非空领域kind，不强行复用静态artifact闭集。 @lang en Nonempty domain kind required on the wire, without imposing the static-artifact kind set. */
  kind?: string;
  /** @lang zh-CN 可选非空语言元信息。 @lang en Optional nonempty language metadata. */
  language?: string;
  /** @lang zh-CN wire必需相对输入路径，基于生产器workspace。 @lang en Relative input path required on the wire, based on the producer workspace. */
  path?: string;
  /** @lang zh-CN 领域扩展，不因开放而免除JSON/路径检查。 @lang en Domain extensions, whose openness does not waive JSON/path checks. */
  [key: string]: unknown;
}

/** @lang zh-CN 生产器执行的显式声明，不自动安装模块或执行shell；实际权限由CLI执行边界和负责人授权决定。
 * @lang en Explicit producer-execution declaration, without automatic installation or shell execution; actual permissions remain with CLI execution boundaries and owner authorization.
 */
export interface HiaProjectManifestProducerRef {
  /** @lang zh-CN 可选非空导出名，省略时CLI沿用原模块选择顺序。 @lang en Optional nonempty export name; omission retains the CLI's existing module-selection order. */
  exportName?: string;
  /** @lang zh-CN 默认fail，warn沿用CLI既有结果严重度策略。 @lang en Defaults to fail; warn retains the CLI's existing result-severity policy. */
  failureMode?: "fail" | "warn";
  /** @lang zh-CN wire必需非空ID，同一清单内不得重复。 @lang en Nonempty ID required on the wire, unique within the manifest. */
  id?: string;
  /** @lang zh-CN wire必需非空领域输入数组。 @lang en Nonempty domain-input array required on the wire. */
  inputs?: HiaProjectManifestProducerInput[];
  /** @lang zh-CN wire必需本地模块相对路径，基于清单目录，不进行package发现。 @lang en Local-module relative path required on the wire, based on the manifest directory, without package discovery. */
  module?: string;
  /** @lang zh-CN 可选普通JSON选项对象，领域含义由生产器解释。 @lang en Optional ordinary-JSON options object whose domain semantics belong to the producer. */
  options?: Record<string, unknown>;
  /** @lang zh-CN 可选CLI输出目录内的相对目录，缺省由CLI按生产器ID建立。 @lang en Optional relative directory within CLI output; omission lets the CLI derive it from producer identity. */
  outputDirectory?: string;
  /** @lang zh-CN 出现时非空profile ID列表，不隐式加载profile文件。 @lang en Nonempty profile-ID list when present, without implicit profile-file loading. */
  profileIds?: string[];
  /** @lang zh-CN 可选清单相对workspace，允许点目录，缺省为清单目录。 @lang en Optional manifest-relative workspace allowing dot, defaulting to the manifest directory. */
  workspaceRoot?: string;
}

/** @lang zh-CN 诊断定位选项，缺省空；调用者负责前缀的公开范围，守卫不清洗调用者定位。
 * @lang en Diagnostic-location options, empty by default; callers own the prefix's publication scope, which the guard does not sanitize.
 */
export interface HiaProjectManifestValidationOptions {
  /** @lang zh-CN 可选诊断前缀，原样参与targetPath/path，不执行文件I/O。 @lang en Optional diagnostic prefix used unchanged in targetPath/path, without file I/O. */
  targetPath?: string;
}

/** @lang zh-CN 当前1.0.0新根的2020-12 schema，开放领域扩展、闭合语义导航段；旧固定定义另行归档。
 * @lang en 2020-12 schema for the current 1.0.0 root, with open domain extensions and closed semantic-navigation segments; the fixed legacy definition is archived separately.
 */
export const HIA_PROJECT_MANIFEST_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_PROJECT_MANIFEST_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "project"],
  additionalProperties: true,
  anyOf: [
    {
      required: ["inputs"],
      properties: {
        inputs: { type: "array", minItems: 1 }
      }
    },
    {
      required: ["producers"],
      properties: {
        producers: { type: "array", minItems: 1 }
      }
    }
  ],
  properties: {
    schemaVersion: { const: HIA_PROJECT_MANIFEST_SCHEMA_VERSION },
    project: { $ref: "#/$defs/project" },
    producers: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/producer" }
    },
    profiles: {
      type: "array",
      items: { $ref: "#/$defs/profileRef" }
    },
    inputs: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/input" }
    },
    metadata: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    safeRelativePath: {
      type: "string",
      minLength: 1,
      not: {
        anyOf: [
          { const: "." },
          { const: ".." },
          { pattern: "^(?:[\\\\/]|[A-Za-z][A-Za-z0-9+.-]*:)" },
          { pattern: "[\\u0000-\\u001F\\u007F]" },
          { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
        ]
      }
    },
    currentOrSafeRelativePath: {
      type: "string",
      minLength: 1,
      not: {
        anyOf: [
          { const: ".." },
          { pattern: "^(?:[\\\\/]|[A-Za-z][A-Za-z0-9+.-]*:)" },
          { pattern: "[\\u0000-\\u001F\\u007F]" },
          { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
        ]
      }
    },
    project: {
      type: "object",
      required: ["name"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        name: { $ref: "#/$defs/nonEmptyString" },
        title: { $ref: "#/$defs/nonEmptyString" },
        defaultLocale: { $ref: "#/$defs/nonEmptyString" },
        productVersion: { $ref: "#/$defs/nonEmptyString" },
        locales: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    profileRef: {
      type: "object",
      additionalProperties: true,
      properties: {
        profileId: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        layer: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    inputProfileRef: {
      type: "object",
      required: ["profileId"],
      additionalProperties: true,
      properties: {
        profileId: { $ref: "#/$defs/nonEmptyString" },
        profileVersion: { $ref: "#/$defs/nonEmptyString" },
        layer: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    producerInput: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        language: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" },
        applicationRoot: { $ref: "#/$defs/currentOrSafeRelativePath" },
        artifactBasePath: { $ref: "#/$defs/safeRelativePath" },
        hiaDocumentId: { $ref: "#/$defs/nonEmptyString" },
        title: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    producer: {
      type: "object",
      required: ["id", "module", "inputs"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        module: { $ref: "#/$defs/safeRelativePath" },
        exportName: { $ref: "#/$defs/nonEmptyString" },
        failureMode: { enum: ["fail", "warn"] },
        workspaceRoot: { $ref: "#/$defs/currentOrSafeRelativePath" },
        outputDirectory: { $ref: "#/$defs/safeRelativePath" },
        inputs: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/producerInput" }
        },
        options: { type: "object" },
        profileIds: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    input: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      // <lang><zh-CN>关系专用策略沿用既有runtime约束，只适用于生产器结果输入。</zh-CN><en>The relations-only policy retains the existing runtime restriction to producer-result inputs.</en></lang>
      allOf: [{
        if: { required: ["artifactPolicy"], properties: { artifactPolicy: { const: "relations-only" } } },
        then: { properties: { kind: { const: "documentation-producer-result" } } }
      }],
      properties: {
        kind: { enum: [...HIA_PROJECT_MANIFEST_INPUT_KINDS] },
        path: { $ref: "#/$defs/safeRelativePath" },
        domain: { enum: [...HIA_PROJECT_MANIFEST_DOMAINS] },
        profile: { $ref: "#/$defs/inputProfileRef" },
        sourceRoot: { $ref: "#/$defs/safeRelativePath" },
        artifactPolicy: { enum: [...HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES] },
        semanticPath: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/semanticPathSegment" }
        }
      }
    },
    semanticPathSegment: {
      type: "object",
      required: ["kind", "id", "label"],
      additionalProperties: false,
      properties: {
        kind: { enum: [...HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS] },
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$" },
        label: { type: "string", minLength: 1, maxLength: 160 }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 只读检查清单精确版本、已声明字段、JSON图、路径和既有语义；不归一化或迁移输入。
 * @lang en Read-only checks of exact versions, declared fields, JSON graphs, paths and existing semantics, without input normalization or migration.
 * @param value <lang><zh-CN>未知内存输入；循环、访问器或反射失败返回固定诊断，不执行模块或源文件I/O。</zh-CN><en>Unknown in-memory input; cycles/accessors/reflection failures return fixed diagnostics without module execution or source-file I/O.</en></lang>
 * @param options <lang><zh-CN>可信选项对象，默认空；targetPath原样用作调用者拥有的诊断前缀。</zh-CN><en>Trusted options object, empty by default; targetPath is a caller-owned diagnostic prefix used unchanged.</en></lang>
 * @returns <lang><zh-CN>新诊断数组，空表示本层有效；不证明文件存在、引用已解析、正文已脱敏或物理沙箱隔离。</zh-CN><en>New diagnostic array; empty means valid at this layer, without proof of file existence, resolved references, text redaction or physical sandbox isolation.</en></lang>
 */
export function validateHiaProjectManifest(value: unknown, options: HiaProjectManifestValidationOptions = {}): HiaDiagnostic[] {
  // <lang><zh-CN>结果和调用者前缀每次独立；前缀由调用者提供，不改变其文件定位语义。</zh-CN><en>Results and caller prefix are invocation-local; the caller supplies the prefix and retains its file-location semantics.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  const targetPrefix = options.targetPath;

  // <lang><zh-CN>进入属性/数组遍历前拒绝环、非JSON与访问器；未知键和异常正文不进入诊断。</zh-CN><en>Reject cycles, non-JSON data and accessors before property/array traversal; unknown keys and exception text stay out of diagnostics.</en></lang>
  if (!isProjectManifestJsonDataGraph(value)) {
    return [createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_INVALID", "Project docs manifest must contain ordinary finite acyclic JSON data.", "error", targetPrefix)];
  }
  if (!isRecord(value)) {
    return [
      createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_INVALID", "Project docs manifest must be a JSON object.", "error", targetPrefix)
    ];
  }

  if (!Object.hasOwn(value, "schemaVersion") || (value.schemaVersion !== HIA_PROJECT_MANIFEST_SCHEMA_VERSION && value.schemaVersion !== "0.1.0-draft")) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_SCHEMA_UNSUPPORTED",
      "Project docs manifest schemaVersion is unsupported; use an admitted exact version.",
      "error",
      joinTarget(targetPrefix, "schemaVersion")
    ));
  }

  if (!isRecord(value.project) || typeof value.project.name !== "string" || value.project.name.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.name must be a non-empty string.",
      "error",
      joinTarget(targetPrefix, "project.name")
    ));
  } else {
    validateOptionalString(value.project, "id", "project", targetPrefix, diagnostics);
    validateOptionalString(value.project, "title", "project", targetPrefix, diagnostics);
    validateProjectLocales(value.project, targetPrefix, diagnostics);
    if (value.project.productVersion !== undefined
      && (typeof value.project.productVersion !== "string" || value.project.productVersion.length === 0)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        "Project docs manifest project.productVersion must be a non-empty string when provided.",
        "error",
        joinTarget(targetPrefix, "project.productVersion")
      ));
    }
  }

  validateOptionalObject(value, "metadata", "", targetPrefix, diagnostics);
  // <lang><zh-CN>至少一条非空输入链，但已提供的另一条链也不能以空数组绕过声明约束。</zh-CN><en>At least one nonempty input chain is required, and the other chain cannot bypass declared constraints with a present empty array.</en></lang>
  const hasInputs = Array.isArray(value.inputs) && value.inputs.length > 0;
  const hasProducers = Array.isArray(value.producers) && value.producers.length > 0;

  if (!hasInputs && !hasProducers) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest must declare at least one input or producer.",
      "error",
      joinTarget(targetPrefix, "inputs")
    ));
  }

  validateManifestPathEntries(value.profiles, "profiles", targetPrefix, diagnostics);
  validateManifestPathEntries(value.inputs, "inputs", targetPrefix, diagnostics);
  validateProducerEntries(value.producers, targetPrefix, diagnostics);

  return diagnostics;
}

/**
 * 校验 project 级 locale 声明，防止 renderer 收到无法解析的语言模型。
 * Validates project-level locale declarations before the renderer receives an unresolved locale model.
 */
function validateProjectLocales(
  project: Record<string, unknown>,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  // <lang><zh-CN>语言声明只读，不借校验改写默认语言或列表顺序。</zh-CN><en>Locale declarations are read-only; validation never rewrites defaults or list order.</en></lang>
  const defaultLocale = project.defaultLocale;
  const locales = project.locales;

  if (defaultLocale !== undefined && (typeof defaultLocale !== "string" || defaultLocale.length === 0)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.defaultLocale must be a non-empty string when provided.",
      "error",
      joinTarget(targetPrefix, "project.defaultLocale")
    ));
  }

  if (locales !== undefined && (!Array.isArray(locales)
    || locales.length === 0
    || locales.some((locale) => typeof locale !== "string" || locale.length === 0))) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.locales must be a non-empty array of non-empty strings when provided.",
      "error",
      joinTarget(targetPrefix, "project.locales")
    ));
    return;
  }

  if (typeof defaultLocale === "string" && Array.isArray(locales) && !locales.includes(defaultLocale)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest project.defaultLocale must be included in project.locales.",
      "error",
      joinTarget(targetPrefix, "project.defaultLocale")
    ));
  }
}

/** @lang zh-CN 校验可选字符串，空串与其它类型都不能充当已声明token；不做格式/版本推断。
 * @lang en Validates optional strings; empty strings and other types cannot act as declared tokens, without format/version inference.
 */
function validateOptionalString(item: Record<string, unknown>, field: string, itemPath: string, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  // <lang><zh-CN>局部值不修改输入，位置由已知字段组成。</zh-CN><en>The local value never mutates input; locations contain known fields.</en></lang>
  const value = item[field];
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest optional field must be a non-empty string.", "error", joinTarget(targetPrefix, joinTarget(itemPath, field))));
  }
}

/** @lang zh-CN 校验已声明对象外壳，内部领域值只受普通JSON图约束。
 * @lang en Validates declared object shells; internal domain values receive ordinary-JSON graph constraints only.
 */
function validateOptionalObject(item: Record<string, unknown>, field: string, itemPath: string, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  const value = item[field];
  if (value !== undefined && !isRecord(value)) {
    diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest optional field must be an object.", "error", joinTarget(targetPrefix, joinTarget(itemPath, field))));
  }
}

/** @lang zh-CN 验证可选token列表；producer profileIds出现时非空，不排序/去重/补值。
 * @lang en Validates optional token lists; producer profileIds must be nonempty when present, without sorting/deduplication/default insertion.
 */
function validateOptionalStringList(value: unknown, itemPath: string, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[], nonempty: boolean): void {
  if (value !== undefined && (!Array.isArray(value) || (nonempty && value.length === 0) || value.some((item) => typeof item !== "string" || item.length === 0))) {
    diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest field must contain the declared non-empty string list.", "error", joinTarget(targetPrefix, itemPath)));
  }
}

/** @lang zh-CN 清单profile引用仅检查形状；顶层元信息可以省略，输入自己的profile引用须给profileId。
 * @lang en Checks manifest profile-reference shapes only; top-level metadata may be omitted, while an input's own reference requires profileId.
 */
function validateProfileReference(value: unknown, itemPath: string, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[], requireIdentity: boolean): void {
  if (!isRecord(value)) {
    diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest profile reference must be an object.", "error", joinTarget(targetPrefix, itemPath)));
    return;
  }
  if (requireIdentity) validateRequiredString(value, "profileId", itemPath, targetPrefix, diagnostics);
  else validateOptionalString(value, "profileId", itemPath, targetPrefix, diagnostics);
  for (const field of ["profileVersion", "layer"]) {
    validateOptionalString(value, field, itemPath, targetPrefix, diagnostics);
  }
}

/** @lang zh-CN 验证显式生产器声明及身份唯一性，保留领域kind/options，不加载模块。
 * @lang en Validates explicit producer declarations and identity uniqueness, retaining domain kinds/options without loading modules.
 */
function validateProducerEntries(value: unknown, targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest producers must be an array.",
      "error",
      joinTarget(targetPrefix, "producers")
    ));
    return;
  }

  if (value.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      "Project docs manifest producers must be a non-empty array when provided.",
      "error",
      joinTarget(targetPrefix, "producers")
    ));
    return;
  }

  // <lang><zh-CN>生产器身份属于本清单一次执行，重复ID会让结果/输出归属歧义，提前拒绝。</zh-CN><en>Producer identities belong to this manifest execution; duplicate IDs make result/output ownership ambiguous and are rejected before execution.</en></lang>
  const seenIds = new Set<string>();
  value.forEach((item, index) => {
    // <lang><zh-CN>公开诊断路径只含已知字段与数组序号，不包含生产器ID或原始路径值。</zh-CN><en>Public diagnostic paths contain only known fields and array indices, not producer IDs or original path values.</en></lang>
    const itemPath = `producers.${index}`;
    if (!isRecord(item)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath} must be an object.`,
        "error",
        joinTarget(targetPrefix, itemPath)
      ));
      return;
    }

    validateRequiredString(item, "id", itemPath, targetPrefix, diagnostics);
    if (typeof item.id === "string") {
      if (seenIds.has(item.id)) {
        diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Producer identities must be unique within one manifest.", "error", joinTarget(targetPrefix, `${itemPath}.id`)));
      }
      seenIds.add(item.id);
    }
    validateSafeOptionalPath(item, "module", itemPath, targetPrefix, diagnostics, true);
    validateSafeOptionalPath(item, "workspaceRoot", itemPath, targetPrefix, diagnostics, false, true);
    validateSafeOptionalPath(item, "outputDirectory", itemPath, targetPrefix, diagnostics, false);
    validateOptionalString(item, "exportName", itemPath, targetPrefix, diagnostics);
    validateOptionalObject(item, "options", itemPath, targetPrefix, diagnostics);
    validateOptionalStringList(item.profileIds, `${itemPath}.profileIds`, targetPrefix, diagnostics, true);

    if (item.failureMode !== undefined && item.failureMode !== "fail" && item.failureMode !== "warn") {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath}.failureMode must be "fail" or "warn".`,
        "error",
        joinTarget(targetPrefix, `${itemPath}.failureMode`)
      ));
    }

    if (!Array.isArray(item.inputs) || item.inputs.length === 0) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${itemPath}.inputs must be a non-empty array.`,
        "error",
        joinTarget(targetPrefix, `${itemPath}.inputs`)
      ));
      return;
    }

    item.inputs.forEach((input, inputIndex) => {
      const inputPath = `${itemPath}.inputs.${inputIndex}`;
      if (!isRecord(input)) {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${inputPath} must be an object.`,
          "error",
          joinTarget(targetPrefix, inputPath)
        ));
        return;
      }

      validateRequiredString(input, "kind", inputPath, targetPrefix, diagnostics);
      for (const field of ["language", "hiaDocumentId", "title"]) {
        validateOptionalString(input, field, inputPath, targetPrefix, diagnostics);
      }
      validateSafeOptionalPath(input, "path", inputPath, targetPrefix, diagnostics, true);
      validatePathLikeExtensionFields(input, inputPath, targetPrefix, diagnostics);
    });
  });
}

/** @lang zh-CN 只对既有路径后缀扩展施加词法约束，未知字段名不泄漏到公开诊断。
 * @lang en Applies lexical constraints to established path-suffix extensions without leaking unknown field names into public diagnostics.
 */
function validatePathLikeExtensionFields(
  item: Record<string, unknown>,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  for (const field of Object.keys(item)) {
    if (field === "path" || !isPathLikeFieldName(field)) {
      continue;
    }

    // <lang><zh-CN>动态扩展名可能包含私有路径，验证实际键但诊断只用安全父节点。</zh-CN><en>Dynamic extension names may contain private paths; validate the actual key but locate diagnostics at a safe parent.</en></lang>
    validateSafeOptionalPath(item, field, itemPath, targetPrefix, diagnostics, true, field.toLowerCase().endsWith("root"), true);
  }
}

/** @lang zh-CN 检查必需自有非空字符串，不转换或回显输入值。
 * @lang en Checks required own nonempty strings without coercing or reflecting input values.
 */
function validateRequiredString(
  item: Record<string, unknown>,
  field: string,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  if (!Object.hasOwn(item, field) || typeof item[field] !== "string" || item[field].length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      `Project docs manifest ${itemPath}.${field} must be a non-empty string.`,
      "error",
      joinTarget(targetPrefix, `${itemPath}.${field}`)
    ));
  }
}

/** @lang zh-CN 验证已提供路径或必需路径，current-directory例外须由调用点显式给出。
 * @lang en Validates present/required paths, with current-directory exceptions explicitly supplied by the call site.
 */
function validateSafeOptionalPath(
  item: Record<string, unknown>,
  field: string,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[],
  required: boolean,
  allowCurrentDirectory = false,
  dynamicField = false
): void {
  // <lang><zh-CN>值只读，诊断位置对未知扩展名作限制；不做String隐式转换或真实文件解析。</zh-CN><en>Read the value without coercion or physical file resolution, restricting diagnostic locations for unknown extension names.</en></lang>
  const value = item[field];
  if (value === undefined && !required) {
    return;
  }

  if (typeof value !== "string" || value.length === 0 || isUnsafeRelativePath(value, allowCurrentDirectory)) {
    const location = dynamicField && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field) ? itemPath : `${itemPath}.${field}`;
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_PATH_INVALID",
      `Project docs manifest ${location} must be a safe relative path.`,
      "error",
      joinTarget(targetPrefix, location)
    ));
  }
}

/** @lang zh-CN 沿用不区分大小写的path/root/directory后缀规则，不推断其它领域字段。
 * @lang en Retains case-insensitive path/root/directory suffix rules without inferring other domain fields.
 */
function isPathLikeFieldName(field: string): boolean {
  return /(?:path|root|directory)$/iu.test(field);
}

/** @lang zh-CN 分别验证静态输入与可选profile元信息列表，不归一化或加载引用。
 * @lang en Validates static inputs and optional profile metadata lists separately, without normalization or reference loading.
 */
function validateManifestPathEntries(value: unknown, field: "profiles" | "inputs", targetPrefix: string | undefined, diagnostics: HiaDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_FIELD_INVALID",
      `Project docs manifest ${field} must be an array.`,
      "error",
      joinTarget(targetPrefix, field)
    ));
    return;
  }

  if (field === "inputs" && value.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest inputs must be non-empty when provided.", "error", joinTarget(targetPrefix, field)));
  }
  value.forEach((item, index) => {
    // <lang><zh-CN>静态输入与profile引用共用数组位置，字段约束仍按各自已声明schema分别处理。</zh-CN><en>Static inputs and profile references share array-location handling but retain their distinct declared schema constraints.</en></lang>
    const itemPath = `${field}.${index}`;
    if (!isRecord(item)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${field}.${index} must be an object.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}`)
      ));
      return;
    }

    if (field === "profiles") {
      validateProfileReference(item, itemPath, targetPrefix, diagnostics, false);
      validateSafeOptionalPath(item, "path", itemPath, targetPrefix, diagnostics, false);
      return;
    }

    if (typeof item.kind !== "string" || !HIA_PROJECT_MANIFEST_INPUT_KINDS.includes(item.kind as HiaProjectManifestInputKind)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_FIELD_INVALID",
        `Project docs manifest ${field}.${index}.kind must be a supported input kind.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}.kind`)
      ));
    }
    if (item.domain !== undefined && !HIA_PROJECT_MANIFEST_DOMAINS.includes(item.domain as HiaProjectManifestDomain)) {
      diagnostics.push(createProjectManifestDiagnostic("HIA_PROJECT_MANIFEST_FIELD_INVALID", "Project docs manifest input domain is unsupported.", "error", joinTarget(targetPrefix, `${itemPath}.domain`)));
    }
    validateSafeOptionalPath(item, "sourceRoot", itemPath, targetPrefix, diagnostics, false);
    if (item.profile !== undefined) {
      validateProfileReference(item.profile, `${itemPath}.profile`, targetPrefix, diagnostics, true);
    }

    if (field === "inputs" && item.artifactPolicy !== undefined) {
      if (!HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES.includes(item.artifactPolicy as HiaProjectManifestArtifactPolicy)) {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${field}.${index}.artifactPolicy must be "all" or "relations-only".`,
          "error",
          joinTarget(targetPrefix, `${field}.${index}.artifactPolicy`)
        ));
      } else if (item.artifactPolicy === "relations-only" && item.kind !== "documentation-producer-result") {
        diagnostics.push(createProjectManifestDiagnostic(
          "HIA_PROJECT_MANIFEST_FIELD_INVALID",
          `Project docs manifest ${field}.${index}.artifactPolicy "relations-only" is only valid for documentation-producer-result inputs.`,
          "error",
          joinTarget(targetPrefix, `${field}.${index}.artifactPolicy`)
        ));
      }
    }

    if (field === "inputs" && item.semanticPath !== undefined) {
      validateSemanticPath(item.semanticPath, `${field}.${index}.semanticPath`, targetPrefix, diagnostics);
    }

    if (typeof item.path !== "string" || item.path.length === 0 || isUnsafeRelativePath(item.path)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_PATH_INVALID",
        `Project docs manifest ${field}.${index}.path must be a safe relative path.`,
        "error",
        joinTarget(targetPrefix, `${field}.${index}.path`)
      ));
    }
  });
}

/**
 * 校验 manifest-only semantic path 的闭集、稳定 id 与公开 label 隐私边界。
 * Validates the closed semantic path vocabulary, stable ids, and public-label privacy boundary.
 */
function validateSemanticPath(
  value: unknown,
  itemPath: string,
  targetPrefix: string | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(createProjectManifestDiagnostic(
      "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
      `Project docs manifest ${itemPath} must be a non-empty array.`,
      "error",
      joinTarget(targetPrefix, itemPath)
    ));
    return;
  }

  const seenIds = new Set<string>();
  value.forEach((segment, index) => {
    const segmentPath = `${itemPath}.${index}`;
    if (!isRecord(segment)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
        `Project docs manifest ${segmentPath} must be an object.`,
        "error",
        joinTarget(targetPrefix, segmentPath)
      ));
      return;
    }

    // <lang zh-CN>segment 是 closed-world contract，避免 path/private extension 旁路进入公开索引。</lang>
    // <lang en>A segment is closed-world so path/private extensions cannot bypass the public index boundary.</lang>
    // <lang><zh-CN>字段闭集、token、公开标签与去重结果都属于本段校验，不保存输入正文到诊断。</zh-CN><en>Closed fields, tokens, public labels and deduplication belong to this segment check; diagnostic output retains no input text.</en></lang>
    const fields = Object.keys(segment);
    const hasUnknownField = fields.some((field) => field !== "kind" && field !== "id" && field !== "label");
    const id = typeof segment.id === "string" ? segment.id : "";
    const label = typeof segment.label === "string" ? segment.label : "";
    const kind = segment.kind;
    const idValid = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(id);
    const labelValid = isSafeSemanticLabel(label);
    const kindValid = HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS.includes(kind as HiaProjectManifestSemanticPathKind);

    if (hasUnknownField || !kindValid || !idValid || !labelValid || seenIds.has(id)) {
      diagnostics.push(createProjectManifestDiagnostic(
        "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_INVALID",
        `Project docs manifest ${segmentPath} must contain unique, safe kind/id/label fields.`,
        "error",
        joinTarget(targetPrefix, segmentPath)
      ));
    }
    if (id) {
      seenIds.add(id);
    }
  });
}

/** Public label 可含 npm display slash，但不能像绝对路径、URI 或 traversal。Public labels may contain npm display slashes but not absolute paths, URIs, or traversal. */
function isSafeSemanticLabel(value: string): boolean {
  if (!value || value.length > 160 || /[\u0000-\u001F\u007F]/u.test(value)) {
    return false;
  }
  const normalized = value.replaceAll("\\", "/");
  return !normalized.includes("../")
    && normalized !== ".."
    && !normalized.startsWith("/")
    && !path.win32.isAbsolute(value)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(normalized);
}

/** @lang zh-CN 同时检查Windows/POSIX、URI、父跳转和控制字符，只判断词法边界。
 * @lang en Checks Windows/POSIX, URI, traversal and control characters at the lexical boundary only.
 */
function isUnsafeRelativePath(value: string, allowCurrentDirectory = false): boolean {
  // <lang><zh-CN>统一词法分隔符，不调用resolve/realpath；控制字符不能成为文件系统定位器。</zh-CN><en>Normalize lexical separators without resolve/realpath; control characters cannot be filesystem locators.</en></lang>
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || /[\u0000-\u001F\u007F]/u.test(value)
    || (!allowCurrentDirectory && normalized === ".")
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

/** @lang zh-CN 用固定消息与已净化位置创建新诊断；调用者前缀原样保留，data原引用透传。
 * @lang en Creates new diagnostics from fixed messages and sanitized locations, retaining caller prefixes and passing data by reference.
 */
function createProjectManifestDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  // <lang><zh-CN>只新建诊断选项外壳，不复制或清洗调用者拥有的data与前缀。</zh-CN><en>Create only a diagnostic-options shell, without copying or sanitizing caller-owned data or prefixes.</en></lang>
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

/** @lang zh-CN 将可信调用者前缀与已知后缀连接，空前缀不生成多余点号。
 * @lang en Joins a trusted caller prefix with a known suffix, without an extra dot for an empty prefix.
 */
function joinTarget(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

/** @lang zh-CN 在普通JSON图预检后识别非数组对象，不负责实例或Proxy安全边界。
 * @lang en Identifies non-array objects after the ordinary-JSON preflight, without owning instance/proxy security boundaries.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
