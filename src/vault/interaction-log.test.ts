import assert from "node:assert";
import { mkdir, readFile, rm } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import {
  formatLogEntry,
  formatLogFileName,
  formatLogHeader,
  writeInteractionLog,
} from "./interaction-log.js";

describe("interaction-log", () => {
  describe("formatLogFileName", () => {
    it("should format date as YYYY-MM-DD.md", () => {
      const date = new Date("2026-01-10T14:32:00Z");
      assert.strictEqual(formatLogFileName(date), "2026-01-10.md");
    });

    it("should handle different dates", () => {
      const date = new Date("2025-12-25T23:59:59Z");
      assert.strictEqual(formatLogFileName(date), "2025-12-25.md");
    });
  });

  describe("formatLogHeader", () => {
    it("should produce correct header", () => {
      const date = new Date("2026-01-10T14:32:00Z");
      assert.strictEqual(
        formatLogHeader(date),
        "# Interaction Log: 2026-01-10\n",
      );
    });
  });

  describe("formatLogEntry", () => {
    it("should produce valid markdown entry", () => {
      const entry = {
        timestamp: new Date("2026-01-10T14:32:00.000Z"),
        input: "remind me to follow up with Sarah",
        storedPath: "Inbox/2026-01-10_remind-me-to-follow-up-with-sarah.md",
      };

      const content = formatLogEntry(entry);

      assert.ok(content.includes("---"));
      assert.ok(content.includes("## 14:32:00"));
      assert.ok(
        content.includes('**Input:** "remind me to follow up with Sarah"'),
      );
      assert.ok(
        content.includes(
          "**Stored:** `Inbox/2026-01-10_remind-me-to-follow-up-with-sarah.md`",
        ),
      );
    });

    it("should handle different timestamps", () => {
      const entry = {
        timestamp: new Date("2026-01-10T09:05:30.000Z"),
        input: "test input",
        storedPath: "Inbox/test.md",
      };

      const content = formatLogEntry(entry);

      assert.ok(content.includes("## 09:05:30"));
    });
  });

  describe("writeInteractionLog", () => {
    const testVaultPath = "/tmp/test-vault";

    before(async () => {
      // Create test vault directory structure
      await mkdir(`${testVaultPath}/_system/logs`, { recursive: true });
    });

    after(async () => {
      // Clean up test files
      try {
        await rm(`${testVaultPath}/_system/logs`, {
          recursive: true,
          force: true,
        });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should create a new log file with header", async () => {
      const entry = {
        timestamp: new Date("2026-01-15T10:00:00.000Z"),
        input: "test message",
        storedPath: "Inbox/test.md",
      };

      await writeInteractionLog(entry);

      const content = await readFile(
        `${testVaultPath}/_system/logs/2026-01-15.md`,
        "utf-8",
      );
      assert.ok(content.startsWith("# Interaction Log: 2026-01-15"));
      assert.ok(content.includes("## 10:00:00"));
      assert.ok(content.includes('**Input:** "test message"'));
    });

    it("should append to existing log file", async () => {
      const entry1 = {
        timestamp: new Date("2026-01-16T10:00:00.000Z"),
        input: "first message",
        storedPath: "Inbox/first.md",
      };
      const entry2 = {
        timestamp: new Date("2026-01-16T11:00:00.000Z"),
        input: "second message",
        storedPath: "Inbox/second.md",
      };

      await writeInteractionLog(entry1);
      await writeInteractionLog(entry2);

      const content = await readFile(
        `${testVaultPath}/_system/logs/2026-01-16.md`,
        "utf-8",
      );
      assert.ok(content.includes("## 10:00:00"));
      assert.ok(content.includes("## 11:00:00"));
      assert.ok(content.includes("first message"));
      assert.ok(content.includes("second message"));
    });
  });
});
