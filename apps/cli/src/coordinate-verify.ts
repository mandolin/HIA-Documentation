import { open, realpath } from "node:fs/promises";
import path from "node:path";
import {
  createOrdinaryCoordinateProfileIndex,
  queryVerifiedSourceAnchor
} from "@hia-doc/source-linkage";

/**
 * @lang zh-CN 坐标已核命令的受控 I/O；cwd 是调用者明确授予读取的本地根。
 * @lang en Controlled I/O for coordinate verification; cwd is the local read root explicitly granted by the caller.
 */
export interface CoordinateVerifyCliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

/**
 * @lang zh-CN 单份 profile 的字节上限，阻止命令行解析无限大的侧载。
 * @lang en Byte limit for one profile, preventing unbounded sidecar parsing by the CLI.
 */
export const COORDINATE_VERIFY_PROFILE_BYTE_LIMIT = 2 * 1024 * 1024;

/**
 * @lang zh-CN 每份地图或获准来源的字节上限；超限输入固定拒绝。
 * @lang en Byte limit for each map or authorized source; oversized input is deterministically refused.
 */
export const COORDINATE_VERIFY_INPUT_BYTE_LIMIT = 16 * 1024 * 1024;

type CoordinateVerificationKind = "exact-anchor" | "nearest-anchor" | "unverified" | "ambiguous-source" | "unmapped" | "invalid" | "unsupported-version";

interface CoordinateCliDiagnostic {
  code: string;
  message: string;
}

interface CoordinateCliResult {
  verification: {
    kind: CoordinateVerificationKind;
    generatedPosition?: { line: number; column: number };
  };
  diagnostics: CoordinateCliDiagnostic[];
}

const REQUIRED_OPTIONS = [
  "--coordinate-profile",
  "--ordinary-map",
  "--doc-source-map",
  "--source-id",
  "--source-index",
  "--entry-id",
  "--line",
  "--column",
  "--column-unit"
] as const;

const OPTIONAL_OPTIONS = ["--section-index", "--source"] as const;

/**
 * @lang zh-CN 在 caller cwd 内读取明示的侧载、普通地图、文档地图和可选获准源码，输出无正文、路径和摘要的机器状态。
 * @lang en Reads caller-explicit profile, ordinary map, documentation map and an optional authorized source within cwd, emitting a body/path/digest-free machine status.
 * @param argv `hia docs coordinate-verify` 后的参数。 / Arguments after `hia docs coordinate-verify`.
 * @param io 调用者的 cwd 与输出适配器。 / Caller cwd and output adapter.
 * @returns 精确锚点为 0、有效但未核为 2、输入或契约拒绝为 1。 / Exit 0 for an exact anchor, 2 for a valid non-exact result, or 1 for input/contract refusal.
 * @lang zh-CN 命令不扫描 manifest、跟随 URL 或写出产物；静态 realpath 边界拒绝目录外文件，跨平台路径检查与 open 间的并发替换不在本保证内；读取失败不回显私有路径。
 * @lang en The command does not scan manifests, follow URLs, or write artifacts; static realpath containment rejects out-of-root files, while a concurrent replacement between cross-platform path checking and open is outside this guarantee; read failures never echo private paths.
 */
