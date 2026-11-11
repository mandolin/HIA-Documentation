/**
 * @file
 * @lang zh-CN 真实CLI跨文档身份、旧去重和页面/来源隔离验收。
 * @lang en Actual CLI acceptance for cross-document identity, legacy deduplication, page and provenance isolation.
 */
import {mkdtemp, readFile, writeFile, rm, access} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {expect, it} from "vitest";
import {createHiaDocument, HIA_SOURCE_MODEL, HIA_SOURCE_MODEL_VERSION} from "@hia-doc/core";
import {runCli} from "./index.js";

/**
 * @lang zh-CN 创建具备同名父子及独立原声明的合成文档。
 * @lang en Create a synthetic document with equal parent/child IDs and an independent declaration origin.
 */
function document(owner:string) {
  return createHiaDocument({id:`document:${owner}`,symbols:[
    {id:"class:Container",name:owner+"Container",kind:"class"},
    {id:"function:run",name:owner+"Run",kind:"function",parentId:"class:Container",signature:owner+"Only()",source:{
      model:HIA_SOURCE_MODEL,modelVersion:HIA_SOURCE_MODEL_VERSION,mode:"link",
      definedIn:{kind:"defined-in",relativePath:owner+".mjs",language:"javascript",position:{line:1}}
    }}
  ]});
}

// <lang><zh-CN>本例连续执行两次完整CLI构建及文件复核，按现有单次CLI十五秒预算设置三十秒总时限，覆盖Windows冷启动与并发文件I/O。</zh-CN><en>This case performs two complete CLI builds and file checks; use a thirty-second total budget aligned with the existing fifteen-second single-CLI budget for Windows cold starts and concurrent file I/O.</en></lang>
it("retains scoped duplicate native IDs with isolated members and stable opaque entry IDs", async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"hia-project-scopes-"));
  const messages:string[]=[];
  try {
    await writeFile(path.join(root,"a.json"),JSON.stringify(document("Alpha")));
    await writeFile(path.join(root,"b.json"),JSON.stringify(document("Beta")));
    await writeFile(path.join(root,"config.json"),JSON.stringify({schemaVersion:"0.1.0",docs:{renderer:{uiLocale:"en",projectLayout:"split-site",informationArchitecture:{contentGrouping:"entry",loadingStrategy:"lazy",memberPlacement:"separate"}}}}));
    const inputs=[{kind:"hia-document",path:"a.json",identityScope:"owner:alpha"},{kind:"hia-document",path:"b.json",identityScope:"owner:beta"}];
    const results=[];
    for(const [index,selected]of [inputs,[...inputs].reverse()].entries()) {
      await writeFile(path.join(root,"project.json"),JSON.stringify({schemaVersion:"1.1.0",project:{name:"Fixture"},inputs:selected}));
      const out=path.join(root,"out-"+index);
      const code=await runCli(["docs","build","--config","config.json","--project-manifest","project.json","--out",out],{cwd:root,stdout:text=>messages.push(text),stderr:text=>messages.push(text)});
      expect(code,messages.join("\n")).toBe(0);
      const result=JSON.parse(await readFile(path.join(out,"project-index.json"),"utf8"));
      expect(result.contractVersion).toBe("0.2.0-draft");
      expect(result.entries).toHaveLength(4);
      expect(new Set(result.entries.map((entry:any)=>entry.id)).size).toBe(4);
      for(const entry of result.entries.filter((item:any)=>item.symbolId==="class:Container")) {
        const own=entry.identityScope==="owner:alpha"?"Alpha":"Beta";
        const other=own==="Alpha"?"Beta":"Alpha";
        const html=await readFile(path.join(out,entry.contentPath),"utf8");
        expect(html).toContain(own+"Run");
        expect(html).not.toContain(other+"Run");
      }
      results.push(result.entries.map((entry:any)=>[entry.identityScope,entry.symbolId,entry.id]).sort());
    }
    expect(results[0]).toEqual(results[1]);
  } finally {await rm(root,{recursive:true,force:true});}
}, 30_000);

it.each(["1.0.0", "1.1.0"])("retains identical canonical declarations under %s", async (schemaVersion) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-identical-origin-"));
  const messages: string[] = [];
  try {
    await writeFile(path.join(root, "doc.json"), JSON.stringify(document("Alpha")));
    const input = {kind: "hia-document", path: "doc.json", identityScope: "owner:alpha"};
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion, project: {name: "Fixture"}, inputs: [input, input]}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code, messages.join("\n")).toBe(0);
    const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
    expect(index.entries).toHaveLength(2);
    expect(index.contractVersion).toBe(schemaVersion === "1.1.0" ? "0.2.0-draft" : "0.1.0-draft");
    expect(index.entries[0].identityScope).toBe(schemaVersion === "1.1.0" ? "owner:alpha" : undefined);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

