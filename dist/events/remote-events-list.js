/**
 * Remote events list — thin wrapper around the events search API.
 *
 * Events received via WebSocket are kept in a local cache so callers can
 * iterate them without extra network calls. For historical events use
 * `search()` or `getEvents()` which hit the server on demand.
 */
import { HttpError } from '../client/http-client';
export class RemoteEventsList {
    constructor(client, conversationId) {
        this.cachedEvents = [];
        this.cachedEventIds = new Set();
        this.client = client;
        this.conversationId = conversationId;
    }
    /**
     * Search events with optional filters.
     * Queries the server directly.
     */
    async search(options = {}) {
        const params = {
            limit: options.limit ?? 100,
        };
        if (options.page_id)
            params.page_id = options.page_id;
        if (options.kind)
            params.kind = options.kind;
        if (options.source)
            params.source = options.source;
        if (options.body)
            params.body = options.body;
        if (options.sort_order)
            params.sort_order = options.sort_order;
        if (options.timestamp__gte)
            params.timestamp__gte = options.timestamp__gte;
        if (options.timestamp__lt)
            params.timestamp__lt = options.timestamp__lt;
        const response = await this.client.get(`/api/conversations/${this.conversationId}/events/search`, { params });
        return response.data;
    }
    /**
     * Count events matching the given filters.
     */
    async count(options = {}) {
        const params = {};
        if (options.kind)
            params.kind = options.kind;
        if (options.source)
            params.source = options.source;
        if (options.body)
            params.body = options.body;
        if (options.timestamp__gte)
            params.timestamp__gte = options.timestamp__gte;
        if (options.timestamp__lt)
            params.timestamp__lt = options.timestamp__lt;
        const response = await this.client.get(`/api/conversations/${this.conversationId}/events/count`, { params });
        return response.data;
    }
    /**
     * Get a server event by ID.
     */
    async getEventById(eventId) {
        const response = await this.client.get(`/api/conversations/${this.conversationId}/events/${eventId}`);
        return response.data;
    }
    /**
     * Batch get server events by ID.
     */
    async getEventsById(eventIds) {
        return Promise.all(eventIds.map(async (eventId) => {
            try {
                return await this.getEventById(eventId);
            }
            catch (error) {
                if (error instanceof HttpError && error.status === 404) {
                    return null;
                }
                throw error;
            }
        }));
    }
    async addEvent(event) {
        if (!this.cachedEventIds.has(event.id)) {
            this.cachedEvents.push(event);
            this.cachedEventIds.add(event.id);
        }
    }
    // Alias for compatibility with EventLog interface
    async append(event) {
        await this.addEvent(event);
    }
    createDefaultCallback(onError) {
        return (event) => {
            this.addEvent(event).catch((error) => {
                if (onError) {
                    onError(error instanceof Error ? error : new Error(`Error adding event to cache: ${error}`));
                }
            });
        };
    }
    async length() {
        return this.cachedEvents.length;
    }
    async getEvent(index) {
        return this.cachedEvents[index];
    }
    /**
     * Fetch all events from the server, merged with any locally cached
     * events received via WebSocket.
     */
    async getEvents(start, end) {
        const remote = [];
        let pageId;
        for (;;) {
            const params = { limit: 100 };
            if (pageId)
                params.page_id = pageId;
            const response = await this.client.get(`/api/conversations/${this.conversationId}/events/search`, { params });
            const data = response.data;
            remote.push(...data.items);
            if (!data.next_page_id)
                break;
            pageId = data.next_page_id;
        }
        const remoteIds = new Set(remote.map((event) => event.id));
        const merged = [...remote, ...this.cachedEvents.filter((event) => !remoteIds.has(event.id))];
        if (start === undefined && end === undefined) {
            return merged;
        }
        return merged.slice(start, end);
    }
    async *[Symbol.asyncIterator]() {
        const events = await this.getEvents();
        for (const event of events) {
            yield event;
        }
    }
}
//# sourceMappingURL=remote-events-list.js.map