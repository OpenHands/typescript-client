import { HttpClient } from './http-client';
import type { ACPAuthStatusResponse } from '../models/api';

export interface AcpClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Client for the agent server's ACP (Agent Client Protocol) routes under
 * `/api/acp`.
 */
export class AcpClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: AcpClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  /**
   * Probe whether a provider's ACP CLI is already authenticated on the agent
   * server — by a subscription login (Claude Pro/Max, ChatGPT, Google) or a
   * pre-set API key.
   *
   * Drives the ACP `initialize` + `session/new` handshake server-side and sends
   * no prompt, so it spends no model tokens. The endpoint always responds 200:
   * a probe that cannot run is reported as `status: "unknown"` rather than an
   * HTTP error, so callers fall back to the API-key fields instead of falsely
   * claiming "not logged in". A genuinely unknown `server` is the one error
   * case (HTTP 422).
   *
   * @param server Registry key of the provider to probe (e.g. `"claude-code"`,
   *   `"codex"`, `"gemini-cli"`).
   */
  async getAuthStatus(server: string): Promise<ACPAuthStatusResponse> {
    const response = await this.client.get<ACPAuthStatusResponse>('/api/acp/auth-status', {
      params: { server },
    });
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
