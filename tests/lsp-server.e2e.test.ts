import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface JsonRpcMessage {
  id?: number;
  method?: string;
  result?: unknown;
}

describe("LSP server stdio", () => {
  it("responds to initialize and shutdown", async () => {
    const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
    const documentText = await readFile(new URL("../fixtures/basic.hia.json", import.meta.url), "utf8");
    const child = spawn(process.execPath, ["packages/lsp/dist/node.js", "--stdio"], {
      cwd: workspaceRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const client = createJsonRpcClient(child);

    child.stderr.setEncoding("utf8");

    client.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        processId: process.pid,
        rootUri: "file:///workspace",
        capabilities: {}
      }
    });

    const initializeResponse = await client.waitFor((message) => message.id === 1);
    expect(initializeResponse.result).toMatchObject({
      capabilities: {
        completionProvider: {
          resolveProvider: false
        },
        definitionProvider: true,
        foldingRangeProvider: true,
        hoverProvider: true,
        textDocumentSync: 2
      }
    });

    client.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: "file:///workspace/basic.hia.json",
          languageId: "hia",
          version: 1,
          text: documentText
        }
      }
    });

    await client.waitFor((message) => message.method === "textDocument/publishDiagnostics");

    client.send({
      jsonrpc: "2.0",
      id: 2,
      method: "hia/documentResourceIndex",
      params: {
        uri: "file:///workspace/basic.hia.json"
      }
    });

    const resourceIndexResponse = await client.waitFor((message) => message.id === 2);
    expect(resourceIndexResponse.result).toMatchObject({
      documentId: "fixture.basic",
      title: "HIA Basic Fixture",
      uri: "file:///workspace/basic.hia.json"
    });

    client.send({
      jsonrpc: "2.0",
      id: 3,
      method: "hia/ideCapabilities",
      params: {
        uri: "file:///workspace/basic.hia.json"
      }
    });

    const capabilitiesResponse = await client.waitFor((message) => message.id === 3);
    expect(capabilitiesResponse.result).toMatchObject({
      uri: "file:///workspace/basic.hia.json",
      capabilities: expect.arrayContaining([
        expect.objectContaining({
          id: "hia.resource.index",
          status: "available"
        }),
        expect.objectContaining({
          id: "hia.completion.i18n"
        })
      ])
    });

    client.send({
      jsonrpc: "2.0",
      id: 4,
      method: "hia/documentAuthoringLocations",
      params: {
        uri: "file:///workspace/basic.hia.json"
      }
    });

    const locationsResponse = await client.waitFor((message) => message.id === 4);
    expect(locationsResponse.result).toMatchObject({
      uri: "file:///workspace/basic.hia.json",
      locations: expect.arrayContaining([
        expect.objectContaining({
          kind: "core-document",
          uri: "file:///workspace/basic.hia.json"
        })
      ])
    });

    client.send({
      jsonrpc: "2.0",
      id: 5,
      method: "textDocument/completion",
      params: {
        textDocument: {
          uri: "file:///workspace/basic.hia.json"
        },
        position: {
          line: 0,
          character: 0
        }
      }
    });

    const completionResponse = await client.waitFor((message) => message.id === 5);
    expect(completionResponse.result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "zh-CN"
      })
    ]));

    client.send({
      jsonrpc: "2.0",
      id: 6,
      method: "shutdown",
      params: null
    });

    const shutdownResponse = await client.waitFor((message) => message.id === 6);
    expect(shutdownResponse.result).toBeNull();

    client.send({
      jsonrpc: "2.0",
      method: "exit",
      params: null
    });

    const exitCode = await waitForExit(child);
    expect(exitCode).toBe(0);
  });
});

function createJsonRpcClient(child: ReturnType<typeof spawn>) {
  let buffer = Buffer.alloc(0);
  const messages: JsonRpcMessage[] = [];
  const waiters: Array<{
    predicate: (message: JsonRpcMessage) => boolean;
    resolve: (message: JsonRpcMessage) => void;
  }> = [];

  child.stdout.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    parseMessages();
  });

  function parseMessages(): void {
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");

      if (headerEnd < 0) {
        return;
      }

      const header = buffer.subarray(0, headerEnd).toString("utf8");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);

      if (!lengthMatch) {
        throw new Error(`Invalid JSON-RPC header: ${header}`);
      }

      const contentLength = Number(lengthMatch[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (buffer.length < messageEnd) {
        return;
      }

      const content = buffer.subarray(messageStart, messageEnd).toString("utf8");
      buffer = buffer.subarray(messageEnd);
      const message = JSON.parse(content) as JsonRpcMessage;
      messages.push(message);
      resolveWaiters(message);
    }
  }

  function resolveWaiters(message: JsonRpcMessage): void {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];

      if (waiter?.predicate(message)) {
        waiters.splice(index, 1);
        waiter.resolve(message);
      }
    }
  }

  return {
    send(message: Record<string, unknown>): void {
      const content = JSON.stringify(message);
      child.stdin.write(`Content-Length: ${Buffer.byteLength(content, "utf8")}\r\n\r\n${content}`);
    },
    waitFor(predicate: (message: JsonRpcMessage) => boolean): Promise<JsonRpcMessage> {
      const existing = messages.find(predicate);

      if (existing) {
        return Promise.resolve(existing);
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timed out waiting for JSON-RPC message."));
        }, 5000);

        waiters.push({
          predicate,
          resolve: (message) => {
            clearTimeout(timeout);
            resolve(message);
          }
        });
      });
    }
  };
}

function waitForExit(child: ReturnType<typeof spawn>): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Timed out waiting for LSP server exit."));
    }, 5000);

    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}
