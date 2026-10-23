/**
 * @file
 * @lang zh-CN 生产器稳定候选的双版本、无损返回、隐私与中止回归；历史期望独立于当前常量。
 * @lang en Dual-version, lossless-return, privacy and cancellation regressions for producer contract candidates; historical expectations are independent of current constants.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  defineDocumentationProducer,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA,
  runDocumentationProducer,
  validateDocumentationProducerDescriptor,
  validateDocumentationProducerRequest,
  validateDocumentationProducerResult,
  type DocumentationProducerDescriptor,
  type DocumentationProducerRequest,
  type DocumentationProducerResult
} from "./index.js";

/**
 * @lang zh-CN 读取固定历史样本并仅替换本契约版本，不重写 producer/artifact 身份。
 * @lang en Reads a fixed historical sample and replaces only its own contract version, preserving producer and artifact identities.
 * @param kind <lang><zh-CN>描述或结果样本。</zh-CN><en>Descriptor or result sample.</en></lang>
 * @param version <lang><zh-CN>本测试显式要求的精确版本。</zh-CN><en>Exact version explicitly required by the test.</en></lang>
 * @returns <lang><zh-CN>可独立修改的合成对象。</zh-CN><en>Independently mutable synthetic object.</en></lang>
 */
function fixture(kind: "descriptor" | "result", version: string): any {
  // <lang><zh-CN>样本是已提交的公开历史 JSON；每次读取避免跨测试共享可变状态。</zh-CN><en>The sample is committed public historical JSON; each read avoids mutable state shared across tests.</en></lang>
  const value = JSON.parse(readFileSync(new URL(`../../../fixtures/producer/basic.producer-${kind}.json`, import.meta.url), "utf8"));
  value.contractVersion = version;
  return value;
}

// <lang><zh-CN>绝对根只存在于内存请求，relative input 不指向真实私有材料。</zh-CN><en>Absolute roots exist only in the in-memory request; the relative input names no real private material.</en></lang>
const request: DocumentationProducerRequest = { workspaceRoot: process.cwd(), outputDirectory: process.cwd(), inputs: [{ kind: "fixture-source", path: "src/public.fixture" }] };

describe("producer 1.0.0 candidate compatibility", () => {
  it("publishes new exact schema identities with closed roots", () => {
    for (const [key, schema] of [["documentation-producer", DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA], ["documentation-producer-result", DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA]] as const) {
      expect(schema.$id).toBe(`https://mandolin.github.io/HIA-Documentation/schemas/${key}-1.0.0.schema.json`);
      expect(schema.properties.contractVersion.const).toBe("1.0.0");
      expect(schema.additionalProperties).toBe(false);
    }
  });

  it.each(["1.0.0", "0.1.0-draft"])("validates exact version %s without rewriting input", (version) => {
    // <lang><zh-CN>独立序列化基线同时约束 validator 的纯数据行为。</zh-CN><en>An independent serialized baseline also constrains the validator's data-only behavior.</en></lang>
    const descriptor = fixture("descriptor", version);
    const result = fixture("result", version);
    const before = JSON.stringify({ descriptor, result });
    expect(validateDocumentationProducerDescriptor(descriptor)).toEqual([]);
    expect(validateDocumentationProducerResult(result, { descriptor })).toEqual([]);
    expect(JSON.stringify({ descriptor, result })).toBe(before);
  });

  it.each(["1.0.1", "1.1.0", "2.0.0", "1.0.0-rc.1", "1.0.0+build", "^1.0.0"])("rejects unnegotiated version %s", (version) => {
    expect(validateDocumentationProducerDescriptor(fixture("descriptor", version)).some(({ code }) => code === "DOCUMENTATION_PRODUCER_CONTRACT_UNSUPPORTED")).toBe(true);
    expect(validateDocumentationProducerResult(fixture("result", version)).some(({ code }) => code === "DOCUMENTATION_PRODUCER_CONTRACT_UNSUPPORTED")).toBe(true);
  });

  it.each([["1.0.0", "1.0.0"], ["1.0.0", "0.1.0-draft"], ["0.1.0-draft", "1.0.0"], ["0.1.0-draft", "0.1.0-draft"]])("preserves a validated %s descriptor / %s result", async (descriptorVersion, resultVersion) => {
    // <lang><zh-CN>wire版本与producer自身版本分别核对，不因描述版本不同就改写返回artifact契约。</zh-CN><en>Check wire and producer versions separately; a different descriptor version must not rewrite returned artifact contracts.</en></lang>
    const descriptor = fixture("descriptor", descriptorVersion) as DocumentationProducerDescriptor;
    const expected = fixture("result", resultVersion) as DocumentationProducerResult;
    const before = JSON.stringify(expected);
    const producer = defineDocumentationProducer({ descriptor, produce: vi.fn(async () => expected) });
    const result = await runDocumentationProducer(producer, request);
    expect(result).toBe(expected);
    expect(JSON.stringify(result)).toBe(before);
  });

  it("creates SDK-owned failures with the current version without invoking invalid requests", async () => {
    // <lang><zh-CN>SDK自己的writer写新版本；旧producer的有效返回仍由上面的无损正例约束。</zh-CN><en>The SDK's own writer emits the new version; valid legacy producer returns remain covered by lossless positive controls above.</en></lang>
    const produce = vi.fn(async () => fixture("result", "0.1.0-draft"));
    const producer = defineDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce });
    const result = await runDocumentationProducer(producer, { ...request, inputs: [{ kind: "fixture-source", path: "../private.fixture" }] });
    expect(produce).not.toHaveBeenCalled();
    expect(result.contractVersion).toBe("1.0.0");
    expect(result.status).toBe("failed");
    expect(validateDocumentationProducerResult(result)).toEqual([]);
  });
});

