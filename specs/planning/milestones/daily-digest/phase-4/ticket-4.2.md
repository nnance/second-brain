# Ticket 4.2: Implement Google Calendar Provider

## Description

Implement the Google Calendar provider using the googleapis npm package. This enables the agent to query events from multiple Google Calendars via OAuth 2.0 authentication.

## Acceptance Criteria

- [ ] New file `src/calendar/google-provider.ts` created
- [ ] Provider can list events for a date range across multiple calendars
- [ ] Provider can find events by title (fuzzy search)
- [ ] Provider handles OAuth token refresh automatically
- [ ] Provider handles errors gracefully (no credentials, API errors, rate limits)
- [ ] Unit tests with mocked API responses
- [ ] Setup documentation for Google Cloud Console configuration

## Technical Notes

### Dependencies

```bash
npm install googleapis
```

### File Structure

```
src/calendar/
├── types.ts           # CalendarProvider interface (from ticket 4.1)
├── provider.ts        # Factory function (from ticket 4.1)
├── google-provider.ts # This ticket
└── null-provider.ts   # Fallback (from ticket 4.1)
```

### Implementation

**`src/calendar/google-provider.ts`:**

```typescript
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { readFile } from 'node:fs/promises';
import { CalendarProvider, CalendarEvent } from './types.js';
import { config } from '../config.js';
import logger from '../logger.js';

export async function createGoogleCalendarProvider(): Promise<CalendarProvider> {
  const credentials = await loadCredentials();
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  );

  oauth2Client.setCredentials({
    refresh_token: credentials.refresh_token,
  });

  const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

  return {
    name: 'google',

    async listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
      const calendarIds = config.googleCalendarIds; // ['primary', 'work@group.calendar.google.com', ...]
      const allEvents: CalendarEvent[] = [];

      for (const calendarId of calendarIds) {
        try {
          const response = await calendarApi.events.list({
            calendarId,
            timeMin: from.toISOString(),
            timeMax: to.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
          });

          const events = (response.data.items || []).map(item =>
            mapGoogleEvent(item, calendarId)
          );
          allEvents.push(...events);
        } catch (error) {
          logger.warn({ calendarId, error }, 'Failed to fetch calendar events');
        }
      }

      // Sort by start time across all calendars
      return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    },

    async findEventByTitle(title: string, around?: Date): Promise<CalendarEvent | null> {
      const searchDate = around || new Date();
      const from = new Date(searchDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before
      const to = new Date(searchDate.getTime() + 30 * 24 * 60 * 60 * 1000);  // 30 days after

      const events = await this.listEvents(from, to);
      const titleLower = title.toLowerCase();

      // Fuzzy match: event title contains search term
      return events.find(e =>
        e.title.toLowerCase().includes(titleLower)
      ) || null;
    },
  };
}

function mapGoogleEvent(item: calendar_v3.Schema$Event, calendarId: string): CalendarEvent {
  return {
    id: item.id || '',
    title: item.summary || '(No title)',
    start: new Date(item.start?.dateTime || item.start?.date || ''),
    end: new Date(item.end?.dateTime || item.end?.date || ''),
    location: item.location || undefined,
    attendees: item.attendees?.map(a => a.email || a.displayName || '').filter(Boolean),
    calendar: calendarId,
  };
}

interface GoogleCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  refresh_token: string;
}

async function loadCredentials(): Promise<GoogleCredentials> {
  const credentialsPath = config.googleCalendarCredentialsPath;
  const content = await readFile(credentialsPath, 'utf-8');
  return JSON.parse(content);
}
```

### Configuration

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CALENDAR_CREDENTIALS` | Yes (if using google) | Path to credentials JSON file |
| `GOOGLE_CALENDAR_IDS` | No | Comma-separated calendar IDs (default: `primary`) |

**Credentials File Format (`~/.second-brain/google-calendar.json`):**

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

### Setup Documentation

Create `docs/google-calendar-setup.md` with:

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create new project or select existing
   - Enable Google Calendar API

2. **Create OAuth Credentials**
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Desktop app)
   - Download client configuration

3. **Get Refresh Token**
   - Create a one-time auth script or use OAuth Playground
   - Authorize with your Google account
   - Request offline access to get refresh token
   - Save to credentials file

4. **Configure Second Brain**
   ```bash
   export CALENDAR_PROVIDER=google
   export GOOGLE_CALENDAR_CREDENTIALS=~/.second-brain/google-calendar.json
   export GOOGLE_CALENDAR_IDS=primary,work@group.calendar.google.com,personal@group.calendar.google.com
   ```

5. **Test**
   ```bash
   npm run dev
   # Ask agent: "What's on my calendar today?"
   ```

### Error Handling

- **Invalid credentials**: Log error, return empty results, don't crash
- **Token expired**: googleapis handles refresh automatically
- **Rate limits**: Log warning, return partial results
- **Network errors**: Log error, return empty results

### Testing

**Unit tests (`src/calendar/google-provider.test.ts`):**

```typescript
// Mock googleapis
jest.mock('googleapis');

describe('GoogleCalendarProvider', () => {
  it('lists events from multiple calendars', async () => {
    // Mock calendar.events.list to return test events
    // Verify events are merged and sorted
  });

  it('finds event by partial title match', async () => {
    // Mock events list
    // Search for "Sarah"
    // Verify finds "Meeting with Sarah"
  });

  it('handles API errors gracefully', async () => {
    // Mock API to throw error
    // Verify returns empty array, doesn't crash
  });
});
```

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including Google provider tests
3. `npm run lint` shows no errors
4. Manual test: Configure with real credentials, query calendar events
5. Documentation in `docs/google-calendar-setup.md` is complete and accurate
