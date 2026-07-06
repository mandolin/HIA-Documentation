import type {
  HiaDiagnostic
} from "./model.js";

export const HIA_PROTOCOL_ENVELOPE_VERSION = "0.1.0";

export type HiaProtocolEnvelopeKind =
  | "core-document"
  | "renderer-result"
  | "build-manifest"
  | "resource-index"
  | "diagnostics"
  | string;

export interface HiaProtocolEnvelope<TPayload = unknown> {
  schemaVersion: typeof HIA_PROTOCOL_ENVELOPE_VERSION;
  kind: HiaProtocolEnvelopeKind;
  payload: TPayload;
  diagnostics?: HiaDiagnostic[];
  producer?: string;
  requestId?: string;
}

export function createHiaProtocolEnvelope<TPayload>(
  kind: HiaProtocolEnvelopeKind,
  payload: TPayload,
  options: {
    diagnostics?: HiaDiagnostic[];
    producer?: string;
    requestId?: string;
  } = {}
): HiaProtocolEnvelope<TPayload> {
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

