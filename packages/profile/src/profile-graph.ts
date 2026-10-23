/**
 * @file
 * @lang zh-CN 文档化配置规范的内部迭代遍历；区分祖先环与共享子图，不解释layer或改变成员所有权。
 * @lang en Internal iterative traversal of documentation profiles; distinguishes ancestor cycles from shared subgraphs without interpreting layers or changing member ownership.
 */
import type { HiaDocumentationProfile } from "./index.js";

/** @lang zh-CN 一条指向当前祖先的继承边及其闭环身份，均来自已校验的注册表。 @lang en An inheritance edge to an active ancestor and its closed identity path, from validated registries. */
export interface ProfileInheritanceCycle {
  profileId: string;
  parentIndex: number;
  profileIds: string[];
}

/** @lang zh-CN 同一次遍历的先序/后序和环；列表保持调用者原引用，任何环均使语义合成无效。 @lang en Preorder/postorder and cycles from one traversal; lists retain caller references, and any cycle invalidates semantic composition. */
export interface ProfileTraversal {
  preorder: HiaDocumentationProfile[];
  postorder: HiaDocumentationProfile[];
  cycles: ProfileInheritanceCycle[];
}

/**
 * @lang zh-CN 按父引用顺序迭代遍历有限配置图，每个身份只展开一次，未知父项交既有缺失引用检查。
 * @lang en Iteratively traverses finite profile graphs in parent-reference order, expanding each identity once and leaving unknown parents to existing missing-reference checks.
 * @param profiles <lang><zh-CN>已做结构校验的Map，调用期间不得修改；本内部函数不重新校验或冻结数据。</zh-CN><en>Structurally validated Map that must remain unchanged during the call; this internal function does not revalidate or freeze data.</en></lang>
 * @param roots <lang><zh-CN>一项查询根或全注册表根序列；只访问从根可达的配置。</zh-CN><en>One query root or a root sequence for the entire registry; only reachable profiles are visited.</en></lang>
 * @returns <lang><zh-CN>原引用顺序与每条祖先回边，时间O(V+E)、无递归调用；环路径输出占用与其长度成正比。</zh-CN><en>Original-reference orders and each ancestor back edge, in O(V+E) time without recursive calls; emitted cycle paths use space proportional to their lengths.</en></lang>
 */
export function traverseProfileInheritance(profiles: Map<string, HiaDocumentationProfile>, roots: Iterable<HiaDocumentationProfile>): ProfileTraversal {
  // <lang><zh-CN>visited对整次遍历去重，active只描述当前祖先栈；完成的共享祖先不是环。</zh-CN><en>visited deduplicates the whole traversal, while active describes only the current ancestor stack; completed shared ancestors are not cycles.</en></lang>
  const visited = new Set<string>();
  const active = new Map<string, number>();
  const stack: Array<{ profile: HiaDocumentationProfile; nextParent: number }> = [];
  const result: ProfileTraversal = { preorder: [], postorder: [], cycles: [] };

  /** @lang zh-CN 开始一个首次遇到的配置帧，记录父边游标供无递归恢复。 @lang en Starts a newly encountered profile frame and records its parent-edge cursor for nonrecursive resumption. */
  function enter(profile: HiaDocumentationProfile): void {
    visited.add(profile.profileId);
    active.set(profile.profileId, stack.length);
    result.preorder.push(profile);
    stack.push({ profile, nextParent: 0 });
  }

  for (const root of roots) {
    if (visited.has(root.profileId)) continue;
    enter(root);
    while (stack.length > 0) {
      // <lang><zh-CN>帧游标在下降前递增，返回时不会重复同一父边；全部父项后再登记本地定义顺序。</zh-CN><en>Advance the cursor before descending so resumption never repeats an edge; record local-definition order after all parents.</en></lang>
      const frame = stack[stack.length - 1]!;
      if (frame.nextParent >= frame.profile.extends.length) {
        active.delete(frame.profile.profileId);
        result.postorder.push(frame.profile);
        stack.pop();
        continue;
      }
      const parentIndex = frame.nextParent++;
      const parent = profiles.get(frame.profile.extends[parentIndex]!);
      if (!parent) continue;
      // <lang><zh-CN>只有当前祖先命中才形成闭环；已完成父节点直接复用，不重复展开菱形祖先。</zh-CN><en>Only active-ancestor matches form cycles; completed parents are reused without re-expanding diamond ancestors.</en></lang>
      const ancestorIndex = active.get(parent.profileId);
      if (ancestorIndex !== undefined) {
        result.cycles.push({ profileId: frame.profile.profileId, parentIndex, profileIds: [...stack.slice(ancestorIndex).map(({ profile }) => profile.profileId), parent.profileId] });
      } else if (!visited.has(parent.profileId)) {
        enter(parent);
      }
    }
  }
  return result;
}
