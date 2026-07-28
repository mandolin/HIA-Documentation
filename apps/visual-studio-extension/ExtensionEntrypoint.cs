namespace HiaDocumentation.VisualStudio;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.Extensibility;

/// <summary>
/// <lang>
/// <zh-CN>定义 HIA Documentation Visual Studio 扩展的稳定入口与公开元数据。</zh-CN>
/// <en>Defines the stable entry point and public metadata for the HIA Documentation Visual Studio extension.</en>
/// </lang>
/// </summary>
[VisualStudioContribution]
public sealed class ExtensionEntrypoint : Extension
{
    /// <inheritdoc />
    public override ExtensionConfiguration ExtensionConfiguration => new()
    {
        Metadata = new(
            id: "HiaDocumentation.VisualStudio.f56aeeb6-e79c-4656-a536-dbdc9acfbdb6",
            version: this.ExtensionAssemblyVersion,
            publisherName: "mandolin",
            displayName: "HIA Documentation",
            description: "HIA Documentation authoring and review tools for Visual Studio"),
    };

    /// <inheritdoc />
    protected override void InitializeServices(IServiceCollection serviceCollection)
    {
        base.InitializeServices(serviceCollection);
    }
}