export async function runCoordinateVerificationCommand(argv: string[], io: CoordinateVerifyCliIo): Promise<number> {
  // <lang><zh-CN>闭集参数解析在任何 I/O 之前拒绝重复、未知、缺值和位置参数。</zh-CN><en>Closed option parsing rejects duplicates, unknown names, missing values and positional arguments before any I/O.</en></lang>
  const options = parseCoordinateOptions(argv);
  if (!options) {
    return emitRefusal(io, "HIA_CLI_COORDINATE_OPTIONS_INVALID", "Coordinate verification requires one explicit value for each required option.");
  }

  // <lang><zh-CN>三份证据路径必填，源码只在授权时明示；所有提供的路径都必须安全相对。</zh-CN><en>Three evidence paths are required, while source access is explicit only when authorized; every provided path must be safe-relative.</en></lang>
  const profilePath = options.get("--coordinate-profile")!;
  const ordinaryMapPath = options.get("--ordinary-map")!;
  const documentationMapPath = options.get("--doc-source-map")!;
  const sourcePath = options.get("--source");
  if (![profilePath, ordinaryMapPath, documentationMapPath, ...(sourcePath === undefined ? [] : [sourcePath])].every(isSafeRelativeFilePath)) {
    return emitRefusal(io, "HIA_CLI_COORDINATE_PATH_INVALID", "Coordinate verification accepts only safe relative local file paths.");
  }

  // <lang><zh-CN>source slot 和位置必须显式以十进制给出，防止路径或列单位推断替代逐槽位证据。</zh-CN><en>Source slot and position must be explicit decimals so neither path nor unit inference substitutes for per-slot evidence.</en></lang>
  const sourceIndex = parseDecimal(options.get("--source-index"), false);
  const sectionIndex = options.has("--section-index") ? parseDecimal(options.get("--section-index"), false) : null;
  const line = parseDecimal(options.get("--line"), true);
  const column = parseDecimal(options.get("--column"), true);
  const sourceId = options.get("--source-id")!;
  const entryId = options.get("--entry-id")!;
  const columnUnit = options.get("--column-unit")!;
  if (sourceIndex === undefined
    || sectionIndex === undefined
    || line === undefined
    || column === undefined
    || sourceId.length > 512
    || entryId.length > 512
    || !["utf16-code-unit", "unicode-code-point", "byte"].includes(columnUnit)) {
    return emitRefusal(io, "HIA_CLI_COORDINATE_QUERY_INVALID", "Coordinate verification requires valid slot, identity, position and column-unit values.");
  }

  // <lang><zh-CN>分别读取实际工件字节；realpath 后再次核对根目录，避免 symlink 逃出授权范围。</zh-CN><en>Read actual artifact bytes separately; recheck containment after realpath so a symlink cannot escape the authorized root.</en></lang>
  let profile: unknown;
  let ordinaryMapBytes: Uint8Array;
  let documentationMapBytes: Uint8Array;
  let sourceBytes: Uint8Array | undefined;
  try {
    const root = await realpath(io.cwd);
    const profileBytes = await readContainedFile(root, profilePath, COORDINATE_VERIFY_PROFILE_BYTE_LIMIT);
    ordinaryMapBytes = await readContainedFile(root, ordinaryMapPath, COORDINATE_VERIFY_INPUT_BYTE_LIMIT);
    documentationMapBytes = await readContainedFile(root, documentationMapPath, COORDINATE_VERIFY_INPUT_BYTE_LIMIT);
    if (sourcePath !== undefined) sourceBytes = await readContainedFile(root, sourcePath, COORDINATE_VERIFY_INPUT_BYTE_LIMIT);
    // <lang><zh-CN>保留侧载原始 JSON 文本，让 owner reader 在结构投影前拒绝重复成员键。</zh-CN><en>Keep raw sidecar JSON text so the owner reader can reject duplicate members before structural projection.</en></lang>
    profile = new TextDecoder("utf-8", { fatal: true }).decode(profileBytes);
  } catch {
    return emitRefusal(io, "HIA_CLI_COORDINATE_INPUT_READ_FAILED", "Coordinate verification could not read the explicit bounded local inputs.");
  }

  // <lang><zh-CN>严格索引自行核对三份实际字节、逻辑文本、来源身份与原始槽位；CLI 不补造证明。</zh-CN><en>The strict index checks actual bytes, logical text, source identity and original slot; the CLI invents no evidence.</en></lang>
  const index = await createOrdinaryCoordinateProfileIndex({
    profile,
    ordinaryMapBytes,
    documentationMapBytes,
    sourceInputs: sourceBytes === undefined ? [] : [{ sectionIndex, sourceIndex, bytes: sourceBytes }]
  });
  if (index.status !== "available") {
    const kind = index.status === "unsupported-version" ? "unsupported-version" : "invalid";
    // <lang><zh-CN>仅投影固定诊断字段，不让未来内部索引属性泄漏到机器输出。</zh-CN><en>Project only fixed diagnostic fields so future internal index properties cannot leak into machine output.</en></lang>
    io.stdout(JSON.stringify({
      verification: { kind },
      diagnostics: index.diagnostics.map(({ code, message }) => ({ code, message }))
    } satisfies CoordinateCliResult));
    return 1;
  }

  // <lang><zh-CN>只有实际段与文档引用共同证实请求点才返回 exact-anchor；其他状态保持机器可辨。</zh-CN><en>Only a real segment and documentation reference jointly proving the requested point return exact-anchor; all other states remain machine-distinct.</en></lang>
  const result = queryVerifiedSourceAnchor(index, {
    entryId,
    sourceId,
    sectionIndex,
    sourceIndex,
    position: { line, column },
    columnUnit: columnUnit as "utf16-code-unit" | "unicode-code-point" | "byte"
  });
  // <lang><zh-CN>显式白名单阻止 reader 后续增加的字段改变本 CLI 的无正文/路径输出边界。</zh-CN><en>An explicit allowlist prevents future reader fields from changing this CLI's body/path-free output boundary.</en></lang>
  const output: CoordinateCliResult = {
    verification: {
      kind: result.verification.kind,
      ...(result.verification.generatedPosition ? { generatedPosition: {
        line: result.verification.generatedPosition.line,
        column: result.verification.generatedPosition.column
      } } : {})
    },
    diagnostics: result.diagnostics.map(({ code, message }) => ({ code, message }))
  };
  io.stdout(JSON.stringify(output));
  return result.verification.kind === "exact-anchor" ? 0 : result.verification.kind === "invalid" || result.verification.kind === "unsupported-version" ? 1 : 2;
}

