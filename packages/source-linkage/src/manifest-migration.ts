/**
 * @file
 * @lang zh-CN 已预检映射的独立JSON复制与明确来源转换；不读取文件、不猜测未知来源。
 * @lang en Independent JSON cloning and explicit provenance conversion for preflighted maps, without file reads or guessing unknown origins.
 */
import {
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION,
  DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION,
  DOC_SOURCE_MAP_RANGE_SOURCES,
  DOC_SOURCE_MAP_END_BOUNDARIES,
  DOC_SOURCE_MAP_COLUMN_UNITS,
  type DocSourceMapRangeConvention
} from "./constants.js";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";

/** @lang zh-CN 已核查四种既有工件来源的精确映射，禁止前缀/关键词推测。 @lang en Exact mappings for four reviewed artifact origins, prohibiting prefix/keyword inference. */
const legacyCategories: Readonly<Record<string, string>> = Object.freeze({
  "typescript-compiler": "compiler", "ordinary-source-map": "source-map", "pug-location": "parser", "htmdoc-bridge": "adapter"
});
/** @lang zh-CN 内部迁移准备结果，失败不返回局部工件。 @lang en Internal migration-preparation result; failures never return a partial artifact. */
export interface PreparedDocSourceMapMigration {
  /** @lang zh-CN 完整复制后待新版验证的对象，不保证语义已通过。 @lang en Complete cloned object pending current-version validation, without a semantic-validity guarantee. */
  manifest?: Record<string, unknown>;
  /** @lang zh-CN 不含调用方正文的固定错误说明。 @lang en Fixed error explanation without caller bodies. */
  issue?: string;
}
/** @lang zh-CN 旧引用的逐项外部精度证据，按原工件数组序号精确定位，不依sourceId合并。 @lang en Per-reference external precision evidence for older maps, addressed by original array ordinals without merging duplicate source IDs. */
export interface DocSourceMapRangeEvidence {
  /** @lang zh-CN entries中的零基序号。 @lang en Zero-based ordinal in entries. */
  entryIndex: number;
  /** @lang zh-CN 对应sourceRefs中的零基序号。 @lang en Zero-based ordinal in that entry's sourceRefs. */
  sourceRefIndex: number;
  /** @lang zh-CN 可核实的终点与列单位；unknown须显式声明，不能从来源名称推断。 @lang en Verified endpoint and column unit; unknown is explicit and never inferred from origin names. */
  rangeConvention: DocSourceMapRangeConvention;
}

/** @lang zh-CN 内部目标版本选择，旧绑定整组可保留1.0.0配对。 @lang en Internal target-version selection so older binding bundles can retain their 1.0.0 pair. */
export interface DocSourceMapMigrationPreparationOptions {
  coordinatedBindings?: true;
  targetVersion?: typeof DOC_SOURCE_MAP_CONTRACT_VERSION | typeof DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION;
  rangeEvidence?: readonly DocSourceMapRangeEvidence[];
}
/**
 * @lang zh-CN 为已预检输入复制新容器并按明确表迁移；反射异常由公共入口隔离，不返回原对象。
 * @lang en Clones preflighted input into new containers and migrates using the explicit table; the public entry isolates reflection errors and never returns the original object.
 * @param value <lang><zh-CN>已通过owner输入检查的普通JSON根。</zh-CN><en>Ordinary-JSON root passing owner input checks.</en></lang>
 * @returns <lang><zh-CN>待验证复制品或静态问题；不写文件、不调用JSON hooks。</zh-CN><en>Clone pending validation or a static issue; no file writes or JSON-hook calls.</en></lang>
 */
