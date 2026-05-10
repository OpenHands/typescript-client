/**
 * WebSocket client for real-time event streaming
 */

import { Event, ConversationCallbackType } from '../types/base';

// Use whatever WebSocket the runtime exposes on `globalThis`. This covers
// browsers, Web Workers, and Node.js >= 22 (where WHATWG WebSocket is on by
// default; Node 21 exposes it under `--experimental-websocket`).
//
// We intentionally do NOT fall back to `require('ws')` here. This package is
// published as ESM (`"type": "module"`), so `require` is undefined at runtime
// and the previous fallback always threw at module-load time — breaking
// *every* Node.js ESM consumer of the library regardless of whether they ever
// open a WebSocket. Callers on older Node.js without a global `WebSocket`
// should install `ws` and assign it to `globalThis.WebSocket` before
// importing this module.
const WebSocketImpl: typeof WebSocket | undefined = (globalThis as { WebSocket?: typeof WebSocket })
  .WebSocket;

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

export class WebSocketCallbackClient {
  private host: string;
  private conversationId: string;
  private callback: ConversationCallbackType;
  private apiKey?: string;
  private onError?: ErrorCallbackType;
  private ws?: any; // WebSocket instance (browser or Node.js)
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private currentDelay = 1000;
  private shouldReconnect = true;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(options: WebSocketClientOptions) {
    this.host = options.host;
    this.conversationId = options.conversationId;
    this.callback = options.callback;
    this.apiKey = options.apiKey;
    this.onError = options.onError;
  }

  start(): void {
    if (this.ws) {
      return;
    }

    this.shouldReconnect = true;
    this.connect();
  }

  stop(): void {
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

  private connect(): void {
    try {
      if (!WebSocketImpl) {
        throw new Error(
          'No WebSocket implementation found on globalThis. Provide one by polyfilling ' +
            '`globalThis.WebSocket` (e.g. with the `ws` package) before opening a connection.'
        );
      }

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

      this.ws.onmessage = (event: { data: any }) => {
        try {
          const message = typeof event.data === 'string' ? event.data : event.data.toString();
          const eventData: Event = JSON.parse(message);
          this.callback(eventData);
        } catch (error) {
          this.reportError(
            new Error(
              `Error processing WebSocket message: ${error instanceof Error ? error.message : String(error)}`
            )
          );
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
    } catch (error) {
      this.reportError(
        new Error(
          `Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Report a non-fatal error via the onError callback if provided.
   */
  private reportError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    }
  }

  private scheduleReconnect(): void {
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
