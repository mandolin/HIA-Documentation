/** @file @lang zh-CN 在保留原生结果的同时采用已实际核验的Schema数据，不合成原生正文。 @lang en Adopts actually verified Schema data while retaining native results, without synthesizing native prose. */
import { isDeepStrictEqual } from "node:util";

/**
 * @lang zh-CN 精确核原声明；旧值别名必须由同指针旧声明及当前覆盖历史共同证明。
 * @lang en Matches original declarations exactly; previous-value aliases require both the same-pointer predecessor declaration and current overwrite history.
 * @param {object} member <lang><zh-CN>独立编译器成员声明。</zh-CN><en>Independent compiler member declarations.</en></lang>
 * @param {object} value <lang><zh-CN>实际当前值来源。</zh-CN><en>Actual current-value provenance.</en></lang>
 * @param {object} [previous] <lang><zh-CN>已独立核JSON的前身值来源。</zh-CN><en>Predecessor provenance whose JSON was independently verified.</en></lang>
 * @returns {object} <lang><zh-CN>匹配结果及直接/旧值别名的关系种类。</zh-CN><en>Match result and direct/previous-alias relationship kinds.</en></lang>
 */
export function matchSchemaMemberDeclarations(member,value,previous) {
  /** @lang zh-CN 位置来自原始语法节点，名称相同不足以匹配。 @lang en Positions come from original syntax nodes; matching names are insufficient. */
  const matches=(declaration,origin)=>declaration.path===origin.path && declaration.kind===origin.kind && declaration.line===origin.range.start.line && declaration.column===origin.range.start.column;
  const current=value?[value.declaration??value.origin,...value.valueDeclarationSources]:[];
  const historyLinked=previous && value && previous.pointer===value.pointer && value.valueDeclarationSources.some(origin=>isDeepStrictEqual(origin,previous.declaration??previous.origin));
  const older=historyLinked?[previous.declaration??previous.origin,previous.origin,...previous.valueDeclarationSources]:[];
  const kinds=(member.declarations??[]).map(declaration=>current.some(origin=>matches(declaration,origin))?"direct":older.some(origin=>matches(declaration,origin))?"previous-value-alias":"unmatched");
  return {matches:kinds.length>0 && !kinds.includes("unmatched"),kinds};
}

/**
 * @lang zh-CN 组合固定生成链的原生和Schema审核事实，原生结果保持独立，缺证据和未核类型继续阻断。
 * @lang en Combines native and Schema audit facts from fixed producer chains, retaining independent native results and blocking missing evidence or unverified types.
 * @param {object} input <lang><zh-CN>当前实际成员/边界、实际Schema报告及原生来源字节记录；命令不接受外部报告替换。</zh-CN><en>Current actual members/boundaries, actual Schema report and native source-byte records; commands do not accept external report substitution.</en></lang>
 * @returns {object} <lang><zh-CN>内容和边界的显式组合结果，完整性仅限当前成员审核范围。</zh-CN><en>Explicit combined content/boundary results, with completeness limited to this member audit scope.</en></lang>
 */
