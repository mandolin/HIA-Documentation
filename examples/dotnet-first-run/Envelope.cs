namespace HiaDocumentationSample;

/// <summary>
/// <para>演示泛型文档字段的容器；本例不保存T类型实例。</para>
/// <para>A container demonstrating generic documentation fields; this sample stores no instance of T.</para>
/// </summary>
/// <typeparam name="T">示例负载类型。 The example payload type.</typeparam>
public sealed class Envelope<T>
{
    /// <summary>
    /// <para>移除标签两端空白。</para>
    /// <para>Remove leading and trailing whitespace from a label.</para>
    /// </summary>
    /// <remarks>
    /// <para>仅处理传入文本，不读取文件、账户或网络。</para>
    /// <para>Processes only the supplied text, without file, account or network access.</para>
    /// </remarks>
    /// <param name="label">待处理标签；不能为null。 Input label; must not be null.</param>
    /// <returns>移除两端空白后的标签。 The label without surrounding whitespace.</returns>
    /// <exception cref="System.ArgumentNullException">label为null时抛出。 Thrown when label is null.</exception>
    public string FormatLabel(string label)
    {
        // <lang lang="zh-CN">拒绝空引用并保留可由调用者识别的参数名；空字符串仍是有效输入。</lang><lang lang="en">Reject null with an identifiable parameter name; an empty string remains valid.</lang>
        if (label is null)
            throw new System.ArgumentNullException(nameof(label));

        // <lang lang="zh-CN">只返回修整后的新文本，不改变输入或外部状态。</lang><lang lang="en">Return trimmed text without mutating the input or external state.</lang>
        return label.Trim();
    }
}
