namespace HiaDocumentation.VisualStudio;

using System;
using System.Runtime.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Extensibility.UI;

/// <summary>
/// <lang>
/// <zh-CN>定义 W-P51.3 工具窗口可安全显示的本地化只读 authoring/review 状态。</zh-CN>
/// <en>Defines the localized read-only authoring and review state that the W-P51.3 tool window may safely display.</en>
/// </lang>
/// </summary>
[DataContract]
internal sealed class DocumentationToolWindowData : NotifyPropertyChangedObject, IDisposable
{
    private readonly LanguageServerRuntimeState languageServerRuntimeState;
    private ReviewMetric[] languageServerMetrics;
    private ReviewMetric[] projectionMetrics;

    /// <summary>
    /// <lang>
    /// <zh-CN>从合同摘要创建 Remote UI 数据；只投影计数、状态和安全边界。</zh-CN>
    /// <en>Creates Remote UI data from a contract snapshot, projecting only counts, states, and safety boundaries.</en>
    /// </lang>
    /// </summary>
    /// <param name="snapshot">
    /// <lang>
    /// <zh-CN>从嵌入式 review-surface 合同提取的 public-safe 摘要。</zh-CN>
    /// <en>The public-safe summary extracted from the embedded review-surface contract.</en>
    /// </lang>
    /// </param>
    /// <param name="languageServerRuntimeState">
    /// <lang>
    /// <zh-CN>由 LSP provider 维护的共享 public-safe 生命周期状态。</zh-CN>
    /// <en>The shared public-safe lifecycle state maintained by the LSP provider.</en>
    /// </lang>
    /// </param>
    public DocumentationToolWindowData(
        ReviewSurfaceSnapshot snapshot,
        LanguageServerRuntimeState languageServerRuntimeState)
    {
        this.languageServerRuntimeState = languageServerRuntimeState;
        this.ProductName = LocalizedStrings.Get("ProductName");
        this.Phase = LocalizedStrings.Format("PhaseFormat", "W-P51.5");
        this.Locale = LocalizedStrings.Format(
            "LocaleFormat",
            LocalizedStrings.CurrentCultureName);
        this.Boundary = LocalizedStrings.Get("BoundarySummary");
        this.OverviewTab = LocalizedStrings.Get("OverviewTab");
        this.AuthoringTab = LocalizedStrings.Get("AuthoringTab");
        this.ReviewTab = LocalizedStrings.Get("ReviewTab");
        this.SafetyTab = LocalizedStrings.Get("SafetyTab");
        this.LanguageServerTab = LocalizedStrings.Get("LanguageServerTab");
        this.ProjectionTab = LocalizedStrings.Get("ProjectionTab");
        this.OverviewMetrics =
        [
            Metric("ContractLabel", snapshot.Contract),
            Metric("ContractStatusLabel", snapshot.Status),
            Metric(
                "ContractLoadLabel",
                LocalizedStrings.Get(
                    snapshot.LoadSucceeded
                        ? "ContractLoadReady"
                        : "ContractLoadUnavailable")),
            Metric("ViewCountLabel", snapshot.ViewCount),
            Metric("ActionCountLabel", snapshot.ActionCount),
        ];
        this.AuthoringMetrics =
        [
            Metric("AuthoringStatusLabel", snapshot.AuthoringStatus),
            Metric("CanonicalMarkersLabel", snapshot.CanonicalMarkers),
            Metric("AuthoringModeCountLabel", snapshot.AuthoringModeCount),
            Flag("ChangedScopeLabel", snapshot.ChangedScopePreviewVisible),
            Flag("CoverageRemediationLabel", snapshot.CoverageRemediationVisible),
            Metric(
                "RemediationBatchCountLabel",
                snapshot.RemediationBatchCount),
            Metric(
                "P0RemediationBatchCountLabel",
                snapshot.P0RemediationBatchCount),
            Metric(
                "GeneratedBindingStepCountLabel",
                snapshot.GeneratedBindingAuthoringStepCount),
            Metric(
                "GeneratedBindingDiagnosticCountLabel",
                snapshot.GeneratedBindingDiagnosticGuidanceCount),
            Flag(
                "GeneratedBindingSyntaxFrozenLabel",
                snapshot.GeneratedBindingConcreteSyntaxFrozen),
        ];
        this.ReviewMetrics =
        [
            Metric("ProviderReviewStatusLabel", snapshot.ProviderReviewStatus),
            Metric("ProviderTaxonomyLabel", snapshot.ProviderTaxonomyKindCount),
            Metric("TargetOwnerStatusLabel", snapshot.TargetOwnerStatus),
            Metric("EvidenceCheckCountLabel", snapshot.EvidenceCheckCount),
            Metric("DeferredGateCountLabel", snapshot.DeferredGateCount),
            Flag("TargetOwnerActionLabel", snapshot.TargetOwnerActionRequired),
        ];
        this.SafetyMetrics =
        [
            Metric("HostUxStatusLabel", snapshot.HostUxStatus),
            Metric("HostUxRequirementCountLabel", snapshot.HostUxRequirementCount),
            Flag("ApplyAvailableLabel", snapshot.ApplyAvailable),
            Flag("WorkspaceWriteLabel", snapshot.WorkspaceWriteAvailable),
            Flag(
                "TargetMutationLabel",
                snapshot.TargetRepositoryMutationAllowed),
            Flag("ProviderNetworkLabel", snapshot.ProviderNetworkExecuted),
            Flag("SourceBodyLabel", snapshot.SourceBodyIncluded),
            Metric("SourcesContentPolicyLabel", snapshot.SourcesContentPolicy),
        ];
        this.languageServerMetrics = CreateLanguageServerMetrics(
            languageServerRuntimeState.Current);
        this.projectionMetrics = CreateProjectionMetrics(
            AuthoringProjectionSnapshot.Unavailable(
                "projection-not-started",
                "not-resolved"));
        this.languageServerRuntimeState.Changed +=
            this.OnLanguageServerRuntimeStateChanged;
    }

