/**
 * Remote events list — thin wrapper around the events search API.
 *
 * Events received via WebSocket are kept in a local cache so callers can
 * iterate them without extra network calls. For historical events use
 * `search()` or `getEvents()` which hit the server on demand.
 */
import { HttpClient } from '../client/http-client';
import { Event, ConversationCallbackType } from '../types/base';
import { EventPage } from '../types/base';
/**
 * Options for searching events
 */
export interface EventSearchOptions {
    /** Maximum number of events to return per page */
    limit?: number;
    /** Page ID for pagination */
    page_id?: string;
    /** Filter by event kind/type (e.g., ActionEvent, MessageEvent) */
    kind?: string;
    /** Filter by event source (e.g., agent, user, environment) */
    source?: string;
    /** Filter by message content (case-insensitive) */
    body?: string;
    /** Sort order for events */
    sort_order?: 'TIMESTAMP' | 'TIMESTAMP_DESC';
    /** Filter: event timestamp >= this datetime (ISO 8601 format) */
    timestamp__gte?: string;
    /** Filter: event timestamp < this datetime (ISO 8601 format) */
    timestamp__lt?: string;
}
export declare class RemoteEventsList {
    private client;
    private conversationId;
    private cachedEvents;
    private cachedEventIds;
    constructor(client: HttpClient, conversationId: string);
    /**
     * Search events with optional filters.
     * Queries the server directly.
     */
    search(options?: EventSearchOptions): Promise<EventPage>;
    /**
     * Count events matching the given filters.
     */
    count(options?: Omit<EventSearchOptions, 'limit' | 'page_id' | 'sort_order'>): Promise<number>;
    /**
     * Get a server event by ID.
     */
    getEventById(eventId: string): Promise<Event>;
    /**
     * Batch get server events by ID.
     */
    getEventsById(eventIds: string[]): Promise<Array<Event | null>>;
    addEvent(event: Event): Promise<void>;
    append(event: Event): Promise<void>;
    createDefaultCallback(onError?: (error: Error) => void): ConversationCallbackType;
    length(): Promise<number>;
    getEvent(index: number): Promise<Event | undefined>;
    /**
     * Fetch all events from the server, merged with any locally cached
     * events received via WebSocket.
     */
    getEvents(start?: number, end?: number): Promise<Event[]>;
    [Symbol.asyncIterator](): AsyncIterableIterator<Event>;
}
//# sourceMappingURL=remote-events-list.d.ts.map