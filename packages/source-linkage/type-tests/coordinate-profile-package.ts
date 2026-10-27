/**
 * @file
 * @lang zh-CN 从 @hia-doc/source-linkage 包入口独立消费坐标证据契约的严格类型正反例；仅编译，不执行或授予来源读取权限。
 * @lang en Strict positive and negative type consumer of the coordinate-evidence contract through the @hia-doc/source-linkage package entry; compiled only, without execution or source-read authority.
 */
import {
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT,
  ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION,
  createOrdinaryCoordinateProfileIndex,
  queryVerifiedSourceAnchor,
  type CoordinateGeneratedPosition,
  type CoordinateProfileDiagnostic,
  type CoordinateProfileStatus,
  type CoordinateSourceInput,
  type CoordinateVerificationKind,
  type OrdinaryCoordinateProfileIndex,
  type OrdinaryCoordinateProfileInput,
  type VerifiedSourceAnchorQuery,
  type VerifiedSourceAnchorResult
} from "@hia-doc/source-linkage";

// <lang><zh-CN>包入口需保留侧载精确草案身份；类型检查不表示草案已稳定发布。</zh-CN><en>The package entry must retain the exact draft sidecar identity; type checking does not imply a stable release.</en></lang>
const contract: "ordinary-source-map-coordinate-profile" = ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT;
const version: "0.1.0-draft" = ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION;

// <lang><zh-CN>获授权来源由宿主按原始槽位显式给出；类型本身不能证明字节真实或已获授权。</zh-CN><en>The host explicitly supplies authorized source bytes by raw slot; static types cannot prove byte identity or authorization.</en></lang>
const source: CoordinateSourceInput = { sectionIndex: null, sourceIndex: 0, bytes: new Uint8Array() };
const input: OrdinaryCoordinateProfileInput = {
  profile: {},
  ordinaryMapBytes: new Uint8Array(),
  documentationMapBytes: new Uint8Array(),
  sourceInputs: [source]
};
const created: Promise<OrdinaryCoordinateProfileIndex> = createOrdinaryCoordinateProfileIndex(input);

// <lang><zh-CN>严格查询从已构造索引读取；这个占位仅验证声明，不伪称实际运行索引可用。</zh-CN><en>The strict query reads a constructed index; this placeholder checks declarations only and makes no runtime availability claim.</en></lang>
const index = {} as OrdinaryCoordinateProfileIndex;
const status: CoordinateProfileStatus = index.status;
const indexDiagnostics: CoordinateProfileDiagnostic[] = index.diagnostics;
const query: VerifiedSourceAnchorQuery = {
  entryId: "entry-1",
  sourceId: "source-1",
  sectionIndex: 0,
  sourceIndex: 0,
  position: { line: 1, column: 1 },
  columnUnit: "utf16-code-unit"
};
const result: VerifiedSourceAnchorResult = queryVerifiedSourceAnchor(index, query);
const kind: CoordinateVerificationKind = result.verification.kind;
const optionalAnchor: CoordinateGeneratedPosition | undefined = result.verification.generatedPosition;
void [contract, version, source, input, created, index, status, indexDiagnostics, query, result, kind, optionalAnchor];

// @ts-expect-error <lang><zh-CN>状态闭集不接受“verified”。</zh-CN><en>The status union does not admit “verified”.</en></lang>
const badStatus: CoordinateProfileStatus = "verified";
// @ts-expect-error <lang><zh-CN>近邻分类不可伪装为新的已核种类。</zh-CN><en>A nearest result cannot masquerade as a new verified kind.</en></lang>
const badKind: CoordinateVerificationKind = "verified-nearest";
// @ts-expect-error <lang><zh-CN>平面槽位为 null；sectionIndex 不接受字符串。</zh-CN><en>A flat slot uses null; sectionIndex does not accept a string.</en></lang>
const badSection: CoordinateSourceInput = { sectionIndex: "0", sourceIndex: 0, bytes: new Uint8Array() };
// @ts-expect-error <lang><zh-CN>来源输入必须为原始字节，不能用源码文本替代。</zh-CN><en>Source input requires raw bytes, not source text.</en></lang>
const badBytes: CoordinateSourceInput = { sectionIndex: null, sourceIndex: 0, bytes: "source" };
// @ts-expect-error <lang><zh-CN>两张地图的实际字节均为必需输入。</zh-CN><en>Actual bytes for both maps are required input.</en></lang>
const missingMapBytes: OrdinaryCoordinateProfileInput = { profile: {}, sourceInputs: [] };
// @ts-expect-error <lang><zh-CN>严格查询必须明确列单位。</zh-CN><en>A strict query requires an explicit column unit.</en></lang>
const missingUnit: VerifiedSourceAnchorQuery = { entryId: "entry-1", sourceId: "source-1", sectionIndex: null, sourceIndex: 0, position: { line: 1, column: 1 } };
// @ts-expect-error <lang><zh-CN>模糊的“character”不是支持的精确列单位。</zh-CN><en>The vague “character” label is not a supported exact column unit.</en></lang>
const badUnit: VerifiedSourceAnchorQuery = { entryId: "entry-1", sourceId: "source-1", sectionIndex: null, sourceIndex: 0, position: { line: 1, column: 1 }, columnUnit: "character" };
// @ts-expect-error <lang><zh-CN>生成坐标只在部分分类下存在，不能无条件取用。</zh-CN><en>The generated position exists only for some result kinds and cannot be used unconditionally.</en></lang>
const guaranteedAnchor: CoordinateGeneratedPosition = result.verification.generatedPosition;
void [badStatus, badKind, badSection, badBytes, missingMapBytes, missingUnit, badUnit, guaranteedAnchor];
