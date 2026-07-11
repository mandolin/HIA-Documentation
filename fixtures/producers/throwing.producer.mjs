export const throwingProducerDescriptor = {
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
  id: "throwing-fixture",
  displayName: "Throwing Fixture Producer",
  version: "0.0.0",
  inputKinds: ["fixture-source"],
  outputKinds: ["hia-document"],
  capabilities: {
    sourceLinkage: false,
    incremental: false,
    watch: false
  }
};

export const throwingProducer = {
  descriptor: throwingProducerDescriptor,
  async produce() {
    // 中英说明 / CN+EN: 模拟 producer 运行期异常，验证 CLI 可在 warn-mode 下隔离失败。
    throw new Error("Intentional thrown fixture producer failure.");
  }
};

export default throwingProducer;
