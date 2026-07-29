namespace HiaDocumentation.VisualStudio;

using System;
using System.IO;
using System.Linq;
using System.Text.Json;

/// <summary>
/// <lang>
/// <zh-CN>保存从嵌入式 review-surface 合同提取的 public-safe 只读摘要。</zh-CN>
/// <en>Stores a public-safe read-only summary extracted from the embedded review-surface contract.</en>
/// </lang>
/// </summary>
internal sealed class ReviewSurfaceSnapshot
{
    private const string ResourceName = "HiaDocumentation.VisualStudio.review-surface.json";

    private ReviewSurfaceSnapshot()
    {
    }

    public bool LoadSucceeded { get; private init; }

    public string Contract { get; private init; } = "unavailable";

    public string Status { get; private init; } = "unavailable";

    public int ViewCount { get; private init; }

    public int ActionCount { get; private init; }

    public string CanonicalMarkers { get; private init; } = string.Empty;

    public string AuthoringStatus { get; private init; } = "unavailable";

    public int AuthoringModeCount { get; private init; }

    public bool ChangedScopePreviewVisible { get; private init; }

    public bool CoverageRemediationVisible { get; private init; }

    public int RemediationBatchCount { get; private init; }

    public int P0RemediationBatchCount { get; private init; }

    public int GeneratedBindingAuthoringStepCount { get; private init; }

    public int GeneratedBindingDiagnosticGuidanceCount { get; private init; }

    public bool GeneratedBindingConcreteSyntaxFrozen { get; private init; }

    /// <summary>
    /// <lang>
    /// <zh-CN>生成式文档绑定关系投影的可用状态。</zh-CN>
    /// <en>Availability state of the generated documentation binding relation projection.</en>
    /// </lang>
    /// </summary>
    public string GeneratedBindingRelationStatus { get; private init; } = "unavailable";

    public int GeneratedBindingRelationBindingCount { get; private init; }

    public int GeneratedBindingRelationExpansionCount { get; private init; }

    public int GeneratedBindingRelationTargetCount { get; private init; }

    public int GeneratedBindingRelationDiagnosticCount { get; private init; }

    public int GeneratedBindingRelationStableInstanceKeyCount { get; private init; }

    public bool GeneratedBindingRelationTargetsVisible { get; private init; }

    public bool GeneratedBindingRelationQualityVisible { get; private init; }

    /// <summary><lang><zh-CN>文档质量审查投影的可用状态。</zh-CN><en>Availability state of the documentation-quality-review projection.</en></lang></summary>
    public string DocumentationQualityReviewStatus { get; private init; } = "unavailable";

    /// <summary><lang><zh-CN>质量审查投影固定的只读操作策略。</zh-CN><en>Fixed read-only action policy of the quality-review projection.</en></lang></summary>
    public string DocumentationQualityReviewActionPolicy { get; private init; } = "review-only";

    /// <summary><lang><zh-CN>可显示的质量审查 finding 总数。</zh-CN><en>Total number of displayable quality-review findings.</en></lang></summary>
    public int DocumentationQualityReviewFindingCount { get; private init; }

    /// <summary><lang><zh-CN>ROP 类质量审查 finding 数。</zh-CN><en>Number of ROP quality-review findings.</en></lang></summary>
    public int DocumentationQualityReviewRopFindingCount { get; private init; }

    /// <summary><lang><zh-CN>固有术语类质量审查 finding 数。</zh-CN><en>Number of terminology quality-review findings.</en></lang></summary>
    public int DocumentationQualityReviewTerminologyFindingCount { get; private init; }

    /// <summary><lang><zh-CN>语言资源类质量审查 finding 数。</zh-CN><en>Number of locale-resource quality-review findings.</en></lang></summary>
    public int DocumentationQualityReviewLocaleResourceFindingCount { get; private init; }

    /// <summary><lang><zh-CN>不能推断的 unavailable finding 数。</zh-CN><en>Number of unavailable findings that must not be inferred.</en></lang></summary>
    public int DocumentationQualityReviewUnavailableFindingCount { get; private init; }

    /// <summary><lang><zh-CN>所有质量审查 finding 是否仍要求人工审查。</zh-CN><en>Whether every quality-review finding continues to require human review.</en></lang></summary>
    public bool DocumentationQualityReviewRequiresHumanReview { get; private init; }

    public string ProviderReviewStatus { get; private init; } = "unavailable";

    public int ProviderTaxonomyKindCount { get; private init; }

    public string TargetOwnerStatus { get; private init; } = "unavailable";

    public int EvidenceCheckCount { get; private init; }

