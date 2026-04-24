/**
 * WebSocket client for real-time event streaming
 */
// Use native WebSocket in browser, ws library in Node.js
let WebSocketImpl;
if (typeof window !== 'undefined' && window.WebSocket) {
    // Browser environment
    WebSocketImpl = window.WebSocket;
}
else {
    // Node.js environment
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ws = require('ws');
        WebSocketImpl = ws;
    }
    catch {
        throw new Error('WebSocket implementation not available. Install ws package for Node.js environments.');
    }
}
export class WebSocketCallbackClient {
    constructor(options) {
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.currentDelay = 1000;
        this.shouldReconnect = true;
        this.host = options.host;
        this.conversationId = options.conversationId;
        this.callback = options.callback;
        this.apiKey = options.apiKey;
        this.onError = options.onError;
    }
    start() {
        if (this.ws) {
            return;
        }
        this.shouldReconnect = true;
        this.connect();
    }
    stop() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
    connect() {
        try {
            // Convert HTTP URL to WebSocket URL
            const url = new URL(this.host);
            const wsScheme = url.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsScheme}//${url.host}${url.pathname.replace(/\/$/, '')}/sockets/events/${this.conversationId}`;
            // Add API key as query parameter if provided
            const finalUrl = this.apiKey ? `${wsUrl}?session_api_key=${this.apiKey}` : wsUrl;
            this.ws = new WebSocketImpl(finalUrl);
            this.ws.onopen = () => {
                this.currentDelay = this.reconnectDelay;
            };
            this.ws.onmessage = (event) => {
                try {
                    const message = typeof event.data === 'string' ? event.data : event.data.toString();
                    const eventData = JSON.parse(message);
                    this.callback(eventData);
                }
                catch (error) {
                    this.reportError(new Error(`Error processing WebSocket message: ${error instanceof Error ? error.message : String(error)}`));
                }
            };
            this.ws.onclose = () => {
                this.ws = undefined;
                if (this.shouldReconnect) {
                    this.scheduleReconnect();
                }
            };
            this.ws.onerror = () => {
                if (this.shouldReconnect) {
                    this.scheduleReconnect();
                }
            };
        }
        catch (error) {
            this.reportError(new Error(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`));
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        }
    }
    /**
     * Report a non-fatal error via the onError callback if provided.
     */
    reportError(error) {
        if (this.onError) {
            this.onError(error);
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (this.shouldReconnect) {
                this.connect();
                // Exponential backoff with jitter
                this.currentDelay = Math.min(this.currentDelay * 2, this.maxReconnectDelay);
            }
        }, this.currentDelay);
    }
}
//# sourceMappingURL=websocket-client.js.map