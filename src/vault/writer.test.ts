// Set VAULT_PATH before any imports that depend on config
process.env.VAULT_PATH = "/tmp/test-vault-writer";

import assert from "node:assert";
import { mkdir, rm } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import {
  formatDatePrefix,
  formatNoteContent,
  generateSlug,
  writeNote,
} from "./writer.js";

describe("writer", () => {
  describe("generateSlug", () => {
    it("should convert to lowercase", () => {
      assert.strictEqual(generateSlug("Hello World"), "hello-world");
    });

    it("should replace spaces with hyphens", () => {
      assert.strictEqual(generateSlug("my test title"), "my-test-title");
    });

    it("should remove special characters", () => {
      assert.strictEqual(
        generateSlug("test! @title# $with% ^special&"),
        "test-title-with-special",
      );
    });

    it("should truncate to 50 characters", () => {
      const longTitle =
        "this is a very long title that should be truncated to fifty characters maximum";
      const slug = generateSlug(longTitle);
      assert.ok(slug.length <= 50);
    });

    it("should handle multiple spaces", () => {
      assert.strictEqual(generateSlug("hello    world"), "hello-world");
    });
  });

  describe("formatDatePrefix", () => {
    it("should format date as YYYY-MM-DD", () => {
      const date = new Date("2026-01-10T14:32:00Z");
      assert.strictEqual(formatDatePrefix(date), "2026-01-10");
    });

    it("should handle different months and days", () => {
      const date = new Date("2025-12-25T00:00:00Z");
      assert.strictEqual(formatDatePrefix(date), "2025-12-25");
    });
  });

  describe("formatNoteContent", () => {
    it("should produce valid frontmatter", () => {
      const metadata = {
        created: new Date("2026-01-10T14:32:00.000Z"),
        source: "imessage",
        confidence: null,
        tags: [],
      };

      const content = formatNoteContent("Test Title", "Test body", metadata);

      assert.ok(content.startsWith("---\n"));
      assert.ok(content.includes("created: 2026-01-10T14:32:00.000Z"));
      assert.ok(content.includes("source: imessage"));
      assert.ok(content.includes("confidence: null"));
      assert.ok(content.includes("tags: []"));
      assert.ok(content.includes("# Test Title"));
      assert.ok(content.includes("Test body"));
    });

    it("should include tags when provided", () => {
      const metadata = {
        created: new Date("2026-01-10T14:32:00.000Z"),
        source: "imessage",
        confidence: 85,
        tags: ["person/sarah", "project/security"],
      };

      const content = formatNoteContent("Test", "Body", metadata);

      assert.ok(content.includes("tags: [person/sarah, project/security]"));
      assert.ok(content.includes("confidence: 85"));
    });
  });

  describe("writeNote", () => {
    const testVaultPath = "/tmp/test-vault-writer";

    before(async () => {
      // Create test vault directory structure
      await mkdir(`${testVaultPath}/Inbox`, { recursive: true });
    });

    after(async () => {
      // Clean up test files
      try {
        await rm(testVaultPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should create a file with correct filename format", async () => {
      const result = await writeNote({
        folder: "Inbox",
        title: "Test Note",
        body: "Test content",
        metadata: {
          created: new Date("2026-01-10T14:32:00Z"),
          source: "imessage",
          confidence: null,
          tags: [],
        },
      });

      assert.ok(result.fileName.includes("2026-01-10"));
      assert.ok(result.fileName.includes("test-note"));
      assert.ok(result.fileName.endsWith(".md"));
    });
  });
});
