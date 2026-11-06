/**
 * @file
 * @lang zh-CN 真实SDK文件生产的事务、权限路径与中止回归。
 * @lang en Transaction, permission-path and cancellation regressions for real SDK file production.
 */
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, link, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { runDocumentationProducer } from "@hia-doc/plugin-sdk";
import { jsonDocumentationProducer } from "./index.js";

const roots: string[] = [];

/**
 * @lang zh-CN 为每个真实文件测试建立隔离根与输入，不访问业务仓。
 * @lang en Creates an isolated root and input per real-file test without accessing business repositories.
 * @returns <lang><zh-CN>测试根和SDK请求。</zh-CN><en>Test root and SDK request.</en></lang>
 */
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hia-jsondoc-test-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src/data.json"), '{"data":[1,2,3]}');
  return { root, request: { workspaceRoot: root, outputDirectory: path.join(root, "out"), inputs: [{ kind: "json-resource", path: "src/data.json", locale: "en" }] } };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it("produces SDK1 artifacts with one unchanged source snapshot per input", async () => {
  const { root, request } = await fixture();
  const result = await runDocumentationProducer(jsonDocumentationProducer, request);
  expect(result.status, JSON.stringify(result.diagnostics)).toBe("success");
  expect(result.diagnostics).toEqual([]);
  expect(result.contractVersion).toBe("1.0.0");
  expect(result.artifacts.map(artifact => artifact.kind)).toEqual(["hia-document", "doc-source-map", "json-resource"]);
  const source = result.artifacts.find(artifact => artifact.kind === "json-resource")!;
  expect(await readFile(path.join(request.outputDirectory, source.path))).toEqual(await readFile(path.join(root, "src/data.json")));
  const document = JSON.parse(await readFile(path.join(request.outputDirectory, result.artifacts[0]!.path), "utf8"));
  expect(document.symbols).toHaveLength(5);
});

it("rejects a later invalid input and rolls back the unpublished batch", async () => {
  const { root, request } = await fixture();
  await writeFile(path.join(root, "src/bad.json"), '{"private-secret":}');
  request.inputs.push({ kind: "json-resource", path: "src/bad.json", locale: "en" });
  const result = await runDocumentationProducer(jsonDocumentationProducer, request);
  expect(result.status).toBe("failed");
  expect(result.artifacts).toEqual([]);
  expect(await readdir(request.outputDirectory)).toEqual([]);
  expect(JSON.stringify(result)).not.toContain("private-secret");
  expect(JSON.stringify(result)).not.toContain(root);
});

it("rejects duplicate inputs, missing locales and linked source files", async () => {
  const { root, request } = await fixture();
  for (const inputs of [ [...request.inputs, ...request.inputs], [{ kind: "json-resource", path: "src/data.json" }] ]) {
    const result = await runDocumentationProducer(jsonDocumentationProducer, { ...request, inputs });
    expect(result.status).toBe("failed");
  }
  await link(path.join(root, "src/data.json"), path.join(root, "src/shared.json"));
  expect((await runDocumentationProducer(jsonDocumentationProducer, request)).status).toBe("failed");
});

it("rejects directory redirects in input and output", async () => {
  const { root, request } = await fixture();
  await symlink(path.join(root, "src"), path.join(root, "redirect"), process.platform === "win32" ? "junction" : "dir");
  expect((await runDocumentationProducer(jsonDocumentationProducer, { ...request, inputs: [{ ...request.inputs[0]!, path: "redirect/data.json" }] })).status).toBe("failed");
  expect((await runDocumentationProducer(jsonDocumentationProducer, { ...request, outputDirectory: path.join(root, "redirect/out") })).status).toBe("failed");
});

it("runs concurrent batches without overwriting prior outputs", async () => {
  const { request } = await fixture();
  const results = await Promise.all([runDocumentationProducer(jsonDocumentationProducer, request), runDocumentationProducer(jsonDocumentationProducer, request)]);
  expect(results.map(result => result.status)).toEqual(["success", "success"]);
  expect(new Set(results.flatMap(result => result.artifacts.map(artifact => artifact.path))).size).toBe(6);
  expect((await readdir(request.outputDirectory)).length).toBe(2);
});

it("honors cancellation and preserves existing successful output", async () => {
  const { request } = await fixture();
  const first = await runDocumentationProducer(jsonDocumentationProducer, request);
  const controller = new AbortController();
  const result = await runDocumentationProducer(jsonDocumentationProducer, request, { signal: controller.signal, reportProgress: () => controller.abort() });
  expect(result.status).toBe("failed");
  expect(first.status).toBe("success");
  expect((await readdir(request.outputDirectory)).length).toBe(1);
});

it("keeps validated request snapshots when a progress callback mutates caller state", async () => {
  const { request } = await fixture();
  const output = request.outputDirectory;
  const result = await runDocumentationProducer(jsonDocumentationProducer, request, { reportProgress: () => {
    request.inputs[0]!.path = "../private.json";
    request.workspaceRoot = path.parse(request.workspaceRoot).root;
    request.outputDirectory = path.parse(output).root;
  } });
  expect(result.status).toBe("success");
  expect((await readdir(output)).length).toBe(1);
  expect(await readFile(path.join(output, result.artifacts[2]!.path), "utf8")).toBe('{"data":[1,2,3]}');
});