describe("producer execution boundaries", () => {
  it("keeps admitted identity safe if the producer mutates its descriptor before throwing", async () => {
    // <lang><zh-CN>模块可变配置不能把未验证的私有身份写进SDK自建失败结果。</zh-CN><en>Mutable module configuration must not insert an unvalidated private identity into an SDK-created failure result.</en></lang>
    const descriptor = fixture("descriptor", "0.1.0-draft") as DocumentationProducerDescriptor;
    const initialId = descriptor.id;
    const producer = defineDocumentationProducer({ descriptor, produce: async () => { descriptor.id = "C:\\private\\secret-marker"; throw new Error("private"); } });
    const result = await runDocumentationProducer(producer, request);
    expect(result.status).toBe("failed");
    expect(result.producer.id).toBe(initialId);
    expect(JSON.stringify(result)).not.toContain("secret-marker");
    expect(validateDocumentationProducerResult(result)).toEqual([]);
  });
  it("compares results against the descriptor admitted before execution", async () => {
    // <lang><zh-CN>执行中把描述和返回同时改为另一身份，不应绕过最初调用的身份约束。</zh-CN><en>Changing both descriptor and return identity during execution must not bypass the original invocation's identity constraint.</en></lang>
    const descriptor = fixture("descriptor", "0.1.0-draft") as DocumentationProducerDescriptor;
    const producer = defineDocumentationProducer({ descriptor, produce: async () => { descriptor.id = "changed-producer"; const result = fixture("result", "0.1.0-draft"); result.producer.id = descriptor.id; return result; } });
    const result = await runDocumentationProducer(producer, request);
    expect(result.status).toBe("failed");
    expect(result.diagnostics.map(({ code }) => code)).toContain("DOCUMENTATION_PRODUCER_IDENTITY_MISMATCH");
    expect(result.producer.id).toBe("fixture-doc");
  });
  it("does not accept output kinds added to a mutable descriptor during execution", async () => {
    // <lang><zh-CN>允许类目数组必须独立保存，浅拷贝整个描述仍会共享原数组。</zh-CN><en>Admitted kind arrays need independent copies; a shallow copy of the descriptor alone would still share the original arrays.</en></lang>
    const descriptor = fixture("descriptor", "0.1.0-draft") as DocumentationProducerDescriptor;
    const producer = defineDocumentationProducer({ descriptor, produce: async () => { descriptor.outputKinds.push("late-output"); const result = fixture("result", "0.1.0-draft"); result.artifacts[0].kind = "late-output"; return result; } });
    const result = await runDocumentationProducer(producer, request);
    expect(result.status).toBe("failed");
    expect(result.diagnostics.map(({ code }) => code)).toContain("DOCUMENTATION_PRODUCER_OUTPUT_KIND_UNDECLARED");
  });
  it.each(["descriptor", "result"] as const)("does not echo an unknown %s field name into public diagnostics", (kind) => {
    // <lang><zh-CN>未知字段名也可能包含私有路径，闭集拒绝不应把它变成公开错误正文。</zh-CN><en>Unknown field names can contain private paths; closed-field rejection must not turn them into public error text.</en></lang>
    const value = fixture(kind, "0.1.0-draft");
    value["C:\\private\\secret-marker"] = true;
    const diagnostics = kind === "descriptor" ? validateDocumentationProducerDescriptor(value) : validateDocumentationProducerResult(value);
    expect(diagnostics.some(({ code }) => code === "DOCUMENTATION_PRODUCER_FIELD_UNKNOWN")).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain("secret-marker");
  });
  it("does not echo duplicated malformed artifact identities", async () => {
    // <lang><zh-CN>身份语法错误仍应被拒绝，重复检测不能另外回显未验证身份。</zh-CN><en>Malformed identities must remain rejected and duplicate detection must not additionally echo unvalidated identities.</en></lang>
    const expected = fixture("result", "0.1.0-draft");
    expected.artifacts[0].id = "C:\\private\\secret-marker";
    expected.artifacts.push({ ...expected.artifacts[0] });
    const result = await runDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce: async () => expected }, request);
    expect(result.status).toBe("failed");
    expect(JSON.stringify(result)).not.toContain("secret-marker");
  });
  it("does not echo duplicate malformed request identities", async () => {
    // <lang><zh-CN>失败请求不会执行producer，也不能把无效profile身份复制到诊断中。</zh-CN><en>A failed request must neither execute the producer nor copy invalid profile identities into diagnostics.</en></lang>
    const produce = vi.fn(async () => fixture("result", "0.1.0-draft"));
    const result = await runDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce }, { ...request, profileIds: ["C:\\private\\secret-marker", "C:\\private\\secret-marker"] });
    expect(result.status).toBe("failed");
    expect(produce).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("secret-marker");
  });
  it("keeps malformed extension names out of path diagnostics", async () => {
    // <lang><zh-CN>安全的已知扩展名称保持字段级定位；非法名称回到父input定位。</zh-CN><en>Safe known extension names retain field-level locations; malformed names fall back to the parent input location.</en></lang>
    const produce = vi.fn(async () => fixture("result", "0.1.0-draft"));
    const result = await runDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce }, { ...request, inputs: [{ kind: "fixture-source", path: "src/public.fixture", ["C:\\private\\secret-markerPath"]: "../private" }] });
    expect(result.status).toBe("failed");
    expect(produce).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("secret-marker");
  });
  it.each([new Error("cannot read C:\\private\\secret-marker.env"), "token=secret-marker"])("keeps raw thrown details out of a serialized failure", async (thrown) => {
    // <lang><zh-CN>异常原文模拟私有路径和凭据；公开失败只能携带固定安全消息。</zh-CN><en>Thrown details simulate private paths and credentials; public failure must carry only a fixed safe message.</en></lang>
    const producer = defineDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce: async () => { throw thrown; } });
    const result = await runDocumentationProducer(producer, request);
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0].code).toBe("DOCUMENTATION_PRODUCER_EXECUTION_FAILED");
    expect(JSON.stringify(result)).not.toContain("secret-marker");
  });

  it("returns aborted when the producer resolves after its signal was aborted", async () => {
    // <lang><zh-CN>使用旧有效版本隔离生命周期缺陷，避免版本拒绝掩盖晚到成功结果。</zh-CN><en>Use a valid legacy version to isolate the lifecycle defect rather than hide late success behind version refusal.</en></lang>
    const controller = new AbortController();
    const producer = defineDocumentationProducer({ descriptor: fixture("descriptor", "0.1.0-draft"), produce: async () => { controller.abort(); return fixture("result", "0.1.0-draft"); } });
    const result = await runDocumentationProducer(producer, request, { signal: controller.signal });
    expect(result.status).toBe("failed");
    expect(result.artifacts).toEqual([]);
    expect(result.diagnostics[0].code).toBe("DOCUMENTATION_PRODUCER_ABORTED");
  });

  it.each([undefined, () => "private", Symbol("private"), 1n, Number.NaN, Number.POSITIVE_INFINITY])("rejects non-JSON diagnostic source extension %s", (value) => {
    // <lang><zh-CN>source允许领域元数据，但额外字段仍必须可作为JSON安全传递。</zh-CN><en>Source permits domain metadata, but extension fields must still be safely representable as JSON.</en></lang>
    const result = fixture("result", "0.1.0-draft");
    result.status = "partial";
    result.diagnostics = [{ code: "FIXTURE_INFO", message: "Public fixture", severity: "info", source: { path: "src/public.fixture", detail: value } }];
    expect(validateDocumentationProducerResult(result).some(({ severity }) => severity === "error")).toBe(true);
  });

  it("rejects cyclic source metadata while preserving shared acyclic values", () => {
    // <lang><zh-CN>同一对象重复引用可序列化，只有回边形成的环须拒绝。</zh-CN><en>Repeated references to the same object are serializable; only a cycle formed by a back edge must be refused.</en></lang>
    const shared: Record<string, unknown> = { public: true };
    const result = fixture("result", "0.1.0-draft");
    result.status = "partial";
    result.diagnostics = [{ code: "FIXTURE_INFO", message: "Public fixture", severity: "info", data: shared, metadata: shared, source: { first: shared, second: shared } }];
    expect(validateDocumentationProducerResult(result)).toEqual([]);
    shared.self = shared;
    expect(validateDocumentationProducerResult(result).some(({ severity }) => severity === "error")).toBe(true);
    delete shared.self;
  });

  it("keeps runtime roots separate from serializable input paths", () => {
    expect(validateDocumentationProducerRequest(request)).toEqual([]);
    expect(validateDocumentationProducerRequest({ ...request, inputs: [{ kind: "fixture-source", path: request.workspaceRoot }] }).some(({ code }) => code === "DOCUMENTATION_PRODUCER_PATH_UNSAFE")).toBe(true);
  });
});
