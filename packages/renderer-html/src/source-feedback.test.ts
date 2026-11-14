/**
 * @file
 * @lang zh-CN 来源异常反馈沿已确认状态，区分未提供、许可拒绝、缺失和读取失败并保留文档正文。
 * @lang en Source-error feedback follows confirmed states, distinguishing absent input, denied authority, missing assets and read failures while retaining documentation prose.
 */
import {describe,expect,it} from "vitest";
import {renderProjectHtmlDocument,type RenderProjectHtmlInput} from "./index.js";

describe("source availability feedback",()=>{
  it("uses fixed public HTTP and network feedback from the actual generated reader",async()=>{
    // <lang><zh-CN>从真实入口HTML抽取未改写的reader，宿主替身只提供失败前必要的DOM与网络边界。</zh-CN><en>Extract the unchanged reader from actual entry HTML; host doubles supply only the DOM and network boundaries needed before failure.</en></lang>
    const rendered=renderProjectHtmlDocument({project:{name:"Source failures"},entries:[{id:"public:failure",name:"Failure probe",kind:"function",view:"js"}]});
    const html=rendered.files.find(file=>file.path==="index.html")!.contents;
    const reader=html.slice(html.indexOf("  const sourceControllers ="),html.indexOf("  function bindSourceFetch("));
    expect(reader).toContain("async function loadSourceFetch");
    for(const [httpStatus,expected] of [[401,"denied"],[403,"denied"],[404,"not-found"],[500,"network-error"],[0,"network-error"]] as const) {
      // <lang><zh-CN>合成敏感标记只用于探针，状态文本及诊断属性不得回显该标记。</zh-CN><en>The synthetic sensitive marker exists only in the probe and must never appear in status text or diagnostic attributes.</en></lang>
      const status={hidden:true,dataset:{} as Record<string,string>,textContent:""};
      const details={dataset:{hiaSourceFetch:"sources/public.txt",hiaSourceState:"idle"},toggleAttribute:()=>{},querySelector:(selector:string)=>selector==="[data-hia-source-fetch-status]"?status:null};
      const fetch=async()=>{
        if(httpStatus===0) throw new Error("RT10_SYNTHETIC_DETAIL");
        return {ok:false,status:httpStatus,statusText:"RT10_SYNTHETIC_DETAIL"};
      };
      const load=new Function("fetch","document","location",reader+"return loadSourceFetch;")(fetch,{baseURI:"https://public.example/docs/"},{origin:"https://public.example"}) as (value:unknown)=>Promise<void>;
      await load(details);
      expect(details.dataset.hiaSourceState).toBe(expected);
      expect(status.textContent).not.toContain("RT10_SYNTHETIC_DETAIL");
      expect(status.dataset.hiaUiValues).toBeUndefined();
    }
  });

  it.each([
    ["HIA_CLI_SOURCE_NOT_AUTHORIZED","denied","源码请求被拒绝。","Source request denied."],
    ["HIA_CLI_SOURCE_NOT_FOUND","not-found","源码资源不存在。","Source asset was not found."],
    ["HIA_CLI_SOURCE_READ_FAILED","network-error","源码暂时无法读取。","Source is temporarily unavailable."],
    [undefined,"unavailable","此条目未提供可公开的源码。","This entry has no public source excerpt."]
  ])("renders the %s state in both locales without fetching or losing prose",(code,state,chinese,english)=>{
    // <lang><zh-CN>输入诊断仅用既有开放诊断字段，renderer不据诊断授予读文件或网络权限。</zh-CN><en>Input diagnostics use existing open diagnostic fields; diagnostics grant the renderer no file or network authority.</en></lang>
    const input:RenderProjectHtmlInput={project:{name:"Public source states"},entries:[{id:"public:alert",name:"Alert",kind:"html-component",view:"html",summary:"Readable public documentation.",...(code?{source:{path:"public.html"},diagnostics:[{code,message:"Public diagnostic.",severity:"info" as const}]}:{})}]};
    for(const [locale,message] of [["zh-CN",chinese],["en",english]]) {
      // <lang><zh-CN>显式阅读信息架构覆盖交互片段及无脚本独立页，两者须显示同一来源事实。</zh-CN><en>Explicit reading IA covers interactive fragments and script-free standalone pages, both showing the same source facts.</en></lang>
      const result=renderProjectHtmlDocument(input,{locale,projectSite:{uiLocale:locale as "zh-CN"|"en",informationArchitecture:{contentGrouping:"entry",loadingStrategy:"lazy",memberPlacement:"separate"}}});
      const pages=result.files.filter(file=>file.path.includes("public-alert") && file.path.endsWith(".html"));
      expect(pages.length).toBeGreaterThan(1);
      for(const page of pages.filter(file=>!file.path.startsWith("pages/zh-CN/")&&!file.path.startsWith("pages/en/"))) {
        expect(page.contents).toContain(`data-hia-source-state="${state}"`);
        expect(page.contents).toContain(message);
        if(code) {
          expect(page.contents).toContain(`data-hia-source-diagnostic="${code}"`);
          expect(page.contents).not.toContain("Public diagnostic.");
        }
        expect(page.contents).toContain("Readable public documentation.");
        expect(page.contents).not.toContain("data-hia-source-fetch=");
      }
    }
  });
  it("retains independent diagnostics while displaying source feedback once",()=>{
    // <lang><zh-CN>来源提示已承载拒绝事实及公开代码，独立业务诊断仍须显示完整正文。</zh-CN><en>The source notice carries refusal facts and the public code; independent domain diagnostics must still show complete prose.</en></lang>
    const result=renderProjectHtmlDocument({project:{name:"Independent diagnostics"},entries:[{id:"public:diagnostics",name:"Alert",kind:"html-component",view:"html",source:{path:"public.html"},diagnostics:[{code:"HIA_CLI_SOURCE_NOT_AUTHORIZED",message:"Repeated source detail.",severity:"info"},{code:"PUBLIC_OTHER",message:"Independent public diagnostic.",severity:"warning"}]}]},{projectSite:{uiLocale:"en",informationArchitecture:{contentGrouping:"entry",loadingStrategy:"lazy",memberPlacement:"separate"}}});
    const entry=result.files.find(file=>file.path.startsWith("entries/"))!.contents;
    expect(entry).toContain('data-hia-source-diagnostic="HIA_CLI_SOURCE_NOT_AUTHORIZED"');
    expect(entry).not.toContain("Repeated source detail.");
    expect(entry).toContain("Independent public diagnostic.");
  });
});