export function prepareDocSourceMapMigration(value: Record<string, unknown>, options: DocSourceMapMigrationPreparationOptions = {}): PreparedDocSourceMapMigration {
  // <lang><zh-CN>迁移证据先完整投影；错误值、访问器、重复序号都不能带来局部新工件。</zh-CN><en>Project the complete evidence before migration; invalid values, accessors and duplicate ordinals cannot produce a partial artifact.</en></lang>
  const evidence = projectRangeEvidence(options.rangeEvidence);
  if (!evidence) return { issue: "Range evidence must be unique, ordinary and explicitly declare endpoint and column unit." };
  const targetVersion = options.targetVersion ?? DOC_SOURCE_MAP_CONTRACT_VERSION;
  if (targetVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && targetVersion !== DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION) return { issue: "Mapping migration target version is unsupported." };
  if (value.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && value.contractVersion !== DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION && value.contractVersion !== DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION) return { issue: "Mapping migration requires an exact supported source version." };
  if (targetVersion === DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION && value.contractVersion === DOC_SOURCE_MAP_CONTRACT_VERSION) return { issue: "Current mapping cannot be downgraded to 1.0.0." };
  // <lang><zh-CN>协调标志仅供已验证整组的owner内部调用，单工件公共迁移不传此标志。</zh-CN><en>The coordination flag is internal to owners validating complete bundles; public standalone migration never supplies it.</en></lang>
  const manifest = cloneSourceLinkageJsonData(value);
  // <lang><zh-CN>只要目标配对变化，绑定声明的升级必须交给整组迁移；独立map不能篡改sidecar的版本事实。</zh-CN><en>Whenever the target pair changes, binding declarations require bundle migration; a standalone map cannot rewrite sidecar version facts.</en></lang>
  if (value.contractVersion !== targetVersion && !options.coordinatedBindings && ((Array.isArray(manifest.generatedBindingSidecars) && manifest.generatedBindingSidecars.length > 0)
    || (manifest.entries as Array<Record<string, unknown>>).some(entry => Array.isArray(entry.generatedBindingRefs) && entry.generatedBindingRefs.length > 0))) {
    return { issue: "Frozen generated-binding associations require coordinated artifact migration." };
  }
  // <lang><zh-CN>历史草案的来源类别转换只对草案执行，已公开1.0.0原样保留。</zh-CN><en>Convert provenance categories only for the historical draft; retain published 1.0.0 references as written.</en></lang>
  if (value.contractVersion === DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION) {
    for (const entry of manifest.entries as Array<Record<string, unknown>>) {
      for (const key of ["sourceRefs", "artifactRefs"]) {
        if (!Array.isArray(entry[key])) continue;
        for (const reference of entry[key] as Array<Record<string, unknown>>) {
          const origin = reference.rangeSource;
          if (typeof origin !== "string") return { issue: "Legacy references require explicit provenance before migration." };
          if ((DOC_SOURCE_MAP_RANGE_SOURCES as readonly string[]).includes(origin)) continue;
          if (!Object.hasOwn(legacyCategories, origin)) return { issue: "Legacy provenance has no reviewed category mapping." };
          if (Object.hasOwn(reference, "rangeSourceDetail") && reference.rangeSourceDetail !== origin) return { issue: "Legacy provenance detail conflicts with lossless migration." };
          reference.rangeSource = legacyCategories[origin];
          reference.rangeSourceDetail = origin;
        }
      }
    }
  }
  // <lang><zh-CN>旧范围升1.1必须逐项消耗证据；没有范围的引用不得借用或遗留多余证据。</zh-CN><en>Every older range upgraded to 1.1 must consume its own evidence; unranged references cannot borrow or leave surplus evidence.</en></lang>
  if (targetVersion === DOC_SOURCE_MAP_CONTRACT_VERSION && value.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION) {
    const entries = manifest.entries as Array<Record<string, unknown>>;
    for (const [entryIndex, entry] of entries.entries()) {
      if (!Array.isArray(entry.sourceRefs)) continue;
      for (const [sourceRefIndex, reference] of (entry.sourceRefs as Array<Record<string, unknown>>).entries()) {
        if (!Object.hasOwn(reference, "range")) continue;
        const key = `${entryIndex}:${sourceRefIndex}`;
        const rangeConvention = evidence.get(key);
        if (!rangeConvention) return { issue: "Every older ranged source reference requires explicit convention evidence." };
        // <lang><zh-CN>旧扩展字段不能当作迁移证据；冲突时拒绝而非悄悄重解释。</zh-CN><en>An older extension cannot serve as migration evidence; conflicts reject rather than silently reinterpret.</en></lang>
        if (Object.hasOwn(reference, "rangeConvention")) {
          const existing = reference.rangeConvention;
          if (typeof existing !== "object" || existing === null || Array.isArray(existing)
            || Object.getOwnPropertyNames(existing).sort().join(",") !== "columnUnit,endBoundary"
            || Object.getOwnPropertySymbols(existing).length !== 0
            || (existing as Record<string, unknown>).endBoundary !== rangeConvention.endBoundary
            || (existing as Record<string, unknown>).columnUnit !== rangeConvention.columnUnit) return { issue: "Existing range convention conflicts with explicit migration evidence." };
        }
        reference.rangeConvention = rangeConvention;
        evidence.delete(key);
      }
    }
  }
  if (evidence.size > 0) return { issue: "Range evidence addresses no migrated ranged source reference." };
  manifest.contractVersion = targetVersion;
  return { manifest };
}

/**
 * @lang zh-CN 投影普通JSON精度证据，保证字段闭合、序号唯一、值合法且不与调用方共享可变约定。
 * @lang en Projects ordinary-JSON precision evidence with closed fields, unique ordinals, valid values and independently copied conventions.
 * @param value <lang><zh-CN>未知调用方证据或undefined。</zh-CN><en>Unknown caller evidence or undefined.</en></lang>
 * @returns <lang><zh-CN>独立键值表；失败为undefined，不执行getter或JSON hook。</zh-CN><en>Independent map, or undefined on refusal, without invoking getters or JSON hooks.</en></lang>
 */
