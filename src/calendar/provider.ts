import { config } from "../config.js";
import logger from "../logger.js";
import { createNullCalendarProvider } from "./null-provider.js";
import type { CalendarProvider } from "./types.js";

let cachedProvider: CalendarProvider | null = null;

export async function createCalendarProvider(): Promise<CalendarProvider> {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = config.calendarProvider;

  switch (providerType) {
    case "google":
      try {
        // Lazy import to avoid loading googleapis when not needed
        const { createGoogleCalendarProvider } = await import(
          "./google-provider.js"
        );
        cachedProvider = await createGoogleCalendarProvider();
        logger.info("Google Calendar provider initialized");
        return cachedProvider;
      } catch (error) {
        logger.error(
          { error },
          "Failed to initialize Google Calendar provider",
        );
        cachedProvider = createNullCalendarProvider();
        return cachedProvider;
      }
    default:
      logger.debug("Calendar provider set to none, using null provider");
      cachedProvider = createNullCalendarProvider();
      return cachedProvider;
  }
}

/**
 * Reset the cached provider (for testing purposes)
 */
export function resetCalendarProvider(): void {
  cachedProvider = null;
}
