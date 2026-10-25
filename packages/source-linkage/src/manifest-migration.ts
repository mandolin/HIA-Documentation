/**
 * @file
 * @lang zh-CN 已预检映射的独立JSON复制与明确来源转换；不读取文件、不猜测未知来源。
 * @lang en Independent JSON cloning and explicit provenance conversion for preflighted maps, without file reads or guessing unknown origins.
 */
import { DOC_SOURCE_MAP_CONTRACT_VERSION, DOC_SOURCE_MAP_RANGE_SOURCES } from "./constants.js";

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
/**
 * @lang zh-CN 为已预检输入复制新容器并按明确表迁移；反射异常由公共入口隔离，不返回原对象。
 * @lang en Clones preflighted input into new containers and migrates using the explicit table; the public entry isolates reflection errors and never returns the original object.
 * @param value <lang><zh-CN>已通过owner输入检查的普通JSON根。</zh-CN><en>Ordinary-JSON root passing owner input checks.</en></lang>
 * @returns <lang><zh-CN>待验证复制品或静态问题；不写文件、不调用JSON hooks。</zh-CN><en>Clone pending validation or a static issue; no file writes or JSON-hook calls.</en></lang>
 */
export function prepareDocSourceMapMigration(value: Record<string, unknown>, options: { coordinatedBindings?: true } = {}): PreparedDocSourceMapMigration {
  // <lang><zh-CN>协调标志仅供已验证整组的owner内部调用，单工件公共迁移不传此标志。</zh-CN><en>The coordination flag is internal to owners validating complete bundles; public standalone migration never supplies it.</en></lang>
  const manifest = cloneSourceLinkageJsonData(value);
  // <lang><zh-CN>当前版只复制；旧版每条引用独立转换，不能用顶层producer替代具体来源。</zh-CN><en>Current versions are cloned only; legacy references convert individually rather than substituting the top-level producer.</en></lang>
  if (value.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION) {
    // <lang><zh-CN>单工件迁移仍拒绝绑定关联，整组调用须已验证完整输入闭包。</zh-CN><en>Standalone migration still refuses binding associations; coordinated callers must validate the complete input closure first.</en></lang>
    if (!options.coordinatedBindings && ((Array.isArray(manifest.generatedBindingSidecars) && manifest.generatedBindingSidecars.length > 0)
      || (manifest.entries as Array<Record<string, unknown>>).some(entry => Array.isArray(entry.generatedBindingRefs) && entry.generatedBindingRefs.length > 0))) {
      return { issue: "Frozen generated-binding associations require coordinated artifact migration." };
    }
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
  manifest.contractVersion = DOC_SOURCE_MAP_CONTRACT_VERSION;
  return { manifest };
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
