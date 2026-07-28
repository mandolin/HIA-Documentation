namespace HiaDocumentation.VisualStudio;

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;

/// <summary>
/// <lang>
/// <zh-CN>统一解析并启动 VSIX 内置的 HIA 语言服务器运行时。</zh-CN>
/// <en>Resolves and starts the HIA language-server runtime packaged in the VSIX.</en>
/// </lang>
/// </summary>
internal static class LanguageServerRuntimeLauncher
{
    private const string LspEntryEnvironmentVariable =
        "HIA_DOCUMENTATION_LSP_ENTRY";
    private const string NodeEnvironmentVariable =
        "HIA_DOCUMENTATION_NODE";

    /// <summary>
    /// <lang>
    /// <zh-CN>优先解析 VSIX 内置部署；环境变量只作为维护者诊断覆盖。</zh-CN>
    /// <en>Resolves the VSIX deployment first; environment variables are maintainer diagnostic overrides only.</en>
    /// </lang>
    /// </summary>
    public static LanguageServerLaunchTarget ResolveLaunchTarget()
    {
        string? configuredEntry =
            Environment.GetEnvironmentVariable(LspEntryEnvironmentVariable);
        if (!string.IsNullOrWhiteSpace(configuredEntry))
        {
            string normalizedEntry = Path.GetFullPath(configuredEntry);
            if (!File.Exists(normalizedEntry))
            {
                throw new LanguageServerLaunchException(
                    "configured-lsp-runtime-not-found",
                    "environment-override");
            }

            return new(
                ResolveNodeExecutable(),
                normalizedEntry,
                "environment-override");
        }

        string assemblyDirectory =
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
            ?? throw new LanguageServerLaunchException(
                "extension-location-unavailable",
                "not-resolved");
        string packagedEntry = Path.Combine(
            assemblyDirectory,
            "runtime",
            "lsp",
            "dist",
            "node.js");

        if (!File.Exists(packagedEntry))
        {
            throw new LanguageServerLaunchException(
                "packaged-lsp-runtime-not-found",
                "vsix-content");
        }

        return new(
            ResolveNodeExecutable(),
            packagedEntry,
            "vsix-content");
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>创建无 shell、无窗口、标准流重定向的 Node 子进程。</zh-CN>
    /// <en>Creates a shell-free, windowless Node child process with redirected standard streams.</en>
    /// </lang>
    /// </summary>
    public static Process CreateProcess(LanguageServerLaunchTarget target)
    {
        ProcessStartInfo startInfo = new()
        {
            FileName = target.NodeExecutable,
            WorkingDirectory =
                Path.GetDirectoryName(target.EntryPath) ?? string.Empty,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        startInfo.ArgumentList.Add(target.EntryPath);
        startInfo.ArgumentList.Add("--stdio");

        return new Process
        {
            StartInfo = startInfo,
        };
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>解析 Node 可执行文件，不向界面或 evidence 暴露具体路径。</zh-CN>
    /// <en>Resolves the Node executable without exposing its concrete path to UI or evidence.</en>
    /// </lang>
    /// </summary>
    private static string ResolveNodeExecutable()
    {
        string? configuredNode =
            Environment.GetEnvironmentVariable(NodeEnvironmentVariable);
        return string.IsNullOrWhiteSpace(configuredNode)
            ? "node"
            : configuredNode;
    }
}

/// <summary>
/// <lang>
/// <zh-CN>描述语言服务器入口及其来源类别；具体路径不得进入 Remote UI。</zh-CN>
/// <en>Describes the language-server entry and origin category; concrete paths must not enter Remote UI.</en>
/// </lang>
/// </summary>
internal sealed record LanguageServerLaunchTarget(
    string NodeExecutable,
    string EntryPath,
    string RuntimeOrigin);

/// <summary>
/// <lang>
/// <zh-CN>使用稳定原因码表达运行时解析失败。</zh-CN>
/// <en>Represents runtime resolution failures with stable reason codes.</en>
/// </lang>
/// </summary>
internal sealed class LanguageServerLaunchException : Exception
{
    public LanguageServerLaunchException(
        string reasonCode,
        string runtimeOrigin)
        : base(reasonCode)
    {
        this.ReasonCode = reasonCode;
        this.RuntimeOrigin = runtimeOrigin;
    }

    public string ReasonCode { get; }

    public string RuntimeOrigin { get; }
}
