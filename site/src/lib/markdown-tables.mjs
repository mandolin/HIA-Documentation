/**
 * @file
 * @lang zh-CN 通过当前Sätteri处理器的HAST接口生成既有表格滚动组件，支持静态阅读与键盘操作。
 * @lang en Generate existing table-scroll components through the current Sätteri processor's HAST API, supporting static reading and keyboard use.
 */

/**
 * @lang zh-CN 创建无磁盘副作用的Sätteri表格插件，保留原生节点、属性与全部文本。
 * @lang en Create a filesystem-side-effect-free Sätteri table plugin that retains native nodes, properties and all text.
 * @returns {object} 使用element访问器和只读节点上下文的HAST插件。 HAST plugin using an element visitor and read-only node context.
 */
export function markdownTableWrappers() {
  return {
    name: "documentation-table-wrappers",
    element: {
      filter: ["table"],
      /**
       * @lang zh-CN 仅为缺少既有滚动容器的table排队包裹操作，重复处理保持幂等。
       * @lang en Queue a wrap only for tables lacking an existing scroll container, keeping repeated processing idempotent.
       * @param {Readonly<object>} node - 当前只读HAST元素。 Current read-only HAST element.
       * @param {object} context - Sätteri的parent和wrapNode接口；原table由处理器移入新容器。 Sätteri parent and wrapNode API; the processor moves the original table into the wrapper.
       * @returns {void} 通过处理器记录结构操作。 Record structural changes through the processor.
       */
      visit(node, context) {
        // <lang><zh-CN>父节点来自处理器当前遍历视图，原有className数组决定是否已经包裹。</zh-CN><en>The processor's current traversal view supplies the parent; its className array identifies existing wrappers.</en></lang>
        const parent = context.parent(node);
        const alreadyWrapped = parent?.type === "element" && parent.tagName === "div"
          && Array.isArray(parent.properties?.className) && parent.properties.className.includes("table-wrap");
        if (alreadyWrapped) return;
        // <lang><zh-CN>wrapNode保留原节点及全部后代，tabIndex使无脚本的局部水平滚动可由键盘到达。</zh-CN><en>wrapNode preserves the original node and descendants; tabIndex makes script-free local horizontal scrolling keyboard reachable.</en></lang>
        context.wrapNode(node, {
          type: "element",
          tagName: "div",
          properties: {className: ["table-wrap"], tabIndex: 0},
          children: []
        });
      }
    }
  };
}