function projectRangeEvidence(value: unknown): Map<string, DocSourceMapRangeConvention> | undefined {
  if (value === undefined) return new Map();
  if (!Array.isArray(value) || !isDocSourceMapJsonDataGraph(value)) return undefined;
  const projected = new Map<string, DocSourceMapRangeConvention>();
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)
      || Object.getOwnPropertyNames(item).sort().join(",") !== "entryIndex,rangeConvention,sourceRefIndex"
      || Object.getOwnPropertySymbols(item).length !== 0) return undefined;
    const evidence = item as Record<string, unknown>;
    if (!Number.isSafeInteger(evidence.entryIndex) || (evidence.entryIndex as number) < 0 || !Number.isSafeInteger(evidence.sourceRefIndex) || (evidence.sourceRefIndex as number) < 0) return undefined;
    const convention = evidence.rangeConvention;
    if (typeof convention !== "object" || convention === null || Array.isArray(convention)
      || Object.getOwnPropertyNames(convention).sort().join(",") !== "columnUnit,endBoundary"
      || Object.getOwnPropertySymbols(convention).length !== 0) return undefined;
    const fields = convention as Record<string, unknown>;
    if (!(DOC_SOURCE_MAP_END_BOUNDARIES as readonly unknown[]).includes(fields.endBoundary) || !(DOC_SOURCE_MAP_COLUMN_UNITS as readonly unknown[]).includes(fields.columnUnit)) return undefined;
    const key = `${evidence.entryIndex}:${evidence.sourceRefIndex}`;
    if (projected.has(key)) return undefined;
    projected.set(key, { endBoundary: fields.endBoundary as DocSourceMapRangeConvention["endBoundary"], columnUnit: fields.columnUnit as DocSourceMapRangeConvention["columnUnit"] });
  }
  return projected;
}

/**
 * @lang zh-CN 在任何输入工件反射前快照公开迁移证据，避免输入Proxy改写调用方选项或嵌套约定。
 * @lang en Snapshots public migration evidence before any input-artifact reflection, preventing an input Proxy from changing caller options or nested conventions.
 * @param value <lang><zh-CN>未验证的可选证据数组。</zh-CN><en>Unvalidated optional evidence array.</en></lang>
 * @returns <lang><zh-CN>独立证据序列；undefined表示拒绝，空数组表示无需证据。</zh-CN><en>Independent evidence sequence; undefined means refusal and an empty array means no evidence is required.</en></lang>
 */
export function snapshotDocSourceMapRangeEvidence(value: unknown): DocSourceMapRangeEvidence[] | undefined {
  const projected = projectRangeEvidence(value);
  if (!projected) return undefined;
  return [...projected].map(([key, rangeConvention]) => {
    const [entryIndex, sourceRefIndex] = key.split(":").map(Number);
    return { entryIndex: entryIndex!, sourceRefIndex: sourceRefIndex!, rangeConvention };
  });
}

/**
 * @lang zh-CN 复制已预检的JSON可序列化字段，保留共享子图及普通__proto__键，不调用JSON hooks。
 * @lang en Clones preflighted JSON-serializable fields, retaining shared subgraphs and ordinary __proto__ keys without invoking JSON hooks.
 * @param value <lang><zh-CN>已通过普通JSON预检的根对象。</zh-CN><en>Root object already passing ordinary-JSON preflight.</en></lang>
 * @returns <lang><zh-CN>独立可写图；不可枚举内存扩展不属于JSON wire，调用者须再次验证所需字段。</zh-CN><en>Independent writable graph; non-enumerable memory extensions are outside JSON wire, and callers must revalidate required fields.</en></lang>
 */
export function cloneSourceLinkageJsonData(value: Record<string, unknown>): Record<string, unknown> {
  // <lang><zh-CN>迭代复制保留共享子图，避免深扩展对象消耗调用栈；不会沿输入原型继承属性。</zh-CN><en>Iterative copying preserves shared subgraphs and avoids call-stack growth for deep extensions, without inheriting input properties.</en></lang>
  const manifest: Record<string, unknown> = {};
  const copies = new Map<object, object>([[value, manifest]]);
  const pending: Array<[object, object]> = [[value, manifest]];
  while (pending.length) {
    // <lang><zh-CN>每个容器只展开一次；属性用defineProperty写入以保留__proto__作为普通数据键。</zh-CN><en>Expand each container once; defineProperty retains __proto__ as an ordinary data key.</en></lang>
    const [source, target] = pending.pop()!;
    for (const key of Object.keys(source)) {
      const child = (source as Record<string, unknown>)[key];
      let copied = child;
      if (typeof child === "object" && child !== null) {
        copied = copies.get(child);
        if (!copied) { copied = Array.isArray(child) ? [] : {}; copies.set(child, copied as object); pending.push([child, copied as object]); }
      }
      Object.defineProperty(target, key, { value: copied, enumerable: true, configurable: true, writable: true });
    }
  }
  return manifest;
}
