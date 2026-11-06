/**
 * @file
 * @lang zh-CN 声明数组采用的缺节点、错配和旧层保持反例。
 * @lang en Regressions for missing declarations, mismatched arrays and preserved legacy layers.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {adoptDeclaredArrayMembers} from "./lib/declared-array-adoption.mjs";

/**
 * @lang zh-CN 返回中性编译器/实际文档形状，单个父节点和钩子构成完整槽位。
 * @lang en Returns neutral compiler/document shapes, with a parent and hook forming one complete slot.
 * @returns {object} <lang><zh-CN>相互独立的原层、数组和节点期望。</zh-CN><en>Independent base, array and node expectations.</en></lang>
 */
function fixture() {
  // <lang><zh-CN>身份精确到包、入口及公开根，路径不能跨根相互借用。</zh-CN><en>Identity includes package, entry and public root; paths cannot borrow coverage across roots.</en></lang>
  const identity={package:"@example/plugin",module:"index.cjs",name:"api"};
  const rows=[["plugins","0"],["plugins","0","run"]].map((memberPath,index)=>({...identity,memberPath,status:"associated",expectedCallable:index===1,distinctLocaleText:true,sourceRangeVerified:true,declarations:[{hasText:true,hasSignature:index===1}]}));
  return {base:{contentGaps:0,boundaries:[{...identity,memberPath:["plugins"],reason:"array-elements"}],complete:false},arrays:[{...identity,memberPath:["plugins"],scope:"declared-array-initializer",sourceBytesVerified:true,mutable:true,slots:[{memberPath:["plugins","0"]}],boundaries:[],expectedPaths:rows.map(row=>row.memberPath)}],rows};
}

test("complete declared slots resolve only their own old boundary",()=>{
  const input=fixture();
  const before=structuredClone(input);
  const result=adoptDeclaredArrayMembers(input.base,input);
  assert.equal(result.complete,true);
  assert.equal(result.declaredArrayAccessPaths,2);
  assert.equal(result.declaredArrayCallablePaths,1);
  assert.equal(result.runtimeStateVerified,false);
  assert.deepEqual(result.boundaries,[]);
  assert.deepEqual(input,before);
});

test("missing, duplicate, foreign and extra node paths cannot resolve a boundary",()=>{
  for(const kind of ["missing","duplicate","foreign","extra"]){
    const input=fixture();
    if(kind==="missing") input.rows.pop();
    if(kind==="duplicate") input.rows.push({...input.rows[0]});
    if(kind==="foreign") input.rows[1].module="other.cjs";
    if(kind==="extra") input.rows.push({...input.rows[1],memberPath:["plugins","0","unknown"]});
    assert.equal(adoptDeclaredArrayMembers(input.base,input).boundaries.length,1,kind);
  }
});

test("missing prose, signatures, distinct locale fields or exact ranges remain gaps",()=>{
  for(const kind of ["prose","signature","locale","range","declaration"]){
    const input=fixture();
    if(kind==="prose") input.rows[1].declarations[0].hasText=false;
    if(kind==="signature") input.rows[1].declarations[0].hasSignature=false;
    if(kind==="locale") input.rows[1].distinctLocaleText=false;
    if(kind==="range") input.rows[1].sourceRangeVerified=false;
    if(kind==="declaration") input.rows[1].declarations=[];
    const result=adoptDeclaredArrayMembers(input.base,input);
    assert.equal(result.complete,false,kind);
    assert.equal(result.boundaries.length,1,kind);
  }
});

test("wrong scope, unknown inner boundaries and mismatched slots remain unverified",()=>{
  for(const kind of ["scope","bytes","inner","slots","empty"]){
    const input=fixture();
    if(kind==="scope") input.arrays[0].scope="runtime-state";
    if(kind==="bytes") input.arrays[0].sourceBytesVerified=false;
    if(kind==="inner") input.arrays[0].boundaries.push({memberPath:["plugins","0","unknown"],reason:"dynamic-type"});
    if(kind==="slots") input.arrays[0].slots[0].memberPath=["plugins","3"];
    if(kind==="empty") input.arrays[0].expectedPaths=[];
    assert.equal(adoptDeclaredArrayMembers(input.base,input).complete,false,kind);
  }
});

test("inherited resource failures and unrelated boundaries remain strict",()=>{
  const input=fixture();
  input.base.unverifiedDescriptors=1;
  assert.equal(adoptDeclaredArrayMembers(input.base,input).complete,false);
  input.base.boundaries.push({...input.base.boundaries[0],name:"other"});
  assert.equal(adoptDeclaredArrayMembers(input.base,input).boundaries.length,1);
});
