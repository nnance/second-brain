# Ticket 4.1: Create CalendarProvider Interface

## Description

Define the CalendarProvider interface that abstracts calendar access and create the configuration for Google Calendar integration. This provides the foundation for ticket 4.2 (Google Calendar implementation).

## Acceptance Criteria

- [ ] New directory `src/calendar/` created
- [ ] New file `src/calendar/types.ts` with interface definitions
- [ ] New file `src/calendar/provider.ts` with factory function
- [ ] New file `src/calendar/null-provider.ts` for fallback
- [ ] CalendarEvent type defined
- [ ] CalendarProvider interface defined
- [ ] Configuration added to `src/config.ts` for Google Calendar
- [ ] Null provider works when no calendar configured

## Technical Notes

**Type Definitions (`src/calendar/types.ts`):**
```typescript
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  calendar?: string;  // Which calendar it's from (calendar ID)
}

export interface CalendarProvider {
  /**
   * List events in a time range
   */
  listEvents(from: Date, to: Date): Promise<CalendarEvent[]>;

  /**
   * Find an event by title (fuzzy match)
   */
  findEventByTitle(title: string, around?: Date): Promise<CalendarEvent | null>;

  /**
   * Get provider name
   */
  readonly name: string;
}
```

**Provider Factory (`src/calendar/provider.ts`):**
```typescript
import { CalendarProvider } from './types.js';
import { createNullCalendarProvider } from './null-provider.js';
import { config } from '../config.js';

export async function createCalendarProvider(): Promise<CalendarProvider> {
  const providerType = config.calendarProvider;

  switch (providerType) {
    case 'google':
      // Lazy import to avoid loading googleapis when not needed
      const { createGoogleCalendarProvider } = await import('./google-provider.js');
      return createGoogleCalendarProvider();
    case 'none':
    default:
      return createNullCalendarProvider();
  }
}
```

**Null Provider (`src/calendar/null-provider.ts`):**
```typescript
import { CalendarProvider, CalendarEvent } from './types.js';
import logger from '../logger.js';

export function createNullCalendarProvider(): CalendarProvider {
  return {
    name: 'none',

    async listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
      logger.debug('Calendar not configured, returning empty events');
      return [];
    },

    async findEventByTitle(title: string, around?: Date): Promise<CalendarEvent | null> {
      logger.debug('Calendar not configured, cannot find event');
      return null;
    },
  };
}
```

**Configuration (`src/config.ts`):**
```typescript
// Add to existing config interface and loading

export interface Config {
  // ... existing fields ...

  // Calendar settings
  calendarProvider: 'google' | 'none';
  googleCalendarCredentialsPath: string;
  googleCalendarIds: string[];
}

// In config loading:
calendarProvider: (process.env.CALENDAR_PROVIDER as 'google' | 'none') || 'none',
googleCalendarCredentialsPath: process.env.GOOGLE_CALENDAR_CREDENTIALS ||
  join(process.env.HOME || '', '.second-brain', 'google-calendar.json'),
googleCalendarIds: process.env.GOOGLE_CALENDAR_IDS?.split(',').map(s => s.trim()) || ['primary'],
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `CALENDAR_PROVIDER` | `none` | Calendar provider: `google` or `none` |
| `GOOGLE_CALENDAR_CREDENTIALS` | `~/.second-brain/google-calendar.json` | Path to OAuth credentials |
| `GOOGLE_CALENDAR_IDS` | `primary` | Comma-separated calendar IDs |

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes (interface tests, null provider tests)
3. `npm run lint` shows no errors
4. Provider factory returns null provider when CALENDAR_PROVIDER not set or set to "none"
5. Config correctly parses GOOGLE_CALENDAR_IDS as array
