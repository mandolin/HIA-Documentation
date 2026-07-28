import { describe, expect, it } from "vitest";
import {
  HIA_WP53_SELF_SANDBOX_INITIAL_TEXT,
  HIA_WP53_SELF_SANDBOX_SCOPE_ID,
  HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME,
  createHiaWp53SelfSandboxReport,
  runHiaWp53SelfSandboxTransaction,
  type HiaWp53SelfSandboxHost,
  type HiaWp53SelfSandboxSnapshot
} from "./checked-apply-self-sandbox.js";

describe("W-P53 VS Code checked-apply self-sandbox", () => {
  it("applies only after confirmation, validates, and restores the exact fixture", async () => {
    const fixture = createFixtureHost();

    const result = await runHiaWp53SelfSandboxTransaction(fixture.host);
    const report = createHiaWp53SelfSandboxReport(result).join("\n");

    expect(result.outcome).toBe("completed-and-rolled-back");
    expect(result.workspaceApplyAttemptCount).toBe(2);
    expect(fixture.intents).toEqual(["apply", "rollback"]);
    expect(fixture.currentText()).toBe(HIA_WP53_SELF_SANDBOX_INITIAL_TEXT);
    expect(report).not.toContain(HIA_WP53_SELF_SANDBOX_INITIAL_TEXT);
    expect(report).toContain("Target repository mutation: disabled");
    expect(report).toContain("Source body, digest and absolute path: not included");
  });

  it("does not read or mutate a sandbox in an untrusted workspace", async () => {
    const fixture = createFixtureHost({ workspaceTrusted: false });

    const result = await runHiaWp53SelfSandboxTransaction(fixture.host);

    expect(result.outcome).toBe("blocked-untrusted-workspace");
    expect(fixture.readCount()).toBe(0);
    expect(fixture.intents).toEqual([]);
  });

  it("does not mutate when the final confirmation is cancelled", async () => {
    const fixture = createFixtureHost({ confirmed: false });

    const result = await runHiaWp53SelfSandboxTransaction(fixture.host);

    expect(result.outcome).toBe("cancelled-final-confirmation");
    expect(fixture.intents).toEqual([]);
  });

  it("blocks before apply when the post-confirmation version recheck changes", async () => {
    const fixture = createFixtureHost({ mutateOnConfirmation: true });

    const result = await runHiaWp53SelfSandboxTransaction(fixture.host);

    expect(result.outcome).toBe("blocked-version-conflict");
    expect(result.workspaceApplyAttemptCount).toBe(0);
    expect(fixture.intents).toEqual([]);
  });

  it("restores the fixture when post-apply validation fails", async () => {
    const fixture = createFixtureHost({ corruptApplyResult: true });

    const result = await runHiaWp53SelfSandboxTransaction(fixture.host);

    expect(result.outcome).toBe("failed-post-apply-validation-rolled-back");
    expect(result.rollbackStatus).toBe("restored");
    expect(fixture.intents).toEqual(["apply", "rollback"]);
    expect(fixture.currentText()).toBe(HIA_WP53_SELF_SANDBOX_INITIAL_TEXT);
  });
});

function createFixtureHost(options: {
  confirmed?: boolean;
  corruptApplyResult?: boolean;
  mutateOnConfirmation?: boolean;
  workspaceTrusted?: boolean;
} = {}) {
  let text = HIA_WP53_SELF_SANDBOX_INITIAL_TEXT;
  let version = 1;
  let reads = 0;
  const intents: Array<"apply" | "rollback"> = [];

  const createSnapshot = (): HiaWp53SelfSandboxSnapshot => ({
    handle: "synthetic-fixture",
    scopeId: HIA_WP53_SELF_SANDBOX_SCOPE_ID,
    text,
    version
  });
  const host: HiaWp53SelfSandboxHost = {
    workspaceTrusted: options.workspaceTrusted ?? true,
    async getWorkspacePackageName() {
      return HIA_WP53_SELF_SANDBOX_WORKSPACE_NAME;
    },
    async readSandboxSnapshot() {
      reads += 1;
      return createSnapshot();
    },
    async requestFinalConfirmation() {
      if (options.mutateOnConfirmation) {
        text = `${text}\n`;
        version += 1;
      }
      return options.confirmed ?? true;
    },
    async replaceSandboxText(snapshot, nextText, intent) {
      intents.push(intent);
      if (snapshot.version !== version) {
        return false;
      }
      text = intent === "apply" && options.corruptApplyResult ? "corrupted fixture\n" : nextText;
      version += 1;
      return true;
    }
  };

  return {
    currentText: () => text,
    host,
    intents,
    readCount: () => reads
  };
}
