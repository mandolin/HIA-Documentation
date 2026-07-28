namespace HiaDocumentation.VisualStudio;

using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.ToolWindows;
using Microsoft.VisualStudio.RpcContracts.RemoteUI;

/// <summary>
/// <lang>
/// <zh-CN>承载 HIA Documentation Visual Studio 只读编辑基础界面。</zh-CN>
/// <en>Hosts the read-only HIA Documentation authoring foundation surface in Visual Studio.</en>
/// </lang>
/// </summary>
[VisualStudioContribution]
public sealed class DocumentationToolWindow : ToolWindow
{
    private DocumentationToolWindowControl? content;
    private DocumentationToolWindowData? data;

    /// <summary>
    /// <lang>
    /// <zh-CN>初始化单实例工具窗口并设置双语标题。</zh-CN>
    /// <en>Initializes the single-instance tool window with a bilingual title.</en>
    /// </lang>
    /// </summary>
    public DocumentationToolWindow()
    {
        this.Title = LocalizedStrings.Get("ToolWindowTitle");
    }

    /// <inheritdoc />
    public override ToolWindowConfiguration ToolWindowConfiguration => new()
    {
        Placement = ToolWindowPlacement.DocumentWell,
        AllowAutoCreation = false,
    };

    /// <inheritdoc />
    public override async Task InitializeAsync(
        CancellationToken cancellationToken)
    {
        this.CreateContent();
        await this.data!.RefreshAuthoringProjectionAsync(
            cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public override Task<IRemoteUserControl> GetContentAsync(
        CancellationToken cancellationToken)
    {
        this.CreateContent();
        return Task.FromResult<IRemoteUserControl>(this.content!);
    }

    /// <inheritdoc />
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            this.content?.Dispose();
            this.content = null;
            this.data?.Dispose();
            this.data = null;
        }

        base.Dispose(disposing);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>惰性创建 Remote UI 及其共享 LSP 状态订阅。</zh-CN>
    /// <en>Lazily creates the Remote UI and its shared LSP state subscription.</en>
    /// </lang>
    /// </summary>
    private void CreateContent()
    {
        if (this.content is not null)
        {
            return;
        }

        this.data = new DocumentationToolWindowData(
            ReviewSurfaceSnapshot.Load(),
            LanguageServerRuntimeState.Instance);
        this.content = new DocumentationToolWindowControl(this.data);
    }
}