/**
 * @lang zh-CN 构造同原生符号及相同相对路径、不同声明行的地图，检测作用域串联。
 * @lang en Construct equal native IDs and relative paths at different declaration lines to detect cross-scope joins.
 */
function sourceMap(line: number) {
  return {
    contract: "doc-source-map", contractVersion: "0.1.0-draft", id: "map:run",
    producer: {name: "fixture", version: "0.1.0"},
    artifacts: [{id: "artifact:run", path: "dist/run.js", language: "javascript"}],
    sources: [{id: "source:run", path: "src/run.ts", language: "typescript", sourcesContentPolicy: "none"}],
    sourceMaps: [], chains: [],
    entries: [{id: "entry:run", kind: "symbol", symbolId: "function:run",
      sourceRefs: [{sourceId: "source:run", range: {start: {line, column: 1}, end: {line, column: 8}}, rangeSource: "parser", confidence: "high"}],
      artifactRefs: [{artifactId: "artifact:run", confidence: "high"}], diagnostics: []}],
    privacy: {sourcesContentPolicy: "none", allowAbsolutePaths: false, allowUncPaths: false, allowPathTraversal: false}, diagnostics: []
  };
}

it("inherits scopes through producer results and isolates maps and path relations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-scoped-maps-"));
  const messages: string[] = [];
  try {
    for (const [owner, line] of [["Alpha", 7], ["Beta", 29]] as const) {
      await writeFile(path.join(root, owner + ".json"), JSON.stringify(document(owner)));
      await writeFile(path.join(root, owner + ".map.json"), JSON.stringify(sourceMap(line)));
      await writeFile(path.join(root, owner + ".result.json"), JSON.stringify({
        contract: "documentation-producer-result", contractVersion: "0.1.0-draft",
        producer: {id: "fixture", version: "0.1.0"}, status: "success", diagnostics: [],
        artifacts: [
          {id: "document", kind: "hia-document", path: owner + ".json", contract: "hia-core-document", contractVersion: "0.2.0"},
          {id: "map", kind: "doc-source-map", path: owner + ".map.json", contract: "doc-source-map", contractVersion: "0.1.0-draft"}
        ]
      }));
    }
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion: "1.1.0", project: {name: "Fixture"}, inputs:
      ["Alpha", "Beta"].map(owner => ({kind: "documentation-producer-result", path: owner + ".result.json", domain: "other", identityScope: "owner:" + owner.toLowerCase()}))}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code, messages.join("\n")).toBe(0);
    const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
    for (const entry of index.entries.filter((item: any) => item.symbolId === "function:run")) {
      expect(entry.docSourceMap.sourceRange.start.line).toBe(entry.identityScope === "owner:alpha" ? 7 : 29);
    }
    const artifactNodes = index.relationGraph.nodes.filter((item: any) => item.kind === "artifact");
    expect(artifactNodes).toHaveLength(2);
    expect(new Set(artifactNodes.map((item: any) => item.id)).size).toBe(2);
    expect(index.relationGraph.nodes.filter((item: any) => item.kind === "source" && item.path === "src/run.ts")).toHaveLength(2);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

it.each([false, true])("requires map domain evidence for equal scoped IDs across views, explicit=%s", async explicit => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-scoped-views-"));
  const messages: string[] = [];
  try {
    const inputs = [];
    for (const [owner, domain, line] of [["Alpha", "js", 7], ["Beta", "css", 29]] as const) {
      await writeFile(path.join(root, owner + ".json"), JSON.stringify(document(owner)));
      await writeFile(path.join(root, owner + ".map.json"), JSON.stringify(sourceMap(line)));
      inputs.push({kind: "hia-document", path: owner + ".json", domain, identityScope: "owner:shared"});
      inputs.push({kind: "doc-source-map", path: owner + ".map.json", domain: explicit ? domain : "other", identityScope: "owner:shared"});
    }
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion: "1.1.0", project: {name: "Fixture"}, inputs}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code, messages.join("\n")).toBe(explicit ? 0 : 1);
    if (explicit) {
      const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
      for (const entry of index.entries.filter((item: any) => item.symbolId === "function:run")) {
        expect(entry.docSourceMap.sourceRange.start.line).toBe(entry.view === "js" ? 7 : 29);
      }
    } else {
      expect(messages.join("\n")).toContain("HIA_CLI_PROJECT_SOURCE_MAP_AMBIGUOUS");
    }
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

