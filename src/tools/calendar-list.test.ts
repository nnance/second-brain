import assert from "node:assert";
import { describe, it } from "node:test";
import { calculateDateRange, calendarList } from "./calendar-list.js";

describe("calendar-list-tool", () => {
  describe("calculateDateRange", () => {
    it("calculates today range", () => {
      const result = calculateDateRange("today");

      assert.equal(result.success, true);
      assert.ok(result.from);
      assert.ok(result.to);

      // from should be start of today
      assert.equal(result.from.getHours(), 0);
      assert.equal(result.from.getMinutes(), 0);
      assert.equal(result.from.getSeconds(), 0);

      // to should be start of tomorrow
      const diffMs = result.to.getTime() - result.from.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      assert.equal(diffMs, oneDayMs);
    });

    it("calculates tomorrow range", () => {
      const result = calculateDateRange("tomorrow");

      assert.equal(result.success, true);
      assert.ok(result.from);
      assert.ok(result.to);

      // from should be start of tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expectedFrom = new Date(today);
      expectedFrom.setDate(expectedFrom.getDate() + 1);

      assert.equal(result.from.getDate(), expectedFrom.getDate());
      assert.equal(result.from.getMonth(), expectedFrom.getMonth());
    });

    it("calculates this_week range", () => {
      const result = calculateDateRange("this_week");

      assert.equal(result.success, true);
      assert.ok(result.from);
      assert.ok(result.to);

      // to should be end of Sunday
      const now = new Date();
      assert.ok(result.to > now);
    });

    it("handles custom range with valid dates", () => {
      const result = calculateDateRange(
        "custom",
        "2026-01-15T00:00:00Z",
        "2026-01-20T00:00:00Z",
      );

      assert.equal(result.success, true);
      assert.ok(result.from);
      assert.ok(result.to);
      assert.equal(result.from.toISOString(), "2026-01-15T00:00:00.000Z");
      assert.equal(result.to.toISOString(), "2026-01-20T00:00:00.000Z");
    });

    it("returns error for custom range without from", () => {
      const result = calculateDateRange(
        "custom",
        undefined,
        "2026-01-20T00:00:00Z",
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Both 'from' and 'to' are required"));
    });

    it("returns error for custom range without to", () => {
      const result = calculateDateRange(
        "custom",
        "2026-01-15T00:00:00Z",
        undefined,
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Both 'from' and 'to' are required"));
    });

    it("returns error for invalid date format", () => {
      const result = calculateDateRange(
        "custom",
        "not-a-date",
        "2026-01-20T00:00:00Z",
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Invalid date format"));
    });

    it("returns error when from is after to", () => {
      const result = calculateDateRange(
        "custom",
        "2026-01-20T00:00:00Z",
        "2026-01-15T00:00:00Z",
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("'from' must be before 'to'"));
    });
  });

  describe("calendarList", () => {
    it("returns empty events when no calendar configured", async () => {
      // Default config has calendar provider = 'none'
      const result = await calendarList({ range: "today" });

      assert.equal(result.success, true);
      assert.ok(result.events);
      assert.equal(result.events.length, 0);
    });

    it("defaults to today range", async () => {
      const result = await calendarList({});

      assert.equal(result.success, true);
      assert.ok(result.events);
      // Events should be empty (null provider)
      assert.equal(result.events.length, 0);
    });

    it("returns error for invalid custom range", async () => {
      const result = await calendarList({
        range: "custom",
        from: "2026-01-20T00:00:00Z",
        // Missing 'to'
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });
});
