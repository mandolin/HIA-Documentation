/**
 * @file
 * @lang zh-CN 在读取模型属性前检查普通JSON数据图；内部模块，不构成新的包子路径入口。
 * @lang en Checks ordinary JSON data graphs before model properties are read; internal module, not a new package subpath entry.
 */

/**
 * @lang zh-CN 迭代检查有限、无环的普通JSON数据，不调用getter或自定义toJSON；共享无环对象允许。
 * @lang en Iteratively checks finite, acyclic ordinary JSON data without invoking getters or custom toJSON; shared acyclic objects are allowed.
 * @param value <lang><zh-CN>待检查内存值，不修改任何输入。</zh-CN><en>In-memory value to inspect; no input is mutated.</en></lang>
 * @returns <lang><zh-CN>仅普通JSON图为true；反射异常为false。非枚举对象数据和Symbol键不属于wire；Proxy反射副作用不受沙箱保护。</zh-CN><en>True only for ordinary JSON graphs; reflection failures return false. Non-enumerable object data and Symbol keys are outside the wire model; proxy reflection side effects are not sandboxed.</en></lang>
 */
export function isJsonDataGraph(value: unknown): boolean {
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
      // <lang><zh-CN>JSON.stringify会调用非枚举toJSON，必须单独拒绝自定义钩子；只读取描述符，不执行访问器。</zh-CN><en>JSON.stringify invokes even non-enumerable toJSON, so reject custom hooks separately by reading descriptors without executing accessors.</en></lang>
      const hook = descriptors.toJSON ?? (prototype && Object.getOwnPropertyDescriptor(prototype, "toJSON"));
      if (hook && (!Object.hasOwn(hook, "value") || typeof hook.value === "function")) return false;
      const values: unknown[] = [];
      if (array) {
        // <lang><zh-CN>数组wire只含稠密索引；额外方法/属性会在序列化时丢失或改变后续遍历，予以拒绝。</zh-CN><en>Array wires contain dense indices only; reject extra methods/properties that serialization would lose or that could alter later traversal.</en></lang>
        if (Object.keys(descriptors).some((key) => key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) return false;
        for (let index = 0; index < (current as unknown[]).length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !Object.hasOwn(descriptor, "value")) return false;
          values.push(descriptor.value);
        }
      } else {
        // <lang><zh-CN>只读取可枚举自有数据属性，JSON值的语义不延伸到metadata领域正文。</zh-CN><en>Read only enumerable own data properties; JSON-value semantics do not interpret domain text in metadata.</en></lang>
        for (const descriptor of Object.values(descriptors)) {
          if (!descriptor.enumerable) continue;
          if (!Object.hasOwn(descriptor, "value")) return false;
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
