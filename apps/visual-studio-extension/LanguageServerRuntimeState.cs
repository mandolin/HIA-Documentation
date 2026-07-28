namespace HiaDocumentation.VisualStudio;

using System;

/// <summary>
/// <lang>
/// <zh-CN>保存 Visual Studio LSP provider 可公开显示的生命周期快照。</zh-CN>
/// <en>Stores the public-safe lifecycle snapshot exposed by the Visual Studio LSP provider.</en>
/// </lang>
/// </summary>
internal sealed class LanguageServerRuntimeState
{
    private readonly object syncRoot = new();
    private LanguageServerRuntimeSnapshot current = new(
        "configured",
        "awaiting-applicable-document",
        "not-resolved");

    private LanguageServerRuntimeState()
    {
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>获取扩展进程内共享的状态容器。</zh-CN>
    /// <en>Gets the state container shared within the extension process.</en>
    /// </lang>
    /// </summary>
    public static LanguageServerRuntimeState Instance { get; } = new();

    /// <summary>
    /// <lang>
    /// <zh-CN>在生命周期状态变化时发布不含路径和异常正文的快照。</zh-CN>
    /// <en>Publishes a snapshot without paths or exception bodies when lifecycle state changes.</en>
    /// </lang>
    /// </summary>
    public event Action<LanguageServerRuntimeSnapshot>? Changed;

    /// <summary>
    /// <lang>
    /// <zh-CN>获取当前不可变快照。</zh-CN>
    /// <en>Gets the current immutable snapshot.</en>
    /// </lang>
    /// </summary>
    public LanguageServerRuntimeSnapshot Current
    {
        get
        {
            lock (this.syncRoot)
            {
                return this.current;
            }
        }
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>以稳定 reason code 更新状态，禁止把本地路径或原始异常消息带入 Remote UI。</zh-CN>
    /// <en>Updates state with a stable reason code, excluding local paths and raw exception messages from Remote UI.</en>
    /// </lang>
    /// </summary>
    /// <param name="state">
    /// <lang>
    /// <zh-CN>规范化生命周期状态。</zh-CN>
    /// <en>The normalized lifecycle state.</en>
    /// </lang>
    /// </param>
    /// <param name="reasonCode">
    /// <lang>
    /// <zh-CN>可公开显示的稳定原因码。</zh-CN>
    /// <en>The stable public-safe reason code.</en>
    /// </lang>
    /// </param>
    /// <param name="runtimeOrigin">
    /// <lang>
    /// <zh-CN>运行时入口来源类别，不含具体路径。</zh-CN>
    /// <en>The runtime entry origin category without a concrete path.</en>
    /// </lang>
    /// </param>
    public void Transition(
        string state,
        string reasonCode,
        string runtimeOrigin)
    {
        Action<LanguageServerRuntimeSnapshot>? changed;
        LanguageServerRuntimeSnapshot next;

        lock (this.syncRoot)
        {
            next = new(state, reasonCode, runtimeOrigin);
            if (next == this.current)
            {
                return;
            }

            this.current = next;
            changed = this.Changed;
        }

        changed?.Invoke(next);
    }
}

/// <summary>
/// <lang>
/// <zh-CN>表示不含源码、凭据、绝对路径和原始异常的 LSP 生命周期状态。</zh-CN>
/// <en>Represents LSP lifecycle state without source bodies, credentials, absolute paths, or raw exceptions.</en>
/// </lang>
/// </summary>
/// <param name="State">
/// <lang>
/// <zh-CN>生命周期阶段。</zh-CN>
/// <en>The lifecycle stage.</en>
/// </lang>
/// </param>
/// <param name="ReasonCode">
/// <lang>
/// <zh-CN>稳定诊断原因码。</zh-CN>
/// <en>The stable diagnostic reason code.</en>
/// </lang>
/// </param>
/// <param name="RuntimeOrigin">
/// <lang>
/// <zh-CN>运行时入口来源类别。</zh-CN>
/// <en>The runtime entry origin category.</en>
/// </lang>
/// </param>
internal sealed record LanguageServerRuntimeSnapshot(
    string State,
    string ReasonCode,
    string RuntimeOrigin);
