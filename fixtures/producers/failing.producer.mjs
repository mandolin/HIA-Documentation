export const failingProducerDescriptor = {
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
  id: "failing-fixture",
  displayName: "Failing Fixture Producer",
  version: "0.0.0",
  inputKinds: ["fixture-source"],
  outputKinds: ["hia-document"],
  capabilities: {
    sourceLinkage: false,
    incremental: false,
    watch: false
  }
};

export const failingProducer = {
  descriptor: failingProducerDescriptor,
  async produce() {
    // 中英说明 / CN+EN: 固定失败的 fixture，用于锁定 CLI warn-mode producer orchestration 语义。
    return {
      contract: "documentation-producer-result",
      contractVersion: "0.1.0-draft",
      producer: {
        id: failingProducerDescriptor.id,
        version: failingProducerDescriptor.version
      },
      status: "failed",
      artifacts: [],
      diagnostics: [
        {
          code: "FIXTURE_PRODUCER_FAILED",
          message: "Intentional fixture producer failure.",
          severity: "error"
        }
      ]
    };
  }
};

export default failingProducer;
