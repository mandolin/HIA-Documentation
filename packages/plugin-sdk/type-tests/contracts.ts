/**
 * @file
 * @lang zh-CN 只编译、不执行的公开API类型消费者；覆盖双版本、原生诊断和泛型扩展保留。
 * @lang en Compile-only public API consumer covering dual versions, native diagnostics and preservation of generic extensions; never executed.
 */
import {
  defineDocumentationProducer,
  runDocumentationProducer,
  type DocumentationProducer,
  type DocumentationProducerDescriptor,
  type DocumentationProducerDiagnostic,
  type DocumentationProducerRequest,
  type DocumentationProducerResult
} from "../src/index.js";

// <lang><zh-CN>两个精确历史/当前wire版本均可表达；producer自身version不受此类型约束。</zh-CN><en>Both exact historical/current wire versions are representable; the producer's own version is independent of this type.</en></lang>
const currentDescriptor: DocumentationProducerDescriptor["contractVersion"] = "1.0.0";
const legacyDescriptor: DocumentationProducerDescriptor["contractVersion"] = "0.1.0-draft";
const currentResult: DocumentationProducerResult["contractVersion"] = "1.0.0";
const legacyResult: DocumentationProducerResult["contractVersion"] = "0.1.0-draft";
// <lang><zh-CN>未知版本不得通过声明类型；若类型被放宽为任意string，下面的预期错误将失效。</zh-CN><en>Unknown versions must not pass declared types; widening them to arbitrary string invalidates the expected error below.</en></lang>
// @ts-expect-error Unknown exact wire version / 未知精确wire版本
const unsupportedVersion: DocumentationProducerResult["contractVersion"] = "1.1.0";

// <lang><zh-CN>source/metadata是已支持的wire字段，客户端无需any转换即可读取路径及元数据。</zh-CN><en>Source/metadata are existing wire fields; clients can read paths and metadata without any casts.</en></lang>
const diagnostic: DocumentationProducerDiagnostic = { code: "FIXTURE_INFO", message: "Public fixture", severity: "info", metadata: { public: true }, source: { path: "src/public.fixture", label: "fixture" } };
const sourcePath: string | undefined = diagnostic.source?.path;

// <lang><zh-CN>环境声明只服务类型检查；本文件不作为脚本或运行fixture导入。</zh-CN><en>Ambient declarations serve type checking only; this file is never imported as a script or runtime fixture.</en></lang>
declare const producer: DocumentationProducer;
declare const request: DocumentationProducerRequest;
const extended = defineDocumentationProducer({ ...producer, fixtureCapability: true });
const retainedExtension: boolean = extended.fixtureCapability;
const pending: Promise<DocumentationProducerResult> = runDocumentationProducer(producer, request);
void [currentDescriptor, legacyDescriptor, currentResult, legacyResult, unsupportedVersion, sourcePath, retainedExtension, pending];
