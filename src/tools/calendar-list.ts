import { createCalendarProvider } from "../calendar/provider.js";
import logger from "../logger.js";

export type CalendarRange = "today" | "tomorrow" | "this_week" | "custom";

export interface CalendarListParams {
  range?: CalendarRange;
  from?: string; // ISO 8601, required if range='custom'
  to?: string; // ISO 8601, required if range='custom'
}

export interface CalendarEventInfo {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string;
  location?: string;
  attendees?: string[];
}

export interface CalendarListResult {
  success: boolean;
  events?: CalendarEventInfo[];
  error?: string;
}

export async function calendarList(
  params: CalendarListParams = {},
): Promise<CalendarListResult> {
  try {
    const { range = "today", from, to } = params;

    // Calculate date range
    const dateRange = calculateDateRange(range, from, to);
    if (!dateRange.success) {
      return { success: false, error: dateRange.error };
    }

    const provider = await createCalendarProvider();
    // dateRange.from and dateRange.to are guaranteed to be defined when success=true
    const fromDate = dateRange.from as Date;
    const toDate = dateRange.to as Date;
    const events = await provider.listEvents(fromDate, toDate);

    const eventInfos: CalendarEventInfo[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      location: e.location,
      attendees: e.attendees,
    }));

    logger.debug(
      { range, count: eventInfos.length },
      "calendar_list: Listed events",
    );

    return {
      success: true,
      events: eventInfos,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "calendar_list: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

interface DateRangeResult {
  success: boolean;
  from?: Date;
  to?: Date;
  error?: string;
}

function calculateDateRange(
  range: CalendarRange,
  from?: string,
  to?: string,
): DateRangeResult {
  const now = new Date();

  switch (range) {
    case "today": {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      return { success: true, from: startOfDay, to: endOfDay };
    }

    case "tomorrow": {
      const startOfTomorrow = new Date(now);
      startOfTomorrow.setHours(0, 0, 0, 0);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const endOfTomorrow = new Date(startOfTomorrow);
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
      return { success: true, from: startOfTomorrow, to: endOfTomorrow };
    }

    case "this_week": {
      const endOfWeek = new Date(now);
      const dayOfWeek = endOfWeek.getDay();
      const daysUntilSunday = 7 - dayOfWeek;
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      return { success: true, from: now, to: endOfWeek };
    }

    case "custom": {
      if (!from || !to) {
        return {
          success: false,
          error: "Both 'from' and 'to' are required for custom range",
        };
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return {
          success: false,
          error:
            "Invalid date format. Use ISO 8601 (e.g., 2026-01-15T09:00:00Z)",
        };
      }

      if (fromDate >= toDate) {
        return { success: false, error: "'from' must be before 'to'" };
      }

      return { success: true, from: fromDate, to: toDate };
    }

    default:
      return { success: false, error: `Invalid range: ${range}` };
  }
}

export { calculateDateRange };
