namespace HiaDocumentation.VisualStudio;

using Microsoft.VisualStudio.Extensibility.UI;

/// <summary>
/// <lang>
/// <zh-CN>把只读状态模型连接到同名 Remote UI XAML 资源。</zh-CN>
/// <en>Connects the read-only status model to the matching Remote UI XAML resource.</en>
/// </lang>
/// </summary>
internal sealed class DocumentationToolWindowControl : RemoteUserControl
{
    /// <summary>
    /// <lang>
    /// <zh-CN>使用可序列化的工具窗口数据创建远程控件。</zh-CN>
    /// <en>Creates the remote control with serializable tool-window data.</en>
    /// </lang>
    /// </summary>
    /// <param name="dataContext">
    /// <lang>
    /// <zh-CN>发送给 Visual Studio 进程的只读数据模型。</zh-CN>
    /// <en>The read-only data model sent to the Visual Studio process.</en>
    /// </lang>
    /// </param>
    public DocumentationToolWindowControl(DocumentationToolWindowData dataContext)
        : base(dataContext)
    {
    }
}
