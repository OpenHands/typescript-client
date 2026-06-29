import { HttpClient } from './http-client';
import type { InitRequest, InitStatus } from '../models/api';

/**
 * Base client options; `apiKey`, when provided, is sent as `X-Session-API-Key`
 * by the shared {@link HttpClient} on every request.
 */
export interface InitClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

/** Options for `POST /api/init`; `initApiKey` becomes `X-Init-API-Key`. */
export interface InitializeOptions {
  /**
   * Bootstrap credential sent as the `X-Init-API-Key` header. This is distinct
   * from the per-session `X-Session-API-Key`: the orchestrator already holds the
   * dormant server's `secret_key` (needed for encryption) and uses it to
   * authorize the one-time init call. When the dormant server has no
   * `secret_key`, the endpoint is open and this can be omitted.
   */
  initApiKey?: string;
}

/**
 * Client for the deferred-init endpoints of a warm-pool agent-server.
 *
 * When the server is started with `deferred_init=True` it boots in a *dormant*
 * state: stateless services come up but every `/api/*` route returns 503 until
 * `POST /api/init` delivers the per-user runtime configuration. These endpoints
 * are mounted unconditionally, but a non-deferred server answers them with 404
 * (no `InitService` registered).
 *
 * See: https://github.com/OpenHands/software-agent-sdk/issues/2523
 */
export class InitClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: InitClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  /**
   * Report the current deferred-init state via `GET /api/init`.
   *
   * Authentication is intentionally not required so a warm-pool controller can
   * poll without holding the init key. If this client was constructed with
   * `apiKey`, `HttpClient` still sends it as `X-Session-API-Key`; omit `apiKey`
   * for dormant warm-pool polling that must not send a session header. Returns
   * 404 when the server is not running in deferred-init mode.
   */
  async getStatus(): Promise<InitStatus> {
    const response = await this.client.get<InitStatus>('/api/init');
    return response.data;
  }

  /**
   * Initialize a dormant server with runtime configuration via `POST /api/init`.
   *
   * Returns the resulting {@link InitStatus} (`ready` on success). The server
   * returns 400 if it has already been initialized, 401 if the init key is
   * wrong, 404 if not running in deferred-init mode, and 500 (with the state
   * rolled back to `dormant` for retry) if initialization fails.
   */
  async initialize(
    request: InitRequest = {},
    options: InitializeOptions = {}
  ): Promise<InitStatus> {
    const response = await this.client.post<InitStatus>('/api/init', request, {
      headers: options.initApiKey ? { 'X-Init-API-Key': options.initApiKey } : undefined,
    });
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
