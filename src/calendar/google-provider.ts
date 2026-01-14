import { readFile } from "node:fs/promises";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { config } from "../config.js";
import logger from "../logger.js";
import type { CalendarEvent, CalendarProvider } from "./types.js";

interface GoogleCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  refresh_token: string;
}

async function loadCredentials(): Promise<GoogleCredentials> {
  const credentialsPath = config.googleCalendarCredentialsPath;
  try {
    const content = await readFile(credentialsPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.error(
      { error, credentialsPath },
      "Failed to load Google Calendar credentials",
    );
    throw new Error(
      `Failed to load Google Calendar credentials: ${credentialsPath}`,
    );
  }
}

function mapGoogleEvent(
  item: calendar_v3.Schema$Event,
  calendarId: string,
): CalendarEvent {
  return {
    id: item.id || "",
    title: item.summary || "(No title)",
    start: new Date(item.start?.dateTime || item.start?.date || ""),
    end: new Date(item.end?.dateTime || item.end?.date || ""),
    location: item.location || undefined,
    attendees: item.attendees
      ?.map((a) => a.email || a.displayName || "")
      .filter(Boolean),
    calendar: calendarId,
  };
}

export async function createGoogleCalendarProvider(): Promise<CalendarProvider> {
  const credentials = await loadCredentials();
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri,
  );

  oauth2Client.setCredentials({
    refresh_token: credentials.refresh_token,
  });

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

  async function listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const calendarIds = config.googleCalendarIds;
    const allEvents: CalendarEvent[] = [];

    for (const calendarId of calendarIds) {
      try {
        const response = await calendarApi.events.list({
          calendarId,
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 50,
        });

        const events = (response.data.items || []).map((item) =>
          mapGoogleEvent(item, calendarId),
        );
        allEvents.push(...events);
      } catch (error) {
        logger.warn({ calendarId, error }, "Failed to fetch calendar events");
      }
    }

    // Sort by start time across all calendars
    return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  async function findEventByTitle(
    title: string,
    around?: Date,
  ): Promise<CalendarEvent | null> {
    const searchDate = around || new Date();
    const from = new Date(searchDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before
    const to = new Date(searchDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after

    const events = await listEvents(from, to);
    const titleLower = title.toLowerCase();

    // Fuzzy match: event title contains search term
    return (
      events.find((event) => event.title.toLowerCase().includes(titleLower)) ||
      null
    );
  }

  return {
    name: "google",
    listEvents,
    findEventByTitle,
  };
}
