/**
 * @file
 * @lang zh-CN 将真实原生内容采用到已确认的声明槽位范围，保留运行状态边界。
 * @lang en Adopts actual native content within confirmed declaration-slot scope while retaining runtime-state boundaries.
 */
import {isDeepStrictEqual} from "node:util";

/**
 * @lang zh-CN 只在每个槽位及其全部成员唯一关联且正文/签名/双语/范围均通过时消解对应数组声明边界。
 * @lang en Resolves an array declaration boundary only when every slot and member uniquely passes association, prose, signature, locale and range checks.
 * @param {object} base <lang><zh-CN>保留的原生或资源审核层。</zh-CN><en>Retained native or resource audit layer.</en></lang>
 * @param {object} input <lang><zh-CN>同次独立编译器arrays及实际生成rows。</zh-CN><en>Same-run independent compiler arrays and actually generated rows.</en></lang>
 * @returns {object} <lang><zh-CN>独立声明覆盖结果，runtimeStateVerified固定为false。</zh-CN><en>Separate declaration coverage, with runtimeStateVerified fixed to false.</en></lang>
 */
export function adoptDeclaredArrayMembers(base,{arrays,rows}) {
  // <lang><zh-CN>每个节点需要实际声明和内容，空列表不能按every的真值冒称通过。</zh-CN><en>Each node needs actual declarations and content; an empty list cannot pass through vacuous every results.</en></lang>
  const gaps=rows.filter(row=>
    row.status!=="associated" ||
    !row.declarations.length ||
    row.declarations.some(item=>!item.hasText||row.expectedCallable&&!item.hasSignature) ||
    !row.distinctLocaleText ||
    !row.sourceRangeVerified
  );
  // <lang><zh-CN>身份字段和分段路径共同限定边界，防止同名其它包或入口借用覆盖。</zh-CN><en>Identity fields and segmented paths jointly delimit boundaries, preventing coverage reuse across packages or entries.</en></lang>
  const sameIdentity=(left,right)=>left.package===right.package&&left.module===right.module&&left.name===right.name;
  const resolved=[];
  const boundaries=base.boundaries.filter(boundary=>{
    // <lang><zh-CN>仅当前唯一数组候选有资格核验，缺失或歧义保留原边界。</zh-CN><en>Only one current array candidate is eligible; missing or ambiguous candidates retain the original boundary.</en></lang>
    const matches=arrays.filter(array=>sameIdentity(array,boundary)&&isDeepStrictEqual(array.memberPath,boundary.memberPath));
    if(boundary.reason!=="array-elements"||matches.length!==1) return true;
    const array=matches[0];
    if(
      array.scope!=="declared-array-initializer" ||
      !array.sourceBytesVerified ||
      !array.slots.length ||
      array.boundaries.length ||
      !array.expectedPaths.length
    ) return true;
    // <lang><zh-CN>固定槽位索引须连续，所有期望路径须唯一，父对象节点也须在内容清单中。</zh-CN><en>Slot indices must be consecutive and expected paths unique; parent object nodes must also occur in the content inventory.</en></lang>
    const expected=new Set(array.expectedPaths.map(memberPath=>JSON.stringify(memberPath)));
    if(expected.size!==array.expectedPaths.length||array.slots.some((slot,index)=>!isDeepStrictEqual(slot.memberPath,[...array.memberPath,String(index)])||!expected.has(JSON.stringify(slot.memberPath)))) return true;
    // <lang><zh-CN>只取当前数组路径下的实际节点，额外、重复或缺失节点都会阻断。</zh-CN><en>Select actual nodes below this array only; extra, duplicate or missing nodes all block adoption.</en></lang>
    const candidates=rows.filter(row=>sameIdentity(row,array)&&array.memberPath.every((part,index)=>row.memberPath[index]===part));
    if(candidates.length!==expected.size||candidates.some(row=>gaps.includes(row)||!expected.has(JSON.stringify(row.memberPath)))||new Set(candidates.map(row=>JSON.stringify(row.memberPath))).size!==expected.size) return true;
    resolved.push(array);
    return false;
  });
  // <lang><zh-CN>父审核失败继续阻断，声明覆盖不提供模块初始化或宿主执行许可。</zh-CN><en>Parent audit failures remain blocking; declaration coverage grants neither module-initialization proof nor host execution authority.</en></lang>
  const inheritedFailures=[base.unverifiedSchemaBindings,base.unverifiedFrozenArrayBindings,base.unverifiedDescriptors,base.unverifiedDescriptorPaths].some(count=>count>0);
  return {
    ...base,
    boundaries,
    declaredArrayRows:rows,
    resolvedDeclaredArrays:resolved,
    declaredArrayAccessPaths:rows.length,
    declaredArrayCallablePaths:rows.filter(row=>row.expectedCallable).length,
    declaredArrayContentGaps:gaps.length,
    contentGaps:base.contentGaps+gaps.length,
    scope:"declared-array-initializer",
    runtimeStateVerified:false,
    complete:base.contentGaps===0&&gaps.length===0&&boundaries.length===0&&resolved.length===arrays.length&&!inheritedFailures
  };
}
