namespace HiaDocumentation.VisualStudio;

using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.Commands;

/// <summary>
/// <lang>
/// <zh-CN>从 Visual Studio 的“其他窗口”菜单打开 HIA Documentation 工具窗口。</zh-CN>
/// <en>Opens the HIA Documentation tool window from the Visual Studio Other Windows menu.</en>
/// </lang>
/// </summary>
[VisualStudioContribution]
public sealed class ShowDocumentationToolWindowCommand : Command
{
    /// <inheritdoc />
    public override CommandConfiguration CommandConfiguration => new(
        "%HiaDocumentation.ShowToolWindow.DisplayName%")
    {
        Placements = [CommandPlacement.KnownPlacements.ViewOtherWindowsMenu],
        Icon = new(ImageMoniker.KnownValues.ToolWindow, IconSettings.IconAndText),
    };

    /// <inheritdoc />
    public override Task ExecuteCommandAsync(
        IClientContext context,
        CancellationToken cancellationToken)
    {
        return this.Extensibility
            .Shell()
            .ShowToolWindowAsync<DocumentationToolWindow>(
                activate: true,
                cancellationToken);
    }
}
