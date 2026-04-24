/**
 * WebSocket client for real-time event streaming
 */
import { ConversationCallbackType } from '../types/base';
/**
 * Error callback type for reporting non-fatal errors.
 * Library code calls this instead of console.error so callers can handle errors.
 */
export type ErrorCallbackType = (error: Error) => void;
export interface WebSocketClientOptions {
    host: string;
    conversationId: string;
    callback: ConversationCallbackType;
    apiKey?: string;
    /** Optional error callback. Called for non-fatal errors (parse failures, connection issues). */
    onError?: ErrorCallbackType;
}
export declare class WebSocketCallbackClient {
    private host;
    private conversationId;
    private callback;
    private apiKey?;
    private onError?;
    private ws?;
    private reconnectDelay;
    private maxReconnectDelay;
    private currentDelay;
    private shouldReconnect;
    private reconnectTimer?;
    constructor(options: WebSocketClientOptions);
    start(): void;
    stop(): void;
    private connect;
    /**
     * Report a non-fatal error via the onError callback if provided.
     */
    private reportError;
    private scheduleReconnect;
}
//# sourceMappingURL=websocket-client.d.ts.map