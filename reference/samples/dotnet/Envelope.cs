namespace HiaDocumentationSample;

/// <summary>
/// <lang><zh-CN>演示泛型文档字段的容器；本例不保存T类型实例。</zh-CN><en>A container demonstrating generic documentation fields; this sample stores no instance of T.</en></lang>
/// </summary>
/// <typeparam name="T"><lang><zh-CN>示例负载类型。</zh-CN><en>The example payload type.</en></lang></typeparam>
public sealed class Envelope<T>
{
    /// <summary>
    /// <lang><zh-CN>移除标签两端空白。</zh-CN><en>Remove leading and trailing whitespace from a label.</en></lang>
    /// </summary>
    /// <remarks>
    /// <lang><zh-CN>仅处理传入文本，不读取文件、账户或网络。</zh-CN><en>Processes only the supplied text, without file, account or network access.</en></lang>
    /// </remarks>
    /// <param name="label"><lang><zh-CN>待处理标签；不能为null。</zh-CN><en>Input label; must not be null.</en></lang></param>
    /// <returns><lang><zh-CN>移除两端空白后的标签。</zh-CN><en>The label without surrounding whitespace.</en></lang></returns>
    /// <exception cref="System.ArgumentNullException"><lang><zh-CN>label为null时抛出。</zh-CN><en>Thrown when label is null.</en></lang></exception>
    public string FormatLabel(string label)
    {
        // <lang><zh-CN>拒绝空引用并保留可由调用者识别的参数名；空字符串仍是有效输入。</zh-CN><en>Reject null with an identifiable parameter name; an empty string remains valid.</en></lang>
        if (label is null)
        {
            throw new System.ArgumentNullException(nameof(label));
        }

        // <lang><zh-CN>只返回修整后的新文本，不改变输入或外部状态。</zh-CN><en>Return trimmed text without mutating the input or external state.</en></lang>
        return label.Trim();
    }
}
