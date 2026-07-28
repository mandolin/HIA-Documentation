namespace HiaDocumentation.VisualStudio;

using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO.Pipelines;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.Editor;
using Microsoft.VisualStudio.Extensibility.LanguageServer;
using Microsoft.VisualStudio.RpcContracts.LanguageServerProvider;
using Nerdbank.Streams;

/// <summary>
/// <lang>
/// <zh-CN>通过 stdio 把 Visual Studio 连接到随 VSIX 部署的 <c>@hia-doc/lsp</c>。</zh-CN>
/// <en>Connects Visual Studio to the VSIX-deployed <c>@hia-doc/lsp</c> over stdio.</en>
/// </lang>
/// </summary>
#pragma warning disable VSEXTPREVIEW_LSP
[VisualStudioContribution]
internal sealed class HiaLanguageServerProvider : LanguageServerProvider
{
    private readonly object processLock = new();
    private Process? serverProcess;
    private bool isDisposing;

    /// <summary>
    /// <lang>
    /// <zh-CN>定义 HIA 文档 IR 与 doc-source-map JSON 的专属文档类型，避免接管现有语言服务。</zh-CN>
    /// <en>Defines a dedicated document type for HIA document IR and doc-source-map JSON without taking over existing language services.</en>
    /// </lang>
    /// </summary>
    [VisualStudioContribution]
    public static DocumentTypeConfiguration HiaDocumentType =>
        new("hia-documentation")
        {
            FileExtensions = [".hia.json", ".docmap.json"],
            BaseDocumentType = LanguageServerBaseDocumentType,
        };

    /// <inheritdoc />
    public override LanguageServerProviderConfiguration
        LanguageServerProviderConfiguration =>
        new(
            "%HiaDocumentation.LanguageServer.DisplayName%",
            [DocumentFilter.FromDocumentType(HiaDocumentType)]);