it("rejects conflicting scoped maps before creating output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-ambiguous-maps-"));
  const messages: string[] = [];
  try {
    await writeFile(path.join(root, "doc.json"), JSON.stringify(document("Alpha")));
    await writeFile(path.join(root, "a.map.json"), JSON.stringify(sourceMap(7)));
    await writeFile(path.join(root, "b.map.json"), JSON.stringify(sourceMap(29)));
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion: "1.1.0", project: {name: "Fixture"}, inputs: [
      {kind: "hia-document", path: "doc.json", identityScope: "owner:alpha"},
      ...["a", "b"].map(name => ({kind: "doc-source-map", path: name + ".map.json", identityScope: "owner:alpha"}))
    ]}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain("HIA_CLI_PROJECT_SOURCE_MAP_AMBIGUOUS");
    await expect(access(path.join(root, "out/project-index.json"))).rejects.toThrow();
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

it("isolates .NET declaration relations with the same native symbol ID", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-scoped-dotnet-"));
  const messages: string[] = [];
  try {
    const inputs = [];
    for (const owner of ["Alpha", "Beta"]) {
      await writeFile(path.join(root, owner + ".json"), JSON.stringify(document(owner)));
      await writeFile(path.join(root, owner + ".relation.json"), JSON.stringify({relations: [{
        hiaSymbol: {id: "function:run"}, declaration: {path: owner + ".cs", language: "csharp", range: {start: {line: 3}, end: {line: 5}}}
      }]}));
      await writeFile(path.join(root, owner + ".result.json"), JSON.stringify({
        contract: "documentation-producer-result", contractVersion: "0.1.0-draft", producer: {id: "fixture", version: "0.1.0"},
        status: "success", diagnostics: [], artifacts: [
          {id: "document", kind: "hia-document", path: owner + ".json"},
          {id: "relation", kind: "dotnetdoc-source-relation", path: owner + ".relation.json"}
        ]
      }));
      inputs.push({kind: "documentation-producer-result", path: owner + ".result.json", domain: "dotnet", identityScope: "owner:" + owner.toLowerCase()});
    }
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion: "1.1.0", project: {name: "Fixture"}, inputs}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code, messages.join("\n")).toBe(0);
    const index = JSON.parse(await readFile(path.join(root, "out/project-index.json"), "utf8"));
    for (const entry of index.entries.filter((item: any) => item.symbolId === "function:run")) {
      expect(entry.source.path).toBe(entry.identityScope === "owner:alpha" ? "Alpha.cs" : "Beta.cs");
    }
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

it("rejects unscoped equal IDs with different declarations instead of discarding content",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"hia-project-ambiguous-"));
  const messages:string[]=[];
  try {
    await writeFile(path.join(root,"a.json"),JSON.stringify(document("Alpha")));
    await writeFile(path.join(root,"b.json"),JSON.stringify(document("Beta")));
    await writeFile(path.join(root,"project.json"),JSON.stringify({schemaVersion:"1.0.0",project:{name:"Fixture"},inputs:[{kind:"hia-document",path:"a.json"},{kind:"hia-document",path:"b.json"}]}));
    const code=await runCli(["docs","build","--project-manifest","project.json","--out","out"],{cwd:root,stdout:text=>messages.push(text),stderr:text=>messages.push(text)});
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain("HIA_CLI_PROJECT_SYMBOL_ID_AMBIGUOUS");
  } finally {await rm(root,{recursive:true,force:true});}
});

it("rejects matching prose in independent documents when declaration origins are absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-missing-origins-"));
  const messages: string[] = [];
  try {
    const data = createHiaDocument({id: "fixture", symbols: [{id: "shared", name: "Shared", kind: "class"}]});
    for (const name of ["a", "b"]) await writeFile(path.join(root, name + ".json"), JSON.stringify(data));
    await writeFile(path.join(root, "project.json"), JSON.stringify({schemaVersion: "1.0.0", project: {name: "Fixture"}, inputs:
      ["a", "b"].map(name => ({kind: "hia-document", path: name + ".json"}))}));
    const code = await runCli(["docs", "build", "--project-manifest", "project.json", "--out", "out"], {cwd: root, stdout: text => messages.push(text), stderr: text => messages.push(text)});
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain("HIA_CLI_PROJECT_SYMBOL_ID_AMBIGUOUS");
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
