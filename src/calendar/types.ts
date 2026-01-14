export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  calendar?: string; // Which calendar it's from (calendar ID)
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