    public int DeferredGateCount { get; private init; }

    public bool TargetOwnerActionRequired { get; private init; }

    public string HostUxStatus { get; private init; } = "unavailable";

    public int HostUxRequirementCount { get; private init; }

    public bool ApplyAvailable { get; private init; }

    public bool WorkspaceWriteAvailable { get; private init; }

    public bool TargetRepositoryMutationAllowed { get; private init; }

    public bool ProviderNetworkExecuted { get; private init; }

    public bool SourceBodyIncluded { get; private init; }

    public string SourcesContentPolicy { get; private init; } = "none";

    /// <summary>
    /// <lang>
    /// <zh-CN>从程序集资源中解析合同摘要；格式错误时返回不含路径或异常正文的安全失败状态。</zh-CN>
    /// <en>Parses the contract summary from an assembly resource and returns a path-free safe failure state when the format is invalid.</en>
    /// </lang>
    /// </summary>
    /// <returns>
    /// <lang>
    /// <zh-CN>可供 Remote UI 序列化的只读摘要。</zh-CN>
    /// <en>A read-only summary suitable for Remote UI serialization.</en>
    /// </lang>
    /// </returns>
    public static ReviewSurfaceSnapshot Load()
    {
        using Stream? stream = typeof(ReviewSurfaceSnapshot)
            .Assembly
            .GetManifestResourceStream(ResourceName);

        if (stream is null)
        {
            return new ReviewSurfaceSnapshot();
        }

        try
        {
            using JsonDocument document = JsonDocument.Parse(stream);
            JsonElement root = document.RootElement;
            JsonElement authoring = ReadObject(root, "authoringProjection");
            JsonElement generatedBinding = ReadObject(
                root,
                "generatedDocumentationBindingProjection");
            JsonElement generatedBindingSummary = ReadObject(generatedBinding, "summary");
            JsonElement documentationQualityReview = ReadObject(
                root,
                "documentationQualityReview");
            JsonElement documentationQualityReviewSummary = ReadObject(
                documentationQualityReview,
                "summary");
            JsonElement provider = ReadObject(root, "providerReviewPanel");
            JsonElement targetOwner = ReadObject(root, "targetOwnerEvidenceView");
            JsonElement hostUx = ReadObject(root, "hostApplyUx");
            JsonElement privacy = ReadObject(root, "privacy");

            return new ReviewSurfaceSnapshot
            {
                LoadSucceeded = true,
                Contract = ReadString(root, "contract"),
                Status = ReadString(root, "status"),
                ViewCount = ReadArrayLength(root, "views"),
                ActionCount = ReadArrayLength(root, "actions"),
                CanonicalMarkers = string.Join(
                    ", ",
                    ReadStringArray(
                        ReadObject(root, "languageAuthoringHints"),
                        "canonicalMarkers")),
                AuthoringStatus = ReadString(authoring, "status"),
                AuthoringModeCount = ReadInt32(authoring, "authoringModeCount"),
                ChangedScopePreviewVisible = ReadBoolean(authoring, "changedScopePreviewVisible"),
                CoverageRemediationVisible = ReadBoolean(authoring, "coverageRemediationVisible"),
                RemediationBatchCount = ReadInt32(authoring, "remediationBatchCount"),
                P0RemediationBatchCount = ReadInt32(authoring, "p0RemediationBatchCount"),
                GeneratedBindingAuthoringStepCount =
                    ReadInt32(authoring, "generatedBindingAuthoringStepCount"),
                GeneratedBindingDiagnosticGuidanceCount =
                    ReadInt32(authoring, "generatedBindingDiagnosticGuidanceCount"),
                GeneratedBindingConcreteSyntaxFrozen =
                    ReadBoolean(authoring, "generatedBindingConcreteSyntaxFrozen"),
                GeneratedBindingRelationStatus = ReadString(
                    generatedBinding,
                    "status"),
                GeneratedBindingRelationBindingCount = ReadInt32(
                    generatedBindingSummary,
                    "bindingCount"),
                GeneratedBindingRelationExpansionCount = ReadInt32(
                    generatedBindingSummary,
                    "expansionCount"),
                GeneratedBindingRelationTargetCount = ReadInt32(
                    generatedBindingSummary,
                    "targetCount"),
                GeneratedBindingRelationDiagnosticCount = ReadInt32(
                    generatedBindingSummary,
                    "diagnosticCount"),
                GeneratedBindingRelationStableInstanceKeyCount = ReadInt32(
                    generatedBindingSummary,
                    "stableInstanceKeyCount"),
                GeneratedBindingRelationTargetsVisible = ReadBoolean(
                    generatedBinding,
                    "targetRelationVisible"),
                GeneratedBindingRelationQualityVisible = ReadBoolean(
                    generatedBinding,
                    "threeQualityDimensionsVisible"),
                DocumentationQualityReviewStatus = ReadString(
                    documentationQualityReview,
                    "status"),
                DocumentationQualityReviewActionPolicy = ReadString(
                    documentationQualityReview,
                    "actionPolicy"),
                DocumentationQualityReviewFindingCount = ReadInt32(
                    documentationQualityReviewSummary,
                    "findingCount"),
                DocumentationQualityReviewRopFindingCount = ReadInt32(
                    documentationQualityReviewSummary,
                    "ropFindingCount"),
                DocumentationQualityReviewTerminologyFindingCount = ReadInt32(
                    documentationQualityReviewSummary,
                    "terminologyFindingCount"),
                DocumentationQualityReviewLocaleResourceFindingCount = ReadInt32(
                    documentationQualityReviewSummary,
                    "localeResourceFindingCount"),
                DocumentationQualityReviewUnavailableFindingCount = ReadInt32(
                    documentationQualityReviewSummary,
                    "unavailableFindingCount"),
                DocumentationQualityReviewRequiresHumanReview = ReadBoolean(
                    documentationQualityReview,
                    "requiresHumanReview"),
                ProviderReviewStatus = ReadString(provider, "status"),
                ProviderTaxonomyKindCount = ReadInt32(provider, "resultTaxonomyKindCount"),
                TargetOwnerStatus = ReadString(targetOwner, "status"),
                EvidenceCheckCount = ReadInt32(targetOwner, "evidenceCompletenessCheckCount"),
                DeferredGateCount = ReadInt32(targetOwner, "deferredGateCount"),
                TargetOwnerActionRequired = ReadBoolean(targetOwner, "targetOwnerActionRequired"),
                HostUxStatus = ReadString(hostUx, "status"),
                HostUxRequirementCount = ReadInt32(hostUx, "uxRequirementRefCount"),
                ApplyAvailable = ReadApplyAvailability(root),
                WorkspaceWriteAvailable = ReadBoolean(hostUx, "workspaceWriteAvailable"),
                TargetRepositoryMutationAllowed =
                    ReadBoolean(privacy, "allowTargetRepositoryMutation"),
                ProviderNetworkExecuted = ReadBoolean(hostUx, "providerNetworkExecuted"),
                SourceBodyIncluded = ReadBoolean(privacy, "embedsSourcesContent"),
                SourcesContentPolicy = ReadString(authoring, "sourcesContentPolicy"),
            };
        }
        catch (JsonException)
        {
            return new ReviewSurfaceSnapshot();
        }
    }

