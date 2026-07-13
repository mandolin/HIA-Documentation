import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 为项目聚合选择规则提供一对等价的 HTML extraction 与 HIA document。
 * Provides equivalent HTML extraction and HIA document artifacts for the project aggregation preference rule.
 */
export default {
  descriptor: {
    contract: "documentation-producer",
    contractVersion: "0.1.0-draft",
    id: "preferred-hia-document-fixture",
    version: "0.0.0",
    displayName: "Preferred HIA Document Fixture",
    inputKinds: ["fixture-source"],
    outputKinds: ["htmdoc-extraction", "hia-document"],
    capabilities: {
      sourceLinkage: false,
      incremental: false,
      watch: false
    }
  },
  async produce(request) {
    await mkdir(request.outputDirectory, { recursive: true });

    const extractionPath = "profile-card.htmdoc.json";
    const documentPath = "profile-card.hia.json";
    const source = {
      path: "src/profile-card.html",
      range: {
        start: { line: 1, column: 1 },
        end: { line: 3, column: 10 }
      }
    };
    const symbol = {
      id: "html:component:profile-card",
      kind: "html-component",
      name: "profile-card",
      summary: "Profile card component.",
      source
    };

    await writeFile(path.join(request.outputDirectory, extractionPath), `${JSON.stringify({
      contract: "hia-htmdoc-extraction",
      contractVersion: "0.1.0-draft",
      source: { kind: "html", path: source.path },
      symbols: [symbol],
      diagnostics: []
    }, null, 2)}\n`, "utf8");
    await writeFile(path.join(request.outputDirectory, documentPath), `${JSON.stringify({
      schemaVersion: "0.2.0",
      id: "fixture:profile-card",
      title: "Profile Card",
      defaultLocale: "en",
      locales: ["en"],
      nodes: [{ id: "root", kind: "root", title: "Profile Card", symbolIds: [symbol.id] }],
      symbols: [{
        ...symbol,
        source: {
          model: "hia-source",
          modelVersion: "0.2.0",
          mode: "link",
          definedIn: {
            kind: "defined-in",
            relativePath: source.path,
            language: "html",
            position: source.range.start,
            range: source.range
          },
          fragments: []
        }
      }],
      diagnostics: []
    }, null, 2)}\n`, "utf8");

    return {
      contract: "documentation-producer-result",
      contractVersion: "0.1.0-draft",
      producer: {
        id: "preferred-hia-document-fixture",
        version: "0.0.0"
      },
      status: "success",
      artifacts: [
        { id: "profile-card-extraction", kind: "htmdoc-extraction", path: extractionPath, language: "json", mediaType: "application/json" },
        { id: "profile-card-document", kind: "hia-document", path: documentPath, language: "json", mediaType: "application/json" }
      ],
      diagnostics: []
    };
  }
};