    [DataMember]
    public string ProductName { get; }

    [DataMember]
    public string Phase { get; }

    [DataMember]
    public string Locale { get; }

    [DataMember]
    public string Boundary { get; }

    [DataMember]
    public string OverviewTab { get; }

    [DataMember]
    public string AuthoringTab { get; }

    [DataMember]
    public string ReviewTab { get; }

    [DataMember]
    public string SafetyTab { get; }

    [DataMember]
    public string LanguageServerTab { get; }

    [DataMember]
    public string ProjectionTab { get; }

    [DataMember]
    public ReviewMetric[] OverviewMetrics { get; }

    [DataMember]
    public ReviewMetric[] AuthoringMetrics { get; }

    [DataMember]
    public ReviewMetric[] ReviewMetrics { get; }

    [DataMember]
    public ReviewMetric[] SafetyMetrics { get; }

    [DataMember]
    public ReviewMetric[] LanguageServerMetrics
    {
        get => this.languageServerMetrics;
        private set => this.SetProperty(
            ref this.languageServerMetrics,
            value);
    }

    [DataMember]
    public ReviewMetric[] ProjectionMetrics
    {
        get => this.projectionMetrics;
        private set => this.SetProperty(
            ref this.projectionMetrics,
            value);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>通过隔离的只读 LSP 会话刷新实时 authoring/remediation 摘要。</zh-CN>
    /// <en>Refreshes the live authoring/remediation summary through an isolated read-only LSP session.</en>
    /// </lang>
    /// </summary>
    public async Task RefreshAuthoringProjectionAsync(
        CancellationToken cancellationToken)
    {
        this.ProjectionMetrics = CreateProjectionMetrics(
            new(
                "loading",
                "projection-requesting",
                "not-resolved",
                "isolated-read-only",
                0,
                0,
                0,
                0,
                0,
                0,
                "pending",
                0,
                0,
                0,
                0,
                "pending",
                false,
                false,
                "none"));
        AuthoringProjectionSnapshot snapshot =
            await AuthoringProjectionProbe.RunAsync(
                cancellationToken).ConfigureAwait(false);
        this.ProjectionMetrics = CreateProjectionMetrics(snapshot);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>解除共享 LSP 状态订阅，避免关闭工具窗口后保留数据模型。</zh-CN>
    /// <en>Detaches the shared LSP state subscription so closing the tool window does not retain the data model.</en>
    /// </lang>
    /// </summary>
    public void Dispose()
    {
        this.languageServerRuntimeState.Changed -=
            this.OnLanguageServerRuntimeStateChanged;
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>创建一个本地化标签与合同值组成的只读指标。</zh-CN>
    /// <en>Creates a read-only metric from a localized label and a contract value.</en>
    /// </lang>
    /// </summary>
    private static ReviewMetric Metric(string labelKey, object value)
    {
        return new ReviewMetric(
            LocalizedStrings.Get(labelKey),
            Convert.ToString(
                value,
                System.Globalization.CultureInfo.CurrentUICulture)
                ?? string.Empty);
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>把布尔安全状态映射为本地化的启用或禁用文本。</zh-CN>
    /// <en>Maps a Boolean safety state to localized enabled or disabled text.</en>
    /// </lang>
    /// </summary>
    private static ReviewMetric Flag(string labelKey, bool value)
    {
        return Metric(
            labelKey,
            LocalizedStrings.Get(value ? "EnabledValue" : "DisabledValue"));
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>把 LSP 生命周期快照投影成只含稳定状态码的本地化指标。</zh-CN>
    /// <en>Projects an LSP lifecycle snapshot into localized metrics containing stable status codes only.</en>
    /// </lang>
    /// </summary>
    private static ReviewMetric[] CreateLanguageServerMetrics(
        LanguageServerRuntimeSnapshot snapshot)
    {
        return
        [
            Metric("LanguageServerStateLabel", snapshot.State),
            Metric("LanguageServerReasonLabel", snapshot.ReasonCode),
            Metric("LanguageServerRuntimeOriginLabel", snapshot.RuntimeOrigin),
            Metric("LanguageServerPackageLabel", "@hia-doc/lsp@0.1.0"),
            Metric("LanguageServerTransportLabel", "stdio"),
            Metric("LanguageServerNodeLabel", ">=20.19.0"),
            Metric("LanguageServerSelectorLabel", "*.hia.json; *.docmap.json"),
            Metric(
                "LanguageServerDiagnosticPolicyLabel",
                LocalizedStrings.Get("LanguageServerDiagnosticPolicyValue")),
        ];
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>把实时 custom-request 结果压缩为不含 fixture 正文、路径或 proposal 文本的指标。</zh-CN>
    /// <en>Compresses live custom-request results into metrics without fixture bodies, paths, or proposal text.</en>
    /// </lang>
    /// </summary>
    private static ReviewMetric[] CreateProjectionMetrics(
        AuthoringProjectionSnapshot snapshot)
    {
        return
        [
            Metric("ProjectionStateLabel", snapshot.State),
            Metric("ProjectionReasonLabel", snapshot.ReasonCode),
            Metric("ProjectionSessionModeLabel", snapshot.SessionMode),
            Metric("ProjectionRuntimeOriginLabel", snapshot.RuntimeOrigin),
            Metric("ProjectionRequestCountLabel", snapshot.RequestCount),
            Metric("ProjectionCapabilityCountLabel", snapshot.CapabilityCount),
            Metric(
                "ProjectionAvailableCapabilityCountLabel",
                snapshot.AvailableCapabilityCount),
            Metric(
                "ProjectionPartialCapabilityCountLabel",
                snapshot.PartialCapabilityCount),
            Metric(
                "ProjectionPlannedCapabilityCountLabel",
                snapshot.PlannedCapabilityCount),
            Metric(
                "ProjectionUnsupportedCapabilityCountLabel",
                snapshot.UnsupportedCapabilityCount),
            Metric(
                "ProjectionLanguageMarkerStatusLabel",
                snapshot.LanguageMarkerCapabilityStatus),
            Metric(
                "ProjectionAuthoringLocationCountLabel",
                snapshot.AuthoringLocationCount),
            Metric(
                "ProjectionAuthoringLocationKindCountLabel",
                snapshot.AuthoringLocationKindCount),
            Metric("ProjectionProposalCountLabel", snapshot.ProposalCount),
            Metric("ProjectionDraftCountLabel", snapshot.DraftCount),
            Metric("ProjectionProposalStatusLabel", snapshot.ProposalStatus),
            Flag(
                "ProjectionAutomaticWriteLabel",
                snapshot.AllowsAutomaticWrites),
            Flag(
                "ProjectionSourceContentLabel",
                snapshot.IncludesSourceContent),
            Metric(
                "ProjectionSourcesContentPolicyLabel",
                snapshot.SourcesContentPolicy),
        ];
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>在 provider 生命周期变化时刷新 Remote UI 指标。</zh-CN>
    /// <en>Refreshes Remote UI metrics when the provider lifecycle changes.</en>
    /// </lang>
    /// </summary>
    private void OnLanguageServerRuntimeStateChanged(
        LanguageServerRuntimeSnapshot snapshot)
    {
        this.LanguageServerMetrics = CreateLanguageServerMetrics(snapshot);
    }
}

/// <summary>
/// <lang>
/// <zh-CN>表示 Remote UI 中一行可序列化的只读标签和值。</zh-CN>
/// <en>Represents one serializable read-only label and value row in the Remote UI.</en>
/// </lang>
/// </summary>
[DataContract]
internal sealed class ReviewMetric
{
    public ReviewMetric(string label, string value)
    {
        this.Label = label;
        this.Value = value;
    }

    [DataMember]
    public string Label { get; }

    [DataMember]
    public string Value { get; }
}