/**
 * @lang zh-CN 闭集解析单次出现的选项与非空值。
 * @lang en Parses only known single-occurrence options with nonempty values.
 * @param argv 原始命令参数。 / Raw command arguments.
 * @returns 完整选项表或拒绝。 / Complete option map or refusal.
 */
function parseCoordinateOptions(argv: string[]): Map<string, string> | undefined {
  const allowed = new Set<string>([...REQUIRED_OPTIONS, ...OPTIONAL_OPTIONS]);
  const values = new Map<string, string>();
  if (argv.length % 2 !== 0) return undefined;
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index]!;
    const value = argv[index + 1]!;
    if (!allowed.has(name) || values.has(name) || !value || value.startsWith("--")) return undefined;
    values.set(name, value);
  }
  return REQUIRED_OPTIONS.every((name) => values.has(name)) ? values : undefined;
}

/**
 * @lang zh-CN 验证明示本地文件路径，不允许 URL、绝对路径或 `..` 分段。
 * @lang en Validates an explicit local file path without URLs, absolute paths or `..` segments.
 * @param value 调用者路径。 / Caller path.
 * @returns 路径是否在词法上安全。 / Whether the path is lexically safe.
 */
function isSafeRelativeFilePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return Boolean(normalized)
    && normalized !== "."
    && !normalized.includes("\0")
    && !path.isAbsolute(value)
    && !path.win32.isAbsolute(value)
    && !normalized.startsWith("/")
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(normalized)
    && !normalized.split("/").includes("..");
}

/**
 * @lang zh-CN 解析有界十进制坐标，禁止负数、指数和精度丢失。
 * @lang en Parses bounded decimal coordinates without negatives, exponents or precision loss.
 * @param value 命令行文本。 / CLI text.
 * @param positive 是否要求大于零。 / Whether a positive value is required.
 * @returns 安全整数或未定义。 / Safe integer or undefined.
 */
function parseDecimal(value: string | undefined, positive: boolean): number | undefined {
  if (!value || !/^(0|[1-9][0-9]*)$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && (!positive || parsed > 0) ? parsed : undefined;
}

/**
 * @lang zh-CN 只读取经 realpath 确认位于授权根内的普通文件；打开后按句柄分块限额，即使文件增长也不会整文件分配。
 * @lang en Reads only a regular file whose realpath remains inside the authorized root; bounded handle reads avoid whole-file allocation even if the file grows.
 * @param root 已解析的授权根。 / Resolved authorized root.
 * @param relativePath 明示安全相对路径。 / Explicit safe-relative path.
 * @param byteLimit 最大原始字节数。 / Maximum raw byte count.
 * @returns 实际文件字节。 / Actual file bytes.
 */
async function readContainedFile(root: string, relativePath: string, byteLimit: number): Promise<Uint8Array> {
  const resolved = await realpath(path.resolve(root, relativePath));
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("outside-root");
  // <lang><zh-CN>路径检查和 open 之间的并发替换不能由跨平台 path API 原子排除；后续从同一句柄读取并强制限额，绝不输出正文。</zh-CN><en>Cross-platform path APIs cannot atomically exclude a concurrent replacement between realpath and open; subsequent reads use one bounded handle and never emit the body.</en></lang>
  const handle = await open(resolved, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > byteLimit) throw new Error("not-bounded-file");
    // <lang><zh-CN>每轮最多读 64 KiB；当总量已达上限时，只额外尝试一字节判别增长。</zh-CN><en>Read at most 64 KiB per round; once the limit is reached, probe only one extra byte to detect growth.</en></lang>
    const block = Buffer.allocUnsafe(64 * 1024);
    const chunks: Buffer[] = [];
    let total = 0;
    while (total <= byteLimit) {
      const capacity = Math.min(block.byteLength, byteLimit + 1 - total);
      const { bytesRead } = await handle.read(block, 0, capacity, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > byteLimit) throw new Error("not-bounded-file");
      chunks.push(Buffer.from(block.subarray(0, bytesRead)));
    }
    return Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
}

/**
 * @lang zh-CN 仅输出固定、无私有值的机器拒绝结果。
 * @lang en Emits only a fixed machine refusal without private values.
 * @param io 命令行输出。 / CLI output.
 * @param code 固定错误码。 / Fixed error code.
 * @param message 固定说明。 / Fixed message.
 * @returns 失败退出码。 / Failure exit code.
 */
function emitRefusal(io: CoordinateVerifyCliIo, code: string, message: string): number {
  io.stdout(JSON.stringify({ verification: { kind: "invalid" }, diagnostics: [{ code, message }] } satisfies CoordinateCliResult));
  return 1;
}
