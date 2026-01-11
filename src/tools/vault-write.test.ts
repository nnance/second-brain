import assert from "node:assert";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { generateSlug, vaultWrite } from "./vault-write.js";

// Use the same vault path as the test script sets
const TEST_VAULT_PATH = process.env.VAULT_PATH || "/tmp/test-vault";

describe("vault-write-tool", () => {
  before(async () => {
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Ideas"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Inbox"), { recursive: true });
  });

  after(async () => {
    // Don't delete folders - other tests may need them
    // Files will be cleaned up automatically or by the test vault cleanup
  });

  describe("vaultWrite", () => {
    it("creates file in correct folder", async () => {
      const result = await vaultWrite({
        folder: "Tasks",
        title: "Test Note Tool",
        content: "Test content",
        tags: ["test"],
        confidence: 85,
      });

      assert.equal(result.success, true);
      assert.ok(result.filepath?.startsWith("Tasks/"));
      assert.ok(result.filename?.endsWith(".md"));
    });

    it("generates correct filename format", async () => {
      const result = await vaultWrite({
        folder: "Ideas",
        title: "My Great Idea Tool",
        content: "Content here",
        tags: [],
        confidence: 90,
      });

      assert.equal(result.success, true);
      const datePrefix = new Date().toISOString().split("T")[0];
      assert.ok(result.filename?.startsWith(datePrefix));
      assert.ok(result.filename?.includes("my-great-idea-tool"));
    });

    it("creates valid YAML frontmatter with tags", async () => {
      const result = await vaultWrite({
        folder: "Tasks",
        title: "Tagged Note Tool",
        content: "Content",
        tags: ["person/sarah", "project/security-audit"],
        confidence: 92,
      });

      assert.equal(result.success, true);
      assert.ok(result.filepath);

      const fullPath = join(TEST_VAULT_PATH, result.filepath);
      const content = await readFile(fullPath, "utf-8");

      assert.ok(content.includes("---"));
      assert.ok(content.includes("created:"));
      assert.ok(content.includes("confidence: 92"));
      assert.ok(content.includes("- person/sarah"));
      assert.ok(content.includes("- project/security-audit"));
      assert.ok(content.includes("# Tagged Note Tool"));
    });

    it("handles filename collisions", async () => {
      // Use a unique title to avoid conflicts with previous test runs
      const uniqueTitle = `Collision Test ${Date.now()}`;
      const params = {
        folder: "Inbox" as const,
        title: uniqueTitle,
        content: "First",
        tags: [],
        confidence: 80,
      };

      const result1 = await vaultWrite(params);
      const result2 = await vaultWrite({ ...params, content: "Second" });

      assert.equal(result1.success, true);
      assert.equal(result2.success, true);
      assert.notEqual(result1.filename, result2.filename);
      // Second file should have a -1 suffix
      assert.ok(result2.filename?.includes("-1.md"));
    });

    it("returns error result on failure", async () => {
      const result = await vaultWrite({
        folder: "NonExistent" as never,
        title: "Fail",
        content: "Content",
        tags: [],
        confidence: 50,
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe("generateSlug", () => {
    it("converts to lowercase", () => {
      assert.equal(generateSlug("Hello World"), "hello-world");
    });

    it("removes special characters", () => {
      assert.equal(generateSlug("Hello! World?"), "hello-world");
    });

    it("handles multiple spaces", () => {
      assert.equal(generateSlug("hello    world"), "hello-world");
    });

    it("truncates long titles", () => {
      const longTitle = "a".repeat(100);
      assert.equal(generateSlug(longTitle).length, 50);
    });

    it("handles empty string", () => {
      assert.equal(generateSlug(""), "");
    });

    it("preserves hyphens", () => {
      assert.equal(generateSlug("hello-world"), "hello-world");
    });
  });
});