    /// <inheritdoc />
    public override Task<IDuplexPipe?> CreateServerConnectionAsync(
        CancellationToken cancellationToken)
    {
        LanguageServerRuntimeState state = LanguageServerRuntimeState.Instance;
        Process? pendingProcess = null;
        state.Transition("starting", "resolving-runtime", "not-resolved");

        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            LanguageServerLaunchTarget launchTarget =
                LanguageServerRuntimeLauncher.ResolveLaunchTarget();
            Process process =
                LanguageServerRuntimeLauncher.CreateProcess(launchTarget);
            pendingProcess = process;

            lock (this.processLock)
            {
                this.StopServerProcessLocked();
                this.serverProcess = process;
            }

            process.EnableRaisingEvents = true;
            process.Exited += this.OnServerProcessExited;

            if (!process.Start())
            {
                this.ReleaseFailedProcess(process);
                state.Transition(
                    "unavailable",
                    "process-start-returned-false",
                    launchTarget.RuntimeOrigin);
                return Task.FromResult<IDuplexPipe?>(null);
            }

            process.BeginErrorReadLine();
            state.Transition(
                "initializing",
                "stdio-connected",
                launchTarget.RuntimeOrigin);

            IDuplexPipe pipe = new DuplexPipe(
                PipeReader.Create(process.StandardOutput.BaseStream),
                PipeWriter.Create(process.StandardInput.BaseStream));
            return Task.FromResult<IDuplexPipe?>(pipe);
        }
        catch (OperationCanceledException)
        {
            this.ReleaseFailedProcess(pendingProcess);
            state.Transition("stopped", "activation-cancelled", "not-resolved");
            return Task.FromResult<IDuplexPipe?>(null);
        }
        catch (LanguageServerLaunchException exception)
        {
            this.ReleaseFailedProcess(pendingProcess);
            state.Transition(
                "unavailable",
                exception.ReasonCode,
                exception.RuntimeOrigin);
            return Task.FromResult<IDuplexPipe?>(null);
        }
        catch (Win32Exception)
        {
            this.ReleaseFailedProcess(pendingProcess);
            state.Transition(
                "unavailable",
                "node-runtime-unavailable",
                "not-resolved");
            return Task.FromResult<IDuplexPipe?>(null);
        }
        catch (Exception)
        {
            this.ReleaseFailedProcess(pendingProcess);
            state.Transition(
                "failed",
                "process-start-failed",
                "not-resolved");
            return Task.FromResult<IDuplexPipe?>(null);
        }
    }

    /// <inheritdoc />
    public override Task OnServerInitializationResultAsync(
        ServerInitializationResult serverInitializationResult,
        LanguageServerInitializationFailureInfo? initializationFailureInfo,
        CancellationToken cancellationToken)
    {
        LanguageServerRuntimeState state = LanguageServerRuntimeState.Instance;
        string runtimeOrigin = state.Current.RuntimeOrigin;

        if (serverInitializationResult == ServerInitializationResult.Failed)
        {
            state.Transition(
                "failed",
                "lsp-initialization-failed",
                runtimeOrigin);
            this.Enabled = false;
        }
        else
        {
            state.Transition("ready", "lsp-initialized", runtimeOrigin);
        }

        return base.OnServerInitializationResultAsync(
            serverInitializationResult,
            initializationFailureInfo,
            cancellationToken);
    }

    /// <inheritdoc />
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            lock (this.processLock)
            {
                this.isDisposing = true;
                this.StopServerProcessLocked();
            }

            LanguageServerRuntimeState.Instance.Transition(
                "stopped",
                "provider-disposed",
                LanguageServerRuntimeState.Instance.Current.RuntimeOrigin);
        }

        base.Dispose(disposing);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>在 server 非预期退出时发布稳定错误状态，不转发 stderr 或绝对路径。</zh-CN>
    /// <en>Publishes a stable failure state on unexpected server exit without forwarding stderr or absolute paths.</en>
    /// </lang>
    /// </summary>
    private void OnServerProcessExited(object? sender, EventArgs eventArgs)
    {
        lock (this.processLock)
        {
            if (this.isDisposing || !ReferenceEquals(sender, this.serverProcess))
            {
                return;
            }
        }

        LanguageServerRuntimeState state = LanguageServerRuntimeState.Instance;
        state.Transition(
            "failed",
            "language-server-exited",
            state.Current.RuntimeOrigin);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>停止并释放当前语言服务器进程；调用方必须持有 process lock。</zh-CN>
    /// <en>Stops and disposes the current language server process; callers must hold the process lock.</en>
    /// </lang>
    /// </summary>
    private void StopServerProcessLocked()
    {
        Process? process = this.serverProcess;
        this.serverProcess = null;
        if (process is null)
        {
            return;
        }

        process.Exited -= this.OnServerProcessExited;
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
            // <lang><zh-CN>进程已在并发退出；释放对象即可。</zh-CN><en>The process exited concurrently; disposing it is sufficient.</en></lang>
        }
        finally
        {
            process.Dispose();
        }
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>在启动失败时从共享槽位移除并释放尚未交给 Visual Studio 的进程。</zh-CN>
    /// <en>Removes and disposes a process that failed before its streams were handed to Visual Studio.</en>
    /// </lang>
    /// </summary>
    private void ReleaseFailedProcess(Process? process)
    {
        if (process is null)
        {
            return;
        }

        lock (this.processLock)
        {
            if (ReferenceEquals(this.serverProcess, process))
            {
                this.serverProcess = null;
            }
        }

        process.Exited -= this.OnServerProcessExited;
        try
        {
            if (process.StartTime != default && !process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
            // <lang><zh-CN>进程未成功启动或已退出；继续释放对象。</zh-CN><en>The process did not start or already exited; continue disposal.</en></lang>
        }

        process.Dispose();
    }

}
#pragma warning restore VSEXTPREVIEW_LSP
