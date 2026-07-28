namespace HiaDocumentation.VisualStudio;

using System.Globalization;
using System.Resources;

/// <summary>
/// <lang>
/// <zh-CN>集中读取 Visual Studio Remote UI 的本地化字符串资源。</zh-CN>
/// <en>Provides centralized access to localized strings for the Visual Studio Remote UI.</en>
/// </lang>
/// </summary>
internal static class LocalizedStrings
{
    private static readonly ResourceManager ResourceManager = new(
        "HiaDocumentation.VisualStudio.Resources",
        typeof(LocalizedStrings).Assembly);

    /// <summary>
    /// <lang>
    /// <zh-CN>获取当前 Visual Studio 扩展进程的界面语言名称。</zh-CN>
    /// <en>Gets the UI culture name of the current Visual Studio extension process.</en>
    /// </lang>
    /// </summary>
    public static string CurrentCultureName =>
        string.IsNullOrWhiteSpace(CultureInfo.CurrentUICulture.Name)
            ? "en-US"
            : CultureInfo.CurrentUICulture.Name;

    /// <summary>
    /// <lang>
    /// <zh-CN>按当前界面语言读取资源；缺失时回退到中性英文资源和资源键。</zh-CN>
    /// <en>Reads a resource for the current UI culture, falling back to the neutral English resource and then the key.</en>
    /// </lang>
    /// </summary>
    /// <param name="key">
    /// <lang>
    /// <zh-CN>资源键。</zh-CN>
    /// <en>The resource key.</en>
    /// </lang>
    /// </param>
    /// <returns>
    /// <lang>
    /// <zh-CN>已本地化的字符串。</zh-CN>
    /// <en>The localized string.</en>
    /// </lang>
    /// </returns>
    public static string Get(string key)
    {
        return ResourceManager.GetString(key, CultureInfo.CurrentUICulture)
            ?? ResourceManager.GetString(key, CultureInfo.InvariantCulture)
            ?? key;
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>使用当前界面语言格式化资源字符串。</zh-CN>
    /// <en>Formats a resource string with the current UI culture.</en>
    /// </lang>
    /// </summary>
    /// <param name="key">
    /// <lang>
    /// <zh-CN>资源键。</zh-CN>
    /// <en>The resource key.</en>
    /// </lang>
    /// </param>
    /// <param name="arguments">
    /// <lang>
    /// <zh-CN>格式化参数。</zh-CN>
    /// <en>The formatting arguments.</en>
    /// </lang>
    /// </param>
    /// <returns>
    /// <lang>
    /// <zh-CN>格式化后的本地化字符串。</zh-CN>
    /// <en>The formatted localized string.</en>
    /// </lang>
    /// </returns>
    public static string Format(string key, params object[] arguments)
    {
        return string.Format(
            CultureInfo.CurrentUICulture,
            Get(key),
            arguments);
    }
}
