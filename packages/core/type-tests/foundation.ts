/**
 * @file
 * @lang zh-CN 核心基础公开声明的纯编译消费者；负例必须实际触发类型错误。
 * @lang en Compile-only consumer of core foundation declarations; negative cases must trigger actual type errors.
 */
import { createHiaDocument, createHiaProtocolEnvelope } from "../src/index.js";
import type { HiaCoreContractVersion, HiaTextI18nModelVersion, HiaSourceModelVersion, HiaProtocolEnvelopeVersion, HiaDocument, HiaSourceMetadata, HiaI18nModel, HiaProtocolEnvelope } from "../src/index.js";

// <lang><zh-CN>新旧精确值均可表达；这里不执行文件或网络操作。</zh-CN><en>Both exact legacy/current values are expressible; no file or network operations execute here.</en></lang>
const versions: [HiaCoreContractVersion, HiaTextI18nModelVersion, HiaSourceModelVersion, HiaProtocolEnvelopeVersion] = ["0.2.0", "1.0.0", "0.2.0", "0.1.0"];
const current: HiaDocument = createHiaDocument();
const legacy: HiaDocument = { ...current, schemaVersion: "0.2.0" };
const source: HiaSourceMetadata = { model: "hia-source", modelVersion: "0.2.0", mode: "none" };
const i18n: HiaI18nModel = { enabled: true, model: "hia-text-i18n", modelVersion: "1.0.0", defaultLocale: "en", locales: ["en"], fields: {} };
// <lang><zh-CN>泛型保持payload原类型；旧封装也能承载旧核心文档，不自动更改其版本。</zh-CN><en>Generics retain the original payload type; legacy envelopes can carry legacy core documents without rewriting their versions.</en></lang>
const envelope: HiaProtocolEnvelope<HiaDocument> = createHiaProtocolEnvelope("core-document", legacy);
const oldEnvelope: HiaProtocolEnvelope<HiaDocument> = { schemaVersion: "0.1.0", kind: "core-document", payload: legacy };
const payload: HiaDocument = envelope.payload;

// @ts-expect-error Exact readers do not negotiate unknown patch versions. 精确reader不猜测未知patch。
const unknownCore: HiaCoreContractVersion = "1.0.1";
// @ts-expect-error Unknown submodel minor versions need negotiation. 未知子模型minor须协商。
const unknownI18n: HiaTextI18nModelVersion = "1.1.0";
// @ts-expect-error Prerelease versions are not implicit aliases. 预发行不是隐式别名。
const unknownSource: HiaSourceModelVersion = "1.0.0-rc.1";
// @ts-expect-error Build metadata is not an admitted exact envelope version. build元数据不属于准入精确封装版本。
const unknownEnvelope: HiaProtocolEnvelopeVersion = "1.0.0+build";
// @ts-expect-error A generic document payload is not a number. 泛型文档载荷不能充当number。
const wrongPayload: number = envelope.payload;
void [versions, legacy, source, i18n, oldEnvelope, payload, unknownCore, unknownI18n, unknownSource, unknownEnvelope, wrongPayload];
