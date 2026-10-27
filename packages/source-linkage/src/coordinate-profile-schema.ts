/**
 * @file
 * @lang zh-CN 普通源码映射坐标证据侧载的独立 Draft 2020-12 结构定义；不修改 ECMA-426 映射或旧查询契约。
 * @lang en Independent Draft 2020-12 structure for the ordinary source-map coordinate evidence sidecar; it does not modify ECMA-426 maps or legacy query contracts.
 */

/** @lang zh-CN 中性坐标证据契约身份；与普通源码映射及文档源码映射的身份分别管理。 @lang en Neutral coordinate evidence contract identity, managed separately from ordinary and documentation source-map identities. */
export const ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT = "ordinary-source-map-coordinate-profile";

/** @lang zh-CN 开发期精确版本；草案不得被解释为正式 1.0.0 兼容承诺。 @lang en Exact development version; this draft must not be interpreted as a stable 1.0.0 compatibility promise. */
export const ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION = "0.1.0-draft";

/** @lang zh-CN 当前 schema 的 canonical 资源身份；只供精确查找，不触发网络读取或发行。 @lang en Canonical identity of the current schema for exact lookup only, without network access or publication. */
export const ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/ordinary-source-map-coordinate-profile-0.1.0-draft.schema.json";

/**
 * @lang zh-CN 坐标侧载的封闭 JSON 形状。摘要是实际字节的 SHA-256 后再以 canonical base64 表示；文本摘要的哈希输入是严格 UTF-8 解码后 UTF-16 代码单元的小端字节序列，不添加 BOM，也不折叠换行。schema 仅约束结构；实际字节、跨工件身份、槽位唯一性及 2 MiB 侧载边界由 owner reader 校验。
 * @lang en Closed JSON shape of the coordinate sidecar. Digests are canonical base64 encodings of SHA-256 over actual bytes; the text digest hashes little-endian bytes of UTF-16 code units after fatal UTF-8 decoding, without an added BOM or newline folding. The schema checks structure only; the owner reader verifies actual bytes, cross-artifact identities, slot uniqueness, and the 2 MiB sidecar limit.
 * @remarks <lang><zh-CN>sourceTextTransform 为 none 时，严格解码保留原有 UTF-8 BOM 对应的 U+FEFF 和 CRLF；未知列单位不授权精确锚点。此对象在运行时未深冻结，消费者修改前应克隆。</zh-CN><en>With sourceTextTransform none, fatal decoding preserves U+FEFF from an existing UTF-8 BOM and CRLF; unknown column units cannot authorize exact anchors. This object is not deeply frozen at runtime and consumers should clone before mutation.</en></lang>
 */
export const ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID,
  title: "Ordinary Source Map Coordinate Profile",
  description: "普通源码映射逐槽位坐标证据侧载 / Per-slot coordinate evidence for an ordinary source map.",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "id", "ordinaryMap", "documentationMap", "sourceSlots", "privacy"],
  properties: {
    contract: { const: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT },
    contractVersion: { const: ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION },
    id: { $ref: "#/$defs/identity" },
    ordinaryMap: { $ref: "#/$defs/ordinaryMap" },
    documentationMap: { $ref: "#/$defs/documentationMap" },
    sourceSlots: {
      description: "只列出有独立证据的原始槽位，顺序不改变 section/sourceIndex 身份 / Original slots with independent evidence; array order never replaces section/sourceIndex identity.",
      type: "array",
      maxItems: 4096,
      items: { $ref: "#/$defs/sourceSlot" }
    },
    privacy: { $ref: "#/$defs/privacy" }
  },
  $defs: {
    identity: {
      description: "公开安全的不透明身份；reader 另与实际工件身份核对 / Public-safe opaque identity, cross-checked against actual artifacts by the reader.",
      type: "string",
      minLength: 1,
      maxLength: 512,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*(?![\\s\\S])"
    },
    sourceRevision: {
      description: "公开安全的不透明来源版本；单独不证明内容相同 / Public-safe opaque source revision; alone it does not prove content equality.",
      type: "string",
      minLength: 1,
      maxLength: 256,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*(?![\\s\\S])"
    },
    digest: {
      description: "实际原始字节的 SHA-256；value 为 32 字节摘要的 canonical RFC 4648 base64 / SHA-256 of actual raw bytes, with canonical RFC 4648 base64 of the 32-byte digest.",
      type: "object",
      additionalProperties: false,
      required: ["algorithm", "value"],
      properties: {
        algorithm: { const: "sha256" },
        value: { type: "string", minLength: 44, maxLength: 44, pattern: "^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$" }
      }
    },
    textDigest: {
      description: "逻辑字符串 UTF-16 代码单元的小端字节 SHA-256，不带额外 BOM / SHA-256 of little-endian UTF-16 code-unit bytes of the logical string, with no added BOM.",
      type: "object",
      additionalProperties: false,
      required: ["representation", "algorithm", "value"],
      properties: {
        representation: { const: "decoded-utf16-code-units" },
        algorithm: { const: "sha256" },
        value: { type: "string", minLength: 44, maxLength: 44, pattern: "^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$" }
      }
    },
    ordinaryMap: {
      description: "同一文档 map sourceMaps 声明的普通 map 身份、mapsFrom生成工件身份与普通 map 实际字节摘要 / Ordinary map identity, generated mapsFrom artifact identity, and actual map-byte digest declared by the same documentation map.",
      type: "object",
      additionalProperties: false,
      required: ["sourceMapId", "artifactId", "digest"],
      properties: {
        sourceMapId: { $ref: "#/$defs/identity" },
        artifactId: { $ref: "#/$defs/identity" },
        digest: { $ref: "#/$defs/digest" }
      }
    },
    documentationMap: {
      description: "实际消费的 doc-source-map@1.1.0 身份与原始字节摘要 / Identity and raw-byte digest of the consumed doc-source-map@1.1.0.",
      type: "object",
      additionalProperties: false,
      required: ["id", "contractVersion", "digest"],
      properties: {
        id: { $ref: "#/$defs/identity" },
        contractVersion: { const: "1.1.0" },
        digest: { $ref: "#/$defs/digest" }
      }
    },
    sourceSlot: {
      description: "原始 section/source 序号；不得用展平后的路径或公开来源列表索引替代 / Original section/source indexes; flattened paths or public source-list indexes are not substitutes.",
      type: "object",
      additionalProperties: false,
      required: ["sectionIndex", "sourceIndex", "sourceId", "columnUnit", "sourceRevision", "sourceByteDigest", "sourceTextEncoding", "sourceTextTransform", "sourceTextDigest"],
      properties: {
        sectionIndex: { anyOf: [{ type: "null" }, { type: "integer", minimum: 0, maximum: 4095 }] },
        sourceIndex: { type: "integer", minimum: 0, maximum: 4095 },
        sourceId: { $ref: "#/$defs/identity" },
        columnUnit: { enum: ["utf16-code-unit", "unicode-code-point", "byte", "unknown"] },
        sourceRevision: { $ref: "#/$defs/sourceRevision" },
        sourceByteDigest: { $ref: "#/$defs/digest" },
        sourceTextEncoding: { const: "utf-8" },
        sourceTextTransform: { const: "none" },
        sourceTextDigest: { $ref: "#/$defs/textDigest" }
      }
    },
    privacy: {
      description: "侧载不嵌入 sourcesContent 或任何源码正文 / The sidecar embeds no sourcesContent or source body.",
      type: "object",
      additionalProperties: false,
      required: ["sourcesContentPolicy"],
      properties: { sourcesContentPolicy: { const: "none" } }
    }
  }
} as const;
