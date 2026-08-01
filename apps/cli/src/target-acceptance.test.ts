import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runCli, type CliIo } from "./index.js";
import {
  createTargetDocumentationAcceptanceReport,
  TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT,
  TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT_VERSION
} from "./target-acceptance.js";

/**
 * Create a complete public-safe evidence fixture without target source, HTML, manifest, or path content.
 *
 * 中文：创建 complete public-safe evidence fixture；不含 target source、HTML、manifest 或 path content。
 * English: Create a complete public-safe evidence fixture without target source, HTML, manifest, or path content.
 *
 * @returns synthetic generated-docs evidence summary. synthetic generated-docs evidence summary。
 * @lang zh-CN fixture 模拟 owner 已生成的 summary，不暗示任何真实 target 已运行或采用 HIA workflow。
 */
function createEvidenceFixture(): Record<string, unknown> {
  return {
    contract: "hia-generated-docs-evidence-summary",
    contractVersion: "0.1.0-draft",
    status: "ready",
    requiredOutputs: {
      indexHtml: true,
      manifest: true,
      projectIndex: true
    },
    entries: {
      stableIds: ["entry:fixture:component", "entry:fixture:utility"]
    },
    producers: [
      { status: "success", artifactCount: 3 }
    ],
    privacy: {
      sourcePresentation: "link",
      sourcesContentPolicy: "none",
      sourcesContentPresent: false,
      sourceBodyPresent: false,
      absolutePathLikeStringCount: 0
    }
  };
}

/**
 * Build a controlled test IO adapter rooted in a temporary HIA-owned directory.
 *
 * 中文：构建 rooted in temporary HIA-owned directory 的受控 test IO adapter。
 * English: Build a controlled test IO adapter rooted in a temporary HIA-owned directory.
 *
 * @param cwd - temporary fixture directory. temporary fixture directory。
 * @param messages - captured public CLI messages. captured public CLI messages。
 * @returns deterministic test CLI IO. deterministic test CLI IO。
 */
function createTestIo(cwd: string, messages: string[]): CliIo {
  return {
    cwd,
    // <lang><zh-CN>stdout/stderr 均只保存在 test memory；不会投递到 target repository 或 external service。</zh-CN><en>Both stdout and stderr remain only in test memory; nothing is delivered to a target repository or external service.</en></lang>
    stdout: (message) => messages.push(message),
    stderr: (message) => messages.push(message)
  };
}

describe("target documentation acceptance", () => {
  it("accepts complete public-safe evidence and declares no target mutation permission", () => {
    // <lang><zh-CN>pure evaluator 只接收 memory evidence；assertion 验证 report 不需要 source body/network/write permission。</zh-CN><en>The pure evaluator receives memory evidence only; assertions verify the report needs no source-body/network/write permission.</en></lang>
    const report = createTargetDocumentationAcceptanceReport({
      evidence: createEvidenceFixture(),
      targetFamily: "unicode-compatible",
      targetId: "unicodeartjs"
    });

    expect(report).toMatchObject({
      contract: TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT,
      contractVersion: TARGET_DOCUMENTATION_ACCEPTANCE_CONTRACT_VERSION,
      status: "accepted",
      target: { id: "unicodeartjs", family: "unicode-compatible" },
      acceptance: {
        stableEntryIdentity: { entryCount: 2, uniqueCount: 2, duplicateCount: 0 },
        requiredPermissions: { targetRepositoryWrite: false, sourceBodyRead: false, network: false }
      }
    });
    expect(report.diagnostics).toEqual([]);
  });

  it("refuses embedded evidence and duplicate stable entry identities", () => {
    // <lang><zh-CN>负向样本仅改变 memory clone；它验证 privacy 与 identity 不会被其他成功字段掩盖。</zh-CN><en>The negative sample changes a memory clone only; it verifies privacy and identity cannot be masked by other successful fields.</en></lang>
    const evidence = createEvidenceFixture();
    const entries = evidence.entries as { stableIds: string[] };
    const privacy = evidence.privacy as { sourceBodyPresent: boolean; sourcePresentation: string; sourcesContentPolicy: string };
    entries.stableIds.push("entry:fixture:component");
    privacy.sourcePresentation = "embed";
    privacy.sourcesContentPolicy = "explicit-embed";
    privacy.sourceBodyPresent = true;

    const report = createTargetDocumentationAcceptanceReport({
      evidence,
      targetFamily: "html-authoring",
      targetId: "html-authoring-fixture"
    });

    expect(report.status).toBe("refused");
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "HIA_TARGET_ACCEPTANCE_STABLE_IDENTITY_INVALID",
      "HIA_TARGET_ACCEPTANCE_PRIVACY_REFUSED"
    ]));
  });

  it("CLI reads only explicit relative evidence and writes a refusal report only to explicit caller output", async () => {
    // <lang><zh-CN>temporary root 是 test 唯一可写位置；它不位于九个 target repository，也不会持久化到 main-repo fixture。</zh-CN><en>The temporary root is the only writable test location; it is outside the nine target repositories and never persists into a main-repo fixture.</en></lang>
    const root = await mkdtemp(path.join(os.tmpdir(), "hia-target-acceptance-"));
    const messages: string[] = [];
    try {
      const evidence = createEvidenceFixture();
      const privacy = evidence.privacy as { absolutePathLikeStringCount: number };
      privacy.absolutePathLikeStringCount = 1;
      await writeFile(path.join(root, "evidence.json"), JSON.stringify(evidence), "utf8");

      const exitCode = await runCli([
        "docs",
        "acceptance",
        "--evidence",
        "evidence.json",
        "--target-id",
        "portal-fixture",
        "--target-family",
        "enterprise-business",
        "--out",
        "reports/acceptance.json"
      ], createTestIo(root, messages));
      const report = JSON.parse(await readFile(path.join(root, "reports", "acceptance.json"), "utf8")) as {
        status: string;
        privacy: { absolutePathLikeStringCount: number };
      };

      expect(exitCode).toBe(1);
      expect(report.status).toBe("refused");
      expect(report.privacy.absolutePathLikeStringCount).toBe(1);
      expect(messages.join("\n")).toContain("HIA_TARGET_ACCEPTANCE_PRIVACY_REFUSED");
      expect(messages.join("\n")).not.toContain(root);
    } finally {
      // <lang><zh-CN>删除 exact temporary root；测试不会修改 target、main-repo fixture 或 caller workspace。</zh-CN><en>Delete the exact temporary root; the test modifies no target, main-repo fixture, or caller workspace.</en></lang>
      await rm(root, { force: true, recursive: true });
    }
  });
});
