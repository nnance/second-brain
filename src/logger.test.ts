import assert from "node:assert";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import logger, { cleanOldLogs } from "./logger.js";

describe("logger", () => {
  it("should be defined", () => {
    assert.ok(logger);
  });

  it("should have info method", () => {
    assert.strictEqual(typeof logger.info, "function");
  });

  it("should have debug method", () => {
    assert.strictEqual(typeof logger.debug, "function");
  });

  it("should have warn method", () => {
    assert.strictEqual(typeof logger.warn, "function");
  });

  it("should have error method", () => {
    assert.strictEqual(typeof logger.error, "function");
  });
});

describe("cleanOldLogs", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "logger-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("does nothing for non-existent directory", () => {
    const nonExistentDir = join(tempDir, "non-existent");

    // Should not throw
    cleanOldLogs(nonExistentDir, 7);

    assert.ok(!existsSync(nonExistentDir));
  });

  it("does nothing for empty directory", () => {
    cleanOldLogs(tempDir, 7);

    const files = readdirSync(tempDir);
    assert.deepStrictEqual(files, []);
  });

  it("does not delete recent log files", () => {
    const logFile = join(tempDir, "second-brain.1.log");
    writeFileSync(logFile, "log content");

    cleanOldLogs(tempDir, 7);

    assert.ok(existsSync(logFile));
  });

  it("deletes old log files", () => {
    const logFile = join(tempDir, "second-brain.1.log");
    writeFileSync(logFile, "old log content");

    // Set file modification time to 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    utimesSync(logFile, tenDaysAgo, tenDaysAgo);

    cleanOldLogs(tempDir, 7);

    assert.ok(!existsSync(logFile));
  });

  it("only deletes files matching second-brain.*.log pattern", () => {
    // Create various files
    const matchingFile = join(tempDir, "second-brain.1.log");
    const nonMatchingFile1 = join(tempDir, "other.log");
    const nonMatchingFile2 = join(tempDir, "second-brain.txt");
    const nonMatchingFile3 = join(tempDir, "second-brain-backup.log");

    writeFileSync(matchingFile, "content");
    writeFileSync(nonMatchingFile1, "content");
    writeFileSync(nonMatchingFile2, "content");
    writeFileSync(nonMatchingFile3, "content");

    // Set all files to be old
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    utimesSync(matchingFile, tenDaysAgo, tenDaysAgo);
    utimesSync(nonMatchingFile1, tenDaysAgo, tenDaysAgo);
    utimesSync(nonMatchingFile2, tenDaysAgo, tenDaysAgo);
    utimesSync(nonMatchingFile3, tenDaysAgo, tenDaysAgo);

    cleanOldLogs(tempDir, 7);

    // Matching file should be deleted
    assert.ok(!existsSync(matchingFile));
    // Non-matching files should remain
    assert.ok(existsSync(nonMatchingFile1));
    assert.ok(existsSync(nonMatchingFile2));
    assert.ok(existsSync(nonMatchingFile3));
  });

  it("respects custom retention days", () => {
    const logFile = join(tempDir, "second-brain.1.log");
    writeFileSync(logFile, "log content");

    // Set file modification time to 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    utimesSync(logFile, threeDaysAgo, threeDaysAgo);

    // With 7-day retention, file should remain
    cleanOldLogs(tempDir, 7);
    assert.ok(existsSync(logFile));

    // With 2-day retention, file should be deleted
    cleanOldLogs(tempDir, 2);
    assert.ok(!existsSync(logFile));
  });
});
