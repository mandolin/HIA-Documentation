/**
 * @file
 * @lang zh-CN 三代常量/schema根的严格类型消费；验证字面量/精确联合及readonly，不执行运行时写入。
 * @lang en Strict type consumer for three generations of constant/schema roots, checking literals, exact unions and readonly without executing runtime writes.
 */
import * as api from "../src/index.js";

// <lang><zh-CN>精确字面量赋值使版本/身份类型变宽成为编译失败。</zh-CN><en>Exact literal assignments turn accidental version/identity widening into compilation failures.</en></lang>
const mapName: "doc-source-map" = api.DOC_SOURCE_MAP_CONTRACT;
const mapVersion: "1.1.0" = api.DOC_SOURCE_MAP_CONTRACT_VERSION;
const previousMapVersion: "1.0.0" = api.DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION;
const oldMapVersion: "0.1.0-draft" = api.DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION;
const bindingName: "generated-documentation-binding" = api.GENERATED_DOCUMENTATION_BINDING_CONTRACT;
const bindingVersion: "0.3.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
const previousBindingVersion: "0.2.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION;
const oldBindingVersion: "0.1.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION;
const mapId: "https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.1.0.schema.json" = api.DOC_SOURCE_MAP_SCHEMA_ID;
const mapSchemaVersion: "1.1.0" = api.DOC_SOURCE_MAP_SCHEMA_VERSION;
const bindingId: "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.3.0-draft.schema.json" = api.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID;
const previousBindingId: "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.2.0-draft.schema.json" = api.GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID;
const oldBindingId: "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.1.0-draft.schema.json" = api.GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID;
const bindingSchemaVersion: "0.3.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION;
// <lang><zh-CN>三类联合完整接受已声明值，类别元组保留固定长度/顺序的readonly类型。</zh-CN><en>The three unions admit all declared values, while the category tuple retains readonly length/order.</en></lang>
const mapVersions: api.DocSourceMapContractVersion[] = [mapVersion, previousMapVersion, oldMapVersion];
const bindingVersions: api.GeneratedDocumentationBindingContractVersion[] = [bindingVersion, previousBindingVersion, oldBindingVersion];
const categories: readonly api.DocSourceMapRangeSource[] = api.DOC_SOURCE_MAP_RANGE_SOURCES;
const firstCategory: "source-map" = api.DOC_SOURCE_MAP_RANGE_SOURCES[0];
const categoryCount: 7 = api.DOC_SOURCE_MAP_RANGE_SOURCES.length;
const currentRoot: "1.1.0" = api.DOC_SOURCE_MAP_JSON_SCHEMA.properties.contractVersion.const;
const currentSidecar: "0.3.0-draft" = api.DOC_SOURCE_MAP_JSON_SCHEMA.$defs.generatedBindingSidecar.properties.contractVersion.const;
const bindingRoot: "0.3.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.properties.contractVersion.const;
const oldRoot: "0.1.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.properties.contractVersion.const;
const currentBacklink: "1.1.0" = api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const;
const oldBacklink: "0.1.0-draft" = api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const;
// @ts-expect-error <lang><zh-CN>不协商未知patch。</zh-CN><en>Unknown patches are not negotiated.</en></lang>
const unknownMap: api.DocSourceMapContractVersion = "1.1.1";
// @ts-expect-error <lang><zh-CN>build身份也不自动接纳。</zh-CN><en>Build identities are not automatically admitted.</en></lang>
const buildMap: api.DocSourceMapContractVersion = "1.1.0+build";
// @ts-expect-error <lang><zh-CN>绑定未承诺稳定1.0。</zh-CN><en>Binding has no stable 1.0 promise.</en></lang>
const stableBinding: api.GeneratedDocumentationBindingContractVersion = "1.0.0";
// @ts-expect-error <lang><zh-CN>未知草案也不协商。</zh-CN><en>Unknown drafts are not negotiated.</en></lang>
const otherBinding: api.GeneratedDocumentationBindingContractVersion = "0.3.1-draft";
// @ts-expect-error <lang><zh-CN>类别不是工具明细字符串。</zh-CN><en>Categories do not accept tool-detail strings.</en></lang>
const tool: api.DocSourceMapRangeSource = "typescript-compiler";
// @ts-expect-error <lang><zh-CN>不补隐式other类别。</zh-CN><en>No implicit other category exists.</en></lang>
const other: api.DocSourceMapRangeSource = "other";
// @ts-expect-error <lang><zh-CN>类别元组不可push。</zh-CN><en>The category tuple cannot be pushed.</en></lang>
api.DOC_SOURCE_MAP_RANGE_SOURCES.push("parser");
// @ts-expect-error <lang><zh-CN>类别槽位只读。</zh-CN><en>Category slots are readonly.</en></lang>
api.DOC_SOURCE_MAP_RANGE_SOURCES[0] = "source-map";
// @ts-expect-error <lang><zh-CN>schema根类型仍只读。</zh-CN><en>The schema root type remains readonly.</en></lang>
api.DOC_SOURCE_MAP_JSON_SCHEMA.$id = mapId;
// @ts-expect-error <lang><zh-CN>schema嵌套类型仍只读。</zh-CN><en>Nested schema types remain readonly.</en></lang>
api.DOC_SOURCE_MAP_JSON_SCHEMA.$defs.nonEmptyString.minLength = 1;
// @ts-expect-error <lang><zh-CN>当前绑定schema数组类型只读。</zh-CN><en>Current binding schema array types are readonly.</en></lang>
api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.required.push("id");
// @ts-expect-error <lang><zh-CN>历史绑定根类型只读。</zh-CN><en>The legacy binding root type is readonly.</en></lang>
api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.properties.contractVersion.const = oldBindingVersion;
// @ts-expect-error <lang><zh-CN>精确旧反向链接不能充当当前链接。</zh-CN><en>The exact legacy backlink cannot serve as the current backlink.</en></lang>
const wrongBacklink: "1.1.0" = oldBacklink;
void [mapName, bindingName, mapId, bindingId, previousBindingId, oldBindingId, mapSchemaVersion, bindingSchemaVersion, mapVersions, bindingVersions, categories, firstCategory, categoryCount, currentRoot, currentSidecar, bindingRoot, oldRoot, currentBacklink];