    /// <summary>
    /// <lang>
    /// <zh-CN>只在结构匹配时返回对象节点，避免将自由文本或数组误当成合同对象。</zh-CN>
    /// <en>Returns an object node only when the structure matches, preventing free text or arrays from being treated as contract objects.</en>
    /// </lang>
    /// </summary>
    private static JsonElement ReadObject(JsonElement parent, string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(propertyName, out JsonElement value)
            && value.ValueKind == JsonValueKind.Object
                ? value
                : default;
    }

    private static string ReadString(JsonElement parent, string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(propertyName, out JsonElement value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? "unavailable"
                : "unavailable";
    }

    private static int ReadInt32(JsonElement parent, string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(propertyName, out JsonElement value)
            && value.TryGetInt32(out int result)
                ? result
                : 0;
    }

    private static bool ReadBoolean(JsonElement parent, string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(propertyName, out JsonElement value)
            && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            && value.GetBoolean();
    }

    private static int ReadArrayLength(JsonElement parent, string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(propertyName, out JsonElement value)
            && value.ValueKind == JsonValueKind.Array
                ? value.GetArrayLength()
                : 0;
    }

    private static string[] ReadStringArray(JsonElement parent, string propertyName)
    {
        if (parent.ValueKind != JsonValueKind.Object
            || !parent.TryGetProperty(propertyName, out JsonElement value)
            || value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return value
            .EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Cast<string>()
            .ToArray();
    }

    private static bool ReadApplyAvailability(JsonElement root)
    {
        if (!root.TryGetProperty("actions", out JsonElement actions)
            || actions.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        foreach (JsonElement action in actions.EnumerateArray())
        {
            if (ReadString(action, "id") == "apply-candidate")
            {
                return ReadBoolean(action, "available");
            }
        }

        return false;
    }
}
