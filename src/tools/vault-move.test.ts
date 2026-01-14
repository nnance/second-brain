import assert from "node:assert";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { addArchivalMetadata, vaultMove } from "./vault-move.js";

const TEST_VAULT_PATH = process.env.VAULT_PATH || "/tmp/test-vault";

describe("vault-move-tool", () => {
  before(async () => {
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Archive"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Projects"), { recursive: true });
  });

  after(async () => {
    // Clean up test files
    try {
      await rm(join(TEST_VAULT_PATH, "Archive", "test-move.md"), {
        force: true,
      });
      await rm(join(TEST_VAULT_PATH, "Projects", "test-move-projects.md"), {
        force: true,
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("vaultMove", () => {
    it("moves file to destination folder", async () => {
      // Create a test file
      const testFile = join(TEST_VAULT_PATH, "Tasks", "test-move.md");
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Test Note

Content here.
`,
      );

      const result = await vaultMove({
        source: "Tasks/test-move.md",
        destination: "Archive",
      });

      assert.equal(result.success, true);
      assert.equal(result.newFilepath, "Archive/test-move.md");

      // Verify file was moved
      const movedContent = await readFile(
        join(TEST_VAULT_PATH, "Archive", "test-move.md"),
        "utf-8",
      );
      assert.ok(movedContent.includes("# Test Note"));
    });

    it("adds archival metadata when moving to Archive", async () => {
      // Create a test file
      const testFile = join(TEST_VAULT_PATH, "Tasks", "test-archive-meta.md");
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Archive Test

Content here.
`,
      );

      const result = await vaultMove({
        source: "Tasks/test-archive-meta.md",
        destination: "Archive",
      });

      assert.equal(result.success, true);

      const movedContent = await readFile(
        join(TEST_VAULT_PATH, "Archive", "test-archive-meta.md"),
        "utf-8",
      );
      assert.ok(movedContent.includes("archived_at:"));
      assert.ok(movedContent.includes("original_folder: Tasks"));
    });

    it("does not add archival metadata when moving to non-Archive folder", async () => {
      // Create a test file
      const testFile = join(TEST_VAULT_PATH, "Tasks", "test-move-projects.md");
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Projects Test

Content here.
`,
      );

      const result = await vaultMove({
        source: "Tasks/test-move-projects.md",
        destination: "Projects",
      });

      assert.equal(result.success, true);

      const movedContent = await readFile(
        join(TEST_VAULT_PATH, "Projects", "test-move-projects.md"),
        "utf-8",
      );
      assert.ok(!movedContent.includes("archived_at:"));
      assert.ok(!movedContent.includes("original_folder:"));
    });

    it("returns error for invalid destination folder", async () => {
      const result = await vaultMove({
        source: "Tasks/test.md",
        destination: "InvalidFolder",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Invalid destination folder"));
    });

    it("returns error for non-existent source file", async () => {
      const result = await vaultMove({
        source: "Tasks/non-existent.md",
        destination: "Archive",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Source file not found"));
    });

    it("returns error for directory traversal attempt", async () => {
      const result = await vaultMove({
        source: "../../../etc/passwd",
        destination: "Archive",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("directory traversal"));
    });
  });

  describe("addArchivalMetadata", () => {
    it("adds metadata to file with existing frontmatter", () => {
      const content = `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Test

Content`;

      const result = addArchivalMetadata(content, "Tasks");

      assert.ok(result.includes("archived_at:"));
      assert.ok(result.includes("original_folder: Tasks"));
      assert.ok(result.includes("created: 2026-01-14T10:00:00Z"));
      assert.ok(result.includes("# Test"));
    });

    it("creates frontmatter for file without one", () => {
      const content = "# Test\n\nContent";

      const result = addArchivalMetadata(content, "Ideas");

      assert.ok(result.startsWith("---\n"));
      assert.ok(result.includes("archived_at:"));
      assert.ok(result.includes("original_folder: Ideas"));
      assert.ok(result.includes("# Test"));
    });

    it("overwrites existing archived_at value", () => {
      const content = `---
created: 2026-01-14T10:00:00Z
archived_at: 2025-01-01T00:00:00Z
original_folder: Projects
---

# Test`;

      const result = addArchivalMetadata(content, "Tasks");

      // Should only have one archived_at
      const matches = result.match(/archived_at:/g);
      assert.equal(matches?.length, 1);

      // Should have new original_folder
      assert.ok(result.includes("original_folder: Tasks"));
    });
  });
});
