import logger from "../logger.js";
import type { CalendarEvent, CalendarProvider } from "./types.js";

export function createNullCalendarProvider(): CalendarProvider {
  return {
    name: "none",

    async listEvents(_from: Date, _to: Date): Promise<CalendarEvent[]> {
      logger.debug("Calendar not configured, returning empty events");
      return [];
    },

    async findEventByTitle(
      _title: string,
      _around?: Date,
    ): Promise<CalendarEvent | null> {
      logger.debug("Calendar not configured, cannot find event");
      return null;
    },
  };
}
