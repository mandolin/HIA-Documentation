namespace HiaDocumentation.VisualStudio;

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// <lang>
/// <zh-CN>通过隔离的只读 LSP 会话读取 authoring 与 remediation 投影摘要。</zh-CN>
/// <en>Reads authoring and remediation projection summaries through an isolated read-only LSP session.</en>
/// </lang>
/// </summary>
internal static class AuthoringProjectionProbe
{
    private const string FixtureResourceName =
        "HiaDocumentation.VisualStudio.authoring-probe.hia.json";
    private const string FixtureUri =
        "untitled:hia-wp51-authoring-probe.hia.json";
    private static readonly TimeSpan ProbeTimeout = TimeSpan.FromSeconds(12);

    /// <summary>
    /// <lang>
    /// <zh-CN>启动短生命周期 LSP 会话，打开合成 fixture 并调用三个只读 custom request。</zh-CN>
    /// <en>Starts a short-lived LSP session, opens a synthetic fixture, and invokes three read-only custom requests.</en>
    /// </lang>
    /// </summary>
    public static async Task<AuthoringProjectionSnapshot> RunAsync(
        CancellationToken cancellationToken)
    {
        LanguageServerLaunchTarget? launchTarget = null;
        Process? process = null;
        string stage = "startup";

        try
        {
            launchTarget =
                LanguageServerRuntimeLauncher.ResolveLaunchTarget();
            process = LanguageServerRuntimeLauncher.CreateProcess(launchTarget);
            if (!process.Start())
            {
                return AuthoringProjectionSnapshot.Unavailable(
                    "process-start-returned-false",
                    launchTarget.RuntimeOrigin);
            }

            process.BeginErrorReadLine();
            using CancellationTokenSource timeoutSource =
                CancellationTokenSource.CreateLinkedTokenSource(
                    cancellationToken);
            timeoutSource.CancelAfter(ProbeTimeout);
            CancellationToken probeToken = timeoutSource.Token;

            await using LspProjectionClient client = new(
                process.StandardOutput.BaseStream,
                process.StandardInput.BaseStream);
            stage = "initialize";
            await client.InitializeAsync(probeToken).ConfigureAwait(false);
            stage = "fixture-load";
            string fixtureText = await ReadFixtureAsync(
                probeToken).ConfigureAwait(false);
            stage = "did-open";
            await client.OpenDocumentAsync(
                FixtureUri,
                fixtureText,
                probeToken).ConfigureAwait(false);

            stage = "ide-capabilities";
            JsonElement capabilities = await client.SendRequestAsync(
                2,
                "hia/ideCapabilities",
                new { uri = FixtureUri },
                probeToken).ConfigureAwait(false);
            stage = "authoring-locations";
            JsonElement authoringLocations = await client.SendRequestAsync(
                3,
                "hia/documentAuthoringLocations",
                new { uri = FixtureUri },
                probeToken).ConfigureAwait(false);
            stage = "documentation-proposals";
            JsonElement proposals = await client.SendRequestAsync(
                4,
                "hia/documentationEditProposals",
                new { uri = FixtureUri },
                probeToken).ConfigureAwait(false);

            stage = "shutdown";
            await client.ShutdownAsync(probeToken).ConfigureAwait(false);
            return CreateSnapshot(
                launchTarget.RuntimeOrigin,
                capabilities,
                authoringLocations,
                proposals);
        }
        catch (OperationCanceledException)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                cancellationToken.IsCancellationRequested
                    ? "projection-cancelled"
                    : "projection-timeout",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        catch (LanguageServerLaunchException exception)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                exception.ReasonCode,
                exception.RuntimeOrigin);
        }
        catch (Win32Exception)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                "node-runtime-unavailable",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        catch (JsonException)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                $"projection-{stage}-response-invalid",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        catch (InvalidDataException)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                $"projection-{stage}-framing-invalid",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        catch (IOException)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                $"projection-{stage}-transport-failed",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        catch (Exception)
        {
            return AuthoringProjectionSnapshot.Unavailable(
                $"projection-{stage}-unexpected-failure",
                launchTarget?.RuntimeOrigin ?? "not-resolved");
        }
        finally
        {
            StopProcess(process);
        }
    }

    private static async Task<string> ReadFixtureAsync(
        CancellationToken cancellationToken)
    {
        await using Stream stream = typeof(AuthoringProjectionProbe)
            .Assembly
            .GetManifestResourceStream(FixtureResourceName)
            ?? throw new InvalidDataException(
                "The authoring projection fixture is unavailable.");
        using StreamReader reader = new(
            stream,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: true,
            leaveOpen: false);
        return await reader.ReadToEndAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    private static AuthoringProjectionSnapshot CreateSnapshot(
        string runtimeOrigin,
        JsonElement capabilitiesResponse,
        JsonElement authoringResponse,
        JsonElement proposalsResponse)
    {
        JsonElement capabilitiesResult = ReadResult(capabilitiesResponse);
        JsonElement authoringResult = ReadResult(authoringResponse);
        JsonElement proposalsResult = ReadResult(proposalsResponse);
        JsonElement capabilities = ReadArray(
            capabilitiesResult,
            "capabilities");
        JsonElement locations = ReadArray(
            authoringResult,
            "locations");
        JsonElement privacy = ReadObject(proposalsResult, "privacy");
        string markerStatus = capabilities
            .EnumerateArray()
            .Where(item =>
                ReadString(item, "id")
                == "hia.completion.languageMarker")
            .Select(item => ReadString(item, "status"))
            .FirstOrDefault() ?? "unavailable";

        return new(
            "ready",
            "projection-requests-completed",
            runtimeOrigin,
            "isolated-read-only",
            3,
            capabilities.GetArrayLength(),
            CountStatus(capabilities, "available"),
            CountStatus(capabilities, "partial"),
            CountStatus(capabilities, "planned"),
            CountStatus(capabilities, "unsupported"),
            markerStatus,
            locations.GetArrayLength(),
            locations
                .EnumerateArray()
                .Select(item => ReadString(item, "kind"))
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.Ordinal)
                .Count(),
            ReadInt32(proposalsResult, "proposalCount"),
            ReadInt32(proposalsResult, "draftCount"),
            ReadString(proposalsResult, "status"),
            ReadBoolean(privacy, "allowsAutomaticWrites"),
            ReadBoolean(privacy, "includesSourceContent"),
            ReadString(privacy, "sourcesContentPolicy"));
    }

    private static int CountStatus(
        JsonElement capabilities,
        string status)
    {
        return capabilities
            .EnumerateArray()
            .Count(item => ReadString(item, "status") == status);
    }

    private static JsonElement ReadResult(JsonElement response)
    {
        if (response.ValueKind != JsonValueKind.Object
            || !response.TryGetProperty(
                "result",
                out JsonElement result)
            || result.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("LSP response omitted an object result.");
        }

        return result;
    }

    private static JsonElement ReadObject(
        JsonElement parent,
        string propertyName)
    {
        if (parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(
                propertyName,
                out JsonElement value)
            && value.ValueKind == JsonValueKind.Object)
        {
            return value;
        }

        throw new JsonException(
            $"LSP result omitted object property {propertyName}.");
    }

    private static JsonElement ReadArray(
        JsonElement parent,
        string propertyName)
    {
        if (parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(
                propertyName,
                out JsonElement value)
            && value.ValueKind == JsonValueKind.Array)
        {
            return value;
        }

        throw new JsonException(
            $"LSP result omitted array property {propertyName}.");
    }

    private static string ReadString(
        JsonElement parent,
        string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(
                propertyName,
                out JsonElement value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? string.Empty
                : string.Empty;
    }

    private static int ReadInt32(
        JsonElement parent,
        string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(
                propertyName,
                out JsonElement value)
            && value.TryGetInt32(out int result)
                ? result
                : 0;
    }

    private static bool ReadBoolean(
        JsonElement parent,
        string propertyName)
    {
        return parent.ValueKind == JsonValueKind.Object
            && parent.TryGetProperty(
                propertyName,
                out JsonElement value)
            && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            && value.GetBoolean();
    }

    private static void StopProcess(Process? process)
    {
        if (process is null)
        {
            return;
        }

        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
            // <lang><zh-CN>探针进程已并发退出。</zh-CN><en>The probe process exited concurrently.</en></lang>
        }
        finally
        {
            process.Dispose();
        }
    }

    private sealed class LspProjectionClient : IAsyncDisposable
    {
        private readonly Stream input;
        private readonly Stream output;

        public LspProjectionClient(Stream input, Stream output)
        {
            this.input = input;
            this.output = output;
        }

        public async Task InitializeAsync(
            CancellationToken cancellationToken)
        {
            JsonElement response = await this.SendRequestAsync(
                1,
                "initialize",
                new
                {
                    processId = (int?)null,
                    rootUri = (string?)null,
                    capabilities = new { },
                    workspaceFolders = (object?)null,
                },
                cancellationToken).ConfigureAwait(false);
            JsonElement result = ReadResult(response);
            _ = ReadObject(result, "capabilities");
            await this.SendNotificationAsync(
                "initialized",
                new { },
                cancellationToken).ConfigureAwait(false);
        }

        public Task OpenDocumentAsync(
            string uri,
            string text,
            CancellationToken cancellationToken)
        {
            return this.SendNotificationAsync(
                "textDocument/didOpen",
                new
                {
                    textDocument = new
                    {
                        uri,
                        languageId = "hia",
                        version = 1,
                        text,
                    },
                },
                cancellationToken);
        }

        public async Task<JsonElement> SendRequestAsync(
            int id,
            string method,
            object parameters,
            CancellationToken cancellationToken)
        {
            await this.WriteMessageAsync(
                new
                {
                    jsonrpc = "2.0",
                    id,
                    method,
                    @params = parameters,
                },
                cancellationToken).ConfigureAwait(false);

            while (true)
            {
                JsonElement message = await this.ReadMessageAsync(
                    cancellationToken).ConfigureAwait(false);
                if (message.ValueKind == JsonValueKind.Object
                    && message.TryGetProperty(
                        "id",
                        out JsonElement responseId)
                    && responseId.ValueKind == JsonValueKind.Number
                    && responseId.GetInt32() == id)
                {
                    if (message.TryGetProperty(
                        "error",
                        out JsonElement error)
                        && error.ValueKind == JsonValueKind.Object)
                    {
                        throw new JsonException(
                            "LSP custom request returned an error.");
                    }

                    return message;
                }
            }
        }

        public async Task ShutdownAsync(
            CancellationToken cancellationToken)
        {
            _ = await this.SendRequestAsync(
                5,
                "shutdown",
                new { },
                cancellationToken).ConfigureAwait(false);
            await this.SendNotificationAsync(
                "exit",
                new { },
                cancellationToken).ConfigureAwait(false);
        }

        public async ValueTask DisposeAsync()
        {
            await this.output.DisposeAsync().ConfigureAwait(false);
        }

        private Task SendNotificationAsync(
            string method,
            object parameters,
            CancellationToken cancellationToken)
        {
            return this.WriteMessageAsync(
                new
                {
                    jsonrpc = "2.0",
                    method,
                    @params = parameters,
                },
                cancellationToken);
        }

        private async Task WriteMessageAsync(
            object message,
            CancellationToken cancellationToken)
        {
            byte[] body = JsonSerializer.SerializeToUtf8Bytes(message);
            byte[] header = Encoding.ASCII.GetBytes(
                $"Content-Length: {body.Length}\r\n\r\n");
            await this.output.WriteAsync(
                header,
                cancellationToken).ConfigureAwait(false);
            await this.output.WriteAsync(
                body,
                cancellationToken).ConfigureAwait(false);
            await this.output.FlushAsync(
                cancellationToken).ConfigureAwait(false);
        }

        private async Task<JsonElement> ReadMessageAsync(
            CancellationToken cancellationToken)
        {
            List<byte> headerBytes = [];
            byte[] oneByte = new byte[1];
            while (!HasHeaderTerminator(headerBytes))
            {
                int count = await this.input.ReadAsync(
                    oneByte,
                    cancellationToken).ConfigureAwait(false);
                if (count == 0)
                {
                    throw new EndOfStreamException(
                        "LSP stream ended before a complete header.");
                }

                headerBytes.Add(oneByte[0]);
                if (headerBytes.Count > 8192)
                {
                    throw new InvalidDataException(
                        "LSP header exceeded the safe limit.");
                }
            }

            string header = Encoding.ASCII.GetString(
                headerBytes.ToArray());
            int contentLength = ParseContentLength(header);
            byte[] body = new byte[contentLength];
            await this.input.ReadExactlyAsync(
                body,
                cancellationToken).ConfigureAwait(false);
            using JsonDocument document = JsonDocument.Parse(body);
            return document.RootElement.Clone();
        }

        private static bool HasHeaderTerminator(
            IReadOnlyList<byte> bytes)
        {
            int count = bytes.Count;
            return count >= 4
                && bytes[count - 4] == (byte)'\r'
                && bytes[count - 3] == (byte)'\n'
                && bytes[count - 2] == (byte)'\r'
                && bytes[count - 1] == (byte)'\n';
        }

        private static int ParseContentLength(string header)
        {
            foreach (string line in header.Split(
                "\r\n",
                StringSplitOptions.RemoveEmptyEntries))
            {
                int separator = line.IndexOf(':');
                if (separator <= 0
                    || !line[..separator].Equals(
                        "Content-Length",
                        StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (int.TryParse(
                    line[(separator + 1)..].Trim(),
                    out int contentLength)
                    && contentLength is > 0 and <= 4_194_304)
                {
                    return contentLength;
                }
            }

            throw new InvalidDataException(
                "LSP response omitted a valid Content-Length.");
        }
    }
}

/// <summary>
/// <lang>
/// <zh-CN>表示可公开投影的实时 authoring/remediation LSP 摘要。</zh-CN>
/// <en>Represents a public-safe live authoring/remediation LSP summary.</en>
/// </lang>
/// </summary>
internal sealed record AuthoringProjectionSnapshot(
    string State,
    string ReasonCode,
    string RuntimeOrigin,
    string SessionMode,
    int RequestCount,
    int CapabilityCount,
    int AvailableCapabilityCount,
    int PartialCapabilityCount,
    int PlannedCapabilityCount,
    int UnsupportedCapabilityCount,
    string LanguageMarkerCapabilityStatus,
    int AuthoringLocationCount,
    int AuthoringLocationKindCount,
    int ProposalCount,
    int DraftCount,
    string ProposalStatus,
    bool AllowsAutomaticWrites,
    bool IncludesSourceContent,
    string SourcesContentPolicy)
{
    public static AuthoringProjectionSnapshot Unavailable(
        string reasonCode,
        string runtimeOrigin)
    {
        return new(
            "unavailable",
            reasonCode,
            runtimeOrigin,
            "isolated-read-only",
            0,
            0,
            0,
            0,
            0,
            0,
            "unavailable",
            0,
            0,
            0,
            0,
            "unavailable",
            false,
            false,
            "none");
    }
}
