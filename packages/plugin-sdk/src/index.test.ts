import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  defineDocumentationProducer,
  DOCUMENTATION_PRODUCER_CONTRACT,
  DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
  DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
  DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA,
  DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID,
  runDocumentationProducer,
  validateDocumentationProducerDescriptor,
  validateDocumentationProducerRequest,
  validateDocumentationProducerResult,
  type DocumentationProducer,
  type DocumentationProducerDescriptor,
  type DocumentationProducerRequest,
  type DocumentationProducerResult
} from "./index.js";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = path.resolve(packageDir, "..", "..");

const descriptor: DocumentationProducerDescriptor = {
  contract: DOCUMENTATION_PRODUCER_CONTRACT,
  contractVersion: DOCUMENTATION_PRODUCER_CONTRACT_VERSION,
  id: "fixture-doc",
  version: "0.1.0",
  displayName: "Fixture Documentation Producer",
  inputKinds: ["fixture-source"],
  outputKinds: ["fixture-extraction"],
  capabilities: {
    sourceLinkage: false,
    incremental: false,
    watch: false
  }
};

const request: DocumentationProducerRequest = {
  workspaceRoot: path.join(rootDir, "fixtures"),
  outputDirectory: path.join(rootDir, "dist", "producer-test"),
  inputs: [{ kind: "fixture-source", path: "producer/source.fixture" }]
};

function createSuccessResult(artifactPath = "artifacts/fixture.json"): DocumentationProducerResult {
  return {
    contract: DOCUMENTATION_PRODUCER_RESULT_CONTRACT,
    contractVersion: DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION,
    producer: { id: descriptor.id, version: descriptor.version },
    status: "success",
    artifacts: [{ id: "fixture", kind: "fixture-extraction", path: artifactPath }],
    diagnostics: []
  };
}

function createProducer(produce: DocumentationProducer["produce"]): DocumentationProducer {
  return defineDocumentationProducer({ descriptor, produce });
}

describe("@hia-doc/plugin-sdk", () => {
  it("validates committed descriptor and result fixtures", async () => {
    const fixtureDir = path.join(rootDir, "fixtures", "producer");
    const fixtureDescriptor = JSON.parse(await readFile(path.join(fixtureDir, "basic.producer-descriptor.json"), "utf8"));
    const fixtureResult = JSON.parse(await readFile(path.join(fixtureDir, "basic.producer-result.json"), "utf8"));

    expect(validateDocumentationProducerDescriptor(fixtureDescriptor)).toEqual([]);
    expect(validateDocumentationProducerResult(fixtureResult, { descriptor: fixtureDescriptor })).toEqual([]);
    expect(DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA.$id).toBe(DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID);
    expect(DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA.$id).toBe(DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID);
  });

  it("runs a defined producer and forwards progress", async () => {
    const reportProgress = vi.fn();
    const producer = createProducer(async (_request, context) => {
      context.reportProgress?.({ phase: "extract", current: 1, total: 1 });
      return createSuccessResult();
    });

    const result = await runDocumentationProducer(producer, request, { reportProgress });

    expect(result.status).toBe("success");
    expect(result.artifacts).toHaveLength(1);
    expect(reportProgress).toHaveBeenCalledWith({ phase: "extract", current: 1, total: 1 });
  });

  it("rejects unsafe request input paths before execution", async () => {
    const produce = vi.fn(async () => createSuccessResult());
    const producer = createProducer(produce);
    const unsafeRequest = {
      ...request,
      inputs: [{ kind: "fixture-source", path: "../private.fixture" }]
    };

    expect(validateDocumentationProducerRequest(unsafeRequest, { descriptor })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DOCUMENTATION_PRODUCER_PATH_UNSAFE" })
    ]));

    const result = await runDocumentationProducer(producer, unsafeRequest);
    expect(result.status).toBe("failed");
    expect(produce).not.toHaveBeenCalled();
  });

  it("converts invalid producer results into structured failure", async () => {
    const producer = createProducer(async () => createSuccessResult("C:\\private\\fixture.json"));
    const result = await runDocumentationProducer(producer, request);

    expect(result.status).toBe("failed");
    expect(result.artifacts).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DOCUMENTATION_PRODUCER_PATH_UNSAFE" })
    ]));
  });

  it("converts thrown errors into execution diagnostics", async () => {
    const producer = createProducer(async () => {
      throw new Error("fixture failure");
    });
    const result = await runDocumentationProducer(producer, request);

    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]).toMatchObject({
      code: "DOCUMENTATION_PRODUCER_EXECUTION_FAILED",
      severity: "error"
    });
  });

  it("does not start an already-aborted producer", async () => {
    const produce = vi.fn(async () => createSuccessResult());
    const producer = createProducer(produce);
    const controller = new AbortController();
    controller.abort();

    const result = await runDocumentationProducer(producer, request, { signal: controller.signal });
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]?.code).toBe("DOCUMENTATION_PRODUCER_ABORTED");
    expect(produce).not.toHaveBeenCalled();
  });

  it("rejects unsupported P1 lifecycle capabilities", () => {
    const diagnostics = validateDocumentationProducerDescriptor({
      ...descriptor,
      capabilities: { ...descriptor.capabilities, watch: true }
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DOCUMENTATION_PRODUCER_CAPABILITY_UNSUPPORTED" })
    ]));
  });

  it("keeps producer ids strict while allowing namespaced artifact kinds", () => {
    const namespacedDescriptor = {
      ...descriptor,
      inputKinds: ["template/pug"],
      outputKinds: ["extraction/pug"]
    };

    expect(validateDocumentationProducerDescriptor(namespacedDescriptor)).toEqual([]);
    expect(validateDocumentationProducerDescriptor({
      ...namespacedDescriptor,
      id: "scope/fixture-doc"
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DOCUMENTATION_PRODUCER_FIELD_INVALID" })
    ]));
  });

  it("rejects drive-relative paths without rejecting shared JSON values", () => {
    const sharedOptions = { includePrivate: false };

    expect(validateDocumentationProducerRequest({
      ...request,
      inputs: [{ kind: "fixture-source", path: "C:private.fixture" }]
    }, { descriptor })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DOCUMENTATION_PRODUCER_PATH_UNSAFE" })
    ]));

    expect(validateDocumentationProducerRequest({
      ...request,
      options: {
        first: sharedOptions,
        second: sharedOptions
      }
    }, { descriptor })).toEqual([]);
  });
});
