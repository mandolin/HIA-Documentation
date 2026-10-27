/**
 * @file
 * @lang zh-CN 在清单字段读取前检查普通JSON图；配置包内部副本，不导入核心包私有子路径。
 * @lang en Checks ordinary JSON graphs before manifest fields are read; a config-internal copy without importing private core subpaths.
 */

/**
 * @lang zh-CN 迭代检查有限、无环的普通JSON数据，不调用getter或自定义toJSON；共享无环对象允许。
 * @lang en Iteratively checks finite, acyclic ordinary JSON data without invoking getters or custom toJSON; shared acyclic objects are allowed.
 * @param value <lang><zh-CN>待检查内存值，不修改任何输入。</zh-CN><en>In-memory value to inspect; no input is mutated.</en></lang>
 * @param options <lang><zh-CN>配置入口可要求拒绝非枚举对象字段及Symbol键；缺省保留清单对这些非wire字段的既有忽略语义。</zh-CN><en>The config entry may reject non-enumerable object fields and Symbol keys; the default retains the manifest's existing skip behavior for these non-wire fields.</en></lang>
 * @returns <lang><zh-CN>仅符合所选模式的普通JSON图为true；反射异常为false。Proxy反射副作用不受沙箱保护。</zh-CN><en>True only for an ordinary JSON graph under the selected mode; reflection failures return false. Proxy reflection side effects are not sandboxed.</en></lang>
 */
export function isProjectManifestJsonDataGraph(
  value: unknown,
  options: Readonly<{ rejectNonEnumerableObjectFields?: boolean }> = {}
): boolean {
  // <lang><zh-CN>显式退出帧区分祖先环与共享子图，避免递归调用栈和重复遍历。</zh-CN><en>Explicit exit frames distinguish ancestor cycles from shared subgraphs, avoiding recursive stacks and repeated traversal.</en></lang>
  const pending: Array<{ value: unknown; exit: boolean }> = [{ value, exit: false }];
  const active = new WeakSet<object>();
  const completed = new WeakSet<object>();
  try {
    while (pending.length > 0) {
      // <lang><zh-CN>本帧仅持有调用者引用，退出时释放当前祖先关系，不冻结或复制输入。</zh-CN><en>The frame holds caller references only; exiting releases ancestry without freezing or copying input.</en></lang>
      const frame = pending.pop()!;
      const current = frame.value;
      if (current === null || typeof current === "string" || typeof current === "boolean") continue;
      if (typeof current === "number") {
        if (!Number.isFinite(current)) return false;
        continue;
      }
      if (typeof current !== "object") return false;
      if (frame.exit) {
        active.delete(current);
        completed.add(current);
        continue;
      }
      if (active.has(current)) return false;
      if (completed.has(current)) continue;

      // <lang><zh-CN>日期/集合/类实例不是本接口的JSON对象；只接受同realm普通对象、null原型对象和标准数组。</zh-CN><en>Dates, collections and class instances are not JSON objects here; accept same-realm ordinary/null-prototype objects and standard arrays only.</en></lang>
      const array = Array.isArray(current);
      const prototype = Object.getPrototypeOf(current);
      if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false;
      const descriptors = Object.getOwnPropertyDescriptors(current);
      // <lang><zh-CN>配置直接API接受内存对象，故包括数组在内的自有Symbol字段都应固定拒绝；清单默认模式继续忽略非wire Symbol键。</zh-CN><en>The config direct API receives in-memory objects, so reject own Symbol fields on arrays and objects; manifest default mode continues to ignore non-wire Symbol keys.</en></lang>
      if (options.rejectNonEnumerableObjectFields && Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) return false;
      // <lang><zh-CN>JSON.stringify会调用非枚举toJSON，必须单独拒绝自定义钩子；只读取描述符，不执行访问器。</zh-CN><en>JSON.stringify invokes even non-enumerable toJSON, so reject custom hooks separately by reading descriptors without executing accessors.</en></lang>
      const hook = descriptors.toJSON ?? (prototype && Object.getOwnPropertyDescriptor(prototype, "toJSON"));
      if (hook && (!Object.hasOwn(hook, "value") || typeof hook.value === "function")) return false;
      const values: unknown[] = [];
      if (array) {
        // <lang><zh-CN>先以数组自身 length 描述符和索引数量拒绝稀疏图，避免按巨大 length 逐槽探测；不增设合法密集数组的大小阈值。</zh-CN><en>Reject sparse graphs from the array's own length descriptor and index count before probing slots; no new size limit is imposed on valid dense arrays.</en></lang>
        const arrayLength = descriptors.length?.value;
        const descriptorKeys = Object.keys(descriptors);
        if (typeof arrayLength !== "number" || !Number.isSafeInteger(arrayLength) || descriptorKeys.length !== arrayLength + 1) return false;
        if (descriptorKeys.some((key) => key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) return false;
        for (let index = 0; index < arrayLength; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !Object.hasOwn(descriptor, "value")) return false;
          values.push(descriptor.value);
        }
      } else {
        // <lang><zh-CN>只读取可枚举自有数据属性，JSON值的语义不延伸到metadata领域正文。</zh-CN><en>Read only enumerable own data properties; JSON-value semantics do not interpret domain text in metadata.</en></lang>
        for (const descriptor of Object.values(descriptors)) {
          // <lang><zh-CN>隐藏访问器也可能是后续模型读取的已知字段，必须在跳过非枚举数据前拒绝。</zh-CN><en>Hidden accessors may still be known fields read by later model checks, so reject them before skipping non-enumerable data.</en></lang>
          if (!Object.hasOwn(descriptor, "value")) return false;
          if (!descriptor.enumerable) {
            // <lang><zh-CN>配置校验随后读取已知字段，故其隐藏数据字段不能像清单扩展数据一样略过。</zh-CN><en>Config validation later reads known fields, so its hidden data fields cannot be skipped like manifest extension data.</en></lang>
            if (options.rejectNonEnumerableObjectFields) return false;
            continue;
          }
          values.push(descriptor.value);
        }
      }
      active.add(current);
      pending.push({ value: current, exit: true });
      for (let index = values.length - 1; index >= 0; index -= 1) pending.push({ value: values[index], exit: false });
    }
    return true;
  } catch {
    // <lang><zh-CN>恶意Proxy等反射异常转换为失败，不回显异常正文或私有路径。</zh-CN><en>Convert reflection failures such as hostile proxies to rejection without reflecting exception text or private paths.</en></lang>
    return false;
  }
}
