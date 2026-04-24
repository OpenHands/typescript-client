/**
 * WebSocket client for bash event streaming.
 */
import { BashEvent } from '../models/workspace';
import { ErrorCallbackType } from './websocket-client';
export interface BashWebSocketClientOptions {
    host: string;
    callback: (event: BashEvent) => void;
    apiKey?: string;
    resendMode?: 'all';
    onError?: ErrorCallbackType;
}
export declare class BashWebSocketClient {
    private host;
    private callback;
    private apiKey?;
    private resendMode?;
    private onError?;
    private ws?;
    private reconnectDelay;
    private maxReconnectDelay;
    private currentDelay;
    private shouldReconnect;
    private reconnectTimer?;
    constructor(options: BashWebSocketClientOptions);
    start(): void;
    stop(): void;
    private connect;
    private reportError;
    private scheduleReconnect;
}
//# sourceMappingURL=bash-websocket-client.d.ts.map