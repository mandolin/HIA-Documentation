/**
 * @file
 * @lang zh-CN 显式版本的泛型内存封装；payload验证与JSON序列化由调用者负责。
 * @lang en Explicitly versioned generic in-memory envelopes; callers own payload validation and JSON serialization.
 */
import type {
  HiaDiagnostic
} from "./model.js";

/** @lang zh-CN 当前封装writer版本候选；独立于payload的核心文档或渲染器版本。
 * @lang en Current envelope writer version candidate, independent of core-document or renderer payload versions.
 */
export const HIA_PROTOCOL_ENVELOPE_VERSION = "1.0.0";

/** @lang zh-CN 类型允许的两个精确封装版本，不代表对任意未知payload的运行时验证。
 * @lang en The two exact envelope versions allowed by the type, not runtime validation of arbitrary unknown payloads.
 */
export type HiaProtocolEnvelopeVersion = typeof HIA_PROTOCOL_ENVELOPE_VERSION | "0.1.0";

/** @lang zh-CN 已知封装角色及开放扩展；新kind的解释能力由消费者决定。
 * @lang en Known envelope roles plus open extensions; consumers determine support for new kinds.
 */
export type HiaProtocolEnvelopeKind =
  | "core-document"
  | "renderer-result"
  | "build-manifest"
  | "resource-index"
  | "diagnostics"
  | string;

/**
 * @lang zh-CN 保留泛型payload引用的内存封装；diagnostics、producer、requestId为可选上下文。
 * @lang en In-memory envelope retaining a generic payload reference, with optional diagnostics, producer and requestId context.
 * @typeParam TPayload <lang><zh-CN>任意调用者载荷类型，默认unknown；不保证可JSON序列化。</zh-CN><en>Caller payload type, unknown by default; JSON serializability is not guaranteed.</en></lang>
 */
export interface HiaProtocolEnvelope<TPayload = unknown> {
  /**
   * @lang zh-CN 封装自身的精确版本身份，独立于payload内的契约版本。
   * @lang en Exact version identity of the envelope itself, independent of contract versions inside its payload.
   */
  schemaVersion: HiaProtocolEnvelopeVersion;
  /**
   * @lang zh-CN 载荷角色名称，决定消费者按何种用途解释该封装。
   * @lang en Payload-role name guiding how consumers interpret the envelope.
   */
  kind: HiaProtocolEnvelopeKind;
  /**
   * @lang zh-CN 调用方的原始载荷值，对象载荷保留原引用。
   * @lang en Original caller payload value, retaining the original reference for object payloads.
   */
  payload: TPayload;
  /**
   * @lang zh-CN 封装携带的可选诊断列表，构造器保留原数组引用。
   * @lang en Optional diagnostics carried by the envelope, with the constructor retaining the original array reference.
   */
  diagnostics?: HiaDiagnostic[];
  /**
   * @lang zh-CN 可选生产者名称，构造器在非空时写入。
   * @lang en Optional producer name, included by the constructor when nonempty.
   */
  producer?: string;
  /**
   * @lang zh-CN 可选请求关联身份，构造器在非空时写入。
   * @lang en Optional request-correlation identity, included by the constructor when nonempty.
   */
  requestId?: string;
}

/**
 * @lang zh-CN 创建当前版本封装，保留payload/diagnostics引用，不迁移其内部版本或执行I/O。
 * @lang en Creates a current-version envelope retaining payload/diagnostic references, without migrating internal versions or performing I/O.
 * @typeParam TPayload <lang><zh-CN>由payload推导的原始类型。</zh-CN><en>Original type inferred from payload.</en></lang>
 * @param kind <lang><zh-CN>调用者提供的角色，不校验空串或能力协商。</zh-CN><en>Caller-provided role, without empty-string validation or capability negotiation.</en></lang>
 * @param payload <lang><zh-CN>原始引用；可含非JSON内存值，wire使用前必须单独校验。</zh-CN><en>Original reference; may contain non-JSON memory values, requiring separate validation before wire use.</en></lang>
 * @param options <lang><zh-CN>默认空；diagnostics原引用保留，空producer/requestId不写入。</zh-CN><en>Empty by default; diagnostics retain their original reference, while empty producer/requestId are omitted.</en></lang>
 * @returns <lang><zh-CN>新封装对象，不克隆或冻结调用者数据。</zh-CN><en>New envelope without cloning or freezing caller data.</en></lang>
 */
export function createHiaProtocolEnvelope<TPayload>(
  kind: HiaProtocolEnvelopeKind,
  payload: TPayload,
  options: {
    diagnostics?: HiaDiagnostic[];
    producer?: string;
    requestId?: string;
  } = {}
): HiaProtocolEnvelope<TPayload> {
  // <lang><zh-CN>只新建外壳，载荷身份和对象所有权仍归调用者。</zh-CN><en>Create only a new shell; payload identity and object ownership remain with the caller.</en></lang>
  const envelope: HiaProtocolEnvelope<TPayload> = {
    schemaVersion: HIA_PROTOCOL_ENVELOPE_VERSION,
    kind,
    payload
  };

  if (options.diagnostics) {
    envelope.diagnostics = options.diagnostics;
  }

  if (options.producer) {
    envelope.producer = options.producer;
  }

  if (options.requestId) {
    envelope.requestId = options.requestId;
  }

  return envelope;
}

