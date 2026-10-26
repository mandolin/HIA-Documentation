/**
 * @file
 * @lang zh-CN 诊断路径选项的私有自有数据投影，供校验/迁移入口复用，不授予路径访问或发布权限。
 * @lang en Private own-data projection for diagnostic-path options shared by validation/migration entries, granting no path-access or publication authority.
 */

/**
 * @lang zh-CN 只复制普通/null原型对象的自有path数据；未知字段不读，访问器/错型/反射异常原子拒绝。
 * @lang en Copies only own path data from a plain/null-prototype record; unknown fields remain unread, and accessors/wrong types/reflection failures reject atomically.
 * @param value <lang><zh-CN>未经信任的运行时选项；根undefined须由公共入口默认值先处理。</zh-CN><en>Untrusted runtime options; public entry defaults handle root undefined first.</en></lang>
 * @returns <lang><zh-CN>独立string路径快照或空对象；失败为undefined。空/空白字符串不裁剪或规范化。</zh-CN><en>Independent string-path snapshot or empty record; undefined on failure. Empty/whitespace strings are neither trimmed nor normalized.</en></lang>
 */
export function prepareSourceLinkagePathOptions(value: unknown): { path?: string } | undefined {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    // <lang><zh-CN>原型仅判定本realm数据形状，不沿原型取路径；Proxy陷阱仍可能执行。</zh-CN><en>The prototype determines same-realm data shape only; paths are not inherited, and proxy traps may still execute.</en></lang>
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    // <lang><zh-CN>已知描述符只读一次，防止getter及校验后的原对象重读。</zh-CN><en>Read the known descriptor once, preventing getters and later rereads of the original object.</en></lang>
    const descriptor = Object.getOwnPropertyDescriptor(value, "path");
    if (!descriptor) return {};
    if (!Object.hasOwn(descriptor, "value")) return undefined;
    if (descriptor.value === undefined) return {};
    return typeof descriptor.value === "string" ? { path: descriptor.value } : undefined;
  } catch {
    return undefined;
  }
}
