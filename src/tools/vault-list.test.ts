import assert from "node:assert";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { vaultList } from "./vault-list.js";

// Use isolated vault path for this test to avoid conflicts with parallel tests
const TEST_VAULT_PATH = join(tmpdir(), `vault-list-test-${Date.now()}`);

// Use unique prefix to avoid conflicts with other tests
const PREFIX = "vault-list-test-";

describe("vault-list-tool", () => {
  before(async () => {
    // Create test folders
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Ideas"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Reference"), { recursive: true });

    // Create test files with unique prefix
    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", `${PREFIX}task1.md`),
      `---
created: 2026-01-10T14:00:00Z
tags:
  - person/sarah
  - priority/high
confidence: 90
---

# Follow up with Sarah

Content here.
`,
      "utf-8",
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", `${PREFIX}task2.md`),
      `---
created: 2026-01-09T10:00:00Z
tags:
  - person/john
  - priority/low
confidence: 80
---

# Review John's PR

Content here.
`,
      "utf-8",
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Ideas", `${PREFIX}idea1.md`),
      `---
created: 2026-01-08T08:00:00Z
tags: [topic/ai, priority/high]
confidence: 75
---

# AI-powered automation

Great idea about AI.
`,
      "utf-8",
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Reference", `${PREFIX}ref1.md`),
      `---
created: 2026-01-07T12:00:00Z
tags: []
confidence: 100
---

# Documentation Link

Reference content.
`,
      "utf-8",
    );
  });

  after(async () => {
    // Clean up entire isolated test vault
    try {
      await rm(TEST_VAULT_PATH, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("vaultList", () => {
    it("lists all files when no folder specified", async () => {
      const result = await vaultList({ _vaultPath: TEST_VAULT_PATH });

      assert.equal(result.success, true);
      assert.ok(result.files);
      // At least our test files should be present
      assert.ok(result.files.length >= 4);
    });

    it("lists files from specific folder", async () => {
      const result = await vaultList({
        folder: "Tasks",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      // Our test files should be in Tasks
      const testFiles = result.files.filter((f) => f.filepath.includes(PREFIX));
      assert.ok(testFiles.length >= 2);
      assert.ok(result.files.every((f) => f.filepath.startsWith("Tasks/")));
    });

    it("filters by single tag", async () => {
      const result = await vaultList({
        tags: ["person/sarah"],
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      // At least our test file with person/sarah tag
      assert.ok(result.files.length >= 1);
      assert.ok(result.files.every((f) => f.tags.includes("person/sarah")));
    });

    it("filters by multiple tags (AND logic)", async () => {
      const result = await vaultList({
        tags: ["person/sarah", "priority/high"],
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      assert.ok(result.files.length >= 1);
      assert.ok(
        result.files.every(
          (f) =>
            f.tags.includes("person/sarah") && f.tags.includes("priority/high"),
        ),
      );
    });

    it("respects limit parameter", async () => {
      const result = await vaultList({ limit: 2, _vaultPath: TEST_VAULT_PATH });

      assert.equal(result.success, true);
      assert.ok(result.files);
      assert.equal(result.files.length, 2);
    });

    it("returns empty array for empty folder", async () => {
      // Create an empty folder
      await mkdir(join(TEST_VAULT_PATH, "EmptyTestFolder"), {
        recursive: true,
      });

      const result = await vaultList({
        folder: "EmptyTestFolder",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      assert.equal(result.files.length, 0);

      // Cleanup
      await rm(join(TEST_VAULT_PATH, "EmptyTestFolder"), {
        recursive: true,
        force: true,
      });
    });

    it("handles missing folder gracefully", async () => {
      const result = await vaultList({
        folder: "NonExistent",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      assert.equal(result.files.length, 0);
    });

    it("sorts by created date (newest first)", async () => {
      const result = await vaultList({
        folder: "Tasks",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);
      // Get only our test files to check sorting
      const testFiles = result.files.filter((f) => f.filepath.includes(PREFIX));
      assert.ok(testFiles.length >= 2);

      // First file should be newer than second
      const dates = testFiles.map((f) => new Date(f.created).getTime());
      for (let i = 1; i < dates.length; i++) {
        assert.ok(
          dates[i - 1] >= dates[i],
          "Files should be sorted newest first",
        );
      }
    });

    it("extracts title from H1 heading", async () => {
      const result = await vaultList({
        folder: "Tasks",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);

      const sarahTask = result.files.find((f) =>
        f.filepath.includes(`${PREFIX}task1.md`),
      );
      assert.ok(sarahTask);
      assert.equal(sarahTask.title, "Follow up with Sarah");
    });

    it("parses inline tag format", async () => {
      const result = await vaultList({
        folder: "Ideas",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, true);
      assert.ok(result.files);

      const idea = result.files.find((f) =>
        f.filepath.includes(`${PREFIX}idea1.md`),
      );
      assert.ok(idea);
      assert.ok(idea.tags.includes("topic/ai"));
      assert.ok(idea.tags.includes("priority/high"));
    });

    it("blocks path traversal attempts", async () => {
      const result = await vaultList({
        folder: "../etc",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, false);
      assert.equal(
        result.error,
        "Invalid folder path: directory traversal not allowed",
      );
    });

    it("blocks path with embedded traversal", async () => {
      const result = await vaultList({
        folder: "Tasks/../../../etc",
        _vaultPath: TEST_VAULT_PATH,
      });

      assert.equal(result.success, false);
      assert.equal(
        result.error,
        "Invalid folder path: directory traversal not allowed",
      );
    });
  });
});
