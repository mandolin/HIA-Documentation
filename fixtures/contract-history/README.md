# Historical contract samples

These synthetic, public-safe inputs pin the contract versions accepted before the first stable release. Their version fields are literals, independent of current implementation constants. Keep these historical identities when adding new-version samples.

Sources:

- `hia-document`: `fixtures/basic.hia.json`.
- `project-manifest`: `fixtures/project-dotnet.hia-project.json`.
- `documentation-profile`: `packages/profiles/src/profiles/jsdoc.profile.json`.
- Producer descriptor/result: `fixtures/producer/basic.producer-*.json`.
- `doc-source-map`: `fixtures/project-mixed-alert.docmap.json`.
- Presentation profile: the synthetic `createProfileFixture` in the core presentation tests.
- UI locale completeness: the metadata-only report produced from the synthetic `createInput` in the core UI locale tests.

The owner validators enforce semantic validity; a JSON Schema snapshot alone does not prove path, reference, privacy, or cross-field correctness. These samples contain no owner attestation or evidence of real business usage.

中文：本目录固定首个稳定版迁移前的公开合成输入。版本身份不能随当前常量自动更新；新增版本应新增对应样本。它们用于兼容与拒绝路径验证，不代表真实业务流程、负责人验收或产品发行完成。