export function adoptSchemaResourceMembers({memberRows,boundaries,schemaReport,sourceRecords}) {
  /** @lang zh-CN 根身份包括包、模块和导出，避免跨别名或跨文件误配。 @lang en Root identity includes package, module and export to prevent alias/file mismatches. */
  const key=row=>JSON.stringify([row.package,row.module,row.name]);
  const byRoot=new Map();
  for(const row of schemaReport.rows) {
    const id=key(row);
    if(!byRoot.has(id))byRoot.set(id,[]);
    byRoot.get(id).push(row);
  }
  /** @lang zh-CN 数据事实必须有三个实际工件及非歧义来源，不能只凭成功布尔值采用。 @lang en Data facts need three actual artifacts and unambiguous sources; a success boolean alone is insufficient. */
  function schemaFor(row) {
    const candidates=byRoot.get(key(row))??[];
    if(candidates.length!==1)return;
    const schema=candidates[0];
    if(schema.status!=="associated" || !schema.generated?.documentId || !schema.generated?.mapId || schema.generated.hashes?.length!==3 || schema.generated.hashes.some(hash=>!/^[a-f0-9]{64}$/.test(hash)) || !schema.sources?.length)return;
    const linked=schema.sources.flatMap(source=>sourceRecords.filter(record=>record.source===source.path).map(record=>({source,record})));
    if(!linked.length || linked.some(({source,record})=>record.status!=="success" || record.sha256!==source.sha256))return;
    return schema;
  }
  /** @lang zh-CN 成员原声明必须仍由成功原生来源的相同字节支撑。 @lang en Original member declarations must still be backed by identical bytes from successful native source production. */
  function sameInputs(row,schema) {
    return row.originalDeclarations?.length>0 && row.originalDeclarations.every(declaration=>{
      if(typeof declaration.path!=="string" || !declaration.path)return false;
      const source=`HIA/${row.owner}/${declaration.path}`;
      const native=sourceRecords.filter(record=>record.source===source);
      const expected=schema.sources.filter(record=>record.path===source);
      // <lang><zh-CN>JSON原声明由实际JSONdoc生成核验，不要求不适用的JSDoc任务；真实失败记录仍拒绝。</zh-CN><en>Original JSON declarations are verified by actual JSONdoc production, without requiring an inapplicable JSDoc task; real failure records still reject adoption.</en></lang>
      if(declaration.path.endsWith(".json"))return native.length===0 && expected.length===1 && schema.resource?.source===source && schema.resource.sha256===expected[0].sha256;
      return native.length===1 && native[0].status==="success" && expected.length===1 && native[0].sha256===expected[0].sha256;
    });
  }
  const rows=memberRows.map(row=>{
    const nativeComplete=row.status==="associated" && row.declarations.length>0 && row.declarations.every(item=>item.hasText) && (!row.expectedCallable || row.declarations.every(item=>item.hasSignature));
    if(nativeComplete)return {...row,evidenceKind:"native-jsdoc",contentVerified:true};
    const schema=schemaFor(row);
    const match=schema?.members.filter(item=>isDeepStrictEqual(item.memberPath,row.memberPath))??[];
    const jsonOnly=row.originalDeclarations?.length>0 && row.originalDeclarations.every(declaration=>typeof declaration.path==="string" && declaration.path.endsWith(".json"));
    const eligible=!row.expectedCallable && !(row.gaps??[]).some(gap=>gap.reason!=="missing-native-declaration" && !(jsonOnly && gap.reason==="missing-or-failed-production" && row.originalDeclarations.some(declaration=>gap.source===`HIA/${row.owner}/${declaration.path}`)));
    const accepted=eligible && schema && sameInputs(row,schema) && match.length===1 && match[0].declarationsMatch && isDeepStrictEqual(match[0].originalDeclarations,row.originalDeclarations) && Boolean(match[0].symbolId);
    return {...row,evidenceKind:accepted?"schema-resource":"unverified",contentVerified:Boolean(accepted),...(accepted?{schemaEvidence:{schemaId:schema.schemaId,resource:schema.resource,pointer:match[0].pointer,symbolId:match[0].symbolId,declarationSource:match[0].declarationSource,declarationMatchKinds:match[0].declarationMatchKinds??[]}}:{})};
  });
  const remaining=[];
  const resolvedArrayBoundaries=[];
  for(const boundary of boundaries) {
    const schema=schemaFor(boundary);
    const matches=schema?.boundaryPointers.filter(item=>isDeepStrictEqual(item.memberPath,boundary.memberPath) && item.reason===boundary.reason)??[];
    if(boundary.reason==="array-elements" && matches.length===1 && matches[0].valueType==="array" && matches[0].symbolId && matches[0].subtreeValues>0) resolvedArrayBoundaries.push({...boundary,pointer:matches[0].pointer,symbolId:matches[0].symbolId,values:matches[0].subtreeValues});
    else remaining.push(boundary);
  }
  const contentGaps=rows.filter(row=>!row.contentVerified).length;
  return {accessPaths:rows.length,nativePaths:rows.filter(row=>row.evidenceKind==="native-jsdoc").length,schemaResourcePaths:rows.filter(row=>row.evidenceKind==="schema-resource").length,contentGaps,rows,boundaries:remaining,resolvedArrayBoundaries,unverifiedSchemaBindings:schemaReport.unverifiedBindings,complete:contentGaps===0 && remaining.length===0 && schemaReport.unverifiedBindings===0};
}
